import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ExternalLink, Loader2, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminAds() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", assetUrl: "", linkUrl: "", type: "banner" as "banner" | "video" | "script", position: "sidebar" as "sidebar" | "top" | "between_sections" | "bottom" | "popup", isActive: true });

  const { data: ads, isLoading, refetch } = trpc.ads.list.useQuery();
  const { data: clicksData } = trpc.ads.clicksByDay.useQuery({});

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
    onSuccess: () => { toast.success("Anúncio criado."); setOpen(false); refetch(); setForm({ title: "", assetUrl: "", linkUrl: "", type: "banner", position: "sidebar", isActive: true }); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const toggleMutation = trpc.ads.toggle.useMutation({
    onSuccess: () => refetch(),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMutation = trpc.ads.delete.useMutation({
    onSuccess: () => { toast.success("Anúncio removido."); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <AdminLayout activeSection="ads">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Publicidade</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie banners e anúncios da plataforma</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Anúncio
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {(ads ?? []).map((ad) => (
              <Card key={ad.id} className={`border-border/50 ${!ad.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  {ad.assetUrl && (
                    <img src={ad.assetUrl} alt={ad.title} className="w-16 h-10 object-cover rounded shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{ad.title}</p>
                      <Badge variant="outline" className="text-xs">{ad.position}</Badge>
                      {!ad.isActive && <Badge variant="outline" className="text-xs border-muted text-muted-foreground">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />{ad.clicks ?? 0} cliques
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Criado {format(new Date(ad.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={ad.isActive ?? false}
                      onCheckedChange={() => toggleMutation.mutate({ id: ad.id, isActive: !ad.isActive })}
                    />
                    {ad.linkUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => deleteMutation.mutate({ id: ad.id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(ads ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum anúncio cadastrado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nome interno do anúncio" />
            </div>
            <div className="space-y-1">
              <Label>URL da Imagem</Label>
              <Input value={form.assetUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, assetUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>URL de Destino</Label>
              <Input value={form.linkUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Posicionamento</Label>
              <Select value={form.position} onValueChange={(v) => setForm(f => ({ ...f, position: v as typeof form.position }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="top">Topo</SelectItem>
                  <SelectItem value="between_sections">Entre Seções</SelectItem>
                  <SelectItem value="bottom">Rodapé</SelectItem>
                  <SelectItem value="popup">Popup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              className="bg-brand hover:bg-brand/90"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.title.trim()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Anúncio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
