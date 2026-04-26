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
- [x] Sessão: renovação automática (sliding session) — expira apenas após 30 dias de inatividade

## CONCLUÍDO — Melhoria do Fluxo de Inscrição via Convite
- [x] Tela de convite (PoolInviteAccept): UX melhorada com orientações claras para usuário novo
- [x] Formulário de magic link (EmailLoginModal): instruções mais claras, dica de verificar spam
- [x] Tela de confirmação (MagicLinkSent): passo a passo, aviso de spam, botão para OTP
- [x] Template do e-mail de magic link: identidade visual Plakr!, código OTP em destaque + link
- [x] Código de 6 dígitos (OTP): tela /magic-link/otp com auto-submit, paste e reenvio

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

- [ ] **BUG:** Bolão finalizado ainda permite participação (ex: plakr.io/pool/bol-o-teste-excluir-efljTA) — revisar após conclusão do card dos jogos

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

## Sprint R — Congelamento de Regras na Criação do Bolão

- [x] Na criação de bolão free: salvar os defaults vigentes da plataforma em pool_scoring_rules (congelar no momento da criação)
- [x] Na criação de bolão pelo admin: idem
- [x] Atualizar testes para refletir novo comportamento

## Sprint T — Hub de Duelos (Arena pública do bolão)

- [x] Backend: procedure getPoolStats no x1.ts (estatísticas do bolão: total, pendentes, ativos, encerrados, top vencedor)
- [x] Frontend: X1DuelsTab enriquecido com bloco de estatísticas do bolão (Arena)
- [x] Frontend: seletor de adversário inline (sem redirecionar para o Ranking)
- [x] Frontend: botão "Duelos" substitui "Jogos" na barra de navegação inferior
- [x] Frontend: onChallenge abre o X1ChallengeModal diretamente da aba Duelos

## Sprint U — Mural do Bolão

- [x] Schema: tabelas mural_posts, mural_comments, mural_mentions
- [x] Migration SQL aplicada no banco
- [x] server/mural-templates.ts com renderTemplate e 13 eventos CazeTV
- [x] Router mural.ts: procedures getByPool, createPost, createComment, deletePost, deleteComment
- [x] Substituir Membros por Mural na PoolBottomNav
- [x] Componente PoolMural.tsx: feed público, posts, comentários, menções, ads Adsterra
- [x] Migrar lista de membros para dentro do Ranking
- [x] Testes vitest para o router mural (29 testes, todos passando)

## Sprint U2 — Mural do Bolão (Completar Feature)

- [x] Gatilho new_member: joinByToken, joinPublic, approveMember → mural auto event
- [x] Gatilho x1_result: resolvePhase (win + draw) → mural auto event
- [x] Gatilho match_result + exact_score + zebra + thrashing: setGameResult → mural auto events
- [x] Gatilho badge_unlocked: badges.ts calculateAndAssignBadges → mural auto event
- [x] Gatilho pool_ended: archival.ts concludePool → mural auto event
- [x] Gatilho rank_change: recalculateMemberStats → mural auto event (1º lugar e top3)
- [x] Backend: procedure toggleReaction (tabela mural_reactions)
- [x] Backend: rate limiting 10 posts/hora por usuário por bolão
- [x] Backend: sanitização HTML (strip tags) no createPost e createComment
- [x] Backend: getMentionSuggestions (autocomplete @nome)
- [x] Frontend: reações com emojis nos posts do PoolMural
- [x] Frontend: autocomplete @menção no WallComposer
- [x] Backend + Frontend: feature flag wallEnabled (organizador ativa/desativa mural do bolão)
- [x] Organizador: toggle Mural em Gerenciar → Comunicação (OrganizerCommunication)
- [x] Testes vitest adicionais: reações, rate limiting, wallEnabled, menções (509 testes passando)

## Fix UX — Ranking sem duplicação de membros

- [x] Remover seção MEMBROS da aba Ranking (lista de membros já existe em Gerenciar → Membros)

## Sprint V — Melhorias aprovadas no Card de Jogo

