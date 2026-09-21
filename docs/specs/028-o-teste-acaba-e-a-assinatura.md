# Spec 028 · O teste acaba, e a assinatura

**Tipo:** a segunda spec da fase 2 do `docs/saas/ROADMAP.md` — o que fica atrás da porta que a
027 abriu. Um módulo puro (`domain/assinatura.ts`), **quatro rotas de servidor** (`checkout`,
`portal`, `precos` e o webhook do Stripe), uma tela cheia fora do shell (`/assinatura`, com a
página de volta `/assinatura/confirmando`), uma linha na tela Hoje, um bloco em
`/configuracao`, a caixa que tira o "feito com Rende" da folha, **a primeira mudança de regra
de segurança desde a 000**, **a primeira dependência de produção desde o Módulo 0** (`stripe`),
quatro campos opcionais em `Conta`, um em `ConfiguracaoGeral`, e uma linha em
`conceder-acesso.mjs`. **Nenhum cron, nenhum `vercel.json`, nenhum índice.**
**Tamanho:** uma sessão apertada. O que pesa não é o Stripe — é a regra: ela é a primeira coisa
do sistema que **nega** escrita a quem tem a claim, e um erro nela tranca a usuária 0. A seção 1
gasta o que precisa nisso; o resto é formulário e redirecionamento.
**Origem:** o roadmap (fase 2, 028), `#d112` (um plano, flat, e o webhook reemitindo a claim
para a regra negar escrita de conta vencida sem custar uma leitura) e `#d127` (o "feito com
Rende" desligável é o que uma assinatura compra).
**Depende de:** a 027 codificada (está) e **publicada** (não está: o texto dos termos é o
portão). Esta spec fica escrita por pedido, como a 027; a sessão roda quando quem conduz o
projeto decidir. O que não pode acontecer é publicar a regra nova sem o passo 1 do roteiro:
`contas/mycookies` precisa continuar escrevendo depois dela, e é a ausência de prazo na claim
que garante isso (`#d141`, `#d144`).
**Aprovações pedidas:** (1) **dependência de produção `stripe`** — só o servidor a importa;
zero bytes no pacote offline; (2) **mudança de regra de segurança** — `write` em
`contas/{contaId}/**` passa a ter prazo, `read` não; (3) **schema aditivo** — `Conta` ganha
`stripeCustomerId?`, `stripeSubscriptionId?`, `assinaturaAte?` e o valor `"ASSINATURA"` em
`PlanoDaConta`; `ConfiguracaoGeral` ganha `ocultarFeitoCom?`; (4) **uma linha em
`conceder-acesso.mjs`** — o `setCustomUserClaims` passa a preservar as claims que não são
`contas`, senão liberar acesso à mão apaga o prazo que o webhook escreveu. **Quatro decisões a
registrar**, `#d144` (a regra é o relógio: uma claim com a data, `request.time`, e nenhum cron),
`#d145` (o estado da cobrança é derivado das datas na leitura; o webhook relê a assinatura no
Stripe e escreve a claim antes do documento), `#d146` (o `stripe` entra pelo mesmo motivo do
Admin SDK: assinatura criptográfica não se escreve à mão) e `#d147` (o "feito com Rende" sai
da folha por uma caixa em `/configuracao`, que só aparece para quem paga ou foi liberada à mão).

---

## Problema

A 027 abre a conta com `plano: "TRIAL"` e `trialAte` catorze dias à frente, e **ninguém lê os
dois campos**. Hoje o teste não acaba: uma conta criada por `/cadastro` escreve para sempre, e o
produto que o roadmap descreve — trial curto, um plano, anual com desconto — não existe do lado
de dentro. O que falta, de ponta a ponta:

1. **Nada diz a ela que o teste tem fim.** O cadastro promete "catorze dias grátis" e o app
   nunca mais toca no assunto. Uma conta que vence em silêncio é uma conta que perde trabalho
   em silêncio, que é o que a 023 existe para impedir.
2. **A regra não sabe de prazo.** `firestore.rules` dá `read, write` a quem tem a chave no
   mapa `contas`, e é isso mesmo: a regra custa zero leitura porque só olha o token (`#d07`).
   Negar escrita de conta vencida precisa continuar custando zero — ou seja, o "vencida" tem que
   estar no token.
3. **Não há como pagar.** Nenhuma rota fala com o Stripe, nenhuma variável de ambiente o
   conhece, e `Conta` não tem onde guardar o cliente e a assinatura.
4. **O "feito com Rende" é linha fixa** (`#d127`), à espera de haver o que uma assinatura
   compra. É este o momento.
5. **`MolduraDeEntrada` espera a terceira tela** — o comentário dela diz "a tela de conta
   vencida da 028 será a terceira".

**O que esta spec entrega:** a regra com prazo, sem cron; o checkout e o portal do Stripe; o
webhook que renova o prazo e espelha o estado no documento; a tela `/assinatura` nos seus
quatro estados; a linha "Seu teste acaba em N dias" na tela Hoje; o bloco em `/configuracao`;
a caixa que tira a linha do Rende da folha; e a conta vencida lendo tudo e não escrevendo nada.

**O que esta spec não entrega:** exportar e encerrar (029); segundo plano e gating (032, `#d112`);
Pix ou boleto recorrente (o Stripe não os faz recorrentes — ver Riscos); cupom, indicação,
comissão de parceira (não é código, roadmap §4); nota fiscal da assinatura (o Stripe emite o
recibo; NF-e de serviço é contador, não app); modo só-leitura do app inteiro para conta vencida
(é uma tela cheia, ver `#d144`).

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra** uma linha na tela Hoje durante o teste ("Seu teste grátis acaba em 9 dias") e um
  bloco em `/configuracao` que não existe para a conta liberada à mão. Nenhum campo em
  formulário nenhum; a caixa do "feito com Rende" fica no bloco da folha, que a 020 já deixou
  fora do caminho do primeiro preço.
- **Sai** nada. A frase é escrita porque a regra manda: o custo desta spec para quem está
  começando é uma linha de texto que diz a verdade sobre o relógio que o cadastro já pôs para
  correr.

---

## 1 · O que esta spec decide

### A regra é o relógio: uma claim com a data, `request.time`, e nenhum cron — `#d144`

O roadmap previa `ativas: { [contaId]: true | false }` na claim, reemitida pelo webhook, e um
cron diário no Vercel derrubando `ativas` de quem venceu o teste. Esta spec troca o booleano
por uma data e o cron por nada:

```
claim  { contas: { abc: "DONA" }, acessoAte: { abc: 1760000000000 } }
regra  write permitido se  temAcesso()
                        && !( 'acessoAte' in token
                              && contaId in token.acessoAte
                              && request.time.toMillis() > token.acessoAte[contaId] )
```

`acessoAte[contaId]` é **até quando esta conta pode escrever**, em milissegundos de época.
`request.time` é o relógio do servidor do Firestore, e a comparação é feita a cada escrita, no
lugar onde a escrita é julgada. Consequências, na ordem em que importam:

- **Ausência é "sem prazo".** `contas/mycookies`, as contas do beta e qualquer uma que o script
  criar não têm `acessoAte`, e a regra nova é idêntica à antiga para elas. É o mesmo "ausência
  tem significado" do `#d141`, e é o que torna a publicação da regra segura **antes** do app.
- **O teste acaba sozinho.** `/api/conta` passa a escrever `acessoAte[contaId] = trialAte` na
  mesma `setCustomUserClaims` que escreve `contas`. Quando o dia chega, a regra recusa; nenhum
  processo precisa rodar à meia-noite, nenhuma lista de contas precisa ser varrida, nenhum
  segredo de cron precisa existir.
- **A assinatura empurra a data.** O webhook escreve `acessoAte = fim do período + folga` a
  cada renovação. Cancelou, o Stripe avisa e a data vira "agora". Deixou de pagar, a data para
  de andar.
- **O token velho não estende o prazo.** Um token cunhado ontem carrega a mesma data de ontem,
  e a regra compara com o `request.time` de hoje. O único caso em que um token em cache atrasa
  algo é o inverso — ela pagou e a claim nova ainda não chegou —, e é para isso que
  `reconferirAcesso()` existe (seção 3.6).
- **Ler não tem prazo.** `allow read: if temAcesso()` continua como está. Conta vencida lê
  tudo, o que é o que faz a 029 (exportar) e a própria tela de vencida funcionarem, e é o que
  o roadmap chama de "o dado dela continua dela".

Vencida, **o app é uma tela cheia**, não um modo só-leitura. Só-leitura é um estado a mais em
cada uma das vinte telas, e o que ela precisa fazer vencida é uma coisa só: assinar. O
`(app)/layout.tsx` a manda para `/assinatura`, e o resto do app não aprende nada.

### O estado da cobrança é derivado das datas; o webhook relê o Stripe e escreve a claim antes do documento — `#d145`

O que o documento grava é o que o Stripe disse: `plano: "ASSINATURA"`, `stripeCustomerId`,
`stripeSubscriptionId` e `assinaturaAte` (o mesmo número da claim, em `Timestamp`, para a tela
ler). **`status` não muda**: ele é do ciclo de vida da conta (`"ATIVA"` hoje, `"ENCERRADA"` na
029), e não da cobrança. "Vencida" não é escrito em lugar nenhum — é `agora > trialAte` ou
`agora > assinaturaAte`, calculado na leitura por `situacaoDaConta`, como `ritmoDoEspelho`
(`#d30`) e `prazoDaContagem` (007) já fazem com tudo o que depende do dia de hoje. Um campo
`status: "VENCIDA"` gravado exigiria alguém para gravá-lo no dia certo, que é o cron que o
`#d144` acabou de recusar.

O webhook **não confia no evento**. Os três eventos de assinatura (`customer.subscription.created`,
`updated`, `deleted`) podem chegar fora de ordem, e um `updated` velho depois de um `deleted`
reabriria uma conta cancelada. Por isso o handler pega só o id do evento, chama
`stripe.subscriptions.retrieve(id)` e trabalha sobre o estado atual — uma chamada a mais por
evento e nenhum campo de "último evento visto". O `contaId` e o `uid` vêm de
`subscription.metadata`, postos lá pelo checkout (`subscription_data.metadata`).

**Claim antes do documento — o inverso da 027, pelo mesmo motivo.** A 027 escreve o documento
primeiro porque a claim é o que põe ela dentro do app. Aqui o documento é o que a tela observa
(`useAuth().conta` é assinatura viva): se ele mudar antes da claim, `/assinatura/confirmando`
vê `plano: "ASSINATURA"`, força o token, e o token ainda vem sem o prazo novo. Claim primeiro,
documento depois: quando a tela vê o documento mudar, a claim já está lá para o
`getIdTokenResult(true)` buscar.

### O `stripe` entra pelo mesmo motivo do Admin SDK — `#d146`

Criar uma Checkout Session e uma sessão do portal é um `POST` com corpo `form-urlencoded`, e
`fetch` faria. Conferir a assinatura do webhook é HMAC-SHA256 com carimbo de tempo, e
`node:crypto` faria em quinze linhas. O cabeçalho de `firebaseAdmin.ts` já respondeu a essa
pergunta para o JWT: "criptografia é outra classe de risco, e um erro ali não aparece como um
pixel torto — aparece como um estranho gastando a cota". Aqui o estranho não gasta cota: **abre
a conta de outra pessoa**, porque o webhook é quem escreve `acessoAte`. `stripe` é a única
dependência de produção nova desde o Módulo 0; só `src/lib/server/stripe.ts` e as quatro rotas
a importam, e nada dela chega ao navegador — nem `Stripe.js`: o checkout é uma URL para onde
o navegador vai, e o portal também.

### O "feito com Rende" sai por uma caixa, para quem paga ou foi liberada à mão — `#d147`

`ConfiguracaoGeral.ocultarFeitoCom?: true` — gravado só quando marcado, `deleteField()` no
contrário, como `frase` e o contato. A caixa mora no bloco "Na folha do orçamento" de
`/configuracao` e **só aparece** quando `situacaoDaConta` é `assinante` ou `livre`; no teste, no
lugar dela, uma linha: "Assinantes podem tirar esta linha da folha." `montarOrcamento` copia o
campo para `Orcamento.negocio.feitoCom: boolean`, e a folha desenha a linha quando é `true`.
A folha **não consulta a situação da conta**: quem pode marcar a caixa é a tela, e uma
assinante que deixou de pagar não abre a folha — está em `/assinatura`. O manual da marca
(`docs/marca/rende/MARCA.md` § 2.5) pedia "desligável nas configurações"; é isto.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` para `/assinatura`, a linha da tela Hoje
   e o bloco de `/configuracao`. `/assinatura` é a tela em que ela decide pagar; é a que menos
   pode parecer software.
2. **Painel do Stripe, em modo de teste:** um produto ("Rende"), dois preços recorrentes em BRL
   — mensal e anual, o anual valendo dez mensais —, os ids `price_…` anotados; **Customer Portal
   ativado** (Settings → Billing → Customer portal: trocar cartão, mudar de preço entre os dois,
   cancelar ao fim do período), senão a sessão do portal falha na criação; um endpoint de webhook
   apontando para `https://<host>/api/stripe/webhook` com os três eventos
   `customer.subscription.*`, e o `whsec_…` anotado. Para o `npm run dev`, o Stripe CLI:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` imprime o segredo local.
   **Nada disso é código**, e cada item vai para `docs/DEPLOY.md`.
3. Ler `/api/conta/route.ts` e `/api/nota/route.ts` inteiros: a ordem "credencial → token →
   corpo → `abreAConta`" é o molde das rotas de checkout, portal e preços. E
   `conceder-acesso.mjs:96-99`, a linha que muda.
4. Ler `firestore.rules` inteiro (35 linhas) e a documentação de `request.time` e do operador
   `in` sobre mapas em regras. A regra nova tem quatro linhas, e é a parte da spec que não pode
   estar quase certa.
5. Conferir a versão do SDK `stripe` e **onde ele expõe o fim do período**: desde a versão de
   API `2025-03-31.basil`, `current_period_start` e `current_period_end` saíram de `Subscription`
   e moram em cada item (`subscription.items.data[0]`). A spec escreve o caminho novo; se o SDK
   instalado for anterior, é o velho.

---

## 3 · Escopo

### 3.1 Os tipos — `src/lib/types/conta.ts` e `configuracao.ts`

```ts
/** `"ASSINATURA"` entra na 028; a 029 acrescenta o encerramento em `StatusDaConta`. */
export type PlanoDaConta = "TRIAL" | "ASSINATURA";
export type StatusDaConta = "ATIVA";

export interface Conta {
  // … o que já existe …
  /**
   * Escritos pelo webhook do Stripe (`/api/stripe/webhook`, spec 028) e por
   * mais ninguém. `assinaturaAte` é o espelho de `acessoAte[contaId]` na
   * claim: a claim é para a regra, o campo é para a tela (`DECISOES.md#d145`).
   * Ausentes até a primeira assinatura.
   */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** Até quando a assinatura deixa escrever: fim do período mais a folga. */
  assinaturaAte?: Timestamp;
}

/** A forma da claim inteira, para quem a escreve: `/api/conta`, o webhook e o script. */
export interface ClaimDaConta {
  contas: ContasDaClaim;
  /** Milissegundos de época, por conta. Sem a chave, sem prazo (`#d144`). */
  acessoAte?: Record<string, number>;
}
```

```ts
export interface ConfiguracaoGeral {
  // … o que já existe …
  /** Tira a linha "feito com Rende" da folha (spec 028, `DECISOES.md#d147`). Só `true`. */
  ocultarFeitoCom?: true;
}
```

### 3.2 O domínio — `src/lib/domain/assinatura.ts`

Puro, testado, o que a regra, o webhook, a tela e a linha da Hoje compartilham:

```ts
/** Dias além do fim do período antes de a regra recusar: o cartão renova com atraso de horas. */
export const FOLGA_RENOVACAO_DIAS = 3;
/** Dias que uma cobrança recusada tem para ser acertada antes de a escrita parar. */
export const FOLGA_COBRANCA_DIAS = 7;
/** A partir de quantos dias a linha da Hoje ganha o ícone de atenção. */
export const DIAS_DE_ATENCAO = 3;

export type Periodo = "mensal" | "anual";

export type Situacao =
  | { tipo: "livre" } // sem `plano`: liberada à mão, sem prazo (`#d141`)
  | { tipo: "teste"; diasRestantes: number; acabaEmMs: number }
  | { tipo: "assinante"; renovaEmMs: number }
  | { tipo: "vencida"; foi: "teste" | "assinatura" };

/** O que a tela precisa da conta, sem `Timestamp`: quem chama converte com `toMillis()`. */
export interface ContaParaSituar {
  plano?: "TRIAL" | "ASSINATURA";
  trialAteMs?: number;
  assinaturaAteMs?: number;
}

export function situacaoDaConta(
  conta: ContaParaSituar,
  agoraMs: number,
): Situacao;

/** Arredonda para cima: às 23h do último dia ainda é "acaba hoje", não "acabou". */
export function diasRestantes(ateMs: number, agoraMs: number): number;

/** "Seu teste grátis acaba hoje" · "acaba amanhã" · "acaba em N dias". */
export function fraseDoTeste(diasRestantes: number): string;

/**
 * O número que vai para a claim, a partir do que o Stripe diz da assinatura.
 * `active` e `trialing`: fim do período + folga. `past_due`: início do período
 * + folga de cobrança (o período novo começou sem pagar; uma semana para
 * acertar o cartão). Qualquer outro (`canceled`, `unpaid`, `incomplete`,
 * `incomplete_expired`, `paused`): agora. **Nunca menor que `trialAteMs`**: um
 * checkout que nasce `incomplete` não pode encurtar o teste que ela ainda tem.
 */
export function acessoAteDaAssinatura(entrada: {
  status: string;
  periodoInicioMs: number;
  periodoFimMs: number;
  trialAteMs?: number;
  agoraMs: number;
}): number;

/** `mensal × 12 − anual`, em centavos. Zero ou negativo quando o anual não compensa. */
export function economiaAnual(mensal: Centavos, anual: Centavos): Centavos;

export const esquemaCheckout = z.object({
  contaId: z.string().min(1),
  periodo: z.enum(["mensal", "anual"]),
});

export type FalhaAssinatura =
  | "sem-acesso"
  | "fora-de-forma"
  | "sem-configuracao" // servidor sem chave do Stripe ou sem os dois preços
  | "sem-assinatura" // portal pedido por conta que nunca assinou
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_ASSINATURA: Record<FalhaAssinatura, string>;
```

Testes em `tests/domain/assinatura.test.ts`: `situacaoDaConta` nos cinco casos (sem plano;
teste com dias; teste vencido; assinante; assinatura vencida) e a borda `agora === trialAte`
(vencida: a regra usa `>`, a tela também); `diasRestantes` em 23h59 do último dia (1, não 0) e
um minuto depois (0); `fraseDoTeste` em 0, 1 e 9; `acessoAteDaAssinatura` para cada status,
com a folga somada e com o teto do `trialAteMs` segurando um `incomplete`; `economiaAnual` com
dez mensais (dois meses) e com anual igual a doze (zero). Nada de Firebase, nada de React,
nada de Stripe.

### 3.3 A regra — `firestore.rules`

```
match /contas/{contaId} {
  function temAcesso() { … como está … }

  // Escrever tem prazo; ler não. `acessoAte` traz, por conta, até quando (ms de
  // época) esta conta pode escrever — escrito por /api/conta (o teste) e pelo
  // webhook do Stripe (a assinatura). Sem a chave, não há prazo: é a conta
  // liberada à mão (DECISOES.md#d141, #d144). Zero leitura, como #d07: o
  // relógio é request.time.
  function podeEscrever() {
    return temAcesso()
        && !('acessoAte' in request.auth.token
             && contaId in request.auth.token.acessoAte
             && request.time.toMillis() > request.auth.token.acessoAte[contaId]);
  }

  allow read: if temAcesso();
  allow write: if podeEscrever();

  match /{documento=**} {
    allow read: if temAcesso();
    allow write: if podeEscrever();
  }
}
```

O comentário de cabeçalho da regra troca "emitida via Admin SDK por scripts/conceder-acesso.mjs"
por "emitida via Admin SDK por `/api/conta`, pelo webhook do Stripe e pelo script".
**Publica-se antes do app** (`firebase deploy --only firestore:rules`): sem `acessoAte` em
nenhuma claim, a regra nova é a antiga, e o passo 1 do roteiro prova isso com a conta real.

### 3.4 O servidor — `src/lib/server/stripe.ts` e as quatro rotas

`stripe.ts`, ao lado de `firebaseAdmin.ts`, com o mesmo cabeçalho de "nada aqui entra no pacote
do cliente":

```ts
export function stripeDisponivel(): boolean; // STRIPE_SECRET_KEY e os dois preços
export function stripe(): Stripe; // singleton, `new Stripe(chave)`
export const PRECOS: Record<Periodo, string>; // STRIPE_PRICE_MENSAL, STRIPE_PRICE_ANUAL
/** Grava a claim inteira preservando o que não é desta conta. */
export async function escreverAcessoAte(
  uid: string,
  contaId: string,
  ateMs: number,
): Promise<void>;
```

`escreverAcessoAte` lê `auth.getUser(uid).customClaims`, faz
`{ ...claims, acessoAte: { ...claims.acessoAte, [contaId]: ateMs } }` e grava. É a única
função que escreve `acessoAte` depois do cadastro, e o comentário do cabeçalho de
`firebaseAdmin.ts` ganha a segunda exceção: **só `/api/conta` e o webhook escrevem no Firestore
daqui, só no documento da conta e na claim, nunca em dado de negócio.**

**`/api/conta/route.ts`** muda em duas linhas: a `setCustomUserClaims` passa a preservar as
claims que não são `contas` (`{ ...usuario.customClaims, contas, acessoAte }`) e a escrever
`acessoAte[contaId]` com o `trialAte` **do documento** (o `set` recém-feito, ou o que já existia
quando o handler caiu entre o documento e a claim) — nunca recalculado, para que a claim e o
documento nunca discordem por um segundo de diferença.

**`conceder-acesso.mjs:97`** vira `{ ...usuario.customClaims, contas: { ...anteriores, [contaId]: PAPEL } }`,
com o comentário: "a 028 escreve `acessoAte` ao lado de `contas`; liberar acesso não pode
apagá-lo". O script não escreve `acessoAte` nunca: quem ele libera não tem prazo.

**`POST /api/assinatura/checkout`**, na ordem de `/api/nota`:

```ts
if (!credencialDisponivel()) return falha("sem-configuracao", 500);
const quem = await conferirToken(…); if (!quem) return falha("sem-acesso", 401);
const corpo = esquemaCheckout.safeParse(await comoJson(requisicao));
if (!corpo.success || !abreAConta(quem, corpo.data.contaId)) return falha("fora-de-forma", 400);
if (!stripeDisponivel()) return falha("sem-configuracao", 500);

const conta = (await adminDb().doc(caminhos.conta(contaId)).get()).data();
const origem = new URL(requisicao.url).origin;
const sessao = await stripe().checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: PRECOS[periodo], quantity: 1 }],
  client_reference_id: contaId,
  ...(conta?.stripeCustomerId
    ? { customer: conta.stripeCustomerId }
    : { customer_email: quem.email }),
  subscription_data: { metadata: { contaId, uid: quem.uid } },
  locale: "pt-BR",
  success_url: `${origem}/assinatura/confirmando`,
  cancel_url: `${origem}/assinatura`,
});
return NextResponse.json({ url: sessao.url });
```

`Autenticado` ganha `email` (o token o traz). Sem `trial_period_days`: o teste é o nosso, e já
correu. Sem `allow_promotion_codes`: cupom é a fase 3.

**`POST /api/assinatura/portal`**: mesma porta; lê `stripeCustomerId` do documento; sem ele,
`falha("sem-assinatura", 409)`; senão `billingPortal.sessions.create({ customer, return_url:
`${origem}/configuracao` })` e `{ url }`.

**`GET /api/assinatura/precos`**: token conferido (sem `contaId`: preço não é dado de conta);
`prices.retrieve` nos dois ids, `{ mensal: unit_amount, anual: unit_amount }` em centavos,
num `Map` por instância como o cache de CNPJ de `/api/nota` (`#d52`). O preço mora no Stripe e
em lugar nenhum do código (roadmap §7); esta rota é o único jeito de a tela mostrá-lo.

