# Spec 068 · A pergunta de cada doce

**Tipo:** três rotas públicas novas, uma por doce (brigadeiro, bolo por quilo, bolo de pote), e
uma quarta que reúne as quatro, "como calcular o preço de doces". As peças do artigo saem da
página do cookie para um arquivo de componentes; uma lista única das páginas do preço alimenta o
sitemap, o `llms.txt`, a medição e os links entre elas. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.**
**Tamanho:** quatro sessões, A a D, uma página cada. O que pesa é o texto, não o código: cada
página precisa ser boa sozinha, e não a do cookie com outra palavra.
**Origem:** pedido de quem conduz o projeto (2026-10-01): pelo menos mais três páginas como
`/como-calcular-o-preco-do-cookie`, para aparecer em mais buscas e em mais respostas de chat.
**Depende de:** a 037 (a página do cookie, o mapa, `URL_DO_SITE`), a 039 (`desenharPrevia`), a
038 (`Medicao`), todas codificadas.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Quatro decisões a registrar:** `#d256` (três doces agora, sem esperar o Search Console, e
cada um com conta e erro próprios), `#d257` (as peças do artigo e a lista das páginas do preço),
`#d258` (o exemplo de cada doce na unidade em que ele se vende) e `#d259` (a página de doces como
porta das outras).

---

## Problema

A 037 pôs no ar uma pergunta: "como calcular o preço do cookie". Quem vende brigadeiro, bolo e
bolo de pote faz a mesma pergunta com outra palavra, e as outras palavras têm mais gente
perguntando: "quanto cobrar o cento de brigadeiro", "como calcular o preço do bolo por quilo",
"preço de bolo de pote", "como precificar doces". Hoje o Rende não tem resposta para nenhuma.

A 037 deixou "uma página por doce" fora, com gatilho: voltar quando o Search Console mostrasse a
do cookie recebendo impressões. O gatilho não chegou (a tabela mensal do `ESTADO.md` está vazia,
e o Search Console ainda não foi ligado). Quem conduz o projeto decidiu não esperar. A spec aceita
e diz o custo: as páginas novas nascem sem saber se o formato funciona, e o que a 037 queria
aprender antes passa a ser aprendido com quatro páginas em vez de uma.

### O que esta spec não promete

**Mais páginas não é mais posição.** O Google trata como "página-porta" (doorway, nas políticas
de spam dele) o conjunto de páginas quase iguais feitas para pegar variações de uma busca, e
rebaixa o site inteiro, não só elas. Trocar "cookie" por "brigadeiro" no texto da 037 é
exatamente isso. Os chats de IA fazem o mesmo filtro por outro caminho: citam a página que diz
algo que as outras não dizem.

Por isso cada página nova tem **o que só ela tem**: o exemplo na unidade em que aquele doce se
vende (o cento, o quilo, o pote), a parcela que pesa nele e o erro que é dele. A conta (os cinco
passos e a divisão) é a mesma, e o texto que a explica é reescrito para o doce, nunca colado.

O resto continua sendo a seção 5 da 037, fora do código: domínio, Search Console, gente
apontando para as páginas.

---

## 1 · O que esta spec decide

### Três doces agora, cada um com conta e erro próprios — `#d256`

Pesados:

1. **Esperar o gatilho da 037.** O certo pelo método, e quem conduz o projeto recusou: o Search
   Console nem está ligado, e o gatilho pode levar meses para existir.
2. **Uma página por doce da biblioteca, com o texto da do cookie.** Rápido, e é página-porta.
3. **Três doces escolhidos pelo que a pergunta tem de diferente.** Escolhida.

Os três, e o que cada um ensina que a página do cookie não ensina:

| Doce         | Vende por | O que só esta página tem                                                               |
| ------------ | --------- | -------------------------------------------------------------------------------------- |
| Brigadeiro   | cento     | O trabalho de enrolar é a maior parcela; a unidade avulsa sobe mais no arredondamento  |
| Bolo         | quilo     | Caixa, base e decoração não crescem com o peso: o quilo do bolo pequeno custa mais     |
| Bolo de pote | pote      | A embalagem pesa; vendido por aplicativo de entrega, a comissão entra na mesma divisão |

