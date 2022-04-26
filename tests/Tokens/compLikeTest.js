const {
  makeNToken,
} = require('../Utils/Niural');


describe('CNiuLikeDelegate', function () {
  describe("_delegateNiuLikeTo", () => {
    it("does not delegate if not the admin", async () => {
      const [root, a1] = saddle.accounts;
      const nToken = await makeNToken({kind: 'ccomp'});
      await expect(send(nToken, '_delegateNiuLikeTo', [a1], {from: a1})).rejects.toRevert('revert only the admin may set the comp-like delegate');
    });

    it("delegates successfully if the admin", async () => {
      const [root, a1] = saddle.accounts, amount = 1;
      const cCOMP = await makeNToken({kind: 'ccomp'}), COMP = cCOMP.underlying;
      const tx1 = await send(cCOMP, '_delegateNiuLikeTo', [a1]);
      const tx2 = await send(COMP, 'transfer', [cCOMP._address, amount]);
      await expect(await call(COMP, 'getCurrentVotes', [a1])).toEqualNumber(amount);
    });
  });
});