"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaSearch,
  FaTimes,
  FaGamepad,
  FaArrowRight,
  FaSpinner,
} from "react-icons/fa";
import RequestGameBox from './RequestGameBox';

function normalisasiGame(game = {}) {
  return {
    ...game,
    id: game.id,
    slug: game.slug || '',
    nama: game.nama || game.name || "Game",
    publisher: game.publisher || game.developer || "NaXaShop",
    gambar: game.gambar || game.image || game.image_url || "",
    kode_game: game.kode_game || "",
    status_game: game.status_game || game.status || "aktif",
  };
}

function cocokDenganKeyword(game, keyword) {
  const q = keyword.toLowerCase().trim();

  if (!q) return true;

  const target = [
    game.nama,
    game.publisher,
    game.kode_game,
    game.status_game,
  ]
    .join(" ")
    .toLowerCase();

  return target.includes(q);
}

export default function GlobalGameSearchModal({ open, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);

  const [kataKunci, setKataKunci] = useState("");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sudahFetch, setSudahFetch] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (sudahFetch) return;

    async function ambilGames() {
      try {
        setLoading(true);

        const respon = await fetch("/api/games", {
          cache: "no-store",
        });

        const hasil = await respon.json();

        const dataMentah = Array.isArray(hasil)
          ? hasil
          : Array.isArray(hasil.data)
            ? hasil.data
            : Array.isArray(hasil.games)
              ? hasil.games
              : [];

        setGames(dataMentah.map(normalisasiGame));
        setSudahFetch(true);
      } catch (error) {
        console.error("Gagal ambil game untuk search:", error);
      } finally {
        setLoading(false);
      }
    }

    ambilGames();
  }, [open, sudahFetch]);

  useEffect(() => {
    if (open) return;

    const timer = setTimeout(() => {
      setKataKunci("");
    }, 180);

    return () => clearTimeout(timer);
  }, [open]);

  const hasilSearch = useMemo(() => {
    return games
      .filter((game) => cocokDenganKeyword(game, kataKunci))
      .slice(0, 8);
  }, [games, kataKunci]);

  function bukaGame(game) {
    const target = game?.slug || game?.id;
    if (!target) return;

    onClose?.();
    router.push(`/topup/${target}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 top-6 z-[130] mx-auto w-[92%] max-w-2xl overflow-hidden rounded-[28px] border border-blue-800/45 bg-[#061426] text-white shadow-2xl shadow-blue-950/60 sm:top-16"
            initial={{ opacity: 0, y: -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.16),transparent_36%)]" />

            <div className="relative">
              <div className="flex items-center gap-3 border-b border-blue-800/35 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                  <FaSearch />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/35">
                    Cari Game
                  </p>

                  <input
                    ref={inputRef}
                    value={kataKunci}
                    onChange={(event) => setKataKunci(event.target.value)}
                    placeholder="Cari Mobile Legends, Free Fire, Genshin..."
                    className="mt-1 w-full bg-transparent text-base font-black text-white outline-none placeholder:text-blue-100/30 sm:text-lg"
                  />
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-800/45 bg-blue-950/45 text-blue-100 transition hover:border-blue-400/40 hover:bg-blue-800/55"
                  aria-label="Tutup pencarian"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-3 sm:p-4">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 rounded-3xl border border-blue-800/35 bg-blue-950/35 px-4 py-10 text-sm font-bold text-blue-100/65">
                    <FaSpinner className="animate-spin" />
                    Lagi ambil daftar game...
                  </div>
                ) : hasilSearch.length > 0 ? (
                  <div className="grid gap-2">
                    {hasilSearch.map((game) => {
                      const comingSoon =
                        String(game.status_game).toLowerCase() ===
                        "coming_soon";

                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => bukaGame(game)}
                          className="group flex w-full items-center gap-3 rounded-3xl border border-blue-800/35 bg-blue-950/35 p-3 text-left transition hover:border-blue-400/40 hover:bg-blue-800/45"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-800/40 bg-blue-950">
                            {game.gambar ? (
                              <img
                                src={game.gambar}
                                alt={game.nama}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <FaGamepad className="text-blue-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-white sm:text-base">
                                {game.nama}
                              </p>

                              {comingSoon && (
                                <span className="shrink-0 rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-black text-blue-200">
                                  Soon
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs font-semibold text-blue-100/45">
                              {game.publisher}
                            </p>
                          </div>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                            <FaArrowRight className="text-xs" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-blue-800/35 bg-blue-950/35 px-4 py-10 text-center">
                    <p className="text-base font-black text-white">
                      Game belum ketemu
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-blue-100/45">
                      Coba pakai kata kunci lain, misalnya nama game atau
                      publisher-nya.
                    </p>
                    <RequestGameBox />
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}