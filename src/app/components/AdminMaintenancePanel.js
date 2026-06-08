'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

const MODE_OPTIONS = [
  {
    value: 'off',
    label: 'Normal',
    badge: 'Toko aktif',
    desc: 'Website dan checkout berjalan normal.',
  },
  {
    value: 'banner',
    label: 'Banner Info',
    badge: 'Info',
    desc: 'Tampilkan pengumuman di frontend, tapi checkout tetap bisa.',
  },
  {
    value: 'checkout',
    label: 'Tutup Checkout',
    badge: 'Checkout Maintenance',
    desc: 'User masih bisa lihat website dan cek pesanan, tapi tidak bisa bikin order baru.',
  },
  {
    value: 'full',
    label: 'Full Maintenance',
    badge: 'Maintenance',
    desc: 'Tampilkan layar maintenance besar untuk user. Admin/login tetap bisa dibuka.',
  },
];

const DEFAULT_FORM = {
  enabled: false,
  mode: 'off',
  title: 'NaXaShop sedang maintenance',
  message:
    'Beberapa layanan sedang dirapikan. Kamu masih bisa cek pesanan, tapi checkout mungkin sementara ditutup.',
  badge: 'Maintenance',
  estimated_until: '',
};

function warnaMode(mode) {
  if (mode === 'off') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (mode === 'banner') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
  if (mode === 'checkout') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-red-500/20 bg-red-500/10 text-red-300';
}

