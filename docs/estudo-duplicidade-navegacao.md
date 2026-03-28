# Estudo de Duplicidade e Navegação — Plakr

**Data:** 28/03/2026  
**Contexto:** Análise solicitada pelo Coordenador de Marketing (Gerva) com preocupação sobre excesso de telas, duplicidades e labirinto de navegação para o usuário.

---

## Diagnóstico

O projeto possui **51 rotas registradas** e **50 arquivos de página**. Para um produto em fase pré-lançamento sem usuários reais em produção, isso representa complexidade excessiva. Foram identificados 7 problemas concretos.

---

## Problemas Identificados

### 1. `PoolSettings.tsx` — Arquivo Morto
- **Situação:** Arquivo existe, está importado no `App.tsx`, mas **não tem rota registrada**.
- **Impacto:** Código que não serve nenhuma tela. Confusão para desenvolvedores.
- **Ação:** Remover o arquivo. As configurações do bolão já estão em `OrganizerIdentity`, `OrganizerRules` e `OrganizerAccess`.

### 2. `EnterPool.tsx` — Rota Fantasma
- **Situação:** A rota `/enter-pool` existe apenas para redirecionar para `/pools/public`.
- **Impacto:** Rota desnecessária, adiciona complexidade sem valor.
- **Ação:** Remover a rota e substituir qualquer link que aponte para `/enter-pool` por `/pools/public` diretamente.

### 3. `Dashboard.tsx` vs `Home.tsx` — Dois Centros Concorrentes
- **Situação:** `/dashboard` é o hub pós-login (perfil, bolões, gráficos, palpites). `/` é a landing page pública. Usuário logado pode acessar os dois e ver informações similares.
- **Impacto:** Confusão sobre qual é a "home" do usuário logado.
- **Ação:** Redirecionar `/` → `/dashboard` automaticamente para usuários autenticados. O CTA da landing page já prevê "Meu Painel" para logados (ver knowledge base).

### 4. `MyProfile.tsx` vs `PublicProfile.tsx` — Dois Perfis com Sobreposição
- **Situação:** `/my-profile` exibe perfil com edição. `/profile/:userId` exibe perfil público. Quando o usuário acessa seu próprio `/profile/:userId`, vê dados similares sem opção de edição.
- **Impacto:** Dois caminhos para ver o mesmo perfil, com experiências inconsistentes.
- **Ação:** Fazer `/profile/:userId` detectar quando é o próprio usuário e exibir modo de edição. Eliminar `/my-profile` como rota separada (ou torná-la um alias que redireciona).

### 5. Painel Admin com 17 Rotas — 8 Prematuras
- **Situação:** Das 17 rotas admin, apenas 9 têm utilidade operacional imediata.

| Rota | Status |
|---|---|
| `/admin` (Dashboard) | ✅ Essencial |
| `/admin/tournaments` + `/admin/tournaments/:id` | ✅ Essencial |
| `/admin/users` | ✅ Essencial |
| `/admin/pools` | ✅ Essencial |
| `/admin/game-results` | ✅ Essencial |
| `/admin/settings` | ✅ Essencial |
| `/admin/audit` | ✅ Essencial |
| `/admin/subscriptions` | ✅ Essencial |
| `/admin/broadcasts` | ✅ Essencial |
| `/admin/badges` | ⏸ Prematura — sem usuários, badges não têm impacto |
| `/admin/ads` | ⏸ Prematura — sem tráfego, ads não têm valor |
| `/admin/referrals` | ⏸ Prematura — referrals são estratégia de crescimento |
| `/admin/system` | 🔀 Pode ser aba dentro de `/admin/settings` |
| `/admin/import-logs` | 🔀 Pode ser aba dentro de `/admin/tournaments/:id` |
| `/admin/retrospectivas` | 🔀 Pode ser aba dentro de `/admin/pools` |
| `/admin/landing-page` | 🔀 Pode ser aba dentro de `/admin/settings` |
| `/admin/pricing` | 🔀 Pode ser aba dentro de `/admin/settings` |
| `/admin/x1-duels` | ⏸ Prematura — X1 ainda não está em produção |

- **Ação:** Consolidar as 8 rotas marcadas como 🔀 em abas de telas existentes. Ocultar as 3 marcadas como ⏸ até atingir o estágio de produto adequado.

### 6. `Conquistas.tsx` — Sobreposição com o Dashboard
- **Situação:** `/conquistas` exibe badges com progresso e linha do tempo. O `Dashboard` já exibe carrossel de badges e badges próximas. Duas telas para a mesma informação com granularidade diferente.
- **Impacto:** Usuário não sabe onde encontrar suas conquistas.
- **Ação:** Transformar `/conquistas` em uma **seção expandível ou aba dentro do Dashboard**, eliminando a rota separada.

### 7. `NotificationPreferences.tsx` — Tela Órfã
- **Situação:** `/notification-preferences` existe mas não aparece na navegação principal. Acessível apenas por link direto.
- **Impacto:** Usuário não encontra as preferências de notificação organicamente.
- **Ação:** Transformar em **aba dentro de `/notifications`**, não uma rota separada.

---

## Plano de Consolidação

| Ação | Tipo | Impacto |
|---|---|---|
| Remover `PoolSettings.tsx` | Limpeza | Elimina código morto |
| Remover rota `/enter-pool` | Limpeza | Elimina rota fantasma |
| Redirecionar `/` → `/dashboard` para logados | Simples | Elimina centro duplicado |
| Unificar `/my-profile` e `/profile/:userId` | Médio | Elimina tela duplicada |
| Mover `NotificationPreferences` para aba em `/notifications` | Médio | Elimina rota órfã |
| Mover `Conquistas` para seção no Dashboard | Médio | Elimina rota redundante |
| Consolidar 8 rotas admin em abas de telas existentes | Estrutural | Reduz admin de 17 para 9 rotas |

**Resultado esperado:** Redução de 51 para ~38 rotas, com ganho real de clareza para o usuário.

---

## Princípio Orientador

> "Se o usuário precisar de mais de 2 cliques para encontrar qualquer informação relevante, ou se existirem dois caminhos que levam ao mesmo lugar, há um problema de navegação."

A regra de ouro para cada nova tela antes de criar: **"Essa informação não pode ser uma seção ou aba de uma tela já existente?"**

---

*Documento criado em 28/03/2026. Implementação adiada para revisão futura.*
