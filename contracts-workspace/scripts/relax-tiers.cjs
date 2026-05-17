/**
 * Testnet helper — partial redeploy:
 *   - Deploys NEW LoyalLegendNFT (now with setTierSpec function)
 *   - Deploys NEW FifaOracle pointing at the new NFT
 *   - Re-points the existing LoyaltyTracker at the new NFT
 *   - Wires new oracle into new NFT
 *   - Re-seeds 211 FIFA ranks on the new NFT
 *   - Calls setTierSpec for all 4 tiers with relaxed thresholds (0 pts / 0 days / 1 token)
 *     so the user can mint any tier immediately on testnet
 *   - Updates deployments/<network>.json and src/config/contracts.json
 *
 * Keeps the existing LegendToken, LoyaltyTracker, MockPoolManager, and the 3 hooks —
 * those don't need to change. Saves ~80% of the gas vs. a full redeploy.
 *
 * Mint prices stay at the original spec (0.01 / 0.03 / 0.08 / 0.20 ETH).
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No deployment found at ${file}. Run deploy.cjs first.`);
  }
  const existing = JSON.parse(fs.readFileSync(file));
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log('\n==============================================');
  console.log(' Partial redeploy: NFT + Oracle');
  console.log('==============================================');
  console.log(' Network          :', network);
  console.log(' Deployer         :', deployer.address);
  console.log(' Balance          :', hre.ethers.formatEther(balance), 'ETH');
  console.log(' Existing tracker :', existing.contracts.LoyaltyTracker);
  console.log(' Existing token   :', existing.contracts.LegendToken);
  console.log('');

  // 1) Deploy new NFT pointing at existing tracker
  console.log('▶ Deploying new LoyalLegendNFT …');
  const NFT = await hre.ethers.getContractFactory('LoyalLegendNFT');
  const nft = await NFT.deploy(deployer.address, existing.contracts.LoyaltyTracker, existing.houseWallet);
  await nft.waitForDeployment();
  console.log('  ✓ new NFT     ', await nft.getAddress());

  // 2) Deploy new oracle pointing at new NFT
  console.log('▶ Deploying new FifaOracle …');
  const Oracle = await hre.ethers.getContractFactory('FifaOracle');
  const oracle = await Oracle.deploy(deployer.address, await nft.getAddress());
  await oracle.waitForDeployment();
  console.log('  ✓ new Oracle  ', await oracle.getAddress());

  // 3) Re-point tracker at new NFT (so spendPoints calls succeed)
  console.log('▶ Re-pointing tracker.setNft …');
  const tracker = await hre.ethers.getContractAt('LoyaltyTracker', existing.contracts.LoyaltyTracker);
  await (await tracker.setNft(await nft.getAddress())).wait();
  console.log('  ✓');

  // 4) Wire oracle into new NFT
  console.log('▶ nft.setOracle …');
  await (await nft.setOracle(await oracle.getAddress())).wait();
  console.log('  ✓');

  // 5) Seed 211 ranks on the new NFT
  console.log('▶ Seeding 211 ranks on new NFT (this is the expensive step) …');
  const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'countries.json')));
  const seed = countries.map((c) => c.rank);
  await (await nft.seedRanks(seed)).wait();
  console.log('  ✓');

  // 6) Relax tier specs for testnet
  console.log('▶ Relaxing tier specs to 0 points / 0 days / 1 token …');
  const tiers = [
    { idx: 0, name: 'Common',    price: '0.01' },
    { idx: 1, name: 'Rare',      price: '0.03' },
    { idx: 2, name: 'Epic',      price: '0.08' },
    { idx: 3, name: 'Legendary', price: '0.20' },
  ];
  for (const t of tiers) {
    await (await nft.setTierSpec(t.idx, hre.ethers.parseEther(t.price), 0, 0, 1)).wait();
    console.log(`  ✓ ${t.name.padEnd(10)} → ${t.price} ETH, 0 pts, 0 days, 1 token`);
  }

  // 7) Update deployment records
  const updated = {
    ...existing,
    redeployedAt: new Date().toISOString(),
    tierSpecsRelaxed: true,
    contracts: {
      ...existing.contracts,
      LoyalLegendNFT: await nft.getAddress(),
      FifaOracle:     await oracle.getAddress(),
    },
    previous: {
      LoyalLegendNFT: existing.contracts.LoyalLegendNFT,
      FifaOracle:     existing.contracts.FifaOracle,
    },
  };

  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  console.log('\n✓ Wrote', file);

  const feConfigPath = path.join(__dirname, '..', '..', 'src', 'config', 'contracts.json');
  fs.writeFileSync(feConfigPath, JSON.stringify(updated, null, 2));
  console.log('✓ Wrote', feConfigPath);

  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  const spent = balance - finalBalance;
  console.log('\n──────────────────────────────────────────────');
  console.log(' Gas spent:', hre.ethers.formatEther(spent), 'ETH');
  console.log(' Remaining:', hre.ethers.formatEther(finalBalance), 'ETH');
  console.log('──────────────────────────────────────────────');
  console.log('\n You can now mint any tier immediately from the frontend.');
  console.log(' Refresh http://localhost:5173 — the frontend auto-picks up new addresses.\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
