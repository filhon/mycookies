# Spec 039 · Por que todo mês

**Tipo:** uma seção nova em `/conheca` com três telas do app; o preço do plano traduzido em
cookies; o texto dos planos pelo que eles dão; quatro dúvidas novas; a origem do Rende no bloco do
depoimento; a imagem de prévia das duas páginas públicas. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência** (`next/og` vem com o Next).
**Tamanho:** uma sessão. O que pesa é o texto e as capturas de tela, não o código.
**Origem:** crítica da página de venda (2026-09-24). A página vende o preço, e preço parece conta
que se faz uma vez: nada nela responde por que pagar todo mês. Também não mostra o app por
dentro, e o link chega ao WhatsApp sem imagem, que é justamente o canal do roadmap.
**Depende de:** a 036 e a 037. Pode ir antes ou depois da 038.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Quatro decisões a registrar:** `#d181` (a seção "depois do preço", com telas de uma conta de
demonstração), `#d182` (o preço do plano em cookies), `#d183` (a imagem de prévia com as cores
escritas no arquivo e a fonte no repositório) e `#d184` (a origem do Rende contada no bloco do
depoimento, sob a mesma autorização).

---

## Problema

Quem lê `/conheca` entende o que o Rende faz no primeiro minuto de uso: a conta do cookie. Não
entende o que ele faz no segundo mês. A pergunta que trava a assinatura é "eu calculo o preço uma
vez e pronto, por que pagar R$ 39 todo mês?", e a resposta existe no app (024, fichas no
vermelho; 003, pedidos e lista de compras; 004, caixa e metas), mas cabe hoje numa linha dentro do
cartão do plano: "O preço de cada doce, os pedidos, a despensa e o caixa".

Três outras faltas, menores:

- **O app nunca aparece.** Para quem não é técnica, ver a tela é o que tira o medo de "não vou
  saber usar".
- **O plano se descreve pelo que não tem.** "Sem cardápio e sem ajudante" (`O_QUE_O_PACOTE_TEM`).
- **O link chega mudo.** A 036 e a 037 deixaram a imagem de prévia fora. Com o canal sendo gente
  mandando link, a prévia é a primeira coisa que a visitante vê, antes da página.

**O que esta spec não faz:** a calculadora (040), a medição (038), o vídeo e os depoimentos novos
(seção 6).

---

## 1 · O que esta spec decide

### A seção "depois do preço", com telas de uma conta de demonstração — `#d181`

Uma seção entre o topo e o depoimento, com três momentos do mês, um `h3` cada, duas frases e a
captura da tela que resolve aquele momento. **O argumento da mensalidade é que o preço envelhece**,
e o que o Rende faz depois é mantê-lo certo e cuidar do resto da semana.

Pesados:

1. **Reproduzir os componentes do app com dado de exemplo**, como a `ContaAberta` faz com o
   editor. Serve para um bloco; para três telas (painel de produto, pedido, caixa) seria montar
   três árvores de componentes com dezenas de props falsas, e cada mudança no app quebraria a
   página em silêncio.
2. **Capturas de tela.** Escolhido. Envelhecem quando o app muda, e isso se resolve refazendo
   três imagens; o `ESTADO.md` lembra quando.

**As capturas vêm de uma conta de demonstração, nunca da MyCookie's.** Os números da Maynara são
dela (`#d175`), e cliente real aparecendo em pedido é dado de terceiro. Quem conduz o projeto cria
a conta pelo `/cadastro` (e-mail próprio de demonstração), instala a biblioteca, cria duas
clientes com nome inventado e dois pedidos, lança um mês de caixa e define uma meta.

Sem as três imagens a seção não vai ao ar, como o depoimento sem autorização: `TELAS_DO_MES`
vazio esconde a seção, e o portão do deploy confere.

### O preço do plano em cookies — `#d182`

No cartão de cada plano, embaixo do preço: "O mês sai por {n} cookies como o do exemplo". `n` é o
mensal do Stripe dividido pelo preço sugerido do `EXEMPLO`, arredondado para cima: com R$ 39 e
R$ 8,50, 5 cookies. É o princípio 3 do `PRODUCT.md` ("todo número mostra a sua consequência")
aplicado ao nosso próprio preço, e usa o mesmo cookie que a página inteira já ensinou.

Sem preço do Stripe, sem a linha (`#d174`). Nada de "menos que um café": o café não é da
confeitaria.

### A imagem de prévia com as cores escritas no arquivo e a fonte no repositório — `#d183`

`opengraph-image.tsx` nas duas páginas, com `ImageResponse` de `next/og`, gerada no build. Duas
coisas saem da regra de sempre:

