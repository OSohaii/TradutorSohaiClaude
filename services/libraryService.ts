import { Manga, Chapter, MangaPage, LibraryState } from '../types/library';
import { ProcessedImage, TextBubble } from '../types';
import { saveImage, loadImage, deleteImage, deleteImages } from './imageStorage';

const LIBRARY_STORAGE_KEY = 'mangalens_library';
const MAX_THUMBNAIL_SIZE = 150;

// Gerar ID único
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Criar thumbnail de uma imagem
const createThumbnail = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(MAX_THUMBNAIL_SIZE / img.width, MAX_THUMBNAIL_SIZE / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
};

// Carregar biblioteca do localStorage
export const loadLibrary = (): LibraryState => {
  try {
    const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Migrar dados antigos: se páginas têm imageUrl no localStorage, migrar para IndexedDB
      migrateOldData(data);
      return data;
    }
  } catch (e) {
    console.error('Erro ao carregar biblioteca:', e);
  }
  return {
    mangas: [],
    currentMangaId: null,
    currentChapterId: null
  };
};

// Migrar dados antigos do localStorage para IndexedDB
const migrateOldData = async (state: LibraryState) => {
  for (const manga of state.mangas) {
    for (const chapter of manga.chapters) {
      for (const page of chapter.pages) {
        // Se a página tem imageUrl grande (base64), migrar para IndexedDB
        if (page.imageUrl && page.imageUrl.startsWith('data:image') && page.imageUrl.length > 1000) {
          try {
            await saveImage(page.id, page.imageUrl, page.maskDataUrl, page.translatedImageUrl);
            // Limpar do objeto (será salvo sem as imagens grandes)
            page.imageUrl = '';
            page.maskDataUrl = '';
            page.translatedImageUrl = '';
            console.log(`Migrada página ${page.id} para IndexedDB`);
          } catch (e) {
            console.error(`Erro ao migrar página ${page.id}:`, e);
          }
        }
      }
    }
  }
};

// Salvar biblioteca no localStorage (apenas metadados, imagens ficam no IndexedDB)
export const saveLibrary = (state: LibraryState): void => {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Erro ao salvar biblioteca:', e);
    // Se exceder o limite, tentar limpar thumbnails antigos
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert('Espaço de armazenamento cheio. Considere excluir alguns mangás antigos.');
    }
  }
};

// Criar novo mangá
export const createManga = (title: string): Manga => {
  return {
    id: generateId(),
    title,
    chapters: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

// Criar novo capítulo
export const createChapter = (number: number, title?: string): Chapter => {
  return {
    id: generateId(),
    number,
    title,
    pages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

// Converter blob URL ou imagem para base64
const urlToBase64 = async (url: string): Promise<string> => {
  // Se já é base64, retornar como está
  if (url.startsWith('data:image')) {
    return url;
  }
  
  // Se é blob URL ou URL normal, converter para base64
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Não foi possível criar contexto do canvas'));
      }
    };
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = url;
  });
};

// Converter ProcessedImage para MangaPage (salva imagem no IndexedDB)
export const processedImageToPage = async (image: ProcessedImage): Promise<MangaPage> => {
  const pageId = generateId();
  
  console.log('=== SALVANDO PÁGINA ===');
  console.log('Page ID:', pageId);
  console.log('Image URL original:', image.imageUrl?.substring(0, 100));
  
  // Converter URLs para base64 antes de salvar
  let imageBase64 = '';
  let maskBase64 = '';
  let translatedBase64 = '';
  
  try {
    if (image.imageUrl) {
      imageBase64 = await urlToBase64(image.imageUrl);
      console.log('Image convertida para base64, length:', imageBase64.length);
    }
    if (image.maskDataUrl) {
      maskBase64 = image.maskDataUrl; // Já deve ser base64
    }
    if (image.translatedImageUrl) {
      translatedBase64 = await urlToBase64(image.translatedImageUrl);
    }
  } catch (e) {
    console.error('Erro ao converter imagem para base64:', e);
  }
  
  const thumbnail = await createThumbnail(imageBase64 || image.imageUrl);
  console.log('Thumbnail criado, length:', thumbnail?.length || 0);
  
  // Salvar imagem grande no IndexedDB
  if (imageBase64.length > 0) {
    await saveImage(pageId, imageBase64, maskBase64, translatedBase64);
    console.log('Imagem salva no IndexedDB com sucesso!');
  } else {
    console.warn('AVISO: imageUrl está vazia após conversão! Não foi possível salvar a imagem.');
  }
  
  return {
    id: pageId,
    fileName: image.fileName,
    imageUrl: '', // Não salvar no localStorage, usar IndexedDB
    thumbnailUrl: thumbnail,
    bubblesData: JSON.stringify(image.bubbles),
    maskDataUrl: '', // Não salvar no localStorage
    translatedImageUrl: '', // Não salvar no localStorage
    createdAt: Date.now()
  };
};

