pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../NErc20.sol";
import "../NToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/Niu.sol";

interface NiutrollerLensInterface {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (NToken[] memory);
    function claimNiu(address) external;
    function niuAccrued(address) external view returns (uint);
    function compSpeeds(address) external view returns (uint);
    function niuSupplySpeeds(address) external view returns (uint);
    function niuBorrowSpeeds(address) external view returns (uint);
    function borrowCaps(address) external view returns (uint);
}

interface GovernorBravoInterface {
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }
    struct Proposal {
        uint id;
        address proposer;
        uint eta;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }
    function getActions(uint proposalId) external view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas);
    function proposals(uint proposalId) external view returns (Proposal memory);
    function getReceipt(uint proposalId, address voter) external view returns (Receipt memory);
}

contract NiuralLens {
    struct NTokenMetadata {
        address nToken;
        uint exchangeRateCurrent;
        uint supplyRatePerBlock;
        uint borrowRatePerBlock;
        uint reserveFactorMantissa;
        uint totalBorrows;
        uint totalReserves;
        uint totalSupply;
        uint totalCash;
        bool isListed;
        uint collateralFactorMantissa;
        address underlyingAssetAddress;
        uint nTokenDecimals;
        uint underlyingDecimals;
        uint compSupplySpeed;
        uint compBorrowSpeed;
        uint borrowCap;
    }

    function getNiuSpeeds(NiutrollerLensInterface comptroller, NToken nToken) internal returns (uint, uint) {
        // Getting comp speeds is gnarly due to not every network having the
        // split comp speeds from Proposal 62 and other networks don't even
        // have comp speeds.
        uint compSupplySpeed = 0;
        (bool compSupplySpeedSuccess, bytes memory compSupplySpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.niuSupplySpeeds.selector,
                    abi.encode(address(nToken))
                )
            );
        if (compSupplySpeedSuccess) {
            compSupplySpeed = abi.decode(compSupplySpeedReturnData, (uint));
        }

        uint compBorrowSpeed = 0;
        (bool compBorrowSpeedSuccess, bytes memory compBorrowSpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.niuBorrowSpeeds.selector,
                    abi.encode(address(nToken))
                )
            );
        if (compBorrowSpeedSuccess) {
            compBorrowSpeed = abi.decode(compBorrowSpeedReturnData, (uint));
        }

        // If the split comp speeds call doesn't work, try the  oldest non-spit version.
        if (!compSupplySpeedSuccess || !compBorrowSpeedSuccess) {
            (bool compSpeedSuccess, bytes memory compSpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.compSpeeds.selector,
                    abi.encode(address(nToken))
                )
            );
            if (compSpeedSuccess) {
                compSupplySpeed = compBorrowSpeed = abi.decode(compSpeedReturnData, (uint));
            }
        }
        return (compSupplySpeed, compBorrowSpeed);
    }

    function nTokenMetadata(NToken nToken) public returns (NTokenMetadata memory) {
        uint exchangeRateCurrent = nToken.exchangeRateCurrent();
        NiutrollerLensInterface comptroller = NiutrollerLensInterface(address(nToken.comptroller()));
        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(address(nToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (compareStrings(nToken.symbol(), "cETH")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            NErc20 cErc20 = NErc20(address(nToken));
            underlyingAssetAddress = cErc20.underlying();
            underlyingDecimals = EIP20Interface(cErc20.underlying()).decimals();
        }

        (uint compSupplySpeed, uint compBorrowSpeed) = getNiuSpeeds(comptroller, nToken);

        uint borrowCap = 0;
        (bool borrowCapSuccess, bytes memory borrowCapReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.borrowCaps.selector,
                    abi.encode(address(nToken))
                )
            );
        if (borrowCapSuccess) {
            borrowCap = abi.decode(borrowCapReturnData, (uint));
        }

        return NTokenMetadata({
            nToken: address(nToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: nToken.supplyRatePerBlock(),
            borrowRatePerBlock: nToken.borrowRatePerBlock(),
            reserveFactorMantissa: nToken.reserveFactorMantissa(),
            totalBorrows: nToken.totalBorrows(),
            totalReserves: nToken.totalReserves(),
            totalSupply: nToken.totalSupply(),
            totalCash: nToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            nTokenDecimals: nToken.decimals(),
            underlyingDecimals: underlyingDecimals,
            compSupplySpeed: compSupplySpeed,
            compBorrowSpeed: compBorrowSpeed,
            borrowCap: borrowCap
        });
    }

    function nTokenMetadataAll(NToken[] calldata nTokens) external returns (NTokenMetadata[] memory) {
        uint nTokenCount = nTokens.length;
        NTokenMetadata[] memory res = new NTokenMetadata[](nTokenCount);
        for (uint i = 0; i < nTokenCount; i++) {
            res[i] = nTokenMetadata(nTokens[i]);
        }
        return res;
    }

    struct NTokenBalances {
        address nToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function nTokenBalances(NToken nToken, address payable account) public returns (NTokenBalances memory) {
        uint balanceOf = nToken.balanceOf(account);
        uint borrowBalanceCurrent = nToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = nToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (compareStrings(nToken.symbol(), "cETH")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            NErc20 cErc20 = NErc20(address(nToken));
            EIP20Interface underlying = EIP20Interface(cErc20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(nToken));
        }

        return NTokenBalances({
            nToken: address(nToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function nTokenBalancesAll(NToken[] calldata nTokens, address payable account) external returns (NTokenBalances[] memory) {
        uint nTokenCount = nTokens.length;
        NTokenBalances[] memory res = new NTokenBalances[](nTokenCount);
        for (uint i = 0; i < nTokenCount; i++) {
            res[i] = nTokenBalances(nTokens[i], account);
        }
        return res;
    }

    struct NTokenUnderlyingPrice {
        address nToken;
        uint underlyingPrice;
    }

    function nTokenUnderlyingPrice(NToken nToken) public returns (NTokenUnderlyingPrice memory) {
        NiutrollerLensInterface comptroller = NiutrollerLensInterface(address(nToken.comptroller()));
        PriceOracle priceOracle = comptroller.oracle();

        return NTokenUnderlyingPrice({
            nToken: address(nToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(nToken)
        });
    }

    function nTokenUnderlyingPriceAll(NToken[] calldata nTokens) external returns (NTokenUnderlyingPrice[] memory) {
        uint nTokenCount = nTokens.length;
        NTokenUnderlyingPrice[] memory res = new NTokenUnderlyingPrice[](nTokenCount);
        for (uint i = 0; i < nTokenCount; i++) {
            res[i] = nTokenUnderlyingPrice(nTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        NToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(NiutrollerLensInterface comptroller, address account) public returns (AccountLimits memory) {
        (uint errorCode, uint liquidity, uint shortfall) = comptroller.getAccountLiquidity(account);
        require(errorCode == 0);

        return AccountLimits({
            markets: comptroller.getAssetsIn(account),
            liquidity: liquidity,
            shortfall: shortfall
        });
    }

    struct GovReceipt {
        uint proposalId;
        bool hasVoted;
        bool support;
        uint96 votes;
    }

    function getGovReceipts(GovernorAlpha governor, address voter, uint[] memory proposalIds) public view returns (GovReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovReceipt[] memory res = new GovReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorAlpha.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovBravoReceipt {
        uint proposalId;
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }

    function getGovBravoReceipts(GovernorBravoInterface governor, address voter, uint[] memory proposalIds) public view returns (GovBravoReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovBravoReceipt[] memory res = new GovBravoReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorBravoInterface.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovBravoReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        bool canceled;
        bool executed;
    }

    function setProposal(GovProposal memory res, GovernorAlpha governor, uint proposalId) internal view {
        (
            ,
            address proposer,
            uint eta,
            uint startBlock,
            uint endBlock,
            uint forVotes,
            uint againstVotes,
            bool canceled,
            bool executed
        ) = governor.proposals(proposalId);
        res.proposalId = proposalId;
        res.proposer = proposer;
        res.eta = eta;
        res.startBlock = startBlock;
        res.endBlock = endBlock;
        res.forVotes = forVotes;
        res.againstVotes = againstVotes;
        res.canceled = canceled;
        res.executed = executed;
    }

    function getGovProposals(GovernorAlpha governor, uint[] calldata proposalIds) external view returns (GovProposal[] memory) {
        GovProposal[] memory res = new GovProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                canceled: false,
                executed: false
            });
            setProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct GovBravoProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }

    function setBravoProposal(GovBravoProposal memory res, GovernorBravoInterface governor, uint proposalId) internal view {
        GovernorBravoInterface.Proposal memory p = governor.proposals(proposalId);

        res.proposalId = proposalId;
        res.proposer = p.proposer;
        res.eta = p.eta;
        res.startBlock = p.startBlock;
        res.endBlock = p.endBlock;
        res.forVotes = p.forVotes;
        res.againstVotes = p.againstVotes;
        res.abstainVotes = p.abstainVotes;
        res.canceled = p.canceled;
        res.executed = p.executed;
    }

    function getGovBravoProposals(GovernorBravoInterface governor, uint[] calldata proposalIds) external view returns (GovBravoProposal[] memory) {
        GovBravoProposal[] memory res = new GovBravoProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovBravoProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                abstainVotes: 0,
                canceled: false,
                executed: false
            });
            setBravoProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct NiuBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getNiuBalanceMetadata(Niu comp, address account) external view returns (NiuBalanceMetadata memory) {
        return NiuBalanceMetadata({
            balance: comp.balanceOf(account),
            votes: uint256(comp.getCurrentVotes(account)),
            delegate: comp.delegates(account)
        });
    }

    struct NiuBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getNiuBalanceMetadataExt(Niu comp, NiutrollerLensInterface comptroller, address account) external returns (NiuBalanceMetadataExt memory) {
        uint balance = comp.balanceOf(account);
        comptroller.claimNiu(account);
        uint newBalance = comp.balanceOf(account);
        uint accrued = comptroller.niuAccrued(account);
        uint total = add(accrued, newBalance, "sum comp total");
        uint allocated = sub(total, balance, "sub allocated");

        return NiuBalanceMetadataExt({
            balance: balance,
            votes: uint256(comp.getCurrentVotes(account)),
            delegate: comp.delegates(account),
            allocated: allocated
        });
    }

    struct NiuVotes {
        uint blockNumber;
        uint votes;
    }

    function getNiuVotes(Niu comp, address account, uint32[] calldata blockNumbers) external view returns (NiuVotes[] memory) {
        NiuVotes[] memory res = new NiuVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = NiuVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(comp.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function add(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;
        return c;
    }
}
