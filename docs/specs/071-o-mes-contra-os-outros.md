# Spec 071 · O mês contra os outros

**Tipo:** `/financeiro` ganha memória: o mês comparado com o anterior na mesma altura, e os
últimos doze meses numa faixa que leva a cada um. Uma consulta nova sobre `agregados` (por id,
sem índice), uma função pura com teste, um bloco novo, a comparação da Hoje extraída para ser
usada nas duas telas. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa sobre os prints de 2026-10-02.
**Depende de:** a 069 (`rendimentoDoMes`, que a faixa usa por mês).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d264` e `#d265`.

---

## Problema

**O mês está sozinho.** As setas trocam de mês, uma tela por vez. Para saber se outubro vai
melhor que setembro ela abre um, decora o número, abre o outro. A tela Hoje já compara com o mês
passado na mesma altura (`#d211`); o Caixa, que é a tela do dinheiro, não.

**Não há ano.** Nenhuma tela diz quanto entrou ou rendeu no ano, nem qual foi o melhor mês. É o
que todo serviço de assinatura mostra primeiro num relatório (Shopify, Nuvemshop, iFood para
parceiros, a conta PJ de qualquer banco): o período contra o anterior e a curva do ano. Para a
confeiteira é também a pergunta de dezembro ("dá pra contratar ajudante?") e a de quem é MEI (a
074 lê o ano daqui).

---

## 1 · O que esta spec decide

### A comparação mora no bloco do topo, igual nas duas telas: `#d264`

`Comparacao` sai de `CartaoDoMes.tsx` para `src/components/financeiro/Comparacao.tsx`, sem mudar
o que diz, e entra na faixa "No caixa" do bloco da 069:

- **Mês corrente:** "Entrou R$ 318,00 a mais que setembro até o dia 2", pela mesma
  `entradasAteODia` (`#d211`).
- **Mês fechado:** o mês inteiro contra o anterior inteiro: "Entrou R$ 318,00 a mais que agosto".
- Seta e palavra, positivo ou `ink-muted`, **nunca vermelho** (`#d211`).
- Mês anterior sem agregado: a linha não aparece.

A comparação continua sobre **entradas**. O rendeu do mês anterior até o dia 2 não existe gravado
(`porDia` não tem custo), e comparar o rendeu do mês inteiro com o de dois dias é mentir.

### Os doze meses numa faixa: `#d265`

Seção nova, "O que entrou nos últimos 12 meses", depois do bloco da meta:

```
O que entrou nos últimos 12 meses         No ano: entrou R$ 21.480 · rendeu R$ 9.912
 ▁  ▂  ▃  ▅  ▄  ▆  ▇  █  ▆  ▅  ▇  ▂
 nov dez jan fev mar abr mai jun jul ago set out
                                            ↑ selecionado
```

- **Uma barra por mês, de entradas**, em `--ink-subtle`; o mês aberto na tela em `--brand-ink`,
  com a etiqueta em 600. A altura é a entrada; o rendeu do mês vai no `sr-only` e no `title`
  ("Setembro: entrou R$ 2.086,00, rendeu R$ 1.010,40"), não em segunda série: duas séries numa
  faixa de 64 px é ruído.
- **Tocar num mês abre o mês** (`setCompetencia`), como as setas. Cada barra é um `<button>` com a
  coluna inteira de alvo; com doze colunas em 358 px cada uma tem 29 px de largura, então a altura
  do alvo é a faixa inteira (64 px) mais a etiqueta, e o alvo útil passa de 44 × 44 contando o
  espaço entre colunas. Conferir no roteiro.
- **No ano** é o ano civil do mês aberto, até ele: soma de `entradas` e de `rendeu`
  (`rendimentoDoMes` por mês; mês sem pedido soma 0 no rendeu e o rótulo diz "rendeu, nos meses
  com pedido").
- **Mês sem agregado** é barra de altura 0 com a etiqueta: o buraco é informação (o mês em que
  ela não usou o app, ou não vendeu).
- **Menos de dois meses com agregado:** a seção não aparece.

A consulta, em `src/lib/firebase/mutations/agregado.ts`:

```ts
/** Os agregados de `de` a `ate`, por id. `global` fica fora porque 'g' > '2'. */
export function consultaAgregadosDoPeriodo(
  contaId: string,
  de: CompetenciaMensal,
  ate: CompetenciaMensal,
) {
  return query(
    colAgregados(contaId),
    orderBy(documentId()),
    startAt(de),
    endAt(ate),
  );
}
```

Faixa por `documentId()`: sem índice composto. A regra de `agregados` já deixa a dona listar
(`firestore.rules`, `match /{colecao}/{documento=**}`); a ajudante não abre `/financeiro`.

Função pura `mesesDaFaixa(agregados, ate)` em `caixa.ts`: os doze `CompetenciaMensal` terminando em
`ate`, cada um com `entradas` e `rendeu` (ou zero), e o total do ano. Testes: virada de ano,
mês faltando no meio, `ate` em janeiro (o ano tem um mês só), agregado `global` na entrada
ignorado.

---

## 2 · Antes de tocar em código

1. Conferir se `colecoes.ts` já tem a coleção tipada de `agregados`; se não, criá-la ao lado de
   `docResumoMensal`, com o mesmo conversor.
2. Ler `#d211` e `CartaoDoMes.tsx`: a extração da `Comparacao` não muda o texto da Hoje.
3. `/impeccable` e o skill `dataviz` para a faixa.

---

## 3 · Escopo

- `Comparacao.tsx` extraído; `CartaoDoMes` e `ResultadoDoMes` importam dele.
- `consultaAgregadosDoPeriodo` e `mesesDaFaixa` com teste.
- `src/components/financeiro/DozeMeses.tsx`, uma assinatura (a faixa termina no mês corrente,
  não no aberto: abrir março não pode encolher a faixa para março).

---

## 4 · Roteiro de navegador

1. Outubro, dia 2: a comparação com setembro até o dia 2 é a mesma da Hoje.
2. Setembro pelo seletor: a comparação é o mês inteiro contra agosto.
3. Tocar em junho na faixa: a tela vai para junho, a barra de junho fica `brand-ink`.
4. A 390 px: doze barras sem rolagem lateral, toque em cada uma acerta o mês.
5. Leitor de tela: cada barra diz mês, entrou e rendeu.

---

## Critérios de aceite

- [x] `Comparacao` em arquivo próprio; a Hoje diz exatamente o que dizia.
- [x] Uma consulta por id, sem índice; `firestore.indexes.json` intocado.
- [x] `mesesDaFaixa` testada com os quatro casos.
- [x] Nenhuma cor solta; a barra selecionada não depende só de cor (etiqueta em 600 e
      `aria-current`).
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d264` e `#d265` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Comparar com o mesmo mês do ano passado.** Faz sentido em outubro de 2027; hoje não há ano
  passado.
- **Saldo acumulado.** Pede o saldo de partida (campo novo).
- **Exportar o ano.** É a 074 para quem é MEI; planilha para o contador fica para quando alguém
  pedir.

---

## Decisões desta spec que são fáceis de rejeitar

- **A faixa ser de entradas, e não de rendeu.** O rendeu some no mês sem pedido e depende de as
  fichas estarem em dia; uma barra que some engana mais que uma que mede outra coisa, dita no
  título. Se o rendeu se mostrar estável nos dados reais, a faixa passa a ser dele.
- **Doze meses fixos**, e não "desde que começou". Quem começou há três meses vê nove buracos. É
  honesto, e em um ano deixa de ser assunto.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
