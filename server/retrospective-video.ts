/**
 * Plakr! — Worker de Vídeo da Retrospectiva (Remotion)
 *
 * Responsável por:
 * 1. Renderizar o vídeo MP4 da retrospectiva via Remotion (bundle + render)
 * 2. Fazer upload do MP4 para S3
 * 3. Atualizar o status na tabela pool_retrospectives
 *
 * O vídeo é gerado em background após a geração dos slides PNG.
 * O toggle enableVideo na tabela retrospective_config controla se a geração está ativa.
 */

import path from "path";
import fs from "fs";
import os from "os";
import { getDb } from "./db";
import { poolRetrospectives, retrospectiveConfig } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { logger } from "./logger";
import type { RetrospectiveData } from "./retrospective";

// ─── QUALIDADE → CONFIGURAÇÕES DE RENDERIZAÇÃO ───────────────────────────────
const QUALITY_PRESETS = {
  low:    { fps: 24, width: 540,  height: 960,  crf: 28 },
  medium: { fps: 30, width: 1080, height: 1920, crf: 23 },
  high:   { fps: 30, width: 1080, height: 1920, crf: 18 },
} as const;

// ─── VERIFICAR SE O VÍDEO ESTÁ HABILITADO ────────────────────────────────────
export async function isVideoEnabled(): Promise<{ enabled: boolean; quality: "low" | "medium" | "high" }> {
  const db = await getDb();
  if (!db) return { enabled: false, quality: "medium" };
  const [config] = await db.select({
    enableVideo: retrospectiveConfig.enableVideo,
    videoQuality: retrospectiveConfig.videoQuality,
  }).from(retrospectiveConfig).limit(1);
  return {
    enabled: config?.enableVideo === true,
    quality: (config?.videoQuality ?? "medium") as "low" | "medium" | "high",
  };
}

// ─── VERIFICAR SE OS SLIDES ESTÃO HABILITADOS ────────────────────────────────
export async function areSlidesEnabled(): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const [config] = await db.select({
    enableSlides: retrospectiveConfig.enableSlides,
  }).from(retrospectiveConfig).limit(1);
  return config?.enableSlides !== false;
}

// ─── GERAR VÍDEO MP4 ─────────────────────────────────────────────────────────
export async function generateRetrospectiveVideo(
  retrospectiveId: number,
  poolId: number,
  userId: number,
  data: RetrospectiveData
): Promise<{ videoUrl: string; videoKey: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // Marcar como "processing"
  await db.update(poolRetrospectives)
    .set({ videoStatus: "processing" })
    .where(and(
      eq(poolRetrospectives.id, retrospectiveId),
      eq(poolRetrospectives.userId, userId)
    ));

  const { enabled, quality } = await isVideoEnabled();
  if (!enabled) {
    logger.info({ retrospectiveId }, "[Video] Video generation disabled — skipping");
    await db.update(poolRetrospectives)
      .set({ videoStatus: "failed" })
      .where(eq(poolRetrospectives.id, retrospectiveId));
    return null;
  }

  const preset = QUALITY_PRESETS[quality];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plakr-retro-"));
  const outputPath = path.join(tmpDir, `retro-${poolId}-${userId}.mp4`);

  try {
    logger.info({ retrospectiveId, poolId, userId, quality }, "[Video] Starting Remotion render");

    // Importar Remotion dinamicamente para não bloquear o startup
    const { bundle } = await import("@remotion/bundler");
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    // Caminho do entry point da composição
    const entryPoint = path.join(process.cwd(), "server", "retrospective-composition", "index.tsx");

    // Verificar se o entry point existe
    if (!fs.existsSync(entryPoint)) {
      throw new Error(`Entry point não encontrado: ${entryPoint}`);
    }

    // Bundle
    logger.info({ retrospectiveId }, "[Video] Bundling composition...");
    const bundled = await bundle({
      entryPoint,
      onProgress: (p) => {
        if (p % 25 === 0) logger.debug({ retrospectiveId, progress: p }, "[Video] Bundle progress");
      },
    });

    // Selecionar composição
    const composition = await selectComposition({
      serveUrl: bundled,
      id: "PlakrRetrospectiva",
      inputProps: { data },
    });

    // Renderizar
    logger.info({ retrospectiveId, frames: composition.durationInFrames }, "[Video] Rendering...");
    await renderMedia({
      composition: {
        ...composition,
        width: preset.width,
        height: preset.height,
        fps: preset.fps,
      },
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { data },
      chromiumOptions: { disableWebSecurity: true },
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 20 === 0) logger.debug({ retrospectiveId, progress: pct }, "[Video] Render progress");
      },
    });

    // Upload para S3
    const suffix = `${poolId}-${userId}-${Date.now()}`;
    const videoKey = `retrospectives/videos/${suffix}.mp4`;
    const videoBuffer = fs.readFileSync(outputPath);
    const { url: videoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");

    // Atualizar banco com URL e status done
    await db.update(poolRetrospectives)
      .set({ videoUrl, videoKey, videoStatus: "done" })
      .where(eq(poolRetrospectives.id, retrospectiveId));

    logger.info({ retrospectiveId, videoUrl }, "[Video] Video generated and uploaded successfully");
    return { videoUrl, videoKey };

  } catch (err) {
    logger.error({ retrospectiveId, poolId, userId, err }, "[Video] Failed to generate video");
    await db.update(poolRetrospectives)
      .set({ videoStatus: "failed" })
      .where(eq(poolRetrospectives.id, retrospectiveId));
    return null;
  } finally {
    // Limpar arquivos temporários
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ─── GERAR VÍDEO DE TESTE (dados fictícios) ──────────────────────────────────
export async function generateTestVideo(): Promise<{ videoUrl: string } | null> {
  const testData: RetrospectiveData = {
    userId: 0,
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
    closingPhrase: "Que jornada incrível! Você provou que entende de futebol. Até a próxima Copa!",
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plakr-retro-test-"));
  const outputPath = path.join(tmpDir, "retro-test.mp4");

  try {
    const { bundle } = await import("@remotion/bundler");
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const entryPoint = path.join(process.cwd(), "server", "retrospective-composition", "index.tsx");
    if (!fs.existsSync(entryPoint)) {
      throw new Error(`Entry point não encontrado: ${entryPoint}`);
    }

    const bundled = await bundle({ entryPoint });
    const composition = await selectComposition({
      serveUrl: bundled,
      id: "PlakrRetrospectiva",
      inputProps: { data: testData },
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { data: testData },
      chromiumOptions: { disableWebSecurity: true },
    });

    const videoBuffer = fs.readFileSync(outputPath);
    const videoKey = `retrospectives/videos/test-${Date.now()}.mp4`;
    const { url: videoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");

    logger.info({ videoUrl }, "[Video] Test video generated successfully");
    return { videoUrl };

  } catch (err) {
    logger.error({ err }, "[Video] Failed to generate test video");
    return null;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
