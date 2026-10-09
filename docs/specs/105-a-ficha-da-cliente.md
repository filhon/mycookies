# Spec 105 · A ficha da cliente

**Tipo:** tocar numa cliente passa a **ler**: o que ela pede, quando pediu, o que ela deve, o
que está marcado, a nota da alergia e os botões de falar com ela. Editar vira o botão do pé da
ficha. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/clientes` sobre os prints de celular e desktop de 2026-10-09.
**Depende de:** nada. Vem antes de todas as outras da crítica (106 a 109): todas terminam numa
linha que se toca, e hoje o toque abre um formulário.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d308`.

---

## Problema

1. **A linha tem chevron e abre um formulário.** O chevron promete um lugar; o toque entrega
   "Editar cliente" com cinco campos. Para saber o que a Janessa costuma pedir, ela sai de
   Clientes, vai a Pedidos, busca o nome e toca "Todos os pedidos de Janessa Domingos" (065).
   Três telas para a pergunta que toda ficha de cliente de Shopify, Square ou Nuvemshop
   responde na primeira dobra.
2. **A observação que salva a encomenda está escondida.** "Alergia, preferência, o laço que
   ela gosta" (a dica do campo) só aparece dentro do formulário de edição. É o dado mais
   importante na hora de atender, e a tela não o mostra.
3. **Nenhuma ação a partir da cliente.** Não há WhatsApp, ligar, Instagram nem "novo pedido
   pra ela". Clientes é uma tela de consulta que não leva a lugar nenhum.
4. **Dinheiro em aberto não aparece.** A descrição avisa que "pedido combinado e ainda não
   pago não entra na conta", e para aí: a Janessa pode estar devendo R$ 60,00 e a linha dela
   só mostra o que já entrou.

---

## 1 · O que esta spec decide: `#d308`

- **Tocar lê.** A linha abre `FichaDaCliente` no `Painel` (folha no celular, painel no
  desktop), o mesmo desenho da `FichaDoPedido` (063). "Editar" (secundário, `pencil`) no pé
  abre o `PainelCliente` de hoje, que continua sendo o único lugar de editar e arquivar.
- **Ao abrir, assina `consultaPedidosDaCliente(contaId, id)`**, a do `#d252`, sem teto e sem
  índice novo. Esqueleto só nos blocos que dependem dela; o cabeçalho (nome, agregados,
  contato, observação) vem do documento da cliente, na hora e offline.
- **Ordem da ficha**, de cima para baixo:
  1. Nome em `title`; embaixo, em rótulo `--ink-muted`, `resumoDaCliente` de hoje.
  2. **A observação**, se houver, numa faixa informativa (`info`, ícone e frase inteira). Se
     ela contém "alerg" (por `chaveDeBusca`), a faixa é de atenção, com o triângulo e a palavra
     "Alergia". É a primeira coisa que ela lê depois do nome.
  3. **Falar com ela**: três botões secundários de 44px numa linha, cada um só com dado:
     "WhatsApp" (`telefoneParaWhatsApp` + `linkDoWhatsApp` com texto vazio), "Ligar"
     (`tel:`), "Instagram" (`https://instagram.com/{usuario}`). Sem telefone, nem WhatsApp nem
     Ligar; sem Instagram, o terceiro sai. Nenhum, a linha sai.
  4. **Em aberto**, só quando há: "Deve R$ …" (negativo, com `trending-down`, palavra e
     valor) com os pedidos entregues e não pagos, cada um tocável para a `FichaDoPedido`, e
     "Cobrar no WhatsApp" pela `mensagemDeCobranca` de hoje. Depois, "Marcado" com os pedidos
     ainda não entregues, pelo dia e a hora.
  5. **O que ela pede**: até três produtos por `maisPedidos` sobre os pedidos dela, com a
     quantidade somada ("Cookie Red Velvet · 14 no total"). Só com dois pedidos ou mais.
  6. **Pedidos**: a lista dela, do mais recente, com dia, itens resumidos (`resumoDosItens`),
     total e o selo de status; tocar abre a `FichaDoPedido`. Até dez, e "Ver os N pedidos"
     leva a `/pedidos` com a cliente escolhida, pela mesma via do `#d252`.
  7. Endereço, se houver, com "Abrir no mapa" como na ficha do pedido.
