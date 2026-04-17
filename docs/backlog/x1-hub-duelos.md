# Backlog — Hub de Duelos (Arena Pública do Bolão)

> **ID:** X1-EVO-006
> **Registrado em:** 2026-04-17
> **Status:** Especificação aprovada — pronto para desenvolvimento
> **Dependência:** X1 base implementado e estável

---

## Contexto

O botão "Jogos" e o botão "Palpites" na barra inferior do bolão levam essencialmente ao mesmo conteúdo. O espaço do "Jogos" deve ser substituído por **"Duelos ⚔️"**, dando visibilidade permanente ao sistema de X1s na navegação principal do bolão.

---

## Conceito

**Arena pública do bolão** — qualquer membro pode ver todos os duelos (pendentes, em andamento e encerrados) daquele bolão. Cria narrativa coletiva de rivalidades e torna o X1 uma feature visível e divertida para todos, não apenas para os envolvidos.

---

## Navegação

- Botão **"Duelos"** (ícone `Swords` do lucide-react) substitui "Jogos" na barra inferior do bolão
- Badge de contagem no ícone quando o usuário logado tiver duelos pendentes de resposta
- Rota: `/pool/:slug/duelos` (aba `duelos` no PoolPage)

---

## Estrutura da Tela

### Bloco 1 — Estatísticas do bolão (topo)
Números gerais do bolão — não do usuário logado:
- Total de duelos criados no bolão
- Contadores: Em andamento · Pendentes · Encerrados
- Apostador com mais vitórias no bolão (destaque)

### Bloco 2 — Seus duelos (destaque pessoal)
Seção em destaque para o usuário logado. Só aparece se o usuário tiver ao menos 1 duelo.
- Pendentes de resposta: CTA direto **Aceitar** / **Recusar** sem entrar no detalhe
- Em andamento: placar parcial ou status de previsão
- Histórico pessoal resumido

### Bloco 3 — Todos os duelos do bolão (arena pública)
Lista pública com abas ou filtros: **Pendentes · Em andamento · Encerrados**

Para cada duelo exibir:
- Avatares + nomes dos dois apostadores
- Tipo do desafio:
  - ⚔️ **Duelo de Palpites** (`score_duel`): placar parcial (pts A × pts B) + jogos restantes no período
  - 🏆 **Previsão de Campeonato** (`prediction`): o que cada um apostou + status ("aguardando resolução" ou quem acertou)
- Escopo/período do desafio
- Badge de resultado para encerrados (Vitória / Derrota / Empate)

### Bloco 4 — CTA "Desafiar alguém"
Botão fixo ou flutuante na tela que leva ao ranking do bolão para o usuário escolher o adversário e iniciar um novo X1.

---

## Regras de Negócio

- **Visibilidade:** todos os membros do bolão veem todos os duelos (público dentro do bolão)
- **Histórico:** duelos finalizados permanecem no histórico enquanto o bolão existir
- **Usuário que saiu do bolão:** duelos finalizados permanecem no histórico (sem ocultação)
- **Estatísticas:** sempre escopadas ao bolão atual (não acumuladas entre bolões)

---

## Mudanças Técnicas Necessárias

### Frontend
- Substituir aba "Jogos" por "Duelos" na barra inferior do `PoolPage`
- Criar componente `PoolDuelos.tsx` (ou aba dentro do PoolPage)
- Badge de notificação no ícone da barra quando houver pendentes

### Backend
- Nova procedure `x1.getByPool` — listar todos os X1s de um bolão (já prevista na spec do X1 base)
- Nova procedure `x1.getPoolStats` — estatísticas agregadas do bolão (total, em andamento, encerrados, top vencedor)
- Procedure `x1.getMyDuels` — duelos do usuário logado naquele bolão (pendentes, ativos, histórico)

### Schema
- Nenhuma mudança de schema necessária — usa as tabelas `x1_challenges` e `x1_game_scores` já especificadas

---

## Impacto Esperado

| Métrica | Hipótese |
|---|---|
| Visibilidade do X1 | De feature escondida para destaque na navegação principal |
| Retorno diário | Apostador volta para acompanhar duelos em andamento |
| Criação de novos X1s | CTA direto na tela aumenta taxa de adoção |
| Engajamento social | Rivalidades públicas criam conversas no grupo do bolão |

**Impacto:** Alto (retenção, retorno diário, adoção do X1). **Esforço:** Médio.

---

## Adições pós-orquestração (2026-04-17)

> Resultado da validação pelos 40 especialistas. Detalhes em `docs/backlog/x1-hub-duelos-orquestracao.md`.

### Mudanças Técnicas Adicionais

**Backend:**
- `x1.getByPool` e `x1.getMyDuels` devem ter paginação (page size 20)
- `x1.getPoolStats` deve ter cache com TTL 60s, invalidado por evento (novo duelo, aceitação, conclusão)
- Todas as procedures devem validar membership do usuário no bolão antes de retornar dados
- Índices a criar em `x1_challenges`: `(pool_id, status)`, `(challenger_id, pool_id)`, `(challenged_id, pool_id)`

**Frontend:**
- Optimistic update ao aceitar/recusar duelo no hub (sem entrar no detalhe)
- Estado vazio com mensagem encorajadora + CTA "Desafiar alguém"
- Ícone `Swords` validado contra identidade visual Plakr (peso, cor ativa/inativa, badge)
- Microtextos definidos para todos os estados antes da implementação

**Operação:**
- Feature flag `x1_hub_enabled` no Admin para rollout controlado
- Ativar primeiro para bolões piloto antes do rollout geral
