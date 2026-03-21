/**
 * ImageUploader — componente reutilizável para upload de imagens
 * Suporta drag-and-drop, preview em tempo real e upload para S3.
 * Usado em: O5 (logo do bolão), A2 (fotos de times), A8 (banners de anúncios)
 */
import { useImageUpload } from "@/hooks/useImageUpload";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface ImageUploaderProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  folder?: string;
  label?: string;
  hint?: string;
  aspectRatio?: "square" | "wide" | "banner";
  className?: string;
  disabled?: boolean;
}

const ASPECT: Record<string, string> = {
  square: "aspect-square",
  wide: "aspect-video",
  banner: "aspect-[3/1]",
};

export default function ImageUploader({
  value,
  onChange,
  folder = "uploads",
  label = "Imagem",
  hint = "PNG, JPG ou WebP até 5MB",
  aspectRatio = "square",
  className,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { upload, uploading, progress } = useImageUpload({
    folder,
    onSuccess: (url) => onChange?.(url),
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;
      await upload(file);
    },
    [upload, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          ASPECT[aspectRatio],
          dragging ? "border-brand bg-brand/10" : "border-border/50 hover:border-brand/50 hover:bg-muted/20",
          disabled && "opacity-50 cursor-not-allowed",
          value && "border-solid border-border/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                disabled={disabled}
              >
                <Upload className="h-3.5 w-3.5" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); onChange?.(null); }}
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
            <p className="text-xs text-muted-foreground">
              {uploading ? "Enviando..." : "Arraste ou clique para enviar"}
            </p>
            <p className="text-xs text-muted-foreground/60">{hint}</p>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
