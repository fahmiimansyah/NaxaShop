import { permanentRedirect } from 'next/navigation';
import FormKasir from '../../components/Kasir';

function paramAdalahId(value) {
  return /^\d+$/.test(String(value || '').trim());
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://naxashop.id';

  try {
    const respon = await fetch(`${baseUrl}/api/games/${id}`, {
      cache: 'no-store',
    });

    if (!respon.ok) {
      return {
        title: 'Game Tidak Ditemukan | NaXaShop',
        description: 'Halaman game yang kamu cari tidak ditemukan di NaXaShop.',
      };
    }

    const game = await respon.json();
    const namaGame = game?.nama || 'Game';
    const slugGame = game?.slug || id;
    const canonicalUrl = `${baseUrl}/topup/${slugGame}`;

    return {
      title: `Top Up ${namaGame} | NaXaShop`,
      description: `Top up ${namaGame} di NaXaShop. Pilih nominal, isi data akun, bayar, lalu pesanan diproses otomatis.`,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `Top Up ${namaGame} | NaXaShop`,
        description: `Top up ${namaGame} di NaXaShop dengan proses praktis dan pembayaran mudah.`,
        url: canonicalUrl,
        images: game?.gambar ? [game.gambar] : undefined,
      },
    };
  } catch (error) {
    console.error('Metadata topup error:', error);

    return {
      title: 'Top Up Game | NaXaShop',
      description: 'Top up game praktis di NaXaShop.',
    };
  }
}

export default async function HalamanTopUp({ params }) {
  const { id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://naxashop.id';

  const respon = await fetch(`${baseUrl}/api/games/${id}`, {
    cache: 'no-store',
  });

  if (!respon.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-8 py-6 text-center shadow-2xl">
            <h1 className="text-2xl font-black md:text-3xl">
              Game tidak ditemukan
            </h1>

            <p className="mt-2 text-sm text-red-200">
              Coba kembali ke beranda atau pilih game lain yang tersedia.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const dataGame = await respon.json();

  // Kalau user/Google buka URL lama /topup/1, arahkan permanen ke URL SEO.
  if (paramAdalahId(id) && dataGame?.slug) {
    permanentRedirect(`/topup/${dataGame.slug}`);
  }

  const gameComingSoon = dataGame.status_game === 'coming_soon';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">
        {/* HERO GAME COMPACT */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-4 shadow-xl md:p-5">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={dataGame.gambar}
                alt={dataGame.nama}
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-xl sm:h-24 sm:w-24"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap gap-2">
                <p className="inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
                  Top Up Game
                </p>

                {gameComingSoon && (
                  <p className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                    Coming Soon
                  </p>
                )}
              </div>

              <h1 className="truncate text-2xl font-black leading-tight sm:text-3xl">
                {dataGame.nama}
              </h1>

              <p className="mt-1 truncate text-xs font-semibold text-slate-300 sm:text-sm">
                {dataGame.publisher}
              </p>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {gameComingSoon
                  ? 'Game ini sedang disiapkan. Etalase sudah bisa dilihat, tapi checkout belum dibuka dulu.'
                  : 'Pilih nominal, isi data akun, lalu checkout. Pastikan ID benar sebelum bayar.'}
              </p>
            </div>
          </div>
        </section>
        {gameComingSoon && (
          <section className="mt-4 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/10 p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-xl">
                🕒
              </div>

              <div>
                <h2 className="text-base font-black text-yellow-300">
                  Coming Soon
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-yellow-100/80 sm:text-sm">
                  Game ini tampil dulu sebagai teaser. Checkout akan dibuka setelah produk siap diproses dengan aman.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FORM KASIR */}
        <section className="mt-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl md:p-6 xl:p-7">
            <FormKasir dataGame={dataGame} />
          </div>
        </section>
        {/* SEO & HELP SECTION - URUTANNYA DISESUAIKAN DENGAN FORM KASIR */}
        <section className="mt-5 space-y-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/75 shadow-xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/10 via-slate-900/40 to-transparent p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                Panduan Checkout
              </p>

              <h2 className="mt-2 text-xl font-black text-white md:text-2xl">
                Cara Top Up {dataGame.nama} di NaXaShop
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-5">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  1
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Pilih Nominal
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Tentukan produk atau nominal top up yang ingin kamu beli.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  2
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Isi Data Akun
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Masukkan User ID, Zone ID, atau server sesuai kebutuhan game.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  3
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Pilih Pembayaran
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Pilih metode pembayaran yang tersedia dan cek total akhirnya.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  4
                </span>

                <h3 className="mt-3 text-sm font-black text-white">
                  Bayar & Pantau
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Selesaikan pembayaran, lalu pantau status sampai pesanan selesai.
                </p>
              </div>
            </div>
          </div>

          {!gameComingSoon && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                  FAQ Ringkas
                </p>

                <h2 className="mt-2 text-lg font-black text-white">
                  Pertanyaan seputar top up {dataGame.nama}
                </h2>

                <div className="mt-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Berapa lama proses top up?
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Pesanan diproses setelah pembayaran berhasil. Waktu proses
                      bisa berbeda tergantung produk dan kondisi provider.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">
                      Apa yang harus dicek sebelum bayar?
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Cek kembali nominal, User ID, Zone ID atau server, metode
                      pembayaran, dan total tagihan sebelum checkout.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">
                      Bagaimana kalau pesanan perlu dicek?
                    </h3>

                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Simpan Order ID dari halaman pembayaran, lalu hubungi support
                      NaXaShop supaya transaksi bisa dicek lebih cepat.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-500/10 p-5 shadow-xl md:p-6">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                  Tips Aman
                </p>

                <h2 className="mt-2 text-lg font-black text-white">
                  Simpan halaman pembayaran
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-blue-50/80">
                  Setelah transaksi dibuat, jangan buru-buru menutup halaman
                  pembayaran. Simpan Order ID atau screenshot instruksi pembayaran
                  untuk jaga-jaga kalau butuh pengecekan.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
