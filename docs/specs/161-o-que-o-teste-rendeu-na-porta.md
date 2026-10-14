# Spec 161 · O que o teste rendeu, na porta

**Tipo:** `/assinatura` no teste mostra o que a conta já construiu e quantas unidades do doce
dela pagam o plano; o plano vem sugerido pelo que ela usou; e assinar no meio do teste não joga
fora os dias grátis: a primeira cobrança fica para o dia em que o teste acaba. **Nenhum campo,
nenhuma regra, nenhuma dependência.** Uma mudança no checkout do Stripe.
**Tamanho:** uma sessão.
**Origem:** crítica de `/assinatura` com `/impeccable` (2026-10-14).
**Depende de:** 048 (a faixa do teste, de onde sai a conta), 160 (as duas opções e o botão).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. A mudança de quando se cobra é de
quem conduz o projeto: confirmar antes da sessão (seção 1, "Cobrar no fim do teste").
**Decisões a registrar:** duas, numeradas na sessão.

---

## Problema

1. **A porta de pagar é a tela que menos sabe dela.** A faixa da Hoje (048) já diz "8
   produtos com preço · R$ 1.240 em vendas em outubro" e, nos três últimos dias, "o Completo
   custa R$ … por mês: a sobra de 5 unidades de Cookie de Nutella". Ela toca em "Assinar" e
   chega numa tela que esqueceu tudo isso e fala só de preço. Os serviços que convertem teste
   em assinatura fazem o contrário: a tela de pagar é a que mais mostra o que a pessoa vai
   perder.
2. **O plano pré-escolhido ignora o uso.** O teste abre o Completo (`#d168`). Quem publicou o
   cardápio e recebeu pedido por ele, ou convidou ajudante, chega com o Essencial escolhido e
   nenhum aviso de que o cardápio sai do ar no Essencial. Ela descobre depois, por uma cliente.
3. **Assinar cedo custa dias.** O checkout não passa `trial_end`: quem assina no dia 3 de 14 é
   cobrada no dia 3, e o período pago começa ali. O acesso não encurta (`acessoAteDaAssinatura`
   guarda o maior), mas os 11 dias grátis viram dias pagos. Por isso a pessoa espera o último
   dia, e é no último dia que ela esquece. Em quase todo serviço com teste a frase é "Assine
   agora, a primeira cobrança é no dia em que o teste acaba".
4. **No desktop, o painel de marca é a frase do login.** 42% da tela repete o slogan para quem
   já usa o produto há duas semanas.

---

## 1 · O que esta spec decide

### O que rendeu, na porta

- **A conta da 048 sai da `Faixa` para um gancho, `useOQueRendeu()`**, em
  `components/assinatura/`: as mesmas duas leituras (resumo do mês e fichas ativas), nenhuma
  consulta nova (`#d218`). Devolve as partes contadas e o mais vendido para o `#d219`. A
  `FaixaDoTeste` passa a usá-lo, sem mudar o que mostra.
- **Em `/assinatura`, no teste e no teste vencido**, logo abaixo da descrição:
  - as partes, uma por linha, com o número em `num` 600 ("8 produtos com preço", "R$ 1.240 em
    vendas em outubro"); nada contado, nada aparece;
  - com o preço do plano escolhido carregado, a linha do `#d219` com o plano escolhido (e não
    mais sempre o Completo): "O Essencial dá R$ 24,17 por mês: a sobra de 3 unidades de
    Cookie de Nutella." O valor é o mensal do período escolhido (`mensalDoAnual` da 160 no
    anual).
- **No desktop, as mesmas linhas vão para o `painel` da `MolduraDeEntrada`** (o espaço que o
  `#d194` já abriu entre o logotipo e a frase), em `--on-brand`, e saem da coluna. A frase do
  login continua no pé do painel.

### O plano sugerido pelo uso

- **Usou o que só o Completo tem** (`RECURSOS_DO_PACOTE.COMPLETO`): pedido chegado pelo
  cardápio no teste, ou ajudante ativa. Então o Completo vem escolhido e a opção dele diz o
  porquê em uma linha: "Seu cardápio recebeu 6 pedidos no teste." · "A Ana ajuda você aqui."
- **Escolher o Essencial nesse caso** mostra, na opção, a consequência em atenção, com o
  triângulo: "O cardápio sai do ar e a Ana perde o acesso." Nada bloqueia: ela decide (regra
  de ouro do `PRODUCT.md`).
