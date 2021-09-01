// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

/**
 * @dev Interface of DefirexTreasury contract.
 */
interface IDefirexTreasury {
    function isAllowedGathering() external returns (bool);

    function gather() external returns (uint256);
}
