# Especificação GameCard — Modelo Aprovado (v4)

## Card fechado (estado Finalizado)

- Header: "Finalizado" (verde) | "Rodada 5 · Gauchão 2024" (direita)
- Times: escudo circular + nome + placar real (grande)
- Centro: "Meu palpite: 2 × 1" (texto menor, acima do placar real)
- Timeline de gols: ícone bola + minuto + nome do jogador (esquerda=time A, direita=time B)
- Badges de pontuação inline: posição no ranking (número), placar exato +10, resultado certo +5, diferença de gols +3, gols de um time +2, total +21
- Footer: botão "Compartilhar" (esquerda) | botão "⚡ Ver análise ▾" (direita)

## Painel de análise expandido (abaixo do card)

### Seção 1 — Resumo da partida
- Ícone 📋 + título "Resumo da partida"
- Parágrafo gerado por IA descrevendo o jogo

### Seção 2 — Análise do seu palpite
- Ícone 🤖 + título "Análise do seu palpite"
- Comparação: "Resultado real: 2 × 1" vs "Seu palpite: 2 × 1"
- Banner destacado: "🟢 Placar exato — melhor resultado possível!" (verde quando acertou exato)
- Parágrafo contextualizado com posição no bolão e comparação com outros participantes
- **REGRA CRÍTICA**: posição no bolão só é mencionada quando a rodada está 100% finalizada
- Badges de breakdown: Placar exato +10 | Resultado certo +5 | Diferença de gols +3 | Gols de um time +2 | Zebra +1 | Total: +21 pts

### Seção 3 — Estatísticas
- Título "ESTATÍSTICAS"
- Barras bipartidas (time A esquerda, time B direita) com valor numérico em cada lado
- Métricas: Posse de bola (%), Finalizações, Escanteios, Cartões amarelos
- Legenda: ● Grêmio | ● Internacional (cores dos times)

## Regras de exibição

| Dado | Quando exibir |
|---|---|
| Timeline de gols | Sempre que `goalsTimeline` não for null/vazio |
| Badges de pontuação | Apenas quando o jogo está finalizado e o usuário tem palpite |
| Painel de análise | Apenas jogos finalizados (botão "Ver análise") |
| Resumo IA | Sempre que `aiSummary` não for null |
| Análise do palpite | Apenas se o usuário tem palpite no jogo |
| Estatísticas | Apenas quando `matchStatistics` não for null |
| Posição no bolão | SOMENTE quando todos os jogos da rodada estão finalizados |
