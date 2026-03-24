# ApostAI — TODO

## Fase 1: Fundação e Design System
- [x] Configurar design system global (cores, fontes, tema escuro)
- [x] Atualizar index.css com tokens de cor (brand, surface, border, etc.)
- [x] Adicionar fontes Inter via Google Fonts
- [x] Configurar ThemeProvider para tema escuro como padrão

## Fase 2: Modelagem de Dados (19 tabelas)
- [x] Tabela `users` (com avatar, isBlocked, role)
- [x] Tabela `platform_settings` (configurações globais — single-row)
- [x] Tabela `tournaments` (campeonatos globais e personalizados)
- [x] Tabela `teams` (times/seleções)
- [x] Tabela `tournament_phases` (fases do campeonato)
- [x] Tabela `games` (jogos com horário, resultado, status, isZebra)
- [x] Tabela `pools` (bolões multi-tenant com plano free/pro)
- [x] Tabela `pool_members` (membros com role: organizer/participant)
- [x] Tabela `pool_scoring_rules` (regras customizadas por bolão)
- [x] Tabela `pool_member_stats` (stats de pontuação por membro)
- [x] Tabela `bets` (palpites com pontuação calculada)
- [x] Tabela `user_plans` (plano do usuário + Stripe)
- [x] Tabela `notifications` (notificações in-app)
- [x] Tabela `notification_preferences` (preferências por usuário)
- [x] Tabela `ads` (peças publicitárias)
- [x] Tabela `admin_logs` (auditoria de ações admin)
- [x] Tabela `email_queue` (fila de e-mails)
- [x] Migrações SQL geradas e aplicadas no banco

## Fase 3: Backend — Routers tRPC e Middlewares
- [x] Middleware adminProcedure (Super Admin)
- [x] Middleware organizerProcedure (Organizador do bolão)
- [x] Router `auth` (me, logout)
- [x] Router `users` (me, myPools, list, blockUser, promoteToAdmin)
- [x] Router `tournaments` (listGlobal, getById, create, update, addGame, setResult, addTeam)
- [x] Router `pools` (create, getBySlug, joinByToken, update, getMembers, removeMember, transferOwnership, updateScoringRules)
- [x] Router `bets` (myBets, placeBet com validação de prazo)
- [x] Router `rankings` (getPoolRanking)
- [x] Router `notifications` (list, markRead, markAllRead)
- [x] Router `platform` (getSettings, updateSettings)
- [x] Router `ads` (getActive)
- [x] Lógica de limite de plano gratuito (2 bolões, 50 participantes)

## Fase 4: Telas Públicas e Participante
- [x] Landing Page (Home.tsx) — Hero, Features, Planos, CTA, Footer
- [x] Dashboard do participante (Dashboard.tsx) com bolões ativos
- [x] Página do bolão (PoolPage.tsx) com jogos, palpites e ranking
- [x] Fluxo de entrada via convite (JoinPool.tsx)
- [x] Sino de notificações (NotificationBell.tsx) com polling 30s
- [x] Modal de criação de bolão (CreatePoolModal.tsx)

## Fase 5: Painel do Organizador
- [x] Configurações do bolão (PoolSettings.tsx)
- [x] Gestão de membros e remoção
- [x] Regras de pontuação customizadas (Pro)
- [x] Transferência de propriedade

## Fase 6: Painel Super Admin
- [x] AdminPanel.tsx com abas: campeonatos, usuários, planos, configurações
- [x] Gestão de campeonatos globais (criar, editar, adicionar jogos/times)
- [x] Gestão de usuários (bloquear, promover a admin)
- [x] Configurações da plataforma (limites, pontuação padrão)

## Fase 7: Motor de Pontuação e Arquivamento
- [x] Motor de pontuação (server/scoring.ts) com BullMQ + fallback síncrono
- [x] Regras: placar exato (10pts), resultado correto (5pts), bônus gols/diferença/zebra
- [x] Bônus condicionados ao resultado correto (bug corrigido via testes)
- [x] Arquivamento automático de bolões encerrados (server/archival.ts)
- [x] Cron job de arquivamento (1h de intervalo)
- [x] Workers iniciados automaticamente no startup do servidor

## Fase 8: Dashboard de Acompanhamento
- [x] ProjectDashboard.tsx com progresso por fase, métricas e riscos
- [x] Rota /project-status acessível publicamente

## Fase 9: Testes Vitest
- [x] scoring.test.ts — 9 testes do motor de pontuação
- [x] routers.test.ts — 9 testes de auth e middlewares de permissão
- [x] auth.logout.test.ts — 1 teste de logout (template)
- [x] Total: 19 testes passando, 0 falhas

## Pendente (Próximas Iterações)
- [ ] Integração Stripe (checkout + webhooks de plano)
- [ ] Campeonatos personalizados Pro (fluxo completo de criação)
- [ ] Importação CSV de jogos (Super Admin)
- [ ] Notificações por e-mail (Manus Notification API)
- [ ] Analytics GA4 + Facebook Pixel (Super Admin — exclusivo)
- [ ] Upload de logos de bolões e fotos de times (S3)
- [ ] Testes de carga no motor de pontuação
- [ ] Configuração Redis para BullMQ em produção
- [ ] Testes de isolamento multi-tenant

## Fase 3 — Conclusão ✅
- [x] Design system: fontes Syne + JetBrains Mono + tokens de cor exatos da spec
- [x] P3 — Tela de entrada por código manual (campo monoespaçado, busca inline, confirmação)
- [x] P4 — Tela de confirmação de convite com logo, nome, campeonato, participantes, organizador
- [x] U1 — Gráfico de evolução de pontos (Recharts, linha brand, área gradiente)
- [x] U1 — Palpites recentes (últimos 5, ícones verde/amarelo/vermelho) — sempre visível
- [x] U1 — Estatísticas globais (total pontos, exatos, bolões) em JetBrains Mono
- [x] U2 — Bolões Públicos: busca, filtros por campeonato, grade de cards
- [x] Refinamento P4/JoinPool: tela de confirmação rica antes do join automático
- [x] procedures adicionados: previewByToken, searchByCode, joinByCode, listPublic, myStats, recentBets

