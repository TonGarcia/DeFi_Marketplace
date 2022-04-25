import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {Niutroller} from '../Contract/Niutroller';
import {NiutrollerImpl} from '../Contract/NiutrollerImpl';
import {CToken} from '../Contract/CToken';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildNiutrollerImpl} from '../Builder/NiutrollerImplBuilder';
import {NiutrollerErrorReporter} from '../ErrorReporter';
import {getNiutroller, getNiutrollerImpl} from '../ContractLookup';
import {getLiquidity} from '../Value/NiutrollerValue';
import {getCTokenV} from '../Value/CTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function genNiutroller(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, comptrollerImpl: comptroller, comptrollerImplData: comptrollerData} = await buildNiutrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Niutroller (${comptrollerData.description}) at address ${comptroller._address}`,
    comptrollerData.invokation
  );

  return world;
};

async function setPaused(world: World, from: string, comptroller: Niutroller, actionName: string, isPaused: boolean): Promise<World> {
  const pauseMap = {
    "Mint": comptroller.methods._setMintPaused
  };

  if (!pauseMap[actionName]) {
    throw `Cannot find pause function for action "${actionName}"`;
  }

  let invokation = await invoke(world, comptroller[actionName]([isPaused]), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: set paused for ${actionName} to ${isPaused}`,
    invokation
  );

  return world;
}

async function setMaxAssets(world: World, from: string, comptroller: Niutroller, numberOfAssets: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setMaxAssets(numberOfAssets.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Set max assets to ${numberOfAssets.show()}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(world: World, from: string, comptroller: Niutroller, liquidationIncentive: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setLiquidationIncentive(liquidationIncentive.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function supportMarket(world: World, from: string, comptroller: Niutroller, cToken: CToken): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(`Dry run: Supporting market  \`${cToken._address}\``);
    return world;
  }

  let invokation = await invoke(world, comptroller.methods._supportMarket(cToken._address), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Supported market ${cToken.name}`,
    invokation
  );

  return world;
}

async function unlistMarket(world: World, from: string, comptroller: Niutroller, cToken: CToken): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.unlist(cToken._address), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Unlisted market ${cToken.name}`,
    invokation
  );

  return world;
}

