import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  BookOpen, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Download, 
  FileText,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  FolderSync,
  Lock,
  MessageCircle
} from 'lucide-react';
import { LawDocument, ChatMessage, AnalysisResult, DriveStatus, UserProfile, AuthConfig } from './types';
import { getInitialDocuments, saveCustomDocuments } from './utils/documentStore';
import { Header } from './components/Header';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { SamplePrompts } from './components/SamplePrompts';
import { DocumentModal } from './components/DocumentModal';
import { NewDocumentModal } from './components/NewDocumentModal';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { AuthModal } from './components/AuthModal';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  timestamp: new Date().toISOString(),
  text: 'Olá! Sou o Assistente Especializado em Legislação da Construção Civil.',
  analysis: {
    verdict: 'Repositório Jurídico e Técnico Conectado ao Google Drive',
    status: 'informativo',
    practicalGuidance: [
      'Faça perguntas técnicas sobre normas da ABNT (NBR 9050, 14718, 15575), NR-18 ou Código de Obras.',
      'A consulta é realizada diretamente nos PDFs e leis da sua pasta compartilhada do Google Drive, trazendo links e citações diretas.',
      'Envie fotos de obras, escadas, rampas, guarda-corpos ou plantas para verificação de conformidade visual.',
      'Clique em "Google Drive" no topo para visualizar os arquivos conectados ou alterar o link da pasta.',
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
  // Documents state
  const [documents, setDocuments] = useState<LawDocument[]>(getInitialDocuments);
  
  // Google Drive state
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<LawDocument | null>(null);

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

  // Check Drive status on mount or user change
  useEffect(() => {
    if (currentUser) {
      fetchDriveStatus(driveFolderId);
    } else {
      setIsAuthModalOpen(true);
    }
  }, [currentUser]);

  const fetchDriveStatus = async (folderToQuery?: string) => {
    if (!currentUser) return;
    setIsDriveLoading(true);
    try {
      const q = folderToQuery !== undefined ? folderToQuery : driveFolderId;
      const res = await fetch(`/api/drive/status?folderId=${encodeURIComponent(q)}`, {
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
    await fetchDriveStatus(newFolder);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('civil_lex_user', JSON.stringify(user));
    setIsAuthModalOpen(false);
    setIsAccessDenied(false);
    setDeniedEmail('');
    fetchDriveStatus(driveFolderId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('civil_lex_user');
    setIsAccessDenied(false);
    setDeniedEmail('');
    setIsAuthModalOpen(true);
  };

  // Save documents whenever they change
  useEffect(() => {
    saveCustomDocuments(documents);
  }, [documents]);

  // Scroll to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleToggleActiveDoc = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, active: !doc.active } : doc))
    );
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('Tem certeza que deseja remover este documento do banco próprio?')) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  const handleAddDocument = (newDoc: LawDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

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

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      image: imageAttachment,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Active documents for RAG context
      const activeDocs = documents
        .filter((d) => d.active)
        .map((d) => ({
          id: d.id,
          title: d.title,
          code: d.code,
          jurisdiction: d.jurisdiction,
          content: d.content,
        }));

      // Extract raw base64 data if image is attached
      let imagePayload: { data: string; mimeType: string } | undefined = undefined;
      if (imageAttachment) {
        const parts = imageAttachment.dataUrl.split(',');
        const base64Data = parts[1] || '';
        imagePayload = {
          data: base64Data,
          mimeType: imageAttachment.mimeType,
        };
      }

      const res = await fetch('/api/consult', {
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro na requisição (${res.status})`);
      }

      const analysisData: AnalysisResult = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        sender: 'assistant',
        text: analysisData.verdict || 'Consulta técnica processada com sucesso.',
        timestamp: new Date().toISOString(),
        analysis: analysisData,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error fetching consultation:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Não foi possível processar a consulta.',
        timestamp: new Date().toISOString(),
        error: err.message || 'Ocorreu um erro de comunicação com o servidor.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar o histórico atual da conversa?')) {
      setMessages([INITIAL_WELCOME_MESSAGE]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Header
        documents={documents}
        driveStatus={driveStatus}
        currentUser={currentUser}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenNewDocModal={() => setIsNewDocModalOpen(true)}
        onOpenDriveSettings={() => setIsDriveModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 pb-2">
        {/* Banner de Licença Bloqueada / Whitelist 403 */}
        {isAccessDenied && currentUser && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                A conta <strong>{currentUser.email}</strong> não possui licença ativa no servidor.
              </span>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Olá! Gostaria de solicitar a liberação de licença para ${currentUser.email} na plataforma de Legislação da Construção Civil.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shrink-0 cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Liberar Licença</span>
            </a>
          </div>
        )}

        {/* Chat Header Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            <span>Consulta Jurídica e Normativa Ativa</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {driveStatus?.configured && driveStatus.files.length > 0
                ? `Google Drive Conectado (${driveStatus.files.length} normas)`
                : 'Banco de Normas Conectado'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Limpar conversa
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 space-y-2">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onViewSourceDoc={handleViewSourceDocByCode}
            />
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 sm:gap-4 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 shrink-0 shadow-xs animate-pulse">
                <Scale className="w-4 h-4" />
              </div>
              <div className="p-4 sm:p-5 bg-white rounded-2xl rounded-tl-xs border border-blue-200 shadow-xs max-w-md space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Consultando Leis e Normas no Google Drive...</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vasculhando a pasta compartilhada e o repertório ABNT, extraindo trechos literais dos artigos e estruturando parecer técnico...
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
      </main>

      {/* Persistent Chat Input Bar */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        onOpenNewDocModal={() => setIsNewDocModalOpen(true)}
      />

      {/* Modal: Document Database Management */}
      <DocumentModal
        isOpen={isDocManagerOpen}
        onClose={() => setIsDocManagerOpen(false)}
        documents={documents}
        driveStatus={driveStatus}
        onToggleActive={handleToggleActiveDoc}
        onDeleteDocument={handleDeleteDocument}
        onOpenNewDocModal={() => {
          setIsDocManagerOpen(false);
          setIsNewDocModalOpen(true);
        }}
        onViewDocument={(doc) => setViewingDocument(doc)}
        onOpenDriveSettings={() => {
          setIsDocManagerOpen(false);
          setIsDriveModalOpen(true);
        }}
      />

      {/* Modal: Google Drive Configuration */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentFolderId={driveFolderId}
        onSaveDriveFolderId={handleSaveDriveFolderId}
        driveStatus={driveStatus}
        onRefreshDrive={() => fetchDriveStatus()}
        isLoading={isDriveLoading}
      />

      {/* Modal: Add New Document (PDF or Direct Text) */}
      <NewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onAddDocument={handleAddDocument}
      />

      {/* Modal: Full Document Viewer */}
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
    </div>
  );
}

