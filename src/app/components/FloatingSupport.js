'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
const START_OPTION_IDS = ['tentang-naxashop', 'cara-topup'];

const OPTION_BANK = {
  'tentang-naxashop': {
    id: 'tentang-naxashop',
    label: 'Apa sih NaXaShop itu?',
    answer:
      'NaXaShop adalah tempat top up game yang dibuat biar proses beli item game jadi lebih gampang, cepat, dan rapi. Kamu tinggal pilih game, isi ID, pilih nominal, bayar, lalu pesanan diproses otomatis oleh sistem.',
    cta: {
      label: 'Lihat daftar game',
      href: '/',
    },
    next: ['cara-topup', 'metode-bayar'],
  },
  'cara-topup': {
    id: 'cara-topup',
    label: 'Bagaimana cara topup di NaXaShop?',
    answer:
      'Caranya gampang banget:\n\n1. Pilih game yang mau kamu top up.\n2. Isi ID player dan server kalau dibutuhkan.\n3. Pilih nominal produk.\n4. Pilih metode pembayaran.\n5. Selesaikan pembayaran, lalu sistem akan memproses pesanan kamu.',
    cta: {
      label: 'Mulai pilih game',
      href: '/',
    },
    next: ['metode-bayar', 'cek-status'],
  },
  'metode-bayar': {
    id: 'metode-bayar',
    label: 'Metode bayarnya apa aja?',
    answer:
      'NaXaShop mendukung beberapa metode pembayaran seperti QRIS, e-wallet, dan Virtual Account. Metode yang tersedia bisa berbeda tergantung nominal dan status sistem pembayaran saat itu.',
    next: ['kenapa-naxashop', 'cek-status'],
  },
  'kenapa-naxashop': {
    id: 'kenapa-naxashop',
    label: 'Kenapa sih harus top-up di NaXaShop?',
    answer:
      'Karena NaXaShop dibuat biar top-up jadi lebih simpel, rapi, dan sat-set. Pilih game, isi ID, bayar, lalu sistem bantu proses pesanan kamu tanpa ribet.',
    next: ['cek-status', 'pesanan-bermasalah'],
  },
  'cek-status': {
    id: 'cek-status',
    label: 'Cara cek status pesanan gimana?',
    answer:
      'Setelah pembayaran dibuat, kamu bisa cek status pesanan dari halaman pembayaran. Kalau kamu login, transaksi juga bisa lebih gampang dicek lewat riwayat akun.',
    cta: {
      label: 'Cek status pesanan',
      href: '/lacak',
    },
    next: ['kenapa-login', 'pesanan-bermasalah'],
  },
  'kenapa-login': {
    id: 'kenapa-login',
    label: 'Enaknya login di NaXaShop apa?',
    answer:
      'Kalau kamu login, transaksi bisa lebih rapi karena riwayat pembelian tersimpan di akun. Jadi nanti kamu gak perlu bingung nyari order yang pernah dibuat.',
    cta: {
      label: 'Gas Login',
      href: '/login',
    },
    next: ['pesanan-bermasalah', 'curhat-admin'],
  },
  'pesanan-bermasalah': {
    id: 'pesanan-bermasalah',
    label: 'Kalau pesanan bermasalah gimana?',
    answer:
      'Kalau pembayaran sudah sukses tapi top up belum masuk, simpan order ID atau bukti pembayaran dulu. Biasanya status akan diproses otomatis, tapi kalau kelamaan kamu bisa lanjut hubungi admin.',
    next: ['curhat-admin'],
  },
  'curhat-admin': {
    id: 'curhat-admin',
    label: 'Curhat sama admin',
    answer:
      'Siap, kalau kamu butuh bantuan langsung, klik tombol WhatsApp admin yang muncul di bawah ya. Biar admin bisa bantu cek masalahnya lebih jelas.',
    next: [],
    showWhatsApp: true,
  },
};

function getOptionObjects(optionIds = []) {
  return optionIds.map((id) => OPTION_BANK[id]).filter(Boolean);
}

