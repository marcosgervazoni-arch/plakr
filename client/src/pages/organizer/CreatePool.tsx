/**
 * O1 — Criar Bolão
 * Especificação: formulário único com 5 seções visuais:
 *   1. Identidade (nome, logo, descrição)
 *   2. Tipo de Acesso (público/privado)
 *   3. Campeonato (lista de torneios)
 *   4. Regras de Pontuação (editável para Pro, leitura para Free)
 *   5. Configuração de Inscrição (Pro only — valor, Pix, QR code)
 */
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Key,
  Link2,
  Crown,
  AlertTriangle,
  Upload,
  Trophy,
  ChevronRight,
  Loader2,
  Check,
  DollarSign,
  QrCode,
  Info,
  Minus,
  Plus,
  Lock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AccessType = "public" | "private_link";

interface ScoringRules {
  exactScorePoints: number;
  correctResultPoints: number;
  totalGoalsPoints: number;
  goalDiffPoints: number;
  oneTeamGoalsPoints: number;
  landslidePoints: number;
  zebraPoints: number;
  zebraThreshold: number;
  landslideMinDiff: number;
  bettingDeadlineMinutes: number;
}

const DEFAULT_RULES: ScoringRules = {
  exactScorePoints: 10,
  correctResultPoints: 5,
  totalGoalsPoints: 3,
  goalDiffPoints: 3,
  oneTeamGoalsPoints: 2,
  landslidePoints: 5,
  zebraPoints: 1,
  zebraThreshold: 75,
  landslideMinDiff: 4,
  bettingDeadlineMinutes: 60,
};

