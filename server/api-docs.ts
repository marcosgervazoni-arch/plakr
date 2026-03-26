/**
 * Plakr! — Documentação OpenAPI 3.1
 * Rota: GET /api/docs
 *
 * Documenta as 36 procedures do router de bolões (pools.*) e as principais
 * procedures dos demais routers. Serve como contrato vivo da API tRPC.
 *
 * Nota: A API usa tRPC sobre HTTP. Todas as queries são GET /api/trpc/<procedure>
 * e todas as mutations são POST /api/trpc/<procedure>.
 */
import type { Request, Response, NextFunction } from "express";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { sdk } from "./_core/sdk";
import { getUserByOpenId } from "./db";

/**
 * Middleware de autenticação admin para /api/docs.
 * Rejeita qualquer acesso que não seja de um usuário com role === 'admin'.
 */
async function requireAdminForDocs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Acesso restrito a administradores." });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Autenticação necessária para acessar a documentação da API." });
  }
}

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Plakr! API",
    version: "1.0.0",
    description: `
## Plakr! — Plataforma Multi-Tenant de Bolões Esportivos

API tRPC servida em \`/api/trpc\`. Todas as **queries** são requisições \`GET\`
e todas as **mutations** são requisições \`POST\`.

### Autenticação
A autenticação é feita via cookie de sessão (\`session\`) emitido pelo fluxo
OAuth em \`/api/oauth/callback\`. Inclua o cookie em todas as requisições.

### Convenções de Erro
Todos os erros seguem o contrato padronizado do \`server/errors.ts\`:

| Código HTTP | tRPC Code | Significado |
|---|---|---|
| 400 | BAD_REQUEST | Dados inválidos ou regra de negócio violada |
| 401 | UNAUTHORIZED | Usuário não autenticado |
| 403 | FORBIDDEN | Permissão insuficiente |
| 404 | NOT_FOUND | Recurso não encontrado |
| 409 | CONFLICT | Conflito de estado |
| 412 | PRECONDITION_FAILED | Pré-condição não atendida |
| 429 | TOO_MANY_REQUESTS | Rate limit excedido |
| 500 | INTERNAL_SERVER_ERROR | Erro interno inesperado |

### Planos
- **free**: Até 2 bolões ativos, até 50 participantes por bolão.
- **pro**: Bolões ilimitados, participantes ilimitados, regras customizadas,
  comunicação com membros, registro manual de resultados.
    `,
    contact: {
      name: "Plakr! Support",
      url: "https://plakr.manus.space",
    },
  },
  servers: [
    {
      url: "/api/trpc",
      description: "tRPC endpoint (produção e desenvolvimento)",
    },
  ],
  tags: [
    { name: "pools.core", description: "Ciclo de vida dos bolões: criar, buscar, entrar, encerrar" },
    { name: "pools.members", description: "Gestão de membros: listar, remover, transferir, sair" },
    { name: "pools.games", description: "Jogos e regras de pontuação" },
    { name: "pools.communication", description: "Comunicação com membros (Plano Pro)" },
    { name: "pools.admin", description: "Operações administrativas (role: admin)" },
    { name: "pools.retrospective", description: "Retrospectivas estilo Wrapped ao concluir bolão" },
    { name: "bets", description: "Palpites dos participantes" },
    { name: "tournaments", description: "Campeonatos e fases" },
    { name: "users", description: "Perfil e configurações do usuário" },
    { name: "notifications", description: "Notificações in-app" },
    { name: "badges", description: "Conquistas e badges" },
    { name: "auth", description: "Autenticação e sessão" },
  ],
  paths: {
    // ── pools.core ────────────────────────────────────────────────────────────
    "/pools.create": {
      post: {
        tags: ["pools.core"],
        summary: "Criar bolão",
        description: "Cria um novo bolão. Usuários do plano free têm limite de 2 bolões ativos.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "tournamentId"],
                properties: {
                  name: { type: "string", minLength: 3, maxLength: 100, example: "Bolão da Copa" },
                  tournamentId: { type: "integer", example: 1 },
                  accessType: { type: "string", enum: ["public", "private_link"], default: "private_link" },
                  invitePermission: { type: "string", enum: ["organizer_only", "all_members"], default: "organizer_only" },
                  description: { type: "string", example: "Bolão da galera do trabalho" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Bolão criado com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    poolId: { type: "integer" },
                    slug: { type: "string", example: "bolao-da-copa-abc123" },
                    inviteToken: { type: "string", example: "xK9mN2pQ..." },
                  },
                },
              },
            },
          },
          "403": { description: "Limite de bolões do plano free atingido" },
        },
      },
    },
    "/pools.getBySlug": {
      get: {
        tags: ["pools.core"],
        summary: "Buscar bolão por slug",
        description: "Retorna dados completos do bolão incluindo torneio, jogos, regras e papel do usuário.",
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "object", properties: { slug: { type: "string" } } } },
        ],
        responses: {
          "200": { description: "Dados do bolão" },
          "403": { description: "Usuário não é membro do bolão" },
          "404": { description: "Bolão não encontrado" },
        },
      },
    },
    "/pools.listPublic": {
      get: {
        tags: ["pools.core"],
        summary: "Listar bolões públicos",
        description: "Lista bolões com accessType=public e status=active. Suporta busca por nome e filtro por torneio.",
        parameters: [
          {
            name: "input",
            in: "query",
            schema: {
              type: "object",
              properties: {
                search: { type: "string" },
                tournamentId: { type: "integer" },
                limit: { type: "integer", default: 20 },
                offset: { type: "integer", default: 0 },
              },
            },
          },
        ],
        responses: {
          "200": {
            description: "Lista de bolões públicos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pools: { type: "array", items: { type: "object" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.previewByToken": {
      get: {
        tags: ["pools.core"],
        summary: "Preview de bolão por token de convite",
        description: "Retorna informações básicas do bolão para exibir antes de entrar. Não requer ser membro.",
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "object", properties: { token: { type: "string" } } } },
        ],
        responses: {
          "200": { description: "Preview do bolão ou null se token inválido/expirado" },
        },
      },
    },
    "/pools.joinByToken": {
      post: {
        tags: ["pools.core"],
        summary: "Entrar no bolão via token de convite",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Entrou no bolão ou já era membro",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    poolId: { type: "integer" },
                    slug: { type: "string" },
                    alreadyMember: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Token inválido" },
          "403": { description: "Limite de participantes atingido" },
        },
      },
    },
    "/pools.joinPublic": {
      post: {
        tags: ["pools.core"],
        summary: "Entrar em bolão público",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slug"],
                properties: { slug: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Entrou no bolão ou já era membro" },
          "403": { description: "Bolão não é público ou limite atingido" },
        },
      },
    },
    "/pools.update": {
      post: {
        tags: ["pools.core"],
        summary: "Atualizar bolão",
        description: "Atualiza nome, descrição, logo, tipo de acesso ou torneio. Requer role organizer.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId"],
                properties: {
                  poolId: { type: "integer" },
                  name: { type: "string" },
                  description: { type: "string" },
                  logoUrl: { type: "string" },
                  accessType: { type: "string", enum: ["public", "private_link"] },
                  invitePermission: { type: "string", enum: ["organizer_only", "all_members"] },
                  tournamentId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Bolão atualizado" },
          "403": { description: "Apenas o organizador pode atualizar" },
        },
      },
    },
    "/pools.delete": {
      post: {
        tags: ["pools.core"],
        summary: "Excluir bolão",
        description: "Marca o bolão como deleted e notifica todos os membros.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": { description: "Bolão excluído" },
          "403": { description: "Apenas o organizador ou admin pode excluir" },
        },
      },
    },
    "/pools.closePool": {
      post: {
        tags: ["pools.core"],
        summary: "Encerrar bolão",
        description: "Encerra o bolão, salva posições finais e notifica membros com medalhas.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Bolão encerrado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    top3: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.concludePool": {
      post: {
        tags: ["pools.core"],
        summary: "Confirmar encerramento (awaiting_conclusion → concluded)",
        description: "Confirma o encerramento do bolão quando está em status awaiting_conclusion. Gera retrospectivas para todos os membros.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": { description: "Bolão concluído, retrospectivas geradas" },
          "412": { description: "Bolão não está em awaiting_conclusion" },
        },
      },
    },
    "/pools.getBracket": {
      get: {
        tags: ["pools.core"],
        summary: "Buscar bracket/fases do torneio",
        description: "Retorna as fases e jogos do torneio associado ao bolão, organizados por fase.",
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "object", properties: { poolId: { type: "integer" } } } },
        ],
        responses: {
          "200": { description: "Array de fases com seus jogos" },
        },
      },
    },
    // ── pools.members ─────────────────────────────────────────────────────────
    "/pools.getMembers": {
      get: {
        tags: ["pools.members"],
        summary: "Listar membros do bolão",
        description: "Retorna membros com paginação cursor-based. Enriquece com lastBetAt e isInactive (sem apostas nos últimos 3 jogos).",
        parameters: [
          {
            name: "input",
            in: "query",
            schema: {
              type: "object",
              properties: {
                poolId: { type: "integer" },
                limit: { type: "integer", default: 100, maximum: 200 },
                cursor: { type: "integer", description: "userId do último membro retornado" },
              },
            },
          },
        ],
        responses: {
          "200": {
            description: "Lista paginada de membros",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array" },
                    nextCursor: { type: "integer" },
                    hasMore: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.removeMember": {
      post: {
        tags: ["pools.members"],
        summary: "Remover membro do bolão",
        description: "Remove um membro. Se for o organizador, transfere automaticamente para o membro mais antigo. Suporta anonimização (admin only).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "userId"],
                properties: {
                  poolId: { type: "integer" },
                  userId: { type: "integer" },
                  anonymize: { type: "boolean", default: false, description: "Admin only: anonimizar dados do usuário" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Membro removido" },
          "403": { description: "Apenas organizador ou admin" },
          "404": { description: "Membro não encontrado" },
        },
      },
    },
    "/pools.transferOwnership": {
      post: {
        tags: ["pools.members"],
        summary: "Transferir propriedade do bolão",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "newOwnerId"],
                properties: {
                  poolId: { type: "integer" },
                  newOwnerId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Propriedade transferida" },
          "403": { description: "Apenas o organizador pode transferir. Usuário banido não pode receber." },
        },
      },
    },
    "/pools.leave": {
      post: {
        tags: ["pools.members"],
        summary: "Sair do bolão voluntariamente",
        description: "Participante sai do bolão. O organizador não pode sair — deve transferir a propriedade primeiro.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": { description: "Saiu do bolão" },
          "403": { description: "Organizador não pode sair diretamente" },
        },
      },
    },
    "/pools.getMemberProfile": {
      get: {
        tags: ["pools.members"],
        summary: "Perfil detalhado de um membro no bolão",
        description: "Retorna estatísticas, histórico de pontos, apostas recentes e badges do membro.",
        parameters: [
          {
            name: "input",
            in: "query",
            schema: {
              type: "object",
              properties: {
                poolId: { type: "integer" },
                userId: { type: "integer" },
              },
            },
          },
        ],
        responses: {
          "200": { description: "Perfil completo do membro" },
        },
      },
    },
    "/pools.getAccessStats": {
      get: {
        tags: ["pools.members"],
        summary: "Estatísticas de acesso ao bolão",
        description: "Retorna contagem por fonte de entrada (code, link, public, organizer). Plano Pro inclui histórico diário dos últimos 7 dias.",
        parameters: [
          { name: "input", in: "query", schema: { type: "object", properties: { poolId: { type: "integer" } } } },
        ],
        responses: {
          "200": {
            description: "Estatísticas de acesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    bySource: { type: "object", properties: { code: { type: "integer" }, link: { type: "integer" }, public: { type: "integer" }, organizer: { type: "integer" } } },
                    total: { type: "integer" },
                    daily: { type: "array", description: "Apenas Plano Pro" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.regenerateAccessCode": {
      post: {
        tags: ["pools.members"],
        summary: "Regenerar código/token de acesso",
        description: "Gera um novo inviteToken, invalidando o anterior.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": { description: "Novo token gerado", content: { "application/json": { schema: { type: "object", properties: { inviteToken: { type: "string" } } } } } },
        },
      },
    },
    // ── pools.games ───────────────────────────────────────────────────────────
    "/pools.getGames": {
      get: {
        tags: ["pools.games"],
        summary: "Listar jogos do bolão",
        parameters: [
          { name: "input", in: "query", schema: { type: "object", properties: { poolId: { type: "integer" } } } },
        ],
        responses: {
          "200": { description: "Lista de jogos do torneio associado ao bolão" },
        },
      },
    },
    "/pools.setGameResult": {
      post: {
        tags: ["pools.games"],
        summary: "Registrar resultado de jogo (Plano Pro)",
        description: "Organizador registra o resultado manualmente. Recalcula pontuações de todos os apostadores.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "gameId", "scoreA", "scoreB"],
                properties: {
                  poolId: { type: "integer" },
                  gameId: { type: "integer" },
                  scoreA: { type: "integer", minimum: 0, maximum: 99 },
                  scoreB: { type: "integer", minimum: 0, maximum: 99 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Resultado registrado e pontuações recalculadas", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, affectedBets: { type: "integer" } } } } } },
          "403": { description: "Apenas Plano Pro ou admin" },
        },
      },
    },
    "/pools.updateScoringRules": {
      post: {
        tags: ["pools.games"],
        summary: "Atualizar regras de pontuação (Plano Pro)",
        description: "Configura pontuação por acerto exato, resultado, gols, zebra, etc. Requer Plano Pro.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId"],
                properties: {
                  poolId: { type: "integer" },
                  exactScorePoints: { type: "integer", minimum: 0, maximum: 50, description: "Pontos por placar exato" },
                  correctResultPoints: { type: "integer", minimum: 0, maximum: 50, description: "Pontos por resultado correto" },
                  totalGoalsPoints: { type: "integer", minimum: 0, maximum: 50 },
                  goalDiffPoints: { type: "integer", minimum: 0, maximum: 50 },
                  zebraPoints: { type: "integer", minimum: 0, maximum: 50, description: "Bônus por zebra" },
                  zebraEnabled: { type: "boolean" },
                  bettingDeadlineMinutes: { type: "integer", description: "Minutos antes do jogo para fechar apostas" },
                  tiebreakOrder: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Regras atualizadas" },
          "403": { description: "Apenas Plano Pro" },
        },
      },
    },
    "/pools.getScoringRulesPublic": {
      get: {
        tags: ["pools.games"],
        summary: "Consultar regras de pontuação",
        description: "Retorna as regras de pontuação vigentes do bolão.",
        parameters: [
          { name: "input", in: "query", schema: { type: "object", properties: { poolId: { type: "integer" } } } },
        ],
        responses: {
          "200": { description: "Regras de pontuação" },
        },
      },
    },
    // ── pools.communication ───────────────────────────────────────────────────
    "/pools.sendInviteEmail": {
      post: {
        tags: ["pools.communication"],
        summary: "Enviar convite por e-mail",
        description: "Enfileira um e-mail de convite para o destinatário. Apenas organizadores.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "email"],
                properties: {
                  poolId: { type: "integer" },
                  email: { type: "string", format: "email" },
                  inviteeName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "E-mail enfileirado" },
          "403": { description: "Apenas organizadores" },
        },
      },
    },
    "/pools.broadcastToMembers": {
      post: {
        tags: ["pools.communication"],
        summary: "Enviar mensagem para todos os membros (Plano Pro)",
        description: "Cria notificação in-app para todos os membros do bolão. Requer Plano Pro.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "title", "message"],
                properties: {
                  poolId: { type: "integer" },
                  title: { type: "string", maxLength: 100 },
                  message: { type: "string", maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Mensagens enviadas", content: { "application/json": { schema: { type: "object", properties: { sent: { type: "integer" } } } } } },
          "403": { description: "Apenas Plano Pro" },
        },
      },
    },
    // ── pools.admin ───────────────────────────────────────────────────────────
    "/pools.adminList": {
      get: {
        tags: ["pools.admin"],
        summary: "Listar todos os bolões (admin)",
        description: "Retorna todos os bolões da plataforma com contagem de membros. Requer role admin.",
        parameters: [
          { name: "input", in: "query", schema: { type: "object", properties: { limit: { type: "integer", default: 100 } } } },
        ],
        responses: {
          "200": { description: "Lista de bolões" },
          "403": { description: "Apenas administradores" },
        },
      },
    },
    "/pools.adminUpdatePool": {
      post: {
        tags: ["pools.admin"],
        summary: "Atualizar bolão como admin",
        description: "Admin pode alterar status, tipo de acesso, nome e descrição de qualquer bolão.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId"],
                properties: {
                  poolId: { type: "integer" },
                  status: { type: "string", enum: ["active", "finished", "deleted"] },
                  accessType: { type: "string", enum: ["public", "private_link"] },
                  name: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Bolão atualizado" },
        },
      },
    },
    "/pools.adminCreate": {
      post: {
        tags: ["pools.admin"],
        summary: "Criar bolão como admin",
        description: "Admin cria um bolão sem restrições de plano.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "tournamentId"],
                properties: {
                  name: { type: "string", minLength: 3, maxLength: 100 },
                  tournamentId: { type: "integer" },
                  accessType: { type: "string", enum: ["public", "private_link"], default: "public" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Bolão criado", content: { "application/json": { schema: { type: "object", properties: { poolId: { type: "integer" }, slug: { type: "string" }, inviteToken: { type: "string" } } } } } },
        },
      },
    },
    // ── pools.retrospective ───────────────────────────────────────────────────
    "/pools.getRetrospective": {
      get: {
        tags: ["pools.retrospective"],
        summary: "Buscar retrospectiva do usuário no bolão",
        description: "Retorna dados da retrospectiva estilo Wrapped: slides, card de posição e templates de fundo configurados. Retorna null se bolão arquivado/deletado.",
        parameters: [
          { name: "input", in: "query", schema: { type: "object", properties: { poolId: { type: "integer" } } } },
        ],
        responses: {
          "200": {
            description: "Dados da retrospectiva ou null",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  nullable: true,
                  properties: {
                    shareCard: { type: "object", nullable: true },
                    templates: {
                      type: "object",
                      properties: {
                        slide1Url: { type: "string", nullable: true },
                        slide2Url: { type: "string", nullable: true },
                        slide3Url: { type: "string", nullable: true },
                        slide4Url: { type: "string", nullable: true },
                        slide5Url: { type: "string", nullable: true },
                        cardPodiumUrl: { type: "string", nullable: true },
                        cardParticipantUrl: { type: "string", nullable: true },
                        closingCtaText: { type: "string", nullable: true },
                        closingCtaUrl: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.adminGetRetrospectives": {
      get: {
        tags: ["pools.retrospective"],
        summary: "Listar retrospectivas de bolões concluídos (admin)",
        parameters: [
          {
            name: "input",
            in: "query",
            schema: {
              type: "object",
              properties: {
                page: { type: "integer", default: 1 },
                limit: { type: "integer", default: 20 },
                search: { type: "string" },
              },
            },
          },
        ],
        responses: {
          "200": {
            description: "Lista paginada de bolões com status de geração de retrospectivas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array" },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    totalPages: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/pools.adminReprocessRetrospective": {
      post: {
        tags: ["pools.retrospective"],
        summary: "Reprocessar retrospectiva de um bolão (admin)",
        description: "Regenera slides e cards para todos os membros do bolão.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["poolId"], properties: { poolId: { type: "integer" } } },
            },
          },
        },
        responses: {
          "200": { description: "Retrospectiva reprocessada" },
          "412": { description: "Bolão não está concluído" },
        },
      },
    },
    "/pools.getRetrospectiveConfig": {
      get: {
        tags: ["pools.retrospective"],
        summary: "Buscar configuração de retrospectiva (admin)",
        description: "Retorna URLs dos templates de fundo e configurações de comportamento.",
        responses: {
          "200": { description: "Configuração atual ou null" },
        },
      },
    },
    "/pools.updateRetrospectiveConfig": {
      post: {
        tags: ["pools.retrospective"],
        summary: "Atualizar configuração de retrospectiva (admin)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  autoCloseDays: { type: "integer", minimum: 1, maximum: 30, description: "Dias após awaiting_conclusion para auto-conclusão" },
                  closingCtaText: { type: "string", maxLength: 128 },
                  closingCtaUrl: { type: "string", nullable: true },
                  slide1Url: { type: "string", nullable: true },
                  slide2Url: { type: "string", nullable: true },
                  slide3Url: { type: "string", nullable: true },
                  slide4Url: { type: "string", nullable: true },
                  slide5Url: { type: "string", nullable: true },
                  cardPodiumUrl: { type: "string", nullable: true },
                  cardParticipantUrl: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Configuração atualizada" },
        },
      },
    },
    "/pools.uploadRetrospectiveTemplate": {
      post: {
        tags: ["pools.retrospective"],
        summary: "Upload de template de fundo para retrospectiva (admin)",
        description: "Aceita imagem PNG/JPEG em base64. Slots: slide1-5 (proporção 9:16), cardPodium e cardParticipant (proporção 4:5).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slot", "fileBase64", "mimeType"],
                properties: {
                  slot: { type: "string", enum: ["slide1", "slide2", "slide3", "slide4", "slide5", "cardPodium", "cardParticipant"] },
                  fileBase64: { type: "string", description: "Imagem em base64" },
                  mimeType: { type: "string", enum: ["image/png", "image/jpeg"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Template enviado e URL retornada", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" }, key: { type: "string" } } } } } },
        },
      },
    },
    // ── bets ──────────────────────────────────────────────────────────────────
    "/bets.placeBet": {
      post: {
        tags: ["bets"],
        summary: "Registrar palpite",
        description: "Registra ou atualiza o palpite do usuário para um jogo. Bloqueia se o jogo já iniciou ou o prazo expirou.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["poolId", "gameId", "predictedScoreA", "predictedScoreB"],
                properties: {
                  poolId: { type: "integer" },
                  gameId: { type: "integer" },
                  predictedScoreA: { type: "integer", minimum: 0, maximum: 99 },
                  predictedScoreB: { type: "integer", minimum: 0, maximum: 99 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Palpite registrado" },
          "400": { description: "Jogo já iniciado, encerrado, ou prazo expirado" },
          "403": { description: "Usuário bloqueado ou não é membro" },
        },
      },
    },
    "/bets.myBets": {
      get: {
        tags: ["bets"],
        summary: "Listar meus palpites no bolão",
        description: "Retorna palpites do usuário com paginação cursor-based.",
        parameters: [
          {
            name: "input",
            in: "query",
            schema: {
              type: "object",
              properties: {
                poolId: { type: "integer" },
                limit: { type: "integer", default: 50, maximum: 100 },
                cursor: { type: "integer" },
              },
            },
          },
        ],
        responses: {
          "200": { description: "Lista paginada de palpites" },
        },
      },
    },
    // ── auth ──────────────────────────────────────────────────────────────────
    "/auth.me": {
      get: {
        tags: ["auth"],
        summary: "Dados do usuário autenticado",
        responses: {
          "200": { description: "Dados do usuário ou null se não autenticado" },
        },
      },
    },
    "/auth.logout": {
      post: {
        tags: ["auth"],
        summary: "Encerrar sessão",
        responses: {
          "200": { description: "Sessão encerrada" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Cookie de sessão emitido pelo OAuth em /api/oauth/callback",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              json: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  code: { type: "integer" },
                  data: {
                    type: "object",
                    properties: {
                      code: { type: "string", enum: ["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "PRECONDITION_FAILED", "TOO_MANY_REQUESTS", "INTERNAL_SERVER_ERROR"] },
                      httpStatus: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
};

export function registerApiDocs(app: Express): void {
  // [S-DOCS] Proteger documentação da API — apenas admins autenticados
  app.use("/api/docs", requireAdminForDocs);
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Plakr! API Docs",
      customCss: `
        .swagger-ui .topbar { background-color: #0B0F1A; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info .title { color: #FFB800; }
        .swagger-ui .scheme-container { background: #121826; padding: 16px; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: false,
      },
    })
  );

  // Endpoint JSON para integração com ferramentas externas — também protegido
  app.get("/api/docs.json", requireAdminForDocs, (_req, res) => {
    res.json(openApiSpec);
  });
}
