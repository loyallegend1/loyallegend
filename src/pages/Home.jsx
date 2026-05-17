import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { COUNTRIES, TIER_META } from '../data/countries.js';

const HOW_IT_WORKS = [
  { n: '01', title: 'Hold $LEGEND', body: 'Earn 1 loyalty point per token per day. The longer you hold, the higher your tier.' },
  { n: '02', title: 'Pick a country', body: '211 national teams, 20 cards each. Choose your team — every country is equal.' },
  { n: '03', title: 'Mint your card', body: 'Eligibility checks your points, days held and token minimum on-chain. No mid-cycle gaming.' },
  { n: '04', title: 'Live with the ranks', body: 'Monthly FIFA rankings flow on-chain via Chainlink. Your card upgrades or degrades automatically.' },
];

const TIER_ROWS = ['legendary', 'epic', 'rare', 'common'];

export default function Home() {
  const featured = [
    COUNTRIES.find((c) => c.name === 'France'),
    COUNTRIES.find((c) => c.name === 'Brazil'),
    COUNTRIES.find((c) => c.name === 'Türkiye'),
    COUNTRIES.find((c) => c.name === 'Peru'),
  ].filter(Boolean);

  return (
    <div>
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block text-xs tracking-[0.3em] text-mute mb-4">FOOTBALL · LOYALTY · NFT</div>
          <h1 className="font-display tracking-wider text-5xl md:text-7xl leading-[0.95] text-ink">
            HOLD LONGER.<br />
            BECOME A <span className="text-tier-legendary">LEGEND</span>.
          </h1>
          <p className="mt-6 text-mute max-w-lg">
            Football NFTs that move with the real world. Card tiers are bound to live FIFA World Rankings —
            updated every month, fully on-chain.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/mint" className="px-5 py-3 rounded-md bg-tier-legendary text-bg font-semibold">Mint a Card</Link>
            <Link to="/gallery" className="px-5 py-3 rounded-md border border-line text-ink hover:bg-line">View Gallery</Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm">
            <div><div className="text-2xl font-display text-ink">211</div><div className="text-mute">national teams</div></div>
            <div><div className="text-2xl font-display text-ink">4,220</div><div className="text-mute">total cards</div></div>
            <div><div className="text-2xl font-display text-ink">20</div><div className="text-mute">per country</div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 justify-items-center">
          {featured.map((c) => (
            <Card key={c.code} country={c} size="sm" />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-5 py-16 border-t border-line">
        <h2 className="font-display tracking-wider text-3xl md:text-4xl mb-10">HOW IT WORKS</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.n} className="bg-panel border border-line rounded-xl p-6">
              <div className="font-mono text-mute text-xs mb-3">{step.n}</div>
              <div className="font-display tracking-wider text-lg mb-2 text-ink">{step.title.toUpperCase()}</div>
              <p className="text-mute text-sm">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TIERS */}
      <section className="max-w-6xl mx-auto px-5 py-16 border-t border-line">
        <h2 className="font-display tracking-wider text-3xl md:text-4xl mb-2">FOUR TIERS</h2>
        <p className="text-mute mb-10 max-w-2xl">Bound to live FIFA rank ranges. Mint price reflects scarcity — every country has exactly 20 cards.</p>

        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead className="text-mute text-left">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Tier</th>
                <th className="px-5 py-3 font-medium">FIFA Rank</th>
                <th className="px-5 py-3 font-medium">Countries</th>
                <th className="px-5 py-3 font-medium">Cards</th>
                <th className="px-5 py-3 font-medium">Points</th>
                <th className="px-5 py-3 font-medium">Min Days</th>
                <th className="px-5 py-3 font-medium">Min Tokens</th>
                <th className="px-5 py-3 font-medium">Mint</th>
              </tr>
            </thead>
            <tbody>
              {TIER_ROWS.map((t) => {
                const m = TIER_META[t];
                const ranges = { legendary: '1–5', epic: '6–20', rare: '21–50', common: '51–211' }[t];
                const countries = { legendary: 5, epic: 15, rare: 30, common: 161 }[t];
                const cards = countries * 20;
                return (
                  <tr key={t} className="border-t border-line">
                    <td className="px-5 py-4">
                      <span className={`inline-block ${m.color} text-bg font-display tracking-widest text-xs px-2.5 py-1 rounded`}>{m.label}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-ink">{ranges}</td>
                    <td className="px-5 py-4 text-ink">{countries}</td>
                    <td className="px-5 py-4 text-ink">{cards.toLocaleString()}</td>
                    <td className="px-5 py-4 text-ink">{m.points.toLocaleString()}</td>
                    <td className="px-5 py-4 text-ink">{m.minDays}</td>
                    <td className="px-5 py-4 text-ink">{m.minTokens}</td>
                    <td className="px-5 py-4 text-ink">{m.mintEth} ETH <span className="text-mute">≈ ${m.mintUsd}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* DYNAMIC */}
      <section className="max-w-6xl mx-auto px-5 py-16 border-t border-line grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="font-display tracking-wider text-3xl md:text-4xl mb-4">CARDS THAT MOVE WITH THE GAME</h2>
          <p className="text-mute mb-6">
            Every month, Chainlink streams the latest FIFA World Rankings on-chain. If a team climbs into a new bracket,
            their cards upgrade automatically. If they fall, they degrade. Only the bottom bar changes — clean and unmistakable.
          </p>
          <ul className="space-y-2 text-sm text-mute">
            <li>• Rank climbs → bottom bar upgrades (Grey → Blue → Purple → Gold)</li>
            <li>• Rank falls → bottom bar degrades</li>
            <li>• Email + on-chain notification on every change</li>
            <li>• Visible immediately in OpenSea and MetaMask</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4 justify-items-center">
          <Card country={COUNTRIES.find((c) => c.name === 'Brazil')} size="sm" />
          <Card country={COUNTRIES.find((c) => c.name === 'Croatia')} size="sm" />
        </div>
      </section>
    </div>
  );
}