**`POST /api/stripe/webhook`**, sem `conferirToken` — quem chama é o Stripe, e a assinatura do
corpo é a autenticação:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  if (!credencialDisponivel() || !stripeDisponivel())
    return new Response(null, { status: 500 });
  const corpo = await requisicao.text(); // cru: a assinatura é sobre os bytes
  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(
      corpo,
      requisicao.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!evento.type.startsWith("customer.subscription."))
    return new Response(null, { status: 200 });

  // Relê, e não confia no evento: eventos chegam fora de ordem (#d145).
  const id = (evento.data.object as Stripe.Subscription).id;
  const assinatura = await stripe().subscriptions.retrieve(id);
  const { contaId, uid } = assinatura.metadata;
  if (!contaId || !uid) return new Response(null, { status: 200 }); // não é nossa; nada a repetir

  const item = assinatura.items.data[0];
  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data();
  const ateMs = acessoAteDaAssinatura({
    status: assinatura.status,
    periodoInicioMs: item.current_period_start * 1000,
    periodoFimMs: item.current_period_end * 1000,
    trialAteMs: conta?.trialAte?.toMillis(),
    agoraMs: Date.now(),
  });

  await escreverAcessoAte(uid, contaId, ateMs); // claim antes do documento (#d145)
  await documento.set(
    {
      plano: "ASSINATURA",
      stripeCustomerId:
        typeof assinatura.customer === "string"
          ? assinatura.customer
          : assinatura.customer.id,
      stripeSubscriptionId: assinatura.id,
      assinaturaAte: Timestamp.fromMillis(ateMs),
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );

  return new Response(null, { status: 200 });
}
```

Três respostas, e por quê: **400** para assinatura inválida (o Stripe não repete); **200** para
evento que não é nosso ou não tem `metadata` (repetir não mudaria nada); **500** — o `throw`
de qualquer `await` — para falha nossa, porque aí o Stripe repete por três dias, e é isso que
se quer.

### 3.5 A tela — `src/app/(auth)/assinatura/page.tsx` e `…/assinatura/confirmando/page.tsx`

Fora do shell, em `(auth)`, com `MolduraDeEntrada` — a terceira tela que o comentário dela
esperava. `"use client"`, `useAuth()`: sem `usuario` → `/login`; sem `contaId` → `/`; sem
`conta` ainda → o pulso do `Simbolo` como no `(app)/layout.tsx`. Com `conta`,
`situacaoDaConta` decide **um de quatro estados**, e a tela é uma só:

| Situação                | Título                                    | Descrição                                                                                | Ações                                                        |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `teste`                 | `fraseDoTeste(dias)` ("…acaba em 9 dias") | "Depois disso, tudo o que você cadastrou continua aqui, mas só assinando dá para mexer." | os dois cartões de preço · "Voltar" (`/`)                    |
| `vencida`, `teste`      | "Seu teste grátis acabou"                 | "Tudo o que você cadastrou continua guardado. Assine para voltar a mexer."               | os dois cartões · "Sair"                                     |
| `vencida`, `assinatura` | "Não conseguimos renovar sua assinatura"  | "Atualize a forma de pagamento e o acesso volta sozinho."                                | "Atualizar pagamento" (portal) · "Sair"                      |
| `assinante`             | "Sua assinatura está ativa"               | "Trocar o cartão, mudar para o anual ou cancelar é no portal de pagamento."              | "Gerenciar assinatura" (portal) · "Voltar" (`/configuracao`) |
| `livre`                 | —                                         | `router.replace("/")`: não há o que ver.                                                 |                                                              |

**Os dois cartões de preço** vêm de `GET /api/assinatura/precos` (esqueleto enquanto carrega;
falha → a frase de `sem-resposta` e os cartões sem número, ainda clicáveis — o Stripe mostra o
preço de qualquer jeito): "Mensal · R$ 39,00 por mês" e "Anual · R$ 390,00 por ano" com a linha
"R$ 78,00 a menos que mês a mês" quando `economiaAnual > 0` — a conta feita, e não "dois meses
grátis" escrito à mão. Cada cartão é um `<button>` de 52px, `primaria` no anual (a arma contra o
churn, roadmap §1) e secundária no mensal. Toque → `POST /api/assinatura/checkout` → `window.location.assign(url)`.
Erros num `<p role="alert">` por `MENSAGEM_FALHA_ASSINATURA`, com `codigoDaFalha` no padrão da
027; `sem-rede` é o `TypeError` do `fetch`.

"Sair" é o `sair()` do `AuthProvider` com `AVISO_SAIR_PENDENTE` — o quarto lugar; o comentário
da constante passa de "três" a "quatro". Vencida com escrita pendente é o caso real: o que ela
salvou ontem à noite sem rede é o que a regra vai recusar hoje, e sair apagaria. `sair()` já
recusa (`#d118`); a frase explica.

