# Spec 111 · Cortesia

**Tipo:** um cupom de 100% no Stripe dá qualquer pacote sem cobrar nada. A beta tester digita o
código no checkout e passa sem cartão. A conta liberada à mão (a MyCookie's) entra pelo mesmo
caminho, criada pela CLI. **Nenhum campo, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** conversa de 2026-10-09 sobre como liberar acesso total: a conta `livre` (`#d141`)
não serve para quem nasceu pelo cadastro, e nunca passa pelo caminho de quem paga.
**Depende de:** 110 (o portal configurado e os produtos com o nome do pacote).
**Aprovações pedidas:** nenhuma no código. O cupom, os códigos e a assinatura da MyCookie's são
mudanças na conta do Stripe, feitas pelo Filipe.
**Decisões a registrar:** `#d314`.

---

## Problema

1. **Quem nasceu pelo `/cadastro` não vira cortesia.** Hoje isso exige editar à mão o documento
   da conta (`plano`, `trialAte`) e a claim da dona e de cada ajudante (`acessoAte`).
2. **A conta `livre` nunca passa pelo webhook.** A conta que mais usa o app é justamente a
   única que não exercita o caminho de quem paga, e não tem `pacote`.
3. **`/api/assinatura/resumo` ignora desconto.** O próprio `ponytail:` dele avisa. Uma cortesia
   leria "Plano Completo · R$ 49,90 por mês", e a despesa fixa "Rende" viria preenchida com o
   valor cheio (`#d287`).

---

## 1 · O que esta spec decide: `#d314`

- **Existe um cupom só: `CORTESIA`**, com id fixo, `percent_off=100` e `duration=forever`,
  criado pela CLI no modo de teste e no ao vivo. Uma cortesia com prazo é outro cupom
  (`duration=repeating`) criado na hora, sem mudar código.
- **Cada pessoa recebe um código promocional** (`BETA-<NOME>`, `max_redemptions=1`) sobre o
  `CORTESIA`. Um código que vaze vale uma vez só.
- **O checkout aceita código e dispensa o cartão quando o total é zero:**
  `allow_promotion_codes: true` e `payment_method_collection: "if_required"` em
  `checkout/route.ts`. O resto do caminho é o de qualquer assinante: o webhook grava `plano`,
  `pacote` e `acessoAte`. Uma conta em teste que usa o código mantém o `trialAte`, e o
  `acessoAteDaAssinatura` já nunca encurta o teste.
- **A conta `livre` migra pela CLI.** São dois comandos, em `DEPLOY.md`: `customers create` com
  o e-mail da dona, depois `subscriptions create` com o preço do pacote, `discounts[0][coupon]=
CORTESIA` e a mesma `metadata { contaId, uid }` que o checkout grava. O preço é **mensal**,
  para o webhook rodar todo mês, e não uma vez por ano. O webhook faz o resto. O estado `livre`
  **continua no código**, para as contas que ainda não migraram.
- **O resumo mostra o valor com desconto.** `valorComDesconto(valor, descontos)` é uma função
  pura em `domain/assinatura.ts`, com teste: aplica `percent_off` e `amount_off` e nunca dá
  negativo. `resumo/route.ts` expande `discounts` e passa os cupons. **Atenção:** no SDK 22, o
  cupom pode estar em `discount.source.coupon`, e não em `discount.coupon`. Conferir o tipo
  instalado.
- **Com valor zero:** `fraseDoPlano` diz "Plano Completo · cortesia". A linha de economia do
  anual some. `mensalDoPlano` devolve 0, e `DespesasFixas` já não preenche com zero.
- **Tirar a cortesia é tirar o desconto da assinatura** (receita em `DEPLOY.md`). A próxima
  cobrança vai sem cartão: `past_due`, sete dias de folga (`FOLGA_COBRANCA_DIAS`), depois "Não
  conseguimos renovar". Avisar a pessoa antes é conversa, não código.

---

## 2 · Antes de tocar em código

1. **No modo de teste:** `subscriptions create` com o `CORTESIA` e **sem** forma de pagamento
   precisa nascer `active`, com a fatura de R$ 0,00 paga sozinha. Se nascer `incomplete`,
   parar e dizer: a migração da conta livre muda.
2. **Confirmar com o Filipe a migração da MyCookie's.** Ela troca o "nunca vence" do `#d141`
   por "vence se o webhook falhar por mais de três dias depois da renovação"
   (`FOLGA_RENOVACAO_DIAS`). Em troca, a conta que mais usa o app passa a testar todo mês o
   caminho de quem paga. Recomendação: migrar, no pacote completo.

---

## 3 · Escopo

- `src/app/api/assinatura/checkout/route.ts`: as duas opções.
- `src/app/api/assinatura/resumo/route.ts`: `expand` de `discounts` e o valor com desconto.
- `src/lib/domain/assinatura.ts` (`valorComDesconto`, `fraseDoPlano`) com teste em
  `tests/domain/`.
- `src/components/conta/LinhaDaAssinatura.tsx`: a economia some com valor zero.
- `docs/DEPLOY.md`, seção "Cortesia": criar o cupom, criar um código, migrar uma conta livre e
  tirar a cortesia, cada um com `--live` ao lado.

---

## 4 · Roteiro de navegador

Modo de teste, com `stripe listen`.

1. Conta nova pelo `/cadastro` → `/assinatura` → Completo mensal → "Adicionar código
   promocional" → `BETA-TESTE`: total R$ 0,00, sem campo de cartão → assinar → de volta, o
   painel da assinatura diz "Plano Completo · cortesia".
2. Despesas fixas → "Rende": entra com zero.
3. O mesmo código numa segunda conta: o Stripe recusa.
4. Uma conta `livre` de teste, migrada pelos dois comandos: vira assinante do Completo sem
   passar por `/assinatura`, e a claim da dona ganha `acessoAte`.
5. Pelo portal, a cortesia passa do Completo para o Essencial e continua R$ 0,00.

---

## Critérios de aceite

- [x] Código promocional no checkout, sem cartão quando o total é zero.
- [x] "Plano Completo · cortesia" no painel; a despesa fixa "Rende" não vem preenchida.
- [x] `valorComDesconto` com teste (percentual, valor fixo, piso zero).
- [x] Receitas de `DEPLOY.md` rodadas no modo de teste.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d314` escrito; `ESTADO.md`; linha em `novidades.ts` só se a MyCookie's migrar (o
      painel da assinatura aparece para ela).

---

## 5 · Fora de escopo

- **Tela de administração para dar cortesia.** A CLI e o painel do Stripe já são essa tela. Volta
  quando houver alguém além do Filipe concedendo cortesias.
- **Cortesia fora do Stripe** (um campo `cortesia` no documento da conta). Seria um segundo
  caminho de acesso ao lado do webhook, que é justamente o que esta spec evita.
- **Campanhas de desconto parcial.** O campo do checkout aceita qualquer código ativo, mas criar
  campanhas não é desta spec.
- **Aviso automático antes de tirar a cortesia.**
- **Apagar o estado `livre` do código.** Só quando nenhuma conta depender dele (`npm run
metricas` mostra quais).
