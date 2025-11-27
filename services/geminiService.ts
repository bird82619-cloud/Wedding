import { GoogleGenAI } from "@google/genai";
import { FormData } from "../types";

// Helper to safely get the AI client
// We initialize it lazily so the app doesn't crash on startup if the key is missing/undefined
const getAiClient = () => {
  // Try to get the API key from import.meta.env (works in production on GitHub Pages)
  // Fall back to process.env for development
  const apiKey = (import.meta as any).env.VITE_API_KEY || process.env.VITE_API_KEY || (window as any).VITE_API_KEY;
  
  if (!apiKey) {
    console.warn("VITE_API_KEY is not set. AI features will not work.");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEmailSummary = async (data: FormData): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      You are an assistant organizing wedding RSVPs. 
      Format the following data into a clean, easy-to-read summary for the bride and groom.
      
      The goal is to let them quickly see if this person is coming, how many people, and special needs.
      
      Data:
      Guest Name: ${data.fullName}
      Relation: ${data.relationship}
      Attendance Status: ${data.attendance}
      Contact: ${data.phone} / ${data.email}
      
      Logistics:
      - Total Attendees: ${data.attendeeCount}
      - Child Seats Needed: ${data.childSeats}
      - Vegetarian Meals: ${data.vegetarianCount}
      
      Message to Couple: 
      ${data.comments || 'No message provided.'}
      
      Please format this as a plain text email body. Do not use Markdown (like ** bold) as this goes into a raw email body. Just use spacing and dashes.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    // Fallback format if AI fails
    return `
      Wedding RSVP Submission:
      ----------------
      Name: ${data.fullName}
      Attendance: ${data.attendance}
      People: ${data.attendeeCount}
      Phone: ${data.phone}
      Relation: ${data.relationship}
      
      Details:
      Child Seats: ${data.childSeats}
      Veg Meals: ${data.vegetarianCount}
      
      Note: ${data.comments}
    `;
  }
};

export const generateGuestMessage = async (style: string, guestName: string): Promise<string> => {
  try {
    const ai = getAiClient();
    let prompt = "";
    const name = guestName || '我';
    // Add a random seed to force new generation every time
    const randomSeed = Math.floor(Math.random() * 10000); 

    if (style === 'flower') {
      // Dynamic Flower Meme Generation
      prompt = `
        Task: Create a funny, high-energy "Jisoo Flower Meme" style wedding wish for Groom "仁德" (Ren-De) and Bride "雯惠" (Wen-Hui).
        
        Strict Structure Requirement (Keep the rhythm but vary the adjectives):
        "仁德哥哥～雯惠姊姊～${name}來喝喜酒囉！ 來囉來囉～ [Adjective1]～[Adjective2]～ 仁德新郎[Compliment A]！ 哇賽哇賽～ [Adjective3]～[Adjective4]～ 雯惠新娘[Compliment B]！ 恩～？紅包～紅包～ ${name}紅包[Description of Red Envelope]！ 掰掰～我們入席囉～🌹"
        
        Guidelines:
        - Keep the "來囉來囉", "哇賽哇賽", "掰掰" parts exactly as is.
        - Invent creative, exaggerated, slightly funny or meme-like compliments for [Adjective] and [Compliment].
        - Examples for compliments: "無敵帥", "帥到掉渣", "美若天仙", "仙女下凡", "顏值破表".
        - Examples for Red Envelope: "很大包", "有夠厚", "誠意滿滿", "準備好了".
        - Output ONLY the final text in Traditional Chinese.
        - Random Seed: ${randomSeed}
      `;
    } else {
      // Standard Styles
      let stylePrompt = "";
      switch (style) {
        case 'sentimental': 
          stylePrompt = "極度感性、浪漫、催淚。強調命運與永恆的愛，彷彿是電影對白，要讓新人看了感動落淚。"; 
          break;
        case 'humorous': 
          stylePrompt = "非常幽默、搞笑、帶點調侃(Roast)。用輕鬆誇張的口吻，甚至可以開一點無傷大雅的玩笑，不要太正經。"; 
          break;
        case 'happy': 
          stylePrompt = "超級興奮、充滿活力！使用大量驚嘆號，語氣要像是在派對上尖叫歡呼一樣熱情。"; 
          break;
        case 'emotional': 
          stylePrompt = "捨不得、難過、感性。語氣像是一個看著他們長大的長輩或摯友，充滿不捨與深深的祝福。"; 
          break;
        case 'bullshit':
          stylePrompt = "一本正經的胡說八道(唬爛)。極度誇張地編造新郎新娘的荒謬豐功偉業（例如拯救了銀河系、發明了珍奶），把他們吹捧到天上去，越離譜越好笑，完全不合邏輯也沒關係。";
          break;
        case 'familiar':
          stylePrompt = "超級裝熟。假裝是認識幾十年的老死黨，用『嘿兄弟/親愛的』開頭，提到一些模糊的『當年的瘋狂往事』(ex: 記得那次在墾丁嗎?)，語氣要非常油條、親暱。";
          break;
        case 'poem':
          stylePrompt = "創作一首七言絕句或優美的古文。用詞要華麗典雅，展現極高的文學素養，祝福新人百年好合。";
          break;
        case 'rap':
          stylePrompt = "用饒舌(Rap)的風格，要有押韻(Rhyme)、節奏感，用 Yo Yo Check it out 開頭，帥氣地祝福新人。";
          break;
        case 'movie':
          stylePrompt = "像經典電影台詞般充滿戲劇張力。引用或改寫著名的愛情電影對白，賦予這段婚姻史詩般的色彩。";
          break;
        case 'slang':
          stylePrompt = "使用台灣Z世代網路流行語（如：原地結婚、太狠了、超派、暈爛），加上大量 Emoji，風格要很 Chill、很年輕。";
          break;
        case 'chengyu':
          stylePrompt = "連續使用多個吉祥成語串聯，組成排比句，展現傳統文學底蘊，字字珠璣，喜氣洋洋。";
          break;
        default: 
          stylePrompt = "真誠且禮貌的祝福。";
      }

      prompt = `
        Task: Write a short wedding wish in Traditional Chinese (Taiwan) for Red (仁德) & Claire (雯惠).
        
        Guest Name: ${name}
        Style Requirement: ${stylePrompt}
        
        Constraints:
        - Keep it under 60 words.
        - Be creative and specific to the requested style.
        - Make sure each generation is slightly different.
        - Do not output explanations, just the message content.
        - Random Seed: ${randomSeed}
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "祝你們百年好合！";
  } catch (error) {
    console.error("Error generating message:", error);
    return "新婚快樂，永浴愛河！";
  }
};
