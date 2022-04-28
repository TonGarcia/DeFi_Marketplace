import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { NTokenMethods, NTokenScenarioMethods } from './NToken';

interface NErc20DelegateMethods extends NTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface NErc20DelegateScenarioMethods extends NTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface NErc20Delegate extends Contract {
  methods: NErc20DelegateMethods;
  name: string;
}

export interface NErc20DelegateScenario extends Contract {
  methods: NErc20DelegateScenarioMethods;
  name: string;
}
