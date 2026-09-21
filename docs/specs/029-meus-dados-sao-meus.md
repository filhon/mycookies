# Spec 029 · Meus dados são meus

**Tipo:** a terceira e última spec da fase 2 do `docs/saas/ROADMAP.md` — o que fecha a porta
pelo lado dela. LGPD, o mínimo que não é jurídico: **duas rotas de servidor** (`GET
/api/conta/exportar` e `POST /api/conta/encerrar`), um módulo puro pequeno
(`domain/meusDados.ts`), um componente (`MeusDados`) em dois lugares (`/configuracao` e a tela
de vencida de `/assinatura`), um valor e dois campos opcionais em `Conta`, um efeito de três
linhas no `AuthProvider`, e **um script** (`scripts/encerrar-conta.mjs`), irmão de
`conceder-acesso.mjs`, que é a única coisa no sistema que apaga documento. **Nenhuma regra,
nenhum índice, nenhuma dependência, nenhuma tela nova.**
**Tamanho:** uma sessão. O que pesa não é o código — são quatro rotas de servidor somadas e
nenhuma delas é grande. O que pesa é a ordem em que o encerramento acontece, porque ele é o
primeiro caminho do sistema em que "dar errado no meio" pode deixar uma cobrança viva numa conta
que a purga vai apagar. A seção 1 gasta o que precisa nisso.
**Origem:** o roadmap (fase 2, 029); `#d144`, que deixou a conta vencida **lendo** tudo
justamente para esta spec exportar; `#d145`, que reservou `"ENCERRADA"` em `StatusDaConta`; e a
seção "os dados são dela (exportar e encerrar, 029)" de `/termos`, que a 027 prometeu.
**Depende de:** a 027 e a 028 codificadas (estão) — `Conta.status`, `stripeSubscriptionId`,
`escreverAcessoAte`, `Confirmacao` (023) e `sair()` com limpeza de cache (022) são o que esta
spec usa. Fica no mesmo branch das duas, e publica com elas: o texto de `/termos` e
`/privacidade` continua sendo o portão, e esta spec acrescenta o que ele precisa afirmar.
**Aprovações pedidas:** (1) **schema aditivo** — `"ENCERRADA"` em `StatusDaConta`,
`Conta.encerradaEm?` e `Conta.encerradaPor?`; (2) **a exceção nomeada ao invariante "nunca
apagar documento"** no `CLAUDE.md`: a purga de conta encerrada, por script, à mão; (3) uma linha
em `package.json` (`"encerrar-conta"`, um script e não uma dependência); (4) o comentário de
cabeçalho de `firebaseAdmin.ts` ganha a terceira rota que escreve. Regras não mudam: as duas
rotas rodam com o Admin SDK, e a autorização é o token mais `abreAConta`, como no portal. **Duas
decisões a registrar**, `#d148` (encerrar é `status` mais claim fora, hoje; apagar é script, à
mão, dias depois — e o login fica até a purga) e `#d149` (a exportação sai do servidor por
`listCollections()`, porque uma exportação do cache é silenciosamente incompleta).

---

## Problema

A 027 abre a conta sozinha e a 028 cobra por ela. O que não existe é o caminho de volta: hoje
não há um jeito de ela levar embora o que digitou, nem de dizer "não quero mais" sem mandar
mensagem para quem conduz o projeto. Para a usuária 0 isso nunca importou — o dado é dela e o
projeto é do marido. Para uma conta que nasceu por um link, importa duas vezes:

1. **A LGPD dá a ela o direito à portabilidade e à eliminação** (art. 18, V e VI), e
   `/privacidade` tem uma seção "Os seus direitos" esperando dizer como. Um direito que se
   exerce por WhatsApp não é um direito exercível; é um favor.
2. **A confeitaria era um bico** (roadmap §1): boa parte das contas fecha em meses. A que fecha
   quer duas coisas — a planilha dela de volta e parar de pagar. Se a segunda depender de
   alguém ler uma mensagem, o Stripe cobra mais um mês e a primeira impressão do encerramento é
   uma cobrança indevida.
3. **A conta vencida lê tudo e não escreve nada** (`#d144`), e a tela de vencida diz "tudo o que
   você cadastrou continua guardado". Guardado onde ela não alcança é guardado para o sistema,
   não para ela. O `#d144` deixou a leitura sem prazo **para esta spec**.
4. **"Nunca apagar documento" é regra para dado de negócio vivo** — fichas antigas que pedidos
   referenciam, custo que precisa continuar auditável. Uma conta encerrada não tem negócio vivo:
   o dado que sobra é o dado pessoal de alguém que pediu para sair, e mantê-lo para sempre é o
   contrário do que a regra protege.
5. **`StatusDaConta` tem um valor só.** O `#d145` disse que `status` é do ciclo de vida da conta
   e reservou `"ENCERRADA"` para aqui.

**O que esta spec entrega:** "Baixar meus dados" — um arquivo JSON com a conta e todas as
coleções dela, gerado no servidor; "Encerrar minha conta" — a assinatura cancelada no Stripe, o
documento marcado, a claim removida e ela fora do app no mesmo toque; os dois alcançáveis da
conta vencida; e o script que apaga de vez, à mão, dentro do prazo que a política de privacidade
promete.