- **"Novo pedido pra ela"** é o âmbar do pé da ficha, ao lado de "Editar": abre
  `/pedidos/novo?cliente={id}`, e o formulário nasce com a cliente vinculada, como se ela a
  tivesse escolhido na busca. Com a cliente vinculada e sem itens, o "Repetir" da 078 aparece
  sozinho. O parâmetro sai da URL depois de lido, como o `anotado` do `#d273`.
- **O chevron fica**: agora ele diz a verdade.

---

## 2 · Antes de tocar em código

1. Conferir como a `FichaDoPedido` abre a partir de outra lista (o estado de "qual pedido
   está aberto") e se dá para abrir a ficha do pedido **de dentro** da ficha da cliente sem
   empilhar dois `Painel`. Se não der, tocar no pedido navega para `/pedidos/{id}`, e isso
   vai para o `#d308`.
2. Conferir como `/pedidos` recebe "a cliente escolhida" da 065: se é só estado da tela,
   "Ver os N pedidos" passa a usar um parâmetro `?cliente=` lido do mesmo jeito que `vista`
   (`#d246`). Se isso crescer além de uma leitura de parâmetro, "Ver os N pedidos" fica fora
   e a ficha mostra todos.
3. Conferir o que `aReceber` (`domain/pedido.ts`) espera de entrada e usar a mesma regra para
   "Deve", com o sinal (081) já descontado por `faltaPagar`.

---

## 3 · Escopo

- `components/clientes/FichaDaCliente.tsx` (novo), `ListaClientes.tsx` (o toque abre a
  ficha; "Editar" abre o painel), `FormularioPedido.tsx` (ler `?cliente=`).
- `domain/clientes.ts`: `temAlergia(observacoes)` e `instagramParaLink(usuario)`, com teste.
- Nada em `types/`, `firestore.rules` ou `firestore.indexes.json`.

---

## 4 · Roteiro de navegador

1. Celular, tocar Janessa: a folha abre com nome, resumo e os botões; os pedidos chegam com
   esqueleto e depois a lista; "O que ela pede" mostra até três produtos.
2. Cliente com "alérgica a amendoim" na observação: a faixa de atenção com o triângulo e a
   palavra, logo abaixo do nome.
3. Cliente sem telefone e sem Instagram: nenhuma linha de botões.
4. Cliente com um pedido entregue e não pago: "Deve R$ …" com ícone; "Cobrar no WhatsApp"
   abre o WhatsApp com a mensagem de cobrança.
5. "Novo pedido pra ela": o editor abre com ela vinculada e o "Repetir" à vista; recarregar
   a página não repete o vínculo pelo parâmetro.
6. Sem rede, abrir uma cliente nunca aberta: o cabeçalho e os botões aparecem; os blocos de
   pedidos mostram o que o cache tem ou esqueleto, sem erro em vermelho.
7. Desktop: o painel lateral, e "Editar" abre o formulário de hoje.

---

## Critérios de aceite

- [x] Tocar lê; editar e arquivar só pelo "Editar".
- [x] Observação à vista, com atenção quando fala de alergia.
- [x] WhatsApp, Ligar e Instagram só com dado.
- [x] O que ela deve e o que está marcado, com os pedidos tocáveis.
- [x] "Novo pedido pra ela" vincula a cliente.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d308` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Mensagem de "faz tempo"**: é a 106.
- **Gráfico de compras por mês da cliente.** Com um mês e meio de histórico, é uma barra.
- **Cadastrar cliente nesta tela.** O `#d137` continua: ela nasce do pedido.
- **Data de aniversário.** Campo novo, e o histórico ainda não tem um ano para dizer "faz um
  ano que ela pediu o bolo". Volta à mesa em setembro de 2027.
