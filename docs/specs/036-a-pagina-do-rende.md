# Spec 036 · A página do Rende

**Tipo:** a página de venda. Uma rota pública nova, fora de `(app)` e de `(auth)`, renderizada no
servidor, indexável; uma linha no guarda do `(app)/layout.tsx`; uma função extraída de
`/api/assinatura/precos` para `stripe.ts`; e um exemplo fixo no domínio, com teste. **Nenhum
campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão. O que pesa é o acabamento (dois arranjos, dois temas, a barra fixa do
celular) e não a lógica.
**Origem:** a prancha `Rende - Landing.dc.html` do projeto de marca no Claude Design (web 1280 e
celular 390), pedida por quem conduz o projeto; `docs/marca/rende/MARCA.md` § 1.1 (a prova),
§ 1.3 (o manifesto) e § 2.5 (caso de cliente); o comentário do `src/app/layout.tsx` ("a página de
venda, quando existir, é outra rota e é indexável").
**Depende de:** a 027 (`/cadastro`, `DIAS_DE_TESTE`), a 028 e a 032 (os preços no Stripe, os dois
pacotes, `economiaAnual`, `O_QUE_O_PACOTE_TEM`), a 033-C (`FaixaDeComposicao`, `Parcela`,
`composicaoDoLote`, `ROTULO_PARCELA`). Tudo codificado; a 027 a 032 não publicadas.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. O que muda comportamento de quem já usa
é uma linha: o visitante **sem login, no navegador** que abre `/` vai para a página e não para
`/login` (`#d172`). O app instalado continua indo para `/login`.
**Quatro decisões a registrar:** `#d172` (a página mora em `/conheca`; `/` continua sendo o app),
`#d173` (os números da página saem do domínio, e a margem é 40% + maquininha 5%), `#d174` (o preço
é o do Stripe, os dois pacotes; sem Stripe, sem número) e `#d175` (o depoimento é dela, com
autorização escrita, ou a seção não vai ao ar).

---

## Problema

Hoje quem chega ao endereço do Rende sem login cai na tela de entrar. Não existe lugar que diga o
que o produto faz, quanto custa e para quem é, e não existe link que a professora de confeitaria,
o grupo de WhatsApp ou o Instagram possam mandar (roadmap § 4: esse é o canal).

A prancha resolve o desenho: a frase do preço com a conta do cookie aberta parcela por parcela, o
depoimento da MyCookie's, o preço e as perguntas. Mas ela foi desenhada contra o `MARCA.md` e não
contra o código, e a validação pelo `/impeccable` (seção 4) achou treze pontos onde ela diz algo que
o produto não faz, não sabe ou faz diferente. **Esta spec é a prancha com os treze corrigidos.**

**O que esta spec entrega:** `/conheca`, pública e indexável, nos dois arranjos e nos dois temas;
o visitante sem login no navegador levado a ela; os preços reais dos dois pacotes, lidos do
Stripe no servidor.

**O que esta spec não entrega:** domínio próprio, `sitemap.xml`, imagem de prévia (Open Graph),
analytics, formulário de contato, blog. Está tudo em "Fora de escopo".

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra**, para quem abre `/` no navegador sem login, a página no lugar da tela de entrar. O
  "Entrar" está no topo, a um toque.
- **Sai**: nada do app. Quem já tem login e o app instalado não vê a página nunca.

---

## 1 · O que esta spec decide

### A página mora em `/conheca`; `/` continua sendo o app — `#d172`

Três caminhos foram pesados:

1. **A página em `/` e o app em `/hoje`.** É o endereço que o Stories do `MARCA.md` § 3.5 imagina
   ("rende.com.br · 14 dias grátis"). Custa mudar todo `href="/"` e `replace("/")` do app, o
   `start_url` do manifesto, e o iPhone guarda o `start_url` do dia em que o app foi instalado: o
   ícone da Maynara passaria a abrir a página de venda, e a página precisaria de JavaScript para
   mandá-la de volta. Uma mudança de rota do app inteiro para pôr uma página de pé.
2. **Decidir no servidor, por cookie de sessão.** O login é do Firebase no aparelho (`#d14`); o
   servidor não sabe quem entrou. Seria sessão por cookie, que o projeto não tem.
3. **Uma rota nova, e `/` levando o visitante até ela.** Escolhido.

`/conheca` é uma rota estática fora de `(app)` e de `(auth)`, como `/c/[contaId]`. O guarda do
`(app)/layout.tsx` muda uma linha: sem login, **no navegador**, vai para `/conheca`; sem login,
**instalado** (`display-mode: standalone`), vai para `/login` como hoje. `sair()` continua mandando
para `/login` (`AuthProvider`, `window.location.replace`), porque quem saiu sabe o que é o Rende.

O preço disso: `/` não é indexável (o `robots` do layout raiz continua) e o visitante que digita o
endereço vê o símbolo pulsando por um instante antes da página. Os links que a gente manda
(Instagram, professora, grupo) apontam para `/conheca` direto. Quando houver domínio e o `/` virar
a porta de verdade, o caminho 1 volta à mesa com um motivo.

### Os números da página saem do domínio, e a margem é 40% + maquininha 5% — `#d173`

A prancha e o `MARCA.md` § 1.1 dizem "preço sugerido com 45% de margem: R$ 8,50" e "no preço
praticado de R$ 8,00 sobram R$ 3,19 depois da maquininha". Passado pelas funções do app, isso não
fecha:

- `verificarPreco(800, 441, 5)` dá 319: **a maquininha é 5%**.
- `calcularPrecoSugerido(441, margem 45% + taxa 5%, MEIO_REAL)` dá **R$ 9,00**, e com
  `CENTAVO_90`, R$ 8,90. Nenhuma regra de arredondamento chega a R$ 8,50 com 45% de margem e a
  maquininha que o próprio cartão desconta.
- Com **margem 40% + maquininha 5%** (45% comprometidos): 441 / 0,55 = 802 → `MEIO_REAL` → **850**.
  Os três números da prancha ficam de pé; o que estava errado era o rótulo. Os 45% do `MARCA.md`
  eram margem mais maquininha.

Uma página que vende "o sistema faz a conta" não pode ter uma conta que o sistema não faz. O
exemplo vira uma constante no domínio (3.1), a página renderiza **o resultado das funções**, e um
teste prende que o resultado continua sendo 4,41 / 8,50 / 3,19. Se alguém mudar a regra de preço,
o teste quebra antes da página mentir.

O `MARCA.md` do pacote fica como veio (`#d125`); esta decisão é a correção.

A faixa na página é exceção nomeada ao `#d126` ("onde ela não entra"): ela está lá como
reprodução do bloco "O custo do lote" do editor, com custo calculado por `composicaoDoLote`, que é
o único lugar onde o `MARCA.md` § 2.4 deixa o ponto e a faixa conviverem. Não é faixa decorativa:
é a do app, com o dado do exemplo.

### O preço é o do Stripe, os dois pacotes; sem Stripe, sem número — `#d174`

A prancha tem "Um preço, tudo dentro", mensal e anual. Desde a 032 o app vende **dois pacotes**,
Essencial e Completo, e `/assinatura` mostra os dois. A página que mostra um preço só vende uma
coisa que a tela de assinar não vende.

- A seção de preço mostra os dois pacotes, o Essencial primeiro (como em `/assinatura`, `#d167` e
  as "decisões fáceis de rejeitar" da 032: o produto é a frase do preço), cada um com o mensal em
  destaque, o anual numa linha e o que ele tem em `O_QUE_O_PACOTE_TEM`.
- O número vem do Stripe, no servidor, pela mesma função que `/api/assinatura/precos` usa (3.3),
  com `revalidate` de uma hora. Nenhum número no código (roadmap § 7).
- **Sem Stripe configurado, ou com o Stripe fora do ar,** a seção mostra os pacotes e o que cada
  um tem, sem valor, e a linha do teste. Nunca um número de reserva escrito à mão: um preço velho
  na página é uma promessa que o checkout não cumpre.

Se a 032 for revertida antes de publicar, a seção volta a ser um cartão só; é `RECURSOS_DO_PACOTE`
e o `map` sobre ele que decidem quantos cartões há.

### O depoimento é dela, com autorização escrita, ou a seção não vai ao ar — `#d175`

A prancha põe na boca da Maynara: "Eu vendia cookie a R$ 6,00. Estava perdendo R$ 0,41 em cada
um", com "Sorocaba". Três problemas:

- **A conta não fecha com a página.** Com o custo do cartão ao lado (R$ 4,41) e a maquininha de 5%,
  vender a R$ 6,00 sobra R$ 1,29, e não perde R$ 0,41. Um visitante atento lê as duas coisas na
  mesma tela.
- **Não sabemos se é verdade.** A frase não está em nenhuma gravação, decisão ou documento do
  repositório. "Sorocaba" também não.
- **Nome e rosto de uma pessoa real** numa página de venda pedem consentimento dela (LGPD, art. 7º,
  I; imagem, Código Civil art. 20), mesmo sendo da família.

Então: a frase, a cidade e a foto vêm **dela**, com os números reais do cookie dela, e com
autorização por escrito (uma mensagem de WhatsApp guardada basta). A constante `DEPOIMENTO` fica
com `[texto de quem conduz o projeto]`, e o mesmo `rg -n "\[texto" src/app` do portão do deploy da
027 a pega. Se os números dela contradisserem o exemplo, o exemplo não muda: o depoimento fala do
cookie dela, e o cartão diz "Exemplo" no título (3.2).

Sem foto autorizada, a seção vai sem foto: a citação ocupa a faixa sozinha. **Nunca um retângulo
vazio no lugar da foto.**

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md` e `docs/marca/rende/MARCA.md` § 1.3, 2.4, 2.5 e 3. Usar
   `/impeccable` com registro **brand** (é página de venda), com esta spec como brief: a seção 4 já
   é o resultado da validação da prancha e não precisa ser refeita, mas a tela pronta passa por
   `/impeccable critique` e `audit` antes do fim.
2. Ler a prancha no Claude Design (`Rende - Landing.dc.html`, projeto de marca). **As cores da
   prancha estão em hex; nenhuma entra no código**: todas têm token (seção 4, tabela).
3. Ler `src/app/c/[contaId]/page.tsx` (rota pública no servidor, `revalidate`, `generateMetadata`)
   e `src/app/api/assinatura/precos/route.ts` inteiro.
4. Conferir `/termos` para as duas frases que a página afirma sobre a assinatura: "cancela quando
   quiser, sem multa" e "no fim do teste, seus dados ficam". Se `/termos` disser outra coisa, vale
   `/termos`, e a frase da página muda.

---

## 3 · Escopo

### 3.1 O exemplo — `src/lib/domain/exemplo.ts`

```ts
/** O cookie da página de venda (`DECISOES.md#d173`). Números do `MARCA.md` § 1.1. */
export const EXEMPLO = {
  nome: "Cookie recheado",
  rende: 24,
  /** O lote inteiro, em centavos; por unidade: 3,12 · 0,45 · 0,56 · 0,18 · 0,10 = 4,41. */
  custo: {
    /* CustoFichaCalculado com custoInsumos 7488, custoEmbalagem 1080,
            custoMaoDeObra 1344, custoEnergiaGas 432, custoIndireto 240,
            custoTotalLote 10584, custoUnitario 441, o resto zero */
  },
  parametros: {
    metodo: "MARGEM",
    margemDesejada: 40,
    taxaCartaoConsiderada: 5,
    outrasTaxas: 0,
    markup: 2.5,
    arredondamento: "MEIO_REAL",
  } satisfies ParametrosPreco,
  precoPraticado: 800,
} as const;
```

A forma exata do `custo` é a de `CustoFichaCalculado`; a sessão monta o objeto que o tipo pedir.

`tests/domain/exemplo.test.ts`, um arquivo, quatro asserções: `custoUnitario` 441;
`calcularPrecoSugerido` → `precoArredondado` 850; `verificarPreco(800, 441, 5).lucroUnitario` 319;
`composicaoDoLote` com cinco segmentos, o de `Seu trabalho` em destaque.

### 3.2 A página — `src/app/conheca/page.tsx`

Server component. `export const revalidate = 3600`. `metadata`: título absoluto "Rende · o preço
certo de cada doce", `description` = `DESCRICAO`, `robots: { index: true, follow: true }` (sobrepõe
o `noindex` do layout raiz). Um `<main>` com cinco blocos, nesta ordem; o arranjo de cada um nas
duas larguras é o da prancha, com as correções da seção 4.

**Topo.** `Logotipo` (de `Marca.tsx`). No desktop, as âncoras "A conta", "Quem usa", "Preço",
"Dúvidas"; "Entrar" (`/login`) e "Testar 14 dias" (`/cadastro`) como **botão secundário**. No
celular, só o logotipo e "Entrar" com 44px. Não é fixo.

**A frase.** `h1`: "Este cookie te custa {custo}. Você deveria cobrar {preço}.", com os dois
valores formatados de `EXEMPLO` por `formatarMoeda`. O sobretítulo, o parágrafo e a linha "Sem
cartão · funciona offline, na bancada" como na prancha. **Um** botão primário: "Começar o teste de
14 dias" → `/cadastro`, 52px no celular, 56px no desktop. O "14" é `DIAS_DE_TESTE`.

**A conta aberta** (`id="conta"`), em `src/components/site/ContaAberta.tsx`, server component:

- cabeçalho: "Exemplo · {EXEMPLO.nome}" e "rende {n} unidades";
- as linhas: `Parcela` para cada segmento de `composicaoDoLote(EXEMPLO.custo)`, **por unidade**
  (o valor do segmento ÷ `rende`), com os rótulos de `ROTULO_PARCELA` — "Seu trabalho", "Energia e
  gás", "Fatia das despesas fixas", e não os da prancha;
- `FaixaDeComposicao` com os mesmos segmentos, e "Custo por unidade" com o valor em display;
- o bloco em `brand-700`: "Preço sugerido · margem 40% + maquininha 5%", o ponto âmbar, o preço em
  display, e a frase "No preço praticado de {praticado} sobram {lucro} pra você, por unidade,
  depois da maquininha." Todos os números de `EXEMPLO` pelas funções.

**Quem já usa** (`id="quem"`), faixa `brand-800` com `on-brand`. `<figure>` com `<blockquote>` e
`<figcaption>` (nome, "MyCookie's", cidade se ela autorizar). O texto é `DEPOIMENTO`, uma constante
no próprio arquivo da página com o marcador `[texto de quem conduz o projeto]` (`#d175`). A foto,
se houver: `next/image` de `public/site/`, `alt` na voz da marca ("Maynara na bancada da
MyCookie's"), 400×440 no desktop, largura cheia × 240 no celular. Sem foto, sem espaço para ela.

**Preço** (`id="preco"`). `h2` "Dois planos. O teste tem tudo." e o parágrafo: "Catorze dias
grátis, sem cartão, com tudo aberto. No fim do teste você escolhe. Se não escolher, seus dados
ficam guardados e você continua vendo tudo; só não edita." Um `<article>` por pacote, na ordem de
`RECURSOS_DO_PACOTE`: `NOME_DO_PACOTE`, o mensal em display com "por mês", a linha "ou {anual} no
ano: {economia} a menos." (só quando `economiaAnual > 0`) e `O_QUE_O_PACOTE_TEM`. Sem preço (3.3,
`#d174`), o `<article>` fica com o nome e o que tem. Os cartões não são clicáveis: o botão é um
só, embaixo, "Começar o teste de 14 dias" → `/cadastro`, com "Você só informa pagamento se decidir
continuar." Nenhum selo, nenhum filete âmbar.

**Dúvidas** (`id="duvidas"`). `h2` "Perguntas que sempre chegam". Cada pergunta é `h3` com a resposta
em `<p>`, lista com divisórias; no desktop, pergunta à esquerda (280px) e resposta à direita, como
na prancha. As cinco perguntas, com as respostas corrigidas (seção 4, itens 10 a 12):

1. "Preciso saber de contabilidade?" · como na prancha.
2. "E se não tiver internet na cozinha?" · como na prancha.
3. "Serve pra bolo, salgado, pão?" · como na prancha.
4. "Preciso cadastrar tudo pra começar?" · "Não. Um toque traz os materiais que toda cozinha tem,
   com preço médio, e dois cookies já com preço. Você corrige o que for diferente do seu."
5. "Minha cliente vai ver a marca de vocês?" · "Não no resumo de WhatsApp nem na etiqueta. No
   orçamento em A4 e no cardápio fica uma linha discreta, 'feito com Rende', que quem assina pode
   desligar."

**Rodapé**, `brand-900` com borda de cima `border-line` (no escuro o `brand-900` é o próprio
`canvas`). Logotipo negativo, "Precificação para quem faz à mão.", e os links: Dúvidas (âncora),
Contato (`mailto:` com `RESPONSAVEL.email`), Termos (`/termos`), Privacidade (`/privacidade`),
cada um com alvo de 44px.

**A barra do celular.** Abaixo de `lg`, uma barra em `surface` com borda de cima, o botão primário
"Testar 14 dias grátis" (52px) e "Sem cartão · cancela quando quiser", com `rodape-seguro`.
**Só CSS**: ela é o último filho de um `<div>` que começa **depois da conta aberta** e termina antes
do rodapé, com `sticky bottom-0`. Enquanto a frase e o botão do topo estão na tela, o `<div>` ainda
não entrou e a barra não aparece; no fim, ela descansa acima do rodapé. Nunca dois botões âmbar na
mesma tela. No desktop ela não existe.

**Tipografia.** A escala do código para tudo, menos três tamanhos que só esta página tem, em valor
arbitrário do Tailwind e fixos por arranjo (`DESIGN.md`: nada de tipografia fluida): o `h1` (2,125rem
no celular, 3,5rem no desktop), o `h2` de seção (1,75 / 2,375rem) e a citação (1,375 / 2rem). Archivo
só em 600 e 700.

**Movimento.** Só a conta abrindo: os segmentos da faixa crescendo da esquerda
(`transform: scaleX`, em sequência) e o ponto do painel de preço aparecendo por último, com a curva
`ease-quart` do código. É o que a página diz ("a conta aberta parcela por parcela"). O texto do topo
**não** entra em cascata (seção 4, item 9). Com `prefers-reduced-motion: reduce`, nada se move. Uma
classe em `globals.css` (`.conta-que-abre`), aplicada pela página na `FaixaDeComposicao` via
`className`; o componente não muda.

### 3.3 Os preços no servidor — `src/lib/server/stripe.ts`

`precoDe`, `precosDe` e o cache por instância saem de `api/assinatura/precos/route.ts` e viram
`lerPrecos(): Promise<Record<Pacote, { mensal: Centavos; anual: Centavos }>>` em `stripe.ts`. A rota
passa a chamá-la e continua exigindo token, como hoje. A página chama `lerPrecos()` só quando
`stripeDisponivel()`, dentro de `try/catch`; qualquer falha é "sem preço" (`#d174`).

### 3.4 O guarda — `src/app/(app)/layout.tsx`

```ts
useEffect(() => {
  if (carregando || usuario) return;
  // O app instalado não é vitrine: quem o instalou já sabe o que é (`#d172`).
  const instalado = window.matchMedia("(display-mode: standalone)").matches;
  router.replace(instalado ? "/login" : "/conheca");
}, [carregando, usuario, router]);
```

As outras duas guardas (`/assinatura`, `/assinatura/confirmando`) continuam indo para `/login`:
quem chega nelas veio de dentro.

### 3.5 Documentação

- `#d172` a `#d175` em `docs/DECISOES.md`; `#d126` ganha "exceção: a página de venda, `#d173`".
- `docs/ESTADO.md`: a seção da 036 e a próxima ação.
- `docs/DEPLOY.md`: o portão do deploy ganha a foto e o depoimento autorizados (`#d175`), e a
  ordem: a 036 publica **junto com ou depois da** 027 e da 032, porque sem `/cadastro` o botão da
  página leva a uma porta fechada, e sem a 032 a seção de preço mostra um pacote que não se vende.