## Fase 4 — Gestão e Monetização
- [ ] O1 — Modal/formulário de criação de bolão aprimorado
- [ ] O2 — Dashboard do Organizador com sidebar colapsável
- [ ] O3 — Gestão de membros com busca e paginação
- [ ] O4 — Convites: link, código, QR Code
- [ ] O5 — Configuração de regras de pontuação (Pro)
- [ ] O6 — Registro de resultados de jogos (Pro)
- [ ] Campeonatos personalizados Pro (fluxo completo 4 etapas)
- [ ] Integração Stripe (checkout + webhooks + portal)
- [ ] A1 — Dashboard Global Super Admin com métricas e gráficos
- [ ] A2/A3 — Campeonatos globais + times + jogos + importação CSV
- [ ] A4 — Gestão de usuários completa com anonimização
- [ ] A5 — Gestão de bolões com contagem regressiva de exclusão
- [ ] A6 — Assinaturas Stripe (MRR, churn, ações)
- [ ] A7 — Broadcasts segmentados
- [ ] A8 — Publicidade (upload S3, posições, métricas)
- [ ] A9 — Configurações completas (GA4, Pixel, limites)
- [ ] A10 — Logs de auditoria

## Fase 4 — Painel do Organizador (sprint 21/03/2026) ✅
- [x] O1 — Criar Bolão: 4 seções visuais, banner de limite, botão sticky mobile
- [x] O2 — Dashboard do Organizador: 4 métricas, membros inativos, top 5, barra de plano
- [x] O3 — Gestão de Membros: busca, filtros, AlertDialogs destrutivos, transferência de propriedade
- [x] O4 — Controle de Acesso: código JetBrains Mono 24px, copiar/regenerar com confirmação
- [x] O5 — Identidade Visual: upload de logo (drag-and-drop), preview em tempo real
- [x] O6 — Regras de Pontuação: simulador integrado, bloqueio automático pós-início
- [x] OrganizerLayout: sidebar 240px fixa, mobile hambúrguer, banner Pro expirado, rotas O2-O6
- [x] Rotas App.tsx: /create-pool, /pool/:slug/manage, /members, /access, /identity, /rules

## Fase 4 — Monetização e Super Admin (sprint 21/03/2026) ✅
- [x] Stripe: server/products.ts, server/stripe-webhook.ts, checkout + webhooks de ativação/cancelamento
- [x] Router trpc.stripe.createCheckout e trpc.stripe.createPortalSession
- [x] SubscriptionPage.tsx — tela de upgrade Pro com features e botão de checkout
- [x] O7/O8 — CustomTournament.tsx — wizard 4 etapas para campeonatos personalizados Pro
- [x] AdminLayout.tsx — sidebar com 10 seções (A1–A10)
- [x] A1 — AdminDashboard.tsx — métricas globais: MRR, usuários, bolões, palpites, gráficos Recharts
- [x] A2/A3 — AdminTournaments.tsx — lista, criar, editar, importar jogos via CSV
- [x] A4 — AdminUsers.tsx — busca, bloquear/desbloquear, promover admin, anonimizar
- [x] A5 — AdminPools.tsx — lista global de bolões com contagem regressiva de exclusão
- [x] A6 — AdminSubscriptions.tsx — MRR, churn, ações de assinatura
- [x] A7 — AdminBroadcasts.tsx — broadcasts segmentados por plano/status
- [x] A8 — AdminAds.tsx — upload de banners, posições, toggle ativo/inativo
- [x] A9 — AdminSettings.tsx — configurações globais da plataforma
- [x] A10 — AdminAudit.tsx — logs de auditoria com filtros
- [x] Procedure platform.getStats (MRR, usuários, bolões, palpites, crescimento)
- [x] Procedure notifications.broadcast (admin segmentado)
- [x] Procedures ads.list, ads.create, ads.toggle, ads.delete
- [x] Procedure platform.getAuditLogs
- [x] Procedure pools.adminList
- [x] Migração SQL: colunas country, season, startDate, endDate na tabela tournaments
- [x] Fase 2 fechada: recálculo retroativo, anonimização, transferência automática, setGameResult Pro

## Fase 5 — Polimento e S3 (sprint 21/03/2026) — Em andamento
- [x] server/upload.ts — rota POST /api/upload com validação de tipo/tamanho (5MB)
- [x] client/src/hooks/useImageUpload.ts — hook de upload base64 → S3
- [x] client/src/components/ImageUploader.tsx — componente drag-and-drop com progress bar
- [x] O5 OrganizerIdentity.tsx — integrado com upload real S3 (substituiu preview local)
- [ ] Notificações por e-mail (lembretes de palpites, resultados, expiração de plano)
- [ ] Analytics GA4 + Facebook Pixel (exclusivo Super Admin)
- [ ] Testes de carga no motor de pontuação
- [ ] Redis em produção para BullMQ
- [ ] Deploy em produção (Manus Hosting)

## Fase 5 — Fechamento 100% (sprint final)
- [ ] server/email.ts — servi\u00e7o de e-mail com templates HTML (lembrete de palpite, resultado, expira\u00e7\u00e3o de plano, boas-vindas)
- [ ] Cron job de lembretes de palpites (1h antes de cada jogo)
- [ ] Cron job de notifica\u00e7\u00e3o de resultados (ap\u00f3s setResult)
- [ ] Cron job de alerta de expira\u00e7\u00e3o de plano (7 dias e 1 dia antes)
- [ ] Polimento UX: loading skeletons em todas as p\u00e1ginas principais
- [ ] Estados vazios ilustrados (sem bol\u00f5es, sem palpites, sem membros)
- [ ] Erros amig\u00e1veis com retry em todas as queries tRPC
- [ ] Testes: isolamento multi-tenant (organizador n\u00e3o acessa outro bol\u00e3o)
- [ ] Testes: limites de plano gratuito (2 bol\u00f5es, 50 participantes)
- [ ] Testes: prazo de palpite (bloqueio server-side)
- [ ] Testes: recalculo retroativo de pontos
- [ ] Configura\u00e7\u00e3o Stripe: produto Pro + Price ID no products.ts
- [ ] Dashboard atualizado para 100% em todas as fases

