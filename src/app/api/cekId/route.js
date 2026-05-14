import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { id_player, server_player, kode_game } = await request.json();

    if (!id_player || !kode_game) {
      return NextResponse.json(
        { pesan: "ID atau Kode Game kosong bre!" },
        { status: 400 }
      );
    }

    const merchantId = process.env.APIGAMES_MERCHANT_ID;
    const secretKey = process.env.APIGAMES_SECRET;

    if (!merchantId || !secretKey) {
      return NextResponse.json(
        { pesan: "Merchant ID / Secret Key belum disetting di .env.local" },
        { status: 500 }
      );
    }

    const signature = crypto
      .createHash('md5')
      .update(merchantId + secretKey)
      .digest('hex');

    let finalUserId = id_player;

// Gabung ID + Zone ML
if (server_player) {
  finalUserId = `${id_player}${server_player}`;
}

let urlPabrik =
  `https://v1.apigames.id/merchant/${merchantId}/cek-username/${kode_game}` +
  `?user_id=${encodeURIComponent(finalUserId)}` +
  `&signature=${signature}`;
    console.log("BODY DARI KASIR:", {
  id_player,
  server_player,
  kode_game,
});
    const responPabrik = await fetch(urlPabrik, {
      method: 'GET',
      cache: 'no-store',
    });

    const hasilPabrik = await responPabrik.json();
console.log("STATUS APIGAMES:", responPabrik.status);
console.log("HASIL APIGAMES:", hasilPabrik);
    if (!responPabrik.ok || hasilPabrik.status === 0 || !hasilPabrik.data) {
      return NextResponse.json(
        { pesan: hasilPabrik.error_msg || hasilPabrik.message || "ID gak ketemu bre! Cek lagi." },
        { status: 404 }
      );
    }

    const nickname =
      typeof hasilPabrik.data === "string"
        ? hasilPabrik.data
        : hasilPabrik.data?.username || hasilPabrik.data?.nickname;

    return NextResponse.json(
      { nickname: nickname || hasilPabrik.data },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error Cek Nickname:", error);

    return NextResponse.json(
      { pesan: "Radar error bre, server cek nickname bermasalah." },
      { status: 500 }
    );
  }
}