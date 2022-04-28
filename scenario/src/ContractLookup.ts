import { Map } from 'immutable';

import { Event } from './Event';
import { World } from './World';
import { Contract } from './Contract';
import { mustString } from './Utils';

import { NErc20Delegate } from './Contract/NErc20Delegate';
import { Niu } from './Contract/Niu';
import { Niutroller } from './Contract/Niutroller';
import { NiutrollerImpl } from './Contract/NiutrollerImpl';
import { NToken } from './Contract/NToken';
import { Governor } from './Contract/Governor';
import { GovernorBravo } from './Contract/GovernorBravo'
import { Erc20 } from './Contract/Erc20';
import { InterestRateModel } from './Contract/InterestRateModel';
import { PriceOracle } from './Contract/PriceOracle';
import { Timelock } from './Contract/Timelock';
import { AnchoredView } from './Contract/AnchoredView';

type ContractDataEl = string | Map<string, object> | undefined;

function getContractData(world: World, indices: string[][]): ContractDataEl {
  return indices.reduce((value: ContractDataEl, index) => {
    if (value) {
      return value;
    } else {
      return index.reduce((data: ContractDataEl, el) => {
        let lowerEl = el.toLowerCase();

        if (!data) {
          return;
        } else if (typeof data === 'string') {
          return data;
        } else {
          return (data as Map<string, ContractDataEl>).find((_v, key) => key.toLowerCase().trim() === lowerEl.trim());
        }
      }, world.contractData);
    }
  }, undefined);
}

function getContractDataString(world: World, indices: string[][]): string {
  const value: ContractDataEl = getContractData(world, indices);

  if (!value || typeof value !== 'string') {
    throw new Error(
      `Failed to find string value by index (got ${value}): ${JSON.stringify(
        indices
      )}, index contains: ${JSON.stringify(world.contractData.toJSON())}`
    );
  }

  return value;
}

export function getWorldContract<T>(world: World, indices: string[][]): T {
  const address = getContractDataString(world, indices);

  return getWorldContractByAddress<T>(world, address);
}

export function getWorldContractByAddress<T>(world: World, address: string): T {
  const contract = world.contractIndex[address.toLowerCase()];

  if (!contract) {
    throw new Error(
      `Failed to find world contract by address: ${address}, index contains: ${JSON.stringify(
        Object.keys(world.contractIndex)
      )}`
    );
  }

  return <T>(<unknown>contract);
}

export async function getTimelock(world: World): Promise<Timelock> {
  return getWorldContract(world, [['Contracts', 'Timelock']]);
}

export async function getUnitroller(world: World): Promise<Niutroller> {
  return getWorldContract(world, [['Contracts', 'Unitroller']]);
}

export async function getMaximillion(world: World): Promise<Niutroller> {
  return getWorldContract(world, [['Contracts', 'Maximillion']]);
}

export async function getNiutroller(world: World): Promise<Niutroller> {
  return getWorldContract(world, [['Contracts', 'Niutroller']]);
}

export async function getNiutrollerImpl(world: World, comptrollerImplArg: Event): Promise<NiutrollerImpl> {
  return getWorldContract(world, [['Niutroller', mustString(comptrollerImplArg), 'address']]);
}

export function getNTokenAddress(world: World, nTokenArg: string): string {
  return getContractDataString(world, [['nTokens', nTokenArg, 'address']]);
}

export function getNTokenDelegateAddress(world: World, nTokenDelegateArg: string): string {
  return getContractDataString(world, [['NTokenDelegate', nTokenDelegateArg, 'address']]);
}

export function getErc20Address(world: World, erc20Arg: string): string {
  return getContractDataString(world, [['Tokens', erc20Arg, 'address']]);
}

export function getGovernorAddress(world: World, governorArg: string): string {
  return getContractDataString(world, [['Contracts', governorArg]]);
}

export function getGovernorBravo(world: World, governoBravoArg: string): Promise<GovernorBravo> {
  return getWorldContract(world, [['Contracts', 'GovernorBravo']])
}

export async function getPriceOracleProxy(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracleProxy']]);
}

export async function getAnchoredView(world: World): Promise<AnchoredView> {
  return getWorldContract(world, [['Contracts', 'AnchoredView']]);
}

