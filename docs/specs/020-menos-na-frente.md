# Spec 020 · Menos na frente

**Tipo:** dobra de formulário, a terceira spec da fase 0 do `docs/saas/ROADMAP.md`. Os dois
formulários do primeiro preço — insumo e ficha — passam a pedir na frente só o que o primeiro
preço precisa; o resto vai para trás de um "Mais detalhes" nativo, que abre sozinho quando o que
está lá dentro é dela. **Dois arquivos de componente, nenhum de `src/lib/`.** Nenhum campo,
nenhuma rota, nenhuma consulta, nenhuma regra, nenhuma dependência, nenhum teste de domínio
tocado.
**Tamanho:** meia sessão. O que pesa é mover JSX sem quebrar o que já funciona, e o roteiro.
**Origem:** `#d113`. "O primeiro preço fica atrás de três formulários (insumo com nove campos,
ficha com 'fornadas de reserva' e o tipo kit na frente)". A 018 tirou o primeiro preço de trás
dos formulários; a 019 tirou a configuração da porta; esta tira dos dois formulários o que não é
do primeiro preço — para a segunda ficha, a dela, custar o mesmo que a primeira.
**Depende de:** a 018 e a 019 entregues (estão). A gravação do primeiro uso ainda não rodou
(`ESTADO.md`); esta spec não depende dela — quatro campos na frente são melhores que nove com ou
sem gravação —, mas é a gravação que diz se a dobra ficou no lugar certo.
**Aprovações pedidas:** nenhuma. **Uma decisão a registrar**, `#d116`, mais uma linha de
revisão no `#d96` (o piso continua morando na tela da ficha, agora atrás da dobra).

---

## Problema

A ficha-modelo da 018 entrega um preço em um toque. O que vem depois — corrigir o preço de um
insumo, cadastrar o insumo que a biblioteca não tem, montar a ficha dela — passa pelos dois
formulários, e os dois ainda são os de antes:

1. **`FormularioInsumo`: nove campos, cinco na frente e uma dobra que já existe.** Nome,
   categoria, preço pago, quantidade, unidade e perda estão na frente; marca, onde compra e
   estoque atual estão atrás de "Detalhes opcionais". A dobra é o mecanismo certo e está no lugar
   errado: categoria e perda não são do primeiro preço (a categoria tem padrão que serve para
   dezenove dos vinte e cinco insumos da biblioteca, a perda nasce em zero), e a dobra **nunca
   abre sozinha** — editar um insumo com marca e fornecedor preenchidos esconde os dois.
2. **`FormularioFicha`: dois blocos antes dos itens, e o primeiro começa por uma pergunta que
   ela não tem como responder.** "O que você está montando: Receita ou Kit" é a primeira coisa
   do bloco "O produto", antes do nome. Depois vêm categoria, "Como você apresenta" e foto (que
   só vão na folha do orçamento, 017), e no bloco seguinte "Fornadas de reserva" (13C), que muda
   a lista de compras e nasce em zero. Só então os itens. Para uma ficha nova, são cinco decisões
   oferecidas antes do que o preço precisa: nome, rende, tempo, o que vai dentro.
3. **O que está na frente foi posto lá por uma spec de cada vez**, cada uma respondendo a um
   pedido real (kit na 2B, reserva na 13C, descrição e foto na 17B). Nenhuma tirou nada. É o
   mecanismo que a seção 2 do roadmap descreve, e o `#d113` existe para interrompê-lo.

**O que esta spec entrega:** na frente do insumo, nome, preço pago, quantidade e unidade; na
frente da ficha, nome, rende, unidade, tempo e os itens. O resto atrás de "Mais detalhes", nos
dois, aberto quando o que está lá dentro é dela ou tem erro.

**O que esta spec não entrega:** nada sai do schema, nada sai da tela. O painel de preço, o
recibo do custo do lote e o bloco "Como calcular o preço" não mudam. A configuração não muda.

