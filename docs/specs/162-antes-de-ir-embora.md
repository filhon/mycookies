# Spec 162 · Antes de ir embora

**Tipo:** cancelar ganha botão próprio no painel da assinatura; antes do Stripe, o app mostra o
que fica e oferece a saída mais barata (descer para o Essencial, ou passar para o mensal); o
portal pergunta o motivo e pode oferecer um desconto de permanência. Quem marcou o fim pode
desmarcar no mesmo painel. **Nenhum campo, nenhuma regra, nenhuma dependência.** Configuração do
portal pela CLI, como na 110.
**Tamanho:** uma sessão.
**Origem:** crítica de `/assinatura` com `/impeccable` (2026-10-14). O que mais separa um serviço
que fatura bem de um que não fatura é quanto ele perde por mês, e o caminho de cancelar daqui é
o portal sem pergunta nenhuma.
**Depende de:** 084 (o painel), 110 (o portal pela CLI e o `flow_data`), 159 (o painel é o
lugar da assinatura de quem assina).
**Aprovações pedidas:** nenhuma no código. **O desconto de permanência é decisão de preço** de
quem conduz o projeto: quanto e por quantos meses, ou nenhum. Sem resposta, a spec vai sem ele.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **Cancelar está escondido numa frase e sai do app sem conversa.** "Trocar o cartão, ver as
   cobranças ou cancelar" leva ao portal, e lá é um clique. Ninguém fica sabendo por quê, e a
   assinante não vê o que ela perde nem a alternativa mais barata.
2. **Não se sabe por que ninguém sai.** Sem motivo registrado, a próxima spec de preço é
   chute.
3. **Quem paga o Completo e quer pagar menos só enxerga "cancelar".** Descer para o Essencial
   existe no portal (110), agendado para o fim do período, mas ninguém oferece.
4. **Quem marcou o fim não tem como voltar daqui.** O painel diz "Termina em 12 de novembro"
   em atenção e não oferece desfazer.

---

## 1 · O que esta spec decide

### No painel, antes do Stripe

- **"Cancelar a assinatura"**, botão terciário próprio, depois de "Trocar o cartão ou ver as
  cobranças" (a frase de hoje perde o "ou cancelar").
- **Tocar abre, no mesmo painel, o passo "Antes de cancelar"** (troca de conteúdo, não um
  modal: cancelar no fim do período não é destrutivo, o acesso continua até lá):
  - "Até 12 de novembro tudo continua aberto. Depois, seus preços, pedidos e caixa ficam
    guardados para ler e baixar." (verdade pelo `#d144` e pela 029);
  - **no Completo**: "Quer pagar menos? O Essencial custa R$ … por mês e mantém preço,
    pedidos e caixa." com "Passar para o Essencial" (secundário, `flow_data`
    `subscription_update_confirm` para `PRECOS.ESSENCIAL[periodo]`, o mesmo caminho do
    `para: "COMPLETO"` da 110, agendado para o fim do período pela configuração do portal);
  - **no anual**, nada a oferecer: o período já está pago;
  - "Cancelar mesmo assim" (secundário) abre o portal com `flow_data.type =
"subscription_cancel"`, direto na confirmação; "Voltar" (terciário) volta ao painel.
- **`POST /api/assinatura/portal` aceita `para: "ESSENCIAL" | "CANCELAR"`** além do
  `"COMPLETO"` da 110. Uma rota, um `switch`.

### No portal, a pergunta e a oferta

- **Motivo do cancelamento ligado** na configuração do portal
  (`features.subscription_cancel.cancellation_reason.enabled=true`, com as opções do Stripe).
  O bloco da CLI em `DEPLOY.md` ganha as linhas, com `--live` ao lado.
- **`npm run metricas` passa a contar os motivos** dos últimos 90 dias, lidos do Stripe
  (`cancellation_details.reason` e `feedback`). Nada é gravado no Firestore.
- **Desconto de permanência**, só se aprovado: o cupom criado pela CLI e passado em
  `flow_data.subscription_cancel.retention` (`coupon_offer`). Uma vez por assinatura, que é
  como o Stripe já o trata.

### Desmarcar o fim

- **Com `resumo.cancela`**, abaixo do "Termina em …": "Continuar assinando" (secundário), que
  abre o portal comum, onde o Stripe oferece renovar. Conferir no modo de teste se o
  `flow_data` tem um tipo que leve direto a isso; se tiver, usar.

---

## 2 · Antes de tocar em código

1. Perguntar o desconto de permanência (valor, meses) ou nenhum.
2. No modo de teste: `subscription_cancel` com e sem `retention`, e `subscription_update_confirm`
   para o essencial a partir do completo, conferindo que a troca fica para o fim do período.
3. Conferir que `scripts/metricas.mjs` já tem a chave do Stripe; se não tiver, a contagem dos
   motivos fica para o painel do Stripe e isso é escrito na decisão.

---

## 3 · Escopo

- `src/components/conta/LinhaDaAssinatura.tsx`: o botão, o passo "Antes de cancelar", o
  "Continuar assinando".
- `src/app/api/assinatura/portal/route.ts`: `para` com os três valores.
- `src/lib/domain/assinatura.ts`: as frases do passo, com teste.
- `docs/DEPLOY.md`: as linhas da CLI. `scripts/metricas.mjs`: os motivos.

---

## 4 · Roteiro de navegador

Modo de teste, `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

1. Completo mensal → Assinatura → "Cancelar a assinatura": o passo diz até quando fica aberto
   e oferece o Essencial; "Passar para o Essencial" abre a confirmação no portal.
2. "Cancelar mesmo assim": o portal abre na confirmação do cancelamento, pergunta o motivo (e
   oferece o desconto, se houver); de volta, o painel diz "Termina em …" em atenção.
3. "Continuar assinando": desfeito, o painel volta a "Renova em …".
4. Essencial anual: o passo não oferece troca.
5. `npm run metricas`: o motivo do passo 2 aparece.

---

## Critérios de aceite

- [ ] Cancelar tem botão próprio e passa por uma tela do app antes do Stripe.
- [ ] Quem está no Completo vê o Essencial como alternativa.
- [ ] O motivo é perguntado e contado.
- [ ] O cancelamento marcado pode ser desfeito a partir do painel.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] Decisão escrita; `ESTADO.md`. Sem linha em `novidades.ts`: ninguém precisa ser avisado
      de que dá para cancelar.

---

## 5 · Fora de escopo

- **Pausar a assinatura.** O portal do Stripe não pausa por conta própria, e a confeiteira
  que para por um mês tem o Essencial mensal. Volta se "parei de vender por um tempo" for o
  motivo que mais aparece.
- **E-mail de reconquista depois do fim.** Pede o motivo contado primeiro.
- **Cobrança recusada (dunning) com Pix.** Spec própria, junto da forma de pagamento.
