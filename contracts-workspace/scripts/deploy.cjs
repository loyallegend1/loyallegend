/**
 * LoyalLegend — full Sepolia deployment.
 *
 * Deploys, wires and seeds 9 contracts in a single transaction sequence:
 *   1) LegendToken        — $LEGEND ERC-20 (100M supply minted to deployer)
 *   2) LoyaltyTracker     — points/days/balance state
 *   3) LoyalLegendNFT     — 4,220 cards
 *   4) FifaOracle         — monthly tier-update pusher
 *   5) MockPoolManager    — stand-in for real Uniswap V4 until Step 4
 *   6) LoyaltyPointsHook  — Hook 1
 *   7) SellPenaltyHook    — Hook 2
 *   8) AntiDumpHook       — Hook 5
 *   9) Wires: tracker.setNft, tracker.setHook×3, nft.setOracle, nft.seedRanks(211)
 *
 * Writes the resulting addresses to:
 *   contracts-workspace/deployments/<network>.json   (canonical, machine-readable)
 *   src/config/contracts.json                        (frontend reads this)
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log('\n==============================================');
  console.log(' LoyalLegend deployment');
  console.log('==============================================');
  console.log(' Network : ', network);
  console.log(' Deployer: ', deployer.address);
  console.log(' Balance : ', hre.ethers.formatEther(balance), 'ETH\n');

  if (network === 'sepolia' && balance < hre.ethers.parseEther('0.05')) {
    throw new Error('Deployer has < 0.05 Sepolia ETH. Top up from https://sepoliafaucet.com first.');
  }

  const houseWallet = process.env.HOUSE_WALLET && process.env.HOUSE_WALLET.length === 42
    ? process.env.HOUSE_WALLET
    : deployer.address;
  console.log(' House wallet:', houseWallet, '\n');

  // ----- 1. LegendToken -----
  console.log('▶ Deploying LegendToken …');
  const LegendToken = await hre.ethers.getContractFactory('LegendToken');
  const legend = await LegendToken.deploy(deployer.address);
  await legend.waitForDeployment();
  console.log('  ✓ LegendToken         ', await legend.getAddress());

  // ----- 2. LoyaltyTracker -----
  console.log('▶ Deploying LoyaltyTracker …');
  const Tracker = await hre.ethers.getContractFactory('LoyaltyTracker');
  const tracker = await Tracker.deploy(deployer.address);
  await tracker.waitForDeployment();
  console.log('  ✓ LoyaltyTracker      ', await tracker.getAddress());

  // ----- 3. LoyalLegendNFT -----
  console.log('▶ Deploying LoyalLegendNFT …');
  const NFT = await hre.ethers.getContractFactory('LoyalLegendNFT');
  const nft = await NFT.deploy(deployer.address, await tracker.getAddress(), houseWallet);
  await nft.waitForDeployment();
  console.log('  ✓ LoyalLegendNFT      ', await nft.getAddress());

  // ----- 4. FifaOracle -----
  console.log('▶ Deploying FifaOracle …');
  const Oracle = await hre.ethers.getContractFactory('FifaOracle');
  const oracle = await Oracle.deploy(deployer.address, await nft.getAddress());
  await oracle.waitForDeployment();
  console.log('  ✓ FifaOracle          ', await oracle.getAddress());

  // ----- 5. MockPoolManager -----
  console.log('▶ Deploying MockPoolManager …');
  const Pool = await hre.ethers.getContractFactory('MockPoolManager');
  const pool = await Pool.deploy();
  await pool.waitForDeployment();
  console.log('  ✓ MockPoolManager     ', await pool.getAddress());

  // ----- 6. LoyaltyPointsHook -----
  console.log('▶ Deploying LoyaltyPointsHook …');
  const LoyaltyHook = await hre.ethers.getContractFactory('LoyaltyPointsHook');
  const loyaltyHook = await LoyaltyHook.deploy(
    await pool.getAddress(), await legend.getAddress(), await tracker.getAddress()
  );
  await loyaltyHook.waitForDeployment();
  console.log('  ✓ LoyaltyPointsHook   ', await loyaltyHook.getAddress());

  // ----- 7. SellPenaltyHook -----
  console.log('▶ Deploying SellPenaltyHook …');
  const SellHook = await hre.ethers.getContractFactory('SellPenaltyHook');
  const sellHook = await SellHook.deploy(
    await pool.getAddress(), await legend.getAddress(), await tracker.getAddress()
  );
  await sellHook.waitForDeployment();
  console.log('  ✓ SellPenaltyHook     ', await sellHook.getAddress());

  // ----- 8. AntiDumpHook -----
  console.log('▶ Deploying AntiDumpHook …');
  const AntiDump = await hre.ethers.getContractFactory('AntiDumpHook');
  const antiDump = await AntiDump.deploy(
    await pool.getAddress(), await legend.getAddress(), await tracker.getAddress(), deployer.address
  );
  await antiDump.waitForDeployment();
  console.log('  ✓ AntiDumpHook        ', await antiDump.getAddress());

  // ----- 9. Wire everything -----
  console.log('\n▶ Wiring contracts …');
  await (await tracker.setNft(await nft.getAddress())).wait();
  console.log('  ✓ tracker.setNft');
  await (await tracker.setHook(await loyaltyHook.getAddress(), true)).wait();
  console.log('  ✓ tracker.setHook(LoyaltyPointsHook)');
  await (await tracker.setHook(await sellHook.getAddress(), true)).wait();
  console.log('  ✓ tracker.setHook(SellPenaltyHook)');
  await (await tracker.setHook(await antiDump.getAddress(), true)).wait();
  console.log('  ✓ tracker.setHook(AntiDumpHook)');
  await (await nft.setOracle(await oracle.getAddress())).wait();
  console.log('  ✓ nft.setOracle');

  // ----- 10. Seed initial 211 FIFA ranks -----
  console.log('\n▶ Seeding 211 initial FIFA ranks …');
  const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'countries.json')));
  const seed = countries.map((c) => c.rank);
  if (seed.length !== 211) throw new Error(`Expected 211 ranks, got ${seed.length}`);
  await (await nft.seedRanks(seed)).wait();
  console.log('  ✓ nft.seedRanks(211)');

  // ----- 11. Save addresses -----
  const out = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    houseWallet,
    deployedAt: new Date().toISOString(),
    contracts: {
      LegendToken:       await legend.getAddress(),
      LoyaltyTracker:    await tracker.getAddress(),
      LoyalLegendNFT:    await nft.getAddress(),
      FifaOracle:        await oracle.getAddress(),
      MockPoolManager:   await pool.getAddress(),
      LoyaltyPointsHook: await loyaltyHook.getAddress(),
      SellPenaltyHook:   await sellHook.getAddress(),
      AntiDumpHook:      await antiDump.getAddress(),
    },
  };

  const outDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${network}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('\n✓ Wrote', outPath);

  // Frontend config (relative path from contracts-workspace → ../src/config/contracts.json)
  const feConfigPath = path.join(__dirname, '..', '..', 'src', 'config', 'contracts.json');
  fs.mkdirSync(path.dirname(feConfigPath), { recursive: true });
  fs.writeFileSync(feConfigPath, JSON.stringify(out, null, 2));
  console.log('✓ Wrote', feConfigPath, '(frontend will read this)');

  console.log('\n==============================================');
  console.log(' Deployment complete.');
  console.log('==============================================');
  console.log(' Next: verify on Etherscan with:');
  console.log('   npx hardhat run scripts/verify.cjs --network', network);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
