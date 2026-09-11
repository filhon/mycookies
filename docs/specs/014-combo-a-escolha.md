# Spec 014 · O combo à escolha

**Tipo:** funcionalidade. O kit deixa de ser só uma caixa de conteúdo fixo e passa a poder dizer
"2 cookies, a cliente escolhe quais, pelo preço fixo". Três campos aditivos (dois em
`FichaTecnica`, um em `ItemPedido`), um bloco novo no editor de ficha, a escolha na linha do
pedido, e a explosão de demanda seguindo o que foi escolhido. Nenhuma coleção nova, nenhuma
rota, nenhum índice.
**Tamanho:** duas sessões — `14A` o combo existe e é vendido, `14B` o combo produz.
**Origem:** relato de uso, na sessão 13D. O "combo dupla" tem preço fixo e a cliente escolhe os
dois sabores. O sistema só sabe montar kit de conteúdo fixo, e o que ela faz hoje é lançar os
cookies soltos e um desconto que não é desconto.
**Depende de:** nada. Não encosta na 5B, e não encosta na 013: o que a 013 gravou continua
valendo linha a linha.
**Aprovações pedidas:** três campos aditivos, listados ao fim. Regra de segurança não muda.

---

## Problema

`FichaTecnica.tipo = "KIT"` modela uma caixa com conteúdo fixo: `componentes[]` diz "6 × Cookie
tradicional", e o custo, a demanda e a fornada saem daí (`#d11`). É o modelo certo para a caixa
com 6 do mesmo, e é o modelo errado para o que ela mais vende como combo: **"combo dupla, R$
12,00, escolha dois sabores"**. O kit como está fixa os sabores; o combo que a operação vende
fixa o preço e deixa o sabor com a cliente.

O contorno dela — lançar os cookies soltos com o preço unitário e pôr a diferença em
`desconto` — fecha o total, e é por isso que passou despercebido. O que ele torce fica em três
lugares:

1. **O combo nunca existe como produto.** O ranking do mês diz "6 × Cookie tradicional" e nunca
   diz "3 × Combo dupla". Ela vende combo, e o sistema não sabe.
2. **O desconto vira o lugar de uma diferença de preço.** `Pedido.desconto` era "R$ 5,00 para a
   cliente fiel"; passa a carregar também "R$ 9,00 porque o combo é mais barato que dois soltos".
   Dois significados num campo é um número que ninguém consegue ler no fim do mês.
3. **A ficha do combo não tem como ser precificada.** Um kit com componentes fixos calcula o custo
   de **uma** das combinações possíveis. O preço fixo tem que fechar em qualquer escolha, e não
   há onde dizer isso.

O que **não** está torto, e vale dizer antes de mexer: `receitaPedidos` é o total com o desconto,
`custoDoVendido` é o custo dos cookies escolhidos de verdade, e o lucro do mês está certo. O
problema é de leitura e de precificação, não de caixa. É o que permite que esta spec seja
aditiva: nada gravado precisa ser corrigido.

---

## O que esta spec decide antes de qualquer código

Cinco decisões. Cada uma vira um `D` em `docs/DECISOES.md`: `#d98` a `#d102`.

### 1. O combo é o kit com escolhas, e não um tipo novo — `#d98`

`FichaTecnica.escolhas?: EscolhaDoKit[]`, ao lado de `componentes[]`, só em `KIT`:

```ts
export interface EscolhaDoKit {
  /** Quantas unidades desta escolha entram em UM kit. */
  quantidade: number;
  /** As receitas que servem: as vivas, do tipo SIMPLES, com esta categoria. */
  categoria: string;
}
```

Um kit pode ter as duas coisas: "caixa presente: 4 cookies à escolha + 1 brownie" é
`componentes: [brownie × 1]` mais `escolhas: [{ 4, "Cookie" }]`. Um terceiro `tipo` duplicaria
tudo o que o kit já tem — embalagem própria, custo pelo motor da receita, nível único do
`#d11` — para trocar um campo.

