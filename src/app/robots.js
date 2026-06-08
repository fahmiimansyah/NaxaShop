const siteUrl = 'https://naxashop.id';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/akun',
          '/akun/',
          '/pembayaran',
          '/pembayaran/',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}