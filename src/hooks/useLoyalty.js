import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, IS_DEPLOYED } from '../config/contracts.js';
import trackerAbi from '../abi/LoyaltyTracker.json';
import nftAbi from '../abi/LoyalLegendNFT.json';

const TIER_LABELS = ['Common', 'Rare', 'Epic', 'Legendary'];

// Reads the current holder's loyalty state + per-tier specs from chain.
// Returns null fields until the address/contracts/queries are ready.
export function useLoyalty() {
  const { address } = useAccount();

  const enabled = IS_DEPLOYED && !!address;

  const calls = enabled
    ? [
        { address: ADDRESSES.LoyaltyTracker, abi: trackerAbi, functionName: 'pointsOf',     args: [address] },
        { address: ADDRESSES.LoyaltyTracker, abi: trackerAbi, functionName: 'daysHeldOf',   args: [address] },
        { address: ADDRESSES.LoyaltyTracker, abi: trackerAbi, functionName: 'tokensHeldOf', args: [address] },
        { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi,     functionName: 'tierSpec',     args: [0] },
        { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi,     functionName: 'tierSpec',     args: [1] },
        { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi,     functionName: 'tierSpec',     args: [2] },
        { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi,     functionName: 'tierSpec',     args: [3] },
      ]
    : [];

  const { data, isLoading, refetch } = useReadContracts({
    contracts: calls,
    query: { enabled, refetchInterval: 12_000 },
  });

  if (!enabled || !data) {
    return { ready: false, address, isLoading };
  }

  const [points, days, tokensRaw, c0, c1, c2, c3] = data;
  const tiers = [c0, c1, c2, c3].map((r, i) => {
    const v = r?.result;
    return v
      ? {
          label: TIER_LABELS[i],
          priceWei: v[0],
          pointsNeeded: Number(v[1]),
          minDays: Number(v[2]),
          minTokens: Number(v[3]),
        }
      : null;
  });

  return {
    ready: true,
    address,
    isLoading,
    refetch,
    points: Number(points?.result ?? 0n),
    daysHeld: Number(days?.result ?? 0n),
    tokensHeld: Number(formatUnits(tokensRaw?.result ?? 0n, 18)),
    tiers, // [Common, Rare, Epic, Legendary]
  };
}

export function tierIndex(tierName) {
  return ['common', 'rare', 'epic', 'legendary'].indexOf(tierName.toLowerCase());
}
