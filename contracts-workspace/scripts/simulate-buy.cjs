/**
 * Owner helper — simulates a $LEGEND buy for a target wallet so the LoyaltyTracker
 * starts accruing points. Until the real Uniswap V4 pool lands in Step 4, this is
 * how you bootstrap loyalty for your test wallets on Sepolia.
 *
 * Usage (from contracts-workspace/):
 *   TARGET=0xYourWallet AMOUNT=100 npx hardhat run scripts/simulate-buy.cjs --network sepolia
 *
 * Env vars:
 *   TARGET — wallet to credit (defaults to deployer)
 *   AMOUNT — whole-token amount of $LEGEND (defaults to 100)
 *
 * Only callable by the deployer (the MockPoolManager has no access control, but
 * the LoyaltyTracker only accepts calls from the registered LoyaltyPointsHook).
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment for ${network}. Run deploy.cjs first.`);
  const { contracts: c } = JSON.parse(fs.readFileSync(file));

  const [signer] = await hre.ethers.getSigners();
  const target = process.env.TARGET || signer.address;
  const amount = hre.ethers.parseEther(process.env.AMOUNT || '100');

  console.log(`\nSimulating BUY for ${target} → ${hre.ethers.formatEther(amount)} LEGEND\n`);

  const pool = await hre.ethers.getContractAt('MockPoolManager', c.MockPoolManager);

  // Use a synthetic non-LEGEND token address — anything that's not LEGEND works
  // because the mock pool doesn't actually move ERC-20 balances.
  const otherToken = '0x0000000000000000000000000000000000000001';

  const tx = await pool.simulateBuy(target, c.LegendToken, otherToken, c.LoyaltyPointsHook, amount);
  console.log('  tx:', tx.hash);
  await tx.wait();

  const tracker = await hre.ethers.getContractAt('LoyaltyTracker', c.LoyaltyTracker);
  const held    = await tracker.tokensHeldOf(target);
  const days_   = await tracker.daysHeldOf(target);
  const points  = await tracker.pointsOf(target);

  console.log('\n✓ Buy simulated.');
  console.log('  tokensHeld:', hre.ethers.formatEther(held), 'LEGEND');
  console.log('  daysHeld :', days_.toString());
  console.log('  points   :', points.toString());
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
