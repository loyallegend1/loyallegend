require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

const SEPOLIA_URL = ALCHEMY_KEY
  ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://rpc.sepolia.org';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    // Etherscan API V2 takes a single key string (the v1 per-network object format
    // was deprecated in May 2025).
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: false,
  },
};
