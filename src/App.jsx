
import { useEffect, useRef, useState } from 'react'
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from 'viem/chains'
import { formatEther, formatUnits, parseUnits } from 'viem'
import {
  createConfig,
  http,
  WagmiProvider,
  useConnect,
  useAccount,
  useBalance,
  useDisconnect,
  useSwitchChain,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Wagmi Config ───────────────────────────────────────────────────────────────
const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, optimism, base],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Web3 - work' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
})

const queryClient = new QueryClient()

// ─── Constants ──────────────────────────────────────────────────────────────────
const UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

const TOKENS = [
  { symbol: 'ETH',  name: 'Ethereum',       decimals: 18, address: null,                                         color: '#627EEA' },
  { symbol: 'USDC', name: 'USD Coin',        decimals: 6,  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', color: '#2775CA' },
  { symbol: 'USDT', name: 'Tether USD',      decimals: 6,  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', color: '#26A17B' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8,  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', color: '#F7931A' },
  { symbol: 'UNI',  name: 'Uniswap',        decimals: 18, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', color: '#FF007A' },
  { symbol: 'LINK', name: 'Chainlink',       decimals: 18, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', color: '#2A5ADA' },
  { symbol: 'AAVE', name: 'Aave',            decimals: 18, address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', color: '#B6509E' },
  { symbol: 'DAI',  name: 'Dai Stablecoin',  decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', color: '#F5AC37' },
]

const ERC20_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
]

const UNISWAP_V2_ROUTER_ABI = [
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactETHForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }],
    name: 'swapExactTokensForETH',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const CHAIN_META = {
  [mainnet.id]:  { color: '#627EEA', name: 'Ethereum' },
  [sepolia.id]:  { color: '#CFB5F0', name: 'Sepolia'  },
  [polygon.id]:  { color: '#8247E5', name: 'Polygon'  },
  [arbitrum.id]: { color: '#28A0F0', name: 'Arbitrum' },
  [optimism.id]: { color: '#FF0420', name: 'Optimism' },
  [base.id]:     { color: '#0052FF', name: 'Base'     },
}

const PRICE_MAP = {
  ETH: 'ethereum', USDC: 'usd-coin', USDT: 'tether',
  WBTC: 'wrapped-bitcoin', UNI: 'uniswap', LINK: 'chainlink',
  AAVE: 'aave', DAI: 'dai',
}

// ─── Wallet SVG Icons ───────────────────────────────────────────────────────────
const MetaMaskIcon = () => (
  <svg viewBox="0 0 318 318" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
    <path fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" d="M274.1 35.5l-99.5 73.9L193 65.8z"/>
    <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="M44.4 35.5l98.7 74.6-17.5-44.3zm193.9 171.3l-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9L50.1 263l56.7-15.6-26.5-40.6z"/>
    <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="M103.6 138.2l-15.8 23.9 56.3 2.5-2-60.5zm111.3 0l-39.3-34.8-1.3 61.2 56.2-2.5zM106.8 247.4l33.8-16.5-29.2-22.8zm71.1-16.5l33.9 16.5-4.7-39.3z"/>
    <path fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" d="M211.8 247.4l-33.9-16.5 2.7 22.1-.3 9.3zm-105 0l31.5 14.9-.2-9.3 2.5-22.1z"/>
    <path fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round" d="M138.8 193.5l-28.2-8.3 19.9-9.1zm40.9 0l8.3-17.4 20 9.1z"/>
    <path fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round" d="M106.8 247.4l4.8-40.6-31.3.9zM207 206.8l4.8 40.6 26.5-39.7zm23.8-44.7l-56.2 2.5 5.2 28.9 8.3-17.4 20 9.1zm-120.2 23.1l20-9.1 8.2 17.4 5.3-28.9-56.3-2.5z"/>
    <path fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round" d="M87.8 162.1l23.6 46-.8-22.9zm120.3 23.1l-1 22.9 23.7-46zm-64-20.6l-5.3 28.9 6.6 34.1 1.5-44.9zm30.5 0l-2.7 18 1.2 45 6.7-34.1z"/>
    <path fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" d="M179.8 193.5l-6.7 34.1 4.8 3.3 29.2-22.8 1-22.9zm-69 14.7l29.2 22.8 4.7-3.3-6.6-34.1z"/>
    <path fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" d="M180.3 262.3l.3-9.3-2.5-2.2h-37.7l-2.3 2.2.2 9.3-31.5-14.9 11 9 22.3 15.5h38.3l22.4-15.5 11-9z"/>
    <path fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round" d="M177.9 230.9l-4.8-3.3h-27.7l-4.7 3.3-2.5 22.1 2.3-2.2h37.7l2.5 2.2z"/>
    <path fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round" d="M278.3 114.2l8.5-41.3-12.8-37.4-97.8 72.6 37.6 31.8 53.1 15.5 11.7-13.7-5.1-3.7 8.1-7.4-6.2-4.8 8.1-6.2zM31.8 72.9l8.5 41.3-5.4 4 8.2 6.2-6.2 4.8 8.1 7.4-5.1 3.7 11.6 13.7 53.1-15.5 37.6-31.8L44.6 35.5z"/>
    <path fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round" d="M267 155.1l-53.1-15.5 16.3 24.6-24.3 47.2 32-0.4h47.8zm-163.6-15.5l-53.1 15.5-17.7 55.9h47.7l31.9.4-24.2-47.2zm70.9 26.4l3.4-58.7 15.5-42h-69l15.3 42 3.6 58.7 1.2 18.2.1 44.8h26.5l.2-44.8z"/>
  </svg>
)

const CoinbaseIcon = () => (
  <svg viewBox="0 0 1024 1024" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="512" cy="512" r="512" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M152 512C152 710.9 313.1 872 512 872C710.9 872 872 710.9 872 512C872 313.1 710.9 152 512 152C313.1 152 152 313.1 152 512ZM420 396C406.7 396 396 406.7 396 420V604C396 617.3 406.7 628 420 628H604C617.3 628 628 617.3 628 604V420C628 406.7 617.3 396 604 396H420Z" fill="white"/>
  </svg>
)

const WalletConnectIcon = () => (
  <svg viewBox="0 0 300 185" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
    <path d="M61.4385 36.2562C113.565 -5.75497 186.565 -5.75497 238.562 36.2562L243.913 40.9599C246.568 43.2789 246.568 47.1511 243.913 49.4701L224.686 66.3766C223.358 67.5361 221.246 67.5361 219.918 66.3766L212.507 59.9887C177.126 29.6616 122.874 29.6616 87.4932 59.9887L79.5585 66.9191C78.2307 68.0786 76.1185 68.0786 74.7908 66.9191L55.5639 50.0127C52.9087 47.6937 52.9087 43.8215 55.5639 41.5025L61.4385 36.2562ZM283.468 71.7955L300.379 86.9979C303.034 89.3169 303.034 93.1891 300.379 95.5081L218.886 168.782C216.231 171.101 212.007 171.101 209.352 168.782L150.288 116.072C149.624 115.492 148.568 115.492 147.904 116.072L88.8404 168.782C86.1852 171.101 81.9614 171.101 79.3062 168.782L-2.18677 95.5081C-4.84198 93.1891 -4.84198 89.3169 -2.18677 86.9979L14.7239 71.7955C17.3791 69.4765 21.6029 69.4765 24.2581 71.7955L83.3223 124.505C83.9858 125.085 85.0424 125.085 85.7059 124.505L144.77 71.7955C147.425 69.4765 151.649 69.4765 154.304 71.7955L213.368 124.505C214.032 125.085 215.088 125.085 215.752 124.505L274.816 71.7955C277.471 69.4765 281.695 69.4765 284.35 71.7955H283.468Z" fill="#3B99FC"/>
  </svg>
)

const InjectedIcon = () => (
  <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#1A1A2E"/>
    <path d="M20 8L28 12V20C28 24.4 24.4 28.8 20 30C15.6 28.8 12 24.4 12 20V12L20 8Z" stroke="#00D4FF" strokeWidth="1.5" fill="rgba(0,212,255,0.1)"/>
    <circle cx="20" cy="20" r="3" fill="#00D4FF"/>
    <path d="M16 20H24M20 16V24" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const getWalletIcon = (name) => {
  if (name.toLowerCase().includes('metamask'))  return <MetaMaskIcon />
  if (name.toLowerCase().includes('coinbase'))  return <CoinbaseIcon />
  if (name.toLowerCase().includes('walletconnect')) return <WalletConnectIcon />
  return <InjectedIcon />
}

// ─── Token Icon ─────────────────────────────────────────────────────────────────
const TokenIcon = ({ symbol, color, size = 'w-8 h-8' }) => {
  const glyphs = { ETH: '⟠', USDC: '◎', USDT: '₮', WBTC: '₿', UNI: '🦄', LINK: '⬡', AAVE: 'A', DAI: '◈' }
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${color}99, ${color})`, boxShadow: `0 0 10px ${color}44` }}
    >
      {glyphs[symbol] || symbol.slice(0, 2)}
    </div>
  )
}

// ─── Chain Badge ────────────────────────────────────────────────────────────────
const ChainBadge = ({ chainId }) => {
  const meta = CHAIN_META[chainId] || { color: '#888', name: 'Unknown' }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium tracking-wider"
      style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}>
      ● {meta.name}
    </span>
  )
}

// ─── Token Prices Hook ──────────────────────────────────────────────────────────
const useTokenPrices = () =>
  useQuery({
    queryKey: ['tokenPrices'],
    queryFn: async () => {
      const ids = 'ethereum,usd-coin,tether,wrapped-bitcoin,uniswap,chainlink,aave,dai'
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`)
      return res.json()
    },
    refetchInterval: 30000,
    staleTime: 20000,
  })

// ─── Swap Hook ──────────────────────────────────────────────────────────────────
const useSwap = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const [tokenIn, setTokenIn]   = useState(TOKENS[0])
  const [tokenOut, setTokenOut] = useState(TOKENS[1])
  const [amountIn, setAmountIn] = useState('')
  const [slippage, setSlippage] = useState('0.5')

  const amountInParsed = amountIn && !isNaN(amountIn) ? parseUnits(amountIn, tokenIn.decimals) : 0n

  const path =
    tokenIn.address === null  ? [WETH_ADDRESS, tokenOut.address || WETH_ADDRESS] :
    tokenOut.address === null ? [tokenIn.address, WETH_ADDRESS] :
    [tokenIn.address, WETH_ADDRESS, tokenOut.address]

  const { data: quoteData } = useReadContract({
    address: chainId === mainnet.id ? UNISWAP_V2_ROUTER : undefined,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountInParsed, path],
    query: { enabled: !!amountIn && amountInParsed > 0n && chainId === mainnet.id },
  })

  const amountOut = quoteData ? quoteData[quoteData.length - 1] : 0n
  const amountOutFormatted = amountOut > 0n
    ? Number(formatUnits(amountOut, tokenOut.decimals)).toFixed(6)
    : ''

  const { data: allowance } = useReadContract({
    address: tokenIn.address || undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, UNISWAP_V2_ROUTER] : undefined,
    query: { enabled: !!address && !!tokenIn.address },
  })

  const needsApproval = tokenIn.address !== null && allowance !== undefined && amountInParsed > 0n && allowance < amountInParsed

  const { writeContract: approve, data: approveTx } = useWriteContract()
  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTx })

  const { writeContract: swap, data: swapTx } = useWriteContract()
  const { isLoading: swapLoading, isSuccess: swapSuccess } = useWaitForTransactionReceipt({ hash: swapTx })

  const handleApprove = () => {
    if (!tokenIn.address) return
    approve({ address: tokenIn.address, abi: ERC20_ABI, functionName: 'approve', args: [UNISWAP_V2_ROUTER, amountInParsed] })
  }

  const handleSwap = () => {
    if (!address || amountInParsed === 0n || amountOut === 0n) return
    const bps = BigInt(Math.floor(parseFloat(slippage) * 100))
    const amountOutMin = (amountOut * (10000n - bps)) / 10000n
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

    if (tokenIn.address === null) {
      swap({ address: UNISWAP_V2_ROUTER, abi: UNISWAP_V2_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, path, address, deadline], value: amountInParsed })
    } else if (tokenOut.address === null) {
      swap({ address: UNISWAP_V2_ROUTER, abi: UNISWAP_V2_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInParsed, amountOutMin, path, address, deadline] })
    } else {
      swap({ address: UNISWAP_V2_ROUTER, abi: UNISWAP_V2_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInParsed, amountOutMin, path, address, deadline] })
    }
  }

  const flipTokens = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn(amountOutFormatted)
  }

  return {
    tokenIn, setTokenIn, tokenOut, setTokenOut,
    amountIn, setAmountIn, amountOutFormatted,
    slippage, setSlippage, needsApproval,
    handleApprove, approveLoading, approveSuccess,
    handleSwap, swapLoading, swapSuccess, swapTx, approveTx,
    flipTokens, chainId,
  }
}

