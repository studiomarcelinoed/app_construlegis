import React from 'react';
import { Scale, UserCheck, LogOut, Lock, ShieldAlert, History, Menu, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentUser: UserProfile | null;
  isMasterAdmin: boolean;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onOpenChangePassword?: () => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isMasterAdmin,
  onOpenAuthModal,
  onOpenAdminModal,
  onOpenChangePassword,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs w-full max-w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-15 sm:h-18 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Botão de Histórico de Conversas */}
          {onToggleSidebar && (
            <button
              id="btn-toggle-chat-history"
              onClick={onToggleSidebar}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer shrink-0 ${
                isSidebarOpen
                  ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={isSidebarOpen ? 'Recolher histórico' : 'Abrir histórico de conversas'}
              aria-label="Alternar histórico de consultas"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center text-amber-400 shadow-md shadow-blue-950/10 shrink-0">
            <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              ConstruLegis
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none mt-0.5 truncate">
              Legislação da Construção Civil
            </p>
          </div>
        </div>

        {/* Action Controls: Apenas login do usuário e sair para usuários comuns; Painel ADM para o ADM */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botão Painel ADM - Visível EXCLUSIVAMENTE para o Master Admin */}
          {isMasterAdmin && (
            <button
              id="btn-open-admin-panel"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] shadow-xs transition-all cursor-pointer border border-amber-600/30 shrink-0"
              title="Painel de Administração Mestre"
            >
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-950 shrink-0" />
              <span className="hidden xs:inline sm:inline">ADM</span>
            </button>
          )}

          {/* User Account / Login & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-1.5 sm:border-l sm:border-slate-200">
              <div className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-left max-w-[110px] sm:max-w-[200px]">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-[10px] sm:text-[11px] flex items-center justify-center shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-800 truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 truncate leading-tight hidden sm:block">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              {onOpenChangePassword && (
                <button
                  id="btn-change-password-header"
                  onClick={onOpenChangePassword}
                  className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer shrink-0"
                  title="Alterar Senha de Acesso"
                  aria-label="Alterar Senha"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden md:inline ml-1">Senha</span>
                </button>
              )}

              <button
                id="btn-logout"
                onClick={onLogout}
                className="flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer shrink-0"
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1">Sair</span>
              </button>
            </div>
          ) : (
            <button
              id="btn-login-header"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all cursor-pointer shadow-xs shrink-0"
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


