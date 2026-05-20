'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CekOrderPage() {
  const searchParams = useSearchParams();
  const fromPage = searchParams.get('from');

const linkBalik =
  fromPage === 'payment'
    ? '/pembayaran'
    : '/';

const teksBalik =
  fromPage === 'payment'
    ? '← Balik ke Pembayaran'
    : '← Balik ke Beranda';
  const [orderId, setOrderId] = useState('');
  const [dataOrder, setDataOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pesanError, setPesanError] = useState('');

  const API_STATUS = '/api/pesanan';

  const formatRupiah = (angka) => {
    return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

  const statusUtama = (trx) => {
    if (!trx) return null;

    if (trx.status_bayar === 'pending') {
      return {
        icon: '⏳',
        title: 'Menunggu Pembayaran',
        desc: 'Belum kebaca lunas',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/20'
      };
    }

    if (trx.status_bayar === 'gagal') {
      return {
        icon: '❌',
        title: 'Pembayaran Gagal',
        desc: 'Order gagal / expired',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20'
      };
    }

    if (trx.status_bayar === 'sukses' && trx.status_topup === 'pending') {
      return {
        icon: '💰',
        title: 'Pembayaran Sukses',
        desc: 'Masuk antrean top-up',
        color: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/20'
      };
    }

    if (trx.status_topup === 'proses') {
      return {
        icon: '🚀',
        title: 'Top-up Diproses',
        desc: 'Sedang dikirim provider',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20'
      };
    }

    if (trx.status_topup === 'sukses') {
      return {
        icon: '✅',
        title: 'Top-up Berhasil',
        desc: 'Order selesai',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20'
      };
    }

    if (trx.status_topup === 'gagal') {
      return {
        icon: '⚠️',
        title: 'Top-up Bermasalah',
        desc: 'Hubungi admin',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20'
      };
    }

    return {
      icon: '🧾',
      title: 'Status Order',
      desc: 'Data ditemukan',
      color: 'text-gray-300',
      bg: 'bg-gray-800 border-gray-700'
    };
  };

  const badgeBayar = (status) => {
    if (status === 'sukses') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (status === 'gagal') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const badgeTopup = (status) => {
    if (status === 'sukses') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (status === 'proses') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (status === 'gagal') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const copyOrderId = async () => {
    if (!dataOrder?.order_id) return;

    await navigator.clipboard.writeText(dataOrder.order_id);
  };

 const cekOrder = async (idOrder) => {
  const idBersih = String(idOrder || '').trim();

  if (!idBersih) {
    setPesanError('Masukin Order ID dulu bre.');
    setDataOrder(null);
    return;
  }

  setLoading(true);
  setPesanError('');
  setDataOrder(null);

  try {
    const respon = await fetch(`${API_STATUS}?id=${encodeURIComponent(idBersih)}`, {
      cache: 'no-store'
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      setPesanError(hasil.pesan || 'Order gak ketemu bre.');
      return;
    }

    setDataOrder(hasil.data);
  } catch (error) {
    setPesanError('Server lagi ngadat bre, coba lagi bentar.');
  } finally {
    setLoading(false);
  }
};

const handleCekOrder = async (e) => {
  e.preventDefault();
  cekOrder(orderId);
};
  useEffect(() => {
  const idDariUrl =
    searchParams.get('order_id') ||
    searchParams.get('id');

  if (!idDariUrl) return;

  setOrderId(idDariUrl);
  cekOrder(idDariUrl);
}, [searchParams]);
  const status = statusUtama(dataOrder);
  const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

const linkChatAdmin = () => {
  if (!nomorAdmin || !dataOrder) return '#';

  const pesan = encodeURIComponent(
    `Halo admin NaXaShop, saya butuh bantuan.\n\nOrder ID: ${dataOrder.order_id}\nProduk: ${dataOrder.nama_produk || dataOrder.kode_produk}\nID Player: ${dataOrder.id_player}\nZone/Server: ${dataOrder.zone_player || '-'}\nStatus Bayar: ${dataOrder.status_bayar}\nStatus Top-up: ${dataOrder.status_topup}`
  );

  return `https://wa.me/${nomorAdmin}?text=${pesan}`;
};

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="mb-4">
          <Link href={linkBalik} className="text-xs text-cyan-400 hover:text-cyan-300 font-black">
            {teksBalik}
          </Link>
        </div>

        <section className="bg-gray-900 border border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[90px] rounded-full"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[90px] rounded-full"></div>

          <div className="relative z-10 p-5 sm:p-6">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-2xl mb-3">
                🧾
              </div>
              <h1 className="text-2xl font-black">
                Cek <span className="text-cyan-400">Order</span>
              </h1>
              <p className="text-gray-500 text-xs mt-1">
                Masukin resi transaksi lu.
              </p>
            </div>

            <form onSubmit={handleCekOrder} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="NX-xxxxxxxxxxxxx"
                className="flex-1 bg-slate-950 border border-gray-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 font-mono"
              />

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cek...' : 'Cek 🔍'}
              </button>
            </form>

            {pesanError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-3 text-xs font-bold">
                {pesanError}
              </div>
            )}

            {dataOrder && status && (
              <div className="mt-5 bg-slate-950 border border-gray-800 rounded-[1.5rem] overflow-hidden">
                {/* HEADER STRUK */}
                <div className={`p-4 border-b ${status.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{status.icon}</div>
                    <div className="min-w-0">
                      <h2 className={`text-lg font-black ${status.color}`}>
                        {status.title}
                      </h2>
                      <p className="text-xs text-gray-400">{status.desc}</p>
                    </div>
                  </div>
                </div>

                {/* BODY STRUK */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        Order ID
                      </p>
                      <p className="font-mono text-xs text-cyan-400 font-black break-all">
                        {dataOrder.order_id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyOrderId}
                      className="shrink-0 text-[10px] px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-black"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        Produk
                      </p>
                      <p className="font-bold text-white truncate">
                        {dataOrder.nama_produk || 'Produk Top Up'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        Total
                      </p>
                      <p className="font-black text-green-400">
                        {formatRupiah(dataOrder.harga)}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {dataOrder.payment_type || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        ID Player
                      </p>
                      <p className="font-bold text-white truncate">
                        {dataOrder.id_player}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                        Zone/Server
                      </p>
                      <p className="font-bold text-white truncate">
                        {dataOrder.zone_player || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-700 pt-3 flex flex-wrap gap-2">
                    <span className={`px-3 py-2 rounded-xl border text-[11px] font-black ${badgeBayar(dataOrder.status_bayar)}`}>
                      Bayar: {dataOrder.status_bayar}
                    </span>

                    <span className={`px-3 py-2 rounded-xl border text-[11px] font-black ${badgeTopup(dataOrder.status_topup)}`}>
                      Top-up: {dataOrder.status_topup}
                    </span>
                  </div>

                  {dataOrder.status_topup === 'gagal' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-2xl p-3 text-xs font-semibold">
                      Simpan Order ID ini lalu hubungi admin. Jangan bikin order baru dulu kalau pembayaran sudah sukses.
                    </div>
                  )}
                </div>
                  {nomorAdmin && dataOrder.status_topup !== 'sukses' && (
                  <a
                    href={linkChatAdmin()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-white text-sm font-black transition-all"
                  >
                    💬 Chat Admin
                  </a>
                )}
                {/* FOOTER STRUK */}
                <div className="bg-gray-900/80 px-4 py-3 border-t border-gray-800 flex items-center justify-between gap-3">
                  <p className="text-[10px] text-gray-500 font-bold">
                    NaXaShop Receipt
                  </p>
                  <p className="text-[10px] text-gray-600 font-mono">
                    Thank you 🎮
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}