**A escolha é por categoria**, e não por lista de fichas. `FichaTecnica.categoria` já existe, já
é o que agrupa a lista e o relatório de vendas, e "qualquer cookie" é a frase dela. Um sabor
novo entra no combo no dia em que nasce, sem ela reabrir o combo. O preço disso está em
`Riscos`: categoria é texto livre, e renomear a categoria de uma receita a tira do combo.

### 2. O preço é fixo e o custo é congelado na escolha — `#d99`

`ItemPedido.escolhas?: EscolhaFeita[]`:

```ts
export interface EscolhaFeita {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  /** Por unidade do kit: num pedido de 3 combos, "1" aqui são 3 cookies. */
  quantidade: number;
  /** O `custoUnitario` da receita escolhida, congelado na hora (`#d08`). */
  custoUnitarioSnapshot: Centavos;
}
```

A linha do pedido continua sendo **uma** linha, com `fichaTecnicaId` do combo e `precoUnitario`
do combo. O que muda é o que `custoUnitarioSnapshot` da linha significa: passa a ser **o custo do
combo montado** — a base do kit (embalagem, componentes fixos, tempo) mais a soma das escolhas —
congelado no instante em que ela fecha a escolha.

É a decisão que mantém a spec pequena: `derivarPedido`, `subtotalDoItem`, `custoDoItem`,
`deltaDoPedido`, `agregarPedidos`, `marcarPedidoPago` e `recalcularMes` **não mudam uma linha**.
Para todos eles, um combo é um item com preço e custo, como sempre foi. `escolhas[]` fica
gravado ao lado para dizer o que foi escolhido (a cliente, a bancada, o WhatsApp) e para a
explosão de demanda (decisão 5).

### 3. O custo de referência do combo é o da opção mais cara — `#d100`

A ficha do combo precisa de um custo para o painel de preço funcionar, e o custo real depende de
uma escolha que ainda não aconteceu. Entre a média, a mais barata e a mais cara, **a mais cara**:
o preço é fixo, e um preço que fecha a margem na combinação mais cara fecha em todas. Uma média
prometeria uma margem que metade dos combos não entrega.

`FichaTecnica.custoEscolhas?: Centavos` grava essa parcela, ao lado de `custoComponentes`, pelo
mesmo motivo de todo derivado ser gravado (`#d04`). E o bloco "O custo do lote" diz a faixa —
"custa de R$ 4,90 a R$ 6,70 conforme a escolha" —, porque um custo de referência sem a faixa é
um número que ela não tem como conferir.

É também por este campo que a decisão 2 sabe qual é a base do kit:
`custoBase = custoUnitario − custoEscolhas`. Sem ele, o custo do combo montado teria que refazer
a conta da ficha inteira dentro do editor de pedido.

### 4. O combo é o produto vendido; os sabores de dentro não entram no ranking — `#d101`

`ResumoMensal.produtos` ganha a linha do combo — "3 × Combo dupla, R$ 36,00" — e **não** ganha
os cookies de dentro. O ranking é de faturamento, e o sabor dentro de um combo não fatura nada
sozinho: uma linha "Cookie de nutella · 3 un · R$ 0,00" seria a resposta certa para uma pergunta
que ninguém fez. `qtdItensVendidos` conta o combo como um item, pelo mesmo motivo.

O que se perde é "qual sabor sai mais dentro dos combos". É pergunta de produção, não de venda,
e o lugar dela é o dia em que houver histórico de produção como relatório — que a 013 deixou
fora de escopo de propósito. Está em `Fora de escopo` e em `fáceis de rejeitar`.

### 5. A demanda e a produção seguem o que foi escolhido — `#d102`

`explodirDemanda` passa a explodir `escolhas[]` junto dos componentes fixos: cada escolha entra
como `quantidade × unidades do kit ÷ rendimento da receita escolhida`, um nível só (`#d11`
continua valendo: a receita escolhida é `SIMPLES` por construção). Sem isto a lista de compras
compraria só o saquinho do combo, e **deixar de comprar é o erro caro** (`#d63`).

