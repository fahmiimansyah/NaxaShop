"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Swal from "sweetalert2";
import { signOut } from "next-auth/react";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaReceipt,
  FaHeadset,
  FaHistory,
  FaUserCircle,
  FaShieldAlt,
  FaSignOutAlt,
  FaSignInAlt,
  FaSearch,
} from "react-icons/fa";
import GlobalGameSearchModal from "./GlobalGameSearchModal";

const EMAIL_CEO = "fahmiimansyah28@gmail.com";

const menuItems = [
  { name: "Beranda", href: "/", icon: FaHome },
  { name: "Cek Pesanan", href: "/lacak", icon: FaReceipt },
  { name: "Riwayat Transaksi", href: "/akun/riwayat", icon: FaHistory },
  { name: "Bantuan", href: "/support", icon: FaHeadset },
];

function getNamaUser(session) {
  return session?.user?.name || session?.user?.email?.split("@")?.[0] || "User";
}

function getInisialUser(nama = "U") {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
}

function isActivePath(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href.includes("#")) return false;

  return pathname === href || pathname?.startsWith(`${href}/`);
}

function Logo({ onClick }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="group inline-flex items-center"
      aria-label="NaXaShop Home"
    >
      <div className="leading-none">
        <h1 className="text-xl font-black tracking-tight sm:text-2xl">
          <span className="text-blue-500 transition group-hover:text-blue-400">
            NaXa
          </span>
          <span className="text-white">Shop</span>
          <span className="ml-2 hidden rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-1 align-middle text-[10px] font-black text-blue-200 sm:inline-flex">
            .id
          </span>
        </h1>

        <p className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100/35 sm:block">
          Top Up Digital
        </p>
      </div>
    </Link>
  );
}

function DesktopNavLink({ item, pathname }) {
  const aktif = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={`rounded-2xl px-4 py-2 text-sm font-black transition-all duration-300 ${
        aktif
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
          : "text-blue-100/65 hover:bg-blue-500/10 hover:text-white"
      }`}
    >
      {item.name}
    </Link>
  );
}

