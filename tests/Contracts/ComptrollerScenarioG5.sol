pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG5.sol";

contract NiutrollerScenarioG5 is NiutrollerG5 {
    uint public blockNumber;
    address public compAddress;

    constructor() NiutrollerG5() public {}

    function setNiuAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return compAddress;
    }

    function membershipLength(NToken nToken) public view returns (uint) {
        return accountAssets[address(nToken)].length;
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

    function unlist(NToken nToken) public {
        markets[address(nToken)].isListed = false;
    }
}
