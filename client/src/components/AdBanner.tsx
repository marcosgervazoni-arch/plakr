/**
 * AdBanner — Componente de exibição de anúncios
 *
 * Dimensões fixas por posição (padrão IAB):
 * ┌──────────────────┬──────────────────────┬────────────────────┐
 * │ Posição          │ Desktop              │ Mobile             │
 * ├──────────────────┼──────────────────────┼────────────────────┤
 * │ top              │ 728×90 (Leaderboard) │ 320×50 (Banner)    │
 * │ sidebar          │ 300×250 (Med. Rect.) │ — (oculto)         │
 * │ between_sections │ 728×90 (Leaderboard) │ 320×100 (Lg Banner)│
 * │ bottom           │ 728×90 (Leaderboard) │ 320×50 (Banner)    │
 * │ popup            │ 400×300 (overlay)    │ 320×250 (overlay)  │
 * └──────────────────┴──────────────────────┴────────────────────┘
 *
 * Regra: o container define o tamanho — o conteúdo (imagem/vídeo/script)
 * se adapta ao container, nunca o contrário.
 *
 * Integração Adsterra (pendente — configurar após criar conta):
 * - Cada posição tem uma variável de ambiente correspondente (VITE_ADSTERRA_ZONE_*)
 * - Quando a variável está preenchida E não há banner próprio cadastrado,
 *   o script do Adsterra é renderizado no mesmo container
 */
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Ad = {
  id: number;
  title: string;
  type: "banner" | "video" | "script";
  assetUrl: string | null;
  scriptCode: string | null;
  linkUrl: string | null;
  position: "sidebar" | "top" | "between_sections" | "bottom" | "popup";
  device: "all" | "desktop" | "mobile";
  carouselInterval: number;
  popupFrequency: "session" | "daily" | "always" | null;
};

// ─── Dimensões fixas por posição (padrão IAB) ───────────────────────────────
const AD_DIMENSIONS: Record<
  string,
  { desktop: { w: number; h: number }; mobile: { w: number; h: number } }