Tudo o que já lê `explodirDemanda` herda de graça: `montarLista`, `prometidoParaPedidos` e a
capacidade da 13B. A 14B faz o resto seguir a escolha — a frase "dá?" na linha do combo, o
atalho de fornada do pedido e o dono nos prontos (`#d97`) —, e diz o que a capacidade de um
combo **não** é: `capacidadeDaFicha` de um kit com escolhas devolve `null`, porque "dá para
quantos combos" depende de qual cookie, e a resposta mora na linha de cada receita.

---

# Sessão 14A · O combo existe e é vendido

## Escopo

### 1. `src/lib/types/fichas.ts` e `vendas.ts` — os três campos

```ts
// FichaTecnica
/** O que a cliente escolhe num kit (`DECISOES.md#d98`). Ausente ou vazio: conteúdo fixo. */
escolhas?: EscolhaDoKit[];
/** A parcela das escolhas no custo, pela opção mais cara (`#d100`). Zero sem escolhas. */
custoEscolhas?: Centavos;

// ItemPedido
/** O que foi escolhido para ESTE item, por unidade do kit (`#d99`). */
escolhas?: EscolhaFeita[];
```

`esquemaFicha` ganha `escolhas` (array de `{ quantidade: inteiro ≥ 1, categoria: texto não
vazio }`, categorias sem repetição, vazio em `SIMPLES`). `esquemaPedido` ganha `escolhas` por
item, e `errosDeLinha` continua jogando a falha na linha certa.

`Pedido.fichaIds` passa a espelhar também as fichas escolhidas: o espelho existe para
`array-contains`, e um pedido de combo com nutella **contém** nutella.

### 2. `src/lib/domain/custoFicha.ts`

```ts
/** As receitas que servem a uma escolha: vivas, SIMPLES, da categoria, e nunca o próprio kit. */
export function opcoesDaEscolha(
  escolha: EscolhaDoKit,
  fichas: FichaParaEscolha[],
  kitId?: string,
): FichaParaEscolha[];

/** A parcela das escolhas no custo de UM kit: a mais cara de cada, e a faixa. */
export function custoDasEscolhas(
  escolhas: EscolhaDoKit[],
  fichas: FichaParaEscolha[],
  kitId?: string,
): {
  referencia: Centavos;
  minimo: Centavos;
  maximo: Centavos;
  semOpcao: string[];
};
```

`EntradaCustoFicha` ganha `custoEscolhas: Centavos` (a referência, já calculada), e
`calcularCustoFicha` o soma em `custoTotalLote` como soma `custoComponentes`.
`CustoFichaCalculado` o devolve. `derivarFicha` recebe e repassa; `corpoDaFicha` grava
`escolhas` e `custoEscolhas`.

`semOpcao` são as categorias sem receita viva — a ficha do combo avisa, e o custo de referência
sai zerado nelas, com aviso, e não com `Infinity`.

`podeSerComponente` não muda: componente fixo continua sendo receita simples.

### 3. `src/lib/domain/pedido.ts`

```ts
/** O custo de um combo montado: a base do kit mais as escolhas (`#d99`). */
export function custoDoComboMontado(
  kit: { custoUnitario: Centavos; custoEscolhas?: Centavos },
  escolhas: EscolhaFeita[],
): Centavos;

/** As escolhas fecham o que o kit pede? Por categoria, nem a mais nem a menos. */
export function escolhasCompletas(
  kit: { escolhas?: EscolhaDoKit[] },
  escolhas: EscolhaFeita[],
  categoriaDe: (fichaId: string) => string | undefined,
): { completas: boolean; faltam: { categoria: string; quantidade: number }[] };

