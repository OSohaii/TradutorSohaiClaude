export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextBubble {
  id: string;
  originalText: string;
  translatedText: string;
  box: BoundingBox;
  type?: 'dialogue' | 'sfx'; // New field for identifying bubble type
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string; // 'normal' | 'bold'
  fontStyle?: string;  // 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  letterSpacing?: number;
  lineHeight?: number; // Multiplier: 1.0, 1.2, 1.5, etc.
  scale?: number; // Multiplier: 1.0 = 100%, 0.8 = 80%
  color?: string; // Cor do texto, ex: '#000000'
  rotation?: number; // Rotação em graus
}

export interface TranslationResult {
  bubbles: TextBubble[];
}

export enum ViewMode {
  ORIGINAL = 'ORIGINAL',
  TRANSLATED = 'TRANSLATED',
  SIDE_BY_SIDE = 'SIDE_BY_SIDE'
}

export interface ProcessedImage {
  id: string;
  fileName: string;
  imageUrl: string;
  base64: string;
  bubbles: TextBubble[];
  status: 'idle' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  maskDataUrl?: string; // Stores the painted whiteout layer
  translatedImageUrl?: string; // URL for server-side rendered translations (e.g. Torii)
}