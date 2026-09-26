# Spec 053 · O kit que rende um

**Tipo:** correção de número. Um kit passa a render sempre uma unidade, o formulário para de
perguntar quanto ele rende, e o kit gravado com rendimento diferente de 1 é apontado na lista e
no editor, sem reescrita automática. De carona, "1 unidades prontas" vira "1 unidade pronta".
**Nenhum campo novo, nenhuma consulta, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão, com folga.
**Origem:** crítica da tela Produtos com `/impeccable` e `/frontend-design` (2026-09-26), a
partir dos prints de desktop e de celular com os 12 produtos da conta da Maynara.
**Depende de:** nada. **É a primeira da série e vem antes de tudo**: a 054 e a 056 somam lucro
por produto, e com o kit errado elas somariam um número falso.
**Aprovações pedidas:** nenhuma. O schema não muda: `rendimento` continua lá, só passa a valer 1
para kit.
**Decisões a registrar:** `#d227`.

---

## Problema

Na tabela do print, os três combos são os produtos que mais deixam por unidade:

| Produto          | Rende | Custo/un | Praticado | Sobra na tela | Custo × rende |
| ---------------- | ----- | -------- | --------- | ------------- | ------------- |
| Combo 4 Cookies  | 4 un  | R$ 12,88 | R$ 48,00  | R$ 35,09      | ~R$ 51,52     |
| Combo Degustação | 5 un  | R$ 12,28 | R$ 60,00  | R$ 44,70      | ~R$ 61,40     |
| Combo Dupla      | 2 un  | R$ 16,46 | R$ 24,00  | R$ 6,31       | ~R$ 32,92     |

O caminho do número:

1. `calcularCustoFicha` divide o custo do lote pelo rendimento (`custoFicha.ts:276`).
2. Num kit, o lote é **um** kit: `EscolhaDoKit.quantidade` diz "quantas unidades desta escolha
   entram em UM kit", e o comentário de `FichaTecnica.rendimento` diz "ou 1, para um kit".
3. Mas o formulário pergunta "Rende" também para o kit (`FormularioFicha.tsx:898`) e só semeia
   o 1 quando o campo está vazio na troca de tipo (`:574`). A Maynara leu "rende" como "quantos
   cookies vão dentro" e digitou 4, 5 e 2.
4. O custo de um combo é dividido pelo número de cookies dentro dele. Se o preço praticado é o
   do combo inteiro, **os três combos perdem dinheiro e a tela diz que são os melhores produtos
   do cardápio.**
5. O erro não para na lista: `custoDoItem` (`pedido.ts:84`) usa o `custoUnitarioSnapshot`, então
   o lucro do pedido, o do agregado do mês e o ranking do Caixa herdam o mesmo número.

É a pergunta que o produto existe para responder ("estou ganhando em cada doce?") respondida ao
contrário, no produto de maior valor. Nada mais nesta série importa antes disto.

**De carona.** O print mostra "1 unidades prontas" em Cookie Pistache 120g: `FraseDoPronto`
junta `ROTULO_UNIDADE_RENDIMENTO` (sempre plural) com `PRONTO` (sempre plural).

---

## 1 · O que esta spec decide

### Kit rende um: `#d227`

- **No formulário**, com `tipo === "KIT"`, o bloco "O kit" não mostra "Rende" nem "Em". O valor
  gravado é `rendimento: 1`, `unidadeRendimento: "un"`, sempre, por `derivarFicha` ou pelo
  próprio `onSubmit`, onde for mais curto. A descrição do bloco troca "quanto sai de um lote" por
  "quanto tempo a montagem toma".
- **Na lista**, a célula "Rende" do kit (desktop) e o "rende N unidades" da linha do celular
  viram **"leva N"**: a soma de `componentes[].quantidade` e `escolhas[].quantidade`. É o que ela
  quis dizer com o 4, e é derivado: nenhum número pedido.
