// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// Minimal subset of Uniswap V4 types used by LoyalLegend hooks.
// Mirrors the real v4-core surface for the calls we use. In production we'll
// import directly from the v4-core package. This trimmed copy lets us compile
// and unit-test the hook logic without dragging in the full v4 build.
library V4 {
    /// @notice Uniswap V4 PoolKey. `currency0` is always the lower-address token.
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    /// @notice Parameters for a swap. `zeroForOne` true means selling currency0 for currency1.
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;   // positive = exactIn, negative = exactOut
        uint160 sqrtPriceLimitX96;
    }

    /// @notice The signed pair of token deltas returned by a swap.
    /// @dev From the pool's perspective: positive = pool received, negative = pool paid out.
    struct BalanceDelta {
        int128 amount0;
        int128 amount1;
    }
}

/// @notice Permission flag bits that V4 reads from a hook's address.
/// @dev In real V4 deployment, the hook contract address must have these bits set
///      via CREATE2 mining. Locally we just expose them on the contract for the mock.
library Hooks {
    uint160 internal constant BEFORE_SWAP_FLAG  = 1 << 7;
    uint160 internal constant AFTER_SWAP_FLAG   = 1 << 6;
    uint160 internal constant BEFORE_INITIALIZE_FLAG = 1 << 13;

    struct Permissions {
        bool beforeInitialize;
        bool afterInitialize;
        bool beforeAddLiquidity;
        bool afterAddLiquidity;
        bool beforeRemoveLiquidity;
        bool afterRemoveLiquidity;
        bool beforeSwap;
        bool afterSwap;
        bool beforeDonate;
        bool afterDonate;
        bool beforeSwapReturnDelta;
        bool afterSwapReturnDelta;
        bool afterAddLiquidityReturnDelta;
        bool afterRemoveLiquidityReturnDelta;
    }
}
