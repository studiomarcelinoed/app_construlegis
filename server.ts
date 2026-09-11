import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON payload limit to handle image attachments
app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Administrador Mestre Permanente
export const MASTER_ADMIN_EMAIL = "studio@fabianomarcelino.com";

// Arquivos locais para persistência de dados administrativos
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "allowed_users.json");
const DIRECTIVES_FILE = path.join(DATA_DIR, "system_directives.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Erro ao criar pasta data:", e);
  }
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  active: boolean;
  createdAt: string;
  lastAccess?: string;
  isMaster?: boolean;
}

export interface StoredDirective {
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

// Inicialização de Usuários com Whitelist Inicial + Administrador Mestre
function getInitialUsers(): StoredUser[] {
  const users: StoredUser[] = [
    {
      id: "usr-master-01",
      email: MASTER_ADMIN_EMAIL,
      name: "Fabiano Marcelino (Administrador)",
      company: "Estúdio Marcelino",
      active: true,
      createdAt: new Date().toISOString(),
      isMaster: true,
    },
  ];

  // Adiciona e-mails vindos da variável de ambiente ALLOWED_EMAILS se existirem
  const envEmails = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => Boolean(e) && e !== MASTER_ADMIN_EMAIL);

  for (const email of envEmails) {
    if (!users.some((u) => u.email.toLowerCase() === email)) {
      users.push({
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email,
        name: email.split("@")[0],
        company: "Licença Autorizada",
        active: true,
        createdAt: new Date().toISOString(),
        isMaster: false,
      });
    }
  }

  return users;
}

// Inicialização de Diretrizes Padrão do Sistema
function getInitialDirectives(): StoredDirective[] {
  return [
    {
      id: "dir-01",
      title: "Veredito Técnico e Implicações Práticas",
      code: "SISTEMA-DIR-01",
      category: "prompt_comportamento",
      description: "Determina que toda resposta deve abrir com um veredito claro e passos práticos acionáveis para canteiro de obras.",
      content: "Priorize sempre a clareza prática. Aponte se a situação está Conforme, Não Conforme ou sob Atenção. Detalhe o passo a passo de como o engenheiro ou mestre deve agir no canteiro.",
      active: true,
      isBuiltIn: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dir-02",
      title: "Citações Literais e Conexão com Google Drive",
      code: "SISTEMA-DIR-02",
      category: "diretriz_geral",
      description: "Obrigatoriedade de extrair trechos literais dos documentos do Google Drive e citar fontes reais.",
      content: "Para qualquer afirmação técnica, mencione o artigo, item e trecho literal exato presente nas normas da pasta do Google Drive ou da legislação brasileira. Crie links diretos para os arquivos do Drive nos campos de citação.",
      active: true,
      isBuiltIn: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dir-03",
      title: "Análise de Riscos Jurídicos, Multas e Habite-se",
      code: "SISTEMA-DIR-03",
      category: "legislacao",
      description: "Alerta sobre embargos, penalidades de prefeituras, ações judiciais de vizinhos e responsabilidade técnica civil/criminal.",
      content: "Identifique expressamente o risco de embargo de obra, multas fiscais municipais, reprovação de Habite-se, ação de vizinho no prazo decadencial de ano e dia (Art. 1.302 CC) e necessidade de emissão/retificação de ART/RRT.",
      active: true,
      isBuiltIn: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dir-04",
      title: "Acessibilidade ABNT NBR 9050:2020",
      code: "NBR 9050:2020",
      category: "norma_tecnica",
      description: "Parâmetros para rampas (máx 8,33%), vãos de portas (mín 0,80m), escadas (Blondel) e sanitários acessíveis (giro 1,50m).",
      content: "Rampas em novas construções: inclinação máxima de 8,33% com desnível máx 0,80m por lance. Portas em rotas acessíveis: vão livre útil mín 0,80m. Escadas: 63cm <= 2E + P <= 65cm. Sanitários acessíveis: área de manobra com diâmetro mín de 1,50m e barras a 0,75m.",
      active: true,
      isBuiltIn: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "dir-05",
      title: "Direito de Construir e Vizinhança (Código Civil)",
      code: "Arts. 1.299 a 1.313 CC",
      category: "legislacao",
      description: "Distância mínima de 1,50m para janelas e terraços em relação à divisa; 0,75m para visões perpendiculares.",
      content: "Art. 1.301: É defeso abrir janelas ou fazer eirado, terraço ou varanda a menos de metro e meio (1,50m) do terreno vizinho. Janelas perpendiculares/oblíquas: mínimo de 75 cm. Prazo de ano e dia para impugnação e desfazimento (Art. 1.302).",
      active: true,
      isBuiltIn: true,
      updatedAt: new Date().toISOString(),
    },
  ];
}

