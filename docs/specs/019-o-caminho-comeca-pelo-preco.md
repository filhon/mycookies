# Spec 019 · O caminho começa pelo preço

**Tipo:** reordenação, a segunda da fase 0 do `docs/saas/ROADMAP.md`. Os cinco passos do começo
passam a ser apresentados na ordem em que dão alguma coisa em troca, e não na ordem em que o
código depende de si mesmo. **Um array reordenado, cinco textos reescritos, um botão que já
existe pendurado no passo 1, e três frases de tela.** Nenhum fato novo, nenhum campo, nenhuma
rota, nenhuma consulta nova, nenhuma dependência.
**Tamanho:** meia sessão. O que pesa é a cópia, e não o código.
**Origem:** `#d113`. O primeiro passo do caminho é hoje a tela mais difícil do sistema — cinco
blocos, nove campos, vocabulário de contador — e ela vem **antes** de a usuária ter visto um
preço. A 018 tirou o primeiro preço de trás de três formulários; esta tira a configuração de
trás da porta de entrada.
**Depende de:** a 018 entregue (está) e a **gravação do primeiro uso**, que é a régua da fase 0.
Se a gravação ainda não tiver acontecido quando esta sessão rodar, ela roda assim mesmo — os
cinco textos abaixo não dependem dela para estarem melhores que os de hoje —, mas a dívida "os
cinco textos saíram do código, e não do que a 5B viu" **só sai da tabela do `ESTADO.md` quando
as palavras dela forem conferidas contra estes cinco**, uma a uma. Onde a gravação contradisser,
a palavra dela vence, e a sessão registra qual foi.
**Aprovações pedidas:** nenhuma. **Uma decisão a registrar**, `#d115`, mais uma linha de revisão
no `#d66`, que dizia que os cinco passos são a navegação inferior lida em voz alta — e a partir
daqui não são.

---

## Problema

A ordem dos cinco passos é a da dependência técnica: configuração → insumos → fichas → pedidos
→ caixa. É a ordem em que um módulo precisa do anterior para calcular, e é a ordem errada para
quem acabou de entrar, por três motivos que o repositório mostra:

1. **O passo 1 é a tela mais difícil e a que menos devolve.** `/configuracao` abre cinco blocos
   e nove campos — valor da hora, horas por mês, energia por hora, gás por hora, despesas
   fixas, margem, markup, outras taxas, arredondamento — antes de ela ter visto um preço. Cada
   campo é uma decisão tomada sem o número que a justificaria.
2. **A dependência não é mais verdade em tempo de execução.** Desde o `#d114`, a ficha calcula
   com a configuração sugerida inteira — rateio, margem, markup, arredondamento e a maior taxa
   — quando nada foi salvo, e **diz de onde o número veio**. A configuração deixou de ser
   pré-requisito para ver um preço; continua sendo o que faz o preço virar o dela.
3. **A 018 pôs um preço no primeiro minuto e o caminho continua apontando para outro lugar.**
   Numa conta vazia, o cartão da tela Hoje manda para `/configuracao` enquanto `/fichas` tem um
   botão que entrega uma ficha precificada em um toque. O sistema tem duas opiniões sobre por
   onde se começa, e a que está na tela em que o app abre é a pior das duas.

**O que esta spec entrega:** os cinco passos na ordem `ver o preço → conferir os preços →
ajustar o que é seu → encomenda → paga`, os cinco textos reescritos, e o botão da biblioteca
pendurado no passo 1 do cartão.

**O que esta spec não entrega:** nenhum fato novo, nenhuma tela nova, nenhuma palavra do menu
trocada. Vocabulário é a 021, e a dobra dos formulários é a 020.

---

## O que sai da frente de quem está começando (`#d113`)

- **A configuração como primeira tela.** Nove campos deixam de ser a porta de entrada e viram o
  passo 3, apresentado pela consequência ("ajuste e veja o preço mudar") em vez de pela
  obrigação. Ela continua sendo passo, e continua pendente até o "Salvar" — o que muda é a
  ordem em que é oferecida.
- **Um toque a mais até o primeiro preço.** Com o passo 1 sendo "ver quanto custa um cookie" e
  o botão da biblioteca dentro do próprio cartão, o caminho da conta nova até um preço na tela
  é **um toque**, e não "ir para configuração, salvar, ir para insumos, cadastrar, ir para
  fichas, montar".