- [x] Exibir local do jogo (estádio + grupo) no cabeçalho do card
- [x] Exibir contador de palpites realizados no card ("47 palpites feitos")
- [x] Exibir quadradinhos de forma dos últimos 5 jogos de cada time no painel de análise pré-jogo (retangulares, sem bordas)
- [ ] Remover estado "AO VIVO" do card (API atualiza a cada 2h — aguardando decisão do Gerva)
- [x] Investigar e corrigir ausência dos quadradinhos de forma (homeForm/awayForm vazios) — backfillTeamForm criado + botão no Admin → Integrações
- [x] Transformar backfill de forma em job automático: roda 15s após o boot em segundo plano (lotes de 30, pausa 10s entre lotes) + forma buscada automaticamente ao criar novos jogos via syncFixtures + botão isolado removido do Admin
- [x] Corrigir backfill de forma: buscava por teamAId (sempre NULL) em vez de teamAName — corrigido para buscar por nome do time como fallback
- [x] Traduzir W/L/D → V/D/E nos quadradinhos de forma (GameCard.tsx)
- [x] Buscar lesões/suspensões (/injuries?fixture=X) e salvar em aiPrediction.injuries
- [x] Buscar estatísticas da temporada (/teams/statistics) e salvar em aiPrediction.homeStats/awayStats
- [x] Incluir lesões/suspensões e estatísticas da temporada no prompt do LLM (buildAiPrediction)
- [x] Cron de análises pré-jogo atualizado para buscar injuries e teamStats via API-Football
- [x] Regenerar análises pré-jogo existentes em background com prompt enriquecido (injuries + teamStats)
- [x] Corrigir recalculateMemberStats: incluir todos os contadores de pontuação (goalDiff, oneTeamGoals, totalGoals, landslide, zebra) que estavam ausentes — ranking agora reflete todos os critérios corretamente
- [x] Geração automática de análise de palpite (betAnalysisText) após jogo finalizado — já implementado no syncResults
- [x] Job de startup: backfill de análises de palpite para palpites sem comentário da IA (60s após boot)
- [x] Procedure de admin para backfill manual de análises de palpite (integrações.backfillBetAnalyses)

## Sprint H — Melhorias do Fluxo de Encerramento de Bolões (Auditoria 40 especialistas)

- [x] H1: [CRÍTICO] Bloquear edição de palpites em upsertBet para status ≠ active
- [x] H2: [CRÍTICO] Adicionar logs de auditoria ao runArchivalJob() para todas as transições automáticas
- [x] H3: [CRÍTICO] Exibir banner de awaiting_conclusion para todos os participantes (não só organizador)
- [x] H4: [CRÍTICO] Automação da transição active → finished via syncResults quando todos os jogos terminam
- [x] H5: [ALTO] Condicionar geração de retrospectiva a totalBets > 0 (pula usuários sem palpites)
- [x] H6: [ALTO] scheduledDeleteAt mantido no schema — campo é usado em getPoolsDueForDeletion(); problema era apenas que nunca era preenchido (sem urgência)

---

## EM ANDAMENTO — Passe VIP do Participante (R$4,90/mês)

- [x] Adicionar tier `vip` ao schema: `user_plans.plan` enum + `platform_settings.stripePriceIdVip`
- [x] Gerar e aplicar migration SQL do schema
- [x] Atualizar `shared/plans.ts`: tipo `ParticipantTier`, limites VIP (IA 3/dia Free, ilimitada VIP; Duelos 5 Free, ilimitado VIP; noAds VIP)
- [x] Atualizar `server/products.ts`: produto VIP com Price ID do Stripe
- [x] Criar produto e price no Stripe (R$4,90/mês) via script
- [x] Atualizar `server/db.ts`: `getUserPlanTier` reconhecer `vip`, helper `isVip(userId)`
- [x] Atualizar `server/routers/stripe.ts`: procedure `createVipCheckout` + `getMyPlan` retorna VIP
- [x] Atualizar `server/stripe-webhook.ts`: reconhecer tier `vip` no checkout e renovação
- [x] Atualizar `server/routers/x1.ts`: limites Free=5, VIP=ilimitado (separado de organizador)
- [x] Atualizar `server/routers/bets.ts` ou `pools-games.ts`: contador diário de análise IA (3/dia Free, ilimitado VIP)
- [x] Atualizar `client/src/components/AppShell.tsx`: suprimir anúncios para VIP
- [x] Atualizar `client/src/hooks/useUserPlan.ts`: expor `isVip`
- [x] Criar `client/src/components/VipUpgradeBanner.tsx`: banner de upgrade contextual dentro do bolão
- [x] Atualizar `client/src/pages/PoolPage.tsx`: exibir VipUpgradeBanner no contexto de IA bloqueada
- [x] Atualizar `client/src/components/X1ChallengeModal.tsx`: CTA de upgrade para VIP (não para /upgrade)
- [x] Atualizar `client/src/pages/UpgradePage.tsx`: seção separada para Passe do Participante
- [x] Escrever testes: server/vip-pass.test.ts (limites IA, limites X1, helpers, normalização de tier)

