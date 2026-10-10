# Spec 119 · O pedido que chega no celular

**Tipo:** pedido novo pelo cardápio vira notificação no celular (ou no computador) de quem
ativou o aviso naquele aparelho, com o app fechado; com o app aberto, uma faixa no topo da tela.
Pelo Firebase Cloud Messaging, que já vem nos pacotes `firebase` e `firebase-admin` instalados.
**Uma subcoleção nova (`aparelhos`), uma variável de ambiente.** Nenhuma regra, nenhum índice,
nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** pedido de quem conduz o projeto (2026-10-10). Estava no "Fora de escopo" da 031 e
foi nomeado como "o próximo candidato" na 044.
**Depende de:** 031 (B), 058 (o número em "Pedidos", que continua sendo o estado; o aviso é o
toque).
**Aprovações pedidas:** (1) **schema aditivo**: `contas/{id}/aparelhos/{id}`; (2) **a chave Web
Push** gerada no console do Firebase (Cloud Messaging → certificados Web Push) em
`NEXT_PUBLIC_FIREBASE_VAPID_KEY`; (3) a reversão de um item do "Fora de escopo" da 031 ("aviso
para a dona por push") e, em parte, do `#d77` ("o aviso é a cliente, pelo WhatsApp").
**Decisões a registrar:** `#d323`.

---

## Problema

1. **O pedido chega e ninguém vê.** A 058 marca "Pedidos" com o número, mas só para quem está com
   o Rende aberto. A Maynara passa o dia na bancada com o app fechado. A cliente mandou às 10h, a
   resposta sai às 19h, e nesse meio a cliente pediu na concorrente. Pedido sem resposta é venda
   perdida para ela e cardápio "que não funciona" para o Rende.
2. **O aviso hoje depende da cliente.** A tela de enviado pede que ela mande a mensagem no
   WhatsApp (`#d77`). Quem não manda, não avisa.
3. **Todo gestor de pedidos que se paga toca o celular** (o do iFood, o da Shopify, o do WhatsApp
   Business). É o recurso que faz o plano completo valer no dia a dia.

---

## 1 · O que esta spec decide: `#d323`

### Por que o FCM

- **Nenhum pacote novo.** `firebase/messaging` (o token no aparelho) e `firebase-admin/messaging`
  (o envio) já vêm nos dois pacotes instalados. O `web-push` seria dependência nova, e escrever
  a criptografia do Web Push à mão não é opção.
- **O service worker é o nosso.** O `sw.ts` do Serwist ganha os ouvintes `push` e
  `notificationclick`, e o `getToken` recebe o `serviceWorkerRegistration` que já existe: sem
  `firebase-messaging-sw.js`, sem segundo service worker. A mensagem vai **só com `data`**
  (`titulo`, `corpo`, `url`, `tag`) e quem desenha a notificação é o `sw.ts`, o que deixa a forma
  sob controle e igual nos navegadores. **A sessão confere a forma do `event.data.json()` que o
  FCM entrega** antes de escrever o ouvinte (passo 2).

### O aparelho

- **`contas/{contaId}/aparelhos/{id}`**: `{ v, uid, token, ativo, plataforma, criadoEm,
atualizadoEm }`. O `id` é o SHA-256 do token, em hex (`crypto.subtle`): ativar duas vezes no
  mesmo aparelho regrava o mesmo documento, sem ler antes. `plataforma` é grosseira
  (`"android" | "iphone" | "computador"`), só para o painel dizer onde está ativo.
- **Desligar é `ativo: false`**, nunca apagar (o invariante). O token que o FCM recusa
  (`messaging/registration-token-not-registered`, `invalid-registration-token`) também vira
  `ativo: false`, pelo servidor.
- **A regra não muda.** `aparelhos` cai no `match /{colecao}/{documento=**}`: quem tem acesso à
  conta lê e escreve, a ajudante inclusive (pedido é trabalho das duas, `#d157`). A exportação
  (`/api/conta/exportar`) **pula** `aparelhos`: token de aparelho é credencial, não dado do
  negócio. A purga apaga junto, porque lista as coleções.
- **O token envelhece.** Ao abrir o app, com permissão dada e o aparelho ativo (o `id` em
  `localStorage`, `rende:aviso-aparelho`), `getToken` de novo; mudou → grava o novo e desativa o
  antigo. Sem rede, espera a próxima abertura.

### Ativar

- **Pedir permissão só no toque.** O navegador some com o pedido de quem pergunta ao abrir a
  página, e no iPhone ele só pode vir de um gesto.
- **Onde:** em `/configuracao`, no bloco dos avisos (`#avisos`), uma linha nova **"Avisar neste
  aparelho quando chegar pedido pelo cardápio"**, por aparelho (a do e-mail é por conta). E no
  painel "Seu cardápio" aberto, sem nenhum aparelho ativo na conta, uma faixa informativa
  "Quer saber na hora quando chegar um pedido?" com "Avisar neste aparelho".
- **Os casos que a linha explica**, sem esconder: sem rede, desligada com "Precisa de internet
  para ativar."; permissão negada, "O aviso está bloqueado neste navegador. Libere nas
  configurações do site." (ícone e texto); **iPhone fora do app instalado**, "No iPhone, o aviso
  só funciona com o Rende instalado na tela de início." com o link para "Instalar" de
  `/comecar` (o Safari só entrega notificação a app instalado, iOS 16.4 em diante); navegador
  sem suporte (`isSupported()` falso), a linha some.
- **Ativo:** "Ativo neste aparelho" e, embaixo, "Também em: 1 computador" quando há outros.

### O envio

- No handler do cardápio, **depois** do `set` e da resposta à cliente: `after(() =>
avisarAparelhos(contaId, pedido))`, como o e-mail de boas-vindas já faz. O aviso nunca atrasa
  nem derruba o pedido; erro vai para o log e para.
- `avisarAparelhos` (em `lib/server/avisos.ts`): `aparelhos where ativo == true` (campo único,
  sem índice), `sendEach` com uma mensagem por token, `webpush.headers.Urgency = "high"`, e os
  recusados viram `ativo: false`.
- **O texto**, por `avisoDePedidoNovo(pedido)` em `domain/cardapio.ts`, puro e testado:
  título "Pedido novo pelo cardápio"; corpo "Ana · 6 itens · R$ 112,00 · para sexta, 25 de
  outubro" (primeiro nome, `formatarMoeda`, `rotuloDiaPorExtenso`); `tag` = `pedido-{id}`; `url`
  = `/pedidos/{id}`.
- **O toque na notificação** abre `/pedidos/{id}`: foca a janela do Rende que já existe e navega,
  ou abre uma.

### Com o app aberto

- O `sw.ts`, ao receber o `push`, procura uma janela do Rende **visível**. Achando, manda a
  mensagem para ela (`postMessage`) e não desenha a notificação do sistema; não achando, desenha.
- No layout de `(app)`, `AvisoDePedido` ouve a mensagem e mostra, no topo, uma faixa informativa
  por 8 segundos: "Pedido novo pelo cardápio: Ana · R$ 112,00" com "Ver" (`/pedidos/{id}`) e o
  fechar. `role="status"`, entra por opacidade, respeita `prefers-reduced-motion`. O número da
  058 sobe junto, pela assinatura que já existe.

---

## 2 · Antes de tocar em código

1. **Pedir as aprovações** e gerar a chave Web Push no console (anotar em `DEPLOY.md`).
2. Num `next build && next start` (o Serwist é desligado em `dev`), mandar uma mensagem de teste
   pelo Admin SDK e registrar a forma do `event.data.json()` no `sw.ts`.
3. Ler `src/app/api/conta/route.ts` (o `after`), o handler do cardápio e o bloco `#avisos` de
   `TelaConfiguracao`.
4. Conferir que o `getToken` com `serviceWorkerRegistration` não registra um segundo service
   worker (aba Application do DevTools).

---

## 3 · Escopo

- `types/` (`AparelhoDeAviso`), `caminhos.aparelhos`, `domain/cardapio.ts`
  (`avisoDePedidoNovo`, com teste), `lib/server/avisos.ts`, o handler.
- `lib/firebase/avisos.ts` (ativar, desativar, renovar o token), `src/app/sw.ts` (os dois
  ouvintes e a escolha entre faixa e notificação), `AvisoDePedido.tsx` no layout de `(app)`.
- `TelaConfiguracao.tsx` (a linha), `SeuCardapio.tsx` (a faixa), `/api/conta/exportar` (pular
  `aparelhos`).
- `firebaseAdmin.ts`, no cabeçalho: o handler do cardápio também lê `aparelhos` e escreve
  `ativo: false` neles.
- Linha em `components/comecar/novidades.ts`: "O aviso de pedido novo no celular".

---

## 4 · Roteiro de navegador

1. **Android, app instalado.** Ativar em `/configuracao`: o navegador pergunta; aceitar: "Ativo
   neste aparelho". Fechar o app. Mandar um pedido pelo cardápio de outro celular: a notificação
   chega em segundos, com o nome, os itens, o valor e o dia. Tocar: abre o pedido.
2. **Com o app aberto** em `/fichas`: a faixa no topo, nenhuma notificação do sistema, o número
   em "Pedidos" sobe.
3. **iPhone pelo Safari, sem instalar:** a linha explica e manda instalar. Instalado: o passo 1
   funciona.
4. **Desligar:** o pedido seguinte não toca neste aparelho e toca no outro ativo.
5. **Desinstalar o app no Android** e mandar um pedido: o aparelho vira `ativo: false` sozinho.
6. **A ajudante** ativa no celular dela e recebe o mesmo aviso.
7. **Falha:** com a chave Web Push errada (só em teste), o pedido é gravado e a cliente vê
   "Pedido enviado" igual.

---

## Critérios de aceite

- [ ] Ativar por aparelho, só no toque, com os quatro casos explicados (sem rede, bloqueado,
      iPhone sem instalar, sem suporte).
- [ ] Pedido do cardápio toca os aparelhos ativos em segundos, depois da resposta à cliente.
- [ ] App aberto e visível: faixa no lugar da notificação.
- [ ] Token recusado vira `ativo: false`; nada é apagado; a exportação pula `aparelhos`.
- [ ] Nenhuma dependência nova; nenhuma regra mudada.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d323` escrito; `ESTADO.md`, `DEPLOY.md` e
      `novidades.ts` atualizados.

---

## Fora de escopo

- **Aviso de outras coisas** (pedido que passou do dia, meta batida, conta a pagar). O canal fica
  pronto; cada aviso novo é uma decisão sobre o que merece tocar o celular dela.
- **Escolher o som, horário de silêncio, agrupar avisos.** O sistema do celular já faz.
- **Aviso por e-mail do pedido novo.** O push resolve na hora; o e-mail é para o que pode esperar
  (044).
- **Responder pela notificação** ("Confirmar" no próprio aviso). Exige ação de escrita do
  service worker sem a tela; vem depois de ver se ela usa o aviso.