## Revisão de UX — Sprint 21/03/2026
- [x] AppShell: sidebar global colapsável para usuários autenticados
- [x] AppShell: header unificado com logo, nav contextual e avatar
- [x] Perfil público /profile/:userId — avatar, stats globais, histórico, ranking
- [x] Procedure users.getPublicProfile (publicProcedure com userId)
- [x] Procedure users.globalRanking (top apostadores da plataforma)
- [ ] Admin: formulário inline para adicionar times a campeonatos
- [ ] Admin: formulário inline para adicionar jogos a campeonatos
- [ ] Admin: visualização de bracket/chaveamento por fase
- [x] Rota /upgrade independente de bolão específico
- [x] Banner de upgrade Pro no Dashboard (para usuários sem plano Pro)
- [x] Links de perfil público nos rankings dos bolões
- [x] Página de Ranking Global /ranking
- [x] Nomes de usuários como links de perfil no AdminUsers

## Correções de Bugs — Sprint 22/03/2026
- [x] Fix: SQL raw com snake_case errado em users.myStats (exact_scores → exactScoreCount, total_points → totalPoints, pool_id → poolId)
- [x] Fix: SQL raw com snake_case errado em users.getPublicProfile (exact_score_count, correct_result_count, total_bets)
- [x] Fix: Coluna stripePriceIdPro no banco MySQL (já estava correto, erro era transitório)
- [x] Fix: Rota /admin/tournaments/:id criada com página AdminTournamentDetail
- [x] Fix: Item "Times & Jogos" removido do AdminLayout (rota inéxistente)
- [x] Fix: Guard de slug vazio adicionado no OrganizerLayout (redireciona para /dashboard)

## Implementação Completa — Engenharia Reversa v1 (22/03/2026)

### Bloco 1 — Perfil Contextual por Bolão
- [x] Procedure pools.getMemberProfile (stats, histórico, palpites por bolão)
- [x] Página PoolMemberProfile.tsx em /pool/:slug/player/:userId
- [x] Gráfico de evolução de pontos (AreaChart) no PoolMemberProfile
- [x] Breakdown de pontos por critério nos palpites recentes
- [x] Refatorar /profile/:userId — remover métricas agregadas, manter ficha leve
- [x] Atualizar links de perfil no PoolPage (ranking e membros) para /pool/:slug/player/:userId

### Bloco 2 — Notificações Frontend
- [x] Sino de notificações no AppShell com badge de contagem não lidas
- [x] Página /notifications com lista, marcar lida, marcar todas como lidas
- [x] Página /notification-preferences com toggles por canal e tipo

### Bloco 3 — Tela de Usuário Bloqueado
- [x] Página Suspended.tsx em /suspended
- [x] Guard no AppShell que redireciona isBlocked=true para /suspended

### Bloco 4 — Histórico de Palpites com Breakdown
- [x] Procedure bets.myHistory (palpites finalizados com breakdown por critério)
- [x] Página /pool/:slug/history no PoolPage com breakdown, ícone zebra, pontos por critério

### Bloco 5 — Regulamento Dinâmico por Bolão
- [x] Procedure pools.getScoringRulesPublic
- [x] Página /pool/:slug/rules no PoolPage exibindo os 7 critérios configurados pelo organizador

### Bloco 6 — Chaveamento Visual para Participante
- [x] Procedure pools.getBracket (fases e jogos em estrutura de árvore)
- [x] Página /pool/:slug/bracket no PoolPage com visualização da árvore eliminatória

### Bloco 7 — Upload de Avatar pelo Usuário
- [x] Procedure users.updateProfile (upload S3 + salvar URL)
- [x] Página /my-profile com upload de avatar no /profile/me com preview e remoção

### Bloco 8 — Recálculo Manual de Pontuação
- [x] Procedure tournaments.recalculatePool
- [x] Botão "Recalcular pontuação" no OrganizerDashboard ou AdminPools

### Bloco 9 — Importação via Google Sheets
- [x] Procedure tournaments.importFromSheets (URL → CSV → upsert jogos)
- [x] Modal de importação no AdminTournamentDetail com histórico de sincronizações

### Bloco 10 — Links Pessoais de Contato
- [x] Procedure users.updateContactLinks (whatsappLink, telegramLink)
- [x] UI de edição no /my-profile
- [x] Exibir links no PoolMemberProfile quando preenchidos

### Bloco 11 — Exportação CSV de Cliques em Anúncios
- [x] Procedure ads.clicksByDay + ads.recordClick
- [x] Botão "Exportar CSV" no AdminAds.tsx

### Bloco 12 — Analytics GA4 / Facebook Pixel
- [x] UI no AdminSettings para configurar gaMeasurementId e fbPixelId
- [x] Hook useAnalytics com trackEvent e fbTrack
- [x] Procedure system.getAnalyticsConfig + instrumentação: bet_placed, ranking_viewed, result_checked

## Sistema de Pontuação — Correções (22/03/2026)

### Divergências identificadas vs. documento SISTEMA-PONTUACAO-APOSTAI.md

- [ ] Fix engine: Critério 4 (diferença de gols) deve ser INDEPENDENTE do resultado — atualmente só pontua com resultado correto
- [ ] Fix engine: Critério 5 (gols de um time) deve ser INDEPENDENTE do resultado — atualmente ausente na engine
- [ ] Fix engine: Critério 6 (goleada) deve exigir diff≥4 no palpite E no resultado — atualmente ausente na engine
- [ ] Fix engine: Critério 2 (resultado correto) deve somar JUNTO com placar exato — atualmente é else if (mutuamente exclusivo)
- [ ] Fix engine: Zebra deve usar zebraRatio (0-1) calculado dinamicamente, não flag booleana isZebra
- [ ] Fix engine: Zebra deve respeitar zebraCountDraw e zebraThreshold do schema
- [ ] Fix valores padrão: totalGoalsPoints 2→3, goalDiffPoints 2→3, zebraPoints 3→1, zebraThreshold 70→75, oneTeamGoalsPoints 0→2, landslidePoints 0→5
- [ ] Fix schema: atualizar defaults no drizzle/schema.ts e aplicar migração SQL
- [ ] Fix processGameScoring: calcular zebraRatio dinamicamente antes de processar palpites
- [ ] Fix processGameScoring: passar zebraRatio e zebraCountDraw para calculateBetScore
- [ ] Fix ranking: critério de desempate deve seguir ordem: totalPoints → exactScoreCount → correctResultCount → createdAt
- [x] Reescrever scoring.test.ts com todos os 7 critérios e os 6 exemplos práticos do documento

