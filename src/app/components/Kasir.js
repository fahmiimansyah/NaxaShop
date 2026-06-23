'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function FormKasir({ dataGame }) {
  const router = useRouter();

  const [produkDipilih, setProdukDipilih] = useState(null);
  const [inputUserId, setInputUserId] = useState('');
  const [inputZoneId, setInputZoneId] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('');
  const [isProsesBeli, setIsProsesBeli] = useState(false);
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherAktif, setVoucherAktif] = useState(null);
  const [isCekVoucher, setIsCekVoucher] = useState(false);

  const butuhZoneId = Number(dataGame.zone_id) === 1;
  const butuhServer = dataGame.server_game && dataGame.server_game.trim() !== '';
  const gameComingSoon = dataGame.status_game === 'coming_soon';
  const gameGangguan = dataGame.status_game === 'gangguan';
  const gameTerkunci = gameComingSoon || gameGangguan;

  const isProdukComingSoon = (produk) => produk?.status_produk === 'coming_soon';
  const isProdukGangguan = (produk) => produk?.status_produk === 'gangguan';
  const isProdukTerkunci = (produk) =>
    isProdukComingSoon(produk) || isProdukGangguan(produk);
  const formatRupiah = (angka) => {
    return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`;
  };

  const aturanMetodeBayar = {
    qris: {
      biaya: 0,
      minimal: 0,
      rekomendasi: true,
    },
    gopay: {
      biaya: 0,
      minimal: 0,
    },
    shopeepay: {
      biaya: 0,
      minimal: 0,
      comingSoon: true,
    },
    dana: {
      biaya: 0,
      minimal: 0,
      comingSoon: true,
    },
    seabank: {
      biaya: 0,
      minimal: 0,
      comingSoon: true,
    },

    bca_va: {
      biaya: 4000,
      minimal: 20000,
      comingSoon: true,
    },
    bni_va: {
      biaya: 4000,
      minimal: 20000,
    },
    bri_va: {
      biaya: 4000,
      minimal: 20000,
    },
    cimb_va: {
      biaya: 4000,
      minimal: 20000,
    },
    permata_va: {
      biaya: 4000,
      minimal: 20000,
    },
    mandiri_bill: {
      biaya: 4000,
      minimal: 20000,
    },

    alfamart: {
      biaya: 5000,
      minimal: 50000,
      comingSoon: true,
    },
    indomaret: {
      biaya: 5000,
      minimal: 50000,
      comingSoon: true,
    },
  };

  const getValueMetode = (metode) => {
    return typeof metode === 'string' ? metode : metode?.value;
  };

  const getAturanMetode = (metode) => {
    return aturanMetodeBayar[getValueMetode(metode)] || {
      biaya: 0,
      minimal: 0,
    };
  };

  const getBiayaAdmin = (metode) => Number(getAturanMetode(metode).biaya || 0);

  const getMinimalMetode = (metode) => Number(getAturanMetode(metode).minimal || 0);

  const isMetodeComingSoon = (metode) => {
    return Boolean(metode?.comingSoon || getAturanMetode(metode).comingSoon);
  };

  const isMetodeTidakMemenuhiMinimal = (metode, produk = produkDipilih) => {
    if (!metode || !produk) return false;

    const minimal = getMinimalMetode(metode);
    const hargaProduk = Number(produk?.harga || 0);

    return minimal > 0 && hargaProduk < minimal;
  };

  const isMetodeBayarDisabled = (metode, produk = produkDipilih) => {
    return (
      isMetodeComingSoon(metode) ||
      isMetodeTidakMemenuhiMinimal(metode, produk)
    );
  };

  const getDiskonVoucher = (produk = produkDipilih) => {
    if (!produk || !voucherAktif) return 0;
    return Number(voucherAktif.diskon || 0);
  };

  const getTotalBayar = (produk = produkDipilih, metode = metodeBayar) => {
    const subtotal = Number(produk?.harga || 0) + getBiayaAdmin(metode);
    const diskon = getDiskonVoucher(produk);
    return Math.max(0, subtotal - diskon);
  };

  const getLabelBiayaAdmin = (metode, produk = produkDipilih) => {
    const aturan = getAturanMetode(metode);
    const biaya = Number(aturan.biaya || 0);
    const minimal = Number(aturan.minimal || 0);

    if (!metode) return 'Pilih metode pembayaran dulu';

    if (aturan.comingSoon) {
      return 'Segera hadir';
    }

    if (minimal > 0 && Number(produk?.harga || 0) < minimal) {
      return `Minimal transaksi ${formatRupiah(minimal)}`;
    }

    if (biaya <= 0) return 'Tanpa biaya admin';

    return `Fee admin ${formatRupiah(biaya)}`;
  };

  const hitungDiskon = (hargaCoret, hargaJual) => {
    const coret = Number(hargaCoret || 0);
    const jual = Number(hargaJual || 0);

    if (!coret || !jual || coret <= jual) return null;

    return Math.round(((coret - jual) / coret) * 100);
  };

  const daftarMetodeBayar = [
    {
      grup: 'QR & E-Wallet',
      items: [
        { value: 'qris', label: 'QRIS', desc: 'GoPay, OVO, DANA lewat scan QR', logo: '/payment/qris.png', fallback: 'QR' },
        { value: 'gopay', label: 'GoPay', desc: 'QR / deeplink GoPay', logo: '/payment/gopay.png', fallback: 'GP' },
        { value: 'shopeepay', label: 'ShopeePay', desc: 'Lagi aktivasi, segera hadir', logo: '/payment/shopeepay.png', fallback: 'SP', comingSoon: true },
        { value: 'dana', label: 'DANA', desc: 'Lagi disiapkan buat launch berikutnya', logo: '/payment/dana.png', fallback: 'DNA', comingSoon: true }
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
        { value: 'mandiri_bill', label: 'Mandiri Bill', desc: 'Mandiri Bill Payment', logo: '/payment/mandiri.png', fallback: 'MDR' },
        { value: 'seabank', label: 'SeaBank', desc: 'Lagi aktivasi, segera hadir', logo: '/payment/seabank.png', fallback: 'SEA', comingSoon: true }
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
    gameTerkunci ||
    isProdukTerkunci(produkDipilih) ||
    !inputUserId.trim() ||
    (butuhZoneId && !inputZoneId.trim()) ||
    (butuhServer && !inputZoneId.trim()) ||
    !metodeBayar ||
    isMetodeBayarDisabled(metodeBayar) ||
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

    return {
      title: 'Panduan isi data akun',
      badge: gameSupportAutoCheck ? 'Auto Check Nickname' : 'Verifikasi Manual',
      type: gameSupportAutoCheck ? 'auto' : 'manual',
      items: [
        'Masukkan User ID sesuai yang muncul di dalam game.',
        'Jika game membutuhkan server atau zone, pastikan pilih dengan benar.',
        'Kesalahan input bisa menyebabkan top-up gagal atau masuk ke akun lain.'
      ],
      contoh: 'UID 800xxxxxxx'
    };
  };

  const panduanGame = getPanduanGame();

  const handleBukaPanduan = () => {
    const isAuto = panduanGame.type === 'auto';

    const warnaBadge = isAuto
      ? 'background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.25);'
      : 'background:rgba(234,179,8,0.12); color:#fde047; border:1px solid rgba(234,179,8,0.25);';

    const warnaNomor = isAuto ? 'background:#22c55e;' : 'background:#eab308;';
    const titleAman = escapeHtml(panduanGame.title);
    const badgeAman = escapeHtml(panduanGame.badge);
    const contohAman = escapeHtml(panduanGame.contoh);
    Swal.fire({
      title: titleAman,
      width: 620,
      background: '#111827',
      color: '#fff',
      confirmButtonText: 'Paham, lanjut isi ID',
      confirmButtonColor: '#3b82f6',
      html: `
        <div style="text-align:left;">
          <div style="display:flex; justify-content:center; margin-bottom:14px;">
            <span style="${warnaBadge} display:inline-block; padding:6px 12px; border-radius:999px; font-size:11px; font-weight:900;">
              ${badgeAman}
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
                      ${escapeHtml(item)}
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
              ${contohAman}
            </code>
          </div>

          <p style="margin:14px 0 0; color:#94a3b8; font-size:12px; line-height:1.6; text-align:center;">
            Pastikan data sesuai akun game sebelum lanjut checkout.
          </p>
        </div>
      `
    });
  };

  const resetVoucher = () => {
    setVoucherAktif(null);
  };

  const handleHapusVoucher = () => {
    setVoucherAktif(null);
    setVoucherInput('');
  };

  const handleCekVoucher = async () => {
    if (!produkDipilih) {
      Swal.fire({
        background: '#1f2937',
        color: '#fff',
        title: 'Pilih produk dulu ya',
        text: 'Voucher baru bisa dicek setelah nominal dipilih.',
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const kode = voucherInput.trim().toUpperCase().replace(/\s+/g, '');

    if (!kode) {
      Swal.fire({
        background: '#1f2937',
        color: '#fff',
        title: 'Kode voucher masih kosong',
        text: 'Masukkan kode voucher dulu, contoh: NAXA10.',
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    setIsCekVoucher(true);

    try {
      const respon = await fetch('/api/voucher/cek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kode_voucher: kode,
          produk_id: produkDipilih.id,
          metode_bayar: metodeBayar
        })
      });

      const hasil = await respon.json();

      if (!respon.ok || !hasil.sukses) {
        throw new Error(hasil.pesan || 'Voucher gak bisa dipakai.');
      }

      setVoucherInput(hasil.data.kode);
      setVoucherAktif(hasil.data);

      Swal.fire({
        background: '#1f2937',
        color: '#fff',
        title: 'Voucher kepasang ✅',
        text: `Diskon ${formatRupiah(hasil.data.diskon)} berhasil diterapkan.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6'
      });
    } catch (error) {
      setVoucherAktif(null);

      Swal.fire({
        background: '#1f2937',
        color: '#fff',
        title: 'Voucher belum bisa dipakai',
        text: error.message || 'Voucher belum bisa dipakai.',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsCekVoucher(false);
    }
  };
  
  const handleBeli = async () => {
    const alertBase = {
      background: '#1f2937',
      color: '#fff'
    };

    const tampilWarning = (text, title = 'Sebentar ya') => {
      Swal.fire({
        ...alertBase,
        title,
        text,
        icon: 'warning',
        confirmButtonColor: '#3b82f6'
      });
    };

    const userIdBersih = inputUserId.trim();
    const zoneIdBersih = inputZoneId.trim();
    const whatsappBersih = customerWhatsapp.trim();
    const emailBersih = customerEmail.trim();

    if (!produkDipilih) {
      tampilWarning('Pilih nominal dulu ya.');
      return;
    }

    if (gameComingSoon) {
      tampilWarning('Game ini masih segera hadir. Checkout belum dibuka dulu ya.', 'Segera Hadir');
      return;
    }

    if (gameGangguan) {
      tampilWarning('Server sedang bermasalah. Checkout dikunci dulu sampai server kembali aman.', 'Server Bermasalah');
      return;
    }

    if (isProdukComingSoon(produkDipilih)) {
      tampilWarning('Produk ini masih segera hadir. Belum bisa dibeli dulu ya.', 'Segera Hadir');
      return;
    }

    if (isProdukGangguan(produkDipilih)) {
      tampilWarning('Produk ini sedang gangguan. Coba produk lain dulu atau cek lagi nanti ya.', 'Server Bermasalah');
      return;
    }

    if (!userIdBersih) {
      tampilWarning('User ID / UID belum diisi.');
      return;
    }

    if (butuhZoneId && !zoneIdBersih) {
      tampilWarning('Zone ID belum diisi.');
      return;
    }

    if (butuhServer && !zoneIdBersih) {
      tampilWarning('Pilih server akun dulu ya.');
      return;
    }

    if (!metodeBayar) {
      tampilWarning('Pilih metode pembayaran dulu ya.', 'Metode belum dipilih');
      return;
    }

    if (isMetodeComingSoon(metodeBayar)) {
      tampilWarning('Metode pembayaran ini masih segera hadir. Pakai metode lain dulu ya.', 'Segera Hadir');
      return;
    }

    if (isMetodeTidakMemenuhiMinimal(metodeBayar)) {
      tampilWarning(
        `Metode ini minimal transaksi ${formatRupiah(getMinimalMetode(metodeBayar))}. Pakai QRIS untuk nominal kecil ya.`,
        'Minimal transaksi belum cukup'
      );
      return;
    }

    if (voucherInput.trim() && !voucherAktif) {
      tampilWarning('Kode voucher sudah diketik, tapi belum diterapkan. Klik Pakai dulu ya.', 'Voucher belum diterapkan');
      return;
    }

    const bikinTagihan = async () => {
      Swal.fire({
        ...alertBase,
        title: 'Menyiapkan Tagihan...',
        text: 'Sebentar, sistem lagi menyiapkan pembayaran.',
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
          id_player: userIdBersih,
          zone_player: zoneIdBersih,
          metode_bayar: metodeBayar,
          customer_whatsapp: whatsappBersih,
          customer_email: emailBersih,
          kode_voucher: voucherAktif?.kode || ''
        })
      });

      const dataSistem = await responBeli.json();

      if (!responBeli.ok) {
        Swal.fire({
          ...alertBase,
          title: 'Tagihan belum berhasil dibuat',
          text: dataSistem.pesan || dataSistem.error || 'Gagal bikin tagihan.',
          icon: 'error'
        });
        return;
      }

      Swal.close();

const dataTagihanFinal = {
  ...dataSistem,
  status_bayar: dataSistem.status_bayar || 'pending',
  status_topup: dataSistem.status_topup || 'pending',
  created_at: dataSistem.created_at || new Date().toISOString(),
};

const orderIdTagihan = dataTagihanFinal?.order_id;
const keyTagihan = orderIdTagihan
  ? `dataTagihan:${orderIdTagihan}`
  : 'dataTagihan';

sessionStorage.setItem('dataTagihan', JSON.stringify(dataTagihanFinal));
localStorage.setItem('dataTagihan', JSON.stringify(dataTagihanFinal));

if (orderIdTagihan) {
  sessionStorage.setItem(keyTagihan, JSON.stringify(dataTagihanFinal));
  localStorage.setItem(keyTagihan, JSON.stringify(dataTagihanFinal));

  router.push(`/pembayaran?order_id=${encodeURIComponent(orderIdTagihan)}`);
} else {
  router.push('/pembayaran');
}
    };

    setIsProsesBeli(true);

    try {
      Swal.fire({
        ...alertBase,
        title: 'Sebentar, cek akun kamu dulu',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const responCek = await fetch('/api/cekId', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_player: userIdBersih,
          server_player: zoneIdBersih,
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

        const usernameAman = escapeHtml(username);
        const produkAman = escapeHtml(produkDipilih?.nama_produk || '-');
        const userIdAman = escapeHtml(userIdBersih || '-');
        const zoneAman = escapeHtml(zoneIdBersih || '-');
        const metodeAman = escapeHtml(namaMetodeBayar[metodeBayar] || metodeBayar || '-');
        const biayaAdminAman = escapeHtml(getLabelBiayaAdmin(metodeBayar));
        const voucherKodeAman = voucherAktif ? escapeHtml(voucherAktif.kode) : '';

        const yakin = await Swal.fire({
          ...alertBase,
          title: 'Konfirmasi Pesanan',
          html: `
            <div style="text-align:left; line-height:1.7">
              <b>Username:</b> ${usernameAman}<br/>
              <b>Produk:</b> ${produkAman}<br/>
              <b>ID:</b> ${userIdAman}<br/>
              <b>Server/Zone:</b> ${zoneAman}<br/>
              <b>Metode:</b> ${metodeAman}<br/>
              ${
                voucherAktif
                  ? `<b>Voucher:</b> ${voucherKodeAman} (-${formatRupiah(voucherAktif.diskon)})<br/>`
                  : ''
              }
              <b>Total:</b> ${formatRupiah(getTotalBayar())}<br/>
              <span style="color:#94a3b8; font-size:12px">
                ${biayaAdminAman}
              </span>
              <br/><br/>
              <span style="color:#94a3b8">Kalau datanya sudah benar, lanjut bikin tagihan?</span>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'OK, Lanjut Bayar',
          cancelButtonText: 'Batal dulu',
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#374151'
        });

        if (!yakin.isConfirmed) return;

        await bikinTagihan();
        return;
      }

      if (statusCek === 'UNAVAILABLE') {
        const pesanCekAman = escapeHtml(
          dataCek.message || dataCek.pesan || 'Server cek username lagi sibuk.'
        );

        const lanjutManual = await Swal.fire({
          ...alertBase,
          title: 'Cek Username Belum Tersedia',
          html: `
            <div style="text-align:left; line-height:1.7">
              <p style="margin:0 0 10px">
                ${pesanCekAman}
              </p>
              <b>Pastikan ID, Zone, atau Server sudah benar sebelum lanjut.</b>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Lanjut top up manual',
          cancelButtonText: 'Batal dulu',
          confirmButtonColor: '#3b82f6',
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
        title: 'Cek username lagi padat',
        text: 'Mau lanjut checkout tanpa cek username otomatis?',
        showCancelButton: true,
        confirmButtonText: 'Lanjut top up manual',
        cancelButtonText: 'Batal dulu',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#374151'
      });

      if (!lanjutManual.isConfirmed) return;

      await bikinTagihan();
    } finally {
      setIsProsesBeli(false);
    }
  };

  return (
    <div className={`mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start ${produkDipilih ? 'pb-44 xl:pb-0' : 'pb-4 xl:pb-0'}`}>
      <div className="space-y-6">
        {/* 1. PILIH NOMINAL */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
              1
            </div>
            <h2 className="text-xl font-bold text-white">Pilih Nominal</h2>
          </div>

          {gameComingSoon && (
            <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="text-sm font-black text-yellow-300">🕒 Game ini Coming Soon</p>
              <p className="mt-1 text-xs leading-relaxed text-yellow-100/80">
                Etalase produk sedang disiapkan. Checkout belum dibuka dulu sampai produk siap diproses dengan aman.
              </p>
            </div>
          )}

          {gameGangguan && (
            <div className="mb-4 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-4">
              <p className="text-sm font-black text-slate-200">🛠️ Server sedang bermasalah</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Produk tetap ditampilkan, tapi checkout dikunci dulu sampai server kembali stabil.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
            {(dataGame.produk || []).map((item) => {
              const produkComingSoon = isProdukComingSoon(item) || gameComingSoon;
              const produkGangguan = isProdukGangguan(item) || gameGangguan;
              const produkTerkunci = produkComingSoon || produkGangguan;
              const produkAktif = produkDipilih?.id === item.id;

              return (
              <div
                key={item.id}
                onClick={() => {
                  if (produkTerkunci) {
                    Swal.fire({
                      background: '#1f2937',
                      color: '#fff',
                      title: produkGangguan ? 'Server Bermasalah 🛠️' : 'Coming Soon 🕒',
                      text: produkGangguan
                        ? 'Produk ini sedang gangguan. Coba produk lain dulu atau cek lagi nanti ya.'
                        : gameComingSoon
                          ? 'Game ini belum dibuka untuk checkout.'
                          : 'Produk ini belum bisa dibeli dulu ya.',
                      icon: 'info',
                      confirmButtonColor: '#3b82f6'
                    });
                    return;
                  }

                  setProdukDipilih(item);
                  resetVoucher();

                  if (metodeBayar && isMetodeBayarDisabled(metodeBayar, item)) {
                    setMetodeBayar('');
                  }
                }}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 flex flex-col h-full ${
                  produkTerkunci
                    ? produkGangguan
                      ? 'cursor-not-allowed bg-slate-950/80 border-slate-500/20 opacity-75 grayscale-[30%]'
                      : 'cursor-not-allowed bg-gray-950/80 border-yellow-500/20 opacity-75'
                    : produkAktif
                      ? 'cursor-pointer bg-gray-900 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] -translate-y-1'
                      : 'cursor-pointer bg-gray-900 border-gray-700 hover:border-blue-400 hover:-translate-y-1'
                }`}
              >
                {produkTerkunci && (
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-black ${
                        produkGangguan
                          ? 'border-slate-500/20 bg-slate-500/10 text-slate-300'
                          : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                      }`}
                    >
                      {produkGangguan ? 'Server Bermasalah' : 'Coming Soon'}
                    </span>
                  </div>
                )}

                <div className={`p-5 flex-1 flex flex-col items-center justify-center text-center gap-3 transition-colors ${
                  produkAktif ? 'bg-blue-600/10' : ''
                }`}>
                  <p
                    className={`font-black text-sm sm:text-base leading-snug ${
                      produkGangguan ? 'text-slate-400' : produkAktif ? 'text-blue-300' : 'text-white'
                    }`}
                  >
                    {item.nama_produk}
                  </p>

                  {item.gambar_produk && (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mt-1">
                      <img
                        src={item.gambar_produk}
                        alt={item.nama_produk}
                        className={`max-w-full max-h-full object-contain drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-110 ${
                          produkGangguan ? 'grayscale opacity-50' : ''
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className={`p-4 w-full text-center flex flex-col justify-center transition-colors ${
                  produkAktif 
                    ? 'bg-blue-950/40' 
                    : 'bg-black/20'
                }`}>
                  {Number(item.harga_coret || 0) > Number(item.harga || 0) && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <p className="text-[10px] font-bold text-gray-500">Dari</p>
                      <p className="text-[11px] sm:text-xs font-bold text-gray-500 line-through">
                        {formatRupiah(item.harga_coret)}
                      </p>
                      {hitungDiskon(item.harga_coret, item.harga) && (
                        <span className="rounded-md border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-black text-green-400">
                          -{hitungDiskon(item.harga_coret, item.harga)}%
                        </span>
                      )}
                    </div>
                  )}
                  <p className={`text-sm sm:text-base font-black ${
                    produkAktif ? 'text-blue-400' : 'text-gray-100'
                  }`}>
                    {formatRupiah(item.harga)}
                  </p>
                </div>
              </div>
              
              );
            })}
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
              className="h-10 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 text-blue-300 font-black transition-all hover:bg-blue-500/20 hover:border-blue-400 flex items-center gap-2"
              title="Lihat cara isi ID"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
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
              placeholder="Masukkan User ID / UID"
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
              <p className="mt-1 text-xs text-gray-500">
                Fee admin akan masuk ke total checkout.
              </p>
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
                    const biayaAdmin = getBiayaAdmin(item.value);
                    const minimalMetode = getMinimalMetode(item.value);
                    const metodeComingSoon = isMetodeComingSoon(item);
                    const kurangMinimal = isMetodeTidakMemenuhiMinimal(item.value);
                    const metodeDisabled = isMetodeBayarDisabled(item);

                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={metodeDisabled}
                        onClick={() => {
                          if (metodeComingSoon) {
                            Swal.fire({
                              background: '#1f2937',
                              color: '#fff',
                              title: `${item.label} Coming Soon 🕒`,
                              text: 'Metode pembayaran ini sedang aktivasi. Pakai metode lain dulu ya.',
                              icon: 'info',
                              confirmButtonColor: '#3b82f6'
                            });
                            return;
                          }

                          if (kurangMinimal) {
                            Swal.fire({
                              background: '#1f2937',
                              color: '#fff',
                              title: 'Minimal transaksi belum cukup',
                              text: `${item.label} minimal ${formatRupiah(minimalMetode)}. Pakai QRIS untuk nominal kecil ya.`,
                              icon: 'warning',
                              confirmButtonColor: '#3b82f6'
                            });
                            return;
                          }

                          setMetodeBayar(item.value);
                          if (voucherAktif) resetVoucher();
                        }}
                        className={`relative overflow-hidden p-4 rounded-2xl border-2 text-left transition-all ${
                          metodeDisabled
                            ? 'cursor-not-allowed bg-gray-950/80 border-yellow-500/20 opacity-70 grayscale-[25%]'
                            : aktif
                              ? 'cursor-pointer bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                              : 'cursor-pointer bg-gray-900 border-gray-700 hover:border-blue-400 hover:-translate-y-0.5'
                        }`}
                      >
                        {(metodeComingSoon || kurangMinimal) && (
                          <span className="absolute right-2 top-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-black text-yellow-300">
                            {metodeComingSoon ? 'Coming Soon' : `Min ${formatRupiah(minimalMetode)}`}
                          </span>
                        )}
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

                            <span className="hidden text-[10px] font-black text-gray-900">
                              {item.fallback}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-black text-white text-sm">
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                  {item.desc}
                                </p>
                              </div>

                              {aktif && (
                                <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-300">
                                  Dipilih
                                </span>
                              )}
                            </div>

                            <div className="mt-3 rounded-xl border border-gray-700 bg-gray-950/70 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-gray-500">
                                  Fee admin
                                </span>

                                <span
                                  className={`text-[11px] font-black ${
                                    metodeComingSoon || kurangMinimal
                                      ? 'text-yellow-300'
                                      : biayaAdmin > 0
                                        ? 'text-yellow-300'
                                        : 'text-green-400'
                                  }`}
                                >
                                  {metodeComingSoon
                                    ? 'Segera hadir'
                                    : kurangMinimal
                                      ? `Min ${formatRupiah(minimalMetode)}`
                                      : biayaAdmin > 0
                                        ? formatRupiah(biayaAdmin)
                                        : 'Gratis'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. KONTAK PEMBELI */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
              4
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Kontak Pembeli</h2>
              <p className="text-xs text-gray-500 mt-1">
                Opsional
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              type="email"
              placeholder="Email opsional"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
            />
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Isi kontak jika ingin bukti transaksi dan supaya order lebih mudah dicek kalau ada kendala.
          </p>
        </div>

        {/* 5. VOUCHER PROMO */}
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm">
              5
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Voucher Promo</h2>
              <p className="text-xs text-gray-500 mt-1">
                Punya Voucher? masukkin di sini ya.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="NaxXXA10"
              value={voucherInput}
              onChange={(e) => {
                setVoucherInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                setVoucherAktif(null);
              }}
              disabled={isCekVoucher || isProsesBeli}
              className="w-full bg-gray-900 text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all font-black tracking-wide disabled:opacity-60"
            />

            {voucherAktif ? (
              <button
                type="button"
                onClick={handleHapusVoucher}
                className="sm:w-40 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-black text-red-300 transition hover:bg-red-500/20"
              >
                Hapus
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCekVoucher}
                disabled={isCekVoucher || isProsesBeli || !produkDipilih}
                className="sm:w-40 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-600 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCekVoucher ? 'Cek...' : 'Pakai'}
              </button>
            )}
          </div>

          {voucherAktif ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-emerald-300">
                    🎟️ {voucherAktif.kode} berhasil dipakai
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-100/80">
                    {voucherAktif.nama || 'Voucher NaXaShop'}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/70">
                    Diskon
                  </p>
                  <p className="text-lg font-black text-emerald-300">
                    -{formatRupiah(voucherAktif.diskon)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              Voucher aktif. Lumayan, harga turun tanpa drama.
            </p>
          )}
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-xs text-yellow-100/90 leading-relaxed">
            Pastikan User ID, Zone ID, dan server sudah benar sebelum lanjut bayar. Salah input bisa bikin top up masuk ke akun lain—dan itu bukan plot twist yang kita cari.
          </p>
        </div>
      </div>

      {/* RINGKASAN PESANAN STICKY */}
      <aside className="hidden xl:block xl:sticky xl:top-24 bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-blue-500/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-wider">
                Checkout
              </p>
              <h2 className="text-xl font-black text-white">
                Ringkasan Pesanan
              </h2>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">
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

            {voucherAktif && (
              <div className="flex justify-between gap-4 border-b border-dashed border-gray-700 pb-3">
                <span className="text-gray-400">Voucher</span>
                <span className="text-emerald-300 font-black text-right">
                  {voucherAktif.kode} -{formatRupiah(voucherAktif.diskon)}
                </span>
              </div>
            )}

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
                  {metodeBayar ? getLabelBiayaAdmin(metodeBayar) : 'Pilih metode pembayaran dulu'}
                </p>
              </div>

              <div className="text-right">
                {produkDipilih && metodeBayar && getBiayaAdmin(metodeBayar) > 0 && (
                  <p className="mb-1 text-[11px] font-bold text-yellow-300">
                    Admin {formatRupiah(getBiayaAdmin(metodeBayar))}
                  </p>
                )}

                {voucherAktif && (
                  <p className="mb-1 text-[11px] font-black text-emerald-300">
                    Voucher -{formatRupiah(voucherAktif.diskon)}
                  </p>
                )}

                <p className="text-2xl font-black text-green-400">
                  {produkDipilih ? formatRupiah(getTotalBayar()) : 'Rp 0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-xs text-yellow-100/90 leading-relaxed">
              Pastikan User ID, Zone ID, atau server sudah benar sebelum lanjut bayar.
            </p>
          </div>

          <button
            disabled={checkoutDisabled}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 ${
              checkoutDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-1'
            }`}
            onClick={handleBeli}
          >
            {isProsesBeli ? 'Memproses...' : 'Lanjut Bayar'}
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
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 p-3 pb-6 backdrop-blur-xl xl:hidden">
          <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-gray-900/80 p-4 shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-gray-400">
                  {produkDipilih.nama_produk}
                </p>

                <p className="mt-1 text-xl font-black text-green-400">
                  {metodeBayar
                    ? formatRupiah(getTotalBayar())
                    : formatRupiah(produkDipilih.harga)}
                </p>

                <p className={`mt-1 text-[11px] font-black ${metodeBayar ? 'text-blue-300' : 'text-yellow-300'}`}>
                  {gameGangguan || isProdukGangguan(produkDipilih)
                    ? 'Server bermasalah • checkout dikunci dulu'
                    : gameComingSoon || isProdukComingSoon(produkDipilih)
                      ? 'Coming Soon • checkout belum dibuka'
                    : metodeBayar
                      ? `${namaMetodeBayar[metodeBayar]} • ${getLabelBiayaAdmin(metodeBayar)}${voucherAktif ? ` • Voucher -${formatRupiah(voucherAktif.diskon)}` : ''}`
                      : voucherAktif
                        ? `Voucher -${formatRupiah(voucherAktif.diskon)}`
                        : 'Pilih metode pembayaran buat lihat total final'}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                  Total
                </p>
                <p className="text-xs font-black text-white">
                  {metodeBayar ? 'Final' : 'Produk'}
                </p>
              </div>
            </div>

            <button
              disabled={checkoutDisabled}
              onClick={handleBeli}
              className={`relative w-full overflow-hidden rounded-2xl px-5 py-4 text-base font-black transition-all duration-300 ${
                checkoutDisabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-[0_0_26px_rgba(59,130,246,0.45)] hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              {!checkoutDisabled && (
                <span className="pointer-events-none absolute inset-0 animate-pulse bg-white/10" />
              )}

              <span className="relative">
                {isProsesBeli
                  ? 'Memproses...'
                  : gameGangguan || isProdukGangguan(produkDipilih)
                    ? 'Server Bermasalah 🛠️'
                    : gameComingSoon || isProdukComingSoon(produkDipilih)
                      ? 'Segera Hadir 🕒'
                    : 'Lanjut Bayar'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}