import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { NTokenMethods } from './NToken';
import { encodedNumber } from '../Encoding';

interface NErc20DelegatorMethods extends NTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface NErc20DelegatorScenarioMethods extends NErc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface NErc20Delegator extends Contract {
  methods: NErc20DelegatorMethods;
  name: string;
}

export interface NErc20DelegatorScenario extends Contract {
  methods: NErc20DelegatorMethods;
  name: string;
}
