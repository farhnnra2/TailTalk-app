import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Utensils, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationPopupProps {
  notification: {
    id: string;
    text: string;
    type?: 'info' | 'reminder';
  } | null;
  onClose: (id: string) => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
  const { t } = useLanguage();
  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="fixed bottom-6 left-6 right-6 z-[200] flex justify-center pointer-events-none"
      >
        <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(242,125,38,0.2)] border-4 border-brand-orange/10 p-4 sm:p-6 flex items-center gap-4 sm:gap-6 max-w-md w-full pointer-events-auto relative group">
          <motion.div 
            animate={{ 
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              repeatDelay: 1
            }}
            className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center shrink-0"
          >
            {notification.type === 'reminder' ? (
              <Utensils className="w-6 h-6 sm:w-8 sm:h-8 text-brand-orange" />
            ) : (
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-brand-orange" />
            )}
          </motion.div>
          
          <div className="flex-1">
            <h4 className="font-black text-brand-orange text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
              <Zap className="w-3 h-3 fill-brand-orange" /> {t.petAnalysis.tailTalkAlert}
            </h4>
            <p className="font-bold text-gray-800 text-sm sm:text-base leading-snug">
              {notification.text}
            </p>
          </div>

          <button 
            onClick={() => onClose(notification.id)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-lg hover:bg-brand-orange transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Decorative tail-like animation */}
          <motion.div 
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-brand-orange rounded-full"
            animate={{ x: [0, 10, 0], y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
