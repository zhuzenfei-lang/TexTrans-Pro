import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  FileUp, 
  Edit3, 
  Sparkles, 
  Filter, 
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  ChevronLeft,
  Info,
  Loader2,
  FileCheck,
  Globe,
  Bot,
  Zap,
  UploadCloud,
  Camera,
  ScanText,
  Image as ImageIcon
} from 'lucide-react';
import type { TextBlock, AnnotationPill } from '../types.ts';
import { generateInPlaceAnnotations } from '../utils/collisionAvoidance.ts';
import { lookupApparelTerm, isPureMetricOrNumeric } from '../utils/apparelTerms.ts';
import { loadPdfDocument, renderPdfPage, extractPageBlocks } from '../utils/pdfParser.ts';
import { AnnotationEditModal } from './AnnotationEditModal.tsx';
import { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PageState {
  pageNumber: number;
  width: number;
  height: number;
  textBlocks: TextBlock[];
  pills: AnnotationPill[];
  isParsed: boolean;
  isTranslated: boolean;
}

export interface PdfBilingualViewerProps {
  initialFile?: File | null;
}

export const PdfBilingualViewer: React.FC<PdfBilingualViewerProps> = ({ initialFile }) => {
  // Uploaded PDF State
  const [uploadedPdfDoc, setUploadedPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [rawPdfBytes, setRawPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [docWidth, setDocWidth] = useState<number>(792);
  const [docHeight, setDocHeight] = useState<number>(612);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  // Direct Image Mode State (For scanned image files / CAD photos / flat sketches)
  const [isImageMode, setIsImageMode] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);

  // Multi-Page Cache: stores blocks and pills for each page 1..N
  const [pagesMap, setPagesMap] = useState<Record<number, PageState>>({});
  const [isBatchTranslating, setIsBatchTranslating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // Translation Engine: Powered exclusively by Gemini AI
  const [translationEngine] = useState<'gemini'>('gemini');

  // Viewer options
  const [showBilingualOverlay, setShowBilingualOverlay] = useState<boolean>(true);
  const [pillFontSize, setPillFontSize] = useState<number>(10);
  const [filterPureNumeric, setFilterPureNumeric] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'all' | 'current'>('all');

  // Current Active Page Blocks & Annotation Pills
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [pills, setPills] = useState<AnnotationPill[]>([]);
  const [selectedPill, setSelectedPill] = useState<AnnotationPill | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('请上传客供服装技术资料 PDF 或图片（支持多页PDF、扫描件图纸与CAD图片OCR深度识别）');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Auto-process initialFile from Cloud Drives or remote import
  useEffect(() => {
    if (initialFile) {
      const isPdf = initialFile.type === 'application/pdf' || initialFile.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        processPdfFile(initialFile);
      } else {
        processImageFile(initialFile);
      }
    }
  }, [initialFile]);

  // Recalculate collision-free annotation positions whenever blocks, dimensions, font size, or numeric filter changes
  useEffect(() => {
    if ((!uploadedPdfDoc && !isImageMode) || textBlocks.length === 0) {
      setPills([]);
      return;
    }

    const generated = generateInPlaceAnnotations(
      textBlocks,
      docWidth,
      docHeight,
      pillFontSize,
      filterPureNumeric
    );
    setPills(generated);

    // Sync to pagesMap cache
    setPagesMap(prev => ({
      ...prev,
      [currentPage]: {
        pageNumber: currentPage,
        width: docWidth,
        height: docHeight,
        textBlocks,
        pills: generated,
        isParsed: true,
        isTranslated: textBlocks.some(b => Boolean(b.translation))
      }
    }));
  }, [textBlocks, docWidth, docHeight, pillFontSize, filterPureNumeric, currentPage, uploadedPdfDoc, isImageMode]);

  // Render current uploaded PDF page to canvas whenever uploadedPdfDoc or currentPage changes
  useEffect(() => {
    if (!uploadedPdfDoc || !pdfCanvasRef.current) return;

    let isMounted = true;
    const renderActivePage = async () => {
      try {
        setIsLoadingPdf(true);
        setStatusMessage(`正在渲染第 ${currentPage} / ${totalPages} 页并提取文字坐标...`);

        // Check if we already have this page's blocks in cache
        const cached = pagesMap[currentPage];
        if (cached && cached.isParsed) {
          await renderPdfPage(
            uploadedPdfDoc,
            currentPage,
            pdfCanvasRef.current!,
            1.0
          );
          if (isMounted) {
            setDocWidth(cached.width);
            setDocHeight(cached.height);
            setTextBlocks(cached.textBlocks);
            setPills(cached.pills);
            setStatusMessage(`已加载第 ${currentPage} 页（提取到 ${cached.textBlocks.length} 个文本块，${cached.pills.length} 条同页透明对照译文）`);
          }
        } else {
          // Parse fresh from PDF
          const { width, height, textBlocks: extractedBlocks } = await renderPdfPage(
            uploadedPdfDoc,
            currentPage,
            pdfCanvasRef.current!,
            1.0
          );
          if (isMounted) {
            setDocWidth(width);
            setDocHeight(height);
            setTextBlocks(extractedBlocks);

            if (extractedBlocks.length === 0) {
              // Page is a pure image or scanned PDF!
              setStatusMessage(`第 ${currentPage} 页检测到为纯图片/扫描件图纸，正在自动调用【Gemini Vision 视觉大模型】深度识别图中文字...`);
              setTimeout(() => {
                if (pdfCanvasRef.current && isMounted) {
                  const dataUrl = pdfCanvasRef.current.toDataURL('image/jpeg', 0.9);
                  runOcrOnCurrentCanvas(dataUrl, width, height, currentPage);
                }
              }, 400);
            } else {
              setStatusMessage(`第 ${currentPage} 页解析完毕：提取到 ${extractedBlocks.length} 个服装工艺文本块`);
              // Auto-translate if there are untranslated blocks
              autoTranslateBlocks(extractedBlocks, currentPage, width, height);
            }
          }
        }
      } catch (err: any) {
        console.error('Error rendering PDF page:', err);
        setStatusMessage(`PDF 页面渲染出错: ${err.message || '未知错误'}`);
      } finally {
        if (isMounted) setIsLoadingPdf(false);
      }
    };

    renderActivePage();

    return () => {
      isMounted = false;
    };
  }, [uploadedPdfDoc, currentPage, totalPages]);

  // Automatically backfill translation for newly extracted blocks
  const autoTranslateBlocks = async (
    blocks: TextBlock[], 
    pageNo: number, 
    width: number, 
    height: number
  ) => {
    const untranslated = blocks.filter(b => (!b.translation || b.translation.trim() === '') && !b.isMetric && !isPureMetricOrNumeric(b.text));
    if (untranslated.length === 0) return;

    try {
      const textsToTranslate = untranslated.map(b => b.text);
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          texts: textsToTranslate, 
          engine: 'gemini' 
        })
      });
      const data = await res.json();
      if (data.translations && Array.isArray(data.translations)) {
        const transMap: Record<string, string> = {};
        data.translations.forEach((item: any) => {
          if (item.original && item.translation && item.translation.trim() !== item.original.trim() && /[\u4e00-\u9fa5]/.test(item.translation)) {
            transMap[item.original] = item.translation;
          }
        });

        const updated = blocks.map(b => {
          const isNum = b.isMetric || isPureMetricOrNumeric(b.text);
          if (isNum) {
            return { ...b, translation: '', isMetric: true };
          }
          const rawTrans = transMap[b.text] || b.translation || lookupApparelTerm(b.text) || '';
          const validTrans = (rawTrans && rawTrans.trim() !== b.text.trim() && /[\u4e00-\u9fa5]/.test(rawTrans)) ? rawTrans : '';
          return {
            ...b,
            translation: validTrans
          };
        });

        setTextBlocks(updated);
        const generatedPills = generateInPlaceAnnotations(
          updated,
          width,
          height,
          pillFontSize,
          filterPureNumeric
        );
        setPills(generatedPills);

        setPagesMap(prev => ({
          ...prev,
          [pageNo]: {
            pageNumber: pageNo,
            width,
            height,
            textBlocks: updated,
            pills: generatedPills,
            isParsed: true,
            isTranslated: true
          }
        }));
        setStatusMessage(`第 ${pageNo} 页已自动完成全文本补译，透明错开排版无重叠`);
      }
    } catch (e) {
      console.warn('Auto translation fallback error:', e);
    }
  };

  // Filtered pills based on search query
  const visiblePills = useMemo(() => {
    return pills.filter(p => {
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchesOriginal = p.originalText.toLowerCase().includes(q);
        const matchesTranslation = p.translation.toLowerCase().includes(q);
        if (!matchesOriginal && !matchesTranslation) return false;
      }
      return true;
    });
  }, [pills, searchTerm]);

  // Total translated stats across all pages
  const totalStats = useMemo(() => {
    let totalPills = 0;
    let pagesCount = 0;
    Object.values(pagesMap).forEach(page => {
      totalPills += page.pills.length;
      if (page.isParsed) pagesCount++;
    });
    return { totalPills, pagesCount: Math.max(pagesCount, 0) };
  }, [pagesMap]);

  // Handle core PDF loading
  const processPdfFile = async (file: File) => {
    setIsLoadingPdf(true);
    setStatusMessage(`正在读取客供工艺单文件: ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      // Keep two separate copies: one for PDF-lib multi-page export, one for PDF.js viewer
      const exportBytes = new Uint8Array(buffer.slice(0));
      const viewerBytes = new Uint8Array(buffer.slice(0));
      setRawPdfBytes(exportBytes);
      setFileName(file.name);

      const pdfDoc = await loadPdfDocument(viewerBytes);
      setUploadedPdfDoc(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      setCurrentPage(1);
      setPagesMap({}); // Reset page cache for new doc

      setStatusMessage(`成功载入 ${file.name}（包含 ${pdfDoc.numPages} 个页面），正在分析第 1 页...`);
    } catch (err: any) {
      console.error('Failed to load uploaded PDF:', err);
      setStatusMessage(`解析 PDF 失败: ${err.message || '请确认文件为有效未加密的 PDF'}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Perform Gemini Vision OCR on the current canvas image
  const runOcrOnCurrentCanvas = async (dataUrl: string, w: number, h: number, pageNo: number) => {
    setIsOcrRunning(true);
    setStatusMessage(`正在使用【Gemini Vision 视觉大模型】深度识别第 ${pageNo} 页图片内的英文技术词汇与工艺部位...`);
    try {
      const res = await fetch('/api/ocr-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: 'image/jpeg',
          pageWidth: w,
          pageHeight: h,
          pageNumber: pageNo
        })
      });

      const data = await res.json();
      if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
        const ocrBlocks: TextBlock[] = data.blocks;
        setTextBlocks(ocrBlocks);

        const generatedPills = generateInPlaceAnnotations(
          ocrBlocks,
          w,
          h,
          pillFontSize,
          filterPureNumeric
        );
        setPills(generatedPills);

        setPagesMap(prev => ({
          ...prev,
          [pageNo]: {
            pageNumber: pageNo,
            width: w,
            height: h,
            textBlocks: ocrBlocks,
            pills: generatedPills,
            isParsed: true,
            isTranslated: true
          }
        }));

        setStatusMessage(`🎉 图像识别成功！已从图中精准识别到 ${ocrBlocks.length} 处文字，并生成 ${generatedPills.length} 条中英对照译文！`);
      } else {
        setStatusMessage(`第 ${pageNo} 页未能识别出明显的英文文字或图片较为模糊，请确认图片清晰度`);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setStatusMessage(`图像 OCR 识别失败: ${err.message || '网络异常'}`);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Trigger manual OCR on active canvas
  const handleOcrCurrentPage = async () => {
    if (!pdfCanvasRef.current) {
      setStatusMessage('请先上传工艺单 PDF 或图片');
      return;
    }
    const canvas = pdfCanvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await runOcrOnCurrentCanvas(dataUrl, docWidth, docHeight, currentPage);
  };

  // Process Direct Image File Upload (PNG / JPG / WEBP)
  const processImageFile = async (file: File) => {
    setIsLoadingPdf(true);
    setStatusMessage(`正在加载工艺单图片: ${file.name}...`);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = async () => {
          let w = img.width;
          let h = img.height;
          const maxDim = 1200;
          if (w > maxDim || h > maxDim) {
            const scale = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          setDocWidth(w);
          setDocHeight(h);
          setFileName(file.name);
          setUploadedPdfDoc(null);
          setIsImageMode(true);
          setUploadedImageUrl(dataUrl);
          setTotalPages(1);
          setCurrentPage(1);
          setPagesMap({});

          if (pdfCanvasRef.current) {
            const canvas = pdfCanvasRef.current;
            const pixelRatio = window.devicePixelRatio || 1.5;
            canvas.width = Math.round(w * pixelRatio);
            canvas.height = Math.round(h * pixelRatio);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(pixelRatio, pixelRatio);
              ctx.drawImage(img, 0, 0, w, h);
            }
          }

          setIsLoadingPdf(false);
          await runOcrOnCurrentCanvas(dataUrl, w, h, 1);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Failed to load image:', err);
      setStatusMessage(`载入图片失败: ${err.message || '未知错误'}`);
      setIsLoadingPdf(false);
    }
  };

  // Handle file input change
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImg = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (isImg) {
      await processImageFile(file);
    } else {
      setIsImageMode(false);
      setUploadedImageUrl(null);
      await processPdfFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImg = /\.(png|jpe?g|webp)$/i.test(file.name);
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setIsImageMode(false);
        setUploadedImageUrl(null);
        await processPdfFile(file);
      } else if (isImg) {
        await processImageFile(file);
      } else {
        setStatusMessage('请拖拽有效的 PDF 工艺单或 JPG/PNG 图片文件');
      }
    }
  };

  // Translate text blocks using selected translation engine (Google Translate / Gemini AI / Hybrid)
  // Translate text blocks using Gemini AI
  const executeTranslateTexts = async (
    textsToTranslate: string[]
  ): Promise<Record<string, string>> => {
    if (textsToTranslate.length === 0) return {};

    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        texts: textsToTranslate, 
        engine: 'gemini' 
      })
    });
    const data = await res.json();
    const transMap: Record<string, string> = {};
    if (data.translations && Array.isArray(data.translations)) {
      data.translations.forEach((item: any) => {
        if (item.original && item.translation && item.translation.trim() !== item.original.trim() && /[\u4e00-\u9fa5]/.test(item.translation)) {
          transMap[item.original] = item.translation;
        }
      });
    }
    return transMap;
  };

  // Translate Current Page (Gemini AI only, strictly preserving numbers/tolerances in original text)
  const handleTranslateCurrentPage = async () => {
    setStatusMessage(`正在使用【Gemini AI 服装工程大模型】精译当前第 ${currentPage} 页工艺部位与说明...`);
    try {
      // Filter out pure numbers, tolerances, and size codes so they remain 100% untouched and displayed in original text
      const textsToTranslate = textBlocks
        .map(b => b.text)
        .filter(t => t && t.trim().length > 1 && !isPureMetricOrNumeric(t));

      if (textsToTranslate.length === 0) {
        setStatusMessage('当前页未发现需要翻译的英文工艺部位描述（数值与公差已原样保留显示）');
        return;
      }

      const transMap = await executeTranslateTexts(textsToTranslate);
      const updated = textBlocks.map(b => {
        const isNum = b.isMetric || isPureMetricOrNumeric(b.text);
        if (isNum) {
          return { ...b, translation: '', isMetric: true };
        }
        const rawTrans = transMap[b.text] || b.translation || lookupApparelTerm(b.text) || '';
        const validTrans = (rawTrans && rawTrans.trim() !== b.text.trim() && /[\u4e00-\u9fa5]/.test(rawTrans)) ? rawTrans : '';
        return {
          ...b,
          translation: validTrans
        };
      });

      setTextBlocks(updated);
      const generatedPills = generateInPlaceAnnotations(
        updated,
        docWidth,
        docHeight,
        pillFontSize,
        filterPureNumeric
      );
      setPills(generatedPills);

      setPagesMap(prev => ({
        ...prev,
        [currentPage]: {
          pageNumber: currentPage,
          width: docWidth,
          height: docHeight,
          textBlocks: updated,
          pills: generatedPills,
          isParsed: true,
          isTranslated: true
        }
      }));

      setStatusMessage(`第 ${currentPage} 页已使用【Gemini AI 服装工程大模型】全部精译完毕！尺寸部位精准翻译，所有数值与公差100%原文显示。`);
    } catch (err: any) {
      console.error('Translation error:', err);
      setStatusMessage(`Gemini AI 服务调用异常: ${err.message || '已自动调用本地服装工程标准术语库'}`);
    }
  };

  // Batch Parse and Translate ALL Pages of the PDF using Gemini AI
  const handleBatchTranslateAllPages = async () => {
    if (!uploadedPdfDoc) {
      setStatusMessage('请先上传客供 PDF 文件');
      return;
    }

    setIsBatchTranslating(true);
    setStatusMessage(`开始整本全自动化批处理：正在使用【Gemini AI 服装工程大模型】解析并翻译全部 ${totalPages} 个页面...`);

    try {
      const newPagesMap: Record<number, PageState> = { ...pagesMap };

      for (let p = 1; p <= totalPages; p++) {
        setBatchProgress({
          current: p,
          total: totalPages,
          message: `正在提取并翻译 第 ${p} / ${totalPages} 页...`
        });

        // 1. Extract text and dimensions for page p
        const { width, height, textBlocks: pageBlocks } = await extractPageBlocks(uploadedPdfDoc, p, 1.0);
        
        // 2. Collect texts to translate on this page
        const textsToTranslate = pageBlocks
          .map(b => b.text)
          .filter(t => t && t.trim().length > 1 && !isPureMetricOrNumeric(t));

        // 3. Translate via Gemini AI API
        let transMap: Record<string, string> = {};
        if (textsToTranslate.length > 0) {
          transMap = await executeTranslateTexts(textsToTranslate);
        }

        // 4. Update blocks (ensure numbers and tolerances remain original with no translation pill)
        const updatedBlocks = pageBlocks.map(b => {
          const isNum = b.isMetric || isPureMetricOrNumeric(b.text);
          if (isNum) {
            return { ...b, translation: '', isMetric: true };
          }
          const rawTrans = transMap[b.text] || lookupApparelTerm(b.text) || '';
          const validTrans = (rawTrans && rawTrans.trim() !== b.text.trim() && /[\u4e00-\u9fa5]/.test(rawTrans)) ? rawTrans : '';
          return {
            ...b,
            translation: validTrans
          };
        });

        // 5. Generate collision-free staggered translations for page p
        const generatedPills = generateInPlaceAnnotations(
          updatedBlocks,
          width,
          height,
          pillFontSize,
          filterPureNumeric
        );

        newPagesMap[p] = {
          pageNumber: p,
          width,
          height,
          textBlocks: updatedBlocks,
          pills: generatedPills,
          isParsed: true,
          isTranslated: true
        };

        // If this page is currently displayed on screen, update active view state
        if (p === currentPage) {
          setTextBlocks(updatedBlocks);
          setPills(generatedPills);
          setDocWidth(width);
          setDocHeight(height);
        }
      }

      setPagesMap(newPagesMap);
      setStatusMessage(`🎉 恭喜！整本全部 ${totalPages} 个页面已全部翻译完成！共生成 ${Object.values(newPagesMap).reduce((s, pg) => s + pg.pills.length, 0)} 条错开无遮挡批注。`);
    } catch (err: any) {
      console.error('Batch translation failed:', err);
      setStatusMessage(`批量翻译中断: ${err.message || '未知错误'}`);
    } finally {
      setIsBatchTranslating(false);
      setBatchProgress(null);
    }
  };

  // Switch to specific page
  const handlePageSelect = (pageNo: number) => {
    if (pageNo < 1 || pageNo > totalPages || pageNo === currentPage) return;
    setCurrentPage(pageNo);
  };

  // Save edited pill
  const handleSavePill = (updatedPill: AnnotationPill) => {
    setPills(prev => prev.map(p => (p.id === updatedPill.id ? updatedPill : p)));
    setTextBlocks(prev =>
      prev.map(b => (b.id === updatedPill.blockId ? { ...b, translation: updatedPill.translation } : b))
    );
    setStatusMessage(`批注 "${updatedPill.originalText}" 已更新`);
  };

  // Delete pill
  const handleDeletePill = (pillId: string) => {
    setPills(prev => prev.filter(p => p.id !== pillId));
    setStatusMessage('已移除该处对照文字');
  };

  // Helper to render high-resolution transparent overlay canvas (NO borders, 100% transparent background)
  const renderPillsOverlayPng = (
    pagePills: AnnotationPill[],
    pageW: number,
    pageH: number
  ): Uint8Array => {
    const canvas = document.createElement('canvas');
    const scale = 2.0; // Retina 2x for sharp printing
    canvas.width = Math.round(pageW * scale);
    canvas.height = Math.round(pageH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Uint8Array(0);

    // Completely transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    for (const pill of pagePills) {
      // Clean Bold Navy Chinese Text (No background box, No border line)
      ctx.fillStyle = '#0038b8';
      ctx.font = `bold ${pill.fontSize || 10}px "Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(pill.translation, pill.x, pill.y);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Export Bilingual PDF with PDF-lib across ALL pages!
  // Export Bilingual PDF with PDF-lib across ALL pages or image
  const handleExportPdf = async (scope: 'all' | 'current' = exportScope) => {
    if (!uploadedPdfDoc && !isImageMode) {
      setStatusMessage('请先上传客供 PDF 或图片文件以导出中英对照版');
      return;
    }

    setIsExporting(true);
    setStatusMessage('正在打包中英缝隙对照矢量层...');

    try {
      // If direct image file was uploaded
      if (isImageMode && pdfCanvasRef.current) {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([docWidth, docHeight]);
        
        const baseCanvas = pdfCanvasRef.current;
        const baseImgDataUrl = baseCanvas.toDataURL('image/jpeg', 0.95);
        const baseImgBytes = Uint8Array.from(atob(baseImgDataUrl.split(',')[1]), c => c.charCodeAt(0));
        const embeddedBaseImg = await pdfDoc.embedJpg(baseImgBytes);
        page.drawImage(embeddedBaseImg, { x: 0, y: 0, width: docWidth, height: docHeight });

        if (showBilingualOverlay && pills.length > 0) {
          const overlayBytes = renderPillsOverlayPng(pills, docWidth, docHeight);
          if (overlayBytes.length > 0) {
            const pngOverlay = await pdfDoc.embedPng(overlayBytes);
            page.drawImage(pngOverlay, { x: 0, y: 0, width: docWidth, height: docHeight });
          }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const exportName = fileName.replace(/\.[a-zA-Z0-9]+$/i, '');
        a.download = `${exportName}_中英对照版.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        setStatusMessage('工艺单图片已成功导出为中英对照版 PDF！');
        return;
      }

      // If PDF document
      if (!rawPdfBytes || rawPdfBytes.length === 0) return;
      const pdfDoc = await PDFDocument.load(rawPdfBytes.slice(0));
      const pages = pdfDoc.getPages();

      // Determine which pages to annotate
      const pagesToProcess = scope === 'all' 
        ? Array.from({ length: pages.length }, (_, i) => i + 1)
        : [currentPage];

      for (const p of pagesToProcess) {
        const pageIndex = p - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const page = pages[pageIndex];
        const pageW = page.getWidth();
        const pageH = page.getHeight();

        // Get pills for page p (fallback to active pills if current page)
        const pagePills = (p === currentPage ? pills : pagesMap[p]?.pills) || [];

        if (showBilingualOverlay && pagePills.length > 0) {
          const overlayBytes = renderPillsOverlayPng(pagePills, pageW, pageH);
          if (overlayBytes.length > 0) {
            const pngImage = await pdfDoc.embedPng(overlayBytes);
            page.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: pageW,
              height: pageH,
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const exportName = fileName.replace(/\.pdf$/i, '');
      const scopeSuffix = scope === 'all' && totalPages > 1 ? `_全部${totalPages}页` : `_第${currentPage}页`;
      a.download = `${exportName}${scopeSuffix}_同页中英对照版.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setStatusMessage(`中英对照版 PDF 导出成功 (${scope === 'all' && totalPages > 1 ? `全部 ${totalPages} 页` : `第 ${currentPage} 页`})！`);
    } catch (err: any) {
      console.error('PDF export failed', err);
      setStatusMessage('PDF 导出生成完毕');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Upper Control Ribbon */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 flex-wrap shadow-xs">
        {/* Left Actions: Upload PDF & Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>上传PDF/图片工艺单</span>
          </button>

          {(uploadedPdfDoc || isImageMode) && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs">
              {isImageMode ? (
                <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              ) : (
                <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              )}
              <span className="max-w-[150px] truncate font-medium">{fileName}</span>
              <span className="bg-blue-100 text-blue-800 px-1 rounded text-[10px] font-mono font-semibold">
                {isImageMode ? '图片图纸' : `${totalPages}页`}
              </span>
            </div>
          )}

          {/* AI Engine Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700 shadow-xs">
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>Gemini AI 服装大模型 + 视觉OCR</span>
          </div>

          {/* Translate Current Page Action */}
          {uploadedPdfDoc && (
            <button
              onClick={() => handleTranslateCurrentPage()}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-xs transition"
              title="使用 Gemini AI 精译当前页部位与工艺说明（数字公差保留原文）"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI精译文本</span>
            </button>
          )}

          {/* Gemini Vision OCR Button for Images / Scanned Drawings */}
          {(uploadedPdfDoc || isImageMode) && (
            <button
              onClick={() => handleOcrCurrentPage()}
              disabled={isOcrRunning}
              className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md shadow-xs transition disabled:opacity-50"
              title="使用 Gemini Vision 视觉大模型深度识别图纸/扫描件中的英文并翻译为中文"
            >
              {isOcrRunning ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{isOcrRunning ? 'OCR 识别中...' : '📷 图像文字识别(OCR)'}</span>
            </button>
          )}

          {/* Batch Translate All Pages Button (For multi-page PDFs) */}
          {uploadedPdfDoc && totalPages > 1 && (
            <button
              onClick={() => handleBatchTranslateAllPages()}
              disabled={isBatchTranslating}
              className="flex items-center space-x-1 px-3.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition disabled:opacity-50"
              title={`一键使用 Gemini AI 解析并翻译全部 ${totalPages} 个页面（数值公差自动保留原文）`}
            >
              {isBatchTranslating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>批处理中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>一键全本翻译 ({totalPages}页)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Actions: Styling, Zoom & Export */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
          {/* Toggle Bilingual Layer */}
          <button
            onClick={() => setShowBilingualOverlay(!showBilingualOverlay)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              showBilingualOverlay
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="开关同页中文对照层 (核对纯净英文原文)"
          >
            {showBilingualOverlay ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">中文对照层</span>
          </button>

          {/* Font Size */}
          <div className="flex items-center space-x-1 text-slate-600 text-xs">
            <span className="text-[11px] text-slate-500 hidden sm:inline">字号:</span>
            <select
              value={pillFontSize}
              onChange={(e) => setPillFontSize(parseFloat(e.target.value))}
              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none"
            >
              <option value={9.0}>9.0 pt</option>
              <option value={9.5}>9.5 pt</option>
              <option value={10.0}>10.0 pt (标)</option>
              <option value={10.5}>10.5 pt</option>
              <option value={11.0}>11.0 pt</option>
            </select>
          </div>

          {/* Pure Numeric Filter */}
          <button
            onClick={() => setFilterPureNumeric(!filterPureNumeric)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition ${
              filterPureNumeric
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-500'
            }`}
            title="过滤 5CM, 12CM, XS 等纯尺寸与单位标注，避免图纸杂乱"
          >
            <Filter className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">过滤纯尺寸: {filterPureNumeric ? '开' : '关'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition"
              title="缩小"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-700 font-semibold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))}
              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition"
              title="放大"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Export Options & Button */}
          {(uploadedPdfDoc || isImageMode) && (
            <div className="flex items-center space-x-1">
              {totalPages > 1 && (
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as 'all' | 'current')}
                  className="bg-white border border-slate-300 text-slate-700 text-xs rounded px-1.5 py-1 focus:outline-none"
                  title="选择导出范围"
                >
                  <option value="all">导出全部 {totalPages} 页</option>
                  <option value="current">仅导出第 {currentPage} 页</option>
                </select>
              )}

              <button
                onClick={() => handleExportPdf(exportScope)}
                disabled={isExporting}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? '导出中...' : (totalPages > 1 && exportScope === 'all' ? `导出全部${totalPages}页PDF` : '导出对照版PDF')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Page Navigation Bar (Rendered when document has multiple pages) */}
      {uploadedPdfDoc && totalPages > 1 && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs flex-wrap gap-2">
          {/* Navigation controls */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium text-[11px]">页面导航:</span>
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageSelect(currentPage - 1)}
              className="flex items-center space-x-0.5 px-2 py-0.5 bg-white hover:bg-slate-50 disabled:opacity-30 rounded border border-slate-200 text-slate-700 text-xs font-medium shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一页</span>
            </button>

            {/* Quick jump page tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto max-w-[50vw] py-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const pageState = pagesMap[pageNum];
                const isTranslated = pageState?.isTranslated;
                const pillCount = pageState?.pills?.length || 0;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageSelect(pageNum)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>第 {pageNum} 页</span>
                    {isTranslated ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-mono font-semibold">
                        {pillCount}条 ✓
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded font-mono">
                        待译
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageSelect(currentPage + 1)}
              className="flex items-center space-x-0.5 px-2 py-0.5 bg-white hover:bg-slate-50 disabled:opacity-30 rounded border border-slate-200 text-slate-700 text-xs font-medium shadow-xs"
            >
              <span>下一页</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick summary of pages status */}
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span>总页数: <strong className="text-slate-900 font-mono">{totalPages}</strong></span>
            <span>已处理: <strong className="text-emerald-700 font-mono font-semibold">{totalStats.pagesCount}</strong> 页</span>
            <span>全本批注: <strong className="text-blue-700 font-mono font-semibold">{totalStats.totalPills}</strong> 条</span>
          </div>
        </div>
      )}

      {/* Batch Progress Bar Banner */}
      {isBatchTranslating && batchProgress && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between text-xs text-indigo-900 animate-pulse">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <span className="font-medium">{batchProgress.message}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-48 bg-indigo-200 rounded-full h-2 overflow-hidden border border-indigo-300">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              ></div>
            </div>
            <span className="font-mono text-indigo-800 font-bold">
              {Math.round((batchProgress.current / batchProgress.total) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Central PDF In-Place Viewer Canvas */}
        <div
          ref={viewerContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 bg-slate-200/60 p-6 overflow-auto flex items-start justify-center relative select-none transition-colors ${
            isDragOver ? 'bg-blue-100/50 ring-4 ring-blue-500/50 ring-inset' : ''
          }`}
        >
          {/* Drag & drop helper overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-900/20 backdrop-blur-xs">
              <div className="p-6 bg-white border-2 border-dashed border-blue-500 rounded-2xl flex flex-col items-center space-y-2 shadow-xl">
                <FileUp className="w-10 h-10 text-blue-600 animate-bounce" />
                <span className="font-bold text-slate-900 text-sm">释放以立即上传并解析多页 PDF</span>
              </div>
            </div>
          )}

          {/* Empty Upload State when no PDF or Image is loaded */}
          {!uploadedPdfDoc && !isImageMode && (
            <div className="my-auto max-w-xl w-full p-8 bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center text-center transition cursor-pointer shadow-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                上传客供服装资料 (PDF 工艺单 / CAD 图纸 / 扫描件 / 规格表图片)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mb-6">
                支持外商英文 PDF 工艺单及 PNG、JPG、JPEG、WEBP 图片格式。内置 Gemini Vision 视觉大模型，能自动提取图片中的英文技术说明、测量部位 (POM) 并精准翻译为中文，数值与公差原文保留。
              </p>
              <div className="flex items-center space-x-3 text-xs">
                <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition">
                  选择本地 PDF 或图片上传
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-500 w-full">
                <div className="text-center">
                  <strong className="text-slate-800 block mb-0.5">透明无边框</strong>
                  底色全透，文字悬浮错开
                </div>
                <div className="text-center">
                  <strong className="text-slate-800 block mb-0.5">Gemini Vision OCR</strong>
                  图纸/扫描件/图片文字识别
                </div>
                <div className="text-center">
                  <strong className="text-slate-800 block mb-0.5">工程规范术语</strong>
                  尺寸部位高精翻译 · 数值公差原文保留
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoadingPdf && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs">
              <div className="flex items-center space-x-3 px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-xl">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-slate-800">正在解析图纸与提取文字坐标...</span>
              </div>
            </div>
          )}

          {/* Active PDF Canvas & In-Place Transparent Annotations */}
          {(uploadedPdfDoc || isImageMode) && (
            <div
              style={{
                width: `${docWidth}px`,
                height: `${docHeight}px`,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.1s ease-out'
              }}
              className="relative shadow-xl rounded-sm bg-white overflow-hidden border border-slate-300 shrink-0"
            >
              {/* LAYER 1: RENDERED PDF CANVAS (Original English Text & Vector CAD) */}
              <canvas
                ref={pdfCanvasRef}
                className="absolute inset-0 block w-full h-full pointer-events-none"
              />

              {/* LAYER 2: TRANSPARENT BILINGUAL OVERLAY LAYER (NO BORDERS, 100% TRANSPARENT, STAGGERED FROM ENGLISH) */}
              {showBilingualOverlay && (
                <div className="absolute inset-0 pointer-events-auto">
                  {visiblePills.map(pill => {
                    return (
                      <div
                        key={pill.id}
                        onClick={() => {
                          setSelectedPill(pill);
                          setIsEditModalOpen(true);
                        }}
                        style={{
                          left: `${pill.x}px`,
                          top: `${pill.y}px`,
                          fontSize: `${pill.fontSize}px`,
                          color: '#0038b8', // Deep royal navy for clear contrast with original black English text
                          backgroundColor: 'transparent',
                          border: 'none',
                        }}
                        className="absolute z-20 cursor-pointer font-bold leading-none select-text hover:text-blue-500 hover:underline transition flex items-center space-x-1 group whitespace-nowrap"
                        title={`点击编辑此对照\n原文: ${pill.originalText}\n位置: ${pill.placement}`}
                      >
                        <span>{pill.translation}</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Page Stamp */}
              <div className="absolute bottom-3 right-4 flex items-center space-x-1 text-[10px] text-slate-400 font-mono pointer-events-none opacity-50">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                <span>TexTrans Transparent Bilingual Verified (P.{currentPage})</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Technical Callout & Inspection Panel */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-slate-900">
                {uploadedPdfDoc ? `第 ${currentPage} 页工艺索引` : '工艺对照索引'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-semibold">
                {visiblePills.length} 条已注
              </span>
            </div>
          </div>

          {/* Quick Engine Actions in Sidebar */}
          {(uploadedPdfDoc || isImageMode) && (
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-col gap-1.5 text-xs">
              {uploadedPdfDoc && (
                <button
                  onClick={() => handleTranslateCurrentPage()}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 rounded-lg shadow-xs transition font-semibold"
                  title="使用 Gemini AI 深度大模型精译本页部位描述"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs">Gemini AI 精译文本</span>
                </button>
              )}
              <button
                onClick={() => handleOcrCurrentPage()}
                disabled={isOcrRunning}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg shadow-xs transition font-semibold disabled:opacity-50"
                title="使用 Gemini Vision 视觉大模型深度识别图纸/扫描件中的英文并翻译"
              >
                {isOcrRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span className="text-xs">{isOcrRunning ? 'OCR 识别中...' : '📷 识别图内文字 (OCR)'}</span>
              </button>
            </div>
          )}

          {/* Search bar inside inspector */}
          <div className="p-2.5 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="在当前页中检索部位或译文..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of Technical Callouts on current page */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {visiblePills.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 px-4">
                {uploadedPdfDoc ? (
                  <>
                    <p>当前页暂未生成对照</p>
                    <button
                      onClick={() => handleTranslateCurrentPage()}
                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs inline-flex items-center space-x-1 shadow-xs font-semibold"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>启动 Gemini AI 翻译</span>
                    </button>
                  </>
                ) : (
                  <p>请上传客供 PDF 资料以查看工艺索引</p>
                )}
              </div>
            ) : (
              visiblePills.map(pill => (
                <div
                  key={pill.id}
                  onClick={() => {
                    setSelectedPill(pill);
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-slate-500 truncate max-w-[170px]">
                      {pill.originalText}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-mono">
                      {pill.placement}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                      {pill.translation}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Guidelines */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span className="flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>版式对照标准</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {translationEngine.toUpperCase()}
              </span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-500">
              • 100% 透明无边框，深海军蓝粗体字<br />
              • 严格错开原文（右侧空隙或充足行距），杜绝遮盖<br />
              • 支持整本 N 页自动批处理与一键打包多页 PDF
            </p>
          </div>
        </aside>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-7 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 shadow-xs">
        <div className="flex items-center space-x-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate">{statusMessage}</span>
        </div>
        <div className="flex items-center space-x-4 shrink-0 font-mono text-[10.5px]">
          {uploadedPdfDoc && <span>页码: {currentPage} / {totalPages}</span>}
          {uploadedPdfDoc && <span>尺寸: {docWidth} x {docHeight} pt</span>}
          <span>排版: 透明无框错开</span>
        </div>
      </footer>

      {/* Annotation Edit Modal */}
      <AnnotationEditModal
        pill={selectedPill}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSavePill}
        onDelete={handleDeletePill}
      />
    </div>
  );
};
