pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG6.sol";

contract NiutrollerScenarioG6 is NiutrollerG6 {
    uint public blockNumber;
    address public compAddress;

    constructor() NiutrollerG6() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setNiuAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return compAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }

    function setNiuSpeed(address cToken, uint compSpeed) public {
        compSpeeds[cToken] = compSpeed;
    }
}
