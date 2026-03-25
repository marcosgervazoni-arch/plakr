/**
 * useAnalytics — injeta GA4 e Facebook Pixel dinamicamente a partir das
 * configurações do superadmin (system.getAnalyticsConfig).
 *
 * Uso: chamar uma vez em App.tsx.
 * Expõe helpers tipados por evento de negócio para GA4 + Facebook Pixel.
 *
 * Mapeamento de eventos:
 *   trackSignUp        → GA4: sign_up          | Pixel: CompleteRegistration
 *   trackPoolCreated   → GA4: pool_created      | Pixel: CustomEvent
 *   trackPoolJoined    → GA4: pool_joined       | Pixel: Lead
 *   trackBetSubmitted  → GA4: bet_submitted     | Pixel: CustomEvent
 *   trackUpgradeClicked→ GA4: upgrade_clicked   | Pixel: InitiateCheckout
 *   trackPurchase      → GA4: purchase          | Pixel: Purchase
 *   trackBadgeUnlocked → GA4: badge_unlocked    | Pixel: CustomEvent
 *   trackInviteSent    → GA4: invite_sent       | Pixel: CustomEvent
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

// ─── Helpers internos ────────────────────────────────────────────────────────

function ga(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params ?? {});
  }
}

function fb(eventName: string, params?: Record<string, unknown>, isStandard = false) {
  if (typeof window !== "undefined" && window.fbq) {
    if (isStandard) {
      window.fbq("track", eventName, params ?? {});
    } else {
      window.fbq("trackCustom", eventName, params ?? {});
    }
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

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
    // ── Genérico (uso interno) ───────────────────────────────────────────────
    trackEvent: (name: string, params?: Record<string, unknown>) => {
      ga(name, params);
      fb(name, params);
    },
    trackPageView: () => {
      ga("page_view");
      fb("PageView", undefined, true);
    },

    // ── Eventos de negócio tipados ───────────────────────────────────────────

    /** Disparar após primeiro login OAuth (novo usuário).
     *  GA4: sign_up | Pixel: CompleteRegistration */
    trackSignUp: (params?: { method?: string }) => {
      ga("sign_up", { method: params?.method ?? "oauth" });
      fb("CompleteRegistration", { method: params?.method ?? "oauth" }, true);
    },

    /** Disparar ao criar bolão com sucesso.
     *  GA4: pool_created | Pixel: CustomEvent */
    trackPoolCreated: (params?: { pool_name?: string; access_type?: string }) => {
      ga("pool_created", params);
      fb("pool_created", params);
    },

    /** Disparar ao entrar em um bolão (público ou privado por código).
     *  GA4: pool_joined | Pixel: Lead */
    trackPoolJoined: (params?: { pool_name?: string; join_method?: "public" | "code" | "invite_link" }) => {
      ga("pool_joined", params);
      fb("Lead", { content_name: params?.pool_name, join_method: params?.join_method }, true);
    },

    /** Disparar ao salvar palpites com sucesso.
     *  GA4: bet_submitted | Pixel: CustomEvent */
    trackBetSubmitted: (params?: { pool_slug?: string; game_id?: number }) => {
      ga("bet_submitted", params);
      fb("bet_submitted", params);
    },

    /** Disparar ao clicar em qualquer CTA de upgrade para Pro.
     *  GA4: upgrade_clicked | Pixel: InitiateCheckout */
    trackUpgradeClicked: (params?: { source?: string; pool_slug?: string }) => {
      ga("upgrade_clicked", params);
      fb("InitiateCheckout", { content_name: "Pro Plan", source: params?.source }, true);
    },

    /** Disparar após pagamento Stripe confirmado (success_url).
     *  GA4: purchase | Pixel: Purchase */
    trackPurchase: (params?: { value?: number; currency?: string; transaction_id?: string }) => {
      ga("purchase", {
        currency: params?.currency ?? "BRL",
        value: params?.value ?? 0,
        transaction_id: params?.transaction_id,
      });
      fb("Purchase", { currency: params?.currency ?? "BRL", value: params?.value ?? 0 }, true);
    },

    /** Disparar ao desbloquear um badge.
     *  GA4: badge_unlocked | Pixel: CustomEvent */
    trackBadgeUnlocked: (params?: { badge_name?: string; badge_id?: number }) => {
      ga("badge_unlocked", params);
      fb("badge_unlocked", params);
    },

    /** Disparar ao copiar/compartilhar link de convite.
     *  GA4: invite_sent | Pixel: CustomEvent */
    trackInviteSent: (params?: { method?: "copy" | "share" | "whatsapp"; pool_slug?: string }) => {
      ga("invite_sent", params);
      fb("invite_sent", params);
    },
  };
}