/** "1 Cookie tradicional + 1 Cookie de nutella" — o que foi escolhido, em uma frase. */
export function resumoDasEscolhas(escolhas: EscolhaFeita[]): string;
```

`resumoDosItens` e `mensagemDoPedido` (WhatsApp) passam a dizer a escolha entre parênteses:
"3 × Combo dupla (1 Cookie tradicional + 1 Cookie de nutella)". É o que a cliente confere.

### 4. `src/lib/domain/listaCompras.ts`

`PedidoParaExplodir.itens[]` ganha `escolhas?: { fichaTecnicaId: string; quantidade: number }[]`.
`explodirDemanda` explode cada escolha com `insumosPorLote` da receita escolhida, em
`quantidade × pedida ÷ rendimento`. Receita escolhida arquivada ou sem rendimento vira
pendência com o `nomeSnapshot` da escolha, como um componente fixo já vira.

**É a única mudança de comportamento em dado já gravado**, e o efeito é nulo enquanto nenhum
pedido tiver `escolhas`: os testes da 3C, da 7B e da 013 passam sem uma linha alterada.

### 5. `src/components/fichas/FormularioFicha.tsx` — "O que a cliente escolhe"

Bloco novo, só em `KIT`, entre "O que vai no kit" e "Embalagem do kit". Uma linha por escolha:
**quantas** (campo numérico, sufixo "un") **de qual categoria** (`Seletor` com as categorias das
receitas simples vivas). Embaixo de cada linha, a consequência: "3 receitas servem: Cookie
tradicional, Cookie de nutella e Cookie red velvet · a mais cara custa R$ 3,10" — ou, com ícone,
"nenhuma receita nesta categoria". Adicionar e remover como nas outras duas listas
(`useFieldArray`).

"O custo do lote" ganha a parcela "O que a cliente escolhe (pela opção mais cara)" e a frase da
faixa. O painel de preço não muda: ele já lê `custoUnitario`.

"Fornadas de reserva" (`#d96`) **some** em kit com escolhas: reservar "1 combo" não diz de que
sabor, e a reserva é das receitas.

### 6. `src/components/pedidos/` — a escolha na linha

Ao adicionar um kit com escolhas, a linha abre **embaixo dela mesma**, sem painel e sem modal, o
bloco de escolha: por categoria, "Escolha 2 cookies · 0 de 2", e a lista das receitas que servem,
cada uma com o nome, o preço unitário avulso em `micro` (para ela ver o que o combo está
substituindo) e um par de botões −/+ de 44px. Passa a ser possível **repetir o mesmo kit em duas
linhas** — três combos "tradicional + nutella" e um "dois nutella" são duas linhas —, o que hoje
`opcoesFicha` impede para toda ficha e passa a impedir só para as sem escolha.

A cada toque, `custoUnitarioSnapshot` da linha é refeito por `custoDoComboMontado`, e o rodapé
de totais acompanha. Salvar com escolha incompleta cai em `errosDeLinha`: "Faltam 2 cookies
neste combo." A escolha é congelada no salvamento e **não muda** quando o custo de um cookie
muda depois, pela mesma regra de `#d32`; o selo "usar o preço de hoje" continua existindo só
para o preço do combo.

`LinhaItemPedido` mostra o resumo das escolhas embaixo do nome, e a lista `/pedidos` o mostra em
`resumoDosItens`.

### 7. `tests/domain/`

`custoFicha.test.ts`, `pedido.test.ts`, `listaCompras.test.ts` e `whatsapp.test.ts` ganham o caso
de aceite abaixo, número por número, mais as bordas listadas nos critérios.

## Caso de aceite 14A, com números

Rateio operacional zerado, para o número ficar legível.

| Ficha              | Tipo    | Categoria | Custo unitário | Preço   |
| ------------------ | ------- | --------- | -------------- | ------- |
| Cookie tradicional | SIMPLES | Cookie    | R$ 2,20        | R$ 7,00 |
| Cookie de nutella  | SIMPLES | Cookie    | R$ 3,10        | R$ 8,00 |
| Brownie            | SIMPLES | Brownie   | R$ 4,00        | R$ 9,00 |

