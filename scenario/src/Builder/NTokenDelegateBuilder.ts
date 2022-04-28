import { Event } from '../Event';
import { World } from '../World';
import { NErc20Delegate, NErc20DelegateScenario } from '../Contract/NErc20Delegate';
import { NToken } from '../Contract/NToken';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const CDaiDelegateContract = getContract('CDaiDelegate');
const CDaiDelegateScenarioContract = getTestContract('CDaiDelegateScenario');
const NErc20DelegateContract = getContract('NErc20Delegate');
const NErc20DelegateScenarioContract = getTestContract('NErc20DelegateScenario');


export interface NTokenDelegateData {
  invokation: Invokation<NErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildNTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; nTokenDelegate: NErc20Delegate; delegateData: NTokenDelegateData }> {
  const fetchers = [
    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### CDaiDelegate

        * "CDaiDelegate name:<String>"
          * E.g. "NTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      'CDaiDelegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await CDaiDelegateContract.deploy<NErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'CDaiDelegate',
          description: 'Standard CDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### CDaiDelegateScenario

        * "CDaiDelegateScenario name:<String>" - A CDaiDelegate Scenario for local testing
          * E.g. "NTokenDelegate Deploy CDaiDelegateScenario cDAIDelegate"
      `,
      'CDaiDelegateScenario',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await CDaiDelegateScenarioContract.deploy<NErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'CDaiDelegateScenario',
          description: 'Scenario CDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### NErc20Delegate

        * "NErc20Delegate name:<String>"
          * E.g. "NTokenDelegate Deploy NErc20Delegate cDAIDelegate"
      `,
      'NErc20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await NErc20DelegateContract.deploy<NErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'NErc20Delegate',
          description: 'Standard NErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### NErc20DelegateScenario

        * "NErc20DelegateScenario name:<String>" - A NErc20Delegate Scenario for local testing
          * E.g. "NTokenDelegate Deploy NErc20DelegateScenario cDAIDelegate"
      `,
      'NErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await NErc20DelegateScenarioContract.deploy<NErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'NErc20DelegateScenario',
          description: 'Scenario NErc20 Delegate'
        };
      }
    )
  ];

  let delegateData = await getFetcherValue<any, NTokenDelegateData>("DeployNToken", fetchers, world, params);
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const nTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    nTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['NTokenDelegate', delegateData.name],
        data: {
          address: nTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, nTokenDelegate, delegateData };
}
