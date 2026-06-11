'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Swal from 'sweetalert2';
import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

async function ambilJsonAman(respon) {
  const text = await respon.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Response register bukan JSON:', text);
    return null;
  }
}

export default function HalamanRegister() {
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [lihatPassword, setLihatPassword] = useState(false);

  const handleDaftar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const respon = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password }),
      });

      const data = await ambilJsonAman(respon);
      const pesan = data?.pesan || 'Pendaftaran belum bisa diproses.';

      if (respon.ok && data?.sukses) {
        await Swal.fire({
          title: 'Akun berhasil dibuat',
          text: data.emailWarning
            ? 'Akun kamu sudah dibuat, tapi email notifikasi belum berhasil dikirim.'
            : 'Akun kamu sudah siap digunakan. Silakan masuk untuk melanjutkan.',
          icon: data.emailWarning ? 'warning' : 'success',
          background: '#0f172a',
          color: '#fff',
          confirmButtonColor: '#2563eb',
        });

        setNama('');
        setEmail('');
        setPassword('');

        router.push('/login');
        return;
      }

      Swal.fire({
        title: 'Pendaftaran belum berhasil',
        text: pesan,
        icon: 'error',
        background: '#0f172a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    } catch (error) {
      console.error('Register frontend error:', error);

      Swal.fire({
        title: 'Sistem belum merespons',
        text: 'Pendaftaran belum bisa diproses. Coba lagi sebentar lagi.',
        icon: 'error',
        background: '#0f172a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoadingGoogle(true);

      await signIn('google', {
        callbackUrl: '/',
      });
    } catch (error) {
      console.error('Google register error:', error);
      setLoadingGoogle(false);

      Swal.fire({
        title: 'Google belum terhubung',
        text: 'Coba daftar dengan Google beberapa saat lagi.',
        icon: 'error',
        background: '#0f172a',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111f] px-4 py-10">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-blue-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_42%)]" />

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-blue-500/15 bg-slate-950/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl text-blue-400">
              <FaUser />
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-400">
              NaXaShop Account
            </p>

            <h1 className="mt-2 text-3xl font-black text-white">
              Buat Akun Baru
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Daftar untuk menyimpan riwayat pesanan dan memantau transaksi
              dengan lebih mudah.
            </p>
          </div>

          <form onSubmit={handleDaftar} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-400">
                Nama Panggilan
              </label>

              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />

                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 pl-11 text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nama panggilan kamu"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-400">
                Email Aktif
              </label>

              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 pl-11 text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="emailkamu@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-400">
                Password
              </label>

              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />

                <input
                  type={lihatPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 pl-11 pr-14 text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Minimal 8 karakter"
                />

                <button
                  type="button"
                  onClick={() => setLihatPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-white"
                  aria-label={
                    lihatPassword ? 'Sembunyikan password' : 'Lihat password'
                  }
                >
                  {lihatPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl py-4 text-base font-black transition-all duration-300 ${
                loading
                  ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                  : 'bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:bg-blue-500'
              }`}
            >
              {loading ? 'Membuat akun...' : 'Daftar'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
              atau
            </span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loadingGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-base font-black text-white transition hover:border-blue-500/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FcGoogle className="text-xl" />
            {loadingGoogle
              ? 'Menghubungkan ke Google...'
              : 'Daftar dengan Google'}
          </button>

          <p className="mt-6 text-center text-sm text-slate-400">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="font-black text-blue-400 transition hover:text-blue-300"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}