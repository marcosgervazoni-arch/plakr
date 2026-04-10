/**
 * AdminSponsorship — Gerenciamento de Patrocínio de Bolões (Naming Rights)
 * Exclusivo para Super Admin.
 * Permite configurar patrocinador por bolão: nome, logo, banner, popup, slug customizado.
 *
 * CORREÇÃO: Section extraído para fora do componente principal para evitar
 * recriação a cada render (causava perda de foco nos inputs).
 */
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Handshake,
  Search,
  Loader2,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Image,
  Bell,
  MessageSquare,
  Megaphone,
  UserCheck,
  Info,
  Upload,
  Trophy,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SponsorForm {
  sponsorName: string;
  sponsorLogoUrl: string;
  customSlug: string;
  welcomeMessage: string;
  welcomeMessageActive: boolean;
  bannerImageUrl: string;
  bannerLinkUrl: string;
  bannerActive: boolean;
  popupTitle: string;
  popupText: string;
  popupImageUrl: string;
  popupButtonText: string;
  popupButtonUrl: string;
  popupFrequency: "once_per_member" | "once_per_session" | "always";
  popupDelaySeconds: number;
  popupActive: boolean;
  showLogoOnShareCard: boolean;
  sponsoredNotificationText: string;
  sponsoredNotificationActive: boolean;
  rankingNotificationText: string;
  rankingNotificationActive: boolean;
  isActive: boolean;
  enabledForOrganizer: boolean;
}

const EMPTY_FORM: SponsorForm = {
  sponsorName: "",
  sponsorLogoUrl: "",
  customSlug: "",
  welcomeMessage: "",
  welcomeMessageActive: false,
  bannerImageUrl: "",
  bannerLinkUrl: "",
  bannerActive: false,
  popupTitle: "",
  popupText: "",
  popupImageUrl: "",
  popupButtonText: "",
  popupButtonUrl: "",
  popupFrequency: "once_per_session",
  popupDelaySeconds: 3,
  popupActive: false,
  showLogoOnShareCard: false,
  sponsoredNotificationText: "",
  sponsoredNotificationActive: false,
  rankingNotificationText: "",
  rankingNotificationActive: false,
  isActive: true,
  enabledForOrganizer: false,
};

// ─── Componente Section (FORA do componente principal para evitar re-criação) ─

interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  openSections: string[];
  onToggle: (id: string) => void;
}

