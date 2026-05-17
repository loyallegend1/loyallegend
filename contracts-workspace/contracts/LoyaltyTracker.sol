// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LoyaltyTracker — shared loyalty state for $LEGEND
/// @notice Tracks per-holder loyalty:
///         - `tokensHeld` is a tracker-side mirror updated by the V4 hooks on buys/sells.
///           (It is intentionally separate from the ERC-20 balance — selling tokens you bought
///            ON-CHAIN via the pool reduces this number, but transferring between your own
///            wallets does not. This mirrors the spec: "points earned from sold tokens are lost".)
///         - `points` accrues at 1 point per token per day held.
///         - `firstHeldAt` is the timestamp of the holder's first buy and never resets while
///           they still hold > 0 tokens — used to enforce the "min days held" rule.
///
///         All write functions are restricted to the registered V4 hook contracts.
contract LoyaltyTracker is Ownable {
    struct Holder {
        uint128 tokensHeld;       // tracker-side balance (set by hooks)
        uint128 lastAccrueAt;     // last time points were accrued
        uint128 firstHeldAt;      // first time the holder went from 0 → >0
        uint128 points;           // accrued loyalty points
    }

    mapping(address => Holder) private _holders;
    mapping(address => bool) public hooks;
    address public nft;

    uint256 public constant POINTS_PER_TOKEN_PER_DAY = 1; // 1 point / 1 LEGEND / 1 day
    uint256 public constant DAY = 1 days;

    event HookSet(address indexed hook, bool allowed);
    event NftSet(address indexed nft);
    event Bought(address indexed user, uint256 amount, uint256 newBalance);
    event Sold(address indexed user, uint256 amount, uint256 newBalance, uint256 pointsForfeited);
    event Accrued(address indexed user, uint256 amount);
    event PointsSpent(address indexed user, uint256 amount);

    modifier onlyHook() {
        require(hooks[msg.sender], "not hook");
        _;
    }

    modifier onlyNft() {
        require(msg.sender == nft, "not nft");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ----- admin -----

    function setHook(address hook, bool allowed) external onlyOwner {
        hooks[hook] = allowed;
        emit HookSet(hook, allowed);
    }

    function setNft(address nft_) external onlyOwner {
        nft = nft_;
        emit NftSet(nft_);
    }

    // ----- views -----

    function holderOf(address user) external view returns (Holder memory) {
        return _holders[user];
    }

    function tokensHeldOf(address user) external view returns (uint256) {
        return _holders[user].tokensHeld;
    }

    function daysHeldOf(address user) external view returns (uint256) {
        Holder memory h = _holders[user];
        if (h.firstHeldAt == 0 || h.tokensHeld == 0) return 0;
        return (block.timestamp - h.firstHeldAt) / DAY;
    }

    /// @notice Points currently accrued plus pending (not yet flushed to storage).
    function pointsOf(address user) public view returns (uint256) {
        Holder memory h = _holders[user];
        return uint256(h.points) + _pending(h);
    }

    function _pending(Holder memory h) internal view returns (uint256) {
        if (h.tokensHeld == 0 || h.lastAccrueAt == 0) return 0;
        uint256 elapsed = block.timestamp - h.lastAccrueAt;
        // tokensHeld is in wei (18 decimals). Normalize back to whole-token units.
        return (uint256(h.tokensHeld) * elapsed * POINTS_PER_TOKEN_PER_DAY) / (DAY * 1 ether);
    }

    // ----- hook entrypoints -----

    /// @notice Called by LoyaltyPointsHook when a user buys $LEGEND from the V4 pool.
    function onBuy(address user, uint256 amount) external onlyHook {
        Holder storage h = _holders[user];
        _flush(h);
        if (h.firstHeldAt == 0) h.firstHeldAt = uint128(block.timestamp);
        h.tokensHeld += uint128(amount);
        h.lastAccrueAt = uint128(block.timestamp);
        emit Bought(user, amount, h.tokensHeld);
    }

    /// @notice Called by SellPenaltyHook when a user sells $LEGEND.
    /// @dev Forfeits points proportional to the share of holdings sold. If they sell
    ///      everything, all points are lost AND the days-held clock resets next time
    ///      they buy in again.
    function onSell(address user, uint256 amount) external onlyHook {
        Holder storage h = _holders[user];
        require(amount <= h.tokensHeld, "sell exceeds tracked balance");
        _flush(h);

        uint256 forfeit = (uint256(h.points) * amount) / h.tokensHeld;
        h.points -= uint128(forfeit);
        h.tokensHeld -= uint128(amount);
        if (h.tokensHeld == 0) {
            h.firstHeldAt = 0;
            h.lastAccrueAt = 0;
        }
        emit Sold(user, amount, h.tokensHeld, forfeit);
    }

    /// @notice Called by the NFT contract to spend points on a mint (Hook 3 — Mint Eligibility).
    function spendPoints(address user, uint256 amount) external onlyNft {
        Holder storage h = _holders[user];
        _flush(h);
        require(uint256(h.points) >= amount, "insufficient points");
        h.points -= uint128(amount);
        emit PointsSpent(user, amount);
    }

    function _flush(Holder storage h) internal {
        uint256 pend = _pending(h);
        if (pend > 0) {
            h.points += uint128(pend);
            emit Accrued(msg.sender, pend);
        }
        h.lastAccrueAt = uint128(block.timestamp);
    }
}