// Leitura e gravação no disco
export function loadStoredUsers(): StoredUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const list: StoredUser[] = JSON.parse(data);
      // Garante que o MASTER ADMIN sempre exista e esteja ativo
      const hasMaster = list.some((u) => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase());
      if (!hasMaster) {
        list.unshift({
          id: "usr-master-01",
          email: MASTER_ADMIN_EMAIL,
          name: "Fabiano Marcelino (Administrador)",
          company: "Estúdio Marcelino",
          active: true,
          createdAt: new Date().toISOString(),
          isMaster: true,
        });
        saveStoredUsers(list);
      }
      return list;
    }
  } catch (e) {
    console.error("Erro ao ler users.json:", e);
  }
  const defaults = getInitialUsers();
  saveStoredUsers(defaults);
  return defaults;
}

export function saveStoredUsers(users: StoredUser[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar users.json:", e);
  }
}

export function loadStoredDirectives(): StoredDirective[] {
  try {
    if (fs.existsSync(DIRECTIVES_FILE)) {
      const data = fs.readFileSync(DIRECTIVES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Erro ao ler directives.json:", e);
  }
  const defaults = getInitialDirectives();
  saveStoredDirectives(defaults);
  return defaults;
}

export function saveStoredDirectives(directives: StoredDirective[]): void {
  try {
    fs.writeFileSync(DIRECTIVES_FILE, JSON.stringify(directives, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar directives.json:", e);
  }
}

// Verifica se um e-mail possui autorização ativa
export function isEmailAuthorized(rawEmail: string): boolean {
  if (!rawEmail) return false;
  const email = rawEmail.trim().toLowerCase();

  // 1. O Administrador Mestre é permanentemente autorizado
  if (email === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Consulta a lista de usuários ativos no banco local
  const users = loadStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email);
  if (user) {
    return user.active;
  }

  // 3. Fallback para ALLOWED_EMAILS se configurado no .env
  const envEmails = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (envEmails.includes(email)) {
    return true;
  }

  return false;
}

// Helper to extract email from authorization header or request body
function extractUserEmail(req: express.Request): string {
  // 1. From Authorization Bearer (token or email string)
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.includes("@")) {
      return token.toLowerCase();
    }
    // Try to decode JWT payload if it's a Google ID Token
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        if (payload.email) {
          return String(payload.email).toLowerCase();
        }
      }
    } catch {
      // ignore jwt decode error
    }
  }

  // 2. From X-User-Email header
  const customHeader = req.headers["x-user-email"];
  if (typeof customHeader === "string" && customHeader.includes("@")) {
    return customHeader.trim().toLowerCase();
  }

  // 3. From request body
  if (req.body?.userEmail && typeof req.body.userEmail === "string") {
    return req.body.userEmail.trim().toLowerCase();
  }

  return "";
}

// Middleware: Controle de Acesso Restrito Estrito (Whitelist de E-mails com Suporte ao Master Admin)
function checkVipAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userEmail = extractUserEmail(req);

  // Sem e-mail fornecido
  if (!userEmail) {
    return res.status(401).json({
      error: "Autenticação obrigatória. Por favor, faça login com sua conta do Google.",
      code: "AUTH_REQUIRED",
    });
  }

  // O e-mail studio@fabianomarcelino.com é mestre permanente
  if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return next();
  }

  // Validação estrita contra a lista de autorizados
  if (!isEmailAuthorized(userEmail)) {
    console.warn(`[Segurança] Acesso negado para o e-mail: ${userEmail} (403 Forbidden)`);
    return res.status(403).json({
      error: "Acesso não autorizado. Entre em contato com o administrador para solicitar uma licença.",
      code: "VIP_REQUIRED",
      userEmail,
    });
  }

  // Atualiza último acesso
  try {
    const users = loadStoredUsers();
    const u = users.find((x) => x.email.toLowerCase() === userEmail);
    if (u) {
      u.lastAccess = new Date().toISOString();
      saveStoredUsers(users);
    }
  } catch {}

  next();
}

