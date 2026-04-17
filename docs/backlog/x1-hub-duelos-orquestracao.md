# Orquestração — Hub de Duelos (X1-EVO-006)

> **Data:** 2026-04-17 | **Especialistas consultados:** 40 | **Resultado:** Especificação validada com oportunidades de melhoria identificadas

---

## Veredicto Geral

A especificação do Hub de Duelos foi **aprovada pelos 40 especialistas** sem bloqueios críticos ao lançamento. Nenhum especialista classificou suas sugestões como "CRÍTICO" no sentido de bloquear a implementação — todos os pontos levantados são melhorias incrementais ou de backlog. A estrutura proposta (arena pública, 4 blocos, substituição da aba "Jogos") foi considerada sólida e bem fundamentada.

---

## Pontos de Atenção — Implementar no v1

Os seguintes temas foram levantados por múltiplos especialistas e devem ser incorporados à especificação antes do desenvolvimento:

### 1. Paginação e Performance (URGENTE para bolões grandes)
**Especialistas:** Senior Fullstack Developer, QA Engineer, Performance Specialist, Database Performance Specialist, Risk Advisor

A "Arena pública" e o "Histórico pessoal" devem ter **paginação e lazy loading** desde o v1. Bolões com muitos participantes podem gerar dezenas de duelos — carregar tudo de uma vez causaria lentidão e má experiência.

> **Ação:** Adicionar paginação nas procedures `x1.getByPool` e `x1.getMyDuels`. Definir page size padrão (sugestão: 20 itens).

---

### 2. Índices no Banco de Dados
**Especialistas:** Database Performance Specialist, Data Consistency Specialist

As queries das novas procedures precisam de índices específicos em `x1_challenges`:
- `(pool_id, status)` — para filtrar duelos por bolão e estado
- `(challenger_id, pool_id)` e `(challenged_id, pool_id)` — para "Seus duelos"
- `(pool_id, created_at)` — para ordenação cronológica

> **Ação:** Incluir a criação desses índices na migration do X1 base.

---

### 3. Cache para Estatísticas do Bolão
**Especialistas:** Cache Strategy Specialist, Database Performance Specialist, Performance Specialist

O bloco de estatísticas (`x1.getPoolStats`) executa queries de agregação que podem ser custosas. Deve ser cacheado com TTL curto (30–60s), invalidado quando um novo duelo é criado, aceito ou concluído.

> **Ação:** Implementar cache para `getPoolStats` com invalidação por evento.

---

### 4. Feature Flag para Rollout Controlado
**Especialistas:** Feature Flags Specialist, Release Management Specialist, Risk Advisor

A substituição da aba "Jogos" por "Duelos" é uma mudança visível na UX. Deve ser lançada com **feature flag** para permitir rollout gradual, medição de impacto e rollback rápido se necessário.

> **Ação:** Criar flag `x1_hub_enabled` no painel Admin. Ativar primeiro para bolões piloto antes do rollout geral.

---

### 5. Notificações — Definição Completa
**Especialistas:** Orchestrator Agent, Background Jobs Specialist, Scheduled Tasks Specialist

A especificação menciona badge de pendentes no ícone, mas não detalha os eventos de notificação do hub. Devem ser mapeados:
- Novo desafio recebido → badge + notificação in-app
- Desafio aceito/recusado → notificação ao desafiador
- Duelo finalizado → notificação a ambos com resultado
- Atualização de placar após jogo apurado → notificação opcional

> **Ação:** Adicionar seção de notificações na spec do Hub, alinhada com os tipos já definidos na spec do X1 base (`x1_invite`, `x1_accepted`, `x1_result_win`, etc.).

---

### 6. Segurança — Isolamento por Bolão
**Especialistas:** CSO, SecOps, Security Engineer

Todas as procedures do hub devem validar que o usuário é membro do bolão antes de retornar dados. Risco de vazamento de dados entre bolões em ambiente multi-tenant se o `poolId` não for validado contra o usuário autenticado.

