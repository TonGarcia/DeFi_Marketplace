import { Event } from '../Event';
import { World } from '../World';
import { CErc20Delegate } from '../Contract/CErc20Delegate';
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

export async function getNTokenDelegateV(world: World, event: Event): Promise<CErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getNTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<CErc20Delegate>(world, address.val);
}

async function NTokenDelegateAddress(world: World, NTokenDelegate: CErc20Delegate): Promise<AddressV> {
  return new AddressV(NTokenDelegate._address);
}

export function NTokenDelegateFetchers() {
  return [
    new Fetcher<{ NTokenDelegate: CErc20Delegate }, AddressV>(`
        #### Address

        * "NTokenDelegate <NTokenDelegate> Address" - Returns address of NTokenDelegate contract
          * E.g. "NTokenDelegate cDaiDelegate Address" - Returns cDaiDelegate's address
      `,
      "Address",
      [
        new Arg("NTokenDelegate", getNTokenDelegateV)
      ],
      (world, { NTokenDelegate }) => NTokenDelegateAddress(world, NTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getNTokenDelegateValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("NTokenDelegate", NTokenDelegateFetchers(), world, event);
}
