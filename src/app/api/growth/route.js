import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');

      if (start === -1 || end === -1) return null;

      const jsonText = text.slice(start, end + 1);
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function buildPrompt({ mode, idea, game, product, targetAudience, style }) {
  const selectedMode = mode || 'meme_video';
  const selectedStyle = style || 'meme tipis NaXaShop';
  const selectedGame = game || 'game populer';
  const selectedProduct = product || 'produk top-up';
  const selectedAudience = targetAudience || 'gamer Indonesia';

  return `
SYSTEM: 
Kamu adalah NaxaAI Growth Assistant, seorang Expert Content Strategist & Copywriter spesialis industri top-up game di Indonesia.

CONTEXT:
NaXaShop adalah platform top-up game. Brand voice NaXaShop:
- Sat-set (cepat & to the point).
- Jujur & transparan (tidak overclaim "paling murah" atau "pasti instan 100%").
- Santai, friendly, semi-meme profesional (bukan korporat kaku).
- Tidak norak dan tidak menjelekkan kompetitor.
- Fokus pada "value" (aman, terlacak, gampang).

TASK:
Buat paket konten marketing (Growth Pack) yang siap posting berdasarkan input berikut:
- Mode Konten: ${selectedMode}
- Game: ${selectedGame}
- Produk: ${selectedProduct}
- Target Audience: ${selectedAudience}
- Style Copywriting: ${selectedStyle}
- Ide Dasar Admin: "${idea}"

CONTENT RULES:
1. Video (12-15 detik, 9:16 format): Buat 4 scene. Teks overlay harus berupa hook yang kuat (contoh: "Lose streak sampe pagi? Obati pake skin baru"). Visual gampang dibikin pakai template CapCut/Canva, jangan minta aset cinematic yang ribet.
2. Caption & Copy: Natural, pakai bahasa tongkrongan gamer yang pas. Wajib ada CTA (Call to Action) ke NaXaShop.
3. SEO: Title & deskripsi jangan keyword stuffing. Pakai natural keywords (top up aman, proses sat set, harga masuk akal).
4. Fleksibilitas: Walaupun modenya bukan video (misal SEO atau WA Broadcast), tetap WAJIB isi semua field JSON dengan relevan (sediakan ide video singkatnya juga).

OUTPUT RULES:
- Wajib balas HANYA dengan JSON murni yang valid.
- DILARANG membungkus dengan markdown block (JANGAN pakai \`\`\` atau \`\`\`json).
- Dilarang memberikan teks pengantar, sapaan, atau penutup di luar JSON.

EXPECTED JSON FORMAT:
{
  "contentAngle": "Sudut pandang konten (misal: Relate dengan penderitaan solo rank yang butuh hiburan)",
  "hook": "1 kalimat pembuka yang bikin orang berhenti scrolling",
  "video": {
    "duration": "15 detik",
    "scenes": [
      {
        "scene": 1,
        "text": "Teks overlay super pendek tapi nendang",
        "visual": "Deskripsi visual sederhana (misal: Background gameplay nyampah)",
        "duration": "3 detik"
      }
    ]
  },
  "caption": "Caption IG/TikTok yang asik dibaca, ada spacing, dan diakhiri CTA ke NaXaShop",
  "hashtags": ["#topupgame", "#naxashop", "#satset"],
  "cta": "Kalimat ajakan bertindak yang halus",
  "bannerText": "Teks bombastis tapi jujur untuk thumbnail",
  "whatsappBroadcast": "Teks WA yang asik dibaca, gunakan emoji secukupnya, tidak kayak bot spam",
  "seo": {
    "title": "Title SEO (max 60 char)",
    "description": "Meta description menarik (max 150 char)",
    "faqs": [
      {
        "question": "Pertanyaan user?",
        "answer": "Jawaban sat-set"
      }
    ]
  },
  "uploadChecklist": [
    "Cek ulang ID player di form",
    "Pastiin sound lagi trending"
  ]
}
`;
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'OPENAI_API_KEY belum diisi di .env.local.',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { mode, idea, game, product, targetAudience, style } = body;

    if (!idea || idea.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          message: 'Isi dulu ide kontennya, Boss.',
        },
        { status: 400 }
      );
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      input: buildPrompt({ mode, idea, game, product, targetAudience, style }),
      max_output_tokens: 1700,
    });

    const rawText = response.output_text?.trim() || '';
    const parsed = safeParseJson(rawText);

    if (!parsed) {
      return NextResponse.json({
        success: true,
        data: {
          contentAngle: 'Output mentah',
          hook: rawText || 'AI tidak mengembalikan jawaban.',
          video: { duration: '-', scenes: [] },
          caption: '',
          hashtags: [],
          cta: '',
          bannerText: '',
          whatsappBroadcast: '',
          seo: { title: '', description: '', faqs: [] },
          uploadChecklist: [],
          raw: rawText,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        contentAngle: parsed.contentAngle || '',
        hook: parsed.hook || '',
        video: {
          duration: parsed.video?.duration || '',
          scenes: toArray(parsed.video?.scenes),
        },
        caption: parsed.caption || '',
        hashtags: toArray(parsed.hashtags),
        cta: parsed.cta || '',
        bannerText: parsed.bannerText || '',
        whatsappBroadcast: parsed.whatsappBroadcast || '',
        seo: {
          title: parsed.seo?.title || '',
          description: parsed.seo?.description || '',
          faqs: toArray(parsed.seo?.faqs),
        },
        uploadChecklist: toArray(parsed.uploadChecklist),
      },
    });
  } catch (error) {
    console.error('AI_GROWTH_ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'NaxaAI Growth lagi error. Coba cek terminal.',
      },
      { status: 500 }
    );
  }
}
