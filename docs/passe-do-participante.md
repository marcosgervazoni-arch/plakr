# Passe do Participante — Análise Detalhada

**Auditoria de 12 Especialistas | Abril 2026**

---

## 1. O que é o Passe do Participante?

O Plakr tem dois perfis de usuário com jornadas completamente distintas: o **organizador**, que cria e gerencia o bolão, e o **participante**, que entra pelo convite do organizador e faz palpites. Hoje, todos os participantes usam a plataforma de graça — mas veem anúncios e têm acesso limitado a algumas features.

O **Passe do Participante** é uma assinatura opcional de **R$4,90/mês** exclusiva para quem participa de bolões. Ele é **independente do plano do organizador**: um participante pode ativá-lo em qualquer bolão, mesmo que o organizador esteja no Free. Não é um plano de criação de bolões — é um upgrade de experiência individual.

---

## 2. Free vs Passe — Diferenças Claras

Esta é a comparação completa entre o que o participante tem hoje (Free) e o que teria com o Passe:

| Feature | Free (participante hoje) | Passe do Participante (R$4,90/mês) |
|---|---|---|
| **Anúncios** | Vê anúncios em todas as telas | **Sem anúncios** em nenhum bolão |
| **Análise pré-jogo (IA)** | 3 análises por dia (resumo básico) | **Ilimitada** (análise completa) |
| **Comentário pós-jogo (CazéTV)** | 3 comentários por bolão | **Ilimitado** (comentário completo) |
| **Duelos X1** | Limitados (quantidade a definir) | **Ilimitados** |
| **Card Stories** | Com marca d'água Plakr | **Sem marca d'água** |
| **Criar bolões** | Não (isso é função do organizador) | Não (isso é função do organizador) |
| **Limite de bolões que pode participar** | Sem limite | Sem limite |

O Passe **não dá ao participante poderes de organizador**. Ele não pode criar bolões, não tem acesso a painel de gestão, não configura regras. O Passe é puramente sobre **qualidade de experiência individual**.

---

## 3. Por que Faz Sentido para o Negócio

### 3.1 Nova linha de receita sem canibalização

Os 12 especialistas consultados são unânimes: o Passe do Participante **não compete com os planos do organizador**. As jornadas de compra são completamente distintas:

- O organizador paga para **criar, gerenciar e personalizar** bolões.
- O participante paga para ter uma **experiência individual melhor** dentro de bolões que já existem.

Um participante que ativa o Passe não deixa de ser um argumento para o organizador fazer upgrade — ele continua dentro do bolão, engajado, e pode até pressionar o organizador a melhorar o bolão.

### 3.2 Monetização de quem hoje não paga nada

A base de participantes é estruturalmente maior do que a base de organizadores. Para cada organizador que cria um bolão com 20 pessoas, há 19 participantes. Hoje, todos esses 19 são monetizados apenas via anúncios. O Passe abre uma segunda alavanca de receita sobre essa base.

### 3.3 O preço é calibrado para conversão em massa

R$4,90/mês é um valor que compete com uma barra de chocolate. O objetivo não é maximizar o ticket médio — é maximizar o volume de assinantes recorrentes. Um participante engajado que joga bolão toda semana, vê anúncios toda vez que abre o app, e quer ler a análise da IA sem restrição, tem motivação clara para pagar esse valor.

---

## 4. Jornada do Participante — Como Ele Descobre e Decide

A descoberta do Passe acontece em **momentos de fricção natural**, não por campanhas de marketing ativo. Os três gatilhos mais citados pelos especialistas:

**Gatilho 1 — Anúncio interrompe a experiência.** O participante está lendo o ranking, abrindo o card de um jogo, ou vendo o comentário da IA, e um anúncio aparece. Nesse momento, um banner discreto aparece: *"Cansado dos anúncios? Passe do Participante por R$4,90/mês."*

**Gatilho 2 — Limite de IA atingido.** O participante quer ler a análise pré-jogo do quarto jogo do dia e recebe a mensagem de limite. O sistema oferece o Passe como solução imediata.

**Gatilho 3 — Card Story com marca d'água.** O participante quer compartilhar o card da sua posição no ranking no WhatsApp, mas a marca d'água Plakr aparece. O Passe remove isso.

