import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { lookupApparelTerm, isPureMetricOrNumeric } from './apparelTerms.ts';

export interface CellData {
  value: any;
  formula?: string;
  formatted?: string;
  isFormula: boolean;
  type: string;
}

export interface SheetDisplayData {
  name: string;
  headers: string[];
  headerRowIndex: number;
  pomColumnIndex: number;
  pomColumnLetter: string;
  pomColumnHeader: string;
  columns: Array<{
    colIdx: number;
    colLetter: string;
    header: string;
    isPomCol: boolean;
  }>;
  rows: Array<{
    rowIndex: number; // 1-based Excel row number
    cells: Record<string, CellData>; // key is colLetter e.g. "A", "B"
  }>;
  formulaCount: number;
  pomCount: number;
  totalRows: number;
}

export interface ParsedWorkbookData {
  rawWorkbook: XLSX.WorkBook;
  rawZip?: JSZip; // Original OpenXML ZIP archive preserving images, styles, borders, fonts
  originalBuffer?: ArrayBuffer;
  fileName: string;
  sheetNames: string[];
  activeSheetName: string;
  currentSheet: SheetDisplayData;
  mediaCount: number; // Number of embedded images / sketches preserved
  drawingCount: number;
}

// Convert 0-based column index to Excel column letter (0 -> A, 1 -> B, 26 -> AA)
export function colIndexToLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Convert Excel column letter to 0-based index ("A" -> 0, "B" -> 1, "AA" -> 26)
export function colLetterToIndex(colLetter: string): number {
  let index = 0;
  const clean = colLetter.toUpperCase().trim();
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Common keywords for POM (Point of Measure) descriptions
const POM_HEADER_KEYWORDS = [
  'pom',
  'point of measure',
  'points of measure',
  'measurement description',
  'description',
  'desc',
  'measurement',
  'measure',
  'spec description',
  'specification',
  'spec',
  'part description',
  'item description',
  'garment part',
  '部位',
  '测量部位',
  '尺寸部位',
  '部位说明',
  '工艺说明',
];

// Keywords indicating key apparel points of measure to detect POM column by row content
const APPAREL_POM_WORDS = [
  'CHEST', 'WAIST', 'HIP', 'LENGTH', 'HPS', 'SHOULDER', 'ARMHOLE', 'SLEEVE',
  'BICEP', 'ELBOW', 'CUFF', 'NECK', 'COLLAR', 'HOOD', 'SWEEP', 'BOTTOM',
  'HEM', 'INSEAM', 'OUTSEAM', 'RISE', 'THIGH', 'KNEE', 'OPENING', 'POCKET',
  'WAISTBAND', 'ZIPPER', 'FLY', 'STRAP', 'YOKE', 'PLACKET', 'SEAM', 'FRONT', 'BACK', 'CB', 'CF'
];

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(safe: string): string {
  return safe
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Detect the header row and the POM description column in a worksheet
 */
function analyzeWorksheetStructure(worksheet: XLSX.WorkSheet): {
  headerRowIdx: number;
  headers: string[];
  pomColIdx: number;
  range: XLSX.Range;
} {
  const ref = worksheet['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);

  // 1. Scan rows to find the best candidate for the header row
  let bestHeaderRow = range.s.r;
  let maxHeaderMatches = -1;

  const maxScanRows = Math.min(range.e.r, range.s.r + 15);
  for (let r = range.s.r; r <= maxScanRows; r++) {
    let textCellCount = 0;
    let keywordMatches = 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null) {
        const str = String(cell.v).trim().toLowerCase();
        if (str.length > 0) {
          textCellCount++;
          if (POM_HEADER_KEYWORDS.some(kw => str.includes(kw)) || str.includes('tol') || str.includes('size')) {
            keywordMatches += 3;
          }
        }
      }
    }

    const score = textCellCount + keywordMatches;
    if (score > maxHeaderMatches && textCellCount >= 2) {
      maxHeaderMatches = score;
      bestHeaderRow = r;
    }
  }

  // 2. Extract headers for each column
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: bestHeaderRow, c });
    const cell = worksheet[cellAddress];
    const letter = colIndexToLetter(c);
    if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
      headers.push(String(cell.v).trim());
    } else {
      headers.push(`列 ${letter}`);
    }
  }

  // 3. Detect the POM description column
  let detectedPomCol = -1;

  // First pass: match header text against POM keywords
  for (let c = range.s.c; c <= range.e.c; c++) {
    const colIdx = c - range.s.c;
    const headerText = headers[colIdx]?.toLowerCase() || '';
    if (
      headerText.includes('pom') ||
      headerText.includes('point of measure') ||
      headerText.includes('measurement description') ||
      headerText.includes('部位') ||
      headerText.includes('desc') ||
      headerText.includes('measure')
    ) {
      detectedPomCol = colIdx;
      break;
    }
  }

  // Second pass: score columns by content in data rows
  if (detectedPomCol === -1) {
    let maxPomScore = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const colIdx = c - range.s.c;
      let score = 0;
      for (let r = bestHeaderRow + 1; r <= Math.min(range.e.r, bestHeaderRow + 30); r++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        if (cell && cell.v && typeof cell.v === 'string') {
          const upper = cell.v.toUpperCase();
          if (APPAREL_POM_WORDS.some(w => upper.includes(w))) {
            score++;
          }
        }
      }
      if (score > maxPomScore) {
        maxPomScore = score;
        detectedPomCol = colIdx;
      }
    }
  }

  if (detectedPomCol === -1) {
    detectedPomCol = headers.length > 1 ? 1 : 0;
  }

  return {
    headerRowIdx: bestHeaderRow,
    headers,
    pomColIdx: detectedPomCol,
    range,
  };
}

