'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiCopy, FiCpu, FiEdit3, FiFilm, FiHash, FiImage, FiLoader, FiHeadphones, FiMessageSquare, FiRefreshCw, FiSearch, FiZap } from 'react-icons/fi';

const motionEase = [0.22, 1, 0.36, 1];

const modes = [
  { id: 'meme_video', title: 'Meme Video', desc: 'Script short video buat TikTok/Reels.', Icon: FiFilm },
  { id: 'promo', title: 'Promo Pack', desc: 'Copy promo yang gak norak.', Icon: FiHeadphones },
  { id: 'seo', title: 'SEO Helper', desc: 'Title, description, dan FAQ ringan.', Icon: FiSearch },
  { id: 'broadcast', title: 'WA Broadcast', desc: 'Pesan broadcast siap kirim.', Icon: FiMessageSquare },
];

const styles = ['meme tipis NaXaShop', 'sat-set jujur', 'friendly Gen Z', 'premium soft', 'barbar lucu aman'];

const quickIdeas = [
  'Bikin konten meme MLBB buat anak lose streak yang butuh semangat push rank lagi. Jangan terlalu sales, lucu tipis aja.',
  'Bikin promo soft selling untuk Weekly Diamond Pass. Vibe-nya sat-set, aman, dan cocok buat anak mabar malam.',
  'Bikin copy SEO ringan buat halaman top up Mobile Legends di NaXaShop. Bahas proses mudah, aman, dan bisa dilacak.',
];

function copyableTextFromScenes(result) {
  if (!Array.isArray(result?.video?.scenes)) return '';
  return result.video.scenes.map((item) => `Scene ${item.scene}\nText: ${item.text}\nVisual: ${item.visual}\nDurasi: ${item.duration}`).join('\n\n');
}

function joinHashtags(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.join(' ');
}

function CopyButton({ onClick, label = 'Copy' }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-purple-300/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/[0.10] hover:text-white">
      <FiCopy className="text-sm" />
      {label}
    </button>
  );
}

function ResultCard({ title, eyebrow, Icon, children, onCopy }) {
  return (
    <motion.div className="figma-card figma-shine relative overflow-hidden rounded-[1rem] p-4 bg-gray-900 border border-gray-800" initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.42, ease: motionEase }}>
      <div className="relative mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-300/10 bg-white/[0.06] text-purple-100"><Icon /></div>}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-200/55">{eyebrow}</p>
            <h3 className="mt-1 text-base font-black tracking-tight text-white">{title}</h3>
          </div>
        </div>
        {onCopy && <CopyButton onClick={onCopy} />}
      </div>
      <div className="relative text-sm font-semibold leading-relaxed text-slate-300">{children}</div>
    </motion.div>
  );
}

function EmptyResult() {
  return (
    <div className="figma-card relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[1.1rem] p-8 text-center bg-gray-900 border border-gray-800">
      <div className="relative max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/10 bg-white/[0.06] text-2xl text-purple-100"><FiCpu /></div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-200/55">Growth room kosong</p>
        <h3 className="mt-2 text-xl font-black text-white">Belum ada konten yang digoreng.</h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Masukin ide, pilih style, terus biarin NaxaAI bikin content pack yang siap dipoles jadi postingan.</p>
      </div>
    </div>
  );
}