- O comentário do `src/app/layout.tsx` sobre a página de venda passa a apontar para `/conheca`.

---

## 4 · O que a prancha pede e não entra

Resultado da validação da prancha pelo `/impeccable` (registro brand), contra `PRODUCT.md`,
`DESIGN.md`, `MARCA.md` e o código. Quem abrir a prancha ao lado da página e ver diferença nestes
pontos está vendo decisão, e não dívida.

| #   | A prancha                                                              | A página                                                                                | Por quê                                                                                                                        |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | "Preço sugerido · margem 45%"                                          | "margem 40% + maquininha 5%", números pelas funções                                     | 45% não chega a R$ 8,50 com a maquininha que o cartão desconta (`#d173`)                                                       |
| 2   | "Sua hora", "Gás e energia", "Fixos rateados"                          | `ROTULO_PARCELA`: "Seu trabalho", "Energia e gás", "Fatia das despesas fixas"           | a palavra é dela (`#d117`); a página mostra o que o app mostra                                                                 |
| 3   | "rende 24 un · fornada de 45 min"                                      | "Exemplo · Cookie recheado", "rende 24 unidades"                                        | 45 min a R$ 25/h (a sugerida) dá R$ 0,78 por unidade, e não 0,56; e "Exemplo" separa o cartão do depoimento                    |
| 4   | "Um preço, tudo dentro", um plano mensal e anual                       | os dois pacotes da 032, do Stripe                                                       | a página não vende o que `/assinatura` não vende (`#d174`)                                                                     |
| 5   | selo "mais escolhido" e filete âmbar no cartão do plano                | nenhum                                                                                  | ninguém assinou ainda: é afirmação sem dado (o mesmo "o mais pedido" que o `#d166` tirou); e o filete é uma segunda peça âmbar |
| 6   | depoimento "vendia a R$ 6,00 … perdendo R$ 0,41", "Sorocaba"           | as palavras dela, autorizadas, ou a seção sem ir ao ar                                  | a conta contradiz o cartão ao lado, e nada no repositório confirma a frase ou a cidade (`#d175`)                               |
| 7   | espaço de foto como área vazia                                         | foto autorizada, ou sem foto                                                            | retângulo no lugar de foto é proibido no registro brand                                                                        |
| 8   | "Testar 14 dias" âmbar no topo + "Começar o teste" âmbar na frase      | o do topo secundário                                                                    | um primário por tela; dois âmbar disputando é erro (`MARCA.md` § 2.2)                                                          |
| 9   | cascata de entrada no título, parágrafo e botões (40 a 400 ms)         | só a faixa e o ponto se movem                                                           | `DESIGN.md`: "nenhuma coreografia de carregamento de página"; e o `h1` invisível atrasa a primeira pintura                     |
| 10  | "Leva uns dez minutos até aparecer o primeiro número"                  | a biblioteca de um toque (018)                                                          | os dez minutos são o alvo da fase 0, ainda sem gravação; a biblioteca é fato                                                   |
| 11  | "No orçamento em A4 fica uma linha de rodapé, e você pode desligar"    | "quem assina pode desligar", e o cardápio incluído                                      | desligar é da assinatura (`#d147`), e o cardápio também leva a linha (`#d166`)                                                 |
| 12  | "você escolhe — ou não escolhe, e seus dados ficam do jeito que estão" | "Se não escolher, seus dados ficam guardados e você continua vendo tudo; só não edita." | travessão na cópia; e "do jeito que estão" esconde que a escrita trava (`#d144`)                                               |
| 13  | "Ver a conta aberta" como segundo botão da frase                       | não entra                                                                               | no desktop a conta está ao lado; no celular, logo abaixo. Um botão que rola até o que já se vê                                 |

