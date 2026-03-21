/**
 * useImageUpload — hook para upload de imagens para S3 via /api/upload
 * Converte File para base64 e envia para o backend, retornando a URL pública.
 */
import { useState } from "react";
import { toast } from "sonner";

interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  onSuccess?: (url: string) => void;
  onError?: (err: string) => void;
}

export function useImageUpload(options: UploadOptions = {}) {
  const { folder = "uploads", maxSizeMB = 5, onSuccess, onError } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      const msg = "Apenas imagens são permitidas.";
      toast.error(msg);
      onError?.(msg);
      return null;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const msg = `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
      toast.error(msg);
      onError?.(msg);
      return null;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress(40);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: base64,
          contentType: file.type,
          folder,
        }),
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload falhou" }));
        throw new Error(err.error || "Upload falhou");
      }

      const { url } = await res.json();
      setProgress(100);
      onSuccess?.(url);
      return url as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast.error(msg);
      onError?.(msg);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return { upload, uploading, progress };
}
