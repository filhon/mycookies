# Spec 063 · A ficha do pedido

**Tipo:** tocar num pedido da lista abre a ficha para ler, numa folha no celular e no painel
lateral no desktop, com o próximo passo, "Recebi", WhatsApp, ligar e mapa. Editar vira um botão.
**Nenhum campo, nenhuma regra, nenhuma dependência.** A consulta é a mesma que a tela já tem.
**Tamanho:** uma sessão.
**Origem:** crítica da tela Pedidos (2026-10-01).
**Depende de:** 062 (a linha e a vista Me devem, de onde a ficha mais abre).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d249`, `#d250`.

---

## Problema

**Toda ação passa pelo editor inteiro.** Para marcar um pedido como entregue, ela abre
`/pedidos/[id]` (o formulário de 1.500 linhas, sem navegação inferior), rola até "Em que pé está",
toca, rola até o pagamento, toca, volta. No domingo 20 de setembro foram oito entregas: oito
vezes isso, em pé, com o celular numa mão.

**Ler é editar.** Para separar o pedido da Janessa na bancada ("quais cookies vão no combo?"), ela
entra num formulário com campos vivos. A 023 existe porque sair de um formulário sem querer
perde coisa; ler não deveria correr esse risco.

**O telefone e o endereço não levam a lugar nenhum.** O pedido tem `clienteTelefone` e
`entrega.endereco`, e da lista não se chega ao WhatsApp, à ligação ou ao mapa. O resumo pelo
WhatsApp (`BlocoWhatsApp`, spec 010) existe, mas só dentro do editor.

O que os serviços pagos fazem aqui: o gestor de pedidos do iFood avança o pedido com um toque na
própria fila; o Shopify abre o pedido em leitura com as ações no topo; o Kyte manda o recibo pelo
WhatsApp do próprio pedido. A Materiais já fez a mesma troca na 050 (`#d222`): tocar lê, editar é
um botão.

---

## 1 · O que esta spec decide

### Tocar lê; editar é um botão: `#d249`

Tocar numa linha de `/pedidos` abre o `Painel` com `FichaDoPedido`, pelo mesmo arranjo da 050
(abrir, fechar, URL e voltar do aparelho como lá). "Novo pedido" e o "+" continuam indo direto ao
editor.

```
Janessa Domingos                                       [Orçamento] · Entrega
Hoje, quinta, 1 de outubro · o preço vale até 3 de outubro
──────────────────────────────────────────────────────────────────────────
1 × Combo 4 Cookies                                              R$ 55,00
    1 Cookie Pistache 120g · 3 Cookie Tradicional 120g
                                                 sobram R$ 27,58 pra você
Entrega · R$ 5,00 · Rua das Acácias, 120, Águas Claras       [Abrir no mapa]
(61) 99999-0000                                     [WhatsApp]   [Ligar]
Sem lacinho, é presente.
Pix · ainda não pago
──────────────────────────────────────────────────────────────────────────
[        Confirmar pedido        ]      [Editar pedido]
```

- **Itens com a composição inteira** (`nomeComEscolhas`), quantidade, total e a sobra, que é o par
  obrigatório "preço + sobra".
- **Entrega:** o endereço é um `<a>` para
  `https://www.google.com/maps/search/?api=1&query=` com o endereço codificado. Abre o app de
  mapa que o aparelho tiver. Retirada: "Retirada", sem link.
- **Telefone:** "WhatsApp" é `<a>` de `linkDoWhatsApp` (sem `window.open`, `#d77`); "Ligar" é
  `tel:`. Sem telefone discável (`telefoneParaWhatsApp` devolve `null`), o número aparece como
  texto e os dois botões não existem.
- **A mensagem do WhatsApp depende do pé do pedido.** Entregue e não pago: cobrança curta,
  "Oi, Ana! Passando pra lembrar do pedido de 27/9, R$ 13,00. Obrigada!", função nova em
  `domain/whatsapp.ts` com teste. Qualquer outro: `mensagemDoPedido`, o resumo de hoje. Ela confere
  e envia; nada sai sozinho.
- **O botão primário do rodapé é o próximo passo**, de `transicoesPermitidas` (o "adiante", com
  `ACAO_STATUS_PEDIDO`): Confirmar pedido, Começar a produzir, Marcar como pronto, Marcar como
  entregue. Entregue e não pago: **"Recebi"**. Entregue e pago, ou cancelado: sem primário.
- **Voltar um passo, cancelar e arquivar ficam no editor.** São raros e um deles desfaz dinheiro;
  não ganham lugar na folha que ela usa com uma mão.
- Mudar o status pela ficha usa `mudarStatusPedido` como o editor (`FormularioPedido.mover`), e a
  ficha se atualiza pela assinatura que a lista já tem: nada de estado copiado.
