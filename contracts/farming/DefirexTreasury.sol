// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Reservoir
 *
 * @dev The contract is used to keep tokens with the function
 * of transfer them to another target address (it is assumed that
 * it will be a contract address).
 */
contract DefirexTreasury is Ownable {
    using SafeMath for uint256;

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

    function add(IERC20 _token, address _target, uint64 _interval, uint64 _percent, uint64 _lastTimestamp) onlyOwner public {
        require(_percent <= 100 * 1000);
        if (_lastTimestamp == 0) _lastTimestamp = uint64(block.timestamp);
        info[_target] = DistributionInfo(_token, _interval, _lastTimestamp, _percent);
    }

    function changePercent(address _target, uint64 _percent, uint64 _interval) onlyOwner public {
        require(info[_target].lastTimestamp  > 0);
        info[_target].percent = _percent;
        info[_target].interval = _interval;
    }


    function isAllowedGathering() external returns (bool) {
        DistributionInfo storage _inf = info[msg.sender];
        return block.timestamp >= _inf.lastTimestamp + _inf.interval;
    }

    function gather()
    external
    returns (uint256 _tokensToSend)
    {
        DistributionInfo storage _inf = info[msg.sender];
        require(_inf.lastTimestamp > 0, "not exits");
        require(block.timestamp >= _inf.lastTimestamp + _inf.interval, "early");
        _inf.lastTimestamp = uint64(block.timestamp);
        _tokensToSend = _inf.token.balanceOf(address(this)).mul(_inf.percent).div(100 * 1000);
        _inf.token.transfer(msg.sender, _tokensToSend);
    }
}
