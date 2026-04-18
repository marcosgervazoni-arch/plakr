# Mural do Bolão — Avaliação dos 40 Especialistas
**Data:** 18/04/2026 | **Veredicto:** ✅ Aprovado unânime como v1 MVP

---

## Veredicto Geral

**40/40 especialistas votaram v1 MVP.** Nenhum especialista recomendou lançar o v1 completo de uma vez nem adiar para backlog futuro. O consenso é: a ideia é estrategicamente correta, mas deve ser lançada de forma incremental, priorizando as funcionalidades de maior valor e menor risco.

---

## O Que a Ideia Propõe

Cada bolão teria um **Mural** — feed social exclusivo daquele bolão — com:
1. Eventos automáticos do sistema (mudanças de posição, resultados de X1, placares exatos)
2. Posts de texto livre por organizador e participantes
3. Comentários nos posts
4. Menções (@nome) com notificação
5. Reações (curtidas/emojis)

---

## Pontos de Convergência (mencionados por 5+ especialistas)

### ✅ Forças da Ideia
- **Engajamento e retenção:** o mural transforma o bolão de uma experiência passiva (palpitar e aguardar) em uma comunidade ativa. Aumenta o tempo de sessão e a frequência de retorno.
- **Diferencial competitivo:** nenhum concorrente direto tem feed social por bolão. Cria barreira de saída — usuários não vão querer perder o histórico de interações.
- **Narrativa coletiva:** os eventos automáticos (subiu para 1º, venceu o X1) criam momentos de celebração e rivalidade que se compartilham naturalmente no WhatsApp.
- **Sinergia com X1:** o mural amplifica os duelos — resultados de X1 aparecem no feed e geram comentários, criando um loop de engajamento.

### ⚠️ Riscos Críticos (mencionados por 8+ especialistas)

| Risco | Especialistas | Mitigação recomendada |
|---|---|---|
| **Moderação de conteúdo** | SecOps, CSO, Security Engineer, UX, Product | Moderação pelo organizador + denúncia por participantes. Sem moderação automática no MVP. |
| **Performance do feed** | DB Performance, Cache, Performance, CTO | Cache com TTL curto (30-60s) por bolão. Paginação obrigatória (20 itens/página). Índices em `(pool_id, created_at)`. |
| **Spam e abuso** | Security, SecOps, QA | Rate limiting por usuário (máx. 10 posts/hora). Sanitização de HTML. Sem links externos no MVP. |
| **Notificações excessivas** | UX, Background Jobs, Observability | Menções geram notificação individual. Eventos automáticos NÃO notificam individualmente — apenas aparecem no feed. |
| **Escopo de schema** | CTO, Data Consistency, DB Performance | 3 tabelas novas: `pool_posts`, `pool_post_comments`, `pool_post_reactions`. Índices desde o início. |
| **LGPD** | Security Engineer, CSO | Posts e comentários são dados pessoais. Política de exclusão: ao sair do bolão, posts ficam mas nome é anonimizado. |

---

## Recomendações por Área

### Arquitetura & Banco (CTO, DB Performance, Data Consistency)
- Schema mínimo: `pool_posts (id, pool_id, author_id, type, content, created_at)`, `pool_post_comments (id, post_id, author_id, content, created_at)`, `pool_post_reactions (id, post_id, author_id, emoji)`
- `type` no post: `'user_post'` | `'rank_change'` | `'x1_result'` | `'exact_score'`
- Índice composto obrigatório: `(pool_id, created_at DESC)`
- Soft delete em posts e comentários (campo `deleted_at`)

### Segurança (CSO, SecOps, Security Engineer)
- Sanitização de HTML em todo conteúdo antes de salvar (DOMPurify no frontend + strip_tags no backend)
- Rate limiting: 10 posts/hora por usuário por bolão
- Organizador pode deletar qualquer post/comentário do seu bolão
- Sem links externos no MVP (ou apenas whitelist de domínios confiáveis)
- Log de auditoria para deleções

### UX & Design (UX, Visual Designer, Visual Identity)
- Feed em ordem cronológica reversa (mais recente primeiro)
- Eventos automáticos com visual diferenciado (ícone + cor de destaque) para distinguir de posts humanos
- Menções com autocomplete ao digitar `@` (busca entre membros do bolão)
- Estado vazio com CTA encorajador: "Seja o primeiro a postar no mural!"
- Aba "Mural" na barra de navegação do bolão — avaliar se substitui outra aba ou é adicionada

