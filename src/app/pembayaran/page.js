'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HalamanPembayaran() {
  const router = useRouter();
  const [dataBayar, setDataBayar] = useState(null);
  const [waktuMundur, setWaktuMundur] = useState(900); // 15 Menit = 900 Detik
  const [sudahSalin, setSudahSalin] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
const [pesanSync, setPesanSync] = useState('');
  // 1. NGAMBIL DATA DARI MEMORI BROWSER
  useEffect(() => {
    const simpenan = sessionStorage.getItem('dataTagihan');
    if (!simpenan) {
      router.push('/');
    } else {
      setDataBayar(JSON.parse(simpenan));
    }
  }, [router]);

  // 2. LOGIC ANIMASI TIMER MUNDUR
  useEffect(() => {
    if (waktuMundur <= 0) return;
    
    const interval = setInterval(() => {
      setWaktuMundur((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [waktuMundur]);

  // Fungsi buat ngerubah detik jadi format 14:59
  const formatWaktu = (detik) => {
    const menit = Math.floor(detik / 60);
    const sisaDetik = detik % 60;
    return `${menit.toString().padStart(2, '0')}:${sisaDetik.toString().padStart(2, '0')}`;
  };

  // 3. FUNGSI KLIK SALIN NO REK/VA
  const salinNomorVA = (nomor) => {
    navigator.clipboard.writeText(nomor);
    setSudahSalin(true);
    setTimeout(() => setSudahSalin(false), 2000); // Reset tulisan tombol setelah 2 detik
  };

  if (!dataBayar) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">Menyiapkan Ruang Kasir...</div>;
  const cekPembayaran = async () => {
  if (!dataBayar?.order_id) return;

  setLoadingSync(true);
  setPesanSync('');

  try {
    const respon = await fetch('/api/payment/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: dataBayar.order_id })
    });

    const hasil = await respon.json();

    if (!respon.ok || !hasil.sukses) {
      setPesanSync(hasil.pesan || 'Gagal cek pembayaran bre.');
      return;
    }

    const statusBayar = hasil.data?.status_bayar;
    const statusTopup = hasil.data?.status_topup;

    if (statusBayar === 'pending') {
      setPesanSync('Pembayaran belum kebaca lunas. Tunggu sebentar lalu cek lagi.');
      return;
    }

    if (statusBayar === 'gagal') {
      setPesanSync('Pembayaran gagal atau expired. Silakan buat order baru.');
      return;
    }

    if (statusBayar === 'sukses') {
      sessionStorage.setItem('lastOrderId', dataBayar.order_id);
      sessionStorage.removeItem('dataTagihan');

      router.push(`/sukses?order_id=${encodeURIComponent(dataBayar.order_id)}&topup=${encodeURIComponent(statusTopup || 'proses')}`);
    }
  } catch (error) {
    setPesanSync('Server lagi ngadat pas cek pembayaran bre.');
  } finally {
    setLoadingSync(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-6 sm:py-12 px-4">
      <div className="w-full max-w-md">
        
        {/* STEPPER OPTIMASI MOBILE */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-4 w-full h-1 bg-gray-800 z-0"></div>
            <div className="absolute left-0 top-4 h-1 bg-blue-500 z-0 w-1/2 transition-all duration-1000"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black mb-1 text-sm shadow-lg">
                ✓
              </div>
              <span className="text-[10px] sm:text-xs text-blue-400 font-bold">Pesan</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black mb-1 text-sm shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">
                2
              </div>
              <span className="text-[10px] sm:text-xs text-blue-400 font-bold">Bayar</span>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 text-gray-500 flex items-center justify-center font-black mb-1 text-sm">
                3
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold">Selesai</span>
            </div>
          </div>
        </div>

        {/* KOTAK UTAMA KASIR */}
        <div className="bg-gray-900 p-5 sm:p-8 rounded-3xl border border-gray-700 shadow-2xl text-center">
          
          <h1 className="text-xl sm:text-2xl font-black text-white mb-2">Selesaikan Pembayaran! 💸</h1>
          
          {/* ANIMASI TIMER MUNDUR GANTENG */}
          <p className="text-gray-400 text-sm mb-6">
            Batas waktu bayar lu:{' '}
            <span className="font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-base font-bold ml-1">
              {formatWaktu(waktuMundur)}
            </span>
          </p>

          {/* JIKA USER MILIH QRIS */}
          {dataBayar.tipe === 'qris' && (
            <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
               <div className="p-3 bg-white rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                 <img src={dataBayar.qris_url} alt="QRIS" className="w-44 h-44 sm:w-48 sm:h-48 mx-auto" />
               </div>
               
               <div className="w-full bg-gray-800/40 border border-gray-800 rounded-2xl p-4 text-left">
                  <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">Cara Bayar pake QRIS:</h3>
                  <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
                    <li className="flex gap-2"><span>📱</span> Buka e-Wallet (GoPay, OVO, Dana, dll).</li>
                    <li className="flex gap-2"><span>📷</span> Pilih menu <b>Scan QR</b> / bayar pake kamera.</li>
                    <li className="flex gap-2"><span>✅</span> Cek nominalnya pas, masukkan PIN lu.</li>
                  </ul>
               </div>
            </div>
          )}

          {/* JIKA USER MILIH BCA VA */}
          {dataBayar.tipe === 'va' && (
            <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-500">
               <p className="text-xs sm:text-sm text-gray-400">Transfer ke {dataBayar.bank} Virtual Account:</p>
               
               {/* KOLOM NO REK ANTI OFFSIDE + TOMBOL SALIN */}
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
                  <h3 className="font-bold text-white mb-2 text-xs sm:text-sm border-b border-gray-700/60 pb-2">Cara Bayar pake m-BCA:</h3>
                  <ul className="text-xs sm:text-sm text-gray-400 space-y-2">
                    <li className="flex gap-2"><span>📱</span> Login ke aplikasi <b>BCA mobile</b>.</li>
                    <li className="flex gap-2"><span>💸</span> Pilih menu <b>m-Transfer</b> → <b>BCA Virtual Account</b>.</li>
                    <li className="flex gap-2"><span>✍️</span> Tempel / masukkan nomor VA di atas.</li>
                    <li className="flex gap-2"><span>✅</span> Pastikan nominal pas, masukkan PIN m-BCA.</li>
                  </ul>
               </div>
            </div>
          )}

          {/* TOTAL HARGA */}
          <div className="mt-6 pt-5 border-t border-gray-800">
            <p className="text-gray-400 text-xs sm:text-sm">Total Pembayaran</p>
            <p className="text-2xl sm:text-3xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]">
              Rp {dataBayar.harga.toLocaleString('id-ID')}
            </p>
          </div>

          {pesanSync && (
  <div className="mt-5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-2xl p-4 text-xs font-bold">
    {pesanSync}
  </div>
)}

<button 
  onClick={cekPembayaran}
  disabled={loadingSync}
  className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loadingSync ? 'Ngecek Pembayaran...' : 'Gua Udah Bayar, Cek Sekarang 🔥'}
</button>

<button
  onClick={() => router.push(`/lacak?order_id=${encodeURIComponent(dataBayar.order_id)}`)}
  className="mt-3 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold transition-all"
>
  Lihat Status / Struk 🧾
</button>
        </div>
      </div>
    </div>
  );
}