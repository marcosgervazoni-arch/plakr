/**
 * useSafariDetect
 *
 * Detecta se o usuário está acessando via Safari (incluindo iOS WebView).
 * Usado para personalizar a jornada de login: no Safari, o OAuth é bloqueado
 * por restrições de cookies de terceiros, então o Magic Link deve ser o padrão.
 *
 * Detecção robusta:
 * - Safari desktop: "Safari" no UA sem "Chrome" ou "Chromium"
 * - iOS Safari: "iPhone" ou "iPad" no UA (todos os browsers no iOS usam WebKit)
 * - iOS WebView: "AppleWebKit" sem "CriOS" (Chrome iOS) ou "FxiOS" (Firefox iOS)
 */
export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;

  // iOS: qualquer browser no iPhone/iPad é afetado pela restrição de cookies
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  if (isIOS) return true;

  // Safari desktop: tem "Safari" mas não tem "Chrome" nem "Chromium" nem "Edg"
  const isSafariDesktop =
    /Safari/.test(ua) &&
    !/Chrome/.test(ua) &&
    !/Chromium/.test(ua) &&
    !/Edg/.test(ua) &&
    !/OPR/.test(ua);

  return isSafariDesktop;
}

/**
 * Hook React que retorna se o usuário está no Safari.
 * O valor é estável (não muda durante a sessão).
 */
import { useState } from "react";

export function useSafariDetect(): boolean {
  const [isSafari] = useState(() => isSafariBrowser());
  return isSafari;
}
