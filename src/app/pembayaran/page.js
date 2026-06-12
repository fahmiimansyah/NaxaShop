'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaCheck,
  FaClock,
  FaCreditCard,
  FaExclamationTriangle,
  FaSpinner,
} from 'react-icons/fa';
const DURASI_BAYAR_MS = 15 * 60 * 1000;

const getExpiredKey = (orderId) => `expiredAt:${orderId}`;
const getProgressKey = (orderId) => `progressOrder:${orderId}`;
const getDataTagihanKey = (orderId) => `dataTagihan:${orderId}`;

const hitungSisaDetik = (expiredAt) => {
  return Math.max(0, Math.ceil((Number(expiredAt) - Date.now()) / 1000));
};

const normalisasiProvider = (value) => {
  return String(value || 'apigames').trim().toLowerCase();
};

const bacaJsonStorage = (storage, key) => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (error) {
    console.error(`Storage ${key} rusak:`, error);
    return null;
  }
};

const simpanProgressOrder = ({ orderId, bayar, topup, pesan, provider }) => {
  if (!orderId) return;

  const dataProgress = JSON.stringify({
    status_bayar: bayar || 'pending',
    status_topup: topup || 'pending',
    provider: provider || 'apigames',
    pesan: pesan || '',
    updated_at: Date.now(),
  });

  try {
    sessionStorage.setItem(getProgressKey(orderId), dataProgress);
    localStorage.setItem(getProgressKey(orderId), dataProgress);
  } catch (error) {
    console.error('Gagal menyimpan progress order:', error);
  }
};

const simpanDataTagihan = (data) => {
  if (!data?.order_id) return;

  try {
    const dataFinal = JSON.stringify(data);
    const key = getDataTagihanKey(data.order_id);

    sessionStorage.setItem('dataTagihan', dataFinal);
    sessionStorage.setItem(key, dataFinal);

    localStorage.setItem('dataTagihan', dataFinal);
    localStorage.setItem(key, dataFinal);
  } catch (error) {
    console.error('Gagal menyimpan data tagihan:', error);
  }
};

const ambilDataTagihanTersimpan = (orderIdDariUrl = '') => {
  const keys = orderIdDariUrl
    ? [getDataTagihanKey(orderIdDariUrl), 'dataTagihan']
    : ['dataTagihan'];

  for (const key of keys) {
    const dariSession = bacaJsonStorage(sessionStorage, key);

    if (
      dariSession?.order_id &&
      (!orderIdDariUrl || dariSession.order_id === orderIdDariUrl)
    ) {
      return dariSession;
    }

    const dariLocal = bacaJsonStorage(localStorage, key);

    if (
      dariLocal?.order_id &&
      (!orderIdDariUrl || dariLocal.order_id === orderIdDariUrl)
    ) {
      return dariLocal;
    }
  }

  return null;
};

const ambilProgressTersimpan = (orderId) => {
  if (!orderId) return null;

  return (
    bacaJsonStorage(sessionStorage, getProgressKey(orderId)) ||
    bacaJsonStorage(localStorage, getProgressKey(orderId))
  );
};

const bikinExpiredAtLocal = (data) => {
  if (data?.expired_at_local) {
    return Number(data.expired_at_local);
  }

  try {
    const expiredDariStorage =
      data?.order_id &&
      (Number(sessionStorage.getItem(getExpiredKey(data.order_id))) ||
        Number(localStorage.getItem(getExpiredKey(data.order_id))));

    if (expiredDariStorage) {
      return expiredDariStorage;
    }
  } catch (error) {
    console.error('Gagal membaca expired local:', error);
  }

  const createdAt = data?.created_at ? new Date(data.created_at).getTime() : 0;

  if (createdAt && !Number.isNaN(createdAt)) {
    return createdAt + DURASI_BAYAR_MS;
  }

  return Date.now() + DURASI_BAYAR_MS;
};

