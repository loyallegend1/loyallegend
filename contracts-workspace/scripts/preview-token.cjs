/**
 * Reads tokenURI(tokenId) from the deployed NFT contract, decodes the data: URI
 * JSON, decodes the SVG inside, and saves the raw SVG to a file so you can open
 * it in a browser.
 *
 *   TOKEN_ID=1080 npx hardhat run scripts/preview-token.cjs --network sepolia
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments', `${network}.json`)));
  const nft = await hre.ethers.getContractAt('LoyalLegendNFT', dep.contracts.LoyalLegendNFT);

  const tokenId = BigInt(process.env.TOKEN_ID || '1080');
  console.log('\nReading tokenURI for #' + tokenId + ' from', dep.contracts.LoyalLegendNFT);

  const uri = await nft.tokenURI(tokenId);
  if (!uri.startsWith('data:application/json;base64,')) {
    console.log('Unexpected URI prefix:\n', uri.slice(0, 100));
    return;
  }
  const json = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
  console.log('\nMetadata:');
  console.log('  name        :', json.name);
  console.log('  description :', json.description.slice(0, 80) + '…');
  console.log('  attributes  :', JSON.stringify(json.attributes));

  if (!json.image.startsWith('data:image/svg+xml;base64,')) {
    console.log('Unexpected image prefix:\n', json.image.slice(0, 100));
    return;
  }
  const svg = Buffer.from(json.image.split(',')[1], 'base64').toString('utf8');

  const outDir = path.join(__dirname, '..', '..', 'public');
  const outFile = path.join(outDir, `token-${tokenId}.svg`);
  fs.writeFileSync(outFile, svg);
  console.log('\n✓ Wrote', outFile);
  console.log('  Open in browser: http://localhost:5173/token-' + tokenId + '.svg\n');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
