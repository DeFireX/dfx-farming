// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 *  Based on Sushi SushiBar:
 *  https://github.com/sushiswap/sushiswap/blob/1e4db47fa313f84cd242e17a4972ec1e9755609a/contracts/SushiBar.sol
 */

// This contract handles swapping to and from stDFX, DfxSwap's staking token.
contract DfxStaking is ERC20("DeFireX Staked", "stDFX") {
    using SafeMath for uint256;
    IERC20 public dfx;

    // Define the DFX token contract
    constructor(IERC20 _dfx) public {
        dfx = _dfx;
    }

    // Enter the DfxStaking. Pay some DFXs. Earn some shares.
    // Locks DFX and mints stDFX
    function enter(uint256 _amount) public {
        // Gets the amount of DFX locked in the contract
        uint256 totalDfx = dfx.balanceOf(address(this));
        // Gets the amount of stDFX in existence
        uint256 totalShares = totalSupply();
        // If no stDFX exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalDfx == 0) {
            _mint(msg.sender, _amount);
        } 
        // Calculate and mint the amount of stDFX the DFX is worth. The ratio will change overtime, as stDFX is burned/minted and DFX deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalDfx);
            _mint(msg.sender, what);
        }
        // Lock the DFX in the contract
        dfx.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the DfxStaking. Claim back your DFXs.
    // Unlocks the staked + gained DFX and burns stDFX
    function leave(uint256 _share) public {
        // Gets the amount of stDFX in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of DFX the stDFX is worth
        uint256 what = _share.mul(dfx.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        dfx.transfer(msg.sender, what);
    }
}
