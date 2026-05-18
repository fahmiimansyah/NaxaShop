'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import Swal from 'sweetalert2';

export default function FormKasir({ dataGame }) {
  const router = useRouter(); 

  const [produkDipilih, setProdukDipilih] = useState(null);
  const [inputUserId, setInputUserId] = useState('');
  const [inputZoneId, setInputZoneId] = useState(''); 
  const [metodeBayar, setMetodeBayar] = useState(''); // <-- KOSONG, GAK ADA YANG BIRU DULUAN
  const [isProsesBeli, setIsProsesBeli] = useState(false);

  // LOGIC SULTAN BACA DATABASE LANGSUNG
  // Kalo zone_id di database = 1, berarti butuh (Misal: MLBB)
  const butuhZoneId = dataGame.zone_id === 1; 
  // Kalo server_game di database ada isinya (kayak 'hsr' atau 'gi'), berarti butuh dropdown server
  const butuhServer = dataGame.server_game && dataGame.server_game.trim() !== '';

  const handleBeli = async () => {
  // 1. SATPAM DEPAN
  if (!produkDipilih) {
    Swal.fire({
      title: 'Waduh!',
      text: 'Pilih nominal dulu bree!',
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  if (!inputUserId) {
    Swal.fire({
      title: 'Waduh!',
      text: 'ID-nya isi dulu!',
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  if (butuhZoneId && !inputZoneId) {
    Swal.fire({
      title: 'Waduh!',
      text: 'Zone ID nya isi bree',
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  if (butuhServer && !inputZoneId) {
    Swal.fire({
      title: 'Waduh!',
      text: 'Pilih Server lu dulu bre!',
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  if (!metodeBayar) {
    Swal.fire({
      title: 'Eits!',
      text: 'Pilih metode pembayaran dulu bre!',
      icon: 'warning',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#3b82f6'
    });
    return;
  }

  setIsProsesBeli(true);

  try {
    // FASE 1: CEK NICKNAME
    const responCek = await fetch('/api/cekId', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_player: inputUserId,
        server_player: inputZoneId,
        kode_game: dataGame.kode_game || dataGame.server_game
      })
    });

    const dataCek = await responCek.json();

    let namaTarget = '';

    // Kalau API error beneran
    if (!responCek.ok) {
      Swal.fire({
        icon: 'error',
        title: 'ID Gak Ketemu!',
        text: dataCek.pesan || 'Gagal cek ID bre.',
        background: '#1f2937',
        color: '#fff'
      });

      setIsProsesBeli(false);
      return;
    }

    // Kalau game support cek nickname dan sukses
    if (dataCek.sukses) {
      namaTarget = dataCek.nickname;
    }

    // Kalau game TIDAK support cek nickname, tetap boleh lanjut
    else if (dataCek.support_cek_nickname === false) {
      namaTarget = 'ID akan diproses tanpa cek otomatis';

      const lanjutManual = await Swal.fire({
        title: 'Cek Nickname Belum Tersedia',
        html: `
          <p>${dataCek.pesan}</p>
          <br/>
          <b>Pastikan ID dan server lu sudah benar ya bre.</b>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Lanjut, ID sudah benar',
        cancelButtonText: 'Batal dulu',
        background: '#1f2937',
        color: '#fff',
        confirmButtonColor: '#06b6d4',
        cancelButtonColor: '#374151'
      });

      if (!lanjutManual.isConfirmed) {
        setIsProsesBeli(false);
        return;
      }
    }

    // Kalau game support cek nickname tapi gagal
    else {
      Swal.fire({
        icon: 'error',
        title: 'ID Gak Ketemu!',
        text: dataCek.pesan || 'ID tidak valid bre.',
        background: '#1f2937',
        color: '#fff'
      });

      setIsProsesBeli(false);
      return;
    }

    // FASE 2: KONFIRMASI
    const yakin = await Swal.fire({
      title: 'Konfirmasi Pesanan',
      html: `
        <div style="text-align:left; line-height:1.7">
          <b>Produk:</b> ${produkDipilih.nama_produk}<br/>
          <b>Target:</b> ${namaTarget}<br/>
          <b>ID:</b> ${inputUserId}<br/>
          <b>Server/Zone:</b> ${inputZoneId || '-'}<br/>
          <b>Metode:</b> ${metodeBayar.toUpperCase()}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Gas Bayar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#06b6d4',
      cancelButtonColor: '#374151',
      background: '#1f2937',
      color: '#fff'
    });

    if (!yakin.isConfirmed) {
      setIsProsesBeli(false);
      return;
    }

    // FASE 3: TEMBAK DAPUR BELI
    Swal.fire({
      title: 'Menyiapkan Tagihan...',
      background: '#1f2937',
      color: '#fff',
      didOpen: () => Swal.showLoading()
    });

    const responBeli = await fetch('/api/beli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: dataGame.id,
        produk_id: produkDipilih.id,
        kode_produk: produkDipilih.kode_produk,
        id_player: inputUserId,
        zone_player: inputZoneId,
        metode_bayar: metodeBayar
      })
    });

    const dataSistem = await responBeli.json();

    if (responBeli.ok) {
      Swal.close();
      sessionStorage.setItem('dataTagihan', JSON.stringify(dataSistem));
      router.push('/pembayaran');
    } else {
      Swal.fire({
        title: 'Gagal bre',
        text: dataSistem.pesan || dataSistem.error || 'Gagal bikin tagihan.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Waduh Error',
      text: 'Koneksi dapur lagi ngadat bre!',
      background: '#1f2937',
      color: '#fff'
    });
  } finally {
    setIsProsesBeli(false);
  }
};

  return (
    <div className="mt-8 space-y-6">
      
      

      {/* 1. PILIH NOMINAL */}
      <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">1</div>
          <h2 className="text-xl font-bold text-white">Pilih Nominal</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dataGame.produk.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setProdukDipilih(item)} 
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-28 ${
                produkDipilih?.id === item.id 
                  ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                  : 'bg-gray-900 border-gray-700 hover:border-blue-400'
              }`}
            >
              <p className="text-white font-black text-base leading-tight">{item.nama_produk}</p>
              <p className="text-sm font-bold text-cyan-400">
                Rp {item.harga.toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      </div>


      {/* 2. INPUT USER ID */}
      <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">2</div>
          <h2 className="text-xl font-bold text-white">Masukkan User ID</h2>
        </div>
        
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Ketikan User ID Lu..." 
            value={inputUserId} 
            onChange={(e) => setInputUserId(e.target.value)} 
            className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all" 
          />
          
          {/* MUNCUL KALO DI DATABASE zone_id = 1 */}
          {butuhZoneId && (
            <input 
              type="text" 
              placeholder="(Zone ID)" 
              value={inputZoneId} 
              onChange={(e) => setInputZoneId(e.target.value)} 
              className="w-28 bg-gray-900 text-white px-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all text-center font-bold" 
            />
          )}

          {/* MUNCUL KALO DI DATABASE server_game ADA ISINYA */}
          {butuhServer && (
            <select 
              value={inputZoneId} 
              onChange={(e) => setInputZoneId(e.target.value)}
              className="w-40 bg-gray-900 text-white px-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all font-bold appearance-none cursor-pointer"
            >
              <option value="">Pilih Server</option>
              <option value="os_asia">Asia</option>
              <option value="os_usa">America</option>
              <option value="os_euro">Europe</option>
              <option value="os_cht">TW/HK/MO</option>
            </select>
          )}
        </div>
      </div>
      {/* 3. PILIH METODE PEMBAYARAN */}
      <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">3</div>
          <h2 className="text-xl font-bold text-white">Pilih Pembayaran</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* KLIK QRIS */}
          <div 
            onClick={() => setMetodeBayar('qris')} 
            className={`p-4 rounded-2xl border-2 cursor-pointer text-center transition-all ${
              metodeBayar === 'qris' 
                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-gray-900 border-gray-700 hover:border-blue-400'
            }`}
          >
            <p className="font-black text-white text-lg">QRIS</p>
            <p className="text-xs text-gray-400 mt-1">GoPay, OVO, Dana</p>
          </div>
          
          {/* KLIK BCA VA */}
          <div 
            onClick={() => setMetodeBayar('bca_va')} 
            className={`p-4 rounded-2xl border-2 cursor-pointer text-center transition-all ${
              metodeBayar === 'bca_va' 
                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-gray-900 border-gray-700 hover:border-blue-400'
            }`}
          >
            <p className="font-black text-white text-lg">BCA</p>
            <p className="text-xs text-gray-400 mt-1">Virtual Account Transfer</p>
          </div>
        </div>
      </div>

      {/* 4. TOMBOL BELI */}
      <button 
        disabled={!produkDipilih || !metodeBayar || isProsesBeli}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
          !produkDipilih || !metodeBayar || isProsesBeli
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1' 
        }`}
        onClick={handleBeli}
      >
        {isProsesBeli ? 'Kalem Bre...' : 'Beli Sekarang 🔥'}
      </button>

    </div>
  );
}