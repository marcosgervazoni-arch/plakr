# Regra: Posição no Bolão na Análise da IA — Cuidado com Rodada Incompleta

**Data:** 2026-03-31  
**Categoria:** Regra de Negócio · Análise IA · Scoring  
**Contexto:** Definida durante prototipagem do GameCard com zona de análise inteligente.

---

## Regra

A análise gerada pela IA **não deve afirmar a posição do usuário no bolão** (ex: "você ficou em 1º nesta rodada") quando a rodada ainda não foi completamente processada pelos cron jobs.

A posição só é confiável quando **todos os jogos da rodada** tiverem sido finalizados e seus resultados processados pelo `syncResults`. Antes disso, a classificação parcial pode induzir o usuário a acreditar que está em uma posição que pode mudar.

---

## Comportamento Correto

| Situação | O que a IA pode dizer |
|----------|----------------------|
| Todos os jogos da rodada finalizados e pontuados | Pode mencionar posição: "Você ficou em 1º nesta rodada" |
| Rodada ainda em andamento (outros jogos pendentes) | Mencionar apenas o desempenho no jogo: "Você foi o único a cravar o placar neste jogo" |
| Rodada finalizada mas cron ainda não rodou | Omitir posição — usar apenas dados do jogo específico |

---

## Implementação Sugerida

Na procedure que gera a análise da IA (chamada pelo `syncResults` ao finalizar um jogo):

1. Verificar se todos os jogos da rodada (`round`) do campeonato têm `status = 'finished'` e `points_calculated = true`
2. Se sim: incluir posição no contexto enviado ao LLM
3. Se não: omitir posição do contexto — a IA não terá essa informação e não poderá inventar

```ts
const allRoundGamesFinished = roundGames.every(
  g => g.status === 'finished' && g.pointsCalculated
);
const poolContext = allRoundGamesFinished
  ? { userRank: userRankInRound, totalParticipants: pool.memberCount }
  : { userRank: null }; // IA não menciona posição
```

---

## Origem

Feedback do Gerva durante prototipagem do GameCard v5 (2026-03-31).
