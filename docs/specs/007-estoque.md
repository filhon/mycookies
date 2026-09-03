# Spec 007 · O estoque ganha idade

**Tipo:** conserto de dívida, com uma tela nova. Nenhum módulo novo.
**Tamanho:** duas sessões — `7A` do número sem idade à contagem barata, `7B` a lista que
para de confiar em número velho —, com `7C` reservada para o que a 7B achar e não couber
nela.
**Dívida que origina:** a linha `Estoque continua sendo número digitado: comprar não o
movimenta` da tabela de `ESTADO.md`, mais o item **Estoque** do "Fora de escopo" da
`006-nota-fiscal.md` e o das três sessões da `003-pedidos.md`.
**Depende de:** nada que não esteja entregue. A 5B continua pendente e continua sendo o
próximo passo do projeto — esta spec não a substitui e não deveria rodar antes dela pelo
mesmo motivo registrado em `ESTADO.md` sobre a 6A.
**Aprovações pedidas:** um campo novo, um campo **removido** e uma mudança de comportamento
em dado já gravado. Estão listadas ao fim, antes dos riscos.

## Problema

`Insumo.estoqueAtual` é um número solto. Ele tem exatamente um leitor em todo o sistema —
`montarLista`, em [listaCompras.ts:332](../../src/lib/domain/listaCompras.ts#L332) — e esse
leitor o subtrai em silêncio, sem saber de quando ele é.

**Um número sem data não é uma medida. É um palpite antigo tratado como verdade.** Os 500 g
de farinha que ela digitou em março continuam sendo subtraídos em setembro, e a lista de
compras erra nos dois sentidos, alternando entre eles sem avisar:

- **Ela comprou e o número não subiu.** A nota lida preserva `estoqueAtual` de propósito
  (`atualizacaoDaLinha`, `DECISOES.md#d51`), e marcar um item como comprado em `/compras`
  não o toca. O número fica baixo demais, e a próxima lista manda comprar de novo o que já
  está no armário.
- **Ela produziu e o número não desceu.** Ela assa fora do sistema — é o `#d09` e é o motivo
  pelo qual baixa automática nunca entrou. O número fica alto demais, e a lista deixa de
  comprar o chocolate. **Este é o erro caro:** 32 cookies para sexta e a despensa vazia na
  quinta.

O agravante é que **não existe jeito barato de contar**. O único caminho para escrever
`estoqueAtual` é o painel de `/insumos`, um insumo por vez, dentro de um `<details>`
rotulado "Detalhes opcionais"
([FormularioInsumo.tsx:285-319](../../src/components/insumos/FormularioInsumo.tsx#L285-L319)).
Contar uma despensa de vinte itens é abrir e fechar vinte painéis. É a mesma doença que a
006 curou no cadastro, na tela ao lado, e por isso o campo fica em branco: manter o número
custa mais do que ignorá-lo.

E há uma promessa que o app faz e não cumpre. `Insumo.estoqueMinimo` é tipado
([insumos.ts:61](../../src/lib/types/insumos.ts#L61)), validado
([schemas.ts:27](../../src/lib/domain/schemas.ts#L27)) e gravado por
`corpoDeInsumoNovo` e `corpoDeAtualizacao` — e **nenhuma tela do sistema o define**. Seu
único leitor é `estoqueBaixo` em
[LinhaInsumo.tsx:9-15](../../src/components/insumos/LinhaInsumo.tsx#L9-L15), que por isso
nunca pode disparar. O selo "Estoque baixo" que o `DESIGN.md` lista como uso do token
`--attention` não existe em tela nenhuma.

**O que esta spec entrega:** o estoque passa a ser uma medição com data. Contar a despensa
vira uma tela — uma linha por insumo, um número cada, uma escrita só —, a lista de compras
diz em que idade ela está confiando e para de descontar o que envelheceu, e a compra
**propõe** a contagem em vez de fingir escrevê-la.

**O que esta spec não entrega:** movimento automático. O sistema continua não dando baixa na
produção e continua não dando entrada na compra. O que ele passa a fazer é o que faz em todo
o resto do projeto — a conta é dele, a decisão é dela.

---

## O que esta spec decide antes de qualquer código

São nove decisões. Cada uma vira um `D` em `DECISOES.md` na sessão que a executar: as sete
primeiras são `#d56` a `#d62`, na 7A; as duas últimas são `#d63` e `#d64`, na 7B.

### 1. Estoque é medição, e não saldo

Um saldo é uma consequência de movimentos. Uma medição é uma observação com data. O sistema
não vê os movimentos da despensa — nem a fornada de quinta à noite, nem o pacote que ela
abriu para provar —, então ele não tem como manter um saldo. O que ele pode fazer é guardar
**o que ela viu, e quando viu.**

A consequência é a spec inteira: se estoque é medição, então ele envelhece, e um sistema que
sabe a idade de um número pode parar de confiar nele. É isso que o número solto de hoje não
permite fazer.

### 2. A data é um dia, e não um instante

`Insumo.estoqueContadoEmISO?: DataISO`, campo opcional novo. Não `Timestamp`.

Dois motivos, e o segundo é uma invariante. **A precisão honesta é o dia:** ela conta na
manhã de terça e assa na tarde de terça, e "contado há 6 horas" seria uma exatidão que a
despensa não tem — a idade que interessa se conta em dias. E `src/lib/domain/` nunca importa
Firebase; uma data que atravessa a fronteira como `DataISO` mantém `estoque.ts` puro, do lado
certo da linha, e o `datas.ts` já sabe trabalhar com essa forma.

`datas.ts` ganha `diasEntre(deISO, ateISO)`, que é a única peça que falta lá.

### 3. Quem conta escreve a data

A data **não** sai de um diff. `estoqueContadoEmISO` entra em `DadosInsumo` e é escrita por
quem contou; quem não contou carrega adiante o que estava lá, que é exatamente o serviço que
`dadosDoInsumo` já presta aos outros campos.

O contra-exemplo prova a regra: se a data fosse derivada de "o número mudou", contar a
despensa e achar os mesmos 50 saquinhos da semana passada **não** atualizaria a data — e a
lista continuaria desconfiando de um número que ela acabou de conferir. Encontrar o mesmo
número é uma contagem, e é uma das mais valiosas.

Pelo mesmo motivo, o inverso também vale: corrigir o preço da farinha na gôndola
(`corrigirPrecoNaLista`, que chama `atualizarInsumo` com `dadosDoInsumo`) **não** pode
redatar a contagem. Ela olhou a etiqueta, não o armário.

### 4. Só a linha tocada é gravada, e zero é uma contagem

O campo de cada linha da contagem **nasce vazio**, com o número anterior e a idade dele ao
lado, como referência. Vazio significa "não contei esta". `0` significa "contei, e não tem".

São estados diferentes e precisam de representações diferentes — é a terceira vez que este
projeto encontra o mesmo problema, depois do `#d43` (ausência não é igualdade, na
configuração) e do `#d21`/`#d55` (o par de estados em vez do booleano, no preço e no bloco do
caixa). Um campo semeado com o valor anterior tornaria "não mexi" indistinguível de "conferi
e continua igual", e uma tela que gravasse as trinta e quatro linhas datava trinta e duas
que ela nunca olhou. **Isso é a mentira que esta spec existe para remover, cometida pela
própria tela que veio consertá-la.**

Contagem é por insumo, e não por despensa: o que ela não contou continua com a data que
tinha e vence no prazo dele.

### 5. A contagem tem prazo, e o prazo é do domínio

Quatro estados, dois números:

| Estado         | Idade           | O que a lista faz               |
| -------------- | --------------- | ------------------------------- |
| `FRESCA`       | até 7 dias      | desconta, e não diz nada        |
| `ENVELHECENDO` | de 8 a 30 dias  | desconta, e diz a idade         |
| `VENCIDA`      | mais de 30 dias | **não desconta**, e diz por quê |
| `NUNCA`        | sem data        | **não desconta**                |

**Sete dias porque é o ciclo dela:** ela compra no mesmo mercado toda semana, e o horizonte
padrão da lista de compras são 7 dias. Uma contagem vale uma ida ao mercado sem precisar de
aviso. **Trinta porque é o maior horizonte da própria lista**, e porque depois de um mês todo
número da despensa passou por uma compra e por várias fornadas — não sobrou observação
nenhuma dentro dele.

O estado intermediário existe para não jogar o trabalho dela no lixo. Uma contagem de doze
dias ainda é a melhor informação que existe sobre aquele armário; descartá-la porque passou
de uma semana seria trocar um número razoável por nenhum.

### 6. `estoqueMinimo` sai

Some do tipo, do `esquemaInsumo`, do `DadosInsumo`, das duas montagens de documento e do selo
que nunca disparou. Nenhum documento da conta tem valor real ali — nenhuma tela nunca
escreveu um —, então não há dado a migrar.

A pergunta que um limiar responderia é **"o que está acabando?"**, e ela passa a ter duas
respostas melhores, as duas de graça: a contagem diz **o que zerou** no momento em que ela
conta, sem limiar nenhum para inventar item por item; e a lista de compras diz o que falta
contra a demanda real dos pedidos fechados, que é a versão útil da mesma pergunta. Um mínimo
por insumo seria vinte palpites a manter, cada um deles envelhecendo do mesmo jeito que o
estoque envelhecia.

O selo de `--attention` na linha de `/insumos` não desaparece: ele passa a dizer **"Contagem
vencida"**, que é uma afirmação verificável sobre um número que existe.

### 7. A contagem não espera o servidor

A tela despacha a escrita e não a espera, do jeito de `/compras` (`#d40`): o cache local já
aplicou, a tela desenha o resultado no toque, e o `SeloSincronizacao` conta a verdade sobre
o que ainda não subiu.

**A despensa é o pior sinal da casa.** É o fundo, atrás da cozinha, e é onde a contagem
acontece por definição. A promessa de uma escrita do Firestore não resolve enquanto não há
rede, então um `await` aqui deixaria o botão preso em "salvando" exatamente no lugar em que
esta tela existe para funcionar. É a dívida que `TelaNota` tem e aceita — lá a tela já
exigiu rede para ler; aqui não há nada a ler de fora.

### 8. Vencida vale "não sei", e a lista deixa de descontar

Quando a contagem venceu ou nunca existiu, `montarLista` **não subtrai nada**: ela compra a
quantidade física inteira, e a tela diz por quê.

A escolha é entre dois erros, e eles não custam o mesmo. Descontar um número vencido erra
para baixo e produz a compra faltando: a fornada de sexta não acontece, e o pedido é da
cliente. Não descontar erra para cima e produz um pacote a mais na prateleira: dinheiro
parado, e ele volta na semana seguinte. **`listaCompras.ts` já registra qual dos dois é o
inaceitável**, no comentário de `MotivoPendencia`: "uma lista que some com um item faz a
Maynara chegar em casa sem chocolate".

**Isto vale para o estoque já gravado.** Todo insumo cadastrado antes desta spec tem
`estoqueAtual` e não tem data, e não existe data honesta a inventar para ele —
`atualizadoEm` é do documento, e não da contagem. Então ele entra como `NUNCA`, e na
primeira abertura de `/compras` depois desta spec **o carrinho cresce**. A tela precisa
dizer isso em uma frase e oferecer a contagem ali mesmo. Não há script de migração: a
migração é a frase, e o conserto são dois minutos na tela nova.

### 9. Comprar propõe a contagem, e nunca a escreve

Uma compra sabe **quanto entrou** e não sabe **o que saiu desde então**. Somar a entrada e
gravar seria inventar a metade que falta, e é exatamente a tentação que o "Fora de escopo"
da 006 nomeou: entrada automática sem baixa automática deixa o estoque subindo para sempre.

Então a compra faz o que o sistema faz em todo lugar: **calcula e pergunta.** Ao fim da
importação de nota, e ao fechar a lista de compras, a contagem é oferecida com os campos
**semeados** por `contagem anterior + o que entrou`, linha por linha, dizendo de onde cada
sugestão saiu. Ela confirma, corrige ou ignora. É o `#d17` — sugestão não é dado — aplicado
ao armário.

Duas regras caem daí:

- **Sem contagem recente, a sugestão é só o que entrou.** "Não sei mais 1 kg" não são
  1,5 kg. A linha diz "sem contagem recente" e sugere os 1000 g da nota, e nada mais.
- **Contagem de hoje não recebe soma.** Se ela lê a nota e depois fecha a lista da mesma
  compra, a segunda oferta encontraria uma contagem feita hoje e somaria os mesmos pacotes
  de novo. Então a entrada só se soma a contagem de **outro dia**; a de hoje aparece como
  está, dizendo "contada hoje", para ela decidir.

---

# Sessão 7A · O número ganha idade, e contar fica barato

## Escopo

O ciclo da contagem: abrir, ver o que tem e desde quando, digitar, salvar em uma escrita. A
lista de compras **não muda de comportamento nesta sessão** — ela ganha o campo novo no tipo
de entrada e continua descontando como sempre. Quem muda a lista é a 7B, e a ordem é de
propósito: primeiro existe o jeito de contar, depois o motivo de contar.

### Módulo novo de domínio: `src/lib/domain/estoque.ts`

Puro, sem Firebase e sem React. `DataISO` entra e sai; `Timestamp` não atravessa.

```ts
export type FrescorDaContagem = "FRESCA" | "ENVELHECENDO" | "VENCIDA" | "NUNCA";

/** A contagem de um insumo, do ponto de vista de quem vai decidir se confia. */
export interface ContagemDoInsumo {
  frescor: FrescorDaContagem;
  /** O que ela contou. `null` em `VENCIDA` e `NUNCA`: não é zero, é "não sei". */
  quantidade: number | null;
  /** Dias desde a contagem. `null` quando não há data. */
  idadeEmDias: number | null;
  /** O número que está gravado, mesmo quando não se confia nele. */
  anotado: number | null;
}

/** Uma linha da tela de contagem. `digitado: null` é "não contei esta". */
export interface LinhaDeContagem {
  insumoId: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidadeBase: UnidadeBase;
  contagem: ContagemDoInsumo;
  /** O que entrou pela compra, em unidade base. Zero quando não há compra. */
  entrada: number;
  /** A sugestão semeada, ou `null` quando não há o que sugerir. */
  sugestao: number | null;
}
```

As funções:

| Função                                           | O que faz                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `IDADE_FRESCA_DIAS` / `IDADE_VENCE_DIAS`         | 7 e 30. Constantes exportadas, porque a tela também as diz         |
| `frescorDaContagem(contadoEmISO, hojeISO)`       | os quatro estados. Data no futuro é dedo errado e vale `FRESCA`    |
| `contagemDoInsumo(insumo, hojeISO)`              | `ContagemDoInsumo`: é aqui que `VENCIDA` vira `quantidade: null`   |
| `estoqueParaLista(insumo, hojeISO)`              | o número que a lista desconta: `quantidade ?? 0`                   |
| `rotuloDeIdade(contagem)`                        | "contada hoje", "há 12 dias", "há mais de um mês", "nunca contada" |
| `sugestaoDaContagem(contagem, entrada, hojeISO)` | a decisão 9, inteira, em uma função testável                       |
| `entradasDaNota(linhas)`                         | por `insumoId`, o que a nota trouxe em unidade base                |
| `entradasDaLista(itens, insumos)`                | idem, do que foi marcado como comprado na lista                    |
| `linhasParaContar(insumos, entradas, hojeISO)`   | a tela inteira, na ordem do corredor                               |
| `resumoDaContagem(linhas, digitados)`            | contadas, zeradas, intocadas — o rodapé                            |

**`sugestaoDaContagem` é a função onde mora o risco desta spec**, e as regras dela são as da
decisão 9, deterministas de propósito:

1. `entrada === 0` → `null`. Não há compra, não há semente: o campo nasce vazio.
2. `frescor === 'VENCIDA'` ou `'NUNCA'` → `entrada`. Só o que entrou.
3. Contagem de **hoje** → `quantidade`, sem soma. Os mesmos pacotes não entram duas vezes.
4. `FRESCA` de outro dia, ou `ENVELHECENDO` → `quantidade + entrada`.

**A contagem é em unidade base, e não em pacote.** É como a lista pensa e é como o insumo
guarda; "2 pacotes e meio" seria uma segunda conversão a manter, com o tamanho da embalagem
mudando debaixo dela quando a marca do mercado muda. A linha diz a unidade ao lado do campo,
e o número anterior aparece formatado por `formatarQuantidade`, que já existe.

### O que muda no schema

```ts
// src/lib/types/insumos.ts
// ---- Estoque (opcional, alimenta a lista de compras) ----
estoqueAtual?: number;
/**
 * O dia em que ela contou, e não o instante: a idade se conta em dias.
 * Ausente é "nunca contado" — e a lista não desconta o que não sabe.
 */
estoqueContadoEmISO?: DataISO;
ultimaCompraEm?: Timestamp;
```

`estoqueMinimo` sai daqui, de `esquemaInsumo`, de `DadosInsumo`, de `dadosDoInsumo`, de
`corpoDeInsumoNovo`, de `corpoDeAtualizacao` e de `estoqueBaixo`.

`DadosInsumo` ganha `estoqueContadoEmISO?: DataISO`, e `dadosDoInsumo` o carrega adiante como
carrega todos os outros — é o que faz a decisão 3 valer para os caminhos que não contam.

### A mutação: `src/lib/firebase/mutations/estoque.ts`

```ts
export interface ContagemGravavel {
  insumo: Insumo;
  /** O que ela digitou, em unidade base. Nunca `null`: a tela já filtrou. */
  quantidade: number;
}

export async function salvarContagem(
  contaId: string,
  contagens: ContagemGravavel[],
  hojeISO: DataISO,
): Promise<number>;
```

**Uma contagem é um lote, e não N salvamentos**, pelo mesmo motivo de `importarNota`: vinte
`updateDoc` em sequência seriam vinte idas ao servidor e uma falha parcial possível no meio
— metade da despensa datada, e ela sem saber qual metade.

Duas coisas que a mutação **não** faz, e as duas importam:

- **Não passa por `corpoDeAtualizacao`.** Aquele corpo reescreve o documento inteiro a partir
  de um `DadosInsumo`, e uma contagem toca dois campos. O lote escreve
  `{ v, estoqueAtual, estoqueContadoEmISO, atualizadoEm }` e nada mais — o que ela não
  contou não pode ser sobrescrito por um caminho que não estava falando daquilo.
- **Não marca ficha nenhuma.** Estoque não entra em custo de receita: quem envelhece ficha é
  preço, embalagem e perda (`precoMudou`). Contar a despensa não muda o custo de um cookie.

### A tela de contagem

Rota nova `/insumos/contagem`, **página e não painel**, pelo mesmo argumento de
`/insumos/nota` (`DECISOES.md#d50`): a invariante do `CLAUDE.md` é sobre formulário de **um**
objeto, e aqui são de seis a trinta e quatro campos numéricos. Em 360px isso não cabe em uma
folha inferior.

**As entradas para ela ficam em `/compras`, e não em `/insumos`.** Contar é ato de compra: o
número existe para a lista, é contado antes de sair de casa ou depois de guardar as sacolas,
e `/insumos` é onde o custo por grama mora. O cabeçalho de `/insumos` já tem duas ações e um
botão flutuante no celular; uma terceira ali seria empilhar por arrumação, e não por uso.

- **Cabeçalho de `/compras`**, ao lado de "Refazer" — e presente **também quando não há
  lista**, porque domingo à noite sem pedido confirmado é exatamente quando ela conta.
- **A frase da contagem velha ou ausente**, na própria lista, com o atalho junto do motivo.
- **A etapa "pronto" da leitura de nota**, semeada. É a 7B.
- **O bloco de fechar a lista**, semeado pelo que foi marcado. É a 7B.

O que a tela mostra, por linha, agrupada por corredor (`agruparPorCorredor`, que já existe):

- **O nome**, e nada de preço: esta tela não fala de dinheiro.
- **O campo**, `inputMode="decimal"`, com a unidade base como sufixo, **nascendo vazio**.
- **A referência, embaixo do campo**: `500 g · contados há 12 dias`, ou `500 g anotados, sem
contagem`, ou `nunca contado`. É a frase que explica por que a lista está comprando o que
  ela acha que já tem.

No rodapé fixo, no mesmo padrão dos outros quatro: `4 de 5 contados · 1 zerado`, e a ação
primária "Salvar a contagem". Salvar volta para onde ela veio — o efeito que ela quer ver
está na outra tela.

### Caso de aceite, com números

A conta tem os cinco insumos do caso de aceite da 3C. Antes: a farinha tem `estoqueAtual`
500 g e **nenhuma data**, o saquinho tem 50 un e nenhuma data, os outros três não têm
estoque. Hoje é **03/09/2026**.

O que a tela mostra:

| Corredor     | Insumo    | Campo | A referência embaixo         |
| ------------ | --------- | ----- | ---------------------------- |
| Ingredientes | Chocolate | vazio | nunca contado                |
| Ingredientes | Farinha   | vazio | 500 g anotados, sem contagem |
| Ingredientes | Manteiga  | vazio | nunca contada                |
| Embalagens   | Caixa     | vazio | nunca contada                |
| Embalagens   | Saquinho  | vazio | 50 un anotados, sem contagem |

Ela digita: farinha **620**, chocolate **0**, manteiga **480**, saquinho **50**. Não toca na
caixa. O rodapé diz **4 de 5 contados · 1 zerado**.

Depois de salvar, no banco:

| Insumo    | `estoqueAtual` | `estoqueContadoEmISO` |
| --------- | -------------- | --------------------- |
| Farinha   | 620            | `2026-09-03`          |
| Chocolate | 0              | `2026-09-03`          |
| Manteiga  | 480            | `2026-09-03`          |
| Saquinho  | 50             | `2026-09-03`          |
| Caixa     | ausente        | ausente               |

Os números que provam cada regra:

- **O saquinho prova a decisão 3.** 50 entra e 50 sai, e a data vira hoje. Se a data viesse
  de um diff, esta linha não gravaria nada — e a lista continuaria desconfiando do número
  que ela acabou de conferir na prateleira.
- **O chocolate prova que zero é contagem.** `0` grava `estoqueAtual: 0` **e** a data. É o
  único jeito de a lista saber que não há chocolate, em vez de não saber nada.
- **A caixa prova que intocado não se grava.** Nenhuma escrita, nenhuma data. A lista
  continua sem saber quantas caixas existem, o que é a verdade.
- **A farinha prova que número sem data não semeia campo.** O campo nasce vazio com os 500 g
  ao lado, e não pré-preenchido: pré-preencher datava um número de março com o dia de hoje.
- **Uma escrita só.** Quatro documentos em um `writeBatch`, despachado sem `await` — e a tela
  desenha o resultado no toque, com o selo de sincronização dizendo o resto.

## Critérios de aceite 7A

- [ ] `tests/domain/estoque.test.ts` cobre o caso de aceite linha por linha, os quatro
      estados de `frescorDaContagem` nas bordas exatas (7, 8, 30 e 31 dias, mais ausência),
      e as quatro regras de `sugestaoDaContagem` — inclusive a de hoje, que não soma.
- [ ] `diasEntre` em `tests/domain/datas.test.ts`, com a virada de mês e de ano, no fuso do
      aparelho e nunca em UTC.
- [ ] A tela lista todo insumo não arquivado por corredor, com campo vazio e a referência
      certa nos três casos: contagem com data, número sem data, e nunca contado.
- [ ] Salvar grava **só as linhas tocadas**, em um lote, com a data de hoje — conferido no
      banco, com uma linha digitada igual ao valor anterior e uma linha digitada `0`.
- [ ] Salvar **não** marca ficha nenhuma como `custoDesatualizado`, e **não** empurra entrada
      em `historicoPrecos`.
- [ ] Corrigir o preço de um insumo por `/compras` **não** mexe em `estoqueContadoEmISO`.
- [ ] Sem rede, a contagem salva do mesmo jeito: a tela não fica presa em "salvando", e o
      selo de sincronização aparece.
- [ ] `estoqueMinimo` não existe mais em `types`, `schemas`, `mutations` nem em componente, e
      `grep` no repositório não o encontra fora de `docs/`.
- [ ] A lista de compras continua produzindo **exatamente** os R$ 120,00 da 3C. Esta sessão
      não muda o comportamento dela.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

---

# Sessão 7B · A lista para de confiar em número velho

## Escopo

`montarLista` passa a olhar a idade, `/compras` passa a dizer o que está fazendo, e a compra
passa a propor a contagem.

### O que muda em `montarLista`

Duas mudanças de assinatura, e nada além:

```ts
export interface InsumoParaLista {
  // …
  estoqueAtual?: number;
  estoqueContadoEmISO?: DataISO; // novo
}

export function montarLista(
  demanda: Demanda,
  insumos: InsumoParaLista[],
  hojeISO: DataISO, // novo
): ListaMontada;
```

E dentro, uma linha: `const estoque = estoqueParaLista(insumo, hojeISO)` no lugar de
`Math.max(0, insumo.estoqueAtual ?? 0)`.

**Nenhum campo novo em `LinhaDaLista`, e nenhum em `ItemListaCompras`.** `estoqueAtual` da
linha continua sendo _o número que foi descontado_ — zero quando a contagem venceu —, e o
**motivo** não precisa ser gravado porque ele está no insumo vivo, que a tela já tem na mão
(`LinhaCompra` recebe `insumo?: Insumo` desde a 3C). Gravar o frescor seria congelar uma
idade que envelhece sozinha dentro de um documento que ninguém reescreve.

`LinhaJaTem` passa a receber o insumo vivo pelo mesmo motivo, para poder dizer "você tem
50 un, contados há 3 dias" em vez de só o número.

**A ordem das operações não muda.** Física primeiro, estoque depois, pacote por cima
(`#d09`). O que muda é **se** o estoque entra na conta.

### O que `/compras` passa a dizer

Três frases, e cada uma tem um gatilho diferente.

**A contagem vencida ou ausente**, no topo da lista, com o atalho:

> A lista está comprando tudo, sem descontar o que você já tem: **3 insumos** estão sem
> contagem recente. Contar leva dois minutos e pode tirar itens do carrinho.

**A contagem envelhecendo**, na linha, sem alarme e sem bloco próprio — é uma informação, e
não um problema:

> 500 g · contados há 14 dias

**A lista mais velha que a contagem.** Contar depois de montar a lista não muda a lista
gravada — `/compras` desenha `lista.itens`, e quem refaz é o botão. Sem frase, contar
pareceria não fazer nada:

> Você contou a despensa depois de montar esta lista. Toque em **Refazer** para descontar o
> que você tem — o que já está marcado continua marcado.

A divergência é medida em **`quantidadePacotes`**: se o que `montarLista` produziria agora
difere do que está gravado em alguma linha, a frase aparece. É deliberadamente não específica
de estoque — a mesma comparação pega correção de preço e mudança de embalagem —, e ela se
apaga sozinha depois de "Refazer", que é o que uma frase de divergência precisa fazer.

### A compra propondo a contagem

Duas entradas, uma função, uma tela.

- **Ao fim da leitura de nota.** A etapa "pronto" de `TelaNota` ganha a segunda ação:
  **"Guardar na despensa"**, que abre `/insumos/contagem` com os campos semeados por
  `entradasDaNota` das linhas mantidas.
- **Ao fechar a lista de compras.** O bloco de confirmação de "Fechar esta lista" ganha a
  mesma ação, semeada por `entradasDaLista` do que foi marcado como comprado.

A semente atravessa como estado de navegação, e **não** como parâmetro de URL: são de seis a
vinte pares `insumoId → quantidade`, e uma querystring com isso dentro é um lugar novo onde
número de negócio pode ser reescrito à mão. A tela sem semente é a mesma tela, com os campos
vazios — é o caminho de quem chega por `/compras`.

Cada linha semeada diz de onde a sugestão saiu, porque uma sugestão sem procedência é um
número que ela não tem como conferir:

> 620 g contados há 4 dias + 1 kg da nota

E, nos dois casos em que a soma não acontece:

> sem contagem recente · sugerimos o 1,01 kg que a nota trouxe

> contada hoje · a compra não foi somada de novo

### Caso de aceite, com números

O pedido do caso de aceite da 3C — 20 cookies e 2 caixas com 6, que são 32 cookies —, hoje
**03/09/2026**. A farinha tem 500 g e o saquinho 50 un. O que muda é **a data da contagem**,
e mais nada.

**Cenário A · contadas em 03/09 (hoje).**

| Insumo    | Útil  | Perda | Físico   | Contagem     | Comprar  | Pacotes   | Custo    |
| --------- | ----- | ----- | -------- | ------------ | -------- | --------- | -------- |
| Farinha   | 800 g | 5%    | 842,11 g | 500 g · hoje | 342,11 g | 1 × 1 kg  | R$ 12,50 |
| Chocolate | 480 g | 0%    | 480 g    | —            | 480 g    | 1 × 1 kg  | R$ 40,00 |
| Manteiga  | 320 g | 0%    | 320 g    | —            | 320 g    | 1 × 500 g | R$ 17,50 |
| Saquinho  | 32 un | 0%    | 32 un    | 50 un · hoje | 0        | 0         | R$ 0,00  |
| Caixa     | 2 un  | 0%    | 2 un     | —            | 2 un     | 1 × 25 un | R$ 50,00 |

Total **R$ 120,00**. São os mesmos R$ 120,00 da 3C, número por número, e este cenário é o
critério de regressão da sessão inteira.

**Cenário B · contadas em 20/08 (14 dias).** Os mesmos números e o mesmo total de
**R$ 120,00**. O que muda são as palavras: a linha da farinha diz "500 g · contados há 14
dias", a do saquinho o mesmo, e nada some do bloco "Não precisa comprar".

**Cenário C · contadas em 20/07 (45 dias), ou sem data nenhuma.**

| Insumo    | Físico   | Contagem | Comprar  | Pacotes    | Custo    |
| --------- | -------- | -------- | -------- | ---------- | -------- |
| Farinha   | 842,11 g | vencida  | 842,11 g | 1 × 1 kg   | R$ 12,50 |
| Chocolate | 480 g    | —        | 480 g    | 1 × 1 kg   | R$ 40,00 |
| Manteiga  | 320 g    | —        | 320 g    | 1 × 500 g  | R$ 17,50 |
| Saquinho  | 32 un    | vencida  | 32 un    | 1 × 100 un | R$ 30,00 |
| Caixa     | 2 un     | —        | 2 un     | 1 × 25 un  | R$ 50,00 |

Total **R$ 150,00**.

Os números que provam cada regra:

- **A farinha prova que vencer não custa sempre.** 342,11 g e 842,11 g fecham no mesmo
  pacote de 1 kg: R$ 12,50 nos três cenários. Deixar de descontar uma contagem vencida não é
  multiplicar a compra — é parar de apostar.
- **O saquinho prova o preço de vencer, e ele é R$ 30,00.** É a única linha em que a
  contagem decidia alguma coisa, e é exatamente a diferença entre A e C.
- **O bloco "Não precisa comprar" desaparece no cenário C.** Ele existe para o que o estoque
  cobre, e uma contagem vencida não cobre nada. No cenário A ele tem o saquinho; no C, nada.
- **A e B têm os mesmos números e frases diferentes.** É o que separa "a lista mudou de
  comportamento" de "a lista avisou o que está fazendo", e é o estado que existe para não
  jogar no lixo uma contagem de duas semanas.
- **A soma de C é R$ 150,00 contra R$ 120,00**, e a conta que interessa é a outra: R$ 30,00
  de celofane parado contra 32 cookies sem saquinho na sexta.

**A nota semeando a contagem.** Sobre o caso de aceite da 006, lido em 03/09, com a
contagem da 7A feita em **30/08** (4 dias):

| Linha da nota                      | Trouxe | Contagem antes   | Sugestão   |
| ---------------------------------- | ------ | ---------------- | ---------- |
| Farinha, 1 × 1 kg                  | 1000 g | 620 g, há 4 dias | **1620 g** |
| Chocolate meio amargo, 1 × 1,01 kg | 1010 g | 0 g, há 4 dias   | **1010 g** |
| Manteiga com sal, 2 × 500 g        | 1000 g | 480 g, há 4 dias | **1480 g** |
| Caixa para 6 doces, 1 × C/25       | 25 un  | nunca contada    | **25 un**  |
| Saquinho de celofane, 1 × C/100    | 100 un | insumo novo      | **100 un** |

- **A farinha prova a soma.** 620 + 1000 = 1620, e a linha diz as duas parcelas.
- **O chocolate prova que zero soma.** A contagem é `0` e é fresca, então 0 + 1010 = 1010 —
  o mesmo número que sairia de "nunca contado", por um caminho diferente e com outra frase.
- **A manteiga prova que a linha da nota é `quantidade × embalagem`.** Duas embalagens de
  500 g são 1000 g de entrada, e não 500.
- **A caixa e o celofane provam a regra do "sem contagem recente".** A sugestão é só o que
  entrou, e a frase diz isso em vez de fingir um saldo.
- **Salvar e depois fechar a lista da mesma compra não dobra nada.** A segunda oferta
  encontra as contagens de hoje, sugere o que está lá e diz "contada hoje".

## Critérios de aceite 7B

- [ ] `tests/domain/listaCompras.test.ts` continua passando com os R$ 120,00 intactos, agora
      com `hojeISO` e contagem fresca em toda fixture.
- [ ] Os três cenários em teste: **R$ 120,00** fresca, **R$ 120,00** envelhecendo,
      **R$ 150,00** vencida, mais o cenário sem data nenhuma, que precisa dar os mesmos
      R$ 150,00.
- [ ] O saquinho sai do bloco "Não precisa comprar" e entra no carrinho a R$ 30,00 quando a
      contagem vence, e o bloco desaparece por não ter mais linha.
- [ ] A farinha custa R$ 12,50 nos três cenários, provado em teste: vencer não multiplica.
- [ ] `estoqueParaLista` devolve zero para contagem vencida e para ausência, e o número
      contado para fresca e envelhecendo.
- [ ] `/compras` diz a frase da contagem ausente, a idade na linha, e a frase da lista mais
      velha que a contagem — esta última apagando-se sozinha depois de "Refazer".
- [ ] A etapa "pronto" da nota oferece a contagem semeada, e os cinco números da tabela
      acima aparecem nos campos, cada um com a sua frase de procedência.
- [ ] Fechar a lista oferece a contagem semeada pelo que foi marcado como comprado.
- [ ] Ler a nota, guardar na despensa e depois fechar a lista da mesma compra **não** dobra
      nenhum número.
- [ ] `LinhaInsumo` mostra a contagem e a idade, com o selo `atencao` de "Contagem vencida" —
      com ícone e texto, e nunca só a cor.
- [ ] `ESTADO.md` e `DECISOES.md` atualizados: as sete decisões da abertura viraram `#d56` a
      `#d62` na 7A, e as duas desta sessão são `#d63` e `#d64`. **A linha "Estoque continua
      sendo número digitado" sai da tabela de dívidas**, e a linha nova que entra é a da
      contagem que depende de ela contar.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

**O que continua sem prova, e é do roteiro em navegador abaixo:** `npm test` cobre
`src/lib/domain/`, então a tela de contagem, o lote e as três frases de `/compras` moram fora
dele.

## O roteiro em navegador, ao fim da 7B

Curto, e cada passo constrói o estado do seguinte. Nas duas passagens de sempre: tema claro
e 360px.

1. **Abrir `/compras` com o estoque de antes desta spec.** A frase da contagem ausente
   precisa aparecer, e o carrinho precisa estar maior do que estava — é a decisão 8
   acontecendo sobre dado real, e é o momento mais estranho da spec vista de fora.
2. **Contar a despensa inteira no celular**, com o teclado aberto e o rodapé fixo. É o quinto
   rodapé fixo do sistema e a tela com mais campos numéricos dele. A pergunta é se o campo da
   linha que ela está digitando fica visível.
3. **Voltar para `/compras` e refazer.** O carrinho precisa encolher, e o bloco "Não precisa
   comprar" precisa reaparecer com o que a contagem cobriu.
4. **Contar de novo, com a lista já montada, e não refazer.** A frase da lista mais velha que
   a contagem precisa aparecer. Refazer, e ela precisa sumir.
5. **Contar uma linha com o mesmo número de antes.** A data precisa virar hoje — é a decisão
   3, e é a que mais fácil se implementa errado.
6. **Contar uma linha com `0`, e deixar outra em branco.** A de `0` grava; a em branco não
   aparece no documento e continua com a data que tinha.
7. **Ler uma nota e tocar em "Guardar na despensa".** Os campos semeados, as frases de
   procedência, e a soma certa na linha do insumo já contado.
8. **Fechar a lista da mesma compra, logo depois.** A segunda oferta não pode dobrar número
   nenhum: as contagens são de hoje e aparecem como estão.
9. **Contar com o app sem rede**, que é o cenário da decisão 7. A tela não pode ficar presa
   em "salvando", o número precisa aparecer no toque, e o selo de sincronização precisa
   contar a verdade. Voltar a rede e ver subir.
10. **Corrigir o preço da farinha pela lista**, e conferir em `/insumos` que a data da
    contagem **não** se mexeu.

---

# Sessão 7C · reservada

Para o que a 7B achar e não couber nela. Se o módulo de domínio, a mutação e a tela da 7A
tomarem a sessão inteira, **a 7A para na tela de contagem salvando de `/compras`**, e a
semeadura pela nota e pelo fechamento da lista passa para a 7C. A degradação é planejada: a
decisão 8 sozinha já resolve a metade que importa da dívida — a lista deixa de mentir —, e a
decisão 9 é a que torna a contagem confortável.

O que **não** se degrada: a 7B não pode entregar a decisão 8 sem as frases. Uma lista que
passa a comprar mais e não diz por quê é pior do que a lista de hoje.

---

## Fora de escopo, nas duas sessões

- **Baixa automática na produção.** Continua fora, e pelo mesmo motivo de sempre: ela produz
  fora do sistema, e um saldo que só o sistema mexe fica errado na primeira fornada não
  registrada. Esta spec é a resposta ao problema que a baixa automática prometia resolver, e
  é por isso que ela pode continuar fora.
- **Entrada automática na compra.** Decisão 9. A compra propõe; ela grava.
- **Histórico de contagens.** Uma coleção `contagens` responderia "quanto eu tinha em
  agosto?", e essa pergunta não tem consequência nenhuma no sistema — nenhuma tela a faria,
  nenhum número mudaria com a resposta. O que a despensa tem **hoje** tem consequência, e é
  o que o campo guarda. Se um dia virar pergunta real, nasce com spec própria.
- **Contar em pacote em vez de unidade base.** "2 pacotes e meio de farinha" é uma segunda
  conversão a manter, com o tamanho da embalagem mudando debaixo dela quando ela troca de
  marca. A tela pode oferecer isso um dia como conveniência de digitação; o que se grava
  continua sendo unidade base.
- **Alerta de estoque baixo por limiar.** É o `estoqueMinimo` voltando com outro nome, e a
  decisão 6 diz por que ele saiu.
- **Valorizar a despensa** — "quanto tem parado em insumo". É uma multiplicação sobre dado
  que só passa a existir depois desta spec, e é uma spec de meia hora **depois** de haver
  contagem confiável para multiplicar. Fazê-la agora seria dar um número em reais para uma
  despensa que ninguém contou.
- **Reserva de estoque por pedido.** Dois pedidos para a mesma sexta disputando a mesma
  farinha é um problema real e não é deste tamanho: exige saldo, e saldo é o que a decisão 1
  recusa.
- **Contagem por lote ou por validade.** Confeitaria artesanal com uma pessoa não tem
  rastreabilidade de lote, e inventá-la aqui seria trocar uma tela de dois minutos por um
  cadastro.
- Tudo que já está registrado como dívida com gatilho próprio em `ESTADO.md`.

## Decisões que esta spec toma, e que são fáceis de rejeitar

- **Não descontar contagem vencida.** É a decisão de maior efeito e a mais discutível: o
  carrinho cresce, e cresce com dinheiro real. O argumento está na decisão 8, e o número
  está no cenário C: R$ 30,00. Rejeitá-la é escolher o erro de comprar de menos, e ele
  aparece na quinta-feira à noite.
- **Sete e trinta dias, e não outro par.** Os dois números saem do ciclo dela e do horizonte
  da própria lista, e não de uma teoria de estoque. São constantes exportadas de propósito:
  mudá-las é uma linha, e a tela diz o número que estiver lá.
- **O campo nasce vazio.** A alternativa — semear com o valor anterior — é mais confortável
  de digitar e destrói a única coisa que esta spec constrói, que é a diferença entre um
  número conferido e um número herdado.
- **`estoqueMinimo` removido, e não implementado.** Implementá-lo custaria um campo por
  insumo no formulário e vinte palpites para ela manter. A decisão 6 diz o que responde a
  mesma pergunta de graça.
- **A entrada mora em `/compras`, e `/insumos` não ganha botão.** É uma escolha de uso contra
  uma de arrumação: a despensa se conta para a lista, e o cabeçalho de `/insumos` já tem
  duas ações e um flutuante.
- **A semente viaja como estado de navegação, e não na URL.** Custa um pouco mais de código
  do que uma querystring e fecha um lugar onde número de negócio poderia ser digitado por
  quem não é ela.
- **Nada novo é gravado na lista de compras.** A idade da contagem não entra em
  `ItemListaCompras`, porque uma idade congelada dentro de um documento que ninguém reescreve
  envelhece errado. A tela lê o insumo vivo.

## Riscos

**O risco alto é ela não contar, e ele não se resolve escrevendo código.** A spec inteira
aposta que contar fica barato o suficiente para acontecer. Se não acontecer, o resultado é
pior do que hoje em um sentido: hoje a lista usa um número velho e compra mais ou menos
certo; depois desta spec ela não usa nada e compra o cheio, toda semana. As três defesas são
deliberadas e é assim que se sabe se funcionaram: **o erro é o barato** (decisão 8), a
contagem é **semeada pela compra** (decisão 9), e o momento oferecido é o único em que ela
já está de pé na frente da despensa com as sacolas na mão. O passo 1 do roteiro é onde isso
se mede pela primeira vez, e o passo 3 é onde ela vê o carrinho encolher — que é o único
argumento que vai fazê-la contar na semana seguinte.

**O risco médio é o teste da 3C.** `listaCompras.test.ts` é um dos maiores arquivos de teste
do projeto e `montarLista` ganha um parâmetro. Toda fixture precisa passar a data e uma
contagem fresca, e os R$ 120,00 precisam sobreviver byte por byte. Se não sobreviverem, o
defeito é da mudança e não do teste — e é por isso que o cenário A existe como critério
separado.

**O risco baixo é a tela.** Trinta e quatro campos numéricos em uma página, rodapé fixo,
teclado aberto em 360px. É o quinto rodapé fixo do sistema e o padrão é conhecido; o que é
novo é a densidade, e ela se resolve com corredor e alvo de 44px.

**O risco que não é desta spec, mas que ela expõe:** a primeira abertura de `/compras`
depois do deploy muda o carrinho de uma usuária que não pediu nada. Não há como escalonar
isso — não existe data honesta para o estoque já gravado —, então o que existe é a frase e o
atalho. Vale rodar o passo 1 do roteiro **antes** de considerar a sessão fechada, e não
depois.

## Aprovações pedidas

1. **`Insumo.estoqueContadoEmISO?: DataISO`**, campo opcional novo. Mudança compatível:
   documento antigo sem o campo continua válido, e a ausência tem significado definido.
2. **Remover `Insumo.estoqueMinimo`**, e com ele a chave do `esquemaInsumo`, a de
   `DadosInsumo`, as duas escritas e o selo que nunca disparou. Nenhuma tela nunca o
   escreveu, então nenhum documento tem valor real ali e não há dado a migrar — mas é uma
   remoção de campo, e ela é da dona do negócio.
3. **A lista de compras muda de comportamento em dado já gravado.** Todo `estoqueAtual` sem
   data passa a valer "não sei", e o carrinho da primeira lista depois desta spec cresce. É
   a decisão 8 e é a única desta spec com efeito imediato em dinheiro.

Nenhuma dependência de produção entra ou sai, nenhuma regra de segurança muda, nenhum
serviço externo entra, e nenhum índice novo é preciso: a tela de contagem usa a mesma
consulta que `/insumos` já roda — `arquivado == false` ordenado por `nomeBusca` —, cujo
índice está publicado desde a 4A.
