# Estratégia de Monetização — Plakr! v2.0

**Elaborado por:** Orquestrador Plakr (Growth + Monetization + Financial Analyst + Head of Product)  
**Data:** Abril 2026  
**Versão:** 2.0 — Revisão com lente de dois perfis de usuário

---

## 1. O Problema do Modelo Anterior

O modelo de monetização original do Plakr! foi desenhado com um único cliente em mente: o **organizador de bolão**. Todos os limites (número de bolões, número de participantes) e todos os recursos premium (torneio customizado, pontuação customizada, logo do bolão) eram exclusivamente relevantes para quem cria e administra um bolão.

O **participante** — que é numericamente a maioria dos usuários — não tinha nenhuma razão concreta para pagar. Ele entrava no bolão pelo link do organizador, fazia seus palpites e ia embora. O produto não lhe oferecia nada que justificasse uma assinatura.

Isso é um erro estratégico. O Plakr! hoje entrega valor real para os dois perfis: análise pré-jogo com IA, forma recente dos times, desafios X1, badges e conquistas, retrospectiva personalizada, card de compartilhamento Stories — todos esses recursos têm relevância direta para o participante, independentemente de ele organizar ou não um bolão.

---

## 2. Os Dois Perfis e Suas Motivações

Antes de definir planos, é necessário entender o que cada perfil valoriza e o que o faria pagar.

### Perfil Organizador

O organizador é motivado por **controle, personalização e prestígio**. Ele quer que o bolão reflita sua identidade, que os participantes tenham uma experiência boa (o que o valoriza socialmente), e que a gestão seja simples. Ele paga para ter mais poder sobre o ambiente que criou.

| O que ele valoriza | Feature correspondente no Plakr! |
|---|---|
| Criar mais bolões simultaneamente | `maxPools` (2 Free → 10 Pro → ∞ Ilimitado) |
| Aceitar mais participantes | `maxMembersPerPool` (30 → 200 → ∞) |
| Personalizar as regras de pontuação | `customScoring` |
| Usar seu próprio campeonato | `customTournaments` |
| Colocar a logo do seu grupo | `poolLogo` |
| Comunicar com os participantes | Broadcasts (já implementado, gateado por plano) |
| Controlar quem entra | Aprovação de membros, bloqueio |
| Exportar o ranking | `exportRanking` |
| Definir prazo de palpites | `customDeadline` |
| Ter suporte prioritário | `prioritySupport` |

### Perfil Participante

O participante é motivado por **desempenho, reconhecimento e engajamento competitivo**. Ele quer saber se vai ganhar, quer ser reconhecido quando acerta, quer desafiar outros apostadores e quer mostrar seus resultados. Ele paga para ter vantagem informacional e visibilidade.

| O que ele valoriza | Feature correspondente no Plakr! |
|---|---|
| Análise pré-jogo completa (IA + H2H + lesões) | `aiPrediction` + forma recente + H2H |
| Desafiar outros participantes (X1) | X1 (1 ativo Free → 5 Pro → ∞ Ilimitado) |
| Histórico ilimitado de X1s | `maxHistoryPerPool` (3 Free → ∞ Pro) |
| Badges e conquistas exclusivas | Badges Premium (a criar) |
| Retrospectiva personalizada em vídeo | `retrospective` (hoje disponível para todos) |
| Card de compartilhamento Stories premium | Temas e layouts exclusivos (a criar) |
| Perfil público com estatísticas avançadas | Acurácia histórica, taxa de acerto exato |
| Sem anúncios | `noAds` |
| Notificações personalizadas | Alertas de palpite pendente, resultado |

---

## 3. Régua de Preços Revisada

### Benchmark do Mercado

Antes de propor os novos preços, é importante entender o contexto competitivo. O **Cartola PRO** (Globo) cobra R$ 4,99/mês — um preço de entrada extremamente baixo, possível porque é subsidiado por um ecossistema de mídia. Apps de bolão independentes como Bolão Esportivo e Soccer Bolão operam majoritariamente no modelo gratuito com anúncios. O Premiere (transmissão) cobra R$ 29,90/mês. Esse contexto define o teto de percepção de valor do consumidor brasileiro para entretenimento esportivo digital: **R$ 5–30/mês** é o range de conforto; acima de R$ 40/mês exige proposta de valor muito clara.

O modelo anterior do Plakr! cobrava R$ 39,90 como primeiro degrau pago — acima do teto de conforto do mercado, sem degraus intermediários. Isso criava uma barreira de entrada alta demais para o perfil participante, que ainda está descobrindo o produto.

### Princípios da Nova Régua

