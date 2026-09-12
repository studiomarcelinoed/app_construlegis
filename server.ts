import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import * as pdfParseModule from "pdf-parse";
const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

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

// Administrador Mestre Permanente e Senha Padrão
export const MASTER_ADMIN_EMAIL = "studio@fabianomarcelino.com";
export const MASTER_ADMIN_DEFAULT_PASSWORD = "Fsm201604!";

// Supabase Client Initialization
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
    : null;

// Helpers de Criptografia e Validação de Senhas
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(plainPassword: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  // Comparação direta (caso texto puro)
  if (plainPassword === storedHash) return true;
  // Comparação SHA-256
  const hashed = hashPassword(plainPassword);
  return hashed.toLowerCase() === storedHash.toLowerCase();
}

// Inicialização e Verificação do Administrador Mestre no Supabase
async function initSupabaseAndMasterAdmin() {
  if (!supabase) {
    console.log("[Supabase] SUPABASE_URL ou SUPABASE_ANON_KEY não informados. O sistema funcionará com fallback local.");
    return;
  }

  try {
    console.log(`[Supabase] Conectando a ${SUPABASE_URL}... Verificando Administrador Mestre (${MASTER_ADMIN_EMAIL})...`);
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("id, email, password_hash, role, must_change_password, is_blocked")
      .eq("email", MASTER_ADMIN_EMAIL.toLowerCase())
      .maybeSingle();

    if (error) {
      console.warn("[Supabase] Aviso ao consultar tabela 'users':", error.message);
      console.warn("[Supabase] Dica: Certifique-se de que a tabela 'users' existe no Supabase com as colunas: id, email, password_hash, name, role, must_change_password, is_blocked.");
      return;
    }

    if (!existingUser) {
      console.log(`[Supabase] Administrador Mestre (${MASTER_ADMIN_EMAIL}) não encontrado. Criando automaticamente...`);
      const masterUserRecord = {
        email: MASTER_ADMIN_EMAIL.toLowerCase(),
        name: "Fabiano Marcelino (Administrador Mestre)",
        password_hash: hashPassword(MASTER_ADMIN_DEFAULT_PASSWORD),
        role: "ADM",
        must_change_password: false,
        is_blocked: false,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert([masterUserRecord])
        .select()
        .single();

      if (insertError) {
        console.error("[Supabase] Erro ao cadastrar Administrador Mestre:", insertError.message);
      } else {
        console.log(`[Supabase] Administrador Mestre cadastrado com sucesso! ID: ${inserted?.id}, Role: ADM`);
      }
    } else {
      console.log(`[Supabase] Administrador Mestre (${MASTER_ADMIN_EMAIL}) já existe no banco. Role: ${existingUser.role}`);
      if (existingUser.role !== "ADM") {
        await supabase.from("users").update({ role: "ADM" }).eq("email", MASTER_ADMIN_EMAIL.toLowerCase());
      }
    }
  } catch (err: any) {
    console.error("[Supabase] Falha ao inicializar Supabase:", err.message);
  }
}

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
  password?: string;
  passwordChanged?: boolean;
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
      password: MASTER_ADMIN_DEFAULT_PASSWORD,
      passwordChanged: false,
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
        password: `Constru@${Math.floor(1000 + Math.random() * 9000)}`,
        passwordChanged: false,
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
      let needsSave = false;

      // Garante que o MASTER ADMIN sempre exista, esteja ativo e tenha senha configurada
      const masterIdx = list.findIndex((u) => u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase());
      if (masterIdx === -1) {
        list.unshift({
          id: "usr-master-01",
          email: MASTER_ADMIN_EMAIL,
          name: "Fabiano Marcelino (Administrador)",
          company: "Estúdio Marcelino",
          password: MASTER_ADMIN_DEFAULT_PASSWORD,
          passwordChanged: false,
          active: true,
          createdAt: new Date().toISOString(),
          isMaster: true,
        });
        needsSave = true;
      } else {
        if (!list[masterIdx].password) {
          list[masterIdx].password = MASTER_ADMIN_DEFAULT_PASSWORD;
          needsSave = true;
        }
        if (!list[masterIdx].active) {
          list[masterIdx].active = true;
          needsSave = true;
        }
      }

      if (needsSave) {
        saveStoredUsers(list);
      }
      return list;
    }
  } catch (e) {
    console.error("Erro ao ler allowed_users.json:", e);
  }
  const defaults = getInitialUsers();
  saveStoredUsers(defaults);
  return defaults;
}

export function saveStoredUsers(users: StoredUser[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar allowed_users.json:", e);
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

// Middleware: Exclusivo para o Administrador Mestre ou perfil ADM
async function checkMasterAdminAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userEmail = extractUserEmail(req);
  if (!userEmail) {
    return res.status(403).json({
      error: "Acesso restrito exclusivo para o Administrador (ADM).",
      code: "ADMIN_FORBIDDEN",
    });
  }

  // 1. studio@fabianomarcelino.com é Administrador Mestre permanente
  if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return next();
  }

  // 2. Consulta no Supabase se o usuário possui role === 'ADM' e não está bloqueado
  if (supabase) {
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role, is_blocked")
        .eq("email", userEmail)
        .maybeSingle();

      if (dbUser && !dbUser.is_blocked && dbUser.role === "ADM") {
        return next();
      }
    } catch {}
  }

  // 3. Consulta no banco local
  const users = loadStoredUsers();
  const u = users.find((x) => x.email.toLowerCase() === userEmail);
  if (u && u.active && (u.isMaster || (u as any).role === "ADM")) {
    return next();
  }

  return res.status(403).json({
    error: "Acesso restrito exclusivo para o perfil ADM ou Administrador Mestre do sistema.",
    code: "ADMIN_FORBIDDEN",
  });
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

