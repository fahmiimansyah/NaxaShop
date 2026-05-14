'use client'; // Wajib karena kita butuh useState buat ngetik di form

import { useState } from 'react';
import Link from 'next/link';

export default function HalamanRegister() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDaftar = async (e) => {
    e.preventDefault(); // Biar webnya ga ke-refresh pas tombol diklik
    setLoading(true);

    try {
      const respon = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password })
      });

      const data = await respon.json();

      if (respon.ok) {
        alert(data.pesan);
        // Nanti kita arahin ke halaman login kalau loginnya udah dibikin
        // window.location.href = '/login'; 
        setNama(''); setEmail(''); setPassword('');
      } else {
        alert(`Gagal: ${data.pesan}`);
      }
    } catch (error) {
      alert("Waduh, gagal nyambung ke server bre!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efek Cahaya */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>

      <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Bikin Akun <span className="text-blue-500">Baru</span></h1>
          <p className="text-gray-400">Join jadi member NaXaShop sekarang 🔥</p>
        </div>

        <form onSubmit={handleDaftar} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">Nama Panggilan</label>
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
            <label className="block text-gray-400 text-sm font-semibold mb-2">Email Aktif</label>
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
            <label className="block text-gray-400 text-sm font-semibold mb-2">Password</label>
            <input 
              type="password" 
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
              placeholder="Bikin password yang kuat bre..."
            />
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

        <p className="text-center text-gray-400 mt-6 text-sm">
          Udah punya akun? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold">Gas Login</Link>
        </p>
      </div>
    </div>
  );
}