**`/assinatura/confirmando`** é para onde o Stripe devolve depois do pagamento. Título
"Pagamento recebido", descrição "Liberando sua conta…", o pulso. Um `useEffect` sobre `conta`:
quando `situacaoDaConta` virar `assinante`, `await reconferirAcesso()` (a claim já está lá,
`#d145`) e `router.replace("/")`. Passados 45 segundos sem mudar, o botão "Conferir de novo"
(que chama `reconferirAcesso()` — inócuo, o documento é quem decide) e a linha "Está demorando
mais que o normal. O pagamento chegou ao Stripe; se não liberar em alguns minutos, avise quem
cuida do Rende." Sem timer no caminho feliz: a assinatura viva do documento é o gatilho.

### 3.6 O portão — `src/app/(app)/layout.tsx`

Depois do `if (!contaId)`, com `conta` já lido:

```ts
const situacao = conta
  ? situacaoDaConta(
      {
        plano: conta.plano,
        trialAteMs: conta.trialAte?.toMillis(),
        assinaturaAteMs: conta.assinaturaAte?.toMillis(),
      },
      Date.now(),
    )
  : null;
useEffect(() => {
  if (situacao?.tipo === "vencida") router.replace("/assinatura");
}, [situacao?.tipo, router]);
if (situacao?.tipo === "vencida") return null;
```

