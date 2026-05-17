/**
 * Verifies every contract from deployments/<network>.json on Etherscan.
 * Run AFTER deploy.cjs.
 *
 *   npx hardhat run scripts/verify.cjs --network sepolia
 *
 * Idempotent: if a contract is already verified, the error is caught and we move on.
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function verify(address, args, label) {
  process.stdout.write(`▶ ${label} (${address}) … `);
  try {
    await hre.run('verify:verify', { address, constructorArguments: args });
    console.log('verified ✓');
  } catch (e) {
    const msg = (e && e.message) || String(e);
    if (msg.toLowerCase().includes('already verified')) {
      console.log('already verified ✓');
    } else {
      console.log('FAILED');
      console.log('   ', msg.split('\n')[0]);
    }
  }
}

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No deployment found at ${file}. Run deploy.cjs first.`);
  }
  const d = JSON.parse(fs.readFileSync(file));
  const { deployer, houseWallet, contracts: c } = d;

  console.log(`\nVerifying contracts on ${network} …\n`);

  await verify(c.LegendToken,       [deployer],                                                  'LegendToken');
  await verify(c.LoyaltyTracker,    [deployer],                                                  'LoyaltyTracker');
  await verify(c.LoyalLegendNFT,    [deployer, c.LoyaltyTracker, houseWallet],                   'LoyalLegendNFT');
  await verify(c.FifaOracle,        [deployer, c.LoyalLegendNFT],                                'FifaOracle');
  await verify(c.MockPoolManager,   [],                                                          'MockPoolManager');
  await verify(c.LoyaltyPointsHook, [c.MockPoolManager, c.LegendToken, c.LoyaltyTracker],        'LoyaltyPointsHook');
  await verify(c.SellPenaltyHook,   [c.MockPoolManager, c.LegendToken, c.LoyaltyTracker],        'SellPenaltyHook');
  await verify(c.AntiDumpHook,      [c.MockPoolManager, c.LegendToken, c.LoyaltyTracker, deployer], 'AntiDumpHook');

  console.log('\n✓ Verification pass complete.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
