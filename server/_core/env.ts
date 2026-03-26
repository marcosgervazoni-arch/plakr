import { z } from "zod";

/**
 * [S11] Validação de variáveis de ambiente críticas no startup.
 * Se qualquer variável obrigatória estiver ausente, o servidor encerra com exit(1)
 * em vez de subir silenciosamente com segurança comprometida.
 */
const envSchema = z.object({
  // Auth & session
  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter pelo menos 16 caracteres"),
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID é obrigatório para OAuth"),
  OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL deve ser uma URL válida"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),

  // Manus Forge API
  BUILT_IN_FORGE_API_URL: z.string().url("BUILT_IN_FORGE_API_URL deve ser uma URL válida"),
  BUILT_IN_FORGE_API_KEY: z.string().min(1, "BUILT_IN_FORGE_API_KEY é obrigatório"),

  // Optional — têm fallbacks seguros
  OWNER_OPEN_ID: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n[ENV] ❌ Variáveis de ambiente inválidas ou ausentes:");
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nO servidor não pode iniciar com configuração incompleta.\n");
  process.exit(1);
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Base URL used in e-mails and invite links.
  // Update APP_BASE_URL in Settings → Secrets when you configure a custom domain.
  // Falls back to the default Manus domain until then.
  appBaseUrl: process.env.APP_BASE_URL ?? "https://plakr.manus.space",
};
