require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(bodyParser.json());

// Support both `GENAI_API_KEY` (preferred) and `GEMINI_API_KEY` (older README)
const API_KEY = process.env.GENAI_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('GENAI_API_KEY or GEMINI_API_KEY is not set in server environment. Proxy will not work.');
}

const client = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Fallback generator when no external API key is configured.
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n = 2) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(pick(arr));
  return out;
};

const templates = {
  sentimental: [
    (name) => `${name} 見證了你們的愛情，願你們相伴一生，白頭偕老！`,
    (name) => `在這美好時刻，${name} 祝福你們溫暖相守、幸福綿長。`,
  ],
  humorous: [
    (name) => `恭喜你們！${name} 建議先把甜點藏好，不然會被搶光。`,
    (name) => `${name} 保證今天不搶麵包，但會搶紅包，祝你們日子笑聲滿滿！`,
  ],
  happy: [
    (name) => `太棒了！${name} 與大家一起歡慶，祝你們永遠充滿歡笑。`,
  ],
  poem: [
    (name) => `${name} 祝：花開並蒂，良緣長久；琴瑟和鳴，共結連理。`,
  ],
};

function generateFallback(style, guestName) {
  const name = (guestName || '朋友').trim();
  const key = style ? String(style).toLowerCase() : 'happy';
  const pool = templates[key] || templates['happy'];
  try {
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx](name) || '祝你們百年好合！';
  } catch (e) {
    return '祝你們百年好合！';
  }
}

// Simple health check
    // If no API key is configured, return a safe local fallback so the app still works
    if (!API_KEY) {
      const text = generateFallback(style, guestName);
      return res.json({ text });
    }

    // Build a minimal prompt similar to previous client logic
    const prompt = `Task: Write a short wedding wish in Traditional Chinese for Red (仁德) & Claire (雯惠).\nGuest Name: ${guestName || '朋友'}\nStyle: ${style}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ text: response.text });
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ text: response.text });
  } catch (err) {
    console.error('Proxy /api/generate error:', err);
    const status = err && err.code ? err.code : 500;
    return res.status(500).json({ error: 'generate_failed', details: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
