import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  Trash2, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Lock, 
  MessageCircle,
  History
} from 'lucide-react';
import { LawDocument, ChatMessage, AnalysisResult, DriveStatus, UserProfile, AuthConfig, ChatSession } from './types';
import { getInitialDocuments, saveCustomDocuments } from './utils/documentStore';
import { Header } from './components/Header';
import { ChatSidebar } from './components/ChatSidebar';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { SamplePrompts } from './components/SamplePrompts';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { AuthModal } from './components/AuthModal';
import { AdminModal } from './components/AdminModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  timestamp: new Date().toISOString(),
  text: 'Olá! Sou o ConstruLegis, seu assistente especializado em Legislação e Normas da Construção Civil.',
  analysis: {
    verdict: 'Repositório Normativo e Técnico Conectado',
    status: 'informativo',
    practicalGuidance: [
      'Faça perguntas técnicas sobre normas da ABNT (NBR 9050, 14718, 15575), NR-18 ou Códigos de Obras.',
      'A consulta analisa o repertório normativo e a legislação da construção civil, fornecendo embasamento técnico e citações precisas.',
      'Envie fotos de obras, escadas, rampas, guarda-corpos ou plantas para verificação de conformidade visual.',
      'Suas consultas anteriores ficam salvas de forma estritamente privativa na barra lateral à esquerda.',
    ],
    citations: [
      {
        id: 'cit-welcome-1',
        documentCode: 'ABNT NBR 9050:2020',
        articleOrItem: 'Item 6.6.2.1 - Rampas em novas construções',
        exactText: 'A inclinação máxima admissível para rampas em novas construções é de 8,33% (1:12), com desnível máximo de 0,80 m por segmento de rampa.',
        interpretation: 'Todo projeto arquitetônico ou reforma de uso público/coletivo deve respeitar rigorosamente a inclinação máxima de 8,33% para garantir rota acessível sem risco de embargo.',
        practicalImplication: 'Prever patamares de descanso a cada 80 cm de desnível e corrimãos contínuos em duas alturas (0,70m e 0,92m).'
      },
      {
        id: 'cit-welcome-2',
        documentCode: 'Código Civil (Lei 10.406/2002)',
        articleOrItem: 'Artigo 1.301 - Direito de Construir',
        exactText: 'É defeso abrir janelas, ou fazer eirado, terraço ou varanda, a menos de metro e meio do terreno vizinho.',
        interpretation: 'Qualquer abertura para o imóvel lindeiro com visão direta exige recuo mínimo de 1,50 m para evitar ação demolitória do vizinho no prazo de ano e dia.',
        practicalImplication: 'Em paredes encostadas ou com recuo inferior a 1,50m, apenas são toleradas aberturas de luz/ventilação de até 10x20cm a mais de 2 metros de altura do piso.'
      }
    ],
    risksAndPenalties: 'O descumprimento de normas técnicas e códigos municipais pode acarretar multas administrativas, embargo da obra pela fiscalização, recusa na emissão do Habite-se e responsabilização civil e criminal dos profissionais responsáveis (ART/RRT).',
    relevantNorms: ['NBR 9050:2020', 'Código Civil Art. 1.301', 'NR-18', 'Código de Obras'],
  },
};

