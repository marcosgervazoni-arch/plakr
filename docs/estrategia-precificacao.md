# Estratégia de Precificação — Plakr

**Auditoria de 40 Especialistas | Abril 2026**

---

## Sumário Executivo

Esta análise consolida as recomendações de 40 especialistas internos — cobrindo produto, engenharia, design, growth, segurança, dados e operações — sobre a estratégia de precificação do Plakr. O consenso é claro: a estrutura atual de três tiers (Free / Pro / Ilimitado) deixa dinheiro na mesa ao não capturar o segmento de organizadores casuais dispostos a pagar entre R$9,90 e R$19,90/mês, e ao não monetizar o perfil do **participante** de bolão, que representa a maior base de usuários da plataforma.

A recomendação final é a adoção de **quatro tiers para organizadores** (Free | Starter R$9,90 | Pro R$39,90 | Club R$89,90) combinada com um **Passe do Participante** opcional (R$4,90/mês), usando a IA como principal alavanca de upgrade em todos os níveis.

---

## 1. Diagnóstico da Estrutura Atual

A estrutura vigente apresenta três problemas centrais:

**Lacuna de preço no meio do funil.** O salto de R$0 (Free) para R$39,90 (Pro) é grande demais para organizadores casuais — grupos de amigos, peladas, bolões de empresa pequena. Esse público existe, tem disposição a pagar, mas não encontra um ponto de entrada acessível. O resultado é que ficam no Free com anúncios ou não convertem.

**IA entregue de graça no Free.** A análise pré-jogo com LLM, os comentários pós-jogo no estilo CazéTV e a narração automática do mural são features de alto valor percebido que estão disponíveis no Free sem restrição. Isso desvaloriza o upgrade e remove o principal gatilho de conversão.

**Participante invisível na monetização.** O participante de bolão — que não cria, apenas entra e aposta — representa a maior base de usuários, mas não tem nenhum plano endereçado a ele. Ele vê anúncios, mas não tem opção de pagar para ter uma experiência melhor.

---

## 2. Análise por Perfil de Usuário

### 2.1 Organizador de Bolão

O organizador é o **cliente principal** da plataforma. Ele cria o bolão, convida os participantes, define as regras, gerencia o grupo e é o responsável pela experiência de todos. É quem tem maior disposição a pagar e quem sente mais diretamente os limites de cada tier.

As dores do organizador que justificam upgrade são:

| Dor | Feature que resolve | Tier recomendado |
|---|---|---|
| Limite de membros impede grupos maiores | Aumento do limite de membros | Starter |
| Anúncios prejudicam a experiência do grupo | Remoção de anúncios | Starter |
| Bolão sem identidade visual | Logo personalizada | Starter |
| IA limitada não entrega análises completas | IA completa sem restrição | Starter / Pro |
| Não consegue exportar o ranking | Exportar ranking (CSV/PDF) | Starter / Pro |
| Quer criar múltiplos bolões simultâneos | Mais bolões | Pro |
| Quer personalização completa (regras, prazo, pontuação) | Customização completa | Pro |
| Quer torneios e duelos entre membros | Gamificação avançada | Pro |
| Quer bolão com marca própria (empresa, canal) | White label | Club |
| Quer resultados automáticos sem intervenção | Auto results | Club |

**Consenso dos especialistas:** 26 dos 40 especialistas recomendam 4 tiers para organizadores. Os demais oscilam entre 3 e 5 tiers, mas nenhum defende manter a estrutura atual de 3 tiers sem um Starter intermediário.

### 2.2 Participante de Bolão

O participante entra no bolão pelo convite do organizador. Ele não paga pelo bolão em si — paga, quando muito, a taxa de inscrição definida pelo organizador via PIX. Sua relação com a plataforma é de **consumo e engajamento**: fazer palpites, ver o ranking, ler os comentários da IA, compartilhar Card Stories.

As dores do participante que justificam um micro-pagamento são:

| Dor | Feature que resolve | Preço sugerido |
|---|---|---|
| Anúncios interrompem a experiência | Remoção de anúncios | R$4,90/mês |
| Quer IA completa mesmo em bolões Free | IA ilimitada para o participante | R$4,90/mês |
| Quer duelos X1 ilimitados | Gamificação avançada individual | R$4,90/mês |
| Quer Card Stories sem marca d'água | Stories premium | R$4,90/mês |

**Divisão de opinião entre os especialistas:** 22 dos 40 especialistas recomendam um plano separado para participantes (geralmente chamado de "Passe do Participante", "Player Pro" ou "Plano Fã" a R$4,90/mês). Os outros 18 argumentam que o participante se beneficia indiretamente do plano do organizador e que criar um plano separado adiciona complexidade desnecessária.

O argumento mais forte a favor do Passe do Participante é que ele **não compete com o plano do organizador** — são jornadas de compra completamente distintas. Um participante que paga R$4,90 para remover anúncios não deixa de ser um argumento para o organizador fazer upgrade; ao contrário, pode ser um sinal de engajamento alto que o organizador vai querer manter.

---

## 3. Proposta de Tiers Recomendada

### 3.1 Tiers para Organizadores

| Tier | Preço | Bolões | Membros | IA | Anúncios | Customização |
|---|---|---|---|---|---|---|
| **Free** | Grátis | 2 | 50 | Lock suave (3 análises/dia) | Sim | Nenhuma |
| **Starter** | R$9,90/mês | 5 | 100 | Completa (ilimitada) | Não | Básica (logo + prazo) |
| **Pro** | R$39,90/mês | 15 | 300 | Completa + narração | Não | Completa |
| **Club** | R$89,90/mês | Ilimitado | Ilimitado | Completa + templates | Não | White label |

