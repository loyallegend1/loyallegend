const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

const DAY = 86400;
const PARSE = (n) => ethers.parseEther(String(n));

// Helper: seed 211 ranks 1..211 in order (idx 0 → rank 1, idx 1 → rank 2, …)
function seedRanks() {
  const ranks = [];
  for (let i = 0; i < 211; i++) ranks.push(i + 1);
  return ranks;
}

async function deploySystem() {
  const [owner, user, other, house] = await ethers.getSigners();

  const LegendToken = await ethers.getContractFactory('LegendToken');
  const legend = await LegendToken.deploy(owner.address);

  const Tracker = await ethers.getContractFactory('LoyaltyTracker');
  const tracker = await Tracker.deploy(owner.address);

  const NFT = await ethers.getContractFactory('LoyalLegendNFT');
  const nft = await NFT.deploy(owner.address, await tracker.getAddress(), house.address);
  await tracker.setNft(await nft.getAddress());
  await nft.seedRanks(seedRanks());

  const Renderer = await ethers.getContractFactory('LegendRenderer');
  const renderer = await Renderer.deploy();
  await nft.setRenderer(await renderer.getAddress());

  const Pool = await ethers.getContractFactory('MockPoolManager');
  const pool = await Pool.deploy();

  const otherToken = ethers.Wallet.createRandom().address; // synthetic non-LEGEND token

  const LoyaltyHook = await ethers.getContractFactory('LoyaltyPointsHook');
  const loyaltyHook = await LoyaltyHook.deploy(
    await pool.getAddress(),
    await legend.getAddress(),
    await tracker.getAddress()
  );
  await tracker.setHook(await loyaltyHook.getAddress(), true);

  const SellHook = await ethers.getContractFactory('SellPenaltyHook');
  const sellHook = await SellHook.deploy(
    await pool.getAddress(),
    await legend.getAddress(),
    await tracker.getAddress()
  );
  await tracker.setHook(await sellHook.getAddress(), true);

  const AntiDump = await ethers.getContractFactory('AntiDumpHook');
  const antiDump = await AntiDump.deploy(
    await pool.getAddress(),
    await legend.getAddress(),
    await tracker.getAddress(),
    owner.address
  );

  const Oracle = await ethers.getContractFactory('FifaOracle');
  const oracle = await Oracle.deploy(owner.address, await nft.getAddress());
  await nft.setOracle(await oracle.getAddress());

  return { owner, user, other, house, legend, tracker, nft, renderer, pool, otherToken, loyaltyHook, sellHook, antiDump, oracle };
}

describe('LegendToken', function () {
  it('mints 100M to deployer and has correct metadata', async function () {
    const [owner] = await ethers.getSigners();
    const t = await (await ethers.getContractFactory('LegendToken')).deploy(owner.address);
    expect(await t.name()).to.equal('LoyalLegend');
    expect(await t.symbol()).to.equal('LEGEND');
    expect(await t.totalSupply()).to.equal(PARSE(100_000_000));
    expect(await t.balanceOf(owner.address)).to.equal(PARSE(100_000_000));
  });
});

describe('LoyaltyTracker', function () {
  it('accrues 1 point per token per day', async function () {
    const { tracker, loyaltyHook, pool, legend, otherToken, user } = await deploySystem();

    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(100));
    expect(await tracker.tokensHeldOf(user.address)).to.equal(PARSE(100));

    await time.increase(DAY * 5);
    expect(await tracker.pointsOf(user.address)).to.equal(500);
  });

  it('forfeits points proportionally on sell', async function () {
    const { tracker, loyaltyHook, sellHook, pool, legend, otherToken, user } = await deploySystem();

    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(100));
    await time.increase(DAY * 10);
    expect(await tracker.pointsOf(user.address)).to.equal(1000);

    // Sell half → lose half the points
    await pool.simulateSell(user.address, await legend.getAddress(), otherToken, await sellHook.getAddress(), PARSE(50));
    expect(await tracker.tokensHeldOf(user.address)).to.equal(PARSE(50));
    expect(await tracker.pointsOf(user.address)).to.equal(500);
  });

  it('resets days-held clock when fully sold', async function () {
    const { tracker, loyaltyHook, sellHook, pool, legend, otherToken, user } = await deploySystem();

    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(100));
    await time.increase(DAY * 10);
    await pool.simulateSell(user.address, await legend.getAddress(), otherToken, await sellHook.getAddress(), PARSE(100));
    expect(await tracker.daysHeldOf(user.address)).to.equal(0);

    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(50));
    await time.increase(DAY * 2);
    expect(await tracker.daysHeldOf(user.address)).to.equal(2);
  });

  it('only registered hooks can call onBuy / onSell', async function () {
    const { tracker, user } = await deploySystem();
    await expect(tracker.connect(user).onBuy(user.address, PARSE(1))).to.be.revertedWith('not hook');
    await expect(tracker.connect(user).onSell(user.address, PARSE(1))).to.be.revertedWith('not hook');
  });
});

