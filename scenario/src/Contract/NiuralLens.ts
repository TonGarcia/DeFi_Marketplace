import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface NiuralLensMethods {
  nTokenBalances(nToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  nTokenBalancesAll(nTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  nTokenMetadata(nToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number]>;
  nTokenMetadataAll(nTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number][]>;
  nTokenUnderlyingPrice(nToken: string): Sendable<[string,number]>;
  nTokenUnderlyingPriceAll(nTokens: string[]): Sendable<[string,number][]>;
  getAccountLimits(comptroller: string, account: string): Sendable<[string[],number,number]>;
}

export interface NiuralLens extends Contract {
  methods: NiuralLensMethods;
  name: string;
}
