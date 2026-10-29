import React, { useState } from 'react';
import { X, Check, Trash2, Move, Type, Sparkles } from 'lucide-react';
import type { AnnotationPill } from '../types.ts';
import { lookupApparelTerm } from '../utils/apparelTerms.ts';

interface AnnotationEditModalProps {
  pill: AnnotationPill | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPill: AnnotationPill) => void;
  onDelete?: (pillId: string) => void;
}

export const AnnotationEditModal: React.FC<AnnotationEditModalProps> = ({
  pill,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen || !pill) return null;

  const [translation, setTranslation] = useState(pill.translation);
  const [fontSize, setFontSize] = useState(pill.fontSize || 10);
  const [placement, setPlacement] = useState(pill.placement);

  const handleApplyTermSuggestion = () => {
    const suggested = lookupApparelTerm(pill.originalText);
    if (suggested) {
      setTranslation(suggested);
    }
  };

  const handleSave = () => {
    onSave({
      ...pill,
      translation,
      fontSize,
      placement,
      edited: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              编辑中英文对照缝隙批注
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Original Text */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              原始外文技术描述 (100% 保持未动)
            </label>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium border border-slate-200 dark:border-slate-700/80">
              {pill.originalText}
            </div>
          </div>

          {/* Chinese Translation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                中文缝隙批注译文 (填入空隙/边框)
              </label>
              <button
                type="button"
                onClick={handleApplyTermSuggestion}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>重新匹配行业词库</span>
              </button>
            </div>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入精准服装技术中文"
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span>字号大小 (标准 9.5-11pt)</span>
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value={9.0}>9.0 pt (紧凑)</option>
                <option value={9.5}>9.5 pt (标准正文)</option>
                <option value={10.0}>10.0 pt (推荐)</option>
                <option value={10.5}>10.5 pt (清晰)</option>
                <option value={11.0}>11.0 pt (标题)</option>
                <option value={12.0}>12.0 pt (醒目)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                <Move className="w-3.5 h-3.5 text-slate-400" />
                <span>候选避让缝隙方向</span>
              </label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="below">正下方空隙 (优先)</option>
                <option value="above">正上方空隙 (次选)</option>
                <option value="right">右侧缝隙 (第三选)</option>
                <option value="margin">外围空白边栏</option>
              </select>
            </div>
          </div>

          {/* Pill Visual Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2">
              实时标签视觉效果 (92%白底 · 细浅蓝边框 · 企业深蓝加粗):
            </span>
            <div className="flex items-center space-x-3">
              <span
                style={{
                  fontSize: `${fontSize}px`,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderColor: '#3b82f6',
                  color: '#0038b8',
                }}
                className="inline-block px-2.5 py-1 font-bold rounded-[2.5px] border shadow-xs"
              >
                {translation || '未输入翻译'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(pill.id);
                onClose();
              }}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除批注</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center space-x-1.5 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存更新</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
