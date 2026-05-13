"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Games", href: "/games" },
    { name: "Contact", href: "/contact" },
  ]

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/70 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="h-16 flex items-center justify-between">

            {/* LEFT */}
            <div className="flex items-center gap-4">

              {/* HAMBURGER */}
              <button
                onClick={() => setOpen(!open)}
                className="w-11 h-11 rounded-xl bg-gray-800/80 border border-gray-700 flex flex-col justify-center items-center gap-1.5 hover:border-blue-500 transition-all duration-300 group"
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
                <h1 className="text-2xl font-black tracking-tight">
                  <span className="text-blue-500">NaXa</span>
                  <span className="text-white">Shop</span>
                </h1>
              </Link>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3">

              {/* SEARCH */}
              <div className="hidden md:flex items-center bg-gray-800/70 border border-gray-700 rounded-xl px-3 h-10 focus-within:border-blue-500 transition-all duration-300">
                
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m0 0A7.65 7.65 0 1 0 5.825 5.825a7.65 7.65 0 0 0 10.825 10.825Z"
                  />
                </svg>

                <input
                  type="text"
                  placeholder="Cari game..."
                  className="bg-transparent outline-none px-2 text-sm text-white placeholder:text-gray-500 w-40"
                />
              </div>

              {/* LOGIN */}
              <button className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 h-10 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <AnimatePresence>
        {open && (
          <>
            {/* BLUR BACKGROUND */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* MENU */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 250,
              }}
              className="fixed top-0 left-0 h-screen w-[280px] bg-gray-900 border-r border-gray-800 z-50 p-6 shadow-2xl"
            >

              {/* HEADER */}
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black">
                  <span className="text-blue-500">NaXa</span>
                  <span className="text-white">Shop</span>
                </h2>

                <button
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all duration-300 text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {/* MENU ITEMS */}
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

              {/* FOOTER */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-xl">
                  <p className="text-white font-semibold">
                    Next Evolution Edition 🔥
                  </p>

                  <p className="text-gray-400 text-sm mt-1">
                    Top Up Game Modern UI
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}