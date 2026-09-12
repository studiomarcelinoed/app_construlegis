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
      <div className="flex justify-end mb-4 sm:mb-6 w-full max-w-full">
        <div className="max-w-[90%] sm:max-w-2xl bg-blue-900 text-white rounded-2xl rounded-tr-xs px-3.5 sm:px-5 py-3 sm:py-4 shadow-sm space-y-2.5 sm:space-y-3 break-words overflow-hidden">
          {message.image && (
            <div className="rounded-xl overflow-hidden border border-blue-800/60 bg-black/20 max-w-full">
              <img
                src={message.image.dataUrl}
                alt={message.image.name || 'Imagem anexada para consulta'}
                className="w-full max-h-60 sm:max-h-72 object-contain bg-slate-900"
              />
              <div className="p-2 text-xs text-blue-200 flex items-center gap-1.5 bg-blue-950/70 truncate">
                <Camera className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span className="truncate">{message.image.name || 'Imagem de obra/projeto'}</span>
              </div>
            </div>
          )}
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>
          <div className="text-[10px] sm:text-[11px] text-blue-300/80 text-right">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  const analysis = message.analysis;

  return (
    <div className="flex gap-2 sm:gap-4 mb-5 sm:mb-8 w-full max-w-full min-w-0">
      {/* Avatar */}
      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center text-amber-400 shrink-0 shadow-xs mt-0.5 sm:mt-1">
        <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>

      {/* Main Container */}
      <div className="flex-1 min-w-0 max-w-full sm:max-w-3xl bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 sm:p-6 shadow-xs space-y-4 sm:space-y-5 overflow-hidden break-words">
        {/* Error state */}
        {message.error && (() => {
          let displayError = message.error;
          // Se for string JSON bruto, faz parse para extrair a mensagem amigável
          if (typeof displayError === 'string' && displayError.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(displayError);
              if (parsed.error?.message) {
                displayError = parsed.error.message;
              } else if (typeof parsed.error === 'string') {
                displayError = parsed.error;
              } else if (parsed.message) {
                displayError = parsed.message;
              }
            } catch {
              // fallback
            }
          }

          const isOverloaded =
            displayError.includes('sobrecarregado') ||
            displayError.includes('503') ||
            displayError.includes('UNAVAILABLE') ||
            displayError.includes('high demand') ||
            displayError.includes('indisponível');

          if (isOverloaded) {
            displayError = 'O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.';
          }

          return (
            <div className={`p-3 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 sm:gap-3 break-words ${
              isOverloaded 
                ? 'bg-amber-50 border-amber-200 text-amber-900' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                isOverloaded ? 'text-amber-600' : 'text-rose-600'
              }`} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {isOverloaded ? 'Serviço da IA Sobrecarregado' : 'Erro ao consultar legislação'}
                </p>
                <p className={`mt-1 leading-relaxed break-words ${
                  isOverloaded ? 'text-amber-800' : 'text-rose-700'
                }`}>
                  {displayError}
                </p>
              </div>
            </div>
          );
        })()}

        {analysis && (
          <>
            {/* Header / Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold border truncate ${
                    statusConfig[analysis.status]?.bg || 'bg-slate-100'
                  } ${statusConfig[analysis.status]?.text || 'text-slate-800'} ${
                    statusConfig[analysis.status]?.border || 'border-slate-300'
                  }`}
                >
                  {statusConfig[analysis.status]?.icon}
                  <span className="truncate">{statusConfig[analysis.status]?.label || 'Parecer'}</span>
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 shrink-0">
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer shrink-0"
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
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Verdict */}
            <div className="space-y-1 break-words">
              <h4 className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Veredito Técnico e Jurídico
              </h4>
              <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug break-words">
                {analysis.verdict}
              </p>
            </div>

            {/* Visual Observations (if image provided) */}
            {analysis.imageObservations && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1 break-words">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Camera className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Elementos Técnicos Identificados na Imagem</span>
                </div>
                <p className="text-slate-700 leading-relaxed pl-1 sm:pl-5 break-words">
                  {analysis.imageObservations}
                </p>
              </div>
            )}

            {/* Practical Guidance ("O que se deve fazer") */}
            {analysis.practicalGuidance && analysis.practicalGuidance.length > 0 && (
              <div className="space-y-2 sm:space-y-2.5 break-words">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                    O Que Se Deve Fazer na Prática (Recomendações)
                  </h4>
                </div>
                <div className="space-y-1.5 sm:space-y-2 pl-1 sm:pl-2">
                  {analysis.practicalGuidance.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed break-words">
                      <span className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="break-words">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interleaved Citations with exact quoted text */}
            {analysis.citations && analysis.citations.length > 0 && (
              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2 w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Scale className="w-4 h-4 text-blue-800 shrink-0" />
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                      Fundamentação Normativa com Citações Diretas
                    </h4>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {analysis.citations.length} {analysis.citations.length === 1 ? 'citação' : 'citações'}
                  </span>
                </div>

                <div className="space-y-2.5 sm:space-y-3 w-full max-w-full">
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
              <div className="p-3 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-1.5 break-words">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Riscos Jurídicos e Consequências</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed break-words">
                  {analysis.risksAndPenalties}
                </p>
              </div>
            )}

            {/* Applicable Norms Tags */}
            {analysis.relevantNorms && analysis.relevantNorms.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase mr-1">
                  Normas:
                </span>
                {analysis.relevantNorms.map((norm, nIdx) => (
                  <span
                    key={nIdx}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors truncate max-w-full"
                  >
                    <BookMarked className="w-3 h-3 text-blue-700 shrink-0" />
                    <span className="truncate">{norm}</span>
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
