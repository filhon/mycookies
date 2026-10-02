# Spec 070 · O que vem até o fim do mês

**Tipo:** `/financeiro` passa a olhar para a frente no mês corrente: o que deve entrar dos pedidos
marcados e dos que já devem, o que deve sair das contas que repetem, e onde o mês fecha se tudo
acontecer. As contas que repetem ganham "Lançar" de um toque. Uma função pura com teste, um bloco
novo, uma linha a mais na meta. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma
dependência**; três consultas que já existem.
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa sobre os prints de 2026-10-02.
**Depende de:** a 069 (o bloco do topo). Pode vir em qualquer ordem depois dela.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d262` e `#d263`.

---

## Problema

**A tela só olha para trás.** No dia 2 de outubro ela diz o que já entrou e que faltam "38 doces
por semana" para a meta. Não diz que há pedidos marcados para o mês, que já somam parte desses
doces, nem o que já devem a ela. A tela Pedidos sabe os dois números ("Vai entrar" e "Me devem",
`#d247`); o Caixa, que é onde ela pensa em dinheiro, não.

O Conta Azul, o Nibo, o Organizze e o Mobills abrem no **previsto contra o realizado**: o saldo
de hoje e o do fim do mês, com o que está agendado entre os dois. É a pergunta da noite de
domingo: "o mês vai fechar?".

**"Repete todo mês" é uma promessa que o app não cumpre.** O formulário tem a caixa, a linha do
lançamento diz "repete todo mês", e nada repete: no mês seguinte ela relança o aluguel à mão, ou
esquece, e o mês fecha melhor do que foi. O campo `recorrente` é gravado e nunca lido.

---

## 1 · O que esta spec decide

### Até o fim do mês, em dinheiro e com o caminho: `#d262`

Bloco novo, só no **mês corrente**, logo abaixo do bloco do topo (a 069) e acima da meta:

```
Até o fim de outubro
Deve entrar   R$ 412,00   4 pedidos marcados · 2 que já te devem   ›
Deve sair     R$ 950,00   3 contas que repetem                      ↓
─────────────────────────────────────────
Se tudo isso acontecer, o caixa fecha o mês em −R$ 400,00.   ⚠
```

- **Deve entrar** = `aReceber` (`src/lib/domain/pedido.ts`) sobre os pedidos da agenda com
  `dataEntregaISO` neste mês, mais os entregues não pagos de qualquer data (os que já devem). O
  orçamento fica fora, como em `aReceber`. A linha leva a `/pedidos` na vista "Me devem" quando há
  quem deva, senão na Agenda (`#d246`).
- **Deve sair** = as contas que repetem ainda não lançadas neste mês (`#d263`). A linha rola até a
  lista delas, logo abaixo.
- **Onde fecha** = o `lucro` do agregado (o "No caixa" da 069) + deve entrar − deve sair. Sem
  descontar maquininha do que deve entrar: a taxa depende da forma, que o pedido não pago ainda
  não tem. A frase diz "o caixa fecha em", nunca "o mês rende": é previsão de caixa, não de
  resultado.
- **Fechar negativo:** `TriangleAlert` em `--attention` e a palavra, sem vermelho: é previsão, não
  fato. Positivo: tinta, sem ícone.
- **Sem nada a prever** (nenhum pedido marcado, ninguém devendo, nenhuma conta que repete): o
  bloco não aparece.
- **Meta:** o `BlocoMeta` ganha uma linha, quando há o que deve entrar: "Com os pedidos marcados,
  você chega a 62% da meta." `(entradas + deve entrar) ÷ alvo`, pela mesma `formatarPercentual`.
  Não muda os "doces por semana", que continuam do que já entrou.

Função pura em `src/lib/domain/caixa.ts`:

```ts
export function previsaoDoMes(entrada: {
  noCaixa: Centavos;
  aReceber: AReceber; // já filtrado pelo mês e com os entregues não pagos
  contasQueRepetem: { valor: Centavos }[];
}): { deveEntrar: Centavos; deveSair: Centavos; fechaEm: Centavos };
```

E o filtro dos pedidos do mês, `pedidosQueEntramNoMes(pedidos, competencia)`, junto: a regra de
"deste mês" mora num lugar só.

### As contas que repetem viram uma lista com "Lançar": `#d263`

Abaixo do bloco, "Contas que repetem", com as transações `recorrente: true` **do mês anterior**
que não têm par neste mês:

```
Contas que repetem                          3 · R$ 950,00
Aluguel da cozinha      Despesa fixa · dia 5     R$ 700,00   [Lançar]
Gás                     Despesa fixa · dia 10    R$ 130,00   [Lançar]
Internet                Despesa fixa · dia 12    R$ 120,00   [Lançar]
```

- **Par** é o lançamento deste mês com a mesma `categoria`, o mesmo `tipo` e a mesma `descricao`
  normalizada (sem acento, minúscula, espaços colapsados), **com qualquer valor**: a conta de gás
  muda de valor e continua sendo a conta de gás. Lançou à mão, sai da lista sozinha.
