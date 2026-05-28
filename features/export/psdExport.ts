import { writePsd, Psd, Layer } from 'ag-psd';
import { ProcessedImage, TextBubble } from '../../types';

/**
 * Loads an image URL into an HTMLCanvasElement for pixel data extraction.
 */
async function loadImageAsCanvas(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Creates a text layer for a bubble, positioned at the bubble's bounding box.
 */
function createTextLayer(
  bubble: TextBubble,
  index: number,
  imageWidth: number,
  imageHeight: number
): Layer {
  const x = Math.round(bubble.box.xmin * imageWidth / 1000);
  const y = Math.round(bubble.box.ymin * imageHeight / 1000);
  const x2 = Math.round(bubble.box.xmax * imageWidth / 1000);
  const y2 = Math.round(bubble.box.ymax * imageHeight / 1000);

  const textContent = bubble.translatedText || bubble.originalText || '';
  const namePreview = textContent.substring(0, 20);
  const layerName = `Bubble ${index + 1} - ${namePreview}`;

  return {
    name: layerName,
    top: y,
    left: x,
    right: x2,
    bottom: y2,
    text: {
      text: textContent,
    },
  };
}

/**
 * Exports a ProcessedImage as a PSD file with editable layers.
 *
 * Layer structure:
 * - Layer 0 (bottom): "Original" - full source image
 * - Layer 1 (optional): "Cleaned" - cleaned/inpainted image if available
 * - Layer 2+: Text layers - one per bubble positioned at bounding box
 */
export async function exportToPsd(image: ProcessedImage): Promise<Blob> {
  // Load the original image
  const originalCanvas = await loadImageAsCanvas(image.imageUrl);
  const imageWidth = originalCanvas.width;
  const imageHeight = originalCanvas.height;

  // Build layers array
  const children: Layer[] = [];

  // Layer 0: Original image
  children.push({
    name: 'Original',
    canvas: originalCanvas,
  });

  // Layer 1 (optional): Cleaned/inpainted image
  if (image.translatedImageUrl) {
    const cleanedCanvas = await loadImageAsCanvas(image.translatedImageUrl);
    children.push({
      name: 'Cleaned',
      canvas: cleanedCanvas,
    });
  }

  // Layer 2+: Text layers for each bubble
  image.bubbles.forEach((bubble, index) => {
    children.push(createTextLayer(bubble, index, imageWidth, imageHeight));
  });

  // Create PSD structure
  const psd: Psd = {
    width: imageWidth,
    height: imageHeight,
    children,
  };

  // Generate PSD buffer
  const buffer = writePsd(psd);

  // Convert ArrayBuffer to Blob
  return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Downloads a Blob as a file using a temporary anchor element.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
