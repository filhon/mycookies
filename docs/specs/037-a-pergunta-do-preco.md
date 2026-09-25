# Spec 037 · A pergunta do preço

**Tipo:** uma rota pública nova, com a resposta para "como calcular o preço do meu cookie";
os três arquivos de mapa que o Next já sabe servir (`robots.ts`, `sitemap.ts`, `llms.txt`); a
`metadata` com endereço absoluto; um bloco de dados estruturados em `/conheca`. **Nenhum campo,
nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão. O que pesa é o texto da página nova, não o código.
**Origem:** pedido de quem conduz o projeto (2026-09-24): o Rende aparecer primeiro para quem
pergunta ao Google, ou a um chat de IA, "como saber o preço do meu cookie?" e perguntas vizinhas.
O roadmap já nomeia o canal (§ "Anúncio pago no Meta": "conteúdo sobre precificação").
**Depende de:** a 036 (`/conheca`, `EXEMPLO`, `ContaAberta`), codificada e não publicada.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Quatro decisões a registrar:** `#d176` (a resposta mora numa página própria, com o endereço da
pergunta), `#d177` (o mapa: `robots`, `sitemap` e `llms.txt`, nenhum robô de IA barrado), `#d178`
(o endereço absoluto vem da Vercel, e o domínio próprio é portão do deploy) e `#d179` (dados
estruturados só em `/conheca`, `SoftwareApplication`).

---

## Problema

Quem tem a dúvida do preço não procura "sistema de precificação". Procura a pergunta: "como
saber o preço do meu cookie", "quanto cobrar por um cookie", "como calcular o preço de doces".
Hoje o Rende tem uma página indexável, `/conheca`, e ela é página de venda: o `h1` é a frase da
marca, não a pergunta, e ela não ensina a conta, mostra o resultado dela.

Os chats de IA (ChatGPT, Gemini, Claude, Perplexity) respondem essa pergunta citando páginas que
eles conseguem ler e que respondem de frente. Não há um cadastro para "ser sugerido pela IA": há
página legível por robô, que responde melhor que as outras, e que outros sites citam.

### O que esta spec não promete

**Primeiro lugar não se entrega em código.** Um domínio novo, sem nenhum site apontando para ele,
leva meses para subir numa busca com concorrência (blogs de confeitaria, calculadoras em planilha,
cursos). O que esta spec controla é o que está do nosso lado: a melhor resposta para a pergunta,
num endereço que robô lê, rápida, e com o mapa em ordem. O resto é a seção 5, fora do código, e é
a maior parte do trabalho.

**O que esta spec entrega:** `/como-calcular-o-preco-do-cookie`, pública e indexável;
`/robots.txt`, `/sitemap.xml` e `/llms.txt`; `metadataBase` e `canonical` nas duas páginas
públicas; o `SoftwareApplication` em `/conheca`; um link de `/conheca` para a página nova.

---

## 1 · O que esta spec decide

### A resposta mora numa página própria, com o endereço da pergunta — `#d176`

Pesados:

1. **Pôr a resposta dentro de `/conheca`**, uma seção "Como a conta é feita". Uma página que
   tenta ser venda e artigo não é a melhor em nenhum dos dois, e o `h1` e o `title` só podem ser
   um. `/conheca` fica com a frase da marca.
2. **Uma página por doce** (cookie, brigadeiro, bolo de pote, pão de mel). Quatro textos antes de
   saber se o primeiro funciona. Fora de escopo, com gatilho (seção 6).
3. **Uma página, a do cookie.** Escolhida: é a pergunta que quem conduz o projeto nomeou, é o doce
   da primeira conta, e o `EXEMPLO` da 036 já é um cookie com a conta presa por teste.

O endereço é a pergunta em português, sem acento: `/como-calcular-o-preco-do-cookie`. O `title`
e o `h1` também. **A página responde primeiro e vende depois**: o primeiro parágrafo é a resposta
inteira, com a fórmula e um número, porque é esse parágrafo que a busca mostra e que o chat cita.
O botão do teste vem depois da conta, não antes.

Os números seguem o `#d173`: todos saem das funções do app sobre `EXEMPLO`, e o teste prende.

### O mapa: `robots`, `sitemap` e `llms.txt`, nenhum robô de IA barrado — `#d177`

- **`src/app/robots.ts`**: `allow: "/"` para todo robô, `disallow: "/api/"`, e o endereço do
  sitemap. **Nenhuma linha para GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot ou
  Google-Extended**: sem regra própria eles seguem o `*`, e é isso que se quer. As telas do app
  não entram no `disallow`: elas já dizem `noindex` pelo layout raiz, e um `disallow` impediria o
  robô de ler esse `noindex`, deixando o endereço aparecer na busca sem conteúdo.
