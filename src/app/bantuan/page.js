import Link from 'next/link';

export const metadata = {
  title: 'Bantuan & FAQ - NaXaShop',
  description: 'Panduan top up, cek status order, dan aturan transaksi di NaXaShop.'
};

export default function BantuanPage() {
  const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  const linkWa = nomorAdmin
    ? `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(
        'Halo admin NaXaShop, saya butuh bantuan terkait top-up.'
      )}`
    : '#';

  const faq = [
    {
      tanya: 'Berapa lama top-up diproses?',
      jawab:
        'Biasanya diproses otomatis setelah pembayaran berhasil. Kalau status masih proses, tunggu beberapa menit dan cek status order secara berkala.'
    },
    {
      tanya: 'Kalau saya salah input User ID atau server gimana?',
      jawab:
        'Pastikan User ID, Zone ID, dan Server sudah benar sebelum bayar. Kesalahan input dapat menyebabkan top-up gagal atau masuk ke akun lain.'
    },
    {
      tanya: 'Kenapa beberapa game tidak bisa cek nickname otomatis?',
      jawab:
        'Beberapa game belum mendukung verifikasi nickname otomatis dari provider. Untuk game tersebut, transaksi tetap bisa diproses dengan verifikasi manual berdasarkan User ID dan Server.'
    },
    {
      tanya: 'Apa yang harus dilakukan kalau pembayaran sukses tapi item belum masuk?',
      jawab:
        'Simpan Order ID, lalu cek halaman Cek Order. Kalau status top-up gagal atau terlalu lama proses, hubungi admin dengan Order ID tersebut.'
    },
    {
      tanya: 'Apakah order bisa dibatalkan?',
      jawab:
        'Order yang belum dibayar biasanya akan otomatis expired. Kalau pembayaran sudah sukses dan top-up sudah diproses, order tidak bisa dibatalkan sepihak.'
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 font-black">
            ← Balik ke Beranda
          </Link>
        </div>

        <section className="bg-gray-900 border border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-8">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 blur-[90px] rounded-full"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-3xl mb-4">
              🛟
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              Bantuan <span className="text-cyan-400">NaXaShop</span>
            </h1>

            <p className="text-gray-400 mt-3 max-w-2xl leading-relaxed">
              Panduan singkat biar transaksi lu aman, jelas, dan gak panik kalau status order berubah.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                href="/cek-order"
                className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm text-center transition-all"
              >
                🧾 Cek Status Order
              </Link>

              {nomorAdmin && (
                <a
                  href={linkWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-sm text-center transition-all"
                >
                  💬 Chat Admin
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-black mb-5">🚀 Cara Top Up</h2>

              <div className="space-y-4">
                {[
                  ['1', 'Pilih Game', 'Cari dan pilih game yang mau lu top-up.'],
                  ['2', 'Isi Data Akun', 'Masukkan User ID, Zone ID, atau Server sesuai kebutuhan game.'],
                  ['3', 'Pilih Produk', 'Pilih nominal atau item yang mau dibeli.'],
                  ['4', 'Pilih Pembayaran', 'Pilih QRIS atau Virtual Account yang tersedia.'],
                  ['5', 'Bayar & Cek Status', 'Setelah bayar, simpan Order ID dan pantau status order.']
                ].map((item) => (
                  <div key={item[0]} className="flex gap-4 bg-slate-950 border border-gray-800 rounded-2xl p-4">
                    <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center font-black shrink-0">
                      {item[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-white">{item[1]}</h3>
                      <p className="text-sm text-gray-400 mt-1">{item[2]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-2xl font-black mb-5">❓ FAQ</h2>

              <div className="space-y-3">
                {faq.map((item) => (
                  <div key={item.tanya} className="bg-slate-950 border border-gray-800 rounded-2xl p-4">
                    <h3 className="font-black text-cyan-400">{item.tanya}</h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{item.jawab}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6">
              <h2 className="text-xl font-black text-yellow-300 mb-3">⚠️ Aturan Penting</h2>
              <ul className="space-y-3 text-sm text-yellow-100/80 leading-relaxed">
                <li>Pastikan User ID, Zone ID, dan Server benar sebelum pembayaran.</li>
                <li>Kesalahan input data akun menjadi tanggung jawab pembeli.</li>
                <li>Order yang sudah diproses ke provider tidak bisa dibatalkan sembarangan.</li>
                <li>Simpan Order ID sampai transaksi selesai.</li>
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-black mb-3">📝 Verifikasi Manual</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Beberapa game belum bisa menampilkan nickname otomatis. Untuk game tersebut, sistem akan memakai
                verifikasi manual. Pastikan UID dan server sudah benar sebelum checkout.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-black mb-3">🔒 Keamanan Transaksi</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pembayaran diproses melalui payment gateway. Setelah pembayaran berhasil, sistem akan memproses order
                dan status bisa dipantau lewat halaman cek order.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}