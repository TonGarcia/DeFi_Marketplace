const {
  etherGasCost,
  etherUnsigned,
  etherMantissa,
  UInt256Max, 
  etherExp
} = require('../Utils/Ethereum');

const {
  makeNToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove,
  enterMarkets
} = require('../Utils/Niural');

const repayAmount = etherExp(10);
const seizeTokens = repayAmount.multipliedBy(4); // forced

async function preLiquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral) {
  // setup for success in liquidating
  await send(NToken.comptroller, 'setLiquidateBorrowAllowed', [true]);
  await send(NToken.comptroller, 'setLiquidateBorrowVerify', [true]);
  await send(NToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(NToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(NToken.comptroller, 'setSeizeAllowed', [true]);
  await send(NToken.comptroller, 'setSeizeVerify', [true]);
  await send(NToken.comptroller, 'setFailCalculateSeizeTokens', [false]);
  await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NTokenCollateral.comptroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await send(NTokenCollateral, 'harnessSetTotalSupply', [etherExp(10)]);
  await setBalance(NTokenCollateral, liquidator, 0);
  await setBalance(NTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(NTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(NToken, borrower, 1, 1, repayAmount);
  await preApprove(NToken, liquidator, repayAmount);
}

async function liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral) {
  return send(NToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, NTokenCollateral._address]);
}

async function liquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(NToken, 1);
  await fastForward(NTokenCollateral, 1);
  return send(NToken, 'liquidateBorrow', [borrower, repayAmount, NTokenCollateral._address], {from: liquidator});
}

async function seize(NToken, liquidator, borrower, seizeAmount) {
  return send(NToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('NToken', function () {
  let root, liquidator, borrower, accounts;
  let NToken, NTokenCollateral;

  const protocolSeizeShareMantissa = 2.8e16; // 2.8%
  const exchangeRate = etherExp(.2);

  const protocolShareTokens = seizeTokens.multipliedBy(protocolSeizeShareMantissa).dividedBy(etherExp(1));
  const liquidatorShareTokens = seizeTokens.minus(protocolShareTokens);

  const addReservesAmount = protocolShareTokens.multipliedBy(exchangeRate).dividedBy(etherExp(1));

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    NToken = await makeNToken({comptrollerOpts: {kind: 'bool'}});
    NTokenCollateral = await makeNToken({comptroller: NToken.comptroller});
    expect(await send(NTokenCollateral, 'harnessSetExchangeRate', [exchangeRate])).toSucceed();
  });
  
  beforeEach(async () => {
    await preLiquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if comptroller tells it to", async () => {
      await send(NToken.comptroller, 'setLiquidateBorrowAllowed', [false]);
      expect(
        await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if comptroller tells it to", async () => {
      expect(
        await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(NToken);
      expect(
        await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_FRESHNESS_CHECK');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(NToken);
      await fastForward(NTokenCollateral);
      await send(NToken, 'accrueInterest');
      expect(
        await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK');
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(NToken, borrower, borrower, repayAmount, NTokenCollateral)
      ).toHaveTokenFailure('INVALID_ACCOUNT_PAIR', 'LIQUIDATE_LIQUIDATOR_IS_BORROWER');
    });

    it("fails if repayAmount = 0", async () => {
      expect(await liquidateFresh(NToken, liquidator, borrower, 0, NTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      await send(NToken.comptroller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(NToken.comptroller, 'setRepayBorrowAllowed', [false]);
      expect(
        await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_REPAY_BORROW_FRESH_FAILED');
    });

    it("reverts if seize fails", async () => {
      await send(NToken.comptroller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).rejects.toRevert("revert token seizure failed");
    });

    xit("reverts if liquidateBorrowVerify fails", async() => {
      await send(NToken.comptroller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(NToken, liquidator, borrower, repayAmount, NTokenCollateral);
      const afterBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        NTokenCollateral: NTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: NToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 2], {
        from: borrower,
        to: NTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [NToken, 'cash', repayAmount],
        [NToken, 'borrows', -repayAmount],
        [NToken, liquidator, 'cash', -repayAmount],
        [NTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [NToken, borrower, 'borrows', -repayAmount],
        [NTokenCollateral, borrower, 'tokens', -seizeTokens],
        [NTokenCollateral, NTokenCollateral._address, 'reserves', addReservesAmount],
        [NTokenCollateral, NTokenCollateral._address, 'tokens', -protocolShareTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(NTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(await liquidate(NToken, liquidator, borrower, 0, NTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(NToken, liquidator, borrower, repayAmount, NTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([NToken, NTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [NToken, 'cash', repayAmount],
        [NToken, 'borrows', -repayAmount],
        [NToken, liquidator, 'eth', -gasCost],
        [NToken, liquidator, 'cash', -repayAmount],
        [NTokenCollateral, liquidator, 'eth', -gasCost],
        [NTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [NTokenCollateral, NTokenCollateral._address, 'reserves', addReservesAmount],
        [NToken, borrower, 'borrows', -repayAmount],
        [NTokenCollateral, borrower, 'tokens', -seizeTokens],
        [NTokenCollateral, NTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(NToken.comptroller, 'setSeizeAllowed', [false]);
      expect(await seize(NTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTrollReject('LIQUIDATE_SEIZE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("fails if NTokenBalances[borrower] < amount", async () => {
      await setBalance(NTokenCollateral, borrower, 1);
      expect(await seize(NTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED', 'INTEGER_UNDERFLOW');
    });

    it("fails if NTokenBalances[liquidator] overflows", async () => {
      await setBalance(NTokenCollateral, liquidator, UInt256Max());
      expect(await seize(NTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED', 'INTEGER_OVERFLOW');
    });

    it("succeeds, updates balances, adds to reserves, and emits Transfer and ReservesAdded events", async () => {
      const beforeBalances = await getBalances([NTokenCollateral], [liquidator, borrower]);
      const result = await seize(NTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([NTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog(['Transfer', 0], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: NTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(result).toHaveLog('ReservesAdded', {
        benefactor: NTokenCollateral._address,
        addAmount: addReservesAmount.toString(),
        newTotalReserves: addReservesAmount.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [NTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [NTokenCollateral, borrower, 'tokens', -seizeTokens],
        [NTokenCollateral, NTokenCollateral._address, 'reserves', addReservesAmount],
        [NTokenCollateral, NTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });
});

describe('Comptroller', () => {
  it('liquidateBorrowAllowed allows deprecated markets to be liquidated', async () => {
    let [root, liquidator, borrower] = saddle.accounts;
    let collatAmount = 10;
    let borrowAmount = 2;
    const NTokenCollat = await makeNToken({supportMarket: true, underlyingPrice: 1, collateralFactor: .5});
    const NTokenBorrow = await makeNToken({supportMarket: true, underlyingPrice: 1, comptroller: NTokenCollat.comptroller});
    const comptroller = NTokenCollat.comptroller;

    // borrow some tokens
    await send(NTokenCollat.underlying, 'harnessSetBalance', [borrower, collatAmount]);
    await send(NTokenCollat.underlying, 'approve', [NTokenCollat._address, collatAmount], {from: borrower});
    await send(NTokenBorrow.underlying, 'harnessSetBalance', [NTokenBorrow._address, collatAmount]);
    await send(NTokenBorrow, 'harnessSetTotalSupply', [collatAmount * 10]);
    await send(NTokenBorrow, 'harnessSetExchangeRate', [etherExp(1)]);
    expect(await enterMarkets([NTokenCollat], borrower)).toSucceed();
    expect(await send(NTokenCollat, 'mint', [collatAmount], {from: borrower})).toSucceed();
    expect(await send(NTokenBorrow, 'borrow', [borrowAmount], {from: borrower})).toSucceed();

    // show the account is healthy
    expect(await call(comptroller, 'isDeprecated', [NTokenBorrow._address])).toEqual(false);
    expect(await call(comptroller, 'liquidateBorrowAllowed', [NTokenBorrow._address, NTokenCollat._address, liquidator, borrower, borrowAmount])).toHaveTrollError('INSUFFICIENT_SHORTFALL');

    // show deprecating a market works
    expect(await send(comptroller, '_setCollateralFactor', [NTokenBorrow._address, 0])).toSucceed();
    expect(await send(comptroller, '_setBorrowPaused', [NTokenBorrow._address, true])).toSucceed();
    expect(await send(NTokenBorrow, '_setReserveFactor', [etherMantissa(1)])).toSucceed();

    expect(await call(comptroller, 'isDeprecated', [NTokenBorrow._address])).toEqual(true);

    // show deprecated markets can be liquidated even if healthy
    expect(await send(comptroller, 'liquidateBorrowAllowed', [NTokenBorrow._address, NTokenCollat._address, liquidator, borrower, borrowAmount])).toSucceed();
    
    // even if deprecated, cant over repay
    await expect(send(comptroller, 'liquidateBorrowAllowed', [NTokenBorrow._address, NTokenCollat._address, liquidator, borrower, borrowAmount * 2])).rejects.toRevert('revert Can not repay more than the total borrow');
  });
})
