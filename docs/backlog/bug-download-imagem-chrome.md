# Bug: Download de imagem não funciona no Chrome (desktop e Android)

**Status:** Arquivado para resolver depois
**Data:** 2026-03-31

## Descrição
Ao clicar em "Baixar imagem" no modal de compartilhamento do GameCard, o arquivo não é salvo no dispositivo. O comportamento varia:
- Chrome desktop: abre nova aba com a imagem (fallback atual), mas o usuário precisa salvar manualmente com Ctrl+S
- Android/Xiaomi: nenhuma ação visível

## Causa raiz identificada
O Chrome bloqueia silenciosamente `link.click()` programático quando não é acionado diretamente por um evento de usuário (a cadeia "user gesture" é quebrada pelo `async/await` + `html2canvas`). O `FileSaver.js` sofre do mesmo problema pois usa a mesma técnica internamente.

## Tentativas já feitas
1. `link.click()` nativo — bloqueado pelo Chrome
2. `FileSaver.js` (`saveAs`) — mesmo problema interno
3. `File System Access API` (`showSaveFilePicker`) — deveria funcionar mas não está sendo acionado (possível problema de contexto seguro ou versão do Chrome)
4. `window.open(blobUrl, '_blank')` — abre nova aba, mas não baixa automaticamente

## Solução sugerida para implementar
- Opção A: Usar `html2canvas` de forma síncrona (sem `async/await`) para manter a user gesture chain — difícil pois html2canvas é inerentemente assíncrono
- Opção B: Pré-gerar a imagem no servidor (tRPC procedure que recebe os dados do card e retorna uma URL S3) — o download de URL externa funciona sem restrições
- Opção C: Mostrar a imagem num `<img>` dentro do modal e orientar o usuário a fazer long-press (Android) ou clique direito → Salvar (desktop)

## Recomendação
Implementar a **Opção B** (geração server-side via Puppeteer ou canvas-node + S3) como solução definitiva. É mais robusta, funciona em todos os dispositivos e permite compartilhamento direto de URL sem captura client-side.
