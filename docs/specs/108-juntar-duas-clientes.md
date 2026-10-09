# Spec 108 · Juntar duas clientes

**Tipo:** quando a mesma pessoa foi cadastrada duas vezes, ela junta as duas numa só: os
pedidos passam para uma, os números somam, a outra é arquivada. **Um campo opcional novo em
`Cliente` (`juntadaEm`). Nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/clientes` sobre os prints de celular e desktop de 2026-10-09.
**Depende de:** 105 (o "Juntar" mora na ficha). Melhor depois da 107 (`telefoneParaLer`
compara os telefones).
**Aprovações pedidas:** o campo `juntadaEm?: { clienteId: string; em: Timestamp }`.
Aditivo e compatível, mas é schema.
**Decisões a registrar:** `#d311`.

---

## Problema

1. **A Yasmin Rocha está duas vezes.** No print: uma com R$ 72,00 e 2 pedidos, outra com
   R$ 24,00 e 1 pedido, **o mesmo telefone** 81987315065. E há "Yasmin n 2" logo acima. Somada,
   ela tem R$ 96,00 e 3 pedidos: é a quinta da lista e "Voltam sempre" na 106, não a nona e a
   quadragésima.
2. **Cadastro duplicado nasce do jeito certo de trabalhar.** A cliente nasce do pedido, no
   meio da feira, com pressa (`#d137`); digitar "Yasmin" e não ver a sugestão é normal. Shopify,
   HubSpot e Square têm "mesclar cliente" por isso. Aqui, a única saída é arquivar uma e perder
   o histórico dela da soma.
3. **Agregado dividido estraga tudo o que vem depois**: o ranking, o momento da 106, o "o que
   ela pede" da 105.

---

## 1 · O que esta spec decide: `#d311`

- **Onde:** na ficha (105), "Juntar com outra cliente" (terciário) no fim, perto do "Editar".
  Abre a busca de clientes (`BuscaItem` sobre `consultaClientes`, sem ela mesma), e, escolhida
  a outra, a confirmação no lugar, sem modal: "Os 1 pedido de Yasmin Rocha (R$ 24,00) passam
  para esta Yasmin Rocha. Ela fica com 3 pedidos e R$ 96,00. A outra é arquivada." com
  "Juntar" (secundário) e "Cancelar".
- **A ficha aberta é a que fica.** Telefone, Instagram, endereço e observação vazios nela são
  preenchidos com os da outra; os preenchidos não mudam; observações nas duas são
  concatenadas com uma quebra de linha.
- **Sugestão de duplicada:** a ficha diz "Pode ser a mesma pessoa: Yasmin Rocha" com
  "Juntar" quando outra cliente viva tem o mesmo telefone por `telefoneParaLer` ou o mesmo
  `nomeBusca`. Por `possiveisDuplicadas(cliente, clientes)` em `domain/clientes.ts`, com
  teste, sobre a lista que a tela já tem. Só na ficha; a lista não ganha aviso.
- **A conta**, por `juntarAgregados(fica, sai)` em `domain/clientes.ts`, com teste:
  `totalPedidos` e `totalGasto` somam, `ticketMedio` por `ticketMedioDe`, `ultimoPedidoEm` o
  maior.
- **A gravação**, `juntarClientes` em `mutations/clientes.ts`, num `writeBatch` (funciona
  offline; não é transação):
  - cada pedido de `consultaPedidosDaCliente(sai)` ganha `clienteId: fica.id`.
    `clienteNome` e `clienteTelefone` **não mudam**: são snapshot do dia (`#d35`).
  - `fica` recebe os agregados e os campos preenchidos.
  - `sai` recebe `arquivado: true` e `juntadaEm: { clienteId: fica.id, em }`, e
    `totalClientes` desce 1, como em `arquivarCliente`. **Nada é apagado.**
  - Mais de 499 escritas: recusa com a frase, sem gravar nada. Uma cliente não tem 500
    pedidos hoje, e a recusa é melhor que um lote pela metade.
- **Só a dona junta.** A ajudante não vê o botão; a regra de hoje já nega a ela escrever em
  agregados, e o `#d157` vale igual.
- **Sem desfazer na tela**, como o arquivar (`#d138`): o `juntadaEm` existe para que o script
  saiba desfazer um engano.

---

## 2 · Antes de tocar em código

1. **Pedir a aprovação do campo** e conferir como a 101 e a 104 introduziram campo opcional
   sem subir `VERSAO_SCHEMA`. Fazer igual.
2. Conferir em `firestore.rules` que a dona pode atualizar `clienteId` de um pedido pago (a
   regra de pedido pago pode travar campos). Se travar, **parar e pedir aprovação** da regra:
   a spec não muda regra sozinha.
3. Conferir se algum agregado do mês guarda `clienteId` (ranking de clientes do Caixa, por
   exemplo). Se guardar, juntar não o reescreve, e o `#d311` diz isso.

---

## 3 · Escopo

- `types/vendas.ts` (`juntadaEm?`), `domain/clientes.ts` (`juntarAgregados`,
  `possiveisDuplicadas`) com teste, `mutations/clientes.ts` (`juntarClientes`),
  `FichaDaCliente.tsx`.

---

## 4 · Roteiro de navegador

1. Ficha da Yasmin Rocha de R$ 72,00: "Pode ser a mesma pessoa: Yasmin Rocha".
2. "Juntar": a frase com os números; confirmar; a lista mostra uma Yasmin com R$ 96,00 e 3
   pedidos.
3. Abrir em `/pedidos` o pedido que era da outra: a ficha diz o mesmo nome, e "Todos os
   pedidos de Yasmin Rocha" mostra os três.
4. Sem rede: juntar, voltar a rede, e o lote sobe inteiro.
5. Entrar como ajudante: a ficha não tem "Juntar".

---

## Critérios de aceite

- [x] Pedidos passam, agregados somam, a outra arquivada com `juntadaEm`. Nada apagado.
- [x] Sugestão por telefone ou nome, com teste.
- [x] Lote único; recusa acima do teto, sem gravar pela metade.
- [x] Só a dona.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d311` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Juntar três de uma vez.** Duas, e de novo.
- **Restaurar cliente arquivada na tela.** `#d138` continua.
- **Reescrever `clienteNome` dos pedidos antigos.** É snapshot, por decisão.
