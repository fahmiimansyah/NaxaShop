'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, FileText, Image as ImageIcon, Maximize2, MessageCircle, Minus, Music, Palette,
  MoreVertical, Paperclip, Pause, PencilLine, Play, Plus, Search, SendHorizontal, Settings,
  Sparkles, Trash2, Upload, UserRound, Video, Volume2, VolumeX, X
} from 'lucide-react'

/* ── Avatar ── */
function Avatar({ name, src, size = 46 }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const palettes = ['#C9A574', '#8B9ED4', '#D4A5C4', '#85C9A5', '#C4A5D4', '#D4C585']
  const colorIdx = name ? name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length : 0

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: src ? 'transparent' : palettes[colorIdx],
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 700,
        border: '2px solid rgba(255,255,255,0.18)',
        userSelect: 'none',
      }}
    >
      {src
        ? <img src={src} alt={name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial
      }
    </div>
  )
}


/* ── ChatHeader ── */
function ChatHeader({ settings, onToggleSettings, onClearChat }) {
  const { header, appearance } = settings
  const font = `'${appearance.fontFamily}', sans-serif`
  const [menuOpen, setMenuOpen] = useState(false)

  const closeAnd = (fn) => {
    setMenuOpen(false)
    fn?.()
  }

  return (
    <div
      className="shrink-0 flex items-center"
      style={{
        background: header.followChatBackground !== false ? appearance.chatBackground : (header.background || appearance.chatBackground),
        borderBottom: `${header.borderWidth}px solid ${header.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        zIndex: 30,
        minHeight: 70,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
        position: 'relative',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: header.textColor,
            fontWeight: 800,
            fontSize: 'clamp(18px, 5vw, 22px)',
            letterSpacing: '0.01em',
            fontFamily: font,
            lineHeight: 1.18,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {header.title || 'Chats'}
        </div>
        {header.subtitle && (
          <div
            style={{
              color: header.subtitleColor,
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {header.subtitle}
          </div>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setMenuOpen(v => !v)}
        title="Menu"
        aria-label="Buka menu chat"
        style={stealthMenuButton(header.textColor)}
      >
        <MoreVertical size={20} strokeWidth={2.35} />
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="header-stealth-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute',
              right: 'max(10px, env(safe-area-inset-right))',
              top: 60,
              zIndex: 50,
              width: 174,
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(70,45,20,0.10)',
              borderRadius: 18,
              boxShadow: '0 18px 42px rgba(70,45,20,0.18)',
              padding: 7,
              backdropFilter: 'blur(14px)',
              fontFamily: font,
            }}
          >
            <button type="button" onClick={() => closeAnd(onToggleSettings)} style={stealthMenuItem(header.textColor)}>
              <Settings size={16} strokeWidth={2.3} /> Pengaturan
            </button>
            <button type="button" onClick={() => closeAnd(onClearChat)} style={{ ...stealthMenuItem('#9b3b31'), color: '#9b3b31' }}>
              <Trash2 size={16} strokeWidth={2.3} /> Hapus chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const stealthMenuButton = (color) => ({
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(70,45,20,0.035)',
  borderRadius: 14,
  color: `${color}aa`,
  width: 38,
  height: 38,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: 0,
  boxShadow: 'none',
  transition: 'background 0.15s, opacity 0.15s',
  opacity: 0.58,
})

const stealthMenuItem = (color) => ({
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderRadius: 12,
  color,
  padding: '10px 11px',
  fontSize: 13,
  fontWeight: 760,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  textAlign: 'left',
})


/* ── MessageBubble ── */
const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.34, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
}


function isLikelyMediaSrc(value) {
  return typeof value === 'string' && /^(data:|blob:|https?:\/\/|\/)/i.test(value)
}

function getMediaDisplayName(message, fallback = 'Audio / Musik') {
  const directName = typeof message?.fileName === 'string' ? message.fileName.trim() : ''
  if (directName) return directName

  const src = typeof message?.content === 'string' ? message.content.trim() : ''
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return fallback

  try {
    const clean = decodeURIComponent(src.split('?')[0].split('#')[0])
    const last = clean.split('/').filter(Boolean).pop()
    return last || fallback
  } catch (_) {
    return fallback
  }
}

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function mediaIconButtonStyle(color, size = 34) {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.22)',
    color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    WebkitTapHighlightColor: 'transparent',
  }
}

function CustomAudioPlayer({ src, bubbleBg, textColor, font, isUser, maxWidth }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(false)

  const togglePlay = async () => {
    const el = audioRef.current
    if (!el) return
    el.muted = false
    el.volume = 1
    if (el.paused) {
      try { await el.play() } catch (_) {}
    } else {
      el.pause()
    }
  }

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }

  const seekFromEvent = (e) => {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
    setCurrent(el.currentTime)
  }

  const progress = duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0

  return (
    <div
      style={{
        background: bubbleBg,
        color: textColor,
        borderRadius: isUser ? '18px 7px 18px 18px' : '7px 18px 18px 18px',
        padding: '10px 12px',
        width: 'min(310px, 68vw)',
        maxWidth,
        boxShadow: '0 2px 10px rgba(0,0,0,0.09)',
        fontFamily: font,
        display: 'grid',
        gridTemplateColumns: '34px 1fr 30px',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.muted = false
          e.currentTarget.defaultMuted = false
          e.currentTarget.volume = 1
          setDuration(e.currentTarget.duration || 0)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause audio' : 'Play audio'} style={mediaIconButtonStyle(textColor, 34)}>
        {playing ? <Pause size={17} fill="currentColor" strokeWidth={2.4} /> : <Play size={17} fill="currentColor" strokeWidth={2.4} style={{ marginLeft: 2 }} />}
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 750, opacity: 0.88 }}>Audio</span>
          <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', opacity: 0.74 }}>
            {formatMediaTime(current)} / {formatMediaTime(duration)}
          </span>
        </div>
        <div
          onClick={seekFromEvent}
          role="slider"
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(current || 0)}
          style={{
            height: 8,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.28)',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: textColor, opacity: 0.86 }} />
        </div>
      </div>

      <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'} style={mediaIconButtonStyle(textColor, 30)}>
        {muted ? <VolumeX size={16} strokeWidth={2.3} /> : <Volume2 size={16} strokeWidth={2.3} />}
      </button>
    </div>
  )
}

function CustomVideoPlayer({ src, radius, maxWidth, initialMuted = false }) {
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const viewerSnapshotRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(!!initialMuted)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const revealControls = (autoHide = true) => {
    setControlsVisible(true)
    clearHideTimer()
    if (autoHide && playing) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 1350)
    }
  }

  useEffect(() => {
    if (playing) revealControls(true)
    else {
      clearHideTimer()
      setControlsVisible(true)
    }
    return clearHideTimer
  }, [playing])

  const togglePlay = async () => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    el.volume = 1
    if (el.paused) {
      try { await el.play() } catch (_) {}
    } else {
      el.pause()
    }
  }

  const toggleMute = (e) => {
    e?.stopPropagation?.()
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
    revealControls(true)
  }

  const seekFromEvent = (e) => {
    e.stopPropagation()
    const el = videoRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
    setCurrent(el.currentTime)
    revealControls(true)
  }

  const openViewer = (e) => {
    e.stopPropagation()
    const el = videoRef.current
    const wasPlaying = !!el && !el.paused
    viewerSnapshotRef.current = {
      wasPlaying,
      wasMuted: !!el?.muted,
      currentTime: el?.currentTime || current || 0,
    }

    // V38: jangan biarin preview bubble + viewer jalan barengan.
    // Yang main cuma modal fullscreen; preview disync lagi pas modal ditutup.
    if (el && wasPlaying) {
      try { el.pause() } catch (_) {}
    }

    revealControls(true)
    setViewerOpen(true)
  }

  const progress = duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0
  const shouldShowControls = !playing || controlsVisible

  return (
    <>
      <div
        onPointerMove={() => revealControls(true)}
        onMouseEnter={() => revealControls(false)}
        onMouseLeave={() => { if (playing) setControlsVisible(false) }}
        style={{
          position: 'relative',
          background: '#000',
          borderRadius: radius,
          overflow: 'hidden',
          width: '100%',
          maxWidth,
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
          border: '1px solid rgba(255,255,255,0.035)',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          loop
          preload="metadata"
          onClick={() => {
            if (playing && !controlsVisible) revealControls(true)
            else togglePlay()
          }}
          onLoadedMetadata={(e) => {
            e.currentTarget.muted = false
            e.currentTarget.defaultMuted = false
            e.currentTarget.volume = 1
            setDuration(e.currentTarget.duration || 0)
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setControlsVisible(true) }}
          style={{
            width: '100%',
            maxHeight: 260,
            display: 'block',
            background: '#000',
            cursor: 'pointer',
          }}
        />

        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          aria-label={playing ? 'Pause video' : 'Play video'}
          animate={{ opacity: (!playing || controlsVisible) ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 46,
            height: 46,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.34)',
            background: 'rgba(0,0,0,0.36)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (!playing || controlsVisible) ? 'pointer' : 'default',
            pointerEvents: (!playing || controlsVisible) ? 'auto' : 'none',
            backdropFilter: 'blur(7px)',
          }}
        >
          {playing
            ? <Pause size={21} fill="currentColor" strokeWidth={2.4} />
            : <Play size={22} fill="currentColor" strokeWidth={2.4} />
          }
        </motion.button>

        <motion.div
          onClick={(e) => e.stopPropagation()}
          animate={{ opacity: shouldShowControls ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '18px 9px 8px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.68), rgba(0,0,0,0.22), transparent)',
            color: '#fff',
            pointerEvents: shouldShowControls ? 'auto' : 'none',
          }}
        >
          <div onClick={seekFromEvent} style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.28)', cursor: 'pointer', overflow: 'hidden', marginBottom: 7 }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'} style={mediaIconButtonStyle('#fff', 29)}>
              {playing ? <Pause size={15} fill="currentColor" strokeWidth={2.4} /> : <Play size={15} fill="currentColor" strokeWidth={2.4} style={{ marginLeft: 2 }} />}
            </button>
            <span style={{ fontSize: 11, lineHeight: 1, fontVariantNumeric: 'tabular-nums', minWidth: 72, opacity: 0.92 }}>
              {formatMediaTime(current)} / {formatMediaTime(duration)}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} style={mediaIconButtonStyle('#fff', 29)}>
              {muted ? <VolumeX size={15} strokeWidth={2.3} /> : <Volume2 size={15} strokeWidth={2.3} />}
            </button>
            <button type="button" onClick={openViewer} aria-label="Buka video" style={mediaIconButtonStyle('#fff', 29)}>
              <Maximize2 size={14} strokeWidth={2.4} />
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <VideoModal
            key="video-viewer"
            src={src}
            startTime={viewerSnapshotRef.current?.currentTime ?? current}
            autoPlay={viewerSnapshotRef.current?.wasPlaying ?? playing}
            initialMuted={viewerSnapshotRef.current?.wasMuted ?? muted}
            onClose={(state) => {
              const el = videoRef.current
              setViewerOpen(false)
              viewerSnapshotRef.current = null
              if (!el || !state) return
              try { el.currentTime = state.currentTime || 0 } catch (_) {}
              el.muted = !!state.muted
              setMuted(el.muted)
              setCurrent(el.currentTime || state.currentTime || 0)
              if (state.playing) {
                el.muted = !!state.muted
                el.volume = 1
                setTimeout(() => { el.play().catch(() => {}) }, 30)
              } else {
                el.pause()
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function VideoModal({ src, startTime = 0, autoPlay = false, initialMuted = false, onClose }) {
  // V39: fullscreen controls bisa disembunyiin total saat video jalan.
  // Tap video/area viewer buat show-hide, bukan selalu nampilin tombol.
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(startTime || 0)
  const [muted, setMuted] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const revealControls = (autoHide = true) => {
    setControlsVisible(true)
    clearHideTimer()
    if (autoHide && playing) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 950)
    }
  }

  const closeWithState = () => {
    const el = videoRef.current
    onClose?.({
      currentTime: el?.currentTime || current || 0,
      playing: !!el && !el.paused,
      muted: !!el?.muted,
    })
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeWithState() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearHideTimer()
    }
  }, [onClose, current, playing, muted])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (startTime > 0) {
      const applyStart = () => {
        try { el.currentTime = Math.min(startTime, el.duration || startTime) } catch (_) {}
        setCurrent(el.currentTime || startTime)
      }
      if (Number.isFinite(el.duration) && el.duration > 0) applyStart()
      else el.addEventListener('loadedmetadata', applyStart, { once: true })
    }

    el.loop = true
    el.muted = !!initialMuted
    el.defaultMuted = !!initialMuted
    if (!initialMuted) el.volume = 1

    if (autoPlay) {
      const playAfterSync = () => {
        try { el.currentTime = Math.min(startTime || 0, el.duration || startTime || 0) } catch (_) {}
        el.play().catch(() => {})
      }
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setTimeout(playAfterSync, 30)
      } else {
        el.addEventListener('loadedmetadata', playAfterSync, { once: true })
      }
    }
  }, [startTime, autoPlay, initialMuted])

  useEffect(() => {
    if (playing) revealControls(true)
    else {
      clearHideTimer()
      setControlsVisible(true)
    }
    return clearHideTimer
  }, [playing])

  const togglePlay = async () => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    el.volume = 1
    if (el.paused) {
      try { await el.play() } catch (_) {}
    } else {
      el.pause()
    }
  }

  const toggleMute = (e) => {
    e?.stopPropagation?.()
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
    revealControls(true)
  }

  const seekFromEvent = (e) => {
    e.stopPropagation()
    const el = videoRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
    setCurrent(el.currentTime)
    revealControls(true)
  }

  const progress = duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0
  const shouldShowControls = !playing || controlsVisible

  return (
    <motion.div
      key="video-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => {
        if (playing) {
          if (controlsVisible) {
            clearHideTimer()
            setControlsVisible(false)
          } else {
            revealControls(true)
          }
        } else {
          revealControls(false)
        }
      }}
      onPointerMove={() => {
        if (!controlsVisible) revealControls(true)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.94)',
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: shouldShowControls ? 1 : 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => { e.stopPropagation(); closeWithState() }}
        aria-label="Tutup video"
        style={{
          position: 'absolute',
          top: 'max(18px, env(safe-area-inset-top))',
          right: 'max(18px, env(safe-area-inset-right))',
          background: 'rgba(255,255,255,0.14)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '50%',
          width: 42,
          height: 42,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: shouldShowControls ? 'auto' : 'none',
        }}
      >
        <X size={22} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(100%, 980px)',
          maxHeight: '92dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          loop
          preload="metadata"
          onClick={() => {
            if (playing) {
              if (controlsVisible) {
                clearHideTimer()
                setControlsVisible(false)
              } else {
                revealControls(true)
              }
              return
            }
            togglePlay()
          }}
          onLoadedMetadata={(e) => {
            e.currentTarget.muted = !!initialMuted
            e.currentTarget.defaultMuted = !!initialMuted
            if (!initialMuted) e.currentTarget.volume = 1
            setMuted(e.currentTarget.muted)
            setDuration(e.currentTarget.duration || 0)
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setControlsVisible(true) }}
          style={{
            width: '100%',
            maxHeight: '92dvh',
            objectFit: 'contain',
            display: 'block',
            background: '#000',
            cursor: 'pointer',
          }}
        />

        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
          aria-label={playing ? 'Pause video' : 'Play video'}
          animate={{ opacity: !playing ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.34)',
            background: 'rgba(0,0,0,0.36)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !playing ? 'pointer' : 'default',
            pointerEvents: !playing ? 'auto' : 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          {playing
            ? <Pause size={25} fill="currentColor" strokeWidth={2.4} />
            : <Play size={27} fill="currentColor" strokeWidth={2.4} />
          }
        </motion.button>

        <motion.div
          onClick={(e) => e.stopPropagation()}
          animate={{ opacity: shouldShowControls ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '34px 14px max(14px, env(safe-area-inset-bottom))',
            background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.28), transparent)',
            color: '#fff',
            pointerEvents: shouldShowControls ? 'auto' : 'none',
          }}
        >
          <div onClick={seekFromEvent} style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.26)', cursor: 'pointer', overflow: 'hidden', marginBottom: 9 }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'} style={mediaIconButtonStyle('#fff', 34)}>
              {playing ? <Pause size={17} fill="currentColor" strokeWidth={2.4} /> : <Play size={17} fill="currentColor" strokeWidth={2.4} style={{ marginLeft: 2 }} />}
            </button>
            <span style={{ fontSize: 12, lineHeight: 1, fontVariantNumeric: 'tabular-nums', minWidth: 82, opacity: 0.92 }}>
              {formatMediaTime(current)} / {formatMediaTime(duration)}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'} style={mediaIconButtonStyle('#fff', 34)}>
              {muted ? <VolumeX size={17} strokeWidth={2.3} /> : <Volume2 size={17} strokeWidth={2.3} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}


function MessageBubble({ message, settings, onImageClick, onEditRequest }) {
  const isUser = message.type === 'user'
  const profile = isUser ? settings.user : getBotById(settings, message.senderId)
  const { appearance } = settings
  const pressTimerRef = useRef(null)
  const didLongPressRef = useRef(false)

  const bubbleBg = isUser ? appearance.userBubbleColor : appearance.botBubbleColor
  const textColor = isUser ? appearance.userTextColor : appearance.botTextColor
  const font = `'${appearance.fontFamily}', sans-serif`
  const avatarSize = appearance.avatarSize || 52
  const showName = !!(profile.showName && profile.name)
  const showAvatar = profile.showAvatar !== false

  const isSticker = message.contentType === 'sticker'
  const isImage = message.contentType === 'image'
  const isVideo = message.contentType === 'video'
  const isAudio = message.contentType === 'audio'
  const isEditable = message.contentType === 'text'
  // Bot tetap kiri ala HSR/group chat, user balik kanan ala chat normal.
  // Tail/corner bubble tetap dari pojok atas, cuma arahnya dibedain kanan/kiri.
  const leftBubble = !isUser
  const rowDirection = isUser ? 'row-reverse' : 'row'
  const rowAlignSelf = isUser ? 'flex-end' : 'flex-start'
  const contentAlign = isUser ? 'flex-end' : 'flex-start'
  // Tail/corner bubble dibuat dari pojok atas seperti HSR, bukan pojok kiri bawah.
  const bubbleRadius = leftBubble ? '6px 17px 17px 17px' : '17px 6px 17px 17px'
  const mediaRadius = leftBubble ? '7px 18px 18px 18px' : '18px 7px 18px 18px'

  // V18: short chat balik ke layout v16; cuma bubble teks panjang yang dibatesin
  // supaya nggak jadi banner. Teks panjang dipaksa turun ke bawah, bukan melebar.
  const textContent = typeof message.content === 'string' ? message.content : ''
  const hasLongToken = textContent.split(/\s+/).some(part => part.length > 16)
  const isLongText = message.contentType === 'text' && (textContent.length > 42 || hasLongToken || textContent.includes('\n'))
  const rowMaxWidth = isUser ? 'min(96%, 760px)' : 'min(96%, 800px)'
  // V19: long bubble user DAN bot sama-sama dikompakin.
  // Chat pendek tetap natural, tapi begitu teks panjang bubble dipaksa turun ke bawah.
  const bubbleMaxWidth = isUser
    ? (isLongText ? 'min(56vw, 340px)' : 'min(70vw, 500px)')
    : (isLongText ? 'min(56vw, 340px)' : 'min(72vw, 540px)')
  const mediaBoxMaxWidth = isUser ? 'min(64vw, 330px)' : 'min(72vw, 350px)'
  const avatarTopOffset = 0
  const textBubblePadding = isLongText ? '10px 15px' : '9px 14px'
  const textLineHeight = isLongText ? 1.48 : 1.55

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const requestEdit = () => {
    if (!isEditable) return
    onEditRequest?.(message)
  }

  const handlePointerDown = () => {
    if (!isEditable) return
    didLongPressRef.current = false
    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      requestEdit()
    }, 560)
  }

  const handlePointerUp = () => {
    clearPressTimer()
    setTimeout(() => { didLongPressRef.current = false }, 0)
  }

  const handleContextMenu = (e) => {
    if (!isEditable) return
    e.preventDefault()
    clearPressTimer()
    requestEdit()
  }

  const renderContent = () => {
    if (message.contentType === 'typing') {
      return (
        <div
          aria-label={`${profile.name || 'Bot'} sedang mengetik`}
          style={{
            background: bubbleBg,
            borderRadius: bubbleRadius,
            padding: '11px 16px',
            display: 'flex',
            gap: 5,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            minHeight: 40,
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: textColor,
                boxShadow: `0 0 8px ${textColor}55`,
              }}
              animate={{ opacity: [0.16, 1, 0.16], scale: [0.94, 1.12, 0.94] }}
              transition={{
                duration: 2.15,
                repeat: Infinity,
                delay: i * 0.38,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )
    }

    if (isSticker) {
      const stickerIsImage = isLikelyMediaSrc(message.content)
      return (
        <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit">
          {stickerIsImage ? (
            <img
              src={message.content}
              alt="sticker"
              style={{
                width: 112,
                height: 112,
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
              }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div
              aria-label="sticker"
              style={{
                fontSize: 58,
                lineHeight: 1,
                padding: '3px 4px',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))',
                userSelect: 'none',
              }}
            >
              {message.content}
            </div>
          )}
        </motion.div>
      )
    }

    if (isImage) {
      return (
        <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit">
          <div
            onClick={() => onImageClick(message.content)}
            style={{
              background: bubbleBg,
              borderRadius: leftBubble ? '6px 16px 16px 16px' : '16px 6px 16px 16px',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              maxWidth: mediaBoxMaxWidth,
            }}
          >
            <img
              src={message.content}
              alt={message.fileName || 'image'}
              style={{
                width: '100%',
                maxWidth: '100%',
                maxHeight: 230,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => { e.target.alt = 'Gagal memuat gambar' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 7,
              right: 8,
              background: 'rgba(0,0,0,0.45)',
              borderRadius: 8,
              padding: '3px 7px',
              fontSize: 10,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <Search size={11} /> Buka
            </div>
          </div>
        </motion.div>
      )
    }

    if (isVideo) {
      return (
        <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit" style={{ width: mediaBoxMaxWidth }}>
          <CustomVideoPlayer src={message.content} radius={mediaRadius} maxWidth={mediaBoxMaxWidth} />
        </motion.div>
      )
    }

    if (isAudio) {
      return (
        <motion.div variants={fadeVariants} initial="initial" animate="animate" exit="exit">
          <CustomAudioPlayer
            src={message.content}
            bubbleBg={bubbleBg}
            textColor={textColor}
            font={font}
            isUser={isUser}
            maxWidth={mediaBoxMaxWidth}
          />
        </motion.div>
      )
    }

    return (
      <motion.div
        key={`text-${message.id}-${message.revealedAt || ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.34, ease: 'easeOut' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={clearPressTimer}
        onPointerCancel={clearPressTimer}
        onContextMenu={handleContextMenu}
        onDoubleClick={requestEdit}
        title="Tahan / klik kanan / double click buat edit"
        style={{
          background: bubbleBg,
          color: textColor,
          padding: textBubblePadding,
          borderRadius: bubbleRadius,
          fontSize: 14,
          lineHeight: textLineHeight,
          maxWidth: bubbleMaxWidth,
          width: 'fit-content',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
          fontFamily: font,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          cursor: isEditable ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'text',
        }}
      >
        {message.content}
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        display: 'flex',
        flexDirection: rowDirection,
        alignItems: 'flex-start',
        gap: 10,
        maxWidth: rowMaxWidth,
        alignSelf: rowAlignSelf,
      }}
    >
      {showAvatar && (
        <div style={{ flexShrink: 0, marginTop: avatarTopOffset }}>
          <Avatar name={profile.name} src={profile.avatar} size={avatarSize} />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: contentAlign,
          gap: showName ? 4 : 0,
          minWidth: 0,
          maxWidth: bubbleMaxWidth,
          paddingTop: showName ? 1 : 4,
        }}
      >
        {showName && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.08,
              color: 'rgba(80,60,40,0.56)',
              paddingLeft: leftBubble ? 2 : 0,
              paddingRight: leftBubble ? 0 : 2,
              maxWidth: bubbleMaxWidth,
              textAlign: isUser ? 'right' : 'left',
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              fontFamily: font,
              fontWeight: 650,
              letterSpacing: '0.005em',
            }}
          >
            {profile.name}
          </div>
        )}

        {renderContent()}

        {message.editedAt && message.contentType === 'text' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: 'rgba(80,60,40,0.43)',
              fontFamily: font,
              paddingInline: 3,
              userSelect: 'none',
            }}
          >
            <PencilLine size={10} /> diedit
          </div>
        )}
      </div>
    </motion.div>
  )
}


