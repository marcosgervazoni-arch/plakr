# Card de Jogo dos Campeonatos Globais — Análise Completa
**Data:** 2026-04-18  
**Metodologia:** 40 especialistas consultados em paralelo (2 rodadas)  
**O que foi analisado:** O card de jogo que aparece na aba "Jogos" de cada bolão — funcionalidade, usabilidade, design, redação e badges

---

## O que é o Card de Jogo?

É o componente central da experiência de palpite no Plakr!. Quando você entra em um bolão e vai na aba "Jogos", cada partida aparece como um card. Ele muda de aparência conforme o momento do jogo: antes (aberto para palpite), durante (ao vivo) e depois (encerrado com resultado e pontuação).

---

## O que está bem implementado

Os 40 especialistas convergem em três pontos fortes consistentes:

**1. Comunicação clara dos estados do jogo.** O aviso de urgência ("Fecha em 30min" piscando em vermelho), o indicador "AO VIVO" com ponto animado, o cadeado para "sem palpite" e os badges de rodada/fase comunicam o estado atual de forma imediata. Os especialistas de UX, Design e Head of Product destacaram isso como o ponto mais forte do card — o usuário nunca fica perdido sobre o que pode ou não fazer.

**2. Feedback visual rico após o jogo.** A linha do tempo de gols (quem fez, em que minuto, se foi pênalti ou gol contra), os ícones compactos de pontuação e o "+X pts" em destaque criam uma experiência de resultado satisfatória. O especialista de Visual Identity destacou que a hierarquia visual do placar em números grandes é especialmente eficaz.

**3. Análise pós-jogo personalizada pela IA.** A combinação de narração da partida (para quem não apostou) e análise personalizada do palpite (para quem apostou) é uma funcionalidade premium. O compartilhamento com geração de imagem para Instagram Stories foi elogiado por Content, Growth e Partnerships como diferencial competitivo real.

---

## Usabilidade — O que pode melhorar

### 🔴 A mensagem "Sem palpite / Encerrado" é fria e técnica

**O que acontece hoje:** Quando o usuário não fez palpite e o prazo encerrou, o card mostra "Sem palpite / Encerrado" com um ícone de cadeado. A mensagem é funcional, mas não tem personalidade.

**O que os especialistas sugerem:** Uma mensagem mais humana e acolhedora, que não faça o usuário se sentir punido por ter perdido o prazo. Exemplos sugeridos: "Você não apostou nesse" ou "Esse passou batido 😅 — não perde o próximo!" com um tom leve e sem julgamento.

**Por que importa:** O tom da mensagem afeta como o usuário se sente sobre a plataforma. Uma mensagem fria pode desestimular a participação futura; uma mensagem com personalidade reforça o vínculo.

---

### 🔴 O botão "Confirmar" palpite não dá feedback suficiente

**O que acontece hoje:** Quando o usuário digita o palpite e clica no botão de confirmar (✓), não há um feedback visual claro de que o palpite foi salvo com sucesso — especialmente em conexões lentas.

**O que os especialistas sugerem:** Uma animação breve de confirmação (ex: o botão fica verde por 1 segundo com um "✓ Salvo!") e uma vibração leve no celular para reforçar que a ação foi concluída. Isso é especialmente importante porque o palpite é a ação mais crítica do produto.

---

### 🟠 Hierarquia visual sobrecarregada quando o card está expandido

**O que acontece hoje:** Com o painel de análise aberto, o card exibe simultaneamente: cabeçalho com status, corpo com placar, linha do tempo de gols, badges de pontuação, barra de ações, comparação de palpite, banner de resultado, texto da IA e estatísticas. São muitas informações em um único scroll.

**O que os especialistas sugerem:** Separar as estatísticas pós-jogo em uma seção colapsável secundária ("Ver estatísticas completas"), deixando o painel de análise focado no que importa para o usuário: o resultado do seu palpite e o texto da IA.

---

### 🟠 Contador de apostadores ausente

**O que acontece hoje:** O card não mostra quantas pessoas já fizeram palpite naquele jogo.

**O que os especialistas sugerem:** Um contador discreto no cabeçalho do card, como "47 palpites feitos", cria prova social — o usuário vê que outras pessoas estão participando e se sente motivado a fazer o seu. Growth, Content e Product Owner destacaram isso como um dos itens de maior impacto para engajamento com baixo esforço de implementação.

---

## Design Visual — O que pode melhorar

