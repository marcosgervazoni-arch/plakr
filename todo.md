# Plakr! — TODO

> Arquivo de rastreamento de features, bugs e backlog.
> Itens `[x]` = implementado e em produção. Itens `[ ]` = pendente de implementação.
> Seção **BACKLOG** = ideias aprovadas mas não priorizadas ainda.

---

## CONCLUÍDO — Infraestrutura e Base

- [x] Scaffold inicial: React 19 + Tailwind 4 + Express + tRPC + Drizzle
- [x] Autenticação Manus OAuth (cookie de sessão 30 dias)
- [x] Schema inicial: users, pools, pool_members, games, bets, tournaments, user_plans
- [x] Sistema de roles: admin / user
- [x] Stripe integrado: checkout, webhook, portal do cliente
- [x] Stripe produção: chaves live configuradas (pk_live, sk_live, whsec_)
- [x] Stripe produção: 4 Price IDs (Pro mensal/anual, Ilimitado mensal/anual)
- [x] Stripe webhook: eventos checkout.session.completed, subscription.deleted, invoice.payment_failed, invoice.paid
- [x] Planos por conta (Pro por Conta): shared/plans.ts, getUserPlanTier, canCreatePool, canAddMember
- [x] Super Admin: bypass de limites de plano, badge "Super Admin" no perfil
- [x] Sessão: cookie de 30 dias, logout manual

---

## CONCLUÍDO — Funcionalidades Core

- [x] Criação de bolão (organizador)
- [x] Ingresso por token/link de convite
- [x] Palpites inline nos cards de jogos
- [x] Motor de pontuação: acerto exato, resultado, gol de time, diferença de gols, goleada, zebra
- [x] Ranking por bolão com posição do usuário
- [x] Central de Palpites (/history): filtros, edição inline, urgência
- [x] Sincronização de cache entre PoolPage e BetHistory (invalidação global)
- [x] Onboarding Checklist do Organizador (aparência, acesso, taxa)
- [x] Taxa de Inscrição por Bolão (QR Code PIX, aprovação manual, expiração 7 dias)
- [x] Duelos X1: desafio, aceitação, recusa, cancelamento, ranking de rivalidade
- [x] X1 prediction resolver: cron 30min, adminResolvePhase, notificações vencedor/perdedor
- [x] Chaveamento visual de mata-mata (confrontos por fase)
- [x] Retrospectiva imersiva (/pool/:slug/retrospectiva)
- [x] Perfil público do membro (/profile/:userId)
- [x] Explorar bolões públicos (/pools/public)
- [x] Notificações in-app: sino, lista, badge de não lidas
- [x] Push Web (VAPID): estrutura configurada
- [x] E-mail: templates HTML, fila, scheduleBetReminders

---

## CONCLUÍDO — Inteligência Esportiva (API-Football + IA)

- [x] Integração API-Football Pro: client com circuit breaker, retry, controle de quota
- [x] Cron: fixtures 2x/dia (06h e 18h UTC), resultados a cada 2h, times semanal (Seg 02h UTC)
- [x] Sincronização automática: status scheduled → live → finished sem intervenção manual
- [x] Análise pré-jogo: probabilidades reais da API + forma recente dos times + texto LLM
- [x] Análise pós-jogo: resumo LLM, estatísticas com barras, timeline de gols
- [x] Análise do palpite: placar real vs palpite, badges de pontuação, texto contextual
- [x] Narrador: aiNarration para jogos sem palpite ("O que rolou nesse jogo")
- [x] Barra de probabilidade: usa comparison.total da API; oculta quando predictionReliable=false
- [x] Backfill manual: reprocessar estatísticas e análises de IA em lote (Admin → Integrações)
- [x] Geração automática semanal de análises pré-jogo (cron diário 05h UTC)
- [x] Validação de consistência de goalsTimeline (descarta se gols != scoreA+scoreB)
- [x] Painel Admin → Integrações: configurar API key, quota, circuit breaker, sync manual, logs
- [x] Importação de campeonato da API: seleção de fases, um torneio por campeonato
- [x] Nomes amigáveis de fase: shared/phaseNames.ts, aplicado em toda a UI
- [x] Formatos de torneio: override manual, cron semanal de recalculo, KNOWN_LEAGUE_FORMATS com 26 estaduais BR

