import React from 'react';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  DocumentTextIcon,
  Square3Stack3DIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface LeftSidebarProps {
  onGoToLibrary: () => void;
  onOpenSettings: () => void;
  projectName?: string;
}

const navItems = [
  { icon: HomeIcon, label: 'Dashboard', id: 'dashboard' },
  { icon: FolderIcon, label: 'Projetos', id: 'projects' },
  { icon: BookOpenIcon, label: 'Biblioteca', id: 'library' },
  { icon: DocumentTextIcon, label: 'Capitulos', id: 'chapters' },
  { icon: Square3Stack3DIcon, label: 'Paginas', id: 'pages' },
  { icon: ClipboardDocumentListIcon, label: 'Tarefas', id: 'tasks' },
  { icon: UserGroupIcon, label: 'Equipe', id: 'team' },
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onGoToLibrary,
  onOpenSettings,
  projectName,
}) => {
  const [activeId, setActiveId] = React.useState('pages');

  const handleClick = (id: string) => {
    setActiveId(id);
    if (id === 'library' || id === 'dashboard') {
      onGoToLibrary();
    }
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 60, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-full bg-black/80 backdrop-blur-xl border-r border-white/5 flex-shrink-0 z-20"
    >
      {/* Logo / Brand */}
      <div className="h-12 flex items-center justify-center border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">ML</span>
        </div>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleClick(item.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full"
                />
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-xs text-slate-200 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-2 pb-3 border-t border-white/5 pt-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
          title="Configuracoes"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </motion.button>
        {/* Project indicator */}
        {projectName && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center" title={projectName}>
            <span className="text-[9px] font-medium text-slate-300">
              {projectName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default LeftSidebar;
