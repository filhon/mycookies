# Spec 027 · Criar a conta sozinha

**Tipo:** a primeira spec da fase 2 do `docs/saas/ROADMAP.md` — a porta. Uma tela nova
(`/cadastro`), a segunda rota de servidor do sistema (`POST /api/conta`, irmã de `/api/nota`),
duas páginas estáticas (`/termos` e `/privacidade`), um módulo puro pequeno
(`domain/cadastro.ts`), **quatro campos opcionais em `Conta`**, e duas linhas de cópia
(o login e a tela "sem conta"). **Nenhuma regra, nenhum índice, nenhuma dependência, nenhuma
mudança em `conceder-acesso.mjs`.**
**Tamanho:** uma sessão. O que pesa é o caminho que dá errado no meio — login criado, conta não
— e garantir que ele termina no mesmo lugar do caminho que dá certo. O texto dos termos e da
privacidade **não** é desta sessão: é de quem conduz o projeto, e é o portão do deploy.
**Origem:** o roadmap (fase 2, 027) e `#d16`, que desde o Módulo 0 diz que "tela de cadastro"
não é uma tela: é código de servidor que emite a claim. O servidor existe desde a 6A
(`firebaseAdmin.ts`, `/api/nota`); o que falta é o handler que `#d16` prometeu.
**Depende de:** o gatilho da fase 2 — a fase 1 fechada com três contas ativas e a frase do
preço confirmada nas entrevistas. **Em 2026-09-19 nem as entrevistas rodaram.** A spec fica
escrita por pedido; a sessão roda quando quem conduz o projeto decidir, como a 024, a 025 e a
026 rodaram antes da vez. O que não pode acontecer é publicar `/cadastro` antes de a fase 0
passar no teste: uma porta aberta para um produto que a usuária 0 não operou sozinha é o beta
medindo abandono (roadmap, decisão quatro).
**Aprovações pedidas:** **schema aditivo em `Conta`** — `plano`, `status`, `trialAte` e
`termosAceitosEm`, os quatro opcionais, os que o comentário de `conta.ts` reserva desde o
Módulo 0. Regras não mudam: o handler escreve com o Admin SDK, e quem tem claim já lê e escreve
o documento da conta. **Três decisões a registrar**, `#d141` (a conta nasce no servidor, uma
por login, e o handler garante em vez de criar), `#d142` (o cadastro pede o mínimo e cai em
`/fichas`) e `#d143` (o cadastro diz que o e-mail já existe; a recuperação de senha não).

---

## Problema

A segunda conta entra por `node` (`#d16`, `#d111`, spec 022). Isso serviu para o beta fechado
e deixa de servir no dia em que uma confeiteira que ninguém convidou chega ao app por um link —
o de uma professora de confeitaria, o de um grupo, o de um post sobre precificação (roadmap,
seção 4). O que ela encontra hoje é `/login` dizendo "Só entra quem foi convidada". É a porta
certa para o beta e a errada para o produto.

O que existe e o que falta, de ponta a ponta:

1. **O login nasce no aparelho** — `signInWithEmailAndPassword` está lá; `createUser…` é o
   irmão dele no mesmo SDK, e não há nada a instalar.
2. **A conta e a claim nascem só no servidor.** É o `#d07` e o `#d16`: custom claim só se
   escreve com o Admin SDK, e é isso que faz a regra custar zero leitura. O servidor existe —
   `src/lib/server/firebaseAdmin.ts` confere token e `/api/nota` é o padrão de rota — mas nada
   nele escreve no Firestore ainda. `conceder-acesso.mjs` faz exatamente o que o handler precisa
   fazer, do lado de fora.
3. **`reconferirAcesso()` já traz a claim sem sair** (spec 000, `layout.tsx`). O cadastro não
   precisa de "saia e entre de novo".
4. **A conta nova tem para onde cair**: a 018 e a 019 fizeram `/fichas` vazio ter o botão
   "Começar com o que toda cozinha tem" e o passo 1 do caminho ser "ver quanto custa um cookie".
5. **`Conta` não sabe se é trial.** O comentário de `conta.ts` reserva `plano`, `status` e
   `trialAte` "quando existir cobrança". A cobrança é a 028; o trial começa aqui, porque é o
   cadastro que abre o relógio.
6. **Não há termos nem privacidade.** Não é jurídico esta spec; é que uma conta que qualquer
   pessoa cria sem conversar com ninguém precisa de um lugar onde esteja escrito o que o sistema
   faz com o que ela digita, e a caixa que diz que ela leu.