export default function App() {
  // Documents state (built-in standards and norms for RAG)
  const [documents, setDocuments] = useState<LawDocument[]>(getInitialDocuments);
  
  // Google Drive status state (read-only for regular users, managed by Master Admin)
  const [driveFolderId, setDriveFolderId] = useState<string>(() => {
    return localStorage.getItem('civil_lex_drive_folder') || '';
  });
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Authentication & VIP Whitelist state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('civil_lex_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [deniedEmail, setDeniedEmail] = useState<string>('');

  // Private Chat Sessions & History State (Individual por usuário)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  // Current chat messages state: inicia sempre vazio / pronto para nova consulta
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<LawDocument | null>(null);

  const isMasterAdmin = Boolean(
    currentUser &&
      ((currentUser.email && currentUser.email.toLowerCase() === 'studio@fabianomarcelino.com') ||
        currentUser.role === 'ADM')
  );

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Auth configuration
  useEffect(() => {
    fetchAuthConfig();
  }, [currentUser]);

  const fetchAuthConfig = async () => {
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.email) {
        headers['Authorization'] = `Bearer ${currentUser.token || currentUser.email}`;
        headers['X-User-Email'] = currentUser.email;
      }
      const res = await fetch('/api/auth/config', { headers });
      if (res.ok) {
        const config: AuthConfig = await res.json();
        setAuthConfig(config);
      }
    } catch (e) {
      console.warn('Erro ao carregar auth config:', e);
    }
  };

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentUser?.email) {
      headers['Authorization'] = `Bearer ${currentUser.token || currentUser.email}`;
      headers['X-User-Email'] = currentUser.email;
    }
    return headers;
  };

  // Carregar histórico de conversas privativo do usuário atual
  const loadUserSessions = async (email: string) => {
    if (!email) {
      setSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    const localKey = `construlegis_sessions_${email.toLowerCase()}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      } catch (e) {
        console.warn('Erro ao ler cache de sessões:', e);
      }
    }

    try {
      const res = await fetch('/api/chats', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          localStorage.setItem(localKey, JSON.stringify(data.sessions));
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar sessões do servidor:', e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Check Drive status and load user sessions on mount or user change
  useEffect(() => {
    if (currentUser) {
      fetchDriveStatus(driveFolderId);
      loadUserSessions(currentUser.email);
      // Sempre inicia em uma conversa vazia
      setActiveSessionId(null);
      setMessages([INITIAL_WELCOME_MESSAGE]);

      // Se usuário precisa alterar senha no primeiro acesso
      if (currentUser.must_change_password) {
        setIsChangePasswordOpen(true);
      }
    } else {
      setSessions([]);
      setActiveSessionId(null);
      setMessages([INITIAL_WELCOME_MESSAGE]);
      setIsAuthModalOpen(true);
    }
  }, [currentUser?.email]);

  const fetchDriveStatus = async (folderToQuery?: string, forceRefresh = false) => {
    if (!currentUser) return;
    setIsDriveLoading(true);
    try {
      const q = folderToQuery !== undefined ? folderToQuery : driveFolderId;
      const refreshParam = forceRefresh ? '&refresh=true' : '';
      const res = await fetch(`/api/drive/status?folderId=${encodeURIComponent(q)}${refreshParam}`, {
        headers: getAuthHeaders(),
      });

      if (res.status === 403) {
        setIsAccessDenied(true);
        setDeniedEmail(currentUser?.email || '');
        setIsAuthModalOpen(true);
        return;
      }

      if (res.ok) {
        const data: DriveStatus = await res.json();
        setDriveStatus(data);
        if (data.folderId && !driveFolderId) {
          setDriveFolderId(data.folderId);
          localStorage.setItem('civil_lex_drive_folder', data.folderId);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status do Google Drive:', err);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSaveDriveFolderId = async (newFolder: string) => {
    setDriveFolderId(newFolder);
    localStorage.setItem('civil_lex_drive_folder', newFolder);
    await fetchDriveStatus(newFolder, true);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('civil_lex_user', JSON.stringify(user));
    setIsAuthModalOpen(false);
    setIsAccessDenied(false);
    setDeniedEmail('');
    fetchDriveStatus(driveFolderId);
    loadUserSessions(user.email);
    // Inicia conversa limpa
    setActiveSessionId(null);
    setMessages([INITIAL_WELCOME_MESSAGE]);

    if (user.must_change_password) {
      setIsChangePasswordOpen(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('civil_lex_user');
    setIsAccessDenied(false);
    setDeniedEmail('');
    setSessions([]);
    setActiveSessionId(null);
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setIsAuthModalOpen(true);
  };

  // Scroll to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Acessar documento original em modo estritamente somente leitura
  const handleViewSourceDocByCode = (docCode: string) => {
    const cleanCode = docCode.toLowerCase().trim();
    const found = documents.find(
      (d) =>
        d.code.toLowerCase().includes(cleanCode) ||
        cleanCode.includes(d.code.toLowerCase()) ||
        d.title.toLowerCase().includes(cleanCode)
    );
    if (found) {
      setViewingDocument(found);
    } else if (documents.length > 0) {
      setViewingDocument(documents[0]);
    }
  };

  // Selecionar sessão do histórico e continuar de onde parou
  const handleSelectSession = async (sessionId: string) => {
    const localFound = sessions.find((s) => s.id === sessionId);
    if (localFound && localFound.messages && localFound.messages.length > 0) {
      setActiveSessionId(sessionId);
      setMessages(localFound.messages);
      return;
    }

    try {
      const res = await fetch(`/api/chats/${sessionId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session && Array.isArray(data.session.messages)) {
          setActiveSessionId(sessionId);
          setMessages(data.session.messages);
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, ...data.session } : s))
          );
        }
      }
    } catch (err) {
      console.error('Erro ao carregar consulta selecionada:', err);
    }
  };

  // Iniciar nova consulta vazia
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([INITIAL_WELCOME_MESSAGE]);
  };

  // Excluir sessão do histórico
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir esta consulta do seu histórico?')) return;

    try {
      await fetch(`/api/chats/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('Erro ao deletar sessão no servidor:', err);
    }

    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (currentUser?.email) {
      localStorage.setItem(
        `construlegis_sessions_${currentUser.email.toLowerCase()}`,
        JSON.stringify(updated)
      );
    }

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([INITIAL_WELCOME_MESSAGE]);
    }
  };

  const handleSendMessage = async (
    text: string,
    imageAttachment?: { dataUrl: string; mimeType: string; name: string }
  ) => {
    if (isLoading) return;

    // Force login if not authenticated
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    // Se estiver em uma consulta vazia/nova, gera um novo ID de sessão
    const sessionIdToUse = activeSessionId || `session-${Date.now()}`;
    if (!activeSessionId) {
      setActiveSessionId(sessionIdToUse);
    }

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      image: imageAttachment,
    };

    // Remove mensagem de boas-vindas inicial se for a primeira mensagem da nova consulta
    const baseMessages = messages.filter((m) => m.id !== 'msg-welcome');
    const messagesWithUser = [...baseMessages, userMsg];
    setMessages(messagesWithUser);
    setIsLoading(true);

    try {
      // Documentos ativos para RAG
      const activeDocs = documents
        .filter((d) => d.active)
        .map((d) => ({
          id: d.id,
          title: d.title,
          code: d.code,
          jurisdiction: d.jurisdiction,
          content: d.content,
        }));

      // Imagem em base64 se anexada
      let imagePayload: { data: string; mimeType: string } | undefined = undefined;
      if (imageAttachment) {
        const parts = imageAttachment.dataUrl.split(',');
        const base64Data = parts[1] || '';
        imagePayload = {
          data: base64Data,
          mimeType: imageAttachment.mimeType,
        };
      }

      const executeConsult = async () => {
        return await fetch('/api/consult', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            prompt: text,
            image: imagePayload,
            driveFolderId: driveFolderId || undefined,
            customDocuments: activeDocs,
            userEmail: currentUser.email,
          }),
        });
      };

      let res = await executeConsult();

      // Tratamento específico de erro 503 (UNAVAILABLE / high demand)
      // Se a API retornar erro 503, faz uma nova tentativa automática (retry) após 2 segundos
      if (res.status === 503) {
        console.warn('API retornou 503 (sobrecarregado). Realizando nova tentativa automática após 2 segundos...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        res = await executeConsult();
      }

      if (res.status === 401) {
        setIsAuthModalOpen(true);
        throw new Error('Autenticação obrigatória. Por favor, faça login com sua conta do Google.');
      }

      if (res.status === 403) {
        setIsAccessDenied(true);
        setDeniedEmail(currentUser.email);
        setIsAuthModalOpen(true);
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Sua conta não possui uma licença ativa. Entre em contato para liberar seu acesso.');
      }

      // Se persistir com erro 503 após o retry, dispara erro amigável sem JSON bruto
      if (res.status === 503) {
        throw new Error('O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.');
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = errJson.error || `Erro na requisição (${res.status})`;

        if (
          res.status === 503 ||
          (typeof errMsg === 'string' && (
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('unavailable') ||
            errMsg.includes('high demand') ||
            errMsg.includes('sobrecarregado') ||
            errMsg.includes('overloaded')
          ))
        ) {
          throw new Error('O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.');
        }

        // Se o erro vier como string de JSON bruto, extrair a mensagem limpa
        if (typeof errMsg === 'string' && errMsg.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(errMsg);
            if (parsed.error?.code === 503 || parsed.error?.status === 'UNAVAILABLE') {
              throw new Error('O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.');
            }
            if (parsed.error?.message) {
              errMsg = parsed.error.message;
            } else if (typeof parsed.error === 'string') {
              errMsg = parsed.error;
            }
          } catch (e: any) {
            if (e.message?.includes('sobrecarregado')) throw e;
          }
        }

        throw new Error(errMsg);
      }

      const analysisData: AnalysisResult = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        sender: 'assistant',
        text: analysisData.verdict || 'Consulta técnica processada com sucesso.',
        timestamp: new Date().toISOString(),
        analysis: analysisData,
      };

      const finalMessages = [...messagesWithUser, assistantMsg];
      setMessages(finalMessages);

      // Gerar título descritivo da conversa a partir da pergunta do usuário
      let sessionTitle = text.trim().slice(0, 42);
      if (text.trim().length > 42) sessionTitle += '...';

      const updatedSession: ChatSession = {
        id: sessionIdToUse,
        userEmail: currentUser.email,
        title: sessionTitle || 'Consulta Técnica',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
        messageCount: finalMessages.length,
        preview: assistantMsg.text.slice(0, 80),
      };

      // Atualizar estado e sincronizar localmente por usuário
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === sessionIdToUse);
        const nextList = exists
          ? [updatedSession, ...prev.filter((s) => s.id !== sessionIdToUse)]
          : [updatedSession, ...prev];
        if (currentUser?.email) {
          localStorage.setItem(
            `construlegis_sessions_${currentUser.email.toLowerCase()}`,
            JSON.stringify(nextList)
          );
        }
        return nextList;
      });

      // Persistir no servidor em background
      fetch('/api/chats', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedSession),
      }).catch((e) => console.warn('Erro ao salvar chat no backend:', e));

    } catch (err: any) {
      console.error('Error fetching consultation:', err);
      let rawError = err?.message || 'Ocorreu um erro de comunicação com o servidor.';
      let isOverloaded = false;

      if (
        err?.status === 503 ||
        rawError.includes('503') ||
        rawError.includes('UNAVAILABLE') ||
        rawError.includes('unavailable') ||
        rawError.includes('high demand') ||
        rawError.includes('sobrecarregado') ||
        rawError.includes('overloaded')
      ) {
        isOverloaded = true;
      }

      // Se for string de JSON bruto, limpa para não exibir JSON ao usuário
      if (typeof rawError === 'string' && rawError.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(rawError);
          if (parsed.error?.code === 503 || parsed.error?.status === 'UNAVAILABLE') {
            isOverloaded = true;
          }
          if (parsed.error?.message) {
            rawError = parsed.error.message;
          } else if (typeof parsed.error === 'string') {
            rawError = parsed.error;
          }
        } catch {
          // fallback
        }
      }

      const friendlyMessage = isOverloaded
        ? 'O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.'
        : rawError;

      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: isOverloaded
          ? 'O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.'
          : 'Não foi possível processar a consulta.',
        timestamp: new Date().toISOString(),
        error: friendlyMessage,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation Bar: ConstruLegis Branding, Usuário Logado e Sair */}
      <Header
        currentUser={currentUser}
        isMasterAdmin={isMasterAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Workspace Layout with Private Chat Sidebar */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden">
        {/* Barra Lateral: Histórico de Conversas Próprio e Privado */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          userEmail={currentUser?.email}
          isLoadingSessions={isLoadingSessions}
          isMasterAdmin={isMasterAdmin}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
        />

        {/* Área Central do Chat de Consulta */}
        <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-[calc(100dvh-3.75rem)] sm:h-[calc(100dvh-4.5rem)] overflow-hidden">
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 pt-2.5 sm:pt-4 pb-2 w-full max-w-full">
            <div className="max-w-4xl mx-auto flex flex-col w-full min-w-0">
              {/* Banner de Licença Bloqueada / Whitelist 403 */}
              {isAccessDenied && currentUser && (
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      A conta <strong>{currentUser.email}</strong> não possui licença ativa no servidor.
                    </span>
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Olá! Gostaria de solicitar a liberação de licença para ${currentUser.email} na plataforma ConstruLegis.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shrink-0 cursor-pointer shadow-xs text-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Liberar Licença</span>
                  </a>
                </div>
              )}

              {/* Chat Sub-Header: Status e Botão de Nova Consulta */}
              <div className="flex items-center justify-between pb-2.5 sm:pb-3.5 border-b border-slate-200/80 mb-3 sm:mb-4 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-700 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-900 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">
                    {activeSessionId ? 'Consulta em Andamento' : 'Nova Consulta'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[10px] sm:text-[11px] font-medium shrink-0">
                    Somente Consulta
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="flex items-center gap-1 text-[11px] sm:text-xs text-blue-900 hover:text-blue-800 font-semibold px-2 sm:px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-300 shadow-2xs transition-all cursor-pointer shrink-0"
                    title="Iniciar nova consulta vazia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Nova Consulta</span>
                    <span className="xs:hidden">Nova</span>
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 space-y-2 w-full max-w-full">
                {messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    onViewSourceDoc={handleViewSourceDocByCode}
                  />
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex gap-2 sm:gap-4 mb-5 sm:mb-6 w-full max-w-full">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 shrink-0 shadow-xs animate-pulse mt-0.5">
                      <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="p-3.5 sm:p-5 bg-white rounded-2xl rounded-tl-xs border border-blue-200 shadow-xs max-w-md space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-spin shrink-0" />
                        <span className="truncate">ConstruLegis analisando normas...</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                        Vasculhando o repertório normativo ABNT, códigos de obras e legislação técnica para estruturação do parecer...
                      </p>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-900 h-full w-2/3 animate-[pulse_1.5s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested sample prompts if only welcome message exists */}
                {messages.length === 1 && !isLoading && (
                  <SamplePrompts
                    onSelectPrompt={(promptText) => handleSendMessage(promptText)}
                  />
                )}

                <div ref={chatEndRef} />
              </div>
            </div>
          </main>

          {/* Persistent Chat Input Bar */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modal: Full Document Viewer (Modo Leitura de Artigos e Normas para o Usuário) */}
      <DocumentViewerModal
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
      />

      {/* Modal: Authentication & VIP Whitelist License Check */}
      <AuthModal
        isOpen={isAuthModalOpen}
        authConfig={authConfig}
        onLoginSuccess={handleLoginSuccess}
        isAccessDenied={isAccessDenied}
        deniedEmail={deniedEmail}
        onClose={() => {
          if (currentUser && !isAccessDenied) {
            setIsAuthModalOpen(false);
          }
        }}
      />

      {/* Modal: Painel do Administrador Mestre (Exclusivo para o Master Admin) */}
      {isMasterAdmin && (
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          getAuthHeaders={getAuthHeaders}
          driveStatus={driveStatus}
          onRefreshDrive={() => fetchDriveStatus(undefined, true)}
          onOpenDriveSettings={() => {
            setIsAdminModalOpen(false);
            setIsDriveModalOpen(true);
          }}
        />
      )}

      {/* Modal: Google Drive Configuration (Acessível pelo Master Admin se acionado) */}
      {isMasterAdmin && (
        <GoogleDriveModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          currentFolderId={driveFolderId}
          onSaveDriveFolderId={handleSaveDriveFolderId}
          driveStatus={driveStatus}
          onRefreshDrive={() => fetchDriveStatus(undefined, true)}
          isLoading={isDriveLoading}
        />
      )}

      {/* Modal: Alteração de Senha do Usuário Autenticado */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={currentUser}
          forced={Boolean(currentUser.must_change_password)}
          onPasswordChanged={() => {
            setCurrentUser((prev) =>
              prev
                ? {
                    ...prev,
                    must_change_password: false,
                    passwordChanged: true,
                  }
                : null
            );
            setIsChangePasswordOpen(false);
          }}
        />
      )}
    </div>
  );
}