O **momento "aha!"** ocorre logo após a ativação: o participante abre o app e não vê nenhum anúncio. Essa ausência imediata e perceptível é o principal reforço de valor do Passe.

---

## 5. Riscos e Como Mitigá-los

### 5.1 Risco de canibalização dos planos do organizador

**Avaliação:** Baixo a moderado. O risco real não é que o participante "substitua" o organizador — é que o organizador Free sinta que seus participantes estão tendo uma experiência melhor do que a que ele oferece, sem que ele precise pagar mais. Isso pode gerar um efeito positivo inesperado: o organizador se sente motivado a fazer upgrade para "igualar" a experiência.

**Mitigação:** Comunicar claramente que o Passe é um upgrade individual do participante, não um reflexo do plano do bolão. O organizador não precisa se sentir responsável pela experiência do participante com anúncios.

### 5.2 Risco de baixa adoção se o Free for generoso demais

**Avaliação:** Médio. Se o lock suave da IA no Free for muito permissivo (3 análises/dia pode ser suficiente para participantes casuais), o gatilho de upgrade perde força.

**Mitigação:** O principal gatilho de conversão não é a IA — é a **remoção de anúncios**. Participantes que abrem o app diariamente veem anúncios com frequência. Esse é o argumento mais forte e independe de quanto a IA é usada.

### 5.3 Risco de complexidade de comunicação

**Avaliação:** Médio. Ter dois tipos de plano (organizador + participante) pode confundir usuários novos que não entendem a diferença.

**Mitigação:** A página de pricing deve ter duas abas ou seções claramente separadas: "Sou organizador" e "Sou participante". A comunicação in-app deve ser contextual — o Passe só aparece para quem está participando de bolões, nunca para quem está criando.

---

## 6. Recomendação dos Especialistas: Testar Primeiro

**Consenso de 12/12 especialistas: lançar como teste controlado antes de escalar.**

A recomendação não é adiar — é lançar com cautela. O MVP do Passe pode ser implementado em menos de uma semana de desenvolvimento (novo Price ID no Stripe + lógica de verificação no backend + banner contextual no frontend). O teste deve durar 30 dias e medir:

| Métrica | Meta para validar |
|---|---|
| Taxa de conversão (participantes ativos → Passe) | > 2% |
| Churn mensal do Passe | < 20% |
| Impacto na conversão de organizadores para Starter/Pro | Neutro ou positivo |
| NPS de participantes com Passe vs sem Passe | Diferença > 15 pontos |

Se as métricas validarem, escalar com comunicação ativa (e-mail, push, banner in-app). Se não validarem, ajustar os benefícios ou o preço antes de escalar.

---

## 7. Implementação Técnica — O que Precisa ser Feito

A implementação é direta e de baixo risco técnico:

1. **Stripe:** Criar novo Price ID para o Passe do Participante (R$4,90/mês recorrente)
2. **`shared/plans.ts`:** Adicionar o plano `participant_pass` com os benefícios mapeados
3. **Backend:** Adicionar verificação `hasParticipantPass(userId)` nas procedures de IA, Duelos e Card Stories
4. **Anúncios:** Adicionar `hasParticipantPass` como condição de supressão de ads (junto com `isPro`)
5. **Frontend:** Banner contextual em momentos de fricção (limite de IA, exibição de anúncio, Card Story com marca d'água)
6. **Página de pricing:** Seção "Para participantes" com comparativo Free vs Passe

Estimativa de esforço: **3-5 dias de desenvolvimento** para um MVP funcional.

---

## 8. Proposta de Benefício Adicional (Sugestão dos Especialistas)

Oito dos 12 especialistas sugeriram adicionar um **benefício de status social** ao Passe para reforçar a percepção de exclusividade. A sugestão mais citada: um **badge exclusivo no perfil** do participante com Passe — algo como "Torcedor VIP" ou um ícone dourado ao lado do nome no ranking. Esse benefício tem custo zero de implementação e cria um sinal visual que outros participantes veem, gerando curiosidade e conversão orgânica.

---

*Análise consolidada a partir de 12 especialistas internos. Auditoria conduzida em abril de 2026.*
