'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaExclamationTriangle,
  FaGamepad,
  FaHistory,
  FaReceipt,
  FaSearch,
  FaTimesCircle,
} from 'react-icons/fa';

const FILTERS = [
  {
    key: 'sukses',
    label: 'Selesai',
  },
  {
    key: 'semua',
    label: 'Semua',
  },
  {
    key: 'menunggu',
    label: 'Menunggu',
  },
  {
    key: 'proses',
    label: 'Diproses',
  },
  {
    key: 'bantuan',
    label: 'Butuh Bantuan',
  },
];

function normalizeStatus(value = '') {
  const status = String(value || '').trim().toLowerCase();

  if (
    ['sukses', 'success', 'settlement', 'capture', 'paid', 'berhasil'].includes(
      status
    )
  ) {
    return 'sukses';
  }

  if (['pending', 'menunggu', 'unpaid', 'waiting'].includes(status)) {
    return 'pending';
  }

  if (['proses', 'process', 'processing'].includes(status)) {
    return 'proses';
  }

  if (
    [
      'gagal',
      'failed',
      'failure',
      'deny',
      'denied',
      'cancel',
      'cancelled',
      'expire',
      'expired',
    ].includes(status)
  ) {
    return 'gagal';
  }

  return status || 'pending';
}

function kategoriTransaksi(trx) {
  const bayar = normalizeStatus(trx.status_bayar);
  const topup = normalizeStatus(trx.status_topup);

  if (bayar === 'sukses' && topup === 'sukses') {
    return 'sukses';
  }

  if (bayar === 'pending') {
    return 'menunggu';
  }

  if (bayar === 'sukses' && ['pending', 'proses'].includes(topup)) {
    return 'proses';
  }

  if (bayar === 'gagal' || topup === 'gagal') {
    return 'bantuan';
  }

  return 'proses';
}

function statusUtama(trx) {
  const bayar = normalizeStatus(trx.status_bayar);
  const topup = normalizeStatus(trx.status_topup);

  if (bayar === 'sukses' && topup === 'sukses') {
    return {
      Icon: FaCheckCircle,
      title: 'Selesai',
      desc: 'Top-up berhasil diproses.',
      color: 'text-green-300',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      badge: 'border-green-500/20 bg-green-500/10 text-green-300',
    };
  }

  if (bayar === 'sukses' && ['pending', 'proses'].includes(topup)) {
    return {
      Icon: FaClock,
      title: 'Diproses',
      desc: 'Pembayaran berhasil. Top-up sedang diproses.',
      color: 'text-blue-300',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      badge: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    };
  }

  if (bayar === 'pending') {
    return {
      Icon: FaClock,
      title: 'Menunggu Bayar',
      desc: 'Pembayaran belum selesai.',
      color: 'text-yellow-300',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      badge: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
    };
  }

  if (bayar === 'gagal') {
    return {
      Icon: FaTimesCircle,
      title: 'Pembayaran Tidak Berhasil',
      desc: 'Pembayaran gagal, batal, atau melewati batas waktu.',
      color: 'text-red-300',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      badge: 'border-red-500/20 bg-red-500/10 text-red-300',
    };
  }

  if (topup === 'gagal') {
    return {
      Icon: FaExclamationTriangle,
      title: 'Perlu Dicek',
      desc: 'Pembayaran berhasil, tapi top-up perlu pengecekan.',
      color: 'text-orange-300',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      badge: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
    };
  }

  return {
    Icon: FaReceipt,
    title: 'Transaksi',
    desc: 'Status transaksi tersedia.',
    color: 'text-gray-300',
    bg: 'bg-gray-800',
    border: 'border-gray-700',
    badge: 'border-gray-700 bg-gray-800 text-gray-300',
  };
}

function warnaStatusBayar(statusBayar) {
  const status = normalizeStatus(statusBayar);

  if (status === 'sukses') {
    return 'border-green-500/20 bg-green-500/10 text-green-300';
  }

  if (status === 'pending') {
    return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  }

  if (status === 'gagal') {
    return 'border-red-500/20 bg-red-500/10 text-red-300';
  }

  return 'border-gray-700 bg-gray-800 text-gray-400';
}

function warnaStatusTopup(statusTopup) {
  const status = normalizeStatus(statusTopup);

  if (status === 'sukses') {
    return 'border-green-500/20 bg-green-500/10 text-green-300';
  }

  if (status === 'proses') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
  }

  if (status === 'pending') {
    return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  }

  if (status === 'gagal') {
    return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
  }

  return 'border-gray-700 bg-gray-800 text-gray-400';
}

