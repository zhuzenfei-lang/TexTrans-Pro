import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextBlock } from '../types.ts';
import { clusterTextItems } from './textCluster.ts';
import type { RawTextItem } from './textCluster.ts';

// Setup pdfjs worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || '/pdf.worker.min.mjs';
}

/**
 * Load PDF Document from ArrayBuffer or Uint8Array
 */
export async function loadPdfDocument(data: ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/standard_fonts/',
  });
  return await loadingTask.promise;
}

/**
 * Render a specific page of a PDF document to a Canvas element and extract text blocks
 */
export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  displayScale: number = 1.0
): Promise<{ width: number; height: number; textBlocks: TextBlock[] }> {
  const page = await pdfDoc.getPage(pageNumber);
  
  const baseViewport = page.getViewport({ scale: displayScale });
  const width = Math.round(baseViewport.width);
  const height = Math.round(baseViewport.height);

  // HiDPI rendering factor (2.0 for retina sharpness)
  const pixelRatio = window.devicePixelRatio || 1.5;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);

  const renderContext = {
    canvasContext: ctx,
    viewport: baseViewport,
  };

  await page.render(renderContext).promise;
  ctx.restore();

  // Extract text items
  const textContent = await page.getTextContent();
  const rawItems: RawTextItem[] = [];

  for (const item of textContent.items) {
    if ('str' in item && item.str.trim() !== '') {
      const transform = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
      const [vx, vy] = baseViewport.convertToViewportPoint(transform[4], transform[5]);
      const itemHeight = Math.abs(transform[3]) * baseViewport.scale;
      const itemWidth = item.width * (baseViewport.scale / (page.getViewport({ scale: 1.0 }).scale || 1.0));

      rawItems.push({
        str: item.str,
        x: vx,
        y: vy - itemHeight,
        width: itemWidth,
        height: itemHeight
      });
    }
  }

  const textBlocks = clusterTextItems(rawItems, pageNumber);
  return { width, height, textBlocks };
}

/**
 * Extract text blocks and page dimensions without requiring a canvas (useful for batch multi-page processing)
 */
export async function extractPageBlocks(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  displayScale: number = 1.0
): Promise<{ width: number; height: number; textBlocks: TextBlock[] }> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: displayScale });
  const width = Math.round(baseViewport.width);
  const height = Math.round(baseViewport.height);

  const textContent = await page.getTextContent();
  const rawItems: RawTextItem[] = [];

  for (const item of textContent.items) {
    if ('str' in item && item.str.trim() !== '') {
      const transform = item.transform;
      const [vx, vy] = baseViewport.convertToViewportPoint(transform[4], transform[5]);
      const itemHeight = Math.abs(transform[3]) * baseViewport.scale;
      const itemWidth = item.width * (baseViewport.scale / (page.getViewport({ scale: 1.0 }).scale || 1.0));

      rawItems.push({
        str: item.str,
        x: vx,
        y: vy - itemHeight,
        width: itemWidth,
        height: itemHeight
      });
    }
  }

  const textBlocks = clusterTextItems(rawItems, pageNumber);
  return { width, height, textBlocks };
}