- **Nada entra.** Nenhum campo, nenhuma faixa, nenhuma tela, nenhuma consulta. O único
  componente que aparece em lugar novo é o `BotaoBiblioteca`, que já sabe sumir sozinho.

---

## O que esta spec decide

### O caminho começa pelo preço; a dependência não muda, a ordem de apresentação sim — `#d115`

A cadeia continua sendo a mesma: sem insumo não há custo por grama, sem custo por grama não há
custo de ficha, sem ficha não há preço no pedido, sem pedido não há caixa. **O que muda é que a
cadeia deixou de ser a ordem de apresentação.** Ela é a ordem em que o sistema calcula, e a
ordem em que o sistema calcula não precisa ser a ordem em que uma pessoa aprende.

Os cinco passam a ser:

| #   | Passo                               | Fecha quando (inalterado)        | Era |
| --- | ----------------------------------- | -------------------------------- | --- |
| 1   | Ver quanto custa um cookie          | existe 1 ficha não arquivada     | 3   |
| 2   | Conferir o preço do que você compra | existe 1 insumo não arquivado    | 2   |
| 3   | Ajustar o que é seu                 | `configuracao/geral` existe      | 1   |
| 4   | Registrar uma encomenda             | existe 1 pedido não arquivado    | 4   |
| 5   | Marcar a encomenda como paga        | existe 1 transação não arquivada | 5   |

`FatosDoComeco` não ganha campo, `useComeco` não ganha consulta, `passosDoComeco` não muda uma
linha: a regra "`FEITO` é o fato, em qualquer posição; o primeiro não feito é o `AGORA`" já
funciona em qualquer ordem. **A reordenação é a reordenação de um array.**

O `#d66` ganha uma linha de revisão: "os cinco são a navegação inferior lida em voz alta" deixa
de valer. A ordem nova é Fichas, Insumos, Configuração, Pedidos, Caixa — quem termina o caminho
conheceu os cinco destinos do mesmo jeito, só que tendo visto um preço no primeiro deles.

### O passo 2 fecha com um insumo existindo, e não com um preço conferido

Numa conta que apertou o botão da biblioteca, os passos 1 e 2 fecham **no mesmo toque**: 25
insumos e 2 fichas nascem juntos, e o cartão pula de "0 de 5" para "2 de 5" com o passo 3 como
o de agora. O passo 2 quase nunca chega a ser o `AGORA`, e o selo "feito" aparece sobre um
insumo cujo preço ainda é a média.

Isso fica como está, e o motivo é o mesmo que a 008 já tinha escrito nos riscos dela: **o
caminho diz onde ela está, e não se ela fez bem.** Uma ficha salva sem item nenhum também fecha
o passo da ficha desde 2026-09-03. Quem cobra o preço médio é a faixa dentro da ficha, que a
018 entregou, que lista os insumos pelo nome e some conforme ela corrige — o lugar certo para
isso é onde o preço está, e não uma lista de tarefas.

A alternativa está em "Decisões fáceis de rejeitar", com o que ela custaria.

### O botão da biblioteca aparece no passo 1, e os dois lugares leem o mesmo fato

O `BotaoBiblioteca` da 018 já sabe sumir sozinho: duas consultas `limit(1)` e `null` sempre que
a conta tem um insumo ou uma ficha. O cartão da tela Hoje precisa saber a mesma coisa para
decidir se a ação primária é o botão ou o link — e **os dois precisam concordar**, senão existe
um estado em que o cartão rebaixa o link a terciário e o botão não se desenha, deixando o passo
de agora sem ação nenhuma.

A conta vazia sai dos fatos que o cartão **já tem na mão**: passo `FICHAS` e passo `INSUMOS`
nenhum dos dois `FEITO` é exatamente a condição das duas consultas do botão. Nenhuma assinatura
nova, e uma fonte só para a decisão de layout.

---

## Escopo

### 1. `src/lib/domain/onboarding.ts` — o array na ordem nova, com os cinco textos

A única mudança de código do módulo é a ordem de `CATALOGO_DO_COMECO` e o `numero` de cada
item. `FatosDoComeco`, `FATO_DO_PASSO`, `passosDoComeco`, `proximoPasso` e `progressoDoComeco`
ficam como estão, letra por letra.

O comentário de cabeçalho do módulo ganha a frase que separa as duas ordens: a cadeia
(`insumos → fichas → pedidos → caixa`, com a configuração dando os números que não são de
ingrediente) continua existindo e é o que o `/comecar` explica na "Cadeia do dinheiro"; a ordem
dos passos é a ordem em que o sistema **dá alguma coisa em troca** (`#d115`).