function labelStatus(value) {
  const status = normalizeStatus(value);

  if (status === 'sukses') return 'Sukses';
  if (status === 'pending') return 'Pending';
  if (status === 'proses') return 'Proses';
  if (status === 'gagal') return 'Gagal';

  return status || '-';
}

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
}

function formatTanggal(tanggal) {
  if (!tanggal) return '-';

  return new Date(tanggal).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-400" />
        <p className="font-black text-gray-400">
          Mengambil riwayat transaksi...
        </p>
      </div>
    </main>
  );
}

function EmptyState({ filterAktif, keyword }) {
  const sedangCari = Boolean(keyword.trim());

  return (
    <section className="rounded-[2rem] border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-2xl text-gray-400">
        <FaGamepad />
      </div>

      <h2 className="text-2xl font-black">
        {sedangCari
          ? 'Transaksi tidak ditemukan'
          : filterAktif === 'sukses'
            ? 'Belum ada transaksi selesai'
            : 'Belum ada transaksi'}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
        {sedangCari
          ? 'Coba pakai kata kunci lain, seperti Order ID, nama game, atau ID player.'
          : filterAktif === 'sukses'
            ? 'Transaksi yang sudah selesai akan tampil di sini. Kamu tetap bisa cek tab Semua untuk melihat order lain.'
            : 'Kalau kamu checkout sambil login, transaksi akan tersimpan di halaman ini.'}
      </p>

      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Link
          href="/"
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
        >
          Mulai Top Up
        </Link>

        {filterAktif !== 'semua' && (
          <a
            href="#filter-riwayat"
            className="rounded-2xl border border-gray-700 bg-gray-800 px-5 py-3 text-sm font-black text-gray-300 transition hover:border-blue-500/40 hover:text-white"
          >
            Lihat Filter Lain
          </a>
        )}
      </div>
    </section>
  );
}