## Breakdown de Pontos nos Cards de Jogo (22/03/2026)
- [x] Criar componente BetBreakdownBadges.tsx com ícones para cada critério
- [x] Integrar BetBreakdownBadges no PoolPage (cards de jogo)
- [x] Integrar BetBreakdownBadges no BetHistory (/pool/:slug/history)

## Reestruturação do Painel Admin (22/03/2026)
- [x] Reestruturar AdminLayout com grupos colapsáveis (Campeonato, Participantes, Comunicação, Financeiro, Configurações, Sistema)
- [x] AdminTournamentDetail.tsx já existia e cobre o módulo de Gerenciar Campeonato
- [x] Atualizar AdminUsers com painel lateral de detalhes (slide-in) e envio de notificação individual
- [x] Criar AdminMonetization.tsx (módulo Financeiro — guia informativo de estratégias)
- [x] Criar AdminIntegrations.tsx (módulo Integrações — GA4, Facebook Pixel)
- [x] Reescrever AdminAudit.tsx com labels legíveis e mapeamento de ações
- [x] Reescrever AdminSettings.tsx com campos de pontuação completos (oneTeam, landslide)
- [x] Atualizar procedures: demoteFromAdmin, removeUser, sendNotification, platform.updateSettings
- [x] Atualizar rotas no App.tsx para refletir nova estrutura

## Correção do Motor de Pontuação — Sprint 22/03/2026 (v2) ✅
- [x] Fix engine: Critério 2 (resultado correto) soma JUNTO com placar exato (já estava correto)
- [x] Fix engine: Critério 4 (diferença de gols) é INDEPENDENTE do resultado (já estava correto)
- [x] Fix engine: Critério 5 (gols de um time) é INDEPENDENTE do resultado (já estava correto)
- [x] Fix engine: Critério 6 (goleada) exige diff≥4 no palpite E no resultado (corrigido: era >=3)
- [x] Fix engine: Zebra usa losingRatio (0-1) calculado dinamicamente via calculateZebraContext
- [x] Fix engine: Zebra respeita zebraCountDraw e zebraThreshold do schema
- [x] Fix valores padrão: totalGoalsPoints=3, goalDiffPoints=3, zebraPoints=1, zebraThreshold=75, oneTeamGoalsPoints=2, landslidePoints=5 (já estavam corretos no schema)
- [x] Fix schema: defaults no drizzle/schema.ts para poolScoringRules verificados e corretos
- [x] Fix processGameScoring: calculateZebraContext já calcula losingRatio dinamicamente
- [x] Fix ranking: critério de desempate corrigido (removido totalBets, ordem: totalPoints → exactScoreCount → correctResultCount → createdAt)
- [x] Atualizar scoring.test.ts: 51 testes cobrindo todos os 7 critérios + 6 exemplos do documento (82 testes no total)

## Personalização de Zebra e Goleada (22/03/2026) ✅
- [x] Schema: adicionar coluna `landslideMinDiff` (int, default 4) em `pool_scoring_rules`
- [x] Schema: adicionar coluna `defaultLandslideMinDiff` (int, default 4) em `platform_settings`
- [x] Schema: adicionar coluna `defaultZebraThreshold` (int, default 75) em `platform_settings`
- [x] Migração SQL: colunas aplicadas no banco (landslideMinDiff, defaultLandslideMinDiff, defaultZebraThreshold)
- [x] scoring.ts: usar `rules.landslideMinDiff` no critério 6 (goleada) em vez de constante 4
- [x] scoring.ts: `zebraThreshold` passado corretamente via calculateZebraContext
- [x] OrganizerRules.tsx: campos `landslideMinDiff` (slider 2–8) e `zebraThreshold` (slider 50–95%) com simulador atualizado
- [x] AdminSettings.tsx: campos `defaultLandslideMinDiff` e `defaultZebraThreshold` padrão da plataforma
- [x] Procedure pools.updateScoringRules aceita landslideMinDiff, zebraThreshold, oneTeamGoalsPoints, landslidePoints
- [x] Procedure platform.updateSettings aceita defaultLandslideMinDiff e defaultZebraThreshold
- [x] scoring.test.ts: 8 novos testes cobrindo landslideMinDiff e zebraThreshold configuráveis (90 testes no total)
- [x] PoolRules.tsx: exibe oneTeamGoalsPoints, landslidePoints e landslideMinDiff para participantes

## Evolução do Sistema de Notificações (22/03/2026)

### Fase 1 — Schema e Banco
- [x] Schema: criar tabela `push_subscriptions` (endpoint, p256dh, auth, userAgent, userId)
- [x] Schema: adicionar campos push em `notification_preferences` (pushGameReminder, pushRankingUpdate, pushResultAvailable, pushSystem, pushAd)
- [x] Schema: adicionar campos `inAppAd`, `pushAd`, `emailAd` nas preferências
- [x] Schema: adicionar campo `reminderSentAt` em `games` para controle de lembretes
- [x] Migração SQL: aplicar todas as novas colunas e tabela no banco

### Fase 2 — Backend
- [x] Instalar dependência `web-push` para Web Push API
- [x] VAPID keys gerenciadas pelo superadmin no AdminSettings
- [x] Criar `server/push.ts` com helpers: sendPushToUser, broadcastPush, cleanExpiredSubscriptions
- [x] Router notifications expandido com: vapidPublicKey, subscribePush, unsubscribePush, savePreferences, list, markRead (ids[]), unreadCount, adminSend, triggerGameReminder, emailQueue, pushStats
- [x] Implementar `scheduleBetReminders` completo: join pool_members + users + enqueue email + in-app
- [x] Adicionar notificação in-app + push no setResult (admin) após recalcular pontos
- [x] Adicionar notificação in-app + push no setGameResult (organizador) após recalcular pontos
- [x] Verificar filtro de usuários bloqueados em todos os broadcasts
- [x] Adicionar procedure `notifications.triggerGameReminder` para lembrete manual

### Fase 3 — Frontend
- [x] Criar `client/public/sw.js` (Service Worker para push)
- [x] Atualizar `NotificationPreferences.tsx` para 15 campos com card de ativação push
- [x] Atualizar `Notifications.tsx`: rich text rendering, filtros por tipo, link para jogo
- [x] Atualizar `NotificationBell.tsx`: usar `notificationsV2.unreadCount` para polling eficiente
- [x] Registrar Service Worker no `main.tsx`

