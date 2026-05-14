'use client'; // Wajib karena kita butuh useState buat ngetik nama game
import { useState } from 'react';
import Link from 'next/link';

export default function GameSearch({ games }) {
  // Mangkok buat nyimpen ketikan user
  const [kataKunci, setKataKunci] = useState('');

  // Jurus nyaring game: Cocokin nama game dengan ketikan user (huruf kecil semua biar kebacanya gampang)
  const gameFilter = games.filter((game) => 
    game.nama.toLowerCase().includes(kataKunci.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* KOLOM PENCARIAN */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari game.." 
            value={kataKunci}
            onChange={(e) => setKataKunci(e.target.value)}
            className="w-full bg-gray-800 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all shadow-lg"
          />
          <div className="absolute right-4 top-4 text-gray-400">
             🔍
          </div>
        </div>
      </div>

      {/* JIKA GAME GA KETEMU */}
      {gameFilter.length === 0 && (
        <div className="text-center py-10 text-gray-400">
           <h2 className="text-2xl font-bold mb-2">Yah, gamenya ga ada bre! 😭</h2>
           <p>Coba cari pake nama lain.</p>
        </div>
      )}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-500 drop-shadow-lg">
         Game Populer
        </h1>
      </div>
     {/* Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6  gap-5 max-w-7xl mx-auto">
        {gameFilter.map((game) => (
          <Link
            href={`/topup/${game.id}`}
            key={game.id}
            className="group"
          >
            <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-300">
              
              {/* GAMBAR 1:1 */}
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={game.gambar}
                  alt={`Top up ${game.nama}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm md:text-base truncate">
                  {game.nama}
                </h3>

                <p className="text-gray-400 text-xs mt-1 truncate">
                  {game.publisher}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}