/* ── TypingIndicator ── */
function TypingIndicator({ settings, botId }) {
  const bot = getBotById(settings, botId)
  const { appearance } = settings
  const avatarSize = appearance.avatarSize || 52
  const font = `'${appearance.fontFamily}', sans-serif`
  const showName = !!(bot.showName && bot.name)
  const showAvatar = bot.showAvatar !== false

  return (
    <motion.div
      key="typing-indicator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        alignSelf: 'flex-start',
        maxWidth: 'min(96%, 920px)',
      }}
    >
      {showAvatar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.06 }}
          style={{ flexShrink: 0, marginTop: 0 }}
        >
          <Avatar name={bot.name} src={bot.avatar} size={avatarSize} />
        </motion.div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: showName ? 4 : 0,
          minWidth: 0,
          paddingTop: showName ? 1 : 4,
        }}
      >
        {showName && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.08,
              color: 'rgba(80,60,40,0.56)',
              paddingLeft: 2,
              fontFamily: font,
              fontWeight: 650,
              letterSpacing: '0.005em',
            }}
          >
            {bot.name}
          </div>
        )}

        <div
          style={{
            background: appearance.botBubbleColor,
            borderRadius: '7px 18px 18px 18px',
            padding: '11px 16px',
            display: 'flex',
            gap: 5,
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: appearance.botTextColor,
                boxShadow: `0 0 8px ${appearance.botTextColor}55`,
              }}
              animate={{ opacity: [0.16, 1, 0.16], scale: [0.94, 1.12, 0.94] }}
              transition={{
                duration: 2.15,
                repeat: Infinity,
                delay: i * 0.38,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}


/* ── ChatInput ── */
function ChatInput({
  settings,
  onSend,
  onScriptedChoice,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
}) {
  const [value, setValue] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const textRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const stickerInputRef = useRef(null)
  const { chatMode, appearance, header } = settings
  const scriptedChoices = settings.scriptedChoices || []
  const font = `'${appearance.fontFamily}', sans-serif`
  const isEditing = !!editingMessage

  useEffect(() => {
    if (!editingMessage) return
    setValue(editingMessage.content || '')
    setAttachOpen(false)
    requestAnimationFrame(() => {
      if (!textRef.current) return
      textRef.current.focus()
      textRef.current.style.height = 'auto'
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
    })
  }, [editingMessage])

  const resetTextarea = () => {
    setValue('')
    if (textRef.current) textRef.current.style.height = 'auto'
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return

    if (isEditing) {
      onSaveEdit(editingMessage.id, trimmed)
      resetTextarea()
      return
    }

    onSend(trimmed)
    resetTextarea()
    setAttachOpen(false)
  }

  const handleCancel = () => {
    onCancelEdit?.()
    resetTextarea()
    setAttachOpen(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleInput = (e) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const sendMedia = (contentType, content, fileName) => {
    if (!content) return
    onSend({ contentType, content, fileName })
    setAttachOpen(false)
    resetTextarea()
  }

  const handleMediaFile = (contentType, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxBytes = 24 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('Filennya kegedean ngab, coba yang di bawah 24MB biar browser gak berat.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = ev => sendMedia(contentType, ev.target.result, file.name)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const mediaButton = (label, Icon, onClick, accent = '#C9A574') => (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.58)',
        border: '1px solid rgba(70,45,20,0.10)',
        color: '#2f2418',
        borderRadius: 15,
        padding: '10px 11px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 800,
        boxShadow: '0 8px 22px rgba(70,45,20,0.08)',
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: accent,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} strokeWidth={2.5} />
      </span>
      {label}
    </button>
  )

  const baseInputArea = {
    background: header.followChatBackground !== false ? appearance.chatBackground : (header.background || appearance.chatBackground),
    borderTop: `${Math.max(header.borderWidth, 1)}px solid ${header.borderColor}`,
    flexShrink: 0,
  }

  if (chatMode === 'scripted' && !isEditing) {
    const hasScriptedChoices = scriptedChoices.length > 0
    const visibleScriptedCount = Math.min(scriptedChoices.length, 2)
    const slotHeight = visibleScriptedCount > 1 ? 92 : 44
    const scriptedAreaStyle = {
      ...baseInputArea,
      borderTop: '0 solid transparent',
      padding: 0,
    }
    const scriptedPanelStyle = {
      borderTop: baseInputArea.borderTop,
      paddingTop: 8,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(14px, env(safe-area-inset-left))',
      paddingRight: 'max(14px, env(safe-area-inset-right))',
    }

    return (
      <div className="shrink-0" style={scriptedAreaStyle}>
        <AnimatePresence initial={false}>
          {hasScriptedChoices && (
            <motion.div
              key={`scripted-choice-panel-${scriptedChoices.map(choice => choice.id).join('-')}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={scriptedPanelStyle}
            >
              <div
                style={{
                  position: 'relative',
                  minHeight: slotHeight,
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <motion.div
                  key={`script-list-${scriptedChoices.map(choice => choice.id).join('-')}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 9,
                    width: 'clamp(250px, 58vw, 330px)',
                    margin: '0 auto',
                  }}
                >
                  {scriptedChoices.slice(0, 2).map((choice, i) => (
                    <motion.button
                      key={choice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.035, ease: 'easeOut' }}
                      whileTap={{ opacity: 0.74, scale: 0.985 }}
                      onClick={() => onScriptedChoice(choice)}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        width: '100%',
                        minHeight: 39,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.99), rgba(249,247,243,0.965))',
                        color: '#352A1D',
                        border: '1px solid rgba(70,45,20,0.055)',
                        borderRadius: 999,
                        padding: '9px 18px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: font,
                        fontWeight: 850,
                        lineHeight: 1.26,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 16px rgba(70,45,20,0.075), inset 0 1px 0 rgba(255,255,255,0.9)',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative', zIndex: 1 }}>
                        {choice.buttonText || choice.userText || `Pilihan ${i + 1}`}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="shrink-0" style={{ ...baseInputArea, paddingTop: 10, paddingBottom: 'max(10px, env(safe-area-inset-bottom))', paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }}>
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 8,
              background: 'rgba(201,165,116,0.18)',
              border: '1px solid rgba(201,165,116,0.25)',
              borderRadius: 14,
              padding: '8px 10px',
              color: header.textColor,
              fontFamily: font,
              fontSize: 12,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <PencilLine size={15} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Lagi edit pesan
              </span>
            </span>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Batal edit"
              style={{
                background: 'rgba(255,255,255,0.36)',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: header.textColor,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {attachOpen && !isEditing && (
            <motion.div
              key="attach-menu"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: 0,
                bottom: 54,
                zIndex: 25,
                width: 'min(355px, calc(100vw - 24px))',
                background: 'rgba(245,240,230,0.94)',
                border: '1px solid rgba(70,45,20,0.10)',
                borderRadius: 22,
                padding: 12,
                boxShadow: '0 18px 50px rgba(70,45,20,0.20)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {mediaButton('Gambar', ImageIcon, () => imageInputRef.current?.click(), '#8B9ED4')}
                {mediaButton('Video', Video, () => videoInputRef.current?.click(), '#D4A5C4')}
                {mediaButton('Musik', Music, () => audioInputRef.current?.click(), '#85C9A5')}
                {mediaButton('Sticker', Sparkles, () => stickerInputRef.current?.click(), '#C9A574')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {!isEditing && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setAttachOpen(v => !v)}
              aria-label="Lampirkan media"
              style={{
                background: attachOpen ? appearance.userBubbleColor : 'rgba(255,255,255,0.48)',
                border: '1px solid rgba(70,45,20,0.12)',
                borderRadius: '50%',
                width: 42,
                height: 42,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: attachOpen ? appearance.userTextColor : '#6d563d',
                boxShadow: '0 2px 12px rgba(70,45,20,0.06)',
              }}
            >
              {attachOpen ? <X size={19} strokeWidth={2.4} /> : <Paperclip size={19} strokeWidth={2.3} />}
            </motion.button>
          )}

          <textarea
            ref={textRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder={isEditing ? 'Edit pesan...' : 'Ketik pesan...'}
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.52)',
              border: '1px solid rgba(70,45,20,0.12)',
              borderRadius: 22,
              padding: '10px 16px',
              color: '#2f2418',
              fontSize: 14,
              fontFamily: font,
              resize: 'none',
              outline: 'none',
              lineHeight: 1.45,
              maxHeight: 120,
              overflowY: 'auto',
              display: 'block',
              boxShadow: '0 2px 12px rgba(70,45,20,0.06)',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(201,165,116,0.55)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(70,45,20,0.12)' }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            onClick={handleSubmit}
            aria-label={isEditing ? 'Simpan edit pesan' : 'Kirim pesan'}
            style={{
              background: appearance.userBubbleColor,
              border: 'none',
              borderRadius: '50%',
              width: 42,
              height: 42,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 12px rgba(0,0,0,0.18)',
              color: appearance.userTextColor,
            }}
          >
            {isEditing ? <Check size={20} strokeWidth={2.4} /> : <SendHorizontal size={20} strokeWidth={2.3} />}
          </motion.button>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => handleMediaFile('image', e)} style={{ display: 'none' }} />
      <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleMediaFile('video', e)} style={{ display: 'none' }} />
      <input ref={audioInputRef} type="file" accept="audio/*" onChange={(e) => handleMediaFile('audio', e)} style={{ display: 'none' }} />
      <input ref={stickerInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => handleMediaFile('sticker', e)} style={{ display: 'none' }} />
    </div>
  )
}


/* ── SettingsPanel ── */
const FONTS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'monospace', label: 'Monospace' },
]

const FRAME_MODES = [
  { id: 'full', label: 'Full', desc: 'Full layar', aspect: null },
  { id: 'square11', label: '1:1', desc: 'Square post', aspect: 1 },
  { id: 'portrait34', label: '3:4', desc: 'Portrait record', aspect: 0.75 },
  { id: 'landscape43', label: '4:3', desc: 'Landscape crop', aspect: 4 / 3 },
  { id: 'vertical916', label: '9:16', desc: 'Shorts/Reels', aspect: 9 / 16 },
]

const getFrameModeConfig = (mode) => FRAME_MODES.find(item => item.id === mode) || FRAME_MODES[0]

const TABS = [
  { id: 'tampilan', label: 'Tampilan', Icon: Palette },
  { id: 'header', label: 'Header', Icon: FileText },
  { id: 'karakter', label: 'Karakter', Icon: UserRound },
  { id: 'chat', label: 'Chat', Icon: MessageCircle },
]

const REPLY_TYPES = [
  { type: 'text', label: 'Teks', Icon: MessageCircle },
  { type: 'image', label: 'Gambar', Icon: ImageIcon },
  { type: 'video', label: 'Video', Icon: Video },
  { type: 'audio', label: 'Musik', Icon: Music },
  { type: 'sticker', label: 'Stiker', Icon: Sparkles },
]

/* ── Small building blocks ── */
function SectionTitle({ children, mt = 16 }) {
  return (
    <div style={{
      color: '#C9A574', fontSize: 10, letterSpacing: '0.16em',
      textTransform: 'uppercase', fontWeight: 700,
      marginBottom: 12, marginTop: mt,
      paddingBottom: 6, borderBottom: '1px solid rgba(201,165,116,0.2)',
    }}>
      {children}
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
      <span style={{ color: '#d9d2c8', fontSize: 13 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: value, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 40, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
      <span style={{ color: '#d9d2c8', fontSize: 13 }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 46, height: 25, borderRadius: 13,
        background: value ? '#C9A574' : 'rgba(255,255,255,0.15)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.22s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2.5, left: value ? 23 : 2.5,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.22s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )
}

function TInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 11 }}>
      {label && <label style={{ display: 'block', color: 'rgba(217,210,200,0.7)', fontSize: 11, marginBottom: 5 }}>{label}</label>}
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8,
          padding: '8px 12px', color: '#f0ebe3', fontSize: 13, outline: 'none',
        }} />
    </div>
  )
}

