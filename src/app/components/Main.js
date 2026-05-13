// GAK PERLU 'use client'
// Server Component = SEO makin gacor 🚀

import Link from "next/link";

export default async function Beranda() {
  const respon = await fetch(`http://localhost:3000/api/games/`, {
    cache: "no-store",
  });

  const games = await respon.json();

  return (
    <main className="min-h-screen bg-gray-900 text-white px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-500 drop-shadow-lg">
          NaXa<span className="text-white">Shop</span>
        </h1>

        <p className="text-gray-400 mt-2 text-sm">
          Next Evolution Edition 🔥
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6  gap-5 max-w-7xl mx-auto">
        {games.map((game) => (
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
    </main>
  );
}