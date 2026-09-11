export type DocumentCategory = 
  | 'acessibilidade' 
  | 'codigo_obras' 
  | 'seguranca_trabalho' 
  | 'desempenho' 
  | 'estrutural' 
  | 'outro';

export type Jurisdiction = 'Federal' | 'Estadual' | 'Municipal' | 'ABNT';

export interface LawDocument {
  id: string;
  title: string;
  code: string;
  category: DocumentCategory;
  jurisdiction: Jurisdiction;
  summary: string;
  content: string;
  sourceType: 'built_in' | 'pdf_upload' | 'text_input';
  fileName?: string;
  dateAdded: string;
  active: boolean;
  pageCount?: number;
}

export type ComplianceStatus = 'conforme' | 'nao_conforme' | 'atencao' | 'informativo';

export interface Citation {
  id: string;
  documentId?: string;
  documentCode: string;
  articleOrItem: string;
  exactText: string;
  interpretation: string;
  practicalImplication?: string;
  sourceDriveLink?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  description?: string;
}

export interface DriveStatus {
  configured: boolean;
  folderId?: string;
  files: DriveFile[];
  error?: string;
  lastChecked?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  token?: string;
}

export interface AuthConfig {
  googleClientId?: string;
  whitelistActive: boolean;
  userEmail?: string;
  isAllowed?: boolean;
  isAdmin?: boolean;
  masterAdminEmail?: string;
}

export interface WhitelistUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  active: boolean;
  createdAt: string;
  lastAccess?: string;
  isMaster?: boolean;
}

export interface SystemDirective {
  id: string;
  title: string;
  code: string;
  category: 'diretriz_geral' | 'norma_tecnica' | 'legislacao' | 'prompt_comportamento';
  description: string;
  content: string;
  active: boolean;
  isBuiltIn?: boolean;
  updatedAt?: string;
}

export interface AnalysisResult {
  verdict: string;
  status: ComplianceStatus;
  practicalGuidance: string[];
  citations: Citation[];
  risksAndPenalties?: string;
  relevantNorms: string[];
  imageObservations?: string;
  sourceDriveFolderId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  image?: {
    dataUrl: string;
    mimeType: string;
    name?: string;
  };
  analysis?: AnalysisResult;
  error?: string;
}

export interface ConsultationRequest {
  prompt: string;
  image?: {
    data: string; // base64 without prefix
    mimeType: string;
  };
  driveFolderId?: string;
  customDocuments?: Array<{
    id: string;
    title: string;
    code: string;
    jurisdiction: string;
    content: string;
  }>;
}

