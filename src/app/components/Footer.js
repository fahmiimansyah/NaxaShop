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
} from "react-icons/fa";

const hideFooterRoutes = [
  "/pembayaran",
  "/lacak",
  "/admin",
  "/login",
  "/register",
  "/akun/riwayat",
  "/support",
  "/privacy",
  "/refund",
  "/terms"
];

const quickLinks = [
  { label: "Beranda", href: "/" },
  { label: "Cek Pesanan", href: "/lacak" },
  { label: "Bantuan", href: "/support" },
  { label: "Riwayat", href: "/akun/riwayat" },
];

const legalLinks = [
  { label: "Syarat", href: "/terms" },
  { label: "Privasi", href: "/privacy" },
  { label: "Refund", href: "/refund" },
];

const trustItems = [
  {
    icon: <FaShieldAlt />,
    title: "Aman",
    desc: "Order tercatat rapi",
  },
  {
    icon: <FaReceipt />,
    title: "Terlacak",
    desc: "Pantau via Order ID",
  },
  {
    icon: <FaBolt />,
    title: "Sat-set",
    desc: "Alur top up ringkas",
  },
];

const paymentMethods = ["QRIS", "E-Wallet", "Virtual Account", "Minimarket"];

function cleanPhoneNumber(value = "") {
  return value.replace(/[^0-9]/g, "");
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-bold text-slate-400 transition hover:text-sky-300"
    >
      {children}
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();

  const adminWhatsapp = cleanPhoneNumber(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "");
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
  const tiktokUrl = process.env.NEXT_PUBLIC_TIKTOK_URL || "";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  const whatsappMessage = encodeURIComponent(
    "Halo admin NaXaShop, saya butuh bantuan terkait order/top-up."
  );
  const whatsappLink = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${whatsappMessage}`
    : "";

  const shouldHideFooter = hideFooterRoutes.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (shouldHideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#020617] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="grid gap-6 p-5 md:grid-cols-[1.25fr_0.75fr] md:p-6 lg:p-7">
            <div>
              <Link href="/" className="inline-flex items-center gap-1">
                <span className="text-2xl font-black tracking-tight text-sky-400">
                  NaXa
                </span>
                <span className="text-2xl font-black tracking-tight text-white">
                  Shop
                </span>
                <span className="ml-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-black text-sky-200">
                  .id
                </span>
              </Link>

              <h2 className="mt-3 max-w-xl text-lg font-black leading-snug text-white sm:text-xl">
                Top up game yang simpel, elegan, dan statusnya jelas.
              </h2>

              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400 sm:text-sm">
                Pilih game, isi ID, bayar, lalu pantau pesanan lewat Order ID.
                NaXaShop dibikin biar proses top up terasa lebih rapi dan gak
                bikin nebak-nebak.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {trustItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sky-300">
                      <span className="text-sm">{item.icon}</span>
                      <p className="text-sm font-black text-white">{item.title}</p>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-950/30">
                  <FaHeadset />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Butuh bantuan?</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Cek status dulu, kalau masih bingung admin siap bantu lihat
                    detail order kamu.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/lacak"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
                >
                  <FaReceipt />
                  Cek Pesanan
                </Link>

                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <FaWhatsapp />
                    Chat Admin
                  </a>
                ) : (
                  <Link
                    href="/support"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <FaHeadset />
                    Pusat Bantuan
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-t border-white/10 px-5 py-5 md:grid-cols-[1fr_1fr_1.15fr] md:px-6 lg:px-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Navigasi
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {quickLinks.map((item) => (
                  <FooterLink key={item.label} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                Legal
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {legalLinks.map((item) => (
                  <FooterLink key={item.label} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                <FaCheckCircle className="text-emerald-400" />
                Pembayaran
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {paymentMethods.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-[11px] font-black text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6 lg:px-7 text-center">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                © {new Date().getFullYear()} <span className="font-black text-slate-300">NaXaShop.id</span>. Dibangun buat top up yang lebih Sat-Set.
              </p>
              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600 text-center">
                NaXaShop adalah platform alternatif pihak ketiga dan tidak
                terafiliasi resmi dengan publisher atau developer game manapun.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-slate-300 transition hover:border-sky-400/40 hover:text-sky-200"
                >
                  Support Email
                </a>
              )}

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram NaXaShop"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-sky-500"
                >
                  <FaInstagram />
                </a>
              )}

              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok NaXaShop"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-sky-500"
                >
                  <FaTiktok />
                </a>
              )}

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp NaXaShop"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500"
                >
                  <FaWhatsapp />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
