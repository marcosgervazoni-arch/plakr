# Mural do Bolão — Planejamento v1 MVP
**Data:** 18/04/2026 | **Status:** ✅ Aprovado para desenvolvimento

---

## Visão Geral

O Mural é um feed social exclusivo de cada bolão. Combina eventos automáticos gerados pelo sistema com posts livres dos participantes, comentários e menções. Acesso liberado para todos os planos no lançamento.

---

## Decisão 1 — Eventos Automáticos

### MVP (entram no v1)

| Evento | Tipo | Gatilho | Exemplo de texto |
|---|---|---|---|
| **Mudança de posição no ranking** | `rank_change` | Após apuração de resultado | "🏆 João subiu para 1º lugar!" |
| **Resultado de duelo X1** | `x1_result` | Ao encerrar um X1 | "⚔️ Maria venceu Pedro no Duelo da Rodada 3 por 12 pts" |
| **Placar exato acertado** | `exact_score` | Após apuração | "🎯 Carlos acertou 2×1 em Brasil × Argentina!" |
| **Jogo encerrado** | `match_result` | Ao registrar resultado do jogo | "⚽ Brasil 2 × 1 Argentina — Rodada 3 encerrada" |
| **Novo membro entrou** | `new_member` | Ao aceitar convite/entrar no bolão | "👋 Ana entrou no bolão!" |
| **Bolão encerrado / campeão definido** | `pool_ended` | Ao encerrar o bolão | "🏅 Bolão encerrado! Campeão: João com 187 pts" |
| **Badge/conquista desbloqueada** | `badge_unlocked` | Ao conceder badge | "🥇 Pedro desbloqueou o badge 'Profeta'" |
| **Zebra confirmada** | `zebra_result` | Após apuração quando azarão venceu e alguém apostou nisso | "🦓 Ana apostou na zebra e acertou! Azarão venceu em Japão × Alemanha" |
| **Goleada confirmada** | `thrashing_result` | Após apuração quando houve goleada e alguém apostou nisso | "🔥 Carlos acertou a goleada! Brasil 4×0 Honduras" |

**Votos:** 40/40 especialistas recomendam os 7 eventos originais no MVP. Zebra e goleada adicionados por decisão do produto (18/04/2026).

### v2 (próxima iteração)

| Evento | Motivo do adiamento |
|---|---|
| Marco de participantes (10, 25, 50...) | Baixo impacto em bolões pequenos; pode gerar spam em bolões grandes |
| Palpite mais popular da rodada | Requer query adicional de agregação; melhor após validar performance |
| Empate técnico no ranking | Evento frequente demais — pode poluir o feed |
| Novo desafio X1 criado (convite público) | Risco de spam; melhor avaliar com dados reais de uso |

### Não entrar (por enquanto)
- Eventos de sistema internos (erros, manutenção)
- Alterações de configuração do bolão pelo organizador

### Sugestões adicionais dos especialistas (para backlog)
- **"Sequência de acertos"** — participante acertou resultado em 3 jogos seguidos (Head of Product, UX)
- **"Primeiro palpite da rodada"** — quem apostou primeiro em uma rodada (Growth, Innovation)
- **"Virada do jogo"** — quando o placar muda após o intervalo e alguém tinha apostado no resultado correto (Game Designer)
- **"Zebra confirmada"** — quando o azarão vence e alguém tinha apostado nisso (Content Marketing)

---

## Decisão 2 — Acesso Livre para Todos os Planos

**Veredicto: 38/40 favoráveis, 2 neutros, 0 contrários.**

A decisão de liberar o Mural para todos os planos no lançamento foi aprovada pela equipe. Os argumentos principais:

**A favor:**
- Dados reais de uso são essenciais para definir o que monetizar depois — lançar restrito impede a coleta dessas métricas
- O Mural aumenta o valor percebido da plataforma para todos os usuários, reduzindo churn no plano Free
- Usuários Free que se engajam no Mural têm maior probabilidade de converter para Pro
- Diferencial competitivo: nenhum concorrente tem isso — lançar aberto maximiza o boca a boca

**Estratégia de monetização futura (após coleta de dados):**
- Eventos automáticos avançados (badge, zebra, sequência) → Pro
- Histórico do mural além de 30 dias → Pro
- Mural sem anúncios → Pro (já implementado pela lógica de ads)
- Organizador pode fixar posts no topo → Pro/Business

**KPIs a monitorar desde o lançamento:**
- Posts por bolão por semana
- Comentários por post
- Taxa de abertura de notificações de menção
- Tempo de sessão antes/depois do Mural
- Correlação entre uso do Mural e retenção no bolão

---

## Decisão 3 — Anúncios Adsterra no Feed

**Frequência aprovada: a cada 8 posts** (24/40 votos). Alternativa conservadora: a cada 10 posts (13/40 votos).

### Regras de exibição

| Condição | Comportamento |
|---|---|
| Usuário Free | Anúncio a cada 8 posts no feed |
| Usuário Pro | Sem anúncios |
| Usuário Business | Sem anúncios |
| Feed com menos de 8 posts | Sem anúncio |
| Primeiro acesso ao Mural | Sem anúncio nos primeiros 8 posts (não mostrar anúncio imediatamente) |

### Formato recomendado
- **Banner nativo** (mesmo estilo visual dos posts) — menos intrusivo que banner display
- Largura: 100% do feed (igual aos posts)
- Altura: máximo 120px (não bloquear o scroll)
- Label visível: "Publicidade" (obrigatório por LGPD/CONAR)
- Sem autoplay de vídeo ou som

