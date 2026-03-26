/**
 * Plakr! — Router de Bolões (Fachada)
 * [T1] Modularizado em 6 sub-routers por domínio:
 *   - pools-core.ts        : create, getBySlug, listPublic, previewByToken, joinByToken, joinPublic,
 *                            update, delete, closePool, concludePool, getBracket
 *   - pools-members.ts     : getMembers, removeMember, transferOwnership, leave,
 *                            getMemberProfile, getAccessStats, regenerateAccessCode
 *   - pools-games.ts       : getGames, setGameResult, updateScoringRules, getScoringRulesPublic
 *   - pools-communication.ts : sendInviteEmail, broadcastToMembers
 *   - pools-admin.ts       : adminList, adminUpdatePool, adminCreate
 *   - pools-retrospective.ts : getRetrospective, adminGetRetrospectives, adminReprocessRetrospective,
 *                              getRetrospectiveConfig, updateRetrospectiveConfig, uploadRetrospectiveTemplate
 *
 * Este arquivo é a fachada pública — importa e mescla todos os sub-routers
 * para manter a interface `trpc.pools.*` inalterada no restante da aplicação.
 */
import { mergeRouters } from "../_core/trpc";
import { poolsCoreRouter } from "./pools-core";
import { poolsMembersRouter } from "./pools-members";
import { poolsGamesRouter } from "./pools-games";
import { poolsCommunicationRouter } from "./pools-communication";
import { poolsAdminRouter } from "./pools-admin";
import { poolsRetrospectiveRouter } from "./pools-retrospective";

export const poolsRouter = mergeRouters(
  poolsCoreRouter,
  poolsMembersRouter,
  poolsGamesRouter,
  poolsCommunicationRouter,
  poolsAdminRouter,
  poolsRetrospectiveRouter,
);