### Fase 4 — Admin
- [x] Atualizar `AdminBroadcasts.tsx`: seleção de canais (in-app/push/email), contadores de resultado
- [x] Adicionar aba "Fila de E-mails" no AdminBroadcasts com status e tentativas
- [x] Adicionar card "Push Stats" (assinaturas ativas) no AdminBroadcasts
- [x] Adicionar botão "Lembrete de Jogo" no AdminTournamentDetail para disparo manual

## Exclusão de Entidades — Sprint 23/03/2026
- [x] Backend: procedure pools.delete (organizador + superadmin, notifica participantes)
- [x] Backend: procedure tournaments.delete (superadmin, notifica organizadores de bolões vinculados)
- [x] Backend: procedure tournaments.deleteGame (superadmin)
- [x] Backend: procedure tournaments.deleteTeam (superadmin)
- [x] Frontend: PoolSettings — zona de perigo com AlertDialog de confirmação para excluir bolão
- [x] Frontend: AdminPools — botão de excluir por bolão com AlertDialog de confirmação
- [x] Frontend: AdminTournaments — botão de excluir por campeonato com AlertDialog de confirmação
- [x] Frontend: AdminTournamentDetail — botão de excluir por jogo (ícone hover) com AlertDialog
- [x] Frontend: AdminTournamentDetail — botão de excluir por time (ícone hover) com AlertDialog
- [x] Notificação automática aos participantes ao excluir bolão
- [x] Notificação automática aos organizadores ao excluir campeonato com bolões vinculados

## Melhorias Solicitadas — Sprint 23/03/2026

### Admin > Campeonatos
- [ ] Corrigir chaveamento Copa do Mundo 2026 (Quartas de Final faltantes)
- [ ] Fluxo de criação: Campeonato → Fases (chaveamento) → Jogos
- [ ] Bracket visual (wireframe de chaveamento) com slots "a definir" para fases eliminatórias
- [ ] Layout com accordion por fase (usabilidade)
- [ ] Editar/excluir jogo inline
- [ ] Editar/excluir fase e suas informações
- [ ] Atualização em lote de jogos (por grupo e por fase)
- [ ] Botão de geração automática da próxima fase a partir da classificação

### Admin > Bolões
- [ ] Painel gerenciável ao clicar no bolão (todas as ações de superadmin)
- [ ] Exibir: data de criação, qtde de participantes, botão "Acessar o bolão"
- [ ] Botão "Salvar" explícito após alterações no painel

### Admin > Usuários
- [ ] Acesso aos logs do usuário (ações, logins, alterações)

### Admin > Broadcasts
- [ ] Botão "ENVIAR" funcional
- [ ] Rich push notifications (in-app, push e e-mail com formatação)
- [ ] Tipos de notificação: Lembrete de jogo (auto), Resultado disponível (auto), Atualização de Ranking (auto), Publicidade (manual), Comunicação (manual)
- [ ] Preview da mensagem por canal

### Admin > Publicidade
- [ ] Toggle global ativo/inativo (publicidade ligada ou desligada na plataforma)
- [ ] Botão "Criar anúncio"
- [ ] Painel de posições e dimensões recomendadas
- [ ] Tabela gerencial: Prévia | Título | Posição | Device | Período | Intervalo | Cliques | Status | Exibir/Não exibir | Editar | Excluir
- [ ] Posições: Topo, Lateral (desktop), Entre seções (configurável por página/bloco), Rodapé, Pop Up (frequência configurável)
- [ ] Suporte a imagens e vídeos (vídeo reproduz completo antes de avançar)
- [ ] Campo de link clicável
- [ ] Seleção de dispositivo: todos / mobile / desktop
- [ ] Agendamento de veiculação (início e fim)
- [ ] Carrossel automático quando há mais de 1 material (tempo configurável)

### Admin > Monetização
- [ ] REMOVER tela de Monetização do menu

### Admin > Configurações
- [ ] Botão "SALVAR" explícito para qualquer alteração

### Admin > Integrações
- [ ] Botão "SALVAR" explícito para qualquer alteração

### Admin > Logs de Auditoria
- [ ] Structured Logging em JSON
- [ ] Campos obrigatórios: userId, userName, action, correlationId, payload, level (info/warn/error), timestamp
- [ ] Registrar diff de banco: quem mudou, quando, valor anterior vs novo

## Novas Funcionalidades — Sprint 23/03 (tarde)

- [ ] AdminTournaments: botão +Novo Campeonato com modal (nome, slug, país, temporada, global/personalizado, datas)
- [ ] AdminPools: botão +Novo Bolão com modal (nome, campeonato, tipo de acesso, plano)
- [ ] Backend: procedure pools.adminCreate para criação de bolão pelo superadmin
- [ ] Backend: captura de IP real (x-forwarded-for) nos procedures críticos (block_user, delete_pool, delete_tournament, set_result, broadcast)
- [ ] AdminAds: botão +Novo Anúncio com modal completo (título, URL, imagem, posição, device, período, tipo)
- [ ] Frontend: componente AdBanner que respeita posição, device, período e toggle global adsEnabled
- [ ] Frontend: integrar AdBanner nas posições definidas (topo, entre jogos, lateral, popup)
- [ ] Frontend: filtrar anúncios por device (mobile/desktop/all) e período (startAt/endAt)

## Correção de Botões Mobile — Sprint 23/03/2026 (v2)
- [x] AdminBroadcasts: botão Enviar Broadcast movido para fora dos cards, sempre visível abaixo do Preview em mobile (h-12, text-base)

## Correção de Botões Mobile — Sprint 23/03/2026
- [x] AdminTournaments: botão +Novo Campeonato separado do Importar CSV, sempre visível no mobile (shrink-0)
- [x] AdminPools: botão +Novo Bolão separado dos filtros de status, sempre visível no mobile (shrink-0)
- [x] AdminAds: botão +Novo Anúncio separado do Exportar CSV, sempre visível no mobile (shrink-0)
- [x] AdminSettings: botão Salvar com shrink-0 e texto abreviado em mobile (sm:hidden/sm:inline)
- [x] AdminIntegrations: botão Salvar com shrink-0 e texto abreviado em mobile (sm:hidden/sm:inline)

