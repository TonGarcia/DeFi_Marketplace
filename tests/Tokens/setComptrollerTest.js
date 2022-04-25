const {
  makeNiutroller,
  makeCToken
} = require('../Utils/Niural');

describe('CToken', function () {
  let root, accounts;
  let cToken, oldNiutroller, newNiutroller;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    cToken = await makeCToken();
    oldNiutroller = cToken.comptroller;
    newNiutroller = await makeNiutroller();
    expect(newNiutroller._address).not.toEqual(oldNiutroller._address);
  });

  describe('_setNiutroller', () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(cToken, '_setNiutroller', [newNiutroller._address], { from: accounts[0] })
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_COMPTROLLER_OWNER_CHECK');
      expect(await call(cToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("reverts if passed a contract that doesn't implement isNiutroller", async () => {
      await expect(send(cToken, '_setNiutroller', [cToken.underlying._address])).rejects.toRevert("revert");
      expect(await call(cToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("reverts if passed a contract that implements isNiutroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badNiutroller = await makeNiutroller({ kind: 'false-marker' });
      await expect(send(cToken, '_setNiutroller', [badNiutroller._address])).rejects.toRevert("revert marker method returned false");
      expect(await call(cToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("updates comptroller and emits log on success", async () => {
      const result = await send(cToken, '_setNiutroller', [newNiutroller._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewNiutroller', {
        oldNiutroller: oldNiutroller._address,
        newNiutroller: newNiutroller._address
      });
      expect(await call(cToken, 'comptroller')).toEqual(newNiutroller._address);
    });
  });
});