export default function AdminGrowthPanel() {
  const [mode, setMode] = useState('meme_video');
  const [style, setStyle] = useState('meme tipis NaXaShop');
  const [game, setGame] = useState('Mobile Legends');
  const [product, setProduct] = useState('Weekly Diamond Pass');
  const [targetAudience, setTargetAudience] = useState('anak push rank MLBB');
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState('');

  const activeMode = modes.find((item) => item.id === mode) || modes[0];

  const copyText = async (text, label = 'Teks') => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(''), 1400);
  };

  const allResultText = useMemo(() => {
    if (!result) return '';
    const scenes = copyableTextFromScenes(result);
    const hashtags = joinHashtags(result.hashtags);
    const checklist = Array.isArray(result.uploadChecklist) ? result.uploadChecklist.map((item) => `- ${item}`).join('\n') : '';
    return `ANGLE:\n${result.contentAngle || ''}\n\nHOOK:\n${result.hook || ''}\n\nVIDEO:\n${scenes}\n\nCAPTION:\n${result.caption || ''}\n\nHASHTAGS:\n${hashtags}\n\nCTA:\n${result.cta || ''}\n\nBANNER:\n${result.bannerText || ''}\n\nBROADCAST WA:\n${result.whatsappBroadcast || ''}\n\nUPLOAD CHECKLIST:\n${checklist}`;
  }, [result]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setResult(null);

      const respon = await fetch('/api/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, idea, game, product, targetAudience, style }),
      });

      const data = await respon.json();
      if (!respon.ok || !data.success) {
        setErrorMessage(data.message || 'Gagal generate konten.');
        return;
      }
      setResult(data.data);
    } catch (error) {
      console.error(error);
      setErrorMessage('Error. Coba cek console atau terminal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AnimatePresence>{copiedLabel && <motion.div className="fixed right-8 top-8 z-[90] rounded-2xl border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-100 shadow-2xl backdrop-blur-2xl" initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}>{copiedLabel} sudah dicopy.</motion.div>}</AnimatePresence>

      <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
        <motion.section className="figma-card relative overflow-hidden rounded-[1.1rem] p-4 xl:sticky xl:top-0 xl:self-start bg-gray-900 border border-gray-800" initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.48, ease: motionEase, delay: 0.04 }}>
          <div className="relative mb-4 flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-200/55">NaxaAI Engine</p><h2 className="mt-1 text-xl font-black text-white">Brief Konten</h2></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/45 to-blue-600/25 text-white"><FiZap /></div>
          </div>
          
          <div className="relative space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {modes.map((item) => (
                <button key={item.id} type="button" onClick={() => setMode(item.id)} className={['lux-hover relative overflow-hidden rounded-[0.95rem] p-3 text-left transition border', mode === item.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-gray-700 bg-gray-950 hover:border-purple-500/30'].join(' ')}>
                   <p className="text-sm font-black text-white">{item.title}</p>
                   <p className="mt-1 text-[10px] font-semibold text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>
            
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Style preset</p>
              <div className="flex flex-wrap gap-2">
                {styles.map((item) => <button key={item} type="button" onClick={() => setStyle(item)} className={['rounded-full border px-3 py-2 text-[10px] font-black transition', style === item ? 'border-purple-300/35 bg-purple-500/18 text-purple-100' : 'border-gray-700 bg-gray-950 text-slate-400 hover:text-white'].join(' ')}>{item}</button>)}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div><label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Game</label><input value={game} onChange={(e) => setGame(e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-purple-500" /></div>
              <div><label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Produk/Promo</label><input value={product} onChange={(e) => setProduct(e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-purple-500" /></div>
            </div>

            <div><label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Target audience</label><input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-purple-500" /></div>
            
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2"><label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Ide bebas</label><button type="button" onClick={() => setIdea('')} className="text-[11px] font-black text-slate-500 transition hover:text-white">clear</button></div>
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Contoh: Bikin konten meme MLBB..." className="thin-scrollbar min-h-[120px] w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-3 py-3 text-sm font-semibold leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-purple-500" />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Quick brief</p>
              <div className="grid gap-2">{quickIdeas.map((item, index) => <button key={item} type="button" onClick={() => setIdea(item)} className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-left text-[11px] font-bold leading-relaxed text-slate-400 transition hover:border-purple-500/30 hover:text-white"><span className="mr-2 text-purple-400">0{index + 1}</span>{item}</button>)}</div>
            </div>

            <button type="button" onClick={handleGenerate} disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-purple-950/30 transition hover:-translate-y-0.5 hover:from-purple-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <FiLoader className="animate-spin" /> : <FiZap />}<span>{loading ? 'Lagi goreng ide...' : 'Generate Content Pack'}</span></button>
            {errorMessage && <div className="rounded-xl border border-red-400/15 bg-red-500/10 p-3 text-xs font-bold text-red-200">{errorMessage}</div>}
          </div>
        </motion.section>

        <section className="min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="figma-card relative flex min-h-[430px] items-center justify-center rounded-[1.1rem] p-8 text-center bg-gray-900 border border-gray-800" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="relative max-w-md">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-300/10 bg-white/[0.06] text-2xl text-purple-100"><FiLoader className="animate-spin" /></div>
                  <h3 className="mt-2 text-2xl font-black text-white">NaxaAI mikir keras...</h3>
                  <p className="mt-2 text-sm text-slate-500">Tunggu bentar, lagi nyusun angle biar gacor.</p>
                </div>
              </motion.div>
            ) : !result ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><EmptyResult /></motion.div>
            ) : (
              <motion.div key="result" className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: motionEase }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-200/55">Generated pack</p><h2 className="mt-1 text-2xl font-black text-white">Siap diposting boss.</h2></div>
                  <div className="flex flex-wrap gap-2"><CopyButton onClick={() => copyText(allResultText, 'Semua output')} label="Copy Semua" /><button type="button" onClick={() => setResult(null)} className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-[11px] font-black text-slate-200 transition hover:bg-gray-800"><FiRefreshCw /> Reset</button></div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ResultCard title="Content Angle" eyebrow="Strategy" Icon={FiCpu}><p>{result.contentAngle || '-'}</p></ResultCard>
                  <ResultCard title="Hook" eyebrow="Opening" Icon={FiZap} onCopy={() => copyText(result.hook, 'Hook')}><p className="text-base font-black text-white">{result.hook || '-'}</p></ResultCard>
                </div>

                <ResultCard title="Script Video 9:16" eyebrow="Short video" Icon={FiFilm} onCopy={() => copyText(copyableTextFromScenes(result), 'Script video')}>
                  {Array.isArray(result.video?.scenes) && result.video.scenes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-300">Durasi target: {result.video.duration || '12-15 detik'}</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {result.video.scenes.map((scene, index) => (
                          <div key={`${scene.scene}-${index}`} className="rounded-2xl border border-gray-700 bg-gray-950 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-400">Scene {scene.scene || index + 1}</p>
                            <p className="mt-2 text-base font-black leading-snug text-white">{scene.text}</p>
                            <p className="mt-3 text-xs text-slate-400">Visual: {scene.visual}</p>
                            <p className="mt-1 text-xs font-black text-blue-400">Durasi: {scene.duration}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p>Belum ada scene.</p>}
                </ResultCard>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ResultCard title="Caption" eyebrow="Upload copy" Icon={FiEdit3} onCopy={() => copyText(result.caption, 'Caption')}><p className="whitespace-pre-wrap">{result.caption || '-'}</p></ResultCard>
                  <ResultCard title="Hashtag" eyebrow="Discovery" Icon={FiHash} onCopy={() => copyText(joinHashtags(result.hashtags), 'Hashtag')}>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(result.hashtags) && result.hashtags.length > 0 ? result.hashtags.map((tag) => <span key={tag} className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs font-black text-slate-300">{tag}</span>) : <p>-</p>}
                    </div>
                  </ResultCard>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ResultCard title="CTA" eyebrow="Action" Icon={FiCheckCircle} onCopy={() => copyText(result.cta, 'CTA')}><p>{result.cta || '-'}</p></ResultCard>
                  <ResultCard title="Banner Text" eyebrow="Thumbnail" Icon={FiImage} onCopy={() => copyText(result.bannerText, 'Banner text')}><p className="text-base font-black text-white">{result.bannerText || '-'}</p></ResultCard>
                </div>

                <ResultCard title="Broadcast WhatsApp" eyebrow="WA ready" Icon={FiMessageSquare} onCopy={() => copyText(result.whatsappBroadcast, 'Broadcast WA')}><p className="whitespace-pre-wrap">{result.whatsappBroadcast || '-'}</p></ResultCard>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}