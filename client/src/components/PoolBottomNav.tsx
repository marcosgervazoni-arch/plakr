/**
 * PoolBottomNav — Barra de navegação inferior estilo FAB para o PoolPage.
 *
 * Layout: Regras | Membros | [Palpites FAB dourado] | Jogos | Ranking
 *
 * O botão central (Palpites) abre a aba Jogos com o filtro "Falta palpitar" pré-ativado.
 * "Regras" navega diretamente para /pool/:slug/rules (sem tela intermediária).
 */
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Calendar,
  Trophy,
  Users,
  ScrollText,
  PenLine,
} from "lucide-react";

interface PoolBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPendingFilter?: () => void;
  pendingBetsCount?: number;
  slug?: string;
}

const tabItems = [
  { id: "rules",   label: "Regras",   icon: ScrollText, directLink: true  },
  { id: "members", label: "Membros",  icon: Users,      directLink: false },
  // centro: FAB
  { id: "games",   label: "Jogos",    icon: Calendar,   directLink: false },
  { id: "ranking", label: "Ranking",  icon: Trophy,     directLink: false },
];

export default function PoolBottomNav({
  activeTab,
  onTabChange,
  onPendingFilter,
  pendingBetsCount = 0,
  slug,
}: PoolBottomNavProps) {

  const renderItem = (item: typeof tabItems[0]) => {
    const isActive = activeTab === item.id;
    const btnClass = cn(
      "flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );
    const inner = (
      <>
        <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
        <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
          {item.label}
        </span>
      </>
    );

    // "Regras" navega diretamente para a página completa (sem aba intermediária)
    if (item.directLink && slug) {
      return (
        <Link key={item.id} href={`/pool/${slug}/rules`} className="flex-1 h-full">
          <button className={cn(btnClass, "w-full")}>
            {inner}
          </button>
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        className={btnClass}
      >
        {inner}
      </button>
    );
  };

  const fabClass = cn(
    "absolute left-1/2 -translate-x-1/2 -top-6",
    "w-16 h-16 rounded-full shadow-xl",
    "flex flex-col items-center justify-center gap-0.5",
    "transition-all duration-200 active:scale-95",
    "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
  );

  return (
    <>
      {/* Espaçador — apenas mobile */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      {/* Barra fixa inferior — apenas mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Container da barra com recorte central para o FAB */}
        <div className="relative w-full max-w-2xl mx-auto">
          {/* Barra de fundo */}
          <div className="flex items-center bg-card/95 backdrop-blur-md border-t border-border/40 shadow-2xl h-16">
            {/* Lado esquerdo: Regras + Membros */}
            {tabItems.slice(0, 2).map(renderItem)}

            {/* Espaço central para o FAB */}
            <div className="w-20 shrink-0" />

            {/* Lado direito: Jogos + Ranking */}
            {tabItems.slice(2).map(renderItem)}
          </div>

          {/* FAB central — abre aba Jogos com filtro de pendentes */}
          <button
            onClick={() => {
              onTabChange("games");
              if (onPendingFilter) onPendingFilter();
            }}
            className={fabClass}
            aria-label="Palpites"
          >
            <PenLine className="w-6 h-6 stroke-[2.5]" />
            <span className="text-[9px] font-bold leading-none">Palpites</span>
            {pendingBetsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                {pendingBetsCount > 9 ? "9+" : pendingBetsCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