**Combo dupla**: `KIT`, rendimento 1, `itens: [saquinho kraft × 1 = R$ 0,50]`, `componentes: []`,
`escolhas: [{ quantidade: 2, categoria: "Cookie" }]`, preço manual R$ 12,00.

- `custoDasEscolhas` → `{ referencia: 620, minimo: 440, maximo: 620, semOpcao: [] }`. O brownie
  não entra: categoria errada.
- `custoTotalLote = 50 + 620 = 670`, `custoUnitario = 670`, `custoEscolhas = 620`. A frase:
  "custa de R$ 4,90 a R$ 6,70 conforme a escolha".

**O pedido**: 3 × Combo dupla, escolha "1 tradicional + 1 nutella" por combo.

- `custoDoComboMontado({ 670, 620 }, [trad × 1 @ 220, nutella × 1 @ 310])` → `670 − 620 + 530 = 580`.
- A linha: `precoUnitario 1200`, `custoUnitarioSnapshot 580`, `quantidade 3`, `subtotal 3600`,
  custo `1740`, sobra da linha `1860`. `desconto 0`.
- Compare com o contorno de hoje: 3 × R$ 7,00 + 3 × R$ 8,00 = R$ 45,00, desconto R$ 9,00. Mesmo
  total, e um desconto que não era desconto.
- `escolhasCompletas` com só "1 tradicional" → `{ completas: false, faltam: [{ Cookie, 1 }] }`.
- WhatsApp: `• 3 × Combo dupla (1 Cookie tradicional + 1 Cookie de nutella) — R$ 36,00`.

**A demanda** (tradicional: 500 g de farinha por lote de 20; nutella: 400 g por lote de 20;
saquinho kraft na embalagem do combo):

- 3 combos × 1 tradicional = 3 cookies = 0,15 lote → 75 g de farinha.
- 3 combos × 1 nutella = 3 cookies = 0,15 lote → 60 g de farinha.
- `explodirDemanda` → farinha **135 g**, saquinho kraft **3**, mais o que cada receita leva.

**O agregado**, quando o pedido é pago: `produtos["combo-dupla"] = { quantidade 3, receita 3600,
lucro 1860 }`, `qtdItensVendidos += 3`, e **nenhuma** linha para os cookies. `receitaPedidos` e
`custoDoVendido` são os mesmos de antes, porque `deltaDoPedido` não mudou.

## Critérios de aceite 14A

- [ ] Kit com `escolhas` grava `escolhas` e `custoEscolhas`; kit sem escolha grava
      `custoEscolhas: 0` e o resto igual ao de hoje. Ficha `SIMPLES` recusa `escolhas`.
- [ ] O custo de referência é o da opção mais cara de cada escolha, e a faixa aparece no bloco
      do custo. Categoria sem receita viva zera a parcela e avisa, com ícone.
- [ ] Na linha do pedido, escolha incompleta bloqueia o salvamento com a mensagem na linha;
      completa, grava `escolhas[]` com os snapshots e `custoUnitarioSnapshot` do combo montado.
- [ ] `derivarPedido`, `deltaDoPedido` e `agregarPedidos` **não mudaram**: os testes da 3A, 3B e
      4A passam sem alteração. O combo aparece no ranking; os sabores, não.
- [ ] `explodirDemanda` de um pedido de combo pede os insumos das receitas escolhidas mais a
      embalagem do combo; pedido sem `escolhas` explode exatamente como antes.
- [ ] Um pedido com o mesmo combo em duas linhas, escolhas diferentes, salva e explode as duas.
- [ ] `resumoDosItens` e a mensagem do WhatsApp dizem a escolha entre parênteses.
- [ ] O bloco de escolha na linha do pedido tem alvos de 44px e funciona em 360px; é inline, sem
      painel e sem modal.
- [ ] Portão de conclusão passando.

---

# Sessão 14B · O combo produz

## Escopo

O que a 013 responde por receita passa a responder também pela escolha.

