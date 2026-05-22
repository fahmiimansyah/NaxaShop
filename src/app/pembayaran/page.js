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
  const nomorAdmin = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

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

  const labelProvider = (provider) => {
    const p = normalisasiProvider(provider);

    if (p === 'digiflazz') return 'Digiflazz';
    if (p === 'apigames') return 'APIGames';
    if (p === 'mock') return 'Mock Provider';

    return 'Provider';
  };

  const bikinPesanProgress = ({ bayar, topup, provider }) => {
    const namaProvider = labelProvider(provider);

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
      return `Pembayaran sukses. ${namaProvider} sedang memproses top-up kamu.`;
    }

    return 'Status sedang dicek. Tunggu sebentar ya.';
  };

  const updateProgress = ({ bayar, topup, pesan, provider }) => {
    const providerFinal = normalisasiProvider(provider || providerOrder);

    setStatusBayar(bayar || 'pending');
    setStatusTopup(topup || 'pending');
    setProviderOrder(providerFinal);
    setPesanSync(pesan || '');

    if (dataBayar?.order_id) {
      simpanProgressOrder({
        orderId: dataBayar.order_id,
        bayar: bayar || 'pending',
        topup: topup || 'pending',
        provider: providerFinal,
        pesan: pesan || ''
      });
    }

    if (bayar === 'sukses' && dataBayar?.order_id) {
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
      const provider = normalisasiProvider(hasil.data?.provider || providerOrder);

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

  const syncApiGamesFinal = async ({ silent = true } = {}) => {
    if (!dataBayar?.order_id) return null;

    try {
      const respon = await fetch('/api/apigames/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: dataBayar.order_id })
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        if (!silent) {
          setPesanSync(hasil.pesan || 'Gagal cek status APIGames.');
        }

        return null;
      }

      const bayar = hasil.data?.status_bayar || 'sukses';
      const topup = hasil.data?.status_topup || 'proses';
      const provider = 'apigames';

      const pesan = bikinPesanProgress({
        bayar,
        topup,
        provider
      });

      updateProgress({ bayar, topup, provider, pesan });

      return { bayar, topup, provider };
    } catch (error) {
      console.error('Gagal sync APIGames:', error);

      if (!silent) {
        setPesanSync('Gagal cek status APIGames.');
      }

      return null;
    }
  };

  const syncProviderFinal = async ({ provider, silent = true } = {}) => {
    const providerFinal = normalisasiProvider(provider);

    if (providerFinal === 'apigames') {
      return syncApiGamesFinal({ silent });
    }

    // Untuk Digiflazz sementara jangan panggil /api/apigames/sync.
    // Nanti setelah route /api/provider/sync dibuat, bagian ini kita arahkan ke sana.
    if (providerFinal === 'digiflazz' || providerFinal === 'mock') {
      return cekStatusOrderDariDb({ silent });
    }

    return cekStatusOrderDariDb({ silent });
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
      let provider = normalisasiProvider(hasil.data?.provider || providerOrder);
console.log('PAYMENT PAGE DEBUG:', {
  orderId: dataBayar.order_id,
  provider,
  bayar,
  topup,
  hasil: hasil.data
});
      let pesan = bikinPesanProgress({
        bayar,
        topup,
        provider
      });

      updateProgress({ bayar, topup, provider, pesan });

      if (bayar === 'sukses' && topup === 'proses') {
        const hasilProvider = await syncProviderFinal({ provider, silent });

        if (hasilProvider) {
          bayar = hasilProvider.bayar;
          topup = hasilProvider.topup;
          provider = hasilProvider.provider || provider;
        }
      }
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

    const pembayaranGagal = statusBayar === 'gagal';
    const topupSelesai = statusTopup === 'sukses';

    if (pembayaranGagal || topupSelesai) return;

    if (statusBayar === 'sukses' && statusTopup === 'gagal') {
      const intervalAdmin = setInterval(() => {
        cekStatusOrderDariDb({ silent: true });
      }, 10000);

      return () => clearInterval(intervalAdmin);
    }

    const firstCheck = setTimeout(() => {
      cekPembayaran({ silent: true });
    }, 1500);

    const interval = setInterval(() => {
      cekPembayaran({ silent: true });
    }, 10000);

    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, [dataBayar?.order_id, statusBayar, statusTopup, providerOrder]);

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
        desc: `Pembayaran sudah sukses. Sistem sedang menunggu status final dari ${labelProvider(providerOrder)}.`,
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
      `Halo admin NaXaShop, saya butuh bantuan.\n\nOrder ID: ${dataBayar.order_id}\nProduk: ${dataBayar.nama_produk || '-'}\nStatus Bayar: ${statusBayar}\nStatus Top-up: ${statusTopup}\nProvider: ${labelProvider(providerOrder)}`
    );

    return `https://wa.me/${nomorAdmin}?text=${pesan}`;
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

              <span className="shrink-0 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-[10px] font-black text-gray-300 uppercase">
                {labelProvider(providerOrder)}
              </span>
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