// ─── AgentSwap AI — Gemini LLM Integration ──────────────────────────────────────

const SYSTEM_PROMPT = `You are AgentSwap AI, an intelligent DeFi payment and swap assistant built on the Avalanche blockchain. You help users interact with DeFi using natural language.

## Supported Tokens on Avalanche
AVAX (native), USDC, USDT, WAVAX, JOE, DAI.e, WBTC.e, WETH.e

## Supported Actions
- swap: Exchange one token for another
- send: Send tokens to an address
- convert: Convert tokens (similar to swap)
- query: Answer a DeFi question without executing a transaction

## Response Format
You MUST respond with valid JSON only. No markdown, no code blocks, just pure JSON:
{
  "action": "swap" | "send" | "convert" | "query",
  "fromToken": "SYMBOL" or null,
  "toToken": "SYMBOL" or null,
  "amount": number or null,
  "isUSD": true/false (true if amount is in USD like "$10"),
  "recipient": "0x... address" or null,
  "message": "Friendly human-readable explanation of what you understood and will do",
  "insights": ["helpful tip 1", "helpful tip 2"],
  "confidence": 0.0 to 1.0
}

## Parsing Rules
1. Dollar amounts like "$10" or "10 dollars" → isUSD: true, amount: 10
2. "convert to stablecoins" → toToken: "USDC" (default stablecoin)
3. "send" with no token specified → default fromToken: "AVAX"
4. For queries/questions → action: "query", put the answer in message
5. Always provide 1-2 helpful insights about the transaction
6. If you cannot parse → confidence: 0, explain in message
7. Use EXACT token symbols from the supported list above
8. If user says "ETH" interpret as "WETH.e" (bridged ETH on Avalanche)
9. If user says "BTC" or "Bitcoin" interpret as "WBTC.e"

## Examples
User: "Swap 50 USDC to AVAX"
Response: {"action":"swap","fromToken":"USDC","toToken":"AVAX","amount":50,"isUSD":false,"recipient":null,"message":"I'll swap 50 USDC for AVAX using Trader Joe on Avalanche. This is a common pair with deep liquidity.","insights":["USDC/AVAX has excellent liquidity on Trader Joe","Avalanche transactions settle in under 2 seconds"],"confidence":0.95}

User: "Send $10 worth of AVAX to 0x1234..."
Response: {"action":"send","fromToken":"AVAX","toToken":null,"amount":10,"isUSD":true,"recipient":"0x1234...","message":"I'll help you send $10 worth of AVAX to the specified address.","insights":["Gas fees on Avalanche are typically under $0.05","Make sure the recipient address is correct before confirming"],"confidence":0.9}

User: "What's the best way to convert my tokens to stablecoins?"
Response: {"action":"convert","fromToken":null,"toToken":"USDC","amount":null,"isUSD":false,"recipient":null,"message":"To convert your tokens to stablecoins, I recommend swapping to USDC which has the deepest liquidity pools on Avalanche. Select the token you want to convert and I'll find the best route.","insights":["USDC has the most liquidity on Avalanche DEXes","You can also consider USDT as an alternative stablecoin"],"confidence":0.85}`

/**
 * Parse a natural language DeFi command using Google Gemini.
 * @param {string} message - The user's natural language command
 * @param {string} apiKey - Google Gemini API key
 * @returns {Promise<Object>} Parsed intent object
 */
// Track if the API key has failed so we skip retrying a broken key
let _apiKeyFailed = false

// CURRENT stable models as of June 2026. gemini-2.0-flash and gemini-1.5-flash
// have both been fully shut down by Google — calling them no longer works.
// gemini-2.5-flash is the best price/quality pick for structured-output tasks
// like this one; gemini-2.5-flash-lite is the cheaper/faster fallback.
// (If you want the newest/strongest model instead, "gemini-3.5-flash" is also
// stable and GA, just pricier.)
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

