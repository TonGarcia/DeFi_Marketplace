pragma solidity ^0.5.16;

import "../../../contracts/Maximillion.sol";

contract MaximillionCertora is Maximillion {
    constructor(CEther nEther_) public Maximillion(nEther_) {}

    function borrowBalance(address account) external returns (uint) {
        return nEther.borrowBalanceCurrent(account);
    }

    function etherBalance(address account) external returns (uint) {
        return account.balance;
    }

    function repayBehalf(address borrower) public payable {
        return super.repayBehalf(borrower);
    }
}