## Sprint VIP-Fix — Correção de Gaps (Auditoria 40 especialistas)

- [x] GAP-1: Migrar contador de IA pré-jogo para server-side (tabela `ai_daily_usage`, procedure `checkAiLimit`, reset por data)
- [x] GAP-2: Corrigir `PoolMural.tsx` — suprimir anúncios para VIP (`isPro || isVip`)
- [x] GAP-3: Adicionar seção "Passe do Participante" na `UpgradePage.tsx`
- [x] GAP-4: Adicionar campo `stripePriceIdVip` configurável no painel Admin → Configurações → Monetização
- [x] GAP-5: Escrever testes server-side para contador de IA (checkAiLimit, incremento, reset diário)

## Sprint VIP-Badge — Badge Visual no Perfil

- [x] Badge VIP dourado no perfil do usuário (PublicProfile.tsx / my-profile) — visível apenas quando participante tem Passe VIP ativo

## Sprint VIP-Admin — Atribuição Manual de VIP pelo Admin

- [ ] Backend: adicionar "vip" ao enum do tier em grantPoolPro (adminDashboard.ts)
- [ ] Frontend: adicionar opção VIP no modal de concessão do AdminSubscriptions.tsx
- [ ] Frontend: exibir badge VIP na listagem de assinaturas do AdminSubscriptions.tsx

- [x] AdminUsers.tsx: adicionar seção "Passe VIP" na aba Ações com botões "Conceder VIP" e "Revogar VIP" (mesmo padrão de Tornar Admin / Bloquear)

## Sprint Notificações — Link de Aprovação

- [x] Notificações de "Novo pagamento pendente" devem ser clicáveis e direcionar para a tela de aprovação de pagamentos do bolão correspondente

## Sprint Magic Link — Login por E-mail

- [x] Tabela `magic_links` no schema (token, email, expiresAt, usedAt, returnPath)
- [x] Procedure `sendMagicLink`: gerar token seguro (64 hex), salvar no banco, enviar e-mail
- [x] Rota Express `/api/auth/magic-link/verify`: valida token, cria sessão, redireciona
- [x] Função `getUserByEmail` adicionada ao db.ts
- [x] Frontend: opção "Entrar por e-mail" na navbar + hero da Landing Page
- [x] Frontend: modal `EmailLoginModal.tsx` com campo de e-mail e envio
- [x] Frontend: página `/magic-link/sent` — confirmação de envio com reenvio
- [x] Frontend: página `/magic-link/verify` — processa token e exibe erros
- [x] Testes: envio, segurança (e-mail não revelado), sanitização, validação de token

## Sprint Inserção Manual de Membros — Área do Organizador

- [x] Procedure `addMemberManually`: busca por e-mail, validação de autorização (organizador/admin), verificação de status do bolão, limite de plano, membro duplicado
- [x] Status automático: `active` (sem taxa) ou `pending_approval` (com taxa de inscrição)
- [x] Notificação in-app para o membro adicionado
- [x] E-mail de notificação `templateManualMemberAdd` para o membro adicionado
- [x] Log de auditoria `pool_member_added_manually` via `createAdminLog`
- [x] Frontend: botão "Adicionar membro" no header da tela `OrganizerMembers.tsx`
- [x] Frontend: dialog `Adicionar membro manualmente` com campo de e-mail, info sobre taxa, validação e loading state
- [x] Frontend: aviso contextual quando o bolão tem taxa de inscrição (membro vai para aprovações pendentes)
- [x] Testes: 15 casos cobrindo autorização, validações de bolão, validações de usuário, limites de plano, status com/sem taxa, normalização de e-mail

