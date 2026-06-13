import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '../app/components/Navbar';
import Footer from '../app/components/Footer';
import AuthProvider from '../app/components/Authprovider';
import FloatingSupport from '../app/components/FloatingSupport';
import MaintenanceBanner from '../app/components/MaintenanceBanner';

const siteUrl = 'https://naxashop.id';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: 'NaXaShop - Top Up Game Sat-Set & Terlacak',
    template: '%s | NaXaShop',
  },

  description:
    'NaXaShop adalah tempat top up game sat-set, jujur, dan terlacak. Pilih game favorit, isi ID, bayar, lalu pantau status pesanan dengan mudah.',

  applicationName: 'NaXaShop',

  keywords: [
    'NaXaShop',
    'top up game',
    'top up game sat-set',
    'top up game terpercaya',
    'top up Mobile Legends',
    'top up Free Fire',
    'top up PUBG Mobile',
    'top up Roblox',
    'top up Honor of Kings',
    'top up Genshin Impact',
    'top up Honkai Star Rail',
    'voucher game',
    'top up game Indonesia',
    'lacak pesanan top up',
  ],

  authors: [{ name: 'NaXaShop' }],
  creator: 'NaXaShop',
  publisher: 'NaXaShop',


  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    title: 'NaXaShop - Top Up Game Sat-Set & Terlacak',
    description:
      'Top up game favorit kamu dengan proses sat-set, jujur, dan bisa dilacak. Mobile Legends, Free Fire, PUBG Mobile, Roblox, Anime RPG, dan voucher game.',
    url: siteUrl,
    siteName: 'NaXaShop',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/banner-seo.jpg',
        width: 1200,
        height: 630,
        alt: 'NaXaShop - Top Up Game Sat-Set & Terlacak',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'NaXaShop - Top Up Game Sat-Set & Terlacak',
    description:
      'Top up game sat-set, jujur, dan terlacak. Pilih game, isi ID, bayar, lalu pantau status pesanan.',
    images: ['/banner-seo.jpg'],
  },

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png' }],
  },

  category: 'gaming',
};

export const viewport = {
  themeColor: '#082447',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'NaXaShop',
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
    },
    {
      '@type': 'WebSite',
      name: 'NaXaShop',
      url: siteUrl,
      inLanguage: 'id-ID',
    },
    {
      '@type': 'OnlineStore',
      name: 'NaXaShop',
      url: siteUrl,
      description:
        'Tempat top up game sat-set, jujur, dan terlacak untuk berbagai game populer.',
      areaServed: {
        '@type': 'Country',
        name: 'Indonesia',
      },
      paymentAccepted: ['QRIS', 'Virtual Account', 'E-Wallet'],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.className} suppressHydrationWarning>
      <body className="min-h-screen bg-[#061426] text-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />

        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#0b2d57_0%,#061426_42%,#020617_100%)]">
            <Navbar />
            <MaintenanceBanner />

            <main className="flex-grow">
              {children}
            </main>

            <Footer />
          </div>
        </AuthProvider>

        <FloatingSupport />
      </body>
    </html>
  );
}