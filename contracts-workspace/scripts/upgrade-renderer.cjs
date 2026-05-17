/**
 * Deploys a fresh LegendRenderer (with flag colors) and points the existing
 * LoyalLegendNFT at it via setRenderer(). NO other contracts redeployed.
 *
 *   npx hardhat run scripts/upgrade-renderer.cjs --network sepolia
 *
 * Cost: ~0.002 ETH on Sepolia. All existing NFTs immediately get the new artwork
 * because tokenURI() is read fresh on every call.
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const network = hre.network.name;
  const file = path.join(__dirname, '..', 'deployments', `${network}.json`);
  const dep = JSON.parse(fs.readFileSync(file));
  const [deployer] = await hre.ethers.getSigners();
  const startBal = await hre.ethers.provider.getBalance(deployer.address);

  console.log('\n== Upgrading renderer ==');
  console.log(' Network          :', network);
  console.log(' Deployer balance :', hre.ethers.formatEther(startBal), 'ETH');
  console.log(' Existing NFT     :', dep.contracts.LoyalLegendNFT);
  console.log(' Existing renderer:', dep.contracts.LegendRenderer || '(none)');

  console.log('\n▶ Deploying new LegendRenderer (with flag colors) …');
  const Renderer = await hre.ethers.getContractFactory('LegendRenderer');
  const renderer = await Renderer.deploy();
  await renderer.waitForDeployment();
  console.log('  ✓ new Renderer', await renderer.getAddress());

  console.log('▶ Pointing NFT at new renderer …');
  const nft = await hre.ethers.getContractAt('LoyalLegendNFT', dep.contracts.LoyalLegendNFT);
  await (await nft.setRenderer(await renderer.getAddress())).wait();
  console.log('  ✓ nft.setRenderer');

  dep.previous = dep.previous || {};
  dep.previous.LegendRenderer_prev = dep.contracts.LegendRenderer;
  dep.contracts.LegendRenderer = await renderer.getAddress();
  dep.rendererUpgradedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(dep, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', '..', 'src', 'config', 'contracts.json'), JSON.stringify(dep, null, 2));

  const endBal = await hre.ethers.provider.getBalance(deployer.address);
  console.log('\n Gas spent :', hre.ethers.formatEther(startBal - endBal), 'ETH');
  console.log(' Remaining :', hre.ethers.formatEther(endBal), 'ETH');
  console.log('\n Every existing NFT now reads the new renderer.');
  console.log(' In MetaMask, click ⋯ on the NFT → Refresh metadata (or re-import).');
  console.log(' On OpenSea testnet, click the refresh icon on the asset page.\n');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
