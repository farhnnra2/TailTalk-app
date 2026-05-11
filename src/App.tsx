/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { Splash } from './components/Splash';
import { Dashboard } from './components/Dashboard';
import { PetAnalysis } from './components/PetAnalysis';
import { CameraModal } from './components/CameraModal';
import { UserProfile } from './components/UserProfile';
import { PetProfile, AnalysisResult, AppNotification, UserProfile as UserProfileType } from './types';
import { analyzePetPhoto } from './services/geminiService';
import { resizeImage } from './lib/imageResizer';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'splash' | 'dashboard' | 'analysis' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<{ image: string, result: AnalysisResult, id?: string, name?: string } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', text: "Welcome to TailTalk! Scan your pet to get started.", time: "Joined", isRead: false }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFirestoreError = (error: unknown, operation: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operation,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    return new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: u.metadata.creationTime || new Date().toISOString()
        });
        setScreen('dashboard');
      } else {
        setUser(null);
        setScreen('splash');
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Pets Listener (only if user is logged in)
    if (!user) {
      setPets([]);
      return;
    }

    const path = `users/${user.uid}/pets`;
    console.log(`Starting pets listener for path: ${path}`);
    const q = query(collection(db, path));
    const unsubscribePets = onSnapshot(q, (snapshot) => {
      console.log(`Pets snapshot received. Count: ${snapshot.size}`);
      const petList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PetProfile));
      setPets(petList);
    }, (error) => {
      console.error(`Pets listener failed for path ${path}:`, error);
      handleFirestoreError(error, 'LIST', path);
    });

    return () => unsubscribePets();
  }, [user]);

  const handleGetStarted = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = (text: string) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      time: "Now",
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const processImage = async (rawBase64: string) => {
    setIsAiProcessing(true);
    try {
      const base64 = await resizeImage(rawBase64);
      const result = await analyzePetPhoto(base64);
      setCurrentAnalysis({ image: base64, result });
      setScreen('analysis');
      setShowCamera(false);
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("Failed to analyze pet photo. Please try again with a clearer image.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      await processImage(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePet = async (name: string, feedingData?: { enabled: boolean, times: { breakfast: string, lunch: string, dinner: string } }, additionalAnalysis?: Partial<AnalysisResult>) => {
    if (!user || !currentAnalysis) return;

    const path = `users/${user.uid}/pets`;
    try {
      const data: any = {
        name,
        updatedAt: serverTimestamp(),
      };

      if (feedingData) {
        data.feedingRemindersEnabled = feedingData.enabled;
        data.feedingTimes = feedingData.times;
      }

      // Include any newly generated analysis parts
      if (additionalAnalysis) {
        if (additionalAnalysis.foodRecommendations) data.foodRecommendations = additionalAnalysis.foodRecommendations;
        if (additionalAnalysis.nutritionTip) data.nutritionTip = additionalAnalysis.nutritionTip;
      }

      if (currentAnalysis.id) {
        // Update existing
        await updateDoc(doc(db, `${path}/${currentAnalysis.id}`), data);
      } else {
        // Create new
        await addDoc(collection(db, path), {
          ...data,
          ...currentAnalysis.result,
          imageUrl: currentAnalysis.image,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      
      setScreen('dashboard');
      setCurrentAnalysis(null);
    } catch (error) {
      handleFirestoreError(error, 'WRITE', path);
      alert("Failed to save pet profile. " + (error instanceof Error ? error.message : ""));
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/pets/${petId}`;
    try {
      await deleteDoc(doc(db, path));
      setScreen('dashboard');
      setCurrentAnalysis(null);
    } catch (error) {
      handleFirestoreError(error, 'DELETE', path);
      alert("Failed to delete pet profile.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream relative overflow-x-hidden">
      <div className="mx-auto w-full max-w-7xl overflow-x-hidden">
        <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Splash onGetStarted={handleGetStarted} />
          </motion.div>
        )}
        
        {screen === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard 
              user={user}
              pets={pets} 
              notifications={notifications}
              onScanPhoto={() => fileInputRef.current?.click()} 
              onOpenCamera={() => setShowCamera(true)}
              onOpenProfile={() => setScreen('profile')}
              onSelectPet={(pet) => {
                setCurrentAnalysis({ 
                  id: pet.id,
                  name: pet.name,
                  image: pet.imageUrl, 
                  result: { 
                    category: pet.category,
                    breed: pet.breed, 
                    ageEstimation: pet.ageEstimation, 
                    energyLevel: pet.energyLevel,
                    carePlan: pet.carePlan,
                    diyHacks: pet.diyHacks,
                    foodSafety: "Ask me about food safety!",
                    foodRecommendations: pet.foodRecommendations,
                    nutritionTip: pet.nutritionTip
                  },
                  feedingData: {
                    enabled: pet.feedingRemindersEnabled || false,
                    times: pet.feedingTimes || { breakfast: '08:00', lunch: '13:00', dinner: '19:00' }
                  }
                } as any);
                setScreen('analysis');
              }}
            />
          </motion.div>
        )}

        {screen === 'analysis' && currentAnalysis && (
          <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PetAnalysis 
              key={currentAnalysis.id || 'new-analysis'}
              image={currentAnalysis.image} 
              analysis={currentAnalysis.result} 
              initialName={currentAnalysis.name}
              isExisting={!!currentAnalysis.id}
              initialFeedingData={(currentAnalysis as any).feedingData}
              onBack={() => setScreen('dashboard')}
              onSave={handleSavePet}
              onUpdateAnalysis={async (updates) => {
                if (!user || !currentAnalysis.id) return;
                const path = `users/${user.uid}/pets/${currentAnalysis.id}`;
                try {
                  await updateDoc(doc(db, path), {
                    ...updates,
                    updatedAt: serverTimestamp()
                  });
                } catch (error) {
                  console.error("Silent analysis update failed", error);
                }
              }}
              onDelete={currentAnalysis.id ? () => handleDeletePet(currentAnalysis.id!) : undefined}
              addNotification={addNotification}
            />
          </motion.div>
        )}

        {screen === 'profile' && user && (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <UserProfile 
              user={user}
              pets={pets}
              onBack={() => setScreen('dashboard')}
              onLogout={handleLogout}
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

      <AnimatePresence>
        {showCamera && (
          <CameraModal 
            onCapture={processImage}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay for AI */}
      {isAiProcessing && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">TailTalk Scanning...</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">TailTalk AI is identifying breeds, estimating age, and preparing personalized care tips for your friend.</p>
        </div>
      )}
      </div>
    </div>
  );
}
