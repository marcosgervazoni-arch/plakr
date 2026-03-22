/**
 * useAnalytics — injeta GA4 e Facebook Pixel dinamicamente a partir das
 * configurações do superadmin (system.getAnalyticsConfig).
 *
 * Uso: chamar uma vez em App.tsx ou main.tsx.
 * Expõe trackEvent(name, params?) para eventos customizados.
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function useAnalytics() {
  const { data } = trpc.system.getAnalyticsConfig.useQuery(undefined, {
    staleTime: 1000 * 60 * 10, // 10 min
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data) return;

    // ── Google Analytics 4 ──────────────────────────────────────────────────
    if (data.gaMeasurementId && !document.getElementById("ga4-script")) {
      const script1 = document.createElement("script");
      script1.id = "ga4-script";
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${data.gaMeasurementId}`;
      document.head.appendChild(script1);

      window.dataLayer = window.dataLayer ?? [];
      window.gtag = function (...args: unknown[]) {
        window.dataLayer!.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", data.gaMeasurementId);
    }

    // ── Facebook Pixel ───────────────────────────────────────────────────────
    if (data.fbPixelId && !document.getElementById("fb-pixel-script")) {
      const script2 = document.createElement("script");
      script2.id = "fb-pixel-script";
      script2.innerHTML = `
        !function(f,b,e,v,n,t,s){
          if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
          t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)
        }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${data.fbPixelId}');
        fbq('track','PageView');
      `;
      document.head.appendChild(script2);
    }
  }, [data]);

  return {
    trackEvent: (name: string, params?: Record<string, unknown>) => {
      if (window.gtag) window.gtag("event", name, params ?? {});
      if (window.fbq) window.fbq("trackCustom", name, params ?? {});
    },
    trackPageView: () => {
      if (window.gtag) window.gtag("event", "page_view");
      if (window.fbq) window.fbq("track", "PageView");
    },
  };
}
