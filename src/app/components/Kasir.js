'use client'; // MANTRA WAJIB BUAT INTERAKSI

import { useState } from 'react';
import Swal from 'sweetalert2';

export default function FormKasir({ dataGame }) {
  const [produkDipilih, setProdukDipilih] = useState(null);
  const [inputUserId, setInputUserId] = useState('');
  const [inputZoneId, setInputZoneId] = useState('');
  const [isProsesBeli, setIsProsesBeli] = useState(false);

  const handleBeli = async () => {
    // 1. SATPAM DEPAN (Cek Inputan Kosong)
    if (!inputUserId) {
      Swal.fire({ title: 'Waduh!', text: 'ID-nya isi dulu!', icon: 'warning', background: '#1f2937', color: '#fff', confirmButtonColor: '#3b82f6' });
      return;
    }
    if (dataGame.id === 1 && !inputZoneId) {
      Swal.fire({ title: 'Waduh!', text: 'Zone Id nya isi bree', icon: 'warning', background: '#1f2937', color: '#fff', confirmButtonColor: '#3b82f6' });
      return;
    }

    setIsProsesBeli(true);

    try {
      // ==========================================
      // FASE 1: TEMBAK RADAR CEK NICKNAME DULU
      // ==========================================
      const responCek = await fetch('/api/cekId', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_player: inputUserId,
          server_player: inputZoneId, 
          kode_game: dataGame.kode_game
        })
      });

      const dataCek = await responCek.json();

      // Kalau ID Ngasal / Gak Ketemu, Stop di Sini!
      if (!responCek.ok) {
        Swal.fire({ icon: 'error', title: 'ID Gak Ketemu! 😭', text: dataCek.pesan, background: '#1f2937', color: '#fff', confirmButtonColor: '#ef4444' });
        setIsProsesBeli(false);
        return; 
      }

      // ==========================================
      // FASE 2: MUNCULIN STRUK KONFIRMASI (Kalo ID Bener)
      // ==========================================
      const yakin = await Swal.fire({
        title: 'Konfirmasi Pesanan 🛒',
        html: `
          <div class="text-left text-sm space-y-2 mt-4 bg-gray-900 p-4 rounded-xl border border-gray-700">
            <p class="text-gray-400">Tujuan:</p>
            <p class="text-xl font-black text-cyan-400">${dataCek.nickname}</p>
            <p class="text-gray-300">ID: ${inputUserId} ${inputZoneId ? `(${inputZoneId})` : ''}</p>
            <hr class="border-gray-700 my-3" />
            <p class="text-gray-400">Item:</p>
            <p class="font-bold text-white">${produkDipilih.nama_produk}</p>
            <p class="font-bold text-green-400 mt-1">Rp ${produkDipilih.harga.toLocaleString('id-ID')}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#06b6d4',
        cancelButtonColor: '#374151',
        confirmButtonText: 'Gas Bayar! 🔥',
        cancelButtonText: 'Batal',
        background: '#1f2937',
        color: '#fff'
      });

      // ==========================================
      // FASE 3: KALO USER KLIK "GAS BAYAR" -> PROSES!
      // ==========================================
      if (yakin.isConfirmed) {
        
        // Munculin Loading pas OTW Kasir
        Swal.fire({
          title: 'Meneruskan ke Kasir...',
          text: 'Tunggu bentar ya bre, jangan di-close!',
          background: '#1f2937',
          color: '#fff',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Tembak API Beli Asli lu
        const responBeli = await fetch('http://localhost:3000/api/beli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: dataGame.id,
            produk_id: produkDipilih.id,
            kode_produk: produkDipilih.kode_produk,
            id_player: inputUserId,
            zone_player: dataGame.id === 1 ? inputZoneId : "",
          })
        });

        const dataSistem = await responBeli.json();

        if (responBeli.ok) {
          window.location.href = dataSistem.link_bayar; // Lempar ke Midtrans
        } else {
          Swal.fire({ title: 'Gagal bre', text: dataSistem.error, icon: 'error', background: '#1f2937', color: '#fff', confirmButtonColor: '#ef4444' });
        }
      }

    } catch (error) {
      console.error("Error:", error);
      Swal.fire({ icon: 'error', title: 'Waduh', text: 'Dapur belum siap nerima pesenan! (Atau Radar Error)', background: '#1f2937', color: '#fff' });
    } finally {
      setIsProsesBeli(false); // Matiin loading di tombol
    }
  };

  return (
    <div className="mt-8 space-y-6">
      
      {/* 1. INPUT USER ID */}
      <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">1</div>
            <h2 className="text-xl font-bold text-white">Masukkan User ID</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Ketikan User ID Lu..." 
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            className="flex-grow bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
          />
          {/* Cuma nongol kalo gamenya butuh Zone ID (Misal ML) */}
          {dataGame.id === 1 && (
            <input 
              type="text" 
              placeholder="Zone ID" 
              value={inputZoneId}
              onChange={(e) => setInputZoneId(e.target.value)}
              className="w-full md:w-32 bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
            />
          )}
        </div>
      </div>

      {/* 2. PILIH NOMINAL */}
      <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</div>
            <h2 className="text-xl font-bold text-white">Pilih Nominal Top Up</h2>
        </div>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           {dataGame.produk.map(item => (
             <div 
               key={item.id} 
               onClick={() => setProdukDipilih(item)}
               className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                 produkDipilih?.id === item.id 
                   ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]' 
                   : 'bg-gray-900 border-gray-700 hover:border-blue-400 hover:bg-gray-800'
               }`}
             >
               <p className="text-white font-bold">{item.nama_produk}</p>
               <p className={`text-sm mt-1 font-semibold ${produkDipilih?.id === item.id ? 'text-blue-400' : 'text-green-400'}`}>
                 Rp {item.harga.toLocaleString('id-ID')}
               </p>
             </div>
           ))}
         </div>
      </div>

      {/* 3. TOMBOL BELI */}
      <button 
          disabled={!produkDipilih || isProsesBeli}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
            !produkDipilih || isProsesBeli
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1' 
          }`}
          onClick={handleBeli}
        >
        {isProsesBeli ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>OTW Dapur Bre...</span>
            </div>
          ) : produkDipilih ? (
            'Beli Sekarang 🔥'
          ) : (
            'Pilih Nominal Dulu'
          )}
        </button>
    </div>
  );
}