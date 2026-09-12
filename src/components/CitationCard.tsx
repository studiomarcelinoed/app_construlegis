import React, { useState } from 'react';
import { Quote, BookOpen, ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react';
import { Citation } from '../types';

interface CitationCardProps {
  citation: Citation;
  index: number;
  onViewSourceDoc?: (docCode: string) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  index,
  onViewSourceDoc,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `[${citation.documentCode} - ${citation.articleOrItem}]\n"${citation.exactText}"\nInterpretação: ${citation.interpretation}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`citation-card-${citation.id || index}`}
      className="rounded-xl border border-blue-200/90 bg-gradient-to-b from-blue-50/50 to-white shadow-xs overflow-hidden transition-all duration-200 w-full max-w-full"
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-900/[0.04] border-b border-blue-100 cursor-pointer hover:bg-blue-900/[0.07] transition-colors gap-2"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-900 text-white text-[10px] sm:text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0 truncate">
            <span className="text-[11px] sm:text-xs font-bold text-blue-950 uppercase tracking-wide">
              {citation.documentCode}
            </span>
            <span className="text-slate-400 mx-1">•</span>
            <span className="text-[11px] sm:text-xs font-semibold text-blue-800 truncate">
              {citation.articleOrItem}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar citação legal"
            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {citation.sourceDriveLink && (
            <a
              href={citation.sourceDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Abrir arquivo original na pasta do Google Drive"
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Drive</span>
            </a>
          )}
          {onViewSourceDoc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewSourceDoc(citation.documentCode);
              }}
              title="Abrir norma original no banco"
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100/80 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Norma</span>
            </button>
          )}
          <span className="text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 sm:p-4 space-y-3 text-sm break-words overflow-hidden">
          {/* Exact quoted text from the law */}
          <div className="relative pl-3 pr-2.5 sm:pl-3.5 sm:pr-3 py-2 sm:py-2.5 rounded-lg bg-amber-50/60 border-l-4 border-amber-600/80 text-slate-800 font-serif leading-relaxed text-xs sm:text-[13px] break-words">
            <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/50 absolute top-2 right-2 pointer-events-none" />
            <p className="italic font-medium break-words">"{citation.exactText}"</p>
          </div>

          {/* Practical interpretation */}
          <div className="text-slate-700 leading-relaxed text-xs sm:text-sm break-words">
            <span className="font-semibold text-slate-900 mr-1.5">Interpretação Técnica:</span>
            {citation.interpretation}
          </div>

          {/* Actionable implication */}
          {citation.practicalImplication && (
            <div className="flex items-start gap-2 pt-2 border-t border-slate-100 text-xs sm:text-[13px] text-emerald-900 bg-emerald-50/40 p-2 sm:p-2.5 rounded-md break-words">
              <span className="font-bold text-emerald-800 shrink-0">O que se deve fazer:</span>
              <span className="break-words">{citation.practicalImplication}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
