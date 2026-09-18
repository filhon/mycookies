# LEIA-ME · pacote de marca do Rende

Marca **Rende**, território **Ponto**. Entregue para cair no repositório do produto sem
retrabalho.

> **Origem.** Projeto "Rende" no Claude Design
> (`claude.ai/design/p/e3506bf8-591b-4c70-9f10-937ab520e0f5`), trazido em 2026-09-18 via
> `DesignSync`. Três diferenças em relação ao projeto: os SVGs vieram sem o bloco
> `<metadata>` de credenciais C2PA (~20 KB por arquivo, sem efeito visual); os PNGs foram
> rasterizados aqui a partir dos mesmos SVGs com o `sharp` do `node_modules`; e `support.js`
> (runtime do canvas) não foi copiado — as pranchas `.dc.html` abrem no navegador sem ele.

| Arquivo                      | O que é                                                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MARCA.md`                   | Estratégia (posicionamento, personalidade, manifesto, arquitetura), manual de marca (logotipo, cor, tipografia, assinatura, co-branding) e manual de comunicação (voz e tom, glossário, 20 microcopy, modelos).       |
| `DESIGN.md`                  | O design system na estrutura do documento atual: Visual Theme · Color Palette · Typography · Layout & Spacing · Components · Motion · Iconography · Signature, com tabela de contraste e checklist de acessibilidade. |
| `tokens.css`                 | Custom properties em OKLCH (hex comentado ao lado), nos dois temas, nomes em inglês curto. Pronto para `globals.css` / Tailwind v4. Escuro por `prefers-color-scheme` e por `[data-theme="dark"]`.                    |
| `logo/`                      | Logotipo (principal, negativa, mono positiva e negativa), símbolo, horizontal, empilhada, e ícones de app 512/192/180 + maskable, em SVG e PNG.                                                                       |
| `Rende — Identidade.dc.html` | Prancha de identidade: logotipo e usos, paleta aplicada, tipografia, assinatura visual, ícone na tela de início.                                                                                                      |
| `Rende — Telas.dc.html`      | As telas de exemplo do app com os dados reais do brief: celular 360×800 (as nove telas), desktop 1280 com barra lateral, e tema escuro.                                                                               |
| `Rende — Aplicações.dc.html` | Login, abertura, página inicial de venda (celular e desktop), Instagram, e-mail de boas-vindas, adesivo "feito com Rende" e a lâmina para a professora de confeitaria.                                                |
| `Marca — Fase 1.dc.html`     | O documento da fase 1: posicionamento, os oito nomes e os três territórios. Histórico da decisão.                                                                                                                     |

## Como usar

1. `tokens.css` vai para `app/globals.css` (ou `@theme` do Tailwind v4). Os nomes já são os
   que o código consome: `--brand-700`, `--canvas`, `--surface`, `--ink`, `--positive`.
2. `logo/icone-app-*.png` vão para o manifest do PWA; a `maskable` precisa do
   `"purpose": "maskable"`.
3. Fontes: Archivo e Figtree, Google Fonts. Figtree já está no projeto.
4. As telas em `.dc.html` usam exatamente os valores de `tokens.css` — abra lado a lado com
   a implementação para conferir.

## Ressalvas honestas

- **Nome:** disponibilidade de `rende.com.br`, do handle `@rende.app` e do registro no INPI
  **não foi verificada**. Verificar antes de qualquer peça impressa.
- **Logotipo em SVG:** o texto "rende" está como `<text>` em Archivo, não em curvas. Para uso
  fora da web (impressão, bordado, gravação), converta em curvas com o Archivo instalado.
- **Contraste:** as razões em `DESIGN.md` são medições aproximadas a partir dos hex de
  fallback. Recomputar no build a partir dos valores OKLCH.
- **PNG 2x das telas:** as telas foram entregues como HTML com os tokens (prova melhor de que
  os tokens funcionam). Se você quiser os PNGs, eu exporto na próxima rodada.
- **Âmbar e atenção compartilham matiz.** É o risco declarado do território: o semântico de
  atenção usa o mesmo âmbar, sempre com ícone `alert-triangle` e palavra, e nenhum outro
  amarelo entra no sistema.
