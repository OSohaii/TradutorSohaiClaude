import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ProcessedImage } from '../../types';

export interface ExportRenderParams {
  defaultFont?: string;
  globalBold: boolean;
  globalItalic: boolean;
  globalBubbleScale: number;
  isBubbleTransparent: boolean;
  showTextStroke: boolean;
  calculatedFontSizes: Record<string, number>;
}

/**
 * Renders a ProcessedImage onto an offscreen canvas and returns it.
 * Reuses the same rendering logic from downloadCanvas.ts.
 */
async function renderToCanvas(
  image: ProcessedImage,
  params: ExportRenderParams,
): Promise<HTMLCanvasElement | null> {
  const { defaultFont, globalBold, globalItalic, globalBubbleScale, isBubbleTransparent, showTextStroke, calculatedFontSizes } = params;

  // Load the source image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image'));
    el.src = image.imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Pre-load fonts
  const uniqueFonts = [...new Set(image.bubbles.map(b => b.fontFamily || defaultFont || 'sans-serif'))];
  await Promise.all(uniqueFonts.map(f => document.fonts.load(`bold 16px ${f}`).catch(() => {})));
  await document.fonts.ready;

  // Draw base image
  ctx.drawImage(img, 0, 0);

  // Draw mask layer if available
  if (image.maskDataUrl) {
    const maskImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load mask'));
      el.src = image.maskDataUrl!;
    });
    ctx.drawImage(maskImg, 0, 0);
  }

  // Helper: draw rounded rect
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Draw bubbles
  for (const bubble of image.bubbles) {
    const bWidth = (bubble.box.xmax - bubble.box.xmin) / 1000 * canvas.width;
    const bHeight = (bubble.box.ymax - bubble.box.ymin) / 1000 * canvas.height;
    const bx = bubble.box.xmin / 1000 * canvas.width;
    const by = bubble.box.ymin / 1000 * canvas.height;

    const bubbleScale = bubble.scale ?? globalBubbleScale;
    const sWidth = bWidth * bubbleScale;
    const sHeight = bHeight * bubbleScale;
    const sx = bx + (bWidth - sWidth) / 2;
    const sy = by + (bHeight - sHeight) / 2;

    const centerX = sx + sWidth / 2;
    const centerY = sy + sHeight / 2;
    const rot = (bubble.rotation || 0) * Math.PI / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rot);

    // Draw background
    if (!isBubbleTransparent && bubble.type !== 'sfx') {
      ctx.fillStyle = 'white';
      drawRoundedRect(-sWidth / 2, -sHeight / 2, sWidth, sHeight, 10);
      ctx.fill();
    }

    // Text properties
    const bFontSize = bubble.fontSize || calculatedFontSizes[bubble.id] || 14;
    const bFont = bubble.fontFamily || defaultFont || 'sans-serif';
    const bWeight = bubble.fontWeight || (globalBold ? 'bold' : 'normal');
    const bStyle = bubble.fontStyle || (globalItalic ? 'italic' : 'normal');
    const bColor = bubble.color || '#000000';
    const bLineHeight = (bubble.lineHeight || 1.15) * bFontSize;
    const shouldUpper = bFont.includes('CC Wild Words Roman BR') || bFont.includes('Anime Ace BR');

    ctx.font = `${bStyle} ${bWeight} ${bFontSize}px ${bFont}`;
    ctx.textAlign = (bubble.textAlign || 'center') as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    let text = bubble.translatedText;
    if (shouldUpper) text = text.toUpperCase();

    // Word wrap
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxLineWidth = sWidth * 0.9;
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxLineWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const totalTextHeight = lines.length * bLineHeight;
    const textStartY = -totalTextHeight / 2 + bLineHeight / 2;
    const textX = bubble.textAlign === 'left' ? -sWidth * 0.45
                 : bubble.textAlign === 'right' ? sWidth * 0.45
                 : 0;

    if (showTextStroke) {
      const shadowOffset = 1;
      ctx.fillStyle = '#ffffff';
      for (const [dx, dy] of [[-shadowOffset, -shadowOffset], [shadowOffset, -shadowOffset], [-shadowOffset, shadowOffset], [shadowOffset, shadowOffset]] as [number, number][]) {
        let lineY = textStartY;
        for (const line of lines) {
          ctx.fillText(line.trim(), textX + dx, lineY + dy);
          lineY += bLineHeight;
        }
      }
    } else if (isBubbleTransparent || bubble.type === 'sfx') {
      ctx.save();
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#ffffff';
      for (let pass = 0; pass < 2; pass++) {
        let lineY = textStartY;
        for (const line of lines) {
          ctx.fillText(line.trim(), textX, lineY);
          lineY += bLineHeight;
        }
      }
      ctx.restore();
    }

    // Draw main text
    ctx.fillStyle = bColor;
    let lineY = textStartY;
    for (const line of lines) {
      ctx.fillText(line.trim(), textX, lineY);
      lineY += bLineHeight;
    }

    ctx.restore();
  }

  return canvas;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-.]/g, '_');
}

/**
 * Export an array of translated pages as a single PDF file.
 */
export async function exportAsPDF(
  images: ProcessedImage[],
  params: ExportRenderParams,
): Promise<void> {
  if (images.length === 0) return;

  // Render the first image to determine initial page size
  const firstCanvas = await renderToCanvas(images[0], params);
  if (!firstCanvas) return;

  const pdf = new jsPDF({
    orientation: firstCanvas.width > firstCanvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [firstCanvas.width, firstCanvas.height],
  });

  // Add first page
  const firstData = firstCanvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(firstData, 'JPEG', 0, 0, firstCanvas.width, firstCanvas.height);

  // Add remaining pages
  for (let i = 1; i < images.length; i++) {
    const canvas = await renderToCanvas(images[i], params);
    if (!canvas) continue;
    pdf.addPage([canvas.width, canvas.height], canvas.width > canvas.height ? 'landscape' : 'portrait');
    const data = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(data, 'JPEG', 0, 0, canvas.width, canvas.height);
  }

  pdf.save('mangalens_export.pdf');
}

/**
 * Export an array of translated pages as a ZIP of PNG files.
 */
export async function exportAsZIP(
  images: ProcessedImage[],
  params: ExportRenderParams,
): Promise<void> {
  if (images.length === 0) return;

  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const canvas = await renderToCanvas(images[i], params);
    if (!canvas) continue;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) continue;

    const safeName = sanitizeFilename(images[i].fileName);
    zip.file(`${String(i + 1).padStart(3, '0')}_${safeName}.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = 'mangalens_export.zip';
  link.click();
  URL.revokeObjectURL(link.href);
}