export default function AdminMaintenancePanel() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const modeAktif = useMemo(
    () => MODE_OPTIONS.find((item) => item.value === form.mode) || MODE_OPTIONS[0],
    [form.mode]
  );

  async function ambilSetting() {
    setLoading(true);

    try {
      const respon = await fetch('/api/admin/maintenance', { cache: 'no-store' });
      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal ambil setting maintenance.');
      }

      const data = hasil.data || {};
      setForm({
        enabled: Boolean(data.enabled),
        mode: data.enabled ? data.mode || 'banner' : 'off',
        title: data.title || DEFAULT_FORM.title,
        message: data.message || DEFAULT_FORM.message,
        badge: data.badge || DEFAULT_FORM.badge,
        estimated_until: data.estimated_until || '',
      });
    } catch (error) {
      Swal.fire({
        title: 'Gagal ambil setting',
        text: error.message || 'Dapur maintenance ngambek bre.',
        icon: 'error',
        background: '#111827',
        color: '#fff',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    ambilSetting();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pilihMode(mode) {
    const option = MODE_OPTIONS.find((item) => item.value === mode) || MODE_OPTIONS[0];

    setForm((prev) => ({
      ...prev,
      mode,
      enabled: mode !== 'off',
      badge: mode === 'off' ? prev.badge : option.badge,
      title:
        mode === 'checkout'
          ? 'Checkout NaXaShop sedang maintenance'
          : mode === 'full'
            ? 'NaXaShop sedang maintenance'
            : mode === 'banner'
              ? 'Info terbaru dari NaXaShop'
              : prev.title,
      message:
        mode === 'checkout'
          ? 'Checkout sementara ditutup biar transaksi tetap aman. Pesanan yang sudah masuk tetap bisa dicek lewat halaman lacak.'
          : mode === 'full'
            ? 'Sistem sedang dirapikan sebentar. Cek pesanan tetap tersedia, tapi transaksi baru sementara ditutup.'
            : mode === 'banner'
              ? 'Ada informasi penting dari NaXaShop. Transaksi tetap berjalan normal.'
              : prev.message,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        enabled: form.mode !== 'off' && Boolean(form.enabled),
        mode: form.enabled ? form.mode : 'off',
      };

      const respon = await fetch('/api/admin/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal simpan setting maintenance.');
      }

      const data = hasil.data || {};
      setForm({
        enabled: Boolean(data.enabled),
        mode: data.enabled ? data.mode || 'banner' : 'off',
        title: data.title || DEFAULT_FORM.title,
        message: data.message || DEFAULT_FORM.message,
        badge: data.badge || DEFAULT_FORM.badge,
        estimated_until: data.estimated_until || '',
      });

      Swal.fire({
        title: 'Maintenance tersimpan ✅',
        text: hasil.pesan || 'Setting maintenance berhasil disimpan.',
        icon: 'success',
        background: '#111827',
        color: '#fff',
      });
    } catch (error) {
      Swal.fire({
        title: 'Gagal simpan ❌',
        text: error.message || 'Gagal simpan maintenance bre.',
        icon: 'error',
        background: '#111827',
        color: '#fff',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/15 blur-[90px]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300/80">
              Global Control
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">🛠️ Maintenance Global</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Matikan checkout atau tampilkan banner maintenance dari dashboard, tanpa deploy ulang.
              Cocok kalau Midtrans/provider lagi ngambek biar user gak bikin order baru.
            </p>
          </div>

          <button
            type="button"
            onClick={ambilSetting}
            disabled={loading || saving}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'Refresh...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">Setting Mode</h3>
              <p className="text-xs font-semibold text-slate-500">Pilih level maintenance sesuai kondisi toko.</p>
            </div>

            <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${warnaMode(form.mode)}`}>
              {modeAktif.label}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {MODE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => pilihMode(item.value)}
                className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  form.mode === item.value
                    ? 'border-blue-400/40 bg-blue-500/10 shadow-lg shadow-blue-950/20'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Badge</span>
              <input
                value={form.badge}
                onChange={(e) => updateField('badge', e.target.value)}
                maxLength={40}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                placeholder="Maintenance"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Estimasi Normal</span>
              <input
                value={form.estimated_until}
                onChange={(e) => updateField('estimated_until', e.target.value)}
                maxLength={80}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                placeholder="Contoh: 22.30 WIB / Secepatnya"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Judul</span>
              <input
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                maxLength={120}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pesan ke User</span>
              <textarea
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-bold leading-relaxed text-white outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex-1 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Nyimpen...' : '💾 Simpan Maintenance'}
            </button>

            <button
              type="button"
              onClick={() => pilihMode('off')}
              disabled={saving || loading}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500 hover:text-white disabled:opacity-50"
            >
              🟢 Normalin Toko
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
          <h3 className="text-xl font-black text-white">Preview Tampilan</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Kira-kira user bakal lihat seperti ini.</p>

          <div className="mt-5 overflow-hidden rounded-[1.8rem] border border-slate-800 bg-slate-950 p-4">
            {form.mode === 'full' ? (
              <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">🛠️</div>
                <p className="text-[10px] font-black uppercase tracking-wider text-red-300">{form.badge}</p>
                <h4 className="mt-2 text-lg font-black text-white">{form.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{form.message}</p>
                {form.estimated_until && (
                  <p className="mt-3 text-[11px] font-black text-red-200">Estimasi: {form.estimated_until}</p>
                )}
              </div>
            ) : form.mode === 'off' ? (
              <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                <p className="text-3xl">🟢</p>
                <h4 className="mt-2 text-lg font-black text-white">Toko normal</h4>
                <p className="mt-1 text-xs text-emerald-200/80">Banner maintenance tidak tampil dan checkout dibuka.</p>
              </div>
            ) : (
              <div className={`rounded-[1.5rem] border p-4 ${warnaMode(form.mode)}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider">{form.badge}</span>
                  {form.estimated_until && <span className="text-[10px] font-bold opacity-80">Estimasi: {form.estimated_until}</span>}
                </div>
                <h4 className="text-sm font-black text-white">{form.title}</h4>
                <p className="mt-1 text-xs leading-relaxed opacity-85">{form.message}</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-400">
            <p><span className="font-black text-white">Banner Info:</span> cuma pengumuman, checkout tetap jalan.</p>
            <p><span className="font-black text-white">Tutup Checkout:</span> user gak bisa bikin order baru, tapi masih bisa lihat web.</p>
            <p><span className="font-black text-white">Full Maintenance:</span> user lihat layar maintenance besar. Admin tetap bisa masuk buat matiin mode ini.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
