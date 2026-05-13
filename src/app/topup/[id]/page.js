import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import FormKasir from '../../components/Kasir';

export default async function HalamanTopUp({ params }) {
  const {id} =  await params;

  const respon = await fetch(`http://localhost:3000/api/games/${id}`, {
    cache: 'no-store',
  });

  if (!respon.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />

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

        <Footer />
      </div>
    );
  }

  const dataGame = await respon.json();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {/* HERO GAME */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-5 shadow-2xl md:p-8">
          {/* Glow */}
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
            <div className="mx-auto shrink-0 md:mx-0">
  <img
    src={dataGame.gambar}
    alt={dataGame.nama}
    className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-xl md:h-24 md:w-24"
  />
</div>

            <div className="text-center md:text-left">
              <p className="mb-2 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                Top Up Game
              </p>

              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                {dataGame.nama}
              </h1>

              <p className="mt-3 text-sm font-semibold text-slate-300 md:text-base">
                {dataGame.publisher}
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                Pilih nominal, masukin data akun, terus gas checkout. Jangan
                sampai salah ID ya bre, nanti top up-nya nyasar ke isekai.
              </p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* FORM UTAMA */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl md:p-6">
            <FormKasir dataGame={dataGame} />
          </div>

          {/* SIDEBAR INFO */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl">
              <h2 className="text-lg font-black">Cara Top Up</h2>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                    1
                  </span>
                  <p>Masukkan ID akun dengan benar.</p>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                    2
                  </span>
                  <p>Pilih nominal top up yang kamu mau.</p>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                    3
                  </span>
                  <p>Checkout dan tunggu proses masuk.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 shadow-xl">
              <h2 className="text-lg font-black text-yellow-300">
                Catatan Penting
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-yellow-100/80">
                Pastikan data akun sudah benar sebelum bayar. Kesalahan input
                ID bukan tanggung jawab sistem, bre.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}