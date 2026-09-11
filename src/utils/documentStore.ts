import { LawDocument } from '../types';
import { DEFAULT_LEGISLATION_DOCUMENTS } from '../data/defaultNorms';

const STORAGE_KEY = 'civil_legislation_custom_docs_v1';

export function getInitialDocuments(): LawDocument[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: LawDocument[] = JSON.parse(saved);
      // Combine built-in defaults with custom saved ones (avoiding duplicates by id)
      const customDocs = parsed.filter(d => d.sourceType !== 'built_in');
      return [...DEFAULT_LEGISLATION_DOCUMENTS, ...customDocs];
    }
  } catch (err) {
    console.error('Failed to load saved legislation documents:', err);
  }
  return DEFAULT_LEGISLATION_DOCUMENTS;
}

export function saveCustomDocuments(allDocs: LawDocument[]): void {
  try {
    const customDocs = allDocs.filter(d => d.sourceType !== 'built_in');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customDocs));
  } catch (err) {
    console.error('Failed to save custom documents:', err);
  }
}

/**
 * Extracts text from a PDF file using pdfjs-dist
 */
export async function extractTextFromPDF(file: File): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Dynamic import to keep bundle and worker clean
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set standard worker from cdn or local if available
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const pageTexts: string[] = [];

    // Extract text from up to 50 pages to prevent memory overflow
    const maxPages = Math.min(pageCount, 50);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0);
      
      pageTexts.push(`--- [PÁGINA ${i}] ---\n` + strings.join(' '));
    }

    const fullText = pageTexts.join('\n\n');
    return {
      text: fullText || 'Nenhum texto legível encontrado no PDF (pode ser imagem digitalizada).',
      pageCount,
    };
  } catch (err) {
    console.warn('pdfjs-dist worker fallback or parse issue, trying basic string extraction:', err);
    // Fallback: simple text decoder check if it's text-based
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const raw = textDecoder.decode(arrayBuffer);
    const cleaned = raw.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    if (cleaned.length > 200) {
      return { text: cleaned.slice(0, 15000), pageCount: 1 };
    }
    throw new Error('Não foi possível extrair o texto do PDF selecionado. Tente colar o texto diretamente ou enviar outro PDF.');
  }
}

/**
 * Searches and ranks the most relevant sections of the available legislation
 */
export function searchRelevantExcerpts(query: string, docs: LawDocument[], topN = 5): Array<{ doc: LawDocument; excerpt: string; score: number }> {
  const activeDocs = docs.filter(d => d.active);
  if (!query || activeDocs.length === 0) return [];

  const queryTerms = query.toLowerCase()
    .replace(/[^\w\sáéíóúãõâêîôûç]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const scoredSections: Array<{ doc: LawDocument; excerpt: string; score: number }> = [];

  for (const doc of activeDocs) {
    // Split doc into paragraphs or articles
    const paragraphs = doc.content.split(/\n{2,}|(?=ITEM\s+\d|Art\.\s+\d|Artigo\s+\d|CAPÍTULO)/i);

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (cleanPara.length < 20) continue;

      const lowerPara = cleanPara.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        if (lowerPara.includes(term)) {
          score += 10;
          // Bonus if exact match in title or code
          if (doc.code.toLowerCase().includes(term) || doc.title.toLowerCase().includes(term)) {
            score += 5;
          }
        }
      }

      if (score > 0) {
        scoredSections.push({
          doc,
          excerpt: cleanPara.slice(0, 800),
          score,
        });
      }
    }
  }

  return scoredSections
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
