# Spec 117 · O pedido que a cliente acompanha

**Tipo:** cada pedido ganha um link só dele, que a cliente abre sem login e vê em que pé está a
encomenda, quanto deu, quanto falta pagar e o Pix copia e cola com o valor. O link sai na tela
de "Pedido enviado" do cardápio, na mensagem de aviso e no resumo do WhatsApp que a dona manda
do app. **Um campo opcional novo em `Pedido` (`chavePublica`).** Nenhuma regra, nenhum índice,
nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** pedido de quem conduz o projeto (2026-10-10), depois da crítica do cardápio público
(112 a 116). Estava no "Fora de escopo" da 031.
**Depende de:** 031 (B), 080 (o Pix com valor), 081 (o sinal). Tudo codificado. Se a 116 já
entrou, o link usa o apelido.
**Aprovações pedidas:** (1) **schema aditivo**: `Pedido.chavePublica?: string`; (2) **o que sai
para fora**: os dados de um pedido para quem tem o link dele (seção 1, a lista fechada); (3) a
reversão de um item do "Fora de escopo" da 031 ("a cliente acompanhando o pedido").
**Decisões a registrar:** `#d320`.

---

## Problema

1. **Depois de "Enviar pedido", a cliente fica no escuro.** A tela de enviado some quando ela
   fecha a aba. Se a Maynara confirmou, se o total mudou com a taxa de entrega, se o pedido está
   pronto: a cliente só sabe perguntando no WhatsApp. "Já confirmou?" e "quanto deu mesmo?" são
   as mensagens que o cardápio existe para poupar.
2. **O Pix com valor (080) só chega dentro de uma mensagem.** Com sinal (081), o valor muda depois
   do primeiro pagamento, e a cliente rola a conversa procurando o código certo.
3. **A 031 deixou fora porque "exige identificar a cliente sem login".** Não exige: basta um link
   que só ela tem. É assim que todo serviço de pedido por link manda o "acompanhe seu pedido", e é
   o mesmo desenho do cardápio: o servidor lê, a regra continua sem nada público (`#d158`).

---

## 1 · O que esta spec decide: `#d320`

### O link é a chave

- **`Pedido.chavePublica?: string`**: 16 bytes aleatórios em base64url (22 caracteres). Gerada
  na criação: pelo handler do cardápio (`crypto.randomBytes`) e por `criarPedido` no aparelho
  (`crypto.getRandomValues`, funciona sem rede). O domínio recebe a chave pronta: `corpoDoPedido`
  e `pedidoDoCardapio` continuam puros e testáveis. Pedido antigo, sem chave: ganha uma por
  `garantirChavePublica` no primeiro toque em "Mandar o resumo", despachado como toda escrita.
- **O endereço:** `/c/{contaId}/pedido/{pedidoId}/{chave}`. Na rota, e não em `?chave=`: o
  WhatsApp e os encurtadores às vezes cortam o parâmetro.
- **A página** (`src/app/c/[contaId]/pedido/[pedidoId]/[chave]/page.tsx`, componente de
  servidor, `dynamic = "force-dynamic"`, sem `revalidate`: o status muda e cada pedido é aberto
  poucas vezes) lê com o Admin SDK o pedido, a conta e a configuração. Chave ausente ou
  diferente (comparada com `timingSafeEqual`), pedido arquivado, conta encerrada ou sem
  `permite(…, "cardapio")`: **a mesma página de não encontrado**, que não diz se o pedido
  existe. Arquivar o pedido é revogar o link.
- **A prévia do link não tem dado pessoal.** `title` é "Seu pedido na {loja}" e a descrição é
  "Acompanhe a sua encomenda.": nada de nome, valor ou data, que aparecem na conversa de quem
  receber o link encaminhado. `noindex`, como o resto.

### O que a página mostra, e mais nada

Por `acompanhamentoDoPedido(pedido, negocio, formas, hojeISO)` em `domain/acompanhamento.ts`,
puro e com o teste das chaves (como o `#d158`):

- **O pé em que está**, na voz da confeiteira, numa trilha de quatro passos (ícone e texto,
  nunca só cor): `ORCAMENTO` "A {quem} vai confirmar" (com "Este orçamento vale até …" quando há
  `validoAteISO`), `CONFIRMADO` "Confirmado", `EM_PRODUCAO` "Sendo feito", `PRONTO` "Pronto para
  retirar" ou "Pronto, sai para entrega", `ENTREGUE` "Retirado" ou "Entregue". `CANCELADO` sai da
  trilha e vira uma linha só: "Este pedido foi cancelado. Fale com a {quem} se tiver dúvida."
- **O código**, o dia (`rotuloDiaPorExtenso`) e a hora quando há (`horaEntrega`, 064), retirada
  ou entrega com o endereço como foi escrito.
- **Os itens** com as escolhas (`nomeComEscolhas`), o subtotal, a taxa de entrega ("a combinar"
  no orçamento com taxa zero), o desconto quando há, e o total.
- **O pagamento:** "Pago", ou o sinal recebido e "Falta R$ …" (`faltaPagar`).
- **O Pix copia e cola** de `faltaPagar`, com "Copiar o Pix de R$ …" (`BotaoCopiar`), só quando
  o pedido saiu do orçamento, não está cancelado, falta pagar, e a forma do pedido é Pix com
  `pix` preenchido (080). Fora disso, nada: a página não oferece Pix de um valor que a dona
  ainda não confirmou.