// Middleware: Exclusivo para o Administrador Mestre
function checkMasterAdminAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userEmail = extractUserEmail(req);
  if (!userEmail || userEmail !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: "Acesso restrito exclusivo para o Administrador Mestre do sistema.",
      code: "ADMIN_FORBIDDEN",
    });
  }
  next();
}

// Helper to extract clean Folder ID from a raw ID or full Google Drive URL
function extractDriveFolderId(input?: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Match URLs like: https://drive.google.com/drive/folders/1aBcDeFgHijKlmNoPqrStuVwxYz
  // or https://drive.google.com/drive/u/0/folders/1aBcDeFgHijKlmNoPqrStuVwxYz
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Match query parameter ?id=... or &id=...
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  // Match file or folder /d/ID
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }
  // Clean off query parameters or hashes if only the ID was pasted with them
  return trimmed.split("?")[0].split("#")[0].trim();
}

// Memory cache for Google Drive files to ensure low-latency chat interactions
let driveCache: {
  folderId: string;
  timestamp: number;
  files: any[];
} | null = null;

// Fallback resiliente: extrai arquivos públicos de páginas do Google Drive analisando scripts e dados serializados
async function scrapePublicDriveFolder(folderId: string): Promise<any[]> {
  const files: any[] = [];
  const seenIds = new Set<string>();

  const addFile = (id: string, name: string, mime?: string) => {
    if (!id || id.length < 10 || seenIds.has(id)) return;
    const cleanName = name ? name.trim() : `Documento_${id.slice(0, 6)}`;
    // ignora se o id for a própria pasta
    if (id === folderId) return;

    seenIds.add(id);
    let resolvedMime = mime || "application/octet-stream";
    if (cleanName.toLowerCase().endsWith(".pdf")) {
      resolvedMime = "application/pdf";
    } else if (cleanName.toLowerCase().endsWith(".docx") || cleanName.toLowerCase().endsWith(".doc")) {
      resolvedMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    files.push({
      id,
      name: cleanName,
      mimeType: resolvedMime,
      webViewLink: `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      webContentLink: `https://drive.google.com/uc?export=download&id=${id}`,
    });
  };

  // Tentativa A: HTML da pasta pública padrão (drive.google.com/drive/folders/{id})
  try {
    const folderUrl = `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
    console.log(`[Drive Sync] Consultando página pública da pasta: ${folderUrl}`);
    const res = await fetch(folderUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (res.ok) {
      const html = await res.text();

      // Extração de dados serializados dentro de scripts (window['_drive_state'], AF_dataServiceRequests ou JSONs embutidos)
      const scriptBlocks = html.match(/<script[\s\S]*?<\/script>/gi) || [];
      for (const script of scriptBlocks) {
        // Padrão 1: tuplas com ID de arquivo do Google Drive e nomes de arquivos com extensão (.pdf, .doc, etc.)
        const tupleRegex = /\["([a-zA-Z0-9_-]{25,45})",\s*\["([^"]+\.(?:pdf|doc|docx|txt|rtf|odt|xlsx|xls|pptx|png|jpg|jpeg))"/gi;
        let tMatch;
        while ((tMatch = tupleRegex.exec(script)) !== null) {
          addFile(tMatch[1], tMatch[2]);
        }

        // Padrão 2: arrays com extensão de arquivo seguida de ID
        const filePattern = /"([a-zA-Z0-9_-]{25,45})"[^\]]*?"([^"]*?\.(?:pdf|doc|docx|txt|rtf|odt))"/gi;
        let fMatch;
        while ((fMatch = filePattern.exec(script)) !== null) {
          addFile(fMatch[1], fMatch[2]);
        }
      }

      // Padrão 3: links diretos href="/file/d/ID" ou "https://drive.google.com/file/d/ID"
      const linkRegex = /(?:href="|https:\/\/drive\.google\.com)\/file\/d\/([a-zA-Z0-9_-]{25,45})/gi;
      let lMatch;
      while ((lMatch = linkRegex.exec(html)) !== null) {
        addFile(lMatch[1], `Arquivo_Drive_${lMatch[1].slice(0, 8)}`);
      }
    }
  } catch (err: any) {
    console.warn(`[Drive Sync] Erro ao consultar página da pasta:`, err.message);
  }

  // Tentativa B: Embedded Folder View (embeddedfolderview?id={id})
  if (files.length === 0) {
    try {
      const publicUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
      console.log(`[Drive Sync] Consultando embeddedfolderview: ${publicUrl}`);
      const res = await fetch(publicUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });

      if (res.ok) {
        const html = await res.text();

        // 1. Links em tags <a> com href="/file/d/{id}"
        const aRegex = /href="https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/[^"]*"[^>]*>([^<]+)<\/a>/gi;
        let match;
        while ((match = aRegex.exec(html)) !== null) {
          addFile(match[1], match[2]);
        }

        // 2. data-id / data-name
        const dataRegex = /data-id="([a-zA-Z0-9_-]+)"[^>]*data-name="([^"]+)"/gi;
        while ((match = dataRegex.exec(html)) !== null) {
          addFile(match[1], match[2]);
        }

        // 3. Qualquer menção de file/d/ID no HTML
        const generalFileRegex = /\/file\/d\/([a-zA-Z0-9_-]{25,45})/gi;
        while ((match = generalFileRegex.exec(html)) !== null) {
          addFile(match[1], `Documento_${match[1].slice(0, 8)}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Drive Sync] Erro no embeddedfolderview:`, err.message);
    }
  }

  return files;
}

// Função para buscar a lista de PDFs e documentos da pasta pública/compartilhada do Google Drive
async function buscarNormasDoGoogleDrive(customFolderId?: string, bypassCache = false) {
  const folderId = extractDriveFolderId(customFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    console.log("[Drive Sync] Nenhum folderId válido fornecido.");
    return [];
  }

  // Check cache if less than 45 seconds old (unless bypassed)
  if (!bypassCache && driveCache && driveCache.folderId === folderId && Date.now() - driveCache.timestamp < 45000) {
    console.log(`[Drive Sync] Retornando ${driveCache.files.length} arquivos do cache em memória para a pasta ${folderId}.`);
    return driveCache.files;
  }

  console.log(`[Drive Sync] Iniciando busca resiliente de normas na pasta: ${folderId}`);
  let files: any[] = [];
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,webContentLink,webViewLink,size,description)");

  // 1. Requisição oficial da API do Google Drive v3 com a chave API (se disponível)
  if (apiKey) {
    try {
      const primaryUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=${fields}&key=${apiKey}`;
      console.log(`[Drive Sync] Tentativa 1: API v3 com API Key...`);
      const response = await fetch(primaryUrl);

      if (response.ok) {
        const data: any = await response.json();
        files = data.files || [];
        console.log(`[Drive Sync] Sucesso na API v3! ${files.length} arquivos encontrados.`);
      } else {
        const errText = await response.text();
        console.warn(
          `[Drive Sync] API v3 com Key retornou HTTP ${response.status}: ${errText.slice(0, 200)}. Acionando fallback...`
        );
      }
    } catch (apiErr: any) {
      console.warn("[Drive Sync] Falha na conexão com API v3:", apiErr.message);
    }
  }

  // 2. Tentativa 2: Consulta pública sem API Key (para pastas públicas sem restrição de cota da API)
  if (files.length === 0) {
    try {
      const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=${fields}`;
      console.log(`[Drive Sync] Tentativa 2: API v3 pública sem Key...`);
      const fallbackRes = await fetch(fallbackUrl);

      if (fallbackRes.ok) {
        const data: any = await fallbackRes.json();
        files = data.files || [];
        console.log(`[Drive Sync] Sucesso no endpoint público da API v3! ${files.length} arquivos encontrados.`);
      } else {
        console.warn(`[Drive Sync] Endpoint público retornou HTTP ${fallbackRes.status}. Acionando leitor de página pública...`);
      }
    } catch (fallbackErr: any) {
      console.warn("[Drive Sync] Erro no endpoint público:", fallbackErr.message);
    }
  }

  // 3. Tentativa 3: Parse da página pública da pasta do Google Drive (HTML e scripts serializados)
  if (files.length === 0) {
    console.log(`[Drive Sync] Tentativa 3: Leitura e extração da página pública da pasta...`);
    files = await scrapePublicDriveFolder(folderId);
    console.log(`[Drive Sync] Extração HTML finalizada: ${files.length} arquivos detectados.`);
  }

  // 4. Extração de Conteúdo (Snippets) para Google Docs e arquivos de texto
  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.document") {
      try {
        let docText = "";
        if (apiKey) {
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&supportsAllDrives=true&key=${apiKey}`;
          const exportRes = await fetch(exportUrl);
          if (exportRes.ok) {
            docText = await exportRes.text();
          }
        }
        if (!docText) {
          const publicExportUrl = `https://docs.google.com/document/d/${file.id}/export?format=txt`;
          const publicExportRes = await fetch(publicExportUrl);
          if (publicExportRes.ok) {
            docText = await publicExportRes.text();
          }
        }
        if (docText) {
          file.contentSnippet = docText.slice(0, 5000);
        }
      } catch {
        // ignore export errors
      }
    } else if (file.mimeType === "text/plain" || file.name?.endsWith(".txt") || file.name?.endsWith(".md")) {
      try {
        let text = "";
        if (apiKey) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
          const mediaRes = await fetch(mediaUrl);
          if (mediaRes.ok) {
            text = await mediaRes.text();
          }
        }
        if (!text) {
          const publicMediaUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
          const publicMediaRes = await fetch(publicMediaUrl);
          if (publicMediaRes.ok) {
            text = await publicMediaRes.text();
          }
        }
        if (text) {
          file.contentSnippet = text.slice(0, 5000);
        }
      } catch {
        // ignore media download errors
      }
    }
  }

  // Atualiza cache em memória
  driveCache = {
    folderId,
    timestamp: Date.now(),
    files,
  };

  console.log(`[Drive Sync] Total final de normas sincronizadas para uso da IA: ${files.length}`);
  return files;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  const currentFolderId = extractDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
  res.json({
    status: "ok",
    hasApiKey: Boolean(apiKey),
    hasDriveFolderConfigured: Boolean(currentFolderId),
    driveFolderId: currentFolderId ? `${currentFolderId.slice(0, 6)}...` : undefined,
    timestamp: new Date().toISOString(),
  });
});

