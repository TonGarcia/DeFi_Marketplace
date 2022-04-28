"use strict";

const { dfn } = require('./JS');
const {
  encodeParameters,
  etherBalance,
  etherMantissa,
  etherUnsigned,
  mergeInterface
} = require('./Ethereum');
const BigNumber = require('bignumber.js');

async function makeNiutroller(opts = {}) {
  const {
    root = saddle.account,
    kind = 'unitroller'
  } = opts || {};

  if (kind == 'bool') {
    return await deploy('BoolNiutroller');
  }

  if (kind == 'false-marker') {
    return await deploy('FalseMarkerMethodNiutroller');
  }

  if (kind == 'v1-no-proxy') {
    const comptroller = await deploy('NiutrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));

    await send(comptroller, '_setCloseFactor', [closeFactor]);
    await send(comptroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(comptroller, { priceOracle });
  }

  if (kind == 'unitroller-g2') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('NiutrollerScenarioG2');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g3') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('NiutrollerScenarioG3');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);
    const niuRate = etherUnsigned(dfn(opts.niuRate, 1e18));
    const compMarkets = opts.compMarkets || [];
    const otherMarkets = opts.otherMarkets || [];

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address, niuRate, compMarkets, otherMarkets]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g6') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('NiutrollerScenarioG6');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const comp = opts.comp || await deploy('Niu', [opts.compOwner || root]);
    const niuRate = etherUnsigned(dfn(opts.niuRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, '_setNiuRate', [niuRate]);
    await send(unitroller, 'setNiuAddress', [comp._address]); // harness only

    return Object.assign(unitroller, { priceOracle, comp });
  }

  if (kind == 'unitroller') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('NiutrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const comp = opts.comp || await deploy('Niu', [opts.compOwner || root]);
    const niuRate = etherUnsigned(dfn(opts.niuRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, 'setNiuAddress', [comp._address]); // harness only
    await send(unitroller, 'harnessSetNiuRate', [niuRate]);

    return Object.assign(unitroller, { priceOracle, comp });
  }
}

async function makeNToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'cerc20'
  } = opts || {};

  const comptroller = opts.comptroller || await makeNiutroller(opts.comptrollerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === 'cether' ? 'cETH' : 'cOMG');
  const name = opts.name || `NToken ${symbol}`;
  const admin = opts.admin || root;

  let nToken, underlying;
  let cDelegator, cDelegatee, cDaiMaker;

  switch (kind) {
    case 'cether':
      nToken = await deploy('CEtherHarness',
        [
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ])
      break;

    case 'cdai':
      cDaiMaker  = await deploy('CDaiDelegateMakerHarness');
      underlying = cDaiMaker;
      cDelegatee = await deploy('CDaiDelegateHarness');
      cDelegator = await deploy('NErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          encodeParameters(['address', 'address'], [cDaiMaker._address, cDaiMaker._address])
        ]
      );
      nToken = await saddle.getContractAt('CDaiDelegateHarness', cDelegator._address);
      break;
    
    case 'ccomp':
      underlying = await deploy('Niu', [opts.compHolder || root]);
      cDelegatee = await deploy('NErc20DelegateHarness');
      cDelegator = await deploy('NErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      nToken = await saddle.getContractAt('NErc20DelegateHarness', cDelegator._address);
      break;

    case 'cerc20':
    default:
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      cDelegatee = await deploy('NErc20DelegateHarness');
      cDelegator = await deploy('NErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      nToken = await saddle.getContractAt('NErc20DelegateHarness', cDelegator._address);
      break;
      
  }

  if (opts.supportMarket) {
    await send(comptroller, '_supportMarket', [nToken._address]);
  }

  if (opts.addNiuMarket) {
    await send(comptroller, '_addNiuMarket', [nToken._address]);
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await send(comptroller.priceOracle, 'setUnderlyingPrice', [nToken._address, price]);
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    expect(await send(comptroller, '_setCollateralFactor', [nToken._address, factor])).toSucceed();
  }

  return Object.assign(nToken, { name, symbol, underlying, comptroller, interestRateModel });
}

async function makeInterestRateModel(opts = {}) {
  const {
    root = saddle.account,
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('InterestRateModelHarness', [borrowRate]);
  }

  if (kind == 'false-marker') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('FalseMarkerMethodInterestRateModel', [borrowRate]);
  }

  if (kind == 'white-paper') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    return await deploy('WhitePaperInterestRateModel', [baseRate, multiplier]);
  }

  if (kind == 'jump-rate') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink = etherMantissa(dfn(opts.kink, 0));
    return await deploy('JumpRateModel', [baseRate, multiplier, jump, kink]);
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = saddle.account,
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    return await deploy('SimplePriceOracle');
  }
}

