import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { Niu, NiuScenario } from '../Contract/Niu';
import { buildNiu } from '../Builder/NiuBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getNiu } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function genNiu(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, comp, tokenData } = await buildNiu(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed Niu (${comp.name}) to address ${comp._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifyNiu(world: World, comp: Niu, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, comp._address);
  }

  return world;
}

async function approve(world: World, from: string, comp: Niu, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comp.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved Niu token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, comp: Niu, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comp.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Niu tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, comp: Niu, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comp.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} Niu tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, comp: NiuScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comp.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Niu tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, comp: NiuScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comp.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Niu tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function delegate(world: World, from: string, comp: Niu, account: string): Promise<World> {
  let invokation = await invoke(world, comp.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBlockNumber(
  world: World,
  from: string,
  comp: Niu,
  blockNumber: NumberV
): Promise<World> {
  return addAction(
    world,
    `Set Niu blockNumber to ${blockNumber.show()}`,
    await invoke(world, comp.methods.setBlockNumber(blockNumber.encode()), from)
  );
}

export function compCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new Niu token
          * E.g. "Niu Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genNiu(world, from, params.val)
    ),

    new View<{ comp: Niu, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<Niu> Verify apiKey:<String> contractName:<String>=Niu" - Verifies Niu token in Etherscan
          * E.g. "Niu Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("Niu") })
      ],
      async (world, { comp, apiKey, contractName }) => {
        return await verifyNiu(world, comp, apiKey.val, comp.name, contractName.val)
      }
    ),

    new Command<{ comp: Niu, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "Niu Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "Niu Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { comp, spender, amount }) => {
        return approve(world, from, comp, spender.val, amount)
      }
    ),

    new Command<{ comp: Niu, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "Niu Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "Niu Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { comp, recipient, amount }) => transfer(world, from, comp, recipient.val, amount)
    ),

    new Command<{ comp: Niu, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "Niu TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "Niu TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { comp, owner, spender, amount }) => transferFrom(world, from, comp, owner.val, spender.val, amount)
    ),

    new Command<{ comp: NiuScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "Niu TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "Niu TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { comp, recipients, amount }) => transferScenario(world, from, comp, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ comp: NiuScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "Niu TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "Niu TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { comp, froms, amount }) => transferFromScenario(world, from, comp, froms.map(_from => _from.val), amount)
    ),

    new Command<{ comp: Niu, account: AddressV }>(`
        #### Delegate

        * "Niu Delegate account:<Address>" - Delegates votes to a given account
          * E.g. "Niu Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { comp, account }) => delegate(world, from, comp, account.val)
    ),
    new Command<{ comp: Niu, blockNumber: NumberV }>(`
      #### SetBlockNumber

      * "SetBlockNumber <Seconds>" - Sets the blockTimestamp of the Niu Harness
      * E.g. "Niu SetBlockNumber 500"
      `,
        'SetBlockNumber',
        [new Arg('comp', getNiu, { implicit: true }), new Arg('blockNumber', getNumberV)],
        (world, from, { comp, blockNumber }) => setBlockNumber(world, from, comp, blockNumber)
      )
  ];
}

export async function processNiuEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Niu", compCommands(), world, event, from);
}
