# Spec 078 · O pedido de sempre

**Tipo:** montar o pedido com menos digitação: os produtos que estão sendo pedidos à mão em um
toque, −/+ na quantidade, "Repetir o último pedido" da cliente cadastrada e a nota por item, que o
schema já tem e a tela nunca usou. **Nenhum campo novo, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** uma sessão. Se apertar, a nota por item (§ 1.4) vira 078-B.
**Origem:** crítica da tela de pedido sobre os prints de 2026-10-02.
**Depende de:** a 075 (a ordem dos blocos).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d275` e `#d276`.

---

## Problema

O print do pedido novo mostra o caminho para pôr um produto: tocar em "Buscar produto", digitar,
tocar no resultado. É busca e só busca. Na feira, em pé, com uma mão, ela digita "coo" para o
produto que é metade das vendas. Os apps de venda que cobram assinatura no Brasil (Kyte, os
gestores de cardápio como Anota AI e Goomer) e o ponto de venda do Square abrem com o catálogo
para tocar; reconhecer é mais rápido que lembrar.

O resto, no mesmo bloco:

- **A quantidade é um campo de texto sem −/+.** Doze cookies são tocar no campo, apagar o "1",
  digitar "12". Com farinha no dedo.
- **A cliente que repete não tem atalho.** "A Janessa quer repetir o pedido do dia 23" (`#d252`)
  hoje é achar o pedido na lista e remontar item por item.
- **A nota de um item vai para a observação do pedido.** "Escrever _Feliz 30 anos_ no bolo" e
  "sem nozes, só no brownie" se misturam com "entregar depois das 18h". `ItemPedido.observacao`
  existe no schema e `criarPedido` já grava (`mutations/pedidos.ts:231`); nenhuma tela escreve.

---

## 1 · O que esta spec decide

### 1.1 · Os que estão saindo, em um toque: `#d275`

- Acima da busca, até **seis pílulas** (44px, borda `--border-strong`, `+` e o nome) com os
  produtos mais pedidos **nos pedidos que a tela já carregou**: `pedidosAbertos` (os do
  horizonte de 30 dias, `useDespensaParaProduzir`), contando unidades por `fichaTecnicaId`, sem
  `CANCELADO`. Nenhuma leitura nova; funciona sem rede e para a ajudante.
- Só fichas que a busca ofereceria (`opcoesFicha`: ativas, e a mesma ficha não duas vezes, exceto
  combo à escolha). Tocar adiciona com 1, como a busca; a pílula sai da fila porque o filtro tira.
- **Menos de três produtos** contados: as pílulas não aparecem. Três pílulas tiradas do nada são
  pior que nenhuma.
- Rótulo do grupo, acima delas, em `label`: "Saindo bastante". `role="group"` com esse nome.

### 1.2 · −/+ na quantidade

- `LinhaItemPedido`: botões − e + de 44×44 dos dois lados do campo, que continua para digitar
  "24" ou "1,5". O passo é 1; o − para em 1 (tirar a linha é a lixeira, que fica onde está).
- Dentro do combo à escolha, o −/+ já existe (`EscolhaDoCombo`): o desenho é o mesmo.

### 1.3 · Repetir o último pedido da cliente: `#d276`

- Pedido **novo**, cliente **vinculada** (`clienteId`) e **nenhum item** ainda: abaixo do selo do
  cadastro, uma linha com o último pedido dela e a ação.

  ```
  Último pedido: 23/09 · 6 Cookie Nutella, 2 Brownie · R$ 104,00     [ Repetir ]
  ```

- **De onde:** `consultaPedidosDaCliente` (a da 065, mesmo índice) com `limit(3)`, o primeiro que
  não é `CANCELADO`. Assina só depois de vincular; sem vínculo, nenhuma leitura.
- **O que copia:** os itens (ficha, quantidade, escolhas do combo, nota do item), a forma de
  pagamento e a entrega (tipo, taxa, endereço). **Não copia** data, hora, desconto, status nem
  observações do pedido: são do combinado de hoje.
- **Com o preço de hoje**, não o do pedido antigo: o item entra agora, e é ao entrar que o preço
  congela (`#d08`). Um item cuja ficha foi arquivada ou desativada fica fora, e a linha diz:
  "Brownie não está mais à venda e ficou fora."
