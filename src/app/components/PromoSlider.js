'use client';

import { useEffect, useState } from 'react';

const fallbackPromoList = [
  {
    badge: 'Promo Mingguan',
    title: 'Top Up Lebih Hemat di NaXaShop',
    desc: 'Pilih game favorit kamu, checkout cepat, dan pantau status pesanan langsung dari halaman pembayaran.',
    cta: 'Mulai Top Up',
    href: '#game-list',
    gradient: 'from-blue-600/30 via-cyan-500/20 to-slate-900',
  },
];

export default function PromoSlider() {
  const [promoList, setPromoList] = useState(fallbackPromoList);
  const [indexAktif, setIndexAktif] = useState(0);

  useEffect(() => {
    const ambilPromo = async () => {
      try {
        const respon = await fetch('/api/promo', {
          cache: 'no-store',
        });

        const hasil = await respon.json();

        if (respon.ok && hasil.sukses && Array.isArray(hasil.data) && hasil.data.length > 0) {
          setPromoList(hasil.data);
          setIndexAktif(0);
        }
      } catch (error) {
        console.error('Gagal ambil promo:', error);
      }
    };

    ambilPromo();
  }, []);

  useEffect(() => {
    if (promoList.length <= 1) return;

    const timer = setInterval(() => {
      setIndexAktif((prev) => (prev === promoList.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(timer);
  }, [promoList.length]);

  const nextPromo = () => {
    setIndexAktif((prev) => (prev === promoList.length - 1 ? 0 : prev + 1));
  };

  const prevPromo = () => {
    setIndexAktif((prev) => (prev === 0 ? promoList.length - 1 : prev - 1));
  };

  if (!promoList.length) return null;

  return (
    <section className="mx-auto mt-6 w-full max-w-7xl px-0 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(-${indexAktif * 100}%)`,
          }}
        >
          {promoList.map((promo, index) => (
            <div
              key={promo.id || index}
              className={`relative min-h-[230px] w-full shrink-0 bg-gradient-to-br ${promo.gradient} p-6 sm:min-h-[280px] sm:p-8 lg:p-10`}
            >
              <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />

              <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:34px_34px]" />
              </div>

              <div className="relative z-10 grid min-h-[190px] grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-200">
                      {promo.badge}
                    </span>
                  </div>

                  <h1 className="max-w-2xl text-2xl font-black leading-tight text-white sm:text-xl lg:text-2xl">
                    {promo.title}
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    {promo.desc}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href={promo.href || '#game-list'}
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-cyan-400"
                    >
                      {promo.cta || 'Lihat Promo'}
                    </a>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">
                      Aman • Cepat • Status jelas
                    </div>
                  </div>
                </div>

                <div className="hidden justify-end lg:flex">
                  <div className="relative h-56 w-56 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl">
                    <div className="absolute inset-4 rounded-[1.5rem] border border-cyan-400/20 bg-slate-950/80" />

                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          NaXaShop
                        </p>
                        <p className="mt-2 text-3xl font-black text-white">
                          Promo
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 w-full rounded-full bg-blue-500/30" />
                        <div className="h-3 w-4/5 rounded-full bg-cyan-400/30" />
                        <div className="h-10 w-full rounded-2xl bg-gradient-to-r from-blue-600/70 to-cyan-500/70" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {promoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPromo}
              className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur transition hover:bg-white/10 sm:flex"
              aria-label="Promo sebelumnya"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={nextPromo}
              className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur transition hover:bg-white/10 sm:flex"
              aria-label="Promo selanjutnya"
            >
              ›
            </button>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {promoList.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setIndexAktif(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    indexAktif === index
                      ? 'w-8 bg-cyan-300'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Pilih promo ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}