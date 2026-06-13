export const metadata = {
  title: 'Syarat dan Ketentuan',
  description:
    'Syarat dan ketentuan penggunaan layanan NaXaShop untuk pembelian produk top up game dan voucher digital.',
  alternates: {
    canonical: '/terms',
  },
};

import Link from "next/link";
import {
  FaArrowLeft,
  FaFileContract,
  FaGamepad,
  FaReceipt,
  FaExclamationTriangle,
  FaShieldAlt,
} from "react-icons/fa";

const sections = [
  {
    icon: <FaGamepad />,
    title: "1. Layanan NaXaShop",
    body: [
      "NaXaShop menyediakan layanan top up game dan produk digital. Produk yang dibeli akan diproses secara digital ke akun game berdasarkan data yang customer masukkan saat checkout.",
      "NaXaShop bukan publisher atau developer resmi dari game yang tersedia. Semua nama game, logo, dan merek dagang adalah milik pemilik masing-masing.",
    ],
  },
  {
    icon: <FaReceipt />,
    title: "2. Proses Pemesanan",
    body: [
      "Customer wajib memilih game, produk/nominal, mengisi User ID, Zone ID, server, atau data lain yang dibutuhkan dengan benar.",
      "Setelah checkout berhasil dibuat, sistem akan memberikan Order ID yang dapat digunakan untuk melacak status pesanan.",
      "Customer disarankan menyimpan Order ID sampai pesanan selesai.",
    ],
  },
  {
    icon: <FaExclamationTriangle />,
    title: "3. Kesalahan Data Customer",
    body: [
      "Kesalahan input seperti User ID salah, server salah, zone salah, atau data akun tidak sesuai menjadi tanggung jawab customer.",
      "Jika top up sudah berhasil diproses ke akun yang salah akibat data yang dimasukkan customer, pesanan tidak dapat dibatalkan atau dikembalikan.",
    ],
  },
  {
    icon: <FaShieldAlt />,
    title: "4. Status dan Kendala Pesanan",
    body: [
      "Status pesanan dapat dicek melalui halaman Lacak Pesanan menggunakan Order ID.",
      "Jika pembayaran sudah berhasil tetapi top up belum masuk, customer dapat menghubungi admin dengan menyertakan Order ID dan bukti pendukung.",
      "NaXaShop berhak melakukan pengecekan ulang ke sistem, payment gateway, atau terkait lainnya jika terjadi kendala.",
    ],
  },
];

export default function TermsPage() {
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
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FaFileContract />
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                NaXaShop Legal
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Syarat & Ketentuan
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Baca santai dulu, ya. Halaman ini menjelaskan aturan dasar
                penggunaan layanan NaXaShop supaya proses top up tetap jelas
                dan aman buat semua pihak.
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

        <section className="mt-5 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <h2 className="font-black text-yellow-300">
            Catatan penting
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-yellow-100/80">
            Dengan melakukan transaksi di NaXaShop, customer dianggap sudah
            membaca dan menyetujui syarat dan ketentuan ini.
          </p>
        </section>
      </div>
    </main>
  );
}