**O que esta spec não entrega:** apagar automaticamente (cron, `#d144`); exportar em planilha
(CSV/XLSX); importar uma exportação de volta; reabrir conta encerrada pela tela; apagar o login
na hora; anonimizar em vez de apagar; texto jurídico.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra** nada na frente. As duas ações moram no fim de `/configuracao`, na prateleira onde
  já estão "Como funciona" e "Sair" — três toques a partir da tela Hoje, o lugar do que se usa
  uma vez. Na tela de vencida entra um botão terciário, "Baixar meus dados", abaixo dos cartões
  de preço. Nenhum campo, nenhuma faixa, nenhuma tela.
- **Sai** nada.

---

## 1 · O que esta spec decide

### Encerrar é `status` mais claim fora, hoje; apagar é script, à mão, dias depois — `#d148`

Encerrar a conta é **um toque que faz três coisas no servidor, nesta ordem**, e o "nesta ordem"
é a decisão:

1. **Cancela a assinatura no Stripe**, se houver `stripeSubscriptionId` — `subscriptions.cancel`,
   imediato, sem esperar o fim do período. Primeiro porque é o passo que pode falhar por motivo
   de fora (Stripe fora do ar, chave errada), e se ele falhar **nada** foi encerrado: ela vê o
   erro e toca de novo. O estado que não pode existir é o inverso — documento marcado, purga
   agendada, cobrança viva. Sem Stripe configurado e com assinatura no documento, a rota recusa
   (`sem-configuracao`): a conta não encerra deixando a cobrança acesa.
2. **Marca o documento**: `status: "ENCERRADA"`, `encerradaEm: Timestamp.now()`,
   `encerradaPor: uid`. É o que o script de purga procura, e é o que o `AuthProvider` observa
   para tirá-la do app.
3. **Remove a conta da claim** — `contas` sem a chave, `acessoAte` sem a chave. A partir do
   próximo token, ela não lê nem escreve. É o mesmo mecanismo do `#d07`, ao contrário.

O handler é idempotente como o da 027 (`#d141`): assinatura já cancelada, pula; documento já
`ENCERRADA`, mantém o `encerradaEm` original; claim já sem a chave, pula. Toda volta bate na
mesma rota e faz só o que faltou.

**O que não acontece no toque:** nenhum documento é apagado. A purga é
`scripts/encerrar-conta.mjs`, rodado à mão por quem conduz o projeto, **até `DIAS_ATE_A_PURGA`
(30) dias** depois de `encerradaEm` — o prazo que `/privacidade` passa a prometer. Três motivos
para não apagar na hora: o arrependimento (nesse prazo, reabrir é `conceder-acesso.mjs` mais
um `status` corrigido no console, e o dado está inteiro); a lei não pede instantâneo, pede
prazo; e uma rota que apaga é uma rota que um erro de código apaga — o script é o único lugar
do sistema que chama `recursiveDelete`, roda com credencial de administradora e exige
`--confirmo`.

**O login fica até a purga.** O script apaga o usuário do Firebase Auth junto com o documento
(o e-mail é dado pessoal); até lá, o login existe sem conta. Se ela entrar nesse intervalo, cai
na tela "Este login ainda não abre nenhuma conta" e, por "Terminar o cadastro", `POST /api/conta`
cria uma conta **nova**, com teste novo — o `garantirConta` vê a claim vazia e faz o que faz.
Isso é o comportamento certo (ela mudou de ideia e recomeçou do zero) com um efeito colateral
aceito: encerrar e recadastrar rende catorze dias grátis de novo, uma vez por purga. Está
anotado em Riscos e não é consertado: o custo de fechar essa porta (guardar e-mails encerrados,
conferir no cadastro) é maior que o de a Maynara dar catorze dias a quem se deu ao trabalho.

**A exceção ao invariante é nomeada, não aberta.** O `CLAUDE.md` passa a dizer: "Nunca apagar
documento. A única exceção é a purga de conta encerrada por `scripts/encerrar-conta.mjs`,
`#d148`". Nenhuma mutação, nenhuma rota, nenhum componente ganha o direito de apagar.

### A exportação sai do servidor por `listCollections()`, porque uma exportação do cache é silenciosamente incompleta — `#d149`

O cliente já lê tudo — a regra permite, vencida ou não — e um `getDocs` por coleção mais
`JSON.stringify` mais um `Blob` seria uma exportação sem rota nenhuma. Não é o que esta spec
faz, por dois motivos:

- **Offline, o cliente devolve o cache e não avisa.** `getDocs` sem rede resolve com o que está
  no IndexedDB, que é o que ela abriu, não o que ela tem. Um arquivo chamado "meus dados" com
  metade dos pedidos é pior que "sem rede, tente de novo": a metade que falta ela só descobre
  quando precisar. A rota no servidor ou devolve tudo ou falha.
- **`listCollections()` não existe no cliente.** No servidor, o documento da conta lista as
  próprias subcoleções, e a exportação é completa por construção: a próxima spec que criar uma
  coleção sob `contas/{id}` entra no arquivo sem ninguém lembrar de acrescentá-la a uma lista.
  É o invariante "todo dado mora em `contas/{contaId}/…`" pagando dividendo.

A resposta é **transmitida por coleção** (`ReadableStream`), e não montada em memória: uma conta
com um ano de uso e as fotos dos produtos gravadas como `data:` URL (`#d109`) passa de alguns
megabytes, e a hospedagem corta resposta não transmitida em 4,5 MB. Por coleção, e não por
documento: dez `enqueue`, não dois mil.