---

## O que sai da frente de quem está começando (`#d113`)

- **Insumo: de seis campos na frente para quatro.** Categoria e perda vão para a dobra, junto
  de marca, onde compra e estoque. Nome, preço pago, quantidade e unidade — mais o resumo do
  custo por grama, que é a resposta — é tudo o que aparece.
- **Ficha: de cinco decisões antes dos itens para zero.** Receita ou kit, categoria, "como você
  apresenta", foto e fornadas de reserva vão para a dobra. Sobram nome, rende, unidade e tempo
  num bloco só, e os itens logo abaixo.
- **Uma pergunta a menos no primeiro toque da ficha nova:** "Receita ou Kit" deixa de ser a
  primeira coisa da tela. Uma ficha nova é receita até ela dizer o contrário — já era o padrão.
- **Nada entra.** Nenhum campo, nenhuma faixa, nenhum bloco. Dois blocos da ficha viram um.

---

## O que esta spec decide

### O que fica na frente é o que o primeiro preço precisa; o resto abre sozinho quando é dela — `#d116`

A régua é uma só, e é a mesma nos dois formulários: **na frente fica o que `calcularCustoInsumo`
e `derivarFicha` não conseguem calcular sem.** Insumo: preço pago, quantidade e unidade (o custo
por grama sai daí) e o nome (sem ele não se acha na ficha). Ficha: nome, rende, unidade, tempo
(paga a hora, o gás e a luz) e os itens. Tudo o mais tem padrão que serve para a primeira ficha:
categoria `INGREDIENTE`, perda zero, receita, reserva zero, sem descrição, sem foto.

O que vai para trás não some: fica atrás de um `<details>` nativo com o rótulo "Mais detalhes" e
uma linha dizendo o que há dentro. A dobra **abre sozinha em dois casos**:

- **Quando o que está dentro difere do que um cadastro novo receberia.** Editar um insumo com
  marca, fornecedor ou estoque, categoria diferente de ingrediente ou perda maior que zero abre a
  dobra. Editar uma ficha que é kit, tem reserva, descrição ou foto abre a dobra. O critério é
  mecânico: é o que `VAZIO` e `valoresIniciais(undefined)` dariam, comparado ao documento salvo.
  É o que impede "menos na frente" de virar "escondido": o que é dela ela vê sem procurar.
- **Quando um campo de dentro tem erro de validação.** Uma perda em "abc" ou uma descrição
  acima de `DESCRICAO_MAX` numa dobra fechada seria um "Salvar" que não faz nada e não diz por
  quê — o pior estado que um formulário tem. A dobra de hoje já tem esse defeito com o estoque.

**Uma exceção, nomeada:** a categoria da ficha **não** conta para abrir a dobra. As duas fichas
da biblioteca vêm com categoria "Cookies" (018) e são a primeira tela que ela vê; com a categoria
na regra, a ficha-modelo abriria com a dobra aberta, e a spec falharia exatamente na tela para a
qual existe. A categoria da ficha é rótulo de agrupamento, não decisão que muda o número nem o
que a tela mostra — e a da biblioteca não foi ela quem pôs. A categoria do **insumo** continua na
regra: `EMBALAGEM` é o que faz o custo cair na linha certa do recibo e o que o kit aceita como
embalagem, e a biblioteca já traz esses seis certos.

A dobra lê o **documento salvo**, e não o que está sendo digitado: `open` recebe um valor que
não muda enquanto ela edita, e o toque dela no `<summary>` vale até sair da tela. Um `<details>`
que abre e fecha sozinho conforme ela digita é pior do que um que não abre.

### O bloco de tipo, categoria, descrição, foto e reserva é um só, e fica antes dos itens

