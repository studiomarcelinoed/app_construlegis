import express from "express";
import path from "path";
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

// VIP Whitelist config: ALLOWED_EMAILS (comma-separated list of emails)
function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => Boolean(e));
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

// Middleware: Controle de Acesso Restrito (Lista VIP / Whitelist de E-mails)
function checkVipAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const allowed = getAllowedEmails();
  const userEmail = extractUserEmail(req);

  // Se a whitelist estiver definida e vazia, ou o usuário não tiver e-mail fornecido
  if (!userEmail) {
    return res.status(401).json({
      error: "Autenticação obrigatória. Por favor, faça login com sua conta do Google.",
      code: "AUTH_REQUIRED",
    });
  }

  // Se houver lista de e-mails configurada, valida a presença
  if (allowed.length > 0 && !allowed.includes(userEmail)) {
    return res.status(403).json({
      error: "Sua conta não possui uma licença ativa. Entre em contato para liberar seu acesso.",
      code: "VIP_REQUIRED",
      userEmail,
    });
  }

  // Se ALLOWED_EMAILS não foi configurado no .env, permite o acesso autenticado por padrão
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

    // 2. Documentos adicionais em memória (se houver)
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

    // Build consolidated prompt with Drive and norms context
    let promptContext = "";
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
  const allowed = getAllowedEmails();
  const userEmail = extractUserEmail(req);
  const isAllowed = Boolean(userEmail && (allowed.length === 0 || allowed.includes(userEmail)));

  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    whitelistActive: allowed.length > 0,
    userEmail: userEmail || undefined,
    isAllowed: userEmail ? isAllowed : false,
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

  const allowed = getAllowedEmails();
  const isAllowed = allowed.length === 0 || allowed.includes(userEmail);

  if (!isAllowed) {
    return res.status(403).json({
      authenticated: true,
      isAllowed: false,
      userEmail,
      error: "Sua conta não possui uma licença ativa. Entre em contato para liberar seu acesso.",
    });
  }

  return res.json({
    authenticated: true,
    isAllowed: true,
    userEmail,
    message: "Acesso autorizado ao repositório jurídico.",
  });
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
