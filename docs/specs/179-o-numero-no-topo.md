# Spec 179 · O número no topo

**Tipo:** as quatro páginas de doce ganham, logo depois da resposta, a `FaixaDoCusto` da
`/conheca` com o exemplo daquele doce: o custo se montando parcela a parcela até o preço, e a sobra
em rosa. A faixa aprende a falar de cento, quilo e pote.
Nenhum campo, nenhuma regra, nenhuma dependência. Nenhuma aritmética nova.
**Tamanho:** uma sessão.
**Origem:** a crítica das quatro páginas de doce de 2026-10-15 (`/impeccable`, registro brand).

- **A resposta é um parágrafo.** O número que ela veio buscar ("sai a R$ 176,50") está no meio da
  quarta linha, em peso de corpo, entre outros três valores. As páginas de ferramenta que vendem
  assinatura (NerdWallet, a calculadora de tarifas da Stripe) mostram a resposta como número
  grande, decomposto num desenho, antes de explicar.
- **As quatro páginas são a mesma página.** Mesmo cabeçalho, mesmo cartão, mesmos cinco passos,
  mesmo ritmo: trocando o título, ninguém diz qual é qual. É o risco de "página-porta" que a 068
  já nomeou, agora no visual. E o que cada doce tem de diferente é justamente a proporção do custo:
  no brigadeiro a hora de enrolar pesa quase o mesmo que a receita, no bolo de pote a embalagem
  passa do forno e das fixas juntos. A página descreve isso em palavras; a faixa mostra.
- **Nenhuma assinatura da marca aparece antes da dobra.** O território Porções (o corte, a faixa,
  a sobra em rosa) está na `/conheca` e no app; nas páginas que trazem gente da busca, o primeiro
  quadro é texto sobre papel. O `DESIGN.md` libera movimento de ambiente nas páginas do site.

**Depende de:** 068, a `FaixaDoCusto` (`#d382`, `#d384`).
**Sai junto com:** a 178.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Decisões a registrar:** uma, numerada na sessão (a faixa nas páginas de doce).

---

## 1 · O que esta spec decide

### A faixa fala a unidade do doce

Os textos fixos da `FaixaDoCusto` viram props **com o valor de hoje como padrão**, para o HTML da
`/conheca` sair igual:

| Hoje (cookie)                         | Prop       | Brigadeiro                                                  | Bolo (2 kg)                  | Bolo de pote            |
| ------------------------------------- | ---------- | ----------------------------------------------------------- | ---------------------------- | ----------------------- |
| "Quanto custa um cookie?"             | `pergunta` | "Quanto custa um cento?"                                    | "Quanto custa o quilo?"      | "Quanto custa um pote?" |
| "por unidade" (custo, preço, rótulos) | `unidade`  | "cento"                                                     | "quilo"                      | "pote"                  |
| "Por cookie, depois da maquininha"    | `porDoce`  | "Por cento, depois da maquininha"                           | "Por quilo, no bolo de 2 kg" | "Por pote, no balcão"   |
| `aria-label` "O custo de um cookie…"  | (derivado) | de `pergunta`, `unidade` e os números, sem texto novo à mão |                              |                         |

A sessão confere a redação com a `humanizer`. Os números chegam prontos da página, como na
`/conheca`: `composicaoDoLote(exemplo.custo)` por unidade de venda, `calcularPrecoSugerido`,
`verificarPreco`. A faixa continua sem fazer conta.

`TEMPOS` presume cinco parcelas; os quatro exemplos têm cinco. O teste que já prende isso para o
`EXEMPLO` passa a prender os quatro.

### Onde ela entra

Depois do `CabecalhoDoArtigo` e antes da grade, sangrando de borda a borda como na `/conheca`. O
`<article>` perde a classe de contêiner; o cabeçalho e a grade levam o contêiner deles, e a faixa
fica entre os dois, fora do recuo.

- **Celular:** resposta → faixa → (178) calculadora → passos.
- **Desktop:** resposta → faixa → grade com os passos e a calculadora presa.
- **A página do cookie:** a faixa entra igual. A `ContaAberta` presa continua no desktop, ao lado
  dos passos que ela ilustra, e **sai do celular** (`hidden lg:block`), onde ficaria logo embaixo
  da faixa com os mesmos números.

### Movimento

O da `FaixaDoCusto`, sem mudar: quadro final no servidor e com movimento reduzido, laço só com a
faixa na tela e a aba à vista. O texto da resposta chega pronto e nada atrasa o LCP: a faixa vem
depois dele.

---

## 2 · Antes de tocar em código

1. Ler `FaixaDoCusto.tsx` inteira, `#d382` e `#d384`, e como `/conheca` monta as props.
2. `/impeccable` com registro **brand**; `PRODUCT.md` e `DESIGN.md`.
3. Gerar o HTML de `/conheca` antes, para comparar depois.

---

## 3 · Escopo

- `FaixaDoCusto.tsx`: `pergunta`, `unidade` e `porDoce`, com o padrão de hoje.
- As quatro `page.tsx`: a faixa, a reestruturação do contêiner do `<article>`; na do cookie, o
  `hidden lg:block` da `ContaAberta`.
- `tests/domain/exemplo.test.ts`: os quatro exemplos com cinco parcelas, e a sobra e o preço que
  cada faixa mostra iguais aos do topo da página.
- `/conheca`: nenhuma mudança de HTML.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px, 1280px e 1864px, nos dois temas.

1. Cada página mostra a faixa do seu doce, com a proporção que os passos descrevem: no brigadeiro o
   segmento "Seu trabalho" quase do tamanho de "Ingredientes"; no bolo de pote, "Embalagem" maior
   que gás e fixas somados.
2. O preço e a sobra da faixa são os do parágrafo de cima.
3. Movimento reduzido: o quadro final, parado, sem nada escondido.
4. `/conheca` igual ao HTML de antes.
5. Cookie no celular: sem a `ContaAberta` embaixo da faixa; no desktop, ela continua presa.
6. Nenhuma rolagem lateral a 390px; o rótulo "Maquininha 5%" e "Sobra pra você" não se sobrepõem
   no bolo de pote, onde a sobra é estreita.
7. Lighthouse no celular: LCP no texto da resposta, não na faixa; acessibilidade 100.

---

## Critérios de aceite

- [ ] Quatro páginas com a faixa do seu doce, números das funções, presos no teste.
- [ ] `/conheca` com o HTML de antes.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [ ] Decisão registrada; `ESTADO.md` atualizado; `DESIGN.md` § Signature: a exceção da faixa larga
      deixa de ser só da `/conheca`.

---

## Decisões fáceis de rejeitar

- **Duas sobras em rosa na página** (a da faixa e a porção da calculadora). A `/conheca` já tem as
  duas, uma depois da outra (`#d382`). Na tela, não se veem juntas: a faixa ocupa a largura e a
  calculadora começa depois.
- **A faixa e não uma foto.** O `DESIGN.md` pede imagem em página de comida; a `/conheca` trocou a
  foto da bancada pela faixa (`#d382`) porque a foto era genérica e a faixa é o dado. Uma foto de
  brigadeiro seria de qualquer site de receita.
- **O bolo na faixa é o de 2 kg.** A diferença de tamanho é a seção do erro, em tabela.

---

## Fora de escopo

- Uma faixa por tamanho no bolo, ou a faixa do balcão e a do aplicativo no bolo de pote.
- A `FaixaDoCusto` reagir à calculadora (a faixa do exemplo virando a dela).
- A página de doces: a tabela dela já tem a faixa de cada doce (175).
