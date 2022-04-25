import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

interface NiutrollerImplMethods {
  _become(
    comptroller: string,
    priceOracle?: string,
    maxAssets?: encodedNumber,
    closeFactor?: encodedNumber,
    reinitializing?: boolean
  ): Sendable<string>;

  _become(
    comptroller: string,
    compRate: encodedNumber,
    compMarkets: string[],
    otherMarkets: string[]
  ): Sendable<string>;
}

export interface NiutrollerImpl extends Contract {
  methods: NiutrollerImplMethods;
}
