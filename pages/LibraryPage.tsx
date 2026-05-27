import React from 'react';
import { BookOpenIcon, Cog6ToothIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Uploader from '../components/Uploader';
import { useLibraryStore } from '../store';
import { useViewStore } from '../store/useViewStore';
import { Manga } from '../types/library';

interface LibraryPageProps {
  onFilesSelect: (files: File[]) => void;
  onOpenSettings: () => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onFilesSelect, onOpenSettings }) => {
  const mangas = useLibraryStore(s => s.mangas);
  const addManga = useLibraryStore(s => s.addManga);
  const goToStudio = useViewStore(s => s.goToStudio);

  const handleQuickTranslate = (files: File[]) => {
    onFilesSelect(files);
  };

  const handleNewProject = () => {
    const newManga: Manga = {
      id: crypto.randomUUID(),
      title: `Novo Projeto ${mangas.length + 1}`,
      chapters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addManga(newManga);
    goToStudio(newManga.id);
  };

  const handleMangaClick = (manga: Manga) => {
    const latestChapter = manga.chapters.length > 0 ? manga.chapters[manga.chapters.length - 1] : null;
    goToStudio(manga.id, latestChapter?.id);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <BookOpenIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-white">MangaLens</h1>
              <span className="text-[10px] text-slate-400 font-medium">AI Translator</span>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Configuracoes"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* Hero / Quick Translation */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Traducao Rapida
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Arraste imagens ou cole uma URL para traduzir instantaneamente
            </p>
          </div>
          <Uploader onFilesSelect={handleQuickTranslate} isProcessing={false} />
        </section>

        {/* Library Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200">Minha Biblioteca</h3>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              <PlusIcon className="w-4 h-4" />
              Novo Projeto
            </button>
          </div>

          {mangas.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                <PhotoIcon className="w-10 h-10 text-slate-600" />
              </div>
              <h4 className="text-slate-300 font-medium mb-1">Biblioteca vazia</h4>
              <p className="text-slate-500 text-sm max-w-xs">
                Crie um novo projeto ou use a traducao rapida acima para comecar
              </p>
            </div>
          ) : (
            /* Manga Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mangas.map((manga) => (
                <div
                  key={manga.id}
                  onClick={() => handleMangaClick(manga)}
                  className="group cursor-pointer bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                >
                  {/* Cover */}
                  <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden">
                    {manga.coverUrl ? (
                      <img
                        src={manga.coverUrl}
                        alt={manga.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpenIcon className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                    {/* Chapter count badge */}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-xs text-white px-2 py-0.5 rounded-md">
                      {manga.chapters.length} cap.
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                      {manga.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatDate(manga.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LibraryPage;
