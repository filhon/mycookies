# Spec 022 · A segunda conta

**Tipo:** conserto de cromo mais um script — a última spec da fase 0 do `docs/saas/ROADMAP.md`,
e a que abre a porta para a segunda confeiteira. Duas telas relidas (login e "sem conta"), uma
função consertada (`sair()`), um botão que não existia no celular, um script novo
(`scripts/metricas.mjs`) e uma linha a mais no que já existe (`conceder-acesso.mjs` passa a
criar o login). **Nenhum campo, nenhuma rota, nenhuma regra, nenhuma dependência, nenhum arquivo
de `src/lib/domain/`.**
**Tamanho:** uma sessão. O que pesa é `sair()` — a ordem das quatro chamadas e o caso sem rede —
e ver o script rodar contra o projeto de verdade.
**Origem:** `#d111` ("o que muda é só a cópia que presume uma única dona"), `#d113` ("a segunda
conta vem depois") e a linha da tabela de dívidas: "`sair()` não limpa o cache do IndexedDB —
em aparelho compartilhado vira vazamento".
**Depende de:** a fase 0 passar no teste — a Maynara, conta nova, celular dela, ninguém ao lado,
tela gravada, zero perguntas em voz alta. **Em 2026-09-16 a gravação ainda não aconteceu.** A
spec é escrita agora, por pedido; a sessão roda depois do teste, ou antes por decisão de quem
conduz o projeto, como a 019 rodou sem esperar a gravação. Nada aqui muda o que o teste mede:
a segunda confeiteira só entra quando ele passar.
**Aprovações pedidas:** nenhuma. **Duas decisões a registrar**, `#d118` (sair apaga o cache e
espera a fila subir) e `#d119` (o convite é o link de senha).

---

## Problema

O sistema está pronto para uma segunda conta desde a spec 000 (`contas/{contaId}`, claim por
conta, `#d14`), e nunca teve uma. O que impede não é infraestrutura: são quatro coisas que só
aparecem quando a pessoa que entra não é quem construiu.

1. **O login diz "Acesso restrito à administradora da MyCookie's."** É verdade hoje e mentira
   no dia seguinte. Para a segunda confeiteira, é a tela dizendo que ela está no lugar errado.
2. **A tela "Este login ainda não abre nenhuma conta" ensina a rodar
   `npm run conceder-acesso -- <email> <id-da-conta>`** (`src/app/(app)/layout.tsx:68`). É
   instrução de desenvolvedor na tela de quem nunca abriu um terminal. O botão "Já liberaram meu
   acesso" e a frase "Assim que rodarem o comando" são certos; o comando na frente dela, não.
3. **`sair()` é só `signOut()`** (`AuthProvider.tsx:129`). O cache persistente do Firestore
   (`persistentLocalCache`, `client.ts:56`) fica no IndexedDB com todos os documentos da conta:
   materiais, produtos, pedidos, clientes, caixa. No notebook da família ou no celular que a
   ajudante usa, sair não tira nada de lá — o próximo login, com outra conta, começa com o cache
   da anterior no disco. E **no celular não há como sair**: o único "Sair" do sistema está na
   barra lateral, que é `lg:` para cima. A tela "sem conta" tem o dela, mas ela não tem conta.
4. **Não há como saber o que a segunda conta fez.** O roadmap (seção 6) define quatro métricas
   que saem de um script — tempo até o primeiro preço próprio, retenção D30, produtos por conta,
   pedidos no mês — e o script não existe. Sem ele, "a segunda confeiteira chegou ao preço?" se
   responde perguntando a ela.

E uma quinta, que o roadmap não nomeia e que aparece ao percorrer o convite de ponta a ponta:
**`conceder-acesso.mjs` vincula um login que já existe e não cria a pessoa** (comentário na
linha 133). Para a segunda conta, o caminho é: rodar o script, ver falhar, abrir o console do
Firebase, criar o usuário com uma senha inventada, rodar de novo, mandar a senha por WhatsApp,
e ela não tem onde trocá-la — o app não tem tela de senha, só "Esqueci minha senha" no login. O
convite passa por uma senha que quem convida conhece.

**O que esta spec entrega:** o login e a tela "sem conta" sem presumir dona nem terminal;
`sair()` apagando o cache e recusando sair enquanto houver escrita que não subiu; "Sair" no
celular; `conceder-acesso.mjs` criando o login sem senha, de modo que o convite seja "abre o
app, toca em 'Esqueci minha senha'"; e `npm run metricas`.

**O que esta spec não entrega:** cadastro (027), cobrança (028), papel de ajudante (030),
seletor de conta, tela de perfil ou de senha. A segunda conta continua entrando por `node`, que
é o que `#d16` e `#d111` previram.

---

## O que sai da frente de quem está começando (`#d113`)

- **Uma frase que diz que o lugar não é dela.** "Acesso restrito à administradora" sai; entra o
  que fazer na primeira vez.
- **Um comando de terminal**, na única tela que uma convidada sem claim vê.
- **Entra uma linha ao pé de `/configuracao`**, "Sair", abaixo de "Como funciona": três toques a
  partir da tela Hoje, depois de tudo. Na frente de quem está começando, nada. É a mesma
  prateleira em que a 8B pôs o guia no celular, pelo mesmo motivo (cinco destinos é o teto).

---

## 1 · O que esta spec decide

### Sair apaga o cache, e espera a fila subir antes — `#d118`

`sair()` passa a ser quatro chamadas na ordem: `waitForPendingWrites` → `signOut` → `terminate`
→ `clearIndexedDbPersistence`, e uma navegação dura para `/login` no fim. A navegação é
`window.location.replace`, não `router`: depois de `terminate` nada do que está montado pode
falar com o Firestore, e o singleton `dbCache` de `client.ts` aponta para uma instância morta.
Recarregar a página é o único jeito de nenhum dos dois sobreviver, e é uma linha.

**Sem rede e com escrita pendente, sair é recusado — não confirmado.** O invariante do projeto é
que a escrita despacha e não espera (`#d80`, `#d104`); a fila mora no mesmo IndexedDB que vai
ser apagado. Apagar com a fila cheia é perder o que ela salvou hoje, e não existe versão disso
que seja "sair com segurança": o dado só existe neste aparelho. Então `waitForPendingWrites`
com um teto de 5 s; estourou, `sair()` devolve `false` e a tela diz "O que você salvou ainda não
subiu. Conecte à internet e tente sair de novo." Sem pendência, sair funciona offline normalmente
— `waitForPendingWrites` resolve na hora quando a fila está vazia. Modal de confirmação
destrutiva ("sair mesmo assim e perder") seria o lugar certo pelo `DESIGN.md`, e é o que a spec
recusa: não há caso em que perder o dia de trabalho seja a escolha certa.

### O convite é o link de senha — `#d119`

`conceder-acesso.mjs` cria o login quando ele não existe, **sem senha** (`auth.createUser({
email })`), e imprime a instrução: "Mande ela abrir a tela de login e tocar em 'Esqueci minha
senha' com esse e-mail — o link que chega cria a senha." O texto de `AVISO_ENVIO` no login já
diz "o link para criar uma senha nova"; nada muda nele. A senha nasce com ela, ninguém a
conhece, e o console do Firebase sai do caminho. A tela "sem conta" continua existindo como rede
de segurança — login criado por outro meio, claim removida —, mas deixa de ser a porta normal:
com o script fazendo login, conta e claim de uma vez, a convidada cai direto na tela Hoje.

### O script de métricas lê e imprime, e não existe tela

`scripts/metricas.mjs` é irmão de `conceder-acesso.mjs`: Admin SDK, credencial pelo mesmo
caminho, `console.table`. Quem lê é quem conduz o projeto, uma vez por semana, durante o beta.
Nenhum agregado novo é gravado, nenhuma rota, nenhum componente: o dia em que essas contas
precisarem de tela é o dia em que houver cinquenta contas, e é outra spec.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` para as duas telas relidas e a linha nova
   em `/configuracao`. É cromo; é onde uma frase a mais vira ruído.
2. `rg -n "MyCookie" src/` — a lista do que ainda presume a dona. Esperado: o logotipo, a barra
   lateral ("MyCookie's · Biscoitos artesanais"), o `manifest.ts` e o login. **Só o login muda**:
   os outros são a marca do produto (`#d111`), e ficam.
3. DevTools → Application → IndexedDB, logado: anotar o nome do banco do Firestore
   (`firestore/[DEFAULT]/<projeto>/main`) — é o que o passo 4 do roteiro confere sumindo. E
   Cache Storage: conferir se o cache de runtime do service worker (`defaultCache` do Serwist,
   `sw.ts:18`) guarda alguma resposta de `firestore.googleapis.com`. Se guardar, `sair()` ganha
   um `caches.delete` desse cache e a spec registra; se não guardar, nada.

---

## 3 · Escopo

### 3.1 O login — `src/app/(auth)/login/page.tsx:116`

A linha sob "Entrar no sistema" vira:

> Só entra quem foi convidada. Na primeira vez, toque em "Esqueci minha senha" para criar a sua.

Duas frases: a primeira responde "onde eu crio a conta?" antes de a pergunta ser feita em voz
alta — não há cadastro, e dizer isso é melhor do que deixar procurar; a segunda é o convite da
`#d119`, escrito onde a convidada está quando precisa dele. O botão "Esqueci minha senha" não
muda de nome: a frase acima é a ponte. Nada mais na tela muda — o painel de marca, o logotipo e
"O preço certo de cada doce" são do produto.

### 3.2 A tela "sem conta" — `src/app/(app)/layout.tsx:53-103`

- O parágrafo vira: "Você entrou com **{usuario.email}**, mas esse e-mail ainda não está
  ligado a nenhum negócio. Avise quem te convidou e, quando liberarem, confira de novo aqui." O
  e-mail continua na tela, em texto e não em `<code>`: é o que ela precisa dizer a quem vai
  rodar o script.
- "Ainda não. Assim que rodarem o comando, é só conferir de novo." → "Ainda não. Assim que
  liberarem, é só conferir de novo."
- O título, o ícone, "Já liberaram meu acesso", a frase de sem conexão e "Sair" ficam. O
  comentário acima do bloco ("Esta tela existe para que a falha apareça como instrução") continua
  verdadeiro e fica.

### 3.3 `sair()` — `src/providers/AuthProvider.tsx`

```ts
import {
  clearIndexedDbPersistence,
  terminate,
  waitForPendingWrites,
} from "firebase/firestore";
import { obterAuth, obterDb } from "@/lib/firebase/client";

/** Quanto esperar a fila de escritas subir antes de recusar a saída. */
const ESPERA_PENDENTES_MS = 5_000;

/**
 * Sai e apaga o cache local. Resolve `false` — e não sai — quando há escrita
 * que ainda não subiu: o cache que vai ser apagado é onde ela mora (`#d118`).
 * Quando sai, não resolve: a página é recarregada em `/login`.
 */
const sair = useCallback(async (): Promise<boolean> => {
  const db = obterDb();
  const subiu = await Promise.race([
    waitForPendingWrites(db).then(() => true),
    new Promise<boolean>((r) =>
      setTimeout(() => r(false), ESPERA_PENDENTES_MS),
    ),
  ]);
  if (!subiu) return false;

  try {
    await signOut(obterAuth());
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } finally {
    // Navegação dura, não `router`: nada do que está montado sobrevive a um
    // Firestore terminado, e o singleton de `client.ts` também não.
    window.location.replace("/login");
  }
  return true;
}, []);
```

- A assinatura em `ContextoAuth` vira `sair: () => Promise<boolean>`, com o mesmo contrato de
  `reconferirAcesso`: `false` é "não deu, e a tela diz por quê".
- `AVISO_SAIR_PENDENTE` ao lado de `MENSAGENS`, exportada: "O que você salvou ainda não subiu.
  Conecte à internet e tente sair de novo." Os três lugares que chamam `sair()` a mostram num
  `<p aria-live="polite">` quando recebem `false`, e desabilitam o botão enquanto esperam. A
  mensagem é o estado: nada depende de cor.
- `signOut` antes de `terminate`, de propósito: com o usuário nulo o layout desmonta toda tela
  autenticada e as assinaturas de `useColecao` se cancelam; cancelar assinatura numa instância
  terminada é no-op, abrir uma nova não é. A navegação dura no `finally` cobre o que sobrar —
  inclusive `clearIndexedDbPersistence` recusando (`failed-precondition`, seção Riscos).
- Nada de `localStorage`: o app não usa (`rg localStorage src/` só acha um comentário). A sessão
  do Auth mora no IndexedDB dele e `signOut` já a apaga.

### 3.4 "Sair" no celular — `src/components/configuracao/TelaConfiguracao.tsx:675`

Abaixo do cartão "Como funciona", com o mesmo formato (borda, ícone à esquerda, título e
descrição), um `<button>` e não um `Link`:

- Ícone `LogOut`; título "Sair"; descrição "Você entrou como {usuario.email}."
- `onClick` chama `sair()`; `false` mostra `AVISO_SAIR_PENDENTE` abaixo do cartão; enquanto
  espera, `disabled` e `aria-busy`.
- Visível em todo tamanho, como "Como funciona" — no desktop duplica a barra lateral, e é assim
  que o guia já é. Alvo de toque: o cartão inteiro, 44px no mínimo.
- `BarraLateral.tsx:102` e o "Sair" da tela "sem conta" passam a tratar o `false` do mesmo
  jeito. Na barra lateral, a linha aparece abaixo do botão, no lugar do e-mail, enquanto durar.

### 3.5 `scripts/conceder-acesso.mjs` cria o login

```js
// O login nasce aqui, sem senha: ela cria a dela pelo link de "Esqueci minha
// senha" no app, e ninguém precisa conhecê-la (`#d119`).
let usuario;
try {
  usuario = await auth.getUserByEmail(email);
} catch (erro) {
  if (erro.code !== "auth/user-not-found") throw erro;
  usuario = await auth.createUser({ email });
  console.log(`Login criado para ${email}, sem senha.`);
  console.log(
    'Mande ela abrir a tela de login e tocar em "Esqueci minha senha" com esse e-mail:\n' +
      "o link que chega cria a senha.",
  );
}
```

- O `else if` de `auth/user-not-found` no `catch` de baixo sai — deixou de ser falha.
- O comentário de cabeçalho e o `USO` dizem que o script cria o login. A linha "O script vincula
  um login que já existe; ele não cria a pessoa" sai.
- **`scripts/admin.mjs`**: o preâmbulo que os dois scripts repetem — `loadEnvFile`, a checagem
  do caminho de `GOOGLE_APPLICATION_CREDENTIALS`, `initializeApp` — vira um módulo que exporta
  `auth`, `db` e `semCredencial` (para a dica no `catch`). Vinte linhas em um lugar em vez de
  dois; a 029 já tem o terceiro script anotado.

### 3.6 `scripts/metricas.mjs`

Uma linha por conta, ordenada por `criadaEm`, em `console.table`:

| Coluna        | De onde sai                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| conta         | `contas/{id}` — o id e `nome`                                                                         |
| criada        | `criadaEm`, `YYYY-MM-DD`                                                                              |
| último login  | `auth.listUsers()` paginado → `customClaims.contas` → o maior `metadata.lastSignInTime` da conta      |
| materiais     | `insumos` com `arquivado == false`, `.count()`                                                        |
| produtos      | `fichas` com `arquivado == false`, `.count()`                                                         |
| pedidos 30d   | `pedidos` com `criadoEm >= hoje − 30 dias`, `.count()` — arquivado conta: foi atividade               |
| 1º produto    | `fichas` `orderBy("criadoEm")` `.select("criadoEm")` — o primeiro                                     |
| 1º próprio    | o primeiro da mesma lista cujo id **não** começa com `biblioteca-`                                    |
| dias até o 1º | `1º próprio − criada`, em dias inteiros; "—" sem produto próprio. **É a métrica da fase 0 em número** |
| login 30d     | "sim"/"não" se a conta tem mais de 30 dias, "—" se não tem — é a retenção D30 do roadmap              |

- `PREFIXO_BIBLIOTECA = "biblioteca-"` repetido no script com o comentário apontando para
  `src/lib/domain/biblioteca.ts:14`, pelo mesmo motivo que `contas/{contaId}` está repetido em
  `conceder-acesso.mjs`: o script roda fora do app e não importa TypeScript.
- Nenhuma consulta pede índice composto: cada uma filtra ou ordena por um campo só, e o índice
  de campo único é automático. Custo: um documento por conta, um `count` por coluna, e os
  produtos da conta em projeção — nada que se note.
- `package.json`: `"metricas": "node scripts/metricas.mjs"`. `CLAUDE.md`, seção Comandos, ganha
  a linha, com a mesma nota de credencial de `conceder-acesso`.
- `console.table` é do Node. Sem dependência, sem cor, sem argumento: a saída inteira cabe numa
  tela enquanto houver menos de trinta contas.

### 3.7 Documentação

- `#d118` e `#d119` em `docs/DECISOES.md`.
- `docs/ESTADO.md`: a seção da 022, a linha 22 na tabela de módulos, a linha "`sair()` não limpa
  o cache" **sai** da tabela de dívidas, a nota de operação "para trocar a proprietária" passa a
  dizer que o script também cria o login, e a próxima ação aponta para a fase 1 (a 023, e as
  entrevistas antes dela).
- `docs/saas/ROADMAP.md`: a 022 marcada como entregue, e o item ganha as duas linhas que a spec
  acrescentou ao que ele previa (o login criado sem senha; "Sair" no celular).

---

## Roteiro de navegador

Precisa da **conta real**, de um **e-mail sem login** (para o convite de ponta a ponta) e de
`GOOGLE_APPLICATION_CREDENTIALS` no `.env.local`. Aparelho em 360px no passo 7.

1. **`/login`, deslogada.** A linha sob o título diz o texto da 3.1; "administradora" não
   aparece em tela nenhuma (`rg -n administradora src/` vazio).
2. **O convite de ponta a ponta.** `npm run conceder-acesso -- nova@exemplo.com conta-teste
"Teste" Nome` com um e-mail que não existe no Authentication: o script cria o login, a conta e
   a claim, e imprime a instrução. Em `/login`, "Esqueci minha senha" com esse e-mail → o link
   chega → criar a senha → entrar. Cai na tela Hoje com o cartão do caminho, passo 1, botão da
   biblioteca. A tela "sem conta" **não** aparece.
3. **A rede de segurança.** No console do Firebase, remover a claim desse login (ou criar outro
   login à mão, sem rodar o script) e entrar: a tela "sem conta" diz o e-mail em texto, "avise
   quem te convidou", e nenhum `npm`. "Já liberaram meu acesso" → "Ainda não. Assim que
   liberarem…". Rodar o script; tocar de novo → entra sem sair.
4. **Sair no desktop, online.** Conta real, DevTools → Application → IndexedDB: o banco do
   Firestore está lá com as coleções. Barra lateral → Sair. Cai em `/login` por recarga (a barra
   de endereço pisca). IndexedDB: o banco do Firestore **sumiu** (ou está vazio); o do Auth
   (`firebaseLocalStorageDb`) sem usuário. Entrar de novo: as listas carregam do servidor.
5. **Sair offline, sem pendência.** Entrar, esperar as listas, DevTools em Offline sem mexer em
   nada, Sair: sai normalmente e `/login` abre do service worker.
6. **Sair offline, com pendência.** Online, entrar; Offline; corrigir o preço de um material
   (despacha, `#d104`); Sair: **não sai**, a linha de `AVISO_SAIR_PENDENTE` aparece abaixo do
   botão, o botão volta a ficar vivo. Online; esperar o selo de pendência sumir; Sair: sai. Entrar
   de novo: o preço corrigido está lá. É o passo que prova o `#d118`.
7. **Celular, 360px, app instalado.** Tela Hoje → engrenagem → `/configuracao` → rolar até o pé:
   "Como funciona" e, abaixo, "Sair" com "Você entrou como …". Tocar: `/login`. É a primeira vez
   que dá para sair do app no celular.
8. **`npm run metricas`.** A tabela com a conta real e a `conta-teste` do passo 2: criada,
   último login de hoje, materiais e produtos com os números de `/insumos` e `/fichas`, "1º
   próprio" da conta real com uma data, e "dias até o 1º" da `conta-teste` em "—" enquanto ela
   só tem a biblioteca. Criar um produto à mão na `conta-teste`, rodar de novo: "0".
9. **Duas abas.** Conta real em duas abas do mesmo navegador; Sair numa delas: a outra vai para
   `/login` sozinha (o Auth sincroniza entre abas). Se a outra mostrar erro em vez de `/login`,
   é o risco da seção Riscos, e a spec registra o que apareceu.

---

## Critérios de aceite

- [x] `rg -n "administradora|conceder-acesso" src/` devolve só `mutations/conta.ts:8`
      (comentário).
- [x] A tela "sem conta" mostra o e-mail em texto, diz "avise quem te convidou", e mantém "Já
      liberaram meu acesso" e "Sair".
- [x] Depois de sair, o banco do Firestore não existe no IndexedDB (passo 4), online e offline
      (passo 5).
- [x] Offline com escrita pendente, sair é recusado com a frase, e nada se perde (passo 6).
- [x] "Sair" alcançável no celular a partir de `/configuracao`, alvo de 44px, com o e-mail.
- [x] `conceder-acesso` com e-mail sem login cria o login sem senha, imprime a instrução, e o
      link de "Esqueci minha senha" cria a senha (passo 2). Com e-mail que já tem login, o
      comportamento de antes.
- [x] `npm run metricas` imprime as dez colunas para toda conta; "1º próprio" ignora ids
      `biblioteca-`; nenhuma consulta pede índice.
- [x] `git diff src/lib/domain/ src/lib/types/ src/lib/firebase/mutations/ firestore.rules
firestore.indexes.json` vazio. `package.json` só com a linha do script. `npm test` com os
      mesmos 526 testes.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d118` e `#d119` escritos; `ESTADO.md` (dívida removida, linha 22, próxima ação na fase 1),
      `ROADMAP.md` e `CLAUDE.md` (comando) atualizados.

---

## Fora de escopo

- **Cadastro self-serve, termos, `plano`/`status`/`trialAte`.** Spec 027, fase 2. A segunda
  conta entra por `node` (`#d16`, `#d111`).
- **Tela de perfil, trocar senha, trocar e-mail.** "Esqueci minha senha" no login já é o único
  caminho, e serve.
- **Seletor de conta, papel `AJUDANTE`.** `contaAtivaDaClaim` continua pegando a primeira chave;
  o comentário dela já diz onde o seletor entra (030).
- **A marca no cromo** — logotipo, "MyCookie's · Biscoitos artesanais" na barra lateral, o
  `manifest.ts`. É a marca do produto (`#d111`). Se a segunda confeiteira estranhar, é uma linha
  em `#d117`, e não desta spec.
- **Modal "sair mesmo assim" para o caso offline com pendência.** Recusado de propósito
  (`#d118`).
- **Limpar o cache ao trocar de conta sem sair.** Não existe troca de conta.
- **Métrica na tela, agregado de métricas, cron.** O script é lido por uma pessoa uma vez por
  semana.
- **QR da NFC-e, Stripe, e-mail transacional.** Outras specs, e o e-mail de senha é o do
  Firebase, com o template dele.

---

## Decisões desta spec que são fáceis de rejeitar

- **Recusar sair em vez de confirmar.** O `DESIGN.md` reserva o modal para confirmação
  destrutiva, e esta é uma. A spec recusa porque "perder o que salvei hoje" nunca é a escolha
  certa e um modal a ofereceria como se fosse. O preço: em aparelho compartilhado, sem rede, com
  pendência, ela não consegue sair até ter rede — e é exatamente o que deve acontecer.
- **Cinco segundos de teto.** Curto o bastante para a barra não parecer travada, longo o
  bastante para uma fila de uma dúzia de escritas subir em 4G. Se recusar com rede boa, ela toca
  de novo; se a fila for grande, dez segundos, e a spec registra.
- **Navegação dura em vez de reiniciar o singleton.** A alternativa é `dbCache = undefined` em
  `client.ts` mais garantir que nenhuma assinatura viva pegue a instância morta. É mais código
  para o que uma recarga faz de graça, e sair é o único momento do sistema em que recarregar é
  aceitável.
- **O script cria o login.** Não estava no roadmap; apareceu ao percorrer o convite. Sem isso, a
  "segunda conta" passa por uma senha inventada no console e mandada por WhatsApp. Uma chamada,
  e o console do Firebase sai do caminho.
- **`createUser({ email })` sem senha, contando com o reset.** É o padrão de convite do Firebase
  Auth. Se o link de "Esqueci minha senha" não criar senha num login que nunca teve uma (o
  roteiro, passo 2, decide), o script cria com `crypto.randomUUID()` como senha e não a imprime
  — mesmo efeito, uma linha.
- **"Sair" em `/configuracao`, e não no cabeçalho da tela Hoje.** É onde o celular já busca o
  que não cabe no menu (o guia), e é o lugar mais longe de quem está começando. Sair é raro;
  ficar visível na tela Hoje seria um botão de "ir embora" na porta.
- **A linha do login diz que não há cadastro.** "Só entra quem foi convidada" pode soar
  fechado. A alternativa é não dizer nada e deixar a pessoa procurar "criar conta" numa tela que
  não tem — que é uma pergunta em voz alta.
- **`scripts/admin.mjs`.** Dois scripts com vinte linhas iguais viram três com a 029. Se
  parecer cedo, os vinte linhas se repetem e a spec diz.
- **Pedidos dos últimos 30 dias por `criadoEm`, contando arquivados.** "Atividade" é ela ter
  registrado, e não o pedido ter sobrevivido. Filtrar `arquivado` pediria índice composto para
  uma coluna de leitura semanal.

---

## Riscos

- **`clearIndexedDbPersistence` com outra aba aberta.** O IndexedDB é um só entre as abas
  (`persistentMultipleTabManager`). Apagar numa aba enquanto a outra o segura pode recusar com
  `failed-precondition`; o `finally` navega mesmo assim, e o cache fica até a próxima saída. A
  outra aba recebe `versionchange`, fecha o banco e vai para `/login` pelo Auth. O passo 9 é o
  que diz se é isso mesmo.
- **O cache de runtime do service worker.** Se o passo 3 da seção 2 achar respostas de
  `firestore.googleapis.com` em Cache Storage, o vazamento tem uma segunda porta e `sair()`
  ganha um `caches.delete`. A leitura de hoje é que o `defaultCache` do Serwist não guarda
  streams do WebChannel — mas é leitura, e não prova.
- **`waitForPendingWrites` "mente" com Wi-Fi sem internet.** `navigator.onLine` diz online e a
  fila não sobe; o teto de 5 s pega esse caso, com a mesma frase.
- **Uma frase de recusa em três lugares.** É a mesma constante; o risco é um dos três não
  mostrar. O passo 6 testa a barra lateral; `/configuracao` e a tela "sem conta" ficam por conta
  da revisão — a "sem conta" nunca tem pendência, porque não tem conta para escrever.
- **`listUsers` num projeto com muitos logins.** Paginado a mil, e o beta tem cinco. Se um dia
  pesar, a claim continua sendo a única fonte de "quem abre esta conta", e o script é onde a
  paginação já está.
- **A gravação da fase 0 ainda não aconteceu.** Esta spec não a substitui e não a atrapalha:
  nada do que ela muda está no caminho da conta nova até o preço, exceto a linha do login, que
  só tira uma pergunta.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com os passos 5 e 6 em Offline e o 7 no aparelho, e a saída de
`npm run metricas` contra o projeto de verdade colada no `ESTADO.md` — é a primeira vez que o
"tempo até o primeiro preço próprio" da seção 6 do roadmap vira um número, e a conta real é a
primeira linha dele. Com esta spec a fase 0 fecha em código; o que a fecha de verdade continua
sendo a gravação, e o que vem depois é a fase 1: a 023 e, antes dela, as cinco a oito
entrevistas.
