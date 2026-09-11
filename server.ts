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

// Fallback adicional: leitura da lista pública de arquivos via visualização pública da pasta compartilhada
async function scrapePublicDriveFolder(folderId: string): Promise<any[]> {
  try {
    const publicUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
    const res = await fetch(publicUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const files: any[] = [];
    const seenIds = new Set<string>();

    // 1. Links para arquivos: /file/d/{id}/view
    const linkRegex = /href="https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const fileId = match[1];
      const fileName = match[2]?.trim();
      if (fileId && fileName && !seenIds.has(fileId)) {
        seenIds.add(fileId);
        files.push({
          id: fileId,
          name: fileName,
          mimeType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
        });
      }
    }

    // 2. Elementos data-id da interface embeddedfolderview
    const entryRegex = /data-id="([a-zA-Z0-9_-]+)"[^>]*data-name="([^"]+)"/gi;
    while ((match = entryRegex.exec(html)) !== null) {
      const fileId = match[1];
      const fileName = match[2]?.trim();
      if (fileId && fileName && !seenIds.has(fileId)) {
        seenIds.add(fileId);
        files.push({
          id: fileId,
          name: fileName,
          mimeType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
        });
      }
    }

    return files;
  } catch (err) {
    console.warn("[Google Drive Fallback] Erro ao analisar visualização pública da pasta:", err);
    return [];
  }
}

// Função para buscar a lista de PDFs e documentos da pasta pública/compartilhada do Google Drive
async function buscarNormasDoGoogleDrive(customFolderId?: string) {
  const folderId = extractDriveFolderId(customFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) return [];

  // Check cache if less than 45 seconds old
  if (driveCache && driveCache.folderId === folderId && Date.now() - driveCache.timestamp < 45000) {
    return driveCache.files;
  }

  let files: any[] = [];
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,webContentLink,webViewLink,size,description)");

  // 1. Requisição principal da API do Google Drive v3 com os parâmetros obrigatórios:
  // supportsAllDrives=true&includeItemsFromAllDrives=true&key=${apiKey}
  if (apiKey) {
    try {
      const primaryUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=${fields}&key=${apiKey}`;
      const response = await fetch(primaryUrl);

      if (response.ok) {
        const data: any = await response.json();
        files = data.files || [];
      } else {
        const errText = await response.text();
        console.warn(
          `[Google Drive API v3] Requisição com API Key retornou status HTTP ${response.status}: ${errText}. Acionando fallback resiliente...`
        );
      }
    } catch (apiErr: any) {
      console.warn("[Google Drive API v3] Falha na requisição principal:", apiErr.message);
    }
  }

  // 2. Lógica de Fallback de Resiliência:
  // Se a requisição com a API Key retornar status de erro (como 401 ou 400),
  // faz fetch para a URL pública (sem a query key) para ler pastas configuradas como "Qualquer pessoa com o link"
  if (files.length === 0) {
    try {
      const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=${fields}`;
      const fallbackRes = await fetch(fallbackUrl);

      if (fallbackRes.ok) {
        const data: any = await fallbackRes.json();
        files = data.files || [];
      } else {
        console.warn(
          `[Google Drive API v3 Fallback] URL pública sem chave retornou HTTP ${fallbackRes.status}. Tentando leitor de pasta compartilhada...`
        );
      }
    } catch (fallbackErr: any) {
      console.warn("[Google Drive API v3 Fallback] Erro na consulta da URL pública:", fallbackErr.message);
    }
  }

  // 3. Fallback adicional para garantir leitura de pasta pública mesmo sem permissões da API v3
  if (files.length === 0) {
    files = await scrapePublicDriveFolder(folderId);
  }

  // 4. Extração de Conteúdo (Snippets) para Google Docs e arquivos de texto
  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.document") {
      try {
        let docText = "";
        // Tentativa com API v3
        if (apiKey) {
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&supportsAllDrives=true&key=${apiKey}`;
          const exportRes = await fetch(exportUrl);
          if (exportRes.ok) {
            docText = await exportRes.text();
          }
        }
        // Fallback de exportação pública
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
        // Tentativa com API v3
        if (apiKey) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
          const mediaRes = await fetch(mediaUrl);
          if (mediaRes.ok) {
            text = await mediaRes.text();
          }
        }
        // Fallback de download público
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

  driveCache = {
    folderId,
    timestamp: Date.now(),
    files,
  };

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

// Google Drive status & file list endpoint
app.get("/api/drive/status", async (req, res) => {
  try {
    const requestedFolder = (req.query.folderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    const folderId = extractDriveFolderId(requestedFolder);

    if (!folderId) {
      return res.json({
        configured: false,
        folderId: "",
        files: [],
        message: "Nenhum GOOGLE_DRIVE_FOLDER_ID configurado nas variáveis de ambiente ou parâmetros.",
      });
    }

    const files = await buscarNormasDoGoogleDrive(folderId);

    return res.json({
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

// Route handlers for consultation
app.post("/api/consult", handleConsultation);
app.post("/api/chat", handleConsultation);


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
