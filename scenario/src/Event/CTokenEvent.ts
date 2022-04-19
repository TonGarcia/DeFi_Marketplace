import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { NToken, NTokenScenario } from '../Contract/NToken';
import { CErc20Delegate } from '../Contract/CErc20Delegate'
import { CErc20Delegator } from '../Contract/CErc20Delegator'
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
import { getComptroller, getNTokenData } from '../ContractLookup';
import { getExpMantissa } from '../Encoding';
import { buildNToken } from '../Builder/NTokenBuilder';
import { verify } from '../Verify';
import { getLiquidity } from '../Value/ComptrollerValue';
import { encodedNumber } from '../Encoding';
import { getNTokenV, getCErc20DelegatorV } from '../Value/NTokenValue';

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get('value')).show();
}

async function genNToken(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, NToken, tokenData } = await buildNToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added NToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${NToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(world: World, from: string, NToken: NToken): Promise<World> {
  let invokation = await invoke(world, NToken.methods.accrueInterest(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(world: World, from: string, NToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, NToken.methods.mint(amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, NToken.methods.mint(), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(world: World, from: string, NToken: NToken, tokens: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods.redeem(tokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemUnderlying(world: World, from: string, NToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods.redeemUnderlying(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function borrow(world: World, from: string, NToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods.borrow(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repayBorrow(world: World, from: string, NToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, NToken.methods.repayBorrow(amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, NToken.methods.repayBorrow(), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function repayBorrowBehalf(world: World, from: string, behalf: string, NToken: NToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, NToken.methods.repayBorrowBehalf(behalf, amount.encode()), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, NToken.methods.repayBorrowBehalf(behalf), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow on behalf of ${describeUser(world, behalf)}`,
    invokation
  );

  return world;
}

async function liquidateBorrow(world: World, from: string, NToken: NToken, borrower: string, collateral: NToken, repayAmount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (repayAmount instanceof NumberV) {
    showAmount = repayAmount.show();
    invokation = await invoke(world, NToken.methods.liquidateBorrow(borrower, repayAmount.encode(), collateral._address), from, NTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, NToken.methods.liquidateBorrow(borrower, collateral._address), from, NTokenErrorReporter);
  }

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} liquidates ${showAmount} from of ${describeUser(world, borrower)}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function seize(world: World, from: string, NToken: NToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods.seize(liquidator, borrower, seizeTokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} initiates seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function evilSeize(world: World, from: string, NToken: NToken, treasure: NToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods.evilSeize(treasure._address, liquidator, borrower, seizeTokens.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} initiates illegal seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function setPendingAdmin(world: World, from: string, NToken: NToken, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, NToken.methods._setPendingAdmin(newPendingAdmin), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, NToken: NToken): Promise<World> {
  let invokation = await invoke(world, NToken.methods._acceptAdmin(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(world: World, from: string, NToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods._addReserves(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} adds to reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function reduceReserves(world: World, from: string, NToken: NToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods._reduceReserves(amount.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} reduces reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function setReserveFactor(world: World, from: string, NToken: NToken, reserveFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, NToken.methods._setReserveFactor(reserveFactor.encode()), from, NTokenErrorReporter);

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(world, from)} sets reserve factor to ${reserveFactor.show()}`,
    invokation
  );

  return world;
}

async function setInterestRateModel(world: World, from: string, NToken: NToken, interestRateModel: string): Promise<World> {
  let invokation = await invoke(world, NToken.methods._setInterestRateModel(interestRateModel), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Set interest rate for ${NToken.name} to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setComptroller(world: World, from: string, NToken: NToken, comptroller: string): Promise<World> {
  let invokation = await invoke(world, NToken.methods._setComptroller(comptroller), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Set comptroller for ${NToken.name} to ${comptroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function sweepToken(world: World, from: string, NToken: NToken, token: string): Promise<World> {
  let invokation = await invoke(world, NToken.methods.sweepToken(token), from, NTokenErrorReporter);

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
  NToken: NToken,
  becomeImplementationData: string
): Promise<World> {

  const cErc20Delegate = getContract('CErc20Delegate');
  const cErc20DelegateContract = await cErc20Delegate.at<CErc20Delegate>(world, NToken._address);

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._becomeImplementation(becomeImplementationData),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(
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
  NToken: NToken,
): Promise<World> {

  const cErc20Delegate = getContract('CErc20Delegate');
  const cErc20DelegateContract = await cErc20Delegate.at<CErc20Delegate>(world, NToken._address);

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._resignImplementation(),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(
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
  NToken: CErc20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    NToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    NTokenErrorReporter
  );

  world = addAction(
    world,
    `NToken ${NToken.name}: ${describeUser(
      world,
      from
    )} initiates setImplementation with implementation:${implementation} allowResign:${allowResign} data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function donate(world: World, from: string, NToken: NToken): Promise<World> {
  let invokation = await invoke(world, NToken.methods.donate(), from, NTokenErrorReporter);

  world = addAction(
    world,
    `Donate for ${NToken.name} as ${describeUser(world, from)} with value ${showTrxValue(world)}`,
    invokation
  );

  return world;
}

async function setNTokenMock(world: World, from: string, NToken: NTokenScenario, mock: string, value: NumberV): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = NToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = NToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for NToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${NToken.name}`,
    invokation
  );

  return world;
}

async function verifyNToken(world: World, NToken: NToken, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, NToken._address);
  }

  return world;
}

async function printMinters(world: World, NToken: NToken): Promise<World> {
  let events = await getPastEvents(world, NToken, NToken.name, 'Mint');
  let addresses = events.map((event) => event.returnValues['minter']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printBorrowers(world: World, NToken: NToken): Promise<World> {
  let events = await getPastEvents(world, NToken, NToken.name, 'Borrow');
  let addresses = events.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printLiquidity(world: World, NToken: NToken): Promise<World> {
  let mintEvents = await getPastEvents(world, NToken, NToken.name, 'Mint');
  let mintAddresses = mintEvents.map((event) => event.returnValues['minter']);
  let borrowEvents = await getPastEvents(world, NToken, NToken.name, 'Borrow');
  let borrowAddresses = borrowEvents.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(mintAddresses.concat(borrowAddresses))];
  let comptroller = await getComptroller(world);

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

export function NTokenCommands() {
  return [
    new Command<{ NTokenParams: EventV }>(`
        #### Deploy

        * "NToken Deploy ...NTokenParams" - Generates a new NToken
          * E.g. "NToken cZRX Deploy"
      `,
      "Deploy",
      [new Arg("NTokenParams", getEventV, { variadic: true })],
      (world, from, { NTokenParams }) => genNToken(world, from, NTokenParams.val)
    ),
    new View<{ NTokenArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "NToken <NToken> Verify apiKey:<String>" - Verifies NToken in Etherscan
          * E.g. "NToken cZRX Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("NTokenArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { NTokenArg, apiKey }) => {
        let [NToken, name, data] = await getNTokenData(world, NTokenArg.val);

        return await verifyNToken(world, NToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken }>(`
        #### AccrueInterest

        * "NToken <NToken> AccrueInterest" - Accrues interest for given token
          * E.g. "NToken cZRX AccrueInterest"
      `,
      "AccrueInterest",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, from, { NToken }) => accrueInterest(world, from, NToken),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV | NothingV }>(`
        #### Mint

        * "NToken <NToken> Mint amount:<Number>" - Mints the given amount of NToken as specified user
          * E.g. "NToken cZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { NToken, amount }) => mint(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, tokens: NumberV }>(`
        #### Redeem

        * "NToken <NToken> Redeem tokens:<Number>" - Redeems the given amount of NTokens as specified user
          * E.g. "NToken cZRX Redeem 1.0e9"
      `,
      "Redeem",
      [
        new Arg("NToken", getNTokenV),
        new Arg("tokens", getNumberV)
      ],
      (world, from, { NToken, tokens }) => redeem(world, from, NToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV }>(`
        #### RedeemUnderlying

        * "NToken <NToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "NToken cZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { NToken, amount }) => redeemUnderlying(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV }>(`
        #### Borrow

        * "NToken <NToken> Borrow amount:<Number>" - Borrows the given amount of this NToken as specified user
          * E.g. "NToken cZRX Borrow 1.0e18"
      `,
      "Borrow",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      // Note: we override from
      (world, from, { NToken, amount }) => borrow(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV | NothingV }>(`
        #### RepayBorrow

        * "NToken <NToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "NToken cZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { NToken, amount }) => repayBorrow(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, behalf: AddressV, amount: NumberV | NothingV }>(`
        #### RepayBorrowBehalf

        * "NToken <NToken> RepayBorrowBehalf behalf:<User> underlyingAmount:<Number>" - Repays borrow in the given underlying amount on behalf of another user
          * E.g. "NToken cZRX RepayBorrowBehalf Geoff 1.0e18"
      `,
      "RepayBorrowBehalf",
      [
        new Arg("NToken", getNTokenV),
        new Arg("behalf", getAddressV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { NToken, behalf, amount }) => repayBorrowBehalf(world, from, behalf.val, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ borrower: AddressV, NToken: NToken, collateral: NToken, repayAmount: NumberV | NothingV }>(`
        #### Liquidate

        * "NToken <NToken> Liquidate borrower:<User> NTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "NToken cZRX Liquidate Geoff cBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("NToken", getNTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getNTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true })
      ],
      (world, from, { borrower, NToken, collateral, repayAmount }) => liquidateBorrow(world, from, NToken, borrower.val, collateral, repayAmount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### Seize

        * "NToken <NToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other NToken)
          * E.g. "NToken cZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("NToken", getNTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { NToken, liquidator, borrower, seizeTokens }) => seize(world, from, NToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, treasure: NToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### EvilSeize

        * "NToken <NToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "NToken cEVL EvilSeize cZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("NToken", getNTokenV),
        new Arg("treasure", getNTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { NToken, treasure, liquidator, borrower, seizeTokens }) => evilSeize(world, from, NToken, treasure, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV }>(`
        #### ReduceReserves

        * "NToken <NToken> ReduceReserves amount:<Number>" - Reduces the reserves of the NToken
          * E.g. "NToken cZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { NToken, amount }) => reduceReserves(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, amount: NumberV }>(`
    #### AddReserves

    * "NToken <NToken> AddReserves amount:<Number>" - Adds reserves to the NToken
      * E.g. "NToken cZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [
        new Arg("NToken", getNTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { NToken, amount }) => addReserves(world, from, NToken, amount),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, newPendingAdmin: AddressV }>(`
        #### SetPendingAdmin

        * "NToken <NToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the NToken
          * E.g. "NToken cZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("NToken", getNTokenV),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, { NToken, newPendingAdmin }) => setPendingAdmin(world, from, NToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken }>(`
        #### AcceptAdmin

        * "NToken <NToken> AcceptAdmin" - Accepts admin for the NToken
          * E.g. "From Geoff (NToken cZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, from, { NToken }) => acceptAdmin(world, from, NToken),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, reserveFactor: NumberV }>(`
        #### SetReserveFactor

        * "NToken <NToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the NToken
          * E.g. "NToken cZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [
        new Arg("NToken", getNTokenV),
        new Arg("reserveFactor", getExpNumberV)
      ],
      (world, from, { NToken, reserveFactor }) => setReserveFactor(world, from, NToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, interestRateModel: AddressV }>(`
        #### SetInterestRateModel

        * "NToken <NToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given NToken
          * E.g. "NToken cZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("NToken", getNTokenV),
        new Arg("interestRateModel", getAddressV)
      ],
      (world, from, { NToken, interestRateModel }) => setInterestRateModel(world, from, NToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, token: AddressV }>(`
        #### SweepToken

        * "NToken <NToken> SweepToken erc20Token:<Contract>" - Sweeps the given erc-20 token from the contract
          * E.g. "NToken cZRX SweepToken BAT"
      `,
      "SweepToken",
      [
        new Arg("NToken", getNTokenV),
        new Arg("token", getAddressV)
      ],
      (world, from, { NToken, token }) => sweepToken(world, from, NToken, token.val),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, comptroller: AddressV }>(`
        #### SetComptroller

        * "NToken <NToken> SetComptroller comptroller:<Contract>" - Sets the comptroller for the given NToken
          * E.g. "NToken cZRX SetComptroller Comptroller"
      `,
      "SetComptroller",
      [
        new Arg("NToken", getNTokenV),
        new Arg("comptroller", getAddressV)
      ],
      (world, from, { NToken, comptroller }) => setComptroller(world, from, NToken, comptroller.val),
      { namePos: 1 }
    ),
    new Command<{
      NToken: NToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "NToken <NToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "NToken cDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      'BecomeImplementation',
      [
        new Arg('NToken', getNTokenV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { NToken, becomeImplementationData }) =>
        becomeImplementation(
          world,
          from,
          NToken,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{NToken: NToken;}>(
      `
        #### ResignImplementation

        * "NToken <NToken> ResignImplementation"
          * E.g. "NToken cDAI ResignImplementation"
      `,
      'ResignImplementation',
      [new Arg('NToken', getNTokenV)],
      (world, from, { NToken }) =>
        resignImplementation(
          world,
          from,
          NToken
        ),
      { namePos: 1 }
    ),
    new Command<{
      NToken: CErc20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "NToken <NToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "NToken cDAI SetImplementation (NToken cDAIDelegate Address) True "0x01234anyByTeS56789"
      `,
      'SetImplementation',
      [
        new Arg('NToken', getCErc20DelegatorV),
        new Arg('implementation', getAddressV),
        new Arg('allowResign', getBoolV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { NToken, implementation, allowResign, becomeImplementationData }) =>
        setImplementation(
          world,
          from,
          NToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken }>(`
        #### Donate

        * "NToken <NToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (NToken cETH Donate))"
      `,
      "Donate",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, from, { NToken }) => donate(world, from, NToken),
      { namePos: 1 }
    ),
    new Command<{ NToken: NToken, variable: StringV, value: NumberV }>(`
        #### Mock

        * "NToken <NToken> Mock variable:<String> value:<Number>" - Mocks a given value on NToken. Note: value must be a supported mock and this will only work on a "NTokenScenario" contract.
          * E.g. "NToken cZRX Mock totalBorrows 5.0e18"
          * E.g. "NToken cZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("NToken", getNTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { NToken, variable, value }) => setNTokenMock(world, from, <NTokenScenario>NToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ NToken: NToken }>(`
        #### Minters

        * "NToken <NToken> Minters" - Print address of all minters
      `,
      "Minters",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => printMinters(world, NToken),
      { namePos: 1 }
    ),
    new View<{ NToken: NToken }>(`
        #### Borrowers

        * "NToken <NToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => printBorrowers(world, NToken),
      { namePos: 1 }
    ),
    new View<{ NToken: NToken }>(`
        #### Liquidity

        * "NToken <NToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => printLiquidity(world, NToken),
      { namePos: 1 }
    ),
    new View<{ NToken: NToken, input: StringV }>(`
        #### Decode

        * "Decode <NToken> input:<String>" - Prints information about a call to a NToken contract
      `,
      "Decode",
      [
        new Arg("NToken", getNTokenV),
        new Arg("input", getStringV)

      ],
      (world, { NToken, input }) => decodeCall(world, NToken, input.val),
      { namePos: 1 }
    )
  ];
}

export async function processNTokenEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("NToken", NTokenCommands(), world, event, from);
}
