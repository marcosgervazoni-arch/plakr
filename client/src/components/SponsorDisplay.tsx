/**
 * SponsorDisplay — Componentes de exibição de patrocínio na página do bolão
 *
 * Exporta:
 *   - SponsorBanner: banner clicável do patrocinador (abaixo do hero)
 *   - SponsorPopup: popup configurável com botão+link
 *   - SponsorWelcomeMessage: mensagem de boas-vindas (exibida uma vez por membro)
 *   - useSponsorData: hook para buscar dados do patrocinador
 *
 * Rastreamento de eventos (fire-and-forget):
 *   - banner_impression: quando o banner é exibido
 *   - banner_click: quando o banner é clicado
 *   - popup_impression: quando o popup aparece
 *   - popup_click: quando o botão do popup é clicado
 *   - welcome_impression: quando a mensagem de boas-vindas é exibida
 */
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Utilitário: sessionId anônimo ───────────────────────────────────────────

function getSessionId(): string {
  const key = "plakr_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ─── Hook: buscar dados do patrocinador ──────────────────────────────────────

export function useSponsorData(poolId: number | undefined) {
  return trpc.pools.getSponsorPublic.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );
}

// ─── Hook: rastrear eventos de patrocínio ────────────────────────────────────

function useSponsorTracker(poolId: number, sponsorId: number | undefined) {
  const trackMutation = trpc.pools.trackSponsorEvent.useMutation();

  const track = useCallback((
    eventType: "banner_impression" | "banner_click" | "popup_impression" | "popup_click" | "welcome_impression"
  ) => {
    if (!sponsorId) return;
    trackMutation.mutate({
      poolId,
      sponsorId,
      eventType,
      sessionId: getSessionId(),
    });
  }, [poolId, sponsorId, trackMutation]);

  return track;
}

// ─── SponsorBanner ───────────────────────────────────────────────────────────

interface SponsorBannerProps {
  poolId: number;
  sponsorId?: number;
  className?: string;
}