### Riscos identificados
- **UX:** anúncios muito frequentes reduzem o engajamento no feed — monitorar taxa de scroll-past
- **Performance:** scripts de anúncios externos podem impactar o Core Web Vitals — carregar de forma lazy
- **Bloqueadores:** ~30% dos usuários mobile usam ad blockers — o feed deve funcionar normalmente sem os anúncios

### Implementação técnica
- Componente `<FeedAd />` inserido no array de posts no frontend (posição calculada: `index % 8 === 7`)
- Não armazenar posição do anúncio no banco — calculado dinamicamente no frontend
- Mesmo padrão já usado nas páginas de Jogos e outras listas longas

---

## Schema Final (CTO aprovado)

```sql
-- pool_posts
CREATE TABLE pool_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pool_id INT NOT NULL,
  author_id INT NULL,           -- NULL para eventos automáticos do sistema
  type ENUM(
    'user_post',
    'rank_change',
    'x1_result',
    'exact_score',
    'match_result',
    'new_member',
    'pool_ended',
    'badge_unlocked',
    'zebra_result',
    'thrashing_result'
  ) NOT NULL DEFAULT 'user_post',
  content TEXT NOT NULL,
  metadata JSON NULL,           -- dados estruturados para eventos automáticos
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  comment_count INT DEFAULT 0,
  reaction_count INT DEFAULT 0,
  INDEX idx_pool_feed (pool_id, created_at DESC),
  INDEX idx_pool_type (pool_id, type),
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- pool_post_comments
CREATE TABLE pool_post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_comments (post_id, created_at),
  FOREIGN KEY (post_id) REFERENCES pool_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- pool_post_reactions
CREATE TABLE pool_post_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  emoji VARCHAR(10) NOT NULL DEFAULT '👍',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reaction (post_id, author_id, emoji),
  FOREIGN KEY (post_id) REFERENCES pool_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- pool_post_mentions
CREATE TABLE pool_post_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NULL,
  comment_id INT NULL,
  mentioned_user_id INT NOT NULL,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mentions_user (mentioned_user_id),
  FOREIGN KEY (post_id) REFERENCES pool_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES pool_post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Escopo do v1 MVP — Checklist de Desenvolvimento

### Backend
- [ ] Migração: criar as 4 tabelas acima
- [ ] `server/routers/wall.ts` — procedures:
  - `getFeed(poolId, cursor?)` — lista posts paginados (20/página, cursor-based)
  - `createPost(poolId, content)` — cria post de texto livre
  - `deletePost(postId)` — organizador ou autor podem deletar
  - `createComment(postId, content)` — adiciona comentário
  - `deleteComment(commentId)` — organizador ou autor podem deletar
  - `toggleReaction(postId, emoji)` — adiciona/remove reação
  - `getMentionSuggestions(poolId, query)` — autocomplete de @menções
- [ ] `server/db.ts` — helpers: `createWallEvent(poolId, type, content, metadata)`
- [ ] Integrar `createWallEvent` nos gatilhos existentes:
  - Apuração de resultado → `rank_change`, `exact_score`, `match_result`, `zebra_result`, `thrashing_result`
  - Encerramento de X1 → `x1_result`
  - Entrada de novo membro → `new_member`
  - Encerramento do bolão → `pool_ended`
  - Concessão de badge → `badge_unlocked`
- [ ] Rate limiting: 10 posts/hora por usuário por bolão
- [ ] Sanitização de conteúdo (strip HTML tags)
- [ ] Processar menções: extrair @nomes do conteúdo e inserir em `pool_post_mentions`
- [ ] Notificação ao mencionado via sistema existente

### Frontend
- [ ] Aba "Mural" na barra de navegação do bolão (definir qual aba substitui ou se é nova)
- [ ] `client/src/pages/PoolWall.tsx` — tela principal do Mural
- [ ] Componente `<WallPost />` — card de post (user_post e eventos automáticos com visual diferenciado)
- [ ] Componente `<WallEventCard />` — card visual especial para eventos automáticos (ícone + cor de destaque)
- [ ] Componente `<WallComments />` — seção de comentários expansível
- [ ] Componente `<WallComposer />` — caixa de texto com autocomplete de @menções
- [ ] Componente `<FeedAd />` — anúncio Adsterra inserido a cada 8 posts (apenas usuários Free)
- [ ] Estado vazio: "Seja o primeiro a postar no mural!" com CTA
- [ ] Scroll infinito (cursor-based pagination)

### Configurabilidade (Admin)
- [ ] Feature flag `pool_wall_enabled` no Admin → Configurações
- [ ] Configuração: rate limit de posts/hora (padrão: 10)
- [ ] Configuração: quais tipos de evento automático estão ativos
- [ ] Organizador pode desativar o mural do seu bolão em Gerenciar → Configurações

---

## Navegação — Decisão Pendente

**✅ DECISÃO TOMADA (18/04/2026):** substituir "Membros" por "Mural" na barra inferior.

Barra final: Regras | **Mural** | [Palpites FAB] | Duelos | Ranking

A lista de membros migra para dentro do Ranking (sub-aba ou seção inferior).

---

## Próximos Passos

1. **Gerva define a navegação** — qual aba o Mural substitui ou se é nova
2. **Implementação** — backend primeiro (schema + procedures), depois frontend
3. **Feature flag ativo** — lançar para 100% dos usuários desde o início (acesso livre aprovado)
4. **KPIs configurados** no GA4 antes do lançamento: `wall_post_created`, `wall_comment_created`, `wall_mention_sent`, `wall_ad_impression`

---

*Planejamento gerado pela orquestração de 40 especialistas em 18/04/2026.*
