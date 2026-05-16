import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraModalProps {
  onCapture: (image: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const { t } = useLanguage();
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-white font-black uppercase tracking-widest text-xs">
          {t.camera.title}
        </div>
        <button 
          onClick={toggleFacingMode}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          className="w-full h-full object-cover"
        />
        
        {/* Viewfinder Overlay */}
        <div className="absolute inset-0 border-[40px] sm:border-[80px] border-black/40 pointer-events-none">
          <div className="w-full h-full border-2 border-white/30 rounded-[40px] flex items-center justify-center">
            <div className="w-12 h-12 border-t-2 border-l-2 border-white absolute top-0 left-0 rounded-tl-3xl opacity-60" />
            <div className="w-12 h-12 border-t-2 border-r-2 border-white absolute top-0 right-0 rounded-tr-3xl opacity-60" />
            <div className="w-12 h-12 border-b-2 border-l-2 border-white absolute bottom-0 left-0 rounded-bl-3xl opacity-60" />
            <div className="w-12 h-12 border-b-2 border-r-2 border-white absolute bottom-0 right-0 rounded-br-3xl opacity-60" />
            
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Zap className="w-8 h-8 text-white" />
              <span className="text-white text-[10px] font-black uppercase">{t.camera.positionCenter}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white/60 text-xs text-center max-w-[200px]">
          {t.camera.footerTip}
        </p>
        <button 
          onClick={capture}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
        >
          <div className="w-16 h-16 rounded-full border-4 border-black/5 flex items-center justify-center">
            <Camera className="w-8 h-8 text-black" />
          </div>
        </button>
      </div>
    </motion.div>
  );
};