function Section({ id, title, icon: Icon, children, openSections, onToggle }: SectionProps) {
  const isOpen = openSections.includes(id);
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-card/50 hover:bg-card/80 transition-colors text-left"
      >
        <Icon className="h-4 w-4 text-brand" />
        <span className="font-medium text-sm flex-1">{title}</span>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Componente de upload de logo ─────────────────────────────────────────────

interface LogoUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB.");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            mimeType: file.type,
            filename: `sponsor-logo-${Date.now()}.${file.name.split(".").pop()}`,
          }),
        });
        const data = await res.json();
        if (data.url) {
          onChange(data.url);
          toast.success("Logo enviado com sucesso!");
        } else {
          toast.error("Erro ao enviar logo.");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao enviar logo.");
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="https://... ou faça upload abaixo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">{uploading ? "Enviando..." : "Upload"}</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {value && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          <img src={value} alt="Logo preview" className="h-8 w-8 object-contain rounded" />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onChange("")}>
            ×
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Constantes de Raridade ─────────────────────────────────────────────────

const DYNAMICS = [
  { key: "participation", label: "Participação", rarity: "Comum", rarityColor: "text-slate-400", desc: "Entrou no bolão patrocinado" },
  { key: "faithful_bettor", label: "Palpiteiro Fiel", rarity: "Incomum", rarityColor: "text-green-400", desc: "Fez palpite em todos os jogos" },
  { key: "podium", label: "Pódio", rarity: "Raro", rarityColor: "text-blue-400", desc: "Terminou entre os 3 primeiros" },
  { key: "exact_score", label: "Placar Exato", rarity: "Raro", rarityColor: "text-blue-400", desc: "Acertou o placar exato de 1 jogo" },
  { key: "zebra_detector", label: "Zebra Detector", rarity: "Épico", rarityColor: "text-purple-400", desc: "Acertou resultado de jogo considerado zebra" },
  { key: "champion", label: "Campeão", rarity: "Épico", rarityColor: "text-purple-400", desc: "Terminou em 1º lugar" },
  { key: "perfect_round", label: "Rodada Perfeita", rarity: "Lendário", rarityColor: "text-yellow-400", desc: "Acertou todos os resultados de uma rodada" },
  { key: "veteran", label: "Vetrano", rarity: "Incomum", rarityColor: "text-green-400", desc: "Participou de 2+ edições do mesmo patrocinador" },
  { key: "manual", label: "Manual", rarity: "Especial", rarityColor: "text-orange-400", desc: "Atribuído manualmente pelo Super Admin" },
] as const;

// ─── Componente SponsorBadgesSection ─────────────────────────────────────────

interface SponsorBadgesSectionProps {
  poolId: number | null;
  sponsorId: number | undefined;
}

function SponsorBadgesSection({ poolId, sponsorId }: SponsorBadgesSectionProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadKey, setPendingUploadKey] = useState<string | null>(null);

  const { data: badges, refetch: refetchBadges } = trpc.pools.badgeList.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const upsertBadge = trpc.pools.badgeUpsert.useMutation({
    onSuccess: () => { toast.success("Badge salvo!"); refetchBadges(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleBadge = trpc.pools.badgeToggle.useMutation({
    onSuccess: () => refetchBadges(),
    onError: (e) => toast.error(e.message),
  });

  const removeBadge = trpc.pools.badgeRemove.useMutation({
    onSuccess: () => { toast.success("Badge removido."); refetchBadges(); },
    onError: (e) => toast.error(e.message),
  });

  const getBadgeForDynamic = (key: string) => badges?.find((b) => b.dynamic === key);

  const handleSvgUpload = async (file: File, dynamicKey: string) => {
    if (!file.type.includes("svg") && !file.type.startsWith("image/")) {
      toast.error("Apenas SVG ou imagens são permitidos."); return;
    }
    if (file.size > 1 * 1024 * 1024) { toast.error("Arquivo deve ter no máximo 1MB."); return; }
    setUploadingKey(dynamicKey);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type, filename: `badge-${dynamicKey}-${Date.now()}.${file.name.split(".").pop()}` }),
        });
        const data = await res.json();
        if (data.url && poolId && sponsorId) {
          const existing = getBadgeForDynamic(dynamicKey);
          await upsertBadge.mutateAsync({
            id: existing?.id,
            poolId,
            sponsorId,
            dynamic: dynamicKey as any,
            badgeName: existing?.badgeName || DYNAMICS.find(d => d.key === dynamicKey)?.label || dynamicKey,
            svgUrl: data.url,
            isActive: existing?.isActive ?? false,
          });
        } else { toast.error("Erro ao enviar arquivo."); }
        setUploadingKey(null);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Erro ao enviar arquivo."); setUploadingKey(null); }
  };

  if (!poolId || !sponsorId) return null;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenSections(s => s.includes("badges") ? s.filter(x => x !== "badges") : [...s, "badges"])}
        className="w-full flex items-center gap-2 px-4 py-3 bg-card/50 hover:bg-card/80 transition-colors text-left"
      >
        <Trophy className="h-4 w-4 text-brand" />
        <span className="font-medium text-sm flex-1">Badges Patrocinados</span>
        <span className="text-xs text-muted-foreground mr-2">{badges?.filter(b => b.isActive).length ?? 0} ativos</span>
        {openSections.includes("badges") ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {openSections.includes("badges") && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">Configure até 9 badges para este bolão. Cada dinâmica tem raridade fixa. Ative o toggle para disponibilizar o badge.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && pendingUploadKey) handleSvgUpload(file, pendingUploadKey);
              e.target.value = "";
            }}
          />
          <div className="space-y-2">
            {DYNAMICS.map((dyn) => {
              const badge = getBadgeForDynamic(dyn.key);
              const isUploading = uploadingKey === dyn.key;
              return (
                <div key={dyn.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                  {/* Preview SVG */}
                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                    {badge?.svgUrl ? (
                      <img src={badge.svgUrl} alt={dyn.label} className="h-8 w-8 object-contain" />
                    ) : (
                      <Trophy className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{dyn.label}</span>
                      <span className={`text-xs font-medium ${dyn.rarityColor}`}>{dyn.rarity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{dyn.desc}</p>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isUploading}
                      onClick={() => { setPendingUploadKey(dyn.key); fileInputRef.current?.click(); }}
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      <span className="ml-1">{badge?.svgUrl ? "Trocar" : "SVG"}</span>
                    </Button>
                    {badge && (
                      <>
                        <Switch
                          checked={badge.isActive}
                          onCheckedChange={(v) => toggleBadge.mutate({ id: badge.id, isActive: v })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeBadge.mutate({ id: badge.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminSponsorship() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [form, setForm] = useState<SponsorForm>(EMPTY_FORM);
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Buscar lista de bolões
  const { data: pools, isLoading: loadingPools } = trpc.pools.adminList.useQuery({ limit: 200 });

  // Buscar patrocínio do bolão selecionado
  const { data: existingSponsor, isLoading: loadingSponsor, refetch: refetchSponsor } = trpc.pools.getSponsor.useQuery(
    { poolId: selectedPoolId! },
    { enabled: !!selectedPoolId }
  );

  // Popular formulário quando os dados chegam
  useEffect(() => {
    if (!selectedPoolId) return;
    if (existingSponsor) {
      setForm({
        sponsorName: existingSponsor.sponsorName ?? "",
        sponsorLogoUrl: existingSponsor.sponsorLogoUrl ?? "",
        customSlug: existingSponsor.customSlug ?? "",
        welcomeMessage: existingSponsor.welcomeMessage ?? "",
        welcomeMessageActive: existingSponsor.welcomeMessageActive ?? false,
        bannerImageUrl: existingSponsor.bannerImageUrl ?? "",
        bannerLinkUrl: existingSponsor.bannerLinkUrl ?? "",
        bannerActive: existingSponsor.bannerActive ?? false,
        popupTitle: existingSponsor.popupTitle ?? "",
        popupText: existingSponsor.popupText ?? "",
        popupImageUrl: existingSponsor.popupImageUrl ?? "",
        popupButtonText: existingSponsor.popupButtonText ?? "",
        popupButtonUrl: existingSponsor.popupButtonUrl ?? "",
        popupFrequency: (existingSponsor.popupFrequency as SponsorForm["popupFrequency"]) ?? "once_per_session",
        popupDelaySeconds: existingSponsor.popupDelaySeconds ?? 3,
        popupActive: existingSponsor.popupActive ?? false,
        showLogoOnShareCard: existingSponsor.showLogoOnShareCard ?? false,
        sponsoredNotificationText: existingSponsor.sponsoredNotificationText ?? "",
        sponsoredNotificationActive: (existingSponsor as any).sponsoredNotificationActive ?? false,
        rankingNotificationText: (existingSponsor as any).rankingNotificationText ?? "",
        rankingNotificationActive: (existingSponsor as any).rankingNotificationActive ?? false,
        isActive: existingSponsor.isActive ?? true,
        enabledForOrganizer: existingSponsor.enabledForOrganizer ?? false,
      });
    } else if (existingSponsor === null) {
      setForm(EMPTY_FORM);
    }
  }, [existingSponsor, selectedPoolId]);

  // ─── Queries e mutations de Badges Patrocinados ─────────────────────────
  const badgeFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBadgeKey, setUploadingBadgeKey] = useState<string | null>(null);
  const [pendingBadgeKey, setPendingBadgeKey] = useState<string | null>(null);
  const { data: sponsorBadges, refetch: refetchBadges } = trpc.pools.badgeList.useQuery(
    { poolId: selectedPoolId! },
    { enabled: !!selectedPoolId && !!existingSponsor?.id }
  );
  const upsertBadgeMutation = trpc.pools.badgeUpsert.useMutation({
    onSuccess: () => { toast.success("Badge salvo!"); refetchBadges(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleBadgeMutation = trpc.pools.badgeToggle.useMutation({
    onSuccess: () => refetchBadges(),
    onError: (e) => toast.error(e.message),
  });
  const removeBadgeMutation = trpc.pools.badgeRemove.useMutation({
    onSuccess: () => { toast.success("Badge removido."); refetchBadges(); },
    onError: (e) => toast.error(e.message),
  });
  const getBadgeForDynamic = (key: string) => sponsorBadges?.find((b) => b.dynamic === key);
  const handleBadgeSvgUpload = async (file: File, dynamicKey: string) => {
    if (!file.type.includes("svg") && !file.type.startsWith("image/")) {
      toast.error("Apenas SVG ou imagens são permitidos."); return;
    }
    if (file.size > 1 * 1024 * 1024) { toast.error("Arquivo deve ter no máximo 1MB."); return; }
    setUploadingBadgeKey(dynamicKey);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type, filename: `badge-${dynamicKey}-${Date.now()}.${file.name.split(".").pop()}` }),
        });
        const data = await res.json();
        if (data.url && selectedPoolId && existingSponsor?.id) {
          const existing = getBadgeForDynamic(dynamicKey);
          await upsertBadgeMutation.mutateAsync({
            id: existing?.id,
            poolId: selectedPoolId,
            sponsorId: existingSponsor.id,
            dynamic: dynamicKey as any,
            badgeName: existing?.badgeName || DYNAMICS.find(d => d.key === dynamicKey)?.label || dynamicKey,
            svgUrl: data.url,
            isActive: existing?.isActive ?? false,
          });
        } else { toast.error("Erro ao enviar arquivo."); }
        setUploadingBadgeKey(null);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Erro ao enviar arquivo."); setUploadingBadgeKey(null); }
  };

  const upsertMutation = trpc.pools.adminUpsertSponsor.useMutation({
    onSuccess: () => {
      toast.success("Patrocínio salvo com sucesso!");
      refetchSponsor();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.pools.adminDeleteSponsor.useMutation({
    onSuccess: () => {
      toast.success("Patrocínio removido.");
      setForm(EMPTY_FORM);
      refetchSponsor();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.pools.adminToggleSponsor.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Patrocínio ativado." : "Patrocínio desativado.");
      refetchSponsor();
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Filtro de bolões ─────────────────────────────────────────────────────
  const filteredPools = (pools ?? []).filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPool = (pools ?? []).find((p) => p.id === selectedPoolId);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const toggleSection = (id: string) => {
    setOpenSections((prev) => prev.includes(id) ? [] : [id]);
  };

  const handleSave = () => {
    if (!selectedPoolId) return;
    upsertMutation.mutate({
      poolId: selectedPoolId,
      sponsorName: form.sponsorName,
      sponsorLogoUrl: form.sponsorLogoUrl || null,
      customSlug: form.customSlug || null,
      welcomeMessage: form.welcomeMessage || null,
      welcomeMessageActive: form.welcomeMessageActive,
      bannerImageUrl: form.bannerImageUrl || null,
      bannerLinkUrl: form.bannerLinkUrl || null,
      bannerActive: form.bannerActive,
      popupTitle: form.popupTitle || null,
      popupText: form.popupText || null,
      popupImageUrl: form.popupImageUrl || null,
      popupButtonText: form.popupButtonText || null,
      popupButtonUrl: form.popupButtonUrl || null,
      popupFrequency: form.popupFrequency,
      popupDelaySeconds: form.popupDelaySeconds,
      popupActive: form.popupActive,
      showLogoOnShareCard: form.showLogoOnShareCard,
      sponsoredNotificationText: form.sponsoredNotificationText || null,
      sponsoredNotificationActive: form.sponsoredNotificationActive,
      rankingNotificationText: form.rankingNotificationText || null,
      rankingNotificationActive: form.rankingNotificationActive,
      isActive: form.isActive,
      enabledForOrganizer: form.enabledForOrganizer,
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout activeSection="sponsorship">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Handshake className="h-6 w-6 text-brand" />
              Patrocínio de Bolões
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure naming rights e publicidade exclusiva por bolão.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Coluna esquerda: lista de bolões ── */}
          <div className="lg:col-span-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar bolão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {loadingPools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPools.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum bolão encontrado.</p>
              ) : (
                filteredPools.map((pool) => (
                  <button
                    key={pool.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selectedPoolId === pool.id
                        ? "bg-brand/15 text-brand font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="font-medium truncate">{pool.name}</div>
                    <div className="text-xs text-muted-foreground truncate">/{pool.slug}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Coluna direita: formulário de patrocínio ── */}
          <div className="lg:col-span-2">
            {!selectedPoolId ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border/50 rounded-xl text-muted-foreground gap-3">
                <Handshake className="h-10 w-10 opacity-30" />
                <p className="text-sm">Selecione um bolão para configurar o patrocínio</p>
              </div>
            ) : loadingSponsor ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status bar */}
                <Card className="bg-card/50">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm">{selectedPool?.name}</p>
                      <p className="text-xs text-muted-foreground">/{selectedPool?.slug}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {existingSponsor && (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={existingSponsor.isActive}
                              onCheckedChange={(v) => toggleMutation.mutate({ poolId: selectedPoolId, isActive: v })}
                            />
                            <span className="text-xs text-muted-foreground">
                              {existingSponsor.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => deleteMutation.mutate({ poolId: selectedPoolId })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remover
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={upsertMutation.isPending || !form.sponsorName}
                        className="bg-brand hover:bg-brand/90 text-brand-foreground"
                      >
                        {upsertMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Seção: Identidade */}
                <Section id="identity" title="Identidade do Patrocinador" icon={Handshake} openSections={openSections} onToggle={toggleSection}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nome do Patrocinador *</Label>
                      <Input
                        placeholder="Ex: Cervejaria Dado Bier"
                        value={form.sponsorName}
                        onChange={(e) => setForm((f) => ({ ...f, sponsorName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        Slug Customizado
                        <Badge variant="outline" className="text-[10px] ml-1 border-brand/30 text-brand">Exclusivo Admin</Badge>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm shrink-0">/pool/</span>
                        <Input
                          placeholder="dado-bier-brasileirao"
                          value={form.customSlug}
                          onChange={(e) => setForm((f) => ({ ...f, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      Logo do Patrocinador
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>Cole uma URL pública ou faça upload direto da imagem (máx. 2MB)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <LogoUploader
                      value={form.sponsorLogoUrl}
                      onChange={(url) => setForm((f) => ({ ...f, sponsorLogoUrl: url }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-brand" />
                        Permitir edição pelo Organizador
                        <Badge variant="outline" className="text-[10px] ml-1 border-brand/30 text-brand">Exclusivo Admin</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Organizadores Pro Ilimitado podem editar campos parciais (exceto slug)</p>
                    </div>
                    <Switch
                      checked={form.enabledForOrganizer}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, enabledForOrganizer: v }))}
                    />
                  </div>
                </Section>

                {/* Seção: Mensagem de boas-vindas */}
                <Section id="welcome" title="Mensagem de Boas-vindas" icon={MessageSquare} openSections={openSections} onToggle={toggleSection}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Exibida ao entrar no bolão (uma vez por membro)</p>
                    <Switch
                      checked={form.welcomeMessageActive}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, welcomeMessageActive: v }))}
                    />
                  </div>
                  <Textarea
                    placeholder="Ex: Esse bolão é patrocinado pela Cervejaria Dado Bier! Aproveite 10% de desconto com o código BOLÃO10."
                    value={form.welcomeMessage}
                    onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
                    rows={3}
                    disabled={!form.welcomeMessageActive}
                    className="disabled:opacity-50"
                  />
                </Section>

                {/* Seção: Banner */}
                <Section id="banner" title="Banner Exclusivo no Bolão" icon={Image} openSections={openSections} onToggle={toggleSection}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Banner visível para todos os membros do bolão</p>
                    <Switch
                      checked={form.bannerActive}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, bannerActive: v }))}
                    />
                  </div>
                  <div className={`space-y-4 ${!form.bannerActive ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="space-y-1.5">
                      <Label>Imagem do Banner</Label>
                      <LogoUploader
                        value={form.bannerImageUrl}
                        onChange={(url) => setForm((f) => ({ ...f, bannerImageUrl: url }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Link de Destino do Banner</Label>
                      <Input
                        placeholder="https://..."
                        value={form.bannerLinkUrl}
                        onChange={(e) => setForm((f) => ({ ...f, bannerLinkUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                </Section>

                {/* Seção: Popup */}
                <Section id="popup" title="Popup Patrocinado" icon={Megaphone} openSections={openSections} onToggle={toggleSection}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Popup exibido na página do bolão</p>
                    <Switch
                      checked={form.popupActive}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, popupActive: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Título do Popup</Label>
                      <Input
                        placeholder="Ex: Oferta especial!"
                        value={form.popupTitle}
                        onChange={(e) => setForm((f) => ({ ...f, popupTitle: e.target.value }))}
                        disabled={!form.popupActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Imagem do Popup</Label>
                      <div className={!form.popupActive ? "opacity-50 pointer-events-none" : ""}>
                        <LogoUploader
                          value={form.popupImageUrl}
                          onChange={(url) => setForm((f) => ({ ...f, popupImageUrl: url }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Texto do Popup</Label>
                    <Textarea
                      placeholder="Ex: Use o código BOLÃO10 para 10% de desconto!"
                      value={form.popupText}
                      onChange={(e) => setForm((f) => ({ ...f, popupText: e.target.value }))}
                      rows={2}
                      disabled={!form.popupActive}
                      className="disabled:opacity-50"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Texto do Botão</Label>
                      <Input
                        placeholder="Ex: Aproveitar oferta"
                        value={form.popupButtonText}
                        onChange={(e) => setForm((f) => ({ ...f, popupButtonText: e.target.value }))}
                        disabled={!form.popupActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Link do Botão</Label>
                      <Input
                        placeholder="https://..."
                        value={form.popupButtonUrl}
                        onChange={(e) => setForm((f) => ({ ...f, popupButtonUrl: e.target.value }))}
                        disabled={!form.popupActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Frequência de Exibição</Label>
                      <Select
                        value={form.popupFrequency}
                        onValueChange={(v) => setForm((f) => ({ ...f, popupFrequency: v as SponsorForm["popupFrequency"] }))}
                        disabled={!form.popupActive}
                      >
                        <SelectTrigger className="disabled:opacity-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once_per_member">Uma vez por membro</SelectItem>
                          <SelectItem value="once_per_session">Uma vez por sessão</SelectItem>
                          <SelectItem value="always">Sempre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Delay de Exibição (segundos)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={form.popupDelaySeconds}
                        onChange={(e) => setForm((f) => ({ ...f, popupDelaySeconds: Number(e.target.value) }))}
                        disabled={!form.popupActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                  </div>
                </Section>

                {/* Seção: Notificações */}
                <Section id="notifications" title="Notificações Patrocinadas" icon={Bell} openSections={openSections} onToggle={toggleSection}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Bell className="h-3.5 w-3.5 text-brand" />
                          Notificação de Lembrete de Rodada
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent>Usado nos lembretes de palpite enviados antes de cada rodada</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Aparece como assinatura nos lembretes de rodada para membros deste bolão</p>
                      </div>
                      <Switch
                        checked={form.sponsoredNotificationActive}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, sponsoredNotificationActive: v }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Ex: Rodada 5 começa amanhã — lembrança da Cervejaria Dado Bier!"
                      value={form.sponsoredNotificationText}
                      onChange={(e) => setForm((f) => ({ ...f, sponsoredNotificationText: e.target.value }))}
                      rows={2}
                      disabled={!form.sponsoredNotificationActive}
                      className="disabled:opacity-50"
                    />
                  </div>

                  <div className="border-t border-border/30 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-brand" />
                          Notificação de Atualização do Ranking
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Enviada aos membros sempre que o ranking do bolão for atualizado</p>
                      </div>
                      <Switch
                        checked={form.rankingNotificationActive}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, rankingNotificationActive: v }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Ex: 🏆 Ranking atualizado! Veja sua posição — patrocínio Cervejaria Dado Bier."
                      value={form.rankingNotificationText}
                      onChange={(e) => setForm((f) => ({ ...f, rankingNotificationText: e.target.value }))}
                      rows={2}
                      disabled={!form.rankingNotificationActive}
                      className="disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">Texto da notificação enviada após cada atualização de pontuação neste bolão</p>
                  </div>
                </Section>

                {/* Seção: Badges Patrocinados */}
                {selectedPoolId && (
                  <Section id="badges" title="Badges Patrocinados" icon={Trophy} openSections={openSections} onToggle={toggleSection}>
                    {!existingSponsor?.id && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs mb-2">
                        ⚠️ Salve o patrocinador primeiro para poder fazer upload de SVGs e ativar badges.
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Configure até 9 badges para este bolão. Cada dinâmica tem raridade fixa. Ative o toggle para disponibilizar o badge.</p>
                    <input
                      ref={badgeFileInputRef}
                      type="file"
                      accept="image/svg+xml,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && pendingBadgeKey) handleBadgeSvgUpload(file, pendingBadgeKey);
                        e.target.value = "";
                      }}
                    />
                    <div className="space-y-2">
                      {DYNAMICS.map((dyn) => {
                        const badge = getBadgeForDynamic(dyn.key);
                        const isUploading = uploadingBadgeKey === dyn.key;
                        return (
                          <div key={dyn.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                              {badge?.svgUrl ? (
                                <img src={badge.svgUrl} alt={dyn.label} className="h-8 w-8 object-contain" />
                              ) : (
                                <Trophy className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{dyn.label}</span>
                                <span className={`text-xs font-medium ${dyn.rarityColor}`}>{dyn.rarity}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{dyn.desc}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={isUploading}
                                onClick={() => { setPendingBadgeKey(dyn.key); badgeFileInputRef.current?.click(); }}
                              >
                                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                <span className="ml-1">{badge?.svgUrl ? "Trocar" : "SVG"}</span>
                              </Button>
                              {badge && (
                                <>
                                  <Switch
                                    checked={badge.isActive}
                                    onCheckedChange={(v) => toggleBadgeMutation.mutate({ id: badge.id, isActive: v })}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => removeBadgeMutation.mutate({ id: badge.id })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Seção: Compartilhamento */}
                <Section id="sharing" title="Compartilhamento" icon={Bell} openSections={openSections} onToggle={toggleSection}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Logo no Card de Compartilhamento</p>
                      <p className="text-xs text-muted-foreground">Exibe o logo do patrocinador quando o usuário compartilha o palpite</p>
                    </div>
                    <Switch
                      checked={form.showLogoOnShareCard}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, showLogoOnShareCard: v }))}
                    />
                  </div>
                </Section>

              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
