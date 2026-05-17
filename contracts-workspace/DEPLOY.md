# Deploying LoyalLegend to Sepolia — The Plain-English Guide

> Written for someone who has never coded before. Every word is explained.
> Total time: ~45 minutes. You can pause between parts.

---

## 🧠 First, what are we actually doing?

We're going to put your smart contracts (the Solidity code in `contracts-workspace/contracts/`) onto a real Ethereum test network called **Sepolia**.

- **Real Ethereum (mainnet)** = costs real money to use.
- **Sepolia testnet** = a free practice version. Same software, fake money. Used by every Ethereum developer to test things before going live.

When you "deploy" a contract, you're publishing it on Sepolia so anyone in the world can interact with it. Once deployed, it's basically permanent.

To do this you need 4 things, in order:

1. **A wallet** (MetaMask) — your identity on Ethereum.
2. **Test ETH** (free, from a faucet) — fuel to pay for the deployment.
3. **A connection to Sepolia** (Alchemy) — explained below.
4. **A way to publish your code source** (Etherscan) — explained below.

---

## 🧠 What is Alchemy? What is Etherscan? Why do I need them?

### Alchemy in one sentence
**Alchemy is the phone line between your computer and the Sepolia network.**

When your computer wants to send a transaction (like "deploy this contract"), it can't just shout into the void. It needs to talk to a computer that's actually running the Ethereum software. That computer is called a **node**.

Running your own node is hard (it needs a powerful computer, big storage, days to sync). So instead, companies like **Alchemy** run nodes for you and let you connect to them over the internet. You sign up for a free account, they give you a special URL (the "phone number"), and your code uses that URL to talk to Sepolia.

> **Plain version:** Alchemy = free internet connection to the Sepolia network. Without it, our deploy command has no way to reach Ethereum.

### Etherscan in one sentence
**Etherscan is Google for Ethereum. We're using it to publish your contract's source code so people can read it.**

When you deploy a contract, by default only the compiled (machine-readable) version goes on-chain. Nobody can read it — it looks like gibberish. **"Verifying"** a contract on Etherscan uploads the original Solidity source code and proves it matches what's deployed. Then anyone who visits your contract's page on Sepolia Etherscan can:

- Read the code
- See every transaction
- Click buttons to call functions (like calling `mint` from the browser!)

This is essential for trust. NFT projects that aren't verified look shady.

> **Plain version:** Etherscan = public website where people can read your contract. We need their free API key to upload the code to them.

### Why both are free
Both companies make money from big paid customers. They give individuals free tiers so developers can learn. You'll never hit the free limits with this project.

---

## 🧠 What is a terminal? How do I open one?

A **terminal** (also called Terminal, command line, console, or shell) is an app on your computer where you type commands instead of clicking buttons. We use it because deploying contracts is a typed command, not a button.

### On macOS (you're on a Mac, based on the folder path):

1. Press **`Cmd + Space`** on your keyboard. A search bar appears in the middle of the screen.
2. Type **`Terminal`**.
3. Press **`Enter`**. A small window opens with white or black text on a black or white background. **That's the terminal.**

You should see something like:
```
abinashmudoi@MacBook ~ %
```
That's called the **prompt**. It means "the computer is ready for your command."

### How to type a command

You type the command after the `%` (or `$`), then press **Enter**.

Try this safe one to test it:
```
pwd
```
Press Enter. It will print the folder you're currently in (probably your home folder).

### How to get into the project folder

Every time you open a new terminal, you need to **change directory** (`cd`) into the project folder before running commands. Type exactly this and press Enter:

```
cd /Users/abinashmudoi/Downloads/loyallegend/contracts-workspace
```

Now if you type `pwd` and press Enter, it should print:
```
/Users/abinashmudoi/Downloads/loyallegend/contracts-workspace
```

**Every command in this guide assumes you're already inside `contracts-workspace`.** If you close the terminal and come back later, run that `cd` command first.

### Tips
- **You can't drag files into a terminal**, you type the path.
- You can paste with **`Cmd + V`**. (Copy normally with `Cmd + C` from anywhere.)
- If a command is long, copy the whole thing in one go.
- If you mistype, press the up arrow ↑ to bring back the previous command and edit it.

---

## 🧠 What is the `.env` file?

A `.env` file (the dot at the start matters) is a tiny text file that stores **secrets** — things like passwords, private keys, and API keys. We keep them in a separate file so:

- Your secrets aren't accidentally pasted into code that gets shared.
- The deploy script can read them automatically when you run it.

### Where it goes
Right inside the `contracts-workspace/` folder. So the full path will be:
```
/Users/abinashmudoi/Downloads/loyallegend/contracts-workspace/.env
```

### How to create it (the easy way)

