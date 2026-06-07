import './globals.css';
import { Montserrat } from 'next/font/google';
import Navbar from '../app/components/Navbar';
import Footer from '../app/components/Footer';
import AuthProvider from '../app/components/Authprovider';
import FloatingSupport from '../app/components/FloatingSupport'  

// 1. SETTING FONT MONTSERRAT BIAR ELEGAN & KENCENG
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-montserrat', // Bikin variabel CSS kalo butuh
});

// 2. RACIKAN JALUR NINJA SEO POWERFULL (PAGE 1 GOOGLE GENERATION)
export const metadata = {
  title: 'NaXaShop - Top Up Game Murah, Cepat & Terpercaya',
  description: 'Tempat top up game terpercaya di Indonesia. Top up Mobile Legends, Genshin Impact, Honkai: Star Rail otomatis 24 jam lunas langsung masuk pake QRIS dan VA BCA.',
  keywords: [
    'top up naxashop', 'naxashop', 'top up game murah', 'top up mlbb murah', 
    'weekly diamond pass murah', 'top up genshin impact', 'top up honkai star rail', 
    'top up otomatis 24 jam', 'qris top up game'
  ],
  authors: [{ name: 'NaXaShop Team' }],
  
  // Biar GoogleBot gampang ngerayapin web lu
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // PREVIEW ESTETIK PAS LINK DI-SHARE KE WA / DISCORD / FB (OpenGraph)
  openGraph: {
    title: 'NaXaShop - Top Up Game Termurah & Otomatis',
    description: 'Beli Diamond MLBB, Oneiric Shard HSR, Primogems GI instant hitungan detik gratis biaya admin!',
    url: 'https://naxashop.id', // Ganti pake domain asli lu nanti bre
    siteName: 'NaXaShop',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: 'https://naxashop.id/banner-seo.jpg', // Taruh gambar banner keren di folder public lu
        width: 1200,
        height: 630,
        alt: 'NaXaShop - Platform Top Up Game Tercepat',
      },
    ],
  },

  // PREVIEW UNTUK TWITTER / X
  twitter: {
    card: 'summary_large_image',
    title: 'NaXaShop - Top Up Game Otomatis',
    description: 'Gak usah nunggu admin, transfer langsung masuk 24 jam non-stop!',
    images: ['https://naxashop.id/banner-seo.jpg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={montserrat.className}>
      <body className="bg-slate-950 text-white antialiased flex flex-col min-h-screen">
        <AuthProvider>
        {/* Navbar otomatis muncul di paling atas semua halaman */}
        <Navbar />

        {/* Area Konten Utama Halaman (Kasir, Pembayaran, Lacak, dll) */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer otomatis nangkring di paling bawah */}
        <Footer />
        </AuthProvider>
        <FloatingSupport />  
      </body>
    </html>
  );
}