// Helper para requisições com timeout controlado (evita travamentos e timeouts do container)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper para extração resiliente de texto de PDFs utilizando pdfParse (compatível com v1 e v2)
async function parsePdfBuffer(pdfBuffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    // 1. Caso pdfParse seja função direta v1 (ex: pdfParse(buffer))
    if (typeof pdfParse === "function" && !pdfParse.prototype?.load) {
      const res = await pdfParse(pdfBuffer);
      return {
        text: res?.text || "",
        numpages: res?.numpages || 1,
      };
    }

    // 2. Caso pdfParse seja/contenha a classe PDFParse (v2)
    const ParserClass = pdfParse?.PDFParse || (typeof pdfParse === "function" ? pdfParse : null);
    if (ParserClass) {
      const parser = new ParserClass({ data: pdfBuffer });
      await parser.load();
      const resultText = await parser.getText();
      const text = typeof resultText === "string" ? resultText : (resultText?.text || "");
      const info = await parser.getInfo().catch(() => null);
      const numpages = info?.total || 1;
      await parser.destroy().catch(() => {});
      return { text, numpages };
    }
  } catch (err: any) {
    console.warn("[PDFParse] Fallback na extração do PDF:", err.message || err);
  }

  // 3. Fallback de streams de texto para documentos simples
  try {
    const raw = pdfBuffer.toString("latin1");
    const matches = raw.match(/\(([^)]{3,})\)\s*Tj/g);
    if (matches && matches.length > 0) {
      const extracted = matches.map((m) => m.slice(1, -3)).join(" ").replace(/\s+/g, " ");
      return { text: extracted, numpages: 1 };
    }
  } catch {
    // ignore
  }
  return { text: "", numpages: 1 };
}

// Estrutura de blocos de texto (chunks) para a estratégia de RAG Leve
export interface DocumentChunk {
  id: string;
  fileId: string;
  fileName: string;
  webViewLink?: string;
  webContentLink?: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  charCount: number;
}

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
  matchedTerms: string[];
}

// Memory cache for Google Drive files to ensure low-latency chat interactions
let driveCache: {
  folderId: string;
  timestamp: number;
  files: any[];
} | null = null;

// Cache persistente em memória para textos completos e blocos estruturados de documentos
const driveContentCache = new Map<
  string,
  {
    fullText: string;
    snippet: string;
    pageCount?: number;
    timestamp: number;
    chunks: DocumentChunk[];
  }
>();

// Acervo global em memória contendo todos os chunks indexados das normas do Google Drive
let globalDriveChunks: DocumentChunk[] = [];

// Divide o texto de cada norma/lei em blocos menores (chunks) de aprox. 1000 a 1500 caracteres
function chunkDocumentText(
  file: { id: string; name: string; webViewLink?: string; webContentLink?: string },
  fullText: string,
  targetChunkSize = 1250,
  overlap = 150
): DocumentChunk[] {
  if (!fullText || typeof fullText !== "string" || !fullText.trim()) {
    return [];
  }

  const clean = fullText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + targetChunkSize;

    if (endIndex < clean.length) {
      // Prioridade 1: Quebra de parágrafo duplo (\n\n)
      const paragraphBreak = clean.lastIndexOf("\n\n", endIndex);
      // Prioridade 2: Fim de frase (. ou ; ou :)
      const sentenceBreak = Math.max(
        clean.lastIndexOf(". ", endIndex),
        clean.lastIndexOf(";\n", endIndex),
        clean.lastIndexOf(".\n", endIndex),
        clean.lastIndexOf(":\n", endIndex)
      );
      // Prioridade 3: Quebra de linha simples (\n)
      const lineBreak = clean.lastIndexOf("\n", endIndex);

      if (paragraphBreak > startIndex + targetChunkSize * 0.6) {
        endIndex = paragraphBreak + 2;
      } else if (sentenceBreak > startIndex + targetChunkSize * 0.6) {
        endIndex = sentenceBreak + 2;
      } else if (lineBreak > startIndex + targetChunkSize * 0.6) {
        endIndex = lineBreak + 1;
      }
    } else {
      endIndex = clean.length;
    }

    const chunkContent = clean.slice(startIndex, endIndex).trim();
    if (chunkContent.length >= 35) {
      chunks.push({
        id: `${file.id}_chunk_${chunkIndex}`,
        fileId: file.id,
        fileName: file.name,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        chunkIndex,
        totalChunks: 0, // atualizado abaixo
        text: chunkContent,
        charCount: chunkContent.length,
      });
      chunkIndex++;
    }

    if (endIndex >= clean.length) break;
    // Garante avanço com sobreposição controlada
    startIndex = Math.max(endIndex - overlap, startIndex + 50);
  }

  // Define totalChunks para todos os blocos do arquivo
  for (const c of chunks) {
    c.totalChunks = chunks.length;
  }

  return chunks;
}

// Stopwords em Português Brasileiro para filtragem de ruído textual
const PT_STOPWORDS = new Set([
  "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aquilo", "as", "ate", "com", "como",
  "da", "das", "de", "dela", "delas", "dele", "deles", "depois", "do", "dos", "e", "ela", "elas",
  "ele", "eles", "em", "entre", "era", "eram", "eramos", "essa", "essas", "esse", "esses", "esta",
  "estas", "este", "estes", "estou", "eu", "foi", "fomos", "foram", "ha", "isso", "isto", "ja", "lhe",
  "lhes", "mais", "mas", "me", "mesmo", "meu", "meus", "minha", "minhas", "muito", "na", "nao", "nas",
  "nem", "no", "nos", "nossa", "nossas", "nosso", "nossos", "num", "numa", "o", "os", "ou", "para",
  "pela", "pelas", "pelo", "pelos", "por", "qual", "quais", "quando", "que", "quem", "se", "seja",
  "sejam", "sem", "ser", "seu", "seus", "so", "sua", "suas", "tambem", "te", "tem", "temos", "tenho",
  "teu", "teus", "tinha", "tinham", "tu", "tua", "tuas", "um", "uma", "voce", "voces", "vos",
  "sobre", "posso", "pode", "podem", "deve", "devem", "quanto", "quantos", "quantas", "qualquer",
  "onde", "dizer", "fazer", "saber", "obrigado", "favor", "gostaria"
]);

