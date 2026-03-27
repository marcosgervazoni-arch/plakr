# Especificação de Feature — "Vem pro X1"

> **Versão:** 1.6 | **Data:** 2026-03-27 | **Status:** Especificação completa aprovada — pronta para desenvolvimento
> **Pré-requisito bloqueante:** `PRE-001 — Campo roundNumber na tabela games` (ver Seção 0)
>
> Documento produzido pela orquestração dos 40 especialistas do ecossistema Plakr.

---

## 0. Pré-Requisito Bloqueante — Campo `roundNumber`

> **Decisão registrada em:** ADR-roundNumber-001 | **Data:** 2026-03-27 | **Status:** Aprovado

### 0.1 Contexto

A opção de escopo **"Próxima rodada"** do X1 — disponível em campeonatos do tipo `league` (pontos corridos) — depende de que a plataforma consiga identificar, de forma confiável e automática, quais jogos pertencem à próxima rodada ainda não disputada. Hoje, o schema da tabela `games` não possui um campo numérico de rodada. O campo `phase` existe, mas é texto livre preenchido manualmente pelo organizador, sem garantia de padronização.

Além disso, as principais APIs de dados esportivos do mercado — API-Football, API-Futebol (BR), Football-Data.org — todas retornam o número da rodada como campo nativo de cada jogo (`round`, `rodada`, `matchday`). Sem um campo correspondente no banco, esse dado é descartado na importação, impedindo qualquer lógica baseada em rodada.

### 0.2 Decisão

Adicionar o campo `roundNumber` (inteiro, opcional, sem valor padrão) à tabela `games` **antes de iniciar o desenvolvimento do X1**.

### 0.3 Especificação do Campo

| Atributo | Valor |
|----------|-------|
| Tabela | `games` |
| Nome do campo | `roundNumber` |
| Tipo | `int`, nullable |
| Valor padrão | `null` |
| Obrigatório | Não — retrocompatível com jogos já cadastrados |
| Índice | Recomendado: índice composto em `(tournamentId, roundNumber)` |

### 0.4 Impacto nos Fluxos Existentes

| Fluxo | Mudança necessária |
|-------|-------------------|
| Importação via CSV/planilha | Adicionar coluna opcional `roundNumber` no template |
| Importação via Google Sheets | Adicionar coluna opcional `roundNumber` na planilha padrão |
| Cadastro manual de jogo (Admin) | Adicionar campo numérico "Rodada" no formulário |
| Integração futura com API externa | Mapear `round` / `matchday` / `rodada` → `roundNumber` automaticamente |
| Exibição de jogos no bolão | Permitir agrupamento e filtro por `roundNumber` além de `phase` |

### 0.5 Lógica da "Próxima Rodada" no X1

Com o campo disponível, a lógica de seleção automática de jogos para o escopo "Próxima rodada" fica definida como:

> Buscar o menor valor de `roundNumber` entre os jogos do campeonato cujo status seja `scheduled` (ainda não disputados). Todos os jogos com esse `roundNumber` compõem o escopo do X1.

Se dois ou mais jogos da mesma rodada já tiverem acontecido (rodada parcialmente disputada), o sistema considera a rodada como **em andamento** e não a oferece como opção — exibindo a próxima rodada completa ainda não iniciada.

### 0.6 Estimativa de Esforço

| Tarefa | Esforço |
|--------|---------|
| Migration SQL (adicionar coluna) | 0,5h |
| Atualizar formulário de cadastro manual no Admin | 1h |
| Atualizar template de importação CSV/Sheets | 1h |
| Atualizar lógica de importação no backend | 1h |
| Índice no banco | 0,25h |
| **Total** | **~3,75h** |

---

## Sumário Executivo

"Vem pro X1" é um sistema de desafios 1v1 (um contra um) que permite a qualquer apostador de um bolão desafiar diretamente outro apostador do mesmo bolão. O desafio é uma disputa paralela ao bolão principal: os dois apostadores competem entre si usando os mesmos palpites que já fizeram (sem necessidade de novos palpites), e ao final do período definido, o vencedor recebe recompensas em forma de badge exclusivo e destaque no ranking. A feature é projetada para ampliar o engajamento social, criar rivalidades saudáveis e gerar um vetor poderoso de compartilhamento orgânico.

---

## 1. Visão do Produto

### 1.1 O Problema que Resolve

O bolão hoje é uma competição coletiva. Cada apostador olha para o ranking e vê sua posição, mas a experiência é passiva — você não tem um adversário direto, não tem uma narrativa de "eu contra você". Isso reduz o engajamento emocional e diminui a frequência de retorno ao app. O X1 resolve isso ao criar **rivalidades nomeadas**: você desafia o Zé, o Zé aceita, e agora toda rodada tem uma história dentro da história.

### 1.2 Proposta de Valor

| Para quem | O que entrega |
|-----------|---------------|
| Apostador casual | Motivação extra para abrir o app e acompanhar os jogos |
| Apostador competitivo | Arena de rivalidade direta com histórico e estatísticas |
| Organizador do bolão | Mais engajamento dos participantes sem esforço adicional |
| Plataforma Plakr | Vetor de compartilhamento social ("olha o X1 que eu tô vencendo!") |