- **Kit gravado com `rendimento !== 1`** não é reescrito sozinho. Reescrever mudaria preço e
  sobra de algo que ela vende hoje sem ela ver, e pode ser que um kit tenha sido montado de
  propósito como "lote de 4 caixas". Em vez disso:
  - Na lista, o selo `atencao` com `TriangleAlert`: **"Confira o kit"**, no lugar em que hoje
    sai "Custo desatualizado".
  - No editor, uma faixa de aviso no topo do bloco "O kit": _"Este kit está dividido por 4. Se
    R$ 48,00 é o preço da caixa inteira, ela custa R$ 51,52 e perde R$ 3,52."_ (com os números
    da ficha, por `calcularCustoFicha` com `rendimento: 1`), e a ação em texto **"É o preço da
    caixa inteira"**, que põe o 1 no formulário e deixa o painel de preço recalcular. Nada grava
    até ela salvar, como toda edição.
  - Salvo com 1, o selo some.

### A quantidade concorda com o número

`rotuloDaQuantidade(n, unidade)` em `custoFicha.ts`, com teste: "1 unidade", "2 unidades",
"1 porção", "300 gramas". `FraseDoPronto` usa ele e concorda o "pronta/prontas". Procurar os
outros lugares que juntam número com `ROTULO_UNIDADE_RENDIMENTO` (`grep`) e trocar só os que
podem receber 1.

---

## 2 · Antes de tocar em código

- **Conferir a hipótese com o dado.** Abrir o Combo Dupla no editor: o bloco de custo diz
  "Dividido por 2"? Os componentes são os dois cookies de uma caixa? Se sim, a spec vale como
  está. Se ela montou o kit como lote de verdade (componentes para duas caixas), o selo e a faixa
  continuam valendo, só a frase muda para perguntar em vez de afirmar. Registrar o que viu no
  `#d227`.
- `consumoPorLote` e `capacidadeDaFicha` tratam kit à parte (`producao.ts:696`)? Garantir que o
  rendimento 1 não muda nada na despensa, ou ajustar.
- Pedidos já pagos ficam como estão. O snapshot é o que foi registrado; o histórico continua
  auditável (invariante "nunca apagar", o mesmo espírito).

---

## 3 · Escopo

- `src/lib/domain/custoFicha.ts`: `rotuloDaQuantidade`, `levaDoKit(ficha)` e `kitDividido(ficha)`
  (`tipo === "KIT" && rendimento !== 1`), com teste.
- `src/components/fichas/FormularioFicha.tsx`: o campo some no kit, a faixa e a ação.
- `src/components/fichas/LinhaFicha.tsx`: "leva N" e o selo.
- `src/components/fichas/PainelProduto.tsx`: o "rende N un" do cabeçalho vira "leva N" no kit.
- `src/components/producao/FraseDaCapacidade.tsx`: a concordância.

---

## 4 · Roteiro de aparelho

1. Conta da Maynara: os três combos mostram "Confira o kit" na lista.
2. Abrir o Combo Dupla: a faixa diz o custo da caixa inteira e a sobra; tocar na ação; o painel
   de preço muda antes de salvar; salvar; o selo some e a sobra da lista é a nova.
3. Criar um kit novo: não há campo "Rende"; salvo, a lista diz "leva N".
4. Cookie Pistache com uma unidade contada: "1 unidade pronta".
5. Um pedido pago antes da correção continua com o lucro que tinha.

---

## Critérios de aceite

- [x] Kit novo grava `rendimento: 1` sem perguntar.
- [x] Kit antigo com rendimento diferente de 1 é apontado na lista e no editor, e só muda quando
      ela salva.
- [x] "leva N" na lista e no painel, derivado dos componentes e escolhas.
- [x] "1 unidade pronta", com teste de `rotuloDaQuantidade`.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d227` escrito, com o que o dado mostrou; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Corrigir pedidos já pagos ou o agregado de meses fechados.** O que foi registrado fica;
  "Recalcular o mês" continua lendo o snapshot.
- **Rever o tempo de montagem do kit.** Se a caixa carrega uma hora de trabalho própria, a
  faixa de composição do editor já mostra; é decisão dela.
- **Avisar por e-mail que os kits estavam errados.** A lista já diz, na tela em que ela decide.
