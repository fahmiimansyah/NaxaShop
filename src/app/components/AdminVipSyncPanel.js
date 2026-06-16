'use client';

import { useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCheckCircle,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiZap
} from 'react-icons/fi';

const defaultVipSyncPanelState = {
  filterGame: '',
  filterStatus: 'available',
  search: '',
  loading: false,
  hasil: null,
  error: '',
  lastSyncedAt: null
};

function formatRupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function normalisasi(value) {
  return String(value || '').trim().toLowerCase();
}

function badgeStatusClass(status) {
  const s = normalisasi(status);

  if (s === 'aktif' || s === 'available') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }

  if (s === 'empty' || s === 'gangguan') {
    return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  }

  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function cariGameNaxa(item, daftarGame = []) {
  const targetRaw = `${item?.game_provider || ''} ${item?.nama_produk_provider || ''}`;
  const target = normalisasi(targetRaw)
    .replace(/mobile legends\s+[a-z]\b/g, 'mobile legends')
    .replace(/\([^)]*\)/g, '')
    .replace(/global|indonesia|malaysia|philippines|brazil|russia|singapore|turkey/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return daftarGame.find((game) => {
    const nama = normalisasi(game.nama);
    const kode = normalisasi(game.kode_game);

    if (!nama) return false;

    return (
      target.includes(nama) ||
      nama.includes(target) ||
      (kode && target.includes(kode))
    );
  });
}

function labelWaktuSync(value) {
  if (!value) return '';

  const selisihMenit = Math.max(0, Math.floor((Date.now() - Number(value)) / 60000));

  if (selisihMenit <= 0) return 'baru aja';
  if (selisihMenit < 60) return `${selisihMenit} menit lalu`;

  const jam = Math.floor(selisihMenit / 60);
  return `${jam} jam lalu`;
}

