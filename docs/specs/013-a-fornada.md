# Spec 013 · A fornada

**Tipo:** funcionalidade nova, com uma coleção nova e um módulo de domínio novo. É a
primeira vez que o sistema enxerga a produção.
**Tamanho:** quatro sessões — `13A` a fornada existe e come a despensa, `13B` quantas
fornadas dá, `13C` o piso e a previsão em destaque, `13D` o que está pronto —, com `13E`
reservada. **A 13D é a que pode não ser precisa**, e a decisão sobre ela se toma depois da
13B, não agora.
**Depende de:** a `007-estoque.md`, inteira, que é o chão desta. A 5B continua pendente e
continua sendo o próximo passo do projeto; esta spec abre caminho novo sobre caminho velho
que nunca foi visto rodando, e isso é o mesmo risco que a 6A, a 7A e a 8A correram.
**Aprovações pedidas:** uma coleção nova, três campos novos em `FichaTecnica`, um índice novo
e uma mudança de comportamento da lista de compras em dado já gravado. Estão listadas ao fim,
antes dos riscos. **Regra de segurança não muda** — o curinga sob `contas/{contaId}` já cobre
coleção nova.

---

## Problema

O sistema sabe o que entra na despensa e sabe o que foi vendido. **Não sabe o que aconteceu
entre os dois**, e o que acontece entre os dois é o negócio inteiro.

A consequência tem três caras, e todas as três são a mesma:

**1. A despensa esvazia e ninguém vê.** A 007 resolveu o número sem idade: hoje o estoque é
uma medição com data, e a lista de compras para de confiar no que envelheceu. Mas entre uma
contagem e a seguinte ela assa, e o sistema não sabe. A contagem de terça vale sete dias por
`#d60`, e na sexta ela já valeu três fornadas — o número continua "fresco" e já está errado.
A única defesa é contar de novo, e contar é a coisa que a dívida de `ESTADO.md` diz que
depende dela fazer.

**2. Ninguém sabe se dá para fazer.** A cliente pergunta no WhatsApp se dá 40 cookies para
sexta. A resposta honesta depende de uma conta que o sistema tem todos os dados para fazer e
não faz: quantos lotes a despensa aguenta, e qual insumo trava primeiro. Ela responde de
cabeça, e de cabeça se erra dos dois lados — promete o que não dá, ou recusa o que daria.