---

## CONCLUÍDO — Interface e Navegação

- [x] AppShell: sidebar desktop fixo, top bar mobile, notificações, engrenagem do organizador
- [x] PoolBottomNav: FAB central (Jogos/Palpites), barra mobile com 5 itens
- [x] Sidebar contextual do bolão ativo (Jogos, Ranking, X1, Regras, Chaveamento, Palpites, Retrospectiva)
- [x] DashboardLayout com sidebar e perfil do usuário
- [x] GameCard v4: palpite centralizado, timeline inline, badges de pontuação, painel expansível
- [x] Modal de Compartilhamento (bottom-sheet): preview, Instagram Stories, WhatsApp, Download, Outros
- [x] Card Stories 1080x1920: 5 estados, faixa dourada, banner dinâmico, assinatura Plakr
- [x] AdminShareCard: personalização de copies, cores, emojis por estado, preview em tempo real
- [x] Páginas legais: /privacy e /terms com layout Plakr
- [x] SEO completo: meta tags, Open Graph, Twitter Cards, JSON-LD, robots.txt, sitemap.xml
- [x] OG Image dinâmica: upload no admin, bots recebem HTML com ogImageUrl do banco
- [x] Landing page: toggle Mensal/Anual, 3 planos, vitrine de badges, FAQ
- [x] Upgrade page: preços dinâmicos do banco, toggle Mensal/Anual, checkout direto

---

## CONCLUÍDO — Publicidade (Adsterra + Banners Próprios)

- [x] AdBanner: componente com suporte a posições (top, bottom, between_sections, popup)
- [x] AdInterleaved: componente para ads entre itens de lista (interval configurável)
- [x] Adsterra: injeção via iframe srcDoc (compatível com Chrome mobile Android/Xiaomi)
- [x] Dois toggles independentes: adsEnabled (Adsterra) e adsLocalEnabled (banners próprios)
- [x] Ads suprimidos para usuários Pro em todas as telas
- [x] Admins sempre veem anúncios (para validação)
- [x] Popup interstitial: trigger por navegação (a cada 3 trocas de rota, máx 1x/sessão)
- [x] Frequência do popup configurável no Admin (session/daily/always)
- [x] AdInterleaved aplicado em: PoolPage jogos, PoolPage ranking, BetHistory, PublicPools, OrganizerMembers, OrganizerDashboard, OrganizerAccess, PoolSettings
- [x] AdminAds: CRUD de anúncios, upload de mídia, dois cards de toggle independentes
- [x] AdminIntegrations: campos de código Adsterra por posição (textarea com GET CODE)

---

## CONCLUÍDO — Patrocínio de Bolões

- [x] Schema: pool_sponsors, pool_sponsor_events, pool_sponsor_badges, user_sponsor_badges
- [x] Backend: tRPC router pools-sponsor.ts (upsert, get, delete, toggle, enableForOrganizer)
- [x] Frontend: AdminSponsorship.tsx com todas as seções (banner, popup, boas-vindas, notificação, badges)
- [x] SponsorBanner: banner exclusivo na página do bolão (altura 150px, object-cover)
- [x] SponsorWelcomeMessage: mensagem de boas-vindas (sessionStorage — reaparece a cada sessão)
- [x] SponsorPopup: popup configurável (título, texto, logo, botão+link, frequência, delay, toggle, centralizado no mobile)
- [x] Relatório de patrocínio: métricas agregadas (impressões, cliques, popups), gráfico, exportação PDF
- [x] Notificação patrocinada de ranking: rankingNotificationText, enviada na atualização do ranking
- [x] Badges patrocinados: 9 dinâmicas, toggle, upload SVG, atribuição automática, notificação in-app
- [x] Conquistas Especiais na tela Conquistas.tsx (grid, moldura dourada lendário)
- [x] Hint de dimensão do banner atualizado para 800×150 px no AdminSponsorship

