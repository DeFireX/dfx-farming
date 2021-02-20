// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IReservoir.sol";

/**
 *  Based on Sushi MasterChef:
 *  https://github.com/sushiswap/sushiswap/blob/1e4db47fa313f84cd242e17a4972ec1e9755609a/contracts/MasterChef.sol
 *
 *  XXX: Removed migration logic;
 *  XXX: Removed token minting and added token reservoir;
 *  XXX: Added check if LP token has already been added;
 *  XXX: Owner can update reservoir address and dfxPerBlock value.
 */

contract DfxFarmingPool is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of DFXs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accDfxPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accDfxPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. DFXs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that DFXs distribution occurs.
        uint256 accDfxPerShare;   // Accumulated DFXs per share, times 1e12. See below.
    }

    // The DFX TOKEN!
    IERC20 public dfx;
    // Dev address.
    address public devaddr;
    // Block number when bonus DFX period ends.
    uint256 public bonusEndBlock;
    // DFX tokens created per block.
    uint256 public dfxPerBlock;
    // Bonus muliplier for early dfx makers.
    uint256 public constant BONUS_MULTIPLIER = 10;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when DFX mining starts.
    uint256 public startBlock;

    // XXX: token reservoir
    IReservoir public dfxReservoir;

    // XXX: checking already added LP tokens
    mapping(address => bool) private lpTokens;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    event SetDfxReservoir(address reservoir); // XXX: set reservoir event
    event SetDfxPerBlock(uint256 dfxPerBlock); // XXX: set dfxPerBlock event

    constructor(
        IERC20 _dfx,
        address _devaddr,
        uint256 _dfxPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock
    ) public {
        dfx = _dfx;
        devaddr = _devaddr;
        dfxPerBlock = _dfxPerBlock;
        bonusEndBlock = _bonusEndBlock;
        startBlock = _startBlock;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) public onlyOwner {
        // XXX: trying to add the same LP token more than once
        require(!lpTokens[address(_lpToken)], "DfxFarmingPool: LP token has already been added");
        lpTokens[address(_lpToken)] = true;

        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accDfxPerShare: 0
        }));
    }

    // Update the given pool's DFX allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // XXX: set dfxReservoir. Can only be called by the owner.
    function setDfxReservoir(IReservoir _dfxReservoir) public onlyOwner {
        dfxReservoir = _dfxReservoir;
        emit SetDfxReservoir(address(_dfxReservoir));
    }

    // XXX: set dfxPerBlock. Can only be called by the owner.
    function setDfxPerBlock(uint256 _dfxPerBlock) public onlyOwner {
        dfxPerBlock = _dfxPerBlock;
        emit SetDfxPerBlock(_dfxPerBlock);
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= bonusEndBlock) {
            return _to.sub(_from).mul(BONUS_MULTIPLIER);
        } else if (_from >= bonusEndBlock) {
            return _to.sub(_from);
        } else {
            return bonusEndBlock.sub(_from).mul(BONUS_MULTIPLIER).add(
                _to.sub(bonusEndBlock)
            );
        }
    }

    // View function to see pending DFXs on frontend.
    function pendingDfx(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accDfxPerShare = pool.accDfxPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 dfxReward = multiplier.mul(dfxPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            dfxReward = availableDfx(dfxReward); // XXX: amount available for transfer
            dfxReward = dfxReward.sub(dfxReward.div(10)); // XXX: subtract tokens for dev
            accDfxPerShare = accDfxPerShare.add(dfxReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accDfxPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 dfxReward = multiplier.mul(dfxPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        dfxReward = dfxReservoir.drip(dfxReward); // XXX: transfer tokens from dfxReservoir
        dfx.transfer(devaddr, dfxReward.div(10)); // XXX: transfer tokens to devaddr
        dfxReward = dfxReward.sub(dfxReward.div(10)); // XXX: subtract tokens for dev
        pool.accDfxPerShare = pool.accDfxPerShare.add(dfxReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to DfxFarmingPool for DFX allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accDfxPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                safeDfxTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accDfxPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from DfxFarmingPool.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accDfxPerShare).div(1e12).sub(user.rewardDebt);
        if(pending > 0) {
            safeDfxTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accDfxPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Update dev address by the previous dev.
    function updateDev(address _devaddr) public {
        require(msg.sender == devaddr, "updateDev: permission denied");
        devaddr = _devaddr;
    }

    // XXX: return available DFXs on dfxReservoir.
    function availableDfx(uint256 requestedTokens) internal view returns (uint256) {
        uint256 reservoirBalance = dfx.balanceOf(address(dfxReservoir));
        uint256 dfxAvailable = (requestedTokens > reservoirBalance)
            ? reservoirBalance
            : requestedTokens;

        return dfxAvailable;
    }

    // Safe dfx transfer function, just in case if rounding error causes pool to not have enough DFXs.
    function safeDfxTransfer(address _to, uint256 _amount) internal {
        uint256 dfxBal = dfx.balanceOf(address(this));
        if (_amount > dfxBal) {
            dfx.transfer(_to, dfxBal);
        } else {
            dfx.transfer(_to, _amount);
        }
    }
}