## Sprint Inserção Manual de Membros — Área do Organizador

- [x] Procedure `addMemberManually`: busca por e-mail, validação de autorização (organizador/admin), verificação de status do bolão, limite de plano, membro duplicado
- [x] Status automático: `active` (sem taxa) ou `pending_approval` (com taxa de inscrição)
- [x] Notificação in-app para o membro adicionado
- [x] E-mail de notificação `templateManualMemberAdd` para o membro adicionado
- [x] Log de auditoria `pool_member_added_manually` via `createAdminLog`
- [x] Frontend: botão "Adicionar membro" no header da tela `OrganizerMembers.tsx` (visível no mobile com texto "Adicionar" e no desktop com texto completo)
- [x] Frontend: dialog com campo de e-mail, aviso sobre taxa, loading state e confirmação por Enter ou botão
- [x] Bug Fix: layout responsivo — botão visível no mobile (shrink-0, texto adaptativo sm:inline)

## Sprint Convite para Não-Membros do Plakr!

- [x] Tabela `pool_invites` criada no banco (token 64hex, poolId, invitedEmail, invitedBy, expiresAt 7d, acceptedAt, acceptedByUserId)
- [x] Procedure `sendPoolInvite`: detecta se e-mail é membro → adiciona direto; se não-membro → cria token seguro (CSPRNG 32 bytes), revoga convite anterior, envia e-mail de convite externo
- [x] Procedure `acceptPoolInvite`: valida token, verifica expiração, valida e-mail do usuário logado vs e-mail convidado (SEC), inserção atômica (membro + token marcado como usado), notifica organizador
- [x] Procedure `getPoolInviteInfo`: retorna info pública do convite (nome do bolão, organizador, taxa, status)
- [x] Template de e-mail `templatePoolInviteExternal` com link de convite, nome do bolão, organizador e informações de taxa
- [x] Frontend: dialog "Adicionar / Convidar" adaptado para `sendPoolInvite` — funciona para membros e não-membros com feedback diferenciado
- [x] Página `/pool-invite/:token` — boas-vindas com info do bolão, botões de login (magic link + OAuth)
- [x] Pós-aceite sem taxa: redireciona direto para o bolão
- [x] Pós-aceite com taxa: exibe tela de pagamento pendente com chave PIX + QR Code
- [x] Rota registrada no App.tsx: `/pool-invite/:token` (pública, compatível com Safari)
- [x] 540 testes passando (24 arquivos)

## Sprint Convite — Data de Expiração no E-mail

- [x] Adicionar data de expiração explícita no e-mail de convite externo (templatePoolInviteExternal) — exibe data exata em pt-BR (ex: "25 de abril de 2026") em vez de "7 dias"

## Sprint Feedback CES + CSAT

- [x] Tabela `feedback_responses` criada no banco (userId, type: ces|csat, context, score, comment, poolId, createdAt)
- [x] Migration SQL aplicada no banco
- [x] Procedure `submit`: salva resposta, respeita janela de silêncio 30 dias por tipo+contexto por usuário
- [x] Procedure `getStats` (admin): score médio, distribuição, por contexto, comentários, tendência diária, alerta automático (CSAT <3 em >20%)
- [x] Procedure `getComments` (admin): lista de comentários com filtros por tipo, dias e nota máxima
- [x] Componente `FeedbackBanner.tsx` (CES): banner fixo no rodapé, 5 emojis 😫😕😐🙂😄, campo de texto opcional para notas ≤2
- [x] Componente `FeedbackModal.tsx` (CSAT): modal com backdrop, 5 emojis 😠😞😐😊🤩, campo de texto opcional para notas ≤3
- [x] Hook `useFeedback.ts`: gerencia estado, janela de silêncio (localStorage), submit e dismiss
- [x] Gatilho CES: após criar bolão (CreatePool.tsx — 2s após sucesso, contexto `create_pool`)
- [x] Gatilho CES: após primeiro palpite (PoolPage.tsx — 1.5s após sucesso, contexto `first_bet`)
- [x] Gatilho CSAT: após encerramento do bolão (PoolPage.tsx — quando status = finished, contexto `pool_ended`)
- [x] Painel admin `/admin/feedback`: score cards CES/CSAT, gráfico de distribuição, breakdown por contexto, comentários qualitativos ordenados por criticidade
- [x] Menu admin: grupo "Feedback" com link "CES + CSAT" → `/admin/feedback`
- [x] Rota `/admin/feedback` registrada no App.tsx
- [x] 540 testes passando (24 arquivos)