### 1.3 Posicionamento Estratégico

O X1 é uma feature de **engajamento e retenção**, não de monetização direta. Seu impacto financeiro é indireto: usuários mais engajados renovam mais, convidam mais pessoas e têm menor churn. A feature deve ser disponível para **todos os planos** (incluindo Gratuito), com variações de profundidade para planos pagos.

---

## 2. Dinâmica do Desafio

### 2.1 Ciclo de Vida de um X1

O desafio passa por cinco estados bem definidos:

```
PENDING → ACTIVE → CONCLUDED → [EXPIRED se não aceito em 48h]
                              → [CANCELLED se desafiador cancelar antes da aceitação]
```

| Estado | Descrição |
|--------|-----------|
| `pending` | Convite enviado, aguardando resposta do desafiado |
| `active` | Desafio aceito, disputa em andamento |
| `concluded` | Todos os jogos do período foram apurados, vencedor determinado |
| `expired` | Convite não aceito em 48 horas, cancelado automaticamente |
| `cancelled` | Desafiador cancelou antes da aceitação |

### 2.2 Regras Fundamentais

**Quem pode desafiar:** qualquer membro ativo de um bolão pode desafiar qualquer outro membro do mesmo bolão, exceto a si mesmo.

**Escopo dos palpites:** o X1 usa os **palpites já registrados** pelos dois apostadores no bolão. Não há palpites exclusivos para o X1 — a disputa é uma lente sobre os dados existentes. Isso é fundamental: não cria fricção adicional e não distorce o comportamento de apostas.

**Período do desafio:** ao criar o X1, o desafiador escolhe o escopo temporal. As opções disponíveis variam conforme o **formato do campeonato**:

**Campeonatos de pontos corridos** (`format = league`) — ex: Brasileirão, Premier League:

| Opção | Descrição | Requisito técnico |
|-------|-----------|------------------|
| **Próxima rodada** | Todos os jogos da próxima rodada ainda não disputada (menor `roundNumber` com status `scheduled`) | Campo `roundNumber` preenchido |
| **Próximos N jogos** | Os próximos 5, 10 ou 20 jogos do campeonato, na ordem cronológica a partir da aceitação | Nenhum |

**Campeonatos com fase de grupos e/ou chaveamento** (`format = groups_knockout` ou `cup`) — ex: Copa do Mundo, Libertadores, Champions League:

| Opção | Descrição | Requisito técnico |
|-------|-----------|------------------|
| **Próxima fase** | Todos os jogos da fase atual (ou próxima fase ainda não iniciada), identificada pelo campo `phase` da tabela `tournament_phases` | Campo `phase` preenchido nos jogos |
| **Próximos N jogos** | Os próximos 5, 10 ou 20 jogos do campeonato, na ordem cronológica a partir da aceitação | Nenhum |

> **Nota:** A opção "Até o fim do bolão" foi removida da especificação. As possibilidades "Próximo jogo específico", "Fase + grupo específico" e "Fase eliminatória completa" foram registradas no backlog de evoluções futuras (seção 11).

### 2.3 Tipos de Desafio

O X1 suporta dois tipos de desafio, definidos pelo campo `challengeType` na tabela `x1_challenges`:

---

#### Tipo 1 — Duelo de Palpites (`score_duel`)

O tipo original do X1. Dois apostadores competem usando os palpites que já fizeram no bolão. Vence quem acumular mais pontos nos jogos do período definido. Descrito em detalhes na seção 2.2.

---

#### Tipo 2 — Previsão de Campeonato (`prediction`)

Um apostador desafia outro com uma **previsão sobre um evento do campeonato**. Cada um escolhe uma resposta diferente. O sistema resolve automaticamente quando o evento ocorre, sem nenhuma intervenção manual.

**Regra de acerto:** a previsão só é considerada vencedora se cumprir **100% dos requisitos**. Não há acerto parcial. Em caso de ambos errarem, o resultado é empate técnico.

**Previsões disponíveis:**

| # | Previsão | Disponibilidade | Como o sistema resolve |
|---|----------|----------------|------------------------|
| 1 | **Campeão do campeonato** | Qualquer formato | Time vencedor do jogo com `phase = final` e `status = finished` |
| 2 | **Vice-campeão** | Grupos/chaveamento | Time perdedor do jogo com `phase = final` e `status = finished` |
| 3 | **Time eliminado em fase X** | Grupos/chaveamento | Time perdedor de jogo `isKnockout = true` na fase escolhida |
| 4 | **Classificados para fase X** | Grupos/chaveamento | Vencedores de todos os jogos da fase anterior quando todos estiverem `finished` |
| 5 | **Classificados de um grupo** | Grupos/chaveamento | Times com mais pontos no `groupName` escolhido quando todos os jogos do grupo estiverem `finished` |
| 6 | **Vencedor de um jogo específico** | Qualquer formato | Time com maior `scoreA` ou `scoreB` no jogo escolhido quando `status = finished` |

**Previsões descartadas e motivo:**

| Previsão | Motivo da exclusão |
|----------|--------------------|
| Primeiro eliminado do mata-mata | Inserção de placares é manual e não segue ordem cronológica — não é automatizável |
| Placar exato de um jogo | Removido a pedido |
| Artilheiro | Schema não armazena gols por jogador |
| Apostas sobre desempenho do bolão | Não necessário na versão atual |

