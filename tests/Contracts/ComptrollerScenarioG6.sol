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

    function membershipLength(NToken nToken) public view returns (uint) {
        return accountAssets[address(nToken)].length;
    }

    function unlist(NToken nToken) public {
        markets[address(nToken)].isListed = false;
    }

    function setNiuSpeed(address nToken, uint compSpeed) public {
        compSpeeds[nToken] = compSpeed;
    }
}