E os de acabamento, que não mudam o desenho:

- **Âmbar como texto.** O sobretítulo "Quem já usa" em `#E3B267` sobre `brand-800` é o `--attention`
  do tema escuro usado como cor de marca. Vira `on-brand-muted`. O âmbar nunca é texto.
- **O "R$" menor** em `#8E909B` (`ink-subtle`) reprova texto (3,2:1 no `canvas`); vira `ink-muted`,
  como o `DESIGN.md` manda. No painel escuro, `on-brand-muted`.
- **Alvos:** "Entrar" do celular com 40px vira 44px; os links do rodapé ganham 44px.
- **Semântica:** a prancha tem `h2` para a frase e `span` para as perguntas. `h1` na frase, `h2` nas
  seções, `h3` nas perguntas; `figure`/`blockquote`/`figcaption` no depoimento.
- **Tokens:** todo hex da prancha tem nome. `#F7F4EE` `canvas`, `#FEFCF8` `surface`, `#EFEBE3`
  `sunken`, `#E1DCD3` `line`, `#C3BDB2` `line-strong`, `#22242E` `ink`, `#3C3E4D`/`#6A6C78`
  `ink-muted`, `#2A2C3A` `brand-700`, `#1C1E28` `brand-800`, `#15171F` `brand-900`, `#D89B3C`
  `accent-500`, `#C6862F` → `accent-600` (o hover do código, e não o da prancha), `#6E4A12`
  `accent-ink`, `#231A08` `on-accent`, `#F6F3ED` `on-brand`, `#DADCE4`/`#A8AAB5` `on-brand-muted`.
  Os quatro cinzas da faixa são os `NEUTROS` da `FaixaDeComposicao`, e não `#545768`, `#9B9DAC` e
  `#CFD0D8` (`#d126`).
