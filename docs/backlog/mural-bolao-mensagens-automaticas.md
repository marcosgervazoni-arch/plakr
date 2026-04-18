# Mural do Bolão — Mensagens Automáticas Aprovadas

> Validado por 40 especialistas em 18/04/2026. Tom: **estilo CazeTV** — comentarista humorado, animado, como se o Casimiro estivesse comentando ao vivo o bolão dos amigos.
> Máx. 140 caracteres por mensagem. Seleção aleatória entre as variações em tempo real.

---

## Decisões de Design (aprovadas pelos 40 especialistas)

| Decisão | Detalhe |
|---|---|
| **Sem mensagem de descida** | Evento `rank_change_down` removido — não existe mais |
| **Zoação no 1º lugar** | `rank_change_first` inclui `{nome_anterior_lider}` (quem perdeu a liderança) |
| **Agrupamento de exact_score** | Se vários acertam o mesmo placar → 1 post com `{nomes_lista}` |
| **match_result condicional** | Só gera post se houver ≥1 acerto no bolão |
| **rank_change sem manutenção** | Não gera evento para quem manteve posição |
| **Descida só com 2+ posições** | Evento de descida removido — não existe mais |

---

## Textos Aprovados — Tom CazeTV

### 1. `rank_change_first` — Assumiu o 1º lugar *(com zoação do anterior líder)*
> Variáveis: `{nome}`, `{pontos}`, `{nome_anterior_lider}`

```
👑 SIMPLESMENTE {nome} assumiu a liderança com {pontos} pts! {nome_anterior_lider} pode chorar! 😂
```
```
MANO! {nome} tomou o 1º lugar de {nome_anterior_lider}! Que cena! {pontos} pontos e a coroa na cabeça! 👑
```
```
TÁ DE BRINCADEIRA! {nome} desbancou {nome_anterior_lider} e assumiu a liderança! {pontos} pts! ABSURDO! 🔥
```

---

### 2. `rank_change_top3` — Subiu para 2º ou 3º lugar
> Variáveis: `{nome}`, `{posicao_nova}`, `{pontos}`

```
🔥 QUE ISSO! {nome} subiu para o {posicao_nova}º lugar com {pontos} pts! Tá chegando lá!
```
```
⬆️ MANO! {nome} avançou para o {posicao_nova}º lugar! {pontos} pontos! Cuidado aí, galera!
```
```
🚀 {nome} no top {posicao_nova}! {pontos} pts! Não acredito como esse cara tá voando!
```

---

### 3. `rank_change_up` — Subiu várias posições (3+)
> Variáveis: `{nome}`, `{posicao_anterior}`, `{posicao_nova}`

```
🚀 QUE SALTO! {nome} foi do {posicao_anterior}º para o {posicao_nova}º lugar! Que isso, mano!
```
```
⚡ ABSURDO! {nome} voou no ranking: {posicao_anterior}º → {posicao_nova}º! Que virada!
```
```
😱 Não acredito! {nome} pulou do {posicao_anterior}º para o {posicao_nova}º lugar! Lendário!
```

---

### 4. `x1_result_win` — Venceu duelo X1
> Variáveis: `{vencedor}`, `{perdedor}`, `{pontos_vencedor}`, `{pontos_perdedor}`, `{escopo}`

```
⚔️ MANO! {vencedor} destruiu {perdedor} no duelo da {escopo}! {pontos_vencedor} × {pontos_perdedor} pts! Sem piedade!
```
```
🏆 QUE ISSO! {vencedor} venceu o X1 contra {perdedor} na {escopo}! {pontos_vencedor} a {pontos_perdedor}! Brabo demais!
```
```
💥 ABSURDO! {vencedor} dominou {perdedor} por {pontos_vencedor} a {pontos_perdedor} pts na {escopo}! Que monstro!
```

---

### 5. `x1_result_draw` — Empate no duelo X1
> Variáveis: `{vencedor}`, `{perdedor}`, `{escopo}`

```
🤝 QUE CENA! {vencedor} e {perdedor} empataram no duelo da {escopo}! Ninguém levou, ninguém perdeu!
```
```
😅 MANO! Empate técnico! {vencedor} e {perdedor} terminaram igual na {escopo}! Inacreditável!
```
```
🤯 Tá de brincadeira! {vencedor} e {perdedor} empataram o X1 da {escopo}! Que equilíbrio absurdo!
```

---

