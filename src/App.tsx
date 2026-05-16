/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { Splash } from './components/Splash';
import { Dashboard } from './components/Dashboard';
import { PetAnalysis } from './components/PetAnalysis';
import { CameraModal } from './components/CameraModal';
import { UserProfile } from './components/UserProfile';
import { NotificationPopup } from './components/NotificationPopup';
import { LogoutAnimation } from './components/LogoutAnimation';
import { PetProfile, AnalysisResult, AppNotification, UserProfile as UserProfileType, HealthLog } from './types';
import { analyzePetPhoto } from './services/geminiService';
import { resizeImage } from './lib/imageResizer';
import { Loader2, Camera, Check, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { orderBy, limit } from 'firebase/firestore';
import { useLanguage } from './contexts/LanguageContext';

type Screen = 'splash' | 'dashboard' | 'analysis' | 'profile';

export default function App() {
  const { language, t } = useLanguage();
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [allHealthLogs, setAllHealthLogs] = useState<HealthLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<'camera' | 'gallery' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<{ image: string, result: AnalysisResult, id?: string, name?: string } | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activePopup, setActivePopup] = useState<AppNotification | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    throw new Error(JSON.stringify(errInfo));
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
    // Sync User Profile from Firestore (for extra metadata like photoURL which might be too long for Auth)
    if (!user?.uid) return;

    const userRef = doc(db, `users/${user.uid}`);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUser(prev => prev ? {
          ...prev,
          displayName: data.displayName || prev.displayName,
          photoURL: data.photoURL || prev.photoURL
        } : null);
      }
    }, (error) => {
      console.warn("User profile sync failed:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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

  useEffect(() => {
    // Notifications Listener
    if (!user) {
      setNotifications([]);
      return;
    }

    const path = `users/${user.uid}/notifications`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    
    const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isRecentlyCreated = data.createdAt?.toMillis ? (Date.now() - data.createdAt.toMillis() < 30000) : false;
          
          if (!data.isRead && isRecentlyCreated) {
            setActivePopup({
              id: change.doc.id,
              text: data.text,
              type: data.type || 'info',
              time: t.common.now
            });
          }
        }
      });

      const notifs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          time: data.createdAt?.toDate ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { hour: 'numeric', minute: 'numeric' }).format(data.createdAt.toDate()) : t.common.now
        } as AppNotification;
      });
      setNotifications(notifs);
    }, (error) => {
      console.error("Notifications listener failed:", error);
      handleFirestoreError(error, 'LIST', path);
    });

    return () => unsubscribeNotifs();
  }, [user]);

  useEffect(() => {
    // Global Health Logs Listener (across all pets)
    if (!user || pets.length === 0) {
      setAllHealthLogs([]);
      return;
    }

    // Since we can't easily use collectionGroup without manually creating indexes,
    // we'll listen to logs for all pets and combine them.
    // For a large number of pets this isn't ideal, but for this app it's fine.
    const unsubscribes: (() => void)[] = [];
    const logsMap: Record<string, HealthLog[]> = {};

    pets.forEach(pet => {
      const path = `users/${user.uid}/pets/${pet.id}/healthLogs`;
      const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(5));
      
      const unsub = onSnapshot(q, (snapshot) => {
        logsMap[pet.id] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          petName: pet.name // Add pet name for context in global view
        } as HealthLog));
        
        // Flatten and sort all logs
        const flattened = Object.values(logsMap).flat().sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setAllHealthLogs(flattened);
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(u => u());
  }, [user, pets.length]); // Re-run if pets list changes

  useEffect(() => {
    // Health Logs Listener (only for the selected pet)
    const petId = currentAnalysis?.id;
    if (!user || !petId) {
      setHealthLogs([]);
      return;
    }

    const path = `users/${user.uid}/pets/${petId}/healthLogs`;
    console.log(`Starting health logs listener for: ${path}`);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribeHealth = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HealthLog));
      setHealthLogs(logs);
    }, (error) => {
      console.error("Health logs listener failed:", error);
      // Not using handleFirestoreError here to avoid blocking UI if it's just a permissions delay
    });

    return () => unsubscribeHealth();
  }, [user, currentAnalysis?.id]);

  // Global Feeding Reminders Logic
  const lastNotifiedMinute = useRef<string | null>(null);

  useEffect(() => {
    if (!user || pets.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentTime === lastNotifiedMinute.current) return;

      pets.forEach(pet => {
        if (!pet.feedingRemindersEnabled || !pet.feedingTimes) return;
        
        const times = Object.values(pet.feedingTimes);
        if (times.includes(currentTime)) {
          lastNotifiedMinute.current = currentTime;
          const message = t.notifications.feedingReminder.replace('{name}', pet.name);
          
          // Add to local notifications and show popup
          addNotification(message, 'reminder');

          // Native browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(t.notifications.reminderTitle, {
              body: message,
              icon: pet.imageUrl,
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [user, pets, language]);

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

  const addNotification = async (text: string, type: 'info' | 'reminder' = 'info') => {
    if (!user) return;
    
    const path = `users/${user.uid}/notifications`;
    try {
      const data = {
        text,
        type,
        ownerId: user.uid,
        isRead: false,
        createdAt: serverTimestamp()
      };

      // Remove undefined values
      const sanitizedData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, path), sanitizedData);

      // Show popup for reminders or important info
      if (type === 'reminder') {
        setActivePopup({ id: docRef.id, text, type, time: t.common.now });
      }
    } catch (error) {
      console.error("Failed to add notification", error);
      handleFirestoreError(error, 'WRITE', path);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/notifications/${id}`;
    try {
      await updateDoc(doc(db, path), { isRead: true });
    } catch (error) {
      console.error("Mark notification as read failed", error);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const path = `users/${user.uid}/notifications`;
    const promises = unread.map(n => updateDoc(doc(db, `${path}/${n.id}`), { isRead: true }));
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Mark notifications as read failed", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/notifications/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      console.error("Delete notification failed", error);
      handleFirestoreError(error, 'DELETE', path);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    const path = `users/${user.uid}/notifications`;
    // For simplicity, we loop and delete. In a real app we'd use a batch.
    const promises = notifications.map(n => deleteDoc(doc(db, `${path}/${n.id}`)));
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Clear notifications failed", error);
      handleFirestoreError(error, 'DELETE', path);
    }
  };

  const handleUpdateProfile = async (updates: { displayName?: string, photoURL?: string }) => {
    if (!auth.currentUser || !user) return;

    try {
      // 1. Update Auth Profile (only displayName if photoURL is a long base64 string)
      // Firebase Auth photoURL has a strict limit (approx 2KB).
      const authUpdates: any = { displayName: updates.displayName };
      if (updates.photoURL && updates.photoURL.length < 2000) {
        authUpdates.photoURL = updates.photoURL;
      }

      await updateProfile(auth.currentUser, authUpdates);

      // 2. Update Firestore User Document (Always store the full photo here)
      const userRef = doc(db, `users/${user.uid}`);
      await setDoc(userRef, {
        ...updates,
        uid: user.uid,
        email: user.email,
        lastLogin: serverTimestamp()
      }, { merge: true });

      // 3. Update local state
      setUser({
        ...user,
        ...updates
      });

      addNotification(t.notifications.successUpdate);
    } catch (error) {
      console.error("Profile update failed", error);
      handleFirestoreError(error, 'WRITE', `users/${user.uid}`);
      throw error;
    }
  };

  const processImage = async (rawBase64: string, source: 'camera' | 'gallery') => {
    setCapturedImage(rawBase64);
    setCaptureSource(source);
    setShowPreview(true);
    setShowCamera(false);
  };

  const startAiAnalysis = async () => {
    if (!capturedImage) return;
    
    setIsAiProcessing(true);
    setShowPreview(false);
    try {
      const base64 = await resizeImage(capturedImage);
      const result = await analyzePetPhoto(base64, language);
      setCurrentAnalysis({ image: base64, result });
      setScreen('analysis');
      setCapturedImage(null);
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert(t.notifications.errorAnalysis);
      setCapturedImage(null);
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
      processImage(b64, 'gallery');
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
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

      const cleanedResult: any = {};
      const result = currentAnalysis.result;
      const allowedResultFields = ['category', 'breed', 'ageEstimation', 'energyLevel', 'carePlan', 'diyHacks', 'foodRecommendations', 'nutritionTip', 'foodSafety'];
      
      allowedResultFields.forEach(field => {
        if ((result as any)[field] !== undefined && (result as any)[field] !== null) {
          cleanedResult[field] = (result as any)[field];
        }
      });

      if (currentAnalysis.id) {
        // Update existing
        await updateDoc(doc(db, `${path}/${currentAnalysis.id}`), {
          ...data,
          ...cleanedResult
        });
      } else {
        // Create new
        await addDoc(collection(db, path), {
          ...data,
          ...cleanedResult,
          imageUrl: currentAnalysis.image,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp() // Ensure it's there for creation too
        });
      }
      
      setScreen('dashboard');
      setCurrentAnalysis(null);
    } catch (error) {
      handleFirestoreError(error, 'WRITE', path);
      alert(t.notifications.errorSave + " " + (error instanceof Error ? error.message : ""));
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
      alert(t.notifications.errorDelete);
    }
  };

  const handleSaveHealthLog = async (log: Omit<HealthLog, 'id' | 'createdAt'>) => {
    const petId = currentAnalysis?.id;
    if (!user || !petId) return;

    const path = `users/${user.uid}/pets/${petId}/healthLogs`;
    try {
      // Create a clean object for Firestore, strictly avoiding undefined values
      const firestoreData: any = {
        petId,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };

      // Copy allowed fields from log if they are defined
      const fields = ['symptoms', 'imageUrl', 'diagnosis', 'description', 'careInstructions', 'vetUrgency'];
      fields.forEach(field => {
        if ((log as any)[field] !== undefined && (log as any)[field] !== null) {
          if (field === 'vetUrgency') {
            firestoreData[field] = String((log as any)[field]).toLowerCase();
          } else {
            firestoreData[field] = (log as any)[field];
          }
        } else if (field === 'symptoms' || field === 'diagnosis' || field === 'description' || field === 'careInstructions') {
          firestoreData[field] = ''; // Fallback for required string fields
        } else if (field === 'vetUrgency') {
          firestoreData[field] = 'medium'; // Default fallback
        }
      });

      await addDoc(collection(db, path), firestoreData);

      // Also update the pet's last health check timestamp and updatedAt
      const petRef = doc(db, `users/${user.uid}/pets/${petId}`);
      await updateDoc(petRef, {
        lastHealthCheck: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to save health log", error);
      handleFirestoreError(error, 'WRITE', path);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
  };

  const finalLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggingOut(false);
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
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
              onDeleteNotification={deleteNotification}
              onClearAllNotifications={clearAllNotifications}
              onMarkNotificationsRead={markNotificationsAsRead}
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
                    foodSafety: t.petAnalysis.readyFor.replace('{category}', (t.petAnalysis.categoriesList as any)[pet.category] || pet.category), // Placeholder for food safety initial text
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
              onSaveHealthLog={handleSaveHealthLog}
              healthLogs={healthLogs}
              addNotification={addNotification}
              notifications={notifications}
              onDeleteNotification={deleteNotification}
              onClearAllNotifications={clearAllNotifications}
              onMarkNotificationsRead={markNotificationsAsRead}
            />
          </motion.div>
        )}

        {screen === 'profile' && user && (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <UserProfile 
              user={user}
              pets={pets}
              healthLogs={allHealthLogs}
              onBack={() => setScreen('dashboard')}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
              notifications={notifications}
              onDeleteNotification={deleteNotification}
              onClearAllNotifications={clearAllNotifications}
              onMarkNotificationsRead={markNotificationsAsRead}
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
            onCapture={(img) => processImage(img, 'camera')}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>

      {/* Image Preview and Confirmation */}
      <AnimatePresence>
        {showPreview && capturedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-8 pb-4 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">{t.camera.previewTitle}</h3>
                <button 
                  onClick={() => {
                    setShowPreview(false);
                    setCapturedImage(null);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-8 pb-8 flex-1">
                <div className="aspect-[4/3] rounded-[32px] overflow-hidden bg-gray-100 border-4 border-white shadow-inner mb-8">
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const wasCamera = captureSource === 'camera';
                      setShowPreview(false);
                      setCapturedImage(null);
                      setCaptureSource(null);
                      if (wasCamera) {
                        setShowCamera(true);
                      }
                    }}
                    className="flex-1 py-5 rounded-3xl bg-gray-100 text-gray-500 font-extrabold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.camera.retake}
                  </button>
                  <button 
                    onClick={startAiAnalysis}
                    className="flex-[1.5] py-5 rounded-3xl bg-brand-orange text-white font-extrabold uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all"
                  >
                    <Check className="w-5 h-5" />
                    {t.camera.confirm}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay for AI */}
      {isAiProcessing && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t.petAnalysis.scanning}</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">{t.petAnalysis.scanningSubtitle}</p>
        </div>
      )}

      {/* Floating Animated In-App Popups */}
      <NotificationPopup 
        notification={activePopup} 
        onClose={(id) => {
          setActivePopup(null);
          markAsRead(id);
        }} 
      />

      <AnimatePresence>
        {isLoggingOut && (
          <LogoutAnimation 
            pets={pets} 
            onComplete={finalLogout} 
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
