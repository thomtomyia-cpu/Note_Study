import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;

const docCache = new Map<string, PDFDocumentProxy>();
const pageCache = new Map<string, string>();

async function loadDocument(url: string): Promise<PDFDocumentProxy> {
  const cached = docCache.get(url);
  if (cached) return cached;
  const loadingTask = pdfjsLib.getDocument(url);
  const doc = await loadingTask.promise;
  docCache.set(url, doc);
  return doc;
}

export async function renderPdfPage(
  url: string,
  pageNumber: number,
  scale: number,
): Promise<string> {
  const cacheKey = `${url}:${pageNumber}:${scale}`;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  const doc = await loadDocument(url);
  if (pageNumber > doc.numPages) return '';
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
  pageCache.set(cacheKey, dataUrl);
  return dataUrl;
}

export async function getPdfPageCount(url: string): Promise<number> {
  const doc = await loadDocument(url);
  return doc.numPages;
}

export async function renderPdfPages(
  url: string,
  pageNumbers: number[],
  scale: number,
): Promise<string[]> {
  return Promise.all(pageNumbers.map((pn) => renderPdfPage(url, pn, scale)));
}

export function isPdfUrl(url: string | null): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');
}