**O que esta spec entrega:** `/cadastro` criando o login no aparelho e pedindo ao servidor que
abra a conta; `POST /api/conta` fazendo o que o script faz, com trial de 14 dias e o aceite dos
termos gravado; a conta nova caindo em `/fichas` com o botão da biblioteca na frente; `/termos`
e `/privacidade` com o lugar do texto; o login com a porta nova; e o caminho que dá errado no
meio terminando no mesmo lugar.

**O que esta spec não entrega:** o fim do trial, a assinatura e a faixa "seu teste acaba em N
dias" (028); exportar e encerrar (029); ajudante e segundo negócio no mesmo login (030); e-mail
de verificação (o trial é o portão, roadmap); login com Google. O script continua valendo para
liberar à mão, e não muda uma linha.

---

## O que sai da frente de quem está começando (`#d113`)

- **Sai** a frase "Só entra quem foi convidada" e, com ela, o caminho de três pessoas —
  mandar mensagem para quem conduz o projeto, esperar o script rodar, receber o link de senha —
  que era a única porta.
- **Entra** um formulário com três campos obrigatórios, um opcional e uma caixa, **antes** do
  primeiro preço. É o custo de a porta existir, e a spec o paga pelo menor: nada de confirmar a
  senha, nada de telefone, nada de CPF/CNPJ, nada de "como conheceu", nada de e-mail de
  verificação entre ela e o produto. O relógio da fase 0 — dez minutos até o preço, zero
  perguntas em voz alta — passa a contar **do cadastro**, e não da tela Hoje.

---

## 1 · O que esta spec decide

### A conta nasce no servidor, uma por login, e o handler garante em vez de criar — `#d141`

`POST /api/conta` é `conceder-acesso.mjs` na forma de rota: confere o token, e para o `uid`
dele **garante** que existe uma conta e uma claim. Garantir, e não criar, porque o caminho que
dá errado no meio é real: o login nasceu no aparelho, o `POST` caiu (rede, cold start, aba
fechada), e ela volta — pelo botão "Tentar de novo" da própria tela, ou dias depois entrando
com o e-mail. Toda volta bate na mesma rota, e a rota faz de novo só o que faltou:

1. **Que conta é a dela?** A primeira chave de `customClaims.contas` no servidor
   (`auth.getUser(uid)`, e não o token: o token que ela carrega pode ter sido cunhado antes da
   claim). Sem chave, um id novo: `randomUUID()` sem hífens — minúsculas e números, o que a
   validação de `conceder-acesso.mjs` já aceita, para o dia em que o script precisar tocar numa
   conta que nasceu aqui.
2. **O documento existe?** `contas/{id}` — se não, `set` com `nome`, `proprietaria`,
   `criadaEm`, `plano: "TRIAL"`, `status: "ATIVA"`, `trialAte`, `termosAceitosEm`, `v`.
3. **A claim aponta?** Se não, `setCustomUserClaims` preservando o que já havia, como o
   script. **Documento antes da claim, na ordem do script**, de propósito: a claim é o que põe
   ela dentro do app, e só pode existir quando o documento já existe (ver Riscos).

Duas chamadas ao mesmo `POST` produzem uma conta, e a resposta é sempre `{ contaId }`. Um
login que já abre uma conta — convidada pelo script que resolveu "se cadastrar" — recebe a
conta que já tem, e nada é escrito. **Uma conta por login** é o que esta spec sabe fazer; a
pessoa com dois negócios é a 030, no ponto único que `contaAtivaDaClaim` já nomeia.

**Os quatro campos são opcionais no tipo, e ausência tem significado:** conta sem `plano` é
conta liberada à mão — `contas/mycookies`, as do beta, qualquer uma que o script criar daqui em
diante — e **não tem prazo**. O script não passa a escrever `plano: "CORTESIA"` nem nada
parecido: seria inventar um valor para dizer o que a ausência já diz, e `contas/mycookies` não
seria migrada de qualquer jeito. A 028 lê `trialAte` ausente como "nunca vence", que é
exatamente o que a conta da usuária 0 e as do beta precisam ser.

### O cadastro pede o mínimo e cai em `/fichas` — `#d142`