// Converter MangaPage para ProcessedImage (carrega imagem do IndexedDB)
export const pageToProcessedImage = async (page: MangaPage): Promise<ProcessedImage> => {
  let bubbles: TextBubble[] = [];
  try {
    bubbles = JSON.parse(page.bubblesData);
  } catch (e) {
    console.error('Erro ao parsear bubbles:', e);
  }

  console.log('=== CARREGANDO PÁGINA ===');
  console.log('Page ID:', page.id);
  console.log('Thumbnail length:', page.thumbnailUrl?.length || 0);
  
  // Carregar imagem do IndexedDB
  const imageData = await loadImage(page.id);
  
  console.log('ImageData do IndexedDB:', imageData ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
  if (imageData) {
    console.log('imageUrl length:', imageData.imageUrl?.length || 0);
  }
  
  // Fallback: tentar usar dados antigos se IndexedDB não tiver
  const finalImageUrl = imageData?.imageUrl || page.imageUrl || page.thumbnailUrl || '';
  console.log('Final imageUrl length:', finalImageUrl?.length || 0);
  
  return {
    id: page.id,
    fileName: page.fileName,
    imageUrl: finalImageUrl,
    base64: '',
    bubbles,
    status: 'done',
    maskDataUrl: imageData?.maskDataUrl || page.maskDataUrl,
    translatedImageUrl: imageData?.translatedImageUrl || page.translatedImageUrl
  };
};

// Adicionar mangá à biblioteca
export const addManga = (state: LibraryState, manga: Manga): LibraryState => {
  return {
    ...state,
    mangas: [manga, ...state.mangas]
  };
};

// Atualizar mangá
export const updateManga = (state: LibraryState, mangaId: string, updates: Partial<Manga>): LibraryState => {
  return {
    ...state,
    mangas: state.mangas.map(m => 
      m.id === mangaId 
        ? { ...m, ...updates, updatedAt: Date.now() } 
        : m
    )
  };
};

// Deletar mangá
export const deleteManga = (state: LibraryState, mangaId: string): LibraryState => {
  return {
    ...state,
    mangas: state.mangas.filter(m => m.id !== mangaId),
    currentMangaId: state.currentMangaId === mangaId ? null : state.currentMangaId,
    currentChapterId: state.currentMangaId === mangaId ? null : state.currentChapterId
  };
};

// Adicionar capítulo a um mangá
export const addChapter = (state: LibraryState, mangaId: string, chapter: Chapter): LibraryState => {
  return {
    ...state,
    mangas: state.mangas.map(m => 
      m.id === mangaId 
        ? { 
            ...m, 
            chapters: [...m.chapters, chapter].sort((a, b) => a.number - b.number),
            updatedAt: Date.now() 
          } 
        : m
    )
  };
};

// Atualizar capítulo
export const updateChapter = (state: LibraryState, mangaId: string, chapterId: string, updates: Partial<Chapter>): LibraryState => {
  return {
    ...state,
    mangas: state.mangas.map(m => 
      m.id === mangaId 
        ? { 
            ...m, 
            chapters: m.chapters.map(c => 
              c.id === chapterId 
                ? { ...c, ...updates, updatedAt: Date.now() } 
                : c
            ),
            updatedAt: Date.now() 
          } 
        : m
    )
  };
};

// Deletar capítulo
export const deleteChapter = (state: LibraryState, mangaId: string, chapterId: string): LibraryState => {
  return {
    ...state,
    mangas: state.mangas.map(m => 
      m.id === mangaId 
        ? { 
            ...m, 
            chapters: m.chapters.filter(c => c.id !== chapterId),
            updatedAt: Date.now() 
          } 
        : m
    ),
    currentChapterId: state.currentChapterId === chapterId ? null : state.currentChapterId
  };
};

// Adicionar páginas a um capítulo
export const addPagesToChapter = async (
  state: LibraryState, 
  mangaId: string, 
  chapterId: string, 
  images: ProcessedImage[]
): Promise<LibraryState> => {
  const pages = await Promise.all(images.map(processedImageToPage));
  
  return {
    ...state,
    mangas: state.mangas.map(m => 
      m.id === mangaId 
        ? { 
            ...m, 
            chapters: m.chapters.map(c => 
              c.id === chapterId 
                ? { ...c, pages: [...c.pages, ...pages], updatedAt: Date.now() } 
                : c
            ),
            coverUrl: m.coverUrl || pages[0]?.thumbnailUrl,
            updatedAt: Date.now() 
          } 
        : m
    )
  };
};

// Obter mangá por ID
export const getMangaById = (state: LibraryState, mangaId: string): Manga | undefined => {
  return state.mangas.find(m => m.id === mangaId);
};

// Obter capítulo por ID
export const getChapterById = (state: LibraryState, mangaId: string, chapterId: string): Chapter | undefined => {
  const manga = getMangaById(state, mangaId);
  return manga?.chapters.find(c => c.id === chapterId);
};

// Obter estatísticas da biblioteca
export const getLibraryStats = (state: LibraryState) => {
  const totalMangas = state.mangas.length;
  const totalChapters = state.mangas.reduce((acc, m) => acc + m.chapters.length, 0);
  const totalPages = state.mangas.reduce((acc, m) => 
    acc + m.chapters.reduce((cacc, c) => cacc + c.pages.length, 0), 0
  );
  
  return { totalMangas, totalChapters, totalPages };
};