/**
 * Build display data for a worksheet with complete cell and formula inspection
 */
export function buildSheetDisplayData(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  userSelectedPomColIdx?: number
): SheetDisplayData {
  const { headerRowIdx, headers, pomColIdx: autoPomColIdx, range } = analyzeWorksheetStructure(worksheet);
  const pomColIdx = userSelectedPomColIdx !== undefined ? userSelectedPomColIdx : autoPomColIdx;
  const targetColAbsolute = range.s.c + pomColIdx;
  const pomColumnLetter = colIndexToLetter(targetColAbsolute);

  const columns = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const relativeIdx = c - range.s.c;
    columns.push({
      colIdx: relativeIdx,
      colLetter: colIndexToLetter(c),
      header: headers[relativeIdx] || `列 ${colIndexToLetter(c)}`,
      isPomCol: relativeIdx === pomColIdx,
    });
  }

  const rows = [];
  let formulaCount = 0;
  let pomCount = 0;

  for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
    const cells: Record<string, CellData> = {};
    let rowHasData = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const relativeIdx = c - range.s.c;
      const colLetter = colIndexToLetter(c);
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];

      if (cell) {
        rowHasData = true;
        const isFormula = Boolean(cell.f);
        if (isFormula) formulaCount++;

        if (relativeIdx === pomColIdx && cell.v && typeof cell.v === 'string' && cell.v.trim()) {
          pomCount++;
        }

        cells[colLetter] = {
          value: cell.v !== undefined ? cell.v : '',
          formula: cell.f,
          formatted: cell.w,
          isFormula,
          type: cell.t || 'z',
        };
      } else {
        cells[colLetter] = {
          value: '',
          isFormula: false,
          type: 'z',
        };
      }
    }

    if (rowHasData) {
      rows.push({
        rowIndex: r + 1, // 1-based Excel row number
        cells,
      });
    }
  }

  return {
    name: sheetName,
    headers,
    headerRowIndex: headerRowIdx,
    pomColumnIndex: pomColIdx,
    pomColumnLetter,
    pomColumnHeader: headers[pomColIdx] || `列 ${pomColumnLetter}`,
    columns,
    rows,
    formulaCount,
    pomCount,
    totalRows: rows.length,
  };
}

/**
 * Parse an Excel file (ArrayBuffer) into structured workbook data and load original OpenXML ZIP archive
 */
export async function parseExcelWorkbook(buffer: ArrayBuffer, fileName: string): Promise<ParsedWorkbookData> {
  // 1. Parse via SheetJS for rapid layout analysis and UI display
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellStyles: true,
    cellNF: true,
    cellDates: true,
  });

  // 2. Open raw ZIP archive to preserve all embedded images, styles, borders, and fonts 100%
  let rawZip: JSZip | undefined;
  let mediaCount = 0;
  let drawingCount = 0;

  if (fileName.toLowerCase().endsWith('.xlsx')) {
    try {
      rawZip = await JSZip.loadAsync(buffer);
      // Count embedded images in xl/media/
      Object.keys(rawZip.files).forEach((filePath) => {
        if (filePath.startsWith('xl/media/')) mediaCount++;
        if (filePath.startsWith('xl/drawings/')) drawingCount++;
      });
    } catch (_zipErr) {
      rawZip = undefined;
    }
  }

  const sheetNames = workbook.SheetNames;
  const initialSheetName = sheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[initialSheetName];
  const currentSheet = buildSheetDisplayData(worksheet, initialSheetName);

  return {
    rawWorkbook: workbook,
    rawZip,
    originalBuffer: buffer,
    fileName,
    sheetNames,
    activeSheetName: initialSheetName,
    currentSheet,
    mediaCount,
    drawingCount,
  };
}

