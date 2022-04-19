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

async function getInterestRateModel(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(await NToken.methods.interestRateModel().call());
}

async function NTokenAddress(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(NToken._address);
}

async function getNTokenAdmin(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(await NToken.methods.admin().call());
}

async function getNTokenPendingAdmin(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(await NToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(world: World, NToken: NToken, user: string): Promise<NumberV> {
  return new NumberV(await NToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(world: World, NToken: NToken, user): Promise<NumberV> {
  return new NumberV(await NToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(world: World, NToken: NToken, user): Promise<NumberV> {
  return new NumberV(await NToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.reserveFactorMantissa().call(), 1.0e18);
}

async function getTotalReserves(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.totalReserves().call());
}

async function getComptroller(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(await NToken.methods.comptroller().call());
}

async function getExchangeRateStored(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.getCash().call());
}

async function getInterestRate(world: World, NToken: NToken): Promise<NumberV> {
  return new NumberV(await NToken.methods.borrowRatePerBlock().call(), 1.0e18 / 2102400);
}

async function getImplementation(world: World, NToken: NToken): Promise<AddressV> {
  return new AddressV(await (NToken as CErc20Delegator).methods.implementation().call());
}

export function NTokenFetchers() {
  return [
    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### Address

        * "NToken <NToken> Address" - Returns address of NToken contract
          * E.g. "NToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => NTokenAddress(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### InterestRateModel

        * "NToken <NToken> InterestRateModel" - Returns the interest rate model of NToken contract
          * E.g. "NToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getInterestRateModel(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### Admin

        * "NToken <NToken> Admin" - Returns the admin of NToken contract
          * E.g. "NToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getNTokenAdmin(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### PendingAdmin

        * "NToken <NToken> PendingAdmin" - Returns the pending admin of NToken contract
          * E.g. "NToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getNTokenPendingAdmin(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### Underlying

        * "NToken <NToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "NToken cZRX Underlying"
      `,
      "Underlying",
      [
        new Arg("NToken", getNTokenV)
      ],
      async (world, { NToken }) => new AddressV(await NToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken, address: AddressV }, NumberV>(`
        #### UnderlyingBalance

        * "NToken <NToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "NToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("NToken", getNTokenV),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { NToken, address }) => balanceOfUnderlying(world, NToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken, address: AddressV }, NumberV>(`
        #### BorrowBalance

        * "NToken <NToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "NToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [
        new Arg("NToken", getNTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { NToken, address }) => getBorrowBalance(world, NToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken, address: AddressV }, NumberV>(`
        #### BorrowBalanceStored

        * "NToken <NToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "NToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [
        new Arg("NToken", getNTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { NToken, address }) => getBorrowBalanceStored(world, NToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### TotalBorrows

        * "NToken <NToken> TotalBorrows" - Returns the NToken's total borrow balance
          * E.g. "NToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getTotalBorrows(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### TotalBorrowsCurrent

        * "NToken <NToken> TotalBorrowsCurrent" - Returns the NToken's total borrow balance with interest
          * E.g. "NToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getTotalBorrowsCurrent(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### Reserves

        * "NToken <NToken> Reserves" - Returns the NToken's total reserves
          * E.g. "NToken cZRX Reserves"
      `,
      "Reserves",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getTotalReserves(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### ReserveFactor

        * "NToken <NToken> ReserveFactor" - Returns reserve factor of NToken contract
          * E.g. "NToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getReserveFactor(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### Comptroller

        * "NToken <NToken> Comptroller" - Returns the NToken's comptroller
          * E.g. "NToken cZRX Comptroller"
      `,
      "Comptroller",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getComptroller(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### ExchangeRateStored

        * "NToken <NToken> ExchangeRateStored" - Returns the NToken's exchange rate (based on balances stored)
          * E.g. "NToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getExchangeRateStored(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### ExchangeRate

        * "NToken <NToken> ExchangeRate" - Returns the NToken's current exchange rate
          * E.g. "NToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getExchangeRate(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### Cash

        * "NToken <NToken> Cash" - Returns the NToken's current cash
          * E.g. "NToken cZRX Cash"
      `,
      "Cash",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getCash(world, NToken),
      { namePos: 1 }
    ),

    new Fetcher<{ NToken: NToken }, NumberV>(`
        #### InterestRate

        * "NToken <NToken> InterestRate" - Returns the NToken's current interest rate
          * E.g. "NToken cZRX InterestRate"
      `,
      "InterestRate",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, {NToken}) => getInterestRate(world, NToken),
      {namePos: 1}
    ),
    new Fetcher<{NToken: NToken, signature: StringV}, NumberV>(`
        #### CallNum

        * "NToken <NToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "NToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [
        new Arg("NToken", getNTokenV),
        new Arg("signature", getStringV),
      ],
      async (world, {NToken, signature}) => {
        const res = await world.web3.eth.call({
            to: NToken._address,
            data: world.web3.eth.abi.encodeFunctionSignature(signature.val)
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
      ,
      {namePos: 1}
    ),
    new Fetcher<{ NToken: NToken }, AddressV>(`
        #### Implementation

        * "NToken <NToken> Implementation" - Returns the NToken's current implementation
          * E.g. "NToken cDAI Implementation"
      `,
      "Implementation",
      [
        new Arg("NToken", getNTokenV)
      ],
      (world, { NToken }) => getImplementation(world, NToken),
      { namePos: 1 }
    )
  ];
}

export async function getNTokenValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("NToken", NTokenFetchers(), world, event);
}