- **O tema escuro**, que a prancha não desenhou, vem dos tokens: o `canvas` e a `surface` invertem, as
  faixas `brand-800` e o painel `brand-700` ficam.

O que a prancha acertou e fica: a frase do preço como título (é a do `PRODUCT.md`), o produto como
imagem do topo em vez de foto de doce (a anti-referência "aplicativo fofo de confeitaria"), a lista
com divisórias nas dúvidas em vez de sanfona, o `tabular-nums` em todo valor, a barra fixa do
celular, e a ordem das seções.

---

## Roteiro de navegador

`npm run dev`, a 390px e a 1280px, nos dois temas.

1. **A porta.** Janela anônima, `/`: o símbolo pulsa e cai em `/conheca`. "Entrar" leva a `/login`.
   Com o app instalado (Chrome → Instalar) e sem login: abre `/login`, e não a página.
2. **Quem já entrou não vê.** Logado, `/` é a tela Hoje. `/conheca` digitado abre a página (é pública),
   e "Entrar" leva ao app.
3. **Os números.** A frase diz R$ 4,41 e R$ 8,50; o cartão, as cinco parcelas somando 4,41, a faixa
   com "Seu trabalho" em âmbar, "margem 40% + maquininha 5%" e "sobram R$ 3,19". Leitor de tela na
   faixa: as parcelas com percentual.
