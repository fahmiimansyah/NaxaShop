'use client';

import { useEffect, useState } from 'react';
import { FaBolt, FaReceipt, FaShieldAlt } from 'react-icons/fa';

function warnaStatus(tone) {
  if (tone === 'success') {
    return 'border-green-500/20 bg-green-500/10 text-green-300';
  }

  if (tone === 'pending') {
    return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  }

  return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
}

export default function RecentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let masihHidup = true;

    const ambilRecentOrders = async () => {
      try {
        const respon = await fetch('/api/recent-orders', {
          cache: 'no-store'
        });

        const hasil = await respon.json();

        if (!masihHidup) return;

        if (respon.ok && hasil.sukses) {
          setOrders(hasil.data || []);
        }
      } catch (error) {
        console.error('Gagal ambil recent orders:', error);
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
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FaReceipt />
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-400">
                Aktivitas Terbaru
              </p>

              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                Pesanan terbaru di NaXaShop
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                Beberapa transaksi terbaru yang masuk ke sistem. Data customer
                tetap disamarkan biar aman.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-3">
                <FaShieldAlt className="mx-auto mb-2 text-blue-400" />
                <p className="text-[10px] font-black text-gray-400">
                  Aman
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-3">
                <FaBolt className="mx-auto mb-2 text-yellow-400" />
                <p className="text-[10px] font-black text-gray-400">
                  Sat-set
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-3">
                <FaReceipt className="mx-auto mb-2 text-green-400" />
                <p className="text-[10px] font-black text-gray-400">
                  Terlacak
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-3xl border border-gray-800 bg-slate-950/60"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-gray-800 bg-slate-950/60 p-5 text-center">
                <p className="text-3xl">🧾</p>
                <h3 className="mt-3 text-sm font-black text-white">
                  Belum ada pesanan terbaru
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Nanti kalau order mulai masuk, aktivitasnya bakal tampil di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {orders.map((order, index) => (
                  <div
                    key={`${order.order_hint}-${index}`}
                    className="group rounded-3xl border border-gray-800 bg-slate-950/60 p-4 transition-all hover:-translate-y-1 hover:border-blue-500/40"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black ${warnaStatus(
                          order.status_tone
                        )}`}
                      >
                        {order.icon} {order.status_label}
                      </span>

                      <span className="text-[10px] font-bold text-gray-600">
                        #{order.order_hint}
                      </span>
                    </div>

                    <h3 className="line-clamp-1 text-sm font-black text-white">
                      {order.nama_game}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {order.nama_produk}
                    </p>

                    <div className="mt-4 h-px w-full bg-gradient-to-r from-blue-500/40 via-gray-800 to-transparent" />

                    <p className="mt-3 text-[10px] font-bold text-gray-600">
                      Data customer disamarkan
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}