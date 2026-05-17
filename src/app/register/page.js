'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Swal from 'sweetalert2';

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

      const data = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: 'MANTAP BRE! 🎉',
          text: data.pesan || 'Akun berhasil dibikin!',
          icon: 'success',
          background: '#1f2937',
          color: '#fff',
          confirmButtonColor: '#06b6d4',
        }).then(() => {
          router.push('/login');
        });

        setNama('');
        setEmail('');
        setPassword('');
      } else {
        Swal.fire({
          title: 'YAHHH GAGAL ❌',
          text: data.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'SERVER NGADAT! 💥',
        text: 'Waduh, gagal nyambung ke server bre!',
        icon: 'error',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoadingGoogle(true);

    await signIn('google', {
      callbackUrl: '/',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>

      <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            Bikin Akun <span className="text-blue-500">Baru</span>
          </h1>
          <p className="text-gray-400">
            Join jadi member NaXaShop sekarang 🔥
          </p>
        </div>

        {/* REGISTER MANUAL */}
        <form onSubmit={handleDaftar} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Nama Panggilan
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
              placeholder="Vibe Coder"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Email Aktif
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 text-white px-5 py-4 pr-14 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
                placeholder="Bikin password yang kuat bre..."
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
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1'
            }`}
          >
            {loading ? 'Daftarin OTW...' : 'Daftar Sekarang 🚀'}
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

        {/* REGISTER GOOGLE DI BAWAH */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={loadingGoogle}
          className="w-full py-4 rounded-2xl font-black text-base bg-white text-gray-900 hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-black text-blue-600">
            G
          </span>
          {loadingGoogle ? 'Ngebuka Google...' : 'Daftar dengan Google'}
        </button>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Udah punya akun?{' '}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-bold"
          >
            Gas Login
          </Link>
        </p>
      </div>
    </div>
  );
}