// Google Drive status & file list endpoint (Protegido por checkVipAccess)
app.get("/api/drive/status", checkVipAccess, async (req, res) => {
  try {
    const requestedFolder = (req.query.folderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    const folderId = extractDriveFolderId(requestedFolder);
    const bypassCache = req.query.refresh === "true" || req.query.bypassCache === "true";

    if (!folderId) {
      return res.json({
        success: false,
        configured: false,
        folderId: "",
        files: [],
        message: "Nenhum GOOGLE_DRIVE_FOLDER_ID configurado nas variáveis de ambiente ou parâmetros.",
      });
    }

    const files = await buscarNormasDoGoogleDrive(folderId, bypassCache);

    return res.json({
      success: true,
      configured: true,
      folderId,
      files,
      count: files.length,
      lastChecked: new Date().toISOString(),
      message:
        files.length > 0
          ? `${files.length} arquivo(s) carregado(s) da pasta do Google Drive.`
          : "Pasta configurada. Se nenhum arquivo for listado, confirme se a pasta está compartilhada como 'Qualquer pessoa com o link' em modo Leitor.",
    });
  } catch (err: any) {
    console.error("Error in /api/drive/status:", err);
    return res.status(500).json({
      success: false,
      configured: false,
      error: err.message || "Erro ao consultar status da pasta do Google Drive",
    });
  }
});

// Consultation / Chat API Handler (Supports both /api/consult and /api/chat)
const handleConsultation = async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, image, imageBase64, customDocuments, driveFolderId } = req.body;

    if (!prompt && !image && !imageBase64) {
      return res.status(400).json({ error: "É necessário fornecer uma pergunta ou imagem." });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY não configurada no servidor.",
      });
    }

    // 1. Busca os arquivos disponíveis na pasta pública/compartilhada do Google Drive
    const arquivosDrive = await buscarNormasDoGoogleDrive(driveFolderId);
    let driveContext = "";
    if (arquivosDrive.length > 0) {
      const listaFormatada = arquivosDrive
        .map((f: any) => {
          let item = `- [ARQUIVO GOOGLE DRIVE] Nome: "${f.name}" | ID: ${f.id} | Link: ${f.webViewLink || f.webContentLink || "N/A"}`;
          if (f.contentSnippet) {
            item += `\n  Trecho do conteúdo: ${f.contentSnippet.replace(/\n+/g, " ").slice(0, 600)}...`;
          }
          return item;
        })
        .join("\n\n");

      driveContext = `PASTA COMPARTILHADA DO GOOGLE DRIVE (${arquivosDrive.length} documentos disponíveis):\n${listaFormatada}\n`;
    }

    // 2. Diretrizes e instruções ativas configuradas pelo Administrador
    const diretrizes = loadStoredDirectives().filter((d) => d.active);
    let directivesContext = "";
    if (diretrizes.length > 0) {
      directivesContext = `DIRETRIZES TÉCNICAS E DE COMPORTAMENTO DO SISTEMA (CONFIGURADAS PELO ADMINISTRADOR):\n` +
        diretrizes
          .map((d) => `[${d.code} - ${d.title} (${d.category})]\n${d.content}`)
          .join("\n\n") + "\n";
    }

    // 3. Documentos adicionais em memória (se houver)
    let memoryContext = "";
    if (Array.isArray(customDocuments) && customDocuments.length > 0) {
      memoryContext = customDocuments
        .map(
          (doc: any) =>
            `=== DOCUMENTO LOCAL: ${doc.title} (${doc.code}) [Esfera: ${doc.jurisdiction}] ===\n${doc.content}\n`
        )
        .join("\n\n");
    }

    const systemPrompt = `Você é o Consultor Jurídico e Perito Especialista em Legislação da Construção Civil Brasileira (Normas Técnicas ABNT como NBR 9050, NBR 14718, NBR 15575, NR-18, Códigos de Obras Municipais, Lei de Acessibilidade 10.098/2000, Decreto 5.296/2004 e Direito de Vizinhança do Código Civil arts. 1.299 a 1.313).

O BANCO DE DADOS PRINCIPAL DE CONSULTA ESTÁ ARMAZENADO NO GOOGLE DRIVE DO USUÁRIO.
Sua função é analisar a consulta, buscar os trechos correspondentes nos arquivos normativos (Google Drive e repertório ABNT/Legal), interpretar e fornecer um parecer com total confiabilidade técnica e jurídica.

DIRETRIZES CRÍTICAS DE RESPOSTA:
1. Forneça um veredito claro e direto da situação (Conforme, Não Conforme / Irregularidade, Atenção / Exige Adequação, ou Parecer Técnico Informativo).
2. Explique detalhadamente "O que se deve fazer na prática" (passos acionáveis para o engenheiro, arquiteto ou mestre de obras).
3. Apresente trechos e citações literais dos artigos, normas e arquivos consultados.
   - Para cada citação, inclua o código da norma, o item/artigo, o texto literal exato entre aspas, a interpretação técnica e a implicação prática.
   - Se o trecho provém de um arquivo listado na pasta do Google Drive, preencha o campo "sourceDriveLink" com o link direto correspondente daquele arquivo.
4. Alerte sobre riscos jurídicos e administrativos (embargos de obra pela prefeitura, multas, recusa de Habite-se, ação de vizinho no prazo de ano e dia, e responsabilidade técnica civil/criminal com ART/RRT).
5. Se for enviada foto ou planta de obra, analise cotas, dimensões, inclinações e elementos visuais com exatidão.

Retorne ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "verdict": "Resumo executivo claro e direto da situação",
  "status": "conforme" | "nao_conforme" | "atencao" | "informativo",
  "practicalGuidance": [
    "Passo 1: Procedimento prático a executar",
    "Passo 2: Parâmetros numéricos a respeitar",
    "Passo 3: Providências técnicas"
  ],
  "citations": [
    {
      "id": "cit-1",
      "documentCode": "ex: ABNT NBR 9050:2020 ou Código de Obras",
      "articleOrItem": "ex: Item 6.6.2.1 - Inclinação máxima",
      "exactText": "Trecho literal da norma ou do arquivo do Drive",
      "interpretation": "Interpretação técnica e jurídica aplicada",
      "practicalImplication": "O que o construtor/engenheiro precisa fazer na prática",
      "sourceDriveLink": "Link do arquivo no Google Drive (se aplicável, ou null)"
    }
  ],
  "risksAndPenalties": "Explicação dos riscos jurídicos, penalidades administrativas, multas municipais e recusa de habite-se.",
  "relevantNorms": ["Lista de nomes de normas ou leis aplicáveis"],
  "imageObservations": "Opcional: Descrição dos pontos visuais e técnicos identificados na imagem analisada (ou null)."
}`;

    const contents: any[] = [];

    // Support both image (from front-end) and imageBase64 (from user snippet)
    if (image && image.data && image.mimeType) {
      contents.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    } else if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ""),
        },
      });
    }

    // Build consolidated prompt with Drive, Admin Directives and norms context
    let promptContext = "";
    if (directivesContext) {
      promptContext += `${directivesContext}\n`;
    }
    if (driveContext) {
      promptContext += `${driveContext}\n`;
    }
    if (memoryContext) {
      promptContext += `${memoryContext}\n`;
    }
    if (!driveContext && !memoryContext) {
      promptContext += `Utilize o repertório oficial das normas ABNT (NBR 9050, NBR 14718, NBR 15575), Códigos de Obras, NR-18 e Código Civil Brasileiro.\n`;
    }

    const textPrompt = `REPOSITÓRIO DE NORMAS E DOCUMENTOS DO GOOGLE DRIVE:
${promptContext}

CONSULTA DO USUÁRIO:
${prompt || "Por favor, realize a análise técnica e jurídica com base nas normas pertinentes."}`;

    contents.push({
      text: textPrompt,
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contents },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
    } catch (modelErr: any) {
      console.warn("Fallback to gemini-3.8-flash:", modelErr.message);
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts: contents },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
    }

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error("A IA não retornou resposta.");
    }

    try {
      const parsedJson = JSON.parse(responseText);
      // Also provide 'text' attribute for standard chat compatibility
      parsedJson.text = parsedJson.verdict || responseText;
      return res.json(parsedJson);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw output:", responseText);
      return res.json({
        verdict: "Análise processada com ressalvas de formatação.",
        text: responseText,
        status: "informativo",
        practicalGuidance: [
          "Verifique o detalhamento completo dos requisitos normativos.",
          "Consulte o profissional habilitado responsável pelo projeto.",
        ],
        citations: [],
        risksAndPenalties: "Certifique-se de validar todas as cotas e preceitos legais antes da execução.",
        relevantNorms: ["NBR 9050", "Código de Obras", "Código Civil"],
        rawText: responseText,
      });
    }
  } catch (err: any) {
    console.error("Error in /api/consult:", err);
    return res.status(500).json({
      error: err.message || "Ocorreu um erro interno ao processar a consulta.",
    });
  }
};

