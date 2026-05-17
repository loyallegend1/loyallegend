import { useAccount, useSwitchChain } from 'wagmi';
import { DEFAULT_CHAIN_ID } from '../config/wagmi.js';
import { IS_DEPLOYED, CHAIN_ID } from '../config/contracts.js';

// Shows a banner under the navbar when:
//   • the wallet is connected to a different chain than the deployed contracts
//   • OR no contracts are deployed yet (preview mode)
export default function NetworkBanner() {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const targetChain = CHAIN_ID || DEFAULT_CHAIN_ID;

  if (!IS_DEPLOYED) {
    return (
      <div className="bg-line/60 border-b border-line">
        <div className="max-w-6xl mx-auto px-5 py-2 text-xs text-mute flex items-center justify-between gap-4">
          <span>
            <span className="text-tier-legendary">●</span> Preview mode — contracts not deployed yet.
            Run <code className="font-mono text-ink">deploy.cjs --network sepolia</code> to enable on-chain features.
          </span>
        </div>
      </div>
    );
  }

  if (!isConnected) return null;
  if (chain?.id === targetChain) return null;

  return (
    <div className="bg-rose-500/15 border-b border-rose-500/30">
      <div className="max-w-6xl mx-auto px-5 py-2 text-xs flex items-center justify-between gap-4">
        <span className="text-rose-300">
          ⚠ Wrong network. The contracts live on chain ID {targetChain} but your wallet is on {chain?.name ?? `chain ${chain?.id}`}.
        </span>
        <button
          onClick={() => switchChain({ chainId: targetChain })}
          disabled={isPending}
          className="px-3 py-1 rounded bg-rose-400 text-bg font-semibold disabled:opacity-50"
        >
          {isPending ? 'Switching…' : 'Switch network'}
        </button>
      </div>
    </div>
  );
}
