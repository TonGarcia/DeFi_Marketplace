pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG3.sol";

contract NiutrollerScenarioG3 is NiutrollerG3 {
    uint public blockNumber;
    address public compAddress;

    constructor() NiutrollerG3() public {}

    function setNiuAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return compAddress;
    }

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function getNiuMarkets() public view returns (address[] memory) {
        uint m = allMarkets.length;
        uint n = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isNiued) {
                n++;
            }
        }

        address[] memory compMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isNiued) {
                compMarkets[k++] = address(allMarkets[i]);
            }
        }
        return compMarkets;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
