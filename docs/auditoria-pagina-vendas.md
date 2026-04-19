# Auditoria da Página de Vendas — Plakr!
**Agente:** Orquestrador + Growth Specialist + Content & Marketing + UX Specialist + Visual Identity  
**Data:** Abril 2026  
**Arquivo auditado:** `client/src/pages/Home.tsx` (935 linhas)

---

## 1. Diagnóstico: O que está desatualizado ou problemático

### 1.1 Estrutura atual de seções

| Seção | Status | Problema |
|-------|--------|----------|
| Navbar | ⚠️ Desatualizado | Links de nav apontam para "Campeonato personalizado" como destaque — mas o VIP é agora um produto igualmente relevante e não aparece na nav |
| Hero | ⚠️ Parcialmente desatualizado | Headline e subheadline são genéricos ("Faça seu bolão com a galera"). Não comunica IA, análises pré-jogo, duelos X1 ou VIP — todos lançados após a criação da página |
| Credibilidade | ✅ OK | Campeonatos listados corretamente |
| Como funciona | ✅ OK | 4 passos claros, sem problemas |
| Diferencial Pro | ⚠️ Desatualizado | Foca exclusivamente em "campeonato personalizado". Não menciona IA, análise pré-jogo, retrospectiva imersiva, duelos X1 — todos diferenciais Pro reais e mais emocionais |
| Features (grid 9 cards) | ❌ Problema estrutural | Lista de features técnicas sem hierarquia de benefícios. Mistura features free e Pro sem distinção clara. Nenhuma menção a IA, X1, análise pré-jogo, patrocínio, Passe VIP |
| Planos | ⚠️ Desatualizado | Planos do organizador (Free/Pro/Unlimited) corretos. Mas o **Passe VIP do Participante está completamente ausente** da seção de planos da landing page — produto novo, sem vitrine |
| Badges | ✅ OK | BadgeShowcase funcional |
| FAQ | ⚠️ Desatualizado | 6 perguntas, nenhuma sobre IA, X1, VIP ou patrocínio. FAQ da UpgradePage tem perguntas VIP, mas a landing não |
| CTA Final | ⚠️ Desatualizado | Headline "A Copa do Mundo 2026 começa em junho" — correto para o momento, mas o CTA secundário aponta para "Criar campeonato personalizado" e ignora o VIP como segunda conversão |

### 1.2 Problemas de posicionamento (Marketing)

A página atual comunica **features**, não **benefícios**. Exemplos concretos:

| Como está (feature) | Como deveria ser (benefício) |
|---------------------|------------------------------|
| "Ranking em tempo real" | ⚠️ **Promessa falsa** — atualização é automática, não em tempo real. Corrigir para "Ranking atualizado automaticamente" |
| "Palpites com prazo" | ❌ **Não é diferencial** — remover dos destaques |
| "Taxa de inscrição" | ✅ **Diferencial relevante ausente** — gestão e controle de pagamento dentro da plataforma. Deve entrar nos benefícios do organizador |
| "Análise pré-jogo com IA" | **Ausente** — nem aparece |
| "Duelos X1" | **Ausente** — nem aparece |
| "Retrospectiva do bolão" | ⚠️ **Não é diferencial principal** — rebaixar para feature secundária, fora dos destaques |

### 1.3 Produtos não representados

Três produtos/funcionalidades lançados após a criação da landing **não têm nenhuma menção**:

1. **Análise pré-jogo com IA** — probabilidades reais + forma dos times + texto gerado por IA. Diferencial competitivo forte.
2. **Duelos X1** — desafios diretos entre participantes. Elemento de gamificação e engajamento.
3. **Passe VIP do Participante** — produto de monetização novo, sem vitrine na landing.

### 1.4 Problemas de identidade visual

- O card "Unlimited" usa `#EAB308` (amarelo Tailwind genérico) em vez do dourado Plakr `#FFB800` — violação da paleta.
- A seção de features usa cards planos sem hierarquia visual entre free e Pro.
- Nenhum elemento visual comunica "competição" ou "disputa" — a diretriz da identidade visual exige isso.

---

## 2. Proposta de Nova Estrutura

### Princípios da nova página

1. **Benefícios primeiro, features depois** — cada seção responde "o que você ganha?" antes de "como funciona?"
2. **Dois públicos, dois caminhos claros** — organizador e participante têm propostas de valor distintas
3. **Mais curta** — eliminar redundâncias entre "Diferencial Pro" e "Features". Fundir em uma seção só
4. **VIP na vitrine** — o Passe VIP precisa de uma seção própria ou integração clara na seção de planos
5. **IA e X1 como diferenciais** — mencionar explicitamente para elevar percepção de valor

### Nova estrutura proposta (7 seções vs 9 atuais)

