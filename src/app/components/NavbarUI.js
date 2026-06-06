"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Swal from 'sweetalert2'
import { signOut } from "next-auth/react" // Jurus panggil Satpam buat Logout

const EMAIL_CEO = 'fahmiimansyah28@gmail.com'

export default function NavbarUI({ session }) { // <--- TERIMA DATA DARI SERVER
  const [open, setOpen] = useState(false)

  const namaUser =
    session?.user?.name ||
    session?.user?.email?.split('@')?.[0] ||
    'User'

  const isCEO = session?.user?.email === EMAIL_CEO

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/" },
    { name: "Cek Pesanan", href: "/lacak" },
    { name: "Bantuan", href: '/support'},
    { name: "Riwayat Transaksi", href: '/akun/riwayat'},
  ]

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/70 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="h-16 flex items-center justify-between">

            {/* LEFT */}
            <div className="flex items-center gap-2 sm:gap-4">

              {/* HAMBURGER */}
              <button
                onClick={() => setOpen(!open)}
                className="w-11 h-11 rounded-xl bg-gray-800/80 border border-gray-700 flex flex-col justify-center items-center gap-1.5 hover:border-blue-500 transition-all duration-300 group cursor-pointer"
                aria-label="Buka menu NaXaShop"
              >
                <motion.span
                  animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  className="w-5 h-[2px] bg-white rounded-full"
                />

                <motion.span
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  className="w-5 h-[2px] bg-white rounded-full"
                />

                <motion.span
                  animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  className="w-5 h-[2px] bg-white rounded-full"
                />
              </button>

              {/* LOGO */}
              <Link href="/">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  <span className="text-blue-500">NaXa</span>
                  <span className="text-white">Shop</span>
                </h1>
              </Link>
            </div>

            {/* RIGHT (BAGIAN VIP) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {session ? (
                // JIKA UDAH LOGIN
                <>
                  <Link
  href="/akun/riwayat"
  className="hidden md:flex max-w-[220px] items-center gap-2 truncate rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/15"
>
  <span className="shrink-0">👋</span>
  <span className="truncate">Halo, {namaUser}</span>
</Link>

<Link
  href="/akun/riwayat"
  aria-label="Buka riwayat transaksi"
  className="md:hidden flex max-w-[88px] items-center gap-1.5 truncate rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-2.5 h-10 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15"
>
  <span className="shrink-0">👋</span>
  <span className="truncate">{namaUser}</span>
</Link>

                  {/* 🔥 TOMBOL RAHASIA CEO (CUMA MUNCUL KALO EMAILNYA COCOK) 🔥 */}
                  {isCEO && (
                    <Link href="/admin" className="hidden sm:flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all mr-1 border border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                      Ruang Rahasia
                    </Link>
                  )}

                  {/* TOMBOL LOGOUT */}
                  <button 
                    onClick={() => {
                      Swal.fire({
                        title: 'Yakin mau cabut bre? 😢',
                        text: "Nanti kalo mau top up harus login lagi lho!",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444', 
                        cancelButtonColor: '#374151', 
                        confirmButtonText: 'Gas, Cabut!',
                        cancelButtonText: 'Eh, gajadi',
                        background: '#1f2937', 
                        color: '#fff' 
                      }).then((result) => {
                        if (result.isConfirmed) {
                          signOut({ callbackUrl: '/' });
                        }
                      })
                    }} 
                    className="bg-red-500/10 border border-red-500/50 hover:bg-red-500 text-red-500 hover:text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 h-10 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                // JIKA BELUM LOGIN
                <Link 
                  href="/login" 
                  className="bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white text-sm font-semibold px-4 h-10 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                >
                  Login
                </Link>
              )}
            </div>
          </div>


        </div>
      </nav>

      {/* SIDEBAR LU YANG KEREN DIBIARIN AJA */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 h-screen w-[280px] bg-gray-900 border-r border-gray-800 z-50 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black">
                  <span className="text-blue-500">NaXa</span>
                  <span className="text-white">Shop</span>
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all duration-300 text-white text-xl"
                  aria-label="Tutup menu NaXaShop"
                >
                  ✕
                </button>
              </div>
              
              {session && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-4 bg-gray-800/50 rounded-2xl border border-cyan-500/30 flex flex-col gap-1"
                >
                  <p className="text-xs text-gray-400 font-medium">Haloo,</p>
                  <p className="text-xl font-bold text-cyan-400 truncate">{namaUser}</p>
                  <p className="text-xs text-gray-500">Gunakan uang kamu sebaik mungkin yaa!!</p>
                  
                  {/* 🔥 TOMBOL RAHASIA CEO DI DALAM SIDEBAR HP 🔥 */}
                  {isCEO && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="mt-3 text-center py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold rounded-lg transition-all border border-blue-500/50">
                      Masuk Ruang Rahasia
                    </Link>
                  )}
                </motion.div>
              )}

              <div className="flex flex-col gap-3">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between bg-gray-800/70 hover:bg-blue-500 rounded-2xl px-5 py-4 transition-all duration-300 border border-gray-700 hover:border-blue-400"
                    >
                      <span className="font-medium text-white text-lg">
                        {item.name}
                      </span>
                      <span className="text-gray-400 group-hover:text-white transition-colors duration-300">
                        →
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
