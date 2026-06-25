"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Image as ImageIcon, Settings, X, Plus, 
  Trash2, Menu, EyeOff, Eye, Palette, Paperclip, Pencil, Check, Volume2, VolumeX
} from "lucide-react";

export default function FakeChatHSRDynamic() {
  // --- STATE UI & HEADER ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Chats");
  const [headerSubtitle, setHeaderSubtitle] = useState("MAY THIS JOURNEY LEAD US STARWARD");

  // --- STATE USER & BOT PROFILE ---
  const [userName, setUserName] = useState("Trailblazer");
  const [userAvatar, setUserAvatar] = useState("https://ui-avatars.com/api/?name=Trailblazer&background=DAB88B&color=fff");
  const [hideUserInfo, setHideUserInfo] = useState(false);
  const [userBubbleColor, setUserBubbleColor] = useState("#DAB88B");

  const [botName, setBotName] = useState("Dan Heng");
  const [botAvatar, setBotAvatar] = useState("https://ui-avatars.com/api/?name=Dan+Heng&background=333&color=fff");
  const [botBubbleColor, setBotBubbleColor] = useState("#F5F5F5");
  const [autoStartScenario, setAutoStartScenario] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [botReplies, setBotReplies] = useState([
  {
    id: 1,
    type: "text",
    value: "Halo bree! Ini jawaban pertama gua.",
    mode: "wait",
    delay: 1000
  },
  {
    id: 2,
    type: "text",
    value: "Ini jawaban kedua, mantap kan flownya?",
    mode: "wait",
    delay: 1000
  }
]);
  const [currentReplyIndex, setCurrentReplyIndex] = useState(0);

  const [botStickers, setBotStickers] = useState([]); 
  const [selectedSticker, setSelectedSticker] = useState(null);

  // --- STATE CHAT MAIN (Ada pesan awal bawaan, tapi BISA DIHAPUS TOTAL) ---
  const [messages, setMessages] = useState([]); 
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [quickTemplateMode, setQuickTemplateMode] = useState(false);

const [quickTemplates, setQuickTemplates] = useState([
  { id: 1, text: "Halo" },
  { id: 2, text: "Apa kabar?" },
  { id: 3, text: "Aku kangen" }
]);
  
  // --- STATE EDIT & LIGHTBOX ---
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [lightboxMedia, setLightboxMedia] = useState(null); 
  const [selectedMessage, setSelectedMessage] = useState(null);

const longPressTimer = useRef(null);
  const messagesEndRef = useRef(null);
  const audioContextRef = useRef(null);

  // --- SOUND EFFECT 'BLUB' KALEM ---
  const playCalmBlubSound = () => {
    if (!isSoundEnabled) return; 
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(130, ctx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.12); 

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.03); 
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); 

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.log("Audio blocked:", e);
    }
  };

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {

  if (
    autoStartScenario &&
    botReplies.length > 0 &&
    messages.length === 0
  ) {
    setTimeout(() => {
      triggerBotResponseLogic(0);
    }, 300);
  }

}, [autoStartScenario]);

  // --- HANDLERS MEDIA UPLOAD ---
  const handleUploadImage = (e, setState) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setState(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUserSendMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split("/")[0]; 
    const reader = new FileReader();
    reader.onload = (event) => {
      const newMediaMsg = {
        id: Date.now(),
        sender: "user",
        type: fileType,
        url: event.target.result
      };
      setMessages((prev) => [...prev, newMediaMsg]);
      
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        triggerBotResponseLogic();
      }, 2000);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newUserMsg = { id: Date.now(), sender: "user", type: "text", text: inputText };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      triggerBotResponseLogic();
    }, 2000);
  };
  const sendQuickTemplate = (text) => {
  const newUserMsg = {
    id: Date.now(),
    sender: "user",
    type: "text",
    text
  };

  setMessages((prev) => [...prev, newUserMsg]);

  setIsTyping(true);

  setTimeout(() => {
    setIsTyping(false);
    triggerBotResponseLogic();
  }, 2000);
};
const addQuickTemplate = () => {
  setQuickTemplates(prev => [
    ...prev,
    {
      id: Date.now(),
      text: ""
    }
  ]);
};
const updateQuickTemplate = (id, value) => {
  setQuickTemplates(prev =>
    prev.map(item =>
      item.id === id
        ? { ...item, text: value }
        : item
    )
  );
};
const removeQuickTemplate = (id) => {
  setQuickTemplates(prev =>
    prev.filter(item => item.id !== id)
  );
};

