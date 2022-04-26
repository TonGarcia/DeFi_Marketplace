import { Event } from '../Event';
import { World } from '../World';
import { NToken } from '../Contract/NToken';
import { CErc20Delegator } from '../Contract/CErc20Delegator';
import { Erc20 } from '../Contract/Erc20';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  NumberV,
  Value,
  StringV
} from '../Value';
import { getWorldContractByAddress, getNTokenAddress } from '../ContractLookup';

export async function getNTokenV(world: World, event: Event): Promise<NToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getNTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<NToken>(world, address.val);
}

export async function getCErc20DelegatorV(world: World, event: Event): Promise<CErc20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getNTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<CErc20Delegator>(world, address.val);
}

async function getInterestRateModel(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(await nToken.methods.interestRateModel().call());
}

async function nTokenAddress(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(nToken._address);
}

async function getNTokenAdmin(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(await nToken.methods.admin().call());
}

async function getNTokenPendingAdmin(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(await nToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(world: World, nToken: NToken, user: string): Promise<NumberV> {
  return new NumberV(await nToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(world: World, nToken: NToken, user): Promise<NumberV> {
  return new NumberV(await nToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(world: World, nToken: NToken, user): Promise<NumberV> {
  return new NumberV(await nToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.reserveFactorMantissa().call(), 1.0e18);
}

async function getTotalReserves(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.totalReserves().call());
}

async function getNiutroller(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(await nToken.methods.comptroller().call());
}

async function getExchangeRateStored(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.getCash().call());
}

async function getInterestRate(world: World, nToken: NToken): Promise<NumberV> {
  return new NumberV(await nToken.methods.borrowRatePerBlock().call(), 1.0e18 / 2102400);
}

async function getImplementation(world: World, nToken: NToken): Promise<AddressV> {
  return new AddressV(await (nToken as CErc20Delegator).methods.implementation().call());
}

export function nTokenFetchers() {
  return [
    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### Address

        * "NToken <NToken> Address" - Returns address of NToken contract
          * E.g. "NToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => nTokenAddress(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### InterestRateModel

        * "NToken <NToken> InterestRateModel" - Returns the interest rate model of NToken contract
          * E.g. "NToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getInterestRateModel(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### Admin

        * "NToken <NToken> Admin" - Returns the admin of NToken contract
          * E.g. "NToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getNTokenAdmin(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### PendingAdmin

        * "NToken <NToken> PendingAdmin" - Returns the pending admin of NToken contract
          * E.g. "NToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getNTokenPendingAdmin(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### Underlying

        * "NToken <NToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "NToken cZRX Underlying"
      `,
      "Underlying",
      [
        new Arg("nToken", getNTokenV)
      ],
      async (world, { nToken }) => new AddressV(await nToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken, address: AddressV }, NumberV>(`
        #### UnderlyingBalance

        * "NToken <NToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "NToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("nToken", getNTokenV),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { nToken, address }) => balanceOfUnderlying(world, nToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken, address: AddressV }, NumberV>(`
        #### BorrowBalance

        * "NToken <NToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "NToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [
        new Arg("nToken", getNTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { nToken, address }) => getBorrowBalance(world, nToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken, address: AddressV }, NumberV>(`
        #### BorrowBalanceStored

        * "NToken <NToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "NToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [
        new Arg("nToken", getNTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { nToken, address }) => getBorrowBalanceStored(world, nToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### TotalBorrows

        * "NToken <NToken> TotalBorrows" - Returns the nToken's total borrow balance
          * E.g. "NToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getTotalBorrows(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### TotalBorrowsCurrent

        * "NToken <NToken> TotalBorrowsCurrent" - Returns the nToken's total borrow balance with interest
          * E.g. "NToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getTotalBorrowsCurrent(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### Reserves

        * "NToken <NToken> Reserves" - Returns the nToken's total reserves
          * E.g. "NToken cZRX Reserves"
      `,
      "Reserves",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getTotalReserves(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### ReserveFactor

        * "NToken <NToken> ReserveFactor" - Returns reserve factor of NToken contract
          * E.g. "NToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getReserveFactor(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### Niutroller

        * "NToken <NToken> Niutroller" - Returns the nToken's comptroller
          * E.g. "NToken cZRX Niutroller"
      `,
      "Niutroller",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getNiutroller(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### ExchangeRateStored

        * "NToken <NToken> ExchangeRateStored" - Returns the nToken's exchange rate (based on balances stored)
          * E.g. "NToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getExchangeRateStored(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### ExchangeRate

        * "NToken <NToken> ExchangeRate" - Returns the nToken's current exchange rate
          * E.g. "NToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getExchangeRate(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### Cash

        * "NToken <NToken> Cash" - Returns the nToken's current cash
          * E.g. "NToken cZRX Cash"
      `,
      "Cash",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getCash(world, nToken),
      { namePos: 1 }
    ),

    new Fetcher<{ nToken: NToken }, NumberV>(`
        #### InterestRate

        * "NToken <NToken> InterestRate" - Returns the nToken's current interest rate
          * E.g. "NToken cZRX InterestRate"
      `,
      "InterestRate",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, {nToken}) => getInterestRate(world, nToken),
      {namePos: 1}
    ),
    new Fetcher<{nToken: NToken, signature: StringV}, NumberV>(`
        #### CallNum

        * "NToken <NToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "NToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [
        new Arg("nToken", getNTokenV),
        new Arg("signature", getStringV),
      ],
      async (world, {nToken, signature}) => {
        const res = await world.web3.eth.call({
            to: nToken._address,
            data: world.web3.eth.abi.encodeFunctionSignature(signature.val)
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
      ,
      {namePos: 1}
    ),
    new Fetcher<{ nToken: NToken }, AddressV>(`
        #### Implementation

        * "NToken <NToken> Implementation" - Returns the nToken's current implementation
          * E.g. "NToken cDAI Implementation"
      `,
      "Implementation",
      [
        new Arg("nToken", getNTokenV)
      ],
      (world, { nToken }) => getImplementation(world, nToken),
      { namePos: 1 }
    )
  ];
}

export async function getNTokenValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("nToken", nTokenFetchers(), world, event);
}