`conta` ainda `null` (primeira leitura) **não** bloqueia: o shell abre como hoje, e o
redirecionamento vem com o documento. Offline, o documento vem do cache e a conta vencida vê a
tela de vencida sem rede — o botão de assinar diz `sem-rede` quando tocado, que é a verdade.
O relógio aqui é o do aparelho; o que vale é o da regra. Um relógio atrasado no celular engana
a tela e não a escrita, e a escrita recusada aparece como `permission-denied` no
`SeloSincronizacao` — o mesmo sinal que a regra antiga já dá a quem perdeu a claim.

### 3.7 A linha da tela Hoje — `src/components/assinatura/FaixaDoTeste.tsx`

Em `(coluna)/page.tsx`, primeira coisa dentro do `mt-6 space-y-4`, antes do cartão do caminho.
Só quando `situacaoDaConta` é `teste`: um `Link` para `/assinatura`, `min-h-11`, com
`Hourglass` (`lucide`) à esquerda, "`fraseDoTeste(dias)` · Assinar" e `ChevronRight`. Com
`diasRestantes <= DIAS_DE_ATENCAO`, o ícone vira `TriangleAlert` e o texto `text-attention` —
ícone e cor juntos, como o cartão do vermelho. Durante o teste inteiro, e não só na última
semana: o cadastro disse "catorze dias" e a linha é o mesmo relógio, contando. É a única coisa
que esta spec põe na frente de quem está começando (`#d113`, acima).

