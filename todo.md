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
- [x] Procedure users.globalRanking (top apostadores da plataforma) — mantida no backend para uso futuro
- [ ] Admin: formulário inline para adicionar times a campeonatos
- [ ] Admin: formulário inline para adicionar jogos a campeonatos
- [ ] Admin: visualização de bracket/chaveamento por fase
- [x] Rota /upgrade independente de bolão específico
- [x] Banner de upgrade Pro no Dashboard (para usuários sem plano Pro)
- [x] Links de perfil público nos rankings dos bolões
- [x] Página de Ranking Global /ranking — REMOVIDA (feature não agrega valor ao produto)
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

## Sprint 24/03/2026 — Remoção do Ranking Global

- [ ] [Frontend] Remover item "Global" do submenu de Ranking no AppShell
- [ ] [Frontend] Se não houver bolões ativos, ocultar o grupo "Ranking" completamente do menu
- [ ] [Frontend] Remover rota /ranking do App.tsx
- [ ] [Frontend] Remover link para /ranking de qualquer outro lugar na aplicação
- [ ] [Backlog] Ideia futura: ranking de badges (quem tem mais badges, ranking por tipo de badge)

## Sprint 24/03/2026 — Redirect pós-OAuth

- [x] [Backend] Callback OAuth redireciona para /dashboard em vez de / (Landing Page)

## Remoção do Ranking Global — Sprint 24/03/2026 ✅
- [x] Remover rota /ranking do App.tsx
- [x] Remover import GlobalRanking do App.tsx
- [x] Deletar arquivo GlobalRanking.tsx
- [x] Remover item "Global" do grupo colapsável Ranking no AppShell
- [x] Grupo Ranking no AppShell agora exibe apenas bolões ativos do usuário
- [x] Grupo Ranking oculto automaticamente quando usuário não tem bolões ativos
- [x] Remover teaser "Ranking Global" do PublicProfile.tsx
- [x] 110 testes passando, 0 erros TypeScript

## Backlog — Ideias Futuras
- [ ] IDEIA: Ranking por Badges — classificação dos apostadores com mais conquistas/badges desbloqueados (alternativa ao ranking global por pontos, mais engajante e gamificado)
- [ ] IDEIA: Persistência do estado do menu colapsável (localStorage) para que o usuário não precise reabrir sempre
- [ ] IDEIA: Seções de bolões no menu principal (padrão Slack/Linear) para acesso direto
- [ ] IDEIA: Otimização da página /pools/public com filtros avançados e paginação infinita

## Decisões de Produto — Módulo Organizer (24/03/2026)

### Segmentação Free vs Pro (validada)
- Comunicação com membros (notificação in-app + e-mail) → exclusivo Plano Pro
- QR Code de convite → removido do escopo atual (backlog futuro)

### Sprint A — Correções Críticas (bugs que quebram o produto)
- [ ] A1 — SubscriptionPage: corrigir useParams de poolId para slug
- [ ] A2 — tournaments.create/addTeam/addGame: converter de adminProcedure para protectedProcedure com validação de organizador Pro
- [ ] A3 — Dashboard Organizer: implementar lógica real de "Participantes Inativos" (sem palpite nos últimos 3 jogos)
- [ ] A4 — Membros: implementar filtro "Inativos" com base em lastBetAt
- [ ] A5 — CustomTournament: salvar campo format no schema e payload de create
- [ ] A6 — OrganizerLayout/Dashboard: calcular isProExpired a partir de planExpiresAt real

### Sprint B — Funcionalidades Essenciais
- [ ] B1 — Nova seção "Jogos" (/pool/:slug/manage/games): lista de jogos + formulário de placar inline [Pro]
- [ ] B2 — Nova seção "Comunicação" (/pool/:slug/manage/messages): notificação in-app + e-mail para membros [Pro]
- [ ] B3 — Encerramento do bolão: card "Zona de Perigo" em Identidade com botões Encerrar/Excluir [Free + Pro]
- [ ] B4 — Exibir planExpiresAt no Dashboard e tela de Plano com alerta visual em < 7 dias [Pro]
- [ ] B5 — Membros: linkar "Ver perfil" para /u/:username [Free + Pro]
- [ ] B6 — Membros: implementar ação "Bloquear membro" via updateUserBlocked [Free + Pro]
- [ ] B7 — Regras: adicionar slider de bettingDeadlineMinutes na UI [Pro]

### Sprint C — Experiência Avançada
- [ ] C1 — CustomTournament: vincular automaticamente campeonato ao bolão ao finalizar wizard [Pro]
- [ ] C2 — Acesso: criar procedure pools.regenerateAccessCode dedicada [Free + Pro]
- [ ] C3 — Acesso: criar procedure pools.getAccessStats (total Free; série temporal Pro) [Free + Pro]
- [ ] C4 — OrganizerLayout: reorganizar sidebar com grupos colapsáveis [Free + Pro]

## Sprint A — Correções Críticas do Módulo Organizer (24/03/2026)

- [x] A1 — SubscriptionPage: corrigir parâmetro de rota poolId → slug (upgrade funcionando)
- [x] A2 — tournaments.create/addTeam/addGame: converter para protectedProcedure com validação de organizador Pro
- [x] A3 — Dashboard: lógica real de inativos (sem palpite nos últimos 3 jogos encerrados)
- [x] A4 — OrganizerMembers: filtro "Inativos" funcional usando isInactive do servidor
- [x] A5 — Campo format salvo no campeonato (schema + migração SQL + procedure + frontend)
- [x] A6 — isProExpired calculado a partir de planExpiresAt real (OrganizerDashboard + OrganizerRules)

## Sprint B — Funcionalidades Essenciais do Módulo Organizer (24/03/2026)

- [x] B1 — Tela OrganizerGames: gestão de jogos e resultados (Pro) com setGameResult
- [x] B2 — Tela OrganizerCommunication: broadcasts in-app para membros (somente Pro)
- [x] B3 — Encerramento do bolão: procedure closePool + dialog de confirmação + notificação de membros com pódio
- [x] B4 — Vinculação automática do campeonato ao bolão após wizard (pools.update aceita tournamentId)
- [x] B5 — Regeneração de código/link de acesso: procedure dedicada regenerateAccessCode (sem depender de mudança de accessType)
- [x] B6 — Estatísticas reais de ingresso por canal: procedure getAccessStats + campo joinSource no schema + migração aplicada

## Sprint C — Experiência Avançada do Módulo Organizer (24/03/2026) ✅

- [x] C1 — Sidebar do Organizer com grupos colapsáveis (Visão Geral / Participantes / Configuração / Financeiro)
- [x] C2 — Prazo de palpite configurável na UI: slider bettingDeadlineMinutes (0–120 min) na tela de Regras (Pro)
- [x] C3 — Gráfico de ingressos por dia (série temporal 7 dias, Pro) na tela de Acesso; teaser para Free

## Sprint 24/03/2026 — Ciclo Stripe (melhorias pós-auditoria)

- [x] Stripe: rebaixamento gracioso — aguardar 3 tentativas (attempt_count >= 3) antes de rebaixar para Free no invoice.payment_failed
- [x] Stripe: notificação de renovação bem-sucedida no invoice.paid (subscription_cycle)
- [x] Stripe: success_url e cancel_url usando slug do bolão em vez de ID numérico

## Sprint 24/03/2026 — Badges no Dashboard

- [x] Dashboard: seção de badges com carrossel de dois estados (Conquistados / Próximos com barra de progresso)

## Sprint 24/03/2026 — Visual Badges Dashboard

- [x] Dashboard: refatorar carrossel de badges para usar visual idêntico ao PublicProfile (BadgeGrid), com badges inativos visíveis quando não há nenhum conquistado

## Sprint 24/03/2026 — Página de Conquistas

- [x] Procedure badges.myProgress: progresso individual, histórico e estatísticas da plataforma
- [x] Página /conquistas: seção 1 — grade hexagonal com progresso por badge
- [x] Página /conquistas: seção 2 — histórico de conquistas com data e contexto do bolão
- [x] Página /conquistas: seção 3 — comparação com a plataforma (% de usuários com cada badge, com fallback)
- [x] Rota /conquistas registrada no App.tsx + item no AppShell + link no DashboardBadgeCarousel

## Sprint 24/03/2026 — Reestruturação Super Admin (A–G)

### Backend (Procedures)
- [x] A. platform.getGrowthSeries — série temporal real (usuários, bolões, palpites por mês)
- [x] A. platform.getStats — enriquecer com MRR, DAU, WAU, taxa conversão Free→Pro
- [x] B. platform.getSubscriptionStats — MRR, ARR, churn rate, ticket médio, alertas vencimento
- [x] D. platform.getSystemHealth — fila email, jobs pontuação, push subscriptions, erros recentes
- [x] E. platform.getReferralStats — ranking convitadores, taxa conversão, top códigos

### Frontend — Dashboard Global (A + G)
- [x] A. AdminDashboard: substituir mock data por série temporal real do banco
- [x] A. AdminDashboard: cards MRR, DAU, WAU, taxa conversão
- [x] G. AdminDashboard: Quick Actions (jogos pendentes, broadcast urgente, último erro)
- [x] G. AdminDashboard: alertas contextuais (bolões expirando, fila de email acumulada)

