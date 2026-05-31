import FormKasir from '../../components/Kasir';

export default async function HalamanTopUp({ params }) {
  const { id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const respon = await fetch(`${baseUrl}/api/games/${id}`, {
    cache: 'no-store',
  });

  if (!respon.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-8 py-6 text-center shadow-2xl">
            <h1 className="text-2xl font-black md:text-3xl">
              Gamenya ga ada bre! 😭
            </h1>

            <p className="mt-2 text-sm text-red-200">
              Coba cek lagi URL atau ID gamenya.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const dataGame = await respon.json();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">
        {/* HERO GAME COMPACT */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-4 shadow-xl md:p-5">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={dataGame.gambar}
                alt={dataGame.nama}
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-xl sm:h-24 sm:w-24"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
                Top Up Game
              </p>

              <h1 className="truncate text-2xl font-black leading-tight sm:text-3xl">
                {dataGame.nama}
              </h1>

              <p className="mt-1 truncate text-xs font-semibold text-slate-300 sm:text-sm">
                {dataGame.publisher}
              </p>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                Pilih nominal, isi data akun, lalu checkout. Pastikan ID benar sebelum bayar.
              </p>
            </div>
          </div>
        </section>
        {/* FORM KASIR */}
        <section className="mt-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl md:p-6 xl:p-7">
            <FormKasir dataGame={dataGame} />
          </div>
        </section>
        {/* INFO KECIL: CATATAN DULU, CARA TOP UP COLLAPSE */}
        <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* CATATAN PENTING */}
          <div className="rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/10 p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-xl">
                ⚠️
              </div>

              <div>
                <h2 className="text-base font-black text-yellow-300">
                  Catatan Penting
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-yellow-100/80 sm:text-sm">
                  Pastikan ID, Zone, atau Server benar sebelum bayar. Salah input bisa bikin top up gagal atau masuk ke akun lain.
                </p>
              </div>
            </div>
          </div>

          {/* CARA TOP UP COLLAPSE */}
          <details className="group rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4 shadow-xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  Panduan Singkat
                </p>

                <h2 className="mt-1 text-base font-black text-white">
                  Cara Top Up
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Klik kalau butuh panduan.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 transition-transform duration-300 group-open:rotate-180">
                ⌄
              </div>
            </summary>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  1
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Isi Data Akun
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Masukkan User ID, Zone ID, atau Server sesuai game.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-xs font-black text-white">
                  2
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Pilih Nominal
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Pilih produk top up yang mau dibeli.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                  3
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Bayar & Pantau
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Bayar pesanan, lalu pantau status sampai selesai.
                </p>
              </div>
            </div>
          </details>
        </section>

      </main>
    </div>
  );
}