# Spec 043 · Entrar com o Google

**Tipo:** um segundo jeito de entrar e de criar a conta, com o provedor Google do Firebase Auth,
que está no SDK instalado. Um botão no login e no cadastro, um `rewrites` em `next.config.ts`,
uma variável de ambiente trocada, a configuração no console do Firebase e do Google Cloud.
**Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão de código, e o roteiro de aparelho é o portão do deploy.
**Origem:** crítica do `/impeccable` sobre `/login` (2026-09-25). É o que mais pesa entre o que
os serviços de assinatura têm e o Rende não tem.
**Depende de:** a 041. **O domínio próprio decidido** (`#d178`): o `authDomain` passa a ser o
domínio do app, e trocá-lo depois é refazer o console.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`, mas **é superfície de autenticação
nova**, e quem conduz o projeto aprova a spec antes da sessão (seção "Riscos", item 1).
**Três decisões a registrar:** `#d198` a `#d200`.

---

## Problema

Hoje só há e-mail e senha. Para quem vive no celular:

- **Criar a conta** é digitar e-mail e inventar senha num teclado de celular, e o `#d142` já
  cortou tudo o que dava para cortar do formulário. O que sobra é a senha.
- **Voltar** depois de trocar de aparelho é lembrar uma senha que ela usou uma vez. O Android
  dela já está logado no Google; o iPhone, quase sempre também.

Hotmart, Kiwify, Canva, Notion, Nuvemshop: todo serviço que vende assinatura para pequeno
negócio no Brasil tem "Continuar com o Google" em cima do formulário. Não é luxo, é a porta que
ela já sabe usar.

---

## 1 · O que esta spec decide

### Google, e só o Google — `#d198`

Pesados:

1. **Link mágico por e-mail** (`sendSignInLinkToEmail`). O link abre no navegador, e não no app
   instalado: a sessão nasce no lugar errado. Recusado.
2. **Apple.** Exige conta paga de desenvolvedor Apple e configuração de chave. Fica para quando
   a `metricas` mostrar iPhone sem conta Google, o que é raro no público.
3. **Google.** Escolhido. Um provedor, no SDK instalado, e o que o Android dela já tem.

E-mail e senha continuam: é o caminho de quem já tem conta e de quem não quer o Google.

### Popup, com o `authDomain` no domínio do app — `#d199`

`signInWithPopup(obterAuth(), new GoogleAuthProvider())`, com `prompt: "select_account"`.

O `authDomain` hoje é `{id-do-projeto}.firebaseapp.com`. Com ele:

- a tela de escolha de conta do Google diz **"para continuar em {id-do-projeto}.firebaseapp.com"**,
  com o nome de antes da marca (`#d122`);
- Safari e Chrome bloqueiam armazenamento de terceiros, e o fluxo de login entre o domínio do app
  e o `firebaseapp.com` quebra de jeitos diferentes em cada navegador.

A saída é a que a documentação do Firebase recomenda: **servir `/__/auth/*` pelo próprio
domínio**, com `rewrites` em `next.config.ts` para `https://{id-do-projeto}.firebaseapp.com/__/auth/:path*`,
e `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` passa a ser o domínio do app. A tela do Google passa a dizer
"para continuar em {domínio do Rende}".

O service worker não pode responder `/__/auth/*` com o cache nem com a página offline: a sessão
confere e, se precisar, exclui o caminho.

### A conta de senha que entra pelo Google continua sendo a mesma — `#d200`

Com "uma conta por e-mail" (o padrão do Firebase, e o do projeto), entrar com o Google num e-mail
que já tem senha **não cria outro login**. O Google é provedor confiável para Gmail, e como as
contas de senha do Rende não têm e-mail verificado (`#d142`), o Firebase **troca** o provedor:
o `uid` fica, a claim fica, os dados ficam, e **a senha deixa de valer**. "Esqueci minha senha"
a devolve.

