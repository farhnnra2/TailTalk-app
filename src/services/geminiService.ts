import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzePetPhoto = async (base64Image: string): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this pet photo and provide:
1. Breed Detection
2. Age Estimation (based on visual cues)
3. Energy Level (Calm, Moderate, High, Very High)
4. A Personalized Care Plan (3 actionable tips)
5. DIY Pet Hacks (2 creative ideas)
6. A 'Is This Food Safe?' dynamic checker for common foods like Chocolate, Grapes, Onions, and Avocado.

Return the result strictly in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          breed: { type: Type.STRING },
          ageEstimation: { type: Type.STRING },
          energyLevel: { type: Type.STRING },
          carePlan: { type: Type.STRING },
          diyHacks: { type: Type.STRING },
          foodSafety: { type: Type.STRING },
        },
        required: ["breed", "ageEstimation", "energyLevel", "carePlan", "diyHacks", "foodSafety"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("AI failed to generate analysis");
  
  return JSON.parse(text) as AnalysisResult;
};

export const checkFoodSafety = async (food: string, petType: string): Promise<string> => {
   const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Explain if ${food} is safe for a ${petType} to eat. Be concise and accurate.`,
  });
  return response.text ?? "Unable to determine safety.";
}