- **Cores literais.** `ImageResponse` não lê variável CSS. As quatro cores da prévia vivem num
  objeto `CORES_DA_PREVIA` no arquivo, com o nome do token ao lado de cada uma e os valores do
  `DESIGN.md` (canvas `#F7F4EE`, tinta `#22242E`, tinta apagada `#6A6C78`, âmbar `#D89B3C`). É a
  única exceção ao "nenhuma cor solta", e o critério de aceite a nomeia.
- **Fonte no repositório.** `ImageResponse` precisa do arquivo da fonte em bytes. Archivo 700 em
  `.ttf`, com a licença OFL ao lado, em `src/app/previa/`. Baixar do Google Fonts no build
  acrescentaria rede ao build.

### A origem do Rende contada no bloco do depoimento, sob a mesma autorização — `#d184`

O depoimento é de quem está perto do projeto, e a visitante desconfiada descobre isso sozinha.
Esconder não ajuda. Dizer ajuda: embaixo da citação, uma frase dizendo de onde o Rende veio.

> O Rende nasceu na cozinha da MyCookie's. Tudo o que ele sabe sobre a bancada veio de ver a
> Maynara trabalhar.

A frase fala dela: entra na mesma autorização por escrito do `#d175`, e sai junto se ela não
autorizar.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, `docs/marca/rende/MARCA.md` § 1.1 e § 3, e usar
   `/impeccable` com registro **brand**.
2. Ler `src/app/conheca/page.tsx` e `src/lib/domain/assinatura.ts`.
3. **Conferir no app cada frase da seção nova** antes de escrevê-la: o aviso da 024 diz qual
   material subiu (`custoDeHoje(...).culpado`)? O pedido monta a lista do mercado? O orçamento vai
   por WhatsApp? A meta diz quantos doces faltam? Se algum não fizer exatamente isso, a frase muda
   para o que ele faz. A página não promete o que o app não entrega.
4. **As capturas existem** em `public/site/` (seção 3.1) antes da sessão, ou a sessão as faz com
   a conta de demonstração que quem conduz o projeto criou.

---

## 3 · Escopo

### 3.1 As capturas — `public/site/`

Três imagens, tema claro, do celular (DevTools, dispositivo de 390 × 844, "Capture screenshot"),
recortadas na parte da tela que importa, WebP até 120 KB cada:

| Arquivo                   | A tela                                                                |
| ------------------------- | --------------------------------------------------------------------- |
| `mes-manteiga-subiu.webp` | a tela Hoje com o cartão de fichas no vermelho, nomeando a manteiga   |
| `mes-encomenda.webp`      | o editor de pedido com o total, o quanto sobra e o botão do orçamento |
| `mes-caixa.webp`          | o painel do mês com entradas, saídas e a meta com os doces que faltam |

Para a primeira, na conta de demonstração: salvar as fichas, depois subir o preço da manteiga em
`/insumos`.

### 3.2 A seção — `src/app/conheca/page.tsx`

Uma constante `TELAS_DO_MES` (título, texto, `src`, `alt`) e a seção `DepoisDoPreco`, entre o
topo e `QuemJaUsa`, com `id="depois"`. Rascunho do texto, que passa pela voz da marca e fica sem
travessão:

**`h2`** "O preço certo de hoje fica errado quando a manteiga sobe"
**Apoio:** "Por isso o Rende não é uma conta que se faz uma vez. Ele fica de olho no preço e cuida
do resto da semana."

1. **"A manteiga subiu."** "Você corrige o preço do pacote uma vez. O Rende refaz o custo de todo
   doce que usa manteiga e mostra qual ficou no vermelho, e por quê."
2. **"Chegou uma encomenda."** "O total, quanto sobra pra você e o orçamento pronto pro WhatsApp.
   A lista do mercado já sai com o que falta comprar."
3. **"Fechou o mês."** "Quanto entrou, quanto saiu e quantos doces faltam pra bater a sua meta."