function AvatarUpload({ name, src, onChange }) {
  const fileRef = useRef()
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const bgPalette = ['#C9A574', '#8B9ED4', '#D4A5C4', '#85C9A5', '#C4A5D4', '#D4C585']
  const colorIdx = name ? name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % bgPalette.length : 0

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
      <div onClick={() => fileRef.current.click()} style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: src ? 'transparent' : bgPalette[colorIdx],
        border: '2px solid rgba(201,165,116,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 22, overflow: 'hidden', cursor: 'pointer',
        transition: 'opacity 0.2s',
      }}>
        {src
          ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial
        }
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => fileRef.current.click()} style={smBtn('#C9A574', 'rgba(201,165,116,0.15)')}>
          <Upload size={13} /> Upload
        </button>
        {src && (
          <button onClick={() => onChange(null)} style={smBtn('#ff9999', 'rgba(255,80,80,0.12)')}>
            <Trash2 size={13} /> Hapus
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}

function ReplyEditor({ reply, onChange, label, bots = [], textPlaceholder = 'Ketik balasan bot di sini...' }) {
  const fileRef = useRef()
  const botOptions = bots.length ? bots : [normalizeBot(DEFAULT_SETTINGS.bot, 'Stelle')]
  const firstBotId = botOptions[0]?.id || MAIN_BOT_ID
  const r = { botId: firstBotId, type: 'text', content: '', ...(reply || {}) }

  const mediaAccept = r.type === 'video' ? 'video/*' : r.type === 'audio' ? 'audio/*' : 'image/*'
  const mediaPlaceholder = r.type === 'video'
    ? 'Tempel URL video, atau upload...'
    : r.type === 'audio'
      ? 'Tempel URL audio/musik, atau upload...'
      : r.type === 'sticker'
        ? 'Tempel URL sticker .webp/.gif/.png, atau upload sticker...'
        : 'Tempel URL gambar, atau upload...'

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const maxBytes = 24 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('Filennya kegedean ngab, coba yang di bawah 24MB biar browser gak berat.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => onChange({ ...r, content: ev.target.result, fileName: file.name })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const renderMediaPreview = () => {
    if (!r.content) return null

    if (r.type === 'audio') {
      return (
        <div style={{ marginTop: 8 }}>
          <audio src={r.content} controls style={{ width: '100%', height: 34 }} />
        </div>
      )
    }

    if (r.type === 'video') {
      return (
        <video
          src={r.content}
          controls
          playsInline
          style={{ marginTop: 8, maxWidth: '100%', maxHeight: 130, borderRadius: 9, background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      )
    }

    if (r.type === 'sticker' && !isLikelyMediaSrc(r.content)) {
      return <div style={{ marginTop: 8, fontSize: 36, lineHeight: 1 }}>{r.content}</div>
    }

    return (
      <img src={r.content} alt="preview"
        style={{ marginTop: 8, maxWidth: 82, maxHeight: 82, objectFit: 'contain', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: 'rgba(217,210,200,0.5)', fontSize: 10, marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>
      {botOptions.length > 1 && (
        <select
          value={r.botId || firstBotId}
          onChange={e => onChange({ ...r, botId: e.target.value })}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8,
            padding: '7px 10px', color: '#f0ebe3', fontSize: 12, outline: 'none',
            marginBottom: 8, cursor: 'pointer',
          }}
        >
          {botOptions.map((bot, idx) => (
            <option key={bot.id} value={bot.id}>{bot.name || `Bot ${idx + 1}`} yang ngomong</option>
          ))}
        </select>
      )}
      <div style={{ display: 'flex', gap: 4, marginBottom: 7, flexWrap: 'wrap' }}>
        {REPLY_TYPES.map(({ type, label: typeLabel, Icon }) => (
          <button key={type} onClick={() => onChange({ ...r, type, content: '', fileName: undefined })} style={{
            padding: '4px 10px', fontSize: 11, borderRadius: 14, border: 'none',
            cursor: 'pointer', transition: 'all 0.15s',
            background: r.type === type ? '#C9A574' : 'rgba(255,255,255,0.09)',
            color: r.type === type ? '#1E1208' : '#d9d2c8',
            fontWeight: r.type === type ? 700 : 400,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><Icon size={12} />{typeLabel}</button>
        ))}
      </div>

      {r.type === 'text' ? (
        <textarea value={r.content} onChange={e => onChange({ ...r, content: e.target.value })}
          placeholder={textPlaceholder} rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: '8px 10px', color: '#f0ebe3', fontSize: 13,
            resize: 'vertical', minHeight: 56, outline: 'none', lineHeight: 1.45,
          }} />
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 0 }}>
            <input type="text" value={r.content} onChange={e => onChange({ ...r, content: e.target.value, fileName: undefined })}
              placeholder={mediaPlaceholder}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                padding: '7px 10px', color: '#f0ebe3', fontSize: 12, outline: 'none',
              }} />
            <button onClick={() => fileRef.current.click()} style={smBtn('#8B9ED4', 'rgba(139,158,212,0.12)')} aria-label="Upload media">
              <Upload size={14} />
            </button>
          </div>

          {renderMediaPreview()}
          <input ref={fileRef} type="file" accept={mediaAccept} onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  )
}

function getReplyList(container) {
  const raw = Array.isArray(container?.replies) && container.replies.length
    ? container.replies
    : [container?.reply1, container?.reply2].filter(Boolean)
  return raw.map((reply) => ({
    id: reply?.id || uid(),
    botId: reply?.botId,
    type: reply?.type || 'text',
    content: typeof reply?.content === 'string' ? reply.content : '',
    fileName: reply?.fileName,
  }))
}

function makeEmptyReply(botId) {
  return { id: uid(), botId: botId || MAIN_BOT_ID, type: 'text', content: '' }
}

function withReplyList(container, replies) {
  const cleanReplies = (replies || []).map((reply) => ({
    id: reply?.id || uid(),
    botId: reply?.botId,
    type: reply?.type || 'text',
    content: typeof reply?.content === 'string' ? reply.content : '',
    fileName: reply?.fileName,
  }))
  return {
    ...container,
    replies: cleanReplies,
    reply1: cleanReplies[0] || null,
    reply2: cleanReplies[1] || null,
  }
}

function makeEmptyUserScriptMessage() {
  return { id: uid(), type: 'text', content: '' }
}

function normalizeUserScriptMessage(message) {
  return {
    id: message?.id || uid(),
    type: message?.type || message?.contentType || 'text',
    content: typeof message?.content === 'string' ? message.content : '',
    fileName: message?.fileName,
  }
}

function getScriptedUserMessageList(choice) {
  const fromList = Array.isArray(choice?.userMessages) && choice.userMessages.length
    ? choice.userMessages
    : null

  const fallback = []
  if (typeof choice?.userText === 'string' && choice.userText.trim()) {
    fallback.push({ id: `${choice.id || 'choice'}-old-user-1`, type: 'text', content: choice.userText })
  }
  if (typeof choice?.userText2 === 'string' && choice.userText2.trim()) {
    fallback.push({ id: `${choice.id || 'choice'}-old-user-2`, type: 'text', content: choice.userText2 })
  }

  return (fromList || fallback).map(normalizeUserScriptMessage)
}

function withUserScriptMessageList(choice, messages) {
  const cleanMessages = (messages || []).map(normalizeUserScriptMessage)
  return {
    ...choice,
    userMessages: cleanMessages,
  }
}

function getChoiceButtonText(choice, index = 0) {
  const raw = choice?.buttonText || choice?.userText || `Pilihan ${index + 1}`
  return typeof raw === 'string' && raw.trim() ? raw.trim() : `Pilihan ${index + 1}`
}

function UserScriptMessageListEditor({ choice, onUpdate }) {
  const messages = getScriptedUserMessageList(choice)
  const visibleMessages = messages.length ? messages : [makeEmptyUserScriptMessage()]

  const commit = (nextMessages) => onUpdate(withUserScriptMessageList(choice, nextMessages))
  const updateMessage = (idx, message) => commit(visibleMessages.map((old, i) => i === idx ? normalizeUserScriptMessage({ ...message, id: old.id || message.id || uid() }) : old))
  const addMessage = () => commit([...visibleMessages, makeEmptyUserScriptMessage()])
  const deleteMessage = (idx) => {
    if (visibleMessages.length <= 1) {
      commit([makeEmptyUserScriptMessage()])
      return
    }
    commit(visibleMessages.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: 'rgba(217,210,200,0.5)', fontSize: 10, marginBottom: 7, letterSpacing: '0.05em' }}>
        PESAN USER OTOMATIS (tidak tampil di tombol template):
      </div>
      {visibleMessages.map((message, idx) => (
        <div key={message.id || idx} style={{
          borderRadius: 11,
          padding: 10,
          marginBottom: 10,
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.065)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'rgba(217,210,200,0.58)', fontSize: 10, fontWeight: 750, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              User kirim otomatis #{idx + 1}
            </span>
            <button onClick={() => deleteMessage(idx)} style={smBtn('#ff9999', 'rgba(255,80,80,0.10)', 9)}>
              <Trash2 size={12} /> Hapus
            </button>
          </div>
          <ReplyEditor
            reply={message}
            label={`Isi pesan user #${idx + 1}`}
            bots={[]}
            textPlaceholder="Ketik pesan user otomatis..."
            onChange={r => updateMessage(idx, r)}
          />
        </div>
      ))}
      <button onClick={addMessage} style={{
        ...smBtn('#C9A574', 'rgba(201,165,116,0.14)', 10),
        width: '100%',
        padding: '8px 12px',
        fontWeight: 750,
      }}>
        <Plus size={13} /> Tambah Pesan User Otomatis
      </button>
    </div>
  )
}

function BotReplyListEditor({ item, onUpdate, bots = [], titlePrefix = 'Pesan Bot' }) {
  const firstBotId = bots[0]?.id || MAIN_BOT_ID
  const replies = getReplyList(item)
  const visibleReplies = replies.length ? replies : [makeEmptyReply(firstBotId)]

  const commit = (nextReplies) => onUpdate(withReplyList(item, nextReplies))
  const updateReply = (idx, reply) => commit(visibleReplies.map((old, i) => i === idx ? { ...reply, id: old.id || reply.id || uid() } : old))
  const addReply = () => commit([...visibleReplies, makeEmptyReply(firstBotId)])
  const deleteReply = (idx) => {
    if (visibleReplies.length <= 1) {
      commit([makeEmptyReply(firstBotId)])
      return
    }
    commit(visibleReplies.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {visibleReplies.map((reply, idx) => (
        <div key={reply.id || idx} style={{
          borderRadius: 11,
          padding: 10,
          marginBottom: 10,
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.065)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'rgba(217,210,200,0.58)', fontSize: 10, fontWeight: 750, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {titlePrefix} #{idx + 1}
            </span>
            <button onClick={() => deleteReply(idx)} style={smBtn('#ff9999', 'rgba(255,80,80,0.10)', 9)}>
              <Trash2 size={12} /> Hapus
            </button>
          </div>
          <ReplyEditor
            reply={reply}
            label={`Isi balasan #${idx + 1}`}
            bots={bots}
            onChange={r => updateReply(idx, r)}
          />
        </div>
      ))}

      <button onClick={addReply} style={{
        ...smBtn('#C9A574', 'rgba(201,165,116,0.14)', 10),
        width: '100%',
        padding: '8px 12px',
        fontWeight: 750,
      }}>
        <Plus size={13} /> Tambah Pesan Bot
      </button>
    </div>
  )
}

function ResponseCard({ response, onUpdate, onDelete, index, bots = [] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <span style={{ color: '#C9A574', fontSize: 12, fontWeight: 800 }}>Siklus Balasan #{index + 1}</span>
          <div style={{ color: 'rgba(217,210,200,0.38)', fontSize: 10, marginTop: 2 }}>
            Isi pesan bot sebanyak apa pun; bot bakal ngirim berurutan.
          </div>
        </div>
        <button onClick={onDelete} style={smBtn('#ff9999', 'rgba(255,80,80,0.12)', 10)}><Trash2 size={12} /> Hapus</button>
      </div>
      <BotReplyListEditor item={response} onUpdate={onUpdate} bots={bots} titlePrefix="Balasan Bot" />
    </div>
  )
}

function StarterMessageCard({ message, onUpdate, onDelete, index, bots = [] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#C9A574', fontSize: 12, fontWeight: 700 }}>Pembuka Bot #{index + 1}</span>
        <button onClick={onDelete} style={smBtn('#ff9999', 'rgba(255,80,80,0.12)', 10)}><Trash2 size={12} /> Hapus</button>
      </div>
      <ReplyEditor
        reply={message}
        label="Pesan bot yang muncul duluan"
        bots={bots}
        onChange={r => onUpdate({ ...message, ...r })}
      />
    </div>
  )
}

function ChoiceCard({ choice, onUpdate, onDelete, index, bots = [] }) {
  const buttonText = choice.buttonText ?? choice.userText ?? ''
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 11, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <span style={{ color: '#C9A574', fontSize: 12, fontWeight: 700 }}>Template #{index + 1}</span>
          <div style={{ color: 'rgba(217,210,200,0.38)', fontSize: 10, marginTop: 2 }}>
            Label tombol boleh beda dari pesan user yang dikirim otomatis.
          </div>
        </div>
        <button onClick={onDelete} style={smBtn('#ff9999', 'rgba(255,80,80,0.12)', 10)}><Trash2 size={12} /> Hapus</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'rgba(217,210,200,0.5)', fontSize: 10, marginBottom: 5, letterSpacing: '0.05em' }}>LABEL TOMBOL TEMPLATE (yang tampil di UI):</div>
        <input type="text" value={buttonText} onChange={e => onUpdate({ ...choice, buttonText: e.target.value })}
          placeholder='Contoh: "Balas March" / "Pilihan 1"'
          style={{
            width: '100%', background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8,
            padding: '8px 12px', color: '#f0ebe3', fontSize: 13, outline: 'none',
          }} />
      </div>
      <UserScriptMessageListEditor choice={choice} onUpdate={onUpdate} />
      <BotReplyListEditor item={choice} onUpdate={onUpdate} bots={bots} titlePrefix="Balasan Script" />
    </div>
  )
}


function BotCard({ bot, index, canDelete, onUpdate, onDelete }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div>
          <span style={{ color: '#C9A574', fontSize: 12, fontWeight: 800 }}>Bot #{index + 1}</span>
          <div style={{ color: 'rgba(217,210,200,0.38)', fontSize: 10, marginTop: 2 }}>
            {index === 0 ? 'Bot utama / default' : 'Member group chat'}
          </div>
        </div>
        {canDelete && (
          <button onClick={onDelete} style={smBtn('#ff9999', 'rgba(255,80,80,0.12)', 10)}>
            <Trash2 size={12} /> Hapus
          </button>
        )}
      </div>

      <AvatarUpload name={bot.name} src={bot.avatar} onChange={v => onUpdate({ ...bot, avatar: v })} />
      <TInput
        label="Nama Bot"
        value={bot.name || ''}
        onChange={v => onUpdate({ ...bot, name: v })}
        placeholder={`Contoh: ${index === 0 ? 'Stelle' : 'March 7th'}`}
      />
      <Toggle label="Tampilkan Nama" value={bot.showName !== false} onChange={v => onUpdate({ ...bot, showName: v })} />
      <Toggle label="Tampilkan Avatar" value={bot.showAvatar !== false} onChange={v => onUpdate({ ...bot, showAvatar: v })} />
    </div>
  )
}

