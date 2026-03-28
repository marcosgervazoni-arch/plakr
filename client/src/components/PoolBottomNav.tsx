/**
 * PoolBottomNav — Barra de navegação inferior estilo FAB para o PoolPage.
 *
 * Layout: Regulamento | Membros | [Palpites FAB dourado] | Jogos | Ranking
 *
 * O botão central (Palpites) é um FAB circular dourado elevado, estilo ação principal.
 * Os 4 itens laterais são abas simples com ícone + label.
 */
import { cn } from "@/lib/utils";
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
  pendingBetsCount?: number;
}

const sideItems = [
  { id: "rules",   label: "Regras",   icon: ScrollText },
  { id: "members", label: "Membros",  icon: Users      },
  // centro: FAB
  { id: "games",   label: "Jogos",    icon: Calendar   },
  { id: "ranking", label: "Ranking",  icon: Trophy     },
];

export default function PoolBottomNav({
  activeTab,
  onTabChange,
  pendingBetsCount = 0,
}: PoolBottomNavProps) {
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
            {sideItems.slice(0, 2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Espaço central para o FAB */}
            <div className="w-20 shrink-0" />

            {/* Lado direito: Jogos + Ranking */}
            {sideItems.slice(2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className={cn("text-[10px] font-medium leading-none", isActive && "font-semibold")}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FAB central — Palpites (elevado acima da barra) */}
          <button
            onClick={() => onTabChange("games")}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6",
              "w-16 h-16 rounded-full shadow-xl",
              "flex flex-col items-center justify-center gap-0.5",
              "transition-all duration-200 active:scale-95",
              activeTab === "games"
                ? "bg-yellow-400 text-yellow-900 ring-4 ring-yellow-400/30 scale-105"
                : "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
            )}
            aria-label="Palpites"
          >
            <PenLine className="w-6 h-6 stroke-[2.5]" />
            <span className="text-[9px] font-bold leading-none">Palpites</span>
            {/* Badge de palpites pendentes */}
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
