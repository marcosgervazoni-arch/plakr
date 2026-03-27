# PRE-001 — Campo `roundNumber` na tabela `games`

> **Tipo:** Pré-requisito técnico bloqueante
> **Prioridade:** Alta — bloqueia o desenvolvimento do X1
> **Origem:** Discussão durante especificação da feature "Vem pro X1" (2026-03-27)
> **Responsável:** CTO / Senior Fullstack Developer
> **Status:** Aprovado — aguardando implementação
> **Estimativa:** ~3,75 horas

---

## Por que esse campo é necessário

Durante a especificação da feature "Vem pro X1", identificamos que a opção de escopo **"Próxima rodada"** é inviável sem um campo numérico de rodada no banco de dados. O campo `phase` existente é texto livre, sem padronização garantida, e não permite lógica confiável de "qual é a próxima rodada".

Além disso, todas as principais APIs de dados esportivos do mercado retornam o número da rodada como campo nativo:

| API | Nome do campo | Exemplo de valor |
|-----|--------------|-----------------|
| API-Football | `league.round` | `"Regular Season - 5"` → extrair `5` |
| API-Futebol (BR) | `rodada` | `5` |
| Football-Data.org | `matchday` | `5` |
| Sportmonks | `round_id` | referência a objeto de rodada |

Sem `roundNumber` no banco, esse dado é descartado em toda importação — seja manual, via planilha ou via API futura.

---

## O que precisa ser feito

### 1. Migration SQL

Adicionar a coluna `roundNumber` à tabela `games`:

```sql
ALTER TABLE games ADD COLUMN roundNumber INT NULL;
CREATE INDEX idx_games_tournament_round ON games (tournamentId, roundNumber);
```

### 2. Atualizar o schema Drizzle (`drizzle/schema.ts`)

Adicionar o campo na definição da tabela `games`:

```ts
roundNumber: int("roundNumber"),
```

Posicionamento sugerido: logo após o campo `phase`, para manter agrupamento semântico.

### 3. Atualizar o formulário de cadastro manual de jogos (Admin)

Na tela de cadastro/edição de jogo no painel Admin, adicionar campo numérico **"Rodada"** (opcional). Exibir apenas quando o campeonato for do tipo `league` ou `custom`.

### 4. Atualizar o template de importação CSV/Sheets

Adicionar coluna opcional `roundNumber` (ou `rodada`) no template padrão de importação. A coluna deve ser a 6ª coluna (após `venue`), mantendo retrocompatibilidade com planilhas antigas que não têm essa coluna.

Formato esperado: número inteiro positivo (ex: `1`, `5`, `38`).

### 5. Atualizar a lógica de importação no backend

**`importGames` e `importFromSheets`** em `server/routers/tournaments.ts`: ler a 6ª coluna como `roundNumber` quando presente e válida (número inteiro > 0).

**Integração futura com API externa**: ao mapear campos da API para o banco, incluir o mapeamento:
- `league.round` → extrair número com regex `/(\d+)/` → `roundNumber`
- `rodada` → `roundNumber` (direto)
- `matchday` → `roundNumber` (direto)

### 6. Atualizar a exibição de jogos no bolão (opcional, mas recomendado)

Permitir que a listagem de jogos no bolão use `roundNumber` como critério de agrupamento secundário, além do `phase` atual. Isso melhora a experiência em campeonatos de pontos corridos onde o `phase` é sempre o mesmo (ex: `"Brasileirão"`).

---

## Lógica da "Próxima Rodada" para o X1

Com o campo disponível, a query de seleção de jogos para o escopo "Próxima rodada" no X1 é:

```sql
SELECT * FROM games
WHERE tournamentId = :tournamentId
  AND roundNumber = (
    SELECT MIN(roundNumber)
    FROM games
    WHERE tournamentId = :tournamentId
      AND status = 'scheduled'
      AND roundNumber IS NOT NULL
  )
ORDER BY matchDate ASC;
```

**Regra de rodada em andamento:** se a rodada com menor `roundNumber` tiver ao menos um jogo com `status = 'finished'` e ao menos um com `status = 'scheduled'`, ela está em andamento. Nesse caso, o X1 não oferece essa rodada como opção — avança para a próxima rodada completamente não iniciada.

---

## Critérios de aceitação

- [ ] Coluna `roundNumber` criada no banco sem erros
- [ ] Schema Drizzle atualizado e em sincronia com o banco
- [ ] Formulário Admin exibe campo "Rodada" ao cadastrar/editar jogo
- [ ] Importação via CSV/Sheets lê `roundNumber` quando presente
- [ ] Jogos já cadastrados mantêm `roundNumber = null` sem erros
- [ ] Query de "próxima rodada" retorna os jogos corretos em teste manual
- [ ] Índice composto criado em `(tournamentId, roundNumber)`

---

## Benefícios além do X1

Este campo resolve problemas que existem independentemente do X1:

- **Exibição "Rodada X de Y"** na tela de apostas — hoje impossível com precisão
- **Filtro por rodada** no ranking e nas minhas apostas
- **Estatísticas por rodada** (pontos por rodada, evolução ao longo do campeonato)
- **Lembretes de apostas por rodada** ("A Rodada 5 começa em 2 dias — você tem 3 jogos sem palpite")
- **Integração com APIs externas** — campo de recepção já pronto quando a integração for implementada

---

## Referências

- Especificação da feature "Vem pro X1": `docs/features/vem-pro-x1.md` — Seção 0
- Schema atual: `drizzle/schema.ts` — tabela `games`
- Importação de jogos: `server/routers/tournaments.ts` — procedures `importGames` e `importFromSheets`
