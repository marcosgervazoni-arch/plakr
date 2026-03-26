/**
 * Hook para gerenciar Web Push Notifications no Plakr!.
 *
 * Fluxo:
 * 1. Verifica se o browser suporta Push API
 * 2. Registra o Service Worker em /sw.js
 * 3. Solicita permissão ao usuário
 * 4. Cria a PushSubscription usando a VAPID public key do servidor
 * 5. Envia a subscription para o servidor via tRPC
 */
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";

// Converte base64url para Uint8Array (necessário para applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushNotificationsResult {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  pushEnabled: boolean; // configurado pelo admin
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const { data: vapidConfig } = trpc.notifications.getVapidPublicKey.useQuery();
  const subscribeMutation = trpc.notifications.subscribePush.useMutation();
  const unsubscribeMutation = trpc.notifications.unsubscribePush.useMutation();

  const pushEnabled = vapidConfig?.pushEnabled ?? false;
  const vapidPublicKey = vapidConfig?.publicKey ?? null;

  // Verificar suporte e estado atual
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Registrar Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        setSwRegistration(reg);
        // Verificar se já existe subscription
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch((err) => {
        console.warn("[Push] SW registration failed:", err);
      });

    // Escutar mensagens do SW (subscription renovada)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && event.data.subscription) {
        const sub = event.data.subscription;
        subscribeMutation.mutate({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh ?? "",
          auth: sub.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const subscribe = useCallback(async () => {
    if (!swRegistration || !vapidPublicKey || !pushEnabled) return;
    setIsLoading(true);
    try {
      // Solicitar permissão
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return;

      // Criar subscription
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: subJson.endpoint!,
        p256dh: (subJson.keys as Record<string, string>)?.p256dh ?? "",
        auth: (subJson.keys as Record<string, string>)?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, vapidPublicKey, pushEnabled, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return;
    setIsLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, unsubscribeMutation]);

  return {
    permission,
    isSubscribed,
    isLoading,
    pushEnabled,
    subscribe,
    unsubscribe,
  };
}