- **Ajudante:** a ficha segue exatamente o que o editor deixa a ajudante fazer hoje (conferir
  `soLeitura` e o bloco de pagamento para a ajudante, e repetir; não inventar regra).

### "Recebi" fora do editor: `#d250`

`marcarPedidoPago` precisa do `ContextoPagamento` (resumo do mês e meta, assinados para gravar
sem rede, `#d29`), das formas de pagamento e da cliente vinculada. Hoje isso mora dentro de
`FormularioPedido`.

- Extrair `useContextoPagamento(contaId, competencia)` de `FormularioPedido` para um hook, usado
  pelos dois. A mutação não muda.
- "Recebi" grava com o dia de hoje e a forma de pagamento do pedido. Sem forma no pedido, a ficha
  mostra as formas ativas como pílulas antes de confirmar, com o primário desativado até escolher.
  Outro dia de pagamento continua sendo coisa do editor.
- Depois de pago, a linha do pagamento vira "Pix · pago hoje" com o terciário **"Desfazer"**
  (`desfazerPagamento`), que existe enquanto a ficha estiver aberta. Errar o toque tem volta no
  mesmo lugar.
- A cliente vinculada (`totalPedidos`, `totalGasto`) é lida pelo id do pedido, como o editor faz.

---

## 2 · Antes de tocar em código

- Ler como a 050 abre e fecha o painel e como trata a URL e o voltar do aparelho; seguir igual.
- Conferir que `FormularioPedido` continua idêntico depois de extrair o hook (é refatoração: o
  roteiro do editor tem que passar sem diferença).
- Conferir quais formas de pagamento cobram taxa: "Recebi" com forma diferente da do pedido muda
  `custoTaxaPagamento`, e a sobra gravada. Se a mutação não recalcula isso sozinha, a ficha só
  oferece formas quando o pedido não tem nenhuma, e a troca de forma fica no editor.

---

## 3 · Escopo

- `src/components/pedidos/FichaDoPedido.tsx`: novo.
- `src/components/pedidos/ListaPedidos.tsx` e `LinhaPedido.tsx`: a linha abre a ficha.
- `src/components/pedidos/FormularioPedido.tsx`: usa o hook extraído.
- `src/lib/hooks/useContextoPagamento.ts`: novo.
- `src/lib/domain/whatsapp.ts`: mensagem de cobrança, com teste.

---

## 4 · Roteiro de aparelho

1. 360×640: tocar na Janessa abre a folha com o combo inteiro e a sobra. Arrastar para baixo fecha.
   O voltar do aparelho fecha a folha, não sai da tela.
2. "Confirmar pedido": o selo vira Confirmado na ficha e na linha, sem fechar a folha.
3. Pedido do domingo, entregue e não pago: "Recebi" grava; a linha some de Me devem; "Desfazer"
   devolve.
4. Sem rede: "Recebi" grava no aparelho e o selo do cabeçalho diz "Salvo no aparelho".
5. "WhatsApp" de um pedido não pago abre a conversa com a cobrança escrita; de um orçamento, com o
   resumo.
6. "Abrir no mapa" abre o mapa com o endereço; "Ligar" abre o discador.
7. "Editar pedido" abre o editor; voltar dele volta para a lista.
8. Desktop: a ficha abre no painel lateral direito, a lista continua à esquerda.
9. Ajudante: a ficha não oferece nada que o editor não ofereça a ela.
10. Editor de pedido: marcar pago, desfazer, mudar status e salvar funcionam como antes.

---

## Critérios de aceite

- [ ] Tocar na linha lê; "Editar pedido" leva ao editor.
- [ ] Próximo passo e "Recebi" pela ficha, com "Desfazer".
- [ ] WhatsApp, ligar e mapa como `<a>`; cobrança com teste.
- [ ] `useContextoPagamento` usado pelo editor e pela ficha; editor sem regressão.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d249` e `#d250` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Ação na própria linha** (botão "Entregue" sem abrir nada, ou deslizar). A linha é um alvo
  inteiro; um segundo alvo dentro dela erra com farinha no dedo, e deslizar não se descobre. Se a
  ficha não bastar no domingo cheio, a resposta é lote, não um botão por linha.
- **A ficha a partir da Hoje** (`AgendaHoje`, `EsperandoVoce`). Continuam abrindo o editor. Levar
  a ficha para lá é uma linha por lista, depois de ela provar o desenho aqui.
- **Chave Pix na mensagem de cobrança.** Não existe na configuração; é campo novo.
- **Rota de entrega** com vários endereços. Uma conta por entrega já resolve o "onde fica".