### 6. `exact_score_single` — Acertou placar exato (1 pessoa)
> Variáveis: `{nome}`, `{time_casa}`, `{placar}`, `{time_fora}`

```
🎯 MANO! {nome} cravou o placar exato! {time_casa} {placar} {time_fora}! Isso não é palpite, é VISÃO!
```
```
😱 QUE ISSO! {nome} acertou {time_casa} {placar} {time_fora} exatamente! Não é sorte, é dom!
```
```
🔮 ABSURDO! {nome} previu o placar certinho: {time_casa} {placar} {time_fora}! Que profeta, mano!
```

---

### 7. `exact_score_multi` — Vários acertaram o mesmo placar
> Variáveis: `{nomes_lista}`, `{time_casa}`, `{placar}`, `{time_fora}`

```
🎯 QUE ISSO! Vários profetas hoje! {nomes_lista} cravaram {time_casa} {placar} {time_fora}! ABSURDO!
```
```
😱 MANO! {nomes_lista} acertaram o placar exato de {time_casa} {placar} {time_fora}! Que galera braba!
```
```
🔮 Não acredito! {nomes_lista} previram certinho: {time_casa} {placar} {time_fora}! Que cena!
```

---

### 8. `match_result` — Jogo encerrado *(só aparece se houver ≥1 acerto)*
> Variáveis: `{time_casa}`, `{gols_casa}`, `{time_fora}`, `{gols_fora}`, `{rodada}`

```
⚽ Apurado! {time_casa} {gols_casa} × {gols_fora} {time_fora} — {rodada} encerrada!
```
```
🔔 FIM DE JOGO! {time_casa} {gols_casa} × {gols_fora} {time_fora} na {rodada}. Bora ver quem acertou!
```
```
📊 {rodada} encerrada! {time_casa} {gols_casa} × {gols_fora} {time_fora}. Quem foi o profeta?
```

---

### 9. `new_member` — Novo membro entrou no bolão
> Variáveis: `{nome}`, `{total_membros}`

```
👋 QUE ISSO! {nome} entrou no bolão! Bem-vindo(a) ao time — agora somos {total_membros}! Bora!
```
```
🎉 MANO! {nome} chegou pra agitar! Somos {total_membros} no bolão agora! Bem-vindo(a)!
```
```
🔥 {nome} entrou na disputa! {total_membros} participantes e a concorrência só aumenta! Bora, {nome}!
```

---

### 10. `pool_ended` — Bolão encerrado / campeão definido
> Variáveis: `{nome_campeao}`, `{pontos_campeao}`, `{total_participantes}`, `{nome_bolao}`

```
👑 É CAMPEÃO! {nome_campeao} venceu o bolão {nome_bolao} com {pontos_campeao} pts entre {total_participantes} participantes! ABSURDO!
```
```
🏆 QUE ISSO! FIM DE BOLÃO! {nome_campeao} é o grande vencedor de {nome_bolao} com {pontos_campeao} pts! Que jornada, mano!
```
```
🎊 SIMPLESMENTE {nome_campeao} CAMPEÃO do {nome_bolao}! {pontos_campeao} pontos! {total_participantes} participantes e ele levou tudo! Lendário!
```

---

### 11. `badge_unlocked` — Badge/conquista desbloqueada
> Variáveis: `{nome}`, `{nome_badge}`, `{descricao_badge}`

```
🏅 QUE ISSO! {nome} desbloqueou a conquista "{nome_badge}"! {descricao_badge}! Brabo demais!
```
```
✨ MANO! {nome} conquistou a badge "{nome_badge}"! {descricao_badge}! Não acredito! Lendário!
```
```
🌟 ABSURDO! {nome} pegou a badge "{nome_badge}"! {descricao_badge}! Que monstro!
```

---

### 12. `zebra_result` — Zebra confirmada *(azarão venceu e alguém apostou nisso)*
> Variáveis: `{nome}`, `{time_azarao}`, `{time_favorito}`, `{placar}`, `{rodada}`

```
🦓 ZEBRA NA ÁREA! MANO! {nome} previu o impossível: {time_azarao} {placar} {time_favorito} na {rodada}! QUE ISSO!
```
```
😱 TÁ DE BRINCADEIRA! {nome} cravou a zebra! {time_azarao} derrubou {time_favorito} por {placar} na {rodada}! ABSURDO!
```
```
🤯 NÃO ACREDITO! {nome} é vidente! {time_azarao} venceu {time_favorito} por {placar} na {rodada}! Que cena lendária!
```

---

