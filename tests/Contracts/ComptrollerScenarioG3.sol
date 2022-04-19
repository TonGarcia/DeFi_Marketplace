pragma solidity ^0.5.16;

import "../../contracts/NiutrollerG3.sol";

contract NiutrollerScenarioG3 is NiutrollerG3 {
    uint public blockNumber;
    address public niuAddress;

    constructor() NiutrollerG3() public {}

    function setNiuAddress(address niuAddress_) public {
        niuAddress = niuAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return niuAddress;
    }

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

        address[] memory niuMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isNiued) {
                niuMarkets[k++] = address(allMarkets[i]);
            }
        }
        return niuMarkets;
    }

    function unlist(NToken NToken) public {
        markets[address(NToken)].isListed = false;
    }
}
