# 🌐 Web3 DeFi Dashboard

A modern, full-featured Decentralized Finance dashboard built on React 19 and Vite. Connect your wallet, track your token portfolio with live prices, and swap tokens directly through the Uniswap V2 Router, all in a smooth, animated interface.

---

## ✨ Features

- **Multi-Wallet Support** — Works with MetaMask, Coinbase Wallet, and any injected Web3 provider right out of the box.
- **Token Swapping** — Execute ETH ↔ ERC-20 and ERC-20 ↔ ERC-20 swaps via the Uniswap V2 Router with live price quotes before you confirm.
- **Live Portfolio Tracking** — Real-time USD prices and 24-hour change indicators powered by the CoinGecko API.
- **Multi-Chain Ready** — Seamlessly switch between Ethereum Mainnet, Sepolia, Polygon, Arbitrum, Optimism, and Base.
- **Fluid Animations** — Buttery-smooth UI transitions and micro-interactions driven by GSAP (GreenSock Animation Platform).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Web3 Core | Wagmi v3 + Viem |
| Async State | TanStack React Query |
| Animations | GSAP (ScrollTrigger) |
| Wallet SDK | MetaMask SDK |

---

## 📁 Project Structure

```text
webfrontend/
├── src/
│   ├── App.jsx        # Core app logic — Web3 config, UI components, swap interface
│   ├── main.jsx       # React entry point and provider setup
│   ├── index.css      # Tailwind base imports and global resets
│   └── App.css        # Component-level and supplemental styles
├── public/            # Static assets (icons, fonts, images)
├── package.json       # Dependencies and npm scripts
├── vite.config.js     # Vite and Tailwind plugin configuration
└── eslint.config.js   # Linting rules
```

---

## 🔌 Integrations & APIs

### Uniswap V2 Router
**Contract:** `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

The app integrates directly with the Uniswap V2 Router for on-chain swaps:

- `getAmountsOut` — Fetches live swap quotes before execution.
- `swapExactETHForTokens` — Swaps native ETH into any supported ERC-20 token.
- `swapExactTokensForETH` — Swaps ERC-20 tokens back to native ETH.
- `swapExactTokensForTokens` — Executes ERC-20 to ERC-20 swaps.

### CoinGecko API
**Endpoint:** `https://api.coingecko.com/api/v3/simple/price`

Used to fetch live USD prices and 24-hour percentage changes for the following tokens: ETH, USDC, USDT, WBTC, UNI, LINK, AAVE, and DAI.

### Public RPC Nodes
Network state (token balances, allowances, contract reads) is handled dynamically by Wagmi across all supported chains, with no extra configuration needed.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Web3 wallet browser extension — [MetaMask](https://metamask.io/) is recommended

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd webfrontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open your browser at `http://localhost:5173` (or the URL shown in your terminal).

---

## ⚠️ Testing Swaps

Swap functionality is live and interacts with real smart contracts. To test swaps:

- Connect your wallet to **Ethereum Mainnet**.
- Make sure you have **ETH available for gas fees**.
- Start with small amounts when testing unfamiliar token pairs.

> **Heads up:** This app does not use a testnet deployment of Uniswap V2. All swap transactions are real and irreversible. Use it responsibly.

---

## 🗺 Supported Networks

| Network | Chain ID |
|---|---|
| Ethereum Mainnet | 1 |
| Sepolia Testnet | 11155111 |
| Polygon | 137 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| Base | 8453 |

---

## 📄 License

This project is open-source. See the [LICENSE](./LICENSE) file for details.