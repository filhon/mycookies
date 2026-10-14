# Spec 163 · O pagamento que se confere sozinho

**Tipo:** a volta do Stripe traz o id da sessão do checkout, e `/assinatura/confirmando` pede
ao servidor que confira essa sessão e sincronize a assinatura na hora, sem esperar o webhook. O
webhook continua, e passa a chamar a mesma função. **Nenhum campo, nenhuma regra, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/assinatura/confirmando` com `/impeccable` (2026-10-14). O caminho
feliz hoje depende de o webhook chegar antes de ela desistir de olhar um símbolo pulsando, e a
tela afirma "Pagamento recebido" sem ter conferido nada: qualquer um que abra o endereço lê
isso. Os serviços que cobram assinatura bem confirmam na volta, com a sessão na mão (é o que a
documentação do Stripe recomenda: atender pelo webhook **e** pela página de volta, com a mesma
função idempotente).
**Depende de:** 028 (o webhook, `#d145`), 161 (`trial_end`).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. Uma rota nova que escreve o que o
webhook já escreve, pelo mesmo caminho.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **A tela não sabe se houve pagamento.** `success_url` não carrega nada; a página só observa
   o documento da conta. Ela diz "Pagamento recebido" para quem pagou, para quem só salvou o
   cartão no teste (161, R$ 0 hoje), para quem usou a cortesia e para quem digitou o endereço.
2. **O caminho feliz espera o webhook.** Em geral são segundos; num dia ruim do Stripe, ou com
   o webhook mal configurado num ambiente novo, ela olha 45 segundos de pulso e lê "avise quem
   cuida do Rende". A conta só abre quando o evento chega.
3. **"O pagamento chegou ao Stripe" é afirmação sem prova.** A frase dos 45 segundos diz isso
   sem ter lido a sessão.

---

## 1 · O que esta spec decide

### A sessão volta junto

- **`success_url`** passa a ser `${origem}/assinatura/confirmando?sessao={CHECKOUT_SESSION_ID}`
  (o Stripe troca o marcador pelo id).

### Uma função, dois chamadores

- **`sincronizarAssinatura(idDaAssinatura)`** em `src/lib/server/stripe.ts`: o corpo do webhook
  de hoje, do `subscriptions.retrieve` ao `documento.set`, sem mudar uma linha da lógica (relê
  o Stripe, claim antes do documento, ajudantes, `#d145`, `#d155`, `#d170`).
- **O webhook** fica: assinatura do corpo, filtro do tipo, `sincronizarAssinatura(id)`.
- Rodar as duas ao mesmo tempo é seguro: cada uma relê o estado atual e grava o mesmo número;
  tirar uma ajudante duas vezes dá no mesmo (`removidaEm` regravado, claim já sem a conta).
  Escrever isso no comentário da função.

### `POST /api/assinatura/confirmar`

Na ordem de `/api/assinatura/checkout`: credencial → token → corpo → autorização.

- Corpo `{ contaId, sessao }` (`esquemaConfirmar` em `domain/assinatura.ts`, `sessao` começando
  com `cs_`). `ehDona` falso → `fora-de-forma`.
- `checkout.sessions.retrieve(sessao)`. **`client_reference_id` diferente de `contaId` →
  `fora-de-forma`**: o id da sessão não abre a conta de outra pessoa.
- Devolve `{ situacao }`:
  - `"aberta"`: `status` não é `complete` (ela voltou sem terminar, ou a sessão expirou);
  - `"esperando"`: `complete` com `payment_status === "unpaid"` (forma de pagamento que
    compensa depois, se o painel do Stripe tiver alguma ligada);
  - `"confirmada"`: `complete` e `paid` ou `no_payment_required` (o teste da 161 e a
    cortesia), depois de `await sincronizarAssinatura(sessao.subscription)`.
- Falha do Stripe → `sem-resposta`, como no resumo.

### A página

