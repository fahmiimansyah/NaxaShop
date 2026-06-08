export const GAME_CATEGORIES = [
  {
    id: 'populer',
    label: 'Paling Laris',
    emoji: '🔥',
    description: 'Game yang paling sering dicari dan cocok buat etalase depan.',
    accent: 'from-amber-500/20 via-orange-500/10 to-slate-950',
  },
  {
    id: 'mobile',
    label: 'Mobile Games',
    emoji: '📱',
    description: 'Top-up game mobile favorit buat harian dan ranked malam.',
    accent: 'from-blue-500/20 via-cyan-500/10 to-slate-950',
  },
  {
    id: 'anime_rpg',
    label: 'Anime RPG',
    emoji: '🌙',
    description: 'Genshin, HSR, Wuthering Waves, ZZZ, dan game RPG sejenis.',
    accent: 'from-violet-500/20 via-fuchsia-500/10 to-slate-950',
  },
  {
    id: 'pc_voucher',
    label: 'PC & Voucher',
    emoji: '🎮',
    description: 'Steam, Valorant, Google Play, Razer Gold, dan voucher digital.',
    accent: 'from-emerald-500/20 via-teal-500/10 to-slate-950',
  },
  {
    id: 'new_release',
    label: 'Baru & Coming Soon',
    emoji: '🆕',
    description: 'Game baru, produk fresh, dan etalase yang sedang disiapkan.',
    accent: 'from-sky-500/20 via-indigo-500/10 to-slate-950',
  },
  {
    id: 'lainnya',
    label: 'Lainnya',
    emoji: '✨',
    description: 'Produk digital lain yang siap dibeli di NaXaShop.',
    accent: 'from-slate-500/20 via-gray-500/10 to-slate-950',
  },
];

export const DEFAULT_GAME_CATEGORY = 'mobile';

export function normalizeKategoriGame(value) {
  const kategori = String(value || '').trim().toLowerCase();
  const validIds = GAME_CATEGORIES.map((item) => item.id);

  if (validIds.includes(kategori)) return kategori;
  return DEFAULT_GAME_CATEGORY;
}

export function getGameCategoryMeta(value) {
  const kategori = normalizeKategoriGame(value);
  return GAME_CATEGORIES.find((item) => item.id === kategori) || GAME_CATEGORIES[0];
}

export function tebakKategoriGame(game = {}) {
  const gabungan = `${game.nama || ''} ${game.publisher || ''} ${game.kode_game || ''}`.toLowerCase();

  if (
    gabungan.includes('mobile legend') ||
    gabungan.includes('mlbb') ||
    gabungan.includes('free fire') ||
    gabungan.includes('pubg') ||
    gabungan.includes('roblox') ||
    gabungan.includes('honor of kings') ||
    gabungan.includes('hok')
  ) {
    return 'populer';
  }

  if (
    gabungan.includes('genshin') ||
    gabungan.includes('honkai') ||
    gabungan.includes('star rail') ||
    gabungan.includes('wuthering') ||
    gabungan.includes('zenless') ||
    gabungan.includes('zzz') ||
    gabungan.includes('rpg')
  ) {
    return 'anime_rpg';
  }

  if (
    gabungan.includes('steam') ||
    gabungan.includes('valorant') ||
    gabungan.includes('riot') ||
    gabungan.includes('google play') ||
    gabungan.includes('razer') ||
    gabungan.includes('voucher') ||
    gabungan.includes('wallet')
  ) {
    return 'pc_voucher';
  }

  if (
    gabungan.includes('coming') ||
    gabungan.includes('baru') ||
    gabungan.includes('new')
  ) {
    return 'new_release';
  }

  return DEFAULT_GAME_CATEGORY;
}

export function kategoriGameDariData(game = {}) {
  const kategoriManual = String(game.kategori_game || '').trim();

  if (kategoriManual) {
    return normalizeKategoriGame(kategoriManual);
  }

  return tebakKategoriGame(game);
}

let kolomKategoriSudahDicek = false;

async function cekKolom(db, namaKolom) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'games'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [namaKolom]
  );

  return rows.length > 0;
}

async function tambahKolomAman(db, sql, namaKolom) {
  try {
    await db.query(sql);
  } catch (error) {
    const pesan = String(error?.message || '').toLowerCase();

    if (error?.code === 'ER_DUP_FIELDNAME' || pesan.includes('duplicate column')) {
      return;
    }

    console.error(`Gagal tambah kolom ${namaKolom}:`, error);
    throw error;
  }
}

export async function ensureGameCategoryColumns(db) {
  if (kolomKategoriSudahDicek) return;

  const adaKategori = await cekKolom(db, 'kategori_game');
  const adaSortOrder = await cekKolom(db, 'sort_order');

  if (!adaKategori) {
    await tambahKolomAman(
      db,
      `ALTER TABLE games
       ADD COLUMN kategori_game VARCHAR(50) NOT NULL DEFAULT '${DEFAULT_GAME_CATEGORY}' AFTER status_game`,
      'kategori_game'
    );
  }

  if (!adaSortOrder) {
    await tambahKolomAman(
      db,
      `ALTER TABLE games
       ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER kategori_game`,
      'sort_order'
    );
  }

  kolomKategoriSudahDicek = true;
}