---

## CONCLUÍDO — Conquistas (Badges)

- [x] Sistema de badges: calculateAndAssignBadges chamado após cada palpite
- [x] progressMap completo: 27 critérios mapeados (x1_wins, zebra, early_user, etc.)
- [x] Badge "Chegou Cedo": exibe "Não elegível" em vez de userId como progresso
- [x] BadgeShowcase na landing page (grid 2x3, blur/cadeado, tooltip raridade, CTA)
- [x] Vitrine de badges configurável no AdminLandingPage (toggle + código customizado)

---

## CONCLUÍDO — Motor de Pontuação

- [x] updateBetScore: persiste todos os 9 campos do breakdown (pointsGoalDiff, pointsOneTeamGoals, pointsLandslide, pointsZebra, isZebra, etc.)
- [x] upsertPoolMemberStats: inclui 5 contadores (goalDiffCount, oneTeamGoalsCount, totalGoalsCount, landslideCount, zebraCount)
- [x] Script recalculate-breakdown.mjs para reprocessamento histórico

---

## CONCLUÍDO — Painel Super Admin

- [x] AdminSettings: acordeons por grupo (Monetização, Regras, Notificações, Mensagens)
- [x] AdminIntegrations: acordeons por grupo (Analytics, API-Football, Campeonatos)
- [x] AdminAds: dois toggles independentes, CRUD de anúncios
- [x] AdminPricing: página dedicada de preços por plano
- [x] AdminSponsorship: patrocínio completo com relatório
- [x] AdminShareCard: personalização do card de compartilhamento
- [x] AdminUsers: bloquear/desbloquear/promover/remover usuário
- [x] AdminTournaments: importar, editar, override de formato, resolver fase X1
- [x] AdminPools: grantPro, revokePro, deletePool
- [x] AdminGameResults: registrar resultado via admin
- [x] AdminBroadcasts: compor, fila de e-mails, mensagens automáticas
- [x] AdminSystemHealth: health tracking dos 5 jobs da API-Football
- [x] Segurança: /api/docs protegido com requireAdminForDocs

---

## PENDENTE — Bugs Ativos

- [x] **BUG:** Estatísticas e análises não aparecem nos cards — causa raiz: 328 jogos sem aiSummary no banco; backfill loop automático implementado no painel admin (processa até zerar pendentes em lotes de 50)
- [ ] **BUG:** Compartilhamento GameCard — estado de loading ainda pode ser compartilhado entre botões em edge cases
- [ ] **BUG:** E-mail de broadcast não está sendo entregue (aguardando integração com provedor externo: Resend/SendGrid)
- [ ] **BUG:** Push Web (browser push) de broadcast não está sendo entregue (depende de VAPID keys configuradas)
- [ ] **BUG:** Importação API-Football traz jogos demais em algumas ligas (filtrar apenas Regular Season)
- [ ] **BUG:** Prompt do LLM usa expressões temporais incorretas ("hoje", "amanhã") — incluir data do jogo no prompt

---

## PENDENTE — Features Priorizadas

- [ ] **Mover SponsorBadgesSection** para dentro do AdminSponsorship.tsx como seção colapsável (padrão visual das demais seções)
- [ ] **Padronização de acordeons:** iniciar fechados e comportamento exclusivo em todas as telas (exceto PoolPage jogos)
- [ ] **Revisão completa de badges:** mapear todos os badges do banco vs criterionTypes implementados, corrigir disparadores ausentes, reprocessar retroativos
- [ ] **Redesign do Card Stories:** Gerva cria modelo base 9:16 (Canva/Figma) → reproduzir fielmente no canvas

---

## BACKLOG — Ideias Aprovadas (não priorizadas)

