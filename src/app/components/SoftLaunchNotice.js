'use client';

import { useEffect, useState } from 'react';
import {
  FaCheckCircle,
  FaHeadset,
  FaReceipt,
  FaShieldAlt,
  FaTimes,
} from 'react-icons/fa';

export default function SoftLaunchNotice() {
  const [muncul, setMuncul] = useState(false);

  useEffect(() => {
    const sudahLihat = sessionStorage.getItem('naxashop_order_notice');

    if (!sudahLihat) {
      const timer = setTimeout(() => {
        setMuncul(true);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, []);

  const tutupNotice = () => {
    sessionStorage.setItem('naxashop_order_notice', 'true');
    setMuncul(false);
  };

  if (!muncul) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-blue-500/30 bg-slate-950 p-5 text-white shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
        
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />

        <button
          type="button"
          onClick={tutupNotice}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-sm text-slate-400 transition-all duration-200 hover:border-slate-600 hover:text-white active:scale-95"
          aria-label="Tutup informasi"
        >
          <FaTimes />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-xl text-blue-400 shadow-inner">
            <FaShieldAlt />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400">
            Pesan dari Tim NaXaShop
          </p>

          <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-white">
            Top-Up Aman & Terpantau
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Halo! Transaksi kamu dipantau langsung oleh tim kami. Mohon perhatikan beberapa poin penting berikut demi kelancaran pesanan kamu:
          </p>
        </div>

        <div className="relative z-10 mt-4 flex flex-col gap-2.5">
          
          <div className="flex gap-3 rounded-2xl border border-slate-900 bg-slate-900/40 p-3 transition-colors hover:border-slate-800">
            <FaCheckCircle className="mt-0.5 shrink-0 text-base text-emerald-400" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-200">Diproses Cepat & Otomatis</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Tim kami memastikan sistem berjalan lancar. Pesanan akan langsung masuk ke akun kamu segera setelah pembayaran diverifikasi.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-slate-900 bg-slate-900/40 p-3 transition-colors hover:border-slate-800">
            <FaReceipt className="mt-0.5 shrink-0 text-base text-blue-400" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-200">Simpan Order ID Kamu</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Catat Order ID setelah checkout ya. Ini bukti penting buat ngecek status pesanan kamu di halaman pelacakan.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-slate-900 bg-slate-900/40 p-3 transition-colors hover:border-slate-800">
            <FaHeadset className="mt-0.5 shrink-0 text-base text-indigo-400" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-200">Tim Support Selalu Hadir</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Kalau ada kendala atau nyangkut, jangan ragu hubungi CS kami. Kasih tau Order ID kamu biar tim kami bisa bantu dengan instan.
              </p>
            </div>
          </div>

        </div>

        <div className="relative z-10 mt-5">
          <button
            type="button"
            onClick={tutupNotice}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            Lanjutkan Ke Pesanan
          </button>
        </div>

      </div>
    </div>
  );
}