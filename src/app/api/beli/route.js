import { NextResponse } from 'next/server';
import crypto from 'crypto';
<<<<<<< HEAD
=======
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
>>>>>>> d0c4f1a (update fitur riwayat transaksi)
import db from '../../lib/db';
import { rateLimit } from '../../lib/rate-limit';

const METODE_BAYAR_VALID = [
  'qris',
  'gopay',
  'shopeepay',

  'bca_va',
  'bni_va',
  'bri_va',
  'cimb_va',
  'permata_va',
  'mandiri_bill',

  'alfamart',
  'indomaret'
];

const BANK_TRANSFER_MAP = {
  bca_va: 'bca',
  bni_va: 'bni',
  bri_va: 'bri',
  cimb_va: 'cimb'
};

const LABEL_METODE_BAYAR = {
  qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',

  bca_va: 'BCA Virtual Account',
  bni_va: 'BNI Virtual Account',
  bri_va: 'BRI Virtual Account',
  cimb_va: 'CIMB Virtual Account',
  permata_va: 'Permata Virtual Account',
  mandiri_bill: 'Mandiri Bill Payment',

  alfamart: 'Alfamart',
  indomaret: 'Indomaret'
};

const PROVIDER_VALID = ['apigames', 'digiflazz', 'vipreseller', 'mock'];

function bersihinText(value) {
  return String(value || '').trim();
}

function bersihinWhatsapp(value) {
  return String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .replace(/\+/g, '');
}

function whatsappValid(value) {
  if (!value) return true;
  return /^62[0-9]{8,15}$/.test(value);
}

