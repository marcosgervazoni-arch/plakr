import { useUserPlan } from "@/hooks/useUserPlan";
/**
 * O5 — Identidade Visual
 * Especificação: formulário de nome, subtítulo e logo com preview em tempo real.
 * Layout duas colunas no desktop: formulário à esquerda, preview à direita.
 * Upload real via S3 usando ImageUploader + useImageUpload hook.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import ImageUploader from "@/components/ImageUploader";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trophy, Users, Loader2 } from "lucide-react";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function OrganizerIdentity() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pool) {
      setName(pool.name ?? "");
      setDescription(pool.description ?? "");
      setLogoUrl(pool.logoUrl ?? null);
    }
  }, [pool]);

  const updateMutation = trpc.pools.update.useMutation({
    onSuccess: () => {
      toast.success("Identidade visual atualizada!");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar."),
  });

  const handleSave = () => {
    if (!pool?.id || !name.trim()) return;
    updateMutation.mutate({
      poolId: pool.id,
      name: name.trim(),
      description: description.trim() || undefined,
      logoUrl: logoUrl ?? undefined,
    });
  };

  const { isPro, isProExpired } = useUserPlan();
  const memberCount = poolData?.memberCount ?? 0;

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as "active" | "closed" | "draft") ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
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
            {/* Logo upload — real S3 */}
            <ImageUploader
              value={logoUrl}
              onChange={setLogoUrl}
              folder="pool-logos"
              label="Logo do bolão"
              hint="PNG, JPG ou WebP até 5MB. Recomendado: 400×400px"
              aspectRatio="square"
            />

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
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
              Preview — como aparece para os participantes
            </Label>
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
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