4. **Os preços.** Com o Stripe de teste configurado: os dois pacotes com os valores do painel, a
   economia do anual. Mudar um preço no painel e esperar a revalidação: a página acompanha. Sem as
   variáveis do Stripe: os dois cartões sem valor, a página de pé.
5. **A barra do celular.** A 390px, no topo: um botão âmbar só (o da frase). Rolar até depois da
   conta: a barra aparece no pé. No fim: descansa acima do rodapé. Nunca dois âmbar na tela.
6. **O movimento.** Recarregar: a faixa abre em sequência e o ponto chega por último; o texto já
   está lá. Com "reduzir movimento" no sistema: nada se move.
7. **Teclado.** Tab do topo ao rodapé: foco visível em cada link e botão, na ordem da leitura.
8. **O portão.** `rg -n "\[texto" src/app` acha o `DEPOIMENTO` até ele ser preenchido.
9. **Indexável.** O HTML de `/conheca` sem `noindex`; o de `/` com.

---

## Critérios de aceite

- [ ] `/conheca` renderizada no servidor, `revalidate` de 3600, `robots` indexável; `/` e o resto do
      app continuam `noindex`.
- [ ] `EXEMPLO` no domínio, sem Firebase nem React; o teste prende 441, 850, 319 e os cinco
      segmentos.