Pão de mel, ovo de Páscoa, salgado, kit e torta ficam fora (seção 6). O ovo de Páscoa tem data:
se for entrar, entra até janeiro de 2027 para a Páscoa de 28 de março.

### As peças do artigo e a lista das páginas do preço — `#d257`

**As peças.** A página do cookie tem, dentro dela, o que as outras vão repetir: `Valor`,
`TITULO_H2`, o cabeçalho com "Atualizado em", a lista numerada dos passos, o bloco da fórmula,
"Perguntas parecidas" e o convite. Pesados: copiar a página três vezes (quatro cópias de 400
linhas que desalinham na primeira mudança de estilo), um componente-página que recebe tudo por
configuração (cada doce tem uma seção que os outros não têm, e o componente vira um formulário de
opções) e **peças pequenas que cada página monta na ordem dela**. Escolhida a última, num arquivo
só: `src/components/site/Artigo.tsx`.

**A lista.** Uma constante, `PAGINAS_DO_PRECO`, em `src/app/site.ts` ao lado de `URL_DO_SITE`:

```ts
/** As páginas que respondem "como calcular o preço" (`DECISOES.md#d257`). */
export const PAGINAS_DO_PRECO = [
  { endereco: "/como-calcular-o-preco-do-cookie", doce: "Cookie", resumo: "…" },
  // uma linha por sessão
] as const;
```

O sitemap, o `llms.txt`, o `CAMINHOS_MEDIDOS` da `Medicao` e o bloco "Outros doces" leem dela.
Sem a lista, cada página nova é cinco arquivos a lembrar de mexer, e o primeiro esquecido é uma
página que o robô não acha ou que a medição não conta.

### O exemplo de cada doce na unidade em que ele se vende — `#d258`

Como o `#d173`: todo número de dinheiro sai das funções do app (`calcularPrecoSugerido`,
`verificarPreco`, `composicaoDoLote`) sobre um objeto em `src/lib/domain/exemplo.ts`, e o teste
prende. **Nenhuma aritmética nova**, salvo a soma do bolo (abaixo).

A unidade do exemplo é **a unidade de venda**, não a da receita:

- **Brigadeiro:** o lote é um cento, `rende: 1`. A receita rende 100, mas ninguém vende um
  brigadeiro de R$ 1,77; vende o cento. Com `rende: 1`, a `ContaAberta` mostra as parcelas do
  cento e o preço do cento, e nenhuma conta da página divide e remultiplica por 100.
- **Bolo:** a unidade é o quilo, e o custo é **uma parte fixa por bolo mais uma parte por
  quilo**. É o único exemplo que precisa de função: `boloDe(quilos)`, que soma as duas partes e
  devolve um `CustoFichaCalculado` com `rende: quilos`. A página usa o de 2 kg como exemplo e os
  de 1, 2 e 3 kg na seção do erro.
- **Bolo de pote:** o pote, `rende: 10`. Mais um `ParametrosPreco` "no aplicativo": cartão 0%,
  `outrasTaxas` 20% (comissão e pagamento online somados, número de exemplo, dito como tal).

**O app conta o bolo em gramas, a página em quilos.** `derivarFicha` arredonda `custoUnitario`
para o centavo inteiro; numa ficha com rendimento em gramas isso é até meio centavo por grama, ou
R$ 5,00 por quilo, para cima ou para baixo. A página não herda o problema porque divide por
quilo, mas a confeiteira que seguir a página e cadastrar o bolo em gramas pode ver no app um
número diferente. Fica registrado em Riscos e como spec própria (seção 6); esta não mexe no
domínio do app.

### A página de doces como porta das outras — `#d259`