/**
 * Find the path to the worksheet XML in the ZIP archive for a given sheet name
 */
async function getWorksheetXmlPath(zip: JSZip, sheetName: string): Promise<string> {
  try {
    const wbXml = await zip.file('xl/workbook.xml')?.async('text');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
    if (!wbXml || !relsXml) return 'xl/worksheets/sheet1.xml';

    // Match <sheet name="sheetName" ... r:id="rIdX"/>
    const escapedName = sheetName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const sheetTagRegex = new RegExp(`<sheet[^>]*name=["']${escapedName}["'][^>]*r:id=["']([^"']+)["']`, 'i');
    const match = wbXml.match(sheetTagRegex);
    if (match && match[1]) {
      const rId = match[1];
      // Match in workbook.xml.rels: <Relationship Id="rId" ... Target="worksheets/sheetX.xml"/>
      const relRegex = new RegExp(`<Relationship[^>]*Id=["']${rId}["'][^>]*Target=["']([^"']+)["']`, 'i');
      const relMatch = relsXml.match(relRegex);
      if (relMatch && relMatch[1]) {
        let target = relMatch[1].replace(/^\//, '');
        if (!target.startsWith('xl/')) {
          target = `xl/${target}`;
        }
        if (zip.file(target)) return target;
      }
    }
  } catch (_e) {
    // fallback
  }

  return 'xl/worksheets/sheet1.xml';
}

/**
 * Extract shared strings from xl/sharedStrings.xml in the ZIP archive
 */
async function loadSharedStringsFromZip(zip: JSZip): Promise<string[]> {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];

  const text = await file.async('text');
  const siMatches = text.match(/<si\b[\s\S]*?<\/si>/gi) || [];
  return siMatches.map((si) => {
    const tMatches = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
    return tMatches
      .map((t) => unescapeXml(t.replace(/<t\b[^>]*>/i, '').replace(/<\/t>/i, '')))
      .join('');
  });
}

/**
 * Zero-Loss In-Place OpenXML Editor:
 * Updates ONLY the target POM column in the worksheet XML inside the ZIP archive.
 * STRICT CRITICAL GUARANTEES:
 * 1. Images & Sketches (xl/media/*, xl/drawings/*) are 100% UNTOUCHED and PRESERVED!
 * 2. Fonts, Cell Borders, Colors, Fills (xl/styles.xml and cell s="..." attributes) are 100% UNTOUCHED!
 * 3. Cell Formulas (<f>...</f>) are 100% UNTOUCHED!
 * 4. All other columns, numbers, tolerances are 100% UNTOUCHED!
 * 5. In the target POM column only, Chinese is appended in the same cell to the right: "1/2 CHEST WIDTH (1/2胸围)".
 * 6. OpenXML Shared String Table (SST) is properly maintained, ensuring 100% schema compliance in Microsoft Excel & WPS!
 */
