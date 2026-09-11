import React from 'react';
import { Scale, BookOpen, HardHat, ShieldCheck, Plus, Sparkles, FolderSync } from 'lucide-react';
import { LawDocument, DriveStatus } from '../types';

interface HeaderProps {
  documents: LawDocument[];
  driveStatus: DriveStatus | null;
  onOpenDocManager: () => void;
  onOpenNewDocModal: () => void;
  onOpenDriveSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  documents,
  driveStatus,
  onOpenDocManager,
  onOpenNewDocModal,
  onOpenDriveSettings,
}) => {
  const activeCount = documents.filter((d) => d.active).length;
  const driveFilesCount = driveStatus?.files?.length || 0;
  const isDriveConfigured = driveStatus?.configured;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center text-amber-400 shadow-md shadow-blue-950/10 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Legislação da Construção Civil
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Confiabilidade Jurídica
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              Consulta técnica de NBRs (9050, 14718, 15575), Códigos de Obras, NR-18 e Direito de Vizinhança
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Google Drive Status Button */}
          <button
            id="btn-google-drive"
            onClick={onOpenDriveSettings}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isDriveConfigured && driveFilesCount > 0
                ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-300'
                : isDriveConfigured
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-blue-50 hover:bg-blue-100/80 text-blue-900 border-blue-200'
            }`}
            title="Configurar ou verificar pasta do Google Drive com as leis e NBRs"
          >
            <FolderSync className="w-4 h-4 text-blue-900" />
            <span className="hidden lg:inline">Google Drive:</span>
            <span>
              {isDriveConfigured && driveFilesCount > 0
                ? `${driveFilesCount} leis`
                : isDriveConfigured
                ? 'Conectado'
                : 'Conectar Drive'}
            </span>
          </button>

          <button
            id="btn-open-db"
            onClick={onOpenDocManager}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
            title="Ver e gerenciar banco de normas e leis"
          >
            <BookOpen className="w-4 h-4 text-blue-800" />
            <span className="hidden md:inline">Banco de Normas</span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
              {activeCount}
            </span>
          </button>

          <button
            id="btn-upload-norm"
            onClick={onOpenNewDocModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:scale-[0.98] shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Subir Lei / PDF</span>
            <span className="sm:hidden">Subir</span>
          </button>
        </div>
      </div>
    </header>
  );
};

