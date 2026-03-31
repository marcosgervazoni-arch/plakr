# [UX] AdminSettings — Separar botões "Salvar" por grupo de configuração

**Categoria:** Melhoria UX  
**Prioridade:** Média  
**Esforço estimado:** Pequeno (2–3h)  
**Dependências:** Nenhuma

---

## Contexto

Durante sessão de 31/03/2026, identificou-se que o AdminSettings usa um único botão "Salvar tudo" no topo que envia todos os campos de uma vez. Isso causou um bug real: uma validação falha no campo `vapidEmail` (grupo Push) bloqueava o salvamento das pontuações padrão (grupo completamente diferente).

O bug foi corrigido na raiz (dado corrompido no banco + schema Zod mais tolerante), mas o padrão de "salvar tudo junto" continua sendo um risco latente.

---

## Problema

Quando um campo de um grupo falha na validação, **todos os outros grupos ficam bloqueados** pelo mesmo botão. O usuário não consegue salvar as pontuações porque o e-mail de push está inválido — mesmo que não queira alterar nada no push.

---

## Solução Proposta

Separar o `handleSaveAll` em handlers independentes por grupo, cada um com seu próprio botão "Salvar" dentro do acordeon correspondente:

| Grupo (Acordeon) | Handler | Campos incluídos |
|---|---|---|
| Regras e Limites | `handleSaveRules` | pontuações padrão, limites, dias de arquivamento |
| Monetização e Pagamentos | `handleSaveStripe` | chaves Stripe, price IDs, preços |
| Notificações Push | `handleSavePush` | vapidPublicKey, vapidPrivateKey, vapidEmail, pushEnabled |
| Mensagens e Badges | `handleSaveMessages` | restrictedInviteMessage, cobaiaPoolId |

O botão único no topo pode ser **removido** ou mantido como "Salvar tudo" para conveniência, mas com validação por grupo independente.

---

## Benefícios

- Elimina validação cruzada entre grupos não relacionados
- Feedback mais preciso ("Configurações de push salvas")
- Segue o princípio de menor superfície de risco por ação
- Consistente com o padrão já usado no AdminBroadcasts (botão por seção)

---

## Notas de Implementação

- Cada `handleSave*` chama `updateMutation.mutate({ ...camposDoGrupo })`
- O schema Zod já aceita campos parciais (todos são `.optional()`)
- Não requer mudança de schema ou migração de banco
- Visual: botão "Salvar" pequeno no rodapé de cada acordeon (variant outline, size sm)
