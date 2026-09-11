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
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Match query parameter ?id=...
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return trimmed;
}

// Memory cache for Google Drive files to ensure low-latency chat interactions
let driveCache: {
  folderId: string;
  timestamp: number;
  files: any[];
} | null = null;

// Função para buscar a lista de PDFs e documentos da pasta pública/compartilhada do Google Drive
async function buscarNormasDoGoogleDrive(customFolderId?: string) {
  const folderId = extractDriveFolderId(customFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId || !apiKey) return [];

  // Check cache if less than 45 seconds old
  if (driveCache && driveCache.folderId === folderId && Date.now() - driveCache.timestamp < 45000) {
    return driveCache.files;
  }

  try {
    // Consulta os arquivos via API pública do Google Drive v3
    const url = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(
      folderId
    )}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,webContentLink,webViewLink,size,description)&pageSize=100`;

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.warn("Google Drive API response not OK:", response.status, errText);
      return [];
    }

    const data: any = await response.json();
    const files = data.files || [];

    // Optional: fetch text snippets for plain text or Google Docs if present
    for (const file of files) {
      if (file.mimeType === "application/vnd.google-apps.document") {
        try {
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${apiKey}`;
          const exportRes = await fetch(exportUrl);
          if (exportRes.ok) {
            const docText = await exportRes.text();
            file.contentSnippet = docText.slice(0, 5000);
          }
        } catch {
          // ignore export errors
        }
      } else if (file.mimeType === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        try {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
          const mediaRes = await fetch(mediaUrl);
          if (mediaRes.ok) {
            const text = await mediaRes.text();
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
  } catch (error) {
    console.error("Erro ao buscar arquivos do Google Drive:", error);
    return [];
  }
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

    if (!apiKey) {
      return res.json({
        configured: false,
        folderId,
        files: [],
        error: "Chave GEMINI_API_KEY não configurada.",
      });
    }

    const files = await buscarNormasDoGoogleDrive(folderId);

    return res.json({
      configured: true,
      folderId,
      files,
      count: files.length,
      lastChecked: new Date().toISOString(),
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
