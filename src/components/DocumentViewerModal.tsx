import React, { useState } from 'react';
import { X, Search, Copy, Check, BookOpen, Layers, Calendar, Tag } from 'lucide-react';
import { LawDocument } from '../types';

interface DocumentViewerModalProps {
  document: LawDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(document.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split text for basic search highlighting if requested
  const renderContent = () => {
    if (!searchTerm.trim()) {
      return (
        <pre className="font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
          {document.content}
        </pre>
      );
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = document.content.split(regex);

    return (
      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-300 text-slate-900 rounded-xs px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                {document.code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                {document.jurisdiction}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                {document.category}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {document.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              {document.summary}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Localizar artigo ou termo..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-800"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Texto Integral</span>
              </>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Origem: {document.sourceType === 'built_in' ? 'Norma Padrão Integrada' : 'Documento Carregado pelo Usuário'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