function emailValid(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function bikinOrderId() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NX-${Date.now()}-${random}`;
}

function getMidtransBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function ambilActionUrl(data, namaActionList = []) {
  const actions = Array.isArray(data?.actions) ? data.actions : [];

  for (const nama of namaActionList) {
    const ketemu = actions.find((action) => action.name === nama);
    if (ketemu?.url) return ketemu.url;
  }

  return '';
}

function bikinFinishUrl(request, orderId) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl?.origin ||
    '';

  if (!origin) return '';

  return `${origin}/pembayaran?order_id=${encodeURIComponent(orderId)}`;
}

async function updateTransaksiGagal(orderId, catatan) {
  if (!orderId) return;

  try {
    await db.query(
      `UPDATE transaksi
       SET status_bayar = 'gagal',
           status_topup = 'gagal',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\n', ?)
       WHERE order_id = ?`,
      [catatan, orderId]
    );
  } catch (error) {
    console.error('Gagal update transaksi jadi gagal:', error);
  }
}

function bikinPayloadMidtrans({
  metodeBayar,
  orderId,
  hargaAsli,
  idPlayer,
  customerEmail,
  customerWhatsapp,
  namaProduk,
  finishUrl
}) {
  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: hargaAsli
    },
    customer_details: {
      first_name: 'Player',
      last_name: idPlayer,
      email: customerEmail || undefined,
      phone: customerWhatsapp || undefined
    },
    item_details: [
      {
        id: namaProduk?.slice(0, 50) || 'Produk',
        price: hargaAsli,
        quantity: 1,
        name: namaProduk?.slice(0, 50) || 'Produk NaXaShop'
      }
    ]
  };

  if (metodeBayar === 'qris') {
    payload.payment_type = 'qris';
    return payload;
  }

  if (metodeBayar === 'gopay') {
    payload.payment_type = 'gopay';

    if (finishUrl) {
      payload.gopay = {
        enable_callback: true,
        callback_url: finishUrl
      };
    }

    return payload;
  }

  if (metodeBayar === 'shopeepay') {
    payload.payment_type = 'shopeepay';

    if (finishUrl) {
      payload.shopeepay = {
        callback_url: finishUrl
      };
    }

    return payload;
  }

  if (BANK_TRANSFER_MAP[metodeBayar]) {
    payload.payment_type = 'bank_transfer';
    payload.bank_transfer = {
      bank: BANK_TRANSFER_MAP[metodeBayar]
    };

    return payload;
  }

  if (metodeBayar === 'permata_va') {
    payload.payment_type = 'permata';
    return payload;
  }

  if (metodeBayar === 'mandiri_bill') {
    payload.payment_type = 'echannel';
    payload.echannel = {
      bill_info1: 'Payment',
      bill_info2: 'NaXaShop'
    };

    return payload;
  }

  if (metodeBayar === 'alfamart') {
    payload.payment_type = 'cstore';
    payload.cstore = {
      store: 'alfamart',
      message: 'NaXaShop',
      alfamart_free_text_1: 'NaXaShop',
      alfamart_free_text_2: orderId.slice(0, 40),
      alfamart_free_text_3: 'Terima kasih'
    };

    return payload;
  }

  if (metodeBayar === 'indomaret') {
    payload.payment_type = 'cstore';
    payload.cstore = {
      store: 'indomaret',
      message: 'NaXaShop'
    };

    return payload;
  }

  return payload;
}

function bikinResponsePembayaran({
  metodeBayar,
  orderId,
  hargaAsli,
  namaProduk,
  dataMidtrans
}) {
  const labelMetode = LABEL_METODE_BAYAR[metodeBayar] || metodeBayar;

  const baseResponse = {
    sukses: true,
    order_id: orderId,
    metode_bayar: metodeBayar,
    label_metode_bayar: labelMetode,
    harga: hargaAsli,
    nama_produk: namaProduk
  };

  if (metodeBayar === 'qris') {
    const qrisUrl = ambilActionUrl(dataMidtrans, [
      'generate-qr-code',
      'generate-qr-code-v2'
    ]);

    return {
      ...baseResponse,
      tipe: 'qris',
      qris_url: qrisUrl
    };
  }

  if (metodeBayar === 'gopay' || metodeBayar === 'shopeepay') {
    const qrisUrl = ambilActionUrl(dataMidtrans, [
      'generate-qr-code',
      'generate-qr-code-v2'
    ]);

    const deeplinkUrl = ambilActionUrl(dataMidtrans, [
      'deeplink-redirect',
      'mobile-redirect',
      'app-deeplink-redirect'
    ]);

    const redirectUrl = ambilActionUrl(dataMidtrans, [
      'redirect-url',
      'web-redirect',
      'payment-page'
    ]);

    return {
      ...baseResponse,
      tipe: 'ewallet',
      payment_url: deeplinkUrl || redirectUrl || '',
      deeplink_url: deeplinkUrl || '',
      redirect_url: redirectUrl || '',
      qris_url: qrisUrl || '',
      actions: dataMidtrans.actions || []
    };
  }

  if (BANK_TRANSFER_MAP[metodeBayar]) {
    const vaNumber = dataMidtrans.va_numbers?.[0]?.va_number || '';

    return {
      ...baseResponse,
      tipe: 'va',
      bank: labelMetode.replace(' Virtual Account', ''),
      va_number: vaNumber
    };
  }

  if (metodeBayar === 'permata_va') {
    return {
      ...baseResponse,
      tipe: 'va',
      bank: 'Permata',
      va_number: dataMidtrans.permata_va_number || ''
    };
  }

  if (metodeBayar === 'mandiri_bill') {
    return {
      ...baseResponse,
      tipe: 'mandiri_bill',
      bank: 'Mandiri',
      biller_code: dataMidtrans.biller_code || '',
      bill_key: dataMidtrans.bill_key || ''
    };
  }

  if (metodeBayar === 'alfamart' || metodeBayar === 'indomaret') {
    return {
      ...baseResponse,
      tipe: 'cstore',
      store: dataMidtrans.store || metodeBayar,
      payment_code: dataMidtrans.payment_code || ''
    };
  }

  return {
    ...baseResponse,
    tipe: 'unknown'
  };
}

function responsePunyaInstruksiBayar(responseBayar) {
  if (responseBayar.tipe === 'qris') return Boolean(responseBayar.qris_url);

  if (responseBayar.tipe === 'ewallet') {
    return Boolean(
      responseBayar.payment_url ||
      responseBayar.deeplink_url ||
      responseBayar.redirect_url ||
      responseBayar.qris_url
    );
  }

  if (responseBayar.tipe === 'va') return Boolean(responseBayar.va_number);

  if (responseBayar.tipe === 'mandiri_bill') {
    return Boolean(responseBayar.biller_code && responseBayar.bill_key);
  }

  if (responseBayar.tipe === 'cstore') return Boolean(responseBayar.payment_code);

  return true;
}

export async function POST(request) {
  let orderId = '';
  let transaksiSudahDicatat = false;

  try {
    const limit = rateLimit(request, {
      key: 'beli',
      limit: 5,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering checkout bre. Coba lagi ${limit.retryAfter} detik lagi.`
        },
        { status: 429 }
      );
    }

