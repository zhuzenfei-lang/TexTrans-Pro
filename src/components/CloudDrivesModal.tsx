import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  X,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  UploadCloud,
  FileCheck,
  HardDrive,
  Cloud,
  Link,
  Layers,
  ArrowRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from '../lib/googleAuth.ts';
import {
  listDriveFiles,
  downloadDriveFile,
  deleteDriveFile,
  type DriveFileItem,
} from '../lib/googleDrive.ts';

export type CloudDriveProvider = 'googledrive' | 'onedrive' | 'dropbox' | 'enterprise_link';

interface CloudDrivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile?: (file: File, category: 'pdf' | 'excel' | 'word' | 'image' | 'text') => void;
  defaultTab?: CloudDriveProvider;
}

export const CloudDrivesModal: React.FC<CloudDrivesModalProps> = ({
  isOpen,
  onClose,
  onImportFile,
  defaultTab = 'googledrive',
}) => {
  const [activeTab, setActiveTab] = useState<CloudDriveProvider>(defaultTab);

  // ==================== Google Drive State ====================
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'pdf' | 'excel' | 'word' | 'image'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // ==================== Remote Cloud Fetch State (OneDrive / Dropbox / Direct Link) ====================
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [remoteFileName, setRemoteFileName] = useState<string>('');
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);
  const [remoteSuccessMsg, setRemoteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // Listen to Google auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Google Drive files
  const fetchGoogleDriveFiles = async (currentToken?: string) => {
    const activeTok = currentToken || token;
    if (!activeTok) return;

    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const items = await listDriveFiles(activeTok, {
        searchTerm,
        fileCategory: activeCategory,
      });
      setFiles(items);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || '读取 Google Drive 文件失败');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen && token && activeTab === 'googledrive') {
      fetchGoogleDriveFiles();
    }
  }, [isOpen, token, activeCategory, activeTab]);

  const handleSignInGoogle = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchGoogleDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed', err);
      setErrorMsg(err?.message || 'Google 账号登录与授权失败，请重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFiles([]);
  };

  // Google Drive File Import
  const handleImportGoogleDriveFile = async (item: DriveFileItem) => {
    if (!token) return;
    setDownloadingFileId(item.id);
    setErrorMsg(null);
    try {
      const { blob } = await downloadDriveFile(item.id, item.mimeType, token);
      let cat: 'pdf' | 'excel' | 'word' | 'image' | 'text' = 'text';
      let resolvedMime = item.mimeType || 'application/octet-stream';
      let finalName = item.name;

      if (item.mimeType === 'application/vnd.google-apps.spreadsheet') {
        resolvedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!finalName.toLowerCase().endsWith('.xlsx')) finalName += '.xlsx';
        cat = 'excel';
      } else if (item.mimeType === 'application/vnd.google-apps.document') {
        resolvedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!finalName.toLowerCase().endsWith('.docx')) finalName += '.docx';
        cat = 'word';
      } else if (item.mimeType === 'application/pdf' || finalName.toLowerCase().endsWith('.pdf')) {
        cat = 'pdf';
        resolvedMime = 'application/pdf';
      } else if (item.mimeType.includes('spreadsheet') || finalName.toLowerCase().endsWith('.xlsx') || finalName.toLowerCase().endsWith('.xls')) {
        cat = 'excel';
      } else if (item.mimeType.includes('word') || finalName.toLowerCase().endsWith('.docx') || finalName.toLowerCase().endsWith('.doc')) {
        cat = 'word';
      } else if (item.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(finalName)) {
        cat = 'image';
      }

      const file = new File([blob], finalName, { type: resolvedMime });
      if (onImportFile) {
        onImportFile(file, cat);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(`下载导入文件失败: ${err?.message || '网络连接超时'}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Google Drive File Delete
  const executeDeleteGoogleDriveFile = async () => {
    if (!pendingDeleteFile || !token) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(pendingDeleteFile.id, token);
      setFiles((prev) => prev.filter((f) => f.id !== pendingDeleteFile.id));
      setPendingDeleteFile(null);
    } catch (err: any) {
      setErrorMsg(`删除文件失败: ${err?.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Remote URL Fetcher (OneDrive / Dropbox / Enterprise Link)
  const handleFetchRemoteFile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!remoteUrl.trim()) return;

    setIsFetchingRemote(true);
    setErrorMsg(null);
    setRemoteSuccessMsg(null);

    try {
      const res = await fetch('/api/fetch-remote-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: remoteUrl.trim(),
          fileName: remoteFileName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '抓取远程文件失败，请检查链接是否为公开可下载文件');
      }

      // Convert base64 to Blob & File
      const byteChars = atob(data.base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });

      let cat: 'pdf' | 'excel' | 'word' | 'image' | 'text' = 'text';
      const fname = data.fileName.toLowerCase();
      if (data.mimeType === 'application/pdf' || fname.endsWith('.pdf')) {
        cat = 'pdf';
      } else if (data.mimeType.includes('spreadsheet') || fname.endsWith('.xlsx') || fname.endsWith('.xls') || fname.endsWith('.csv')) {
        cat = 'excel';
      } else if (data.mimeType.includes('word') || fname.endsWith('.docx') || fname.endsWith('.doc')) {
        cat = 'word';
      } else if (data.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(fname)) {
        cat = 'image';
      }

      const file = new File([blob], data.fileName, { type: data.mimeType });
      setRemoteSuccessMsg(`成功获取文件: ${data.fileName} (${(data.size / 1024).toFixed(1)} KB)，正在导入...`);

      setTimeout(() => {
        if (onImportFile) {
          onImportFile(file, cat);
          onClose();
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || '抓取文件失败，请确认该分享链接具备公开只读权限');
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Helper: Format file size
  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return '-';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string, name: string) => {
    const n = name.toLowerCase();
    if (mimeType.includes('pdf') || n.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes('word') || n.endsWith('.docx') || n.endsWith('.doc')) {
      return <FileCheck className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(n)) {
      return <ImageIcon className="w-5 h-5 text-purple-600 shrink-0" />;
    }
    return <Folder className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  外贸云盘工作台 (Cloud Drives Hub)
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  多云盘互联
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                支持 Google Drive、OneDrive、Dropbox、企业云盘与公网直链工艺单及尺寸表直接导入
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-5 pt-3 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('googledrive'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'googledrive'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive (谷歌云盘)</span>
          </button>

          <button
            onClick={() => { setActiveTab('onedrive'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'onedrive'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>Microsoft OneDrive / SharePoint</span>
          </button>

          <button
            onClick={() => { setActiveTab('dropbox'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'dropbox'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Dropbox (国际网盘)</span>
          </button>

          <button
            onClick={() => { setActiveTab('enterprise_link'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'enterprise_link'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link className="w-3.5 h-3.5 text-emerald-600" />
            <span>企业网盘 / 直链嗅探抓取</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Google Drive */}
        {activeTab === 'googledrive' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5">
            {/* Auth status bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2 shrink-0">
              {token && user ? (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">已连接账号:</span>
                  <span className="font-semibold text-slate-800">{user.email || user.displayName}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">OAuth 活跃</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>尚未连接 Google 账号，点击右侧登录授权读取您的 Google Drive 文件</span>
                </div>
              )}

              <div>
                {token ? (
                  <button
                    onClick={handleSignOutGoogle}
                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 transition px-2 py-1 rounded"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>退出连接</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSignInGoogle}
                    disabled={isLoggingIn}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{isLoggingIn ? '正在连接...' : '授权连接 Google Drive'}</span>
                  </button>
                )}
              </div>
            </div>

            {token && (
              <>
                {/* Search & Filter Bar */}
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索 Google Drive 内的款式编号、工艺单或尺寸表名称..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchGoogleDriveFiles()}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    {(['all', 'pdf', 'excel', 'word', 'image'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                          activeCategory === cat
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat === 'all' && '全部'}
                        {cat === 'pdf' && 'PDF工艺单'}
                        {cat === 'excel' && 'Excel尺寸表'}
                        {cat === 'word' && 'Word文档'}
                        {cat === 'image' && '样衣图片'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => fetchGoogleDriveFiles()}
                    disabled={isLoadingFiles}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    title="刷新列表"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">
                  {isLoadingFiles ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs">正在从 Google Drive 检索服装工艺单与数据...</span>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400 p-4 text-center">
                      <Folder className="w-8 h-8 text-slate-300" />
                      <span className="text-xs">未找到符合条件的文件</span>
                      <span className="text-[11px] text-slate-400">
                        请确认 Google Drive 中已存放 PDF / Excel / Word / 图片格式的工艺资料
                      </span>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 sticky top-0 backdrop-blur-xs">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">文件名</th>
                          <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">大小</th>
                          <th className="py-2.5 px-3 font-semibold hidden md:table-cell">修改时间</th>
                          <th className="py-2.5 px-4 text-right font-semibold">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {files.map((file) => (
                          <tr key={file.id} className="hover:bg-blue-50/40 transition group">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                {getFileIcon(file.mimeType, file.name)}
                                <div className="truncate max-w-[280px] sm:max-w-[340px]">
                                  <span className="font-medium text-slate-900 group-hover:text-blue-600 transition block truncate">
                                    {file.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block sm:hidden">
                                    {formatSize(file.size)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px] hidden sm:table-cell">
                              {formatSize(file.size)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px] hidden md:table-cell">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => handleImportGoogleDriveFile(file)}
                                  disabled={downloadingFileId === file.id}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition disabled:opacity-50 shadow-xs"
                                >
                                  {downloadingFileId === file.id ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>导入中...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3 h-3" />
                                      <span>直接导入</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => setPendingDeleteFile(file)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="从云盘删除文件"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Microsoft OneDrive / SharePoint */}
        {activeTab === 'onedrive' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
              <Cloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold block text-sm mb-1">Microsoft OneDrive & SharePoint 快捷导入</span>
                外贸买家（如欧美服装品牌）经常通过 OneDrive 或 SharePoint 发送工艺单、样衣尺码表或技术包链接。
                您只需在下方粘贴客人分享的 OneDrive 链接（例如 <code className="bg-white px-1 rounded border border-blue-200">1drv.ms/...</code> 或 SharePoint 分享地址），系统即可自动抓取文件并导入工作台！
              </div>
            </div>

            <form onSubmit={handleFetchRemoteFile} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  OneDrive / SharePoint 分享或直链 URL:
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://1drv.ms/u/s!... 或 https://mycompany.sharepoint.com/:x:/g/..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  重命名/指定文件名（可选，留空将自动从链接中读取）：
                </label>
                <input
                  type="text"
                  value={remoteFileName}
                  onChange={(e) => setRemoteFileName(e.target.value)}
                  placeholder="例如：2026_Winter_Jacket_SpecSheet.xlsx"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>服务端安全代理直接抓取 · 自动免除浏览器跨域限制</span>
                </div>
                <button
                  type="submit"
                  disabled={isFetchingRemote || !remoteUrl.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isFetchingRemote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在抓取并解析...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>从 OneDrive 导入到工作台</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {remoteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{remoteSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Dropbox */}
        {activeTab === 'dropbox' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex items-start space-x-3">
              <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold block text-sm mb-1">Dropbox 国际网盘一键抓取</span>
                广泛用于欧美外贸买家交付海量高精度服装CAD图纸、尺寸单据及试穿批注压缩包。
                支持将带有 <code className="bg-white px-1 rounded border border-indigo-200">dl=0</code> 的 Dropbox 分享链接自动转为直连流下载并导入！
              </div>
            </div>

            <form onSubmit={handleFetchRemoteFile} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dropbox 分享链接 (Share Link):
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://www.dropbox.com/s/sample_folder/TechPack.pdf?dl=0"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  目标文件名（可选）：
                </label>
                <input
                  type="text"
                  value={remoteFileName}
                  onChange={(e) => setRemoteFileName(e.target.value)}
                  placeholder="例如：Outdoor_Vest_SpecSheet.xlsx"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  自动将 <code className="text-indigo-600">?dl=0</code> 切换为 <code className="text-indigo-600">?dl=1</code> 直连流
                </span>
                <button
                  type="submit"
                  disabled={isFetchingRemote || !remoteUrl.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isFetchingRemote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在抓取 Dropbox 文件...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>从 Dropbox 抓取并导入</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {remoteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{remoteSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Enterprise Link / Domestic Cloud (Baidu / Aliyun / WebDAV / Direct HTTP) */}
        {activeTab === 'enterprise_link' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3">
              <Globe className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold block text-sm mb-1">企业私有云 · 网盘公开下载 · WebDAV · HTTP(S) 直链嗅探</span>
                适合从百度网盘公开下载直链、阿里云盘直链、坚果云公开链接、企业自建 Nextcloud / NAS 或任何邮件附件公开下载 URL 中直接导入工艺单与尺寸表。
              </div>
            </div>

            <form onSubmit={handleFetchRemoteFile} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  输入文件 HTTP / HTTPS 直链地址：
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    required
                    value={remoteUrl}
                    onChange={(e) => setRemoteUrl(e.target.value)}
                    placeholder="https://cdn.example.com/techpacks/Style_2026_TechPack.pdf"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  文件名称与后缀 (如未能从响应头中自动获取)：
                </label>
                <input
                  type="text"
                  value={remoteFileName}
                  onChange={(e) => setRemoteFileName(e.target.value)}
                  placeholder="例如：Hoodie_Size_Spec.xlsx 或 Fitting_Report.pdf"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  支持 PDF、Excel (.xlsx/.xls)、Word (.docx) 以及各格式服装样衣图片
                </span>
                <button
                  type="submit"
                  disabled={isFetchingRemote || !remoteUrl.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isFetchingRemote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在下载远程文件...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>嗅探抓取并直接导入</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {remoteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{remoteSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Destructive Delete Confirmation Modal for Google Drive */}
        {pendingDeleteFile && (
          <div
            className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => !isDeleting && setPendingDeleteFile(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 text-red-600">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">确认从 Google Drive 永久删除此文件？</h4>
                  <p className="text-xs text-slate-500">该操作不可撤销，请谨慎处理</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div><strong>文件名：</strong>{pendingDeleteFile.name}</div>
                <div><strong>文件大小：</strong>{formatSize(pendingDeleteFile.size)}</div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setPendingDeleteFile(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
                >
                  取消
                </button>
                <button
                  onClick={executeDeleteGoogleDriveFile}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isDeleting ? '正在删除...' : '确认彻底删除'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
