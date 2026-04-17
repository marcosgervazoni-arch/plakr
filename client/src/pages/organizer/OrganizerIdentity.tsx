import { useUserPlan } from "@/hooks/useUserPlan";
/**
 * O5 — Identidade Visual
 * Especificação: formulário de nome, subtítulo e logo com preview em tempo real.
 * Layout duas colunas no desktop: formulário à esquerda, preview à direita.
 * Upload real via S3 usando ImageUploader + useImageUpload hook.
 * Seção adicional: Endereço do bolão (slug) com validação em tempo real.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import ImageUploader from "@/components/ImageUploader";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trophy, Users, Loader2, CheckCircle2, XCircle, Link2, AlertTriangle } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export default function OrganizerIdentity() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Slug editing state
  const [newSlug, setNewSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugCheckValue, setSlugCheckValue] = useState(""); // valor que está sendo verificado
  const [showSlugConfirm, setShowSlugConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pool) {
      setName(pool.name ?? "");
      setDescription(pool.description ?? "");
      setLogoUrl(pool.logoUrl ?? null);
      setNewSlug(pool.slug ?? "");
      setSlugDirty(false);
    }
  }, [pool]);

  // Validação local do slug
  const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  const slugValid = newSlug.length >= 3 && newSlug.length <= 80 && slugRegex.test(newSlug);
  const slugChanged = pool?.slug && newSlug !== pool.slug;

  // Verificação de disponibilidade com debounce
  const { data: availabilityData, isFetching: checkingSlug } = trpc.pools.checkSlugAvailability.useQuery(
    { slug: slugCheckValue, poolId: pool?.id ?? 0 },
    {
      enabled: !!slugCheckValue && slugCheckValue.length >= 3 && slugRegex.test(slugCheckValue) && !!pool?.id,
      staleTime: 5000,
    }
  );

  const handleSlugChange = useCallback((value: string) => {
    // Normalizar: apenas lowercase, números e hífens
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setNewSlug(normalized);
    setSlugDirty(true);
    // Debounce para verificar disponibilidade
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (normalized.length >= 3 && slugRegex.test(normalized)) {
        setSlugCheckValue(normalized);
      }
    }, 600);
  }, []);

  const updateMutation = trpc.pools.update.useMutation({
    onSuccess: () => {
      toast.success("Aparência atualizada!");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar."),
  });

  const updateSlugMutation = trpc.pools.updateSlug.useMutation({
    onSuccess: (data) => {
      toast.success("Endereço atualizado!", {
        description: `O bolão agora está em /pool/${data.newSlug}`,
      });
      setSlugDirty(false);
      // Navegar para o novo slug sem recarregar
      navigate(`/pool/${data.newSlug}/manage/identity`);
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar endereço."),
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

  const handleSlugSave = () => {
    if (!pool?.id || !slugValid || !slugChanged) return;
    setShowSlugConfirm(true);
  };

  const confirmSlugUpdate = () => {
    if (!pool?.id) return;
    updateSlugMutation.mutate({ poolId: pool.id, newSlug });
    setShowSlugConfirm(false);
  };

  // Status visual da verificação de slug
  const slugStatus = (() => {
    if (!slugDirty || !newSlug) return "idle";
    if (!slugValid) return "invalid";
    if (!slugChanged) return "unchanged";
    if (checkingSlug) return "checking";
    if (availabilityData?.available === false) return "taken";
    if (availabilityData?.available === true) return "available";
    return "idle";
  })();

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
      <div className="p-6 space-y-8 max-w-5xl">
        {/* ── Aparência ── */}
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Aparência
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
                "Salvar aparência"
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

        {/* ── Endereço do bolão (slug) ── */}
        <div className="border-t border-border/30 pt-8 space-y-5">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              <Link2 className="w-4 h-4 text-primary" />
              Endereço do bolão
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              O endereço é a parte da URL que identifica seu bolão. Você pode personalizá-lo para algo mais fácil de lembrar e compartilhar.
            </p>
          </div>

          <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
            {/* URL preview */}
            <div className="bg-muted/40 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-mono overflow-x-auto">
              <span className="text-muted-foreground shrink-0">plakr.io/pool/</span>
              <span className={`font-semibold ${
                slugStatus === "available" ? "text-green-400" :
                slugStatus === "taken" ? "text-red-400" :
                slugStatus === "invalid" ? "text-amber-400" :
                "text-foreground"
              }`}>
                {newSlug || pool?.slug || "..."}
              </span>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <Label htmlFor="slug">Novo endereço</Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={newSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="ex: bolao-da-galera"
                  className="bg-background border-border/50 pr-10 font-mono"
                  maxLength={80}
                />
                {/* Status icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {slugStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {slugStatus === "taken" && <XCircle className="w-4 h-4 text-red-400" />}
                  {slugStatus === "invalid" && <XCircle className="w-4 h-4 text-amber-400" />}
                </div>
              </div>

              {/* Status message */}
              <div className="text-xs min-h-[1.25rem]">
                {slugStatus === "available" && (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Endereço disponível
                  </span>
                )}
                {slugStatus === "taken" && (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Este endereço já está em uso
                  </span>
                )}
                {slugStatus === "invalid" && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Use apenas letras minúsculas, números e hífens (mín. 3 caracteres)
                  </span>
                )}
                {slugStatus === "unchanged" && (
                  <span className="text-muted-foreground">Este já é o endereço atual do bolão</span>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Links antigos continuam funcionando automaticamente — qualquer pessoa com o endereço anterior será redirecionada para o novo.
              </span>
            </div>

            <Button
              onClick={handleSlugSave}
              disabled={
                !slugChanged ||
                !slugValid ||
                slugStatus === "taken" ||
                slugStatus === "checking" ||
                slugStatus === "invalid" ||
                updateSlugMutation.isPending
              }
              variant="outline"
              className="w-full border-primary/40 text-primary hover:bg-primary/10"
            >
              {updateSlugMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Atualizando endereço...</>
              ) : (
                "Salvar novo endereço"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmação antes de salvar o slug */}
      <AlertDialog open={showSlugConfirm} onOpenChange={setShowSlugConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de endereço</AlertDialogTitle>
            <AlertDialogDescription>
              O endereço do bolão será alterado de{" "}
              <span className="font-mono font-semibold text-foreground">{pool?.slug}</span>{" "}
              para{" "}
              <span className="font-mono font-semibold text-primary">{newSlug}</span>.
              <br /><br />
              Links antigos continuarão funcionando automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSlugUpdate}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrganizerLayout>
  );
}