- [ ] [BACKLOG] Drag-and-drop de seções na página de vendas (sectionsOrder JSON)
- [ ] [BACKLOG] Dois toggles independentes de publicidade já implementados — documentar comportamento para o admin
- [ ] [BACKLOG] Salvar botão por grupo no AdminSettings (em vez de "Salvar tudo")
- [ ] [BACKLOG] Reorganização completa do sidebar: mapear todas as rotas, definir hierarquia, implementar
- [ ] [BACKLOG] Reordenar PoolBottomNav: Configurações (organizador), Meus Palpites (destaque), Jogos, Ranking, Duelos, Chaveamento, Retrospectiva (só ao final), Regras
- [ ] [BACKLOG] Redesenhar botões "Salvar palpite" e "Atualizar palpite" no GameCard (mais sutis)
- [ ] [BACKLOG] Unificar /my-profile e /profile/:userId em uma única rota com modo de edição
- [ ] [BACKLOG] Mover Conquistas para aba dentro do Dashboard
- [ ] [BACKLOG] Mover NotificationPreferences para aba dentro de /notifications
- [ ] [BACKLOG] Ocultar rotas admin prematuras: badges, ads, referrals, x1-duels
- [ ] [BACKLOG] API Pública v1: tabela api_keys, middleware X-API-Key, endpoints REST, Swagger UI
- [ ] [BACKLOG] Curadoria de campeonatos: campo isAvailable, toggleAvailability, filtrar bolões por campeonatos disponíveis
- [ ] [BACKLOG] Monetização v2: tier Starter (R$ 9,90), 5 tiers total, lock suave análise IA para Free, trial 7 dias
- [ ] [BACKLOG] Retrospectiva em vídeo (Remotion): geração de vídeo por usuário, job BullMQ, player na página do bolão
- [ ] [BACKLOG] Narração aiNarration automática no syncResults para jogos futuros (já implementado parcialmente)
- [ ] [BACKLOG] Card de compartilhamento: exibir logo do patrocinador quando configurado
- [ ] [BACKLOG] Perfil público avançado com estatísticas históricas (Pro+)
- [ ] [BACKLOG] Temas premium para card Stories (Pro e Clube)
- [ ] [BACKLOG] Exibir estatísticas de breakdown no perfil do usuário (goalDiffCount, zebraCount, etc.)
- [ ] [BACKLOG] Preview ao vivo de banner/popup no AdminSponsorship
- [ ] [BACKLOG] Frequência configurável da mensagem de boas-vindas (a cada sessão vs uma vez por membro)
- [x] Backfill de aiSummary: nova procedure backfillAiSummaries + botão no admin com contador correto

## Sprint A — Bugs Críticos (Revisão Técnica)
- [x] B2: Corrigir prompt LLM — incluir data real do jogo, proibir "hoje"/"amanhã" (corrigido em sessão anterior)
- [x] S3: Automatizar backfill de aiSummary no cron de resultados (syncResults) — backfillAiSummaries chamado em background ao final do syncResults quando resultsApplied > 0
- [x] B3: Corrigir ECONNRESET no pool MySQL — getDb() agora usa mysql2 createPool com enableKeepAlive:true, waitForConnections:true (conexões ociosas não morrem mais após hibernação)

## Sprint B — Débito de Código
- [x] C1: Extrair GameCard e sub-componentes do PoolPage.tsx — GameCard movido para client/src/components/GameCard.tsx (PoolPage.tsx: 2491→1749 linhas)
- [ ] C4: Dividir server/db.ts em módulos por domínio (pools, games, users, etc.) — ADIADO: 36 arquivos importam db.ts; risco alto de quebra em cascata sem benefício imediato
- [x] D1: Declarar índices explícitos no drizzle/schema.ts — 14 índices adicionados em 7 tabelas (games, bets, notifications, poolMembers, poolMemberStats, emailQueue, adminLogs); migração aplicada

## Sprint C — UX e Navegação
- [x] U1: Unificar /my-profile e /profile/:userId — /my-profile redireciona para /profile/me; PublicProfile.tsx exibe seções de edição (avatar, plano, convites, notificações, conta) quando isOwnProfile=true
- [x] U2: Adicionar link "Preferências" no rodapé do sidebar (AppShell.tsx) apontando para /notification-preferences, com highlight ativo
- [x] P1: Otimizar queries N+1 — getPoolsWhereOnlyOrganizer: N queries → 1 query SQL com subquery; saveFinalPositions: N INSERTs → 1 INSERT em lote
- [x] U4: SponsorBadgesSection já estava dentro do AdminSponsorship.tsx como seção colapsável (verificado no Sprint D)

