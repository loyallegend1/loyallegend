import { TIER_META, tierForRank } from '../data/countries.js';

// Stable, country-derived "points" so the card has a number to display.
function fakePoints(rank) {
  return 2200 - rank * 9;
}

// `liveTier` (optional): override the tier shown on the bottom bar with a value
// read from chain (LIVE upgrades/degrades from the FIFA oracle).
// `liveRank`  (optional): override the FIFA rank shown.
export default function Card({ country, points, size = 'md', liveTier, liveRank }) {
  const effectiveTier = liveTier ?? country.tier;
  const effectiveRank = liveRank ?? country.rank;
  const meta = TIER_META[effectiveTier];
  const pts = points ?? fakePoints(effectiveRank);

  const sizing = {
    sm: 'w-full max-w-[180px] text-[12px]',
    md: 'w-full max-w-[240px] text-sm',
    lg: 'w-full max-w-[320px] text-base',
  }[size];

  return (
    <div className={`${sizing} rounded-xl overflow-hidden bg-panel border border-line shadow-card flex flex-col`}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl leading-none">{country.flag}</span>
          <span className="font-display tracking-wide truncate text-ink">{country.name.toUpperCase()}</span>
        </div>
        <span className="text-mute text-xs font-mono">#{effectiveRank}</span>
      </div>

      <div className="mx-4 mb-3 aspect-[4/3] rounded-lg bg-gradient-to-br from-line to-bg field-grid flex items-center justify-center">
        <span className="text-6xl drop-shadow-md select-none">{country.flag}</span>
      </div>

      <div className="px-4 pb-3 flex items-center justify-between text-mute">
        <span>FIFA Rank</span>
        <span className="text-ink font-semibold">#{effectiveRank}</span>
      </div>
      <div className="px-4 pb-4 flex items-center justify-between text-mute">
        <span>Points</span>
        <span className="text-ink font-semibold tabular-nums">{pts.toLocaleString()}</span>
      </div>

      <div className={`${meta.color} mt-auto text-bg font-display tracking-[0.25em] text-center py-2`}>
        {meta.label}
      </div>
    </div>
  );
}
