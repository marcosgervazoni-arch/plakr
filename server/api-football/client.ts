/**
 * API-Football Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente HTTP robusto para a API-Football (api-sports.io) com:
 *  - Autenticação via chave configurada pelo Super Admin (platform_settings)
 *  - Controle de quota diária (padrão: 100 req/dia no plano free)
 *  - Circuit breaker: abre após 3 falhas consecutivas, fecha após 30 min
 *  - Retry exponencial: até 3 tentativas com backoff 1s → 2s → 4s
 *  - Logs de auditoria em api_sync_log e api_quota_tracker
 */

import { getDb } from "../db";
import { platformSettings, apiQuotaTracker } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const API_BASE = "https://v3.football.api-sports.io";
const CIRCUIT_BREAKER_THRESHOLD = 3;       // falhas consecutivas para abrir o circuit
const CIRCUIT_BREAKER_RESET_MS = 30 * 60 * 1000; // 30 min para tentar fechar
const MAX_RETRIES = 3;

// ─── Tipos da API-Football ────────────────────────────────────────────────────

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
}

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: string[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// ─── Helpers de banco ─────────────────────────────────────────────────────────

async function getSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [settings] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, 1))
    .limit(1);
  return settings;
}

async function getTodayQuota(): Promise<{ used: number; limit: number }> {
  const db = await getDb();
  if (!db) return { used: 0, limit: 7500 };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [row] = await db
    .select()
    .from(apiQuotaTracker)
    .where(eq(apiQuotaTracker.date, today))
    .limit(1);

  const settings = await getSettings();
  const limit = settings?.apiFootballQuotaLimit ?? 7500;

  if (!row) {
    await db.insert(apiQuotaTracker).values({ date: today, requestsUsed: 0, quotaLimit: limit });
    return { used: 0, limit };
  }
  return { used: row.requestsUsed, limit: row.quotaLimit };
}

async function incrementQuota(count: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  // Upsert: cria o registro do dia se não existir, senão incrementa
  await db.execute(
    `INSERT INTO api_quota_tracker (date, requestsUsed, quotaLimit)
     VALUES ('${today}', ${count}, 7500)
     ON DUPLICATE KEY UPDATE requestsUsed = requestsUsed + ${count}`
  );
}

async function openCircuitBreaker(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(platformSettings)
    .set({ apiFootballCircuitOpen: true, apiFootballCircuitOpenAt: new Date() })
    .where(eq(platformSettings.id, 1));
}

async function closeCircuitBreaker(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(platformSettings)
    .set({ apiFootballCircuitOpen: false, apiFootballCircuitOpenAt: null })
    .where(eq(platformSettings.id, 1));
}

// ─── Erro de conta suspensa (não deve abrir circuit breaker) ─────────────────

/**
 * Erro lançado quando a conta na API-Football está suspensa.
 * Diferente de um erro temporário de rede — não deve incrementar o circuit breaker
 * nem ser retentado, pois só será resolvido com ação manual no dashboard.api-football.com.
 */
export class AccountSuspendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountSuspendedError";
  }
}

// ─── Estado em memória do circuit breaker ─────────────────────────────────────

let consecutiveFailures = 0;

// ─── Função principal de requisição ──────────────────────────────────────────

export async function apiFootballRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<ApiFootballResponse<T>> {
  const settings = await getSettings();

  // 1. Verificar se a integração está habilitada
  if (!settings?.apiFootballEnabled) {
    throw new Error("API-Football integration is disabled. Enable it in Admin → Integrations.");
  }

  // 2. Verificar se a chave está configurada
  if (!settings?.apiFootballKey) {
    throw new Error("API-Football key not configured. Set it in Admin → Integrations.");
  }

  // 3. Verificar circuit breaker
  if (settings.apiFootballCircuitOpen) {
    const openedAt = settings.apiFootballCircuitOpenAt;
    if (openedAt && Date.now() - openedAt.getTime() > CIRCUIT_BREAKER_RESET_MS) {
      // Tentar fechar o circuit breaker após o período de reset
      await closeCircuitBreaker();
      consecutiveFailures = 0;
    } else {
      throw new Error(
        "Circuit breaker is OPEN. API-Football requests are temporarily suspended. Will retry in 30 minutes."
      );
    }
  }

  // 4. Verificar quota diária
  const quota = await getTodayQuota();
  if (quota.used >= quota.limit) {
    throw new Error(
      `Daily quota exhausted: ${quota.used}/${quota.limit} requests used today. Resets at midnight UTC.`
    );
  }

  // 5. Construir URL com query params
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  // 6. Executar com retry exponencial
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-apisports-key": settings.apiFootballKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000), // timeout de 15s
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as ApiFootballResponse<T>;

      // Verificar erros retornados pela API
      const errors = data.errors;
      const hasErrors = Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
      if (hasErrors) {
        const errMsg = Array.isArray(errors) ? errors.join(", ") : JSON.stringify(errors);
        // Detectar especificamente erro de conta suspensa — não deve abrir circuit breaker
        // pois é um problema de conta, não de disponibilidade da API
        const isSuspended =
          errMsg.toLowerCase().includes("suspended") ||
          errMsg.toLowerCase().includes("account is suspended");
        if (isSuspended) {
          throw new AccountSuspendedError(
            `Conta API-Football suspensa. Acesse dashboard.api-football.com para regularizar. Detalhe: ${errMsg}`
          );
        }
        throw new Error(`API-Football error: ${errMsg}`);
      }

      // Sucesso: incrementar quota e resetar contador de falhas
      await incrementQuota(1);
      consecutiveFailures = 0;

      // Atualizar timestamp da última sync bem-sucedida
      const dbConn = await getDb();
      if (dbConn) {
        await dbConn
          .update(platformSettings)
          .set({ apiFootballLastSync: new Date() })
          .where(eq(platformSettings.id, 1));
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Não fazer retry em erros de quota, circuit breaker ou conta suspensa
      if (
        lastError.message.includes("quota exhausted") ||
        lastError.message.includes("Circuit breaker") ||
        lastError instanceof AccountSuspendedError
      ) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // Todas as tentativas falharam — incrementar contador do circuit breaker
  // Não abrir circuit breaker por erro de conta suspensa (é problema de conta, não de rede)
  if (!(lastError instanceof AccountSuspendedError)) {
    consecutiveFailures++;
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      await openCircuitBreaker();
      consecutiveFailures = 0;
    }
  }

  throw lastError ?? new Error("Unknown error in API-Football request");
}

