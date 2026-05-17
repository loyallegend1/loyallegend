// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {BaseHook} from "../v4/BaseHook.sol";
import {V4, Hooks} from "../v4/IV4Types.sol";

interface ILoyaltyTrackerHook {
    function onBuy(address user, uint256 amount) external;
}

/// @title Hook 1 — Loyalty Points Hook
/// @notice On every BUY of $LEGEND from the V4 pool, records the purchase in the
///         LoyaltyTracker so the buyer starts (or extends) their points accrual.
contract LoyaltyPointsHook is BaseHook {
    ILoyaltyTrackerHook public immutable tracker;

    event BuyTracked(address indexed user, uint256 amount);

    constructor(address poolManager_, address legendToken_, address tracker_)
        BaseHook(poolManager_, legendToken_)
    {
        tracker = ILoyaltyTrackerHook(tracker_);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory perms) {
        perms.afterSwap = true;
    }

    function _afterSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        V4.BalanceDelta calldata delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        if (_isBuyingLegend(key, params)) {
            address user = _resolveUser(sender, hookData);
            uint256 amount = _legendAmount(key, delta);
            if (amount > 0) {
                tracker.onBuy(user, amount);
                emit BuyTracked(user, amount);
            }
        }
        return (this.afterSwap.selector, 0);
    }
}
