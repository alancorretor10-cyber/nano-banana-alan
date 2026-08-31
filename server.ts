import express, { Request, Response } from "express";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
// Nano Banana 2 (padrao, US$ 0,067/imagem 1K). gemini-2.5-flash-image desliga em 02/10/2026.
const MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";
// Nano Banana Pro (US$ 0,134/imagem 1K) — para artes com texto legivel/infografico.
const MODEL_PRO = process.env.IMAGE_MODEL_PRO || "gemini-3-pro-image";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

if (!API_KEY) { console.error("GEMINI_API_KEY ausente"); process.exit(1); }

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

// quality "pro" => Nano Banana Pro; qualquer outro valor (ou ausente) => modelo padrao
function escolherModelo(quality?: string): string {
  return quality === "pro" ? MODEL_PRO : MODEL;
}

type Imagem = { base64: string; mime: string };

async function callGemini(parts: Part[], model: string, aspectRatio?: string): Promise<Imagem> {
  const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
  const body: any = { contents: [{ parts }] };
  if (aspectRatio) {
    body.generationConfig = { imageConfig: { aspectRatio } };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of respParts) {
    const inline = p.inline_data ?? p.inlineData;
    // gemini-3.x devolve image/jpeg; nao assumir PNG
    if (inline?.data) return { base64: inline.data, mime: inline.mime_type ?? inline.mimeType ?? "image/png" };
  }
  throw new Error("Sem imagem na resposta");
}

function promptHandyman(servico: string, estilo = "profissional limpo"): string {
  return `Imagem promocional de servico de ${servico} em Tampa Bay FL. Estilo: ${estilo}, paleta laranja e branco (Alan Handyman Services). Composicao limpa, alta qualidade fotografica, iluminacao natural. SEM texto na imagem, SEM logos artificiais. Foco no servico bem executado, ambiente residencial americano.`;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "Nano Banana - Alan Handyman",
    status: "online",
    model: MODEL,
    modelPro: MODEL_PRO,
    endpoints: ["/generate", "/generate-post", "/edit"],
  });
});

app.post("/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, quality, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt obrigatorio" });
    const modelo = escolherModelo(quality);
    const img = await callGemini([{ text: prompt }], modelo, aspectRatio);
    res.json({ success: true, model: modelo, mimeType: img.mime, dataUrl: `data:${img.mime};base64,${img.base64}`, base64: img.base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/generate-post", async (req: Request, res: Response) => {
  try {
    const { servico = "drywall", estilo, customPrompt, quality, aspectRatio } = req.body;
    const prompt = customPrompt || promptHandyman(servico, estilo);
    const modelo = escolherModelo(quality);
    const img = await callGemini([{ text: prompt }], modelo, aspectRatio);
    res.json({ success: true, model: modelo, mimeType: img.mime, promptUsado: prompt, dataUrl: `data:${img.mime};base64,${img.base64}`, base64: img.base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/edit", async (req: Request, res: Response) => {
  try {
    const { prompt, imageBase64, mimeType = "image/jpeg", quality, aspectRatio } = req.body;
    if (!prompt || !imageBase64) return res.status(400).json({ error: "prompt e imageBase64 obrigatorios" });
    const modelo = escolherModelo(quality);
    const img = await callGemini(
      [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
      modelo,
      aspectRatio
    );
    res.json({ success: true, model: modelo, mimeType: img.mime, dataUrl: `data:${img.mime};base64,${img.base64}`, base64: img.base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Nano Banana Service rodando em :${PORT} (modelo ${MODEL})`));
