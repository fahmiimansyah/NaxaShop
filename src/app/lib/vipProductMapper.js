function normalisasiText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ambilValue(row, daftarNamaKolom) {
  const keys = Object.keys(row || {});

  for (const target of daftarNamaKolom) {
    const targetNormal = normalisasiText(target);

    const keyKetemu = keys.find((key) => {
      const keyNormal = normalisasiText(key);
      return (
        keyNormal === targetNormal ||
        keyNormal.includes(targetNormal) ||
        targetNormal.includes(keyNormal)
      );
    });

    if (keyKetemu) return row[keyKetemu];
  }

  return "";
}

function ubahKeAngka(value) {
  const angka = String(value || "").replace(/[^\d]/g, "");
  return Number(angka || 0);
}

const DAFTAR_GAME = [
  {
    key: "mobile-legends",
    nama: "Mobile Legends",
    keywords: ["mobile legends", "mlbb", "ml ", "diamond ml", "dm ml"],
  },
  {
    key: "free-fire",
    nama: "Free Fire",
    keywords: ["free fire", "ff ", "diamond ff", "dm ff"],
  },
  {
    key: "genshin-impact",
    nama: "Genshin Impact",
    keywords: ["genshin", "genesis crystal", "welkin"],
  },
  {
    key: "honkai-star-rail",
    nama: "Honkai Star Rail",
    keywords: ["honkai star rail", "hsr", "oneiric", "express supply"],
  },
  {
    key: "pubg-mobile",
    nama: "PUBG Mobile",
    keywords: ["pubg", "uc pubg"],
  },
  {
    key: "valorant",
    nama: "Valorant",
    keywords: ["valorant", "vp valorant"],
  },
];

function deteksiGame(namaProduk) {
  const nama = ` ${normalisasiText(namaProduk)} `;

  for (const game of DAFTAR_GAME) {
    const cocok = game.keywords.some((keyword) => {
      return nama.includes(` ${normalisasiText(keyword)} `) || nama.includes(normalisasiText(keyword));
    });

    if (cocok) return game;
  }

  return null;
}

function bersihkanNamaProduk(namaProduk, game) {
  let hasil = String(namaProduk || "");

  if (game) {
    hasil = hasil.replace(new RegExp(game.nama, "gi"), "");
  }

  hasil = hasil
    .replace(/mobile legends|mlbb|free fire|genshin impact|honkai star rail|pubg mobile|valorant/gi, "")
    .replace(/indonesia|indo|id server|server id|sea|global/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return hasil || String(namaProduk || "").trim();
}

function hitungHargaJual(hargaModal) {
  if (!hargaModal) return 0;

  const markupPersen = 10;
  const hargaDenganMarkup = hargaModal + hargaModal * (markupPersen / 100);

  return Math.ceil(hargaDenganMarkup / 100) * 100;
}

function deteksiStatus(statusRaw, namaProduk) {
  const gabungan = normalisasiText(`${statusRaw} ${namaProduk}`);

  if (
    gabungan.includes("gangguan") ||
    gabungan.includes("close") ||
    gabungan.includes("maintenance") ||
    gabungan.includes("nonaktif") ||
    gabungan.includes("off")
  ) {
    return "nonaktif";
  }

  return "aktif";
}

export function mapVipProdukRow(row, index) {
  const kodeProdukProvider =
    ambilValue(row, [
      "kode",
      "kode produk",
      "kode_produk",
      "product code",
      "sku",
      "code",
    ]) || `VIP-ROW-${index + 1}`;

  const namaProdukRaw =
    ambilValue(row, [
      "nama",
      "nama produk",
      "produk",
      "product",
      "product name",
      "layanan",
    ]) || "";

  const hargaModal = ubahKeAngka(
    ambilValue(row, [
      "harga",
      "harga modal",
      "price",
      "harga reseller",
      "harga vip",
    ])
  );

  const statusRaw = ambilValue(row, [
    "status",
    "status produk",
    "keterangan",
  ]);

  const game = deteksiGame(namaProdukRaw);
  const namaProdukFinal = bersihkanNamaProduk(namaProdukRaw, game);
  const hargaJual = hitungHargaJual(hargaModal);
  const statusFinal = deteksiStatus(statusRaw, namaProdukRaw);

  let confidence = 0;
  const catatan = [];

  if (game) {
    confidence += 50;
  } else {
    catatan.push("Game belum kebaca");
  }

  if (namaProdukFinal) {
    confidence += 20;
  } else {
    catatan.push("Nama produk kosong");
  }

  if (hargaModal > 0) {
    confidence += 20;
  } else {
    catatan.push("Harga belum kebaca");
  }

  if (kodeProdukProvider) {
    confidence += 10;
  }

  const statusMapping = confidence >= 80 ? "siap" : "review";

  return {
    no: index + 1,
    provider: "vipreseller",
    kode_produk_provider: String(kodeProdukProvider).trim(),
    nama_produk_raw: String(namaProdukRaw).trim(),
    game_key: game?.key || null,
    game_nama: game?.nama || "Belum ketemu",
    nama_produk_final: namaProdukFinal,
    harga_modal: hargaModal,
    harga_jual: hargaJual,
    status_provider: String(statusRaw || "").trim(),
    status_final: statusFinal,
    confidence,
    status_mapping: statusMapping,
    catatan: catatan.join(", "),
    raw: row,
  };
}