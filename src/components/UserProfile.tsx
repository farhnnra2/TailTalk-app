import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ArrowLeft, ShieldCheck, Sparkles, Loader2, Award, RefreshCw, Camera, Edit2, Check, X } from 'lucide-react';
import { UserProfile as UserProfileType, PetProfile } from '../types';
import { getCollectiveProTip } from '../services/geminiService';
import { resizeImage } from '../lib/imageResizer';

interface UserProfileProps {
  user: UserProfileType;
  pets: PetProfile[];
  onBack: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<void>;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, pets, onBack, onLogout, onUpdateProfile }) => {
  const [proTip, setProTip] = useState<string | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(user.displayName || '');
  const [tempPhoto, setTempPhoto] = useState(user.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const b64 = event.target?.result as string;
      const resized = await resizeImage(b64);
      setTempPhoto(resized);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile({
        displayName: tempName,
        photoURL: tempPhoto
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Save profile failed", error);
    } finally {
      setIsSaving(false);
    }
  };


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
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50/50 flex flex-col items-center text-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex flex-col items-center"
              >
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
                <h3 className="font-black text-2xl text-gray-900 group flex items-center gap-2">
                  {user.displayName || 'Pet Parent'}
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-300 hover:text-brand-orange transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </h3>
                <p className="text-gray-400 text-sm font-medium">{user.email}</p>
              </motion.div>
            ) : (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full flex flex-col items-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full border-4 border-brand-orange p-1 overflow-hidden">
                    {tempPhoto ? (
                      <img src={tempPhoto} alt="Preview" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="w-10 h-10 text-brand-orange" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-gray-900 text-white p-2 rounded-full shadow-lg hover:bg-brand-orange transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>
                
                <div className="w-full max-w-[240px] space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left block ml-4">Display Name</label>
                    <input 
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-brand-cream border-2 border-transparent focus:border-brand-orange rounded-2xl px-6 py-3 font-bold text-gray-800 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setTempName(user.displayName || '');
                        setTempPhoto(user.photoURL || '');
                      }}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 py-3 rounded-2xl bg-brand-orange text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pets List Section */}
        <div className="bg-white rounded-[40px] p-6 shadow-sm border border-orange-50/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-orange" />
              </div>
              <h4 className="font-black text-lg text-gray-900 uppercase tracking-tight">My Pets</h4>
            </div>
            {pets.length > 0 && (
              <div className="bg-brand-orange text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm shadow-brand-orange/20">
                {pets.length} {pets.length === 1 ? 'Pet' : 'Pets'}
              </div>
            )}
          </div>
          
          {pets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pets.map((pet) => (
                <div 
                  key={pet.id}
                  className="px-4 py-2 bg-brand-cream rounded-2xl border border-brand-orange/5 flex items-center gap-2 group hover:bg-white hover:shadow-md transition-all cursor-default"
                >
                  <div className="w-2 h-2 rounded-full bg-brand-orange/40 group-hover:bg-brand-orange transition-colors" />
                  <span className="font-bold text-sm text-gray-700">{pet.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm font-medium italic">No pets added yet.</p>
          )}
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
