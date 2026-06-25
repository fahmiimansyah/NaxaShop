"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaInstagram,
  FaTiktok,
  FaEnvelope,
  FaReceipt,
  FaHeadset,
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
  "/terms",
  "/fakechat"
];

const quickLinks = [
  { label: "Beranda", href: "/" },
  { label: "Cek Pesanan", href: "/lacak" },
  { label: "Bantuan", href: "/support" },
  { label: "Riwayat", href: "/akun/riwayat" },
];

const legalLinks = [
  { label: "Syarat & Ketentuan", href: "/terms" },
  { label: "Kebijakan Privasi", href: "/privacy" },
  { label: "Refund", href: "/refund" },
];

function cleanPhoneNumber(value = "") {
  return value.replace(/[^0-9]/g, "");
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-blue-100/55 transition hover:text-blue-200"
    >
      {children}
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();

  const adminWhatsapp = cleanPhoneNumber(
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || ""
  );
  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
  const tiktokUrl = process.env.NEXT_PUBLIC_TIKTOK_URL || "";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  const whatsappMessage = encodeURIComponent(
    "Halo Tim NaXaShop, saya butuh bantuan terkait order/top-up."
  );

  const whatsappLink = adminWhatsapp
    ? `https://wa.me/${adminWhatsapp}?text=${whatsappMessage}`
    : "";

  const shouldHideFooter = hideFooterRoutes.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (shouldHideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-blue-800/30  text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.16),transparent_36%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-9 md:grid-cols-[1.35fr_0.7fr_0.8fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-black tracking-tight text-blue-500">
                NaXa
              </span>
              <span className="text-2xl font-black tracking-tight text-white">
                Shop
              </span>
              <span className="ml-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-200">
                .id
              </span>
            </Link>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/55">
             NaXaShop bantu kamu top up game dengan alur ringkas, status pesanan yang jelas, dan support yang gak bikin kamu merasa ngomong sama tembok.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/lacak"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
              >
                <FaReceipt />
                Cek Pesanan
              </Link>

              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-100 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-blue-500/15"
              >
                <FaHeadset />
                Pusat Bantuan
              </Link>
            </div>
          </div>

          {/* Navigasi */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/35">
              Navigasi
            </p>

            <div className="mt-4 grid gap-2.5">
              {quickLinks.map((item) => (
                <FooterLink key={item.label} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/35">
              Informasi
            </p>

            <div className="mt-4 grid gap-2.5">
              {legalLinks.map((item) => (
                <FooterLink key={item.label} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}

              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100/55 transition hover:text-blue-200"
                >
                  <FaEnvelope className="text-xs" />
                  Email Support
                </a>
              )}
            </div>


            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/35 mt-5">
                Ikuti Kami
              </p>
            <div className="mt-5 flex gap-2">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram NaXaShop"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-sm text-blue-100 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-blue-600"
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
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-sm text-blue-100 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-blue-600"
                >
                  <FaTiktok />
                </a>
              )}

            </div>
          </div>
        </div>

        <div className="mt-9 border-t border-blue-800/30 pt-5">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <p className="text-xs font-semibold text-blue-100/45">
              © {new Date().getFullYear()}{" "}
              <span className="font-black text-blue-100">NaXaShop.id</span>.
              Dibuat untuk top up yang rapi, jelas, dan gak banyak drama.
            </p>

            <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-blue-100/35 sm:mx-0 sm:max-w-md sm:text-right">
             NaXaShop adalah platform alternatif pihak ketiga dan tidak
terafiliasi resmi dengan publisher/developer game manapun.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}