```ts
export const CATALOGO_DO_COMECO: readonly PassoBase[] = [
  {
    id: "FICHAS",
    numero: 1,
    titulo: "Ver quanto custa um cookie",
    porque:
      "Enquanto o preço sai da cabeça, não dá para saber se o doce paga o próprio custo e ainda sobra alguma coisa pra você.",
    oQueEsperar:
      "Uma receita de cookie abre com o custo e o preço no rodapé. Depois dá para trocar tudo: o que entra, quanto rende e quanto tempo leva.",
    href: "/fichas",
    rotuloAcao: "Ver quanto custa um cookie",
  },
  {
    id: "INSUMOS",
    numero: 2,
    titulo: "Conferir o preço do que você compra",
    porque:
      "O preço do pacote é o que vira custo por grama. Com o preço médio, o custo do seu doce é um palpite bem-feito; com o da sua nota, é o seu número.",
    oQueEsperar:
      "A lista do que você compra, com o preço de cada pacote. Você abre o que for diferente na sua cozinha e troca o valor — o preço das receitas se refaz.",
    href: "/insumos",
    rotuloAcao: "Conferir os preços",
  },
  {
    id: "CONFIGURACAO",
    numero: 3,
    titulo: "Ajustar o que é seu",
    porque:
      "A sua hora, o gás, a energia e a taxa da maquininha entram em todo preço. Até você dizer os seus, o preço usa os valores que o sistema sugeriu.",
    oQueEsperar:
      "Os campos já vêm preenchidos com a sugestão. Você troca os que são diferentes na sua cozinha e salva — e vê o preço das receitas mudar.",
    href: "/configuracao",
    rotuloAcao: "Ajustar o que é meu",
  },
  {
    id: "PEDIDOS",
    numero: 4,
    titulo: "Registrar uma encomenda",
    porque:
      "É a encomenda que enche a agenda da semana, monta a lista do mercado e mostra o que você ainda tem a receber.",
    oQueEsperar:
      "A cliente, o dia da entrega e o que ela pediu. O total e o quanto sobra ficam no rodapé.",
    href: "/pedidos",
    rotuloAcao: "Registrar uma encomenda",
  },
  {
    id: "CAIXA",
    numero: 5,
    titulo: "Marcar a encomenda como paga",
    porque:
      "O dinheiro só entra no caixa quando você diz que recebeu. Sem isso, o mês fecha em branco mesmo com a encomenda entregue.",
    oQueEsperar:
      "Abra a encomenda entregue e diga o dia em que o dinheiro caiu. O caixa do mês se refaz sozinho.",
    href: "/pedidos",
    rotuloAcao: "Abrir as encomendas",
  },
];
```

Três regras que a cópia obedece, e as três têm teste:

- **Nenhum número.** Nem "R$ 25 a hora", nem "9 campos", nem "10 minutos". O número da hora
  sugerida já aparece formatado na faixa da ficha (018), lido de `CONFIGURACAO_SUGERIDA`; posto
  aqui como texto, ele passa a ser uma segunda cópia do mesmo valor, esperando para divergir —
  é a mesma regra da cadeia do dinheiro, que não tem número de exemplo de propósito.
- **`porque` é o que se perde sem o passo**, nunca uma instrução de clique. Já é critério do
  teste de hoje.
- **Os passos 4 e 5 mudam pouco**, e é de propósito: "encomenda" e "pago" já são as palavras
  dela. Os que mudam de verdade são os três primeiros, que são os do primeiro dia.

### 2. `tests/domain/onboarding.test.ts`

O arquivo inteiro fala da ordem velha. O que muda:

- **A ordem esperada** vira `["FICHAS", "INSUMOS", "CONFIGURACAO", "PEDIDOS", "CAIXA"]`, nos
  três casos do teste "é fixa e não depende dos fatos".
- **O caso de aceite, passo a passo**, vira a tabela nova (abaixo). Cada linha continua sendo
  uma escrita da usuária.
- **O caso fora de ordem inverte**: numa conta zerada, **salvar a configuração antes de ter
  ficha** devolve `[AGORA, DEPOIS, FEITO, DEPOIS, DEPOIS]` — progresso "1 de 5", passo de agora
  ainda o 1. É o caminho de quem já conhecia o sistema.
