import { COUNTRIES, TIER_META, tierForRank } from '../data/countries.js';

// Mock month-over-month movement. In production these come from the Tier Update Hook events.
const CLIMBERS = [
  { name: 'Türkiye', from: 28, to: 22 },
  { name: 'Senegal', from: 19, to: 14 },
  { name: 'Uzbekistan', from: 72, to: 69 },
  { name: 'Cabo Verde', from: 70, to: 67 },
  { name: 'Morocco', from: 11, to: 8 },
  { name: 'Ecuador', from: 28, to: 23 },
];

const FALLERS = [
  { name: 'Croatia', from: 7, to: 11 },
  { name: 'Tunisia', from: 32, to: 36 },
  { name: 'Russia', from: 33, to: 38 },
  { name: 'Mexico', from: 13, to: 15 },
  { name: 'Wales', from: 31, to: 34 },
  { name: 'Sweden', from: 30, to: 33 },
];

function Row({ entry, kind }) {
  const country = COUNTRIES.find((c) => c.name === entry.name);
  if (!country) return null;
  const fromTier = tierForRank(entry.from);
  const toTier = tierForRank(entry.to);
  const tierChanged = fromTier !== toTier;
  const delta = entry.from - entry.to;
  const arrow = kind === 'climbers' ? '▲' : '▼';
  const arrowColor = kind === 'climbers' ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 border-t border-line">
      <span className="text-2xl">{country.flag}</span>
      <div className="min-w-0">
        <div className="text-ink truncate">{country.name}</div>
        <div className="text-mute text-xs">
          #{entry.from} → #{entry.to}
          {tierChanged && (
            <>
              {' · '}
              <span className={`${TIER_META[fromTier].text}`}>{TIER_META[fromTier].label}</span>
              {' → '}
              <span className={`${TIER_META[toTier].text}`}>{TIER_META[toTier].label}</span>
            </>
          )}
        </div>
      </div>
      <div className={`font-mono text-sm ${arrowColor}`}>
        {arrow} {Math.abs(delta)}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display tracking-wider text-4xl md:text-5xl mb-2">LEADERBOARD</h1>
      <p className="text-mute mb-8">Biggest climbers and fallers from the last FIFA ranking update. Cards upgrade automatically when teams cross tier boundaries.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-line bg-panel">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="font-display tracking-widest text-emerald-400">▲ CLIMBERS</div>
            <span className="text-mute text-xs">This month</span>
          </div>
          {CLIMBERS.map((e) => <Row key={e.name} entry={e} kind="climbers" />)}
        </div>

        <div className="rounded-xl border border-line bg-panel">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="font-display tracking-widest text-rose-400">▼ FALLERS</div>
            <span className="text-mute text-xs">This month</span>
          </div>
          {FALLERS.map((e) => <Row key={e.name} entry={e} kind="fallers" />)}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-line bg-panel p-5 text-sm text-mute">
        <strong className="text-ink">Tier changes are automatic.</strong> When a team crosses a tier boundary (e.g. rank 6 → 5),
        the Tier Update Hook fires on-chain and every card's bottom bar updates within the same block. No manual claim required.
      </div>
    </div>
  );
}
