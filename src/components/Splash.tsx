import React from 'react';
import { motion } from 'motion/react';
import { PawPrint } from 'lucide-react';
import { cn } from '../lib/utils';

interface SplashProps {
  onGetStarted: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onGetStarted }) => {
  return (
    <div className="relative min-height-screen w-full bg-brand-cream overflow-hidden flex flex-col items-center justify-between py-12 px-8">
      {/* Decorative Stripes */}
      <div className="absolute top-0 right-0 w-full h-[60%] flex gap-4 -rotate-12 translate-x-12 -translate-y-12">
        <div className="w-16 h-[120%] bg-[#b9a9d9] rounded-full opacity-80" />
        <div className="w-16 h-[120%] bg-[#a8dadc] rounded-full opacity-80" />
        <div className="w-16 h-[120%] bg-[#f4a261] rounded-full opacity-80" />
        <div className="w-16 h-[120%] bg-[#e76f51] rounded-full opacity-80" />
      </div>

      <div className="z-10 flex flex-col items-center mt-32 text-center">
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center shadow-xl mb-8"
        >
          <PawPrint className="text-white w-10 h-10" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-gray-900 leading-tight mb-4"
        >
          Unlock Your Pet’s <br /> World with AI
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-gray-500 text-lg px-4"
        >
          Analyze profiles, get smart care hacks, and keep your best friend happy.
        </motion.p>
      </div>

      <div className="z-10 w-full flex flex-col items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGetStarted}
          className="w-full bg-brand-orange text-white font-bold py-5 rounded-2xl shadow-lg shadow-orange-200 text-lg"
        >
          Get Started
        </motion.button>
        
        <p className="text-gray-400 text-sm">
          Already have an account? <span className="text-brand-orange font-semibold">Sign in</span>
        </p>
      </div>
      
      {/* Random pet avatars as per reference */}
      <div className="absolute top-20 right-10 w-12 h-12 rounded-full overflow-hidden border-4 border-white shadow-md">
        <img src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop" alt="Cat" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-48 left-10 w-14 h-14 rounded-full overflow-hidden border-4 border-white shadow-md">
        <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1974&auto=format&fit=crop" alt="Dog" className="w-full h-full object-cover" />
      </div>
      <div className="absolute bottom-60 right-20 w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md">
        <img src="https://images.unsplash.com/photo-1522926193341-e9fed198d4ad?q=80&w=2072&auto=format&fit=crop" alt="Bird" className="w-full h-full object-cover" />
      </div>
    </div>
  );
};
