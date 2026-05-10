import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Bell, Camera, ChevronRight, Filter } from 'lucide-react';
import { PetProfile, PetCategory } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  pets: PetProfile[];
  onScanPhoto: () => void;
  onSelectPet: (pet: PetProfile) => void;
}

const categories: PetCategory[] = ['All', 'Cat', 'Dog', 'Bird', 'Other'];

export const Dashboard: React.FC<DashboardProps> = ({ pets, onScanPhoto, onSelectPet }) => {
  const [selectedCategory, setSelectedCategory] = useState<PetCategory>('All');

  const filteredPets = selectedCategory === 'All' 
    ? pets 
    : pets.filter(p => p.category === selectedCategory);

  return (
    <div className="flex flex-col min-h-screen bg-brand-cream px-6 py-8 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-orange">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2080&auto=format&fit=crop" alt="User" />
          </div>
          <div>
            <p className="text-gray-400 text-xs">Welcome back 👋</p>
            <h2 className="font-bold text-lg">Pet Parent</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative w-full h-44 bg-brand-orange rounded-[32px] overflow-hidden mb-8 flex items-center px-8">
        <div className="z-10 w-2/3">
          <h3 className="text-white text-2xl font-bold mb-2">40% Off on Pet Products</h3>
          <button className="bg-white text-brand-orange px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1">
            Shop Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute right-0 bottom-0 w-1/2 h-full">
           <img 
            src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop" 
            alt="Hero Pet" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Categories */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-lg">Categories</h4>
          <button className="text-gray-400 text-sm">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "flex flex-col items-center gap-2 transition-all",
                selectedCategory === cat ? "opacity-100" : "opacity-60"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center shadow-sm",
                selectedCategory === cat ? "bg-brand-orange text-white" : "bg-white text-gray-600"
              )}>
                <PawPrintIcon category={cat} />
              </div>
              <span className="text-xs font-medium">{cat}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Scan Trigger */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onScanPhoto}
        className="w-full bg-brand-pastel border-2 border-dashed border-brand-orange py-6 rounded-[32px] flex flex-col items-center gap-2 mb-8"
      >
        <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center shadow-lg shadow-orange-100">
          <Camera className="text-white w-6 h-6" />
        </div>
        <span className="font-extrabold text-brand-orange">Scan Pet Photo</span>
        <p className="text-gray-500 text-xs text-center px-8">Let AI analyze your pet and create a profile</p>
      </motion.button>

      {/* Pet Profiles */}
      <section className="mb-8">
        <h4 className="font-bold text-lg mb-4">Your Pet Profiles</h4>
        {pets.length === 0 ? (
          <div className="bg-white p-6 rounded-[32px] text-center shadow-sm">
            <p className="text-gray-400">No pet profiles yet. <br/> Start by scanning a photo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredPets.map((pet) => (
              <motion.div
                key={pet.id}
                whileHover={{ y: -5 }}
                onClick={() => onSelectPet(pet)}
                className="bg-white p-3 rounded-[32px] shadow-sm cursor-pointer"
              >
                <div className="w-full aspect-square rounded-[24px] overflow-hidden mb-3">
                  <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
                </div>
                <h5 className="font-bold text-sm text-gray-800">{pet.name}</h5>
                <p className="text-gray-400 text-[10px]">{pet.breed}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* AI Care Hacks */}
      <section className="mb-8">
        <h4 className="font-bold text-lg mb-4">Today's AI Care Hacks</h4>
        <div className="bg-[#fff5eb] p-6 rounded-[32px] border border-orange-100">
          <div className="flex items-start gap-4">
            <div className="bg-orange-200 p-2 rounded-xl">
              <Filter className="w-6 h-6 text-brand-orange" />
            </div>
            <div>
              <h5 className="font-bold text-orange-900 mb-1">Stay Hydrated!</h5>
              <p className="text-orange-800/70 text-sm leading-relaxed">
                Add a few ice cubes to your pet's water bowl on hot days to keep them cool and encourage drinking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const PawPrintIcon = ({ category }: { category: PetCategory }) => {
  switch (category) {
    case 'Cat': return <span>🐱</span>;
    case 'Dog': return <span>🐶</span>;
    case 'Bird': return <span>🐦</span>;
    case 'Other': return <span>🦜</span>;
    default: return <ChevronRight className="w-5 h-5" />;
  }
};
