# Fluxo do Modal X1 — Redesenho Completo

> **Versão:** 2.0 | **Data:** 2026-03-28 | **Status:** Aguardando aprovação antes da implementação
> Baseado na spec v1.6 e nas instruções do usuário de 28/03/2026.

---

## Resumo das Mudanças em Relação à Versão Anterior

| Aspecto | Versão anterior (incorreta) | Nova versão (correta) |
|---------|----------------------------|-----------------------|
| Opções de previsão | Dinâmicas (geradas pelo torneio) | Fixas + condicionais conforme formato |
| Tipos removidos | top_scorer, zebra, exact_score ainda presentes | Definitivamente removidos |
| Restrição ao desafiado | Não implementada | Desafiado não pode escolher o mesmo palpite |
| Visibilidade da escolha | Desafiado não via a escolha do desafiante | Desafiado vê a escolha antes de responder |

---

## Opções Disponíveis no Passo 1

O passo 1 é uma **lista única sem separação por categoria**. As opções variam conforme o formato do campeonato:

| # | Opção | Disponibilidade | Tipo interno |
|---|-------|----------------|--------------|
| 1 | **Disputa de palpites — quem pontua mais?** | Sempre | `score_duel` |
| 2 | **Quem vai ser o campeão?** | Sempre | `prediction / champion` |
| 3 | **Quem classifica no grupo [X]?** | Apenas campeonatos com fase de grupos | `prediction / group_qualified` |
| 4 | **Quem passa para a fase [X]?** | Apenas campeonatos com chaveamento | `prediction / phase_qualified` |

> **Opções removidas definitivamente:** vice-campeão, eliminado em fase, vencedor de jogo específico, artilheiro, zebra, placar exato.

---

## Fluxo Completo por Opção

---

### Opção 1 — Disputa de Palpites (`score_duel`)

**Disponível:** sempre, em qualquer formato de campeonato.

```
PASSO 1 — Lista de opções
┌──────────────────────────────────────────────────┐
│  Vem pro X1                                      │
│  vs Zé                                           │
├──────────────────────────────────────────────────┤
│  Desafiar o Zé — o que você aposta?              │
├──────────────────────────────────────────────────┤
│  ● Disputa de palpites — quem pontua mais?  →    │
│  ○ Quem vai ser o campeão?                  →    │
│  ○ Quem classifica no Grupo G?              →    │  ← só se houver grupos
│  ○ Quem passa para a semifinal?             →    │  ← só se houver fases
└──────────────────────────────────────────────────┘

        ↓ Seleciona "Disputa de palpites"

PASSO 2 — Escolha do escopo (período)
┌──────────────────────────────────────────────────┐
│  ← Disputa de palpites — quem pontua mais?       │
│  Por quantos jogos você aposta?                  │
├──────────────────────────────────────────────────┤
│  ○  Próxima rodada  (N jogos)   [só em league]   │
│  ○  Próxima fase    (N jogos)   [só em copa]     │
│  ○  Próximos 5 jogos                             │
│  ●  Próximos 10 jogos                            │
│  ○  Próximos 20 jogos                            │
├──────────────────────────────────────────────────┤
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘

        ↓ Confirma

RESULTADO: Desafio criado. Desafiado recebe notificação.
Desafiado aceita/recusa sem precisar escolher nada
(o score_duel usa os palpites já feitos automaticamente).
```

---

### Opção 2 — Quem vai ser o campeão? (`prediction / champion`)

**Disponível:** sempre, em qualquer formato de campeonato.

```
PASSO 1 — Lista de opções
(igual ao descrito acima, usuário seleciona "Quem vai ser o campeão?")

        ↓ Seleciona

PASSO 2 — Desafiante escolhe seu palpite
┌──────────────────────────────────────────────────┐
│  ← Quem vai ser o campeão?                       │
│  Na sua opinião, quem vai ser o campeão?         │
├──────────────────────────────────────────────────┤
│  🇧🇷 Brasil                                      │
│  🇦🇷 Argentina                                   │
│  🇫🇷 França                                      │
│  ... (lista de times do campeonato)              │
├──────────────────────────────────────────────────┤
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘

        ↓ Confirma (ex: escolheu Brasil)

RESULTADO: Desafio criado com challengerAnswer = "Brasil".
Desafiado recebe notificação.

        ↓ Desafiado abre o convite

PASSO 3 — Desafiado vê a escolha e responde
┌──────────────────────────────────────────────────┐
│  Gerva apostou: 🇧🇷 Brasil                       │
│  Qual é o seu palpite?                           │
│  (não pode ser Brasil)                           │
├──────────────────────────────────────────────────┤
│  🇦🇷 Argentina                                   │
│  🇫🇷 França                                      │
│  🇩🇪 Alemanha                                    │
│  ... (lista sem Brasil)                          │
├──────────────────────────────────────────────────┤
│  [Aceitar desafio]  [Recusar]                    │
└──────────────────────────────────────────────────┘

RESOLUÇÃO AUTOMÁTICA: quando o jogo final (phase = "final",
status = "finished") for apurado, o job compara as respostas
com o time vencedor e declara o vencedor do X1.
```

---

### Opção 3 — Quem classifica no grupo [X]? (`prediction / group_qualified`)

**Disponível:** apenas em campeonatos com fase de grupos (`isGroupsKnockout = true`).
A opção aparece uma vez para cada grupo disponível no campeonato.