### Frontend — Assinaturas (B)
- [x] B. AdminSubscriptions: reescrever com MRR/ARR/churn calculados do banco
- [x] B. AdminSubscriptions: lista com status visual (ativa, em risco, cancelada, vencendo)
- [x] B. AdminSubscriptions: link direto para Stripe Dashboard por assinatura
- [x] B. AdminSubscriptions: alertas de assinaturas vencendo em 7 dias

### Frontend — Resultados em Lote (C)
- [x] C. Nova seção AdminGameResults: filtro campeonato + fase, grid inline de resultados
- [x] C. Batch save de resultados com recálculo automático de pontuação
- [x] C. Rota /admin/game-results + item no AdminLayout

### Frontend — Saúde do Sistema (D)
- [x] D. Nova seção AdminSystemHealth: fila email, jobs, push, erros recentes
- [x] D. Rota /admin/system + item no AdminLayout (grupo Sistema)

### Frontend — Programa de Convites (E)
- [x] E. Nova seção AdminReferrals: ranking convitadores, taxa conversão, top códigos
- [x] E. Rota /admin/referrals + item no AdminLayout (grupo Participantes)

### Frontend — Logs de Auditoria melhorados (F)
- [x] F. AdminAudit: paginação real (cursor-based, não carregar 500 de uma vez)
- [x] F. AdminAudit: filtro por admin (quem executou a ação)
- [x] F. AdminAudit: export CSV dos logs filtrados

## Sprint 1 — Super Admin Crítico (24/03/2026)

### Backend — Procedures novas/melhoradas
- [x] platform.getGrowthSeries — série temporal real (usuários, bolões, palpites por mês, últimos 6 meses)
- [x] platform.getStats — enriquecer com MRR estimado, DAU, WAU, funil Free→Pro
- [x] platform.getSubscriptionStats — MRR, ARR, churn rate, ticket médio, alertas vencimento 7 dias
- [x] platform.getSystemHealth — fila email (pending/sent/failed), jobs cron status, push subscriptions, erros recentes
- [x] platform.getReferralStats — ranking convitadores, taxa conversão, totais
- [x] adminDashboard.getAuditLogsPaged — paginação cursor-based com nome do admin
- [x] adminDashboard.getPendingGames — jogos pendentes de resultado por campeonato/fase

### Frontend — Dashboard Global
- [x] AdminDashboard: substituir mock data por série temporal real
- [x] AdminDashboard: cards MRR, DAU, WAU, taxa conversão Free→Pro
- [x] AdminDashboard: seção Quick Actions (jogos pendentes, último erro, broadcast urgente)
- [x] AdminDashboard: alertas contextuais (bolões expirando hoje, fila email acumulada, jogos sem resultado há 24h)

### Frontend — Assinaturas (reescrita)
- [x] AdminSubscriptions: cards MRR, ARR, churn rate, ticket médio
- [x] AdminSubscriptions: lista com status visual (ativa/vencendo/cancelada) e alertas de 7 dias
- [x] AdminSubscriptions: ação de upgrade manual de plano de bolão
- [x] AdminSubscriptions: link direto para Stripe Dashboard por assinatura

### Frontend — Resultados em Lote (nova seção)
- [x] AdminGameResults: nova página /admin/game-results
- [x] AdminGameResults: filtro por campeonato + fase/rodada
- [x] AdminGameResults: grid inline de resultados com salvar em lote
- [x] AdminLayout: adicionar "Registrar Resultados" no grupo Campeonato

### Frontend — Saúde do Sistema (nova seção)
- [x] AdminSystemHealth: nova página /admin/system
- [x] AdminSystemHealth: cards de fila de email (pending/sent/failed/hoje)
- [x] AdminSystemHealth: status dos 3 cron jobs (email queue, bet reminders, plan expiry)
- [x] AdminSystemHealth: push subscriptions ativas e falhas recentes
- [x] AdminSystemHealth: últimos 5 erros dos logs de auditoria
- [x] AdminLayout: adicionar "Saúde do Sistema" no grupo Sistema

### Frontend — Usuários melhorado
- [x] AdminUsers: botão export CSV da lista filtrada
- [ ] AdminUsers: filtro por inatividade (sem login há 7/30/90 dias) — Sprint 2
- [ ] AdminUsers: ação "Forçar logout" no painel de detalhes do usuário — Sprint 2

### Frontend — Logs de Auditoria melhorado
- [x] AdminAudit: paginação real (50 por vez + botão carregar mais)
- [x] AdminAudit: nome do admin visível em cada log
- [ ] AdminAudit: botão export CSV dos logs filtrados — Sprint 2

### Frontend — Programa de Convites (nova seção)
- [x] AdminReferrals: nova página /admin/referrals com ranking e taxa de conversão
- [x] AdminLayout: adicionar "Convites" no grupo Participantes

### Frontend — Bolões melhorado
- [ ] AdminPools: filtro por plano (free/pro) e status combinados — Sprint 2
- [ ] AdminPools: ação de upgrade manual de plano diretamente na lista — Sprint 2

## Sprint 2 — Super Admin Complementar (a definir)
- [ ] AdminReferrals: nova seção /admin/referrals com ranking e taxa de conversão
- [ ] AdminImportLog: nova seção /admin/import-log com histórico de sincronizações Google Sheets
- [ ] AdminSettings: gestão manual de planos de usuário (unlimited para testes)
- [ ] AdminSettings: feature flags básicos (habilitar/desabilitar funcionalidades por grupo)
- [ ] AdminLayout: reorganizar sidebar com 7 grupos finais

## Sprint 2 — Super Admin Complementar (24/03/2026) ✅

### Backend — Novas procedures
- [x] adminDashboard.grantPoolPro — upgrade manual de plano de bolão (gratuito, com data de expiração)
- [x] adminDashboard.revokePoolPro — revogar plano Pro de bolão manualmente
- [x] adminDashboard.getImportLogs — histórico de importações de jogos via Google Sheets
- [x] adminDashboard.exportAuditCsv — exportar logs de auditoria filtrados como CSV
- [x] users.list — filtro por inatividade (lastSignedIn há 7/30/90 dias) adicionado

### Frontend — Usuários melhorado
- [x] AdminUsers: filtro por inatividade (sem login há 7/30/90 dias)
- [ ] AdminUsers: ação "Forçar logout" no painel de detalhes do usuário — Sprint 3

### Frontend — Logs de Auditoria
- [x] AdminAudit: botão export CSV dos logs filtrados

### Frontend — Bolões melhorado
- [x] AdminPools: ação de upgrade manual de plano (conceder/revogar Pro) no painel de detalhes
- [ ] AdminPools: filtro por plano (free/pro) e status combinados — Sprint 3

### Frontend — Log de Importações (nova seção)
- [x] AdminImportLogs: nova página /admin/import-logs com histórico de sincronizações Google Sheets
- [x] AdminLayout: adicionar "Log de Importações" no grupo Sistema

### Frontend — Sidebar reorganizada
- [x] AdminLayout: 7 grupos finais bem definidos (Visão Geral, Campeonato, Participantes, Comunicação, Financeiro, Configurações, Sistema)

## Sprint MVP Launch — 6 Melhorias de Prontidão (24/03/2026) ✅

- [x] Bloqueador 1: Preservar link de convite após login OAuth (returnPath no state)
- [x] Bloqueador 2: Corrigir e-mails com URL dinâmica via APP_BASE_URL (variável APP_BASE_URL)
- [x] Bloqueador 3: Traduzir tela de erro (ErrorBoundary) para português com UX melhorada
- [x] Melhoria 4: Compartilhamento de link para participantes (Web Share API + clipboard)
- [x] Melhoria 5: Seção Stripe no AdminSettings já tinha instruções completas (validado, sem alteração)
- [x] Melhoria 6: WelcomeCard para novos usuários (conta criada há < 10 min, com 3 passos e CTAs)

## Sprint UX — Navegação e Dashboard (24/03/2026)

- [x] AppShell: bolões ativos do usuário como itens diretos no menu lateral (com badge de palpites pendentes)
- [x] AppShell: botões Criar e Entrar no menu lateral abaixo dos bolões
- [x] Dashboard mobile: perfil primeiro (order-1), bolões e demais seções depois (order-2)
- [x] Dashboard: cabeçalho com saudação, contador de bolões e botão [+] removidos
- [x] Dashboard: cards de bolões com mais destaque visual — fundo âmbar para palpites pendentes, borda mais visível, fonte semibold

## Sprint UX — Explorar Bolões (24/03/2026)

- [x] Backend: procedure pools.listPublic retorna todos os bolões (públicos e privados) com accessType
- [x] Frontend: página PublicPools reformulada — lista todos os bolões, busca por nome/campeonato, cards com badge de tipo (público/privado/link)
- [x] Frontend: bolão público → botão "Entrar no bolão" abre modal de confirmação
- [x] Frontend: bolão privado (código) → botão "Tenho um código" abre modal inline para digitar código
- [x] Frontend: bolão privado (link) → mensagem informativa sem botão de ação
- [x] AppShell: renomear "Bolões Públicos" para "Explorar Bolões" no menu lateral
- [x] Layout mobile first: cards em coluna única, modal full-width no mobile

## Sprint Analytics — Eventos GA4 + Facebook Pixel (25/03/2026)