O arquivo é **dado, não tela**: dinheiro sai em centavos inteiros como está gravado (a
formatação é da borda da UI, e um arquivo não é UI), `Timestamp` vira ISO 8601, e as fotos vão
inline como estão. É a forma exata do Firestore, com `id` em cada documento, mais um
`formato: "rende-exportacao/1"` na frente para quem um dia escrever o importador.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` para o bloco de `MeusDados` nos dois
   lugares e para a `Confirmacao` do encerramento. É a modal mais grave do sistema: a única que
   termina com ela fora do app.
2. Ler `/api/assinatura/portal/route.ts` inteiro (55 linhas): é o molde das duas rotas —
   credencial → token → corpo → `abreAConta` → Stripe. E `/api/conta/route.ts`, o
   `garantirConta`: o molde da idempotência.
3. Ler `AuthProvider.tsx:150-176` (`sair`) e `TelaConfiguracao.tsx:850-879` (a prateleira de
   "Sair"): é ali que o componente entra e é a espera de escritas pendentes que o encerramento
   reusa.
4. Ler `scripts/metricas.mjs:21-40` (a varredura de `listUsers`) e `conceder-acesso.mjs`
   inteiro: o script novo é os dois somados, com `--confirmo`.
5. Conferir na documentação do Admin SDK: `DocumentReference.listCollections()` e
   `Firestore.recursiveDelete(ref)` (existe desde `firebase-admin` 10; `BulkWriter` por baixo).
   Conferir no `stripe`: `subscriptions.cancel(id)` — e que cancelar assinatura já cancelada
   dá erro, o que é o motivo do `retrieve` antes.

---

## 3 · Escopo

### 3.1 Os tipos — `src/lib/types/conta.ts`

```ts
export type PlanoDaConta = "TRIAL" | "ASSINATURA";
/** `"ENCERRADA"` é escrita por `/api/conta/encerrar` (spec 029) e lida pelo `AuthProvider` e pela purga. */
export type StatusDaConta = "ATIVA" | "ENCERRADA";

export interface Conta {
  // … o que já existe …
  /**
   * Quando ela encerrou a conta, e o login que pediu. `encerradaPor` é o
   * único lugar do dado que aponta para um `uid`, e existe para a purga saber
   * qual login apagar depois que a claim já saiu (`DECISOES.md#d148`).
   */
  encerradaEm?: Timestamp;
  encerradaPor?: string;
}
```

O comentário de `StatusDaConta` ("A 029 acrescenta o encerramento") sai: acrescentou.

### 3.2 O domínio — `src/lib/domain/meusDados.ts`

Puro, testado, o que as rotas, o componente e a cópia compartilham:

```ts
/** Dias, depois de `encerradaEm`, dentro dos quais a purga roda. É o que `/privacidade` promete. */
export const DIAS_ATE_A_PURGA = 30;

export const FORMATO_EXPORTACAO = "rende-exportacao/1";

/**
 * Prepara um valor do Firestore para `JSON.stringify`: `Timestamp` (qualquer
 * objeto com `toDate()`) vira ISO 8601; arrays e objetos são percorridos;
 * o resto passa como está. Duck-typed de propósito: o domínio não importa
 * Firebase, e o `Timestamp` do Admin SDK e o do cliente têm o mesmo `toDate`.
 */
export function paraExportavel(valor: unknown): unknown;

/** "MyCookie's" + "2026-09-21" → `rende-mycookies-2026-09-21.json`. */
export function nomeDoArquivoDeExportacao(
  nomeDoNegocio: string,
  dataISO: string,
): string;

export type FalhaMeusDados =
  | "sem-acesso"
  | "fora-de-forma"
  | "sem-configuracao" // servidor sem credencial, ou sem Stripe com assinatura no documento
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_MEUS_DADOS: Record<FalhaMeusDados, string>;
```

Testes em `tests/domain/meusDados.test.ts`: `paraExportavel` com um objeto `{ toDate }` falso
dentro de array dentro de objeto (vira string ISO nos três níveis), com `null`, número e string
intocados, e com um `data:` URL que atravessa inteiro; `nomeDoArquivoDeExportacao` com acento,
apóstrofo, espaço e nome vazio (cai em `rende-2026-09-21.json`). Nada de Firebase, nada de
React.

### 3.3 O servidor — as duas rotas

**`GET /api/conta/exportar?contaId=…`** — token conferido, `abreAConta`, sem corpo:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(requisicao: Request) {
  if (!credencialDisponivel()) return falha("sem-configuracao", 500);
  const quem = await conferirToken(requisicao.headers.get("authorization"));
  if (!quem) return falha("sem-acesso", 401);
  const contaId = new URL(requisicao.url).searchParams.get("contaId") ?? "";
  if (!abreAConta(quem, contaId)) return falha("fora-de-forma", 400);

  const documento = adminDb().doc(caminhos.conta(contaId));
  const conta = (await documento.get()).data();
  if (!conta) return falha("fora-de-forma", 400);

  const agora = new Date();
  const codificar = new TextEncoder();
  const fluxo = new ReadableStream({
    async start(controle) {
      const escrever = (texto: string) =>
        controle.enqueue(codificar.encode(texto));
      try {
        escrever(
          `{"formato":${JSON.stringify(FORMATO_EXPORTACAO)},` +
            `"exportadoEm":${JSON.stringify(agora.toISOString())},` +
            `"conta":${JSON.stringify(paraExportavel({ id: contaId, ...conta }))},` +
            `"colecoes":{`,
        );
        const colecoes = await documento.listCollections();
        for (const [indice, colecao] of colecoes.entries()) {
          const docs = (await colecao.get()).docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          escrever(
            `${indice ? "," : ""}${JSON.stringify(colecao.id)}:` +
              JSON.stringify(paraExportavel(docs)),
          );
        }
        escrever("}}");
        controle.close();
      } catch (erro) {
        // O `fetch` do cliente rejeita: nenhum arquivo pela metade chega ao disco.
        controle.error(erro);
      }
    },
  });

  return new Response(fluxo, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${nomeDoArquivoDeExportacao(
        conta.nome,
        agora.toISOString().slice(0, 10),
      )}"`,
    },
  });
}
```

Uma coleção por `enqueue`; `agregados` e `configuracao` entram como as outras — são dela. Não há
cache: cada toque é uma leitura de verdade.

**`POST /api/conta/encerrar`** — `{ contaId }`, na ordem do portal, e depois os três passos do
`#d148`:

```ts
const documento = adminDb().doc(caminhos.conta(contaId));
const conta = (await documento.get()).data() as Conta | undefined;
if (!conta) return falha("fora-de-forma", 400);

// 1. A cobrança, antes de tudo (#d148). Sem Stripe configurado e com assinatura
//    no documento, recusa: a conta não encerra deixando a cobrança acesa.
if (conta.stripeSubscriptionId) {
  if (!stripeDisponivel()) return falha("sem-configuracao", 500);
  const assinatura = await stripe().subscriptions.retrieve(
    conta.stripeSubscriptionId,
  );
  if (assinatura.status !== "canceled") {
    await stripe().subscriptions.cancel(conta.stripeSubscriptionId);
  }
}

// 2. O documento: o que a purga procura e o que o AuthProvider observa.
if (conta.status !== "ENCERRADA") {
  await documento.set(
    {
      status: "ENCERRADA",
      encerradaEm: Timestamp.now(),
      encerradaPor: quem.uid,
      v: VERSAO_SCHEMA,
    },
    { merge: true },
  );
}

// 3. A claim: fora do mapa, ela não lê nem escreve a partir do próximo token.
const auth = adminAuth();
const usuario = await auth.getUser(quem.uid);
const claims = usuario.customClaims ?? {};
const { [contaId]: _c, ...contas } = (claims.contas ?? {}) as Record<
  string,
  string
>;
const { [contaId]: _a, ...acessoAte } = (claims.acessoAte ?? {}) as Record<
  string,
  number
>;
await auth.setCustomUserClaims(quem.uid, { ...claims, contas, acessoAte });

return NextResponse.json({});
```

`contas` fica `{}` e não some: o `AuthProvider` lê `Object.keys(contas)[0]`, e `{}` dá `null` do
mesmo jeito. O webhook do Stripe vai chegar depois do `cancel` (`customer.subscription.deleted`)
e fazer o que faz — escrever `acessoAte[contaId] = agora` na claim e `plano`/ids no documento
por `merge` — sem tocar em `status` nem em `contas`: inofensivo, e nada aqui depende dele.

**`firebaseAdmin.ts`**, cabeçalho: "Só `/api/conta`, o webhook do Stripe e `/api/conta/encerrar`
escrevem no Firestore daqui, só no documento da conta e na claim, nunca em dado de negócio.
`/api/conta/exportar` **lê** dado de negócio — para devolvê-lo a ela, e por mais nada."

### 3.4 O componente — `src/components/conta/MeusDados.tsx`

Um componente, dois lugares. Recebe nada: `useAuth()` dá `usuario`, `contaId`, `conta` e `sair`.
Duas linhas na prateleira, no padrão exato do botão "Sair" de `TelaConfiguracao.tsx:854-872`
(borda, `px-4 py-4`, ícone à esquerda, título e legenda), mais os erros abaixo:

| Linha                    | Ícone      | Legenda                                                                                     |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| **Baixar meus dados**    | `Download` | "Um arquivo com tudo o que você cadastrou: materiais, produtos, pedidos, clientes e caixa." |
| **Encerrar minha conta** | `UserX`    | "Você sai agora, e o que cadastrou é apagado de vez em até 30 dias."                        |

O "30" vem de `DIAS_ATE_A_PURGA`, não da string. "Encerrar" é a única linha do sistema em
`text-negative` com ícone — cor mais ícone mais texto, nunca só cor.

**Baixar**: `fetch` com `authorization: Bearer`, `carregando` no botão; `resposta.ok` →
`await resposta.blob()` → `URL.createObjectURL` → `<a download={nome}>` criado, clicado e
revogado; o nome vem do cabeçalho `content-disposition` (a rota já o calculou) com a reserva
`rende-dados.json`. `!ok` → `codigoDaFalha` no padrão da 027; `TypeError` do `fetch` →
`sem-rede`. A leitura é do servidor, então sem rede o botão diz `sem-rede` e nada é baixado
(`#d149`).

**Encerrar**: abre `Confirmacao` (023, `<dialog>` nativo, o único modal permitido — este é o
caso para o qual ele existe):

