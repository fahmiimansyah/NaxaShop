'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function DashboardAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

  // State Navigasi
  const [tabAktif, setTabAktif] = useState('statistik');

  // State Data
  const [stats, setStats] = useState(null);
  const [daftarProduk, setDaftarProduk] = useState([]);
  const [daftarGame, setDaftarGame] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // State Form Produk
  const [formProduk, setFormProduk] = useState({
    game_id: '',
    kode_produk: '',
    nama_produk: '',
    harga: ''
  });

  const [modeEditProduk, setModeEditProduk] = useState(false);
  const [produkEditId, setProdukEditId] = useState(null);

  // State Form Game
  const [formGame, setFormGame] = useState({
    nama: '',
    publisher: '',
    gambar: '',
    zone_id: '0',
    server_game: '',
    kode_game: ''
  });

  const [modeEditGame, setModeEditGame] = useState(false);
  const [gameEditId, setGameEditId] = useState(null);
  const [fileGambar, setFileGambar] = useState(null);
  const [previewGambar, setPreviewGambar] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingGameForm, setLoadingGameForm] = useState(false);
  const [loadingHapus, setLoadingHapus] = useState(null);
  const [loadingHapusGame, setLoadingHapusGame] = useState(null);

  const cariNamaGame = (gameId) => {
    return daftarGame.find((game) => String(game.id) === String(gameId))?.nama || `Game ID: ${gameId}`;
  };

  const resetFormGame = () => {
    setFormGame({
      nama: '',
      publisher: '',
      gambar: '',
      zone_id: '0',
      server_game: '',
      kode_game: ''
    });

    setModeEditGame(false);
    setGameEditId(null);
    setFileGambar(null);
    setPreviewGambar('');
    setFileInputKey(Date.now());
  };

  const resetFormProduk = () => {
    setFormProduk({
      game_id: daftarGame[0]?.id ? String(daftarGame[0].id) : '',
      kode_produk: '',
      nama_produk: '',
      harga: ''
    });

    setModeEditProduk(false);
    setProdukEditId(null);
  };

  // --- FUNGSI TARIK DATA ---
  const ambilDataSultan = async () => {
    setLoadingData(true);

    try {
      const [resStats, resProduk, resGames] = await Promise.all([
        fetch('/api/admin/stats').then((res) => res.json()),
        fetch('/api/admin/produk').then((res) => res.json()),
        fetch('/api/admin/games').then((res) => res.json())
      ]);

      if (resStats.sukses) setStats(resStats.data);
      if (resProduk.sukses) setDaftarProduk(resProduk.data);

      if (resGames.sukses) {
        const games = resGames.data || [];
        setDaftarGame(games);

        setFormProduk((prev) => ({
          ...prev,
          game_id:
            prev.game_id && games.some((game) => String(game.id) === String(prev.game_id))
              ? prev.game_id
              : games[0]?.id
                ? String(games[0].id)
                : ''
        }));
      }
    } catch (error) {
      console.error('Ngadat nyedot data bre:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email === EMAIL_CEO) {
      ambilDataSultan();
    }
  }, [session]);

  // --- PILIH GAMBAR ---
  const handlePilihGambar = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'FILE SALAH! ❌',
        text: 'Yang diupload harus gambar bre!',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setFileInputKey(Date.now());
      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      Swal.fire({
        title: 'GEDE BANGET! ❌',
        text: 'Ukuran gambar maksimal 2MB bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setFileInputKey(Date.now());
      return;
    }

    setFileGambar(file);
    setPreviewGambar(URL.createObjectURL(file));
  };

  // --- UPLOAD GAMBAR KALAU ADA FILE ---
  const uploadGambarKalauAda = async () => {
    if (!fileGambar) {
      return formGame.gambar;
    }

    const formData = new FormData();
    formData.append('gambar', fileGambar);

    const responUpload = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    });

    const hasilUpload = await responUpload.json();

    if (!responUpload.ok) {
      throw new Error(hasilUpload.pesan || 'Upload gambar gagal bre!');
    }

    return hasilUpload.url;
  };

  // --- FUNGSI SUBMIT GAME: TAMBAH / EDIT ---
  const handleSubmitGame = async (e) => {
    e.preventDefault();
    setLoadingGameForm(true);

    try {
      const gambarUrl = await uploadGambarKalauAda();

      if (!gambarUrl) {
        Swal.fire({
          title: 'GAMBAR KOSONG! ❌',
          text: 'Upload gambar atau isi URL/path gambar dulu bre.',
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });

        setLoadingGameForm(false);
        return;
      }

      const payload = {
        ...formGame,
        id: gameEditId,
        gambar: gambarUrl,
        zone_id: Number(formGame.zone_id)
      };

      const respon = await fetch('/api/admin/games', {
        method: modeEditGame ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: modeEditGame ? 'GAME DIUPDATE! ✨' : 'GAME MASUK! 🎮',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        resetFormGame();
        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'WADUH! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: error.message || 'Gagal proses game bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingGameForm(false);
    }
  };

  // --- MODE EDIT GAME ---
  const handleEditGame = (game) => {
    setTabAktif('game');
    setModeEditGame(true);
    setGameEditId(game.id);

    setFormGame({
      nama: game.nama || '',
      publisher: game.publisher || '',
      gambar: game.gambar || '',
      zone_id: String(game.zone_id ?? '0'),
      server_game: game.server_game || '',
      kode_game: game.kode_game || ''
    });

    setFileGambar(null);
    setPreviewGambar(game.gambar || '');
    setFileInputKey(Date.now());

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNGSI HAPUS GAME ---
  const handleHapusGame = async (game) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus game ini?',
      html: `
        <b>${game.nama}</b><br/>
        <small>Kode: ${game.kode_game}</small><br/>
        <small>Kalau masih ada produk, sistem bakal nolak.</small>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Iya, hapus!',
      cancelButtonText: 'Batal',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#374151'
    });

    if (!konfirmasi.isConfirmed) return;

    setLoadingHapusGame(game.id);

    try {
      const respon = await fetch(`/api/admin/games?id=${game.id}`, {
        method: 'DELETE'
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: 'GAME KEHAPUS! 🗑️',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'GAGAL HAPUS! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API hapus game bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingHapusGame(null);
    }
  };

  // --- FUNGSI SUBMIT PRODUK: TAMBAH / EDIT ---
  const handleSubmitProduk = async (e) => {
    e.preventDefault();
    setLoadingForm(true);

    if (!formProduk.game_id) {
      Swal.fire({
        title: 'GAME KOSONG! ❌',
        text: 'Tambah game dulu sebelum tambah produk bre.',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });

      setLoadingForm(false);
      return;
    }

    try {
      const respon = await fetch('/api/admin/produk', {
        method: modeEditProduk ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formProduk,
          id: produkEditId,
          harga: parseInt(formProduk.harga)
        })
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: modeEditProduk ? 'PRODUK DIUPDATE! ✨' : 'MASUK BRE! 🚀',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        resetFormProduk();
        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'WADUH! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API produk bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingForm(false);
    }
  };

  // --- MODE EDIT PRODUK ---
  const handleEditProduk = (item) => {
    setTabAktif('produk');
    setModeEditProduk(true);
    setProdukEditId(item.id);

    setFormProduk({
      game_id: String(item.game_id || ''),
      kode_produk: item.kode_produk || '',
      nama_produk: item.nama_produk || '',
      harga: String(item.harga || '')
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNGSI HAPUS PRODUK ---
  const handleHapusProduk = async (item) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus produk ini?',
      html: `
        <b>${item.nama_produk}</b><br/>
        <small>Kode: ${item.kode_produk}</small>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Iya, hapus!',
      cancelButtonText: 'Batal',
      background: '#1f2937',
      color: '#fff',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#374151'
    });

    if (!konfirmasi.isConfirmed) return;

    setLoadingHapus(item.id);

    try {
      const respon = await fetch(`/api/admin/produk?id=${item.id}`, {
        method: 'DELETE'
      });

      const hasil = await respon.json();

      if (respon.ok) {
        Swal.fire({
          title: 'KEHAPUS BRE! 🗑️',
          text: hasil.pesan,
          icon: 'success',
          background: '#1f2937',
          color: '#fff'
        });

        ambilDataSultan();
      } else {
        Swal.fire({
          title: 'GAGAL HAPUS! ❌',
          text: hasil.pesan,
          icon: 'error',
          background: '#1f2937',
          color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'ERROR SERVER!',
        text: 'Gagal nembak API hapus produk bre',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      });
    } finally {
      setLoadingHapus(null);
    }
  };

  // --- KEAMANAN CEO ---
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">
        Mengecek KTP Digital...
      </div>
    );
  }

  if (!session || session.user.email !== EMAIL_CEO) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center">
        <span className="text-7xl mb-4">🚷</span>
        <h1 className="text-3xl font-black text-red-500 mb-2">AKSES DITOLAK!</h1>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 mt-4 bg-gray-800 text-white font-bold rounded-xl"
        >
          Balik Beranda
        </button>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold animate-pulse">
        Menyiapkan Ruang Kerja CEO...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 font-sans text-white">
      <div className="max-w-7xl mx-auto">

        {/* HEADER & TAB MENU */}
        <div className="mb-8 border-b border-gray-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Ruang CEO NaXaShop 👑</h1>
            <p className="text-sm text-gray-400 mt-1">
              Sistem kendali utama bos{' '}
              <span className="text-blue-400 font-bold">{session.user.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap bg-gray-900 p-1 rounded-xl border border-gray-800 shadow-lg gap-1">
            <button
              onClick={() => setTabAktif('statistik')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'statistik'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Statistik
            </button>

            <button
              onClick={() => setTabAktif('game')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'game'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎮 Kelola Game
            </button>

            <button
              onClick={() => setTabAktif('produk')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tabAktif === 'produk'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📦 Kelola Produk
            </button>
          </div>
        </div>

        {/* TAB STATISTIK */}
        {tabAktif === 'statistik' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
              <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">💰</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Omset</p>
                <h3 className="text-2xl font-black text-green-400">
                  Rp {stats?.totalCuan?.toLocaleString('id-ID') || 0}
                </h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">🚀</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Topup Sukses</p>
                <h3 className="text-2xl font-black text-blue-400">{stats?.suksesTopup || 0}</h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">⏳</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Bayar</p>
                <h3 className="text-2xl font-black text-yellow-400">{stats?.pendingBayar || 0}</h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">👥</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total User</p>
                <h3 className="text-2xl font-black text-purple-400">{stats?.totalUser || 0}</h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">✅</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Verified</p>
                <h3 className="text-2xl font-black text-emerald-400">{stats?.userVerified || 0}</h3>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-3xl opacity-20">🟢</div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Login 15 Menit</p>
                <h3 className="text-2xl font-black text-lime-400">{stats?.userAktif15Menit || 0}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase">User Google</p>
                <h3 className="text-3xl font-black text-white mt-1">{stats?.userGoogle || 0}</h3>
              </div>

              <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase">User Manual</p>
                <h3 className="text-3xl font-black text-white mt-1">{stats?.userManual || 0}</h3>
              </div>

              <div className="bg-gray-900 p-5 rounded-3xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase">Login 24 Jam</p>
                <h3 className="text-3xl font-black text-white mt-1">{stats?.userAktif24Jam || 0}</h3>
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold">5 Transaksi Terakhir 🛒</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Target Player</th>
                      <th className="p-4">Nominal / Produk</th>
                      <th className="p-4">Bayar</th>
                      <th className="p-4">Top Up</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-800 text-sm">
                    {stats?.orderanTerbaru?.map((trx) => (
                      <tr key={trx.id} className="hover:bg-gray-800/40">
                        <td className="p-4 font-mono font-bold text-gray-300">{trx.order_id}</td>
                        <td className="p-4 font-bold text-white">
                          {trx.id_player}
                          <span className="text-xs text-gray-500 block">{trx.zone_player || '-'}</span>
                        </td>
                        <td className="p-4 font-bold text-gray-300">
                          Rp {trx.harga?.toLocaleString('id-ID')}
                          <span className="text-[10px] text-blue-400 block">{trx.kode_produk}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            trx.status_bayar === 'sukses'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {trx.status_bayar}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            trx.status_topup === 'sukses'
                              ? 'bg-blue-500/10 text-blue-400'
                              : trx.status_topup === 'proses'
                                ? 'bg-purple-500/10 text-purple-400'
                                : 'bg-gray-800 text-gray-500'
                          }`}>
                            {trx.status_topup}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB GAME */}
        {tabAktif === 'game' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black">
                  {modeEditGame ? '✏️ Edit Game' : '🎮 Tambah Game'}
                </h2>

                {modeEditGame && (
                  <button
                    type="button"
                    onClick={resetFormGame}
                    className="text-xs font-black text-gray-400 hover:text-white bg-gray-800 px-3 py-2 rounded-xl"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitGame} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nama Game</label>
                  <input
                    type="text"
                    required
                    placeholder="Mobile Legends"
                    value={formGame.nama}
                    onChange={(e) => setFormGame({ ...formGame, nama: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Publisher</label>
                  <input
                    type="text"
                    required
                    placeholder="Moonton"
                    value={formGame.publisher}
                    onChange={(e) => setFormGame({ ...formGame, publisher: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Upload Gambar</label>

                  <div className="bg-gray-950 border border-gray-700 rounded-2xl p-4">
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="image/*"
                      onChange={handlePilihGambar}
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-600 file:text-white file:font-bold hover:file:bg-purple-500"
                    />

                    <p className="text-[11px] text-gray-500 mt-2">
                      Format: JPG, PNG, WEBP, GIF. Maksimal 2MB.
                    </p>

                    {previewGambar && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
                        <img
                          src={previewGambar}
                          alt="Preview game"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                    Atau Path/URL Gambar
                  </label>
                  <input
                    type="text"
                    placeholder="/games/ml.webp atau https://..."
                    value={formGame.gambar}
                    onChange={(e) => {
                      setFormGame({ ...formGame, gambar: e.target.value });
                      if (!fileGambar) setPreviewGambar(e.target.value);
                    }}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kode Game APIGames</label>
                  <input
                    type="text"
                    required
                    placeholder="mobilelegend / freefire / ..."
                    value={formGame.kode_game}
                    onChange={(e) => setFormGame({ ...formGame, kode_game: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Butuh Zone / Server?</label>
                  <select
                    value={formGame.zone_id}
                    onChange={(e) => setFormGame({ ...formGame, zone_id: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="0">Tidak</option>
                    <option value="1">Ya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Server Game</label>
                  <input
                    type="text"
                    placeholder="Asia, America, Europe atau kosong"
                    value={formGame.server_game}
                    onChange={(e) => setFormGame({ ...formGame, server_game: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingGameForm}
                  className={`w-full py-4 mt-2 text-white font-black rounded-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    modeEditGame
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  }`}
                >
                  {loadingGameForm
                    ? 'Memproses...'
                    : modeEditGame
                      ? 'UPDATE GAME ✨'
                      : 'SIMPAN GAME 🎮'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl font-black">🕹️ Library Game</h2>
                  <p className="text-xs text-gray-500 mt-1">Total {daftarGame.length} game di etalase.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {daftarGame.map((game) => (
                  <div
                    key={game.id}
                    className="bg-gray-950 border border-gray-800 p-4 rounded-2xl hover:border-purple-500/50 transition-all group"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {game.gambar ? (
                          <img src={game.gambar} alt={game.nama} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🎮</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
                            ID: {game.id}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                            Number(game.zone_id) === 1
                              ? 'text-yellow-400 bg-yellow-500/10'
                              : 'text-gray-400 bg-gray-800'
                          }`}>
                            {Number(game.zone_id) === 1 ? 'BUTUH ZONE' : 'NO ZONE'}
                          </span>
                        </div>

                        <h4 className="font-black text-white truncate">{game.nama}</h4>
                        <p className="text-xs text-gray-500 truncate">{game.publisher}</p>
                        <p className="text-xs text-purple-400 font-mono mt-1 truncate">{game.kode_game}</p>
                        {game.server_game && (
                          <p className="text-[11px] text-gray-500 mt-1">Server: {game.server_game}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => handleEditGame(game)}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => handleHapusGame(game)}
                        disabled={loadingHapusGame === game.id}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black hover:bg-red-600 hover:text-white hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingHapusGame === game.id ? 'Hapus...' : '🗑️ Hapus'}
                      </button>
                    </div>
                  </div>
                ))}

                {daftarGame.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-gray-500 font-bold">
                    Belum ada game di etalase. Tambahin dulu bre!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB PRODUK */}
        {tabAktif === 'produk' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black">
                  {modeEditProduk ? '✏️ Edit Produk' : '✨ Tambah Produk'}
                </h2>

                {modeEditProduk && (
                  <button
                    type="button"
                    onClick={resetFormProduk}
                    className="text-xs font-black text-gray-400 hover:text-white bg-gray-800 px-3 py-2 rounded-xl"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitProduk} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kategori Game</label>
                  <select
                    required
                    value={formProduk.game_id}
                    onChange={(e) => setFormProduk({ ...formProduk, game_id: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500 font-bold"
                  >
                    {daftarGame.length === 0 ? (
                      <option value="">Belum ada game</option>
                    ) : (
                      daftarGame.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.nama}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kode APIGames Produk</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ML_86"
                    value={formProduk.kode_produk}
                    onChange={(e) => setFormProduk({ ...formProduk, kode_produk: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nama Tampilan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 86 Diamonds"
                    value={formProduk.nama_produk}
                    onChange={(e) => setFormProduk({ ...formProduk, nama_produk: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 25000"
                    value={formProduk.harga}
                    onChange={(e) => setFormProduk({ ...formProduk, harga: e.target.value })}
                    className="w-full bg-gray-950 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingForm || daftarGame.length === 0}
                  className={`w-full py-4 mt-2 text-white font-black rounded-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    modeEditProduk
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  {loadingForm
                    ? 'Memproses...'
                    : modeEditProduk
                      ? 'UPDATE PRODUK ✨'
                      : 'SIMPAN PRODUK 💾'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-black mb-6 border-b border-gray-800 pb-4">
                📦 Etalase Produk Aktif
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {daftarProduk.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-950 border border-gray-800 p-4 rounded-2xl hover:border-cyan-500/50 transition-all group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                          {cariNamaGame(item.game_id)}
                        </span>
                        <h4 className="font-bold text-white truncate">{item.nama_produk}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-1 truncate">{item.kode_produk}</p>
                      </div>

                      <p className="text-lg font-black text-green-400 shrink-0">
                        Rp {item.harga?.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => handleEditProduk(item)}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black hover:bg-amber-600 hover:text-white hover:border-amber-500 transition-all"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => handleHapusProduk(item)}
                        disabled={loadingHapus === item.id}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-black hover:bg-red-600 hover:text-white hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingHapus === item.id ? 'Hapus...' : '🗑️ Hapus'}
                      </button>
                    </div>
                  </div>
                ))}

                {daftarProduk.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-gray-500 font-bold">
                    Kulkas lu masih kosong bre. Tambahin produk di sebelah kiri!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}