Composição: **nada de grade de três cartões iguais.** Uma linha por momento; no desktop, texto e
imagem lado a lado, alternando o lado; no celular, texto e imagem empilhados. Imagem com
`next/image`, `width` e `height` reais, `sizes`, borda `border-line`, `rounded-lg`,
`shadow-raised`, largura máxima de 18rem. Sem moldura de aparelho desenhada. O `alt` diz o que a
tela mostra, com os números dela ("Aviso do Rende: o Cookie clássico ficou no vermelho porque a
manteiga subiu R$ 0,40"), não "captura de tela".

Âncora nova no `Topo`: "Depois do preço" → `#depois`, entre "A conta" e "Quem usa".

### 3.3 O preço em cookies — `src/lib/domain/assinatura.ts` e `Preco`

```ts
/** Quantas unidades a este preço pagam o valor. Para cima: 4,6 cookies são 5. */
export function unidadesQuePagam(
  valor: Centavos,
  precoUnidade: Centavos,
): number;
```

`precoUnidade` zero ou negativo devolve 0, e a linha não aparece. `Preco` chama com
`preco.mensal` e o `precoArredondado` do `EXEMPLO`, e mostra embaixo do mensal: "O mês sai por
{n} cookies como o do exemplo." Em `text-label`, número em `num font-semibold text-ink`.

### 3.4 Os planos pelo que dão — `O_QUE_O_PACOTE_TEM`

A constante também é o texto de `/assinatura`, e é bom que mude lá junto.

- **Essencial:** "O preço de cada doce e o aviso quando um custo sobe, as encomendas com a lista
  do mercado, e o caixa do mês com a sua meta."
- **Completo:** "Tudo do Essencial, mais o cardápio com link pra cliente pedir sozinha e até
  {LIMITE_DE_AJUDANTES} ajudantes com acesso só ao que você liberar."

Conferir contra a 030 se "só ao que você liberar" é o que a ajudante tem; se não for, a frase diz
o que ela tem.

### 3.5 As dúvidas — `DUVIDAS`

Quatro novas, e a ordem passa a ser a das objeções mais fortes primeiro:

1. "Preciso saber de contabilidade?" (existe)
2. **"Por que pagar todo mês, se o preço eu calculo uma vez?"** "Porque o preço não fica parado.
   A manteiga sobe, a embalagem muda, a maquininha troca de taxa. Quando um preço muda, o Rende
   refaz a conta de todos os doces e avisa qual ficou no vermelho. E cuida das encomendas e do
   caixa, que são de toda semana."
3. **"Já uso uma planilha. O que muda?"** "A planilha faz a conta que você montou. O Rende já vem
   com a conta montada, soma o que a planilha costuma esquecer (embalagem, sua hora, gás,
   maquininha) e funciona no celular, na bancada, sem internet."
4. "Preciso cadastrar tudo pra começar?" (existe)
5. "Serve pra bolo, salgado, pão?" (existe)
6. "E se não tiver internet na cozinha?" (existe)
7. **"Precisa instalar? Funciona no iPhone?"** "Abre no navegador de qualquer celular ou
   computador. Se quiser, você põe na tela de início e ele vira um ícone, como um aplicativo. No
   iPhone e no Android."
8. **"Meus dados são meus?"** "São. Você baixa tudo num arquivo quando quiser, assinando ou não, e
   pode encerrar a conta quando decidir." (Conferir contra a 029.)
9. "Minha cliente vai ver a marca de vocês?" (existe)

### 3.6 A origem — `QuemJaUsa`

A frase do `#d184` embaixo da `figcaption`, em `text-body text-on-brand-muted`, `max-w-[52ch]`.
Um campo `origem` em `DEPOIMENTO`, para ela sair junto com o resto se a autorização não vier.

### 3.7 A prévia — `src/app/previa/` e os dois `opengraph-image.tsx`

- `src/app/previa/Archivo-Bold.ttf` e `OFL.txt`.
- `src/app/previa/previa.tsx`: `desenharPrevia({ linhaDeCima, frase })` devolve o
  `ImageResponse` de 1200 × 630: fundo canvas, o nome "Rende" em Archivo com o ponto âmbar,
  `linhaDeCima` em tinta apagada, `frase` grande em tinta. `CORES_DA_PREVIA` mora aqui.
- `src/app/conheca/opengraph-image.tsx`: `linhaDeCima` "Você sabe fazer doce. Isso nunca foi o
  problema.", `frase` a do `h1` com os números do `EXEMPLO`.
- `src/app/como-calcular-o-preco-do-cookie/opengraph-image.tsx`: `linhaDeCima` "Como calcular o
  preço do seu cookie", `frase` a resposta curta com os números do `EXEMPLO`.
- Os dois exportam `alt`, `size` e `contentType`. A fonte é lida com `readFile` no build.

Nenhum número escrito à mão: os dois arquivos chamam as funções sobre `EXEMPLO` (`#d173`).

### 3.8 O teste — `tests/domain/assinatura.test.ts`

`unidadesQuePagam(3900, 850) === 5`, `unidadesQuePagam(850, 850) === 1`,
`unidadesQuePagam(3900, 0) === 0`.

### 3.9 Documentação

- `#d181` a `#d184` em `docs/DECISOES.md`; na 036 e na 037, "Imagem de prévia" no "Fora de
  escopo" ganha "feito na 039".
- `docs/ESTADO.md`: a seção da 039; **as capturas envelhecem**: toda spec que mudar a tela Hoje,
  o editor de pedido ou o painel do mês refaz a imagem correspondente.
- `docs/DEPLOY.md`: as três imagens em `public/site/` e a frase da origem autorizada são portão.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390 px e a 1280 px, nos dois temas.

1. **A seção.** Entre a conta e o depoimento; no desktop, texto e imagem alternam de lado; no
   celular, empilham. As imagens nítidas e sem salto de layout.
2. **O escuro.** As capturas são do tema claro e continuam claras no escuro: a borda
   `border-line` as separa do fundo.
3. **O preço.** Com o Stripe: "O mês sai por 5 cookies" (com R$ 39). Sem o Stripe: nem a linha,
   nem o preço.
4. **As dúvidas.** Nove, na ordem da seção 3.5.
5. **A prévia.** `/conheca/opengraph-image` e a da página do preço abrem como PNG; o HTML das
   duas tem `og:image` com endereço absoluto. Colar o link numa conversa do WhatsApp consigo
   mesmo (depois do deploy) e ver a imagem.
6. **Sem autorização.** `DEPOIMENTO.texto` vazio: some o bloco inteiro, com a frase da origem.

---

## Critérios de aceite

- [ ] Seção "depois do preço" com três momentos, sem grade de cartões iguais, cada frase
      conferida contra o app.
- [ ] As três capturas de uma conta de demonstração, WebP até 120 KB, com `alt` que descreve o
      número da tela.
- [ ] `unidadesQuePagam` no domínio, com teste; a linha só aparece com preço do Stripe.
- [ ] `O_QUE_O_PACOTE_TEM` diz o que cada plano dá, sem "sem".
- [ ] Nove dúvidas, na ordem da seção 3.5.
- [ ] A frase da origem sai junto com o depoimento.
- [ ] Prévia nas duas páginas, 1200 × 630, números do `EXEMPLO`.
- [ ] Nenhuma cor solta fora de `CORES_DA_PREVIA`: `rg "#[0-9A-Fa-f]{6}" src/app src/components`
      só acha `src/app/previa/previa.tsx`.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json`, `firestore.rules` e
      `firestore.indexes.json` intocados.
- [ ] `#d181` a `#d184` escritos; `ESTADO.md` e `DEPLOY.md` atualizados.

---

## 5 · Fora do código

De quem conduz o projeto, e é o que mais pesa depois da calculadora:

1. **Três confeiteiras de fora usando o app por duas semanas**, e cada uma dizendo, com número,
   o que mudou ("cobrava R$ 5, agora cobro R$ 7,50 e não perdi cliente"). Com autorização por
   escrito, como a da Maynara. Quando a segunda chegar, `DEPOIMENTO` vira lista (seção 6).
2. **A foto da Maynara na bancada**, se ela autorizar (`#d175`).

---

## 6 · Fora de escopo

- **Vídeo** de 30 a 60 segundos, da receita ao preço. Volta quando a 040 estiver no ar: o vídeo
  bom é a calculadora sendo usada, e ele serve igual no Instagram.
- **Mais de um depoimento.** `DEPOIMENTO` vira lista quando houver o segundo autorizado; lista de
  um item é estrutura antes da hora.
- **Tabela comparando os planos, linha a linha.** Com dois planos e uma diferença (cardápio e
  ajudante), o texto de cada cartão basta.
- **Garantia de reembolso.** O teste de 14 dias sem cartão já tira o risco antes do pagamento.
- **Trocar o texto do botão principal.** "Calcular o preço do meu doce" só é verdade quando a
  calculadora existir: entra na 040.
- **Comparação com planilha**, em tabela. A dúvida 3 responde em duas frases.

---

## Decisões desta spec que são fáceis de rejeitar

- **Capturas, não componentes.** Se o app mudar demais e as imagens envelhecerem sempre, voltar a
  reproduzir o componente, um por vez, começando pelo que mais muda.
- **"O mês sai por 5 cookies."** Pode soar como conta de vendedor. A alternativa é tirar a linha;
  a divisão não custa nada a manter.
- **A origem dita.** Se a Maynara preferir não aparecer como origem, a frase sai e o depoimento
  fica.

---

## Riscos

- **A frase prometer mais que o app.** A seção 2, item 3, é o freio: cada frase é conferida
  contra a tela antes de ir ao ar.
- **Dado real na captura.** A conta é de demonstração, e as clientes têm nome inventado. O
  roteiro confere as três imagens ampliadas.
- **As imagens pesarem no celular.** WebP até 120 KB, `sizes` certo, abaixo da dobra: o
  `next/image` carrega preguiçoso.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado; as duas `opengraph-image` no `build` como rotas estáticas. Mais o roteiro, com o passo 5
(a prévia) conferido no primeiro deploy.
