export default function Loading() {
  // Kita bikin array kosong isi 10 buat nampilin 10 kotak skeleton palsu
  const skeletonArray = new Array(10).fill(0);

  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Skeleton buat Judul/Header */}
      <div className="animate-pulse mb-8 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 bg-gray-800 rounded-xl w-3/4 md:w-1/3"></div>
        <div className="h-4 bg-gray-800 rounded-md w-1/2 md:w-1/4"></div>
      </div>

      {/* Skeleton buat Grid Kartu Game */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
        {skeletonArray.map((_, index) => (
          <div 
            key={index} 
            className="animate-pulse bg-gray-900 border border-gray-800 rounded-3xl p-4 shadow-lg flex flex-col"
          >
            {/* Skeleton Gambar Game */}
            <div className="bg-gray-800 h-40 w-full rounded-2xl mb-4"></div>
            
            {/* Skeleton Judul Game */}
            <div className="bg-gray-800 h-6 w-3/4 rounded-md mb-2"></div>
            
            {/* Skeleton Kategori/Publisher */}
            <div className="bg-gray-800 h-4 w-1/2 rounded-md"></div>
          </div>
        ))}
      </div>
      
    </div>
  );
}