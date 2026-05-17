'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function HalamanLogin() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [lihatPassword, setLihatPassword] = useState(false);

  const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const respon = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (respon?.error) {
        Swal.fire({
          title: 'WADUH! ❌',
          text: respon.error,
          icon: 'error',
          background: '#1f2937',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        });

        return;
      }

      Swal.fire({
        title: 'GILA BRE! 🔥',
        text: 'Sukses Login ke NaXaShop!',
        icon: 'success',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#06b6d4',
      }).then(() => {
        if (email.trim().toLowerCase() === EMAIL_CEO) {
          window.location.href = '/admin'
        } else {
          window.location.href = '/'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'SERVER NGADAT! 💥',
        text: 'Gagal login bre, coba lagi.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);

    await signIn('google', {
      callbackUrl: '/',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]"></div>

      <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            Selamat <span className="text-cyan-500">Datang</span>
          </h1>
          <p className="text-gray-400">
            Masuk ke NaXaShop buat mulai top-up 🎮
          </p>
        </div>

        {/* LOGIN MANUAL */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-gray-700 transition-all"
              placeholder="email@lu.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={lihatPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 text-white px-5 py-4 pr-14 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-gray-700 transition-all"
                placeholder="Masukin password lu..."
              />

              <button
                type="button"
                onClick={() => setLihatPassword(!lihatPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition text-xl"
                aria-label={lihatPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {lihatPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg mt-4 transition-all duration-300 ${
              loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:-translate-y-1'
            }`}
          >
            {loading ? 'Lagi Ngecek...' : 'Gas Masuk 🚀'}
          </button>
        </form>

        {/* PEMBATAS */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-gray-700 flex-1"></div>
          <span className="text-gray-500 text-xs font-bold uppercase">
            atau
          </span>
          <div className="h-px bg-gray-700 flex-1"></div>
        </div>

        {/* LOGIN GOOGLE DI BAWAH */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
          className="w-full py-4 rounded-2xl font-black text-base bg-white text-gray-900 hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-black text-blue-600">
            G
          </span>
          {loadingGoogle ? 'Ngebuka Google...' : 'Masuk dengan Google'}
        </button>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="text-cyan-400 hover:text-cyan-300 font-bold"
          >
            Daftar Sini
          </Link>
        </p>
      </div>
    </div>
  );
}