// ─── Token Selector ─────────────────────────────────────────────────────────────
const TokenSelector = ({ selected, onSelect, exclude }) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (open && menuRef.current) {
      gsap.fromTo(menuRef.current, { opacity: 0, y: -8, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' })
    }
  }, [open])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-all hover:scale-105"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <TokenIcon symbol={selected.symbol} color={selected.color} size="w-6 h-6" />
        <span className="font-bold text-white text-sm" style={{ fontFamily: "'Orbitron',sans-serif" }}>{selected.symbol}</span>
        <span className="text-gray-500 text-xs ml-0.5">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="absolute top-full mt-2 right-0 z-50 rounded-2xl overflow-hidden w-52"
            style={{ background: '#0D1117', border: '1px solid rgba(0,212,255,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          >
            {TOKENS.filter(t => t.symbol !== exclude?.symbol).map(token => (
              <button
                key={token.symbol}
                onClick={() => { onSelect(token); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white hover:bg-opacity-5 transition-colors"
              >
                <TokenIcon symbol={token.symbol} color={token.color} size="w-7 h-7" />
                <div className="text-left">
                  <div className="text-white text-sm font-bold">{token.symbol}</div>
                  <div className="text-gray-500 text-xs">{token.name}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Swap Interface ──────────────────────────────────────────────────────────────
const SwapInterface = () => {
  const { data: prices } = useTokenPrices()
  const {
    tokenIn, setTokenIn, tokenOut, setTokenOut,
    amountIn, setAmountIn, amountOutFormatted,
    slippage, setSlippage, needsApproval,
    handleApprove, approveLoading,
    handleSwap, swapLoading, swapSuccess, swapTx,
    flipTokens, chainId,
  } = useSwap()
  const { isConnected } = useAccount()
  const ref = useRef(null)
  const flipBtnRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%', toggleActions: 'play none none reverse' },
    })
  }, [])

  const pIn  = prices?.[PRICE_MAP[tokenIn.symbol]]?.usd  || 0
  const pOut = prices?.[PRICE_MAP[tokenOut.symbol]]?.usd || 0
  const usdIn  = amountIn           ? `$${(parseFloat(amountIn)           * pIn).toFixed(2)}`  : '$0.00'
  const usdOut = amountOutFormatted ? `$${(parseFloat(amountOutFormatted) * pOut).toFixed(2)}` : '$0.00'
  const isMainnet = chainId === mainnet.id

  const handleFlip = () => {
    gsap.to(flipBtnRef.current, { rotate: '+=180', duration: 0.4, ease: 'back.out(1.7)' })
    flipTokens()
  }

  return (
    <div ref={ref} className="rounded-3xl p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg,rgba(13,17,23,.97),rgba(22,30,46,.97))', border: '1px solid rgba(0,212,255,.15)', boxShadow: '0 0 40px rgba(0,212,255,.04),inset 0 1px 0 rgba(255,255,255,.05)' }}>

      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#00D4FF' }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-black text-lg tracking-widest" style={{ fontFamily: "'Orbitron',sans-serif" }}>SWAP</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs mr-1">Slippage:</span>
          {['0.1','0.5','1.0'].map(s => (
            <button key={s} onClick={() => setSlippage(s)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{ background: slippage===s?'rgba(0,212,255,.2)':'rgba(255,255,255,.05)', color: slippage===s?'#00D4FF':'#555', border: slippage===s?'1px solid rgba(0,212,255,.4)':'1px solid transparent' }}>
              {s}%
            </button>
          ))}
        </div>
      </div>

      {!isMainnet && (
        <div className="mb-4 px-4 py-3 rounded-xl text-xs text-yellow-400 flex items-center gap-2"
          style={{ background: 'rgba(250,204,21,.08)', border: '1px solid rgba(250,204,21,.2)' }}>
          ⚠️ Switch to Ethereum Mainnet to enable swaps
        </div>
      )}

      {/* Pay */}
      <div className="rounded-2xl p-4 mb-1" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span className="uppercase tracking-widest">You Pay</span>
          <span>{usdIn}</span>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" value={amountIn} onChange={e => setAmountIn(e.target.value)} placeholder="0.0" disabled={!isConnected}
            className="flex-1 bg-transparent text-white text-3xl font-black outline-none placeholder-gray-800 w-0"
            style={{ fontFamily: "'Orbitron',sans-serif" }} />
          <TokenSelector selected={tokenIn} onSelect={setTokenIn} exclude={tokenOut} />
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center my-2 relative z-10">
        <button ref={flipBtnRef} onClick={handleFlip}
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-colors"
          style={{ background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.25)', color: '#00D4FF' }}>
          ⇅
        </button>
      </div>

      {/* Receive */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span className="uppercase tracking-widest">You Receive</span>
          <span>{usdOut}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-white text-3xl font-black w-0 truncate" style={{ fontFamily: "'Orbitron',sans-serif" }}>
            {amountOutFormatted || <span className="text-gray-800">0.0</span>}
          </div>
          <TokenSelector selected={tokenOut} onSelect={setTokenOut} exclude={tokenIn} />
        </div>
      </div>

      {/* Route info */}
      {amountOutFormatted && amountIn && (
        <div className="flex justify-between items-center px-4 py-2.5 rounded-xl mb-4 text-xs"
          style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.04)' }}>
          <span className="text-gray-500">Exchange Rate</span>
          <span className="text-gray-300 font-mono">
            1 {tokenIn.symbol} ≈ {(parseFloat(amountOutFormatted)/parseFloat(amountIn)).toFixed(6)} {tokenOut.symbol}
          </span>
        </div>
      )}

      {/* CTA */}
      {!isConnected ? (
        <div className="text-center text-gray-600 text-sm py-3 tracking-wide">Connect wallet to swap</div>
      ) : needsApproval ? (
        <button onClick={handleApprove} disabled={approveLoading}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[.98]"
          style={{ background: approveLoading?'rgba(245,172,55,.1)':'linear-gradient(135deg,#F5AC37,#E8940A)', color: approveLoading?'#F5AC37':'#000', fontFamily:"'Orbitron',sans-serif" }}>
          {approveLoading ? '⏳ Approving…' : `Approve ${tokenIn.symbol}`}
        </button>
      ) : (
        <button onClick={handleSwap} disabled={swapLoading||!amountIn||!isMainnet}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[.98]"
          style={{
            background: (swapLoading||!amountIn||!isMainnet)?'rgba(0,212,255,.07)':'linear-gradient(135deg,#00D4FF,#0099CC)',
            color: (swapLoading||!amountIn||!isMainnet)?'#00D4FF33':'#000',
            fontFamily:"'Orbitron',sans-serif",
            boxShadow: (!swapLoading&&amountIn&&isMainnet)?'0 0 25px rgba(0,212,255,.35)':'none',
          }}>
          {swapLoading?'⏳ Swapping…':swapSuccess?'✅ Swapped!':'Swap Tokens'}
        </button>
      )}

      {swapTx && (
        <a href={`https://etherscan.io/tx/${swapTx}`} target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs mt-3 hover:underline" style={{ color: '#00D4FF' }}>
          View on Etherscan ↗
        </a>
      )}
    </div>
  )
}

// ─── Token Balance Row ───────────────────────────────────────────────────────────
const TokenBalanceRow = ({ token, address, prices, index }) => {
  const { data: erc20Bal } = useReadContract({
    address: token.address || undefined, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!token.address },
  })
  const { data: ethBal } = useBalance({ address: token.address === null ? address : undefined })
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, x: -20 }, {
      opacity: 1, x: 0, duration: 0.5, delay: index * 0.07, ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 92%', toggleActions: 'play none none none' },
    })
  }, [index])

  const raw = token.address === null ? ethBal?.value : erc20Bal
  const bal = raw !== undefined ? Number(formatUnits(raw, token.decimals)).toFixed(4) : '—'
  const price  = prices?.[PRICE_MAP[token.symbol]]?.usd || 0
  const change = prices?.[PRICE_MAP[token.symbol]]?.usd_24h_change || 0
  const usd = raw !== undefined ? `$${(Number(formatUnits(raw, token.decimals)) * price).toFixed(2)}` : '—'

  return (
    <div ref={ref} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white hover:bg-opacity-[.04] group cursor-default">
      <TokenIcon symbol={token.symbol} color={token.color} size="w-9 h-9" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="text-white font-bold text-sm">{token.symbol}</span>
          <span className="text-white text-sm font-mono tabular-nums">{bal}</span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-gray-600 text-xs">{token.name}</span>
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-mono ${change>=0?'text-emerald-400':'text-red-400'}`}>
              {change>=0?'+':''}{change.toFixed(2)}%
            </span>
            <span className="text-gray-400 text-xs font-mono">{usd}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Portfolio ──────────────────────────────────────────────────────────────────
const Portfolio = ({ address, prices }) => {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%', toggleActions: 'play none none reverse' },
    })
  }, [])

  return (
    <div ref={ref} className="rounded-3xl p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg,rgba(13,17,23,.97),rgba(22,30,46,.97))', border: '1px solid rgba(0,212,255,.15)' }}>
      <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#7B2FBE' }} />
      <h3 className="text-white font-black text-base mb-4 tracking-widest" style={{ fontFamily: "'Orbitron',sans-serif" }}>PORTFOLIO</h3>
      <div className="space-y-0.5">
        {TOKENS.map((t, i) => <TokenBalanceRow key={t.symbol} token={t} address={address} prices={prices} index={i} />)}
      </div>
    </div>
  )
}

// ─── Wallet Info Card ────────────────────────────────────────────────────────────
const WalletInfoCard = () => {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { data: balance } = useBalance({ address })
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && isConnected) {
      gsap.fromTo(ref.current, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' })
    }
  }, [isConnected])

  if (!isConnected) return null

  const short = `${address.slice(0,8)}…${address.slice(-6)}`
  const eth   = balance ? Number(formatEther(balance.value)).toFixed(5) : '0.00000'

  const handleCopy = () => {
    navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div ref={ref} className="rounded-3xl p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,rgba(0,212,255,.07),rgba(123,47,190,.07))', border: '1px solid rgba(0,212,255,.2)', boxShadow: '0 0 60px rgba(0,212,255,.06)' }}>
      {/* grid bg */}
      <div className="absolute inset-0 opacity-[.04] pointer-events-none" style={{ backgroundImage:'linear-gradient(rgba(0,212,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.6) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium tracking-widest uppercase">Connected</span>
          </div>
          <ChainBadge chainId={chainId} />
        </div>

        <div className="mb-5">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Balance</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-white" style={{ fontFamily:"'Orbitron',sans-serif" }}>{eth}</span>
            <span className="text-gray-400 text-lg mb-0.5">{balance?.symbol || 'ETH'}</span>
          </div>
        </div>

        <button onClick={handleCopy}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 transition-colors hover:bg-white hover:bg-opacity-5 cursor-pointer"
          style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)' }}>
          <span className="text-gray-500 text-xs tracking-wider">Address</span>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-mono">{short}</span>
            <span className="text-xs" style={{ color: copied?'#00D4FF':'#555' }}>{copied?'✓':'⎘'}</span>
          </div>
        </button>

        <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl mb-4 transition-colors hover:bg-white hover:bg-opacity-5"
          style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', display:'flex' }}>
          <span className="text-gray-500 text-xs tracking-wider">Etherscan</span>
          <span className="text-xs" style={{ color:'#00D4FF' }}>View ↗</span>
        </a>

        <button onClick={disconnect}
          className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[.98]"
          style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#EF4444', fontFamily:"'Orbitron',sans-serif" }}>
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ─── Network Switcher ────────────────────────────────────────────────────────────
const NetworkSwitcher = () => {
  const { chains, switchChain, isPending } = useSwitchChain()
  const chainId = useChainId()
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, x: 25 }, {
      opacity: 1, x: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 88%', toggleActions: 'play none none reverse' },
    })
  }, [])

  return (
    <div ref={ref} className="rounded-3xl p-5"
      style={{ background:'linear-gradient(145deg,rgba(13,17,23,.97),rgba(22,30,46,.97))', border:'1px solid rgba(0,212,255,.15)' }}>
      <h3 className="text-white font-black text-base mb-4 tracking-widest" style={{ fontFamily:"'Orbitron',sans-serif" }}>NETWORKS</h3>
      <div className="grid grid-cols-2 gap-2">
        {chains.map(chain => {
          const { color, name } = CHAIN_META[chain.id] || { color:'#888', name: chain.name }
          const active = chain.id === chainId
          return (
            <button key={chain.id} onClick={() => switchChain({ chainId: chain.id })} disabled={isPending}
              className="flex items-center gap-2.5 p-3 rounded-xl transition-all hover:scale-[1.03] active:scale-[.97]"
              style={{ background: active?`${color}14`:'rgba(255,255,255,.04)', border:`1px solid ${active?color+'44':'rgba(255,255,255,.06)'}`, boxShadow: active?`0 0 15px ${color}20`:'none' }}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow:`0 0 6px ${color}` }} />
              <span className="text-xs font-semibold truncate" style={{ color: active?color:'#666' }}>{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Connect Modal ───────────────────────────────────────────────────────────────
const ConnectModal = ({ onClose }) => {
  const { connectors, connect, isPending } = useConnect()
  const ref = useRef(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { opacity:0, scale:.92, y:24 }, { opacity:1, scale:1, y:0, duration:.4, ease:'back.out(1.6)' })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,.88)', backdropFilter:'blur(12px)' }}>
      <div ref={ref} className="w-full max-w-sm rounded-3xl p-7 relative overflow-hidden"
        style={{ background:'linear-gradient(145deg,#0D1117,#161E2E)', border:'1px solid rgba(0,212,255,.2)', boxShadow:'0 0 100px rgba(0,212,255,.12)' }}>
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background:'#00D4FF' }} />

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-black text-2xl" style={{ fontFamily:"'Orbitron',sans-serif" }}>CONNECT</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-white text-2xl leading-none transition-colors">×</button>
          </div>
          <p className="text-gray-500 text-sm mb-6">Choose a wallet provider to connect</p>

          <div className="space-y-2.5">
            {connectors.map(c => (
              <button key={c.uid} onClick={() => { connect({ connector: c }); onClose() }} disabled={isPending}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[.98] group"
                style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,212,255,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}>
                {getWalletIcon(c.name)}
                <div className="text-left flex-1">
                  <div className="text-white font-semibold text-sm">{c.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5">Click to connect</div>
                </div>
                <span className="text-gray-600 group-hover:text-cyan-400 transition-colors text-lg">→</span>
              </button>
            ))}
          </div>

          <p className="text-gray-600 text-xs text-center mt-6 leading-relaxed">
            By connecting, you agree to our Terms of Service and acknowledge that you have read our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Ticker ────────────────────────────────────────────────────────────────
const StatsTicker = ({ prices }) => {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const items = ref.current.querySelectorAll('.tick')
    gsap.fromTo(items, { opacity:0, y:12 }, { opacity:1, y:0, duration:.4, stagger:.1, ease:'power2.out',
      scrollTrigger: { trigger: ref.current, start:'top 95%' } })
  }, [prices])

  const data = [
    { s:'ETH',  key:'ethereum',        c:'#627EEA' },
    { s:'BTC',  key:'wrapped-bitcoin', c:'#F7931A' },
    { s:'UNI',  key:'uniswap',         c:'#FF007A' },
    { s:'LINK', key:'chainlink',       c:'#2A5ADA' },
    { s:'AAVE', key:'aave',            c:'#B6509E' },
  ]

  return (
    <div ref={ref} className="flex flex-wrap gap-2 justify-center mb-8">
      {data.map(({ s, key, c }) => {
        const p = prices?.[key]?.usd
        const ch = prices?.[key]?.usd_24h_change
        return (
          <div key={s} className="tick flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-gray-400 text-xs font-mono">{s}</span>
            <span className="text-white text-xs font-bold font-mono">{p ? `$${p.toLocaleString(undefined,{maximumFractionDigits:2})}` : '—'}</span>
            {ch != null && <span className={`text-xs font-mono ${ch>=0?'text-emerald-400':'text-red-400'}`}>{ch>=0?'+':''}{ch.toFixed(2)}%</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────────
const Hero = ({ onConnect }) => {
  const { isConnected } = useAccount()
  const heroRef  = useRef(null)
  const orb1Ref  = useRef(null)
  const orb2Ref  = useRef(null)
  const titleRef = useRef(null)
  const subRef   = useRef(null)
  const btnRef   = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(orb1Ref.current, { x:35, y:-25, duration:6, repeat:-1, yoyo:true, ease:'sine.inOut' })
      gsap.to(orb2Ref.current, { x:-30, y:20, duration:8, repeat:-1, yoyo:true, ease:'sine.inOut', delay:2 })
      gsap.fromTo(titleRef.current, { opacity:0, y:45, filter:'blur(10px)' }, { opacity:1, y:0, filter:'blur(0px)', duration:1.2, ease:'power3.out', delay:.2 })
      gsap.fromTo(subRef.current,   { opacity:0, y:20 }, { opacity:1, y:0, duration:.8, ease:'power2.out', delay:.7 })
      gsap.fromTo(btnRef.current,   { opacity:0, scale:.88 }, { opacity:1, scale:1, duration:.6, ease:'back.out(2)', delay:1 })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={heroRef} className="relative flex flex-col items-center justify-center text-center py-14 overflow-hidden">
      <div ref={orb1Ref} className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background:'radial-gradient(circle,#00D4FF,transparent)' }} />
      <div ref={orb2Ref} className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background:'radial-gradient(circle,#7B2FBE,transparent)' }} />

      <div ref={titleRef} className="relative">
        <p className="text-xs font-medium tracking-[.4em] uppercase mb-3" style={{ color:'#00D4FF', fontFamily:"'Orbitron',sans-serif" }}>
          Decentralized Finance
        </p>
        <h1 className="text-6xl md:text-8xl font-black mb-4 leading-none"
          style={{ fontFamily:"'Orbitron',sans-serif", background:'linear-gradient(135deg,#fff 0%,#00D4FF 50%,#7B2FBE 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          WEB3<br />UNISWAP
        </h1>
      </div>

      <p ref={subRef} className="text-gray-400 text-base max-w-sm mb-8 leading-relaxed">
        Trade, manage & explore the decentralized web. Connect your wallet to swap tokens and monitor your DeFi portfolio.
      </p>

      <div ref={btnRef}>
        {!isConnected ? (
          <button onClick={onConnect}
            className="px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 hover:brightness-110"
            style={{ background:'linear-gradient(135deg,#00D4FF,#0099CC)', color:'#000', fontFamily:"'Orbitron',sans-serif", boxShadow:'0 0 35px rgba(0,212,255,.45)' }}>
            Launch App →
          </button>
        ) : (
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{ background:'rgba(0,212,255,.1)', border:'1px solid rgba(0,212,255,.3)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium tracking-wide">Wallet Connected — Scroll to dashboard</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Feature Card ────────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, index }) => {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity:0, y:50 }, {
      opacity:1, y:0, duration:.6, delay:index*.15, ease:'power3.out',
      scrollTrigger: { trigger: ref.current, start:'top 90%', toggleActions:'play none none reverse' },
    })
  }, [index])

  return (
    <div ref={ref} className="rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 group"
      style={{ background:'linear-gradient(145deg,rgba(13,17,23,.97),rgba(22,30,46,.97))', border:'1px solid rgba(0,212,255,.08)' }}
      onMouseEnter={e => gsap.to(e.currentTarget, { '--border-opacity': .3, duration:.3 })}
      onMouseLeave={e => gsap.to(e.currentTarget, { '--border-opacity': .08, duration:.3 })}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-white font-black text-base mb-2 tracking-wide" style={{ fontFamily:"'Orbitron',sans-serif" }}>{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { isConnected, address } = useAccount()
  const [showModal, setShowModal] = useState(false)
  const { data: prices } = useTokenPrices()

  return (
    <div className="min-h-screen text-white"
      style={{ background:'radial-gradient(ellipse at top,#0a0e1a 0%,#050810 60%,#020409 100%)', fontFamily:"'Space Mono',monospace" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#050810}
        ::-webkit-scrollbar-thumb{background:rgba(0,212,255,.25);border-radius:4px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      <div className="max-w-6xl mx-auto px-4 pb-24">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-black"
              style={{ background:'linear-gradient(135deg,#00D4FF,#7B2FBE)', fontSize:14 }}>
                <img src="/web3_icon.png" className='p-1' alt="icon" />
              </div>
            <span className="font-black text-lg tracking-widest"
              style={{ fontFamily:"'Orbitron',sans-serif", background:'linear-gradient(90deg,#00D4FF,#7B2FBE)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              UniSwap
            </span>
          </div>

          {!isConnected ? (
            <button onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all hover:scale-105"
              style={{ background:'linear-gradient(135deg,#00D4FF,#0099CC)', color:'#000', fontFamily:"'Orbitron',sans-serif", boxShadow:'0 0 20px rgba(0,212,255,.3)' }}>
              Connect Wallet
            </button>
          ) : (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background:'rgba(0,212,255,.07)', border:'1px solid rgba(0,212,255,.2)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white font-mono">{address?.slice(0,6)}…{address?.slice(-4)}</span>
            </button>
          )}
        </nav>

        <StatsTicker prices={prices} />
        <Hero onConnect={() => setShowModal(true)} />

        {isConnected ? (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <WalletInfoCard />
              <NetworkSwitcher />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <SwapInterface />
              <Portfolio address={address} prices={prices} />
            </div>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon:'⚡', title:'Instant Swaps',      desc:'Trade tokens at the best rates via Uniswap V2 with minimal slippage and full on-chain settlement.' },
              { icon:'🔐', title:'Non-Custodial',       desc:'Your keys, your crypto. We never hold your assets — every transaction is signed locally in your wallet.' },
              { icon:'📊', title:'Live Portfolio',      desc:'Monitor real-time token balances, 24h price changes and USD values across your entire DeFi portfolio.' },
            ].map((c, i) => <FeatureCard key={i} {...c} index={i} />)}
          </div>
        )}
      </div>

      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </WagmiProvider>
  )
}