### 🟠 Badges de Zebra e Goleada — consenso dos 40 especialistas

Esta foi a pergunta mais respondida com mais consistência. Os 40 especialistas concordam nos seguintes pontos:

**Posicionamento:** Logo abaixo do placar final, no corpo do card — não no cabeçalho (para não competir com o status do jogo) e não nos badges compactos (para ter destaque próprio).

**Visual:**

| Badge | Ícone sugerido | Cor sugerida | Texto |
|---|---|---|---|
| **Zebra** 🦓 | Raio ⚡ ou zebra estilizada | Roxo ou verde-limão | "Zebra!" |
| **Goleada** 💥 | Explosão ou troféu | Dourado ou laranja | "Goleada!" |

**Regra de exibição:** Aparecem apenas quando o jogo está encerrado. Nunca durante o jogo ao vivo (para não antecipar resultado). Podem aparecer simultaneamente se o jogo for uma goleada zebra (ex: time mais fraco venceu por 4 × 0).

**Tom de voz:** Curto, impactante e comemorativo — não explicativo. "Zebra!" é melhor do que "Resultado inesperado". "Goleada!" é melhor do que "Diferença de 3+ gols".

**Definição de goleada:** O consenso dos especialistas é diferença de **3 ou mais gols** (ex: 3×0, 4×1, 5×2). Isso está alinhado com o uso popular do termo no futebol brasileiro.

---

### 🟡 Linha do tempo de gols pode ficar visualmente pesada em jogos com muitos gols

**O que acontece hoje:** Jogos com 6, 7 ou 8 gols (o que acontece em goleadas) geram uma lista longa na linha do tempo, que empurra o restante do card para baixo.

**O que os especialistas sugerem:** Mostrar os primeiros 4 gols e colapsar o restante com um "Ver todos os X gols" — especialmente relevante agora que vamos adicionar o badge de goleada, que vai chamar atenção para jogos com muitos gols.

---

### 🟡 Botões de compartilhamento não refletem a prioridade definida

**O que acontece hoje:** Os 4 botões de compartilhamento (Instagram Stories, WhatsApp, Baixar imagem, Outros) aparecem em grade, sem hierarquia visual clara.

**O que os especialistas sugerem:** O botão do Instagram Stories deveria ser maior ou ter destaque visual diferente, já que é a prioridade principal. Uma sugestão é deixá-lo como botão primário (cheio, dourado) e os demais como botões secundários (contorno).

---

## Redação (Microcopy) — O que pode melhorar

### 🔴 Inconsistência entre "palpite" e "aposta"

**O que acontece hoje:** Em alguns lugares o produto usa "palpite", em outros usa "aposta". Os dois termos aparecem no mesmo card.

**Por que importa:** Além de criar confusão para o usuário, o termo "aposta" tem conotação de jogo de azar e pode gerar problemas legais e de posicionamento de marca. O Plakr! é uma plataforma de **palpites** — isso deve ser consistente em todo o produto.

**O que os especialistas sugerem:** Padronizar para "palpite" em todo o card e em toda a plataforma, sem exceções.

---

### 🟠 Textos dos CTAs são funcionais mas não têm personalidade

**O que acontece hoje:** "Ver análise", "Fechar análise", "Compartilhar" são textos corretos mas genéricos.

**O que os especialistas sugerem:** Textos com mais personalidade e no tom do Plakr! (descontraído, esportivo, sem ser forçado). Exemplos:

| Texto atual | Sugestão |
|---|---|
| "Ver análise" | "O que a IA achou?" |
| "Fechar análise" | "Fechar" |
| "Sem palpite / Encerrado" | "Você não apostou nesse 😅" |
| "Meu palpite" | "Meu palpite" ✅ (esse está bom) |
| "Aberto para palpites" | "Aberto para palpites" ✅ (esse está bom) |

---

### 🟡 Ícones de pontuação não têm explicação para novos usuários

**O que acontece hoje:** Os ícones compactos de pontuação (placar exato, resultado correto, gols do time, diferença de gols, etc.) aparecem sem legenda. Usuários experientes entendem, mas novos usuários ficam sem saber o que cada ícone significa.

**O que os especialistas sugerem:** Um toque longo (ou clique) em qualquer ícone de pontuação deveria mostrar uma explicação rápida: "Placar exato — você acertou o placar certinho! +3 pts". Isso é especialmente importante para novos usuários nos primeiros jogos.

---

## Funcionalidade — O que pode melhorar

