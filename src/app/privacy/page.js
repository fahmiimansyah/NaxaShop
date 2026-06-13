export const metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Kebijakan privasi NaXaShop terkait data transaksi, riwayat pesanan, email, WhatsApp, dan penggunaan data untuk membantu proses top up.',
  alternates: {
    canonical: '/privacy',
  },
};

import Link from "next/link";
import {
  FaArrowLeft,
  FaUserShield,
  FaEnvelope,
  FaReceipt,
  FaDatabase,
  FaWhatsapp,
} from "react-icons/fa";

const sections = [
  {
    icon: <FaDatabase />,
    title: "Data yang Kami Simpan",
    body: [
      "NaXaShop dapat menyimpan data transaksi seperti Order ID, produk yang dibeli, User ID game, server/zone, metode pembayaran, status pembayaran, dan status top up.",
      "Jika customer login, kami juga dapat menyimpan email akun untuk menampilkan riwayat transaksi.",
    ],
  },
  {
    icon: <FaEnvelope />,
    title: "Penggunaan Data",
    body: [
      "Data digunakan untuk memproses transaksi, menampilkan riwayat order, membantu pengecekan pesanan, dan menangani kendala customer.",
      "Email atau nomor WhatsApp yang customer isi digunakan untuk kebutuhan komunikasi terkait pesanan, bukan untuk spam.",
    ],
  },
  {
    icon: <FaReceipt />,
    title: "Riwayat Transaksi",
    body: [
      "Customer yang login dapat melihat riwayat transaksi berdasarkan email akun yang digunakan saat checkout.",
      "Data transaksi tidak ditampilkan ke customer lain.",
    ],
  },
  {
    icon: <FaWhatsapp />,
    title: "Kontak dan Bantuan",
    body: [
      "Jika customer menghubungi admin, data seperti Order ID dan detail transaksi dapat digunakan untuk membantu pengecekan.",
      "Customer disarankan tidak membagikan data sensitif di kamuar channel resmi NaXaShop.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300"
        >
          <FaArrowLeft />
          Balik ke Beranda
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FaUserShield />
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                NaXaShop Privacy
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Kebijakan Privasi
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Kami menyimpan data seperlunya untuk memproses order,
                menampilkan riwayat transaksi, dan membantu customer kalau ada
                kendala. Intinya: data dipakai buat transaksi, bukan buat
                aneh-aneh.
              </p>

              <p className="mt-3 text-xs font-bold text-gray-500">
                Terakhir diperbarui: {new Date().toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  {section.icon}
                </div>

                <h2 className="text-lg font-black text-white">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-2 text-sm leading-relaxed text-gray-400">
                {section.body.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
          <h2 className="font-black text-white">
            Perubahan Kebijakan
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Kebijakan privasi dapat diperbarui sewaktu-waktu mengikuti
            kebutuhan layanan NaXaShop. Versi terbaru akan ditampilkan di
            halaman ini.
          </p>
        </section>
      </div>
    </main>
  );
}