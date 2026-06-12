'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FaBolt,
  FaCheckCircle,
  FaGamepad,
  FaHistory,
  FaReceipt,
  FaShieldAlt,
} from 'react-icons/fa';

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
}

function formatTanggal(tanggal) {
  if (!tanggal) return '-';

  return new Date(tanggal).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TrustItem({ icon: Icon, label, className = 'text-blue-400' }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-3 text-center">
      <Icon className={`mx-auto mb-2 ${className}`} />
      <p className="text-[10px] font-black text-gray-400">{label}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-3xl border border-gray-800 bg-slate-950/60"
        />
      ))}
    </div>
  );
}

export default function RecentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perluLogin, setPerluLogin] = useState(false);

  useEffect(() => {
    let masihHidup = true;

    const ambilRecentOrders = async () => {
      try {
        const respon = await fetch('/api/recent-orders', {
          cache: 'no-store',
        });

        const hasil = await respon.json();

        if (!masihHidup) return;

        if (respon.status === 401) {
          setPerluLogin(true);
          setOrders([]);
          return;
        }

        if (respon.ok && hasil.sukses) {
          setPerluLogin(false);
          setOrders(hasil.data || []);
          return;
        }

        setOrders([]);
      } catch (error) {
        console.error('Gagal ambil recent orders:', error);

        if (masihHidup) {
          setOrders([]);
        }
      } finally {
        if (masihHidup) {
          setLoading(false);
        }
      }
    };

    ambilRecentOrders();

    return () => {
      masihHidup = false;
    };
  }, []);

  return (
    <section className="mx-auto mt-10 max-w-7xl px-0">
      <div className="relative overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900/80 p-5 shadow-2xl shadow-black/25 sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[90px]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FaReceipt />
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-400">
                Aktivitas Kamu
              </p>

              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                Pesanan selesai terbaru
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                Preview transaksi yang sudah selesai dari akun kamu.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:items-end">
              <div className="grid grid-cols-3 gap-2 text-center">
                <TrustItem icon={FaShieldAlt} label="Aman" />
                <TrustItem
                  icon={FaBolt}
                  label="Sat-set"
                  className="text-yellow-400"
                />
                <TrustItem
                  icon={FaHistory}
                  label="Terlacak"
                  className="text-green-400"
                />
              </div>

            </div>
          </div>

          <div className="mt-5">
            {loading ? (
              <LoadingSkeleton />
            ) : perluLogin ? (
              <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-xl text-blue-300">
                      <FaReceipt />
                    </div>

                    <h3 className="mt-3 text-base font-black text-white">
                      Masuk untuk melihat pesanan kamu
                    </h3>

                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-blue-100/70">
                      Pesanan terbaru hanya ditampilkan untuk akun terkait,
                      supaya data transaksi tetap aman dan rapi.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href="/login"
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-blue-500"
                    >
                      Login Sekarang
                    </Link>

                    <Link
                      href="/lacak"
                      className="rounded-2xl border border-blue-400/30 bg-slate-950/40 px-5 py-3 text-center text-sm font-black text-blue-200 transition hover:border-blue-300/60 hover:text-white"
                    >
                      Lacak Order
                    </Link>
                  </div>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-gray-800 bg-slate-950/60 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-2xl text-gray-400">
                  <FaGamepad />
                </div>

                <h3 className="mt-4 text-base font-black text-white">
                  Belum ada pesanan selesai
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  Transaksi yang sudah selesai akan tampil sebagai preview di
                  sini. Untuk melihat semua status, buka halaman riwayat.
                </p>

                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Link
                    href="/"
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
                  >
                    Mulai Top Up
                  </Link>

                  <Link
                    href="/akun/riwayat"
                    className="rounded-2xl border border-gray-700 bg-gray-800 px-5 py-3 text-sm font-black text-gray-300 transition hover:border-blue-500/40 hover:text-white"
                  >
                    Buka Riwayat
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id || order.order_id}
                      href="/akun/riwayat"
                      className="group overflow-hidden rounded-3xl border border-gray-800 bg-slate-950/60 transition-all hover:-translate-y-1 hover:border-blue-500/40"
                    >
                      <div className="border-b border-gray-800 bg-gray-900/55 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black text-green-300">
                            <FaCheckCircle className="text-[10px]" />
                            Selesai
                          </span>

                          <span className="text-[10px] font-bold text-gray-600">
                            #{order.order_hint}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-gray-800 bg-slate-950">
                            {order.gambar_game ? (
                              <img
                                src={order.gambar_game}
                                alt={order.nama_game || 'Game'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg text-gray-500">
                                <FaGamepad />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="line-clamp-1 text-sm font-black text-white">
                              {order.nama_produk}
                            </h3>

                            <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                              {order.nama_game}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-600">
                              Total
                            </p>
                            <p className="mt-1 font-black text-green-400">
                              {formatRupiah(order.harga_total)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-gray-600">
                              Metode
                            </p>
                            <p className="mt-1 truncate font-bold text-gray-300">
                              {order.payment_type || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 h-px w-full bg-gradient-to-r from-blue-500/40 via-gray-800 to-transparent" />

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold text-gray-600">
                            {formatTanggal(order.created_at)}
                          </p>

                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/akun/riwayat"
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    <FaHistory className="text-xs" />
                    Lihat Semua Riwayat
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}