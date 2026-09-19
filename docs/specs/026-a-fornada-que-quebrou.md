# Spec 026 · A fornada que quebrou

**Tipo:** um campo opcional em `Fornada`, quatro funções no domínio que já existe
(`domain/producao.ts`), uma mutação irmã de `arquivarFornada`, um botão na linha de "Massas
registradas" e uma frase no bloco de produção do editor de produto. É a quarta spec da fase 1
do `docs/saas/ROADMAP.md`, e a última parcela do custo honesto que o `docs/saas/CLAUDE.md` §1
lista: "perda/quebra por fornada" é o único item daquela lista que o repositório ainda não
tem. **Nenhuma rota, nenhum índice, nenhuma consulta nova, nenhuma regra, nenhuma
dependência.**
**Tamanho:** uma sessão. O que pesa é a linha de `FornadasRecentes` a 360px com três estados e
a palavra da frase — "quebrou" é dela, "perda" é do insumo, e os dois não podem virar a mesma
coisa na tela.
**Origem:** o roadmap (fase 1, 026: "`Fornada.perdidas` (unidades descartadas) → custo real por
unidade vendável na ficha: 'nas últimas fornadas, 6% quebrou; o custo real é R$ X'. Campo
aditivo opcional. Aprovações: um campo em `Fornada`"); e o comentário de `projecaoDoPronto`,
que desde a 13D diz "o que saiu do pote (vendido, entregue) o sistema não vê" — a assadeira que
caiu no chão é a parte disso que **dá** para ver, porque ela sabe o número.
**Depende de:** nada no código. O roadmap a condiciona às entrevistas ("só se as entrevistas
pedirem"), e as entrevistas não rodaram. A spec fica escrita e quem conduz o projeto decide se
ela roda antes — como a 024 e a 025 rodaram (`ESTADO.md`). Se as entrevistas disserem que
ninguém conta o que quebra, esta spec morre e o campo não nasce: é mais barato jogar fora uma
spec do que um campo.
**Aprovações pedidas:** **um campo em `Fornada`** (`perdidas?: number`), aditivo e opcional, o
que o roadmap já autorizou. **Duas decisões a registrar**, `#d139` (a quebra é dita depois, e
ausência não é zero) e `#d140` (a quebra tira do pote e devolve a promessa, nunca a farinha; o
custo real é leitura, nunca preço gravado).

---

## Problema

A fornada de 25 cookies rende 25 cookies em toda tela do sistema. Na bancada rende 23: dois
grudaram, um saiu torto, e os três foram para o café da manhã de casa. O sistema conta 25 no
pote, promete 25 ao pedido, e divide o custo do lote por 25 para dizer que o cookie custa
R$ 2,43. Os três que não dá para vender pagaram farinha, chocolate, gás, energia e a hora dela
como os outros vinte e dois — e o custo deles some, porque não há onde dizer que eles
existiram.

Quatro coisas o repositório mostra:

1. **A conta do custo já é honesta em todo o resto.** Perda de material, embalagem, gás,
   energia, a hora dela, maquininha: as specs 002 e 006 puseram cada uma no lugar. A parcela
   que falta é a única que o `docs/saas/CLAUDE.md` nomeia e o repositório não tem, e é a que
   separa "um app bonito" de "diferente e defensável".
2. **A quebra já mente em três lugares, e nenhum deles é o preço.** `projecaoDoPronto` soma
   `unidadesProduzidas` ao que a contagem disse: o pote tem 25 na tela e 22 na cozinha.
   `reservadoNoPronto` dá dono a 25 unidades que não existem. E a linha do pedido diz "já
   fiz 25" (`FormularioPedido.tsx:411`) para uma encomenda que continua faltando três.
3. **`perdaPercentual` não cobre isso, e confundir os dois estragaria os dois.** A perda do
   material é o que não chega à tigela — casca de ovo, o que fica no fundo do pote, o que
   estraga na despensa — e ela já divide o custo por grama (`custoUnidadeBaseCorrigido`). A
   quebra é o que sai da tigela e não dá para vender. Uma é do que entra, a outra é do que
   sai; somar as duas no mesmo campo faria a Maynara subir a perda da farinha porque um cookie
   caiu no chão, e aí a lista de compras passaria a comprar farinha demais para sempre.
4. **A fornada é a massa, e a quebra é do forno.** `#d93`: ela mistura, congela e assa sob
   demanda. O insumo sai da despensa na tigela, e é esse o dia que a fornada grava. O que
   quebra, quebra dias depois — no forno, na bancada ou na caixa. Um campo "quantas
   quebraram?" no formulário de registrar a fornada seria sempre zero, porque nada quebrou
   ainda.

**O que esta spec entrega:** um jeito de dizer, depois, quantas unidades daquela massa não deram
para vender; o pote, a reserva do pedido e a lista de compras passando a contar as que sobraram
e não as que saíram do forno; e, no editor do produto, a frase que o roadmap pediu — "nas
últimas massas que você anotou, 6 de 100 quebraram: cada cookie que dá para vender custa
R$ 2,59, e não R$ 2,43".

**O que esta spec não entrega:** quebra no preço gravado, quebra no formulário de registrar a
fornada, motivo da quebra, quebra no custo do pedido, histórico, relatório.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra um botão numa linha que a conta nova não tem.** "Quebrou" mora na linha de "Massas
  registradas", dentro do bloco de produção do editor de produto. Esse bloco só existe em
  ficha salva, e a linha só existe depois de uma fornada registrada. Quem está no primeiro
  preço não viu nenhuma das duas coisas.
- **A folha de registrar fornada não ganha campo nenhum.** Continua com "Massa para quantas" e
  "O dia", e é isso que esta spec escolhe não fazer: o lugar óbvio para um campo de quebra
  seria ali, e ali ele seria uma terceira pergunta no momento em que a resposta ainda não
  existe (`#d139`).
- **A frase só aparece com quebra anotada.** Sem anotação nenhuma, o bloco de produção fica
  exatamente como está hoje. Nada muda para quem nunca tocar no botão, nem no editor, nem no
  pote, nem na lista de compras.
- **Nada sai de tela, campo ou caminho.** Está escrito.

---

## 1 · O que esta spec decide

### A quebra é dita depois, e ausência não é zero — `#d139`

O campo não entra em `PainelFornada`. A fornada é o dia da massa (`#d93`); a quebra é do forno,
da bancada e da caixa, e o número só existe horas ou dias depois. Ele entra onde a fornada já
é listada: **`FornadasRecentes`**, o único lugar do sistema que mostra fornada registrada, que
já tem o alvo de toque, já tem o padrão de dois toques inline e já está nas duas telas onde ela
estaria quando descobre a quebra — o produto e o pedido.

**Fornada sem `perdidas` não é fornada sem quebra: é fornada sobre a qual ela não disse nada.**
É a mesma régua do `#d63` — contagem vencida vale "não sei", e não zero — e é o que impede o
número de mentir para baixo: quem anota a assadeira que caiu e não anota as outras três
fornadas não tem 1,5% de quebra, tem 6% nas massas sobre as quais falou. A taxa sai só das
fornadas anotadas, e a frase diz quantas são.

`perdidas: 0` é diferente de ausente, e é dizer "nesta não quebrou nada": entra na conta, no
denominador, e é o que faz a taxa cair. Desanotar não existe na tela (ver fora de escopo).

A janela é a que já existe: `consultaFornadas` traz as vivas dos últimos trinta dias
(`IDADE_VENCE_DIAS`), e "nas últimas fornadas" do roadmap é exatamente esse recorte. **Zero
consulta nova, zero índice novo.**

### A quebra tira do pote e devolve a promessa, nunca a farinha; o custo real é leitura — `#d140`

Uma frase resume as duas metades desta decisão: **o que quebrou não devolve insumo, devolve
trabalho.** A farinha dos três cookies que caíram saiu da despensa e não volta; o que volta é a
obrigação de fazer os três de novo.

| O que lê a fornada                             | Com `perdidas`                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `consumoDesdeAContagem` (projeção da despensa) | **Não muda.** A farinha foi gasta, quebrando ou não                     |
| `projecaoDoPronto` (o pote)                    | Soma as vendáveis, e não as produzidas                                  |
| `reservadoNoPronto` (dono no pote)             | Dá dono só às vendáveis                                                 |
| `jaFeitasPorFicha` (a linha do pedido)         | "Já fiz 22", e não 25                                                   |
| `produzidoParaPedidos` (o abate da lista)      | Abate a fração aproveitada: o resto volta a ser comprado                |
| `prometidoParaPedidos` / `capacidadeDaFicha`   | Consequência do anterior: a promessa que sobrou volta a pesar           |
| `Precificacao` gravada na ficha                | **Não muda.** Nenhum campo derivado é reescrito por causa de uma quebra |

A última linha é a metade que é fácil de errar. O custo real por unidade vendável é **leitura**,
como a sobra de hoje da 024 (`#d135`): uma frase calculada na tela a partir do que está gravado,
e não um número novo em `FichaTecnica`. Gravar significaria `precoSugerido` andando sozinho a
cada fornada anotada, um preço que muda sem ela ter mudado nada, e um campo derivado cuja
entrada mora noutra coleção. O preço é decisão dela; esta spec entrega o número que a decisão
precisa, na tela em que ela o toma, e para.

A conta é a que a casa já tem: `quantidadeFisica(custoUnitario, taxa)` — `custo ÷ (1 − taxa)`,
com o mesmo teto de `PERDA_MAXIMA` que impede a divisão por zero. É literalmente a fórmula da
perda do material, um nível acima: uma divide o que entra, a outra divide o que sai.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` na linha de `FornadasRecentes` (três
   estados, alvo de 44px, dedo com farinha) e na frase do bloco de produção.
2. `rg -n "unidadesProduzidas" src/` — os leitores. Esperado: `producao.ts` (`fornadaGravavel`,
   `projecaoDoPronto`, `reservadoNoPronto`), `FormularioPedido.tsx:411`, `PainelFornada.tsx` (a
   gravação e a semente do pronto) e `FornadasRecentes.tsx` (a linha). **Cada um destes é uma
   decisão da tabela do `#d140`**: os três primeiros passam a ler vendáveis, o da semente não.
   Se houver um sexto, ele entra na tabela antes de a spec seguir.
3. `rg -n "perdaPercentual" src/lib/domain/` — a perda do material, que **não** é tocada. A
   confirmação de que são duas contas separadas é o teste 8.
4. `rg -n "VERSAO_SCHEMA" src/lib/firebase/mutations/fornadas.ts` — `arquivarFornada` não grava
   `v`, e o invariante manda gravar. Um `v: VERSAO_SCHEMA` de carona, na mesma linha em que a
   mutação nova nasce ao lado dela.

---

## 3 · Escopo

### 3.1 O campo — `src/lib/types/producao.ts`

```ts
export interface Fornada extends DocumentoBase {
  // … como está
  /**
   * Quantas unidades desta massa não deram para vender: quebrou, queimou,
   * grudou, saiu torta. Na unidade de rendimento, como `unidadesProduzidas`.
   *
   * **Ausente não é zero** (`DECISOES.md#d139`): é "ela não disse". Só as
   * fornadas anotadas entram na taxa de quebra do produto, e `0` é uma
   * anotação legítima — "nesta não quebrou nada".
   *
   * Dita depois do registro, porque a fornada é o dia da massa (`#d93`) e a
   * quebra é do forno. O que quebrou não devolve insumo, devolve trabalho:
   * sai do pote e volta à lista de compras, nunca à despensa (`#d140`).
   */
  perdidas?: number;
}
```

Aditivo e opcional: toda fornada gravada até hoje continua válida e continua lida exatamente
como é lida hoje. Nenhuma migração, nenhum backfill.

### 3.2 O domínio — `src/lib/domain/producao.ts`

Um bloco novo, depois de `fornadaGravavel` (é da mesma família: o que a massa rendeu), e três
alterações cirúrgicas nas funções que já existem.

```ts
/** O que a quebra precisa saber de uma fornada. `Fornada` serve. */
export interface FornadaComQuebra {
  unidadesProduzidas: number;
  /** Ausente é "ela não disse", e não zero (`#d139`). */
  perdidas?: number;
}

/**
 * O que sobrou para vender: o que a massa rendeu, menos o que quebrou. Nunca
 * negativo — anotar mais quebra do que unidades é dedo errado, e zero é a
 * leitura honesta disso.
 *
 * É por aqui que passam os três leitores do que a massa **produziu**: o pote,
 * o dono no pote e a linha do pedido. Quem lê o que a massa **consumiu** não
 * passa por aqui, e é de propósito (`#d140`).
 */
export function vendaveis(fornada: FornadaComQuebra): number {
  return Math.max(0, fornada.unidadesProduzidas - (fornada.perdidas ?? 0));
}

/**
 * A fração daquela massa que virou produto vendável: 1 quando ela não anotou
 * nada, porque não saber não é perder.
 */
export function aproveitamento(fornada: FornadaComQuebra): number {
  if (fornada.perdidas === undefined || !(fornada.unidadesProduzidas > 0)) {
    return 1;
  }
  return vendaveis(fornada) / fornada.unidadesProduzidas;
}

export interface QuebraDaFicha {
  /** Quantas fornadas têm quebra anotada. É o "nas últimas N" da frase. */
  fornadas: number;
  produzidas: number;
  perdidas: number;
  /** perdidas ÷ produzidas, na escala humana: 6 = 6%. */
  taxa: Percentual;
}

/**
 * A quebra de um produto nas fornadas que ela anotou, dentro da janela que a
 * consulta já traz (trinta dias, `IDADE_VENCE_DIAS`).
 *
 * `null` quando não há o que dizer: nenhuma fornada anotada, ou nenhuma delas
 * rendeu nada. Ausência não vira zero por cento (`#d139`) — a tela que
 * dissesse "0% quebrou" estaria inventando uma medição que ninguém fez.
 */
export function quebraDaFicha(
  fornadas: (FornadaDaFicha & FornadaComQuebra)[],
  fichaId: string,
): QuebraDaFicha | null {
  const anotadas = fornadas.filter(
    (fornada) =>
      !fornada.arquivado &&
      fornada.fichaId === fichaId &&
      fornada.perdidas !== undefined,
  );
  const produzidas = anotadas.reduce(
    (soma, fornada) => soma + fornada.unidadesProduzidas,
    0,
  );
  if (anotadas.length === 0 || !(produzidas > 0)) return null;

  const perdidas = anotadas.reduce(
    (soma, fornada) => soma + (fornada.perdidas ?? 0),
    0,
  );
  return {
    fornadas: anotadas.length,
    produzidas,
    perdidas,
    taxa: (perdidas / produzidas) * 100,
  };
}

/**
 * O custo de uma unidade que dá para vender: o custo do lote dividido pelo que
 * sai vendável dele, e não pelo que ele rende.
 *
 * É `quantidadeFisica` — a mesma conta da perda do material, um nível acima
 * (`#d140`), com o mesmo teto de `PERDA_MAXIMA` que impede a divisão por zero.
 * Uma divide o que entra na tigela, a outra o que sai do forno.
 */
export function custoPorVendavel(
  custoUnitario: Centavos,
  taxa: Percentual,
): Centavos {
  return Math.round(quantidadeFisica(custoUnitario, taxa));
}
```

As três alterações, cada uma de uma linha:

```ts
// projecaoDoPronto: o pote tem o que sobrou, e não o que saiu do forno.
const feitas = desde.reduce((soma, fornada) => soma + vendaveis(fornada), 0);

// reservadoNoPronto: dono só no que existe.
feito.set(
  fornada.fichaId,
  (feito.get(fornada.fichaId) ?? 0) + vendaveis(fornada),
);

// produzidoParaPedidos: o abate encolhe na fração aproveitada — o que quebrou
// volta a ser promessa, e a lista volta a comprar o que ela precisa refazer.
const fator = aproveitamento(fornada);
for (const linha of fornada.consumo) {
  produzido.set(
    linha.insumoId,
    (produzido.get(linha.insumoId) ?? 0) + linha.quantidade * fator,
  );
}
```

`FornadaRegistrada` (o que `produzidoParaPedidos` recebe) ganha `unidadesProduzidas?: number` e
`perdidas?: number`, os dois opcionais: `Fornada` os tem, `aproveitamento` devolve 1 sem eles, e
**nenhuma fornada gravada até hoje muda de comportamento em uma casa decimal**. É o primeiro
teste.

`FornadaDaFicha` ganha `perdidas?: number` pelo mesmo motivo.

**`consumoDesdeAContagem`, `fornadasDesdeAContagem`, `consumoPorLote` e `fornadaGravavel` não
mudam uma linha.** A farinha foi gasta.

**Testes** (`tests/domain/producao.test.ts`, bloco `quebra`), com o caso de aceite número por
número. Cookie: rendimento 25, `custoTotalLote` 6075, `custoUnitario` 243, preço praticado 690,
taxas zero, sobra gravada 447.

1. **Sem anotação, tudo igual.** Quatro fornadas sem `perdidas`: `projecaoDoPronto`,
   `reservadoNoPronto` e `produzidoParaPedidos` devolvem exatamente o que devolvem hoje, valor
   por valor. É o teste que sustenta "campo aditivo".
2. **`vendaveis`**: 25 sem `perdidas` → 25; 25 com 3 → 22; 25 com 40 (dedo errado) → 0;
   25 com 0 → 25.
3. **`aproveitamento`**: sem `perdidas` → 1; 25 com 5 → 0,8; `unidadesProduzidas` 0 → 1.
4. **`quebraDaFicha`, o caso do roadmap**: quatro fornadas de 25 anotadas, quebras 3, 2, 1 e 0
   → `{ fornadas: 4, produzidas: 100, perdidas: 6, taxa: 6 }`.
5. **Ausência não é zero** (`#d139`): quatro fornadas de 25, só uma anotada com 6 →
   `{ fornadas: 1, produzidas: 25, perdidas: 6, taxa: 24 }`, e **não** 6 sobre 100. Uma anotada
   com `perdidas: 0` entre elas → `{ fornadas: 2, produzidas: 50, perdidas: 6, taxa: 12 }`.
6. **`null`**: nenhuma anotada; todas anotadas mas arquivadas; anotada de outra ficha; anotada
   com `unidadesProduzidas` 0.
7. **`custoPorVendavel`**: 243 a 6% → 259 (`243 ÷ 0,94 = 258,51`); a 0% → 243; a 100% → o teto
   de 99% manda, 24300, sem `Infinity` e sem `NaN`.
8. **A perda do material não dobra.** A mesma ficha com farinha de 5% de perda: `consumoPorLote`
   devolve o mesmo físico com e sem `perdidas` na fornada, e `custoUnitario` (243) não é tocado
   por `quebraDaFicha`. As duas contas se encontram só na frase da tela.
9. **O pote**: contagem 10 em `2026-09-01`, fornada de `2026-09-02` com 25 produzidas e 3
   perdidas → `prontos` 32, `feitas` 22, `fornadas` 1.
10. **O dono no pote**: pedido de 25 unidades, fornada dele com 25 e 3 perdidas →
    `reservadoNoPronto` 22, e `prontosLivres` sobre o item 9 devolve 10.
11. **A promessa volta**: pedido que pede 25, fornada dele consumindo 500 g de farinha com 5
    perdidas → `produzidoParaPedidos` abate 400 g, e `prometidoParaPedidos` sobe os 100 g
    correspondentes contra os 0 g de hoje. `consumoDesdeAContagem` continua descontando os
    **500 g** da despensa no mesmo cenário — é a metade "não devolve farinha" do `#d140`, e os
    dois números no mesmo teste é o que a prova.

### 3.3 A mutação — `src/lib/firebase/mutations/fornadas.ts`

```ts
/**
 * A quebra é dita depois: a massa é do dia em que ela foi feita (`#d93`), e o
 * que não deu para vender só se sabe no forno (`DECISOES.md#d139`). Uma escrita,
 * um campo, e não espera o servidor — é a mesma cozinha do `registrarFornada`.
 */
export function anotarQuebra(
  contaId: string,
  id: string,
  perdidas: number,
): void {
  despachar(
    updateDoc(docFornada(contaId, id), {
      v: VERSAO_SCHEMA,
      perdidas,
      atualizadoEm: Timestamp.now(),
    }),
  );
}
```

De carona, `arquivarFornada` passa a gravar `v: VERSAO_SCHEMA` também: o invariante manda, ela
é a única mutação do arquivo que não o faz, e a linha nasce ao lado. Uma linha, mesmo arquivo,
sem mudança de comportamento.

Validação, na tela e não no domínio (como o resto do `PainelFornada`): número ≥ 0 e
≤ `unidadesProduzidas`. Fora disso, a frase de erro na linha — "Não dá para quebrar mais do que
a massa rendeu" — e nada é gravado.

### 3.4 A entrada — `src/components/producao/FornadasRecentes.tsx`

A linha ganha um segundo botão e um terceiro estado. Os três, um de cada vez:

```
parada      02 de set · Cookie: massa para 25 un · 1 lote    [Quebrou] [Desfazer]
            02 de set · Cookie: massa para 25 un · 1 lote · 3 quebraram   ← com perdidas
anotando    02 de set · Cookie: massa para 25 un
            Quantas não deram para vender?  [ 3 ] un   [Cancelar] [Anotar]
desfazendo  (como já é hoje: Manter · Desfazer esta)
```

- O estado de anotar reaproveita o `useState<string | null>` que `confirmando` já é: um segundo,
  `anotando`, e os dois nunca abertos juntos (abrir um fecha o outro). Nada de estado por linha.
- O campo nasce com o que estiver gravado (`perdidas` ou vazio), `inputMode="decimal"`,
  `parseParaNumero` como o resto do sistema, sufixo `SUFIXO_UNIDADE_RENDIMENTO[unidadeRendimento]`.
- "Anotar" chama `anotarQuebra` e fecha. Sem rede, o cache local já mostra o número: é a mesma
  cozinha do `#d62`.
- Com `perdidas` gravado, o botão passa a dizer **"Quebrou: 3"** em vez de "Quebrou", e abre com
  o número lá — corrigir é reabrir. `perdidas: 0` mostra "Quebrou: 0", que é a diferença visível
  entre "não quebrou nada" e "ela não disse".
- A frase de rodapé do componente ganha a segunda sentença: "O que quebrou sai do que está
  pronto e volta para a lista de compras. A despensa não muda: o material já foi gasto."
- A 360px a linha já é `flex-wrap`; com dois botões o roteiro (passo 7) decide se "Desfazer"
  vira só ícone. Se não couberem, é "Desfazer" que encolhe: ele é o raro, e "Quebrou" é o
  toda-semana.

O componente é usado em duas telas (`FormularioFicha` e `FormularioPedido`) e as duas ganham o
botão pela mesma mudança. No pedido é onde a quebra dói mais: é a encomenda que ficou curta.

### 3.5 A frase — `src/components/producao/FraseDaQuebra.tsx` (novo)

Irmão de `FraseDaCapacidade.tsx` / `FraseDoPronto`, e pelo mesmo motivo: a frase tem regra
demais para viver dentro de um formulário de mil e quinhentas linhas.

```tsx
export function FraseDaQuebra({
  quebra,
  ficha,
}: {
  quebra: QuebraDaFicha;
  ficha: FichaTecnica;
}) { … }
```

O texto, com o caso de aceite:

> Nas **4 últimas massas que você anotou**, 6 de 100 não deram para vender (**6%**). Cada
> unidade que você vende custa **R$ 2,59**, e não R$ 2,43 — **sobram R$ 4,31** por unidade, e
> não R$ 4,47.

- Com uma fornada anotada só: "Na última massa que você anotou, 3 de 25 …".
- Com `taxa` zero (ela anotou e nada quebrou): "Nas 4 últimas massas que você anotou, nada
  quebrou. Cada unidade custa os R$ 2,43 da receita." Sem seta, sem segunda metade — é notícia
  boa e ocupa uma linha.
- A segunda metade da frase (a sobra) só aparece com `rendimento > 0` e com preço praticado; sem
  preço, para em "custa R$ 2,59, e não R$ 2,43".
- Quando a sobra real fica **negativa** e a gravada não, a frase leva `TriangleAlert` e
  `text-negative`, e a palavra muda: "**você perde R$ 0,12** por unidade, e não sobram R$ 0,31".
  Cor nunca sozinha, como em todo o resto.
- `text-label text-ink-muted`, `max-w-[60ch]`, os números em `font-medium text-ink` —
  exatamente a frase do `PainelProduto` da 024, e pela mesma razão: é a mesma família de
  notícia.

A sobra real é `verificarPreco(precoVenda, custoPorVendavel(custoUnitario, taxa), somaTaxas(precificacao)).lucroUnitario`
— as mesmas funções do painel de preço, sobre um custo diferente. Nada de conta nova.

### 3.6 O lugar — `src/components/fichas/FormularioFicha.tsx`

Dentro do bloco `podeAssar` que já existe, **entre a linha do que está pronto e
`FornadasRecentes`**, com o mesmo `border-t border-line pt-3` que separa as duas primeiras:

```tsx
{
  quebra && <FraseDaQuebra quebra={quebra} ficha={ficha} />;
}
```

com `const quebra = useMemo(() => (ficha ? quebraDaFicha(fornadas, ficha.id) : null), [fornadas, ficha])`.

É o lugar certo por três razões: as fornadas já estão carregadas ali (`EditorFicha.tsx:71`,
`consultaFornadas`), a frase é o resumo da lista que vem logo abaixo dela, e é a mesma tela em
que o painel de preço está preso ao pé — ela lê "custa R$ 2,59 de verdade" e o campo de preço
está a um rolar de distância.

**`PainelPreco` não muda.** Ver fora de escopo.

### 3.7 Documentação

- `#d139` e `#d140` em `docs/DECISOES.md`. `#d87` ganha a nota: a fornada continua não
  escrevendo estoque, e a quebra também não.
- `docs/ESTADO.md`: a seção da 026; a linha 26 na tabela de módulos; a contagem de testes; a
  próxima ação. A 026 sai de "só se as entrevistas pedirem" no parágrafo da fase 1.
- `docs/saas/ROADMAP.md`: a 026 marcada como entregue, com o que a spec decidiu que o roadmap
  não dizia — o campo não entra no formulário de registrar, ausência não é zero, a quebra
  também mexe no pote e na lista de compras, e o custo real é leitura e não preço gravado.
- `PRODUCT.md` / `DESIGN.md`: nada. Nenhum token, nenhum primitivo, nenhum padrão novo.

---

## Roteiro de navegador

Conta real, `npm run dev`, desktop a 1280px e celular a 360px, os dois temas.

1. **Sem anotação, nada muda.** Antes de tocar no botão: abrir um produto com fornadas
   registradas e conferir que o pote, a capacidade em `/fichas`, a lista de compras e a linha
   do pedido dizem exatamente o que diziam. Anotar uma tela do que elas dizem, porque o passo 4
   compara contra ela. Se alguma coisa mudou aqui, o campo não é aditivo e a spec para.
2. **Anotar.** No bloco de produção do produto, "Quebrou" numa fornada de 25 → digitar 3 →
   "Anotar". A linha passa a dizer "3 quebraram", o botão vira "Quebrou: 3", e a frase aparece
   acima da lista com os dois custos e as duas sobras.
3. **O número bate.** Com a calculadora na mão: `custo ÷ (1 − taxa)` arredondado ao centavo é o
   número da frase, e `preço − custo real − taxas` é a sobra da frase. Se não bater, é
   arredondamento, e o teste 7 é quem decide quem está certo.
4. **O pote encolhe.** `/fichas`: a linha do produto mostra três unidades a menos do que
   mostrava no passo 1. `/fichas/contagem`: a projeção do pote também. A **despensa não muda** —
   `/insumos` e a projeção de cada material continuam iguais ao passo 1. É o `#d140` na tela.
5. **A promessa volta.** Com um pedido aberto que pede as 25 unidades e uma fornada dele
   anotada com 5 quebradas: a linha do pedido diz "já fiz 20" e não 25; `/compras` volta a
   pedir o material das 5 que faltam, que não pedia antes de anotar.
6. **Ausência não é zero.** Numa segunda fornada do mesmo produto, **não** anotar: a frase
   continua dizendo "na última massa que você anotou", com a taxa da primeira. Anotar `0` na
   segunda: a frase passa a dizer "nas 2 últimas", o botão dela diz "Quebrou: 0", e a taxa cai
   pela metade.
7. **360px.** A linha de "Massas registradas" com os dois botões: sem quebra feia, alvo de 44px
   nos dois, e o campo de anotar não empurra o texto para fora. Com o teclado aberto, o campo
   fica visível (`apertado:`).
8. **Sem rede.** DevTools em Offline: anotar. A linha e a frase mudam antes de religar; o selo
   de sincronização mostra pendente; religar, o selo limpa e o número é o mesmo.
9. **Desfazer ainda desfaz.** Arquivar uma fornada anotada: ela sai da lista **e** sai da taxa —
   a frase recalcula ou some, e o pote volta ao que era.
10. **Leitor de tela e tema escuro.** O campo de anotar tem rótulo lido; a frase é lida inteira,
    com a palavra "perde" quando for o caso; `text-negative` e `text-attention` na frase, nos
    dois temas.

---

## Critérios de aceite

- [x] Sem `perdidas` em fornada nenhuma, o sistema devolve os mesmos números de antes, valor por
      valor (teste 1, passo 1).
- [x] Os onze casos de teste passam; `npm test` sobe de 552 para o novo número, relatado.
- [x] A taxa sai só das fornadas anotadas, e `0` é anotação (teste 5, passo 6).
- [x] O pote e a linha do pedido contam vendáveis; a despensa não muda (testes 9 a 11, passos 4
      e 5).
- [x] O que quebrou volta para a lista de compras (teste 11, passo 5).
- [x] O custo real e a sobra real da frase são `quantidadeFisica` e `verificarPreco` sobre o
      gravado, conferidos na mão (passo 3).
- [x] Anotar funciona offline (passo 8); arquivar tira da taxa (passo 9).
- [x] `git diff src/lib/types/` mostra **um** campo opcional em `Fornada`, e nada mais.
- [x] `git diff firestore.rules firestore.indexes.json package.json` vazio.
- [x] `npx impeccable --json src/` continua `[]`.
- [x] `lint`, `typecheck`, `test` e `build` passam, sem rota nova na lista do build.
- [x] `#d139` e `#d140` escritos, `#d87` anotado; `ESTADO.md` (seção, linha 26, próxima ação) e
      `ROADMAP.md` atualizados.

---

## Fora de escopo

- **Quebra no preço gravado.** `precoSugerido` continua saindo de `custoUnitario`. Gravar o
  custo por vendável faria o preço andar sozinho a cada fornada anotada (`#d140`). Quando a
  operação disser que a taxa de quebra é estável, a pergunta certa é outra: um campo
  `quebraEsperada` na ficha, digitado por ela, entrando em `derivarFicha` como a perda do
  material entra no custo por grama — e aí a frase desta spec vira a sugestão desse campo.
  Isso é spec própria, e nasce com o número desta na mão.
- **O campo no formulário de registrar fornada.** É o `#d139` inteiro. Se as entrevistas
  disserem que ela assa e embala no mesmo ato, o campo desce para lá, opcional, e o `#d139`
  ganha a nota.
- **O motivo da quebra** ("queimou", "caiu", "ficou feio"). Categoria é relatório, e relatório
  sem cinquenta contas é gráfico bonito. O número já muda o preço; o motivo, não.
- **Desanotar.** Corrigir é reabrir e digitar outro número, inclusive zero. Tirar o campo de
  volta exigiria `deleteField()` e uma terceira palavra na tela para uma diferença que só a
  taxa vê. Quem anotou por engano anota o número certo.
- **A quebra no custo do pedido e na folha do orçamento.** O pedido congela o custo de propósito
  (`#d08`), a folha lê o gravado (`#d107`). A quebra é do produto, não da venda.
- **A frase em `/fichas`, em `LinhaFicha` ou em `PainelProduto`.** `ListaFichas` carrega fichas e
  materiais, e não fornadas: a frase ali custaria uma terceira consulta na lista inteira
  (`#d105`), para uma notícia que não muda de hora em hora. O editor já é onde ela vai quando
  vai mexer no preço.
- **A frase no painel de preço.** `PainelPreco` é o rodapé preso com o teclado aberto, e o
  `#d75` já decidiu quem sobrevive ali: correção, e não contexto. Uma quarta métrica naquele
  espaço, a 360px, é o que a 033-C acabou de arrumar. A frase mora acima, na mesma tela.
- **Histórico de quebra por mês** ("a quebra caiu de 8% para 3%"). Exige janela maior que os
  trinta dias da consulta, e portanto índice e paginação. Quando alguém do beta pedir.
- **Quebra em kit.** O kit não tem pote (`#d97`) e a fornada de um kit é rara; a quebra dele é a
  quebra das receitas de dentro, e essas já contam. O botão aparece em qualquer fornada, porque
  esconder por tipo custaria mais que deixar.

---

## Decisões desta spec que são fáceis de rejeitar

- **O campo nasce na linha de "Massas registradas", e não no formulário de registrar.** É a
  decisão maior da spec, e a que uma entrevista pode derrubar em cinco minutos. O argumento é o
  `#d93`: se a fornada é a massa e a massa é congelada, a quebra não existe quando ela registra.
  Se a operação real assar e registrar no mesmo ato, o campo desce, e é um `Campo` a mais numa
  folha que já tem dois.
- **Ausência não é zero.** A alternativa — `perdidas ?? 0` sobre todas as fornadas — dá um
  número maior, mais estável e mais bonito, e é mentira: dilui a quebra que ela mediu em
  fornadas que ela nunca olhou. A régua é a do `#d63`, e o custo é a frase precisar dizer "nas
  massas que você anotou".
- **A quebra devolve a promessa à lista de compras.** São três linhas em `produzidoParaPedidos`,
  e é a parte desta spec com mais chance de surpreender: a lista de compras passa a pedir
  material que ela achava resolvido. É o comportamento certo — a encomenda está curta —, mas se
  parecer ruído, a alternativa é o abate continuar cheio e a linha do pedido ser a única a dizer
  "faltam 3". Aí o `#d140` perde uma linha da tabela.
- **Custo real como leitura, e não campo derivado.** O invariante manda gravar derivado; este
  não é derivado da ficha, é derivado de outra coleção, com janela de trinta dias, que muda sem
  a ficha ser tocada. Gravá-lo seria reescrever fichas a cada fornada anotada. Se quem conduz
  preferir o número gravado, a forma é `quebraEsperada` digitada por ela — não este.
- **`quantidadeFisica` reusada para dinheiro.** A função nasceu para gramas e o nome diz isso. A
  conta é idêntica (`x ÷ (1 − p)`), o teto de `PERDA_MAXIMA` é exatamente a guarda que este caso
  precisa, e uma segunda cópia da mesma divisão é a coisa que alguém conserta num lugar só às
  três da manhã. Se o nome incomodar, ele vira `descontarPerda` e os dois chamam.
- **`v: VERSAO_SCHEMA` em `arquivarFornada` de carona.** É conserto fora do escopo literal, de
  uma linha, no arquivo que a spec já abre, de um invariante que a spec cita. A alternativa é
  uma linha na tabela de dívidas que ninguém volta para pagar.
- **Um componente novo para uma frase.** `FormularioFicha.tsx` tem mais de mil e quinhentas
  linhas, e `FraseDoPronto` já é o precedente exato: frase com quatro casos mora ao lado da
  irmã, não dentro do formulário.

---

## Riscos

- **A palavra.** "Quebrou" é da confeitaria e "perda" é do software, mas `perdaPercentual` já
  existe e é outra coisa. Se na tela as duas aparecerem juntas (o material com 5% de perda e o
  produto com 6% de quebra), a chance de ela achar que está pagando duas vezes é real. A frase
  nunca usa a palavra "perda"; o teste 8 é o que prova que as contas não se somam; e a gravação
  do primeiro uso é quem decide se a palavra se sustenta.
- **A taxa de uma fornada só.** Anotar a assadeira que caiu numa fornada e nunca mais tocar no
  botão deixa "24% quebrou" no editor para sempre, dentro dos trinta dias. É o preço de
  "ausência não é zero", e a frase o nomeia dizendo quantas massas entraram na conta. Se a
  Maynara ler isso como "meu cookie custa 24% mais", a resposta é um piso — a frase só aparece
  com duas fornadas anotadas — e o `#d139` ganha a nota.
- **A lista de compras crescendo sem aviso.** O passo 5 é o único lugar onde isso é visto. Se
  ela anotar quebra em cinco fornadas e a lista da semana pular de R$ 120 para R$ 180 sem nada
  na tela explicando, é susto. O texto de rodapé de `FornadasRecentes` é onde a explicação mora;
  se não bastar, a linha da lista de compras ganha o motivo — outra spec.
- **Dois botões na linha a 360px.** "Quebrou" e "Desfazer" com alvo de 44px numa linha que já
  tem data, nome, unidades e lotes. Está no roteiro, passo 7, e o plano B está escrito: o
  "Desfazer" vira ícone com `sr-only`.
- **Fornada anotada e depois arquivada** sai da taxa e do pote de uma vez. É o certo, e o passo
  9 confere; o que não existe é desarquivar, como em todo o resto do sistema.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o **passo 1 antes de qualquer outro**: é ele que prova que o
campo é aditivo de verdade, e é o único passo que não dá para refazer depois de anotar a
primeira quebra. Com esta spec, a última parcela do custo honesto entra no sistema, e a fase 1
fica esperando só o que as entrevistas pedirem.
