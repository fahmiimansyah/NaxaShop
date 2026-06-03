"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
  FaShieldAlt,
  FaReceipt,
  FaHeadset,
  FaBolt,
  FaCheckCircle,
  FaChevronDown,
  FaUsers,
  FaGamepad,
} from "react-icons/fa";

const hideFooterRoutes = [
  "/pembayaran",
  "/lacak",
  "/admin",
  "/login",
  "/register",
  "/akun/riwayat"
];

const trustItems = [
  {
    icon: <FaShieldAlt />,
    title: "Aman dicek",
    desc: "Setiap order punya ID transaksi buat pantau statusnya.",
  },
  {
    icon: <FaReceipt />,
    title: "Status jelas",
    desc: "Cek pesanan kapan aja lewat halaman lacak order.",
  },
  {
    icon: <FaBolt />,
    title: "Alur ringkas",
    desc: "Pilih game, isi ID, bayar, lalu pantau prosesnya.",
  },
];

const quickLinks = [
  { label: "Beranda", href: "/" },
  { label: "Cek Pesanan", href: "/lacak" },
  { label: "Bantuan", href: "/support" },
  { label: "Syarat", href: "/terms" },
  { label: "Privasi", href: "/privacy" },
  { label: "Refund", href: "/refund" },
];

const paymentMethods = ["QRIS", "GoPay", "ShopeePay", "VA Bank", "Minimarket"];

function FooterAccordion({ icon, title, children, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-gray-800 bg-gray-950/60 p-4 transition-all duration-300 open:border-blue-500/30 open:bg-blue-500/5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-sm text-blue-400">
            {icon}
          </div>

          <p className="text-sm font-black text-white">{title}</p>
        </div>

        <FaChevronDown className="text-xs text-gray-500 transition-transform duration-300 group-open:rotate-180 group-open:text-blue-400" />
      </summary>

      <div className="mt-4 border-t border-gray-800 pt-4 text-[13px] leading-relaxed text-gray-400">
        {children}
      </div>
    </details>
  );
}

export default function Footer() {
  const pathname = usePathname();

  const adminWhatsapp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "";
  const whatsappLink = adminWhatsapp ? `https://wa.me/${adminWhatsapp}` : "#";

  const shouldHideFooter = hideFooterRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (shouldHideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-gray-800 bg-gradient-to-b from-gray-950 to-black text-white">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_55%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* TOP SUMMARY */}
        <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5 shadow-2xl shadow-black/25 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <Link href="/" className="inline-flex items-center">
                <span className="text-xl font-black tracking-tight text-blue-500">
                  NaXa
                </span>
                <span className="text-xl font-black tracking-tight text-white">
                  Shop
                </span>
                <span className="ml-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[9px] font-black text-blue-300">
                  .id
                </span>
              </Link>

              <h2 className="mt-3 max-w-2xl text-base font-black leading-snug text-white sm:text-lg">
                Top up game yang simpel, statusnya jelas, dan gak bikin nebak-nebak.
              </h2>

              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-gray-400">
                NaXaShop dibikin buat bikin proses top up terasa lebih rapi:
                pilih game, isi ID, bayar, lalu pantau pesanan lewat Order ID.
                Kalau ada kendala, tinggal cek status atau hubungi admin.
              </p>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-[0_0_20px_rgba(37,99,235,0.30)] transition-all hover:-translate-y-1 hover:bg-blue-500 sm:w-auto"
            >
              <FaHeadset />
              Chat Admin
            </a>
          </div>

          {/* TRUST MINI CARDS */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-800 bg-gray-950/60 p-4 transition-all hover:-translate-y-1 hover:border-blue-500/40"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-sm text-blue-400">
                  {item.icon}
                </div>

                <p className="text-[13px] font-black text-white">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ACCORDION SUMMARY */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <FooterAccordion icon={<FaUsers />} title="Siapa Kami?">
            <p>
              NaXaShop adalah platform top up game dan produk digital yang
              fokus ke alur yang simpel, status pesanan yang jelas, dan bantuan
              admin kalau order perlu dicek ulang.
            </p>

            <p className="mt-3 text-gray-500">
              Kami bukan mau bikin proses top up jadi ribet. Justru sebaliknya:
              customer bisa pesan dengan tenang karena ada Order ID, halaman
              lacak pesanan, dan riwayat transaksi buat akun yang login.
            </p>
          </FooterAccordion>

          <FooterAccordion icon={<FaGamepad />} title="Kenapa pilih NaXaShop?">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-800 bg-black/20 p-3">
                <p className="text-xs font-black text-white">Gak ribet</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Alurnya pendek: pilih produk, isi ID, bayar.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-black/20 p-3">
                <p className="text-xs font-black text-white">Bisa dilacak</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Order ID bisa dipakai buat cek status pesanan.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-black/20 p-3">
                <p className="text-xs font-black text-white">Ada bantuan</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Kalau ada kendala, admin bisa bantu cek detail order.
                </p>
              </div>
            </div>
          </FooterAccordion>
        </div>

        {/* QUICK LINKS + PAYMENT */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-gray-800 bg-gray-900/65 p-5">
            <p className="text-sm font-black text-white">Jalur Cepat</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-center text-xs font-black text-gray-400 transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:text-blue-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900/65 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">Metode Bayar</p>
                <p className="mt-1 text-xs text-gray-500">
                  Pilih metode yang paling nyaman buat lu.
                </p>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-full border border-green-500/10 bg-green-500/5 px-3 py-2 text-[10px] font-black text-green-300">
                <FaCheckCircle />
                Order terlacak
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {paymentMethods.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-black text-gray-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-6 flex flex-col gap-4 border-t border-gray-800 pt-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-center text-xs text-gray-500 md:text-left">
              © {new Date().getFullYear()}{" "}
              <span className="font-bold text-gray-400">NaXaShop.id</span>.
              Dibangun pelan-pelan, dirapihin terus, biar top up makin waras.
            </p>

            <p className="mt-1 max-w-2xl text-center text-[10px] leading-relaxed text-gray-600 md:text-left">
              NaXaShop adalah platform alternatif pihak ketiga dan tidak
              terafiliasi resmi dengan publisher atau developer game manapun.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-sm text-white transition-all hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-500"
            >
              <FaInstagram />
            </a>

            <a
              href="https://tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-sm text-white transition-all hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-500"
            >
              <FaTiktok />
            </a>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-sm text-white transition-all hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-500"
            >
              <FaWhatsapp />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}