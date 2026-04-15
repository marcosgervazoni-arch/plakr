/**
 * File upload route for Plakr!
 * POST /api/upload — accepts base64-encoded files, uploads to S3, returns URL
 * Supports: images (5MB), videos (50MB), audio (16MB), documents (16MB)
 *
 * Security layers:
 * [S1] Authentication required for all uploads
 * [S2] Admin-only folders: "ads" folder requires role=admin
 * [S3] MIME type allowlist (SVG blocked — XSS risk)
 * [S4] Size limits per category
 * [S5] Filename sanitization + nanoid suffix (prevents path traversal)
 * [S6] Rate limiting: 10 uploads/min (configured in _core/index.ts)
 */
import { Request, Response, Express } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";
import logger from "./logger";
// Folders that require admin role
const ADMIN_ONLY_FOLDERS = ["ads", "admin"];

const ALLOWED_TYPES: Record<string, { ext: string; category: string }> = {
  // Images
  "image/jpeg":   { ext: "jpg",  category: "images" },
  "image/jpg":    { ext: "jpg",  category: "images" },
  "image/png":    { ext: "png",  category: "images" },
  "image/webp":   { ext: "webp", category: "images" },
  "image/gif":    { ext: "gif",  category: "images" },
  // "image/svg+xml" removido — SVG pode conter <script> embutido (XSS stored)
  // Videos
  "video/mp4":    { ext: "mp4",  category: "videos" },
  "video/webm":   { ext: "webm", category: "videos" },
  "video/ogg":    { ext: "ogv",  category: "videos" },
  "video/quicktime": { ext: "mov", category: "videos" },
  // Audio
  "audio/mpeg":   { ext: "mp3",  category: "audio" },
  "audio/mp3":    { ext: "mp3",  category: "audio" },
  "audio/wav":    { ext: "wav",  category: "audio" },
  "audio/ogg":    { ext: "ogg",  category: "audio" },
  "audio/m4a":    { ext: "m4a",  category: "audio" },
  "audio/mp4":    { ext: "m4a",  category: "audio" },
  // Documents
  "application/pdf": { ext: "pdf", category: "docs" },
  "application/msword": { ext: "doc", category: "docs" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", category: "docs" },
  "application/vnd.ms-excel": { ext: "xls", category: "docs" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", category: "docs" },
  "application/vnd.ms-powerpoint": { ext: "ppt", category: "docs" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: "pptx", category: "docs" },
  "text/plain":   { ext: "txt",  category: "docs" },
  "text/csv":     { ext: "csv",  category: "docs" },
  "application/zip": { ext: "zip", category: "docs" },
  "application/x-zip-compressed": { ext: "zip", category: "docs" },
};

// [SEC] Magic bytes para validação de conteúdo real do arquivo (previne spoofing de MIME type)
const MAGIC_BYTES: Record<string, (buf: Buffer) => boolean> = {
  "image/jpeg":  (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  "image/jpg":   (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  "image/png":   (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  "image/gif":   (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  "image/webp":  (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  "application/pdf": (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  "video/mp4":   (b) => (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) ||
                        (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x00),
};

const SIZE_LIMITS: Record<string, number> = {
  images:  5  * 1024 * 1024,  //  5 MB
  videos:  50 * 1024 * 1024,  // 50 MB
  audio:   16 * 1024 * 1024,  // 16 MB
  docs:    16 * 1024 * 1024,  // 16 MB
};

export function registerUploadRoute(app: Express) {
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      // [S3] Require authentication for all uploads
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Autenticação necessária para fazer upload." });
      }

      const { data, contentType, folder = "uploads", fileName } = req.body as {
        data: string;
        contentType: string;
        folder?: string;
        fileName?: string;
      };

      if (!data || !contentType) {
        return res.status(400).json({ error: "data and contentType are required" });
      }

      // [S2] Admin-only folders: reject non-admins trying to upload to restricted paths
      const requestedFolder = (folder ?? "uploads").split("/")[0];
      if (ADMIN_ONLY_FOLDERS.includes(requestedFolder)) {
        // Fetch role from DB — sdk.authenticateRequest only returns JWT payload
        const { getDb } = await import("./db");
        const dbConn = await getDb();
        if (!dbConn) {
          return res.status(500).json({ error: "Database unavailable" });
        }
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [dbUser] = await dbConn.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
        if (!dbUser || dbUser.role !== "admin") {
          logger.warn({ userId: user.id, folder }, "[Upload] Non-admin tried to upload to restricted folder");
          return res.status(403).json({ error: "Acesso negado. Esta pasta requer permissão de administrador." });
        }
      }

      const typeInfo = ALLOWED_TYPES[contentType];
      if (!typeInfo) {
        return res.status(400).json({ error: `Unsupported content type: ${contentType}` });
      }

      // Decode base64
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // [SEC] Valida magic bytes para tipos com assinatura conhecida
      const magicCheck = MAGIC_BYTES[contentType];
      if (magicCheck && buffer.length >= 12 && !magicCheck(buffer)) {
        logger.warn({ userId: user.id, contentType, folder }, "[Upload] Magic bytes mismatch — possível spoofing de MIME type");
        return res.status(400).json({ error: "O conteúdo do arquivo não corresponde ao tipo declarado." });
      }

      const maxSize = SIZE_LIMITS[typeInfo.category] ?? 16 * 1024 * 1024;
      if (buffer.byteLength > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        return res.status(413).json({ error: `File too large. Maximum size for ${typeInfo.category} is ${maxMB}MB.` });
      }

      const baseName = fileName
        ? fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "")
        : nanoid(8);
      const key = `${folder}/${typeInfo.category}/${baseName}-${nanoid(8)}.${typeInfo.ext}`;

      const { url } = await storagePut(key, buffer, contentType);
      return res.json({ url, key, category: typeInfo.category });
    } catch (err) {
      logger.error({ err }, "[Upload] Error");
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