export async function parseWithLLM(message,api_Key) {


  const apiKey = api_Key !== undefined ? api_Key : import.meta.env.VITE_GEMINI_API_KEY;

  // If the key already failed before, go straight to mock — no network request
  if (_apiKeyFailed) {
    console.log("key fails");
    return getMockFallback(message)
  }

  if (!apiKey || !apiKey.trim()) {
    console.warn('No Gemini API key provided. Using offline parser.')
    return getMockFallback(message)
  }

  let lastError = null

  for (const model of MODEL_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: SYSTEM_PROMPT + '\n\nUser: ' + message }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
          },
        }),
      })


      if (!response.ok) {
        const status = response.status
        // ALWAYS read the body so we can see Google's actual reason —
        // never swallow this, it's the only way to tell a bad key apart
        // from a retired model or a malformed request.
        const errBody = await response.text()
        console.error(`Gemini API ${status} for model "${model}":`, errBody)

        // Gemini's quirk: invalid/restricted keys come back as HTTP 400
        // with reason "API_KEY_INVALID" — NOT 401/403 like most APIs.
        const isBadKey =
          errBody.includes('API_KEY_INVALID') || errBody.includes('API key not valid')

        // Key is valid, but its "API restrictions" in Cloud Console don't
        // include the Generative Language API (or an org policy blocks it).
        // This is NOT a quota problem — retrying or waiting won't help.
        const isServiceBlocked = errBody.includes('API_KEY_SERVICE_BLOCKED')

        if (isBadKey) {
          _apiKeyFailed = true
          console.warn(
            'Gemini API key is invalid. Generate a fresh one at https://aistudio.google.com/apikey'
          )
          return getMockFallback(message)
        }

        if (isServiceBlocked) {
          _apiKeyFailed = true
          console.warn(
            'Gemini API key is BLOCKED from calling the Generative Language API. ' +
              'Check Cloud Console → APIs & Services → Credentials → (your key) → "API restrictions" ' +
              'and make sure "Generative Language API" is allowed, or use an unrestricted key from ' +
              'https://aistudio.google.com/apikey instead.'
          )
          return getMockFallback(message)
        }

        if (status === 403 || status === 429) {
          _apiKeyFailed = true
          console.warn(`Gemini API returned ${status} (quota/rate limit). Switching to offline parser.`)
          return getMockFallback(message)
        }

        // 404 = model name not found/retired for this API version — try next candidate
        // 400 (non-key) = malformed request for this model — try next candidate
        if (status === 404 || status === 400) {
          lastError = `${model}: ${status} ${errBody.slice(0, 200)}`
          continue
        }

        throw new Error(`Gemini API error (${status}): ${errBody.slice(0, 200)}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Empty response from Gemini')

      // Extract JSON — model may wrap it in ```json ... ```
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in Gemini response')

      const parsed = JSON.parse(jsonMatch[0])

      return {
        action: parsed.action || 'query',
        fromToken: parsed.fromToken || null,
        toToken: parsed.toToken || null,
        amount: parsed.amount != null ? Number(parsed.amount) : null,
        isUSD: !!parsed.isUSD,
        recipient: parsed.recipient || null,
        message: parsed.message || 'Command processed.',
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      }
    } catch (error) {
      lastError = error.message
      // If this was the last candidate, fall through to mock
      if (model === MODEL_CANDIDATES[MODEL_CANDIDATES.length - 1]) {
        console.warn('All Gemini model attempts failed. Using offline AI parser.', lastError)
        return getMockFallback(message)
      }
      continue
    }
  }

  // Should never reach here, but just in case
  console.warn('All Gemini model attempts failed.', lastError)
  return getMockFallback(message)
}

/**
 * Fallback mock response generator for when the API quota is exceeded during the hackathon.
 */
function getMockFallback(message) {
  const msg = message.toLowerCase()
  
  if (msg.includes('swap') || msg.includes('convert')) {
    let fromToken = msg.includes('usdc') ? 'USDC' : msg.includes('usdt') ? 'USDT' : msg.includes('avax') ? 'AVAX' : null
    let toToken = msg.includes('avax') && fromToken !== 'AVAX' ? 'AVAX' : msg.includes('usdc') && fromToken !== 'USDC' ? 'USDC' : 'WAVAX'
    
    // Extract a number if present
    const amountMatch = message.match(/\d+/)
    const amount = amountMatch ? Number(amountMatch[0]) : null
    
    return {
      action: 'swap',
      fromToken: fromToken || 'USDC',
      toToken: toToken,
      amount: amount || 10,
      isUSD: msg.includes('$') || msg.includes('dollar'),
      recipient: null,
      message: " I'll set up that swap for you.",
      insights: ["API quota exceeded: Using offline mock parser", "Trader Joe provides the best liquidity"],
      confidence: 0.9
    }
  }
  
  if (msg.includes('send') || msg.includes('pay')) {
    const amountMatch = message.match(/\d+/)
    
    return {
      action: 'send',
      fromToken: msg.includes('usdc') ? 'USDC' : 'AVAX',
      toToken: null,
      amount: amountMatch ? Number(amountMatch[0]) : 10,
      isUSD: msg.includes('$') || msg.includes('dollar'),
      recipient: '0x1234567890123456789012345678901234567890',
      message: " I'll prepare that payment.",
      insights: ["API quota exceeded: Using offline mock parser"],
      confidence: 0.9
    }
  }

  return {
    action: 'query',
    fromToken: null,
    toToken: null,
    amount: null,
    isUSD: false,
    recipient: null,
    message: "Your Gemini API key is blocked or has exceeded its quota. Please generate a new API key at aistudio.google.com/apikey and update it in ⚙️ Settings. In the meantime, try swap/send commands — they work offline!",
    insights: ["Get a free key at aistudio.google.com/apikey", "Try: 'Swap 50 USDC to AVAX'"],
    confidence: 1.0
  }
}