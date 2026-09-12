import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onPasswordChanged?: () => void;
  forced?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPasswordChanged,
  forced = false,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.trim().length < 4) {
      setError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não coincide com a nova senha digitada.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token || currentUser.email}`,
          'X-User-Email': currentUser.email,
        },
        body: JSON.stringify({
          email: currentUser.email,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Não foi possível alterar a senha. Verifique a senha atual digitada.');
        return;
      }

      setSuccess('Senha pessoal alterada com sucesso! Utilize-a nos seus próximos logins.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Atualiza usuário salvo no localStorage
      try {
        const saved = localStorage.getItem('civil_lex_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.passwordChanged = true;
          parsed.must_change_password = false;
          localStorage.setItem('civil_lex_user', JSON.stringify(parsed));
        }
      } catch {}

      if (onPasswordChanged) {
        onPasswordChanged();
      }

      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError('Erro de conexão ao salvar nova senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96dvh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center text-blue-900 shrink-0">
              <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {forced ? 'Definir Nova Senha (Primeiro Acesso)' : 'Alterar Senha de Acesso'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate font-mono">
                {currentUser.email}
              </p>
            </div>
          </div>
          {!forced && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 text-blue-900 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {forced
                ? 'Por razões de segurança, é obrigatório redefinir a sua senha inicial antes de prosseguir com o uso do sistema.'
                : 'Você pode trocar a senha padrão informada pelo administrador por uma senha pessoal de sua preferência.'}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Senha Atual *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite a senha atual de acesso"
                className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nova Senha Pessoal *
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 4 caracteres"
                className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha digitada"
                className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Salvando...' : 'Salvar Nova Senha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
