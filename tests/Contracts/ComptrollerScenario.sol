pragma solidity ^0.5.16;

import "../../contracts/Niutroller.sol";

contract NiutrollerScenario is Niutroller {
    uint public blockNumber;
    address public niuAddress;

    constructor() Niutroller() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setNiuAddress(address niuAddress_) public {
        niuAddress = niuAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return niuAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function membershipLength(NToken NToken) public view returns (uint) {
        return accountAssets[address(NToken)].length;
    }

    function unlist(NToken NToken) public {
        markets[address(NToken)].isListed = false;
    }

    function setNiuBorrowerIndex(address NToken, address borrower, uint index) public {
        niuBorrowerIndex[NToken][borrower] = index;
    }

    function setNiuSupplierIndex(address NToken, address supplier, uint index) public {
        niuSupplierIndex[NToken][supplier] = index;
    }

    /**
     * @notice Recalculate and update COMP speeds for all COMP markets
     */
    function refreshNiuSpeeds() public {
        NToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken NToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: NToken.borrowIndex()});
            updateNiuSupplyIndex(address(NToken));
            updateNiuBorrowIndex(address(NToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken NToken = allMarkets_[i];
            if (niuSupplySpeeds[address(NToken)] > 0 || niuBorrowSpeeds[address(NToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(NToken)});
                Exp memory utility = mul_(assetPrice, NToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            NToken NToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(niuRate, div_(utilities[i], totalUtility)) : 0;
            setNiuSpeedInternal(NToken, newSpeed, newSpeed);
        }
    }
}