- **A frase "dá?" na linha do combo.** `FraseCabeNoPedido` uma vez por receita escolhida, com
  `unidades = escolha.quantidade × quantidade da linha`, `jaFeitas` e `prontos` daquela receita.
  O combo não tem frase própria: `capacidadeDaFicha` devolve `null` para kit com escolhas
  (decisão 5), e `/fichas` não mostra capacidade nem pronto para ele.
- **O atalho "Registrar fornada" de `/pedidos/[id]`** (`#d92`): `opcoesDeFornada` de uma linha de
  combo são as receitas escolhidas, cada uma com `escolha.quantidade × quantidade`. A fornada
  grava `pedidoId`, e o abate da lista (`#d91`) funciona por insumo, sem mudança.
- **O dono nos prontos** (`#d97`): `reservadoNoPronto` conta as escolhas como unidades pedidas da
  receita escolhida. É o `ponytail:` deixado na 13D, pago aqui.
- **A reserva de produção** (`#d96`): `reservaDeProducao` e `fichasAbaixoDoPiso` pulam kit com
  escolhas, e o campo já sumiu do formulário na 14A.

## Critérios de aceite 14B

- [ ] Um pedido de 3 combos "tradicional + nutella" mostra duas frases de capacidade, uma por
      receita, cada uma para 3 unidades.
- [ ] "Registrar fornada" nesse pedido oferece as duas receitas com 3 unidades cada; a fornada
      abate a lista de compras daquele pedido.
- [ ] Com o pote de tradicional contado em 10 e massa feita para o pedido, os 3 do combo têm
      dono, e `/fichas` diz "7 unidades prontas além dos pedidos".
- [ ] `/fichas` não mostra capacidade, pronto nem piso para o combo.
- [ ] Portão de conclusão passando.

---

## Fora de escopo, nas duas sessões

- **Converter pedidos antigos** lançados como cookies soltos + desconto. O caixa deles está
  certo; o que mudaria é o ranking de meses passados, e reescrever pedido pago é o que `#d24`
  ensina a não fazer.
- **Ranking de sabores dentro dos combos.** É pergunta de produção (decisão 4), e nasce com o
  histórico de produção como relatório, que a 013 também deixou fora.
- **Preço por sabor dentro do combo** ("o de nutella custa R$ 1,00 a mais"). O combo tem preço
  fixo; se tiver adicional, é outro combo ou é item solto.
- **Escolha por lista de fichas** em vez de por categoria. Está em `fáceis de rejeitar`.
- **Kit dentro de kit** e escolha de kit. `#d11` continua: a receita escolhida é `SIMPLES`.
- **Escolha "qualquer receita"** (sem categoria). Toda receita tem categoria, e "qualquer" vira
  uma categoria no dia em que ela quiser.
- **Sugerir a escolha** (o mais vendido, o que tem pronto). A cliente escolhe; o sistema anota.

---

## Decisões desta spec que são fáceis de rejeitar

- **Escolha por categoria.** A alternativa é `fichaIds[]` explícito por escolha, mais robusto a
  renomear categoria e mais chato de manter: cada sabor novo exige reabrir cada combo. Se a
  operação mostrar que ela renomeia categoria e perde combo, a troca é o campo e o seletor.
- **A escolha é por unidade do kit, e não pelo total da linha.** "3 combos, 2 cookies cada" é 1
  - 1 por combo, e combos diferentes são linhas diferentes. A alternativa — "escolha 6 cookies
    para esta linha" — cabe mais numa linha só e quebra a escolha toda vez que a quantidade muda.
- **O custo de referência é o da mais cara.** Média seria mais "realista" e mentiria sobre a
  margem em metade dos combos. Se a faixa for tão larga que o preço fique alto demais, o problema
  é a categoria estar larga demais, e não a regra.
- **Os sabores não entram no ranking.** Contar unidade sem receita seria uma linha de R$ 0,00 no
  painel. Se "qual sabor sai mais" virar pergunta de verdade, ela nasce como relatório de
  produção, não como linha de faturamento.