export async function updateZipPomColumn(
  zip: JSZip,
  sheetName: string,
  pomColLetter: string,
  translationsMap?: Record<string, string>,
  headerRowIndex?: number
): Promise<{ updatedCount: number; skippedFormulasCount: number }> {
  const xmlPath = await getWorksheetXmlPath(zip, sheetName);
  const file = zip.file(xmlPath);
  if (!file) return { updatedCount: 0, skippedFormulasCount: 0 };

  let sheetXml = await file.async('text');
  
  // 1. Check if xl/sharedStrings.xml exists
  const sstFile = zip.file('xl/sharedStrings.xml');
  let sstContent: string | null = sstFile ? await sstFile.async('text') : null;
  const sstStrings: string[] = [];

  if (sstContent) {
    const siMatches = sstContent.match(/<si\b[\s\S]*?<\/si>/gi) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
      const text = tMatches
        .map((t) => unescapeXml(t.replace(/<t\b[^>]*>/i, '').replace(/<\/t>/i, '')))
        .join('');
      sstStrings.push(text);
    }
  }

  let updatedCount = 0;
  let skippedFormulasCount = 0;
  const newSstEntries: string[] = [];

  // Match cells belonging strictly to the target column (e.g. r="B2", r="B15")
  const cleanColLetter = pomColLetter.toUpperCase().trim();
  const cellRegex = new RegExp(
    `(<c\\b[^>]*?\\br="${cleanColLetter}(\\d+)"[^>]*>)([\\s\\S]*?)(<\\/c>)|(<c\\b[^>]*?\\br="${cleanColLetter}(\\d+)"[^>]*\\/>)`,
    'gi'
  );

  sheetXml = sheetXml.replace(
    cellRegex,
    (match, openTag, rowNumStr, inner, closeTag, selfClosing) => {
      // 1. If self-closing cell, it has no content
      if (selfClosing) return match;

      // 2. If formula exists in the cell, NEVER TOUCH IT!
      if (inner.includes('<f>') || inner.includes('<f ') || openTag.includes('<f')) {
        skippedFormulasCount++;
        return match;
      }

      // 3. Skip header row (e.g. "POM Description" / "Measurement Description")
      const rowNum = parseInt(rowNumStr, 10);
      if (headerRowIndex !== undefined && rowNum <= headerRowIndex + 1) {
        return match;
      }

      // 4. Extract original text from the cell
      let origText = '';
      const isSst = /\bt="s"/i.test(openTag);
      const isInline = /\bt="inlineStr"/i.test(openTag);

      if (isSst && sstContent) {
        const vMatch = inner.match(/<v>(\d+)<\/v>/i);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          origText = sstStrings[idx] || '';
        }
      } else if (isInline) {
        const tMatches = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
        origText = tMatches
          .map((t: string) => unescapeXml(t.replace(/<t\b[^>]*>/i, '').replace(/<\/t>/i, '')))
          .join('');
      } else if (inner.includes('<v>')) {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/i);
        if (vMatch) {
          origText = unescapeXml(vMatch[1]);
        }
      }

      origText = origText.trim();

      // 5. Skip empty, pure metrics, numbers, or cells that already have Chinese
      if (
        !origText ||
        origText.length <= 1 ||
        isPureMetricOrNumeric(origText) ||
        /[\u4e00-\u9fa5]/.test(origText)
      ) {
        return match;
      }

      // 6. Find translation
      let translation = translationsMap ? translationsMap[origText] : undefined;
      if (!translation) {
        translation = lookupApparelTerm(origText) || undefined;
      }

      if (!translation || translation === origText) {
        return match;
      }

      // 7. Build new bilingual text (English preserved on left, Chinese on the right in same cell)
      const newText = `${origText} (${translation})`;
      updatedCount++;

      // 8. Output standard, compliant OpenXML cell, preserving s="..." (borders, fonts, styles) 100%!
      if (sstContent) {
        let newOpenTag = openTag;
        if (/\bt=["'][^"']*["']/i.test(newOpenTag)) {
          newOpenTag = newOpenTag.replace(/\bt=["'][^"']*["']/i, 't="s"');
        } else {
          newOpenTag = newOpenTag.replace(/<c\b/i, '<c t="s"');
        }

        const newIdx = sstStrings.length + newSstEntries.length;
        newSstEntries.push(`<si><t xml:space="preserve">${escapeXml(newText)}</t></si>`);

        return `${newOpenTag}<v>${newIdx}</v>${closeTag}`;
      } else if (isInline) {
        return `${openTag}<is><t xml:space="preserve">${escapeXml(newText)}</t></is>${closeTag}`;
      } else {
        let newOpenTag = openTag;
        if (/\bt=["'][^"']*["']/i.test(newOpenTag)) {
          newOpenTag = newOpenTag.replace(/\bt=["'][^"']*["']/i, 't="str"');
        } else {
          newOpenTag = newOpenTag.replace(/<c\b/i, '<c t="str"');
        }
        return `${newOpenTag}<v>${escapeXml(newText)}</v>${closeTag}`;
      }
    }
  );

  // 9. Update xl/sharedStrings.xml if new entries were added
  if (sstContent && newSstEntries.length > 0) {
    const totalCountMatch = sstContent.match(/\bcount="(\d+)"/i);
    const uniqueCountMatch = sstContent.match(/\buniqueCount="(\d+)"/i);

    const curTotal = totalCountMatch ? parseInt(totalCountMatch[1], 10) : sstStrings.length;
    const curUnique = uniqueCountMatch ? parseInt(uniqueCountMatch[1], 10) : sstStrings.length;

    const newTotal = curTotal + newSstEntries.length;
    const newUnique = curUnique + newSstEntries.length;

    if (totalCountMatch) {
      sstContent = sstContent.replace(/\bcount="\d+"/i, `count="${newTotal}"`);
    } else {
      sstContent = sstContent.replace(/<sst\b/i, `<sst count="${newTotal}"`);
    }

    if (uniqueCountMatch) {
      sstContent = sstContent.replace(/\buniqueCount="\d+"/i, `uniqueCount="${newUnique}"`);
    } else {
      sstContent = sstContent.replace(/<sst\b/i, `<sst uniqueCount="${newUnique}"`);
    }

    sstContent = sstContent.replace(/<\/sst>/i, `${newSstEntries.join('')}</sst>`);
    zip.file('xl/sharedStrings.xml', sstContent);
  }

  zip.file(xmlPath, sheetXml);
  return { updatedCount, skippedFormulasCount };
}

