import AdminLayout from "@/components/AdminLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  Edit2,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  Monitor,
  MousePointerClick,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Dimensões recomendadas por posição ──────────────────────────────────────
const POSITION_DIMENSIONS: Record<string, { label: string; size: string; ratio: string }> = {
  top:              { label: "Topo",           size: "1200 × 90 px",  ratio: "Banner horizontal (Leaderboard)" },
  sidebar:          { label: "Sidebar",        size: "300 × 250 px",  ratio: "Medium Rectangle" },
  between_sections: { label: "Entre Seções",   size: "728 × 90 px",   ratio: "Banner horizontal (Tablet)" },
  bottom:           { label: "Rodapé",         size: "970 × 90 px",   ratio: "Banner horizontal (Large)" },
  popup:            { label: "Popup",          size: "600 × 400 px",  ratio: "Popup / Interstitial" },
};

const POSITION_LABELS: Record<string, string> = {
  top: "Topo", sidebar: "Sidebar", between_sections: "Entre Seções", bottom: "Rodapé", popup: "Popup",
};

const TYPE_LABELS: Record<string, string> = {
  banner: "Banner", video: "Vídeo", script: "Script",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  all: <Globe className="h-3 w-3" />,
  desktop: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
};

type AdForm = {
  title: string;
  assetUrl: string;
  linkUrl: string;
  type: "banner" | "video" | "script";
  position: "sidebar" | "top" | "between_sections" | "bottom" | "popup";
  device: "all" | "desktop" | "mobile";
  isActive: boolean;
  startAt: string;
  endAt: string;
  sortOrder: number;
};

const defaultForm: AdForm = {
  title: "", assetUrl: "", linkUrl: "", type: "banner", position: "sidebar",
  device: "all", isActive: true, startAt: "", endAt: "", sortOrder: 0,
};

