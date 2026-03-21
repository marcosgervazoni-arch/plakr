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
