/**
 * AdminSponsorship — Gerenciamento de Patrocínio de Bolões (Naming Rights)
 * Exclusivo para Super Admin.
 * Permite configurar patrocinador por bolão: nome, logo, banner, popup, slug customizado.
 */
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Handshake,
  Search,
  Loader2,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Image,
  Link2,
  Bell,
  MessageSquare,
  Megaphone,
  UserCheck,
  Globe,
  Info,
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
  isActive: true,
  enabledForOrganizer: false,
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminSponsorship() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [form, setForm] = useState<SponsorForm>(EMPTY_FORM);
  const [openSections, setOpenSections] = useState<string[]>(["identity", "banner", "popup"]);

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
        isActive: existingSponsor.isActive ?? true,
        enabledForOrganizer: existingSponsor.enabledForOrganizer ?? false,
      });
    } else if (existingSponsor === null) {
      setForm(EMPTY_FORM);
    }
  }, [existingSponsor, selectedPoolId]);

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

  const enableOrganizerMutation = trpc.pools.adminEnableForOrganizer.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "Organizador pode editar o patrocínio." : "Edição pelo organizador desativada.");
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
    setOpenSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
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
      isActive: form.isActive,
      enabledForOrganizer: form.enabledForOrganizer,
    });
  };

  // ─── Seção colapsável ─────────────────────────────────────────────────────
  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => {
    const isOpen = openSections.includes(id);
    return (
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-card/50 hover:bg-card/80 transition-colors text-left"
        >
          <Icon className="h-4 w-4 text-brand" />
          <span className="font-medium text-sm flex-1">{title}</span>
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isOpen && <div className="p-4 space-y-4">{children}</div>}
      </div>
    );
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
                <Section id="identity" title="Identidade do Patrocinador" icon={Handshake}>
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
                        URL do Logo
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent>URL pública da imagem do logo do patrocinador</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        placeholder="https://..."
                        value={form.sponsorLogoUrl}
                        onChange={(e) => setForm((f) => ({ ...f, sponsorLogoUrl: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      Slug Customizado
                      <Badge variant="outline" className="text-[10px] ml-1 border-brand/30 text-brand">Exclusivo Admin</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/pool/</span>
                      <Input
                        placeholder="dado-bier-brasileirao"
                        value={form.customSlug}
                        onChange={(e) => setForm((f) => ({ ...f, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens. Deixe vazio para manter o slug original.</p>
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
                <Section id="welcome" title="Mensagem de Boas-vindas" icon={MessageSquare}>
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
                <Section id="banner" title="Banner Exclusivo no Bolão" icon={Image}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Banner visível para todos os membros do bolão</p>
                    <Switch
                      checked={form.bannerActive}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, bannerActive: v }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>URL da Imagem do Banner</Label>
                      <Input
                        placeholder="https://..."
                        value={form.bannerImageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, bannerImageUrl: e.target.value }))}
                        disabled={!form.bannerActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Link de Destino do Banner</Label>
                      <Input
                        placeholder="https://..."
                        value={form.bannerLinkUrl}
                        onChange={(e) => setForm((f) => ({ ...f, bannerLinkUrl: e.target.value }))}
                        disabled={!form.bannerActive}
                        className="disabled:opacity-50"
                      />
                    </div>
                  </div>
                </Section>

                {/* Seção: Popup */}
                <Section id="popup" title="Popup Patrocinado" icon={Megaphone}>
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
                      <Label>URL da Imagem</Label>
                      <Input
                        placeholder="https://..."
                        value={form.popupImageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, popupImageUrl: e.target.value }))}
                        disabled={!form.popupActive}
                        className="disabled:opacity-50"
                      />
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

                {/* Seção: Compartilhamento e Notificação */}
                <Section id="sharing" title="Compartilhamento e Notificação" icon={Bell}>
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
                  <div className="space-y-1.5">
                    <Label>Texto de Notificação Patrocinada</Label>
                    <Textarea
                      placeholder="Ex: Rodada 5 começa amanhã — lembrança da Cervejaria Dado Bier!"
                      value={form.sponsoredNotificationText}
                      onChange={(e) => setForm((f) => ({ ...f, sponsoredNotificationText: e.target.value }))}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Usado nas notificações de lembrete de rodada para membros deste bolão</p>
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