export async function getPriceOracle(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracle']]);
}

export async function getNiu(
  world: World,
  compArg: Event
): Promise<Niu> {
  return getWorldContract(world, [['COMP', 'address']]);
}

export async function getNiuData(
  world: World,
  compArg: string
): Promise<[Niu, string, Map<string, string>]> {
  let contract = await getNiu(world, <Event>(<any>compArg));
  let data = getContractData(world, [['Niu', compArg]]);

  return [contract, compArg, <Map<string, string>>(<any>data)];
}

export async function getGovernorData(
  world: World,
  governorArg: string
): Promise<[Governor, string, Map<string, string>]> {
  let contract = getWorldContract<Governor>(world, [['Governor', governorArg, 'address']]);
  let data = getContractData(world, [['Governor', governorArg]]);

  return [contract, governorArg, <Map<string, string>>(<any>data)];
}

export async function getInterestRateModel(
  world: World,
  interestRateModelArg: Event
): Promise<InterestRateModel> {
  return getWorldContract(world, [['InterestRateModel', mustString(interestRateModelArg), 'address']]);
}

export async function getInterestRateModelData(
  world: World,
  interestRateModelArg: string
): Promise<[InterestRateModel, string, Map<string, string>]> {
  let contract = await getInterestRateModel(world, <Event>(<any>interestRateModelArg));
  let data = getContractData(world, [['InterestRateModel', interestRateModelArg]]);

  return [contract, interestRateModelArg, <Map<string, string>>(<any>data)];
}

export async function getErc20Data(
  world: World,
  erc20Arg: string
): Promise<[Erc20, string, Map<string, string>]> {
  let contract = getWorldContract<Erc20>(world, [['Tokens', erc20Arg, 'address']]);
  let data = getContractData(world, [['Tokens', erc20Arg]]);

  return [contract, erc20Arg, <Map<string, string>>(<any>data)];
}

export async function getNTokenData(
  world: World,
  nTokenArg: string
): Promise<[NToken, string, Map<string, string>]> {
  let contract = getWorldContract<NToken>(world, [['nTokens', nTokenArg, 'address']]);
  let data = getContractData(world, [['NTokens', nTokenArg]]);

  return [contract, nTokenArg, <Map<string, string>>(<any>data)];
}

export async function getNTokenDelegateData(
  world: World,
  nTokenDelegateArg: string
): Promise<[NErc20Delegate, string, Map<string, string>]> {
  let contract = getWorldContract<NErc20Delegate>(world, [['NTokenDelegate', nTokenDelegateArg, 'address']]);
  let data = getContractData(world, [['NTokenDelegate', nTokenDelegateArg]]);

  return [contract, nTokenDelegateArg, <Map<string, string>>(<any>data)];
}

export async function getNiutrollerImplData(
  world: World,
  comptrollerImplArg: string
): Promise<[NiutrollerImpl, string, Map<string, string>]> {
  let contract = await getNiutrollerImpl(world, <Event>(<any>comptrollerImplArg));
  let data = getContractData(world, [['Niutroller', comptrollerImplArg]]);

  return [contract, comptrollerImplArg, <Map<string, string>>(<any>data)];
}

export function getAddress(world: World, addressArg: string): string {
  if (addressArg.toLowerCase() === 'zero') {
    return '0x0000000000000000000000000000000000000000';
  }

  if (addressArg.startsWith('0x')) {
    return addressArg;
  }

  let alias = Object.entries(world.settings.aliases).find(
    ([alias, addr]) => alias.toLowerCase() === addressArg.toLowerCase()
  );
  if (alias) {
    return alias[1];
  }

  let account = world.accounts.find(account => account.name.toLowerCase() === addressArg.toLowerCase());
  if (account) {
    return account.address;
  }

  return getContractDataString(world, [
    ['Contracts', addressArg],
    ['nTokens', addressArg, 'address'],
    ['NTokenDelegate', addressArg, 'address'],
    ['Tokens', addressArg, 'address'],
    ['Niutroller', addressArg, 'address']
  ]);
}

export function getContractByName(world: World, name: string): Contract {
  return getWorldContract(world, [['Contracts', name]]);
}
