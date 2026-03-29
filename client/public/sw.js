/**
 * Plakr! — Service Worker para Web Push
 * Gerencia notificações push recebidas do servidor VAPID.
 */

const CACHE_NAME = "plakr-sw-v1";

// ─── Push recebido ────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Plakr!", body: event.data.text() };
  }

  const title = payload.title || "Plakr!";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || "plakr-notif",
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Clique na notificação ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focar aba já aberta se possível
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Abrir nova aba
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ─── Subscription expirada ────────────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSubscription) => {
        // Notificar o app para re-registrar a subscription
        return clients.matchAll({ type: "window" }).then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              subscription: newSubscription.toJSON(),
            });
          }
        });
      })
      .catch(() => {
        // Subscription não pôde ser renovada — o usuário precisará re-autorizar
        console.warn("[SW] Could not renew push subscription");
      })
  );
});

// ─── Instalação / ativação ────────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  // Limpar caches antigos para forçar atualização dos assets
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});
