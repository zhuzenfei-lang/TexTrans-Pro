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
  HardDrive
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../lib/googleAuth.ts';
import {
  listDriveFiles,
  downloadDriveFile,
  deleteDriveFile,
  type DriveFileItem,
} from '../lib/googleDrive.ts';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile?: (file: File, category: 'pdf' | 'excel' | 'word' | 'image' | 'text') => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImportFile,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'pdf' | 'excel' | 'word' | 'image'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Destructive delete confirmation modal state
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Listen to auth state
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

  // Fetch files when token or filters change
  const fetchFiles = async (currentToken?: string) => {
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
    if (isOpen && token) {
      fetchFiles();
    }
  }, [isOpen, token, activeCategory]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed', err);
      setErrorMsg(err?.message || 'Google 账号登录与授权失败，请重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFiles([]);
  };

  // Import file into app
  const handleImport = async (item: DriveFileItem) => {
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

  // Confirmed delete execution
  const executeDelete = async () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">Google Drive 官方云盘集成</h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                  Workspace 授权
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                实时浏览、导入工艺单/尺寸表，或将分析方案同步保存至云盘
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth Bar / Profile */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          {user ? (
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-slate-300" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-900 block">{user.displayName || 'Google 用户'}</span>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 flex items-center space-x-1.5">
              <span>当前尚未连接 Google Drive 账号</span>
            </div>
          )}

          <div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出登录</span>
              </button>
            ) : (
              /* Official Google Sign In Button */
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="flex items-center space-x-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? '正在授权...' : '使用 Google 账号登录并连接 Drive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
          {errorMsg && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <HardDrive className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">请先连接您的 Google Drive</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                点击上方“使用 Google 账号登录”按钮完成授权后，即可直接选取并导入存放在云端硬盘的服装尺寸表和工艺单。
              </p>
            </div>
          ) : (
            <>
              {/* Search & Category Filter Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                    placeholder="按文件名搜索云盘文件..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      activeCategory === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setActiveCategory('pdf')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      activeCategory === 'pdf' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PDF工艺单
                  </button>
                  <button
                    onClick={() => setActiveCategory('excel')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      activeCategory === 'excel' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Excel尺寸表
                  </button>
                  <button
                    onClick={() => setActiveCategory('word')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      activeCategory === 'word' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Word文档
                  </button>
                  <button
                    onClick={() => setActiveCategory('image')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      activeCategory === 'image' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    样衣图片
                  </button>
                </div>

                <button
                  onClick={() => fetchFiles()}
                  disabled={isLoadingFiles}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-blue-600' : ''}`} />
                  <span>刷新</span>
                </button>
              </div>

              {/* Files Table / List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                {isLoadingFiles ? (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    <span>正在同步 Google Drive 云盘文件...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 space-y-1">
                    <Folder className="w-8 h-8 text-slate-300" />
                    <span>未找到匹配的文件</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">文件名</th>
                        <th className="py-2.5 px-3 w-28 hidden sm:table-cell">修改时间</th>
                        <th className="py-2.5 px-3 w-24 hidden md:table-cell">大小</th>
                        <th className="py-2.5 px-3 w-44 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((file) => {
                        const isPdf = file.mimeType === 'application/pdf' || file.name.endsWith('.pdf');
                        const isExcel = file.mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
                        const isWord = file.mimeType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
                        const isImg = file.mimeType.startsWith('image/');

                        return (
                          <tr key={file.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center space-x-2">
                                {isPdf && <FileText className="w-4 h-4 text-rose-600 shrink-0" />}
                                {isExcel && <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {isWord && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                                {isImg && <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />}
                                {!isPdf && !isExcel && !isWord && !isImg && (
                                  <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="font-medium text-slate-800 truncate max-w-xs sm:max-w-md">
                                  {file.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-slate-500 text-[11px] hidden sm:table-cell">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-slate-500 text-[11px] hidden md:table-cell">
                              {file.size ? `${(parseInt(file.size) / 1024).toFixed(0)} KB` : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => handleImport(file)}
                                  disabled={downloadingFileId === file.id}
                                  className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md border border-blue-200 transition text-[11px] disabled:opacity-50"
                                  title="从云盘下载并导入当前工作台"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{downloadingFileId === file.id ? '下载中...' : '导入'}</span>
                                </button>

                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                                    title="在 Google Drive 中打开"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  onClick={() => setPendingDeleteFile(file)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                  title="从 Google Drive 删除此文件"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>文件仅在浏览器与 Google Drive 之间直连传输，严格保护工艺单与版单数据隐私</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition"
          >
            关闭
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Operations (Delete) */}
      {pendingDeleteFile && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">确认从 Google Drive 中删除文件？</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  您即将删除以下文件：
                  <span className="block font-semibold text-rose-700 mt-1 font-mono break-all">
                    {pendingDeleteFile.name}
                  </span>
                  此操作不可撤销，文件将被移至废纸篓或从云端永久移除。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPendingDeleteFile(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                取消
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
              >
                {isDeleting ? '正在删除...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
