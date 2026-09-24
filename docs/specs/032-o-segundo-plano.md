# Spec 032 · O segundo plano

**Tipo:** a terceira spec da fase 3 do `docs/saas/ROADMAP.md`, e a que o `#d112` deixou marcada
desde a fase 2: "o segundo plano nasce na fase 3, junto da ajudante e do cardápio público, que são
os upsells naturais — e é lá, e não antes, que gating de funcionalidade entra no código". Um tipo
novo no domínio (`Pacote`) e uma função (`permite`), **um campo opcional em `Conta`**, dois preços
novos no Stripe, e o portão em **três lugares do servidor** onde os dois upsells já passam: a
leitura do cardápio, o convite da ajudante e o webhook. Na tela, `/assinatura` passa a oferecer
dois pacotes, e os dois painéis da prateleira de `/configuracao` ("Seu cardápio" e "Quem te
ajuda") dizem quando estão fora do pacote. **Nenhuma regra de segurança muda, nenhuma
dependência entra, nenhum índice, nenhuma rota nova.**
**Tamanho:** uma sessão. O que pesa não é a tela — é o webhook, que passa a tirar ajudantes
quando a dona desce de pacote, e é a primeira vez que ele escreve algo além de prazo.
**Origem:** roadmap, fase 3, 032; `#d112` (um plano no lançamento; o segundo com os upsells);
`docs/saas/CLAUDE.md` §4 (faixa de R$ 29–49 no plano de entrada e R$ 79–129 no plano com
catálogo e pedidos; "cobre por valor entregue, não por número de receitas").
**Gatilho, e ele não aconteceu.** A fase 3 é "só com cliente pagante pedindo". Hoje não há
cliente pagante: a 027, a 028 e a 029 estão codificadas e não publicadas, e a 030 e a 031 também.
Um segundo plano antes da primeira assinatura é preço para um produto que ninguém comprou ainda.
Esta spec fica escrita por pedido, como a 030 e a 031 ficaram. **Quem abrir esta spec para
codificar confere primeiro duas coisas:** (1) alguma conta paga a assinatura da 028; (2) alguma
delas usa o cardápio ou a ajudante, ou pediu um dos dois. Sem as duas, fecha o arquivo: um plano
só continua sendo zero código de permissão por tela, e o cardápio e a ajudante entram no plano
único sem custo nenhum.
**Depende de:** a 028 (`situacaoDaConta`, o webhook, `/assinatura`, `stripe.ts`), a 030
(`membros`, `tirarContaDaClaim`, `ehDona`, `#d156`) e a 031 (`montarCardapio` decidindo "não está
aberto" no servidor, `#d158`). Tudo codificado, nada publicado.
**Aprovações pedidas:** (1) **schema aditivo** — `Conta.pacote?: Pacote`, escrito só pelo webhook;
ausente significa "essencial" para quem assina e não significa nada para teste e liberada à mão;
(2) **o webhook tira ajudantes** quando a assinatura viva é de um pacote sem ajudante — a mesma
escrita do `DELETE /api/conta/membros`, disparada pelo Stripe e não pela dona (`#d170`);
(3) **duas variáveis de ambiente novas** e a configuração do Stripe (um produto, dois preços, o
portal permitindo trocar de produto). **Quatro decisões a registrar:** `#d167` (o portão mora no
servidor, onde os dois upsells já passam; a regra não muda), `#d168` (o teste e a conta liberada à
mão abrem tudo), `#d169` (o pacote vem do produto no Stripe, e desconhecido é essencial) e `#d170`
(descer de pacote tira as ajudantes e tira o cardápio do ar, sem apagar nada).

---

## Problema

A 028 vende um plano só (`#d112`). A 030 e a 031 entregaram as duas coisas que o
`docs/saas/CLAUDE.md` §4 chama de upsell natural — a ajudante e o cardápio com link de pedido — e
as duas estão abertas para toda conta que escreve. O que falta, de ponta a ponta:

1. **Não há o que vender a mais.** O Stripe tem um produto com dois preços; a tela de assinar
   mostra dois cartões (mensal e anual) do mesmo plano. Quem quer o cardápio paga o mesmo que
   quem só quer saber quanto custa o cookie.
2. **Nada no código sabe de pacote.** `situacaoDaConta` responde "pode escrever ou não", que é
   tudo o que a 028 precisava. Não há uma pergunta "esta conta tem o cardápio?".
3. **Os dois upsells têm portas diferentes.** O cardápio é lido pelo servidor (`#d158`), e a
   decisão de "não está aberto" já mora em `montarCardapio`. A ajudante entra pela claim, que só
   `/api/conta/membros` e o webhook escrevem (`#d155`). Um portão que não conheça as duas portas
   deixa uma aberta.
4. **Descer de pacote precisa desfazer alguma coisa.** Uma dona que assina o completo, convida
   cinco ajudantes e desce para o essencial não pode ficar com as cinco: o portão viraria
   enfeite no primeiro mês.

**O que esta spec entrega:** dois pacotes no Stripe, escolhidos em `/assinatura`; a função pura
que diz o que cada situação de conta permite; o cardápio saindo do ar e o convite de ajudante
recusado para quem assina o essencial; o webhook gravando o pacote e tirando as ajudantes quando
a dona desce; e os dois painéis da prateleira dizendo por que estão fechados e como abrir.

**O que esta spec não entrega:** limite de fichas, de pedidos ou de qualquer coisa contada
(`#d112`, e o `CLAUDE.md` §4: "limitar receitas pune exatamente o comportamento que gera
retenção"); um terceiro pacote; preço por ajudante; cupom; o aviso "seu cardápio vai sair do ar"
antes de ela escolher o essencial no checkout. Está tudo em "Fora de escopo".

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra**, em `/assinatura`, a escolha entre dois pacotes, com o período (mês ou ano) numa
  escolha à parte. São os mesmos dois cartões de hoje, com outra pergunta: "o quê", e não
  "por quanto tempo".
- **Entra**, nos painéis "Seu cardápio" e "Quem te ajuda", uma linha durante o teste ("No teste
  está aberto. Depois, é do plano completo.") e, no essencial, o painel inteiro trocado por uma
  explicação e um botão. Os dois painéis estão no fim de `/configuracao`, e quem está começando só
  os vê se for procurar.
- **Sai**: nada. Quem está no teste vê o produto inteiro, como hoje (`#d168`); o portão só aparece
  para quem já assinou e escolheu o pacote menor. A frase está escrita porque a regra manda.

---

## 1 · O que esta spec decide

### O portão mora no servidor, onde os dois upsells já passam; a regra não muda — `#d167`

O roadmap previa que o gating entraria como "código de permissão em cada tela" (seção 4, a linha
"Vários planos com gating de funcionalidade"). Não precisa. Os dois upsells já atravessam o
servidor, por decisões tomadas por outros motivos:

- **O cardápio** é renderizado com o Admin SDK, e `montarCardapio` já devolve `null` para conta
  encerrada e conta vencida (`#d158`). O pacote é o sexto caso de "não está aberto", no mesmo
  `if`. A página, o `POST /api/cardapio/pedido` e a montagem de combos passam todos por ela.
- **A ajudante** só existe porque `/api/conta/membros` escreve a claim dela, e só continua
  existindo porque o webhook a renova (`#d155`). O convite recusa; o webhook tira.

Consequência: `firestore.rules` não muda uma linha, e nenhuma tela precisa esconder um botão para
que o portão funcione. A tela diz a verdade sobre o portão; quem o fecha é o servidor. Um `curl`
não abre o cardápio de uma assinante do essencial nem convida uma ajudante para ela.

A função é uma só, pura, em `domain/assinatura.ts`:

```ts
permite(situacaoDaConta(conta, agora), "cardapio" | "ajudante"): boolean
```

`livre` e `teste`: sim. `vencida`: não (já era, pela regra e por `montarCardapio`).
`assinante`: o que o pacote dela tem. É uma tabela de duas linhas, e não um sistema de
permissões: dois pacotes, dois recursos.

### O teste e a conta liberada à mão abrem tudo — `#d168`

O teste é o completo. Um upsell que ela nunca viu não se vende, e o teste de catorze dias é a
única vez em que ela usa o produto sem ter decidido pagar. A conta liberada à mão (`livre`,
`#d141`) também abre tudo: é cortesia, e cortesia é tudo o que a assinatura dá — o mesmo
argumento do `#d147` para o "feito com Rende".

Consequência que precisa estar escrita: **quem abriu o cardápio ou convidou uma ajudante no teste
e assina o essencial perde os dois no dia em que assina.** O cartão do essencial em `/assinatura`
diz, em texto, o que ele não tem ("Sem cardápio e sem ajudante"), e os dois painéis dizem durante
o teste inteiro que são do completo. É o mesmo relógio da `FaixaDoTeste`: ninguém é surpreendido
por uma coisa que o app disse desde o dia 1.

`contas/mycookies` e as contas do beta são `livre`: **nada muda para nenhuma conta que existe
hoje**, e esta spec pode ser publicada sem migração.

### O pacote vem do produto no Stripe, e desconhecido é essencial — `#d169`

Dois produtos no Stripe: o que já existe ("Rende", o essencial) e um novo ("Rende Completo"), cada
um com seu preço mensal e anual. O produto completo tem `metadata.pacote = "COMPLETO"`. O webhook
relê a assinatura com `expand: ["items.data.price.product"]` e grava
`pacoteDaMetadata(produto.metadata.pacote)`.

Por que o produto e não o id do preço: preço muda (roadmap §7: "o número fica no Stripe"), e muda
criando um `Price` novo no mesmo produto. Quem assinou antes continua no preço velho. Se o webhook
comparasse o id do preço com a variável de ambiente, a primeira mudança de preço rebaixaria todas
as assinantes antigas do completo para o essencial — e o `#d170` tiraria as ajudantes delas. O
produto não muda quando o preço muda.

**Valor desconhecido é essencial**, pelo mesmo princípio do `#d153` ("valor desconhecido é
ajudante, nunca dona"): errar para menos acesso. Um produto sem a `metadata`, um produto apagado
(`DeletedProduct`, sem `metadata`) ou um terceiro produto criado por engano no painel dão
essencial. O passo 5 do roteiro confere a `metadata` antes de qualquer cliente de verdade.

`Conta.pacote` é o espelho, como `assinaturaAte` é o espelho da claim (`#d145`): o webhook escreve,
a tela e o servidor leem. **Ausente em assinante é essencial** — é o único pacote que existia
antes desta spec, e nenhuma assinatura existe em produção para migrar.

### Descer de pacote tira as ajudantes e tira o cardápio do ar, sem apagar nada — `#d170`

Os dois upsells se desfazem de jeitos diferentes, porque são coisas diferentes:

- **O cardápio é configuração dela.** `ConfiguracaoGeral.cardapio` (a lista, os limitados, as
  promoções) e `configuracao/vitrine` ficam como estão. `montarCardapio` devolve `null`, a página
  dá não encontrado, e o pedido pelo link responde `fechado`. Se ela subir de volta para o
  completo, o cardápio volta exatamente como estava, no próximo `revalidate` (60 s). Nada foi
  escrito, então nada precisa ser desfeito.
- **A ajudante é acesso de outra pessoa.** Ela escreve na conta pela claim, e a claim é renovada
  pelo webhook. Deixá-la lá é deixar o portão aberto; deixar de renovar a claim a faria parar de
  salvar calada no fim do período, com a tela dela ainda aberta (`#d80`: escrita recusada falha
  calada). Então o webhook faz o que o `DELETE /api/conta/membros` faz: `tirarContaDaClaim` e
  `removidaEm` no espelho. O documento fica (o invariante "nunca apagar" segue sem exceção nova),
  e a ajudante, na próxima renovação do token, cai em "Este login ainda não abre nenhuma conta",
  que é a mesma tela de quando a dona a tira à mão. Subir de volta não a devolve: a dona convida
  de novo, e o `POST` já trata reconvite (`removidaEm: FieldValue.delete()`).

**Só a assinatura viva tira.** Com `status` em `active`, `trialing` ou `past_due` e pacote
essencial, o webhook tira. Com a assinatura cancelada ou sem pagamento, ele não tira ninguém:
escreve `acessoAte = agora` para todas, como hoje, e a ajudante vê "O acesso a este negócio está
suspenso" (`#d156`). A diferença importa: se a dona volta a pagar o completo, a ajudante suspensa
volta sozinha; a tirada, não.

Descer pelo portal no fim do período (configuração do portal, seção 2) faz o webhook ver o
essencial só quando o período pago do completo acabou. Ela usa o que pagou.

---

## 2 · Antes de tocar em código

1. **O gatilho**, no cabeçalho. Se ninguém paga, parar.
2. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` para `/assinatura` e para os dois painéis
   fechados. `/assinatura` ganha uma pergunta a mais na tela em que ela decide pagar; é a que menos
   pode ficar mais difícil.
3. **Painel do Stripe, modo de teste:** (a) no produto que já existe, nada muda — ele é o
   essencial, sem `metadata`; (b) um produto novo, "Rende Completo", com `metadata.pacote =
COMPLETO` e dois preços recorrentes em BRL, mensal e anual (anual = dez mensais, como na 028), os
   ids `price_…` anotados; (c) **Customer Portal → Subscriptions → "Customers can switch plans"**
   ligado, com os **dois produtos** e os quatro preços na lista, e "downgrades" aplicados **no fim
   do período** (sem isso o portal não mostra "Atualizar plano", e o botão "Mudar para o completo"
   dos painéis leva a um portal sem a opção). **Nada disso é código**, e vai para
   `docs/DEPLOY.md`.
4. Ler `src/app/api/stripe/webhook/route.ts` inteiro, `tirarContaDaClaim` em `firebaseAdmin.ts` e
   o `DELETE` de `src/app/api/conta/membros/route.ts`: o `#d170` é esse `DELETE` chamado de dentro
   do laço do webhook.
5. Conferir, no SDK instalado, o tipo de `item.price.product` com `expand`: é
   `string | Stripe.Product | Stripe.DeletedProduct`. Só `Stripe.Product` tem `metadata`.

---

## 3 · Escopo

### 3.1 Os tipos — `src/lib/types/conta.ts`

```ts
/** O que a assinatura dá. Ver `DECISOES.md#d168` a `#d170`. */
export type Pacote = "ESSENCIAL" | "COMPLETO";

export interface Conta {
  // … o que já existe …
  /**
   * Escrito pelo webhook do Stripe (spec 032) a partir do produto da
   * assinatura, e por mais ninguém. Ausente em assinante = `"ESSENCIAL"`;
   * ausente em teste e em conta liberada à mão não significa nada: as duas
   * abrem tudo (`DECISOES.md#d168`).
   */
  pacote?: Pacote;
}
```

`ClaimDaConta` não muda: o pacote não vai para a claim, porque a regra não o lê (`#d167`).

### 3.2 O domínio — `src/lib/domain/assinatura.ts`

```ts
export type Recurso = "cardapio" | "ajudante";

/** O que cada pacote abre. O teste e a conta livre abrem tudo (`#d168`). */
export const RECURSOS_DO_PACOTE: Record<Pacote, readonly Recurso[]> = {
  ESSENCIAL: [],
  COMPLETO: ["cardapio", "ajudante"],
};

export const NOME_DO_PACOTE: Record<Pacote, string> = {
  ESSENCIAL: "Essencial",
  COMPLETO: "Completo",
};

/** Uma linha por pacote, para o cartão de `/assinatura`: o que ele dá, em texto. */
export const O_QUE_O_PACOTE_TEM: Record<Pacote, string> = {
  ESSENCIAL:
    "O preço de cada doce, os pedidos, a despensa e o caixa. Sem cardápio e sem ajudante.",
  COMPLETO:
    "Tudo do essencial, mais o cardápio com link de pedido e até 5 ajudantes.",
};

// `Situacao` ganha o pacote no assinante:
//   | { tipo: "assinante"; renovaEmMs: number; pacote: Pacote }
// `ContaParaSituar` ganha `pacote?: Pacote`; ausente em assinante = "ESSENCIAL".

export function permite(situacao: Situacao, recurso: Recurso): boolean;

/** `"COMPLETO"` só quando a metadata diz isso; qualquer outra coisa é essencial (`#d169`). */
export function pacoteDaMetadata(valor: string | undefined): Pacote;

// `esquemaCheckout` ganha `pacote: z.enum(["ESSENCIAL", "COMPLETO"])`.
```

O "até 5" do texto do completo é `LIMITE_DE_AJUDANTES` de `domain/ajudante.ts`, interpolado, e não
o número escrito à mão.

Testes em `tests/domain/assinatura.test.ts`, somados aos que existem: `permite` nas cinco
situações × dois recursos (livre, teste, vencida, assinante essencial, assinante completo), mais
o assinante **sem** `pacote` dando essencial; `situacaoDaConta` devolvendo `pacote` no assinante;
`pacoteDaMetadata` com `"COMPLETO"`, `undefined`, `""`, `"completo"` (minúsculo é essencial: a
metadata é escrita uma vez, à mão, e o roteiro a confere) e um valor qualquer.

### 3.3 O servidor — `src/lib/server/stripe.ts` e as rotas

**`stripe.ts`**: `PRECOS` vira `Record<Pacote, Record<Periodo, string>>`. O essencial continua em
`STRIPE_PRICE_MENSAL` e `STRIPE_PRICE_ANUAL` (as variáveis da 028 não mudam de nome); o completo
em `STRIPE_PRICE_COMPLETO_MENSAL` e `STRIPE_PRICE_COMPLETO_ANUAL`. `stripeDisponivel()` exige os
quatro: um servidor com meio catálogo venderia um pacote e daria erro no outro, e o erro certo é
"a assinatura ainda não está configurada".

**`POST /api/assinatura/checkout`**: `line_items: [{ price: PRECOS[pacote][periodo], quantity: 1 }]`.
Nada mais muda. O pacote **não** vai para `subscription_data.metadata`: quem decide é o produto
(`#d169`), e duas fontes discordariam no dia em que ela trocasse pelo portal.

**`GET /api/assinatura/precos`**: devolve `{ ESSENCIAL: { mensal, anual }, COMPLETO: { mensal,
anual } }`. O cache por instância passa a ter quatro chaves (`${pacote}:${periodo}`). A única
leitora é `/assinatura`, e as duas mudam juntas.

**`POST /api/assinatura/portal`**: não muda. Mudar de pacote é o portal, configurado no passo 3 da
seção 2.

**`POST /api/stripe/webhook`**, o trecho que muda:

```ts
const assinatura = await stripe().subscriptions.retrieve(id, {
  expand: ["items.data.price.product"],
});
// … contaId, uid, item, documento, conta, ateMs: como estão …

const produto = item.price.product;
const pacote = pacoteDaMetadata(
  typeof produto === "object" && !produto.deleted
    ? produto.metadata.pacote
    : undefined,
);
// Só a assinatura viva tira ajudante; cancelada ou sem pagamento suspende,
// como antes, e a ajudante volta sozinha se a dona voltar a pagar (#d170).
const viva = ["active", "trialing", "past_due"].includes(assinatura.status);
const ficam = !viva || RECURSOS_DO_PACOTE[pacote].includes("ajudante");

const membros = await adminDb().collection(caminhos.membros(contaId)).get();
const ativas = membros.docs.filter((d) => !d.get("removidaEm"));

// Claim antes do documento (#d145). A dona sempre; as ajudantes, se ficam.
await escreverAcessoAte(uid, contaId, ateMs);
for (const membro of ativas) {
  if (ficam) {
    await escreverAcessoAte(membro.id, contaId, ateMs);
  } else {
    // O DELETE de /api/conta/membros, disparado pelo Stripe (#d170).
    await tirarContaDaClaim(membro.id, contaId);
    await membro.ref.set(
      { removidaEm: Timestamp.now(), v: VERSAO_SCHEMA },
      { merge: true },
    );
  }
}
await documento.set({ /* … o que já grava … */ pacote }, { merge: true });
```

Idempotente como tudo no webhook: numa repetição, quem já foi tirada tem `removidaEm` e não entra
em `ativas`. Uma volta que caia no meio do laço deixa algumas tiradas e outras não; o Stripe
repete (500), e a repetição termina o que faltou.

**`POST /api/conta/membros`**, depois do `if (!conta)` (passo 2, antes do freio):

```ts
const situacao = situacaoDaConta(paraSituar(conta), Date.now());
if (!permite(situacao, "ajudante")) return falha("sem-pacote", 403);
```

`FalhaConvite` ganha `"sem-pacote"`, com a mensagem "Convidar ajudante é do plano completo." O
`DELETE` **não** tem portão: tirar acesso sempre pode.

`paraSituar(conta)` é o objeto `{ plano, trialAteMs, assinaturaAteMs, pacote }` que hoje cinco
arquivos montam à mão (`grep situacaoDaConta\(`). Se a sessão achar que o sexto e o sétimo lugar
pedem a função, ela nasce em `domain/assinatura.ts` recebendo os campos já em milissegundos — o
domínio não conhece `Timestamp` —, e os cinco lugares antigos ficam como estão. Se não, a sessão
monta o objeto à mão como os outros.

### 3.4 O cardápio — `src/lib/domain/cardapio.ts`

Em `montarCardapio`, a linha `if (situacao.tipo === "vencida") return null;` vira
`if (!permite(situacao, "cardapio")) return null;`, e o `situacaoDaConta` passa a receber
`pacote: conta.pacote`. O comentário da função passa de "os cinco casos" para os seis. Teste em
`tests/domain/cardapio.test.ts`: assinante essencial → `null`; assinante completo, teste e livre →
cardápio; assinante **sem** `pacote` → `null`.

A foto (`lerFotoDoCardapio`) e a vitrine (`lerImagemDaVitrine`) **não** ganham o portão: elas não
leem a conta hoje, e a conta vencida já tem o mesmo buraco (quem guardou a URL da foto a vê). Ver
"Fora de escopo".

### 3.5 A tela de assinar — `src/app/(auth)/assinatura/page.tsx`

Os estados da 028 continuam os mesmos quatro, mais o ramo da ajudante. O que muda é o que
`cartoesDePreco` desenha, nos dois estados que o mostram (`teste` e `vencida` do teste):

- **O período**, primeiro: um `<fieldset>` com dois `<input type="radio">` nativos, "Por mês" e
  "Por ano", cada linha com 44px de alvo; **"Por ano" marcado** ao abrir (o anual continua sendo
  a arma contra o churn, roadmap §1). A legenda do fieldset é visível: "Pagar".
- **Os dois pacotes**, depois: `CartaoDePreco` como hoje, um por pacote, com o preço do período
  marcado, a linha `O_QUE_O_PACOTE_TEM` e, no anual, a linha "R$ 78,00 a menos que mês a mês" com
  `economiaAnual` do pacote. **O essencial é o primário**, o completo o secundário: o produto que
  a gente vende é a frase do preço (roadmap §1), e o completo é o que se escolhe quando se sabe
  por quê.
- Toque → `POST /api/assinatura/checkout` com `{ contaId, pacote, periodo }`. `enviando` passa a
  guardar o pacote.

No estado `assinante`, a descrição ganha o pacote: "Você está no plano Essencial. Trocar o cartão,
mudar de plano ou cancelar é no portal de pagamento." O botão continua "Gerenciar assinatura".

### 3.6 Os dois painéis — `SeuCardapio.tsx` e `QuemTeAjuda.tsx`

Os dois leem `useAuth().conta`, calculam `situacaoDaConta` com o `pacote` e perguntam `permite`.
Três casos, e os dois painéis se comportam igual:

| Situação                         | Linha na prateleira                           | Dentro do painel                                                                                                                        |
| -------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `livre`, `assinante` do completo | como hoje                                     | como hoje                                                                                                                               |
| `teste`                          | como hoje                                     | como hoje, mais uma linha `text-label text-ink-muted` no topo: "No teste está aberto. Depois, é do plano completo."                     |
| `assinante` do essencial         | legenda "No plano completo", com ícone `Lock` | **só** a explicação e o botão "Mudar para o completo" (`POST /api/assinatura/portal`, como o "Gerenciar assinatura" de `/configuracao`) |

A explicação do essencial, por painel:

- **Seu cardápio**, com `cardapio.aberto` gravado: `TriangleAlert` e "Seu cardápio saiu do ar. O
  que você escolheu continua guardado e volta como estava quando você mudar para o completo."
  Sem `aberto`: "O cardápio com link de pedido é do plano completo." O que está gravado não é lido
  para mais nada: nenhum controle de edição aparece, e nenhuma escrita sai deste estado.
- **Quem te ajuda**: "Ajudante é do plano completo. Quem te ajudava perdeu o acesso quando o plano
  mudou; para voltar, mude de plano e convide de novo." A segunda frase só quando há membro com
  `removidaEm` — senão, só a primeira.

O botão é `Botao` de 52px no celular. Os erros saem pelo mesmo `MENSAGEM_FALHA_ASSINATURA` e
`role="alert"` da 028. Ícone e texto juntos em todo estado fechado: nunca só a cor.

### 3.7 `/configuracao`, o bloco "Assinatura" — `TelaConfiguracao.tsx`

No estado `assinante`, "Sua assinatura está ativa." vira "Você está no plano {NOME_DO_PACOTE}." O
resto do bloco não muda.

### 3.8 Os termos — `src/app/(auth)/termos/page.tsx`

A seção do teste e da assinatura (texto de quem conduz o projeto, 3.10 da 028) precisa passar a
afirmar: há dois planos, e o que cada um inclui; o teste inclui tudo; mudar para o plano menor
tira o cardápio do ar e o acesso das ajudantes quando a mudança vale, sem apagar o que foi
cadastrado. A spec diz o que afirmar; quem escreve é quem conduz o projeto.

### 3.9 Ambiente e documentação

- `.env.local.example`: `STRIPE_PRICE_COMPLETO_MENSAL` e `STRIPE_PRICE_COMPLETO_ANUAL`, ao lado dos
  dois da 028.
- `docs/DEPLOY.md`, seção "Stripe": o passo 3 da seção 2 inteiro (o produto novo com a
  `metadata`, os dois preços, o portal trocando de produto, o downgrade no fim do período), as
  duas variáveis, e a ordem: **produto e preços no painel → variáveis → app**. Sem as quatro
  variáveis, `/assinatura` diz `sem-configuracao`, e o resto do app fica de pé.
- `#d167` a `#d170` em `docs/DECISOES.md`; `#d112` ganha "cumprida na 032: dois pacotes, o
  portão no servidor, nenhuma regra (`#d167`)"; `#d155` ganha "o webhook também tira (`#d170`)".
- `docs/ESTADO.md`: a seção da 032, a linha na tabela, a próxima ação.
- `docs/saas/ROADMAP.md`: a 032 marcada, com o que mudou do previsto (o gating não é "código de
  permissão em cada tela": são três pontos no servidor e dois painéis que explicam; e a seção 4,
  linha "Vários planos com gating de funcionalidade", ganha a nota).

---

## Roteiro de navegador

Precisa do Stripe em modo de teste com o passo 3 da seção 2 feito, do `stripe listen`, de **dois
e-mails sem login** (a dona e a ajudante) e do cartão `4242 4242 4242 4242`. Aparelho em 360px nos
passos 2 e 7.

1. **Nada muda para quem existe.** Entrar com `contas/mycookies`: o cardápio abre em `/c/mycookies`,
   "Quem te ajuda" convida, e nenhum dos dois painéis tem linha nova. É `livre`.
2. **O teste abre tudo, e diz.** `/cadastro` com o primeiro e-mail. Em `/configuracao`, os dois
   painéis com "No teste está aberto. Depois, é do plano completo." Abrir o cardápio com um produto,
   convidar o segundo e-mail. `/c/{contaId}` abre. A ajudante entra e salva um material.
3. **Os preços.** `/assinatura`, a 360px: "Por ano" marcado, dois cartões com os valores do painel
   do Stripe, a economia do anual em cada um, "Sem cardápio e sem ajudante" no essencial. Trocar
   para "Por mês": os valores mudam, a linha da economia some.
4. **Assinar o essencial.** "Essencial", anual → checkout com o preço certo → `/`. `stripe listen`:
   `created` com 200. Firestore: `pacote: "ESSENCIAL"`; o membro da ajudante com `removidaEm`.
   Authentication: a claim da ajudante **sem** a conta em `contas` e em `acessoAte`; a da dona com
   o prazo novo. `/c/{contaId}` em janela anônima, depois de 60 s: não encontrado. Um
   `POST /api/cardapio/pedido` à mão: `fechado`.
5. **A metadata.** No painel do Stripe, conferir que o produto essencial **não** tem `metadata.pacote`
   e o completo tem `COMPLETO`, maiúsculo. Esse é o passo que, errado, tira ajudante de quem paga.
6. **A ajudante tirada.** No aparelho da ajudante, recarregar (ou esperar o token renovar):
   "Este login ainda não abre nenhuma conta". Nenhuma escrita pendente perdida sem aviso.
7. **Os painéis fechados, a 360px.** "Seu cardápio": legenda "No plano completo" com o cadeado; o
   painel com o triângulo, "Seu cardápio saiu do ar…" e "Mudar para o completo", sem nenhum
   controle de edição. "Quem te ajuda": a explicação com a segunda frase (há membro removido) e o
   botão. Um convite por `curl` com o token da dona: 403 `sem-pacote`.
8. **Subir pelo portal.** "Mudar para o completo" → portal → "Atualizar plano" → o completo anual.
   `stripe listen`: `updated` com 200. Firestore: `pacote: "COMPLETO"`. Em até 60 s, `/c/{contaId}`
   volta **com os mesmos produtos, limitados e promoções** de antes. "Quem te ajuda" abre o
   formulário; a ajudante não voltou sozinha; reconvidar funciona e ela entra.
9. **Descer no fim do período.** No portal, voltar para o essencial: o Stripe agenda. `stripe
listen` pode mandar `updated` com o agendamento; Firestore continua `COMPLETO` e a ajudante
   continua. Com um **test clock** avançando até o fim do período: `updated` → `ESSENCIAL` → a
   ajudante tirada, o cardápio fora.
10. **Cancelar não tira.** Numa conta completa com ajudante, cancelar imediatamente pelo painel:
    `deleted` → a claim da ajudante com `acessoAte` = agora, **sem** `removidaEm` no membro; ela
    vê "O acesso a este negócio está suspenso". Assinar o completo de novo: ela volta sem convite.
11. **Produto desconhecido.** No painel, um terceiro produto sem `metadata`, e uma assinatura de
    teste nele com `subscription_data.metadata` de uma conta (pelo `stripe` CLI): o webhook grava
    `ESSENCIAL`. É o `#d169` errando para menos.
12. **Sem os preços novos.** Sem `STRIPE_PRICE_COMPLETO_ANUAL` no `.env.local`: `/assinatura` diz
    "A assinatura ainda não está configurada neste servidor", e o resto do app abre.

---

## Critérios de aceite

- [ ] `Conta.pacote?: Pacote` existe; `ClaimDaConta` e `firestore.rules` intactos (`git diff firestore.rules`
      vazio); `package.json` intacto; nenhuma rota nova em `build`.
- [ ] `permite` e `pacoteDaMetadata` testados como a 3.2 diz; `situacaoDaConta` devolve `pacote` no
      assinante, essencial quando ausente; `domain/assinatura.ts` continua sem Firebase, React ou
      `stripe`.
- [ ] `montarCardapio` devolve `null` para assinante do essencial e do assinante sem `pacote`, e o
      cardápio para teste, livre e completo — testado.
- [ ] `POST /api/conta/membros` responde 403 `sem-pacote` para assinante do essencial; o `DELETE`
      não tem portão.
- [ ] Webhook: relê com `expand`, grava `pacote`; com assinatura viva do essencial, tira toda
      ajudante ativa (claim antes de `removidaEm`) e não escreve `acessoAte` para ela; com
      assinatura cancelada, escreve `acessoAte` para todas e não tira ninguém; claim antes do
      documento, como na 028.
- [ ] `stripeDisponivel()` exige os quatro preços; `checkout` recebe `pacote`; `precos` devolve os
      dois pacotes.
- [ ] `/assinatura`: período em rádio nativo com "Por ano" marcado, dois cartões por pacote, o
      essencial primário, "Sem cardápio e sem ajudante" em texto; o assinante vê o nome do pacote.
- [ ] Os dois painéis nos três casos da tabela da 3.6; o fechado não mostra controle de edição e
      não escreve; ícone e texto em todo estado fechado.
- [ ] Toque de 44px nos rádios, 52px nos cartões e no "Mudar para o completo"; `role="alert"` nos
      erros.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d167`–`#d170` escritos; `#d112` e `#d155` anotados; `ESTADO.md`, `ROADMAP.md`, `DEPLOY.md` e
      `.env.local.example` atualizados.
- [ ] **Portão do deploy, fora da sessão:** o passo 5 do roteiro no painel ao vivo, antes do
      primeiro cliente de verdade no completo; o parágrafo dos dois planos em `/termos`.

---

## Fora de escopo

- **Limite de fichas, pedidos, materiais ou qualquer coisa contada.** `#d112` e o `CLAUDE.md` §4.
  O agregado é escrito no aparelho (`#d10`), e nenhum número dele decide cobrança.
- **Um terceiro pacote, ou recurso avulso ("só o cardápio").** Dois pacotes são uma escolha; três
  são uma tabela de comparação. Se um dia houver, `RECURSOS_DO_PACOTE` ganha uma linha e o Stripe
  um produto.
- **Preço por ajudante** (quantidade no `line_item`). `LIMITE_DE_AJUDANTES` continua freio e não
  produto (`030`, Fora de escopo).
- **Avisar no checkout o que ela vai perder.** "Você tem o cardápio aberto e uma ajudante; no
  essencial, os dois saem" pediria a `/assinatura`, fora do shell, ler a configuração e os membros.
  O cartão diz o que o essencial não tem, e os painéis disseram o teste inteiro. Se a gravação
  mostrar alguém surpreso, é aqui que entra.
- **O portão na foto e na vitrine do cardápio.** `lerFotoDoCardapio` e `lerImagemDaVitrine` não
  leem a conta, e a conta vencida já tem o mesmo buraco: quem guardou a URL de uma foto a vê. Sem a
  página, ninguém acha a URL. Uma leitura a mais por imagem não cacheada, quando isso importar.
- **Devolver a ajudante sozinha ao subir de pacote.** O espelho sabe quem foi tirada, mas não por
  quê — pela dona ou pelo pacote. Um campo `removidaPor` distinguiria; a dona reconvidar é um
  toque, e ela sabe quem quer de volta.
- **O deep link do portal direto para "Atualizar plano"** (`flow_data.type = "subscription_update"`).
  O portal comum mostra o botão; um parâmetro na rota do portal quando a conversão pedir.
- **Cupom, código de parceira, trial no completo depois do teste.** Como na 028.
- **Pacote na claim, ou regra de segurança lendo pacote.** `#d167`: os dois upsells já passam pelo
  servidor. Se um terceiro recurso morar só no cliente e no Firestore, a regra entra com ele.
- **Migrar contas `livre` para um pacote.** Cortesia é tudo (`#d168`).

---

## Decisões desta spec que são fáceis de rejeitar

- **O teste é o completo.** Podia ser o essencial, com os dois painéis mostrando "assine o completo"
  desde o dia 1. Mas então ninguém experimenta o cardápio antes de pagar mais por ele, e a
  confeiteira que decide pelo completo decide às cegas. O custo é o susto de quem abriu o cardápio
  no teste e assina o essencial — e os painéis avisam o teste inteiro.
- **Tirar a ajudante, e não só parar de renovar.** Parar de renovar é zero escrita nova no webhook,
  mas a ajudante continuaria com a tela aberta até o prazo velho e depois salvaria calada contra
  `permission-denied`. Tirar é a mesma escrita que o `DELETE` já faz, e ela cai numa tela que diz o
  que aconteceu.
- **O pacote pela `metadata` do produto, e não pelo id do preço.** Uma variável de ambiente a menos
  para comparar, e à prova de mudança de preço. O custo é a `metadata` escrita à mão uma vez no
  painel — o passo 5 do roteiro existe para ela.
- **O essencial é o botão primário.** Podia ser o completo (o mais caro, o que rende mais). Mas o
  roadmap vende a frase do preço, e empurrar o pacote maior na tela em que ela decide pagar é o tipo
  de coisa que o `PRODUCT.md` recusa. Se o dado mostrar que quem assina o essencial volta pedindo o
  cardápio, a troca é uma prop.
- **O período em rádio, e não quatro cartões.** Quatro cartões de 52px empilhados em 360px são uma
  tela e meia para uma decisão. O rádio separa as duas perguntas.
- **Os nomes "Essencial" e "Completo".** São de quem conduz o projeto, e mudar é uma constante
  (`NOME_DO_PACOTE`) e o nome do produto no Stripe. A spec não inventa um nome de confeitaria para
  um plano de software.
- **`past_due` conta como viva.** Uma dona do essencial com o cartão recusado ainda tem a semana de
  folga da 028; nesse tempo a ajudante que ela não deveria ter continua tirada. O contrário (não
  tirar em `past_due`) deixaria uma brecha: descer de pacote e não pagar.

---

## Riscos

- **A `metadata` errada tira ajudante de quem paga o completo.** É o único erro desta spec que
  mexe no acesso de uma pessoa que não fez nada. O `#d169` escolheu errar para menos, e o passo 5
  do roteiro confere antes do primeiro cliente. O desfazer é corrigir a `metadata`, reenviar o
  último evento pelo painel (o webhook regrava `COMPLETO`) e a dona reconvidar.
- **Uma dona que desce e sobe no mesmo dia** perde as ajudantes e precisa reconvidá-las. Aceito:
  descer é um ato dela, no portal, com o cartão do essencial dizendo "sem ajudante".
- **O portal sem "switch plans" ligado.** "Mudar para o completo" abre um portal sem a opção, e a
  dona fica sem caminho para subir. `DEPLOY.md` põe no passo único; o passo 8 do roteiro prova.
- **A 028 publicada antes da 032.** Se a 028 for ao ar com um pacote só e a 032 vier depois,
  `stripeDisponivel()` passa a exigir as duas variáveis novas no dia do deploy da 032: sem elas,
  ninguém consegue assinar. A ordem do `DEPLOY.md` (painel → variáveis → app) cobre; e quem assinou
  pela 028 fica sem `pacote`, que é essencial — o único que ela podia ter comprado.
- **Nenhum cliente pagante ainda.** O risco maior não é técnico: é precificar dois pacotes sem
  saber se alguém paga o primeiro. É o gatilho do cabeçalho, e a razão de esta spec ficar no
  arquivo até alguém pagar.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado. Mais o roteiro, com o passo 1 provando que nenhuma conta de hoje muda e o passo 5
conferindo a `metadata` antes de qualquer cliente. Com esta spec o `#d112` fecha: dois pacotes, o
portão onde o dado já passava, e nenhuma linha de regra nem de permissão por tela.
