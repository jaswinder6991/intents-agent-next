import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const receiver_id = searchParams.get('receiverId');
    const amount = searchParams.get('amount');
    
    // Validate required fields
    if (!receiver_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: receiverId and amount are required" },
        { status: 400 }
      );
    }

    // Validate and convert amount to USDC atomic units (6 decimal places)
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
      return NextResponse.json(
        { error: "amount must be a valid number" },
        { status: 400 }
      );
    }

    // Convert to atomic units (1 USDC = 1_000_000 units)
    const atomicAmount = (amountFloat * 1_000_000).toFixed(0);

    // Construct the transaction data
    const transactionData = [
      {
        methodName: 'ft_transfer_call',
        args: {
          receiver_id: "intents.near",
          amount: atomicAmount,
          msg: ""
        },
        gas: '300000000000000', // 300 TGas
        deposit: '1', // 1 yoctoNEAR for storage
        contractName: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1" // USDC contract
      }
    ];

    // Return a prompt with the transaction data
    const prompt = `
[
  ${JSON.stringify(transactionData[0], null, 2)}
]
Use this data to call \`generate-transaction\` tool to generate a transaction.`;

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error generating ft_transfer_call transaction payload:', error);
    return NextResponse.json(
      { error: 'Failed to generate ft_transfer_call transaction payload' },
      { status: 500 }
    );
  }
}
