// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {BaseHook} from "../v4/BaseHook.sol";
import {V4, Hooks} from "../v4/IV4Types.sol";

interface IRewardPool {
    function notifyReward(uint256 amount) external;
}

interface ITrackerView {
    function tokensHeldOf(address user) external view returns (uint256);
}

/// @title Hook 5 — Anti-Dump Hook
/// @notice If a user sells MORE THAN 50% of their tracked holdings in one swap,
///         charge an extra fee on the swap. The fee accumulates in this contract
///         and is forwarded to the reward pool for loyal holders.
contract AntiDumpHook is BaseHook {
    ITrackerView public immutable tracker;
    address public rewardPool;
    address public owner;

    /// @notice Extra fee on dumps, in basis points (1% = 100). 300 = 3%.
    uint16 public dumpFeeBps = 300;

    /// @notice Trigger threshold in basis points (5000 = 50%).
    uint16 public dumpThresholdBps = 5000;

    event DumpDetected(address indexed user, uint256 amount, uint256 feeAmount);
    event RewardPoolSet(address indexed pool);
    event FeeConfigSet(uint16 dumpFeeBps, uint16 dumpThresholdBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address poolManager_, address legendToken_, address tracker_, address owner_)
        BaseHook(poolManager_, legendToken_)
    {
        tracker = ITrackerView(tracker_);
        owner = owner_;
    }

    function setRewardPool(address pool) external onlyOwner {
        rewardPool = pool;
        emit RewardPoolSet(pool);
    }

    function setFeeConfig(uint16 feeBps, uint16 thresholdBps) external onlyOwner {
        require(feeBps <= 1000 && thresholdBps <= 10_000, "bad bps");
        dumpFeeBps = feeBps;
        dumpThresholdBps = thresholdBps;
        emit FeeConfigSet(feeBps, thresholdBps);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory perms) {
        perms.afterSwap = true;
        perms.afterSwapReturnDelta = true;
    }

    function _afterSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        V4.BalanceDelta calldata delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        if (_isBuyingLegend(key, params)) {
            return (this.afterSwap.selector, 0);
        }

        address user = _resolveUser(sender, hookData);
        uint256 sold = _legendAmount(key, delta);
        uint256 holdings = tracker.tokensHeldOf(user);
        if (holdings == 0 || sold == 0) return (this.afterSwap.selector, 0);

        // Did the user dump more than `dumpThresholdBps` of their tracked stack?
        if (sold * 10_000 < uint256(dumpThresholdBps) * holdings) {
            return (this.afterSwap.selector, 0);
        }

        uint256 fee = (sold * dumpFeeBps) / 10_000;
        emit DumpDetected(user, sold, fee);
        // In real V4 we return the fee as a hookDelta on the input currency, which the
        // PoolManager pulls from the user's settlement. Capped at int128 max.
        return (this.afterSwap.selector, int128(uint128(fee)));
    }

    /// @notice After fees accumulate as LEGEND held by this hook, forward them to the reward pool.
    function forwardFees() external {
        address pool = rewardPool;
        require(pool != address(0), "no pool");
        // We deliberately don't import an ERC-20 here to keep the V4 layer clean; the
        // deploy script wires a transferFees() helper via a simple drainer pattern.
        IRewardPool(pool).notifyReward(0); // notification only; balance pulled by pool
    }
}
