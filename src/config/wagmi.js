import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

// WalletConnect Project ID — needed for WalletConnect-based wallets.
// Get a free one at https://cloud.reown.com (formerly cloud.walletconnect.com).
// For local development the placeholder works for MetaMask / Coinbase Wallet
// (browser-native connectors). Set VITE_WALLETCONNECT_PROJECT_ID in `.env.local`
// when you want WalletConnect mobile wallets to work too.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'loyallegend-dev';

export const wagmiConfig = getDefaultConfig({
  appName: 'LoyalLegend',
  projectId,
  chains: [sepolia, mainnet],
  ssr: false,
});

export const DEFAULT_CHAIN_ID = sepolia.id;