- **`src/app/sitemap.ts`**: as duas páginas públicas, `/conheca` e a nova. `/termos` e
  `/privacidade` ficam fora (são `noindex` pelo layout raiz, e continuam). Os cardápios
  `/c/[contaId]` ficam fora: são da confeiteira, não do Rende (seção 6).
- **`src/app/llms.txt/route.ts`**: o `llms.txt` é uma convenção proposta, não um padrão, e
  nenhum dos grandes buscadores se comprometeu a ler. Entra porque custa um arquivo e alguns
  agentes o leem. Rota com `dynamic = "force-static"`, e não arquivo em `public/`, porque os
  links precisam do endereço absoluto (`#d178`) e o arquivo não pode ter preço escrito à mão.

O `/` não entra no sitemap: continua `noindex`, e o robô que o abre é levado a `/conheca` pelo
guarda do `(app)/layout.tsx` (`#d172`).

### O endereço absoluto vem da Vercel, e o domínio próprio é portão do deploy — `#d178`

`sitemap.xml`, `canonical`, Open Graph e `llms.txt` pedem endereço absoluto, e o projeto não tem
nenhum (o checkout usa `new URL(requisicao.url).origin`, que não existe no build).
`VERCEL_PROJECT_PRODUCTION_URL` é variável de sistema da Vercel, presente no build e na execução,
e vale o domínio de produção: o próprio quando houver, o `*.vercel.app` enquanto não houver.
Nenhuma variável nova para configurar.

```ts
// src/app/site.ts
/** O endereço público do Rende. Ver `DECISOES.md#d178`. */
export const URL_DO_SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
```

**O domínio próprio vem antes de enviar o sitemap ao Google.** O que o Google aprende sobre um
endereço fica nele; trocar de domínio depois pede redirecionamento 301 de tudo e meses para
recuperar a posição. Esta spec pode ser codificada e publicada sem domínio, mas a seção 5 só
começa com ele (`rende.com.br`, se estiver livre: `docs/marca/rende/LEIA-ME.md` ainda o marca
como "verificar").

### Dados estruturados só em `/conheca`, `SoftwareApplication` — `#d179`

Um `<script type="application/ld+json">` em `/conheca` dizendo que o Rende é um aplicativo
(`applicationCategory: "BusinessApplication"`, `operatingSystem: "Web, Android, iOS"`,
`inLanguage: "pt-BR"`) e, quando `lerPrecos()` responder, uma `Offer` por pacote com o mensal em
reais. Sem preço, sem `Offer` (`#d174`). Nenhuma `aggregateRating`: ninguém avaliou.

Na página nova, **nenhum**. O Google só mostra FAQ em destaque para sites de governo e saúde desde
2023, e "HowTo" saiu da busca no mesmo ano; o que os robôs e os chats leem é o texto, com `h2` e
`h3` no lugar certo. Um bloco de JSON repetindo a página é uma segunda cópia para manter.

---

## 2 · Antes de tocar em código

1. Ler a spec 036 e `src/app/conheca/page.tsx`: a página nova usa o mesmo topo, o mesmo rodapé e
   `ContaAberta`. **Se `Topo` e `Rodape` forem precisos nas duas, eles saem do arquivo da
   `/conheca` para `src/components/site/`**, e só então.
2. Ler `PRODUCT.md`, `DESIGN.md` e `docs/marca/rende/MARCA.md` § 1 (voz). Usar `/impeccable` com
   registro **brand**; a página é texto longo, e o que importa é a leitura no celular.
3. Ler `src/lib/domain/precificacao.ts`: `calcularPrecoSugerido` com `metodo: "MARKUP"` e o que
   ele faz com a taxa, para a seção "o erro mais comum" (3.2).

---

## 3 · Escopo

### 3.1 A metadata da raiz — `src/app/layout.tsx`

`metadataBase: new URL(URL_DO_SITE)`. Mais nada: o `robots` `noindex` continua na raiz.
`/conheca` ganha `alternates: { canonical: "/conheca" }` e `openGraph` com `title`,
`description`, `url`, `locale: "pt_BR"`, `type: "website"`, `siteName: "Rende"`. Sem imagem
(a 036 deixou `opengraph-image.tsx` fora, e continua).

### 3.2 A página — `src/app/como-calcular-o-preco-do-cookie/page.tsx`

Server component estático (sem Stripe, sem `revalidate`). `metadata`:

- `title` absoluto: "Como calcular o preço do cookie: a conta, passo a passo";
- `description`: a resposta curta, até 155 caracteres, com o número do `EXEMPLO` formatado;
- `robots: { index: true, follow: true }`, `alternates.canonical`, `openGraph` com `type:
"article"`.

Um `<main>` com `<article>`, nesta ordem. **Toda quantia sai das funções sobre `EXEMPLO`.** O
texto abaixo é o conteúdo; a redação final passa pela voz da marca e fica sem travessão
(036, seção 4, item 12).

**`h1`** "Como calcular o preço do seu cookie". Embaixo, "Atualizado em {data}", uma constante
`ATUALIZADO_EM` no arquivo, em `<time dateTime>`: data visível é o que diz a quem lê, e ao robô,
que a conta não é de 2015.

**A resposta**, um parágrafo, antes de qualquer imagem ou botão:

> Some o que cada cookie custa: ingredientes, embalagem, sua hora de trabalho, gás e energia e
> uma fatia das despesas fixas. Depois divida esse custo por 1 menos a margem que você quer e
> menos a taxa da maquininha. Um cookie que custa {4,41}, com 40% de margem e 5% de maquininha,
> sai a {8,50}.

**`ContaAberta`**, a da 036, como está: é a conta do parágrafo, parcela por parcela. Sem o
movimento da `.conta-que-abre` (aqui a conta é ilustração, não abertura de página).

**Os cinco passos**, um `h2` cada, com dois ou três parágrafos e o número da parcela do
`EXEMPLO` por unidade (o valor do segmento de `composicaoDoLote` ÷ `rende`), os rótulos de
`ROTULO_PARCELA`:

1. "Ingredientes: o custo da receita dividido pelo que ela rende". Preço do pacote ÷ gramas
   do pacote × gramas da receita; o fator de perda (a farinha que fica na tigela).
2. "Embalagem: o saquinho, a etiqueta, a fita". A parcela que quase ninguém soma.
3. "Seu trabalho: quanto vale a sua hora". Como chegar num valor por hora (quanto você quer
   tirar no mês ÷ horas na cozinha), e o tempo da receita ÷ rendimento.
4. "Gás e energia". O forno ligado pelo tempo da fornada.
5. "A fatia das despesas fixas". Aluguel, internet, MEI, divididos pelo que você produz no mês.

**`h2` "Margem e maquininha: a conta do preço"**. A fórmula em texto e em bloco:
`preço = custo ÷ (1 − margem − maquininha)`, com o `EXEMPLO` aplicado. O arredondamento para o
meio real, dito em uma frase.

**`h2` "O erro mais comum: somar a porcentagem em cima do custo"**. Quem faz "custo + 45%" cobra
{custo × 1,45} e, depois da maquininha, fica com {margem real}%, e não 40%. Os dois números por
`calcularPrecoSugerido` com `metodo: "MARKUP"` e `verificarPreco(...).margemReal`; se o markup do
app não fizer essa conta, a sessão monta `ParametrosPreco` que faça e diz no `ESTADO.md`. É a
seção que diferencia a página das calculadoras que só multiplicam.

**`h2` "Perguntas parecidas"**, lista com divisórias como as dúvidas de `/conheca`, `h3` e `p`:

1. "Quanto cobrar por um cookie?" · depende do seu custo; no exemplo, {8,50}; abaixo de
   {custo}, cada venda tira dinheiro do seu bolso.
2. "A taxa da maquininha entra no preço?" · entra, e dentro da divisão, não somada no fim.
3. "Qual a diferença entre margem e markup?" · margem é o que sobra do preço; markup é quanto
   se multiplica o custo. 40% de margem não é custo × 1,4.
4. "Quanto cobrar pela minha hora?" · o passo 3, resumido.
5. "Serve pra brigadeiro, bolo de pote, pão de mel?" · a conta é a mesma para tudo que tem
   receita e rende um tanto de unidades.

**O convite**, depois das perguntas, fora do `<article>`: "O Rende faz essa conta pra cada doce
seu, e refaz quando o preço da farinha muda." Um botão primário, "Começar o teste de
{DIAS_DE_TESTE} dias" → `/cadastro`, e um link "Ver como o Rende funciona" → `/conheca`. Sem
barra fixa no celular: é artigo, e ela cobriria o texto.

### 3.3 O link de volta — `src/app/conheca/page.tsx`

No rodapé, antes de "Dúvidas": "Como calcular o preço" → a página nova. Sem link, o robô que
entra por `/conheca` não acha a página, e a página não recebe a força do endereço principal.

### 3.4 O mapa — `robots.ts`, `sitemap.ts`, `llms.txt/route.ts`

Como decidido em `#d177`. O `llms.txt`, no formato da proposta (llmstxt.org):

