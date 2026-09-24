# Spec 040 · A conta dela

**Tipo:** uma calculadora pública, sem login, em `/conheca` e na página do preço do cookie, que
faz a conta **do cookie dela** com as funções do app; e o caminho que leva essa conta para dentro
da conta nova. Um campo opcional novo na conta (`origem`). **Nenhuma regra, nenhum índice,
nenhuma dependência.**
**Tamanho:** duas sessões.

- **040-A · A calculadora.** Domínio, componente, as duas páginas. Publicável sozinha.
- **040-B · Levar para a conta.** O rascunho no aparelho, o botão da biblioteca que o instala, a
  origem da conta.

**Origem:** crítica da página de venda (2026-09-24), e a 037 já a nomeava ("calculadora pública,
sem login... é o passo seguinte mais forte"). Hoje o número da página é da Maynara. A visitante
lê, concorda e vai embora: nada nela é dela. Com a calculadora, o número que convence é o dela,
e criar a conta passa a ser o jeito de **não perder** a conta que ela acabou de fazer.
**Depende de:** a 036 e a 037; a 039 antes é melhor (a calculadora aponta para a seção "depois
do preço"), mas não é obrigatório. A 040-B depende da 040-A e da 027 (o cadastro).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. O campo `origem` é aditivo e opcional:
não é mudança incompatível de schema, e só o servidor o escreve.
**Sete decisões a registrar:** `#d185` a `#d191`.

---

## Problema

Três pessoas chegam à página:

1. **A que nunca fez a conta.** Lê "Este cookie te custa R$ 4,41" e pensa "o meu é diferente".
   Para ela o exemplo prova que o Rende faz conta, não que ela está perdendo dinheiro.
2. **A que acha que cobra certo.** Cobra R$ 6 porque a concorrente cobra R$ 6. Nada na página
   põe o R$ 6 dela ao lado do custo dela.
3. **A que quer testar.** Toca no botão, cria a conta e começa do zero, com a biblioteca: tudo o
   que ela pensou na página ficou lá.

A calculadora serve às três: preenchida por padrão (o resultado aparece antes de ela tocar em
nada), ela troca o que é diferente na cozinha dela, põe o preço que cobra hoje e vê, em reais,
quanto sobra ou quanto perde por cookie **e por mês**. O `MARCA.md` § 1.1 já diz o que se vende:
"o número que mostra os R$ 600 por mês que estavam indo embora no preço errado". Hoje a página
não mostra esse número a ninguém.

---

## 1 · O que esta spec decide

### A calculadora parte das receitas da biblioteca, e só faz cookie — `#d185`

Pesados:

1. **Campos soltos:** "quanto você gasta de ingrediente no lote", "quantos saem", "embalagem por
   unidade". Serve a qualquer doce, mas o "gasto de ingrediente no lote" é o número que ela não
   sabe (é o que o Rende existe para calcular), e o resultado não vira nada dentro do app: ficha
   é feita de materiais, e não de um total.
2. **Receita linha a linha, com busca de material.** É o editor do app numa página pública:
   longa demais para quem ainda não decidiu nada.
3. **As duas receitas de cookie da biblioteca (`FICHAS_DA_BIBLIOTECA`), com o que muda de cozinha
   para cozinha editável.** Escolhido. O resultado aparece sem digitar nada, cada número tem de
   onde vir, e **a conta da página é exatamente a que o app vai mostrar** depois de levada, porque
   são os mesmos materiais passando pelas mesmas funções.

Só cookie, e isso é escolha, não limite de código: a página do preço é do cookie (`#d176`), o
exemplo de `/conheca` é cookie, e a biblioteca só tem cookie. Brigadeiro e bolo entram quando a
biblioteca os tiver (seção 6).

### A sugestão da calculadora é a da conta nova — `#d186`

A página mostra o preço com a margem e a maquininha **da configuração sugerida** (35% de margem,
a maior taxa ativa das formas de pagamento sugeridas, arredondamento `CENTAVO_90`), e não os
40% + 5% do `EXEMPLO`. Motivo: é o preço que ela verá no app depois de criar a conta. Se a
página dissesse R$ 7,50 e o app R$ 6,90 para o mesmo cookie, ela desconfiaria dos dois.

Consequência no código: `CONFIGURACAO_SUGERIDA`, `rateioDaConta(null)` e
`precificacaoPadraoDaConta(null)` moram hoje em `src/lib/firebase/mutations/configuracao.ts`, que
importa Firebase. **A parte pura sai para `src/lib/domain/configuracaoSugerida.ts`**, e o arquivo
de mutações a importa de lá. Mudança de lugar, sem mudança de valor: os testes existentes
(`biblioteca`, `custoFicha`, `precificacao`) continuam passando sem tocar neles.

O `EXEMPLO` do topo continua com 40% + 5% (`#d173`); o bloco da calculadora diz a margem que usa,
como a `ContaAberta` já diz a dela.

### Uma seção própria, logo depois do topo; o exemplo do topo fica — `#d187`

O `h1` com o cookie do exemplo continua sendo a primeira coisa, e a `ContaAberta` ao lado dele
continua parada: é a frase da marca e o que a busca lê. A calculadora é a seção seguinte,
`id="sua-conta"`, com o título "Agora a conta do seu cookie".

O botão do topo muda de destino e de texto: **"Fazer a conta do meu cookie" → `#sua-conta`**. O
convite do teste passa para o fim da calculadora, que é onde ele faz sentido. Continua um botão
primário por tela: o do topo sai da tela antes do da calculadora entrar.

Na página do preço do cookie, a calculadora entra depois da seção "Margem e maquininha" e antes
de "O erro mais comum", com o título "Faça a conta do seu". O primeiro parágrafo continua sendo
a resposta (`#d176`): a calculadora é JavaScript, e o robô que não roda JavaScript lê o texto.

### O que ela pode trocar, e o que ela vê — `#d188`

**Entradas**, todas preenchidas, na ordem:

| Campo                                                | Padrão                                      |
| ---------------------------------------------------- | ------------------------------------------- |
| Qual cookie (pílulas)                                | Cookie clássico                             |
| Quantos saem da receita                              | o `rendimento` da ficha da biblioteca       |
| Quanto tempo leva, da massa ao forno desligado (min) | o `tempoProducaoMinutos` da ficha           |
| Quanto vale a sua hora                               | `valorHoraTrabalho` sugerido                |
| O preço do que você compra (fechado)                 | o `precoCompra` de cada material da receita |
| Quanto você cobra hoje, por cookie                   | vazio                                       |
| Quantos você vende por mês                           | 100; só aparece com o preço de hoje         |

"O preço do que você compra" é um `<details>` fechado, com uma linha por material da receita
escolhida: nome, embalagem ("Manteiga sem sal · 200 g") e o preço do pacote em `CampoMoeda`. As
quantidades da receita não mudam na página; a frase embaixo diz: "A receita é a da biblioteca.
No app você troca tudo: o que entra, quanto e a embalagem."

**Saídas**, recalculadas a cada tecla, sem botão de calcular:

1. As parcelas e a faixa de composição, com `Parcela` e `FaixaDeComposicao` do app.
2. O custo por unidade.
3. O preço sugerido, com a margem e a maquininha usadas ditas em uma linha.
4. **Com o preço de hoje:**
   - abaixo do custo mais a maquininha: "Cobrando R$ 6,00, você perde R$ 0,41 em cada cookie."
     Cor negativa, `trending-down` e a palavra: nunca só a cor;
   - acima disso e abaixo do sugerido: "Cobrando R$ 6,00, sobram R$ 1,29 por cookie. No preço
     sugerido sobrariam R$ 2,95.";
   - no sugerido ou acima: "Cobrando R$ 9,00, sobram R$ 3,40 por cookie. Seu preço já cobre a
     conta.", sem alarme.
5. **Com o preço de hoje abaixo do sugerido, o mês:** "Vendendo 100 por mês, são R$ 166 a mais
   pra você no preço sugerido." É a diferença de sobra por unidade vezes a quantidade. É o
   número que o `MARCA.md` vende, e só aparece quando é dela.

Os números da tabela acima são ilustrativos; os da página saem das funções.

### Levar a conta: o rascunho no aparelho, instalado pelo botão da biblioteca — `#d189` (040-B)

Pesados:

1. **Mandar a conta junto no cadastro**, e o servidor gravar a ficha. O servidor passaria a
   montar insumo e ficha, e a lógica de biblioteca existiria em dois lugares.
2. **Criar a conta automaticamente ao entrar em `/fichas`.** Escrever sem ela pedir.
3. **Guardar no aparelho e oferecer no botão da biblioteca.** Escolhido. A calculadora grava o
   rascunho no `localStorage` a cada mudança. Depois do cadastro ela cai em `/fichas` com a conta
   vazia, onde o `BotaoBiblioteca` já existe; com rascunho, o botão diz **"Trazer o cookie que
   você calculou"** e instala a biblioteca com a conta dela por cima. Um toque, o mesmo caminho
   de escrita que já existe (`#d104`, `#d114`), offline como sempre.

`localStorage` aqui é conveniência de um aparelho: se ela calcular no celular e criar a conta no
computador, o botão volta a ser o de sempre, e nada se perde que ela tivesse salvo. O rascunho
vale 30 dias (`salvoEm`) e é apagado depois de instalado. Toda leitura e escrita em
`try/catch`: navegador que bloqueia armazenamento só perde o atalho.

**O que a instalação leva:**

- o preço de cada material que ela trocou;
- o rendimento e o tempo da receita escolhida;
- o preço de hoje, como `precoVenda` da ficha: se ela perde dinheiro, **a conta nova abre
  mostrando isso**, com o aviso de ficha no vermelho que o app já tem (024);
- a hora dela, se mudou (`#d191`).

A ficha que abre é a da receita que ela escolheu, e não sempre o clássico.

### O material que ela corrigiu nasce dela — `#d190` (040-B)

`temPrecoMedio` marca como "Preço médio" o insumo com o prefixo `biblioteca-` e uma compra só no
histórico. Um material cujo preço ela digitou na calculadora não é média: é o preço dela. **O
insumo que ela corrigiu nasce sem o prefixo**, com o id `porta-{id da biblioteca}`, e a ficha
aponta para ele. O selo não aparece, e o caminho dos primeiros passos continua contando o insumo
como feito pelo mesmo fato de sempre (`temInsumo`).

### A hora dela grava a configuração; a origem fica na conta — `#d191` (040-B)

**A hora.** A ficha grava o `operacional` do momento, mas o próximo "Salvar" relê a configuração;
sem a configuração gravada, a hora dela voltaria para R$ 25 na primeira edição. Então, **se ela
mudou a hora**, a instalação grava `configuracao/geral` com a configuração sugerida e a hora dela,
no mesmo lote. Consequência aceita: o passo 3 dos primeiros passos ("Ajustar o que é seu")
aparece como feito. Ela disse a hora dela; o resto são os valores sugeridos, e a tela de
configuração continua a um toque. Se ela não mudou a hora, nada de configuração é gravado.

**A origem.** O cadastro manda `origem: "calculadora"` quando existe rascunho no aparelho;
`esquemaCadastro` aceita `origem` opcional (`z.enum(["calculadora"])`), `/api/conta` grava na
conta, e `npm run metricas` imprime a coluna. É o jeito de saber, sem evento de analytics
(038, "Fora de escopo"), quantas contas vieram da calculadora. Campo aditivo, escrito só pelo
servidor com o Admin SDK: nenhuma regra muda.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, e usar `/impeccable` com registro **brand** para a seção e
   **product** para os campos: é um pedaço do app numa página de venda, e os campos seguem as
   regras do app (48 px, rótulo acima, `CampoMoeda`).
2. Ler `src/lib/domain/biblioteca.ts`, `custoFicha.ts` (`derivarFicha`, `composicaoDoLote`),
   `custoInsumo.ts` e `precificacao.ts`.
3. Ler `src/lib/firebase/mutations/configuracao.ts` e `biblioteca.ts`, e
   `src/components/biblioteca/BotaoBiblioteca.tsx`.
4. Ler `src/components/fichas/FaixaDeComposicao.tsx` e `src/components/ui/CampoMoeda.tsx`:
   **conferir que nenhum dos dois importa Firebase**. Se importar, a calculadora não os usa e a
   sessão diz no `ESTADO.md`.

---

## 3 · Escopo · 040-A, a calculadora

### 3.1 A configuração sugerida no domínio — `src/lib/domain/configuracaoSugerida.ts`

`CONFIGURACAO_SUGERIDA`, e duas funções puras:

```ts
export function rateioSugerido(): RateioOperacional;
export function precificacaoSugerida(): ParametrosPreco;
```

`rateioDaConta(null)` e `precificacaoPadraoDaConta(null)` passam a chamar estas. O tipo
`DadosConfiguracao`, que hoje mora em `firebase/mutations/configuracao.ts`, vem junto para
`src/lib/types/`, onde o resto do schema já mora. `CONFIGURACAO_SUGERIDA` continua
exportado do arquivo de mutações (reexportado), para nenhum importador mudar.

### 3.2 A conta — `src/lib/domain/calculadora.ts`

```ts
export type ReceitaDaPorta = "cookie-classico" | "cookie-recheado";

export interface EntradaDaPorta {
  receita: ReceitaDaPorta;
  rendimento: number;
  tempoProducaoMinutos: number;
  valorHoraTrabalho: Centavos;
  /** Preço do pacote por id de material da biblioteca, só os que ela trocou. */
  precos: Record<string, Centavos>;
  precoHoje: Centavos | null;
  vendasMes: number;
}

export interface ContaDaPorta {
  derivados: DerivadosFicha; // de `derivarFicha`
  segmentos: Segmento[]; // de `composicaoDoLote`
  materiais: { id: string; nome: string; embalagem: string; preco: Centavos }[];
  hoje: VerificacaoPreco | null; // o preço de hoje, pela `verificarPreco`
  sugerido: VerificacaoPreco | null; // o arredondado, pela mesma função
  /** (sobra no sugerido − sobra hoje) × vendas; 0 quando hoje ≥ sugerido. */
  aMaisNoMes: Centavos;
}

export function entradaPadrao(receita: ReceitaDaPorta): EntradaDaPorta;
export function contaDaPorta(entrada: EntradaDaPorta): ContaDaPorta;
```

`contaDaPorta` monta os itens como `montarBiblioteca` monta, com o preço trocado onde houver
(`calcularCustoInsumo` sobre o material com o `precoCompra` dela), e chama `derivarFicha` com
`rateioSugerido()` (a hora trocada) e `precificacaoSugerida()`. **Nenhuma aritmética nova**: tudo
o que não é soma de `aMaisNoMes` é chamada a função que já existe.

Entrada fora do domínio não quebra: rendimento zero ou vazio devolve custo por unidade zero (o
que `calcularCustoFicha` já faz), e a tela pede o rendimento em vez de mostrar R$ 0,00. Preço de
pacote vazio vale o padrão daquele material.

### 3.3 O componente — `src/components/site/CalculadoraDaPorta.tsx`

Client component. Estado em `useState` com `entradaPadrao("cookie-classico")`; trocar de receita
volta rendimento, tempo e preços ao padrão daquela receita, mantém a hora, o preço de hoje e as
vendas. Nada de formulário com envio: é `onChange` e `contaDaPorta` a cada mudança (a conta é
barata; sem `useMemo` a não ser que o perfil mostre necessidade).

Layout: no desktop, entradas à esquerda e resultado à direita, **o resultado grudado**
(`sticky`) enquanto ela rola os materiais; no celular, entradas e depois o resultado, e o
resultado é o bloco de marca (`sobre-marca bg-brand-700`) como o do painel de preço, com o ponto
âmbar no preço sugerido. Uma assinatura por peça (`DESIGN.md`): a faixa e o ponto convivem aqui
pelo mesmo motivo da `ContaAberta` (`#d126`).

Números com `Dinheiro` e `num`; `aria-live="polite"` no bloco do resultado, anunciando só o custo
e o preço sugerido (anunciar tudo a cada tecla seria ruído).

**Nenhum import de `@/lib/firebase`** neste arquivo nem no que ele importa. O critério de aceite
confere com `rg`.

### 3.4 As páginas

- `/conheca`: a seção `#sua-conta` depois do topo (`#d187`); o botão do topo vira "Fazer a conta
  do meu cookie" → `#sua-conta`, secundário no desktop se o primário da calculadora estiver na
  mesma tela; âncora "Sua conta" no `Topo`. O fim da calculadora tem o primário "Começar o teste
  de {DIAS_DE_TESTE} dias" → `/cadastro`, e embaixo "Sem cartão. Veja o que acontece depois do
  preço" → `#depois` (se a 039 estiver no ar).
- `/como-calcular-o-preco-do-cookie`: a calculadora depois de "Margem e maquininha", com `h2`
  "Faça a conta do seu cookie". O convite do fim da página continua.
- A barra fixa do celular em `/conheca` continua começando depois do depoimento; conferir que
  ela e o primário da calculadora nunca aparecem juntos na tela (dois âmbar juntos é erro).

### 3.5 O teste — `tests/domain/calculadora.test.ts`

1. **A página e o app batem:** para cada receita, `contaDaPorta(entradaPadrao(r))` dá o mesmo
   `custoUnitario` e o mesmo `precoArredondado` que `derivarFicha` sobre a ficha de
   `montarBiblioteca({ operacional: rateioSugerido(), precificacao: precificacaoSugerida() })`.
   É o teste que impede a página de prometer um número que o app não mostra.
2. Subir o preço da manteiga sobe o custo por unidade.
3. Preço de hoje abaixo do custo: `hoje.lucroUnitario < 0`.
4. `aMaisNoMes` é a diferença de sobra vezes as vendas; zero quando hoje ≥ sugerido.
5. Rendimento zero não devolve `Infinity` nem `NaN`.

E os testes existentes passam sem mudança (3.1 é só mudança de lugar).

---

## 4 · Escopo · 040-B, levar para a conta

### 4.1 O rascunho — `src/lib/domain/calculadora.ts` e o componente

```ts
export const CHAVE_DO_RASCUNHO = "rende:conta-da-porta";
export interface RascunhoDaPorta extends EntradaDaPorta {
  v: 1;
  salvoEm: number;
}
export function lerRascunho(
  texto: string | null,
  agora: number,
): RascunhoDaPorta | null;
```

`lerRascunho` é pura: faz o parse, confere `v`, os tipos (`zod`, como `esquemaCadastro`) e a
idade (30 dias), e devolve `null` em qualquer dúvida. O componente grava a cada mudança
**depois da primeira interação** (abrir a página não grava nada), em `try/catch`.

Um rascunho só: calcular de novo sobrescreve.

### 4.2 A instalação — `montarBiblioteca` e `instalarBiblioteca`

`montarBiblioteca` ganha um parâmetro opcional `conta?: EntradaDaPorta`:

- material com preço em `conta.precos`: id `porta-{id}` (`#d190`), `precoCompra` dela;
- a ficha de `conta.receita`: `rendimento`, `tempoProducaoMinutos` e `precoVenda` (o preço de
  hoje, ou `null`) dela; as outras fichas, como sempre;
- os itens de qualquer ficha que usam um material trocado apontam para o `porta-…`.

`instalarBiblioteca(contaId, configuracao, conta?)`:

- com `conta` e hora diferente da sugerida: grava `configuracao/geral` no mesmo `writeBatch`,
  pelo mesmo corpo que `salvarConfiguracao` grava (`v: VERSAO_SCHEMA`, `Timestamp.now()`), e usa
  essa configuração para o `operacional` das fichas (`#d191`);
- devolve o id da ficha da receita escolhida.

Sem `conta`, o comportamento de hoje, byte a byte.

### 4.3 O botão — `BotaoBiblioteca`

Com a conta vazia e um rascunho válido: o texto vira "Trazer o cookie que você calculou", e a
linha de apoio "{nome da receita}, com os preços e a hora que você pôs. Os outros materiais vêm
com preço médio." Ao tocar, instala com a conta, apaga o rascunho e abre a ficha. Sem rascunho,
nada muda.

### 4.4 A origem — cadastro, `/api/conta`, `metricas`

- `esquemaCadastro`: `origem: z.enum(["calculadora"]).optional()`.
- `/cadastro`: com rascunho válido, manda `origem: "calculadora"`, e a descrição da moldura
  ganha "O cookie que você calculou vai estar lá."
- `/api/conta`: grava `origem` na conta quando veio.
- `Conta` em `src/lib/types/conta.ts`: `origem?: "calculadora"`, com o comentário dizendo que
  ausência é "veio por outro caminho".
- `scripts/metricas.mjs`: uma coluna `origem`.

### 4.5 O teste

- `lerRascunho`: válido, versão errada, velho demais, JSON quebrado, campo com tipo errado.
- `montarBiblioteca` com `conta`: o material trocado sai com `porta-`, a ficha escolhida com o
  rendimento e o preço de hoje dela, e **o custo da ficha montada é o custo que `contaDaPorta`
  mostrou**. Sem `conta`, a saída é igual à de hoje (o teste existente da biblioteca continua
  passando).
- `esquemaCadastro` aceita `origem: "calculadora"` e recusa outro valor.

---

## 5 · Roteiro de navegador

`npm run build && npm start`, a 390 px e a 1280 px, nos dois temas.

**040-A**

1. `/conheca`: o botão do topo leva a `#sua-conta`; a calculadora já mostra custo e preço sem
   ninguém tocar em nada.
2. Trocar para "Cookie recheado": rendimento, tempo e materiais mudam; a hora fica.
3. Abrir os materiais, subir a manteiga: custo e preço sobem na hora.
4. Preço de hoje R$ 3,00: a frase de perda, com ícone e palavra; R$ 6,00: sobra e o mês; R$ 20:
   "já cobre a conta", sem o mês.
5. Rendimento vazio: pede o rendimento, sem R$ 0,00 e sem `NaN`.
6. Leitor de tela (NVDA ou VoiceOver): trocar um campo anuncia o custo e o preço, uma vez.
7. Página do preço do cookie: a calculadora entre as duas seções; **sem JavaScript**, o texto
   inteiro continua lá e a calculadora não deixa buraco.

**040-B**

8. Na página, recheado, manteiga R$ 14, hora R$ 30, preço de hoje R$ 6. Criar a conta: a
   descrição diz que o cookie vai estar lá.
9. Em `/fichas`: "Trazer o cookie que você calculou". Tocar: abre o Cookie recheado com o
   **mesmo custo e o mesmo preço sugerido da página**, o aviso de vermelho, a manteiga sem
   "Preço médio" em `/insumos`, R$ 30 em `/configuracao`.
10. Modo avião antes do toque: a ficha abre do cache como hoje.
11. Outra conta, sem calcular antes: o botão de sempre, a biblioteca de sempre.
12. `npm run metricas`: a conta do passo 8 com `origem: calculadora`.

---

## Critérios de aceite

**040-A**

- [ ] Calculadora em `/conheca` e na página do preço, preenchida por padrão, sem botão de
      calcular.
- [ ] Nenhuma aritmética nova fora de `aMaisNoMes`; o teste prende que a página e o app dão o
      mesmo custo e o mesmo preço para as duas receitas.
- [ ] `CONFIGURACAO_SUGERIDA` no domínio, sem mudança de valor; testes existentes intactos.
- [ ] Perda com cor, ícone e palavra; o mês só com preço de hoje abaixo do sugerido.
- [ ] `rg "@/lib/firebase" src/components/site src/lib/domain/calculadora.ts src/lib/domain/configuracaoSugerida.ts`
      vazio.
- [ ] Campos com 48 px e rótulo acima; primário com 52 px no celular; um primário por tela.
- [ ] A página do preço legível sem JavaScript.

**040-B**

- [ ] Rascunho gravado só depois da primeira interação, lido com `lerRascunho`, apagado depois
      de instalado, tudo em `try/catch`.
- [ ] O botão da biblioteca leva a conta dela: materiais `porta-`, rendimento, tempo, preço de
      hoje, e a hora com a configuração quando mudou.
- [ ] Sem rascunho, biblioteca e cadastro idênticos aos de hoje.
- [ ] `origem` gravada pelo servidor e impressa por `metricas`; `firestore.rules` intocado.

**As duas**

- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.indexes.json`
      intocados.
- [ ] `#d185` a `#d191` escritos; `ESTADO.md` atualizado a cada sessão; na 037, "Calculadora
      pública" no "Fora de escopo" ganha "feito na 040".

---

## 6 · Fora de escopo

- **Outros doces** (brigadeiro, bolo de pote, pão de mel). Entram na biblioteca primeiro, e a
  calculadora os lê de lá; cada um é uma receita com preço médio conferido. Gatilho: o Search
  Console mostrando a busca por aquele doce, como na 037.
- **Receita livre, linha a linha, na página.** É o editor do app; quem quer isso já está pronta
  para o teste.
- **Mandar o resultado por WhatsApp ou e-mail sem criar conta.** Dá o número e tira o motivo de
  criar a conta. Volta se a 038 mostrar muita gente calculando e pouca criando.
- **Levar a conta entre aparelhos.** O rascunho é do aparelho; guardar no servidor exigiria
  escrita anônima.
- **Evento de analytics da calculadora.** A `origem` na conta responde a pergunta que importa.
- **Margem editável na página.** A margem é decisão que se toma com calma, no app; a página usa a
  sugerida e diz qual é.

---

## Decisões desta spec que são fáceis de rejeitar

- **Só cookie.** Se a maior parte das visitas vier de quem faz bolo, a calculadora de cookie não
  serve a elas; a saída é a biblioteca ganhar a receita, não a calculadora ganhar campos soltos.
- **Um toque para trazer, e não automático.** Se o roteiro mostrar gente tocando no outro botão
  por engano, a instalação passa a ser automática na primeira abertura de `/fichas`.
- **A hora marca o passo 3 como feito.** Se incomodar, grava-se só a hora sem marcar, o que pede
  um campo novo no fato dos primeiros passos; não vale agora.
- **Vendas por mês com padrão 100.** Um número qualquer dá uma ordem de grandeza; ela troca.

---

## Riscos

- **A página e o app divergirem.** O teste 3.5, item 1, e o 4.5, item 2, são o freio: se a regra
  de preço, a biblioteca ou a configuração sugerida mudarem, o teste quebra antes da promessa.
- **O peso da página.** A calculadora é o primeiro JavaScript próprio de `/conheca`. O domínio é
  pequeno, mas a sessão anota no `ESTADO.md` o "First Load JS" de `/conheca` antes e depois, e o
  Lighthouse no celular.
- **O preço médio envelhecer.** Os preços da biblioteca são de setembro de 2026. A página mostra o
  preço do pacote e deixa trocar, e a frase "com preço médio" diz o que ele é.
- **A frase de perda assustar.** "Você perde R$ 0,41 em cada cookie" é o número dela, dito uma
  vez, com o que fazer logo abaixo (o preço sugerido). A marca é "honesta sobre o que não sabe,
  não alarmista": nada de vermelho de página inteira, nada de ponto de exclamação.

---

## Portão de conclusão

Em cada sessão: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com
o resultado real relatado, mais os passos do roteiro daquela sessão. A 040-B termina com o passo
9 feito à mão: o número da página e o número do app, lado a lado, iguais.