Isso é aceitável, e é preciso saber: a Maynara, que entra com senha, se tocar no Google uma vez,
passa a entrar pelo Google. A spec não esconde: é o passo 6 do roteiro, com uma conta de teste,
**antes** de publicar, conferindo `uid` e claim iguais no console.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, e usar `/impeccable` (registro **product**).
2. Ler `login/page.tsx` e `cadastro/page.tsx` depois da 041, `AuthProvider.tsx`,
   `src/lib/firebase/client.ts`, `next.config.ts` e o service worker.
3. Ler, na documentação do Firebase, "Práticas recomendadas para usar signInWithRedirect em
   navegadores que bloqueiam o acesso ao armazenamento de terceiros" (a opção do proxy) e
   "Vincular várias contas" (o comportamento de provedor confiável).

---

## 3 · Escopo

### 3.1 O botão — `src/components/auth/BotaoGoogle.tsx`

Secundário (`variante="secundaria"`), largura total, 52 px, o "G" oficial do Google em SVG
inline (a marca do Google exige o logotipo nas cores dele; é a única cor fora dos tokens, e o
comentário diz por quê), texto **"Continuar com o Google"**. Recebe `aoEntrar(usuario)`.

Popup fechado pela própria pessoa (`auth/popup-closed-by-user`, `auth/cancelled-popup-request`):
nada acontece, sem erro. Popup bloqueado (`auth/popup-blocked`): "O navegador bloqueou a janela
do Google. Toque de novo, ou entre com e-mail e senha." Os códigos entram em `MENSAGENS`.

### 3.2 O login

O `BotaoGoogle` em cima do formulário, depois uma divisória com "ou com e-mail" em
`text-label text-ink-muted`. O primário âmbar continua sendo "Entrar": um primário por tela.

Depois do Google: `reconferirAcesso()`. Com conta, `router.replace("/")`. **Sem conta,
`router.replace("/cadastro")`**: quem nunca criou conta e tocou no Google no login é uma
cadastrada que ainda não terminou, e o cadastro já tem esse estado.

### 3.3 O cadastro

O mesmo `BotaoGoogle`, com a mesma divisória. Depois do Google, a tela já cai no estado
"terminando" que a 027 fez para o `POST` que caiu no meio: sem e-mail e senha, com "Seu nome",
"Nome do negócio" e os termos. **O nome vem preenchido com o `displayName`**, editável. A caixa
dos termos continua obrigatória: é o ato dela (`#d142`), e o Google não a substitui.

A frase do estado "terminando" muda de "Você entrou como {email}. Falta só dizer o seu nome." para
"Você entrou como {email}. Confira o seu nome e aceite os termos.", que serve aos dois caminhos.

### 3.4 O domínio — `next.config.ts`, `.env.local.example`, `docs/DEPLOY.md`

- `rewrites` de `/__/auth/:path*` e `/__/firebase/:path*` para o `firebaseapp.com` do projeto.
- `.env.local.example` explica que, em produção, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` é o domínio
  do app; no desenvolvimento local continua o `firebaseapp.com`.

### 3.5 Console (quem conduz o projeto), em `docs/DEPLOY.md`

1. Firebase → Authentication → Métodos de login → Google: ativar; e-mail de suporte do projeto.
2. Google Cloud → Tela de consentimento OAuth: nome **Rende**, logotipo, e-mail de suporte,
   links de `/privacidade` e `/termos`, domínio autorizado.
3. Google Cloud → Credenciais → o cliente OAuth da web: URI de redirecionamento
   `https://{domínio}/__/auth/handler`.
4. Firebase → Authentication → Configurações → Domínios autorizados: o domínio do app e o da
   prévia da Vercel.