### Performance & Cache (Cache, Performance, Background Jobs)
- Cache do feed por bolão com TTL de 30s, invalidado ao criar post/comentário
- Eventos automáticos gerados por background job (não bloqueiam a transação principal)
- Paginação cursor-based (não offset) para feeds longos
- Contagem de comentários e reações desnormalizada no post (campo `comment_count`, `reaction_count`) para evitar COUNT queries

### Produto & Crescimento (Head of Product, PO, Growth, Monetization)
- **Restrição por plano:** organizadores Free podem ter mural mas com limite de posts por dia (ex: 5/dia). Pro e Business sem limite.
- **Eventos automáticos são Pro:** bolões Free mostram apenas posts humanos. Eventos automáticos (rank change, X1 result) são exclusivos de bolões Pro — incentivo de upgrade.
- **Compartilhamento:** posts com eventos especiais (placar exato, subiu para 1º) têm botão de compartilhar como imagem no WhatsApp.

### Monetização & Anúncios (Monetization, Growth, Financial)
- Mural é um canal natural para anúncios contextuais entre posts (plano Free)
- Patrocínio de eventos: "Esse gol foi patrocinado por [marca]" nos eventos automáticos de bolões Business
- Mural aumenta DAU/MAU — métrica diretamente ligada ao valor de assinatura

---

## Escopo do v1 MVP (recomendado pelos 40)

### Incluir no MVP
- [ ] Posts de texto livre (sem links, sem imagens)
- [ ] Comentários nos posts
- [ ] Menções (@nome) com notificação push/in-app
- [ ] Eventos automáticos: mudança de posição no ranking, resultado de X1
- [ ] Organizador pode deletar posts/comentários do seu bolão
- [ ] Rate limiting básico

### Deixar para v2
- [ ] Reações com emojis (curtidas simples podem entrar no MVP se o schema suportar)
- [ ] Eventos automáticos de placar exato (requer integração com o motor de apuração)
- [ ] Compartilhamento de post como imagem
- [ ] Moderação automática por IA
- [ ] Anúncios no feed
- [ ] Patrocínio de eventos

### Não fazer (por enquanto)
- Imagens/vídeos nos posts (custo de storage + moderação)
- Threads aninhadas (comentários de comentários)
- Polls/enquetes no mural

---

## Decisões de Configurabilidade (Admin Config, Configurability Architect)
- Admin pode ativar/desativar o Mural por plano
- Admin pode configurar o rate limit (posts/hora)
- Organizador pode desativar o mural do seu bolão
- Feature flag `pool_wall_enabled` para rollout controlado

---

## Schema Proposto (CTO)

```sql
-- pool_posts
CREATE TABLE pool_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pool_id INT NOT NULL,
  author_id INT,  -- NULL para eventos automáticos do sistema
  type ENUM('user_post', 'rank_change', 'x1_result', 'exact_score') NOT NULL DEFAULT 'user_post',
  content TEXT NOT NULL,
  metadata JSON,  -- dados estruturados para eventos automáticos
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  comment_count INT DEFAULT 0,
  reaction_count INT DEFAULT 0,
  INDEX idx_pool_feed (pool_id, created_at DESC)
);

-- pool_post_comments
CREATE TABLE pool_post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_comments (post_id, created_at)
);

-- pool_post_reactions (opcional no MVP)
CREATE TABLE pool_post_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  emoji VARCHAR(10) NOT NULL DEFAULT '👍',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reaction (post_id, author_id, emoji)
);

-- pool_post_mentions
CREATE TABLE pool_post_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  comment_id INT,
  mentioned_user_id INT NOT NULL,
  notified_at TIMESTAMP NULL,
  INDEX idx_mentions_user (mentioned_user_id)
);
```

---

## Próximos Passos (Risk Advisor)

1. **Definir com Gerva** qual aba da barra inferior o Mural ocupa (nova aba ou dentro de outra?)
2. **Confirmar restrições por plano** (Free vs Pro) antes de codar
3. **Implementar feature flag** `pool_wall_enabled` antes do lançamento
4. **Política de moderação** documentada antes do lançamento público

---

*Documento gerado pela orquestração de 40 especialistas em 18/04/2026.*
