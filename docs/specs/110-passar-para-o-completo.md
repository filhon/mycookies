# Spec 110 · Passar para o Completo

**Tipo:** "Passar para o Completo" (painel da assinatura em `/configuracao`) e "Mudar para o
completo" (`SoNoCompleto`) abrem direto a confirmação da troca no portal do Stripe. A
configuração do portal sai do clique no painel e vira comando da CLI escrito em `DEPLOY.md`.
**Nenhum campo, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão, pequena.
**Origem:** print do portal em 2026-10-09: "Assinatura Rende · R$ 29,00 por mês", só com
"Cancelar assinatura" e sem nenhuma opção de trocar de plano.
**Depende de:** 032 (os dois pacotes) e 084 (o painel da assinatura).
**Aprovações pedidas:** nenhuma no código. A configuração do portal é mudança na conta do
Stripe, feita pelo Filipe, primeiro no modo de teste e depois no modo ao vivo.
**Decisões a registrar:** `#d313`.

---

## Problema

1. **O portal não oferece troca de plano.** O passo 3 de "Stripe, o segundo plano" em
   `DEPLOY.md` ("Customers can switch plans", com os dois produtos) nunca foi feito, e o print
   confirma isso. Configuração por clique não fica registrada em lugar nenhum e se perde entre o
   modo de teste e o ao vivo.
2. **Mesmo configurado, o botão leva à página inicial do portal.** Ela teria de achar "Atualizar
   assinatura" e escolher de novo o produto e o período: três telas para confirmar uma decisão
   que já tomou no app.
3. **O portal não diz qual é o pacote.** O produto essencial se chama "Assinatura Rende", e
   quem está no essencial não lê "Essencial" em lugar nenhum do portal.

---

## 1 · O que esta spec decide: `#d313`

- **O portal é configurado pela CLI.** `stripe billing_portal configurations update <bpc_…>`
  na configuração padrão, com o bloco de comandos inteiro em `DEPLOY.md`, substituindo o passo
  2 da seção da 028 e o passo 3 da seção da 032. O mesmo bloco roda com `--live`. Recursos:
  - trocar o cartão (`payment_method_update`) e ver as cobranças (`invoice_history`);
  - cancelar no fim do período (`subscription_cancel.mode=at_period_end`);
  - `subscription_update` ligado, com `default_allowed_updates=[price]` e os **dois produtos com
    os quatro preços**;
  - `proration_behavior=always_invoice`: subir de pacote cobra a diferença proporcional na hora;
  - `schedule_at_period_end` com `decreasing_item_amount` e `shortening_interval`: descer de
    pacote, ou passar do anual para o mensal, vale só no fim do período já pago. As ajudantes
    ficam até lá, e o `#d170` as tira quando o webhook vir o essencial vivo.
- **Os produtos ganham o nome do pacote.** "Rende Essencial" e "Rende Completo", com
  `stripe products update`. A `metadata.pacote` não muda (`#d169`): o essencial continua sem ela.
- **`POST /api/assinatura/portal` aceita `para?: "COMPLETO"`.** Com esse campo, a rota relê a
  assinatura (`stripeSubscriptionId`), pega o item, descobre o período pelo
  `price.recurring.interval` (como `resumo/route.ts` já faz) e cria a sessão com
  `flow_data.type = "subscription_update_confirm"`, o item apontando para
  `PRECOS.COMPLETO[periodo]`. O período nunca muda nessa troca: quem paga mensal vai para o
  completo mensal. Se ela já está no preço do completo, a rota abre o portal comum. O
  `return_url` continua `/configuracao`: o documento da conta é observado, e "Plano Completo"
  aparece sozinho quando o webhook gravar.
- **O webhook não muda.** Ele já lê o pacote do produto em todo `customer.subscription.updated`.
- **O checkout e o portal continuam os do Stripe** (reafirma o `#d146`). A marca entra pelo
  painel, em Settings → Branding: ícone, logo, cor de destaque e fonte. Domínio próprio para o
  checkout fica de fora (ver Fora de escopo).

---

## 2 · Antes de tocar em código

1. No modo de teste, rodar o bloco da CLI e abrir o portal de uma assinatura essencial:
   "Atualizar assinatura" precisa listar os dois produtos.
2. Conferir que `subscription_update_confirm` aceita o preço do completo com essa configuração
   (o fluxo exige `subscription_update` ligado e o preço na lista do portal). Se o Stripe
   recusar, parar e dizer.

---

## 3 · Escopo

- `src/app/api/assinatura/portal/route.ts`: o campo `para` e o `flow_data`.
- `src/components/conta/LinhaDaAssinatura.tsx` e `src/components/assinatura/SoNoCompleto.tsx`:
  mandam `para: "COMPLETO"` no botão do completo. O "Trocar o cartão, ver as cobranças ou
  cancelar" continua sem `para`.
- `docs/DEPLOY.md`: o bloco da CLI no lugar dos passos por clique, com `--live` ao lado.

---

## 4 · Roteiro de navegador

Modo de teste, `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

1. Assinante do essencial mensal → Configuração → Assinatura → "Passar para o Completo": o
   portal abre já na confirmação "Rende Completo · por mês", com o valor proporcional de hoje.
2. Confirmar: de volta a `/configuracao`, o painel passa a "Plano Completo" em segundos, e o
   cardápio deixa de mostrar o cadeado.
3. O mesmo pelo "Mudar para o completo" de `/cardapio`.
4. Essencial anual → completo **anual**.
5. Portal comum, a partir do completo: escolher o essencial deixa a troca agendada para o fim
   do período; o painel continua "Plano Completo" e as ajudantes continuam.
6. O portal mostra "Rende Essencial" / "Rende Completo" e a marca configurada.

---

## Critérios de aceite

- [x] Bloco da CLI em `DEPLOY.md`, aplicado no teste (e no ao vivo antes de publicar).
- [x] "Passar para o Completo" abre a confirmação, sem passar pela página inicial do portal.
- [x] Descer de pacote fica para o fim do período.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d313` escrito; `ESTADO.md`. Sem linha em `novidades.ts`: a MyCookie's é `livre` e
      não vê o botão.

---

## 5 · Fora de escopo

- **Checkout próprio (Stripe Elements).** É o que apps grandes fazem quando o checkout é
  produto, com assentos, impostos por país ou vários métodos. Aqui seria trazer `Stripe.js`
  para o navegador e ser dono do 3-D Secure, sem ganho para quem vende cookie.
- **Domínio próprio no checkout** (`pagar.rendeapp.com.br`). É um recurso pago do Stripe;
  volta quando a URL do Stripe aparecer como motivo de abandono.
- **Trocar de plano dentro do app** (`subscriptions.update` direto, com prévia do proporcional
  desenhada por nós). O portal já faz isso.
- **Cortesia.** É a 111.
