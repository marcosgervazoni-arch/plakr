/**
 * Open Graph SSR — /join/:token
 *
 * Bots de redes sociais (WhatsApp, Telegram, Facebook, Twitter/X, Slack, Discord)
 * identificam-se por User-Agent. Quando detectados, retornamos um HTML mínimo
 * com meta tags OG dinâmicas baseadas nos dados do bolão.
 * Usuários reais passam adiante para o React SPA.
 */
import type { Express } from "express";
import { getPoolByInviteToken, getPoolBySlugOrRedirect, getTournamentById } from "./db";

/** User-Agents conhecidos de crawlers/bots de preview */
const BOT_UA_PATTERN =
  /whatsapp|telegram|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|googlebot|bingbot|applebot|curl|python-requests|go-http-client/i;

function isBot(userAgent: string): boolean {
  return BOT_UA_PATTERN.test(userAgent);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOgHtml({
  title,
  description,
  imageUrl,
  pageUrl,
}: {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
}): string {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(imageUrl);
  const u = escapeHtml(pageUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${i}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:site_name" content="Plakr!" />
  <meta property="og:locale" content="pt_BR" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${i}" />

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${u}" />
</head>
<body>
  <p>Redirecionando para o bolão… <a href="${u}">Clique aqui</a></p>
</body>
</html>`;
}

/**
 * Registra rotas /api/og/pool/:slug e /api/og/join/:token
 * Essas rotas funcionam em produção pois o proxy da Manus roteia /api/* para o Express.
 * O index.html usa <meta http-equiv="refresh"> para redirecionar bots para essas rotas.
 */
export function registerApiOgRoutes(app: Express): void {
  // ── /api/og/pool/:slug — metatags dinâmicas do bolão via /api/ ─────────────
  app.get("/api/og/pool/:slug", async (req, res) => {
    const { slug } = req.params;
    const origin = `${req.protocol}://${req.headers.host}`;
    const pageUrl = `${origin}/pool/${slug}`;
    const fallbackImage = `${origin}/og-default.png`;

    try {
      const result = await getPoolBySlugOrRedirect(slug);
      if (!result) {
        const html = buildOgHtml({
          title: "Bolão — Plakr!",
          description: "Participe deste bolão de apostas esportivas!",
          imageUrl: fallbackImage,
          pageUrl,
        });
        return res.status(200).set("Content-Type", "text/html").end(html);
      }

      const pool = result.pool;
      const canonicalUrl = result.redirectedTo
        ? `${origin}/pool/${result.redirectedTo}`
        : pageUrl;

      let tournamentName = "";
      try {
        const tournament = await getTournamentById(pool.tournamentId);
        tournamentName = tournament?.name ?? "";
      } catch { /* não crítico */ }

      const title = `${pool.name} — Plakr!`;
      const description = pool.description
        ? pool.description
        : tournamentName
        ? `Bolão de ${tournamentName}. Entre agora e faça seus palpites!`
        : "Participe deste bolão de apostas esportivas. Entre agora e faça seus palpites!";
      const imageUrl = pool.logoUrl ?? fallbackImage;

      const html = buildOgHtml({ title, description, imageUrl, pageUrl: canonicalUrl });
      return res.status(200).set("Content-Type", "text/html").end(html);
    } catch {
      const html = buildOgHtml({
        title: "Bolão — Plakr!",
        description: "Participe deste bolão de apostas esportivas!",
        imageUrl: fallbackImage,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    }
  });

  // ── /api/og/join/:token — metatags dinâmicas do convite via /api/ ──────────
  app.get("/api/og/join/:token", async (req, res) => {
    const { token } = req.params;
    const origin = `${req.protocol}://${req.headers.host}`;
    const pageUrl = `${origin}/join/${token}`;
    const fallbackImage = `${origin}/og-default.png`;

    try {
      const pool = await getPoolByInviteToken(token);

      if (!pool || pool.status !== "active") {
        const html = buildOgHtml({
          title: "Convite para Bolão — Plakr!",
          description: "Você foi convidado para participar de um bolão de apostas esportivas!",
          imageUrl: fallbackImage,
          pageUrl,
        });
        return res.status(200).set("Content-Type", "text/html").end(html);
      }

      let tournamentName = "";
      try {
        const tournament = await getTournamentById(pool.tournamentId);
        tournamentName = tournament?.name ?? "";
      } catch { /* não crítico */ }

      const title = `${pool.name} — Plakr!`;
      const description = pool.description
        ? pool.description
        : tournamentName
        ? `Bolão de ${tournamentName}. Entre agora e faça seus palpites!`
        : "Você foi convidado para um bolão de apostas esportivas. Entre agora e faça seus palpites!";
      const imageUrl = pool.logoUrl ?? fallbackImage;

      const html = buildOgHtml({ title, description, imageUrl, pageUrl });
      return res.status(200).set("Content-Type", "text/html").end(html);
    } catch {
      const html = buildOgHtml({
        title: "Convite para Bolão — Plakr!",
        description: "Você foi convidado para participar de um bolão de apostas esportivas!",
        imageUrl: fallbackImage,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    }
  });
}

/**
 * Landing page OG SSR — rota raiz (/)
 * Quando um bot de rede social acessa a raiz, retorna HTML com a ogImageUrl
 * configurada pelo Super Admin. Usuários reais passam para o SPA normalmente.
 */
export function registerLandingOgRoute(app: Express): void {
  app.get("/", async (req, res, next) => {
    const ua = req.headers["user-agent"] ?? "";
    if (!isBot(ua)) return next();

    const origin = `${req.protocol}://${req.headers.host}`;
    const pageUrl = `${origin}/`;
    const fallbackImage = `${origin}/og-image.png`;

    try {
      const db = await (await import("./db")).getDb();
      let ogImageUrl = fallbackImage;
      if (db) {
        const { landingPageConfig } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [cfg] = await db.select({ ogImageUrl: landingPageConfig.ogImageUrl })
          .from(landingPageConfig).where(eq(landingPageConfig.id, 1)).limit(1);
        if (cfg?.ogImageUrl) ogImageUrl = cfg.ogImageUrl;
      }

      const html = buildOgHtml({
        title: "Plakr! — Faça seu bolão da Copa do Mundo 2026 com a galera",
        description: "Crie bolões para qualquer campeonato, convide seus amigos e acompanhe tudo em tempo real. Simples, divertido e gratuito.",
        imageUrl: ogImageUrl,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    } catch {
      const html = buildOgHtml({
        title: "Plakr! — Faça seu bolão da Copa do Mundo 2026 com a galera",
        description: "Crie bolões para qualquer campeonato, convide seus amigos e acompanhe tudo em tempo real. Simples, divertido e gratuito.",
        imageUrl: fallbackImage,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    }
  });
}

export function registerOgRoutes(app: Express): void {
  // ── /pool/:slug — metatags dinâmicas do bolão ──────────────────────────────
  app.get("/pool/:slug", async (req, res, next) => {
    const ua = req.headers["user-agent"] ?? "";
    if (!isBot(ua)) return next();

    const { slug } = req.params;
    const origin = `${req.protocol}://${req.headers.host}`;
    const pageUrl = `${origin}/pool/${slug}`;
    const fallbackImage = `${origin}/og-default.png`;

    try {
      const result = await getPoolBySlugOrRedirect(slug);
      if (!result) return next(); // bolão não encontrado: deixa o SPA tratar

      const pool = result.pool;
      // Se o slug foi redirecionado, atualizar a URL canônica
      const canonicalUrl = result.redirectedTo
        ? `${origin}/pool/${result.redirectedTo}`
        : pageUrl;

      let tournamentName = "";
      try {
        const tournament = await getTournamentById(pool.tournamentId);
        tournamentName = tournament?.name ?? "";
      } catch { /* não crítico */ }

      const title = `${pool.name} — Plakr!`;
      const description = pool.description
        ? pool.description
        : tournamentName
        ? `Bolão de ${tournamentName}. Entre agora e faça seus palpites!`
        : "Participe deste bolão de apostas esportivas. Entre agora e faça seus palpites!";
      const imageUrl = pool.logoUrl ?? fallbackImage;

      const html = buildOgHtml({ title, description, imageUrl, pageUrl: canonicalUrl });
      return res.status(200).set("Content-Type", "text/html").end(html);
    } catch {
      const html = buildOgHtml({
        title: "Bolão — Plakr!",
        description: "Participe deste bolão de apostas esportivas!",
        imageUrl: fallbackImage,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    }
  });

  // ── /join/:token — metatags dinâmicas do convite ──────────────────────────
  app.get("/join/:token", async (req, res, next) => {
    const ua = req.headers["user-agent"] ?? "";

    // Usuários reais: deixa o Vite/static servir o SPA normalmente
    if (!isBot(ua)) {
      return next();
    }

    const { token } = req.params;
    const origin = `${req.protocol}://${req.headers.host}`;
    const pageUrl = `${origin}/join/${token}`;

    // Fallback genérico caso o token não seja encontrado
    const fallbackImage = `${origin}/og-default.png`;

    try {
      const pool = await getPoolByInviteToken(token);

      if (!pool || pool.status !== "active") {
        const html = buildOgHtml({
          title: "Convite para Bolão — Plakr!",
          description: "Você foi convidado para participar de um bolão de apostas esportivas!",
          imageUrl: fallbackImage,
          pageUrl,
        });
        return res.status(200).set("Content-Type", "text/html").end(html);
      }

      // Buscar nome do campeonato para enriquecer a descrição
      let tournamentName = "";
      try {
        const tournament = await getTournamentById(pool.tournamentId);
        tournamentName = tournament?.name ?? "";
      } catch {
        // não crítico
      }

      const title = `${pool.name} — Plakr!`;
      const description = pool.description
        ? pool.description
        : tournamentName
        ? `Bolão de ${tournamentName}. Entre agora e faça seus palpites!`
        : "Você foi convidado para um bolão de apostas esportivas. Entre agora e faça seus palpites!";

      const imageUrl = pool.logoUrl ?? fallbackImage;

      const html = buildOgHtml({ title, description, imageUrl, pageUrl });
      return res.status(200).set("Content-Type", "text/html").end(html);
    } catch {
      // Em caso de erro de banco, retorna fallback genérico
      const html = buildOgHtml({
        title: "Convite para Bolão — Plakr!",
        description: "Você foi convidado para participar de um bolão de apostas esportivas!",
        imageUrl: fallbackImage,
        pageUrl,
      });
      return res.status(200).set("Content-Type", "text/html").end(html);
    }
  });
}
