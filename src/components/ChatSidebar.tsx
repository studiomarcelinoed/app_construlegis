import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  Lock, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';
import { ChatSession } from '../types';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  userEmail?: string;
  isLoadingSessions?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  userEmail,
  isLoadingSessions,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.preview && s.preview.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-2xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-white border-r border-slate-200/90 shadow-xl lg:shadow-none flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-none'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Histórico de Consultas
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Privado e seguro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Recolher barra lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Action: Nova Consulta */}
        <div className="p-3 border-b border-slate-100">
          <button
            id="btn-sidebar-new-chat"
            onClick={() => {
              onNewChat();
              // On mobile, close sidebar when clicking new chat
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Consulta / Novo Parecer</span>
          </button>

          {/* Search bar inside history if many items */}
          {sessions.length > 3 && (
            <div className="relative mt-2.5">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar histórico..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingSessions ? (
            <div className="p-6 text-center text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando histórico...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-700">Nenhum histórico anterior</p>
              <p className="text-[11px] leading-relaxed">
                Suas consultas e pareceres jurídicos ficam salvos exclusivamente na sua conta.
              </p>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = activeSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSession(s.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950 font-medium shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {s.title || 'Consulta técnica'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{formatTimestamp(s.updatedAt || s.createdAt)}</span>
                        {s.messageCount !== undefined && s.messageCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{s.messageCount} msgs</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      id={`btn-delete-session-${s.id}`}
                      onClick={(e) => onDeleteSession(s.id, e)}
                      title="Excluir consulta do histórico"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Privacy & User ID */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 truncate">
            <Lock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
            <span className="truncate">{userEmail || 'Usuário Autenticado'}</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Consultas protegidas e isoladas por usuário.
          </p>
        </div>
      </aside>
    </>
  );
};
