import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import type { AttachedImage } from '../types.ts';

export async function fileToAttachedImage(file: File): Promise<AttachedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');
      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dataUrl,
        base64,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
        size: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text or image from uploaded files: Excel, Word, PDF, Email, or Images
 */
export async function parseUploadedFileToText(file: File): Promise<{
  text: string;
  fileType: 'excel' | 'word' | 'pdf' | 'email' | 'text' | 'image';
  fileName: string;
  charCount: number;
  imageAttachment?: AttachedImage;
}> {
  const name = file.name.toLowerCase();

  // 0. Image files (.png, .jpg, .jpeg, .webp, .bmp)
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) {
    const img = await fileToAttachedImage(file);
    return {
      text: '',
      fileType: 'image',
      fileName: file.name,
      charCount: 0,
      imageAttachment: img,
    };
  }


  // 1. Excel (.xlsx, .xls, .csv)
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const textParts: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv && csv.trim()) {
        textParts.push(`--- 工作表 [${sheetName}] ---\n${csv.trim()}`);
      }
    });

    const combined = textParts.join('\n\n');
    return {
      text: combined,
      fileType: 'excel',
      fileName: file.name,
      charCount: combined.length,
    };
  }

  // 2. Word (.docx, .doc)
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const buffer = await file.arrayBuffer();
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = result.value.trim();
      return {
        text,
        fileType: 'word',
        fileName: file.name,
        charCount: text.length,
      };
    } catch (err) {
      console.warn('Mammoth extraction failed, falling back to text decoder', err);
      const text = new TextDecoder().decode(buffer);
      const cleaned = text.replace(/[^\x20-\x7E\u4e00-\u9fa5\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ');
      return {
        text: cleaned,
        fileType: 'word',
        fileName: file.name,
        charCount: cleaned.length,
      };
    }
  }

  // 3. PDF (.pdf)
  if (name.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/standard_fonts/',
    }).promise;

    const pageTexts: string[] = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((item: any) => item.str || '')
        .filter(Boolean)
        .join(' ');
      if (pageStr.trim()) {
        pageTexts.push(`[第 ${p} 页 / Page ${p}]\n${pageStr.trim()}`);
      }
    }

    const combined = pageTexts.join('\n\n');
    return {
      text: combined,
      fileType: 'pdf',
      fileName: file.name,
      charCount: combined.length,
    };
  }

  // 4. Email (.eml, .msg) & Text (.txt)
  const rawText = await file.text();
  let parsedEmail = rawText;

  // Clean EML format headers if detected
  if (name.endsWith('.eml') || rawText.includes('From:') || rawText.includes('Subject:')) {
    parsedEmail = cleanEmlText(rawText);
  }

  return {
    text: parsedEmail,
    fileType: name.endsWith('.eml') || name.endsWith('.msg') ? 'email' : 'text',
    fileName: file.name,
    charCount: parsedEmail.length,
  };
}

/**
 * Clean standard EML / MIME headers and decode quoted printable if present
 */
function cleanEmlText(eml: string): string {
  const lines = eml.split(/\r?\n/);
  let inHeaders = true;
  const headerInfo: Record<string, string> = {};
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inHeaders) {
      if (line.trim() === '') {
        inHeaders = false;
        continue;
      }
      const match = line.match(/^(Subject|From|To|Date):\s*(.*)$/i);
      if (match) {
        headerInfo[match[1].toLowerCase()] = match[2];
      }
    } else {
      // Body content
      // Skip raw mime boundary lines
      if (line.startsWith('--') && line.length > 20) continue;
      if (line.startsWith('Content-Type:') || line.startsWith('Content-Transfer-Encoding:')) continue;
      bodyLines.push(line);
    }
  }

  const headerPrefix = [
    headerInfo['subject'] ? `Subject: ${headerInfo['subject']}` : '',
    headerInfo['from'] ? `From: ${headerInfo['from']}` : '',
    headerInfo['date'] ? `Date: ${headerInfo['date']}` : '',
  ].filter(Boolean).join('\n');

  const bodyText = bodyLines.join('\n').trim();
  return headerPrefix ? `${headerPrefix}\n\n${bodyText}` : bodyText;
}