export default function RiwayatTransaksiPage() {
  const { data: session, status } = useSession();

  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesanError, setPesanError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [filterAktif, setFilterAktif] = useState('sukses');

  const ambilRiwayat = async () => {
    setLoading(true);
    setPesanError('');

    try {
      const respon = await fetch('/api/akun/riwayat', {
        cache: 'no-store',
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        setPesanError(hasil.pesan || 'Gagal mengambil riwayat transaksi.');
        setRiwayat([]);
        return;
      }

      setRiwayat(hasil.data || []);
    } catch (error) {
      console.error('Gagal ambil riwayat:', error);
      setPesanError('Server belum merespons. Coba refresh sebentar lagi.');
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

  const jumlahFilter = useMemo(() => {
    const base = {
      semua: riwayat.length,
      menunggu: 0,
      proses: 0,
      sukses: 0,
      bantuan: 0,
    };

    riwayat.forEach((trx) => {
      const kategori = kategoriTransaksi(trx);

      if (base[kategori] !== undefined) {
        base[kategori] += 1;
      }
    });

    return base;
  }, [riwayat]);

  const totalSukses = useMemo(() => {
    return riwayat
      .filter((trx) => kategoriTransaksi(trx) === 'sukses')
      .reduce((total, trx) => {
        return total + Number(trx.harga_total || trx.harga || 0);
      }, 0);
  }, [riwayat]);

  const keywordBersih = keyword.trim().toLowerCase();

  const riwayatFilter = useMemo(() => {
    return riwayat.filter((trx) => {
      const kategori = kategoriTransaksi(trx);
      const cocokFilter = filterAktif === 'semua' || kategori === filterAktif;

      if (!cocokFilter) return false;

      if (!keywordBersih) return true;

      const gabungan = [
        trx.order_id,
        trx.nama_game,
        trx.nama_produk,
        trx.kode_produk,
        trx.id_player,
        trx.zone_player,
        trx.payment_type,
        trx.status_bayar,
        trx.status_topup,
      ]
        .join(' ')
        .toLowerCase();

      return gabungan.includes(keywordBersih);
    });
  }, [riwayat, filterAktif, keywordBersih]);

  const copyOrderId = async (orderId) => {
    await navigator.clipboard.writeText(orderId || '');
    setCopiedId(orderId);

    setTimeout(() => {
      setCopiedId('');
    }, 1200);
  };

  if (status === 'loading' || loading) {
    return <LoadingState />;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-gray-800 bg-gray-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl text-blue-400">
            <FaReceipt />
          </div>

          <h1 className="text-2xl font-black">Masuk untuk melihat riwayat</h1>

          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Riwayat transaksi hanya ditampilkan untuk akun terkait, supaya
            pesanan kamu tetap rapi dan tidak tercampur dengan akun lain.
          </p>

          <button
            type="button"
            onClick={() => signIn(undefined, { callbackUrl: '/akun/riwayat' })}
            className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Login Sekarang
          </button>

          <Link
            href="/lacak"
            className="mt-3 block text-xs font-bold text-gray-500 hover:text-blue-400"
          >
            Mau cek tanpa login? Lacak Order
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
            className="inline-flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300"
          >
            <FaArrowLeft />
            Kembali ke Beranda
          </Link>
        </div>

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="relative p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[90px]" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                  Akun NaXaShop
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Riwayat Transaksi
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                  Default halaman ini menampilkan transaksi yang selesai. Kamu
                  tetap bisa melihat semua status lewat filter di bawah.
                </p>

                <p className="mt-2 text-xs font-bold text-blue-100/45">
                  Akun:{' '}
                  <span className="text-blue-300">
                    {session?.user?.email}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-800 bg-slate-950 px-5 py-4">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Semua
                  </p>
                  <p className="mt-1 text-3xl font-black text-blue-400">
                    {riwayat.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-slate-950 px-5 py-4">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Selesai
                  </p>
                  <p className="mt-1 text-3xl font-black text-green-400">
                    {jumlahFilter.sukses}
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-gray-800 bg-slate-950 px-5 py-4 sm:col-span-1">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Total Selesai
                  </p>
                  <p className="mt-1 text-xl font-black text-green-400">
                    {formatRupiah(totalSukses)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="filter-riwayat"
          className="mb-6 rounded-3xl border border-gray-800 bg-gray-900 p-4 shadow-xl"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari Order ID, game, produk, ID player..."
                className="w-full rounded-2xl border border-gray-700 bg-slate-950 px-5 py-4 pr-12 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500"
              />

              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                <FaSearch />
              </div>
            </div>

            <button
              type="button"
              onClick={ambilRiwayat}
              className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm font-black text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const aktif = filterAktif === filter.key;
              const total = jumlahFilter[filter.key] || 0;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setFilterAktif(filter.key)}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black transition ${
                    aktif
                      ? 'border-blue-400/50 bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                      : 'border-gray-800 bg-slate-950 text-gray-400 hover:border-blue-500/30 hover:text-white'
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                      aktif
                        ? 'bg-white/15 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {total}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {pesanError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {pesanError}
          </div>
        )}

        {!pesanError && riwayatFilter.length === 0 ? (
          <EmptyState filterAktif={filterAktif} keyword={keyword} />
        ) : (
          <section className="space-y-4">
            {riwayatFilter.map((trx) => {
              const statusInfo = statusUtama(trx);
              const StatusIcon = statusInfo.Icon;
              const totalTampil = trx.harga_total || trx.harga;
              const bayarNormal = normalizeStatus(trx.status_bayar);
              const topupNormal = normalizeStatus(trx.status_topup);

              return (
                <article
                  key={trx.id}
                  className="overflow-hidden rounded-[1.7rem] border border-gray-800 bg-gray-900 shadow-xl transition hover:border-blue-500/30"
                >
                  <div
                    className={`border-b p-4 ${statusInfo.border} ${statusInfo.bg}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl ${statusInfo.color}`}
                        >
                          <StatusIcon />
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
                        href={`/lacak?order_id=${encodeURIComponent(
                          trx.order_id
                        )}&from=riwayat`}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-xs font-black text-white transition hover:bg-blue-500"
                      >
                        Lihat Detail
                      </Link>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-xl border px-3 py-2 text-[11px] font-black ${warnaStatusBayar(
                              bayarNormal
                            )}`}
                          >
                            Bayar: {labelStatus(bayarNormal)}
                          </span>

                          <span
                            className={`rounded-xl border px-3 py-2 text-[11px] font-black ${warnaStatusTopup(
                              topupNormal
                            )}`}
                          >
                            Top-up: {labelStatus(topupNormal)}
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
                              <div className="flex h-full w-full items-center justify-center text-2xl text-gray-500">
                                <FaGamepad />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-2 font-black text-white">
                              {trx.nama_produk ||
                                trx.kode_produk ||
                                'Produk Top Up'}
                            </p>

                            <p className="mt-1 text-sm text-gray-400">
                              {trx.nama_game || 'Game'}
                            </p>

                            <p className="mt-2 break-all font-mono text-xs font-black text-blue-400">
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
                            aria-label="Salin Order ID"
                          >
                            <FaCopy />
                          </button>
                        </div>

                        {copiedId === trx.order_id && (
                          <p className="mt-2 text-xs font-bold text-blue-400">
                            Order ID tersalin.
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-black uppercase text-gray-500">
                              ID Player
                            </p>
                            <p className="mt-1 break-all font-bold text-white">
                              {trx.id_player || '-'}
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