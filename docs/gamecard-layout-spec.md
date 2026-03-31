# GameCard — Especificação de Layout Aprovado (v4)

## Estado: Apostas Abertas

### Card fechado
- Header: `● Apostas abertas até 21h` (esquerda, verde) | `Rodada 5 · Gauchão 2024` (direita, muted)
- Corpo: time A (círculo colorido + nome) | inputs `0 × 0` centralizados + botão check | time B (círculo colorido + nome)
- Barra de ações: `⟳ Compartilhar` (esquerda) | `⚡ Ver análise ▾` (direita)
- Sem borda extra entre card e barra de ações

### Painel de análise pré-jogo (expandido)
- Barra tripartida de probabilidade: `58% Grêmio vence` (verde) | `22% Empate` (cinza) | `20% Inter vence` (vermelho)
- Seção "ÚLTIMOS 5 JOGOS": cada time com círculo colorido + nome + 5 badges W/D/L (verde/cinza/vermelho)
- Caixa "Análise da IA": ícone robô + título + texto + disclaimer em itálico

---

## Estado: Encerrado (com palpite)

### Card fechado
- Header: `● Finalizado` (esquerda, verde) | `Rodada 5 · Gauchão 2024` (direita, muted)
- Corpo: time A (círculo + nome + placar real) | `Meu palpite: 2 × 1` centralizado acima do `×` | time B (círculo + nome + placar real)
- Gols: linha esquerda (minuto + ícone bola + nome jogador) | linha direita (nome jogador + ícone bola + minuto)
- Badges de pontuação: `#5` (posição, amarelo) | `●+10` (placar exato) | `✓+5` (resultado) | `−+3` (diferença) | `🎽+2` (gol time) | `6` (posição ranking) | `+1` | `⭐+21` (total)
- Barra de ações: `⟳ Compartilhar` (esquerda) | `⚡ Ver análise ▾` (direita)

### Painel de análise pós-jogo (expandido)
1. **Resumo da partida**: ícone 📋 + título + texto do aiSummary
2. **Análise do seu palpite**: 
   - "Resultado real: 2×1 vs Seu palpite: 2×1"
   - Banner colorido: "● Placar exato — melhor resultado possível!"
   - Texto do narrador (betAnalysis)
   - Badges de breakdown de pontos
3. **Estatísticas**: barras bipartidas (Posse, Finalizações, Escanteios, Cartões)

---

## Modal de Compartilhamento (bottom-sheet)

- Overlay escuro sobre a página
- Container centralizado com bordas arredondadas
- Header: "Compartilhar jogo" + subtítulo "Compartilhe o resultado e sua pontuação"
- Preview do ShareCardVisual (card de imagem) visível no modal
- Grid 2×2 de botões:
  - `📸 Instagram Stories` (gradiente roxo→rosa)
  - `💬 WhatsApp` (verde)
  - `⬇ Baixar imagem` (cinza escuro)
  - `··· Outros apps` (cinza escuro)
- Botão "Fechar" na parte inferior

---

## Notas de Implementação

- A barra de ações NÃO tem borda superior separada — está integrada ao card
- O painel de análise abre abaixo da barra de ações com `border-t` sutil
- Badges de pontuação usam cores específicas: placar exato = verde, resultado = verde claro, diferença = azul/cinza, gol time = roxo, zebra = amarelo, total = dourado
- W = verde, D = cinza, L = vermelho nos últimos 5 jogos
- Modal de compartilhamento é um Dialog/Sheet sobreposto, não inline