A nova régua é construída sobre três princípios. **Primeiro degrau acessível:** o preço de entrada deve estar dentro do range de conforto do mercado (R$ 9,90–14,90), removendo a barreira psicológica inicial. **Progressão coerente:** cada degrau deve custar aproximadamente o dobro do anterior, com valor entregue claramente superior. **Teto justificado:** o plano mais caro deve ser posicionado para um perfil profissional (ligas, empresas), não para o usuário casual.

### Nova Estrutura de Planos

| Plano | Nome | Preço Mensal | Preço Anual | Perfil Principal |
|-------|------|-------------|-------------|------------------|
| **Free** | Torcedor | Grátis | — | Qualquer usuário |
| **Starter** | Apostador | R$ 9,90 | R$ 99,00 | Participante |
| **Pro** | Apostador Sério | R$ 19,90 | R$ 199,00 | Participante avançado + Organizador iniciante |
| **Clube** | Organizador | R$ 39,90 | R$ 399,00 | Organizador ativo |
| **Liga** | Liga Profissional | R$ 89,90 | R$ 899,00 | Ligas, empresas, influenciadores |

Essa estrutura cobre um range de R$ 9,90 a R$ 89,90 — seis vezes mais amplo que o modelo anterior — com cinco degraus progressivos. O participante tem dois planos acessíveis antes de chegar ao nível de organizador.

### Detalhamento por Plano

**Free — Torcedor (Grátis)**  
Experiência completa do produto com limites naturais. Anúncios exibidos. Serve para criar hábito e gerar base de usuários para conversão.

**Starter — Apostador (R$ 9,90/mês)**  
O primeiro degrau pago, desenhado para o participante que quer vantagem informacional. Desbloqueie: análise IA completa (H2H + forma recente + análise narrativa), 3 X1s simultâneos, sem anúncios, badges Starter. Não inclui features de organização — é puramente para quem participa.

**Pro — Apostador Sério (R$ 19,90/mês)**  
O plano de maior volume — serve participantes avançados e organizadores iniciantes. Inclui tudo do Starter mais: 5 X1s simultâneos, histórico ilimitado de X1s, badges Pro exclusivos, card Stories com temas premium, perfil público avançado, 3 bolões como organizador, 100 participantes por bolão, pontuação customizada.

**Clube — Organizador (R$ 39,90/mês)**  
Foco em quem organiza bolões ativamente. Inclui tudo do Pro mais: 10 bolões simultâneos, 300 participantes por bolão, torneio customizado, logo do bolão, broadcasts para membros, exportação de ranking, prazo customizado, suporte prioritário.

**Liga — Liga Profissional (R$ 89,90/mês)**  
Para quem opera o Plakr! como infraestrutura. Inclui tudo do Clube mais: bolões ilimitados, participantes ilimitados, white-label completo, API de resultados automática, relatório de engajamento, X1s ilimitados, badges lendários, card Stories com identidade visual personalizada.

### Comparação com o Modelo Anterior

| Aspecto | Modelo Anterior | Modelo Novo |
|---------|----------------|-------------|
| Primeiro degrau pago | R$ 39,90 | R$ 9,90 |
| Número de tiers pagos | 2 | 4 |
| Range de preços | R$ 39,90–89,90 | R$ 9,90–89,90 |
| Plano para participante puro | Não existia | Starter + Pro |
| Plano para organizador iniciante | Pro (R$ 39,90) | Pro (R$ 19,90) |

---

## 4. Matriz de Features por Perfil e Plano

| Feature | Perfil | Free | Starter | Pro | Clube | Liga |
|---------|--------|------|---------|-----|-------|------|
| **Preço mensal** | | Grátis | R$ 9,90 | R$ 19,90 | R$ 39,90 | R$ 89,90 |
| **FEATURES DO PARTICIPANTE** |
| Probabilidades básicas | Participante | ✅ | ✅ | ✅ | ✅ | ✅ |
| Análise IA completa (H2H + lesões) | Participante | 🔒 | ✅ | ✅ | ✅ | ✅ |
| X1s simultâneos | Participante | 1 | 3 | 5 | 5 | ∞ |
| Histórico de X1s | Participante | 3/bolão | 10/bolão | ∞ | ∞ | ∞ |
| Badges exclusivos | Participante | Básicos | Starter | Pro | Pro | Lendários |
| Card Stories | Participante | Padrão | Padrão | Temas Pro | Temas Pro | Identidade própria |
| Perfil público | Participante | Básico | Básico | Avançado | Avançado | Avançado |
| Sem anúncios | Ambos | ❌ | ✅ | ✅ | ✅ | ✅ |
| **FEATURES DO ORGANIZADOR** |
| Bolões simultâneos | Organizador | 2 | 2 | 3 | 10 | ∞ |
| Participantes por bolão | Organizador | 30 | 30 | 100 | 300 | ∞ |
| Pontuação customizada | Organizador | ❌ | ❌ | ✅ | ✅ | ✅ |
| Torneio customizado | Organizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| Logo do bolão | Organizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| Broadcasts para membros | Organizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| Exportar ranking | Organizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| Prazo customizado | Organizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| White-label | Organizador | ❌ | ❌ | ❌ | ❌ | ✅ |
| Relatório de engajamento | Organizador | ❌ | ❌ | ❌ | ❌ | ✅ |
| API de resultados automática | Organizador | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suporte prioritário | Ambos | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 5. Features a Criar para Fortalecer o Plano do Participante

