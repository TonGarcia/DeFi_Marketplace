pragma solidity ^0.5.16;

import "./NEther.sol";

/**
 * @title Niural's Maximillion Contract
 * @author Niural
 */
contract Maximillion {
    /**
     * @notice The default nEther market to repay in
     */
    NEther public nEther;

    /**
     * @notice Construct a Maximillion to repay max in a NEther market
     */
    constructor(NEther nEther_) public {
        nEther = nEther_;
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in the nEther market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, nEther);
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a nEther market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param nEther_ The address of the nEther contract to repay in
     */
    function repayBehalfExplicit(address borrower, NEther nEther_) public payable {
        uint received = msg.value;
        uint borrows = nEther_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            nEther_.repayBorrowBehalf.value(borrows)(borrower);
            msg.sender.transfer(received - borrows);
        } else {
            nEther_.repayBorrowBehalf.value(received)(borrower);
        }
    }
}
