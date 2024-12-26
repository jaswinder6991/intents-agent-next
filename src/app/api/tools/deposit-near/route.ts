import { NextResponse } from 'next/server';
import { utils } from 'near-api-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');
    
    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: "Missing required field: amount is required" },
        { status: 400 }
      );
    }

    // Validate and convert amount to yoctoNEAR (24 decimal places)
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat)) {
      return NextResponse.json(
        { error: "amount must be a valid number" },
        { status: 400 }
      );
    }

    const amountInYocto = utils.format.parseNearAmount(amount);
    if (!amountInYocto) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Convert storage deposit amount (0.00125 NEAR)
    const storageDepositAmount = utils.format.parseNearAmount("0.00125");
    if (!storageDepositAmount) {
      return NextResponse.json(
        { error: "Failed to parse storage deposit amount" },
        { status: 500 }
      );
    }

    // Construct the transaction data for the batch transaction
    const transactionData = [
      {
        // First action: register storage on wrap.near
        methodName: 'storage_deposit',
        args: {
          account_id: null, // registers for the sender
          registration_only: true
        },
        gas: '30000000000000', // 30 TGas
        deposit: storageDepositAmount,
        contractName: "wrap.near"
      },
      {
        // Second action: deposit NEAR to get wNEAR
        methodName: 'near_deposit',
        args: {},
        gas: '30000000000000', // 30 TGas
        deposit: amountInYocto,
        contractName: "wrap.near"
      },
      {
        // Third action: transfer wNEAR to intents.near
        methodName: 'ft_transfer_call',
        args: {
          receiver_id: "intents.near",
          amount: amountInYocto,
          msg: ""
        },
        gas: '100000000000000', // 300 TGas
        deposit: '1', // 1 yoctoNEAR for storage
        contractName: "wrap.near"
      }
    ];

    // Return a prompt with the transaction data
    const prompt = `
[
  ${JSON.stringify(transactionData[0], null, 2)},
  ${JSON.stringify(transactionData[1], null, 2)},
  ${JSON.stringify(transactionData[2], null, 2)}
]
Use this data to call \`generate-transaction\` tool to generate a transaction.`;

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error generating wrapped NEAR deposit transaction payload:', error);
    return NextResponse.json(
      { error: 'Failed to generate wrapped NEAR deposit transaction payload' },
      { status: 500 }
    );
  }
}