function PanduanItem({ nomor, children }) {
  return (
    <li className="flex gap-2">
      <span className="font-black text-blue-400">{nomor}.</span>
      <span>{children}</span>
    </li>
  );
}

function StatusStepper({ steps, statusUi }) {
  const progressWidth = `${((statusUi.step - 1) / (steps.length - 1)) * 100}%`;

  return (
    <div className="mb-8 px-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-4 z-0 h-1 w-full rounded-full bg-gray-800" />

        <div
          className="absolute left-0 top-4 z-0 h-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 ease-out"
          style={{ width: progressWidth }}
        />

        {steps.map((step) => {
          const selesai = step.nomor < statusUi.step;
          const current = step.nomor === statusUi.step;
          const aktif = selesai || current;

          return (
            <div
              key={step.nomor}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="relative mb-1">
                {current && statusUi.animateStep && (
                  <span className="absolute inset-0 rounded-full bg-blue-500/25 animate-ping" />
                )}

                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black transition-all duration-500 ${
                    selesai
                      ? 'border-blue-400 bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : current
                        ? 'border-blue-400 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'border-gray-600 bg-gray-800 text-gray-500'
                  }`}
                >
                  {selesai || (current && statusUi.step === 4) ? (
                    <FaCheck className="text-xs" />
                  ) : (
                    step.nomor
                  )}
                </div>
              </div>

              <span
                className={`text-[10px] font-bold sm:text-xs ${
                  aktif ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HalamanPembayaran() {
  const router = useRouter();

  const [dataBayar, setDataBayar] = useState(null);
  const [waktuMundur, setWaktuMundur] = useState(900);
  const [sudahSalin, setSudahSalin] = useState(false);

  const [loadingSync, setLoadingSync] = useState(false);
  const [pesanSync, setPesanSync] = useState('');
  const [cooldownCekStatus, setCooldownCekStatus] = useState(0);
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
  if (cooldownCekStatus <= 0) return;

  const timer = setInterval(() => {
    setCooldownCekStatus((prev) => Math.max(0, prev - 1));
  }, 1000);

  return () => clearInterval(timer);
}, [cooldownCekStatus]);

  useEffect(() => {
    let masihHidup = true;

    const pasangDataPembayaran = (data) => {
      const expiredAt = bikinExpiredAtLocal(data);

      const dataFinal = {
        ...data,
        expired_at_local: expiredAt,
      };

      try {
        sessionStorage.setItem(getExpiredKey(dataFinal.order_id), String(expiredAt));
        localStorage.setItem(getExpiredKey(dataFinal.order_id), String(expiredAt));
      } catch (error) {
        console.error('Gagal menyimpan expired local:', error);
      }

      simpanDataTagihan(dataFinal);

      setDataBayar(dataFinal);
      setWaktuMundur(hitungSisaDetik(expiredAt));

      const progressSimpan = ambilProgressTersimpan(dataFinal.order_id);

      if (progressSimpan) {
        setStatusBayar(progressSimpan.status_bayar || dataFinal.status_bayar || 'pending');
        setStatusTopup(progressSimpan.status_topup || dataFinal.status_topup || 'pending');
        setProviderOrder(normalisasiProvider(progressSimpan.provider));

        if (progressSimpan.pesan) {
          setPesanSync(progressSimpan.pesan);
        }

        return;
      }

      setStatusBayar(dataFinal.status_bayar || 'pending');
      setStatusTopup(dataFinal.status_topup || 'pending');
      setProviderOrder(normalisasiProvider(dataFinal.provider));
    };

    const ambilDariDatabase = async (orderId) => {
      try {
        const respon = await fetch(
          `/api/pesanan?id=${encodeURIComponent(orderId)}`,
          { cache: 'no-store' }
        );

        const hasil = await respon.json();

        if (!respon.ok || !hasil.sukses) {
          return null;
        }

        return {
          sukses: true,
          order_id: hasil.data.order_id,
          nama_produk: hasil.data.nama_produk,
          harga: hasil.data.harga,
          harga_total: hasil.data.harga,
          metode_bayar: hasil.data.payment_type,
          label_metode_bayar: hasil.data.payment_type,
          tipe: 'recovery',
          status_bayar: hasil.data.status_bayar || 'pending',
          status_topup: hasil.data.status_topup || 'pending',
          created_at: hasil.data.created_at,
          updated_at: hasil.data.updated_at,
        };
      } catch (error) {
        console.error('Gagal recovery pembayaran dari DB:', error);
        return null;
      }
    };

    const mulai = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderIdDariUrl = params.get('order_id') || '';

        const dataTersimpan = ambilDataTagihanTersimpan(orderIdDariUrl);

        if (dataTersimpan) {
          if (!masihHidup) return;
          pasangDataPembayaran(dataTersimpan);
          return;
        }

        if (orderIdDariUrl) {
          const dataDb = await ambilDariDatabase(orderIdDariUrl);

          if (!masihHidup) return;

          if (dataDb) {
            pasangDataPembayaran(dataDb);
            return;
          }
        }

        router.push('/');
      } catch (error) {
        console.error('Gagal menyiapkan halaman pembayaran:', error);
        router.push('/');
      }
    };

    mulai();

    return () => {
      masihHidup = false;
    };
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

  const salinText = (text) => {
    navigator.clipboard.writeText(text || '');
    setSudahSalin(true);
    setTimeout(() => setSudahSalin(false), 2000);
  };

  const bikinPesanProgress = ({ bayar, topup }) => {
    if (bayar === 'pending') {
      return 'Pembayaran belum terkonfirmasi. Sistem akan mengecek status secara otomatis.';
    }

    if (bayar === 'gagal') {
      return 'Pembayaran gagal atau sudah melewati batas waktu. Silakan buat pesanan baru.';
    }

    if (bayar === 'sukses' && topup === 'gagal') {
      return 'Pembayaran berhasil, tetapi top-up perlu pengecekan admin.';
    }

    if (bayar === 'sukses' && topup === 'sukses') {
      return 'Top-up berhasil diproses. Silakan cek akun game kamu.';
    }

    if (bayar === 'sukses' && topup === 'proses') {
      return 'Pembayaran berhasil. Top-up sedang diproses oleh sistem.';
    }

    return 'Status pesanan sedang diperiksa. Mohon tunggu sebentar.';
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
        pesan: pesan || '',
      });

      setDataBayar((prev) => {
        if (!prev) return prev;

        const next = {
          ...prev,
          status_bayar: bayarFinal,
          status_topup: topupFinal,
          provider: providerFinal,
        };

        simpanDataTagihan(next);

        return next;
      });
    }

    if (bayarFinal === 'sukses' && dataBayar?.order_id) {
      try {
        sessionStorage.setItem('lastOrderId', dataBayar.order_id);
        localStorage.setItem('lastOrderId', dataBayar.order_id);
      } catch (error) {
        console.error('Gagal menyimpan last order:', error);
      }
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
          setPesanSync(hasil.pesan || 'Status pesanan belum bisa diperbarui.');
        }

        return null;
      }

      const bayar = hasil.data?.status_bayar || 'pending';
      const topup = hasil.data?.status_topup || 'pending';
      const provider = normalisasiProvider(
        hasil.data?.provider || providerOrderRef.current
      );
      const pesan = bikinPesanProgress({ bayar, topup, provider });

      updateProgress({ bayar, topup, provider, pesan });

      return { bayar, topup, provider };
    } catch (error) {
      console.error('Gagal cek DB order:', error);

      if (!silent) {
        setPesanSync('Status pesanan belum bisa diperbarui. Coba lagi sebentar lagi.');
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
        body: JSON.stringify({ order_id: dataBayar.order_id }),
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        if (!silent) {
          setPesanSync(hasil.pesan || 'Pembayaran belum bisa dicek. Coba lagi sebentar lagi.');
        }

        return;
      }

      const bayar = hasil.data?.status_bayar || 'pending';
      const topup = hasil.data?.status_topup || 'pending';
      const provider = normalisasiProvider(
        hasil.data?.provider || providerOrderRef.current
      );
      const pesan = bikinPesanProgress({ bayar, topup, provider });

      updateProgress({ bayar, topup, provider, pesan });

      // Frontend cukup cek payment + baca status database.
      // Jangan panggil /api/provider/sync dari halaman user,
      // karena endpoint itu nembak provider dan sekarang khusus admin.
    } catch (error) {
      console.error('Gagal sync pembayaran:', error);

      if (!silent) {
        setPesanSync('Sistem belum bisa mengecek pembayaran. Coba lagi sebentar lagi.');
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
const orderSelesai = statusBayar === 'sukses' && statusTopup === 'sukses';
const tombolCekStatusDisabled =
  loadingSync || orderSelesai || cooldownCekStatus > 0;

const handleCekStatusManual = async () => {
  if (tombolCekStatusDisabled) return;

  setCooldownCekStatus(15);
  await cekPembayaran({ silent: false });
};
const getStatusUi = () => {
  if (statusBayar === 'gagal') {
    return {
      step: 2,
      Icon: FaExclamationTriangle,
      iconClass: 'text-red-300',
      animateIcon: false,
      animateStep: false,
      title: 'Pembayaran Tidak Berhasil',
      desc: 'Pembayaran gagal atau sudah melewati batas waktu. Kamu bisa membuat pesanan baru untuk mencoba lagi.',
      box: 'bg-red-500/10 border-red-500/20 text-red-300',
      glow: 'bg-red-500/20 text-red-400',
    };
  }

  if (statusBayar === 'sukses' && statusTopup === 'gagal') {
    return {
      step: 3,
      Icon: FaExclamationTriangle,
      iconClass: 'text-orange-300',
      animateIcon: false,
      animateStep: false,
      title: 'Top-up Perlu Dicek',
      desc: 'Pembayaran sudah berhasil, tetapi top-up belum selesai diproses. Admin akan bantu melakukan pengecekan.',
      box: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
      glow: 'bg-orange-500/20 text-orange-400',
    };
  }

  if (statusBayar === 'sukses' && statusTopup === 'sukses') {
    return {
      step: 4,
      Icon: FaCheck,
      iconClass: 'text-emerald-300',
      animateIcon: false,
      animateStep: false,
      title: 'Top-up Berhasil',
      desc: 'Pesanan kamu sudah selesai diproses. Silakan cek akun game atau riwayat transaksi kamu.',
      box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      glow: 'bg-emerald-500/20 text-emerald-400',
    };
  }

  if (statusBayar === 'sukses') {
    return {
      step: 3,
      Icon: FaSpinner,
      iconClass: 'text-blue-300',
      animateIcon: true,
      animateStep: true,
      title: 'Top-up Sedang Diproses',
      desc: 'Pembayaran sudah berhasil. Sistem sedang memproses pesanan kamu.',
      box: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
      glow: 'bg-blue-500/20 text-blue-400',
    };
  }

  return {
    step: 2,
    Icon: FaCreditCard,
    iconClass: 'text-yellow-300',
    animateIcon: false,
    animateStep: true,
    title: 'Menunggu Pembayaran',
    desc: 'Selesaikan pembayaran sesuai instruksi. Setelah itu, status akan diperbarui otomatis.',
    box: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    glow: 'bg-yellow-500/20 text-yellow-400',
  };
};

  const statusUi = getStatusUi();
  const StatusIcon = statusUi.Icon || FaClock;
  const steps = [
    { nomor: 1, label: 'Pesan' },
    { nomor: 2, label: 'Bayar' },
    { nomor: 3, label: 'Proses' },
    { nomor: 4, label: 'Selesai' },
  ];

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
        'get-checkout-url',
      ])
    );
  };

  const getEwalletQrUrl = () => {
    return (
      dataBayar?.qris_url ||
      ambilActionUrl(['generate-qr-code', 'generate-qr-code-v2'])
    );
  };

  if (!dataBayar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-bold text-white">
        <div className="rounded-3xl border border-blue-500/15 bg-gray-900 px-5 py-4 text-sm text-blue-100/80 shadow-2xl shadow-black/30">
          Menyiapkan halaman pembayaran...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-6 sm:py-12">
      <div className="w-full max-w-md">
        <StatusStepper steps={steps} statusUi={statusUi} />

        <div className="rounded-3xl border border-gray-700 bg-gray-900 p-5 text-center shadow-2xl sm:p-8">
          <div className={`mb-6 rounded-3xl border p-5 ${statusUi.box}`}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-current/20 bg-black/10 text-xl">
  <StatusIcon
    className={`${statusUi.iconClass} ${
      statusUi.animateIcon ? 'animate-spin' : ''
    }`}
  />
</div>

            <h1 className="mb-2 text-xl font-black text-white sm:text-2xl">
              {statusUi.title}
            </h1>

            <p className="text-xs leading-relaxed sm:text-sm">{statusUi.desc}</p>
          </div>

          <div className="mb-6 rounded-2xl border border-gray-800 bg-slate-950 p-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Order ID
                </p>

                <p className="mt-1 break-all font-mono text-xs font-black text-blue-400">
                  {dataBayar.order_id}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">
                  Produk
                </p>
                <p className="truncate font-bold text-white">
                  {dataBayar.nama_produk || 'Produk Top Up'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-gray-500">
                  Total
                </p>
                <p className="font-black text-green-400">
                  Rp {Number(dataBayar.harga || dataBayar.harga_total || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {statusBayar === 'pending' && (
            <>
              <p className="mb-6 text-sm text-gray-400">
                Batas waktu bayar:{' '}
                <span
                  className={`ml-1 rounded-md border px-2 py-1 font-mono text-base font-bold ${
                    waktuMundur <= 0
                      ? 'border-red-500/30 bg-red-500/20 text-red-300'
                      : 'border-red-500/20 bg-red-500/10 text-red-400'
                  }`}
                >
                  {waktuMundur <= 0 ? 'Expired' : formatWaktu(waktuMundur)}
                </span>
              </p>

              {dataBayar.tipe === 'recovery' && (
                <div className="mb-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-left text-xs leading-relaxed text-yellow-200">
                  <p className="font-black text-yellow-100">
                    Halaman pembayaran berhasil dipulihkan.
                  </p>

                  <p className="mt-1 text-yellow-100/75">
                    Detail tombol bayar tidak tersimpan di browser ini. Kalau kamu sudah membayar, klik <b>Cek Status Sekarang</b>. Kalau belum membayar, lebih aman buat order baru.
                  </p>

                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="mt-3 w-full rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-yellow-300"
                  >
                    Buat Order Baru
                  </button>
                </div>
              )}

              {dataBayar.tipe === 'qris' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <div className="rounded-2xl bg-white p-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <img
                      src={dataBayar.qris_url}
                      alt="QRIS"
                      className="mx-auto h-44 w-44 sm:h-48 sm:w-48"
                    />
                  </div>

                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-4 text-left">
                    <h3 className="mb-2 border-b border-gray-700/60 pb-2 text-xs font-bold text-white sm:text-sm">
                      Panduan Bayar QRIS
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-400 sm:text-sm">
                      <PanduanItem nomor="1">Buka aplikasi e-wallet atau mobile banking.</PanduanItem>
                      <PanduanItem nomor="2">Pilih menu scan QRIS.</PanduanItem>
                      <PanduanItem nomor="3">Pastikan nominal sesuai, lalu selesaikan pembayaran.</PanduanItem>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'va' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <p className="text-xs text-gray-400 sm:text-sm">
                    Transfer ke {dataBayar.bank} Virtual Account:
                  </p>

                  <div className="flex w-full flex-col items-center justify-between gap-3 rounded-xl border border-gray-600 bg-gray-800 p-4 sm:flex-row">
                    <p className="break-all font-mono text-xl font-black tracking-normal text-blue-400 select-all sm:text-2xl sm:tracking-widest">
                      {dataBayar.va_number}
                    </p>

                    <button
                      type="button"
                      onClick={() => salinText(dataBayar.va_number)}
                      className={`w-full rounded-xl px-4 py-2 text-xs font-bold transition-all sm:w-auto ${
                        sudahSalin
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {sudahSalin ? 'Tersalin ✓' : 'Salin'}
                    </button>
                  </div>

                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-4 text-left">
                    <h3 className="mb-2 border-b border-gray-700/60 pb-2 text-xs font-bold text-white sm:text-sm">
                      Panduan Bayar Virtual Account
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-400 sm:text-sm">
                      <PanduanItem nomor="1">Buka mobile banking atau ATM sesuai bank tujuan.</PanduanItem>
                      <PanduanItem nomor="2">Pilih menu Virtual Account.</PanduanItem>
                      <PanduanItem nomor="3">Masukkan nomor VA yang tertera.</PanduanItem>
                      <PanduanItem nomor="4">Periksa nominal, lalu selesaikan pembayaran.</PanduanItem>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'ewallet' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Metode Pembayaran
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-white">
                      {dataBayar.label_metode_bayar || 'E-Wallet'}
                    </h3>
                  </div>

                  {getEwalletButtonUrl() && (
                    <a
                      href={getEwalletButtonUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-2xl border border-blue-300/30 bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-center font-black text-white shadow-[0_0_25px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-1 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98]"
                    >
                      <span className="block text-xs uppercase tracking-widest text-blue-100/80">
                        Lanjutkan pembayaran
                      </span>
                      <span className="mt-1 block text-base sm:text-lg">
                        Buka {dataBayar.label_metode_bayar || 'E-Wallet'}
                      </span>
                    </a>
                  )}

                  {getEwalletQrUrl() && (
                    <div className="w-full">
                      <div className="my-2 flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-700" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Atau scan QR
                        </p>
                        <div className="h-px flex-1 bg-gray-700" />
                      </div>

                      <div className="mx-auto w-fit rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_0_30px_rgba(37,99,235,0.25)]">
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
                      Instruksi pembayaran belum tersedia di browser ini. Coba buka ulang halaman atau cek status pesanan.
                    </div>
                  )}

                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-4 text-left">
                    <h3 className="mb-2 border-b border-gray-700/60 pb-2 text-xs font-bold text-white sm:text-sm">
                      Panduan Bayar {dataBayar.label_metode_bayar || 'E-Wallet'}
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-400 sm:text-sm">
                      <PanduanItem nomor="1">Klik tombol pembayaran kalau tersedia.</PanduanItem>
                      <PanduanItem nomor="2">Kalau muncul QR, scan lewat aplikasi yang sesuai.</PanduanItem>
                      <PanduanItem nomor="3">Selesaikan pembayaran, lalu tunggu status otomatis berubah.</PanduanItem>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'mandiri_bill' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Mandiri Bill Payment
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-white">
                      Mandiri Bill
                    </h3>
                  </div>

                  <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
                      <p className="mb-1 text-xs font-black uppercase text-gray-500">
                        Biller Code
                      </p>
                      <p className="break-all font-mono text-2xl font-black text-blue-400 select-all">
                        {dataBayar.biller_code}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
                      <p className="mb-1 text-xs font-black uppercase text-gray-500">
                        Bill Key
                      </p>
                      <p className="break-all font-mono text-2xl font-black text-emerald-400 select-all">
                        {dataBayar.bill_key}
                      </p>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-4 text-left">
                    <h3 className="mb-2 border-b border-gray-700/60 pb-2 text-xs font-bold text-white sm:text-sm">
                      Panduan Bayar Mandiri Bill
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-400 sm:text-sm">
                      <PanduanItem nomor="1">Buka Livin atau ATM Mandiri.</PanduanItem>
                      <PanduanItem nomor="2">Pilih menu Bayar atau Payment.</PanduanItem>
                      <PanduanItem nomor="3">Masukkan Biller Code dan Bill Key.</PanduanItem>
                      <PanduanItem nomor="4">Pastikan nominal sesuai, lalu selesaikan pembayaran.</PanduanItem>
                    </ul>
                  </div>
                </div>
              )}

              {dataBayar.tipe === 'cstore' && (
                <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Bayar di Minimarket
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-white">
                      {dataBayar.label_metode_bayar || dataBayar.store || 'Minimarket'}
                    </h3>
                  </div>

                  <div className="w-full rounded-xl border border-gray-600 bg-gray-800 p-4 text-center">
                    <p className="mb-1 text-xs font-black uppercase text-gray-500">
                      Kode Pembayaran
                    </p>

                    <p className="break-all font-mono text-3xl font-black text-yellow-400 select-all">
                      {dataBayar.payment_code}
                    </p>

                    <button
                      type="button"
                      onClick={() => salinText(dataBayar.payment_code || '')}
                      className={`mt-3 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        sudahSalin
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      {sudahSalin ? 'Tersalin ✓' : 'Salin Kode'}
                    </button>
                  </div>

                  <div className="w-full rounded-2xl border border-gray-800 bg-gray-800/40 p-4 text-left">
                    <h3 className="mb-2 border-b border-gray-700/60 pb-2 text-xs font-bold text-white sm:text-sm">
                      Panduan Bayar
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-400 sm:text-sm">
                      <PanduanItem nomor="1">Datang ke kasir {dataBayar.label_metode_bayar || dataBayar.store || 'minimarket'}.</PanduanItem>
                      <PanduanItem nomor="2">Sampaikan ingin membayar tagihan online atau payment code.</PanduanItem>
                      <PanduanItem nomor="3">Tunjukkan kode pembayaran yang tertera.</PanduanItem>
                      <PanduanItem nomor="4">Simpan struk sampai status pesanan berhasil.</PanduanItem>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {pesanSync && (
            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs font-bold text-yellow-300">
              {pesanSync}
            </div>
          )}

          {orderSelesai && (
  <button
    type="button"
    onClick={() => router.push('/')}
    className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-300 hover:-translate-y-1 hover:from-emerald-500 hover:to-emerald-400"
  >
    Kembali ke Beranda
  </button>
)}

<button
  type="button"
  onClick={handleCekStatusManual}
  disabled={tombolCekStatusDisabled}
  className={`w-full rounded-xl py-4 font-black transition-all duration-300 ${
    orderSelesai
      ? 'mt-3 cursor-not-allowed bg-gray-800 text-gray-500'
      : tombolCekStatusDisabled
        ? 'mt-6 cursor-not-allowed bg-gray-800 text-gray-500'
        : 'mt-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1 hover:from-blue-500 hover:to-blue-400'
  }`}
>
  {orderSelesai
    ? 'Status Sudah Selesai'
    : loadingSync
      ? 'Mengecek Status...'
      : cooldownCekStatus > 0
        ? `Cek Lagi dalam ${cooldownCekStatus}s`
        : 'Cek Status Sekarang'}
</button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/lacak?order_id=${encodeURIComponent(dataBayar.order_id)}&from=payment`
              )
            }
            className="mt-3 w-full rounded-xl bg-gray-800 py-3 font-bold text-gray-200 transition-all hover:bg-gray-700"
          >
            Lihat Detail Pesanan
          </button>

          {nomorAdmin && (statusTopup === 'gagal' || statusBayar === 'gagal') && (
            <a
              href={linkChatAdmin()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full rounded-xl bg-green-600 py-3 font-bold text-white transition-all hover:bg-green-500"
            >
              Chat Admin
            </a>
          )}

          <p className="mt-5 text-[11px] text-gray-500">
            Halaman ini akan mengecek status pembayaran dan top-up secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}