- **"Lançar"** é botão secundário pequeno (44 px de alvo) e grava com `criarTransacao`, os mesmos
  campos da do mês anterior (tipo, categoria, descrição, valor, forma, `recorrente: true`), na data
  do mesmo dia do mês (dia 31 em mês de 30 cai no último dia). Offline funciona, como todo
  lançamento. Depois de gravar, "Desfazer" por 5 segundos na linha, que arquiva o que acabou de
  criar.
- **Valor diferente** é tocar no nome: abre o `FormularioTransacao` já preenchido, como um
  lançamento novo.
- **"Parou de repetir"** fica dentro do formulário de edição do lançamento antigo, que já tem a
  caixa `recorrente`: desmarcar lá tira da lista. Nada novo.
- **Só olha um mês para trás.** A conta que repete e foi esquecida em setembro não aparece em
  novembro. Olhar mais longe é ler mais meses de transações para um caso raro.
- **Só no mês corrente.** No mês fechado, a lista não aparece: lançar o aluguel de agosto em
  outubro é corrigir o passado, e isso é o "+" de sempre com a data.

Testes de `contasQueRepetemPendentes(anterior, atual)`: par por descrição com acento e caixa
diferentes; par com valor diferente; categoria diferente não é par; não recorrente no anterior
não entra; dia 31 → dia 30.

---

## 2 · Antes de tocar em código

1. Ler a 062 (`#d246`, `#d247`) e `aReceber`: o "Deve entrar" tem de bater com "Vai entrar" +
   "Me devem" de `/pedidos` no mesmo instante, salvo os pedidos de outros meses.
2. Ler `criarTransacao` e `FormularioTransacao`: o "Lançar" não pode ser um segundo caminho de
   gravar com regras diferentes (agregado, meta, `v`).
3. `/impeccable` com registro **product**.

---

## 3 · Escopo

### 3.1 Domínio

`previsaoDoMes`, `pedidosQueEntramNoMes` e `contasQueRepetemPendentes` em `caixa.ts`, com teste.

### 3.2 `src/components/financeiro/AteOFimDoMes.tsx` e `ContasQueRepetem.tsx`

Novos. Três assinaturas a mais em `TelaFinanceiro`, só no mês corrente: `consultaAgenda`,
`consultaEntreguesEmAberto` e `consultaTransacoesDoMes` da competência anterior. Nenhuma segura
a tela: enquanto carregam, o bloco não aparece (sem esqueleto: ele é acréscimo, não resposta).

### 3.3 `BlocoMeta`

A linha "Com os pedidos marcados…", recebendo `deveEntrar` por prop; `0` não mostra a linha.

---

## 4 · Roteiro de navegador

1. **Um pedido marcado para o dia 20, não pago.** "Deve entrar" soma ele; marcar pago move o
   valor para o caixa e tira do previsto, sem somar duas vezes.
2. **Um pedido marcado para novembro.** Não entra.
3. **Aluguel recorrente em setembro.** Em outubro aparece; "Lançar" grava no dia 5, sai da lista,
   o caixa cai; "Desfazer" devolve.
4. **Gás lançado à mão com outro valor.** Sai da lista.
5. **Avião ligado.** "Lançar" funciona, o selo "Salvo no aparelho" aparece.
6. **Setembro aberto pelo seletor.** Nenhum dos dois blocos.

---

## Critérios de aceite

- [ ] As três funções puras testadas.
- [ ] "Deve entrar" = "Vai entrar" + "Me devem" de `/pedidos`, menos os pedidos de outro mês.
- [ ] "Lançar" passa por `criarTransacao`; o agregado e a meta andam como num lançamento à mão.
- [ ] Previsão negativa com ícone e palavra, nunca vermelho.
- [ ] Nada aparece em mês que não é o corrente.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`; regras, índices e `package.json` intocados.
- [ ] `#d262` e `#d263` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Lançar sozinho no dia.** Um cron que grava em nome dela muda o caixa sem ela ver; o "Lançar"
  de um toque é a decisão dela (`PRODUCT.md`, regra de ouro).
- **O acerto das entregas a pagar** (`012`) no "Deve sair". Entra quando o "Deve sair" for lido e
  pedir mais.
- **Prazo de recebimento do cartão** (D+30, antecipação). A forma de pagamento não guarda prazo;
  pede campo.
- **Previsão de meses futuros** e saldo acumulado entre meses (pede saldo inicial: campo novo).

---

## Decisões desta spec que são fáceis de rejeitar

- **Par por descrição.** Ela pode chamar o aluguel de "Aluguel" num mês e "aluguel cozinha" no
  outro; aí a conta aparece como pendente. O erro é visível e ela resolve lançando ou desmarcando.
  Um `recorrenciaId` resolveria de vez, e é campo novo.
- **A previsão não desconta maquininha.** Superestima o caixa em até 5% do que deve entrar no
  cartão; a frase diz "se tudo isso acontecer", não "vai fechar".

---

## Riscos

- **Previsão lida como promessa.** "Fecha em R$ 1.200" num mês que fecha em R$ 900 ensina a
  desconfiar da tela. Por isso a frase é condicional e o caminho de cada número está na linha.
- **Mais três assinaturas na tela.** Do cache, custam pouco; sem rede, a agenda e o mês anterior
  vêm do que já foi aberto antes.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