async function makeToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'erc20'
  } = opts || {};

  if (kind == 'erc20') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Erc20 ${symbol}`;
    return await deploy('ERC20Harness', [quantity, name, decimals, symbol]);
  }
}

async function balanceOf(token, account) {
  return etherUnsigned(await call(token, 'balanceOf', [account]));
}

async function totalSupply(token) {
  return etherUnsigned(await call(token, 'totalSupply'));
}

async function borrowSnapshot(nToken, account) {
  const { principal, interestIndex } = await call(nToken, 'harnessAccountBorrows', [account]);
  return { principal: etherUnsigned(principal), interestIndex: etherUnsigned(interestIndex) };
}

async function totalBorrows(nToken) {
  return etherUnsigned(await call(nToken, 'totalBorrows'));
}

async function totalReserves(nToken) {
  return etherUnsigned(await call(nToken, 'totalReserves'));
}

async function enterMarkets(nTokens, from) {
  return await send(nTokens[0].comptroller, 'enterMarkets', [nTokens.map(c => c._address)], { from });
}

async function fastForward(nToken, blocks = 5) {
  return await send(nToken, 'harnessFastForward', [blocks]);
}

async function setBalance(nToken, account, balance) {
  return await send(nToken, 'harnessSetBalance', [account, balance]);
}

async function setEtherBalance(nEther, balance) {
  const current = await etherBalance(nEther._address);
  const root = saddle.account;
  expect(await send(nEther, 'harnessDoTransferOut', [root, current])).toSucceed();
  expect(await send(nEther, 'harnessDoTransferIn', [root, balance], { value: balance })).toSucceed();
}

async function getBalances(nTokens, accounts) {
  const balances = {};
  for (let nToken of nTokens) {
    const cBalances = balances[nToken._address] = {};
    for (let account of accounts) {
      cBalances[account] = {
        eth: await etherBalance(account),
        cash: nToken.underlying && await balanceOf(nToken.underlying, account),
        tokens: await balanceOf(nToken, account),
        borrows: (await borrowSnapshot(nToken, account)).principal
      };
    }
    cBalances[nToken._address] = {
      eth: await etherBalance(nToken._address),
      cash: nToken.underlying && await balanceOf(nToken.underlying, nToken._address),
      tokens: await totalSupply(nToken),
      borrows: await totalBorrows(nToken),
      reserves: await totalReserves(nToken)
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let nToken, account, key, diff;
    if (delta.length == 4) {
      ([nToken, account, key, diff] = delta);
    } else {
      ([nToken, key, diff] = delta);
      account = nToken._address;
    }
    balances[nToken._address][account][key] = new BigNumber(balances[nToken._address][account][key]).plus(diff);
  }
  return balances;
}


async function preApprove(nToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(nToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(nToken.underlying, 'approve', [nToken._address, amount], { from });
}

async function quickMint(nToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(nToken, 1);

  if (dfn(opts.approve, true)) {
    expect(await preApprove(nToken, minter, mintAmount, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(nToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(nToken, 'mint', [mintAmount], { from: minter });
}

async function quickBorrow(nToken, minter, borrowAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(nToken, 1);

  if (dfn(opts.exchangeRate))
    expect(await send(nToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();

  return send(nToken, 'borrow', [borrowAmount], { from: minter });
}


async function preSupply(nToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    expect(await send(nToken, 'harnessSetTotalSupply', [tokens])).toSucceed();
  }
  return send(nToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(nToken, redeemer, redeemTokens, opts = {}) {
  await fastForward(nToken, 1);

  if (dfn(opts.supply, true)) {
    expect(await preSupply(nToken, redeemer, redeemTokens, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(nToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(nToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(nToken, redeemer, redeemAmount, opts = {}) {
  await fastForward(nToken, 1);

  if (dfn(opts.exchangeRate)) {
    expect(await send(nToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(nToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(nToken, price) {
  return send(nToken.comptroller.priceOracle, 'setUnderlyingPrice', [nToken._address, etherMantissa(price)]);
}

async function setBorrowRate(nToken, rate) {
  return send(nToken.interestRateModel, 'setBorrowRate', [etherMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(etherUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(etherUnsigned));
}

async function pretendBorrow(nToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(nToken, 'harnessSetTotalBorrows', [etherUnsigned(principalRaw)]);
  await send(nToken, 'harnessSetAccountBorrows', [borrower, etherUnsigned(principalRaw), etherMantissa(accountIndex)]);
  await send(nToken, 'harnessSetBorrowIndex', [etherMantissa(marketIndex)]);
  await send(nToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(nToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber)]);
}

module.exports = {
  makeNiutroller,
  makeNToken,
  makeInterestRateModel,
  makePriceOracle,
  makeToken,

  balanceOf,
  totalSupply,
  borrowSnapshot,
  totalBorrows,
  totalReserves,
  enterMarkets,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,

  preApprove,
  quickMint,
  quickBorrow,

  preSupply,
  quickRedeem,
  quickRedeemUnderlying,

  setOraclePrice,
  setBorrowRate,
  getBorrowRate,
  getSupplyRate,
  pretendBorrow
};
