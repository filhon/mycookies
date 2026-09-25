# Deploy no Vercel

O que a hospedagem precisa saber, o que precisa ser feito uma vez no console do Firebase, e o
que o deploy **não** faz.

Escrito em 2026-09-03, na sessão que preparou o projeto para publicar. O que mudou no código
por causa disto está em `DECISOES.md#d72` e `#d73`.

---

## Antes de tudo: o que o Vercel não toca

Regras e índices do Firestore continuam sendo publicados pelo Firebase CLI, da máquina:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

O Vercel publica o app. O banco é o mesmo projeto `mycookies-mrc` de sempre, e ele já está de
pé com tudo publicado — ver `ESTADO.md`. Um deploy do app não move regra nem índice, e um
índice que falte aparece como tela que não carrega, e não como erro de build.

---

## 1 · O projeto no Vercel

Nada a configurar: o Next.js é detectado sozinho e `npm run build` já fixa `--webpack`, que é
o que o `@serwist/next` precisa para emitir o service worker (`next.config.ts`).

| Ajuste          | Valor                             |
| --------------- | --------------------------------- |
| Framework       | Next.js (detectado)               |
| Build Command   | o padrão — cai em `npm run build` |
| Install Command | o padrão                          |
| Node.js Version | 22.x ou 24.x                      |
| Function Region | `gru1` (São Paulo)                |

**Node.** O `engines` do `package.json` diz `>=20`, que é um piso e não um pino: quem escolhe
a versão é o painel. Se o build reclamar da faixa, o conserto é uma linha —
`"node": "24.x"` em `engines`, que é a versão em uso no desenvolvimento.

**Região.** `/api/nota`, `/api/conta`, as três rotas de `/api/assinatura/` e o webhook do
Stripe rodam no servidor; todo o resto é estático e sai do CDN, perto de quem abre. `gru1`
(São Paulo) continua sendo a escolha certa: é onde está quem paga e quem fotografa a nota.
No plano gratuito dá para escolher **uma** região.

---

## 2 · Variáveis de ambiente

No painel: **Settings → Environment Variables**. Marque Production e Preview nas seis
primeiras; as duas últimas, Production e Preview também, se você quiser a leitura de nota
funcionando nos previews.

### As seis do Firebase — públicas, e assadas no build

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Os mesmos valores do `.env.local`. Elas identificam o projeto e não autorizam nada — quem
protege os dados são as regras em `firestore.rules`.

