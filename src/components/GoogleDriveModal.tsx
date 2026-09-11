import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderSync, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  HelpCircle,
  Copy,
  Check,
  HardDrive
} from 'lucide-react';
import { DriveFile, DriveStatus } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string;
  onSaveDriveFolderId: (folderId: string) => void;
  driveStatus: DriveStatus | null;
  onRefreshDrive: () => Promise<void>;
  isLoading: boolean;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  onSaveDriveFolderId,
  driveStatus,
  onRefreshDrive,
  isLoading,
}) => {
  const [inputFolder, setInputFolder] = useState(currentFolderId);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    setInputFolder(currentFolderId);
  }, [currentFolderId, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDriveFolderId(inputFolder.trim());
  };

  const handleCopyEnvExample = () => {
    const text = `GOOGLE_DRIVE_FOLDER_ID="${inputFolder.trim() || 'SEU_ID_DA_PASTA_AQUI'}"`;
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const files = driveStatus?.files || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-900">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Banco de Dados no Google Drive
              </h3>
              <p className="text-xs text-slate-500">
                A IA consulta diretamente as leis e NBRs salvas na sua pasta compartilhada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              driveStatus?.configured && files.length > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : driveStatus?.configured
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {driveStatus?.configured && files.length > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm">
              <p className="font-bold">
                {driveStatus?.configured && files.length > 0
                  ? `Google Drive Conectado: ${files.length} arquivo(s) identificado(s)`
                  : driveStatus?.configured
                  ? 'Pasta configurada, porém nenhum arquivo público encontrado'
                  : 'Nenhuma pasta do Google Drive vinculada'}
              </p>
              <p className="mt-1 text-slate-600 leading-relaxed text-xs">
                {driveStatus?.configured && files.length > 0
                  ? 'Durante as consultas do chat, a IA vasculha e cita os arquivos desta pasta compartilhada, gerando vereditos e links diretos.'
                  : 'Cole o link ou ID da pasta pública do Google Drive abaixo para sincronizar.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ID ou Link da Pasta do Google Drive
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputFolder}
                  onChange={(e) => setInputFolder(e.target.value)}
                  placeholder="Ex: 1aBcDeFgHijKlmNoPqrStuVwxYz ou link https://drive.google.com/drive/folders/..."
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-blue-900 font-mono"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={onRefreshDrive}
                  disabled={isLoading}
                  title="Atualizar lista de arquivos da pasta"
                  className="p-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </form>

          {/* Instructions for GitHub deployment and Google Drive sharing */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-900" />
                Como configurar para rodar online via GitHub:
              </span>
              <button
                type="button"
                onClick={handleCopyEnvExample}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded cursor-pointer"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar variável .env</span>
                  </>
                )}
              </button>
            </div>

            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
              <li>
                Coloque os PDFs das NBRs e Códigos de Obras na sua pasta do Google Drive.
              </li>
              <li>
                Clique com o botão direito na pasta no Google Drive &gt; <strong>Compartilhar</strong> &gt; Defina como <strong>"Qualquer pessoa com o link"</strong> no modo <strong>Leitor</strong>.
              </li>
              <li>
                No repositório do GitHub ou servidor onde for hospedar o app, adicione a variável de ambiente:
                <code className="block mt-1 p-2 bg-slate-900 text-amber-300 rounded font-mono text-[11px]">
                  GOOGLE_DRIVE_FOLDER_ID="{inputFolder.trim() || 'ID_DA_PASTA'}"
                </code>
              </li>
            </ol>
          </div>

          {/* Files List in Drive Folder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Arquivos Normativos Encontrados na Pasta ({files.length})
              </label>
            </div>

            {files.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                {driveStatus?.configured
                  ? 'Nenhum arquivo detectado. Verifique se a pasta está compartilhada como "Qualquer pessoa com o link pode ver" e se contém PDFs ou documentos.'
                  : 'Informe o ID ou URL da pasta do Google Drive acima para listar os arquivos.'}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-800 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(file.webViewLink || file.webContentLink) && (
                        <a
                          href={file.webViewLink || file.webContentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir no Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
