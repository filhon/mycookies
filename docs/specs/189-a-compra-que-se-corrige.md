# Spec 189 · A compra que se corrige

**Tipo:** o histórico de preço passa a ser corrigível e legível. Corrigir um preço errado não vira
uma compra nova; uma compra lançada errada pode ser descartada, e fica à vista, riscada; cada
compra diz de onde veio (nota, à mão, no mercado).
**Tamanho:** uma sessão.
**Origem:** o mesmo relato da 188: o açúcar a R$ 3,59 "o grama" ficou no histórico, e consertar à
mão só empilhou mais uma compra por cima.
**Depende de:** 188 (`baseAceita`, que a correção também respeita).
**Aprovações pedidas:** nenhuma. `HistoricoPreco` ganha dois campos **opcionais**; documento antigo
continua válido sem eles, e nada se apaga.
**Decisões a registrar:** duas, numeradas na sessão: (1) correção reescreve a última compra em vez
de acrescentar, e (2) descartar é marcar, nunca tirar do array.

---

## Problema

Hoje toda escrita que muda preço, embalagem **ou perda** (`precoMudou`) faz `arrayUnion` de uma
entrada nova com a data de agora. Daí:

- **Corrigir é comprar.** Ela digita R$ 3,59 em 1 g, percebe, corrige para 1 kg: o histórico fica
  com duas "compras" do mesmo dia, uma absurda, e a variação diz "caiu 99%".
- **O erro não sai.** Não há como tirar a entrada errada. Ela fica nas doze até a poda.
- **Perda vira compra.** Mudar a perda de 0 para 5% empurra uma "compra" com o mesmo preço, contra
  `#d222`, que diz que "perda mudar não é o preço mudar" (o quilo do histórico é sem perda).
- **Base misturada.** `FichaDoMaterial` formata toda entrada na base **atual** do material. Uma
  entrada em `un` num material em `g` sai com quilo e embalagem sem sentido.
- **Sem procedência.** Ela não sabe se R$ 3,59 veio da nota do Atacadão, de uma digitação dela ou da
  correção na lista de compras.

---

## 1 · O que esta spec decide

### O documento

`HistoricoPreco` ganha:

- `origem?: "NOTA" | "MANUAL" | "MERCADO"`. Ausente nas antigas e na da biblioteca (que já se
  reconhece por `ehDaBiblioteca` e `criadoEm`). `"NOTA"` leva junto `estabelecimento?` (o nome
  impresso), que é o que a linha mostra.
- `descartadaEm?: Timestamp`. Presente, a compra não conta para nada: nem preço, nem variação, nem
  "última compra".

O teto de doze continua (`#d222`); descartadas contam no teto e saem primeiro na poda.

### Registrar ou corrigir

No formulário do material, quando preço ou embalagem mudam, aparece logo abaixo de "Como você
compra" a escolha, com a primeira marcada:

- **"Comprei de novo, por este preço"**: como hoje, entrada nova com a data de agora, `origem:
"MANUAL"`.
- **"Corrigir a última compra"**: reescreve **a última compra dela que não foi descartada**,
  mantendo a data dela e trocando preço, embalagem e custo. `ultimaCompraEm` não muda: corrigir
  não rejuvenesce o preço (088).

Quando a última entrada é a da biblioteca, só a primeira opção existe: o preço médio não é compra
dela, e `temPrecoMedio` precisa ver duas entradas.

O caminho fica em `mutations/insumos.ts`: `atualizarInsumo(contaId, anterior, dados, modo:
"COMPRA" | "CORRECAO")`. A correção grava o array inteiro a partir do documento em mãos (uma
escritora, `#d104`), com `updateDoc`, offline. A regra de qual entrada se reescreve é do domínio:
`historicoCorrigido(historico, entrada)`, com teste.

### Perda não é compra

`precoMudou` deixa de olhar `perdaPercentual`. Perda mudar continua marcando as fichas
desatualizadas (o custo corrigido muda), mas não empurra entrada. O nome passa a dizer o que faz:
`compraMudou` para o histórico, `custoMudou` para as fichas.

### Descartar

Na ficha do material, cada compra dela ganha, ao toque, "Descartar esta compra" (confirmação em dois
passos, como "Arquivar", sem modal):

- Descartada a **última**, o material volta para o preço e a embalagem da compra válida anterior
  (campos derivados regravados, fichas marcadas). Sem compra válida anterior, a ação não aparece: o
  que resta é corrigir.
