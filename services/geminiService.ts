import { GoogleGenAI, Type } from "@google/genai";
import { Game, Platform, User } from '../types';

// Safe access to API Key
const getApiKey = () => {
    try {
        // @ts-ignore
        return import.meta.env?.VITE_API_KEY || '';
    } catch (e) {
        return '';
    }
}

const apiKey = getApiKey();
// Initialize only if key exists to avoid immediate crash, handle call errors later
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getGameRecommendations = async (
  users: User[],
  currentGames: Game[]
): Promise<Game[]> => {
  if (!ai) {
      console.warn("Gemini API Key missing. Recommendations disabled.");
      return [];
  }
  try {
    const userPlatforms = Array.from(new Set(users.flatMap(u => u.platforms))).join(', ');
    const existingTitles = currentGames.map(g => g.title).join(', ');

    const prompt = `
      You are a gaming expert system.
      Current users have these platforms available: ${userPlatforms}.
      The room already has these games in consideration: ${existingTitles}.
      
      Recommend 3 distinct cooperative video games that are NOT in the list above.
      They must be playable on at least one of the users' platforms.
      
      Return a JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              genre: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || '[]');
    
    // Map response to Game interface (generating IDs and mock images)
    return rawData.map((item: any, index: number) => ({
      id: `rec-${Date.now()}-${index}`,
      title: item.title,
      description: item.description,
      imageUrl: `https://picsum.photos/400/225?random=${100 + index}`,
      genre: item.genre, // Simple mapping, might need adjustment
      platforms: [Platform.PC], // Default fallback
      votes: 0,
      tags: item.tags || ['Co-op']
    }));

  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
};

export const generateBotChat = async (lastMessage: string, context: string): Promise<string> => {
    if (!ai) return "System Offline (Config Missing)";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
            Context: ${context}
            Last User Message: "${lastMessage}"
            
            You are a helpful gaming bot assistant named "Co-op Bot". 
            Reply shortly and enthusiastically to the user. Use gaming slang occasionally.
            Max 2 sentences.
            `
        });
        return response.text || "Game on! 🎮";
    } catch (e) {
        return "System offline... reconnecting.";
    }
}