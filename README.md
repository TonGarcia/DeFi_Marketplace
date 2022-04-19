# Niural DeFi Marketplace
Marketplace of DeFi giving traditional financial access to the descentralized market.

/TODO CircleCI

[![CircleCI](https://circleci.com/gh/niural-finance/niural-protocol.svg?style=svg&circle-token=)](https://circleci.com/gh/niural-finance/niural-protocol) [![codecov](https://codecov.io/gh/niural-finance/niural-protocol/branch/master/graph/badge.svg?token=q4UvsvVzOX)](https://codecov.io/gh/niural-finance/niural-protocol)


Compiling
=============

Single file flatten working and the main file is the: NiutrollerGN.sol (N is the version number)
To launch it is necessary to add the initial address account which gonna hold all the supply balance

# TODO
Change "getNiuAddress" adding admin check to populate "setNiuAddress" or try to figure out how to set it address as fixed on the blockchain to launch it together

Niural Protocol
=================

The Niural Protocol is a crosschain smart contract (Ethereum, Binance Smart Chain, Solana & Terra) for supplying or borrowing assets. Through the nToken contracts, accounts on the blockchain *supply* capital (Ether or ERC-20 tokens and others cryptos and tokens on others blockchains) to receive nTokens or *borrow* assets from the protocol (holding other assets as collateral). The Niural nToken contracts track these balances and algorithmically set interest rates for borrowers.

Before getting started with this repo, please read:

* The [Niural Whitepaper](https://niural.finance/documents/Niural.Whitepaper.pdf), describing how Niural works
* The [Niural Protocol Specification](https://github.com/niural-finance/niural-protocol/tree/master/docs/NiuralProtocol.pdf), explaining in plain English how the protocol operates

For questions about interacting with Niural, please visit [our Discord server](https://niural.finance/discord).

For security concerns, please visit [https://niural.finance/security](https://niural.finance/security) or email [security@niural.finance](mailto:security@niural.finance).

Contributing
============

/TODO Contributing
Contributing to the Niural protocol is a bit different than most open-source projects -- check out the [community guide on Contributing](https://www.comp.xyz/t/contributing-to-niural-protocol/48).

Contracts
=========

We detail a few of the core contracts in the Niural protocol.

<dl>
  <dt>NToken, NErc20 and NEther</dt>
  <dd>The Niural nTokens are self-contained borrowing and lending contracts. NToken contains the core logic and NErc20 and NEther add public interfaces for Erc20 tokens and ether, respectively. Each NToken is assigned an interest rate and risk model (see InterestRateModel and Niutroller sections), and allows accounts to *mint* (supply capital), *redeem* (withdraw capital), *borrow* and *repay a borrow*. Each NToken is an ERC-20 compliant token where balances represent ownership of the market.</dd>
</dl>

<dl>
  <dt>Niutroller</dt>
  <dd>The risk model contract, which validates permissible user actions and disallows actions if they do not fit certain risk parameters. For instance, the Niutroller enforces that each borrowing user must maintain a sufficient collateral balance across all nTokens.</dd>
  <ul>
  <em>Updating the Niutroller</em>
  <li>Follow the existing naming schema (ControllerGX)</li>
  <li>Update the scenario runner in scenario/src/Builder/NiutrollerImplBuilder.ts</li>
  <li>Create unit tests and fork simulations as necessary</li>
  <li>Call <code>npx saddle deploy Niutroller -n mainnet</code> to deploy to mainnet and generate new ABI</li>
  <ul>
    <li>The ABI can also be generated by deploying to mainnet in a fork simulation</li>
  </ul>
  <li>Call <code>node script/niutroller-abi</code> to merge the new Niutroller ABI with the Unitroller ABI</li>
  <li>Ensure that commit contains new generated Niutroller ABI</li>
  </ul>
</dl>

<dl>
  <dt>Comp</dt>
  <dd>The Niural Governance Token (NGT). Holders of this token have the ability to govern the protocol via the governor contract.</dd>
</dl>

<dl>
  <dt>Governor Alpha</dt>
  <dd>The administrator of the Niural timelock contract. Holders of Niural token may create and vote on proposals which will be queued into the Niural timelock and then have effects on Niural nToken and Niutroller contracts. This contract may be replaced in the future with a beta version.</dd>
</dl>

<dl>
  <dt>InterestRateModelInterface</dt>
  <dd>Contracts which define interest rate models. These models algorithmically determine interest rates based on the current utilization of a given market (that is, how much of the supplied assets are liquid versus borrowed).</dd>
</dl>

<dl>
  <dt>Careful Math</dt>
  <dd>Library for safe math operations.</dd>
</dl>

<dl>
  <dt>ErrorReporter</dt>
  <dd>Library for tracking error codes and failure conditions.</dd>
</dl>

<dl>
  <dt>Exponential</dt>
  <dd>Library for handling fixed-point decimal numbers.</dd>
</dl>

<dl>
  <dt>SafeToken</dt>
  <dd>Library for safely handling Erc20 interaction.</dd>
</dl>

<dl>
  <dt>InterestRateModel</dt>
  <dd>Initial interest rate model, as defined in the Whitepaper. This contract accepts a base rate and slope parameter in its constructor.</dd>
</dl>

Installation
------------
To run niural, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/niural-finance/niural-protocol
    cd niural-protocol
    yarn install --lock-file # or `npm install`

REPL
----

The Niural Protocol has a simple scenario evaluation tool to test and evaluate scenarios which could occur on the blockchain. This is primarily used for constructing high-level integration tests. The tool also has a REPL (a top level shell for testing) to interact with local the Niural Protocol (similar to `truffle console`).

    yarn repl -n development
    yarn repl -n rinkeby

    > Read NToken nBAT Address
    Command: Read NToken nBAT Address
    AddressV<val=0xAD53863b864AE703D31b819d29c14cDA93D7c6a6>

You can read more about the scenario runner in the [Scenario Docs](https://github.com/niural-finance/niural-protocol/tree/master/scenario/SCENARIO.md) on steps for using the repl.

Testing
-------
Jest contract tests are defined under the [tests directory](https://github.com/niural-finance/niural-protocol/tree/master/tests). To run the tests run:

    yarn test

Integration Specs
-----------------

There are additional tests under the [spec/scenario](https://github.com/niural-finance/niural-protocol/tree/master/spec/scenario) folder. These are high-level integration tests based on the scenario runner depicted above. The aim of these tests is to be highly literate and have high coverage in the interaction of contracts.

Formal Verification Specs
-------------------------

The Niural Protocol has a number of formal verification specifications, powered by [Certora](https://www.certora.com/). You can find details in the [spec/formal](https://github.com/niural-finance/niural-protocol/tree/master/spec/formal) folder. The Certora Verification Language (CVL) files included are specifications, which when with the Certora CLI tool, produce formal proofs (or counter-examples) that the code of a given contract exactly matches that specification.

Code Coverage
-------------
To run code coverage, run:

    yarn coverage

Linting
-------
To lint the code, run:

    yarn lint

Docker
------

To run in docker:

    # Build the docker image
    docker build -t niural-protocol .

    # Run a shell to the built image
    docker run -it niural-protocol /bin/sh

From within a docker shell, you can interact locally with the protocol via ganache and truffle:

```bash
    /niural-protocol > yarn console -n goerli
    Using network goerli https://goerli-eth.niural.finance
    Saddle console on network goerli https://goerli-eth.niural.finance
    Deployed goerli contracts
      comptroller: 0x627EA49279FD0dE89186A58b8758aD02B6Be2867
      comp: 0xfa5E1B628EFB17C024ca76f65B45Faf6B3128CA5
      governorAlpha: 0x8C3969Dd514B559D78135e9C210F2F773Feadf21
      maximillion: 0x73d3F01b8aC5063f4601C7C45DA5Fdf1b5240C92
      priceOracle: 0x9A536Ed5C97686988F93C9f7C2A390bF3B59c0ec
      priceOracleProxy: 0xd0c84453b3945cd7e84BF7fc53BfFd6718913B71
      timelock: 0x25e46957363e16C4e2D5F2854b062475F9f8d287
      unitroller: 0x627EA49279FD0dE89186A58b8758aD02B6Be2867

    > await comp.methods.totalSupply().call()
    '10000000000000000000000000'
```

Console
-------

After you deploy, as above, you can run a truffle console with the following command:

    yarn console -n goerli

This command will start a saddle console conencted to Goerli testnet (see [Saddle README](https://github.com/niural-finance/saddle#cli)):

```javascript
    Using network goerli https://goerli.infura.io/v3/e1a5d4d2c06a4e81945fca56d0d5d8ea
    Saddle console on network goerli https://goerli.infura.io/v3/e1a5d4d2c06a4e81945fca56d0d5d8ea
    Deployed goerli contracts
      comptroller: 0x627EA49279FD0dE89186A58b8758aD02B6Be2867
      comp: 0xfa5E1B628EFB17C024ca76f65B45Faf6B3128CA5
      governorAlpha: 0x8C3969Dd514B559D78135e9C210F2F773Feadf21
      maximillion: 0x73d3F01b8aC5063f4601C7C45DA5Fdf1b5240C92
      priceOracle: 0x9A536Ed5C97686988F93C9f7C2A390bF3B59c0ec
      priceOracleProxy: 0xd0c84453b3945cd7e84BF7fc53BfFd6718913B71
      timelock: 0x25e46957363e16C4e2D5F2854b062475F9f8d287
      unitroller: 0x627EA49279FD0dE89186A58b8758aD02B6Be2867
    > await comp.methods.totalSupply().call()
    '10000000000000000000000000'
```

Deploying a NToken from Source
------------------------------

Note: you will need to set `~/.ethereum/<network>` with your private key or assign your private key to the environment variable `ACCOUNT`.

Note: for all sections including Etherscan verification, you must set the `ETHERSCAN_API_KEY` to a valid API Key from [Etherscan](https://etherscan.io/apis).

To deploy a new nToken, you can run the `token:deploy`. command, as follows. If you set `VERIFY=true`, the script will verify the token on Etherscan as well. The JSON here is the token config JSON, which should be specific to the token you wish to list.

```bash
npx saddle -n rinkeby script token:deploy '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "comptroller": "$Niutroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Niural Kyber Network Crystal",
  "symbol": "cKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
```

If you only want to verify an existing token an Etherscan, make sure `ETHERSCAN_API_KEY` is set and run `token:verify` with the first argument as the token address and the second as the token config JSON:

```bash
npx saddle -n rinkeby script token:verify 0x19B674715cD20626415C738400FDd0d32D6809B6 '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "comptroller": "$Niutroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Niural Kyber Network Crystal",
  "symbol": "cKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
```

Finally, to see if a given deployment matches this version of the Niural Protocol, you can run `token:match` with a token address and token config:

```bash
npx saddle -n rinkeby script token:match 0x19B674715cD20626415C738400FDd0d32D6809B6 '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "comptroller": "$Niutroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Niural Kyber Network Crystal",
  "symbol": "cKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
```

## Deploying a NToken from Docker Build
---------------------------------------

To deploy a specific version of the Niural Protocol, you can use the `token:deploy` script through Docker:

```bash
docker run --env ETHERSCAN_API_KEY --env VERIFY=true --env ACCOUNT=0x$(cat ~/.ethereum/rinkeby) niuralfinance/niural-protocol:latest npx saddle -n rinkeby script token:deploy '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "comptroller": "$Niutroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Niural Kyber Network Crystal",
  "symbol": "cKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
```

To match a deployed contract against a given version of the Niural Protocol, you can run `token:match` through Docker, passing a token address and config:

```bash
docker run --env ACCOUNT=0x$(cat ~/.ethereum/rinkeby) niuralfinance/niural-protocol:latest npx saddle -n rinkeby script token:match 0xF1BAd36CB247C82Cb4e9C2874374492Afb50d565 '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "comptroller": "$Niutroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Niural Kyber Network Crystal",
  "symbol": "cKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
```

Discussion
----------

For any concerns with the protocol, open an issue or visit us on [Discord](https://niural.finance/discord) to discuss.

For security concerns, please email [security@niural.finance](mailto:security@niural.finance).

*This marketplace is based on the Niural concept.
