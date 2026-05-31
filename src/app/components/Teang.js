'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import PromoSlider from "../components/PromoSlider";

export default function GameSearch({ games = [] }) {
  const [kataKunci, setKataKunci] = useState('');

  const daftarGame = Array.isArray(games) ? games : [];
  const keyword = kataKunci.trim().toLowerCase();

  const gameFilter = useMemo(() => {
    if (!keyword) return daftarGame;

    return daftarGame.filter((game) => {
      const namaGame = String(game?.nama || '').toLowerCase();
      const publisherGame = String(game?.publisher || '').toLowerCase();

      return namaGame.includes(keyword) || publisherGame.includes(keyword);
    });
  }, [daftarGame, keyword]);

  const sedangMencari = keyword.length > 0;
  const warnaBadgeGame = (tipe) => {
  if (tipe === 'popular') return 'bg-orange-500/90 text-white border-orange-300/30';
  if (tipe === 'promo') return 'bg-cyan-500/90 text-white border-cyan-300/30';
  if (tipe === 'fast') return 'bg-purple-500/90 text-white border-purple-300/30';
  if (tipe === 'new') return 'bg-green-500/90 text-white border-green-300/30';

  return 'bg-gray-800/90 text-white border-white/10';
};
  return (
    <div id="game-list" className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="text-center mb-1.5">
        <h3 className="font-black uppercase tracking-[0.25em] text-blue-400 mb-1">
          NaXaShop Games
        </h3>
      </div>

      {/* KOLOM PENCARIAN */}
<div className="mb-4 max-w-md mx-auto">
  <div className="relative">
    <input
      type="text"
      placeholder="Cari game atau publisher..."
      value={kataKunci}
      onChange={(e) => setKataKunci(e.target.value)}
      className="w-full bg-gray-800 text-white px-5 pr-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all shadow-lg placeholder:text-gray-500"
    />

    {kataKunci ? (
      <button
        type="button"
        onClick={() => setKataKunci('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white text-sm font-black transition-all flex items-center justify-center"
        aria-label="Hapus pencarian"
      >
        <FaTimes />
      </button>
    ) : (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
        <FaSearch />
      </div>
    )}
  </div>

  {sedangMencari && (
    <div className="mt-3 text-center text-xs font-bold text-blue-400">
      Mencari “{kataKunci.trim()}”
    </div>
  )}
</div>

<AnimatePresence mode="wait">
  {!sedangMencari && (
    <motion.div
      key="promo-slider"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={{
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mb-8"
    >
      <PromoSlider />
    </motion.div>
  )}
</AnimatePresence>

      {/* JIKA GAME GA KETEMU */}
      {gameFilter.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <h2 className="text-2xl font-bold mb-2">
            Yah, gamenya ga ada bre! 😭
          </h2>

          <p>Coba cari pake nama lain atau publisher-nya.</p>

          {kataKunci && (
            <button
              type="button"
              onClick={() => setKataKunci('')}
              className="mt-5 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black transition-all"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <>
        
          {/* GRID — TETAP 3 DI HP, 6 DI LAPTOP */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-5 max-w-7xl mx-auto">
            {gameFilter.map((game) => (
              <Link
                href={`/topup/${game.id}`}
                key={game.id}
                className="group"
              >
                <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-300">
                  {/* GAMBAR 1:1 */}
                  <div className="aspect-square overflow-hidden relative bg-gray-900">
                    {game.gambar ? (
                      <img
                        src={game.gambar}
                        alt={`Top up ${game.nama || 'game'}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🎮
                      </div>
                    )}

                      {game.badge_label && game.badge_tipe !== 'none' && (
    <div
      className={`absolute left-2 top-2 z-20 rounded-full border px-2 py-1 text-[9px] font-black shadow-lg backdrop-blur-md sm:text-[10px] ${warnaBadgeGame(game.badge_tipe)}`}
    >
      {game.badge_label}
    </div>
  )}

                    {/* Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm md:text-base truncate">
                      {game.nama || 'Game Tanpa Nama'}
                    </h3>

                    <p className="text-gray-400 text-xs mt-1 truncate">
                      {game.publisher || 'NaXaShop'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}