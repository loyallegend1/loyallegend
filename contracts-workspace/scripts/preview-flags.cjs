// Local preview — deploys the renderer to the current network and writes
// sample SVGs for a few iconic countries to public/, so we can eyeball the flags.
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const Renderer = await hre.ethers.getContractFactory('LegendRenderer');
  const r = await Renderer.deploy();
  await r.waitForDeployment();

  const samples = [
    ['ireland', 54, 55, 0],
    ['peru', 51, 4, 3],
    ['france', 0, 1, 3],
    ['brazil', 5, 6, 2],
    ['italy', 11, 12, 2],
    ['germany', 9, 10, 2],
    ['usa', 15, 16, 2],
    ['japan', 17, 18, 2],
  ];
  const outDir = path.join(__dirname, '..', '..', 'public');
  for (const [name, cid, rank, tier] of samples) {
    const svg = await r.renderSVG(cid, rank, tier);
    fs.writeFileSync(path.join(outDir, `preview-${name}.svg`), svg);
    console.log('wrote preview-' + name + '.svg');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