const createBotMessage = (reply, customId) => {
  let msgObj = {
    id: customId || Date.now(),
    sender: "bot"
  };

  if (reply.type === "sticker") {
    msgObj.type = "sticker";
    msgObj.url =
      selectedSticker ||
      "https://ui-avatars.com/api/?name=Sticker";
  }
  else if (reply.type === "image") {
    msgObj.type = "image";
    msgObj.url = reply.value;
  }
  else {
    msgObj.type = "text";
    msgObj.text = reply.value;
  }

  return msgObj;
};
  // --- DYNAMIC BOT RESPONSE FLOW CONTROL ---
  const triggerBotResponseLogic = (
  customIndex = null
) => {

  if (botReplies.length === 0) return;

  let index =
  customIndex !== null
    ? customIndex
    : currentReplyIndex;

  const sendReply = (replyIndex) => {

    const reply = botReplies[replyIndex];

    if (!reply) return;

    const botMessage =
      createBotMessage(
        reply,
        Date.now() + replyIndex
      );

    setMessages(prev => [
      ...prev,
      botMessage
    ]);

    playCalmBlubSound();

    const nextReply =
      botReplies[replyIndex + 1];

    if (
      nextReply &&
      nextReply.mode === "auto"
    ) {
      setTimeout(() => {
        sendReply(replyIndex + 1);
      }, reply.delay || 1000);
    }
    else {
      setCurrentReplyIndex(
        replyIndex + 1
      );
    }
  };

  sendReply(index);
};


  const saveEdit = (id) => {
    setMessages(messages.map(msg => msg.id === id ? { ...msg, text: editValue } : msg));
    setEditingId(null);
    setSelectedMessage(null);
  };

  const deleteMessage = (id) => {
    setMessages(messages.filter((msg) => msg.id !== id));
    setSelectedMessage(null);
  };

  const addBotReplyRow = () => {
  setBotReplies([
    ...botReplies,
    {
      id: Date.now(),
      type: "text",
      value: "",
      mode: "wait",
      delay: 1000
    }
  ]);
};

  const updateBotReplyRow = (id, field, val) => {
    setBotReplies(botReplies.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeBotReplyRow = (id) => {
    setBotReplies(botReplies.filter(item => item.id !== id));
  };

  const handleUploadSticker = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => setBotStickers(prev => [...prev, event.target.result]);
        reader.readAsDataURL(file);
      }
    });
  };

  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline break-all">{part}</a>;
      }
      return part;
    });
  };

  return (
    <div className="flex h-screen w-full bg-[#d4d4d8] font-sans overflow-hidden relative select-none no-scrollbar">
      
      {/* AREA CHAT UTAMA */}
      <div className="flex-1 flex flex-col h-full w-full">
        
        {/* Header Putih Clean - Garis Bawah Abu Abu - Tanpa Icon */}
        <div className="bg-white text-gray-900 px-6 py-4 flex items-center justify-between relative z-10 border-b border-gray-300 shadow-sm">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-bold tracking-wide text-gray-800">{headerTitle}</h1>
            <p className="text-[10px] text-gray-400 tracking-[0.3em] mt-1 uppercase font-semibold">
              {headerSubtitle}
            </p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Layar Chat Utama (Murni Fade-in Tanpa Lompat/Geser) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
          onClick={() => setSelectedMessage(null)}
        >
          <AnimatePresence>
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isText = msg.type === "text";
              const isSticker = msg.type === "sticker";
              const isImage = msg.type === "image";
              const isVideo = msg.type === "video";

              return (
                <motion.div
                  key={msg.id}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      setSelectedMessage(msg.id);
                    }, 1000);
                  }}

                  onTouchEnd={() => {
                    clearTimeout(longPressTimer.current);
                  }}

                  onTouchMove={() => {
                    clearTimeout(longPressTimer.current);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "linear" }}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] group relative ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {(!isUser || (isUser && !hideUserInfo)) && (
                      <img 
                        src={isUser ? userAvatar : botAvatar} 
                        alt="avatar" 
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                      />
                    )}
                    
                    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      {(!isUser || (isUser && !hideUserInfo)) && (
                        <span className="text-sm text-gray-500 mb-1 font-semibold px-1">
                          {isUser ? userName : botName}
                        </span>
                      )}
                      
                      {/* Action Menu */}
                          <div
                            className={`
                              flex gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow border
                              absolute top-6 transition-opacity z-20
                              ${
                                selectedMessage === msg.id
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }
                              ${isUser ? "-left-16" : "-right-16"}
                            `}
                          >
                        {isText && (
                          <button onClick={() => { setEditingId(msg.id); setEditValue(msg.text); }} className="p-1 text-gray-600 hover:text-blue-600 rounded">
                            <Pencil size={14} />
                          </button>
                        )}
                        <button onClick={() => deleteMessage(msg.id)} className="p-1 text-gray-600 hover:text-red-600 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* TEXT BUBBLE */}
                      {isText && (
                        <div 
                          style={{ backgroundColor: isUser ? userBubbleColor : botBubbleColor }}
                          className={`px-5 py-3 shadow-md text-gray-800 text-[15px] relative min-w-[50px]
                          ${isUser ? "rounded-l-2xl rounded-br-2xl rounded-tr-sm" : "rounded-r-2xl rounded-bl-2xl rounded-tl-sm border border-black/5"}`}
                        >
                          {editingId === msg.id ? (
                            <div className="flex gap-2 items-center">
                              <input 
                                type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                className="bg-white px-2 py-1 border rounded text-sm text-black outline-none w-full"
                              />
                              <button onClick={() => saveEdit(msg.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            renderMessageText(msg.text)
                          )}
                        </div>
                      )}

                      {/* STICKER */}
                      {isSticker && (
                        <img 
                          src={msg.url} alt="sticker" 
                          className="max-w-[130px] rounded-lg shadow-sm bg-white p-1 cursor-pointer"
                          onClick={() => setLightboxMedia({ type: "image", url: msg.url })}
                        />
                      )}

                      {/* GAMBAR */}
                      {isImage && (
                        <img 
                          src={msg.url} alt="media-img" 
                          className="max-w-[200px] rounded-xl shadow-md border-2 border-white cursor-pointer object-cover"
                          onClick={() => setLightboxMedia({ type: "image", url: msg.url })}
                        />
                      )}

                      {/* VIDEO */}
                      {isVideo && (
                        <div className="relative max-w-[200px] rounded-xl overflow-hidden shadow-md border-2 border-white bg-black">
                          <video src={msg.url} className="w-full h-auto max-h-[150px] object-cover" />
                          <div 
                            onClick={() => setLightboxMedia({ type: "video", url: msg.url })}
                            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer font-bold text-xs text-white"
                          >
                            PLAY VIDEO
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {/* TYPING INDICATOR BOT (MURNI FADE OUT INSTANT BIAR JAWABAN GAK LOMPAT KEBAWAH) */}
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, transition: { duration: 0 } }} // Exit duration 0 biar gak nabrak bubble baru datang
                className="flex w-full justify-start"
              >
                <div className="flex gap-3 flex-row max-w-[70%]">
                  <img src={botAvatar} alt="bot" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm text-gray-500 mb-1 font-semibold">{botName}</span>
                    <div style={{ backgroundColor: botBubbleColor }} className="px-5 py-4 rounded-r-2xl rounded-bl-2xl rounded-tl-sm shadow-md flex gap-1.5 items-center justify-center border border-black/5">
                      <motion.div animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.3 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.6 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR COLOM UTAMA */}
        <div className="p-4 bg-[#f0f0f0] border-t-2 border-gray-300 relative z-10">
          {!quickTemplateMode ? (
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-5xl mx-auto items-center">
            <label className="p-3 bg-white border rounded-full shadow-sm hover:bg-gray-100 cursor-pointer text-gray-600 flex items-center justify-center">
              <Paperclip size={20} />
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUserSendMedia} />
            </label>
            <input
              type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan..."
              className="flex-1 bg-white border rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#DAB88B] text-gray-700 shadow-inner"
            />
            <button type="submit" style={{ backgroundColor: userBubbleColor }} className="p-3 rounded-full shadow-md text-gray-900 min-w-[50px] flex items-center justify-center">
              <Send size={20} />
            </button>
          </form> ) : (

            <div className="flex gap-2 overflow-x-auto max-w-5xl mx-auto no-scrollbar">

              {quickTemplates.map((item) => (
                <button
                  key={item.id}
                  onClick={() => sendQuickTemplate(item.text)}
                  className="
                    whitespace-nowrap
                    px-4
                    py-3
                    bg-white
                    rounded-full
                    shadow-sm
                    border
                    hover:bg-gray-100
                    transition
                    text-sm
                    font-medium
                  "
                >
                  {item.text}
                </button>
              ))}

            </div>

          )}
        </div>
      </div>

      {/* DRAWER SETTINGS DRAWER */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col border-l">
              
              <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                <h2 className="text-xl font-bold flex items-center gap-2">⚙️ Pengaturan Fake Chat</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* GLOBAL RESET BUTTON */}
                <button onClick={() => { setMessages([]); setIsSettingsOpen(false); }} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow hover:bg-red-700 transition-colors">
                  🗑️ Reset / Kosongkan Layar Chat
                </button>

                {/* SOUND WITH MUTE TOGGLE SWITCH */}
                <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSoundEnabled ? <Volume2 size={20} className="text-green-600"/> : <VolumeX size={20} className="text-red-500"/>}
                    <span className="text-sm font-semibold text-gray-700">Efek Suara 'Blub' Kalem</span>
                  </div>
                  <input 
                    type="checkbox" checked={isSoundEnabled} onChange={(e) => setIsSoundEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Quick Template Mode
                  </span>
                    
                  <input
                    type="checkbox"
                    checked={quickTemplateMode}
                    onChange={(e) =>
                      setQuickTemplateMode(e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                </div>
                <div className="space-y-3 border-t pt-4">

                  <h3 className="font-bold text-gray-700">
                    ⚡ Quick Templates
                  </h3>

                  {quickTemplates.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          updateQuickTemplate(
                            item.id,
                            e.target.value
                          )
                        }
                        placeholder={`Template ${index + 1}`}
                        className="
                          flex-1
                          border
                          rounded-lg
                          px-3
                          py-2
                          text-sm
                          outline-none
                        "
                      />

                      <button
                        onClick={() =>
                          removeQuickTemplate(item.id)
                        }
                        className="
                          px-3
                          py-2
                          bg-red-500
                          text-white
                          rounded-lg
                        "
                      >
                        X
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addQuickTemplate}
                    className="
                      w-full
                      py-2
                      bg-blue-500
                      text-white
                      rounded-lg
                      font-medium
                    "
                  >
                    + Tambah Template
                  </button>

                </div>
                {/* HEADER SETTINGS */}
                <div className="space-y-2 border-t pt-4">
                  <h3 className="font-bold text-gray-700">Layout Header</h3>
                  <input type="text" value={headerTitle} onChange={(e) => setHeaderTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="Chats" />
                  <input type="text" value={headerSubtitle} onChange={(e) => setHeaderSubtitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" placeholder="Subtitle..." />
                </div>

                {/* USER PROFILE CONFIGURATION */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">👤 User Profile</h3>
                    <button onClick={() => setHideUserInfo(!hideUserInfo)} className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">{hideUserInfo ? "Hidden" : "Visible"}</button>
                  </div>
                  {!hideUserInfo && (
                    <>
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                          <ImageIcon size={16} className="text-gray-500"/>
                          <span className="text-sm text-gray-600">Pilih Foto User...</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, setUserAvatar)} />
                        </label>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">Warna Bubble:</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={userBubbleColor} onChange={(e) => setUserBubbleColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                      <span className="text-xs text-gray-600 font-mono font-bold uppercase">{userBubbleColor}</span>
                    </div>
                  </div>
                </div>

                {/* BOT PROFILE CONFIGURATION */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-bold text-gray-700">🤖 Bot Profile</h3>
                  <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none" />
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                      <ImageIcon size={16} className="text-gray-500"/>
                      <span className="text-sm text-gray-600">Pilih Foto Bot...</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e, setBotAvatar)} />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">Warna Bubble:</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={botBubbleColor} onChange={(e) => setBotBubbleColor(e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                      <span className="text-xs text-gray-600 font-mono font-bold uppercase">{botBubbleColor}</span>
                    </div>
                  </div>
                  
                  {/* MULTI STICKER SELECTOR */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Koleksi Sticker Bot</label>
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-200 p-2 rounded justify-center text-blue-700 font-semibold text-xs hover:bg-blue-100 transition-colors">
                      <Plus size={14} />
                      <span>Upload Gambar Sticker</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadSticker} />
                    </label>
                    {botStickers.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-gray-100 rounded-md border">
                        {botStickers.map((stk, idx) => (
                          <img key={idx} src={stk} alt="stk" onClick={() => setSelectedSticker(stk)} className={`w-12 h-12 rounded cursor-pointer border-2 ${selectedSticker === stk ? 'border-blue-500 bg-blue-100' : 'border-white'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Auto Start Scenario
                  </span>

                  <input
                    type="checkbox"
                    checked={autoStartScenario}
                    onChange={(e) =>
                      setAutoStartScenario(
                        e.target.checked
                      )
                    }
                    className="w-4 h-4"
                  />
                </div>
                <div className="space-y-4 border-t pt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-gray-800">🤖 Skenario Balasan Bot (Murni Dynamic)</h3>

                  {/* DYNAMIC ROW RENDERER */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-gray-500 block">Daftar Skenario Pesan Bot:</label>
                    
                    {botReplies.map((reply, index) => (
                      <div key={reply.id} className="p-3 bg-white border rounded-lg shadow-sm space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-600 font-mono">Pesan #{index + 1}</span>
                          <button 
                            onClick={() => removeBotReplyRow(reply.id)} 
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <select 
                          value={reply.type} 
                          onChange={(e) => updateBotReplyRow(reply.id, "type", e.target.value)} 
                          className="w-full border text-xs p-1 rounded outline-none"
                        >
                          <option value="text">Teks / Link URL Website</option>
                          <option value="image">Link Gambar Media</option>
                          <option value="sticker">Sticker (Gunakan yang Diaktifkan di Atas)</option>
                        </select>
                        <select
                          value={reply.mode}
                          onChange={(e) =>
                            updateBotReplyRow(
                              reply.id,
                              "mode",
                              e.target.value
                            )
                          }
                          className="w-full border text-xs p-1 rounded outline-none"
                        >
                          <option value="wait">
                            Tunggu User
                          </option>

                          <option value="auto">
                            Lanjut Otomatis
                          </option>

                        </select>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            Delay (ms)
                          </label>

                          <input
                            type="number"
                            value={reply.delay}
                            onChange={(e) =>
                              updateBotReplyRow(
                                reply.id,
                                "delay",
                                Number(e.target.value)
                              )
                            }
                            className="w-full border rounded p-1 text-xs"
                          />
                        </div>

                        {reply.type !== "sticker" && (
                          <textarea 
                            value={reply.value} 
                            onChange={(e) => updateBotReplyRow(reply.id, "value", e.target.value)} 
                            className="w-full border text-xs p-1 rounded outline-none resize-none" 
                            rows="2" 
                            placeholder={reply.type === "image" ? "Masukkan URL Gambar Langsung..." : "Ketik isi pesan teks..."} 
                          />
                        )}
                      </div>
                    ))}

                    <button 
                      onClick={addBotReplyRow}
                      className="w-full py-2 bg-white border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50/50 transition-colors"
                    >
                      <Plus size={14} /> Tambah Skenario Jawaban Baru
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* WHATSAPP FULLSCREEN MEDIA LIGHTBOX */}
      <AnimatePresence>
        {lightboxMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between items-center p-4">
            <div className="w-full flex justify-end"><button onClick={() => setLightboxMedia(null)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={26} /></button></div>
            <div className="flex-1 w-full max-w-3xl max-h-[80vh] flex items-center justify-center">
              {lightboxMedia.type === "image" ? <img src={lightboxMedia.url} className="max-w-full max-h-full object-contain rounded" alt="preview" /> : <video src={lightboxMedia.url} controls autoPlay className="max-w-full max-h-full object-contain rounded" />}
            </div>
            <div className="h-10 text-gray-500 text-xs font-medium">Media Fullscreen View</div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}