import {Event} from '../Event';
import {World} from '../World';
import {NiutrollerImpl} from '../Contract/NiutrollerImpl';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getNiutrollerImpl} from '../ContractLookup';

export async function getNiutrollerImplAddress(world: World, comptrollerImpl: NiutrollerImpl): Promise<AddressV> {
  return new AddressV(comptrollerImpl._address);
}

export function comptrollerImplFetchers() {
  return [
    new Fetcher<{comptrollerImpl: NiutrollerImpl}, AddressV>(`
        #### Address

        * "NiutrollerImpl Address" - Returns address of comptroller implementation
      `,
      "Address",
      [new Arg("comptrollerImpl", getNiutrollerImpl)],
      (world, {comptrollerImpl}) => getNiutrollerImplAddress(world, comptrollerImpl),
      {namePos: 1}
    )
  ];
}

export async function getNiutrollerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("NiutrollerImpl", comptrollerImplFetchers(), world, event);
}