// Route handlers for consultation (Protegidos por checkVipAccess)
app.post("/api/consult", checkVipAccess, handleConsultation);
app.post("/api/chat", checkVipAccess, handleConsultation);

// Endpoint de verificação de autenticação e configuração pública para o frontend
app.get("/api/auth/config", (req, res) => {
  const userEmail = extractUserEmail(req);
  const isAllowed = userEmail ? isEmailAuthorized(userEmail) : false;
  const isMasterAdmin = userEmail ? userEmail === MASTER_ADMIN_EMAIL.toLowerCase() : false;

  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    whitelistActive: true,
    userEmail: userEmail || undefined,
    isAllowed,
    isMasterAdmin,
    masterAdminEmail: MASTER_ADMIN_EMAIL,
  });
});

// Endpoint de validação de sessão/licença do usuário
app.post("/api/auth/verify", (req, res) => {
  const userEmail = extractUserEmail(req);
  if (!userEmail) {
    return res.status(401).json({
      authenticated: false,
      isAllowed: false,
      error: "Nenhum e-mail de usuário identificado na requisição.",
    });
  }

  const isAllowed = isEmailAuthorized(userEmail);
  const isMasterAdmin = userEmail === MASTER_ADMIN_EMAIL.toLowerCase();

  if (!isAllowed) {
    return res.status(403).json({
      authenticated: true,
      isAllowed: false,
      isMasterAdmin: false,
      userEmail,
      error: "Acesso não autorizado. Entre em contato com o administrador para solicitar uma licença.",
    });
  }

  return res.json({
    authenticated: true,
    isAllowed: true,
    isMasterAdmin,
    userEmail,
    message: isMasterAdmin
      ? "Sessão iniciada como Administrador Mestre permanente."
      : "Acesso autorizado ao repositório jurídico.",
  });
});

