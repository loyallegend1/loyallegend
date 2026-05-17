// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {V4, Hooks} from "./IV4Types.sol";

/// @notice Minimal V4 BaseHook. Real v4-core has a richer base; we model the surface
///         we need for buy/sell detection on the LEGEND token.
abstract contract BaseHook {
    address public immutable poolManager;
    address public immutable legendToken;

    error NotPoolManager();

    constructor(address poolManager_, address legendToken_) {
        poolManager = poolManager_;
        legendToken = legendToken_;
    }

    modifier onlyPoolManager() {
        if (msg.sender != poolManager) revert NotPoolManager();
        _;
    }

    /// @notice The hook's permission flags. Each concrete hook overrides this.
    function getHookPermissions() public pure virtual returns (Hooks.Permissions memory);

    // ----- V4 swap callbacks (only the ones we need) -----

    function beforeSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4 selector, int128 hookDelta) {
        return _beforeSwap(sender, key, params, hookData);
    }

    function afterSwap(
        address sender,
        V4.PoolKey calldata key,
        V4.SwapParams calldata params,
        V4.BalanceDelta calldata delta,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4 selector, int128 hookDelta) {
        return _afterSwap(sender, key, params, delta, hookData);
    }

    // ----- overridable by subclasses -----

    function _beforeSwap(
        address /*sender*/,
        V4.PoolKey calldata /*key*/,
        V4.SwapParams calldata /*params*/,
        bytes calldata /*hookData*/
    ) internal virtual returns (bytes4, int128) {
        return (this.beforeSwap.selector, 0);
    }

    function _afterSwap(
        address /*sender*/,
        V4.PoolKey calldata /*key*/,
        V4.SwapParams calldata /*params*/,
        V4.BalanceDelta calldata /*delta*/,
        bytes calldata /*hookData*/
    ) internal virtual returns (bytes4, int128) {
        return (this.afterSwap.selector, 0);
    }

    // ----- helpers -----

    /// @notice True if this swap was a BUY of LEGEND (LEGEND flowed out of the pool to the user).
    function _isBuyingLegend(V4.PoolKey calldata key, V4.SwapParams calldata params) internal view returns (bool) {
        bool legendIsZero = key.currency0 == legendToken;
        bool legendIsOne  = key.currency1 == legendToken;
        require(legendIsZero || legendIsOne, "pool has no LEGEND");
        // zeroForOne means user gives currency0, receives currency1.
        // Buying LEGEND means user RECEIVES it.
        return (legendIsZero && !params.zeroForOne) || (legendIsOne && params.zeroForOne);
    }

    /// @notice Returns the absolute LEGEND amount that flowed in this swap, derived from the delta.
    function _legendAmount(V4.PoolKey calldata key, V4.BalanceDelta calldata delta) internal view returns (uint256) {
        int128 amt = key.currency0 == legendToken ? delta.amount0 : delta.amount1;
        return amt < 0 ? uint256(uint128(-amt)) : uint256(uint128(amt));
    }

    /// @notice Decodes the user address that the router/forwarder appends as hookData.
    /// @dev We require routers to encode the end-user address here; otherwise we fall back to `sender`.
    function _resolveUser(address sender, bytes calldata hookData) internal pure returns (address user) {
        if (hookData.length >= 32) {
            user = abi.decode(hookData, (address));
            if (user != address(0)) return user;
        }
        return sender;
    }
}