### 3.8 `/configuracao` — `src/components/configuracao/TelaConfiguracao.tsx`

- **Bloco "Assinatura"**, `BlocoConfiguracao` com `CreditCard`, entre "Formas de pagamento" e
  "Na folha do orçamento", só para `teste` e `assinante` — `livre` não tem o que ver, e o bloco
  não existe. `teste`: a frase do teste e o `Link` "Assinar" para `/assinatura`. `assinante`:
  "Sua assinatura está ativa." e o botão "Gerenciar assinatura" (`POST /api/assinatura/portal`
  → `window.location.assign`). Fora de `estado`/`alterado`: nada aqui se salva.
- **A caixa do `#d147`**, no bloco "Na folha do orçamento", abaixo da "Frase do orçamento":
  `<input type="checkbox">` nativo no padrão de `BlocoCaixa.tsx:72`, rótulo "Tirar a linha
  'feito com Rende' do rodapé da folha", linha de 44px, `size-5`. Entra em `estado`, na
  assinatura de `alterado` e em `paraDados` como `ocultarFeitoCom: marcado || deleteField()`;
  `esquemaConfiguracao` ganha `ocultarFeitoCom: z.literal(true).optional()`. Para `teste`, no
  lugar da caixa, `<p className="text-label text-ink-muted">`: "Assinantes podem tirar esta
  linha da folha." — sem link: o bloco de assinatura está duas dobras acima.

