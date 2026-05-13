'use client'; // MANTRA WAJIB BUAT INTERAKSI

import { useState } from 'react';

export default function FormKasir({ dataGame }) {
  const [produkDipilih, setProdukDipilih] = useState(null);
  const [inputUserId, setInputUserId] = useState('');
  const [inputZoneId, setInputZoneId] = useState('');
  const [isProsesBeli, setIsProsesBeli] = useState(false);

  const handleBeli = async () => {
    if (!inputUserId) {
      alert("Woy bre! User ID-nya diisi dulu dong!");
      return;
    }
    // Asumsi ID 1 itu Mobile Legends yang butuh Zone ID
    if (dataGame.id === 1 && !inputZoneId) {
      alert("Eits! Zone ID-nya isi dulu yaa");
      return;
    }

    setIsProsesBeli(true);
    
    // CATATAN: Nanti rute POST ini harus kita bikin juga di Next.js
    // Buat sekarang, UI-nya aja dulu yang kita rapihin
    try {
      const respon = await fetch('http://localhost:3000/api/beli', {
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
      const dataSistem = await respon.json();
      if (respon.ok) {
        window.location.href = dataSistem.link_bayar
      } else {
        alert(`GAGAL BRE: ${dataSistem.error?.error_msg || dataSistem.pesan}`)
        console.log("Errorna:", dataSistem)
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Dapur belum siap nerima pesenan! (Rute POST belum dibikin)");
    } finally {
      setIsProsesBeli(false);
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