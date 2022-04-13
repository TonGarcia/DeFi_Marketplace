pragma solidity ^0.5.16;

contract NiutrollerInterface {
    /// @notice Indicator that this is a Niutroller contract (for inspection)
    bool public constant isNiutroller = true;

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata nTokens) external returns (uint[] memory);
    function exitMarket(address nToken) external returns (uint);

    /*** Policy Hooks ***/

    function mintAllowed(address nToken, address minter, uint mintAmount) external returns (uint);
    function mintVerify(address nToken, address minter, uint mintAmount, uint mintTokens) external;

    function redeemAllowed(address nToken, address redeemer, uint redeemTokens) external returns (uint);
    function redeemVerify(address nToken, address redeemer, uint redeemAmount, uint redeemTokens) external;

    function borrowAllowed(address nToken, address borrower, uint borrowAmount) external returns (uint);
    function borrowVerify(address nToken, address borrower, uint borrowAmount) external;

    function repayBorrowAllowed(
        address nToken,
        address payer,
        address borrower,
        uint repayAmount) external returns (uint);
    function repayBorrowVerify(
        address nToken,
        address payer,
        address borrower,
        uint repayAmount,
        uint borrowerIndex) external;

    function liquidateBorrowAllowed(
        address nTokenBorrowed,
        address nTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount) external returns (uint);
    function liquidateBorrowVerify(
        address nTokenBorrowed,
        address nTokenCollateral,
        address liquidator,
        address borrower,
        uint repayAmount,
        uint seizeTokens) external;

    function seizeAllowed(
        address nTokenCollateral,
        address nTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external returns (uint);
    function seizeVerify(
        address nTokenCollateral,
        address nTokenBorrowed,
        address liquidator,
        address borrower,
        uint seizeTokens) external;

    function transferAllowed(address nToken, address src, address dst, uint transferTokens) external returns (uint);
    function transferVerify(address nToken, address src, address dst, uint transferTokens) external;

    /*** Liquidity/Liquidation Calculations ***/

    function liquidateCalculateSeizeTokens(
        address nTokenBorrowed,
        address nTokenCollateral,
        uint repayAmount) external view returns (uint, uint);
}
