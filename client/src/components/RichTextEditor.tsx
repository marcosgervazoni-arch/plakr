/**
 * RichTextEditor — Editor rich text mobile-first para o Broadcast
 * Usa TipTap com toolbar adaptativa, upload de mídia/documentos e preview renderizado.
 */
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Minus,
  Paperclip,
  Video,
  Music,
  FileText,
  Loader2,
  Undo,
  Redo,
  X,
  Eye,
  Edit3,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface MediaAttachment {
  url: string;
  name: string;
  type: "image" | "video" | "audio" | "document";
  mimeType: string;
  size: number;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  attachments?: MediaAttachment[];
  onAttachmentsChange?: (attachments: MediaAttachment[]) => void;
  maxLength?: number;
}

// ─── Ícone de tipo de arquivo ─────────────────────────────────────────────────
function FileTypeIcon({ type }: { type: MediaAttachment["type"] }) {
  if (type === "image") return <ImageIcon className="h-4 w-4 text-blue-400" />;
  if (type === "video") return <Video className="h-4 w-4 text-purple-400" />;
  if (type === "audio") return <Music className="h-4 w-4 text-green-400" />;
  return <FileText className="h-4 w-4 text-yellow-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Botão de toolbar ─────────────────────────────────────────────────────────
function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-brand/20 text-brand"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({
  editor, onImageInsert, onAttachFile,
}: {
  editor: Editor | null;
  onImageInsert: (url: string) => void;
  onAttachFile: (type: "image" | "video" | "audio" | "document") => void;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  if (!editor) return null;

  const setLink = () => {
    if (!linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
  };

  const insertImage = () => {
    if (!imageUrl) return;
    onImageInsert(imageUrl);
    setImageUrl("");
  };

  return (
    <div className="border-b border-border/50 bg-muted/20 p-1.5 flex flex-wrap gap-0.5 items-center">
      {/* Histórico */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Formatação de texto */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito (Ctrl+B)">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico (Ctrl+I)">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado (Ctrl+U)">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Código inline">
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Alinhamento */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita">
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Listas */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista com marcadores">
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Inserir link"
            className={`p-1.5 rounded transition-colors ${
              editor.isActive("link")
                ? "bg-brand/20 text-brand"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <Label className="text-xs">URL do link</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setLink()}
                className="text-xs h-8"
              />
              <Button size="sm" className="h-8 px-3" onClick={setLink}>OK</Button>
            </div>
            {editor.isActive("link") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-400 hover:text-red-300 w-full"
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                Remover link
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Imagem por URL */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" title="Inserir imagem por URL" className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2">
            <Label className="text-xs">URL da imagem</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && insertImage()}
                className="text-xs h-8"
              />
              <Button size="sm" className="h-8 px-3" onClick={insertImage}>OK</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-4 bg-border/50 mx-0.5" />

      {/* Upload de arquivos */}
      <ToolbarButton onClick={() => onAttachFile("image")} title="Fazer upload de imagem">
        <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAttachFile("video")} title="Fazer upload de vídeo">
        <Video className="h-3.5 w-3.5 text-purple-400" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAttachFile("audio")} title="Fazer upload de áudio">
        <Music className="h-3.5 w-3.5 text-green-400" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAttachFile("document")} title="Fazer upload de documento">
        <Paperclip className="h-3.5 w-3.5 text-yellow-400" />
      </ToolbarButton>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function RichTextEditor({
  value, onChange, placeholder = "Escreva sua mensagem...",
  attachments = [], onAttachmentsChange, maxLength,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileType = useRef<MediaAttachment["type"]>("image");

  // Upload via REST endpoint /api/upload
  const doUpload = useCallback(async (file: File): Promise<{ url: string; key: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, contentType: file.type, fileName: file.name, folder: "broadcasts" }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Upload failed" }));
            reject(new Error(err.error ?? "Upload failed"));
          } else {
            resolve(await res.json());
          }
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-brand underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded-lg my-2" } }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] p-3 text-sm leading-relaxed",
      },
    },
  });

  const handleImageInsert = useCallback((url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleAttachFile = useCallback((type: MediaAttachment["type"]) => {
    pendingFileType.current = type;
    const acceptMap: Record<MediaAttachment["type"], string> = {
      image: "image/*",
      video: "video/*",
      audio: "audio/*",
      document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
    };
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptMap[type];
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 16 MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await doUpload(file);
      const fileType = pendingFileType.current;
      const attachment: MediaAttachment = {
        url: result.url,
        name: file.name,
        type: fileType,
        mimeType: file.type,
        size: file.size,
      };
      // Se for imagem, inserir no editor também
      if (fileType === "image") {
        editor?.chain().focus().setImage({ src: result.url, alt: file.name }).run();
      }
      onAttachmentsChange?.([...attachments, attachment]);
      toast.success(`${file.name} enviado com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [editor, attachments, onAttachmentsChange, doUpload]);

  const removeAttachment = useCallback((index: number) => {
    onAttachmentsChange?.(attachments.filter((_, i) => i !== index));
  }, [attachments, onAttachmentsChange]);

  const charCount = editor?.getText().length ?? 0;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
      {/* Tabs Editar / Preview */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/10 border-b border-border/30">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3 w-3" /> Editar
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
        {maxLength && (
          <span className={`text-xs ${charCount > maxLength * 0.9 ? "text-yellow-400" : "text-muted-foreground"}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      {mode === "edit" ? (
        <>
          <Toolbar editor={editor} onImageInsert={handleImageInsert} onAttachFile={handleAttachFile} />
          <div className="relative">
            <EditorContent editor={editor} />
            {uploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-b-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando arquivo...
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div
          className="prose prose-invert prose-sm max-w-none p-4 min-h-[120px] text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-muted-foreground italic'>Nenhum conteúdo ainda...</p>" }}
        />
      )}

      {/* Anexos */}
      {attachments.length > 0 && (
        <div className="border-t border-border/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Anexos ({attachments.length})
          </p>
          <div className="space-y-1.5">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
                <FileTypeIcon type={att.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p>
                </div>
                {att.type === "image" && (
                  <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ─── CSS para o editor ─────────────────────────────────────────────────────────
// Injetar estilos do TipTap via style tag
const editorStyles = `
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  height: 0;
}
.ProseMirror:focus { outline: none; }
.ProseMirror blockquote {
  border-left: 3px solid hsl(var(--brand));
  padding-left: 1rem;
  color: hsl(var(--muted-foreground));
  margin: 0.5rem 0;
}
.ProseMirror code {
  background: hsl(var(--muted));
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.85em;
}
.ProseMirror pre {
  background: hsl(var(--muted));
  padding: 0.75rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
}
.ProseMirror hr {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1rem 0;
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById("tiptap-styles");
  if (!existing) {
    const style = document.createElement("style");
    style.id = "tiptap-styles";
    style.textContent = editorStyles;
    document.head.appendChild(style);
  }
}
