import { createConfig, http } from 'wagmi'
import { avalanche, avalancheFuji } from 'viem/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

// ─── Wagmi Config ───────────────────────────────────────────────────────────────
export const config = createConfig({
  chains: [avalanche, avalancheFuji],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'AgentSwap AI' }),
  ],
  transports: {
    [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
    [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
  },
})

export const queryClient = new QueryClient()

// ─── DEX Router Addresses (Trader Joe V1 — Uniswap V2 compatible) ───────────────
export const TRADER_JOE_ROUTER = {
  [avalanche.id]: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
  [avalancheFuji.id]: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901',
}

export const WAVAX_ADDRESS = {
  [avalanche.id]: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  [avalancheFuji.id]: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',
}

// ─── Avalanche Token List ────────────────────────────────────────────────────────
export const TOKENS = [
  { symbol: 'AVAX',   name: 'Avalanche',       decimals: 18, address: null,                                          color: '#E84142' },
  { symbol: 'USDC',   name: 'USD Coin',         decimals: 6,  address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', color: '#2775CA' },
  { symbol: 'USDT',   name: 'Tether USD',       decimals: 6,  address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', color: '#26A17B' },
  { symbol: 'WAVAX',  name: 'Wrapped AVAX',     decimals: 18, address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', color: '#E84142' },
  { symbol: 'JOE',    name: 'Trader Joe',       decimals: 18, address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', color: '#E3507A' },
  { symbol: 'DAI.e',  name: 'Dai (Bridged)',    decimals: 18, address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', color: '#F5AC37' },
  { symbol: 'WBTC.e', name: 'Bitcoin (Bridged)',decimals: 8,  address: '0x50b7545627a5162F82A992c33b87aDc75187B218', color: '#F7931A' },
  { symbol: 'WETH.e', name: 'Ether (Bridged)',  decimals: 18, address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', color: '#627EEA' },
]

// ─── ABIs ────────────────────────────────────────────────────────────────────────
export const ERC20_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
]

export const JOE_ROUTER_ABI = [
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactAVAXForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactTokensForAVAX',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

// ─── Chain Metadata ──────────────────────────────────────────────────────────────
export const CHAIN_META = {
  [avalanche.id]:     { color: '#E84142', name: 'Avalanche',    explorer: 'https://snowtrace.io' },
  [avalancheFuji.id]: { color: '#E8A641', name: 'Fuji Testnet', explorer: 'https://testnet.snowtrace.io' },
}

// ─── CoinGecko Price Mapping ─────────────────────────────────────────────────────
export const PRICE_MAP = {
  AVAX:     'avalanche-2',
  USDC:     'usd-coin',
  USDT:     'tether',
  WAVAX:    'avalanche-2',
  JOE:      'joe',
  'DAI.e':  'dai',
  'WBTC.e': 'wrapped-bitcoin',
  'WETH.e': 'weth',
}

export const COINGECKO_IDS = 'avalanche-2,usd-coin,tether,joe,dai,wrapped-bitcoin,weth'
