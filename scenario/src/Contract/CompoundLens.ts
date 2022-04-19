import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface NiuralLensMethods {
  NTokenBalances(NToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  NTokenBalancesAll(NTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  NTokenMetadata(NToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number]>;
  NTokenMetadataAll(NTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number][]>;
  NTokenUnderlyingPrice(NToken: string): Sendable<[string,number]>;
  NTokenUnderlyingPriceAll(NTokens: string[]): Sendable<[string,number][]>;
  getAccountLimits(comptroller: string, account: string): Sendable<[string[],number,number]>;
}

export interface NiuralLens extends Contract {
  methods: NiuralLensMethods;
  name: string;
}
