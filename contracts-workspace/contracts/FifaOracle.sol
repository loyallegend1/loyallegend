// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ILoyalLegendNFT {
    function updateRanks(uint16[] calldata newRanks) external;
}

/// @title FifaOracle — pushes monthly FIFA rankings on-chain
/// @notice In production this is a Chainlink Functions consumer; the off-chain DON
///         fetches https://www.sofascore.com/football/rankings/fifa and calls
///         `fulfillRequest()` once a month.
///
///         For local testing and the public Step-2 demo, the owner can call
///         `pushRanks()` directly. Both paths route into the NFT contract's
///         `updateRanks()` (Hook 4 — Tier Update), which fires TierChanged events
///         that the frontend listens for.
contract FifaOracle is Ownable {
    ILoyalLegendNFT public immutable nft;

    address public chainlinkRouter;     // Chainlink Functions router (set per network)
    bytes32 public latestRequestId;
    uint256 public lastFulfilledAt;

    event ChainlinkRouterSet(address indexed router);
    event RequestSent(bytes32 indexed requestId);
    event RanksPushed(uint256 timestamp, uint256 countries);

    constructor(address initialOwner, address nft_) Ownable(initialOwner) {
        nft = ILoyalLegendNFT(nft_);
    }

    function setChainlinkRouter(address router) external onlyOwner {
        chainlinkRouter = router;
        emit ChainlinkRouterSet(router);
    }

    /// @notice Owner / Chainlink keeper trigger for monthly updates.
    /// @dev Marked virtual so a Chainlink-Functions-enabled child can override and
    ///      route a real request via the DON.
    function requestUpdate() external virtual onlyOwner returns (bytes32 requestId) {
        // In a Chainlink Functions deployment this is where we'd call
        // `_sendRequest(...)`. For now we emit an event the off-chain script watches.
        requestId = keccak256(abi.encodePacked(block.number, block.timestamp));
        latestRequestId = requestId;
        emit RequestSent(requestId);
    }

    /// @notice Fulfillment path — pushes ranks into the NFT contract.
    /// @dev Owner-only here. In a real Chainlink Functions setup the router calls a
    ///      `fulfillRequest` method that decodes the response and then calls this.
    function pushRanks(uint16[] calldata newRanks) external onlyOwner {
        nft.updateRanks(newRanks);
        lastFulfilledAt = block.timestamp;
        emit RanksPushed(block.timestamp, newRanks.length);
    }
}
