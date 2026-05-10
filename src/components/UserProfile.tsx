import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ArrowLeft, TrendingUp, ShieldCheck, Sparkles, Loader2, Award, RefreshCw } from 'lucide-react';
import { UserProfile as UserProfileType, PetProfile } from '../types';
import { getCollectiveProTip } from '../services/geminiService';

interface UserProfileProps {
  user: UserProfileType;
  pets: PetProfile[];
  onBack: () => void;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, pets, onBack, onLogout }) => {
  const [proTip, setProTip] = useState<string | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const handleRegenerate = async () => {
    if (pets.length === 0) return;
    setIsLoadingTip(true);
    try {
      const tip = await getCollectiveProTip(pets);
      setProTip(tip);
    } catch (error) {
      console.error("Failed to fetch collective tip", error);
    } finally {
      setIsLoadingTip(false);
    }
  };

  const streakCount = Math.floor(pets.length * 1.5) + 3; // Mock logic for streak

  return (
    <div className="flex flex-col min-h-screen bg-brand-cream pb-24">
      {/* Header */}
      <header className="px-6 py-8 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500 hover:text-brand-orange transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-black text-xl text-gray-900 uppercase tracking-widest">My Profile</h2>
        <button 
          onClick={onLogout}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-red-400 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Profile Card */}
      <div className="px-6 space-y-6">
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50/50 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-brand-orange/10 p-1 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} referrerPolicy="no-referrer" alt={user.displayName || 'User'} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-10 h-10 text-brand-orange" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-brand-orange text-white p-1.5 rounded-full shadow-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-black text-2xl text-gray-900">{user.displayName || 'Pet Parent'}</h3>
          <p className="text-gray-400 text-sm font-medium">{user.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100/50">
            <div className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <Award className="w-5 h-5 text-brand-orange" />
            </div>
            <p className="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Total Pets</p>
            <p className="text-3xl font-black text-gray-900">{pets.length}</p>
          </div>
          <div className="bg-brand-pastel p-6 rounded-[32px] border border-brand-orange/10">
            <div className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <TrendingUp className="w-5 h-5 text-brand-orange" />
            </div>
            <p className="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Care Streak</p>
            <p className="text-3xl font-black text-gray-900">{streakCount} Days</p>
          </div>
        </div>

        {/* AI Insight Section */}
        <section className="bg-gray-900 rounded-[40px] p-8 pb-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-orange rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-black text-lg uppercase tracking-tight">TailTalk AI Insight</h4>
            </div>
            
            <button 
              onClick={handleRegenerate}
              disabled={isLoadingTip || pets.length === 0}
              className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isLoadingTip ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4 relative z-10">
            {isLoadingTip ? (
              <div className="flex items-center gap-3 text-white/40 italic py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Synthesizing personalized advice...</span>
              </div>
            ) : proTip ? (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white/90 text-base leading-relaxed font-medium"
              >
                "{proTip}"
              </motion.p>
            ) : (
              <div className="py-2">
                <p className="text-white/40 text-sm italic mb-4">
                  {pets.length > 0 
                    ? "Click the button to generate a collective care insight for your pets!" 
                    : "Scan more pets to unlock collective AI care insights!"}
                </p>
                {pets.length > 0 && (
                  <button 
                    onClick={handleRegenerate}
                    className="bg-brand-orange text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Generate Insight
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity Mock */}
        <section className="px-2">
          <h4 className="font-black text-sm text-gray-400 uppercase tracking-widest mb-4">Recent Activity</h4>
          <div className="space-y-4">
            {pets.length > 0 ? pets.slice(0, 2).map((pet, i) => (
              <div key={pet.id} className="flex items-center gap-4 bg-white/50 p-4 rounded-3xl">
                <img src={pet.imageUrl} referrerPolicy="no-referrer" className="w-12 h-12 rounded-2xl object-cover border border-orange-100" />
                <div>
                  <p className="text-gray-900 font-bold text-sm">Updated {pet.name}'s profile</p>
                  <p className="text-gray-400 text-[10px] uppercase font-black">{i === 0 ? 'Today' : 'Yesterday'}</p>
                </div>
              </div>
            )) : (
              <p className="text-center py-8 text-gray-400 text-sm font-medium">No activity yet. Scan a pet to start!</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
