/**
 * Plakr! — Router de Configuração da Landing Page
 * Permite ao Super Admin controlar seções e conteúdo da página de vendas sem deploy.
 */
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

// Schema de validação para atualização completa da config
const landingPageConfigSchema = z.object({
  heroHeadline: z.string().max(255).optional(),
  heroSubheadline: z.string().nullable().optional(),
  heroBadgeText: z.string().max(128).optional(),
  heroBadgeEnabled: z.boolean().optional(),
  heroCountdownEnabled: z.boolean().optional(),
  heroCountdownDate: z.string().max(32).optional(),
  heroCtaPrimaryText: z.string().max(64).optional(),
  heroCtaSecondaryText: z.string().max(64).optional(),
  heroCtaSecondaryEnabled: z.boolean().optional(),
  sectionCredibilityEnabled: z.boolean().optional(),
  sectionHowItWorksEnabled: z.boolean().optional(),
  sectionDifferentialEnabled: z.boolean().optional(),
  sectionFeaturesEnabled: z.boolean().optional(),
  sectionPlansEnabled: z.boolean().optional(),
  sectionFaqEnabled: z.boolean().optional(),
  sectionCtaFinalEnabled: z.boolean().optional(),
  differentialHeadline: z.string().max(255).optional(),
  differentialBody: z.string().nullable().optional(),
  ctaFinalHeadline: z.string().max(255).optional(),
  ctaFinalPrimaryText: z.string().max(64).optional(),
  ctaFinalSecondaryText: z.string().max(64).optional(),
  ctaFinalSecondaryEnabled: z.boolean().optional(),
  // SEO & Open Graph
  ogImageUrl: z.string().url().nullable().optional(),
  ogImageKey: z.string().nullable().optional(),
  // Custom code per section (overrides default content when set)
  heroCustomCode: z.string().nullable().optional(),
  credibilityCustomCode: z.string().nullable().optional(),
  howItWorksCustomCode: z.string().nullable().optional(),
  differentialCustomCode: z.string().nullable().optional(),
  featuresCustomCode: z.string().nullable().optional(),
  plansCustomCode: z.string().nullable().optional(),
  faqCustomCode: z.string().nullable().optional(),
  ctaFinalCustomCode: z.string().nullable().optional(),
});

export const landingPageRouter = router({
  // Retorna a config atual da landing page — público para a Home renderizar
  getConfig: publicProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return null;
    const { landingPageConfig } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const [config] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.id, 1)).limit(1);
    return config ?? null;
  }),

  // Atualiza qualquer campo da config — apenas Super Admin
  updateConfig: adminProcedure
    .input(landingPageConfigSchema)
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB unavailable");
      const { landingPageConfig } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Garantir que a row existe (upsert)
      const [existing] = await db.select({ id: landingPageConfig.id }).from(landingPageConfig).where(eq(landingPageConfig.id, 1)).limit(1);
      if (!existing) {
        await db.insert(landingPageConfig).values({ id: 1, ...input });
      } else {
        await db.update(landingPageConfig).set(input).where(eq(landingPageConfig.id, 1));
      }
      const [updated] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.id, 1)).limit(1);
      return updated;
    }),

  // Toggle rápido de uma seção específica — apenas Super Admin
  toggleSection: adminProcedure
    .input(z.object({
      section: z.enum([
        "sectionCredibilityEnabled",
        "sectionHowItWorksEnabled",
        "sectionDifferentialEnabled",
        "sectionFeaturesEnabled",
        "sectionPlansEnabled",
        "sectionFaqEnabled",
        "sectionCtaFinalEnabled",
        "heroBadgeEnabled",
        "heroCountdownEnabled",
        "heroCtaSecondaryEnabled",
        "ctaFinalSecondaryEnabled",
      ]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new Error("DB unavailable");
      const { landingPageConfig } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(landingPageConfig).set({ [input.section]: input.enabled }).where(eq(landingPageConfig.id, 1));
      return { success: true };
    }),
});
