'use client';

import { usePathname } from 'next/navigation';

export default function FloatingSupport() {
  const pathname = usePathname();
  const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  if (!nomorAdmin) return null;

  const halamanTanpaFloatingSupport =
    pathname.startsWith('/topup') ||
    pathname.startsWith('/pembayaran') ||
    pathname.startsWith('/lacak') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  if (halamanTanpaFloatingSupport) return null;

  const pesan = encodeURIComponent(
    'Halo admin NaXaShop, saya butuh bantuan terkait order/top-up.'
  );

  const linkWa = `https://wa.me/${nomorAdmin}?text=${pesan}`;

  return (
    <a
      href={linkWa}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-[999] group"
      aria-label="Chat admin NaXaShop"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-green-500 blur-xl opacity-30 group-hover:opacity-50 transition rounded-full"></div>

        <div className="relative flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white px-4 py-3 rounded-full shadow-2xl border border-green-300/30 transition-all hover:-translate-y-1">
          <span className="text-xl">💬</span>
          <span className="hidden sm:block text-sm font-black">
            Bantuan
          </span>
        </div>
      </div>
    </a>
  );
}