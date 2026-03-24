import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Award, Edit2, Plus, Trash2, Upload, Users } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const CRITERION_LABELS: Record<string, string> = {
  accuracy_rate: "Taxa de acerto em um bolão (%)",
  exact_score_career: "Placares exatos na carreira",
  zebra_correct: "Zebras acertadas na carreira",
  top3_pools: "Top 3 em bolões",
  first_place_pools: "1º lugar em bolões",
  complete_pool_no_blank: "Bolões completos sem jogo em branco",
  consecutive_correct: "Sequência de acertos consecutivos",
};

const CRITERION_UNIT: Record<string, string> = {
  accuracy_rate: "%",
  exact_score_career: "palpites",
  zebra_correct: "zebras",
  top3_pools: "bolões",
  first_place_pools: "bolões",
  complete_pool_no_blank: "bolões",
  consecutive_correct: "acertos",
};

type CriterionType =
  | "accuracy_rate"
  | "exact_score_career"
  | "zebra_correct"
  | "top3_pools"
  | "first_place_pools"
  | "complete_pool_no_blank"
  | "consecutive_correct";

interface BadgeForm {
  name: string;
  description: string;
  iconUrl: string;
  criterionType: CriterionType | "";
  criterionValue: number;
  isRetroactive: boolean;
  isActive: boolean;
}

const DEFAULT_FORM: BadgeForm = {
  name: "",
  description: "",
  iconUrl: "",
  criterionType: "",
  criterionValue: 1,
  isRetroactive: true,
  isActive: true,
};

export default function AdminBadges() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BadgeForm>(DEFAULT_FORM);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: badges = [], isLoading } = trpc.badges.list.useQuery();

  const createMutation = trpc.badges.create.useMutation({
    onSuccess: () => {
      toast.success("Badge criado com sucesso!");
      utils.badges.list.invalidate();
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.badges.update.useMutation({
    onSuccess: () => {
      toast.success("Badge atualizado!");
      utils.badges.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.badges.delete.useMutation({
    onSuccess: () => {
      toast.success("Badge removido.");
      utils.badges.list.invalidate();
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.badges.uploadIcon.useMutation({
    onSuccess: ({ url }) => {
      setForm((f) => ({ ...f, iconUrl: url }));
      setUploadingIcon(false);
      toast.success("Ícone enviado com sucesso!");
    },
    onError: (e) => {
      setUploadingIcon(false);
      toast.error(e.message);
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEdit(badge: (typeof badges)[0]) {
    setEditingId(badge.id);
    setForm({
      name: badge.name,
      description: badge.description,
      iconUrl: badge.iconUrl ?? "",
      criterionType: badge.criterionType as CriterionType,
      criterionValue: badge.criterionValue,
      isRetroactive: badge.isRetroactive ?? true,
      isActive: badge.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".svg")) {
      toast.error("Apenas arquivos .svg são permitidos.");
      return;
    }
    if (file.size > 200 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 200KB.");
      return;
    }
    setUploadingIcon(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({ filename: file.name, contentBase64: base64 });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error("Nome obrigatório.");
    if (!form.description.trim()) return toast.error("Descrição obrigatória.");
    if (!form.iconUrl) return toast.error("Faça upload do ícone SVG.");
    if (!form.criterionType) return toast.error("Selecione o critério.");
    if (form.criterionValue < 1) return toast.error("Valor mínimo: 1.");

    const payload = {
      name: form.name,
      description: form.description,
      iconUrl: form.iconUrl,
      criterionType: form.criterionType as CriterionType,
      criterionValue: form.criterionValue,
      isRetroactive: form.isRetroactive,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout activeSection="badges">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Badges</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie os badges que são atribuídos automaticamente aos usuários.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Badge
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold mt-1">{badges.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Ativos</p>
              <p className="text-2xl font-bold mt-1 text-green-500">
                {badges.filter((b) => b.isActive).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Inativos</p>
              <p className="text-2xl font-bold mt-1 text-muted-foreground">
                {badges.filter((b) => !b.isActive).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Badge list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : badges.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <Award className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum badge criado ainda.</p>
              <Button variant="outline" onClick={openCreate}>
                Criar primeiro badge
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <Card key={badge.id} className={!badge.isActive ? "opacity-50" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {badge.iconUrl ? (
                        <img
                          src={badge.iconUrl}
                          alt={badge.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Award className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{badge.name}</p>
                        <Badge
                          variant={badge.isActive ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {badge.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {badge.description}
                      </p>
                      <p className="text-xs text-brand mt-1.5 font-medium">
                        {CRITERION_LABELS[badge.criterionType]} ≥ {badge.criterionValue}
                        {CRITERION_UNIT[badge.criterionType] ? ` ${CRITERION_UNIT[badge.criterionType]}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openEdit(badge)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(badge.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(DEFAULT_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Badge" : "Novo Badge"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Icon upload */}
            <div className="space-y-2">
              <Label>Ícone SVG</Label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {form.iconUrl ? (
                    <img src={form.iconUrl} alt="preview" className="w-10 h-10 object-contain" />
                  ) : (
                    <Award className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    disabled={uploadingIcon}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingIcon ? "Enviando..." : form.iconUrl ? "Trocar SVG" : "Fazer upload (.svg)"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Máximo 200KB. Apenas .svg</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="badge-name">Nome</Label>
              <Input
                id="badge-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Sniper"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="badge-desc">Descrição</Label>
              <Textarea
                id="badge-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Taxa de acerto acima de 70% em um bolão completo"
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Criterion */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Critério</Label>
                <Select
                  value={form.criterionType}
                  onValueChange={(v) => setForm((f) => ({ ...f, criterionType: v as CriterionType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CRITERION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="badge-value">
                  Valor mínimo
                  {form.criterionType && CRITERION_UNIT[form.criterionType] && (
                    <span className="text-muted-foreground ml-1">({CRITERION_UNIT[form.criterionType]})</span>
                  )}
                </Label>
                <Input
                  id="badge-value"
                  type="number"
                  min={1}
                  value={form.criterionValue}
                  onChange={(e) => setForm((f) => ({ ...f, criterionValue: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Retroativo</p>
                  <p className="text-xs text-muted-foreground">
                    Atribuir a usuários que já atendem ao critério
                  </p>
                </div>
                <Switch
                  checked={form.isRetroactive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isRetroactive: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ativo</p>
                  <p className="text-xs text-muted-foreground">Badge visível e atribuível</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Criar badge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover badge?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação removerá o badge e todas as atribuições de usuários. Não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
