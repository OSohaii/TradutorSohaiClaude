// Configurações da API
const TORII_API_URL = 'https://api.toriitranslate.com/api/upload';
const PROXY_URL = 'https://corsproxy.io/?'; 

export interface ToriiOptions {
  translator: string;
  strokeDisabled: boolean;
  inpaintOnly: boolean;
}

export const translateWithTorii = async (file: File, apiKey: string, options: ToriiOptions): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);

  // Headers conforme especificação
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "target_lang": "pt-br", 
    "translator": options.translator || "gemini-2.5-flash", 
    "font": "wildwords", 
    "text_align": "auto", 
    "stroke_disabled": String(options.strokeDisabled), 
    "inpaint_only": String(options.inpaintOnly),
  };

  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(TORII_API_URL)}`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    // A API retorna header "success": "true" em caso de sucesso
    const successHeader = response.headers.get("success");
    
    if (!response.ok || (successHeader && successHeader !== "true")) {
      const errorText = await response.text();
      // Tenta parsing de JSON caso o erro venha estruturado
      try {
          const jsonErr = JSON.parse(errorText);
          throw new Error(jsonErr.detail || jsonErr.error || "Erro desconhecido Torii");
      } catch (e) {
          throw new Error(`Torii API Error: ${errorText || response.statusText}`);
      }
    }

    return await response.blob();
  } catch (error) {
    console.error("Erro na tradução Torii:", error);
    throw error;
  }
};