## Campeonatos — Sprint 23/03/2026 (tarde)
- [x] Chaveamento Copa do Mundo: Quartas de Final já estava correto no banco (phase_id: 30001, key: quarter_finals, order: 15, slots: 4)
- [x] Fluxo de criação em 3 etapas: wizard modal (Informações → Fases → Jogos) no AdminTournaments
- [x] Atalhos de template no wizard: Copa do Mundo (14 fases) e Liga (3 fases)
- [x] Bracket visual: exibe slots vazios "A Definir" mesmo sem jogos cadastrados (baseado em phase.slots)
- [x] Botão Gerar próxima fase: disponível para qualquer fase com jogos encerrados (não só eliminatórias)
- [x] Editar/excluir jogo individualmente (já existia via ícone hover)
- [x] Atualização em lote por fase (já existia via botão ⚡)
- [x] Editar/excluir fase (já existia)
- [x] Layout accordion por fase (já existia)

## Correções de Chaveamento Copa do Mundo — Sprint 23/03/2026 (noite)
- [x] Semifinais: slots corrigidos de 8 para 4 (2 jogos × 2 times)
- [x] Quartas de Final: removidas 4 duplicatas (ids 30001-30004 sem matchNumber)
- [x] Semifinais: removidos 4 jogos duplicados/mal classificados (ids 97-100)
- [x] Chaveamento final: 72 jogos de grupos (12×6) + 16 Rodada de 32 + 8 Oitavas + 4 Quartas + 2 Semifinais + 1 Disputa 3º Lugar + 1 Final = 104 jogos totais

## Perfil do Usuário — Sprint 23/03/2026
- [x] Gráfico de evolução de pontos: adicionar seletor de bolão para visualização por bolão individual (em vez de somar pontos de todos os bolões)

## Sprint 23/03/2026 — Tarde (Publicidade e Bolões)
- [x] AdminPools Sheet: lista de participantes com avatar, nome e badge de organizador
- [x] AdminAds: prévia de vídeo na tabela (tag <video> para tipo video)
- [x] AdminAds: campos avançados disponíveis também na criação de anúncio
- [x] AdBanner: componente criado com carrossel automático, suporte a imagem/vídeo/script, popup, filtro por device
- [x] AdBanner: integrado no Dashboard (entre seções)
- [x] AdBanner: integrado no PoolPage (topo da aba de jogos)

## Sprint 23/03/2026 — Noite
- [x] Fix: AdminPools retornando "nenhum bolão cadastrado" mesmo com bolões existentes
- [x] AdBanner: integrar no sidebar do AppShell (desktop)
- [x] AdminUsers: aba de logs de atividade por usuário (logins, palpites, alterações)

## Sprint 23/03/2026 — Correção urgente
- [x] Fix: AdminPools ainda retorna lista vazia (2 errors na prévia) após correção anterior

## Sprint 23/03/2026 — Rich Notifications
- [x] Broadcast: editor rich notification com preview em tempo real
- [x] Broadcast: categorias (Lembrete de jogo, Resultado disponível, Atualização do Ranking, Publicidade, Comunicação)
- [x] Broadcast: campos icon, imageUrl, actionUrl, actionLabel, priority no schema

## Sprint 23/03/2026 — Broadcast Rich Editor + Auto-notificações
- [x] Broadcast: remover categorias automáticas do seletor manual (manter só Publicidade e Comunicação)
- [x] Broadcast: implementar disparos automáticos (game_reminder, result_available, ranking_update) via crons/hooks
- [x] Broadcast: editor rich text com toolbar (negrito, itálico, tachado, código, listas, links, emojis)
- [x] Broadcast: upload de mídia (imagem, vídeo, áudio) e documentos (PDF) no editor
- [x] Broadcast: preview renderizado (Markdown/rich text) em tempo real, mobile-first

## Sprint 23/03/2026 — Mensagens Automáticas no Broadcast
- [x] Schema: tabela `notification_templates` (type, title, body, enabled, variables)
- [x] Backend: procedures getTemplates, updateTemplate, toggleTemplate
- [x] AdminBroadcasts: aba "Automáticas" com toggle Liga/Desliga por tipo
- [x] AdminBroadcasts: editor de personalização de texto por tipo (campos por canal)
- [x] AdminBroadcasts: tabela de variáveis disponíveis por tipo de mensagem
- [x] Backend: usar templates personalizados nos disparos automáticos (scoring.ts, email.ts)

## Sprint 23/03/2026 — Fix Campeonatos
- [x] Fix: jogos do torneio Copa do Mundo FIFA (id=2) não aparecem em Admin > Campeonatos (match por phase.key em vez de phase.label)

## Sprint 23/03/2026 — Fix Exclusão de Torneio
- [x] Fix: erro ao excluir torneio — FK constraint da tabela tournament_phases bloqueava a exclusão; corrigido deletando fases antes do torneio

## Sprint 24/03/2026 — Fix Exclusão de Torneio (definitivo)
- [x] Fix: exclusão do torneio id=1 corrigida — pools desvinculados (tournamentId=NULL) + sheets_sync_log deletado antes do torneio

## Sprint 24/03/2026 — Fix Exclusão de Torneio (cascata completa)
- [x] Fix: exclusão de torneio agora deleta em cascata completa: bets, pool_member_stats, pool_scoring_rules, pool_members, pools, sheets_sync_log, games, teams, tournament_phases, tournaments

## Sprint 24/03/2026 — Fix Bolões Públicos
- [x] Fix: bolões públicos não apareciam na busca — subquery usava pm.pool_id (snake_case) em vez de pm.poolId (camelCase)

## Sprint 24/03/2026 — Auditoria Global de Subqueries
- [x] Auditoria: mapear e corrigir todos os subqueries raw com snake_case incorreto no backend — apenas 2 ocorrências encontradas (pm.pool_id), ambas já corrigidas. Demais sql<> usam interpolação Drizzle (segura).

## Correção do Fluxo de Bolões Públicos (23/03/2026)
- [x] Criar procedure pools.joinPublic no backend (aceita slug, verifica accessType=public, adiciona membro)
- [x] Trocar botão "Ver bolão →" por "Quero participar!" no PublicPools.tsx
- [x] Fazer o join automático antes de navegar para o bolão

## Melhorias na Tela de Bolões Públicos (24/03/2026)
- [x] Backend: incluir campo isMember na procedure listPublic para indicar se o usuário já participa do bolão
- [x] Frontend: modal de confirmação antes de entrar (card com detalhes do bolão + botão confirmar)
- [x] Frontend: indicador "Você já participa" nos cards onde o usuário já é membro (badge + link direto)

