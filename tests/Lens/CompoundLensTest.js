const {
  address,
  encodeParameters,
  etherExp,
} = require('../Utils/Ethereum');
const {
  makeNiutroller,
  makeCToken,
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
    it('is correct for a nErc20', async () => {
      let nErc20 = await makeCToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [nErc20._address]))
      ).toEqual(
        {
          nToken: nErc20._address,
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
          underlyingAssetAddress: await call(nErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          niuSupplySpeed: "0",
          niuBorrowSpeed: "0",
          borrowCap: "0",
        }
      );
    });

    it('is correct for nEth', async () => {
      let nEth = await makeCToken({kind: 'cether'});
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [nEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        nToken: nEth._address,
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
        niuSupplySpeed: "0",
        niuBorrowSpeed: "0",
        borrowCap: "0",
      });
    });
    it('is correct for nErc20 with set niu speeds', async () => {
      let niutroller = await makeNiutroller();
      let nErc20 = await makeCToken({niutroller, supportMarket: true});
      await send(niutroller, '_setNiuSpeeds', [[nErc20._address], [etherExp(0.25)], [etherExp(0.75)]]);
      expect(
        cullTuple(await call(niuralLens, 'nTokenMetadata', [nErc20._address]))
      ).toEqual(
        {
          nToken: nErc20._address,
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
          underlyingAssetAddress: await call(nErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          niuSupplySpeed: "250000000000000000",
          niuBorrowSpeed: "750000000000000000",
          borrowCap: "0",
        }
      );
    });
  });

  describe('nTokenMetadataAll', () => {
    it('is correct for a nErc20 and nEther', async () => {
      let nErc20 = await makeCToken();
      let nEth = await makeCToken({kind: 'cether'});
      expect(
        (await call(niuralLens, 'nTokenMetadataAll', [[nErc20._address, nEth._address]])).map(cullTuple)
      ).toEqual([
        {
          nToken: nErc20._address,
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
          underlyingAssetAddress: await call(nErc20, 'underlying', []),
          nTokenDecimals: "8",
          underlyingDecimals: "18",
          niuSupplySpeed: "0",
          niuBorrowSpeed: "0",
          borrowCap: "0",
        },
        {
          borrowRatePerBlock: "0",
          nToken: nEth._address,
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
          niuSupplySpeed: "0",
          niuBorrowSpeed: "0",
          borrowCap: "0",
        }
      ]);
    });
  });

  describe('nTokenBalances', () => {
    it('is correct for nERC20', async () => {
      let nErc20 = await makeCToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenBalances', [nErc20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: nErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for cETH', async () => {
      let nEth = await makeCToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(niuralLens, 'nTokenBalances', [nEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: nEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('nTokenBalancesAll', () => {
    it('is correct for nEth and nErc20', async () => {
      let nErc20 = await makeCToken();
      let nEth = await makeCToken({kind: 'cether'});
      let ethBalance = await web3.eth.getBalance(acct);
      
      expect(
        (await call(niuralLens, 'nTokenBalancesAll', [[nErc20._address, nEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: nErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          nToken: nEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('nTokenUnderlyingPrice', () => {
    it('gets correct price for nErc20', async () => {
      let nErc20 = await makeCToken();
      expect(
        cullTuple(await call(niuralLens, 'nTokenUnderlyingPrice', [nErc20._address]))
      ).toEqual(
        {
          nToken: nErc20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for nEth', async () => {
      let nEth = await makeCToken({kind: 'cether'});
      expect(
        cullTuple(await call(niuralLens, 'nTokenUnderlyingPrice', [nEth._address]))
      ).toEqual(
        {
          nToken: nEth._address,
          underlyingPrice: "0",
        }
      );
    });
  });

  describe('nTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let nErc20 = await makeCToken();
      let nEth = await makeCToken({kind: 'cether'});
      expect(
        (await call(niuralLens, 'nTokenUnderlyingPriceAll', [[nErc20._address, nEth._address]])).map(cullTuple)
      ).toEqual([
        {
          nToken: nErc20._address,
          underlyingPrice: "0",
        },
        {
          nToken: nEth._address,
          underlyingPrice: "0",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let niutroller = await makeNiutroller();

      expect(
        cullTuple(await call(niuralLens, 'getAccountLimits', [niutroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let niu, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      niu = await deploy('Niu', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), niu._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(niu, 'delegate', [acct]);
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

  describe('niu', () => {
    let niu, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      niu = await deploy('Niu', [acct]);
    });

    describe('getNiuBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(niuralLens, 'getNiuBalanceMetadata', [niu._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getNiuBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let niutroller = await makeNiutroller();
        await send(niutroller, 'setNiuAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(niuralLens, 'getNiuBalanceMetadataExt', [niu._address, niutroller._address, acct]))
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
          (await call(niuralLens, 'getNiuVotes', [niu._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
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
          call(niuralLens, 'getNiuVotes', [niu._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert Niu::getPriorVotes: not yet determined')
      });
    });
  });
});