- A linha fica na lista, riscada, com "descartada em 16 out" e "Desfazer". Desfazer limpa
  `descartadaEm` e refaz o mesmo cálculo.
- A regra mora em `domain/custoInsumo.ts`: `vigenteDoHistorico(historico)` devolve a entrada que
  vale; `comprasDoInsumo` pula descartadas na variação.

### A ficha do material

- Cada linha mostra a procedência: "Nota · Atacadão", "À mão", "No mercado". Sem `origem`, nada.
- A embalagem e o quilo de cada entrada saem da base **da entrada** (`unidadeBaseDe(unidadeCompra)`).
  Variação só entre entradas da mesma base; entre bases, nenhuma seta.
- A frase de rodapé ("Subiu 12% desde…") ignora descartadas.
- A linha de Materiais que ordena por "Preço mudou" usa a última compra válida.

### Quem grava a procedência

- Nota (`importarNota`): `origem: "NOTA"` e o estabelecimento do cabeçalho.
- Formulário: `"MANUAL"`.
- Lista de compras (`corrigirPrecoNaLista`): `"MERCADO"`.

---

## 2 · Antes de tocar em código

1. Ler `mutations/insumos.ts` inteiro, `mutations/notas.ts`, `mutations/listasCompra.ts`
   (`corrigirPrecoNaLista`), `custoInsumo.ts` (`comprasDoInsumo`, `ordenarMateriais`),
   `biblioteca.ts` (`temPrecoMedio`), `FichaDoMaterial`, `PorqueDoItem` (lê a última e a
   anterior).
2. Ler `#d104`, `#d222` (o quilo sem perda) e `#d226`.
3. Procurar todo leitor de `historicoPrecos` (`grep`) e decidir, um por um, se pula descartadas.

---

## 3 · Escopo

- `types/insumos.ts`: os dois campos opcionais.
- `domain/custoInsumo.ts`: `historicoCorrigido`, `vigenteDoHistorico`, base por entrada,
  descartadas fora da variação; teste.
- `mutations/insumos.ts`: `modo`, `compraMudou`/`custoMudou`, `descartarCompra`,
  `restaurarCompra`, origem; poda tirando descartadas primeiro.
- `mutations/notas.ts`, `mutations/listasCompra.ts`: a origem.
- `FormularioInsumo`: a escolha registrar/corrigir.
- `FichaDoMaterial`: procedência, base por entrada, descartar e desfazer.
- `PorqueDoItem` e `ordenarMateriais`: última compra válida.

---

## 4 · Roteiro

1. Farinha a R$ 4,99/kg. Editar para R$ 49,90, "Corrigir a última compra": o histórico continua com
   uma entrada de R$ 49,90 com a data antiga; editar de novo para R$ 4,99, "Corrigir": volta a uma
   entrada de R$ 4,99.
2. "Comprei de novo" por R$ 5,49: duas entradas, "subiu 10%".
3. Mudar só a perda: nenhuma entrada nova; os produtos com farinha ficam marcados.
4. Ler uma nota que atualiza o açúcar: a compra diz "Nota · Atacadão".
5. Descartar a última compra do açúcar: o material volta ao preço anterior, a linha fica riscada,
   "Desfazer" devolve.
6. Material da biblioteca sem compra dela: só "Comprei de novo".
7. Material com entradas em `g` e em `un` (o açúcar antes da 188): cada linha na sua base, sem seta
   entre elas.

---

## Critérios de aceite

- [ ] Corrigir um preço não cria compra nova nem muda a idade do preço.
- [ ] Uma compra errada se descarta, fica visível, e o material volta à anterior.
- [ ] Perda não cria compra.
- [ ] Cada compra diz de onde veio, quando gravada depois desta spec.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] Decisões registradas; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Corrigir só a última.** Corrigir uma do meio exigiria refazer a cadeia de variações e não muda o
  preço de hoje. Para a do meio, descartar resolve.
- **Descartar dentro do array, e não apagar.** O histórico é auditável (`CLAUDE.md`, "Nunca
  apagar"); o risco é o mesmo do arquivar, num nível abaixo.
- **"Comprei de novo" marcado por padrão.** É o caso comum (`PRODUCT.md`, contexto 2) e o de hoje:
  quem não lê a escolha tem o comportamento que já tinha.

---

## Fora de escopo

- Histórico além das doze, em subcoleção.
- Gráfico do preço (`#d223`).
- Desfazer uma nota inteira (materiais, caixa e despensa de uma vez). Material a material, a 189
  resolve; o lançamento no caixa já se edita em `/financeiro`.
- Editar a data de uma compra.
