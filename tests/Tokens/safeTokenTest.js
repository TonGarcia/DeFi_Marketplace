const {
  makeNToken,
  getBalances,
  adjustBalances
} = require('../Utils/Niural');

const exchangeRate = 5;

describe('CEther', function () {
  let root, nonRoot, accounts;
  let nToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = saddle.accounts;
    nToken = await makeNToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
  });

  describe("getCashPrior", () => {
    it("returns the amount of ether held by the nEther contract before the current message", async () => {
      expect(await call(nToken, 'harnessGetCashPrior', [], {value: 100})).toEqualNumber(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(await call(nToken, 'harnessDoTransferIn', [root, 100], {value: 100})).toEqualNumber(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(call(nToken, 'harnessDoTransferIn', [nonRoot, 100], {value: 100})).rejects.toRevert("revert sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(call(nToken, 'harnessDoTransferIn', [root, 77], {value: 100})).rejects.toRevert("revert value mismatch");
    });

    describe("doTransferOut", () => {
      it("transfers ether out", async () => {
        const beforeBalances = await getBalances([nToken], [nonRoot]);
        const receipt = await send(nToken, 'harnessDoTransferOut', [nonRoot, 77], {value: 77});
        const afterBalances = await getBalances([nToken], [nonRoot]);
        expect(receipt).toSucceed();
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [nToken, nonRoot, 'eth', 77]
        ]));
      });

      it("reverts if it fails", async () => {
        await expect(call(nToken, 'harnessDoTransferOut', [root, 77], {value: 0})).rejects.toRevert();
      });
    });
  });
});