**Fluxo do X1 de Previsão:**

1. Desafiador escolhe o tipo `prediction` ao criar o X1
2. Seleciona a previsão desejada (ex: "Campeão do campeonato")
3. Escolhe sua resposta (ex: "Brasil")
4. Desafiado recebe o convite, vê a previsão e a resposta do desafiador, e escolhe sua própria resposta (ex: "Argentina")
5. Quando o evento se resolve, o job `x1-prediction-resolver` compara as respostas com o resultado real e declara o vencedor
6. Ambos recebem notificação com o resultado

**Critério de vitória:** o apostador que acumular mais pontos (conforme as regras de pontuação do bolão) nos jogos do período definido vence o X1. Em caso de empate, o critério de desempate é o número de placares exatos; se ainda houver empate, o resultado é declarado **empate técnico** e ambos recebem o badge de participação.

**Limites por plano:**

| Plano | X1s simultâneos ativos | X1s por bolão (total) |
|-------|------------------------|----------------------|
| Free | 1 | 3 |
| Pro | 5 | ilimitado |
| Unlimited | ilimitado | ilimitado |

### 2.3 Fluxo Detalhado

**Passo 1 — Desafio enviado:**
O apostador A está na tela do bolão, visualiza o ranking e toca no botão **⚔️ Desafiar** no card do participante que deseja desafiar. Um bottom sheet sobe com a lista de opções de desafio disponíveis (ver seção 5.4). O apostador seleciona a opção desejada, configura os parâmetros (escopo ou resposta da previsão) e confirma. Uma notificação in-app (e push, se habilitado) é enviada ao apostador B com a mensagem: *"[Nome A] te mandou um X1! Você aceita o desafio?"*

**Passo 2 — Resposta ao convite:**
O apostador B tem 48 horas para aceitar ou recusar. Se não responder, o convite expira automaticamente e o apostador A é notificado. Se recusar, o apostador A recebe notificação de recusa. Se aceitar, o X1 entra em estado `active`.

**Passo 3 — Disputa em andamento:**
Ambos os apostadores podem acompanhar o placar do X1 em tempo real na tela dedicada do desafio. A cada jogo apurado, os pontos são atualizados. O placar exibe: pontos do desafiador vs. pontos do desafiado, diferença de pontos, jogos restantes no período.

**Passo 4 — Conclusão:**
Quando o último jogo do período é apurado, o sistema determina o vencedor automaticamente. Ambos recebem notificação com o resultado. O vencedor recebe o badge correspondente. O histórico do X1 fica disponível para consulta permanente.

---

## 3. Recompensas e Gamificação

### 3.1 Badges Exclusivos do X1

O sistema de badges do X1 é progressivo e se integra ao sistema de badges já existente na plataforma. Todos os badges do X1 pertencem à categoria `x1` (nova categoria a ser criada).

| Badge | Critério | Raridade | Emoji |
|-------|----------|----------|-------|
| **Duelista** | Vencer o primeiro X1 da carreira | Common | ⚔️ |
| **Joga Duro** | Vencer 3 X1s consecutivos | Uncommon | 🛡️ |
| **Carrasco** | Vencer 5 X1s contra o mesmo adversário | Rare | 💀 |
| **Lenda do X1** | Vencer 10 X1s no total | Epic | 👑 |
| **Derrubei Goliás** | Vencer um X1 estando 10+ pontos atrás na metade do período | Legendary | 🦓 |
| **Não Foge da Briga** | Completar 5 X1s sem nenhuma desistência | Common | 🤝 |
| **Era o Líder? Nem Vi!** | Vencer um X1 contra o 1º colocado do ranking do bolão | Rare | 🎯 |

### 3.2 Destaque no Ranking do Bolão

O ranking do bolão exibe, ao lado do nome de cada apostador, os seguintes indicadores visuais:

- **Ícone de espada dourada** ⚔️ ao lado do nome: apostador com mais vitórias em X1 no bolão atual
- **Ícone de duelo ativo** 🔴 ao lado do nome: apostador com X1 em andamento no momento

> **Removido:** streak ativo de vitórias ("🔥 3x") — descartado na revisão.

### 3.3 Card de Compartilhamento do X1

Ao concluir um X1, o vencedor pode gerar e compartilhar um card visual (imagem PNG) com:

- Nome e avatar dos dois apostadores
- Placar final do X1 (ex: "47 pts vs 31 pts")
- Badge conquistado
- Frase gerada por IA com tom irreverente (ex: *"Gerva destruiu o Zé no X1! 47 a 31. Sem apelação."*)
- Logo do Plakr e link para o bolão
- **Marca d'água do Plakr sempre presente**, independente do plano do usuário

Este card segue o mesmo padrão visual da retrospectiva do bolão.

---

## 4. Estatísticas e Histórico

### 4.1 Estatísticas Individuais por Usuário

Cada usuário terá uma seção "Histórico X1" no seu perfil público (visível para membros do mesmo bolão) com:

