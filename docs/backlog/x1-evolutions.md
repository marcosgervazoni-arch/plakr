# Backlog — Evoluções Futuras do X1

> Ideias capturadas durante a orquestração da feature "Vem pro X1" (2026-03-27).
> Categoria: Nova Feature / Gamificação / Engajamento

---

## [X1-EVO-001] X1 em grupo: 3v3 ou times dentro do bolão

**Contexto:** Após o X1 individual ser lançado e validado, a evolução natural é permitir que grupos de apostadores se desafiem coletivamente.

**Ideia:** Permitir a criação de X1s em formato de time — ex: "Time A (3 apostadores) vs Time B (3 apostadores)". A pontuação seria a soma dos pontos individuais de cada time.

**Por quê:** Cria dinâmicas de grupo dentro do bolão, aumenta o engajamento social e pode ser usado por famílias, grupos de amigos ou colegas de trabalho.

**Dependências:** X1 individual deve estar estável. Requer nova interface de seleção de times.

**Impacto:** Alto (engajamento). **Esforço:** Alto.

---

## [X1-EVO-002] X1 com aposta simbólica

**Contexto:** O X1 hoje é apenas por honra. Adicionar uma aposta simbólica (sem dinheiro real) aumentaria o engajamento emocional.

**Ideia:** Ao criar o X1, o desafiador pode propor uma "aposta simbólica" — ex: "perdedor muda o avatar por 7 dias", "perdedor posta mensagem de parabéns no grupo", "perdedor muda o nome de exibição por 3 dias". Ambos precisam aceitar os termos.

**Por quê:** Viralidade alta — as apostas simbólicas seriam compartilhadas no grupo do bolão, gerando buzz orgânico. Baixo esforço técnico (apenas texto livre + confirmação).

**Dependências:** X1 individual estável. Nenhuma dependência técnica complexa.

**Impacto:** Alto (viralidade). **Esforço:** Baixo.

---

## [X1-EVO-003] Torneio de X1: bracket eliminatório

**Contexto:** Para bolões com muitos participantes, um torneio de X1 seria uma feature premium de alto valor.

**Ideia:** O organizador do bolão pode criar um "Torneio X1" — um bracket eliminatório com todos os participantes que quiserem entrar. Os X1s são disputados em paralelo ao bolão principal, com o vencedor do bracket recebendo um badge especial.

**Por quê:** Feature premium exclusiva para planos Pro/Ilimitado. Cria uma camada adicional de competição e engajamento que dura todo o campeonato.

**Dependências:** X1 individual estável. Requer lógica de bracket e interface de torneio.

**Impacto:** Alto (retenção Pro). **Esforço:** Alto.

---

## [X1-EVO-004] X1 cross-bolão

**Contexto:** Dois apostadores que participam de bolões diferentes mas com jogos em comum poderiam se desafiar.

**Ideia:** Permitir X1s entre apostadores de bolões diferentes, usando apenas os jogos que ambos os bolões têm em comum (mesmo campeonato).

**Por quê:** Amplia o alcance social da feature para além do bolão individual.

**Dependências:** Requer lógica complexa de intersecção de jogos entre bolões. Alta complexidade técnica.

**Impacto:** Médio (alcance). **Esforço:** Muito alto.

---

## [X1-EVO-005] Ranking global de X1s

**Contexto:** Um ranking global de quem tem mais vitórias em X1 na plataforma seria um incentivo de longo prazo.

**Ideia:** Página pública `/ranking/x1` com os apostadores com mais vitórias em X1 na plataforma toda, com filtros por período (mês, temporada, carreira).

**Por quê:** Fácil de implementar (query simples em `x1_challenges`). Alto engajamento — apostadores competitivos vão querer aparecer no ranking global.

**Dependências:** X1 individual com dados suficientes (pelo menos 1 mês de uso).

**Impacto:** Alto (engajamento competitivo). **Esforço:** Baixo.
