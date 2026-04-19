# Varredura Completa — Tier VIP (Passe do Participante)
**Plakr! · Orquestrador de 40 Especialistas · Abril 2026**

---

## Contexto

O Passe VIP do Participante (R$ 4,90/mês) é um tier exclusivo para quem participa de bolões mas não organiza. Seus três benefícios centrais são: **zero anúncios**, **análise de IA ilimitada** e **Duelos X1 ilimitados**. Esta varredura mapeia o estado atual de cada camada do sistema e identifica os gaps que precisam ser endereçados para que o tier esteja completo, consistente e monetizável.

---

## 1. Fundação Técnica (CTO + Security)

### Estado atual — OK
- Schema: `user_plans.plan` enum inclui `"vip"` ✅
- `shared/plans.ts`: `ParticipantTier`, `PARTICIPANT_LIMITS`, `VIP_PRICE` definidos ✅
- `server/db.ts`: `getUserTier()`, `isUserVip()`, `getParticipantTier()` implementados ✅
- `useUserPlan()`: `isVip`, `isParticipantVip` exportados corretamente ✅
- Stripe: produto, price ID e webhook cobrem VIP ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| T-1 | `shared/plans.ts` define `PlanTier = "free" \| "pro" \| "unlimited"` — **VIP não está no tipo `PlanTier`**, apenas em `ParticipantTier`. Isso cria dois sistemas de tipos paralelos que podem divergir em refatorações futuras. | Média | `shared/plans.ts` |
| T-2 | `VIP_PRICE.monthly` está hardcoded como `4.90` em `shared/plans.ts`. O preço real vem de `stripeVipMonthlyPrice` no banco. Qualquer alteração de preço no Admin não reflete neste arquivo compartilhado. | Média | `shared/plans.ts` |

---

## 2. Monetização e Produto (Growth + Financial + Monetization)

### Estado atual — Parcial
- Checkout VIP via Stripe implementado (`createVipCheckout`) ✅
- `AdminPricing` permite configurar `stripePriceIdVip` e `stripeVipMonthlyPrice` ✅
- `UpgradePage` exibe card VIP com preço dinâmico (corrigido hoje) ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| M-1 | **MRR/ARR no AdminDashboard não inclui assinantes VIP.** O cálculo usa apenas `proCount` e `unlimitedCount`. Assinantes VIP são invisíveis nas métricas financeiras. | **Alta** | `server/routers/adminDashboard.ts` |
| M-2 | **Contagem de assinantes VIP ausente no AdminDashboard.** O painel mostra "Bolões Pro (N)" mas não "Passe VIP (N)". | **Alta** | `server/routers/adminDashboard.ts` + `AdminDashboard.tsx` |
| M-3 | **AdminSubscriptions lista apenas planos Pro/Unlimited.** Assinantes VIP não aparecem na lista de assinaturas do painel Admin → Financeiro. | **Alta** | `client/src/pages/admin/AdminSubscriptions.tsx` |
| M-4 | **Preço hardcoded em `VipUpgradeBanner`** (3 ocorrências: `"Ativar Passe VIP · R$4,90/mês"`). Se o preço mudar no Admin, o banner contextual dentro dos bolões continua exibindo o valor antigo. | Média | `client/src/components/VipUpgradeBanner.tsx` |
| M-5 | **Preço hardcoded em `X1ChallengeModal`** (`"Passe VIP — R$ 4,90/mês"`). Mesmo problema do M-4. | Média | `client/src/components/X1ChallengeModal.tsx` |
| M-6 | **Não há upsell VIP contextual na `PoolPage`.** O `X1ChallengeModal` tenta fazer `getElementById("vip-upgrade-card")` mas esse elemento não existe na `PoolPage`. O scroll falha silenciosamente e o usuário é redirecionado para `/upgrade` em vez de ver o CTA no contexto do bolão. | **Alta** | `client/src/pages/PoolPage.tsx` |
| M-7 | **Não há banner VIP para o benefício "zero anúncios"** exibido proativamente para usuários free. O `VipUpgradeBanner` tem a variante `"ads"` implementada mas nunca é renderizada em nenhuma tela. | Média | `client/src/components/VipUpgradeBanner.tsx` |

---

## 3. E-mail e Comunicação (Content + Marketing)

