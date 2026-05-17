// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title $LEGEND — LoyalLegend loyalty token
/// @notice Fixed-supply ERC-20. The full supply is minted to the deployer at construction
///         for initial Uniswap V4 liquidity. No further minting is possible.
contract LegendToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 ether;

    constructor(address initialOwner)
        ERC20("LoyalLegend", "LEGEND")
        ERC20Permit("LoyalLegend")
        Ownable(initialOwner)
    {
        _mint(initialOwner, MAX_SUPPLY);
    }
}
