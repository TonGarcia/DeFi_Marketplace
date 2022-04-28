import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { NiutrollerImpl } from '../Contract/NiutrollerImpl';
import { Unitroller } from '../Contract/Unitroller';
import { invoke } from '../Invokation';
import { getAddressV, getArrayV, getEventV, getExpNumberV, getNumberV, getStringV, getCoreValue } from '../CoreValue';
import { ArrayV, AddressV, EventV, NumberV, StringV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { buildNiutrollerImpl } from '../Builder/NiutrollerImplBuilder';
import { NiutrollerErrorReporter } from '../ErrorReporter';
import { getNiutrollerImpl, getNiutrollerImplData, getUnitroller } from '../ContractLookup';
import { verify } from '../Verify';
import { mergeContractABI } from '../Networks';
import { encodedNumber } from '../Encoding';
import { encodeABI } from '../Utils';

async function genNiutrollerImpl(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, comptrollerImpl, comptrollerImplData } = await buildNiutrollerImpl(
    world,
    from,
    params
  );
  world = nextWorld;

  world = addAction(
    world,
    `Added Niutroller Implementation (${comptrollerImplData.description}) at address ${comptrollerImpl._address}`,
    comptrollerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  return world;
}

async function becomeG1(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller,
  priceOracleAddr: string,
  closeFactor: encodedNumber,
  maxAssets: encodedNumber
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address, priceOracleAddr, closeFactor, maxAssets, false),
    from,
    NiutrollerErrorReporter
  );
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s Niutroller Impl with priceOracle=${priceOracleAddr},closeFactor=${closeFactor},maxAssets=${maxAssets}`,
    invokation
  );

  return world;
}

// Recome calls `become` on the G1 Niutroller, but passes a flag to not modify any of the initialization variables.
async function recome(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(
      unitroller._address,
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      true
    ),
    from,
    NiutrollerErrorReporter
  );

  world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);

  world = addAction(world, `Recome ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function becomeG2(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function becomeG3(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller,
  niuRate: encodedNumber,
  compMarkets: string[],
  otherMarkets: string[]
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address, niuRate, compMarkets, otherMarkets),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function becomeG4(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function becomeG5(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function becomeG6(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function become(
  world: World,
  from: string,
  comptrollerImpl: NiutrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    comptrollerImpl.methods._become(unitroller._address),
    from,
    NiutrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Niutroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Niutroller Impl`, invokation);

  return world;
}

async function verifyNiutrollerImpl(
  world: World,
  comptrollerImpl: NiutrollerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, comptrollerImpl._address);
  }

  return world;
}

export function comptrollerImplCommands() {
  return [
    new Command<{ comptrollerImplParams: EventV }>(
      `
        #### Deploy

        * "NiutrollerImpl Deploy ...comptrollerImplParams" - Generates a new Niutroller Implementation
          * E.g. "NiutrollerImpl Deploy MyScen Scenario"
      `,
      'Deploy',
      [new Arg('comptrollerImplParams', getEventV, { variadic: true })],
      (world, from, { comptrollerImplParams }) => genNiutrollerImpl(world, from, comptrollerImplParams.val)
    ),
    new View<{ comptrollerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "NiutrollerImpl <Impl> Verify apiKey:<String>" - Verifies Niutroller Implemetation in Etherscan
          * E.g. "NiutrollerImpl Verify "myApiKey"
      `,
      'Verify',
      [new Arg('comptrollerImplArg', getStringV), new Arg('apiKey', getStringV)],
      async (world, { comptrollerImplArg, apiKey }) => {
        let [comptrollerImpl, name, data] = await getNiutrollerImplData(world, comptrollerImplArg.val);

        return await verifyNiutrollerImpl(world, comptrollerImpl, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
      priceOracle: AddressV;
      closeFactor: NumberV;
      maxAssets: NumberV;
    }>(
      `
        #### BecomeG1

        * "NiutrollerImpl <Impl> BecomeG1 priceOracle:<Number> closeFactor:<Exp> maxAssets:<Number>" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG1
      `,
      'BecomeG1',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl),
        new Arg('priceOracle', getAddressV),
        new Arg('closeFactor', getExpNumberV),
        new Arg('maxAssets', getNumberV)
      ],
      (world, from, { unitroller, comptrollerImpl, priceOracle, closeFactor, maxAssets }) =>
        becomeG1(
          world,
          from,
          comptrollerImpl,
          unitroller,
          priceOracle.val,
          closeFactor.encode(),
          maxAssets.encode()
        ),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### BecomeG2

        * "NiutrollerImpl <Impl> BecomeG2" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG2
      `,
      'BecomeG2',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => becomeG2(world, from, comptrollerImpl, unitroller),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
      niuRate: NumberV;
      compMarkets: ArrayV<AddressV>;
      otherMarkets: ArrayV<AddressV>;
    }>(
      `
        #### BecomeG3

        * "NiutrollerImpl <Impl> BecomeG3 <Rate> <NiuMarkets> <OtherMarkets>" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG3 0.1e18 [cDAI, cETH, cUSDC]
      `,
      'BecomeG3',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl),
        new Arg('niuRate', getNumberV, { default: new NumberV(1e18) }),
        new Arg('compMarkets', getArrayV(getAddressV),  {default: new ArrayV([]) }),
        new Arg('otherMarkets', getArrayV(getAddressV), { default: new ArrayV([]) })
      ],
      (world, from, { unitroller, comptrollerImpl, niuRate, compMarkets, otherMarkets }) => {
        return becomeG3(world, from, comptrollerImpl, unitroller, niuRate.encode(), compMarkets.val.map(a => a.val), otherMarkets.val.map(a => a.val))
      },
      { namePos: 1 }
    ),
  
    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### BecomeG4
        * "NiutrollerImpl <Impl> BecomeG4" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG4
      `,
      'BecomeG4',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => {
        return becomeG4(world, from, comptrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### BecomeG5
        * "NiutrollerImpl <Impl> BecomeG5" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG5
      `,
      'BecomeG5',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => {
        return becomeG5(world, from, comptrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### BecomeG6
        * "NiutrollerImpl <Impl> BecomeG6" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl BecomeG6
      `,
      'BecomeG6',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => {
        return becomeG6(world, from, comptrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### Become

        * "NiutrollerImpl <Impl> Become <Rate> <NiuMarkets> <OtherMarkets>" - Become the comptroller, if possible.
          * E.g. "NiutrollerImpl MyImpl Become 0.1e18 [cDAI, cETH, cUSDC]
      `,
      'Become',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => {
        return become(world, from, comptrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      comptrollerImpl: NiutrollerImpl;
    }>(
      `
        #### MergeABI

        * "NiutrollerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "NiutrollerImpl MyImpl MergeABI
      `,
      'MergeABI',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => mergeABI(world, from, comptrollerImpl, unitroller),
      { namePos: 1 }
    ),
    new Command<{ unitroller: Unitroller; comptrollerImpl: NiutrollerImpl }>(
      `
        #### Recome

        * "NiutrollerImpl <Impl> Recome" - Recome the comptroller
          * E.g. "NiutrollerImpl MyImpl Recome
      `,
      'Recome',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('comptrollerImpl', getNiutrollerImpl)
      ],
      (world, from, { unitroller, comptrollerImpl }) => recome(world, from, comptrollerImpl, unitroller),
      { namePos: 1 }
    )
  ];
}

export async function processNiutrollerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('NiutrollerImpl', comptrollerImplCommands(), world, event, from);
}
