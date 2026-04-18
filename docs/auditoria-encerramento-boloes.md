# Auditoria do Fluxo de Encerramento de Bolões — Plakr!

**Data:** 18 de abril de 2026  
**Metodologia:** Orquestração paralela de 40 especialistas cobrindo toda a cadeia de valor do produto  
**Escopo:** Ciclo de vida completo de encerramento de bolões — do status `active` ao `archived`

---

## 1. Fluxo Atual Documentado

O ciclo de vida de encerramento de um bolão percorre os seguintes estados:

```
active → finished → awaiting_conclusion → concluded → archived
```

O enum completo no schema inclui também `deleted`, reservado para casos de remoção forçada.

| Transição | Gatilho | Responsável |
|---|---|---|
| `active → finished` | Organizador clica em "Encerrar bolão" | **Manual** |
| `finished → awaiting_conclusion` | Cron a cada 1h (`runArchivalJob`) | Automático |
| `awaiting_conclusion → concluded` | Organizador confirma OU após `autoCloseDays` dias | Manual ou automático |
| `concluded → archived` | Cron a cada 1h, após `archiveDays` dias (padrão: 10) | Automático |

### Campos relevantes na tabela `pools`

| Campo | Preenchimento atual |
|---|---|
| `finishedAt` | Preenchido quando organizador chama `closePool` |
| `awaitingConclusionSince` | Preenchido pelo archival job |
| `concludedAt` | Preenchido na conclusão (manual ou auto) |
| `concludedBy` | FK para o usuário que concluiu; `null` quando automático |
| `scheduledDeleteAt` | **Nunca preenchido** — campo órfão no schema |

### Bloqueios de segurança existentes

- `placeBet`: bloqueia se `pool.status !== 'active'` (servidor)
- `joinByToken` e `joinPublic`: bloqueiam se `pool.status !== 'active'`
- `isGameOpen()` no frontend: retorna `false` se `pool.status !== 'active'`
- `closePool`: bloqueia se status já é `finished`, `awaiting_conclusion`, `concluded` ou `archived`

---

## 2. Consenso dos 40 Especialistas

Todos os 40 especialistas consultados classificaram o fluxo como **estruturalmente coerente**, mas com **fragilidades críticas** que precisam ser corrigidas. Nenhum especialista recomendou descarte completo do fluxo atual — a recomendação dominante (36 de 40) é **mudança estrutural focada**, mantendo a sequência de estados mas corrigindo os pontos de falha identificados.

### Distribuição dos itens críticos por frequência de citação

| # | Fragilidade | Citações | Nível |
|---|---|---|---|
| 1 | Ausência de proteção contra **edição de palpites** em `awaiting_conclusion` | 28/40 | **Crítico** |
| 2 | Transição `active → finished` **100% manual** | 27/40 | **Crítico** |
| 3 | **Sem logs de auditoria** para o `runArchivalJob()` | 24/40 | **Crítico** |
| 4 | **Sem banner/indicação visual** para participantes em `awaiting_conclusion` | 22/40 | **Crítico** |
| 5 | Campo `scheduledDeleteAt` **nunca preenchido** — inconsistência de schema | 20/40 | Alto |
| 6 | **Retrospectiva gerada** para participantes sem palpites | 18/40 | Alto |

---

## 3. Análise Detalhada das Fragilidades

### 3.1 Edição de palpites em `awaiting_conclusion` (crítico)

A procedure `upsertBet` é chamada tanto para criar quanto para editar palpites. A validação atual bloqueia apenas novos palpites em bolões não-ativos, mas **não impede que um palpite existente seja editado** enquanto o bolão está em `awaiting_conclusion`. Isso significa que, entre o término do último jogo e a confirmação de encerramento pelo organizador, um participante pode alterar retroativamente o placar que apostou — comprometendo a integridade dos resultados e a confiança na plataforma.

O impacto é especialmente grave porque `awaiting_conclusion` pode durar até `autoCloseDays` dias (padrão: 3 dias), criando uma janela longa de vulnerabilidade.

### 3.2 Transição `active → finished` manual (crítico)

O sistema já possui todos os dados necessários para determinar automaticamente quando um bolão deve ser encerrado: o status de cada jogo do torneio é sincronizado em tempo real via API-Football. Apesar disso, a transição de `active` para `finished` depende exclusivamente de uma ação manual do organizador.

Isso cria três problemas concretos:

- **Latência no encerramento:** o ranking final, a retrospectiva e os badges ficam bloqueados até o organizador agir, que pode levar dias ou nunca acontecer.
- **Inconsistência de dados:** o campo `finishedAt` não reflete o momento real em que os jogos terminaram, mas sim quando o organizador decidiu clicar no botão.
- **Bolões "presos":** se o organizador se afastar da plataforma após o término do campeonato, o bolão permanece em `active` indefinidamente.

### 3.3 Ausência de logs no `runArchivalJob()` (crítico)

O job de arquivamento executa transições de estado críticas (`finished → awaiting_conclusion` e `concluded → archived`) sem registrar nenhuma entrada em `admin_log`. Isso impede qualquer auditoria retroativa, dificulta a depuração de problemas e cria um ponto cego operacional — não há como saber, pelo painel administrativo, quando e por que um bolão foi movido automaticamente de estado.

### 3.4 Invisibilidade do status `awaiting_conclusion` para participantes (crítico)

