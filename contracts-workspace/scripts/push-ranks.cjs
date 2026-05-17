/**
 * Pushes a fake monthly FIFA ranking update via FifaOracle → LoyalLegendNFT.updateRanks().
 *
 * Default demo: promote Peru (countryId 51) to rank #4 (→ Legendary tier) and
 * push Spain (countryId 1) down to rank #100 (→ Common). Designed to show
 * both a climb and a fall at once.
 *
 * Custom swaps via env: SWAPS="51:4,1:100,5:1"
 *   format: comma-separated `countryId:newRank` pairs
 *
 *   npx hardhat run scripts/push-ranks.cjs --network sepolia
 *   SWAPS="51:4" npx hardhat run scripts/push-ranks.cjs --network sepolia
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment for ${network}.`);
  const { contracts: c } = JSON.parse(fs.readFileSync(file));
  const countries = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'countries.json')));

  // Parse SWAPS env or fall back to default demo
  const raw = process.env.SWAPS || '51:4,1:100';
  const swaps = raw.split(',').map((p) => {
    const [id, rank] = p.split(':').map(Number);
    if (Number.isNaN(id) || Number.isNaN(rank)) throw new Error(`Bad SWAPS pair: ${p}`);
    return { id, rank };
  });

  console.log('\n== Pushing FIFA ranking update ==');
  console.log(' Network:', network, '\n Swaps :');
  for (const s of swaps) {
    console.log(`   countryId ${s.id} (${countries[s.id].name}) → rank ${s.rank}`);
  }

  // Read current state
  const nft = await hre.ethers.getContractAt('LoyalLegendNFT', c.LoyalLegendNFT);
  const oracle = await hre.ethers.getContractAt('FifaOracle', c.FifaOracle);

  const TIER_NAMES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  // Current ranks (read each affected country) for before/after
  console.log('\n— Before —');
  for (const s of swaps) {
    const oldRank = Number(await nft.ranks(s.id));
    const oldTier = Number(await nft.tierOf(s.id));
    console.log(`   ${countries[s.id].name.padEnd(20)} rank #${String(oldRank).padStart(3)}  →  ${TIER_NAMES[oldTier]}`);
  }

  // Build the full 211-element array: start from current ranks, apply the swaps
  const newRanks = [];
  for (let i = 0; i < 211; i++) newRanks.push(Number(await nft.ranks(i)));
  for (const s of swaps) newRanks[s.id] = s.rank;

  // Push via oracle (we are the oracle owner = deployer)
  console.log('\n▶ Submitting via FifaOracle.pushRanks() …');
  const tx = await oracle.pushRanks(newRanks);
  console.log('  tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('  block:', receipt.blockNumber, '— gas used:', receipt.gasUsed.toString());

  // Print TierChanged events from the receipt
  const tierChangedTopic = nft.interface.getEvent('TierChanged').topicHash;
  const events = receipt.logs
    .filter((l) => l.topics[0] === tierChangedTopic && l.address.toLowerCase() === c.LoyalLegendNFT.toLowerCase())
    .map((l) => nft.interface.parseLog(l));

  console.log(`\n🏆 ${events.length} tier change(s) emitted:`);
  for (const e of events) {
    const id = Number(e.args.countryId);
    const oldRank = Number(e.args.oldRank);
    const newRank = Number(e.args.newRank);
    const oldT = TIER_NAMES[Number(e.args.oldTier)];
    const newT = TIER_NAMES[Number(e.args.newTier)];
    const arrow = newT === 'LEGENDARY' || (oldT === 'COMMON' && newT !== 'COMMON') || oldT === 'RARE' && (newT === 'EPIC' || newT === 'LEGENDARY') ? '▲' : '▼';
    console.log(`   ${arrow} ${countries[id].name.padEnd(20)} #${oldRank} → #${newRank}   ${oldT} → ${newT}`);
  }

  console.log('\n— After —');
  for (const s of swaps) {
    const newRank = Number(await nft.ranks(s.id));
    const newTier = Number(await nft.tierOf(s.id));
    console.log(`   ${countries[s.id].name.padEnd(20)} rank #${String(newRank).padStart(3)}  →  ${TIER_NAMES[newTier]}`);
  }

  console.log('\nView the tx on Etherscan:');
  console.log(`  https://sepolia.etherscan.io/tx/${tx.hash}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
