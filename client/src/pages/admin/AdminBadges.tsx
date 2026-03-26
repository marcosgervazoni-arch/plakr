import AdminLayout from "@/components/AdminLayout";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { Award, Edit2, Gift, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { type BadgeRarity } from "@/components/BadgeCard";

// ─── Critérios disponíveis ────────────────────────────────────────────────────
const CRITERION_OPTIONS = [
  // Precisão
  { value: "exact_scores_career",    label: "Placares exatos na carreira",        category: "Precisão" },
  { value: "exact_scores_in_pool",   label: "Placares exatos no mesmo bolão",     category: "Precisão" },
  // Ranking
  { value: "first_place_pools",      label: "1º lugar em bolões",                 category: "Ranking" },
  { value: "first_place_margin",     label: "Vencer com X% de vantagem",          category: "Ranking" },
  { value: "first_place_large_pool", label: "Vencer bolão com X+ participantes",  category: "Ranking" },
  { value: "rank_jump",              label: "Subir X posições num recálculo",      category: "Ranking" },
  { value: "rank_hold_1st",          label: "Manter 1º por X recálculos",         category: "Ranking" },
  // Zebra
  { value: "zebra_scores_career",    label: "Zebras acertadas na carreira",       category: "Zebra" },
  { value: "zebra_in_pool",          label: "Zebras no mesmo bolão",              category: "Zebra" },
  { value: "zebra_exact_score",      label: "Placar exato de zebra",              category: "Zebra" },
  // Comunidade
  { value: "first_bet",              label: "Primeiro palpite",                   category: "Comunidade" },
  { value: "all_bets_in_pool",       label: "Palpitou em todos os jogos do bolão",category: "Comunidade" },
  { value: "created_pool",           label: "Criou bolões",                       category: "Comunidade" },
  { value: "pool_members_via_invite",label: "Membros trazidos via convite",       category: "Comunidade" },
  { value: "organized_pools",        label: "Bolões organizados",                 category: "Comunidade" },
  { value: "early_bet",              label: "Palpites com 24h+ de antecedência",  category: "Comunidade" },
  { value: "participated_pools",     label: "Bolões participados",                category: "Comunidade" },
  // Exclusivo
  { value: "manual",                 label: "Atribuição manual (admin)",          category: "Exclusivo" },
  { value: "early_user",             label: "Um dos primeiros N usuários",        category: "Exclusivo" },
] as const;

type CriterionType = typeof CRITERION_OPTIONS[number]["value"];

const CATEGORY_OPTIONS = [
  { value: "precisao",    label: "🎯 Precisão" },
  { value: "ranking",     label: "🏆 Ranking" },
  { value: "zebra",       label: "🦓 Zebra" },
  { value: "comunidade",  label: "🌱 Comunidade" },
  { value: "publicidade", label: "📢 Publicidade" },
  { value: "exclusivo",   label: "🎖️ Exclusivo" },
];

const RARITY_OPTIONS: { value: BadgeRarity; label: string; color: string }[] = [
  { value: "common",    label: "Comum",    color: "text-slate-400" },
  { value: "uncommon",  label: "Incomum",  color: "text-green-400" },
  { value: "rare",      label: "Raro",     color: "text-blue-400" },
  { value: "epic",      label: "Épico",    color: "text-purple-400" },
  { value: "legendary", label: "Lendário", color: "text-primary" },
];

const CATEGORY_COLORS: Record<string, string> = {
  precisao:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ranking:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  zebra:       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  comunidade:  "bg-green-500/10 text-green-400 border-green-500/20",
  publicidade: "bg-primary/10 text-primary border-primary/20",
  exclusivo:   "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const RARITY_BADGE_COLORS: Record<BadgeRarity, string> = {
  common:    "bg-slate-500/10 text-slate-400 border-slate-500/20",
  uncommon:  "bg-green-500/10 text-green-400 border-green-500/20",
  rare:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  epic:      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  legendary: "bg-primary/10 text-primary border-primary/20",
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Comum", uncommon: "Incomum", rare: "Raro", epic: "Épico", legendary: "Lendário",
};

const CATEGORY_ORDER = ["precisao", "ranking", "zebra", "comunidade", "publicidade", "exclusivo"];
const CATEGORY_LABELS: Record<string, string> = {
  precisao:    "🎯 Precisão",
  ranking:     "🏆 Ranking",
  zebra:       "🦓 Zebra",
  comunidade:  "🌱 Comunidade",
  publicidade: "📢 Publicidade",
  exclusivo:   "🎖️ Exclusivo",
};

interface BadgeForm {
  name: string;
  emoji: string;
  category: string;
  description: string;
  iconUrl: string;
  criterionType: CriterionType | "";
  criterionValue: number;
  rarity: BadgeRarity;
  isRetroactive: boolean;
  isManual: boolean;
  isActive: boolean;
}

const DEFAULT_FORM: BadgeForm = {
  name: "",
  emoji: "",
  category: "",
  description: "",
  iconUrl: "",
  criterionType: "",
  criterionValue: 1,
  rarity: "common",
  isRetroactive: true,
  isManual: false,
  isActive: true,
};

interface AssignForm {
  userId: string;
  badgeId: number | null;
}

export default function AdminBadges() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BadgeForm>(DEFAULT_FORM);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignForm>({ userId: "", badgeId: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  const assignManualMutation = trpc.badges.assignManual.useMutation({
    onSuccess: (result) => {
      if (result.alreadyHad) {
        toast.info("Usuário já possui este badge.");
      } else {
        toast.success("Badge atribuído com sucesso!");
      }
      setAssignDialogOpen(false);
      setAssignForm({ userId: "", badgeId: null });
    },
    onError: (e) => toast.error(e.message),
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
      emoji: badge.emoji ?? "",
      category: badge.category ?? "",
      description: badge.description,
      iconUrl: badge.iconUrl ?? "",
      criterionType: badge.criterionType as CriterionType,
      criterionValue: badge.criterionValue,
      rarity: (badge.rarity as BadgeRarity) ?? "common",
      isRetroactive: badge.isRetroactive ?? true,
      isManual: badge.isManual ?? false,
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
    if (!form.criterionType) return toast.error("Selecione o critério.");

    const payload = {
      name: form.name,
      emoji: form.emoji || undefined,
      category: form.category || undefined,
      description: form.description,
      iconUrl: form.iconUrl || undefined,
      criterionType: form.criterionType as CriterionType,
      criterionValue: form.criterionValue,
      rarity: form.rarity,
      isRetroactive: form.isRetroactive,
      isManual: form.isManual,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleAssignManual() {
    const userId = parseInt(assignForm.userId, 10);
    if (isNaN(userId) || userId <= 0) return toast.error("ID de usuário inválido.");
    if (!assignForm.badgeId) return toast.error("Selecione um badge.");
    assignManualMutation.mutate({ userId, badgeId: assignForm.badgeId });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ─── Filtros aplicados ────────────────────────────────────────────────────
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) &&
          !b.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== "all" && b.category !== filterCategory) return false;
      if (filterRarity !== "all" && b.rarity !== filterRarity) return false;
      if (filterStatus === "active" && !b.isActive) return false;
      if (filterStatus === "inactive" && b.isActive) return false;
      if (filterStatus === "manual" && !b.isManual) return false;
      return true;
    });
  }, [badges, search, filterCategory, filterRarity, filterStatus]);

  const hasFilters = search || filterCategory !== "all" || filterRarity !== "all" || filterStatus !== "all";

  // Agrupar badges filtrados por categoria
  const badgesByCategory = filteredBadges.reduce<Record<string, typeof filteredBadges>>((acc, b) => {
    const cat = b.category ?? "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => badgesByCategory[c]),
    ...Object.keys(badgesByCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <AdminLayout activeSection="badges">
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Badges</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie as conquistas atribuídas automaticamente ou manualmente.
            </p>
          </div>
          {/* Botões empilhados em mobile, lado a lado em desktop */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)} className="gap-2">
              <Gift className="h-4 w-4" />
              Atribuir Manual
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Badge
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Manuais</p>
              <p className="text-2xl font-bold mt-1 text-rose-400">
                {badges.filter((b) => b.isManual).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Categorias</p>
              <p className="text-2xl font-bold mt-1">
                {new Set(badges.map((b) => b.category)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Filtros e busca ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRarity} onValueChange={setFilterRarity}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Raridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as raridades</SelectItem>
              {RARITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <span className={o.color}>{o.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="manual">Manuais</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => { setSearch(""); setFilterCategory("all"); setFilterRarity("all"); setFilterStatus("all"); }}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Resultado da busca */}
        {hasFilters && (
          <p className="text-xs text-muted-foreground">
            {filteredBadges.length} badge{filteredBadges.length !== 1 ? "s" : ""} encontrado{filteredBadges.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Lista de badges ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : filteredBadges.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <Award className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {hasFilters ? "Nenhum badge encontrado com os filtros aplicados." : "Nenhum badge cadastrado ainda."}
              </p>
              {!hasFilters && (
                <Button onClick={openCreate} size="sm">
                  Criar primeiro badge
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {orderedCats.map((cat) => {
              const catBadges = badgesByCategory[cat];
              if (!catBadges || catBadges.length === 0) return null;
              return (
                <div key={cat}>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {CATEGORY_LABELS[cat] ?? cat}
                    <span className="ml-2 text-xs font-normal text-muted-foreground/50">
                      ({catBadges.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catBadges.map((badge) => {
                      const rarity = (badge.rarity as BadgeRarity) ?? "common";
                      return (
                        <Tooltip key={badge.id}>
                          <TooltipTrigger asChild>
                            <Card
                              className={`relative overflow-hidden transition-all hover:shadow-md cursor-default ${
                                !badge.isActive ? "opacity-50" : ""
                              }`}
                            >
                              <CardContent className="pt-4 pb-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Ícone: emoji > iconUrl > genérico */}
                                    {badge.emoji ? (
                                      <span className="text-3xl leading-none flex-shrink-0">{badge.emoji}</span>
                                    ) : badge.iconUrl ? (
                                      <img
                                        src={badge.iconUrl}
                                        alt={badge.name}
                                        className="w-10 h-10 object-contain flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                        <Award className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm leading-tight truncate">
                                        {badge.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {badge.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => openEdit(badge)}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm(badge.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {badge.category && (
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                        CATEGORY_COLORS[badge.category] ??
                                        "bg-muted text-muted-foreground border-border"
                                      }`}
                                    >
                                      {badge.category}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${RARITY_BADGE_COLORS[rarity]}`}>
                                    {RARITY_LABELS[rarity]}
                                  </span>
                                  {badge.isManual && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium">
                                      manual
                                    </span>
                                  )}
                                  {!badge.isActive && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border font-medium">
                                      inativo
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] text-center space-y-1 p-3">
                            <p className="font-semibold text-sm">
                              {badge.emoji ? `${badge.emoji} ` : ""}{badge.name}
                            </p>
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${RARITY_BADGE_COLORS[rarity]}`}>
                              {RARITY_LABELS[rarity]}
                            </span>
                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                            {badge.isManual ? (
                              <p className="text-xs text-rose-400">Atribuição exclusiva pelo admin</p>
                            ) : (
                              <p className="text-xs text-muted-foreground/70">
                                Critério: {badge.criterionType.replace(/_/g, " ")} ≥ {badge.criterionValue}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog: criar/editar badge ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Badge" : "Novo Badge"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Emoji + Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input
                  placeholder="🏆"
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  maxLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Chute Certo"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva o que o usuário precisa fazer para conquistar este badge."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Raridade */}
            <div className="space-y-1.5">
              <Label>Raridade</Label>
              <Select
                value={form.rarity}
                onValueChange={(v) => setForm((f) => ({ ...f, rarity: v as BadgeRarity }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a raridade..." />
                </SelectTrigger>
                <SelectContent>
                  {RARITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className={o.color}>{o.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Critério */}
            <div className="space-y-1.5">
              <Label>Critério *</Label>
              <Select
                value={form.criterionType}
                onValueChange={(v) => {
                  const isManual = v === "manual";
                  setForm((f) => ({
                    ...f,
                    criterionType: v as CriterionType,
                    isManual,
                    criterionValue: isManual ? 0 : f.criterionValue,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o critério..." />
                </SelectTrigger>
                <SelectContent>
                  {["Precisão", "Ranking", "Zebra", "Comunidade", "Exclusivo"].map((group) => (
                    <div key={group}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {group}
                      </div>
                      {CRITERION_OPTIONS.filter((o) => o.category === group).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor mínimo */}
            {!form.isManual && (
              <div className="space-y-1.5">
                <Label>Valor mínimo *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.criterionValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, criterionValue: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            )}

            {/* Upload SVG */}
            <div className="space-y-1.5">
              <Label>Ícone SVG (opcional)</Label>
              <div className="flex gap-2 items-center">
                {form.iconUrl && (
                  <img
                    src={form.iconUrl}
                    alt="preview"
                    className="w-10 h-10 object-contain rounded border border-border bg-muted"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingIcon}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingIcon ? "Enviando..." : "Enviar SVG"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isRetroactive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isRetroactive: v }))}
                  disabled={form.isManual}
                />
                <Label className="text-sm">Retroativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isManual}
                  onCheckedChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      isManual: v,
                      criterionType: v ? "manual" : f.criterionType,
                      criterionValue: v ? 0 : f.criterionValue,
                    }))
                  }
                />
                <Label className="text-sm">Manual</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label className="text-sm">Ativo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: atribuição manual ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atribuir Badge Manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ID do Usuário</Label>
              <Input
                type="number"
                placeholder="Ex: 42"
                value={assignForm.userId}
                onChange={(e) => setAssignForm((f) => ({ ...f, userId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select
                value={assignForm.badgeId?.toString() ?? ""}
                onValueChange={(v) =>
                  setAssignForm((f) => ({ ...f, badgeId: parseInt(v, 10) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um badge..." />
                </SelectTrigger>
                <SelectContent>
                  {badges.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.emoji ? `${b.emoji} ` : ""}{b.name}
                      {b.isManual ? " (manual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignManual}
              disabled={assignManualMutation.isPending}
            >
              {assignManualMutation.isPending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: confirmar exclusão ── */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o badge e todos os registros de conquista associados. Não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
