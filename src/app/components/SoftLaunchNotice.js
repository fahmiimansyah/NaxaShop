'use client';

import { useEffect, useState } from 'react';
import { FaRocket, FaTimes, FaBug, FaCheckCircle } from 'react-icons/fa';

export default function SoftLaunchNotice() {
  const [muncul, setMuncul] = useState(false);

  useEffect(() => {
    const sudahLihat = sessionStorage.getItem('naxashop_soft_launch_notice');

    if (!sudahLihat) {
      const timer = setTimeout(() => {
        setMuncul(true);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, []);

  const tutupNotice = () => {
    sessionStorage.setItem('naxashop_soft_launch_notice', 'true');
    setMuncul(false);
  };

  if (!muncul) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/45 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="relative w-full max-w-[390px] overflow-hidden rounded-[1.7rem] border border-cyan-400/20 bg-slate-950 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

        <button
          type="button"
          onClick={tutupNotice}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-400 transition hover:border-cyan-400/40 hover:text-white"
          aria-label="Tutup notifikasi"
        >
          <FaTimes />
        </button>

        <div className="relative z-10 p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xl text-cyan-300">
            <FaRocket />
          </div>

          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
            NaXaShop Update
          </p>

          <h2 className="text-xl font-black leading-tight text-white">
            NaXaShop Soft Launch 🚀
          </h2>

          <blockquote className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-xs font-bold italic leading-relaxed text-cyan-100">
            “Setiap sistem besar selalu dimulai dari versi pertama yang terus disempurnakan.”
          </blockquote>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            NaXaShop sedang berada dalam tahap soft launch. Beberapa sistem
            mungkin masih belum sepenuhnya sempurna, namun layanan utama seperti
            pencatatan Order ID dan lacak transaksi tetap berjalan.
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <FaCheckCircle className="mt-0.5 shrink-0 text-sm text-emerald-300" />
              <p className="text-xs leading-relaxed text-emerald-100/80">
                Setiap order tetap tercatat dan bisa dipantau melalui halaman
                lacak transaksi.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3">
              <FaBug className="mt-0.5 shrink-0 text-sm text-yellow-300" />
              <p className="text-xs leading-relaxed text-yellow-100/80">
                Jika menemukan kendala, bug, atau tampilan yang terasa kurang
                sesuai, segera hubungi admin agar dapat kami cek dan perbaiki.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={tutupNotice}
            className="mt-5 w-full rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
          >
            Mantap Min!! lanjutkan...
          </button>

          <p className="mt-3 text-center text-[10px] font-bold text-slate-500">
            Terima kasih sudah menjadi bagian dari perjalanan awal NaXaShop.
          </p>
        </div>
      </div>
    </div>
  );
}