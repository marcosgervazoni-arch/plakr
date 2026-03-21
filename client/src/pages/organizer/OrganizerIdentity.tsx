/**
 * O5 — Identidade Visual
 * Especificação: formulário de nome, subtítulo e logo com preview em tempo real.
 * Layout duas colunas no desktop: formulário à esquerda, preview à direita.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  X,
  Trophy,
  Users,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function OrganizerIdentity() {
  const { slug } = useParams<{ slug: string }>();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (pool) {
      setName(pool.name ?? "");
      setDescription(pool.description ?? "");
      setLogoPreview(pool.logoUrl ?? null);
    }
  }, [pool]);

  const updateMutation = trpc.pools.update.useMutation({
    onSuccess: () => {
      toast.success("Identidade visual atualizada!");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar."),
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas (JPG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Tamanho máximo: 5MB.");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSave = () => {
    if (!pool?.id || !name.trim()) return;
    // Logo upload would go through S3 in production; using preview URL for now
    updateMutation.mutate({
      poolId: pool.id,
      name: name.trim(),
      description: description.trim() || undefined,
      logoUrl: logoPreview ?? undefined,
    });
  };

  const isPro = pool?.plan === "pro";
  const memberCount = poolData?.memberCount ?? 0;

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      activeSection="identity"
    >
      <div className="p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Identidade Visual
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize o nome, subtítulo e logo do seu bolão.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-5">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo do bolão</Label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/40 bg-card"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border/30"
                    />
                    <p className="text-xs text-muted-foreground">Clique ou arraste para trocar</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Arraste ou clique para fazer upload</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP — máx. 5MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
              {logoPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" /> Remover logo
                </Button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Nome do bolão *</Label>
                <span className="text-xs text-muted-foreground">{name.length}/50</span>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder="Ex: Bolão da Galera Copa 2026"
                className="bg-card border-border/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="desc">Subtítulo / Descrição</Label>
                <span className="text-xs text-muted-foreground">{description.length}/120</span>
              </div>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 120))}
                placeholder="Uma frase curta sobre o bolão..."
                className="bg-card border-border/50 resize-none"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!name.trim() || updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </div>

          {/* Live preview */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Preview — como aparece para os participantes</Label>
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-12 h-12 rounded-full object-cover border border-border/30 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    className="font-bold text-base truncate"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {name || "Nome do bolão"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {description || "Subtítulo do bolão"}
                  </p>
                </div>
              </div>
              <div className="border-t border-border/20 pt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {memberCount} participantes
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  {poolData?.tournament?.name ?? "Campeonato"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              O preview atualiza em tempo real conforme você edita.
            </p>
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
