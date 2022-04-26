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

async function preLiquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral) {
  // setup for success in liquidating
  await send(nToken.comptroller, 'setLiquidateBorrowAllowed', [true]);
  await send(nToken.comptroller, 'setLiquidateBorrowVerify', [true]);
  await send(nToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(nToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(nToken.comptroller, 'setSeizeAllowed', [true]);
  await send(nToken.comptroller, 'setSeizeVerify', [true]);
  await send(nToken.comptroller, 'setFailCalculateSeizeTokens', [false]);
  await send(nToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(nToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(nTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(nTokenCollateral.comptroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await send(nTokenCollateral, 'harnessSetTotalSupply', [etherExp(10)]);
  await setBalance(nTokenCollateral, liquidator, 0);
  await setBalance(nTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(nTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(nToken, borrower, 1, 1, repayAmount);
  await preApprove(nToken, liquidator, repayAmount);
}

async function liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral) {
  return send(nToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, nTokenCollateral._address]);
}

async function liquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(nToken, 1);
  await fastForward(nTokenCollateral, 1);
  return send(nToken, 'liquidateBorrow', [borrower, repayAmount, nTokenCollateral._address], {from: liquidator});
}

async function seize(nToken, liquidator, borrower, seizeAmount) {
  return send(nToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('NToken', function () {
  let root, liquidator, borrower, accounts;
  let nToken, nTokenCollateral;

  const protocolSeizeShareMantissa = 2.8e16; // 2.8%
  const exchangeRate = etherExp(.2);

  const protocolShareTokens = seizeTokens.multipliedBy(protocolSeizeShareMantissa).dividedBy(etherExp(1));
  const liquidatorShareTokens = seizeTokens.minus(protocolShareTokens);

  const addReservesAmount = protocolShareTokens.multipliedBy(exchangeRate).dividedBy(etherExp(1));

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    nToken = await makeNToken({comptrollerOpts: {kind: 'bool'}});
    nTokenCollateral = await makeNToken({comptroller: nToken.comptroller});
    expect(await send(nTokenCollateral, 'harnessSetExchangeRate', [exchangeRate])).toSucceed();
  });
  
  beforeEach(async () => {
    await preLiquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if comptroller tells it to", async () => {
      await send(nToken.comptroller, 'setLiquidateBorrowAllowed', [false]);
      expect(
        await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if comptroller tells it to", async () => {
      expect(
        await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(nToken);
      expect(
        await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_FRESHNESS_CHECK');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(nToken);
      await fastForward(nTokenCollateral);
      await send(nToken, 'accrueInterest');
      expect(
        await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK');
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(nToken, borrower, borrower, repayAmount, nTokenCollateral)
      ).toHaveTokenFailure('INVALID_ACCOUNT_PAIR', 'LIQUIDATE_LIQUIDATOR_IS_BORROWER');
    });

    it("fails if repayAmount = 0", async () => {
      expect(await liquidateFresh(nToken, liquidator, borrower, 0, nTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      await send(nToken.comptroller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(nToken.comptroller, 'setRepayBorrowAllowed', [false]);
      expect(
        await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_REPAY_BORROW_FRESH_FAILED');
    });

    it("reverts if seize fails", async () => {
      await send(nToken.comptroller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).rejects.toRevert("revert token seizure failed");
    });

    xit("reverts if liquidateBorrowVerify fails", async() => {
      await send(nToken.comptroller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(nToken, liquidator, borrower, repayAmount, nTokenCollateral);
      const afterBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        nTokenCollateral: nTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: nToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 2], {
        from: borrower,
        to: nTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [nToken, 'cash', repayAmount],
        [nToken, 'borrows', -repayAmount],
        [nToken, liquidator, 'cash', -repayAmount],
        [nTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [nToken, borrower, 'borrows', -repayAmount],
        [nTokenCollateral, borrower, 'tokens', -seizeTokens],
        [nTokenCollateral, nTokenCollateral._address, 'reserves', addReservesAmount],
        [nTokenCollateral, nTokenCollateral._address, 'tokens', -protocolShareTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(nToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(nTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(await liquidate(nToken, liquidator, borrower, 0, nTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(nToken, liquidator, borrower, repayAmount, nTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([nToken, nTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [nToken, 'cash', repayAmount],
        [nToken, 'borrows', -repayAmount],
        [nToken, liquidator, 'eth', -gasCost],
        [nToken, liquidator, 'cash', -repayAmount],
        [nTokenCollateral, liquidator, 'eth', -gasCost],
        [nTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [nTokenCollateral, nTokenCollateral._address, 'reserves', addReservesAmount],
        [nToken, borrower, 'borrows', -repayAmount],
        [nTokenCollateral, borrower, 'tokens', -seizeTokens],
        [nTokenCollateral, nTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(nToken.comptroller, 'setSeizeAllowed', [false]);
      expect(await seize(nTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTrollReject('LIQUIDATE_SEIZE_COMPTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("fails if nTokenBalances[borrower] < amount", async () => {
      await setBalance(nTokenCollateral, borrower, 1);
      expect(await seize(nTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED', 'INTEGER_UNDERFLOW');
    });

    it("fails if nTokenBalances[liquidator] overflows", async () => {
      await setBalance(nTokenCollateral, liquidator, UInt256Max());
      expect(await seize(nTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED', 'INTEGER_OVERFLOW');
    });

    it("succeeds, updates balances, adds to reserves, and emits Transfer and ReservesAdded events", async () => {
      const beforeBalances = await getBalances([nTokenCollateral], [liquidator, borrower]);
      const result = await seize(nTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([nTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog(['Transfer', 0], {
        from: borrower,
        to: liquidator,
        amount: liquidatorShareTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: nTokenCollateral._address,
        amount: protocolShareTokens.toString()
      });
      expect(result).toHaveLog('ReservesAdded', {
        benefactor: nTokenCollateral._address,
        addAmount: addReservesAmount.toString(),
        newTotalReserves: addReservesAmount.toString()
      });

      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [nTokenCollateral, liquidator, 'tokens', liquidatorShareTokens],
        [nTokenCollateral, borrower, 'tokens', -seizeTokens],
        [nTokenCollateral, nTokenCollateral._address, 'reserves', addReservesAmount],
        [nTokenCollateral, nTokenCollateral._address, 'tokens', -protocolShareTokens], // total supply decreases
      ]));
    });
  });
});

describe('Niutroller', () => {
  it('liquidateBorrowAllowed allows deprecated markets to be liquidated', async () => {
    let [root, liquidator, borrower] = saddle.accounts;
    let collatAmount = 10;
    let borrowAmount = 2;
    const nTokenCollat = await makeNToken({supportMarket: true, underlyingPrice: 1, collateralFactor: .5});
    const nTokenBorrow = await makeNToken({supportMarket: true, underlyingPrice: 1, comptroller: nTokenCollat.comptroller});
    const comptroller = nTokenCollat.comptroller;

    // borrow some tokens
    await send(nTokenCollat.underlying, 'harnessSetBalance', [borrower, collatAmount]);
    await send(nTokenCollat.underlying, 'approve', [nTokenCollat._address, collatAmount], {from: borrower});
    await send(nTokenBorrow.underlying, 'harnessSetBalance', [nTokenBorrow._address, collatAmount]);
    await send(nTokenBorrow, 'harnessSetTotalSupply', [collatAmount * 10]);
    await send(nTokenBorrow, 'harnessSetExchangeRate', [etherExp(1)]);
    expect(await enterMarkets([nTokenCollat], borrower)).toSucceed();
    expect(await send(nTokenCollat, 'mint', [collatAmount], {from: borrower})).toSucceed();
    expect(await send(nTokenBorrow, 'borrow', [borrowAmount], {from: borrower})).toSucceed();

    // show the account is healthy
    expect(await call(comptroller, 'isDeprecated', [nTokenBorrow._address])).toEqual(false);
    expect(await call(comptroller, 'liquidateBorrowAllowed', [nTokenBorrow._address, nTokenCollat._address, liquidator, borrower, borrowAmount])).toHaveTrollError('INSUFFICIENT_SHORTFALL');

    // show deprecating a market works
    expect(await send(comptroller, '_setCollateralFactor', [nTokenBorrow._address, 0])).toSucceed();
    expect(await send(comptroller, '_setBorrowPaused', [nTokenBorrow._address, true])).toSucceed();
    expect(await send(nTokenBorrow, '_setReserveFactor', [etherMantissa(1)])).toSucceed();

    expect(await call(comptroller, 'isDeprecated', [nTokenBorrow._address])).toEqual(true);

    // show deprecated markets can be liquidated even if healthy
    expect(await send(comptroller, 'liquidateBorrowAllowed', [nTokenBorrow._address, nTokenCollat._address, liquidator, borrower, borrowAmount])).toSucceed();
    
    // even if deprecated, cant over repay
    await expect(send(comptroller, 'liquidateBorrowAllowed', [nTokenBorrow._address, nTokenCollat._address, liquidator, borrower, borrowAmount * 2])).rejects.toRevert('revert Can not repay more than the total borrow');
  });
})
