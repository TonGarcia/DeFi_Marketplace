import {Event} from '../Event';
import {World} from '../World';
import {Niutroller} from '../Contract/Niutroller';
import {NToken} from '../Contract/NToken';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getNiutroller} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getNTokenV} from './NTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getNiutrollerAddress(world: World, comptroller: Niutroller): Promise<AddressV> {
  return new AddressV(comptroller._address);
}

export async function getLiquidity(world: World, comptroller: Niutroller, user: string): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await comptroller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(world: World, comptroller: Niutroller, account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await comptroller.methods.getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account hypothetical liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(world: World, comptroller: Niutroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.oracle().call());
}

async function getCloseFactor(world: World, comptroller: Niutroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.closeFactorMantissa().call(), 1e18);
}

async function getMaxAssets(world: World, comptroller: Niutroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.maxAssets().call());
}

async function getLiquidationIncentive(world: World, comptroller: Niutroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.liquidationIncentiveMantissa().call(), 1e18);
}

async function getImplementation(world: World, comptroller: Niutroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.comptrollerImplementation().call());
}

async function getBlockNumber(world: World, comptroller: Niutroller): Promise<NumberV> {
  return new NumberV(await comptroller.methods.getBlockNumber().call());
}

async function getAdmin(world: World, comptroller: Niutroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.admin().call());
}

async function getPendingAdmin(world: World, comptroller: Niutroller): Promise<AddressV> {
  return new AddressV(await comptroller.methods.pendingAdmin().call());
}

async function getCollateralFactor(world: World, comptroller: Niutroller, nToken: NToken): Promise<NumberV> {
  let {0: _isListed, 1: collateralFactorMantissa} = await comptroller.methods.markets(nToken._address).call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(world: World, comptroller: Niutroller, user: string): Promise<NumberV> {
  return new NumberV(await comptroller.methods.membershipLength(user).call());
}

async function checkMembership(world: World, comptroller: Niutroller, user: string, nToken: NToken): Promise<BoolV> {
  return new BoolV(await comptroller.methods.checkMembership(user, nToken._address).call());
}

async function getAssetsIn(world: World, comptroller: Niutroller, user: string): Promise<ListV> {
  let assetsList = await comptroller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function getNiuMarkets(world: World, comptroller: Niutroller): Promise<ListV> {
  let mkts = await comptroller.methods.getNiuMarkets().call();

  return new ListV(mkts.map((a) => new AddressV(a)));
}

async function checkListed(world: World, comptroller: Niutroller, nToken: NToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa} = await comptroller.methods.markets(nToken._address).call();

  return new BoolV(isListed);
}

async function checkIsNiued(world: World, comptroller: Niutroller, nToken: NToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa, 2: isNiued} = await comptroller.methods.markets(nToken._address).call();
  return new BoolV(isNiued);
}