### 🔴 Análise da IA não usa dados dos outros apostadores do bolão

**O que acontece hoje:** A IA analisa seu palpite de forma isolada, sem saber o que os outros participantes do seu bolão apostaram.

**O que deveria acontecer:** "Você foi o único dos 12 participantes a cravar o placar exato!" ou "8 dos 12 apostaram em vitória do Brasil — você foi da maioria". Esses dados já existem no sistema, só precisam ser enviados para a IA.

---

### 🔴 Dados ricos de análise pré-jogo existem mas não aparecem

**O que acontece hoje:** O sistema já calcula e armazena 7 métricas de comparação entre os times (força de ataque, defesa, aproveitamento recente, histórico de confrontos diretos, média de gols, etc.). Nenhuma aparece para o usuário.

**O que deveria acontecer:** Essas métricas deveriam aparecer no painel de análise pré-jogo, de forma visual e simples — não como números técnicos, mas como barras comparativas com rótulos claros ("Ataque", "Defesa", "Forma recente").

---

### 🟠 Imagem de compartilhamento não mostra o placar quando o jogo está ao vivo

**O que acontece hoje:** Quando você compartilha um jogo em andamento, a imagem gerada mostra "VS" — como se o jogo não tivesse começado.

**O que deveria acontecer:** O placar parcial atual (ex: "Brasil 1 × 0 Argentina · 67'") deveria aparecer na imagem, tornando o compartilhamento muito mais impactante no momento de maior emoção.

---

### 🟠 Estádio e grupo do campeonato não aparecem no card

**O que acontece hoje:** O sistema já sabe o estádio e o grupo de cada jogo, mas não exibe essas informações.

**O que deveria acontecer:** Uma linha discreta no cabeçalho do card, abaixo da data/hora: "Estádio Nacional · Grupo A". Simples, contextual, sem poluir.

---

## Resumo: Prioridades por Categoria

| Categoria | Item | Impacto | Esforço |
|---|---|---|---|
| **Funcionalidade** | Enviar dados dos outros apostadores para a IA | Alto | Baixo |
| **Funcionalidade** | Exibir métricas de comparação dos times pré-jogo | Alto | Médio |
| **Funcionalidade** | Placar ao vivo na imagem de compartilhamento | Alto | Baixo |
| **Design** | Badges de Zebra e Goleada (abaixo do placar) | Alto | Baixo |
| **Funcionalidade** | Estádio e grupo no cabeçalho do card | Médio | Baixo |
| **Usabilidade** | Contador de apostadores ("47 palpites feitos") | Médio | Baixo |
| **Redação** | Padronizar "palpite" (remover "aposta") | Médio | Baixo |
| **Usabilidade** | Mensagem humanizada para "sem palpite" | Médio | Baixo |
| **Usabilidade** | Feedback visual ao confirmar palpite | Médio | Baixo |
| **Design** | Hierarquia do botão Instagram Stories | Médio | Baixo |
| **Redação** | Textos dos CTAs com personalidade | Baixo | Baixo |
| **Usabilidade** | Tooltip nos ícones de pontuação | Baixo | Baixo |
| **Design** | Colapsar linha do tempo em goleadas | Baixo | Baixo |

---

## Dados que Já Existem no Sistema mas Não Aparecem na Tela

| Informação | Onde usar | Por que importa |
|---|---|---|
| Nome do estádio | Cabeçalho do card | Contexto básico do jogo |
| Grupo do campeonato (ex: "Grupo A") | Cabeçalho do card | Relevância estratégica do jogo |
| Indicador de zebra | Badge abaixo do placar | Engajamento e compartilhamento |
| Indicador de goleada | Badge abaixo do placar | Engajamento e compartilhamento |
| Finalizações no gol | Estatísticas pós-jogo | Análise mais completa |
| Cartões vermelhos | Estatísticas pós-jogo | Análise mais completa |
| 7 métricas de comparação dos times | Painel de análise pré-jogo | Embasar o palpite |
| Aviso de previsão pouco confiável | Painel de análise pré-jogo | Transparência com o usuário |
| Dados dos outros apostadores do bolão | Análise da IA pós-jogo | Personalização e engajamento |
| Contador de apostadores | Card do jogo | Prova social |
| Placar ao vivo na imagem de compartilhamento | Imagem gerada | Impacto no momento certo |

---

*Análise gerada por orquestração de 40 especialistas em 2026-04-18 (2 rodadas: funcional + UX/Design/Redação).*
