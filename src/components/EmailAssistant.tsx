import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Upload,
  Download,
  FileSpreadsheet,
  FileCheck,
  Clock,
  Target,
  ClipboardPaste,
  Trash2,
  Wrench,
  HeartHandshake,
  Image as ImageIcon,
  X,
  ZoomIn,
  Camera,
  Layers,
  ArrowRight,
  Send,
  Save,
  AlertTriangle
} from 'lucide-react';
import type { BuyerEmailResponse, AttachedImage } from '../types.ts';
import { parseUploadedFileToText, fileToAttachedImage } from '../utils/fileParser.ts';
import {
  exportCommentsToExcel,
  exportCommentsToWord,
  exportCommentsToPdf,
} from '../utils/commentExporter.ts';
import type { GmailMessageItem } from '../lib/googleGmail.ts';
import { sendGmailMessage, createGmailDraft } from '../lib/googleGmail.ts';
import { getAccessToken, googleSignIn } from '../lib/googleAuth.ts';

interface EmailAssistantProps {
  importedEmail?: GmailMessageItem | null;
  importedFile?: File | null;
  onOpenGmail?: () => void;
  onOpenEmailHub?: () => void;
}

export const EmailAssistant: React.FC<EmailAssistantProps> = ({
  importedEmail,
  importedFile,
  onOpenGmail,
  onOpenEmailHub,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; chars: number; type: string } | null>(null);
  const [exportingType, setExportingType] = useState<'excel' | 'word' | 'pdf' | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [previewModalImage, setPreviewModalImage] = useState<AttachedImage | null>(null);

  // Gmail sending / drafting state
  const [isSendingViaGmail, setIsSendingViaGmail] = useState<boolean>(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [gmailStatusMsg, setGmailStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [result, setResult] = useState<BuyerEmailResponse | null>(null);

  // Handle imported email from Gmail
  useEffect(() => {
    if (importedEmail) {
      const content = `Subject: ${importedEmail.subject}\nFrom: ${importedEmail.from}\nDate: ${importedEmail.date}\n\n${importedEmail.bodyText || importedEmail.snippet}`;
      setInputText(content);
      setUploadedInfo({
        name: `Gmail: ${importedEmail.subject}`,
        chars: content.length,
        type: 'GMAIL',
      });

      // Extract sender email for replying if present
      const match = importedEmail.from.match(/<([^>]+)>/) || [null, importedEmail.from];
      if (match[1]) {
        setRecipientEmail(match[1]);
      }

      setIsLoading(true);
      fetch('/api/buyer-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText: content }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.chineseTranslation || data.actionItems)) {
            setResult(data);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [importedEmail]);

  // Global paste handler: capture images and text directly from Ctrl+V anywhere in the workspace
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Don't intercept if focus is in another input outside this component
      const items = e.clipboardData?.items;
      if (!items) return;

      const newImgs: AttachedImage[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            try {
              const attached = await fileToAttachedImage(file);
              attached.name = `剪贴板截图_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
              newImgs.push(attached);
            } catch (err) {
              console.warn('Failed to parse pasted image', err);
            }
          }
        }
      }

      if (newImgs.length > 0) {
        setAttachedImages((prev) => [...prev, ...newImgs]);
        setUploadedInfo({
          name: `已粘贴 ${newImgs.length} 张图片到附件中`,
          chars: inputText.length,
          type: 'PASTED_IMAGE',
        });
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [inputText]);

  // Handle local paste on textarea specifically
  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImgs: AttachedImage[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          try {
            const attached = await fileToAttachedImage(file);
            attached.name = `剪贴板截图_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
            newImgs.push(attached);
          } catch (err) {
            console.warn('Failed to parse pasted image', err);
          }
        }
      }
    }

    if (newImgs.length > 0) {
      setAttachedImages((prev) => [...prev, ...newImgs]);
      setUploadedInfo({
        name: `已捕获 ${newImgs.length} 张剪贴板图片`,
        chars: inputText.length,
        type: 'PASTED_IMAGE',
      });
    }
  };

  // Trigger Gemini AI Multimodal Analysis
  const handleProcessEmail = async () => {
    if (!inputText.trim() && attachedImages.length === 0) return;
    setIsLoading(true);
    try {
      const payload = {
        emailText: inputText,
        images: attachedImages.map((img) => ({
          data: img.base64,
          mimeType: img.mimeType,
          name: img.name,
        })),
      };

      const res = await fetch('/api/buyer-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && (data.chineseTranslation || data.actionItems)) {
        setResult(data);
      }
    } catch (err) {
      console.error('Error running buyer comment analysis', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Upload (Excel, Word, PDF, Email, or Images)
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const parsed = await parseUploadedFileToText(file);

      if (parsed.fileType === 'image' && parsed.imageAttachment) {
        setAttachedImages((prev) => [...prev, parsed.imageAttachment!]);
        setUploadedInfo({
          name: `已添加图片：${file.name}`,
          chars: inputText.length,
          type: 'IMAGE',
        });
      } else {
        setInputText(parsed.text);
        setUploadedInfo({
          name: parsed.fileName,
          chars: parsed.charCount,
          type: parsed.fileType.toUpperCase(),
        });
      }

      // Auto trigger analysis if content is ready
      const payload = {
        emailText: parsed.fileType === 'image' ? inputText : parsed.text,
        images:
          parsed.fileType === 'image' && parsed.imageAttachment
            ? [...attachedImages, parsed.imageAttachment].map((img) => ({
                data: img.base64,
                mimeType: img.mimeType,
              }))
            : attachedImages.map((img) => ({
                data: img.base64,
                mimeType: img.mimeType,
              })),
      };

      if (payload.emailText.trim() || payload.images.length > 0) {
        const res = await fetch('/api/buyer-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data && (data.chineseTranslation || data.actionItems)) {
          setResult(data);
        }
      }
    } catch (err: any) {
      alert(`解析上传文件失败: ${err?.message || '请检查文件格式'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto handle imported file from Google Drive or other cloud drives
  useEffect(() => {
    if (importedFile) {
      handleFileUpload(importedFile);
    }
  }, [importedFile]);

  // Direct Image File Selection
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newImgs: AttachedImage[] = [];
      for (const f of files) {
        try {
          const img = await fileToAttachedImage(f);
          newImgs.push(img);
        } catch (err) {
          console.warn('Failed to load image', err);
        }
      }
      if (newImgs.length > 0) {
        setAttachedImages((prev) => [...prev, ...newImgs]);
        setUploadedInfo({
          name: `已添加 ${newImgs.length} 张图片`,
          chars: inputText.length,
          type: 'IMAGE',
        });
      }
      e.target.value = '';
    }
  };

  // Remove attached image
  const handleRemoveImage = (id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Clipboard Paste Text Helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText(text);
          setUploadedInfo({ name: '剪贴板粘贴文本', chars: text.length, type: 'CLIPBOARD' });
        }
      }
    } catch (_err) {
      // Ignore
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Exports
  const handleExportExcel = () => {
    if (!result) return;
    try {
      setExportingType('excel');
      exportCommentsToExcel(result, '服装买家评语技术应对方案');
    } catch (err) {
      console.error(err);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportWord = async () => {
    if (!result) return;
    try {
      setExportingType('word');
      await exportCommentsToWord(result, '服装买家评语技术应对方案');
    } catch (err) {
      console.error(err);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    try {
      setExportingType('pdf');
      await exportCommentsToPdf('printable-comment-report', '服装买家评语技术应对方案');
    } catch (err) {
      console.error(err);
    } finally {
      setExportingType(null);
    }
  };

  // Gmail Send and Draft actions
  const handleExecuteSendGmail = async () => {
    if (!recipientEmail.trim() || !result) return;
    setIsSendingViaGmail(true);
    setGmailStatusMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) throw new Error('未能获取授权令牌');
        token = authRes.accessToken;
      }
      await sendGmailMessage(
        recipientEmail,
        result.replyEmailDraft.subject,
        result.replyEmailDraft.body,
        token
      );
      setShowSendConfirmation(false);
      setGmailStatusMsg({ type: 'success', text: `邮件已成功发送至 ${recipientEmail}` });
      setTimeout(() => setGmailStatusMsg(null), 5000);
    } catch (err: any) {
      setGmailStatusMsg({ type: 'error', text: `发送失败: ${err?.message || '未知错误'}` });
    } finally {
      setIsSendingViaGmail(false);
    }
  };

  const handleSaveDraftToGmail = async () => {
    if (!result) return;
    setIsSendingViaGmail(true);
    setGmailStatusMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) throw new Error('未能获取授权令牌');
        token = authRes.accessToken;
      }
      await createGmailDraft(
        recipientEmail,
        result.replyEmailDraft.subject,
        result.replyEmailDraft.body,
        token
      );
      setGmailStatusMsg({ type: 'success', text: '已成功存入 Gmail 草稿箱' });
      setTimeout(() => setGmailStatusMsg(null), 5000);
    } catch (err: any) {
      setGmailStatusMsg({ type: 'error', text: `保存草稿失败: ${err?.message || '未知错误'}` });
    } finally {
      setIsSendingViaGmail(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Banner & Multi-Format Actions */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 shadow-xs shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900">评语翻译和处理</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-1.5 py-0.5 rounded">
                Gemini AI 多模态图文理解与方案决策
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              支持上传 Excel/Word/PDF/Email 格式与直接截图粘贴图片 · 深度视觉识别样衣试穿缺陷 · 制定工艺对策
            </p>
          </div>
        </div>

        {/* 3 Export Buttons: Excel, Word, PDF */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            disabled={exportingType !== null || !result}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition shadow-xs disabled:opacity-40"
            title="导出结构化多工作表 Excel 方案"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{exportingType === 'excel' ? '导出中...' : '导出 Excel'}</span>
          </button>

          <button
            onClick={handleExportWord}
            disabled={exportingType !== null || !result}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition shadow-xs disabled:opacity-40"
            title="导出排版精美的 Word (.docx) 技术报告"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>{exportingType === 'word' ? '导出中...' : '导出 Word'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingType !== null || !result}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition shadow-xs disabled:opacity-40"
            title="导出高保真 PDF 技术对策单"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>{exportingType === 'pdf' ? '生成中...' : '导出 PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column (5 cols): Multi-format Upload, Image Paste & Input */}
        <div className="lg:col-span-5 bg-white border-r border-slate-200 flex flex-col p-4 space-y-3 overflow-y-auto">
          {/* Header & Quick Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>评语文本与样衣图片输入</span>
            </span>

            <div className="flex items-center space-x-1.5">
              {(onOpenEmailHub || onOpenGmail) && (
                <button
                  onClick={() => (onOpenEmailHub ? onOpenEmailHub() : onOpenGmail?.())}
                  className="flex items-center space-x-1 px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-700 rounded-md border border-red-200 font-semibold transition"
                  title="从 Gmail / Outlook / 企业邮箱导入买家评语"
                >
                  <Mail className="w-3 h-3 text-red-600" />
                  <span>邮箱导入</span>
                </button>
              )}

              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center space-x-1 px-2 py-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 font-semibold transition"
                title="选择样衣试穿照片、缺陷截图或修改标注图"
              >
                <Camera className="w-3 h-3 text-indigo-600" />
                <span>添加图片</span>
              </button>

              <button
                onClick={handlePasteClipboard}
                className="flex items-center space-x-1 px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 font-medium transition"
                title="从剪贴板粘贴文本"
              >
                <ClipboardPaste className="w-3 h-3 text-slate-600" />
                <span>粘贴文本</span>
              </button>

              <button
                onClick={() => {
                  setInputText('');
                  setAttachedImages([]);
                  setUploadedInfo(null);
                }}
                className="flex items-center space-x-1 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-600 rounded-md transition"
                title="清空内容与附图"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            </div>
          </div>

          {/* Hidden Image File Input */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* Drag & Drop Upload Dropzone for Excel, Word, PDF, Email, Images */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                Array.from(files).forEach((f) => handleFileUpload(f));
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/60'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv,.docx,.doc,.pdf,.eml,.msg,.txt,image/*"
              className="hidden"
            />
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
              <Upload className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">点击上传或拖拽文件到此处</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-center flex-wrap gap-1">
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-mono">Excel</span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-mono">Word</span>
              <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[10px] font-mono">PDF</span>
              <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded text-[10px] font-mono">Email</span>
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">样衣实拍/截图 (Image)</span>
            </div>
          </div>

          {/* Uploaded File Notification Tag */}
          {uploadedInfo && (
            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold truncate">{uploadedInfo.name}</span>
                <span className="text-[10px] text-blue-700 bg-blue-200/60 px-1 py-0.2 rounded shrink-0">
                  {uploadedInfo.type}
                </span>
              </div>
            </div>
          )}

          {/* Attached Images Gallery (Pasted / Uploaded Photos) */}
          {attachedImages.length > 0 && (
            <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <div className="flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>已附加待分析图片 ({attachedImages.length} 张)</span>
                </div>
                <span className="text-[10px] text-indigo-600 font-normal">
                  点击查看大图 · Gemini 将进行多模态视觉理解
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-lg overflow-hidden border border-indigo-200 bg-white aspect-square shadow-xs"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name || '样衣图片'}
                      className="w-full h-full object-cover cursor-pointer group-hover:opacity-90 transition"
                      onClick={() => setPreviewModalImage(img)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1 transition pointer-events-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalImage(img);
                        }}
                        className="p-1 rounded bg-white/90 text-slate-800 hover:bg-white pointer-events-auto"
                        title="查看大图"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700 pointer-events-auto"
                        title="删除该图"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Textarea Input with Direct Image Paste Support */}
          <div className="flex-1 flex flex-col relative min-h-[220px]">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handleTextareaPaste}
              placeholder="在此粘贴客人发来的服装技术评语、尺寸修改单或邮件正文...&#10;&#10;💡 支持直接按 Ctrl+V 粘贴样衣试穿实拍截图、圈红箭头修改图或尺寸表图片，Gemini AI 将同时识别图文细节！"
              className="flex-1 w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed resize-none transition"
            />
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
              可直接 Ctrl+V 粘贴截图
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleProcessEmail}
            disabled={isLoading || (!inputText.trim() && attachedImages.length === 0)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-blue-200 animate-pulse" />
            <span>
              {isLoading
                ? 'Gemini AI 正在深度剖析图文要点与制定应对方案...'
                : '一键用 Gemini AI 分析要点并制定应对方案'}
            </span>
          </button>
        </div>

        {/* Right Column (7 cols): AI Analysis & Solutions Hub */}
        <div className="lg:col-span-7 bg-slate-50 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4">
          {!result ? (
            /* Empty State Guide */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-bold text-base text-slate-900">
                  评语翻译与技术应对方案工作台
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  在左侧粘贴客人发来的服装评语邮件、上传工作表（Excel/Word/PDF/Email），或直接按 <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Ctrl+V</kbd> 粘贴样衣试穿实拍截图。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left mt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 flex items-center space-x-1 mb-1">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    <span>核心意向剖析</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    分析批复状态、交期截点与客户最关心的满意期望
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 flex items-center space-x-1 mb-1">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>多模态图片理解</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    精准识别试穿拉扯横纹、罗纹回弹与红圈箭头标记
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800 flex items-center space-x-1 mb-1">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>多格式一键导出</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    一键导出排版规范的 Excel、Word 及高清 PDF 方案单
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Card 1: 🎯 Gemini AI 核心要点分析与客户期望 (Buyer Intent & Core Analysis) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        一、 客户意向与核心要点深度分析 (Buyer Intent & Key Points)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Gemini AI 提取的批复状态、交期截点与客户最底层的核心诉求
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{result.analysisSummary?.approvalStatus || '有条件批复'}</span>
                    </span>
                  </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>客户态度与交期节点</span>
                    </div>
                    <div className="text-xs text-slate-800 font-medium">
                      {result.analysisSummary?.sentiment}
                    </div>
                    <div className="text-[11px] text-blue-700 font-semibold mt-1">
                      ⏱️ 交付节点：{result.analysisSummary?.timeline || '尽快出样'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                      <span>客人核心期望 (关键满意点)</span>
                    </div>
                    <div className="text-xs text-emerald-900 font-medium leading-relaxed">
                      {result.analysisSummary?.buyerExpectation || '确保修改尺寸精准并按时寄送确认样'}
                    </div>
                  </div>
                </div>

                {/* Visual Observations Callout (When Images are Provided) */}
                {result.visualObservations && result.visualObservations.length > 0 && (
                  <div className="mb-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>📸 附图视觉深度解析与实物缺陷核对 (Visual Inspection Observations)</span>
                    </div>
                    <div className="space-y-1">
                      {result.visualObservations.map((obs, idx) => (
                        <div key={idx} className="text-xs text-indigo-950 flex items-start space-x-1.5 leading-relaxed">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{obs}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Core Conflict / Technical Friction */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start space-x-2">
                  <span className="bg-indigo-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    核心矛盾剖析
                  </span>
                  <span className="leading-relaxed font-medium">
                    {result.analysisSummary?.coreConflict || '分析显示，需在保持廓形挺括的同时解决尺寸收缩与车缝走线细节问题。'}
                  </span>
                </div>
              </div>

              {/* Card 2: 🛠️ 要点剖析与工艺应对方案 (Technical Resolution Matrix) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        二、 要点剖析与车间工艺对策表 (Resolution Strategy Matrix)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        逐项拆解客人意见，精准指定工艺调整参数与消除客人顾虑的应对策略
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resolution Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-1/5">部位 / 项目</th>
                        <th className="py-2.5 px-3 w-1/4">客人原始意见 & 图片缺陷</th>
                        <th className="py-2.5 px-2 w-14 text-center">部门</th>
                        <th className="py-2.5 px-3">车间工艺对策 & 满足客人期望方案</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(result.keyPointsBreakdown || []).map((kp, idx) => (
                        <tr key={kp.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 align-top font-semibold text-slate-900">
                            <div className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              <span>{kp.item}</span>
                            </div>
                            <span
                              className={`inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                kp.severity === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : kp.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {kp.severity === 'high' ? '高风险整改' : kp.severity === 'medium' ? '中度调整' : '细节优化'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 align-top text-slate-700 leading-relaxed font-sans">
                            {kp.originalIssue}
                          </td>

                          <td className="py-2.5 px-2 align-top text-center">
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap">
                              {kp.department}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 align-top space-y-1.5">
                            <div className="text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-relaxed">
                              <span className="font-bold text-blue-700 text-[11px] block">
                                🔧 技术工艺对策：
                              </span>
                              {kp.technicalSolution}
                            </div>
                            <div className="text-emerald-900 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 leading-relaxed">
                              <span className="font-bold text-emerald-800 text-[11px] block">
                                🤝 满足客人期望措施：
                              </span>
                              {kp.buyerSatisfactionPlan}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: 📋 车间与版房落地整改清单 (Factory Action Checklist) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      三、 车间与版房落地整改清单 (Factory & QC Action Items)
                    </h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.actionItems.join('\n'), 'action')}
                    className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                  >
                    {copiedSection === 'action' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'action' ? '已复制' : '复制派工单'}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {result.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: 🌐 客供评语工程技术精译 (Bilingual Technical Translation) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      四、 客供评语服装技术精译 (精准对应服装部位与工艺)
                    </h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.chineseTranslation, 'trans')}
                    className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                  >
                    {copiedSection === 'trans' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'trans' ? '已复制' : '复制翻译'}</span>
                  </button>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-sans">
                  {result.chineseTranslation}
                </div>
              </div>

              {/* Card 5: ✉️ 地道国际商务英文回复草拟 (Professional English Reply) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      五、 地道商务英文回复邮件草拟 (遵循 BLUF 原则 · 消除被动攻击短语)
                    </h4>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Subject: ${result.replyEmailDraft.subject}\n\n${result.replyEmailDraft.body}`,
                        'reply'
                      )
                    }
                    className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                  >
                    {copiedSection === 'reply' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'reply' ? '已复制' : '复制英文邮件'}</span>
                  </button>
                </div>

                {/* Subject */}
                <div className="mb-2.5 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">Subject: </span>
                  <span className="font-bold text-indigo-900 font-mono">
                    {result.replyEmailDraft.subject}
                  </span>
                </div>

                {/* BLUF Highlight */}
                <div className="mb-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-start space-x-2">
                  <span className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                    BLUF 核心
                  </span>
                  <span className="text-emerald-950 text-xs font-medium leading-relaxed">
                    {result.replyEmailDraft.blufSummary}
                  </span>
                </div>

                {/* Body */}
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
                  {result.replyEmailDraft.body}
                </div>

                {/* Gmail Actions */}
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSendConfirmation(true)}
                      disabled={isSendingViaGmail}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>通过 Gmail 发送此回复</span>
                    </button>
                    <button
                      onClick={handleSaveDraftToGmail}
                      disabled={isSendingViaGmail}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-500" />
                      <span>存为 Gmail 草稿</span>
                    </button>
                  </div>

                  {gmailStatusMsg && (
                    <div
                      className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        gmailStatusMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {gmailStatusMsg.text}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 truncate">
                {previewModalImage.name || '样衣实拍/修改截图'}
              </span>
              <button
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-slate-900/5 max-h-[calc(90vh-4rem)]">
              <img
                src={previewModalImage.dataUrl}
                alt="预览"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gmail Send Confirmation Dialog (Mandatory Workspace Safety Flow) */}
      {showSendConfirmation && result && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isSendingViaGmail && setShowSendConfirmation(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">确认通过 Gmail 发送邮件</h3>
                  <p className="text-xs text-slate-500">此操作将调用您的 Google Workspace 账号向客人发出真实邮件</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendConfirmation(false)}
                disabled={isSendingViaGmail}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  收件人邮箱 (To):
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="buyer@client.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-0.5">邮件主题 (Subject):</span>
                <p className="font-medium text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                  {result.replyEmailDraft.subject}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-0.5">邮件正文预览 (Body Preview):</span>
                <div className="max-h-36 overflow-y-auto bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                  {result.replyEmailDraft.body}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>注意：邮件发送后不可撤回，请务必核实收件人地址与英文内容。</span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSendConfirmation(false)}
                disabled={isSendingViaGmail}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteSendGmail}
                disabled={isSendingViaGmail || !recipientEmail.trim()}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSendingViaGmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>正在发送...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>确认发送邮件</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Clean Report DOM for High-Resolution PDF Generation */}
      {result && (
        <div className="absolute -left-[9999px] top-0">
          <div
            id="printable-comment-report"
            style={{ width: '820px', padding: '36px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}
          >
            {/* Header */}
            <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e3a8a' }}>
                    服装外贸买家评语技术翻译与应对方案报告
                  </h1>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Garment Technical Fitting Comments Analysis & Factory Resolution Report
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                  <div>生成日期：{new Date().toISOString().slice(0, 10)}</div>
                  <div style={{ fontWeight: 'bold', color: '#2563eb' }}>TexTrans Pro 外贸服装系统</div>
                </div>
              </div>
            </div>

            {/* Section 1 */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', borderLeft: '4px solid #2563eb', paddingLeft: '8px', margin: '0 0 10px 0' }}>
                一、 客户意向与核心要点分析
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div><strong>样衣批复状态：</strong>{result.analysisSummary?.approvalStatus}</div>
                  <div style={{ marginTop: '4px' }}><strong>交期时间节点：</strong>{result.analysisSummary?.timeline}</div>
                  <div style={{ marginTop: '4px' }}><strong>客户态度情绪：</strong>{result.analysisSummary?.sentiment}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <strong style={{ color: '#166534' }}>客人核心期望：</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#14532d' }}>{result.analysisSummary?.buyerExpectation}</p>
                </div>
              </div>

              {result.visualObservations && result.visualObservations.length > 0 && (
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '6px', marginTop: '8px', fontSize: '11px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ color: '#1e40af' }}>📸 附图视觉深度解析：</strong>
                  {result.visualObservations.map((obs, i) => (
                    <div key={i} style={{ marginTop: '2px', color: '#1e3a8a' }}>• {obs}</div>
                  ))}
                </div>
              )}

              <div style={{ background: '#eef2ff', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '11px', border: '1px solid #c7d2fe' }}>
                <strong style={{ color: '#3730a3' }}>核心矛盾剖析：</strong> {result.analysisSummary?.coreConflict}
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', borderLeft: '4px solid #2563eb', paddingLeft: '8px', margin: '0 0 10px 0' }}>
                二、 要点剖析与车间工艺对策表
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#1e293b' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '22%' }}>部位/项目</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '26%' }}>客人原始意见 & 图片缺陷</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '12%' }}>部门</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>工艺对策 & 满足客人期望方案</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.keyPointsBreakdown || []).map((kp, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top', fontWeight: 'bold' }}>
                        {kp.item}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top' }}>
                        {kp.originalIssue}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top', textAlign: 'center' }}>
                        {kp.department}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top' }}>
                        <div><strong>【工艺对策】</strong>{kp.technicalSolution}</div>
                        <div style={{ color: '#047857', marginTop: '4px' }}><strong>【客户对策】</strong>{kp.buyerSatisfactionPlan}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', borderLeft: '4px solid #059669', paddingLeft: '8px', margin: '0 0 10px 0' }}>
                三、 车间与版房落地整改清单
              </h2>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                {(result.actionItems || []).map((act, idx) => (
                  <div key={idx} style={{ marginBottom: '6px', lineHeight: '1.4' }}>
                    <strong>[  ] {idx + 1}.</strong> {act}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4 */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', borderLeft: '4px solid #2563eb', paddingLeft: '8px', margin: '0 0 10px 0' }}>
                四、 客供评语服装技术精译
              </h2>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {result.chineseTranslation}
              </div>
            </div>

            {/* Section 5 */}
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', borderLeft: '4px solid #4f46e5', paddingLeft: '8px', margin: '0 0 10px 0' }}>
                五、 地道商务英文回复邮件
              </h2>
              <div style={{ background: '#eef2ff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', marginBottom: '8px', border: '1px solid #c7d2fe' }}>
                <strong>Subject: </strong>{result.replyEmailDraft.subject}
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', whiteSpace: 'pre-line', fontFamily: 'monospace', lineHeight: '1.5' }}>
                {result.replyEmailDraft.body}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