export default function AdminVipSyncPanel({
  daftarGame = [],
  onPilihProduk,
  vipSyncState,
  setVipSyncState
}) {
  const [localState, setLocalState] = useState(defaultVipSyncPanelState);
  const isControlled = typeof setVipSyncState === 'function';
  const state = {
    ...defaultVipSyncPanelState,
    ...(isControlled ? vipSyncState : localState)
  };

  const updateVipSyncState = (patch) => {
    const updater = (prev) => ({
      ...defaultVipSyncPanelState,
      ...(prev || {}),
      ...(typeof patch === 'function' ? patch(prev || {}) : patch)
    });

    if (isControlled) {
      setVipSyncState(updater);
    } else {
      setLocalState(updater);
    }
  };

  const {
    filterGame,
    filterStatus,
    search,
    loading,
    hasil,
    error,
    lastSyncedAt
  } = state;

  const produkPreview = hasil?.data || [];
  const lastSyncedLabel = labelWaktuSync(lastSyncedAt);

  const produkTerfilter = useMemo(() => {
    const keyword = normalisasi(search);

    if (!keyword) return produkPreview;

    return produkPreview.filter((item) => {
      return `${item.kode_produk_provider || ''} ${item.game_provider || ''} ${item.nama_produk_provider || ''}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [produkPreview, search]);

  const ringkasan = hasil?.ringkasan || {
    total_produk: 0,
    total_aktif: 0,
    total_nonaktif: 0
  };

  async function tarikProdukVip() {
    try {
      updateVipSyncState({ loading: true, error: '' });

      const response = await fetch('/api/admin/sync-vipreseller/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter_game: filterGame,
          filter_status: filterStatus
        })
      });

      const data = await response.json();

      if (!response.ok || !data.sukses) {
        throw new Error(data.pesan || 'Gagal tarik produk VIPReseller.');
      }

      updateVipSyncState({
        hasil: data,
        error: '',
        loading: false,
        lastSyncedAt: Date.now()
      });
    } catch (err) {
      updateVipSyncState({
        error: err.message || 'Gagal tarik produk VIPReseller.',
        loading: false
      });
    }
  }

  function bersihkanPreview() {
    updateVipSyncState(defaultVipSyncPanelState);
  }

  return (
    <div className="promax-section space-y-4">
      <div className="figma-card figma-shine relative overflow-hidden rounded-[0.95rem] p-4 sm:p-5">
        <div className="soft-blob pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/20 blur-[90px]" />
        <div className="soft-blob pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-300/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
              <FiZap />
              VIP Sync Center
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Tarik Produk VIPReseller
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-400">
              Ambil katalog langsung dari API provider, cek dulu di preview, baru pilih produk yang mau dimasukin ke form produk NaXaShop.
            </p>

            {hasil && (
              <p className="mt-3 inline-flex rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200">
                Preview masih keinget walau pindah tab admin{lastSyncedLabel ? ` • sync ${lastSyncedLabel}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hasil && (
              <button
                type="button"
                onClick={bersihkanPreview}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.10] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiTrash2 />
                Bersihkan
              </button>
            )}

            <button
              type="button"
              onClick={tarikProdukVip}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-950/35 transition hover:-translate-y-0.5 hover:from-purple-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? 'Lagi narik...' : hasil ? 'Refresh Produk' : 'Tarik Produk'}
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Filter Game Provider
            </label>
            <input
              value={filterGame}
              onChange={(e) => updateVipSyncState({ filterGame: e.target.value })}
              placeholder="Kosongin dulu / contoh: Mobile Legends"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/60 focus:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => updateVipSyncState({ filterStatus: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-purple-400/60 focus:bg-slate-950"
            >
              <option value="available">Available</option>
              <option value="empty">Empty</option>
              <option value="">Semua</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="relative mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="figma-card rounded-[0.95rem] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total kebaca</p>
          <p className="mt-1 text-2xl font-black text-white">{ringkasan.total_produk}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">produk dari provider</p>
        </div>

        <div className="figma-card rounded-[0.95rem] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">Available</p>
          <p className="mt-1 text-2xl font-black text-emerald-200">{ringkasan.total_aktif}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">siap dijual</p>
        </div>

        <div className="figma-card rounded-[0.95rem] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300/80">Empty / Gangguan</p>
          <p className="mt-1 text-2xl font-black text-yellow-200">{ringkasan.total_nonaktif}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">jangan diaktifin dulu</p>
        </div>
      </div>

      <div className="figma-card rounded-[0.95rem] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Preview produk</p>
            <h3 className="mt-1 text-xl font-black text-white">Etalase mentah VIP</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Klik “Pakai ke Form” buat ngisi form Tambah Produk otomatis. Preview ini disimpen di state admin utama, jadi gak ilang pas balik dari tab Produk.
            </p>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => updateVipSyncState({ search: e.target.value })}
              placeholder="Cari kode / nama / game..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/60"
            />
          </div>
        </div>

        {produkPreview.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-purple-300/10 bg-slate-950/45 p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl text-purple-200">
              <FiBox />
            </div>
            <p className="text-base font-black text-white">Belum ada produk ketarik</p>
            <p className="mt-1 max-w-sm text-sm font-semibold text-slate-500">
              Klik tombol Tarik Produk dulu. Kalau env VIP belum bener, nanti errornya muncul di atas.
            </p>
          </div>
        ) : produkTerfilter.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-300/10 bg-slate-950/45 p-8 text-center text-sm font-bold text-slate-500">
            Produk gak ketemu dari keyword itu, bree.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {produkTerfilter.map((item) => {
              const gameCocok = cariGameNaxa(item, daftarGame);
              const profit = Number(item.harga_jual || 0) - Number(item.harga_modal || 0);

              return (
                <div
                  key={`${item.kode_produk_provider}-${item.no}`}
                  className="group rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition hover:-translate-y-0.5 hover:border-purple-400/35 hover:bg-slate-950/80"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-300">
                      VIP
                    </span>
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${badgeStatusClass(item.status_final)}`}>
                      {item.status_provider || item.status_final}
                    </span>
                    <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-300">
                      {item.server_required ? 'ZONE' : 'ID SAJA'}
                    </span>
                  </div>

                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {item.game_provider || 'Game provider'}
                  </p>

                  <h4 className="mt-1 line-clamp-2 min-h-[44px] text-sm font-black leading-snug text-white">
                    {item.nama_produk_provider || '-'}
                  </h4>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-500">Modal</span>
                      <span className="text-xs font-black text-slate-300">{formatRupiah(item.harga_modal)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-500">Jual saran</span>
                      <span className="text-sm font-black text-emerald-300">{formatRupiah(item.harga_jual)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-500">Profit</span>
                      <span className={profit > 0 ? 'text-xs font-black text-emerald-300' : 'text-xs font-black text-red-300'}>
                        {formatRupiah(profit)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-500">Match NaXa</p>
                      <p className={gameCocok ? 'truncate font-black text-blue-200' : 'truncate font-black text-yellow-200'}>
                        {gameCocok?.nama || 'Belum ketemu'}
                      </p>
                    </div>
                    {gameCocok ? (
                      <FiCheckCircle className="shrink-0 text-emerald-300" />
                    ) : (
                      <FiAlertTriangle className="shrink-0 text-yellow-300" />
                    )}
                  </div>

                  <div className="mt-3 truncate rounded-lg bg-black/20 px-3 py-2 font-mono text-[10px] font-bold text-orange-300">
                    {item.kode_produk_provider || '-'}
                  </div>

                  <button
                    type="button"
                    onClick={() => onPilihProduk?.(item)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-xs font-black text-purple-100 transition hover:border-purple-400/40 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white"
                  >
                    Pakai ke Form
                    <FiArrowRight />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
