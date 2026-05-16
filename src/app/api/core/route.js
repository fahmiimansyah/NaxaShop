import { NextResponse } from 'next/server';


export async function POST(request) {
  try {
    const body = await request.json();
    
    // Server Key di sini
    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY; 
    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');

    const payload = {
      payment_type: "qris",
      transaction_details: {
        order_id: `NAXA-${Date.now()}`,
        gross_amount: body.harga,
      },
      customer_details: {
        first_name: "Sultan",
        last_name: "NaXaShop",
      }
    };

    const response = await fetch('https://api.sandbox.midtrans.com/v2/charge', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ 
        sukses: true, 
        qris_url: data.actions[0].url // Ini harta karunnya!
      });
    } else {
      return NextResponse.json({ sukses: false, pesan: data.status_message }, { status: 400 });
    }

  } catch (error) {
    console.error('Mesin Core Meledak:', error);
    return NextResponse.json({ sukses: false, pesan: 'Server Internal Error' }, { status: 500 });
  }
}