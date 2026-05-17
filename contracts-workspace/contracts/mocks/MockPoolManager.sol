// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {V4} from "../v4/IV4Types.sol";

interface IHook {
    function beforeSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4, int128);

    function afterSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        V4.BalanceDelta calldata delta,
        bytes calldata hookData
    ) external returns (bytes4, int128);
}

/// @notice Minimal mock of the Uniswap V4 PoolManager that lets us simulate
///         swaps from tests and verify hook callbacks happen with the right deltas.
///         No AMM math — the test supplies the delta directly.
contract MockPoolManager {
    event Swap(address indexed user, V4.PoolKey key, V4.SwapParams params, V4.BalanceDelta delta);

    function simulateSwap(
        address user,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        V4.BalanceDelta calldata delta
    ) external {
        bytes memory hookData = abi.encode(user);

        IHook(key.hooks).beforeSwap(user, key, params, hookData);
        IHook(key.hooks).afterSwap(user, key, params, delta, hookData);

        emit Swap(user, key, params, delta);
    }

    /// @notice Convenience: simulate a BUY of LEGEND by `user` for `amount` (in wei).
    function simulateBuy(
        address user,
        address legend,
        address otherToken,
        address hook,
        uint256 amount
    ) external {
        bool legendIsZero = legend < otherToken;
        V4.PoolKey memory key = V4.PoolKey({
            currency0: legendIsZero ? legend : otherToken,
            currency1: legendIsZero ? otherToken : legend,
            fee: 3000,
            tickSpacing: 60,
            hooks: hook
        });

        // Buying LEGEND: user receives legend currency.
        // zeroForOne true means user gives currency0, receives currency1.
        bool zeroForOne = legendIsZero ? false : true;

        V4.SwapParams memory params = V4.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amount),
            sqrtPriceLimitX96: 0
        });

        // The pool PAID OUT legend (negative on legend's side from pool's POV).
        V4.BalanceDelta memory delta = V4.BalanceDelta({
            amount0: legendIsZero ? -int128(uint128(amount)) : int128(uint128(amount)),
            amount1: legendIsZero ? int128(uint128(amount)) : -int128(uint128(amount))
        });

        bytes memory hookData = abi.encode(user);
        IHook(hook).afterSwap(user, key, params, delta, hookData);
    }

    /// @notice Convenience: simulate a SELL of LEGEND by `user` for `amount` (in wei).
    function simulateSell(
        address user,
        address legend,
        address otherToken,
        address hook,
        uint256 amount
    ) external {
        bool legendIsZero = legend < otherToken;
        V4.PoolKey memory key = V4.PoolKey({
            currency0: legendIsZero ? legend : otherToken,
            currency1: legendIsZero ? otherToken : legend,
            fee: 3000,
            tickSpacing: 60,
            hooks: hook
        });

        bool zeroForOne = legendIsZero ? true : false;

        V4.SwapParams memory params = V4.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: int256(amount),
            sqrtPriceLimitX96: 0
        });

        // The pool RECEIVED legend (positive on legend's side).
        V4.BalanceDelta memory delta = V4.BalanceDelta({
            amount0: legendIsZero ? int128(uint128(amount)) : -int128(uint128(amount)),
            amount1: legendIsZero ? -int128(uint128(amount)) : int128(uint128(amount))
        });

        bytes memory hookData = abi.encode(user);
        IHook(hook).afterSwap(user, key, params, delta, hookData);
    }
}