<<<<<<< HEAD
=======
    const session = await getServerSession(authOptions);
const userEmailLogin = bersihinText(session?.user?.email).toLowerCase() || null;

>>>>>>> d0c4f1a (update fitur riwayat transaksi)
    const pesanan = await request.json();

    const gameId = Number(pesanan.game_id);
    const produkId = Number(pesanan.produk_id);
    const kodeProduk = bersihinText(pesanan.kode_produk);
    const idPlayer = bersihinText(pesanan.id_player);
    const zonePlayer = bersihinText(pesanan.zone_player);
    const metodeBayar = bersihinText(pesanan.metode_bayar);

    const customerWhatsapp = bersihinWhatsapp(pesanan.customer_whatsapp);
    const customerEmail = bersihinText(pesanan.customer_email).toLowerCase();
<<<<<<< HEAD

=======
    const emailUntukPayment = customerEmail || userEmailLogin || '';
>>>>>>> d0c4f1a (update fitur riwayat transaksi)
    if (customerWhatsapp && !whatsappValid(customerWhatsapp)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Nomor WhatsApp gak valid bre! Pakai format 628xxxx.'
        },
        { status: 400 }
      );
    }

    if (customerEmail && !emailValid(customerEmail)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format email pembeli gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(gameId) ||
      gameId <= 0 ||
      !Number.isInteger(produkId) ||
      produkId <= 0 ||
      !kodeProduk ||
      !idPlayer ||
      !metodeBayar
    ) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Data pesanan belum lengkap bre!'
        },
        { status: 400 }
      );
    }

    if (idPlayer.length > 50 || zonePlayer.length > 50) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID atau server terlalu panjang bre!'
        },
        { status: 400 }
      );
    }

    if (!METODE_BAYAR_VALID.includes(metodeBayar)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Metode bayar gak valid bre!'
        },
        { status: 400 }
      );
    }

    const [dataProduk] = await db.query(
      `SELECT 
         p.id,
         p.game_id,
         p.kode_produk,
         p.nama_produk,
         p.harga,
         p.harga_modal,
         p.provider,
         COALESCE(p.kode_produk_provider, p.kode_produk) AS kode_produk_provider,
         g.zone_id,
         g.server_game
       FROM produk p
       JOIN games g ON p.game_id = g.id
       WHERE p.id = ?
         AND p.game_id = ?
         AND p.kode_produk = ?
         AND p.status_produk = 'aktif'
         AND g.status_game = 'aktif'
       LIMIT 1`,
      [produkId, gameId, kodeProduk]
    );

    if (dataProduk.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Produk gak tersedia atau sudah nonaktif bre!'
        },
        { status: 400 }
      );
    }

    const produk = dataProduk[0];

    const provider = bersihinText(produk.provider || 'apigames').toLowerCase();
    const kodeProdukProvider = bersihinText(
      produk.kode_produk_provider || produk.kode_produk
    );

    if (!PROVIDER_VALID.includes(provider)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Provider produk gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (!kodeProdukProvider) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Kode produk provider belum disetting bre!'
        },
        { status: 400 }
      );
    }

    const hargaAsli = Number(produk.harga);
    const hargaModal = Number(produk.harga_modal || 0);

    if (!hargaAsli || hargaAsli <= 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Harga produk gak valid bre!'
        },
        { status: 400 }
      );
    }

    const butuhZoneId = Number(produk.zone_id) === 1;
    const butuhServer =
      produk.server_game && String(produk.server_game).trim() !== '';

    if ((butuhZoneId || butuhServer) && !zonePlayer) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: butuhServer
            ? 'Server wajib dipilih bre!'
            : 'Zone ID wajib diisi bre!'
        },
        { status: 400 }
      );
    }

    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

    if (!SERVER_KEY) {
      console.error('MIDTRANS_SERVER_KEY belum ada di env');

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Konfigurasi payment belum siap bre!'
        },
        { status: 500 }
      );
    }

    orderId = bikinOrderId();

    await db.query(
      `INSERT INTO transaksi
       (
         order_id,
         game_id,
         produk_id,
         kode_produk,
         provider,
         kode_produk_provider,
         id_player,
         zone_player,
         harga,
         harga_modal,
         payment_type,
         status_bayar,
         status_topup,
         customer_whatsapp,
<<<<<<< HEAD
         customer_email
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
=======
         customer_email,
         user_email
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
>>>>>>> d0c4f1a (update fitur riwayat transaksi)
      [
        orderId,
        produk.game_id,
        produk.id,
        produk.kode_produk,
        provider,
        kodeProdukProvider,
        idPlayer,
        zonePlayer,
        hargaAsli,
        hargaModal,
        metodeBayar,
        'pending',
        'pending',
        customerWhatsapp || null,
<<<<<<< HEAD
        customerEmail || null
=======
        customerEmail || null,
        userEmailLogin
>>>>>>> d0c4f1a (update fitur riwayat transaksi)
      ]
    );

    transaksiSudahDicatat = true;

    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');
    const midtransBaseUrl = getMidtransBaseUrl();
    const finishUrl = bikinFinishUrl(request, orderId);

    const payload = bikinPayloadMidtrans({
<<<<<<< HEAD
      metodeBayar,
      orderId,
      hargaAsli,
      idPlayer,
      customerEmail,
      customerWhatsapp,
      namaProduk: produk.nama_produk,
      finishUrl
    });
=======
  metodeBayar,
  orderId,
  hargaAsli,
  idPlayer,
  customerEmail: emailUntukPayment,
  customerWhatsapp,
  namaProduk: produk.nama_produk,
  finishUrl
});
>>>>>>> d0c4f1a (update fitur riwayat transaksi)

    const response = await fetch(`${midtransBaseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Midtrans gagal:', data);

      await updateTransaksiGagal(
        orderId,
        `Midtrans gagal bikin tagihan pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: data.status_message || 'Gagal bikin tagihan Midtrans',
          data_midtrans: data
        },
        { status: 400 }
      );
    }

    if (data.transaction_status === 'deny' || data.transaction_status === 'failure') {
      await updateTransaksiGagal(
        orderId,
        `Midtrans menolak transaksi pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: data.status_message || 'Transaksi ditolak Midtrans',
          data_midtrans: data
        },
        { status: 400 }
      );
    }

    const responseBayar = bikinResponsePembayaran({
      metodeBayar,
      orderId,
      hargaAsli,
      namaProduk: produk.nama_produk,
      dataMidtrans: data
    });

    if (!responsePunyaInstruksiBayar(responseBayar)) {
      await updateTransaksiGagal(
        orderId,
        `Instruksi bayar dari Midtrans tidak kebaca pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Instruksi pembayaran dari Midtrans gak kebaca bre!',
          data_midtrans: data
        },
        { status: 500 }
      );
    }

    return NextResponse.json(responseBayar);
  } catch (error) {
    console.error('Dapur beli kebakaran:', error);

    if (transaksiSudahDicatat && orderId) {
      await updateTransaksiGagal(
        orderId,
        `Error /api/beli pada ${new Date().toISOString()}: ${error.message || String(error)}`
      );
    }

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal bikin tagihan'
      },
      { status: 500 }
    );
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> d0c4f1a (update fitur riwayat transaksi)