| Estatística | Descrição |
|-------------|-----------|
| Vitórias / Derrotas / Empates | Contagem geral na carreira |
| Taxa de vitória (%) | Vitórias / Total de X1s concluídos |
| Maior sequência de vitórias | Máximo de X1s vencidos consecutivamente |
| Adversário mais frequente | Quem mais aceitou/enviou desafios |
| Adversário mais difícil | Quem mais venceu contra este usuário |
| Pontuação média no X1 | Média de pontos por X1 concluído |

### 4.2 Estatísticas por Bolão

Na tela do bolão, uma aba "X1s do Bolão" exibe:

- Total de X1s ativos no momento
- Ranking de X1s: quem tem mais vitórias no bolão
- X1 mais acirrado: disputa com menor diferença de pontos
- Últimos X1s concluídos com resultado

### 4.3 Painel Admin — Monitoramento

O Super Admin terá acesso a um painel de monitoramento de X1s com:

- Total de X1s criados, ativos, concluídos e expirados
- Taxa de aceitação de convites
- Distribuição por bolão
- Usuários mais ativos em X1s (top 10)
- Alertas de possível comportamento abusivo (ex: usuário enviando muitos convites recusados)

---

## 5. Telas e Componentes

### 5.1 Mapa de Telas Novas e Atualizadas

| Tela | Tipo | Descrição |
|------|------|-----------|
| `/pools/:slug/x1` | Nova | Hub de X1s do bolão — lista ativos, pendentes e histórico |
| `/pools/:slug/x1/:id` | Nova | Tela de detalhe do X1 — placar ao vivo, jogos, timeline |
| `/pools/:slug/x1/new` | Nova | Criação de desafio — seleção de adversário e escopo |
| Perfil público do usuário | Atualizada | Seção "Histórico X1" com estatísticas e badge |
| Ranking do bolão | Atualizado | Indicador de X1s ao lado do nome no ranking |
| Notificações | Atualizada | Novo tipo `x1_invite` e `x1_result` |
| Admin — Monitoramento | Nova | Painel de X1s no Super Admin |

### 5.2 Tela: Hub de X1s do Bolão (`/pools/:slug/x1`)

**Estrutura visual:**

```
┌─────────────────────────────────────────────────┐
│  ⚔️  X1s do Bolão — [Nome do Bolão]              │
│  "Quem vai dominar o campo?"                     │
├─────────────────────────────────────────────────┤
│  [+ Novo Desafio]                                │
├─────────────────────────────────────────────────┤
│  ATIVOS (2)                                      │
│  ┌──────────────────────────────────────────┐   │
│  │ Gerva  47pts  vs  Zé  31pts  🔴 ao vivo  │   │
│  │ 3 jogos restantes · Próxima rodada        │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ Ana  22pts  vs  João  22pts  ⚡ empate   │   │
│  │ 7 jogos restantes · Próximos 10 jogos    │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  PENDENTES (1)                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ 🕐 Pedro te desafiou! Expira em 23h      │   │
│  │ [Aceitar]  [Recusar]                     │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  CONCLUÍDOS (12)  [Ver todos]                    │
│  Gerva 🏆 vs Zé · 52 a 38 · Próxima rodada      │
│  Ana vs João 🏆 · 41 a 39 · Próximos 10 jogos   │
└─────────────────────────────────────────────────┘
```

**Paleta aplicada:** fundo `#0B0F1A`, cards em `#121826`, pontuação do líder em `#00FF88` (verde), pontuação do perdedor em `#FF3B3B` (vermelho), empate em `#FFB800` (dourado).

### 5.3 Tela: Detalhe do X1 (`/pools/:slug/x1/:id`)

**Estrutura visual:**

```
┌─────────────────────────────────────────────────┐
│  ← Voltar                              ⚔️ X1    │
├─────────────────────────────────────────────────┤
│         GERVA          vs          ZÉ            │
│    [avatar]  47 pts        31 pts  [avatar]      │
│    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│    Você está vencendo por 16 pontos              │
├─────────────────────────────────────────────────┤
│  3 jogos restantes · Próxima rodada              │
├─────────────────────────────────────────────────┤
│  JOGOS DO X1                                     │
│  ┌──────────────────────────────────────────┐   │
│  │ Brasil 2x1 Argentina  ✅ Apurado          │   │
│  │ Gerva: 2-1 (+10 exato) · Zé: 1-0 (+5)   │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ França vs Espanha  🕐 15/04 às 16h       │   │
│  │ Gerva: 1-0 · Zé: 0-1  (aguardando)      │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  [Compartilhar X1]  [Ver perfil do adversário]  │
└─────────────────────────────────────────────────┘
```

### 5.4 Fluxo de Criação do Desafio — Bottom Sheet no Ranking

**Ponto de entrada:** botão **⚔️ Desafiar** no card de cada participante no ranking do bolão. O botão não aparece no card do próprio usuário.

**Passo 1 — Seleção do desafio (bottom sheet):**

Ao tocar em ⚔️ Desafiar, um bottom sheet sobe com a lista de opções disponíveis. As opções variam conforme o formato do campeonato:

```
┌──────────────────────────────────────────────────┐
│  Desafiar o Zé — o que você aposta?              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ○  Disputa de palpites — quem pontua mais?      │
│                                                  │
│  ○  Quem vai ser o campeão?                      │
│  ○  Quem vai ser o vice-campeão?                 │
│  ○  Quem passa do Grupo G?          (dinâmico)   │
│  ○  Quem vai para a semifinal?      (dinâmico)   │
│  ○  Quem cai nas quartas?           (dinâmico)   │
│  ○  Quem vence o próximo jogo?                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

> Opções dinâmicas aparecem apenas quando o campeonato tem fase de grupos ou chaveamento. A opção "Disputa de palpites" está sempre disponível.

**Passo 2a — Se escolheu "Disputa de palpites — quem pontua mais?":**

```
┌──────────────────────────────────────────────────┐
│  Por quantos jogos você aposta?                  │
│                                                  │
│  ○  Próxima rodada  (6 jogos)   [só em league]   │
│  ○  Próxima fase    (8 jogos)   [só em copa]     │
│  ○  Próximos 5 jogos                             │
│  ●  Próximos 10 jogos                            │
│  ○  Próximos 20 jogos                            │
│                                                  │
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘
```

**Passo 2b — Se escolheu qualquer previsão de campeonato:**

```
┌──────────────────────────────────────────────────┐
│  Na sua opinião, quem vai ser o campeão?         │
│                                                  │
│  🇧🇷 Brasil                                      │
│  🇦🇷 Argentina                                   │
│  🇫🇷 França                                      │
│  ... (lista de times do campeonato)              │
│                                                  │
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘
```

**Passo 3 — Tela do desafiado ao aceitar:**

O desafiado vê a escolha do desafiante e deve escolher uma opção **diferente**. Para previsões com múltiplos times (classificados de grupo, classificados para fase), o desafiado não pode repetir nenhum dos times escolhidos pelo desafiante.

```
┌──────────────────────────────────────────────────┐
│  Gerva apostou: 🇧🇷 Brasil                       │
│  Qual é o seu palpite? (não pode ser Brasil)     │
│                                                  │
│  ○  Argentina   ○  França   ○  Alemanha...       │
│                                                  │
│  [Aceitar desafio]  [Recusar]                    │
└──────────────────────────────────────────────────┘
```

> **Caso especial — Classificados de grupo:** como o grupo tem exatamente 4 times e passam 2, as escolhas são automaticamente opostas. O sistema exibe: *"Gerva apostou em Brasil e Suíça. Você aposta nos outros dois: Sérvia e Camarões. Aceita?"*

> **Validação de disponibilidade:** para previsões do tipo "Classificados para fase X", o sistema verifica antes de permitir o desafio se há times suficientes disponíveis para o desafiado escolher. Se não houver, o desafio não é permitido e o desafiante é informado.

### 5.5 Rivalidade Contínua

A Rivalidade Contínua é uma camada de memória que o sistema mantém sobre o histórico de todos os desafios entre dois apostadores no mesmo bolão — independente do tipo (Duelo de Palpites ou Previsão de Campeonato). Ela não é um desafio em si; é um **placar acumulado** que alimenta a narrativa de longo prazo entre dois apostadores.

**Pontos de presença no produto:**

**1. Hub do X1 no bolão — aba "Rivalidades"**

Lista os pares de apostadores com mais histórico de X1s no bolão, com o placar de cada rivalidade:

```
┌──────────────────────────────────────────────────┐
│  ⚔️  Rivalidades do Bolão                         │
├──────────────────────────────────────────────────┤
│  Gerva  2 × 1  Zé   (1 empate)   5 desafios     │
│  Ana   3 × 3  João (0 empate)   6 desafios     │
│  Pedro 1 × 0  Luís (1 empate)   2 desafios     │
└──────────────────────────────────────────────────┘
```

**2. Card de rivalidade no ranking**

Ao tocar no botão ⚔️ Desafiar no card de um participante com quem o usuário já tem histórico, o bottom sheet exibe o placar da rivalidade como contexto antes da lista de opções:

```
┌──────────────────────────────────────────────────┐
│  Desafiar o Zé                                    │
│  Sua série: Gerva 2 × 1 Zé  (1 empate)          │
├──────────────────────────────────────────────────┤
│  o que você aposta?                               │
│  ○  Disputa de palpites — quem pontua mais?      │
│  ○  Quem vai ser o campeão?                      │
│  ...                                              │
└──────────────────────────────────────────────────┘
```

**Implementação técnica:** não requer mudança de schema. É uma query de agregação sobre `x1_challenges` agrupando por par de usuários dentro do mesmo bolão. Nova procedure: `x1.getRivalry`.

### 5.6 Atualizações no Perfil Público

A seção "Histórico X1" é adicionada ao perfil público do usuário, exibida apenas quando o visualizador e o dono do perfil compartilham pelo menos um bolão. Ela mostra:

- Placar de rivalidade entre os dois (ex: "Você 3 × 2 Zé · 1 empate")
- Badges de X1 conquistados

### 5.7 Atualizações no Ranking do Bolão

Cada linha do ranking passa a exibir:

- Ícone ⚔️ (espada dourada) ao lado do nome do apostador com mais vitórias em X1 no bolão
- Ícone 🔴 (duelo ativo) ao lado do nome enquanto há X1 em andamento
- Botão ⚔️ Desafiar no card de cada participante (exceto o próprio usuário)

### 5.7 Notificações — Novos Tipos

| Tipo | Gatilho | Mensagem exemplo |
|------|---------|-----------------|
| `x1_invite` | Receber convite de X1 | "Gerva te mandou um X1! Você aceita?" |
| `x1_accepted` | Adversário aceitou | "Zé aceitou seu X1! A disputa começou." |
| `x1_declined` | Adversário recusou | "Zé recusou seu X1. Tente outro adversário." |
| `x1_expired` | Convite expirou em 48h | "Seu X1 para Zé expirou sem resposta." |
| `x1_result_win` | X1 concluído — vitória | "Você venceu o X1 contra Zé! 47 a 31. 🏆" |
| `x1_result_loss` | X1 concluído — derrota | "Zé venceu o X1. 38 a 47. Revanche?" |
| `x1_result_draw` | X1 concluído — empate | "X1 empatado com Zé! 40 a 40. Honra no campo." |
| `x1_update` | Jogo apurado no X1 | "Jogo apurado! Você agora lidera o X1 por 8 pts." |

---

## 6. Arquitetura Técnica

### 6.1 Novas Tabelas no Banco de Dados

**Tabela `x1_challenges`** — registro de cada desafio:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int PK | Identificador |
| `poolId` | int FK → pools | Bolão onde ocorre o X1 |
| `challengerId` | int FK → users | Quem enviou o desafio |
| `challengedId` | int FK → users | Quem recebeu o desafio |
| `status` | enum | `pending`, `active`, `concluded`, `expired`, `cancelled` |
| `challengeType` | enum | `score_duel`, `prediction` |
| `predictionType` | enum | `champion`, `runner_up`, `group_qualified`, `phase_qualified`, `eliminated_in_phase`, `next_game_winner` (null para score_duel) |
| `challengerAnswer` | json | Resposta do desafiante (times ou resultado escolhido) |
| `challengedAnswer` | json | Resposta do desafiado (preenchida ao aceitar) |
| `scopeType` | enum | `next_round`, `next_phase`, `next_n_games` (apenas para score_duel) |
| `scopeValue` | int | N de jogos (quando scopeType = `next_n_games`, null para prediction) |
| `gameIds` | json | Array de IDs dos jogos do período |
| `challengerPoints` | int | Pontos do desafiador ao final |
| `challengedPoints` | int | Pontos do desafiado ao final |
| `winnerId` | int FK → users | Vencedor (null = empate ou não concluído) |
| `expiresAt` | timestamp | Prazo para aceitar (48h após criação) |
| `acceptedAt` | timestamp | Quando foi aceito |
| `concludedAt` | timestamp | Quando foi concluído |
| `createdAt` | timestamp | Criação |
| `updatedAt` | timestamp | Atualização |

**Tabela `x1_game_scores`** — pontuação por jogo dentro do X1:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int PK | Identificador |
| `x1ChallengeId` | int FK → x1_challenges | X1 ao qual pertence |
| `gameId` | int FK → games | Jogo apurado |
| `challengerPoints` | int | Pontos do desafiador neste jogo |
| `challengedPoints` | int | Pontos do desafiado neste jogo |
| `scoredAt` | timestamp | Quando foi apurado |

### 6.2 Procedures tRPC Necessárias

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `x1.create` | protectedProcedure | Criar novo desafio |
| `x1.accept` | protectedProcedure | Aceitar convite |
| `x1.decline` | protectedProcedure | Recusar convite |
| `x1.cancel` | protectedProcedure | Cancelar convite pendente |
| `x1.getByPool` | protectedProcedure | Listar X1s de um bolão |
| `x1.getById` | protectedProcedure | Detalhe de um X1 |
| `x1.getMyStats` | protectedProcedure | Estatísticas do usuário autenticado |
| `x1.getUserStats` | protectedProcedure | Estatísticas de outro usuário (perfil público) |
| `x1.getAdminStats` | adminProcedure | Painel admin de monitoramento |
| `x1.getRivalry` | protectedProcedure | Placar de rivalidade entre dois apostadores no bolão |

### 6.3 Jobs em Background

**Job: `x1-expiry-check`** — executado a cada hora via cron. Verifica X1s com status `pending` cujo `expiresAt` já passou e os marca como `expired`, enviando notificação ao desafiador.

**Job: `x1-score-update`** — acionado pelo job de scoring existente após apurar cada jogo. Para cada jogo apurado, verifica se há X1s ativos que incluem aquele jogo e atualiza `x1_game_scores` e os totais em `x1_challenges`. Se for o último jogo do período, conclui o X1 e dispara notificações de resultado.

**Job: `x1-badge-award`** — acionado após conclusão de cada X1. Verifica critérios de badges e atribui os que foram conquistados, integrando com o sistema de badges existente.

**Job: `x1-prediction-resolver`** — acionado após cada jogo ser marcado como `finished`. Para cada jogo apurado, verifica se há previsões ativas que podem ser resolvidas com base nos dados de placar e fase. Resolve automaticamente sem intervenção humana. Regra: acerto exige 100% — sem acerto parcial.

### 6.4 Segurança e Validações

O Chief Security Officer e o CSO identificaram os seguintes pontos críticos:

**Validações obrigatórias no backend:**

- Ambos os usuários devem ser membros ativos do mesmo bolão no momento da criação
- Não é possível criar X1 contra si mesmo
- Não é possível criar X1 se o bolão já está concluído ou arquivado
- Verificar limite de X1s simultâneos por plano antes de criar
- O escopo `next_n_games` deve ter no mínimo 3 e no máximo 30 jogos
- Apenas o desafiador pode cancelar um X1 pendente
- Apenas o desafiado pode aceitar ou recusar

**Anti-abuso:**

- Rate limit: máximo de 10 convites enviados por usuário por dia
- Usuário bloqueado no bolão não pode enviar ou receber X1s
- X1s não são possíveis em bolões com menos de 2 jogos restantes
- Logs de auditoria em `admin_logs` para criação, aceitação, recusa e cancelamento de X1s

---

## 7. KPIs e Métricas de Sucesso

### 7.1 KPIs Primários (BI + Analytics)

| KPI | Meta 30 dias pós-lançamento | Método de medição |
|-----|----------------------------|-------------------|
| Taxa de adoção | ≥ 20% dos usuários ativos criam ao menos 1 X1 | `x1_challenges` COUNT |
| Taxa de aceitação | ≥ 60% dos convites são aceitos | accepted / total |
| Retenção D7 de usuários com X1 ativo | ≥ 15pp acima da baseline | Cohort analysis |
| Compartilhamentos de card X1 | ≥ 500 no primeiro mês | Evento GA4 |
| X1s por bolão (média) | ≥ 3 por bolão ativo | Média simples |

### 7.2 KPIs Secundários

| KPI | Meta | Observação |
|-----|------|------------|
| Conversão Free → Pro atribuída ao X1 | ≥ 5% dos upgrades | UTM `source=x1_limit` |
| Badges de X1 conquistados | ≥ 1.000 no primeiro mês | `user_badges` COUNT |
| NPS de usuários com X1 | ≥ 10pp acima da média | Survey in-app |

### 7.3 Eventos GA4 a Configurar

| Evento | Parâmetros |
|--------|-----------|
| `x1_created` | `pool_id`, `scope_type`, `challenger_plan` |
| `x1_accepted` | `x1_id`, `time_to_accept_hours` |
| `x1_declined` | `x1_id` |
| `x1_concluded` | `x1_id`, `winner_plan`, `point_diff` |
| `x1_card_shared` | `x1_id`, `platform` |
| `x1_limit_hit` | `user_plan`, `current_active_count` |
| `x1_upgrade_click` | `from_screen` |

---

## 8. Estratégia de Monetização

### 8.1 Paywall do X1

O limite de X1s simultâneos é o principal gatilho de upgrade relacionado à feature. Quando um usuário Gratuito tenta criar um segundo X1 simultâneo, o sistema exibe o **UpgradeModal** (ICE-006) com a mensagem:

> *"Você já tem 1 X1 ativo. No plano Pro você pode ter até 5 ao mesmo tempo. Bora dominar o bolão?"*

### 8.2 Features Exclusivas por Plano

| Feature X1 | Free | Pro | Unlimited |
|------------|------|-----|-----------|
| Criar X1 | ✅ (1 ativo) | ✅ (5 ativos) | ✅ (ilimitado) |
| Aceitar X1 | ✅ | ✅ | ✅ |
| Histórico de X1s | Últimos 3 | Ilimitado | Ilimitado |
| Card de compartilhamento | ✅ (com marca d'água) | ✅ (com marca d'água) | ✅ (com marca d'água) |

> **Removido:** diferença de card sem marca d'água por plano — card sempre exibido com marca d'água em todos os planos.
> **Removido:** estatísticas avançadas — não há distinção de nível de estatísticas entre planos.

### 8.3 Impacto no MRR (Estimativa)

Assumindo 500 usuários ativos com 20% de adoção e taxa de conversão de 5% dos que atingem o limite:

- 100 usuários criam X1s
- ~30 atingem o limite (múltiplos bolões)
- 5% convertem = ~1-2 upgrades/mês por ciclo de bolão
- Impacto direto modesto, mas o efeito de retenção e viralidade é o principal valor

---

## 9. Estratégia de Lançamento

### 9.1 Feature Flag

O X1 deve ser lançado com feature flag `x1_enabled` no painel Admin, permitindo:

- Ativar/desativar globalmente sem deploy
- Ativar apenas para bolões específicos (campo `x1Enabled` na tabela `pools`)
- Ativar apenas para usuários Pro/Ilimitado no lançamento inicial (soft launch)

### 9.2 Fases de Rollout

| Fase | Público | Duração | Critério de avanço |
|------|---------|---------|-------------------|
| Alpha | Super Admin + 5 usuários selecionados | 1 semana | 0 bugs críticos |
| Beta | Todos os usuários Pro e Ilimitado | 2 semanas | Taxa de aceitação ≥ 50% |
| GA | Todos os usuários (com limites por plano) | Permanente | — |

### 9.3 Comunicação de Lançamento

**In-app:** banner no dashboard na primeira sessão após o lançamento com CTA "Conheça o X1".

**Notificação push:** para usuários com push habilitado — *"Novidade no Plakr! Agora você pode desafiar seus amigos no X1. Quem vai dominar o bolão?"*

**WhatsApp/Telegram:** mensagem nos grupos dos bolões ativos anunciando a feature (via organizador, não automático).

---

## 10. Riscos e Mitigações

### 10.1 Avaliação do Risk Advisor

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Usuários usam X1 para assédio/provocação | Média | Alto | Botão "Reportar X1" + moderação admin |
| Performance: muitos X1s ativos sobrecarregam o scoring | Baixa | Alto | Job assíncrono isolado + índices em `x1_challenges(poolId, status)` |
| Usuários criam X1s para "farmar" badges artificialmente | Baixa | Médio | Rate limit + análise de padrão suspeito no admin |
| Feature subutilizada (baixa adoção) | Média | Médio | Feature flag para desativar; A/B test com notificação de sugestão |
| Confusão entre pontos do X1 e pontos do bolão | Alta | Baixo | UX clara: X1 é sempre "dentro do bolão", nunca substitui o ranking |

### 10.2 Decisão de Risk Advisor

> **Recomendação:** Prosseguir com o desenvolvimento. O risco mais relevante é o de performance no job de scoring — deve ser tratado como blocker antes do lançamento. Os demais riscos são mitigáveis com feature flag e monitoramento. A feature tem alto potencial de engajamento com baixo risco de dano à plataforma.

---

## 11. Backlog de Evoluções Futuras

O Backlog Knowledge Architect registra as seguintes ideias para versões futuras do X1, capturadas durante a orquestração:

| ID | Ideia | ICE Score | Observação |
|----|-------|-----------|------------|
| X1-EVO-001 | X1 em grupo: 3v3 ou times dentro do bolão | 6/10 | Alta complexidade, alto engajamento |
| X1-EVO-002 | X1 com aposta simbólica (sem dinheiro real) — ex: "perdedor muda o avatar" | 8/10 | Viralidade alta, baixo esforço |
| X1-EVO-003 | Torneio de X1: bracket eliminatório dentro do bolão | 7/10 | Feature premium exclusiva |
| X1-EVO-004 | X1 cross-bolão: desafiar alguém de outro bolão com jogos em comum | 5/10 | Alta complexidade técnica |
| X1-EVO-005 | Ranking global de X1s: quem tem mais vitórias na plataforma | 7/10 | Fácil de implementar, alto engajamento |

---

## 12. Histórias de Usuário (Product Owner)

### US-X1-001 — Criar Desafio
> **Como** apostador de um bolão,  
> **Quero** poder desafiar outro apostador do mesmo bolão para um X1,  
> **Para que** eu tenha uma rivalidade direta e motivação extra para acompanhar os jogos.

**Critérios de aceitação:**
- Posso acessar o X1 pelo perfil do adversário ou pelo hub de X1s do bolão
- Posso escolher o escopo do desafio (próxima rodada, próximos N jogos, até o fim)
- Recebo confirmação visual de que o convite foi enviado
- O adversário recebe notificação in-app e push

### US-X1-002 — Acompanhar Disputa
> **Como** apostador com X1 ativo,  
> **Quero** acompanhar o placar do meu X1 em tempo real,  
> **Para que** eu saiba se estou vencendo ou perdendo a cada jogo apurado.

**Critérios de aceitação:**
- Placar atualizado automaticamente após cada jogo apurado
- Visualizo os palpites de ambos para cada jogo do X1
- Recebo notificação quando um jogo do meu X1 é apurado

### US-X1-003 — Receber Resultado
> **Como** apostador com X1 concluído,  
> **Quero** receber o resultado com destaque e poder compartilhá-lo,  
> **Para que** eu comemore a vitória (ou aceite a derrota) com a galera.

**Critérios de aceitação:**
- Recebo notificação push e in-app com o resultado
- Posso gerar e compartilhar o card visual do X1
- Badge é atribuído automaticamente se critério for atingido

### US-X1-004 — Ver Histórico
> **Como** apostador,  
> **Quero** ver meu histórico de X1s e estatísticas,  
> **Para que** eu acompanhe minha evolução e rivalidades ao longo do tempo.

**Critérios de aceitação:**
- Histórico disponível no meu perfil público
- Estatísticas: vitórias, derrotas, empates, taxa de vitória
- Adversários mais frequentes e mais difíceis

---

## 13. Estimativa de Esforço

| Componente | Esforço estimado | Observações |
|------------|-----------------|-------------|
| Schema + migration | 0,5 dia | 2 tabelas novas |
| Backend (procedures + jobs) | 3 dias | 9 procedures + 3 jobs |
| Frontend — Hub e Detalhe | 2 dias | 3 telas novas |
| Frontend — Atualizações (ranking, perfil, notificações) | 1,5 dias | Modificações em telas existentes |
| Badges X1 (7 novos badges) | 0,5 dia | Inserção via Admin |
| Card de compartilhamento | 1 dia | Geração de imagem server-side |
| Testes (Vitest) | 1 dia | Cobertura dos jobs e procedures |
| Admin — Monitoramento | 0,5 dia | Painel simples de métricas |
| **Total estimado** | **~10 dias** | Pode ser dividido em 2 sprints |

---

*Documento gerado pela orquestração dos 40 especialistas do ecossistema Plakr. Próximo passo: validação pelo gestor e priorização no roadmap.*