### Estado atual — Parcial
- Notificação in-app de ativação do Passe VIP via webhook ✅
- E-mail de cobrança manual (para membros de bolão) implementado ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| E-1 | **Nenhum e-mail transacional de confirmação de ativação do Passe VIP.** Ao assinar, o usuário recebe apenas uma notificação in-app. Não há e-mail de boas-vindas/confirmação com os benefícios ativados. | **Alta** | `server/stripe-webhook.ts` |
| E-2 | **`sendPlanExpiryWarnings` cobre apenas `plan = "pro"`**, ignorando VIP e Unlimited. Usuários com Passe VIP prestes a expirar não recebem aviso por e-mail. | **Alta** | `server/email.ts` linha 659 |
| E-3 | **Não há e-mail de cancelamento/expiração do Passe VIP.** Quando o webhook `customer.subscription.deleted` rebaixa o usuário, nenhum e-mail é enviado informando que o Passe expirou. | Média | `server/stripe-webhook.ts` |
| E-4 | **FAQ da `UpgradePage` não tem nenhuma pergunta sobre o Passe VIP.** As 6 perguntas existentes cobrem apenas os planos de organizador (Pro/Unlimited). Perguntas como "O Passe VIP vale em todos os bolões?", "Posso ter VIP e Pro ao mesmo tempo?" e "Como cancelar o Passe VIP?" estão ausentes. | Média | `client/src/pages/UpgradePage.tsx` |
| E-5 | **Tabela de comparação de features na `UpgradePage` não inclui coluna VIP.** A tabela tem colunas "Gratuito / Pro / Ilimitado" mas o Passe VIP (tier de participante) não aparece, criando a impressão de que é um plano menor ou separado sem comparativo claro. | Média | `client/src/pages/UpgradePage.tsx` |

---

## 4. UX e Design (UX + Visual Identity + Design System)

### Estado atual — Parcial
- Badge VIP no perfil público implementado ✅
- `VipUpgradeBanner` com 3 variantes (ai/x1/ads) implementado ✅
- Supressão de anúncios para VIP no `AppShell` e `PoolMural` ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| U-1 | **AppShell exibe "Plano Gratuito" para usuários VIP.** O badge no sidebar mostra `isPro ? "Pro" : "Plano Gratuito"`. Como `isPro` é `false` para VIP (correto para suprimir anúncios de organizador), o usuário VIP vê "Plano Gratuito" no sidebar, o que é factualmente errado e prejudica a percepção de valor. | **Alta** | `client/src/components/AppShell.tsx` linha 168 |
| U-2 | **Dashboard do usuário não exibe status VIP nem CTA de upgrade.** A tela inicial não tem nenhuma referência ao Passe VIP — nem para quem já tem (reconhecimento) nem para quem não tem (conversão). | Média | `client/src/pages/Dashboard.tsx` |
| U-3 | **`SubscriptionPage` (painel do organizador) não menciona o Passe VIP.** Um organizador Free que também participa de bolões não sabe que pode adquirir o VIP por R$ 4,90 separadamente. A tela mostra apenas Free vs Pro. | Média | `client/src/pages/organizer/SubscriptionPage.tsx` |
| U-4 | **Não há tela dedicada de "Minha Assinatura VIP"** para o participante gerenciar seu Passe. O único ponto de acesso é o perfil público (botão "Gerenciar assinatura") e a `UpgradePage`. Não há rota `/minha-assinatura` ou seção no Dashboard. | Baixa | — |

---

## 5. Backend e Segurança (Fullstack + Security + QA)

### Estado atual — Bom
- `protectedProcedure` + verificação de tier nas procedures de X1 e AI ✅
- `isParticipantVip` centralizado em `server/db.ts` ✅
- Webhook de cancelamento rebaixa para free ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| B-1 | **`sendPlanExpiryWarnings` filtra apenas `plan = "pro"`** (gap também listado em E-2). No servidor, isso significa que a query nunca retorna assinantes VIP para aviso de expiração. | **Alta** | `server/email.ts` |
| B-2 | **MRR não inclui VIP** (gap também em M-1). A procedure `adminDashboard.getSubscriptions` calcula `mrrCents = (proCount * monthlyPrice) + (unlimitedCount * unlimitedPrice)` sem considerar VIP. | **Alta** | `server/routers/adminDashboard.ts` |
| B-3 | **Não há log de admin para ativação/cancelamento de VIP via webhook.** O webhook cria `createAdminLog` para checkout, mas não para cancelamento (`customer.subscription.deleted`). | Baixa | `server/stripe-webhook.ts` |

---

## 6. Operações e Monitoramento (Observability + Cron + Cache)

### Estado atual — Parcial
- Cron de expiração de plano rodando ✅
- Cron de lembrete por rodada com verificação de preferências ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| O-1 | **Cron de expiração não cobre VIP** (gap B-1/E-2). Usuários VIP com assinatura prestes a expirar não recebem aviso. | **Alta** | `server/email.ts` + `server/emailCron.ts` |
| O-2 | **`emailCronHealth` não monitora envio de e-mail de ativação VIP.** Não há métrica de quantos e-mails de confirmação VIP foram enviados. | Baixa | `server/emailCron.ts` |

---

## 7. Configurabilidade e Admin (Admin Config + Configurability Architect)

