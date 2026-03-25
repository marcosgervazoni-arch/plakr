/**
 * File upload route for ApostAI
 * POST /api/upload — accepts base64-encoded files, uploads to S3, returns URL
 * Supports: images (5MB), videos (50MB), audio (16MB), documents (16MB)
 */
import { Request, Response, Express } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";

const ALLOWED_TYPES: Record<string, { ext: string; category: string }> = {
  // Images
  "image/jpeg":   { ext: "jpg",  category: "images" },
  "image/jpg":    { ext: "jpg",  category: "images" },
  "image/png":    { ext: "png",  category: "images" },
  "image/webp":   { ext: "webp", category: "images" },
  "image/gif":    { ext: "gif",  category: "images" },
  "image/svg+xml":{ ext: "svg",  category: "images" },
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

      const typeInfo = ALLOWED_TYPES[contentType];
      if (!typeInfo) {
        return res.status(400).json({ error: `Unsupported content type: ${contentType}` });
      }

      // Decode base64
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

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
      console.error("[Upload] Error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