### 13. `thrashing_result` — Goleada confirmada *(e alguém apostou nisso)*
> Variáveis: `{nome}`, `{time_vencedor}`, `{time_perdedor}`, `{placar}`, `{rodada}`

```
🔥 GOLEADA! MANO! {nome} previu o massacre: {time_vencedor} fez {placar} no {time_perdedor} na {rodada}! QUE ISSO!
```
```
💥 ABSURDO! {nome} acertou a goleada de {time_vencedor} {placar} {time_perdedor} na {rodada}! Sem piedade, mano!
```
```
🤯 QUE ATROPELO! {nome} cravou: {time_vencedor} {placar} {time_perdedor} na {rodada}! Que visão absurda!
```

---

## Implementação — Função de Template

```typescript
// server/mural-templates.ts
export const MURAL_TEMPLATES: Record<string, string[]> = {
  rank_change_first: [
    "👑 SIMPLESMENTE {nome} assumiu a liderança com {pontos} pts! {nome_anterior_lider} pode chorar! 😂",
    "MANO! {nome} tomou o 1º lugar de {nome_anterior_lider}! Que cena! {pontos} pontos e a coroa na cabeça! 👑",
    "TÁ DE BRINCADEIRA! {nome} desbancou {nome_anterior_lider} e assumiu a liderança! {pontos} pts! ABSURDO! 🔥",
  ],
  rank_change_top3: [
    "🔥 QUE ISSO! {nome} subiu para o {posicao_nova}º lugar com {pontos} pts! Tá chegando lá!",
    "⬆️ MANO! {nome} avançou para o {posicao_nova}º lugar! {pontos} pontos! Cuidado aí, galera!",
    "🚀 {nome} no top {posicao_nova}! {pontos} pts! Não acredito como esse cara tá voando!",
  ],
  rank_change_up: [
    "🚀 QUE SALTO! {nome} foi do {posicao_anterior}º para o {posicao_nova}º lugar! Que isso, mano!",
    "⚡ ABSURDO! {nome} voou no ranking: {posicao_anterior}º → {posicao_nova}º! Que virada!",
    "😱 Não acredito! {nome} pulou do {posicao_anterior}º para o {posicao_nova}º lugar! Lendário!",
  ],
  x1_result_win: [
    "⚔️ MANO! {vencedor} destruiu {perdedor} no duelo da {escopo}! {pontos_vencedor} × {pontos_perdedor} pts! Sem piedade!",
    "🏆 QUE ISSO! {vencedor} venceu o X1 contra {perdedor} na {escopo}! {pontos_vencedor} a {pontos_perdedor}! Brabo demais!",
    "💥 ABSURDO! {vencedor} dominou {perdedor} por {pontos_vencedor} a {pontos_perdedor} pts na {escopo}! Que monstro!",
  ],
  x1_result_draw: [
    "🤝 QUE CENA! {vencedor} e {perdedor} empataram no duelo da {escopo}! Ninguém levou, ninguém perdeu!",
    "😅 MANO! Empate técnico! {vencedor} e {perdedor} terminaram igual na {escopo}! Inacreditável!",
    "🤯 Tá de brincadeira! {vencedor} e {perdedor} empataram o X1 da {escopo}! Que equilíbrio absurdo!",
  ],
  exact_score_single: [
    "🎯 MANO! {nome} cravou o placar exato! {time_casa} {placar} {time_fora}! Isso não é palpite, é VISÃO!",
    "😱 QUE ISSO! {nome} acertou {time_casa} {placar} {time_fora} exatamente! Não é sorte, é dom!",
    "🔮 ABSURDO! {nome} previu o placar certinho: {time_casa} {placar} {time_fora}! Que profeta, mano!",
  ],
  exact_score_multi: [
    "🎯 QUE ISSO! Vários profetas hoje! {nomes_lista} cravaram {time_casa} {placar} {time_fora}! ABSURDO!",
    "😱 MANO! {nomes_lista} acertaram o placar exato de {time_casa} {placar} {time_fora}! Que galera braba!",
    "🔮 Não acredito! {nomes_lista} previram certinho: {time_casa} {placar} {time_fora}! Que cena!",
  ],
  match_result: [
    "⚽ Apurado! {time_casa} {gols_casa} × {gols_fora} {time_fora} — {rodada} encerrada!",
    "🔔 FIM DE JOGO! {time_casa} {gols_casa} × {gols_fora} {time_fora} na {rodada}. Bora ver quem acertou!",
    "📊 {rodada} encerrada! {time_casa} {gols_casa} × {gols_fora} {time_fora}. Quem foi o profeta?",
  ],
  new_member: [
    "👋 QUE ISSO! {nome} entrou no bolão! Bem-vindo(a) ao time — agora somos {total_membros}! Bora!",
    "🎉 MANO! {nome} chegou pra agitar! Somos {total_membros} no bolão agora! Bem-vindo(a)!",
    "🔥 {nome} entrou na disputa! {total_membros} participantes e a concorrência só aumenta! Bora, {nome}!",
  ],
  pool_ended: [
    "👑 É CAMPEÃO! {nome_campeao} venceu o bolão {nome_bolao} com {pontos_campeao} pts entre {total_participantes} participantes! ABSURDO!",
    "🏆 QUE ISSO! FIM DE BOLÃO! {nome_campeao} é o grande vencedor de {nome_bolao} com {pontos_campeao} pts! Que jornada, mano!",
    "🎊 SIMPLESMENTE {nome_campeao} CAMPEÃO do {nome_bolao}! {pontos_campeao} pontos! {total_participantes} participantes e ele levou tudo! Lendário!",
  ],
  badge_unlocked: [
    "🏅 QUE ISSO! {nome} desbloqueou a conquista \"{nome_badge}\"! {descricao_badge}! Brabo demais!",
    "✨ MANO! {nome} conquistou a badge \"{nome_badge}\"! {descricao_badge}! Não acredito! Lendário!",
    "🌟 ABSURDO! {nome} pegou a badge \"{nome_badge}\"! {descricao_badge}! Que monstro!",
  ],
  zebra_result: [
    "🦓 ZEBRA NA ÁREA! MANO! {nome} previu o impossível: {time_azarao} {placar} {time_favorito} na {rodada}! QUE ISSO!",
    "😱 TÁ DE BRINCADEIRA! {nome} cravou a zebra! {time_azarao} derrubou {time_favorito} por {placar} na {rodada}! ABSURDO!",
    "🤯 NÃO ACREDITO! {nome} é vidente! {time_azarao} venceu {time_favorito} por {placar} na {rodada}! Que cena lendária!",
  ],
  thrashing_result: [
    "🔥 GOLEADA! MANO! {nome} previu o massacre: {time_vencedor} fez {placar} no {time_perdedor} na {rodada}! QUE ISSO!",
    "💥 ABSURDO! {nome} acertou a goleada de {time_vencedor} {placar} {time_perdedor} na {rodada}! Sem piedade, mano!",
    "🤯 QUE ATROPELO! {nome} cravou: {time_vencedor} {placar} {time_perdedor} na {rodada}! Que visão absurda!",
  ],
};

export function renderTemplate(key: string, vars: Record<string, string>): string {
  const variants = MURAL_TEMPLATES[key];
  if (!variants?.length) return "";
  const template = variants[Math.floor(Math.random() * variants.length)];
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
```

