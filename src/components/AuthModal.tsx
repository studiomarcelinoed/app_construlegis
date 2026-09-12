import React, { useState } from 'react';
import { ShieldAlert, Lock, CheckCircle2, MessageCircle, AlertTriangle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { UserProfile, AuthConfig } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  authConfig: AuthConfig | null;
  onLoginSuccess: (user: UserProfile) => void;
  isAccessDenied?: boolean;
  deniedEmail?: string;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  authConfig,
  onLoginSuccess,
  isAccessDenied = false,
  deniedEmail = '',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Por favor, digite a sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsSubmitting(false);
        return;
      }

      const user: UserProfile = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        company: data.user.company,
        role: data.user.role || (data.user.isMaster ? 'ADM' : 'USER'),
        isMaster: Boolean(data.user.isMaster),
        must_change_password: data.must_change_password !== undefined ? Boolean(data.must_change_password) : Boolean(data.user.must_change_password),
        is_blocked: Boolean(data.user.is_blocked),
        passwordChanged: Boolean(data.user.passwordChanged),
        token: data.user.token || data.user.email,
      };

      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage('Erro de conexão ao autenticar no servidor. Verifique sua rede e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[96dvh] overflow-y-auto">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-4 sm:p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold mb-2 sm:mb-3 border border-blue-400/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Acesso Restrito ao Repositório</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              {isAccessDenied ? 'Acesso Não Autorizado' : 'Entrar com E-mail e Senha'}
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/80 mt-1">
              Plataforma de Pareceres Jurídicos e Auditoria Normativa da Construção Civil
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-blue-600/10 blur-xl pointer-events-none" />
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6">
          {/* Access Denied State (Whitelist 403) */}
          {isAccessDenied ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-950 mb-1">
                    Acesso não autorizado
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    A conta <strong className="underline">{deniedEmail}</strong> não possui autorização ativa na Whitelist.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  Como solicitar ou recuperar seu acesso:
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Entre em contato diretamente com o administrador mestre para cadastrar seu e-mail e receber sua senha de acesso.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href="https://wa.link/1omw82"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Solicitar Acesso / Senha no WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('civil_lex_user');
                    window.location.reload();
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                >
                  <span>Voltar para tela de login</span>
                </button>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-0.5">
                <p>Studio Marcelino Edificações ₢ 2026.</p>
                <p>Todos os direitos reservados.</p>
              </div>
            </div>
          ) : (
            /* Login Form: Email + Password */
            <div className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Digite seu e-mail autorizado e a senha de acesso fornecida pelo administrador para entrar no sistema.
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{errorMessage}</span>
                      <div className="mt-1.5">
                        <a
                          href="https://wa.link/1omw82"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:underline"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Falar com o Administrador no WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Autorizado *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Senha de Acesso *
                    </label>
                    <a
                      href="https://wa.link/1omw82"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      <span>Esqueceu a senha?</span>
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha cadastrada"
                      className="w-full pl-3 pr-10 py-2 rounded-xl text-xs sm:text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 active:scale-[0.99] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-60"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>{isSubmitting ? 'Verificando Credenciais...' : 'Entrar no Sistema'}</span>
                </button>
              </form>

              {/* Box de Recuperação / Suporte com o Administrador */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1.5">
                <p className="text-[11px] text-slate-600">
                  Precisa de um novo código de acesso ou esqueceu sua senha?
                </p>
                <a
                  href="https://wa.link/1omw82"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recuperar Senha com o Administrador</span>
                </a>
              </div>

              {/* Informative Security Guarantee */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Credenciais criptografadas e persistentes no servidor.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
