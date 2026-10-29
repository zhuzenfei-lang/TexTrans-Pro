import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Download, BookOpen } from 'lucide-react';
import { APPAREL_DICTIONARY, GARMENT_ABBREVIATIONS } from '../utils/apparelTerms.ts';
import type { TermEntry } from '../types.ts';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customTerms, setCustomTerms] = useState<TermEntry[]>(() => {
    try {
      const saved = localStorage.getItem('textrans_custom_terms');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEn, setNewEn] = useState('');
  const [newZh, setNewZh] = useState('');
  const [newCat, setNewCat] = useState<'pom' | 'fabric' | 'sewing' | 'trim' | 'defect'>('pom');

  const allTerms = useMemo(() => {
    return [...customTerms, ...APPAREL_DICTIONARY];
  }, [customTerms]);

  const filteredTerms = useMemo(() => {
    return allTerms.filter(item => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.en.toLowerCase().includes(q) ||
        item.zh.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allTerms, activeCategory, search]);

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEn.trim() || !newZh.trim()) return;
    const added: TermEntry = {
      en: newEn.trim().toUpperCase(),
      zh: newZh.trim(),
      category: newCat,
      notes: '自定义工厂术语'
    };
    const updated = [added, ...customTerms];
    setCustomTerms(updated);
    try {
      localStorage.setItem('textrans_custom_terms', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setNewEn('');
    setNewZh('');
    setShowAddForm(false);
  };

  const handleExportCSV = () => {
    const csvContent =
      'English,Chinese,Category,Notes\n' +
      allTerms.map(t => `"${t.en}","${t.zh}","${t.category}","${t.notes || ''}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Apparel_Technical_Glossary_中英文服装工程词库.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const categories = [
    { id: 'all', label: '全部术语' },
    { id: 'pom', label: '部位尺寸 (POM)' },
    { id: 'fabric', label: '面料与水洗 (Fabric)' },
    { id: 'sewing', label: '车缝工艺 (Sewing)' },
    { id: 'trim', label: '辅料印花 (Trims)' },
    { id: 'defect', label: '公差疵点 (Quality)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                服装工程中英文技术词典库 (300+ 权威收录)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                专精 Tech Pack 工艺制单、测量部位、车缝针法、辅料五金及外贸公差标准
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="导出CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出词典</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Categories */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索英文术语、中文对照 (如: HPS, 1/2 CHEST, French Terry, Overlock, 打枣)..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加工厂自定义词</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  activeCategory === c.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Add custom term form dropdown */}
          {showAddForm && (
            <form onSubmit={handleAddTerm} className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="英文术语 (如: 1/4 INCH DTM)"
                className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                required
              />
              <input
                type="text"
                value={newZh}
                onChange={(e) => setNewZh(e.target.value)}
                placeholder="中文对照 (如: 1/4英寸同色压线)"
                className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                required
              />
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
              >
                <option value="pom">部位尺寸 (POM)</option>
                <option value="fabric">面料 (Fabric)</option>
                <option value="sewing">车缝 (Sewing)</option>
                <option value="trim">辅料 (Trims)</option>
                <option value="defect">公差 (Defect)</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                立即加入
              </button>
            </form>
          )}
        </div>

        {/* Garment Abbreviations Quick Bar */}
        <div className="px-6 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center space-x-3 overflow-x-auto text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">常用缩写:</span>
          {Object.entries(GARMENT_ABBREVIATIONS).slice(0, 8).map(([abbr, exp]) => (
            <span key={abbr} className="whitespace-nowrap bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              <strong className="text-blue-600 dark:text-blue-400">{abbr}</strong>: {exp.split(' ')[0]}
            </span>
          ))}
        </div>

        {/* Terms List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-4 w-1/3">英文专业技术术语 (English)</th>
                  <th className="py-2.5 px-4 w-1/3">中文行业权威译名 (Chinese)</th>
                  <th className="py-2.5 px-4 w-28">分类 (Category)</th>
                  <th className="py-2.5 px-4">工艺注释 (Remarks)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredTerms.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition group"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {item.en}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-blue-700 dark:text-blue-400">
                      {item.zh}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>当前显示 {filteredTerms.length} 条专业技术词汇</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
