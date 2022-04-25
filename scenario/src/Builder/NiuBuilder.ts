import { Event } from '../Event';
import { World, addAction } from '../World';
import { Niu, NiuScenario } from '../Contract/Niu';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const NiuContract = getContract('Niu');
const NiuScenarioContract = getContract('NiuScenario');

export interface TokenData {
  invokation: Invokation<Niu>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildNiu(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; comp: Niu; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "Niu Deploy Scenario account:<Address>" - Deploys Scenario Niu Token
        * E.g. "Niu Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await NiuScenarioContract.deploy<NiuScenario>(world, from, [account.val]),
          contract: 'NiuScenario',
          symbol: 'COMP',
          name: 'Niural Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Niu

      * "Niu Deploy account:<Address>" - Deploys Niu Token
        * E.g. "Niu Deploy Geoff"
    `,
      'Niu',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await NiuScenarioContract.deploy<NiuScenario>(world, from, [account.val]),
            contract: 'NiuScenario',
            symbol: 'COMP',
            name: 'Niural Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await NiuContract.deploy<Niu>(world, from, [account.val]),
            contract: 'Niu',
            symbol: 'COMP',
            name: 'Niural Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployNiu", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const comp = invokation.value!;
  tokenData.address = comp._address;

  world = await storeAndSaveContract(
    world,
    comp,
    'Niu',
    invokation,
    [
      { index: ['Niu'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, comp, tokenData };
}