- **Dois casos novos, os da biblioteca**: `{ temFicha: true, temInsumo: true }` devolve
  `[FEITO, FEITO, AGORA, DEPOIS, DEPOIS]`, progresso "2 de 5" e `proximoPasso` em
  `CONFIGURACAO` — é o estado exato de uma conta um segundo depois do toque na biblioteca. E o
  `href` de cada um dos cinco conferido contra a tela certa.
- **Um teste de cópia**: nenhum dos cinco textos contém `R$`, nem dígito de moeda; todos os
  cinco continuam com `porque`, `oQueEsperar`, `rotuloAcao` e `href` começando com `/`.

A tabela do caso de aceite, que é o que o teste percorre:

| Depois de                          | Progresso | O passo de agora             | A ação leva para |
| ---------------------------------- | --------- | ---------------------------- | ---------------- |
| Entrar pela primeira vez           | 0 de 5    | Ver quanto custa um cookie   | `/fichas`        |
| Tocar em "Começar com o que toda…" | 2 de 5    | Ajustar o que é seu          | `/configuracao`  |
| Salvar a configuração              | 3 de 5    | Registrar uma encomenda      | `/pedidos`       |
| Confirmar o pedido                 | 4 de 5    | Marcar a encomenda como paga | `/pedidos`       |
| Marcar como pago                   | 5 de 5    | — (fechamento)               | "Concluir"       |
| **Ou**, sem a biblioteca: 1 insumo | 1 de 5    | Ver quanto custa um cookie   | `/fichas`        |
| … e a primeira ficha montada à mão | 2 de 5    | Ajustar o que é seu          | `/configuracao`  |

### 3. `src/components/comecar/CartaoPrimeirosPassos.tsx` — o botão no passo 1

Uma condição e um ramo. O cartão passa a ler `passos` junto do resto de `useComeco`:

```tsx
const { passos, progresso, proximo, carregando, encerrado } = useComeco();

// Conta vazia sai dos fatos que o cartão já tem: são as mesmas duas perguntas
// que o `BotaoBiblioteca` faz por dentro, e é isso que impede os dois de
// discordarem sobre quem é a ação primária.
const feito = (id: IdPasso) =>
  passos.some((passo) => passo.id === id && passo.estado === "FEITO");
const contaVazia = !feito("FICHAS") && !feito("INSUMOS");
```

No lugar da ação primária de hoje:

- **Passo 1 de agora e conta vazia:** `<BotaoBiblioteca />` (primária, 52px, com a linha de
  explicação que ele já carrega) e, abaixo, o link para `/fichas` como **terciária**, com o
  rótulo "Montar a minha ficha do zero". Esse rótulo mora no cartão e não no domínio: é a
  alternativa de um lugar só, e `rotuloAcao` continua sendo o que as duas telas mostram.
- **Qualquer outro caso:** exatamente o que existe hoje — o link com `proximo.rotuloAcao`, na
  primária de 52px.

Nada mais do cartão muda: o distintivo com `proximo.numero`, a trilha de cinco segmentos, "Ver
os cinco passos" e "Não preciso disto agora" ficam como estão.

### 4. `src/components/comecar/TelaComecar.tsx` — duas frases que a reordenação torna falsas

- Com o caminho encerrado, a página diz que os cinco ficam "na ordem em que uma coisa depende da
  outra". Passa a dizer que ficam **na ordem em que vale a pena fazer**, e que a dependência
  entre elas está na cadeia do dinheiro, logo abaixo.
- Com o caminho correndo, "Esta é só a ordem que evita refazer trabalho" vira a ordem que chega
  mais rápido a um preço, e a frase de que nenhum passo é obrigatório fica onde está.

O `BlocoPasso` não muda, e `/comecar` **não** ganha o botão da biblioteca: o passo 1 leva para
`/fichas`, que numa conta vazia abre com o mesmo botão como ação primária desde a 018. Um botão
que instala 27 documentos em dois lugares na mesma tela é uma pergunta a mais, não uma a menos.

### 5. Documentação

- `#d115` em `docs/DECISOES.md`, e a linha de revisão no `#d66`.
- `docs/ESTADO.md`: a seção da 019, a próxima ação apontando para a 020, e a linha da tabela de
  dívidas sobre os cinco textos — **removida se a gravação tiver acontecido e os textos tiverem
  sido conferidos contra ela; reescrita com o novo prazo se não**.