function smBtn(color, bg, radius = 7) {
  return {
    background: bg, border: `1px solid ${color}40`,
    color: color, borderRadius: radius, padding: '5px 12px',
    fontSize: 11, cursor: 'pointer', fontWeight: 500, transition: 'opacity 0.15s',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  }
}

/* ── Main SettingsPanel ── */
function SettingsPanel({ settings, onUpdate, onClose, onClearChat }) {
  const [local, setLocal] = useState(() => normalizeSettings(deepClone(settings)))
  const [tab, setTab] = useState('tampilan')
  const isFirstRender = useRef(true)

  const update = useCallback((path, value) => {
    setLocal(prev => {
      const keys = path.split('.')
      if (keys.length === 1) return { ...prev, [keys[0]]: value }
      if (keys.length === 2) return { ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: value } }
      const next = deepClone(prev)
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    onUpdate(local)
  }, [local])

  const addResponse = () => setLocal(p => {
    const firstBotId = getFirstBotId(p)
    return {
      ...p,
      botResponses: [...p.botResponses, withReplyList({ id: uid() }, [makeEmptyReply(firstBotId)])]
    }
  })
  const updateResponse = (id, upd) => setLocal(p => ({ ...p, botResponses: p.botResponses.map(r => r.id === id ? upd : r) }))
  const deleteResponse = (id) => setLocal(p => ({ ...p, botResponses: p.botResponses.filter(r => r.id !== id) }))

  const addStarter = () => setLocal(p => {
    const firstBotId = getFirstBotId(p)
    return {
      ...p,
      starterMessages: [...(p.starterMessages || []), { id: uid(), botId: firstBotId, type: 'text', content: '' }]
    }
  })
  const updateStarter = (id, upd) => setLocal(p => ({ ...p, starterMessages: (p.starterMessages || []).map(m => m.id === id ? upd : m) }))
  const deleteStarter = (id) => setLocal(p => ({ ...p, starterMessages: (p.starterMessages || []).filter(m => m.id !== id) }))

  const addChoice = () => setLocal(p => {
    const firstBotId = getFirstBotId(p)
    return {
      ...p,
      scriptedChoices: [...p.scriptedChoices, withReplyList({ id: uid(), buttonText: '', userText: '', userMessages: [makeEmptyUserScriptMessage()] }, [makeEmptyReply(firstBotId)])]
    }
  })
  const updateChoice = (id, upd) => setLocal(p => ({ ...p, scriptedChoices: p.scriptedChoices.map(c => c.id === id ? upd : c) }))
  const deleteChoice = (id) => setLocal(p => ({ ...p, scriptedChoices: p.scriptedChoices.filter(c => c.id !== id) }))

  const updateBot = (id, upd) => setLocal(p => {
    const bots = getBots(p).map(bot => bot.id === id ? normalizeBot(upd, bot.name) : bot)
    return { ...p, bots, bot: bots[0], groupChat: bots.length > 1 }
  })

  const addBot = () => setLocal(p => {
    const bots = getBots(p)
    const nextBots = [...bots, makeBot(`Bot ${bots.length + 1}`)]
    return { ...p, bots: nextBots, bot: nextBots[0], groupChat: true }
  })

  const deleteBot = (id) => setLocal(p => {
    const bots = getBots(p)
    if (bots.length <= 1) return p
    const nextBots = bots.filter(bot => bot.id !== id)
    const fallbackId = nextBots[0]?.id || MAIN_BOT_ID
    const fixReply = (reply) => reply && reply.botId === id ? { ...reply, botId: fallbackId } : reply
    return {
      ...p,
      bots: nextBots,
      bot: nextBots[0],
      groupChat: nextBots.length > 1,
      starterMessages: (p.starterMessages || []).map(fixReply),
      botResponses: (p.botResponses || []).map(r => withReplyList(r, getReplyList(r).map(fixReply).filter(Boolean))),
      scriptedChoices: (p.scriptedChoices || []).map(c => withReplyList(c, getReplyList(c).map(fixReply).filter(Boolean))),
    }
  })

  const bots = getBots(local)
  const followHeaderBg = local.header.followChatBackground !== false

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.13)', borderRadius: 8,
    padding: '8px 12px', color: '#f0ebe3', fontSize: 13, outline: 'none', marginBottom: 0,
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="settings-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 1000 }}
      />

      {/* Panel */}
      <motion.div
        key="settings-panel"
        initial={{ x: '-105%', opacity: 0.98 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-105%', opacity: 0.98 }}
        transition={{ type: 'spring', damping: 34, stiffness: 280, mass: 0.9 }}
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0,
          width: 'min(420px, 92vw)', height: '100dvh', maxHeight: '100dvh', zIndex: 1001,
          display: 'flex', flexDirection: 'column',
          background: '#16100A', borderRadius: '0 22px 22px 0',
          boxShadow: '12px 0 42px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
        }}>
          <span style={{ color: '#E8E3D8', fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Settings size={17} /> Pengaturan FakeChat</span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
            color: '#E8E3D8', width: 30, height: 30, cursor: 'pointer', fontSize: 17,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="tabs-scroll" style={{
          display: 'flex', overflowX: 'auto', padding: '8px 14px 0',
          gap: 6, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {TABS.map(t => {
            const TabIcon = t.Icon
            return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '7px 15px 9px', fontSize: 12, borderRadius: '10px 10px 0 0',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: tab === t.id ? 'rgba(201,165,116,0.18)' : 'transparent',
              color: tab === t.id ? '#C9A574' : 'rgba(217,210,200,0.5)',
              fontWeight: tab === t.id ? 700 : 400,
              borderBottom: tab === t.id ? '2px solid #C9A574' : '2px solid transparent',
              transition: 'all 0.18s',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <TabIcon size={14} />{t.label}
            </button>
          )})}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 10px' }}>

          {/* ── TAMPILAN ── */}
          {tab === 'tampilan' && (
            <div>
              <SectionTitle mt={0}>Warna Bubble & Teks</SectionTitle>
              <ColorRow label="Background Chat" value={local.appearance.chatBackground} onChange={v => update('appearance.chatBackground', v)} />
              <ColorRow label="Bubble User (Kanan)" value={local.appearance.userBubbleColor} onChange={v => update('appearance.userBubbleColor', v)} />
              <ColorRow label="Teks User" value={local.appearance.userTextColor} onChange={v => update('appearance.userTextColor', v)} />
              <ColorRow label="Bubble Bot (Kiri)" value={local.appearance.botBubbleColor} onChange={v => update('appearance.botBubbleColor', v)} />
              <ColorRow label="Teks Bot" value={local.appearance.botTextColor} onChange={v => update('appearance.botTextColor', v)} />

              <SectionTitle>Font</SectionTitle>
              <select value={local.appearance.fontFamily} onChange={e => update('appearance.fontFamily', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', marginBottom: 0 }}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              <SectionTitle>Avatar</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <input type="range" min={38} max={72} value={local.appearance.avatarSize || 52}
                  onChange={e => update('appearance.avatarSize', parseInt(e.target.value))}
                  style={{ flex: 1 }} />
                <span style={{ color: '#C9A574', fontSize: 13, fontWeight: 700, minWidth: 42 }}>
                  {local.appearance.avatarSize || 52}px
                </span>
              </div>

              <SectionTitle>Frame Rekam</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                {FRAME_MODES.map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => update('appearance.frameMode', mode.id)}
                    style={{
                      padding: '9px 8px',
                      borderRadius: 12,
                      border: `1px solid ${local.appearance.frameMode === mode.id ? '#C9A574' : 'rgba(255,255,255,0.10)'}`,
                      background: local.appearance.frameMode === mode.id ? 'rgba(201,165,116,0.16)' : 'rgba(255,255,255,0.045)',
                      color: local.appearance.frameMode === mode.id ? '#C9A574' : '#d9d2c8',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 850, lineHeight: 1.2 }}>{mode.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.58, marginTop: 2 }}>{mode.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ color: 'rgba(217,210,200,0.45)', fontSize: 11, lineHeight: 1.45, marginBottom: 6 }}>
                Buat record konten, pilih 1:1 / 3:4 / 4:3 / 9:16 biar fakechat ada frame dan nggak full layar.
              </div>

              <SectionTitle>Suara</SectionTitle>
              <Toggle label="Efek Suara Saat Bot Balas" value={local.sound} onChange={v => update('sound', v)} />
            </div>
          )}

          {/* ── HEADER ── */}
          {tab === 'header' && (
            <div>
              <SectionTitle mt={0}>Teks Header</SectionTitle>
              <TInput label="Judul Header" value={local.header.title} onChange={v => update('header.title', v)} placeholder="Chats" />
              <TInput label="Subjudul (bisa dikosongkan)" value={local.header.subtitle} onChange={v => update('header.subtitle', v)} placeholder="MAY THIS JOURNEY LEAD TO STARWARD" />

              <SectionTitle>Warna Header</SectionTitle>
              <Toggle label="Samakan Background dengan Chat Area" value={followHeaderBg} onChange={v => update('header.followChatBackground', v)} />
              {!followHeaderBg && (
                <ColorRow label="Background Header" value={local.header.background} onChange={v => update('header.background', v)} />
              )}
              <ColorRow label="Warna Teks Judul" value={local.header.textColor} onChange={v => update('header.textColor', v)} />
              <ColorRow label="Warna Subjudul" value={local.header.subtitleColor} onChange={v => update('header.subtitleColor', v)} />
              <ColorRow label="Warna Garis Bawah" value={local.header.borderColor} onChange={v => update('header.borderColor', v)} />

              <SectionTitle>Ketebalan Garis Bawah</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={0} max={6} value={local.header.borderWidth}
                  onChange={e => update('header.borderWidth', parseInt(e.target.value))}
                  style={{ flex: 1 }} />
                <span style={{ color: '#C9A574', fontSize: 13, fontWeight: 700, minWidth: 28 }}>
                  {local.header.borderWidth}px
                </span>
              </div>
            </div>
          )}

          {/* ── KARAKTER ── */}
          {tab === 'karakter' && (
            <div>
              <SectionTitle mt={0}>Karakter User (Kanan)</SectionTitle>
              <AvatarUpload name={local.user.name} src={local.user.avatar} onChange={v => update('user.avatar', v)} />
              <TInput label="Nama User (bisa dikosongkan)" value={local.user.name} onChange={v => update('user.name', v)} placeholder="Contoh: Trailblazer" />
              <Toggle label="Tampilkan Nama" value={local.user.showName} onChange={v => update('user.showName', v)} />
              <Toggle label="Tampilkan Avatar" value={local.user.showAvatar} onChange={v => update('user.showAvatar', v)} />

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <SectionTitle mt={0}>Karakter Bot / Group (Kiri)</SectionTitle>
                    <div style={{ color: 'rgba(217,210,200,0.46)', fontSize: 11, lineHeight: 1.45, marginTop: -4 }}>
                      Tambah bot buat bikin chat berasa group. Tiap balasan/script bisa pilih bot mana yang ngomong.
                    </div>
                  </div>
                  <button onClick={addBot} style={{ ...smBtn('#C9A574', 'rgba(201,165,116,0.15)', 10), marginTop: 0, flexShrink: 0 }}>
                    <Plus size={13} /> Tambah Bot
                  </button>
                </div>

                {bots.map((bot, i) => (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    index={i}
                    canDelete={bots.length > 1}
                    onUpdate={upd => updateBot(bot.id, upd)}
                    onDelete={() => deleteBot(bot.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── CHAT MODE ── */}
          {tab === 'chat' && (
            <div>
              <SectionTitle mt={0}>Mode Chat</SectionTitle>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {[
                  { id: 'free', label: 'Free Mode', desc: 'User bebas ngetik', Icon: PencilLine },
                  { id: 'scripted', label: 'Scripted Mode', desc: 'User pilih tombol', Icon: FileText },
                ].map(m => {
                  const ModeIcon = m.Icon
                  return (
                  <button key={m.id} onClick={() => update('chatMode', m.id)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${local.chatMode === m.id ? '#C9A574' : 'rgba(255,255,255,0.1)'}`,
                    background: local.chatMode === m.id ? 'rgba(201,165,116,0.13)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.18s',
                  }}>
                    <div style={{ color: local.chatMode === m.id ? '#C9A574' : '#d9d2c8', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><ModeIcon size={14} />{m.label}</div>
                    <div style={{ color: 'rgba(217,210,200,0.45)', fontSize: 10, marginTop: 2 }}>{m.desc}</div>
                  </button>
                )})}
              </div>

              <SectionTitle>Alur Cerita</SectionTitle>
              <Toggle label="Bot chat duluan saat chat kosong" value={!!local.botStarts} onChange={v => update('botStarts', v)} />
              {local.botStarts && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ color: '#C9A574', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Pesan Pembuka Bot
                      </span>
                      <div style={{ color: 'rgba(217,210,200,0.4)', fontSize: 10, marginTop: 2 }}>
                        Muncul otomatis sebelum user milih/ngetik, cocok buat vibe story/HSR chat.
                      </div>
                    </div>
                    <button onClick={addStarter} style={smBtn('#C9A574', 'rgba(201,165,116,0.15)')}><Plus size={13} /> Tambah</button>
                  </div>
                  {(local.starterMessages || []).length === 0 ? (
                    <div style={{
                      color: 'rgba(217,210,200,0.3)', fontSize: 12, textAlign: 'center',
                      padding: '18px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10,
                    }}>
                      Belum ada pesan pembuka.<br />Klik "+ Tambah" buat bot mulai duluan.
                    </div>
                  ) : (local.starterMessages || []).map((m, i) => (
                    <StarterMessageCard key={m.id} message={m} index={i} bots={bots}
                      onUpdate={upd => updateStarter(m.id, upd)}
                      onDelete={() => deleteStarter(m.id)} />
                  ))}
                </div>
              )}

              {local.chatMode === 'free' && (
                <div style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.045)',
                  border: '1px solid rgba(255,255,255,0.085)',
                }}>
                  <div style={{ color: 'rgba(217,210,200,0.72)', fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>
                    Free mode sekarang bot wajib nunggu minimal 2 pesan user dulu. Setelah pesan kedua, bot baru boleh mulai reply sesuai jeda.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ color: 'rgba(217,210,200,0.62)', fontSize: 12, minWidth: 110 }}>Batas pesan user</span>
                    <input type="range" min={2} max={6} value={Math.max(2, local.freeModeUserBurstMax || 2)}
                      onChange={e => update('freeModeUserBurstMax', parseInt(e.target.value))}
                      style={{ flex: 1 }} />
                    <span style={{ color: '#C9A574', fontSize: 13, fontWeight: 800, minWidth: 24 }}>
                      {Math.max(2, local.freeModeUserBurstMax || 2)}x
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'rgba(217,210,200,0.62)', fontSize: 12, minWidth: 110 }}>Jeda nunggu user</span>
                    <input type="range" min={500} max={2200} step={100} value={local.freeModeUserBurstDelay || 1150}
                      onChange={e => update('freeModeUserBurstDelay', parseInt(e.target.value))}
                      style={{ flex: 1 }} />
                    <span style={{ color: '#C9A574', fontSize: 13, fontWeight: 800, minWidth: 46 }}>
                      {((local.freeModeUserBurstDelay || 1150) / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}

              {local.chatMode === 'scripted' && (
                <div style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(201,165,116,0.10)',
                  border: '1px solid rgba(201,165,116,0.18)',
                  color: 'rgba(232,227,216,0.72)',
                  fontSize: 11,
                  lineHeight: 1.45,
                }}>
                  Di scripted mode, template tampil maksimal 2 tombol, putih elegan, dan murni fade. Pesan user otomatis bisa banyak, bisa teks/gambar/video/audio/sticker, tapi isi pesan itu tidak tampil di tombol template.
                </div>
              )}

              {/* FREE MODE: Bot Responses */}
              {local.chatMode === 'free' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ color: '#C9A574', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Balasan Bot (Siklus Berurutan)
                      </span>
                      <div style={{ color: 'rgba(217,210,200,0.4)', fontSize: 10, marginTop: 2 }}>Satu siklus bisa isi banyak pesan bot bebas: teks, gambar, video, musik, atau sticker</div>
                    </div>
                    <button onClick={addResponse} style={smBtn('#C9A574', 'rgba(201,165,116,0.15)')}><Plus size={13} /> Tambah</button>
                  </div>
                  {local.botResponses.length === 0 ? (
                    <div style={{
                      color: 'rgba(217,210,200,0.3)', fontSize: 12, textAlign: 'center',
                      padding: '22px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10,
                    }}>
                      Belum ada balasan.<br />Klik "+ Tambah" untuk mulai.
                    </div>
                  ) : local.botResponses.map((r, i) => (
                    <ResponseCard key={r.id} response={r} index={i} bots={bots}
                      onUpdate={upd => updateResponse(r.id, upd)}
                      onDelete={() => deleteResponse(r.id)} />
                  ))}
                </>
              )}

              {/* SCRIPTED MODE: Choices */}
              {local.chatMode === 'scripted' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ color: '#C9A574', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Pilihan Script
                      </span>
                      <div style={{ color: 'rgba(217,210,200,0.4)', fontSize: 10, marginTop: 2 }}>Template maksimal 2 tombol, muncul setelah bot chat, tombolnya putih elegan compact</div>
                    </div>
                    <button onClick={addChoice} style={smBtn('#C9A574', 'rgba(201,165,116,0.15)')}><Plus size={13} /> Tambah</button>
                  </div>
                  {local.scriptedChoices.length === 0 ? (
                    <div style={{
                      color: 'rgba(217,210,200,0.3)', fontSize: 12, textAlign: 'center',
                      padding: '22px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10,
                    }}>
                      Belum ada pilihan.<br />Klik "+ Tambah" untuk mulai.
                    </div>
                  ) : local.scriptedChoices.map((c, i) => (
                    <ChoiceCard key={c.id} choice={c} index={i} bots={bots}
                      onUpdate={upd => updateChoice(c.id, upd)}
                      onDelete={() => deleteChoice(c.id)} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <button onClick={() => { onClearChat(); onClose() }} style={{
            background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)',
            color: '#ff9999', borderRadius: 12, padding: '9px 14px',
            fontSize: 13, cursor: 'pointer', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Trash2 size={14} /> Hapus Chat
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: '#C9A574', color: '#16100A',
            border: 'none', borderRadius: 12, padding: '9px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Check size={15} /> Simpan & Tutup
          </button>
        </div>
      </motion.div>
    </>
  )
}

function deepClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)) } catch { return obj }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}


const MAIN_BOT_ID = 'bot-main'

function makeBot(name = 'Bot Baru') {
  return {
    id: uid(),
    name,
    avatar: null,
    showName: true,
    showAvatar: true,
  }
}

function normalizeBot(bot, fallbackName = 'Bot') {
  const b = bot || {}
  return {
    id: b.id || uid(),
    name: typeof b.name === 'string' ? b.name : fallbackName,
    avatar: b.avatar || null,
    showName: b.showName !== false,
    showAvatar: b.showAvatar !== false,
  }
}

function getBots(settings) {
  const list = Array.isArray(settings?.bots) && settings.bots.length
    ? settings.bots
    : [{ id: MAIN_BOT_ID, ...(settings?.bot || DEFAULT_SETTINGS.bot) }]
  return list.map((bot, i) => normalizeBot(bot, i === 0 ? 'Stelle' : `Bot ${i + 1}`))
}

function getBotById(settings, botId) {
  const bots = getBots(settings)
  return bots.find(bot => bot.id === botId) || bots[0] || normalizeBot(DEFAULT_SETTINGS.bot, 'Stelle')
}

function getFirstBotId(settings) {
  return getBots(settings)[0]?.id || MAIN_BOT_ID
}

function normalizeSettings(settings, rawOverride = null) {
  const merged = settings || DEFAULT_SETTINGS
  const rawHasBots = rawOverride && Array.isArray(rawOverride.bots) && rawOverride.bots.length > 0
  const shouldUseLegacyBot = rawOverride && !rawHasBots && rawOverride.bot
  const sourceBots = shouldUseLegacyBot
    ? [{ id: MAIN_BOT_ID, ...merged.bot }]
    : (Array.isArray(merged.bots) && merged.bots.length ? merged.bots : [{ id: MAIN_BOT_ID, ...merged.bot }])
  const bots = sourceBots.map((bot, i) => normalizeBot(bot, i === 0 ? 'Stelle' : `Bot ${i + 1}`))
  const firstBotId = bots[0]?.id || MAIN_BOT_ID
  const appearance = { ...DEFAULT_SETTINGS.appearance, ...(merged.appearance || {}) }
  if (rawOverride && rawOverride.settingsVersion !== 13 && (!rawOverride.appearance || !rawOverride.appearance.avatarSize || rawOverride.appearance.avatarSize <= 46)) {
    appearance.avatarSize = 52
  }

  const fixReply = (reply) => {
    if (!reply) return reply
    const botId = bots.some(bot => bot.id === reply.botId) ? reply.botId : firstBotId
    return { ...reply, botId }
  }

  return {
    ...merged,
    appearance,
    bots,
    bot: bots[0],
    groupChat: merged.groupChat || bots.length > 1,
    starterMessages: (merged.starterMessages || []).map(fixReply),
    botResponses: (merged.botResponses || []).map(r => withReplyList(r, getReplyList(r).map(fixReply).filter(Boolean))),
    scriptedChoices: (merged.scriptedChoices || []).map(c => withUserScriptMessageList(withReplyList(c, getReplyList(c).map(fixReply).filter(Boolean)), getScriptedUserMessageList(c))),
  }
}


/* ── ImageModal ── */
function ImageModal({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      key="image-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.93)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.15 } }}
        onClick={onClose}
        aria-label="Tutup gambar"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          width: 40,
          height: 40,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={21} />
      </motion.button>

      <motion.img
        src={src}
        alt="fullscreen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '92vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          cursor: 'default',
        }}
      />
    </motion.div>
  )
}

/* ── Default Settings ── */
const DEFAULT_SETTINGS = {
  settingsVersion: 13,
  appearance: {
    chatBackground: '#E8E3D8',
    userBubbleColor: '#C9A574',
    botBubbleColor: '#FFFFFF',
    userTextColor: '#FFFFFF',
    botTextColor: '#1A1208',
    fontFamily: 'Inter',
    avatarSize: 52,
    storyLayout: false,
    frameMode: 'full',
  },
  header: {
    title: 'Astral Express Family',
    subtitle: 'MAY THIS JOURNEY LEAD TO STARWARD',
    background: '#E8E3D8',
    followChatBackground: true,
    borderColor: '#D7CAB8',
    borderWidth: 1,
    textColor: '#1A1208',
    subtitleColor: '#8B7050',
  },
  user: {
    name: 'Trailblazer',
    avatar: null,
    showName: true,
    showAvatar: true,
  },
  bot: {
    id: MAIN_BOT_ID,
    name: 'Stelle',
    avatar: null,
    showName: true,
    showAvatar: true,
  },
  bots: [
    {
      id: MAIN_BOT_ID,
      name: 'Stelle',
      avatar: null,
      showName: true,
      showAvatar: true,
    },
  ],
  groupChat: false,
  chatMode: 'free',
  freeModeUserBurstMax: 2,
  freeModeUserBurstDelay: 1150,
  botStarts: false,
  sound: true,
  starterMessages: [
    { id: 'starter-1', botId: MAIN_BOT_ID, type: 'text', content: 'Kamu udah bangun?' },
  ],
  botResponses: [],
  scriptedChoices: [],
}

/* ── Calm Blub Sound via Web Audio API ── */
function playBlub() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const makeBlub = (freq1, freq2, startT, dur, vol) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      filter.type = 'lowpass'
      filter.frequency.value = 600
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq1, startT)
      osc.frequency.exponentialRampToValueAtTime(freq2, startT + dur * 0.7)
      gain.gain.setValueAtTime(0, startT)
      gain.gain.linearRampToValueAtTime(vol, startT + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, startT + dur)
      osc.start(startT)
      osc.stop(startT + dur)
    }
    const t = ctx.currentTime
    makeBlub(420, 200, t, 0.18, 0.07)
    makeBlub(260, 130, t + 0.04, 0.16, 0.05)
    setTimeout(() => { try { ctx.close() } catch (_) {} }, 700)
  } catch (_) {}
}

/* ── Main Component ── */
export default function Home() {
  const [messages, setMessages] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isTyping, setIsTyping] = useState(false)
  const [typingBotId, setTypingBotId] = useState(MAIN_BOT_ID)
  const [typingTurnId, setTypingTurnId] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [usedScriptedChoiceIds, setUsedScriptedChoiceIds] = useState([])
  const [scriptedChoicesReady, setScriptedChoicesReady] = useState(true)
  const [viewport, setViewport] = useState({ height: null, offsetTop: 0 })

  const messagesEndRef = useRef(null)
  const messagesAreaRef = useRef(null)
  const suppressNextScrollRef = useRef(false)
  const botIndexRef = useRef(0)
  const freeBurstCountRef = useRef(0)
  const freeReplyTimerRef = useRef(null)
  const isBusyRef = useRef(false)
  const isMountedRef = useRef(true)
  const settingsRef = useRef(settings)
  const starterRunRef = useRef(false)
  const skipTypingRef = useRef(false)
  const typingSkipResolverRef = useRef(null)

  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = null
    const updateViewport = () => {
      if (raf) window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        const vv = window.visualViewport
        const innerHeight = Math.round(window.innerHeight || document.documentElement?.clientHeight || 0)
        const visualHeight = Math.round(vv?.height || innerHeight || 0)
        const visualOffsetTop = Math.round(vv?.offsetTop || 0)
        const keyboardGap = Math.max(0, innerHeight - visualHeight - visualOffsetTop)
        const keyboardOpen = keyboardGap > 80 || visualHeight < innerHeight * 0.78

        // Desktop kadang visualViewport bisa kebaca aneh kalau page/zoom berubah.
        // Jadi visualViewport cuma dipakai saat keyboard HP beneran kebuka.
        setViewport({
          height: keyboardOpen ? visualHeight : innerHeight,
          offsetTop: keyboardOpen ? visualOffsetTop : 0,
          keyboardOpen,
        })
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('scroll', updateViewport)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('scroll', updateViewport)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (typingSkipResolverRef.current) {
        typingSkipResolverRef.current()
        typingSkipResolverRef.current = null
      }
      if (freeReplyTimerRef.current) {
        clearTimeout(freeReplyTimerRef.current)
        freeReplyTimerRef.current = null
      }
    }
  }, [])

  /* Load settings from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fakechat_v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(prev => normalizeSettings(deepMerge(prev, parsed), parsed))
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (settings.chatMode !== 'scripted') {
      setScriptedChoicesReady(true)
      return
    }
    if (settings.botStarts && messages.length === 0 && !starterRunRef.current) {
      setScriptedChoicesReady(false)
    }
  }, [settings.chatMode, settings.botStarts, messages.length])

  /* Auto-scroll to bottom */
  const scrollToBottom = useCallback(() => {
    const el = messagesAreaRef.current
    if (!el) return

    // Jangan pakai behavior: 'smooth', karena scroll animation bikin bubble kelihatan
    // seperti ngslide dari bawah. Ini langsung pindah ke bawah setelah DOM update.
    el.scrollTop = el.scrollHeight
  }, [])

  useLayoutEffect(() => {
    if (suppressNextScrollRef.current) {
      suppressNextScrollRef.current = false
      return
    }
    scrollToBottom()
  }, [messages, scrollToBottom])

  const makeMessageId = useCallback(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`, [])

  /* Add a message to the list */
  const addMessage = useCallback((msg) => {
    if (!isMountedRef.current) return null
    const id = msg?.id || makeMessageId()
    setMessages(prev => [
      ...prev,
      { id, timestamp: new Date(), ...msg },
    ])
    return id
  }, [makeMessageId])

  const updateMessage = useCallback((messageId, patch) => {
    if (!isMountedRef.current || !messageId) return
    setMessages(prev => prev.map(msg => (
      msg.id === messageId
        ? { ...msg, ...patch }
        : msg
    )))
  }, [])

  const waitForTypingOrSkip = useCallback((ms) => {
    return new Promise(resolve => {
      if (skipTypingRef.current) {
        skipTypingRef.current = false
        resolve('skip')
        return
      }

      let settled = false
      let timer = null

      const done = (reason) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        if (typingSkipResolverRef.current === skip) typingSkipResolverRef.current = null
        skipTypingRef.current = false
        resolve(reason)
      }

      const skip = () => done('skip')
      timer = setTimeout(() => done('timeout'), ms)
      typingSkipResolverRef.current = skip
    })
  }, [])

  const requestSkipTyping = useCallback(() => {
    if (!typingSkipResolverRef.current) return
    skipTypingRef.current = true
    typingSkipResolverRef.current()
  }, [])

  /* Send bot replies (1 atau beberapa pesan bot secara berurutan) */
  const sendBotReplies = useCallback(async (replies) => {
    const valid = (replies || []).filter(r => r && typeof r.content === 'string' && r.content.trim())
    if (!valid.length) {
      if (settingsRef.current.chatMode === 'scripted') setScriptedChoicesReady(true)
      isBusyRef.current = false
      return
    }

    let previousBotId = null

    for (let i = 0; i < valid.length; i++) {
      if (!isMountedRef.current) break

      const activeSettings = settingsRef.current
      const reply = valid[i]
      const activeBot = getBotById(activeSettings, reply.botId)
      const isDifferentBotTurn = !!previousBotId && previousBotId !== activeBot.id
      const contentType = reply.type || 'text'
      const textLength = typeof reply.content === 'string' ? reply.content.trim().length : 0

      // V15: typing tetap placeholder di list. Dot-nya blink/pulse tanpa loncat,
      // typing default 2.6 detik, dan bisa di-skip dengan tap area chat.
      const preTypingDelay = i === 0 ? 420 : (isDifferentBotTurn ? 760 : 520)
      await sleep(preTypingDelay)
      if (!isMountedRef.current) break

      skipTypingRef.current = false
      setTypingBotId(activeBot.id)
      setTypingTurnId(v => v + 1)
      setIsTyping(true)

      const typingMessageId = addMessage({
        type: 'bot',
        senderId: activeBot.id,
        contentType: 'typing',
        content: '',
        isTypingPlaceholder: true,
      })
      await waitForPaint()
      if (!isMountedRef.current) break

      const baseTypingDelay = 2600
      const switchBotExtraDelay = isDifferentBotTurn ? 450 : 0
      const mediaExtraDelay = contentType === 'text' ? 0 : 300
      const lengthExtraDelay = contentType === 'text' ? Math.min(700, Math.max(0, textLength - 24) * 12) : 0
      await waitForTypingOrSkip(baseTypingDelay + switchBotExtraDelay + mediaExtraDelay + lengthExtraDelay)
      if (!isMountedRef.current) break

      // Jangan scroll pas placeholder berubah jadi bubble. Kalau di-scroll lagi,
      // mata kebaca seperti bubble ngslide dari bawah ke atas.
      suppressNextScrollRef.current = true
      updateMessage(typingMessageId, {
        type: 'bot',
        senderId: activeBot.id,
        contentType,
        content: reply.content,
        fileName: reply.fileName,
        isTypingPlaceholder: false,
        revealedAt: Date.now(),
      })
      setIsTyping(false)
      await waitForPaint()
      if (!isMountedRef.current) break

      previousBotId = activeBot.id

      if (settingsRef.current.sound) { await sleep(80); playBlub() }
    }
    setIsTyping(false)
    if (settingsRef.current.chatMode === 'scripted') setScriptedChoicesReady(true)
    isBusyRef.current = false
  }, [addMessage, updateMessage, waitForTypingOrSkip])

  /* Optional story opener: bot bisa chat duluan saat chat kosong */
  useEffect(() => {
    if (!settings.botStarts) {
      starterRunRef.current = false
      return
    }
    if (starterRunRef.current || messages.length > 0 || isTyping || isBusyRef.current) return

    const starters = (settings.starterMessages || []).filter(m => m && typeof m.content === 'string' && m.content.trim())
    if (!starters.length) return

    starterRunRef.current = true
    if (settings.chatMode === 'scripted') setScriptedChoicesReady(false)
    isBusyRef.current = true
    sendBotReplies(starters)
  }, [settings.botStarts, settings.starterMessages, messages.length, isTyping, sendBotReplies])

  /* Handle user sending a message/media (free mode) */
  const triggerFreeBotReply = useCallback(async () => {
    if (freeReplyTimerRef.current) {
      clearTimeout(freeReplyTimerRef.current)
      freeReplyTimerRef.current = null
    }
    freeBurstCountRef.current = 0
    if (isBusyRef.current) return

    const { botResponses } = settingsRef.current
    if (!botResponses?.length) return

    isBusyRef.current = true
    const idx = botIndexRef.current % botResponses.length
    botIndexRef.current++
    const resp = botResponses[idx]
    await sendBotReplies(getReplyList(resp))
  }, [sendBotReplies])

  const scheduleFreeBotReply = useCallback(() => {
    if (freeReplyTimerRef.current) clearTimeout(freeReplyTimerRef.current)

    const active = settingsRef.current
    const minBeforeReply = 2
    const maxBurst = Math.max(minBeforeReply, Math.min(6, Number(active.freeModeUserBurstMax || 2)))
    const delay = Math.max(250, Math.min(3000, Number(active.freeModeUserBurstDelay || 1150)))

    // V25: free mode nggak boleh bot jawab sebelum user benar-benar kirim pesan ke-2.
    if (freeBurstCountRef.current < minBeforeReply) return

    if (freeBurstCountRef.current >= maxBurst) {
      triggerFreeBotReply()
      return
    }

    freeReplyTimerRef.current = setTimeout(() => {
      triggerFreeBotReply()
    }, delay)
  }, [triggerFreeBotReply])

  const handleUserSend = useCallback(async (payload) => {
    // Kalau bot sudah benar-benar ngetik, jangan masukin pesan baru dulu.
    // Tapi saat masih di jeda burst, user tetap boleh kirim pesan kedua/ketiga.
    if (isBusyRef.current) return

    const msg = typeof payload === 'string'
      ? { contentType: 'text', content: payload.trim() }
      : {
          contentType: payload?.contentType || 'text',
          content: typeof payload?.content === 'string' ? payload.content : '',
          fileName: payload?.fileName,
        }

    if (!msg.content?.trim()) return

    addMessage({ type: 'user', ...msg })

    const active = settingsRef.current
    const { botResponses } = active
    if (active.chatMode !== 'free' || !botResponses?.length) return

    // V24: free mode juga bisa user kirim beberapa bubble dulu sebelum bot jawab.
    // Defaultnya 2 bubble. Kalau user diem sebentar, bot tetap mulai jawab otomatis.
    freeBurstCountRef.current += 1
    scheduleFreeBotReply()
  }, [addMessage, scheduleFreeBotReply])

  const sendScriptedUserMessages = useCallback(async (userMessages) => {
    const valid = (userMessages || []).filter(message => message && typeof message.content === 'string' && message.content.trim())

    for (let i = 0; i < valid.length; i++) {
      if (!isMountedRef.current) break

      const userMessage = valid[i]
      const contentType = userMessage.type || 'text'
      const content = userMessage.content.trim()
      const isMedia = contentType !== 'text'

      // Scripted user sekarang juga punya fase "ngetik/ngirim" dulu, biar gak pop mendadak.
      const beforeTypingDelay = i === 0 ? 240 : (isMedia ? 780 : 640)
      await sleep(beforeTypingDelay)
      if (!isMountedRef.current) break

      skipTypingRef.current = false
      const typingMessageId = addMessage({
        type: 'user',
        senderId: 'user',
        contentType: 'typing',
        content: '',
        isTypingPlaceholder: true,
      })
      await waitForPaint()
      if (!isMountedRef.current) break

      const baseDelay = i === 0 ? 1150 : 1450
      const mediaExtraDelay = isMedia ? 360 : 0
      const lengthExtraDelay = contentType === 'text' ? Math.min(520, Math.max(0, content.length - 22) * 10) : 0
      await waitForTypingOrSkip(baseDelay + mediaExtraDelay + lengthExtraDelay)
      if (!isMountedRef.current) break

      suppressNextScrollRef.current = true
      updateMessage(typingMessageId, {
        type: 'user',
        senderId: 'user',
        contentType,
        content,
        fileName: userMessage.fileName,
        isTypingPlaceholder: false,
        revealedAt: Date.now(),
      })
      await waitForPaint()
    }
  }, [addMessage, updateMessage, waitForTypingOrSkip])

  /* Handle scripted choice click */
  const handleScriptedChoice = useCallback(async (choice) => {
    if (isBusyRef.current || !choice) return
    isBusyRef.current = true
    setScriptedChoicesReady(false)
    setUsedScriptedChoiceIds(prev => prev.includes(choice.id) ? prev : [...prev, choice.id])

    const scriptedUserMessages = getScriptedUserMessageList(choice)
    const fallbackText = getChoiceButtonText(choice).trim() || '...'
    const userMessages = scriptedUserMessages.length
      ? scriptedUserMessages
      : [{ id: uid(), type: 'text', content: fallbackText }]

    await sendScriptedUserMessages(userMessages)

    const replies = getReplyList(choice)
    if (replies.length > 0) {
      await sendBotReplies(replies)
    } else {
      setScriptedChoicesReady(true)
      isBusyRef.current = false
    }
  }, [sendBotReplies, sendScriptedUserMessages])

  /* Clear chat */
  const handleClearChat = useCallback(() => {
    setMessages([])
    setIsTyping(false)
    setTypingBotId(getFirstBotId(settingsRef.current))
    setTypingTurnId(v => v + 1)
    setEditingMessage(null)
    setUsedScriptedChoiceIds([])
    setScriptedChoicesReady(!(settingsRef.current.chatMode === 'scripted' && settingsRef.current.botStarts))
    starterRunRef.current = false
    botIndexRef.current = 0
    freeBurstCountRef.current = 0
    if (freeReplyTimerRef.current) {
      clearTimeout(freeReplyTimerRef.current)
      freeReplyTimerRef.current = null
    }
    isBusyRef.current = false
  }, [])

  /* Edit existing text message via hold tap/right click */
  const handleRequestEditMessage = useCallback((message) => {
    if (!message || message.contentType !== 'text') return
    setEditingMessage(message)
  }, [])

  const handleSaveEditedMessage = useCallback((messageId, nextText) => {
    const text = nextText?.trim()
    if (!messageId || !text) return
    setMessages(prev => prev.map(msg => (
      msg.id === messageId
        ? { ...msg, content: text, editedAt: new Date() }
        : msg
    )))
    setEditingMessage(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null)
  }, [])

  /* Save & apply settings */
  const handleUpdateSettings = useCallback((newSettings) => {
    const normalized = normalizeSettings(newSettings)
    setSettings(normalized)
    try { localStorage.setItem('fakechat_v2', JSON.stringify(normalized)) } catch (_) {}
  }, [])

  const hasTypingPlaceholder = messages.some(msg => msg.contentType === 'typing')
  const canShowScriptedChoices = settings.chatMode === 'scripted' && scriptedChoicesReady && !hasTypingPlaceholder
  const activeScriptedChoices = canShowScriptedChoices
    ? (settings.scriptedChoices || []).filter(choice => !usedScriptedChoiceIds.includes(choice.id)).slice(0, 2)
    : []
  const inputSettings = { ...settings, scriptedChoices: activeScriptedChoices, scriptedWaitingForBot: settings.chatMode === 'scripted' && !canShowScriptedChoices }
  const frameMode = settings.appearance.frameMode || 'full'
  const frameConfig = getFrameModeConfig(frameMode)
  const isFramed = frameMode !== 'full'
  const frameAspect = frameConfig.aspect || 1
  const viewportHeightCss = viewport.height ? `${viewport.height}px` : '100dvh'

  return (
    <div
      style={{
        // Critical layout sengaja tetap inline juga, biar gak bergantung global.css
        // dan tetap aman kalau Tailwind class belum ke-load di route tertentu.
        position: 'fixed',
        left: 0,
        right: 0,
        top: viewport.offsetTop ? `${viewport.offsetTop}px` : 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        background: isFramed ? '#14100B' : settings.appearance.chatBackground,
        width: '100%',
        maxWidth: '100vw',
        minWidth: 0,
        height: viewportHeightCss,
        boxSizing: 'border-box',
        padding: isFramed ? 14 : 0,
        '--fakechat-vh': viewportHeightCss,
      }}
    >
      <div
        className="flex flex-col overflow-hidden overscroll-none"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'none',
          background: settings.appearance.chatBackground,
          fontFamily: `'${settings.appearance.fontFamily}', sans-serif`,
          width: isFramed ? `min(calc(100vw - 28px), calc((var(--fakechat-vh) - 28px) * ${frameAspect}))` : '100%',
          height: isFramed ? `min(calc(var(--fakechat-vh) - 28px), calc((100vw - 28px) / ${frameAspect}))` : '100%',
          maxWidth: '100vw',
          maxHeight: viewportHeightCss,
          minWidth: 0,
          boxSizing: 'border-box',
          borderRadius: isFramed ? 22 : 0,
          boxShadow: isFramed ? '0 24px 90px rgba(0,0,0,0.38)' : 'none',
          border: isFramed ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
      <ChatHeader
        settings={settings}
        onToggleSettings={() => setShowSettings(open => !open)}
        onClearChat={handleClearChat}
      />

      {/* Messages area */}
      <div
        ref={messagesAreaRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        onPointerDown={requestSkipTyping}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', gap: 14, overflowAnchor: 'none', paddingTop: 14, paddingBottom: 14, paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }}
      >
        {/* Empty state */}
        {messages.length === 0 && !isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingBottom: 40,
              color: 'rgba(80,60,40,0.35)', fontSize: 13,
              textAlign: 'center', userSelect: 'none',
            }}
          >
            <MessageCircle size={42} strokeWidth={1.7} />
            <div style={{ fontWeight: 600 }}>Chat masih kosong</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {settings.chatMode === 'scripted'
                ? 'Pilih tombol di bawah untuk mulai'
                : 'Ketik pesan atau atur dulu di pengaturan'}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              settings={settings}
              onImageClick={setLightboxImage}
              onEditRequest={handleRequestEditMessage}
            />
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} style={{ height: 4 }} />
      </div>

      <ChatInput
        settings={inputSettings}
        onSend={handleUserSend}
        onScriptedChoice={handleScriptedChoice}
        editingMessage={editingMessage}
        onSaveEdit={handleSaveEditedMessage}
        onCancelEdit={handleCancelEdit}
      />

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel key="settings" settings={settings} onUpdate={handleUpdateSettings}
            onClose={() => setShowSettings(false)} onClearChat={handleClearChat} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxImage && (
          <ImageModal key="lightbox" src={lightboxImage} onClose={() => setLightboxImage(null)} />
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function waitForPaint() {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}

function deepMerge(base, override) {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])
      && typeof base[key] === 'object' && base[key] !== null) {
      result[key] = deepMerge(base[key], override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}
