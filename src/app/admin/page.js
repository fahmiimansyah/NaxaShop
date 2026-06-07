'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import AdminVoucherPanel from '../components/AdminVoucherPanel';

function angkaDashboard(value) {
  return Number(value || 0);
}

function formatCompactDashboard(value) {
  const angka = Number(value || 0);

  if (angka >= 1000000) {
    return `Rp ${(angka / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  }

  if (angka >= 1000) {
    return `Rp ${(angka / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`;
  }

  return `Rp ${angka.toLocaleString('id-ID')}`;
}

function labelMetodeBayarDashboard(value) {
  const metode = String(value || '').toLowerCase();

  const map = {
    qris: 'QRIS',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    dana: 'DANA',
    bca_va: 'BCA VA',
    bni_va: 'BNI VA',
    bri_va: 'BRI VA',
    cimb_va: 'CIMB VA',
    permata_va: 'Permata VA',
    mandiri_bill: 'Mandiri Bill',
    alfamart: 'Alfamart',
    indomaret: 'Indomaret'
  };

  return map[metode] || value || 'Unknown';
}

function EmptyChartState({ text = 'Belum ada data real yang bisa digambar.' }) {
  return (
    <div className="flex min-h-[190px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/50 text-center text-sm font-bold text-gray-500">
      {text}
    </div>
  );
}

function RevenueLineChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];
  const width = 720;
  const height = 220;
  const paddingX = 28;
  const paddingY = 28;
  const values = chartData.map((item) => angkaDashboard(item.omset));
  const profitValues = chartData.map((item) => angkaDashboard(item.profit));
  const maxValue = Math.max(...values, ...profitValues, 1);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const pointFor = (value, index) => {
    const x = paddingX + (chartData.length <= 1 ? 0 : (index / (chartData.length - 1)) * usableWidth);
    const y = height - paddingY - (angkaDashboard(value) / maxValue) * usableHeight;
    return { x, y };
  };

  const omsetPoints = chartData.map((item, index) => pointFor(item.omset, index));
  const profitPoints = chartData.map((item, index) => pointFor(item.profit, index));
  const omsetPolyline = omsetPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const profitPolyline = profitPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = omsetPoints.length
    ? `M ${omsetPoints[0].x} ${height - paddingY} L ${omsetPoints.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${omsetPoints.at(-1).x} ${height - paddingY} Z`
    : '';

  if (chartData.length === 0 || values.every((value) => value === 0)) {
    return <EmptyChartState />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-black text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Omset
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Profit
        </span>
        <span className="ml-auto text-gray-500">14 hari terakhir</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((line) => {
            const y = height - paddingY - line * usableHeight;
            return (
              <g key={line}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(148,163,184,0.13)" strokeWidth="1" />
                <text x={0} y={y + 4} fill="rgba(148,163,184,0.55)" fontSize="11" fontWeight="700">
                  {formatCompactDashboard(maxValue * line)}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="rgba(34,211,238,0.08)" />}

          <polyline points={omsetPolyline} fill="none" stroke="rgb(34,211,238)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={profitPolyline} fill="none" stroke="rgb(52,211,153)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {omsetPoints.map((point, index) => (
            <circle key={`omset-${chartData[index]?.tanggal || index}`} cx={point.x} cy={point.y} r="4.5" fill="rgb(34,211,238)" stroke="rgb(15,23,42)" strokeWidth="3" />
          ))}

          {chartData.map((item, index) => {
            if (index % 3 !== 0 && index !== chartData.length - 1) return null;
            const point = pointFor(0, index);
            return (
              <text key={item.tanggal} x={point.x} y={height - 4} textAnchor="middle" fill="rgba(148,163,184,0.65)" fontSize="11" fontWeight="800">
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function OrderBarChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];
  const maxOrder = Math.max(...chartData.map((item) => angkaDashboard(item.orderSukses)), 1);

  if (chartData.length === 0 || chartData.every((item) => angkaDashboard(item.orderSukses) === 0)) {
    return <EmptyChartState text="Belum ada order sukses di 14 hari terakhir." />;
  }

  return (
    <div className="flex h-[260px] items-end gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      {chartData.map((item) => {
        const order = angkaDashboard(item.orderSukses);
        const tinggi = Math.max((order / maxOrder) * 100, order > 0 ? 9 : 2);

        return (
          <div key={item.tanggal} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="relative flex h-[190px] w-full items-end justify-center">
              <div
                className="w-full max-w-[24px] rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 shadow-lg shadow-cyan-950/30 transition group-hover:scale-105"
                style={{ height: `${tinggi}%` }}
              />
              <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded-xl border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-black text-white shadow-xl group-hover:block">
                {order} order
              </div>
            </div>
            <span className="text-[10px] font-black text-gray-500 [writing-mode:vertical-rl] sm:[writing-mode:initial]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CompactRankList({ title, subtitle, data = [], type = 'game' }) {
  const list = Array.isArray(data) ? data : [];
  const maxOrder = Math.max(...list.map((item) => angkaDashboard(item.totalOrder)), 1);

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="text-xs font-semibold text-gray-500">{subtitle}</p>
      </div>

      {list.length === 0 ? (
        <EmptyChartState text="Belum ada data terlaris." />
      ) : (
        <div className="space-y-3">
          {list.map((item, index) => {
            const persen = Math.max((angkaDashboard(item.totalOrder) / maxOrder) * 100, 8);
            return (
              <div key={`${type}-${item.nama}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">#{index + 1} {item.nama}</p>
                    {item.game && <p className="truncate text-[11px] font-bold text-cyan-300">{item.game}</p>}
                    <p className="text-[11px] font-bold text-gray-500">{formatCompactDashboard(item.omset)}</p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-300">
                    {item.totalOrder}x
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${persen}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentMethodList({ data = [] }) {
  const list = Array.isArray(data) ? data : [];
  const maxOrder = Math.max(...list.map((item) => angkaDashboard(item.totalOrder)), 1);

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-lg font-black text-white">Metode Bayar Favorit</h3>
        <p className="text-xs font-semibold text-gray-500">Metode yang paling sering dipakai customer.</p>
      </div>

      {list.length === 0 ? (
        <EmptyChartState text="Belum ada metode bayar sukses." />
      ) : (
        <div className="space-y-3">
          {list.map((item) => {
            const persen = Math.max((angkaDashboard(item.totalOrder) / maxOrder) * 100, 8);
            return (
              <div key={item.metode}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black">
                  <span className="text-slate-200">{labelMetodeBayarDashboard(item.metode)}</span>
                  <span className="text-gray-500">{item.totalOrder}x • {formatCompactDashboard(item.omset)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${persen}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusSnapshot({ stats }) {
  const statusBayar = stats?.statusBayar || {};
  const statusTopup = stats?.statusTopup || {};

  const items = [
    { label: 'Bayar Sukses', value: statusBayar.sukses || 0, className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Bayar Pending', value: statusBayar.pending || 0, className: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Bayar Gagal', value: statusBayar.gagal || 0, className: 'text-red-300 bg-red-500/10 border-red-500/20' },
    { label: 'Topup Proses', value: statusTopup.proses || 0, className: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
    { label: 'Topup Sukses', value: statusTopup.sukses || 0, className: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
    { label: 'Topup Gagal', value: statusTopup.gagal || 0, className: 'text-orange-300 bg-orange-500/10 border-orange-500/20' }
  ];

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-lg font-black text-white">Status Snapshot</h3>
        <p className="text-xs font-semibold text-gray-500">Pantauan cepat pembayaran dan top-up.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-3 ${item.className}`}>
            <p className="text-[11px] font-black uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-1 text-2xl font-black">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

  // State Navigasi
  const [tabAktif, setTabAktif] = useState('statistik');

  // State Data
  const [stats, setStats] = useState(null);
  const [daftarProduk, setDaftarProduk] = useState([]);
  const [daftarGame, setDaftarGame] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // State Form Produk
  const [formProduk, setFormProduk] = useState({
    game_id: '',
    kode_produk: '',
    nama_produk: '',
    harga: '',
    harga_coret: '',
    harga_modal: '',
    status_produk: 'aktif',
    provider: 'apigames',
    kode_produk_provider: ''
  });

  const [modeEditProduk, setModeEditProduk] = useState(false);
  const [produkEditId, setProdukEditId] = useState(null);

  // State Form Game
  const [formGame, setFormGame] = useState({
  nama: '',
  publisher: '',
  gambar: '',
  zone_id: '0',
  server_game: '',
  kode_game: '',
  status_game: 'aktif',
  badge_label: '',
  badge_tipe: 'none'
});

  const [modeEditGame, setModeEditGame] = useState(false);
  const [gameEditId, setGameEditId] = useState(null);
  const [fileGambar, setFileGambar] = useState(null);
  const [previewGambar, setPreviewGambar] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingGameForm, setLoadingGameForm] = useState(false);
  const [loadingHapus, setLoadingHapus] = useState(null);
  const [loadingHapusGame, setLoadingHapusGame] = useState(null);
  // State Transaksi Admin
  const [daftarTransaksi, setDaftarTransaksi] = useState([]);
  const [loadingTransaksi, setLoadingTransaksi] = useState(false);
  const [loadingAksiTransaksi, setLoadingAksiTransaksi] = useState(null);
  const [filterProdukGame, setFilterProdukGame] = useState('all');
  const [daftarPromo, setDaftarPromo] = useState([]);
const [loadingPromo, setLoadingPromo] = useState(false);
const [loadingPromoForm, setLoadingPromoForm] = useState(false);
const [modeEditPromo, setModeEditPromo] = useState(false);
const [promoEditId, setPromoEditId] = useState(null);
const [daftarMetodeBayarAdmin, setDaftarMetodeBayarAdmin] = useState([]);
const [loadingMetodeBayarAdmin, setLoadingMetodeBayarAdmin] = useState(false);
const [loadingAksiMetodeBayar, setLoadingAksiMetodeBayar] = useState(null);

const [formPromo, setFormPromo] = useState({
  badge: '',
  title: '',
  description: '',
  cta_text: 'Mulai Top Up',
  cta_href: '#game-list',
  gradient: 'from-blue-600/30 via-cyan-500/20 to-slate-900',
  sort_order: 0,
  is_active: 1
});
// State request game
  const [daftarRequestGame, setDaftarRequestGame] = useState([]);
const [statsRequestGame, setStatsRequestGame] = useState(null);
const [loadingRequestGame, setLoadingRequestGame] = useState(false);
const [loadingAksiRequestGame, setLoadingAksiRequestGame] = useState(null);

const [filterRequestGame, setFilterRequestGame] = useState({
  search: '',
  status: 'all'
});
  const [alerts, setAlerts] = useState(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [filterTransaksi, setFilterTransaksi] = useState({
    search: '',
    status_bayar: 'all',
    status_topup: 'all',
    page: 1,
    limit: 20
  });

  const [paginationTransaksi, setPaginationTransaksi] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPage: 1
  });
  const cariNamaGame = (gameId) => {
    return daftarGame.find((game) => String(game.id) === String(gameId))?.nama || `Game ID: ${gameId}`;
  };
  const produkTerfilter =
    filterProdukGame === 'all'
      ? daftarProduk
      : daftarProduk.filter((item) => String(item.game_id) === String(filterProdukGame));

  const namaFilterProduk =
    filterProdukGame === 'all'
      ? 'Semua Game'
      : cariNamaGame(filterProdukGame);
  const metodeBayarAdminByGrup = daftarMetodeBayarAdmin.reduce((hasil, item) => {
    const grup = item.grup || 'Lainnya';

    if (!hasil[grup]) hasil[grup] = [];
    hasil[grup].push(item);

    return hasil;
  }, {});

  const formatRupiah = (angka) => {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

  const trenHarianDashboard = useMemo(() => stats?.trenHarian || [], [stats?.trenHarian]);
  const metodeBayarDashboard = useMemo(() => stats?.metodeBayar || [], [stats?.metodeBayar]);
  const gameTerlarisDashboard = useMemo(() => stats?.gameTerlaris || [], [stats?.gameTerlaris]);
  const produkTerlarisDashboard = useMemo(() => stats?.produkTerlaris || [], [stats?.produkTerlaris]);
  const biayaAdminMap = {
  qris: 0,
  gopay: 0,
  shopeepay: 0,

  bca_va: 4000,
  bni_va: 4000,
  bri_va: 4000,
  cimb_va: 4000,
  permata_va: 4000,
  mandiri_bill: 4000,

  alfamart: 5000,
  indomaret: 5000,
};

const getBiayaAdmin = (metode) => biayaAdminMap[metode] || 0;

const getTotalBayar = (produk, metode) => {
  return Number(produk?.harga || 0) + getBiayaAdmin(metode);
};

const getLabelBiayaAdmin = (metode) => {
  const biaya = getBiayaAdmin(metode);

  if (!metode) return 'Pilih metode dulu';
  if (biaya <= 0) return 'Tanpa biaya admin';

  return `+${formatRupiah(biaya)} admin`;
};

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const potongText = (value, max = 700) => {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  const warnaStatusBayar = (status) => {
    if (status === 'sukses') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (status === 'gagal') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const warnaStatusTopup = (status) => {
    if (status === 'sukses') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (status === 'proses') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (status === 'gagal') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };


  const warnaStatusEtalase = (status) => {
    if (status === 'aktif') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (status === 'coming_soon') return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
    if (status === 'nonaktif') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-gray-400 bg-gray-800 border-gray-700';
  };

  const labelStatusEtalase = (status) => {
    if (status === 'aktif') return 'AKTIF';
    if (status === 'coming_soon') return 'COMING SOON';
    if (status === 'nonaktif') return 'NONAKTIF';
    return 'UNKNOWN';
  };

  const labelStatusMetodeBayarAdmin = (status) => {
    if (status === 'aktif') return 'Aktif';
    if (status === 'maintenance') return 'Maintenance';
    if (status === 'coming_soon') return 'Coming Soon';
    if (status === 'nonaktif') return 'Nonaktif';
    return 'Unknown';
  };

  const warnaStatusMetodeBayarAdmin = (status) => {
    if (status === 'aktif') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    if (status === 'maintenance') return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
    if (status === 'coming_soon') return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    if (status === 'nonaktif') return 'bg-red-500/10 text-red-300 border-red-500/20';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const normalisasiProvider = (value) => {
  return String(value || 'apigames').trim().toLowerCase();
};

const labelProvider = (provider) => {
  const p = normalisasiProvider(provider);

  if (p === 'digiflazz') return 'Digiflazz';
  if (p === 'apigames') return 'APIGames';
  if (p === 'mock') return 'Mock Provider';
  if (p === 'vipreseller') return 'Vip Reseller'

  return 'Provider';
};

const warnaProvider = (provider) => {
  const p = normalisasiProvider(provider);

  if (p === 'digiflazz') {
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  }

  if (p === 'apigames') {
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  }
  if (p === 'vipreseller') {
  return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
}
  if (p === 'mock') {
    return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
  }

  return 'bg-gray-800 text-gray-400 border-gray-700';
};

const kodeProviderEfektif = (item) => {
  return item.kode_produk_provider || item.kode_produk || '-';
};

  const bikinLinkWhatsappCustomer = (trx) => {
  if (!trx.customer_whatsapp) return '#';

  const pesan = encodeURIComponent(
    `Halo kak, ini admin NaXaShop.\n\nKami ingin bantu cek order:\nOrder ID: ${trx.order_id}\nProduk: ${trx.nama_produk || trx.kode_produk}\nStatus Bayar: ${trx.status_bayar}\nStatus Top-up: ${trx.status_topup}`
  );

  return `https://wa.me/${trx.customer_whatsapp}?text=${pesan}`;
};

  const resetFormGame = () => {
    setFormGame({
  nama: '',
  publisher: '',
  gambar: '',
  zone_id: '0',
  server_game: '',
  kode_game: '',
  status_game: 'aktif',
  badge_label: '',
  badge_tipe: 'none'
});

    setModeEditGame(false);
    setGameEditId(null);
    setFileGambar(null);
    setPreviewGambar('');
    setFileInputKey(Date.now());
  };

  const resetFormProduk = () => {
    setFormProduk({
      game_id: daftarGame[0]?.id ? String(daftarGame[0].id) : '',
      kode_produk: '',
      nama_produk: '',
      harga: '',
      harga_coret: '',
      harga_modal: '',
      status_produk: 'aktif',
      provider: 'apigames',
    kode_produk_provider: ''
    });

    setModeEditProduk(false);
    setProdukEditId(null);
  };

  const gradientPromoOptions = [
  'from-blue-600/30 via-cyan-500/20 to-slate-900',
  'from-cyan-500/25 via-blue-600/20 to-slate-900',
  'from-indigo-500/25 via-blue-500/20 to-slate-900',
  'from-sky-500/25 via-cyan-500/20 to-slate-900',
  'from-violet-500/25 via-blue-500/20 to-slate-900'
];

const resetFormPromo = () => {
  setFormPromo({
    badge: '',
    title: '',
    description: '',
    cta_text: 'Mulai Top Up',
    cta_href: '#game-list',
    gradient: 'from-blue-600/30 via-cyan-500/20 to-slate-900',
    sort_order: 0,
    is_active: 1
  });

  setModeEditPromo(false);
  setPromoEditId(null);
};

const ambilPromo = async () => {
  setLoadingPromo(true);

  try {
    const respon = await fetch('/api/admin/promo');
    const hasil = await respon.json();

    if (hasil.sukses) {
      setDaftarPromo(hasil.data || []);
    } else {
      Swal.fire({
        title: 'Gagal ambil promo',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal ambil promo bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingPromo(false);
  }
};

const handleSubmitPromo = async (e) => {
  e.preventDefault();
  setLoadingPromoForm(true);

  try {
    const respon = await fetch(
      modeEditPromo ? `/api/admin/promo/${promoEditId}` : '/api/admin/promo',
      {
        method: modeEditPromo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formPromo,
          sort_order: Number(formPromo.sort_order || 0),
          is_active: Number(formPromo.is_active)
        })
      }
    );

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: modeEditPromo ? 'PROMO DIUPDATE! ✨' : 'PROMO MASUK! 🚀',
        text: hasil.pesan,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      resetFormPromo();
      ambilPromo();
    } else {
      Swal.fire({
        title: 'WADUH! ❌',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal simpan promo bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingPromoForm(false);
  }
};

const handleEditPromo = (promo) => {
  setTabAktif('promo');
  setModeEditPromo(true);
  setPromoEditId(promo.id);

  setFormPromo({
    badge: promo.badge || '',
    title: promo.title || '',
    description: promo.description || '',
    cta_text: promo.cta_text || 'Mulai Top Up',
    cta_href: promo.cta_href || '#game-list',
    gradient: promo.gradient || 'from-blue-600/30 via-cyan-500/20 to-slate-900',
    sort_order: promo.sort_order || 0,
    is_active: Number(promo.is_active) === 1 ? 1 : 0
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleTogglePromo = async (promo) => {
  try {
    const respon = await fetch(`/api/admin/promo/${promo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badge: promo.badge,
        title: promo.title,
        description: promo.description,
        cta_text: promo.cta_text,
        cta_href: promo.cta_href,
        gradient: promo.gradient,
        sort_order: promo.sort_order,
        is_active: Number(promo.is_active) === 1 ? 0 : 1
      })
    });

    const hasil = await respon.json();

    if (respon.ok) {
      ambilPromo();
    } else {
      Swal.fire({
        title: 'Gagal update promo',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal update promo bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  }
};

const handleHapusPromo = async (promo) => {
  const konfirmasi = await Swal.fire({
    title: 'Hapus promo ini?',
    html: `<b>${escapeHtml(promo.title)}</b>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Iya, hapus!',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  try {
    const respon = await fetch(`/api/admin/promo/${promo.id}`, {
      method: 'DELETE'
    });

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: 'PROMO KEHAPUS! 🗑️',
        text: hasil.pesan,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilPromo();
    } else {
      Swal.fire({
        title: 'Gagal hapus promo',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal hapus promo bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  }
};
const warnaStatusRequest = (status) => {
  if (status === 'baru') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (status === 'diproses') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (status === 'selesai') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (status === 'ditolak') return 'bg-red-500/10 text-red-400 border-red-500/20';

  return 'bg-gray-800 text-gray-400 border-gray-700';
};

const labelStatusRequest = (status) => {
  if (status === 'baru') return 'Baru';
  if (status === 'diproses') return 'Diproses';
  if (status === 'selesai') return 'Selesai';
  if (status === 'ditolak') return 'Ditolak';

  return 'Unknown';
};

const formatTanggalAdmin = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};
  // --- FUNGSI TARIK DATA ---
  const ambilDataSultan = async () => {
    setLoadingData(true);

    try {
      const [resStats, resProduk, resGames] = await Promise.all([
        fetch('/api/admin/stats').then((res) => res.json()),
        fetch('/api/admin/produk').then((res) => res.json()),
        fetch('/api/admin/games').then((res) => res.json())
      ]);

      if (resStats.sukses) setStats(resStats.data);
      if (resProduk.sukses) setDaftarProduk(resProduk.data);

      if (resGames.sukses) {
        const games = resGames.data || [];
        setDaftarGame(games);

        setFormProduk((prev) => ({
          ...prev,
          game_id:
            prev.game_id && games.some((game) => String(game.id) === String(prev.game_id))
              ? prev.game_id
              : games[0]?.id
                ? String(games[0].id)
                : ''
        }));
      }
    } catch (error) {
      console.error('Ngadat nyedot data bre:', error);
    } finally {
      setLoadingData(false);
    }
  };

const ambilAlerts = async () => {
  setLoadingAlerts(true);

  try {
    const respon = await fetch('/api/admin/alerts');
    const hasil = await respon.json();

    if (hasil.sukses) {
      setAlerts(hasil.data);
    }
  } catch (error) {
    console.error('Gagal ambil alerts:', error);
  } finally {
    setLoadingAlerts(false);
  }
};

  // --- FUNGSI AMBIL TRANSAKSI ---
const ambilTransaksi = async (filterManual = filterTransaksi) => {
  setLoadingTransaksi(true);

  try {
    const params = new URLSearchParams();

    if (filterManual.search) params.set('search', filterManual.search);
    if (filterManual.status_bayar) params.set('status_bayar', filterManual.status_bayar);
    if (filterManual.status_topup) params.set('status_topup', filterManual.status_topup);

    params.set('page', filterManual.page || 1);
    params.set('limit', filterManual.limit || 20);

    const respon = await fetch(`/api/admin/transaksi?${params.toString()}`);
    const hasil = await respon.json();

    if (hasil.sukses) {
      setDaftarTransaksi(hasil.data || []);
      setPaginationTransaksi(hasil.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPage: 1
      });
    } else {
      Swal.fire({
        title: 'GAGAL AMBIL TRANSAKSI ❌',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal ambil transaksi bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingTransaksi(false);
  }
};

const handleCariTransaksi = (e) => {
  e.preventDefault();

  const filterBaru = {
    ...filterTransaksi,
    page: 1
  };

  setFilterTransaksi(filterBaru);
  ambilTransaksi(filterBaru);
};

const handleGantiFilterTransaksi = (field, value) => {
  const filterBaru = {
    ...filterTransaksi,
    [field]: value,
    page: 1
  };

  setFilterTransaksi(filterBaru);
  ambilTransaksi(filterBaru);
};

const handleGantiHalamanTransaksi = (pageBaru) => {
  const filterBaru = {
    ...filterTransaksi,
    page: pageBaru
  };

  setFilterTransaksi(filterBaru);
  ambilTransaksi(filterBaru);
};

const handleDownloadCSVTransaksi = () => {
  const params = new URLSearchParams();

  if (filterTransaksi.search) params.set('search', filterTransaksi.search);
  if (filterTransaksi.status_bayar && filterTransaksi.status_bayar !== 'all') {
    params.set('status_bayar', filterTransaksi.status_bayar);
  }
  if (filterTransaksi.status_topup && filterTransaksi.status_topup !== 'all') {
    params.set('status_topup', filterTransaksi.status_topup);
  }

  params.set('limit', '5000');

  window.open(`/api/admin/transaksi/export?${params.toString()}`, '_blank', 'noopener,noreferrer');
};

const handleDetailTransaksi = (trx) => {
  const providerLabel = labelProvider(trx.provider);
  const kodeProvider = kodeProviderEfektif(trx);

  Swal.fire({
    title: 'Detail Transaksi 🧾',
    width: 760,
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#06b6d4',
    html: `
      <div style="text-align:left; font-size:13px; line-height:1.7;">
        <div style="background:#111827; padding:14px; border-radius:14px; margin-bottom:12px;">
          <b>Order ID:</b><br/>
          <code>${escapeHtml(trx.order_id)}</code>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Game</b><br/>
            ${escapeHtml(trx.nama_game || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Produk</b><br/>
            ${escapeHtml(trx.nama_produk || trx.kode_produk || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Provider</b><br/>
            ${escapeHtml(providerLabel)}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Kode Provider</b><br/>
            <code>${escapeHtml(kodeProvider)}</code>
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Kode Internal</b><br/>
            <code>${escapeHtml(trx.kode_produk || '-')}</code>
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>ID Player</b><br/>
            ${escapeHtml(trx.id_player || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Zone / Server</b><br/>
            ${escapeHtml(trx.zone_player || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Harga</b><br/>
            ${formatRupiah(trx.harga)}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Payment</b><br/>
            ${escapeHtml(trx.payment_type || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>WhatsApp Customer</b><br/>
            ${escapeHtml(trx.customer_whatsapp || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Email Customer</b><br/>
            ${escapeHtml(trx.customer_email || '-')}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Status Bayar</b><br/>
            ${escapeHtml(trx.status_bayar)}
          </div>

          <div style="background:#111827; padding:12px; border-radius:12px;">
            <b>Status Topup</b><br/>
            ${escapeHtml(trx.status_topup)}
          </div>
        </div>

        <div style="background:#111827; padding:12px; border-radius:12px; margin-top:10px;">
          <b>Catatan Admin</b><br/>
          <pre style="white-space:pre-wrap; color:#d1d5db;">${escapeHtml(trx.catatan_admin || '-')}</pre>
        </div>

        <div style="background:#111827; padding:12px; border-radius:12px; margin-top:10px;">
          <b>Response Provider</b><br/>
          <pre style="white-space:pre-wrap; color:#d1d5db; max-height:180px; overflow:auto;">${escapeHtml(potongText(trx.apigames_response || '-'))}</pre>
        </div>
      </div>
    `
  });
};

const handleUpdateTransaksi = async (trx, payload, teksKonfirmasi) => {
  const konfirmasi = await Swal.fire({
    title: 'Update transaksi?',
    text: teksKonfirmasi,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Iya, update!',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#06b6d4',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  setLoadingAksiTransaksi(`${trx.order_id}-update`);

  try {
    const respon = await fetch('/api/admin/transaksi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: trx.order_id,
        ...payload
      })
    });

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: 'BERHASIL! ✅',
        text: hasil.pesan,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilDataSultan();
      ambilTransaksi();
      ambilAlerts();
    } else {
      Swal.fire({
        title: 'GAGAL UPDATE ❌',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal update transaksi bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiTransaksi(null);
  }
};

const handleHapusTransaksi = async (trx) => {
  const konfirmasi = await Swal.fire({
    title: 'Hapus transaksi ini?',
    html: `
      <div style="text-align:left">
        <b>${escapeHtml(trx.order_id)}</b><br/>
        <small>
          Data transaksi ini bakal dihapus dari database.
          Kalau ini transaksi real, pastiin dulu lu emang mau bersihin riwayatnya.
        </small>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Iya, hapus!',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#374151',
  });

  if (!konfirmasi.isConfirmed) return;

  setLoadingAksiTransaksi(`${trx.order_id}-delete`);

  try {
    const respon = await fetch('/api/admin/transaksi', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: trx.order_id,
      }),
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal hapus transaksi.');
    }

    Swal.fire({
      title: 'Berhasil dihapus ✅',
      text: hasil.pesan,
      icon: 'success',
      background: '#1f2937',
      color: '#fff',
    });

    ambilDataSultan();
    ambilTransaksi();
    ambilAlerts();
  } catch (error) {
    Swal.fire({
      title: 'Gagal hapus ❌',
      text: error.message || 'Gagal hapus transaksi bre.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff',
    });
  } finally {
    setLoadingAksiTransaksi(null);
  }
};

const handleRetryTopup = async (trx) => {
  const providerLabel = labelProvider(trx.provider);

  const konfirmasi = await Swal.fire({
    title: 'Retry top-up?',
    html: `
      <div style="text-align:left">
        <b>${escapeHtml(trx.order_id)}</b><br/>
        <small>
          Ini bakal nembak ulang ke <b>${escapeHtml(providerLabel)}</b>.
          Jangan retry kalau top-up sebenarnya sudah masuk ke akun customer.
        </small>
        <br/><br/>
        <small style="color:#fbbf24">
          Provider: ${escapeHtml(providerLabel)}<br/>
          Produk: ${escapeHtml(trx.nama_produk || trx.kode_produk || '-')}<br/>
          ID: ${escapeHtml(trx.id_player || '-')}<br/>
          Server/Zone: ${escapeHtml(trx.zone_player || '-')}
        </small>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: `Retry ke ${providerLabel}!`,
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#7c3aed',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  setLoadingAksiTransaksi(`${trx.order_id}-retry`);

  try {
    const respon = await fetch('/api/admin/transaksi/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: trx.order_id
      })
    });

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: 'RETRY TERKIRIM! 🚀',
        html: `
          <b>${escapeHtml(hasil.pesan || 'Retry berhasil dikirim.')}</b><br/>
          <small>Provider: ${escapeHtml(hasil.data?.provider || providerLabel)}</small>
        `,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilDataSultan();
      ambilTransaksi();
      ambilAlerts();
    } else {
      Swal.fire({
        title: 'RETRY GAGAL ❌',
        html: `
          <b>${escapeHtml(hasil.pesan || 'Retry gagal.')}</b><br/>
          <small>Provider: ${escapeHtml(hasil.data?.provider || providerLabel)}</small>
          ${
            hasil.data?.label_gagal
              ? `<br/><small style="color:#fbbf24">Masalah: ${escapeHtml(hasil.data.label_gagal)}</small>`
              : ''
          }
        `,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      ambilTransaksi();
      ambilAlerts();
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal retry top-up bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiTransaksi(null);
  }
};

const handleCekProvider = async (trx) => {
  const providerLabel = labelProvider(trx.provider);

  const konfirmasi = await Swal.fire({
    title: 'Cek status provider?',
    html: `
      <div style="text-align:left">
        <b>${escapeHtml(trx.order_id)}</b><br/>
        <small>
          Ini cuma ngecek status terbaru ke <b>${escapeHtml(providerLabel)}</b>,
          bukan retry / nembak ulang order baru.
        </small>
        <br/><br/>
        <small style="color:#67e8f9">
          Cocok buat order yang masih proses kelamaan.
        </small>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: `Cek ${providerLabel}`,
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#06b6d4',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  setLoadingAksiTransaksi(`${trx.order_id}-cek-provider`);

  try {
    const respon = await fetch('/api/provider/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: trx.order_id
      })
    });

    const hasil = await respon.json();

    if (respon.ok && hasil.sukses) {
      Swal.fire({
        title: 'STATUS PROVIDER KECEK! 🔄',
        html: `
          <b>${escapeHtml(hasil.pesan || 'Status provider berhasil dicek.')}</b><br/>
          <small>Provider: ${escapeHtml(labelProvider(hasil.data?.provider || trx.provider))}</small><br/>
          <small>Status Top-up: ${escapeHtml(hasil.data?.status_topup || '-')}</small>
          ${
            hasil.data?.status_provider
              ? `<br/><small>Status Provider: ${escapeHtml(hasil.data.status_provider)}</small>`
              : ''
          }
        `,
        icon: hasil.data?.status_topup === 'sukses' ? 'success' : 'info',
        background: '#1f2937',
        color: '#fff'
      });

      ambilDataSultan();
      ambilTransaksi();
      ambilAlerts();
    } else {
      Swal.fire({
        title: 'CEK PROVIDER GAGAL ❌',
        html: `
          <b>${escapeHtml(hasil.pesan || 'Gagal cek provider.')}</b><br/>
          <small>Provider: ${escapeHtml(labelProvider(hasil.data?.provider || trx.provider))}</small>
        `,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      ambilTransaksi();
      ambilAlerts();
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal cek status provider bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiTransaksi(null);
  }
};

const handleEditCatatan = async (trx) => {
  const hasilInput = await Swal.fire({
    title: 'Catatan Admin 📝',
    input: 'textarea',
    inputValue: trx.catatan_admin || '',
    inputPlaceholder: 'Contoh: customer sudah chat WA, topup diretry...',
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#06b6d4',
    cancelButtonColor: '#374151'
  });

  if (!hasilInput.isConfirmed) return;

  await handleUpdateTransaksi(
    trx,
    { catatan_admin: hasilInput.value || '' },
    'Simpan catatan admin untuk transaksi ini?'
  );
};
const ambilRequestGame = async (customFilter = filterRequestGame) => {
  setLoadingRequestGame(true);

  try {
    const params = new URLSearchParams();

    if (customFilter.status && customFilter.status !== 'all') {
      params.set('status', customFilter.status);
    }

    if (customFilter.search) {
      params.set('search', customFilter.search);
    }

    const queryString = params.toString();
    const url = queryString
      ? `/api/admin/request-game?${queryString}`
      : '/api/admin/request-game';

    const respon = await fetch(url, {
      cache: 'no-store'
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal ambil request game.');
    }

    setDaftarRequestGame(hasil.data || []);
    setStatsRequestGame(hasil.stats || null);
  } catch (error) {
    Swal.fire({
      title: 'Waduh!',
      text: error.message || 'Gagal ambil request game bre.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingRequestGame(false);
  }
};

const ambilMetodeBayarAdmin = async () => {
  setLoadingMetodeBayarAdmin(true);

  try {
    const respon = await fetch('/api/admin/metode-bayar', { cache: 'no-store' });
    const hasil = await respon.json();

    if (hasil.sukses) {
      setDaftarMetodeBayarAdmin(hasil.data || []);
    } else {
      Swal.fire({
        title: 'Gagal ambil metode bayar',
        text: hasil.pesan || 'Gagal ambil setting metode bayar bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal ambil setting metode bayar bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingMetodeBayarAdmin(false);
  }
};

const handleSimpanMetodeBayarAdmin = async (e, item) => {
  e.preventDefault();

  const formData = new FormData(e.currentTarget);
  const payload = {
    kode: item.value,
    status_metode: String(formData.get('status_metode') || 'aktif'),
    biaya_admin: Number(formData.get('biaya_admin') || 0),
    minimal_transaksi: Number(formData.get('minimal_transaksi') || 0),
    urutan: Number(formData.get('urutan') || item.sort_order || 0),
    deskripsi: String(formData.get('deskripsi') || item.desc || ''),
    rekomendasi: Number(formData.get('rekomendasi') || 0)
  };

  setLoadingAksiMetodeBayar(item.value);

  try {
    const respon = await fetch('/api/admin/metode-bayar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal simpan metode bayar.');
    }

    Swal.fire({
      title: 'Tersimpan ✅',
      text: hasil.pesan || 'Setting metode bayar berhasil disimpan.',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      background: '#1f2937',
      color: '#fff'
    });

    ambilMetodeBayarAdmin();
  } catch (error) {
    Swal.fire({
      title: 'Gagal simpan ❌',
      text: error.message || 'Gagal simpan setting metode bayar bre.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiMetodeBayar(null);
  }
};

const handleStatusCepatMetodeBayar = async (item, statusBaru) => {
  setLoadingAksiMetodeBayar(item.value);

  try {
    const respon = await fetch('/api/admin/metode-bayar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kode: item.value,
        status_metode: statusBaru,
        biaya_admin: item.biaya,
        minimal_transaksi: item.minimal,
        urutan: item.sort_order,
        deskripsi: item.desc,
        rekomendasi: item.rekomendasi ? 1 : 0
      })
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal update status metode bayar.');
    }

    ambilMetodeBayarAdmin();
  } catch (error) {
    Swal.fire({
      title: 'Gagal update ❌',
      text: error.message || 'Gagal update status metode bayar bre.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiMetodeBayar(null);
  }
};

  useEffect(() => {
    if (session?.user?.email === EMAIL_CEO) {
      ambilDataSultan();
      ambilTransaksi();
      ambilAlerts();
      ambilPromo();
      ambilMetodeBayarAdmin();
      ambilRequestGame();
    }
  }, [session]);

    // Helper PUSAT tiNDAKAN
    const formatTanggalPendek = (tanggal) => {
  if (!tanggal) return '-';
  return new Date(tanggal).toLocaleString('id-ID');
};
  // --- PILIH GAMBAR ---
  const handlePilihGambar = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'FILE SALAH! ❌',
        text: 'Yang diupload harus gambar bre!',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setFileInputKey(Date.now());
      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      Swal.fire({
        title: 'GEDE BANGET! ❌',
        text: 'Ukuran gambar maksimal 2MB bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setFileInputKey(Date.now());
      return;
    }

    setFileGambar(file);
    setPreviewGambar(URL.createObjectURL(file));
  };

  // --- UPLOAD GAMBAR KALAU ADA FILE ---
  const uploadGambarKalauAda = async () => {
    if (!fileGambar) {
      return formGame.gambar;
    }

    const formData = new FormData();
    formData.append('gambar', fileGambar);

    const responUpload = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    });

    const hasilUpload = await responUpload.json();

    if (!responUpload.ok) {
      throw new Error(hasilUpload.pesan || 'Upload gambar gagal bre!');
    }

    return hasilUpload.url;
  };

  // --- FUNGSI SUBMIT GAME: TAMBAH / EDIT ---
  const handleSubmitGame = async (e) => {
    e.preventDefault();
    setLoadingGameForm(true);

    try {
      const gambarUrl = await uploadGambarKalauAda();

      if (!gambarUrl) {
        Swal.fire({
          title: 'GAMBAR KOSONG! ❌',
          text: 'Upload gambar atau isi URL/path gambar dulu bre.',
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });

        setLoadingGameForm(false);
        return;
      }

      const payload = {
        ...formGame,
        id: gameEditId,
        gambar: gambarUrl,
        zone_id: Number(formGame.zone_id)
      };

      const respon = await fetch('/api/admin/games', {
        method: modeEditGame ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: modeEditGame ? 'GAME DIUPDATE! ✨' : 'GAME MASUK! 🎮',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        resetFormGame();
        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'WADUH! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: error.message || 'Gagal proses game bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingGameForm(false);
    }
  };

  // --- MODE EDIT GAME ---
  const handleToggleGame = async (game) => {
  const statusBaru = game.status_game === 'aktif' ? 'nonaktif' : 'aktif';

  const konfirmasi = await Swal.fire({
    title: `${statusBaru === 'aktif' ? 'Aktifkan' : 'Nonaktifkan'} game ini?`,
    text: `${game.nama} akan jadi ${statusBaru}.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Iya, lanjut!',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: statusBaru === 'aktif' ? '#16a34a' : '#dc2626',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  try {
    const respon = await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: game.id,
        nama: game.nama,
        publisher: game.publisher,
        gambar: game.gambar,
        zone_id: game.zone_id,
        server_game: game.server_game || '',
        kode_game: game.kode_game,
        status_game: statusBaru,
          badge_label: game.badge_label || '',
  badge_tipe: game.badge_tipe || 'none'
      })
    });

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: 'BERHASIL! ✅',
        text: `Game berhasil jadi ${statusBaru}.`,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilDataSultan();
    } else {
      Swal.fire({
        title: 'GAGAL! ❌',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal ubah status game bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  }
};
  const handleEditGame = (game) => {
    setTabAktif('game');
    setModeEditGame(true);
    setGameEditId(game.id);

    setFormGame({
      nama: game.nama || '',
      publisher: game.publisher || '',
      gambar: game.gambar || '',
      zone_id: String(game.zone_id ?? '0'),
      server_game: game.server_game || '',
      kode_game: game.kode_game || '',
      status_game: game.status_game || 'aktif',
      badge_label: game.badge_label || '',
      badge_tipe: game.badge_tipe || 'none'
    });

    setFileGambar(null);
    setPreviewGambar(game.gambar || '');
    setFileInputKey(Date.now());

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNGSI HAPUS GAME ---
  const handleHapusGame = async (game) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus game ini?',
      html: `
        <b>${game.nama}</b><br/>
        <small>Kode: ${game.kode_game}</small><br/>
        <small>Kalau masih ada produk, sistem bakal nolak.</small>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Iya, hapus!',
      cancelButtonText: 'Batal',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#374151'
    });

    if (!konfirmasi.isConfirmed) return;

    setLoadingHapusGame(game.id);

    try {
      const respon = await fetch(`/api/admin/games?id=${game.id}`, {
        method: 'DELETE'
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: 'GAME KEHAPUS! 🗑️',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'GAGAL HAPUS! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API hapus game bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingHapusGame(null);
    }
  };

  // --- FUNGSI SUBMIT PRODUK: TAMBAH / EDIT ---
  const handleSubmitProduk = async (e) => {
    e.preventDefault();
    setLoadingForm(true);

    if (!formProduk.game_id) {
      Swal.fire({
        title: 'GAME KOSONG! ❌',
        text: 'Tambah game dulu sebelum tambah produk bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setLoadingForm(false);
      return;
    }

    try {
      const respon = await fetch('/api/admin/produk', {
        method: modeEditProduk ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formProduk,
          id: produkEditId,
          harga: parseInt(formProduk.harga),
          harga_coret: parseInt(formProduk.harga_coret || 0),
          harga_modal: parseInt(formProduk.harga_modal || 0)
        })
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: modeEditProduk ? 'PRODUK DIUPDATE! ✨' : 'MASUK BRE! 🚀',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        resetFormProduk();
        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'WADUH! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API produk bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingForm(false);
    }
  };

  // --- MODE EDIT PRODUK ---
  const handleEditProduk = (item) => {
    setTabAktif('produk');
    setModeEditProduk(true);
    setProdukEditId(item.id);

    setFormProduk({
      game_id: String(item.game_id || ''),
      kode_produk: item.kode_produk || '',
      nama_produk: item.nama_produk || '',
      harga: String(item.harga || ''),
      harga_coret: item.harga_coret || '',
      harga_modal: String(item.harga_modal || ''),
      status_produk: item.status_produk || 'aktif',
      provider: item.provider || 'apigames',
      kode_produk_provider: item.kode_produk_provider || item.kode_produk || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNGSI Set status PRODUK ---
  const handleToggleProduk = async (item) => {
  const statusBaru = item.status_produk === 'aktif' ? 'nonaktif' : 'aktif';

  const konfirmasi = await Swal.fire({
    title: `${statusBaru === 'aktif' ? 'Aktifkan' : 'Nonaktifkan'} produk ini?`,
    text: `${item.nama_produk} akan jadi ${statusBaru}.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Iya, lanjut!',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: statusBaru === 'aktif' ? '#16a34a' : '#dc2626',
    cancelButtonColor: '#374151'
  });

  if (!konfirmasi.isConfirmed) return;

  try {
    const respon = await fetch('/api/admin/produk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        game_id: item.game_id,
        kode_produk: item.kode_produk,
        nama_produk: item.nama_produk,
        harga: item.harga,
        harga_coret: item.harga_coret || 0,
        harga_modal: item.harga_modal || 0,
        status_produk: statusBaru,
          provider: item.provider || 'apigames',
        kode_produk_provider: item.kode_produk_provider || item.kode_produk
      })
    });

    const hasil = await respon.json();

    if (respon.ok) {
      Swal.fire({
        title: 'BERHASIL! ✅',
        text: `Produk berhasil jadi ${statusBaru}.`,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilDataSultan();
    } else {
      Swal.fire({
        title: 'GAGAL! ❌',
        text: hasil.pesan,
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      title: 'ERROR SERVER!',
      text: 'Gagal ubah status produk bre',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  }
};
// FUNGSI HAPUS PRODUK
  const handleHapusProduk = async (item) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus produk ini?',
      html: `
        <b>${item.nama_produk}</b><br/>
        <small>Kode: ${item.kode_produk}</small>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Iya, hapus!',
      cancelButtonText: 'Batal',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#374151'
    });

    if (!konfirmasi.isConfirmed) return;

    setLoadingHapus(item.id);

    try {
      const respon = await fetch(`/api/admin/produk?id=${item.id}`, {
        method: 'DELETE'
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: 'KEHAPUS BRE! 🗑️',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'GAGAL HAPUS! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API hapus produk bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingHapus(null);
    }
  };

  // fungsi update status gameRequest
  const handleUpdateStatusRequestGame = async (item, statusBaru) => {
  setLoadingAksiRequestGame(item.id);

  try {
    const respon = await fetch('/api/admin/request-game', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        status_request: statusBaru
      })
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal update status.');
    }

    Swal.fire({
      title: 'Status diupdate! ✨',
      text: hasil.pesan,
      icon: 'success',
      background: '#1f2937',
      color: '#fff',
      timer: 1300,
      showConfirmButton: false
    });

    ambilRequestGame();
  } catch (error) {
    Swal.fire({
      title: 'Gagal!',
      text: error.message || 'Gagal update status request game.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiRequestGame(null);
  }
};

// Fungsi hapus request
const handleHapusRequestGame = async (item) => {
  const konfirmasi = await Swal.fire({
    title: 'Hapus request ini?',
    text: `Request "${item.nama_game}" bakal hilang dari admin.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, hapus',
    cancelButtonText: 'Batal',
    background: '#1f2937',
    color: '#fff',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#4b5563'
  });

  if (!konfirmasi.isConfirmed) return;

  setLoadingAksiRequestGame(item.id);

  try {
    const respon = await fetch(`/api/admin/request-game?id=${item.id}`, {
      method: 'DELETE'
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      throw new Error(hasil.pesan || 'Gagal hapus request.');
    }

    Swal.fire({
      title: 'Request dihapus!',
      text: hasil.pesan,
      icon: 'success',
      background: '#1f2937',
      color: '#fff',
      timer: 1300,
      showConfirmButton: false
    });

    ambilRequestGame();
  } catch (error) {
    Swal.fire({
      title: 'Gagal!',
      text: error.message || 'Gagal hapus request game.',
      icon: 'error',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setLoadingAksiRequestGame(null);
  }
};

  // --- KEAMANAN CEO ---
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">
        Saha Maneh?
      </div>
    );
  }

  if (!session || session.user.email !== EMAIL_CEO) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center">
        <span className="text-7xl mb-4">🚷</span>
        <h1 className="text-3xl font-black text-red-500 mb-2">AKSES DITOLAK!</h1>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 mt-4 bg-gray-800 text-white font-bold rounded-xl"
        >
          Balik Beranda
        </button>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">
        Kalem Heula
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 font-sans text-white">
      <div className="max-w-7xl mx-auto">

        {/* HEADER & TAB MENU */}
        <div className="mb-8 border-b border-gray-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Ruang CEO NaXaShop 👑</h1>
            <p className="text-sm text-gray-400 mt-1">
              Sistem kendali utama bos{' '}
              <span className="text-blue-400 font-bold">{session.user.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap bg-gray-900 p-1 rounded-xl border border-gray-800 shadow-lg gap-1">
            <button
              onClick={() => setTabAktif('statistik')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'statistik'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Statistik
            </button>
            <button
              onClick={() => setTabAktif('transaksi')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'transaksi'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧾 Kelola Transaksi
            </button>
            <button
              onClick={() => setTabAktif('game')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'game'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎮 Kelola Game
            </button>

            <button
              onClick={() => setTabAktif('produk')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'produk'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📦 Kelola Produk
            </button>
            <button
  onClick={() => setTabAktif('promo')}
  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
    tabAktif === 'promo'
      ? 'bg-sky-600 text-white shadow-md'
      : 'text-gray-400 hover:text-white'
  }`}
>
  🎞️ Kelola Promo
</button>


<button
  onClick={() => setTabAktif('metode-bayar')}
  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
    tabAktif === 'metode-bayar'
      ? 'bg-indigo-600 text-white shadow-md'
      : 'text-gray-400 hover:text-white'
  }`}
>
  💳 Metode Bayar
</button>



<button
  onClick={() => setTabAktif('voucher')}
  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
    tabAktif === 'voucher'
      ? 'bg-pink-600 text-white shadow-md'
      : 'text-gray-400 hover:text-white'
  }`}
>
  🎟️ Voucher
</button>

<button
  onClick={() => setTabAktif('request-game')}
  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
    tabAktif === 'request-game'
      ? 'bg-blue-600 text-white shadow-md'
      : 'text-gray-400 hover:text-white'
  }`}
>
  💡 Request Game
  {Number(statsRequestGame?.baru || 0) > 0 && (
    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
      {statsRequestGame.baru}
    </span>
  )}
</button>
          </div>
        </div>

{/* TAB STATISTIK */}
{tabAktif === 'statistik' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

    {/* GRAFIK PALING ATAS */}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
      <div className="xl:col-span-3 rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-white">Grafik Omset & Profit 📈</h2>
            <p className="text-xs font-semibold text-gray-500">
              Pantau naik-turun uang masuk dari order sukses.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-300/80">
              Bulan Ini
            </p>
            <p className="text-sm font-black text-emerald-300">
              {formatRupiah(stats?.profitBulanIni)}
            </p>
          </div>
        </div>

        <RevenueLineChart data={trenHarianDashboard} />
      </div>

      <div className="xl:col-span-2 rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-white">Order Harian 🚀</h2>
            <p className="text-xs font-semibold text-gray-500">
              Jumlah top-up sukses per hari.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-wide text-cyan-300/80">
              Hari Ini
            </p>
            <p className="text-sm font-black text-cyan-300">
              {stats?.orderHariIni || 0} order
            </p>
          </div>
        </div>

        <OrderBarChart data={trenHarianDashboard} />
      </div>
    </div>

    {/* KARTU STATISTIK */}
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">💰</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Total Omset
        </p>
        <h3 className="text-2xl font-black text-green-400">
          {formatRupiah(stats?.totalOmset ?? stats?.totalCuan)}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">📦</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Total Modal
        </p>
        <h3 className="text-2xl font-black text-orange-400">
          {formatRupiah(stats?.totalModal)}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">💸</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Profit
        </p>
        <h3 className="text-2xl font-black text-emerald-400">
          {formatRupiah(stats?.totalProfit)}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">🚀</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Topup Sukses
        </p>
        <h3 className="text-2xl font-black text-blue-400">
          {stats?.suksesTopup || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">⏳</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Pending Bayar
        </p>
        <h3 className="text-2xl font-black text-yellow-400">
          {stats?.pendingBayar || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">👥</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Total User
        </p>
        <h3 className="text-2xl font-black text-purple-400">
          {stats?.totalUser || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">✅</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Verified
        </p>
        <h3 className="text-2xl font-black text-emerald-400">
          {stats?.userVerified || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-4 right-4 text-3xl opacity-20">🟢</div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
          Login 15 Menit
        </p>
        <h3 className="text-2xl font-black text-lime-400">
          {stats?.userAktif15Menit || 0}
        </h3>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <PaymentMethodList data={metodeBayarDashboard} />

      <CompactRankList
        title="Game Terlaris"
        subtitle="Game paling sering dibeli customer."
        data={gameTerlarisDashboard}
        type="game"
      />

      <CompactRankList
        title="Produk Terlaris"
        subtitle="Nominal yang paling laku."
        data={produkTerlarisDashboard}
        type="produk"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      <StatusSnapshot stats={stats} />

      <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
        <p className="text-xs text-gray-500 font-bold uppercase">User Google</p>
        <h3 className="text-3xl font-black text-white mt-1">
          {stats?.userGoogle || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
        <p className="text-xs text-gray-500 font-bold uppercase">User Manual</p>
        <h3 className="text-3xl font-black text-white mt-1">
          {stats?.userManual || 0}
        </h3>
      </div>

      <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
        <p className="text-xs text-gray-500 font-bold uppercase">Login 24 Jam</p>
        <h3 className="text-3xl font-black text-white mt-1">
          {stats?.userAktif24Jam || 0}
        </h3>
      </div>
    </div>

    <div className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold">5 Transaksi Terakhir 🛒</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider font-bold">
              <th className="p-4">Order ID</th>
              <th className="p-4">Target Player</th>
              <th className="p-4">Nominal / Produk</th>
              <th className="p-4">Bayar</th>
              <th className="p-4">Top Up</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800 text-sm">
            {stats?.orderanTerbaru?.map((trx) => (
              <tr key={trx.id} className="hover:bg-gray-800/40">
                <td className="p-4 font-mono font-bold text-gray-300">
                  {trx.order_id}
                </td>

                <td className="p-4 font-bold text-white">
                  {trx.id_player}
                  <span className="text-xs text-gray-500 block">
                    {trx.zone_player || '-'}
                  </span>
                </td>

                <td className="p-4 font-bold text-gray-300">
                  Rp {Number(trx.harga || 0).toLocaleString('id-ID')}
                  <span className="text-[10px] text-blue-400 block">
                    {trx.kode_produk}
                  </span>
                </td>

                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      trx.status_bayar === 'sukses'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    {trx.status_bayar}
                  </span>
                </td>

                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      trx.status_topup === 'sukses'
                        ? 'bg-blue-500/10 text-blue-400'
                        : trx.status_topup === 'proses'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {trx.status_topup}
                  </span>
                </td>
              </tr>
            ))}

            {(!stats?.orderanTerbaru || stats.orderanTerbaru.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm font-bold text-gray-500">
                  Belum ada transaksi terbaru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}    

        {/* TAB TRANSAKSI */}
        {tabAktif === 'transaksi' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
            <aside className="2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-7rem)] 2xl:overflow-y-auto">
                    {/* PUSAT TINDAKAN */}
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
                      <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-black">🚨 Pusat Tindakan</h2>
                          <p className="text-xs text-gray-500 mt-1">
                            Order yang perlu dicek admin biar gak nyangkut kelamaan.
                          </p>
                        </div>

                        <button
                          onClick={ambilAlerts}
                          disabled={loadingAlerts}
                          className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black disabled:opacity-50"
                        >
                          {loadingAlerts ? 'Refresh...' : '🔄 Refresh Alert'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 p-6">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                          <p className="text-xs text-red-300 font-black uppercase">Top-up Gagal</p>
                          <h3 className="text-3xl font-black text-red-400 mt-1">
                            {alerts?.ringkasan?.topupGagal || 0}
                          </h3>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                          <p className="text-xs text-purple-300 font-black uppercase">Proses Kelamaan</p>
                          <h3 className="text-3xl font-black text-purple-400 mt-1">
                            {alerts?.ringkasan?.prosesKelamaan || 0}
                          </h3>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                          <p className="text-xs text-yellow-300 font-black uppercase">Pending Lama</p>
                          <h3 className="text-3xl font-black text-yellow-400 mt-1">
                            {alerts?.ringkasan?.pendingLama || 0}
                          </h3>
                        </div>
                      </div>

                      {alerts?.ringkasan?.total > 0 ? (
                        <div className="px-6 pb-6 space-y-4">
                          {alerts.topupGagal?.length > 0 && (
                            <div>
                              <h3 className="text-sm font-black text-red-400 mb-3">
                                🚨 Top-up gagal, perlu dicek
                              </h3>

                              <div className="space-y-3">
                                {alerts.topupGagal.map((trx) => (
                                  <div key={trx.order_id} className="bg-slate-950 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
                                    <div>
                                      <p className="font-mono text-xs text-cyan-400 font-black break-all">
                                        {trx.order_id}
                                      </p>
                                      <p className="text-white font-bold mt-1">
                                        {trx.nama_game} - {trx.nama_produk}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        ID: {trx.id_player} | Server/Zone: {trx.zone_player || '-'}
                                      </p>
                                      <p className="text-[11px] text-gray-600 mt-1">
                                        Update: {formatTanggalPendek(trx.updated_at || trx.created_at)}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleDetailTransaksi(trx)}
                                        className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black"
                                      >
                                        👁️ Detail
                                      </button>

                                      <button
                                        onClick={() => handleCekProvider(trx)}
                                        disabled={
                                          trx.status_bayar !== 'sukses' ||
                                          trx.status_topup === 'sukses' ||
                                          loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                                        }
                                        className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-black hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                                          ? 'Cek...'
                                          : '🔄 Cek Provider'}
                                      </button>

                                      <button
                                        onClick={() => handleRetryTopup(trx)}
                                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black"
                                      >
                                        🚀 Retry
                                      </button>

                                      <button
                                        onClick={() =>
                                          handleUpdateTransaksi(
                                            trx,
                                            { status_topup: 'sukses' },
                                            'Tandai top-up ini sukses manual?'
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black"
                                      >
                                        ✅ Sukseskan
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {alerts.prosesKelamaan?.length > 0 && (
                            <div>
                              <h3 className="text-sm font-black text-purple-400 mb-3">
                                ⏳ Top-up proses lebih dari 10 menit
                              </h3>

                              <div className="space-y-3">
                                {alerts.prosesKelamaan.map((trx) => (
                                  <div key={trx.order_id} className="bg-slate-950 border border-gray-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                      <p className="font-mono text-xs text-cyan-400 font-black break-all">
                                        {trx.order_id}
                                      </p>
                                      <p className="text-white font-bold mt-1">
                                        {trx.nama_game} - {trx.nama_produk}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        ID: {trx.id_player} | Server/Zone: {trx.zone_player || '-'}
                                      </p>
                                      <p className="text-[11px] text-gray-600 mt-1">
                                        Update: {formatTanggalPendek(trx.updated_at || trx.created_at)}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleDetailTransaksi(trx)}
                                        className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black"
                                      >
                                        👁️ Detail
                                      </button>

                                      <button
                                        onClick={() => handleCekProvider(trx)}
                                        disabled={
                                          trx.status_bayar !== 'sukses' ||
                                          trx.status_topup === 'sukses' ||
                                          loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                                        }
                                        className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                                          ? 'Cek...'
                                          : '🔄 Cek Provider'}
                                      </button>

                                      <button
                                        onClick={() => handleRetryTopup(trx)}
                                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black"
                                      >
                                        🚀 Retry
                                      </button>

                                      <button
                                        onClick={() =>
                                          handleUpdateTransaksi(
                                            trx,
                                            { status_topup: 'gagal' },
                                            'Tandai top-up ini gagal biar masuk antrean pengecekan?'
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-red-500 text-white text-xs font-black"
                                      >
                                        ❌ Gagalkan
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {alerts.pendingLama?.length > 0 && (
                            <div>
                              <h3 className="text-sm font-black text-yellow-400 mb-3">
                                💸 Pembayaran pending lebih dari 30 menit
                              </h3>

                              <div className="space-y-3">
                                {alerts.pendingLama.map((trx) => (
                                  <div key={trx.order_id} className="bg-slate-950 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
                                    <div>
                                      <p className="font-mono text-xs text-cyan-400 font-black break-all">
                                        {trx.order_id}
                                      </p>
                                      <p className="text-white font-bold mt-1">
                                        {trx.nama_game} - {trx.nama_produk}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        ID: {trx.id_player} | Payment: {trx.payment_type}
                                      </p>
                                      <p className="text-[11px] text-gray-600 mt-1">
                                        Dibuat: {formatTanggalPendek(trx.created_at)}
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={() => handleDetailTransaksi(trx)}
                                        className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black"
                                      >
                                        👁️ Detail
                                      </button>

                                      <button
                                        onClick={() =>
                                          handleUpdateTransaksi(
                                            trx,
                                            { status_bayar: 'gagal', status_topup: 'gagal' },
                                            'Tandai order pending lama ini gagal/expired?'
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-red-500 text-white text-xs font-black"
                                      >
                                        🧹 Expire Manual
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-6 pb-6">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-emerald-300 font-bold text-sm">
                            ✅ Aman bree. Belum ada order yang butuh tindakan.
                          </div>
                        </div>
                      )}
                    </div>              
          </aside>      
            <section className="min-w-0 space-y-6">
                            {/* FILTER */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black">🧾 Kelola Transaksi</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Cari order nyangkut, retry top-up, dan update status manual.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold uppercase">Total Data</p>
                  <h3 className="text-2xl font-black text-emerald-400">
                    {paginationTransaksi.total}
                  </h3>
                </div>
              </div>

              <form onSubmit={handleCariTransaksi} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Order ID / ID Player / Kode Produk"
                    value={filterTransaksi.search}
                    onChange={(e) => setFilterTransaksi({ ...filterTransaksi, search: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Status Bayar
                  </label>
                  <select
                    value={filterTransaksi.status_bayar}
                    onChange={(e) => handleGantiFilterTransaksi('status_bayar', e.target.value)}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="all">Semua</option>
                    <option value="pending">Pending</option>
                    <option value="sukses">Sukses</option>
                    <option value="gagal">Gagal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Status Topup
                  </label>
                  <select
                    value={filterTransaksi.status_topup}
                    onChange={(e) => handleGantiFilterTransaksi('status_topup', e.target.value)}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="all">Semua</option>
                    <option value="pending">Pending</option>
                    <option value="proses">Proses</option>
                    <option value="sukses">Sukses</option>
                    <option value="gagal">Gagal</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="md:col-span-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black transition-all"
                >
                  🔍 Cari Transaksi
                </button>
              </form>
            </div>

                           {/* TABLE */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-black">Daftar Order</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Page {paginationTransaksi.page} dari {paginationTransaksi.totalPage || 1}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCSVTransaksi}
                    className="px-4 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/25 text-xs font-black transition-all"
                  >
                    ⬇️ Download CSV
                  </button>

                  <button
                    onClick={() => ambilTransaksi()}
                    disabled={loadingTransaksi}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black disabled:opacity-50"
                  >
                    {loadingTransaksi ? 'Refresh...' : '🔄 Refresh'}
                  </button>
                </div>
              </div>

              {loadingTransaksi ? (
                <div className="p-10 text-center text-gray-400 font-bold animate-pulse">
                  Ngambil transaksi dari kulkas...
                </div>
              ) : daftarTransaksi.length === 0 ? (
                <div className="p-10 text-center text-gray-500 font-bold">
                  Transaksi gak ada bre.
                </div>
             ) : (
  <div className="p-4 space-y-3">
    {daftarTransaksi.map((trx) => (
      <div
        key={trx.id}
        className="bg-slate-950 border border-gray-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-all"
      >
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          
          {/* INFO UTAMA */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${warnaStatusBayar(trx.status_bayar)}`}>
                Bayar: {trx.status_bayar}
              </span>

              <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${warnaStatusTopup(trx.status_topup)}`}>
                Top-up: {trx.status_topup}
              </span>

              <span className="px-2 py-1 rounded-md text-[10px] font-black bg-gray-800 text-gray-400 border border-gray-700">
                {trx.payment_type || '-'}
              </span>

              <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${warnaProvider(trx.provider)}`}>
  {labelProvider(trx.provider)}
</span>
            </div>

            <p className="font-mono text-xs text-cyan-400 font-black break-all">
              {trx.order_id}
            </p>

            <p className="text-white font-black mt-2">
              {trx.nama_produk || trx.kode_produk}
            </p>

            <p className="text-xs text-gray-500 mt-1">
            {trx.nama_game} • Internal:{' '}
<span className="font-mono text-emerald-400">{trx.kode_produk}</span>
{' '}• Provider:{' '}
<span className="font-mono text-orange-400">{kodeProviderEfektif(trx)}</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                  Player
                </p>
                <p className="font-bold text-white break-all">
                  {trx.id_player}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Zone/Server: {trx.zone_player || '-'}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                  Harga
                </p>
                <p className="font-black text-green-400">
                  {formatRupiah(trx.harga)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trx.created_at ? new Date(trx.created_at).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>

            {(trx.customer_whatsapp || trx.customer_email) && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {trx.customer_whatsapp && (
                  <a
                    href={bikinLinkWhatsappCustomer(trx)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 font-black"
                  >
                    💬 {trx.customer_whatsapp}
                  </a>
                )}

                {trx.customer_email && (
                  <span className="text-gray-500 break-all">
                    ✉️ {trx.customer_email}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AKSI */}
          <div className="w-full xl:w-[260px] shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDetailTransaksi(trx)}
                className="px-3 py-2 rounded-xl bg-gray-800 text-gray-200 text-xs font-black hover:bg-gray-700 transition-all"
              >
                👁️ Detail
              </button>

              <button
                onClick={() => handleEditCatatan(trx)}
                className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-black hover:bg-indigo-600 hover:text-white transition-all"
              >
                📝 Catatan
              </button>

              <button
                onClick={() => handleCekProvider(trx)}
                disabled={
                  trx.status_bayar !== 'sukses' ||
                  trx.status_topup === 'sukses' ||
                  loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                }
                className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-black hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAksiTransaksi === `${trx.order_id}-cek-provider`
                  ? 'Cek...'
                  : '🔄 Cek Provider'}
              </button>

              <button
                onClick={() => handleRetryTopup(trx)}
                disabled={
                  trx.status_bayar !== 'sukses' ||
                  trx.status_topup === 'sukses' ||
                  loadingAksiTransaksi === `${trx.order_id}-retry`
                }
                className="px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-black hover:bg-purple-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAksiTransaksi === `${trx.order_id}-retry` ? 'Retry...' : '🚀 Retry'}
              </button>

              <button
                onClick={() =>
                  handleUpdateTransaksi(
                    trx,
                    { status_bayar: 'sukses' },
                    'Tandai pembayaran transaksi ini jadi sukses?'
                  )
                }
                disabled={trx.status_bayar === 'sukses'}
                className="px-3 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-black hover:bg-green-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                💰 Bayar OK
              </button>

              <button
                onClick={() =>
                  handleUpdateTransaksi(
                    trx,
                    { status_topup: 'sukses' },
                    'Tandai top-up transaksi ini jadi sukses manual?'
                  )
                }
                disabled={trx.status_topup === 'sukses'}
                className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✅ Topup OK
              </button>

              <button
                onClick={() =>
                  handleUpdateTransaksi(
                    trx,
                    { status_topup: 'gagal' },
                    'Tandai top-up transaksi ini gagal?'
                  )
                }
                disabled={trx.status_topup === 'gagal'}
                className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ❌ Gagal
              </button>
              <button
                onClick={() => handleHapusTransaksi(trx)}
                disabled={loadingAksiTransaksi === `${trx.order_id}-delete`}
                className="col-span-2 px-3 py-2 rounded-xl bg-red-600/10 text-red-300 border border-red-500/30 text-xs font-black hover:bg-red-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAksiTransaksi === `${trx.order_id}-delete`
                  ? 'Hapus...'
                  : '🗑️ Hapus Riwayat'}
              </button>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

              {/* PAGINATION */}
              <div className="p-4 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-xs text-gray-500 font-bold">
                  Total {paginationTransaksi.total} transaksi
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleGantiHalamanTransaksi(Math.max(1, paginationTransaksi.page - 1))}
                    disabled={paginationTransaksi.page <= 1}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-black hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>

                  <button
                    onClick={() => handleGantiHalamanTransaksi(paginationTransaksi.page + 1)}
                    disabled={paginationTransaksi.page >= paginationTransaksi.totalPage}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-black hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
       </section>
          </div>
            
 )}

 
        {/* TAB GAME */}
        {tabAktif === 'game' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black">
                  {modeEditGame ? '✏️ Edit Game' : '🎮 Tambah Game'}
                </h2>

                {modeEditGame && (
                  <button
                    type="button"
                    onClick={resetFormGame}
                    className="text-xs font-black text-gray-400 hover:text-white bg-gray-800 px-3 py-2 rounded-xl"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitGame} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nama Game</label>
                  <input
                    type="text"
                    required
                    placeholder="Mobile Legends"
                    value={formGame.nama}
                    onChange={(e) => setFormGame({ ...formGame, nama: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Publisher</label>
                  <input
                    type="text"
                    required
                    placeholder="Moonton"
                    value={formGame.publisher}
                    onChange={(e) => setFormGame({ ...formGame, publisher: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Upload Gambar</label>

                  <div className="bg-gray-950 border border-gray-700 rounded-2xl p-4">
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="image/*"
                      onChange={handlePilihGambar}
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-600 file:text-white file:font-bold hover:file:bg-purple-500"
                    />

                    <p className="text-[11px] text-gray-500 mt-2">
                      Format: JPG, PNG, WEBP, GIF. Maksimal 2MB.
                    </p>

                    {previewGambar && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
                        <img
                          src={previewGambar}
                          alt="Preview game"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Atau Path/URL Gambar
                  </label>
                  <input
                    type="text"
                    placeholder="/games/ml.webp atau https://..."
                    value={formGame.gambar}
                    onChange={(e) => {
                      setFormGame({ ...formGame, gambar: e.target.value });
                      if (!fileGambar) setPreviewGambar(e.target.value);
                    }}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kode Game </label>
                  <input
                    type="text"
                    required
                    placeholder="mobilelegend / freefire / ..."
                    value={formGame.kode_game}
                    onChange={(e) => setFormGame({ ...formGame, kode_game: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Butuh Zone / Server?</label>
                  <select
                    value={formGame.zone_id}
                    onChange={(e) => setFormGame({ ...formGame, zone_id: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="0">Tidak</option>
                    <option value="1">Ya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Server Game</label>
                  <input
                    type="text"
                    placeholder="Asia, America, Europe atau kosong"
                    value={formGame.server_game}
                    onChange={(e) => setFormGame({ ...formGame, server_game: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Status Game</label>
                  <select
                    value={formGame.status_game}
                    onChange={(e) => setFormGame({ ...formGame, status_game: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="aktif">Aktif - tampil & bisa dibeli</option>
                    <option value="coming_soon">Coming Soon - tampil tapi belum bisa checkout</option>
                    <option value="nonaktif">Nonaktif - sembunyi dari customer</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
      Badge Game
    </label>

    <input
      type="text"
      value={formGame.badge_label}
      onChange={(e) => setFormGame({ ...formGame, badge_label: e.target.value })}
      placeholder="🔥 Populer / 💎 Promo"
      className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
      Tipe Badge
    </label>

    <select
      value={formGame.badge_tipe}
      onChange={(e) => setFormGame({ ...formGame, badge_tipe: e.target.value })}
      className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500 font-bold"
    >
      <option value="none">Tanpa Badge</option>
      <option value="popular">🔥 Populer</option>
      <option value="promo">💎 Promo</option>
      <option value="fast">⚡ Fast</option>
      <option value="new">🆕 Baru</option>
      <option value="comingsoon">🐣 Comingsoon</option>
    </select>
  </div>
</div>

                <button
                  type="submit"
                  disabled={loadingGameForm}
                  className={`w-full py-4 mt-2 text-white font-black rounded-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    modeEditGame
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  }`}
                >
                  {loadingGameForm
                    ? 'Memproses...'
                    : modeEditGame
                      ? 'UPDATE GAME ✨'
                      : 'SIMPAN GAME 🎮'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl font-black">🕹️ Library Game</h2>
                  <p className="text-xs text-gray-500 mt-1">Total {daftarGame.length} game di etalase.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {daftarGame.map((game) => (
                  <div
                    key={game.id}
                    className="bg-gray-950 border border-gray-800 p-4 rounded-2xl hover:border-purple-500/50 transition-all group"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {game.gambar ? (
                          <img src={game.gambar} alt={game.nama} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🎮</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
                            ID: {game.id}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                            Number(game.zone_id) === 1
                              ? 'text-yellow-400 bg-yellow-500/10'
                              : 'text-gray-400 bg-gray-800'
                          }`}>
                            {Number(game.zone_id) === 1 ? 'BUTUH ZONE' : 'NO ZONE'}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${warnaStatusEtalase(game.status_game)}`}>
                            {labelStatusEtalase(game.status_game)}
                          </span>
                        </div>

                        <h4 className="font-black text-white truncate">{game.nama}</h4>
                        <p className="text-xs text-gray-500 truncate">{game.publisher}</p>
                        <p className="text-xs text-purple-400 font-mono mt-1 truncate">{game.kode_game}</p>
                        {game.server_game && (
                          <p className="text-[11px] text-gray-500 mt-1">Server: {game.server_game}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <button
                        onClick={() => handleEditGame(game)}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleToggleGame(game)}
                        className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                          game.status_game === 'aktif'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-blue-600 hover:text-white'
                            : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-600 hover:text-white'
                        }`}
                      >
                        {game.status_game === 'aktif' ? '⛔ Nonaktifkan' : '✅ Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleHapusGame(game)}
                        disabled={loadingHapusGame === game.id}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black hover:bg-blue-600 hover:text-white hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingHapusGame === game.id ? 'Hapus...' : '🗑️ Hapus'}
                      </button>
                    </div>
                  </div>
                ))}

                {daftarGame.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-gray-500 font-bold">
                    Belum ada game di etalase. Tambahin dulu bre!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB PRODUK */}
        {tabAktif === 'produk' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black">
                  {modeEditProduk ? '✏️ Edit Produk' : '✨ Tambah Produk'}
                </h2>

                {modeEditProduk && (
                  <button
                    type="button"
                    onClick={resetFormProduk}
                    className="text-xs font-black text-gray-400 hover:text-white bg-gray-800 px-3 py-2 rounded-xl"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitProduk} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kategori Game</label>
                  <select
                    required
                    value={formProduk.game_id}
                    onChange={(e) => setFormProduk({ ...formProduk, game_id: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500 font-bold"
                  >
                    {daftarGame.length === 0 ? (
                      <option value="">Belum ada game</option>
                    ) : (
                      daftarGame.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.nama}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
    Provider
  </label>

  <select
    value={formProduk.provider}
    onChange={(e) =>
      setFormProduk({
        ...formProduk,
        provider: e.target.value,
        kode_produk_provider:
          formProduk.kode_produk_provider || formProduk.kode_produk
      })
    }
    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500 font-bold"
  >
    <option value="apigames">APIGames</option>
    <option value="digiflazz">Digiflazz</option>
    <option value="mock">Mock / Simulasi</option>
    <option value="vipreseller">VIP Reseller</option>
  </select>
</div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Status Produk</label>
                  <select
                    value={formProduk.status_produk}
                    onChange={(e) => setFormProduk({ ...formProduk, status_produk: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="aktif">Aktif - tampil & bisa dibeli</option>
                    <option value="coming_soon">Coming Soon - tampil tapi belum bisa checkout</option>
                    <option value="nonaktif">Nonaktif - sembunyi dari customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kode Produk Internal</label>
                  <input
                    type="text"
                    required
                    placeholder="(Kode game API) Contoh: ML5-DIGI / UPMBL5"
                    value={formProduk.kode_produk}
                    onChange={(e) => {
                    const kodeBaru = e.target.value;

                    setFormProduk((prev) => ({
                      ...prev,
                      kode_produk: kodeBaru,
                      kode_produk_provider:
                        !prev.kode_produk_provider || prev.kode_produk_provider === prev.kode_produk
                          ? kodeBaru
                          : prev.kode_produk_provider
                    }));
                  }}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>
                  <div>
  <div className="flex items-center justify-between gap-3 mb-1">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
      Kode Produk Provider
    </label>

    <button
      type="button"
      onClick={() =>
        setFormProduk((prev) => ({
          ...prev,
          kode_produk_provider: prev.kode_produk
        }))
      }
      className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg"
    >
      Samakan
    </button>
  </div>

  <input
    type="text"
    required
    placeholder="Contoh Digiflazz: test | APIGames: UPMBL5"
    value={formProduk.kode_produk_provider}
    onChange={(e) =>
      setFormProduk((prev) => ({
        ...prev,
        kode_produk_provider: e.target.value
      }))
    }
    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
  />

  <p className="text-[11px] text-gray-500 mt-1">
    Ini kode asli yang ditembak ke {labelProvider(formProduk.provider)}.
    Kalau sama dengan kode internal, klik <b>Samakan</b>.
  </p>
</div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nama Tampilan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 86 Diamonds"
                    value={formProduk.nama_produk}
                    onChange={(e) => setFormProduk({ ...formProduk, nama_produk: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Harga Jual (Rp)</label>
                  
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 25000"
                    value={formProduk.harga}
                    onChange={(e) => setFormProduk({ ...formProduk, harga: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                  <input
  type="number"
  placeholder="Harga coret / harga asli, contoh: 50000"
  value={formProduk.harga_coret}
  onChange={(e) =>
    setFormProduk({ ...formProduk, harga_coret: e.target.value })
  }
  className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500"
/>
                </div>

                <div>
  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
    Harga Modal Provider
  </label>

  <input
    type="number"
    min="0"
    required
    placeholder="Contoh: 8700"
    value={formProduk.harga_modal}
    onChange={(e) => setFormProduk({ ...formProduk, harga_modal: e.target.value })}
    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
  />

  <p className="text-[11px] text-gray-500 mt-1">
    Ini modal dari provider. Profit = Harga Jual - Harga Modal.
  </p>

  
</div>

                <button
                  type="submit"
                  disabled={loadingForm || daftarGame.length === 0}
                  className={`w-full py-4 mt-2 text-white font-black rounded-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    modeEditProduk
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  {loadingForm
                    ? 'Memproses...'
                    : modeEditProduk
                      ? 'UPDATE PRODUK ✨'
                      : 'SIMPAN PRODUK 💾'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <div className="mb-6 border-b border-gray-800 pb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">📦 Etalase Produk Aktif</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Menampilkan <span className="text-cyan-400 font-bold">{produkTerfilter.length}</span> produk dari{' '}
                      <span className="text-white font-bold">{namaFilterProduk}</span>
                    </p>
                  </div>

                  <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                      Filter Game
                    </label>
                    <select
                      value={filterProdukGame}
                      onChange={(e) => setFilterProdukGame(e.target.value)}
                      className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500 font-bold"
                    >
                      <option value="all">Semua Game</option>
                      {daftarGame.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {produkTerfilter.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-950 border border-gray-800 p-4 rounded-2xl hover:border-cyan-500/50 transition-all group"
                  >
            
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-md inline-block">
                            {cariNamaGame(item.game_id)}
                          </span>

                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-md inline-block border ${warnaStatusEtalase(item.status_produk)}`}
                          >
                            {labelStatusEtalase(item.status_produk)}
                          </span>

                          <span className={`text-[10px] font-black px-2 py-1 rounded-md inline-block border ${warnaProvider(item.provider)}`}>
                            {labelProvider(item.provider)}
                          </span>
                        </div>

                        <h4 className="font-bold text-white truncate">
                          {item.nama_produk}
                        </h4>

                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500 font-mono truncate">
                            Internal:{' '}
                            <span className="text-emerald-400">
                              {item.kode_produk}
                            </span>
                          </p>

                          <p className="text-xs text-gray-500 font-mono truncate">
                            Provider:{' '}
                            <span className="text-orange-400">
                              {kodeProviderEfektif(item)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
  <p className="text-lg font-black text-green-400">
    {formatRupiah(item.harga)}
  </p>

  <p className="text-[11px] text-gray-500 mt-1">
    Modal: {formatRupiah(item.harga_modal)}
  </p>

  <p
    className={`text-[11px] font-black mt-1 ${
      Number(item.harga || 0) - Number(item.harga_modal || 0) > 0
        ? 'text-emerald-400'
        : 'text-red-400'
    }`}
  >
    Profit: {formatRupiah(Number(item.harga || 0) - Number(item.harga_modal || 0))}
  </p>
  {Number(item.harga_coret || 0) > Number(item.harga || 0) && (
  <p className="text-xs text-gray-500 line-through">
    {formatRupiah(item.harga_coret)}
  </p>
)}

  {item.kode_produk_provider && item.kode_produk_provider !== item.kode_produk && (
    <p className="text-[10px] text-orange-400 font-black mt-1">
      beda kode
    </p>
  )}
</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => handleEditProduk(item)}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all"
                      >
                        ✏️ Edit
                      </button>
                        <button
                          onClick={() => handleToggleProduk(item)}
                          className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                            item.status_produk === 'aktif'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-blue-600 hover:text-white'
                              : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-600 hover:text-white'
                          }`}
                        >
                          {item.status_produk === 'aktif' ? '⛔ Nonaktifkan' : '✅ Aktifkan'}
                        </button>
                      <button
                        onClick={() => handleHapusProduk(item)}
                        disabled={loadingHapus === item.id}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black hover:bg-blue-600 hover:text-white hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingHapus === item.id ? 'Hapus...' : '🗑️ Hapus'}
                      </button>
                    </div>
                  </div>
                ))}

                {produkTerfilter.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-gray-500 font-bold">
                    {filterProdukGame === 'all'
                      ? 'Kulkas lu masih kosong bre. Tambahin produk di sebelah kiri!'
                      : `Belum ada produk buat ${namaFilterProduk} bre.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* TAB PROMO */}
        {tabAktif === 'promo' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
    <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
      <h2 className="text-xl font-black mb-4">
        {modeEditPromo ? 'Edit Promo Slider' : 'Tambah Promo Slider'}
      </h2>

      <form onSubmit={handleSubmitPromo} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Badge
          </label>
          <input
            value={formPromo.badge}
            onChange={(e) => setFormPromo({ ...formPromo, badge: e.target.value })}
            placeholder="Promo Mingguan"
            className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Judul Promo
          </label>
          <input
            value={formPromo.title}
            onChange={(e) => setFormPromo({ ...formPromo, title: e.target.value })}
            placeholder="Top Up Lebih Hemat"
            className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Deskripsi
          </label>
          <textarea
            value={formPromo.description}
            onChange={(e) => setFormPromo({ ...formPromo, description: e.target.value })}
            placeholder="Tulis deskripsi promo..."
            rows={4}
            className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              Text Tombol
            </label>
            <input
              value={formPromo.cta_text}
              onChange={(e) => setFormPromo({ ...formPromo, cta_text: e.target.value })}
              placeholder="Mulai Top Up"
              className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              Link Tombol
            </label>
            <input
              value={formPromo.cta_href}
              onChange={(e) => setFormPromo({ ...formPromo, cta_href: e.target.value })}
              placeholder="#game-list"
              className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
            Tema Gradient
          </label>
          <select
            value={formPromo.gradient}
            onChange={(e) => setFormPromo({ ...formPromo, gradient: e.target.value })}
            className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
          >
            {gradientPromoOptions.map((gradient) => (
              <option key={gradient} value={gradient}>
                {gradient}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              Urutan
            </label>
            <input
              type="number"
              value={formPromo.sort_order}
              onChange={(e) => setFormPromo({ ...formPromo, sort_order: e.target.value })}
              className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">
              Status
            </label>
            <select
              value={formPromo.is_active}
              onChange={(e) => setFormPromo({ ...formPromo, is_active: Number(e.target.value) })}
              className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-sky-500"
            >
              <option value={1}>Aktif</option>
              <option value={0}>Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-slate-950 p-4">
          <p className="text-xs font-black text-gray-500 mb-2">
            Preview Mini
          </p>

          <div className={`rounded-2xl bg-gradient-to-br ${formPromo.gradient} p-4`}>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-200">
              {formPromo.badge || 'Badge'}
            </span>

            <h3 className="mt-3 text-lg font-black">
              {formPromo.title || 'Judul Promo'}
            </h3>

            <p className="mt-2 text-xs text-gray-300">
              {formPromo.description || 'Deskripsi promo akan tampil di sini.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            disabled={loadingPromoForm}
            type="submit"
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-black disabled:opacity-50"
          >
            {loadingPromoForm
              ? 'Nyimpan...'
              : modeEditPromo
                ? 'Update Promo'
                : 'Tambah Promo'}
          </button>

          {modeEditPromo && (
            <button
              type="button"
              onClick={resetFormPromo}
              className="px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-black"
            >
              Batal
            </button>
          )}
        </div>
      </form>
    </section>

    <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black">Daftar Promo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Promo aktif bakal tampil di homepage.
          </p>
        </div>

        <button
          onClick={ambilPromo}
          disabled={loadingPromo}
          className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black disabled:opacity-50"
        >
          {loadingPromo ? 'Refresh...' : '🔄 Refresh'}
        </button>
      </div>

      {loadingPromo ? (
        <div className="p-10 text-center text-gray-400 font-bold animate-pulse">
          Ngambil promo...
        </div>
      ) : daftarPromo.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-slate-950 p-8 text-center text-gray-500 font-bold">
          Belum ada promo bre.
        </div>
      ) : (
        <div className="space-y-3">
          {daftarPromo.map((promo) => (
            <div
              key={promo.id}
              className="rounded-2xl border border-gray-800 bg-slate-950 p-4"
            >
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black">
                      {promo.badge}
                    </span>

                    <span className={`px-3 py-1 rounded-full border text-[10px] font-black ${
                      Number(promo.is_active) === 1
                        ? 'border-green-500/20 bg-green-500/10 text-green-400'
                        : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}>
                      {Number(promo.is_active) === 1 ? 'Aktif' : 'Nonaktif'}
                    </span>

                    <span className="px-3 py-1 rounded-full border border-gray-700 bg-gray-900 text-gray-400 text-[10px] font-black">
                      Urutan {promo.sort_order}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">
                    {promo.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                    {promo.description}
                  </p>

                  <p className="mt-2 text-xs text-gray-500 font-bold">
                    Tombol: {promo.cta_text} → {promo.cta_href}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => handleTogglePromo(promo)}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black"
                  >
                    {Number(promo.is_active) === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  <button
                    onClick={() => handleEditPromo(promo)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleHapusPromo(promo)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </div>
)}

        {/* TAB REQUEST gAME */}
        {tabAktif === 'metode-bayar' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-300/80">
                    Payment Control
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">💳 Setting Metode Bayar</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                    Atur metode pembayaran tanpa deploy ulang. Status aktif bakal muncul dan bisa dipakai user,
                    sedangkan maintenance/coming soon/nonaktif otomatis dikunci di kasir dan backend checkout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={ambilMetodeBayarAdmin}
                  disabled={loadingMetodeBayarAdmin}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingMetodeBayarAdmin ? 'Refresh...' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {loadingMetodeBayarAdmin && daftarMetodeBayarAdmin.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center font-bold text-slate-400">
                Ngambil setting metode bayar...
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(metodeBayarAdminByGrup).map(([grup, items]) => (
                  <div key={grup} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        {grup}
                      </p>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {items.map((item) => {
                        const sedangLoading = loadingAksiMetodeBayar === item.value;

                        return (
                          <form
                            key={item.value}
                            onSubmit={(e) => handleSimpanMetodeBayarAdmin(e, item)}
                            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
                                  {item.logo ? (
                                    <img
                                      src={item.logo}
                                      alt={item.label}
                                      className="max-h-8 max-w-[52px] object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling.style.display = 'block';
                                      }}
                                    />
                                  ) : null}
                                  <span className="hidden text-xs font-black text-slate-900">
                                    {item.fallback}
                                  </span>
                                </div>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-black text-white">{item.label}</h3>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${warnaStatusMetodeBayarAdmin(item.status_metode)}`}>
                                      {labelStatusMetodeBayarAdmin(item.status_metode)}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-mono text-xs font-bold text-slate-500">{item.value}</p>
                                </div>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStatusCepatMetodeBayar(item, 'aktif')}
                                  disabled={sedangLoading || item.status_metode === 'aktif'}
                                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Aktif
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusCepatMetodeBayar(item, 'maintenance')}
                                  disabled={sedangLoading || item.status_metode === 'maintenance'}
                                  className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-black text-yellow-300 transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  MT
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status</span>
                                <select
                                  name="status_metode"
                                  defaultValue={item.status_metode}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                >
                                  <option value="aktif">Aktif</option>
                                  <option value="maintenance">Maintenance</option>
                                  <option value="coming_soon">Coming Soon</option>
                                  <option value="nonaktif">Nonaktif</option>
                                </select>
                              </label>

                              <label className="space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Rekomendasi</span>
                                <select
                                  name="rekomendasi"
                                  defaultValue={item.rekomendasi ? 1 : 0}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                >
                                  <option value="0">Biasa</option>
                                  <option value="1">Rekomendasi</option>
                                </select>
                              </label>

                              <label className="space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Fee Admin</span>
                                <input
                                  name="biaya_admin"
                                  type="number"
                                  min="0"
                                  defaultValue={item.biaya}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                />
                              </label>

                              <label className="space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Minimal Transaksi</span>
                                <input
                                  name="minimal_transaksi"
                                  type="number"
                                  min="0"
                                  defaultValue={item.minimal}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                />
                              </label>

                              <label className="space-y-1 md:col-span-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Deskripsi di Kasir</span>
                                <input
                                  name="deskripsi"
                                  defaultValue={item.desc}
                                  maxLength={255}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                />
                              </label>

                              <label className="space-y-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Urutan</span>
                                <input
                                  name="urutan"
                                  type="number"
                                  min="0"
                                  defaultValue={item.sort_order}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                                />
                              </label>

                              <div className="flex items-end">
                                <button
                                  type="submit"
                                  disabled={sedangLoading}
                                  className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {sedangLoading ? 'Nyimpen...' : '💾 Simpan'}
                                </button>
                              </div>
                            </div>
                          </form>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



        {tabAktif === 'voucher' && (
          <AdminVoucherPanel formatRupiah={formatRupiah} />
        )}

        {tabAktif === 'request-game' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
          Total
        </p>
        <h3 className="mt-1 text-2xl font-black text-white">
          {statsRequestGame?.total || 0}
        </h3>
      </div>

      <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-blue-300">
          Baru
        </p>
        <h3 className="mt-1 text-2xl font-black text-blue-300">
          {statsRequestGame?.baru || 0}
        </h3>
      </div>

      <div className="rounded-3xl border border-purple-500/20 bg-purple-500/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-purple-300">
          Diproses
        </p>
        <h3 className="mt-1 text-2xl font-black text-purple-300">
          {statsRequestGame?.diproses || 0}
        </h3>
      </div>

      <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-green-300">
          Selesai
        </p>
        <h3 className="mt-1 text-2xl font-black text-green-300">
          {statsRequestGame?.selesai || 0}
        </h3>
      </div>

      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-wider text-red-300">
          Ditolak
        </p>
        <h3 className="mt-1 text-2xl font-black text-red-300">
          {statsRequestGame?.ditolak || 0}
        </h3>
      </div>
    </div>

    <div className="mb-5 rounded-3xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-black text-white">
          💡 Request Game User
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Lihat game yang dicari user tapi belum tersedia di NaXaShop.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
        <input
          type="text"
          value={filterRequestGame.search}
          onChange={(e) =>
            setFilterRequestGame((prev) => ({
              ...prev,
              search: e.target.value
            }))
          }
          placeholder="Cari nama game, kontak, atau catatan..."
          className="rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
        />

        <select
          value={filterRequestGame.status}
          onChange={(e) =>
            setFilterRequestGame((prev) => ({
              ...prev,
              status: e.target.value
            }))
          }
          className="rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
          <option value="ditolak">Ditolak</option>
        </select>

        <button
          type="button"
          onClick={() => ambilRequestGame(filterRequestGame)}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
        >
          Filter
        </button>
      </div>
    </div>

    {loadingRequestGame ? (
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        Lagi ngambil request game...
      </div>
    ) : daftarRequestGame.length === 0 ? (
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-4xl">🕸️</p>
        <h3 className="mt-3 text-lg font-black text-white">
          Belum ada request game
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Nanti kalau user nyari game yang belum ada, masuknya ke sini.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4">
        {daftarRequestGame.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl shadow-black/20"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black ${warnaStatusRequest(
                      item.status_request
                    )}`}
                  >
                    {labelStatusRequest(item.status_request)}
                  </span>

                  <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-400">
                    #{item.id}
                  </span>

                  <span className="text-[11px] font-bold text-gray-500">
                    {formatTanggalAdmin(item.created_at)}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">
                  {item.nama_game}
                </h3>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Kontak
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-gray-300">
                      {item.kontak || 'Tidak diisi'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-800 bg-slate-950/60 p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                      Catatan
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">
                      {item.catatan || 'Tidak ada catatan.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 lg:w-56">
                <select
                  value={item.status_request}
                  disabled={loadingAksiRequestGame === item.id}
                  onChange={(e) =>
                    handleUpdateStatusRequestGame(item, e.target.value)
                  }
                  className="rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="baru">Baru</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>

                {item.kontak && String(item.kontak).startsWith('62') && (
                  <a
                    href={`https://wa.me/${item.kontak}?text=${encodeURIComponent(
                      `Halo, terima kasih sudah request ${item.nama_game} di NaXaShop.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-green-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-green-500"
                  >
                    Chat User
                  </a>
                )}

                <button
                  type="button"
                  disabled={loadingAksiRequestGame === item.id}
                  onClick={() => handleHapusRequestGame(item)}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
      </div>
    </div>
  );
}