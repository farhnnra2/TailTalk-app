import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ChevronDown, ChevronUp, ShieldCheck, Zap, Info, Clock, CheckCircle2, Bell, Utensils, RefreshCw, Stethoscope, Activity, AlertTriangle, Plus, Search, Camera } from 'lucide-react';
import { AnalysisResult, HealthAnalysisResult, HealthLog, AppNotification } from '../types';
import { checkFoodSafety, getNutritionTip, getFoodRecommendations, analyzePetHealth } from '../services/geminiService';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { X } from 'lucide-react';

interface FeedingTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface PetAnalysisProps {
  image: string;
  analysis: AnalysisResult;
  onBack: () => void;
  onSave?: (name: string, feedingData?: { enabled: boolean, times: FeedingTimes }, additionalAnalysis?: Partial<AnalysisResult>) => void;
  onUpdateAnalysis?: (updates: Partial<AnalysisResult>) => void;
  onDelete?: () => void;
  onSaveHealthLog?: (log: Omit<HealthLog, 'id' | 'createdAt'>) => Promise<void>;
  healthLogs?: HealthLog[];
  initialName?: string;
  isExisting?: boolean;
  initialFeedingData?: { enabled: boolean, times: FeedingTimes };
  addNotification?: (text: string, type?: 'info' | 'reminder') => void;
  notifications?: AppNotification[];
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onMarkNotificationsRead?: () => void;
}