- título: **"Encerrar a sua conta?"**
- descrição: "Você sai agora e não entra mais. Materiais, produtos, pedidos, clientes e caixa
  são apagados de vez em até 30 dias. Se quiser guardar, baixe os seus dados antes."
- `rotuloConfirmar`: "Encerrar conta" · `rotuloCancelar`: "Voltar"

Ao confirmar, **antes** do `POST`: `if (!(await escritasSubiram())) { aviso = AVISO_SAIR_PENDENTE; return; }`
— o que ela salvou ontem à noite sem rede não pode ser a última coisa que o encerramento faz
(`#d118`). Depois, `POST /api/conta/encerrar`, `carregando` no botão de confirmar. Em `ok`, o
componente **não chama `sair()`**: o documento acaba de virar `ENCERRADA`, e é o `AuthProvider`
(3.6) quem a tira do app — no mesmo aparelho e em qualquer outro. Em erro, a modal fecha e a
frase aparece abaixo da linha, e o próximo toque bate na mesma rota idempotente.

### 3.5 Onde o componente entra

- **`/configuracao`** (`TelaConfiguracao.tsx`): `<MeusDados />` na prateleira do fim, entre
  "Como funciona" e "Sair". A ordem é a da gravidade: guia, baixar, encerrar, sair — "Sair" fica
  por último porque é o que ela toca sem pensar, e "Encerrar" não pode ser o vizinho de baixo de
  nada que se toque sem pensar. `useGuardaDeSaida` não muda: baixar não suja nada, e encerrar
  passou pela espera de pendentes.
- **`/assinatura`** (`(auth)/assinatura/page.tsx`), nos dois estados `vencida`: abaixo dos
  cartões de preço (ou do "Atualizar pagamento") e acima de "Sair", `<MeusDados />` inteiro. A
  vencida que quer sair tem os dois direitos sem assinar: levar o dado e encerrar. A frase da
  tela ("Tudo o que você cadastrou continua guardado") passa a ser verdade que ela alcança. Nos
  estados `teste` e `assinante` o componente não aparece — `/configuracao` está a um toque.

### 3.6 `AuthProvider.tsx`

- **`escritasSubiram(): Promise<boolean>`** — as sete linhas do `Promise.race` de `sair()`
  extraídas e exportadas no contexto; `sair()` passa a chamá-la. Mesmo corpo, um lugar só.
- **O efeito do encerramento**, ao lado do `useDocumento` da conta:

  ```ts
  // Conta encerrada (#d148): fora, neste aparelho e em qualquer outro que
  // ainda carregue o token. `sair()` limpa o cache, que é o que precisa sumir.
  useEffect(() => {
    if (conta?.status === "ENCERRADA") void sair();
  }, [conta?.status, sair]);
  ```

  É o mesmo desenho do redirecionamento de vencida no `(app)/layout.tsx`: o documento é o
  gatilho, e o provider é o único lugar que tem `conta` e `sair` ao mesmo tempo — vale para
  `/configuracao`, para `/assinatura` e para o computador dela à noite, que vê o documento mudar
  pelo listener antes de o token renovar. Se `sair()` devolver `false` (pendentes que não
  sobem), ela fica onde está, e a próxima renovação do token — no máximo uma hora — a põe na
  tela "Este login ainda não abre nenhuma conta".

- O comentário de `AVISO_SAIR_PENDENTE` passa a contar o `MeusDados` entre os lugares.

### 3.7 O script — `scripts/encerrar-conta.mjs`

```
npm run encerrar-conta -- <contaId>              # ensaio: diz o que apagaria e sai
npm run encerrar-conta -- <contaId> --confirmo   # apaga
```

Importa `auth`, `db` e `semCredencial` de `./admin.mjs`, como os irmãos. Na ordem:

1. Lê `contas/{contaId}`. **Recusa** se não existe ou se `status !== "ENCERRADA"` — é a única
   guarda que importa, e é a que torna impossível apagar `contas/mycookies` por engano: uma
   conta viva não tem esse valor, e nenhum script o escreve. Imprime `nome`, `encerradaEm`, há
   quantos dias, e um aviso se passou de `30` (o prazo prometido já venceu — o número está
   repetido do domínio com o comentário de `metricas.mjs:11`).
2. Lista as subcoleções (`listCollections`) com a contagem de cada (`count()`), e imprime.
3. Acha o login: `auth.getUser(encerradaPor)` — e, por segurança, a varredura de
   `metricas.mjs:21-40` procurando qualquer outro usuário que ainda tenha `contaId` em `contas`
   (não deveria haver; se houver, imprime e trata igual).
4. **Sem `--confirmo`, para aqui.** Com: `db.recursiveDelete(referencia)` (o documento e tudo
   embaixo, em lote); para cada login achado, se `contas` ficar vazio depois de tirar a chave,
   `auth.deleteUser(uid)`; senão, só `setCustomUserClaims` sem a chave (o caso da 030, que
   ainda não existe — uma linha, e evita apagar o login de quem tem outro negócio).
5. Imprime o que apagou. **Não toca no Stripe**: a assinatura já foi cancelada no toque, e o
   `Customer` fica lá — é registro fiscal do Stripe, com a retenção deles.

`package.json` ganha `"encerrar-conta": "node scripts/encerrar-conta.mjs"`; o `CLAUDE.md` ganha
a linha na tabela de comandos, com "exige GOOGLE_APPLICATION_CREDENTIALS".

### 3.8 Os termos e a privacidade — o que o texto precisa afirmar