function cleanPhoneNumber(value = '') {
  return value.replace(/[^0-9]/g, '');
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/10 px-4 py-3 w-fit">
      <span className="h-2 w-2 rounded-full bg-white/60 animate-bounce" />
      <span
        className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
        style={{ animationDelay: '120ms' }}
      />
      <span
        className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
        style={{ animationDelay: '240ms' }}
      />
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.from === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
          isUser
            ? 'rounded-br-md bg-sky-500 text-white'
            : 'rounded-bl-md border border-white/10 bg-white/10 text-slate-100'
        }`}
      >
        <p>{message.text}</p>

        {message.cta?.href && message.cta?.label && (
          <Link
            href={message.cta.href}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-black transition ${
              isUser
                ? 'bg-white/15 text-white hover:bg-white/25'
                : 'bg-sky-500 text-white hover:bg-sky-400'
            }`}
          >
            {message.cta.label}
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function QuickReplies({ options, onSelect, disabled = false }) {
  if (!options?.length) return null;

  return (
    <motion.div
      key="quick-replies"
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(4px)' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="grid gap-2"
    >
      <AnimatePresence mode="popLayout">
        {options.map((item, index) => (
          <motion.button
            layout
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            disabled={disabled}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 18, scale: 0.96 }}
            transition={{ duration: 0.18, delay: index * 0.04 }}
            className="w-full rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2.5 text-left text-sm font-bold text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/20 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70"
          >
            {item.label}
          </motion.button>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FloatingSupport() {
  const pathname = usePathname();
  const chatBodyRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [currentOptions, setCurrentOptions] = useState(getOptionObjects(START_OPTION_IDS));
  const [usedOptionIds, setUsedOptionIds] = useState(() => new Set());
  const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);

  const nomorAdmin = cleanPhoneNumber(process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '');

  const halamanTanpaFloatingSupport =
    pathname?.startsWith('/topup') ||
    pathname?.startsWith('/pembayaran') ||
    pathname?.startsWith('/lacak') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  useEffect(() => {
    let isMounted = true;

    async function ambilSessionUser() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });

        if (!response.ok) return;

        const session = await response.json();

        if (isMounted) {
          setSessionUser(session?.user || null);
        }
      } catch (error) {
        console.error('Floating support gagal ambil session:', error);
      }
    }

    ambilSessionUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!chatBodyRef.current) return;

    chatBodyRef.current.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [history, isTyping, isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const namaUser = useMemo(() => {
    const namaDariSession = sessionUser?.name?.trim();
    const emailDariSession = sessionUser?.email?.trim();

    if (namaDariSession) return namaDariSession.split(' ')[0];
    if (emailDariSession) return emailDariSession.split('@')[0];

    return '';
  }, [sessionUser]);

  const pesanPembuka = useMemo(() => {
    if (namaUser) {
      return `Halo ${namaUser} 👋\nSelamat datang lagi di NaXaShop. Pilih topik di bawah, nanti NaXa bantu jawab pelan-pelan.`;
    }

    return 'Halo 👋\nSelamat datang di NaXaShop. Pilih topik di bawah, nanti NaXa bantu jawab pelan-pelan.';
  }, [namaUser]);

  const linkWa = useMemo(() => {
    if (!nomorAdmin) return '';

    const sapaan = namaUser ? `Halo admin NaXaShop, saya ${namaUser}.` : 'Halo admin NaXaShop.';
    const pesan = encodeURIComponent(`${sapaan} Saya butuh bantuan terkait order/top-up.`);

    return `https://wa.me/${nomorAdmin}?text=${pesan}`;
  }, [namaUser, nomorAdmin]);

  function buildNextOptions(nextOptionIds = [], nextUsedIds = usedOptionIds) {
    const filteredNextOptions = nextOptionIds.filter((id) => !nextUsedIds.has(id));

    if (filteredNextOptions.length > 0) {
      return getOptionObjects(filteredNextOptions).slice(0, 2);
    }

    if (!nextUsedIds.has('curhat-admin')) {
      return getOptionObjects(['curhat-admin']);
    }

    return [];
  }

  function handleQuickReply(item) {
    if (isTyping) return;

    const nextUsedIds = new Set(usedOptionIds);
    nextUsedIds.add(item.id);

    setUsedOptionIds(nextUsedIds);
    setCurrentOptions([]);
    setShowWhatsAppButton(false);

    setHistory((prev) => [
      ...prev,
      {
        id: `user-${item.id}-${Date.now()}`,
        from: 'user',
        text: item.label,
      },
    ]);

    setIsTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      setHistory((prev) => [
        ...prev,
        {
          id: `bot-${item.id}-${Date.now()}`,
          from: 'bot',
          text: item.answer,
          cta: item.cta || null,
        },
      ]);

      if (item.showWhatsApp) {
        setShowWhatsAppButton(true);
        setCurrentOptions([]);
      } else {
        setCurrentOptions(buildNextOptions(item.next, nextUsedIds));
      }

      setIsTyping(false);
    }, 900);
  }

  function resetChat() {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setHistory([]);
    setIsTyping(false);
    setUsedOptionIds(new Set());
    setCurrentOptions(getOptionObjects(START_OPTION_IDS));
    setShowWhatsAppButton(false);
  }

  if (halamanTanpaFloatingSupport) return null;

  return (
    <div className="fixed bottom-5 right-4 z-[999] sm:right-5">
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="naxa-assistant-panel"
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
            className="mb-4 w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right overflow-hidden rounded-[28px] border border-sky-400/20 bg-slate-950/95 shadow-2xl shadow-sky-950/40 backdrop-blur-xl"
          >
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-sky-500/25 via-slate-900 to-slate-950 px-4 py-4">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 shadow-lg shadow-sky-500/25">
                  <span className="text-xl">💬</span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">NaXa Assistant</p>
                  <p className="text-xs font-semibold text-emerald-300">Online • siap bantu</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={resetChat}
                    className="rounded-full px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Reset chat"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-white/20"
                  aria-label="Tutup chat bantuan"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div
            ref={chatBodyRef}
            className="max-h-[360px] min-h-[315px] space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            <ChatBubble
              message={{
                id: 'welcome',
                from: 'bot',
                text: pesanPembuka,
              }}
            />

            {history.map((message) => (
              <ChatBubble key={message.id} message={message} 
               />
            ))}

            {isTyping && <TypingDots />}
          </div>

          <motion.div
            layout
            className="min-h-[86px] overflow-hidden border-t border-white/10 bg-slate-950 px-4 py-3"
          >
            <AnimatePresence mode="wait">
              {currentOptions.length > 0 && !showWhatsAppButton && (
                <QuickReplies
                  key="quick-replies-area"
                  options={currentOptions}
                  onSelect={handleQuickReply}
                  disabled={isTyping}
                />
              )}

              {isTyping && (
                <motion.div
                  key="reply-transition"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="flex min-h-[60px] items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-slate-400"
                >
                  NaXa lagi nyusun jawaban...
                </motion.div>
              )}

              {showWhatsAppButton && !isTyping && (
                <motion.div
                  key="whatsapp-area"
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-2"
                >
                  {linkWa ? (
                    <a
                      href={linkWa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                    >
                      Chat WhatsApp Admin
                    </a>
                  ) : (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-sm font-bold text-amber-100">
                      Nomor admin belum disetting di environment.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={resetChat}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition hover:bg-white/10"
                  >
                    Mulai ulang bantuan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative ml-auto flex items-center gap-3 rounded-full border border-sky-300/30 bg-sky-500 px-4 py-3 text-white shadow-2xl shadow-sky-950/40 transition hover:-translate-y-1 hover:bg-sky-400"
        aria-label={isOpen ? 'Tutup chat bantuan' : 'Buka chat bantuan'}
      >
        <span className="relative text-xl">{isOpen ? '✕' : '💬'}</span>
        <span className="relative hidden text-sm font-black sm:block">
          {isOpen ? 'Tutup' : 'Bantuan'}
        </span>
      </button>
    </div>
  );
}
