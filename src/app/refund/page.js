import Link from "next/link";
import {
  FaArrowLeft,
  FaUndoAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaHeadset,
} from "react-icons/fa";

const bisaRefund = [
  "Pembayaran berhasil, tetapi produk/top up gagal diproses oleh sistem atau provider.",
  "Terjadi kesalahan sistem dari sisi NaXaShop yang membuat pesanan tidak dapat diproses.",
  "Customer memiliki Order ID dan bukti pembayaran yang valid.",
];

const tidakBisaRefund = [
  "Customer salah memasukkan User ID, Zone ID, server, atau data akun game.",
  "Produk sudah berhasil diproses atau terkirim ke akun berdasarkan data yang customer masukkan.",
  "Customer membuat order baru padahal order sebelumnya masih pending tanpa konfirmasi admin.",
  "Permintaan refund tanpa Order ID atau bukti transaksi yang jelas.",
];

export default function RefundPage() {
  const adminWhatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "";
  const whatsappLink = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(
        "Halo admin NaXaShop, saya ingin mengajukan pengecekan/refund.\n\nOrder ID:\nMasalah:\nBukti pembayaran:"
      )}`
    : "#";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-black text-cyan-400 hover:text-cyan-300"
        >
          <FaArrowLeft />
          Balik ke Beranda
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                <FaUndoAlt />
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-400">
                NaXaShop Policy
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                Kebijakan Refund
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Karena produk NaXaShop diproses secara digital, refund tidak
                selalu bisa dilakukan. Tapi kalau masalahnya dari sistem atau
                pesanan gagal diproses, admin akan bantu cek.
              </p>

              <p className="mt-3 text-xs font-bold text-gray-500">
                Terakhir diperbarui: {new Date().toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                <FaCheckCircle />
              </div>
              <h2 className="font-black text-green-300">
                Refund bisa diajukan jika
              </h2>
            </div>

            <div className="space-y-3">
              {bisaRefund.map((item) => (
                <p key={item} className="text-sm leading-relaxed text-green-100/80">
                  • {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <FaTimesCircle />
              </div>
              <h2 className="font-black text-red-300">
                Refund tidak berlaku jika
              </h2>
            </div>

            <div className="space-y-3">
              {tidakBisaRefund.map((item) => (
                <p key={item} className="text-sm leading-relaxed text-red-100/80">
                  • {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-300">
              <FaExclamationTriangle />
            </div>

            <h2 className="font-black text-yellow-300">
              Cara mengajukan pengecekan
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-yellow-100/80">
            Hubungi admin dengan menyertakan Order ID, bukti pembayaran, dan
            detail kendala. Admin akan mengecek status pembayaran, status top up,
            dan catatan sistem sebelum menentukan solusi.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-500"
          >
            <FaHeadset />
            Hubungi Admin
          </a>
        </section>
      </div>
    </main>
  );
}