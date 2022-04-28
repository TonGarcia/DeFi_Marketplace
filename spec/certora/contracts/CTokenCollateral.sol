pragma solidity ^0.5.16;

import "../../../contracts/NErc20Immutable.sol";
import "../../../contracts/EIP20Interface.sol";

contract NTokenCollateral is NErc20Immutable {
    constructor(address underlying_,
                NiutrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public NErc20Immutable(underlying_, comptroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }

    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