| # | Seção | Objetivo | O que muda |
|---|-------|----------|------------|
| 1 | **Navbar** | Navegação | Adicionar link "VIP" ou "Para participantes" |
| 2 | **Hero** | Primeira impressão + CTA | Nova headline focada em benefício emocional. Adicionar menção a IA e X1 no subtítulo |
| 3 | **Credibilidade** | Prova social | Manter campeonatos. Adicionar 1-2 números (ex: "X bolões criados") se disponíveis |
| 4 | **Para quem é** | Segmentação | **NOVA seção.** Dois cards lado a lado: "Sou organizador" e "Sou participante" — cada um com 3 benefícios e CTA próprio |
| 5 | **Como funciona** | Educação | Manter os 4 passos, mas adicionar mockup do GameCard com análise de IA visível |
| 6 | **Planos** | Conversão | Reorganizar: mostrar planos do organizador (Free/Pro/Unlimited) + card do Passe VIP lado a lado ou em aba separada. Corrigir cor do Unlimited para `#FFB800` |
| 7 | **FAQ + CTA Final** | Objeções + fechamento | Atualizar FAQ com perguntas sobre IA, X1 e VIP. CTA final com dois botões: "Criar bolão grátis" e "Ativar Passe VIP" |

**Seções removidas:** "Diferencial Pro" (fundida em "Para quem é") e "Features grid" (fundida em "Para quem é" e "Como funciona"). "Badges" movida para dentro do card de participante.

---

## 3. Textos propostos para as seções-chave

### Hero

**Headline atual:** "Faça seu bolão com a galera"  
**Headline proposta:** "Seu bolão. Sua disputa. Sua vitória."

**Subheadline atual:** "Crie bolões para qualquer campeonato, convide seus amigos e acompanhe tudo em tempo real. Simples, divertido e gratuito."  
**Subheadline proposta:** "Crie bolões para Copa do Mundo, Brasileirão e mais. Análise pré-jogo com IA, duelos X1 e ranking automático. Grátis para começar."

**Badge atual:** "FAÇA SEU BOLÃO PARA A COPA DO MUNDO"  
**Badge proposto:** Manter — é contextualmente correto para 2026.

---

### Seção "Para quem é" (nova)

**Card Organizador:**
> **Você organiza. A plataforma cuida do resto.**  
> Crie o bolão, convide a galera e acompanhe tudo sem planilha, sem WhatsApp manual, sem dor de cabeça. Com o Pro, crie seu próprio campeonato — do bairro à empresa.
> - Bolões para qualquer campeonato global
> - Campeonato personalizado com seus times e fases
> - Taxa de inscrição com controle de pagamento integrado
> - Ranking atualizado automaticamente a cada resultado
> **CTA:** Criar bolão grátis →

**Card Participante:**
> **Aposte com mais inteligência. Ganhe com mais estilo.**  
> Palpite com análises de IA antes de cada jogo. Desafie rivais em duelos X1. Colecione badges e apareça no ranking. Com o Passe VIP, sem anúncios e com IA ilimitada.
> - Análise pré-jogo com probabilidades reais
> - Duelos X1: desafie quem você quiser
> - Badges e conquistas por desempenho
> - Passe VIP: sem anúncios, IA ilimitada
> **CTA:** Ativar Passe VIP →

---

### Seção de Planos (atualização)

Proposta: manter os 3 cards do organizador (Free/Pro/Unlimited) e adicionar um **4º card destacado** do Passe VIP, com badge "Para participantes" e cor dourada `#FFB800`. Ou alternativamente, usar duas abas: "Organizador" e "Participante".

**Correção obrigatória:** substituir `#EAB308` por `#FFB800` no card Unlimited.

---

### FAQ (perguntas a adicionar)

1. "O que é a análise de IA antes dos jogos?" → Explica probabilidades reais da API + texto gerado por IA
2. "O que são os duelos X1?" → Explica o sistema de desafio direto entre participantes
3. "O Passe VIP é diferente do plano Pro?" → Explica que VIP é para participantes, Pro é para organizadores

---

### CTA Final (atualização)

**Headline atual:** "A Copa do Mundo 2026 começa em junho. O seu bolão pode começar hoje."  
**Manter** — é forte e contextual.

**Botões atuais:** "Criar bolão grátis" + "Criar campeonato personalizado"  
**Botões propostos:** "Criar bolão grátis" + "Ativar Passe VIP" (com ícone de estrela dourada)

---

## 4. Resumo de prioridades de implementação

| Prioridade | Item | Impacto |
|------------|------|---------|
| 🔴 Alta | Adicionar Passe VIP na seção de planos | Produto sem vitrine = receita perdida |
| 🔴 Alta | Criar seção "Para quem é" com dois públicos | Segmentação aumenta conversão |
| 🔴 Alta | Corrigir cor Unlimited de `#EAB308` para `#FFB800` | Violação de identidade visual |
| 🟡 Média | Atualizar headline e subheadline do Hero | Posicionamento mais forte |
| 🟡 Média | Adicionar menção a IA e X1 no Hero e Features | Produtos novos sem visibilidade |
| 🟡 Média | Atualizar FAQ com 3 novas perguntas | Reduz objeções de conversão |
| 🟡 Média | Atualizar CTA Final: trocar "Campeonato personalizado" por "Passe VIP" | Segunda conversão mais relevante |
| 🟢 Baixa | Remover seção "Features grid" e fundir em "Para quem é" | Reduz tamanho da página |
| 🟢 Baixa | Adicionar link VIP na navbar | Navegação mais completa |

---

*Documento gerado pelo Orquestrador Plakr — Growth Specialist + Content & Marketing + UX Specialist + Visual Identity*
