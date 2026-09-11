import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, LogIn, Lock, CheckCircle2, MessageCircle, AlertTriangle, KeyRound, Sparkles } from 'lucide-react';
import { UserProfile, AuthConfig } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  authConfig: AuthConfig | null;
  onLoginSuccess: (user: UserProfile) => void;
  isAccessDenied?: boolean;
  deniedEmail?: string;
  onClose?: () => void;
}

// Decode JWT token payload without external heavy library
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Falha ao decodificar token JWT:', e);
    return null;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  authConfig,
  onLoginSuccess,
  isAccessDenied = false,
  deniedEmail = '',
}) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const clientId = authConfig?.googleClientId || '';

  // Initialize Google Identity Services (GSI) if clientId is provided
  useEffect(() => {
    if (!isOpen || !clientId) return;

    const win = window as any;
    if (win.google?.accounts?.id) {
      try {
        win.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              const payload = decodeJwt(response.credential);
              if (payload && payload.email) {
                const user: UserProfile = {
                  id: payload.sub || `user-${Date.now()}`,
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email.toLowerCase(),
                  avatar: payload.picture,
                  token: response.credential,
                };
                onLoginSuccess(user);
              }
            }
          },
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            width: 320,
            locale: 'pt-BR',
          });
        }
      } catch (err) {
        console.warn('Google Identity Services init error:', err);
      }
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  // Handle Manual / Corporate direct identification (useful for prototyping and internal company access)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanEmail = manualEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    const user: UserProfile = {
      id: `user-${Date.now()}`,
      name: manualName.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      token: cleanEmail, // sent as Bearer email
    };

    onLoginSuccess(user);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Acesso Restrito ao Repositório</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isAccessDenied ? 'Acesso Não Autorizado' : 'Entrar com Conta Autorizada'}
            </h2>
            <p className="text-xs text-blue-200/80 mt-1">
              Plataforma de Pareceres Jurídicos e Auditoria Normativa da Construção Civil
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-blue-600/10 blur-xl pointer-events-none" />
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Access Denied State (Whitelist 403) */}
          {isAccessDenied ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-950 mb-1">
                    Licença não identificada
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    A conta <strong className="underline">{deniedEmail}</strong> não foi encontrada com licença ativa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  Como liberar seu acesso:
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Entre em contato com o administrador para realizar a ativação do seu e-mail, clicando no botão abaixo.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href="https://wa.link/2zuw9s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Solicitar Liberação via WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('civil_lex_user');
                    window.location.reload();
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Entrar com outra conta Google</span>
                </button>
              </div>

              {/* Rodapé da tela do popup de erro */}
              <div className="pt-4 mt-2 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-0.5">
                <p>Studio Marcelino Edificações ₢ 2026.</p>
                <p>Todos os direitos reservados.</p>
              </div>
            </div>
          ) : (
            /* Login Form / Google Auth State */
            <div className="space-y-5">
              <div className="text-xs text-slate-600 leading-relaxed">
                Este sistema utiliza autenticação segura para controle de acesso às normas técnicas e aos pareceres jurídicos.
              </div>

              {/* Google Button Container if Google Client ID is configured */}
              {clientId ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-slate-700">
                    Acesso via Conta Google:
                  </div>
                  <div className="flex justify-center py-1">
                    <div ref={googleBtnRef} id="google-signin-btn-container" />
                  </div>
                  <div className="relative flex items-center justify-center my-3">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                      ou identificação direta
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Direct email identification form */}
              <form onSubmit={handleManualSubmit} className="space-y-3">
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail do Usuário ou Engenheiro Responsável:
                  </label>
                  <input
                    type="email"
                    required
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="ex: fabianosm2311@gmail.com"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-50"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Deve corresponder a um e-mail cadastrado na lista VIP (whitelist) do servidor.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nome Completo / Empresa (Opcional):
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="ex: Eng. Fabiano Santos"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 active:scale-[0.99] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Validar Licença e Acessar</span>
                </button>
              </form>

              {/* Informative Security Guarantee */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Acesso criptografado com verificação estrita por Whitelist.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
