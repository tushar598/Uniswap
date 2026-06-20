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
export async function parseWithLLM(message, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
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
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) throw new Error('Empty response from Gemini')

    const parsed = JSON.parse(text)

    // Validate required fields
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
    console.error('AgentSwap AI error:', error)
    return {
      action: 'query',
      fromToken: null,
      toToken: null,
      amount: null,
      isUSD: false,
      recipient: null,
      message: `I had trouble processing that request. ${error.message}. Please try rephrasing your command.`,
      insights: ['Make sure your Gemini API key is valid', 'Try a simpler command like "Swap 10 USDC to AVAX"'],
      confidence: 0,
    }
  }
}