`/como-calcular-o-preco-de-doces` responde a pergunta larga ("como precificar doces", "como
calcular o preço de doces para vender"), que tem mais gente perguntando que qualquer doce
sozinho. Ela **não repete** os cinco passos da página do cookie com outros números: diz a conta
em um parágrafo, cada parcela em uma frase, e mostra **o que muda de doce pra doce** numa tabela
com os quatro exemplos, cada linha levando à página do doce.

O rodapé passa a apontar para ela ("Como calcular o preço", o mesmo rótulo), e não mais para a
do cookie; cada página de doce aponta para ela e para as irmãs. É a forma que os buscadores
entendem como assunto coberto: uma página larga ligada a páginas fundas, e elas ligadas de volta.

---

## 2 · Antes de tocar em código (toda sessão)

1. Ler a spec 037 inteira e `src/app/como-calcular-o-preco-do-cookie/page.tsx`: o formato é o
   dela, e o que a 037 decidiu (responder primeiro, sem JSON-LD, convite depois do artigo, sem
   barra fixa) vale aqui sem ser repetido.
2. Ler `PRODUCT.md`, `DESIGN.md` e `docs/marca/rende/MARCA.md` § 1 (voz). `/impeccable` com
   registro **brand**: texto longo, lido no celular.
3. Rodar o texto final pela skill `humanizer` antes de fechar: sem travessão (036, seção 4, item
   12), sem trinca de adjetivos, sem frase de efeito.
4. **Pesquisar a pergunta antes de escrever.** Buscar a consulta principal da página (tabela da
   seção 3) e ler as cinco primeiras respostas. A página nova precisa responder o que elas
   respondem e dizer o que nenhuma diz. Se todas já disserem o "só esta página tem" da tabela
   do `#d256`, a sessão para e avisa: o ângulo precisa mudar antes do texto.

---

## 3 · Escopo

As quatro páginas seguem a 037, 3.2: server component estático; `metadata` com `title`
absoluto, `description` até 155 caracteres com o número do exemplo, `robots: { index: true,
follow: true }`, `alternates.canonical`, `openGraph` `type: "article"`; `ATUALIZADO_EM` em
`<time>`; um `h1`, `h2` por seção, `h3` por pergunta; **a resposta inteira no primeiro
parágrafo, antes de qualquer conta ou botão**; o convite fora do `<article>`.

Toda página nova também:

- ganha um `opengraph-image.tsx` de vinte linhas com `desenharPrevia`, como o do cookie;
- entra em `PAGINAS_DO_PRECO` (e, por ela, no sitemap, no `llms.txt` e na medição);
- termina o artigo com o bloco **"Outros doces"**: as outras páginas da lista, cada uma com o
  `resumo`, e a de doces por último ("A conta pra qualquer doce"). Lista simples, `h2` e links;
  sem cartão, sem imagem.

| Sessão | Endereço                                   | `title`                                                     | Consulta principal                   |
| ------ | ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------ |
| A      | `/como-calcular-o-preco-do-brigadeiro`     | Como calcular o preço do brigadeiro: a unidade e o cento    | quanto cobrar o cento de brigadeiro  |
| B      | `/como-calcular-o-preco-do-bolo-por-quilo` | Como calcular o preço do bolo por quilo, passo a passo      | como calcular o preço do bolo por kg |
| C      | `/como-calcular-o-preco-do-bolo-de-pote`   | Como calcular o preço do bolo de pote, passo a passo        | como precificar bolo de pote         |
| D      | `/como-calcular-o-preco-de-doces`          | Como calcular o preço de doces: a conta que serve pra todos | como precificar doces                |

Os números abaixo foram conferidos à mão contra `calcularPrecoSugerido` (`Math.round` do custo ÷
divisor, depois `MEIO_REAL` sobe ao próximo múltiplo de 50 centavos) e `verificarPreco` (taxa por
`Math.round`). **A sessão confere de novo e o teste prende o que as funções devolverem**; se um
número divergir, vale o da função, e a diferença vai para o `ESTADO.md`.

### Sessão A · As peças e o brigadeiro

**A.1 As peças — `src/components/site/Artigo.tsx`.** Saem da página do cookie, sem mudar o que
ela mostra: `Valor`, `TITULO_H2`, `CabecalhoDoArtigo` (`h1`, "Atualizado em", o parágrafo da
resposta como `children`), `Passos` (a `<ol>` com número, `h2`, parágrafos e a linha "No
exemplo"), `Formula` (o bloco `bg-sunken`), `Perguntas`, `OutrosDoces` e `Convite` (frase,
primário para `/cadastro`, terciário para `/conheca`). O `fracao` também vai. **A página do cookie
passa a montar as peças, e o HTML dela sai igual**, mais o bloco "Outros doces": comparar o HTML
do `build` antes e depois é o teste da extração.

**A.2 A `ContaAberta` recebe o exemplo.** Duas props novas: `exemplo` (o objeto, com o `EXEMPLO`
do cookie como padrão) e `unidade` (`{ singular, plural }`, padrão `unidade`/`unidades`). "rende
{rende} {plural}" e "Custo por {singular}"; a última frase diz "por {singular}". `/conheca` não
muda.

**A.3 O exemplo — `EXEMPLO_BRIGADEIRO` em `exemplo.ts`.** "Cento de brigadeiro tradicional",
`rende: 1`, parâmetros do cookie (40% + 5%, `MEIO_REAL`), `precoPraticado: 15000` (o cento "pelo
preço da vizinha").

| Parcela (o cento)  | Centavos | De onde vem                                                         |
| ------------------ | -------- | ------------------------------------------------------------------- |
| Ingredientes       | 4200     | Quatro receitas de leite condensado, chocolate, manteiga, granulado |
| Embalagem          | 600      | Cem forminhas e a caixa                                             |
| Seu trabalho       | 4000     | Duas horas a R$ 20: as quatro panelas e enrolar cem                 |
| Gás e energia      | 400      | O fogão nas quatro panelas                                          |
| Despesas fixas     | 500      |                                                                     |
| **Custo do cento** | **9700** | R$ 0,97 cada                                                        |

Preço do cento: 9700 ÷ 0,55 = 17636 → **R$ 176,50**. No preço da vizinha, R$ 150, a maquininha
leva 750 e sobram 4550, 30% em vez de 40%.

**A.4 A página.** Na ordem:

- **Resposta:** "Some o que o cento custa: ingredientes das quatro receitas, as forminhas, as
  horas de panela e de enrolar, o gás e uma fatia das despesas fixas. Divida por 1 menos a margem
  e menos a maquininha. Um cento que custa R$ 97,00, com 40% de margem e 5% de maquininha, sai a
  R$ 176,50."
- `ContaAberta` com o exemplo e `unidade: { singular: "cento", plural: "centos" }`.
- **Os cinco passos**, reescritos para o brigadeiro: a receita pela lata (o leite condensado é a
  maior parte, e muda de preço toda semana); a forminha que ninguém soma; **o trabalho como a
  maior parcela**, com o tempo de enrolar medido ("cronometre dez e multiplique por dez"); o gás
  da panela, que é pouco; as fixas.
- **A fórmula** com o cento.
- **`h2` "O erro do brigadeiro: esquecer a hora de enrolar".** Sem o trabalho, o cento custaria
  5700 e sairia a 5700 ÷ 0,55 = 10364 → **R$ 104,00**. Vendido a R$ 104,00 com o custo de
  verdade, a maquininha leva 520 e sobram **R$ 1,80 pelas duas horas**. Os dois números por
  `calcularPrecoSugerido` e `verificarPreco`, lado a lado como o `dl` do erro do cookie, com o
  ícone de queda no errado.
- **`h2` "A unidade avulsa"**: o custo de um brigadeiro, R$ 0,97, pede 97 ÷ 0,55 = 176 → **R$
  2,00** no meio real: 13% acima do cento dividido por cem. Uma frase: é por isso que a unidade
  avulsa sai mais cara, e está certo que saia. Números por `calcularPrecoSugerido(
Math.round(custo / 100), parametros)`.
- **Perguntas** (rascunho, a sessão ajusta à pesquisa do passo 2.4): "Quanto cobrar o cento de
  brigadeiro?" · "Brigadeiro gourmet custa mais por quê?" (muda o ingrediente, não a conta) ·
  "Quanto cobrar o brigadeiro avulso?" · "Dar desconto no cento é prejuízo?" (o desconto sai da
  margem: 10% no preço de R$ 176,50 deixa {verificarPreco} de sobra) · "E o docinho de festa,
  beijinho, cajuzinho?" (a mesma conta).
- **Outros doces**, depois o convite: "O Rende faz essa conta pra cada doce seu, e refaz quando a
  lata de leite condensado sobe."

**A.5 O resto da sessão A:** `PAGINAS_DO_PRECO` com o cookie e o brigadeiro; `sitemap.ts`,
`llms.txt/route.ts` e `CAMINHOS_MEDIDOS` lendo dela; o `opengraph-image.tsx` do brigadeiro.

### Sessão B · O bolo por quilo

**B.1 O exemplo — `boloDe(quilos)` em `exemplo.ts`.** "Bolo de brigadeiro com ninho", parâmetros
do cookie.

```ts
/** O que um bolo leva por inteiro, pese o que pesar: caixa, base e o tempo de decorar. */
const POR_BOLO = {
  custoEmbalagem: 1300,
  custoMaoDeObra: 2000,
  custoIndireto: 200,
};
/** O que cresce com o peso: massa, recheio, cobertura, o forno e o tempo de cada camada. */
const POR_QUILO = {
  custoInsumos: 2800,
  custoMaoDeObra: 1500,
  custoEnergiaGas: 300,
  custoIndireto: 100,
};
```

`custoUnitario` é o custo do quilo, `Math.round(total ÷ quilos)`. `precoPraticado: 10000`.

| Bolo | Custo do bolo | Custo do quilo | Preço do quilo |
| ---- | ------------- | -------------- | -------------- |
| 1 kg | 8200          | 8200           | **R$ 149,50**  |
| 2 kg | 12900         | 6450           | **R$ 117,50**  |
| 3 kg | 17600         | 5867           | **R$ 107,00**  |

**B.2 A página.**

- **Resposta:** a conta em uma frase, e "Um bolo de 2 kg que custa R$ 129,00 tem o quilo a R$
  64,50 de custo; com 40% de margem e 5% de maquininha, o quilo sai a R$ 117,50."
- `ContaAberta` com `boloDe(2)` e `unidade: { singular: "quilo", plural: "quilos" }`.
- **Os cinco passos** para o bolo: pesar a receita pronta (massa, recheio e cobertura, não a
  farinha); a caixa e a base; o trabalho, separando o que é por camada do que é por bolo
  (decorar leva o mesmo tempo num bolo de 1 kg e num de 3); o forno; as fixas.
- **A fórmula** com o quilo.
- **`h2` "O erro do bolo: um preço de quilo pra qualquer tamanho".** A tabela de B.1 como
  `table` de verdade (`caption`, `th scope`), e a consequência: o bolo de 1 kg vendido a R$
  117,50 deixa 11750 − 8200 − 588 = **R$ 29,62, 25%\*\* em vez de 40%. A saída: preço de quilo por
  faixa de tamanho, ou um valor fixo do bolo mais o quilo. Uma frase cada; a página não escolhe
  pela confeiteira.
- **Perguntas:** "Quanto cobrar o quilo do bolo?" · "Bolo de festa com topo e decoração: soma
  como?" (o topo é embalagem do bolo, por inteiro, não por quilo) · "Recheio de morango custa
  mais: muda o quilo?" (muda; um preço por recheio) · "Como saber quanto o bolo pesa antes de
  fazer?" (pesar a receita pronta uma vez e anotar) · "Quanto cobrar uma fatia?" (a fatia de 100
  g é um décimo do quilo mais a embalagem da fatia).

### Sessão C · O bolo de pote

**C.1 O exemplo — `EXEMPLO_BOLO_DE_POTE` e `NO_APLICATIVO` em `exemplo.ts`.** "Bolo de pote de
ninho com morango", `rende: 10`, parâmetros do cookie, `precoPraticado: 1500`.

| Parcela (o lote de 10) | Centavos | De onde vem                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| Ingredientes           | 4200     | Massa, creme, fruta                             |
| Embalagem              | 1450     | Pote com tampa, colher e etiqueta, R$ 1,45 cada |
| Seu trabalho           | 3000     | Uma hora e meia a R$ 20                         |
| Gás e energia          | 250      |                                                 |
| Despesas fixas         | 200      |                                                 |
| **Custo por pote**     | **910**  |                                                 |

No balcão: 910 ÷ 0,55 = 1655 → **R$ 17,00**, e sobram 705, 41%. `NO_APLICATIVO = { ...parâmetros,
taxaCartaoConsiderada: 0, outrasTaxas: 20 }`: 910 ÷ 0,40 = 2275 → **R$ 23,00**. O pote de R$ 17,00
vendido no aplicativo deixa 1700 − 910 − 340 = **R$ 4,50, 26%**.

**C.2 A página.**

- **Resposta:** a conta, e "Um bolo de pote que custa R$ 9,10, com 40% de margem e 5% de
  maquininha, sai a R$ 17,00 no balcão."
- `ContaAberta` com `unidade: { singular: "pote", plural: "potes" }`.
- **Os cinco passos**: o recheio pesado por pote (o mesmo pote com 20 g a mais de creme é outro
  custo); **a embalagem como a parcela que mais engana**, 16% do custo, com pote, tampa, colher e
  etiqueta; o trabalho de montar camada por camada; o forno da massa; as fixas.
- **A fórmula**.
- **`h2` "Vendendo por aplicativo: a comissão entra na conta"**. A comissão e a taxa do
  pagamento online saem do preço, como a maquininha, e entram na mesma divisão. Os dois preços
  lado a lado (balcão, aplicativo) e o pote de balcão vendido no aplicativo. O número 20% é dito
  como exemplo: "o seu está no contrato com o aplicativo". **Nenhum percentual atribuído a uma
  empresa pelo nome.**
- **Perguntas:** "Quanto cobrar por um bolo de pote?" · "Bolo de pote no iFood: o preço tem que
  ser outro?" (tem, pela seção acima) · "Pote de 250 ml ou de 350 ml: como muda?" (o recheio e o
  pote, não a conta) · "Dá pra cobrar a entrega à parte?" (dá; a entrega não entra no custo do
  pote, entra como taxa de entrega) · "Quanto tempo dura o bolo de pote?" **fora**: não é pergunta
  de preço, e o Rende não responde segurança de alimento.

