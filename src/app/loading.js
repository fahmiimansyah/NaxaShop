export default function Loading() {
  return (
    <main className="min-h-screen overflow-hidden bg-gray-900 text-white">

      {/* CONTENT */}
      <section className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Glow tipis */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          {/* HEADER SKELETON */}
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mx-auto mb-4 h-3 w-40 animate-pulse rounded-full bg-blue-500/30" />
            <div className="mx-auto mb-3 h-9 w-11/12 animate-pulse rounded-2xl bg-gray-800 sm:h-12 sm:w-3/4" />
            <div className="mx-auto h-4 w-10/12 animate-pulse rounded-full bg-gray-800" />
            <div className="mx-auto mt-2 h-4 w-7/12 animate-pulse rounded-full bg-gray-800" />
          </div>

          {/* SEARCH SKELETON */}
          <div className="mx-auto mb-8 max-w-md">
            <div className="h-14 w-full animate-pulse rounded-2xl border border-gray-700 bg-gray-800 shadow-lg" />
          </div>

          {/* FEATURE / FORM SKELETON */}
          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <SkeletonBox />
              <SkeletonGrid />
            </div>

            <div className="hidden rounded-3xl border border-gray-700 bg-gray-800 p-5 xl:block">
              <div className="mb-5 h-6 w-40 animate-pulse rounded-xl bg-gray-700" />
              <div className="space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-gray-900" />
                <div className="h-16 animate-pulse rounded-2xl bg-gray-900" />
                <div className="h-16 animate-pulse rounded-2xl bg-gray-900" />
                <div className="h-20 animate-pulse rounded-2xl bg-gray-950" />
                <div className="h-14 animate-pulse rounded-2xl bg-blue-500/30" />
              </div>
            </div>
          </div>

          {/* GAME CARD SKELETON */}
          <div className="grid grid-cols-3 gap-5 md:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800"
              >
                <div className="aspect-square animate-pulse bg-gray-700" />

                <div className="space-y-2 p-3">
                  <div className="h-4 w-10/12 animate-pulse rounded-full bg-gray-700" />
                  <div className="h-3 w-7/12 animate-pulse rounded-full bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonBox() {
  return (
    <div className="rounded-3xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-blue-500/30" />
        <div className="h-6 w-44 animate-pulse rounded-xl bg-gray-700" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="min-h-28 animate-pulse rounded-2xl border border-gray-700 bg-gray-900"
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="rounded-3xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-blue-500/30" />
        <div className="h-6 w-52 animate-pulse rounded-xl bg-gray-700" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-14 flex-1 animate-pulse rounded-2xl bg-gray-900" />
        <div className="h-14 w-full animate-pulse rounded-2xl bg-gray-900 sm:w-40" />
      </div>
    </div>
  );
}