export default function AdminAds() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editAd, setEditAd] = useState<(AdForm & { id: number }) | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<AdForm>(defaultForm);

  const { data: ads, isLoading, refetch } = trpc.ads.list.useQuery();
  const { data: clicksData } = trpc.ads.clicksByDay.useQuery({});
  const { data: settings, refetch: refetchSettings } = trpc.platform.getSettings.useQuery();

  const handleExportCsv = () => {
    if (!clicksData || clicksData.length === 0) { toast.info("Nenhum clique registrado ainda."); return; }
    const header = "Anúncio,Data,Cliques";
    const rows = clicksData.map((r) => `"${r.adTitle}",${r.day},${r.clicks}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cliques-anuncios-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const createMutation = trpc.ads.create.useMutation({
    onSuccess: () => { toast.success("Anúncio criado."); setCreateOpen(false); refetch(); setForm(defaultForm); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const updateMutation = trpc.ads.update.useMutation({
    onSuccess: () => { toast.success("Anúncio atualizado."); setEditAd(null); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const toggleMutation = trpc.ads.toggle.useMutation({
    onSuccess: () => refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMutation = trpc.ads.delete.useMutation({
    onSuccess: () => { toast.success("Anúncio removido."); setDeleteId(null); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const globalToggleMutation = trpc.ads.globalToggle.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "Publicidade ativada globalmente." : "Publicidade desativada globalmente.");
      refetchSettings();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const openEdit = (ad: typeof ads extends (infer T)[] | undefined ? T : never) => {
    if (!ad) return;
    setEditAd({
      id: (ad as { id: number }).id,
      title: (ad as { title: string }).title ?? "",
      assetUrl: (ad as { assetUrl?: string | null }).assetUrl ?? "",
      linkUrl: (ad as { linkUrl?: string | null }).linkUrl ?? "",
      type: (ad as { type: "banner" | "video" | "script" }).type ?? "banner",
      position: (ad as { position: "sidebar" | "top" | "between_sections" | "bottom" | "popup" }).position ?? "sidebar",
      device: ((ad as { device?: string }).device as "all" | "desktop" | "mobile") ?? "all",
      isActive: (ad as { isActive: boolean }).isActive ?? true,
      startAt: (ad as { startAt?: Date | null }).startAt ? new Date((ad as { startAt: Date }).startAt).toISOString().slice(0, 16) : "",
      endAt: (ad as { endAt?: Date | null }).endAt ? new Date((ad as { endAt: Date }).endAt).toISOString().slice(0, 16) : "",
      sortOrder: (ad as { sortOrder?: number }).sortOrder ?? 0,
    });
  };

  const adsGlobalEnabled = settings?.adsEnabled ?? true;

  // Totais de cliques
  const totalClicks = clicksData?.reduce((acc, r) => acc + Number(r.clicks), 0) ?? 0;
  const activeAds = (ads ?? []).filter(a => a.isActive).length;

  return (
    <AdminLayout activeSection="ads">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display">Publicidade</h1>
                <p className="text-muted-foreground text-sm mt-1">Gerencie banners, vídeos e scripts da plataforma</p>
              </div>
              <Button className="bg-brand hover:bg-brand/90 gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Novo Anúncio
              </Button>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>

          {/* Stats + Toggle Global */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Publicidade Global</p>
                  <p className="text-sm font-medium mt-1">{adsGlobalEnabled ? "Ativa" : "Desativada"}</p>
                </div>
                <Switch
                  checked={adsGlobalEnabled}
                  onCheckedChange={(v) => globalToggleMutation.mutate({ enabled: v })}
                  disabled={globalToggleMutation.isPending}
                />
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Anúncios Ativos</p>
                <p className="text-2xl font-bold mt-1">{activeAds}</p>
                <p className="text-xs text-muted-foreground">de {(ads ?? []).length} total</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Cliques</p>
                <p className="text-2xl font-bold mt-1">{totalClicks.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">todos os períodos</p>
              </CardContent>
            </Card>
          </div>

          {/* Dimensões Recomendadas */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Dimensões Recomendadas por Posição
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(POSITION_DIMENSIONS).map(([key, val]) => (
                  <div key={key} className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium text-foreground">{val.label}</p>
                    <p className="text-xs text-brand font-mono mt-1">{val.size}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{val.ratio}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Anúncios */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Prévia</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ads ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                          Nenhum anúncio cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (ads ?? []).map((ad) => {
                        const adClicks = clicksData?.filter(c => c.adId === ad.id).reduce((acc, r) => acc + Number(r.clicks), 0) ?? 0;
                        const isScheduled = ad.startAt && new Date(ad.startAt) > new Date();
                        const isExpired = ad.endAt && new Date(ad.endAt) < new Date();
                        return (
                          <TableRow key={ad.id} className={!ad.isActive ? "opacity-50" : ""}>
                            <TableCell>
                              {ad.assetUrl && ad.type === "video" ? (
                                <video src={ad.assetUrl} className="w-12 h-8 object-cover rounded border border-border/50" muted playsInline />
                              ) : ad.assetUrl ? (
                                <img src={ad.assetUrl} alt={ad.title} className="w-12 h-8 object-cover rounded border border-border/50" />
                              ) : (
                                <div className="w-12 h-8 bg-muted rounded border border-border/50 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">{TYPE_LABELS[ad.type]?.slice(0, 3)}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{ad.title}</span>
                                {ad.linkUrl && (
                                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    {ad.linkUrl}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{POSITION_LABELS[ad.position] ?? ad.position}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{TYPE_LABELS[ad.type] ?? ad.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    {DEVICE_ICONS[ad.device ?? "all"]}
                                    <span className="text-xs capitalize">{ad.device ?? "all"}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {ad.device === "all" ? "Todos os dispositivos" : ad.device === "desktop" ? "Apenas desktop" : "Apenas mobile"}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                {ad.startAt || ad.endAt ? (
                                  <>
                                    {ad.startAt && <div>De: {format(new Date(ad.startAt), "dd/MM/yy HH:mm", { locale: ptBR })}</div>}
                                    {ad.endAt && <div>Até: {format(new Date(ad.endAt), "dd/MM/yy HH:mm", { locale: ptBR })}</div>}
                                  </>
                                ) : (
                                  <span>Sem prazo</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="flex items-center justify-end gap-1 text-sm">
                                <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                                {Number(adClicks).toLocaleString("pt-BR")}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Switch
                                  checked={ad.isActive ?? false}
                                  onCheckedChange={() => toggleMutation.mutate({ id: ad.id, isActive: !ad.isActive })}
                                  disabled={toggleMutation.isPending}
                                />
                                {isScheduled && <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-500">Agendado</Badge>}
                                {isExpired && <Badge variant="outline" className="text-xs border-red-500/50 text-red-500">Expirado</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ad)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-400 hover:text-red-300"
                                  onClick={() => setDeleteId(ad.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>

      {/* Create Dialog */}
      <AdFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Novo Anúncio"
        form={form}
        setForm={setForm}
        onSubmit={() => createMutation.mutate({
          title: form.title,
          assetUrl: form.assetUrl || undefined,
          linkUrl: form.linkUrl || undefined,
          type: form.type,
          position: form.position,
          isActive: form.isActive,
        })}
        isPending={createMutation.isPending}
        submitLabel="Criar Anúncio"
        showAdvanced
      />

      {/* Edit Dialog */}
      {editAd && (
        <AdFormDialog
          open={!!editAd}
          onOpenChange={(o) => !o && setEditAd(null)}
          title="Editar Anúncio"
          form={editAd}
          setForm={(updater: Partial<AdForm> | ((prev: AdForm) => AdForm)) => setEditAd(prev => prev ? { ...prev, ...(typeof updater === "function" ? updater(prev) : updater) } : null)}
          onSubmit={() => updateMutation.mutate({
            id: editAd.id,
            title: editAd.title,
            assetUrl: editAd.assetUrl || null,
            linkUrl: editAd.linkUrl || null,
            type: editAd.type,
            position: editAd.position,
            device: editAd.device,
            isActive: editAd.isActive,
            startAt: editAd.startAt ? new Date(editAd.startAt) : null,
            endAt: editAd.endAt ? new Date(editAd.endAt) : null,
            sortOrder: editAd.sortOrder,
          })}
          isPending={updateMutation.isPending}
          submitLabel="Salvar Alterações"
          showAdvanced
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O anúncio será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ─── Componente de formulário reutilizável ────────────────────────────────────
function AdFormDialog({
  open, onOpenChange, title, form, setForm, onSubmit, isPending, submitLabel, showAdvanced = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  form: AdForm;
  setForm: React.Dispatch<React.SetStateAction<AdForm>> | ((updater: Partial<AdForm> | ((prev: AdForm) => AdForm)) => void); // eslint-disable-line @typescript-eslint/no-explicit-any
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  showAdvanced?: boolean;
}) {
  const posInfo = POSITION_DIMENSIONS[form.position];
  const update = (patch: Partial<AdForm>) => (setForm as (u: (f: AdForm) => AdForm) => void)(f => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="Nome interno do anúncio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => update({ type: v as AdForm["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner (Imagem)</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="script">Script</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Dispositivo</Label>
              <Select value={form.device} onValueChange={(v) => update({ device: v as AdForm["device"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              Posicionamento
              {posInfo && (
                <span className="text-xs text-muted-foreground font-normal">— {posInfo.size} ({posInfo.ratio})</span>
              )}
            </Label>
            <Select value={form.position} onValueChange={(v) => update({ position: v as AdForm["position"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(POSITION_DIMENSIONS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label} — {val.size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>URL da Mídia (imagem ou vídeo)</Label>
            <Input value={form.assetUrl} onChange={(e) => update({ assetUrl: e.target.value })} placeholder="https://cdn.exemplo.com/banner.jpg" />
          </div>
          <div className="space-y-1">
            <Label>URL de Destino (clique)</Label>
            <Input value={form.linkUrl} onChange={(e) => update({ linkUrl: e.target.value })} placeholder="https://anunciante.com" />
          </div>
          {showAdvanced && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Início do período</Label>
                  <Input type="datetime-local" value={form.startAt} onChange={(e) => update({ startAt: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Fim do período</Label>
                  <Input type="datetime-local" value={form.endAt} onChange={(e) => update({ endAt: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Ordem de exibição</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => update({ sortOrder: Number(e.target.value) })} min={0} />
                <p className="text-xs text-muted-foreground">Menor número = exibido primeiro. Padrão: 0.</p>
              </div>
            </>
          )}
          <div className="flex items-center justify-between pt-1">
            <Label>Ativo ao criar</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => update({ isActive: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-brand hover:bg-brand/90"
            onClick={onSubmit}
            disabled={isPending || !form.title.trim()}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