## Indicadores de Status nos Cards de Bolões Públicos (24/03/2026)
- [x] Backend: incluir totalGames, finishedGames e nextMatchDate na procedure listPublic
- [x] Frontend: badge "Aguardando início" quando nenhum jogo foi realizado
- [x] Frontend: barra de progresso com percentual de conclusão quando o bolão já iniciou

## Redesign Digital-First da Página do Bolão (24/03/2026)
- [x] Hero com gradiente, logo, nome, campeonato e pontuação do usuário em destaque
- [x] Navegação por abas redesenhada com indicador expressivo
- [x] Cards de jogos em layout 3 colunas (Time A | Palpite | Time B)
- [x] Ranking com pódio visual para os 3 primeiros
- [x] Aba Membros compacta com avatar e nome clicável
- [x] Menu de ações contextuais (Meus Palpites, Chaveamento, Regulamento)

## Agrupamento de Jogos por Fase/Rodada (24/03/2026)
- [x] Detectar se o torneio tem fases distintas (fase != "group_stage" ou múltiplas fases)
- [x] Agrupar jogos por fase com cabeçalhos colapsáveis quando há chaveamento
- [x] Implementar "mostrar mais" com colapso por rodada quando não há fases distintas (apenas group_stage)
- [x] Fase ativa (com jogos abertos ou ao vivo) expandida por padrão, demais colapsadas

## Revisão Completa da Página do Bolão — 10 Correções (24/03/2026)
- [x] [CTO] Inferir tipo de game em GameCardProps do retorno da procedure getBySlug
- [x] [Fullstack] Criar procedure myPoolPosition (posição e pontos do usuário no bolão)
- [x] [Fullstack] Carregar myPoolPosition junto com dados principais (sem depender da aba Ranking)
- [x] [Fullstack+Product] Atualização otimista no placeBet (botão muda imediatamente)
- [x] [Product] Trocar texto "Apostar" por "Salvar palpite" / "Atualizar palpite"
- [x] [UX] Aumentar inputs de placar para h-11 (44px mínimo para toque)
- [x] [Product+Design] Indicador de urgência para jogos com prazo < 2h (âmbar) e < 30min (vermelho)
- [x] [Design+QA] Pódio adaptável: funcionar com 1, 2 ou 3 participantes
- [x] [UX] Mover AdBanner para o final da lista de jogos
- [x] [Design] Corrigir contraste do 2º lugar no pódio (gray-400 → slate-300)
- [x] [CSO] Mascarar token de convite no hero com botão "Revelar"
- [x] [QA] Fallback visual para imagem de time com erro (img onError)

## Sistema de Badges Configuráveis

- [x] [CTO] Adicionar tabelas `badges` e `user_badges` ao schema Drizzle
- [x] [CTO] Gerar e aplicar migração SQL
- [x] [Fullstack] Procedures CRUD de badges para admin (criar, editar, listar, ativar/desativar)
- [x] [Fullstack] Endpoint de upload de SVG para S3
- [x] [Fullstack] Função `calculateAndAssignBadges(userId)` no server/badges.ts
- [x] [Fullstack] Verificação retroativa ao publicar badge com retroatividade ativada
- [x] [Fullstack] Integrar motor de atribuição ao fluxo de pontuação pós-jogo
- [x] [Fullstack] Adicionar campo `badges` ao retorno de `getPublicProfile`
- [x] [Admin UI] Página de gestão de badges no painel admin (AdminBadges.tsx)
- [x] [Admin UI] Formulário de criação/edição com upload SVG e preview
- [x] [Design] Componente `BadgeGrid` com badges conquistados vibrantes e não conquistados transparentes
- [x] [Frontend] Integrar BadgeGrid no perfil público `/profile/me`
- [x] [QA] Testes unitários para calculateAndAssignBadges (badges.test.ts — 12 testes)

## Sprint 24/03/2026 — Melhorias do Sistema de Badges

- [x] [Fullstack] Notificação in-app ao desbloquear badge com imageUrl, actionUrl=/profile/me, priority=high, category=badge_unlocked
- [x] [Frontend] Exibir BadgeGrid no PoolMemberProfile (/pool/:slug/player/:userId) com modo compact
- [x] [Backend] getMemberProfile agora retorna campo badges com status de conquista
- [x] [Seed] 5 badges criados no banco: Atirador de Elite, Mestre dos Placares, Zebra Hunter, Campeão Serial, Maratonista
- [x] [QA] 8 novos testes para notificação e badges de exemplo (110 testes no total)

## Sprint 24/03/2026 — Correção do Slug de Perfil Público

- [x] [Frontend] handleShare no PublicProfile usa /profile/{id} numérico + toast "Qualquer pessoa pode acessar"
- [x] [Frontend] /profile/me sem login exibe mensagem amigável em vez de loading infinito
- [x] [Frontend] Link "Ver perfil completo" no PoolMemberProfile usa /profile/{currentUser.id}
- [x] [Frontend] Botão "Ver perfil público" no Dashboard usa /profile/{user.id}

## Sprint 24/03/2026 — Fix Bolões Excluídos no Perfil Público

- [x] [Fullstack] getPublicProfile: filtrar bolões com status != 'deleted' na seção "Bolões que participa"
- [x] [Fullstack] getUserActivity (admin): filtrar bolões deletados na lista de bolões do usuário
- [x] [Fullstack] myPools já filtrava corretamente (status = 'active' via getPoolsByUser)

## Sprint 24/03/2026 — Auditoria de Bolões Deletados em Todas as Telas

- [x] [Fullstack] getPoolById e getPoolBySlug: filtro status != 'deleted' aplicado na camada db.ts (cobre automaticamente getBySlug, getMemberProfile, getScoringRulesPublic, getBracket e todas as procedures que usam essas funções)
- [x] [Fullstack] getPoolByInviteToken/getPoolByInviteCode: já verificavam status == 'active', sem alteração necessária
- [x] [Fullstack] listPublic: já filtrava status == 'active', sem alteração necessária
- [x] [Fullstack] joinPublic/joinByCode/joinByToken: já verificavam status == 'active', sem alteração necessária
- [x] [Fullstack] recalculatePool (admin): filtro status != 'deleted' adicionado

## Sprint 24/03/2026 — Dashboard: Gráficos Melhorados