### Sessão D · A página de doces e o rodapé

**D.1 A página — `/como-calcular-o-preco-de-doces`.**

- **Resposta:** "Para qualquer doce, some ingredientes, embalagem, sua hora, gás e energia e uma
  fatia das despesas fixas, na unidade em que você vende: a unidade, o cento, o quilo ou o pote.
  Depois divida esse custo por 1 menos a margem e menos as taxas." Sem número: o número de cada
  doce está na tabela logo abaixo.
- **`h2` "O que muda de doce pra doce"**, uma `table` com `caption`: doce, vende por, a parcela
  que mais pesa, o erro de cada um, o preço do exemplo (das funções, pelos quatro exemplos), e o
  nome do doce como link para a página dele. No celular a tabela vira lista de definições, uma
  por doce: tabela de cinco colunas não cabe em 390px sem rolar de lado.
- **`h2` "As cinco parcelas"**: um parágrafo curto cada, sem números, terminando em "o passo a
  passo, com exemplo, está na página de cada doce".
- **`h2` "Margem e taxas"**: a fórmula, sem exemplo, e a diferença entre margem e markup em três
  frases.
- **Perguntas:** "Como precificar doces para vender?" · "Qual a margem de lucro de um doce?" (a
  que você escolher; os exemplos usam 40%, e a página não inventa média de mercado) · "Preciso
  de planilha?" (não: a calculadora na página do cookie faz a conta, e o Rende a guarda) · "Doce
  de encomenda e doce de pronta entrega têm o mesmo preço?" (a conta é a mesma; o que muda é a
  perda).
