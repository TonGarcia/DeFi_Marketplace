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
  let { world: nextWorld, NTokenDelegate, delegateData } = await buildNTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added NToken ${delegateData.name} (${delegateData.contract}) at address ${NTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyNTokenDelegate(world: World, NTokenDelegate: CErc20Delegate, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, NTokenDelegate._address);
  }

  return world;
}

export function NTokenDelegateCommands() {
  return [
    new Command<{ NTokenDelegateParams: EventV }>(`
        #### Deploy

        * "NTokenDelegate Deploy ...NTokenDelegateParams" - Generates a new NTokenDelegate
          * E.g. "NTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      "Deploy",
      [new Arg("NTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { NTokenDelegateParams }) => genNTokenDelegate(world, from, NTokenDelegateParams.val)
    ),
    new View<{ NTokenDelegateArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "NTokenDelegate <NTokenDelegate> Verify apiKey:<String>" - Verifies NTokenDelegate in Etherscan
          * E.g. "NTokenDelegate cDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("NTokenDelegateArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { NTokenDelegateArg, apiKey }) => {
        let [NToken, name, data] = await getNTokenDelegateData(world, NTokenDelegateArg.val);

        return await verifyNTokenDelegate(world, NToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
  ];
}

export async function processNTokenDelegateEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("NTokenDelegate", NTokenDelegateCommands(), world, event, from);
}
