# [BACKLOG] Editor de Prompt de IA via Super Admin

**Categoria:** Nova Feature — Configuração / Autonomia Operacional  
**Prioridade:** Média  
**Origem:** Solicitação do Gerva em 07/04/2026  
**Status:** Icebox — aguardando priorização

---

## Contexto

Durante a correção das expressões temporais incorretas nos textos de análise pré-jogo (81 jogos regenerados), surgiu a necessidade de ajustar o prompt do LLM diretamente pela interface, sem depender de código.

Hoje o prompt está hardcoded em `server/services/ai/buildAiPrediction.ts`. Qualquer ajuste de tom, restrição de palavras ou estrutura da análise exige deploy.

---

## Proposta

Criar uma tela na área de **Super Admin → Configurações de IA** onde o prompt do LLM possa ser editado, salvo e testado diretamente pela interface.

---

## Funcionalidades Planejadas

| Funcionalidade | Descrição |
|---|---|
| Editor do prompt do sistema | Campo de texto para editar a "personalidade" do narrador |
| Editor do prompt do usuário | Campo para editar a estrutura da análise pré-jogo |
| Lista de restrições | Palavras/expressões proibidas (ex: "hoje", "amanhã", "aposta") |
| Tamanho máximo | Configurável (padrão: 400 caracteres) |
| Botão "Testar prompt" | Gera uma análise de exemplo na hora com dados reais de um jogo |
| Histórico de versões | Registro das últimas N versões do prompt com data e autor |

---

## Impacto Esperado

- **Autonomia operacional:** Gerva pode ajustar tom e estilo sem depender de desenvolvimento.
- **Experimentação rápida:** Testar prompts diferentes para Copa do Mundo vs. Brasileirão.
- **Rastreabilidade:** Histórico de versões evita regressões acidentais.

---

## Dependências Técnicas

- Criar tabela `ai_prompt_config` no banco (id, promptSystem, promptUser, maxLength, bannedTerms, createdAt, updatedAt).
- `buildAiPrediction.ts` passa a buscar o prompt ativo do banco em vez de usar constante.
- Tela de admin em `/admin/ia-config` com editor + botão de teste.
- Cache simples (TTL 5 min) para não bater no banco a cada geração.

---

## Notas Adicionais

- Considerar separar prompts por tipo de competição (ex: Copa do Mundo vs. Série A) em uma segunda fase.
- O botão "Testar prompt" deve usar um jogo real agendado como exemplo, mostrando o resultado antes de salvar.