- Sem `ContaAberta` e sem "Outros doces": a página inteira é a lista deles.

**D.2 O rodapé.** "Como calcular o preço" em `Moldura.tsx` passa a apontar para a página de
doces. A página do cookie continua achável: pela página de doces e pelas irmãs.

**D.3 `llms.txt`.** A página de doces vem primeiro na seção "Páginas", e as de cada doce embaixo,
pela lista.

### Toda sessão: o teste e a documentação

- **`tests/domain/exemplo.test.ts`:** um `describe` por doce, com o custo, o preço sugerido e o
  número da seção do erro de cada um; o bolo com os três tamanhos. Cada `it` com o comentário da
  conta à mão, como os do cookie.
- **`docs/DECISOES.md`:** a A escreve `#d256` a `#d258`; a D escreve `#d259`. O "Fora de
  escopo" da 037 ("Uma página por doce") ganha a nota "feito na 068, sem o gatilho, `#d256`".
- **`docs/ESTADO.md`:** a sessão, as páginas que entraram e a coluna nova na tabela mensal
  (seção 5).

---

## 4 · Roteiro de navegador (cada sessão, na página dela)

`npm run build && npm start`, a 390px e a 1280px, nos dois temas.

1. **A resposta primeiro.** O primeiro parágrafo tem a conta e o número, antes de qualquer botão.
2. **Sem JavaScript.** O texto inteiro e a tabela aparecem (037, roteiro 2).
3. **Os números.** Os da página batem com o teste; o da `ContaAberta` bate com a resposta.
4. **O mapa.** `/sitemap.xml` e `/llms.txt` com a página nova e endereço absoluto.
5. **Os links.** "Outros doces" leva a cada irmã e à de doces; nenhum link quebrado (a sessão A
   só tem o cookie e o brigadeiro na lista, e a de doces entra na D: até lá o bloco não a mostra).