Na ficha, "Mais detalhes" é um bloco só, irmão dos `Bloco`s, entre "A receita" e "O que vai
dentro". O tipo (receita ou kit) mora dentro dele, e é por isso que ele fica **antes** dos itens:
trocar para kit faz aparecer "O que vai no kit" e "O que a cliente escolhe" e renomeia "O que vai
dentro" para "Embalagem do kit" — tudo abaixo de onde ela acabou de tocar. Com a dobra depois dos
itens, os blocos novos apareceriam acima do dedo dela.

Os dois blocos de hoje, "O produto" (tipo, nome, categoria, descrição, foto) e "Rendimento e
tempo" (rende, tempo, reserva), viram um: **"A receita"** (ou "O kit"), com nome, rende, unidade
e tempo. Um bloco com o nome sozinho seria um cabeçalho com ícone e frase para um campo.

---

## Escopo

### 1. `src/components/insumos/FormularioInsumo.tsx`

Nada de estado, validação ou escrita muda: `EstadoFormulario`, `VAZIO`, `doInsumo`, `salvar`,
`arquivar` e o rodapé ficam letra por letra. É JSX que se move.

**Na frente, nesta ordem:**

1. `Campo` Nome (como está: `required`, `autoFocus={!insumo}`).
2. A caixa "Como você compra", com o título e a frase que já tem, contendo **Preço pago** e a
   grade **Quantidade + Unidade**. A **Perda sai daqui.**
3. `ResumoCusto`, como está — é a resposta, e fica colada na pergunta.

**A dobra**, o mesmo `<details className="group …">` que já existe, com três mudanças:

- O rótulo do `<summary>` vira **"Mais detalhes"**; a linha ao lado, que some quando aberto,
  vira "categoria, perda, marca, onde compra, estoque".
- Dentro, nesta ordem: **Categoria** (o `Seletor` que hoje está na frente), **Perda** (o `Campo`
  de hoje, com a mesma dica), Marca, Onde compra, Estoque atual. Categoria primeiro porque é a
  que decide em que linha do recibo o custo cai; perda em seguida porque é a que muda o número;
  as três que já estavam, depois.
- `key` e `open`:

  ```tsx
  // Abre sobre o que é dela: o que difere do que um insumo novo recebe, ou o
  // que está errado — uma dobra fechada em cima de um erro é um "Salvar" que
  // não faz nada e não diz por quê. Lê o documento salvo, e não o digitado,
  // para não abrir e fechar enquanto ela escreve. A `key` refaz a decisão
  // quando o painel troca de insumo sem desmontar.
  const temMaisDetalhes =
    !!insumo &&
    (insumo.categoria !== "INGREDIENTE" ||
      insumo.perdaPercentual > 0 ||
      !!insumo.marca ||
      !!insumo.fornecedor ||
      insumo.estoqueAtual !== undefined);
  const erroNosDetalhes = !!(
    erros.categoria ||
    erros.perdaPercentual ||
    erros.marca ||
    erros.fornecedor ||
    erros.estoqueAtual
  );

  <details key={chaveAtual} open={temMaisDetalhes || erroNosDetalhes} …>
  ```

  A `key` é necessária porque o formulário não desmonta entre um insumo e outro (é o truque da
  `chave`, linha 85): sem ela, uma dobra que ela abriu à mão na farinha continuaria aberta no
  açúcar, e uma que fechou continuaria fechada num insumo com marca.

O `<summary>` já tem `toque` (44px) e já é `list-none` com o texto à esquerda; nada disso muda.

### 2. `src/components/fichas/FormularioFicha.tsx`

Nada de `ValoresFicha`, `valoresIniciais`, `resolverItem`, `trocarTipo`, `salvar`, `derivado`,
`PainelPreco` ou `PainelFornada` muda. As quatro faixas do topo e o bloco da fornada ficam onde
estão. É JSX que se move, e dois blocos que viram um.

**Na frente, nesta ordem, logo abaixo do bloco da fornada:**