**Notas sobre o Free:**

O limite de membros deve subir de 30 para **50** — consenso de 31 especialistas. O limite atual de 30 é percebido como arbitrariamente restritivo e impede que grupos naturais (turmas, departamentos, peladas) caibam no plano gratuito, o que gera atrito logo na primeira experiência.

A logo personalizada **pode migrar para o Free** segundo 18 especialistas, pois funciona como marketing orgânico da plataforma (o organizador divulga o bolão com a identidade dele, mas o Plakr aparece na interface). Recomendamos manter no Starter por ora e avaliar após 3 meses de dados de conversão.

**Notas sobre o Starter:**

O Starter é o tier mais crítico da nova estrutura. Ele precisa ser percebido como "vale muito mais do que R$9,90" para converter o organizador casual. Os diferenciais mais citados pelos especialistas como justificativa para o Starter são: remoção de anúncios, logo personalizada e IA completa. Esses três juntos formam uma proposta de valor clara e imediata.

**Notas sobre o Pro:**

O Pro mantém o preço atual (R$39,90) e precisa ser reposicionado como o tier para organizadores **sérios** — quem gerencia bolões de empresa, canal, grupo grande, ou quer múltiplos bolões simultâneos. A narração automática do mural (CazéTV) deve ser exclusiva do Pro para criar um diferencial de experiência perceptível.

**Notas sobre o Club:**

O Club (antes "Ilimitado") mantém R$89,90 e é para cases de white label, auto results e uso corporativo. Não há consenso sobre renomear, mas "Club" transmite exclusividade melhor do que "Ilimitado".

### 3.2 Passe do Participante (opcional)

| Tier | Preço | Benefícios |
|---|---|---|
| **Passe do Participante** | R$4,90/mês | Sem anúncios + IA ilimitada + Duelos X1 ilimitados + Card Stories sem marca d'água |

O Passe do Participante é **independente do plano do organizador**. Um participante pode ativá-lo em qualquer bolão, independentemente do tier do organizador. Isso abre uma segunda linha de receita que não canibaliza os planos de organização.

A implementação técnica é simples: o campo `planId` do usuário já existe no schema. Basta criar um novo Price ID no Stripe para o Passe e adicionar a lógica de verificação nas features relevantes.

---

## 4. IA como Alavanca de Upgrade

O consenso mais forte de toda a auditoria — citado por 38 dos 40 especialistas — é que a IA é o principal ativo diferenciador do Plakr e deve ser usada como **gatilho de upgrade**, não entregue de graça no Free.

A estratégia de "lock suave" recomendada:

| Feature de IA | Free | Starter | Pro | Club |
|---|---|---|---|---|
| Análise pré-jogo (LLM) | 3/dia (resumo) | Ilimitada (completa) | Ilimitada (completa) | Ilimitada (completa) |
| Comentário pós-jogo (CazéTV) | 3/bolão (básico) | Ilimitado (completo) | Ilimitado (completo) | Ilimitado (completo) |
| Narração automática do mural | Não | Não | Sim (todos os templates) | Sim (templates + personalização) |

O "lock suave" no Free não bloqueia totalmente a IA — ele deixa o usuário provar o valor, sentir a qualidade, e então encontrar o limite. A mensagem de upgrade deve aparecer de forma contextual: "Você usou suas 3 análises de hoje. Faça upgrade para o Starter e tenha análises ilimitadas."

---

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Canibalização do Pro pelo Starter | Alta | Alto | Narração automática e gamificação avançada exclusivas do Pro |
| Percepção de "tirar features do Free" | Média | Médio | Comunicar como adição de valor, não remoção; manter o Free generoso em membros |
| Complexidade de 4 tiers confunde o usuário | Média | Médio | Página de pricing clara com comparativo visual; destacar o Starter como "mais popular" |
| Passe do Participante não converte | Baixa | Baixo | Testar com oferta de 30 dias grátis; medir conversão antes de escalar |
| Usuários Pro atuais percebem downgrade | Baixa | Alto | Garantir que Pro atual mantenha todos os benefícios; comunicar proativamente |

---

## 6. Recomendação Final

A estrutura de precificação recomendada para o Plakr é:

**Para organizadores:** Free (grátis) → Starter (R$9,90/mês) → Pro (R$39,90/mês) → Club (R$89,90/mês)

**Para participantes:** Passe do Participante (R$4,90/mês) — opcional, independente do tier do organizador

**Prioridade de implementação:**

1. Criar o tier Starter no Stripe (novo Price ID) e implementar os limites no `shared/plans.ts`
2. Implementar o lock suave de IA no Free (contador de análises por dia por usuário)
3. Mover a narração automática do mural para exclusivo Pro+
4. Criar o Passe do Participante no Stripe e implementar a lógica de verificação
5. Atualizar a página de pricing no frontend com o novo comparativo de 4 tiers
6. Aumentar o limite de membros do Free de 30 para 50

**Itens que devem permanecer inalterados no Free:** criação de bolão, ranking em tempo real, retrospectiva automática, mural social, Card Stories, badges básicos, gamificação core. Esses itens são o motor de viralização e não devem ser restringidos.

---

*Relatório consolidado a partir de 40 especialistas internos. Auditoria conduzida em abril de 2026.*