6. **A extração (só na A).** O HTML da página do cookie antes e depois, por `diff`: igual, salvo
   o bloco "Outros doces".
7. **Lighthouse no celular:** SEO 100, acessibilidade 100, a nota de desempenho no `ESTADO.md`.

---

## 5 · Fora do código

A seção 5 da 037 vale para as quatro, e nada dela foi feito ainda. Duas coisas a mais:

1. **Pedir indexação de cada página nova** na "Inspeção de URL" do Search Console, quando ele
   existir, e não só reenviar o sitemap.
2. **Gente apontando para a página de cada doce**, não para a de doces: quem pergunta do cento no
   grupo de confeiteiras recebe o link do brigadeiro. A de doces recebe links pelas irmãs.

A tabela mensal do `ESTADO.md` ganha uma coluna por página nova (visitas da Vercel), e a medida
do Search Console passa a ser por página: impressões, posição e cliques de cada uma.

---

## Critérios de aceite

- [x] Quatro rotas estáticas, indexáveis, com `canonical` e prévia; a resposta inteira no
      primeiro parágrafo de cada.
- [x] Nenhum número de dinheiro escrito à mão nas páginas novas: todos das funções sobre os
      exemplos; o teste prende cada número que a página mostra.
- [x] A página do cookie sai igual depois da extração, salvo "Outros doces"; `/conheca` igual.
- [x] `PAGINAS_DO_PRECO` é a única lista: sitemap, `llms.txt`, medição e "Outros doces" leem dela.
- [x] Cada página nova tem a seção que só ela tem (`#d256`): o trabalho e a avulsa no brigadeiro,
      o quilo por tamanho no bolo, o aplicativo no pote, a tabela na de doces.