**`NEXT_PUBLIC_` entra no pacote durante o build, e não é lida em tempo de execução.** Trocar
o valor no painel não muda o que já foi publicado: é preciso **redeploy**. Faltando qualquer
uma delas, o app compila e quebra ao abrir, com a frase de `client.ts` ("Configuração do
Firebase incompleta. Faltam: …").

### As do servidor — privadas, lidas a cada chamada

```
FIREBASE_SERVICE_ACCOUNT
GEMINI_API_KEY
GEMINI_MODELO          (opcional; vazio usa gemini-3.5-flash-lite)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MENSAL
STRIPE_PRICE_ANUAL
```

Nenhuma delas leva `NEXT_PUBLIC_`, e é isso que as mantém fora do navegador. Só
`src/lib/server/` e `src/app/api/` as leem, e uma rota não é importada por componente nenhum.

**`GOOGLE_APPLICATION_CREDENTIALS` não vale aqui.** Ela é um **caminho de arquivo**, e no
Vercel não existe disco onde pôr a chave. No lugar dela vai `FIREBASE_SERVICE_ACCOUNT`, com o
**conteúdo** do mesmo JSON. Cole o arquivo inteiro no campo do painel; se a colagem perder as
quebras de linha, mande o mesmo JSON em base64, que a rota aceita os dois:

```bash
node -e "console.log(Buffer.from(require('fs').readFileSync('./chave-servico.json')).toString('base64'))"
```

> Esta chave **ignora as regras do Firestore**: quem a tem, tem o banco inteiro. Ela não é
> versionada (`.gitignore`) e não sobe no deploy (`.vercelignore`). Se vazar, o conserto é
> revogar a chave no console do Google Cloud e emitir outra — trocar a variável não basta.

Sem `FIREBASE_SERVICE_ACCOUNT`, o app inteiro funciona e **só** a leitura de nota não: a tela
diz "A leitura de nota ainda não está configurada neste servidor", que é a frase certa. Foi
para isso que a rota passou a distinguir os dois erros (`DECISOES.md#d72`) — antes ela dizia
que o login dela não abria a conta. Sem `STRIPE_SECRET_KEY` ou os quatro preços (dois desde a
spec 032),
`/assinatura` diz o mesmo tipo de frase ("A assinatura ainda não está configurada neste
servidor") e o resto do app continua de pé.

### Stripe, uma vez no painel (spec 028)

Nada disto é código — é o que `docs/saas/CLAUDE.md` e a spec 028 pedem feito à mão, em modo
de **teste** primeiro:

1. **Um produto** ("Rende") com **dois preços recorrentes** em BRL: mensal e anual, o anual
   valendo dez mensais. Anotar os dois ids `price_…` → `STRIPE_PRICE_MENSAL` e
   `STRIPE_PRICE_ANUAL`.
2. **Customer Portal ativado** — Settings → Billing → Customer portal: trocar cartão, mudar
   de preço entre os dois, cancelar ao fim do período. Sem isto, `POST /api/assinatura/portal`
   falha na criação da sessão, com erro do próprio Stripe.
3. **Um endpoint de webhook** apontando para `https://<host>/api/stripe/webhook`, com os três
   eventos `customer.subscription.created`, `customer.subscription.updated` e
   `customer.subscription.deleted`. Anotar o `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
4. **Para o `npm run dev`**, o Stripe CLI substitui o passo 3:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` imprime um segredo local,
   diferente do de produção.
5. **Ao ir ao ar de verdade** (modo ao vivo, e não mais teste): os quatro valores trocam pelos
   equivalentes de produção, inclusive um segundo endpoint de webhook — o do painel de teste
   não recebe eventos do modo ao vivo.

**Ordem de publicação, sempre**: regra → app → endpoint do webhook no painel. A regra nova de
`firestore.rules` é compatível com qualquer claim sem `acessoAte` (nenhuma conta liberada à
mão perde acesso), mas o webhook só deve apontar para uma URL que já responde 200 a um evento
de teste — publicar o endpoint antes do app faria o Stripe achar o servidor fora do ar e
começar a tentar de novo. Ver `DECISOES.md#d144` a `#d147`.

### Stripe, o segundo plano (spec 032)

Também à mão, também em modo de teste primeiro. O pacote de cada assinatura vem do **produto**,
e não do preço (`DECISOES.md#d169`): o webhook lê `metadata.pacote` do produto, e qualquer
outra coisa é o essencial.

1. **O produto que já existe ("Rende") não muda.** Ele é o essencial, e fica **sem**
   `metadata.pacote`.
2. **Um produto novo, "Rende Completo"**, com `metadata.pacote = COMPLETO` (maiúsculo: `completo`
   é o essencial) e dois preços recorrentes em BRL, mensal e anual, o anual valendo dez mensais.
   Anotar os dois ids `price_…` → `STRIPE_PRICE_COMPLETO_MENSAL` e `STRIPE_PRICE_COMPLETO_ANUAL`.
3. **Customer Portal → Subscriptions → "Customers can switch plans"** ligado, com **os dois
   produtos** e os quatro preços na lista, e os downgrades aplicados **no fim do período**. Sem
   isso o portal não mostra "Atualizar plano", e o botão "Mudar para o completo" dos painéis de
   `/configuracao` leva a um portal sem a opção.
4. **Conferir a `metadata` antes de qualquer cliente de verdade no completo** (passo 5 do
   roteiro da spec): uma `metadata` errada faz o webhook gravar essencial e **tirar as
   ajudantes** de quem paga o completo (`#d170`). O desfazer é corrigir a `metadata`, reenviar o
   último evento pelo painel e a dona reconvidar.

**Ordem, sempre: produto e preços no painel → as duas variáveis → app.** O app da 032 exige os
quatro preços em `stripeDisponivel()`; publicado antes das variáveis, ninguém consegue assinar
(`/assinatura` diz "A assinatura ainda não está configurada neste servidor"), e o resto do app
continua de pé. Quem assinou antes da 032 fica sem `pacote` no documento, que é o essencial — o
único que existia.

---

## 3 · No console do Firebase, uma vez

**Authentication → Settings → Authorized domains.** Adicione o domínio publicado
(`<projeto>.vercel.app` e o domínio próprio, se houver).

Entrar com e-mail e senha **não** depende disso — funciona de qualquer origem. O que depende é
o link de recuperação de senha quando ele um dia levar uma URL de continuação, e qualquer
login por provedor externo. É um clique agora contra um mistério depois.

**Authentication → Settings → User actions.** Antes de publicar `/cadastro` (spec 027), confira
que "Enable create (sign-up)" está ligado. Desligado, `createUserWithEmailAndPassword` devolve
`auth/admin-restricted-operation` e nenhuma linha de código conserta. `/api/conta` usa as mesmas
duas variáveis de servidor da seção 2; nenhuma nova.

---

## 4 · Depois do primeiro deploy

Nesta ordem, porque cada passo só faz sentido se o anterior passou:

1. **Abrir a URL e entrar** com o login da conta `mycookies`. Se a tela Hoje carregar com a
   saudação pelo nome, o Firestore respondeu e a claim `contas` chegou no token.
2. **Instalar na tela de início** pelo celular, e conferir que o ícone é o desenho e não uma
   miniatura da página (é o que a 5A rasterizou).
3. **Desligar a internet e abrir de novo.** Offline é o estado normal deste sistema; se o
   service worker não tiver sido emitido no build, é aqui que aparece.
4. **Ler uma nota de verdade**, que é o único caminho que passa pelo servidor. Falhou com "não
   está configurada neste servidor" → falta `FIREBASE_SERVICE_ACCOUNT` ou `GEMINI_API_KEY`.
5. **Um número digitado indo e voltando** — um lançamento em `/financeiro`, recarregar, ver
   se voltou igual.

O passo 5 é a dívida mais antiga do projeto, e é a spec `005-prontidao.md`, sessão 5B.
Publicar não a paga: nenhum número deste sistema jamais saiu de um teclado, passou pelo
Firestore e voltou, e agora isso vale também para o servidor publicado.

---

## 5 · Encerrar uma conta

Quando ela toca em "Encerrar minha conta" (spec 029), o app cancela a assinatura no Stripe,
marca `status: "ENCERRADA"` e tira a conta da claim — na hora, sem intervenção. **Nada é
apagado nesse toque.** A purga é manual, e a única exceção nomeada ao invariante "nunca apagar
documento" (`CLAUDE.md`, `DECISOES.md#d148`):

```bash
npm run encerrar-conta -- <contaId>              # ensaio: imprime o que apagaria
npm run encerrar-conta -- <contaId> --confirmo   # apaga o documento, as subcoleções e o login
```

Exige `GOOGLE_APPLICATION_CREDENTIALS`, como `conceder-acesso` e `metricas`. O script **recusa**
qualquer conta cujo `status` não seja `"ENCERRADA"` — não há como apagar `contas/mycookies` por
engano. Rode dentro de `DIAS_ATE_A_PURGA` (30 dias) depois de `encerradaEm`, que é o prazo que
`/privacidade` promete; o ensaio (sem `--confirmo`) avisa se o prazo já venceu. Não toca no
Stripe: a assinatura já foi cancelada no toque dela, e o `Customer` fica lá pela retenção fiscal
deles.

## 6 · Ao publicar a 030: as regras mudam

A spec 030 (a ajudante) reescreve `firestore.rules`: a regra passa a conferir o papel na claim
(`DECISOES.md#d153`, `#d154`), e a sessão B acrescentou a concessão de `agregados/global`
(`#d157`). **Publique a regra antes do app:**

```bash
firebase deploy --only firestore:rules
```

A regra nova é compatível com o app velho — numa conta só de donas, nada muda —, e o contrário
não é: o app novo antes da regra deixa a ajudante com a tela escondida e a permissão de dona.
Depois de publicar, repita o passo 1 do roteiro da spec contra `contas/mycookies` (as cinco
telas, um lançamento no caixa, salvar a configuração) antes de publicar o app.

As sessões A e B da 030 saem **no mesmo deploy do app**: entre elas existe papel que a regra
recusa e tela que não sabe disso (escrita negada em silêncio, `#d80`). `firestore.indexes.json`
não muda.

## 7 · Ao publicar a 036: a página de venda

`/conheca` é a primeira rota indexável, e o visitante sem login no navegador passa a cair nela
em vez de `/login` (`DECISOES.md#d172`). **Ordem: junto com ou depois da 027 e da 032.** Sem a
027 no ar, "Começar o teste" leva a um `/cadastro` que não existe em produção; sem a 032, a
seção de preço mostra um pacote que não se vende. Os preços vêm do Stripe (`lerPrecos`), então
valem as variáveis das seções do Stripe acima; sem elas a página fica de pé, sem número
(`#d174`).

**Portão:** a **autorização da Maynara por escrito** para o depoimento que está em
`src/app/conheca/page.tsx` (`#d175`), e para a foto, se um dia entrar (em `public/site/`). Depois de publicar, o passo 1 do roteiro da
spec no app instalado: sem login, ele abre `/login`, e não a página.

**Antes do primeiro deploy da 036, ligar o Web Analytics** (spec 038, `DECISOES.md#d180`): no
painel da Vercel, Analytics → o projeto → **Enable**. Sem isso `/_vercel/insights/script.js`
responde 404 e nada é contado; o código não quebra. O script só é emitido em produção
(`VERCEL_ENV`), nas duas páginas públicas e em `/cadastro`. Depois do deploy, o roteiro da 038:
em `/conheca`, a aba Rede com `script.js` e uma chamada a `/_vercel/insights/view`; nenhuma
chamada nova depois de criar a conta e cair em `/fichas`.

## 8 · Ao publicar a 037: a página do preço e o mapa

`/como-calcular-o-preco-do-cookie`, `/robots.txt`, `/sitemap.xml` e `/llms.txt`. **Ordem: junto
com ou depois da 036**: o rodapé das duas páginas aponta uma para a outra, e o convite leva a
`/cadastro` (a mesma ordem da 036 com a 027).

Nenhuma variável nova: o endereço absoluto vem de `VERCEL_PROJECT_PRODUCTION_URL`, que a Vercel
dá sozinha (`DECISOES.md#d178`). Depois do deploy, abrir `/sitemap.xml` e conferir que os
endereços são os de produção, e não `localhost`.

**Portão: o domínio próprio vem antes do sitemap.** O código pode ir ao ar no `*.vercel.app`,
mas nada é enviado ao Google nem ao Bing antes de o domínio estar apontado na Vercel como
produção e de um redeploy (a variável é lida no build). O que o Google aprende fica no endereço;
trocar depois pede 301 de tudo. Com o domínio:

1. **Google Search Console** e **Bing Webmaster Tools**, verificados por registro TXT no DNS
   (nenhum código). Enviar `https://<domínio>/sitemap.xml` nos dois. O Bing importa: a busca do
   ChatGPT e o Copilot se apoiam no índice dele.
2. **Inspeção de URL** no Search Console, pedindo indexação das duas páginas.
3. O resto é a seção 5 da spec 037, e é de quem conduz o projeto.

## 9 · Ao publicar a 039: depois do preço, e a prévia

A seção "Depois do preço" de `/conheca`, a linha "O mês sai por {n} cookies", o texto novo dos
planos (em `/conheca` e em `/assinatura`), as nove dúvidas, a frase da origem e as duas imagens de
prévia. **Ordem: junto com ou depois da 036 e da 037.** Nenhuma variável nova.

**Portão:**

1. **As três capturas em `public/site/`** (`mes-manteiga-subiu.webp`, `mes-encomenda.webp`,
   `mes-caixa.webp`), de uma **conta de demonstração** e nunca da MyCookie's, WebP até 120 KB,
   com `src`, `largura`, `altura` e `alt` preenchidos em `TELAS_DO_MES`
   (`src/app/conheca/page.tsx`, `DECISOES.md#d181`). Enquanto `src` estiver vazio a seção não
   aparece, e o `alt` por escrever é pego pelo `rg -n "\[texto" src/app` de sempre. Conferir as
   três ampliadas: nenhum nome de cliente real, nenhum número da Maynara.
2. **A frase da origem autorizada** junto com o depoimento, na mesma mensagem por escrito
   (`#d184`). Sem autorização, `DEPOIMENTO.origem` sai (ou o bloco inteiro, com o `texto`).

Depois do deploy, o passo 5 do roteiro da spec: colar o link de `/conheca` numa conversa do
WhatsApp consigo mesmo e ver a imagem. O WhatsApp guarda a prévia por endereço: se a primeira
colagem veio sem imagem, testar com `?v=1` no fim.

## 10 · E-mail de senha nova (spec 042)

O e-mail de "Esqueci minha senha" com o nome do Rende, e o link abrindo `/redefinir-senha` em
vez da página do Firebase (`DECISOES.md#d196`). No console do Firebase, nesta ordem:

1. **Authentication → Modelos → Redefinição de senha** → idioma **português (Brasil)**.
2. Nome do remetente **Rende**; assunto **"Sua senha nova do Rende"**; corpo:

   > Alguém pediu uma senha nova para a sua conta no Rende. Se foi você, toque no link.
   > Se não foi, ignore este e-mail: a senha de hoje continua valendo.

3. **URL de ação personalizada:** `https://www.rendeapp.com.br/redefinir-senha`. **Só depois do
   deploy da tela**: trocar antes quebra a recuperação de quem pedir no meio. A URL vale para
   todos os modelos do projeto; hoje só a senha nova é enviada.
4. **Com o domínio próprio no ar:** domínio personalizado do remetente (os registros de DNS que
   o console pede). Sem ele o remetente continua `firebaseapp.com` e o spam continua possível.

Se o domínio do app mudar depois (o domínio próprio chegando), a URL do passo 3 muda junto: é
uma linha no console. Depois do passo 3, o roteiro da spec 042, §5.

## 11 · Entrar com o Google (spec 043)

O botão "Continuar com o Google" no login e no cadastro, com o login voltando pelo domínio do
app (`DECISOES.md#d199`). **Espera o domínio próprio** (`#d178`): trocar o `authDomain` depois
é refazer os passos 2 a 5. O código já serve `/__/auth/*` e `/__/firebase/*` pelo `rewrites`
de `next.config.ts`, e o service worker não os intercepta.

O domínio do app é **`www.rendeapp.com.br`** (o `rendeapp.com.br` sem `www` redireciona para ele).

1. **Firebase → Authentication → Métodos de login → Google:** ativar; e-mail de suporte do
   projeto. Deixar "Uma conta por endereço de e-mail" como está (`#d200`). _Feito._
2. **Google Cloud → APIs e serviços → Tela de consentimento OAuth** (Branding): nome **Rende**,
   logotipo, e-mail de suporte, página inicial `https://www.rendeapp.com.br`, links de
   `https://www.rendeapp.com.br/privacidade` e `https://www.rendeapp.com.br/termos`, e
   `rendeapp.com.br` em domínios autorizados. Depois, **pedir a verificação da marca**: sem ela o
   Google mostra o domínio ("Prosseguir para www.rendeapp.com.br") e não o nome. Não há CLI para
   esta tela.
3. **Google Cloud → Credenciais → o cliente OAuth da web** (o que o Firebase criou, "Web client
   (auto created by Google Service)"): origem JavaScript `https://www.rendeapp.com.br` e URI de
   redirecionamento autorizado `https://www.rendeapp.com.br/__/auth/handler`. O de
   `firebaseapp.com` fica: é o do desenvolvimento local. Também sem CLI.
4. **Firebase → Authentication → Configurações → Domínios autorizados:** o domínio do app e o
   da prévia da Vercel. _Feito: `www.rendeapp.com.br` e `rendeapp.com.br` já estão na lista._
5. **Vercel → Environment Variables:** `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=www.rendeapp.com.br`,
   sem `https://`, só em Production, e **novo deploy** (a variável é assada no bundle). Em
   Preview fica o `firebaseapp.com`, ou o domínio da prévia com os passos 3 e 4 para ele.

Na prévia da Vercel, o domínio da prévia faz o papel do domínio do app nos passos 3 a 5. Antes
do deploy de produção: o parágrafo novo de `/privacidade` revisado, e o roteiro de aparelho da
spec 043, §4, inteiro, com o passo 6 (a conta de senha que passa a entrar pelo Google) numa
conta de teste.

## 12 · E-mail pelo Resend (spec 044)

A boas-vindas e a senha nova saem pelo Resend, com o remetente `Rende <ola@rendeapp.com.br>` e a
resposta indo para `RESPONSAVEL.email` (`DECISOES.md#d202`, `#d208`). **Espera o domínio
próprio** (`#d178`): o Resend só manda com o domínio verificado no DNS.

1. **Resend → Domains → Add domain:** `rendeapp.com.br`, região São Paulo se houver. No DNS, os
   registros que o painel pedir (DKIM em `resend._domainkey`; SPF e MX no subdomínio de envio),
   e mais um TXT em `_dmarc` com `v=DMARC1; p=none;`. Esperar o painel dizer "Verified".
2. **No mesmo domínio, Open tracking e Click tracking desligados** (`#d208`): o de clique
   reescreve os links, e o link da senha carrega um código de uso único.
3. **Vercel → Environment Variables:** `RESEND_API_KEY`, em Production e Preview, e novo deploy.
4. **A § 10, passo 4** (domínio do remetente no Firebase) continua valendo: o modelo do Firebase
   é a reserva, e é por ele que a senha sai quando o Resend falha (`#d204`).

O logotipo do e-mail é `{domínio de produção}/email/rende.png`: ele só aparece depois que este
deploy chega à produção. No `npm run dev`, `/api/email/previa?peca=…&enviar=1` manda a peça com
o logotipo apontando para `localhost`, que o Gmail não carrega; para conferir o logotipo antes,
`VERCEL_PROJECT_PRODUCTION_URL=www.rendeapp.com.br` no `.env.local` depois do deploy.

## Limites conhecidos

**O arquivo da nota tem dois tetos, e o menor não é o nosso.** `LIMITE_ARQUIVO_BYTES` é 8 MB
em `notaFiscal.ts`, e é um teto de custo. O Vercel corta o corpo da requisição em **4,5 MB**,
e o corpo é JSON com base64 — que carrega 4 bytes a cada 3. Na prática o teto real do arquivo
é ~3,3 MB.

Foto não chega perto disso: `imagem.ts` reduz para 1600 px / JPEG 80% antes de subir, o que
dá algumas centenas de KB. **PDF sobe como está**, e é o caso que pode bater no teto. Quando
bate, o Vercel devolve 413 sem corpo, e a tela já lida com isso — `codigoDaFalha` cai no
status e mostra "Esse arquivo é grande demais, mesmo depois de reduzido. Fotografe a nota mais
de perto, em partes." A frase está certa; o que ela não diz é que o corte veio da hospedagem.

Se um PDF de nota grande passar a ser rotina, o conserto é baixar `LIMITE_ARQUIVO_BYTES` para
3 MB — aí a recusa é nossa, acontece antes do upload inteiro e não gasta o dado dela.

**A leitura tem 60 segundos.** `maxDuration = 60` na rota, que é o teto do plano gratuito. O
tempo limite interno da chamada ao Gemini é de 30 s (`TEMPO_LIMITE_LEITURA_MS`), então a folga
é do dobro.

**O cache de CNPJ é por instância.** `CACHE` em `route.ts` é um `Map` em memória, e cada
instância fria começa vazia. Isso continua valendo — o efeito é uma consulta a mais à API
pública, que já degrada em silêncio quando não responde (`DECISOES.md#d52`).