- `docs/saas/ROADMAP.md`: a 019 marcada como entregue na lista da fase 0.

---

## Roteiro de navegador

Precisa de **conta vazia** — a real tem dados, e metade do roteiro só existe em conta nova. Um
login de teste com `npm run conceder-acesso -- <outro-email> teste-019 "Teste 019" Teste`.
DevTools em **Offline** do passo 1 ao 4.

1. **Tela Hoje, conta vazia.** "Primeiros passos, 0 de 5". O passo de agora é **1 · Ver quanto
   custa um cookie**, e a ação primária é "Começar com o que toda cozinha tem", com "Montar a
   minha ficha do zero" pequena embaixo. `/configuracao` não é mencionada em lugar nenhum da
   tela.
2. **Tocar no botão.** Cai na ficha-modelo com o preço no rodapé (roteiro da 018). Voltar para
   a tela Hoje pela navegação inferior: **"2 de 5"**, passo de agora **3 · Ajustar o que é
   seu**, ação para `/configuracao`.
3. **`/comecar`.** Os cinco na ordem nova, 1 e 2 com selo "feito", o 3 aberto no celular. Com o
   caminho encerrado (outra conta, ou `primeirosPassosEm` gravado à mão), os cinco aparecem sem
   selo e a frase não promete mais "a ordem em que uma coisa depende da outra".
4. **Corrigir o preço de um insumo.** O caminho não se mexe — o passo 2 continua feito, e é
   assim mesmo. A faixa dentro da ficha lista um nome a menos.
5. **Salvar a configuração** (com rede ou sem): "3 de 5", passo 4.
6. **Segunda conta vazia, sem tocar na biblioteca.** Cadastrar um insumo à mão. O cartão mostra
   **"1 de 5"** com o passo 1 ainda como o de agora — e a ação primária **volta a ser o link**
   "Ver quanto custa um cookie", porque o botão da biblioteca não se desenha mais. É o passo que
   prova que o cartão e o botão leem o mesmo fato: se sobrar um cartão sem ação primária, a
   decisão do "O que esta spec decide" falhou.
7. **Recarregar com o app instalado, em 360px.** O passo de agora cabe inteiro, a ação primária
   tem 52px, e a navegação inferior não cobre o rodapé do cartão.

---

## Critérios de aceite

- [x] `CATALOGO_DO_COMECO` na ordem `FICHAS, INSUMOS, CONFIGURACAO, PEDIDOS, CAIXA`, numerados
      de 1 a 5 nessa ordem, com os cinco textos novos.
- [x] `FatosDoComeco`, `passosDoComeco`, `proximoPasso`, `progressoDoComeco` e `useComeco` sem
      uma linha alterada — `git diff` de `src/lib/hooks/useComeco.ts` vazio.
- [x] `tests/domain/onboarding.test.ts` cobrindo a ordem nova, a tabela do caso de aceite, o
      fora de ordem invertido, o estado da conta que apertou a biblioteca e a regra "nenhum
      número no texto".
- [x] Numa conta vazia, o cartão da tela Hoje oferece a biblioteca como ação primária do passo
      1; numa conta com um insumo e nenhuma ficha, oferece o link — e **nunca nenhuma das
      duas**.
- [x] `/comecar` não promete dependência na ordem dos cinco, nem com o caminho correndo nem com
      ele encerrado.
- [x] Nenhuma palavra de `navegacao.ts`, de `CabecalhoPagina` ou de estado vazio mudou: isso é
      a 021.
- [x] Nenhum campo, nenhuma rota, nenhum índice, nenhuma regra, nenhuma dependência, nenhuma
      assinatura nova.
- [x] O roteiro de sete passos passa, com os passos 1 a 4 em Offline.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d115` escrito, `#d66` com a linha de revisão, `ESTADO.md` e a linha da 019 no roadmap
      atualizados.

---

## Fora de escopo

- **Trocar "insumo", "ficha técnica" ou qualquer rótulo do menu.** É a 021, e ela começa com
  cinco perguntas a ela — não com uma decisão nossa.
- **"Mais detalhes" nos dois formulários.** É a 020.
- **Um fato novo em `FatosDoComeco`**, de qualquer tipo. Ver a decisão sobre o passo 2.
- **Mexer nas quatro seções de `/comecar`** — cadeia do dinheiro, o que mais tem aqui, sem
  internet, instalar. A cadeia continua sendo a ordem da dependência, e é ela que a explica.
