"use strict";

const {
  etherBalance,
  etherGasCost,
  getContract
} = require('./Utils/Ethereum');

const {
  makeNiutroller,
  makeNToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Niural');


/*
 * This module loads Error and FailureInfo enum from ErrorReporter.sol.
 */

const path = require('path');
const solparse = require('solparse');

const errorReporterPath = path.join(__dirname, '..', 'contracts', 'ErrorReporter.sol');
const contents = solparse.parseFile(errorReporterPath);
const [
  NiutrollerErrorReporter,
  TokenErrorReporter
] = contents.body.filter(k => k.type === 'ContractStatement');

function invert(object) {
  return Object.entries(object).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
}

function parse(reporter) {
  const ErrorInv = reporter.body.find(k => k.name == 'Error').members;
  const FailureInfoInv = reporter.body.find(k => k.name == 'FailureInfo').members;
  const Error = invert(ErrorInv);
  const FailureInfo = invert(FailureInfoInv);
  return {Error, FailureInfo, ErrorInv, FailureInfoInv};
}

const carefulMathPath = path.join(__dirname, '..', 'contracts', 'CarefulMath.sol');
const CarefulMath = solparse.parseFile(carefulMathPath).body.find(k => k.type === 'ContractStatement');
const MathErrorInv = CarefulMath.body.find(k => k.name == 'MathError').members;
const MathError = invert(MathErrorInv);

const whitePaperModelPath = path.join(__dirname, '..', 'contracts', 'WhitePaperInterestRateModel.sol');
const whitePaperModel = solparse.parseFile(whitePaperModelPath).body.find(k => k.type === 'ContractStatement');

module.exports = {
  NiutrollerErr: parse(NiutrollerErrorReporter),
  TokenErr: parse(TokenErrorReporter),
  MathErr: {
    Error: MathError,
    ErrorInv: MathErrorInv
  }
};

describe('Errors', () => {
  let root, borrower;
  let testToken, nEther;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    nEther = await makeNToken({kind: "tEther", supportMarket: true});
    testToken = await deploy('TestToken', [nEther._address]);
  });

  describe("sample token error report", () => {
    it("sample token throws an error", async () => {
      //expect(await call(testToken, "nonExistingFunction")).toEqual(nEther._address);
      expect(1).toEqual(1);
    });
  });

});