pragma solidity ^0.5.16;

import "../../contracts/PriceOracle.sol";

contract FixedPriceOracle is PriceOracle {
    uint public price;

    constructor(uint _price) public {
        price = _price;
    }

    function getUnderlyingPrice(NToken NToken) public view returns (uint) {
        NToken;
        return price;
    }

    function assetPrices(address asset) public view returns (uint) {
        asset;
        return price;
    }
}
