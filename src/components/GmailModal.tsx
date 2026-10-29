import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  Send,
  FileCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Inbox,
  Clock,
  User as UserIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../lib/googleAuth.ts';
import {
  listGmailMessages,
  sendGmailMessage,
  createGmailDraft,
  type GmailMessageItem,
} from '../lib/googleGmail.ts';

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmail?: (email: GmailMessageItem) => void;
  // Optional prefilled reply draft to send from modal
  initialDraft?: {
    to?: string;
    subject?: string;
    body?: string;
  };
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  onImportEmail,
  initialDraft,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messages, setMessages] = useState<GmailMessageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('fitting OR comments OR sample OR tech pack');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compose / Send Email state
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [sendTo, setSendTo] = useState<string>('');
  const [sendSubject, setSendSubject] = useState<string>('');
  const [sendBody, setSendBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Mandatory Confirmation Dialog for Destructive / Mutating Operation (Sending Email)
  const [showSendConfirmation, setShowSendConfirmation] = useState<boolean>(false);

  // Initialize auth listener
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

  // When initialDraft is provided, populate compose fields
  useEffect(() => {
    if (initialDraft && isOpen) {
      setSendTo(initialDraft.to || '');
      setSendSubject(initialDraft.subject || '');
      setSendBody(initialDraft.body || '');
      setIsComposeOpen(true);
    }
  }, [initialDraft, isOpen]);

  // Fetch messages
  const fetchMessages = async (currentToken?: string) => {
    const activeTok = currentToken || token;
    if (!activeTok) return;

    setIsLoadingMessages(true);
    setErrorMsg(null);
    try {
      const items = await listGmailMessages(activeTok, {
        query: searchTerm,
        maxResults: 20,
      });
      setMessages(items);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || '读取 Gmail 邮件失败');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchMessages();
    }
  }, [isOpen, token]);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchMessages(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed', err);
      setErrorMsg(err?.message || 'Google 账号登录授权失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setMessages([]);
  };

  // Import email text into Workshop
  const handleImportToApp = (item: GmailMessageItem) => {
    if (onImportEmail) {
      onImportEmail(item);
      onClose();
    }
  };

  // Confirm and send email
  const executeSendEmail = async () => {
    if (!token || !sendTo.trim()) return;
    setIsSending(true);
    setErrorMsg(null);
    try {
      await sendGmailMessage(sendTo, sendSubject, sendBody, token);
      setShowSendConfirmation(false);
      setIsComposeOpen(false);
      setSuccessMsg(`邮件已通过您的 Gmail 成功发送至 ${sendTo}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`发送失败: ${err?.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Save as Gmail draft
  const handleSaveDraft = async () => {
    if (!token) return;
    setIsSending(true);
    setErrorMsg(null);
    try {
      await createGmailDraft(sendTo, sendSubject, sendBody, token);
      setIsComposeOpen(false);
      setSuccessMsg('已成功存入您的 Gmail 草稿箱 (Drafts)');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(`保存草稿失败: ${err?.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900">Gmail 官方外贸邮件工作台</h3>
                <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-1.5 py-0.2 rounded">
                  Workspace 授权
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                实时同步买家评语邮件 · 一键导入解析 · 商务回信直接发送或存入草稿
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

        {/* Auth Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          {user ? (
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-slate-300" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-900 block">{user.displayName || 'Google 用户'}</span>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 flex items-center space-x-1.5">
              <span>当前尚未连接 Gmail 邮箱</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {user && (
              <button
                onClick={() => setIsComposeOpen(true)}
                className="flex items-center space-x-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border border-red-200 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>撰写新邮件</span>
              </button>
            )}

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出</span>
              </button>
            ) : (
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
                <span>{isLoggingIn ? '正在授权...' : '使用 Google 账号登录并连接 Gmail'}</span>
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

          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <Mail className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">请先连接您的 Gmail 邮箱</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                登录授权后，可直接从您的收件箱调取客供试衣评语邮件，或将 AI 生成的商务回信一键直接发回给买家。
              </p>
            </div>
          ) : isComposeOpen ? (
            /* Compose Email Form */
            <div className="flex-1 flex flex-col space-y-3 overflow-y-auto p-1">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center space-x-1.5">
                  <Send className="w-4 h-4 text-red-600" />
                  <span>撰写 / 发送国际商务回信</span>
                </h4>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  返回收件箱
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  收件人邮箱 (To):
                </label>
                <input
                  type="email"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="例如: buyer@brand.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  邮件主题 (Subject):
                </label>
                <input
                  type="text"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                  placeholder="[Action Confirmed] Style #..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  邮件正文 (Body):
                </label>
                <textarea
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  placeholder="Dear Buyer..."
                  className="flex-1 min-h-[180px] w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSending || !sendSubject.trim()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition disabled:opacity-50"
                >
                  保存为 Gmail 草稿
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsComposeOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => setShowSendConfirmation(true)}
                    disabled={isSending || !sendTo.trim() || !sendSubject.trim()}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>通过 Gmail 发送邮件</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Email List View */
            <>
              {/* Search Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
                    placeholder="按关键词、发件人或款号搜索邮件..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setSearchTerm('fitting OR comments OR sample');
                      fetchMessages();
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition"
                  >
                    试穿评语
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm('tech pack OR spec sheet');
                      fetchMessages();
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition"
                  >
                    技术规格单
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      fetchMessages();
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition"
                  >
                    全部收件
                  </button>

                  <button
                    onClick={() => fetchMessages()}
                    disabled={isLoadingMessages}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin text-red-600' : ''}`} />
                    <span>刷新</span>
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {isLoadingMessages ? (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-red-600" />
                    <span>正在同步 Gmail 邮件...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 space-y-1">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <span>未找到匹配的邮件，可调整上方搜索词重试</span>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 hover:bg-slate-50/80 transition flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900 truncate max-w-sm">
                            {msg.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                          <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{msg.from}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                          {msg.snippet}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center space-x-2">
                        <button
                          onClick={() => handleImportToApp(msg)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 transition text-xs shadow-xs"
                          title="将此邮件导入评语翻译与技术分析工作台"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>导入分析</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>邮件由 Gmail 官方 API 直连通信，严格保障商业贸易机密</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition"
          >
            关闭
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive / Mutating Operation (Send Email) */}
      {showSendConfirmation && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">确认通过 Gmail 发送邮件？</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  系统将代表您的 Google 账号发送以下邮件：
                </p>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
                  <div><strong>收件人:</strong> {sendTo}</div>
                  <div className="truncate"><strong>主题:</strong> {sendSubject}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSendConfirmation(false)}
                disabled={isSending}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                取消
              </button>
              <button
                onClick={executeSendEmail}
                disabled={isSending}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
              >
                {isSending ? '正在发送...' : '确认发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
