# 🏆 LoyalLegend

> **Hold longer. Become a Legend.**

LoyalLegend is a football NFT protocol on Ethereum where **211 national team cards automatically upgrade or degrade based on live FIFA World Rankings** — powered by Chainlink oracle and Uniswap V4 hooks.

---

## What Makes It Different

| Feature | LoyalLegend | Others |
|---|---|---|
| Card artwork | **Auto-updates when FIFA rank changes** | Static |
| Metadata storage | **100% on-chain SVG — no IPFS, no servers** | IPFS / centralized |
| Minting access | **Loyalty-gated — hold $LEGEND tokens** | Open to anyone |
| Hook system | **5 custom Uniswap V4 hooks** | None |
| Coverage | **All 211 national teams** | Selected clubs/players |

---

## How It Works

```
Hold $LEGEND tokens for X days
        ↓
Earn loyalty points (1 point per token per day)
        ↓
Unlock minting rights for your country's card
        ↓
Chainlink oracle updates FIFA rankings monthly
        ↓
Card tier upgrades/degrades automatically on-chain
```

---

## Tier System

| Tier | FIFA Rank | Cards | Mint Price |
|---|---|---|---|
| 💎 Legendary | Rank 1–5 | 100 | 0.20 ETH |
| 🥇 Epic | Rank 6–20 | 300 | 0.08 ETH |
| 🥈 Rare | Rank 21–50 | 600 | 0.03 ETH |
| 🥉 Common | Rank 51–211 | 3,220 | 0.01 ETH |

**Total supply: 4,220 cards — 20 per country, all 211 national teams.**

---

## Uniswap V4 Hooks

LoyalLegend uses 5 custom V4 hooks as core protocol infrastructure:

| Hook | Purpose |
|---|---|
| `afterSwap` (Buy detector) | Detects $LEGEND purchases, starts loyalty clock |
| `beforeSwap` (Anti-dump) | Blocks large sells before minimum hold period |
| `beforeAddLiquidity` | Bonus loyalty points for liquidity providers |
| `afterRemoveLiquidity` | Adjusts loyalty when LP is withdrawn |
| `afterSwap` (Referral) | Tracks referral chains, awards bonus points |

---

## Smart Contracts

| Contract | Purpose |
|---|---|
| `LoyalLegendNFT.sol` | ERC-721 NFT with dynamic tier system |
| `LegendRenderer.sol` | 100% on-chain SVG art generator |
| `LoyaltyTracker.sol` | Tracks points, days held, token balance per wallet |
| `LegendToken.sol` | ERC-20 $LEGEND token |
| `FifaOracle.sol` | Chainlink-powered FIFA ranking oracle |
| V4 Hooks (×5) | Uniswap V4 liquidity hooks |

**Deployed on Sepolia testnet — mainnet launch targeting Q3 2026.**

---

## Tech Stack

- **Smart Contracts:** Solidity ^0.8.27, OpenZeppelin v5, Hardhat
- **Randomness / Oracle:** Chainlink
- **DEX Hooks:** Uniswap V4
- **Frontend:** React + Vite + Tailwind CSS
- **Wallet:** wagmi v2 + RainbowKit + viem
- **Art:** On-chain SVG (no IPFS, no servers)

---

## Demo

Live on Sepolia testnet. Example: UAE promoted from rank 74 → rank 4 via oracle update — card instantly changed from grey COMMON to gold LEGENDARY.

---

## Roadmap

- [x] Smart contracts — deployed on Sepolia
- [x] On-chain SVG renderer with flag colors
- [x] Chainlink oracle — live FIFA ranking updates
- [x] 5 Uniswap V4 hooks implemented
- [x] Frontend — mint, gallery, dashboard pages
- [ ] Security audit
- [ ] Mainnet launch (Q3 2026)
- [ ] $LEGEND token + Uniswap V4 pool launch
- [ ] 2026 FIFA World Cup campaign

---

## Contact

- Twitter: [@LoyalLegendNFT](https://twitter.com/LoyalLegendNFT)
- Built on Ethereum

---

*"The art changes. The chain never lies."*
