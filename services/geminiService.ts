import { GoogleGenAI } from "@google/genai";
import { FormData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEmailSummary = async (data: FormData): Promise<string> => {
  try {
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
    let stylePrompt = "";
    // INTENSIFIED STYLES
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
      default: 
        stylePrompt = "真誠且禮貌的祝福。";
    }

    // Simplified prompt structure for better speed
    const prompt = `
      Write a wedding wish in Traditional Chinese (Taiwan) for Red & Claire.
      
      Guest Name: ${guestName || 'Friend'}
      Style: ${stylePrompt}
      
      Keep it short (under 40 words).
      Output ONLY the message text.
    `;

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