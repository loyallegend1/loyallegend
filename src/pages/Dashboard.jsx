import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useOwnedCards } from '../hooks/useOwnedCards.js';
import { ADDRESSES, IS_DEPLOYED } from '../config/contracts.js';

function nextFifaUpdate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export default function Dashboard() {
  const { isConnected } = useAccount();
  const loyalty = useLoyalty();
  const owned = useOwnedCards();
  const { d, h, m, s } = useCountdown(nextFifaUpdate());

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display tracking-wider text-4xl md:text-5xl mb-2">DASHBOARD</h1>
      <p className="text-mute mb-8">Your loyalty + your cards — all live on-chain.</p>

      {/* STATS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: '$LEGEND held', value: loyalty.ready ? loyalty.tokensHeld.toLocaleString() : '—' },
          { label: 'Days holding', value: loyalty.ready ? loyalty.daysHeld : '—' },
          { label: 'Loyalty points', value: loyalty.ready ? loyalty.points.toLocaleString() : '—' },
          { label: 'Cards owned', value: owned.ready ? owned.cards.length : (isConnected ? '…' : '—') },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-panel p-5">
            <div className="text-mute text-xs tracking-widest uppercase mb-1">{s.label}</div>
            <div className="font-display text-3xl text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      {/* COUNTDOWN */}
      <div className="rounded-xl border border-line bg-panel p-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-mute text-xs tracking-widest uppercase">Next FIFA ranking update</div>
            <div className="text-ink text-sm">{nextFifaUpdate().toDateString()}</div>
          </div>
          <div className="text-tier-legendary text-xs font-display tracking-widest">CHAINLINK FEED · LIVE</div>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[['DAYS', d], ['HOURS', h], ['MINUTES', m], ['SECONDS', s]].map(([l, v]) => (
            <div key={l} className="bg-bg rounded-lg py-4">
              <div className="font-display text-4xl text-ink tabular-nums">{String(v).padStart(2, '0')}</div>
              <div className="text-mute text-[10px] tracking-widest mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CARDS */}
      <h2 className="font-display tracking-wider text-2xl mb-4">YOUR CARDS</h2>
      {!isConnected && (
        <div className="rounded-xl border border-line bg-panel p-10 text-center text-mute">
          Connect your wallet to see your cards.
        </div>
      )}
      {isConnected && owned.isLoading && (
        <div className="rounded-xl border border-line bg-panel p-10 text-center text-mute">
          Reading your cards from the chain…
        </div>
      )}
      {isConnected && owned.ready && owned.cards.length === 0 && (
        <div className="rounded-xl border border-line bg-panel p-10 text-center text-mute">
          You don't own any cards yet. Head to the Mint page.
        </div>
      )}
      {isConnected && owned.ready && owned.cards.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {owned.cards.map((card) => (
            <div key={card.tokenId} className="rounded-xl overflow-hidden border border-line bg-panel">
              {/* The image is the on-chain SVG, encoded as a data URI */}
              <img src={card.image} alt={card.name} className="w-full block" />
              <div className="px-4 py-3 space-y-1">
                <div className="text-ink font-display tracking-wider truncate">{card.name}</div>
                <div className="text-xs text-mute flex flex-wrap gap-x-3 gap-y-1">
                  {card.attributes?.map((a) => (
                    <span key={a.trait_type}>
                      <span className="text-mute">{a.trait_type}:</span>{' '}
                      <span className="text-ink">{String(a.value)}</span>
                    </span>
                  ))}
                </div>
                <a
                  href={`https://sepolia.etherscan.io/token/${ADDRESSES?.LoyalLegendNFT}?a=${card.tokenId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-tier-legendary underline pt-1"
                >
                  View on Etherscan ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {IS_DEPLOYED && (
        <p className="mt-8 text-xs text-mute">
          Cards are rendered directly from on-chain <code className="text-ink">tokenURI()</code> — no IPFS, no servers.
          The image updates automatically when the FIFA oracle changes a country's tier.
        </p>
      )}
    </div>
  );
}
