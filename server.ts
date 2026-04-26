import express, { Request, Response } from "express";
import cors from "cors";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

if (!API_KEY) { console.error("GEMINI_API_KEY ausente"); process.exit(1); }

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(parts: Part[]): Promise<string> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of respParts) {
    const inline = p.inline_data ?? p.inlineData;
    if (inline?.data) return inline.data;
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
  res.json({ service: "Nano Banana - Alan Handyman", status: "online", endpoints: ["/generate", "/generate-post", "/edit"] });
});

app.post("/generate", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt obrigatorio" });
    const base64 = await callGemini([{ text: prompt }]);
    res.json({ success: true, dataUrl: `data:image/png;base64,${base64}`, base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/generate-post", async (req: Request, res: Response) => {
  try {
    const { servico = "drywall", estilo, customPrompt } = req.body;
    const prompt = customPrompt || promptHandyman(servico, estilo);
    const base64 = await callGemini([{ text: prompt }]);
    res.json({ success: true, promptUsado: prompt, dataUrl: `data:image/png;base64,${base64}`, base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/edit", async (req: Request, res: Response) => {
  try {
    const { prompt, imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!prompt || !imageBase64) return res.status(400).json({ error: "prompt e imageBase64 obrigatorios" });
    const base64 = await callGemini([{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }]);
    res.json({ success: true, dataUrl: `data:image/png;base64,${base64}`, base64 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Nano Banana Service rodando em :${PORT}`));
