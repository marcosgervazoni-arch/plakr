/**
 * ComponentShowcase — Referência Visual Oficial do Design System Plakr!
 * Acesse em: /showcase (apenas admin)
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle, CheckCircle2, Info, Trophy, Zap, Star,
  Palette, Type, Layers, Component, Sparkles, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ColorSwatch({ name, cssVar, tailwind }: { name: string; cssVar: string; tailwind: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-lg border border-border/40 shadow-sm"
        style={{ background: `var(${cssVar})` }}
      />
      <p className="text-xs font-mono font-medium text-foreground">{name}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{tailwind}</p>
      <p className="text-[10px] text-muted-foreground/60 font-mono">{cssVar}</p>
    </div>
  );
}

function GradientSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border border-border/40 ${className}`} />
      <p className="text-xs font-mono font-medium text-foreground">{name}</p>
      <p className="text-[10px] text-muted-foreground font-mono">.{name}</p>
    </div>
  );
}

export default function ComponentShowcase() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="font-display font-bold text-lg">Design System</h1>
                <Badge variant="outline" className="text-[10px] font-mono">Plakr! v1</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Referência visual oficial — use como guia ao criar novas telas
            </p>
          </div>
        </div>

        <div className="container py-8 space-y-12">
          <Tabs defaultValue="colors">
            <TabsList className="mb-8 flex flex-wrap gap-1 h-auto bg-card border border-border/50 p-1">
              <TabsTrigger value="colors" className="gap-1.5 text-xs">
                <Palette className="w-3.5 h-3.5" /> Cores
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-1.5 text-xs">
                <Type className="w-3.5 h-3.5" /> Tipografia
              </TabsTrigger>
              <TabsTrigger value="gradients" className="gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" /> Gradientes
              </TabsTrigger>
              <TabsTrigger value="components" className="gap-1.5 text-xs">
                <Component className="w-3.5 h-3.5" /> Componentes
              </TabsTrigger>
            </TabsList>

            {/* ABA CORES */}
            <TabsContent value="colors" className="space-y-8">
              <Section title="Paleta Brand" icon={Palette}>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Primary" cssVar="--primary" tailwind="bg-primary" />
                  <ColorSwatch name="Primary FG" cssVar="--primary-foreground" tailwind="text-primary-foreground" />
                  <ColorSwatch name="Brand" cssVar="--brand" tailwind="bg-brand" />
                  <ColorSwatch name="Accent" cssVar="--accent" tailwind="bg-accent" />
                  <ColorSwatch name="Ring" cssVar="--ring" tailwind="ring-ring" />
                </div>
              </Section>

              <Section title="Backgrounds & Surfaces" icon={Layers}>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Background" cssVar="--background" tailwind="bg-background" />
                  <ColorSwatch name="Card" cssVar="--card" tailwind="bg-card" />
                  <ColorSwatch name="Surface 1" cssVar="--surface-1" tailwind="bg-surface-1" />
                  <ColorSwatch name="Surface 2" cssVar="--surface-2" tailwind="bg-surface-2" />
                  <ColorSwatch name="Surface 3" cssVar="--surface-3" tailwind="bg-surface-3" />
                  <ColorSwatch name="Surface 4" cssVar="--surface-4" tailwind="bg-surface-4" />
                </div>
              </Section>

              <Section title="Semânticas" icon={Info}>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Foreground" cssVar="--foreground" tailwind="text-foreground" />
                  <ColorSwatch name="Muted" cssVar="--muted" tailwind="bg-muted" />
                  <ColorSwatch name="Muted FG" cssVar="--muted-foreground" tailwind="text-muted-foreground" />
                  <ColorSwatch name="Border" cssVar="--border" tailwind="border-border" />
                  <ColorSwatch name="Destructive" cssVar="--destructive" tailwind="bg-destructive" />
                  <ColorSwatch name="Secondary" cssVar="--secondary" tailwind="bg-secondary" />
                </div>
              </Section>

              <Section title="Charts (Recharts)" icon={Zap}>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <ColorSwatch name="Chart Brand" cssVar="--chart-brand" tailwind="var(--chart-brand)" />
                  <ColorSwatch name="Chart Indigo" cssVar="--chart-indigo" tailwind="var(--chart-indigo)" />
                  <ColorSwatch name="Chart Success" cssVar="--chart-success" tailwind="var(--chart-success)" />
                  <ColorSwatch name="Chart Warning" cssVar="--chart-warning" tailwind="var(--chart-warning)" />
                  <ColorSwatch name="Chart Purple" cssVar="--chart-purple" tailwind="var(--chart-purple)" />
                </div>
                <Alert className="mt-4 border-primary/30 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="font-display text-sm">Uso em Recharts</AlertTitle>
                  <AlertDescription className="text-xs font-mono mt-1">
                    {'fill="var(--chart-brand)"  stroke="var(--chart-success)"  color="var(--muted-foreground)"'}
                  </AlertDescription>
                </Alert>
              </Section>
            </TabsContent>

            {/* ABA TIPOGRAFIA */}
            <TabsContent value="typography" className="space-y-8">
              <Section title="Famílias de Fonte" icon={Type}>
                <div className="grid gap-6">
                  <Card className="p-6 space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">font-display (.font-display / Syne) — Títulos e destaques</p>
                    <p className="font-display font-bold text-4xl">Plakr! Design System</p>
                    <p className="font-display font-bold text-2xl text-primary">Títulos, Headings, Logos</p>
                    <p className="font-display text-lg text-muted-foreground">Subtítulos e seções</p>
                  </Card>
                  <Card className="p-6 space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">font-sans (Inter) — Corpo de texto padrão</p>
                    <p className="text-base">Texto de corpo padrão para parágrafos, labels e descrições. Inter oferece excelente legibilidade em telas digitais.</p>
                    <p className="text-sm text-muted-foreground">Texto secundário, descrições, metadados e informações complementares.</p>
                    <p className="text-xs text-muted-foreground/70">Texto terciário — timestamps, badges, tooltips</p>
                  </Card>
                  <Card className="p-6 space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">font-mono (JetBrains Mono) — Números e código</p>
                    <p className="font-mono font-bold text-3xl text-primary">1.234 pts</p>
                    <p className="font-mono text-xl">42° lugar · 87.5%</p>
                    <p className="font-mono text-sm text-muted-foreground">trpc.pools.getBySlug.useQuery()</p>
                  </Card>
                </div>
              </Section>

              <Section title="Escala Tipográfica" icon={Type}>
                <Card className="p-6 space-y-4">
                  {[
                    { size: "text-4xl", label: "4xl — 36px", sample: "Título Principal" },
                    { size: "text-3xl", label: "3xl — 30px", sample: "Título de Seção" },
                    { size: "text-2xl", label: "2xl — 24px", sample: "Subtítulo Grande" },
                    { size: "text-xl", label: "xl — 20px", sample: "Subtítulo Médio" },
                    { size: "text-lg", label: "lg — 18px", sample: "Corpo Grande" },
                    { size: "text-base", label: "base — 16px", sample: "Corpo Padrão" },
                    { size: "text-sm", label: "sm — 14px", sample: "Texto Secundário" },
                    { size: "text-xs", label: "xs — 12px", sample: "Caption / Badge" },
                  ].map(({ size, label, sample }) => (
                    <div key={size} className="flex items-baseline gap-4">
                      <span className="text-xs text-muted-foreground font-mono w-32 shrink-0">{label}</span>
                      <span className={`font-display font-bold ${size}`}>{sample}</span>
                    </div>
                  ))}
                </Card>
              </Section>
            </TabsContent>

            {/* ABA GRADIENTES */}
            <TabsContent value="gradients" className="space-y-8">
              <Section title="Classes Utilitárias de Gradiente" icon={Layers}>
                <Alert className="border-primary/30 bg-primary/5 mb-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="font-display text-sm">Como usar</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    Todas as classes abaixo estão definidas em{" "}
                    <code className="font-mono bg-muted px-1 rounded">index.css</code>{" "}
                    e podem ser usadas diretamente como className no JSX.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <GradientSwatch name="gradient-brand" className="gradient-brand" />
                  <GradientSwatch name="gradient-brand-solid" className="gradient-brand-solid" />
                  <GradientSwatch name="gradient-brand-subtle" className="gradient-brand-subtle" />
                  <GradientSwatch name="gradient-brand-horizontal" className="gradient-brand-horizontal" />
                  <GradientSwatch name="gradient-surface" className="gradient-surface" />
                  <GradientSwatch name="gradient-surface-elevated" className="gradient-surface-elevated" />
                  <GradientSwatch name="gradient-warning" className="gradient-warning" />
                  <GradientSwatch name="gradient-success" className="gradient-success" />
                  <GradientSwatch name="gradient-danger" className="gradient-danger" />
                  <GradientSwatch name="gradient-separator" className="gradient-separator" />
                </div>
              </Section>

              <Section title="Exemplos de Uso" icon={Sparkles}>
                <div className="grid gap-4">
                  <div className="gradient-brand rounded-xl p-6 border border-primary/20">
                    <p className="font-display font-bold text-lg">gradient-brand</p>
                    <p className="text-sm text-muted-foreground mt-1">Cards de destaque, seções hero, banners principais</p>
                  </div>
                  <div className="gradient-warning rounded-xl p-6 border border-amber-500/30">
                    <p className="font-display font-bold text-lg text-amber-300">gradient-warning</p>
                    <p className="text-sm text-amber-400/80 mt-1">Alertas, banners de atenção, awaiting_conclusion</p>
                  </div>
                  <div className="gradient-success rounded-xl p-6 border border-green-500/30">
                    <p className="font-display font-bold text-lg text-green-300">gradient-success</p>
                    <p className="text-sm text-green-400/80 mt-1">Confirmações, estados de sucesso, badges de campeão</p>
                  </div>
                  <div className="gradient-surface-elevated rounded-xl p-6 border border-border/50">
                    <p className="font-display font-bold text-lg">gradient-surface-elevated</p>
                    <p className="text-sm text-muted-foreground mt-1">Cards elevados, modais, painéis secundários</p>
                  </div>
                </div>
              </Section>
            </TabsContent>

            {/* ABA COMPONENTES */}
            <TabsContent value="components" className="space-y-8">
              <Section title="Botões" icon={Component}>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                  <Button disabled>Disabled</Button>
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Star className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <Button className="gap-2"><Trophy className="w-4 h-4" /> Com ícone</Button>
                  <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                    <Sparkles className="w-4 h-4" /> Brand outline
                  </Button>
                </div>
              </Section>

              <Section title="Badges" icon={Component}>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge className="bg-primary/20 text-primary border-primary/30">Brand</Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sucesso</Badge>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Atenção</Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Info</Badge>
                </div>
              </Section>

              <Section title="Alertas" icon={AlertCircle}>
                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle className="font-display">Informação</AlertTitle>
                    <AlertDescription>Mensagem informativa padrão do sistema.</AlertDescription>
                  </Alert>
                  <Alert className="border-primary/30 bg-primary/5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertTitle className="font-display text-primary">Brand Alert</AlertTitle>
                    <AlertDescription>Use para destaques e novidades da plataforma.</AlertDescription>
                  </Alert>
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <AlertTitle className="font-display text-green-400">Sucesso</AlertTitle>
                    <AlertDescription>Operação realizada com sucesso.</AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-display">Erro</AlertTitle>
                    <AlertDescription>Algo deu errado. Tente novamente.</AlertDescription>
                  </Alert>
                </div>
              </Section>

              <Section title="Inputs" icon={Component}>
                <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
                  <Input placeholder="Input padrão" />
                  <Input placeholder="Desabilitado" disabled />
                  <Input placeholder="Com erro" className="border-destructive focus-visible:ring-destructive" />
                  <Input type="password" placeholder="Senha" />
                </div>
              </Section>

              <Section title="Progress & Switch" icon={Component}>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso do bolão</span>
                      <span>73%</span>
                    </div>
                    <Progress value={73} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Palpites enviados</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch id="notif" defaultChecked />
                    <label htmlFor="notif" className="text-sm cursor-pointer">Notificações ativas</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="pub" />
                    <label htmlFor="pub" className="text-sm cursor-pointer">Bolão público</label>
                  </div>
                </div>
              </Section>

              <Section title="Avatares & Tooltips" icon={Component}>
                <div className="flex items-center gap-3 flex-wrap">
                  {["GV", "MR", "JS", "AB", "PL"].map((initials, i) => (
                    <Tooltip key={initials}>
                      <TooltipTrigger>
                        <Avatar className={i === 0 ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}>
                          <AvatarFallback className="bg-primary/20 text-primary font-display font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Usuário {initials}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  <div className="flex -space-x-2">
                    {["A", "B", "C", "+5"].map((l) => (
                      <Avatar key={l} className="border-2 border-background w-8 h-8">
                        <AvatarFallback className="bg-surface-3 text-foreground text-xs font-bold">{l}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="Cards" icon={Component}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-display text-base">Card Padrão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Conteúdo do card com bg-card e border-border.</p>
                    </CardContent>
                  </Card>
                  <Card className="gradient-brand border-primary/20">
                    <CardHeader>
                      <CardTitle className="font-display text-base">Card Brand</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Use .gradient-brand para cards de destaque.</p>
                    </CardContent>
                  </Card>
                  <Card className="gradient-surface-elevated border-border/30">
                    <CardHeader>
                      <CardTitle className="font-display text-base">Card Elevado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Use .gradient-surface-elevated para hierarquia visual.</p>
                    </CardContent>
                  </Card>
                </div>
              </Section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