// ─── Endpoints de alto nível ──────────────────────────────────────────────────

/**
 * Busca fixtures (jogos) de uma liga/temporada.
 * Pode filtrar por status: NS (não iniciado), FT (encerrado), LIVE, etc.
 */
export async function fetchFixtures(
  leagueId: number,
  season: number,
  options: { status?: string; from?: string; to?: string } = {}
): Promise<ApiFootballFixture[]> {
  const params: Record<string, string | number> = { league: leagueId, season };
  if (options.status) params.status = options.status;
  if (options.from) params.from = options.from;
  if (options.to) params.to = options.to;

  const data = await apiFootballRequest<ApiFootballFixture>("/fixtures", params);
  return data.response;
}

// ─── Interface de Time da API-Football ───────────────────────────────────────

export interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    logo: string;
    national: boolean;
  };
  venue: {
    name: string | null;
    city: string | null;
  };
}

/**
 * Busca os times participantes de uma liga/temporada.
 * Endpoint: /teams?league={leagueId}&season={season}
 * Consome 1 requisição.
 */
export async function fetchTeams(
  leagueId: number,
  season: number
): Promise<ApiFootballTeam[]> {
  const data = await apiFootballRequest<ApiFootballTeam>("/teams", {
    league: leagueId,
    season,
  });
  return data.response;
}

/**
 * Busca o status atual da quota da conta na API-Football.
 * Consome 1 requisição mas retorna os limites reais da conta.
 */
export async function fetchAccountStatus(): Promise<{
  requestsLimit: number;
  requestsRemaining: number;
  plan: string;
}> {
  const data = await apiFootballRequest<{
    requests: { limit: number; current: number };
    subscription: { plan: string };
  }>("/status");

  const resp = data.response[0] as any;
  return {
    requestsLimit: resp?.requests?.limit ?? 7500,
    requestsRemaining: (resp?.requests?.limit ?? 7500) - (resp?.requests?.current ?? 0),
    plan: resp?.subscription?.plan ?? "Free",
  };
}

// ── Tipos para Inteligência Esportiva ────────────────────────────────────────

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string; // "Goal", "Card", "subst", etc.
  detail: string; // "Normal Goal", "Own Goal", "Penalty", "Yellow Card", etc.
}

export interface FixtureStatistic {
  team: { id: number; name: string };
  statistics: Array<{ type: string; value: string | number | null }>;
}

export interface FixturePrediction {
  winner: { id: number | null; name: string | null; comment: string | null } | null;
  win_or_draw: boolean | null;
  under_over: string | null;
  goals: { home: string | null; away: string | null };
  advice: string | null;
  percent: { home: string; draw: string; away: string };
}

/**
 * Busca os eventos de um jogo (gols, cartões, substituições).
 * Endpoint: GET /fixtures/events?fixture={fixtureId}
 * Consome 1 requisição.
 */
export async function fetchFixtureEvents(
  fixtureId: number
): Promise<FixtureEvent[]> {
  const data = await apiFootballRequest<FixtureEvent>("/fixtures/events", {
    fixture: fixtureId,
  });
  return data.response;
}

/**
 * Busca as estatísticas de um jogo finalizado (posse, finalizações, escanteios, cartões).
 * Endpoint: GET /fixtures/statistics?fixture={fixtureId}
 * Consome 1 requisição.
 */
export async function fetchFixtureStatistics(
  fixtureId: number
): Promise<FixtureStatistic[]> {
  const data = await apiFootballRequest<FixtureStatistic>("/fixtures/statistics", {
    fixture: fixtureId,
  });
  return data.response;
}

/**
 * Busca as probabilidades e forma recente de um jogo agendado.
 * Endpoint: GET /predictions?fixture={fixtureId}
 * Consome 1 requisição. Disponível apenas em planos pagos da API-Football.
 */
export async function fetchFixturePredictions(
  fixtureId: number
): Promise<FixturePrediction | null> {
  try {
    const data = await apiFootballRequest<{ predictions: FixturePrediction }>("/predictions", {
      fixture: fixtureId,
    });
    const resp = data.response[0] as any;
    return resp?.predictions ?? null;
  } catch {
    return null; // endpoint pode não estar disponível no plano Free
  }
}
