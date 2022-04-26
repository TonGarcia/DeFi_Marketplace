const {
  address,
  encodeParameters,
  etherExp,
} = require('../Utils/Ethereum');
const {
  makeNiutroller,
  makeNToken,
} = require('../Utils/Niural');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('NiuralLens', () => {
  let niuralLens;
  let acct;

  beforeEach(async () => {
    niuralLens = await deploy('NiuralLens');
    acct = accounts[0];
  });

  describe('nTokenMetadata', () => {
    it('is correct for a cErc20', async () => {
      let cErc20 = await makeNToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [cErc20._address]))
      ).toEqual(
        {
          nToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          compSupplySpeed: "0",
          compBorrowSpeed: "0",
          borrowCap: "0",
        }
      );
    });

    it('is correct for cEth', async () => {
      let cEth = await makeNToken({kind: 'cether'});
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [cEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        nToken: cEth._address,
        nTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
        compSupplySpeed: "0",
        compBorrowSpeed: "0",
        borrowCap: "0",
      });
    });
    it('is correct for cErc20 with set comp speeds', async () => {
      let comptroller = await makeNiutroller();
      let cErc20 = await makeNToken({comptroller, supportMarket: true});
      await send(comptroller, '_setNiuSpeeds', [[cErc20._address], [etherExp(0.25)], [etherExp(0.75)]]);
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [cErc20._address]))
      ).toEqual(
        {
          nToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          compSupplySpeed: "250000000000000000",
          compBorrowSpeed: "750000000000000000",
          borrowCap: "0",
        }
      );
    });
  });

  describe('nTokenMetadataAll', () => {
    it('is correct for a cErc20 and nEther', async () => {
      let cErc20 = await makeNToken();
      let cEth = await makeNToken({kind: 'cether'});
      expect(
        (await call(niuralLens, 'nTokenMetadataAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          nToken: cErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(cErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          compSupplySpeed: "0",
          compBorrowSpeed: "0",
          borrowCap: "0",
        },
        {
          borrowRatePerBlock: "0",
          nToken: cEth._address,
          nTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
          compSupplySpeed: "0",
          compBorrowSpeed: "0",
          borrowCap: "0",
        }
      ]);
    });
  });

  describe('nTokenBalances', () => {
    it('is correct for cERC20', async () => {
      let cErc20 = await makeNToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenBalances', [cErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for cETH', async () => {
      let cEth = await makeNToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(niuralLens, 'nTokenBalances', [cEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('nTokenBalancesAll', () => {
    it('is correct for cEth and cErc20', async () => {
      let cErc20 = await makeNToken();
      let cEth = await makeNToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      
      expect(
        (await call(niuralLens, 'nTokenBalancesAll', [[cErc20._address, cEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: cErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('nTokenUnderlyingPrice', () => {
    it('gets correct price for cErc20', async () => {
      let cErc20 = await makeNToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenUnderlyingPrice', [cErc20._address]))
      ).toEqual(
        {
          nToken: cErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for cEth', async () => {
      let cEth = await makeNToken({kind: 'cether'});
      expect(
        cullTuple(await call(niuralLens, 'nTokenUnderlyingPrice', [cEth._address]))
      ).toEqual(
        {
          nToken: cEth._address,
          underlyingPrice: "0",
        }
      );
    });
  });

  describe('nTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let cErc20 = await makeNToken();
      let cEth = await makeNToken({kind: 'cether'});
      expect(
        (await call(niuralLens, 'nTokenUnderlyingPriceAll', [[cErc20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          nToken: cErc20._address,
          underlyingPrice: "0",
        },
        {
          nToken: cEth._address,
          underlyingPrice: "0",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let comptroller = await makeNiutroller();

      expect(
        cullTuple(await call(niuralLens, 'getAccountLimits', [comptroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let comp, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      comp = await deploy('Niu', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), comp._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(comp, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(niuralLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(niuralLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + 17281).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + 1).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('comp', () => {
    let comp, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      comp = await deploy('Niu', [acct]);
    });

    describe('getNiuBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(niuralLens, 'getNiuBalanceMetadata', [comp._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getNiuBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let comptroller = await makeNiutroller();
        await send(comptroller, 'setNiuAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(niuralLens, 'getNiuBalanceMetadataExt', [comp._address, comptroller._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getNiuVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(niuralLens, 'getNiuVotes', [comp._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(niuralLens, 'getNiuVotes', [comp._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert Niu::getPriorVotes: not yet determined')
      });
    });
  });
});
