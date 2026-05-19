import Link from 'next/link';

export default async function SuksesPage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.order_id || '';
  const statusTopup = params?.topup || 'proses';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 p-7 md:p-10 rounded-3xl border border-gray-800 shadow-2xl text-center max-w-md w-full relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 blur-[90px] rounded-full"></div>

        <div className="relative z-10">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">
            Pembayaran Sukses! 🔥
          </h1>

          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Pesanan lu sudah kebaca sama sistem. Top-up sekarang sedang diproses.
            Simpan Order ID ini buat cek status.
          </p>

          {orderId && (
            <div className="bg-slate-950 border border-gray-800 rounded-2xl p-4 mb-5">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-1">
                Order ID
              </p>
              <p className="font-mono text-cyan-400 font-black break-all text-sm">
                {orderId}
              </p>

              <div className="mt-3 inline-flex px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-black">
                Top-up: {statusTopup}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
          <Link
            href={orderId ? `/lacak?order_id=${encodeURIComponent(orderId)}` : '/lacak'}
            className="block w-full py-4 rounded-2xl font-black text-base bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:-translate-y-1 text-center"
          >
            {orderId ? 'Lihat Struk / Cek Status 🧾' : 'Cek Pesanan 🧾'}
          </Link>

          <Link
            href="/"
            className="block w-full py-3 rounded-2xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all text-center"
          >
            Balik ke Beranda
          </Link>
        </div>

          <p className="text-[11px] text-gray-500 mt-5">
            Kalau status terlalu lama proses, hubungi admin dan kirim Order ID ini.
          </p>
        </div>
      </div>
    </div>
  );
}