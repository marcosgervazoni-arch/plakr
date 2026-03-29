/**
 * Script standalone para renderizar o vídeo de retrospectiva Plakr
 * Executa: node render-test-video.mjs
 */
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dados fictícios ricos para o vídeo de teste
const testData = {
  userId: 42,
  userName: "Marcos Gervazoni",
  userAvatar: null,
  poolName: "Bolão Copa do Mundo 2026",
  tournamentName: "Copa do Mundo FIFA 2026",
  poolStartDate: new Date("2026-06-01"),
  poolEndDate: new Date("2026-07-15"),
  totalParticipants: 24,
  totalBets: 48,
  exactScoreCount: 12,
  correctResultCount: 31,
  zebraCount: 3,
  totalPoints: 187,
  finalPosition: 3,
  accuracyPct: 65,
  bestMomentType: "exact_score",
  bestMomentData: {
    homeTeam: "Brasil",
    awayTeam: "Argentina",
    homeScore: 2,
    awayScore: 1,
    points: 10,
  },
  badgeEarnedName: "Vidente",
  badgeEarnedEmoji: "🔮",
  closingPhrase: "Que jornada épica! Você provou que entende de futebol. Até a próxima Copa!",
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plakr-retro-v2-"));
const outputPath = path.join(tmpDir, "retro-v2-test.mp4");

console.log("[Render] Iniciando renderização do vídeo v2...");
console.log("[Render] Output:", outputPath);

try {
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const entryPoint = path.join(__dirname, "server", "retrospective-composition", "index.tsx");
  
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Entry point não encontrado: ${entryPoint}`);
  }

  console.log("[Render] Bundling...");
  const bundled = await bundle({
    entryPoint,
    onProgress: (p) => {
      if (p % 25 === 0) process.stdout.write(`  Bundle: ${p}%\r`);
    },
  });
  console.log("\n[Render] Bundle concluído.");

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "PlakrRetrospectiva",
    inputProps: { data: testData },
  });

  console.log(`[Render] Composição: ${composition.durationInFrames} frames @ ${composition.fps}fps`);
  console.log("[Render] Renderizando...");

  await renderMedia({
    composition: {
      ...composition,
      width: 1080,
      height: 1920,
      fps: 30,
    },
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { data: testData },
    chromiumOptions: { disableWebSecurity: true },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`  Render: ${pct}%\r`);
    },
  });

  console.log("\n[Render] Vídeo renderizado com sucesso!");
  console.log("[Render] Arquivo:", outputPath);
  console.log("[Render] Tamanho:", Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 10) / 10, "MB");

  // Copiar para local acessível
  const finalPath = path.join(os.homedir(), "retro-v2-final.mp4");
  fs.copyFileSync(outputPath, finalPath);
  console.log("[Render] Copiado para:", finalPath);

} catch (err) {
  console.error("[Render] ERRO:", err.message);
  process.exit(1);
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
