# Backlog — Pricing & Monetização UX

> Ideias capturadas durante o desenvolvimento do toggle Mensal/Anual (2026-03-27).
> Categoria: Melhoria UX / Monetização

---

## [ICE-001] Preservar billing period escolhido na landing ao entrar no /upgrade

**Contexto:** Quando o usuário clica em "Começar com Pro" na landing page com billing=annual,
o link passa `?billing=annual` para `/upgrade`. Porém o UpgradePage ainda não lê esse parâmetro
da URL para pré-selecionar o toggle.

**Ideia:** Ler `useSearch()` ou `new URLSearchParams(location.search)` no UpgradePage e
inicializar o estado `billing` com o valor da URL se presente.

**Por quê:** Reduz fricção — o usuário já escolheu anual na landing, não deve precisar
escolher de novo na tela de checkout.

**Dependências:** Nenhuma. Mudança de 3 linhas no UpgradePage.

**Impacto:** Alto (conversão). **Esforço:** Muito baixo.

---

## [ICE-002] Destacar economia anual com badge "Economize R$ X/ano"

**Contexto:** O toggle mostra "−17%" mas não traduz isso em valor real (R$).

**Ideia:** Abaixo do toggle, exibir dinamicamente: "Economize R$ 79,80/ano no Pro" ou
"Economize R$ 179,80/ano no Ilimitado" quando billing=annual estiver ativo.

**Por quê:** Ancoragem de preço — mostrar o valor absoluto economizado aumenta conversão
para o plano anual.

**Dependências:** Preços já disponíveis via `getPublicPricing`.

**Impacto:** Médio (conversão anual). **Esforço:** Baixo.

---

## [ICE-003] Tabela comparativa de planos na landing page

**Contexto:** A landing page tem 3 cards mas não tem tabela comparativa detalhada
(só o `/upgrade` tem).

**Ideia:** Adicionar uma tabela comparativa colapsável (acordeão) abaixo dos cards
na seção de planos da landing page.

**Por quê:** Usuários que chegam pela landing page precisam de mais informação antes
de decidir clicar em upgrade. A tabela no `/upgrade` só é vista por quem já está
considerando pagar.

**Dependências:** Nenhuma. Reutilizar a tabela já existente no UpgradePage.

**Impacto:** Médio (qualificação de leads). **Esforço:** Baixo.

---

## [ICE-004] Página de sucesso pós-checkout com onboarding

**Contexto:** Após o checkout Stripe, o usuário é redirecionado para `/upgrade?success=true`
mas não há nenhuma mensagem de boas-vindas ou próximo passo.

**Ideia:** Criar uma tela de sucesso dedicada (`/upgrade/success`) com:
- Confirmação do plano ativado
- Lista dos recursos desbloqueados
- CTA: "Criar meu primeiro bolão Pro"

**Por quê:** Momento de maior engajamento pós-compra. Sem onboarding, o usuário
pode não saber o que fazer com os novos recursos.

**Dependências:** Webhook `checkout.session.completed` já processa o plano.

**Impacto:** Alto (retenção pós-compra). **Esforço:** Médio.

---

## [ICE-005] Trial de 7 dias para plano Pro

**Contexto:** Hoje não existe período de trial — o usuário paga imediatamente.

**Ideia:** Oferecer trial de 7 dias via Stripe (`trial_period_days: 7` no checkout).
Exibir badge "7 dias grátis" no card Pro.

**Por quê:** Reduz barreira de entrada. Usuários que experimentam o Pro têm maior
probabilidade de converter para pago.

**Dependências:** Requer ajuste no webhook para lidar com `trialing` status.
Requer comunicação clara de que o cartão é necessário mas não cobrado imediatamente.

**Impacto:** Alto (aquisição). **Esforço:** Médio.

---

## [ICE-006] Upgrade contextual dentro do bolão (paywall inline)

**Contexto:** Quando o usuário tenta criar um 3º bolão e recebe o erro de limite,
ele é bloqueado com uma mensagem de erro genérica.

**Ideia:** Substituir o toast de erro por um modal/drawer com:
- Explicação do limite atingido
- Preview dos benefícios Pro
- Botão direto para checkout (sem ir para /upgrade)

**Por quê:** O momento de maior intenção de compra é exatamente quando o usuário
atinge o limite. Redirecionar para /upgrade perde esse contexto.

**Dependências:** Requer criar um `UpgradeModal` reutilizável.

**Impacto:** Alto (conversão contextual). **Esforço:** Médio-alto.