// ==========================================
// PAINEL DO ADMINISTRADOR (ROTAS EXCLUSIVAS)
// ==========================================

// 1. Gestão de Usuários da Whitelist
app.get("/api/admin/users", checkMasterAdminAccess, (req, res) => {
  const users = loadStoredUsers();
  res.json({
    success: true,
    users,
    total: users.length,
    activeCount: users.filter((u) => u.active).length,
  });
});

app.post("/api/admin/users", checkMasterAdminAccess, (req, res) => {
  const { email, name, company } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "E-mail válido é obrigatório." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = loadStoredUsers();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: "Este e-mail já está cadastrado na whitelist." });
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    name: (name && String(name).trim()) || cleanEmail.split("@")[0],
    company: (company && String(company).trim()) || "Geral",
    active: true,
    createdAt: new Date().toISOString(),
    isMaster: cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  res.status(201).json({
    success: true,
    user: newUser,
    message: "Usuário adicionado com sucesso à whitelist.",
  });
});

app.patch("/api/admin/users/:id", checkMasterAdminAccess, (req, res) => {
  const { id } = req.params;
  const { active, name, company } = req.body;
  const users = loadStoredUsers();
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  // Não permite desativar o Administrador Mestre
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && active === false) {
    return res.status(400).json({ error: "O Administrador Mestre não pode ser desativado." });
  }

  if (typeof active === "boolean") user.active = active;
  if (typeof name === "string") user.name = name.trim();
  if (typeof company === "string") user.company = company.trim();

  saveStoredUsers(users);
  res.json({ success: true, user, message: "Usuário atualizado com sucesso." });
});

