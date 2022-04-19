const {
  makeNToken,
  getBalances,
  adjustBalances
} = require('../Utils/Niural');

const exchangeRate = 5;

describe('CEther', function () {
  let root, nonRoot, accounts;
  let NToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = saddle.accounts;
    NToken = await makeNToken({kind: 'cether', comptrollerOpts: {kind: 'bool'}});
  });

  describe("getCashPrior", () => {
    it("returns the amount of ether held by the cEther contract before the current message", async () => {
      expect(await call(NToken, 'harnessGetCashPrior', [], {value: 100})).toEqualNumber(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(await call(NToken, 'harnessDoTransferIn', [root, 100], {value: 100})).toEqualNumber(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(call(NToken, 'harnessDoTransferIn', [nonRoot, 100], {value: 100})).rejects.toRevert("revert sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(call(NToken, 'harnessDoTransferIn', [root, 77], {value: 100})).rejects.toRevert("revert value mismatch");
    });

    describe("doTransferOut", () => {
      it("transfers ether out", async () => {
        const beforeBalances = await getBalances([NToken], [nonRoot]);
        const receipt = await send(NToken, 'harnessDoTransferOut', [nonRoot, 77], {value: 77});
        const afterBalances = await getBalances([NToken], [nonRoot]);
        expect(receipt).toSucceed();
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [NToken, nonRoot, 'eth', 77]
        ]));
      });

      it("reverts if it fails", async () => {
        await expect(call(NToken, 'harnessDoTransferOut', [root, 77], {value: 0})).rejects.toRevert();
      });
    });
  });
});
