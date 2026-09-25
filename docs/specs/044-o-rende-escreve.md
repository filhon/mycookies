# Spec 044 · O Rende escreve

**Tipo:** e-mail próprio pelo Resend, chamado por `fetch`. Cinco peças: boas-vindas, senha nova,
teste acabando, meta batida e mês fechado. Uma rota nova de senha, um cron diário, um campo
opcional em `Conta`, uma chave em `/configuracao`. **Nenhuma dependência, nenhuma regra,
nenhum índice.**
**Tamanho:** duas sessões. **A**: o transporte, as cinco peças, a prévia, a boas-vindas e a senha
nova. **B**: o cron, os três avisos que ele manda e a chave de desligar.
**Origem:** pedido de quem conduz o projeto (2026-09-25).
**Depende de:** a 042 (a tela `/redefinir-senha`, para onde o link da senha aponta) e o domínio
próprio no ar (`#d178`), porque o Resend só manda com o domínio verificado no DNS.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`: o Resend entra por `fetch`, e o campo
novo é opcional (a dona já escreve o documento da conta). **Portão visual:** quem conduz o
projeto aprova as cinco peças de `specs/044-emails/` **antes da sessão A**. O que foi aprovado
é o que a sessão escreve; mudança de desenho volta para aprovação.
**Decisões a registrar:** `#d202` a `#d208`.

---

## Problema

Fora do app, o Rende não diz nada. O único e-mail que sai com o nome dele é o da senha nova, e
esse é o modelo do Firebase: texto corrido, o desenho do Firebase, o remetente que o console
permite. Os outros momentos em que uma linha de e-mail pesa passam em branco:

1. **A conta acabou de nascer.** Os primeiros dez minutos decidem se ela monta um produto ou
   fecha a aba. Hoje o cadastro termina em `/fichas` e mais nada.
2. **O teste está acabando.** A 028 deixou o aviso para a linha da tela Hoje (`#d144`) e pôs o
   e-mail fora de escopo por ser "dependência e conta nova". Só que a linha só avisa quem abre o
   app, e quem parou de abrir é justamente quem precisa do aviso.
3. **O dinheiro do mês.** A meta batida e o mês fechado são os dois números que ela mais quer
   ouvir, e hoje só aparecem se ela for procurar.

---

## 1 · O que esta spec decide

### E-mail próprio, pelo Resend, por `fetch` — `#d202`

