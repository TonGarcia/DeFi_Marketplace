pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG2.sol";

contract NiutrollerScenarioG2 is NiutrollerG2 {
    uint public blockNumber;
    address public niuAddress;

    constructor() NiutrollerG2() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }
}
