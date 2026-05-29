'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const DURASI_BAYAR_MS = 15 * 60 * 1000;

const getExpiredKey = (orderId) => `expiredAt:${orderId}`;
const getProgressKey = (orderId) => `progressOrder:${orderId}`;

const hitungSisaDetik = (expiredAt) => {
  return Math.max(0, Math.ceil((Number(expiredAt) - Date.now()) / 1000));
};

const normalisasiProvider = (value) => {
  return String(value || 'apigames').trim().toLowerCase();
};

const simpanProgressOrder = ({ orderId, bayar, topup, pesan, provider }) => {
  if (!orderId) return;

  sessionStorage.setItem(
    getProgressKey(orderId),
    JSON.stringify({
      status_bayar: bayar || 'pending',
      status_topup: topup || 'pending',
      provider: provider || 'apigames',
      pesan: pesan || '',
      updated_at: Date.now()
    })
  );
};

export default function HalamanPembayaran() {
  const router = useRouter();

  const [dataBayar, setDataBayar] = useState(null);
  const [waktuMundur, setWaktuMundur] = useState(900);
  const [sudahSalin, setSudahSalin] = useState(false);

  const [loadingSync, setLoadingSync] = useState(false);
  const [pesanSync, setPesanSync] = useState('');

  const [statusBayar, setStatusBayar] = useState('pending');
  const [statusTopup, setStatusTopup] = useState('pending');
  const [providerOrder, setProviderOrder] = useState('apigames');

  const sedangSyncRef = useRef(false);

const statusBayarRef = useRef('pending');
const statusTopupRef = useRef('pending');
const providerOrderRef = useRef('apigames');

const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

useEffect(() => {
  statusBayarRef.current = statusBayar;
  statusTopupRef.current = statusTopup;
  providerOrderRef.current = providerOrder;
}, [statusBayar, statusTopup, providerOrder]);

  useEffect(() => {
    const simpenan = sessionStorage.getItem('dataTagihan');

    if (!simpenan) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(simpenan);

      const expiredKey = getExpiredKey(parsed.order_id);
      let expiredAt = Number(sessionStorage.getItem(expiredKey));

      if (!expiredAt) {
        expiredAt = Date.now() + DURASI_BAYAR_MS;
        sessionStorage.setItem(expiredKey, String(expiredAt));
      }

      const dataDenganExpired = {
        ...parsed,
        expired_at_local: expiredAt
      };

      sessionStorage.setItem('dataTagihan', JSON.stringify(dataDenganExpired));

      setDataBayar(dataDenganExpired);
      setWaktuMundur(hitungSisaDetik(expiredAt));

      const progressSimpan = sessionStorage.getItem(getProgressKey(parsed.order_id));

      if (progressSimpan) {
        const progress = JSON.parse(progressSimpan);

        setStatusBayar(progress.status_bayar || 'pending');
        setStatusTopup(progress.status_topup || 'pending');
        setProviderOrder(normalisasiProvider(progress.provider));

        if (progress.pesan) {
          setPesanSync(progress.pesan);
        }
      }
    } catch (error) {
      console.error('Data tagihan rusak:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!dataBayar?.expired_at_local) return;

    const updateTimer = () => {
      setWaktuMundur(hitungSisaDetik(dataBayar.expired_at_local));
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    window.addEventListener('focus', updateTimer);
    document.addEventListener('visibilitychange', updateTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTimer);
      document.removeEventListener('visibilitychange', updateTimer);
    };
  }, [dataBayar?.expired_at_local]);

  const formatWaktu = (detik) => {
    const menit = Math.floor(detik / 60);
    const sisaDetik = detik % 60;

    return `${menit.toString().padStart(2, '0')}:${sisaDetik
      .toString()
      .padStart(2, '0')}`;
  };

  const salinNomorVA = (nomor) => {
    navigator.clipboard.writeText(nomor);
    setSudahSalin(true);
    setTimeout(() => setSudahSalin(false), 2000);
  };


  const bikinPesanProgress = ({ bayar, topup, }) => {

    if (bayar === 'pending') {
      return 'Pembayaran belum kebaca lunas. Sistem akan cek otomatis.';
    }

    if (bayar === 'gagal') {
      return 'Pembayaran gagal atau expired. Silakan buat order baru.';
    }

    if (bayar === 'sukses' && topup === 'gagal') {
      return 'Pembayaran sukses, tapi top-up butuh pengecekan admin.';
    }

    if (bayar === 'sukses' && topup === 'sukses') {
      return 'Top-up berhasil! Silakan cek akun game kamu.';
    }

    if (bayar === 'sukses' && topup === 'proses') {
      return `Pembayaran sukses. sedang memproses top-up kamu.`;
    }

    return 'Status sedang dicek. Tunggu sebentar ya.';
  };

const updateProgress = ({ bayar, topup, pesan, provider }) => {
  const bayarFinal = bayar || 'pending';
  const topupFinal = topup || 'pending';
  const providerFinal = normalisasiProvider(provider || providerOrderRef.current);

  statusBayarRef.current = bayarFinal;
  statusTopupRef.current = topupFinal;
  providerOrderRef.current = providerFinal;

  setStatusBayar(bayarFinal);
  setStatusTopup(topupFinal);
  setProviderOrder(providerFinal);
  setPesanSync(pesan || '');

  if (dataBayar?.order_id) {
    simpanProgressOrder({
      orderId: dataBayar.order_id,
      bayar: bayarFinal,
      topup: topupFinal,
      provider: providerFinal,
      pesan: pesan || ''
    });
  }

  if (bayarFinal === 'sukses' && dataBayar?.order_id) {
    sessionStorage.setItem('lastOrderId', dataBayar.order_id);
  }
};

  const cekStatusOrderDariDb = async ({ silent = true } = {}) => {
    if (!dataBayar?.order_id) return null;

    try {
      const respon = await fetch(
        `/api/pesanan?id=${encodeURIComponent(dataBayar.order_id)}`,
        { cache: 'no-store' }
      );

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        if (!silent) {
          setPesanSync(hasil.pesan || 'Gagal cek status order.');
        }

        return null;
      }

      const bayar = hasil.data?.status_bayar || 'pending';
      const topup = hasil.data?.status_topup || 'pending';
      const provider = normalisasiProvider(
  hasil.data?.provider || providerOrderRef.current
);
      const pesan = bikinPesanProgress({
        bayar,
        topup,
        provider
      });

      updateProgress({ bayar, topup, provider, pesan });

      return { bayar, topup, provider };
    } catch (error) {
      console.error('Gagal cek DB order:', error);

      if (!silent) {
        setPesanSync('Gagal cek update status order.');
      }

      return null;
    }
  };


  const cekPembayaran = async ({ silent = false } = {}) => {
    if (!dataBayar?.order_id) return;

    if (sedangSyncRef.current) return;

    sedangSyncRef.current = true;

    if (!silent) {
      setLoadingSync(true);
      setPesanSync('');
    }

    try {
      const respon = await fetch('/api/payment/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: dataBayar.order_id })
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        if (!silent) {
          setPesanSync(hasil.pesan || 'Gagal cek pembayaran bre.');
        }

        return;
      }

      let bayar = hasil.data?.status_bayar || 'pending';
      let topup = hasil.data?.status_topup || 'pending';
      let provider = normalisasiProvider(
  hasil.data?.provider || providerOrderRef.current
);
      let pesan = bikinPesanProgress({
        bayar,
        topup,
        provider
      });

      updateProgress({ bayar, topup, provider, pesan });
// Frontend cukup cek payment + baca status database.
      // Jangan panggil /api/provider/sync dari halaman user,
      // karena endpoint itu nembak provider dan sekarang khusus admin.

    } catch (error) {
      console.error('Gagal sync pembayaran:', error);

      if (!silent) {
        setPesanSync('Server lagi ngadat pas cek pembayaran bre.');
      }
    } finally {
      sedangSyncRef.current = false;

      if (!silent) {
        setLoadingSync(false);
      }
    }
  };

useEffect(() => {
  if (!dataBayar?.order_id) return;

  const jalaninCekOtomatis = () => {
    const pembayaranGagal = statusBayarRef.current === 'gagal';
    const topupSelesai = statusTopupRef.current === 'sukses';

    if (pembayaranGagal || topupSelesai) return;

    if (
      statusBayarRef.current === 'sukses' &&
      statusTopupRef.current === 'gagal'
    ) {
      cekStatusOrderDariDb({ silent: true });
      return;
    }

    cekPembayaran({ silent: true });
  };

  const firstCheck = setTimeout(jalaninCekOtomatis, 1500);
  const interval = setInterval(jalaninCekOtomatis, 8000);

  return () => {
    clearTimeout(firstCheck);
    clearInterval(interval);
  };

  // Sengaja cuma depend ke order_id biar gak restart loop setiap status berubah.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dataBayar?.order_id]);
  const getStatusUi = () => {
    if (statusBayar === 'gagal') {
      return {
        step: 2,
        icon: '❌',
        title: 'Pembayaran Gagal',
        desc: 'Pembayaran gagal atau sudah expired. Silakan buat order baru.',
        box: 'bg-red-500/10 border-red-500/20 text-red-300',
        glow: 'bg-red-500/20 text-red-400'
      };
    }

    if (statusBayar === 'sukses' && statusTopup === 'gagal') {
      return {
        step: 3,
        icon: '⚠️',
        title: 'Top-up Butuh Pengecekan',
        desc: 'Pembayaran sudah sukses, tapi top-up mengalami kendala. Admin akan bantu cek.',
        box: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
        glow: 'bg-orange-500/20 text-orange-400'
      };
    }

    if (statusBayar === 'sukses' && statusTopup === 'sukses') {
      return {
        step: 4,
        icon: '✅',
        title: 'Top-up Berhasil',
        desc: 'Mantap! Produk sudah berhasil diproses. Silakan cek akun game kamu.',
        box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        glow: 'bg-emerald-500/20 text-emerald-400'
      };
    }

    if (statusBayar === 'sukses') {
      return {
        step: 3,
        icon: '🚀',
        title: 'Top-up Sedang Diproses',
        desc: `Pembayaran sudah sukses. tunggu bentar ya`,
        box: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
        glow: 'bg-purple-500/20 text-purple-400'
      };
    }

    return {
      step: 2,
      icon: '💸',
      title: 'Menunggu Pembayaran',
      desc: 'Selesaikan pembayaran, lalu biarkan halaman ini cek status otomatis.',
      box: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      glow: 'bg-yellow-500/20 text-yellow-400'
    };
  };

  const statusUi = getStatusUi();

  const steps = [
    { nomor: 1, label: 'Pesan' },
    { nomor: 2, label: 'Bayar' },
    { nomor: 3, label: 'Proses' },
    { nomor: 4, label: 'Selesai' }
  ];

  const progressWidth = `${((statusUi.step - 1) / (steps.length - 1)) * 100}%`;

const linkChatAdmin = () => {
  if (!nomorAdmin || !dataBayar?.order_id) return '#';

  const pesan = encodeURIComponent(
    `Halo admin NaXaShop, saya butuh bantuan.\n\nOrder ID: ${dataBayar.order_id}\nProduk: ${dataBayar.nama_produk || '-'}\nStatus Bayar: ${statusBayar}\nStatus Top-up: ${statusTopup}`
  );

  return `https://wa.me/${nomorAdmin}?text=${pesan}`;
};

  const ambilActionUrl = (namaActionList = []) => {
  const actions = Array.isArray(dataBayar?.actions) ? dataBayar.actions : [];

  for (const nama of namaActionList) {
    const ketemu = actions.find((action) => action.name === nama);

    if (ketemu?.url) {
      return ketemu.url;
    }
  }

  return '';
};

const getEwalletButtonUrl = () => {
  return (
    dataBayar?.payment_url ||
    dataBayar?.deeplink_url ||
    dataBayar?.redirect_url ||
    ambilActionUrl([
      'deeplink-redirect',
      'mobile-redirect',
      'app-deeplink-redirect',
      'redirect-url',
      'web-redirect',
      'payment-page',
      'get-checkout-url'
    ])
  );
};

const getEwalletQrUrl = () => {
  return (
    dataBayar?.qris_url ||
    ambilActionUrl([
      'generate-qr-code',
      'generate-qr-code-v2'
    ])
  );
};
  if (!dataBayar) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">
        Menyiapkan Ruang Kasir...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 sm:py-12 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-4 w-full h-1 bg-gray-800 z-0 rounded-full"></div>

            <div
              className="absolute left-0 top-4 h-1 bg-cyan-500 z-0 rounded-full transition-all duration-700"
              style={{ width: progressWidth }}
            ></div>

            {steps.map((step) => {
              const aktif = step.nomor <= statusUi.step;
              const current = step.nomor === statusUi.step;

              return (
                <div key={step.nomor} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black mb-1 text-sm border transition-all ${
                      aktif
                        ? current
                          ? `${statusUi.glow} border-current shadow-lg animate-pulse`
                          : 'bg-cyan-500 text-white border-cyan-400'
                        : 'bg-gray-800 border-gray-600 text-gray-500'
                    }`}
                  >
                    {step.nomor < statusUi.step ? '✓' : step.nomor}
                  </div>

                  <span
                    className={`text-[10px] sm:text-xs font-bold ${
                      aktif ? 'text-cyan-400' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-900 p-5 sm:p-8 rounded-3xl border border-gray-700 shadow-2xl text-center">
          <div className={`mb-6 rounded-3xl border p-5 ${statusUi.box}`}>
            <div className="text-4xl mb-3">{statusUi.icon}</div>

            <h1 className="text-xl sm:text-2xl font-black text-white mb-2">
              {statusUi.title}
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed">
              {statusUi.desc}
            </p>
          </div>

          <div className="bg-slate-950 border border-gray-800 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                  Order ID
                </p>

                <p className="font-mono text-cyan-400 font-black break-all text-xs mt-1">
                  {dataBayar.order_id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase">
                  Produk
                </p>
                <p className="text-white font-bold truncate">
                  {dataBayar.nama_produk || 'Produk Top Up'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-gray-500 font-black uppercase">
                  Total
                </p>
                <p className="text-green-400 font-black">
                  Rp {Number(dataBayar.harga || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {statusBayar === 'pending' && (
            <>
              <p className="text-gray-400 text-sm mb-6">
                Batas waktu bayar:{' '}
                <span
                  className={`font-mono border px-2 py-1 rounded-md text-base font-bold ml-1 ${
                    waktuMundur <= 0
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {waktuMundur <= 0 ? 'Expired' : formatWaktu(waktuMundur)}
                </span>
              </p>

              {dataBayar.tipe === 'qris' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <div className="p-3 bg-white rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <img
                      src={dataBayar.qris_url}
                      alt="QRIS"
                      className="w-44 h-44 sm:w-48 sm:h-48 mx-auto"
                    />
                  </div>

                  <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
                    <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">
                      Cara Bayar QRIS:
                    </h3>

                    <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
                      <li className="flex gap-2">
                        <span>📱</span> Buka e-wallet atau m-banking.
                      </li>
                      <li className="flex gap-2">
                        <span>📷</span> Pilih menu scan QR.
                      </li>
                      <li className="flex gap-2">
                        <span>✅</span> Pastikan nominal sesuai, lalu bayar.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'va' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <p className="text-xs sm:text-sm text-gray-400">
                    Transfer ke {dataBayar.bank} Virtual Account:
                  </p>

                  <div className="w-full bg-gray-800 p-4 rounded-xl border border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xl sm:text-2xl font-black text-blue-400 tracking-normal sm:tracking-widest break-all select-all">
                      {dataBayar.va_number}
                    </p>

                    <button
                      onClick={() => salinNomorVA(dataBayar.va_number)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        sudahSalin
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {sudahSalin ? 'Tersalin! ✓' : 'Salin'}
                    </button>
                  </div>

                  <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
                    <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">
                      Cara Bayar VA:
                    </h3>

                    <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
                      <li className="flex gap-2">
                        <span>📱</span> Buka mobile banking.
                      </li>
                      <li className="flex gap-2">
                        <span>💸</span> Pilih Virtual Account.
                      </li>
                      <li className="flex gap-2">
                        <span>✍️</span> Masukkan nomor VA di atas.
                      </li>
                      <li className="flex gap-2">
                        <span>✅</span> Pastikan nominal sesuai, lalu bayar.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'ewallet' && (
  <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-5 text-center">
      <p className="text-xs text-gray-500 font-black uppercase tracking-wider">
        Metode Pembayaran
      </p>

      <h3 className="text-2xl font-black text-white mt-1">
        {dataBayar.label_metode_bayar || 'E-Wallet'}
      </h3>

    </div>

    {getEwalletButtonUrl() && (
      <a
        href={getEwalletButtonUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-4 text-center font-black text-white shadow-[0_0_25px_rgba(34,197,94,0.35)] transition-all hover:-translate-y-1 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]"
      >
        <span className="block text-xs uppercase tracking-widest text-emerald-100/80">
          Klik untuk lanjut
        </span>
        <span className="mt-1 block text-base sm:text-lg">
          Buka Pembayaran {dataBayar.label_metode_bayar || 'E-Wallet'} 🚀
        </span>
      </a>
    )}

    {getEwalletQrUrl() && (
      <div className="w-full">
        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-gray-700" />
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
            Atau scan QR
          </p>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <div className="mx-auto w-fit rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_0_30px_rgba(34,197,94,0.25)]">
          <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-white">
            <img
              src={getEwalletQrUrl()}
              alt={dataBayar.label_metode_bayar || 'QR E-Wallet'}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-gray-500">
          Scan QR ini lewat aplikasi yang sesuai.
        </p>
      </div>
    )}

    {!getEwalletButtonUrl() && !getEwalletQrUrl() && (
      <div className="w-full rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs font-bold text-yellow-200">
        Instruksi pembayaran e-wallet belum kebaca. Coba refresh atau cek ulang status.
      </div>
    )}

    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
      <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">
        Cara Bayar {dataBayar.label_metode_bayar || 'E-Wallet'}:
      </h3>

      <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
        <li className="flex gap-2">
          <span className="font-black text-cyan-400">1.</span>
          Klik tombol pembayaran kalau tersedia.
        </li>
        <li className="flex gap-2">
          <span className="font-black text-cyan-400">2.</span>
          Kalau muncul QR, scan lewat aplikasi yang sesuai.
        </li>
        <li className="flex gap-2">
          <span className="font-black text-cyan-400">3.</span>
          Selesaikan pembayaran, lalu tunggu status otomatis berubah.
        </li>
      </ul>

    </div>
  </div>
)}

{dataBayar.tipe === 'mandiri_bill' && (
  <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-5 text-center">
      <p className="text-xs text-gray-500 font-black uppercase tracking-wider">
        Mandiri Bill Payment
      </p>

      <h3 className="text-2xl font-black text-white mt-1">
        Mandiri Bill
      </h3>
    </div>

    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-600">
        <p className="text-xs text-gray-500 font-black uppercase mb-1">
          Biller Code
        </p>
        <p className="text-2xl font-black text-cyan-400 font-mono break-all select-all">
          {dataBayar.biller_code}
        </p>
      </div>

      <div className="bg-gray-800 p-4 rounded-xl border border-gray-600">
        <p className="text-xs text-gray-500 font-black uppercase mb-1">
          Bill Key
        </p>
        <p className="text-2xl font-black text-emerald-400 font-mono break-all select-all">
          {dataBayar.bill_key}
        </p>
      </div>
    </div>

    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
      <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">
        Cara Bayar Mandiri Bill:
      </h3>

      <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
        <li>1. Buka Livin / ATM Mandiri.</li>
        <li>2. Pilih menu Bayar / Payment.</li>
        <li>3. Masukkan Biller Code dan Bill Key.</li>
        <li>4. Pastikan nominal sesuai, lalu bayar.</li>
      </ul>
    </div>
  </div>
)}

{dataBayar.tipe === 'cstore' && (
  <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-5 text-center">
      <p className="text-xs text-gray-500 font-black uppercase tracking-wider">
        Bayar di Minimarket
      </p>

      <h3 className="text-2xl font-black text-white mt-1">
        {dataBayar.label_metode_bayar || dataBayar.store || 'Minimarket'}
      </h3>
    </div>

    <div className="w-full bg-gray-800 p-4 rounded-xl border border-gray-600 text-center">
      <p className="text-xs text-gray-500 font-black uppercase mb-1">
        Kode Pembayaran
      </p>

      <p className="text-3xl font-black text-yellow-400 font-mono break-all select-all">
        {dataBayar.payment_code}
      </p>

      <button
        onClick={() => {
          navigator.clipboard.writeText(dataBayar.payment_code || '');
          setSudahSalin(true);
          setTimeout(() => setSudahSalin(false), 2000);
        }}
        className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          sudahSalin
            ? 'bg-green-500 text-white'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        }`}
      >
        {sudahSalin ? 'Tersalin! ✓' : 'Salin Kode'}
      </button>
    </div>

    <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
      <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">
        Cara Bayar:
      </h3>

      <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
        <li>1. Datang ke kasir {dataBayar.label_metode_bayar || dataBayar.store || 'minimarket'}.</li>
        <li>2. Bilang mau bayar tagihan online / payment code.</li>
        <li>3. Tunjukkan kode pembayaran di atas.</li>
        <li>4. Simpan struk sampai status order sukses.</li>
      </ul>
    </div>
  </div>
)}
            </>
          )}

          {pesanSync && (
            <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-2xl p-4 text-xs font-bold">
              {pesanSync}
            </div>
          )}

          <button
            onClick={() => cekPembayaran({ silent: false })}
            disabled={loadingSync}
            className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingSync ? 'Ngecek Status...' : 'Cek Status Sekarang 🔥'}
          </button>

          <button
            onClick={() =>
              router.push(`/lacak?order_id=${encodeURIComponent(dataBayar.order_id)}&from=payment`)
            }
            className="mt-3 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold transition-all"
          >
            Lihat Struk Detail 🧾
          </button>

          {nomorAdmin && (statusTopup === 'gagal' || statusBayar === 'gagal') && (
            <a
              href={linkChatAdmin()}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all"
            >
              💬 Chat Admin
            </a>
          )}

          <p className="text-[11px] text-gray-500 mt-5">
            Jangan tutup halaman ini. Sistem akan cek pembayaran dan top-up otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}