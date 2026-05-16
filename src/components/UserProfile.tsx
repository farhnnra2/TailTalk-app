import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, ArrowLeft, ShieldCheck, Sparkles, Loader2, Award, RefreshCw, Camera, Edit2, Check, X, Stethoscope } from 'lucide-react';
import { UserProfile as UserProfileType, PetProfile, HealthLog, AppNotification } from '../types';
import { getCollectiveProTip } from '../services/geminiService';
import { cn } from '../lib/utils';
import { resizeImage } from '../lib/imageResizer';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell } from 'lucide-react';

interface UserProfileProps {
  user: UserProfileType;
  pets: PetProfile[];
  healthLogs: HealthLog[];
  onBack: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { displayName?: string, photoURL?: string }) => Promise<void>;
  notifications: AppNotification[];
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onMarkNotificationsRead: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  user, 
  pets, 
  healthLogs, 
  onBack, 
  onLogout, 
  onUpdateProfile,
  notifications,
  onDeleteNotification,
  onClearAllNotifications,
  onMarkNotificationsRead
}) => {
  const { language, t } = useLanguage();
  const [proTip, setProTip] = useState<string | null>(null);
  const [isLoadingTip, setIsLoadingTip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(user.displayName || '');
  const [tempPhoto, setTempPhoto] = useState(user.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasUnread = notifications.some(n => !n.isRead);

  const handleRegenerate = async () => {
    if (pets.length === 0) return;
    setIsLoadingTip(true);
    try {
      const tip = await getCollectiveProTip(pets, language);
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
      <header className="px-6 py-8 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-500 hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <h2 className="font-black text-xl text-gray-900 uppercase tracking-widest">{t.userProfile.title}</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const nextState = !showNotifications;
              setShowNotifications(nextState);
              if (nextState) {
                onMarkNotificationsRead();
              }
            }}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors relative"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button 
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-red-400 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications Popover */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-6 mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 p-6 text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg text-gray-800 lowercase first-letter:uppercase">{t.dashboard.history}</h3>
                {notifications.length > 0 && (
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
                          onClick={(e) => { e.stopPropagation(); onDeleteNotification(n.id); }}
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
                  {user.displayName || t.userProfile.animalOwner}
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left block ml-4">{t.userProfile.usernameLabel}</label>
                    <input 
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder={t.userProfile.namePlaceholder}
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
                      <X className="w-4 h-4" /> {t.userProfile.cancel}
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 py-3 rounded-2xl bg-brand-orange text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {t.userProfile.save}</>}
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
              <h4 className="font-black text-lg text-gray-900 uppercase tracking-tight">{t.profileList.myPets}</h4>
            </div>
            {pets.length > 0 && (
              <div className="bg-brand-orange text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm shadow-brand-orange/20">
                {t.userProfile.petCount.replace('{count}', pets.length.toString())}
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
            <p className="text-gray-400 text-sm font-medium italic">{t.profileList.noPets}</p>
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
              <h4 className="font-black text-lg uppercase tracking-tight">{t.userProfile.aiInsightsTitle}</h4>
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
                <span className="text-sm">{t.userProfile.compilingInsights}</span>
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
                    ? t.userProfile.getInsightsPrompt
                    : t.userProfile.scanMorePrompt}
                </p>
                {pets.length > 0 && (
                  <button 
                    onClick={handleRegenerate}
                    className="bg-brand-orange text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    {t.userProfile.getInsightsButton}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity / Health History */}
        <section className="px-2">
          <h4 className="font-black text-sm text-gray-400 uppercase tracking-widest mb-4">
            {t.userProfile.healthHistory}
          </h4>
          <div className="space-y-4">
            {healthLogs.length > 0 ? (
              healthLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex flex-col gap-3 bg-white p-5 rounded-[28px] border border-orange-50 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-5 h-5 text-brand-orange" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-extrabold text-sm leading-tight group-hover:text-brand-orange transition-colors">
                          {log.diagnosis}
                        </p>
                        <p className="text-gray-400 text-[10px] uppercase font-black tracking-wider">
                          {log.petName || t.userProfile.animalOwner}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-gray-300 bg-gray-50 px-2 py-1 rounded-full uppercase">
                      {log.createdAt?.toDate ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }).format(log.createdAt.toDate()) : (language === 'id' ? 'Baru saja' : 'Just now')}
                    </span>
                  </div>
                  
                  {log.symptoms && (
                    <p className="text-xs text-gray-500/80 italic line-clamp-1 bg-brand-cream/50 p-2 rounded-xl border border-orange-50/30">
                      "{log.symptoms}"
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        log.vetUrgency === 'high' ? "bg-red-500 animate-pulse" : 
                        log.vetUrgency === 'medium' ? "bg-orange-400" : "bg-green-400"
                      )} />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {(t.petAnalysis.urgencyLevels as any)[log.vetUrgency] || log.vetUrgency}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : pets.length > 0 ? (
              <div className="space-y-4">
                {pets.slice(0, 2).map((pet, i) => (
                  <div key={pet.id} className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-orange-50">
                    <img src={pet.imageUrl} referrerPolicy="no-referrer" className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <p className="text-gray-900 font-bold text-sm">{t.userProfile.updatedProfile.replace('{name}', pet.name)}</p>
                      <p className="text-gray-400 text-[10px] uppercase font-black">{i === 0 ? t.userProfile.today : t.userProfile.yesterday}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-400 text-sm font-medium">{t.userProfile.noActivity}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