// Normaliza texto para correspondência insensível a maiúsculas e acentos
function normalizePtText(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Extrai palavras-chave e tokens técnicos da consulta do usuário
function extractKeywords(query: string): string[] {
  const norm = normalizePtText(query);
  const rawTokens = norm.match(/[a-z0-9_]{2,}/g) || [];
  const validTokens = rawTokens.filter((t) => !PT_STOPWORDS.has(t) && t.length >= 2);
  return Array.from(new Set(validTokens));
}

// Retrieval Engine: seleciona os 10 a 15 blocos mais relevantes com base nas palavras da pergunta do usuário
function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  maxResults = 15
): ScoredChunk[] {
  if (!chunks || chunks.length === 0) return [];

  const queryTerms = extractKeywords(query);
  const normQuery = normalizePtText(query);

  // Se a consulta não contiver termos específicos (ex: apenas envio de imagem ou pergunta genérica),
  // seleciona uma amostragem representativa inicial dos documentos
  if (queryTerms.length === 0) {
    const defaultChunks: ScoredChunk[] = [];
    const seenFiles = new Set<string>();
    for (const chunk of chunks) {
      if (!seenFiles.has(chunk.fileId)) {
        seenFiles.add(chunk.fileId);
        defaultChunks.push({ chunk, score: 1.0, matchedTerms: ["amostra_inicial"] });
      }
      if (defaultChunks.length >= Math.min(12, maxResults)) break;
    }
    for (const chunk of chunks) {
      if (defaultChunks.length >= Math.min(10, maxResults)) break;
      if (!defaultChunks.some((sc) => sc.chunk.id === chunk.id)) {
        defaultChunks.push({ chunk, score: 0.5, matchedTerms: ["amostra_inicial"] });
      }
    }
    return defaultChunks;
  }

  const scored: ScoredChunk[] = [];

  for (const chunk of chunks) {
    const normChunkText = normalizePtText(chunk.text);
    const normFileName = normalizePtText(chunk.fileName);

    let score = 0;
    const matchedTerms: string[] = [];

    // 1. Relevância por correspondência no título da lei/arquivo (ex: "9050", "14718", "obras")
    for (const term of queryTerms) {
      if (normFileName.includes(term)) {
        score += 18.0;
        matchedTerms.push(`arquivo:${term}`);
      }
    }

    // 2. Frequência ponderada de termos técnicos e legais no corpo do bloco
    let uniqueTermsInBody = 0;
    for (const term of queryTerms) {
      let count = 0;
      let pos = 0;
      while ((pos = normChunkText.indexOf(term, pos)) !== -1) {
        count++;
        pos += term.length;
      }

      if (count > 0) {
        uniqueTermsInBody++;
        matchedTerms.push(term);

        const isNumeric = /^\d+$/.test(term);
        const isNormCode = term.startsWith("nbr") || term.startsWith("nr") || isNumeric;
        const isTechnicalKeyword = [
          "rampa", "inclinacao", "desnivel", "corrimao", "guarda", "corpo", "afastamento",
          "recuo", "janela", "parede", "habite", "acessibilidade", "escada", "degrau", "artigo", "item"
        ].includes(term);

        const weight = isNormCode ? 4.5 : isTechnicalKeyword ? 3.0 : 1.5;
        score += Math.log2(1 + count) * 3.5 * weight;
      }
    }

    // 3. Cobertura conjuntiva: bônus multiplicativo quando o bloco responde a múltiplos termos simultaneamente
    if (queryTerms.length > 1 && uniqueTermsInBody > 1) {
      const coverageRatio = uniqueTermsInBody / queryTerms.length;
      score *= 1.0 + coverageRatio * 2.0;
      score += uniqueTermsInBody * 4.0;
    }

    // 4. Bônus por frase exata
    if (normQuery.length >= 7 && normChunkText.includes(normQuery)) {
      score += 25.0;
      matchedTerms.push("frase_exata");
    }

    if (score > 0) {
      scored.push({ chunk, score, matchedTerms });
    }
  }

  // Ordena decrescente por relevância
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const topResults = scored.slice(0, Math.min(maxResults, 15));
    // Assegura pelo menos 10 blocos selecionados caso existam outros blocos disponíveis
    if (topResults.length < 10 && scored.length > topResults.length) {
      for (const item of scored.slice(topResults.length)) {
        if (topResults.length >= 10) break;
        topResults.push(item);
      }
    }
    return topResults.slice(0, 15);
  }

  // Fallback: se nenhum termo obteve match direto, seleciona os 10 primeiros blocos do acervo
  return chunks.slice(0, Math.min(10, maxResults)).map((chunk) => ({
    chunk,
    score: 0.1,
    matchedTerms: ["padrao"],
  }));
}

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
    const res = await fetchWithTimeout(folderUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }, 7000);

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
      const res = await fetchWithTimeout(publicUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      }, 7000);

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