## Sprint D — Limpeza
- [x] C3: Auditar console.log — todos os 29 logs existentes são legítimos (catch blocks, error boundaries, push/maps/share); nenhum debug para remover
- [x] U4: SponsorBadgesSection já estava dentro do AdminSponsorship.tsx como seção colapsável (implementado em sessão anterior)
- [ ] C2: Dividir AdminIntegrations.tsx em sub-componentes menores
- [x] S2: Ocultar rotas admin prematuras — /admin/x1-duels e /admin/referrals removidos do menu AdminLayout (rotas preservadas, apenas ocultas do nav)

## Sprint E — Consolidação de Navegação (Auditoria)
- [ ] N1: Remover PoolSettings.tsx (arquivo morto) e rota /enter-pool (rota fantasma)
- [ ] N2: Redirecionar / → /dashboard para usuários autenticados
- [ ] N3: Mover Conquistas para seção/aba dentro do Dashboard (eliminar rota separada)
- [ ] N4: Mover NotificationPreferences para aba dentro de /notifications (eliminar rota separada)
- [ ] N5: Consolidar rotas admin redundantes em abas de telas existentes (system→settings, import-logs→tournaments/:id, retrospectivas→pools, landing-page→settings, pricing→settings)

## Sprint F — Auditoria de Segurança
- [x] SEC-1: Atualizar @trpc/server 11.6.0 → 11.16.0 (CVE GHSA-43p4-m455-4f4j corrigido)
- [x] SEC-2: Atualizar axios 1.13.6 → 1.15.0 (CVE GHSA-jr5f-v2jv-69x6 corrigido)
- [x] SEC-3: Registrar router /api/v1 no Express com rate limiting 60req/min (estava inacessível — arquivo morto)
- [x] SEC-4: Corrigir useInviteCode — era publicProcedure com newUserId no input (vetor de abuso); agora é protectedProcedure usando ctx.user.id
- [ ] SEC-5: Stripe — implementar portal do cliente e fluxo de cancelamento de assinatura
- [ ] SEC-6: Revisar CSP — 'unsafe-inline' e 'unsafe-eval' em scriptSrc são permissivos; avaliar nonce-based CSP para produção

## Sprint G — Melhorias Pós-Auditoria
- [ ] G1: Stripe — Customer Portal: botão "Gerenciar Assinatura" no perfil/upgrade que abre portal Stripe para cancelamento e troca de plano
- [ ] G2: Badges — job de reprocessamento retroativo com botão no painel admin (calcular badges para todos os usuários)
- [x] Tela de criação do bolão: incluir todas as regras de pontuação faltantes (goleada, um time, bonuç de gol de time) na seção "Regras de Pontuação"
- [ ] G3: Bug — análises de IA (aiSummary, statsData, goalsTimeline) não aparecem nos cards de jogos encerrados na PoolPage
- [ ] [BACKLOG] Dashboard Admin: indicador de Naming Rights com valor contratado (requer campo contractValueBrl no banco + processo comercial definido — ver docs/backlog/dashboard-monetization-indicators.md)
- [ ] [BACKLOG] Dashboard Admin: card Adsterra com receita via API Publisher (requer adsterraApiKey em platformSettings + UI em Integrações — ver docs/backlog/dashboard-monetization-indicators.md)
- [x] Dashboard Admin: redesign com 3 zonas visuais (Saúde Operacional, Financeiro, Produto) + gráfico multi-série + ações contextuais + naming rights integrado
- [x] PoolPage: corrigir isPro para usar useUserPlan() em vez de lógica local (plan === 'pro')

## Segurança — Auditoria (Abr/2026)
- [x] Segurança: sanitizar customCode com DOMPurify em Home.tsx (XSS stored)
- [x] Segurança: validar protocolo de whatsappLink/telegramLink no servidor (javascript: links)
- [x] Segurança: adicionar .max() em description e logoUrl no pools-core.ts
- [x] Segurança: validar MIME type por magic bytes no servidor (upload de imagens/vídeos)
- [x] UX: banner pós-checkout na UpgradePage (sucesso e cancelamento) com CTA para o painel

