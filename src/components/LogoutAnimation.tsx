import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetProfile } from '../types';
import { HeartOff, MessageCircle } from 'lucide-react';

interface LogoutAnimationProps {
  pets: PetProfile[];
  onComplete: () => void;
}

export const LogoutAnimation: React.FC<LogoutAnimationProps> = ({ pets, onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4500); // Higher duration for more impact
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-gray-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-4 mx-auto">
          <HeartOff className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Time to go?</h2>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.3em]">Your friends will miss you...</p>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-8 max-w-2xl">
        {pets.length > 0 ? (
          pets.slice(0, 5).map((pet, index) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.2 }}
              className="flex flex-col items-center relative"
            >
              {/* Speech Bubble */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.5 + index * 0.3, type: 'spring' }}
                className="absolute -top-16 bg-white rounded-2xl px-4 py-2 shadow-xl"
              >
                <p className="text-[10px] font-black text-gray-800 uppercase whitespace-nowrap">
                  Goodbye, {pet.name.split(' ')[0]} stays here...
                </p>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
              </motion.div>

              <div className="w-20 h-20 rounded-full border-4 border-white/20 p-1 overflow-hidden bg-white/5 relative">
                {pet.imageUrl ? (
                  <img 
                    src={pet.imageUrl} 
                    alt={pet.name} 
                    className="w-full h-full rounded-full object-cover grayscale opacity-60" 
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                    <span className="text-2xl">🐾</span>
                  </div>
                )}
                {/* Sad eye animation overlay */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="absolute inset-0 flex items-center justify-center gap-4"
                >
                  <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                </motion.div>
              </div>
              <p className="mt-3 font-black text-white text-sm uppercase tracking-tight">{pet.name}</p>
            </motion.div>
          ))
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-white/40 font-bold italic"
          >
            No pets to say goodbye... but we'll miss you anyway!
          </motion.div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="mt-16 text-white/20 font-black text-[80px] leading-none pointer-events-none select-none uppercase tracking-tighter"
      >
        TAILTALK
      </motion.div>
    </motion.div>
  );
};
