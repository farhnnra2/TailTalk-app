/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { Splash } from './components/Splash';
import { Dashboard } from './components/Dashboard';
import { PetAnalysis } from './components/PetAnalysis';
import { PetProfile, AnalysisResult } from './types';
import { analyzePetPhoto } from './services/geminiService';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'splash' | 'dashboard' | 'analysis';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [isLoding, setIsLoading] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<{ image: string, result: AnalysisResult } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setScreen('dashboard');
        // Load pets
        const q = query(
          collection(db, 'users', u.uid, 'pets')
        );
        const unsubPets = onSnapshot(q, (snapshot) => {
          const petList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PetProfile));
          setPets(petList);
        });
        return unsubPets;
      } else {
        setScreen('splash');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGetStarted = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsAiProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const result = await analyzePetPhoto(base64);
        setCurrentAnalysis({ image: base64, result });
        setScreen('analysis');
      } catch (error) {
        console.error("AI Analysis failed", error);
        alert("Failed to analyze pet photo. Please try again with a clearer image.");
      } finally {
        setIsAiProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePet = async (name: string) => {
    if (!user || !currentAnalysis) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'pets'), {
        name,
        imageUrl: currentAnalysis.image, // In production, upload to Storage. For now, base64 is okay for small protos.
        breed: currentAnalysis.result.breed,
        category: getCategoryFromBreed(currentAnalysis.result.breed),
        ageEstimation: currentAnalysis.result.ageEstimation,
        energyLevel: currentAnalysis.result.energyLevel,
        carePlan: currentAnalysis.result.carePlan,
        diyHacks: currentAnalysis.result.diyHacks,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setScreen('dashboard');
      setCurrentAnalysis(null);
    } catch (error) {
      console.error("Failed to save pet", error);
    }
  };

  const getCategoryFromBreed = (breed: string): string => {
    const b = breed.toLowerCase();
    if (b.includes('cat') || b.includes('kitten') || b.includes('siamese') || b.includes('persian')) return 'Cat';
    if (b.includes('dog') || b.includes('puppy') || b.includes('retriever') || b.includes('bulldog')) return 'Dog';
    if (b.includes('bird') || b.includes('parrot') || b.includes('owl')) return 'Bird';
    return 'Other';
  };

  if (isLoding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-cream relative">
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Splash onGetStarted={handleGetStarted} />
          </motion.div>
        )}
        
        {screen === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard 
              pets={pets} 
              onScanPhoto={() => fileInputRef.current?.click()} 
              onSelectPet={(pet) => {
                setCurrentAnalysis({ 
                  image: pet.imageUrl, 
                  result: { 
                    breed: pet.breed, 
                    ageEstimation: pet.ageEstimation, 
                    energyLevel: pet.energyLevel,
                    carePlan: pet.carePlan,
                    diyHacks: pet.diyHacks,
                    foodSafety: "Ask me about food safety!"
                  } 
                });
                setScreen('analysis');
              }}
            />
          </motion.div>
        )}

        {screen === 'analysis' && currentAnalysis && (
          <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PetAnalysis 
              image={currentAnalysis.image} 
              analysis={currentAnalysis.result} 
              onBack={() => setScreen('dashboard')}
              onSave={handleSavePet}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="image/*" 
      />

      {/* Loading Overlay for AI */}
      {isAiProcessing && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Pet...</h3>
          <p className="text-gray-500">Gemini is identifying breeds, estimating age, and preparing personalized care tips for your friend.</p>
        </div>
      )}
    </div>
  );
}
