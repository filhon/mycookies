# Spec 024 · Fichas no vermelho

**Tipo:** só leitura — a segunda spec da fase 1 do `docs/saas/ROADMAP.md`, e a que dá ao
sistema a frase que o `docs/saas/CLAUDE.md` chama de "a notificação que salva assinatura": "o
chocolate subiu, três produtos ficaram no vermelho". Um bloco de domínio (`custoDeHoje` e
`custosDeHoje`, no fim de `custoFicha.ts`), um cartão novo na tela Hoje, a seta na linha de
`/fichas` e o número no painel do produto. **Nenhum campo, nenhuma mutação, nenhuma rota,
nenhuma regra, nenhum índice, nenhuma dependência, nenhuma linha em `src/lib/firebase/`.**
**Tamanho:** uma sessão, com folga. O que pesa é a palavra do cartão e a coluna "Sobra" da
tabela no desktop com o painel aberto.
**Origem:** o roadmap (fase 1, 024: "`derivarFicha` já recalcula uma ficha com os insumos de
hoje; um cartão na tela Hoje e a linha em `/fichas` dizendo 'sobra R$ 1,80 → R$ 0,90'"); o
`claude.md` §3; e o comentário de `FichaTecnica.custoDesatualizado`, que existe desde o Módulo
0 — "sem isso, a Maynara venderia com preço de farinha do ano passado" — e que até hoje só diz
que o número envelheceu, nunca quanto.
**Depende de:** nada no código. O roadmap a põe depois das entrevistas da fase 1; a spec está
escrita para rodar quando quem conduz decidir, antes ou depois delas.
**Aprovações pedidas:** nenhuma. **Duas decisões a registrar**, `#d135` (a sobra de hoje é o
gravado com os materiais de agora) e `#d136` (o cartão conta o que cruzou uma linha; a linha de
`/fichas` mostra toda diferença).

---

## Problema

Quando um material muda de preço — pela nota fotografada, pela correção na gôndola ou pelo
formulário —, `marcarFichasDesatualizadas` põe `custoDesatualizado: true` em toda ficha que o
usa (`#d05`). A partir daí o sistema diz, em três lugares, a mesma coisa: "Custo desatualizado".
O selo na linha de `/fichas`, o selo com "Abra o produto e salve para recalcular" no painel do
produto, e a faixa do editor com "Recalcular e salvar". O que nenhum dos três diz é **o que
mudou**: se o chocolate subiu 10 centavos e a sobra continua a mesma, ou se subiu R$ 3 o quilo
e o cookie recheado que sobrava R$ 1,80 agora sobra R$ 0,90 — ou perde. Ela precisa abrir
ficha por ficha para descobrir, e uma confeiteira com dezoito produtos não abre dezoito fichas
depois de cada ida ao atacadista. O selo vira paisagem, e o preço de farinha do ano passado
vira orçamento, exatamente como o comentário do Módulo 0 temia.

Três coisas o repositório mostra:

1. **Toda a conta já existe.** `custoLinhaItem`, `custoLinhaComponente`, `custoDasEscolhas`,
   `verificarPreco` e `calcularPrecoSugerido` são funções puras sobre números que a ficha já
   grava. O editor faz essa conta a cada tecla (`FormularioFicha.tsx:464`) e a faixa dele já
   diz "os números aqui já são os de agora". Só a lista e a tela Hoje não fazem.
2. **`/fichas` já tem os materiais na mão.** `ListaFichas` carrega `insumos` para responder
   quantas fornadas dá (13B). Zero consulta nova para responder quanto sobra hoje.
3. **A tela Hoje é onde ela olha de manhã**, e os dois cartões que ela tem (meta e compras)
   nascem do mesmo par de coleções. O alerta de custo é o terceiro, e é o que o roadmap chama
   de hábito semanal: precificar é evento raro, mas o chocolate sobe todo mês.

**O que esta spec entrega:** para cada ficha viva, quanto ela custa e quanto sobra **hoje**, com
os materiais de agora, ao preço que ela cobra; a seta "sobram R$ 1,80 → R$ 0,90" na linha de
`/fichas` e no painel do produto sempre que o número mudou; e um cartão na tela Hoje que só
existe quando um produto **cruzou uma linha** desde o último Salvar — o zero, ou a margem que ela
pediu — dizendo qual, quanto, e que material subiu.

**O que esta spec não entrega:** recalcular em lote, notificação, custo de hoje no pedido, o
histórico de preço na tela.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra um cartão**, e ele só existe quando um produto cruzou o zero ou a margem desde que
  foi salvo; some quando ela salva. **Entra uma seta** na linha da lista, só quando o número
  de hoje difere do gravado. Na conta da ficha-modelo (018), com preço médio: quando ela
  corrige o chocolate para cima no passo 2 do caminho (019), o cartão aparece — "Cookie
  recheado ficou abaixo da margem · Chocolate subiu". É a frase do produto no dia um, e não
  ruído; o passo 1 do caminho já a leva à ficha, onde "Recalcular e salvar" tira o cartão.
- **Sai um convite às cegas**: "Abra o produto e salve para recalcular com os preços de hoje"
  no painel do produto passa a dizer o número em vez de mandar procurá-lo.
- **Nada sai de tela, campo ou caminho.** Está escrito.

---

## 1 · O que esta spec decide

### A sobra de hoje é o gravado com os materiais de agora — `#d135`

O roadmap fala em `derivarFicha`; a spec não a chama. Reconstruir a `EntradaFicha` a partir da
ficha gravada exigiria a configuração (`rateioDaConta`, `arredondamento`) em cada leitor, e
misturaria duas perguntas: "o que você compra ficou mais caro?" e "você mudou o valor da sua
hora?". A primeira é a desta spec; a segunda já é da faixa do editor.

A conta é **o gravado mais o que mudou, linha a linha**, com `custoLinhaItem` e
`custoLinhaComponente`, as mesmas funções que gravaram:

| Parcela                             | Hoje                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| Material (`itens[]`)                | `custoUnidadeBaseCorrigido` do material vivo, na mesma quantidade  |
| Material arquivado                  | a linha gravada fica: não há preço de hoje para ele                |
| Componente de kit (`componentes[]`) | o custo unitário **de hoje** da receita, um nível (`#d11`)         |
| Escolha do combo (`escolhas[]`)     | `custoDasEscolhas` sobre as receitas com o custo de hoje (`#d101`) |
| Invisíveis (hora, energia, fixas)   | gravados: configuração não é material                              |
| Rendimento e preço praticado        | gravados: o preço salvo é decisão tomada, e não se mexe sozinho    |

O custo unitário de hoje é `round(total / rendimento)`, a mesma fórmula de `calcularCustoFicha`,
e a sobra é `verificarPreco(precoVenda, custoUnitarioHoje, somaTaxas(precificacao))`. **Sem
mudança nenhuma, o número de hoje é o gravado, centavo por centavo** — é por construção, porque
cada delta é a diferença entre a mesma função aplicada duas vezes. É o primeiro teste.

### O cartão conta o que cruzou uma linha; a lista mostra toda diferença — `#d136`

A farinha sobe dois centavos e a sobra de todo produto muda um centavo. Se o cartão contasse
diferença, ele seria permanente, e cartão permanente é paisagem. Ele conta **cruzamento**: um
produto que, desde o último Salvar, passou a perder dinheiro (`sobraHoje < 0` com
`lucroUnitario` gravado `≥ 0`), ou passou a cobrar menos do que a conta dele pede
(`precoVenda < precoSugeridoHoje` quando `precoVenda ≥ precoSugerido` gravado). Quem já cobrava
abaixo do sugerido de propósito não vira notícia por continuar abaixo. A linha de `/fichas`, ao
contrário, mostra **toda** diferença, inclusive o centavo, e inclusive para cima: é a verdade de
hoje, e uma lista que esconde um centavo é uma lista em que ela não confia.

A comparação é entre preços, e não entre percentuais: `precoSugerido` gravado é `round(custo ×
markup)` ou `round(custo / divisor)`, o de hoje é a mesma função sobre o custo de hoje, e todo
arredondamento de vitrine (`arredondarPreco`) sobe — quem aceitou a sugestão nunca está
"abaixo" no gravado. `margemReal` e `markupReal` têm duas casas e um produto de R$ 0,60
cruzaria a margem por arredondamento.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` no cartão e na coluna. O cartão é uma
   frase e meia; o ocre de atenção e o vermelho de prejuízo nunca sozinhos (ícone e palavra).
2. `rg -n "custoDesatualizado" src/components/` — os quatro leitores. Esperado: `LinhaFicha`
   (selo), `PainelProduto` (selo e frase), `FormularioFicha` (faixa, que já recalcula e não
   muda), `notas.ts` e `insumos.ts` (escritores, intocados).
3. `rg -n "colInsumos\(contaId\)" src/components/ src/lib/hooks/` — a consulta dos materiais
   vivos repetida em cada leitor. O cartão repete uma vez mais; o Firestore compartilha o
   ouvinte da mesma consulta, e o custo é memória.

---

## 3 · Escopo

### 3.1 O domínio — fim de `src/lib/domain/custoFicha.ts`

```ts
import type { Insumo, Precificacao } from "@/lib/types";
import {
  calcularPrecoSugerido,
  somaTaxas,
  verificarPreco,
} from "./precificacao";

/** O que a conta de hoje precisa de um material vivo. `Insumo` serve. */
export type MaterialDeHoje = Pick<
  Insumo,
  "id" | "nome" | "custoUnidadeBaseCorrigido"
>;

export interface CustoDeHoje {
  custoUnitario: Centavos;
  /** O que sobra por unidade, ao preço praticado, com os materiais de hoje. */
  sobra: Centavos;
  /** A linha que mais subiu desde o gravado. `null` quando nada subiu. */
  culpado: { nome: string; subiu: Centavos } | null;
  /** Cruzou o zero ou a margem pedida desde o último Salvar (`#d136`). */
  caiu: boolean;
}

/**
 * O custo da ficha se ela salvasse agora: o gravado mais o que mudou, linha a
 * linha, com as mesmas funções que gravaram (`#d135`). Material arquivado fica
 * na linha gravada; invisíveis ficam, porque configuração não é material.
 */
export function custoDeHoje(
  ficha: FichaTecnica,
  materiais: Map<string, MaterialDeHoje>,
  /** O custo unitário de hoje das receitas, para o kit. Vazio numa receita. */
  receitasHoje: Map<string, Centavos> = new Map(),
  /** As fichas com o custo de hoje, para a escolha do combo. */
  fichasHoje: FichaParaEscolha[] = [],
): CustoDeHoje {
  let total = ficha.custoTotalLote;
  let culpado: CustoDeHoje["culpado"] = null;

  for (const item of ficha.itens) {
    const material = materiais.get(item.insumoId);
    if (!material) continue;
    const delta =
      custoLinhaItem({
        ...item,
        custoUnidadeBaseCorrigido: material.custoUnidadeBaseCorrigido,
      }) - item.custoLinha;
    total += delta;
    if (delta > (culpado?.subiu ?? 0)) {
      culpado = { nome: material.nome, subiu: delta };
    }
  }

  for (const componente of ficha.componentes) {
    const hoje = receitasHoje.get(componente.fichaId);
    if (hoje === undefined) continue;
    const delta =
      custoLinhaComponente({ ...componente, custoUnitarioSnapshot: hoje }) -
      componente.custoLinha;
    total += delta;
    if (delta > (culpado?.subiu ?? 0)) {
      culpado = { nome: componente.nomeSnapshot, subiu: delta };
    }
  }

  if (temEscolhas(ficha)) {
    total +=
      custoDasEscolhas(ficha.escolhas ?? [], fichasHoje, ficha.id).referencia -
      (ficha.custoEscolhas ?? 0);
  }

  const custoUnitario =
    ficha.rendimento > 0 ? Math.round(total / ficha.rendimento) : 0;
  const p = ficha.precificacao;
  const sobra = verificarPreco(
    p.precoVenda,
    custoUnitario,
    somaTaxas(p),
  ).lucroUnitario;

  // `arredondamento` não muda `precoSugerido`, só o de vitrine; qualquer um serve.
  const sugerido = calcularPrecoSugerido(custoUnitario, {
    metodo: p.metodo,
    markup: p.markup ?? 0,
    margemDesejada: p.margemDesejada ?? 0,
    taxaCartaoConsiderada: p.taxaCartaoConsiderada,
    outrasTaxas: p.outrasTaxas,
    arredondamento: "NENHUM",
  });
  const abaixoHoje = sugerido.ok && p.precoVenda < sugerido.precoSugerido;
  const abaixoGravado = p.precoVenda < p.precoSugerido;

  return {
    custoUnitario,
    sobra,
    culpado,
    caiu: (sobra < 0 && p.lucroUnitario >= 0) || (abaixoHoje && !abaixoGravado),
  };
}

/**
 * Toda ficha viva, de uma vez: as receitas primeiro, os kits com o custo de
 * hoje delas. Um nível, porque kit não contém kit (`#d11`).
 */
export function custosDeHoje(
  fichas: FichaTecnica[],
  materiais: MaterialDeHoje[],
): Map<string, CustoDeHoje> {
  const porId = new Map(materiais.map((m) => [m.id, m]));
  const resultado = new Map<string, CustoDeHoje>();

  for (const ficha of fichas) {
    if (ficha.tipo === "SIMPLES")
      resultado.set(ficha.id, custoDeHoje(ficha, porId));
  }
  const receitasHoje = new Map(
    [...resultado].map(([id, hoje]) => [id, hoje.custoUnitario]),
  );
  const fichasHoje = fichas.map((ficha) => ({
    ...ficha,
    custoUnitario: receitasHoje.get(ficha.id) ?? ficha.custoUnitario,
  }));
  for (const ficha of fichas) {
    if (ficha.tipo === "KIT") {
      resultado.set(
        ficha.id,
        custoDeHoje(ficha, porId, receitasHoje, fichasHoje),
      );
    }
  }
  return resultado;
}
```

- **Mora em `custoFicha.ts`, ao lado de `custoGravado`**, que é o irmão: um lê o gravado, o
  outro o gravado com o que mudou. Sem arquivo novo; o teste vai em
  `tests/domain/custoFicha.test.ts`.
- **`Precificacao` gravada, e não `ParametrosPreco`**: `markup` e `margemDesejada` são opcionais
  no documento (os dois métodos ficam gravados, `corpoDaFicha`); `?? 0` é o que a conta do
  editor também faria, e com o método errado o campo não é lido.
- **`culpado` conta componente**: no kit cuja receita subiu, é a receita que subiu.

**Testes** (`custoFicha.test.ts`, bloco `custoDeHoje`), com o caso de aceite número por número.
Cookie: farinha 500 g a 1,25 c/g (linha 625), chocolate 200 g a 4,00 c/g (linha 800),
invisíveis 1000, rendimento 10 → lote 2425, unitário 243; markup 2,5, taxas 0, sugerido 608,
praticado 690 (CENTAVO_90), sobra gravada 447.

1. **Sem mudança, igual**: `custoUnitario` 243, `sobra` 447, `culpado` null, `caiu` false.
   É o teste que sustenta o `#d135`.
2. **Chocolate a 6,50 c/g**: linha 1300, lote 2925, unitário 293, sobra 397; sugerido de hoje
   733 > 690 → `caiu` true; `culpado` `{ nome: "Chocolate", subiu: 500 }`.
3. **Chocolate a 3,00 c/g**: unitário 223, sobra 467 (subiu), `culpado` null, `caiu` false.
4. **Material arquivado** (fora do mapa): tudo igual ao gravado.
5. **Já no vermelho** (praticado 200, `lucroUnitario` gravado −43): hoje −93, `caiu` false —
   não é notícia. **Cruzou o zero** (praticado 250, gravado 7): chocolate a 6,50 → −43, `caiu`
   true mesmo sem cruzar a margem.
6. **Já abaixo do sugerido de propósito** (praticado 600 < 608): chocolate a 6,50 → `caiu`
   false; a 20,00 c/g (unitário 563, sobra 37 → ainda ≥ 0) → false; só cruza pelo zero.
7. **Kit** "caixa de 6": componente cookie ×6 a 243 (linha 1458), caixa 1 un a 200, rendimento
   1 → 1658; com o cookie a 293 via `custosDeHoje`: 1958, `culpado` `{ "Cookie", 300 }`.
8. **Combo com escolha** (2 de "Cookie", `custoEscolhas` gravado 486): com o cookie a 293,
   `+100`. Categoria sem receita viva: parcela fica a gravada, sem `Infinity`.
9. **Rendimento zero**: `custoUnitario` 0, sem `NaN`. **`MARGEM_IMPOSSIVEL`** (sugerido gravado
   0): nunca "abaixo", a sobra ainda muda.

### 3.2 A linha — `src/components/fichas/LinhaFicha.tsx`

Prop nova `hoje?: CustoDeHoje`. A palavra, a cor e o ícone passam a seguir **a sobra de hoje**
(`hoje?.sobra ?? lucroUnitario`); o gravado aparece antes da seta, só quando difere:

```
celular   sobram R$ 4,47 → R$ 3,97          (mesmo lado do zero: uma palavra só)
          sobram R$ 0,07 → perde R$ 0,43     (cruzou: as duas palavras, ícone e vermelho)
desktop   R$ 4,47 →  R$ 3,97                (o gravado em `text-ink-muted font-normal`,
          R$ 0,07 →  ⚠ −R$ 0,43              o de hoje como a célula já é)
```

Leitor de tela: `sr-only` "sobravam R$ 4,47, hoje" antes do número, no lugar do "sobram "
atual; a seta é `aria-hidden`. A célula do desktop pode quebrar em duas linhas com o painel
aberto (`flex-wrap justify-end`); o roteiro (passo 8) é quem decide se cabe. O selo "Custo
desatualizado" fica: ele diz "salve", a seta diz quanto. Os dois arranjos do `<li>` (`#d129`)
recebem a mesma prop; nada mais na linha muda.

`ListaFichas`: `const hojes = useMemo(() => custosDeHoje(dados, insumos), [dados, insumos])`,
passado à linha só quando `despensaPronta` — a mesma regra da capacidade: enquanto a despensa
não chegou, a linha não diz nada, em vez de dizer "igual" por um instante e trocar.

### 3.3 O painel do produto — `src/components/fichas/PainelProduto.tsx`

Prop `hoje?: CustoDeHoje`. Debaixo do selo, no lugar de "Abra o produto e salve para
recalcular com os preços de hoje":

> Com os materiais de hoje custa **R$ 2,93** e sobram **R$ 3,97** por unidade. Chocolate foi o
> que mais subiu. Abra e salve para gravar.

Só quando `hoje.sobra !== lucroUnitario`; com o selo ligado e o número igual (a farinha mudou de
marca, mesmo preço), a frase antiga fica. O painel continua lendo `custoGravado` para a faixa e
as parcelas (`#d130`): a faixa é o gravado, a frase é o de hoje.

### 3.4 O cartão — `src/components/fichas/CartaoNoVermelhoHoje.tsx`

Irmão de `CartaoComprasHoje`: duas `useColecao` (fichas vivas por `nomeBusca`, materiais vivos
por `nomeBusca`, as consultas que já existem inline nos outros leitores), `custosDeHoje` num
`useMemo`, e `caidas = fichas.filter((f) => hojes.get(f.id)?.caiu)` ordenadas pela sobra de
hoje, a pior primeiro. `null` enquanto carrega ou sem caída — sem esqueleto, pelo mesmo motivo
do cartão de compras.

| Caso     | Título                                                        | Detalhe                                                      |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| uma, ≥ 0 | `Cookie recheado ficou abaixo da margem`                      | `sobram R$ 1,80 → R$ 0,90 · Chocolate subiu`                 |
| uma, < 0 | `Cookie recheado ficou no vermelho`                           | `sobram R$ 0,07 → perde R$ 0,43 · Chocolate subiu`           |
| várias   | `3 produtos ficaram abaixo da margem depois da última compra` | `Cookie recheado: sobram R$ 0,07 → perde R$ 0,43 · e mais 2` |

"Chocolate subiu" só com `culpado`; "e mais N" com `listarNomes` não: o nome que importa é o
pior, e os outros estão a um toque. Ícone `TrendingDown` à esquerda, como em `PainelProduto`;
o detalhe em `text-negative` com `TriangleAlert` quando a pior perde, senão `text-attention`
com o mesmo ícone — cor nunca sozinha. O `Link` vai para `/fichas/{id}` com uma caída (o
editor já tem "Recalcular e salvar" na faixa) e para `/fichas` com várias.

**Lugar na tela Hoje** (`src/app/(app)/(coluna)/page.tsx`): dentro do `space-y-4`, depois de
`CartaoMetaHoje` e antes de `AgendaHoje`. É "o que eu faço agora": raro, some ao salvar, e é a
consequência da compra que ela acabou de lançar. A agenda continua sendo o que vem depois.

### 3.5 Documentação

- `#d135` e `#d136` em `docs/DECISOES.md`.
- `docs/ESTADO.md`: a seção da 024; a linha 24 na tabela de módulos; a contagem de testes; a
  próxima ação passa a apontar para as entrevistas e a 025.
- `docs/saas/ROADMAP.md`: a 024 marcada como entregue, com o que a spec acrescentou ao que ele
  previa (o painel do produto, o culpado, o cartão que conta cruzamento e não diferença).

---

## Roteiro de navegador

Conta real, `npm run dev`, desktop a 1280px e celular a 360px, os dois temas.

1. **Sem mudança, nada.** `/fichas` sem nenhum selo de custo desatualizado: nenhuma seta em
   nenhuma linha, no celular e no desktop. Hoje: sem cartão. Se uma linha mostrar seta sem
   selo e sem kit, o `#d135` está furado num arredondamento, e o resto do roteiro espera.
2. **O chocolate sobe.** Em `/insumos`, o preço do chocolate para o dobro. `/fichas`: toda
   receita com chocolate tem o selo **e** a seta; o kit que leva a receita tem a seta **sem**
   o selo (`marcarFichasDesatualizadas` não marca kits — a seta cobre). Hoje: o cartão, com a
   pior primeiro e "Chocolate subiu".
3. **O número é o do editor.** Abrir a pior pelo cartão: a faixa "os números aqui já são os de
   agora" e o painel de preço mostram **o mesmo custo unitário e a mesma sobra** que a linha
   mostrava. Se diferirem, a configuração mudou depois do último Salvar (invisíveis, `#d135`),
   e é esperado; se diferirem sem isso, o domínio divergiu do editor e a spec para aqui.
4. **Salvar tira.** "Recalcular e salvar": a linha volta a mostrar um número só, o cartão
   perde um; com todas salvas, some.
5. **O chocolate cai.** Preço para a metade: a seta aponta para cima ("sobram R$ 4,47 →
   R$ 5,20"), sem cartão.
6. **Abaixo de propósito não é notícia.** Produto com preço manual abaixo do sugerido; subir
   um material pouco: seta, sem cartão. Subir até a sobra virar negativa: cartão "no vermelho".
7. **Sem rede.** DevTools em Offline, mudar um preço em `/insumos`: `/fichas` mostra a seta e a
   Hoje mostra o cartão antes de religar — `useColecao` serve do cache e `atualizarInsumo`
   despacha (`#d104`).
8. **A coluna cabe.** 1280px, painel do produto aberto, uma linha com seta e prejuízo
   ("R$ 0,07 → ⚠ −R$ 0,43"): não vaza da célula; se quebrar em duas linhas, alinhado à direita.
   360px: a linha da sobra não trunca o número de hoje.
9. **Leitor de tela.** Na linha: "sobravam R$ 4,47, hoje sobram R$ 3,97". No cartão: título e
   detalhe lidos inteiros, ícones mudos.
10. **Tema escuro.** `text-negative` e `text-attention` no cartão e na célula, contraste.

---

## Critérios de aceite

- [x] `custoDeHoje` sem mudança devolve o gravado centavo por centavo (teste 1, passo 1).
- [x] Os nove casos de teste passam; `npm test` sobe de 536 para o novo número, relatado.
- [x] A seta aparece em toda diferença, inclusive kit e inclusive para cima (passos 2 e 5); o
      cartão só em cruzamento (passos 2, 5, 6).
- [x] O custo e a sobra da linha são os do editor com a mesma configuração (passo 3).
- [x] Salvar tira a seta e o cartão (passo 4). Offline funciona (passo 7).
- [x] Palavra, ícone e cor seguem a sobra de hoje; a cor nunca sozinha (passos 8 a 10).
- [x] `git diff src/lib/types/ src/lib/firebase/ firestore.rules firestore.indexes.json
package.json` vazio.
- [x] `npx impeccable --json src/` continua `[]`.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d135` e `#d136` escritos; `ESTADO.md` (seção, linha 24, próxima ação) e `ROADMAP.md`
      atualizados.

---

## Fora de escopo

- **Recalcular em lote** ("atualizar todos os preços"). É escrita, e o roadmap disse só
  leitura. Salvar ficha por ficha é a decisão dela sobre cada preço; um botão que grava dezoito
  preços de uma vez é outra spec, e nasce quando alguém do beta pedir.
- **Notificação** (push, e-mail, WhatsApp). O cartão é o alerta; push no PWA é spec própria,
  com o iOS decidindo o que dá.
- **O custo de hoje no pedido e no orçamento.** O pedido congela o custo de propósito
  (`#d08`); a folha lê o gravado (`#d107`).
- **Marcar o kit quando a receita muda** (`marcarFichasDesatualizadas` só olha `insumoIds`).
  É mutação; a seta já cobre a linha do kit, e o selo do kit fica para quando morder.
- **Invisíveis de hoje.** Ela mudou a hora dela e não salvou as fichas: a faixa do editor já
  diz; a lista não. É outra pergunta (`#d135`).
- **O histórico de preço na tela.** `historicoPrecos` continua sem leitor; o culpado sai da
  linha, não do histórico. Uma tela de "o chocolate custava" é spec própria.
- **A seta no custo unitário da linha.** Só a sobra: é a resposta, e duas setas por linha é
  ruído. O custo de hoje está no painel e no editor.

---

## Decisões desta spec que são fáceis de rejeitar

- **Delta por linha, e não `derivarFicha`.** O roadmap nomeia `derivarFicha`; reconstruir a
  entrada exigiria configuração em cada leitor e faria mudança de hora aparecer como mudança
  de material. O delta são quarenta linhas sobre as mesmas funções que gravaram, e "sem mudança
  é igual" sai por construção. Se um dia a pergunta virar "quanto custaria salvar agora, com
  tudo", é `derivarFicha` com a configuração — e o `#d135` ganha a nota.
- **Toda diferença na linha, até o centavo.** A alternativa era só com `custoDesatualizado`,
  que não cobre kit e esconde o que é verdade. O custo é uma seta a mais em linhas que ela já
  vai abrir.
- **Cruzamento no cartão, e não diferença.** Sem isso o cartão nunca sai da tela. Se a Maynara
  quiser ver toda queda, é um limiar em centavos no `caiu`, e o `#d136` ganha a nota.
- **`arredondamento: "NENHUM"` para satisfazer o tipo.** `precoSugerido` não depende dele.
  Separar `ParametrosPreco` em dois tipos por causa de um campo seria mais mudança do que a
  spec inteira.
- **Uma caída vai ao editor; várias vão à lista.** Dois destinos num cartão. A alternativa —
  sempre a lista — põe um toque a mais no caso mais comum (uma receita, um chocolate).
- **Entre a meta e a agenda.** É raro e é o produto; a agenda é todo dia. Se atrapalhar a
  manhã, desce para depois do cartão de compras.
- **O culpado é a linha que mais subiu**, e não o material com `ultimaCompraEm` mais recente.
  Dois materiais comprados na mesma nota: o que mais pesou é a resposta certa, e sai do mesmo
  laço.

---

## Riscos

- **Arredondamento que não bate.** `custoLinhaItem` arredonda ao centavo, e a linha gravada
  também: o delta é zero sem mudança. Se o passo 1 mostrar seta numa ficha sem selo e sem kit,
  há uma ficha gravada antes de alguma spec com `custoLinha` calculado de outro jeito — a
  resposta é conferir `custoCalculadoEm` e salvar a ficha uma vez, não mexer no domínio.
- **Duas consultas a mais na Hoje.** O cartão repete as consultas de fichas e materiais que
  `CartaoComprasHoje` já faz. O SDK compartilha o alvo; se o DevTools mostrar dois `Listen`
  para a mesma consulta, é normal. Se pesar, os dois cartões passam a receber as coleções de um
  hook da página, como `useDespensaParaProduzir` — não é desta spec.
- **A coluna no desktop com o painel aberto.** "R$ 0,07 → −R$ 0,43" com ícone são vinte
  caracteres numa célula de `1.4fr`. Se o passo 8 quebrar feio, o gravado vai para uma linha
  de `text-micro` acima do número de hoje, e a seta vira "antes".
- **Combo com categoria sem receita viva**: `custoDasEscolhas` devolve zero na parcela e
  `semOpcao`; o delta contra o gravado pode ser negativo e a sobra sobe. O editor já avisa a
  categoria; a lista mostra a seta. Aceito, e o teste 8 cobre.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o passo 1 antes de qualquer outro e o passo 3 como o que
prova que a lista e o editor contam a mesma conta. Com esta spec, o selo de custo desatualizado
deixa de ser paisagem e o sistema passa a dizer a frase pela qual ele é vendido — e a fase 1
segue para o que o beta pedir: a 025 se pedirem clientes, a 026 se as entrevistas falarem da
fornada que quebrou.
