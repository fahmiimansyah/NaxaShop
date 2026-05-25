'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function FormKasir({ dataGame }) {
  const router = useRouter();

  const [produkDipilih, setProdukDipilih] = useState(null);
  const [inputUserId, setInputUserId] = useState('');
  const [inputZoneId, setInputZoneId] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('');
  const [isProsesBeli, setIsProsesBeli] = useState(false);
  const [setujuAturan, setSetujuAturan] = useState(false);
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const butuhZoneId = dataGame.zone_id === 1;
  const butuhServer = dataGame.server_game && dataGame.server_game.trim() !== '';

  const formatRupiah = (angka) => {
    return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

const daftarMetodeBayar = [
  {
    grup: 'QR & E-Wallet',
    items: [
      { value: 'qris', label: 'QRIS', desc: 'Gopay, OVO, Dana', logo: '/payment/qris.png', fallback: 'QR' },
      { value: 'gopay', label: 'GoPay', desc: 'QR / deeplink GoPay', logo: '/payment/gopay.png', fallback: 'GP' },
      { value: 'shopeepay', label: 'ShopeePay', desc: 'Bayar via ShopeePay', logo: '/payment/shopeepay.png', fallback: 'SP' }
    ]
  },
  {
    grup: 'Virtual Account',
    items: [
      { value: 'bca_va', label: 'BCA VA', desc: 'Virtual Account BCA', logo: '/payment/bca.svg', fallback: 'BCA' },
      { value: 'bni_va', label: 'BNI VA', desc: 'Virtual Account BNI', logo: '/payment/bni.png', fallback: 'BNI' },
      { value: 'bri_va', label: 'BRI VA', desc: 'Virtual Account BRI', logo: '/payment/bri.png', fallback: 'BRI' },
      { value: 'cimb_va', label: 'CIMB VA', desc: 'Virtual Account CIMB', logo: '/payment/cimb.png', fallback: 'CIMB' },
      { value: 'permata_va', label: 'Permata VA', desc: 'Virtual Account Permata', logo: '/payment/permata.png', fallback: 'PRMT' },
      { value: 'mandiri_bill', label: 'Mandiri Bill', desc: 'Mandiri Bill Payment', logo: '/payment/mandiri.png', fallback: 'MDR' }
    ]
  },
  {
    grup: 'Minimarket',
    items: [
      { value: 'alfamart', label: 'Alfamart', desc: 'Bayar di kasir Alfamart', logo: '/payment/alfa.png', fallback: 'ALFA' },
      { value: 'indomaret', label: 'Indomaret', desc: 'Bayar di kasir Indomaret', logo: '/payment/indomaret.png', fallback: 'INDO' }
    ]
  }
];

const namaMetodeBayar = daftarMetodeBayar
  .flatMap((grup) => grup.items)
  .reduce((hasil, item) => {
    hasil[item.value] = item.label;
    return hasil;
  }, {});

  const checkoutDisabled =
    !produkDipilih ||
    !inputUserId ||
    (butuhZoneId && !inputZoneId) ||
    (butuhServer && !inputZoneId) ||
    !metodeBayar ||
    !setujuAturan ||
    isProsesBeli;

  const kodeGame = String(dataGame.kode_game || dataGame.server_game || '').toLowerCase();

  const gameSupportAutoCheck = [
    'mobilelegend',
    'mobile_legends',
    'mobile-legends',
    'ml',
    'freefire',
    'free-fire',
    'ff'
  ].includes(kodeGame);

  const getPanduanGame = () => {
    if (kodeGame.includes('mobile') || kodeGame === 'ml' || kodeGame.includes('legend')) {
      return {
        title: 'Cara isi ID Mobile Legends',
        badge: 'Auto Check Nickname',
        type: 'auto',
        items: [
          'Buka Mobile Legends.',
          'Klik profil di pojok kiri atas.',
          'Salin User ID dan Zone ID.',
          'Contoh format: User ID 123456789, Zone ID 1234.'
        ],
        contoh: '123456789 (1234)'
      };
    }

    if (kodeGame.includes('free') || kodeGame === 'ff') {
      return {
        title: 'Cara isi ID Free Fire',
        badge: 'Auto Check Nickname',
        type: 'auto',
        items: [
          'Buka Free Fire.',
          'Klik profil akun.',
          'Salin Player ID / UID.',
          'Free Fire biasanya tidak butuh Zone ID.'
        ],
        contoh: '123456789'
      };
    }

    if (kodeGame.includes('genshin') || kodeGame.includes('gi')) {
      return {
        title: 'Cara isi UID Genshin Impact',
        badge: 'Auto Check Nickname',
        type: 'auto',
        items: [
          'Buka Genshin Impact.',
          'UID ada di pojok kanan bawah layar.',
          'Pilih server sesuai akun: Asia, America, Europe, atau TW/HK/MO.',
          'Pastikan UID dan server benar sebelum bayar.'
        ],
        contoh: 'UID 800xxxxxxx - Server Asia'
      };
    }

    if (kodeGame.includes('hsr') || kodeGame.includes('honkai') || kodeGame.includes('star')) {
      return {
        title: 'Cara isi UID Honkai: Star Rail',
        badge: 'Auto Check Nickname',
        type: 'auto',
        items: [
          'Buka Honkai: Star Rail.',
          'UID ada di bagian profil / pojok layar.',
          'Pilih server sesuai akun.',
          'Pastikan UID dan server benar sebelum checkout.'
        ],
        contoh: 'UID 800xxxxxxx - Server Asia'
      };
    }

    if (kodeGame.includes('wuwa') || kodeGame.includes('wuthering')) {
      return {
        title: 'Cara isi UID Wuthering Waves',
        badge: 'Verifikasi Manual',
        type: 'manual',
        items: [
          'Buka Wuthering Waves.',
          'Masuk ke profil akun.',
          'Salin UID dengan teliti.',
          'Jika ada pilihan server, pastikan server sesuai akun.'
        ],
        contoh: 'UID akun game'
      };
    }

    if (kodeGame.includes('zzz') || kodeGame.includes('zenless')) {
      return {
        title: 'Cara isi UID Zenless Zone Zero',
        badge: 'Verifikasi Manual',
        type: 'manual',
        items: [
          'Buka Zenless Zone Zero.',
          'Cek UID di profil akun.',
          'Pilih server sesuai akun.',
          'Pastikan data benar sebelum pembayaran.'
        ],
        contoh: 'UID akun game'
      };
    }

    return {
      title: 'Panduan isi data akun',
      badge: gameSupportAutoCheck ? 'Auto Check Nickname' : 'Verifikasi Manual',
      type: gameSupportAutoCheck ? 'auto' : 'manual',
      items: [
        'Masukkan User ID sesuai yang muncul di dalam game.',
        'Jika game membutuhkan server atau zone, pastikan pilih dengan benar.',
        'Kesalahan input bisa menyebabkan top-up gagal atau masuk ke akun lain.'
      ],
      contoh: 'User ID / UID akun game'
    };
  };

  const panduanGame = getPanduanGame();
  const handleBukaPanduan = () => {
  const isAuto = panduanGame.type === 'auto';

  const warnaBadge = isAuto
    ? 'background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.25);'
    : 'background:rgba(234,179,8,0.12); color:#fde047; border:1px solid rgba(234,179,8,0.25);';

  const warnaNomor = isAuto
    ? 'background:#22c55e;'
    : 'background:#eab308;';

  Swal.fire({
    title: panduanGame.title,
    width: 620,
    background: '#111827',
    color: '#fff',
    confirmButtonText: 'Paham, lanjut isi ID 🔥',
    confirmButtonColor: '#06b6d4',
    html: `
      <div style="text-align:left;">
        <div style="display:flex; justify-content:center; margin-bottom:14px;">
          <span style="${warnaBadge} display:inline-block; padding:6px 12px; border-radius:999px; font-size:11px; font-weight:900;">
            ${panduanGame.badge}
          </span>
        </div>

        <div style="display:grid; gap:10px; margin-top:10px;">
          ${panduanGame.items
            .map(
              (item, index) => `
                <div style="display:flex; gap:12px; align-items:flex-start; background:#020617; border:1px solid #1f2937; padding:12px; border-radius:14px;">
                  <span style="${warnaNomor} flex:0 0 auto; width:26px; height:26px; display:flex; align-items:center; justify-content:center; border-radius:999px; color:white; font-weight:900; font-size:12px;">
                    ${index + 1}
                  </span>
                  <p style="margin:0; color:#d1d5db; font-size:13px; line-height:1.55;">
                    ${item}
                  </p>
                </div>
              `
            )
            .join('')}
        </div>

        <div style="margin-top:14px; background:rgba(15,23,42,0.95); border:1px dashed #334155; padding:12px; border-radius:14px;">
          <p style="margin:0 0 5px; color:#64748b; font-size:10px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase;">
            Contoh
          </p>
          <code style="color:#67e8f9; font-size:13px; font-weight:800;">
            ${panduanGame.contoh}
          </code>
        </div>

        <p style="margin:14px 0 0; color:#94a3b8; font-size:12px; line-height:1.6; text-align:center;">
          Pastikan data sesuai akun game sebelum lanjut checkout.
        </p>
      </div>
    `
  });
};
  const handleBeli = async () => {
    const alertBase = {
      background: '#1f2937',
      color: '#fff'
    };

    const tampilWarning = (text, title = 'Waduh!') => {
      Swal.fire({
        ...alertBase,
        title,
        text,
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });
    };

    if (!produkDipilih) {
      tampilWarning('Pilih nominal dulu bree!');
      return;
    }

    if (!inputUserId) {
      tampilWarning('ID-nya isi dulu!');
      return;
    }

    if (butuhZoneId && !inputZoneId) {
      tampilWarning('Zone ID nya isi bree');
      return;
    }

    if (butuhServer && !inputZoneId) {
      tampilWarning('Pilih Server lu dulu bre!');
      return;
    }

    if (!metodeBayar) {
      tampilWarning('Pilih metode pembayaran dulu bre!', 'Eits!');
      return;
    }

    if (!setujuAturan) {
      tampilWarning(
        'Pastikan ID, Zone, atau Server sudah benar sebelum checkout.',
        'Setujui aturan dulu bre'
      );
      return;
    }

    const bikinTagihan = async () => {
      Swal.fire({
        ...alertBase,
        title: 'Menyiapkan Tagihan...',
        text: 'Bentar bree, lagi nyiapin pembayaran.',
        allowOutsideClick: false,
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
          metode_bayar: metodeBayar,
          customer_whatsapp: customerWhatsapp,
          customer_email: customerEmail
        })
      });

      const dataSistem = await responBeli.json();

      if (!responBeli.ok) {
        Swal.fire({
          ...alertBase,
          title: 'Gagal bre',
          text: dataSistem.pesan || dataSistem.error || 'Gagal bikin tagihan.',
          icon: 'error'
        });
        return;
      }

      Swal.close();
      sessionStorage.setItem('dataTagihan', JSON.stringify(dataSistem));
      router.push('/pembayaran');
    };

    setIsProsesBeli(true);

    try {
      Swal.fire({
        ...alertBase,
        title: 'Ngecek Username...',
        text: 'Bentar bree, lagi cek data akun.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

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

      const statusCek =
        dataCek.status ||
        (dataCek.sukses
          ? 'FOUND'
          : dataCek.boleh_checkout
            ? 'UNAVAILABLE'
            : 'INVALID');

      if (statusCek === 'FOUND') {
        const username = dataCek.username || dataCek.nickname || '-';

        const yakin = await Swal.fire({
          ...alertBase,
          title: 'Konfirmasi Pesanan!!',
          html: `
            <div style="text-align:left; line-height:1.7">
              <b>Username:</b> ${username}<br/>
              <b>Produk:</b> ${produkDipilih.nama_produk}<br/>
              <b>ID:</b> ${inputUserId}<br/>
              <b>Server/Zone:</b> ${inputZoneId || '-'}<br/>
              <b>Metode:</b> ${namaMetodeBayar[metodeBayar] || metodeBayar}
              <br/><br/>
              <span style="color:#94a3b8">Kalau datanya sudah benar, lanjut bikin tagihan?</span>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'OK, Lanjut Bayar',
          cancelButtonText: 'Batal dulu',
          confirmButtonColor: '#06b6d4',
          cancelButtonColor: '#374151'
        });

        if (!yakin.isConfirmed) return;

        await bikinTagihan();
        return;
      }

      if (statusCek === 'UNAVAILABLE') {
        const lanjutManual = await Swal.fire({
          ...alertBase,
          title: 'Cek Username Belum Tersedia',
          html: `
            <div style="text-align:left; line-height:1.7">
              <p style="margin:0 0 10px">
                ${dataCek.message || dataCek.pesan || 'Server cek username lagi sibuk.'}
              </p>
              <b>Pastikan ID, Zone, atau Server sudah benar sebelum lanjut.</b>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Lanjut top up manual',
          cancelButtonText: 'Batal dulu',
          confirmButtonColor: '#06b6d4',
          cancelButtonColor: '#374151'
        });

        if (!lanjutManual.isConfirmed) return;

        await bikinTagihan();
        return;
      }

      Swal.fire({
        ...alertBase,
        icon: 'error',
        title: 'ID Tidak Valid',
        text: dataCek.message || dataCek.pesan || 'ID / UID tidak valid atau tidak ditemukan.'
      });
    } catch (error) {
      console.error('HANDLE BELI ERROR:', error);

      const lanjutManual = await Swal.fire({
        background: '#1f2937',
        color: '#fff',
        icon: 'warning',
        title: 'Server cek username lagi sibuk',
        text: 'Mau lanjut top up manual?',
        showCancelButton: true,
        confirmButtonText: 'Lanjut top up manual',
        cancelButtonText: 'Batal dulu',
        confirmButtonColor: '#06b6d4',
        cancelButtonColor: '#374151'
      });

      if (!lanjutManual.isConfirmed) return;

      await bikinTagihan();
    } finally {
      setIsProsesBeli(false);
    }
  };

  return (
    <div className="mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start pb-40 xl:pb-0">
      <div className="space-y-6">
        {/* 1. PILIH NOMINAL */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
              1
            </div>
            <h2 className="text-xl font-bold text-white">Pilih Nominal</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            {dataGame.produk.map((item) => (
              <div
                key={item.id}
                onClick={() => setProdukDipilih(item)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-28 ${
                  produkDipilih?.id === item.id
                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-gray-900 border-gray-700 hover:border-blue-400'
                }`}
              >
                <p className="text-white font-black text-base leading-tight">
                  {item.nama_produk}
                </p>
                <p className="text-sm font-bold text-cyan-400">
                  Rp {item.harga.toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. INPUT USER ID */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
                2
              </div>
              <h2 className="text-xl font-bold text-white">Masukkan User ID</h2>
            </div>

          <button
  type="button"
  onClick={handleBukaPanduan}
  className="h-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 text-cyan-300 font-black transition-all hover:bg-cyan-500/20 hover:border-cyan-400 flex items-center gap-2"
  title="Lihat cara isi ID"
>
  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white text-xs">
    ?
  </span>
  <span className="hidden sm:inline text-xs">
    Cara isi ID
  </span>
</button> 
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Ketikan User ID Lu..."
              value={inputUserId}
              onChange={(e) => setInputUserId(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
            />

            {butuhZoneId && (
              <input
                type="text"
                placeholder="Zone ID"
                value={inputZoneId}
                onChange={(e) => setInputZoneId(e.target.value)}
                className="w-full sm:w-32 bg-gray-900 text-white px-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all text-center font-bold"
              />
            )}

            {butuhServer && (
              <select
                value={inputZoneId}
                onChange={(e) => setInputZoneId(e.target.value)}
                className="w-full sm:w-44 bg-gray-900 text-white px-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all font-bold appearance-none cursor-pointer"
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
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
      3
    </div>
    <div>
      <h2 className="text-xl font-bold text-white">Pilih Pembayaran</h2>
    </div>
  </div>

  <div className="space-y-5">
    {daftarMetodeBayar.map((grup) => (
      <div key={grup.grup}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gray-700" />
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
            {grup.grup}
          </p>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {grup.items.map((item) => {
            const aktif = metodeBayar === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMetodeBayar(item.value)}
                className={`p-4 rounded-2xl border-2 cursor-pointer text-left transition-all ${
                  aktif
                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-gray-900 border-gray-700 hover:border-blue-400'
                }`}
              >
                <div className="flex items-start gap-3">
          <div
  className={`w-14 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${
    aktif
      ? 'bg-white border-blue-400'
      : 'bg-white border-gray-700'
  }`}
>
  {item.logo ? (
    <img
      src={item.logo}
      alt={item.label}
      className="max-w-[42px] max-h-7 object-contain"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling.style.display = 'block';
      }}
    />
  ) : null}

  <span
    className="hidden text-[10px] font-black text-gray-900"
  >
    {item.fallback}
  </span>
</div>

                  <div className="min-w-0">
                    <p className="font-black text-white text-sm">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>

  {metodeBayar && (
    <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
      <p className="text-xs text-cyan-200">
        Metode dipilih:{' '}
        <span className="font-black text-white">
          {namaMetodeBayar[metodeBayar]}
        </span>
      </p>
    </div>
  )}
</div> 

        {/* 4. KONTAK PEMBELI */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
              4
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Kontak Pembeli</h2>
              <p className="text-xs text-gray-500 mt-1">Opsional, buat bantuan kalau order perlu dicek.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="WhatsApp, contoh: 62812xxxx"
              value={customerWhatsapp}
              onChange={(e) => setCustomerWhatsapp(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
            />

            <input
              type="email"
              placeholder="Email opsional"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
            />
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Kontak dipakai kalau order butuh pengecekan admin. Bukan buat spam.
          </p>
        </div>

        {/* CHECKBOX USER */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={setujuAturan}
              onChange={(e) => setSetujuAturan(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500"
            />
            <span className="text-xs text-yellow-100/90 leading-relaxed">
              Saya sudah memastikan User ID, Zone ID, dan Server benar. Saya paham kesalahan input bisa menyebabkan top-up gagal atau masuk ke akun lain.
            </span>
          </label>
        </div>
      </div>

      {/* RINGKASAN PESANAN STICKY */}
      <aside className="hidden xl:block xl:sticky xl:top-24 bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-cyan-500/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-wider">
                Checkout
              </p>
              <h2 className="text-xl font-black text-white">
                Ringkasan Pesanan
              </h2>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
              🧾
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">
              Game
            </p>
            <p className="text-white font-black">
              {dataGame.nama}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dataGame.publisher || 'NaXaShop'}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
              <span className="text-gray-400">Produk</span>
              <span className="text-white font-bold text-right">
                {produkDipilih?.nama_produk || 'Belum pilih'}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
              <span className="text-gray-400">User ID</span>
              <span className="text-white font-bold text-right break-all">
                {inputUserId || '-'}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
              <span className="text-gray-400">
                {butuhServer ? 'Server' : 'Zone'}
              </span>
              <span className="text-white font-bold text-right">
                {inputZoneId || '-'}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
              <span className="text-gray-400">Pembayaran</span>
              <span className="text-white font-bold text-right">
                {namaMetodeBayar[metodeBayar] || '-'}
              </span>
            </div>

            {(customerWhatsapp || customerEmail) && (
              <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
                <span className="text-gray-400">Kontak</span>
                <span className="text-white font-bold text-right break-all">
                  {customerWhatsapp || customerEmail}
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-950 border border-gray-700 rounded-2xl p-4">
            <div className="flex justify-between items-end gap-4">
              <div>
                <p className="text-xs text-gray-500 font-black uppercase tracking-wider">
                  Total
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Belum termasuk perubahan dari payment gateway jika ada.
                </p>
              </div>

              <p className="text-2xl font-black text-green-400 text-right">
                {produkDipilih ? formatRupiah(produkDipilih.harga) : 'Rp 0'}
              </p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-xs text-yellow-100/90 leading-relaxed">
              Pastikan User ID, Zone ID, atau Server sudah benar sebelum lanjut bayar.
              Kesalahan input bisa menyebabkan top-up gagal atau masuk ke akun lain.
            </p>
          </div>

          <button
            disabled={checkoutDisabled}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 ${
              checkoutDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1'
            }`}
            onClick={handleBeli}
          >
            {isProsesBeli ? 'Kalem Bre...' : 'Beli Sekarang 🔥'}
          </button>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3">
              <p className="text-lg">🔒</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Aman</p>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3">
              <p className="text-lg">⚡</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Cepat</p>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3">
              <p className="text-lg">🧾</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Resi</p>
            </div>
          </div>
        </div>
      </aside>

      {/* FLOATING CHECKOUT BAR UNTUK HP/TABLET */}
      {produkDipilih && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur-xl xl:hidden pb-6">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-gray-400">
                {produkDipilih.nama_produk}
              </p>
              <p className="text-lg font-black text-green-400">
                {formatRupiah(produkDipilih.harga)}
              </p>
              <p className={`text-[10px] font-black ${checkoutDisabled ? 'text-yellow-400' : 'text-cyan-400'}`}>
                {checkoutDisabled ? 'Lengkapi data dulu' : 'Siap checkout'}
              </p>
            </div>

            <button
              disabled={checkoutDisabled}
              onClick={handleBeli}
              className={`shrink-0 rounded-2xl px-5 py-3 text-sm font-black transition-all ${
                checkoutDisabled
                  ? 'bg-gray-700 text-gray-500'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]'
              }`}
            >
              {isProsesBeli ? '...' : 'Beli 🔥'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}