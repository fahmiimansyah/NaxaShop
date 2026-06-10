'use client';

import { useEffect, useRef, useState } from 'react';

const AUTO_SLIDE_DELAY = 8000;

const fallbackPromoList = [
  {
    badge: 'Promo Mingguan',
    title: 'Top Up Sat-Set di NaXaShop',
    desc: 'Pilih game favorit kamu, checkout cepat, dan pantau status pesanan langsung dari halaman pembayaran.',
    cta: 'Mulai Top Up',
    href: '#game-list',
    gradient: 'from-blue-600/30 via-cyan-500/20 to-slate-900',
    imageUrl: '',
  },
];

function normalisasiPromo(promo = {}) {
  return {
    ...promo,
    title: promo.title || promo.judul || 'Promo NaXaShop',
    badge: promo.badge || promo.label || promo.badge_label || 'Promo',
    imageUrl: promo.imageUrl || promo.image_url || '',
    desc: promo.desc || promo.description || promo.deskripsi || '',
    cta: promo.cta || promo.cta_text || promo.cta_label || 'Lihat Promo',
    href: promo.href || promo.cta_href || '#game-list',
    gradient: promo.gradient || 'from-blue-600/30 via-cyan-500/20 to-slate-900',
  };
}

export default function PromoSlider() {
  const sliderRef = useRef(null);
  const autoTimerRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [promoList, setPromoList] = useState(fallbackPromoList);
  const [indexAktif, setIndexAktif] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  function scrollKePromo(index, behavior = 'smooth', resetTimer = false) {
    const target = sliderRef.current;
    if (!target) return;

    const nextIndex = Math.max(0, Math.min(index, promoList.length - 1));

    isProgrammaticScrollRef.current = true;

    target.scrollTo({
      left: nextIndex * target.clientWidth,
      behavior,
    });

    setIndexAktif(nextIndex);

    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 450);

    if (resetTimer) {
      resetAutoSlideTimer();
    }
  }

  function resetAutoSlideTimer() {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (!mounted) return;
    if (promoList.length <= 1) return;

    autoTimerRef.current = setInterval(() => {
      setIndexAktif((prev) => {
        const next = prev === promoList.length - 1 ? 0 : prev + 1;

        scrollKePromo(next, 'smooth', false);

        return next;
      });
    }, AUTO_SLIDE_DELAY);
  }

  useEffect(() => {
    if (!mounted) return;

    const ambilPromo = async () => {
      try {
        const respon = await fetch('/api/promo', {
          cache: 'no-store',
        });

        const hasil = await respon.json();

        if (
          respon.ok &&
          hasil.sukses &&
          Array.isArray(hasil.data) &&
          hasil.data.length > 0
        ) {
          setPromoList(hasil.data.map(normalisasiPromo));
          setIndexAktif(0);
        }
      } catch (error) {
        console.error('Gagal ambil promo:', error);
      }
    };

    ambilPromo();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    resetAutoSlideTimer();

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [mounted, promoList.length]);

  function handleScroll() {
    const target = sliderRef.current;
    if (!target) return;

    const nextIndex = Math.round(
      target.scrollLeft / Math.max(target.clientWidth, 1)
    );

    setIndexAktif((prev) => {
      if (prev === nextIndex) return prev;

      if (!isProgrammaticScrollRef.current) {
        resetAutoSlideTimer();
      }

      return nextIndex;
    });
  }

  const nextPromo = () => {
    scrollKePromo(
      indexAktif === promoList.length - 1 ? 0 : indexAktif + 1,
      'smooth',
      true
    );
  };

  const prevPromo = () => {
    scrollKePromo(
      indexAktif === 0 ? promoList.length - 1 : indexAktif - 1,
      'smooth',
      true
    );
  };

  if (!mounted) {
    return (
      <section className="mx-auto w-full max-w-7xl px-0 sm:mt-6 sm:px-6 lg:px-8">
        <div className="h-[175px] rounded-[1.35rem] border border-blue-900/30 bg-[#082447]/60 sm:h-[215px] lg:h-[230px]" />
      </section>
    );
  }

  if (!promoList.length) return null;

  return (
    <section className="mx-auto mt-4 w-full max-w-7xl px-0 sm:mt-6 sm:px-6 lg:px-8">
      <style jsx global>{`
        .promo-slider-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }

        .promo-slider-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#071a33] shadow-xl shadow-blue-950/25 sm:rounded-[2rem]">
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          className="promo-slider-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {promoList.map((promo, index) => {
            const punyaGambar = Boolean(promo.imageUrl);
            const hrefPromo = promo.href || '#game-list';

            return (
              <a
                key={promo.id || index}
                href={hrefPromo}
                className={`group relative h-[180px] w-full shrink-0 snap-center overflow-hidden bg-gradient-to-br ${promo.gradient} sm:h-[215px] lg:h-[230px]`}
                aria-label={promo.title || `Promo ${index + 1}`}
              >
                {punyaGambar ? (
                  <>
                    <img
                      src={promo.imageUrl}
                      alt={promo.title || 'Promo NaXaShop'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent opacity-70" />
                  </>
                ) : (
                  <>
                    <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

                    <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:32px_32px]" />
                    </div>

                    <div className="relative z-10 flex h-full flex-col justify-center p-5 sm:p-6 lg:p-7">
                      {promo.badge && (
                        <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 sm:mb-3">
                          <span className="h-2 w-2 rounded-full bg-cyan-300" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-cyan-200 sm:text-[11px]">
                            {promo.badge}
                          </span>
                        </div>
                      )}

                      <h1 className="max-w-3xl text-[15px] font-black leading-tight text-white sm:text-2xl lg:text-2xl">
                        {promo.title}
                      </h1>

                      {promo.desc && (
                        <p className="mt-1 max-w-2xl line-clamp-2 text-[12px] font-medium leading-snug text-slate-300 sm:mt-2 sm:text-sm sm:leading-relaxed">
                          {promo.desc}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
                        <span className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1.5 text-[10px] font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.32)] transition group-hover:-translate-y-0.5 group-hover:from-blue-500 group-hover:to-cyan-400 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm">
                          {promo.cta || 'Lihat Promo'}
                        </span>

                        <span className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 sm:inline-flex">
                          Aman • Sat-set • Terlacak
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </a>
            );
          })}
        </div>

        {promoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPromo}
              className="absolute left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur transition hover:bg-white/10 sm:flex"
              aria-label="Promo sebelumnya"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={nextPromo}
              className="absolute right-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur transition hover:bg-white/10 sm:flex"
              aria-label="Promo selanjutnya"
            >
              ›
            </button>

            <div className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-4">
              {promoList.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollKePromo(index, 'smooth', true)}
                  className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${
                    indexAktif === index
                      ? 'w-6 bg-cyan-300 sm:w-7'
                      : 'w-1.5 bg-white/35 hover:bg-white/60 sm:w-2'
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