```md
# Rende

> {DESCRICAO}

Aplicativo em português do Brasil para confeiteiras que vendem o que fazem: custo de cada doce,
preço sugerido, pedidos e caixa. Funciona no celular, sem internet. Teste de {DIAS_DE_TESTE} dias.

## Páginas

- [Como calcular o preço do cookie]({URL_DO_SITE}/como-calcular-o-preco-do-cookie): a conta
  passo a passo, com exemplo
- [O Rende]({URL_DO_SITE}/conheca): o que faz, os planos e as dúvidas
```

`DESCRICAO` e `DIAS_DE_TESTE` importados; nenhum preço (o do Stripe muda, e o arquivo é estático).

### 3.5 Os dados estruturados — `src/app/conheca/page.tsx`

Como decidido em `#d179`, montado num objeto e serializado com `JSON.stringify` num `<script>`
no fim do `<main>`. O `name` é "Rende", o `url` é `${URL_DO_SITE}/conheca`, o `description` é
`DESCRICAO`.

### 3.6 O teste — `tests/domain/exemplo.test.ts`

Mais duas asserções: o preço do "custo + 45%" e a margem real dele, os números que o "erro mais
comum" mostra. O teste prende o que as funções devolverem; a sessão escreve o valor no teste
depois de conferir à mão que a conta está certa.

### 3.7 Documentação

- `#d176` a `#d179` em `docs/DECISOES.md`; o "Fora de escopo" da 036 que diz "`sitemap.xml`,
  `robots.txt`, dados estruturados" ganha a nota "feito na 037".
- `docs/ESTADO.md`: a seção da 037 e a próxima ação (a seção 5 desta spec).
- `docs/DEPLOY.md`: o domínio próprio antes de enviar o sitemap (`#d178`); a 037 publica junto com
  ou depois da 036.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px e a 1280px, nos dois temas.

1. **A página.** `/como-calcular-o-preco-do-cookie`: a resposta é o primeiro parágrafo, antes de
   qualquer botão; os números batem com `/conheca` (4,41 e 8,50).
2. **Sem JavaScript.** DevTools → desativar JavaScript, recarregar: o texto inteiro está lá. É o
   que um robô que não roda JS lê (a maioria dos de IA não roda).
3. **O mapa.** `/robots.txt` com `Allow: /`, `Disallow: /api/` e o `Sitemap:`; `/sitemap.xml` com
   as duas páginas e endereço absoluto; `/llms.txt` em texto, com os dois links absolutos.
4. **Indexável.** O HTML das duas páginas sem `noindex` e com `<link rel="canonical">`; o de `/`,
   `/login` e `/termos` com `noindex`.
5. **Dados estruturados.** O HTML de `/conheca` no validador do schema.org
   (validator.schema.org): `SoftwareApplication` sem erro; com o Stripe configurado, as duas
   `Offer`.
6. **O link.** Rodapé de `/conheca` → a página nova; o convite da página nova → `/cadastro` e
   `/conheca`.
7. **Velocidade.** Lighthouse no celular, na página nova: SEO 100, acessibilidade 100, e a nota
   de desempenho anotada no `ESTADO.md`. Se a primeira pintura passar de 2,5 s, o `AuthProvider`
   no layout raiz é o suspeito (036, "Fora de escopo") e vira a próxima spec.

---

## 5 · Fora do código: o que faz a página subir

Isto é de quem conduz o projeto, depois de publicar, e é o que decide o resultado. Entra no
`ESTADO.md` como próxima ação, não como critério de aceite.

1. **Domínio próprio** apontado na Vercel como produção (`#d178`).
2. **Google Search Console** e **Bing Webmaster Tools**, com verificação por registro TXT no DNS
   (nenhum código). Enviar o `sitemap.xml` nos dois. O Bing importa além do tamanho dele: a busca
   do ChatGPT e o Copilot se apoiam no índice do Bing.
3. **Pedir indexação** das duas páginas na "Inspeção de URL" do Search Console.
4. **Gente apontando para a página.** É o que mais pesa, para o Google e para os chats: a
   professora de confeitaria que manda o link na aula, a resposta num grupo, um vídeo curto no
   Instagram fazendo a conta do cookie com o link na bio, uma resposta em fórum ou no Reddit
   quando alguém fizer a pergunta. Sempre para a página da pergunta, não para `/conheca`.
5. **Medir, uma vez por mês**, e anotar no `ESTADO.md`:
   - no Search Console, as consultas que trouxeram a página, a posição média e os cliques;
   - a pergunta "como saber o preço do meu cookie?" feita no ChatGPT, no Gemini, no Claude e no
     Perplexity, cada um numa conversa nova: se o Rende aparece, e se a página é citada.

