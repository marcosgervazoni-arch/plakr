/**
 * Helper para interpolação de templates de notificação automática.
 * Busca o template personalizado do banco e substitui as variáveis {{var}} pelos valores reais.
 */
import { getDb } from "./db";

type TemplateType = "game_reminder" | "result_available" | "ranking_update";

export interface TemplateVars {
  userName?: string;
  teamA?: string;
  teamB?: string;
  matchDate?: string;
  minutesUntilGame?: string | number;
  poolName?: string;
  venue?: string;
  scoreA?: string | number;
  scoreB?: string | number;
  userPoints?: string | number;
  betScoreA?: string | number;
  betScoreB?: string | number;
  position?: string | number;
  totalPoints?: string | number;
  positionChange?: string;
  totalMembers?: string | number;
}

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = (vars as Record<string, unknown>)[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

export interface ResolvedTemplate {
  title: string;
  body: string;
  pushTitle?: string;
  pushBody?: string;
  emailSubject?: string;
  emailBody?: string;
  enabled: boolean;
}

/**
 * Resolve um template de notificação automática com as variáveis fornecidas.
 * Se o template não existir no banco, retorna os valores padrão fornecidos.
 */
export async function resolveNotificationTemplate(
  type: TemplateType,
  vars: TemplateVars,
  defaults: { title: string; body: string }
): Promise<ResolvedTemplate> {
  try {
    const db = await getDb();
    if (!db) return { ...defaults, enabled: true };

    const { notificationTemplates } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.type, type))
      .limit(1);

    const tmpl = rows[0];
    if (!tmpl) return { ...defaults, enabled: true };

    return {
      enabled: tmpl.enabled,
      title: interpolate(tmpl.titleTemplate, vars),
      body: interpolate(tmpl.bodyTemplate, vars),
      pushTitle: tmpl.pushTitleTemplate ? interpolate(tmpl.pushTitleTemplate, vars) : undefined,
      pushBody: tmpl.pushBodyTemplate ? interpolate(tmpl.pushBodyTemplate, vars) : undefined,
      emailSubject: tmpl.emailSubjectTemplate ? interpolate(tmpl.emailSubjectTemplate, vars) : undefined,
      emailBody: tmpl.emailBodyTemplate ? interpolate(tmpl.emailBodyTemplate, vars) : undefined,
    };
  } catch {
    return { ...defaults, enabled: true };
  }
}