### 3.9 A folha — `domain/orcamento.ts` e `FolhaOrcamento.tsx`

`Orcamento.negocio.feitoCom: boolean` (`!configuracao?.ocultarFeitoCom`);
`ConfiguracaoParaOrcar` ganha `"ocultarFeitoCom"`. `FolhaOrcamento.tsx:237` vira
`{orcamento.negocio.feitoCom && <p …>feito com Rende</p>}`; o comentário da linha 223 continua
verdadeiro com a linha ausente — o `justify-between` fecha sozinho. Teste em
`tests/domain/orcamento.test.ts`: com e sem o campo.

### 3.10 Os termos — `src/app/(auth)/termos/page.tsx`

A seção "O teste grátis de catorze dias e o que acontece depois" continua sendo texto de quem
conduz o projeto, e esta spec diz **o que ele precisa afirmar**: depois de catorze dias, para
continuar cadastrando e alterando é preciso assinar; o que foi cadastrado continua guardado e
legível; a assinatura é mensal ou anual, cobrada pelo Stripe, cancelável a qualquer momento
pelo portal, valendo até o fim do período pago; o preço é o exibido na hora de assinar e pode
mudar com aviso. O parágrafo do encerramento continua sendo da 029.

### 3.11 Ambiente e documentação

- `.env.local.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MENSAL`,
  `STRIPE_PRICE_ANUAL`, no bloco das chaves privadas, com o aviso da `GEMINI_API_KEY`
  invertido de novo: esta **cobra dinheiro de outras pessoas**. Nenhuma `NEXT_PUBLIC_`.
- `docs/DEPLOY.md`: seção "Stripe" com o passo 2 da seção 2 inteiro (produto, preços, portal,
  endpoint do webhook, modo de teste vs. ao vivo, o Stripe CLI para o `dev`), as quatro
  variáveis, e a ordem de publicação: **regra → app → endpoint do webhook no painel**. A
  região `gru1` passa a valer para quatro rotas, não uma.
- `#d144` a `#d147` em `docs/DECISOES.md`; `#d127` ganha "desligável na 028"; `#d112` ganha
  "a claim é `acessoAte`, uma data, e não `ativas`; sem cron (`#d144`)".
- `docs/ESTADO.md`: a seção da 028, a linha na tabela, a próxima ação.
- `docs/saas/ROADMAP.md`: a 028 marcada como entregue, com o que mudou do previsto (a claim é
  uma data e não um booleano; não há cron nem `vercel.json`; `status` não muda; a tela de
  vencida é uma rota fora do shell; `conceder-acesso.mjs` mudou uma linha).

---

## Roteiro de navegador

Precisa do projeto de verdade, do Stripe em **modo de teste** com o passo 2 da seção 2 feito,
do Stripe CLI rodando `stripe listen`, de **um e-mail sem login** e do cartão de teste
`4242 4242 4242 4242`. Aparelho em 360px nos passos 5, 6 e 9.

1. **A regra, antes do app.** `firebase deploy --only firestore:rules`. Entrar com
   `contas/mycookies`, lançar um número em `/financeiro`, recarregar: voltou. **Se não voltar,
   parar aqui**: a regra nova está negando conta sem prazo, e nada mais desta spec publica.
2. **Cadastro.** `/cadastro` com o e-mail novo → `/fichas`. No Authentication, a claim tem
   `contas` e `acessoAte` com o mesmo número de `trialAte` no documento. Tela Hoje: a linha
   "Seu teste grátis acaba em 14 dias · Assinar". `/configuracao`: bloco "Assinatura" com
   "Assinar"; no bloco da folha, "Assinantes podem tirar esta linha da folha." e nenhuma caixa.
3. **Os preços.** `/assinatura`: título com os 14 dias, os dois cartões com os valores do
   painel do Stripe, a linha da economia no anual com a conta certa. "Voltar" leva a `/`.
4. **Vencer à força.** Com o Admin SDK, num `node -e` com `GOOGLE_APPLICATION_CREDENTIALS`:
   `setCustomUserClaims(uid, { ...claims, acessoAte: { [contaId]: Date.now() - 1 } })` e
   `update(contas/{id}, { trialAte: ontem })`. Recarregar: cai em `/assinatura` com "Seu teste
   grátis acabou". No console do navegador, um `setDoc` em `contas/{id}/insumos/x` → `permission-denied`;
   um `getDoc` em `contas/{id}` → funciona. **Ler sem prazo, escrever não.**
5. **Assinar, a 360px.** "Anual" → checkout do Stripe em português com o preço → `4242…` → volta
   em `/assinatura/confirmando` → "Pagamento recebido" → em segundos, `/`. No terminal do
   `stripe listen`: `customer.subscription.created` (e `updated`) com 200. Firestore:
   `plano: "ASSINATURA"`, os dois ids do Stripe, `assinaturaAte` um ano e três dias à frente;
   claim `acessoAte` com o mesmo número. Lançar em `/financeiro`: gravou. A linha do teste
   sumiu da Hoje. `/configuracao`: "Sua assinatura está ativa", e a caixa da folha apareceu.
6. **A folha.** Marcar a caixa, salvar, abrir `/pedidos/{id}/orcamento`: sem "feito com Rende",
   rodapé fechado sem buraco. Desmarcar, salvar: a linha volta. Firestore: `ocultarFeitoCom`
   some do documento quando desmarcada.
7. **O portal.** "Gerenciar assinatura" → portal do Stripe → "Voltar" → `/configuracao`.
8. **Cancelar.** No portal, cancelar. `stripe listen`: `updated` com `cancel_at_period_end`;
   claim e `assinaturaAte` inalterados (vale até o fim do período). No painel do Stripe, com um
   **test clock** ou com "cancelar imediatamente": `deleted` → claim `acessoAte` = agora;
   recarregar: `/assinatura` com "Não conseguimos renovar sua assinatura" e "Atualizar
   pagamento" abrindo o portal.
9. **Sem rede, vencida.** DevTools Offline em `/assinatura`: a tela abre do cache; "Anual" diz
   a frase de `sem-rede`; "Sair" com escrita pendente diz `AVISO_SAIR_PENDENTE`.
