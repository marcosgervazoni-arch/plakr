/**
 * useReferralCapture
 *
 * Fluxo:
 * 1. Ao carregar qualquer página, verifica se há `?ref=CODIGO` na URL.
 *    Se sim, persiste o código no localStorage com TTL de 7 dias.
 * 2. Quando o usuário faz login pela primeira vez (conta criada há menos de
 *    60 segundos), lê o código do localStorage e chama `users.useInviteCode`.
 * 3. Após aplicar (com sucesso ou não), limpa o localStorage para evitar
 *    re-tentativas.
 */
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

const STORAGE_KEY = "plakr_ref_code";
const STORAGE_EXPIRY_KEY = "plakr_ref_expiry";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const NEW_USER_THRESHOLD_MS = 60_000; // 60 segundos

function saveRefCode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem(STORAGE_EXPIRY_KEY, String(Date.now() + TTL_MS));
  } catch {
    // localStorage indisponível (modo privado restrito)
  }
}

function loadRefCode(): string | null {
  try {
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      clearRefCode();
      return null;
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearRefCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  } catch {
    // silencioso
  }
}

export function useReferralCapture() {
  const analytics = useAnalytics();
  const { data: me } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const useInviteCode = trpc.users.useInviteCode.useMutation({
    onSuccess: (data) => {
      if (data?.success) {
        console.log("[Referral] Convite registrado com sucesso.");
      }
      clearRefCode();
    },
    onError: () => {
      clearRefCode();
    },
  });

  // Passo 1: capturar ?ref= da URL e salvar no localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length > 0) {
      saveRefCode(ref);
      // Limpar o parâmetro da URL sem recarregar a página
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("ref");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, []);

  // Passo 2: após login, verificar se é novo usuário e aplicar o código
  useEffect(() => {
    if (!me?.id) return;

    const refCode = loadRefCode();
    if (!refCode) return;

    // Verificar se é novo usuário (conta criada há menos de 60s)
    const createdAt = me.createdAt ? new Date(me.createdAt).getTime() : 0;
    const isNewUser = createdAt > 0 && Date.now() - createdAt < NEW_USER_THRESHOLD_MS;

    if (!isNewUser) {
      // Usuário já existente — limpar código sem aplicar
      clearRefCode();
      return;
    }

    // Disparar evento de cadastro no GA4 e Facebook Pixel
    analytics.trackSignUp({ method: "oauth" });
    // Aplicar o código de convite
    useInviteCode.mutate({ inviteCode: refCode, newUserId: me.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);
}
