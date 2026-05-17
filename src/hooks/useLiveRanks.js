import { useReadContracts } from 'wagmi';
import { ADDRESSES, IS_DEPLOYED } from '../config/contracts.js';
import nftAbi from '../abi/LoyalLegendNFT.json';
import { tierForRank } from '../data/countries.js';

// Fetches all 211 live FIFA ranks from the NFT contract in one batched multicall.
// Returns a Map { countryId → { rank, tier } }. Refetches every 12s so a freshly
// pushed oracle update shows up in the UI within ~one slot.
export function useLiveRanks() {
  const contracts = IS_DEPLOYED
    ? Array.from({ length: 211 }, (_, i) => ({
        address: ADDRESSES.LoyalLegendNFT,
        abi: nftAbi,
        functionName: 'ranks',
        args: [BigInt(i)],
      }))
    : [];

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: IS_DEPLOYED, refetchInterval: 12_000, staleTime: 10_000 },
  });

  if (!IS_DEPLOYED || !data) return { ready: false, isLoading, get: () => null };

  const map = new Map();
  data.forEach((r, i) => {
    if (r?.status === 'success') {
      const rank = Number(r.result);
      map.set(i, { rank, tier: tierForRank(rank) });
    }
  });

  return {
    ready: true,
    isLoading,
    get: (countryId) => map.get(countryId) || null,
  };
}