- [x] useAnalytics: funções tipadas por evento (sign_up, pool_created, pool_joined, bet_submitted, upgrade_clicked, purchase, badge_unlocked, invite_sent) com mapeamento para eventos padrão do Facebook Pixel
- [x] Evento sign_up: disparar após primeiro login OAuth (useReferralCapture)
- [x] Evento pool_created: disparar ao criar bolão com sucesso (CreatePoolModal)
- [x] Evento pool_joined: disparar ao entrar em bolão público (PublicPools) e privado por código (EnterPool)
- [x] Evento bet_submitted: disparar ao salvar palpites (PoolPage)
- [x] Evento upgrade_clicked: disparar ao clicar em "Upgrade para Pro" (SubscriptionPage, WelcomeCard, OrganizerDashboard)
- [x] Evento purchase: disparar após pagamento Stripe confirmado (SubscriptionPage success_url)
- [x] Evento badge_unlocked: hook disponível — aguardando integração com motor de notificações
- [x] Evento invite_sent: disparar ao copiar/compartilhar link de convite (PoolPage)

## Sprint Segurança + Observabilidade (25/03/2026)

- [x] S1: Helmet.js com CSP configurado
- [x] S2: CORS restrito ao domínio da aplicação
- [x] S3: Upload autenticado (rejeitar uploads sem sessão)
- [x] S4: DOMPurify no RichTextEditor
- [x] S5: Rate limiting (100 req/15min por IP)
- [x] S6: Escape HTML em templates de email
- [x] S8: organizerProcedure lança erro quando poolId não fornecido
- [x] S9: Validação game-pool no placeBet
- [x] S11: iframe sandbox para scripts de anúncios
- [x] S12: Sessão de 30 dias (não 1 ano)
- [x] T1: Modularizar routers (ads extraído para server/routers/ads.ts)
- [x] T3: Paginação cursor-based em users.list
- [x] O1: Logger Pino estruturado (server/logger.ts)
- [x] O2: tRPC error logging middleware no trpc.ts
- [x] O3: Cron health tracking (archivalCronHealth + emailCronHealth + system.cronHealth)
- [x] Q1: Testes de segurança multi-tenant e autenticação (server/security.test.ts — 14 testes)

## Sprint Correção Auditoria (25/03/2026)

### P0 — Segurança crítica (antes do lançamento)
- [x] S4: Remover "image/svg+xml" de ALLOWED_TYPES em server/upload.ts
- [x] S1-CSP: Configurar Content-Security-Policy com policy permissiva em vez de desativar
- [x] S1-CORS: Substituir fallback `?? true` por `?? false` no CORS
- [x] S11: Adicionar envSchema Zod com process.exit(1) em server/_core/env.ts
- [x] S10: vapidPrivateKey omitida do getSettings (nunca exposta ao frontend)

### P1 — Qualidade e cobertura
- [x] T1: Modularização completa: 11 módulos em server/routers/ (auth, users, tournaments, pools, bets, rankings, notifications, platform, stripe, badges, notificationTemplates)
- [x] T2: Redis async com import() dinâmico no scoring.ts (fallback síncrono sem exceção)
- [x] T3: Paginação cursor-based em pools.getMembers e bets.myBets
- [x] Q1: 6 cenários de segurança adicionados em security.test.ts (20 testes total)
- [x] Q2: Testes de resiliência: Redis-down, deadline=0, bônus sobrepostos, 0x0 (135 testes total)
- [x] A1: trackBadgeUnlocked disparado em Conquistas.tsx via badges.getNewlyUnlocked
- [x] O1: console.log migrados para logger Pino em scoring.ts, stripe-webhook.ts, oauth.ts, db.ts, upload.ts, push.ts, badges.ts

### Sprint Auditoria 100% — Ações Recomendadas (25/03/2026)
- [x] FIX-1: Corrigir hardcode de URL em sendInviteEmail (pools.ts:593 → ENV.appBaseUrl)
- [x] FIX-2: Aplicar esc() no template de broadcast (notifications.ts:231-235)
- [x] FIX-3: Alterar default de signSession() para 30 dias (sdk.ts)
- [x] FIX-4: Migrar console.* em sdk.ts para Pino
- [x] FIX-5: Migrar console.* em email.ts para Pino
- [x] FIX-6: Testes de integração multi-tenant com banco real (8 testes, banco real)
- [x] FIX-SECURITY: Bug corrigido em pools.transferOwnership — bloquear transferência para usuário banido

### Sprint Sugestões Pós-Auditoria (25/03/2026)
- [x] SUG-1: Coluna notified já existe no banco (tinyint NOT NULL DEFAULT 0) — confirmado via SQL
- [x] SUG-2: Redis async consolidado — import() dinâmico, sem require() síncrono, getScoreQueue/getArchiveQueue/startScoringWorker todos async
- [x] SUG-3: 11 testes de limite de plano gratuito (3º bolão, 51º participante, regras customizadas sem Pro, plano Pro ilimitado) — server/plan-limits.test.ts

### Sprint Sugestões 2+3 (25/03/2026)
- [x] SUG-2: 12 testes de prazo de palpite (deadline) com clock skew em server/bets-deadline.test.ts
- [x] SUG-3-FIX: Bypass de admin em pools.updateScoringRules — admin pode editar regras de qualquer bolão independente do plano

### Bugs (25/03/2026)
- [x] BUG: Botão "Salvar Push" fica desabilitado mesmo com VAPID keys configuradas — corrigido: pushConfigured agora verifica apenas vapidPublicKey (vapidPrivateKey omitida por S10)

### UX Push Settings (25/03/2026)
- [x] UX-1: Feedback visual no botão "Salvar Push" — botão fica verde com ✓ e texto "Configurações salvas" por 3s após save
- [x] UX-2: Validação de e-mail VAPID inline — borda amarela e aviso quando vapidEmail está vazio (não bloqueia botão)

- [x] BUG: Erro ao salvar push com vapidEmail vazio — Zod agora aceita string vazia (normalizada para undefined)

- [x] UX: Unificar botões de salvar em AdminSettings em um único botão"Salvar" no topo que salva todas as seções (Stripe, Limites, Pontuação, Analytics e Push)

## Sprint UX Admin — Unificação de Padrão de Botões (25/03/2026)
- [x] AdminIntegrations: remover botão duplicado no rodapé + feedback visual "Salvo!" no header
- [x] AdminPools: feedback visual "Salvo!" no painel lateral + substituir confirm() nativo por AlertDialog
- [x] AdminBroadcasts: AlertDialog de confirmação antes de enviar broadcast + feedback visual padronizado
- [x] AdminGameResults: feedback visual "Salvo!" padronizado + AlertDialog antes de salvar múltiplos resultados
- [x] AdminSubscriptions: substituir confirm() nativo por AlertDialog para revogação de Pro

## Sprint Logs de Auditoria — 13 novos eventos (25/03/2026)
- [x] F1: Log stripe_subscription_cancelled (assinatura Pro cancelada pelo Stripe)
- [x] F2: Log stripe_payment_failed (pagamento falhou — tentativas 1, 2 e 3)
- [x] F3: Log stripe_subscription_renewed (renovação bem-sucedida)
- [x] S1: Log admin_login (primeiro acesso do admin no dia)
- [x] S2: Log vapid_keys_regenerated (geração de novas chaves VAPID)
- [x] S3: Log pool_ownership_transferred (transferência de propriedade de bolão)
- [x] E1: Log user_registered (novo usuário cadastrado)
- [x] E2: Log pool_created (bolão criado por usuário não-admin)
- [x] E3: Log pool_joined (usuário entrou em bolão — com canal de entrada)
- [x] E4: Log pool_left (usuário saiu de bolão)
- [x] E5: Log pool_member_kicked (membro removido pelo dono)
- [x] C1: Log notification_template_updated (template de mensagem automática editado)
- [x] C2: Log notification_template_toggled (template ativado/desativado)
- [x] REGRA: Avaliar necessidade de log em toda nova feature antes de implementar

## Sprint UX — Sair do Bolão (25/03/2026)
- [x] PoolPage: botão "Sair do bolão" para participantes (não organizadores) com AlertDialog de confirmação
- [x] Após sair: redirecionar para /dashboard com toast de confirmação
- [x] Botão não deve aparecer para organizadores (apenas para participants)

## Bug — Erro na página do bolão (25/03/2026)
- [x] BUG: Página /pool/:slug exibe "Algo deu errado" em produção — corrigido: leaveMutation estava declarado após returns condicionais (violação de regra dos React Hooks), movido para antes dos returns

## Sprint UX — Ranking com Participantes Sem Pontos (25/03/2026)
- [x] Backend: getPoolRanking retorna todos os membros mesmo sem pontuação (LEFT JOIN com pool_members)
- [x] Frontend: aba Ranking exibe todos os participantes com 0 pts quando não há pontuação
- [x] Visual: estado "aguardando jogos" com posições empatadas em 0 pts, badge "Sem palpites" para quem não apostou

## Sprint UX — Redesign Ranking em Lista (25/03/2026)
- [x] Remover pódio em cards (visualização atual rejeitada pelo usuário)
- [x] Ranking em lista única: 1º com ícone Crown dourado, 2º com Medal prateada, 3º com Medal bronze
- [x] Linha do usuário logado destacada com cor primária e tag "(você)"
- [x] Badge "Sem palpites" para quem ainda não apostou
- [x] Linha separadora sutil entre top-3 e restante da lista
- [x] Mostrar delta de pontos em relação ao líder (ex: "-12 pts") para posições 2+

