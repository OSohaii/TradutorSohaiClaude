import React from 'react';
import { BookOpenIcon, Cog6ToothIcon, PlusIcon } from '@heroicons/react/24/outline';
import Uploader from '../components/Uploader';
import { useLibraryStore, useViewStore } from '../store';

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface LibraryPageProps {
  onFilesSelect: (files: File[]) => void;
  onOpenSettings: () => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onFilesSelect, onOpenSettings }) => {
  const mangas = useLibraryStore(s => s.mangas);
  const addManga = useLibraryStore(s => s.addManga);
  const goToStudio = useViewStore(s => s.goToStudio);

  const handleNewProject = () => {
    const id = generateId();
    const now = Date.now();
    addManga({
      id,
      title: `Projeto ${mangas.length + 1}`,
      chapters: [],
      createdAt: now,
      updatedAt: now,
    });
    goToStudio(id);
  };

  const handleOpenManga = (mangaId: string) => {
    const manga = mangas.find(m => m.id === mangaId);
    const chapterId = manga?.chapters?.[0]?.id ?? undefined;
    goToStudio(mangaId, chapterId);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <BookOpenIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">MangaLens</h1>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Configuracoes"
        >
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Traducao Rapida
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Arraste imagens de manga ou clique para selecionar e traduzir instantaneamente.
            </p>
            <div className="max-w-xl mx-auto">
              <Uploader onFilesSelect={onFilesSelect} isProcessing={false} />
            </div>
          </section>

          {/* Projects Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200">Meus Projetos</h3>
              <button
                onClick={handleNewProject}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Novo Projeto
              </button>
            </div>

            {mangas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
                <BookOpenIcon className="w-12 h-12 opacity-40" />
                <p className="text-sm">Nenhum projeto ainda. Crie um novo ou faca upload de imagens.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mangas.map(manga => (
                  <button
                    key={manga.id}
                    onClick={() => handleOpenManga(manga.id)}
                    className="group flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                  >
                    {/* Cover */}
                    <div className="aspect-[3/4] bg-slate-800 flex items-center justify-center overflow-hidden">
                      {manga.coverUrl ? (
                        <img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpenIcon className="w-10 h-10 text-slate-600" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2 text-left">
                      <p className="text-xs font-medium text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                        {manga.title}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {manga.chapters.length} cap. | {manga.chapters.reduce((sum, ch) => sum + ch.pages.length, 0)} pag.
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
