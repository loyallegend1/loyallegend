import { useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContracts } from 'wagmi';
import Card from '../components/Card.jsx';
import { COUNTRIES, TIER_META, tierForRank } from '../data/countries.js';
import { ADDRESSES, IS_DEPLOYED } from '../config/contracts.js';
import { useLoyalty, tierIndex } from '../hooks/useLoyalty.js';
import { useLiveRanks } from '../hooks/useLiveRanks.js';
import nftAbi from '../abi/LoyalLegendNFT.json';

const TIER_NAMES = ['common', 'rare', 'epic', 'legendary'];

export default function Mint() {
  const [selected, setSelected] = useState(COUNTRIES.find((c) => c.name === 'Peru'));
  const [q, setQ] = useState('');
  const { isConnected } = useAccount();
  const loyalty = useLoyalty();

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const live = useLiveRanks();

  // Merge live on-chain rank/tier into each country row
  const effective = useMemo(() => {
    return COUNTRIES.map((c) => {
      const ld = live.get(c.rank - 1);
      return ld ? { ...c, rank: ld.rank, tier: ld.tier } : c;
    });
  }, [live.ready, live.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const f = q.trim().toLowerCase();
    const base = f ? effective.filter((c) => c.name.toLowerCase().includes(f)) : effective;
    return [...base].sort((a, b) => a.rank - b.rank);
  }, [q, effective]);

  // countryId is stable — derived from the ORIGINAL rank baked into the frontend
  // dataset, not the (possibly upgraded) live rank.
  const originalCountry = COUNTRIES.find((c) => c.code === selected.code && c.name === selected.name);
  const countryId = BigInt((originalCountry?.rank ?? selected.rank) - 1);
  const { data: liveData } = useReadContracts({
    contracts: IS_DEPLOYED
      ? [
          { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi, functionName: 'ranks',  args: [countryId] },
          { address: ADDRESSES.LoyalLegendNFT, abi: nftAbi, functionName: 'tierOf', args: [countryId] },
        ]
      : [],
    query: { enabled: IS_DEPLOYED, refetchInterval: 12_000 },
  });
  const liveRank = liveData?.[0]?.result != null ? Number(liveData[0].result) : null;
  const liveTier = liveData?.[1]?.result != null ? TIER_NAMES[Number(liveData[1].result)] : null;

  const tIdx = liveTier ? tierIndex(liveTier) : tierIndex(selected.tier);
  const spec = loyalty.ready ? loyalty.tiers[tIdx] : null;
  const meta = TIER_META[liveTier ?? selected.tier];
  const priceWei = spec?.priceWei ?? BigInt(Math.floor(meta.mintEth * 1e18));

  // Eligibility breakdown (on-chain when wallet connected, else show defaults)
  const checks = spec
    ? [
        { label: 'Loyalty Points', need: spec.pointsNeeded, have: loyalty.points,     fmt: (v) => v.toLocaleString() },
        { label: 'Days Holding',   need: spec.minDays,      have: loyalty.daysHeld,   fmt: (v) => `${v} days` },
        { label: 'Min Tokens',     need: spec.minTokens,    have: Math.floor(loyalty.tokensHeld), fmt: (v) => `${v} $LEGEND` },
      ]
    : [
        { label: 'Loyalty Points', need: meta.points,    have: 0, fmt: (v) => v.toLocaleString() },
        { label: 'Days Holding',   need: meta.minDays,   have: 0, fmt: (v) => `${v} days` },
        { label: 'Min Tokens',     need: meta.minTokens, have: 0, fmt: (v) => `${v} $LEGEND` },
      ];
  const allPass = isConnected && spec && checks.every((c) => c.have >= c.need);

  function onMint() {
    if (!IS_DEPLOYED) return;
    reset();
    writeContract({
      address: ADDRESSES.LoyalLegendNFT,
      abi: nftAbi,
      functionName: 'mint',
      args: [BigInt(selected.rank - 1)], // countryId = rank-1 because we seeded rank=index+1
      value: priceWei,
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display tracking-wider text-4xl md:text-5xl mb-2">MINT A CARD</h1>
      <p className="text-mute mb-8">Pick your team. The contract checks your loyalty before opening the mint.</p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        {/* LEFT: picker */}
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 211 teams…"
            className="w-full px-4 py-2 mb-4 rounded-md bg-panel border border-line text-ink placeholder:text-mute outline-none focus:border-mute"
          />

          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-line bg-panel divide-y divide-line">
            {list.map((c) => {
              const m = TIER_META[c.tier];
              const active = c.code === selected.code && c.rank === selected.rank;
              return (
                <button
                  key={c.code + c.rank}
                  onClick={() => { setSelected(c); reset(); }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-line/60 ${
                    active ? 'bg-line/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-ink truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-mute font-mono text-xs">#{c.rank}</span>
                    <span className={`${m.color} text-bg text-[10px] font-display tracking-widest px-2 py-0.5 rounded`}>
                      {m.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: preview + eligibility */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <Card country={selected} size="md" liveTier={liveTier} liveRank={liveRank} />
          </div>

          <div className="rounded-xl border border-line bg-panel p-5">
            <div className="font-display tracking-wider text-sm text-mute mb-3">ELIGIBILITY (LIVE ON-CHAIN)</div>
            <ul className="space-y-2">
              {checks.map((c) => {
                const pass = c.have >= c.need;
                return (
                  <li key={c.label} className="flex items-center justify-between text-sm">
                    <span className="text-mute">{c.label}</span>
                    <span className={pass ? 'text-emerald-400' : 'text-rose-400'}>
                      {pass ? '✓' : '✗'} {c.fmt(c.have)} <span className="text-mute">/ {c.fmt(c.need)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-mute">Mint Price</span>
              <span className="text-ink font-semibold">
                {(Number(priceWei) / 1e18).toString()} ETH <span className="text-mute">≈ ${meta.mintUsd}</span>
              </span>
            </div>

            <button
              disabled={!allPass || isPending || confirming}
              onClick={onMint}
              className={`mt-5 w-full py-3 rounded-md font-semibold transition-colors ${
                allPass && !isPending && !confirming
                  ? 'bg-tier-legendary text-bg hover:opacity-90'
                  : 'bg-line text-mute cursor-not-allowed'
              }`}
            >
              {!isConnected
                ? 'Connect wallet to mint'
                : !IS_DEPLOYED
                ? 'Contracts not deployed'
                : isPending
                ? 'Approve in wallet…'
                : confirming
                ? 'Confirming on Sepolia…'
                : isSuccess
                ? `✓ Minted ${selected.name}!`
                : allPass
                ? `Mint ${selected.name}`
                : 'Not eligible yet'}
            </button>

            {hash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="block mt-3 text-xs text-tier-legendary underline truncate"
              >
                View transaction on Etherscan ↗
              </a>
            )}
            {(writeError || receiptError) && (
              <div className="mt-3 text-xs text-rose-400">
                {((writeError || receiptError).shortMessage || (writeError || receiptError).message || '').slice(0, 200)}
              </div>
            )}
          </div>

          <div className="text-xs text-mute leading-relaxed">
            <strong className="text-ink">Live:</strong> this page now writes real transactions to your deployed contracts.
            Make sure MetaMask is on Sepolia.
          </div>
        </div>
      </div>
    </div>
  );
}
