/**
 * O1 — Criar Bolão
 * Especificação: formulário único com 4 seções visuais (Identidade, Acesso, Campeonato, Regras).
 * Banner de limite para plano gratuito. Botão sticky no mobile.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AccessType = "public" | "private_code" | "private_link";

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
        {number}
      </div>
      <h2 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h2>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}

export default function CreatePool() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<AccessType>("private_link");
  const [customCode, setCustomCode] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: tournamentsData } = trpc.tournaments.listGlobal.useQuery();
  const { data: myPools } = trpc.users.myPools.useQuery();

  const tournaments = tournamentsData ?? [];
  const activePools = (myPools ?? []).filter((p: any) => p.status === "active");
  const isPro = user?.role === "admin"; // simplified — real: check user_plans
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

  const handleCreate = () => {
    if (!name.trim() || !selectedTournamentId || atLimit) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      tournamentId: selectedTournamentId,
      accessType,
    });
  };

  const canCreate = name.trim().length > 0 && selectedTournamentId !== null && !atLimit;

  const accessOptions = [
    { id: "public" as AccessType, icon: Globe, label: "Público", desc: "Qualquer pessoa autenticada pode entrar" },
    { id: "private_code" as AccessType, icon: Key, label: "Privado por código", desc: "Participantes precisam de um código" },
    { id: "private_link" as AccessType, icon: Link2, label: "Privado por link", desc: "Apenas quem tiver o link pode entrar" },
  ];

  const defaultRules = [
    { label: "Placar exato", pts: 10 },
    { label: "Resultado correto", pts: 5 },
    { label: "Bônus total de gols", pts: 2 },
    { label: "Bônus diferença de gols", pts: 2 },
    { label: "Bônus zebra", pts: 3 },
  ];

  return (
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
          {accessType === "private_code" && (
            <div className="mt-3 space-y-1.5">
              <label className="text-sm font-medium">Código personalizado (opcional)</label>
              <Input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="Deixe em branco para gerar automaticamente"
                className="bg-card border-border/50 font-mono uppercase tracking-widest"
              />
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
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/30 bg-card/50 opacity-60 cursor-not-allowed">
                <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-muted-foreground">Campeonato personalizado</p>
                    <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                      <Crown className="w-2.5 h-2.5 mr-1" /> Plano Pro
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Crie seu próprio campeonato com times e jogos</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 4 — Rules (read-only preview) */}
        <section>
          <SectionHeader number={4} title="Regras de Pontuação" />
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            <div className="divide-y divide-border/20">
              {defaultRules.map((rule) => (
                <div key={rule.label} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{rule.label}</span>
                    <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                      <Crown className="w-2.5 h-2.5 mr-1" /> Personalizável no Pro
                    </Badge>
                  </div>
                  <span className="font-mono font-bold text-sm text-primary">{rule.pts} pts</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border/20">
              <p className="text-xs text-muted-foreground">
                As regras podem ser personalizadas após a criação do bolão com o{" "}
                <span className="text-primary font-medium">Plano Pro</span>.
              </p>
            </div>
          </div>
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
  );
}
