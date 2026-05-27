import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ProcessedImage } from '../../types';
import { renderToCanvas, RenderCanvasParams } from './downloadCanvas';

export type RenderParams = Omit<RenderCanvasParams, 'image'>;

/**
 * Export multiple pages as a single PDF. Each page is sized to match
 * the image's aspect ratio.
 */
export async function exportAsPdf(
  images: ProcessedImage[],
  renderParams: RenderParams,
): Promise<void> {
  if (images.length === 0) return;

  let doc: InstanceType<typeof jsPDF> | null = null;

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const canvas = await renderToCanvas({ ...renderParams, image });

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';

    if (i === 0) {
      doc = new jsPDF({
        orientation,
        unit: 'px',
        format: [imgWidth, imgHeight],
      });
    } else {
      doc!.addPage([imgWidth, imgHeight], orientation);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    doc!.addImage(dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight);
  }

  if (doc) {
    doc.save('mangalens_export.pdf');
  }
}

/**
 * Export multiple pages as a ZIP of PNG files.
 */
export async function exportAsZip(
  images: ProcessedImage[],
  renderParams: RenderParams,
): Promise<void> {
  if (images.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('mangalens_export');

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const canvas = await renderToCanvas({ ...renderParams, image });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png',
      );
    });

    const pageNum = String(i + 1).padStart(3, '0');
    const safeName = image.fileName.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    folder!.file(`${pageNum}_${safeName}.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mangalens_export.zip';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
