import React from 'react';
import { 
  FileText, 
  Table, 
  Mail, 
  BookOpen, 
  Sparkles, 
  Layers,
  HardDrive,
  Cloud
} from 'lucide-react';
import type { AppMode } from '../types.ts';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenGlossary: () => void;
  onOpenGoogleDrive: () => void;
  onOpenGmail: () => void;
  onOpenCloudDrives?: () => void;
  onOpenEmailHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenGlossary,
  onOpenGoogleDrive,
  onOpenGmail,
  onOpenCloudDrives,
  onOpenEmailHub,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-slate-900">
                  TexTrans Pro
                </span>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                  服装外贸版
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500">
                尺寸表公式无损保护 · PDF工艺单同页透明缝隙对照工作台
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0 max-w-[220px] sm:max-w-none">
            <button
              onClick={() => onSelectMode('excel')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentMode === 'excel'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel/尺寸表</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              onClick={() => onSelectMode('pdf')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentMode === 'pdf'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF工艺单</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={() => onSelectMode('email')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                currentMode === 'email'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-flex items-center gap-1">
                <span>评语翻译和处理</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </span>
              <span className="sm:hidden inline-flex items-center gap-0.5">
                <span>评语处理</span>
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              </span>
            </button>
          </nav>

          {/* Right Tools */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => (onOpenEmailHub ? onOpenEmailHub() : onOpenGmail())}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 shadow-xs transition"
              title="打开外贸邮箱工作台 (Gmail、Outlook、企业邮 .EML)"
            >
              <Mail className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">邮箱中心</span>
              <span className="sm:hidden">邮箱</span>
            </button>

            <button
              onClick={() => (onOpenCloudDrives ? onOpenCloudDrives() : onOpenGoogleDrive())}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-xs transition"
              title="打开外贸多网盘中心 (Google Drive、OneDrive、Dropbox、企业直链)"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">网盘中心</span>
              <span className="sm:hidden">网盘</span>
            </button>

            <button
              onClick={onOpenGlossary}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition"
              title="查看300+权威服装行业技术词典"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">术语库 (300+)</span>
              <span className="sm:hidden">词库</span>
            </button>

            <div className="hidden xl:flex items-center space-x-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>公式与排版保护</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
