import { Event } from '../Event';
import { World } from '../World';
import { NErc20Delegate } from '../Contract/NErc20Delegate';
import {
  getCoreValue,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  Value,
} from '../Value';
import { getWorldContractByAddress, getNTokenDelegateAddress } from '../ContractLookup';

export async function getNTokenDelegateV(world: World, event: Event): Promise<NErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getNTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<NErc20Delegate>(world, address.val);
}

async function nTokenDelegateAddress(world: World, nTokenDelegate: NErc20Delegate): Promise<AddressV> {
  return new AddressV(nTokenDelegate._address);
}

export function nTokenDelegateFetchers() {
  return [
    new Fetcher<{ nTokenDelegate: NErc20Delegate }, AddressV>(`
        #### Address

        * "NTokenDelegate <NTokenDelegate> Address" - Returns address of NTokenDelegate contract
          * E.g. "NTokenDelegate cDaiDelegate Address" - Returns cDaiDelegate's address
      `,
      "Address",
      [
        new Arg("nTokenDelegate", getNTokenDelegateV)
      ],
      (world, { nTokenDelegate }) => nTokenDelegateAddress(world, nTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getNTokenDelegateValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("NTokenDelegate", nTokenDelegateFetchers(), world, event);
}
