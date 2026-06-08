'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

function warnaMode(mode) {
  if (mode === 'full') return 'border-red-500/25 bg-red-500/10 text-red-100';
  if (mode === 'checkout') return 'border-amber-500/25 bg-amber-500/10 text-amber-100';
  return 'border-sky-500/25 bg-sky-500/10 text-sky-100';
}

export default function MaintenanceBanner() {
  const pathname = usePathname();
  const [setting, setSetting] = useState(null);

  const halamanAman =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  useEffect(() => {
    let hidup = true;

    async function ambilMaintenance() {
      try {
        const respon = await fetch('/api/maintenance', { cache: 'no-store' });
        const hasil = await respon.json();

        if (!hidup) return;

        if (respon.ok && hasil.sukses) {
          setSetting(hasil.data || null);
        }
      } catch (error) {
        console.error('Gagal ambil status maintenance:', error);
      }
    }

    ambilMaintenance();

    return () => {
      hidup = false;
    };
  }, []);

  if (!setting?.enabled || halamanAman) return null;

  if (setting.full_maintenance) {
    return (
      <div className="fixed inset-0 z-[998] flex items-center justify-center bg-slate-950/95 px-4 backdrop-blur-xl">
        <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-red-500/20 bg-slate-900 p-6 text-center shadow-2xl shadow-red-950/30 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-500/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-blue-500/10 blur-[90px]" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-red-400/20 bg-red-500/10 text-3xl">
              🛠️
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-red-300/80">
              {setting.badge || 'Maintenance'}
            </p>

            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              {setting.title || 'NaXaShop sedang maintenance'}
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              {setting.message || 'Sistem sedang dirapikan sebentar biar transaksi tetap aman.'}
            </p>

            {setting.estimated_until && (
              <div className="mx-auto mt-5 w-fit rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-slate-200">
                Estimasi normal: {setting.estimated_until}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/lacak"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
              >
                Cek Pesanan
              </Link>
              <Link
                href="/support"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Bantuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-[80] border-b border-white/10 bg-slate-950/92 px-3 py-3 backdrop-blur-xl">
      <div className={`mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-black/20 md:flex-row md:items-center md:justify-between ${warnaMode(setting.mode)}`}>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
            {setting.block_checkout ? '🛠️' : '📢'}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                {setting.badge || 'Info'}
              </span>
              {setting.estimated_until && (
                <span className="text-[11px] font-bold opacity-80">
                  Estimasi: {setting.estimated_until}
                </span>
              )}
            </div>
            <h3 className="mt-1 text-sm font-black text-white">
              {setting.title || 'Info NaXaShop'}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed opacity-85">
              {setting.message || 'Ada info terbaru dari NaXaShop.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href="/lacak"
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
          >
            Cek Pesanan
          </Link>
          <Link
            href="/support"
            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-200"
          >
            Bantuan
          </Link>
        </div>
      </div>
    </div>
  );
}