- **Mexer nos textos das três faixas da ficha** (018) ou nos dois estados vazios. Eles já dizem
  o que precisam dizer, e no lugar certo.
- **O botão da biblioteca em `/comecar`.** O passo 1 leva para `/fichas`, onde ele já está.
- **A meta virando passo** (`#d66`), qualquer sexto passo, e bloquear qualquer tela.
- **`scripts/metricas.mjs`.** É a 022, e é ela que vai medir se esta spec funcionou.

---

## Decisões desta spec que são fáceis de rejeitar

- **O passo 2 fecha com um insumo existindo, mesmo com preço médio.** A alternativa honesta
  seria fechá-lo só quando existisse um insumo com preço dela — e `temPrecoMedio` é
  `historicoPrecos.length <= 1` mais o prefixo do id, que não se consulta no Firestore: exigiria
  assinar a coleção inteira de insumos na tela Hoje, em toda abertura, até o caminho terminar. E
  criaria um passo que uma pessoa que concorda com todos os preços não consegue fechar sem
  editar o que não quer editar. O preço médio é cobrado onde o preço está.
- **O passo 1 continua fechando com uma ficha qualquer**, inclusive a da biblioteca, que ela não
  montou. É o mesmo princípio de 2026-09-03: o caminho diz onde ela está. E a ficha da
  biblioteca **é** o preço dela no primeiro minuto — é o passo cumprido, não o passo burlado.
- **A configuração continua sendo passo, e não um convite dentro da ficha.** A faixa da ficha já
  convida; o passo é o que garante que a conta que ignorou a faixa ainda seja perguntada, e o
  `#d114` não tira dela o direito de ser o número verdadeiro.
- **O rótulo "Montar a minha ficha do zero" mora no cartão.** Pôr um `rotuloAlternativo` no
  domínio seria um campo com um leitor só, para uma frase que só existe enquanto a conta está
  vazia.
- **Os passos 4 e 5 quase não mudam.** A tentação de reescrever os cinco por simetria é a
  tentação de mexer no que está funcionando: o que reprovou na gravação foi o começo, e é o
  começo que se reescreve.
- **Nenhum número nos textos.** "Sua primeira ficha usou R$ 25 a hora" é mais concreto e é
  exatamente o tipo de frase que passa a mentir no dia em que `CONFIGURACAO_SUGERIDA` mudar. A
  faixa da ficha diz o número, lido da fonte, na tela em que ele está sendo usado.

---

## Riscos

- **A gravação não aconteceu, e os textos continuam sendo nossos.** Eles são melhores que os de
  hoje — falam de preço, e não de conferir configuração —, mas "as palavras que ela usou" é uma
  afirmação que esta sessão não tem como fazer sozinha. Se a gravação não tiver rodado, a dívida
  fica na tabela com o prazo novo, e a spec não finge que fechou.
- **O quadro sem ação primária.** Se o cartão e o `BotaoBiblioteca` discordarem por um quadro —
  o cartão rebaixando o link enquanto o botão ainda carrega —, o passo 1 aparece sem nada para
  tocar. O cartão só renderiza depois que `useComeco` respondeu, e as duas consultas do botão
  são idênticas às dele (o Firestore compartilha o ouvinte), então não deveria acontecer. **Se
  acontecer no passo 6 do roteiro**, o conserto é um `useContaVazia()` em `src/lib/hooks/`, que
  o cartão e o botão passam a chamar — uma fonte só, um arquivo novo.
- **Testes verdes com a ordem velha.** `tests/domain/onboarding.test.ts` fala da ordem antiga em
  quase todos os blocos; um teste que continue passando sem ser tocado é o sinal de que ele está
  afirmando a ordem errada em outro lugar. A sessão relê o arquivo inteiro, e não só o primeiro
  `describe`.
- **O "2 de 5" instantâneo.** Um caminho que pula dois passos no primeiro toque pode parecer
  quebrado. É o oposto: é a 018 fazendo o que prometeu, e o cartão diz o passo de agora em
  letras, não só o número.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de sete passos, numa conta vazia de verdade, com os quatro
primeiros em Offline. E, fora do código, a régua da fase 0: **a Maynara abrindo uma conta nova
sem ninguém ao lado, com a tela gravada, e a contagem de perguntas em voz alta.** É essa
contagem, e não o portão, que diz se a 020 é a próxima ou se a 019 precisa de uma segunda
passada.
