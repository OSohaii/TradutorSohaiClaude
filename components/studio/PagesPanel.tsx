import React from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { ProcessedImage } from '../../types';

interface PagesPanelProps {
  history: ProcessedImage[];
  currentImageId: string | null;
  onSelectImage: (img: ProcessedImage) => void;
  onClose: () => void;
}

const PagesPanel: React.FC<PagesPanelProps> = ({
  history,
  currentImageId,
  onSelectImage,
  onClose,
}) => {
  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 210, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-full bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-white/5 flex-shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-white/5 flex-shrink-0">
        <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Paginas
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">{history.length}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Thumbnail Grid */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <div className="grid grid-cols-2 gap-2">
          {history.map((img, idx) => {
            const isActive = img.id === currentImageId;
            return (
              <motion.button
                key={img.id}
                onClick={() => onSelectImage(img)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-purple-500/60 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.fileName}
                  className="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                />
                {/* Status indicator */}
                <div className="absolute top-1.5 right-1.5">
                  {img.status === 'done' && (
                    <div className="bg-green-500/90 rounded-full p-0.5 shadow-sm">
                      <CheckIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {img.status === 'processing' && (
                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {img.status === 'idle' && (
                    <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  {img.status === 'ocr-done' && (
                    <EyeIcon className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {img.status === 'error' && (
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
                {/* Page number */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent py-1">
                  <span className="text-[9px] font-medium text-slate-300 block text-center">
                    {idx + 1}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
};

export default PagesPanel;
