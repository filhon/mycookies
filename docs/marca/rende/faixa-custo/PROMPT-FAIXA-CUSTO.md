# Prompt para o Claude Code — faixa animada de custo

Copie tudo abaixo da linha e cole no Claude Code, dentro do repositório da landing. Antes, coloque o arquivo `faixa-custo.js` na raiz do repositório (ou diga ao Claude onde ele está).

---

Quero substituir a foto estática da landing (a faixa larga logo abaixo do hero, com o cookie no saquinho) por uma animação. A implementação de referência está em `faixa-custo.js`: um web component `<rende-faixa-custo>` sem dependências.

## O que a animação faz
Uma barra horizontal vai se montando com os custos de um cookie recheado: Materiais R$ 3,12, Embalagem R$ 0,45, Seu trabalho R$ 0,56, Energia e gás R$ 0,18 e Fatia das despesas fixas R$ 0,10. O contador sobe até o custo de R$ 4,41. Depois a barra se completa até o preço de R$ 8,50 (maquininha R$ 0,43) e a sobra de R$ 3,66 aparece em rosa. Fundo navy #14215C, fonte Figtree.

## Etapas (um commit por etapa, me mostre o plano antes de começar)

1. **Levantamento.** Descubra o stack da landing (HTML puro, React, Next, Astro, Vue…), onde está a foto e como ela é carregada. Não altere nada ainda. Me diga o que encontrou e como pretende integrar.

2. **Integração.**
   - Se o stack aceita web components sem atrito, use `faixa-custo.js` como está: importe uma vez e coloque `<rende-faixa-custo></rende-faixa-custo>` no lugar da foto.
   - Se o projeto é React/Next/Vue e o padrão do repo é componente nativo, porte para um componente do framework mantendo exatamente os mesmos dados, cores, tempos, textos e comportamento. Não adicione bibliotecas de animação.
   - Em Next/SSR: o componente só roda no cliente. Renderize no servidor o estado final (barra completa, R$ 8,50, "Sobram R$ 3,66 pra você"), para que a faixa nunca apareça vazia e não haja salto de layout.
   - Use a fonte Figtree que o site já carrega. Não adicione outro `<link>` de fonte.

3. **Limpeza.** Remova a foto antiga e as variantes/srcset dela se não forem usadas em outro lugar. Liste o que vai remover antes.

4. **Verificação.**
   - Celular (390px) e computador (1280px+): sem estouro horizontal, textos sem cortes, legenda em grade que quebra linha.
   - A animação só começa quando a faixa entra na tela e pausa quando sai.
   - Com `prefers-reduced-motion: reduce`, mostra direto o estado final, sem movimento.
   - Lighthouse mobile: a faixa não pode virar o LCP e o CLS precisa continuar ~0. O JS da faixa deve ficar abaixo de 5 KB comprimido.
   - Leitor de tela: a faixa tem `role="img"` e um `aria-label` com o resumo dos números.

## Regras
- Não mude textos, cores ou espaçamentos do resto da página.
- Não mexa em lógica de negócio, rotas ou formulários.
- Os números são do exemplo do hero. Se o hero mudar de exemplo, os dois precisam continuar batendo.

## Opcional — abertura em tela cheia (só se eu pedir depois)
O mesmo componente tem `mode="intro"`: ocupa a tela toda, roda em ~5 s, tem botão "Pular" (e Esc), aparece uma vez por sessão e some sozinho com fade. Com movimento reduzido, não aparece. A página carrega normalmente por baixo. Se eu pedir a abertura, coloque `<rende-faixa-custo mode="intro"></rende-faixa-custo>` como primeiro filho do `<body>`, sem remover a faixa da posição da foto, e meça de novo o Lighthouse antes e depois.
