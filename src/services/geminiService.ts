import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, HealthAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzePetHealth = async (petType: string, breed: string, symptoms: string, language: string = 'id', base64Image?: string): Promise<HealthAnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  
  const prompt = `You are an expert AI Veterinary Assistant. Analyze the following symptoms for a ${petType} (${breed}):
Symptoms: ${symptoms}

${base64Image ? "An image of the affected area has been provided." : ""}

Provide:
1. Potential Diagnosis (Clear name)
2. Detailed Description of the condition
3. Care Instructions (Immediate steps the owner can take at home)
4. Vet Urgency (Must be one of: low, medium, high)

Safety Warning: Always suggest a vet visit if the user is truly concerned. This is AI assistance, not a final medical diagnosis.

IMPORTANT: You MUST provide all text descriptions (diagnosis, description, and careInstructions) in ${targetLang}.
Return the result in JSON format.`;

  try {
    const parts: any[] = [{ text: prompt }];
    
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1] || base64Image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING },
            description: { type: Type.STRING },
            careInstructions: { type: Type.STRING },
            vetUrgency: { type: Type.STRING, enum: ["low", "medium", "high"] },
          },
          required: ["diagnosis", "description", "careInstructions", "vetUrgency"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI failed to generate health analysis");
    
    return JSON.parse(text) as HealthAnalysisResult;
  } catch (error: any) {
    console.error("AI analyzePetHealth failed:", error);
    if (language === 'en') {
      throw new Error("Failed to analyze pet health symptoms. Please provide more details or try a clearer photo.");
    }
    throw new Error("Gagal menganalisis gejala kesehatan hewan. Harap berikan detail lebih banyak atau coba foto yang lebih jelas.");
  }
};

export const analyzePetPhoto = async (base64Image: string, language: string = 'id'): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  
  const prompt = `Analyze this pet photo and provide:
1. Category (One of: Cat, Dog, Bird, Other)
2. Breed Detection
3. Age Estimation (based on visual cues)
4. Energy Level (Calm, Moderate, High, Very High)
5. Personalized Care Plan (3 practical tips)
6. DIY Pet Hacks (2 creative ideas)
7. Dynamic food safety checker for common foods like Chocolate, Grapes, Onions, and Avocado.
8. Food Recommendations: List 3-5 recommended food items specifically for this breed/category. Format as clean markdown list.
9. Nutrition Tip: A single, helpful utility tip for this pet (max 1 sentence).

IMPORTANT: You MUST provide all descriptive text fields (breed, ageEstimation, energyLevel, carePlan, diyHacks, foodSafety, foodRecommendations, nutritionTip) in friendly and helpful ${targetLang}.
Return the result in JSON format.`;

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
      if (language === 'en') {
        throw new Error("AI quota reached. Please wait a moment and try again.");
      }
      throw new Error("Batas analisis AI tercapai. Harap tunggu sebentar dan coba lagi nanti.");
    }
    if (language === 'en') {
      throw new Error("Failed to analyze pet photo. Please try a clearer image.");
    }
    throw new Error("Gagal menganalisis foto hewan. Silakan coba gambar yang lebih jelas.");
  }
};

export const checkFoodSafety = async (food: string, petType: string, language: string = 'id'): Promise<string> => {
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain if ${food} is safe for a ${petType} to eat. Provide a brief, accurate explanation in ${targetLang}.`,
    });
    if (language === 'en') {
      return response.text ?? "Cannot determine safety. Consult a vet if unsure.";
    }
    return response.text ?? "Tidak dapat menentukan keamanan. Harap konsultasikan dengan dokter hewan jika Anda ragu.";
  } catch (error: any) {
    console.error("AI checkFoodSafety failed:", error);
    if (language === 'en') {
      return `**AI Limit Reached:** Always consult a vet before giving **${food}** to your **${petType}**.`;
    }
    return `**Batas AI Tercapai (Analisis tidak tersedia):** Demi keselamatan, harap konsultasikan dengan dokter hewan sebelum memberikan **${food}** kepada **${petType}** Anda.`;
  }
}

export const getNutritionTip = async (time: string, petBreed: string, language: string = 'id'): Promise<string> => {
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, helpful nutrition tip for a ${petBreed} based on ${time} feeding. Provide in brief ${targetLang} (max 1 sentence).`,
    });
    if (language === 'en') {
      return response.text ?? "Ensure portion sizes match your pet's activity level.";
    }
    return response.text ?? "Pastikan ukuran porsi sesuai dengan tingkat aktivitas hewan peliharaan Anda.";
  } catch (error: any) {
    console.error("AI getNutritionTip failed:", error);
    const fallbacksEn = [
      "Always keep fresh drinking water available at all times.",
      "Consistency in feeding times helps maintain a healthy metabolism.",
      "Monitor your pet's weight and adjust portions as needed.",
      "High-quality protein is vital for muscle maintenance.",
      "Avoid feeding table scraps to maintain nutritional balance."
    ];
    const fallbacksId = [
      "Pastikan air minum segar selalu tersedia setiap saat.",
      "Konsistensi waktu makan membantu menjaga metabolisme yang sehat.",
      "Pantau berat badan peliharaan Anda dan sesuaikan porsi jika diperlukan.",
      "Protein berkualitas tinggi sangat penting untuk pemeliharaan otot.",
      "Hindari memberikan sisa makanan meja untuk menjaga keseimbangan nutrisi."
    ];
    const pool = language === 'en' ? fallbacksEn : fallbacksId;
    const prefix = language === 'en' ? '**AI Limit Info:**' : '**Info Batas AI:**';
    return `${prefix} ${pool[Math.floor(Math.random() * pool.length)]}`;
  }
}