async function enterMarkets(world: World, from: string, comptroller: Niutroller, assets: string[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.enterMarkets(assets), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(world: World, from: string, comptroller: Niutroller, asset: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.exitMarket(asset), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setPriceOracle(world: World, from: string, comptroller: Niutroller, priceOracleAddr: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setPriceOracle(priceOracleAddr), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(world: World, from: string, comptroller: Niutroller, cToken: CToken, collateralFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setCollateralFactor(cToken._address, collateralFactor.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Set collateral factor for ${cToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(world: World, from: string, comptroller: Niutroller, closeFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setCloseFactor(closeFactor.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function fastForward(world: World, from: string, comptroller: Niutroller, blocks: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.fastForward(blocks.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, comptroller: Niutroller, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: comptroller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function addNiuMarkets(world: World, from: string, comptroller: Niutroller, cTokens: CToken[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._addNiuMarkets(cTokens.map(c => c._address)), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Added COMP markets ${cTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function dropNiuMarket(world: World, from: string, comptroller: Niutroller, cToken: CToken): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._dropNiuMarket(cToken._address), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Drop COMP market ${cToken.name}`,
    invokation
  );

  return world;
}

async function refreshNiuSpeeds(world: World, from: string, comptroller: Niutroller): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.refreshNiuSpeeds(), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Refreshed COMP speeds`,
    invokation
  );

  return world;
}

async function claimNiu(world: World, from: string, comptroller: Niutroller, holder: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.claimNiu(holder), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu claimed by ${holder}`,
    invokation
  );

  return world;
}

async function claimNiuInMarkets(world: World, from: string, comptroller: Niutroller, holder: string, cTokens: CToken[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.claimNiu(holder, cTokens.map(c => c._address)), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu claimed by ${holder} in markets ${cTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function updateContributorRewards(world: World, from: string, comptroller: Niutroller, contributor: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods.updateContributorRewards(contributor), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Contributor rewards updated for ${contributor}`,
    invokation
  );

  return world;
}

async function grantNiu(world: World, from: string, comptroller: Niutroller, recipient: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._grantNiu(recipient, amount.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `${amount.show()} comp granted to ${recipient}`,
    invokation
  );

  return world;
}

async function setNiuRate(world: World, from: string, comptroller: Niutroller, rate: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setNiuRate(rate.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu rate set to ${rate.show()}`,
    invokation
  );

  return world;
}

async function setNiuSpeed(world: World, from: string, comptroller: Niutroller, cToken: CToken, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setNiuSpeed(cToken._address, speed.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu speed for market ${cToken._address} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function setNiuSpeeds(world: World, from: string, comptroller: Niutroller, cTokens: CToken[], supplySpeeds: NumberV[], borrowSpeeds: NumberV[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setNiuSpeeds(cTokens.map(c => c._address), supplySpeeds.map(speed => speed.encode()), borrowSpeeds.map(speed => speed.encode())), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu speed for markets [${cTokens.map(c => c._address)}] set to supplySpeeds=[${supplySpeeds.map(speed => speed.show())}, borrowSpeeds=[${borrowSpeeds.map(speed => speed.show())}]`,
    invokation
  );

  return world;
}

async function setContributorNiuSpeed(world: World, from: string, comptroller: Niutroller, contributor: string, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setContributorNiuSpeed(contributor, speed.encode()), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niu speed for contributor ${contributor} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function printLiquidity(world: World, comptroller: Niutroller): Promise<World> {
  let enterEvents = await getPastEvents(world, comptroller, 'StdNiutroller', 'MarketEntered');
  let addresses = enterEvents.map((event) => event.returnValues['account']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Liquidity:")

  const liquidityMap = await Promise.all(uniq.map(async (address) => {
    let userLiquidity = await getLiquidity(world, comptroller, address);

    return [address, userLiquidity.val];
  }));

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(`\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`)
  });

  return world;
}

async function setPendingAdmin(world: World, from: string, comptroller: Niutroller, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setPendingAdmin(newPendingAdmin), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, comptroller: Niutroller): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._acceptAdmin(), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setPauseGuardian(world: World, from: string, comptroller: Niutroller, newPauseGuardian: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setPauseGuardian(newPauseGuardian), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} sets pause guardian to ${newPauseGuardian}`,
    invokation
  );

  return world;
}

async function setGuardianPaused(world: World, from: string, comptroller: Niutroller, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Transfer":
      fun = comptroller.methods._setTransferPaused
      break;
    case "Seize":
      fun = comptroller.methods._setSeizePaused
      break;
  }
  let invokation = await invoke(world, fun(state), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setGuardianMarketPaused(world: World, from: string, comptroller: Niutroller, cToken: CToken, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Mint":
      fun = comptroller.methods._setMintPaused
      break;
    case "Borrow":
      fun = comptroller.methods._setBorrowPaused
      break;
  }
  let invokation = await invoke(world, fun(cToken._address, state), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(world: World, from: string, comptroller: Niutroller, cTokens: CToken[], borrowCaps: NumberV[]): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setMarketBorrowCaps(cTokens.map(c => c._address), borrowCaps.map(c => c.encode())), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Borrow caps on ${cTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(world: World, from: string, comptroller: Niutroller, newBorrowCapGuardian: string): Promise<World> {
  let invokation = await invoke(world, comptroller.methods._setBorrowCapGuardian(newBorrowCapGuardian), from, NiutrollerErrorReporter);

  world = addAction(
    world,
    `Niutroller: ${describeUser(world, from)} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

export function comptrollerCommands() {
  return [
    new Command<{comptrollerParams: EventV}>(`
        #### Deploy

        * "Niutroller Deploy ...comptrollerParams" - Generates a new Niutroller (not as Impl)
          * E.g. "Niutroller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("comptrollerParams", getEventV, {variadic: true})],
      (world, from, {comptrollerParams}) => genNiutroller(world, from, comptrollerParams.val)
    ),
    new Command<{comptroller: Niutroller, action: StringV, isPaused: BoolV}>(`
        #### SetPaused

        * "Niutroller SetPaused <Action> <Bool>" - Pauses or unpaused given cToken function
          * E.g. "Niutroller SetPaused "Mint" True"
      `,
      "SetPaused",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV)
      ],
      (world, from, {comptroller, action, isPaused}) => setPaused(world, from, comptroller, action.val, isPaused.val)
    ),
    new Command<{comptroller: Niutroller, cToken: CToken}>(`
        #### SupportMarket

        * "Niutroller SupportMarket <CToken>" - Adds support in the Niutroller for the given cToken
          * E.g. "Niutroller SupportMarket cZRX"
      `,
      "SupportMarket",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {comptroller, cToken}) => supportMarket(world, from, comptroller, cToken)
    ),
    new Command<{comptroller: Niutroller, cToken: CToken}>(`
        #### UnList

        * "Niutroller UnList <CToken>" - Mock unlists a given market in tests
          * E.g. "Niutroller UnList cZRX"
      `,
      "UnList",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {comptroller, cToken}) => unlistMarket(world, from, comptroller, cToken)
    ),
    new Command<{comptroller: Niutroller, cTokens: CToken[]}>(`
        #### EnterMarkets

        * "Niutroller EnterMarkets (<CToken> ...)" - User enters the given markets
          * E.g. "Niutroller EnterMarkets (cZRX cETH)"
      `,
      "EnterMarkets",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true})
      ],
      (world, from, {comptroller, cTokens}) => enterMarkets(world, from, comptroller, cTokens.map((c) => c._address))
    ),
    new Command<{comptroller: Niutroller, cToken: CToken}>(`
        #### ExitMarket

        * "Niutroller ExitMarket <CToken>" - User exits the given markets
          * E.g. "Niutroller ExitMarket cZRX"
      `,
      "ExitMarket",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {comptroller, cToken}) => exitMarket(world, from, comptroller, cToken._address)
    ),
    new Command<{comptroller: Niutroller, maxAssets: NumberV}>(`
        #### SetMaxAssets

        * "Niutroller SetMaxAssets <Number>" - Sets (or resets) the max allowed asset count
          * E.g. "Niutroller SetMaxAssets 4"
      `,
      "SetMaxAssets",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {comptroller, maxAssets}) => setMaxAssets(world, from, comptroller, maxAssets)
    ),
    new Command<{comptroller: Niutroller, liquidationIncentive: NumberV}>(`
        #### LiquidationIncentive

        * "Niutroller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "Niutroller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("liquidationIncentive", getExpNumberV)
      ],
      (world, from, {comptroller, liquidationIncentive}) => setLiquidationIncentive(world, from, comptroller, liquidationIncentive)
    ),
    new Command<{comptroller: Niutroller, priceOracle: AddressV}>(`
        #### SetPriceOracle

        * "Niutroller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "Niutroller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("priceOracle", getAddressV)
      ],
      (world, from, {comptroller, priceOracle}) => setPriceOracle(world, from, comptroller, priceOracle.val)
    ),
    new Command<{comptroller: Niutroller, cToken: CToken, collateralFactor: NumberV}>(`
        #### SetCollateralFactor

        * "Niutroller SetCollateralFactor <CToken> <Number>" - Sets the collateral factor for given cToken to number
          * E.g. "Niutroller SetCollateralFactor cZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV),
        new Arg("collateralFactor", getExpNumberV)
      ],
      (world, from, {comptroller, cToken, collateralFactor}) => setCollateralFactor(world, from, comptroller, cToken, collateralFactor)
    ),
    new Command<{comptroller: Niutroller, closeFactor: NumberV}>(`
        #### SetCloseFactor

        * "Niutroller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "Niutroller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("closeFactor", getPercentV)
      ],
      (world, from, {comptroller, closeFactor}) => setCloseFactor(world, from, comptroller, closeFactor)
    ),
    new Command<{comptroller: Niutroller, newPendingAdmin: AddressV}>(`
        #### SetPendingAdmin

        * "Niutroller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the Niutroller
          * E.g. "Niutroller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, {comptroller, newPendingAdmin}) => setPendingAdmin(world, from, comptroller, newPendingAdmin.val)
    ),
    new Command<{comptroller: Niutroller}>(`
        #### AcceptAdmin

        * "Niutroller AcceptAdmin" - Accepts admin for the Niutroller
          * E.g. "From Geoff (Niutroller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
      ],
      (world, from, {comptroller}) => acceptAdmin(world, from, comptroller)
    ),
    new Command<{comptroller: Niutroller, newPauseGuardian: AddressV}>(`
        #### SetPauseGuardian

        * "Niutroller SetPauseGuardian newPauseGuardian:<Address>" - Sets the PauseGuardian for the Niutroller
          * E.g. "Niutroller SetPauseGuardian Geoff"
      `,
      "SetPauseGuardian",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("newPauseGuardian", getAddressV)
      ],
      (world, from, {comptroller, newPauseGuardian}) => setPauseGuardian(world, from, comptroller, newPauseGuardian.val)
    ),

    new Command<{comptroller: Niutroller, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianPaused

        * "Niutroller SetGuardianPaused <Action> <Bool>" - Pauses or unpaused given cToken function
        * E.g. "Niutroller SetGuardianPaused "Transfer" True"
        `,
        "SetGuardianPaused",
        [
          new Arg("comptroller", getNiutroller, {implicit: true}),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {comptroller, action, isPaused}) => setGuardianPaused(world, from, comptroller, action.val, isPaused.val)
    ),

    new Command<{comptroller: Niutroller, cToken: CToken, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianMarketPaused

        * "Niutroller SetGuardianMarketPaused <CToken> <Action> <Bool>" - Pauses or unpaused given cToken function
        * E.g. "Niutroller SetGuardianMarketPaused cREP "Mint" True"
        `,
        "SetGuardianMarketPaused",
        [
          new Arg("comptroller", getNiutroller, {implicit: true}),
          new Arg("cToken", getCTokenV),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {comptroller, cToken, action, isPaused}) => setGuardianMarketPaused(world, from, comptroller, cToken, action.val, isPaused.val)
    ),

    new Command<{comptroller: Niutroller, blocks: NumberV, _keyword: StringV}>(`
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "CTokenScenario" and "NiutrollerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "Niutroller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV)
      ],
      (world, from, {comptroller, blocks}) => fastForward(world, from, comptroller, blocks)
    ),
    new View<{comptroller: Niutroller}>(`
        #### Liquidity

        * "Niutroller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
      ],
      (world, {comptroller}) => printLiquidity(world, comptroller)
    ),
    new View<{comptroller: Niutroller, input: StringV}>(`
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a Niutroller contract
      `,
      "Decode",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("input", getStringV)

      ],
      (world, {comptroller, input}) => decodeCall(world, comptroller, input.val)
    ),

    new Command<{comptroller: Niutroller, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * Niutroller Send functionSignature:<String> callArgs[] - Sends any transaction to comptroller
      * E.g: Niutroller Send "setNiuAddress(address)" (Address COMP)
      `,
      "Send",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {comptroller, signature, callArgs}) => sendAny(world, from, comptroller, signature.val, rawValues(callArgs))
    ),
    new Command<{comptroller: Niutroller, cTokens: CToken[]}>(`
      #### AddNiuMarkets

      * "Niutroller AddNiuMarkets (<Address> ...)" - Makes a market COMP-enabled
      * E.g. "Niutroller AddNiuMarkets (cZRX cBAT)
      `,
      "AddNiuMarkets",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true})
      ],
      (world, from, {comptroller, cTokens}) => addNiuMarkets(world, from, comptroller, cTokens)
     ),
    new Command<{comptroller: Niutroller, cToken: CToken}>(`
      #### DropNiuMarket

      * "Niutroller DropNiuMarket <Address>" - Makes a market COMP
      * E.g. "Niutroller DropNiuMarket cZRX
      `,
      "DropNiuMarket",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV)
      ],
      (world, from, {comptroller, cToken}) => dropNiuMarket(world, from, comptroller, cToken)
     ),

    new Command<{comptroller: Niutroller}>(`
      #### RefreshNiuSpeeds

      * "Niutroller RefreshNiuSpeeds" - Recalculates all the COMP market speeds
      * E.g. "Niutroller RefreshNiuSpeeds
      `,
      "RefreshNiuSpeeds",
      [
        new Arg("comptroller", getNiutroller, {implicit: true})
      ],
      (world, from, {comptroller}) => refreshNiuSpeeds(world, from, comptroller)
    ),
    new Command<{comptroller: Niutroller, holder: AddressV}>(`
      #### ClaimNiu

      * "Niutroller ClaimNiu <holder>" - Claims comp
      * E.g. "Niutroller ClaimNiu Geoff
      `,
      "ClaimNiu",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("holder", getAddressV)
      ],
      (world, from, {comptroller, holder}) => claimNiu(world, from, comptroller, holder.val)
    ),
    new Command<{comptroller: Niutroller, holder: AddressV, cTokens: CToken[]}>(`
      #### ClaimNiuInMarkets

      * "Niutroller ClaimNiu <holder> (<CToken> ...)" - Claims comp
      * E.g. "Niutroller ClaimNiuInMarkets Geoff (cDAI cBAT)
      `,
      "ClaimNiuInMarkets",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("holder", getAddressV),
        new Arg("cTokens", getCTokenV, {mapped: true})
      ],
      (world, from, {comptroller, holder, cTokens}) => claimNiuInMarkets(world, from, comptroller, holder.val, cTokens)
    ),
    new Command<{comptroller: Niutroller, contributor: AddressV}>(`
      #### UpdateContributorRewards

      * "Niutroller UpdateContributorRewards <contributor>" - Updates rewards for a contributor
      * E.g. "Niutroller UpdateContributorRewards Geoff
      `,
      "UpdateContributorRewards",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("contributor", getAddressV)
      ],
      (world, from, {comptroller, contributor}) => updateContributorRewards(world, from, comptroller, contributor.val)
    ),
    new Command<{comptroller: Niutroller, recipient: AddressV, amount: NumberV}>(`
      #### GrantNiu

      * "Niutroller GrantNiu <recipient> <amount>" - Grants COMP to a recipient
      * E.g. "Niutroller GrantNiu Geoff 1e18
      `,
      "GrantNiu",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, {comptroller, recipient, amount}) => grantNiu(world, from, comptroller, recipient.val, amount)
    ),
    new Command<{comptroller: Niutroller, rate: NumberV}>(`
      #### SetNiuRate

      * "Niutroller SetNiuRate <rate>" - Sets COMP rate
      * E.g. "Niutroller SetNiuRate 1e18
      `,
      "SetNiuRate",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("rate", getNumberV)
      ],
      (world, from, {comptroller, rate}) => setNiuRate(world, from, comptroller, rate)
    ),
    new Command<{comptroller: Niutroller, cToken: CToken, speed: NumberV}>(`
      #### SetNiuSpeed (deprecated)
      * "Niutroller SetNiuSpeed <cToken> <rate>" - Sets COMP speed for market
      * E.g. "Niutroller SetNiuSpeed cToken 1000
      `,
      "SetNiuSpeed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cToken", getCTokenV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {comptroller, cToken, speed}) => setNiuSpeed(world, from, comptroller, cToken, speed)
    ),
    new Command<{comptroller: Niutroller, cTokens: CToken[], supplySpeeds: NumberV[], borrowSpeeds: NumberV[]}>(`
      #### SetNiuSpeeds
      * "Niutroller SetNiuSpeeds (<cToken> ...) (<supplySpeed> ...) (<borrowSpeed> ...)" - Sets COMP speeds for markets
      * E.g. "Niutroller SetNiuSpeeds (cZRX cBAT) (1000 0) (1000 2000)
      `,
      "SetNiuSpeeds",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true}),
        new Arg("supplySpeeds", getNumberV, {mapped: true}),
        new Arg("borrowSpeeds", getNumberV, {mapped: true})
      ],
      (world, from, {comptroller, cTokens, supplySpeeds, borrowSpeeds}) => setNiuSpeeds(world, from, comptroller, cTokens, supplySpeeds, borrowSpeeds)
    ),
    new Command<{comptroller: Niutroller, contributor: AddressV, speed: NumberV}>(`
      #### SetContributorNiuSpeed
      * "Niutroller SetContributorNiuSpeed <contributor> <rate>" - Sets COMP speed for contributor
      * E.g. "Niutroller SetContributorNiuSpeed contributor 1000
      `,
      "SetContributorNiuSpeed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("contributor", getAddressV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {comptroller, contributor, speed}) => setContributorNiuSpeed(world, from, comptroller, contributor.val, speed)
    ),
    new Command<{comptroller: Niutroller, cTokens: CToken[], borrowCaps: NumberV[]}>(`
      #### SetMarketBorrowCaps

      * "Niutroller SetMarketBorrowCaps (<CToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "Niutroller SetMarketBorrowCaps (cZRX cUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("cTokens", getCTokenV, {mapped: true}),
        new Arg("borrowCaps", getNumberV, {mapped: true})
      ],
      (world, from, {comptroller,cTokens,borrowCaps}) => setMarketBorrowCaps(world, from, comptroller, cTokens, borrowCaps)
    ),
    new Command<{comptroller: Niutroller, newBorrowCapGuardian: AddressV}>(`
        #### SetBorrowCapGuardian

        * "Niutroller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the Niutroller
          * E.g. "Niutroller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("newBorrowCapGuardian", getAddressV)
      ],
      (world, from, {comptroller, newBorrowCapGuardian}) => setBorrowCapGuardian(world, from, comptroller, newBorrowCapGuardian.val)
    )
  ];
}

export async function processNiutrollerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Niutroller", comptrollerCommands(), world, event, from);
}