- [ ] Nenhum número de dinheiro escrito à mão na página: todos de `EXEMPLO` pelas funções, ou do
      Stripe.
- [ ] `ContaAberta` usa `Parcela`, `FaixaDeComposicao`, `composicaoDoLote` e `ROTULO_PARCELA`.
- [ ] `lerPrecos()` em `stripe.ts`, usada pela rota e pela página; sem Stripe, a página mostra os
      pacotes sem valor.
- [ ] O guarda do `(app)/layout.tsx` manda o navegador para `/conheca` e o app instalado para `/login`.
- [ ] Um botão âmbar por tela nos dois arranjos; a barra do celular só em CSS.
- [ ] As treze linhas e os acabamentos da seção 4, conferidos um a um.
- [ ] Nenhuma cor solta: `rg "#[0-9A-Fa-f]{6}" src/app/conheca src/components/site` vazio.
- [ ] 44px em todo alvo, 52px no primário do celular; `h1`/`h2`/`h3` na ordem.
- [ ] `/impeccable critique` e `audit` na página pronta, com a nota antes e depois no `ESTADO.md`.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json`, `firestore.rules` e
      `firestore.indexes.json` intocados.
- [ ] `#d172` a `#d175` escritos, `#d126` anotado; `ESTADO.md` e `DEPLOY.md` atualizados.
- [ ] **Portão do deploy, fora da sessão:** o depoimento e a foto com autorização dela por escrito
      (`#d175`); a 027 e a 032 publicadas junto ou antes.

