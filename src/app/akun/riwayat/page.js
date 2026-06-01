'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  FaReceipt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaGamepad,
  FaCopy,
  FaArrowLeft,
  FaSearch,
} from 'react-icons/fa';

export default function RiwayatTransaksiPage() {
  const { data: session, status } = useSession();

  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesanError, setPesanError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const formatRupiah = (angka) => {
    return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';

    return new Date(tanggal).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ambilRiwayat = async () => {
    setLoading(true);
    setPesanError('');

    try {
      const respon = await fetch('/api/akun/riwayat', {
        cache: 'no-store',
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        setPesanError(hasil.pesan || 'Gagal ambil riwayat transaksi.');
        setRiwayat([]);
        return;
      }

      setRiwayat(hasil.data || []);
    } catch (error) {
      setPesanError('Server lagi ngadat, coba refresh bentar lagi.');
      setRiwayat([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      ambilRiwayat();
    }

    if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const warnaStatusBayar = (statusBayar) => {
    if (statusBayar === 'sukses') {
      return 'border-green-500/20 bg-green-500/10 text-green-400';
    }

    if (statusBayar === 'pending') {
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    }

    if (statusBayar === 'gagal') {
      return 'border-red-500/20 bg-red-500/10 text-red-400';
    }

    return 'border-gray-700 bg-gray-800 text-gray-400';
  };

  const warnaStatusTopup = (statusTopup) => {
    if (statusTopup === 'sukses') {
      return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400';
    }

    if (statusTopup === 'proses') {
      return 'border-purple-500/20 bg-purple-500/10 text-purple-400';
    }

    if (statusTopup === 'pending') {
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    }

    if (statusTopup === 'gagal') {
      return 'border-red-500/20 bg-red-500/10 text-red-400';
    }

    return 'border-gray-700 bg-gray-800 text-gray-400';
  };

  const statusUtama = (trx) => {
    if (trx.status_topup === 'sukses') {
      return {
        icon: <FaCheckCircle />,
        title: 'Selesai',
        desc: 'Top up berhasil masuk.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
      };
    }

    if (trx.status_bayar === 'sukses' && trx.status_topup === 'proses') {
      return {
        icon: <FaClock />,
        title: 'Diproses',
        desc: 'Top up sedang diproses.',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      };
    }

    if (trx.status_bayar === 'sukses' && trx.status_topup === 'pending') {
      return {
        icon: <FaClock />,
        title: 'Antrean Top Up',
        desc: 'Pembayaran sukses, menunggu proses.',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
      };
    }

    if (trx.status_bayar === 'pending') {
      return {
        icon: <FaClock />,
        title: 'Menunggu Bayar',
        desc: 'Selesaikan pembayaran dulu.',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
      };
    }

    if (trx.status_bayar === 'gagal' || trx.status_topup === 'gagal') {
      return {
        icon: <FaTimesCircle />,
        title: 'Bermasalah',
        desc: 'Cek detail atau hubungi admin.',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
      };
    }

    return {
      icon: <FaReceipt />,
      title: 'Order',
      desc: 'Status transaksi tersedia.',
      color: 'text-gray-300',
      bg: 'bg-gray-800',
    };
  };

  const copyOrderId = async (orderId) => {
    await navigator.clipboard.writeText(orderId);
    setCopiedId(orderId);

    setTimeout(() => {
      setCopiedId('');
    }, 1200);
  };

  const keywordBersih = keyword.trim().toLowerCase();

  const riwayatFilter = riwayat.filter((trx) => {
    if (!keywordBersih) return true;

    const gabungan = [
      trx.order_id,
      trx.nama_game,
      trx.nama_produk,
      trx.kode_produk,
      trx.id_player,
      trx.zone_player,
      trx.status_bayar,
      trx.status_topup,
    ]
      .join(' ')
      .toLowerCase();

    return gabungan.includes(keywordBersih);
  });

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-400" />
          <p className="font-black text-gray-400">Ngambil riwayat transaksi...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <section className="w-full max-w-md rounded-[2rem] border border-gray-800 bg-gray-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl text-cyan-400">
            <FaReceipt />
          </div>

          <h1 className="text-2xl font-black">Login dulu bre</h1>

          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Riwayat transaksi cuma bisa dilihat kalau lu login. Biar order lu
            gak kecampur sama order orang lain.
          </p>

          <button
            onClick={() => signIn()}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-4 text-sm font-black text-white transition hover:from-cyan-500 hover:to-blue-500"
          >
            Login Sekarang
          </button>

          <Link
            href="/"
            className="mt-3 block text-xs font-bold text-gray-500 hover:text-cyan-400"
          >
            Balik ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black text-cyan-400 hover:text-cyan-300"
          >
            <FaArrowLeft />
            Balik ke Beranda
          </Link>
        </div>

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="relative p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-400">
                  Akun NaXaShop
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Riwayat Transaksi
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                  Semua order yang dibuat saat login bakal muncul di sini.
                  Akun: <span className="font-bold text-cyan-300">{session?.user?.email}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-slate-950 px-5 py-4">
                <p className="text-xs font-black uppercase text-gray-500">
                  Total Order
                </p>
                <p className="mt-1 text-3xl font-black text-cyan-400">
                  {riwayat.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari order ID, game, produk, ID player..."
              className="w-full rounded-2xl border border-gray-700 bg-slate-950 px-5 py-4 pr-12 text-sm text-white outline-none transition focus:border-cyan-500"
            />

            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              <FaSearch />
            </div>
          </div>
        </section>

        {pesanError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
            {pesanError}
          </div>
        )}

        {!pesanError && riwayat.length === 0 ? (
          <section className="rounded-[2rem] border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-2xl text-gray-400">
              <FaGamepad />
            </div>

            <h2 className="text-2xl font-black">Belum ada transaksi</h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
              Kalau lu checkout sambil login, nanti order-nya bakal nongol di sini.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-500"
            >
              Mulai Top Up
            </Link>
          </section>
        ) : riwayatFilter.length === 0 ? (
          <section className="rounded-[2rem] border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
            <h2 className="text-xl font-black">Order gak ketemu</h2>
            <p className="mt-2 text-sm text-gray-400">
              Coba kata kunci lain, bree.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {riwayatFilter.map((trx) => {
              const statusInfo = statusUtama(trx);
              const totalTampil = trx.harga_total || trx.harga;

              return (
                <article
                  key={trx.id}
                  className="overflow-hidden rounded-[1.7rem] border border-gray-800 bg-gray-900 shadow-xl transition hover:border-cyan-500/30"
                >
                  <div className={`border-b border-gray-800 p-4 ${statusInfo.bg}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl ${statusInfo.color}`}>
                          {statusInfo.icon}
                        </div>

                        <div className="min-w-0">
                          <h2 className={`font-black ${statusInfo.color}`}>
                            {statusInfo.title}
                          </h2>
                          <p className="text-xs text-gray-400">
                            {statusInfo.desc}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/lacak?order_id=${encodeURIComponent(trx.order_id)}&from=riwayat`}
                        className="rounded-2xl bg-cyan-600 px-4 py-3 text-center text-xs font-black text-white transition hover:bg-cyan-500"
                      >
                        Lihat Detail
                      </Link>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className={`rounded-xl border px-3 py-2 text-[11px] font-black ${warnaStatusBayar(trx.status_bayar)}`}>
                            Bayar: {trx.status_bayar}
                          </span>

                          <span className={`rounded-xl border px-3 py-2 text-[11px] font-black ${warnaStatusTopup(trx.status_topup)}`}>
                            Top-up: {trx.status_topup}
                          </span>

                          <span className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-black text-gray-400">
                            {trx.payment_type || '-'}
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-800 bg-slate-950">
                            {trx.gambar_game ? (
                              <img
                                src={trx.gambar_game}
                                alt={trx.nama_game || 'Game'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl">
                                🎮
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-black text-white">
                              {trx.nama_produk || trx.kode_produk || 'Produk Top Up'}
                            </p>

                            <p className="mt-1 text-sm text-gray-400">
                              {trx.nama_game || 'Game'}
                            </p>

                            <p className="mt-2 break-all font-mono text-xs font-black text-cyan-400">
                              {trx.order_id}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full rounded-2xl border border-gray-800 bg-slate-950 p-4 lg:w-[280px]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                              Total Bayar
                            </p>
                            <p className="mt-1 text-xl font-black text-green-400">
                              {formatRupiah(totalTampil)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyOrderId(trx.order_id)}
                            className="rounded-xl bg-gray-800 px-3 py-2 text-xs font-black text-gray-300 transition hover:bg-gray-700"
                          >
                            <FaCopy />
                          </button>
                        </div>

                        {copiedId === trx.order_id && (
                          <p className="mt-2 text-xs font-bold text-cyan-400">
                            Order ID dicopy!
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              ID Player
                            </p>
                            <p className="mt-1 break-all font-bold text-white">
                              {trx.id_player}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-black uppercase text-gray-500">
                              Server
                            </p>
                            <p className="mt-1 break-all font-bold text-white">
                              {trx.zone_player || '-'}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 border-t border-dashed border-gray-800 pt-3 text-[11px] font-bold text-gray-500">
                          {formatTanggal(trx.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}