function MobileMenuLink({ item, pathname, onClick }) {
  const Icon = item.icon;
  const aktif = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center justify-between rounded-2xl border px-3.5 py-3.5 transition-all duration-300 ${
        aktif
          ? "border-blue-400/40 bg-blue-600 text-white shadow-lg shadow-blue-950/30"
          : "border-blue-800/40 bg-blue-950/35 text-blue-100 hover:border-blue-400/40 hover:bg-blue-800/45"
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            aktif ? "bg-white/15" : "bg-blue-500/10"
          }`}
        >
          <Icon className="text-xs" />
        </span>

        <span className="text-sm font-black">{item.name}</span>
      </span>

      <span
        className={`text-base transition ${
          aktif ? "text-white" : "text-blue-200/40 group-hover:text-white"
        }`}
      >
        →
      </span>
    </Link>
  );
}

export default function NavbarUI({ session }) {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const namaUser = useMemo(() => getNamaUser(session), [session]);
  const inisialUser = useMemo(() => getInisialUser(namaUser), [namaUser]);
  const isCEO = session?.user?.email === EMAIL_CEO;

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    Swal.fire({
      title: "Keluar dari akun?",
      text: "Kamu tetap bisa masuk lagi kapan saja untuk cek riwayat dan pesanan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "Ya, keluar",
      cancelButtonText: "Batal",
      background: "#061426",
      color: "#ffffff",
    }).then((result) => {
      if (result.isConfirmed) {
        signOut({ callbackUrl: "/" });
      }
    });
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-blue-800/30 bg-[#061426]/86 text-white shadow-lg shadow-blue-950/20 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/55 to-transparent" />

        <nav className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[64px] items-center justify-between gap-3 sm:h-[68px]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className=" cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-800/45 bg-blue-950/45 text-blue-50 transition hover:border-blue-400/40 hover:bg-blue-800/55 lg:hidden"
                aria-label="Buka menu NaXaShop"
              >
                <FaBars />
              </button>

              <Logo />
            </div>

            <div className="hidden items-center rounded-3xl border border-blue-800/35 bg-blue-950/35 p-1.5 shadow-inner shadow-blue-950/20 lg:flex">
              {menuItems.map((item) => (
                <DesktopNavLink
                  key={item.name}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className=" cursor-pointer flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-800/45 bg-blue-950/45 px-3 text-xs font-black text-blue-50 transition hover:border-blue-400/40 hover:bg-blue-800/55 sm:px-4"
                aria-label="Cari game"
              >
                <FaSearch className="text-sm" />
                <span className="hidden sm:inline">Cari Game</span>
              </button>

              {session ? (
                <>
                  <Link
                    href="/akun/riwayat"
                    className="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500 md:hidden"
                    aria-label="Buka akun"
                  >
                    {inisialUser}
                  </Link>

                  <Link
                    href="/akun/riwayat"
                    className="hidden max-w-[240px] items-center gap-3 rounded-3xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 transition hover:border-blue-400/35 hover:bg-blue-500/15 md:flex"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-950/25">
                      {inisialUser}
                    </span>

                    <span className="min-w-0 leading-tight">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/40">
                        Akun
                      </span>
                      <span className="block truncate text-sm font-black text-blue-50">
                        {namaUser}
                      </span>
                    </span>
                  </Link>

                  {isCEO && (
                    <Link
                      href="/admin"
                      className="hidden items-center gap-2 rounded-3xl border border-blue-400/25 bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500 sm:flex"
                    >
                      <FaShieldAlt />
                      Admin
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden rounded-3xl border border-blue-800/40 bg-blue-950/45 px-4 py-2.5 text-xs font-black text-blue-100 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-100 md:inline-flex"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-950/35 transition hover:-translate-y-0.5 hover:bg-blue-500 sm:px-5 sm:text-sm"
                >
                  <FaSignInAlt className="hidden text-xs sm:block" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 270 }}
              className="fixed left-0 top-0 z-[90] h-dvh w-[82%] max-w-[290px] overflow-y-auto border-r border-blue-800/40 bg-[#061426] p-4 text-white shadow-2xl shadow-blue-950/50 lg:hidden"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.14),transparent_32%)]" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <Logo onClick={closeMenu} />

                  <button
                    type="button"
                    onClick={closeMenu}
                    className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-800/45 bg-blue-950/45 text-blue-50 transition hover:border-blue-400/40 hover:bg-blue-800/55"
                    aria-label="Tutup menu NaXaShop"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                {session ? (
                  <div className="mt-5 rounded-[22px] border border-blue-500/20 bg-blue-500/10 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-950/25">
                        {inisialUser}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-100/50">
                          Halo,
                        </p>
                        <p className="truncate text-base font-black text-white">
                          {namaUser}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed text-blue-100/45">
                      Cek riwayat, pantau pesanan, dan akses bantuan dari satu
                      akun.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href="/akun/riwayat"
                        onClick={closeMenu}
                        className="rounded-2xl bg-white px-3 py-2 text-center text-xs font-black text-blue-950 transition hover:bg-blue-50"
                      >
                        Riwayat
                      </Link>

                      {isCEO ? (
                        <Link
                          href="/admin"
                          onClick={closeMenu}
                          className="rounded-2xl bg-blue-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-blue-500"
                        >
                          Admin
                        </Link>
                      ) : (
                        <Link
                          href="/lacak"
                          onClick={closeMenu}
                          className="rounded-2xl bg-blue-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-blue-500"
                        >
                          Cek Order
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-blue-500/20 bg-blue-500/10 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/25">
                        <FaUserCircle />
                      </div>

                      <div>
                        <p className="text-sm font-black text-white">
                          Masuk ke NaXaShop
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-blue-100/45">
                          Login untuk melihat riwayat dan memantau pesanan dari
                          akun kamu.
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-500"
                    >
                      <FaSignInAlt />
                      Login Sekarang
                    </Link>
                  </div>
                )}

                <div className="mt-5">
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-blue-100/35">
                    Menu
                  </p>

                  <div className="grid gap-2.5">
                    {menuItems.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <MobileMenuLink
                          item={item}
                          pathname={pathname}
                          onClick={closeMenu}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {session && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-100 transition hover:border-red-300/40 hover:bg-red-500/15"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                )}

                <div className="mt-6 border-t border-blue-800/35 pt-4">
                  <p className="text-center text-[10px] leading-relaxed text-blue-100/35">
                    Setiap pesanan tercatat dengan Order ID agar lebih mudah
                    dipantau kapan pun dibutuhkan.
                  </p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <GlobalGameSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}