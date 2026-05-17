import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ADDRESSES, IS_DEPLOYED } from '../config/contracts.js';
import nftAbi from '../abi/LoyalLegendNFT.json';

// Reads the owner's NFT balance, scans the (modest) tokenId space to find which
// tokens they own, and fetches each token's on-chain tokenURI + decoded SVG.
//
// We scan tokenIds 0..4219 in batches via multicall and filter by ownership.
// With 4,220 tokens this is fine; on-chain SVG metadata doesn't need a subgraph.
export function useOwnedCards() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [state, setState] = useState({ ready: false, isLoading: false, cards: [] });

  useEffect(() => {
    if (!IS_DEPLOYED || !address || !client) {
      setState({ ready: false, isLoading: false, cards: [] });
      return;
    }
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const balance = await client.readContract({
          address: ADDRESSES.LoyalLegendNFT,
          abi: nftAbi,
          functionName: 'balanceOf',
          args: [address],
        });
        const bal = Number(balance);
        if (bal === 0) {
          if (!cancelled) setState({ ready: true, isLoading: false, cards: [] });
          return;
        }

        // Find owned token IDs by querying mintedCount per country to limit the search.
        // Then for each minted token, check ownerOf to see if it matches the user.
        const mintedCounts = await client.multicall({
          contracts: Array.from({ length: 211 }, (_, i) => ({
            address: ADDRESSES.LoyalLegendNFT,
            abi: nftAbi,
            functionName: 'mintedCount',
            args: [BigInt(i)],
          })),
        });

        const candidateTokenIds = [];
        mintedCounts.forEach((r, countryId) => {
          if (r?.status !== 'success') return;
          const count = Number(r.result);
          for (let slot = 0; slot < count; slot++) {
            candidateTokenIds.push(BigInt(countryId) * 20n + BigInt(slot));
          }
        });

        if (candidateTokenIds.length === 0) {
          if (!cancelled) setState({ ready: true, isLoading: false, cards: [] });
          return;
        }

        const ownerResults = await client.multicall({
          contracts: candidateTokenIds.map((tokenId) => ({
            address: ADDRESSES.LoyalLegendNFT,
            abi: nftAbi,
            functionName: 'ownerOf',
            args: [tokenId],
          })),
        });

        const ownedIds = candidateTokenIds.filter(
          (_, i) => ownerResults[i]?.status === 'success'
            && ownerResults[i].result?.toLowerCase() === address.toLowerCase()
        );

        if (ownedIds.length === 0) {
          if (!cancelled) setState({ ready: true, isLoading: false, cards: [] });
          return;
        }

        // Fetch tokenURI for each owned token
        const uriResults = await client.multicall({
          contracts: ownedIds.map((tokenId) => ({
            address: ADDRESSES.LoyalLegendNFT,
            abi: nftAbi,
            functionName: 'tokenURI',
            args: [tokenId],
          })),
        });

        const cards = ownedIds.map((tokenId, i) => {
          const uri = uriResults[i]?.result;
          if (!uri || typeof uri !== 'string') return null;
          if (!uri.startsWith('data:application/json;base64,')) return null;
          try {
            const json = JSON.parse(atob(uri.split(',')[1]));
            return {
              tokenId: String(tokenId),
              countryId: Number(tokenId / 20n),
              name: json.name,
              description: json.description,
              image: json.image,
              attributes: json.attributes,
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        if (!cancelled) setState({ ready: true, isLoading: false, cards });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('useOwnedCards', e);
        if (!cancelled) setState({ ready: true, isLoading: false, cards: [] });
      }
    })();

    return () => { cancelled = true; };
  }, [address, client]);

  return state;
}
