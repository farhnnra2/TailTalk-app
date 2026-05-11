import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzePetPhoto = async (base64Image: string): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this pet photo and provide:
1. Category (Strictly one of: Cat, Dog, Bird, Other)
2. Breed Detection
3. Age Estimation (based on visual cues)
4. Energy Level (Calm, Moderate, High, Very High)
5. A Personalized Care Plan (3 actionable tips)
6. DIY Pet Hacks (2 creative ideas)
7. A 'Is This Food Safe?' dynamic checker for common foods like Chocolate, Grapes, Onions, and Avocado.
8. Food Recommendations: A list of 3-5 recommended food items or ingredients specifically suitable for this breed/category. Format as clean markdown list.
9. Nutrition Tip: A short, helpful nutrition tip for this specific pet (max 1 sentence).

Return the result strictly in JSON format.`;

  try {
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
            category: { type: Type.STRING },
            breed: { type: Type.STRING },
            ageEstimation: { type: Type.STRING },
            energyLevel: { type: Type.STRING },
            carePlan: { type: Type.STRING },
            diyHacks: { type: Type.STRING },
            foodSafety: { type: Type.STRING },
            foodRecommendations: { type: Type.STRING },
            nutritionTip: { type: Type.STRING },
          },
          required: ["category", "breed", "ageEstimation", "energyLevel", "carePlan", "diyHacks", "foodSafety", "foodRecommendations", "nutritionTip"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI failed to generate analysis");
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error: any) {
    console.error("AI analyzePetPhoto failed:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      throw new Error("AI analysis limit reached. Please wait a moment and try again later.");
    }
    throw new Error("Failed to analyze pet photo. Please try a clearer image.");
  }
};

export const checkFoodSafety = async (food: string, petType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain if ${food} is safe for a ${petType} to eat. Be concise and accurate.`,
    });
    return response.text ?? "Unable to determine safety. Please consult a vet if you're unsure.";
  } catch (error: any) {
    console.error("AI checkFoodSafety failed:", error);
    return `**AI Limit Reached (Analysis unavailable):** For safety, please consult a veterinarian before feeding **${food}** to your **${petType}**.`;
  }
}

export const getNutritionTip = async (time: string, petBreed: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Give a short, helpful nutrition tip for a ${petBreed} based on the feeding time ${time}. Be concise (max 1 sentence).`,
    });
    return response.text ?? "Ensure portion sizes are appropriate for your pet's activity level.";
  } catch (error: any) {
    console.error("AI getNutritionTip failed:", error);
    // Generic useful fallback tips
    const fallbacks = [
      "Keep fresh water available at all times.",
      "Consistency in feeding times helps maintain a healthy metabolism.",
      "Monitor your pet's weight and adjust portions as needed.",
      "High-quality protein is essential for muscle maintenance.",
      "Avoid feeding table scraps to maintain nutritional balance."
    ];
    return `**AI Limit Info:** ${fallbacks[Math.floor(Math.random() * fallbacks.length)]}`;
  }
}

export const getCollectiveProTip = async (pets: any[]): Promise<string> => {
  if (pets.length === 0) return "Start scanning your pets to get personalized collective advice!";
  
  try {
    const petDescriptions = pets.map(p => `${p.name} (a ${p.breed})`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user owns the following pets: ${petDescriptions}. 
      Provide one highly specific and creative 'Pro-Tip' for managing these pets collectively or improving their shared environment. 
      Be warm, professional, witty and concise (max 2-3 sentences).`,
    });
    return response.text ?? "A consistent routine is the backbone of a happy multi-pet household.";
  } catch (error: any) {
    console.error("AI getCollectiveProTip failed:", error);
    return "**AI Limit Info:** Focus on establishing independent play and private safe spaces for each of your unique pets.";
  }
}

export const getFoodRecommendations = async (petCategory: string, breed: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a list of 3-5 recommended food items or ingredients specifically suitable for a ${petCategory} (${breed}). 
      Include why they are good and any serving suggestions. 
      Format as a clean, concise markdown list.`,
    });
    return response.text ?? "High-quality protein and balanced nutrients are essential for your pet's health.";
  } catch (error: any) {
    console.error("AI getFoodRecommendations failed:", error);
    
    // Generic fallback based on category
    const genericTips: Record<string, string> = {
      'Dog': "- **High-Quality Kibble**: Look for meat as the first ingredient.\n- **Boiled Chicken**: Great for sensitive stomachs.\n- **Carrots**: A healthy, low-calorie crunch for dental health.\n- **Blueberries**: Antioxidant-rich treats.",
      'Cat': "- **Wet Food**: Essential for hydration and kidney health.\n- **Salmon/Tuna**: In moderation, provide essential Omega-3s.\n- **Cooked Eggs**: A high-protein treat.\n- **Catnip/Cat Grass**: Aids in digestion.",
      'Bird': "- **Pellets**: The foundation of a balanced avian diet.\n- **Leafy Greens**: Spinach and kale provide essential vitamins.\n- **Fresh Fruit**: Apple slices (no seeds) or berries.\n- **Sprouted Seeds**: More nutritious than dry seeds.",
      'Other': "- **Timothy Hay**: Essential for many small mammals like rabbits.\n- **Fresh Vegetables**: Daily variety ensures nutrient intake.\n- **Species-Specific Pellets**: Consult a guide for your exact pet type."
    };

    const fallback = genericTips[petCategory] || genericTips['Other'];
    return `**AI Limit Reached (Showing General Recommendations):**\n\n${fallback}\n\n*Please consult a veterinarian for a specific dietary plan.*`;
  }
}
