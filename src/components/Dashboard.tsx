import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Bell, Camera, ChevronRight, Filter, RefreshCw, X, User as UserIcon } from 'lucide-react';
import { PetProfile, PetCategory, AppNotification, UserProfile } from '../types';
import { PET_HACKS } from '../constants';
import { cn } from '../lib/utils';

interface DashboardProps {
  user: UserProfile | null;
  pets: PetProfile[];
  notifications: AppNotification[];
  onScanPhoto: () => void;
  onOpenCamera: () => void;
  onSelectPet: (pet: PetProfile) => void;
  onOpenProfile: () => void;
}

const categories: PetCategory[] = ['All', 'Cat', 'Dog', 'Bird', 'Other'];

export const Dashboard: React.FC<DashboardProps> = ({ user, pets, notifications, onScanPhoto, onOpenCamera, onSelectPet, onOpenProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState<PetCategory>('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyHack, setDailyHack] = useState(PET_HACKS[0]);

  useEffect(() => {
    // Select hack based on date for daily rotation
    const today = new Date();
    const index = (today.getFullYear() + today.getMonth() + today.getDate()) % PET_HACKS.length;
    setDailyHack(PET_HACKS[index]);
  }, []);

  const handleShuffleHack = () => {
    const currentIndex = PET_HACKS.findIndex(h => h.id === dailyHack.id);
    let nextIndex = Math.floor(Math.random() * PET_HACKS.length);
    if (nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % PET_HACKS.length;
    }
    setDailyHack(PET_HACKS[nextIndex]);
  };

  const filteredPets = selectedCategory === 'All' 
    ? pets 
    : pets.filter(p => p.category === selectedCategory);

  const searchedPets = pets.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.breed.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWebSearch = () => {
    if (!searchQuery) return;
    window.open(`https://www.google.com/search?q=pet+care+tips+${encodeURIComponent(searchQuery)}`, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-cream px-4 sm:px-8 lg:px-12 py-8 pb-24 relative">
      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-cream/95 backdrop-blur-xl p-6 sm:p-12 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-12">
                <h3 className="font-black text-3xl text-gray-900">Search</h3>
                <button 
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-brand-orange shadow-sm transition-all active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative mb-12">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-orange w-6 h-6" />
                <input 
                  autoFocus
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Seach your pets or pet hacks..."
                  className="w-full bg-white border-2 border-brand-orange/10 focus:border-brand-orange rounded-[32px] py-6 pl-16 pr-8 text-xl font-bold shadow-lg shadow-orange-100/50 outline-none transition-all"
                />
              </div>

              {searchQuery && (
                <div className="space-y-12">
                  {/* Results: Your Pets */}
                  {searchedPets.length > 0 && (
                    <section>
                      <h4 className="font-bold text-lg text-gray-400 mb-6 uppercase tracking-widest">Your Pets</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {searchedPets.map(pet => (
                          <div 
                            key={pet.id}
                            onClick={() => {
                              onSelectPet(pet);
                              setIsSearchOpen(false);
                            }}
                            className="bg-white p-3 rounded-[24px] shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-all border border-orange-50"
                          >
                            <img src={pet.imageUrl} referrerPolicy="no-referrer" className="w-12 h-12 rounded-2xl object-cover" />
                            <div>
                              <p className="font-bold text-sm text-gray-800 leading-tight">{pet.name}</p>
                              <p className="text-[10px] text-gray-400">{pet.breed}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Results: Web Suggestion */}
                  <section className="bg-brand-orange p-8 rounded-[40px] shadow-xl shadow-orange-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <h4 className="text-white font-black text-xl mb-2">Search TailTalk Web</h4>
                      <p className="text-white/80 text-sm">Find professional advice and global hacks for "{searchQuery}"</p>
                    </div>
                    <button 
                      onClick={handleWebSearch}
                      className="bg-white text-brand-orange px-8 py-3 rounded-full font-black text-sm hover:scale-105 transition-all w-full sm:w-auto"
                    >
                      Instant Search
                    </button>
                  </section>
                </div>
              )}

              {searchQuery === '' && (
                <div className="text-center py-20 opacity-30">
                  <Search className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-bold text-xl uppercase tracking-widest">Type to start scanning...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto w-full relative">
        <button 
          onClick={onOpenProfile}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-brand-orange bg-white flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} referrerPolicy="no-referrer" alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-brand-orange" />
            )}
          </div>
          <div>
            <p className="text-gray-400 text-[10px] sm:text-xs">Welcome back 👋</p>
            <h2 className="font-bold text-sm sm:text-xl truncate max-w-[120px] sm:max-w-none">
              {user?.displayName || 'Pet Parent'}
            </h2>
          </div>
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors relative"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        {/* Notifications Popover */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 p-6"
            >
              <h3 className="font-black text-lg mb-4 text-gray-800">Notifications</h3>
              <div className="space-y-4">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="w-2 h-2 bg-brand-orange rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700 leading-tight mb-1">{n.text}</p>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Banner */}
      <div className="relative w-full max-w-5xl mx-auto h-40 sm:h-56 bg-brand-orange rounded-[40px] overflow-hidden mb-8 lg:mb-12 flex items-center px-6 sm:px-12 shadow-xl shadow-orange-100">
        <div className="z-10 w-2/3 lg:w-1/2">
          <h3 className="text-white text-xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">40% Off on Pet Products</h3>
          <button className="bg-white text-brand-orange px-4 py-2 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1 hover:bg-opacity-90 transition-all">
            Shop Now <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute right-0 bottom-0 w-1/3 sm:w-1/2 h-full">
           <img 
            src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop" 
            referrerPolicy="no-referrer"
            alt="Hero Pet" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full space-y-12">
        {/* Categories */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-lg sm:text-2xl">Categories</h4>
            <button className="text-gray-400 text-sm hover:text-brand-orange transition-colors">See All</button>
          </div>
          <div className="flex gap-4 sm:gap-8 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-4 px-2 -mx-2 no-scrollbar sm:justify-between lg:justify-start">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all min-w-[70px] py-1",
                  selectedCategory === cat ? "opacity-100 scale-105" : "opacity-60 hover:opacity-80"
                )}
              >
                <div className={cn(
                  "w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-md transition-all",
                  selectedCategory === cat ? "bg-brand-orange text-white ring-4 ring-orange-100" : "bg-white text-gray-600"
                )}>
                  <span className="text-xl sm:text-3xl"><PawPrintIcon category={cat} /></span>
                </div>
                <span className="text-[10px] sm:text-sm font-bold">{cat}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Scan Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.01, borderColor: '#f27d26' }}
            whileTap={{ scale: 0.99 }}
            onClick={onScanPhoto}
            className="bg-brand-pastel border-2 border-dashed border-brand-orange/40 py-8 px-6 inline-flex flex-col items-center justify-center gap-4 rounded-[40px] transition-all hover:bg-white shadow-sm h-full"
          >
            <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center shadow-lg shadow-orange-100">
              <ChevronRight className="text-white w-8 h-8 rotate-90" />
            </div>
            <div className="text-center">
              <span className="font-black text-xl text-brand-orange block leading-tight">Upload Photo</span>
              <p className="text-gray-500 text-xs mt-1">Select from gallery</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01, borderColor: '#f27d26' }}
            whileTap={{ scale: 0.99 }}
            onClick={onOpenCamera}
            className="bg-brand-orange border-2 border-brand-orange/10 py-8 px-6 inline-flex flex-col items-center justify-center gap-4 rounded-[40px] transition-all hover:shadow-xl shadow-lg shadow-orange-100 h-full"
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
              <Camera className="text-brand-orange w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="font-black text-xl text-white block leading-tight">Scan with Camera</span>
              <p className="text-white/70 text-xs mt-1">Capture pet live</p>
            </div>
          </motion.button>
        </div>

        {/* Pet Profiles */}
        <section>
          <h4 className="font-bold text-lg sm:text-2xl mb-6">Your Pet Profiles</h4>
          {pets.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] text-center shadow-sm border border-gray-100">
              <p className="text-gray-400 text-lg">No pet profiles yet. <br/> Start by scanning a photo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
              {filteredPets.map((pet) => (
                <motion.div
                  key={pet.id}
                  whileHover={{ y: -8 }}
                  onClick={() => onSelectPet(pet)}
                  className="bg-white p-4 rounded-[32px] shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-50 group"
                >
                  <div className="w-full aspect-square rounded-[24px] overflow-hidden mb-4 relative">
                    <img src={pet.imageUrl} referrerPolicy="no-referrer" alt={pet.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-brand-orange">{pet.category}</div>
                  </div>
                  <h5 className="font-extrabold text-base text-gray-800 mb-1">{pet.name}</h5>
                  <p className="text-gray-400 text-xs font-medium">{pet.breed}</p>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* AI Care Hacks */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-lg sm:text-2xl">TailTalk Pet Hack</h4>
            <button 
              onClick={handleShuffleHack}
              className="text-gray-400 text-xs sm:text-sm hover:text-brand-orange transition-colors flex items-center gap-1 font-bold bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md"
            >
              <RefreshCw className="w-3 h-3" /> Shuffle for Test
            </button>
          </div>
          <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={dailyHack.id}
            className="bg-[#fff5eb] p-8 sm:p-12 rounded-[40px] border border-orange-100 shadow-inner relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6">
              <span className="bg-orange-100 text-brand-orange px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                {dailyHack.tag}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
              <div className="bg-orange-200 p-4 rounded-2xl sm:rounded-3xl shrink-0">
                <Filter className="w-8 h-8 sm:w-12 sm:h-12 text-brand-orange" />
              </div>
              <div className="text-center sm:text-left">
                <h5 className="font-black text-xl sm:text-2xl text-orange-900 mb-3">{dailyHack.title}</h5>
                <p className="text-orange-800/70 text-base sm:text-lg leading-relaxed max-w-2xl">
                  {dailyHack.description}
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

const PawPrintIcon = ({ category }: { category: PetCategory }) => {
  switch (category) {
    case 'Cat': return <span>🐱</span>;
    case 'Dog': return <span>🐶</span>;
    case 'Bird': return <span>🐦</span>;
    case 'Other': return <span>🦜</span>;
    default: return <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />;
  }
};
