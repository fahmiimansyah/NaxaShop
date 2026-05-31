export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-gray-950/95 text-white backdrop-blur-sm">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Top mini brand */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-blue-500/20" />

            <div>
              <div className="h-4 w-28 animate-shimmer rounded-full bg-gray-800" />
              <div className="mt-2 h-3 w-20 animate-shimmer rounded-full bg-gray-800/80" />
            </div>
          </div>

          <div className="hidden h-10 w-28 animate-shimmer rounded-2xl bg-gray-800 sm:block" />
        </div>

        {/* Hero skeleton */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-7">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="h-4 w-32 animate-shimmer rounded-full bg-blue-500/20" />
              <div className="mt-5 h-8 w-4/5 animate-shimmer rounded-2xl bg-gray-800 sm:h-10" />
              <div className="mt-3 h-8 w-3/5 animate-shimmer rounded-2xl bg-gray-800 sm:h-10" />

              <div className="mt-5 space-y-3">
                <div className="h-3 w-full animate-shimmer rounded-full bg-gray-800/90" />
                <div className="h-3 w-11/12 animate-shimmer rounded-full bg-gray-800/80" />
                <div className="h-3 w-8/12 animate-shimmer rounded-full bg-gray-800/70" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="h-11 w-32 animate-shimmer rounded-2xl bg-blue-500/20" />
                <div className="h-11 w-28 animate-shimmer rounded-2xl bg-gray-800" />
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="ml-auto aspect-square max-w-sm animate-shimmer rounded-[2rem] border border-white/10 bg-gray-800/80" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-white/10 bg-gray-900/70 p-4 shadow-xl shadow-black/20"
            >
              <div className="mb-4 h-32 animate-shimmer rounded-2xl bg-gray-800" />
              <div className="h-4 w-3/4 animate-shimmer rounded-full bg-gray-800" />
              <div className="mt-3 h-3 w-1/2 animate-shimmer rounded-full bg-gray-800/80" />
              <div className="mt-5 h-9 w-full animate-shimmer rounded-2xl bg-blue-500/15" />
            </div>
          ))}
        </div>

        {/* Bottom loading line */}
        <div className="mt-auto pb-4 pt-8">
          <div className="mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-naxaLine rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
          </div>

          <p className="mt-3 text-center text-xs font-bold text-gray-500">
            NaXaShop lagi nyiapin halaman...
          </p>
        </div>
      </div>
    </div>
  );
}