Continua sendo texto de quem conduz o projeto; esta spec diz o que ele afirma:

- **`/termos`, "os dados são dela":** a qualquer momento, inclusive com o teste vencido, ela
  baixa tudo o que cadastrou em `/configuracao` (ou na tela de assinatura) e encerra a conta
  sozinha; encerrar cancela a assinatura na hora, sem cobrança nova, e o que já foi pago vale
  até o fim do período pago pelo Stripe — sem reembolso proporcional (é a regra padrão; se quem
  conduz quiser reembolsar, é no painel do Stripe, não no código).
- **`/privacidade`, "Por quanto tempo":** enquanto a conta existir; depois de encerrada, os
  dados são apagados de vez **em até 30 dias**, junto com o login; o que fica é o registro de
  pagamento no Stripe, pelo prazo fiscal deles.
- **`/privacidade`, "Os seus direitos":** portabilidade é "Baixar meus dados" (JSON, o formato
  do banco); eliminação é "Encerrar minha conta"; correção é o próprio app; os demais do art. 18,
  pelo contato da primeira seção.

### 3.9 Documentação

- `#d148` e `#d149` em `docs/DECISOES.md`; `#d145` ganha "cumprido na 029: `"ENCERRADA"`";
  `#d144` ganha "a leitura sem prazo é o que a 029 exporta".
- `CLAUDE.md`: a exceção nomeada no invariante e a linha do script na tabela de comandos.
- `docs/ESTADO.md`: a seção da 029, a linha na tabela, a fase 2 fechada em código.
- `docs/saas/ROADMAP.md`: a 029 marcada como entregue, com o que mudou do previsto (a
  exportação é transmitida por coleção via `listCollections()`; `encerradaPor` existe para a
  purga achar o login; o `AuthProvider` é quem tira do app; o componente serve a vencida).
- `docs/DEPLOY.md`: a seção "Encerrar uma conta" — o script, o `--confirmo`, e o prazo.

---

## Roteiro de navegador

Precisa do projeto de verdade, do Stripe em modo de teste com o `stripe listen` rodando, e de
**uma conta de cadastro assinante** (o passo 5 do roteiro da 028 deixa uma). Aparelho em 360px
nos passos 2 e 5.

1. **A conta real continua inteira.** Entrar com `contas/mycookies`: `/configuracao` tem as
   duas linhas novas entre "Como funciona" e "Sair". Não tocar em "Encerrar".
2. **Baixar, a 360px.** "Baixar meus dados" → o navegador salva `rende-mycookies-<hoje>.json`.
   Abrir: `formato`, `exportadoEm`, `conta` com `id` e os campos, `colecoes` com **todas** as
   subcoleções que o console do Firestore mostra (`configuracao`, `insumos`, `fichas`,
   `pedidos`, `clientes`, `listasCompra`, `fornadas`, `transacoes`, `metas`, `agregados`),
   cada documento com `id`, todo `Timestamp` como string ISO, dinheiro em centavos, a foto de um
   produto como `data:` inline. Contar os `insumos` do arquivo contra a tela: bate.
3. **Sem rede.** DevTools Offline → "Baixar meus dados" diz a frase de `sem-rede` e nenhum
   arquivo é salvo.
4. **Sem token.** `curl "/api/conta/exportar?contaId=mycookies"` → 401. Com token de outra
   conta → 400.
5. **Encerrar, a 360px, com a conta assinante.** `/configuracao` → "Encerrar minha conta" →
   a modal com o título, a descrição e os dois botões; "Voltar" fecha; de novo → "Encerrar
   conta" → em segundos, `/login`. Firestore: `status: "ENCERRADA"`, `encerradaEm`,
   `encerradaPor` = o uid; os outros documentos intactos. Authentication: claim `contas: {}` e
   `acessoAte: {}`. Stripe: a assinatura `canceled`; `stripe listen` mostrou `deleted` com 200.
   Entrar de novo com o mesmo e-mail: "Este login ainda não abre nenhuma conta".
6. **Idempotente.** No console do navegador, logada nessa conta (sem conta aberta), dois
   `fetch("/api/conta/encerrar", …)` com o `contaId` antigo: 400 — `abreAConta` recusa, porque
   a claim já não tem a chave. É o esperado: a rota só se repete **antes** do passo 3 do `#d148`,
   e o passo 7 prova esse caso.
7. **O meio do caminho.** Com uma segunda conta de cadastro (sem assinatura): DevTools → Network
   → bloquear `/api/conta/encerrar` → confirmar: a frase de `sem-rede` abaixo da linha, a conta
   inteira. Desbloquear, confirmar de novo: `/login`. Uma conta, um `encerradaEm`.
8. **Pendente.** Terceira conta de cadastro: Offline → lançar em `/financeiro` → voltar Online
   **não** (continuar Offline) → `/configuracao` → "Encerrar" → confirmar: `AVISO_SAIR_PENDENTE`
   e nada enviado. Online → confirmar: `/login`.
9. **O outro aparelho.** Com a conta do passo 7 aberta em duas abas antes de encerrar numa
   delas: a outra vai para `/login` sozinha em segundos.
10. **A vencida.** Vencer uma quarta conta à força (passo 4 do roteiro da 028): `/assinatura`
    com "Seu teste grátis acabou" tem "Baixar meus dados" e "Encerrar minha conta" abaixo dos
    cartões. Baixar funciona (a leitura não tem prazo, `#d144`); encerrar leva a `/login`.