/**
 * Synchronize the in-memory SheetJS worksheet object with the translations for UI table rendering
 */
export function translateWorksheetPomColumn(
  worksheet: XLSX.WorkSheet,
  pomColIdx: number,
  headerRowIdx: number,
  translationsMap?: Record<string, string>
): { updatedCount: number; skippedFormulasCount: number } {
  const ref = worksheet['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const targetColAbsolute = range.s.c + pomColIdx;

  let updatedCount = 0;
  let skippedFormulasCount = 0;

  for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
    const cellAddress = XLSX.utils.encode_cell({ r, c: targetColAbsolute });
    const cell = worksheet[cellAddress];
    if (!cell) continue;

    if (cell.f) {
      skippedFormulasCount++;
      continue;
    }

    if (cell.v === undefined || cell.v === null) continue;
    const strVal = String(cell.v).trim();
    if (strVal.length <= 1 || isPureMetricOrNumeric(strVal)) continue;

    if (/[\u4e00-\u9fa5]/.test(strVal)) {
      continue;
    }

    let translation = translationsMap ? translationsMap[strVal] : undefined;
    if (!translation) {
      translation = lookupApparelTerm(strVal) || undefined;
    }

    if (translation && translation !== strVal) {
      const newCellVal = `${strVal} (${translation})`;
      cell.v = newCellVal;
      cell.w = newCellVal;
      cell.t = 's';
      updatedCount++;
    }
  }

  return { updatedCount, skippedFormulasCount };
}

/**
 * Collect all untranslated POM English texts from the target column to send to /api/translate
 */
export function collectUntranslatedPomTexts(
  worksheet: XLSX.WorkSheet,
  pomColIdx: number,
  headerRowIdx: number
): string[] {
  const ref = worksheet['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const targetColAbsolute = range.s.c + pomColIdx;
  const texts: string[] = [];

  for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
    const cellAddress = XLSX.utils.encode_cell({ r, c: targetColAbsolute });
    const cell = worksheet[cellAddress];
    if (!cell || cell.f) continue;
    if (cell.v === undefined || cell.v === null) continue;

    const strVal = String(cell.v).trim();
    if (strVal.length > 1 && !isPureMetricOrNumeric(strVal) && !/[\u4e00-\u9fa5]/.test(strVal)) {
      texts.push(strVal);
    }
  }

  return Array.from(new Set(texts));
}

/**
 * Export workbook directly to XLSX binary Blob:
 * If rawZip is present (uploaded .xlsx), re-packs the original ZIP archive,
 * guaranteeing 100% PRESERVATION of all borders, original fonts, embedded images, and formulas!
 */
export async function exportExcelWorkbookBlob(
  workbookData: ParsedWorkbookData
): Promise<Blob> {
  if (workbookData.rawZip) {
    // Zero-loss ZIP export: byte-level preservation of media, drawings, borders, and styles
    const uint8 = await workbookData.rawZip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    return new Blob([uint8 as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  // Fallback for non-zip sources (e.g. CSV or synthetic)
  const wbout = XLSX.write(workbookData.rawWorkbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true,
  });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