**3. O cookie não é produzido por unidade, e o sistema finge que é.** Uma ficha rende um
lote. Um pedido de 12 cookies não consome 12 cookies de insumo: consome **uma fornada**, e
sobram 8 que são reais, vendáveis e invisíveis. `explodirDemanda` divide a demanda em lotes
fracionários de propósito ([listaCompras.ts:140-145](../../src/lib/domain/listaCompras.ts#L140-L145)),
e para **comprar** isso está certo — ela faz a fornada do tamanho que quiser. Para **prometer**
está errado: o forno não assa 0,6 de fornada.

E há um quarto, que só aparece quando os três primeiros são resolvidos: **hoje a lista de
compras compra insumo para pedido que já está `PRONTO`**
([listaCompras.ts:488-492](../../src/lib/domain/listaCompras.ts#L488-L492)). Pronto quer dizer
assado, e assado quer dizer que o insumo já saiu do armário. Isso passa despercebido hoje
porque nada diz que ele saiu; no dia em que a fornada for registrada, comprar de novo o que
ela acabou de gastar vira dinheiro parado toda semana.

**O que esta spec entrega:** a fornada como fato do sistema. Ela desconta a despensa sem
mentir sobre a contagem, abate a demanda do pedido que assou, responde quantos lotes ainda
dão, e vira o gatilho de um alerta de compra que não depende de pedido nenhum.

**O que esta spec não entrega:** um saldo. O `#d56` continua de pé e é o que torna tudo isto
possível — ver a decisão 2.

---

## O que já existe, e que esta spec não vai refazer

**A nota já abastece a despensa, com conferência e aceite manual.** É o `#d64`, entregue na
7B. O caminho completo, hoje:

1. `/insumos/nota` lê a foto, pareia com os insumos cadastrados e cadastra o que falta.
2. `importarNota` devolve `insumoIds` **na ordem das linhas**
   ([notas.ts:55-63](../../src/lib/firebase/mutations/notas.ts#L55-L63)) — esse campo existe
   exatamente para o passo seguinte.
3. A tela "Pronto" oferece **Guardar na despensa**, que guarda a semente e leva para
   `/insumos/contagem`.
4. Lá os campos nascem **semeados** por `contagem anterior + o que a nota trouxe`, e cada
   linha diz de onde o número saiu — "620 g contados há 3 dias + 1 kg da nota"
   ([estoque.ts:339-365](../../src/lib/domain/estoque.ts#L339-L365)).
5. Ela confere na prateleira, corrige e salva. **Nada é gravado antes disso.**

Então o item 2 do pedido está feito, e o que falta é polimento de duas coisas concretas:

- **A tela de contagem mostra a despensa inteira.** Uma nota de cinco linhas abre trinta e
  quatro campos, cinco deles preenchidos, e ela caça os cinco. Falta um recorte.
- **"Guardar na despensa" é uma opção ao lado de "ler outra".** Quem fecha a tela perde a
  semente em silêncio, e a semente morre no recarregamento de propósito (`#d64`).

As duas entram como carona da 13A, que já mexe nessa tela. **Não nasce sessão para isso.**

---

## O que esta spec decide antes de qualquer código

São nove decisões. Cada uma vira um `D` em `DECISOES.md` na sessão que a executar.

### 1. A fornada é a unidade de tudo

Uma fornada é um lote da ficha, assado num dia. É a unidade de quatro coisas que hoje são
quatro perguntas separadas:

| Pergunta                            | Em fornadas                                  |
| ----------------------------------- | -------------------------------------------- |
| Quanto saiu da despensa?            | fornadas × insumos por lote                  |
| Quantos doces eu tenho para vender? | fornadas possíveis × rendimento              |
| Dá para aceitar este pedido?        | o pedido cabe nas fornadas possíveis?        |
| Preciso comprar?                    | as fornadas possíveis caíram abaixo do piso? |

Uma unidade só, e por isso um módulo só. É também o motivo pelo qual o campo que ela digita
é **lotes**, e não unidades: o forno assa fornada, e pedir unidades seria pedir que ela
dividisse de cabeça o número que a receita já sabe.

### 2. A fornada é um fato datado, e não um saldo

O `#d56` decidiu que estoque é medição, e não saldo, porque o sistema não vê os movimentos da
despensa. **Registrar a fornada não muda isso** — ela continua não vendo o pacote aberto para
provar, a farinha derramada, nem a fornada que ela esqueceu de registrar.

Então a fornada **não escreve `Insumo.estoqueAtual`**. Ela é um documento próprio, com data, e
o que a tela mostra é uma **projeção**:

```
disponível = medido na contagem − fornadas registradas depois daquela contagem
```

Três coisas caem daí, e as três são o motivo de a decisão ser esta:

- **A medição fica intacta.** O número que ela contou continua sendo o número que ela contou.
  Nenhuma tela reescreve por cima dele um número que ele não disse.
- **Contar conserta tudo sozinho.** A janela da projeção é "depois da contagem": uma contagem
  nova exclui as fornadas velhas sem que nada precise ser zerado. Não existe contador para
  divergir do registro, porque não existe contador.
- **Uma escrita por fornada, e não uma por insumo.** Um campo `consumoDesdeContagem` no insumo
  custaria dez `increment()` numa fornada de dez ingredientes, e o `#d80` já ensinou o que
  acontece com escrita em fila sem rede.

A projeção é a **leitura**; a contagem continua sendo a **verdade**.

### 3. O que a fornada consumiu fica congelado dentro dela

`Fornada.consumo` é um array de `{ insumoId, nomeSnapshot, quantidade }`, gravado no ato.

A ficha muda — ela acrescenta uma colher de cacau em outubro. O que saiu da despensa em
setembro não muda junto. É o mesmo argumento de `ItemPedido.custoUnitarioSnapshot`, e sem ele
a projeção de setembro se reescreveria sozinha ao editar uma receita.

De carona, isto torna a projeção barata: somar o consumo das fornadas não lê ficha nenhuma.

**A quantidade congelada é a física, com a perda aplicada** — `quantidadeFisica(útil, perda)`,
a mesma conta de `montarLista`. O que sai do armário é o que sai do armário, e a perda faz
parte dele.

### 4. O que aconteceu no dia da contagem já está dentro dela

Uma fornada do **mesmo dia** da contagem não é descontada. A janela é `dataISO > contadoEmISO`,
estritamente maior.

É a mesma regra que o `#d64` já tomou do outro lado — "contagem de hoje não recebe soma" —, e
agora ela vale para os dois sentidos: **o dia da contagem é opaco.** Uma regra, não duas.

O contra-exemplo prova por que não pode ser `>=`: ela assa de manhã, conta à tarde e digita
800 g. Com `>=`, a tela mostraria 400 g logo depois — **o sistema contradizendo um número que
ela acabou de digitar**, que é precisamente o que o `#d17`, o `#d59` e o `#d64` existem para
impedir. O erro do `>` é oposto e barato: ela conta de manhã e assa à tarde, e por um dia a
despensa parece mais cheia do que está. Vence na contagem seguinte, e a tela diz quantas
fornadas entraram na conta para ela poder desconfiar sozinha.

### 5. A fornada não é dinheiro

Registrar produção **não** cria transação no caixa, nem move a meta.

O dinheiro saiu quando ela comprou o insumo, e a 6B já leva a nota para o caixa. Lançar de
novo na hora de assar seria contar a mesma farinha duas vezes — e o `#d81` acabou de mostrar
o preço de um agregado que não fecha.

### 6. A fornada abate a demanda do pedido que ela assou

`Fornada.pedidoId`, opcional. Quando presente, o que aquela fornada consumiu é **subtraído da
demanda daquele pedido** na montagem da lista.

Sem isto o sistema erra duas vezes na mesma direção: a fornada tira o insumo da despensa
(decisão 2) **e** o pedido continua pedindo o mesmo insumo, então a lista manda comprar de
novo o que ela acabou de gastar. Duas contas certas somando uma errada.

**E é por isso que `STATUS_NA_LISTA` não muda.** A tentação era tirar `PRONTO` da lista — se
está pronto, já foi assado. Mas "pronto" é o que ela clicou, e a fornada é o que ela
registrou: tirar `PRONTO` deixaria de comprar para quem marcou o status e não registrou nada,
e **deixar de comprar é o erro caro** (`#d63`). Abater por fornada abate o que de fato
aconteceu, aceita produção parcial de graça, e **não muda nada para quem nunca registrar uma
fornada.** Esta spec inteira é aditiva por causa desta decisão.

### 7. Capacidade sem contagem é "não sei", e não zero

O `#d63` decidiu que contagem vencida vale "não sei", e que a lista compra o cheio. A
capacidade herda o "não sei" e **não** herda o zero.

Se o insumo que trava a fornada é um que ela não contou, a resposta não é "não dá para fazer
nenhuma" — é **não dá para saber**, e o atalho é contar. Dizer zero seria fazer ela recusar um
pedido por falta de informação, e recusar venda é o erro que o `#d63` não tinha como cometer e
este tem.

São três leituras, e a tela diz qual está dando:

| Leitura        | Quando                                               | O que a tela diz          |
| -------------- | ---------------------------------------------------- | ------------------------- |
| `MEDIDA`       | todo insumo da ficha tem contagem que vale           | "dá para 3 fornadas"      |
| `PISO`         | há insumo sem contagem, mas o gargalo não é um deles | "dá para pelo menos 3"    |
| `DESCONHECIDA` | o gargalo é um insumo sem contagem que valha         | "não dá para saber ainda" |

### 8. O piso de produção é por ficha, e não do negócio

`FichaTecnica.fornadasMinimas`, inteiro, padrão **0**.

Um número global seria um número errado para toda ficha: ela quer sempre poder assar uma
fornada de cookie de chocolate, e não quer nunca ter insumo parado para o bolo de casamento
que sai duas vezes por ano. O piso é uma decisão sobre um produto, e mora na tela onde ela já
pensa naquele produto.

Padrão zero porque **nada deve mudar até ela pedir**. Piso ligado é a única coisa nesta spec
que faz a lista de compras crescer sem pedido nenhum atrás, e crescer sozinha é o tipo de
comportamento que faz parar de confiar na lista.

E o piso não é um alerta separado: ele entra na lista como demanda, ao lado dos pedidos.

```
necessária = demanda dos pedidos − o que já foi assado + piso × insumos por lote
comprar    = max(0, física − disponível)
```

O alerta é a mesma conta, dita em fornadas em vez de em gramas.

### 9. A fornada não é o status do pedido

`EM_PRODUCAO` e `PRONTO` continuam sendo o que são: onde o **pedido** está. A fornada é o que
saiu do **forno**, e existe sem pedido nenhum atrás — ela assa para a feira de sábado e para a
vitrine, não só para encomenda.

Registrar uma fornada não muda status, e mudar status não registra fornada. O que a tela do
pedido ganha é um atalho que abre a folha já preenchida, e um atalho não é um acoplamento.

---

# Sessão 13A · A fornada existe e come a despensa

## Escopo

O ciclo do fato: registrar o que assou, ver a despensa descer por causa disso, e a lista de
compras parar de comprar o que já foi assado. **Nenhuma pergunta nova é respondida nesta
sessão** — capacidade é a 13B. Primeiro o fato existe, depois ele responde.

### Tipo novo: `src/lib/types/producao.ts`

```ts
export interface ConsumoDaFornada {
  insumoId: string;
  /** Snapshot: a linha continua legível se o insumo for arquivado. */
  nomeSnapshot: string;
  /** Em unidade base e **física**, já com a perda aplicada. */
  quantidade: number;
}

export interface Fornada extends DocumentoBase {
  fichaId: string;
  nomeSnapshot: string;
  /** Quantos lotes. Aceita fração: "meia fornada" é meia fornada. */
  lotes: number;
  /** lotes × rendimento, congelado. Em 'un', arredondado para baixo. */
  unidadesProduzidas: number;
  unidadeRendimento: UnidadeRendimento;
  /** O dia, e não o instante — a mesma razão do `#d57`. */
  dataISO: DataISO;
  /** O que ESTA fornada tirou da despensa. Congelado (decisão 3). */
  consumo: ConsumoDaFornada[];
  /** Quando ela assou para um pedido específico (decisão 6). */
  pedidoId?: string;
  observacao?: string;
}
```

`caminhos.fornadas`, `colFornadas` e `docFornada` acompanham. Índice novo:
`fornadas` com `arquivado ASC + dataISO DESC`.

### Módulo novo de domínio: `src/lib/domain/producao.ts`

Puro, sem Firebase e sem React, como todo o resto de `domain/`.

```ts
/** Os insumos de UM lote, físicos, com a perda de cada insumo aplicada. */
export function consumoPorLote(
  ficha: FichaParaProduzir,
  fichas: FichaParaProduzir[],
  insumos: { id: string; perdaPercentual: Percentual }[],
): Map<string, number>;

/**
 * Quanto cada insumo perdeu para o forno **depois da própria contagem**.
 *
 * A data é por insumo: cada um tem a sua, e a janela é a dele. A mesma fornada
 * conta contra a farinha contada dia 1 e não conta contra o chocolate contado
 * dia 7. Insumo sem data de contagem não entra: não há medição de que descontar.
 */
export function consumoDesdeAContagem(
  fornadas: Fornada[],
  insumos: { id: string; estoqueContadoEmISO?: DataISO }[],
): Map<string, number>;

/** A projeção: o que a contagem disse, menos o que o forno levou. Nunca negativa. */
export function disponivelParaProducao(
  insumo: InsumoContado,
  consumo: number,
  hojeISO: DataISO,
): number;

/** O que já foi assado para pedidos que ainda estão na lista (decisão 6). */
export function produzidoParaPedidos(
  fornadas: Fornada[],
  pedidoIds: string[],
): Map<string, number>;

/** Quantas fornadas cabem no que ela digitou, e o que a linha vai gravar. */
export function fornadaGravavel(
  ficha: FichaParaProduzir,
  lotes: number,
  consumo: Map<string, number>,
): { unidadesProduzidas: number; consumo: ConsumoDaFornada[] };
```

`consumoPorLote` é onde a reutilização acontece, e ela pede **uma extração em
`listaCompras.ts`**: a regra do kit de um nível (`#d11`) hoje mora dentro de
`explodirDemanda`, no par de laços de
[listaCompras.ts:179-201](../../src/lib/domain/listaCompras.ts#L179-L201). Ela sai dali para
uma função exportada `insumosPorLote(ficha, porId): Map<string, number>`, e `explodirDemanda`
passa a chamá-la. **É refactor de comportamento preservado**, e os testes que já existem são o
que prova isso — se a regra do kit ficasse duplicada em dois módulos, a primeira mudança nela
sairia errada em um dos dois.

`consumoPorLote` é `insumosPorLote` passado por `quantidadeFisica(útil, perda)`, que já é
exportada.

### `montarLista` ganha o contexto da produção, e ele é opcional

```ts
export interface ContextoDaProducao {
  /** Por insumoId, o que saiu para o forno desde a contagem de cada um. */
  consumo: Map<string, number>;
  /** Por insumoId, o que já foi assado para os pedidos desta lista. */
  produzido: Map<string, number>;
}

export function montarLista(
  demanda: Demanda,
  insumos: InsumoParaLista[],
  hojeISO: DataISO,
  producao: ContextoDaProducao = SEM_PRODUCAO,
): ListaMontada;
```

O parâmetro é opcional **de propósito**: sem ele a função é exatamente a de hoje, e os testes
da 7B continuam passando sem uma linha alterada. É a prova de que a spec é aditiva.

A conta, com a ordem que importa:

```
física   = quantidadeFisica(necessária, perda)      ← útil vira físico
física  −= produzido[insumo]                        ← o que já foi assado (decisão 6)
disponível = max(0, medido − consumo[insumo])       ← a projeção (decisão 2)
comprar  = max(0, física − disponível)
```

O abate acontece **do lado físico**, e não do útil: `Fornada.consumo` já está em quantidade
física (decisão 3), e subtrair físico de útil somaria duas grandezas diferentes — o mesmo erro
que o comentário de `montarLista` já previne para o estoque.

`LinhaDaLista` ganha dois campos: `quantidadeJaProduzida` e `consumoDeFornadas`. São o que
permite a linha explicar por que o número mudou, e são gravados em `ItemListaCompras` pela
mesma razão de `estoqueAtual` já ser: a lista precisa saber o que entrou na conta dela.

### A folha de registrar fornada

`src/components/producao/PainelFornada.tsx` — painel lateral no desktop, folha inferior no
celular, como manda a invariante.

Campos, nesta ordem: **a ficha** (busca, quando aberta solta), **quantos lotes** (padrão 1),
**o dia** (padrão hoje), **para qual pedido** (opcional). E, embaixo, o que aquilo vai custar
da despensa, linha por linha, **antes de salvar**:

```
1 fornada de Cookie de chocolate  →  25 cookies
Sai da despensa:
  Farinha .......... 526 g   (você tem 1,2 kg → fica 674 g)
  Chocolate ........ 316 g   (você tem 400 g → fica 84 g)   ⚠ trava aqui
  Manteiga ......... 211 g   (sem contagem recente)
```

É o princípio 3 do `PRODUCT.md`: todo número mostra a sua consequência. E é a tela que torna
a decisão 2 legível — ela vê a projeção descer antes de aceitar que ela desça.

**Salvar não espera o servidor**, pelo `#d80` e pelo `#d62`: a cozinha é o pior sinal da casa
depois da despensa, e um botão preso em "salvando" no meio da fornada é a tela falhando
exatamente onde ela existe para funcionar.

Duas entradas, as duas em telas que já existem:

- **`/fichas/[id]`** — "Assei uma fornada". É a tela do produto, e é onde ela está quando
  acabou de assar aquele produto.
- **`/pedidos/[id]`** — "Registrar fornada", com a ficha e os lotes **já preenchidos pelo que
  o pedido pede**, e `pedidoId` amarrado. Um pedido de 12 cookies numa ficha que rende 25
  abre com 1 lote, e não com 0,48: o forno não assa meia fornada porque a encomenda é pequena.

### `/insumos/contagem` passa a dizer o que o forno levou

A linha ganha uma frase ao lado da idade: `contada há 5 dias · 2 fornadas desde então`. E o
bloco de referência mostra a projeção: `1,2 kg contados · projetamos 674 g`.

**O campo continua nascendo vazio.** O `#d59` decidiu que semear com o valor anterior destrói a
diferença entre número conferido e número herdado, e a projeção é um número herdado com uma
conta em cima — semear com ela seria o mesmo erro com uma camada de aritmética por fora. A
projeção é referência, e a semente continua sendo só a da compra (`#d64`), porque uma entrada é
um fato exato com o pacote na mão e um consumo é uma receita estimando o que a tigela levou.

### Carona: os dois ajustes da nota

Os dois já descritos em "O que já existe":

1. **A tela de contagem ganha o recorte "só o que a nota trouxe"**, ligado quando há semente.
   É um filtro sobre `linhas`, não uma tela nova, e desligá-lo devolve a despensa inteira.
2. **"Guardar na despensa" vira a ação primária** da tela "Pronto" da nota, com "ler outra"
   ao lado como secundária. A semente continua morrendo no recarregamento (`#d64`): o que
   muda é qual das duas ações parece a próxima.

## Critérios de aceite 13A

- [x] Registrar uma fornada de 1 lote grava **um** documento em `contas/{contaId}/fornadas`,
      com `consumo` congelado em quantidade física e `unidadesProduzidas` calculado.
- [x] `/insumos` e `/insumos/contagem` mostram a projeção, e a contagem gravada **não muda**:
      `estoqueAtual` continua sendo o número da última contagem.
- [x] Uma fornada datada **no dia da contagem** não é descontada; datada no dia seguinte, é.
- [x] Contar de novo zera o efeito de todas as fornadas anteriores àquela contagem, sem que
      nada além da contagem seja escrito.
- [x] Com um pedido confirmado e uma fornada registrada **para ele**, "Refazer" a lista deixa
      de comprar o insumo daquele pedido, e a linha diz que já foi assado.
- [x] Com uma fornada registrada **sem pedido**, a lista continua comprando para os pedidos e
      a despensa aparece menor — os dois efeitos ao mesmo tempo e sem se anularem.
- [x] `montarLista` chamada sem o quarto parâmetro devolve exatamente o que devolvia antes:
      os testes da 7B passam sem alteração.
- [x] `explodirDemanda` devolve exatamente o que devolvia antes da extração de
      `insumosPorLote`, kit incluído.
- [x] Arquivar uma fornada a tira da projeção. **Nenhuma fornada é apagada.**
- [x] Registrar uma fornada não cria transação, não move meta e não muda status de pedido.
- [x] Vinda da nota, a contagem abre recortada nas linhas da nota, e o recorte pode ser
      desligado.
- [x] Testes de `producao.ts` cobrindo: fornada no dia da contagem, insumo sem contagem, kit
      de um nível, produção parcial de um pedido, e fornada de ficha arquivada.
- [x] Portão de conclusão passando: lint, typecheck, test, build.

---

# Sessão 13B · Quantas fornadas dá

## Escopo

A pergunta 2 do problema. Nenhuma escrita nova: **é leitura sobre o que a 13A passou a
gravar.**

```ts
export type LeituraDaCapacidade = "MEDIDA" | "PISO" | "DESCONHECIDA";

export interface CapacidadeDaFicha {
  fichaId: string;
  nome: string;
  leitura: LeituraDaCapacidade;
  /** Fornadas inteiras. `null` quando a leitura é DESCONHECIDA (decisão 7). */
  fornadas: number | null;
  /** fornadas × rendimento, na unidade de rendimento da ficha. */
  unidades: number | null;
  /** O insumo que trava primeiro. É o que ela precisa comprar. */
  gargalo: {
    insumoId: string;
    nome: string;
    tem: number;
    precisaPorLote: number;
    unidadeBase: UnidadeBase;
  } | null;
  /** Os insumos da ficha sem contagem que valha, por nome. */
  semContagem: string[];
}

export function capacidadeDaFicha(
  ficha: FichaParaProduzir,
  fichas: FichaParaProduzir[],
  insumos: InsumoParaLista[],
  consumo: Map<string, number>,
  hojeISO: DataISO,
): CapacidadeDaFicha;
```

`fornadas = floor(min sobre os insumos de disponível / consumoPorLote)`, para baixo sempre: o
forno não assa fração de fornada, e arredondar para cima seria prometer o que não dá.

A leitura sai da decisão 7, e o `null` é o que impede a tela de dizer zero quando o que ela
tem é ausência de informação.

### Onde a capacidade aparece

**Em `/fichas`, na linha de cada ficha.** É a tela que ela abre quando alguém pergunta se tem
cookie. Nenhuma rota nova: `/producao` seria um sexto destino numa navegação que tem cinco por
`navegacao.ts`, e a capacidade não é um lugar — é um atributo do produto.

```
Cookie de chocolate        R$ 6,90 · sobram R$ 2,49
dá para 3 fornadas · 75 cookies
```

```
Brownie                    R$ 8,50 · sobram R$ 3,10
não dá para saber · o chocolate está sem contagem     [Contar a despensa]
```

**No editor de pedido**, ao lado do item. É onde a pergunta é feita de verdade: ela está com o
WhatsApp aberto e a cliente esperando.

```
40 cookies para 18/09
Dá: você consegue 2 fornadas (50 cookies) com o que tem hoje.
```

```
40 cookies para 18/09
Falta 1 fornada. Comprar 500 g de chocolate resolve.
```

**A capacidade é sobre hoje, e a frase diz isso.** Ela não tenta adivinhar o que a lista de
compras vai trazer até sexta — misturar "o que eu tenho" com "o que eu vou comprar" produziria
um número que não é nenhum dos dois. A ponte entre as duas é a lista, e a lista já existe.

**A capacidade desconta o que já está prometido.** Os pedidos abertos do horizonte já
consomem fornadas, e uma capacidade que os ignorasse mandaria ela prometer duas vezes a mesma
farinha. O número na linha do pedido é **o que sobra depois dos pedidos já fechados**, e a
frase diz isso quando há algum.

## Critérios de aceite 13B

- [ ] Ficha com todos os insumos contados e frescos mostra número, leitura `MEDIDA` e o
      gargalo nomeado.
- [ ] Ficha cujo gargalo é um insumo sem contagem mostra **"não dá para saber"**, e não zero,
      com atalho para contar.
- [ ] Ficha com insumo sem contagem que **não** é o gargalo mostra "pelo menos N".
- [ ] Registrar uma fornada derruba a capacidade na hora, sem contagem nova.
- [ ] Capacidade de um kit respeita o nível único do `#d11` e conta a embalagem própria.
- [ ] O editor de pedido diz se dá, e quando não dá diz **qual insumo** e **quanto** resolve.
- [ ] Ficha sem itens, rendimento zero e ficha arquivada não quebram nem aparecem.
- [ ] Portão de conclusão passando.

---

# Sessão 13C · O piso, e a previsão em destaque

## Escopo

A pergunta 4, e o item 3 do pedido: a previsão de compras deixa de depender de haver pedido.

### `FichaTecnica.fornadasMinimas`

Inteiro, padrão 0, editado no formulário da ficha ao lado do rendimento, com a frase em
português de confeitaria:

> **Sempre poder fazer** `[ 1 ]` **fornada de reserva.**
> Quando a despensa não der mais isso, o que falta entra na lista de compras.

Entra em `esquemaFicha`, em `DadosFicha` e nos dois corpos de escrita de `mutations/fichas.ts`.

### A lista de compras ganha o piso

`ContextoDaProducao` ganha um terceiro mapa, `piso`, e a demanda passa a ser:

```
necessária = demanda dos pedidos − já produzido + Σ (fornadasMinimas × consumoPorLote)
```

A linha da lista diz de onde veio, porque uma linha que aparece sem pedido atrás é uma linha
em que ela para de confiar:

> **Chocolate** · 1 pacote de 500 g · R$ 40,00
> 300 g para o pedido de sexta · 500 g para manter 1 fornada de cookie de reserva

### O cartão da tela Hoje vira a previsão

`CartaoComprasHoje` hoje só existe quando há pedido confirmado nos próximos 7 dias
([CartaoComprasHoje.tsx:44-50](../../src/components/compras/CartaoComprasHoje.tsx#L44-L50)). Ele
passa a existir quando há **qualquer uma** das três:

1. lista aberta com item por comprar;
2. ficha abaixo do próprio piso;
3. pedido confirmado no horizonte e nenhuma lista montada.

E passa a dizer o número em vez do gênero da coisa:

```
🛒  Faltam 4 itens · R$ 62,00
    O cookie não dá nem uma fornada — trava no chocolate
```

**O que não muda:** `/compras` continua fora da navegação inferior. Cinco é o teto por
`navegacao.ts`, e trocar `/insumos` ou `/fichas` por ela esconderia um cadastro para revelar
uma tela que já tem duas portas — o cartão e `/pedidos`. Se a operação real disser que o
cartão não basta, a troca é uma linha, e está listada como decisão fácil de rejeitar.

## Critérios de aceite 13C

- [ ] Piso 0 (o padrão) não muda a lista em nada.
- [ ] Piso 1 numa ficha, sem pedido nenhum aberto, monta lista com o que falta para uma
      fornada — e a linha diz que é reserva.
- [ ] Piso e pedido no mesmo insumo somam, e não se substituem.
- [ ] Assar a fornada de reserva faz o item voltar para a lista na próxima montagem.
- [ ] O cartão da tela Hoje aparece sem pedido nenhum, quando uma ficha cai abaixo do piso.
- [ ] O cartão não aparece quando não há nada a comprar e nenhuma ficha abaixo do piso.
- [ ] Portão de conclusão passando.

---

# Sessão 13D · O que está pronto

**Esta sessão pode não ser precisa, e a decisão se toma depois da 13B.**

A 13B responde "quantos dá para fazer". Falta "quantos já estão feitos": a fornada de 25 que
saiu para um pedido de 12 deixou 13 na grade, e eles são vendáveis. A pergunta é se esses 13
são um número que ela precisa do sistema para saber, ou um número que ela vê com o olho ao
abrir o pote. **Se for o segundo, esta sessão não nasce.**

Se nascer, ela é a 007 aplicada um nível acima, e reusa tudo:

```ts
// FichaTecnica
estoqueProntoAtual?: number;
estoqueProntoContadoEmISO?: DataISO;
```

`contagemDoInsumo` já é estrutural sobre `{ estoqueAtual, estoqueContadoEmISO }` e serve os
dois sem uma linha nova de domínio. A tela de contagem ganha uma irmã — "contar o que está
pronto" —, a fornada propõe o novo número em vez de gravá-lo (`#d64` de novo), e a resposta
completa fica:

```
posso vender = prontos + fornadas possíveis × rendimento − o que já está prometido
```

**O que decide se ela nasce:** a 13B em uso por duas ou três semanas. Se "dá para 3 fornadas"
já responder à cliente no WhatsApp, os 13 na grade são detalhe de bancada e o campo não
precisa existir.

---

# Sessão 13E · reservada

Para o que as quatro anteriores acharem e não couber nelas, com spec escrita antes de
qualquer código.

---

## Fora de escopo, nas quatro sessões

- **Baixa automática sem ela registrar.** Continua fora, e é o `#d09`. O que muda é que agora
  existe um jeito barato de registrar; adivinhar continua proibido.
- **Fornada com hora.** O dia basta, pelo `#d57`. "Assou há 6 horas" é uma exatidão que a
  bancada não tem.
- **Perda de fornada** — a que queimou, a que deu errado. É contagem, e a contagem já resolve:
  ela conta o que está pronto e o número cai. Um campo "perdi 4" seria um segundo caminho para
  o mesmo fato.
- **Rendimento real diferente do rendimento da ficha.** A fornada grava
  `lotes × rendimento`; se saíram 23 em vez de 25, quem conserta é a contagem do que está
  pronto (13D), e não um segundo campo editável que pode discordar do primeiro.
- **Custo real da fornada.** O custo do lote já é da ficha, e o dinheiro é do caixa
  (decisão 5). "Quanto me custou a fornada de terça" é pergunta que ninguém fez.
- **Planejamento de produção** — "o que assar hoje para dar conta da semana". É a 13B lida ao
  contrário, é uma tela inteira, e depende de ela confiar na capacidade primeiro.
- **Reserva de estoque por pedido.** Continua fora pelo mesmo motivo da 007: exige saldo, e a
  decisão 2 recusa saldo. O abate por fornada (decisão 6) é o quanto disso dá para ter sem
  saldo.
- **Validade do que está pronto.** Cookie tem prazo, e prazo é um campo, uma regra e um alerta.
  Nasce com spec própria, se nascer.
- **Histórico de produção como relatório** — "quantas fornadas assei em agosto". A coleção
  guarda tudo para responder isso no dia em que for pergunta de verdade. Hoje não é.

---

## Decisões que esta spec toma, e que são fáceis de rejeitar

- **A fornada não escreve o estoque.** É a decisão de maior efeito. Rejeitá-la — deixar a
  fornada gravar `estoqueAtual` direto — daria uma tela mais simples e um número que se
  afasta da despensa um pouco a cada fornada não registrada, sem nunca dizer que se afastou.
  Foi exatamente o problema que a 007 curou.
- **`>` e não `>=` no dia da contagem.** Escolhe o erro de parecer mais cheio por um dia, e
  recusa o erro de contradizer um número recém-digitado. Rejeitá-la é escolher o inverso, e o
  inverso aparece na tela.
- **Abater por fornada, e não tirar `PRONTO` da lista.** Custa um campo (`pedidoId`) e um mapa
  a mais na montagem. A alternativa é uma linha, e deixa de comprar para quem marca status sem
  registrar fornada.
- **Piso por ficha, e não global.** O pedido original falava de "a quantidade mínima", no
  singular. Um número só é mais simples de configurar e errado para toda ficha que não for a
  carro-chefe. Se a operação disser que um número global basta, ele vira
  `configuracao.producao.fornadasMinimas` e o campo da ficha sai.
- **Capacidade em `/fichas`, sem rota `/producao`.** Uma tela própria seria mais fácil de
  achar e um sexto destino que não cabe. Se a previsão precisar mesmo de porta própria, a
  troca na navegação é uma linha em `navegacao.ts` — e o que sai é `/insumos`, que passa a ser
  alcançada de dentro de `/compras`.
- **`montarLista` com quarto parâmetro opcional.** Mantém a spec aditiva e os testes da 7B
  intactos, ao preço de uma assinatura com um default. A alternativa honesta seria tornar o
  parâmetro obrigatório e atualizar os testes, o que apagaria a prova de que nada mudou para
  quem não registra fornada.
- **A 13D reservada em vez de planejada.** Escrever a sessão inteira agora seria decidir, hoje,
  que ela precisa de um número que talvez ela leia no pote.

---

## Riscos

**O risco maior é ela não registrar.** A fornada é um ato a mais num dia que já tem produção,
embalagem, entrega e caixa — e o sistema não tem como saber que ela assou e não contou. Três
coisas seguram isso, e nenhuma delas é um lembrete:

1. **Nada piora se ela não registrar.** A decisão 6 mantém a spec aditiva: sem fornada
   nenhuma, a lista de compras é a de hoje, exatamente.
2. **O atalho está onde ela já está** — a ficha que ela acabou de assar, o pedido que ela
   acabou de marcar como pronto.
3. **A contagem continua sendo a âncora.** Uma semana sem registrar nada custa uma contagem, e
   a contagem já era o hábito que a 007 pediu.

**O risco de método é a 13B mentir com cara de precisão.** "Dá para 3 fornadas" é um número
redondo dito com confiança sobre uma medição que pode ter cinco dias e três fornadas por cima.
A decisão 7 é a defesa — a leitura `PISO` e a `DESCONHECIDA` existem para que a tela nunca
afirme mais do que sabe —, e o critério de aceite que mais importa é justamente o de a ficha
com gargalo sem contagem **não** dizer zero.

**O risco de escopo é a 13C crescer.** "Destaque para a previsão" é um pedido sem contorno
natural: sempre cabe mais um cartão, mais uma frase, mais um lugar. O contorno desta spec são
três: a linha da lista que explica o piso, o cartão da tela Hoje e nada mais. A navegação
inferior está explicitamente fora, e está listada como decisão a rejeitar para que a conversa
aconteça antes do código e não durante.

**O risco de dado é o de sempre nesta ordem de execução:** a 5B continua sem rodar, e esta
spec mexe em `montarLista` pela segunda vez depois da 7B. Se algo em `/compras` aparecer torto
na 5B, agora são três camadas de suspeitos — a 6A, a 7B e esta.

---

## Aprovações pedidas

1. **Coleção nova `contas/{contaId}/fornadas`**, com `caminhos.fornadas` e o converter. Regra
   de segurança **não** muda: o curinga sob `contas/{contaId}` já cobre.
2. **Três campos novos em `FichaTecnica`**: `fornadasMinimas` (13C), e `estoqueProntoAtual` e
   `estoqueProntoContadoEmISO` **apenas se a 13D nascer**. Todos opcionais ou com padrão zero:
   nenhum documento existente fica inválido.
3. **Índice novo**: `fornadas` com `arquivado ASC + dataISO DESC`, publicado com
   `firebase deploy --only firestore:indexes`.
4. **Mudança de comportamento da lista de compras em dado já gravado**: a lista passa a
   descontar fornadas e a abater produção. O efeito é nulo enquanto não houver fornada
   registrada, e é essa a razão de a decisão 6 ser o que é.

Nenhuma dependência de produção entra. Nenhuma rota nova nasce.