11. **O ensaio do script.** `npm run encerrar-conta -- <contaId do passo 5>`: imprime nome,
    encerrada há N dias, as coleções com contagens, o login, e "Nada foi apagado. Repita com
    --confirmo." `npm run encerrar-conta -- mycookies`: **recusa** ("não está encerrada").
12. **A purga.** `… --confirmo`: o documento e as subcoleções somem do console; o usuário some
    do Authentication; entrar com o e-mail dele dá "usuário não encontrado" (a frase de
    `auth/user-not-found` do login). `npm run metricas` não lista mais a conta.
13. **O recadastro.** Com a conta do passo 7 (encerrada, não purgada): entrar → "sem conta" →
    "Terminar o cadastro" → nome → `/fichas`: uma conta **nova**, `plano: "TRIAL"`, catorze dias.
    A antiga continua `ENCERRADA` esperando a purga. É o efeito colateral aceito do `#d148`.

---

## Critérios de aceite

- [ ] `StatusDaConta` ganha `"ENCERRADA"`; `Conta` ganha `encerradaEm?` e `encerradaPor?`; nada
      mais em `src/lib/types/` muda.
- [ ] `git diff firestore.rules firestore.indexes.json` vazio; `git diff package.json` é a linha
      do script; nenhuma dependência.
- [ ] `GET /api/conta/exportar`: 500 `sem-configuracao`, 401, 400 (sem `contaId`, ou que o token
      não abre); 200 transmitido com `content-disposition: attachment`, `formato`, `conta`, e
      **todas** as subcoleções por `listCollections()`, `Timestamp` como ISO (passo 2).
- [ ] `POST /api/conta/encerrar`: a ordem Stripe → documento → claim; 500 `sem-configuracao`
      com assinatura e sem Stripe; idempotente enquanto a claim ainda abre a conta (passo 7);
      `status` do documento é o único campo de ciclo de vida tocado.
- [ ] `AuthProvider`: `escritasSubiram()` exportada e usada por `sair()`; o efeito de
      `ENCERRADA` tira do app este aparelho e o outro (passo 9).
- [ ] `MeusDados` em `/configuracao` (entre "Como funciona" e "Sair") e nos dois estados
      `vencida` de `/assinatura`; a `Confirmacao` com os textos da 3.4; a espera de pendentes
      antes do `POST` (passo 8).
- [ ] `scripts/encerrar-conta.mjs`: recusa conta sem `status: "ENCERRADA"`; ensaio sem
      `--confirmo`; com ele, `recursiveDelete` mais o login; `contas/mycookies` recusada
      (passo 11).
- [ ] `tests/domain/meusDados.test.ts` cobre a 3.2; `src/lib/domain/meusDados.ts` não importa
      Firebase nem React.
- [ ] Toque de 44px nas duas linhas; `role="alert"` nos erros; "Encerrar" com ícone e texto,
      não só cor.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `build` lista `/api/conta/exportar` e
      `/api/conta/encerrar` dinâmicas.
- [ ] `#d148` e `#d149` escritos; `#d144` e `#d145` anotados; `CLAUDE.md` (invariante e
      comando), `ESTADO.md`, `ROADMAP.md` e `DEPLOY.md` atualizados.
- [ ] **Portão do deploy, fora da sessão:** os parágrafos da 3.8 em `/termos` e `/privacidade`
      escritos — `rg -n "\[texto" src/app` vazio continua sendo o critério da 027.

---

## Fora de escopo

- **Purga automática** (cron varrendo `ENCERRADA` com mais de 30 dias). `#d144` recusou o cron
  por menos; e apagar é a única ação do sistema que deve exigir uma pessoa. Se as contas
  encerradas passarem de uma por semana, o cron nasce com esse caso.
- **Exportar em CSV ou planilha.** Dez coleções com formas diferentes são dez CSVs; o JSON é o
  formato do banco e é o que um importador lê. "Quero no Excel" é pedido de cliente pagante.
- **Importar a exportação** (a conta que fecha e reabre; a migração entre contas). O `formato`
  está no arquivo para esse dia.
- **Reabrir pela tela.** Dentro do prazo é `conceder-acesso.mjs` mais `status` no console.
- **Apagar o login na hora.** O e-mail some na purga; até lá, o arrependimento é barato.
- **Anonimizar em vez de apagar** (manter agregados sem nome para métrica). Sem cinquenta contas
  não há métrica que valha guardar dado de quem pediu para sair.
- **Cancelar ao fim do período em vez de imediato.** Cancelar imediato é o que "encerrar"
  significa; quem quer usar até o fim do que pagou cancela no portal (028) e encerra depois.
  Reembolso proporcional é decisão no painel do Stripe.
- **Apagar o `Customer` do Stripe.** Registro fiscal; a retenção é deles.
- **Fechar a porta do recadastro** (teste novo depois de encerrar). Riscos, abaixo.
- **Coluna `status` em `metricas.mjs`.** Uma conta encerrada some do script na purga; até lá
  aparece como está. Se incomodar, é um `where`.
- **Segundo login na mesma conta** (030): o script já tira só a chave quando `contas` não fica
  vazio, e é tudo o que a 029 sabe sobre isso.
- **Texto jurídico.** A 3.8 diz o que afirmar; quem escreve é quem conduz o projeto.

