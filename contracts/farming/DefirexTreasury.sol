// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "..\..\Flat_DfrFarmingPool_v2.sol";

/**
 * @title Reservoir
 *
 * @dev The contract is used to keep tokens with the function
 * of transfer them to another target address (it is assumed that
 * it will be a contract address).
 */
contract Reservoir is Ownable {

    struct DistributionInfo
    {
        IERC20 token;
        uint64 interval;
        uint64 lastTimestamp;
        uint64 percent;
    }

    mapping(address => DistributionInfo) info;

    /**
     * @dev A constructor sets the address of token and
     * the address of the target contract.
     */
    constructor() public {

    }

    function add(IERC20 _token, address _target, uint64 _percent, uint64 _lastTimestamp) onlyOwner public {
        require(_percent <= 100 * 1000);
        info[_target] = DistributionInfo(_token,_lastTimestamp, _percent);
    }

    function changePercent(address _target, uint64 _percent, uint64 _interval) onlyOwner public {
        require(info[_target].lastTimestamp  > 0);
        info[_target].percent = _percent;
        info[_target].interval = _interval;
    }

    /**
     * @dev Transfers a certain amount of tokens to the target address.
     *
     * Requirements:
     * - msg.sender should be the target address.
     *
     * @param requestedTokens The amount of tokens to transfer.
     */
    function drip()
    external
    returns (uint256 _tokensToSend)
    {
        DistributionInfo storage _inf = info[msg.sender];
        require(block.timestamp >= _inf.lastTimestamp + _inf.interval, "early");
        _inf.lastTimestamp = block.timestamp;
        _tokensToSend = _inf.token.balanceOf(address(this)).mul(_inf.percent).div(100 * 1000);
        _inf.token.transfer(_inf.target, _tokensToSend);
    }
}