- **Com `?sessao=`**, assim que há `usuario` e `contaId`, chama `confirmar` uma vez:
  - `"confirmada"`: o efeito de hoje assume (o documento vira `assinante`, `reconferirAcesso()`,
    a Hoje). Nada novo na tela nesta spec; a 164 é quem muda o que se vê.
  - `"aberta"`: `router.replace("/assinatura")`.
  - `"esperando"`: título "Esperando o pagamento", descrição "Assim que ele compensar, a conta
    abre sozinha. Pode fechar esta tela." Sem pulso.
  - Falha: segue observando o documento como hoje (o webhook continua chegando).
- **Sem `?sessao=`** (favorito, histórico): o comportamento de hoje.
- **A frase dos 45 segundos** perde "O pagamento chegou ao Stripe" e só afirma o que a tela
  sabe: "Está demorando mais que o normal. Se não liberar em alguns minutos, fale com a gente."
  O "fale com a gente" é o link do rodapé (`AJUDA_DA_ASSINATURA`) com o texto pronto levando o
  id da sessão quando houver: "Oi, assinei o Rende e a conta não liberou. Código: cs_…". É o
  que quem conduz o projeto procura no painel do Stripe.

---

## 2 · Antes de tocar em código

1. **Para onde o Stripe devolve no app instalado.** No iPhone com o Rende na tela de início e
   num Android instalado: assinar no modo de teste e anotar onde `success_url` abre (dentro do
   app, numa aba do navegador, logada ou não). No iPhone o app instalado não divide sessão com o
   Safari; se a volta cair no Safari sem login, ela vê `/login` depois de pagar.
   **Se cair deslogada em algum aparelho, parar e escrever na decisão**: a saída (confirmar só
   pela sessão, sem token, e dizer "Volte para o app do Rende") é uma spec própria, porque
   decide que o id da sessão vale como credencial de leitura.
2. Conferir no painel do Stripe (modo de teste e ao vivo) se há forma de pagamento assíncrona
   ligada para assinatura. Sem nenhuma, `"esperando"` fica por defesa e o roteiro 4 sai.

---

## 3 · Escopo

- `src/lib/server/stripe.ts`: `sincronizarAssinatura`.
- `src/app/api/stripe/webhook/route.ts`: passa a chamá-la.
- `src/app/api/assinatura/confirmar/route.ts` (novo).
- `src/app/api/assinatura/checkout/route.ts`: o `success_url`.
- `src/lib/domain/assinatura.ts`: `esquemaConfirmar` e a frase pronta da ajuda, com teste.
- `src/app/(auth)/assinatura/confirmando/page.tsx`: a chamada, `"aberta"`, `"esperando"`, a
  frase dos 45 segundos.

---

## 4 · Roteiro de navegador

Modo de teste. **Primeiro sem `stripe listen`**, para provar que a volta não depende do webhook.

1. Assinar o Essencial mensal numa conta vencida: a Hoje abre em poucos segundos, sem o webhook
   rodando. Ligar o `stripe listen` depois: nada muda, nada duplica.
2. Assinar no teste (161): abre igual, com `trialing`.
3. No checkout, voltar pela seta do Stripe e depois abrir à mão o `success_url` com aquele id:
   cai em `/assinatura`.
4. Se houver forma assíncrona: "Esperando o pagamento".
5. Abrir `/assinatura/confirmando?sessao=` com o id de uma sessão de outra conta: não sincroniza
   nada (resposta `fora-de-forma`), e a tela segue esperando o documento, como sem sessão.
6. Abrir `/assinatura/confirmando` sem `sessao`: o comportamento de hoje.

---

## Critérios de aceite

- [x] A conta abre na volta do Stripe sem depender do webhook.
- [x] O webhook e a volta usam a mesma função.
- [x] Sessão de outra conta não sincroniza nada.
- [~] A tela não afirma pagamento que não conferiu.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] Decisão escrita; `ESTADO.md`. Sem linha em `novidades.ts`: ninguém precisa saber que
      ficou mais rápido.

---

## 5 · Fora de escopo

- **O que a tela mostra depois de confirmar** (o plano, a cobrança, o cartão). É a 164.
- **Confirmar sem login.** Só se o passo 1 mostrar que é preciso, em spec própria.
- **`checkout.session.completed` no webhook.** A volta já cobre o que ele cobriria; os eventos
  de assinatura continuam sendo a verdade para tudo depois.