---

## Variáveis por Evento (referência para implementação)

| Evento | Variáveis |
|---|---|
| `rank_change_first` | `{nome}`, `{pontos}`, `{nome_anterior_lider}` |
| `rank_change_top3` | `{nome}`, `{posicao_nova}`, `{pontos}` |
| `rank_change_up` | `{nome}`, `{posicao_anterior}`, `{posicao_nova}` |
| `x1_result_win` | `{vencedor}`, `{perdedor}`, `{pontos_vencedor}`, `{pontos_perdedor}`, `{escopo}` |
| `x1_result_draw` | `{vencedor}`, `{perdedor}`, `{escopo}` |
| `exact_score_single` | `{nome}`, `{time_casa}`, `{placar}`, `{time_fora}` |
| `exact_score_multi` | `{nomes_lista}`, `{time_casa}`, `{placar}`, `{time_fora}` |
| `match_result` | `{time_casa}`, `{gols_casa}`, `{time_fora}`, `{gols_fora}`, `{rodada}` |
| `new_member` | `{nome}`, `{total_membros}` |
| `pool_ended` | `{nome_campeao}`, `{pontos_campeao}`, `{total_participantes}`, `{nome_bolao}` |
| `badge_unlocked` | `{nome}`, `{nome_badge}`, `{descricao_badge}` |
| `zebra_result` | `{nome}`, `{time_azarao}`, `{time_favorito}`, `{placar}`, `{rodada}` |
| `thrashing_result` | `{nome}`, `{time_vencedor}`, `{time_perdedor}`, `{placar}`, `{rodada}` |
