# Spec 187 · O preço de fundadora

**Tipo:** a fundadora que responde a pesquisa do fim do teste (185) assina com 30% a menos, para
sempre. Um cupom no Stripe, `FUNDADORA`, aplicado pelo servidor no checkout de quem respondeu, e na
assinatura de quem já assinava antes de responder. A Maynara continua com a cortesia de 100%, que
nada aqui toca.
**Tamanho:** uma sessão.
**Origem:** a resposta de quem conduz o projeto em 2026-10-15 à pergunta 1 da 181.
**Depende de:** 181 (`Conta.beta`) e 185 (`pesquisaRespondidaEm`, `POST /api/pesquisa`).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md` (nenhum campo novo, nenhuma regra,
nenhuma dependência). O cupom é criado pela CLI no ao vivo, por quem conduz o projeto.
**Decisões a registrar:** uma, numerada na sessão (o preço de fundadora é um cupom aplicado pelo
servidor, e a cortesia vence).

---

## Problema

A pesquisa da 185 oferece 30% e nada no checkout sabe disso. A cortesia da 111 (`#d314`) é por
código promocional digitado; aqui ninguém digita nada, e quem já assinou durante o teste (`#d374`)
precisa ganhar o desconto na assinatura que já existe.

---

## 1 · O que esta spec decide

### O cupom

- `FUNDADORA`: id fixo, `percent_off=30`, `duration=forever`, `name="Preço de fundadora"`, criado
  pela CLI nos dois modos, ao lado do `CORTESIA` (`DEPLOY.md`, "Stripe, a cortesia").
- `CUPOM_DE_FUNDADORA = "FUNDADORA"` em `server/stripe.ts`.
- `temPrecoDeFundadora(conta)` em `domain/assinatura.ts`, puro, com teste: `beta.fundadora` e
  `pesquisaRespondidaEm`. Uma regra, lida no checkout, na rota da pesquisa e na tela.

### No checkout

Em `POST /api/assinatura/checkout`, quando `temPrecoDeFundadora(conta)`:

- `discounts: [{ coupon: CUPOM_DE_FUNDADORA }]` **no lugar de** `allow_promotion_codes: true`: o
  Stripe não aceita os dois juntos na mesma sessão. A fundadora não precisa de código: a cortesia
  `BETA-…` era para as beta testers de antes, que agora são as contas semeadas.
- O resto como está: `trial_end` no teste (`#d374`), `payment_method_collection` pela mesma regra.
- A sessão confere no modo de teste que `discounts` com `trial_end` nasce com o desconto na fatura
  do fim do teste, e anota.

### Em quem já assina

Na rota da pesquisa (185), depois da transação, quando a conta tem `stripeSubscriptionId`:

- Ler a assinatura com `discounts` expandido. **Já tem desconto (a cortesia ou outro): nada.** O
  desconto maior que ela já tem vence, e a Maynara nunca é tocada, nem por engano.
- Sem desconto: `subscriptions.update(id, { discounts: [{ coupon: CUPOM_DE_FUNDADORA }],
proration_behavior: "none" })`. Vale da próxima fatura em diante; nada é devolvido do que já foi
  pago.
- Falha do Stripe não derruba a resposta da pesquisa (a resposta é gravada antes): `console.warn`
  e `npm run beta` lista "fundadoras com pesquisa e sem desconto", para quem conduz o projeto
  aplicar pela CLI.
- O webhook não muda: o desconto não mexe em `plano`, `pacote` nem `acessoAte`.

### Na tela

- `/assinatura`, com `temPrecoDeFundadora`: o preço de cada plano vem com o desconto
  (`valorComDesconto`, `#d314`, com `percent_off: 30`), o cheio riscado ao lado e a linha "Preço de
  fundadora: 30% a menos, para sempre." `fraseDeAssinar` mostra o valor com desconto. A economia
  do anual é calculada sobre os valores com desconto.
- O resumo da assinatura na Configuração já lê o desconto da assinatura (`#d314`) e passa a dizer
  "Plano Completo · preço de fundadora" quando o cupom é o `FUNDADORA`.
- A despesa "Rende" (`#d287`) já vem com o valor com desconto, pelo mesmo `mensalDoPlano`.

### Nas páginas

A 184 ganha uma linha no preço de `/conheca`, na fase `BETA`: "As fundadoras do beta que respondem a
pesquisa do fim do teste assinam com 30% a menos, para sempre." A página do convite (183) diz o
mesmo embaixo de "14 dias grátis, sem cartão". **Sem valor em reais nas páginas**: o preço é do
Stripe (`#d174`), e o desconto depende da pesquisa.

---

## 2 · Antes de tocar em código

1. Ler `api/assinatura/checkout/route.ts`, `api/assinatura/resumo/route.ts`, `server/stripe.ts`,
   `/assinatura`, `valorComDesconto`, `#d314`, `#d373`, `#d374`.
2. Criar o `FUNDADORA` na sandbox antes de tudo.
3. Conferir na sandbox que `discounts` e `allow_promotion_codes` juntos são recusados (e anotar a
   mensagem).

---

## 3 · Escopo

- `domain/assinatura.ts`: `temPrecoDeFundadora` e o teste (fundadora com e sem pesquisa, não
  fundadora com pesquisa, conta semeada).
- `server/stripe.ts`: a constante e `aplicarPrecoDeFundadora(subscriptionId)`.
- `api/assinatura/checkout`, `api/pesquisa` (a chamada), `/assinatura`, o resumo.
- `scripts/beta.mjs`: a linha das fundadoras sem desconto.
- `DEPLOY.md`: o cupom, na CLI, nos dois modos.
- `PortaDoBeta`/`/conheca` e a página do convite: a linha.

---

## 4 · Roteiro

Na sandbox:

1. Fundadora em teste responde e assina: o checkout mostra 30% a menos, a primeira fatura (no fim
   do teste) sai com o desconto.
2. Fundadora que assinou no dia 10 e responde no dia 13: a assinatura ganha o cupom; a próxima
   fatura, 30% a menos.
3. Conta com o `CORTESIA` que responde (forçada à mão): a assinatura continua com a cortesia.
4. Fundadora que pula a pesquisa: o checkout pelo preço cheio, com o campo de código promocional
   de sempre (`allow_promotion_codes`).
5. A Configuração diz "preço de fundadora"; a despesa "Rende" vem com o valor com desconto.

---

## Critérios de aceite

- [x] Responder a pesquisa dá 30% para sempre, antes ou depois de assinar.
- [x] A cortesia da Maynara intacta.
- [x] O preço da tela é o que o Stripe cobra.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisão registrada; `ESTADO.md` e `DEPLOY.md` atualizados.

---

## Decisões fáceis de rejeitar

- **Para sempre.** É o que faz "fundadora" valer alguma coisa e o que a página pode prometer sem
  asterisco. Com prazo, é um cupom `repeating` e uma palavra a menos nas telas.
- **O servidor aplica, ninguém digita.** Um código `FUNDADORA` digitado vazaria em grupo de
  confeiteira no primeiro dia.
- **O desconto que já existe vence.** Somar cupons no Stripe dá conta que ninguém confere; a única
  conta com desconto hoje é a da Maynara, com 100%.
- **Encerrar perde tudo.** Fundadora que encerra a conta perde os convites e a vaga (181); se voltar
  depois do lançamento, volta como qualquer conta, sem o preço de fundadora.

---

## Fora de escopo

- Desconto para quem é convidada depois do lançamento.
- Desconto por convite aceito.
- Devolver o que foi pago antes de responder.