- Depois de repetir, a linha some (o pedido já tem itens).

### 1.4 · A nota de cada item

- Embaixo de cada linha, terciário "Anotar neste item" (`NotebookPen`), que abre um campo de uma
  linha, rótulo "Nota deste item", placeholder "Escrever _Feliz 30 anos_ em dourado". Com texto,
  a nota aparece sob o nome em `label` `--ink-muted`, e tocar nela edita.
- Grava em `ItemPedido.observacao`, que `criarPedido` e `atualizarPedido` já levam.
- Aparece também na ficha do pedido (063), sob o item, e na mensagem do WhatsApp
  (`mensagemDoPedido`), entre parênteses depois do item.

---

## 2 · Antes de tocar em código

1. Conferir que `esquemaPedido` não recusa `observacao` no item e que `atualizarPedido` a leva
   (o `criarPedido` leva).
2. Conferir que `pedidosAbertos` não inclui o próprio pedido em edição; na contagem das pílulas
   isso não importa, mas na 079 importa.
3. `/impeccable` com registro **product**.

---

## 3 · Escopo

- `domain/pedido.ts`: `maisPedidos(pedidos, n)` e `itensParaRepetir(pedido, fichas)` (o que entra,
  com o preço de hoje, e o que ficou fora), com teste.
- `FormularioPedido.tsx`, `LinhaItemPedido.tsx`, `FichaDoPedido.tsx` (a nota), `whatsapp.ts` (a
  nota), com o teste da mensagem.

---

## 4 · Roteiro de navegador

1. Pedido novo, com 5 produtos nos pedidos do mês: seis pílulas no máximo, a mais pedida primeiro;
   tocar adiciona e a pílula sai.
2. Conta nova, sem pedidos: nenhuma pílula.
3. −/+ leva de 1 a 12 e volta; o − para em 1; digitar "1,5" continua valendo.
4. Vincular a Janessa: aparece o último pedido; "Repetir" põe os itens com o preço de hoje e a
   entrega dela; a data continua a de hoje.
5. Um item do pedido antigo com a ficha arquivada: fica fora e a linha diz qual.
6. "Anotar neste item": a nota sai na ficha e no WhatsApp.
7. Sem rede: pílulas e −/+ funcionam; o "Repetir" aparece se a consulta estiver no cache, e não
   aparece se não estiver (nenhum erro).

---

## Critérios de aceite

- [ ] Pílulas só com três ou mais produtos, sem leitura nova.
- [ ] −/+ com 44px, parando em 1.
- [ ] Repetir copia com o preço de hoje e diz o que ficou fora.
- [ ] Nota por item gravada em `observacao` e mostrada na ficha e no WhatsApp.
- [ ] `maisPedidos` e `itensParaRepetir` com teste.
- [ ] Nenhum campo, regra, índice ou dependência.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d275` e `#d276` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Grade do catálogo com foto.** As fichas não têm foto de venda, e a pílula resolve o caso
  comum.
- **Item avulso, fora do catálogo** ("topo personalizado, R$ 25"). É de propósito: só o que tem
  custo calculado entra, senão a sobra do pedido mente. Volta se ela pedir com um caso.
- **A nota na folha do orçamento** e na lista de produção. Spec própria, se a nota for usada.
- **Pedido recorrente** (a cafeteria toda segunda). "Repetir" cobre o primeiro passo.

---

## Decisões desta spec que são fáceis de rejeitar

- **Os mais pedidos dos próximos 30 dias, e não do mês no agregado.** O agregado é da dona e do
  pagamento; os pedidos abertos já estão na tela, valem para a ajudante e mostram o que está
  saindo agora.
- **Repetir com o preço de hoje.** O de 23/09 pode estar defasado, e o pedido é de hoje.
- **Copiar a forma e a entrega.** A cliente que repete quase sempre repete o jeito.

---

## Riscos

- **A pílula mudar de lugar entre aberturas.** É contagem viva. Aceitável: o nome está escrito, e
  a busca continua.
- **Repetir um pedido de combo com receita escolhida arquivada.** `escolhasCompletas` acusa na
  linha, como hoje; o salvar não passa sem ela completar.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