## Bug — Badges de posição não aparecem no ranking (25/03/2026)
- [x] BUG: Crown/Medal não aparecem quando allZero=true — corrigido: badges sempre visíveis nos top-3 independente de pontuação

## Sprint UX — Ranking: data de atualização + posição do usuário (25/03/2026)
- [x] Remover banner "Aguardando os primeiros pontos"
- [x] Remover badge "Sem palpites" junto ao nome do participante
- [x] Substituir banner por rodapé discreto com data/hora da última atualização do ranking
- [x] Adicionar card fixo "Sua posição" no topo da aba Ranking (posição, pts, delta do líder)

## Sprint UX — Ranking: remover card redundante + reordenar lista (25/03/2026)
- [x] Remover card fixo "Sua posição" (redundante com o item da lista)
- [x] Reordenar itens da linha: número de posição → badge (top-3 apenas) → avatar → nome → pontos

## Sprint UX — Link "Meu Perfil" no menu (25/03/2026)
- [x] Adicionar item "Meu Perfil" no menu de navegação, abaixo do Dashboard, com link para /my-profile

## Sprint — Histórico de Posições Finais no Perfil (25/03/2026)
- [x] Schema: tabela pool_final_positions para registrar posição final ao encerrar bolão
- [x] Backend: registrar posição final quando bolão é encerrado (status closed)
- [x] Backend: finalPositions incluído no retorno de getPublicProfile
- [x] Frontend: seção "Histórico de Posições" no perfil e perfil público com badges Crown/Medal
- [x] Análise: pool_final_positions usa ON DELETE SET NULL — histórico preservado mesmo após exclusão do bolão (poolId fica null, poolName mantido como snapshot)

## Bug — Histórico de Posições só aparece com registros (25/03/2026)
- [x] BUG: Seção "Histórico de Posições" oculta quando não há registros — deve aparecer sempre com estado vazio

## Sprint Growth — CTA de Conversão no Perfil Público (25/03/2026)
- [x] CTA de conversão no rodapé do PublicProfile (/profile/:userId) — visível apenas para visitantes não autenticados
- [x] CTA primário: "Criar meu bolão" (link para login/landing)
- [x] CTA secundário: "Entrar em um bolão" (link para login/landing)
- [x] Headline persuasivo e copy alinhado ao tom da plataforma (informal-profissional, pt-BR)
- [x] Seção oculta para usuários já autenticados (não poluir experiência de quem já está logado)

## Feature — Permissão de Convite em Bolões Privados (25/03/2026)
- [x] Schema: novo campo `invitePermission` enum("organizer_only","all_members") default "organizer_only" na tabela pools
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] Backend: procedures create + update + adminCreatePool aceitam invitePermission
- [x] Frontend CreatePool.tsx (O1): controle de permissão de convite visível apenas para private_code e private_link
- [x] Frontend CreatePoolModal.tsx: campo invitePermission no modal simplificado
- [x] Frontend OrganizerAccess.tsx (O4): toggle de permissão de convite + save
- [x] Frontend PoolPage.tsx: ParticipantShareButton condicional ao invitePermission === "all_members"
- [x] Testes Vitest: cenários organizer_only e all_members no joinByToken/joinByCode

## Feature — Remoção de Convite por Código (private_code) (25/03/2026)
- [x] DB: migrar bolões com accessType=private_code para private_link
- [x] Schema: remover private_code do enum accessType
- [x] Backend pools.ts: remover joinByCode, remover branch private_code em regenerateAccessCode, atualizar enums em create/update/adminCreate/adminUpdatePool
- [x] Frontend CreatePool.tsx: remover opção "Privado por código" e campo de código personalizado
- [x] Frontend CreatePoolModal.tsx: remover opção private_code
- [x] Frontend OrganizerAccess.tsx: remover opção private_code e seção de exibição do código
- [x] Frontend PublicPools.tsx: remover branch private_code (modal de entrada por código)
- [x] Frontend AdminPools.tsx: remover opção private_code nos selects e labels
- [x] Testes Vitest: atualizar fixtures e remover testes de joinByCode

## Bug — Bloco de inviteCode residual no PoolSettings (25/03/2026)
- [x] Remover bloco "Código de convite" (inviteCode) da tela PoolSettings — código não é mais mecanismo de acesso

## Copy — Remover referências a "código" na permissão de convite (25/03/2026)
- [x] OrganizerAccess.tsx: atualizar descrições da permissão de convite removendo "código"
- [x] CreatePool.tsx: atualizar descrições da permissão de convite removendo "código"

## Feature — Compartilhamento Nativo (Web Share API) (25/03/2026)
- [x] OrganizerAccess.tsx: botão "Compartilhar" com Web Share API + fallback cópia para desktop
- [x] ParticipantShareButton (PoolPage.tsx): botão "Compartilhar" com Web Share API + fallback cópia (já estava implementado)

## Feature — Open Graph dinâmico na página de convite (25/03/2026)
- [x] Endpoint GET /og/join/:token no servidor retorna HTML com meta tags OG dinâmicas (título, descrição, imagem)
- [x] Bots de redes sociais (WhatsApp, Telegram) recebem HTML com OG; usuários reais são redirecionados para /join/:token
- [x] Meta tags: og:title, og:description, og:image (logo do bolão ou fallback), og:url, twitter:card

## Feature — Aviso configurável para convite restrito (25/03/2026)
- [x] Schema: novo campo `restrictedInviteMessage` (text, nullable) em platform_settings
- [x] Migração SQL aplicada
- [x] Backend: procedure platform.getSettings retorna restrictedInviteMessage
- [x] Backend: procedure platform.updateSettings aceita restrictedInviteMessage
- [x] Frontend PoolPage.tsx: exibir aviso quando invitePermission=organizer_only e usuário não é organizador
- [x] Frontend AdminSettings.tsx: campo de texto editável para restrictedInviteMessage

## Feature — Animação de entrada no pódio (25/03/2026)
- [x] Animação slide-up + fade-in no card do usuário ao entrar no top-3
- [x] Glow pulse no ícone de coroa/medalha (1s, para sozinho)
- [x] Confetes CSS para 1º lugar (2s, some sozinho)
- [x] Lógica sessionStorage: dispara apenas quando posição muda para top-3 na sessão

## Feature — Painel de teste de animações + animação de posição (26/03/2026)
- [x] Painel de teste visível apenas em dev (import.meta.env.DEV) com botões para cada animação
- [x] Botão: "🥇 1º lugar" — dispara confetes + glow ouro
- [x] Botão: "🥈 2º lugar" — dispara glow prata + slide-up
- [x] Botão: "🥉 3º lugar" — dispara glow bronze + slide-up
- [x] Botão: "⬆️ Subiu" — dispara animação de subida de posição
- [x] Botão: "⬇️ Desceu" — dispara animação de descida de posição
- [x] Animação de subida: indicador verde com seta para cima no card do usuário (2s, some sozinho)
- [x] Animação de descida: indicador vermelho com seta para baixo no card do usuário (2s, some sozinho)
- [x] Lógica sessionStorage: detectar mudança de posição a cada atualização do ranking

## Revisão — Lógica das animações de ranking (26/03/2026)
- [x] Confetes: apenas na primeira vez que o usuário chega ao 1º lugar no bolão (localStorage, nunca repete)
- [x] Glow prata/bronze: apenas na primeira vez no top-3 (localStorage), sem slide-up
- [x] Subida/descida: sempre dispara quando posição muda, sem texto — apenas ícone ↑ verde / ↓ vermelho

## Feature — Remoção do painel de teste + push de pódio (26/03/2026)
- [x] Remover painel de teste de animações do PoolPage (restaurar restrição DEV ou remover completamente)
- [x] Push ao entrar no top-3: trigger no recálculo do ranking (procedure ou job)
- [x] Push ao chegar ao 1º lugar: mensagem especial diferenciada
- [x] Push ao entrar no 2º/3º lugar: mensagem de pódio
- [x] Não enviar push se o usuário já estava naquela posição (evitar spam) — respeitado via preferências do canal pushRankingUpdate

## Remoção — Página /pool/:slug/player/:userId (26/03/2026)
- [x] Substituir PlayerProfile.tsx por redirecionamento para /profile/:userId
- [x] Corrigir todos os links que apontam para /pool/:slug/player/:userId no frontend (PoolPage ranking + membros, PublicProfile botão removido)
- [x] Verificar se há referências no backend (actionUrl de notificações, etc.) — nenhuma encontrada
- [x] Corrigir timeout intermitente do teste FIX-6 (testTimeout global 15000ms no vitest.config.ts)

## Feature — Links de perfil em notificações + posição no ranking no Dashboard (26/03/2026)
- [ ] Regra permanente: toda menção a usuário na plataforma deve linkar para /profile/:userId
- [ ] NotificationBell: nomes de usuários nos cards de notificação linkados para /profile/:userId
- [ ] Dashboard: exibir posição atual no ranking ("Xº lugar") no card de cada bolão ativo
- [ ] Backend: procedure dashboard.getMyPoolsWithRank (ou enriquecer getMyPools com rank do usuário)

## Regra — Linkagem de perfil público em todas as menções de usuário (26/03/2026)
**Regra permanente:** toda menção a um usuário na plataforma deve linkar para /profile/:userId