export const PetAnalysis: React.FC<PetAnalysisProps> = ({ 
  image, 
  analysis, 
  onBack, 
  onSave, 
  onUpdateAnalysis,
  onDelete,
  onSaveHealthLog,
  healthLogs,
  initialName = '',
  isExisting = false,
  initialFeedingData,
  addNotification,
  notifications = [],
  onDeleteNotification,
  onClearAllNotifications,
  onMarkNotificationsRead
}) => {
  const { language, t } = useLanguage();
  const [activeSections, setActiveSections] = useState<string[]>(['analysis', 'daily']);
  const [foodInput, setFoodInput] = useState('');
  const [foodResult, setFoodResult] = useState('');
  const [isCheckingFood, setIsCheckingFood] = useState(false);
  const [petName, setPetName] = useState(initialName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const hasUnread = notifications.some(n => !n.isRead);

  // Feeding Reminders State
  const [feedingEnabled, setFeedingEnabled] = useState(initialFeedingData?.enabled ?? false);
  const [feedingTimes, setFeedingTimes] = useState<FeedingTimes>(initialFeedingData?.times ?? {
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00'
  });
  const [nutritionTip, setNutritionTip] = useState(analysis.nutritionTip || '');
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [foodRecommendations, setFoodRecommendations] = useState(analysis.foodRecommendations || '');
  const [isLoadingFoodRecs, setIsLoadingFoodRecs] = useState(false);
  const [currentHackIndex, setCurrentHackIndex] = useState(0);

  // Health Section State
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomImage, setSymptomImage] = useState<string | null>(null);
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'health'>('info');
  const symptomFileRef = React.useRef<HTMLInputElement>(null);

  const hacks = React.useMemo(() => {
    if (!analysis.diyHacks) return [];
    // Split by common markdown list markers or numbers
    return analysis.diyHacks
      .split(/\n(?:-|\*|\d+\.)/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }, [analysis.diyHacks]);

  useEffect(() => {
    if (hacks.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentHackIndex(prev => (prev + 1) % hacks.length);
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(timer);
  }, [hacks]);

  const currentHackDisplay = hacks.length > 0 ? (hacks.length > 1 ? `- ${hacks[currentHackIndex]}` : analysis.diyHacks) : '';

  useEffect(() => {
    if (feedingEnabled && !nutritionTip) {
      requestNotificationPermission();
    }
  }, [feedingEnabled]);

  const fetchNutritionTip = async () => {
    setIsLoadingTip(true);
    try {
      const tip = await getNutritionTip(feedingTimes.breakfast, analysis.breed, language);
      setNutritionTip(tip);
      // Persist immediately if it's an existing pet
      if (isExisting && onUpdateAnalysis) {
        onUpdateAnalysis({ nutritionTip: tip });
      }
    } catch (error) {
      console.error("Failed to fetch nutrition tip", error);
    } finally {
      setIsLoadingTip(false);
    }
  };

  const fetchFoodRecommendations = async () => {
    setIsLoadingFoodRecs(true);
    try {
      const recs = await getFoodRecommendations(analysis.category, analysis.breed, language);
      setFoodRecommendations(recs);
      // Persist immediately if it's an existing pet
      if (isExisting && onUpdateAnalysis) {
        onUpdateAnalysis({ foodRecommendations: recs });
      }
    } catch (error) {
      console.error("Failed to fetch food recommendations", error);
    } finally {
      setIsLoadingFoodRecs(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showNotification = (message: string) => {
    // Add to global notification list
    addNotification?.(message, 'reminder');

    const title = t.notifications.reminderTitle;
    const options = {
      body: message,
      icon: image,
      badge: '/badge.png',
      requireInteraction: true,
      tag: 'feeding-reminder',
      renotify: true
    };

    if ('serviceWorker' in navigator && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        }).catch(() => {
          // Fallback to legacy
          new Notification(title, options);
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
          }
        });
      }
    } else {
      // Direct alert fallback if notifications aren't supported
      alert(message);
    }
  };

  const handleTestNotification = () => {
    const testMsg = t.notifications.testAlert.replace('{name}', petName || t.petAnalysis.categoriesList[analysis.category as keyof typeof t.petAnalysis.categoriesList] || analysis.category);
    if (Notification.permission !== 'granted') {
      requestNotificationPermission().then(() => {
        showNotification(testMsg);
      });
    } else {
      showNotification(testMsg);
    }
  };

  const handleHealthAnalysis = async () => {
    if (!symptomInput.trim() && !symptomImage) return;
    setIsAnalyzingHealth(true);
    setHealthAnalysis(null);
    try {
      const result = await analyzePetHealth(analysis.category, analysis.breed, symptomInput, language, symptomImage || undefined);
      setHealthAnalysis(result);
      
      if (isExisting && onSaveHealthLog) {
        // Prepare health log data, ensuring no undefined values for Firestore
        const logData: any = {
          petId: '', // placeholder, App will use the actual pet id
          symptoms: symptomInput || (symptomImage ? "Photo analysis requested" : ""),
          ...result
        };
        
        if (symptomImage) {
          logData.imageUrl = symptomImage;
        }

        await onSaveHealthLog(logData);
        addNotification?.(t.notifications.healthSaved.replace('{name}', petName || t.petAnalysis.categoriesList[analysis.category as keyof typeof t.petAnalysis.categoriesList] || analysis.category), 'info');
      }
    } catch (error) {
      console.error("Health analysis failed", error);
      alert(t.notifications.healthAnalysisFailed);
    } finally {
      setIsAnalyzingHealth(false);
    }
  };

  const handleSymptomFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSymptomImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleSection = (id: string) => {
    setActiveSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleFoodCheck = async () => {
    if (!foodInput.trim()) return;
    setIsCheckingFood(true);
    try {
      const result = await checkFoodSafety(foodInput, analysis.breed, language);
      setFoodResult(result);
    } catch (error) {
      setFoodResult("Error checking safety. Please try again.");
    } finally {
      setIsCheckingFood(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || !petName.trim()) return;
    setIsSaving(true);
    try {
      await onSave(petName, { enabled: feedingEnabled, times: feedingTimes }, { foodRecommendations, nutritionTip });
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-brand-cream overflow-x-hidden">
      {/* Top Background / Image - Responsive: Side by side on LG */}
      <div className="relative h-[45vh] lg:h-screen lg:w-1/2 w-full lg:fixed lg:left-0 lg:top-0">
        <img src={image} referrerPolicy="no-referrer" alt="Pet" className="w-full h-full object-cover" />
        <div className="absolute top-12 left-6 right-6 flex justify-between items-center z-20">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>

          <div className="relative">
            <button 
              onClick={() => {
                const nextState = !showNotifications;
                setShowNotifications(nextState);
                if (nextState && onMarkNotificationsRead) {
                  onMarkNotificationsRead();
                }
              }}
              className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {hasUnread && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Notifications Popover */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 p-6 text-left"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg text-gray-800 lowercase first-letter:uppercase">{t.dashboard.history}</h3>
                    {notifications.length > 0 && onClearAllNotifications && (
                      <button 
                        onClick={onClearAllNotifications}
                        className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {t.dashboard.clearAll}
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.dashboard.inboxEmpty}</p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {notifications.map(n => (
                          <motion.div 
                            key={n.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex gap-3 items-start group relative"
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              n.type === 'reminder' ? "bg-brand-orange" : "bg-blue-400"
                            )} />
                            <div className="flex-1 pr-6 text-left">
                              <p className="text-sm text-gray-700 font-medium leading-[1.3] mb-1">{n.text}</p>
                              <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">{n.time}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDeleteNotification?.(n.id); }}
                              className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content Container - Responsive: Scrollable right side on LG */}
      <div className="relative -mt-12 lg:mt-0 bg-brand-cream rounded-t-[48px] lg:rounded-none px-6 sm:px-12 lg:px-16 pt-10 pb-20 shadow-2xl lg:shadow-none lg:w-1/2 lg:ml-[50%] min-h-screen">
        {/* Name Input for Saving */}
        <div className="mb-10 text-center lg:text-left">
           <input 
            type="text" 
            placeholder={t.petAnalysis.giveNamePlaceholder} 
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 bg-transparent border-b-4 border-brand-orange/10 focus:border-brand-orange outline-none w-full pb-2 transition-all"
          />
          <p className="text-gray-400 mt-4 flex items-center justify-center lg:justify-start gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> {t.petAnalysis.readyFor.replace('{category}', (t.petAnalysis.categoriesList as any)[analysis.category] || analysis.category)}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="relative mb-12 h-24 sm:h-32">
          <AnimatePresence mode="popLayout">
            {!expandedStat ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-3 gap-4 h-full"
              >
                <StatCard 
                  icon={<ShieldCheck className="w-6 h-6 text-blue-500" />} 
                  label={t.petAnalysis.stats.Breed} 
                  value={analysis.breed} 
                  color="bg-blue-50" 
                  onClick={() => setExpandedStat('Breed')}
                />
                <StatCard 
                  icon={<Clock className="w-6 h-6 text-purple-500" />} 
                  label={t.petAnalysis.stats.Age} 
                  value={analysis.ageEstimation} 
                  color="bg-purple-50" 
                  onClick={() => setExpandedStat('Age')}
                />
                <StatCard 
                  icon={<Zap className="w-6 h-6 text-orange-500" />} 
                  label={t.petAnalysis.stats.Energy} 
                  value={analysis.energyLevel} 
                  color="bg-orange-50" 
                  onClick={() => setExpandedStat('Energy')}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="expanded"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "flex items-center gap-6 p-6 rounded-[32px] shadow-lg w-full h-full cursor-pointer relative",
                  expandedStat === 'Breed' ? 'bg-blue-50 text-blue-900' :
                  expandedStat === 'Age' ? 'bg-purple-50 text-purple-900' : 'bg-orange-50 text-orange-900'
                )}
                onClick={() => setExpandedStat(null)}
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm">
                  {expandedStat === 'Breed' && <ShieldCheck className="w-8 h-8 text-blue-500" />}
                  {expandedStat === 'Age' && <Clock className="w-8 h-8 text-purple-500" />}
                  {expandedStat === 'Energy' && <Zap className="w-8 h-8 text-orange-500" />}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-xs uppercase font-black tracking-widest text-gray-400 block mb-1">
                    {t.petAnalysis.detailTitle.replace('{stat}', (t.petAnalysis.stats as any)[expandedStat] || expandedStat)}
                  </span>
                  <span className="text-lg sm:text-xl font-black">
                    {expandedStat === 'Breed' ? analysis.breed :
                     expandedStat === 'Age' ? analysis.ageEstimation :
                     analysis.energyLevel}
                  </span>
                </div>
                <div className="absolute top-4 right-6 text-xs font-bold text-gray-400">{t.petAnalysis.clickToClose}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-6">
          <CollapsibleSection 
            title={t.petAnalysis.carePlanTitle} 
            isOpen={activeSections.includes('care')}
            onToggle={() => toggleSection('care')}
            content={analysis.carePlan}
            icon={<Info className="w-6 h-6 text-brand-orange" />}
            t={t}
          />

          {/* Daily Care Section */}
          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('daily')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Bell className="w-6 h-6 text-brand-orange" />
                <h4 className="font-black text-lg sm:text-xl text-gray-800">{t.petAnalysis.dailyCareTitle}</h4>
              </div>
              {activeSections.includes('daily') ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
            </button>
            <AnimatePresence>
              {activeSections.includes('daily') && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 sm:px-8 pb-8 pt-2"
                >
                  <div className="flex items-center justify-between mb-6 bg-brand-pastel p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-brand-orange" />
                      <span className="font-bold text-gray-700">{t.petAnalysis.feedingReminders}</span>
                    </div>
                    <button 
                      onClick={() => setFeedingEnabled(!feedingEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        feedingEnabled ? "bg-brand-orange" : "bg-gray-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: feedingEnabled ? 24 : 2 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {feedingEnabled && (
                    <motion.div 
                      key="feeding-options"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                          <div key={meal} className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-black text-gray-400 px-1">
                              {meal === 'breakfast' ? t.petAnalysis.mealTimes.breakfast : meal === 'lunch' ? t.petAnalysis.mealTimes.lunch : t.petAnalysis.mealTimes.dinner}
                            </label>
                            <input 
                              type="time" 
                              value={feedingTimes[meal]}
                              onChange={(e) => setFeedingTimes({ ...feedingTimes, [meal]: e.target.value })}
                              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:border-brand-orange outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 p-5 bg-white border border-brand-orange/10 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange/50" />
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-[10px] uppercase font-black text-brand-orange">{t.petAnalysis.nutritionTipTitle}</h5>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={fetchNutritionTip}
                              className="text-[10px] font-bold text-gray-400 hover:text-brand-orange flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${isLoadingTip ? 'animate-spin' : ''}`} /> {t.petAnalysis.regenerate}
                            </button>
                            <button 
                              onClick={handleTestNotification}
                              className="text-[10px] font-bold text-gray-400 hover:text-brand-orange flex items-center gap-1"
                            >
                              <Bell className="w-3 h-3" /> {t.petAnalysis.testNotification}
                            </button>
                          </div>
                        </div>
                        {isLoadingTip ? (
                          <div className="animate-pulse flex space-y-2 flex-col">
                            <div className="h-2 bg-gray-100 rounded w-full"></div>
                            <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 font-medium italic leading-relaxed prose prose-sm max-w-none prose-p:my-0">
                            <ReactMarkdown>{nutritionTip || t.petAnalysis.noTipPlaceholder}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('food-recs')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Utensils className="w-6 h-6 text-brand-orange" />
                <h4 className="font-black text-lg sm:text-xl text-gray-800">{t.petAnalysis.foodRecsTitle}</h4>
              </div>
              {activeSections.includes('food-recs') ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
            </button>
            <AnimatePresence>
              {activeSections.includes('food-recs') && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 sm:px-8 pb-8 pt-2"
                >
                  {isLoadingFoodRecs ? (
                    <div className="animate-pulse flex space-y-3 flex-col py-4">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                      <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-100 rounded w-4/6"></div>
                    </div>
                  ) : (
                    <div className="text-base text-gray-600 leading-relaxed font-medium prose prose-sm max-w-none">
                      <ReactMarkdown>{foodRecommendations}</ReactMarkdown>
                    </div>
                  )}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">{t.petAnalysis.curatedFor.replace('{breed}', analysis.breed)}</div>
                    <button 
                      onClick={fetchFoodRecommendations}
                      className="text-[10px] items-center gap-1 flex font-bold text-brand-orange hover:opacity-70 transition-opacity"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingFoodRecs ? 'animate-spin' : ''}`} /> {t.petAnalysis.regenerate}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('food')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-brand-orange" />
                <h4 className="font-black text-lg sm:text-xl text-gray-800">{t.petAnalysis.foodSafetyTitle}</h4>
              </div>
              {activeSections.includes('food') ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
            </button>
            <AnimatePresence>
              {activeSections.includes('food') && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 sm:px-8 pb-8 pt-2"
                >
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input 
                      type="text" 
                      placeholder={t.petAnalysis.checkFoodPlaceholder} 
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-base outline-none focus:border-brand-orange focus:bg-white transition-all"
                    />
                    <button 
                      onClick={handleFoodCheck}
                      disabled={isCheckingFood}
                      className="bg-brand-orange text-white px-8 py-3 rounded-2xl text-base font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-orange-100 transition-all"
                    >
                      {isCheckingFood ? t.petAnalysis.thinking : t.petAnalysis.checkSafety}
                    </button>
                  </div>
                  {foodResult && (
                    <div className="bg-brand-pastel p-6 rounded-2xl border border-orange-100 text-base text-gray-700 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{foodResult}</ReactMarkdown>
                    </div>
                  )}
                  <div className="mt-4 text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.2em] font-black">{t.petAnalysis.tailTalkRecFor.replace('{breed}', analysis.breed)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <CollapsibleSection 
            title={t.petAnalysis.foodSafetyInsightsTitle} 
            isOpen={activeSections.includes('food-safety-insights')}
            onToggle={() => toggleSection('food-safety-insights')}
            content={analysis.foodSafety}
            icon={<ShieldCheck className="w-6 h-6 text-brand-orange" />}
            t={t}
          />

          {/* Health & Symptoms Section */}
          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('health')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Stethoscope className="w-6 h-6 text-brand-orange" />
                <div className="flex flex-col items-start px-1">
                  <h4 className="font-black text-lg sm:text-xl text-gray-800">{t.petAnalysis.healthCheckTitle}</h4>
                  {isExisting && healthLogs && healthLogs.length > 0 && !activeSections.includes('health') && (
                    <span className="text-[10px] text-brand-orange font-bold uppercase tracking-tighter">
                      {healthLogs.length} {healthLogs.length === 1 ? 'Record' : 'Records'} saved
                    </span>
                  )}
                </div>
              </div>
              {activeSections.includes('health') ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
            </button>
            <AnimatePresence>
              {activeSections.includes('health') && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 sm:px-8 pb-8 pt-2"
                >
                  <div className="space-y-6">
                    <div className="bg-orange-50 rounded-2xl p-4 flex gap-3 items-start border border-orange-100">
                      <Info className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                      <p className="text-xs text-brand-orange/80 font-medium leading-relaxed">
                        {t.petAnalysis.healthCheckInfo} <br/>
                        <strong>{t.petAnalysis.importantLabel}</strong> {t.petAnalysis.healthCheckDisclaimer}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase font-black text-gray-400 ml-1">{t.petAnalysis.symptomsLabel}</label>
                        <textarea 
                          placeholder={t.petAnalysis.symptomsPlaceholder} 
                          value={symptomInput}
                          onChange={(e) => setSymptomInput(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:border-brand-orange focus:bg-white transition-all min-h-[100px] resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <input 
                          type="file" 
                          ref={symptomFileRef}
                          onChange={handleSymptomFileSelect}
                          className="hidden" 
                          accept="image/*"
                        />
                        <button 
                          onClick={() => symptomFileRef.current?.click()}
                          className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
                            symptomImage ? "bg-green-50 text-green-600 border border-green-100" : "bg-white border border-gray-200 text-gray-600"
                          )}
                        >
                          <Camera className="w-4 h-4" />
                          {symptomImage ? t.petAnalysis.photoSelected : t.petAnalysis.uploadSymptomPhoto}
                        </button>
                        {symptomImage && (
                          <button 
                            onClick={() => setSymptomImage(null)}
                            className="text-xs font-bold text-red-500 hover:underline"
                          >
                            {t.petAnalysis.deletePhoto}
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={handleHealthAnalysis}
                        disabled={isAnalyzingHealth || (!symptomInput.trim() && !symptomImage)}
                        className="w-full bg-brand-orange text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-100 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        {isAnalyzingHealth ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            {t.petAnalysis.analyzingHealth}
                          </>
                        ) : (
                          <>
                            <Activity className="w-5 h-5" />
                            {t.petAnalysis.startHealthCheck}
                          </>
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {healthAnalysis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-4 border-t border-gray-100"
                        >
                          <div className={cn(
                            "rounded-3xl p-6 border flex flex-col gap-4",
                            healthAnalysis.vetUrgency === 'high' ? 'bg-red-50 border-red-100' :
                            healthAnalysis.vetUrgency === 'medium' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {healthAnalysis.vetUrgency === 'high' ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <Activity className="w-6 h-6 text-brand-orange" />}
                                <h5 className="font-black text-lg text-gray-900">{healthAnalysis.diagnosis}</h5>
                              </div>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest",
                                healthAnalysis.vetUrgency === 'high' ? 'bg-red-500 text-white' :
                                healthAnalysis.vetUrgency === 'medium' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                              )}>
                                {t.petAnalysis.urgency} {(t.petAnalysis.urgencyLevels as any)[healthAnalysis.vetUrgency] || healthAnalysis.vetUrgency}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 leading-relaxed font-medium">
                              <ReactMarkdown>{healthAnalysis.description}</ReactMarkdown>
                            </div>

                            <div className="bg-white/60 p-4 rounded-2xl space-y-2">
                              <h6 className="text-[10px] uppercase font-black text-gray-400">{t.petAnalysis.careInstructionsLabel}</h6>
                              <div className="text-sm text-gray-700 font-bold leading-relaxed prose prose-sm max-w-none">
                                <ReactMarkdown>{healthAnalysis.careInstructions}</ReactMarkdown>
                              </div>
                            </div>

                            {healthAnalysis.vetUrgency === 'high' && (
                              <div className="flex items-center gap-2 p-3 bg-red-100/50 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-xs font-black text-red-700 uppercase tracking-tighter">{t.petAnalysis.seekHelpUrgent}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* History Section if it exists */}
                    {isExisting && healthLogs && healthLogs.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-[10px] uppercase font-black text-gray-400 ml-1">{t.petAnalysis.healthHistory}</h5>
                        </div>
                        <div className="grid gap-4">
                          {healthLogs.map((log) => (
                            <div key={log.id} className="bg-gray-50/50 p-5 rounded-[28px] border border-gray-100 flex flex-col gap-3 group hover:bg-white hover:shadow-md transition-all">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-base text-gray-900 leading-tight">{log.diagnosis}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      log.vetUrgency === 'high' ? 'bg-red-500' :
                                      log.vetUrgency === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                                    )} />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{t.petAnalysis.urgency} {(t.petAnalysis.urgencyLevels as any)[log.vetUrgency] || log.vetUrgency}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold bg-white px-3 py-1 rounded-full shadow-sm border border-gray-50">
                                  {log.createdAt?.toDate ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(log.createdAt.toDate()) : (language === 'id' ? 'Baru saja' : 'Just now')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500/80 line-clamp-2 font-medium bg-white/40 p-3 rounded-xl italic">"{log.symptoms}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <CollapsibleSection 
            title={t.petAnalysis.petHacksTitle} 
            isOpen={activeSections.includes('hacks')}
            onToggle={() => toggleSection('hacks')}
            content={currentHackDisplay}
            icon={<Zap className="w-6 h-6 text-brand-orange" />}
            isRotating={hacks.length > 1}
            t={t}
          />
        </div>

        <div className="mt-12 flex flex-col gap-4">
          <button 
            onClick={handleSave}
            disabled={isSaving || !petName.trim()}
            className="w-full bg-brand-orange text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-orange-100 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                {t.petAnalysis.saving}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                {t.petAnalysis.saveProfile}
              </>
            )}
          </button>

          {isExisting && (
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="wait">
                {showDeleteConfirm ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 p-6 rounded-[32px] border-2 border-red-100 flex flex-col gap-5 shadow-xl shadow-red-500/5 items-center text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center animate-bounce">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-red-600 font-black text-lg uppercase tracking-tighter leading-none">{t.petAnalysis.reallyQuestions}</h5>
                        <p className="text-red-900/60 font-medium text-xs leading-relaxed">
                          {(t.petAnalysis as any).dramaticWarning.replace('{name}', petName || (t.petAnalysis.categoriesList as any)[analysis.category] || analysis.category)}
                        </p>
                      </div>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                        >
                          {t.petAnalysis.cancel}
                        </button>
                        <button 
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          {isDeleting ? '...' : t.petAnalysis.yesDelete}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-4 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors"
                  >
                    {t.petAnalysis.deleteProfile}
                  </button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CollapsibleSection = ({ 
  title, 
  isOpen, 
  onToggle, 
  content, 
  icon, 
  isRotating,
  t 
}: { 
  title: string, 
  isOpen: boolean, 
  onToggle: () => void, 
  content: string, 
  icon: React.ReactNode, 
  isRotating?: boolean,
  t: any
}) => (
  <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex flex-col items-start">
          <h4 className="font-black text-lg sm:text-xl text-gray-800">{title}</h4>
          {isRotating && !isOpen && (
            <motion.span 
              key={content}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-brand-orange font-bold uppercase tracking-tighter"
            >
              {t.petAnalysis.dailyHackStatus}
            </motion.span>
          )}
        </div>
      </div>
      {isOpen ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
    </button>
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          key={isRotating ? content : 'static'}
          initial={{ height: isRotating ? 'auto' : 0, opacity: 0, x: isRotating ? 10 : 0 }}
          animate={{ height: 'auto', opacity: 1, x: 0 }}
          exit={{ height: isRotating ? 'auto' : 0, opacity: 0, x: isRotating ? -10 : 0 }}
          className="px-6 sm:px-8 pb-8 pt-2"
        >
          <div className="text-base text-gray-600 leading-relaxed font-medium prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {isRotating && (
             <div className="mt-4 text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">{t.petAnalysis.nextHackSoon}</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </section>
);

const StatCard = ({ icon, label, value, color, onClick }: { icon: React.ReactNode, label: string, value: string, color: string, onClick?: () => void }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 sm:p-6 rounded-[32px] flex flex-col items-center justify-center text-center gap-1 sm:gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md bg-white hover:scale-105", 
        color
      )}
    >
      <div className="scale-90 sm:scale-100">{icon}</div>
      <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-black tracking-widest">{label}</span>
      <span className="text-[11px] sm:text-sm font-black text-gray-800 line-clamp-1 text-ellipsis overflow-hidden w-full">
        {value}
      </span>
    </div>
  );
};
