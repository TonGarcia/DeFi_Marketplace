pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./NErc20.sol";

contract SimplePriceOracle is PriceOracle {
    mapping(address => uint) prices;
    event PricePosted(address asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);

    function _getUnderlyingAddress(NToken nToken) private view returns (address) {
        address asset;
        if (compareStrings(nToken.symbol(), "cETH")) {
            asset = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        } else {
            asset = address(NErc20(address(nToken)).underlying());
        }
        return asset;
    }

    function getUnderlyingPrice(NToken nToken) public view returns (uint) {
        return prices[_getUnderlyingAddress(nToken)];
    }

    function setUnderlyingPrice(NToken nToken, uint underlyingPriceMantissa) public {
        address asset = _getUnderlyingAddress(nToken);
        emit PricePosted(asset, prices[asset], underlyingPriceMantissa, underlyingPriceMantissa);
        prices[asset] = underlyingPriceMantissa;
    }

    function setDirectPrice(address asset, uint price) public {
        emit PricePosted(asset, prices[asset], price, price);
        prices[asset] = price;
    }

    // v1 price oracle interface for use as backing of proxy
    function assetPrices(address asset) external view returns (uint) {
        return prices[asset];
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
