import { Event } from '../Event';
import { addAction, World } from '../World';
import { NiutrollerImpl } from '../Contract/NiutrollerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const NiutrollerG1Contract = getContract('NiutrollerG1');
const NiutrollerScenarioG1Contract = getTestContract('NiutrollerScenarioG1');

const NiutrollerG2Contract = getContract('NiutrollerG2');
const NiutrollerScenarioG2Contract = getContract('NiutrollerScenarioG2');

const NiutrollerG3Contract = getContract('NiutrollerG3');
const NiutrollerScenarioG3Contract = getContract('NiutrollerScenarioG3');

const NiutrollerG4Contract = getContract('NiutrollerG4');
const NiutrollerScenarioG4Contract = getContract('NiutrollerScenarioG4');

const NiutrollerG5Contract = getContract('NiutrollerG5');
const NiutrollerScenarioG5Contract = getContract('NiutrollerScenarioG5');

const NiutrollerG6Contract = getContract('NiutrollerG6');
const NiutrollerScenarioG6Contract = getContract('NiutrollerScenarioG6');

const NiutrollerScenarioContract = getTestContract('NiutrollerScenario');
const NiutrollerContract = getContract('Niutroller');

const NiutrollerBorkedContract = getTestContract('NiutrollerBorked');

export interface NiutrollerImplData {
  invokation: Invokation<NiutrollerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildNiutrollerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; comptrollerImpl: NiutrollerImpl; comptrollerImplData: NiutrollerImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG1

        * "ScenarioG1 name:<String>" - The Niutroller Scenario for local testing (G1)
          * E.g. "NiutrollerImpl Deploy ScenarioG1 MyScen"
      `,
      'ScenarioG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG1Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG1',
        description: 'ScenarioG1 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG2

        * "ScenarioG2 name:<String>" - The Niutroller Scenario for local testing (G2)
          * E.g. "NiutrollerImpl Deploy ScenarioG2 MyScen"
      `,
      'ScenarioG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG2Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG2Contract',
        description: 'ScenarioG2 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG3

        * "ScenarioG3 name:<String>" - The Niutroller Scenario for local testing (G3)
          * E.g. "NiutrollerImpl Deploy ScenarioG3 MyScen"
      `,
      'ScenarioG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG3Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG3Contract',
        description: 'ScenarioG3 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG4
        * "ScenarioG4 name:<String>" - The Niutroller Scenario for local testing (G4)
          * E.g. "NiutrollerImpl Deploy ScenarioG4 MyScen"
      `,
      'ScenarioG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG4Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG4Contract',
        description: 'ScenarioG4 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG5
        * "ScenarioG5 name:<String>" - The Niutroller Scenario for local testing (G5)
          * E.g. "NiutrollerImpl Deploy ScenarioG5 MyScen"
      `,
      'ScenarioG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG5Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG5Contract',
        description: 'ScenarioG5 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### ScenarioG6
        * "ScenarioG6 name:<String>" - The Niutroller Scenario for local testing (G6)
          * E.g. "NiutrollerImpl Deploy ScenarioG6 MyScen"
      `,
      'ScenarioG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioG6Contract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenarioG6Contract',
        description: 'ScenarioG6 Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The Niutroller Scenario for local testing
          * E.g. "NiutrollerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerScenarioContract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerScenario',
        description: 'Scenario Niutroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG1

        * "StandardG1 name:<String>" - The standard generation 1 Niutroller contract
          * E.g. "Niutroller Deploy StandardG1 MyStandard"
      `,
      'StandardG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG1Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG1',
          description: 'StandardG1 Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG2

        * "StandardG2 name:<String>" - The standard generation 2 Niutroller contract
          * E.g. "Niutroller Deploy StandardG2 MyStandard"
      `,
      'StandardG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG2Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG2',
          description: 'StandardG2 Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG3

        * "StandardG3 name:<String>" - The standard generation 3 Niutroller contract
          * E.g. "Niutroller Deploy StandardG3 MyStandard"
      `,
      'StandardG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG3Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG3',
          description: 'StandardG3 Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG4

        * "StandardG4 name:<String>" - The standard generation 4 Niutroller contract
          * E.g. "Niutroller Deploy StandardG4 MyStandard"
      `,
      'StandardG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG4Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG4',
          description: 'StandardG4 Niutroller Impl'
        };
      }
    ),
  
    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG5
        * "StandardG5 name:<String>" - The standard generation 5 Niutroller contract
          * E.g. "Niutroller Deploy StandardG5 MyStandard"
      `,
      'StandardG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG5Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG5',
          description: 'StandardG5 Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### StandardG6
        * "StandardG6 name:<String>" - The standard generation 6 Niutroller contract
          * E.g. "Niutroller Deploy StandardG6 MyStandard"
      `,
      'StandardG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerG6Contract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'NiutrollerG6',
          description: 'StandardG6 Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard Niutroller contract
          * E.g. "Niutroller Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await NiutrollerContract.deploy<NiutrollerImpl>(world, from, []),
          name: name.val,
          contract: 'Niutroller',
          description: 'Standard Niutroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked Niutroller for testing
          * E.g. "NiutrollerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await NiutrollerBorkedContract.deploy<NiutrollerImpl>(world, from, []),
        name: name.val,
        contract: 'NiutrollerBorked',
        description: 'Borked Niutroller Impl'
      })
    ),
    new Fetcher<{ name: StringV }, NiutrollerImplData>(
      `
        #### Default

        * "name:<String>" - The standard Niutroller contract
          * E.g. "NiutrollerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await NiutrollerScenarioContract.deploy<NiutrollerImpl>(world, from, []),
            name: name.val,
            contract: 'NiutrollerScenario',
            description: 'Scenario Niutroller Impl'
          };
        } else {
          return {
            invokation: await NiutrollerContract.deploy<NiutrollerImpl>(world, from, []),
            name: name.val,
            contract: 'Niutroller',
            description: 'Standard Niutroller Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let comptrollerImplData = await getFetcherValue<any, NiutrollerImplData>(
    'DeployNiutrollerImpl',
    fetchers,
    world,
    event
  );
  let invokation = comptrollerImplData.invokation;
  delete comptrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const comptrollerImpl = invokation.value!;

  world = await storeAndSaveContract(world, comptrollerImpl, comptrollerImplData.name, invokation, [
    {
      index: ['Niutroller', comptrollerImplData.name],
      data: {
        address: comptrollerImpl._address,
        contract: comptrollerImplData.contract,
        description: comptrollerImplData.description
      }
    }
  ]);

  return { world, comptrollerImpl, comptrollerImplData };
}
