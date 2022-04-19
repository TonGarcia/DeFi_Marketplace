pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG1.sol";
import "../../contracts/PriceOracle.sol";

// XXX we should delete G1 everything...
//  requires fork/deploy bytecode tests

contract NiutrollerScenarioG1 is NiutrollerG1 {
    uint public blockNumber;

    constructor() NiutrollerG1() public {}

    function membershipLength(NToken NToken) public view returns (uint) {
        return accountAssets[address(NToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function _become(
        Unitroller unitroller,
        PriceOracle _oracle,
        uint _closeFactorMantissa,
        uint _maxAssets,
        bool reinitializing) public {
        super._become(unitroller, _oracle, _closeFactorMantissa, _maxAssets, reinitializing);
    }

    function getHypotheticalAccountLiquidity(
        address account,
        address NTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) =
            super.getHypotheticalAccountLiquidityInternal(account, NToken(NTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }

    function unlist(NToken NToken) public {
        markets[address(NToken)].isListed = false;
    }
}
