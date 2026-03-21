/**
 * File upload route for ApostAI
 * POST /api/upload — accepts base64-encoded image, uploads to S3, returns URL
 * Used by: pool logo (O5), team photos (A2), ad banners (A8)
 */
import { Request, Response, Express } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function registerUploadRoute(app: Express) {
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      const { data, contentType, folder = "uploads" } = req.body as {
        data: string;
        contentType: string;
        folder?: string;
      };

      if (!data || !contentType) {
        return res.status(400).json({ error: "data and contentType are required" });
      }

      const ext = ALLOWED_TYPES[contentType];
      if (!ext) {
        return res.status(400).json({ error: `Unsupported content type: ${contentType}` });
      }

      // Decode base64
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
      }

      const key = `${folder}/${nanoid(12)}.${ext}`;
      const { url } = await storagePut(key, buffer, contentType);

      return res.json({ url, key });
    } catch (err) {
      console.error("[Upload] Error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
