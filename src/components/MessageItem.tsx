import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Camera, 
  ClipboardCheck, 
  Scale, 
  AlertCircle, 
  Copy, 
  Check, 
  BookMarked,
  User
} from 'lucide-react';
import { ChatMessage, ComplianceStatus } from '../types';
import { CitationCard } from './CitationCard';

interface MessageItemProps {
  message: ChatMessage;
  onViewSourceDoc?: (docCode: string) => void;
}

const statusConfig: Record<
  ComplianceStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  conforme: {
    label: 'Conforme às Normas',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  nao_conforme: {
    label: 'Não Conforme / Irregularidade',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
    icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
  },
  atencao: {
    label: 'Atenção / Exige Adequação',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  informativo: {
    label: 'Parecer Técnico Informativo',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-300',
    icon: <Info className="w-4 h-4 text-blue-600" />,
  },
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, onViewSourceDoc }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopyReport = () => {
    if (!message.analysis) return;
    const reportText = `[PARECER JURÍDICO DA CONSTRUÇÃO CIVIL]
Data: ${new Date(message.timestamp).toLocaleString('pt-BR')}
Veredito: ${message.analysis.verdict}
Status: ${message.analysis.status}

ORIENTAÇÕES PRÁTICAS:
${message.analysis.practicalGuidance.map((g, i) => `${i + 1}. ${g}`).join('\n')}

CITAÇÕES E TRECHOS LEGAIS:
${message.analysis.citations
  .map((c) => `[${c.documentCode} - ${c.articleOrItem}]\n"${c.exactText}"\nInterpretação: ${c.interpretation}\n`)
  .join('\n')}

RISCOS E PENALIDADES:
${message.analysis.risksAndPenalties || 'N/A'}

NORMAS APLICADAS:
${message.analysis.relevantNorms.join(', ')}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-2xl bg-blue-900 text-white rounded-2xl rounded-tr-xs px-5 py-4 shadow-sm space-y-3">
          {message.image && (
            <div className="rounded-xl overflow-hidden border border-blue-800/60 bg-black/20 max-w-sm">
              <img
                src={message.image.dataUrl}
                alt={message.image.name || 'Imagem anexada para consulta'}
                className="w-full max-h-72 object-contain bg-slate-900"
              />
              <div className="p-2 text-xs text-blue-200 flex items-center gap-1.5 bg-blue-950/70">
                <Camera className="w-3.5 h-3.5 text-blue-300" />
                <span className="truncate">{message.image.name || 'Imagem de obra/projeto'}</span>
              </div>
            </div>
          )}
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
          <div className="text-[11px] text-blue-300/80 text-right">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  const analysis = message.analysis;

  return (
    <div className="flex gap-3 sm:gap-4 mb-8">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center text-amber-400 shrink-0 shadow-xs mt-1">
        <Scale className="w-4 h-4" />
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-3xl bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-5 sm:p-6 shadow-xs space-y-5">
        {/* Error state */}
        {message.error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro ao consultar legislação</p>
              <p className="mt-1 text-rose-700">{message.error}</p>
            </div>
          </div>
        )}

        {analysis && (
          <>
            {/* Header / Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    statusConfig[analysis.status]?.bg || 'bg-slate-100'
                  } ${statusConfig[analysis.status]?.text || 'text-slate-800'} ${
                    statusConfig[analysis.status]?.border || 'border-slate-300'
                  }`}
                >
                  {statusConfig[analysis.status]?.icon}
                  {statusConfig[analysis.status]?.label || 'Parecer'}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer"
                title="Copiar parecer jurídico completo"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar Parecer</span>
                  </>
                )}
              </button>
            </div>

            {/* Verdict */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Veredito Técnico e Jurídico
              </h4>
              <p className="text-base font-semibold text-slate-900 leading-snug">
                {analysis.verdict}
              </p>
            </div>

            {/* Visual Observations (if image provided) */}
            {analysis.imageObservations && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>Elementos Técnicos Identificados na Imagem</span>
                </div>
                <p className="text-slate-700 leading-relaxed pl-5">
                  {analysis.imageObservations}
                </p>
              </div>
            )}

            {/* Practical Guidance ("O que se deve fazer") */}
            {analysis.practicalGuidance && analysis.practicalGuidance.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    O Que Se Deve Fazer na Prática (Recomendações)
                  </h4>
                </div>
                <div className="space-y-2 pl-2">
                  {analysis.practicalGuidance.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interleaved Citations with exact quoted text */}
            {analysis.citations && analysis.citations.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-800" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Fundamentação Normativa com Citações Diretas
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {analysis.citations.length} {analysis.citations.length === 1 ? 'trecho citado' : 'trechos citados'}
                  </span>
                </div>

                <div className="space-y-3">
                  {analysis.citations.map((citation, index) => (
                    <CitationCard
                      key={citation.id || index}
                      citation={citation}
                      index={index}
                      onViewSourceDoc={onViewSourceDoc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Risks & Penalties */}
            {analysis.risksAndPenalties && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Riscos Jurídicos e Consequências de Não Conformidade</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                  {analysis.risksAndPenalties}
                </p>
              </div>
            )}

            {/* Applicable Norms Tags */}
            {analysis.relevantNorms && analysis.relevantNorms.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">
                  Normas Referenciadas:
                </span>
                {analysis.relevantNorms.map((norm, nIdx) => (
                  <span
                    key={nIdx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    <BookMarked className="w-3 h-3 text-blue-700" />
                    {norm}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
