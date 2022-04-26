import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { NToken, NTokenScenario } from '../Contract/NToken';
import { CErc20Delegate } from '../Contract/CErc20Delegate'
import { invoke, Sendable } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NothingV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { getNTokenDelegateData } from '../ContractLookup';
import { buildNTokenDelegate } from '../Builder/NTokenDelegateBuilder';
import { verify } from '../Verify';

async function genNTokenDelegate(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, nTokenDelegate, delegateData } = await buildNTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added nToken ${delegateData.name} (${delegateData.contract}) at address ${nTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyNTokenDelegate(world: World, nTokenDelegate: CErc20Delegate, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, nTokenDelegate._address);
  }

  return world;
}

export function nTokenDelegateCommands() {
  return [
    new Command<{ nTokenDelegateParams: EventV }>(`
        #### Deploy

        * "NTokenDelegate Deploy ...nTokenDelegateParams" - Generates a new NTokenDelegate
          * E.g. "NTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      "Deploy",
      [new Arg("nTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { nTokenDelegateParams }) => genNTokenDelegate(world, from, nTokenDelegateParams.val)
    ),
    new View<{ nTokenDelegateArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "NTokenDelegate <nTokenDelegate> Verify apiKey:<String>" - Verifies NTokenDelegate in Etherscan
          * E.g. "NTokenDelegate cDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("nTokenDelegateArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { nTokenDelegateArg, apiKey }) => {
        let [nToken, name, data] = await getNTokenDelegateData(world, nTokenDelegateArg.val);

        return await verifyNTokenDelegate(world, nToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
  ];
}

export async function processNTokenDelegateEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("NTokenDelegate", nTokenDelegateCommands(), world, event, from);
}