function SectionHeader({ number, title, badge }: { number: number; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
        {number}
      </div>
      <h2 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h2>
      {badge}
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}

/** Controle numérico com botões +/- para regras de pontuação */
function PointsControl({
  label,
  desc,
  value,
  min,
  max,
  onChange,
  suffix = "pts",
}: {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="font-mono font-bold text-sm text-primary w-14 text-center">
          {value} {suffix}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function CreatePool() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  // Form state — Seções 1-3
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<AccessType>("private_link");
  const [invitePermission, setInvitePermission] = useState<"organizer_only" | "all_members">("organizer_only");
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Campeonato personalizado — modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customSeason, setCustomSeason] = useState("");
  const [customTournamentId, setCustomTournamentId] = useState<number | null>(null);
  const [customTournamentLabel, setCustomTournamentLabel] = useState<string | null>(null);
  const createTournamentMutation = trpc.tournaments.create.useMutation({
    onSuccess: (data: any) => {
      setCustomTournamentId(data.id);
      setSelectedTournamentId(data.id);
      setCustomTournamentLabel(customName.trim());
      setShowCustomModal(false);
      setCustomName("");
      setCustomSeason("");
      toast.success("Campeonato personalizado criado!");
    },
    onError: (err) => toast.error(err.message || "Erro ao criar campeonato."),
  });
  const handleCreateCustomTournament = useCallback(() => {
    if (!customName.trim()) return;
    const slug = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    createTournamentMutation.mutate({ name: customName.trim(), slug, season: customSeason.trim() || undefined, isGlobal: false, format: "custom" });
  }, [customName, customSeason, createTournamentMutation]);

  // Seção 4 — Regras de pontuação
  const [rules, setRules] = useState<ScoringRules>({ ...DEFAULT_RULES });

  // Seção 5 — Inscrição
  const [hasEntryFee, setHasEntryFee] = useState(false);
  const [entryFee, setEntryFee] = useState<string>("");
  const [pixKey, setPixKey] = useState("");
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  const { data: tournamentsData } = trpc.tournaments.listGlobal.useQuery();
  const { data: myPools } = trpc.users.myPools.useQuery();

  const tournaments = tournamentsData ?? [];
  const activePools = (myPools ?? []).filter((p: any) => p.status === "active");
  const { isPro } = useUserPlan();
  const atLimit = !isPro && activePools.length >= 2;

  const createMutation = trpc.pools.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Bolão criado com sucesso!");
      navigate(`/pool/${data.slug}/manage`);
    },
    onError: (err) => toast.error(err.message || "Erro ao criar bolão."),
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleQrFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setQrCodePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const updateRule = (key: keyof ScoringRules) => (value: number) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = () => {
    if (!name.trim() || !selectedTournamentId || atLimit) return;
    const payload: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      tournamentId: selectedTournamentId,
      accessType,
      invitePermission: accessType === "public" ? "all_members" : invitePermission,
    };
    // Regras de pontuação (apenas Pro)
    if (isPro) {
      payload.exactScorePoints = rules.exactScorePoints;
      payload.correctResultPoints = rules.correctResultPoints;
      payload.totalGoalsPoints = rules.totalGoalsPoints;
      payload.goalDiffPoints = rules.goalDiffPoints;
      payload.oneTeamGoalsPoints = rules.oneTeamGoalsPoints;
      payload.landslidePoints = rules.landslidePoints;
      payload.zebraPoints = rules.zebraPoints;
      payload.zebraThreshold = rules.zebraThreshold;
      payload.landslideMinDiff = rules.landslideMinDiff;
      payload.bettingDeadlineMinutes = rules.bettingDeadlineMinutes;
    }
    // Inscrição paga (apenas Pro)
    if (isPro && hasEntryFee) {
      const fee = parseFloat(entryFee.replace(",", "."));
      if (!isNaN(fee) && fee > 0) {
        payload.entryFee = fee;
        if (pixKey.trim()) payload.pixKey = pixKey.trim();
      }
    }
    createMutation.mutate(payload);
  };

  const canCreate = name.trim().length > 0 && selectedTournamentId !== null && !atLimit;

  const accessOptions = [
    { id: "public" as AccessType, icon: Globe, label: "Público", desc: "Qualquer pessoa autenticada pode entrar" },
    { id: "private_link" as AccessType, icon: Link2, label: "Privado por link", desc: "Apenas quem tiver o link pode entrar" },
  ];

  const ProBadge = () => (
    <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20 shrink-0">
      <Crown className="w-2.5 h-2.5 mr-1" /> Pro
    </Badge>
  );

  return (
    <AppShell>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/30 px-4 h-14 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
          </Button>
        </Link>
        <h1 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>Criar Bolão</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-32 space-y-10">
        {/* Limit banner */}
        {atLimit && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">Limite de bolões atingido</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você já possui 2 bolões ativos no plano gratuito. Encerre um bolão existente ou assine o Plano Pro para criar bolões ilimitados.
              </p>
              <Button size="sm" className="mt-2 text-xs gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Ver Plano Pro
              </Button>
            </div>
          </div>
        )}

        {/* Section 1 — Identity */}
        <section>
          <SectionHeader number={1} title="Identidade" />
          <div className="space-y-4">
            {/* Logo upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40 bg-card"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-full object-cover border-2 border-border/30" />
                  <p className="text-xs text-muted-foreground">Clique para trocar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Logo do bolão (opcional)</p>
                  <p className="text-xs text-muted-foreground">Arraste ou clique · JPG, PNG, WebP · máx. 5MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Nome do bolão *</label>
                <span className="text-xs text-muted-foreground">{name.length}/50</span>
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder="Ex: Bolão da Galera Copa 2026"
                className="bg-card border-border/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Subtítulo / Descrição</label>
                <span className="text-xs text-muted-foreground">{description.length}/120</span>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 120))}
                placeholder="Uma frase curta sobre o bolão..."
                className="bg-card border-border/50 resize-none"
                rows={2}
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Access */}
        <section>
          <SectionHeader number={2} title="Tipo de Acesso" />
          <div className="grid grid-cols-1 gap-3">
            {accessOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAccessType(opt.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                  accessType === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border/30 bg-card hover:border-primary/30"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accessType === opt.id ? "bg-primary/10" : "bg-muted/50")}>
                  <opt.icon className={cn("w-5 h-5", accessType === opt.id ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <p className={cn("font-semibold text-sm", accessType === opt.id && "text-primary")}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                {accessType === opt.id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
          {/* Permissão de convite — apenas para bolões privados */}
          {accessType === "private_link" && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Quem pode convidar participantes?</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "organizer_only" as const, label: "Apenas o organizador", desc: "Só você pode compartilhar o link de convite" },
                  { id: "all_members" as const, label: "Todos os participantes", desc: "Qualquer membro pode compartilhar o convite com outras pessoas" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInvitePermission(opt.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      invitePermission === opt.id
                        ? "border-primary bg-primary/5"
                        : "border-border/30 bg-card hover:border-primary/30"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center", invitePermission === opt.id ? "border-primary" : "border-muted-foreground/40")}>
                      {invitePermission === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", invitePermission === opt.id && "text-primary")}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 3 — Tournament */}
        <section>
          <SectionHeader number={3} title="Campeonato" />
          {tournaments.length === 0 ? (
            <div className="bg-card border border-border/30 rounded-xl p-6 text-center text-sm text-muted-foreground">
              Nenhum campeonato global disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {tournaments.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournamentId(t.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    selectedTournamentId === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border/30 bg-card hover:border-primary/30"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-sm truncate", selectedTournamentId === t.id && "text-primary")}>{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.season ?? ""}</p>
                  </div>
                  {selectedTournamentId === t.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
              {/* Custom tournament — Pro only */}
              {isPro ? (
                customTournamentId && selectedTournamentId === customTournamentId ? (
                  <button
                    type="button"
                    onClick={() => { setSelectedTournamentId(null); setCustomTournamentId(null); setCustomTournamentLabel(null); }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-primary bg-primary/5 text-left transition-all w-full"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-primary truncate">{customTournamentLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Campeonato personalizado</p>
                    </div>
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCustomModal(true)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:border-primary/70 hover:bg-primary/10 text-left transition-all w-full"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-primary">Campeonato personalizado</p>
                          <Badge className="text-xs py-0 px-1.5 bg-green-500/10 text-green-400 border-green-500/20">Pro</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Toque para criar seu próprio campeonato</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                    {/* Modal inline */}
                    {showCustomModal && (
                      <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 mt-1">
                        <p className="text-sm font-semibold">Novo campeonato personalizado</p>
                        <div className="space-y-2">
                          <Input
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value.slice(0, 80))}
                            placeholder="Nome do campeonato *"
                            className="bg-background border-border/50"
                            autoFocus
                          />
                          <Input
                            value={customSeason}
                            onChange={(e) => setCustomSeason(e.target.value.slice(0, 20))}
                            placeholder="Temporada (ex: 2026)"
                            className="bg-background border-border/50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateCustomTournament}
                            disabled={!customName.trim() || createTournamentMutation.isPending}
                            className="flex-1"
                          >
                            {createTournamentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar campeonato"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { setShowCustomModal(false); setCustomName(""); setCustomSeason(""); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => toast.info("Campeonatos personalizados estão disponíveis no Plano Pro.")}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/50 opacity-60 w-full text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-muted-foreground">Campeonato personalizado</p>
                      <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                        <Crown className="w-2.5 h-2.5 mr-1" /> Pro
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Crie seu próprio campeonato com times e jogos</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Section 4 — Scoring Rules */}
        <section>
          <SectionHeader
            number={4}
            title="Regras de Pontuação"
            badge={isPro ? (
              <Badge className="text-xs py-0 px-1.5 bg-green-500/10 text-green-400 border-green-500/20 shrink-0">
                Editável
              </Badge>
            ) : (
              <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20 shrink-0">
                <Crown className="w-2.5 h-2.5 mr-1" /> Pro
              </Badge>
            )}
          />

          {isPro ? (
            /* PRO: controles editáveis */
            <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
              <div className="divide-y divide-border/20">
                <PointsControl
                  label="Placar exato"
                  desc="Acertou o placar completo da partida"
                  value={rules.exactScorePoints}
                  min={1}
                  max={50}
                  onChange={updateRule("exactScorePoints")}
                />
                <PointsControl
                  label="Resultado correto"
                  desc="Acertou quem ganhou ou empate (sem placar exato)"
                  value={rules.correctResultPoints}
                  min={1}
                  max={50}
                  onChange={updateRule("correctResultPoints")}
                />
                <PointsControl
                  label="Bônus total de gols"
                  desc="Acertou a soma de gols da partida"
                  value={rules.totalGoalsPoints}
                  min={0}
                  max={20}
                  onChange={updateRule("totalGoalsPoints")}
                />
                <PointsControl
                  label="Bônus saldo de gols"
                  desc="Acertou a diferença de gols entre os times"
                  value={rules.goalDiffPoints}
                  min={0}
                  max={20}
                  onChange={updateRule("goalDiffPoints")}
                />
                <PointsControl
                  label="Bônus gols de um time"
                  desc="Acertou os gols de pelo menos um dos times"
                  value={rules.oneTeamGoalsPoints}
                  min={0}
                  max={20}
                  onChange={updateRule("oneTeamGoalsPoints")}
                />
                <PointsControl
                  label="Bônus goleada"
                  desc={`Previu e ocorreu goleada (≥${rules.landslideMinDiff} gols de diferença)`}
                  value={rules.landslidePoints}
                  min={0}
                  max={50}
                  onChange={updateRule("landslidePoints")}
                />
                <PointsControl
                  label="Bônus zebra"
                  desc={`Acertou resultado de zebra (azarão com ${rules.zebraThreshold}%+ de chance de perder)`}
                  value={rules.zebraPoints}
                  min={0}
                  max={20}
                  onChange={updateRule("zebraPoints")}
                />
              </div>
              {/* Configurações avançadas */}
              <div className="border-t border-border/20 px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configurações avançadas</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Prazo de palpite</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRule("bettingDeadlineMinutes")(Math.max(0, rules.bettingDeadlineMinutes - 15))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-sm text-primary text-center flex-1">
                        {rules.bettingDeadlineMinutes} min
                      </span>
                      <button
                        type="button"
                        onClick={() => updateRule("bettingDeadlineMinutes")(Math.min(1440, rules.bettingDeadlineMinutes + 15))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Antes do início do jogo</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Gols mínimos p/ goleada</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRule("landslideMinDiff")(Math.max(2, rules.landslideMinDiff - 1))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-sm text-primary text-center flex-1">
                        {rules.landslideMinDiff} gols
                      </span>
                      <button
                        type="button"
                        onClick={() => updateRule("landslideMinDiff")(Math.min(10, rules.landslideMinDiff + 1))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Diferença de gols</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Limiar zebra</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRule("zebraThreshold")(Math.max(51, rules.zebraThreshold - 5))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-sm text-primary text-center flex-1">
                        {rules.zebraThreshold}%
                      </span>
                      <button
                        type="button"
                        onClick={() => updateRule("zebraThreshold")(Math.min(99, rules.zebraThreshold + 5))}
                        className="w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">% mínimo de apostas no favorito</p>
                  </div>
                </div>
              </div>
              {/* Nota de reset */}
              <div className="border-t border-border/20 px-4 py-2.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Regras podem ser alteradas após a criação do bolão
                </p>
                <button
                  type="button"
                  onClick={() => setRules({ ...DEFAULT_RULES })}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Restaurar padrões
                </button>
              </div>
            </div>
          ) : (
            /* FREE: leitura apenas com CTA de upgrade */
            <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
              <div className="divide-y divide-border/20">
                {[
                  { label: "Placar exato", pts: 10, desc: "Acertou o placar completo" },
                  { label: "Resultado correto", pts: 5, desc: "Acertou quem ganhou ou empate" },
                  { label: "Bônus total de gols", pts: 3, desc: "Acertou a soma de gols da partida" },
                  { label: "Bônus saldo de gols", pts: 3, desc: "Acertou a diferença de gols" },
                  { label: "Bônus gols de um time", pts: 2, desc: "Acertou os gols de pelo menos um time" },
                  { label: "Bônus goleada", pts: 5, desc: "Previu e ocorreu goleada (≥4 gols de diferença)" },
                  { label: "Bônus zebra", pts: 1, desc: "Acertou resultado de zebra (azarão com 75%+ de chance de perder)" },
                ].map((rule) => (
                  <div key={rule.label} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{rule.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.desc}</p>
                    </div>
                    <span className="font-mono font-bold text-sm text-primary shrink-0">{rule.pts} pts</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Personalize as regras de pontuação com o{" "}
                    <span className="text-primary font-medium">Plano Pro</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 5 — Entry Fee (Pro only) */}
        <section>
          <SectionHeader
            number={5}
            title="Configuração de Inscrição"
            badge={<ProBadge />}
          />

          {isPro ? (
            /* PRO: configuração completa */
            <div className="space-y-4">
              {/* Toggle bolão com inscrição */}
              <button
                type="button"
                onClick={() => setHasEntryFee((v) => !v)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                  hasEntryFee
                    ? "border-primary bg-primary/5"
                    : "border-border/30 bg-card hover:border-primary/30"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", hasEntryFee ? "bg-primary/10" : "bg-muted/50")}>
                  <DollarSign className={cn("w-5 h-5", hasEntryFee ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <p className={cn("font-semibold text-sm", hasEntryFee && "text-primary")}>Bolão com inscrição paga</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasEntryFee ? "Participantes pagarão para entrar no bolão" : "Ativar cobrança de inscrição via Pix"}
                  </p>
                </div>
                <div className={cn(
                  "w-10 h-6 rounded-full transition-colors relative shrink-0",
                  hasEntryFee ? "bg-primary" : "bg-muted"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                    hasEntryFee ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </div>
              </button>

              {/* Campos de inscrição — visíveis apenas quando ativado */}
              {hasEntryFee && (
                <div className="bg-card border border-border/30 rounded-xl p-4 space-y-4">
                  {/* Valor de entrada */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Valor de inscrição (R$) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                      <Input
                        value={entryFee}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9,\.]/g, "");
                          setEntryFee(v);
                        }}
                        placeholder="0,00"
                        className="bg-background border-border/50 pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Valor que cada participante pagará para entrar no bolão</p>
                  </div>

                  {/* Chave Pix */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Chave Pix</label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value.slice(0, 100))}
                      placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                      className="bg-background border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">Chave para receber os pagamentos dos participantes</p>
                  </div>

                  {/* QR Code Pix */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">QR Code Pix (opcional)</label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                        "border-border/50 hover:border-primary/40 bg-background"
                      )}
                      onClick={() => qrFileRef.current?.click()}
                    >
                      {qrCodePreview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={qrCodePreview} alt="QR Code" className="w-24 h-24 object-contain rounded-lg border border-border/30" />
                          <p className="text-xs text-muted-foreground">Clique para trocar</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">Enviar QR Code Pix</p>
                          <p className="text-xs text-muted-foreground">Facilita o pagamento dos participantes</p>
                        </div>
                      )}
                      <input
                        ref={qrFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleQrFileSelect(e.target.files[0])}
                      />
                    </div>
                  </div>

                  {/* Aviso */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      O controle de pagamentos é de responsabilidade do organizador. O Plakr exibe as informações de pagamento, mas não processa transações automaticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FREE: card bloqueado com CTA */
            <div className="bg-card border border-border/30 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">Inscrição paga — recurso Pro</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Com o Plano Pro você pode cobrar uma taxa de inscrição dos participantes via Pix, incluindo QR Code para facilitar o pagamento.
                </p>
                <Link href="/upgrade">
                  <Button size="sm" className="mt-3 text-xs gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Fazer upgrade para Pro
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/30 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleCreate}
            disabled={!canCreate || createMutation.isPending}
            className="w-full h-12 text-base font-semibold"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Criando bolão...</>
            ) : (
              <>Criar Bolão <ChevronRight className="w-5 h-5 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
