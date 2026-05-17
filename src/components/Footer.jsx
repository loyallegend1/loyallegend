export default function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-display text-xl tracking-widest mb-2">
            LOYAL<span className="text-tier-legendary">LEGEND</span>
          </div>
          <p className="text-mute">Hold longer. Become a Legend. Football NFTs that move with the FIFA rankings.</p>
        </div>
        <div>
          <div className="text-ink font-semibold mb-2">Project</div>
          <ul className="space-y-1 text-mute">
            <li>211 national teams</li>
            <li>4,220 total cards</li>
            <li>4 tiers — Common to Legendary</li>
            <li>Dynamic monthly upgrades</li>
          </ul>
        </div>
        <div>
          <div className="text-ink font-semibold mb-2">Resources</div>
          <ul className="space-y-1 text-mute">
            <li>FIFA Rankings source: Sofascore</li>
            <li>Ethereum mainnet</li>
            <li>Uniswap V4 hooks</li>
            <li>Chainlink Oracle</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-4 text-xs text-mute flex justify-between">
          <span>© 2026 LoyalLegend</span>
          <span>$LEGEND · ERC-20 · ERC-721</span>
        </div>
      </div>
    </footer>
  );
}
