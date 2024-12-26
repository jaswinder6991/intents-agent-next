import { NextResponse } from 'next/server';

const SOLVER_RELAY_URL = 'https://solver-relay-v2.chaindefuser.com/rpc';
const USDC_CONTRACT = '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
const BTC_CONTRACT = 'btc.omft.near';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');
    
    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: "Missing required field: amount" },
        { status: 400 }
      );
    }

    // Convert USDC amount to atomic units (6 decimals)
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
      return NextResponse.json(
        { error: "amount must be a valid number" },
        { status: 400 }
      );
    }
    const atomicAmount = (amountFloat * 1_000_000).toFixed(0);

    // Prepare RPC request
    const rpcRequest = {
      id: "dontcare",
      jsonrpc: "2.0",
      method: "quote",
      params: [
        {
          defuse_asset_identifier_in: `nep141:${USDC_CONTRACT}`,
          defuse_asset_identifier_out: `nep141:${BTC_CONTRACT}`,
          exact_amount_in: atomicAmount,
          min_deadline_ms: 120000
        }
      ]
    };

    // Make request to solver relay
    const response = await fetch(SOLVER_RELAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcRequest),
    });

    if (!response.ok) {
      throw new Error(`Solver relay responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Unknown error from solver relay');
    }

    const quote = data.result[0];
    
    // Convert amounts to human readable format
    const humanAmountIn = (parseInt(quote.amount_in) / 1_000_000).toString(); // USDC has 6 decimals
    const humanAmountOut = (parseInt(quote.amount_out) / 100_000_000).toString(); // BTC has 8 decimals

    return NextResponse.json({
      amountIn: humanAmountIn,
      amountOut: humanAmountOut,
      quoteHash: quote.quote_hash,
      expirationTime: quote.expiration_time
    });

  } catch (error) {
    console.error('Error getting BTC quote:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get BTC quote' },
      { status: 500 }
    );
  }
}
