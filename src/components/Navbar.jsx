import { NavLink, Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/gallery', label: 'Gallery' },
  { to: '/mint', label: 'Mint' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-bg/70 border-b border-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-display tracking-widest text-ink text-xl">
            LOYAL<span className="text-tier-legendary">LEGEND</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive ? 'text-ink bg-line' : 'text-mute hover:text-ink hover:bg-line/60'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <ConnectButton
          accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          chainStatus="icon"
          showBalance={false}
        />
      </div>

      <nav className="md:hidden border-t border-line px-2 py-2 flex gap-1 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                isActive ? 'text-ink bg-line' : 'text-mute hover:text-ink'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
