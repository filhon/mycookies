# Spec 072 · A lista do mês

**Tipo:** "Lançamentos do mês" deixa de ser uma fila plana: o nome da cliente primeiro, os
lançamentos agrupados por dia com o total do dia, e um jeito de achar um lançamento (Entrou ·
Saiu, busca, e a categoria de "Para onde o dinheiro foi" filtrando a lista). Em memória, sobre a
lista que a tela já assina. **Nenhum campo, nenhuma consulta, nenhuma regra, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa sobre os prints de 2026-10-02.
**Depende de:** nada. Vem antes da 073, que liga o gráfico a este filtro.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d266`.

---

## Problema

**No celular, o nome da cliente é o que se corta.** A linha diz "Pedido P-261001-B14 · Danilo
Jo…": o código, que ela nunca fala em voz alta, vem inteiro; o nome, que é como ela pensa no
pedido, some na reticência. Nas cinco linhas do print, as cinco perdem o nome.

**A lista é uma fila sem forma.** Cinco lançamentos hoje; no fim do mês, sessenta. Sem dia como
grupo, "o que entrou na sexta?" é rolar e somar de cabeça. A tela Pedidos já agrupa por dia com o
total (`#d248`).

**Não dá pra achar nada.** "Quanto paguei de gás este mês?" exige rolar a lista inteira lendo
cada linha. Todo app de finanças que cobra assinatura (Organizze, Mobills, o extrato de qualquer
banco) tem pelo menos a busca e o filtro de entrada e saída. "Para onde o dinheiro foi" mostra
"Despesa fixa R$ 950,00" e não deixa ver quais lançamentos somam isso.

---

## 1 · O que esta spec decide

### A linha diz quem, o dia diz quanto, e a lista se filtra: `#d266`

**O título da linha.** Função pura `tituloDoLancamento(transacao)` em `caixa.ts`:

- Lançamento de pedido (`pedidoId` presente e `descricao` no formato de `descricaoDaVenda`,
  "Pedido {codigo} · {cliente}"): título = cliente; detalhe começa por "Pedido {codigo}".
- Qualquer outro, ou descrição fora do formato (editada à mão): título = `descricao`, como hoje.

A descrição gravada não muda. O formato é de `descricaoDaVenda` em `mutations/pedidos.ts`; a
função de leitura mora no domínio com o formato descrito num comentário que aponta para lá, e o
teste prende os dois lados (o texto que `descricaoDaVenda` monta é o texto que
`tituloDoLancamento` desmonta). Nome de cliente com " · " dentro: o primeiro separador depois do
código é o que conta.

```
Qui, 1 de out.                                    +R$ 101,00
Rayssa Extra                                      +R$ 28,00  ›
Pedido P-261001-9D4 · Venda · Pix
Janessa Domingos                                  +R$ 55,00  ›
Pedido P-261001-8A9 · Venda · Pix
```

**O dia como grupo.** Cabeçalho do dia em `label` 600 `--ink-muted`, com o saldo do dia (entrou −
saiu) à direita, `comSinal`, tabular. Grudento abaixo do cabeçalho da tela no celular, como a
agenda de `/pedidos`. O "01 de out." sai do detalhe da linha (está no grupo).

**Achar.** Uma faixa acima da lista:

- Pílulas **Tudo · Entrou · Saiu** (44 px, `DESIGN.md`, Pílula de filtro), com a contagem no
  rótulo quando acima de zero ("Saiu 12").
- **Busca** em memória pela descrição (com o título derivado), a categoria e a forma de
  pagamento, sem acento e sem caixa. Campo de 48 px, ícone `Search`, "Buscar no mês".
- **A categoria como filtro.** Tocar numa linha de "Para onde o dinheiro foi" filtra a lista por
  ela e rola até a lista; a faixa mostra a pílula "Despesa fixa ×" para tirar. As linhas daquela
  seção viram `<button>` com alvo inteiro (hoje são texto).
- Com filtro ativo, o título da seção diz o que mostra: "Lançamentos do mês · 3 de 41 · R$
  950,00". O total do filtro é a soma com sinal.
- Filtro sem resultado: uma linha, "Nada com 'gás' em outubro.", e "Limpar a busca" terciário.
- O filtro **não** vai para a URL nem para o aparelho: é da visita. Trocar de mês limpa.

Funções puras: `filtrarLancamentos(lista, filtro)` e `agruparPorDia(lista)`, com teste (acento,
categoria, combinação de pílula com busca, dia com entrada e saída, ordem dos dias decrescente
como a consulta).

---

## 2 · Antes de tocar em código

1. Ler `descricaoDaVenda` e `LinhaTransacao`.
2. Ler a 065 (a busca de `/pedidos`, `#d252`): o campo, a normalização e o vazio seguem o de lá;
   se a normalização já existir em função, reusar.
3. `/impeccable`, registro **product**.

---

## 3 · Escopo

- `tituloDoLancamento`, `filtrarLancamentos` e `agruparPorDia` em `caixa.ts`, com teste.
- `LinhaTransacao` usa o título; o dia sai do detalhe.
- `src/components/financeiro/ListaDoMes.tsx` sai de dentro de `TelaFinanceiro` (a seção inteira:
  faixa, grupos, vazio do filtro), e recebe o filtro de categoria por prop.
- `SaidasPorCategoria`: linhas como botões que chamam `aoFiltrar(categoria)`.

---

## 4 · Roteiro de navegador

1. A 390 px: as cinco linhas do print mostram o nome inteiro da cliente (ou cortam o nome, nunca o
   código).
2. Dois grupos, 2 e 1 de outubro, com +R$ 37,00 e +R$ 101,00.
3. "Saiu" sem saídas: a pílula sem contagem, a lista com a linha do vazio.
4. Buscar "danilo", "pix", "despesa": acha.
5. Tocar em "Despesa fixa" em "Para onde o dinheiro foi": a lista filtra, a pílula aparece, o ×
   tira.
6. Leitor de tela: cada grupo é um `h3` com o dia e o saldo; a contagem do filtro é anunciada em
   `aria-live="polite"`.

---

## Critérios de aceite

- [x] O teste prende `descricaoDaVenda` ↔ `tituloDoLancamento`.
- [x] Nenhuma consulta nova; tudo em memória sobre `lancamentos.dados`.
- [x] Pílulas de 44 px, campo de 48 px, linhas com alvo inteiro.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d266` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Busca entre meses.** Pede consulta por texto que o Firestore não faz; o mês é o escopo.
- **Mudar o formato da descrição gravada.** Os lançamentos antigos ficariam com o formato velho
  e a leitura teria de conhecer os dois.
- **Editar vários de uma vez, arquivar em lote, anexar comprovante.**

---

## Decisões desta spec que são fáceis de rejeitar

- **Ler a descrição em vez de guardar o nome em campo.** É frágil por natureza, e o teste que
  prende os dois lados é o que a segura. Campo novo (`clienteNome` no lançamento) seria mais
  firme e pediria migrar o histórico.
- **O filtro não persistir.** Quem volta à tela quer o mês, não a busca de ontem.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
