import { TextBubble } from '../types';
import { translateBubbles as translateWithGemini, TokenUsageData } from './geminiService';

const PROXY_URL = 'https://corsproxy.io/?';

export const translateWithGoogle = async (bubbles: TextBubble[]): Promise<TextBubble[]> => {
  if (bubbles.length === 0) return [];
  
  // Usando Google Translate Free Endpoint (GTX) via Proxy
  // Limitado, mas funciona para uso leve sem chave de API
  
  const translateOne = async (bubble: TextBubble): Promise<TextBubble> => {
      try {
          if (!bubble.originalText || !bubble.originalText.trim()) return bubble;
          
          const text = bubble.originalText.trim();
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
          const proxiedUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
          
          const res = await fetch(proxiedUrl);
          if (!res.ok) throw new Error(`GT Error ${res.status}`);
          
          const data = await res.json();
          // data[0] contém os segmentos traduzidos
          if (data && data[0]) {
              const translatedText = data[0].map((seg: any) => seg[0]).join('');
              return { ...bubble, translatedText };
          }
          return bubble;
      } catch (error) {
          console.warn(`Falha ao traduzir balão ${bubble.id} com Google:`, error);
          return bubble; 
      }
  };

  // Processa em paralelo
  return Promise.all(bubbles.map(translateOne));
};

export const translateWithDeepL = async (bubbles: TextBubble[], apiKey: string): Promise<TextBubble[]> => {
  if (bubbles.length === 0) return [];
  if (!apiKey) throw new Error("Chave API do DeepL não configurada.");

  const isFree = apiKey.endsWith(':fx');
  const apiDomain = isFree ? 'api-free.deepl.com' : 'api.deepl.com';
  const url = `https://${apiDomain}/v2/translate`;
  
  // DeepL suporta arrays no parâmetro text
  const params = new URLSearchParams();
  bubbles.forEach(b => params.append('text', b.originalText || ' '));
  params.append('target_lang', 'PT-BR');

  const proxiedUrl = `${PROXY_URL}${encodeURIComponent(url)}`;

  const res = await fetch(proxiedUrl, {
      method: 'POST',
      headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
  });

  if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro DeepL (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.translations || data.translations.length !== bubbles.length) {
      throw new Error("Resposta inválida do DeepL");
  }

  return bubbles.map((b, i) => ({
      ...b,
      translatedText: data.translations[i].text
  }));
};

export const performTranslation = async (
    bubbles: TextBubble[], 
    engine: string, 
    config: { 
      deepLKey?: string, 
      geminiModel?: string, 
      googleApiKey?: string,
      onUsage?: (data: TokenUsageData) => void 
    }
): Promise<TextBubble[]> => {
    switch (engine) {
        case 'GOOGLE':
            return translateWithGoogle(bubbles);
        case 'DEEPL':
            return translateWithDeepL(bubbles, config.deepLKey || '');
        default:
             // Assume que é um modelo Gemini
             return translateWithGemini(bubbles, config.geminiModel || 'gemini-3-pro-preview', config.googleApiKey, config.onUsage);
    }
};