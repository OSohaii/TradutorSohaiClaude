
import { TextBubble } from '../types';

// Configurações da API
const ICHIGO_API_URL = 'https://ichigoreader.com';
const PROXY_URL = 'https://corsproxy.io/?'; 

// Mapeamento de Idiomas
const LANGUAGE_CODES: Record<string, string> = {
  'Português (Brasil)': 'pt',
  'English': 'en',
  'Español': 'es',
  'Français': 'fr',
  'Italiano': 'it',
  'Deutsch': 'de',
  '日本語': 'ja'
};

// Modelos Disponíveis no Ichigo
export const ICHIGO_MODELS = [
  { id: 'Gemini 3 Pro', name: 'Gemini 3 Pro' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini-1.5-Flash' }
];

const getClientUuid = (): string => {
  if (typeof window === 'undefined') return 'server-side';
  let uuid = localStorage.getItem('ichigo_client_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem('ichigo_client_uuid', uuid);
  }
  return uuid;
};

const getFingerprint = (): string => {
  if (typeof window === 'undefined') return 'unknown-fingerprint';
  let fp = localStorage.getItem('ichigo_fingerprint');
  if (!fp) {
      const ua = navigator.userAgent.replace(/\D+/g, '').slice(0, 10);
      const screen = `${window.screen.width}x${window.screen.height}`;
      fp = `web-${ua}-${screen}-${Date.now().toString(36)}`;
      localStorage.setItem('ichigo_fingerprint', fp);
  }
  return fp;
};

const resizeImageIfNeeded = async (base64: string): Promise<{ base64: string, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const width = img.width;
            const height = img.height;
            const maxDim = 1600; 

            if (width <= maxDim && height <= maxDim) {
                resolve({ base64: base64.replace(/^data:image\/\w+;base64,/, ''), width, height });
                return;
            }

            const scale = Math.min(maxDim / width, maxDim / height);
            const newWidth = Math.round(width * scale);
            const newHeight = Math.round(height * scale);

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve({ base64: base64.replace(/^data:image\/\w+;base64,/, ''), width, height });
                return;
            }

            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            const newBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            resolve({ base64: newBase64, width: newWidth, height: newHeight });
        };
        img.onerror = reject;
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

export const loginIchigo = async (email: string, pass: string): Promise<string> => {
  const url = `${ICHIGO_API_URL}/auth/login`;
  const proxiedUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxiedUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '1.0.8' // Versão atualizada para evitar 403
      },
      body: JSON.stringify({ email, password: pass })
    });
    
    if (!response.ok) {
        throw new Error(`Erro de Login Ichigo (${response.status})`);
    }
    
    const data = await response.json();
    const token = data?.tokens?.accessToken || data?.accessToken;
    if (!token) throw new Error("Token não recebido.");
    
    return token;
  } catch (error) {
    console.error("Erro no Login Ichigo:", error);
    throw error;
  }
};

export const translateImageWithIchigo = async (
  base64Image: string, 
  token: string, 
  targetLanguageName: string = 'Português (Brasil)',
  translationModel: string = 'Gemini 3 Pro'
): Promise<TextBubble[]> => {
  const url = `${ICHIGO_API_URL}/translate`;
  const proxiedUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
  
  const targetCode = LANGUAGE_CODES[targetLanguageName] || 'pt';
  const { base64: cleanBase64, width, height } = await resizeImageIfNeeded(base64Image);

  try {
    const response = await fetch(proxiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Version': '1.0.8',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        base64Images: [`data:image/jpeg;base64,${cleanBase64}`],
        targetLangCode: targetCode,
        model: translationModel,
        fingerprint: getFingerprint(),
        clientUuid: getClientUuid()
      })
    });

    if (response.status === 429) throw new Error('Limite do plano Ichigo excedido.');
    if (response.status === 401 || response.status === 403) throw new Error('Sessão Ichigo expirada ou acesso negado (403).');
    if (!response.ok) throw new Error(`Erro na Tradução Ichigo (${response.status})`);

    const data = await response.json();
    if (!data.images || !data.images[0]) return [];

    const results = data.images[0];

    return results.map((item: any, idx: number) => {
      const minX = item.minX || 0;
      const minY = item.minY || 0;
      const maxX = item.maxX || width;
      const maxY = item.maxY || height;

      return {
        id: `ichigo-${idx}-${Date.now()}`,
        originalText: item.originalText || item.translatedText || "...",
        translatedText: item.translatedText || "...",
        box: {
          ymin: Math.round((minY / height) * 1000),
          xmin: Math.round((minX / width) * 1000),
          ymax: Math.round((maxY / height) * 1000),
          xmax: Math.round((maxX / width) * 1000)
        }
      };
    });

  } catch (error) {
    console.error("Falha na tradução Ichigo:", error);
    throw error;
  }
};
