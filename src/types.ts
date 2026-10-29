export type AppMode = 'pdf' | 'excel' | 'email' | 'glossary';

export interface TextBlock {
  id: string;
  text: string;
  x0: number; // in PDF points (top-left origin for layout)
  y0: number;
  x1: number;
  y1: number;
  pageNumber: number;
  translation?: string;
  category?: 'pom' | 'callout' | 'fabric' | 'trim' | 'general' | 'numeric' | 'sewing' | 'defect';
  isMetric?: boolean;
}

export interface AnnotationPill {
  id: string;
  blockId: string;
  originalText: string;
  translation: string;
  x: number;
  y: number;
  width: number;
  height: number;
  placement: 'below' | 'above' | 'right' | 'margin';
  fontSize: number;
  pageNumber: number;
  visible: boolean;
  edited?: boolean;
}

export interface PdfDocumentState {
  title: string;
  pageCount: number;
  currentPage: number;
  width: number;
  height: number;
  textBlocks: TextBlock[];
  annotations: AnnotationPill[];
  svgUrl?: string;
  rawPdfBytes?: Uint8Array;
}

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  rawRows?: any[][];
}

export interface TermEntry {
  en: string;
  zh: string;
  category: 'pom' | 'fabric' | 'sewing' | 'trim' | 'defect';
  pinyin?: string;
  notes?: string;
}

export interface KeyPointItem {
  id: string;
  item: string;
  originalIssue: string;
  severity: 'high' | 'medium' | 'low' | string;
  department: string;
  technicalSolution: string;
  buyerSatisfactionPlan: string;
}

export interface AttachedImage {
  id: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
  name?: string;
  size?: number;
}

export interface BuyerEmailResponse {
  originalText: string;
  chineseTranslation: string;
  analysisSummary?: {
    approvalStatus: string;
    sentiment: string;
    coreConflict: string;
    buyerExpectation: string;
    timeline: string;
  };
  visualObservations?: string[]; // Visual findings from attached fitting photos, CAD sketches, arrows
  keyPointsBreakdown?: KeyPointItem[];
  actionItems: string[];
  replyEmailDraft: {
    subject: string;
    body: string;
    blufSummary: string;
  };
}


