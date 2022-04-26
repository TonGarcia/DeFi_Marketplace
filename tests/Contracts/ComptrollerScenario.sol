pragma solidity ^0.5.16;

import "../../contracts/Niutroller.sol";

contract NiutrollerScenario is Niutroller {
    uint public blockNumber;
    address public compAddress;

    constructor() Niutroller() public {}

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

    function setNiuBorrowerIndex(address nToken, address borrower, uint index) public {
        compBorrowerIndex[nToken][borrower] = index;
    }

    function setNiuSupplierIndex(address nToken, address supplier, uint index) public {
        compSupplierIndex[nToken][supplier] = index;
    }

    /**
     * @notice Recalculate and update COMP speeds for all COMP markets
     */
    function refreshNiuSpeeds() public {
        NToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken nToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: nToken.borrowIndex()});
            updateNiuSupplyIndex(address(nToken));
            updateNiuBorrowIndex(address(nToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken nToken = allMarkets_[i];
            if (compSupplySpeeds[address(nToken)] > 0 || compBorrowSpeeds[address(nToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(nToken)});
                Exp memory utility = mul_(assetPrice, nToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken nToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(compRate, div_(utilities[i], totalUtility)) : 0;
            setNiuSpeedInternal(nToken, newSpeed, newSpeed);
        }
    }
}
