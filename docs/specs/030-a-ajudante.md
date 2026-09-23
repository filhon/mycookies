# Spec 030 · A ajudante

**Tipo:** a primeira spec da fase 3 do `docs/saas/ROADMAP.md` — o primeiro segundo login numa
conta. O `#d14` reservou o lugar ("uma ajudante, um contador, um segundo negócio passam a ser
mais um par no mapa") e deixou três coisas por fazer: o vocabulário de papel, a regra que o
confere e o convite. Esta spec faz as três, e mais nada.
**Tamanho:** duas sessões. A **A** é a chave — o papel na claim, `firestore.rules` reescrita por
coleção, a rota de convidar e tirar, a subcoleção `membros`, e os dois handlers que já existem e
passam a percorrê-la (o webhook do Stripe e o encerrar da 029). A **B** é o app da ajudante — o
que some da tela de quem não é dona, e o painel em `/configuracao` de onde a dona convida.
**As duas saem no mesmo deploy:** entre elas existe papel que a regra recusa e tela que não
sabe disso, e o resultado é escrita negada em silêncio (`#d80`), que é exatamente o que uma
ajudante não pode encontrar no primeiro dia.
**Origem:** roadmap, fase 3, 030. O gatilho de lá é **cliente pagante pedindo**, e ele não
aconteceu: esta spec está escrita antes do caso, como a 027 esteve. Escrever agora é barato e
serve de prova de que o `#d14` aguenta o segundo login; **implementar sem o caso real não é.**
Quem abrir esta spec para codificar confere primeiro se a pergunta "minha ajudante pode entrar
também?" já foi feita por alguém que paga. Se não foi, fecha o arquivo.
**Depende de:** a 027, a 028 e a 029 codificadas (estão). `escreverAcessoAte` (028), o mapa
`acessoAte` na claim (`#d144`), `abreAConta` (027), `POST /api/conta/encerrar` (029) e o
`Painel` são o que esta spec usa. Nada do beta precisa ser migrado: conta sem ajudante não
ganha documento nenhum.
**Aprovações pedidas:** (1) **mudança nas regras de segurança** — a regra passa a conferir o
papel, e a recursiva `{documento=**}` é reescrita como `{colecao}/{documento=**}` (seção 1,
`#d154`); (2) **schema aditivo** — `PapelNaConta`, a subcoleção `contas/{id}/membros/{uid}` e
`caminhos.membros`; nada muda de forma em documento gravado; (3) nenhuma dependência: `zod` e
`firebase-admin` já estão lá.
**Decisões a registrar:** `#d153` (o papel vira vocabulário, e a regra o confere — supera a
primeira das três ressalvas do `#d14`), `#d154` (a regra fecha por coleção, porque regra se soma
por OU), `#d155` (`membros` é espelho escrito só pelo servidor; a claim continua sendo a
verdade), `#d156` (a ajudante não paga: conta vencida com login de ajudante é uma tela sem
checkout), `#d157` (o que a ajudante continua vendo, e por quê — o custo do produto é dela
também; o caixa não).

---

## Problema

Hoje, dois logins na mesma conta são possíveis e inúteis. Possíveis porque
`scripts/conceder-acesso.mjs` põe qualquer e-mail no mapa `contas` e a regra só confere a
presença da chave. Inúteis porque o segundo login vira **outra dona**: abre o caixa, muda o
valor da hora, altera a margem, encerra a conta. A confeiteira que contrata uma ajudante para
assar não quer dar a ela a senha do próprio negócio, e hoje é só isso o que existe para dar.

Quatro coisas estão prontas para o dia em que isso mudar, e é por isso que esta spec cabe em
duas sessões e não em seis:

1. **O dado já é da conta, não do login** (`#d14`). Nenhum caminho, nenhuma consulta e nenhum
   índice muda por existir um segundo login.
2. **A claim já é um mapa `{ contaId: papel }`**, e `'DONA'` já é o valor que todo mundo emite.
   O papel existe na forma; falta existir no vocabulário e na regra.
3. **O prazo de escrita já é um mapa por conta** (`acessoAte`, `#d144`). Uma ajudante entra nele
   com a data da conta, e a conta vencida para de escrever inteira — pela dona e pela ajudante.
4. **O convite já tem molde**: o script cria o login sem senha e manda tocar em "Esqueci minha
   senha" (`#d119`). O handler é o script com um `if` a mais.

E uma coisa não está pronta, e é o risco desta spec: **escrita recusada pela regra falha
calada** (`#d80`, `#d104`). Um app que não sabe quem é a ajudante entrega a ela a tela do caixa,
o botão de receber e a configuração inteira — e todos os três parecem funcionar até ela fechar
o app e nada ter sido gravado. Por isso a sessão B não é "polimento depois": é metade da spec.

**O que esta spec entrega:** a dona convida por e-mail em `/configuracao`, tira quando quiser, e
vê quem tem acesso; a ajudante entra no mesmo app com quatro destinos em vez de cinco, sem
caixa, sem meta, sem clientes, sem receber pagamento e sem configuração — e sem nenhuma tela que
prometa algo que a regra vá recusar.

**O que esta spec não entrega:** papel de leitura para contador; ajudante que vê o pedido mas
não o preço; segundo negócio no mesmo login com seletor de conta; convite por link em vez de
e-mail; e-mail transacional (o convite continua sendo um recado no WhatsApp).

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra**, para a dona, **uma linha** na prateleira do fim de `/configuracao` ("Quem te
  ajuda"), ao lado de "Como funciona" — três toques a partir da tela Hoje, o lugar do que se usa
  uma vez por ano. Nenhum campo em formulário nenhum, nenhuma faixa, nenhuma tela nova para
  quem está começando: a conta nasce sem ajudante e a linha diz "Só você" até alguém ser
  convidada.
- **Sai**, para a ajudante, bastante: um destino da navegação, três cartões da tela Hoje, o
  bloco de receber do pedido e a configuração inteira. É a única spec desde a 009 em que a
  resposta a esta seção não é "nada" — e é assim porque o app dela é o app da dona menos o que
  não é dela.

---

## 1 · O que esta spec decide

### O papel vira vocabulário, e a regra passa a conferi-lo — `#d153`

`PapelNaConta = "DONA" | "AJUDANTE"`, dois valores, em `src/lib/types/conta.ts`. `ContasDaClaim`
deixa de ser `Record<string, string>` e passa a ser `Record<string, PapelNaConta>`.

Isto supera a primeira das três ressalvas do `#d14` — "a regra não confere o papel, porque regra
escrita para papel que não existe é regra que ninguém testou". O segundo tipo de acesso é o caso
de uso que aquela decisão esperava; o vocabulário nasce com ele, como prometido, e não antes.

**Dois valores, não três.** "Contador com acesso de leitura" está no `#d14` como exemplo, e
continua fora: um papel que só lê é outra matriz de regra, outra passagem em cada tela e nenhum
pedido real por trás. `"AJUDANTE"` é o papel de quem entra na cozinha.

**Claim desconhecida é ajudante, nunca dona.** Um token velho com `'DONA'` continua dona; um
valor que não é nenhum dos dois (claim escrita à mão, script de outra versão) é tratado como
ajudante pela tela e pela regra — a regra confere `== 'DONA'` onde precisa de dona e
`== 'AJUDANTE'` onde precisa negar, e o que sobra cai no lado restrito nos dois casos. Errar
para menos acesso é o único jeito de errar aqui.

### A regra fecha por coleção, porque regra se soma por OU — `#d154`

A regra de hoje é um `match /contas/{contaId}` com um `match /{documento=**}` dentro. A leitura
ingênua desta spec seria acrescentar ao lado um `match /configuracao/{doc}` negando a ajudante —
e **isso não nega nada**: no Firestore, quando duas regras casam com o mesmo caminho, o acesso é
concedido se **qualquer uma** permitir. Uma regra restritiva ao lado de uma permissiva é
decoração.

Então a recursiva é reescrita para capturar o nome da coleção e decidir nela mesma:

```
match /contas/{contaId} {
  function temAcesso() { … }        // inalterada
  function podeEscrever() { … }     // inalterada

  function ehAjudante() {
    return temAcesso() && request.auth.token.contas[contaId] == 'AJUDANTE';
  }

  // O dinheiro não é dela: a ajudante não lê nem escreve estas três.
  function doDinheiro(colecao) {
    return colecao in ['transacoes', 'metas', 'agregados'];
  }

  // Espelho dos acessos: a claim é a verdade, e quem escreve é o Admin SDK.
  function soDoServidor(colecao) {
    return colecao == 'membros';
  }

  allow read: if temAcesso();
  allow write: if podeEscrever() && !ehAjudante();   // o documento da conta é da dona

  match /{colecao}/{documento=**} {
    allow read: if temAcesso() && !(ehAjudante() && doDinheiro(colecao));
    allow write: if podeEscrever()
                 && !soDoServidor(colecao)
                 && !(ehAjudante() && (doDinheiro(colecao) || colecao == 'configuracao'));
  }
}
```

`{colecao}/{documento=**}` continua casando com tudo o que o `{documento=**}` casava — o
curinga recursivo segue sendo o último segmento, que é o que o Firestore exige —, e passa a
saber de qual coleção está falando. Custo: zero leitura, como o `#d07` manda; o que a regra usa
é o token e o nome do caminho.

**Três listas, e a razão de cada uma:**

- **`transacoes`, `metas`, `agregados` — nem ler.** É o caixa, a meta do mês e os espelhos
  mensais. Quanto o negócio fatura é a informação que a dona menos quer no celular de quem
  ajuda, e é a única do sistema que não serve para assar nada.
- **`configuracao` — ler sim, escrever não.** A ficha precisa da configuração para calcular:
  sem leitura, todo produto abre com preço errado no app da ajudante. O que ela não faz é mexer
  no valor da hora, na margem e nas formas de pagamento.
- **`membros` — ninguém escreve do cliente**, nem a dona. Se o espelho fosse escrito da tela,
  escrever `papel: 'DONA'` no próprio documento seria uma promoção que ninguém autorizou — a
  claim não mudaria, mas a tela passaria a mostrar o que a regra ainda nega, e alguém iria
  "consertar" a regra para bater com a tela. Espelho é espelho.
- **O documento da conta — a dona.** `nome`, `proprietaria`, `primeirosPassosEm`, os campos de
  plano. `concluirPrimeirosPassos` é a única escrita de cliente que toca nele, e o caminho dos
  primeiros passos é da dona (sessão B o esconde).

`insumos`, `fichas`, `pedidos`, `clientes`, `listasCompra`, `fornadas` ficam como estão, para os
dois papéis. É o trabalho.

### `membros` é espelho escrito só pelo servidor — `#d155`

`contas/{contaId}/membros/{uid}`, um documento por ajudante convidada:

```ts
export interface Membro {
  /** O `uid` é o id do documento; o e-mail é o que a tela mostra. */
  email: string;
  papel: PapelNaConta;
  convidadaEm: Timestamp;
  /** O `uid` da dona que convidou. */
  convidadaPor: string;
  /** Presente = acesso tirado. O documento fica; a claim é que some. */
  removidaEm?: Timestamp;
  v: VersaoSchema;
}
```

**A claim continua sendo a verdade.** O documento existe por três motivos, e nenhum deles é
autorizar:

1. **A tela precisa de uma lista.** Sem ela, "quem tem acesso ao meu negócio?" só se responde
   varrendo `listUsers` do Admin SDK, que percorre todos os logins do projeto para achar dois.
2. **O webhook precisa de uma lista.** `escreverAcessoAte` hoje escreve na claim de um `uid` só —
   o da metadata da assinatura, que é a dona. Sem percorrer os membros, a ajudante fica com o
   `acessoAte` do dia do convite e **para de escrever quando o teste original venceria**, numa
   conta paga em dia. O bug apareceria semanas depois, como "não salva no celular dela", e é o
   tipo de coisa que ninguém liga a uma assinatura renovada.
3. **`encerrar-conta.mjs` já contava com ela.** A 029 escreveu, em 3.7, "se `contas` ficar vazio
   depois de tirar a chave, apaga o login; senão, só a claim — o caso da 030, que ainda não
   existe". Existe agora.

**A dona não tem documento em `membros`.** Ela é o `uid` da metadata da assinatura, é quem o
`encerradaPor` guarda, e é "você" na tela. Um documento para ela seria um segundo lugar onde a
mesma coisa pode ficar desatualizada, e as contas do beta não o teriam.

**Tirar o acesso não apaga o documento**: grava `removidaEm` e tira a chave da claim. O
invariante "nunca apagar documento" continua inteiro sem exceção nova, e de brinde fica o
registro de quem teve acesso e até quando — que é exatamente o que se quer saber no dia em que
alguém pergunta.

### A ajudante não paga: conta vencida com login de ajudante é uma tela sem checkout — `#d156`

A conta vence pelo relógio da regra, e a claim da ajudante vence junto (é o mesmo `acessoAte`).
O `(app)/layout.tsx` manda toda conta vencida para `/assinatura`, que oferece dois cartões de
preço e o portal. Oferecer isso a quem não é dona é pedir que a ajudante pague a assinatura do
negócio de outra pessoa com o cartão dela.

`/assinatura`, com `papel === "AJUDANTE"`, é uma tela sem cartão de preço, sem portal e sem
"Baixar meus dados": o título diz que o acesso ao negócio está suspenso, a linha embaixo diz
para avisar a dona, e o único botão é "Sair". A conta é dela; a conversa é entre as duas.

### O que a ajudante continua vendo, e por quê — `#d157`

Fecha-se o caixa, a meta, os clientes e a configuração. **Não** se fecha o custo do produto nem
o preço do pedido, e isso é decisão, não esquecimento:

- **A ficha inteira, com custo, margem e preço sugerido.** Quem assa vê a receita, e quem vê a
  receita sabe o que ela custa. Esconder o painel de preço custaria uma segunda versão do editor
  de produto — a tela mais complexa do sistema — para proteger um número que a pessoa que pesa a
  farinha consegue estimar sozinha.
- **O pedido inteiro, com valor e itens.** É o que ela precisa para separar, embalar e entregar.
  O que some é o bloco de **receber**: marcar pago escreve em `transacoes` e em `agregados`, e
  as duas são negadas — sem esconder o bloco, o toque falharia calado, que é o pior dos mundos.
- **`clientes` some da tela, e não da regra.** A coleção continua legível porque o editor de
  pedido escolhe a cliente nela; o que some é `/clientes`, que é "quem mais compra de mim"
  ordenado por quanto cada uma gastou — faturamento por pessoa, o caixa por outro ângulo. É a
  única coisa nesta spec escondida só pela tela, e está assim por escrito para não ser lida como
  furo de regra.

A régua: **o que ajuda a produzir e entregar é das duas; o que diz quanto o negócio ganha é da
dona.**

---

## 2 · Antes de tocar em código

1. Ler `firestore.rules` inteira (50 linhas) e a documentação de _Firestore Security Rules ·
   overlapping match statements_: a soma por OU é o motivo do `#d154`, e quem não a tiver lido
   vai "simplificar" a regra de volta para o jeito que não nega nada.
2. Ler `scripts/conceder-acesso.mjs` inteiro e `src/app/api/conta/route.ts`: o convite é os dois
   somados — criar o login sem senha do primeiro, a idempotência do `garantirConta` do segundo.
3. Ler `src/lib/server/stripe.ts:40-61` (`escreverAcessoAte`) e
   `src/app/api/stripe/webhook/route.ts:55-78`: é uma chamada que vira um laço.
4. Ler `src/app/api/conta/encerrar/route.ts` (o passo 3 do `#d148`) e `scripts/encerrar-conta.mjs`
   (o passo 4): os dois tratam claim de um login só e passam a tratar de vários.
5. Ler `src/providers/AuthProvider.tsx:105-145` (`contaAtivaDaClaim`) e
   `src/components/layout/navegacao.ts` inteiro: são os dois pontos de onde a sessão B decide o
   que existe na tela.
6. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` no painel "Quem te ajuda" e na
   `Confirmacao` de tirar o acesso.

---

## 3 · Escopo

### Sessão A · A chave e o convite

Nada nesta sessão aparece na tela. O que ela entrega é: a dona convida por `curl`, a ajudante
entra, e a regra recusa o que tem de recusar.

#### 3.A.1 Os tipos — `src/lib/types/conta.ts` e `common.ts`

```ts
/** Dois papéis, e só. Ver `DECISOES.md#d153`. */
export type PapelNaConta = "DONA" | "AJUDANTE";

export type ContasDaClaim = Record<string, PapelNaConta>;

export interface Membro { … }   // a forma do `#d155`, acima
```

O comentário de `ContasDaClaim` ("o papel é string livre por ora, com `'DONA'` como único valor
emitido") sai: deixou de ser verdade. `caminhos` ganha
`membros: (contaId) => \`contas/${contaId}/membros\``e`membro: (contaId, uid) => \`contas/${contaId}/membros/${uid}\``. `colecoes.ts`ganha`colMembros`, com conversor, porque a sessão B lê a lista do cliente.

#### 3.A.2 O domínio — `src/lib/domain/ajudante.ts`

Puro, testado, compartilhado pela rota e pelas duas telas:

```ts
/** Teto do convite. Não é regra de negócio: é freio de criação de login. */
export const LIMITE_DE_AJUDANTES = 5;

export const esquemaConvite = z.object({
  contaId: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

export type FalhaConvite =
  | "sem-acesso" // token ausente, inválido, ou quem chama não é dona
  | "fora-de-forma" // corpo que não passa no esquema, ou e-mail da própria dona
  | "ja-convidada" // o e-mail já abre esta conta
  | "cheio" // LIMITE_DE_AJUDANTES
  | "sem-configuracao"
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_CONVITE: Record<FalhaConvite, string>;

/** Rotas que só a dona abre. Lida pela navegação e pelo guarda de rota (sessão B). */
export const ROTAS_SO_DA_DONA = [
  "/financeiro",
  "/clientes",
  "/comecar",
] as const;
export function rotaSoDaDona(caminho: string): boolean;

/** `"maynara@exemplo.com"` → `"maynara"`, para a lista não estourar em 360px. */
export function apelidoDoEmail(email: string): string;
```

Testes em `tests/domain/ajudante.test.ts`: `rotaSoDaDona` com `/financeiro`,
`/financeiro/qualquer`, `/fichas`, `/` e `/comecarX` (que **não** é da dona — prefixo não é
rota); `esquemaConvite` com e-mail com espaço e maiúscula (passa, normalizado) e sem arroba
(recusa); `apelidoDoEmail` com e-mail longo e sem arroba.

#### 3.A.3 As regras — `firestore.rules`

A reescrita do `#d154`, inteira na seção 1. **Aprovação pedida.** `firestore.indexes.json` não
muda: a lista de membros é uma coleção de até cinco documentos, lida sem `where` e sem `orderBy`
(a ordenação é na memória, por `convidadaEm`).

#### 3.A.4 A rota — `src/app/api/conta/membros/route.ts`

Um arquivo, dois verbos, no molde de `/api/conta/encerrar`: credencial → token → corpo →
autorização. A autorização é nova e mora em `firebaseAdmin.ts`, ao lado de `abreAConta`:

```ts
/** Só a dona convida e tira. Papel desconhecido não é dona (`#d153`). */
export function ehDona(quem: Autenticado, contaId: string): boolean {
  return quem.contas[contaId] === "DONA";
}
```

**`POST`** — `{ contaId, email }`, e na ordem:

1. `ehDona` recusa qualquer outro papel com `sem-acesso` (401). Ajudante não convida ajudante.
2. O e-mail é o da própria dona (o `email` do token) → `fora-de-forma`. Promover-se a dois
   papéis na mesma conta não é um caso, é um bug esperando.
3. Conta os membros sem `removidaEm`: no limite, `cheio`.
4. `getUserByEmail`; em `auth/user-not-found`, `createUser({ email })` — **sem senha**, como o
   script (`#d119`). A resposta traz `criouLogin: boolean`, porque a frase que a tela mostra
   depois é outra.
5. Se a claim desse login já tem esta conta: não reescreve papel nenhum (uma dona convidada por
   engano continuaria dona — e não é esta rota que rebaixa ninguém), garante o documento de
   membro e responde `ja-convidada` (409) quando o papel é `AJUDANTE`, para a tela dizer "essa
   já entra".
6. `setCustomUserClaims` preservando tudo o que não é desta conta — o padrão do script e de
   `/api/conta` —, com `contas[contaId] = "AJUDANTE"` e `acessoAte[contaId]` **copiado do
   documento da conta**: `assinaturaAte ?? trialAte`, em milissegundos. Sem nenhum dos dois
   (conta liberada à mão), **sem chave**: quem a dona convida herda o prazo da dona, inclusive
   a ausência dele.
7. `contas/{contaId}/membros/{uid}`, `set` com `merge` (idempotente): `email`, `papel`,
   `convidadaEm: Timestamp.now()`, `convidadaPor: quem.uid`, `v: VERSAO_SCHEMA`, e
   `removidaEm: FieldValue.delete()` — reconvidar quem foi tirada é o mesmo `POST`.

Resposta `{ uid, criouLogin }`.

**`DELETE`** — `?contaId=…&uid=…`, `ehDona`, e:

1. O documento de membro precisa existir e ter `papel === "AJUDANTE"`; qualquer outra coisa é
   `fora-de-forma`. É o que impede a rota de tirar a claim de uma dona — inclusive de quem
   chama.
2. Tira `contas[contaId]` e `acessoAte[contaId]` da claim daquele `uid`, preservando o resto
   (uma ajudante pode ajudar em dois negócios; o outro não pode cair junto).
3. `removidaEm: Timestamp.now()` no documento. O login continua existindo, sem conta: no próximo
   token ela cai em "Este login ainda não abre nenhuma conta", que já é uma tela pronta e já diz
   a coisa certa ("avise quem te convidou").

Idempotente nos dois sentidos, como a 029: claim já sem a chave, `removidaEm` já gravado, e a
rota faz só o que falta.

`firebaseAdmin.ts`, cabeçalho: a lista de quem escreve no Firestore daqui ganha
`/api/conta/membros` — "só no documento da conta, na claim e no espelho de membros, nunca em
dado de negócio".

#### 3.A.5 Os dois handlers que passam a percorrer a lista

**`/api/stripe/webhook`** — onde hoje há uma chamada:

```ts
await escreverAcessoAte(uid, contaId, ateMs); // claim antes do documento (#d145)
```

passa a haver uma por login com acesso:

```ts
// A dona (metadata) e as ajudantes: renovar a assinatura renova a claim de
// todo mundo que escreve na conta (`DECISOES.md#d155`). Sem laço, a ajudante
// para de salvar no dia em que o teste original venceria, numa conta em dia.
const membros = await adminDb().collection(caminhos.membros(contaId)).get();
const uids = [
  uid,
  ...membros.docs.filter((d) => !d.get("removidaEm")).map((d) => d.id),
];
for (const cada of uids) await escreverAcessoAte(cada, contaId, ateMs);
```

Sem `where("removidaEm", "==", null)`: campo ausente não casa com `== null` no Firestore, e
cinco documentos lidos inteiros não pedem índice. Sequencial, e não `Promise.all`: são até seis
escritas de claim num webhook que o Stripe repete se cair.

**`/api/conta/encerrar`** — o passo 3 do `#d148` (tirar a conta da claim) passa a valer para a
dona **e** para cada membro sem `removidaEm`, com o mesmo `removidaEm` gravado no espelho.
Encerrar a conta e deixar a ajudante com a claim de uma conta que a purga vai apagar é deixar
um login apontando para o vazio — e, pior, com direito de escrita por até uma hora na conta que
está sendo encerrada. O comentário do `#d148` no handler ganha a linha.

**`scripts/encerrar-conta.mjs`** não muda: a varredura de `listUsers` que ele já faz continua
achando quem tiver a chave, e o ramo "se `contas` não ficar vazio, só tira a chave" era
justamente este caso.

#### 3.A.6 `AuthProvider` — o papel entra no contexto

`contaAtivaDaClaim` passa a devolver `{ contaId, papel }` (a primeira chave e o valor dela),
`papel: PapelNaConta | null` entra no contexto e no `useMemo`, e `reconferirAcesso` o atualiza
junto com `contaId`. Valor desconhecido na claim vira `"AJUDANTE"` (`#d153`). `useContaId`
ganha irmão: `usePapel(): PapelNaConta`, que a sessão B usa em oito lugares e que estoura pelo
mesmo motivo do `useContaId` ("tela autenticada renderizada sem conta").

É a única mudança de sessão A que o app enxerga, e ela é inerte: com uma conta de dona, `papel`
é `"DONA"` e nada muda na tela.

#### 3.A.7 Documentação da A

`#d153`, `#d154` e `#d155` em `docs/DECISOES.md`; o `#d14` ganha "a primeira ressalva caiu na
030: a regra confere o papel"; o `#d144` ganha "a claim da ajudante entra no mesmo mapa"; o
`#d148` ganha "a 030 estendeu o passo 3 a todos os membros". `docs/DEPLOY.md` ganha a seção "Ao
publicar a 030: as regras mudam" — publicar `firestore.rules` **antes** do app, porque a regra
nova é compatível com o app velho (uma conta só de donas não vê diferença) e o contrário não é.

### Sessão B · O app da ajudante

#### 3.B.1 O painel da dona — `src/components/conta/QuemTeAjuda.tsx`

Uma linha na prateleira do fim de `/configuracao`, entre "Como funciona" e `<MeusDados />`, no
mesmo desenho dos botões de lá (borda, `px-4 py-4`, ícone `Users` à esquerda, título e legenda).
A legenda é o estado: **"Só você"**, ou "Você e Ana" / "Você e mais 2". Some inteira para quem
não é dona — junto do resto de `/configuracao` (3.B.3).

O toque abre o `Painel` (folha no celular, lateral no desktop), título **"Quem te ajuda"**:

- Uma linha por ajudante ativa: o apelido do e-mail em destaque, o e-mail inteiro embaixo em
  `text-label`, e "Tirar o acesso" à direita (alvo de 44px, ícone mais texto). Ordenadas por
  `convidadaEm`. As removidas não aparecem.
- Estado vazio: "Só você usa o Rende neste negócio." mais o que uma ajudante pode e não pode —
  três linhas, na voz da confeitaria: "ela vê os pedidos, os produtos, os materiais e a lista de
  compras, e pode registrar fornada e contar a despensa. Ela não vê o seu caixa nem a sua meta,
  e não mexe na sua configuração."
- Rodapé: campo de e-mail (`type="email"`, `inputMode="email"`, `autoComplete="off"`) e o botão
  "Convidar", 52px no celular.
- Depois de convidar, no lugar do campo, a frase que a dona vai copiar para o WhatsApp — e é ela
  o convite (`#d119`): com `criouLogin`, **"Pronto. Peça para a Ana abrir o Rende, tocar em
  'Esqueci minha senha' e usar esse e-mail: o link que chega cria a senha dela."**; sem
  `criouLogin` (o e-mail já tinha login no Rende), **"Pronto. A Ana já tem senha: é só entrar
  com o e-mail dela."**
- Erros: `MENSAGEM_FALHA_CONVITE` em `role="alert"` abaixo do campo, no padrão do `MeusDados`
  (`codigoDaFalha`, `TypeError` → `sem-rede`).

"Tirar o acesso" abre a `Confirmacao` (023): título "Tirar o acesso da Ana?", descrição "Ela sai
do Rende no próximo acesso e não vê mais os seus pedidos. Você pode convidar de novo quando
quiser.", "Tirar o acesso" · "Voltar". Não é a modal mais grave do sistema — essa continua sendo
a da 029 —, mas é destrutiva do ponto de vista de quem perde acesso, e é o caso do `DESIGN.md`.

A lista vem de `colMembros` pelo `useColecao`, e não da rota: é dado da conta, lido pela regra
que já existe, e chega do cache offline como todo o resto. Só as duas escritas são de rota.

#### 3.B.2 O que some da tela da ajudante

Oito lugares, todos com a mesma condição (`usePapel() === "AJUDANTE"`), todos por ausência e
nenhum por aviso — tela que explica por que não tem o botão é pior que tela sem o botão:

| Onde                                                 | O quê                                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navegacao.ts` / `NavegacaoInferior` / barra lateral | "Caixa" sai: quatro destinos, `DESTINOS.filter(d => !rotaSoDaDona(d.href))`                                                                                                     |
| `(app)/layout.tsx`                                   | `rotaSoDaDona(caminho)` com papel de ajudante → `router.replace("/")`                                                                                                           |
| Tela Hoje                                            | `CartaoPrimeirosPassos` (o caminho é da dona), `CartaoMetaHoje` (lê `agregados`), `FaixaDoTeste` (é cobrança)                                                                   |
| Tela Hoje, cabeçalho                                 | o ícone de configuração continua: é por onde ela sai do app                                                                                                                     |
| `/pedidos`                                           | o atalho de `/clientes` no cabeçalho                                                                                                                                            |
| `FormularioPedido`                                   | `BlocoPagamento` inteiro, e as duas assinaturas que o alimentam (`docResumoMensal` e `docMeta`) passam `null` como referência, do jeito que o `AuthProvider` já faz com a conta |
| `/comecar`                                           | rota da dona (é o caminho dos primeiros passos), no `rotaSoDaDona`                                                                                                              |
| `/assinatura`                                        | a tela do `#d156`                                                                                                                                                               |

O `PainelPreco` da ficha, `/insumos`, `/fichas`, `/pedidos`, `/compras`, as duas contagens e a
fornada **não mudam**: é o trabalho, e é o `#d157`.

#### 3.B.3 `/configuracao` para a ajudante

A tela inteira é da dona: sete blocos de números que ela não pode gravar. Mas é também onde mora
"Sair", que desde a 022 é a única saída do app no celular (`#d118`). Então a rota **não** entra
em `ROTAS_SO_DA_DONA`: com papel de ajudante, `TelaConfiguracao` renderiza o cabeçalho, uma
linha explicando de quem é a configuração ("O preço e os custos são de quem é dona do negócio."),
e a prateleira do fim **sem** "Quem te ajuda" e **sem** `<MeusDados />` — os dados não são dela
para exportar nem a conta dela para encerrar. Sobram "Como funciona" e "Sair", que são
exatamente o que ela precisa.

`useGuardaDeSaida` não é montado nesse ramo: não há formulário para sujar.

#### 3.B.4 `/assinatura` para a ajudante — `#d156`

Antes dos três estados de `situacaoDaConta`, um ramo por papel: título **"O acesso a este
negócio está suspenso"**, corpo "Fale com quem é dona do Rende aqui: a assinatura precisa ser
renovada para vocês duas voltarem a usar.", e "Sair". Sem cartão de preço, sem portal, sem
`MeusDados`. O estado `teste` também não mostra faixa nenhuma para ela (3.B.2): prazo de
cobrança não é assunto de quem ajuda — até vencer, quando vira.

#### 3.B.5 A passagem do `/impeccable`

Painel "Quem te ajuda" (estado vazio, uma ajudante, cinco ajudantes, erro, carregando), a
`Confirmacao` de tirar, `/configuracao` no modo ajudante e `/assinatura` no modo ajudante, em
360px e no tema claro. Alvo de 44px em "Tirar o acesso", 52px no "Convidar"; `role="alert"` nos
erros; o e-mail longo truncando com `min-w-0` e não estourando a folha.

#### 3.B.6 Documentação da B

`#d156` e `#d157` em `docs/DECISOES.md`; `docs/ESTADO.md` com a seção da 030 e a linha na tabela;
`docs/saas/ROADMAP.md` com a 030 marcada como entregue e o que mudou do previsto (o "seletor de
conta no `AuthProvider`" que o roadmap previa **não nasceu**: um login com duas contas continua
abrindo a primeira chave, porque ninguém tem duas; o que nasceu foi `papel` no contexto). A
tabela de dívidas ganha duas linhas: o roteiro de navegador desta spec, e "a ajudante vê o custo
do produto" como dívida de `#d157`, a reabrir se alguém pedir.

---

## Roteiro de navegador

Precisa do projeto de verdade, de **duas contas** (a real e uma de cadastro com assinatura de
teste do Stripe), de dois navegadores (ou um anônimo) e de um e-mail a mais que ninguém usa.
Aparelho em 360px nos passos 4, 6 e 9.

1. **A conta real não muda.** Antes de publicar a regra: entrar como dona em `contas/mycookies`,
   percorrer as cinco telas, lançar no caixa, salvar a configuração. Publicar
   `firestore.rules` e repetir. Nada muda — é o que prova que a regra nova é compatível com o
   app velho.
2. **Convidar por `curl`** (fim da sessão A): `POST /api/conta/membros` com o token da dona e um
   e-mail novo → `{ uid, criouLogin: true }`. Firebase Authentication: o login existe, sem
   senha; a claim tem `contas: { …: "AJUDANTE" }` e `acessoAte` com a mesma data da dona.
   Firestore: `contas/{id}/membros/{uid}` com e-mail, papel e `convidadaEm`.
3. **A senha pelo link.** No navegador anônimo, `/login` → "Esqueci minha senha" com esse
   e-mail → o link chega, cria a senha, e ela entra.
4. **O app dela, a 360px.** Quatro destinos, sem "Caixa". Sem cartão de meta, sem caminho dos
   primeiros passos, sem faixa de teste. `/pedidos` sem o atalho de clientes. Abrir um pedido:
   tem itens, valor e entrega; **não** tem o bloco de receber. Abrir um produto: preço e custo
   estão lá (`#d157`). Registrar uma fornada: grava. Contar a despensa: grava.
   **Console limpo: nenhum `permission-denied` em nenhuma das telas** — é o critério do passo.
5. **A regra, pela porta dos fundos.** Com o login dela, digitar `/financeiro` na barra: cai em
   `/`. No console do navegador, `getDoc` em `transacoes` e em `agregados/{mês}`:
   `permission-denied` nos dois. `setDoc` em `configuracao/geral`: `permission-denied`.
   `getDoc` em `configuracao/geral`: **passa** (é o que faz o produto calcular).
   `setDoc` em `membros/{uid}` com `papel: 'DONA'`: `permission-denied`. `setDoc` no documento
   da conta: `permission-denied`.
6. **O painel da dona, a 360px.** No outro navegador, dona → `/configuracao` → "Quem te ajuda"
   diz "Você e Ana" → abre: uma linha com o apelido e o e-mail. Convidar o mesmo e-mail de novo:
   a frase de `ja-convidada`. Convidar um e-mail que já tem login no Rende: `criouLogin: false`
   e a segunda frase. Convidar o próprio e-mail: a frase de `fora-de-forma`.
7. **A renovação.** Com a conta de cadastro assinante e o `stripe listen` rodando: convidar uma
   ajudante, renovar a assinatura no painel do Stripe (ou disparar
   `customer.subscription.updated`) → no Authentication, **as duas claims** com o mesmo
   `acessoAte` novo. É o passo que prova o `#d155`; sem o laço, só a da dona muda.
8. **Tirar o acesso.** Dona → painel → "Tirar o acesso" → a modal → confirmar: a linha some. No
   Firestore, o documento **continua**, com `removidaEm`. No Authentication, a claim dela sem a
   chave. No navegador dela, em até uma hora (ou forçando a renovação): "Este login ainda não
   abre nenhuma conta". Convidar de novo o mesmo e-mail: volta, sem login novo.
9. **A vencida, a 360px.** Vencer a conta de cadastro à força (passo 4 do roteiro da 028) com a
   ajudante dentro: ela cai em `/assinatura` e vê a tela do `#d156` — sem preço, sem portal, sem
   baixar dados, com "Sair". A dona, na mesma conta, continua vendo os cartões de preço.
10. **Encerrar com ajudante dentro.** Dona → "Encerrar minha conta" → confirmar: as duas claims
    ficam sem a chave, os dois aparelhos caem, e o espelho de membro tem `removidaEm`.
    `npm run encerrar-conta -- <contaId>` (ensaio) lista os **dois** logins; com `--confirmo`, o
    da ajudante sobrevive se ela ajudar em outro negócio, e some se não.
11. **Sem rede.** Com o login da ajudante, DevTools Offline: as telas que ela tem abrem pelo
    cache e a fornada grava na fila. Com o login da dona, Offline, abrir "Quem te ajuda": a
    lista vem do cache; "Convidar" diz `sem-rede` e nada é gravado.
12. **Ajudante não convida.** Com o token dela, `POST /api/conta/membros`: 401 `sem-acesso`.
    `DELETE` com o `uid` da dona: `fora-de-forma`.

---

## Critérios de aceite

- [x] `PapelNaConta` com dois valores; `ContasDaClaim` tipada por ele; `Membro`,
      `caminhos.membros`/`membro` e `colMembros` existem; nenhum documento gravado muda de forma.
- [x] `firestore.rules`: a recursiva é `{colecao}/{documento=**}`; ajudante não lê `transacoes`,
      `metas` nem `agregados`; lê e não escreve `configuracao`; ninguém escreve `membros` do
      cliente; o documento da conta só a dona escreve (passo 5).
- [x] `POST /api/conta/membros`: só dona (401 para ajudante); e-mail da própria dona recusado;
      `LIMITE_DE_AJUDANTES`; cria o login sem senha quando não existe; claim com `AJUDANTE` e
      `acessoAte` copiado do documento da conta — **sem chave** quando a conta não tem prazo;
      espelho gravado; repetir o `POST` não duplica nada.
- [x] `DELETE /api/conta/membros`: só dona; recusa `uid` que não é `AJUDANTE` no espelho; tira as
      duas chaves da claim preservando outras contas; grava `removidaEm`; idempotente.
- [x] O webhook do Stripe renova `acessoAte` da dona **e** de cada membro ativo (passo 7);
      `/api/conta/encerrar` tira a claim de todos (passo 10).
- [x] `AuthProvider` expõe `papel`; papel desconhecido cai em `"AJUDANTE"`; `usePapel()` existe.
- [x] Com papel de ajudante: quatro destinos, `rotaSoDaDona` redirecionando, os três cartões e o
      bloco de receber ausentes, `/configuracao` reduzida com "Sair", `/assinatura` sem checkout.
- [x] **Nenhum `permission-denied` no console** ao percorrer todas as telas que a ajudante
      alcança (passo 4). É o critério que diz se a sessão B ficou completa.
- [x] `QuemTeAjuda` em `/configuracao` só para a dona: lista, convite, as duas frases de recado,
      a `Confirmacao` de tirar, os erros em `role="alert"`.
- [x] `tests/domain/ajudante.test.ts` cobre 3.A.2; `src/lib/domain/ajudante.ts` não importa
      Firebase nem React.
- [x] Alvo de 44px nas linhas da lista, 52px em "Convidar"; nada depende só de cor.
- [x] `lint`, `typecheck`, `test` e `build` passam; `build` lista `/api/conta/membros` dinâmica.
- [x] `#d153` a `#d157` escritos; `#d14`, `#d144` e `#d148` anotados; `ESTADO.md`, `ROADMAP.md` e
      `DEPLOY.md` (a ordem de publicar a regra) atualizados.

---

## Fora de escopo

- **Papel de leitura (contador, sócia).** Outra matriz de regra e outra passagem por cada tela,
  sem ninguém pedindo. Nasce com o caso, como este nasceu do `#d14`.
- **Ajudante sem ver preço nem custo.** É o `#d157`, e é dívida anotada, não esquecimento.
- **Seletor de conta.** O roadmap previa; ninguém tem duas contas. `contaAtivaDaClaim` continua
  pegando a primeira chave, e o dia da segunda é o dia de uma preferência gravada.
- **Convite por link ou por QR.** Exige token de convite, prazo e uma rota pública — a primeira
  do sistema. O e-mail mais "Esqueci minha senha" já entrega o mesmo, com o Firebase mandando o
  único e-mail que o projeto manda.
- **E-mail transacional de convite.** O recado é da dona, pelo WhatsApp, como todo recado deste
  produto (`#d77`).
- **Registro de quem fez o quê** (`criadoPor` no pedido, na fornada). É auditoria, e ela começa
  a existir quando a dona perguntar "quem mexeu nisso". Hoje ninguém pergunta, e o campo em toda
  mutação é caro.
- **Papel no `scripts/conceder-acesso.mjs`.** O script libera dona, que é o que ele sempre fez; a
  ajudante entra pela rota. Um quinto argumento posicional num script que já tem quatro é
  convite a errar a ordem.
- **Duas donas na mesma conta.** A rota só emite `AJUDANTE`. Promover é o Admin SDK à mão, e é
  raro o bastante para ficar assim.
- **Limite por plano.** `LIMITE_DE_AJUDANTES` é freio, não produto: gating de funcionalidade é a
  032, e só com os upsells na mesa.
- **Ajudante encerrando ou exportando a conta.** Não é a conta dela.

---

## Decisões desta spec que são fáceis de rejeitar

- **A regra confere o papel, contra a letra do `#d14`.** Aquela decisão dizia para não escrever
  regra de papel antes do caso. O caso é esta spec; não fazê-lo agora seria uma ajudante com
  poder de dona, que é o oposto do pedido.
- **Reescrever a recursiva em vez de acrescentar regras.** Parece mais invasivo, e é o contrário:
  acrescentar regra ao lado de `{documento=**}` não nega nada (`#d154`), e descobrir isso em
  produção é descobrir com o caixa aberto no celular da ajudante.
- **`membros` como subcoleção, e não uma lista no documento da conta.** Um array no documento
  seria menos código e chegaria de graça onde o documento já chega. Mas o documento da conta é
  lido pelo app inteiro a cada abertura, e as ajudantes só interessam a uma tela; além disso, a
  regra "ninguém escreve `membros` do cliente" vira "ninguém escreve _este campo_ do documento
  da conta", que a linguagem de regras expressa mal.
- **O espelho não autoriza nada.** Dois lugares dizendo quem tem acesso é um lugar a mais para
  divergir. A claim é a verdade porque é ela que a regra lê; o espelho existe para a tela e para
  os laços, e o dia em que discordarem, a claim ganha.
- **`acessoAte` copiado no convite, e não recalculado.** É o mesmo motivo do `#d144`: a claim e o
  documento não podem discordar por um segundo de diferença.
- **O laço no webhook, e não um `acessoAte` por conta em vez de por login.** O certo mesmo seria
  o prazo morar na conta e a regra lê-lo — e ler na regra custa uma leitura por avaliação, que é
  exatamente o que o `#d07` recusou. Cinco escritas de claim numa renovação mensal é mais barato
  que uma leitura por acesso.
- **Tirar o acesso não apaga o documento.** Podia apagar: é espelho, não é dado de negócio. Mas
  `removidaEm` custa uma linha, respeita o invariante sem exceção nova e responde "quem teve
  acesso ao meu negócio em março?".
- **`/configuracao` reduzida em vez de bloqueada.** "Sair" mora lá desde a 022, e é a única saída
  no celular. Bloquear a rota prenderia a ajudante dentro do app.
- **A ajudante não vê a faixa do teste.** Ela veria uma contagem regressiva de uma cobrança que
  não é dela e que não pode resolver. Quando vence, aí sim: a tela do `#d156` diz o que fazer.
- **Cinco ajudantes.** Número redondo com nome. Não é plano nem regra: é o que impede um script
  de criar mil logins no projeto com um token de dona.

---

## Riscos

- **Publicar o app antes da regra** deixa a ajudante com tela escondida e permissão de dona;
  publicar a regra antes do app deixa a dona com tudo funcionando e ninguém do outro lado. A
  ordem é regra primeiro, e está no `DEPLOY.md` por isso.
- **A claim demora até uma hora.** Tirar o acesso não expulsa na hora: o token em cache continua
  valendo, e nesse intervalo ela escreve. É o mesmo intervalo do `#d148`, e a defesa é a mesma —
  nada se perde que a dona não tenha pedido para perder. Se um dia importar, o caminho é o da
  029: um campo no documento da conta que o `AuthProvider` observa.
- **Um `permission-denied` esquecido.** É o risco real da sessão B, e por isso o console limpo é
  critério de aceite e não observação. O lugar mais provável de sobrar é uma assinatura de
  `agregados` dentro de um componente que a tela esconde mas continua montando — o padrão de
  passar `null` como referência existe para isso.
- **A ajudante que vira dona de outro negócio.** Um login com duas contas abre a primeira chave
  do mapa, que é ordem de objeto e não escolha. Enquanto for raro, é aceito; o conserto é o
  seletor, e ele está fora de escopo por não ter caso.
- **O e-mail errado no convite.** A dona digita, e quem recebe o link de senha é quem ela
  escreveu. O espelho mostra o e-mail inteiro embaixo do apelido exatamente para ela conferir, e
  "Tirar o acesso" desfaz em dois toques.
- **Esta spec é da fase 3 e a fase 0 ainda não passou no teste.** Nada aqui deve ser publicado
  antes de a usuária 0 chegar ao preço sozinha e de a 027–029 saírem do branch. Implementar a 030
  antes disso é construir para o cliente 20 enquanto o cliente 1 não existe.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no fim de **cada** sessão, com
o resultado real relatado. Mais o roteiro: o passo 1 (a conta real intacta com a regra nova) no
fim da A, os passos 2, 3, 7 e 12 também na A — todos se fazem por `curl` e console —, e o resto
na B. A spec só está pronta quando o passo 4 rodar com o console limpo: uma ajudante de verdade,
num celular de verdade, sem encontrar nenhum botão que não funcione.
