// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

/**
 * @dev Interface of DefirexTreasury contract.
 */
interface IHgdTreasury {
    function isAllowedGathering(address) external returns (bool);

    function gather(address) external returns (uint256);
}
