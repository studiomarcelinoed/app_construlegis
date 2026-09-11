import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  BookOpen, 
  Trash2, 
  Check, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  SlidersHorizontal,
  ExternalLink,
  Layers,
  FolderSync
} from 'lucide-react';
import { LawDocument, DocumentCategory, DriveStatus } from '../types';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: LawDocument[];
  driveStatus?: DriveStatus | null;
  onToggleActive: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onOpenNewDocModal: () => void;
  onViewDocument: (doc: LawDocument) => void;
  onOpenDriveSettings?: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  documents,
  driveStatus,
  onToggleActive,
  onDeleteDocument,
  onOpenNewDocModal,
  onViewDocument,
  onOpenDriveSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeCount = documents.filter((d) => d.active).length;
  const driveFiles = driveStatus?.files || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-900" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Banco de Legislação & Normas Técnicas
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeCount} normas no banco local + {driveFiles.length} arquivos na pasta do Google Drive
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDriveSettings && (
              <button
                type="button"
                onClick={onOpenDriveSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
              >
                <FolderSync className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Google Drive ({driveFiles.length})</span>
                <span className="sm:hidden">Drive</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenNewDocModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Lei/PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Google Drive Status Bar inside modal */}
        {driveStatus && driveStatus.configured && (
          <div className="bg-emerald-50/80 px-5 py-2.5 border-b border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <FolderSync className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Pasta Google Drive ativa com <strong>{driveFiles.length} documento(s)</strong> para consulta direta da IA.
              </span>
            </div>
            {onOpenDriveSettings && (
              <button
                type="button"
                onClick={onOpenDriveSettings}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Ver Arquivos do Drive
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por norma, código de obras, artigo ou palavra-chave..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Todas as Normas' },
              { id: 'acessibilidade', label: 'Acessibilidade' },
              { id: 'codigo_obras', label: 'Código de Obras' },
              { id: 'seguranca_trabalho', label: 'Segurança (NRs)' },
              { id: 'estrutural', label: 'Estrutural / Guarda-corpo' },
              { id: 'desempenho', label: 'Desempenho' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Documents */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-slate-50/50">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhuma norma ou lei encontrada para o filtro informado.
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-xl border transition-all bg-white shadow-2xs ${
                  doc.active
                    ? 'border-blue-200'
                    : 'border-slate-200 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900">
                        {doc.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        Esfera: {doc.jurisdiction}
                      </span>
                      {doc.pageCount && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {doc.pageCount} pág.
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {doc.sourceType === 'built_in' ? 'Integrado' : 'Carregado'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                      {doc.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {doc.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(doc.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                        doc.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={doc.active ? 'Desativar da busca da IA' : 'Ativar para consulta da IA'}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${doc.active ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{doc.active ? 'Ativo na IA' : 'Inativo'}</span>
                    </button>

                    {/* View full content */}
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Ver Texto</span>
                    </button>

                    {/* Delete custom doc */}
                    {doc.sourceType !== 'built_in' && (
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir documento do banco próprio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredDocs.length} documentos listados</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
