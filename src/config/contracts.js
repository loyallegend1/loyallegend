// Bridges the JSON written by `contracts-workspace/scripts/deploy.cjs` into the
// frontend. Until deployment has been run, `IS_DEPLOYED` is false and the UI
// shows a placeholder "Not deployed yet" state instead of calling missing addresses.
//
// After running `npx hardhat run scripts/deploy.cjs --network sepolia` the deploy
// script writes `src/config/contracts.json` and Vite picks it up automatically.

const modules = import.meta.glob('./contracts.json', { eager: true });
const deployment = modules['./contracts.json']?.default ?? null;

export const DEPLOYMENT = deployment;
export const ADDRESSES = deployment?.contracts ?? null;
export const IS_DEPLOYED = Boolean(deployment);
export const CHAIN_ID = deployment ? Number(deployment.chainId) : null;
