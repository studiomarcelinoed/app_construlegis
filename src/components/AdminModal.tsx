import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  BookMarked, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X, 
  RefreshCw, 
  Search, 
  Lock, 
  FileEdit,
  FolderSync,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { WhitelistUser, SystemDirective, DriveStatus } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  getAuthHeaders: () => Record<string, string>;
  driveStatus: DriveStatus | null;
  onRefreshDrive: () => void;
  onOpenDriveSettings: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  getAuthHeaders,
  driveStatus,
  onRefreshDrive,
  onOpenDriveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'directives' | 'drive'>('users');
  
  // Users state
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Directives state
  const [directives, setDirectives] = useState<SystemDirective[]>([]);
  const [isLoadingDirectives, setIsLoadingDirectives] = useState(false);
  const [directiveSearch, setDirectiveSearch] = useState('');
  const [isEditingDirective, setIsEditingDirective] = useState(false);
  const [currentDirective, setCurrentDirective] = useState<Partial<SystemDirective>>({
    title: '',
    code: '',
    category: 'diretriz_geral',
    description: '',
    content: '',
    active: true,
  });
  const [directiveError, setDirectiveError] = useState('');
  const [directiveSuccess, setDirectiveSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadDirectives();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUserError('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const err = await res.json();
        setUserError(err.error || 'Erro ao carregar usuários.');
      }
    } catch (e: any) {
      setUserError(e.message || 'Falha na conexão com o servidor.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadDirectives = async () => {
    setIsLoadingDirectives(true);
    setDirectiveError('');
    try {
      const res = await fetch('/api/admin/directives', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectives(data.directives || []);
      } else {
        const err = await res.json();
        setDirectiveError(err.error || 'Erro ao carregar diretrizes.');
      }
    } catch (e: any) {
      setDirectiveError(e.message || 'Falha ao conectar com o servidor.');
    } finally {
      setIsLoadingDirectives(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      setUserError('Digite um e-mail válido.');
      return;
    }

    setIsSubmittingUser(true);
    setUserError('');
    setUserSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: newUserEmail.trim(),
          name: newUserName.trim(),
          company: newUserCompany.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUserSuccess(`Usuário ${data.user.email} autorizado com sucesso!`);
        setNewUserEmail('');
        setNewUserName('');
        setNewUserCompany('');
        await loadUsers();
      } else {
        setUserError(data.error || 'Erro ao autorizar usuário.');
      }
    } catch (e: any) {
      setUserError(e.message || 'Falha ao salvar usuário.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserActive = async (user: WhitelistUser) => {
    if (user.isMaster) {
      alert('O Administrador Mestre não pode ser desativado.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
        );
      }
    } catch (e) {
      console.error('Erro ao atualizar status do usuário:', e);
    }
  };

  const handleDeleteUser = async (user: WhitelistUser) => {
    if (user.isMaster) {
      alert('O Administrador Mestre não pode ser excluído.');
      return;
    }

    if (!confirm(`Tem certeza que deseja revogar o acesso do usuário ${user.email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      }
    } catch (e) {
      console.error('Erro ao excluir usuário:', e);
    }
  };

  const handleSaveDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDirective.title?.trim() || !currentDirective.content?.trim()) {
      setDirectiveError('Título e conteúdo são obrigatórios.');
      return;
    }

    setDirectiveError('');
    setDirectiveSuccess('');

    const isEdit = Boolean(currentDirective.id);
    const url = isEdit
      ? `/api/admin/directives/${currentDirective.id}`
      : '/api/admin/directives';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(currentDirective),
      });

      const data = await res.json();
      if (res.ok) {
        setDirectiveSuccess(
          isEdit ? 'Diretriz atualizada com sucesso!' : 'Nova diretriz adicionada ao sistema!'
        );
        setIsEditingDirective(false);
        setCurrentDirective({
          title: '',
          code: '',
          category: 'diretriz_geral',
          description: '',
          content: '',
          active: true,
        });
        await loadDirectives();
      } else {
        setDirectiveError(data.error || 'Erro ao salvar diretriz.');
      }
    } catch (e: any) {
      setDirectiveError(e.message || 'Falha ao salvar.');
    }
  };

  const handleToggleDirectiveActive = async (dir: SystemDirective) => {
    try {
      const res = await fetch(`/api/admin/directives/${dir.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ active: !dir.active }),
      });
      if (res.ok) {
        setDirectives((prev) =>
          prev.map((d) => (d.id === dir.id ? { ...d, active: !d.active } : d))
        );
      }
    } catch (e) {
      console.error('Erro ao alternar status da diretriz:', e);
    }
  };

  const handleDeleteDirective = async (dir: SystemDirective) => {
    if (!confirm(`Remover a diretriz "${dir.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/directives/${dir.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setDirectives((prev) => prev.filter((d) => d.id !== dir.id));
      }
    } catch (e) {
      console.error('Erro ao excluir diretriz:', e);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.company && u.company.toLowerCase().includes(q))
    );
  });

  const filteredDirectives = directives.filter((d) => {
    const q = directiveSearch.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Painel do Administrador Mestre</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Exclusivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão de Usuários da Whitelist, Diretrizes e Leis do Sistema e Conexão Drive
              </p>
            </div>
          </div>
          <button
            id="btn-close-admin-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
          <button
            id="tab-admin-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Usuários (Whitelist)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              {users.length}
            </span>
          </button>

          <button
            id="tab-admin-directives"
            onClick={() => setActiveTab('directives')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'directives'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Instruções e Leis do Sistema</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              {directives.length}
            </span>
          </button>

          <button
            id="tab-admin-drive"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>Repositório Google Drive</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {driveStatus?.files?.length || 0}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* TAB 1: GESTÃO DE USUÁRIOS */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Form de Adicionar Novo Usuário */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-900" />
                  Liberar Acesso / Adicionar Nova Licença à Whitelist
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Usuários com e-mail cadastrado e status ativo poderão se autenticar e realizar consultas ao assistente jurídico.
                </p>

                {userError && (
                  <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{userError}</span>
                  </div>
                )}

                {userSuccess && (
                  <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{userSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail do Google (obrigatório) *
                    </label>
                    <input
                      id="input-new-user-email"
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome / Profissional
                    </label>
                    <input
                      id="input-new-user-name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Eng. João Silva"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Empresa / Construtora
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="input-new-user-company"
                        type="text"
                        value={newUserCompany}
                        onChange={(e) => setNewUserCompany(e.target.value)}
                        placeholder="Construtora XYZ"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                      <button
                        id="btn-submit-new-user"
                        type="submit"
                        disabled={isSubmittingUser}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isSubmittingUser ? 'Salvando...' : 'Autorizar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Lista e Pesquisa */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      id="input-search-users"
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por e-mail ou nome..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <button
                    id="btn-refresh-users"
                    onClick={loadUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Usuário</th>
                        <th className="py-2.5 px-4 hidden md:table-cell">Empresa</th>
                        <th className="py-2.5 px-4 hidden sm:table-cell">Cadastrado em</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.isMaster && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    MASTER ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                              {u.company || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 hidden sm:table-cell">
                              {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                id={`btn-toggle-user-${u.id}`}
                                onClick={() => handleToggleUserActive(u)}
                                disabled={u.isMaster}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                                  u.active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                } ${u.isMaster ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                              >
                                {u.active ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Ativo</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>Bloqueado</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!u.isMaster && (
                                <button
                                  id={`btn-delete-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Remover da Whitelist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE INSTRUÇÕES E LEIS DO SISTEMA */}
          {activeTab === 'directives' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Instruções e Leis Aplicadas ao Comportamento da IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estas diretrizes são injetadas diretamente no System Prompt do Gemini para garantir que todas as análises sigam o rigor técnico e jurídico especificado.
                  </p>
                </div>
                {!isEditingDirective && (
                  <button
                    id="btn-new-directive"
                    onClick={() => {
                      setCurrentDirective({
                        title: '',
                        code: '',
                        category: 'diretriz_geral',
                        description: '',
                        content: '',
                        active: true,
                      });
                      setIsEditingDirective(true);
                      setDirectiveError('');
                      setDirectiveSuccess('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nova Instrução/Lei</span>
                  </button>
                )}
              </div>

              {directiveError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{directiveError}</span>
                </div>
              )}

              {directiveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{directiveSuccess}</span>
                </div>
              )}

              {/* Formulário de Criação/Edição */}
              {isEditingDirective && (
                <form
                  onSubmit={handleSaveDirective}
                  className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      {currentDirective.id ? 'Editar Instrução do Sistema' : 'Adicionar Nova Instrução ao Sistema'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingDirective(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Título da Instrução / Norma *
                      </label>
                      <input
                        id="input-directive-title"
                        type="text"
                        required
                        value={currentDirective.title || ''}
                        onChange={(e) =>
                          setCurrentDirective((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Ex: Tolerâncias de Cota para Corrimãos e Guarda-corpos"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código / Identificador
                      </label>
                      <input
                        id="input-directive-code"
                        type="text"
                        value={currentDirective.code || ''}
                        onChange={(e) =>
                          setCurrentDirective((prev) => ({ ...prev, code: e.target.value }))
                        }
                        placeholder="Ex: NBR 14718 ou PROMPT-01"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Categoria
                      </label>
                      <select
                        id="select-directive-category"
                        value={currentDirective.category || 'diretriz_geral'}
                        onChange={(e) =>
                          setCurrentDirective((prev) => ({
                            ...prev,
                            category: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      >
                        <option value="diretriz_geral">Diretriz Geral</option>
                        <option value="norma_tecnica">Norma Técnica (ABNT)</option>
                        <option value="legislacao">Legislação / Código Civil</option>
                        <option value="prompt_comportamento">Comportamento do Perito Jurídico</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Resumo Breve
                      </label>
                      <input
                        id="input-directive-description"
                        type="text"
                        value={currentDirective.description || ''}
                        onChange={(e) =>
                          setCurrentDirective((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Objetivo desta instrução para a IA"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Conteúdo / Regra Literal Injetada no Prompt *
                    </label>
                    <textarea
                      id="input-directive-content"
                      required
                      rows={5}
                      value={currentDirective.content || ''}
                      onChange={(e) =>
                        setCurrentDirective((prev) => ({ ...prev, content: e.target.value }))
                      }
                      placeholder="Descreva exatamente a regra técnica, os valores numéricos de referência e como a IA deve proceder..."
                      className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDirective(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-save-directive"
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      Salvar Instrução
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Diretrizes */}
              <div className="grid grid-cols-1 gap-3">
                {filteredDirectives.map((dir) => (
                  <div
                    key={dir.id}
                    className={`p-4 rounded-xl border transition-all ${
                      dir.active
                        ? 'border-slate-200 bg-white hover:border-blue-200'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {dir.code}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {dir.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            {dir.category.replace('_', ' ')}
                          </span>
                          {dir.isBuiltIn && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              PADRÃO DO SISTEMA
                            </span>
                          )}
                        </div>
                        {dir.description && (
                          <p className="text-xs text-slate-500 mb-2">{dir.description}</p>
                        )}
                        <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-3">
                          {dir.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-toggle-dir-${dir.id}`}
                          onClick={() => handleToggleDirectiveActive(dir)}
                          className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            dir.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {dir.active ? 'Ativa' : 'Inativa'}
                        </button>
                        <button
                          id={`btn-edit-dir-${dir.id}`}
                          onClick={() => {
                            setCurrentDirective(dir);
                            setIsEditingDirective(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar"
                        >
                          <FileEdit className="w-4 h-4" />
                        </button>
                        {!dir.isBuiltIn && (
                          <button
                            id={`btn-delete-dir-${dir.id}`}
                            onClick={() => handleDeleteDirective(dir)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONEXÃO E REPOSITÓRIO DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Repositório de Documentos do Google Drive
                  </h3>
                  <p className="text-xs text-slate-600">
                    O assistente consulta dinamicamente esta pasta para fundamentar os pareceres jurídicos e gerar citações literais.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    id="btn-admin-open-drive-settings"
                    onClick={onOpenDriveSettings}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-all cursor-pointer"
                  >
                    Alterar Pasta
                  </button>
                  <button
                    id="btn-admin-refresh-drive"
                    onClick={onRefreshDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reescanear Pasta</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Documentos Encontrados ({driveStatus?.files?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Nome do Arquivo</th>
                        <th className="py-2.5 px-4 hidden sm:table-cell">ID Google Drive</th>
                        <th className="py-2.5 px-4 text-right">Link de Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!driveStatus?.files || driveStatus.files.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500">
                            Nenhum documento sincronizado no momento.
                          </td>
                        </tr>
                      ) : (
                        driveStatus.files.map((file) => (
                          <tr key={file.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {file.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 hidden sm:table-cell">
                              {file.id}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {file.webViewLink ? (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-900 hover:underline font-semibold"
                                >
                                  Abrir no Drive
                                </a>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Autenticado como: <span className="font-semibold text-slate-900">studio@fabianomarcelino.com</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
};