---

## Decisões desta spec que são fáceis de rejeitar

- **A exportação no servidor, e não no cliente.** O cliente lê tudo e não precisaria de rota —
  mas devolve o cache sem avisar, e não lista coleções. Se um dia a rota pesar (uma conta com
  milhares de pedidos e fotos), a resposta já é transmitida; o próximo passo é `select()` sem as
  fotos e um segundo arquivo com elas.
- **Transmitir por coleção, e não montar em memória.** Vinte linhas contra cinco. O teto de
  4,5 MB da hospedagem para resposta não transmitida é real, e as fotos dos produtos moram no
  documento (`#d109`); uma conta com trinta produtos fotografados encosta nele. Por coleção, e
  não por documento, para que a rota continue legível.
- **Stripe antes do documento.** A alternativa — documento primeiro, "a purga procura" — deixa
  a cobrança viva se o Stripe falhar depois. Uma conta marcada e não cancelada é a pior das
  combinações; uma cancelada e não marcada é um toque a mais.
- **`encerradaPor` no documento.** É um `uid` dentro do dado, que o `CLAUDE.md` desaconselha.
  A alternativa é o script receber o e-mail (`encerrar-conta -- <contaId> <email>`), e quem
  conduz o projeto não tem o e-mail à mão — o documento não o guarda. Um campo escrito uma vez,
  lido uma vez, por um script.
- **O `AuthProvider` tira do app, e não o componente.** O componente podia chamar `sair()` no
  `ok`. Mas o outro aparelho não teria quem o chamasse, e dois lugares chamando `sair()` sobre o
  mesmo evento é uma corrida. O documento é o gatilho, como na vencida.
- **`Confirmacao` (modal), e não uma segunda tela.** É o caso literal do `DESIGN.md`: confirmação
  destrutiva. Uma tela `/encerrar` com "digite ENCERRAR" é o padrão de quem tem muito a perder
  por engano; aqui o engano é reversível por trinta dias.
- **Trinta dias.** Podiam ser sete ou noventa. Trinta é o que cabe numa frase, cobre o
  arrependimento e não obriga quem conduz a rodar o script na semana. É uma constante com nome.
- **`--confirmo` em vez de pergunta interativa.** O script roda em terminal sem `stdin`
  garantido; um flag é o que sobrevive a um `npm run`. O ensaio sem flag é o "tem certeza?".
- **"Baixar" na vencida, e "Encerrar" também.** Podia ser só baixar. Mas a vencida que não vai
  assinar precisa de uma saída além de "Sair", e a LGPD não distingue quem paga.

---

## Riscos

- **Encerrar e recadastrar rende teste novo.** Dentro da janela da purga, o login existe sem
  conta, e `POST /api/conta` abre outra. Uma pessoa que se dá ao trabalho ganha catorze dias;
  quem conduz vê no `metricas.mjs` (duas contas, mesma data de "criada", uma `ENCERRADA`). Se
  virar padrão, `garantirConta` passa a recusar `uid` com conta `ENCERRADA` não purgada — cinco
  linhas, e a spec da vez diz a frase.
- **O `cancel` dá certo e o `set` cai.** Assinatura cancelada, documento `ATIVA`, ela dentro do
  app até o webhook escrever `acessoAte = agora` — aí vira `vencida` com "Não conseguimos renovar
  sua assinatura", que é a frase errada. O próximo toque em "Encerrar" conserta (idempotente), e
  a tela de vencida tem o botão. Raro: são duas chamadas seguidas ao mesmo servidor.
- **O token no outro aparelho vale até uma hora.** Nesse intervalo o outro aparelho escreve
  numa conta `ENCERRADA` — e a purga apaga o que escreveu. O efeito do `AuthProvider` cobre o
  aparelho que está aberto (o listener entrega o documento); o que está fechado e abre dentro da
  hora escreve por minutos, e nada se perde que ela não tenha pedido para perder.
- **`recursiveDelete` numa conta grande.** É `BulkWriter` por baixo, em lotes, e o Admin SDK o
  faz para exatamente isto. Se falhar no meio, rodar de novo: o que sobrou é apagado, e a guarda
  de `status` continua valendo porque o documento pai é o último a sair.
- **`a.download` no app instalado do iPhone.** O Safari em modo standalone abre a folha de
  compartilhar em vez de salvar. É o comportamento do sistema, e o arquivo chega — em "Arquivos"
  ou no WhatsApp. Se não abrir nada, `window.open(url)` é a reserva de uma linha.
- **`listCollections()` e coleção com nome imprevisto.** Só entra o que está sob o documento;
  nada da raiz. É o desenho: exportar é dela, e ela não tem nada fora de `contas/{id}`.
- **A fase 0 ainda não passou no teste, e a 027 não está publicada.** Como a 028: esta spec fica
  no branch com as duas. O que não pode acontecer é publicar `/cadastro` com "Encerrar" e
  "Baixar" ausentes, porque é `/privacidade` que os promete.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o passo 1 provando que `contas/mycookies` não muda e o 11
provando que o script a recusa. Com esta spec, a fase 2 fecha em código: a porta (027), a
cobrança (028) e a saída (029). O que vem depois é a fase 3, e ela só começa com cliente pagante
pedindo; antes, o texto dos termos e da privacidade — agora com três parágrafos a mais —, e
antes de tudo, a gravação.