> **Ação:** Garantir que `x1.getByPool`, `x1.getPoolStats` e `x1.getMyDuels` validem a membership do usuário no bolão antes de retornar dados.

---

### 7. Feedback Visual nas Ações
**Especialistas:** UX Specialist, Digital-First Visual Designer, Error Handling Specialist

Ao aceitar/recusar um duelo diretamente no hub (sem entrar no detalhe), o usuário precisa de feedback visual imediato — toast de confirmação, animação de remoção do card do bloco "Pendentes", atualização otimista do contador.

> **Ação:** Implementar optimistic update no bloco "Seus duelos" ao aceitar/recusar. Toast de confirmação.

---

### 8. Microtextos e UX Writing
**Especialistas:** Technical Writer, Content & Marketing Specialist, UX Specialist

A tela precisa de microtextos bem definidos para:
- Estado vazio (sem duelos ainda): mensagem encorajadora + CTA "Desafiar alguém"
- Estado de duelo pendente expirado
- Diferença visual clara entre `score_duel` e `prediction` na lista

> **Ação:** Definir microtextos para todos os estados da tela antes da implementação.

---

### 9. Identidade Visual — Ícone "Duelos"
**Especialistas:** Visual Identity (Plakr), Design System Architect, Digital-First Visual Designer

O ícone `Swords` do lucide-react deve ser validado contra a identidade visual da Plakr. O emoji ⚔️ não deve ser usado na interface — apenas em comunicações textuais. O ícone da barra inferior deve seguir o mesmo peso visual dos demais ícones (Regras, Membros, Palpites, Ranking).

> **Ação:** Validar o ícone `Swords` na barra inferior. Garantir consistência de tamanho, cor ativa/inativa e badge de notificação com o padrão existente.

---

## Oportunidades para Backlog

Sugestões válidas mas que não devem bloquear o v1:

| Ideia | Especialista | Impacto |
|---|---|---|
| Onboarding/tutorial na primeira visita ao hub | UX Specialist, Content Specialist | Médio |
| Configuração de visibilidade pelo organizador (público/privado) | Admin Config, Configurability Architect | Médio |
| Opção de desativar o Hub por bolão | Admin Config Specialist | Baixo |
| Compartilhamento de duelos em redes sociais | Partnerships Specialist | Alto |
| Recomendação de adversários por IA | Innovation Specialist | Alto |
| Duelos com aposta simbólica (X1-EVO-002 já registrado) | Payment Specialist, Monetization Specialist | Alto |
| Ranking global de X1s (X1-EVO-005 já registrado) | Growth Specialist, BI Analyst | Alto |
| Métricas de correlação X1 × churn | Financial Analyst | Alto |
| Torneio X1 com bracket (X1-EVO-003 já registrado) | Head of Product | Alto |
| Logs de auditoria para ações de duelo | Observability Specialist | Médio |
| Archiving de duelos antigos | Database Performance Specialist | Baixo |

---

## Especificação Atualizada — Adições ao x1-hub-duelos.md

Com base na orquestração, os seguintes itens devem ser adicionados à especificação:

1. **Paginação:** `x1.getByPool` e `x1.getMyDuels` com page size 20, scroll infinito ou botão "Ver mais"
2. **Índices:** `(pool_id, status)`, `(challenger_id, pool_id)`, `(challenged_id, pool_id)` em `x1_challenges`
3. **Cache:** `x1.getPoolStats` com TTL 60s, invalidação por evento
4. **Feature flag:** `x1_hub_enabled` no Admin antes do rollout
5. **Validação de membership:** todas as procedures validam que o usuário é membro do bolão
6. **Optimistic update:** aceitar/recusar no hub com feedback visual imediato
7. **Estado vazio:** mensagem + CTA quando não há duelos no bolão
8. **Ícone validado:** `Swords` do lucide-react, peso visual consistente com a barra inferior existente

---

## Conclusão

A especificação está **pronta para desenvolvimento** com as adições acima. Nenhum ponto levantado requer redesenho da arquitetura ou da proposta de valor. Os 9 pontos de atenção são todos implementáveis dentro do escopo original sem aumento significativo de esforço.
