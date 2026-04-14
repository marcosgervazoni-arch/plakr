# Backlog: Indicadores de Monetização no Dashboard Admin

**Categoria:** Nova Feature / Monetização
**Prioridade:** Média
**Criado em:** Abril 2026
**Contexto:** Gerado durante a reestruturação visual do Dashboard Global Admin

---

## 1. Naming Rights — Valor Contratado por Patrocínio

**Ideia:** Adicionar campo `contractValueBrl` (int, centavos) na tabela `pool_sponsors` para registrar o valor negociado de cada contrato de naming rights. Com isso, o dashboard poderia exibir "Receita de Naming Rights: R$ X" além das métricas de engajamento (impressões, cliques, CTR).

**Por que não agora:** A estrutura de engajamento (impressões/cliques) já foi implementada no dashboard. O valor contratado depende de um processo comercial ainda não formalizado — não faz sentido ter o campo antes de ter contratos sendo fechados.

**Dependências:**
- Processo comercial de naming rights definido (precificação, contrato)
- Migration: adicionar `contractValueBrl int` e `contractStartDate / contractEndDate` em `pool_sponsors`
- UI no painel de patrocínio para o admin inserir o valor

**Impacto esperado:** Card "Receita B2B" no dashboard com valor total de contratos ativos e pipeline.

---

## 2. Adsterra — Receita via API Publisher

**Ideia:** Integrar a API REST do Adsterra (`https://api3.adsterratools.com/publisher/stats.json`) para exibir no dashboard a receita real de anúncios: valor a receber hoje, receita dos últimos 30 dias, impressões e CPM médio.

**Por que não agora:** Requer adicionar campo `adsterraApiKey` em `platformSettings` e UI para o admin inserir a chave no painel de Integrações. A API já está documentada e o endpoint é simples (GET com X-API-Key no header).

**Dependências:**
- Migration: adicionar `adsterraApiKey varchar(128)` em `platform_settings`
- UI em `/admin/integrations` para inserir e validar a chave
- Procedure `adminDashboard.getAdsterraStats` que consulta a API e cacheia por 1h (para não estourar rate limit)
- Card "Adsterra" no dashboard com: receita hoje, receita 30d, impressões 30d, CPM médio

**Dados disponíveis na API:** `date`, `impression`, `clicks`, `ctr`, `cpm`, `revenue` (USD)

**Esforço estimado:** ~2h após decisão de implementar.

**Nota:** A API retorna valores em USD. Exibir em USD mesmo, ou converter para BRL usando taxa do dia via API de câmbio (ex: AwesomeAPI).
