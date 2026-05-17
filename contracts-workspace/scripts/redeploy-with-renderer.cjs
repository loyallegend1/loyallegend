/**
 * Partial redeploy: NEW LoyalLegendNFT (now with tokenURI override) + LegendRenderer + new FifaOracle.
 * Keeps everything else from the existing deployment.
 *
 *   - Deploys LegendRenderer (~3 KB constants)
 *   - Deploys new LoyalLegendNFT pointing at the existing LoyaltyTracker
 *   - Deploys new FifaOracle pointing at the new NFT
 *   - Wires: tracker.setNft, nft.setRenderer, nft.setOracle
 *   - Re-seeds 211 FIFA ranks (the expensive step)
 *   - Re-applies relaxed tier specs (0 pts / 0 days / 1 token) so user can mint immediately
 *   - Updates deployments/<network>.json AND src/config/contracts.json
 *
 * Total cost: ~0.02 ETH on Sepolia.
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment at ${file}.`);
  const existing = JSON.parse(fs.readFileSync(file));
  const [deployer] = await hre.ethers.getSigners();
  const startBal = await hre.ethers.provider.getBalance(deployer.address);

  console.log('\n==============================================');
  console.log(' Redeploying NFT + Renderer + Oracle (on-chain SVG metadata)');
  console.log('==============================================');
  console.log(' Network          :', network);
  console.log(' Deployer         :', deployer.address);
  console.log(' Balance          :', hre.ethers.formatEther(startBal), 'ETH');
  console.log(' Existing tracker :', existing.contracts.LoyaltyTracker);
  console.log('');

  console.log('▶ Deploying LegendRenderer …');
  const Renderer = await hre.ethers.getContractFactory('LegendRenderer');
  const renderer = await Renderer.deploy();
  await renderer.waitForDeployment();
  console.log('  ✓ Renderer    ', await renderer.getAddress());

  console.log('▶ Deploying new LoyalLegendNFT …');
  const NFT = await hre.ethers.getContractFactory('LoyalLegendNFT');
  const nft = await NFT.deploy(deployer.address, existing.contracts.LoyaltyTracker, existing.houseWallet);
  await nft.waitForDeployment();
  console.log('  ✓ new NFT     ', await nft.getAddress());

  console.log('▶ Deploying new FifaOracle …');
  const Oracle = await hre.ethers.getContractFactory('FifaOracle');
  const oracle = await Oracle.deploy(deployer.address, await nft.getAddress());
  await oracle.waitForDeployment();
  console.log('  ✓ new Oracle  ', await oracle.getAddress());

  console.log('▶ Wiring …');
  const tracker = await hre.ethers.getContractAt('LoyaltyTracker', existing.contracts.LoyaltyTracker);
  await (await tracker.setNft(await nft.getAddress())).wait();
  console.log('  ✓ tracker.setNft');
  await (await nft.setRenderer(await renderer.getAddress())).wait();
  console.log('  ✓ nft.setRenderer');
  await (await nft.setOracle(await oracle.getAddress())).wait();
  console.log('  ✓ nft.setOracle');

  console.log('▶ Seeding 211 ranks (current ranks: Peru #4, Spain #100 reflect the last oracle push) …');
  // Read current ranks from the OLD NFT so the new NFT preserves the latest state
  const oldNft = await hre.ethers.getContractAt('LoyalLegendNFT', existing.contracts.LoyalLegendNFT);
  const seed = [];
  for (let i = 0; i < 211; i++) seed.push(Number(await oldNft.ranks(i)));
  await (await nft.seedRanks(seed)).wait();
  console.log('  ✓ ranks seeded (preserved Peru=#4, Spain=#100, etc.)');

  console.log('▶ Relaxing tier specs (testnet) …');
  const tiers = [
    { idx: 0, price: '0.01' }, { idx: 1, price: '0.03' },
    { idx: 2, price: '0.08' }, { idx: 3, price: '0.20' },
  ];
  for (const t of tiers) {
    await (await nft.setTierSpec(t.idx, hre.ethers.parseEther(t.price), 0, 0, 1)).wait();
  }
  console.log('  ✓ all tiers: 0 pts / 0 days / 1 token');

  // Update records
  const updated = {
    ...existing,
    redeployedAt: new Date().toISOString(),
    rendererEnabled: true,
    contracts: {
      ...existing.contracts,
      LoyalLegendNFT: await nft.getAddress(),
      FifaOracle:     await oracle.getAddress(),
      LegendRenderer: await renderer.getAddress(),
    },
    previous: {
      ...(existing.previous || {}),
      LoyalLegendNFT_prev: existing.contracts.LoyalLegendNFT,
      FifaOracle_prev:     existing.contracts.FifaOracle,
    },
  };

  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  console.log('\n✓ Wrote', file);
  const feConfigPath = path.join(__dirname, '..', '..', 'src', 'config', 'contracts.json');
  fs.writeFileSync(feConfigPath, JSON.stringify(updated, null, 2));
  console.log('✓ Wrote', feConfigPath);

  const endBal = await hre.ethers.provider.getBalance(deployer.address);
  console.log('\n──────────────────────────────────────────────');
  console.log(' Gas spent :', hre.ethers.formatEther(startBal - endBal), 'ETH');
  console.log(' Remaining :', hre.ethers.formatEther(endBal), 'ETH');
  console.log('──────────────────────────────────────────────');
  console.log('\n New NFT:    ', await nft.getAddress());
  console.log(' Renderer:    ', await renderer.getAddress());
  console.log('\n Mint a card on the frontend — it will have on-chain SVG art that');
  console.log(' updates automatically when the oracle pushes new ranks.\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
