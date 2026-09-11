import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { LawDocument, DocumentCategory, Jurisdiction } from '../types';
import { extractTextFromPDF } from '../utils/documentStore';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: LawDocument) => void;
}

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf');

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('codigo_obras');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('Municipal');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');

  // PDF specific
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Por favor envie um arquivo no formato PDF.');
      return;
    }

    setErrorMsg(null);
    setPdfFile(file);
    setIsExtracting(true);
    setExtractionStatus('Extraindo texto das páginas do PDF...');

    try {
      const { text, pageCount: pages } = await extractTextFromPDF(file);
      setContent(text);
      setPageCount(pages);

      // Auto-suggest title and code from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (!title) {
        setTitle(`Legislação: ${cleanName}`);
      }
      if (!code) {
        setCode(cleanName.slice(0, 20).toUpperCase());
      }
      if (!summary) {
        setSummary(`Documento legal extraído de ${file.name} com ${pages} páginas.`);
      }

      setExtractionStatus(`Sucesso! ${pages} páginas processadas.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao extrair texto do PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !code.trim() || !content.trim()) {
      setErrorMsg('Por favor preencha o Título, Código/Identificador e o Conteúdo da norma.');
      return;
    }

    const newDoc: LawDocument = {
      id: `custom-doc-${Date.now()}`,
      title: title.trim(),
      code: code.trim(),
      category,
      jurisdiction,
      summary: summary.trim() || `Norma técnica / lei ${code}`,
      content: content.trim(),
      sourceType: activeTab === 'pdf' ? 'pdf_upload' : 'text_input',
      fileName: pdfFile?.name,
      pageCount,
      dateAdded: new Date().toISOString().split('T')[0],
      active: true,
    };

    onAddDocument(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Adicionar Legislação ou Código de Obras
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Suba arquivos PDF ou cole normas municipais e estaduais para consulta da IA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-blue-900 text-blue-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Subir Arquivo PDF
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'border-blue-900 text-blue-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Digitar ou Colar Texto
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Arquivo PDF da Lei / Norma Técnica
              </label>

              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-700 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => e.target.files && e.target.files[0] && handlePdfUpload(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isExtracting}
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <UploadCloud className="w-8 h-8 text-blue-800 mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    Clique para selecionar ou arraste o PDF aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ex: Código de Obras Municipal, Plano Diretor, NBRs específicas
                  </p>
                </div>
              </div>

              {isExtracting && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  <span>{extractionStatus}</span>
                </div>
              )}

              {extractionStatus && !isExtracting && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{extractionStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Metadata inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título do Documento *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Código de Obras de Belo Horizonte - Lei nº 11.181"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código / Sigla de Referência *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: COE-BH ou Lei 11181"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Esfera de Competência
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900 bg-white"
              >
                <option value="Municipal">Municipal (Código de Obras, Plano Diretor)</option>
                <option value="Estadual">Estadual (Corpo de Bombeiros / Sanitário)</option>
                <option value="Federal">Federal (Leis Federais, NRs, Decretos)</option>
                <option value="ABNT">ABNT (Normas Técnicas NBR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900 bg-white"
              >
                <option value="codigo_obras">Código de Obras & Urbanismo</option>
                <option value="acessibilidade">Acessibilidade</option>
                <option value="seguranca_trabalho">Segurança do Trabalho (NRs)</option>
                <option value="estrutural">Estrutural & Guarda-corpos</option>
                <option value="desempenho">Desempenho (NBR 15575)</option>
                <option value="outro">Outra Legislação</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resumo Breve do Documento
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex: Parâmetros de recuo, taxa de ocupação e gabarito predial"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Conteúdo dos Artigos / Itens Normativos *
              </label>
              {content && (
                <span className="text-[11px] text-slate-400">
                  {content.length.toLocaleString('pt-BR')} caracteres
                </span>
              )}
            </div>
            <textarea
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole os artigos da lei, código de obras ou texto da norma técnica aqui..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-900 resize-y"
              required
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isExtracting || !content.trim() || !title.trim()}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Salvar no Banco de Normas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