There's already a template called `.env.example` in that folder. We're going to **make a copy of it** named `.env` and then fill in the blanks.

In your terminal (after `cd`-ing into `contracts-workspace`), run:

```
cp .env.example .env
```

That's it — there's now an empty `.env` file ready to edit.

### How to edit it

Open it in any text editor. Easiest options:

**Option A — TextEdit (built into Mac):**
1. Open Finder, press `Cmd + Shift + G` (Go to folder).
2. Paste: `/Users/abinashmudoi/Downloads/loyallegend/contracts-workspace`
3. Press Enter — the folder opens.
4. You won't see the `.env` file yet because Finder hides files starting with a dot. Press **`Cmd + Shift + .`** (Cmd-Shift-period) — hidden files appear (in gray).
5. Right-click `.env` → **Open With** → **TextEdit**.
6. If TextEdit makes it "rich text", click **Format menu → Make Plain Text** first.

**Option B — VS Code (if you have it):**
- Open VS Code, then File → Open → navigate to the folder → open `.env`.

**Option C — Right in the terminal using `nano`:**
```
nano .env
```
This opens a built-in text editor. Edit, then press `Ctrl + O` to save, `Enter` to confirm, then `Ctrl + X` to exit.

### What goes inside

The file looks like a list of `NAME=value` lines:
```
PRIVATE_KEY=abc123...
ALCHEMY_KEY=xyz789...
ETHERSCAN_API_KEY=foo456...
HOUSE_WALLET=
```

You'll get those values in the next parts. **No quotes, no spaces around the `=` sign.**

### Don't share this file
The `.env` file has your wallet's private key in it. **Anyone with that key can steal everything in your wallet.** Don't email it, don't post it on Discord, don't commit it to GitHub. It's already in `.gitignore` so git won't accidentally include it.

---

## Part A — One-time setup (~20 min)

### A.1 — Install MetaMask (5 min)

MetaMask is a free browser extension that holds your Ethereum wallet.

1. Open **Chrome, Brave, or Firefox**.
2. Go to **https://metamask.io/download**.
3. Click **Install MetaMask for Chrome** (or your browser).
4. Click **Add to Chrome** → **Add extension**.
5. The MetaMask page opens. Click **Get started** → **Create a new wallet**.
6. Set a password (this unlocks the wallet on your computer — NOT the same as the private key).
7. **The 12-word "Secret Recovery Phrase" appears.** Write it down on paper. Don't take a screenshot. Don't type it anywhere. If you lose this phrase, your wallet is gone forever. If anyone else gets this phrase, your wallet is theirs.
8. Confirm the phrase by clicking the words in order. Done.

**Important:** Use a fresh MetaMask for this project. Don't use one that holds real money. Mistakes happen.

### A.2 — Switch MetaMask to Sepolia (1 min)

1. Click the MetaMask fox icon (top-right of your browser).
2. At the top of MetaMask, click the network name (probably says "Ethereum Mainnet").
3. If you don't see "Sepolia": click your account icon (top-right of MetaMask) → **Settings** → **Advanced** → toggle **Show test networks** on.
4. Back at the network selector, choose **Sepolia**.

### A.3 — Get free test ETH (3 min)

1. In MetaMask, click your account name at the top to **copy your wallet address** (a long string starting with `0x...`).
2. Open **https://www.alchemy.com/faucets/ethereum-sepolia** in a new tab.
3. Paste your address. Solve the captcha. Click **Send Me ETH**.
4. Wait 1–2 minutes. Check MetaMask — you should have ~0.5 Sepolia ETH.

If that faucet doesn't work, try one of these:
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia
- https://www.infura.io/faucet/sepolia

### A.4 — Sign up for Alchemy (5 min)

(Remember: Alchemy = our connection to Sepolia.)

1. Go to **https://dashboard.alchemy.com/signup**.
2. Sign up with email or Google. Confirm your email.
3. After login, click **+ Create new app**.
4. Fill in:
   - **Name:** LoyalLegend (anything works)
   - **Chain:** Ethereum
   - **Network:** Ethereum Sepolia
5. Click **Create app**.
6. On the app's page, find the **API Key** (it's a long random string). Click the copy button next to it.
7. Paste it into a Notes app for a moment — you'll put it in `.env` shortly.

### A.5 — Sign up for Etherscan (3 min)

(Remember: Etherscan = where we publish the source code.)

1. Go to **https://etherscan.io/register**.
2. Register with email. Confirm your email.
3. Once logged in, go to **https://etherscan.io/myapikey**.
4. Click **+ Add** → give it a name (e.g. "LoyalLegend") → **Create**.
5. Copy the **API Key Token** — paste it into your Notes app for a moment.

### A.6 — Get your MetaMask private key (1 min)

