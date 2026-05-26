import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TextBubble } from "../types";

// Schema definition for the expected output of OCR+Translation
const bubbleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bubbles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalText: {
            type: Type.STRING,
            description: "The original Japanese/English text found in the bubble.",
          },
          translatedText: {
            type: Type.STRING,
            description: "The translation of the text into Portuguese (PT-BR). If translation is skipped, this should match originalText.",
          },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Bounding box coordinates [ymin, xmin, ymax, xmax] normalized to 1000.",
          },
        },
        required: ["originalText", "translatedText", "box_2d"],
      },
    },
  },
  required: ["bubbles"],
};

// Schema for text-only translation re-pass
const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    translations: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "The translated text in Portuguese.",
      },
    },
  },
  required: ["translations"],
};

export type TokenUsageData = {
  input: number;
  output: number;
  total: number;
  model: string;
};

// Advanced System Instruction for Manga Processing
const MANGA_SYSTEM_INSTRUCTION = `You are an expert Manga Translator and Localizer specialized in Brazilian Portuguese (PT-BR), with a focus on Fantasy, RPG, and Action genres (Isekai/Shonen).

1. OCR & Reading Direction (Critical):
- Vertical Text (Tategaki): Read top-to-bottom, right-to-left. Merge characters into coherent sentences.
- Horizontal Text: Read left-to-right.
- Furigana: Ignore ruby text; extract only the main Kanji/Kana.

2. SFX & Onomatopoeia:
- Identify handwritten sound effects.
- Output Format: [SFX: Som/Significado] (e.g., [SFX: Estrondo]).

3. Translation & Localization Strategy:
- Target Audience: Brazilian fans of Shonen/Seinen manga.
- Tone: Natural, conversational, and culturally adapted. Use appropriate slang (e.g., "cara", "droga", "maldito") based on the character's personality.
- English Source: If the source is English slang (e.g., "bloody", "mate"), localize to Brazilian Portuguese equivalents.

4. Honorifics Policy (Japanese Source):
- STRICTLY PRESERVE: -san, -sama, -kun, -chan, Senpai, Sensei, Kohai.
- Do NOT translate these to "Sr.", "Mestre", "Professor". Keep the Japanese suffix.

5. INTELLIGENT TERMINOLOGY DETECTION (The "Cool Factor" Rule):
- Context: In Fantasy/RPG settings, specific terms are treated as Proper Nouns and sound better in English.
- RULE: You must contextually identify and PRESERVE the following in English:
  - **Combat Moves/Attacks**: (e.g., "Fireball", "Wind Blade", "Getsuga Tenshou", "Smash").
  - **Magic Spells & Skills**: (e.g., "Heal", "Stealth", "Appraisal", "Mana Shield").
  - **Fantasy Titles & Ranks**: (e.g., "Demon Lord", "High Orc", "Rank S", "Guild Master").
  - **System Notifications**: (e.g., "Level Up", "Quest Clear", "Skill Acquired").
- **How to Translate**:
  - Narrative: "He used Fireball!" -> "Ele usou Fireball!"
  - Title: "I am the Demon Lord." -> "Eu sou o Demon Lord."
  - Rank: "He is an S-Rank adventurer." -> "Ele é um aventureiro Rank S."
- **Do NOT translate literal names** of attacks to Portuguese (e.g., NEVER use "Bola de Fogo" or "Lorde Demônio").

Your output must be strict JSON following the provided schema.`;

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Identify Rate Limit / Quota errors
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 ||
        (error?.message && (
          error.message.includes('429') || 
          error.message.includes('quota') || 
          error.message.includes('RESOURCE_EXHAUSTED')
        ));

      // If it's a rate limit error and we have retries left
      if (isRateLimit && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i); // e.g., 2000, 4000, 8000 ms
        console.warn(`Gemini Rate Limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Throw non-retriable errors immediately
      if (!isRateLimit) throw error;
    }
  }
  
  throw lastError;
}

export const processMangaPage = async (
  base64Image: string, 
  model: string = "gemini-3-pro-preview", 
  apiKey?: string,
  onUsage?: (data: TokenUsageData) => void,
  skipTranslation: boolean = false
): Promise<TextBubble[]> => {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const promptText = skipTranslation 
    ? `Analyze this manga page.
1. **Visual Detection**: Identify all text regions (bubbles, narration, floating text, SFX).
2. **Extraction ONLY**: Extract the text exactly as shown. **DO NOT TRANSLATE**. Copy the extracted text into the 'translatedText' field as well.
3. **Bounding Boxes**: Provide [ymin, xmin, ymax, xmax] coordinates (0-1000 scale).`
    : `Analyze this manga page for translation.
1. **Visual Detection**: Identify all text regions (bubbles, narration, SFX).
2. **Extraction & Translation**: Extract the text exactly and translate it to Portuguese (Brazil) following the System Instructions.
3. **Fantasy Terminology**: If a text looks like a Skill Name, Attack Shout, or Fantasy Title/Rank (e.g., "Fireball", "Rank S"), KEEP IT IN ENGLISH.
4. **Bounding Boxes**: Provide [ymin, xmin, ymax, xmax] coordinates (0-1000 scale).`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", 
              data: base64Image,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: bubbleSchema,
        systemInstruction: MANGA_SYSTEM_INSTRUCTION,
      },
    }));

    // Report Token Usage
    if (response.usageMetadata && onUsage) {
      onUsage({
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0,
        model: model
      });
    }

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response from Gemini.");
    }

    const parsed = JSON.parse(jsonText);
    
    // Map the raw response to our TextBubble type
    const bubbles: TextBubble[] = parsed.bubbles
      .map((b: any, index: number) => {
        let type: 'dialogue' | 'sfx' = 'dialogue';
        let displayText = b.translatedText;

        // Detect SFX tag from AI output
        if (displayText && (displayText.startsWith('[SFX:') || displayText.startsWith('SFX:'))) {
          type = 'sfx';
          // Clean the tag for display: "[SFX: Boom]" -> "Boom"
          displayText = displayText.replace(/^\[?SFX:\s*/i, '').replace(/\]$/, '').trim();
        }

        return {
          id: `bubble-${index}-${Date.now()}`,
          originalText: b.originalText,
          translatedText: displayText,
          type: type, // Stores the detected type
          box: {
            ymin: b.box_2d[0],
            xmin: b.box_2d[1],
            ymax: b.box_2d[2],
            xmax: b.box_2d[3],
          },
        };
      })
      // Filter out invalid boxes (zero area, inverted coords, or too small to be valid text)
      .filter((b: TextBubble) => 
        b.box.xmax > b.box.xmin && 
        b.box.ymax > b.box.ymin &&
        (b.box.xmax - b.box.xmin) > 5 && // Min 0.5% width
        (b.box.ymax - b.box.ymin) > 5    // Min 0.5% height
      );

    return bubbles;

  } catch (error) {
    console.error("Error processing manga page:", error);
    throw error;
  }
};

export const translateBubbles = async (
  bubbles: TextBubble[], 
  model: string = "gemini-3-pro-preview", 
  apiKey?: string,
  onUsage?: (data: TokenUsageData) => void
): Promise<TextBubble[]> => {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    throw new Error("API Key is missing.");
  }
  
  if (bubbles.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
  // Prepare a list of texts to translate to maintain context
  const textsToTranslate = bubbles.map((b, i) => `Line ${i}: ${b.originalText || b.translatedText}`).join('\n');

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: `Translate the following manga text lines to Portuguese (Brazil). 
            
            STRICT RULES:
            1. Style: Informal, natural Brazilian Portuguese appropriate for manga/comics.
            2. Honorifics: Preserve Japanese honorifics (San, Sama, Kun, Chan, Sensei, Senpai).
            3. Slang: Localize English/American slang (e.g. "dude" -> "cara").
            
            4. **FANTASY & RPG TERMINOLOGY (CRITICAL)**:
               - Identify Proper Nouns that represent: Skills, Magic Spells, Special Attacks, Combat Moves, Fantasy Ranks, and Class Titles.
               - **KEEP THESE TERMS IN ENGLISH**. Do not translate them.
               - Examples of what to keep: "Fireball", "Wind Blade", "Stealth", "Demon Lord", "Rank S", "System Alert", "Double Slash".
               - Note: Translate the sentence *around* the term, but keep the term itself in English.
                 Ex: "Use Fireball now!" -> "Use Fireball agora!" (NOT "Use Bola de Fogo agora!")
            
            5. Return exactly one translation per line in the JSON array, matching the order of input.
            
            Input:
            ${textsToTranslate}`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        systemInstruction: "You are a professional manga translator. Follow the Fantasy/RPG terminology rules strictly."
      }
    }));

    // Report Token Usage
    if (response.usageMetadata && onUsage) {
      onUsage({
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0,
        model: model
      });
    }

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini Translation.");

    const parsed = JSON.parse(jsonText);
    const translations = parsed.translations;

    if (!translations || translations.length !== bubbles.length) {
      console.warn("Translation count mismatch, falling back to original");
      return bubbles;
    }

    return bubbles.map((b, i) => {
      let displayText = translations[i];
      let type = b.type || 'dialogue';

      // Re-detect SFX if translation introduced it
      if (displayText && (displayText.startsWith('[SFX:') || displayText.startsWith('SFX:'))) {
         type = 'sfx';
         displayText = displayText.replace(/^\[?SFX:\s*/i, '').replace(/\]$/, '').trim();
      }

      return {
        ...b,
        type: type,
        translatedText: displayText
      };
    });

  } catch (error: any) {
    console.error("Error re-translating bubbles:", error);
    return bubbles; 
  }
};