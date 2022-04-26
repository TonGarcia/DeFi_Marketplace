pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG4.sol";

contract NiutrollerScenarioG4 is NiutrollerG4 {
    uint public blockNumber;
    address public compAddress;

    constructor() NiutrollerG4() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function membershipLength(NToken nToken) public view returns (uint) {
        return accountAssets[address(nToken)].length;
    }

    function unlist(NToken nToken) public {
        markets[address(nToken)].isListed = false;
    }
}