10. **O webhook contra estranhos.** `curl -X POST /api/stripe/webhook -d '{}'` → 400.
    `stripe trigger customer.subscription.deleted` (a fixture não tem `metadata`) → 200 e
    nenhum documento tocado.
11. **Fora de ordem.** No painel, reenviar um `customer.subscription.updated` antigo do passo 5
    depois do `deleted` do passo 8: 200, e `acessoAte` **continua** "agora" — o handler releu a
    assinatura, que está cancelada.
12. **A conta liberada à mão continua sem prazo.** `npm run conceder-acesso -- <e-mail do passo 2>
outra-conta`: a claim ganhou `outra-conta` em `contas` **e manteve** `acessoAte` da primeira.
    `contas/mycookies`: sem `acessoAte`, sem bloco "Assinatura", com a caixa da folha.
13. **Sem Stripe configurado.** Sem `STRIPE_SECRET_KEY` no `.env.local`: `/assinatura` diz "A
    assinatura ainda não está configurada neste servidor" e o app inteiro continua de pé.

---

## Critérios de aceite

- [x] `firestore.rules`: `read` por `temAcesso()`, `write` por `podeEscrever()`, nos dois níveis;
      conta sem `acessoAte` na claim escreve como antes (passo 1); conta com `acessoAte` no
      passado lê e não escreve (passo 4).
- [x] `git diff package.json` acrescenta só `stripe` em `dependencies`; `rg -n "from \"stripe\"" src/`
      devolve só `src/lib/server/` e `src/app/api/`; o bundle do cliente não muda de tamanho
      além do ruído.
- [x] `git diff scripts/` é a linha do `setCustomUserClaims` e o comentário; `firestore.indexes.json`
      intacto; nenhum `vercel.json`.
- [x] `Conta` ganha os três opcionais e `"ASSINATURA"`; `ConfiguracaoGeral` ganha
      `ocultarFeitoCom?: true`; `ClaimDaConta` existe; nada mais em `src/lib/types/` muda.
- [x] `/api/conta` escreve `acessoAte[contaId] === trialAte.toMillis()` na mesma claim que
      `contas`, preservando o resto.
- [x] `POST /api/assinatura/checkout`: 500 `sem-configuracao`, 401, 400 (corpo fora de forma **ou**
      conta que o token não abre), 200 `{ url }` com `client_reference_id` e
      `subscription_data.metadata = { contaId, uid }`. `portal`: 409 `sem-assinatura` sem
      `stripeCustomerId`. `precos`: 200 `{ mensal, anual }` em centavos.
- [x] Webhook: 400 sem assinatura válida; 200 e nada escrito sem `metadata`; claim escrita
      **antes** do documento; `acessoAteDaAssinatura` decide o número, e `status` do documento
      não muda.
- [x] `/assinatura` nos quatro estados da tabela da 3.5; `livre` cai em `/`;
      `/assinatura/confirmando` sai sozinha quando o documento vira `ASSINATURA`, depois de
      `reconferirAcesso()`.
- [x] `(app)/layout.tsx` manda `vencida` para `/assinatura` e não bloqueia enquanto `conta` é
      `null`.
- [x] Tela Hoje: a linha só em `teste`, com `TriangleAlert` e `text-attention` de 3 dias para
      baixo; `/configuracao`: bloco só em `teste` e `assinante`; a caixa da folha só em
      `assinante` e `livre`.
- [x] `FolhaOrcamento` omite a linha quando `ocultarFeitoCom`; `montarOrcamento` testado nos dois
      casos.
- [x] `tests/domain/assinatura.test.ts` cobre a 3.2 inteira; `src/lib/domain/assinatura.ts` não
      importa Firebase, React nem `stripe`.
- [x] Toque de 44px na linha da Hoje, na caixa e nos links; 52px nos dois cartões de preço;
      `role="alert"` nos erros; nenhum estado só por cor.
- [x] `lint`, `typecheck`, `test` e `build` passam; `build` lista `/assinatura` e
      `/assinatura/confirmando` estáticas e as quatro rotas de API dinâmicas.
- [x] `#d144`–`#d147` escritos; `#d112` e `#d127` anotados; `ESTADO.md`, `ROADMAP.md`,
      `DEPLOY.md` e `.env.local.example` atualizados.
- [x] **Portão do deploy, fora da sessão:** o passo 1 do roteiro com a conta real, o passo 2 da
      seção 2 no painel ao vivo, e o parágrafo do teste em `/termos` escrito.

---

## Fora de escopo

- **Cron, `vercel.json`, `CRON_SECRET`, `/api/assinatura/vencidas`.** O roadmap os previa; a
  regra com `request.time` os dispensa (`#d144`). Se um dia for preciso varrer contas — para
  avisar por e-mail que o teste acaba, por exemplo —, o cron nasce com esse caso, e não com
  este.
- **E-mail de "seu teste acaba amanhã".** O Stripe manda os dele (recibo, cartão recusado,
  renovação); o nosso exigiria provedor de e-mail, que é dependência e conta nova. A linha da
  Hoje é o aviso, e ela abre o app toda semana pela lista de compras (roadmap §1).
- **Pix e boleto recorrentes.** O Stripe não os faz recorrentes no Brasil; assinatura é cartão.
  Ver Riscos: o modelo de `acessoAte` aceita o anual por Pix como pagamento avulso sem mudar a
  regra, e essa é a resposta se o cartão for a barreira.
- **Cupom, código de parceira, comissão recorrente.** `allow_promotion_codes` é uma linha
  quando houver a primeira professora com cupom; a comissão é planilha, não código.
- **Segundo plano, gating, limite de fichas.** `#d112`: um plano, zero permissão por tela, até a
  fase 3.
- **Modo só-leitura do app para conta vencida.** É uma tela cheia (`#d144`). Ler continua
  permitido pela regra para que a 029 exporte e para que a tela de vencida abra do cache.
- **Guardar mensal/anual no documento.** O portal mostra e troca; a tela só precisa saber que
  está ativa. Um campo que ninguém lê.
- **Recusar checkout para conta `livre`.** Nenhuma tela leva lá; um `curl` que assine
  `contas/mycookies` só faz a Maynara pagar pelo próprio produto.
- **Métricas de churn e MRR em `metricas.mjs`.** Painel do Stripe (roadmap §6).
- **Encerrar a conta, exportar, apagar** (029). **Ajudante e o `acessoAte` de um segundo
  login na mesma conta** (030: quando houver dois uids por conta, o webhook escreve nos dois,
  e é a 030 que sabe quais são).