> = {
  top:              { desktop: { w: 728, h: 90  }, mobile: { w: 320, h: 50  } },
  sidebar:          { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
  between_sections: { desktop: { w: 728, h: 90  }, mobile: { w: 320, h: 100 } },
  bottom:           { desktop: { w: 728, h: 90  }, mobile: { w: 320, h: 50  } },
  popup:            { desktop: { w: 400, h: 300 }, mobile: { w: 320, h: 250 } },
};

// ─── Zonas Adsterra por posição ──────────────────────────────────────────────
// Preencher com os IDs de zona gerados no painel do Adsterra após criar a conta.
// Cada zona deve ser criada com o tamanho correspondente na tabela acima.
//
// Exemplo de configuração no .env:
//   VITE_ADSTERRA_ZONE_TOP_DESKTOP=1234567
//   VITE_ADSTERRA_ZONE_TOP_MOBILE=1234568
//   VITE_ADSTERRA_ZONE_SIDEBAR=1234569
//   VITE_ADSTERRA_ZONE_BETWEEN_DESKTOP=1234570
//   VITE_ADSTERRA_ZONE_BETWEEN_MOBILE=1234571
//   VITE_ADSTERRA_ZONE_BOTTOM_DESKTOP=1234572
//   VITE_ADSTERRA_ZONE_BOTTOM_MOBILE=1234573
//   VITE_ADSTERRA_ZONE_POPUP=1234574
//
const ADSTERRA_ZONES: Record<string, string | undefined> = {
  top_desktop:       import.meta.env.VITE_ADSTERRA_ZONE_TOP_DESKTOP,
  top_mobile:        import.meta.env.VITE_ADSTERRA_ZONE_TOP_MOBILE,
  sidebar:           import.meta.env.VITE_ADSTERRA_ZONE_SIDEBAR,
  between_desktop:   import.meta.env.VITE_ADSTERRA_ZONE_BETWEEN_DESKTOP,
  between_mobile:    import.meta.env.VITE_ADSTERRA_ZONE_BETWEEN_MOBILE,
  bottom_desktop:    import.meta.env.VITE_ADSTERRA_ZONE_BOTTOM_DESKTOP,
  bottom_mobile:     import.meta.env.VITE_ADSTERRA_ZONE_BOTTOM_MOBILE,
  popup:             import.meta.env.VITE_ADSTERRA_ZONE_POPUP,
};

function getAdsterraZoneKey(position: string, isMobile: boolean): string {
  if (position === "sidebar") return "sidebar";
  if (position === "popup") return "popup";
  return `${position.replace("between_sections", "between")}_${isMobile ? "mobile" : "desktop"}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function filterByDevice(ads: Ad[], isMobile: boolean): Ad[] {
  return ads.filter(
    (a) => a.device === "all" || (isMobile ? a.device === "mobile" : a.device === "desktop")
  );
}

function canShowPopup(ad: Ad): boolean {
  const key = `popup_shown_${ad.id}`;
  if (ad.popupFrequency === "always") return true;
  if (ad.popupFrequency === "session") return !sessionStorage.getItem(key);
  if (ad.popupFrequency === "daily") {
    const stored = localStorage.getItem(key);
    return stored !== new Date().toDateString();
  }
  return true;
}

function markPopupShown(ad: Ad): void {
  const key = `popup_shown_${ad.id}`;
  if (ad.popupFrequency === "session") sessionStorage.setItem(key, "1");
  else if (ad.popupFrequency === "daily") localStorage.setItem(key, new Date().toDateString());
}

// ─── Componente Adsterra (fallback quando não há banner próprio) ──────────────
function AdsterraSlot({ zoneId, width, height }: { zoneId: string; width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current || !containerRef.current) return;
    injected.current = true;

    // Adsterra usa um script + atributo de zona para injetar o banner
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = `//pl${zoneId}.profitablegatecpm.com/${zoneId}/invoke.js`;
    containerRef.current.appendChild(script);
  }, [zoneId]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, overflow: "hidden" }}
      className="flex items-center justify-center"
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdBannerProps {
  position: "top" | "sidebar" | "between_sections" | "bottom" | "popup";
  className?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AdBanner({ position, className }: AdBannerProps) {
  const { data: allAds } = trpc.ads.getActive.useQuery({ position });
  const recordClickMutation = trpc.ads.recordClick.useMutation();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupEvaluated = useRef(false);

  const ads = allAds ? filterByDevice(allAds as Ad[], isMobile) : [];

  // Dimensões fixas para esta posição e dispositivo
  const dims = AD_DIMENSIONS[position];
  const { w: adWidth, h: adHeight } = isMobile ? dims.mobile : dims.desktop;

  // Zona Adsterra para fallback
  const adsterraKey = getAdsterraZoneKey(position, isMobile);
  const adsterraZoneId = ADSTERRA_ZONES[adsterraKey];

  // Popup: avaliar apenas uma vez quando os dados chegarem
  useEffect(() => {
    if (position !== "popup" || ads.length === 0 || popupEvaluated.current) return;
    popupEvaluated.current = true;
    const ad = ads[0];
    if (canShowPopup(ad)) {
      markPopupShown(ad);
      const timer = setTimeout(() => setPopupVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [ads.length, position]);

  // Carousel auto-advance
  useEffect(() => {
    if (ads.length <= 1 || position === "popup") return;
    const interval = ads[currentIndex]?.carouselInterval ?? 5000;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ads.length);
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ads.length, currentIndex, position]);

  const handleClick = useCallback(
    (ad: Ad) => {
      recordClickMutation.mutate({ adId: ad.id });
      if (ad.linkUrl) window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    },
    [recordClickMutation]
  );

  // ── Popup mode ──────────────────────────────────────────────────────────────
  if (position === "popup") {
    if (!popupVisible) return null;
    if (ads.length === 0) return null;
    const ad = ads[0];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl bg-card border border-border/50"
          style={{ width: adWidth, maxWidth: "calc(100vw - 2rem)" }}
        >
          <button
            onClick={() => setPopupVisible(false)}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div style={{ height: adHeight, overflow: "hidden" }}>
            <AdContent ad={ad} onClick={() => handleClick(ad)} />
          </div>
          <div className="p-2 text-center">
            <span className="text-xs text-muted-foreground">Publicidade</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Sidebar: ocultar no mobile ──────────────────────────────────────────────
  if (position === "sidebar" && isMobile) return null;

  // ── Sem banner próprio: tentar Adsterra como fallback ──────────────────────
  if (ads.length === 0) {
    if (!adsterraZoneId) return null;
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border/30 flex items-center justify-center",
          className
        )}
        style={{ width: "100%", height: adHeight }}
      >
        <div className="absolute top-1 right-1 z-10 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
          Publicidade
        </div>
        <AdsterraSlot zoneId={adsterraZoneId} width={adWidth} height={adHeight} />
      </div>
    );
  }

  // ── Banner próprio (carrossel) ──────────────────────────────────────────────
  const currentAd = ads[currentIndex];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/30",
        className
      )}
      style={{ width: "100%", height: adHeight }}
    >
      {/* Ad label */}
      <div className="absolute top-1 right-1 z-10 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
        Publicidade
      </div>

      {/* Ad content — ocupa exatamente o container */}
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <AdContent ad={currentAd} onClick={() => handleClick(currentAd)} />
      </div>

      {/* Carousel dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === currentIndex ? "bg-white w-3" : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Conteúdo do anúncio — sempre preenche 100% do container ─────────────────
function AdContent({ ad, onClick }: { ad: Ad; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ad.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [ad.id, ad.type]);

  if (ad.type === "script" && ad.scriptCode) {
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:transparent;overflow:hidden">${ad.scriptCode}</body></html>`,
      ],
      { type: "text/html" }
    );
    const blobUrl = URL.createObjectURL(blob);
    return (
      <iframe
        src={blobUrl}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-0"
        title="Ad"
      />
    );
  }

  if (ad.type === "video" && ad.assetUrl) {
    return (
      <div className="w-full h-full cursor-pointer" onClick={onClick}>
        <video
          ref={videoRef}
          src={ad.assetUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
          loop
          autoPlay
        />
      </div>
    );
  }

  if (ad.assetUrl) {
    return (
      <div className="w-full h-full cursor-pointer" onClick={onClick}>
        <img
          src={ad.assetUrl}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback: text ad
  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 text-center cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={onClick}
    >
      <div>
        <p className="text-sm font-medium">{ad.title}</p>
        {ad.linkUrl && <p className="text-xs text-brand mt-1 underline">{ad.linkUrl}</p>}
      </div>
    </div>
  );
}
