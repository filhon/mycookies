# Spec 178 · A conta de cada doce

**Tipo:** as páginas do brigadeiro, do bolo por quilo e do bolo de pote trocam a `ContaAberta`
parada pela `CalculadoraDasParcelas` da 176, começando no exemplo daquele doce e na unidade dele.
Ela vê o exemplo virar a conta dela no mesmo lugar, sem escolher doce nem unidade.
Nenhum campo gravado, nenhuma regra, nenhuma dependência. Nenhuma aritmética nova.
**Tamanho:** uma sessão.
**Origem:** a crítica das quatro páginas de doce de 2026-10-15, comparadas ao que cobra
assinatura no mesmo assunto. Os apps de precificação de confeitaria (Lucro na Confeitaria,
A Minha Confeitaria, DocePreço) e a planilha de bolo de pote vendida no Hotmart entregam **uma
conta onde ela põe os números dela**; as ferramentas de conteúdo que trazem assinante (Shopify,
NerdWallet, a calculadora de tarifas da Stripe) põem a ferramenta antes do texto. Das quatro
páginas do Rende, só a do cookie deixa ela fazer conta. As outras três mostram um exemplo que não
se mexe e dizem "faça os cinco passos com os números da sua cozinha", sem lugar para pôr os
números.
**Depende de:** 068 (as três páginas), 176 (`CalculadoraDasParcelas`, `contaDasParcelas`,
`EXEMPLOS_DAS_PARCELAS`).
**Sai junto com:** a 179, no mesmo deploy (ver "Decisões fáceis de rejeitar").
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. Fecha o resto do "Fora de escopo" da
068 ("A calculadora nas páginas novas") e reabre o da 176 ("A calculadora nas páginas de cada
doce").
**Decisões a registrar:** uma, numerada na sessão (a calculadora no lugar da `ContaAberta`).

---

## Problema

1. **A página responde e para.** A pergunta é "quanto cobrar o cento de brigadeiro"; a resposta é
   "o do exemplo sai a R$ 176,50, o seu depende". O "depende" é o momento em que ela fecha a aba e
   abre o app ou a planilha que faz a conta dela.
2. **O exemplo parado ocupa o lugar mais visto.** A `ContaAberta` está logo depois da resposta no
   celular e presa ao lado dos passos no desktop. É o melhor lugar da página, e ele mostra um doce
   que não é o dela.
3. **A ferramenta existe e está na página errada.** A `CalculadoraDasParcelas` já conhece os quatro
   exemplos, por unidade de venda, com as taxas de cada um. Ela mora só em
   `/como-calcular-o-preco-de-doces`, a página da pergunta larga.

---

## 1 · O que esta spec decide

### A calculadora começa no doce da página

- `entradaDasParcelas(doce?)` em `domain/calculadora.ts` passa a receber o `valor` de um item de
  `EXEMPLOS_DAS_PARCELAS` ("Brigadeiro", "Bolo", "Bolo de pote"). Sem argumento, o cookie, como
  hoje.
- `CalculadoraDasParcelas` ganha `doce?: (typeof EXEMPLOS_DAS_PARCELAS)[number]["valor"]`. Com
  ele:
  - o estado começa em `entradaDasParcelas(doce)` e na unidade daquele exemplo;
  - **as duas linhas de `Pilulas` não aparecem** ("Começar pelo exemplo do" e "Você vende por"): a
    página já é daquele doce, e a unidade é a dele;
  - o resto (campos, dicas, resultado, porção rosa, aviso de margem + taxas ≥ 100%) não muda.
- Sem `doce`, a página de doces fica igual, byte a byte.

### O lugar dela

O mesmo slot da `ContaAberta`, nas três páginas:

- **Desktop (`lg`):** a coluna da direita, `lg:sticky lg:top-8`, ao lado dos passos e da margem,
  como a 176 fez na página de doces (`#d394`): ela lê a parcela à esquerda e corrige o campo à
  direita. O `h2` "Faça a conta do seu {doce}" ("do seu brigadeiro", "do seu bolo", "do seu bolo de
  pote") e `id="sua-conta"` com `scroll-mt-4`.
- **Celular:** logo depois da resposta (e, com a 179, logo depois da faixa do exemplo). É a
  ferramenta primeiro: quem quer entender cada campo tem a dica de uma linha embaixo dele e os
  cinco passos logo depois.
- **A resposta do topo** ganha no fim: "Ou ponha os seus números na conta logo abaixo", link para
  `#sua-conta`. A resposta continua inteira antes dele (`#d176`).
- **A pergunta "Quanto cobrar…"** de cada página troca "faça os cinco passos com os números da sua
  cozinha" por um link para `#sua-conta` com a mesma frase.

A `ContaAberta` sai das três páginas. Ela continua na do cookie e na `/conheca`.

### O que cada página tem de só dela

A calculadora é a mesma; o texto em volta aponta o que mexer:

- **Brigadeiro:** a seção do erro ("esquecer a hora de enrolar") termina com "Ponha zero em Sua
  hora na conta e veja o que sobra de verdade", link para `#sua-conta`.
- **Bolo de pote:** a seção do aplicativo termina com "Na conta, ponha nas taxas o percentual do
  seu contrato com o aplicativo", link para `#sua-conta`.
- **Bolo por quilo:** a conta é do quilo do tamanho que ela mais vende. A seção do erro termina com
  "Faça a conta uma vez por tamanho: a caixa e a decoração mudam de peso em cada um", link para
  `#sua-conta`. A conta por bolo + por quilo (`POR_BOLO`, `POR_QUILO`) **não** entra na
  calculadora (ver "Fora de escopo").

---

## 2 · Antes de tocar em código

1. Ler a 176 e `CalculadoraDasParcelas.tsx` inteiros.
2. `/impeccable` com registro **brand** (página do site); `PRODUCT.md` e `DESIGN.md`.
3. Conferir que nenhuma das três páginas passa a ter duas porções rosa na mesma tela: a da
   `ContaAberta` sai, a da calculadora entra.

---

## 3 · Escopo

- `domain/calculadora.ts`: o parâmetro de `entradaDasParcelas`.
- `tests/domain/calculadora.test.ts`: um `it` por doce, `contaDasParcelas(entradaDasParcelas(doce))`
  dá o preço de etiqueta que a página daquele doce mostra no topo (o cento a R$ 176,50, o quilo do
  bolo de 2 kg, o pote no balcão).
- `CalculadoraDasParcelas.tsx`: a prop `doce`.
- As três `page.tsx`: a calculadora no lugar da `ContaAberta`, as frases e os links da seção 1.
- Página do cookie, página de doces e `/conheca`: intocadas.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px, 1280px e 1864px, nos dois temas.

1. Cada página abre com a calculadora no exemplo dela e o mesmo preço do topo.
2. Nenhuma pílula de doce ou de unidade nas três páginas; na de doces, as duas continuam.
3. Desktop: a calculadora fica presa enquanto os passos passam e solta antes das perguntas; nada
   encosta no rodapé. Se a calculadora for mais alta que a janela a 1280×720, anotar no `ESTADO.md`
   (a 176 tem o mesmo limite).
4. Os links "na conta" descem até ela no celular e no desktop.
5. Brigadeiro: zerar "Sua hora" dá o preço errado da seção do erro.
6. Bolo de pote: taxas em 20% (o `NO_APLICATIVO`) dá o preço do aplicativo da página.
7. Sem JavaScript: a calculadora aparece parada no exemplo, com o resultado.
8. Uma porção rosa por tela.
9. Lighthouse no celular: acessibilidade 100; desempenho anotado no `ESTADO.md`, antes e depois (é
   o primeiro JavaScript dessas três páginas).

---

## Critérios de aceite

- [x] As três páginas têm a calculadora, começando no exemplo e na unidade delas.
- [x] O teste prende o preço de cada exemplo pela calculadora.
- [x] A página de doces sai igual.
- [x] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [x] Decisão registrada (`#d396`); a nota da 068 marcada como fechada; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **No celular, a calculadora antes dos passos.** Na página de doces ela vem depois das parcelas
  (`#d394`), porque lá ninguém chegou com um doce na cabeça. Aqui ela chegou: quer o número dela, e
  os passos explicam o que ela não souber pôr.
- **Tirar a `ContaAberta`.** O exemplo continua: é o estado inicial da calculadora e, com a 179, a
  faixa do topo. Mostrar os dois seria o mesmo número três vezes.
- **Sair junto com a 179.** Sozinha, a 178 deixa o celular sem o desenho do exemplo antes dos
  campos. Funciona, mas é a metade da ideia.

---

## Fora de escopo

- A conta do bolo por bolo + por quilo (o valor fixo da caixa e da decoração mais o quilo). Pede
  campos que a `contaDasParcelas` não tem; volta se o Search Console mostrar a página do bolo com
  saída baixa.
- Trocar a `CalculadoraDaPorta` da página do cookie.
- Guardar ou mandar a conta: 180.
- Levar a conta para o cadastro: o produto do app só tem custo pela ficha, e uma conta sem receita
  pede decisão de schema.