export function comptrollerFetchers() {
  return [
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### Address

        * "Niutroller Address" - Returns address of comptroller
      `,
      "Address",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getNiutrollerAddress(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV}, NumberV>(`
        #### Liquidity

        * "Niutroller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "Niutroller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => getLiquidity(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV, action: StringV, amount: NumberV, nToken: NToken}, NumberV>(`
        #### Hypothetical

        * "Niutroller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "Niutroller Hypothetical Geoff Redeems 6.0 cZRX"
          * E.g. "Niutroller Hypothetical Geoff Borrows 5.0 cZRX"
      `,
      "Hypothetical",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("nToken", getNTokenV)
      ],
      async (world, {comptroller, account, action, nToken, amount}) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(world, comptroller, account.val, nToken._address, redeemTokens.encode(), borrowAmount.encode());
      }
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### Admin

        * "Niutroller Admin" - Returns the Niutrollers's admin
          * E.g. "Niutroller Admin"
      `,
      "Admin",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getAdmin(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### PendingAdmin

        * "Niutroller PendingAdmin" - Returns the pending admin of the Niutroller
          * E.g. "Niutroller PendingAdmin" - Returns Niutroller's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
      ],
      (world, {comptroller}) => getPendingAdmin(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### PriceOracle

        * "Niutroller PriceOracle" - Returns the Niutrollers's price oracle
          * E.g. "Niutroller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getPriceOracle(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, NumberV>(`
        #### CloseFactor

        * "Niutroller CloseFactor" - Returns the Niutrollers's close factor
          * E.g. "Niutroller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getCloseFactor(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, NumberV>(`
        #### MaxAssets

        * "Niutroller MaxAssets" - Returns the Niutrollers's max assets
          * E.g. "Niutroller MaxAssets"
      `,
      "MaxAssets",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getMaxAssets(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, NumberV>(`
        #### LiquidationIncentive

        * "Niutroller LiquidationIncentive" - Returns the Niutrollers's liquidation incentive
          * E.g. "Niutroller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getLiquidationIncentive(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### Implementation

        * "Niutroller Implementation" - Returns the Niutrollers's implementation
          * E.g. "Niutroller Implementation"
      `,
      "Implementation",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getImplementation(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller}, NumberV>(`
        #### BlockNumber

        * "Niutroller BlockNumber" - Returns the Niutrollers's mocked block number (for scenario runner)
          * E.g. "Niutroller BlockNumber"
      `,
      "BlockNumber",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      (world, {comptroller}) => getBlockNumber(world, comptroller)
    ),
    new Fetcher<{comptroller: Niutroller, nToken: NToken}, NumberV>(`
        #### CollateralFactor

        * "Niutroller CollateralFactor <NToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "Niutroller CollateralFactor cZRX"
      `,
      "CollateralFactor",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("nToken", getNTokenV)
      ],
      (world, {comptroller, nToken}) => getCollateralFactor(world, comptroller, nToken)
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV}, NumberV>(`
        #### MembershipLength

        * "Niutroller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "Niutroller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => membershipLength(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV, nToken: NToken}, BoolV>(`
        #### CheckMembership

        * "Niutroller CheckMembership <User> <NToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "Niutroller CheckMembership Geoff cZRX"
      `,
      "CheckMembership",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("nToken", getNTokenV)
      ],
      (world, {comptroller, account, nToken}) => checkMembership(world, comptroller, account.val, nToken)
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV}, ListV>(`
        #### AssetsIn

        * "Niutroller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "Niutroller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {comptroller, account}) => getAssetsIn(world, comptroller, account.val)
    ),
    new Fetcher<{comptroller: Niutroller, nToken: NToken}, BoolV>(`
        #### CheckListed

        * "Niutroller CheckListed <NToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Niutroller CheckListed cZRX"
      `,
      "CheckListed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("nToken", getNTokenV)
      ],
      (world, {comptroller, nToken}) => checkListed(world, comptroller, nToken)
    ),
    new Fetcher<{comptroller: Niutroller, nToken: NToken}, BoolV>(`
        #### CheckIsNiued

        * "Niutroller CheckIsNiued <NToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Niutroller CheckIsNiued cZRX"
      `,
      "CheckIsNiued",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("nToken", getNTokenV)
      ],
      (world, {comptroller, nToken}) => checkIsNiued(world, comptroller, nToken)
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### PauseGuardian

        * "PauseGuardian" - Returns the Niutrollers's PauseGuardian
        * E.g. "Niutroller PauseGuardian"
        `,
        "PauseGuardian",
        [
          new Arg("comptroller", getNiutroller, {implicit: true})
        ],
        async (world, {comptroller}) => new AddressV(await comptroller.methods.pauseGuardian().call())
    ),

    new Fetcher<{comptroller: Niutroller}, BoolV>(`
        #### _MintGuardianPaused

        * "_MintGuardianPaused" - Returns the Niutrollers's original global Mint paused status
        * E.g. "Niutroller _MintGuardianPaused"
        `,
        "_MintGuardianPaused",
        [new Arg("comptroller", getNiutroller, {implicit: true})],
        async (world, {comptroller}) => new BoolV(await comptroller.methods._mintGuardianPaused().call())
    ),
    new Fetcher<{comptroller: Niutroller}, BoolV>(`
        #### _BorrowGuardianPaused

        * "_BorrowGuardianPaused" - Returns the Niutrollers's original global Borrow paused status
        * E.g. "Niutroller _BorrowGuardianPaused"
        `,
        "_BorrowGuardianPaused",
        [new Arg("comptroller", getNiutroller, {implicit: true})],
        async (world, {comptroller}) => new BoolV(await comptroller.methods._borrowGuardianPaused().call())
    ),

    new Fetcher<{comptroller: Niutroller}, BoolV>(`
        #### TransferGuardianPaused

        * "TransferGuardianPaused" - Returns the Niutrollers's Transfer paused status
        * E.g. "Niutroller TransferGuardianPaused"
        `,
        "TransferGuardianPaused",
        [new Arg("comptroller", getNiutroller, {implicit: true})],
        async (world, {comptroller}) => new BoolV(await comptroller.methods.transferGuardianPaused().call())
    ),
    new Fetcher<{comptroller: Niutroller}, BoolV>(`
        #### SeizeGuardianPaused

        * "SeizeGuardianPaused" - Returns the Niutrollers's Seize paused status
        * E.g. "Niutroller SeizeGuardianPaused"
        `,
        "SeizeGuardianPaused",
        [new Arg("comptroller", getNiutroller, {implicit: true})],
        async (world, {comptroller}) => new BoolV(await comptroller.methods.seizeGuardianPaused().call())
    ),

    new Fetcher<{comptroller: Niutroller, nToken: NToken}, BoolV>(`
        #### MintGuardianMarketPaused

        * "MintGuardianMarketPaused" - Returns the Niutrollers's Mint paused status in market
        * E.g. "Niutroller MintGuardianMarketPaused cREP"
        `,
        "MintGuardianMarketPaused",
        [
          new Arg("comptroller", getNiutroller, {implicit: true}),
          new Arg("nToken", getNTokenV)
        ],
        async (world, {comptroller, nToken}) => new BoolV(await comptroller.methods.mintGuardianPaused(nToken._address).call())
    ),
    new Fetcher<{comptroller: Niutroller, nToken: NToken}, BoolV>(`
        #### BorrowGuardianMarketPaused

        * "BorrowGuardianMarketPaused" - Returns the Niutrollers's Borrow paused status in market
        * E.g. "Niutroller BorrowGuardianMarketPaused cREP"
        `,
        "BorrowGuardianMarketPaused",
        [
          new Arg("comptroller", getNiutroller, {implicit: true}),
          new Arg("nToken", getNTokenV)
        ],
        async (world, {comptroller, nToken}) => new BoolV(await comptroller.methods.borrowGuardianPaused(nToken._address).call())
    ),

    new Fetcher<{comptroller: Niutroller}, ListV>(`
      #### GetNiuMarkets

      * "GetNiuMarkets" - Returns an array of the currently enabled Niu markets. To use the auto-gen array getter compMarkets(uint), use NiuMarkets
      * E.g. "Niutroller GetNiuMarkets"
      `,
      "GetNiuMarkets",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      async(world, {comptroller}) => await getNiuMarkets(world, comptroller)
     ),

    new Fetcher<{comptroller: Niutroller}, NumberV>(`
      #### NiuRate

      * "NiuRate" - Returns the current comp rate.
      * E.g. "Niutroller NiuRate"
      `,
      "NiuRate",
      [new Arg("comptroller", getNiutroller, {implicit: true})],
      async(world, {comptroller}) => new NumberV(await comptroller.methods.niuRate().call())
    ),

    new Fetcher<{comptroller: Niutroller, signature: StringV, callArgs: StringV[]}, NumberV>(`
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "Niutroller CallNum \"compSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      async (world, {comptroller, signature, callArgs}) => {
        const fnData = encodeABI(world, signature.val, callArgs.map(a => a.val));
        const res = await world.web3.eth.call({
            to: comptroller._address,
            data: fnData
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken, key: StringV}, NumberV>(`
        #### NiuSupplyState(address)

        * "Niutroller NiuBorrowState cZRX "index"
      `,
      "NiuSupplyState",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {comptroller, NToken, key}) => {
        const result = await comptroller.methods.niuSupplyState(NToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken, key: StringV}, NumberV>(`
        #### NiuBorrowState(address)

        * "Niutroller NiuBorrowState cZRX "index"
      `,
      "NiuBorrowState",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {comptroller, NToken, key}) => {
        const result = await comptroller.methods.niuBorrowState(NToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV, key: StringV}, NumberV>(`
        #### NiuAccrued(address)

        * "Niutroller NiuAccrued Coburn
      `,
      "NiuAccrued",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller,account}) => {
        const result = await comptroller.methods.niuAccrued(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{comptroller: Niutroller, account: AddressV, key: StringV}, NumberV>(`
        #### NiuReceivable(address)

        * "Niutroller NiuReceivable Coburn
      `,
      "NiuReceivable",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller,account}) => {
        const result = await comptroller.methods.compReceivable(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken, account: AddressV}, NumberV>(`
        #### niuSupplierIndex

        * "Niutroller NiuSupplierIndex cZRX Coburn
      `,
      "NiuSupplierIndex",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller, NToken, account}) => {
        return new NumberV(await comptroller.methods.niuSupplierIndex(NToken._address, account.val).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken, account: AddressV}, NumberV>(`
        #### NiuBorrowerIndex

        * "Niutroller NiuBorrowerIndex cZRX Coburn
      `,
      "NiuBorrowerIndex",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {comptroller, NToken, account}) => {
        return new NumberV(await comptroller.methods.niuBorrowerIndex(NToken._address, account.val).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken}, NumberV>(`
        #### NiuSpeed

        * "Niutroller NiuSpeed cZRX
      `,
      "NiuSpeed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
      ],
      async (world, {comptroller, NToken}) => {
        return new NumberV(await comptroller.methods.compSpeeds(NToken._address).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken}, NumberV>(`
        #### NiuSupplySpeed

        * "Niutroller NiuSupplySpeed cZRX
      `,
      "NiuSupplySpeed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
      ],
      async (world, {comptroller, NToken}) => {
        return new NumberV(await comptroller.methods.niuSupplySpeeds(NToken._address).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken}, NumberV>(`
        #### NiuBorrowSpeed

        * "Niutroller NiuBorrowSpeed cZRX
      `,
      "NiuBorrowSpeed",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
      ],
      async (world, {comptroller, NToken}) => {
        return new NumberV(await comptroller.methods.niuBorrowSpeeds(NToken._address).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller}, AddressV>(`
        #### BorrowCapGuardian

        * "BorrowCapGuardian" - Returns the Niutrollers's BorrowCapGuardian
        * E.g. "Niutroller BorrowCapGuardian"
        `,
        "BorrowCapGuardian",
        [
          new Arg("comptroller", getNiutroller, {implicit: true})
        ],
        async (world, {comptroller}) => new AddressV(await comptroller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken}, NumberV>(`
        #### BorrowCaps

        * "Niutroller BorrowCaps cZRX
      `,
      "BorrowCaps",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
      ],
      async (world, {comptroller, NToken}) => {
        return new NumberV(await comptroller.methods.borrowCaps(NToken._address).call());
      }
    ),
    new Fetcher<{comptroller: Niutroller, NToken: NToken}, NumberV>(`
        #### IsDeprecated

        * "Niutroller IsDeprecated cZRX
      `,
      "IsDeprecated",
      [
        new Arg("comptroller", getNiutroller, {implicit: true}),
        new Arg("NToken", getNTokenV),
      ],
      async (world, {comptroller, NToken}) => {
        return new NumberV(await comptroller.methods.isDeprecated(NToken._address).call());
      }
    )
  ];
}

export async function getNiutrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Niutroller", comptrollerFetchers(), world, event);
}
