'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { FaGamepad, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';

export default function RequestGameBox({
  defaultKeyword = '',
  compact = false,
}) {
  const [namaGame, setNamaGame] = useState(defaultKeyword || '');
  const [kontak, setKontak] = useState('');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNamaGame(defaultKeyword || '');
  }, [defaultKeyword]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!namaGame.trim()) {
      Swal.fire({
        title: 'Nama game kosong',
        text: 'Isi nama game yang pengen lu request dulu bre.',
        icon: 'warning',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setLoading(true);

    try {
      const respon = await fetch('/api/request-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_game: namaGame,
          kontak,
          catatan,
        }),
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        Swal.fire({
          title: 'Gagal kirim',
          text: hasil.pesan || 'Request game gagal dikirim.',
          icon: 'error',
          background: '#1f2937',
          color: '#fff',
          confirmButtonColor: '#2563eb',
        });
        return;
      }

      Swal.fire({
        title: 'Request terkirim! 🎮',
        text: hasil.pesan || 'Makasih masukannya bree!',
        icon: 'success',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#2563eb',
      });

      setNamaGame('');
      setKontak('');
      setCatatan('');
    } catch (error) {
      Swal.fire({
        title: 'Server ngadat',
        text: 'Gagal kirim request game. Coba lagi bentar ya bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900/80 shadow-2xl shadow-black/25 ${
        compact ? 'mt-6 p-5' : 'mx-auto mt-10 max-w-7xl p-5 sm:p-6'
      }`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-[80px]" />

      <div className="relative z-10 grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <FaGamepad />
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-400">
            Request Game
          </p>

          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
            Game kamu belum ada?
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Kasih tahu kami game atau produk digital yang pengen lu top up.
            Kalau banyak yang request, bisa jadi masuk etalase NaXaShop berikutnya.
          </p>

          {!compact && (
            <div className="mt-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 text-xs leading-relaxed text-blue-100/80">
              Tips: tulis nama game sejelas mungkin. Kalau mau, masukin WhatsApp
              juga biar admin bisa kabarin kalau produknya udah tersedia.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
              Nama Game / Produk
            </label>
            <input
              type="text"
              value={namaGame}
              onChange={(e) => setNamaGame(e.target.value)}
              placeholder="Contoh: Roblox, PUBG Mobile, Valorant..."
              className="w-full rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
              Kontak opsional
            </label>
            <div className="relative">
              <input
                type="text"
                value={kontak}
                onChange={(e) => setKontak(e.target.value)}
                placeholder="WhatsApp / email, boleh kosong"
                className="w-full rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-blue-500"
              />
              <FaWhatsapp className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
              Catatan opsional
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: butuh weekly pass, diamond, membership, dll."
              rows={compact ? 2 : 3}
              className="w-full resize-none rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3 text-sm font-black text-white shadow-[0_0_22px_rgba(37,99,235,0.30)] transition-all hover:-translate-y-1 hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaPaperPlane />
            {loading ? 'Ngirim...' : 'Kirim Request'}
          </button>
        </form>
      </div>
    </section>
  );
}