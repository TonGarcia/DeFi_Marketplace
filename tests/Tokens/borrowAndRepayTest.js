const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeNToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow
} = require('../Utils/Niural');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(NToken, borrower, borrowAmount) {
  await send(NToken.comptroller, 'setBorrowAllowed', [true]);
  await send(NToken.comptroller, 'setBorrowVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken.underlying, 'harnessSetBalance', [NToken._address, borrowAmount]);
  await send(NToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(NToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(NToken, 'harnessSetTotalBorrows', [0]);
}

async function borrowFresh(NToken, borrower, borrowAmount) {
  return send(NToken, 'harnessBorrowFresh', [borrower, borrowAmount]);
}

async function borrow(NToken, borrower, borrowAmount, opts = {}) {
  // make sure to have a block delta so we accrue interest
  await send(NToken, 'harnessFastForward', [1]);
  return send(NToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(NToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(NToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(NToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(NToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [benefactor, false]);
  await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [borrower, false]);
  await pretendBorrow(NToken, borrower, 1, 1, repayAmount);
  await preApprove(NToken, benefactor, repayAmount);
  await preApprove(NToken, borrower, repayAmount);
}

async function repayBorrowFresh(NToken, payer, borrower, repayAmount) {
  return send(NToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer});
}

async function repayBorrow(NToken, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(NToken, 'harnessFastForward', [1]);
  return send(NToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalf(NToken, payer, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(NToken, 'harnessFastForward', [1]);
  return send(NToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

describe('NToken', function () {
  let NToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    NToken = await makeNToken({comptrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(NToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      await send(NToken.comptroller, 'setBorrowAllowed', [false]);
      expect(await borrowFresh(NToken, borrower, borrowAmount)).toHaveTrollReject('BORROW_COMPTROLLER_REJECTION');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await borrowFresh(NToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(NToken);
      expect(await borrowFresh(NToken, borrower, borrowAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'BORROW_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(NToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(NToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
      expect(await borrowFresh(NToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(NToken, borrower, 0, 3e18, 5e18);
      expect(await borrowFresh(NToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(NToken, borrower, 1e-18, 1e-18, UInt256Max());
      expect(await borrowFresh(NToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(NToken, 'harnessSetTotalBorrows', [UInt256Max()]);
      expect(await borrowFresh(NToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED');
    });

    it("reverts if transfer out fails", async () => {
      await send(NToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await expect(borrowFresh(NToken, borrower, borrowAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
    });

    xit("reverts if borrowVerify fails", async() => {
      await send(NToken.comptroller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(NToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const beforeProtocolCash = await balanceOf(NToken.underlying, NToken._address);
      const beforeProtocolBorrows = await totalBorrows(NToken);
      const beforeAccountCash = await balanceOf(NToken.underlying, borrower);
      const result = await borrowFresh(NToken, borrower, borrowAmount);
      expect(result).toSucceed();
      expect(await balanceOf(NToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
      expect(await balanceOf(NToken.underlying, NToken._address)).toEqualNumber(beforeProtocolCash.minus(borrowAmount));
      expect(await totalBorrows(NToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
      expect(result).toHaveLog('Transfer', {
        from: NToken._address,
        to: borrower,
        amount: borrowAmount.toString()
      });
      expect(result).toHaveLog('Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.plus(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(NToken);
      await pretendBorrow(NToken, borrower, 0, 3, 0);
      await borrowFresh(NToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(NToken, borrower);
      expect(borrowSnap.principal).toEqualNumber(borrowAmount);
      expect(borrowSnap.interestIndex).toEqualNumber(etherMantissa(3));
      expect(await totalBorrows(NToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(NToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(borrow(NToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      expect(await borrow(NToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeAccountCash = await balanceOf(NToken.underlying, borrower);
      await fastForward(NToken);
      expect(await borrow(NToken, borrower, borrowAmount)).toSucceed();
      expect(await balanceOf(NToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach((benefactorIsPayer) => {
      let payer;
      const label = benefactorIsPayer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorIsPayer ? benefactor : borrower;
          await preRepay(NToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(NToken.comptroller, 'setRepayBorrowAllowed', [false]);
          expect(await repayBorrowFresh(NToken, payer, borrower, repayAmount)).toHaveTrollReject('REPAY_BORROW_COMPTROLLER_REJECTION', 'MATH_ERROR');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(NToken);
          expect(await repayBorrowFresh(NToken, payer, borrower, repayAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REPAY_BORROW_FRESHNESS_CHECK');
        });

        it("fails if insufficient approval", async() => {
          await preApprove(NToken, payer, 1);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient allowance');
        });

        it("fails if insufficient balance", async() => {
          await setBalance(NToken.underlying, payer, 1);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
        });


        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(NToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED");
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(NToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert("revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED");
        });


        it("reverts if doTransferIn fails", async () => {
          await send(NToken.underlying, 'harnessSetFailTransferFromAddress', [payer, true]);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert("revert TOKEN_TRANSFER_IN_FAILED");
        });

        xit("reverts if repayBorrowVerify fails", async() => {
          await send(NToken.comptroller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(NToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const beforeProtocolCash = await balanceOf(NToken.underlying, NToken._address);
          const result = await repayBorrowFresh(NToken, payer, borrower, repayAmount);
          expect(await balanceOf(NToken.underlying, NToken._address)).toEqualNumber(beforeProtocolCash.plus(repayAmount));
          expect(result).toHaveLog('Transfer', {
            from: payer,
            to: NToken._address,
            amount: repayAmount.toString()
          });
          expect(result).toHaveLog('RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(NToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
          expect(await repayBorrowFresh(NToken, payer, borrower, repayAmount)).toSucceed();
          const afterAccountBorrows = await borrowSnapshot(NToken, borrower);
          expect(afterAccountBorrows.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
          expect(afterAccountBorrows.interestIndex).toEqualNumber(etherMantissa(1));
          expect(await totalBorrows(NToken)).toEqualNumber(beforeProtocolBorrows.minus(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(NToken, borrower, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(NToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(NToken.underlying, borrower, 1);
      await expect(repayBorrow(NToken, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(NToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
      expect(await repayBorrow(NToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(NToken);
      expect(await repayBorrow(NToken, borrower, UInt256Max())).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      await setBalance(NToken.underlying, borrower, 3);
      await fastForward(NToken);
      await expect(repayBorrow(NToken, borrower, UInt256Max())).rejects.toRevert('revert Insufficient balance');
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(NToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(NToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(NToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(NToken.underlying, payer, 1);
      await expect(repayBorrowBehalf(NToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(NToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
      expect(await repayBorrowBehalf(NToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(NToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });
  });
});
