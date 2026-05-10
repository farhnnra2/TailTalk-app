import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronDown, ChevronUp, ShieldCheck, Zap, Info, Clock, CheckCircle2 } from 'lucide-react';
import { AnalysisResult } from '../types';
import { checkFoodSafety } from '../services/geminiService';
import { cn } from '../lib/utils';

interface PetAnalysisProps {
  image: string;
  analysis: AnalysisResult;
  onBack: () => void;
  onSave?: (name: string) => void;
}

export const PetAnalysis: React.FC<PetAnalysisProps> = ({ image, analysis, onBack, onSave }) => {
  const [activeSections, setActiveSections] = useState<string[]>(['analysis']);
  const [foodInput, setFoodInput] = useState('');
  const [foodResult, setFoodResult] = useState('');
  const [isCheckingFood, setIsCheckingFood] = useState(false);
  const [petName, setPetName] = useState('');

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

  return (
    <div className="flex flex-col min-h-screen bg-brand-cream overflow-x-hidden">
      {/* Top Background / Image */}
      <div className="relative h-[45vh] w-full">
        <img src={image} alt="Pet" className="w-full h-full object-cover" />
        <div className="absolute top-12 left-6">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative -mt-12 bg-brand-cream rounded-t-[48px] px-8 pt-10 pb-20 shadow-2xl">
        {/* Name Input for Saving */}
        <div className="mb-8">
           <input 
            type="text" 
            placeholder="Name your pet..." 
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            className="text-3xl font-extrabold text-gray-900 bg-transparent border-b-2 border-brand-orange/20 focus:border-brand-orange outline-none w-full"
          />
          <p className="text-gray-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> AI Analysis Ready
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatCard icon={<ShieldCheck className="w-5 h-5 text-blue-500" />} label="Breed" value={analysis.breed} color="bg-blue-50" />
          <StatCard icon={<Clock className="w-5 h-5 text-purple-500" />} label="Age" value={analysis.ageEstimation} color="bg-purple-50" />
          <StatCard icon={<Zap className="w-5 h-5 text-orange-500" />} label="Energy" value={analysis.energyLevel} color="bg-orange-50" />
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          <CollapsibleSection 
            title="Personalized Care Plan" 
            isOpen={activeSections.includes('care')}
            onToggle={() => toggleSection('care')}
            content={analysis.carePlan}
            icon={<Info className="w-5 h-5 text-brand-orange" />}
          />
          
          <CollapsibleSection 
            title="DIY Pet Hacks" 
            isOpen={activeSections.includes('hacks')}
            onToggle={() => toggleSection('hacks')}
            content={analysis.diyHacks}
            icon={<Zap className="w-5 h-5 text-brand-orange" />}
          />

          <section className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
            <button 
              onClick={() => toggleSection('food')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-orange" />
                <h4 className="font-bold text-gray-800">Is This Food Safe?</h4>
              </div>
              {activeSections.includes('food') ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            <AnimatePresence>
              {activeSections.includes('food') && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-2"
                >
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="Enter food (e.g. Avocado)" 
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-orange"
                    />
                    <button 
                      onClick={handleFoodCheck}
                      disabled={isCheckingFood}
                      className="bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      {isCheckingFood ? '...' : 'Check'}
                    </button>
                  </div>
                  {foodResult && (
                    <div className="bg-brand-pastel p-4 rounded-xl border border-orange-100 text-sm text-gray-700 leading-relaxed">
                      {foodResult}
                    </div>
                  )}
                  <div className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Recommended for {analysis.breed}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSave?.(petName || 'My Pet')}
          className="w-full mt-12 bg-brand-orange text-white font-bold py-5 rounded-2xl shadow-xl shadow-orange-200 text-lg"
        >
          Save to Profiles
        </motion.button>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className={cn("p-4 rounded-3xl flex flex-col items-center text-center gap-1 shadow-sm", color)}>
    {icon}
    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{label}</span>
    <span className="text-xs font-bold text-gray-800 line-clamp-1">{value}</span>
  </div>
);

const CollapsibleSection = ({ title, isOpen, onToggle, content, icon }: { title: string, isOpen: boolean, onToggle: () => void, content: string, icon: React.ReactNode }) => (
  <section className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <h4 className="font-bold text-gray-800">{title}</h4>
      </div>
      {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-5 pb-5 pt-2"
        >
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
);
