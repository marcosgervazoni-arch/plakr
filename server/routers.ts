/**
 * Plakr! — Router Principal (Composição)
 * [T1] Todos os routers de domínio foram modularizados em server/routers/*.ts
 * Este arquivo apenas compõe o appRouter final.
 */
import { systemRouter } from "./_core/systemRouter";
import { badgesRouter } from "./routers/badges";
import { adminDashboardRouter } from "./routers/adminDashboard";
import { adsRouter } from "./routers/ads";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { tournamentsRouter } from "./routers/tournaments";
import { poolsRouter } from "./routers/pools";
import { betsRouter } from "./routers/bets";
import { rankingsRouter } from "./routers/rankings";
import { notificationsRouter } from "./routers/notifications";
import { platformRouter } from "./routers/platform";
import { stripeRouter } from "./routers/stripe";
import { notificationTemplatesRouter } from "./routers/notificationTemplates";
import { landingPageRouter } from "./routers/landingPage";
import { router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  badges: badgesRouter,
  adminDashboard: adminDashboardRouter,
  auth: authRouter,
  users: usersRouter,
  tournaments: tournamentsRouter,
  pools: poolsRouter,
  bets: betsRouter,
  rankings: rankingsRouter,
  notifications: notificationsRouter,
  platform: platformRouter,
  stripe: stripeRouter,
  notificationTemplates: notificationTemplatesRouter,
  ads: adsRouter,
  landingPage: landingPageRouter,
});

export type AppRouter = typeof appRouter;
