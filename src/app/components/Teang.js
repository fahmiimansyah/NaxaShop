'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PromoSlider from '../components/PromoSlider';
import RequestGameBox from '../components/RequestGameBox';
import {
  GAME_CATEGORIES,
  getGameCategoryMeta,
  kategoriGameDariData,
} from '../lib/game-categories';

function warnaBadgeGame(tipe) {
  if (tipe === 'comingsoon') return 'bg-indigo-500/90 text-white border-indigo-300/40';
  if (tipe === 'popular') return 'bg-amber-500/90 text-white border-amber-300/30';
  if (tipe === 'promo') return 'bg-red-500/90 text-white border-red-300/30';
  if (tipe === 'fast') return 'bg-purple-500/90 text-white border-purple-300/30';
  if (tipe === 'new') return 'bg-emerald-500/90 text-white border-emerald-300/30';

  return 'bg-gray-800/90 text-white border-white/10';
}

function GameCard({ game }) {
  const metaKategori = getGameCategoryMeta(kategoriGameDariData(game));

  return (
    <Link href={`/topup/${game.id}`} className="group">
      <div className="h-full overflow-hidden rounded-2xl border border-blue-800/35 bg-[#071a33] transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]">
        <div className="relative aspect-square overflow-hidden bg-[#061426]">
          {game.gambar ? (
            <img
              src={game.gambar}
              alt={`Top up ${game.nama || 'game'}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">
              🎮
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

          {game.badge_label && game.badge_tipe !== 'none' && (
            <div
              className={`absolute left-2 top-2 z-20 rounded-full border px-2 py-1 text-[9px] font-black shadow-lg backdrop-blur-md sm:text-[10px] ${warnaBadgeGame(
                game.badge_tipe
              )}`}
            >
              {game.badge_label}
            </div>
          )}

          {game.status_game === 'coming_soon' && (
            <div className="absolute bottom-2 left-2 right-2 z-20 rounded-xl border border-indigo-300/20 bg-indigo-500/20 px-2 py-1 text-center text-[9px] font-black text-indigo-100 backdrop-blur-md sm:text-[10px]">
              Coming Soon
            </div>
          )}
        </div>

        <div className="p-3">

          <h3 className="truncate text-sm font-semibold text-white md:text-base">
            {game.nama || 'Game Tanpa Nama'}
          </h3>

          <p className="mt-1 truncate text-xs text-blue-100/45">
            {game.publisher || 'NaXaShop'}
          </p>
        </div>
      </div>
    </Link>
  );
}

function GameGrid({ games }) {
  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-6 md:gap-5">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

function SectionKategori({ kategori, games, sectionRef }) {
  if (!games.length) return null;

  return (
    <motion.section
      ref={sectionRef}
      id={`kategori-${kategori.id}`}
      data-category-section={kategori.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="scroll-mt-36"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white sm:text-xl">
            {kategori.label}
          </h2>

          <div className="mt-1 h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-400" />
        </div>
      </div>

      <GameGrid games={games} />
    </motion.section>
  );
}

export default function GameSearch({ games = [] }) {
  const [kategoriAktif, setKategoriAktif] = useState('all');

  const sectionRefs = useRef({});
  const chipRefs = useRef({});

  const daftarGame = Array.isArray(games) ? games : [];

  const gameDenganKategori = useMemo(() => {
    return daftarGame.map((game) => ({
      ...game,
      kategori_game_normal: kategoriGameDariData(game),
    }));
  }, [daftarGame]);

  const kategoriDenganGame = useMemo(() => {
    return GAME_CATEGORIES.map((kategori) => ({
      ...kategori,
      games: gameDenganKategori.filter(
        (game) => game.kategori_game_normal === kategori.id
      ),
    })).filter((kategori) => kategori.games.length > 0);
  }, [gameDenganKategori]);

  const kategoriChips = useMemo(() => {
    return [
      {
        id: 'all',
        label: 'Semua',
        total: gameDenganKategori.length,
      },
      ...kategoriDenganGame.map((kategori) => ({
        id: kategori.id,
        label: kategori.label,
        total: kategori.games.length,
      })),
    ];
  }, [gameDenganKategori.length, kategoriDenganGame]);

  useEffect(() => {
    const updateKategoriAktifDariScroll = () => {
      const offsetNavbar = 150;
      const posisiSekarang = window.scrollY + offsetNavbar;

      let kategoriSekarang = 'all';

      for (const kategori of kategoriDenganGame) {
        const element = sectionRefs.current[kategori.id];
        if (!element) continue;

        const topSection = element.offsetTop;

        if (posisiSekarang >= topSection) {
          kategoriSekarang = kategori.id;
        }
      }

      setKategoriAktif((prev) =>
        prev === kategoriSekarang ? prev : kategoriSekarang
      );
    };

    updateKategoriAktifDariScroll();

    window.addEventListener('scroll', updateKategoriAktifDariScroll, {
      passive: true,
    });

    window.addEventListener('resize', updateKategoriAktifDariScroll);

    return () => {
      window.removeEventListener('scroll', updateKategoriAktifDariScroll);
      window.removeEventListener('resize', updateKategoriAktifDariScroll);
    };
  }, [kategoriDenganGame]);

  useEffect(() => {
    const chipAktif = chipRefs.current[kategoriAktif];

    if (chipAktif) {
      chipAktif.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [kategoriAktif]);

  function scrollKeKategori(id) {
    setKategoriAktif(id);

    if (id === 'all') {
      const target = document.getElementById('game-list');
      if (!target) return;

      window.scrollTo({
        top: Math.max(target.offsetTop - 112, 0),
        behavior: 'smooth',
      });

      return;
    }

    const target = sectionRefs.current[id];

    if (!target) return;

    window.scrollTo({
      top: Math.max(target.offsetTop - 118, 0),
      behavior: 'smooth',
    });
  }

  const hideScrollbarStyle = `
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `;

  return (
    <div id="game-list" className="mx-auto max-w-7xl">
      <style jsx global>{hideScrollbarStyle}</style>

      <motion.div
        key="promo-slider"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="-mt-3 mb-5 sm:-mt-4"
      >
        <PromoSlider />
      </motion.div>

      {kategoriChips.length > 1 && (
        <div className="sticky top-[64px] z-30 -mx-4 mb-6 border-y border-blue-800/40 bg-[#082447]/95 py-2.5 shadow-xl shadow-blue-950/25 backdrop-blur-xl sm:top-[76px] sm:mx-0 sm:rounded-2xl sm:border sm:px-2">
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-gradient-to-r from-[#082447] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-gradient-to-l from-[#082447] to-transparent" />

            <div className="no-scrollbar flex touch-pan-x gap-2 overflow-x-auto scroll-smooth px-6 py-1 sm:px-2">
              {kategoriChips.map((kategori) => {
                const aktif = kategoriAktif === kategori.id;

                return (
                  <button
                    ref={(element) => {
                      chipRefs.current[kategori.id] = element;
                    }}
                    key={kategori.id}
                    type="button"
                    onClick={() => scrollKeKategori(kategori.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black leading-none transition-all sm:px-4 sm:text-xs ${
                      aktif
                        ? 'border-blue-300/50 bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-300/20'
                        : 'border-blue-800/50 bg-blue-950/45 text-blue-100/80 hover:border-blue-400/40 hover:bg-blue-900/70 hover:text-white'
                    }`}
                  >
                    {kategori.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {kategoriDenganGame.length > 0 ? (
        <div className="space-y-8">
          {kategoriDenganGame.map((kategori) => (
            <SectionKategori
              key={kategori.id}
              kategori={kategori}
              games={kategori.games}
              sectionRef={(element) => {
                sectionRefs.current[kategori.id] = element;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-blue-100/55">
          <h2 className="mb-2 text-2xl font-bold text-white">
            Belum ada game tersedia
          </h2>

          <p className="mx-auto max-w-md text-sm leading-relaxed">
            Tim NaXaShop belum menambahkan daftar game. Kamu bisa request game
            yang ingin tersedia.
          </p>

          <RequestGameBox compact />
        </div>
      )}

    </div>
  );
}