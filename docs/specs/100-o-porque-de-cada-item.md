# Spec 100 · O porquê de cada item

**Tipo:** o preço da linha abre o porquê do item, em folha no celular e painel no desktop: a
conta, de que pedidos e de que reserva vem, a última compra e o que o preço novo faz nos
produtos. A linha fica com nome, pacote e preço. **Nenhum campo, nenhuma regra, nenhum índice,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** 098 (a linha nova). Usa a 051 (`EfeitoDoPreco`) e o `#d222` (`comprasDoInsumo`).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d303`.

---

## Problema

1. **Auditoria no carrinho.** Até três frases em `micro` por linha: "0,59 ml para os pedidos ·
   25 ml para manter 1 fornada de Cookie Cacau com Nutella 120g, 1 fornada de Cookie Pistache
   120g e mais 2 de reserva". Cortadas no desktop, cortadas no celular. No mercado ela não lê;
   em casa, quando quer entender, não consegue ler inteiro.
2. **"Para os pedidos" sem dizer quais.** A lista sabe os pedidos e não diz de quem é a farinha.
3. **Corrigir o preço não diz o que muda.** O editor dentro da linha diz que os produtos ficam
   "com custo desatualizado". Desde a 051 o material diz "Cookie tradicional: sobrava
   R$ 3,19, passa a R$ 2,87", e desde a 089 a nota também. O mercado, onde o preço novo é
   descoberto, é o único lugar que ficou sem.
4. **Preço sem memória.** "R$ 27,99" e nada sobre a última vez. O histórico está gravado
   (`historicoPrecos`) e a ficha do material já o lê. Ferramenta de compras de restaurante que
   cobra centenas por mês (MarketMan, meez) vive disso: a variação de preço na lista do
   fornecedor.

---

## 1 · O que esta spec decide: `#d303`

### A linha

- Fica: nome, pacote, preço, e **só** a frase de atenção ("90 un anotados, sem contagem: não
  descontamos"). Forno e reserva saem da linha e vão para o porquê.
- A célula do preço abre o porquê (`Painel`: folha no celular, painel no desktop), no lugar do
  editor dentro da linha. O lápis vira `chevron-right`. A linha inteira continua marcando.

### O porquê, em ordem

1. **A conta**, uma linha por parcela, números tabulares à direita: precisa (pedidos +
   reserva) · você tem (contada há N dias, menos o que foi para a massa) · falta · N pacotes
   de P · sobra na despensa depois da compra. Aqui o número exato, sem arredondar.
2. **De onde vem**: os pedidos pelo nome da cliente e o dia ("Ana · sex 10 · 120 g"), e a
   reserva por produto ("Cookie Pistache · 1 fornada · 360 g"). Os pedidos saem de uma função
   pura nova, `demandaPorPedido(insumoId, pedidos, fichas)` em `listaCompras.ts`, sobre
   `insumosPorLote`, com teste.
3. **O preço**: o pacote e o quilo (`custoDeReferencia`), a última compra de `comprasDoInsumo`
   ("R$ 24,90 em 12 de set. · subiu R$ 3,09"), o campo para corrigir e, enquanto ela digita,
   `EfeitoDoPrecoDigitado` da 051. "Salvar preço" é o primário do painel.
4. **"Abrir o material"**, terciário, para a ficha do material.

---

## 2 · Antes de tocar em código

1. Conferir a API do `Painel` com conteúdo rolável no celular e o teclado do campo de preço.
2. Conferir que `EfeitoDoPrecoDigitado` recebe as fichas e os materiais que a tela já assina;
   se não, assinar só com o painel aberto.

---

## 3 · Escopo

- `LinhaCompra.tsx` (sai o `EditorDePreco`), um `PorqueDoItem.tsx` em `components/compras/`.
- `listaCompras.ts` (`demandaPorPedido`) e o teste.

---

## 4 · Roteiro de navegador

1. Celular: tocar o preço da manteiga abre a folha; a linha não marca.
2. A conta fecha: precisa − tem = falta; pacotes × tamanho ≥ falta.
3. Digitar outro preço: os produtos que usam manteiga com antes e depois; salvar: o preço da
   linha muda.
4. Material com uma compra só: sem "subiu", sem frase inventada.
5. Desktop: painel à direita, a lista visível ao lado.

---

## Critérios de aceite

- [x] Linha com nome, pacote, preço e só a frase de atenção.
- [x] Porquê com a conta, os pedidos por cliente, a reserva, a última compra e o efeito do preço.
- [x] `demandaPorPedido` com teste.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d303` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **"Não levar desta vez" e "levar mais um".** São a 101 e a 104; o painel é onde eles moram.
- **Gráfico de preço.** A ficha do material já tem; o porquê leva até ela.
