import { Event } from '../Event';
import { World } from '../World';
import { Niu } from '../Contract/Niu';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getNiu } from '../ContractLookup';

export function compFetchers() {
  return [
    new Fetcher<{ comp: Niu }, AddressV>(`
        #### Address

        * "<Niu> Address" - Returns the address of Niu token
          * E.g. "Niu Address"
      `,
      "Address",
      [
        new Arg("comp", getNiu, { implicit: true })
      ],
      async (world, { comp }) => new AddressV(comp._address)
    ),

    new Fetcher<{ comp: Niu }, StringV>(`
        #### Name

        * "<Niu> Name" - Returns the name of the Niu token
          * E.g. "Niu Name"
      `,
      "Name",
      [
        new Arg("comp", getNiu, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.name().call())
    ),

    new Fetcher<{ comp: Niu }, StringV>(`
        #### Symbol

        * "<Niu> Symbol" - Returns the symbol of the Niu token
          * E.g. "Niu Symbol"
      `,
      "Symbol",
      [
        new Arg("comp", getNiu, { implicit: true })
      ],
      async (world, { comp }) => new StringV(await comp.methods.symbol().call())
    ),

    new Fetcher<{ comp: Niu }, NumberV>(`
        #### Decimals

        * "<Niu> Decimals" - Returns the number of decimals of the Niu token
          * E.g. "Niu Decimals"
      `,
      "Decimals",
      [
        new Arg("comp", getNiu, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.decimals().call())
    ),

    new Fetcher<{ comp: Niu }, NumberV>(`
        #### TotalSupply

        * "Niu TotalSupply" - Returns Niu token's total supply
      `,
      "TotalSupply",
      [
        new Arg("comp", getNiu, { implicit: true })
      ],
      async (world, { comp }) => new NumberV(await comp.methods.totalSupply().call())
    ),

    new Fetcher<{ comp: Niu, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "Niu TokenBalance <Address>" - Returns the Niu token balance of a given address
          * E.g. "Niu TokenBalance Geoff" - Returns Geoff's Niu balance
      `,
      "TokenBalance",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { comp, address }) => new NumberV(await comp.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ comp: Niu, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "Niu Allowance owner:<Address> spender:<Address>" - Returns the Niu allowance from owner to spender
          * E.g. "Niu Allowance Geoff Torrey" - Returns the Niu allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { comp, owner, spender }) => new NumberV(await comp.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ comp: Niu, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "Niu GetCurrentVotes account:<Address>" - Returns the current Niu votes balance for an account
          * E.g. "Niu GetCurrentVotes Geoff" - Returns the current Niu vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ comp: Niu, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "Niu GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current Niu votes balance at given block
          * E.g. "Niu GetPriorVotes Geoff 5" - Returns the Niu vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { comp, account, blockNumber }) => new NumberV(await comp.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ comp: Niu, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "Niu GetCurrentVotesBlock account:<Address>" - Returns the current Niu votes checkpoint block for an account
          * E.g. "Niu GetCurrentVotesBlock Geoff" - Returns the current Niu votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => {
        const numCheckpoints = Number(await comp.methods.numCheckpoints(account.val).call());
        const checkpoint = await comp.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ comp: Niu, account: AddressV }, NumberV>(`
        #### VotesLength

        * "Niu VotesLength account:<Address>" - Returns the Niu vote checkpoint array length
          * E.g. "Niu VotesLength Geoff" - Returns the Niu vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => new NumberV(await comp.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ comp: Niu, account: AddressV }, ListV>(`
        #### AllVotes

        * "Niu AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "Niu AllVotes Geoff" - Returns the Niu vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("comp", getNiu, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { comp, account }) => {
        const numCheckpoints = Number(await comp.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await comp.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getNiuValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Niu", compFetchers(), world, event);
}