- **A escolha abre inline, e não em painel.** Em 360px é uma lista curta com −/+; um painel para
  escolher dois entre três é um passo a mais no lugar onde ela está com o WhatsApp aberto. Se
  a categoria tiver dez sabores, a conversa é sobre busca, não sobre painel.

---

## Riscos

- **Categoria é texto livre.** Renomear "Cookie" para "Cookies" numa receita a tira de todo combo
  em silêncio. A ficha do combo diz quantas receitas servem e quais; a linha do pedido diz
  "nenhuma receita serve" com ícone e bloqueia. É visível, e não é silencioso — mas é o risco
  que faz a primeira decisão ser fácil de rejeitar.
- **`custoUnitarioSnapshot` muda de significado numa linha de combo.** Para o resto do sistema é
  o mesmo campo; para quem ler o documento, é o custo montado e não o da ficha. O comentário do
  tipo diz isso, e `escolhas[]` ao lado é a prova de onde o número veio.
- **Kit com escolhas e custo desatualizado.** Hoje nada marca um kit quando o custo de uma
  receita de dentro muda — `componenteIds` existe e ninguém o consulta. Com escolhas por
  categoria, o vínculo nem é por id. Salvar o combo refaz o custo com o de hoje, como já faz com
  os componentes fixos; a marcação automática é dívida que já existia e fica nomeada.
- **A explosão passa a depender do pedido gravado ter `escolhas`.** Pedido de combo salvo por uma
  versão antiga da tela (sem escolhas) explode só a embalagem. Não existe pedido assim hoje, e
  `escolhasCompletas` impede que nasça.
- **Repetir o mesmo kit em duas linhas** muda uma regra que valia para toda ficha. A regra
  continua para tudo o que não tem escolha; o teste de `opcoesFicha` precisa dizer isso.

---

## Aprovações pedidas

**Três campos, todos aditivos e compatíveis com o que já está gravado.**

1. **`FichaTecnica.escolhas?: EscolhaDoKit[]`** e **`FichaTecnica.custoEscolhas?: Centavos`**.
   Ficha gravada sem os dois lê como "conteúdo fixo, parcela zero", que é o que ela é.
2. **`ItemPedido.escolhas?: EscolhaFeita[]`**. Pedido gravado sem o campo é um pedido sem combo à
   escolha, que é todo pedido de hoje.
3. **Mudança de comportamento em dado já gravado:** `explodirDemanda` passa a explodir escolhas.
   Efeito nulo enquanto nenhum item tiver `escolhas`.

Nenhuma dependência nova, nenhuma regra de segurança tocada, nenhum índice novo, nenhuma rota.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado. Mais o roteiro de navegador de cada sessão — `npm test` cobre só `domain/`, e o bloco
de escolha, a linha do pedido e o formulário do combo não moram lá.

### O roteiro em navegador, 14A

1. Criar "Combo dupla" como kit com saquinho kraft e a escolha "2 de Cookie": o bloco lista as
   receitas que servem, o custo diz a faixa, e salvar grava `escolhas` e `custoEscolhas`.
2. Num pedido novo, adicionar o combo: a escolha abre embaixo da linha; salvar com 1 de 2 falha
   na linha; completar com 1 + 1 fecha o custo em R$ 5,80 e o rodapé acompanha.
3. Subir para 3 combos: a escolha continua 1 + 1 e o subtotal vai a R$ 36,00.
4. Adicionar o mesmo combo numa segunda linha com "2 de nutella": as duas linhas convivem.
5. O resumo do WhatsApp diz a escolha entre parênteses; `/pedidos` também.
6. Confirmar e "Montar a lista" em `/compras`: farinha dos dois sabores e o saquinho kraft
   aparecem, nas quantidades do caso de aceite.
7. Pagar: `/financeiro` mostra "Combo dupla" no ranking, e nenhum cookie solto.
