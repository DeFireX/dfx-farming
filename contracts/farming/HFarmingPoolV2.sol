// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IHgdTreasury.sol";

contract HFarmingPoolV2 is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    IERC20 public dfDepositAsset;
    IERC20 public dfRewardAsset;
    
    mapping (address => UserInfo) public userInfo;

    IHgdTreasury public dfTreasury;

    uint256 totalAddedRewards;
    uint256 totalVirtualRewards;
    uint256 totalDeposit;
    bool bOnlyHuman;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        IERC20 _dfRewardAsset,
        IERC20 _dfDepositAsset
    ) public {
        dfRewardAsset = _dfRewardAsset;
        dfDepositAsset = _dfDepositAsset;
        bOnlyHuman = true;
    }

    modifier onlyHuman() {
        if (bOnlyHuman) require(msg.sender == tx.origin, "!human");
        _;
    }

    // XXX: set dfRewardAssetReservoir. Can only be called by the owner.
    function setDfTreasury(IHgdTreasury _dfTreasury) public onlyOwner {
        dfTreasury = _dfTreasury;
    }

    function setOnlyHumanFlag(bool bEnable) onlyOwner public {
        bOnlyHuman = bEnable;
    }

    // View function to see pending DFXs on frontend.
    function pendingReward(address _user) external returns (uint256) {
        checkTreasury();

        UserInfo storage user = userInfo[_user];
        if (totalDeposit == 0) return 0;
        return totalVirtualRewards.mul(user.amount).div(totalDeposit).sub(user.rewardDebt);
    }

    // Deposit LP tokens to DfxFarmingPool for DFX allocation.
    function deposit(uint256 _amount) onlyHuman public {
        require(msg.sender == tx.origin, "!human");

        UserInfo storage user = userInfo[msg.sender];

        checkTreasury();
 
        if (user.amount > 0) {
            uint256 pending = rawPendingDfx(user);
            if(pending > 0) {
                safeDfxTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            dfDepositAsset.safeTransferFrom(address(msg.sender), address(this), _amount);
            uint256 _old_totalDeposit = totalDeposit; 
            totalDeposit = _old_totalDeposit.add(_amount);
            if (_old_totalDeposit > 0) {
                totalVirtualRewards = totalVirtualRewards.mul(_old_totalDeposit.add(_amount)).div(_old_totalDeposit); // TODO: check calculations
            }
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = totalVirtualRewards.mul(user.amount).div(totalDeposit);
        emit Deposit(msg.sender, _amount);
    }

    // Withdraw LP tokens from DfxFarmingPool.
    function withdraw(uint256 _amount) onlyHuman public returns(uint256 _userPendingReward) {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        checkTreasury();

        _userPendingReward = rawPendingDfx(user);
        if(_userPendingReward > 0) {
            safeDfxTransfer(msg.sender, _userPendingReward);
        }

        if(_amount > 0) {
            uint256 _old_totalDeposit = totalDeposit;
            user.amount = user.amount.sub(_amount);
            totalDeposit = _old_totalDeposit.sub(_amount);

            totalVirtualRewards = totalVirtualRewards.mul(_old_totalDeposit.sub(_amount)).div(_old_totalDeposit); // TODO: check calculations

            dfDepositAsset.safeTransfer(address(msg.sender), _amount);
        }

        user.rewardDebt = totalVirtualRewards.mul(user.amount).div(totalDeposit);
        emit Withdraw(msg.sender, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() onlyHuman public {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        uint256 _old_totalDeposit = totalDeposit;
        totalDeposit = _old_totalDeposit.sub(amount);
        totalVirtualRewards = totalVirtualRewards.mul(_old_totalDeposit.sub(amount)).div(_old_totalDeposit); // TODO: check calculations
        dfDepositAsset.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // Safe dfRewardAsset transfer function, just in case if rounding error causes pool to not have enough DFXs.
    function safeDfxTransfer(address _to, uint256 _amount) internal {
        uint256 dfRewardAssetBal = dfRewardAsset.balanceOf(address(this));
        if (_amount > dfRewardAssetBal) _amount = dfRewardAssetBal;

        dfRewardAsset.transfer(_to, _amount);
        totalAddedRewards = totalAddedRewards.sub(_amount);
    }

    function checkTreasury() internal {
        if (dfTreasury.isAllowedGathering(address(this))) {
            dfTreasury.gather(address(this));
        }

        uint256 bal = dfRewardAsset.balanceOf(address(this));
        if (bal > totalAddedRewards) {
            totalVirtualRewards = totalVirtualRewards.add(bal - totalAddedRewards);
            totalAddedRewards = bal;
        }
    }

    function rawPendingDfx(UserInfo storage user) internal view returns (uint256) {
        if (totalDeposit == 0) return 0;
        return totalVirtualRewards.mul(user.amount).div(totalDeposit).sub(user.rewardDebt);
    }
}
