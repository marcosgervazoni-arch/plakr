/**
 * server/errors.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers centralizados de erro tRPC para o Plakr!
 *
 * Uso:
 *   import { Err } from "../errors";
 *   throw Err.notFound("Bolão");
 *   throw Err.forbidden("Apenas o organizador pode realizar esta ação.");
 *
 * Convenções:
 *   - Mensagens em português, orientadas ao usuário final.
 *   - Nunca expor detalhes internos (stack traces, SQL) nas mensagens.
 *   - Usar INTERNAL_SERVER_ERROR apenas para falhas inesperadas do sistema.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TRPCError } from "@trpc/server";

// ─── Tipos de código suportados ───────────────────────────────────────────────
type TRPCCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "TOO_MANY_REQUESTS"
  | "PRECONDITION_FAILED";

// ─── Factory base ─────────────────────────────────────────────────────────────
function err(code: TRPCCode, message: string, cause?: unknown): TRPCError {
  return new TRPCError({ code, message, cause: cause as Error | undefined });
}

// ─── Helpers semânticos ───────────────────────────────────────────────────────
export const Err = {
  /** Recurso não encontrado. Ex: Err.notFound("Bolão") → "Bolão não encontrado." */
  notFound: (resource: string) =>
    err("NOT_FOUND", `${resource} não encontrado.`),

  /** Ação proibida para o usuário atual. */
  forbidden: (message = "Você não tem permissão para realizar esta ação.") =>
    err("FORBIDDEN", message),

  /** Apenas administradores. */
  adminOnly: () =>
    err("FORBIDDEN", "Acesso restrito a administradores."),

  /** Apenas o organizador do bolão. */
  organizerOnly: (action = "realizar esta ação") =>
    err("FORBIDDEN", `Apenas o organizador pode ${action}.`),

  /** Recurso exclusivo do Plano Pro. */
  proOnly: (feature: string) =>
    err("FORBIDDEN", `${feature} é exclusivo do Plano Pro.`),

  /** Dados de entrada inválidos. */
  badRequest: (message: string) =>
    err("BAD_REQUEST", message),

  /** Usuário não autenticado. */
  unauthorized: () =>
    err("UNAUTHORIZED", "Você precisa estar autenticado para continuar."),

  /** Conflito de estado (ex: já existe, já está ativo). */
  conflict: (message: string) =>
    err("CONFLICT", message),

  /** Pré-condição não atendida (ex: bolão já encerrado). */
  precondition: (message: string) =>
    err("PRECONDITION_FAILED", message),

  /** Limite de taxa excedido. */
  rateLimit: (message = "Muitas requisições. Tente novamente em breve.") =>
    err("TOO_MANY_REQUESTS", message),

  /** Falha interna inesperada — nunca expor detalhes ao usuário. */
  internal: (cause?: unknown) =>
    err("INTERNAL_SERVER_ERROR", "Ocorreu um erro interno. Tente novamente.", cause),

  /** Banco de dados indisponível. */
  dbUnavailable: () =>
    err("INTERNAL_SERVER_ERROR", "Banco de dados indisponível. Tente novamente."),
} as const;

// ─── Helpers de domínio específicos ──────────────────────────────────────────

/** Erros relacionados a bolões */
export const PoolErr = {
  notFound: () => Err.notFound("Bolão"),
  notActive: () => Err.precondition("Este bolão não está mais ativo."),
  notPublic: () => Err.forbidden("Este bolão não é público."),
  alreadyPro: () => Err.conflict("Este bolão já possui o Plano Pro."),
  memberNotFound: () => Err.notFound("Membro"),
  gameNotFound: () => Err.notFound("Jogo"),
  gameNotInPool: () => Err.badRequest("Este jogo não pertence ao torneio deste bolão."),
  gameStarted: () => Err.precondition("Jogo já iniciado ou encerrado."),
  invalidInvite: () => Err.badRequest("Link de convite inválido ou expirado."),
  organizerOnly: (action?: string) => Err.organizerOnly(action),
  proOnly: (feature: string) => Err.proOnly(feature),
} as const;

/** Erros relacionados a campeonatos */
export const TournamentErr = {
  notFound: () => Err.notFound("Campeonato"),
  notOwned: () => Err.forbidden("Apenas o criador ou um administrador pode excluir este campeonato."),
  proOnly: (feature: string) => Err.proOnly(feature),
} as const;

/** Erros relacionados a usuários */
export const UserErr = {
  notFound: () => Err.notFound("Usuário"),
  blocked: () => Err.forbidden("Sua conta foi suspensa. Entre em contato com o suporte."),
} as const;