```
PASSO 1 — Lista de opções
(inclui "Quem classifica no Grupo G?" se o campeonato tem Grupo G)

        ↓ Seleciona "Quem classifica no Grupo G?"

PASSO 2 — Desafiante escolhe seus 2 times classificados
┌──────────────────────────────────────────────────┐
│  ← Quem classifica no Grupo G?                  │
│  Escolha os 2 times que você acha que passam:   │
├──────────────────────────────────────────────────┤
│  ☑ Brasil                                        │
│  ☐ Sérvia                                        │
│  ☑ Suíça                                         │
│  ☐ Camarões                                      │
│  (selecione exatamente 2)                        │
├──────────────────────────────────────────────────┤
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘

        ↓ Confirma (ex: escolheu Brasil + Suíça)

RESULTADO: challengerAnswer = ["Brasil", "Suíça"]

        ↓ Desafiado abre o convite

PASSO 3 — Desafiado vê a escolha e responde (caso especial)
┌──────────────────────────────────────────────────┐
│  Gerva apostou em: 🇧🇷 Brasil e 🇨🇭 Suíça        │
│                                                  │
│  Como o grupo tem 4 times e passam 2,            │
│  seu palpite é automaticamente:                  │
│  🇷🇸 Sérvia e 🇨🇲 Camarões                       │
│                                                  │
│  Aceita apostar nesses times?                    │
├──────────────────────────────────────────────────┤
│  [Aceitar desafio]  [Recusar]                    │
└──────────────────────────────────────────────────┘

NOTA: Para grupos de 4 times com 2 classificados, as escolhas
são automaticamente opostas — o desafiado não precisa selecionar.
O sistema exibe a escolha automática e pede confirmação.

RESOLUÇÃO AUTOMÁTICA: quando todos os jogos do grupo estiverem
com status = "finished", o job verifica os 2 times com mais
pontos e declara o vencedor.
```

---

### Opção 4 — Quem passa para a fase [X]? (`prediction / phase_qualified`)

**Disponível:** apenas em campeonatos com chaveamento (`isGroupsKnockout = true` ou `cup`).
A opção aparece uma vez para cada fase disponível ainda não iniciada.

```
PASSO 1 — Lista de opções
(inclui "Quem passa para a semifinal?" se a fase existe)

        ↓ Seleciona "Quem passa para a semifinal?"

PASSO 2 — Desafiante escolhe um time
┌──────────────────────────────────────────────────┐
│  ← Quem passa para a semifinal?                  │
│  Na sua opinião, qual time avança?               │
├──────────────────────────────────────────────────┤
│  🇧🇷 Brasil                                      │
│  🇦🇷 Argentina                                   │
│  🇫🇷 França                                      │
│  ... (times ainda no campeonato)                 │
├──────────────────────────────────────────────────┤
│  [Enviar desafio ⚔️]                            │
└──────────────────────────────────────────────────┘

        ↓ Confirma (ex: escolheu Brasil)

RESULTADO: challengerAnswer = "Brasil"

        ↓ Desafiado abre o convite

PASSO 3 — Desafiado vê a escolha e responde
┌──────────────────────────────────────────────────┐
│  Gerva apostou: 🇧🇷 Brasil vai para a semifinal  │
│  Qual é o seu palpite?                           │
│  (não pode ser Brasil)                           │
├──────────────────────────────────────────────────┤
│  🇦🇷 Argentina                                   │
│  🇫🇷 França                                      │
│  ... (lista sem Brasil)                          │
├──────────────────────────────────────────────────┤
│  [Aceitar desafio]  [Recusar]                    │
└──────────────────────────────────────────────────┘

RESOLUÇÃO AUTOMÁTICA: quando todos os jogos da fase anterior
estiverem com status = "finished", o job verifica os vencedores
e declara o vencedor do X1.
```

---

## Regras de Negócio Consolidadas

| Regra | Detalhe |
|-------|---------|
| **Opções condicionais** | `group_qualified` e `phase_qualified` só aparecem se o campeonato tiver grupos/fases configurados |
| **Restrição ao desafiado** | O desafiado não pode escolher o mesmo time/resposta que o desafiante |
| **Caso especial de grupo** | Para grupos de 4 times com 2 classificados, a escolha do desafiado é automática (os 2 restantes) |
| **Visibilidade** | O desafiado sempre vê a escolha do desafiante antes de responder |
| **score_duel** | Não requer escolha do desafiado — usa palpites já feitos automaticamente |
| **Expiração** | 48h para aceitar/recusar; após isso, status muda para `expired` |
| **Validação prévia** | Para `phase_qualified`, o sistema verifica se há times suficientes para o desafiado escolher |

---

## Impacto no Backend (getOptions)

A procedure `getOptions` deve retornar:

```typescript
{
  // Sempre disponível
  scoreDuelOption: { type: "score_duel", label: "Disputa de palpites — quem pontua mais?" },
  scopeOptions: [...],      // Próxima rodada / fase / N jogos
  
  // Sempre disponível
  championOption: { type: "champion", label: "Quem vai ser o campeão?", teams: [...] },
  
  // Apenas se isGroupsKnockout = true
  groupOptions: [           // Uma entrada por grupo
    { type: "group_qualified", label: "Quem classifica no Grupo G?", groupName: "G", teams: [...] }
  ],
  
  // Apenas se isGroupsKnockout = true
  phaseOptions: [           // Uma entrada por fase ainda não iniciada
    { type: "phase_qualified", label: "Quem passa para a semifinal?", phase: "semifinal", teams: [...] }
  ]
}
```

---

## Impacto na Tela de Aceitação (desafiado)

A tela de aceitação deve:

1. Buscar os detalhes do desafio via `x1.getById`
2. Exibir a escolha do desafiante com destaque visual
3. Para `score_duel`: mostrar apenas os botões Aceitar/Recusar (sem seleção)
4. Para `champion` e `phase_qualified`: mostrar lista de times **excluindo** o escolhido pelo desafiante
5. Para `group_qualified`: mostrar a escolha automática (times restantes) e pedir confirmação

---

*Aguardando aprovação para iniciar a implementação.*