E-mail, senha, **seu nome** (obrigatórios) e **nome do negócio** (opcional: "Se ainda não tem,
deixe em branco" — vira o nome dela). O nome dela alimenta a saudação da tela Hoje
(`conta.proprietaria`); o do negócio só é lido como reserva por `/configuracao` e pela folha do
orçamento (`orcamento.ts:194`), e o passo 3 do caminho é onde ela o acerta. Sem confirmar senha
(o navegador mostra o que ela digita, e "Esqueci minha senha" existe), sem telefone, sem
documento.

Depois do `POST`, `reconferirAcesso()` e `router.replace("/fichas")` — não `/`. A tela Hoje de
uma conta vazia é um painel em branco com um cartão apontando para `/fichas`; `/fichas` vazio é
o botão "Começar com o que toda cozinha tem", que é o passo 1 da 019 e o primeiro "ahá" da 018.
Cadastro e primeiro preço são a mesma sessão de uso (roadmap), e pular a tela Hoje é um toque a
menos entre os dois. A tela Hoje aparece na primeira volta, com o cartão do caminho já marcando
o passo 1 feito.

### O cadastro diz que o e-mail já existe; a recuperação de senha não — `#d143`

"Esqueci minha senha" responde a mesma frase existindo ou não o cadastro (login, `AVISO_ENVIO`):
quem pergunta pelo e-mail de outra pessoa não sai sabendo mais. O cadastro não tem como fazer o
mesmo: `auth/email-already-in-use` é a única resposta útil para quem já tem conta e esqueceu, e
esconder isso a deixaria presa num formulário que nunca conclui. A frase é "Esse e-mail já tem
conta. Entre com ele, ou toque em 'Esqueci minha senha' na tela de entrar." A assimetria é
deliberada e fica registrada: o que a recuperação protege, o cadastro cede, porque o Firebase
Auth já cede (a criação falha de qualquer jeito, e o código é público no SDK).

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` para `/cadastro`, `/termos` e
   `/privacidade`. `/cadastro` é a primeira tela que uma desconhecida vê; é onde uma frase a
   mais é um formulário a mais.
2. **Console do Firebase → Authentication → Settings → User actions:** conferir que "Enable
   create (sign-up)" está ligado. Se estiver desligado — plausível num projeto que só teve
   conta por script —, `createUserWithEmailAndPassword` devolve `auth/admin-restricted-operation`
   e nenhuma linha de código conserta. Anotar o estado no `ESTADO.md`.
3. Ler `/api/nota/route.ts` e `firebaseAdmin.ts` inteiros: a ordem "credencial → token → corpo"
   e o motivo de cada `falha(...)` são o molde do handler novo. E `conceder-acesso.mjs`, que é o
   corpo dele.
4. `rg -n "convidad" src/` — os dois lugares que presumem convite: o login (muda) e a tela "sem
   conta" (ganha uma linha, e continua servindo à convidada).

---

## 3 · Escopo

### 3.1 `Conta` — `src/lib/types/conta.ts`

```ts
/** A 028 acrescenta a assinatura; a 029, o encerramento. */
export type PlanoDaConta = "TRIAL";
export type StatusDaConta = "ATIVA";

export interface Conta {
  // … o que já existe …
  /**
   * Os quatro são gravados pelo cadastro (`/api/conta`, spec 027) e **ausentes
   * numa conta liberada à mão** pelo script — que não tem prazo nem cobrança.
   * Ausência é significado, não dado velho (`DECISOES.md#d141`).
   */
  plano?: PlanoDaConta;
  status?: StatusDaConta;
  /** Fim do teste grátis. Ausente = não vence. */
  trialAte?: Timestamp;
  termosAceitosEm?: Timestamp;
}
```

O comentário do cabeçalho ("`plano`, `status` e `trialAte` entram quando existir cobrança")
sai: entraram.

### 3.2 O domínio — `src/lib/domain/cadastro.ts`

Puro, testado, o que o handler e a tela compartilham:

```ts
export const DIAS_DE_TESTE = 14;
export const TAMANHO_MAXIMO_NOME = 80;

/** 14 × 24 h depois de `inicio`. Como mostrar "faltam N dias" é da 028. */
export function fimDoTeste(inicio: Date): Date;

/** O corpo do POST. `termos` é `literal(true)`: a caixa desmarcada não é um corpo válido. */
export const esquemaCadastro = z.object({
  nome: z.string().trim().min(1).max(TAMANHO_MAXIMO_NOME),
  negocio: z.string().trim().max(TAMANHO_MAXIMO_NOME).optional(),
  termos: z.literal(true),
});
export type Cadastro = z.infer<typeof esquemaCadastro>;

/** `negocio` vazio vira o nome dela. */
export function nomeDoNegocio(cadastro: Cadastro): string;

export type FalhaCadastro =
  | "sem-acesso" // token ausente ou inválido
  | "fora-de-forma" // corpo que não passa em `esquemaCadastro`
  | "sem-configuracao" // servidor sem credencial
  | "sem-resposta" // 5xx, timeout
  | "sem-rede";

export const MENSAGEM_FALHA_CADASTRO: Record<FalhaCadastro, string>;
```

`zod` já é dependência (`notaFiscal.ts`). Testes em `tests/domain/cadastro.test.ts`: o fim do
teste cai 14 dias depois, o esquema recusa `termos: false` e nome vazio, aceita `negocio`
ausente, e `nomeDoNegocio` cai no nome dela. Nada de Firebase, nada de React.

### 3.3 O servidor — `src/lib/server/firebaseAdmin.ts` e `src/app/api/conta/route.ts`

`firebaseAdmin.ts` passa a exportar `adminAuth()` e `adminDb()` (`getAuth(aplicativo())` e
`getFirestore(aplicativo())`); `conferirToken` usa o primeiro. É a primeira vez que o servidor
escreve no Firestore, e o comentário de cabeçalho ganha a frase: **só `/api/conta` escreve, só
no documento da conta e na claim, e nunca em dado de negócio** — o motivo é o mesmo de
`/api/nota` não gravar insumo: escrever do servidor é escrever por fora das regras.

`route.ts`, na ordem de `/api/nota`:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);
  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);

  const corpo = esquemaCadastro.safeParse(await comoJson(requisicao));
  if (!corpo.success) return falha("fora-de-forma", 400);

  const contaId = await garantirConta(quem.uid, corpo.data);
  return NextResponse.json({ contaId });
}
```

`garantirConta` é os três passos do `#d141`, com o `Timestamp` de `firebase-admin/firestore`
(`Timestamp.now()`, nunca `serverTimestamp` — a invariante vale no servidor também, pela forma
do dado). O caminho vem de `caminhos.conta(contaId)` de `@/lib/types`: a rota está dentro do
app e não tem a desculpa do script. `PAPEL = "DONA"`, com o comentário apontando para
`ContasDaClaim`. `proprietaria` recebe `nome`; `nome` recebe `nomeDoNegocio(corpo.data)`.

Sem `abreAConta`: é a única rota em que quem chama, por definição, ainda não abre conta
nenhuma. O `uid` verificado é a autorização inteira, e o que ele autoriza é a própria conta.

### 3.4 A tela — `src/app/(auth)/cadastro/page.tsx`

A mesma moldura do login — painel de marca à esquerda no desktop, logotipo em cima no celular
— extraída para `src/components/auth/MolduraDeEntrada.tsx` (`titulo`, `descricao`, `children`)
e usada pelas duas páginas. É JSX que existiria duas vezes, e a 028 tem uma terceira tela cheia
(conta vencida).

**Título:** "Criar minha conta". **Descrição:** "Catorze dias grátis, sem cartão. Primeiro
preço em dez minutos."

**Campos**, `Campo` de `ui/`, nesta ordem: E-mail (`autoComplete="username"`), Senha
(`autoComplete="new-password"`, `minLength={6}` — o mínimo do Firebase — sem barra de força),
Seu nome (`autoComplete="name"`), Nome do negócio (opcional, com a ajuda "Se ainda não tem,
deixe em branco"). Depois, a caixa: `<input type="checkbox">` nativa, o padrão de
`BlocoCaixa.tsx:72`, rótulo "Li e aceito os **termos de uso** e a **política de privacidade**",
os dois em `<a target="_blank" rel="noopener">` para não perder o formulário. A linha inteira
tem 44px; a caixa é `size-5` como a de `BlocoCaixa`.

**Botão:** "Criar conta", `primaria`, `lg`, `larguraTotal`, desabilitado até e-mail, senha,
nome e caixa; `carregando` durante os dois passos. Abaixo: "Já tem conta? **Entrar**" (`Link`
para `/login`, terciário).

**O envio**, em `aoEnviar`:

```ts
const auth = obterAuth();
if (!auth.currentUser) {
  await createUserWithEmailAndPassword(auth, email.trim(), senha);
}
const token = await auth.currentUser!.getIdToken();
const resposta = await fetch("/api/conta", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ nome, negocio, termos }),
});
if (!resposta.ok) throw await codigoDaFalha(resposta); // o padrão de TelaNota.tsx:571
await reconferirAcesso();
router.replace("/fichas");
```

**Os dois estados da tela**, e é isto que torna o caminho errado igual ao certo:

- **Sem `usuario`:** o formulário inteiro.
- **Com `usuario` e sem `contaId`:** o mesmo formulário **sem e-mail e senha**, com a linha
  "Você entrou como {email}. Falta só dizer o seu nome." É o que aparece quando o `POST` caiu e
  ela toca em "Tentar de novo" (o próprio botão, agora com esse nome), quando ela recarrega a
  página, e quando volta dias depois pela tela "sem conta". O `if (!auth.currentUser)` acima é
  o mesmo `if` desta bifurcação.
- **Com `contaId`:** `router.replace("/")`, como o login faz — não há o que cadastrar.

**Erros**, num `<p role="alert">` como no login: os do Firebase passam por `traduzirErroAuth`
com a reserva "Não foi possível criar a conta. Tente de novo."; `MENSAGENS` do `AuthProvider`
ganha `auth/email-already-in-use` (`#d143`) e `auth/weak-password` ("A senha precisa ter pelo
menos 6 caracteres."). Os do `POST` vêm de `MENSAGEM_FALHA_CADASTRO`; `sem-rede` é
`TypeError` do `fetch`, como em `TelaNota`. Em todo erro do `POST` o login já existe, e a tela
está no segundo estado: o botão diz "Tentar de novo" e nenhum campo já preenchido some.

Sem `useGuardaDeSaida`: não há nada salvo a perder.

### 3.5 `/termos` e `/privacidade` — `src/app/(auth)/termos/page.tsx` e `…/privacidade/page.tsx`

Server components estáticos, sem `"use client"`: `<main>` com `Logotipo`, `<h1>`, a data
("Vigente desde …"), as seções, e um `Link` "Voltar" ao pé — sem a moldura de entrada, porque é
texto para ler e não formulário. Largura de leitura (`max-w-[64ch]`), `text-body`, tokens de
`globals.css`, os dois temas.

**A spec entrega os títulos; o texto é de quem conduz o projeto**, e cada parágrafo nasce como
`[texto de quem conduz o projeto]` — visível de propósito, para que o aceite seja
`rg -n "\[texto" src/app` vazio antes do deploy. As seções, para que a sessão não invente:

- **Termos:** quem presta o serviço; o que o Rende é (e o que não é: não é contador, e o preço
  sugerido é sugestão); a conta, a senha e a responsabilidade por elas; o teste grátis de
  catorze dias e o que acontece depois (hoje: nada — a 028 reescreve o parágrafo); os dados são
  dela (exportar e encerrar, 029); encerramento por qualquer lado; mudanças nos termos; foro.
- **Privacidade (LGPD, art. 9):** quem controla e como falar com ele; o que é coletado (e-mail,
  nome, e tudo o que ela digita: insumos, produtos, pedidos, clientes, caixa); para quê; quem
  opera (Google Firebase para login e dados, Vercel para o servidor, Google Gemini para a foto
  da nota — que é lida e descartada, `/api/nota`); por quanto tempo; os direitos do art. 18;
  que não há cookie de rastreamento (a sessão mora no IndexedDB do Firebase Auth); mudanças.

### 3.6 O login e a tela "sem conta"

- **`login/page.tsx:113`:** "Só entra quem foi convidada. Na primeira vez, toque em 'Esqueci
  minha senha' para criar a sua." **sai.** No lugar, abaixo de "Esqueci minha senha", a linha
  "Ainda não tem conta? **Criar minha conta**" (`Link` para `/cadastro`). A convidada pelo
  script continua sendo instruída pelo script — a frase que o script imprime já diz "toque em
  'Esqueci minha senha'", e é o WhatsApp de quem convida que a leva; a tela deixa de repetir.
- **`(app)/layout.tsx`, a tela "sem conta":** continua a mesma para a convidada, e ganha uma
  linha abaixo de "Já liberaram meu acesso": "Acabou de se cadastrar? **Terminar o cadastro**"
  (`Link` para `/cadastro`, terciário). É a terceira porta do segundo estado da 3.4.

### 3.7 Documentação

- `#d141`, `#d142` e `#d143` em `docs/DECISOES.md`; `#d16` ganha a nota "cumprida na 027: o
  handler existe, o script continua para liberar à mão".
- `docs/ESTADO.md`: a seção da 027, a linha na tabela de módulos, o estado de "Enable create
  (sign-up)" no console, e a próxima ação (o texto dos termos é o portão do deploy; depois, 028).
- `docs/saas/ROADMAP.md`: a 027 marcada como entregue, com o que a spec mudou do que ele previa
  (o script não vira handler, é copiado; os campos são opcionais e ausência é "liberada à mão";
  a conta cai em `/fichas`).
- `docs/DEPLOY.md`: nenhuma variável nova; a nota do console (passo 2 da seção 2).

---

## Roteiro de navegador

Precisa do projeto de verdade (`FIREBASE_SERVICE_ACCOUNT` ou `GOOGLE_APPLICATION_CREDENTIALS`
no `.env.local`), de **dois e-mails sem login** e de um cronômetro. Aparelho em 360px nos passos
3 e 4.

1. **Console.** "Enable create (sign-up)" ligado (seção 2, passo 2).
2. **`/login`, deslogada.** "convidada" não aparece; "Ainda não tem conta? Criar minha conta"
   leva a `/cadastro`.
3. **`/cadastro` a 360px.** Quatro campos e a caixa; "Criar conta" desabilitado até os três
   obrigatórios e a caixa; os dois links da caixa abrem `/termos` e `/privacidade` em aba nova
   sem perder o que foi digitado. Tema claro e escuro.
4. **De ponta a ponta, cronômetro ligado.** E-mail novo, senha, nome, negócio em branco →
   "Criar conta" → cai em `/fichas` vazio com "Começar com o que toda cozinha tem" → toque →
   produto-modelo com o preço no rodapé. **Anotar o tempo do "Criar conta" ao preço.** No
   console do Firestore: `contas/{id}` com os nove campos, `nome` igual ao nome dela, `trialAte`
   catorze dias à frente; no Authentication, a claim `{ contas: { [id]: "DONA" } }`. Tela Hoje:
   "Bom dia, {nome}" e o cartão do caminho com o passo 1 feito.
5. **`npm run metricas`.** A conta nova é uma linha, criada hoje, "1º produto" hoje, "1º próprio"
   em "—".
6. **E-mail que já existe.** `/cadastro` com o e-mail do passo 4 (deslogada): a frase do
   `#d143`. Senha de 4 caracteres: a frase de senha curta. Sem rede (DevTools Offline): a frase
   de `auth/network-request-failed`.
7. **O meio do caminho.** DevTools → Network → bloquear `/api/conta`. Segundo e-mail novo →
   "Criar conta": o login nasce, o `POST` falha, a tela vira o segundo estado ("Você entrou
   como …"), com nome preenchido e o botão "Tentar de novo". Desbloquear → "Tentar de novo" →
   `/fichas`. Firestore: **uma** conta para esse uid.
8. **O meio do caminho, dias depois.** Repetir o bloqueio com um terceiro e-mail; fechar a aba
   no erro; abrir `/`: a tela "sem conta" com "Terminar o cadastro" → `/cadastro` no segundo
   estado → nome → "Tentar de novo" → `/fichas`. Depois, `/cadastro` de novo: cai em `/`.
9. **Idempotência à força.** Com a conta do passo 4 logada, no console do navegador, dois
   `fetch("/api/conta", …)` seguidos com o token de `currentUser.getIdToken()`: as duas
   respostas trazem o mesmo `contaId`, e o Firestore não ganhou documento.
10. **Sem token.** `curl -X POST /api/conta` sem cabeçalho: 401 `{ erro: "sem-acesso" }`. Com
    token e `termos: false`: 400 `{ erro: "fora-de-forma" }`.
11. **A convidada continua entrando.** `npm run conceder-acesso -- quarto@exemplo.com
conta-x`, "Esqueci minha senha", o link, entrar: tela Hoje. `contas/conta-x` **sem**
    `plano`, `status`, `trialAte`, `termosAceitosEm` — e `contas/mycookies` intocada.
12. **Sair e voltar.** Sair da conta do passo 4 (`/configuracao` → Sair), entrar de novo: tela
    Hoje normal, e não `/cadastro`.
13. **`/termos` e `/privacidade`**, deslogada, 360px, os dois temas: legíveis, "Voltar" leva a
    `/login`, e `rg -n "\[texto" src/app` é a lista do que ainda falta escrever.

---

## Critérios de aceite

- [ ] `Conta` ganha `plano?`, `status?`, `trialAte?`, `termosAceitosEm?`; `PlanoDaConta` e
      `StatusDaConta` com um valor cada; nenhum outro arquivo de `src/lib/types/` muda.
- [ ] `git diff firestore.rules firestore.indexes.json scripts/ package.json` vazio.
- [ ] `POST /api/conta`: 500 `sem-configuracao` sem credencial, 401 `sem-acesso` sem token
      válido, 400 `fora-de-forma` com corpo fora do esquema, 200 `{ contaId }` — e duas chamadas
      pelo mesmo login produzem **um** documento e a mesma resposta (passos 7 e 9).
- [ ] O documento criado tem `nome`, `proprietaria`, `criadaEm`, `plano: "TRIAL"`,
      `status: "ATIVA"`, `trialAte` = `criadaEm` + 14 dias, `termosAceitosEm`, `v`; a claim é
      `{ contas: { [contaId]: "DONA" } }`; `contaId` passa em `/^[a-z0-9][a-z0-9-]{1,62}$/`.
- [ ] `/cadastro` tem os dois estados da 3.4 e redireciona quem já tem conta; depois do
      cadastro a rota é `/fichas`, e o botão da biblioteca está na frente (passo 4).
- [ ] `rg -n "convidad" src/` devolve só a tela "sem conta" do `layout.tsx`.
- [ ] `/termos` e `/privacidade` existem, estáticas, com as seções da 3.5, alcançáveis
      deslogada; a caixa do cadastro é obrigatória e liga as duas.
- [ ] `tests/domain/cadastro.test.ts` cobre `fimDoTeste`, `esquemaCadastro` (recusa `termos:
false` e nome vazio) e `nomeDoNegocio`.
- [ ] `src/lib/domain/cadastro.ts` não importa Firebase nem React.
- [ ] Toque de 44px na linha da caixa e nos links; `role="alert"` nos erros; nenhum estado só
      por cor.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `build` lista `/cadastro`, `/termos` e
      `/privacidade` estáticas e `/api/conta` dinâmica.
- [ ] `#d141`–`#d143` escritos; `#d16` anotado; `ESTADO.md`, `ROADMAP.md` e `DEPLOY.md`
      atualizados. O tempo do passo 4 está no `ESTADO.md`.
- [ ] **Portão do deploy, fora da sessão:** `rg -n "\[texto" src/app` vazio.

---

## Fora de escopo

- **O fim do trial.** `trialAte` é gravado e ninguém o lê: sem faixa "seu teste acaba em N
  dias", sem tela de vencido, sem cron, sem `ativas` na claim. É a 028 inteira, e ela nasce com
  o campo já no lugar.
- **Migrar `contas/mycookies` e as contas do beta** para ter `plano`. Ausência é o dado
  (`#d141`).
- **`conceder-acesso.mjs`.** Não muda. Nem para escrever os campos novos, nem para virar
  importador do handler (ver "fáceis de rejeitar").
- **E-mail de verificação.** O trial é o portão (roadmap). Um e-mail errado é um login que ela
  não recupera; "Esqueci minha senha" com o certo cria outro, e a conta perdida fica vazia.
- **Login com Google, telefone, link mágico.** Um provedor; o segundo entra quando alguém
  pedir.
- **Versão dos termos** (`termosVersao`) e re-aceite quando o texto mudar. Um campo para um
  texto que ainda não existe. Quando os termos mudarem pela primeira vez, a 029 é a spec vizinha.
- **Exportar, encerrar, apagar** (029). **Ajudante, segundo negócio, seletor de conta** (030).
- **Trocar e-mail, tela de perfil, editar `proprietaria`.** `/configuracao` já edita o nome do
  negócio; o nome dela entra na saudação e mais nada.
- **App Check, captcha, limite de cadastros por IP.** O Firebase Auth já tem proteção contra
  abuso na criação de conta; o servidor escreve um documento por uid verificado. Quando houver
  cadastro de robô de verdade, App Check é uma linha no `client.ts` e outra no `firebaseAdmin`.
- **Coluna de trial em `metricas.mjs`.** O script lê `criadaEm`, e com o cadastro ela passa a
  ser o momento do cadastro — "dias até o 1º" vira a métrica de verdade sem tocar em nada.
- **Texto dos termos e da privacidade.** É de quem conduz o projeto; a spec entrega o lugar.

---

## Decisões desta spec que são fáceis de rejeitar

- **O script não vira o handler; o corpo é copiado.** O roadmap dizia "vira". O script roda com
  `node` fora do app e não importa TypeScript com alias `@/` (022 repetiu `contas/{contaId}` por
  isso). Node 24 já roda `.ts` sem loader, e `engines` diz `>=20`; o dia em que subir, vinte
  linhas de `garantirConta` podem ser importadas do script. Hoje são vinte linhas em dois
  lugares, com o comentário dizendo qual é o outro.
- **Campos opcionais, e ausência significa "liberada à mão".** A alternativa é obrigatórios,
  o script escrevendo `plano: "CORTESIA"` e uma migração de `contas/mycookies`. É um valor
  inventado para uma distinção que a ausência já faz, e a 028 lê `trialAte` ausente como "não
  vence" de qualquer jeito.
- **`/fichas` em vez de `/`.** Se a gravação da fase 0 mostrar que ela procura "onde estou"
  antes de "quanto custa", volta para `/` e o cartão do caminho faz o resto — é uma string.
- **Quatro campos, um opcional.** "Nome do negócio" podia sair inteiro: `conta.nome` é lido só
  como reserva. Fica opcional porque uma confeiteira que tem Instagram tem nome, e o campo custa
  um olhar; se a gravação mostrar hesitação nele, sai e `nome` vira o nome dela sempre.
- **Senha sem confirmação e sem barra de força.** Seis caracteres é o mínimo do Firebase; o
  campo mostra o que ela digita se ela quiser (`type="password"` com o olho do navegador). Uma
  política de senha é uma configuração do console, não código.
- **A caixa dos termos é obrigatória, e não "ao criar a conta você aceita".** O aceite
  implícito é uma linha de texto e nenhuma caixa. A caixa é o que faz `termosAceitosEm` ser um
  ato dela, e é o mínimo que a LGPD pede para um consentimento que se prova.
- **`garantirConta` e não `criarConta`.** Um `POST` que só cria falha na segunda vez, e a
  segunda vez é o caso normal de rede ruim. Idempotência aqui são três `if`s.
- **`randomUUID()` sem hífens como id.** `db.collection("contas").doc().id` é o padrão do
  Firestore, e tem maiúsculas — que `conceder-acesso.mjs` recusa. Um id que o script aceita
  vale mais do que um id no formato da casa.
- **Um formulário com dois estados, e não duas telas.** "Terminar o cadastro" podia ser
  `/cadastro/nome`. É a mesma tela com dois campos escondidos, e a mesma função de envio.

---

## Riscos

- **"Enable create (sign-up)" desligado no console.** É o passo 2 da seção 2, e o único que
  nenhum código resolve. Se estiver desligado, ligar antes do deploy e registrar.
- **A claim recém-emitida e o token no aparelho.** `reconferirAcesso()` força
  `getIdTokenResult(true)`, e o Admin SDK reflete `setCustomUserClaims` no próximo token
  cunhado; é o mesmo caminho de "Já liberaram meu acesso", que já rodou de verdade na 022. Se
  o `replace("/fichas")` chegar antes de `contaId` mudar, o layout mostra "sem conta" por um
  instante e se corrige sozinho; se ficar, é `await` faltando, não o Firebase.
- **O handler cai entre o documento e a claim.** A próxima chamada acha a claim vazia, gera
  outro id, e o primeiro documento fica órfão: sem claim ninguém o lê, e `metricas.mjs` o lista
  como conta sem login — lixo visível e inofensivo. A ordem inversa seria pior: uma claim sem
  documento põe ela **dentro** do app com `conta` nulo, `concluirPrimeirosPassos` falhando no
  `updateDoc`, e nenhuma tela que a mande de volta ao `POST`. Entre lixo e conta quebrada, lixo
  (`#d141`). Se os órfãos incomodarem, o id passa a ser derivado do `uid`, e a spec da vez diz
  como.
- **Cold start da rota no Vercel** durante o `POST`: o `fetch` sem timeout espera; a tela
  mostra `carregando`. Se passar de dez segundos com frequência, `AbortSignal.timeout` e
  `sem-resposta`, como `/api/nota`.
- **Cadastro em massa por robô.** Improvável antes de haver por que; a resposta está na lista
  de fora de escopo (App Check) e não exige mudar o handler.
- **O texto jurídico atrasa o deploy.** É o risco de verdade desta spec e não tem solução em
  código: `/cadastro` não publica com `[texto de quem conduz o projeto]` em `/termos`.
- **A fase 0 ainda não passou no teste.** Esta spec pode ser codificada e não publicada — o
  `Link` do login é o que abre a porta, e ele pode esperar num branch enquanto a gravação não
  acontece. O roadmap é claro sobre a ordem, e a spec não a muda.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com os passos 7 e 8 com a rota bloqueada e o 4 cronometrado — o
tempo do "Criar conta" ao preço é o número da fase 0 medido pela primeira vez a partir da porta,
e vai para o `ESTADO.md`. Com esta spec, `#d16` deixa de ser provisória: o endpoint que o script
antecipava existe. O que vem depois é a 028, que lê o `trialAte` que esta grava; antes dela, o
texto dos termos, e antes de tudo, a gravação.