Reverte o "fora de escopo" da 042 (§6) e o da 028 ("exigiria provedor de e-mail, que é
dependência e conta nova"). A conta nova é aceita; a dependência não precisa entrar:

- A API do Resend é um `POST https://api.resend.com/emails` com JSON e um `Authorization: Bearer`.
  O SDK `resend` embrulha esse `fetch`, e não faz mais nada que a spec use.
- **`react-email` recusado.** Traz um renderizador e componentes para cinco peças fixas, que já
  estão escritas em HTML e aprovadas.
- O plano grátis do Resend manda 3.000 por mês e **100 por dia**, o que basta até a casa das
  noventa contas com caixa (ver Riscos).

`RESEND_API_KEY` já está no `.env.local`; entra na Vercel em produção e prévia.

### As peças são HTML de e-mail escrito à mão — `#d203`

Tabelas, estilo inline, 560 px de largura, e o que está em `specs/044-emails/` é o molde. No
código, cada peça é uma função pura `(dados) => { assunto, preheader, html, texto }`, com versão
em texto sempre. Três escolhas que o molde já traz, e o porquê delas:

- **A faixa de tinta no topo** (`--brand-800`, `#1C1E28`), com o logotipo creme em PNG **opaco**.
  O Gmail do Android inverte as cores do e-mail no tema escuro e não inverte as imagens: um
  logotipo de tinta com fundo transparente some no papel invertido. Tinta sobre tinta, não.
- **`color-scheme: light only` e nenhum tema escuro próprio.** Só o Apple Mail respeitaria a
  folha escura, e o público lê no Gmail. Uma folha escura que quase ninguém vê é código a manter.
- **Archivo e Figtree pelo Google Fonts onde o cliente deixa** (Apple Mail, iOS); no Gmail cai
  para Helvetica e a fonte do sistema. O nome da marca nunca depende disso: ele é imagem.

A marca do e-mail é a do app: o papel cru, a lista com divisórias e o número à direita, **um**
ponto âmbar por peça (no número que decide; no título quando não há número), **um** botão âmbar
por peça, e nenhum número sem a consequência ao lado. Positivo e negativo levam a palavra além da
cor ("batida no dia 22", "No vermelho:").

**Achado de passagem:** `docs/marca/rende/logo/rende-principal.png` está quebrado: tem só o
ponto, o "rende" sumiu na rasterização, porque o Archivo não estava instalado quando o PNG foi
gerado. O `rende-negativa.png` de `specs/044-emails/` foi rasterizado pelo Edge com o Archivo do
Google Fonts e com o desenho do `Logotipo` de `src/components/marca/Marca.tsx`. A sessão A
refaz o `rende-principal.png` do mesmo jeito.

### A senha nova sai pelo Resend, e o Firebase fica de reserva — `#d204`

`POST /api/senha` com `{ email }`:

1. `adminAuth().getUserByEmail(email)`. Não existe: responde `{ ok: true }` e não manda nada
   (`#d143`: quem pergunta pelo e-mail de outra pessoa não sai sabendo mais).
2. `generatePasswordResetLink(email)`; da URL devolvida sai só o `oobCode`, e o link do e-mail é
   `{URL_DO_SITE}/redefinir-senha?mode=resetPassword&oobCode={oobCode}&lang=pt-BR`, a tela da 042. Não depende da URL de ação configurada no console.
3. Manda pelo Resend com `Idempotency-Key: senha/{uid}/{janela}`, onde a janela é o bloco de 10
   minutos. Tocar "Esqueci minha senha" cinco vezes seguidas manda um e-mail; o Resend devolve 409
   para a chave repetida, e a rota trata como enviado.
4. **O Resend falhou** (sem chave, cota do dia, 5xx, rede): responde `503 { reserva: true }`, e o
   login chama `sendPasswordResetEmail` como faz hoje. O modelo do Firebase configurado pela 042
   continua existindo por isso: é a reserva, e não mais o caminho.

A frase na tela de entrar não muda (`AVISO_ENVIO`).

### Um cron por dia, e nenhum marcador gravado: o dia decide — `#d205`

`vercel.json` com um cron, `0 12 * * *` (9h em São Paulo), para `GET /api/emails/diario`, que
confere `Authorization: Bearer {CRON_SECRET}`. Cada aviso tem um dia certo, calculado no fuso de
São Paulo por função pura:

| Aviso          | Sai quando                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| Teste acabando | `plano === "TRIAL"`, e o dia de `trialAte` é daqui a exatamente 3 dias               |
| Meta batida    | o dia em que a soma de `porDia[].entradas` alcançou `meta.faturamentoAlvo` foi ontem |
| Mês fechado    | hoje é dia 2, e o mês anterior teve entrada ou pedido                                |

Nenhum campo "avisado em": cada condição é verdadeira em **um** dia só, então cada aviso sai uma
vez sem ninguém gravar nada. A meta lê o agregado do mês **de ontem** (a meta batida no dia 30
sai no dia 1). O mês fechado espera o dia 2 para que a noite do 31 e o dia 1 caibam no caixa do
mês que fechou. A `Idempotency-Key` (`{modelo}/{contaId}/{período}`) cobre a mesma rodada
chamada duas vezes.

O preço dessa escolha: o dia em que o cron não rodar é o dia cujos avisos não saem. Para o
teste, a linha da tela Hoje continua avisando; para a meta e o mês, é um e-mail a menos.

### Quem recebe é a dona, no e-mail do login — `#d206`

O endereço vem do Auth, não de um campo na conta: `listUsers` percorre os logins e acha, pela
claim, a `DONA` de cada conta (o mesmo caminho de `scripts/metricas.mjs`). Um e-mail copiado para
o documento seria mais uma cópia para envelhecer quando ela trocar de login. A ajudante não
recebe nada. A conta liberada à mão (sem `trialAte`) recebe meta e mês, e nunca "teste acabando".
Conta `ENCERRADA` não recebe nada.

### Dois avisos se desligam; três não — `#d207`

Meta batida e mês fechado são notícia, e ela pode não querer. `Conta.avisosPorEmail?: false`
(ausente = recebe), com uma chave em `/configuracao`. Boas-vindas, senha nova e teste acabando
são do funcionamento da conta, e não se desligam. O rodapé das duas peças desligáveis diz onde
desligar.

Sem cabeçalho `List-Unsubscribe` de um toque: o Gmail e o Yahoo só o exigem de quem manda 5.000
por dia, e ele pede uma rota com token assinado. Entra quando o volume chegar perto disso.

### O remetente — `#d208`

`Rende <ola@rendeapp.com.br>`, com resposta para `RESPONSAVEL.email` (`src/app/(auth)/responsavel.ts`).
A boas-vindas convida a responder, e quem responde fala com uma pessoa. `ola@` não precisa de
caixa: nada chega nele. **Rastreamento de abertura e de clique desligado** no domínio do Resend:
o de clique reescreve os links, e o link da senha carrega um código de uso único.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, `docs/marca/rende/MARCA.md` §3, e usar `/impeccable`.
2. Abrir as cinco peças de `specs/044-emails/` no navegador, a 390 e a 700 px.
3. **A:** ler `src/app/api/conta/route.ts`, `login/page.tsx` (`recuperarSenha`),
   `src/lib/server/firebaseAdmin.ts`, `src/app/site.ts` (`URL_DO_SITE`) e a rota de preços da
   assinatura (`/api/assinatura/precos`).
4. **B:** ler `scripts/metricas.mjs` (`ultimoLoginPorConta`), `src/lib/domain/datas.ts`,
   `src/lib/domain/caixa.ts` (a chave de `porDia`), `src/lib/domain/custoFicha.ts`
   (`custosDeHoje`, a conta do cartão "no vermelho" da 024) e `src/lib/domain/precificacao.ts`
   (`verificarPreco`, o mínimo pra não perder).
5. Na documentação do Resend: "Send email" (campos e o 409 da `Idempotency-Key`) e "Domains".

---

## 3 · Sessão A · o transporte, as peças, a boas-vindas e a senha

### 3.1 O transporte — `src/lib/server/email.ts`

`enviarEmail({ para, peca, chave })`, `fetch` ao Resend com `from`, `to`, `reply_to`,
`subject`, `html`, `text` e o cabeçalho `Idempotency-Key`. Devolve `"enviado" | "repetido" |
"falhou"`, e nunca lança: e-mail é consequência, nunca o motivo de uma rota falhar. Sem
`RESEND_API_KEY`, `"falhou"` e um `console.warn`.

### 3.2 As peças — `src/lib/email/pecas.ts`

Um arquivo: a moldura (faixa, corpo, rodapé), os três pedaços que se repetem (botão, linha da
lista, número grande com o ponto), `escapar()` para todo texto que veio dela (nome, negócio,
nome de produto) e as cinco funções, com o HTML dos moldes. Datas e dinheiro pelas funções de
`domain/` (`formatarMoeda`, `rotuloCompetencia`), nunca à mão. O logotipo aponta para
`{URL_DO_SITE}/email/rende.png` (`public/email/rende.png`, o PNG de `specs/044-emails/`).

As variações que os moldes não mostram:

- **Boas-vindas, `origem === "calculadora"`:** o segundo parágrafo vira "O produto que você montou
  na calculadora já está na sua conta, com o seu material. Abra, confira o preço e troque o que
  for diferente na sua cozinha.", e o botão, "Abrir o meu produto".
- **Teste acabando, nenhum produto:** a lista e a caixa do vermelho saem; entra "Você ainda não
  montou nenhum produto. Dá tempo: escolha o doce que mais vende e veja o custo real em dez
  minutos." **Nenhum no vermelho:** a caixa sai; entra a linha "Nenhum produto no vermelho: os
  {n} cobrem o custo." **Sem preço do Stripe** (`#d174`): os planos aparecem sem número.
- **Meta batida no último dia:** "Batida no dia 30", e a coluna da direita e a frase "o que
  entrar é a mais" saem.
- **Mês fechado no prejuízo:** o rótulo é "Faltou", o valor vai em negativo com o sinal, **sem o
  ponto**, e a frase é "Saiu mais do que entrou. Vale abrir o caixa e ver onde." **Sem meta no
  mês:** a linha da meta sai. **Com meta já definida para o mês novo:** o botão vira o link
  "Abrir o caixa de {mês}".

### 3.3 A prévia — `src/app/api/email/previa/route.ts`

`GET ?peca=boas-vindas` devolve o HTML com os dados dos moldes (Carla, Doces da Carla).
`&enviar=1` manda a peça para `RESPONSAVEL.email`. **Só existe em `NODE_ENV === "development"`**;
fora disso, 404. É como o visual aprovado no navegador é conferido no Gmail do celular.

### 3.4 A boas-vindas — `src/app/api/conta/route.ts`

No ramo em que o documento da conta **nasce** (`!existente.exists`), `after()` do `next/server`
manda a boas-vindas para `usuario.email`, com `chave: boas-vindas/{contaId}`. A resposta do
cadastro não espera o e-mail.

### 3.5 A senha nova — `src/app/api/senha/route.ts` e `login/page.tsx`

A rota do `#d204`, com `esquemaEmail` (zod) no corpo. Em `recuperarSenha`, o `POST` no lugar do
`sendPasswordResetEmail`; com `reserva: true` ou sem resposta, o `sendPasswordResetEmail` de
hoje, com o mesmo tratamento de erro. Sem rede: a frase de rede de sempre.

### 3.6 Configuração

`.env.local.example` ganha `RESEND_API_KEY`. `docs/DEPLOY.md` ganha a seção "E-mail pelo
Resend":

1. Resend → Domains → `rendeapp.com.br`, região São Paulo se houver. Os registros de DNS que o
   painel pedir (DKIM em `resend._domainkey`; SPF e MX no subdomínio de envio) e um
   `_dmarc` com `v=DMARC1; p=none;`.
2. Open tracking e click tracking **desligados** (`#d208`).
3. `RESEND_API_KEY` na Vercel, em produção e prévia.
4. A 042 § 4, passo 4 (domínio do remetente no Firebase) continua valendo: é a reserva.

### 3.7 O teste — `tests/email.test.ts`

`escapar()` numa peça: um nome `<b>Ana</b> & Cia` sai escapado no HTML e inteiro no texto.

---

## 4 · Sessão B · o cron e os três avisos

### 4.1 O dia de cada aviso — `src/lib/domain/avisos.ts`

Puro, e é o que os testes cobrem:

- `hojeEmSaoPaulo(agora): DataISO`, com `Intl.DateTimeFormat` e `timeZone: "America/Sao_Paulo"`.
- `diasAteOFimDoTeste(trialAte, hoje)`: diferença em dias de calendário de São Paulo.
- `diaEmQueBateu(porDia, alvo)`: o primeiro dia em que a soma corrida das entradas alcança o alvo,
  ou `null`.
- `avisosDoDia({ conta, hoje, resumoDeOntem, resumoDoMesAnterior })`: a lista de peças que saem
  hoje para essa conta, com as regras do `#d205`, do `#d206` e do `#d207`.

### 4.2 A rota — `src/app/api/emails/diario/route.ts`

1. Confere o `CRON_SECRET`.
2. `listUsers` → `contaId → e-mail da dona` (`#d206`).
3. Por conta: o documento, o agregado do mês de ontem e, no dia 2, o do mês anterior. Para
   "teste acabando", as fichas e os materiais da conta (`custosDeHoje`, o mesmo cálculo do cartão
   da 024), a contagem de pedidos e as entradas desde `criadaEm`.
4. `avisosDoDia`, a peça, `enviarEmail`, uma conta de cada vez.
5. Responde `{ enviados, repetidos, falhas }` e loga as falhas por `contaId`, sem e-mail no log.

Dois parâmetros para o roteiro: `?hoje=AAAA-MM-DD` troca o dia, e `?simular=1` devolve a lista
do que sairia, sem mandar. **Fora de produção, `?so={contaId}` é obrigatório**: o projeto do
Firebase é um só, e uma prévia sem ele mandaria e-mail a todas as contas de verdade.

### 4.3 O cron — `vercel.json`

```json
{ "crons": [{ "path": "/api/emails/diario", "schedule": "0 12 * * *" }] }
```

`CRON_SECRET` na Vercel e em `.env.local.example`. A Vercel só roda cron em produção.

### 4.4 A chave de desligar — `Conta.avisosPorEmail` e `/configuracao`

`avisosPorEmail?: false` em `src/lib/types/conta.ts`, com o comentário do `#d207`. Em
`/configuracao`, uma seção com `id="avisos"` e uma caixa: **"Receber por e-mail o resumo do mês
e o aviso de meta batida"**, marcada quando o campo está ausente. Desmarcar grava `false`;
marcar grava `true`. Só a dona vê a seção. A escrita segue o padrão da tela (sem `await` na
escrita, `v: VERSAO_SCHEMA`).

### 4.5 Os testes — `tests/avisos.test.ts`

- `diaEmQueBateu`: alcança no meio, alcança no primeiro dia, não alcança, alvo zero.
- `diasAteOFimDoTeste`: um `trialAte` às 23h de São Paulo (02h UTC do dia seguinte) conta pelo
  dia de São Paulo.
- `avisosDoDia`: teste a 3 dias sai e a 2 não; assinante não recebe "teste acabando"; conta
  liberada à mão recebe meta e mês; `avisosPorEmail: false` corta meta e mês e deixa o teste;
  encerrada não recebe nada; dia 2 com mês vazio não manda resumo.

---

## 5 · Roteiro

**É o portão do deploy.** Na prévia da Vercel com o domínio verificado no Resend, e com uma
conta de teste cujo e-mail é de quem conduz o projeto.

**A**

1. `/api/email/previa?peca=…&enviar=1` para as cinco peças, no `npm run dev`. Abrir no Gmail do
   Android (tema claro e escuro), no Mail do iPhone e no Gmail e no Outlook da web. A faixa e o
   logotipo aparecem nos quatro; o botão tem a largura da coluna no celular.
2. Uma peça em mail-tester.com: nota 9 ou mais, SPF, DKIM e DMARC passando.
3. Cadastro novo: a boas-vindas chega em menos de um minuto, de "Rende", na caixa principal. A
   resposta ao e-mail chega em `RESPONSAVEL.email`.
4. "Esqueci minha senha": o e-mail chega do Rende; o botão abre `/redefinir-senha` com o e-mail
   na descrição; a senha nova funciona.
5. Cinco toques seguidos em "Esqueci minha senha": um e-mail.
6. E-mail sem conta: a mesma frase, e nada chega.
7. `RESEND_API_KEY` apagada na prévia: "Esqueci minha senha" ainda manda, pelo modelo do Firebase.

**B**

8. `?simular=1&so={conta}&hoje=` no dia de cada aviso da conta de teste: aparece a peça certa;
   um dia antes e um depois, nada.
9. O mesmo sem `simular`: as três peças chegam, com os números da conta conferidos contra
   `/financeiro` e `/fichas`.
10. `avisosPorEmail` desligado em `/configuracao`: o passo 8 deixa de listar meta e mês, e
    continua listando o teste.
11. Na prévia, sem `?so=`: 400.
12. Depois do deploy: o log do cron do primeiro dia na Vercel, com `falhas: 0`.

---

## Critérios de aceite

**A**

- [x] As cinco peças em `src/lib/email/pecas.ts`, fiéis aos moldes aprovados, com versão em
      texto e todo texto dela escapado.
- [x] `enviarEmail` por `fetch`, que nunca lança; nenhuma dependência nova em `package.json`.
- [x] Boas-vindas saindo do `/api/conta` só quando a conta nasce, sem atrasar a resposta.
- [x] `/api/senha` com a resposta igual para e-mail com e sem conta, a janela de 10 minutos e a
      reserva do Firebase no login.
- [x] `/api/email/previa` só em desenvolvimento.
- [x] `public/email/rende.png` e o `rende-principal.png` da marca refeitos com o Archivo.
- [x] `docs/DEPLOY.md` com os quatro passos; `.env.local.example` com a chave.

**B**

- [x] `domain/avisos.ts` puro e testado; `/api/emails/diario` protegido pelo segredo, com
      `simular`, `hoje` e o `so` obrigatório fora de produção.
- [x] `vercel.json` com o cron; `CRON_SECRET` documentado.
- [x] `Conta.avisosPorEmail` opcional e a chave em `/configuracao`; `firestore.rules` intocado.

**As duas**

- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d202` a `#d208` escritos; `ESTADO.md` atualizado, com o roteiro como portão do deploy.

---

## 6 · Fora de escopo

- **Aviso no dia em que o teste vence, e depois dele.** Um aviso é o que a MARCA pede ("claro,
  sem pressão"); o segundo vira cobrança.
- **Pedido novo do cardápio público avisando a dona por e-mail.** É o próximo candidato, e tem
  spec própria: depende do volume da 031 no ar.
- **E-mail para a cliente dela.** A marca nunca fica entre a confeiteira e a cliente (MARCA §1.4).
- **Convite da ajudante por e-mail**, **recibo** e **cartão recusado.** A ajudante entra pelo
  e-mail que a dona cadastrou (030); cobrança é do Stripe.
- **Verificação de e-mail.** `#d142` continua.
- **Tema escuro nas peças**, **`List-Unsubscribe`**, **webhook de devolução e de reclamação do
  Resend.** `#d203` e `#d207`; o painel do Resend mostra devolução enquanto o volume for pequeno.
- **Resumo semanal**, **aniversário da conta**, **"faz tempo que você não abre".** Uma peça nova
  só depois de ver quantas destas cinco são abertas.

---

## Decisões desta spec que são fáceis de rejeitar

- **"Boas-vindas" e não "Bem-vinda".** A MARCA escreveu "Bem-vinda ao Rende". O público é quase
  todo de mulheres, mas não todo, e "Boas-vindas" não erra com ninguém.
- **A boas-vindas assinada pelo Filipe.** Um produto de uma pessoa só pode dizer isso, e é o que
  faz alguém responder. Quando houver equipe, a linha muda.
- **O número no assunto** do mês fechado e da meta ("Setembro fechou: sobraram R$ 1.212,40").
  É o que ela abriria o e-mail para saber, e já chega na notificação do celular.
- **Mês fechado no dia 2, às 9h.** Podia ser o dia 1. Um dia de folga para o que ela lança na
  manhã seguinte.
- **Varrer todas as contas todo dia**, em vez de consultar por `trialAte`. Com poucas contas, uma
  leitura por conta por dia é mais simples que três consultas; `ponytail:` no código com o teto.

---

## Riscos

- **A cota do plano grátis.** 100 por dia: no dia 2, uma peça por conta com caixa. Passando de
  noventa contas ativas, o Resend Pro (US$ 20/mês, 50.000). A senha nova não sofre: tem a reserva.
- **Domínio novo, sem histórico.** Os primeiros envios podem cair em Promoções ou spam. O passo 2
  do roteiro mede antes; DMARC em `p=none` até ver os relatórios.
- **O cron que não roda** perde os avisos daquele dia (`#d205`). Aceito: nenhum deles é o único
  aviso de nada.
- **Lançamento que sobe atrasado.** Uma venda lançada offline no dia 21 e sincronizada no 24 muda
  o dia em que a meta bateu para um dia que já passou: o aviso não sai. Nunca sai em dobro.
- **A reserva conta um segredo pequeno.** Com o Resend fora do ar, "e-mail com conta" responde
  `reserva` e "e-mail sem conta" responde `ok`, e a tela é a mesma nos dois. Só um script que lê a
  resposta perceberia, e só enquanto o Resend estiver fora.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, em cada sessão, com
o resultado real relatado. O deploy espera o roteiro inteiro, e a sessão A espera a aprovação
das peças.