### Pontos identificados na varredura:
- [x] PoolPage.tsx: rankUser.name no ranking — já linkado
- [x] PoolPage.tsx: memberUser.name na lista de membros — já linkado
- [x] OrganizerMembers.tsx: memberUser.name no card de membro — linkado + item "Ver perfil" corrigido
- [x] OrganizerMembers.tsx: removeTarget/transferTarget.name em dialogs destrutivos — texto simples, ok
- [x] AdminUsers.tsx: u.name na lista e selectedUser.name no sheet — linkados para /profile/:userId
- [x] AdminPools.tsx: name (membro do bolão) na lista de membros — linkado para /profile/:userId
- [x] AdminSubscriptions.tsx: sub.ownerName — linkado para /profile/:ownerId (ownerId adicionado no backend)
- [x] NotificationBell.tsx: ao clicar no card, navega para actionUrl quando disponível
- [ ] Dashboard.tsx: user.name do próprio usuário — linkar para /profile/:userId (próprio perfil) — pendente (parte da feature de posição no ranking)

## Feature — Posição no ranking nos cards do Dashboard (26/03/2026)
- [x] Backend: enriquecer getMyPools com rank do usuário em cada bolão (posição + total de membros) — já implementado
- [x] Frontend Dashboard: exibir "Xº lugar de Y" no card de cada bolão ativo — já implementado
- [x] Frontend Dashboard: badge de pódio 🥇🥈🥉 quando usuário está no top-3 — já implementado

## Sistema de Badges/Conquistas — Sprint 26/03/2026

### Fase 1 — Schema e Banco
- [x] Schema: adicionar campos `emoji` (varchar 8), `category` (varchar 64), `isManual` (boolean) na tabela `badges`
- [x] Migração SQL: aplicar novos campos no banco
- [x] Seed: inserir 25 badges aprovados (5 categorias) com nomes definitivos
- [x] Seed: Chegou Cedo (automático, primeiros 100 usuários), Cobaia (manual admin)

### Fase 2 — Backend
- [x] badges.ts: adicionar critérios novos: first_bet, all_bets_in_pool, created_pool, pool_members_via_invite, organized_pools, early_bet, participated_pools, zebra_exact_score, zebra_in_pool, first_place_margin, first_place_large_pool, rank_jump, rank_hold_1st, early_user
- [x] badges.ts: lógica de `isManual` (skip cálculo automático — só admin atribui)
- [x] badges.ts: lógica de `early_user` (userId <= 100 no momento do cadastro)
- [x] scoring.ts: chamar calculateAndAssignBadges após processGameScoring

### Fase 3 — Frontend
- [x] PublicProfile.tsx: seção de badges com emoji + nome + data de conquista
- [x] PublicProfile.tsx: badges bloqueados exibidos em cinza com progresso
- [x] Dashboard.tsx: badge de conquista recente (toast ao desbloquear)
- [x] AdminBadges.tsx: painel de gestão de badges (listar, criar, editar, atribuir manualmente)
- [x] AdminLayout.tsx: adicionar link "Badges" no grupo Configurações

### Fase 4 — Testes
- [x] badges.test.ts: 43 testes cobrindo todos os critérios e 25 badges aprovados
- [x] Checkpoint final

## Sprint — Badges v2: Padronização Visual e UX (26/03/2026)

### CTO / Schema
- [x] Schema: adicionar campo `rarity` (enum: common, uncommon, rare, epic, legendary) na tabela `badges`
- [x] Migração SQL: aplicar campo rarity no banco
- [x] Seed: atualizar os 25 badges com raridade definida + inserir badges da categoria "publicidade"

### Admin / Configuração
- [x] AdminBadges: botões do cabeçalho empilhados (flex-col ou wrap em telas menores)
- [x] AdminBadges: campo de busca/pesquisa por nome ou descrição
- [x] AdminBadges: filtros por categoria e raridade
- [x] AdminBadges: campo `rarity` no formulário de criação/edição de badge
- [x] AdminBadges: categoria "publicidade" disponível no select de categoria

### Frontend / Padronização Visual
- [x] BadgeCard: componente único padronizado com emoji grande + nome + raridade (cor por tier)
- [x] BadgeCard: tooltip ao hover com descrição + raridade em todas as telas
- [x] Padronizar exibição: PublicProfile, Dashboard, Conquistas, DashboardBadgeCarousel
- [x] Badge genérico visual: quando sem SVG/iconUrl, usar emoji + fundo colorido por raridade (não ícone genérico)

### Backend / Notificação e Log
- [x] badges.ts: notificação in-app automática ao desbloquear qualquer badge (ativo tanto para automático quanto manual)
- [x] badges.ts: badge fica ativo (isActive=true) por padrão ao ser criado
- [x] admin_logs: registrar atribuição manual de badge (quem atribuiu, para quem, qual badge)
- [x] admin_logs: registrar revogação de badge

### Testes
- [x] Testes Vitest: 192/192 passando (todos os arquivos de teste)
- [x] Checkpoint final

## Feature — Próximas Conquistas no Dashboard (26/03/2026)
- [x] Backend: procedure `badges.nearestBadges` — retorna os 3 badges não conquistados com maior % de progresso
- [x] Frontend: seção "Próximas Conquistas" no Dashboard com BadgeCard + barra de progresso + raridade
- [x] Frontend: link "Ver todas" apontando para /conquistas
- [x] Testes Vitest: 192/192 passando
- [x] Checkpoint final

## Feature — Tour Guiado de Primeiro Acesso (26/03/2026)
- [x] Schema: campo `hasSeenTour` (boolean, default false) na tabela `users`
- [x] Migração SQL: aplicar campo no banco
- [x] Backend: procedure `users.completeTour` — marca hasSeenTour=true para o usuário autenticado
- [x] Frontend: instalar driver.js (tour com tooltips posicionados nos elementos reais)
- [x] Frontend: hook `useTour` — verifica hasSeenTour, inicia tour automaticamente no primeiro acesso
- [x] Frontend: 9 passos do tour no Dashboard (criar bolão, entrar por código, notificações, meus bolões, conquistas, próximas conquistas, perfil)
- [x] Frontend: botão "Pular tour" (✕) disponível em todos os passos
- [x] Frontend: ao concluir ou pular, chamar users.completeTour para persistir no banco
- [x] Testes Vitest: 192/192 passando
- [x] Checkpoint final

## Feature — Retrospectiva do Bolão + Cards de Compartilhamento

### CTO — Schema e Infraestrutura
- [ ] Schema: adicionar status `awaiting_conclusion` e `concluded` no enum de pools
- [ ] Schema: tabela `pool_retrospectives` (dados agregados do bolão para geração dos slides)
- [ ] Schema: tabela `user_share_cards` (URLs PNG gerados por usuário por bolão)
- [ ] Schema: campo `awaitingConclusionSince` (timestamp) na tabela pools
- [ ] Migração SQL: aplicar todos os campos no banco
- [ ] Instalar `sharp` para geração de imagem PNG no servidor

### Fullstack — Geração de Imagem
- [ ] `server/retrospective.ts`: serviço de geração SVG→PNG (5 slides + card pódio + card participante)
- [ ] Slide 1: Capa (nome, campeonato, período, participantes)
- [ ] Slide 2: Seus números (palpites, % acerto, exatos, zebras)
- [ ] Slide 3: Seu melhor momento (dinâmico: palpite, subida ranking, badge)
- [ ] Slide 4: Posição final (ranking, pontuação, badge conquistado)
- [ ] Slide 5: Encerramento (frase IA + CTA "Cadastre-se e faça o seu bolão")
- [ ] Template card pódio (1º/2º/3º — visual celebratório)
- [ ] Template card participante (demais posições — visual básico)
- [ ] Upload PNGs para S3 e salvar URLs em `user_share_cards`

### Fullstack — Backend/tRPC
- [ ] `pools.concludePool`: organizador confirma encerramento → gera retrospectiva + cards + notifica todos
- [ ] Bloqueio de edição para bolões `concluded` (só superadmin pode alterar)
- [ ] `archival.ts`: adaptar cron para agir sobre `concluded` (não mais `finished`)
- [ ] `archival.ts`: cron de auto-conclusão — bolões `awaiting_conclusion` há 3 dias são concluídos automaticamente (lembrete no dia 2)
- [ ] `scoring.ts`: ao apurar último jogo, mover bolão para `awaiting_conclusion` e notificar organizador
- [ ] Router `retrospective`: procedures `getRetrospective`, `getShareCard`, `regenerateCard` (superadmin)
- [ ] Log de auditoria para conclusão manual e automática de bolão

### Frontend
- [ ] Banner na tela do bolão (status `awaiting_conclusion`): "Todos os jogos foram apurados. Confirma o encerramento do bolão para gerarmos o ranking final?"
- [ ] Modal de confirmação antes de executar `concludePool`
- [ ] Página `/bolao/:slug/retrospectiva` — slides estilo Spotify Wrapped com navegação
- [ ] Botão "Compartilhar" em cada slide (Web Share API + fallback copiar link)
- [ ] Botão "Baixar imagem" — download do PNG do slide atual
- [ ] Página `/bolao/:slug/card` — card do participante com botão de compartilhamento
- [ ] Notificação in-app ao receber retrospectiva com link direto

### QA
- [ ] Testes Vitest: concludePool, auto-conclusão, geração de retrospectiva
- [ ] Checkpoint final

