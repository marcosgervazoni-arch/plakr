# Backlog: Tela de Patrocínio para Organizador Pro Ilimitado

**Status:** Arquivado — atribuição exclusiva do Super Admin por decisão de 09/04/2026  
**Prioridade:** Baixa  
**Dependência:** Nenhuma técnica — decisão de produto

---

## Contexto

O módulo de naming rights foi implementado com dois níveis de permissão:
- **Super Admin:** acesso total, incluindo ativação, slug e liberação para organizador
- **Organizador Pro Ilimitado:** pode editar campos parciais SE `enabledForOrganizer = true`

Por decisão do Gerva (09/04/2026), o patrocínio permanece como atribuição exclusiva do Super Admin. O organizador, mesmo no plano Ilimitado, não tem acesso à configuração de patrocínio até nova decisão.

---

## O que seria implementado

- Rota `/pool/:slug/manage/sponsorship` no painel do organizador
- Tela com campos editáveis: nome do patrocinador, logo, mensagem de boas-vindas, banner (imagem + link), popup (título, texto, imagem, botão + link, frequência, delay)
- Campos bloqueados: slug customizado, toggle isActive, enabledForOrganizer
- Visível apenas se `enabledForOrganizer = true` no banco
- Backend já preparado: procedure `organizerUpsertSponsor` já existe em `pools-sponsor.ts`

---

## Quando revisar

Quando houver demanda de organizadores Pro Ilimitado querendo gerenciar seus próprios patrocinadores sem depender do Super Admin.
