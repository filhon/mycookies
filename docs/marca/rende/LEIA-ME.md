# LEIA-ME · pacote de marca do Rende

Marca **Rende**, território **Porções** (cobalto, rosa e papel; o corte de 8°). Trazido em
2026-10-14 e aplicado no mesmo dia (`DECISOES.md#d381`). O território anterior, **Ponto**,
está inteiro em `_arquivo-ponto/`, com as pranchas `.dc.html` dele.

| Arquivo                 | O que é                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `MARCA.md`              | Estratégia, manual de marca (§ 2.1 a 2.4) e manual de comunicação.      |
| `DESIGN.md`             | O design system do pacote. O do código é o `DESIGN.md` da raiz.         |
| `tokens.css`            | Custom properties em OKLCH, nos dois temas.                             |
| `logo/`                 | Logotipo, símbolo e ícones de app, em curvas. `_geometria.json` regera. |
| `PROMPT-CLAUDE-CODE.md` | O pedido da troca de identidade, como foi feito.                        |

## Como está no código

- **Tokens:** `src/app/globals.css` com os nomes e valores de `tokens.css`, mais os do código
  (`--on-brand-muted`, `--focus`, o `--brand-100` escuro, `--luz-da-janela`, `--loja`).
- **Logo:** `src/components/marca/Marca.tsx`, SVG inline com `currentColor`. A porção rosa é o
  `Porcao` do mesmo arquivo. Os arquivos do pacote, sem o bloco C2PA, em `public/marca/`.
- **Ícones:** o 512, o 192 e o 180 são regerados sem o `rx` por `scripts/gerar-icones.mjs`
  (`#d44`); o maskable 512 e o favicon de 48 são os do pacote.
- **Fontes:** Familjen Grotesk 700 por `next/font`; na imagem de prévia, o TTF estático em
  `src/app/previa/`.
- **O que não entrou:** a faixa de composição sobre o preço praticado, com maquininha e sobra
  (spec própria), a escala de texto 15/13 e o raio de cartão de 12px. Motivos no `#d381`.
