const {
  etherUnsigned,
  etherMantissa,
  etherExp,
} = require('./Utils/Ethereum');

const {
  makeNiutroller,
  makeNToken,
  preApprove,
  preSupply,
  quickRedeem,
} = require('./Utils/Niural');

async function compBalance(comptroller, user) {
  return etherUnsigned(await call(comptroller.comp, 'balanceOf', [user]))
}

async function niuAccrued(comptroller, user) {
  return etherUnsigned(await call(comptroller, 'niuAccrued', [user]));
}

async function fastForwardPatch(patch, comptroller, blocks) {
  if (patch == 'unitroller') {
    return await send(comptroller, 'harnessFastForward', [blocks]);
  } else {
    return await send(comptroller, 'fastForward', [blocks]);
  }
}

const fs = require('fs');
const util = require('util');
const diffStringsUnified = require('jest-diff').default;


async function preRedeem(
  nToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(nToken, redeemer, redeemTokens);
  await send(nToken.underlying, 'harnessSetBalance', [
    nToken._address,
    redeemAmount
  ]);
}

const sortOpcodes = (opcodesMap) => {
  return Object.values(opcodesMap)
    .map(elem => [elem.fee, elem.name])
    .sort((a, b) => b[0] - a[0]);
};

const getGasCostFile = name => {
  try {
    const jsonString = fs.readFileSync(name);
    return JSON.parse(jsonString);
  } catch (err) {
    console.log(err);
    return {};
  }
};

const recordGasCost = (totalFee, key, filename, opcodes = {}) => {
  let fileObj = getGasCostFile(filename);
  const newCost = {fee: totalFee, opcodes: opcodes};
  console.log(diffStringsUnified(fileObj[key], newCost));
  fileObj[key] = newCost;
  fs.writeFileSync(filename, JSON.stringify(fileObj, null, ' '), 'utf-8');
};

async function mint(nToken, minter, mintAmount, exchangeRate) {
  expect(await preApprove(nToken, minter, mintAmount, {})).toSucceed();
  return send(nToken, 'mint', [mintAmount], { from: minter });
}

async function claimNiu(comptroller, holder) {
  return send(comptroller, 'claimNiu', [holder], { from: holder });
}

/// GAS PROFILER: saves a digest of the gas prices of common NToken operations
/// transiently fails, not sure why

describe('Gas report', () => {
  let root, minter, redeemer, accounts, nToken;
  const exchangeRate = 50e3;
  const preMintAmount = etherUnsigned(30e4);
  const mintAmount = etherUnsigned(10e4);
  const mintTokens = mintAmount.div(exchangeRate);
  const redeemTokens = etherUnsigned(10e3);
  const redeemAmount = redeemTokens.multipliedBy(exchangeRate);
  const filename = './gasCosts.json';

  describe('NToken', () => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      nToken = await makeNToken({
        comptrollerOpts: { kind: 'bool'}, 
        interestRateModelOpts: { kind: 'white-paper'},
        exchangeRate
      });
    });

    it('first mint', async () => {
      await send(nToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(nToken, 'harnessSetBlockNumber', [41]);

      const trxReceipt = await mint(nToken, minter, mintAmount, exchangeRate);
      recordGasCost(trxReceipt.gasUsed, 'first mint', filename);
    });

    it('second mint', async () => {
      await mint(nToken, minter, mintAmount, exchangeRate);

      await send(nToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(nToken, 'harnessSetBlockNumber', [41]);

      const mint2Receipt = await mint(nToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['AccrueInterest', 'Transfer', 'Mint']);

      console.log(mint2Receipt.gasUsed);
      const opcodeCount = {};

      await saddle.trace(mint2Receipt, {
        execLog: log => {
          if (log.lastLog != undefined) {
            const key = `${log.op} @ ${log.gasCost}`;
            opcodeCount[key] = (opcodeCount[key] || 0) + 1;
          }
        }
      });

      recordGasCost(mint2Receipt.gasUsed, 'second mint', filename, opcodeCount);
    });

    it('second mint, no interest accrued', async () => {
      await mint(nToken, minter, mintAmount, exchangeRate);

      await send(nToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(nToken, 'harnessSetBlockNumber', [40]);

      const mint2Receipt = await mint(nToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['Transfer', 'Mint']);
      recordGasCost(mint2Receipt.gasUsed, 'second mint, no interest accrued', filename);

      // console.log("NO ACCRUED");
      // const opcodeCount = {};
      // await saddle.trace(mint2Receipt, {
      //   execLog: log => {
      //     opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
      //   }
      // });
      // console.log(getOpcodeDigest(opcodeCount));
    });

    it('redeem', async () => {
      await preRedeem(nToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      const trxReceipt = await quickRedeem(nToken, redeemer, redeemTokens);
      recordGasCost(trxReceipt.gasUsed, 'redeem', filename);
    });

    it.skip('print mint opcode list', async () => {
      await preMint(nToken, minter, mintAmount, mintTokens, exchangeRate);
      const trxReceipt = await quickMint(nToken, minter, mintAmount);
      const opcodeCount = {};
      await saddle.trace(trxReceipt, {
        execLog: log => {
          opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
        }
      });
      console.log(getOpcodeDigest(opcodeCount));
    });
  });

  describe.each([
    ['unitroller-g6'],
    ['unitroller']
  ])('Niu claims %s', (patch) => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      comptroller = await makeNiutroller({ kind: patch });
      let interestRateModelOpts = {borrowRate: 0.000001};
      nToken = await makeNToken({comptroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
      if (patch == 'unitroller') {
        await send(comptroller, '_setNiuSpeeds', [[nToken._address], [etherExp(0.05)], [etherExp(0.05)]]);
      } else {
        await send(comptroller, '_addNiuMarkets', [[nToken].map(c => c._address)]);
        await send(comptroller, 'setNiuSpeed', [nToken._address, etherExp(0.05)]);
      }
      await send(comptroller.comp, 'transfer', [comptroller._address, etherUnsigned(50e18)], {from: root});
    });

    it(`${patch} second mint with comp accrued`, async () => {
      await mint(nToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, comptroller, 10);

      console.log('Niu balance before mint', (await compBalance(comptroller, minter)).toString());
      console.log('Niu accrued before mint', (await niuAccrued(comptroller, minter)).toString());
      const mint2Receipt = await mint(nToken, minter, mintAmount, exchangeRate);
      console.log('Niu balance after mint', (await compBalance(comptroller, minter)).toString());
      console.log('Niu accrued after mint', (await niuAccrued(comptroller, minter)).toString());
      recordGasCost(mint2Receipt.gasUsed, `${patch} second mint with comp accrued`, filename);
    });

    it(`${patch} claim comp`, async () => {
      await mint(nToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, comptroller, 10);

      console.log('Niu balance before claim', (await compBalance(comptroller, minter)).toString());
      console.log('Niu accrued before claim', (await niuAccrued(comptroller, minter)).toString());
      const claimReceipt = await claimNiu(comptroller, minter);
      console.log('Niu balance after claim', (await compBalance(comptroller, minter)).toString());
      console.log('Niu accrued after claim', (await niuAccrued(comptroller, minter)).toString());
      recordGasCost(claimReceipt.gasUsed, `${patch} claim comp`, filename);
    });
  });
});