---

## Critérios de aceite

- [ ] `/como-calcular-o-preco-do-cookie` estática, indexável, com `canonical`; a resposta inteira
      no primeiro parágrafo.
- [ ] Nenhum número de dinheiro escrito à mão na página nova: todos de `EXEMPLO` pelas funções.
- [ ] O teste prende o "custo + 45%" e a margem real dele.
- [ ] `robots.txt`, `sitemap.xml` e `llms.txt` servidos, com endereço absoluto de `URL_DO_SITE`;
      nenhum robô de IA barrado.
- [ ] `metadataBase` na raiz; `/` e o app continuam `noindex`.
- [ ] `SoftwareApplication` em `/conheca`, com `Offer` só quando há preço do Stripe.
- [ ] Link de `/conheca` para a página nova.
- [ ] Um `h1`, `h2` por seção, `h3` por pergunta; 44px em todo alvo, 52px no primário do celular.
- [ ] Nenhuma cor solta: `rg "#[0-9A-Fa-f]{6}" src/app/como-calcular-o-preco-do-cookie` vazio.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json`, `firestore.rules` e
      `firestore.indexes.json` intocados.
- [ ] `#d176` a `#d179` escritos; `ESTADO.md` e `DEPLOY.md` atualizados.

---

## 6 · Fora de escopo

- **Uma página por doce** (brigadeiro, bolo de pote, pão de mel, salgado). Volta quando o Search
  Console mostrar a página do cookie recebendo impressões: aí se sabe que o formato funciona, e as
  consultas dizem qual doce vem depois.
- **Calculadora pública, sem login.** A página com campos onde a visitante põe o custo dela e vê
  o preço. É o passo seguinte mais forte (ferramenta ranqueia e converte melhor que texto), e é
  uma spec inteira: componente de cliente, validação, o que fazer com o número depois. Escrita
  como a 040 (`specs/040-a-conta-dela.md`), sem esperar o gatilho do Search Console. **Feito na
  040** (a calculadora na sessão A e o levar para a conta na B, em 2026-09-25).
- **Blog, calendário de conteúdo, CMS.** Uma página escrita à mão não precisa de sistema.
- **Imagem de prévia (Open Graph).** Continua fora como na 036. **Feito na 039** (`#d183`).
- **Os cardápios `/c/[contaId]` indexáveis.** O cardápio é da confeiteira; pôr o dela na busca é
  decisão dela, com opção na tela, e ajuda a loja dela, não a pergunta do preço.
- **`FAQPage`, `HowTo`, `Article` em JSON-LD** (`#d179`).
- **Analytics, pixel, UTM.** O Search Console mede o que esta spec quer medir, sem dependência e
  sem banner de cookie.
- **Anúncio pago no Google.** O roadmap já recusou pago no Meta pelo mesmo motivo.
- **`/` como porta** (`#d172`). Volta com o domínio.

---

## Decisões desta spec que são fáceis de rejeitar

- **O endereço.** `/como-calcular-o-preco-do-cookie` é longo e é a pergunta. `/preco-do-cookie`
  também serviria; mudar é o nome de uma pasta, o sitemap e o link do rodapé. Mudar **depois** de
  indexada pede redirecionamento.
- **`llms.txt` entrar.** Pode não ser lido por ninguém que importa. Custa um arquivo de vinte
  linhas.
- **Sem JSON-LD na página nova.** Se o Search Console mostrar que as concorrentes com `FAQPage`
  aparecem melhor, é um `<script>`.
- **A resposta antes do convite.** Vender primeiro converte mais quem já chegou; responder
  primeiro é o que faz chegar.

---

## Riscos

- **Publicar sem domínio e trocar depois.** O que o Google aprendeu no `*.vercel.app` não vai
  junto sem redirecionamento. O `DEPLOY.md` põe o domínio antes do sitemap.
- **A página não subir.** Nada nesta spec garante posição; sem a seção 5, principalmente o item 4,
  a página existe e ninguém acha. O critério de sucesso não é o portão desta sessão: é o Search
  Console em três meses.
- **A conta da página discordar do app.** O `#d173` e o teste já cobrem: se a regra de preço
  mudar, o teste quebra antes da página ensinar errado.
- **A página publicada antes da porta.** O convite leva a `/cadastro`; a mesma ordem da 036
  (publica com ou depois da 027).

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado; a página nova, `robots.txt`, `sitemap.xml` e `llms.txt` aparecendo no `build` como rotas
estáticas. Mais o roteiro, com o passo 2 (sem JavaScript) provando que o robô lê a página inteira.