- [x] [Backend] myStats: radarData adicionado (Placar Exato, Resultado, Zebra, Goleada, Dif. Gols em %)
- [x] [Backend] myStatsByPool: radarData filtrado por bolão adicionado
- [x] [Frontend] Gráfico de evolução: opção "Todos os bolões" removida; estado vazio com atalhos de bolões ativos
- [x] [Frontend] Estado vazio do gráfico: cards clicáveis dos bolões ativos como atalho de seleção
- [x] [Frontend] Gráfico de radar: RadarChart com perfil de apostador (Recharts, 5 dimensões)
- [x] [Frontend] Radar contextual: stats do bolão selecionado ou stats globais com label dinâmico
- [x] [Frontend] Avatar real do usuário exibido no card de perfil (com fallback para iniciais)

## Sprint 24/03/2026 — Fix Palpites Recentes de Bolões Excluídos

- [x] [Fullstack] recentBets (Dashboard): innerJoin com pools adicionado, filtra status != 'deleted'
- [x] [Fullstack] recentBets (Admin/getUserActivity): innerJoin com pools adicionado, filtra status != 'deleted'
- [x] [Fullstack] pointsHistory em myStats: innerJoin com pools adicionado, filtra status != 'deleted'
- [x] [Fullstack] pointsHistory em myStatsByPool: já filtrava por poolId específico (bolão já deletado não seria acessado)
- [x] [Fullstack] getMemberProfile/recentBets: opera dentro de um bolão específico via poolId, sem risco

## Sprint 24/03/2026 — Dashboard: Ranking e Palpites Pendentes

- [x] [Backend] myPools: rankPosition, totalMembers e pendingBetsCount calculados por bolão via Promise.all
- [x] [Frontend] Cards de bolão: posição no ranking com medalhas 🥇🥈🥉 para top 3 e "º de N" para demais
- [x] [Frontend] Cards de bolão: badge laranja com contador de palpites pendentes no ícone do bolão + texto "X palpites pendentes"

## Sprint 24/03/2026 — Reformulação /my-profile

### Bugs
- [x] [Fullstack] Anti-pattern setState no render removido (campos de contato eliminados)
- [x] [Fullstack] Contador de bolões usa stats.poolsCount corretamente

### Remoções
- [x] [Frontend] Seção de links de contato (WhatsApp/Telegram) removida
- [x] [Backend] Campos whatsappLink/telegramLink removidos da procedure updateProfile

### Programa de Convites Member-Get-Member
- [x] [CTO] Tabela `referrals` adicionada ao schema Drizzle e migração aplicada
- [x] [Backend] Procedure `users.getMyInviteCode` — gera/retorna código único por usuário
- [x] [Backend] Procedure `users.getMyReferralStats` — conta convites aceitos com lista de convidados
- [x] [Backend] Procedure `users.useInviteCode` — registra uso do código e dispara calculateAndAssignBadges
- [x] [Backend] Badge "Líder de Torcida" criado no banco (referrals_count, threshold=5, retroativo=true)
- [x] [Backend] Critério referrals_count adicionado ao checkCriterion no badges.ts
- [x] [Frontend] Seção de convites: link pessoal, contador, barra de progresso 0/5, lista de convidados, badge preview

### Melhorias UX/Design
- [x] [Frontend] Layout duas colunas em desktop (1/3 perfil+stats+plano | 2/3 convites+notif+conta)
- [x] [Frontend] Preview local imediato do avatar (URL.createObjectURL antes do upload)
- [x] [Frontend] Botão "Ver perfil público" no header da página
- [x] [Frontend] Taxa de acerto (accuracy rate) nos stats em vez de contador de exatos brutos
- [x] [Frontend] Seção de preferências de notificação com toggles (4 categorias in-app)
- [x] [Frontend] Seção de informações da conta (nome, email, membro desde, plano)

### Monetização
- [x] [Frontend] Card de plano com status, data de expiração e CTA de upgrade para usuários Free
- [x] [Frontend] CTA de upgrade com gradiente amarelo/laranja e copy contextualizado
- [x] [Frontend] Link "Ver histórico de pagamentos" visível apenas para usuários Pro/Unlimited

## Sprint 24/03/2026 — Referral OAuth + Notificação Líder de Torcida

- [x] [Frontend] Hook `useReferralCapture` criado: captura `?ref=CODIGO` da URL, salva no localStorage com TTL de 7 dias, limpa o parâmetro da URL sem recarregar
- [x] [Frontend] Após login OAuth, hook detecta novo usuário (conta criada há < 60s) e chama `users.useInviteCode` automaticamente
- [x] [Frontend] Hook registrado globalmente no `App.tsx` via `useReferralCapture()` no `Router`
- [x] [Backend] `useInviteCode` já prevenia duplicatas (isNull(inviteeId) + inviterId !== newUserId)
- [x] [Backend] Notificação de progresso a cada convite aceito ("Faltam X cadastros")
- [x] [Backend] Notificação de celebração ao atingir exatamente 5 convidados (priority=high, category=badge_unlocked)

## Sprint 24/03/2026 — Melhorias do Menu de Navegação (AppShell)

- [x] [Frontend] Item "Ranking" adicionado ao menu (rota /ranking, ícone Medal)
- [x] [Frontend] "Meus Bolões" renomeado para "Dashboard"
- [x] [Frontend] Item "Meu Perfil" removido da lista de nav (card do topo já é o acesso)
- [x] [Frontend] Separador visual com label "Ações" entre seções e ações
- [x] [Frontend] Estado ativo corrigido para rotas filhas via matchFn (cobre /pool/:slug e todas as sub-rotas)
- [x] [Frontend] Badge vermelho de notificações não lidas no botão de menu mobile (top bar)

## Sprint 24/03/2026 — Submenu de Ranking no AppShell

- [x] [Frontend] Item "Ranking" virou grupo colapsável com chevron animado
- [x] [Frontend] Submenu "Global" → /ranking
- [x] [Frontend] Submenu por bolão ativo → /pool/:slug?tab=ranking com posição #N visível
- [x] [Frontend] Estado ativo do grupo e submenus via matchFn
- [x] [Frontend] Estado vazio: "Entre em um bolão para ver seu ranking"
- [x] [Frontend] PoolPage: lê ?tab= da URL para abrir aba correta ao chegar pelo menu
- [x] [Backend] myPools reutilizado no AppShell (já retorna pool.slug, pool.name e rankPosition)