O modelo atual já tem features suficientes para justificar o upgrade do participante, mas algumas precisam ser criadas ou aprimoradas para que o valor seja tangível:

**Badges exclusivos Pro** — criar uma categoria de badges que só podem ser conquistados por usuários Pro (ex: "Analista de Elite" para quem acerta 5 palpites seguindo a recomendação da IA, "Campeão X1" para quem vence 10 X1s). Isso cria aspiração e FOMO.

**Temas premium para o card Stories** — além do tema padrão, criar 3-4 temas visuais exclusivos para Pro (ex: tema "Clássico", tema "Neon", tema "Copa") que tornam o card compartilhado visivelmente diferente. Isso cria sinalização social do plano.

**Perfil público com estatísticas avançadas** — exibir na página pública do participante: taxa de acerto exato histórica, taxa de acerto de resultado, sequência atual de acertos, posição média nos bolões que participa. Isso cria identidade de apostador e motiva o upgrade para quem quer mostrar seu desempenho.

**Lock suave na análise IA** — hoje a análise completa está disponível para todos. Implementar o lock para Free (exibir probabilidades básicas, bloquear H2H + lesões + análise narrativa) com CTA contextual é a ação de maior impacto imediato na conversão.

---

## 6. Comunicação dos Planos

A página `/upgrade` precisa ser reescrita para comunicar valor para os dois perfis. A estrutura atual lista features de forma genérica. A proposta é segmentar visualmente:

> **"Você organiza bolões?"** → destaca os limites de bolões, personalização, broadcasts  
> **"Você participa de bolões?"** → destaca análise IA, X1s, badges, card Stories

Isso pode ser implementado como um toggle ou duas colunas de benefícios dentro do mesmo card de plano, sem criar planos separados — o Pro serve os dois perfis, mas a comunicação é segmentada.

---

## 7. Oportunidades de Receita Complementar

Além das assinaturas, duas linhas de receita complementar merecem atenção:

**Publicidade nativa para casas de apostas** — a análise pré-jogo é um contexto ideal para exibir odds patrocinadas (ex: "Bet365 oferece 2.10 para vitória do Grêmio"). Receita por impressão ou afiliação, sem custo de aquisição adicional. Disponível apenas para usuários Free (Pro e Ilimitado têm `noAds`).

**Planos B2B para empresas** — bolões corporativos para engajamento de equipe (Copa do Mundo, Brasileirão). Preço sugerido: R$ 199–499/mês com relatório de engajamento por departamento. Esse segmento tem ticket médio maior e churn menor.

---

## 8. Próximos Passos Priorizados

| Prioridade | Ação | Impacto | Esforço |
|-----------|------|---------|---------|
| 🔴 Imediato | Lock suave na análise IA para Free + CTA contextual | Alto | Médio |
| 🔴 Imediato | Reescrever copy da /upgrade com benefícios por perfil | Alto | Baixo |
| 🟡 Curto prazo | Criar badges exclusivos Pro para participantes | Alto | Médio |
| 🟡 Curto prazo | Temas premium para card Stories (Pro) | Médio | Médio |
| 🟡 Curto prazo | Perfil público com estatísticas avançadas | Médio | Médio |
| 🟡 Curto prazo | Trial de 7 dias para Pro (Stripe `trial_period_days`) | Alto | Baixo |
| 🟢 Médio prazo | Publicidade nativa para casas de apostas | Alto | Alto |
| 🟢 Médio prazo | Planos B2B para empresas | Alto | Alto |

---

## 9. Avaliação de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Lock na análise gera frustração e abandono | Média | Médio | Lock suave com preview desfocado; trial gratuito de 7 dias |
| Participante não percebe valor do Pro | Alta (hoje) | Alto | Criar badges e temas premium antes de comunicar o upgrade |
| Organizador migra para concorrente mais barato | Baixa | Alto | Manter preço competitivo; focar diferencial na análise IA integrada |
| Parceria com casa de apostas gera conflito regulatório | Média | Alto | Iniciar com publicidade nativa (não apostas diretas); consulta jurídica |

---

*Documento vivo — revisar a cada trimestre ou após mudanças significativas no produto.*
