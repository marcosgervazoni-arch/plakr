# Auditoria — Projeto Anterior vs. Projeto Atual

## Diagramas analisados do projeto anterior

### stripe-pagamento.png — Fluxo Stripe completo (6 fases)
- Fase 1: Seleção/início checkout → createCheckoutSession → busca/cria stripeCustomer → retorna checkoutUrl
- Fase 2: Pagamento no Stripe → redirect success/cancel → toast "Pagamento não concluído"
- Fase 3: Webhook checkout.session.completed → atualiza user_plans (plan: pro, planExpiresAt: +30d, isActive: true) → atualiza pool (planInitializedAt) → cria notificação "Plano ativado"
- Fase 4: Confirmação → trpc.billing.getPlanStatus → exibe badge "Pro" no bolão e desbloqueia features
- Fase 5: Renovação automática mensal → invoice.payment_succeeded → atualiza planExpiresAt +30d → invoice.payment_failed → marca isActive: false após 3 tentativas → bolão continua ativo nas condições do plano gratuito
- Fase 6: Cancelamento → billing.cancelSubscription → stripe.subscriptions.update(cancel_at_period_end: true) → notificação "Assinatura cancelada"

**GAPS no projeto atual:**
- ❌ Não há billing.cancelSubscription procedure
- ❌ Não há billing.getPlanStatus procedure
- ❌ Não há tratamento de invoice.payment_failed (3 tentativas, rebaixamento gracioso)
- ❌ Não há tratamento de invoice.payment_succeeded (renovação mensal)
- ❌ Não há stripeCustomerId salvo no banco para reutilização
- ❌ Não há portal do cliente Stripe (gerenciar cartão/cancelar)

### stripe-rebaixamento.png — Fluxo de rebaixamento gracioso
- Dia 0: invoice.payment_failed → failureCount: 1 → notificação in-app + e-mail "Falha no pagamento"
- Dias 30-38: Janela de recuperação → Stripe tenta novamente → organizador atualiza cartão
- Dia 38: 2ª tentativa falha → failureCount: 2 → notificação urgente "Negociem em 3 dias"
- Dia 41: 3ª tentativa falha → rebaixamento automático → aplica regras do plano gratuito (2 bolões, 50 participantes) → bolões acima do limite ficam "somente leitura" → e-mail de confirmação

**GAPS no projeto atual:**
- ❌ Não há failureCount no banco
- ❌ Não há lógica de rebaixamento gracioso (bolões em somente leitura)
- ❌ Não há notificações escalonadas de falha de pagamento

### 5.3-exclusao-automatica.png — Exclusão automática de bolões (3 fases)
- Cron diário às 03:00 UTC
- Fase 1 (7 dias antes): SELECT pools WHERE status='finished' AND finishedAt <= now() - INTERVAL :days DAY AND deletionScheduledAt IS NULL → UPDATE pools SET deletionScheduledAt = now() + INTERVAL 7 DAY, status = 'pending_deletion' → notifica organizador + participantes
- Fase 2 (1 dia antes): SELECT pools WHERE status='pending_deletion' AND deletionScheduledAt = now() + INTERVAL 1 DAY → notificação urgente "ÚLTIMO AVISO: será excluído AMANHÃ"
- Fase 3 (execução): Anonimiza pool_members, DELETE bets, DELETE pool_member_stats, DELETE pool_members, UPDATE pools SET status='deleted', deletedAt=now(), name='[EXCLUÍDO] '+name → INSERT admin_logs

**GAPS no projeto atual:**
- ❌ Cron atual é simples (1h interval, sem fases)
- ❌ Não há status 'pending_deletion' no schema
- ❌ Não há deletionScheduledAt no schema
- ❌ Não há notificação de 7 dias antes e 1 dia antes
- ❌ Não há nome prefixado '[EXCLUÍDO]' na exclusão

### 4.4-simulacao-pontuacao.png — Simulador de pontuação
- Entradas: placar hipotético, palpite do usuário, regras do bolão
- Fluxo: placar exato? (+10) → resultado correto? (+5) → total gols correto? (+2) → diferença correta? (+2) → foi zebra? (+3)
- Máximo possível: 17 pts (exato + gols + diff + zebra)
- Mínimo: 0 pts
- Usado em: Admin → Configurações → Regras (organizador testa suas regras), Tela de palpites (usuário vê pontuação potencial), Resultado calculado (sistema calcula pontos reais)

**GAPS no projeto atual:**
- ❌ Simulador existe no O6 (Regras) mas NÃO existe na tela de palpites (U3) — usuário não vê pontuação potencial ao palpitar

### 6.3-publicidade.png — Sistema de publicidade completo
- Upload: JPG/PNG/GIF/WebP + MP4 + código de script externo (Google Ads, Taboola)
- Posições: Topo (fixo 90px), Rodapé (fixo 90px), Lateral direita (250px, só desktop), Entre seções (inline), Pop-up (600x400px, modal)
- Configuração: período de exibição (data início/fim), segmentação (todos / só gratuito / só pago), frequência de pop-up (1x sessão / 1x dia / sempre)
- Métricas: impressões, cliques, CTR, período de maior engajamento
- Lógica: verifica anúncio ativo → verifica segmentação → verifica período → exibe ou deixa espaço vazio → registra impressão

**GAPS no projeto atual:**
- ❌ AdminAds existe mas não tem upload de vídeo (MP4)
- ❌ Não há componentes AdBanner/AdPopup no frontend
- ❌ Não há registro de impressões automático (só cliques)
- ❌ Não há segmentação por plano (gratuito/pago)
- ❌ Não há frequência de pop-up configurável
- ❌ Anúncios não são exibidos nas páginas (só gerenciados no admin)