describe('AntiDumpHook', function () {
  it('does NOT flag sells under 50%', async function () {
    const { pool, legend, otherToken, loyaltyHook, antiDump, user } = await deploySystem();
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(100));
    await expect(pool.simulateSell(user.address, await legend.getAddress(), otherToken, await antiDump.getAddress(), PARSE(40)))
      .to.not.emit(antiDump, 'DumpDetected');
  });

  it('FLAGS sells of 50%+ and emits with computed fee', async function () {
    const { pool, legend, otherToken, loyaltyHook, antiDump, user } = await deploySystem();
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(100));

    // 60% dump → fee = 3% of 60 = 1.8 LEGEND
    const sell = PARSE(60);
    const expectedFee = (sell * 300n) / 10000n;

    await expect(pool.simulateSell(user.address, await legend.getAddress(), otherToken, await antiDump.getAddress(), sell))
      .to.emit(antiDump, 'DumpDetected')
      .withArgs(user.address, sell, expectedFee);
  });
});

describe('LoyalLegendNFT — mint eligibility (Hook 3)', function () {
  it('rejects mint when points insufficient', async function () {
    const { nft, user } = await deploySystem();
    await expect(nft.connect(user).mint(0, { value: PARSE('0.2') })).to.be.revertedWith('not enough points');
  });

  it('allows a Legendary mint when all eligibility passes (rank 1 = France)', async function () {
    const { tracker, nft, loyaltyHook, pool, legend, otherToken, user, house } = await deploySystem();

    // Hold 200 LEGEND for 31 days → points = 200 * 31 = 6200, days = 31, tokens = 200
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(200));
    await time.increase(DAY * 31);
    expect(await tracker.pointsOf(user.address)).to.equal(6200);

    const houseBefore = await ethers.provider.getBalance(house.address);

    await expect(nft.connect(user).mint(0, { value: PARSE('0.2') }))
      .to.emit(nft, 'Minted')
      .withArgs(user.address, 0, 0, 3); // tier 3 = Legendary

    expect(await nft.ownerOf(0)).to.equal(user.address);
    expect(await nft.mintedCount(0)).to.equal(1);
    expect(await tracker.pointsOf(user.address)).to.be.lt(6200); // 5000 spent
    const houseAfter = await ethers.provider.getBalance(house.address);
    expect(houseAfter - houseBefore).to.equal(PARSE('0.2'));
  });

  it('charges Common price (0.01 ETH) for rank-100 countries', async function () {
    const { tracker, nft, loyaltyHook, pool, legend, otherToken, user } = await deploySystem();
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(40));
    await time.increase(DAY * 4);

    // Country at index 99 has rank 100 → Common tier → 0.01 ETH
    await expect(nft.connect(user).mint(99, { value: PARSE('0.01') }))
      .to.emit(nft, 'Minted');
  });

  it('rejects mint with wrong ETH price', async function () {
    const { nft, loyaltyHook, pool, legend, otherToken, user } = await deploySystem();
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(40));
    await time.increase(DAY * 4);
    await expect(nft.connect(user).mint(99, { value: PARSE('0.02') })).to.be.revertedWith('wrong price');
  });

  it('sells out a country at 20 mints', async function () {
    const { tracker, nft, loyaltyHook, pool, legend, otherToken, user } = await deploySystem();

    // Hold a lot of tokens and lots of points to mint 21 commons.
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(1000));
    await time.increase(DAY * 30); // 30,000 points

    for (let i = 0; i < 20; i++) {
      await nft.connect(user).mint(99, { value: PARSE('0.01') });
    }
    await expect(nft.connect(user).mint(99, { value: PARSE('0.01') })).to.be.revertedWith('country sold out');
  });
});

describe('FifaOracle — tier updates (Hook 4)', function () {
  it('owner can push new ranks and TierChanged fires when crossing a boundary', async function () {
    const { nft, oracle, owner } = await deploySystem();

    // France is countryId 0, currently rank 1 (Legendary). Drop it to rank 6 (Epic).
    const newRanks = seedRanks();
    newRanks[0] = 6;
    // Bump up countryId 5 (currently rank 6 / Epic) to rank 1 (Legendary).
    newRanks[5] = 1;

    await expect(oracle.connect(owner).pushRanks(newRanks))
      .to.emit(nft, 'TierChanged');

    expect(await nft.tierOf(0)).to.equal(2); // Epic
    expect(await nft.tierOf(5)).to.equal(3); // Legendary
  });

  it('owner can relax tier specs (for testnet)', async function () {
    const { nft, owner, user, tracker, loyaltyHook, pool, legend, otherToken } = await deploySystem();

    // Set Common to be instantly mintable
    await nft.connect(owner).setTierSpec(0, PARSE('0.01'), 0, 0, 1);

    // Give the user 1 token of tracked LEGEND
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(1));

    // No points, no days held → still mintable because thresholds are 0
    await expect(nft.connect(user).mint(99, { value: PARSE('0.01') })).to.emit(nft, 'Minted');
  });

  it('non-owner cannot setTierSpec', async function () {
    const { nft, user } = await deploySystem();
    await expect(nft.connect(user).setTierSpec(0, PARSE('0.01'), 0, 0, 1))
      .to.be.revertedWithCustomError(nft, 'OwnableUnauthorizedAccount');
  });

  it('only the registered oracle can update ranks on the NFT', async function () {
    const { nft, user } = await deploySystem();
    const ranks = seedRanks();
    await expect(nft.connect(user).updateRanks(ranks)).to.be.revertedWith('not oracle');
  });
});