## Sprint — Retrospectiva v2 (Sugestões 1 e 2)

- [ ] Backend: procedure `adminGetRetrospectives` — listar retrospectivas com status, contagem, erros
- [ ] Backend: procedure `adminReprocessRetrospective` — reprocessar geração de cards para um bolão
- [ ] Frontend: página Admin → Retrospectivas com tabela de bolões concluídos, status de geração e botão reprocessar
- [ ] Frontend: preview do card PNG no Slide 3 (Melhor Momento) e Slide 4 (Posição Final)
- [ ] Frontend: botão "Compartilhar este card" contextual nos slides que exibem o card
- [ ] Testes Vitest: cobrir adminGetRetrospectives e adminReprocessRetrospective
- [ ] Checkpoint final

## Sprint — Retrospectivas v3: Templates + Personalização

- [x] Schema: tabela `retrospective_config` com campos de template S3 (slide1Url..slide5Url, cardPodiumUrl, cardParticipantUrl, autoCloseDays, closingCtaText, closingCtaUrl)
- [x] Migração SQL: aplicar tabela no banco
- [x] AdminLayout: mover Retrospectivas para grupo Configurações; remover do grupo Campeonato
- [x] AdminPools: adicionar aba "Concluídos" com lista de bolões concluídos (status concluded)
- [x] Procedures: getRetrospectiveConfig + updateRetrospectiveConfig (admin only)
- [x] Procedure: uploadRetrospectiveTemplate (upload de imagem PNG/JPG para S3)
- [x] retrospective.ts: usar templates do banco como fundo dos slides/cards quando disponíveis
- [x] AdminRetrospectivas: redesenhar como painel de personalização (upload slides 1-5 + card pódio + card participante)
- [x] AdminRetrospectivas: prévia estática com dados fictícios para cada template
- [x] AdminRetrospectivas: configuração de prazo de auto-conclusão e CTA do slide 5
- [x] Testes Vitest: cobrir getRetrospectiveConfig e updateRetrospectiveConfig
- [x] Checkpoint final

## Sprint — Retrospectiva Participante + Banner awaiting_conclusion

### Backend
- [ ] Verificar/adicionar status `awaiting_conclusion` e `concluded` no enum de pools
- [ ] Procedure `pools.concludePool`: organizador confirma encerramento → gera retrospectiva + notifica todos
- [ ] Procedure `pools.getRetrospectiva`: retorna slides gerados (URLs S3) para o participante
- [ ] Scoring.ts: ao apurar último jogo, mover bolão para `awaiting_conclusion` e notificar organizador

### Frontend
- [ ] Página `/bolao/:slug/retrospectiva` — slides estilo Spotify Wrapped com navegação (swipe/setas)
- [ ] Botão "Compartilhar" em cada slide (Web Share API + fallback copiar link)
- [ ] Botão "Baixar imagem" — download do PNG do slide atual
- [ ] Banner na tela do bolão (status `awaiting_conclusion`): "Todos os jogos foram apurados. Confirmar encerramento?"
- [ ] Modal de confirmação antes de executar `concludePool`
- [ ] Rota `/bolao/:slug/retrospectiva` registrada no App.tsx

### QA
- [ ] Testes Vitest: concludePool (permissões, status, idempotência)
- [ ] Checkpoint final

## Sprint — Retrospectiva Participante + Banner Awaiting Conclusion (26/03/2026) ✅
- [x] Backend: enriquecer getRetrospective com templates de config (slide1Url..slide5Url, closingCta)
- [x] Frontend: redesenhar PoolRetrospectiva com fundos de template, swipe touch, dots animados
- [x] Frontend: melhorar ConclusionBanner com gradiente âmbar, ícone e modal detalhado com lista
- [x] Frontend: melhorar RetrospectiveBanner com gradiente brand e botão de destaque
- [x] SQL: adicionar colunas faltantes (awaitingConclusionSince em pools, cobaiaPoolId em platform_settings)
- [x] QA: 205 testes passando (10 arquivos)
- [x] Checkpoint final

## Sprint — Retrospectiva v4: Notificações + Auto-conclusão + Share Nativo (26/03/2026) ✅
- [x] Backend: notificação in-app para cada participante ao concluir bolão (link para /pool/:slug/retrospectiva)
- [x] Backend: auto-conclusão no cron de arquivamento após autoCloseDays dias em awaiting_conclusion
- [x] Frontend: compartilhamento nativo do card PNG com navigator.share({ files }) no slide 4
- [x] QA: 205 testes passando + checkpoint final

## Sprint — Descoberta da Retrospectiva (26/03/2026) ✅
- [x] Backend: incluir bolões concluded na query myPools (além de active)
- [x] Backend: retornar flag hasRetrospective + shareCardUrl + finalPosition em myPools
- [x] Frontend: Dashboard — seção "Retrospectivas" com card especial para bolões concluídos (preview do card PNG, posição final, botão "Ver retrospectiva")
- [x] Frontend: NotificationBell — ícone especial (Sparkles) e destaque visual para notificações pool_concluded
- [x] QA: 205 testes passando + checkpoint final

## Sprint — Encerramento do Ciclo: Retrospectiva Some ao Arquivar (26/03/2026) ✅
- [x] Backend: getRetrospective verifica status do bolão — retorna null se archived ou deleted
- [x] Backend: myPools exclui bolões archived (não aparecem no Dashboard)
- [x] Frontend: PoolRetrospectiva exibe tela "Retrospectiva arquivada" com mensagem clara
- [x] QA: 205 testes passando + checkpoint final

## Sprint — Card de Posição em Destaque (26/03/2026) ✅
- [x] Dashboard: ampliar preview do card de posição com banner informativo + botões Compartilhar e Baixar diretos
- [x] PoolPage: exibir card de posição com banner destacado após encerramento (junto ao RetrospectiveBanner)
- [x] QA: 205 testes passando + checkpoint final

## Sprint — Rebranding ApostAI → Plakr! (26/03/2026) ✅
- [x] Substituição em massa no código frontend (18 arquivos): ApostAI → Plakr!, apostai → plakr
- [x] Substituição em massa no código backend (28 arquivos): ApostAI → Plakr!, apostai → plakr
- [x] Atualizar package.json, index.html, env.ts, products.ts
- [x] VITE_APP_TITLE: gerenciado pelo painel Manus (não editável via código)
- [x] SQL: UPDATE retrospective_config SET closingCtaText = 'Crie seu bolão no Plakr! →'
- [x] Atualizar skill orchestrator-agent/SKILL.md
- [x] QA: 205 testes passando + TypeScript sem erros + servidor sem erros + checkpoint final