- **App Check no webhook.** Não se aplica: a assinatura do Stripe é a autenticação.
- **Texto dos termos.** A 3.10 diz o que afirmar; quem escreve é quem conduz o projeto.

---

## Decisões desta spec que são fáceis de rejeitar

- **Uma data na claim, e não `ativas: true | false`.** O booleano exige alguém para virá-lo no
  dia do vencimento — o cron do roadmap, com `vercel.json`, um segredo, uma rota que lista todas
  as contas e uma janela de até 24 h em que a conta vencida ainda escreve. A data faz a regra
  decidir sozinha a cada escrita. Se a regra precisar de mais de uma dimensão (bloqueio manual,
  por exemplo), o booleano volta **ao lado** da data, não no lugar dela.
- **A folga de 3 dias na renovação e 7 na cobrança recusada.** Podiam ser zero e catorze. Três
  dias cobre o atraso normal do Stripe em cobrar e do webhook em chegar; sete é o que uma
  pessoa leva para perceber o e-mail do cartão recusado. As duas são constantes de
  `assinatura.ts` com teste, e mudar é uma linha.
- **`stripe` como dependência, e não `fetch` + `node:crypto`.** É a única dependência de
  produção nova desde o Módulo 0, e o `#d146` diz o motivo. Se o peso do pacote no build do
  servidor incomodar, a troca é contida em `src/lib/server/stripe.ts` e no webhook.
- **Reler a assinatura no webhook, e não confiar no evento.** Uma chamada a mais por evento
  contra um campo de "último evento" e a comparação de `created`. Os eventos são poucos (uma
  dúzia por conta por ano); a chamada é barata.
- **A tela de vencida é uma rota fora do shell, alcançada por redirecionamento.** Podia ser
  inline no `(app)/layout.tsx`, como a tela "sem conta". Mas `/assinatura` serve também a quem
  está no teste e a quem já assina, e uma tela com três entradas é uma rota, não um `if` no
  layout.
- **A linha da Hoje durante o teste inteiro.** Podia aparecer só na última semana. Catorze dias
  é curto, o cadastro anunciou o número, e uma linha que aparece do nada no dia 8 é um susto;
  uma que conta desde o dia 1 é um relógio. Se a gravação mostrar que ela incomoda, é uma
  condição em `FaixaDoTeste`.
- **O anual é o botão primário.** Roadmap §1: "anual com desconto e um trial curto são a
  resposta" ao churn. O mensal está lá, do mesmo tamanho, secundário.
- **A caixa do "feito com Rende" para a conta liberada à mão também.** Podia ser só para
  assinante. A conta liberada à mão é cortesia, e cortesia é tudo o que a assinatura dá.
- **`assinaturaAte` no documento, espelhando a claim.** Podia a tela ler só `plano` e deixar a
  regra recusar. Mas a tela precisa dizer "não conseguimos renovar" antes de a escrita falhar,
  e a claim não é observável pelo Firestore — só o documento é.
- **`GET /api/assinatura/precos` em vez de preço em variável `NEXT_PUBLIC_`.** A variável
  pública é uma cópia do Stripe que exige redeploy a cada mudança e pode divergir do que o
  checkout cobra. A rota mostra o que o Stripe vai cobrar, e é cacheada por instância.

---

## Riscos

- **A regra nova tranca a usuária 0.** É o único risco que não se desfaz com um redeploy do
  app: a regra é publicada por fora. O passo 1 do roteiro existe para isso e roda **antes** de
  qualquer outro passo, com a conta real. Se falhar, `firebase deploy --only firestore:rules` com
  a regra antiga é o desfazer, e ele leva segundos.
- **`request.time.toMillis()` contra um número da claim.** Custom claims guardam JSON; um inteiro
  chega como `int` na regra, e a comparação com `toMillis()` é `int > int`. Se por algum caminho
  o valor virar `float` ou `string`, a regra dá erro e **nega** — o que é o lado seguro, e o que
  o passo 4 do roteiro pega.
- **Ela paga e a claim não chega.** `reconferirAcesso()` força o token; se o webhook atrasar, a
  página de confirmação espera pelo documento, que é escrito depois da claim (`#d145`). O caso
  ruim é o webhook falhar de vez (500 nosso): o Stripe repete por três dias, o documento não
  muda, e a tela diz "avise quem cuida do Rende". O painel do Stripe mostra o evento vermelho.
- **O token em cache depois de pagar em outro aparelho.** O celular dela renova o token em até
  uma hora, e `onIdTokenChanged` traz a claim. Nessa hora, o celular vê o documento como
  `assinante` (a tela abre) e a escrita pode ser recusada com o token velho. Raro — ela paga no
  aparelho em que está —, e o `SeloSincronizacao` já diz quando uma escrita não subiu. Se
  aparecer de verdade, o `(app)/layout.tsx` força o token ao ver `plano` mudar: uma linha.
- **Público sem cartão de crédito.** O roadmap §4 sabe: ticket baixo, e boa parte não tem
  cartão. O Stripe não faz Pix recorrente. Se a gravação do beta mostrar que o cartão é a
  barreira, a resposta é o **anual por Pix como pagamento avulso** (`mode: "payment"`,
  `payment_method_types: ["pix"]`): o webhook trata `checkout.session.completed` com
  `mode: "payment"` escrevendo `acessoAte = agora + 365 dias + folga`. A regra não muda; é um
  ramo no webhook e um terceiro cartão na tela. Fica anotado, e não construído.
- **Versão do SDK e o fim do período.** Ver o passo 5 da seção 2: se `current_period_end` não
  estiver no item, está na assinatura, e é um caminho de propriedade.
- **O portal desativado no painel.** `billingPortal.sessions.create` falha com erro do Stripe,
  não nosso. A rota responde `sem-resposta` e a tela diz para tentar de novo — a frase certa
  para a usuária e a errada para quem publicou. `DEPLOY.md` põe o portal na lista do que se
  faz uma vez.
- **A fase 0 ainda não passou no teste, e a 027 não está publicada.** Esta spec pode ser
  codificada e ficar no branch com a 027. O que não pode esperar é o passo 1 do roteiro no dia
  em que a regra for publicada — e a regra pode ser publicada **sozinha**, antes de tudo,
  porque sem `acessoAte` ela não muda nada.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o passo 1 antes de tudo e o 4 provando que a regra nega o
que deve e permite o que deve. Com esta spec, `#d112` deixa de ser promessa: a claim que a
regra lê tem prazo, o prazo é o do Stripe, e nenhum número gravado pelo aparelho decide
cobrança. O que vem depois é a 029, que lê a conta vencida que esta deixa legível; antes dela,
o parágrafo do teste nos termos, e antes de tudo, a gravação.