- [x] Um `h1`, `h2` por seção, `h3` por pergunta; tabelas com `caption` e `th scope`; 44px em todo
      alvo, 52px no primário do celular; nenhuma rolagem lateral a 390px.
- [~] Nenhuma cor solta: `rg "#[0-9A-Fa-f]{6}" src/app/como-calcular-o-preco-* src/components/site/Artigo.tsx` vazio.
- [x] `lint`, `typecheck`, `test` e `build` passam; `package.json`, `firestore.rules` e
      `firestore.indexes.json` intocados.
- [x] `#d256` a `#d259` escritos; `ESTADO.md` atualizado a cada sessão.

---

## 6 · Fora de escopo

- **A calculadora nas páginas novas.** A `CalculadoraDaPorta` só conhece as duas receitas de
  cookie da biblioteca, e levá-la a outro doce é pôr receita nova na biblioteca, que é o
  onboarding do app também. Volta quando o Search Console mostrar uma página de doce com
  impressões e saída baixa: aí a ferramenta é o próximo passo, como foi na 040. Até lá, a
  pergunta "Preciso de planilha?" aponta para a do cookie.
- **O arredondamento por grama no app** (`#d258`). Spec própria, de domínio: a ficha com
  rendimento em `g` ou `ml` guardar o custo de 1000 unidades, ou mostrar por quilo. Mexe em
  campo gravado, então pede aprovação de schema.
