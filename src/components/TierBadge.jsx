import { TIER_META } from '../data/countries.js';

export default function TierBadge({ tier }) {
  const meta = TIER_META[tier];
  return (
    <span className={`inline-block ${meta.color} text-bg font-display tracking-widest text-xs px-2.5 py-1 rounded`}>
      {meta.label}
    </span>
  );
}
