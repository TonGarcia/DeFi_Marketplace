import { Event } from '../Event';
import { World } from '../World';
import { CErc20Delegate, CErc20DelegateScenario } from '../Contract/CErc20Delegate';
import { NToken } from '../Contract/NToken';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const CDaiDelegateContract = getContract('CDaiDelegate');
const CDaiDelegateScenarioContract = getTestContract('CDaiDelegateScenario');
const CErc20DelegateContract = getContract('CErc20Delegate');
const CErc20DelegateScenarioContract = getTestContract('CErc20DelegateScenario');


export interface NTokenDelegateData {
  invokation: Invokation<CErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildNTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; NTokenDelegate: CErc20Delegate; delegateData: NTokenDelegateData }> {
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
          invokation: await CDaiDelegateContract.deploy<CErc20Delegate>(world, from, []),
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
          invokation: await CDaiDelegateScenarioContract.deploy<CErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'CDaiDelegateScenario',
          description: 'Scenario CDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### CErc20Delegate

        * "CErc20Delegate name:<String>"
          * E.g. "NTokenDelegate Deploy CErc20Delegate cDAIDelegate"
      `,
      'CErc20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await CErc20DelegateContract.deploy<CErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'CErc20Delegate',
          description: 'Standard CErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, NTokenDelegateData>(
      `
        #### CErc20DelegateScenario

        * "CErc20DelegateScenario name:<String>" - A CErc20Delegate Scenario for local testing
          * E.g. "NTokenDelegate Deploy CErc20DelegateScenario cDAIDelegate"
      `,
      'CErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await CErc20DelegateScenarioContract.deploy<CErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'CErc20DelegateScenario',
          description: 'Scenario CErc20 Delegate'
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

  const NTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    NTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['NTokenDelegate', delegateData.name],
        data: {
          address: NTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, NTokenDelegate, delegateData };
}