- **Pão de mel, ovo de Páscoa, salgado, torta, kit.** Mesmo gatilho que a 037 tinha, agora por
  doce: as consultas do Search Console dizem o próximo. O ovo de Páscoa, se entrar, entra até
  janeiro.
- **JSON-LD nas páginas novas** (`#d179`), **blog, CMS, analytics, anúncio pago**: como na 037.
- **Mudar o endereço da página do cookie.** Já está publicada; mudar pede redirecionamento.

---

## Decisões desta spec que são fáceis de rejeitar

- **Não esperar o Search Console.** Decisão de quem conduz; o custo é aprender com quatro
  páginas o que se aprenderia com uma.
- **Os três doces.** Brigadeiro, bolo e bolo de pote foram escolhidos pelo que cada um tem de
  diferente na conta, não por volume medido de busca: não há ferramenta de palavra-chave no
  projeto. Se quem conduz souber que pão de mel vende mais na região, troca-se um deles antes da
  sessão, não depois.
- **A unidade do brigadeiro ser o cento.** Quem vende avulso lê a seção da unidade; quem vende
  por cento, que é a maioria, lê o número dela no topo.
- **"Bolo por quilo" no endereço.** Quem vende bolo por tamanho (aro 15, aro 20) também pesquisa;
  a página fala de aro numa pergunta, e o endereço fica com a forma mais buscada.
- **O rodapé apontar para a página de doces.** Tira um link direto da do cookie; ela continua
  ligada pela de doces e pelas irmãs.

---

## Riscos

- **Página-porta.** O risco principal, e é de texto, não de código. A defesa é a seção que só
  cada página tem e o passo 2.4 (ler a concorrência antes de escrever). Se a página nova, lida
  ao lado da do cookie, parecer a mesma com outra palavra, ela não está pronta.
- **A página e o app discordarem no bolo** (`#d258`): a página ensina por quilo; o app, em
  gramas, pode mostrar até R$ 5,00 por quilo de diferença. Até a spec própria, a página do bolo
  não diz "cadastre em gramas".
- **Números de exemplo lidos como preço de mercado.** "O cento a R$ 176,50" vai ser lido como "o
  preço do cento". Cada página diz, junto do exemplo, que o número é do exemplo e que o dela sai
  dos custos dela; a pergunta "Quanto cobrar…" de cada uma começa por "depende do que o seu custa".
- **Nada disso subir sem a seção 5 da 037.** Quatro páginas sem domínio próprio e sem Search
  Console continuam sem ninguém achar.

---

## Portão de conclusão

Por sessão: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o
resultado real relatado; a página da sessão aparecendo no `build` como rota estática; o roteiro
da seção 4, com o passo 2 (sem JavaScript) e, na A, o passo 6 (o cookie igual).