1. **`Bloco` "A receita"** — `titulo={ehKit ? "O kit" : "A receita"}`, ícone `Tag`,
   descrição "O nome, quanto sai de um lote e quanto tempo ele toma do começo ao fim: forno,
   bancada e embalagem." Dentro, a grade de duas colunas que hoje é de "Rendimento e tempo",
   com o **Nome** (como está: `required`, `autoFocus={!ficha}`, o mesmo placeholder) na
   primeira posição, e depois **Rende + Em** e **Tempo de produção**, letra por letra como estão.
   O `Bloco` "O produto" e o `Bloco` "Rendimento e tempo" deixam de existir; `Clock` sai dos
   imports.
2. **A dobra "Mais detalhes"**, um `<details>` com o mesmo markup do insumo (mesma classe, mesmo
   `<summary>`, mesma linha que some quando aberto: "receita ou kit, categoria, reserva,
   descrição, foto"). Dentro, nesta ordem, cada um exatamente como está hoje, inclusive
   comentários:
   - o `<fieldset>` "O que você está montando" com os dois botões de tipo e o `aviso` —
     primeiro porque é o que muda o que vem abaixo;
   - o `Campo` **Categoria** com o `datalist` de categorias conhecidas;
   - o `Campo` **Fornadas de reserva**, com a mesma condição `!kitComEscolhas` e a mesma dica;
   - o `EnvelopeCampo` **"Como você apresenta"** e o `CampoImagem` **Foto** — por último, porque
     só vão no papel do orçamento.
   - `open`:

     ```tsx
     // Abre sobre o que é dela. A categoria fica de fora de propósito: a
     // ficha-modelo da biblioteca vem com "Cookies" e é a primeira tela que
     // ela vê (`DECISOES.md#d116`).
     const temMaisDetalhes =
       !!ficha &&
       (ficha.tipo === "KIT" ||
         (ficha.fornadasMinimas ?? 0) > 0 ||
         !!ficha.descricao ||
         !!ficha.fotoUrl);
     const { errors } = form.formState;
     const erroNosDetalhes = !!(
       errors.tipo ||
       errors.categoria ||
       errors.fornadasMinimas ||
       errors.descricao
     );

     <details open={temMaisDetalhes || erroNosDetalhes} …>
     ```

     Sem `key`: o editor é uma rota por ficha, e `EditorFicha` monta o formulário com a ficha na
     mão — a mesma razão pela qual `defaultValues` do `useForm` funciona sem `key`.

3. Os blocos de kit ("O que vai no kit", "O que a cliente escolhe"), "O que vai dentro" /
   "Embalagem do kit", "O custo do lote", "Como calcular o preço", a falha, o arquivar e o
   `PainelPreco`: **sem uma linha alterada**, na ordem em que estão.

O espaçamento entre a dobra e os `Bloco`s é o do `space-y-4` do contêiner, que já existe.

### 3. Documentação

- `#d116` em `docs/DECISOES.md`; uma linha de revisão no `#d96`: o piso continua morando na tela
  do produto, agora atrás de "Mais detalhes", e abre a dobra sozinho quando está ligado.
- `docs/ESTADO.md`: a seção da 020, a linha 20 na tabela de módulos, a próxima ação apontando
  para a 021 (que começa com cinco perguntas a ela, não com código) e, se o roteiro não rodar, a
  linha dele na tabela de dívidas.
- `docs/saas/ROADMAP.md`: a 020 marcada como entregue na lista da fase 0.

---

## Roteiro de navegador

Precisa de **duas contas**: uma vazia (a mesma `teste-019`, com a biblioteca arquivada de volta
ao zero, ou uma nova) e a **real**, que tem insumos com marca, fornecedor e estoque preenchidos —
é nela que a regra de abrir sozinha tem o que abrir. DevTools em **Offline** do passo 1 ao 5:
nada aqui escreve diferente, e é isso que se prova.

1. **Conta vazia, tocar "Começar com o que toda cozinha tem".** Cai na ficha-modelo. Do topo para
   baixo: as duas faixas, o bloco **"A receita"** com Cookie clássico · 20 un · 60 min, a linha
   **"Mais detalhes — receita ou kit, categoria, reserva, descrição, foto" fechada**, "O que vai
   dentro" com os doze itens, o recibo, "Como calcular o preço", e R$ 5,90 no rodapé. **Nenhum**
   botão de Receita/Kit, categoria, reserva, descrição ou foto visível sem tocar em nada.
2. **Abrir "Mais detalhes".** Receita marcada, categoria "Cookies", reserva 0, descrição e foto
   vazias. Tocar em **Kit**: o aviso dos itens que saíram aparece **dentro da dobra**, e "O que
   vai no kit", "O que a cliente escolhe" e "Embalagem do kit" aparecem **abaixo** dela. Voltar
   para Receita; sair sem salvar.
3. **`/insumos`, tocar "Açúcar refinado"** (ingrediente, perda zero): o painel abre com Nome,
   "Como você compra" (preço, quantidade, unidade), o resumo do custo e **"Mais detalhes"
   fechado**. Fechar. Tocar **"Saquinho transparente"**: a dobra vem **aberta**, com Categoria em
   Embalagem. Tocar **"Farinha de trigo"**: aberta, com Perda em 2 %.
4. **Novo insumo.** Nome "Castanha de caju", R$ 40,00, 500 g. O resumo diz o custo por grama
   antes de a dobra ser tocada. Cadastrar **sem abrir a dobra**. Reabrir a castanha: ingrediente,
   perda 0, dobra **fechada**. Abrir, pôr marca, salvar, reabrir: dobra **aberta**.
5. **Nova ficha do zero** (`/fichas/nova`). O primeiro bloco é "A receita" com o cursor no Nome;
   "Mais detalhes" fechado logo abaixo; "O que vai dentro" em seguida. Nome, 10 un, 30 min, dois
   itens, salvar. Reabrir: dobra fechada. Abrir, reserva 2, salvar, reabrir: dobra **aberta**
   com o 2 lá.
6. **O erro dentro da dobra.** Editar a castanha, abrir a dobra, Perda em "abc", **fechar a
   dobra**, Salvar: a dobra **abre sozinha** com a mensagem de erro embaixo da Perda. O mesmo na
   ficha com "Como você apresenta" acima de `DESCRICAO_MAX`.
7. **Conta real, um insumo dela com fornecedor preenchido** (qualquer um da nota de 6A): a dobra
   vem aberta, e o fornecedor está lá. Nada do que ela já tinha ficou atrás de um toque.
8. **Recarregar com o app instalado, em 360px**, na ficha-modelo. O `<summary>` tem 44px e o
   texto não corta; com o teclado aberto no campo Rende, a dobra não muda de estado.

---

## Critérios de aceite

- [x] `FormularioInsumo`: na frente, só Nome, Preço pago, Quantidade, Unidade e o resumo do
      custo; Categoria, Perda, Marca, Onde compra e Estoque atual atrás de "Mais detalhes".
- [x] `FormularioFicha`: na frente, um bloco só com Nome, Rende, Em e Tempo, e "O que vai dentro"
      logo depois da dobra; Receita/Kit, Categoria, Fornadas de reserva, "Como você apresenta" e
      Foto atrás de "Mais detalhes", **antes** dos itens.
- [x] A dobra abre sozinha quando o documento salvo difere do padrão de um cadastro novo (com a
      categoria da ficha fora da regra), e quando um campo de dentro tem erro; a ficha-modelo da
      biblioteca abre com a dobra **fechada**.
- [x] Os dois `<summary>` têm 44px de alvo e dizem o que há dentro quando fechados.
- [x] `git diff src/lib/ tests/` vazio: nenhum campo, nenhuma mutação, nenhum esquema, nenhum
      teste tocado. `PainelPreco.tsx`, `LinhaItemFicha.tsx` e `EditorFicha.tsx` sem uma linha
      alterada.
- [x] O bloco "O custo do lote", o bloco "Como calcular o preço" e o painel de preço não mudam.
- [x] Nenhuma palavra de `navegacao.ts`, de `CabecalhoPagina` ou de estado vazio mudou: isso é
      a 021.
- [x] O roteiro de oito passos passa, com os passos 1 a 5 em Offline.
- [x] `lint`, `typecheck`, `test` (os mesmos 526) e `build` passam.
- [x] `#d116` escrito, `#d96` com a linha de revisão, `ESTADO.md` e a linha da 020 no roadmap
      atualizados.

---

## Fora de escopo

- **Dobrar "Como calcular o preço"** (método, margem ou markup, taxa de cartão, outras taxas).
  Os quatro já vêm preenchidos pela `#d114`, são o que ela toca quando o preço parece errado, e
  é para "o bloco de preço" que a mensagem de `motivoSemPreco` aponta. Se a gravação mostrar que
  ela trava ali, é uma spec de uma linha — e é a gravação que diz, não esta spec.
- **Dobrar ou mexer em "O custo do lote".** É o recibo: a metade do "ahá" que explica a outra.
- **O painel de preço** (`PainelPreco`). O roadmap diz que não muda, e não muda.
- **Qualquer coisa em `/configuracao`.** A 019 já a tirou da porta de entrada; o que ela pede
  dentro é assunto de quem já viu um preço.
- **Trocar "insumo", "ficha técnica", "rende", "perda" ou qualquer rótulo.** É a 021, e começa
  com cinco perguntas a ela. Os únicos textos novos desta spec são "Mais detalhes", as duas linhas
  do que há dentro e o título "A receita" / "O kit".
- **Um componente `Dobra` em `components/ui/`.** São dois usos, com o mesmo markup copiado. O
  terceiro `<details>` — configuração ou pedido, quando pedirem — é o que extrai, pela mesma
  regra com que `Bloco` nasceu no terceiro editor.
- **O formulário de pedido**, que também cresceu (validade, entrega, observações). Não é do
  primeiro preço.
- **Gravar a unidade digitada** (0,5 kg voltando como 500 g). Continua na tabela de dívidas.
- **Qualquer mudança em `src/lib/domain/`, `src/lib/firebase/` ou `src/lib/types/`.**

---

## Decisões desta spec que são fáceis de rejeitar

- **A categoria do insumo atrás da dobra.** É a única que muda comportamento além do número: um
  saquinho cadastrado à mão sem abrir a dobra nasce `INGREDIENTE`, o custo dele cai em "Insumos"
  e não em "Embalagem" no recibo (o total do lote é o mesmo), e um kit não o encontra em
  "Embalagem do kit". Três coisas seguram isso: a biblioteca já traz os seis que não são ingrediente com a categoria certa; a
  leitura de nota sugere a categoria sozinha (`categoriaSugerida`); e a linha da dobra fechada
  diz "categoria" em primeiro lugar. Se a gravação mostrar embalagem virando ingrediente, a
  categoria volta para a frente **como pílulas** (Ingrediente · Embalagem · Etiqueta · …), e não
  como o `Seletor` de hoje — é a única das cinco que valeria um lugar na frente.
- **A categoria da ficha fora da regra de abertura.** É a exceção de "O que esta spec decide". A
  alternativa que preserva a regra pura — a biblioteca gravar categoria vazia — quebra o combo
  por categoria (`#d101`) para quem começa pela biblioteca, e o caso de aceite da 018.
- **A dobra lê o documento salvo, e não o digitado.** Uma ficha nova em que ela abre a dobra,
  marca Kit e fecha continua com `open={false}` no prop — e aberta no DOM, porque foi ela quem
  abriu e o React não mexe num prop que não mudou. Se um dia a dobra parecer "não obedecer", é
  isso, e é intencional.
- **Dois blocos da ficha viram um, "A receita".** Poderia ser "O produto" só com o nome, e
  "Rendimento e tempo" como está. Um cabeçalho com ícone e frase para um campo só é o tipo de
  coisa que a gente lê no celular e pergunta para que serve.
- **O tipo (receita ou kit) dentro da dobra, e não como `acao` do cabeçalho do bloco.** `Bloco`
  tem a prop `acao` exatamente para isso ("como o seletor de tipo", diz o comentário), e um
  seletor compacto no canto do bloco "A receita" seria uma boa segunda versão. A primeira versão
  o esconde de propósito: é a pergunta que ela não tem como responder no primeiro minuto, e o kit
  só existe depois de haver receitas para pôr dentro. Se a gravação mostrar uma confeiteira
  procurando "onde eu faço a caixa com 6", o caminho de volta é a `acao`, e é pequeno.
- **"Mais detalhes" nos dois, e não "Detalhes opcionais" que já existia.** "Opcionais" diz que
  não importa; "Mais" diz que tem mais. Categoria e perda importam — só não importam agora.
- **O markup do `<details>` copiado, e não extraído.** Regra da casa: terceiro uso extrai.

---

## Riscos

- **Os insumos da biblioteca abrem a dobra no passo 2 do caminho.** Farinha (perda 2 %),
  chocolate (1 %), as seis embalagens e etiquetas (categoria) vêm com a dobra aberta quando ela
  vai corrigir o preço; o açúcar, os ovos e a manteiga, fechada. Cada uma está certa pela regra, e
  o preço continua sendo o primeiro campo em todas. **Se na gravação isso ler como ruído**, a
  regra do insumo encolhe para "o que ela digitou" — marca, onde compra, estoque — e categoria e
  perda passam a só aparecer na linha da dobra fechada. É uma linha a menos no predicado.
- **A dobra abrindo e fechando sozinha enquanto ela digita.** Não deveria: `open` sai do documento
  salvo e dos erros, e nenhum dos dois muda ao digitar. Se acontecer, algum valor de `useWatch`
  ou de `estado` vazou para o predicado — e a leitura desta spec sobre o `open` do React está
  errada. Pare e conserte o predicado, não o `<details>`.
- **O erro invisível que sobrou.** `errosPorCampo` e `aplicarErros` colocam a mensagem no campo;
  se algum campo de dentro da dobra recebe erro com outro nome de chave, a dobra não abre e a
  mensagem fica escondida. O passo 6 do roteiro testa dois; os outros (marca e fornecedor têm
  teto de tamanho? categoria da ficha?) a sessão confere lendo `esquemaInsumo` e `esquemaFicha`
  antes de escrever `erroNosDetalhes`.
- **"A receita" no lugar de "O produto" muda uma palavra que a 021 vai perguntar.** É uma
  palavra de título de bloco, não de menu, e "receita" é a palavra que a 019 já usa nos cinco
  textos. Se a 021 trouxer outra, é um lugar a mais para trocar, e está listado.
- **Testes verdes sem tocar em nada.** É esperado desta vez — nada de `src/lib/` muda —, e por
  isso o portão não prova a spec. O roteiro prova. Se ele não rodar, a linha entra na tabela de
  dívidas ao lado da da 018, e a spec não finge que fechou.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de oito passos, nas duas contas, com os cinco primeiros em Offline.
E, fora do código, a régua da fase 0, que continua sendo a mesma desde a 018: **a Maynara abrindo
uma conta nova sem ninguém ao lado, com a tela gravada, e a contagem de perguntas em voz alta.**
Com a 018, a 019 e esta, o caminho até o primeiro preço tem um toque, e o caminho até o segundo —
o dela — tem quatro campos e uma lista. Se a contagem ainda não for zero, o que sobra não é
formulário: é palavra, e é a 021.
