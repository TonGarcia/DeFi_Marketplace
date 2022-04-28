const {
  makeNiutroller,
  makeNToken,
  balanceOf,
  fastForward,
  pretendBorrow,
  quickMint,
  quickBorrow,
  enterMarkets
} = require('../Utils/Niural');
const {
  etherExp,
  etherDouble,
  etherUnsigned,
  etherMantissa
} = require('../Utils/Ethereum');

const niuRate = etherUnsigned(1e18);

const compInitialIndex = 1e36;

async function niuAccrued(comptroller, user) {
  return etherUnsigned(await call(comptroller, 'niuAccrued', [user]));
}

async function compBalance(comptroller, user) {
  return etherUnsigned(await call(comptroller.comp, 'balanceOf', [user]))
}

async function totalNiuAccrued(comptroller, user) {
  return (await niuAccrued(comptroller, user)).plus(await compBalance(comptroller, user));
}

describe('Flywheel upgrade', () => {
  describe('becomes the comptroller', () => {
    it('adds the comp markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeNiutroller({kind: 'unitroller-g2'});
      let compMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeNToken({comptroller: unitroller, supportMarket: true});
      }));
      compMarkets = compMarkets.map(c => c._address);
      unitroller = await makeNiutroller({kind: 'unitroller-g3', unitroller, compMarkets});
      expect(await call(unitroller, 'getNiuMarkets')).toEqual(compMarkets);
    });

    it('adds the other markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeNiutroller({kind: 'unitroller-g2'});
      let allMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeNToken({comptroller: unitroller, supportMarket: true});
      }));
      allMarkets = allMarkets.map(c => c._address);
      unitroller = await makeNiutroller({
        kind: 'unitroller-g3',
        unitroller,
        compMarkets: allMarkets.slice(0, 1),
        otherMarkets: allMarkets.slice(1)
      });
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets);
      expect(await call(unitroller, 'getNiuMarkets')).toEqual(allMarkets.slice(0, 1));
    });

    it('_supportMarket() adds to all markets, and only once', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeNiutroller({kind: 'unitroller-g3'});
      let allMarkets = [];
      for (let _ of Array(10)) {
        allMarkets.push(await makeNToken({comptroller: unitroller, supportMarket: true}));
      }
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets.map(c => c._address));
      expect(
        makeNiutroller({
          kind: 'unitroller-g3',
          unitroller,
          otherMarkets: [allMarkets[0]._address]
        })
      ).rejects.toRevert('revert market already added');
    });
  });
});

