/**
 * Mural do Bolão — Templates de Mensagens Automáticas
 * Tom: estilo CazeTV — comentarista humorado, animado, como se o Casimiro
 * estivesse comentando ao vivo o bolão dos amigos.
 * Máx. 140 caracteres por mensagem. Seleção aleatória entre as variações.
 *
 * Aprovado pelos 40 especialistas em 18/04/2026.
 */

import type { MuralPostType } from "../drizzle/schema";

export const MURAL_TEMPLATES: Record<MuralPostType, string[]> = {
  // ── Posts manuais não têm template automático ──
  manual: [],

  // ── 1. Assumiu o 1º lugar (com zoação do anterior líder) ──
  rank_change_first: [
    "👑 SIMPLESMENTE {nome} assumiu a liderança com {pontos} pts! {nome_anterior_lider} pode chorar! 😂",
    "MANO! {nome} tomou o 1º lugar de {nome_anterior_lider}! Que cena! {pontos} pontos e a coroa na cabeça! 👑",
    "TÁ DE BRINCADEIRA! {nome} desbancou {nome_anterior_lider} e assumiu a liderança! {pontos} pts! ABSURDO! 🔥",
  ],

  // ── 2. Subiu para 2º ou 3º lugar ──
  rank_change_top3: [
    "🔥 QUE ISSO! {nome} subiu para o {posicao_nova}º lugar com {pontos} pts! Tá chegando lá!",
    "⬆️ MANO! {nome} avançou para o {posicao_nova}º lugar! {pontos} pontos! Cuidado aí, galera!",
    "🚀 {nome} no top {posicao_nova}! {pontos} pts! Não acredito como esse cara tá voando!",
  ],

  // ── 3. Subiu várias posições (3+) ──
  rank_change_up: [
    "🚀 QUE SALTO! {nome} foi do {posicao_anterior}º para o {posicao_nova}º lugar! Que isso, mano!",
    "⚡ ABSURDO! {nome} voou no ranking: {posicao_anterior}º → {posicao_nova}º! Que virada!",
    "😱 Não acredito! {nome} pulou do {posicao_anterior}º para o {posicao_nova}º lugar! Lendário!",
  ],

  // ── 4. Venceu duelo X1 ──
  x1_result_win: [
    "⚔️ MANO! {vencedor} destruiu {perdedor} no duelo da {escopo}! {pontos_vencedor} × {pontos_perdedor} pts! Sem piedade!",
    "🏆 QUE ISSO! {vencedor} venceu o X1 contra {perdedor} na {escopo}! {pontos_vencedor} a {pontos_perdedor}! Brabo demais!",
    "💥 ABSURDO! {vencedor} dominou {perdedor} por {pontos_vencedor} a {pontos_perdedor} pts na {escopo}! Que monstro!",
  ],

  // ── 5. Empate no duelo X1 ──
  x1_result_draw: [
    "🤝 QUE CENA! {vencedor} e {perdedor} empataram no duelo da {escopo}! Ninguém levou, ninguém perdeu!",
    "😅 MANO! Empate técnico! {vencedor} e {perdedor} terminaram igual na {escopo}! Inacreditável!",
    "🤯 Tá de brincadeira! {vencedor} e {perdedor} empataram o X1 da {escopo}! Que equilíbrio absurdo!",
  ],

  // ── 6. Acertou placar exato (1 pessoa) ──
  exact_score_single: [
    "🎯 MANO! {nome} cravou o placar exato! {time_casa} {placar} {time_fora}! Isso não é palpite, é VISÃO!",
    "😱 QUE ISSO! {nome} acertou {time_casa} {placar} {time_fora} exatamente! Não é sorte, é dom!",
    "🔮 ABSURDO! {nome} previu o placar certinho: {time_casa} {placar} {time_fora}! Que profeta, mano!",
  ],

  // ── 7. Vários acertaram o mesmo placar ──
  exact_score_multi: [
    "🎯 QUE ISSO! Vários profetas hoje! {nomes_lista} cravaram {time_casa} {placar} {time_fora}! ABSURDO!",
    "😱 MANO! {nomes_lista} acertaram o placar exato de {time_casa} {placar} {time_fora}! Que galera braba!",
    "🔮 Não acredito! {nomes_lista} previram certinho: {time_casa} {placar} {time_fora}! Que cena!",
  ],

  // ── 8. Jogo encerrado (só com ≥1 acerto) ──
  match_result: [
    "⚽ Apurado! {time_casa} {gols_casa} × {gols_fora} {time_fora} — {rodada} encerrada!",
    "🔔 FIM DE JOGO! {time_casa} {gols_casa} × {gols_fora} {time_fora} na {rodada}. Bora ver quem acertou!",
    "📊 {rodada} encerrada! {time_casa} {gols_casa} × {gols_fora} {time_fora}. Quem foi o profeta?",
  ],

  // ── 9. Novo membro entrou no bolão ──
  new_member: [
    "👋 QUE ISSO! {nome} entrou no bolão! Bem-vindo(a) ao time — agora somos {total_membros}! Bora!",
    "🎉 MANO! {nome} chegou pra agitar! Somos {total_membros} no bolão agora! Bem-vindo(a)!",
    "🔥 {nome} entrou na disputa! {total_membros} participantes e a concorrência só aumenta! Bora, {nome}!",
  ],

  // ── 10. Bolão encerrado / campeão definido ──
  pool_ended: [
    "👑 É CAMPEÃO! {nome_campeao} venceu o bolão {nome_bolao} com {pontos_campeao} pts entre {total_participantes} participantes! ABSURDO!",
    "🏆 QUE ISSO! FIM DE BOLÃO! {nome_campeao} é o grande vencedor de {nome_bolao} com {pontos_campeao} pts! Que jornada, mano!",
    "🎊 SIMPLESMENTE {nome_campeao} CAMPEÃO do {nome_bolao}! {pontos_campeao} pontos! {total_participantes} participantes e ele levou tudo! Lendário!",
  ],

  // ── 11. Badge/conquista desbloqueada ──
  badge_unlocked: [
    "🏅 QUE ISSO! {nome} desbloqueou a conquista \"{nome_badge}\"! {descricao_badge}! Brabo demais!",
    "✨ MANO! {nome} conquistou a badge \"{nome_badge}\"! {descricao_badge}! Não acredito! Lendário!",
    "🌟 ABSURDO! {nome} pegou a badge \"{nome_badge}\"! {descricao_badge}! Que monstro!",
  ],

  // ── 12. Zebra confirmada (azarão venceu e alguém apostou nisso) ──
  zebra_result: [
    "🦓 ZEBRA NA ÁREA! MANO! {nome} previu o impossível: {time_azarao} {placar} {time_favorito} na {rodada}! QUE ISSO!",
    "😱 TÁ DE BRINCADEIRA! {nome} cravou a zebra! {time_azarao} derrubou {time_favorito} por {placar} na {rodada}! ABSURDO!",
    "🤯 NÃO ACREDITO! {nome} é vidente! {time_azarao} venceu {time_favorito} por {placar} na {rodada}! Que cena lendária!",
  ],

  // ── 13. Goleada confirmada (e alguém apostou nisso) ──
  thrashing_result: [
    "🔥 GOLEADA! MANO! {nome} previu o massacre: {time_vencedor} fez {placar} no {time_perdedor} na {rodada}! QUE ISSO!",
    "💥 ABSURDO! {nome} acertou a goleada de {time_vencedor} {placar} {time_perdedor} na {rodada}! Sem piedade, mano!",
    "🤯 QUE ATROPELO! {nome} cravou: {time_vencedor} {placar} {time_perdedor} na {rodada}! Que visão absurda!",
  ],
};

/**
 * Renderiza um template de evento automático substituindo as variáveis.
 * Seleciona aleatoriamente entre as variações disponíveis.
 *
 * @param type - Tipo do evento (chave do MURAL_TEMPLATES)
 * @param vars - Mapa de variáveis para substituição (ex: { nome: "João" })
 * @returns Texto renderizado ou string vazia se o tipo não existir
 */
export function renderTemplate(
  type: MuralPostType,
  vars: Record<string, string>
): string {
  const variants = MURAL_TEMPLATES[type];
  if (!variants?.length) return "";
  const template = variants[Math.floor(Math.random() * variants.length)];
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/**
 * Versão determinística do renderTemplate para testes — usa índice fixo.
 */
export function renderTemplateAt(
  type: MuralPostType,
  vars: Record<string, string>,
  index = 0
): string {
  const variants = MURAL_TEMPLATES[type];
  if (!variants?.length) return "";
  const template = variants[index % variants.length];
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