- Sem uso de recurso do Completo, o de hoje: Essencial escolhido.

### Cobrar no fim do teste

- **`/api/assinatura/checkout` passa `subscription_data.trial_end`** igual a `trialAte` da
  conta, em segundos, quando o teste ainda tem pelo menos o mínimo que o Stripe aceita (48
  horas; conferir). Abaixo disso, ou vencido, sem `trial_end`: cobra na hora, como hoje.
- **Com `trial_end`, `payment_method_collection: "always"`**: com `"if_required"` e nada a
  pagar hoje, o Stripe não pediria cartão, e o teste acabaria numa assinatura sem cartão. A
  cortesia (`#d314`) continua funcionando porque o código `BETA-…` zera também as faturas
  seguintes; conferir no modo de teste se o Stripe ainda pede cartão com cupom de 100% e
  `"always"`. Se pedir, parar e dizer: o app não sabe do código antes do Stripe, e a saída
  (aceitar o cartão na cortesia, ou um link de cortesia sem `trial_end`) é de quem conduz o
  projeto.
- **O webhook não muda.** `trialing` já é assinatura viva, e `acessoAteDaAssinatura` já dá o
  fim do período mais a folga; o período em `trialing` é o próprio teste.
- **O botão da 160 ganha a data**: "Assinar o Essencial · R$ 290,00 por ano" e, embaixo, em
  `label`: "Primeira cobrança em 28 de outubro, quando o teste acaba." No teste vencido, sem a
  linha.

---

## 2 · Antes de tocar em código

1. Confirmar com quem conduz o projeto a cobrança no fim do teste.
2. No modo de teste do Stripe: checkout com `trial_end` a 5 dias, conferir o status
   `trialing`, a fatura de R$ 0 e a primeira cobrança no dia certo; checkout com o código de
   cortesia e `"always"`.
3. Achar de onde sai "pedido chegado pelo cardápio no teste" sem consulta nova (o agregado do
   mês, o contador do selo da navegação, `#d235`). Se só sair com consulta nova, ficar com a
   ajudante ativa nesta spec e escrever o porquê.

---

## 3 · Escopo

- `src/components/assinatura/useOQueRendeu.ts` (novo) e `FaixaDoTeste.tsx` usando-o.
- `src/app/(auth)/assinatura/page.tsx`: as linhas, o painel do desktop, o plano sugerido, a
  data da primeira cobrança.
- `src/app/api/assinatura/checkout/route.ts`: `trial_end` e a forma de cobrança.
- `src/lib/domain/assinatura.ts`: a frase do `#d219` por plano, a da primeira cobrança e
  `deveCobrarNoFimDoTeste(trialAteMs, agoraMs)`, com teste.

---

## 4 · Roteiro de navegador

1. Conta em teste com produtos e vendas: as linhas aparecem no celular abaixo da descrição e,
   no desktop, no painel escuro.
2. Conta em teste vazia: nenhuma linha, nada inventado.
3. Conta com ajudante: Completo escolhido, com o nome dela; trocar para o Essencial mostra a
   consequência em atenção.
4. Assinar no dia 3: o Stripe mostra R$ 0,00 hoje e a cobrança na data do fim do teste; de
   volta, "Pagamento recebido" e depois a Hoje; a Configuração diz "renova em" o dia do fim do
   teste.
5. Assinar com 1 dia de teste: cobra na hora, sem a linha da primeira cobrança.

---

## Critérios de aceite

- [x] A tela de pagar diz o que a conta construiu, sem consulta nova.
- [~] O plano escolhido de saída segue o uso, e escolher menos diz o que se perde.
- [~] Assinar no teste não cobra antes do fim do teste, e o cartão fica salvo.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] Decisões escritas; `ESTADO.md`; linha em `novidades.ts` ("Assinar durante o teste não
      corta seus dias grátis").

---

## 5 · Fora de escopo

- **E-mail no último dia do teste com essas linhas.** O e-mail de teste acabando já existe
  (044); levar o que rendeu para ele é outra spec.
- **Desconto para quem assina antes do fim.** Sem dado de conversão que peça isso.
- **Depoimento na tela de pagar.** O de `/conheca` tem autorização para lá (`#d184`).
