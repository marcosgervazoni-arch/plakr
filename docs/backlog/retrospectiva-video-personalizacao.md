# Backlog — Personalização do Vídeo de Retrospectiva
> Ideias capturadas durante os testes de geração de vídeo com Remotion (2026-03-29).
> Categoria: Nova Feature / Engajamento / Viralidade

---

## [ICE-007] Painel de personalização da retrospectiva para Super Admin

**Contexto:** Durante os testes de geração do vídeo de retrospectiva (v1, v2, v3), foi
validado que o vídeo tem alto potencial de engajamento e viralidade. O Super Admin precisa
de controles para personalizar o vídeo sem tocar no código.

**Ideia:** Criar um painel de configuração no Super Admin com os seguintes grupos de controle:

### Grupo 1 — Identidade Visual
- Cor de destaque (seletor de cor, padrão `#FFB800`)
- Estilo de transição: Energético / Clássico / Minimalista
- Intensidade das animações: Alta / Média / Baixa
- Upload de logo personalizado (substitui o emoji 🏆)
- Imagem de fundo customizada (overlay sobre o `#0B0F1A`)

### Grupo 2 — Texto e Branding
- Título da abertura (padrão: "Sua Retrospectiva do Bolão 🔥")
- Frase de encerramento (texto livre, até 120 caracteres)
- Texto do CTA (padrão: "Venha se divertir com amigos!")
- URL do CTA (padrão: `plakr.io`)
- Tagline abaixo do logo (padrão: vazio)

### Grupo 3 — Conteúdo e Dados
- Toggle: Exibir taxa de acerto (%)
- Toggle: Exibir placares exatos
- Toggle: Exibir zebras acertadas
- Toggle: Exibir badge conquistado
- Toggle: Exibir comparativo com a média do bolão
- Toggle: Exibir comparativo social (% vs. outros apostadores)

### Grupo 4 — Cenas
- Toggle individual para cada cena (ativar/desativar)
- Cenas disponíveis: Abertura, Posição Final, Seus Números, Melhor Momento,
  Badge Lendário, Duelo Acirrado, Comparativo Viral, Encerramento

### Grupo 5 — Áudio
- Seleção de música de fundo: Energético BPM 140 / Épico Orquestral / Minimalista
- Volume da trilha (0–100%)

### Grupo 6 — Presets de Tema (atalhos rápidos)
- **Clássico Plakr:** dourado + animações médias + BPM 140
- **Energético:** verde neon + animações altas + BPM 160
- **Minimalista:** branco + animações baixas + sem trilha

**Por quê:** Permite que o Super Admin adapte o vídeo para diferentes campeonatos,
públicos e momentos sazonais sem depender de desenvolvimento. Aumenta o potencial
de viralidade ao tornar cada retrospectiva única.

**Dependências:**
- Componente Remotion `PlakrRetrospectiva.tsx` já implementado (v3)
- Tabela de configuração no banco de dados (nova)
- Endpoint tRPC para salvar/carregar configurações
- Worker de geração de vídeo já existente em `server/retrospective-video.ts`

**Implementação sugerida (2 fases):**

**Fase 1 — MVP (esforço baixo/médio, alto impacto):**
- Presets de tema (3 botões)
- Frase de encerramento e CTA editáveis
- Toggles de cenas (ativar/desativar)
- Toggles de métricas (taxa de acerto, exatos, zebras)

**Fase 2 — Avançado (esforço médio/alto):**
- Seletor de cor personalizado
- Upload de logo e imagem de fundo
- Seleção de música e volume
- Cenas adicionais com dados comparativos

**Impacto:** Alto (engajamento, viralidade, diferenciação).
**Esforço:** Médio (Fase 1) / Alto (Fase 2).

---

## [ICE-008] Comentários bem-humorados configuráveis por cena

**Contexto:** Na v3 do vídeo, cada cena tem um comentário divertido fixo no código
(ex: *"Isso não foi sorte. Foi talento puro! 🧠✨"*). O feedback do usuário indicou
que esses comentários são um diferencial importante para o tom leve e viral do vídeo.

**Ideia:** Permitir que o Super Admin edite os comentários de cada cena individualmente,
ou selecione de um banco de frases pré-aprovadas por categoria (elogio, provocação
amigável, motivação, humor).

**Por quê:** Personalização do tom de voz para diferentes tipos de bolão
(bolão corporativo vs. bolão de amigos, por exemplo). Também permite A/B testing
de frases para identificar quais geram mais compartilhamentos.

**Dependências:** ICE-007 (painel de personalização).

**Impacto:** Médio (engajamento, viralidade). **Esforço:** Baixo.

---

## [ICE-009] Narração em voz sintética personalizada por cena

**Contexto:** O helper de TTS já está disponível na plataforma. Cada cena do vídeo
poderia ter uma locução sintética com o nome do usuário e os dados da retrospectiva.

**Ideia:** Gerar áudio de narração para cada cena usando o helper de TTS:
- Abertura: *"Parabéns, Marcos! Esta é sua retrospectiva do Bolão Copa do Mundo 2026."*
- Posição: *"Você terminou em 3º lugar, entre 24 participantes."*
- Melhor Momento: *"Seu melhor momento foi o placar exato de Brasil 2×1 Argentina."*

**Por quê:** Aumenta o impacto emocional e a sensação de personalização. Vídeos com
narração têm taxas de compartilhamento significativamente maiores.

**Dependências:** ICE-007 (painel), helper de TTS já disponível no servidor.

**Impacto:** Alto (engajamento, viralidade, diferenciação premium).
**Esforço:** Médio.

---

## [ICE-010] Cenas adicionais propostas para versões futuras

**Contexto:** Durante o planejamento da retrospectiva, especialistas de produto e
marketing identificaram cenas com alto potencial de engajamento ainda não implementadas.

**Cenas propostas:**

| Cena | Descrição | Potencial Viral |
|---|---|---|
| **Comparativo Social** | "Você acertou mais que X% dos apostadores do Brasil" | Alto |
| **Próximos Passos** | CTA para o próximo bolão com contagem regressiva | Alto |
| **Curiosidades do Bolão** | Fatos inusitados: "O jogo mais apostado foi..." | Médio |
| **Evolução do Jogador** | Gráfico de posição rodada a rodada | Médio |
| **Momento Mais Tenso** | Jogo onde a diferença de pontos era mínima | Alto |
| **Sequência de Acertos** | Maior sequência de resultados certos seguidos | Alto |

**Por quê:** Cada cena adicional aumenta o tempo de atenção e os gatilhos de
compartilhamento ("Olha só o que eu fiz no bolão!").

**Dependências:** ICE-007 (painel de personalização), dados históricos por rodada.

**Impacto:** Alto. **Esforço:** Alto.
