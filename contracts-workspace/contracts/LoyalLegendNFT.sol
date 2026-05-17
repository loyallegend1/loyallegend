// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILoyaltyTracker {
    function pointsOf(address user) external view returns (uint256);
    function daysHeldOf(address user) external view returns (uint256);
    function tokensHeldOf(address user) external view returns (uint256);
    function spendPoints(address user, uint256 amount) external;
}

interface ILegendRenderer {
    function tokenURI(uint256 tokenId, uint16 countryId, uint16 rank, uint8 tier)
        external pure returns (string memory);
}

/// @title LoyalLegendNFT — 4,220 dynamic football cards
/// @notice 211 national teams × 20 cards each. Token IDs are deterministic:
///         tokenId = countryId * 20 + slot   (countryId 0..210, slot 0..19)
///
///         Eligibility (Hook 3, on-mint) checks the LoyaltyTracker for:
///           1) points,  2) days held,  3) min tokens currently held.
///         Mint price (in ETH) is set per tier.
///
///         Tier is derived live from the current FIFA rank of the country
///         (stored in `ranks` and updated monthly by FifaOracle — Hook 4).
///         Bottom-bar color in the frontend reads from `tierOf(countryId)`.
contract LoyalLegendNFT is ERC721, Ownable, ReentrancyGuard {
    enum Tier { Common, Rare, Epic, Legendary }

    uint256 public constant COUNTRIES = 211;
    uint256 public constant CARDS_PER_COUNTRY = 20;
    uint256 public constant TOTAL_SUPPLY = COUNTRIES * CARDS_PER_COUNTRY; // 4220

    ILoyaltyTracker public immutable tracker;
    ILegendRenderer public renderer;
    address public oracle;
    address public houseWallet;

    // Per-country state
    uint16[COUNTRIES] public ranks;            // 1..COUNTRIES (1 = best)
    uint8[COUNTRIES] public mintedCount;       // how many of this country's 20 are minted

    // Tier requirements & pricing (indexed by Tier enum)
    struct TierSpec {
        uint96 priceWei;
        uint32 pointsNeeded;
        uint32 minDays;
        uint32 minTokens;        // in whole tokens
    }
    mapping(uint8 => TierSpec) public tierSpec;

    event Minted(address indexed minter, uint256 indexed tokenId, uint256 countryId, Tier tier);
    event RanksUpdated(uint256 changedCount);
    event TierChanged(uint256 indexed countryId, uint16 oldRank, uint16 newRank, Tier oldTier, Tier newTier);
    event OracleSet(address indexed oracle);
    event HouseWalletSet(address indexed wallet);
    event RendererSet(address indexed renderer);

    modifier onlyOracle() {
        require(msg.sender == oracle, "not oracle");
        _;
    }

    constructor(address initialOwner, address tracker_, address houseWallet_)
        ERC721("LoyalLegend", "LL")
        Ownable(initialOwner)
    {
        tracker = ILoyaltyTracker(tracker_);
        houseWallet = houseWallet_;

        // Tier specs per the spec sheet
        tierSpec[uint8(Tier.Common)]    = TierSpec({priceWei: 0.01 ether, pointsNeeded: 100,  minDays: 3,  minTokens: 34});
        tierSpec[uint8(Tier.Rare)]      = TierSpec({priceWei: 0.03 ether, pointsNeeded: 500,  minDays: 7,  minTokens: 72});
        tierSpec[uint8(Tier.Epic)]      = TierSpec({priceWei: 0.08 ether, pointsNeeded: 2000, minDays: 15, minTokens: 134});
        tierSpec[uint8(Tier.Legendary)] = TierSpec({priceWei: 0.20 ether, pointsNeeded: 5000, minDays: 30, minTokens: 167});
    }

    // ----- admin -----

    function setOracle(address oracle_) external onlyOwner {
        oracle = oracle_;
        emit OracleSet(oracle_);
    }

    function setHouseWallet(address w) external onlyOwner {
        houseWallet = w;
        emit HouseWalletSet(w);
    }

    function setRenderer(address renderer_) external onlyOwner {
        renderer = ILegendRenderer(renderer_);
        emit RendererSet(renderer_);
    }

    /// @notice Seed initial FIFA rankings. Each entry is a rank 1..211; the array index is the countryId.
    function seedRanks(uint16[] calldata initialRanks) external onlyOwner {
        require(initialRanks.length == COUNTRIES, "bad length");
        for (uint256 i = 0; i < COUNTRIES; i++) {
            ranks[i] = initialRanks[i];
        }
    }

    /// @notice Update the eligibility + pricing rules for a tier. Used on testnet to relax
    ///         requirements for faster testing; on mainnet the constructor defaults remain.
    function setTierSpec(
        uint8 tier,
        uint96 priceWei,
        uint32 pointsNeeded,
        uint32 minDays,
        uint32 minTokens
    ) external onlyOwner {
        require(tier <= uint8(Tier.Legendary), "bad tier");
        tierSpec[tier] = TierSpec({
            priceWei: priceWei,
            pointsNeeded: pointsNeeded,
            minDays: minDays,
            minTokens: minTokens
        });
    }

    // ----- pure helpers -----

    function tierForRank(uint16 rank) public pure returns (Tier) {
        if (rank == 0) return Tier.Common; // unranked → common bucket
        if (rank <= 5) return Tier.Legendary;
        if (rank <= 20) return Tier.Epic;
        if (rank <= 50) return Tier.Rare;
        return Tier.Common;
    }

    function tierOf(uint256 countryId) public view returns (Tier) {
        require(countryId < COUNTRIES, "bad country");
        return tierForRank(ranks[countryId]);
    }

    function tierOfToken(uint256 tokenId) external view returns (Tier) {
        require(tokenId < TOTAL_SUPPLY, "bad token");
        return tierOf(tokenId / CARDS_PER_COUNTRY);
    }

    function rankOfToken(uint256 tokenId) external view returns (uint16) {
        require(tokenId < TOTAL_SUPPLY, "bad token");
        return ranks[tokenId / CARDS_PER_COUNTRY];
    }

    // ----- mint (Hook 3 — eligibility check) -----

    function mint(uint256 countryId) external payable nonReentrant returns (uint256 tokenId) {
        require(countryId < COUNTRIES, "bad country");
        require(mintedCount[countryId] < CARDS_PER_COUNTRY, "country sold out");

        Tier t = tierOf(countryId);
        TierSpec memory spec = tierSpec[uint8(t)];

        require(msg.value == spec.priceWei, "wrong price");

        // ----- ELIGIBILITY CHECK (Hook 3) -----
        require(tracker.pointsOf(msg.sender)     >= spec.pointsNeeded,           "not enough points");
        require(tracker.daysHeldOf(msg.sender)   >= spec.minDays,                "not held long enough");
        require(tracker.tokensHeldOf(msg.sender) >= uint256(spec.minTokens) * 1 ether, "not enough tokens held");

        // Spend points so a single buyer can't drain mints across countries with one stash.
        tracker.spendPoints(msg.sender, spec.pointsNeeded);

        uint256 slot = mintedCount[countryId];
        mintedCount[countryId] = uint8(slot + 1);
        tokenId = countryId * CARDS_PER_COUNTRY + slot;

        _safeMint(msg.sender, tokenId);

        (bool ok, ) = payable(houseWallet).call{value: msg.value}("");
        require(ok, "house transfer failed");

        emit Minted(msg.sender, tokenId, countryId, t);
    }

    // ----- Hook 4 — Tier Update (called by oracle) -----

    /// @notice Push the latest FIFA rankings on-chain. Emits a TierChanged event for every
    ///         country whose tier actually changed (so the frontend / indexer can show upgrades).
    function updateRanks(uint16[] calldata newRanks) external onlyOracle {
        require(newRanks.length == COUNTRIES, "bad length");
        uint256 changes = 0;
        for (uint256 i = 0; i < COUNTRIES; i++) {
            uint16 oldRank = ranks[i];
            uint16 newRank = newRanks[i];
            if (oldRank == newRank) continue;

            Tier oldTier = tierForRank(oldRank);
            Tier newTier = tierForRank(newRank);
            ranks[i] = newRank;

            if (oldTier != newTier) {
                emit TierChanged(i, oldRank, newRank, oldTier, newTier);
                unchecked { changes++; }
            }
        }
        emit RanksUpdated(changes);
    }

    // ----- tokenURI override (live on-chain SVG via renderer) -----

    /// @notice Returns a data: URI JSON metadata for a token, with the live
    ///         on-chain rank and tier baked into both the image and attributes.
    ///         Re-reads state every call → upgrades/degrades are reflected instantly.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        require(address(renderer) != address(0), "renderer not set");
        uint256 countryId = tokenId / CARDS_PER_COUNTRY;
        uint16 rank = ranks[countryId];
        uint8 tier = uint8(tierForRank(rank));
        return renderer.tokenURI(tokenId, uint16(countryId), rank, tier);
    }
}