### Estado atual — Bom
- `AdminPricing` permite configurar price ID e preço VIP ✅
- `AdminUsers` permite conceder/revogar VIP manualmente ✅

### Gaps identificados

| # | Gap | Severidade | Arquivo |
|---|-----|-----------|---------|
| C-1 | **AdminDashboard não exibe KPIs de VIP** (gap M-1/M-2). O Super Admin não consegue ver quantos usuários têm Passe VIP ativo, nem o MRR gerado por eles. | **Alta** | `server/routers/adminDashboard.ts` |
| C-2 | **AdminSubscriptions não lista assinantes VIP** (gap M-3). O painel de assinaturas é cego para o tier VIP. | **Alta** | `client/src/pages/admin/AdminSubscriptions.tsx` |
| C-3 | **Não há toggle Admin para habilitar/desabilitar o Passe VIP** como produto. Se o produto precisar ser pausado (ex: ajuste de preço), não há como fazer sem mexer no código. | Baixa | `AdminPricing.tsx` |

---

## Resumo Executivo por Prioridade

### Prioridade Alta — Implementar primeiro

| ID | Descrição | Impacto |
|----|-----------|---------|
| M-1/M-2/C-1 | KPIs de VIP no AdminDashboard (contagem + MRR) | Visibilidade financeira |
| M-3/C-2 | Lista de assinantes VIP no AdminSubscriptions | Gestão operacional |
| M-6 | Card VIP na PoolPage (elemento `#vip-upgrade-card`) | Conversão contextual |
| E-1 | E-mail transacional de confirmação de ativação VIP | Experiência pós-compra |
| E-2/B-1/O-1 | `sendPlanExpiryWarnings` cobrir VIP e Unlimited | Retenção de assinantes |
| U-1 | Badge VIP no sidebar do AppShell | Percepção de valor |

### Prioridade Média — Sprint seguinte

| ID | Descrição | Impacto |
|----|-----------|---------|
| M-4/M-5 | Preço dinâmico em `VipUpgradeBanner` e `X1ChallengeModal` | Consistência de preço |
| M-7 | Exibir `VipUpgradeBanner` variante `"ads"` para usuários free | Conversão por anúncios |
| E-3 | E-mail de cancelamento/expiração do Passe VIP | Retenção/reativação |
| E-4 | FAQ sobre Passe VIP na `UpgradePage` | Conversão na página de vendas |
| E-5 | Coluna VIP na tabela de comparação de features | Clareza do produto |
| U-2 | Status VIP no Dashboard do usuário | Engajamento |
| U-3 | Menção ao Passe VIP na `SubscriptionPage` do organizador | Cross-sell |

### Prioridade Baixa — Backlog

| ID | Descrição | Impacto |
|----|-----------|---------|
| T-1 | Unificar `PlanTier` e `ParticipantTier` em `shared/plans.ts` | Manutenibilidade |
| T-2 | Remover `VIP_PRICE.monthly` hardcoded de `shared/plans.ts` | Consistência |
| U-4 | Tela dedicada `/minha-assinatura` para participante VIP | UX avançada |
| B-3 | Log de admin para cancelamento VIP via webhook | Auditoria |
| O-2 | Métrica de e-mails de ativação VIP no emailCronHealth | Observabilidade |
| C-3 | Toggle Admin para habilitar/desabilitar Passe VIP | Configurabilidade |

---

## Plano de Execução Sugerido

### Sprint A — Visibilidade e Retenção (Alta prioridade)
1. Corrigir `sendPlanExpiryWarnings` para cobrir VIP e Unlimited
2. Adicionar KPIs de VIP no `adminDashboard.getSubscriptions` (vipCount, MRR VIP)
3. Exibir contagem VIP e MRR no `AdminDashboard.tsx`
4. Incluir assinantes VIP na lista do `AdminSubscriptions`
5. Adicionar badge VIP no sidebar do `AppShell`
6. E-mail transacional de confirmação de ativação VIP (template + disparo no webhook)

### Sprint B — Conversão e UX (Média prioridade)
1. Criar elemento `#vip-upgrade-card` na `PoolPage` para upsell contextual
2. Tornar preço dinâmico em `VipUpgradeBanner` e `X1ChallengeModal`
3. Exibir `VipUpgradeBanner` variante `"ads"` em posição estratégica
4. Adicionar FAQ sobre Passe VIP na `UpgradePage`
5. Adicionar coluna VIP na tabela de comparação
6. Mencionar Passe VIP na `SubscriptionPage` do organizador

### Sprint C — Qualidade e Backlog (Baixa prioridade)
1. Unificar tipos em `shared/plans.ts`
2. Log de cancelamento VIP no webhook
3. Tela `/minha-assinatura` para participante VIP

---

*Gerado pelo Orquestrador de 40 Especialistas — Plakr! · Abril 2026*