5. Vercel: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` com o domínio do app, e novo deploy.

### 3.6 `/privacidade`

Um parágrafo: "Se você entrar com o Google, o Rende recebe do Google o seu nome, o seu e-mail e
a sua foto de perfil. A foto não é guardada." É texto de quem conduz o projeto, como o resto da
página (027); a sessão escreve a proposta e o `ESTADO.md` marca como portão do deploy.

### 3.7 O teste

Nenhum teste novo: não há domínio. Os existentes passam sem mudança.

---

## 4 · Roteiro de aparelho

Na prévia da Vercel com o console configurado. **É o portão do deploy.**

1. Android, Chrome: "Continuar com o Google" no cadastro, escolher a conta, cair no estado
   "terminando" com o nome preenchido; aceitar os termos; cair em `/fichas`.
2. A tela do Google diz "para continuar em {domínio do Rende}", não `firebaseapp.com`.
3. Android, app instalado: sair, "Continuar com o Google" no login, cair em Hoje.
4. iPhone, Safari: o mesmo que 1. iPhone, **app instalado na tela de início**: o mesmo que 3.
   Se o popup não voltar ao app instalado, o botão some em `display-mode: standalone` no iOS, e
   isso vira decisão registrada.
5. Login com Google de uma conta Google que nunca criou conta: cai em `/cadastro`, não na tela
   "Este login ainda não abre nenhuma conta".
6. **Conta de teste com senha**, criada pelo cadastro com um Gmail. Entrar com o Google no mesmo
   e-mail: cai em Hoje com os dados dela; no console, o `uid` é o mesmo e a claim também; a
   senha não entra mais; "Esqueci minha senha" a devolve.
7. Fechar o popup sem escolher: nada acontece, nenhum erro.
8. Modo avião: tocar no Google dá a frase de rede.

---

## Critérios de aceite

- [ ] `BotaoGoogle` no login e no cadastro, secundário, 52 px, com a divisória.
- [ ] Google sem conta vai para o cadastro "terminando", com o nome preenchido e os termos
      obrigatórios.
- [ ] `/__/auth/*` servido pelo domínio do app; o service worker não o intercepta.
- [ ] Popup fechado não vira erro; bloqueado vira frase com a saída.
- [ ] `docs/DEPLOY.md` com os cinco passos de console; `/privacidade` com o parágrafo proposto.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.rules` intocados.
- [ ] `#d198` a `#d200` escritos; `ESTADO.md` atualizado, com o roteiro de aparelho como portão.

---

## 5 · Fora de escopo

- **Apple, Facebook, Microsoft.** `#d198`.
- **Vincular e desvincular provedores dentro do app** ("conectar o Google" em `/configuracao`).
  O Firebase já vincula pelo e-mail; tela para isso só se alguém pedir.
- **A foto do Google no app.** Não há avatar no Rende.
- **One Tap do Google** (o balão no canto). É script de terceiro na página, e o botão resolve.
- **Ajudante entrando com o Google** num e-mail diferente do convidado. A ajudante (030) entra
  pelo e-mail que a dona cadastrou; se for Gmail, o Google funciona pelo `#d200`, e se não for,
  continua a senha.

---

## Decisões desta spec que são fáceis de rejeitar

- **Popup em vez de redirecionamento.** No celular o popup é uma aba nova que volta; se o roteiro
  mostrar que ela se perde, troca-se por `signInWithRedirect`, que o mesmo proxy já suporta.
- **Sem conta, o login manda para o cadastro.** A alternativa é criar a conta direto do login,
  sem a caixa dos termos: recusada, porque o aceite é um ato dela.

---

## Riscos

- **A senha que deixa de valer** (`#d200`). É o comportamento do Firebase, e não do Rende; a
  spec o nomeia e o roteiro o prova antes do deploy. Se incomodar, a saída é verificar o e-mail
  no cadastro, o que reabre o `#d142`.
- **O app instalado no iPhone.** É onde popup e PWA mais brigam. O passo 4 decide; o pior caso
  é o botão sumir só ali, e e-mail e senha continuam.
- **O proxy e o service worker.** Uma resposta em cache para `/__/auth/handler` quebra o login
  em silêncio. O critério de aceite existe por isso.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. O deploy espera o roteiro de aparelho inteiro e o parágrafo de `/privacidade`.