app.delete("/api/admin/users/:id", checkMasterAdminAccess, (req, res) => {
  const { id } = req.params;
  let users = loadStoredUsers();
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: "O Administrador Mestre não pode ser excluído." });
  }

  users = users.filter((u) => u.id !== id);
  saveStoredUsers(users);

  res.json({ success: true, message: "Usuário removido da whitelist com sucesso." });
});

// 2. Gestão de Diretrizes e Leis do Sistema
app.get("/api/admin/directives", checkMasterAdminAccess, (req, res) => {
  const directives = loadStoredDirectives();
  res.json({
    success: true,
    directives,
    total: directives.length,
    activeCount: directives.filter((d) => d.active).length,
  });
});

app.post("/api/admin/directives", checkMasterAdminAccess, (req, res) => {
  const { title, code, category, description, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Título e conteúdo da diretriz são obrigatórios." });
  }

  const directives = loadStoredDirectives();
  const newDirective: StoredDirective = {
    id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: String(title).trim(),
    code: (code && String(code).trim()) || `DIR-${directives.length + 1}`,
    category: category || "diretriz_geral",
    description: (description && String(description).trim()) || "",
    content: String(content).trim(),
    active: true,
    isBuiltIn: false,
    updatedAt: new Date().toISOString(),
  };

  directives.push(newDirective);
  saveStoredDirectives(directives);

  res.status(201).json({
    success: true,
    directive: newDirective,
    message: "Diretriz/Norma adicionada com sucesso.",
  });
});