---

## Fora de escopo

- **Domínio próprio e a página em `/`.** `#d172`: volta quando houver domínio e um motivo.
- **`sitemap.xml`, `robots.txt`, dados estruturados.** Uma página indexável não precisa de mapa.
  Quando houver mais de uma, o `app/sitemap.ts` do Next é um arquivo. **Feito na 037**
  (`#d177`, `#d179`).
- **Imagem de prévia (Open Graph).** O WhatsApp mostra título e descrição sem ela. Quando o link
  circular e a prévia pedir imagem, é `app/conheca/opengraph-image.tsx`.
- **Analytics, pixel, UTM.** O canal do roadmap é gente mandando link; `scripts/metricas.mjs` já
  conta contas criadas. Sem dependência e sem banner de cookie.
- **Tirar o `AuthProvider` da página.** O layout raiz envolve tudo com ele, e a página carrega o
  Firebase Auth sem usar. `/c/[contaId]` paga o mesmo. Se o `audit` da página medir a primeira
  pintura acima de 2,5 s no celular, mover o provider para os layouts de `(app)` e `(auth)` é a
  próxima spec.
- **O logotipo da MyCookie's no depoimento** (`MARCA.md` § 2.5, "logo da cliente em destaque").
  Depende da autorização dela como a foto; se vier, é uma imagem ao lado do nome.