## Sprint H — Melhorias na Criação do Bolão
- [x] CreatePool: Seção 4 — regras de pontuação editáveis na criação para usuários Pro
- [x] CreatePool: Seção 5 — configuração de inscrição (valor/Pix/QR code) na criação para usuários Pro

## Sprint I — Consistência de Regras do Bolão
- [x] PoolRules: exibir regras de pontuação customizadas do bolão (poolScoringRules) em vez dos valores padrão

## Sprint J — Bug Fix + Dashboard UX
- [x] CreatePool: corrigir bug campeonato personalizado bloqueado para usuários Pro
- [x] PoolDashboard: adicionar link de convite com botão de copiar diretamente no dashboard
- [x] PoolDashboard: fundir seção de Acessos & Convites no dashboard (eliminar tela separada)

## Sprint K — Alerta de Aprovações no Dashboard
- [x] PoolDashboard: card de alerta âmbar "X membros aguardando aprovação" com link direto para tela de Membros

## Sprint L — Bug: Membros Pendentes na Lista Ativa
- [x] BUG: membros com status 'pending' aparecem na lista de ativos e no contador de participantes antes de serem aprovados

## Sprint M — Segurança: Bloqueio de Acesso para Membros Pendentes
- [x] Garantir que membros pending_approval/rejected não acessam o bolão nem fazem apostas (backend + frontend)

## Sprint N — Redirecionamento de Slugs Antigos
- [x] Criar tabela pool_slug_redirects para preservar slugs antigos após renomeação
- [x] Backend: getBySlug resolve slug via tabela de redirecionamentos e retorna slugAtual
- [x] Backend: procedure updateSlug para renomear slug e registrar o antigo automaticamente
- [x] Frontend: detectar redirecionamento e navegar para o slug correto de forma transparente
- [x] Registrar slug antigo do WILD BIER (bol-o-wild-bier-copa-do-mundo-26-v_52kn → wildbeer)

## Sprint O — Interface para Renomear Slug do Bolão
- [x] Backend: procedure checkSlugAvailability e updateSlug no pools-core.ts
- [x] Frontend: seção de edição de slug nas configurações do bolão com validação em tempo real

## Sprint P — Open Graph Dinâmico por Bolão
- [x] Backend: endpoint SSR de metatags OG para /pool/:slug e /join/:token
- [x] Servidor: middleware OG integrado antes do handler do Vite/SPA
## Sprint Q — Bug: Regras de Pontuação na Criação do Bolão
- [x] BUG: criação de bolão não-Pro inseria linha vazia em pool_scoring_rules com defaults do banco (em vez de não inserir nada e herdar defaults da plataforma dinamicamente)
- [x] Correção: upsertPoolScoringRules só é chamado se houver pelo menos um valor customizado definido pelo usuário
- [x] Adicionadas rotas /api/og/pool/:slug e /api/og/join/:token no Express (para uso futuro quando o proxy rotear /api/* corretamente)

## Sprint Q — Correção de Bugs: Regras de Pontuação

- [x] Bug corrigido: criação de bolão não-Pro não deve inserir linha vazia em pool_scoring_rules
- [x] Bug corrigido: criação de bolão pelo Admin não deve inserir linha vazia em pool_scoring_rules
- [x] Bug corrigido: CreatePool.tsx usava DEFAULT_RULES hardcoded em vez dos defaults reais da plataforma
- [x] Nova procedure: platform.getDefaultScoringRules expõe defaults de pontuação para usuários autenticados
- [x] CreatePool.tsx agora busca e sincroniza os defaults reais da plataforma ao abrir a tela
- [x] Botão "Restaurar padrões" no CreatePool.tsx agora usa os defaults reais da plataforma
- [x] Auditoria: PoolRules.tsx usa getScoringRulesPublic corretamente (sem hardcoded problemático)
