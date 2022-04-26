import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { NTokenMethods, NTokenScenarioMethods } from './NToken';

interface CErc20DelegateMethods extends NTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface CErc20DelegateScenarioMethods extends NTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface CErc20Delegate extends Contract {
  methods: CErc20DelegateMethods;
  name: string;
}

export interface CErc20DelegateScenario extends Contract {
  methods: CErc20DelegateScenarioMethods;
  name: string;
}
