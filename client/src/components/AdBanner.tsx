/**
 * AdBanner — Componente de exibição de anúncios
 *
 * Dimensões fixas por posição (padrão IAB):
 * ┌──────────────────┬──────────────────────┬────────────────────┐
 * │ Posição          │ Desktop              │ Mobile             │
 * ├──────────────────┼──────────────────────┼────────────────────┤
 * │ top              │ 728×90 (Leaderboard) │ 320×50 (Banner)    │
 * │ sidebar          │ 300×250 (Med. Rect.) │ — (oculto)         │
 * │ between_sections │ 728×90 (Leaderboard) │ 320×100 (Lg Banner) │
 * │ bottom           │ 728×90 (Leaderboard) │ 320×50 (Banner)    │
 * │ popup            │ 400×300 (overlay)    │ 320×250 (overlay)  │
 * └──────────────────┴──────────────────────┴────────────────────┘
 *
 * Regra: o container define o tamanho — o conteúdo (imagem/vídeo/script)
 * se adapta ao container, nunca o contrário.
 *
 * Integração Adsterra:
 * - O código HTML completo (copiado do painel Adsterra → GET CODE) é salvo
 *   no banco via AdminIntegrations → campo adNetworkScripts
 * - Quando não há banner próprio cadastrado na posição, o código Adsterra
 *   é injetado diretamente no DOM via useRef + useEffect (sem iframe)
 * - Esta abordagem garante compatibilidade com Chrome mobile Android (Xiaomi/MIUI)
 *   onde iframes com srcdoc bloqueiam execução de scripts
 * - Adsterra é exibido independente do toggle adsEnabled (que controla só banners próprios)
 */
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
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
  popup:            { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
};

// ─── Mapa de chaves do adNetworkScripts por posição ──────────────────────────
function getAdsterraKey(position: string, isMobile: boolean): string {
  if (position === "sidebar") return "sidebar";
  if (position === "popup") return "popup";
  const base = position === "between_sections" ? "between" : position;
  return `${base}_${isMobile ? "mobile" : "desktop"}`;
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

// ─── Componente Adsterra: injeta scripts diretamente no DOM ──────────────────
// Abordagem: useRef + useEffect para criar e anexar tags <script> ao container.
// Esta é a única abordagem confiável em React SPAs para scripts de terceiros
// que usam document.write() ou carregam scripts externos dinamicamente.
// Funciona em Chrome mobile Android (Xiaomi/MIUI), Safari iOS e todos os browsers modernos.
//
// Por que NÃO usar iframe:
// - Chrome mobile Android bloqueia scripts em iframes com srcdoc mesmo com sandbox="allow-scripts"
// - Chromium issue #40303108: allow-scripts em sandbox não é honrado consistentemente no Android
// - iframes com blob URL também não funcionam no Chromium mobile (Reddit r/webdev 2024)
function AdsterraSlot({ htmlCode, width, height }: { htmlCode: string; width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injected = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || injected.current || !htmlCode.trim()) return;
    injected.current = true;

    // Limpar container antes de injetar
    container.innerHTML = "";

    // Parsear o HTML para extrair scripts e conteúdo estático
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, "text/html");
    const elements = Array.from(doc.body.childNodes);

    elements.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === "SCRIPT") {
          // Scripts precisam ser recriados para executar (innerHTML não executa scripts)
          const script = document.createElement("script");
          if ((el as HTMLScriptElement).src) {
            script.src = (el as HTMLScriptElement).src;
            script.type = "text/javascript";
            script.async = true;
          } else {
            script.type = "text/javascript";
            script.textContent = el.textContent || "";
          }
          container.appendChild(script);
        } else {
          // Outros elementos (divs, etc.) podem ser clonados diretamente
          container.appendChild(el.cloneNode(true));
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Cleanup: ao desmontar, limpar o container
    return () => {
      if (container) container.innerHTML = "";
      injected.current = false;
    };
  }, [htmlCode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: height,
        maxWidth: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
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
  // getActive já filtra por adsEnabled no servidor (banners próprios)
  const { data: allAds } = trpc.ads.getActive.useQuery({ position });
  // getAdConfig é público — retorna adsEnabled + adNetworkScripts para todos os usuários
  const { data: adConfig } = trpc.platform.getAdConfig.useQuery();
  const recordClickMutation = trpc.ads.recordClick.useMutation();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupEvaluated = useRef(false);
  const [location] = useLocation();
  const lastPopupLocation = useRef<string | null>(null);
  const popupShownCount = useRef(0);

  const ads = allAds ? filterByDevice(allAds as Ad[], isMobile) : [];

  // Dimensões fixas para esta posição e dispositivo
  const dims = AD_DIMENSIONS[position];
  const { w: adWidth, h: adHeight } = isMobile ? dims.mobile : dims.desktop;

  // Código Adsterra do banco
  const adsterraKey = getAdsterraKey(position, isMobile);
  const adNetworkScripts = (adConfig?.adNetworkScripts as Record<string, unknown> | null) ?? {};
  const adsterraCode = typeof adNetworkScripts[adsterraKey] === "string" && (adNetworkScripts[adsterraKey] as string).trim().length > 0
    ? (adNetworkScripts[adsterraKey] as string)
    : null;

  // Popup: disparar por banner próprio OU por Adsterra, com trigger por navegação
  useEffect(() => {
    if (position !== "popup") return;
    // Ignorar a primeira rota (carregamento inicial)
    if (lastPopupLocation.current === null) {
      lastPopupLocation.current = location;
      return;
    }
    // Só disparar quando a rota mudar
    if (lastPopupLocation.current === location) return;
    lastPopupLocation.current = location;
    popupShownCount.current += 1;
    // Disparar a cada 3 trocas de rota para não ser intrusivo
    if (popupShownCount.current % 3 !== 0) return;
    // Verificar se há banner próprio
    if (ads.length > 0) {
      const ad = ads[0];
      if (canShowPopup(ad)) {
        markPopupShown(ad);
        const timer = setTimeout(() => setPopupVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } else if (adsterraCode) {
      // Sem banner próprio: usar Adsterra como interstitial
      // Frequência configurada no Admin (popup_frequency): session | daily | always
      const freq = (adNetworkScripts["popup_frequency"] as string) || "session";
      const popupKey = "adsterra_popup_shown";
      let canShow = false;
      if (freq === "always") {
        canShow = true;
      } else if (freq === "session") {
        canShow = !sessionStorage.getItem(popupKey);
        if (canShow) sessionStorage.setItem(popupKey, "1");
      } else if (freq === "daily") {
        const stored = localStorage.getItem(popupKey);
        canShow = stored !== new Date().toDateString();
        if (canShow) localStorage.setItem(popupKey, new Date().toDateString());
      }
      if (canShow) {
        const timer = setTimeout(() => setPopupVisible(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [location, position, ads.length, adsterraCode]);

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
    // Sem banner próprio E sem Adsterra: nada a exibir
    if (ads.length === 0 && !adsterraCode) return null;
    const ad = ads.length > 0 ? ads[0] : null;
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
            {ad ? (
              <AdContent ad={ad} onClick={() => handleClick(ad)} />
            ) : (
              <AdsterraSlot htmlCode={adsterraCode!} width={adWidth} height={adHeight} />
            )}
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
    if (!adsterraCode) return null;
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
        <AdsterraSlot htmlCode={adsterraCode} width={adWidth} height={adHeight} />
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
