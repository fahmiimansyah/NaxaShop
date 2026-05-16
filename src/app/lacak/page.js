'use client';

import { useState } from 'react';

export default function LacakPesanan() {
  const [inputResi, setInputResi] = useState('');
  const [dataPesanan, setDataPesanan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pesanError, setPesanError] = useState('');

  const cariResi = async () => {
    if (!inputResi) return;
    
    setIsLoading(true);
    setPesanError('');
    setDataPesanan(null);

    try {
      const respon = await fetch(`/api/pesanan?id=${inputResi}`);
      const hasil = await respon.json();

      if (respon.ok) {
        setDataPesanan(hasil.data);
      } else {
        setPesanError(hasil.pesan);
      }
    } catch (error) {
      setPesanError('Koneksi ngadat bre, coba lagi nanti!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-lg">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Lacak Pesanan 🕵️‍♂️</h1>
          <p className="text-gray-400">Masukin kode <span className="font-bold text-blue-400">NX-...</span> lu di bawah bre.</p>
        </div>

        {/* KOTAK PENCARIAN */}
        <div className="bg-gray-900 p-2 rounded-2xl border border-gray-800 flex shadow-lg mb-8 focus-within:border-blue-500 transition-all">
          <input 
            type="text" 
            placeholder="Contoh: NX-1715830000" 
            value={inputResi}
            onChange={(e) => setInputResi(e.target.value)}
            className="w-full bg-transparent text-white px-4 py-3 outline-none font-mono"
            onKeyDown={(e) => e.key === 'Enter' && cariResi()}
          />
          <button 
            onClick={cariResi}
            disabled={isLoading || !inputResi}
            className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
              isLoading || !inputResi ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
            }`}
          >
            {isLoading ? 'Nyari...' : 'Lacak!'}
          </button>
        </div>

        {/* ERROR MESSAGE */}
        {pesanError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-center font-bold animate-in fade-in slide-in-from-top-4">
            {pesanError}
          </div>
        )}

        {/* STRUK HASIL PENCARIAN */}
        {dataPesanan && (
          <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Bagian Atas Struk (Status) */}
{/* Bagian Atas Struk (Status Dinamis) */}
            <div className={`p-6 text-center border-b border-gray-700 ${
              dataPesanan.status_bayar === 'pending' ? 'bg-yellow-500/10' :
              dataPesanan.status_bayar === 'sukses' && dataPesanan.status_topup === 'pending' ? 'bg-blue-500/10' :
              'bg-green-500/10'
            }`}>
              <p className="text-gray-400 text-sm mb-1">Status Pesanan</p>
              
              {dataPesanan.status_bayar === 'pending' && (
                <h2 className="text-2xl font-black uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse">
                  BELUM DIBAYAR ⏳
                </h2>
              )}
              
              {dataPesanan.status_bayar === 'sukses' && dataPesanan.status_topup === 'pending' && (
                <h2 className="text-2xl font-black uppercase tracking-widest text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)] animate-pulse">
                  DIPROSES SISTEM 🔄
                </h2>
              )}

              {dataPesanan.status_bayar === 'sukses' && dataPesanan.status_topup === 'sukses' && (
                <h2 className="text-2xl font-black uppercase tracking-widest text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                  SUKSES ✓
                </h2>
              )}
            </div>

            {/* Isi Struk */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                <span className="text-gray-400 text-sm">Order ID</span>
                <span className="text-white font-mono font-bold bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                  {dataPesanan.order_id}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                <span className="text-gray-400 text-sm">Item / Metode</span>
                <div className="text-right">
                   <p className="text-white font-bold">{dataPesanan.nama_produk}</p>
                   <p className="text-xs text-blue-400 font-bold uppercase">{dataPesanan.payment_type}</p>
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                <span className="text-gray-400 text-sm">ID Tujuan</span>
                <span className="text-white font-bold">{dataPesanan.id_player} {dataPesanan.zone_player && `(${dataPesanan.zone_player})`}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 text-sm">Total Bayar</span>
                <span className="text-2xl font-black text-blue-400">
                  Rp {dataPesanan.harga?.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Footer Struk */}
            <div className="bg-gray-900 p-4 text-center">
              <p className="text-xs text-gray-500">
                Kalau ada kendala, capture resi ini dan kirim ke WhatsApp Admin NaXaShop.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}