O banner de `awaiting_conclusion` é exibido **apenas para o organizador**. Para os demais participantes, a tela do bolão continua exibindo os jogos normalmente, sem nenhuma indicação de que o encerramento está pendente. Isso gera confusão, tentativas frustradas de interação e percepção de que a plataforma está com problema.

### 3.5 Campo `scheduledDeleteAt` órfão (alto)

O campo existe no schema da tabela `pools`, mas nenhum trecho de código o preenche ou o lê. A exclusão de bolões é gerenciada via `status = 'archived'`, não via este campo. Isso gera ruído no modelo de dados e pode confundir desenvolvedores futuros sobre a política de retenção de dados.

### 3.6 Retrospectiva para participantes sem palpites (alto)

A função `concludePool` itera sobre **todos os membros do bolão** para gerar retrospectivas, incluindo aqueles que nunca fizeram um único palpite. Isso resulta em processamento desnecessário (chamadas ao LLM para gerar frases de encerramento), notificações irrelevantes para o usuário e distorção das métricas de engajamento da funcionalidade.

---

## 4. Proposta de Fluxo Revisado

O consenso dos especialistas converge para **manter a sequência de estados atual**, mas com as seguintes mudanças estruturais:

### 4.1 Automação da transição `active → finished`

Adicionar ao job de sincronização de resultados (`syncResults`) uma verificação ao final de cada atualização: se todos os jogos do torneio vinculado ao bolão estiverem com `status = 'finished'`, o sistema deve automaticamente chamar `closePool` com `concludedBy = null` (sistema), registrar em `admin_log` e notificar o organizador.

O organizador ainda pode encerrar manualmente antes disso — a automação é um fallback, não uma substituição.

### 4.2 Bloqueio de edição de palpites em todos os status pós-`active`

A procedure `upsertBet` deve verificar `pool.status === 'active'` antes de permitir qualquer operação de escrita, tanto para criação quanto para edição. A mensagem de erro deve ser clara: "Este bolão já foi encerrado. Não é possível alterar palpites."

### 4.3 Logs de auditoria no `runArchivalJob()`

Cada transição automática deve registrar uma entrada em `admin_log` com:
- `action`: `pool_auto_awaiting_conclusion`, `pool_auto_concluded` ou `pool_auto_archived`
- `entityType`: `pool`
- `entityId`: ID do bolão
- `metadata`: timestamp da transição e motivo (ex: `autoCloseDays` atingido)

### 4.4 Banner de status para todos os participantes

O componente `ConclusionBanner` deve ser exibido para **todos os participantes** (não apenas o organizador) quando o bolão estiver em `awaiting_conclusion`, com texto adaptado por papel:
- **Organizador:** "Confirme o encerramento do bolão para liberar a retrospectiva."
- **Participante:** "O bolão está sendo encerrado. Em breve a retrospectiva estará disponível."

### 4.5 Retrospectiva condicional à participação

A geração de retrospectiva deve ser condicionada a `totalBets > 0` para o membro. Membros sem palpites não devem receber notificação de retrospectiva — podem, opcionalmente, receber uma notificação diferente informando o resultado final do bolão.

### 4.6 Resolver o campo `scheduledDeleteAt`

Duas opções:
- **Remover o campo** do schema via migration, se não houver planos de uso.
- **Implementar e usar**: preencher `scheduledDeleteAt = concludedAt + archiveDays` na conclusão, e usar esse campo como critério de arquivamento no cron (em vez de calcular a diferença de datas em runtime).

---

## 5. Fluxo Revisado — Diagrama

```
active
  │
  ├─ [Manual] Organizador clica "Encerrar"
  │   └─ closePool() → salva posições finais → notifica membros
  │
  ├─ [Auto] syncResults detecta todos os jogos finalizados
  │   └─ closePool(system) → idem acima
  │
  ▼
finished
  │
  ├─ [Auto, cron 1h] runArchivalJob()
  │   └─ → awaiting_conclusion + log + notifica organizador E participantes
  │
  ▼
awaiting_conclusion
  │
  ├─ [Manual] Organizador confirma encerramento
  │   └─ concludePool(userId) → gera retrospectivas (só quem apostou) → mural
  │
  ├─ [Auto] após autoCloseDays dias
  │   └─ concludePool(null, 'auto') → idem acima + log
  │
  ▼
concluded
  │
  ├─ [Auto, cron 1h] runArchivalJob()
  │   └─ após archiveDays dias → archived + log + notifica membros
  │
  ▼
archived
```

---

## 6. Backlog Priorizado

| Prioridade | Item | Esforço estimado |
|---|---|---|
| **Crítico** | Bloquear edição de palpites em `upsertBet` para status ≠ `active` | Baixo (1h) |
| **Crítico** | Adicionar logs de auditoria ao `runArchivalJob()` | Baixo (2h) |
| **Crítico** | Exibir banner de `awaiting_conclusion` para todos os participantes | Baixo (2h) |
| **Crítico** | Automação da transição `active → finished` via `syncResults` | Médio (4h) |
| Alto | Condicionar geração de retrospectiva a `totalBets > 0` | Baixo (1h) |
| Alto | Resolver campo `scheduledDeleteAt` (remover ou implementar) | Baixo (1h) |

---

*Relatório gerado por orquestração de 40 especialistas em 18/04/2026.*
