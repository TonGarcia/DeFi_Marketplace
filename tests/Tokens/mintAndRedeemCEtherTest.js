const {
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  sendFallback
} = require('../Utils/Ethereum');

const {
  makeNToken,
  balanceOf,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Niural');

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(NToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(NToken.comptroller, 'setMintAllowed', [true]);
  await send(NToken.comptroller, 'setMintVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintExplicit(NToken, minter, mintAmount) {
  return send(NToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(NToken, minter, mintAmount) {
  return sendFallback(NToken, {from: minter, value: mintAmount});
}

async function preRedeem(NToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(NToken.comptroller, 'setRedeemAllowed', [true]);
  await send(NToken.comptroller, 'setRedeemVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
  await setEtherBalance(NToken, redeemAmount);
  await send(NToken, 'harnessSetTotalSupply', [redeemTokens]);
  await setBalance(NToken, redeemer, redeemTokens);
}

async function redeemNTokens(NToken, redeemer, redeemTokens, redeemAmount) {
  return send(NToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(NToken, redeemer, redeemTokens, redeemAmount) {
  return send(NToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

describe('CEther', () => {
  let root, minter, redeemer, accounts;
  let NToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    NToken = await makeNToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
    await fastForward(NToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(NToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(mint(NToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([NToken], [minter]);
        const receipt = await mint(NToken, minter, mintAmount);
        const afterBalances = await getBalances([NToken], [minter]);
        expect(receipt).toSucceed();
        expect(mintTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [NToken, 'eth', mintAmount],
          [NToken, 'tokens', mintTokens],
          [NToken, minter, 'eth', -mintAmount.plus(await etherGasCost(receipt))],
          [NToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemNTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(NToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(redeem(NToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        expect(await redeem(NToken, redeemer, redeemTokens.multipliedBy(5), redeemAmount.multipliedBy(5))).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(NToken);
        const beforeBalances = await getBalances([NToken], [redeemer]);
        const receipt = await redeem(NToken, redeemer, redeemTokens, redeemAmount);
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([NToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [NToken, 'eth', -redeemAmount],
          [NToken, 'tokens', -redeemTokens],
          [NToken, redeemer, 'eth', redeemAmount.minus(await etherGasCost(receipt))],
          [NToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
