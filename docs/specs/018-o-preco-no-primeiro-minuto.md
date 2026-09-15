# Spec 018 · O preço no primeiro minuto

**Tipo:** feature, a primeira da fase 0 do `docs/saas/ROADMAP.md`. Uma biblioteca de partida —
25 insumos com preço médio e duas fichas-modelo já precificadas — que entra por **um toque
dela** e a deixa dentro de uma ficha com o preço no rodapé. Um módulo de domínio, uma mutação,
um componente, dois estados vazios, uma faixa no editor e um selo na lista. Nenhuma rota,
nenhum índice, nenhuma regra de segurança, nenhuma dependência, **nenhum campo de schema**.
**Tamanho:** uma sessão. O que pesa é a tabela de dados (copiar) e o teste número por número.
**Origem:** `#d113`. A Maynara não chegou ao preço sem explicação; o primeiro preço fica atrás
de três formulários, e o primeiro deles é o mais difícil do sistema.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma de schema, regra ou dependência. **Uma decisão a registrar**,
`#d114`, que revisa metade do `#d17`: enquanto a conta não salvou configuração, a ficha passa
a calcular com a configuração sugerida — e a dizer isso — em vez de calcular com rateio zero.
Sem ela, a ficha-modelo gravada e a mesma ficha aberta no editor mostrariam dois preços.

---

## Problema

Uma conta nova abre em três listas vazias. Para ver o primeiro preço ela precisa: conferir
nove campos de configuração, cadastrar oito insumos de nove campos cada, montar uma ficha. A
seção 2 do roadmap descreve o que isso custou no único teste que houve.

A leitura do código acrescenta três coisas que a spec precisa saber:

1. **A premissa do `#d113` é meio verdadeira.** "A ficha já calcula com `CONFIGURACAO_SUGERIDA`
   quando nada foi salvo" vale para a precificação (`FormularioFicha.tsx:159`: margem, markup,
   arredondamento) e **não vale para o rateio**: `FormularioFicha.tsx:399` cai em `SEM_RATEIO`
   — hora, gás, energia e indireto a zero — e a faixa diz "o custo abaixo é só o dos insumos".
   Uma ficha-modelo "já precificada com a configuração sugerida" gravada com R$ 25 a hora e
   aberta num editor que calcula com R$ 0 a hora mostraria um preço na lista e outro no
   rodapé. A 019 inteira ("sua primeira ficha usou a hora e o gás sugeridos; ajuste e veja o
   preço mudar") depende disto estar resolvido antes.
2. **Nada distingue um preço médio de um preço dela.** Se a biblioteca entra como insumo
   comum, no dia seguinte não há como saber qual chocolate ela conferiu e qual ainda é a média
   — nem para a frase do primeiro minuto, nem para a métrica da 022 ("primeira ficha que não
   é da biblioteca").
3. **`#d65` diz "o guia não semeia dado"** e o motivo é "o dia em que ela apagar o exemplo é o
   dia em que aprende que o sistema inventa coisas". A biblioteca não é exemplo: é o que toda
   cozinha tem, com o preço marcado como média até ela corrigir. E não é o guia que semeia —
   é um botão que ela aperta, e que some no instante em que a conta tem qualquer coisa.

---

## O que sai da frente de quem está começando (`#d113`)

- **O formulário de nove campos como primeiro contato.** Em conta vazia, a ação primária de
  `/insumos` e de `/fichas` passa a ser a biblioteca; "Cadastrar insumo", "Ler uma nota" e
  "Criar primeira ficha" continuam existindo, como ações secundárias.
- **"Criar primeira ficha" apontando para um editor sem insumo para escolher.** Hoje é um beco:
  o estado vazio de `/fichas` manda montar a receita "com os insumos que você já cadastrou", e
  ela não cadastrou nenhum.
- **A faixa "o rateio está zerado"** em conta sem configuração. Sai do caminho e entra outra,
  que diz o número usado e para onde ir para mudá-lo.

---

## O que esta spec decide

Uma decisão, que vira `#d114` em `docs/DECISOES.md`, e uma linha de revisão no `#d65`.

### Sem configuração salva, a ficha calcula com a sugerida inteira e diz isso — `#d114`

`#d17` decidiu duas coisas: que sugestão não vira dado (o documento `configuracao/geral` só
nasce no "Salvar") e que, enquanto isso, a ficha "sabe que não há configuração e avisa, em vez
de calcular com número que o sistema inventou". A primeira metade fica. A segunda cai:
**zero também é um número que o sistema inventou**, e é o pior deles, porque é exatamente o
erro da planilha dela — não se pagar. Um preço com a hora a R$ 25 e o gás sugerido está mais
perto da verdade do que um preço com a hora a R$ 0, e a faixa continua dizendo de onde o número
veio e para onde ir para mudá-lo.

Na prática: `rateioDaConta(configuracao)` e `precificacaoPadraoDaConta(configuracao)` moram ao
lado de `CONFIGURACAO_SUGERIDA` e são o único lugar que conhece a regra "salvo, senão sugerido"
— rateio, método, margem, markup, arredondamento e **a maior taxa ativa** das formas sugeridas
(4,99% do crédito). O editor e a biblioteca chamam as duas. `SEM_RATEIO` sai de
`custoFicha.ts`: não sobra chamador.

`temConfiguracao` continua sendo "o documento existe": o passo da configuração continua
pendente até ela salvar, que é o que a 019 precisa para apresentá-lo pela consequência.

### A biblioteca é um botão dela, marcada pelo id, e "preço médio" é o que ela ainda não corrigiu

- **O id carrega a origem.** Todo documento da biblioteca nasce com id `biblioteca-<slug>`
  (`biblioteca-farinha-de-trigo`, `biblioteca-cookie-classico`). `ehDaBiblioteca(id)` é um
  `startsWith`. Nenhum campo novo, e o script da 022 lê a mesma coisa. Apertar duas vezes é
  `setDoc` no mesmo id — idempotente por construção.
- **"Preço médio" é insumo da biblioteca com `historicoPrecos.length <= 1`.** Toda correção
  de preço, embalagem ou perda empurra uma entrada no histórico (`precoMudou`); enquanto há uma
  só, o preço é o que a biblioteca trouxe. É o que a faixa da ficha e o selo da lista leem.
- **O botão só existe em conta vazia**: nenhum insumo e nenhuma ficha não arquivados. Com
  qualquer coisa cadastrada, ele não aparece em lugar nenhum — nem a farinha dela ganha uma
  irmã, nem uma conta em uso ganha um cookie de mentira no meio das fichas de verdade.
- **A escrita é um `writeBatch` despachado** (`#d104`), 28 operações: 25 insumos, 2 fichas e
  o incremento de `agregados/global`. Ela cai na ficha-modelo no toque, do cache, com ou sem
  rede.

---

## Escopo

### 1. `src/lib/domain/biblioteca.ts` — os dados e a função que monta os documentos

Puro: sem Firebase, sem React, sem `Timestamp`. Quem carimba a hora é a mutação.

```ts
export const PREFIXO_BIBLIOTECA = "biblioteca-";
export function ehDaBiblioteca(id: string): boolean;
/** Insumo da biblioteca que ela ainda não corrigiu: uma compra só no histórico. */
export function temPrecoMedio(
  insumo: Pick<Insumo, "id" | "historicoPrecos">,
): boolean;
/** Os nomes, na ordem da ficha, dos insumos dela que ainda estão com preço médio. */
export function insumosComPrecoMedio(
  itens: { insumoId: string }[],
  insumos: Insumo[],
): string[];

export const INSUMOS_DA_BIBLIOTECA: readonly InsumoDaBiblioteca[]; // a tabela abaixo
export const FICHAS_DA_BIBLIOTECA: readonly FichaDaBiblioteca[]; // as duas abaixo

/** Os documentos prontos para `corpoDeInsumoNovo` e `corpoDaFicha`, com o id de cada um. */
export function montarBiblioteca(parametros: {
  operacional: RateioOperacional;
  precificacao: ParametrosPreco;
}): {
  insumos: (DadosInsumoDaBiblioteca & { id: string })[];
  fichas: (DadosFichaDaBiblioteca & { id: string })[];
};
```

`montarBiblioteca` resolve cada item da ficha contra o insumo da própria biblioteca —
`calcularCustoInsumo` para o custo corrigido, `paraBase` para a quantidade — e devolve o mesmo
formato que o editor entrega a `criarFicha` (`tipo: "SIMPLES"`, `fornadasMinimas: 0`,
`componentes`, `escolhas` vazios, `custoEscolhas: 0`, `precoVenda: null`). Os tipos de saída
são definidos aqui e casam estruturalmente com `DadosInsumo` e `DadosFicha`; o domínio não
importa de `mutations/`.

**Os 25 insumos.** Preços de setembro de 2026, redondos de propósito — média com centavos
parece medida. Todos editáveis; nenhum é dado até ela corrigir.

| id                      | Nome                           | Categoria     | Compra | Preço    | Perda |
| ----------------------- | ------------------------------ | ------------- | ------ | -------- | ----- |
| `farinha-de-trigo`      | Farinha de trigo               | INGREDIENTE   | 1 kg   | R$ 5,50  | 2%    |
| `acucar-refinado`       | Açúcar refinado                | INGREDIENTE   | 1 kg   | R$ 5,00  | 0%    |
| `acucar-mascavo`        | Açúcar mascavo                 | INGREDIENTE   | 500 g  | R$ 8,00  | 0%    |
| `acucar-de-confeiteiro` | Açúcar de confeiteiro          | INGREDIENTE   | 500 g  | R$ 7,00  | 0%    |
| `manteiga-sem-sal`      | Manteiga sem sal               | INGREDIENTE   | 200 g  | R$ 12,00 | 0%    |
| `ovos`                  | Ovos                           | INGREDIENTE   | 12 un  | R$ 12,00 | 0%    |
| `chocolate-meio-amargo` | Chocolate meio amargo em barra | INGREDIENTE   | 1 kg   | R$ 45,00 | 1%    |
| `gotas-de-chocolate`    | Gotas de chocolate             | INGREDIENTE   | 1 kg   | R$ 42,00 | 0%    |
| `chocolate-branco`      | Chocolate branco em barra      | INGREDIENTE   | 1 kg   | R$ 48,00 | 1%    |
| `cacau-em-po`           | Cacau em pó                    | INGREDIENTE   | 200 g  | R$ 18,00 | 0%    |
| `fermento-em-po`        | Fermento químico em pó         | INGREDIENTE   | 100 g  | R$ 5,00  | 0%    |
| `bicarbonato-de-sodio`  | Bicarbonato de sódio           | INGREDIENTE   | 100 g  | R$ 3,50  | 0%    |
| `essencia-de-baunilha`  | Essência de baunilha           | INGREDIENTE   | 30 ml  | R$ 8,00  | 0%    |
| `sal`                   | Sal                            | INGREDIENTE   | 1 kg   | R$ 3,00  | 0%    |
| `leite-condensado`      | Leite condensado               | INGREDIENTE   | 395 g  | R$ 7,50  | 3%    |
| `creme-de-leite`        | Creme de leite                 | INGREDIENTE   | 200 g  | R$ 4,00  | 3%    |
| `leite-em-po`           | Leite em pó                    | INGREDIENTE   | 400 g  | R$ 18,00 | 0%    |
| `creme-de-avela`        | Creme de avelã                 | INGREDIENTE   | 650 g  | R$ 35,00 | 3%    |
| `doce-de-leite`         | Doce de leite                  | INGREDIENTE   | 400 g  | R$ 12,00 | 3%    |
| `saquinho`              | Saquinho transparente          | EMBALAGEM     | 100 un | R$ 15,00 | 0%    |
| `caixa-para-cookies`    | Caixa para cookies             | EMBALAGEM     | 25 un  | R$ 50,00 | 0%    |
| `lacre-adesivo`         | Lacre adesivo                  | EMBALAGEM     | 100 un | R$ 10,00 | 0%    |
| `etiqueta-adesiva`      | Etiqueta adesiva               | ETIQUETA      | 100 un | R$ 20,00 | 0%    |
| `tag-de-agradecimento`  | Tag de agradecimento           | ETIQUETA      | 100 un | R$ 25,00 | 0%    |
| `pote-com-tampa`        | Pote com tampa                 | ARMAZENAMENTO | 10 un  | R$ 30,00 | 0%    |

**As duas fichas.** Categoria "Cookies", unidade `un`, sem `marca`, sem `fornecedor`, sem
estoque — a despensa dela não é média de nada.

| `cookie-classico` · Cookie clássico · rende 20 · 60 min | `cookie-recheado` · Cookie recheado · rende 12 · 90 min |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Manteiga sem sal 200 g                                  | Manteiga sem sal 200 g                                  |
| Açúcar mascavo 150 g                                    | Açúcar mascavo 150 g                                    |
| Açúcar refinado 100 g                                   | Açúcar refinado 100 g                                   |
| Ovos 2 un                                               | Ovos 2 un                                               |
| Essência de baunilha 5 ml                               | Essência de baunilha 5 ml                               |
| Farinha de trigo 320 g                                  | Farinha de trigo 350 g                                  |
| Fermento em pó 5 g                                      | Cacau em pó 30 g                                        |
| Bicarbonato 3 g                                         | Fermento em pó 5 g                                      |
| Sal 3 g                                                 | Bicarbonato 3 g                                         |
| Gotas de chocolate 250 g                                | Sal 3 g                                                 |
| Saquinho 20 un                                          | Chocolate meio amargo 150 g                             |
| Etiqueta adesiva 20 un                                  | Creme de avelã 180 g                                    |
|                                                         | Saquinho 12 un                                          |
|                                                         | Etiqueta adesiva 12 un                                  |

### 2. `tests/domain/biblioteca.test.ts`

- **Forma:** nenhum id e nenhum nome repetido entre os 25 e entre as 2; todo id casa com
  `/^[a-z0-9-]+$/`; todo preço é inteiro positivo; toda quantidade de compra é positiva; toda
  perda está em 0–99; toda categoria está em `CATEGORIAS_INSUMO`.
- **Referência:** todo item das duas fichas aponta para um id da própria biblioteca, com
  quantidade positiva e unidade compatível com a unidade base do insumo.
- **Prefixo:** todo documento que `montarBiblioteca` devolve tem id com `PREFIXO_BIBLIOTECA`,
  e `ehDaBiblioteca` responde sim para eles e não para um id gerado.
- **O caso de aceite, número por número**, com `CONFIGURACAO_SUGERIDA` (hora R$ 25, energia
  R$ 1 e gás R$ 2 por hora, despesas fixas zero, margem 35%, crédito 4,99%, terminar em 90):

  | Cookie clássico (20 un, 60 min) |             | Cookie recheado (12 un, 90 min) |              |
  | ------------------------------- | ----------- | ------------------------------- | ------------ |
  | Insumos                         | R$ 30,90    | Insumos                         | R$ 40,07     |
  | Embalagem                       | R$ 7,00     | Embalagem                       | R$ 4,20      |
  | Mão de obra                     | R$ 25,00    | Mão de obra                     | R$ 37,50     |
  | Energia e gás                   | R$ 3,00     | Energia e gás                   | R$ 4,50      |
  | Custo do lote                   | R$ 65,90    | Custo do lote                   | R$ 86,27     |
  | **Custo por unidade**           | **R$ 3,30** | **Custo por unidade**           | **R$ 7,19**  |
  | Preço sugerido (÷ 0,6001)       | R$ 5,50     | Preço sugerido                  | R$ 11,98     |
  | **Preço na etiqueta**           | **R$ 5,90** | **Preço na etiqueta**           | **R$ 12,90** |

  Linha por linha, como `calcularCustoFicha` arredonda: farinha 320 g × 0,5612 = 180;
  baunilha 5 ml × 26,667 = 133; bicarbonato 3 g × 3,5 = 11; sal 1; gotas 1050; manteiga
  1200; mascavo 240; refinado 50; ovos 200; fermento 25. No recheado, farinha 196, cacau
  270, chocolate 150 g × 4,5455 = 682, creme de avelã 180 g × 5,5511 = 999. Se um número
  não bater, a tabela está errada, e não a função: o teste chama `derivarFicha` com o que
  `montarBiblioteca` devolve.

- **`temPrecoMedio` e `insumosComPrecoMedio`:** insumo da biblioteca com uma entrada de
  histórico → sim; com duas → não; insumo sem prefixo → não, qualquer histórico. A lista de
  nomes segue a ordem dos itens da ficha e não repete.

### 3. `src/lib/firebase/mutations/configuracao.ts` — o `#d114` num lugar só

```ts
/** O rateio que uma ficha usa: o salvo, senão o sugerido (`DECISOES.md#d114`). */
export function rateioDaConta(
  configuracao: ConfiguracaoGeral | null,
): RateioOperacional;
/** Método, margem, markup, arredondamento e a maior taxa ativa — salvos, senão sugeridos. */
export function precificacaoPadraoDaConta(
  configuracao: ConfiguracaoGeral | null,
): ParametrosPreco;
```

`rateioDaConta` calcula `custoIndiretoPorHora` das sugeridas com a mesma
`custoIndiretoPorHora(despesasFixasMensais, horasProdutivasMes)` que `salvarConfiguracao` usa.
`SEM_RATEIO` sai de `src/lib/domain/custoFicha.ts`.

### 4. `src/lib/firebase/mutations/fichas.ts`

`corpoDaFicha` vira exportada, como `corpoDeInsumoNovo` virou para a nota (`#d19`: uma função,
dois chamadores). Nada mais muda.

### 5. `src/lib/firebase/mutations/biblioteca.ts`

```ts
/** Grava a biblioteca de uma vez e devolve o id da ficha em que ela cai. */
export function instalarBiblioteca(
  contaId: string,
  configuracao: ConfiguracaoGeral | null,
): string;
```

Um `writeBatch`: `lote.set(docInsumo(contaId, id), corpoDeInsumoNovo(dados, momento))` por
insumo, `lote.set(docFicha(contaId, id), { ...corpoDaFicha(dados), ativo, criadoEm,
atualizadoEm, arquivado: false })` por ficha, e um `lote.set(docResumoGlobal, { totalInsumos:
increment(25), totalFichas: increment(2) }, { merge: true })`. `despachar(lote.commit())`.
Um `momento` só para os 27 documentos, como na nota. Devolve
`PREFIXO_BIBLIOTECA + "cookie-classico"` sem esperar nada.

### 6. `src/components/biblioteca/BotaoBiblioteca.tsx`

- **Sabe sozinho quando existir**: duas consultas `limit(1)` em `insumos` e `fichas` com
  `arquivado == false` (as mesmas de `useComeco`) e o documento de configuração. Renderiza
  `null` enquanto carrega e sempre que uma das duas listas tem alguma coisa. É o que permite
  colocá-lo nos dois estados vazios hoje e no passo 1 do caminho na 019 sem que cada lugar
  decida a regra.
- **Um botão primário, `lg`, 52px no celular:** "Começar com o que toda cozinha tem". Abaixo,
  uma linha: "25 ingredientes e embalagens com preço médio, e duas receitas de cookie já com
  preço. Você corrige o que for diferente na sua cozinha."
- **No toque:** `instalarBiblioteca(contaId, configuracao)` e `router.push('/fichas/' + id)`
  no mesmo tique. Sem `await`, sem estado de "instalando": o cache já tem os documentos quando
  a rota abre.
- Props: `variante?: "primaria" | "secundaria"` para a 019 poder pendurá-lo como ação do
  passo; nada mais.

### 7. Os dois estados vazios

- **`/fichas` (`ListaFichas`)**, quando `dados.length === 0`: o `BotaoBiblioteca` no lugar da
  ação; "Criar primeira ficha" vira terciária abaixo dele. Título "Comece com um cookie que
  já tem preço"; descrição em uma frase. Quando o botão não se renderiza (há insumos), o
  estado vazio é o de hoje, sem uma letra mudada.
- **`/insumos` (`page.tsx`)**, idem: o botão primeiro, "Cadastrar insumo" e "Ler uma nota"
  como terciárias na mesma linha, o aviso de sem rede da nota onde está. Título "Comece com o
  que toda cozinha tem".

### 8. `src/components/fichas/FormularioFicha.tsx` — duas faixas, uma condição cada

- As linhas 159–183 e 398–416 passam a usar `rateioDaConta` e `precificacaoPadraoDaConta`.
  Os valores iniciais de uma ficha nova (`taxaCartaoConsiderada` inclusive) saem da mesma
  função que a biblioteca usou: é o que faz o rodapé mostrar o número gravado.
- **Faixa "Calculado com preços médios"**, quando `insumosComPrecoMedio(itens, insumos)` não
  é vazio: "Farinha de trigo, manteiga sem sal e mais 8 estão com o preço que a biblioteca
  sugeriu. O seu chocolate custa isso mesmo? Corrija em Insumos e o preço se refaz." Link para
  `/insumos`. Some sozinha conforme ela corrige.
- **Faixa do rateio**, quando `configuracao === null`: "Seu tempo está a R$ 25 a hora, e o
  gás e a energia no valor sugerido. Ajuste em Configuração e veja o preço mudar." O link de
  hoje. A faixa "o rateio está zerado" continua existindo para o caso em que ela **salvou**
  zeros — é decisão dela, e o texto de hoje está certo para isso.

### 9. `src/components/insumos/LinhaInsumo.tsx`

Selo neutro "Preço médio" quando `temPrecoMedio(insumo)`, ao lado de onde "Contagem vencida"
aparece. É o que faz o passo 2 da 019 ("corrigir o preço do que você compra") ter uma lista
para percorrer em vez de 25 linhas iguais.

### 10. Documentação

- `#d114` em `docs/DECISOES.md`; uma linha no `#d65` dizendo que a biblioteca é botão dela e
  marcada pelo id, e que o guia continua não semeando.
- `docs/ESTADO.md`: a seção da 018, a próxima ação apontando para a 019.
- `docs/saas/ROADMAP.md`, linha da 019: "R$ 20 a hora" → R$ 25 (`valorHoraTrabalho: 2500`).

---

## Roteiro de navegador

Precisa de **conta vazia**: a real tem dados e o botão não aparece nela. Um segundo login com
`npm run conceder-acesso -- <outro-email> teste-018 "Teste 018" Teste`. DevTools em
**Offline** do passo 1 ao 4 — sem rede é o estado normal, e é o que prova que nada espera.

1. **`/fichas`.** Estado vazio com "Começar com o que toda cozinha tem" como primária e "Criar
   primeira ficha" pequena embaixo. `/insumos`: o mesmo botão, "Cadastrar insumo" e "Ler uma
   nota" pequenas.
2. **Tocar.** A tela é `/fichas/biblioteca-cookie-classico` **no toque**, sem passar por "Esta
   ficha não está aqui". Rodapé: custo R$ 3,30, preço R$ 5,90. Duas faixas: "preços médios"
   listando os insumos, e "R$ 25 a hora". O selo de sincronização acusa pendência.
3. **`/insumos`.** 25 linhas, todas com "Preço médio", o botão sumiu. `/fichas`: duas fichas,
   o botão sumiu. Tela Hoje: "Primeiros passos, 2 de 5" — configuração continua sendo o passo
   de agora (a 019 muda isso, não esta).
4. **Corrigir as gotas de chocolate para R$ 55,00** e salvar. `/fichas` mostra o selo de custo
   desatualizado no clássico; abrir: a faixa lista um insumo a menos, o rodapé já diz o novo
   preço; "Recalcular e salvar".
5. **Religar a rede, fechar a aba, reabrir.** Os 27 documentos e o agregado estão no servidor;
   o console não tem erro de regra.
6. **`/configuracao`, salvar sem mudar nada.** Reabrir o clássico: a faixa "R$ 25 a hora"
   sumiu, e **o preço é o mesmo** — sugerido e salvo são o mesmo número.
7. **Arquivar as duas fichas e os 25 insumos, voltar a `/fichas`.** O botão está de volta;
   tocar de novo regrava por cima dos mesmos ids, e as gotas voltam a R$ 42,00.

---

## Critérios de aceite

- [x] `src/lib/domain/biblioteca.ts` sem importar Firebase nem React; `tests/domain/biblioteca.test.ts` com forma, referência, prefixo, o caso de aceite dos dois cookies
      número por número e os dois predicados.
- [x] `instalarBiblioteca` é um `writeBatch` despachado que reusa `corpoDeInsumoNovo` e
      `corpoDaFicha`; `grep -n "await " src/lib/firebase/mutations/biblioteca.ts` não acha nada.
- [x] `grep -rn "SEM_RATEIO" src/ tests/` não acha nada; `rateioDaConta` e
      `precificacaoPadraoDaConta` são os únicos lugares que decidem "salvo, senão sugerido".
- [x] O `BotaoBiblioteca` não renderiza em conta com um insumo ou uma ficha viva, em nenhuma
      das duas telas.
- [ ] O roteiro de sete passos passa, com os passos 1 a 4 em Offline.
- [x] Nenhum campo novo em `src/lib/types/`, nenhuma rota, nenhum índice, nenhuma regra,
      nenhuma dependência.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d114` escrito, `#d65` com a linha de revisão, `ESTADO.md` e a linha da 019 no roadmap
      atualizados.

---

## Fora de escopo

- **O botão no primeiro passo do caminho.** O roadmap o lista, mas hoje o passo 1 é "Conferir
  a configuração", e um botão de biblioteca ali seria um botão no lugar errado por uma
  sessão. É a 019 que faz o passo 1 ser "ver quanto custa um cookie", e é ela que pendura o
  `BotaoBiblioteca` — pronto, com a regra de sumir embutida.
- **Reescrever `CATALOGO_DO_COMECO`** ou qualquer fato em `FatosDoComeco`. 019.
- **"Mais detalhes" nos formulários.** 020.
- **Uma ação "este preço está certo"** no insumo. Confirmar sem mudar continua sendo "preço
  médio"; ver "Decisões fáceis de rejeitar".
- **Biblioteca para bolo, brigadeiro, venda por peso.** O que a segunda confeiteira faz só as
  entrevistas da fase 1 dizem; uma biblioteca de cookie é o que a usuária 0 precisa.
- **Preço por região, atualização de preço da biblioteca em conta que já apertou.** A média é
  ponto de partida, e o preço dela vira dela no primeiro toque.
- **Desfazer a biblioteca.** Arquivar já existe, um a um, e o passo 7 mostra que voltar é
  apertar de novo.
- **Semear configuração.** `configuracao/geral` continua nascendo só no "Salvar" (`#d17`).

---

## Decisões desta spec que são fáceis de rejeitar

- **O id carrega a origem, e não um campo.** Um campo `origem: "BIBLIOTECA"` seria mais
  explícito e custaria uma aprovação de schema, um `if` em `corpoDaFicha` para não apagá-lo
  ao salvar, e a pergunta "quando deixa de ser da biblioteca?". O prefixo não tem resposta
  para essa pergunta porque ela não precisa de resposta: o que importa é se o **preço** ainda
  é o médio, e isso o histórico diz. Se um dia um campo for preciso, migrar é um `startsWith`
  sobre a coleção.
- **"Preço médio" é `historicoPrecos.length <= 1`.** Se ela abrir a farinha, olhar, concordar e
  fechar, continua "médio". O caso é real e o custo é um selo a mais numa linha certa; a
  alternativa é uma ação de confirmar, que é campo e tela para uma dúvida que a próxima
  compra resolve sozinha.
- **Apertar de novo depois de arquivar tudo regrava por cima**, inclusive o preço que ela
  tinha corrigido no insumo arquivado. É o que "começar com o que toda cozinha tem" numa conta
  vazia quer dizer, e o arquivado continua com o id nas fichas antigas.
- **A conta com insumo mas sem ficha não vê o botão.** Poderia ver só as duas fichas, casando
  a farinha dela pelo nome. É casamento por nome, com todos os problemas de casamento por
  nome, para um caso em que ela já sabe cadastrar insumo — o estado vazio de hoje serve.
- **60 e 90 minutos, 20 e 12 unidades.** São a fornada do caso de aceite da 002 e o tamanho
  de cookie que se vende. Ela corrige; o que a spec exige é que o preço saia entre R$ 5 e
  R$ 15 com a configuração sugerida, e sai.
- **A ficha-modelo usa a configuração dela quando existe.** Uma conta que salvou a configuração
  antes de apertar (o caminho de hoje manda fazer isso) ganha o cookie com a hora dela, não com
  a sugerida. É o mesmo `rateioDaConta` do editor: um número só.

---

## Riscos

- **`#d17` pela metade.** A faixa é o que impede o preço sugerido de parecer medido: ela diz
  o número e o lugar. Se a sessão a deixar cair, a spec vira exatamente o que o `#d17` temia.
- **Um instante de "Esta ficha não está aqui".** `EditorFicha` acha a ficha na assinatura de
  `fichas`, que ganha o documento pendente no primeiro snapshot — antes de `carregando` virar
  falso. Se o passo 2 mostrar o estado vazio por um quadro, o conserto é `router.push` depois
  de `lote.commit()` ter sido despachado, nunca esperado; e se ainda assim aparecer, pare: a
  leitura desta spec sobre o cache está errada, e a mutação precisa devolver a ficha montada
  para a tela abrir com ela na mão.
- **Os preços.** Estão certos como ordem de grandeza e errados para qualquer cozinha
  específica, por definição. O teste protege a conta, não a média; a média quem protege é o
  selo.
- **Se o passo 6 der dois preços diferentes**, a regra "salvo, senão sugerido" tem dois
  lugares, e o critério do `grep` não foi cumprido.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de sete passos numa conta vazia — o único lugar onde o botão
existe. E, fora do código, o que a fase 0 pede: **a Maynara abrindo a conta de teste sem
ninguém ao lado, com a tela gravada, contando as perguntas.** A 019 só é escrita depois disso.