- **Formulário de contato, chat, depoimentos em carrossel, comparação com planilha, vídeo.**
- **A página em inglês ou espanhol.**

---

## Decisões desta spec que são fáceis de rejeitar

- **`/conheca`.** O nome é de quem conduz o projeto; mudar é o nome de uma pasta, a linha do guarda e
  o comentário do layout raiz.
- **O navegador vai para a página, o app instalado para o login.** Podia ser o login para todo mundo
  e a página só por link. Mas quem digita o endereço sem login é, quase sempre, alguém que ainda não
  sabe o que é o Rende.
- **Corrigir para 40% em vez de manter 45% e mudar o preço.** Com 45% + 5% o preço seria R$ 9,00, e
  a frase do `PRODUCT.md` e do `MARCA.md` diz R$ 8,50. Mudar o rótulo mantém a frase da marca e deixa
  a conta certa.
- **Os dois pacotes na página.** Podia mostrar só o Essencial, "a partir de". Mas o teste é o
  Completo (`#d168`), e quem testa o cardápio precisa saber, antes, que ele custa mais.
- **Sem cascata no texto.** O registro brand do `/impeccable` permite movimento de entrada; o
  `DESIGN.md` da raiz, que é a autoridade, não. A faixa se mexe porque o movimento é o conteúdo.

---

## Riscos

- **A página publicada antes da porta.** Sem a 027 no ar, "Começar o teste" leva a um `/cadastro`
  que não existe em produção. O `DEPLOY.md` põe a ordem; o passo 1 do roteiro, rodado contra
  produção, prova.
- **O visitante vê o app por um instante.** Em `/`, o `(app)/layout` mostra o símbolo pulsando até o
  Firebase dizer que não há login. Em aparelho lento, meio segundo. Os links que mandamos apontam
  para `/conheca` direto, e é por isso que o custo é aceitável.
- **O preço da página e o do checkout divergirem por até uma hora** depois de uma mudança no Stripe.
  O checkout cobra o do Stripe; a página alcança na revalidação. Mudar preço é raro e feito por quem
  conduz o projeto, que sabe esperar.
- **O depoimento não vir.** A seção sai da página e ela fica com quatro blocos. É melhor do que uma
  frase que ninguém disse.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado; `/conheca` aparecendo no `build` como rota estática com revalidação. Mais o roteiro, com o
passo 1 no app instalado provando que quem já usa o Rende nunca cai na página de venda.