// Função para buscar a lista de PDFs e documentos reais da pasta pública/compartilhada do Google Drive
async function buscarNormasDoGoogleDrive(customFolderId?: string, bypassCache = false) {
  const folderId = extractDriveFolderId(customFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    console.log("[Drive Sync] Nenhum folderId válido fornecido.");
    return [];
  }

  // Check cache if less than 45 seconds old (unless bypassed)
  if (!bypassCache && driveCache && driveCache.folderId === folderId && Date.now() - driveCache.timestamp < 45000) {
    console.log(`[Drive Sync] Retornando ${driveCache.files.length} arquivos do cache em memória para a pasta ${folderId}.`);
    if (globalDriveChunks.length === 0 && driveCache.files.length > 0) {
      globalDriveChunks = driveCache.files.flatMap((f: any) => f.chunks || []);
    }
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
      const response = await fetchWithTimeout(primaryUrl, {}, 8000);

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
      const fallbackRes = await fetchWithTimeout(fallbackUrl, {}, 8000);

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

  // 4. Extração de Conteúdo Real e Particionamento em Chunks (PDFs, Google Docs e arquivos de texto)
  for (const file of files) {
    // 4.1. Verifica cache em memória
    if (driveContentCache.has(file.id)) {
      const cached = driveContentCache.get(file.id)!;
      file.fullText = cached.fullText;
      file.contentSnippet = cached.snippet;
      file.chunks = cached.chunks || [];
      file.chunksCount = file.chunks.length;
      if (cached.pageCount) file.pageCount = cached.pageCount;
      continue;
    }

    // 4.2. Leitura de PDFs Reais
    if (file.mimeType === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
      try {
        let pdfBuffer: Buffer | null = null;
        if (apiKey) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
          const mediaRes = await fetchWithTimeout(mediaUrl, {}, 9000);
          if (mediaRes.ok) {
            const ab = await mediaRes.arrayBuffer();
            pdfBuffer = Buffer.from(ab);
          }
        }
        if (!pdfBuffer) {
          const downloadUrl = `https://drive.usercontent.google.com/download?id=${file.id}&export=download&confirm=t`;
          const dlRes = await fetchWithTimeout(downloadUrl, { redirect: "follow" }, 9000);
          if (dlRes.ok) {
            const ab = await dlRes.arrayBuffer();
            pdfBuffer = Buffer.from(ab);
          }
        }
        if (!pdfBuffer) {
          const ucUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
          const ucRes = await fetchWithTimeout(ucUrl, { redirect: "follow" }, 9000);
          if (ucRes.ok) {
            const ab = await ucRes.arrayBuffer();
            pdfBuffer = Buffer.from(ab);
          }
        }

        if (pdfBuffer && pdfBuffer.length > 0) {
          const parsed = await parsePdfBuffer(pdfBuffer);
          const rawText = (parsed.text || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
          if (rawText) {
            const fullText = rawText.slice(0, 120000);
            const snippet = rawText.slice(0, 4000);
            const chunks = chunkDocumentText(file, fullText);
            file.fullText = fullText;
            file.contentSnippet = snippet;
            file.pageCount = parsed.numpages;
            file.chunks = chunks;
            file.chunksCount = chunks.length;
            driveContentCache.set(file.id, {
              fullText,
              snippet,
              pageCount: parsed.numpages,
              timestamp: Date.now(),
              chunks,
            });
            console.log(`[Drive PDF RAG] PDF lido: "${file.name}" (${parsed.numpages} pág., ${chunks.length} blocos criados).`);
          }
        }
      } catch (pdfErr: any) {
        console.warn(`[Drive PDF] Aviso na leitura do PDF "${file.name}":`, pdfErr.message || pdfErr);
      }
    } else if (file.mimeType === "application/vnd.google-apps.document") {
      // 4.3. Google Docs export
      try {
        let docText = "";
        if (apiKey) {
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&supportsAllDrives=true&key=${apiKey}`;
          const exportRes = await fetchWithTimeout(exportUrl, {}, 8000);
          if (exportRes.ok) {
            docText = await exportRes.text();
          }
        }
        if (!docText) {
          const publicExportUrl = `https://docs.google.com/document/d/${file.id}/export?format=txt`;
          const publicExportRes = await fetchWithTimeout(publicExportUrl, {}, 8000);
          if (publicExportRes.ok) {
            docText = await publicExportRes.text();
          }
        }
        if (docText) {
          const fullText = docText.slice(0, 120000);
          const snippet = docText.slice(0, 4000);
          const chunks = chunkDocumentText(file, fullText);
          file.fullText = fullText;
          file.contentSnippet = snippet;
          file.chunks = chunks;
          file.chunksCount = chunks.length;
          driveContentCache.set(file.id, { fullText, snippet, timestamp: Date.now(), chunks });
          console.log(`[Drive Doc RAG] Documento "${file.name}" processado: ${chunks.length} blocos criados.`);
        }
      } catch (docErr: any) {
        console.warn(`[Drive Doc] Erro ao exportar documento "${file.name}":`, docErr.message);
      }
    } else if (file.mimeType === "text/plain" || file.name?.endsWith(".txt") || file.name?.endsWith(".md")) {
      // 4.4. Arquivos de texto / markdown
      try {
        let text = "";
        if (apiKey) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
          const mediaRes = await fetchWithTimeout(mediaUrl, {}, 8000);
          if (mediaRes.ok) {
            text = await mediaRes.text();
          }
        }
        if (!text) {
          const publicMediaUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
          const publicMediaRes = await fetchWithTimeout(publicMediaUrl, {}, 8000);
          if (publicMediaRes.ok) {
            text = await publicMediaRes.text();
          }
        }
        if (text) {
          const fullText = text.slice(0, 120000);
          const snippet = text.slice(0, 4000);
          const chunks = chunkDocumentText(file, fullText);
          file.fullText = fullText;
          file.contentSnippet = snippet;
          file.chunks = chunks;
          file.chunksCount = chunks.length;
          driveContentCache.set(file.id, { fullText, snippet, timestamp: Date.now(), chunks });
          console.log(`[Drive Txt RAG] Arquivo de texto "${file.name}" processado: ${chunks.length} blocos criados.`);
        }
      } catch (txtErr: any) {
        console.warn(`[Drive Txt] Erro ao carregar arquivo de texto "${file.name}":`, txtErr.message);
      }
    }
  }

  // 5. Consolidação e indexação do acervo de chunks em memória
  const allIndexedChunks: DocumentChunk[] = [];
  for (const file of files) {
    if (!file.chunks || file.chunks.length === 0) {
      const fallbackText = file.fullText || file.contentSnippet || `DOCUMENTO NORMATIVO: ${file.name}\nIdentificador: ${file.id}\nTipo: ${file.mimeType}\nLink de Consulta: ${file.webViewLink || file.webContentLink || "N/A"}\n(Documento do acervo técnico no Google Drive).`;
      const fallbackChunks = chunkDocumentText(file, fallbackText);
      file.chunks = fallbackChunks;
      file.chunksCount = fallbackChunks.length;
    }
    allIndexedChunks.push(...(file.chunks || []));
  }

  globalDriveChunks = allIndexedChunks;

  // Atualiza cache em memória
  driveCache = {
    folderId,
    timestamp: Date.now(),
    files,
  };

  console.log(`[Drive Sync] Total final de normas sincronizadas: ${files.length} arquivos (${globalDriveChunks.length} blocos no acervo RAG).`);
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
      totalChunks: globalDriveChunks.length,
      lastChecked: new Date().toISOString(),
      message:
        files.length > 0
          ? `${files.length} arquivo(s) carregado(s) da pasta do Google Drive (${globalDriveChunks.length} blocos indexados no RAG).`
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

    // Garante que o acervo de blocos em memória esteja sincronizado
    if (globalDriveChunks.length === 0 && arquivosDrive.length > 0) {
      globalDriveChunks = arquivosDrive.flatMap((f: any) => f.chunks || []);
    }

    // 2. RAG Leve: Recuperação seletiva dos 10 a 15 blocos mais relevantes com base na pergunta
    const userQuery = String(prompt || "");
    const relevantChunks = retrieveRelevantChunks(userQuery, globalDriveChunks, 15);

    let driveContext = "";
    if (relevantChunks.length > 0) {
      const blocosFormatados = relevantChunks
        .map((item, idx) => {
          const c = item.chunk;
          let bloco = `[BLOCO NORMATIVO RELEVANTE #${idx + 1} | Relevância: ${item.score.toFixed(1)}]`;
          bloco += `\nARQUIVO / LEI DE ORIGEM: "${c.fileName}" (Bloco ${c.chunkIndex + 1} de ${c.totalChunks})`;
          bloco += `\nID DO ARQUIVO: ${c.fileId}`;
          if (c.webViewLink || c.webContentLink) {
            bloco += `\nLINK GOOGLE DRIVE: ${c.webViewLink || c.webContentLink}`;
          }
          bloco += `\nCONTEÚDO NORMATIVO LITERAL DO BLOCO:\n"""\n${c.text}\n"""`;
          return bloco;
        })
        .join("\n\n");

      driveContext = `ACERVO DE NORMAS DO GOOGLE DRIVE (RAG LEVE - BLOCOS SELECIONADOS POR RELEVÂNCIA):\n` +
        `Total no acervo: ${arquivosDrive.length} normas (${globalDriveChunks.length} blocos indexados em memória).\n` +
        `Foram selecionados os seguintes ${relevantChunks.length} blocos de maior relevância para responder à dúvida técnica:\n\n` +
        blocosFormatados + "\n";
    } else if (arquivosDrive.length > 0) {
      const listaSimples = arquivosDrive
        .map((f: any) => `- [ARQUIVO GOOGLE DRIVE] Nome: "${f.name}" | ID: ${f.id} | Link: ${f.webViewLink || "N/A"}`)
        .join("\n");
      driveContext = `PASTA COMPARTILHADA DO GOOGLE DRIVE (${arquivosDrive.length} documentos disponíveis):\n${listaSimples}\n`;
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

    // Função auxiliar para detecção de erro 503 (UNAVAILABLE / high demand / overloaded)
    const isGemini503Unavailable = (err: any): boolean => {
      if (!err) return false;
      if (err.status === 503 || err.code === 503 || err.statusCode === 503) return true;
      if (err.status === "UNAVAILABLE" || err.code === "UNAVAILABLE") return true;
      if (err.error && (err.error.code === 503 || err.error.status === "UNAVAILABLE")) return true;
      const str = (err.message || (typeof err === "string" ? err : "")).toLowerCase();
      return (
        str.includes("503") ||
        str.includes("unavailable") ||
        str.includes("high demand") ||
        str.includes("overloaded") ||
        str.includes("temporarily unavailable") ||
        str.includes("service unavailable") ||
        str.includes("resource has been exhausted")
      );
    };

    // Chamada com retry automático de 2 segundos caso retorne 503 (UNAVAILABLE / high demand)
    const callModelWithRetry = async (modelName: string) => {
      try {
        return await ai.models.generateContent({
          model: modelName,
          contents: { parts: contents },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
      } catch (err: any) {
        if (isGemini503Unavailable(err)) {
          console.warn(`[Gemini 503 UNAVAILABLE] Modelo ${modelName} sobrecarregado. Aguardando 2 segundos para nova tentativa automática...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log(`[Gemini Retry] Executando segunda tentativa para o modelo ${modelName}...`);
          return await ai.models.generateContent({
            model: modelName,
            contents: { parts: contents },
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });
        }
        throw err;
      }
    };

    let response;
    try {
      response = await callModelWithRetry("gemini-3.6-flash");
    } catch (modelErr: any) {
      if (isGemini503Unavailable(modelErr)) {
        console.warn("gemini-3.6-flash persistiu em 503 após retry. Tentando modelo alternativo gemini-3.8-flash...");
        try {
          response = await callModelWithRetry("gemini-3.8-flash");
        } catch (secondErr: any) {
          if (isGemini503Unavailable(secondErr)) {
            console.error("Gemini persistiu em 503 (UNAVAILABLE) após retries:", secondErr.message);
            return res.status(503).json({
              error: "O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.",
              code: 503,
              status: "UNAVAILABLE",
            });
          }
          throw secondErr;
        }
      } else {
        console.warn("Fallback para gemini-3.8-flash:", modelErr.message);
        try {
          response = await callModelWithRetry("gemini-3.8-flash");
        } catch (secondErr: any) {
          if (isGemini503Unavailable(secondErr)) {
            console.error("Gemini 503 em modelo alternativo:", secondErr.message);
            return res.status(503).json({
              error: "O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.",
              code: 503,
              status: "UNAVAILABLE",
            });
          }
          throw secondErr;
        }
      }
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
    const errString = (err?.message || String(err || "")).toLowerCase();
    if (
      err?.status === 503 ||
      err?.code === 503 ||
      err?.statusCode === 503 ||
      errString.includes("503") ||
      errString.includes("unavailable") ||
      errString.includes("high demand") ||
      errString.includes("overloaded")
    ) {
      return res.status(503).json({
        error: "O serviço da IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.",
        code: 503,
        status: "UNAVAILABLE",
      });
    }
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

// Endpoint de login por e-mail e senha com suporte a Supabase e fallback local
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      error: "Por favor, informe seu e-mail e sua senha de acesso.",
      code: "MISSING_CREDENTIALS",
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // 1. Verificação no Supabase (se configurado)
  if (supabase) {
    try {
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("id, email, name, password_hash, role, must_change_password, is_blocked")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!dbError && dbUser) {
        // Verifica se o usuário está bloqueado
        if (dbUser.is_blocked) {
          return res.status(403).json({
            success: false,
            code: "USER_BLOCKED",
            userEmail: cleanEmail,
            error: "Usuário bloqueado no sistema. Entre em contato com o Administrador.",
          });
        }

        // Validação da senha com suporte a SHA-256 e texto
        const passwordValid = verifyPassword(cleanPassword, dbUser.password_hash);
        if (!passwordValid) {
          return res.status(401).json({
            success: false,
            code: "INVALID_PASSWORD",
            error: "Senha de acesso incorreta. Verifique as credenciais ou solicite a recuperação de senha com o Administrador.",
          });
        }

        const isMaster = dbUser.role === "ADM" || cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();

        return res.json({
          success: true,
          user: {
            id: String(dbUser.id),
            email: dbUser.email,
            name: dbUser.name || cleanEmail.split("@")[0],
            role: dbUser.role || (isMaster ? "ADM" : "USER"),
            isMaster,
            must_change_password: Boolean(dbUser.must_change_password),
            is_blocked: Boolean(dbUser.is_blocked),
            token: dbUser.email,
          },
          must_change_password: Boolean(dbUser.must_change_password),
          message: isMaster
            ? "Sessão iniciada como Administrador Mestre."
            : "Acesso autorizado com sucesso.",
        });
      }
    } catch (err: any) {
      console.warn("[Supabase] Aviso ao consultar login no Supabase:", err.message);
    }
  }

  // 2. Fallback local em memória/arquivo (caso Supabase ainda não tenha sido conectado)
  const users = loadStoredUsers();
  let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Se for o master admin e não constar na lista local, assegura existência
  if (!user && cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
    user = {
      id: "usr-master-01",
      email: MASTER_ADMIN_EMAIL,
      name: "Fabiano Marcelino (Administrador Mestre)",
      company: "Estúdio Marcelino",
      password: MASTER_ADMIN_DEFAULT_PASSWORD,
      passwordChanged: true,
      active: true,
      createdAt: new Date().toISOString(),
      isMaster: true,
    };
    users.push(user);
    saveStoredUsers(users);
  }

  if (!user) {
    return res.status(403).json({
      success: false,
      code: "VIP_REQUIRED",
      userEmail: cleanEmail,
      error: "E-mail não cadastrado na lista de acessos autorizados. Solicite sua licença com o Administrador.",
    });
  }

  if (!user.active) {
    return res.status(403).json({
      success: false,
      code: "USER_BLOCKED",
      userEmail: cleanEmail,
      error: "Usuário bloqueado no sistema. Entre em contato com o Administrador.",
    });
  }

  // Verifica senha
  const expectedPassword = user.password || (user.isMaster ? MASTER_ADMIN_DEFAULT_PASSWORD : "");
  if (!expectedPassword || !verifyPassword(cleanPassword, expectedPassword)) {
    return res.status(401).json({
      success: false,
      code: "INVALID_PASSWORD",
      error: "Senha de acesso incorreta. Verifique as credenciais ou solicite a recuperação de senha com o Administrador.",
    });
  }

  // Atualiza último acesso
  user.lastAccess = new Date().toISOString();
  saveStoredUsers(users);

  const mustChange = !user.passwordChanged;
  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.isMaster ? "ADM" : "USER",
      isMaster: Boolean(user.isMaster),
      must_change_password: mustChange,
      is_blocked: !user.active,
      token: user.email,
    },
    must_change_password: mustChange,
    message: user.isMaster
      ? "Sessão iniciada como Administrador Mestre permanente."
      : "Acesso autorizado com sucesso.",
  });
});

// Endpoint de alteração de senha pelo próprio usuário autenticado
app.post("/api/auth/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const userEmail = extractUserEmail(req) || (email ? String(email).trim().toLowerCase() : "");

  if (!userEmail) {
    return res.status(401).json({
      success: false,
      error: "Sessão expirada ou usuário não autenticado.",
    });
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      error: "A nova senha deve ter no mínimo 4 caracteres.",
    });
  }

  const cleanNewPassword = newPassword.trim();
  const newHash = hashPassword(cleanNewPassword);

  // 1. Atualiza no Supabase se disponível
  if (supabase) {
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("id, email, password_hash, must_change_password")
        .eq("email", userEmail)
        .maybeSingle();

      if (dbUser) {
        if (currentPassword && !verifyPassword(String(currentPassword).trim(), dbUser.password_hash)) {
          return res.status(401).json({
            success: false,
            error: "A senha atual informada está incorreta.",
          });
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({
            password_hash: newHash,
            must_change_password: false,
          })
          .eq("email", userEmail);

        if (updateError) {
          console.error("[Supabase] Erro ao atualizar senha no Supabase:", updateError.message);
        } else {
          console.log(`[Supabase] Senha atualizada e must_change_password=false para ${userEmail}`);
        }
      } else if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
        await supabase.from("users").insert([{
          email: MASTER_ADMIN_EMAIL.toLowerCase(),
          name: "Fabiano Marcelino (Administrador Mestre)",
          password_hash: newHash,
          role: "ADM",
          must_change_password: false,
          is_blocked: false,
        }]);
      }
    } catch (err: any) {
      console.warn("[Supabase] Erro ao salvar senha no Supabase:", err.message);
    }
  }

  // 2. Atualiza no fallback local
  const users = loadStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === userEmail);
  if (user) {
    const expectedPassword = user.password || (user.isMaster ? MASTER_ADMIN_DEFAULT_PASSWORD : "");
    if (currentPassword !== undefined && currentPassword !== null && String(currentPassword).trim() !== "") {
      if (!verifyPassword(String(currentPassword).trim(), expectedPassword)) {
        return res.status(401).json({
          success: false,
          error: "A senha atual informada está incorreta.",
        });
      }
    }

    user.password = cleanNewPassword;
    user.passwordChanged = true;
    saveStoredUsers(users);
  }

  return res.json({
    success: true,
    must_change_password: false,
    message: "Senha pessoal alterada com sucesso! Guarde sua nova senha para os próximos acessos.",
  });
});

// Endpoint de validação de sessão/licença do usuário
app.post("/api/auth/verify", async (req, res) => {
  const userEmail = extractUserEmail(req);
  if (!userEmail) {
    return res.status(401).json({
      authenticated: false,
      isAllowed: false,
      error: "Nenhum e-mail de usuário identificado na requisição.",
    });
  }

  // 1. Verificação no Supabase
  if (supabase) {
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("id, email, name, role, must_change_password, is_blocked")
        .eq("email", userEmail)
        .maybeSingle();

      if (dbUser) {
        if (dbUser.is_blocked) {
          return res.status(403).json({
            authenticated: true,
            isAllowed: false,
            is_blocked: true,
            userEmail,
            error: "Usuário bloqueado no sistema. Entre em contato com o administrador.",
          });
        }

        const isMaster = dbUser.role === "ADM" || userEmail === MASTER_ADMIN_EMAIL.toLowerCase();
        return res.json({
          authenticated: true,
          isAllowed: true,
          isMasterAdmin: isMaster,
          userEmail,
          user: {
            id: String(dbUser.id),
            email: dbUser.email,
            name: dbUser.name || userEmail.split("@")[0],
            role: dbUser.role || (isMaster ? "ADM" : "USER"),
            isMaster,
            must_change_password: Boolean(dbUser.must_change_password),
            is_blocked: Boolean(dbUser.is_blocked),
            token: dbUser.email,
          },
        });
      }
    } catch {}
  }

  // 2. Verificação fallback local
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

  const users = loadStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === userEmail);

  return res.json({
    authenticated: true,
    isAllowed: true,
    isMasterAdmin,
    userEmail,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.isMaster ? "ADM" : "USER",
          company: user.company,
          isMaster: Boolean(user.isMaster),
          must_change_password: !user.passwordChanged,
          is_blocked: !user.active,
          token: user.email,
        }
      : undefined,
    message: isMasterAdmin
      ? "Sessão iniciada como Administrador Mestre permanente."
      : "Acesso autorizado ao repositório jurídico.",
  });
});

// ==========================================
// PAINEL DO ADMINISTRADOR (ROTAS EXCLUSIVAS)
// ==========================================

// 1. Gestão de Usuários da Whitelist (Sincronizado com Supabase)
app.get("/api/admin/users", checkMasterAdminAccess, async (req, res) => {
  const localUsers = loadStoredUsers();

  if (supabase) {
    try {
      const { data: dbUsers, error } = await supabase
        .from("users")
        .select("id, email, name, role, must_change_password, is_blocked, created_at");

      if (!error && Array.isArray(dbUsers) && dbUsers.length > 0) {
        // Mapeia para o formato de usuário exibido no painel
        const mappedUsers: StoredUser[] = dbUsers.map((u: any) => {
          const matchingLocal = localUsers.find((lu) => lu.email.toLowerCase() === u.email.toLowerCase());
          return {
            id: String(u.id),
            email: u.email,
            name: u.name || u.email.split("@")[0],
            role: u.role || (u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? "ADM" : "USER"),
            must_change_password: Boolean(u.must_change_password),
            is_blocked: Boolean(u.is_blocked),
            company: matchingLocal?.company || (u.role === "ADM" ? "Estúdio Marcelino" : "Licença Autorizada"),
            active: !u.is_blocked,
            passwordChanged: !u.must_change_password,
            createdAt: u.created_at || matchingLocal?.createdAt || new Date().toISOString(),
            isMaster: u.role === "ADM" || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase(),
          };
        });

        return res.json({
          success: true,
          users: mappedUsers,
          total: mappedUsers.length,
          activeCount: mappedUsers.filter((u) => u.active).length,
        });
      }
    } catch (e) {
      console.warn("[Supabase] Fallback para usuários locais ao listar:", e);
    }
  }

  const mappedLocal = localUsers.map((u) => ({
    ...u,
    role: (u as any).role || (u.isMaster ? "ADM" : "USER"),
    must_change_password: !u.passwordChanged,
    is_blocked: !u.active,
  }));

  res.json({
    success: true,
    users: mappedLocal,
    total: mappedLocal.length,
    activeCount: mappedLocal.filter((u) => u.active).length,
  });
});

app.post("/api/admin/users", checkMasterAdminAccess, async (req, res) => {
  const { email, name, company, password, role } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "E-mail válido é obrigatório." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = loadStoredUsers();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: "Este e-mail já está cadastrado no sistema." });
  }

  // Senha temporária (definida pelo ADM ou gerada automaticamente)
  const cleanPassword = (password && String(password).trim()) || `Constru@${Math.floor(1000 + Math.random() * 9000)}`;
  const userRole = role === "ADM" ? "ADM" : "USER";

  // 1. Cadastrar diretamente na tabela users do Supabase
  if (supabase) {
    try {
      const { error: insertErr } = await supabase.from("users").insert([
        {
          email: cleanEmail,
          name: (name && String(name).trim()) || cleanEmail.split("@")[0],
          password_hash: hashPassword(cleanPassword),
          role: userRole,
          must_change_password: true,
          is_blocked: false,
        },
      ]);
      if (insertErr) {
        console.warn("[Supabase] Aviso ao cadastrar usuário no Supabase:", insertErr.message);
      } else {
        console.log(`[Supabase] Usuário ${cleanEmail} cadastrado no Supabase com sucesso.`);
      }
    } catch (e) {
      console.warn("[Supabase] Erro ao sincronizar novo usuário no Supabase:", e);
    }
  }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    name: (name && String(name).trim()) || cleanEmail.split("@")[0],
    company: (company && String(company).trim()) || "Geral",
    password: cleanPassword,
    passwordChanged: false,
    active: true,
    createdAt: new Date().toISOString(),
    isMaster: cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() || userRole === "ADM",
  };

  users.push(newUser);
  saveStoredUsers(users);

  res.status(201).json({
    success: true,
    user: {
      ...newUser,
      role: userRole,
      must_change_password: true,
      is_blocked: false,
    },
    temporaryPassword: cleanPassword,
    message: `Acesso criado com sucesso para ${cleanEmail}! Senha temporária: ${cleanPassword}`,
  });
});

app.patch("/api/admin/users/:id", checkMasterAdminAccess, async (req, res) => {
  const { id } = req.params;
  const { active, is_blocked, name, company, password, role, must_change_password } = req.body;
  const users = loadStoredUsers();
  const user = users.find((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  // Não permite desativar/bloquear o Administrador Mestre
  const blocked = typeof is_blocked === "boolean" ? is_blocked : (typeof active === "boolean" ? !active : undefined);
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && blocked === true) {
    return res.status(400).json({ error: "O Administrador Mestre não pode ser bloqueado." });
  }

  if (typeof blocked === "boolean") user.active = !blocked;
  if (typeof name === "string") user.name = name.trim();
  if (typeof company === "string") user.company = company.trim();
  if (typeof password === "string" && password.trim()) {
    user.password = password.trim();
    user.passwordChanged = false; // reset flag ao definir nova senha administrativa
  }

  // Sincroniza atualização no Supabase
  if (supabase) {
    try {
      const updates: any = {};
      if (typeof blocked === "boolean") updates.is_blocked = blocked;
      if (typeof name === "string") updates.name = name.trim();
      if (typeof password === "string" && password.trim()) {
        updates.password_hash = hashPassword(password.trim());
        updates.must_change_password = true;
      }
      if (typeof must_change_password === "boolean") updates.must_change_password = must_change_password;
      if (role === "ADM" || role === "USER") updates.role = role;

      if (Object.keys(updates).length > 0) {
        await supabase.from("users").update(updates).eq("email", user.email.toLowerCase());
      }
    } catch (e) {
      console.warn("[Supabase] Erro ao atualizar usuário no Supabase:", e);
    }
  }

  saveStoredUsers(users);
  res.json({ success: true, user, message: "Usuário atualizado com sucesso." });
});

// Endpoint dedicado: Reset de Senha pelo Administrador
app.post("/api/admin/users/:id/reset-password", checkMasterAdminAccess, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const users = loadStoredUsers();
  const user = users.find((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const newTempPassword = (password && String(password).trim()) || `Constru@${Math.floor(1000 + Math.random() * 9000)}`;
  user.password = newTempPassword;
  user.passwordChanged = false;
  saveStoredUsers(users);

  if (supabase) {
    try {
      await supabase
        .from("users")
        .update({
          password_hash: hashPassword(newTempPassword),
          must_change_password: true,
        })
        .eq("email", user.email.toLowerCase());
    } catch (e) {
      console.warn("[Supabase] Erro ao resetar senha no Supabase:", e);
    }
  }

  res.json({
    success: true,
    message: `Senha temporária redefinida com sucesso para o usuário ${user.email}. O usuário deverá alterá-la no próximo acesso.`,
    temporaryPassword: newTempPassword,
    user: {
      id: user.id,
      email: user.email,
      must_change_password: true,
    },
  });
});

app.delete("/api/admin/users/:id", checkMasterAdminAccess, async (req, res) => {
  const { id } = req.params;
  let users = loadStoredUsers();
  const user = users.find((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: "O Administrador Mestre não pode ser excluído." });
  }

  // Deleta no Supabase
  if (supabase) {
    try {
      await supabase.from("users").delete().eq("email", user.email.toLowerCase());
    } catch (e) {
      console.warn("[Supabase] Erro ao excluir usuário no Supabase:", e);
    }
  }

  users = users.filter((u) => u.id !== user.id);
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

app.post("/api/admin/directives/reset-defaults", checkMasterAdminAccess, (req, res) => {
  const defaults = getInitialDirectives();
  saveStoredDirectives(defaults);
  res.json({
    success: true,
    directives: defaults,
    message: "Diretrizes e normas padrão do sistema restauradas com sucesso.",
  });
});


// ==========================================
// HISTÓRICO DE CONVERSAS PRIVADO POR USUÁRIO
// ==========================================
const CHATS_DIR = path.join(DATA_DIR, "chats");
if (!fs.existsSync(CHATS_DIR)) {
  try {
    fs.mkdirSync(CHATS_DIR, { recursive: true });
  } catch (e) {
    console.error("Erro ao criar pasta data/chats:", e);
  }
}

function getUserChatsFilePath(userEmail: string): string {
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  return path.join(CHATS_DIR, `${safeEmail}.json`);
}

function loadUserChatSessions(userEmail: string): any[] {
  if (!userEmail) return [];
  const file = getUserChatsFilePath(userEmail);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.error("Erro ao carregar sessões de chat:", e);
    return [];
  }
}

function saveUserChatSessions(userEmail: string, sessions: any[]): void {
  if (!userEmail) return;
  const file = getUserChatsFilePath(userEmail);
  try {
    fs.writeFileSync(file, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar sessões de chat:", e);
  }
}

// 1. Listar todas as conversas do usuário autenticado (para barra lateral)
app.get("/api/chats", checkVipAccess, (req, res) => {
  const userEmail = extractUserEmail(req);
  const sessions = loadUserChatSessions(userEmail);
  const summaries = sessions
    .map((s) => ({
      id: s.id,
      title: s.title || "Nova Consulta",
      createdAt: s.createdAt,
      updatedAt: s.updatedAt || s.createdAt,
      messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
      preview: Array.isArray(s.messages) && s.messages.length > 0
        ? (s.messages[s.messages.length - 1]?.text || "").slice(0, 80)
        : "",
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ success: true, sessions: summaries });
});

// 2. Obter conversa específica com todas as mensagens
app.get("/api/chats/:id", checkVipAccess, (req, res) => {
  const userEmail = extractUserEmail(req);
  const { id } = req.params;
  const sessions = loadUserChatSessions(userEmail);
  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return res.status(404).json({ error: "Conversa não encontrada." });
  }

  res.json({ success: true, session });
});

// 3. Salvar ou atualizar conversa do usuário
app.post("/api/chats", checkVipAccess, (req, res) => {
  const userEmail = extractUserEmail(req);
  const { id, title, messages, createdAt } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID da conversa é obrigatório." });
  }

  const sessions = loadUserChatSessions(userEmail);
  const existingIdx = sessions.findIndex((s) => s.id === id);
  const now = new Date().toISOString();

  // Determinar título inteligente se não fornecido
  let sessionTitle = title;
  if (!sessionTitle && Array.isArray(messages)) {
    const firstUserMsg = messages.find((m: any) => m.sender === "user");
    if (firstUserMsg && firstUserMsg.text) {
      sessionTitle = firstUserMsg.text.trim().slice(0, 45);
      if (firstUserMsg.text.length > 45) sessionTitle += "...";
    }
  }

  const sessionData = {
    id,
    userEmail,
    title: sessionTitle || "Nova Consulta",
    createdAt: createdAt || (existingIdx >= 0 ? sessions[existingIdx].createdAt : now),
    updatedAt: now,
    messages: Array.isArray(messages) ? messages : [],
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = sessionData;
  } else {
    sessions.unshift(sessionData);
  }

  saveUserChatSessions(userEmail, sessions);
  res.json({ success: true, session: sessionData });
});

// 4. Deletar conversa do usuário
app.delete("/api/chats/:id", checkVipAccess, (req, res) => {
  const userEmail = extractUserEmail(req);
  const { id } = req.params;
  let sessions = loadUserChatSessions(userEmail);
  const exists = sessions.some((s) => s.id === id);

  if (!exists) {
    return res.status(404).json({ error: "Conversa não encontrada." });
  }

  sessions = sessions.filter((s) => s.id !== id);
  saveUserChatSessions(userEmail, sessions);
  res.json({ success: true, message: "Conversa excluída do histórico." });
});

// Vite middleware & static serving
async function startServer() {
  // Inicialização do Supabase e verificação do Administrador Mestre
  await initSupabaseAndMasterAdmin();

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