## Sprint Safari — Magic Link como Método Padrão de Login

- [x] Hook `useSafariDetect.ts`: detecta Safari/iPhone/iPad com base no userAgent (sem Chrome/Edg/OPR)
- [x] Landing Page: Magic Link como CTA principal para todos os usuários (OAuth removido do botão principal)
- [x] Landing Page: banner informativo azul para usuários Safari no hero ("Detectamos que você está no Safari...")
- [x] Landing Page: OAuth mantido como link discreto ("Prefere entrar com outra conta?") apenas para não-Safari
- [x] Navbar: Safari → botão "Entrar" abre Magic Link diretamente (OAuth oculto)
- [x] Navbar: Outros navegadores → Magic Link em destaque + "Outra conta" como alternativa discreta
- [x] CTA final da Landing Page: Magic Link como padrão (mesmo comportamento do hero)
- [x] EmailLoginModal: badge de compatibilidade Safari (ícone Smartphone + texto informativo)
- [x] EmailLoginModal: cores atualizadas para identidade visual Plakr! (dourado #FFB800 em vez de verde)
- [x] EmailLoginModal: mensagem atualizada — funciona para quem já tem conta E para novos usuários
- [x] Testes: 9 casos cobrindo iPhone, iPad, Safari desktop, Chrome, Firefox, Edge, CriOS, Opera, navigator undefined
- [x] 549 testes passando (25 arquivos)

## Sprint SMTP — Integração Hostinger para Envio de E-mails

- [x] Diagnóstico: Manus Forge API não possui endpoint de envio de e-mail (/v1/notifications/email retorna 404)
- [x] Instalação do nodemailer + @types/nodemailer
- [x] Variáveis SMTP adicionadas ao env.ts (smtpHost, smtpPort, smtpUser, smtpPass, smtpFromName)
- [x] Secrets configurados: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME
- [x] Função sendEmail reescrita para usar nodemailer via SMTP Hostinger (porta 465 SSL)
- [x] Transporter com lazy initialization (singleton) e tls.rejectUnauthorized: false
- [x] Teste real de envio confirmado: e-mail chegou em marcos.gervazoni@gmail.com
- [x] 6 testes unitários de SMTP (smtp.test.ts)
- [x] 555 testes passando (26 arquivos)

## Sprint Safari — Correção Página de Convite

- [x] Aplicar detecção de Safari e Magic Link na página /join/:token (JoinPool.tsx)
- [x] Aplicar detecção de Safari e Magic Link na página /pool-invite/:token (PoolInviteAccept.tsx)

## Sprint E-mail Boas-vindas — Estilo Caze TV

- [x] Criar template `templateWelcome` no email.ts com balões de fala (Narrador 1 dourado / Narrador 2 cinza)
- [x] Adicionar campo `welcomeEmailSent` na tabela users (migração de banco)
- [x] Disparar e-mail automaticamente na criação da conta via Magic Link (magic-link.ts)
- [x] Disparar e-mail automaticamente na criação da conta via OAuth (oauth.ts)
- [ ] Validar visual do e-mail em produção após publicar (sandbox bloqueia porta SMTP)

## Sprint Lembrete por Rodada
- [x] Criar template `templateRoundReminder` consolidado (lista todos os jogos sem palpite da rodada)
- [x] Criar job cron diário que identifica rodadas com primeiro jogo em ~24h
- [x] Verificar se usuário já recebeu lembrete para aquela rodada (evitar duplicata via tabela round_reminder_sent)
- [x] Integrar disparo no sistema de e-mail existente (emailCron.ts, 1x/hora)
- [x] Testar e validar (14 testes passando, 569 total)

## Sprint Preferências de E-mail no Lembrete por Rodada
- [x] Verificar `notification_preferences.emailGameReminder` antes de enviar lembrete por rodada
- [x] Usuários sem linha em notification_preferences não recebem (opt-in explícito, padrão false)
- [x] Atualizar testes — 19 testes passando, 574 total

## Sprint Marcador de Pagamento Pendente
- [x] Adicionar coluna `paymentPending` (boolean) em pool_members
- [x] Criar procedure `pools.togglePaymentPending` no backend
- [x] Adicionar badge "Pgto. pendente" (laranja) na lista de membros (OrganizerMembers)
- [x] Organizador marca/desmarca via menu de ações do membro (só visível em bolões com taxa)
- [x] 8 testes automatizados adicionados — 582 total passando

## Sprint Preço VIP Dinâmico
- [x] Corrigir preço do Passe VIP na UpgradePage para ser lido do banco (getPublicPricing.vipMonthlyPrice)

## Sprint VIP-A — Visibilidade, Retenção e Percepção de Valor (Alta Prioridade)
- [x] [M-1/C-1] KPIs de VIP no AdminDashboard (vipCount + MRR VIP)
- [x] [M-3/C-2] Assinantes VIP na lista do AdminSubscriptions com badge
- [x] [E-2/B-1/O-1] sendPlanExpiryWarnings cobre VIP e Unlimited
- [x] [E-1] E-mail transacional de confirmação de ativação VIP (templateVipActivated + webhook)
- [x] [U-1] Badge VIP no sidebar do AppShell (estrela dourada)
- [x] [M-6] CTA do X1ChallengeModal corrigido (redireciona para /upgrade#vip)

## Sprint VIP-B — Conversão, UX e Comunicação (Média Prioridade)
- [x] [M-4] Preço dinâmico em VipUpgradeBanner
- [x] [M-5] Preço dinâmico em X1ChallengeModal (hardcode removido)
- [x] [E-3] Templates de cancelamento (templateVipCancelled) e expiração (templateVipExpiring) criados e integrados
- [x] [E-4] FAQ sobre Passe VIP na UpgradePage (3 novas perguntas)
- [x] [E-5] Coluna VIP na tabela de comparação de features (12 linhas)
- [x] [U-3] SubscriptionPage do organizador reescrita com Free/Pro/Unlimited e preços dinâmicos
- [ ] [M-7] Exibir VipUpgradeBanner variante "ads" para usuários free (BACKLOG)
- [ ] [U-2] Status VIP no Dashboard do usuário (BACKLOG)

## Sprint VIP-C — Qualidade e Manutenibilidade (Baixa Prioridade)
- [ ] [T-1] Documentar separação intencional PlanTier / ParticipantTier em shared/plans.ts (BACKLOG)
- [ ] [T-2] Remover VIP_PRICE.monthly hardcoded de shared/plans.ts (BACKLOG)
- [ ] [U-4] Tela /minha-assinatura para participante VIP (BACKLOG)
- [ ] [B-3] Log de admin para cancelamento VIP via webhook (BACKLOG)
- [ ] [O-2] Métrica de e-mails de ativação VIP no emailCronHealth (BACKLOG)
- [ ] [C-3] Toggle Admin para habilitar/desabilitar Passe VIP no AdminPricing (BACKLOG)

## Sprint Página de Vendas — Atualização VIP + Posicionamento
- [x] Corrigir "Ranking em tempo real" para "Ranking automático" (sem promessa falsa)
- [x] Remover "Palpites com prazo" dos destaques de features
- [x] Remover "Retrospectiva do bolão" dos cards principais de features
- [x] Adicionar "Taxa de inscrição" como feature destacada (organizador)
- [x] Adicionar "Análise pré-jogo com IA" e "Duelos X1" como features destacadas
- [x] Nova seção "Para quem é" com cards Organizador e Participante
- [x] Atualizar hero subheadline com IA, X1 e ranking automático
- [x] Corrigir cor do plano Unlimited de #EAB308 para #FFB800 (paleta Plakr)
- [x] FAQ atualizado: perguntas sobre IA, X1, taxa de inscrição e VIP vs Pro
- [x] 582 testes passando

## Sprint Vídeo Demo Landing Page
- [x] Gerar vídeo de demonstração do Plakr com IA (3 clipes concatenados, 16s, 6.4MB)
- [x] Configurar storage proxy para servir arquivos via /manus-storage/
- [x] Embutir vídeo na landing page (seção "Veja o Plakr em ação" entre Hero e Como Funciona)
- [x] Autoplay mudo + loop + controles + responsivo

## CONCLUÍDO — Sprint Popup 2× por Dia

- [x] Enum `popupFrequency` no banco: adicionado valor `twice_daily` (migration aplicada)
- [x] Schema Drizzle atualizado: `["session", "twice_daily", "daily", "always"]`
- [x] Router `ads.ts` (Zod): `twice_daily` nos schemas de `create` e `update`
- [x] `AdBanner.tsx`: função `getDayPeriod()` (morning 0h–11h / afternoon 12h–23h), `canShowPopup` e `markPopupShown` com lógica `twice_daily`, lógica Adsterra com `twice_daily`
- [x] `AdminAds.tsx`: tipo `AdForm.popupFrequency` e Select com opção "2× por dia (manhã e tarde/noite)"
- [x] `AdminIntegrations.tsx`: tipo e Select de frequência Adsterra com opção "2× por dia", descrição explicativa
- [x] 582 testes passando (nenhum quebrado)

## PENDENTE — Sprint Popup Patrocinado 2× por Dia

- [x] Schema Drizzle pool_sponsors: adicionado `twice_daily` no enum `popupFrequency` (migration aplicada)
- [x] Router pools-sponsor.ts (Zod): `twice_daily` adicionado no enum
- [x] SponsorDisplay.tsx: lógica `twice_daily` no useEffect e handleClose (morning/afternoon via localStorage)
- [x] AdminSponsorship.tsx: tipo SponsorForm e Select com opção "2× por dia (manhã e tarde/noite)"

## PENDENTE — Bug: Inconsistência Mural vs Ranking

- [x] **BUG CORRIGIDO:** `placeBet` não chamava `recalculateMemberStats` — badge era concedido mas `pool_member_stats` nunca era criado. Adicionado `await recalculateMemberStats()` após `upsertBet` no `bets.ts`

## Sprint Stripe VIP — Configuração do Produto e Price ID

- [x] Produto "Plakr! VIP" criado no Stripe (modo LIVE): `prod_UOt31RG5l8ZgH5`
- [x] Preço recorrente R$4,90/mês (BRL) criado no Stripe: `price_1TQ5HOPD2Oz1qW8S2EDZuiEp`
- [x] `stripePriceIdVip` atualizado no banco (`platform_settings` id=1)
- [x] Fallback em `server/products.ts` atualizado com o novo Price ID
- [x] `createVipCheckout` confirmado: lê Price ID do banco corretamente (sem hardcode)
- [x] 582 testes passando (nenhum quebrado)

## Sprint Magic Link no Checkout — Fluxo de Compra Sem Atrito

- [x] Abrir modal Magic Link ao clicar em botões de compra na Home (VIP, Pro, Ilimitado) para usuários não logados
- [x] Abrir modal Magic Link ao clicar em botões de compra na UpgradePage para usuários não logados
- [x] Após login via magic link, redirecionar automaticamente ao checkout Stripe do plano escolhido
- [x] Parâmetro `?autoCheckout=vip|pro|unlimited` na URL de retorno para acionar checkout automático

## Sprint Melhorias UX — Convite, Magic Link e Taxa de Inscrição

- [x] Remover link de acesso direto do e-mail de magic link — manter apenas OTP de 6 dígitos como método de confirmação
- [x] Corrigir duplicidade no modal da tela de convite: clicar em "entrar com link por e-mail" deve ir direto para o formulário de e-mail, não abrir outro modal
- [x] Melhorar instruções do modal de taxa de inscrição: deixar claro que é necessário pagar, onde está a chave PIX/dados de pagamento e que deve clicar em "Já paguei" após a transação

## Sprint Nome no Cadastro + Correção Definitiva Duplicidade Modal
- [x] Adicionar campo de nome completo no formulário de magic link (EmailLoginModal)
- [x] Salvar nome informado pelo usuário ao criar conta via magic link (prioridade sobre nome derivado do e-mail)
- [x] Corrigir definitivamente a duplicidade de modal: useEffect sincroniza o step ao abrir, resolvendo bug do useState travado no primeiro render
- [x] 582 testes passando (nenhum quebrado)

## Sprint Redirecionamento Automático no Convite
- [x] Tela de convite: se usuário já está logado e já é membro aprovado do bolão, redirecionar diretamente para o bolão sem mostrar a tela de inscrição
