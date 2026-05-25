import Link from "next/link";
import {
  FaInstagram,
  FaDiscord,
  FaTiktok,
  FaWhatsapp,
  FaShieldAlt,
  FaBolt,
  FaReceipt,
  FaHeadset,
  FaUndoAlt
} from "react-icons/fa";

const navigationLinks = [
  { label: " Beranda Utama", href: "/" },
  { label: " Jelajah Game", href: "/" },
  { label: " Cek Status Pesanan", href: "/lacak" },
  { label: " Hubungi Admin Lu", href: "/support" },
];

const popularGames = [
  "Mobile Legends",
  "Valorant", 
  "Genshin Impact",
  "Honkai: Star Rail",
];

const paymentMethods = [
  "QRIS",
  "GoPay",
  "ShopeePay",
  "OVO",
  "DANA",
  "BCA VA",
  "BNI VA",
  "BRI VA",
  "Mandiri",
];

const trustItems = [
  {
    icon: <FaShieldAlt />,
    title: "Aman 100%",
    desc: "Pembayaran dicek otomatis lewat sistem, bukan feeling admin.",
  },
  {
  icon: <FaUndoAlt />,
  title: "Top up gak masuk?",
  desc: "Tenang, order dicek ulang. Kalau valid gagal terkirim, diproses ulang atau refund sesuai ketentuan.",
},
  {
    icon: <FaBolt />,
    title: "Sat-set Masuk",
    desc: "Bayar sukses, order langsung meluncur masuk antrean proses.",
  },
  {
    icon: <FaReceipt />,
    title: "Transparan",
    desc: "Ada Order ID, status bayar, dan status top up yang jelas bre.",
  },
];

export default function Footer() {
  const adminWhatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "";
  const whatsappLink = adminWhatsapp ? `https://wa.me/${adminWhatsapp}` : "#";

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white ">
    {/* GARIS TIPIS ATAS */}
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {/* GLOW */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-40 top-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {/* MINI HERO FOOTER */}
        <div className="mb-10 rounded-3xl border border-gray-800 bg-gray-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-blue-400">
                NaXaShop Official
              </p>

              <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                Top up sat-set otomatis 24 jam non-stop
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                Dibangun penuh cinta oleh NaXa Team. Bayar gampang, order kebaca, status bisa dilacak. Dibikin biar lu gak perlu panik nunggu top up sambil refresh halaman kayak nunggu chat dibales.
              </p>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-[0_0_22px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto"
            >
              <FaHeadset />
              Ngobrol sama Admin
            </a>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* BRAND */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
            <Link href="/" className="inline-flex items-center">
              <span className="text-3xl font-black tracking-tight text-blue-500">
                NaXa
              </span>
              <span className="text-3xl font-black tracking-tight text-white">
                Shop
              </span>
            </Link>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 transition-all hover:-translate-y-1 hover:border-blue-500/40"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    {item.icon}
                  </div>

                  <p className="text-sm font-black text-white">
                    {item.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {[
                { label: "Instagram", href: "https://instagram.com/", icon: <FaInstagram /> },
                { label: "Discord", href: "https://discord.com/", icon: <FaDiscord /> },
                { label: "TikTok", href: "https://tiktok.com/", icon: <FaTiktok /> },
                { label: "WhatsApp", href: whatsappLink, icon: <FaWhatsapp /> },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-lg text-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-500"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* NAVIGATION */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6">
            <h3 className="text-lg font-black text-white">Peta Jalan</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Jalur cepat biar lu gak nyasar bre.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {navigationLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold text-gray-400 transition-all hover:bg-blue-500/10 hover:text-blue-400"
                >
                  <span>{item.label}</span>
                  <span className="opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* GAMES */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6">
            <h3 className="text-lg font-black text-white">Etalase Utama</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Buat lu yang lagi gacha waifu atau ngejar rank mythic.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {popularGames.map((game) => (
                <div
                  key={game}
                  className="rounded-2xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:text-blue-400"
                >
                  {game}
                </div>
              ))}
            </div>
          </div>

          {/* PAYMENT */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Garansi Dapur</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Pilih yang paling cocok sama saldo lu hari ini.
                </p>
              </div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black text-blue-300">
                100% Secured
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {paymentMethods.map((item) => (
                <div
                  key={item}
                  className="flex h-11 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 px-2 text-center text-[11px] font-black text-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
              <p className="text-xs font-bold leading-relaxed text-gray-400">
              Pembayaran diproses lewat payment gateway resmi, dan setiap order punya jejak status yang bisa dicek.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-10 flex flex-col gap-5 border-t border-gray-800 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-center text-xs text-gray-500 md:text-left">
              © {new Date().getFullYear()} <span className="font-bold text-gray-400">NaXaShop Headquarters</span>.
            </p>
            <p className="text-[10px] text-gray-600 max-w-2xl text-center md:text-left">
              Disclaimer: NaXaShop adalah platform alternatif pihak ketiga dan sama sekali tidak terafiliasi resmi dengan Moonton, HoYoverse, Riot Games, atau developer manapun.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold">
            <Link href="/privacy" className="text-gray-500 transition-colors hover:text-blue-400">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-500 transition-colors hover:text-blue-400">Terms</Link>
            <Link href="/support" className="text-gray-500 transition-colors hover:text-blue-400">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}