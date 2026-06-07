'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

const FORM_DEFAULT = {
  kode: '',
  nama: '',
  tipe_diskon: 'nominal',
  nilai_diskon: '',
  minimal_transaksi: '0',
  maksimal_diskon: '0',
  kuota_total: '0',
  mulai_pada: '',
  berakhir_pada: '',
  status: 'aktif',
  catatan: ''
};

function formatRupiahDefault(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTanggal(value) {
  if (!value) return '-';

  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return '-';

  return tanggal.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getBadgeStatus(voucher) {
  const status = String(voucher?.status || '').toLowerCase();
  const now = new Date();
  const mulai = voucher?.mulai_pada ? new Date(voucher.mulai_pada) : null;
  const akhir = voucher?.berakhir_pada ? new Date(voucher.berakhir_pada) : null;
  const kuotaTotal = Number(voucher?.kuota_total || 0);
  const kuotaTerpakai = Number(voucher?.kuota_terpakai || 0);

  if (status !== 'aktif') {
    return {
      label: 'Nonaktif',
      className: 'border-red-500/20 bg-red-500/10 text-red-300'
    };
  }

  if (mulai && mulai > now) {
    return {
      label: 'Belum Mulai',
      className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
    };
  }

  if (akhir && akhir < now) {
    return {
      label: 'Expired',
      className: 'border-gray-600 bg-gray-800 text-gray-400'
    };
  }

  if (kuotaTotal > 0 && kuotaTerpakai >= kuotaTotal) {
    return {
      label: 'Kuota Habis',
      className: 'border-orange-500/20 bg-orange-500/10 text-orange-300'
    };
  }

  return {
    label: 'Aktif',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  };
}

export default function AdminVoucherPanel({ formatRupiah = formatRupiahDefault }) {
  const [daftarVoucher, setDaftarVoucher] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingAksi, setLoadingAksi] = useState(null);
  const [modeEdit, setModeEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formVoucher, setFormVoucher] = useState(FORM_DEFAULT);

  const ringkasan = useMemo(() => {
    const total = daftarVoucher.length;
    const aktif = daftarVoucher.filter((item) => getBadgeStatus(item).label === 'Aktif').length;
    const pemakaian = daftarVoucher.reduce(
      (sum, item) => sum + Number(item.kuota_terpakai || 0),
      0
    );

    return { total, aktif, pemakaian };
  }, [daftarVoucher]);

  const resetForm = () => {
    setFormVoucher(FORM_DEFAULT);
    setModeEdit(false);
    setEditId(null);
  };

  const ambilVoucher = async () => {
    setLoading(true);

    try {
      const respon = await fetch('/api/admin/voucher', { cache: 'no-store' });
      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal ambil voucher.');
      }

      setDaftarVoucher(hasil.data || []);
    } catch (error) {
      Swal.fire({
        title: 'Gagal ambil voucher',
        text: error.message || 'Gagal ambil voucher bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ambilVoucher();
  }, []);

  const handleSubmitVoucher = async (e) => {
    e.preventDefault();
    setLoadingForm(true);

    try {
      const payload = {
        ...formVoucher,
        kode: String(formVoucher.kode || '').toUpperCase().replace(/\s+/g, ''),
        nilai_diskon: Number(formVoucher.nilai_diskon || 0),
        minimal_transaksi: Number(formVoucher.minimal_transaksi || 0),
        maksimal_diskon: Number(formVoucher.maksimal_diskon || 0),
        kuota_total: Number(formVoucher.kuota_total || 0)
      };

      const respon = await fetch('/api/admin/voucher', {
        method: modeEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modeEdit ? { ...payload, id: editId } : payload)
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal simpan voucher.');
      }

      Swal.fire({
        title: 'Berhasil ✅',
        text: hasil.pesan,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      resetForm();
      ambilVoucher();
    } catch (error) {
      Swal.fire({
        title: 'Gagal simpan ❌',
        text: error.message || 'Gagal simpan voucher bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingForm(false);
    }
  };

  const handleEditVoucher = (voucher) => {
    setModeEdit(true);
    setEditId(voucher.id);
    setFormVoucher({
      kode: voucher.kode || '',
      nama: voucher.nama || '',
      tipe_diskon: voucher.tipe_diskon || 'nominal',
      nilai_diskon: String(voucher.nilai_diskon || ''),
      minimal_transaksi: String(voucher.minimal_transaksi || 0),
      maksimal_diskon: String(voucher.maksimal_diskon || 0),
      kuota_total: String(voucher.kuota_total || 0),
      mulai_pada: voucher.mulai_pada_input || '',
      berakhir_pada: voucher.berakhir_pada_input || '',
      status: voucher.status || 'aktif',
      catatan: voucher.catatan || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleVoucher = async (voucher) => {
    const statusBaru = voucher.status === 'aktif' ? 'nonaktif' : 'aktif';
    setLoadingAksi(`${voucher.id}-toggle`);

    try {
      const respon = await fetch('/api/admin/voucher', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: voucher.id,
          kode: voucher.kode,
          nama: voucher.nama,
          tipe_diskon: voucher.tipe_diskon,
          nilai_diskon: voucher.nilai_diskon,
          minimal_transaksi: voucher.minimal_transaksi,
          maksimal_diskon: voucher.maksimal_diskon,
          kuota_total: voucher.kuota_total,
          mulai_pada: voucher.mulai_pada_input || '',
          berakhir_pada: voucher.berakhir_pada_input || '',
          status: statusBaru,
          catatan: voucher.catatan || ''
        })
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal ubah status voucher.');
      }

      ambilVoucher();
    } catch (error) {
      Swal.fire({
        title: 'Gagal update ❌',
        text: error.message || 'Gagal update voucher bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingAksi(null);
    }
  };

  const handleHapusVoucher = async (voucher) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus voucher ini?',
      html: `
        <div style="text-align:left">
          <b>${escapeHtml(voucher.kode)}</b><br/>
          <small>${escapeHtml(voucher.nama)}</small>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Iya, hapus',
      cancelButtonText: 'Batal',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151'
    });

    if (!konfirmasi.isConfirmed) return;

    setLoadingAksi(`${voucher.id}-delete`);

    try {
      const respon = await fetch(`/api/admin/voucher?id=${voucher.id}`, {
        method: 'DELETE'
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Gagal hapus voucher.');
      }

      Swal.fire({
        title: 'Berhasil dihapus ✅',
        text: hasil.pesan,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      });

      ambilVoucher();
    } catch (error) {
      Swal.fire({
        title: 'Gagal hapus ❌',
        text: error.message || 'Gagal hapus voucher bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingAksi(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500">Total Voucher</p>
          <h3 className="mt-2 text-3xl font-black text-white">{ringkasan.total}</h3>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300/80">Aktif Sekarang</p>
          <h3 className="mt-2 text-3xl font-black text-emerald-300">{ringkasan.aktif}</h3>
        </div>

        <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 shadow-xl">
          <p className="text-xs font-black uppercase tracking-wider text-cyan-300/80">Total Dipakai</p>
          <h3 className="mt-2 text-3xl font-black text-cyan-300">{ringkasan.pemakaian}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-xl lg:sticky lg:top-24">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-black">
                {modeEdit ? '✏️ Edit Voucher' : '🎟️ Buat Voucher'}
              </h2>
              <p className="mt-1 text-xs font-semibold text-gray-500">
                Bikin diskon biar user makin gatel checkout.
              </p>
            </div>

            {modeEdit && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-gray-800 px-3 py-2 text-xs font-black text-gray-300 hover:bg-gray-700"
              >
                Batal
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitVoucher} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                Kode Voucher
              </label>
              <input
                value={formVoucher.kode}
                onChange={(e) =>
                  setFormVoucher({
                    ...formVoucher,
                    kode: e.target.value.toUpperCase().replace(/\s+/g, '')
                  })
                }
                placeholder="NAXA10"
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 font-black text-white outline-none focus:border-cyan-500"
              />
              <p className="mt-1 text-[11px] font-semibold text-gray-500">
                Contoh: NAXA10, HEMAT5K, MLBBMURAH.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                Nama Campaign
              </label>
              <input
                value={formVoucher.nama}
                onChange={(e) => setFormVoucher({ ...formVoucher, nama: e.target.value })}
                placeholder="Diskon Launching NaXaShop"
                className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Tipe
                </label>
                <select
                  value={formVoucher.tipe_diskon}
                  onChange={(e) => setFormVoucher({ ...formVoucher, tipe_diskon: e.target.value })}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 font-bold text-white outline-none focus:border-cyan-500"
                >
                  <option value="nominal">Nominal Rp</option>
                  <option value="persen">Persen %</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Nilai
                </label>
                <input
                  type="number"
                  min="1"
                  value={formVoucher.nilai_diskon}
                  onChange={(e) => setFormVoucher({ ...formVoucher, nilai_diskon: e.target.value })}
                  placeholder={formVoucher.tipe_diskon === 'persen' ? '10' : '5000'}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 font-bold text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Minimal Belanja
                </label>
                <input
                  type="number"
                  min="0"
                  value={formVoucher.minimal_transaksi}
                  onChange={(e) => setFormVoucher({ ...formVoucher, minimal_transaksi: e.target.value })}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Max Diskon
                </label>
                <input
                  type="number"
                  min="0"
                  value={formVoucher.maksimal_diskon}
                  onChange={(e) => setFormVoucher({ ...formVoucher, maksimal_diskon: e.target.value })}
                  placeholder="0 = tanpa batas"
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Kuota
                </label>
                <input
                  type="number"
                  min="0"
                  value={formVoucher.kuota_total}
                  onChange={(e) => setFormVoucher({ ...formVoucher, kuota_total: e.target.value })}
                  placeholder="0 = unlimited"
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Status
                </label>
                <select
                  value={formVoucher.status}
                  onChange={(e) => setFormVoucher({ ...formVoucher, status: e.target.value })}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 font-bold text-white outline-none focus:border-cyan-500"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Mulai
                </label>
                <input
                  type="datetime-local"
                  value={formVoucher.mulai_pada}
                  onChange={(e) => setFormVoucher({ ...formVoucher, mulai_pada: e.target.value })}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Berakhir
                </label>
                <input
                  type="datetime-local"
                  value={formVoucher.berakhir_pada}
                  onChange={(e) => setFormVoucher({ ...formVoucher, berakhir_pada: e.target.value })}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-400">
                Catatan Admin
              </label>
              <textarea
                rows={3}
                value={formVoucher.catatan}
                onChange={(e) => setFormVoucher({ ...formVoucher, catatan: e.target.value })}
                placeholder="Opsional. Misal: buat promo launching."
                className="w-full resize-none rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingForm}
              className={`w-full rounded-2xl px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                modeEdit
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600'
              }`}
            >
              {loadingForm
                ? 'Nyimpen...'
                : modeEdit
                  ? 'Update Voucher ✨'
                  : 'Buat Voucher 🎟️'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 border-b border-gray-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Daftar Voucher Promo</h2>
              <p className="mt-1 text-xs font-semibold text-gray-500">
                Voucher aktif bisa dipakai user di halaman checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={ambilVoucher}
              disabled={loading}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Refresh...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-gray-800 bg-slate-950 p-8 text-center text-sm font-bold text-gray-500">
              Loading voucher...
            </div>
          ) : daftarVoucher.length === 0 ? (
            <div className="rounded-3xl border border-gray-800 bg-slate-950 p-8 text-center">
              <p className="text-3xl">🎟️</p>
              <p className="mt-3 font-black text-white">Belum ada voucher</p>
              <p className="mt-1 text-sm text-gray-500">Bikin voucher pertama lu di form kiri bree.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {daftarVoucher.map((voucher) => {
                const badge = getBadgeStatus(voucher);
                const kuotaTotal = Number(voucher.kuota_total || 0);
                const kuotaTerpakai = Number(voucher.kuota_terpakai || 0);
                const diskonLabel =
                  voucher.tipe_diskon === 'persen'
                    ? `${voucher.nilai_diskon}%${Number(voucher.maksimal_diskon || 0) > 0 ? ` max ${formatRupiah(voucher.maksimal_diskon)}` : ''}`
                    : formatRupiah(voucher.nilai_diskon);

                return (
                  <article
                    key={voucher.id}
                    className="relative overflow-hidden rounded-3xl border border-gray-800 bg-slate-950 p-5 shadow-lg"
                  >
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-black text-white">
                            {voucher.kode}
                          </h3>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-gray-300">
                          {voucher.nama}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80">
                          Diskon
                        </p>
                        <p className="text-sm font-black text-emerald-300">
                          {diskonLabel}
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
                        <p className="font-black uppercase text-gray-500">Minimal</p>
                        <p className="mt-1 font-black text-white">
                          {Number(voucher.minimal_transaksi || 0) > 0
                            ? formatRupiah(voucher.minimal_transaksi)
                            : 'Tanpa minimal'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
                        <p className="font-black uppercase text-gray-500">Kuota</p>
                        <p className="mt-1 font-black text-white">
                          {kuotaTotal > 0 ? `${kuotaTerpakai}/${kuotaTotal}` : `${kuotaTerpakai} dipakai`}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
                        <p className="font-black uppercase text-gray-500">Mulai</p>
                        <p className="mt-1 font-bold text-gray-300">{formatTanggal(voucher.mulai_pada)}</p>
                      </div>

                      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
                        <p className="font-black uppercase text-gray-500">Berakhir</p>
                        <p className="mt-1 font-bold text-gray-300">{formatTanggal(voucher.berakhir_pada)}</p>
                      </div>
                    </div>

                    {voucher.catatan && (
                      <p className="relative mt-3 rounded-2xl border border-gray-800 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400">
                        {voucher.catatan}
                      </p>
                    )}

                    <div className="relative mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditVoucher(voucher)}
                        className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/20"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={loadingAksi === `${voucher.id}-toggle`}
                        onClick={() => handleToggleVoucher(voucher)}
                        className={`rounded-2xl border px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
                          voucher.status === 'aktif'
                            ? 'border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        {voucher.status === 'aktif' ? 'Matikan' : 'Aktifkan'}
                      </button>

                      <button
                        type="button"
                        disabled={loadingAksi === `${voucher.id}-delete`}
                        onClick={() => handleHapusVoucher(voucher)}
                        className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
