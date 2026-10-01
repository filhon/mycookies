# Spec 065 · Achar um pedido

**Tipo:** busca na faixa de ferramentas de `/pedidos`, pelo nome da cliente, pelo produto e pelo
código; com cliente cadastrada, todos os pedidos dela. **Um índice composto novo**; nenhum campo,
nenhuma regra, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica da tela Pedidos (2026-10-01).
**Depende de:** 062 (as vistas; a busca atravessa as quatro).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d252`.

---

## Problema

"A Janessa quer repetir o pedido do dia 23." Hoje, a única forma de achar é rolar: o histórico vem
em páginas de 30, e só os últimos dez dias de setembro já somam 35 pedidos. Em três meses são dez
toques em "Mostrar mais antigos" e uma rolagem de dezenas de telas, procurando um nome com o olho.

Não há serviço pago de pedidos sem busca: Shopify, Stripe, Kyte, Bling e o próprio WhatsApp
abrem com ela. Materiais e Produtos aqui também têm. Pedidos é a lista que mais cresce e a única
que não tem.

---

## 1 · O que esta spec decide

### Duas fontes, sem servidor de busca: `#d252`

O Firestore não busca por pedaço de texto, e offline é o estado normal. A busca usa o que existe:

1. **Em memória, na hora.** Tudo o que a tela já tem (agenda, entregues em aberto e as páginas do
   histórico carregadas) filtrado por nome da cliente, nome do produto dos itens e código
   (`P-260923-K3F`), sem acento e sem caixa, com o mesmo normalizador do `nomeBusca`. Função pura
   em `domain/pedido.ts`, com teste.
2. **Pela cliente cadastrada.** Com dois caracteres ou mais, as clientes cujo `nomeBusca` começa
   pelo texto (a consulta de `clientes` que o editor de pedido já usa) aparecem no topo do
   resultado como "Todos os pedidos de Janessa Domingos · 12". Tocar assina
   `where("clienteId", "==", id)`, `arquivado == false`, `orderBy("dataEntregaISO", "desc")`: o
   índice composto novo `arquivado + clienteId + dataEntregaISO desc` em `firestore.indexes.json`.

- **Pedido de cliente avulsa** (sem `clienteId`) só se acha pela fonte 1. No fim do resultado,
  enquanto o histórico não acabou: "Procurar nos mais antigos", que carrega a próxima página de 30
  e refaz o filtro. É o "Mostrar mais antigos" de hoje, com outra frase.
- **Sem rede**, a fonte 2 responde só do cache, e a linha diz isso: "Sem internet, a busca olha só o
  que já foi aberto neste aparelho." Em informativo, nunca alerta.
- **O resultado ignora a vista.** Buscar "Janessa" em Orçamentos e não achar o pedido entregue dela
  seria a busca mentindo. Com texto no campo, as pílulas ficam desmarcadas; limpar o campo volta à
  vista de antes.
- **A faixa "Me devem / Vai entrar" continua**, com os mesmos números: é fato, não filtro.
- O campo segue o de `/insumos`: na faixa de ferramentas, fica quando o cabeçalho recolhe
  (`#d237`), e o cabeçalho não recolhe com o foco nele.

---

## 2 · Antes de tocar em código

- Achar o normalizador de `nomeBusca` e usar o mesmo; não escrever outro.
- Conferir quanto custa a assinatura por `clienteId` em leituras e se a regra de `pedidos` deixa a
  ajudante fazer essa consulta (se não deixa, para ela só a fonte 1).
- Publicar o índice antes do deploy (`DEPLOY.md`).

---

## 3 · Escopo

- `src/components/pedidos/ListaPedidos.tsx`: o campo, as duas fontes, o resultado.
- `src/lib/domain/pedido.ts`: o filtro, com teste.
- `src/lib/firebase/mutations/pedidos.ts`: `consultaPedidosDaCliente`.
- `firestore.indexes.json`: o índice.

---

## 4 · Roteiro de aparelho

1. Digitar "jan": aparecem os pedidos carregados da Janessa e, no topo, "Todos os pedidos de
   Janessa Domingos". Tocar mostra os doze, o mais recente primeiro.
2. Digitar "pistache": os pedidos com Cookie Pistache.
3. Digitar o código de um pedido: só ele.
4. Cliente avulsa de agosto: não aparece de cara; "Procurar nos mais antigos" até achar.
5. Sem rede: a frase informativa aparece; a busca em memória continua funcionando.
6. Limpar o campo: volta para a vista em que estava.
7. Descer com o campo vazio: o cabeçalho recolhe e o campo fica.

---

## Critérios de aceite

- [ ] Busca em memória por cliente, produto e código, com teste.
- [ ] Clientes cadastradas sugeridas, com todos os pedidos pelo índice novo.
- [ ] "Procurar nos mais antigos" para a avulsa.
- [ ] Frase honesta sem rede.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d252` escrito; `ESTADO.md` e `DEPLOY.md` (o índice) atualizados.

---

## 5 · Fora de escopo

- **Serviço de busca** (Algolia, Typesense). Dependência nova e dado da cliente fora do
  Firestore, para um volume que a memória do aparelho ainda carrega.
- **Buscar por valor ou por data.** A lista já é por data; valor é pergunta de caixa.
- **Os pedidos da cliente no `PainelCliente`.** A consulta desta spec serve para isso, e fica para
  quando Clientes for revista.
