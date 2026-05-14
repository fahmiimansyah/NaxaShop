'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react'; // Jurus manggil Satpam
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function HalamanLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Manggil Satpam NextAuth
    const respon = await signIn('credentials', {
      redirect: false, // Jangan pindah halaman dulu biar kita bisa ngecek error
      email,
      password,
    });

    if (respon?.error) {
      alert(`Waduh: ${respon.error}`); // Nampilin pesan error dari Satpam
      setLoading(false);
    } else {
      Swal.fire({
  title: 'GILA BRE! 🔥',
  text: 'Sukses Login ke NaXaShop!',
  icon: 'success',
  background: '#1f2937',
  color: '#fff',
  confirmButtonColor: '#06b6d4' // Warna cyan
}).then(() => {
  window.location.href = '/';
}); // Kalo sukses, lempar ke Beranda
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]"></div>

      <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Selamat <span className="text-cyan-500">Datang</span></h1>
          <p className="text-gray-400">Masuk ke NaXaShop buat mulai top-up 🎮</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">Email</label>
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
            <label className="block text-gray-400 text-sm font-semibold mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-cyan-500 border border-gray-700 transition-all"
              placeholder="Masukin password lu..."
            />
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

        <p className="text-center text-gray-400 mt-6 text-sm">
          Belum punya akun? <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-bold">Daftar Sini</Link>
        </p>
      </div>
    </div>
  );
}