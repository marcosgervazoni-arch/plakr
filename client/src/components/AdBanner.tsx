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
  return ads.filter((a) => a.device === "all" || (isMobile ? a.device === "mobile" : a.device === "desktop"));
}

function canShowPopup(ad: Ad): boolean {
  const key = `popup_shown_${ad.id}`;
  if (ad.popupFrequency === "always") return true;
  if (ad.popupFrequency === "session") {
    return !sessionStorage.getItem(key);
  }
  if (ad.popupFrequency === "daily") {
    const stored = localStorage.getItem(key);
    const today = new Date().toDateString();
    return stored !== today;
  }
  return true;
}

function markPopupShown(ad: Ad): void {
  const key = `popup_shown_${ad.id}`;
  if (ad.popupFrequency === "session") {
    sessionStorage.setItem(key, "1");
  } else if (ad.popupFrequency === "daily") {
    localStorage.setItem(key, new Date().toDateString());
  }
}

interface AdBannerProps {
  position: "top" | "sidebar" | "between_sections" | "bottom" | "popup";
  className?: string;
}

export function AdBanner({ position, className }: AdBannerProps) {
  const { data: allAds } = trpc.ads.getActive.useQuery({ position });
  const recordClickMutation = trpc.ads.recordClick.useMutation();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref para garantir que o popup seja avaliado apenas uma vez após os dados chegarem
  const popupEvaluated = useRef(false);

  const ads = allAds ? filterByDevice(allAds as Ad[], isMobile) : [];

  // Popup: avaliar apenas uma vez quando os dados chegarem (evita dupla avaliação)
  useEffect(() => {
    if (position !== "popup" || ads.length === 0 || popupEvaluated.current) return;
    popupEvaluated.current = true;
    const ad = ads[0];
    if (canShowPopup(ad)) {
      markPopupShown(ad); // marcar antes do timer para evitar race condition
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

  const handleClick = useCallback((ad: Ad) => {
    recordClickMutation.mutate({ adId: ad.id });
    if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  }, [recordClickMutation]);

  if (!ads || ads.length === 0) return null;

  // Popup mode
  if (position === "popup") {
    if (!popupVisible) return null;
    const ad = ads[0];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative max-w-md w-full mx-4 rounded-xl overflow-hidden shadow-2xl bg-card border border-border/50">
          <button
            onClick={() => setPopupVisible(false)}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <AdContent ad={ad} onClick={() => handleClick(ad)} />
          <div className="p-2 text-center">
            <span className="text-xs text-muted-foreground">Publicidade</span>
          </div>
        </div>
      </div>
    );
  }

  const currentAd = ads[currentIndex];

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border/30", className)}>
      {/* Ad label */}
      <div className="absolute top-1 right-1 z-10 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
        Publicidade
      </div>

      {/* Ad content */}
      <AdContent ad={currentAd} onClick={() => handleClick(currentAd)} />

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

function AdContent({ ad, onClick }: { ad: Ad; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ad.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [ad.id, ad.type]);

  if (ad.type === "script" && ad.scriptCode) {
    // [S11] Isolar scripts de anúncios em iframe sandboxed para prevenir XSS
    const blob = new Blob(
      [`<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:transparent">${ad.scriptCode}</body></html>`],
      { type: "text/html" }
    );
    const blobUrl = URL.createObjectURL(blob);
    return (
      <iframe
        src={blobUrl}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{ minHeight: 90 }}
        title="Ad"
        onLoad={(e) => {
          const iframe = e.currentTarget;
          try {
            const h = iframe.contentDocument?.body?.scrollHeight;
            if (h) iframe.style.height = h + "px";
          } catch {}
        }}
      />
    );
  }

  if (ad.type === "video" && ad.assetUrl) {
    return (
      <div className="cursor-pointer" onClick={onClick}>
        <video
          ref={videoRef}
          src={ad.assetUrl}
          className="w-full object-cover"
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
      <div className="cursor-pointer" onClick={onClick}>
        <img
          src={ad.assetUrl}
          alt={ad.title}
          className="w-full object-cover"
        />
      </div>
    );
  }

  // Fallback: text ad
  return (
    <div
      className="p-4 text-center cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={onClick}
    >
      <p className="text-sm font-medium">{ad.title}</p>
      {ad.linkUrl && (
        <p className="text-xs text-brand mt-1 underline">{ad.linkUrl}</p>
      )}
    </div>
  );
}
