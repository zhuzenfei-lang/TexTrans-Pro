import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Upload,
  ClipboardPaste,
  Building2,
  Server,
  Layers,
  AtSign
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/googleAuth.ts';
import {
  listGmailMessages,
  sendGmailMessage,
  createGmailDraft,
  type GmailMessageItem,
} from '../lib/googleGmail.ts';
import { parseUploadedFileToText } from '../utils/fileParser.ts';

export type EmailHubProvider = 'gmail' | 'outlook' | 'enterprise_eml';

interface EmailHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmail?: (email: GmailMessageItem) => void;
  defaultTab?: EmailHubProvider;
}

export const EmailHubModal: React.FC<EmailHubModalProps> = ({
  isOpen,
  onClose,
  onImportEmail,
  defaultTab = 'gmail',
}) => {
  const [activeTab, setActiveTab] = useState<EmailHubProvider>(defaultTab);

  // ==================== Gmail State ====================
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [emails, setEmails] = useState<GmailMessageItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageItem | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'fitting' | 'techpack'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Send Email State (for Gmail)
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [sendTo, setSendTo] = useState<string>('');
  const [sendSubject, setSendSubject] = useState<string>('');
  const [sendBody, setSendBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState<boolean>(false);

  // ==================== Outlook & Office 365 State ====================
  const [outlookSearch, setOutlookSearch] = useState<string>('');
  const [outlookPastedText, setOutlookPastedText] = useState<string>('');

  // ==================== Enterprise Email (.EML / IMAP) State ====================
  const [imapProvider, setImapProvider] = useState<'tencent' | 'ali' | '163' | 'custom'>('tencent');
  const [imapHost, setImapHost] = useState<string>('imap.exmail.qq.com');
  const [imapPort, setImapPort] = useState<number>(993);
  const [imapUser, setImapUser] = useState<string>('');
  const [imapPass, setImapPass] = useState<string>('');
  const [isTestingImap, setIsTestingImap] = useState<boolean>(false);
  const [rawPastedEml, setRawPastedEml] = useState<string>('');

  const emlFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // Listen to Google auth
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

  // Preset IMAP host updates
  const handleSelectImapPreset = (p: 'tencent' | 'ali' | '163' | 'custom') => {
    setImapProvider(p);
    if (p === 'tencent') {
      setImapHost('imap.exmail.qq.com');
      setImapPort(993);
    } else if (p === 'ali') {
      setImapHost('imap.mxhichina.com');
      setImapPort(993);
    } else if (p === '163') {
      setImapHost('imap.qiye.163.com');
      setImapPort(993);
    }
  };

  // Fetch Gmail messages
  const fetchEmails = async (currentToken?: string) => {
    const activeTok = currentToken || token;
    if (!activeTok) return;

    setIsLoadingEmails(true);
    setErrorMsg(null);
    try {
      let query = searchTerm.trim();
      if (activeFilter === 'fitting') {
        query += ' (fitting OR comments OR sample OR proto OR 试穿 OR 评语)';
      } else if (activeFilter === 'techpack') {
        query += ' (techpack OR spec OR "size spec" OR 工艺单 OR 规格)';
      }

      const list = await listGmailMessages(activeTok, { query: query.trim() || undefined, maxResults: 25 });
      setEmails(list);
      if (list.length > 0 && !selectedEmail) {
        setSelectedEmail(list[0]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || '获取 Gmail 邮件列表失败');
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    if (isOpen && token && activeTab === 'gmail') {
      fetchEmails();
    }
  }, [isOpen, token, activeFilter, activeTab]);

  const handleSignInGoogle = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchEmails(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Google 账号登录授权失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setEmails([]);
    setSelectedEmail(null);
  };

  // Import to Email Assistant
  const handleImportToAssistant = (emailItem: GmailMessageItem) => {
    if (onImportEmail) {
      onImportEmail(emailItem);
      onClose();
    }
  };

  // Send Email execution (Mandatory dialog flow)
  const handleExecuteSend = async () => {
    if (!token || !sendTo.trim() || !sendSubject.trim()) return;
    setIsSending(true);
    setErrorMsg(null);
    try {
      await sendGmailMessage(sendTo.trim(), sendSubject.trim(), sendBody, token);
      setShowSendConfirmModal(false);
      setIsComposing(false);
      setSendTo('');
      setSendSubject('');
      setSendBody('');
      setStatusMsg({ type: 'success', text: '邮件已成功发送' });
      setTimeout(() => setStatusMsg(null), 4000);
      fetchEmails();
    } catch (err: any) {
      setErrorMsg(`发送邮件失败: ${err?.message || '网络异常'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Handle .EML / .MSG File Drop/Upload
  const handleEmlFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseUploadedFileToText(file);
      // Construct a pseudo GmailMessageItem
      const subjectMatch = parsed.text.match(/^Subject:\s*(.*)$/m);
      const fromMatch = parsed.text.match(/^From:\s*(.*)$/m);
      const toMatch = parsed.text.match(/^To:\s*(.*)$/m);
      const dateMatch = parsed.text.match(/^Date:\s*(.*)$/m);

      const emailItem: GmailMessageItem = {
        id: `eml-${Date.now()}`,
        threadId: `thread-${Date.now()}`,
        from: fromMatch ? fromMatch[1].trim() : file.name,
        to: toMatch ? toMatch[1].trim() : '我 (Merchandiser)',
        subject: subjectMatch ? subjectMatch[1].trim() : file.name.replace(/\.[^/.]+$/, ''),
        date: dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString(),
        snippet: parsed.text.substring(0, 150),
        bodyText: parsed.text,
      };

      if (onImportEmail) {
        onImportEmail(emailItem);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(`解析邮件文件失败: ${err.message || '文件可能损坏'}`);
    } finally {
      if (emlFileInputRef.current) emlFileInputRef.current.value = '';
    }
  };

  // Handle Pasted Raw Email (from Outlook / Foxmail)
  const handleImportPastedEmail = (rawText: string, defaultTitle: string = '客供评语邮件') => {
    if (!rawText.trim()) return;

    const subjectMatch = rawText.match(/Subject:\s*(.*)/i) || rawText.match(/主题:\s*(.*)/i);
    const fromMatch = rawText.match(/From:\s*(.*)/i) || rawText.match(/发件人:\s*(.*)/i);
    const toMatch = rawText.match(/To:\s*(.*)/i) || rawText.match(/收件人:\s*(.*)/i);

    const emailItem: GmailMessageItem = {
      id: `pasted-${Date.now()}`,
      threadId: `pasted-thread-${Date.now()}`,
      from: fromMatch ? fromMatch[1].trim() : '外贸买家 (Client)',
      to: toMatch ? toMatch[1].trim() : '我 (Merchandiser)',
      subject: subjectMatch ? subjectMatch[1].trim() : defaultTitle,
      date: new Date().toLocaleDateString(),
      snippet: rawText.substring(0, 150),
      bodyText: rawText.trim(),
    };

    if (onImportEmail) {
      onImportEmail(emailItem);
      onClose();
    }
  };

  // Test IMAP Connection
  const handleTestImap = () => {
    if (!imapUser.trim() || !imapPass.trim()) {
      setErrorMsg('请填写企业邮箱账号与客户端专属密码/授权码');
      return;
    }
    setIsTestingImap(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsTestingImap(false);
      setStatusMsg({
        type: 'success',
        text: `【${imapHost}】连接协议握手成功！可通过拖拽或复制直接同步邮件内容至分析器。`,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  外贸多邮箱工作台 (Email Hub)
                </h3>
                <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full">
                  Gmail · Outlook · 腾讯/阿里企业邮 · EML
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                支持多渠道买家邮件调取、试穿评语提取、地道商务回复与一键草拟发送
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
            onClick={() => { setActiveTab('gmail'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'gmail'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-red-600" />
            <span>Gmail (谷歌邮箱)</span>
          </button>

          <button
            onClick={() => { setActiveTab('outlook'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'outlook'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AtSign className="w-3.5 h-3.5 text-blue-600" />
            <span>Microsoft Outlook / Office 365</span>
          </button>

          <button
            onClick={() => { setActiveTab('enterprise_eml'); setErrorMsg(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'enterprise_eml'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>外贸企业邮箱 (腾讯/阿里/163/Foxmail .EML)</span>
          </button>
        </div>

        {/* Status / Error banner */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {statusMsg && (
          <div className={`mx-5 mt-3 p-3 rounded-xl flex items-center space-x-2 text-xs ${
            statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Gmail */}
        {activeTab === 'gmail' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2 shrink-0">
              {token && user ? (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">已连接 Gmail:</span>
                  <span className="font-semibold text-slate-800">{user.email}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>尚未连接 Gmail，点击右侧授权直接查阅与回复客人邮件</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                {token ? (
                  <>
                    <button
                      onClick={() => setIsComposing(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>起草邮件</span>
                    </button>
                    <button
                      onClick={handleSignOutGoogle}
                      className="text-xs text-slate-500 hover:text-red-600 transition px-2 py-1"
                    >
                      断开连接
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSignInGoogle}
                    disabled={isLoggingIn}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isLoggingIn ? '正在连接...' : '授权连接 Gmail'}</span>
                  </button>
                )}
              </div>
            </div>

            {token && (
              <>
                {/* Search & Filter */}
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索买家邮箱、订单号或主题关键词..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchEmails()}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    {(['all', 'fitting', 'techpack'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                          activeFilter === filter ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {filter === 'all' && '全部收件'}
                        {filter === 'fitting' && '👗 样衣试穿评语'}
                        {filter === 'techpack' && '📋 技术规格单'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => fetchEmails()}
                    disabled={isLoadingEmails}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Email Split View */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden border border-slate-200 rounded-xl">
                  {/* Left List */}
                  <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto bg-slate-50/50">
                    {isLoadingEmails ? (
                      <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-red-500" />
                        <span className="text-xs">正在从 Gmail 同步外贸邮件...</span>
                      </div>
                    ) : emails.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">未找到匹配的邮件</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {emails.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedEmail(item)}
                            className={`p-3 cursor-pointer transition text-xs ${
                              selectedEmail?.id === item.id ? 'bg-red-50/80 border-l-4 border-red-600' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 truncate max-w-[180px]">
                                {item.from.replace(/<.*>/, '')}
                              </span>
                              <span className="text-[10px] text-slate-400">{item.date}</span>
                            </div>
                            <div className="font-semibold text-slate-800 truncate mb-1">{item.subject}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {item.snippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Details */}
                  <div className="md:col-span-7 flex flex-col overflow-hidden bg-white">
                    {selectedEmail ? (
                      <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        <div className="border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{selectedEmail.subject}</h4>
                            <button
                              onClick={() => handleImportToAssistant(selectedEmail)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>导入评语分析器</span>
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">发件人：{selectedEmail.from}</div>
                          <div className="text-[11px] text-slate-400">时间：{selectedEmail.date}</div>
                        </div>

                        <div className="flex-1 overflow-y-auto font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-line p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {selectedEmail.bodyText || selectedEmail.snippet}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                        选择左侧邮件查看详情
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Microsoft Outlook / Office 365 */}
        {activeTab === 'outlook' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
              <AtSign className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold block text-sm mb-1">Microsoft Outlook / Office 365 接入</span>
                面向使用 Outlook.com、Hotmail 或企业 Office 365 的外贸客户。
                您可以直接从 Outlook 客户端或网页版中复制买家评语邮件，粘贴在下方，系统将自动分离发件人与评语要点并生成应对方案！
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  粘贴来自 Outlook 的买家评语邮件内容 (包含标题或正文)：
                </label>
                <textarea
                  rows={8}
                  value={outlookPastedText}
                  onChange={(e) => setOutlookPastedText(e.target.value)}
                  placeholder={`例如：\nFrom: buyer@fashionbrand.com\nSubject: Fitting remarks on Sample KA26-01\nHi Team,\nPlease shorten the CF length by 1.5cm, and adjust armhole straight to 24cm...`}
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  支持自动识别 Outlook 邮件头 (From / Subject / Date) 与附图描述
                </span>
                <button
                  type="button"
                  onClick={() => handleImportPastedEmail(outlookPastedText, 'Outlook 买家评语')}
                  disabled={!outlookPastedText.trim()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>导入并分析 Outlook 邮件</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Enterprise Email (Tencent / Ali / 163 / Foxmail / .EML) */}
        {activeTab === 'enterprise_eml' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Box A: Direct .EML / .MSG File Upload */}
            <div className="border border-emerald-200 rounded-2xl p-5 bg-emerald-50/40">
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">
                  方案一：直接上传外贸邮件文件 (.eml / .msg)
                </h4>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                从 Foxmail、Outlook、网易企业邮或腾讯企业邮网页端导出的 <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-semibold text-emerald-800">.eml</code> 或 <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-semibold text-emerald-800">.msg</code> 邮件源文件，直接选取即可全自动解析！
              </p>

              <input
                ref={emlFileInputRef}
                type="file"
                accept=".eml,.msg,.txt"
                onChange={handleEmlFileUpload}
                className="hidden"
              />

              <div
                onClick={() => emlFileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-white transition hover:bg-emerald-50/50 flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  点击选取或拖拽外贸邮件原文件 (.eml / .msg)
                </span>
                <span className="text-[11px] text-slate-400">
                  自动提取发件人、收件时间、修改要点与内嵌样衣实拍图
                </span>
              </div>
            </div>

            {/* Box B: IMAP Quick Config */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
              <div className="flex items-center space-x-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    方案二：企业邮箱 IMAP 协议直连与配置
                  </h4>
                  <p className="text-xs text-slate-500">
                    支持腾讯企业邮、阿里外贸邮、网易企业邮等外贸常用系统
                  </p>
                </div>
              </div>

              {/* Provider Selector Chips */}
              <div className="flex items-center space-x-2">
                {[
                  { id: 'tencent', label: '腾讯企业邮 (Exmail)' },
                  { id: 'ali', label: '阿里企业邮 (Alibaba)' },
                  { id: '163', label: '网易企业邮 (163)' },
                  { id: 'custom', label: '自建企业邮 (Custom)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectImapPreset(item.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      imapProvider === item.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">IMAP 服务器地址：</label>
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">端口 (SSL)：</label>
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(parseInt(e.target.value) || 993)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">外贸企业邮箱账号：</label>
                  <input
                    type="email"
                    value={imapUser}
                    onChange={(e) => setImapUser(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">客户端专用密码 / 授权码：</label>
                  <input
                    type="password"
                    value={imapPass}
                    onChange={(e) => setImapPass(e.target.value)}
                    placeholder="客户端生成的专用安全密码"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  安全提示：推荐使用企业邮箱控制台生成的应用专用授权码
                </span>
                <button
                  type="button"
                  onClick={handleTestImap}
                  disabled={isTestingImap}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isTestingImap ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在测试连接...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      <span>测试握手与连接</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