describe('LegendRenderer — on-chain SVG metadata', function () {
  it('renderSVG includes country code and tier label', async function () {
    const { renderer } = await deploySystem();
    // countryId 51 = Peru, rank 52, tier 0 = Common
    const svg = await renderer.renderSVG(51, 52, 0);
    expect(svg).to.include('<svg');
    expect(svg).to.include('PER');         // 3-letter code
    expect(svg).to.include('PERU');        // uppercased name
    expect(svg).to.include('COMMON');      // tier label
    expect(svg).to.include('#9ca3af');     // common grey
    expect(svg).to.include('>#52<');       // rank
  });

  it('renderSVG reflects new tier when called with different tier arg', async function () {
    const { renderer } = await deploySystem();
    const svg = await renderer.renderSVG(51, 4, 3); // Peru, rank 4, Legendary
    expect(svg).to.include('LEGENDARY');
    expect(svg).to.include('#f5c542');
    expect(svg).to.include('>#4<');
  });

  it('tokenURI returns a data:application/json;base64 URI', async function () {
    const { renderer } = await deploySystem();
    const uri = await renderer.tokenURI(1020, 51, 52, 0);
    expect(uri).to.match(/^data:application\/json;base64,/);
    const json = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
    expect(json.name).to.equal('LoyalLegend #1020 - Peru');
    expect(json.image).to.match(/^data:image\/svg\+xml;base64,/);
    expect(json.attributes).to.deep.include({ trait_type: 'Tier', value: 'COMMON' });
    expect(json.attributes).to.deep.include({ trait_type: 'FIFA Rank', value: 52 });
  });
});

describe('NFT.tokenURI — live tier from on-chain state', function () {
  it('reflects live tier after oracle pushes a new rank', async function () {
    const { nft, oracle, tracker, owner, user, loyaltyHook, pool, legend, otherToken } = await deploySystem();

    // Mint Peru as Common
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(200));
    await time.increase(DAY * 4);
    await nft.connect(user).mint(51, { value: PARSE('0.01') });

    const tokenId = 51n * 20n; // 1020
    const uri1 = await nft.tokenURI(tokenId);
    const json1 = JSON.parse(Buffer.from(uri1.split(',')[1], 'base64').toString('utf8'));
    expect(json1.attributes).to.deep.include({ trait_type: 'Tier', value: 'COMMON' });

    // Push Peru up to rank 4 → Legendary
    const newRanks = seedRanks();
    newRanks[51] = 4;
    await oracle.connect(owner).pushRanks(newRanks);

    const uri2 = await nft.tokenURI(tokenId);
    const json2 = JSON.parse(Buffer.from(uri2.split(',')[1], 'base64').toString('utf8'));
    expect(json2.attributes).to.deep.include({ trait_type: 'Tier', value: 'LEGENDARY' });
    expect(json2.attributes).to.deep.include({ trait_type: 'FIFA Rank', value: 4 });
  });
});

describe('System integration — buy, hold, mint, oracle upgrade', function () {
  it('end-to-end: user buys, holds 8 days, mints a Rare card, then it upgrades to Epic', async function () {
    const { tracker, nft, oracle, loyaltyHook, pool, legend, otherToken, user, owner } = await deploySystem();

    // Tier Rare needs: 500 points, 7 days, 72 tokens
    await pool.simulateBuy(user.address, await legend.getAddress(), otherToken, await loyaltyHook.getAddress(), PARSE(80));
    await time.increase(DAY * 8);
    expect(await tracker.pointsOf(user.address)).to.equal(640);

    // Country index 20 → rank 21 → Rare → 0.03 ETH
    await nft.connect(user).mint(20, { value: PARSE('0.03') });
    expect(await nft.tierOfToken(400)).to.equal(1); // Rare

    // Now FIFA pushes a new ranking: that country climbs to rank 15 → Epic
    const newRanks = seedRanks();
    newRanks[20] = 15;
    await oracle.connect(owner).pushRanks(newRanks);

    expect(await nft.tierOfToken(400)).to.equal(2); // Epic
  });
});
