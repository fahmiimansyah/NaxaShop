export const metadata = {
  title: 'Support',
  description:
    'Hubungi tim support NaXaShop untuk bantuan transaksi, pembayaran, dan status top up game.',
  alternates: {
    canonical: '/support',
  },
};

import Link from "next/link";
import {
  FaWhatsapp,
  FaEnvelope,
  FaReceipt,
  FaArrowLeft,
  FaShieldAlt,
  FaClock,
  FaGamepad,
  FaExclamationTriangle,
  FaArrowRight,
} from "react-icons/fa";

const bantuanCepat = [
  {
    icon: <FaReceipt />,
    title: "Lacak Pesanan",
    desc: "Cek status bayar dan top up pakai Order ID.",
    href: "/lacak",
    label: "Cek Order",
  },
  {
    icon: <FaShieldAlt />,
    title: "Cek Data Dulu",
    desc: "Pastikan User ID, server, dan nominal sudah sesuai sebelum bikin order baru.",
    href: "#sebelum-panik",
    label: "Lihat Checklist",
  },
  {
    icon: <FaEnvelope />,
    title: "Email Support",
    desc: "Buat laporan yang panjang dan detail kalau butuh lampiran lengkap.",
    href: "email",
    label: "Kirim Email",
  },
];

const rules = [
  {
    icon: <FaReceipt />,
    title: "Siapkan Order ID",
    desc: "Order ID membantu support langsung menemukan data pesanan kamu.",
  },
  {
    icon: <FaGamepad />,
    title: "Cek User ID & Server",
    desc: "Salah ID atau server bisa bikin top up masuk ke akun lain.",
  },
  {
    icon: <FaClock />,
    title: "Tunggu beberapa menit",
    desc: "Kadang payment gateway atau provider butuh waktu update status.",
  },
  {
    icon: <FaShieldAlt />,
    title: "Jangan spam checkout",
    desc: "Kalau status belum berubah, cek order dulu sebelum bikin pesanan baru.",
  },
];

const faqItems = [
  {
    q: "Pembayaran sukses tapi top up belum masuk?",
    a: "Cek dulu status pesanan. Kalau status top up masih proses terlalu lama, chat support dengan Order ID.",
  },
  {
    q: "Salah input User ID atau server gimana?",
    a: "Langsung hubungi support. Tapi kalau top up sudah sukses terkirim ke akun salah, biasanya tidak bisa dibatalkan.",
  },
  {
    q: "Status bayar belum berubah?",
    a: "Tunggu sebentar lalu klik cek status. Kadang webhook payment gateway butuh beberapa detik sampai menit.",
  },
  {
    q: "Support buka 24 jam?",
    a: "Sistem order bisa jalan otomatis. Support manusia tetap butuh napas, tapi chat kamu bakal dicek secepatnya.",
  },
];

export default function SupportPage() {
  const adminWhatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "";
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  const whatsappLink = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(
        "Halo support NaXaShop, saya butuh bantuan.\n\nOrder ID:\nMasalah:\nScreenshot/Detail:"
      )}`
    : "#";

  const emailLink = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "Bantuan Order NaXaShop"
  )}&body=${encodeURIComponent(
    "Halo support NaXaShop,\n\nOrder ID:\nMasalah:\nDetail tambahan:"
  )}`;

  const getHref = (href) => {
    if (href === "whatsapp") return whatsappLink;
    if (href === "email") return emailLink;
    return href;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">

      {/* TOP LINE */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300"
        >
          <FaArrowLeft />
          Balik ke Beranda
        </Link>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                NaXaShop Support
              </p>

              <h1 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-5xl">
                Order nyangkut? Kalem, kita cek bareng.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
                Buat kaum gamer yang lagi panik karena top up belum masuk,
                payment belum kebaca, atau salah server pas checkout. Siapkan
                Order ID biar support gak nebak-nebak dari langit.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/lacak"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-[0_0_22px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-1 hover:bg-blue-500"
                >
                  <FaReceipt />
                  Lacak Pesanan
                </Link>

              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-950/70 p-5 shadow-2xl shadow-black/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <FaExclamationTriangle />
              </div>

              <h2 className="text-xl font-black text-white">
                Format chat paling enak
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Kirim data ini biar support langsung bisa cek:
              </p>

              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <p className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  Order ID: <span className="text-blue-400">NX-...</span>
                </p>
                <p className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  Masalah: top up belum masuk / salah server
                </p>
                <p className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3">
                  Screenshot pembayaran kalau ada
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK HELP */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {bantuanCepat.map((item) => {
            const href = getHref(item.href);
            const external = item.href === "whatsapp" || item.href === "email";

            const cardClass =
              "group rounded-3xl border border-gray-800 bg-gray-950/60 p-5 shadow-xl transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:bg-gray-900";

            const content = (
              <>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-all group-hover:bg-blue-500 group-hover:text-white">
                  {item.icon}
                </div>

                <h2 className="text-lg font-black text-white">{item.title}</h2>

                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {item.desc}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-400">
                  {item.label}
                  <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                </div>
              </>
            );

            return external ? (
              <a
                key={item.title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {content}
              </a>
            ) : (
              <Link key={item.title} href={href} className={cardClass}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* INFO + FAQ */}
        <div id="sebelum-panik" className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-gray-800 bg-gray-950/60 p-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
                Sebelum panik
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Cek ini dulu, jangan langsung panik.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Kadang order bukan gagal, cuma statusnya belum update. Jangan
                langsung bikin order baru kalau masih ragu.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {rules.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4"
                >
                  <div className="flex gap-3">
                    <div className="mt-1 text-blue-400">{item.icon}</div>

                    <div>
                      <p className="font-black text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-950/60 p-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">
                FAQ Santai
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Yang sering ditanyain.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Biar masalah kecil gak langsung naik pangkat jadi drama nasional.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {faqItems.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4"
                >
                  <h3 className="text-sm font-black text-white">{item.q}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="mt-8 rounded-3xl border border-gray-800 bg-gradient-to-r from-blue-600/15 via-gray-950 to-blue-500/10 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                Butuh manusia asli?
              </p>

              <h2 className="text-xl font-black text-white">
                Kalau sistem masih ngambek, support turun tangan.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Kirim Order ID dan detail masalah kamu. Tim akan cek status payment,
                provider, dan catatan prosesnya.
              </p>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-[0_0_22px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto"
            >
              <FaWhatsapp />
              Hubungi Support Sekarang
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}