This is the secret that lets the deploy script send transactions from your wallet.

1. Open MetaMask.
2. Click the three dots (`⋯`) next to your account name → **Account details**.
3. Click **Show private key**.
4. Enter your MetaMask password.
5. Click and hold to reveal it, then **copy** the long string.
6. Paste into Notes briefly. **Treat this like a credit card number** — anyone with it controls the wallet.

---

## Part B — Fill in `.env` (3 min)

1. Open a terminal (`Cmd + Space` → `Terminal` → Enter).
2. Run:
   ```
   cd /Users/abinashmudoi/Downloads/loyallegend/contracts-workspace
   cp .env.example .env
   ```
3. Open `.env` (see "How to edit it" above — pick TextEdit, VS Code, or nano).
4. Paste each value next to its name. Example with fake values:
   ```
   PRIVATE_KEY=4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318
   ALCHEMY_KEY=abcDEF123ghiJKL456mnoPQR789stuVWX
   ETHERSCAN_API_KEY=ABC123XYZ789DEF456GHI789JKL012MNO
   HOUSE_WALLET=
   ```
   - `PRIVATE_KEY` — paste it without the `0x` prefix if it has one.
   - `HOUSE_WALLET` — leave blank for now (it defaults to your deployer wallet).
5. **Save the file.** In TextEdit: `Cmd + S`. In VS Code: `Cmd + S`. In nano: `Ctrl + O`, Enter, `Ctrl + X`.
6. **Close Notes and delete what you pasted there** so the keys don't linger.

---

## Part C — Deploy (5 min)

In the same terminal, still inside `contracts-workspace`:

```
npm test
```

This runs the 15 tests one more time. You should see `15 passing` at the end. If any fail, stop and ping me before deploying.

Then deploy:

```
npx hardhat run scripts/deploy.cjs --network sepolia
```

You'll see a play-by-play in the terminal:
```
▶ Deploying LegendToken …
  ✓ LegendToken          0x1234…
▶ Deploying LoyaltyTracker …
  ✓ LoyaltyTracker       0x5678…
…
```

The whole thing takes 2–4 minutes (each line is one Ethereum transaction). When it's done you'll see:

```
==============================================
 Deployment complete.
==============================================
```

The script automatically writes the addresses to:
- `contracts-workspace/deployments/sepolia.json`
- `src/config/contracts.json` (the frontend reads this automatically — no copy-paste needed)

---

## Part D — Publish source on Etherscan (3 min)

```
npx hardhat run scripts/verify.cjs --network sepolia
```

Each contract should print `verified ✓`. If one fails, just re-run the command — it's safe to run multiple times.

After this, you can open Sepolia Etherscan and look at your contracts:
```
https://sepolia.etherscan.io/address/<paste contract address here>
```
You'll see the source code, all transactions, and a **"Contract" → "Read Contract" / "Write Contract"** tab where you can interact with the contract through the browser.

---

## Part E — Try it out

### Start the frontend
In a **second terminal window** (`Cmd + N` in Terminal, or `Cmd + T` for a new tab):
```
cd /Users/abinashmudoi/Downloads/loyallegend
npm run dev
```
Open http://localhost:5173. Click **Connect Wallet** — pick MetaMask. The banner warning about "preview mode" should be gone now.

### Simulate a buy (so you have points to mint with)
Back in the first terminal:
```
TARGET=0xYourMetaMaskAddress AMOUNT=200 npx hardhat run scripts/simulate-buy.cjs --network sepolia
```
(Replace `0xYourMetaMaskAddress` with your actual address.) This records a buy of 200 LEGEND for that wallet and starts the points clock. Run it again later to top up.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `command not found: npx` | You need Node.js. Install from https://nodejs.org/en (download the LTS version), then close and re-open the terminal. |
| `cannot find module 'hardhat'` | Inside `contracts-workspace/`, run `npm install` first. |
| `Deployer has < 0.05 Sepolia ETH` | Top up from a faucet (Part A.3) and retry. |
| `Invalid API Key` during verify | Wait 5 minutes after creating the Etherscan key — sometimes it takes a moment to activate. |
| Terminal closed, I have to start over? | No — open a fresh terminal, `cd` back into `contracts-workspace`, your `.env` is still there. |

---

## What you'll have when this is all done

- 8 contracts deployed and public on Sepolia
- Source code readable on Etherscan
- Frontend at http://localhost:5173 connected to those contracts
- Ability to mint a card by clicking buttons in the browser

**Step 4 is the real mainnet launch** — that uses real ETH and real Uniswap V4. We'll do that after you've tested everything on Sepolia.

---

## Still stuck on something?

Tell me **exactly which command or step** didn't work, and paste the error message you see. There's no question too small.
