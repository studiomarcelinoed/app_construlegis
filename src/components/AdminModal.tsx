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
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff
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
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADM'>('USER');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Modals for credentials & password reset
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    name: string;
    tempPass: string;
    role: string;
  } | null>(null);
  const [resetModalUser, setResetModalUser] = useState<WhitelistUser | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [hasCopiedCredentials, setHasCopiedCredentials] = useState(false);

  // Directives state
  const [directives, setDirectives] = useState<SystemDirective[]>([]);
  const [isLoadingDirectives, setIsLoadingDirectives] = useState(false);
  const [directiveSearch, setDirectiveSearch] = useState('');
  const [directiveCategoryFilter, setDirectiveCategoryFilter] = useState<string>('all');
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
  const [isResettingDirectives, setIsResettingDirectives] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadDirectives();
      generateDefaultPassword();
    }
  }, [isOpen]);

  const generateDefaultPassword = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setNewUserPassword(`Constru@${randomCode}`);
  };

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

    const cleanPass = newUserPassword.trim() || `Constru@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: newUserEmail.trim(),
          name: newUserName.trim(),
          company: newUserCompany.trim(),
          password: cleanPass,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedCredentials({
          email: newUserEmail.trim(),
          name: newUserName.trim() || newUserEmail.split('@')[0],
          tempPass: data.temporaryPassword || cleanPass,
          role: newUserRole,
        });
        setUserSuccess(`Acesso criado com sucesso no Supabase para ${newUserEmail}!`);
        setNewUserEmail('');
        setNewUserName('');
        setNewUserCompany('');
        generateDefaultPassword();
        await loadUsers();
      } else {
        setUserError(data.error || 'Erro ao criar usuário.');
      }
    } catch (e: any) {
      setUserError(e.message || 'Falha ao salvar usuário.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserBlock = async (user: WhitelistUser) => {
    if (user.isMaster) {
      alert('O Administrador Mestre não pode ser bloqueado.');
      return;
    }

    const willBlock = user.active; // if active, next state is blocked
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          active: !willBlock,
          is_blocked: willBlock,
        }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, active: !willBlock, is_blocked: willBlock }
              : u
          )
        );
      }
    } catch (e) {
      console.error('Erro ao atualizar bloqueio do usuário:', e);
    }
  };

  const handleOpenResetModal = (user: WhitelistUser) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setResetTempPassword(`Constru@${randomCode}`);
    setResetModalUser(user);
    setHasCopiedCredentials(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalUser) return;
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${resetModalUser.id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: resetTempPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserSuccess(`Senha redefinida com sucesso para ${resetModalUser.email}!`);
        await loadUsers();
      } else {
        alert(data.error || 'Erro ao redefinir senha.');
      }
    } catch (e: any) {
      alert(e.message || 'Falha na conexão ao resetar senha.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (user: WhitelistUser) => {
    if (user.isMaster) {
      alert('O Administrador Mestre não pode ser excluído.');
      return;
    }

    if (!confirm(`Tem certeza que deseja EXCLUIR definitivamente o acesso do usuário ${user.email} da tabela users do Supabase?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setUserSuccess(`Usuário ${user.email} excluído com sucesso.`);
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
      setDirectiveError(e.message || 'Falha ao salvar diretriz.');
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

  const handleResetDefaultDirectives = async () => {
    if (!confirm('Deseja restaurar todas as diretrizes padrão do sistema? Quaisquer personalizações nas diretrizes nativas serão redefinidas para o padrão de fábrica.')) {
      return;
    }

    setIsResettingDirectives(true);
    try {
      const res = await fetch('/api/admin/directives/reset-defaults', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectives(data.directives || []);
        setDirectiveSuccess('Diretrizes e normas padrão do sistema restauradas com sucesso!');
      }
    } catch (e: any) {
      setDirectiveError(e.message || 'Erro ao restaurar diretrizes padrão.');
    } finally {
      setIsResettingDirectives(false);
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
    const matchesSearch =
      d.title.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q);
    const matchesCategory =
      directiveCategoryFilter === 'all' || d.category === directiveCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96dvh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold truncate">Painel Exclusivo de Administração (ADM)</h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                  ADM
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Gestão de Usuários no Supabase, Memória e Regras da IA e Sincronização de PDFs do Google Drive
              </p>
            </div>
          </div>
          <button
            id="btn-close-admin-modal"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            aria-label="Fechar painel administrativo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-2 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            id="tab-admin-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>
              <span className="sm:hidden">Usuários</span>
              <span className="hidden sm:inline">Gestão de Usuários (Supabase)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-100 text-blue-800">
              {users.length}
            </span>
          </button>

          <button
            id="tab-admin-directives"
            onClick={() => setActiveTab('directives')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'directives'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>
              <span className="sm:hidden">Normas e Prompts</span>
              <span className="hidden sm:inline">Regras e Prompts da IA (System Instructions)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-100 text-blue-800">
              {directives.length}
            </span>
          </button>

          <button
            id="tab-admin-drive"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'drive'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>
              <span className="sm:hidden">Google Drive</span>
              <span className="hidden sm:inline">Leitura de PDFs do Google Drive</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {driveStatus?.files?.length || 0}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-white">
          
          {/* TAB 1: GESTÃO DE USUÁRIOS (SUPABASE) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {/* Form: Adicionar Novo Acesso */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/90 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-blue-900" />
                    Adicionar Novo Acesso (Persistência no Supabase)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold">
                    must_change_password = true
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Cadastre novos usuários definindo e-mail, nome e senha temporária. O usuário deverá obrigatoriamente cadastrar uma nova senha pessoal em seu primeiro acesso.
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

                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail de Acesso *
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
                      Nome do Usuário *
                    </label>
                    <input
                      id="input-new-user-name"
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Eng. Carlos Rocha"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Perfil / Role
                    </label>
                    <select
                      id="select-new-user-role"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'USER' | 'ADM')}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="USER">USER (Acesso Padrão)</option>
                      <option value="ADM">ADM (Administrador Completo)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Senha Temporária *
                      </label>
                      <button
                        type="button"
                        onClick={generateDefaultPassword}
                        className="text-[10px] text-blue-800 hover:underline cursor-pointer"
                      >
                        Regerar
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="input-new-user-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Ex: Constru@4821"
                        className="w-full pl-3 pr-8 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      id="btn-submit-new-user"
                      type="submit"
                      disabled={isSubmittingUser}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isSubmittingUser ? 'Criando no Banco...' : 'Adicionar Acesso'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Usuários e Ações */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="relative w-full sm:w-80">
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
                    <span>Atualizar Cadastros</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs w-full max-w-full">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Usuário</th>
                        <th className="py-2.5 px-4 text-center">Perfil</th>
                        <th className="py-2.5 px-4 text-center">Senha</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhum usuário cadastrado encontrado.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isBlocked = u.is_blocked || !u.active;
                          const mustChange = u.must_change_password !== undefined ? u.must_change_password : !u.passwordChanged;
                          const userRole = u.role || (u.isMaster ? 'ADM' : 'USER');

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name || u.email.split('@')[0]}</span>
                                  {u.isMaster && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      MASTER ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    userRole === 'ADM'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {userRole}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                {mustChange ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                    <KeyRound className="w-3 h-3 text-amber-600" />
                                    <span>Troca Pendente</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Definida</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <button
                                  id={`btn-toggle-block-${u.id}`}
                                  onClick={() => handleToggleUserBlock(u)}
                                  disabled={u.isMaster}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                    !isBlocked
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  } ${u.isMaster ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                  title={u.isMaster ? 'Master Admin não pode ser bloqueado' : (isBlocked ? 'Desbloquear acesso' : 'Bloquear acesso')}
                                >
                                  {!isBlocked ? (
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
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    id={`btn-reset-pass-${u.id}`}
                                    onClick={() => handleOpenResetModal(u)}
                                    className="px-2 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                    title="Resetar Senha Temporária"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>Resetar Senha</span>
                                  </button>

                                  {!u.isMaster && (
                                    <button
                                      id={`btn-delete-user-${u.id}`}
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Excluir Usuário do Supabase"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE NORMAS E PROMPTS (SYSTEM INSTRUCTIONS) */}
          {activeTab === 'directives' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Regras, Leis e Prompts da IA (System Instructions)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personalize a memória técnica e o rigor da IA. Estas diretrizes são injetadas em todas as consultas para garantir que o assistente aplique os limites das normas e leis vigentes.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="btn-reset-default-directives"
                    onClick={handleResetDefaultDirectives}
                    disabled={isResettingDirectives}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                    title="Restaurar normas e prompts originais de fábrica"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResettingDirectives ? 'animate-spin' : ''}`} />
                    <span>Restaurar Padrões</span>
                  </button>

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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Diretriz / Prompt</span>
                    </button>
                  )}
                </div>
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
                  className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FileEdit className="w-4 h-4 text-blue-900" />
                      <span>{currentDirective.id ? 'Editar Diretriz da IA' : 'Adicionar Nova Diretriz ao Sistema'}</span>
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
                        Título da Norma ou Instrução *
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
                        Categoria da Regra
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
                        Resumo Breve / Finalidade
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
                      Conteúdo / Regra Literal Injetada no Prompt do Gemini *
                    </label>
                    <textarea
                      id="input-directive-content"
                      required
                      rows={6}
                      value={currentDirective.content || ''}
                      onChange={(e) =>
                        setCurrentDirective((prev) => ({ ...prev, content: e.target.value }))
                      }
                      placeholder="Descreva exatamente a regra técnica, os valores numéricos de referência e como a IA deve proceder..."
                      className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 leading-relaxed"
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
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer shadow-xs"
                    >
                      Salvar Regra da IA
                    </button>
                  </div>
                </form>
              )}

              {/* Filtros e Lista de Diretrizes */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={directiveSearch}
                      onChange={(e) => setDirectiveSearch(e.target.value)}
                      placeholder="Pesquisar norma ou comando..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'Todas' },
                      { id: 'diretriz_geral', label: 'Geral' },
                      { id: 'norma_tecnica', label: 'Normas ABNT' },
                      { id: 'legislacao', label: 'Legislação' },
                      { id: 'prompt_comportamento', label: 'Perito IA' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setDirectiveCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          directiveCategoryFilter === cat.id
                            ? 'bg-blue-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {filteredDirectives.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                      Nenhuma diretriz encontrada para os filtros selecionados.
                    </div>
                  ) : (
                    filteredDirectives.map((dir) => (
                      <div
                        key={dir.id}
                        className={`p-4 rounded-xl border transition-all ${
                          dir.active
                            ? 'border-slate-200 bg-white hover:border-blue-200 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
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
                                  PADRÃO NATIVO
                                </span>
                              )}
                            </div>
                            {dir.description && (
                              <p className="text-xs text-slate-500 mb-2">{dir.description}</p>
                            )}
                            <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-3 leading-relaxed">
                              {dir.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              id={`btn-toggle-dir-${dir.id}`}
                              onClick={() => handleToggleDirectiveActive(dir)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                dir.active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={dir.active ? 'Desativar instrução' : 'Ativar instrução'}
                            >
                              {dir.active ? 'Ativa' : 'Desativada'}
                            </button>
                            <button
                              id={`btn-edit-dir-${dir.id}`}
                              onClick={() => {
                                setCurrentDirective(dir);
                                setIsEditingDirective(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Editar Instrução"
                            >
                              <FileEdit className="w-4 h-4" />
                            </button>
                            {!dir.isBuiltIn && (
                              <button
                                id={`btn-delete-dir-${dir.id}`}
                                onClick={() => handleDeleteDirective(dir)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Excluir Instrução"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEITURA E CONEXÃO DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Consulta Dinâmica a Documentos do Google Drive
                  </h3>
                  <p className="text-xs text-slate-600">
                    O assistente lê e extrai os PDFs e textos reais da pasta configurada no servidor, injetando os trechos normativos diretamente no contexto de raciocínio da IA.
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
                    <span>Reescanear PDFs</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Documentos Encontrados e Sincronizados ({driveStatus?.files?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
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

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="truncate">
            Painel Administrativo Mestre • Banco Supabase e Google Drive integrados
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer self-end sm:self-auto"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CREDENCIAIS CRIADAS (SUCESSO) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Novo Acesso Criado no Supabase!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Compartilhe as credenciais abaixo com o usuário. No primeiro login, a troca de senha será exigida.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs text-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Nome:</span>
                <span className="font-semibold">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">E-mail:</span>
                <span className="font-semibold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Perfil:</span>
                <span className="font-semibold">{createdCredentials.role}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Senha Temporária:</span>
                <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {createdCredentials.tempPass}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Credenciais de Acesso ao ConstruLegis:\nUsuário: ${createdCredentials.name}\nE-mail: ${createdCredentials.email}\nSenha Temporária: ${createdCredentials.tempPass}\nPerfil: ${createdCredentials.role}\n(Deverá alterar a senha no primeiro acesso)`;
                  navigator.clipboard.writeText(text);
                  setHasCopiedCredentials(true);
                  setTimeout(() => setHasCopiedCredentials(false), 3000);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {hasCopiedCredentials ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopiedCredentials ? 'Copiado!' : 'Copiar Credenciais'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: RESET DE SENHA */}
      {resetModalUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Resetar Senha do Usuário</h3>
              <p className="text-xs text-slate-500 mt-1">
                Uma nova senha temporária será salva no Supabase para <strong>{resetModalUser.email}</strong> com <code>must_change_password = true</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nova Senha Temporária
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resetTempPassword}
                  onChange={(e) => setResetTempPassword(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = Math.floor(1000 + Math.random() * 9000);
                    setResetTempPassword(`Constru@${code}`);
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  title="Gerar outra senha aleatória"
                >
                  Regerar
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await handleConfirmResetPassword();
                  const text = `Sua senha de acesso ao ConstruLegis foi resetada pelo administrador:\nE-mail: ${resetModalUser.email}\nNova Senha Temporária: ${resetTempPassword}\n(Você deverá cadastrar uma nova senha no seu próximo acesso)`;
                  navigator.clipboard.writeText(text);
                  alert('Senha resetada no Supabase e copiada para a área de transferência!');
                  setResetModalUser(null);
                }}
                disabled={isResettingPassword}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isResettingPassword ? 'Salvando...' : 'Confirmar e Copiar'}
              </button>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
