import React from 'react';
import { Scale, BookOpen, ShieldCheck, Plus, FolderSync, UserCheck, LogOut, Lock, ShieldAlert } from 'lucide-react';
import { LawDocument, DriveStatus, UserProfile } from '../types';

interface HeaderProps {
  documents: LawDocument[];
  driveStatus: DriveStatus | null;
  currentUser: UserProfile | null;
  isMasterAdmin: boolean;
  onOpenDocManager: () => void;
  onOpenNewDocModal: () => void;
  onOpenDriveSettings: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  documents,
  driveStatus,
  currentUser,
  isMasterAdmin,
  onOpenDocManager,
  onOpenNewDocModal,
  onOpenDriveSettings,
  onOpenAuthModal,
  onOpenAdminModal,
  onLogout,
}) => {
  const activeCount = documents.filter((d) => d.active).length;
  const driveFilesCount = driveStatus?.files?.length || 0;
  const isDriveConfigured = driveStatus?.configured;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-3">
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
        <div className="flex items-center gap-2 shrink-0">
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
            title="Repositório de normas no Google Drive"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:scale-[0.98] shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Subir Lei</span>
          </button>

          {/* Master Admin Button - Visível apenas para o Master Admin */}
          {isMasterAdmin && (
            <button
              id="btn-open-admin-panel"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] shadow-xs transition-all cursor-pointer border border-amber-600/30"
              title="Painel de Administração Mestre (Whitelist e Diretrizes)"
            >
              <ShieldAlert className="w-4 h-4 text-amber-950" />
              <span>Painel ADM</span>
            </button>
          )}

          {/* User Account / VIP Profile */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
              <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-100 border border-slate-200 text-left max-w-[140px] sm:max-w-[190px]">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate leading-tight">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