describe('Flywheel', () => {
  let root, a1, a2, a3, accounts;
  let comptroller, cLOW, cREP, cZRX, cEVIL;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    comptroller = await makeNiutroller();
    cLOW = await makeNToken({comptroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
    cREP = await makeNToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
    cZRX = await makeNToken({comptroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    cEVIL = await makeNToken({comptroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
    cUSD = await makeNToken({comptroller, supportMarket: true, underlyingPrice: 1, collateralFactor: 0.5, interestRateModelOpts});
  });

  describe('_grantNiu()', () => {
    beforeEach(async () => {
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});
    });

    it('should award comp if called by admin', async () => {
      const tx = await send(comptroller, '_grantNiu', [a1, 100]);
      expect(tx).toHaveLog('NiuGranted', {
        recipient: a1,
        amount: 100
      });
    });

    it('should revert if not called by admin', async () => {
      await expect(
        send(comptroller, '_grantNiu', [a1, 100], {from: a1})
      ).rejects.toRevert('revert only admin can grant comp');
    });

    it('should revert if insufficient comp', async () => {
      await expect(
        send(comptroller, '_grantNiu', [a1, etherUnsigned(1e20)])
      ).rejects.toRevert('revert insufficient comp for grant');
    });
  });

  describe('getNiuMarkets()', () => {
    it('should return the comp markets', async () => {
      for (let mkt of [cLOW, cREP, cZRX]) {
        await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      }
      expect(await call(comptroller, 'getNiuMarkets')).toEqual(
        [cLOW, cREP, cZRX].map((c) => c._address)
      );
    });
  });

  describe('_setNiuSpeeds()', () => {
    it('should update market index when calling setNiuSpeed', async () => {
      const mkt = cREP;
      await send(comptroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);

      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await fastForward(comptroller, 20);
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(1)], [etherExp(0.5)]]);

      const {index, block} = await call(comptroller, 'niuSupplyState', [mkt._address]);
      expect(index).toEqualNumber(2e36);
      expect(block).toEqualNumber(20);
    });

    it('should correctly drop a comp market if called by admin', async () => {
      for (let mkt of [cLOW, cREP, cZRX]) {
        await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      }
      const tx = await send(comptroller, '_setNiuSpeeds', [[cLOW._address], [0], [0]]);
      expect(await call(comptroller, 'getNiuMarkets')).toEqual(
        [cREP, cZRX].map((c) => c._address)
      );
      expect(tx).toHaveLog('NiuBorrowSpeedUpdated', {
        nToken: cLOW._address,
        newSpeed: 0
      });
      expect(tx).toHaveLog('NiuSupplySpeedUpdated', {
        nToken: cLOW._address,
        newSpeed: 0
      });
    });

    it('should correctly drop a comp market from middle of array', async () => {
      for (let mkt of [cLOW, cREP, cZRX]) {
        await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      }
      await send(comptroller, '_setNiuSpeeds', [[cREP._address], [0], [0]]);
      expect(await call(comptroller, 'getNiuMarkets')).toEqual(
        [cLOW, cZRX].map((c) => c._address)
      );
    });

    it('should not drop a comp market unless called by admin', async () => {
      for (let mkt of [cLOW, cREP, cZRX]) {
        await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      }
      await expect(
        send(comptroller, '_setNiuSpeeds', [[cLOW._address], [0], [etherExp(0.5)]], {from: a1})
      ).rejects.toRevert('revert only admin can set comp speed');
    });

    it('should not add non-listed markets', async () => {
      const cBAT = await makeNToken({ comptroller, supportMarket: false });
      await expect(
        send(comptroller, 'harnessAddNiuMarkets', [[cBAT._address]])
      ).rejects.toRevert('revert comp market is not listed');

      const markets = await call(comptroller, 'getNiuMarkets');
      expect(markets).toEqual([]);
    });
  });

  describe('updateNiuBorrowIndex()', () => {
    it('should calculate comp borrower index correctly', async () => {
      const mkt = cREP;
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
      await send(comptroller, 'harnessUpdateNiuBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);
      /*
        100 blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed

        borrowAmt   = totalBorrows * 1e18 / borrowIdx
                    = 11e18 * 1e18 / 1.1e18 = 10e18
        niuAccrued = deltaBlocks * borrowSpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += 1e36 + niuAccrued * 1e36 / borrowAmt
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */

      const {index, block} = await call(comptroller, 'niuBorrowState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not revert or update niuBorrowState index if nToken not in COMP markets', async () => {
      const mkt = await makeNToken({
        comptroller: comptroller,
        supportMarket: true,
        addNiuMarket: false,
      });
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, 'harnessUpdateNiuBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'niuBorrowState', [mkt._address]);
      expect(index).toEqualNumber(compInitialIndex);
      expect(block).toEqualNumber(100);
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [mkt._address]);
      expect(supplySpeed).toEqualNumber(0);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [mkt._address]);
      expect(borrowSpeed).toEqualNumber(0);
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = cREP;
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'harnessUpdateNiuBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'niuBorrowState', [mkt._address]);
      expect(index).toEqualNumber(compInitialIndex);
      expect(block).toEqualNumber(0);
    });

    it('should not update index if comp speed is 0', async () => {
      const mkt = cREP;
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0)], [etherExp(0)]]);
      await send(comptroller, 'harnessUpdateNiuBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(comptroller, 'niuBorrowState', [mkt._address]);
      expect(index).toEqualNumber(compInitialIndex);
      expect(block).toEqualNumber(100);
    });
  });

  describe('updateNiuSupplyIndex()', () => {
    it('should calculate comp supplier index correctly', async () => {
      const mkt = cREP;
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(comptroller, 'harnessUpdateNiuSupplyIndex', [mkt._address]);
      /*
        suppyTokens = 10e18
        niuAccrued = deltaBlocks * supplySpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += niuAccrued * 1e36 / supplyTokens
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */
      const {index, block} = await call(comptroller, 'niuSupplyState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not update index on non-COMP markets', async () => {
      const mkt = await makeNToken({
        comptroller: comptroller,
        supportMarket: true,
        addNiuMarket: false
      });
      await send(comptroller, 'setBlockNumber', [100]);
      await send(comptroller, 'harnessUpdateNiuSupplyIndex', [
        mkt._address
      ]);

      const {index, block} = await call(comptroller, 'niuSupplyState', [mkt._address]);
      expect(index).toEqualNumber(compInitialIndex);
      expect(block).toEqualNumber(100);
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [mkt._address]);
      expect(supplySpeed).toEqualNumber(0);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [mkt._address]);
      expect(borrowSpeed).toEqualNumber(0);
      // ctoken could have no comp speed or comp supplier state if not in comp markets
      // this logic could also possibly be implemented in the allowed hook
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = cREP;
      await send(comptroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(comptroller, '_setNiuSpeeds', [[mkt._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'harnessUpdateNiuSupplyIndex', [mkt._address]);

      const {index, block} = await call(comptroller, 'niuSupplyState', [mkt._address]);
      expect(index).toEqualNumber(compInitialIndex);
      expect(block).toEqualNumber(0);
    });

    it('should not matter if the index is updated multiple times', async () => {
      const compRemaining = niuRate.multipliedBy(100)
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessRefreshNiuSpeeds');

      await quickMint(cLOW, a2, etherUnsigned(10e18));
      await quickMint(cLOW, a3, etherUnsigned(15e18));

      const a2Accrued0 = await totalNiuAccrued(comptroller, a2);
      const a3Accrued0 = await totalNiuAccrued(comptroller, a3);
      const a2Balance0 = await balanceOf(cLOW, a2);
      const a3Balance0 = await balanceOf(cLOW, a3);

      await fastForward(comptroller, 20);

      const txT1 = await send(cLOW, 'transfer', [a2, a3Balance0.minus(a2Balance0)], {from: a3});

      const a2Accrued1 = await totalNiuAccrued(comptroller, a2);
      const a3Accrued1 = await totalNiuAccrued(comptroller, a3);
      const a2Balance1 = await balanceOf(cLOW, a2);
      const a3Balance1 = await balanceOf(cLOW, a3);

      await fastForward(comptroller, 10);
      await send(comptroller, 'harnessUpdateNiuSupplyIndex', [cLOW._address]);
      await fastForward(comptroller, 10);

      const txT2 = await send(cLOW, 'transfer', [a3, a2Balance1.minus(a3Balance1)], {from: a2});

      const a2Accrued2 = await totalNiuAccrued(comptroller, a2);
      const a3Accrued2 = await totalNiuAccrued(comptroller, a3);

      expect(a2Accrued0).toEqualNumber(0);
      expect(a3Accrued0).toEqualNumber(0);
      expect(a2Accrued1).not.toEqualNumber(0);
      expect(a3Accrued1).not.toEqualNumber(0);
      expect(a2Accrued1).toEqualNumber(a3Accrued2.minus(a3Accrued1));
      expect(a3Accrued1).toEqualNumber(a2Accrued2.minus(a2Accrued1));

      expect(txT1.gasUsed).toBeLessThan(200000);
      expect(txT1.gasUsed).toBeGreaterThan(140000);
      expect(txT2.gasUsed).toBeLessThan(150000);
      expect(txT2.gasUsed).toBeGreaterThan(100000);
    });
  });

  describe('distributeBorrowerNiu()', () => {

    it('should update borrow index checkpoint but not niuAccrued for first time user', async () => {
      const mkt = cREP;
      await send(comptroller, "setNiuBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(comptroller, "setNiuBorrowerIndex", [mkt._address, root, etherUnsigned(0)]);

      await send(comptroller, "harnessDistributeBorrowerNiu", [mkt._address, root, etherExp(1.1)]);
      expect(await call(comptroller, "niuAccrued", [root])).toEqualNumber(0);
      expect(await call(comptroller, "niuBorrowerIndex", [ mkt._address, root])).toEqualNumber(6e36);
    });

    it('should transfer comp and update borrow index checkpoint correctly for repeat time user', async () => {
      const mkt = cREP;
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e18), etherExp(1)]);
      await send(comptroller, "setNiuBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(comptroller, "setNiuBorrowerIndex", [mkt._address, a1, etherDouble(1)]);

      /*
      * 100 delta blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed => 6e18 compBorrowIndex
      * this tests that an acct with half the total borrows over that time gets 25e18 COMP
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e18 * 1e18 / 1.1e18 = 5e18
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 6e36 - 1e36 = 5e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e18 * 5e36 / 1e36 = 25e18
      */
      const tx = await send(comptroller, "harnessDistributeBorrowerNiu", [mkt._address, a1, etherUnsigned(1.1e18)]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(25e18);
      expect(await compBalance(comptroller, a1)).toEqualNumber(0);
      expect(tx).toHaveLog('DistributedBorrowerNiu', {
        nToken: mkt._address,
        borrower: a1,
        compDelta: etherUnsigned(25e18).toFixed(),
        compBorrowIndex: etherDouble(6).toFixed()
      });
    });

    it('should not transfer comp automatically', async () => {
      const mkt = cREP;
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e17), etherExp(1)]);
      await send(comptroller, "setNiuBorrowState", [mkt._address, etherDouble(1.0019), 10]);
      await send(comptroller, "setNiuBorrowerIndex", [mkt._address, a1, etherDouble(1)]);
      /*
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e17 * 1e18 / 1.1e18 = 5e17
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 1.0019e36 - 1e36 = 0.0019e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
        0.00095e18 < compClaimThreshold of 0.001e18
      */
      await send(comptroller, "harnessDistributeBorrowerNiu", [mkt._address, a1, etherExp(1.1)]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0.00095e18);
      expect(await compBalance(comptroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-COMP market', async () => {
      const mkt = await makeNToken({
        comptroller: comptroller,
        supportMarket: true,
        addNiuMarket: false,
      });

      await send(comptroller, "harnessDistributeBorrowerNiu", [mkt._address, a1, etherExp(1.1)]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await compBalance(comptroller, a1)).toEqualNumber(0);
      expect(await call(comptroller, 'niuBorrowerIndex', [mkt._address, a1])).toEqualNumber(compInitialIndex);
    });
  });

  describe('distributeSupplierNiu()', () => {
    it('should transfer comp and update supply index correctly for first time user', async () => {
      const mkt = cREP;
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(comptroller, "setNiuSupplyState", [mkt._address, etherDouble(6), 10]);
      /*
      * 100 delta blocks, 10e18 total supply, 0.5e18 supplySpeed => 6e18 compSupplyIndex
      * confirming an acct with half the total supply over that time gets 25e18 COMP:
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 1e36 = 5e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 5e36 / 1e36 = 25e18
      */

      const tx = await send(comptroller, "harnessDistributeAllSupplierNiu", [mkt._address, a1]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await compBalance(comptroller, a1)).toEqualNumber(25e18);
      expect(tx).toHaveLog('DistributedSupplierNiu', {
        nToken: mkt._address,
        supplier: a1,
        compDelta: etherUnsigned(25e18).toFixed(),
        compSupplyIndex: etherDouble(6).toFixed()
      });
    });

    it('should update comp accrued and supply index for repeat user', async () => {
      const mkt = cREP;
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(comptroller, "setNiuSupplyState", [mkt._address, etherDouble(6), 10]);
      await send(comptroller, "setNiuSupplierIndex", [mkt._address, a1, etherDouble(2)])
      /*
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 2e36 = 4e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 4e36 / 1e36 = 20e18
      */

      await send(comptroller, "harnessDistributeAllSupplierNiu", [mkt._address, a1]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await compBalance(comptroller, a1)).toEqualNumber(20e18);
    });

    it('should not transfer when niuAccrued below threshold', async () => {
      const mkt = cREP;
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e17)]);
      await send(comptroller, "setNiuSupplyState", [mkt._address, etherDouble(1.0019), 10]);
      /*
        supplierAmount  = 5e17
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 1.0019e36 - 1e36 = 0.0019e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
      */

      await send(comptroller, "harnessDistributeSupplierNiu", [mkt._address, a1]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0.00095e18);
      expect(await compBalance(comptroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-COMP market', async () => {
      const mkt = await makeNToken({
        comptroller: comptroller,
        supportMarket: true,
        addNiuMarket: false,
      });

      await send(comptroller, "harnessDistributeSupplierNiu", [mkt._address, a1]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await compBalance(comptroller, a1)).toEqualNumber(0);
      expect(await call(comptroller, 'niuBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });

  });

  describe('transferNiu', () => {
    it('should transfer comp accrued when amount is above threshold', async () => {
      const compRemaining = 1000, a1AccruedPre = 100, threshold = 1;
      const compBalancePre = await compBalance(comptroller, a1);
      const tx0 = await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      const tx1 = await send(comptroller, 'setNiuAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferNiu', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await niuAccrued(comptroller, a1);
      const compBalancePost = await compBalance(comptroller, a1);
      expect(compBalancePre).toEqualNumber(0);
      expect(compBalancePost).toEqualNumber(a1AccruedPre);
    });

    it('should not transfer when comp accrued is below threshold', async () => {
      const compRemaining = 1000, a1AccruedPre = 100, threshold = 101;
      const compBalancePre = await call(comptroller.comp, 'balanceOf', [a1]);
      const tx0 = await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      const tx1 = await send(comptroller, 'setNiuAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferNiu', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await niuAccrued(comptroller, a1);
      const compBalancePost = await compBalance(comptroller, a1);
      expect(compBalancePre).toEqualNumber(0);
      expect(compBalancePost).toEqualNumber(0);
    });

    it('should not transfer comp if comp accrued is greater than comp remaining', async () => {
      const compRemaining = 99, a1AccruedPre = 100, threshold = 1;
      const compBalancePre = await compBalance(comptroller, a1);
      const tx0 = await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      const tx1 = await send(comptroller, 'setNiuAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(comptroller, 'harnessTransferNiu', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await niuAccrued(comptroller, a1);
      const compBalancePost = await compBalance(comptroller, a1);
      expect(compBalancePre).toEqualNumber(0);
      expect(compBalancePost).toEqualNumber(0);
    });
  });

  describe('claimNiu', () => {
    it('should accrue comp and then transfer comp accrued', async () => {
      const compRemaining = niuRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(comptroller, '_setNiuSpeeds', [[cLOW._address], [etherExp(0.5)], [etherExp(0.5)]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      const a2AccruedPre = await niuAccrued(comptroller, a2);
      const compBalancePre = await compBalance(comptroller, a2);
      await quickMint(cLOW, a2, mintAmount);
      await fastForward(comptroller, deltaBlocks);
      const tx = await send(comptroller, 'claimNiu', [a2]);
      const a2AccruedPost = await niuAccrued(comptroller, a2);
      const compBalancePost = await compBalance(comptroller, a2);
      expect(tx.gasUsed).toBeLessThan(500000);
      expect(supplySpeed).toEqualNumber(niuRate);
      expect(borrowSpeed).toEqualNumber(niuRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(compBalancePre).toEqualNumber(0);
      expect(compBalancePost).toEqualNumber(niuRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should accrue comp and then transfer comp accrued in a single market', async () => {
      const compRemaining = niuRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      const a2AccruedPre = await niuAccrued(comptroller, a2);
      const compBalancePre = await compBalance(comptroller, a2);
      await quickMint(cLOW, a2, mintAmount);
      await fastForward(comptroller, deltaBlocks);
      const tx = await send(comptroller, 'claimNiu', [a2, [cLOW._address]]);
      const a2AccruedPost = await niuAccrued(comptroller, a2);
      const compBalancePost = await compBalance(comptroller, a2);
      expect(tx.gasUsed).toBeLessThan(170000);
      expect(supplySpeed).toEqualNumber(niuRate);
      expect(borrowSpeed).toEqualNumber(niuRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(compBalancePre).toEqualNumber(0);
      expect(compBalancePost).toEqualNumber(niuRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should claim when comp accrued is below threshold', async () => {
      const compRemaining = etherExp(1), accruedAmt = etherUnsigned(0.0009e18)
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      await send(comptroller, 'setNiuAccrued', [a1, accruedAmt]);
      await send(comptroller, 'claimNiu', [a1, [cLOW._address]]);
      expect(await niuAccrued(comptroller, a1)).toEqualNumber(0);
      expect(await compBalance(comptroller, a1)).toEqualNumber(accruedAmt);
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeNToken({comptroller});
      await expect(
        send(comptroller, 'claimNiu', [a1, [cNOT._address]])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('claimNiu batch', () => {
    it('should revert when claiming comp from non-listed market', async () => {
      const compRemaining = niuRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;

      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }

      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(comptroller, 'harnessRefreshNiuSpeeds');

      await fastForward(comptroller, deltaBlocks);

      await expect(send(comptroller, 'claimNiu', [claimAccts, [cLOW._address, cEVIL._address], true, true])).rejects.toRevert('revert market must be listed');
    });

    it('should claim the expected amount when holders and ctokens arg is duplicated', async () => {
      const compRemaining = niuRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');

      await fastForward(comptroller, deltaBlocks);

      const tx = await send(comptroller, 'claimNiu', [[...claimAccts, ...claimAccts], [cLOW._address, cLOW._address], false, true]);
      // comp distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'niuSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await compBalance(comptroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims comp for multiple suppliers only', async () => {
      const compRemaining = niuRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(cLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(cLOW.underlying, 'approve', [cLOW._address, mintAmount], { from });
        send(cLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(cLOW, root, 1, 1, etherExp(10));
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');

      await fastForward(comptroller, deltaBlocks);

      const tx = await send(comptroller, 'claimNiu', [claimAccts, [cLOW._address], false, true]);
      // comp distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'niuSupplierIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await compBalance(comptroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims comp for multiple borrowers only, primes uninitiated', async () => {
      const compRemaining = niuRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10), borrowAmt = etherExp(1), borrowIdx = etherExp(1)
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});
      let [_,__, ...claimAccts] = saddle.accounts;

      for(let acct of claimAccts) {
        await send(cLOW, 'harnessIncrementTotalBorrows', [borrowAmt]);
        await send(cLOW, 'harnessSetAccountBorrows', [acct, borrowAmt, borrowIdx]);
      }
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');

      await send(comptroller, 'harnessFastForward', [10]);

      const tx = await send(comptroller, 'claimNiu', [claimAccts, [cLOW._address], true, false]);
      for(let acct of claimAccts) {
        expect(await call(comptroller, 'niuBorrowerIndex', [cLOW._address, acct])).toEqualNumber(etherDouble(2.25));
        expect(await call(comptroller, 'niuSupplierIndex', [cLOW._address, acct])).toEqualNumber(0);
      }
    });

    it('should revert when a market is not listed', async () => {
      const cNOT = await makeNToken({comptroller});
      await expect(
        send(comptroller, 'claimNiu', [[a1, a2], [cNOT._address], true, true])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('harnessRefreshNiuSpeeds', () => {
    it('should start out 0', async () => {
      await send(comptroller, 'harnessRefreshNiuSpeeds');
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      expect(supplySpeed).toEqualNumber(0);
      expect(borrowSpeed).toEqualNumber(0);
    });

    it('should get correct speeds with borrows', async () => {
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      const tx = await send(comptroller, 'harnessRefreshNiuSpeeds');
      const supplySpeed = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const borrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      expect(supplySpeed).toEqualNumber(niuRate);
      expect(borrowSpeed).toEqualNumber(niuRate);
      expect(tx).toHaveLog(['NiuBorrowSpeedUpdated', 0], {
        nToken: cLOW._address,
        newSpeed: borrowSpeed
      });
      expect(tx).toHaveLog(['NiuSupplySpeedUpdated', 0], {
        nToken: cLOW._address,
        newSpeed: supplySpeed
      });
    });

    it('should get correct speeds for 2 assets', async () => {
      await pretendBorrow(cLOW, a1, 1, 1, 100);
      await pretendBorrow(cZRX, a1, 1, 1, 100);
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address, cZRX._address]]);
      await send(comptroller, 'harnessRefreshNiuSpeeds');
      const supplySpeed1 = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const borrowSpeed1 = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      const supplySpeed2 = await call(comptroller, 'niuSupplySpeeds', [cREP._address]);
      const borrowSpeed2 = await call(comptroller, 'niuBorrowSpeeds', [cREP._address]);
      const supplySpeed3 = await call(comptroller, 'niuSupplySpeeds', [cZRX._address]);
      const borrowSpeed3 = await call(comptroller, 'niuBorrowSpeeds', [cZRX._address]);
      expect(supplySpeed1).toEqualNumber(niuRate.dividedBy(4));
      expect(borrowSpeed1).toEqualNumber(niuRate.dividedBy(4));
      expect(supplySpeed2).toEqualNumber(0);
      expect(borrowSpeed2).toEqualNumber(0);
      expect(supplySpeed3).toEqualNumber(niuRate.dividedBy(4).multipliedBy(3));
      expect(borrowSpeed3).toEqualNumber(niuRate.dividedBy(4).multipliedBy(3));
    });
  });

  describe('harnessSetNiuSpeeds', () => {
    it('should correctly set differing COMP supply and borrow speeds', async () => {
      const desiredNiuSupplySpeed = 3;
      const desiredNiuBorrowSpeed = 20;
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address]]);
      const tx = await send(comptroller, '_setNiuSpeeds', [[cLOW._address], [desiredNiuSupplySpeed], [desiredNiuBorrowSpeed]]);
      expect(tx).toHaveLog(['NiuBorrowSpeedUpdated', 0], {
        nToken: cLOW._address,
        newSpeed: desiredNiuBorrowSpeed
      });
      expect(tx).toHaveLog(['NiuSupplySpeedUpdated', 0], {
        nToken: cLOW._address,
        newSpeed: desiredNiuSupplySpeed
      });
      const currentNiuSupplySpeed = await call(comptroller, 'niuSupplySpeeds', [cLOW._address]);
      const currentNiuBorrowSpeed = await call(comptroller, 'niuBorrowSpeeds', [cLOW._address]);
      expect(currentNiuSupplySpeed).toEqualNumber(desiredNiuSupplySpeed);
      expect(currentNiuBorrowSpeed).toEqualNumber(desiredNiuBorrowSpeed);
    });

    it('should correctly get differing COMP supply and borrow speeds for 4 assets', async () => {
      const cBAT = await makeNToken({ comptroller, supportMarket: true });
      const cDAI = await makeNToken({ comptroller, supportMarket: true });

      const borrowSpeed1 = 5;
      const supplySpeed1 = 10;

      const borrowSpeed2 = 0;
      const supplySpeed2 = 100;

      const borrowSpeed3 = 0;
      const supplySpeed3 = 0;

      const borrowSpeed4 = 13;
      const supplySpeed4 = 0;

      await send(comptroller, 'harnessAddNiuMarkets', [[cREP._address, cZRX._address, cBAT._address, cDAI._address]]);
      await send(comptroller, '_setNiuSpeeds', [[cREP._address, cZRX._address, cBAT._address, cDAI._address], [supplySpeed1, supplySpeed2, supplySpeed3, supplySpeed4], [borrowSpeed1, borrowSpeed2, borrowSpeed3, borrowSpeed4]]);

      const currentSupplySpeed1 = await call(comptroller, 'niuSupplySpeeds', [cREP._address]);
      const currentBorrowSpeed1 = await call(comptroller, 'niuBorrowSpeeds', [cREP._address]);
      const currentSupplySpeed2 = await call(comptroller, 'niuSupplySpeeds', [cZRX._address]);
      const currentBorrowSpeed2 = await call(comptroller, 'niuBorrowSpeeds', [cZRX._address]);
      const currentSupplySpeed3 = await call(comptroller, 'niuSupplySpeeds', [cBAT._address]);
      const currentBorrowSpeed3 = await call(comptroller, 'niuBorrowSpeeds', [cBAT._address]);
      const currentSupplySpeed4 = await call(comptroller, 'niuSupplySpeeds', [cDAI._address]);
      const currentBorrowSpeed4 = await call(comptroller, 'niuBorrowSpeeds', [cDAI._address]);

      expect(currentSupplySpeed1).toEqualNumber(supplySpeed1);
      expect(currentBorrowSpeed1).toEqualNumber(borrowSpeed1);
      expect(currentSupplySpeed2).toEqualNumber(supplySpeed2);
      expect(currentBorrowSpeed2).toEqualNumber(borrowSpeed2);
      expect(currentSupplySpeed3).toEqualNumber(supplySpeed3);
      expect(currentBorrowSpeed3).toEqualNumber(borrowSpeed3);
      expect(currentSupplySpeed4).toEqualNumber(supplySpeed4);
      expect(currentBorrowSpeed4).toEqualNumber(borrowSpeed4);
    });

    const checkAccrualsBorrowAndSupply = async (compSupplySpeed, compBorrowSpeed) => {
      const mintAmount = etherUnsigned(1000e18), borrowAmount = etherUnsigned(1e18), borrowCollateralAmount = etherUnsigned(1000e18), compRemaining = niuRate.multipliedBy(100), deltaBlocks = 10;

      // Transfer COMP to the comptroller
      await send(comptroller.comp, 'transfer', [comptroller._address, compRemaining], {from: root});

      // Setup comptroller
      await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address, cUSD._address]]);

      // Set comp speeds to 0 while we setup
      await send(comptroller, '_setNiuSpeeds', [[cLOW._address, cUSD._address], [0, 0], [0, 0]]);

      // a2 - supply
      await quickMint(cLOW, a2, mintAmount); // a2 is the supplier

      // a1 - borrow (with supplied collateral)
      await quickMint(cUSD, a1, borrowCollateralAmount);
      await enterMarkets([cUSD], a1);
      await quickBorrow(cLOW, a1, borrowAmount); // a1 is the borrower

      // Initialize comp speeds
      await send(comptroller, '_setNiuSpeeds', [[cLOW._address], [compSupplySpeed], [compBorrowSpeed]]);

      // Get initial COMP balances
      const a1TotalNiuPre = await totalNiuAccrued(comptroller, a1);
      const a2TotalNiuPre = await totalNiuAccrued(comptroller, a2);

      // Start off with no COMP accrued and no COMP balance
      expect(a1TotalNiuPre).toEqualNumber(0);
      expect(a2TotalNiuPre).toEqualNumber(0);

      // Fast forward blocks
      await fastForward(comptroller, deltaBlocks);

      // Accrue COMP
      await send(comptroller, 'claimNiu', [[a1, a2], [cLOW._address], true, true]);

      // Get accrued COMP balances
      const a1TotalNiuPost = await totalNiuAccrued(comptroller, a1);
      const a2TotalNiuPost = await totalNiuAccrued(comptroller, a2);

      // check accrual for borrow
      expect(a1TotalNiuPost).toEqualNumber(Number(compBorrowSpeed) > 0 ? compBorrowSpeed.multipliedBy(deltaBlocks).minus(1) : 0);

      // check accrual for supply
      expect(a2TotalNiuPost).toEqualNumber(Number(compSupplySpeed) > 0 ? compSupplySpeed.multipliedBy(deltaBlocks) : 0);
    };

    it('should accrue comp correctly with only supply-side rewards', async () => {
      await checkAccrualsBorrowAndSupply(/* supply speed */ etherExp(0.5), /* borrow speed */ 0);
    });

    it('should accrue comp correctly with only borrow-side rewards', async () => {
      await checkAccrualsBorrowAndSupply(/* supply speed */ 0, /* borrow speed */ etherExp(0.5));
    });
  });

  describe('harnessAddNiuMarkets', () => {
    it('should correctly add a comp market if called by admin', async () => {
      const cBAT = await makeNToken({comptroller, supportMarket: true});
      const tx1 = await send(comptroller, 'harnessAddNiuMarkets', [[cLOW._address, cREP._address, cZRX._address]]);
      const tx2 = await send(comptroller, 'harnessAddNiuMarkets', [[cBAT._address]]);
      const markets = await call(comptroller, 'getNiuMarkets');
      expect(markets).toEqual([cLOW, cREP, cZRX, cBAT].map((c) => c._address));
      expect(tx2).toHaveLog('NiuBorrowSpeedUpdated', {
        nToken: cBAT._address,
        newSpeed: 1
      });
      expect(tx2).toHaveLog('NiuSupplySpeedUpdated', {
        nToken: cBAT._address,
        newSpeed: 1
      });
    });

    it('should not write over a markets existing state', async () => {
      const mkt = cLOW._address;
      const bn0 = 10, bn1 = 20;
      const idx = etherUnsigned(1.5e36);

      await send(comptroller, "harnessAddNiuMarkets", [[mkt]]);
      await send(comptroller, "setNiuSupplyState", [mkt, idx, bn0]);
      await send(comptroller, "setNiuBorrowState", [mkt, idx, bn0]);
      await send(comptroller, "setBlockNumber", [bn1]);
      await send(comptroller, "_setNiuSpeeds", [[mkt], [0], [0]]);
      await send(comptroller, "harnessAddNiuMarkets", [[mkt]]);

      const supplyState = await call(comptroller, 'niuSupplyState', [mkt]);
      expect(supplyState.block).toEqual(bn1.toString());
      expect(supplyState.index).toEqual(idx.toFixed());

      const borrowState = await call(comptroller, 'niuBorrowState', [mkt]);
      expect(borrowState.block).toEqual(bn1.toString());
      expect(borrowState.index).toEqual(idx.toFixed());
    });
  });


  describe('updateContributorRewards', () => {
    it('should not fail when contributor rewards called on non-contributor', async () => {
      const tx1 = await send(comptroller, 'updateContributorRewards', [a1]);
    });

    it('should accrue comp to contributors', async () => {
      const tx1 = await send(comptroller, '_setContributorNiuSpeed', [a1, 2000]);
      await fastForward(comptroller, 50);

      const a1Accrued = await niuAccrued(comptroller, a1);
      expect(a1Accrued).toEqualNumber(0);

      const tx2 = await send(comptroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued2 = await niuAccrued(comptroller, a1);
      expect(a1Accrued2).toEqualNumber(50 * 2000);
    });

    it('should accrue comp with late set', async () => {
      await fastForward(comptroller, 1000);
      const tx1 = await send(comptroller, '_setContributorNiuSpeed', [a1, 2000]);
      await fastForward(comptroller, 50);

      const tx2 = await send(comptroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued2 = await niuAccrued(comptroller, a1);
      expect(a1Accrued2).toEqualNumber(50 * 2000);
    });
  });

  describe('_setContributorNiuSpeed', () => {
    it('should revert if not called by admin', async () => {
      await expect(
        send(comptroller, '_setContributorNiuSpeed', [a1, 1000], {from: a1})
      ).rejects.toRevert('revert only admin can set comp speed');
    });

    it('should start comp stream if called by admin', async () => {
      const tx = await send(comptroller, '_setContributorNiuSpeed', [a1, 1000]);
      expect(tx).toHaveLog('ContributorNiuSpeedUpdated', {
        contributor: a1,
        newSpeed: 1000
      });
    });

    it('should reset comp stream if set to 0', async () => {
      const tx1 = await send(comptroller, '_setContributorNiuSpeed', [a1, 2000]);
      await fastForward(comptroller, 50);

      const tx2 = await send(comptroller, '_setContributorNiuSpeed', [a1, 0]);
      await fastForward(comptroller, 50);

      const tx3 = await send(comptroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued = await niuAccrued(comptroller, a1);
      expect(a1Accrued).toEqualNumber(50 * 2000);
    });
  });
});