export const getCollectiveProTip = async (pets: any[], language: string = 'id'): Promise<string> => {
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  if (pets.length === 0) {
    return language === 'en' ? "Start scanning your pets for collective insights!" : "Mulai scan peliharaanmu untuk mendapatkan saran kolektif yang personal!";
  }
  
  try {
    const petDescriptions = pets.map(p => `${p.name} (a ${p.breed})`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User owns the following pets: ${petDescriptions}. 
      Give a single, highly specific and creative 'Pro-Tip' for managing these pets collectively or improving their shared environment. 
      Use warm, professional, smart, and concise ${targetLang} (max 2-3 sentences).`,
    });
    if (language === 'en') {
      return response.text ?? "Consistent routines are key to a happy multi-pet household.";
    }
    return response.text ?? "Rutin yang konsisten adalah kunci kebahagiaan rumah tangga dengan banyak hewan peliharaan.";
  } catch (error: any) {
    console.error("AI getCollectiveProTip failed:", error);
    const prefix = language === 'en' ? '**AI Limit Info:**' : '**Info Batas AI:**';
    const text = language === 'en' ? "Focus on establishing independent playtimes and personal safe spaces for each of your unique pets." : "Fokuslah untuk membangun waktu bermain mandiri dan ruang aman pribadi untuk masing-masing peliharaan Anda yang unik.";
    return `${prefix} ${text}`;
  }
}

export const getFoodRecommendations = async (petCategory: string, breed: string, language: string = 'id'): Promise<string> => {
  const targetLang = language === 'id' ? 'Bahasa Indonesia' : 'English';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a list of 3-5 recommended food items or ingredients specifically for a ${petCategory} (${breed}). 
      Include why they are beneficial and serving suggestions. 
      Format as a clean, concise markdown list in ${targetLang}.`,
    });
    if (language === 'en') {
      return response.text ?? "High-quality vitamins and balanced nutrition are vital.";
    }
    return response.text ?? "Protein berkualitas tinggi dan nutrisi seimbang sangat penting untuk kesehatan hewan peliharaan Anda.";
  } catch (error: any) {
    console.error("AI getFoodRecommendations failed:", error);
    
    const genericTipsEn: Record<string, string> = {
      'Dog': "- **High-Quality Kibble**: Look for meat as first ingredient.\n- **Boiled Chicken**: Great for sensitive stomachs.\n- **Carrots**: Healthy low-calorie crunch for teeth.\n- **Blueberries**: Antioxidant-rich treats.",
      'Cat': "- **Wet Food**: Vital for hydration and kidney health.\n- **Salmon/Tuna**: In moderation, provides essential Omega-3s.\n- **Cooked Eggs**: High-protein snack.\n- **Catnip/Cat Grass**: Aids in digestion.",
      'Bird': "- **Pellets**: Foundation of a balanced bird diet.\n- **Leafy Greens**: Spinach and kale provide essential vitamins.\n- **Fresh Fruit**: Apple slices (no seeds) or berries.\n- **Sprouted Seeds**: More nutritious than dry seeds.",
      'Other': "- **Timothy Hay**: Essential for many small mammals like rabbits.\n- **Fresh Veggies**: Daily variety ensures nutrient intake.\n- **Species-Specific Pellets**: Consult guides for your specific pet type."
    };

    const genericTipsId: Record<string, string> = {
      'Dog': "- **Kibble Berkualitas Tinggi**: Cari yang bahan pertamanya adalah daging.\n- **Ayam Rebus**: Sangat baik untuk pencernaan yang sensitif.\n- **Wortel**: Camilan sehat rendah kalori yang baik untuk kesehatan gigi.\n- **Blueberry**: Camilan yang kaya akan antioksidan.",
      'Cat': "- **Makanan Basah**: Penting untuk hidrasi dan kesehatan ginjal.\n- **Salmon/Tuna**: Dalam jumlah sedang, memberikan Omega-3 esensial.\n- **Telur Matang**: Camilan tinggi protein.\n- **Catnip/Rumput Kucing**: Membantu pencernaan.",
      'Bird': "- **Pelet**: Dasar dari diet burung yang seimbang.\n- **Sayuran Hijau**: Bayam dan kale memberikan vitamin esensial.\n- **Buah Segar**: Irisan apel (tanpa biji) atau beri.\n- **Biji Berkecambah**: Lebih bergizi daripada biji kering.",
      'Other': "- **Timothy Hay**: Esensial untuk banyak mamalia kecil seperti kelinci.\n- **Sayuran Segar**: Variasi harian memastikan asupan nutrisi.\n- **Pelet Spesifik Spesies**: Konsultasikan panduan untuk jenis hewan peliharaan Anda."
    };

    const pool = language === 'en' ? genericTipsEn : genericTipsId;
    const prefix = language === 'en' ? '**AI Limit Reached (Showing General Recommendations):**' : '**Batas AI Tercapai (Menampilkan Rekomendasi Umum):**';
    const footer = language === 'en' ? '*Please consult a vet for specific dietary plans.*' : '*Harap konsultasikan dengan dokter hewan untuk rencana diet yang spesifik.*';
    const fallback = pool[petCategory] || pool['Other'];
    return `${prefix}\n\n${fallback}\n\n${footer}`;
  }
}

