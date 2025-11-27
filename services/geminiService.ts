import { FormData } from "../types";
import { blessingTemplates } from "./blessingTemplates";

// Client-side email summary (local only)
export const generateEmailSummary = async (data: FormData): Promise<string> => {
  return `Name: ${data.fullName}\nAttendance: ${data.attendance}\nPeople: ${data.attendeeCount}\nPhone: ${data.phone}\nRelation: ${data.relationship}\nChild Seats: ${data.childSeats}\nVeg Meals: ${data.vegetarianCount}\nNote: ${data.comments}`;
};

// Use pre-generated blessing templates library. No external API calls, no errors thrown.
export const generateGuestMessage = async (style: string, guestName: string): Promise<string> => {
  const name = (guestName || '').trim() || '朋友';
  const styleKey = (style && typeof style === 'string') ? style.toLowerCase() : 'happy';
  const templatePool = blessingTemplates[styleKey] || blessingTemplates['happy'];
  
  // Pick random template and replace {name} placeholder
  const randomTemplate = templatePool[Math.floor(Math.random() * templatePool.length)];
  return randomTemplate.replace(/{name}/g, name);
};