export function SponsorBanner({ poolId, sponsorId, className = "" }: SponsorBannerProps) {
  const { data: sponsor } = useSponsorData(poolId);
  const track = useSponsorTracker(poolId, sponsorId);
  const trackedRef = useRef(false);

  // Rastrear impressão uma vez quando o banner aparecer
  useEffect(() => {
    if (sponsor?.bannerActive && sponsor.bannerImageUrl && !trackedRef.current) {
      trackedRef.current = true;
      track("banner_impression");
    }
  }, [sponsor, track]);

  if (!sponsor || !sponsor.bannerActive || !sponsor.bannerImageUrl) return null;

  const content = (
    <div
      className={`w-full overflow-hidden rounded-xl border border-border/30 bg-card/50 ${className}`}
      style={{ height: "120px" }}
    >
      <img
        src={sponsor.bannerImageUrl}
        alt={`Patrocinado por ${sponsor.sponsorName}`}
        className="w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
    </div>
  );

  if (sponsor.bannerLinkUrl) {
    return (
      <a
        href={sponsor.bannerLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={`Banner patrocinado por ${sponsor.sponsorName}`}
        onClick={() => track("banner_click")}
      >
        {content}
      </a>
    );
  }

  return content;
}

// ─── SponsorWelcomeMessage ────────────────────────────────────────────────────

interface SponsorWelcomeProps {
  poolId: number;
  userId: number;
  sponsorId?: number;
}

export function SponsorWelcomeMessage({ poolId, userId, sponsorId }: SponsorWelcomeProps) {
  const { data: sponsor } = useSponsorData(poolId);
  const track = useSponsorTracker(poolId, sponsorId);
  const [dismissed, setDismissed] = useState(false);
  const trackedRef = useRef(false);
  const lsKey = `sponsor_welcome_${poolId}_${userId}`;

  useEffect(() => {
    if (localStorage.getItem(lsKey)) setDismissed(true);
  }, [lsKey]);

  // Rastrear impressão quando a mensagem aparecer pela primeira vez
  useEffect(() => {
    if (sponsor?.welcomeMessageActive && sponsor.welcomeMessage && !dismissed && !trackedRef.current) {
      trackedRef.current = true;
      track("welcome_impression");
    }
  }, [sponsor, dismissed, track]);

  if (!sponsor || !sponsor.welcomeMessageActive || !sponsor.welcomeMessage || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(lsKey, "1");
    setDismissed(true);
  };

  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-brand/10 border border-brand/25 flex items-start gap-3">
      {sponsor.sponsorLogoUrl && (
        <img
          src={sponsor.sponsorLogoUrl}
          alt={sponsor.sponsorName}
          className="w-8 h-8 rounded-md object-contain shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-brand mb-0.5">Patrocinado por {sponsor.sponsorName}</p>
        <p className="text-xs text-foreground/80">{sponsor.welcomeMessage}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar mensagem"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── SponsorPopup ─────────────────────────────────────────────────────────────

interface SponsorPopupProps {
  poolId: number;
  userId: number;
  sponsorId?: number;
}

export function SponsorPopup({ poolId, userId, sponsorId }: SponsorPopupProps) {
  const { data: sponsor } = useSponsorData(poolId);
  const track = useSponsorTracker(poolId, sponsorId);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedRef = useRef(false);

  const lsKey = `sponsor_popup_${poolId}_${userId}`;
  const sessionKey = `sponsor_popup_session_${poolId}`;

  useEffect(() => {
    if (!sponsor || !sponsor.popupActive || !sponsor.popupTitle) return;

    const freq = sponsor.popupFrequency ?? "once_per_session";
    if (freq === "once_per_member" && localStorage.getItem(lsKey)) return;
    if (freq === "once_per_session" && sessionStorage.getItem(sessionKey)) return;

    const delay = (sponsor.popupDelaySeconds ?? 3) * 1000;
    timerRef.current = setTimeout(() => setVisible(true), delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sponsor, lsKey, sessionKey]);

  // Rastrear impressão quando o popup aparecer
  useEffect(() => {
    if (visible && !trackedRef.current) {
      trackedRef.current = true;
      track("popup_impression");
    }
  }, [visible, track]);

  const handleClose = () => {
    setVisible(false);
    if (!sponsor) return;
    const freq = sponsor.popupFrequency ?? "once_per_session";
    if (freq === "once_per_member") localStorage.setItem(lsKey, "1");
    if (freq === "once_per_session") sessionStorage.setItem(sessionKey, "1");
  };

  if (!visible || !sponsor || !sponsor.popupActive || !sponsor.popupTitle) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagem do popup */}
        {sponsor.popupImageUrl && (
          <div className="w-full" style={{ height: "180px", overflow: "hidden" }}>
            <img
              src={sponsor.popupImageUrl}
              alt={sponsor.sponsorName}
              className="w-full h-full"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
        )}

        <div className="p-5">
          {/* Logo + nome do patrocinador */}
          <div className="flex items-center gap-2 mb-3">
            {sponsor.sponsorLogoUrl && (
              <img
                src={sponsor.sponsorLogoUrl}
                alt={sponsor.sponsorName}
                className="w-7 h-7 rounded-md object-contain"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Patrocinado por <span className="font-semibold text-foreground">{sponsor.sponsorName}</span>
            </p>
          </div>

          {/* Título */}
          <h3 className="font-bold text-lg font-display leading-tight mb-2">{sponsor.popupTitle}</h3>

          {/* Texto */}
          {sponsor.popupText && (
            <p className="text-sm text-muted-foreground mb-4">{sponsor.popupText}</p>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            {sponsor.popupButtonText && sponsor.popupButtonUrl && (
              <a
                href={sponsor.popupButtonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
                onClick={() => {
                  track("popup_click");
                  handleClose();
                }}
              >
                <Button className="w-full bg-brand hover:bg-brand/90 text-brand-foreground gap-1.5">
                  {sponsor.popupButtonText}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              className={sponsor.popupButtonText && sponsor.popupButtonUrl ? "shrink-0" : "flex-1"}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
