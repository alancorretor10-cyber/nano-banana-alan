// Teste local da migração Nano Banana 2 / Pro (não vai pro deploy — apagar depois se quiser)
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3979";

const PROMPT_45 = `Brazilian real estate agency premium marketing poster, vertical 4:5 aspect ratio (1080x1350px).
LEFT 55%: Confident Brazilian real estate agent in navy blue dress shirt (#1B2B4D), holding clipboard and keys, friendly professional smile. Modern real estate office interior, warm natural lighting.
RIGHT 45%: Clean white panel with navy text.
HEADER: "ALUGUE SEM BUROCRACIA"
SUBTITLE light blue (#4DA8DA): "Linhares-ES"
Services with green checkmarks (#10B981): ✓ Locação ✓ Venda ✓ Administração
BOTTOM gold (#F59E0B): "📱 (27) 99999-0000"
Style: premium Brazilian real estate marketing. All text must be perfectly legible and spelled correctly. NO fake logos. NO watermarks. NO stock photo badges. Keep all text inside safe zone (avoid outer 5% margins).`;

const PROMPT_916 = `Brazilian real estate Instagram story infographic, vertical 9:16 aspect ratio (1080x1920px).
TOP 25%: navy blue (#1B2B4D) header band, white bold ALL CAPS title: "5 PASSOS PARA ALUGAR RÁPIDO"
MIDDLE 60%: clean numbered list 1-5 with document icons, navy text on white, each step short Portuguese phrase, perfectly legible typography.
BOTTOM 15%: gold (#F59E0B) banner, white text: "NOVA CASA IMOBILIÁRIA · LINHARES-ES"
Style: modern premium graphic, magazine cover quality. All text must be perfectly legible and spelled correctly in Portuguese. NO fake logos. NO watermarks. Keep all text inside safe zone (avoid outer 5% margins).`;

async function gerar(nome, body) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.success) { console.log(`${nome}: ERRO ${r.status}: ${j.error}`); return; }
  const buf = Buffer.from(j.base64, "base64");
  writeFileSync(`${nome}.png`, buf);
  // dimensões direto do header PNG (IHDR: bytes 16-23)
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  console.log(`${nome}: OK model=${j.model} ${w}x${h} ${(buf.length/1024).toFixed(0)}KB em ${((Date.now()-t0)/1000).toFixed(1)}s`);
}

await gerar("teste-4x5-flash", { prompt: PROMPT_45, aspectRatio: "4:5" });
await gerar("teste-9x16-pro", { prompt: PROMPT_916, aspectRatio: "9:16", quality: "pro" });
