import Link from "next/link"
import {
  FaInstagram,
  FaDiscord,
  FaTiktok,
} from "react-icons/fa"

export default function Footer() {
  return (
<footer className="relative pt-16  overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-black">      
      {/* GLOW */}
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)]"></div>
      <div className="relative max-w-7xl mx-auto px-6 py-14">

        {/* TOP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* BRAND */}
          <div>
            <h2 className="text-3xl font-black">
              <span className="text-blue-500">NaXa</span>
              <span className="text-white">Shop</span>
            </h2>

            <p className="text-gray-400 mt-4 text-sm leading-relaxed">
              Platform top up game modern dengan proses cepat,
              aman, dan tampilan clean ala web topup sultan 🔥
            </p>

            {/* SOCIAL */}
            <div className="flex items-center gap-3 mt-6">

              <a
                href="#"
                className="w-11 h-11 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-blue-500 hover:border-blue-400 transition-all duration-300 hover:scale-110"
              >
                <FaInstagram className="text-white text-lg" />
              </a>

              <a
                href="#"
                className="w-11 h-11 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-blue-500 hover:border-blue-400 transition-all duration-300 hover:scale-110"
              >
                <FaDiscord className="text-white text-lg" />
              </a>

              <a
                href="#"
                className="w-11 h-11 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-blue-500 hover:border-blue-400 transition-all duration-300 hover:scale-110"
              >
                <FaTiktok className="text-white text-lg" />
              </a>
            </div>
          </div>

          {/* NAVIGATION */}
          <div>
            <h3 className="text-white font-bold text-lg mb-5">
              Navigation
            </h3>

            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-gray-400 hover:text-blue-400 transition-colors duration-300"
              >
                Home
              </Link>

              <Link
                href="/games"
                className="text-gray-400 hover:text-blue-400 transition-colors duration-300"
              >
                Games
              </Link>

              <Link
                href="/contact"
                className="text-gray-400 hover:text-blue-400 transition-colors duration-300"
              >
                Contact
              </Link>

              <Link
                href="/promo"
                className="text-gray-400 hover:text-blue-400 transition-colors duration-300"
              >
                Promo
              </Link>
            </div>
          </div>

          {/* POPULAR GAMES */}
          <div>
            <h3 className="text-white font-bold text-lg mb-5">
              Popular Games
            </h3>

            <div className="flex flex-col gap-3">
              <p className="text-gray-400 hover:text-blue-400 transition-colors duration-300 cursor-pointer">
                Mobile Legends
              </p>

              <p className="text-gray-400 hover:text-blue-400 transition-colors duration-300 cursor-pointer">
                Free Fire
              </p>

              <p className="text-gray-400 hover:text-blue-400 transition-colors duration-300 cursor-pointer">
                Genshin Impact
              </p>

              <p className="text-gray-400 hover:text-blue-400 transition-colors duration-300 cursor-pointer">
                Honkai Star Rail
              </p>
            </div>
          </div>

          {/* PAYMENT */}
          <div>
            <h3 className="text-white font-bold text-lg mb-5">
              Payment
            </h3>

            <div className="grid grid-cols-3 gap-3">

              {[
                "DANA",
                "OVO",
                "GOPAY",
                "QRIS",
                "VISA",
                "BCA",
              ].map((item) => (
                <div
                  key={item}
                  className="h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-white hover:border-blue-500 transition-all duration-300 hover:-translate-y-1"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-gray-500 text-sm text-center md:text-left">
            © 2026 NaXaShop — All rights reserved.
          </p>

          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-blue-400 transition-colors duration-300"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="text-gray-500 hover:text-blue-400 transition-colors duration-300"
            >
              Terms
            </Link>

            <Link
              href="/support"
              className="text-gray-500 hover:text-blue-400 transition-colors duration-300"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}