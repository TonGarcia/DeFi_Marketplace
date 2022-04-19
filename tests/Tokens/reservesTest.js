const {
  etherUnsigned,
  etherMantissa,
  both,
  etherExp
} = require('../Utils/Ethereum');

const {fastForward, makeNToken, getBalances, adjustBalances} = require('../Utils/Niural');

const factor = etherMantissa(.02);

const reserves = etherUnsigned(3e12);
const cash = etherUnsigned(reserves.multipliedBy(2));
const reduction = etherUnsigned(2e12);

describe('NToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('_setReserveFactorFresh', () => {
    let NToken;
    beforeEach(async () => {
      NToken = await makeNToken();
    });

    it("rejects change by non-admin", async () => {
      expect(
        await send(NToken, 'harnessSetReserveFactorFresh', [factor], {from: accounts[0]})
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_RESERVE_FACTOR_ADMIN_CHECK');
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("rejects change if market not fresh", async () => {
      expect(await send(NToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(NToken, 'harnessSetReserveFactorFresh', [factor])).toHaveTokenFailure('MARKET_NOT_FRESH', 'SET_RESERVE_FACTOR_FRESH_CHECK');
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("rejects newReserveFactor that descales to 1", async () => {
      expect(await send(NToken, 'harnessSetReserveFactorFresh', [etherMantissa(1.01)])).toHaveTokenFailure('BAD_INPUT', 'SET_RESERVE_FACTOR_BOUNDS_CHECK');
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("accepts newReserveFactor in valid range and emits log", async () => {
      const result = await send(NToken, 'harnessSetReserveFactorFresh', [factor])
      expect(result).toSucceed();
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(factor);
      expect(result).toHaveLog("NewReserveFactor", {
        oldReserveFactorMantissa: '0',
        newReserveFactorMantissa: factor.toString(),
      });
    });

    it("accepts a change back to zero", async () => {
      const result1 = await send(NToken, 'harnessSetReserveFactorFresh', [factor]);
      const result2 = await send(NToken, 'harnessSetReserveFactorFresh', [0]);
      expect(result1).toSucceed();
      expect(result2).toSucceed();
      expect(result2).toHaveLog("NewReserveFactor", {
        oldReserveFactorMantissa: factor.toString(),
        newReserveFactorMantissa: '0',
      });
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });
  });

  describe('_setReserveFactor', () => {
    let NToken;
    beforeEach(async () => {
      NToken = await makeNToken();
    });

    beforeEach(async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
      await send(NToken, '_setReserveFactor', [0]);
    });

    it("emits a reserve factor failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(NToken, 1);
      await expect(send(NToken, '_setReserveFactor', [factor])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("returns error from setReserveFactorFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(NToken, '_setReserveFactor', [etherMantissa(2)]);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'SET_RESERVE_FACTOR_BOUNDS_CHECK');
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it("returns success from setReserveFactorFresh", async () => {
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(0);
      expect(await send(NToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(NToken, '_setReserveFactor', [factor])).toSucceed();
      expect(await call(NToken, 'reserveFactorMantissa')).toEqualNumber(factor);
    });
  });

  describe("_reduceReservesFresh", () => {
    let NToken;
    beforeEach(async () => {
      NToken = await makeNToken();
      expect(await send(NToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(NToken.underlying, 'harnessSetBalance', [NToken._address, cash])
      ).toSucceed();
    });

    it("fails if called by non-admin", async () => {
      expect(
        await send(NToken, 'harnessReduceReservesFresh', [reduction], {from: accounts[0]})
      ).toHaveTokenFailure('UNAUTHORIZED', 'REDUCE_RESERVES_ADMIN_CHECK');
      expect(await call(NToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if market not fresh", async () => {
      expect(await send(NToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(NToken, 'harnessReduceReservesFresh', [reduction])).toHaveTokenFailure('MARKET_NOT_FRESH', 'REDUCE_RESERVES_FRESH_CHECK');
      expect(await call(NToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if amount exceeds reserves", async () => {
      expect(await send(NToken, 'harnessReduceReservesFresh', [reserves.plus(1)])).toHaveTokenFailure('BAD_INPUT', 'REDUCE_RESERVES_VALIDATION');
      expect(await call(NToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanReserves = reserves.minus(2);
      await send(NToken.underlying, 'harnessSetBalance', [NToken._address, cashLessThanReserves]);
      expect(await send(NToken, 'harnessReduceReservesFresh', [reserves])).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDUCE_RESERVES_CASH_NOT_AVAILABLE');
      expect(await call(NToken, 'totalReserves')).toEqualNumber(reserves);
    });

    it("increases admin balance and reduces reserves on success", async () => {
      const balance = etherUnsigned(await call(NToken.underlying, 'balanceOf', [root]));
      expect(await send(NToken, 'harnessReduceReservesFresh', [reserves])).toSucceed();
      expect(await call(NToken.underlying, 'balanceOf', [root])).toEqualNumber(balance.plus(reserves));
      expect(await call(NToken, 'totalReserves')).toEqualNumber(0);
    });

    it("emits an event on success", async () => {
      const result = await send(NToken, 'harnessReduceReservesFresh', [reserves]);
      expect(result).toHaveLog('ReservesReduced', {
        admin: root,
        reduceAmount: reserves.toString(),
        newTotalReserves: '0'
      });
    });
  });

  describe("_reduceReserves", () => {
    let NToken;
    beforeEach(async () => {
      NToken = await makeNToken();
      await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(NToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(NToken.underlying, 'harnessSetBalance', [NToken._address, cash])
      ).toSucceed();
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await fastForward(NToken, 1);
      await expect(send(NToken, '_reduceReserves', [reduction])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _reduceReservesFresh without emitting any extra logs", async () => {
      const {reply, receipt} = await both(NToken, 'harnessReduceReservesFresh', [reserves.plus(1)]);
      expect(reply).toHaveTokenError('BAD_INPUT');
      expect(receipt).toHaveTokenFailure('BAD_INPUT', 'REDUCE_RESERVES_VALIDATION');
    });

    it("returns success code from _reduceReservesFresh and reduces the correct amount", async () => {
      expect(await call(NToken, 'totalReserves')).toEqualNumber(reserves);
      expect(await send(NToken, 'harnessFastForward', [5])).toSucceed();
      expect(await send(NToken, '_reduceReserves', [reduction])).toSucceed();
    });
  });

  describe("CEther addReserves", () => {
    let NToken;
    beforeEach(async () => {
      NToken = await makeNToken({kind: 'cether'});
    });

    it("add reserves for CEther", async () => {
      const balanceBefore = await getBalances([NToken], [])
      const reservedAdded = etherExp(1);
      const result = await send(NToken, "_addReserves", {value: reservedAdded}); //assert no erro
      expect(result).toSucceed();
      expect(result).toHaveLog('ReservesAdded', {
        benefactor: root,
        addAmount: reservedAdded.toString(),
        newTotalReserves: reservedAdded.toString()
      });
      const balanceAfter = await getBalances([NToken], []);
      expect(balanceAfter).toEqual(await adjustBalances(balanceBefore, [
        [NToken, NToken._address, 'eth', reservedAdded],
        [NToken, NToken._address, 'reserves', reservedAdded]
      ]));
    });
  });
});
