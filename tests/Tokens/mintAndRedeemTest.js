const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeNToken,
  balanceOf,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying
} = require('../Utils/Niural');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(NToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(NToken, minter, mintAmount);
  await send(NToken.comptroller, 'setMintAllowed', [true]);
  await send(NToken.comptroller, 'setMintVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(NToken, 'harnessSetBalance', [minter, 0]);
  await send(NToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(NToken, minter, mintAmount) {
  return send(NToken, 'harnessMintFresh', [minter, mintAmount]);
}

async function preRedeem(NToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await preSupply(NToken, redeemer, redeemTokens);
  await send(NToken.comptroller, 'setRedeemAllowed', [true]);
  await send(NToken.comptroller, 'setRedeemVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken.underlying, 'harnessSetBalance', [NToken._address, redeemAmount]);
  await send(NToken.underlying, 'harnessSetBalance', [redeemer, 0]);
  await send(NToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, false]);
  await send(NToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function redeemFreshTokens(NToken, redeemer, redeemTokens, redeemAmount) {
  return send(NToken, 'harnessRedeemFresh', [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(NToken, redeemer, redeemTokens, redeemAmount) {
  return send(NToken, 'harnessRedeemFresh', [redeemer, 0, redeemAmount]);
}

describe('NToken', function () {
  let root, minter, redeemer, accounts;
  let NToken;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    NToken = await makeNToken({comptrollerOpts: {kind: 'bool'}, exchangeRate});
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(NToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
      await send(NToken.comptroller, 'setMintAllowed', [false]);
      expect(await mintFresh(NToken, minter, mintAmount)).toHaveTrollReject('MINT_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await mintFresh(NToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(NToken);
      expect(await mintFresh(NToken, minter, mintAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'MINT_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(NToken, 'accrueInterest')).toSucceed();
      expect(await mintFresh(NToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(NToken.underlying, 'approve', [NToken._address, 1], {from: minter})
      ).toSucceed();
      await expect(mintFresh(NToken, minter, mintAmount)).rejects.toRevert('revert Insufficient allowance');
    });

    it("fails if insufficient balance", async() => {
      await setBalance(NToken.underlying, minter, 1);
      await expect(mintFresh(NToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("proceeds if sufficient approval and balance", async () =>{
      expect(await mintFresh(NToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(NToken, 'harnessSetExchangeRate', [0])).toSucceed();
      await expect(mintFresh(NToken, minter, mintAmount)).rejects.toRevert('revert MINT_EXCHANGE_CALCULATION_FAILED');
    });

    it("fails if transferring in fails", async () => {
      await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [minter, true]);
      await expect(mintFresh(NToken, minter, mintAmount)).rejects.toRevert('revert TOKEN_TRANSFER_IN_FAILED');
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([NToken], [minter]);
      const result = await mintFresh(NToken, minter, mintAmount);
      const afterBalances = await getBalances([NToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Mint', {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: NToken._address,
        to: minter,
        amount: mintTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [NToken, minter, 'cash', -mintAmount],
        [NToken, minter, 'tokens', mintTokens],
        [NToken, 'cash', mintAmount],
        [NToken, 'tokens', mintTokens]
      ]));
    });
  });

  describe('mint', () => {
    beforeEach(async () => {
      await preMint(NToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickMint(NToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(NToken.underlying, 'harnessSetBalance', [minter, 1]);
      await expect(mintFresh(NToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(NToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(NToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(NToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "0",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(NToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("fails if comptroller tells it to", async () =>{
        await send(NToken.comptroller, 'setRedeemAllowed', [false]);
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTrollReject('REDEEM_COMPTROLLER_REJECTION');
      });

      it("fails if not fresh", async () => {
        await fastForward(NToken);
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REDEEM_FRESHNESS_CHECK');
      });

      it("continues if fresh", async () => {
        await expect(await send(NToken, 'accrueInterest')).toSucceed();
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async() => {
        await send(NToken.underlying, 'harnessSetBalance', [NToken._address, 1]);
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(await send(NToken, 'harnessSetExchangeRate', [UInt256Max()])).toSucceed();
          expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED');
        } else {
          expect(await send(NToken, 'harnessSetExchangeRate', [0])).toSucceed();
          expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED');
        }
      });

      it("fails if transferring out fails", async () => {
        await send(NToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, true]);
        await expect(redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(NToken, 'harnessExchangeRateDetails', [0, 0, 0]);
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("reverts if new account balance underflows", async () => {
        await send(NToken, 'harnessSetBalance', [redeemer, 0]);
        expect(await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED');
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([NToken], [redeemer]);
        const result = await redeemFresh(NToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([NToken], [redeemer]);
        expect(result).toSucceed();
        expect(result).toHaveLog('Redeem', {
          redeemer,
          redeemAmount: redeemAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        expect(result).toHaveLog(['Transfer', 1], {
          from: redeemer,
          to: NToken._address,
          amount: redeemTokens.toString()
        });
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [NToken, redeemer, 'cash', redeemAmount],
          [NToken, redeemer, 'tokens', -redeemTokens],
          [NToken, 'cash', -redeemAmount],
          [NToken, 'tokens', -redeemTokens]
        ]));
      });
    });
  });

  describe('redeem', () => {
    beforeEach(async () => {
      await preRedeem(NToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickRedeem(NToken, redeemer, redeemTokens)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(NToken.underlying, NToken._address, 0);
      expect(await quickRedeem(NToken, redeemer, redeemTokens, {exchangeRate})).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(NToken.underlying, 'harnessSetBalance', [NToken._address, redeemAmount])
      ).toSucceed();
      expect(await quickRedeem(NToken, redeemer, redeemTokens, {exchangeRate})).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(NToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(NToken.underlying, 'harnessSetBalance', [NToken._address, redeemAmount])
      ).toSucceed();
      expect(
        await quickRedeemUnderlying(NToken, redeemer, redeemAmount, {exchangeRate})
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(NToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(NToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "500000000",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });
});
