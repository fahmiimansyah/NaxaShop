'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaExclamationTriangle,
  FaHeadset,
  FaQuestionCircle,
  FaReceipt,
  FaSearch,
  FaTimesCircle,
} from 'react-icons/fa';

export default function CekOrderPage() {
  const searchParams = useSearchParams();

  const orderIdDariUrl =
    searchParams.get('order_id') || searchParams.get('id') || '';

  const fromPage = searchParams.get('from');

  const linkBalik =
    fromPage === 'payment' && orderIdDariUrl
      ? `/pembayaran?order_id=${encodeURIComponent(orderIdDariUrl)}`
      : fromPage === 'payment'
        ? '/pembayaran'
        : '/';

  const teksBalik =
    fromPage === 'payment' ? 'Kembali ke Pembayaran' : 'Kembali ke Beranda';

  const [orderId, setOrderId] = useState('');
  const [dataOrder, setDataOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pesanError, setPesanError] = useState('');
  const [copied, setCopied] = useState(false);

  const API_STATUS = '/api/pesanan';
  const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  const formatRupiah = (angka) => {
    return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

  const normalisasiStatus = (value = '') => {
    const status = String(value || '').trim().toLowerCase();

    if (
      ['sukses', 'success', 'settlement', 'capture', 'paid', 'berhasil'].includes(
        status
      )
    ) {
      return 'sukses';
    }

    if (['pending', 'menunggu', 'unpaid', 'waiting'].includes(status)) {
      return 'pending';
    }

    if (['proses', 'process', 'processing'].includes(status)) {
      return 'proses';
    }

    if (
      [
        'gagal',
        'failed',
        'failure',
        'deny',
        'denied',
        'cancel',
        'cancelled',
        'expire',
        'expired',
      ].includes(status)
    ) {
      return 'gagal';
    }

    return status || 'pending';
  };

  const labelStatus = (status) => {
    const normal = normalisasiStatus(status);

    if (normal === 'sukses') return 'Sukses';
    if (normal === 'pending') return 'Pending';
    if (normal === 'proses') return 'Proses';
    if (normal === 'gagal') return 'Gagal';

    return normal || '-';
  };

  const statusUtama = (trx) => {
    if (!trx) return null;

    const bayar = normalisasiStatus(trx.status_bayar);
    const topup = normalisasiStatus(trx.status_topup);

    if (bayar === 'pending') {
      return {
        Icon: FaClock,
        title: 'Menunggu Pembayaran',
        desc: 'Pembayaran belum terkonfirmasi. Selesaikan pembayaran terlebih dahulu, lalu cek lagi statusnya.',
        color: 'text-yellow-300',
        badge: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
        box: 'border-yellow-500/20 bg-yellow-500/10',
      };
    }

    if (bayar === 'gagal') {
      return {
        Icon: FaTimesCircle,
        title: 'Pembayaran Tidak Berhasil',
        desc: 'Pembayaran gagal, dibatalkan, atau melewati batas waktu. Silakan buat pesanan baru.',
        color: 'text-red-300',
        badge: 'border-red-500/20 bg-red-500/10 text-red-300',
        box: 'border-red-500/20 bg-red-500/10',
      };
    }

    if (bayar === 'sukses' && ['pending', 'proses'].includes(topup)) {
      return {
        Icon: FaClock,
        title: 'Top-up Sedang Diproses',
        desc: 'Pembayaran sudah berhasil. Pesanan sedang diproses oleh sistem.',
        color: 'text-blue-300',
        badge: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
        box: 'border-blue-500/20 bg-blue-500/10',
      };
    }

    if (bayar === 'sukses' && topup === 'sukses') {
      return {
        Icon: FaCheckCircle,
        title: 'Top-up Berhasil',
        desc: 'Pesanan sudah selesai diproses. Silakan cek akun game kamu.',
        color: 'text-green-300',
        badge: 'border-green-500/20 bg-green-500/10 text-green-300',
        box: 'border-green-500/20 bg-green-500/10',
      };
    }

    if (bayar === 'sukses' && topup === 'gagal') {
      return {
        Icon: FaExclamationTriangle,
        title: 'Pesanan Perlu Dicek',
        desc: 'Pembayaran berhasil, tetapi top-up belum selesai. Simpan Order ID dan hubungi admin.',
        color: 'text-orange-300',
        badge: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
        box: 'border-orange-500/20 bg-orange-500/10',
      };
    }

    return {
      Icon: FaReceipt,
      title: 'Status Pesanan',
      desc: 'Data pesanan ditemukan. Silakan cek detail di bawah.',
      color: 'text-gray-300',
      badge: 'border-gray-700 bg-gray-800 text-gray-300',
      box: 'border-gray-700 bg-gray-800/70',
    };
  };

  const badgeBayar = (status) => {
    const normal = normalisasiStatus(status);

    if (normal === 'sukses') {
      return 'border-green-500/20 bg-green-500/10 text-green-300';
    }

    if (normal === 'pending') {
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
    }

    if (normal === 'gagal') {
      return 'border-red-500/20 bg-red-500/10 text-red-300';
    }

    return 'border-gray-700 bg-gray-800 text-gray-400';
  };

  const badgeTopup = (status) => {
    const normal = normalisasiStatus(status);

    if (normal === 'sukses') {
      return 'border-green-500/20 bg-green-500/10 text-green-300';
    }

    if (normal === 'proses') {
      return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
    }

    if (normal === 'pending') {
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
    }

    if (normal === 'gagal') {
      return 'border-orange-500/20 bg-orange-500/10 text-orange-300';
    }

    return 'border-gray-700 bg-gray-800 text-gray-400';
  };

  const totalBayar = useMemo(() => {
    return dataOrder?.harga_total || dataOrder?.harga || dataOrder?.harga_produk || 0;
  }, [dataOrder]);

  const status = statusUtama(dataOrder);
  const StatusIcon = status?.Icon || FaReceipt;

  const perluChatAdmin =
    dataOrder &&
    (normalisasiStatus(dataOrder.status_bayar) === 'gagal' ||
      normalisasiStatus(dataOrder.status_topup) === 'gagal');

  const copyOrderId = async () => {
    if (!dataOrder?.order_id) return;

    await navigator.clipboard.writeText(dataOrder.order_id);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1400);
  };

  const cekOrder = async (idOrder) => {
    const idBersih = String(idOrder || '').trim();

    if (!idBersih) {
      setPesanError('Masukkan Order ID terlebih dahulu.');
      setDataOrder(null);
      return;
    }

    setLoading(true);
    setPesanError('');
    setDataOrder(null);

    try {
      const respon = await fetch(`${API_STATUS}?id=${encodeURIComponent(idBersih)}`, {
        cache: 'no-store',
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        setPesanError(
          hasil.pesan ||
            'Order ID tidak ditemukan. Pastikan Order ID yang kamu masukkan sudah benar.'
        );
        return;
      }

      setDataOrder(hasil.data);
    } catch (error) {
      console.error('Gagal cek order:', error);
      setPesanError('Sistem belum bisa mengecek pesanan. Coba lagi sebentar lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCekOrder = async (e) => {
    e.preventDefault();
    cekOrder(orderId);
  };

  const bukaCaraCekOrder = () => {
    Swal.fire({
      title: 'Cara cek order',
      width: 560,
      background: '#0f172a',
      color: '#ffffff',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#2563eb',
      html: `
        <div style="text-align:left;">
          <div style="display:grid;gap:10px;">
            <div style="display:flex;gap:12px;background:#020617;border:1px solid #1f2937;padding:12px;border-radius:16px;">
              <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;font-size:12px;flex:0 0 auto;">1</div>
              <div>
                <b style="font-size:13px;color:#fff;">Salin Order ID</b>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.55;">
                  Order ID biasanya diawali dengan <b style="color:#93c5fd;">NX-</b>. Kamu bisa menemukannya di halaman pembayaran, struk, atau riwayat transaksi.
                </p>
              </div>
            </div>

            <div style="display:flex;gap:12px;background:#020617;border:1px solid #1f2937;padding:12px;border-radius:16px;">
              <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;font-size:12px;flex:0 0 auto;">2</div>
              <div>
                <b style="font-size:13px;color:#fff;">Tempel di kolom cek order</b>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.55;">
                  Masukkan Order ID dengan lengkap, lalu tekan tombol <b style="color:#bfdbfe;">Cek Status</b>.
                </p>
              </div>
            </div>

            <div style="display:flex;gap:12px;background:#020617;border:1px solid #1f2937;padding:12px;border-radius:16px;">
              <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;font-size:12px;flex:0 0 auto;">3</div>
              <div>
                <b style="font-size:13px;color:#fff;">Lihat status pembayaran dan top-up</b>
                <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.55;">
                  Jika pembayaran sudah berhasil, top-up akan masuk ke status diproses atau selesai. Jika perlu bantuan, simpan Order ID lalu hubungi admin.
                </p>
              </div>
            </div>
          </div>

          <div style="margin-top:12px;background:rgba(234,179,8,0.10);border:1px solid rgba(234,179,8,0.22);padding:12px;border-radius:16px;">
            <p style="margin:0;color:#fde68a;font-size:12px;line-height:1.6;">
              Catatan: jangan buat order baru dulu kalau pembayaran sudah berhasil tapi top-up belum masuk. Tunggu beberapa saat atau hubungi admin dengan Order ID yang sama.
            </p>
          </div>
        </div>
      `,
    });
  };

  useEffect(() => {
    if (!orderIdDariUrl) return;

    setOrderId(orderIdDariUrl);
    cekOrder(orderIdDariUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdDariUrl]);

  const linkChatAdmin = () => {
    if (!nomorAdmin || !dataOrder) return '#';

    const pesan = encodeURIComponent(
      `Halo admin NaXaShop, saya butuh bantuan.\n\nOrder ID: ${dataOrder.order_id}\nProduk: ${dataOrder.nama_produk || dataOrder.kode_produk || '-'}\nID Player: ${dataOrder.id_player || '-'}\nZone/Server: ${dataOrder.zone_player || '-'}\nStatus Bayar: ${dataOrder.status_bayar || '-'}\nStatus Top-up: ${dataOrder.status_topup || '-'}`
    );

    return `https://wa.me/${nomorAdmin}?text=${pesan}`;
  };

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-4 text-white sm:py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-2xl flex-col justify-center">
        <div className="mb-3">
          <Link
            href={linkBalik}
            className="inline-flex items-center gap-2 text-xs font-black text-blue-400 transition hover:text-blue-300"
          >
            <FaArrowLeft className="text-[10px]" />
            {teksBalik}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-900 shadow-2xl shadow-black/30">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[90px]" />

          <div className="relative z-10 p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-base text-blue-300">
                  <FaReceipt />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-400">
                  Lacak Pesanan
                </p>

                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  Cek status order
                </h1>

                <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-400 sm:text-sm">
                  Masukkan Order ID untuk melihat status pembayaran dan top-up.
                  Order ID biasanya diawali dengan{' '}
                  <span className="font-black text-blue-300">NX-</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={bukaCaraCekOrder}
                className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200 transition hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white"
              >
                <FaQuestionCircle className="text-xs" />
                <span className="hidden sm:inline">Cara cek</span>
              </button>
            </div>

            <form
              onSubmit={handleCekOrder}
              className="rounded-3xl border border-gray-800 bg-slate-950/70 p-3 sm:p-4"
            >
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                Order ID
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Contoh: NX-1781171911775-6FAD3EC3"
                  className="flex-1 rounded-2xl border border-gray-700 bg-slate-950 px-4 py-3 font-mono text-xs text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500 sm:text-sm"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  <FaSearch className="text-xs" />
                  {loading ? 'Mengecek...' : 'Cek Status'}
                </button>
              </div>

              {pesanError && (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold leading-relaxed text-red-300">
                  {pesanError}
                </div>
              )}

              {!dataOrder && !pesanError && (
                <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                  Order ID bisa kamu salin dari halaman pembayaran, struk, atau
                  halaman riwayat transaksi.
                </p>
              )}
            </form>

            {dataOrder && status && (
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-gray-800 bg-slate-950">
                <div className={`border-b p-4 ${status.box}`}>
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl ${status.color}`}
                    >
                      <StatusIcon />
                    </div>

                    <div className="min-w-0">
                      <h2 className={`text-base font-black ${status.color}`}>
                        {status.title}
                      </h2>

                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        {status.desc}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3 border-b border-dashed border-gray-800 pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Order ID
                      </p>

                      <p className="mt-1 break-all font-mono text-xs font-black text-blue-400">
                        {dataOrder.order_id}
                      </p>

                      {copied && (
                        <p className="mt-1 text-[11px] font-bold text-blue-300">
                          Order ID tersalin.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={copyOrderId}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-gray-800 px-3 py-2 text-[10px] font-black text-gray-300 transition hover:bg-gray-700"
                    >
                      <FaCopy />
                      Salin
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Produk
                      </p>

                      <p className="mt-1 line-clamp-2 font-black text-white">
                        {dataOrder.nama_produk ||
                          dataOrder.kode_produk ||
                          'Produk Top Up'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Total
                      </p>

                      <p className="mt-1 font-black text-green-400">
                        {formatRupiah(totalBayar)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Metode
                      </p>

                      <p className="mt-1 truncate font-bold text-gray-300">
                        {dataOrder.payment_type || '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        ID Player
                      </p>

                      <p className="mt-1 break-all font-bold text-white">
                        {dataOrder.id_player || '-'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Zone / Server
                      </p>

                      <p className="mt-1 break-all font-bold text-white">
                        {dataOrder.zone_player || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-800 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-xl border px-3 py-2 text-[11px] font-black ${badgeBayar(
                          dataOrder.status_bayar
                        )}`}
                      >
                        Bayar: {labelStatus(dataOrder.status_bayar)}
                      </span>

                      <span
                        className={`rounded-xl border px-3 py-2 text-[11px] font-black ${badgeTopup(
                          dataOrder.status_topup
                        )}`}
                      >
                        Top-up: {labelStatus(dataOrder.status_topup)}
                      </span>
                    </div>
                  </div>

                  {normalisasiStatus(dataOrder.status_topup) === 'gagal' && (
                    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-xs font-semibold leading-relaxed text-orange-200">
                      Simpan Order ID ini lalu hubungi admin. Jangan buat order baru
                      dulu kalau pembayaran sudah berhasil.
                    </div>
                  )}

                  {perluChatAdmin && nomorAdmin && (
                    <a
                      href={linkChatAdmin()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-500"
                    >
                      <FaHeadset />
                      Chat Admin
                    </a>
                  )}
                </div>
              </div>
            )}

            {!dataOrder && (
              <div className="mt-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-3">
                <p className="text-[11px] leading-relaxed text-blue-100/55">
                  Tips: simpan Order ID sampai pesanan selesai. Kalau pembayaran
                  sudah berhasil tapi top-up belum masuk, tunggu beberapa saat
                  atau hubungi admin dengan Order ID yang sama.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}