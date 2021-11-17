// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract DfAxe is ERC20("DeFireX Axie", "DFAXIE"), Ownable {

    uint256 feeOnSell;

    constructor() public {
    }

    function setFee(uint256 _newFee) onlyOwner public {
        require(feeOnSell < 20 * 1e18 / 100, "!param"); // < 20%
        feeOnSell = _newFee;
    }

    function mint(address account, uint256 amount) onlyOwner public {
        _mint(account, amount);
    }

    function burn(uint256 amount) onlyOwner public {
        _burn(msg.sender, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) override virtual internal {
        if (from != address(this) && msg.sender != tx.origin) {

        }
    }
}
