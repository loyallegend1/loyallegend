import { useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import { COUNTRIES, TIER_META } from '../data/countries.js';
import { useLiveRanks } from '../hooks/useLiveRanks.js';

const FILTERS = ['all', 'legendary', 'epic', 'rare', 'common'];

export default function Gallery() {
  const [tier, setTier] = useState('all');
  const [q, setQ] = useState('');
  const live = useLiveRanks();

  // Effective country = static base merged with live rank/tier when available
  const effectiveCountries = useMemo(() => {
    return COUNTRIES.map((c) => {
      const liveData = live.get(c.rank - 1);
      if (!liveData) return c;
      return { ...c, rank: liveData.rank, tier: liveData.tier };
    });
  }, [live.ready, live.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return effectiveCountries
      .filter((c) => (tier === 'all' || c.tier === tier))
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase().trim()))
      .sort((a, b) => a.rank - b.rank);
  }, [tier, q, effectiveCountries]);

  const counts = useMemo(() => {
    return FILTERS.reduce((acc, t) => {
      acc[t] = t === 'all' ? effectiveCountries.length : effectiveCountries.filter((c) => c.tier === t).length;
      return acc;
    }, {});
  }, [effectiveCountries]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display tracking-wider text-4xl md:text-5xl mb-2">GALLERY</h1>
      <p className="text-mute mb-8">
        All 211 national teams. Tier is bound to current FIFA rank — updated monthly on-chain.
        {live.ready && <span className="ml-2 text-tier-legendary">●</span>}
        {live.ready && <span className="ml-1 text-xs">LIVE</span>}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((t) => {
          const active = tier === t;
          const label = t === 'all' ? 'All' : TIER_META[t].label;
          return (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded-md text-xs tracking-widest font-display transition-colors ${
                active ? 'bg-ink text-bg' : 'bg-panel text-mute hover:text-ink border border-line'
              }`}
            >
              {label} <span className="opacity-60">({counts[t]})</span>
            </button>
          );
        })}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search countries…"
        className="w-full md:w-80 px-4 py-2 mb-8 rounded-md bg-panel border border-line text-ink placeholder:text-mute outline-none focus:border-mute"
      />

      {filtered.length === 0 ? (
        <div className="text-mute py-20 text-center">No teams match that filter.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filtered.map((c) => (
            <Card key={c.code + c.rank} country={c} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