## Sprint A — Design System Plakr! (26/03/2026) ✅
- [x] Extrair gradientes recorrentes para classes utilitárias Tailwind no index.css
- [x] Substituir cores hardcoded (#hex, rgb) por variáveis CSS nos componentes
- [x] Eliminar estilos inline style={{fontFamily}} substituindo por classes Tailwind
- [x] Atualizar ComponentShowcase com paleta, tipografia, gradientes e componentes
- [x] Adicionar rota /showcase e link no AdminLayout (grupo Configurações)
- [x] QA: 205 testes passando + TypeScript sem erros + checkpoint final

## Sprint B — API Design (26/03/2026) ✅
- [x] Padronizar mensagens de erro tRPC: criar helpers em server/errors.ts (Err, PoolErr, TournamentErr, UserErr)
- [x] Quebrar pools.ts em 6 sub-routers: pools-core, pools-members, pools-games, pools-communication, pools-admin, pools-retrospective
- [x] Criar documentação OpenAPI: endpoint /api/docs com Swagger UI (37 paths, 12 tags) + /api/docs.json
- [x] QA: 205 testes passando + TypeScript sem erros + checkpoint final

## Sprint — Identidade Visual Plakr! (26/03/2026) ✅
- [x] Sincronizar index.css com paleta oficial OKLCH exatos: dourado #FFB800, verde #00FF88, vermelho #FF3B3B, azul #00C2FF, backgrounds #0B0F1A / #121826
- [x] Corrigir ranking top3: dourado #FFB800, prata #E5E5E5, bronze #CD7F32
- [x] Substituir 64 ocorrências amber/orange genéricas por tokens primary em 23 arquivos
- [x] AdminBadges, Conquistas, Notifications, PoolRules, MyProfile, PublicProfile, PoolRetrospectiva: corrigidos
- [x] AdminDashboard, AdminTournamentDetail, AdminIntegrations, AdminReferrals: corrigidos
- [x] QA: 205 testes passando + zero amber/orange fora do ComponentShowcase + checkpoint final

## Sprint C — Testes de Isolamento Multi-Tenant (26/03/2026) ✅
- [x] isolation-cross-tenant.test.ts: 39 testes cobrindo 16 procedures sem cobertura anterior
  - [x] pools.closePool: não-membro/participante não pode encerrar bolão alheio
  - [x] pools.concludePool: apenas organizador/admin confirma encerramento; PRECONDITION_FAILED para status inválido
  - [x] pools.getBracket: não-membro bloqueado em bolão privado; público e admin liberados
  - [x] pools.leave: não-membro recebe NOT_FOUND; organizador bloqueado sem transferência
  - [x] pools.getMemberProfile: não-membro bloqueado em bolão privado; admin liberado
  - [x] pools.getAccessStats: qualquer membro acessa; não-membro bloqueado
  - [x] pools.sendInviteEmail: apenas organizador; participante/não-membro bloqueados
  - [x] pools.broadcastToMembers: apenas organizador Pro; free e não-membro bloqueados
  - [x] pools.adminList/adminUpdatePool/adminCreate: usuário comum → FORBIDDEN
  - [x] pools.adminGetRetrospectives/adminReprocessRetrospective/updateRetrospectiveConfig/uploadRetrospectiveTemplate: usuário comum → FORBIDDEN
  - [x] 7 testes de usuário anônimo → UNAUTHORIZED em todas as procedures protegidas
- [x] plan-limits.test.ts: 7 novos testes adicionados (total 20)
  - [x] joinPublic: limite 50 participantes free; Pro sem limite; alreadyMember bypass
  - [x] Limites configuráveis: freeMaxPools=3 permite 3º bolão; freeMaxPools=1 bloqueia 2º
  - [x] freeMaxParticipants=10 bloqueia 11º participante via joinByToken
- [x] QA: 251 testes passando (era 205) + TypeScript sem erros + checkpoint final

## Redesign Card de Perfil (26/03/2026) ✅
- [x] Substituir métricas irrelevantes (Pontos/Exatos/Bolões) por métricas competitivas
- [x] Adicionar `accuracy` (aproveitamento %) e `bestPosition` (melhor posição final) ao `myStats` no users.ts
- [x] Card: Aproveitamento % (dourado) | Melhor Posição com coroa/medalha | Total de Palpites
- [x] Ícones contextuais: Crown para 1º lugar, Medal para 2º/3º com cores dourado/prata/bronze
- [x] Exibe "—" quando usuário ainda não concluiu nenhum bolão (bestPosition null)

## Redesign Perfil Público + Tooltips (26/03/2026) ✅
- [x] Adicionar `bestPosition` ao retorno do `getPublicProfile` no backend
- [x] Inserir card de métricas (Aproveit. %, Melhor pos., Palpites) no PublicProfile.tsx
- [x] Tooltips shadcn/ui nas 3 métricas do Dashboard: detalhe de palpites corretos/total, melhor colocação, total de palpites
- [x] Tooltips nas 3 métricas do Perfil Público com mesma semântica
- [x] Ícones de coroa/medalha no Perfil Público conforme posição final (1º=coroa dourada, 2º=prata, 3º=bronze)
- [x] TypeScript sem erros (tsc --noEmit exit 0)

## Nomes de Usuários Clicáveis (26/03/2026) ✅
- [x] Ranking do bolão (PoolPage.tsx): já tinha link — confirmado
- [x] Lista de membros (PoolPage.tsx): já tinha link — confirmado
- [x] OrganizerMembers.tsx: já tinha link + menu contextual — confirmado
- [x] OrganizerDashboard.tsx: top 5 e membros inativos — links adicionados
- [x] AdminUsers.tsx: já tinha link (nome + painel lateral) — confirmado
- [x] AdminPools.tsx: já tinha link nos organizadores — confirmado
- [x] AdminSubscriptions.tsx: já tinha link nos donos — confirmado
- [x] TypeScript sem erros reais (tsc --noEmit exit 0)

## Bug: Badges conquistados aparecem como inativos (26/03/2026) ✅
- [x] Causa raiz: tabela user_badges vazia — calculateAndAssignBadges só rodava após scoring
- [x] Adicionada procedure adminProcedure `recalculateAll` no badges.ts
- [x] Adicionado botão "Recalcular Badges" no AdminBadges.tsx com spinner e feedback
- [x] TypeScript sem erros (tsc --noEmit exit 0)

## Badges: Recálculo Automático + Notificação In-App (26/03/2026) ✅
- [x] calculateAndAssignBadges já integrado ao scoring.ts (linha 471) — confirmado
- [x] Notificação in-app já criada dentro de calculateAndAssignBadges — confirmado
- [x] Notificação com título "🏅 Badge desbloqueado", descrição, link /profile/me, prioridade high
- [x] Sino de notificações (polling 30s) exibe badges conquistados automaticamente
- [x] TypeScript sem erros (tsc --noEmit exit 0)

## Redesign Card de Conquistas — Sprint 26/03/2026
- [x] DashboardBadgeCarousel: aumentar badges de sm para md, grid 5 colunas, barra de progresso, espaçamento melhorado

## Perfil Público — Cards do Dashboard — Sprint 26/03/2026
- [x] PublicProfile: substituir card de métricas antigo pelo componente padronizado "Perfil do Apostador" (Aproveitamento, Melhor Posição, Total de Palpites) igual ao Dashboard
- [x] PublicProfile: substituir seção de badges antiga pelo DashboardBadgeCarousel redesenhado (grid 5 colunas, badges md, barra de progresso)
- [x] Backend: garantir que getPublicProfile retorna badges no formato BadgeCardItem (name, description, emoji, rarity, earnedAt, earned)

## Perfil Público — Gráfico Radar — Sprint 26/03/2026
- [x] PublicProfile: adicionar gráfico radar "Perfil de Apostador" (Placar Exato, Resultado, Dif. Gols, Goleada, Zebra) igual ao Dashboard
- [x] Backend: adicionar radarData ao getPublicProfile (zebraCount, landslideCount, goalDiffCount) e incluir no retorno

## Tooltips em Badges — Sprint 26/03/2026
- [x] BadgeCard: tooltip com descrição + raridade já existia — confirmado funcionando
- [x] DashboardBadgeCarousel: usa BadgeCard — tooltip já funciona
- [x] Página de Conquistas: usa BadgeCard — tooltip já funciona
- [x] Admin de Badges: já tinha tooltip próprio

## Bug: Lógica de Atribuição de Badges — Sprint 26/03/2026
- [x] Investigar critério do badge "Chute Certo" no banco (criterionType, criterionValue)
- [x] Auditar a engine de recálculo de badges para todos os criterionTypes
- [x] BUGFIX: Filtrar bolões com status=deleted em todas as queries de badges (exact_scores_career, exact_scores_in_pool, zebra_scores_career, zebra_in_pool, zebra_exact_score, first_bet, all_bets_in_pool)
- [x] BUGFIX: Revogar badge "Chute Certo" do usuário 1 — será revogado automaticamente pelo recalculateAll
- [x] BUGFIX: recalculateAll agora revoga badges não-manuais cujo critério não é mais atendido

## Bug: Tooltip no Card de Conquistas — Sprint 26/03/2026
- [x] Diagnosticar por que o tooltip não dispara no DashboardBadgeCarousel — causa: TooltipProvider aninhado (shadcn Tooltip cria Provider interno que conflita com o global)
- [x] Corrigir tooltip: BadgeCard agora usa TooltipPrimitive.Root diretamente, sem Provider aninhado

## Redesign Landing Page + Admin Config — Sprint 26/03/2026

### Schema & Backend
- [x] Criar tabela `landing_page_config` com todos os campos de conteúdo e toggles de seções
- [x] Seed inicial com valores padrão para todas as seções (defaults no schema Drizzle)
- [x] tRPC procedure `landingPage.getConfig` (public) — retorna config ativa
- [x] tRPC procedure `landingPage.updateConfig` (admin) — salva config completa
- [x] tRPC procedure `landingPage.toggleSection` (admin) — ativa/desativa seção

### Frontend — Home.tsx (Landing Page)
- [x] Navbar mínima: logo + "Como funciona" + "Planos" + CTA "Criar bolão grátis"
- [x] Hero: headline "Faça seu bolão com a galera" + badge "FAÇA SEU BOLÃO PARA A COPA DO MUNDO" + sub-headline + contador Copa 2026 + CTA duplo
- [x] Seção credibilidade: campeonatos suportados + "+ crie o seu próprio"
- [x] Seção "Como funciona" — 4 passos (organizador como protagonista)
- [x] Seção diferencial "Seu campeonato, suas regras" com CTA Pro inline
- [x] Seção features — grid 9 cards de funcionalidades
- [x] Seção planos — comparativo Gratuito vs Pro com CTA duplo
- [x] Seção FAQ — 6 perguntas com accordion
- [x] Seção CTA final duplo — "Criar bolão grátis" + "Criar campeonato personalizado"
- [x] Footer mínimo
- [x] Renderização condicional de cada seção baseada em `landingPage.getConfig`

### Admin — Painel "Página de Vendas"
- [x] Adicionar item "Página de Vendas" na sidebar do Super Admin (grupo Comunicação)
- [x] Toggles de seções com ativo/inativo e descrição de cada seção
- [x] Editor de conteúdo por seção (hero, diferencial Pro, CTA final)
- [x] Configurações gerais: badge Copa 2026, data do contador, CTAs
- [x] Proteção de rota: AdminLayout já garante acesso apenas a admins
- [x] Botão "Visualizar" abre a landing page em nova aba

## Admin Landing Page: Código Customizado + Acordeão — Sprint 26/03/2026
- [x] Backend: adicionar colunas customCode por seção na tabela landing_page_config (8 colunas adicionadas via migração 0026)
- [x] Backend: migração SQL aplicada e procedure updateConfig atualizado para aceitar customCode
- [x] Frontend (Home.tsx): wrapper CustomOrDefault em todas as 8 seções — customCode tem prioridade total via dangerouslySetInnerHTML
- [x] Admin (AdminLandingPage.tsx): reorganizado em acordeão com 8 seções — toggle + editor + campo CustomCodeField colapsável
- [x] Admin: badges Ativo/Inativo + badge Código no header de cada item do acordeão

## SEO Completo — Landing Page Plakr! — Sprint 26/03/2026
- [x] index.html: meta title, description, keywords, author, robots, canonical
- [x] index.html: Open Graph (og:title, og:description, og:image, og:url, og:type, og:locale, og:site_name)
- [x] index.html: Twitter Cards (twitter:card, twitter:title, twitter:description, twitter:image)
- [x] index.html: JSON-LD Schema.org (WebSite, SoftwareApplication, FAQPage, Organization, BreadcrumbList)
- [x] index.html: preconnect/dns-prefetch para Google Fonts e CDN
- [x] index.html: viewport, theme-color, apple-mobile-web-app
- [x] robots.txt: configuração correta com Sitemap, crawl-delay e bloqueio de bots agressivos
- [x] sitemap.xml: URL principal com lastmod, changefreq, priority e hreflang pt-BR
- [x] Home.tsx: hierarquia H1→H2→H3 semântica correta (único H1 com itemProp="name")
- [x] Home.tsx: aria-label em botões e links sem texto visível
- [x] Home.tsx: aria-labelledby nas seções com IDs nos headings
- [x] Home.tsx: role="navigation" e role="contentinfo" no nav e footer
- [x] Home.tsx: aria-hidden="true" em ícones decorativos
- [x] Home.tsx: title descritivo nos links de navegação
- [x] badges.test.ts: ne adicionado ao mock do drizzle-orm (251/251 testes passando)

## Ajuste UX — Botão do Cabeçalho da Landing Page — Sprint 26/03/2026
- [x] Home.tsx: botão do navbar exibe "Criar bolão grátis" para visitantes e "Entrar" (→ /dashboard) para usuários logados

## Upload OG Image no Super Admin — Sprint 26/03/2026
- [x] Schema: adicionadas colunas `ogImageUrl` e `ogImageKey` na tabela `landing_page_config`
- [x] Migração SQL: aplicada (0027_vengeful_fenris.sql)
- [x] Backend: `landingPage.updateConfig` aceita e salva `ogImageUrl` e `ogImageKey`
- [x] Backend: endpoint POST /api/upload reutilizado via ImageUploader
- [x] Frontend (AdminLandingPage.tsx): seção "SEO & Compartilhamento" com upload da OG image (drag-and-drop, preview 1200×630, badge de status, links para Facebook Debugger e Twitter Card Validator)
- [x] Backend (og.ts): `registerLandingOgRoute` — bots que acessam / recebem HTML com ogImageUrl dinâmico do banco; usuários reais passam para o SPA normalmente

## Limpeza de Código e Segurança — Sprint 26/03/2026
- [x] SEGURANÇA: /api/docs e /api/docs.json protegidos com middleware requireAdminForDocs (401/403 para não-admins)
- [x] SEGURANÇA: Rotas de dev removidas do App.tsx (/showcase, /admin-legacy, /project-status)
- [x] LIMPEZA: AdminPanel.tsx deletado (431 linhas)
- [x] LIMPEZA: ComponentShowcase.tsx deletado (409 linhas)
- [x] LIMPEZA: ProjectDashboard.tsx deletado (452 linhas)
- [x] LIMPEZA: framer-motion removido do package.json (~140KB a menos no bundle)
- [x] NOTA: axios mantido — usado pelo sdk.ts no núcleo de autenticação OAuth (não era redundante)
- [x] LIMPEZA: 19 componentes shadcn/ui não utilizados deletados
- [x] QUALIDADE: console.log removido de useReferralCapture.ts
- [x] QUALIDADE: Rota duplicada /pool/:slug/settings removida do App.tsx

## Correção Fluxo Botões Upgrade — Sprint 26/03/2026
- [x] Home.tsx / UpgradePage.tsx: botões "Assinar Pro" corrigidos — não logado faz login e retorna ao /upgrade; logado vai direto ao /upgrade para escolher o bolão e iniciar o checkout

## Nova Lógica de Planos — Pro por Conta — Sprint 26/03/2026

### Modelo aprovado
- Plano vinculado ao USUÁRIO (não ao bolão)
- Free: R$ 0 | Pro: R$ 39,90/mês | Unlimited: R$ 89,90/mês
- Plano anual: Pro R$ 399/ano | Unlimited R$ 899/ano
- Limites: Free (2 bolões, 30 participantes) | Pro (10 bolões, 200 participantes) | Unlimited (ilimitado)

### Schema & Banco
- [ ] schema.ts: remover coluna `plan` e `stripeSubscriptionId` da tabela `pools` (plano agora é do usuário)
- [ ] schema.ts: `user_plans` já existe — verificar se precisa de ajuste de enum (free/pro/unlimited ok)
- [ ] Migração SQL: aplicar remoção das colunas de plano do pools

### Backend
- [ ] server/db.ts: criar helper `getUserPlanTier(userId)` retornando limites do tier atual
- [ ] server/db.ts: criar helper `canCreatePool(userId)` verificando limite de bolões do tier
- [ ] server/db.ts: criar helper `canAddMember(poolId, userId)` verificando limite de participantes
- [ ] server/routers/stripe.ts: reescrever `createCheckout` — sem poolId, checkout para a conta do usuário
- [ ] server/routers/stripe.ts: reescrever `createPortalSession` — sem poolId
- [ ] server/stripe-webhook.ts: reescrever handler `checkout.session.completed` — ativa plano no user_plans, não no pool
- [ ] server/stripe-webhook.ts: reescrever handler `customer.subscription.deleted` — desativa plano do usuário
- [ ] server/stripe-webhook.ts: reescrever handler `invoice.payment_failed` — notifica usuário, não o pool
- [ ] shared/plans.ts: criar arquivo com constantes de planos (limites, preços, features por tier)

### Frontend
- [ ] client/src/pages/UpgradePage.tsx: reescrever completamente — sem seleção de bolão, checkout direto para a conta
- [ ] client/src/pages/Home.tsx: atualizar seção de planos com novos preços (R$ 39,90 / R$ 89,90)
- [ ] client/src/pages/Home.tsx: adicionar opção de plano anual na seção de preços
- [ ] client/src/components/DashboardLayout.tsx: exibir badge do plano atual do usuário no sidebar
- [ ] client/src/pages/pool/CreatePool.tsx: bloquear criação se atingiu limite do tier com CTA de upgrade

### Guards de Limite
- [ ] router pools.create: verificar `canCreatePool(userId)` antes de criar
- [ ] router pools.addMember: verificar `canAddMember(poolId)` antes de adicionar participante

## Correção de Testes — Migração Pro por Conta — Sprint 26/03/2026
- [x] plan-limits.test.ts: corrigidos 7 testes que falhavam após migração de modelo de assinatura
- [x] Causa raiz: vi.mock("./db") não intercepta chamadas internas entre funções do mesmo módulo
- [x] Solução: adicionados canCreatePool, canAddMember e getUserPlanTier ao vi.mock
- [x] Mensagens de erro ajustadas para corresponder ao texto real do mock
- [x] Teste de bolão Pro para updateScoringRules: mock de getUserPlanTier retornando "pro"
- [x] 251/251 testes passando após correções
- [x] TypeScript: 0 erros reais (tsc --noEmit exit 0)

## Correção de Testes — Migração Pro por Conta — Sprint 26/03/2026
- [x] plan-limits.test.ts: corrigidos 7 testes que falhavam após migração de modelo de assinatura
- [x] 251/251 testes passando após correções
- [x] TypeScript: 0 erros reais (tsc --noEmit exit 0)

## Admin — Página de Preços dedicada

- [x] Criar página AdminPricing com acordeões por plano (Gratuito, Pro, Ilimitado)
- [x] Adicionar rota /admin/pricing e item "Preços" no grupo Financeiro do AdminLayout
- [x] Remover campos de preço do AdminSettings (evitar duplicidade)
- [x] Registrar no backlog ideias de UX não implementadas imediatamente

## UpgradePage — Preços dinâmicos do banco

- [x] Buscar preços via trpc.platform.getPublicPricing no UpgradePage
- [x] Remover valores fixos de preço do código do UpgradePage
- [x] Exibir skeleton/loading enquanto os preços carregam

## Toggle Mensal/Anual — UpgradePage e Landing Page

- [x] Adicionar toggle Mensal/Anual no UpgradePage com troca dinâmica de preços
- [x] Checkout usa priceId correto conforme billing period selecionado
- [x] Revisar cards de plano no UpgradePage (Gratuito, Pro, Ilimitado presentes)
- [x] Replicar toggle na landing page de vendas (Home.tsx) — 3 cards + toggle Mensal/Anual
- [x] Registrar ideias de UX no backlog (docs/backlog/pricing-ux.md — 6 ideias ICE-001 a ICE-006)

## ICE-001 — Preservar billing period da landing no /upgrade

- [x] UpgradePage lê ?billing= da URL e pré-seleciona o toggle Mensal/Anual

## Bug: ogImageUrl — Erro ao excluir imagem OG na Página de Vendas

- [x] Corrigir validação z.string().url() para aceitar string vazia ou null no ogImageUrl
- [x] Testar exclusão da OG Image no AdminLandingPage sem erro
