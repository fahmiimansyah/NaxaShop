import db from './lib/db';

const siteUrl = 'https://naxashop.id';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function bikinUrl(path = '') {
  return `${siteUrl}${path}`;
}

export default async function sitemap() {
  const sekarang = new Date();

  const halamanStatis = [
    {
      url: bikinUrl('/'),
      lastModified: sekarang,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: bikinUrl('/support'),
      lastModified: sekarang,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: bikinUrl('/refund'),
      lastModified: sekarang,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: bikinUrl('/privacy'),
      lastModified: sekarang,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: bikinUrl('/terms'),
      lastModified: sekarang,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  try {
    const [games] = await db.query(
      `SELECT id, slug
       FROM games
       WHERE COALESCE(status_game, 'aktif') IN ('aktif', 'coming_soon')
       ORDER BY id DESC`
    );

    const halamanGame = games.map((game) => ({
      url: bikinUrl(`/topup/${game.slug || game.id}`),
      lastModified: sekarang,
      changeFrequency: 'daily',
      priority: 0.9,
    }));

    return [...halamanStatis, ...halamanGame];
  } catch (error) {
    console.error('Gagal generate sitemap game:', error);

    return halamanStatis;
  }
}
