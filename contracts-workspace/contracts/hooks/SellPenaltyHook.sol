// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {BaseHook} from "../v4/BaseHook.sol";
import {V4, Hooks} from "../v4/IV4Types.sol";

interface ILoyaltyTrackerHook {
    function onSell(address user, uint256 amount) external;
    function tokensHeldOf(address user) external view returns (uint256);
}

/// @title Hook 2 — Sell Penalty Hook
/// @notice On every SELL of $LEGEND into the V4 pool, instructs the LoyaltyTracker
///         to forfeit points proportional to the share of holdings sold.
contract SellPenaltyHook is BaseHook {
    ILoyaltyTrackerHook public immutable tracker;

    event SellTracked(address indexed user, uint256 amount);

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
        if (!_isBuyingLegend(key, params)) {
            address user = _resolveUser(sender, hookData);
            uint256 amount = _legendAmount(key, delta);
            uint256 tracked = tracker.tokensHeldOf(user);
            if (amount > tracked) amount = tracked; // never penalize more than tracked
            if (amount > 0) {
                tracker.onSell(user, amount);
                emit SellTracked(user, amount);
            }
        }
        return (this.afterSwap.selector, 0);
    }
}
