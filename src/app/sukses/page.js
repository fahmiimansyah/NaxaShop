import Link from 'next/link';

export default function SuksesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl text-center max-w-md w-full">
        
        {/* Ikon Centang Estetik */}
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-bounce">
          <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Pembayaran Sukses! 🔥</h1>
        
        <p className="text-gray-400 mb-8">
          Terima kasih bre! Pesanan lu lagi diproses sama sistem. Duduk manis aja, itemnya bakal masuk ke akun lu dalam hitungan detik.
        </p>

        {/* Tombol Balik ke Beranda */}
        <Link href="/lacak">
          <button className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:-translate-y-1">
            Cek Pesanan
          </button>
        </Link>

      </div>
    </div>
  );
}