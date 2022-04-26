const {
  makeNiutroller,
  makeNToken
} = require('../Utils/Niural');

describe('NToken', function () {
  let root, accounts;
  let nToken, oldNiutroller, newNiutroller;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    nToken = await makeNToken();
    oldNiutroller = nToken.comptroller;
    newNiutroller = await makeNiutroller();
    expect(newNiutroller._address).not.toEqual(oldNiutroller._address);
  });

  describe('_setNiutroller', () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(nToken, '_setNiutroller', [newNiutroller._address], { from: accounts[0] })
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_COMPTROLLER_OWNER_CHECK');
      expect(await call(nToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("reverts if passed a contract that doesn't implement isNiutroller", async () => {
      await expect(send(nToken, '_setNiutroller', [nToken.underlying._address])).rejects.toRevert("revert");
      expect(await call(nToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("reverts if passed a contract that implements isNiutroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badNiutroller = await makeNiutroller({ kind: 'false-marker' });
      await expect(send(nToken, '_setNiutroller', [badNiutroller._address])).rejects.toRevert("revert marker method returned false");
      expect(await call(nToken, 'comptroller')).toEqual(oldNiutroller._address);
    });

    it("updates comptroller and emits log on success", async () => {
      const result = await send(nToken, '_setNiutroller', [newNiutroller._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewNiutroller', {
        oldNiutroller: oldNiutroller._address,
        newNiutroller: newNiutroller._address
      });
      expect(await call(nToken, 'comptroller')).toEqual(newNiutroller._address);
    });
  });
});
