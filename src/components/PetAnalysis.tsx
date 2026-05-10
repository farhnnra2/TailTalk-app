import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ChevronDown, ChevronUp, ShieldCheck, Zap, Info, Clock, CheckCircle2, Bell, Utensils } from 'lucide-react';
import { AnalysisResult } from '../types';
import { checkFoodSafety, getNutritionTip } from '../services/geminiService';
import { cn } from '../lib/utils';

interface FeedingTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface PetAnalysisProps {
  image: string;
  analysis: AnalysisResult;
  onBack: () => void;
  onSave?: (name: string, feedingData?: { enabled: boolean, times: FeedingTimes }) => void;
  onDelete?: () => void;
  initialName?: string;
  isExisting?: boolean;
  initialFeedingData?: { enabled: boolean, times: FeedingTimes };
  addNotification?: (text: string) => void;
}

export const PetAnalysis: React.FC<PetAnalysisProps> = ({ 
  image, 
  analysis, 
  onBack, 
  onSave, 
  onDelete,
  initialName = '',
  isExisting = false,
  initialFeedingData,
  addNotification
}) => {
  const [activeSections, setActiveSections] = useState<string[]>(['analysis', 'daily']);
  const [foodInput, setFoodInput] = useState('');
  const [foodResult, setFoodResult] = useState('');
  const [isCheckingFood, setIsCheckingFood] = useState(false);
  const [petName, setPetName] = useState(initialName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // Feeding Reminders State
  const [feedingEnabled, setFeedingEnabled] = useState(initialFeedingData?.enabled ?? false);
  const [feedingTimes, setFeedingTimes] = useState<FeedingTimes>(initialFeedingData?.times ?? {
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00'
  });
  const [nutritionTip, setNutritionTip] = useState('');
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  useEffect(() => {
    if (feedingEnabled) {
      fetchNutritionTip();
      requestNotificationPermission();
    }
  }, [feedingEnabled]);

  const fetchNutritionTip = async () => {
    setIsLoadingTip(true);
    try {
      const tip = await getNutritionTip(feedingTimes.breakfast, analysis.breed);
      setNutritionTip(tip);
    } catch (error) {
      console.error("Failed to fetch nutrition tip", error);
    } finally {
      setIsLoadingTip(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Notification Checker
  const lastNotifiedMinute = React.useRef<string | null>(null);

  useEffect(() => {
    if (!feedingEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentTime === lastNotifiedMinute.current) return;

      const times = Object.values(feedingTimes);
      if (times.includes(currentTime)) {
        lastNotifiedMinute.current = currentTime;
        showNotification(`Time to feed ${petName || 'your pet'}! 🐾`);
      }
    };

    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds for better precision
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [feedingEnabled, feedingTimes, petName, image]);

  const showNotification = (message: string) => {
    // Add to global notification list
    addNotification?.(message);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(message, {
          body: 'Healthy pets are happy pets!',
          icon: image,
          silent: false,
          requireInteraction: true
        });
      } catch (e) {
        alert(message);
      }
    } else {
      alert(message);
    }
  };

  const handleTestNotification = () => {
    const testMsg = `Time to feed ${petName || 'your pet'}! 🐾 (Test Alert)`;
    if (Notification.permission !== 'granted') {
      requestNotificationPermission().then(() => {
        showNotification(testMsg);
      });
    } else {
      showNotification(testMsg);
    }
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
      const result = await checkFoodSafety(foodInput, analysis.breed);
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-brand-cream overflow-x-hidden">
      {/* Top Background / Image - Responsive: Side by side on LG */}
      <div className="relative h-[45vh] lg:h-screen lg:w-1/2 w-full lg:fixed lg:left-0 lg:top-0">
        <img src={image} alt="Pet" className="w-full h-full object-cover" />
        <div className="absolute top-12 left-6 right-6 flex justify-between items-center z-20">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>

          {isExisting && (
            <div className="relative">
              <AnimatePresence>
                {showDeleteConfirm ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="flex items-center gap-2 bg-white rounded-full p-1 shadow-lg border border-red-100"
                  >
                    <span className="text-[10px] font-bold text-gray-500 ml-4 uppercase tracking-tighter">Sure?</span>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-5 py-2 bg-red-500 text-white rounded-full font-bold text-xs shadow-sm hover:bg-red-600 transition-colors"
                    >
                      {isDeleting ? '...' : 'Yes, Delete'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.button 
                    key="del-btn"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2 bg-red-500/90 hover:bg-red-600 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-white font-bold text-sm transition-all"
                  >
                    Delete Profile
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Content Container - Responsive: Scrollable right side on LG */}
      <div className="relative -mt-12 lg:mt-0 bg-brand-cream rounded-t-[48px] lg:rounded-none px-6 sm:px-12 lg:px-16 pt-10 pb-20 shadow-2xl lg:shadow-none lg:w-1/2 lg:ml-[50%] min-h-screen">
        {/* Name Input for Saving */}
        <div className="mb-10 text-center lg:text-left">
           <input 
            type="text" 
            placeholder="Name your pet..." 
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 bg-transparent border-b-4 border-brand-orange/10 focus:border-brand-orange outline-none w-full pb-2 transition-all"
          />
          <p className="text-gray-400 mt-4 flex items-center justify-center lg:justify-start gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> TailTalk Analysis Ready for {analysis.category}
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
                  label="Breed" 
                  value={analysis.breed} 
                  color="bg-blue-50" 
                  onClick={() => setExpandedStat('Breed')}
                />
                <StatCard 
                  icon={<Clock className="w-6 h-6 text-purple-500" />} 
                  label="Age" 
                  value={analysis.ageEstimation} 
                  color="bg-purple-50" 
                  onClick={() => setExpandedStat('Age')}
                />
                <StatCard 
                  icon={<Zap className="w-6 h-6 text-orange-500" />} 
                  label="Energy" 
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
                    {expandedStat} Details
                  </span>
                  <span className="text-lg sm:text-xl font-black">
                    {expandedStat === 'Breed' ? analysis.breed :
                     expandedStat === 'Age' ? analysis.ageEstimation :
                     analysis.energyLevel}
                  </span>
                </div>
                <div className="absolute top-4 right-6 text-xs font-bold text-gray-400">Click to close</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-6">
          {/* Daily Care Section */}
          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('daily')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Bell className="w-6 h-6 text-brand-orange" />
                <h4 className="font-black text-lg sm:text-xl text-gray-800">Daily Care</h4>
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
                      <span className="font-bold text-gray-700">Feeding Reminders</span>
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
                            <label className="text-[10px] uppercase font-black text-gray-400 px-1">{meal}</label>
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
                          <h5 className="text-[10px] uppercase font-black text-brand-orange">TailTalk Nutrition Tip</h5>
                          <button 
                            onClick={handleTestNotification}
                            className="text-[10px] font-bold text-gray-400 hover:text-brand-orange flex items-center gap-1"
                          >
                            <Bell className="w-3 h-3" /> Test Alert
                          </button>
                        </div>
                        {isLoadingTip ? (
                          <div className="animate-pulse flex space-y-2 flex-col">
                            <div className="h-2 bg-gray-100 rounded w-full"></div>
                            <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 italic leading-relaxed">
                            "{nutritionTip || "Select a time to get a personalized tip for your friend."}"
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <CollapsibleSection 
            title="Personalized Care Plan" 
            isOpen={activeSections.includes('care')}
            onToggle={() => toggleSection('care')}
            content={analysis.carePlan}
            icon={<Info className="w-6 h-6 text-brand-orange" />}
          />
          
          <CollapsibleSection 
            title="TailTalk Pet Hack" 
            isOpen={activeSections.includes('hacks')}
            onToggle={() => toggleSection('hacks')}
            content={analysis.diyHacks}
            icon={<Zap className="w-6 h-6 text-brand-orange" />}
          />

          <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('food')}
              className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-brand-orange" />
                <h4 className="font-black text-lg sm:text-xl text-gray-800">Is This Food Safe?</h4>
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
                      placeholder="Enter food (e.g. Avocado)" 
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-base outline-none focus:border-brand-orange focus:bg-white transition-all"
                    />
                    <button 
                      onClick={handleFoodCheck}
                      disabled={isCheckingFood}
                      className="bg-brand-orange text-white px-8 py-3 rounded-2xl text-base font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-orange-100 transition-all"
                    >
                      {isCheckingFood ? 'Thinking...' : 'Check Safety'}
                    </button>
                  </div>
                  {foodResult && (
                    <div className="bg-brand-pastel p-6 rounded-2xl border border-orange-100 text-base text-gray-700 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{foodResult}</ReactMarkdown>
                    </div>
                  )}
                  <div className="mt-4 text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.2em] font-black">TailTalk Recommendations for {analysis.breed}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Action Button */}
        {!isExisting && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSave?.(petName || 'My Pet', { enabled: feedingEnabled, times: feedingTimes })}
            className="w-full mt-16 bg-brand-orange text-white font-black py-6 rounded-3xl shadow-2xl shadow-orange-200 text-xl hover:bg-opacity-90 transition-all"
          >
            Save to Profiles
          </motion.button>
        )}

        {isExisting && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSave?.(petName || 'My Pet', { enabled: feedingEnabled, times: feedingTimes })}
            className="w-full mt-8 bg-white text-brand-orange border-2 border-brand-orange font-black py-5 rounded-3xl text-lg hover:bg-brand-pastel transition-all"
          >
            Update Profile Settings
          </motion.button>
        )}
      </div>
    </div>
  );
};

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

const CollapsibleSection = ({ title, isOpen, onToggle, content, icon }: { title: string, isOpen: boolean, onToggle: () => void, content: string, icon: React.ReactNode }) => (
  <section className="bg-white rounded-[32px] shadow-sm overflow-hidden border border-gray-100">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        {icon}
        <h4 className="font-black text-lg sm:text-xl text-gray-800">{title}</h4>
      </div>
      {isOpen ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-6 sm:px-8 pb-8 pt-2"
        >
          <div className="text-base text-gray-600 leading-relaxed font-medium prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
);
