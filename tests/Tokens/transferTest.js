const {makeNToken} = require('../Utils/Niural');

describe('NToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const NToken = await makeNToken({supportMarket: true});
      expect(await call(NToken, 'balanceOf', [root])).toEqualNumber(0);
      expect(await send(NToken, 'transfer', [accounts[0], 100])).toHaveTokenFailure('MATH_ERROR', 'TRANSFER_NOT_ENOUGH');
    });

    it("transfers 50 tokens", async () => {
      const NToken = await makeNToken({supportMarket: true});
      await send(NToken, 'harnessSetBalance', [root, 100]);
      expect(await call(NToken, 'balanceOf', [root])).toEqualNumber(100);
      await send(NToken, 'transfer', [accounts[0], 50]);
      expect(await call(NToken, 'balanceOf', [root])).toEqualNumber(50);
      expect(await call(NToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const NToken = await makeNToken({supportMarket: true});
      await send(NToken, 'harnessSetBalance', [root, 100]);
      expect(await call(NToken, 'balanceOf', [root])).toEqualNumber(100);
      expect(await send(NToken, 'transfer', [root, 50])).toHaveTokenFailure('BAD_INPUT', 'TRANSFER_NOT_ALLOWED');
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const NToken = await makeNToken({comptrollerOpts: {kind: 'bool'}});
      await send(NToken, 'harnessSetBalance', [root, 100]);
      expect(await call(NToken, 'balanceOf', [root])).toEqualNumber(100);

      await send(NToken.comptroller, 'setTransferAllowed', [false])
      expect(await send(NToken, 'transfer', [root, 50])).toHaveTrollReject('TRANSFER_COMPTROLLER_REJECTION');

      await send(NToken.comptroller, 'setTransferAllowed', [true])
      await send(NToken.comptroller, 'setTransferVerify', [false])
      // no longer support verifyTransfer on NToken end
      // await expect(send(NToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });
  });
});