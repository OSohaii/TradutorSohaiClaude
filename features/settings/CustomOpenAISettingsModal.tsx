import React from 'react';
import { XMarkIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CustomOpenAISettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const customOpenaiBaseUrl = useAuthStore(s => s.customOpenaiBaseUrl);
  const setCustomOpenaiBaseUrl = useAuthStore(s => s.setCustomOpenaiBaseUrl);
  const customOpenaiApiKey = useAuthStore(s => s.customOpenaiApiKey);
  const setCustomOpenaiApiKey = useAuthStore(s => s.setCustomOpenaiApiKey);
  const customOpenaiModel = useAuthStore(s => s.customOpenaiModel);
  const setCustomOpenaiModel = useAuthStore(s => s.setCustomOpenaiModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
        <div className="flex items-center gap-2 mb-4">
          <CommandLineIcon className="w-6 h-6 text-teal-400" />
          <h3 className="text-xl font-bold text-white">Custom OpenAI</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Configure um endpoint compativel com a API OpenAI (Ollama, LM Studio, OpenRouter, etc.).
          Suas credenciais ficam apenas no seu navegador.
        </p>

        <div className="space-y-3 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Base URL</label>
            <input
              type="text"
              placeholder="http://localhost:11434/v1"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              value={customOpenaiBaseUrl}
              onChange={e => setCustomOpenaiBaseUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">API Key (opcional)</label>
            <input
              type="password"
              placeholder="sk-... (deixe vazio para servidores locais)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              value={customOpenaiApiKey}
              onChange={e => setCustomOpenaiApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Model Name</label>
            <input
              type="text"
              placeholder="llama3"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              value={customOpenaiModel}
              onChange={e => setCustomOpenaiModel(e.target.value)}
            />
          </div>
        </div>

        <button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-teal-900/20">
          Salvar Configuracao
        </button>
      </div>
    </div>
  );
};

export default CustomOpenAISettingsModal;