app.patch("/api/admin/directives/:id", checkMasterAdminAccess, (req, res) => {
  const { id } = req.params;
  const { title, code, category, description, content, active } = req.body;
  const directives = loadStoredDirectives();
  const directive = directives.find((d) => d.id === id);

  if (!directive) {
    return res.status(404).json({ error: "Diretriz não encontrada." });
  }

  if (typeof active === "boolean") directive.active = active;
  if (typeof title === "string") directive.title = title.trim();
  if (typeof code === "string") directive.code = code.trim();
  if (typeof category === "string") directive.category = category as any;
  if (typeof description === "string") directive.description = description.trim();
  if (typeof content === "string") directive.content = content.trim();
  directive.updatedAt = new Date().toISOString();

  saveStoredDirectives(directives);
  res.json({ success: true, directive, message: "Diretriz atualizada com sucesso." });
});

app.delete("/api/admin/directives/:id", checkMasterAdminAccess, (req, res) => {
  const { id } = req.params;
  let directives = loadStoredDirectives();
  const directive = directives.find((d) => d.id === id);

  if (!directive) {
    return res.status(404).json({ error: "Diretriz não encontrada." });
  }

  directives = directives.filter((d) => d.id !== id);
  saveStoredDirectives(directives);

  res.json({ success: true, message: "Diretriz excluída com sucesso." });
});


// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Legislação da Construção Civil rodando em http://localhost:${PORT}`);
  });
}

startServer();