- **"Falar com a {quem}"**, o WhatsApp com "Oi! É sobre o pedido P-…".
- **Nunca:** custo, lucro, taxa da maquininha, `observacoes` (no pedido feito no app, a
  anotação é dela, não da cliente), a observação por item, a forma de pagamento além do Pix,
  `clienteId`, telefone da cliente.

### Onde o link aparece

- **Cardápio, "Pedido enviado":** "Acompanhar o pedido" (secundário), abaixo de "Avisar a {quem}
  no WhatsApp". `POST /api/cardapio/pedido` passa a devolver `{ codigo, total, link }`.
- **A mensagem de aviso** (`mensagemDeAviso`) termina com "Acompanhar: {link}". O link fica
  na conversa das duas, que é onde a cliente vai procurar depois.
- **O resumo do WhatsApp do app** (`mensagemDoPedido`) ganha a linha "Acompanhe o pedido:
  {link}" quando o pedido tem chave e a conta tem o cardápio. O domínio recebe o link pronto
  (`location.origin` mora no componente).

---

## 2 · Antes de tocar em código

1. **Pedir as aprovações.**
2. Ler `corpoDoPedido`/`criarPedido` e o `satisfies Omit<Pedido, "id">` do handler: o campo
   novo precisa estar nos dois, e `atualizarPedido` não pode apagá-lo (`updateDoc` mantém o que
   não recebe; conferir).
3. Ler `mensagemDoPedido` e os testes dela: o link entra por parâmetro, e o teste sem link
   continua igual.
4. Ler `TrilhaDoPedido` (075): a trilha da cliente é irmã dela, com outras palavras.

---

## 3 · Escopo

- `types/vendas.ts` (`chavePublica?`), `domain/acompanhamento.ts` com teste (os seis status,
  retirada e entrega, Pix só nas condições, sinal, as chaves), `domain/whatsapp.ts`
  (`mensagemDoPedido` com link), `domain/cardapio.ts` (`mensagemDeAviso` com link).
- `mutations/pedidos.ts` (`chavePublica` na criação, `garantirChavePublica`); o handler do
  cardápio.
- A página nova, `not-found.tsx` dela, e `CopiarPix.tsx` (cliente, pequeno).
- `PedidoPeloCardapio.tsx` (o botão), `BlocoWhatsApp` (o link no resumo).
- `firebaseAdmin.ts`, no cabeçalho: a página do pedido lê o pedido, a conta e a configuração, e
  só devolve o que `acompanhamentoDoPedido` deixa passar.
- Linha em `components/comecar/novidades.ts`: "A cliente acompanha o pedido pelo link".

---

## 4 · Roteiro de navegador

1. Pedido pelo cardápio num celular deslogado: "Acompanhar o pedido" abre a página com "A
   Maynara vai confirmar" e "a combinar" na taxa.
2. No app, confirmar com taxa de R$ 8,00 e forma Pix: recarregar a página da cliente mostra
   "Confirmado", o total com a taxa e "Copiar o Pix de R$ 120,00". Colar no app do banco: o
   valor vem preenchido.
3. Registrar um sinal de R$ 60,00: "Falta R$ 60,00" e o Pix de R$ 60,00.
4. Mudar para Pronto e para Entregue: a trilha anda.
5. Trocar um caractere da chave na URL: não encontrado. Arquivar o pedido: não encontrado.
6. Pedido feito no app, "Mandar o resumo": a mensagem tem "Acompanhe o pedido:"; pedido antigo
   ganha a chave nesse toque, sem rede inclusive.
7. Colar o link numa conversa: a prévia diz "Seu pedido na MyCookie's", sem nome nem valor.

---

## Critérios de aceite

- [ ] `chavePublica` gerada na criação (handler e app) e no resumo de pedido antigo.
- [ ] A página só abre com a chave certa; o resto dá o mesmo não encontrado.
- [ ] Teste das chaves: nada além da lista sai.
- [ ] Pix só confirmado, não cancelado, com falta e forma Pix configurada; do valor que falta.
- [ ] O link no "Pedido enviado", na mensagem de aviso e no resumo do app.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d320` escrito; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **O acompanhamento é do pacote que tem o cardápio.** Pedido feito no app de uma conta do
  Essencial não leva link. É o lado da cliente da cliente, como o cardápio; se o Essencial
  precisar, é uma linha em `RECURSOS_DO_PACOTE`.
- **Sem atualização ao vivo.** A cliente recarrega. Uma escuta no navegador dela exigiria regra
  pública; consultar a cada tantos segundos é leitura paga por aba esquecida aberta.
- **Link sem prazo.** Vale enquanto o pedido não for arquivado. Um pedido de três meses atrás
  aberto pelo link mostra "Entregue", o que não prejudica ninguém.

---

## Fora de escopo

- **Avisar a cliente quando o status muda** (WhatsApp automático, SMS, e-mail). A API do WhatsApp
  é paga por conversa e fala em nome dela; a dona continua mandando o resumo.
- **A cliente cancelar ou mudar o pedido pela página.** Escrita pública num pedido que a dona já
  confirmou.
- **"Meus pedidos"** (todos os pedidos da cliente). Exige identificar a cliente entre pedidos.
- **Pagar com cartão pela página.** É a fronteira da 031 (outro provedor, na conta dela).
