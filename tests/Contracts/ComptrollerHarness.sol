pragma solidity ^0.5.16;

import "../../contracts/Niutroller.sol";
import "../../contracts/PriceOracle.sol";

contract NiutrollerKovan is Niutroller {
  function getNiuAddress() public view returns (address) {
    return 0x61460874a7196d6a22D1eE4922473664b3E95270;
  }
}

contract NiutrollerRopsten is Niutroller {
  function getNiuAddress() public view returns (address) {
    return 0xf76D4a441E4ba86A923ce32B89AFF89dBccAA075;
  }
}

contract NiutrollerHarness is Niutroller {
    address niuAddress;
    uint public blockNumber;

    constructor() Niutroller() public {}

    function setPauseGuardian(address harnessedPauseGuardian) public {
        pauseGuardian = harnessedPauseGuardian;
    }

    function setNiuSupplyState(address NToken, uint224 index, uint32 blockNumber_) public {
        niuSupplyState[NToken].index = index;
        niuSupplyState[NToken].block = blockNumber_;
    }

    function setNiuBorrowState(address NToken, uint224 index, uint32 blockNumber_) public {
        niuBorrowState[NToken].index = index;
        niuBorrowState[NToken].block = blockNumber_;
    }

    function setNiuAccrued(address user, uint userAccrued) public {
        niuAccrued[user] = userAccrued;
    }

    function setNiuAddress(address niuAddress_) public {
        niuAddress = niuAddress_;
    }

    function getNiuAddress() public view returns (address) {
        return niuAddress;
    }

    /**
     * @notice Set the amount of COMP distributed per block
     * @param niuRate_ The amount of COMP wei per block to distribute
     */
    function harnessSetNiuRate(uint niuRate_) public {
        niuRate = niuRate_;
    }

    /**
     * @notice Recalculate and update COMP speeds for all COMP markets
     */
    function harnessRefreshNiuSpeeds() public {
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

    function setNiuBorrowerIndex(address NToken, address borrower, uint index) public {
        niuBorrowerIndex[NToken][borrower] = index;
    }

    function setNiuSupplierIndex(address NToken, address supplier, uint index) public {
        niuSupplierIndex[NToken][supplier] = index;
    }

    function harnessDistributeAllBorrowerNiu(address NToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerNiu(NToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
        niuAccrued[borrower] = grantNiuInternal(borrower, niuAccrued[borrower]);
    }

    function harnessDistributeAllSupplierNiu(address NToken, address supplier) public {
        distributeSupplierNiu(NToken, supplier);
        niuAccrued[supplier] = grantNiuInternal(supplier, niuAccrued[supplier]);
    }

    function harnessUpdateNiuBorrowIndex(address NToken, uint marketBorrowIndexMantissa) public {
        updateNiuBorrowIndex(NToken, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessUpdateNiuSupplyIndex(address NToken) public {
        updateNiuSupplyIndex(NToken);
    }

    function harnessDistributeBorrowerNiu(address NToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerNiu(NToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessDistributeSupplierNiu(address NToken, address supplier) public {
        distributeSupplierNiu(NToken, supplier);
    }

    function harnessTransferNiu(address user, uint userAccrued, uint threshold) public returns (uint) {
        if (userAccrued > 0 && userAccrued >= threshold) {
            return grantNiuInternal(user, userAccrued);
        }
        return userAccrued;
    }

    function harnessAddNiuMarkets(address[] memory NTokens) public {
        for (uint i = 0; i < NTokens.length; i++) {
            // temporarily set niuSpeed to 1 (will be fixed by `harnessRefreshNiuSpeeds`)
            setNiuSpeedInternal(NToken(NTokens[i]), 1, 1);
        }
    }

    function harnessFastForward(uint blocks) public returns (uint) {
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
            if (niuSupplySpeeds[address(allMarkets[i])] > 0 || niuBorrowSpeeds[address(allMarkets[i])] > 0) {
                n++;
            }
        }

        address[] memory niuMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (niuSupplySpeeds[address(allMarkets[i])] > 0 || niuBorrowSpeeds[address(allMarkets[i])] > 0) {
                niuMarkets[k++] = address(allMarkets[i]);
            }
        }
        return niuMarkets;
    }
}

contract NiutrollerBorked {
    function _become(Unitroller unitroller, PriceOracle _oracle, uint _closeFactorMantissa, uint _maxAssets, bool _reinitializing) public {
        _oracle;
        _closeFactorMantissa;
        _maxAssets;
        _reinitializing;

        require(msg.sender == unitroller.admin(), "only unitroller admin can change brains");
        unitroller._acceptImplementation();
    }
}

contract BoolNiutroller is NiutrollerInterface {
    bool allowMint = true;
    bool allowRedeem = true;
    bool allowBorrow = true;
    bool allowRepayBorrow = true;
    bool allowLiquidateBorrow = true;
    bool allowSeize = true;
    bool allowTransfer = true;

    bool verifyMint = true;
    bool verifyRedeem = true;
    bool verifyBorrow = true;
    bool verifyRepayBorrow = true;
    bool verifyLiquidateBorrow = true;
    bool verifySeize = true;
    bool verifyTransfer = true;

    bool failCalculateSeizeTokens;
    uint calculatedSeizeTokens;

    uint noError = 0;
    uint opaqueError = noError + 11; // an arbitrary, opaque error code

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata _NTokens) external returns (uint[] memory) {
        _NTokens;
        uint[] memory ret;
        return ret;
    }

    function exitMarket(address _NToken) external returns (uint) {
        _NToken;
        return noError;
    }

    /*** Policy Hooks ***/

    function mintAllowed(address _NToken, address _minter, uint _mintAmount) public returns (uint) {
        _NToken;
        _minter;
        _mintAmount;
        return allowMint ? noError : opaqueError;
    }

    function mintVerify(address _NToken, address _minter, uint _mintAmount, uint _mintTokens) external {
        _NToken;
        _minter;
        _mintAmount;
        _mintTokens;
        require(verifyMint, "mintVerify rejected mint");
    }

    function redeemAllowed(address _NToken, address _redeemer, uint _redeemTokens) public returns (uint) {
        _NToken;
        _redeemer;
        _redeemTokens;
        return allowRedeem ? noError : opaqueError;
    }

    function redeemVerify(address _NToken, address _redeemer, uint _redeemAmount, uint _redeemTokens) external {
        _NToken;
        _redeemer;
        _redeemAmount;
        _redeemTokens;
        require(verifyRedeem, "redeemVerify rejected redeem");
    }

    function borrowAllowed(address _NToken, address _borrower, uint _borrowAmount) public returns (uint) {
        _NToken;
        _borrower;
        _borrowAmount;
        return allowBorrow ? noError : opaqueError;
    }

    function borrowVerify(address _NToken, address _borrower, uint _borrowAmount) external {
        _NToken;
        _borrower;
        _borrowAmount;
        require(verifyBorrow, "borrowVerify rejected borrow");
    }

    function repayBorrowAllowed(
        address _NToken,
        address _payer,
        address _borrower,
        uint _repayAmount) public returns (uint) {
        _NToken;
        _payer;
        _borrower;
        _repayAmount;
        return allowRepayBorrow ? noError : opaqueError;
    }

    function repayBorrowVerify(
        address _NToken,
        address _payer,
        address _borrower,
        uint _repayAmount,
        uint _borrowerIndex) external {
        _NToken;
        _payer;
        _borrower;
        _repayAmount;
        _borrowerIndex;
        require(verifyRepayBorrow, "repayBorrowVerify rejected repayBorrow");
    }

    function liquidateBorrowAllowed(
        address _NTokenBorrowed,
        address _NTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount) public returns (uint) {
        _NTokenBorrowed;
        _NTokenCollateral;
        _liquidator;
        _borrower;
        _repayAmount;
        return allowLiquidateBorrow ? noError : opaqueError;
    }

    function liquidateBorrowVerify(
        address _NTokenBorrowed,
        address _NTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount,
        uint _seizeTokens) external {
        _NTokenBorrowed;
        _NTokenCollateral;
        _liquidator;
        _borrower;
        _repayAmount;
        _seizeTokens;
        require(verifyLiquidateBorrow, "liquidateBorrowVerify rejected liquidateBorrow");
    }

    function seizeAllowed(
        address _NTokenCollateral,
        address _NTokenBorrowed,
        address _borrower,
        address _liquidator,
        uint _seizeTokens) public returns (uint) {
        _NTokenCollateral;
        _NTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        return allowSeize ? noError : opaqueError;
    }

    function seizeVerify(
        address _NTokenCollateral,
        address _NTokenBorrowed,
        address _liquidator,
        address _borrower,
        uint _seizeTokens) external {
        _NTokenCollateral;
        _NTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        require(verifySeize, "seizeVerify rejected seize");
    }

    function transferAllowed(
        address _NToken,
        address _src,
        address _dst,
        uint _transferTokens) public returns (uint) {
        _NToken;
        _src;
        _dst;
        _transferTokens;
        return allowTransfer ? noError : opaqueError;
    }

    function transferVerify(
        address _NToken,
        address _src,
        address _dst,
        uint _transferTokens) external {
        _NToken;
        _src;
        _dst;
        _transferTokens;
        require(verifyTransfer, "transferVerify rejected transfer");
    }

    /*** Special Liquidation Calculation ***/

    function liquidateCalculateSeizeTokens(
        address _NTokenBorrowed,
        address _NTokenCollateral,
        uint _repayAmount) public view returns (uint, uint) {
        _NTokenBorrowed;
        _NTokenCollateral;
        _repayAmount;
        return failCalculateSeizeTokens ? (opaqueError, 0) : (noError, calculatedSeizeTokens);
    }

    /**** Mock Settors ****/

    /*** Policy Hooks ***/

    function setMintAllowed(bool allowMint_) public {
        allowMint = allowMint_;
    }

    function setMintVerify(bool verifyMint_) public {
        verifyMint = verifyMint_;
    }

    function setRedeemAllowed(bool allowRedeem_) public {
        allowRedeem = allowRedeem_;
    }

    function setRedeemVerify(bool verifyRedeem_) public {
        verifyRedeem = verifyRedeem_;
    }

    function setBorrowAllowed(bool allowBorrow_) public {
        allowBorrow = allowBorrow_;
    }

    function setBorrowVerify(bool verifyBorrow_) public {
        verifyBorrow = verifyBorrow_;
    }

    function setRepayBorrowAllowed(bool allowRepayBorrow_) public {
        allowRepayBorrow = allowRepayBorrow_;
    }

    function setRepayBorrowVerify(bool verifyRepayBorrow_) public {
        verifyRepayBorrow = verifyRepayBorrow_;
    }

    function setLiquidateBorrowAllowed(bool allowLiquidateBorrow_) public {
        allowLiquidateBorrow = allowLiquidateBorrow_;
    }

    function setLiquidateBorrowVerify(bool verifyLiquidateBorrow_) public {
        verifyLiquidateBorrow = verifyLiquidateBorrow_;
    }

    function setSeizeAllowed(bool allowSeize_) public {
        allowSeize = allowSeize_;
    }

    function setSeizeVerify(bool verifySeize_) public {
        verifySeize = verifySeize_;
    }

    function setTransferAllowed(bool allowTransfer_) public {
        allowTransfer = allowTransfer_;
    }

    function setTransferVerify(bool verifyTransfer_) public {
        verifyTransfer = verifyTransfer_;
    }

    /*** Liquidity/Liquidation Calculations ***/

    function setCalculatedSeizeTokens(uint seizeTokens_) public {
        calculatedSeizeTokens = seizeTokens_;
    }

    function setFailCalculateSeizeTokens(bool shouldFail) public {
        failCalculateSeizeTokens = shouldFail;
    }
}

contract EchoTypesNiutroller is UnitrollerAdminStorage {
    function stringy(string memory s) public pure returns(string memory) {
        return s;
    }

    function addresses(address a) public pure returns(address) {
        return a;
    }

    function booly(bool b) public pure returns(bool) {
        return b;
    }

    function listOInts(uint[] memory u) public pure returns(uint[] memory) {
        return u;
    }

    function reverty() public pure {
        require(false, "gotcha sucka");
    }

    function becomeBrains(address payable unitroller) public {
        Unitroller(unitroller)._acceptImplementation();
    }
}
