import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { NToken, NTokenScenario } from '../Contract/NToken';
import { NErc20Delegate } from '../Contract/NErc20Delegate'
import { NErc20Delegator } from '../Contract/NErc20Delegator'
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
import { getContract } from '../Contract';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { NTokenErrorReporter } from '../ErrorReporter';
import { getNiutroller, getNTokenData } from '../ContractLookup';
import { getExpMantissa } from '../Encoding';
import { buildNToken } from '../Builder/NTokenBuilder';
import { verify } from '../Verify';
import { getLiquidity } from '../Value/NiutrollerValue';
import { encodedNumber } from '../Encoding';
import { getNTokenV, getNErc20DelegatorV } from '../Value/NTokenValue';

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get('value')).show();
}

async function genNToken(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, nToken, tokenData } = await buildNToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added nToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${nToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(world: World, from: string, nToken: NToken): Promise<World> {
  let invokation = await invoke(world, nToken.methods.accrueInterest(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(world: World, from: string, nToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, nToken.methods.mint(amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, nToken.methods.mint(), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(world: World, from: string, nToken: NToken, tokens: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods.redeem(tokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemUnderlying(world: World, from: string, nToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods.redeemUnderlying(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function borrow(world: World, from: string, nToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods.borrow(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repayBorrow(world: World, from: string, nToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, nToken.methods.repayBorrow(amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, nToken.methods.repayBorrow(), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function repayBorrowBehalf(world: World, from: string, behalf: string, nToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, nToken.methods.repayBorrowBehalf(behalf, amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, nToken.methods.repayBorrowBehalf(behalf), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow on behalf of ${describeUser(world, behalf)}`,
    invokation
  );

  return world;
}

async function liquidateBorrow(world: World, from: string, nToken: NToken, borrower: string, collateral: NToken, repayAmount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (repayAmount instanceof NumberV) {
    showAmount = repayAmount.show();
    invokation = await invoke(world, nToken.methods.liquidateBorrow(borrower, repayAmount.encode(), collateral._address), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, nToken.methods.liquidateBorrow(borrower, collateral._address), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} liquidates ${showAmount} from of ${describeUser(world, borrower)}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function seize(world: World, from: string, nToken: NToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods.seize(liquidator, borrower, seizeTokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} initiates seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function evilSeize(world: World, from: string, nToken: NToken, treasure: NToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods.evilSeize(treasure._address, liquidator, borrower, seizeTokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} initiates illegal seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function setPendingAdmin(world: World, from: string, nToken: NToken, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, nToken.methods._setPendingAdmin(newPendingAdmin), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, nToken: NToken): Promise<World> {
  let invokation = await invoke(world, nToken.methods._acceptAdmin(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(world: World, from: string, nToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods._addReserves(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} adds to reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function reduceReserves(world: World, from: string, nToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods._reduceReserves(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} reduces reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function setReserveFactor(world: World, from: string, nToken: NToken, reserveFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, nToken.methods._setReserveFactor(reserveFactor.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(world, from)} sets reserve factor to ${reserveFactor.show()}`,
    invokation
  );

  return world;
}

async function setInterestRateModel(world: World, from: string, nToken: NToken, interestRateModel: string): Promise<World> {
  let invokation = await invoke(world, nToken.methods._setInterestRateModel(interestRateModel), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Set interest rate for ${nToken.name} to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setNiutroller(world: World, from: string, nToken: NToken, comptroller: string): Promise<World> {
  let invokation = await invoke(world, nToken.methods._setNiutroller(comptroller), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Set comptroller for ${nToken.name} to ${comptroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function sweepToken(world: World, from: string, nToken: NToken, token: string): Promise<World> {
  let invokation = await invoke(world, nToken.methods.sweepToken(token), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Swept ERC-20 at ${token} to admin`,
    invokation
  );

  return world;
}

async function becomeImplementation(
  world: World,
  from: string,
  nToken: NToken,
  becomeImplementationData: string
): Promise<World> {

  const cErc20Delegate = getContract('NErc20Delegate');
  const cErc20DelegateContract = await cErc20Delegate.at<NErc20Delegate>(world, nToken._address);

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._becomeImplementation(becomeImplementationData),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(
      world,
      from
    )} initiates _becomeImplementation with data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function resignImplementation(
  world: World,
  from: string,
  nToken: NToken,
): Promise<World> {

  const cErc20Delegate = getContract('NErc20Delegate');
  const cErc20DelegateContract = await cErc20Delegate.at<NErc20Delegate>(world, nToken._address);

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._resignImplementation(),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(
      world,
      from
    )} initiates _resignImplementation.`,
    invokation
  );

  return world;
}

async function setImplementation(
  world: World,
  from: string,
  nToken: NErc20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    nToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${nToken.name}: ${describeUser(
      world,
      from
    )} initiates setImplementation with implementation:${implementation} allowResign:${allowResign} data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function donate(world: World, from: string, nToken: NToken): Promise<World> {
  let invokation = await invoke(world, nToken.methods.donate(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Donate for ${nToken.name} as ${describeUser(world, from)} with value ${showTrxValue(world)}`,
    invokation
  );

  return world;
}

async function setNTokenMock(world: World, from: string, nToken: NTokenScenario, mock: string, value: NumberV): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = nToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = nToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for nToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${nToken.name}`,
    invokation
  );

  return world;
}

async function verifyNToken(world: World, nToken: NToken, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, nToken._address);
  }

  return world;
}

async function printMinters(world: World, nToken: NToken): Promise<World> {
  let events = await getPastEvents(world, nToken, nToken.name, 'Mint');
  let addresses = events.map((event) => event.returnValues['minter']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printBorrowers(world: World, nToken: NToken): Promise<World> {
  let events = await getPastEvents(world, nToken, nToken.name, 'Borrow');
  let addresses = events.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printLiquidity(world: World, nToken: NToken): Promise<World> {
  let mintEvents = await getPastEvents(world, nToken, nToken.name, 'Mint');
  let mintAddresses = mintEvents.map((event) => event.returnValues['minter']);
  let borrowEvents = await getPastEvents(world, nToken, nToken.name, 'Borrow');
  let borrowAddresses = borrowEvents.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(mintAddresses.concat(borrowAddresses))];
  let comptroller = await getNiutroller(world);

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

export function nTokenCommands() {
  return [
    new Command<{ nTokenParams: EventV }>(`
        #### Deploy

        * "NToken Deploy ...nTokenParams" - Generates a new NToken
          * E.g. "NToken cZRX Deploy"
      `,
      "Deploy",
      [new Arg("nTokenParams", getEventV, { variadic: true })],
      (world, from, { nTokenParams }) => genNToken(world, from, nTokenParams.val)
    ),
    new View<{ nTokenArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "NToken <nToken> Verify apiKey:<String>" - Verifies NToken in Etherscan
          * E.g. "NToken cZRX Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("nTokenArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { nTokenArg, apiKey }) => {
        let [nToken, name, data] = await getNTokenData(world, nTokenArg.val);

        return await verifyNToken(world, nToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken }>(`
        #### AccrueInterest

        * "NToken <nToken> AccrueInterest" - Accrues interest for given token
          * E.g. "NToken cZRX AccrueInterest"
      `,
      "AccrueInterest",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, from, { nToken }) => accrueInterest(world, from, nToken),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV | NothingV }>(`
        #### Mint

        * "NToken <nToken> Mint amount:<Number>" - Mints the given amount of nToken as specified user
          * E.g. "NToken cZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { nToken, amount }) => mint(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, tokens: NumberV }>(`
        #### Redeem

        * "NToken <nToken> Redeem tokens:<Number>" - Redeems the given amount of nTokens as specified user
          * E.g. "NToken cZRX Redeem 1.0e9"
      `,
      "Redeem",
      [
        new Arg("nToken", getNTokenV),
        new Arg("tokens", getNumberV)
      ],
      (world, from, { nToken, tokens }) => redeem(world, from, nToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV }>(`
        #### RedeemUnderlying

        * "NToken <nToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "NToken cZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { nToken, amount }) => redeemUnderlying(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV }>(`
        #### Borrow

        * "NToken <nToken> Borrow amount:<Number>" - Borrows the given amount of this nToken as specified user
          * E.g. "NToken cZRX Borrow 1.0e18"
      `,
      "Borrow",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      // Note: we override from
      (world, from, { nToken, amount }) => borrow(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV | NothingV }>(`
        #### RepayBorrow

        * "NToken <nToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "NToken cZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { nToken, amount }) => repayBorrow(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, behalf: AddressV, amount: NumberV | NothingV }>(`
        #### RepayBorrowBehalf

        * "NToken <nToken> RepayBorrowBehalf behalf:<User> underlyingAmount:<Number>" - Repays borrow in the given underlying amount on behalf of another user
          * E.g. "NToken cZRX RepayBorrowBehalf Geoff 1.0e18"
      `,
      "RepayBorrowBehalf",
      [
        new Arg("nToken", getNTokenV),
        new Arg("behalf", getAddressV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { nToken, behalf, amount }) => repayBorrowBehalf(world, from, behalf.val, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ borrower: AddressV, nToken: NToken, collateral: NToken, repayAmount: NumberV | NothingV }>(`
        #### Liquidate

        * "NToken <nToken> Liquidate borrower:<User> nTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "NToken cZRX Liquidate Geoff cBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("nToken", getNTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getNTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true })
      ],
      (world, from, { borrower, nToken, collateral, repayAmount }) => liquidateBorrow(world, from, nToken, borrower.val, collateral, repayAmount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### Seize

        * "NToken <nToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other NToken)
          * E.g. "NToken cZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("nToken", getNTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { nToken, liquidator, borrower, seizeTokens }) => seize(world, from, nToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, treasure: NToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### EvilSeize

        * "NToken <nToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "NToken cEVL EvilSeize cZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("nToken", getNTokenV),
        new Arg("treasure", getNTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { nToken, treasure, liquidator, borrower, seizeTokens }) => evilSeize(world, from, nToken, treasure, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV }>(`
        #### ReduceReserves

        * "NToken <nToken> ReduceReserves amount:<Number>" - Reduces the reserves of the nToken
          * E.g. "NToken cZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { nToken, amount }) => reduceReserves(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, amount: NumberV }>(`
    #### AddReserves

    * "NToken <nToken> AddReserves amount:<Number>" - Adds reserves to the nToken
      * E.g. "NToken cZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [
        new Arg("nToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { nToken, amount }) => addReserves(world, from, nToken, amount),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, newPendingAdmin: AddressV }>(`
        #### SetPendingAdmin

        * "NToken <nToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the nToken
          * E.g. "NToken cZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("nToken", getNTokenV),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, { nToken, newPendingAdmin }) => setPendingAdmin(world, from, nToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken }>(`
        #### AcceptAdmin

        * "NToken <nToken> AcceptAdmin" - Accepts admin for the nToken
          * E.g. "From Geoff (NToken cZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, from, { nToken }) => acceptAdmin(world, from, nToken),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, reserveFactor: NumberV }>(`
        #### SetReserveFactor

        * "NToken <nToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the nToken
          * E.g. "NToken cZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [
        new Arg("nToken", getNTokenV),
        new Arg("reserveFactor", getExpNumberV)
      ],
      (world, from, { nToken, reserveFactor }) => setReserveFactor(world, from, nToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, interestRateModel: AddressV }>(`
        #### SetInterestRateModel

        * "NToken <nToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given nToken
          * E.g. "NToken cZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("nToken", getNTokenV),
        new Arg("interestRateModel", getAddressV)
      ],
      (world, from, { nToken, interestRateModel }) => setInterestRateModel(world, from, nToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, token: AddressV }>(`
        #### SweepToken

        * "NToken <nToken> SweepToken erc20Token:<Contract>" - Sweeps the given erc-20 token from the contract
          * E.g. "NToken cZRX SweepToken BAT"
      `,
      "SweepToken",
      [
        new Arg("nToken", getNTokenV),
        new Arg("token", getAddressV)
      ],
      (world, from, { nToken, token }) => sweepToken(world, from, nToken, token.val),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, comptroller: AddressV }>(`
        #### SetNiutroller

        * "NToken <nToken> SetNiutroller comptroller:<Contract>" - Sets the comptroller for the given nToken
          * E.g. "NToken cZRX SetNiutroller Niutroller"
      `,
      "SetNiutroller",
      [
        new Arg("nToken", getNTokenV),
        new Arg("comptroller", getAddressV)
      ],
      (world, from, { nToken, comptroller }) => setNiutroller(world, from, nToken, comptroller.val),
      { namePos: 1 }
    ),
    new Command<{
      nToken: NToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "NToken <nToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "NToken cDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      'BecomeImplementation',
      [
        new Arg('nToken', getNTokenV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { nToken, becomeImplementationData }) =>
        becomeImplementation(
          world,
          from,
          nToken,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{nToken: NToken;}>(
      `
        #### ResignImplementation

        * "NToken <nToken> ResignImplementation"
          * E.g. "NToken cDAI ResignImplementation"
      `,
      'ResignImplementation',
      [new Arg('nToken', getNTokenV)],
      (world, from, { nToken }) =>
        resignImplementation(
          world,
          from,
          nToken
        ),
      { namePos: 1 }
    ),
    new Command<{
      nToken: NErc20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "NToken <nToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "NToken cDAI SetImplementation (NToken cDAIDelegate Address) True "0x01234anyByTeS56789"
      `,
      'SetImplementation',
      [
        new Arg('nToken', getNErc20DelegatorV),
        new Arg('implementation', getAddressV),
        new Arg('allowResign', getBoolV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { nToken, implementation, allowResign, becomeImplementationData }) =>
        setImplementation(
          world,
          from,
          nToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken }>(`
        #### Donate

        * "NToken <nToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (NToken cETH Donate))"
      `,
      "Donate",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, from, { nToken }) => donate(world, from, nToken),
      { namePos: 1 }
    ),
    new Command<{ nToken: NToken, variable: StringV, value: NumberV }>(`
        #### Mock

        * "NToken <nToken> Mock variable:<String> value:<Number>" - Mocks a given value on nToken. Note: value must be a supported mock and this will only work on a "NTokenScenario" contract.
          * E.g. "NToken cZRX Mock totalBorrows 5.0e18"
          * E.g. "NToken cZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("nToken", getNTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { nToken, variable, value }) => setNTokenMock(world, from, <NTokenScenario>nToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ nToken: NToken }>(`
        #### Minters

        * "NToken <nToken> Minters" - Print address of all minters
      `,
      "Minters",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => printMinters(world, nToken),
      { namePos: 1 }
    ),
    new View<{ nToken: NToken }>(`
        #### Borrowers

        * "NToken <nToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => printBorrowers(world, nToken),
      { namePos: 1 }
    ),
    new View<{ nToken: NToken }>(`
        #### Liquidity

        * "NToken <nToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => printLiquidity(world, nToken),
      { namePos: 1 }
    ),
    new View<{ nToken: NToken, input: StringV }>(`
        #### Decode

        * "Decode <nToken> input:<String>" - Prints information about a call to a nToken contract
      `,
      "Decode",
      [
        new Arg("nToken", getNTokenV),
        new Arg("input", getStringV)

      ],
      (world, { nToken, input }) => decodeCall(world, nToken, input.val),
      { namePos: 1 }
    )
  ];
}

export async function processNTokenEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("NToken", nTokenCommands(), world, event, from);
}
