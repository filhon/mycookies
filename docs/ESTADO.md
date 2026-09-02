# Estado do projeto

Atualizado em 2026-09-02 (sessão 6A).
**Toda sessão atualiza este arquivo antes de encerrar.**

## Onde estamos

Módulo 1 entregue, o refactor de contas (`specs/000-contas.md`) executado por cima dele, o
Módulo 2 fechado (2A entregou `/configuracao`, 2B entregou a ficha técnica com a calculadora
de preço), o **Módulo 4 fechado** (4A entregou a coleção `transacoes`, o agregado mensal e a
tela `/financeiro`; 4B entregou a coleção `metas`, o espelho no agregado, o bloco de meta no
painel e o cartão da tela Hoje) e o **Módulo 3 fechado**: a 3A entregou as coleções `pedidos`
e `clientes`, as telas `/pedidos` e `/pedidos/[id]` e a agenda da tela Hoje; a 3B ligou o
pedido ao caixa e preencheu a metade do agregado que a spec 004 tinha deixado em zero; a 3C
entregou a coleção `listasCompra` e a tela `/compras`, que fecha o ciclo do produto — do
pedido combinado até o carrinho no mercado.

**Todas as specs de módulo estão executadas.** Fora delas, a spec `005-prontidao.md` tem duas
sessões — `5A` conserta o que impede o primeiro uso, `5B` faz a verificação em navegador, que
é a dívida mais antiga do projeto. **A 5A está entregue**: a configuração pode ser salva na
primeira vez, o iPhone tem ícone de verdade e a dependência morta saiu do pacote. A **5B
continua a fazer**.

A spec `006-nota-fiscal.md` teve a **sessão 6A entregue**: a nota fotografada vira uma lista
conferível e cadastra os insumos de uma vez. É a primeira vez que o projeto tem servidor de
verdade e fala com serviço externo.

**Falta a prova, e não mais o conserto.** Nenhum número deste sistema jamais saiu de um
teclado, passou pelo Firestore e voltou. É o que a 5B responde.

> **A 6A rodou antes da 5B, e a spec pedia o contrário.** `006-nota-fiscal.md` diz, na
> abertura, que depende de a 5B ter rodado — abrir um caminho novo sobre um caminho velho que
> nunca foi visto rodando é descobrir dois defeitos ao mesmo tempo e não saber de quem é qual.
> A ordem foi invertida por decisão de quem conduz o projeto. O risco continua de pé e não foi
> mitigado por nada: quando a 5B rodar e algo em `insumos` ou em `fichas` aparecer torto, a
> primeira pergunta é se o defeito é do caminho velho ou do que a 6A abriu por cima dele.

Portão de conclusão passando: lint limpo, typecheck limpo (app e service worker), **273
testes**, e build com 14 rotas estáticas — `/insumos/nota` entrou na lista — mais `/api/nota`,
`/fichas/[id]` e `/pedidos/[id]` dinâmicas e service worker gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras publicadas,
chave de conta de serviço no disco (fora do git, coberta por `*firebase-adminsdk*.json`).
**Os índices estão todos publicados**: a 4A rodou `firebase deploy --only firestore:indexes`
e levou junto o de `fichas`, pendente desde a 2B; a 3A rodou de novo com os dois novos, a 3B
com o do pedido pago e a 3C com o da lista de compras. Confirmado com
`firebase firestore:indexes`: `insumos`, `fichas`, `transacoes`, `clientes` (`arquivado` +
`nomeBusca`), `listasCompra` (`arquivado` + `criadoEm` desc) e `pedidos` em dois — `arquivado`

- `dataEntregaISO` para a agenda, e `arquivado` + `competenciaPagamento` + `pagoEm` desc para
  "Recalcular o mês".

A conta existe e o acesso foi concedido de ponta a ponta, com o script rodando contra o
projeto de verdade:

```
contas/mycookies  { nome: "MyCookie's", proprietaria: "Maynara", criadaEm, v: 1 }
claim de fcbfilipesantos@gmail.com  { contas: { mycookies: "DONA" } }
```

`proprietaria` é do negócio, não do login: é o nome que a saudação da tela Hoje mostra.
Para trocar, `npm run conceder-acesso -- <email> mycookies "MyCookie's" <NomeNovo>` — o
script atualiza os campos quando a conta já existe.

A verificação visual começou: as telas de desktop no tema escuro foram conferidas contra as
specs. Falta o tema claro, o celular e os números digitados de ponta a ponta.

## Módulos

| #   | Módulo                                      | Estado                    | Spec                        |
| --- | ------------------------------------------- | ------------------------- | --------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                    | —                           |
| 1   | Insumos e embalagens                        | pronto                    | —                           |
| —   | Contas e tenancy                            | pronto                    | `specs/000-contas.md`       |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)          | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | pronto (3A, 3B e 3C)      | `specs/003-pedidos.md`      |
| 4   | Caixa, metas e previsão                     | pronto (4A e 4B)          | `specs/004-caixa.md`        |
| 5   | Prontidão: conserto e verificação           | 5A pronto, **5B a fazer** | `specs/005-prontidao.md`    |
| 6   | Leitura de nota fiscal por IA               | 6A pronto, **6B a fazer** | `specs/006-nota-fiscal.md`  |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas já inserido antes do 2 pelo
motivo registrado em `DECISOES.md#d01`. A spec do Módulo 4 estava dividida em duas sessões:
`4A` caixa e `4B` metas e previsão, as duas entregues.

O Módulo 4 veio antes do 3 e alimentou só metade de `ResumoMensal`. **A 3B fechou a outra
metade**: `qtdPedidos`, `qtdItensVendidos`, `receitaPedidos`, `custoDoVendido`, `ticketMedio`,
`produtos` e `porDia[].pedidos` são escritos pelo pedido pago. A regra de que zero é ausência
continua valendo na tela: as seções de pedido do painel somem em mês sem pedido pago, em vez
de mostrarem R$ 0,00 com cara de resultado.

## O que a sessão 2A deixou pronto

- `src/lib/domain/custosOperacionais.ts`: `custoIndiretoPorHora`, `custoHoraProducao`,
  `custoDeMinutos`, `taxaCobrada`, `liquidoRecebido`. Puro, coberto por teste.
- `src/lib/firebase/mutations/configuracao.ts`: `CONFIGURACAO_SUGERIDA` e
  `salvarConfiguracao`, que calcula `custoIndiretoPorHora` na escrita e grava tudo em uma
  chamada só.
- `src/components/configuracao/`: a tela em cinco blocos, cada um com a frase de
  consequência em reais, mais o painel de forma de pagamento.
- Decisões novas em `DECISOES.md#d17` (sugestão não é dado; uma leitura, uma escrita) e
  `#d18` (forma de pagamento é item de array, desativada e nunca apagada).

Duas coisas fora do escopo literal da spec, feitas porque a tela não ficaria de pé sem elas:

- **Entrada para `/configuracao` no celular.** A configuração só existia na barra lateral,
  que é `lg:` para cima; no celular a tela era inalcançável. Virou um ícone de engrenagem no
  cabeçalho da tela Hoje. Não entrou na navegação inferior porque cinco destinos é o teto
  (`src/components/layout/navegacao.ts`).
- **`parseParaNumero` em `money.ts`.** Era uma função local do formulário de insumo; a tela
  nova precisava da mesma leitura de vírgula decimal. Mesmo corpo, um lugar só.

## O que a sessão 2B deixou pronto

- `src/lib/domain/precificacao.ts`: `calcularPrecoSugerido` (markup e margem, com a guarda de
  margem mais taxas em 100%), `somaTaxas` e `verificarPreco`, que mede o preço praticado e não
  o pretendido.
- `src/lib/domain/custoFicha.ts`: `calcularCustoFicha`, `ehEmbalagem`, `podeSerComponente` e
  `derivarFicha` — a função única que o editor e a mutação usam (`DECISOES.md#d19`).
- `src/lib/firebase/mutations/fichas.ts`: `criarFicha`, `atualizarFicha` e `arquivarFicha`.
  Não existe mutação de "recalcular": salvar já refaz o custo a partir do preço atual dos
  insumos e limpa `custoDesatualizado`.
- `src/components/fichas/`: lista, editor com busca por toque, listas dinâmicas de itens e de
  componentes, e o painel de preço preso ao pé da tela.
- Rotas `/fichas` e `/fichas/[id]`, onde o id `nova` é a ficha que ainda não existe.
- Testes com o caso de aceite da spec, número por número, mais as bordas: rendimento zero,
  custo zero, preço abaixo do custo e kit dentro de kit.
- Decisões novas em `DECISOES.md#d19` a `#d22`.

Fora do escopo literal da spec, e por quê:

- **Bloco "O custo do lote" no editor.** A spec pede as parcelas na fórmula e o painel de
  preço na tela; sem mostrar as parcelas, o custo unitário seria um número sem prestação de
  contas. É o que responde "por que este cookie custa R$ 4,41".
- **Índice composto de `fichas`.** A lista consulta `arquivado == false` ordenado por
  `nomeBusca`, o mesmo par de insumos. Sem o índice a tela não carrega.
  **`firebase deploy --only firestore:indexes` ainda não foi rodado.**
- **`ref` em `Campo` e `Seletor`**, e `taxaCartaoConsiderada` sugerida pela maior taxa ativa.
  Detalhes em `DECISOES.md#d22`.

## O que a sessão 4A deixou pronto

- `src/lib/domain/caixa.ts`: o par `deltaDaTransacao` / `agregarTransacoes`, que é o coração
  do módulo, mais `somarParcelas`, `taxaDaEntrada`, `parcelasDoResumo` e `saidasOrdenadas`.
  As duas funções do par são implementações independentes da mesma verdade, e o teste exige
  que concordem (`DECISOES.md#d23`).
- `src/lib/domain/datas.ts`: `competenciaDe`, `dataISODe`, `dataDeISO`, `diasNoMes`,
  `competenciaVizinha` e os rótulos por extenso. Tudo no fuso do aparelho, nunca em UTC.
- `src/lib/firebase/mutations/transacoes.ts`: `criarTransacao`, `atualizarTransacao`,
  `arquivarTransacao`, `recalcularMes` e `consultaTransacoesDoMes`. Editar é reverter mais
  aplicar; se a data mudou de mês, são dois documentos de agregado.
- `src/components/financeiro/`: a tela em cinco blocos — resultado do mês com a maquininha,
  movimento por dia, saídas por categoria, lançamentos e o botão de recalcular — mais o
  painel de lançamento.
- `Transacao.custoTaxa`: campo novo, com a taxa da venda congelada no lançamento
  (`DECISOES.md#d24`). Nenhum dado existia ainda, então não houve migração.
- `tests/domain/caixa.test.ts` e `tests/domain/datas.test.ts`: o caso de aceite da spec
  número por número, mais edição, arquivamento, troca de categoria, troca de dia e troca de
  mês — cada um conferido pelos dois caminhos.
- Decisões novas em `DECISOES.md#d23` a `#d26`.

Fora do escopo literal da spec, e por quê:

- **`datas.ts` como módulo separado**, e não dentro de `caixa.ts`. A 4B precisa de
  `diasNoMes` para `semanasNoMes`, e `metas.ts` importar de `caixa.ts` só por causa de um
  calendário seria acoplamento sem motivo.
- **`recalcularMes` lê o agregado antes de reescrevê-lo.** A spec pedia uma consulta e uma
  escrita; sem a leitura, recalcular apagaria `porDia[].pedidos`, que é do Módulo 3. O
  motivo está em `DECISOES.md#d23`.
- **`date-fns` foi removido do `package.json`.** Era a decisão que a spec pendurou nesta
  sessão. Ver `DECISOES.md#d26`.

## O que a sessão 4B deixou pronto

- `src/lib/domain/metas.ts`: `planejarMeta` (a meta em doces por semana), `medirMeta` (onde
  ela está agora), `espelhoDaMeta`, `posicaoNoMes`, `ritmoDoEspelho`, `esforcoRestante` e
  `precoMedioDasFichas`. Puro, com o caso de aceite da spec número por número em
  `tests/domain/metas.test.ts`, mais as guardas de alvo zero, preço médio zero, mês fechado e
  mês que ainda não começou.
- `src/lib/firebase/mutations/metas.ts`: `salvarMeta`, que grava `metas/{'YYYY-MM'}` e o
  espelho no agregado em duas escritas, e `espelhoAposDelta`, que é o que a mutação de
  transação usa para mover a meta junto com o dinheiro.
- `src/lib/firebase/mutations/transacoes.ts`: as quatro escritas passaram a receber
  `ContextoMeta` e a reescrever `ResumoMensal.meta` na mesma chamada que aplica os
  incrementos. `recalcularMes(contaId, competencia, meta)` refaz o espelho junto.
- `src/components/metas/`: `BlocoMeta` (painel), `FormularioMeta` (o painel de definição, com
  o preço médio sugerido pelas fichas) e `CartaoMetaHoje` (a tela Hoje).
- `docMeta` em `colecoes.ts`, `esquemaMeta` em `schemas.ts` e `rotuloMes` em `datas.ts`.
- Decisões novas em `DECISOES.md#d27` a `#d30`.

Nada de schema mudou: `Meta` e `ResumoMensal.meta` já estavam tipados desde o Módulo 0, e
nenhum campo novo foi preciso. Nenhum índice novo também — a meta é lida pelo id.

Fora do escopo literal da spec, e por quê:

- **`ritmoDoEspelho` e `esforcoRestante`.** A spec pede o espelho gravado e lido de uma vez.
  Gravado ele fica, mas duas das suas linhas dependem do dia de hoje: lidas dias depois,
  diriam que falta menos do que falta. Os motivos estão em `DECISOES.md#d30`.
- **`ContextoMeta` vindo da tela.** A alternativa era a mutação ler a meta e o agregado antes
  de gravar, e leitura exige rede no caminho em que lançar precisa funcionar sem ela
  (`DECISOES.md#d29`).
- **O bloco de meta aparece também em mês sem lançamento nenhum**, acima do estado vazio.
  Começo de mês é exatamente quando a meta se define, e o mês ainda está vazio.

## O que a sessão 3A deixou pronto

- `src/lib/domain/pedido.ts`: `derivarPedido` (todos os totais de uma vez, com a guarda de
  desconto maior que o subtotal), `codigoDoPedido`, `transicoesPermitidas` / `podeIrPara`,
  `ofereceOPrecoDeHoje`, `agruparPorEntrega`, `resumoDosItens` e os rótulos de status. Puro,
  sem Firebase.
- `tests/domain/pedido.test.ts`: o caso de aceite da spec número por número (subtotal 23780,
  total 24000, custo 15220, taxa 1198, sobra 7582), a edição para 24 cookies, a guarda do
  desconto, o preço congelado, o selo só em orçamento e o fluxo de status inteiro.
- `src/lib/firebase/mutations/pedidos.ts`: `criarPedido`, `atualizarPedido`,
  `mudarStatusPedido` e `arquivarPedido`. O corpo do documento sai de `derivarPedido`, a
  mesma função que desenha o rodapé do editor.
- `src/lib/firebase/mutations/clientes.ts`: `criarCliente` e `atualizarCliente`, com
  `totalClientes` incrementado no agregado global.
- `src/components/pedidos/`: lista agrupada por data de entrega com filtro de status em
  pílulas, editor com busca por toque e rodapé fixo de totais, painel de cadastro de
  cliente, selo de status e a agenda da tela Hoje.
- Rotas `/pedidos` e `/pedidos/[id]`, onde o id `novo` é o pedido que ainda não existe.
- `esquemaPedido` e `esquemaCliente` em `schemas.ts`, mais `errosDeLinha`, que joga a falha
  na linha certa da lista de itens.
- `diaVizinho` e `rotuloAgenda` em `datas.ts` — 'Hoje', 'Amanhã', 'Ontem' e o dia por extenso.
- Índices de `pedidos` e `clientes` publicados.
- Decisões novas em `DECISOES.md#d31` a `#d35`.

Nada de schema mudou: `Pedido`, `ItemPedido` e `Cliente` já estavam tipados desde o Módulo 0.
O comentário de `Pedido.numero` foi corrigido, porque ele prometia uma Cloud Function que a
`#d31` decidiu não existir. **O comentário de `Pedido.competencia` continua dizendo "chave de
agregação do dashboard", e a 3B precisa corrigi-lo**: a partir dela a chave do dashboard é a
competência do pagamento, e esta continua sendo a da agenda.

Fora do escopo literal da spec, e por quê:

- **`BlocoFicha` virou `components/ui/Bloco` e `BuscaItem` virou `components/ui/BuscaItem`.**
  O editor de pedido é o terceiro caso, que era a condição registrada no próprio componente.
  Só o caminho do import mudou.
- **Rótulo de dia na agenda** (`rotuloAgenda`). Um cabeçalho dizendo "quarta-feira, 2 de
  setembro" obriga a conferir o calendário para saber que é hoje.
- **Total do dia no cabeçalho de cada grupo** da lista. É o que responde "dá para dar conta
  deste dia?" antes de abrir pedido por pedido.
- **Selo "Passou da data"** no grupo cujo dia já passou e ainda tem pedido aberto. Sem ele, um
  pedido atrasado aparece no topo da lista sem explicar por quê.

## O que a sessão 3B deixou pronto

- `src/lib/domain/caixa.ts` cresceu para as **duas metades**: `deltaDoPedido` /
  `agregarPedidos` são o par novo, `agregarMes` compõe as duas, e `somarParcelas`,
  `parcelasDoResumo` e `PARCELAS_ZERADAS` acompanharam. Mais `ticketMedioDe` (a razão, refeita
  na leitura) e `produtosOrdenados` (o ranking, sem a linha que sobrou zerada).
- `src/lib/firebase/mutations/agregado.ts`, **arquivo novo e único escritor de
  `agregados/{'YYYY-MM'}`**: `incrementosDoAgregado`, `aplicarNoAgregado`, `recalcularMes`,
  `consultaTransacoesDoMes`, `consultaPedidosPagosDoMes`, `transacaoAgregavel`,
  `pedidoAgregavel` e `diaDoPagamento`. As três primeiras vieram de `transacoes.ts`.
- `mutations/pedidos.ts`: `marcarPedidoPago`, `desfazerPagamento` e o `ContextoPagamento`.
  `atualizarPedido` passou a receber o pedido inteiro (e não só o id) porque editar um pedido
  pago é reverter mais aplicar. `mudarStatusPedido` recusa cancelar um pedido pago.
- `mutations/transacoes.ts`: as três escritas cruas que o pedido pago reusa —
  `gravarTransacao`, `corrigirValorDaTransacao` e `arquivarDocumentoDaTransacao` —, que
  gravam o documento e **não** tocam no agregado. `DadosTransacao` ganhou `pedidoId` e
  `custoTaxa`.
- `mutations/clientes.ts`: `aplicarPedidoNoCliente`, com `totalPedidos` e `totalGasto` por
  incremento e `ticketMedio` por valor.
- `mutations/metas.ts`: `salvarMeta` grava `pedidosNecessarios` a partir do ticket médio real.
- `src/components/financeiro/VendasPorPedido.tsx` e `ProdutosDoMes.tsx`, as duas seções novas
  do painel. `BlocoMeta` ganhou a linha de pedidos, e `/pedidos` ganhou a faixa de "a receber".
- `src/components/pedidos/BlocoPagamento.tsx`: marcar como pago, com a data do pagamento, e
  desfazer com confirmação.
- Schema: `ResumoMensal.custoInsumos` virou `custoDoVendido`, `ResumoMensal.receitaPedidos` e
  `Pedido.competenciaPagamento` nasceram. Nenhum tinha dado gravado, então não houve migração.
  O comentário de `Pedido.competencia` foi corrigido: ela é a chave da agenda, e não a do
  painel.
- Índice de `pedidos` por `arquivado` + `competenciaPagamento` + `pagoEm` desc, publicado.
- Testes: o caso de aceite da 3B número por número em `tests/domain/caixa.test.ts`, com delta
  e reconstrução conferidos nos dois caminhos, mais desfazer, editar um pedido pago e a
  competência do pagamento. `aReceber` em `pedido.test.ts` e `pedidosNecessariosDe` em
  `metas.test.ts`. **O bloco da 4A não teve uma linha alterada**, que era o critério.
- Decisões novas em `DECISOES.md#d36` a `#d38`.

Fora do escopo literal da spec, e por quê:

- **`agregado.ts` como módulo próprio.** A spec fala em "o agregado ganha um segundo
  escritor"; deixar a escrita dentro de `transacoes.ts` faria o segundo escritor importar do
  primeiro, e `recalcularMes` passou a precisar das duas consultas. Motivo em `#d37`.
- **Selo "Pago" na linha da lista.** Sem ele, "a receber" seria um total sem nenhuma linha
  visível que o explicasse.
- **A meta em pedidos usa `ResumoMensal.ticketMedio`, e não `ticketMedioReferencia`.** É a
  única divergência em relação à letra da spec, e ela está registrada com o custo da
  alternativa em `#d38`.

## O que a sessão 3C deixou pronto

- `src/lib/domain/listaCompras.ts`: `explodirDemanda` (pedido → insumo, em unidade base) e
  `montarLista` (demanda → pacote e reais), mais `quantidadeFisica`, `agruparPorCorredor`,
  `resumoDaLista`, `statusDaLista`, `preservarComprados`, `entraNaLista`, `orcamentosDeFora`
  e `rotuloDeCompra`. Puro, sem Firebase.
- `tests/domain/listaCompras.test.ts`: o caso de aceite da spec número por número — 32 cookies
  para 20 soltos e 2 caixas de 6, farinha de 800 g úteis para 842,11 g físicos, saquinho que
  não se compra porque o estoque cobre, caixa que leva 25 porque é assim que se vende caixa, e
  os R$ 120,00 da lista. Mais o kit que para no primeiro nível, as três guardas (ficha
  arquivada, rendimento zero, insumo arquivado), a ordem errada do estoque e a preservação das
  marcas ao regerar.
- `src/lib/firebase/mutations/listasCompra.ts`: `consultaListaAtual`, `criarListaCompras`,
  `regerarListaCompras`, `marcarItemComprado`, `corrigirPrecoNaLista`, `arquivarListaCompras`
  e `nomeDaLista`. `dadosDoInsumo` nasceu em `mutations/insumos.ts` para que a correção de
  preço na gôndola reuse `atualizarInsumo` em vez de reescrever a forma do documento.
- `src/components/compras/`: `TelaCompras` (carrega e só então monta), `ListaDoMercado` (a
  tela), `LinhaCompra` (a linha com alvo de toque inteiro e o preço corrigível no ato),
  `RodapeCompras` (o total restante preso ao pé) e `CartaoComprasHoje`.
- Rota `/compras`, alcançada pelo cabeçalho de `/pedidos` (`AtalhoParaCompras`) e pelo cartão
  da tela Hoje. **Fora da navegação inferior**: cinco destinos é o teto.
- `docListaCompras` em `colecoes.ts` e o índice de `listasCompra` publicado.
- Decisões novas em `DECISOES.md#d39` a `#d41`.

Nada de schema mudou: `ListaCompras` e `ItemListaCompras` já estavam tipados desde o Módulo 0,
e nenhum campo novo foi preciso. O tamanho do pacote e o preço de hoje não são gravados na
lista de propósito — eles continuam vindo de `insumos`, que é onde mudam quando ela corrige o
preço na frente da gôndola.

Fora do escopo literal da spec, e por quê:

- **"Fechar esta lista".** Sem arquivar, "Refazer" na semana seguinte preservaria as marcas da
  compra anterior e a lista nasceria toda comprada — a regra de preservar o carrinho, que a
  spec pede, só continua verdadeira na segunda ida ao mercado se existir um jeito de encerrar
  a primeira. Motivo em `#d39`.
- **Período em pílulas de 7, 15 e 30 dias.** A spec diz "os pedidos do período" sem dizer qual;
  uma semana é o horizonte de uma ida ao mercado, e os outros dois são para a semana de festa e
  o Natal. Uma consulta só, no maior horizonte, e o recorte em memória.
- **A tela não espera o servidor para gravar.** É a única do sistema que despacha assim, e o
  motivo — a promessa de escrita do Firestore não resolve sem rede — está em `#d40`.
- **`quantidadeFisica` e `quantidadeCompra` no resultado do domínio, e não no documento.** A
  linha gravada segue exatamente `ItemListaCompras`; o que a tela precisa a mais para escrever
  "1 pacote de 1 kg" ela junta do insumo vivo. Nenhuma mudança de schema por causa de rótulo.

## O que a sessão 5A deixou pronto

Nenhuma funcionalidade nova: são três consertos, e o terceiro **remove** uma dependência.

- **`TelaConfiguracao` pode ser salva na primeira vez.** A base de comparação passou a ser
  `string | null`, com `null` significando "esta conta nunca salvou": não existe assinatura
  que se compare a ausência, então `alterado` nasce verdadeiro e os dois caminhos de salvar
  — o botão do desktop e a barra fixa do celular — ficam vivos. A frase de status ganhou o
  terceiro caso ("Estes são valores sugeridos. Confira e salve para começar."), porque com a
  base em ausência a tela diria "você mudou" para quem só a abriu. `DECISOES.md#d43`.
- **O nome do negócio é relido no salvamento.** `estadoInicial` lê `conta?.nome`, mas a
  semeadura dispara com a assinatura da configuração e o documento da conta é outra
  assinatura, que pode não ter chegado. Numa conta nova o espelho nascia vazio e `paraDados`
  o omitia da escrita. **Não** virou tarefa de espelho de nome: o campo continua sem leitor e
  a dívida continua na tabela.
- **`scripts/gerar-icones.mjs`, mais `src/app/apple-icon.png` (180×180),
  `public/icons/icone-192.png` e `icone-512.png`.** O Safari não lê SVG como
  `apple-touch-icon`, e o iPhone instalava uma miniatura da página. O manifesto lista os dois
  PNGs em `purpose: "any"` e mantém o SVG em `maskable`. Conferido no build: o
  `<link rel="apple-touch-icon">` sai com `sizes="180x180"` e `type="image/png"`, e
  `/apple-icon.png` virou rota. `DECISOES.md#d44`.
- **`@hookform/resolvers` saiu do `package.json`** e do `package-lock.json`. Não era
  importado em lugar nenhum — a validação é `safeParse` em toda tela (`#d22`) — e era peso
  morto no pacote de um app que precisa abrir offline na bancada. A linha correspondente saiu
  da tabela de dívidas.

Fora do escopo literal da spec, e por quê:

- **Os PNGs saem de `src/app/icon.svg`, e não do maskable.** A spec diz "os três saem do SVG
  existente" e o repositório tem dois. O maskable ocupa 42% do quadrado de propósito, para
  sobreviver ao recorte circular do Android; sem recorte nenhum isso vira um biscoito pequeno
  boiando no meio da tela de início. O motivo está em `#d44`, junto do porquê de o `rx` do
  fundo sair.
- **O script ficou versionado**, em vez de a rasterização ser feita e esquecida. O desenho vai
  mudar um dia, e um PNG sem procedência é um arquivo que ninguém sabe refazer.

Nada de schema, de regra de segurança ou de índice mudou, e nenhum teste precisou ser
alterado: os 228 continuam os mesmos, porque nada disto mora em `src/lib/domain/`.

## O que a sessão 6A deixou pronto

O ciclo inteiro do insumo a partir da nota: fotografar, ler, conferir, corrigir, remover e
cadastrar. **O caixa é a 6B e não entrou.**

- `src/lib/domain/notaFiscal.ts`, o módulo onde mora o risco desta spec: `esquemaNotaLida`
  (zod sobre a resposta do modelo, que recusa número onde deveria haver texto),
  `centavosDoTexto`, `embalagemDoTexto`, `categoriaSugerida`, `cnpjValido`, `digitosDoCnpj`,
  `normalizarNota`, `conferirTotal`, `somarLinhas`, `parearComInsumos`, `cadastroDaLinha` e
  `atualizacaoDaLinha`. Mais os tetos (8 MB, 60 linhas, 30 s, 3 s no CNPJ, 1600px/80%) e
  `MENSAGEM_FALHA`, que é o que a rota e a tela dizem com as mesmas palavras.
- `tests/domain/notaFiscal.test.ts`: **45 testes**, com o caso de aceite da spec linha por
  linha — 1,25 c/g na farinha e 1,3158 com a perda de 5% preservada, 3,9604 c/g no chocolate
  de 1,01 kg, R$ 17,50 e não R$ 35,00 na manteiga, R$ 2,00 por caixa no `C/25`, `10X15` que
  não é quantidade, e os R$ 146,40 do rodapé contra os R$ 176,20 impressos. Mais as bordas de
  `embalagemDoTexto`, os quatro casos de `cnpjValido` e a regra de preservação.
- `src/app/api/nota/route.ts` (`runtime: nodejs`, `dynamic: force-dynamic`), com
  `src/lib/server/firebaseAdmin.ts` ao lado: confere o token, confere a claim `contas`, chama
  o Gemini com `temperature: 0` e `responseSchema`, valida com `esquemaNotaLida`, e só então
  pergunta o nome da loja à API pública de CNPJ. **Não escreve no Firestore e não guarda a
  foto.** Chamada por `fetch`, sem SDK: nenhuma dependência nova.
- `src/lib/firebase/mutations/notas.ts`, com `importarNota`: um `writeBatch` para todos os
  documentos, o incremento de `totalInsumos` junto, e uma passada só marcando as fichas
  afetadas por `array-contains-any` em blocos de dez.
- `src/components/notas/`: `TelaNota` (escolher → lendo → conferindo → pronto),
  `CartaoLinhaNota` (seis campos editáveis, o selo do que vai acontecer e a frase de
  consequência), `RodapeNota` (o rodapé fixo com a conferência do total) e `EntradaLeitura` /
  `AvisoLeituraSemRede`.
- Rota `/insumos/nota`, alcançada pelo cabeçalho de `/insumos` (nos dois tamanhos de tela) e
  pela segunda ação do estado vazio. **Fora da navegação inferior e sem botão flutuante
  próprio**: um já existe.
- `src/lib/utils/imagem.ts`: a redução por `canvas` para 1600px / JPEG 80%, com
  `createImageBitmap` primeiro por causa da rotação do EXIF. PDF sobe como está.
- `.env.local.example` ganhou `GEMINI_API_KEY` e `GEMINI_MODELO`, com o aviso invertido: esta
  não é pública como as do Firebase.
- Decisões novas em `DECISOES.md#d45` a `#d52` — as oito da abertura da spec 006, todas
  executadas nesta sessão.

Aprovações usadas, e o que cada uma custou:

- **`firebase-admin` saiu de `devDependencies` e entrou em `dependencies`.** O pacote já
  estava instalado, nada novo desceu, e o build confirma que ele não entra no bundle do
  cliente. `#d46`.
- **Um serviço externo pago passa a fazer parte do produto**, com custo variável por uso.
  Modelo padrão `gemini-3.5-flash-lite`, confirmado na página de modelos: existe, aceita
  imagem e PDF, tem faixa gratuita, e no pago custa US$ 0,30 por milhão de tokens de entrada
  e US$ 2,50 de saída.
- **Um segundo host externo**, a API pública de CNPJ: sem chave, sem dependência, sem custo, e
  com a degradação desenhada para quando ele não responder. `#d52`.
- `Transacao.notaChave` **não** foi usado: ele é da 6B.

Fora do escopo literal da spec, e por quê:

- **`CATEGORIAS_INSUMO` saiu de dentro de `FormularioInsumo` para `custoInsumo.ts`.** A leitura
  de nota é o segundo lugar que precisa oferecer a mesma escolha, e duas listas seriam duas
  ordens e dois rótulos esperando para divergir. Só o caminho do import mudou.
- **`precoMudou` e `podarHistorico` viraram exportados**, junto de `corpoDeInsumoNovo` e
  `corpoDeAtualizacao`. O lote precisa saber quais linhas viraram compra de verdade, e
  `arrayUnion` não tem teto — o histórico continua sendo podado nas últimas doze.
- **`entradaHistorico` passou a receber o `Timestamp`** em vez de chamar o relógio. Numa nota,
  as doze linhas são a mesma compra e precisam ter a mesma hora.
- **Uma etapa "pronto" ao fim da tela**, com quantos nasceram, quantos foram atualizados e
  quantas fichas ficaram com o custo desatualizado. Sem ela, o efeito mais importante da
  importação — a ficha que precisa ser reaberta — aconteceria sem ninguém ver.
- **O botão da entrada e a frase de "sem rede" são componentes separados.** O motivo de
  layout está em `#d50`.

Nada de schema mudou, nenhuma regra de segurança mudou e nenhum índice novo foi preciso: o
pareamento é feito em memória sobre os insumos que a tela já carrega, e
`array-contains-any` sobre `insumoIds` usa o mesmo índice de campo único que
`marcarFichasDesatualizadas` já usava.

**O que a 6A não provou.** `npm test` cobre `src/lib/domain/` e mais nada, então a rota, a
tela e a gravação em lote não têm teste automatizado. O que foi exercitado de verdade contra
código rodando:

- **A porta da rota**, contra o servidor de desenvolvimento: `POST /api/nota` sem token e com
  token inválido devolvem `401 {"erro":"sem-acesso"}`, e o Gemini não é chamado — a conferência
  do token vem antes de a chave sequer ser lida.
- **A chave fora do bundle**, com um `build` feito com uma sentinela no lugar de
  `GEMINI_API_KEY`: a sentinela não aparece em lugar nenhum de `.next`, e `.next/static` não
  contém `GEMINI_API_KEY` nem `firebase-admin`.

Tudo o mais — uma foto de verdade virando lista, o tempo da leitura no celular, o rodapé fixo
com o teclado aberto, a nota tirada torta — está na lista de navegador abaixo, e depende de
`GEMINI_API_KEY` estar preenchida em `.env.local`, o que ainda não está.

## O que mudou no refactor de contas

Vale saber antes de escrever qualquer código novo, porque muda a assinatura de tudo que
toca o Firestore. Decisões em `DECISOES.md#d14` e `#d15`.

- Todo caminho é `contas/{contaId}/…`. O mapa `caminhos` em `src/lib/types/index.ts`
  continua sendo o único lugar que conhece o formato.
- `useUid()` virou `useContaId()`. `colecoes.ts` e as mutações recebem `contaId`.
- `AuthProvider` expõe `contaId` (da claim) e `conta` (documento assinado). A saudação da
  tela Hoje sai de `conta.proprietaria`.
- Toda escrita grava `v: VERSAO_SCHEMA`.
- A claim é `{ contas: { [contaId]: 'DONA' } }`; `{ admin: true }` não existe mais.
- `reconferirAcesso()` força a renovação do token: a tela de acesso negado tem botão em vez
  da instrução "saia e entre novamente". Por que o acesso ainda é concedido por script, e
  quando isso muda: `DECISOES.md#d16`.

## A spec 006, com a 6A entregue e a 6B a fazer

`specs/006-nota-fiscal.md` foi escrita em 2026-09-02: fotografar ou anexar a nota fiscal da
compra, conferir numa lista o que foi lido, e cadastrar os insumos de uma vez, com a compra
virando saída no caixa. **A 6A entregou tudo menos a última metade da frase.**

O que a **6B** ainda deve, e que esta sessão deliberadamente não tocou:

- Um lançamento por nota — e não um por item — em `criarTransacao`, com o valor sendo a soma
  das linhas **mantidas** e não o total impresso: o shampoo de R$ 29,80 não é do negócio.
- O bloco de caixa na tela de conferência, **nascendo ligado**, dizendo o que vai lançar antes
  de lançar.
- `Transacao.notaChave?: string` — `75315333000109-2026-09-02-17620` —, a guarda contra lançar
  a mesma nota duas vezes. É a aprovação de schema que continua pendente, e ela é compatível:
  documento antigo sem o campo continua válido. O CNPJ que alimenta essa chave **já está de
  pé**: `normalizarNota` devolve os catorze dígitos quando o verificador fecha, e `""` quando
  não.
- Confirmar em `metas.ts` que saída não move o espelho da meta antes de passar `ContextoMeta`
  como `null`.

## Próxima ação

Duas coisas, e a ordem entre elas é uma decisão a tomar:

1. **A sessão 5B de `specs/005-prontidao.md`**, a verificação em navegador — que continua
   sendo a dívida mais antiga do projeto, e que agora tem mais o que conferir do que quando
   foi escrita. O roteiro está na spec, em ordem, porque cada passo constrói o estado que o
   seguinte consome.
2. **A sessão 6B**, a compra virando saída no caixa.

**Antes de qualquer uma das duas: preencher `GEMINI_API_KEY` em `.env.local`.** A variável
está documentada em `.env.local.example`, a chave se emite em
<https://aistudio.google.com/apikey>, e sem ela `POST /api/nota` responde 500 com
`sem-configuracao` — a tela diz "a leitura de nota ainda não está configurada neste servidor".
Nada mais do sistema depende dela.

O portão de conclusão foi rodado de verdade em 2026-09-02, no fim da 6A, e passa nos quatro:
lint, typecheck, 273 testes e build. Portão passando não é o mesmo que sistema pronto —
nenhum dos quatro toca no Firestore, e nenhum dos quatro chama o Gemini.

Da 6A, o que só o navegador responde:

- **Uma foto de nota real, no celular.** É o único jeito de saber quanto tempo a leitura leva
  com o sinal de casa dela, e se a compressão a 1600px deixa a nota legível.
- **Um PDF no computador**, que é o caminho do e-mail do mercado.
- **Uma nota tirada torta, ou com dobra.** O que interessa não é acertar — é o que a tela diz
  quando o modelo erra metade das linhas. Corrigir seis linhas na mão precisa ser menos
  trabalho do que cadastrar seis insumos do zero; se não for, a funcionalidade não se paga.
- **Uma nota com um item já cadastrado**, para ver o selo "era R$ 11,90" e a ficha ganhar o
  selo de custo desatualizado. Depois, conferir em `/insumos` que a perda, o estoque e a
  categoria daquele insumo continuam como estavam.
- **O rodapé fixo com o teclado aberto**, no celular, editando o preço da terceira linha. É a
  mesma pergunta dos outros três rodapés fixos, numa tela com mais campos.
- **Uma nota com o cabeçalho cortado ou ilegível.** Sem CNPJ não há consulta, e o que se
  verifica é que isso não vira erro em tela: a leitura das linhas termina igual.
- **Com a consulta de CNPJ derrubada de propósito** (bloqueando `publica.cnpj.ws`), a leitura
  precisa terminar igual, com o nome que o modelo leu e sem cidade.
- **Sem rede**, a entrada em `/insumos` desabilitada com a frase — e nenhuma outra tela do
  sistema mudando de comportamento.
- **O `POST /api/nota` não passando pelo service worker.** `defaultCache` só registra rotas de
  GET, então não há o que configurar; há o que conferir uma vez na aba de rede.

**O que a 5A consertou não foi visto rodando.** O conserto é lógica de estado local e não
tem teste — `npm test` cobre só `src/lib/domain/`. O caso só se exercita numa conta **sem**
`configuracao/geral`: se a conta `mycookies` já tiver o documento, apagá-lo é o que recria o
cenário. É o passo 1 do roteiro da 5B, e é lá que `firestore.rules` deixa de ser regra
publicada e nunca exercida.

**Ver o resto em navegador.** Os índices já estão publicados, então `npm run dev` basta.

Das capturas de desktop, o que continua sem resposta: o tema **claro**, que é o padrão do
`DESIGN.md` e não foi fotografado; o **celular** inteiro; e os **rodapés fixos** do editor de
ficha e do editor de pedido, que não aparecem em captura de página inteira — precisam de
captura de viewport, com dados dentro.

A verificação visual continua sendo a dívida mais antiga do projeto, e agora tem mais o que
conferir: saudação vindo do banco, insumo gravando em `contas/mycookies/insumos`,
configuração salvando em `configuracao/geral`, uma ficha do começo ao fim (o caso de aceite
da spec dá para digitar como está e conferir os R$ 4,41 de custo e os R$ 6,90 de preço), um
kit consumindo essa ficha, e o selo de custo desatualizado aparecendo ao mudar o preço de um
insumo já usado.

Da 4A e da 4B, o que só o navegador responde:

- **Digitar o caso de aceite da spec 004 em `/financeiro`** — as cinco linhas de 2026-09 — e
  conferir os R$ 118,11 de sobra e os R$ 6,89 de maquininha. Depois editar a venda 1 para
  R$ 150,00, arquivar a internet, e ver o painel acompanhar. É o teste de ponta a ponta que
  o vitest não faz: ele cobre a aritmética, não o caminho até o Firestore.
- **"Recalcular o mês" depois disso** precisa devolver exatamente os mesmos números. Se
  devolver outros, o delta está errado em algum ponto entre a tela e a escrita.
- **O gráfico de 31 barras no celular.** São ~9px por dia em tela de 360px: é onde ele
  quebra, se quebrar.
- **`/fichas/[id]` é rota dinâmica**, a primeira do projeto. O `defaultCache` do Serwist
  guarda navegação já visitada, mas uma ficha nunca aberta, sem rede, cai em `/offline`.
- **O painel de preço é fixo no pé da tela e tem campo dentro dele.** No celular, é preciso
  ver se o teclado não o cobre na hora de digitar o preço.
- **Definir a meta de 2026-09 com alvo R$ 3.000,00** e conferir os 435 doces no mês e os 102
  por semana. Com as cinco linhas da 4A lançadas, o realizado precisa ser R$ 245,00, e cada
  edição e arquivamento precisa mover o progresso na hora.
- **O cartão da tela Hoje** precisa mostrar o mesmo número de doces por semana que o painel,
  e sem consultar mais nada: ele lê só o agregado do mês.
- **Editar um lançamento para outro mês** deixa o espelho do mês de destino atrasado até a
  próxima escrita naquele mês (`DECISOES.md#d29`). Vale ver o efeito uma vez, e confirmar que
  "Recalcular o mês" no mês de destino conserta.

Da 3A, o que só o navegador responde:

- **Digitar o pedido do caso de aceite** — 20 cookies e 2 caixas com 6, R$ 7,80 de desconto,
  R$ 10,00 de entrega, no crédito — e conferir os R$ 240,00 de total e os R$ 75,82 de sobra
  no rodapé, com os R$ 10,00 da entrega ditos na frase. Depois subir para 24 cookies e ver os
  R$ 267,60 e os R$ 84,41.
- **Mudar o preço da ficha do cookie depois de montar o orçamento.** O selo "hoje esta ficha
  sai por" precisa aparecer na linha, e "usar o preço de hoje" precisa mexer no total. Ao
  confirmar o pedido, o selo tem que sumir.
- **O rodapé de totais é fixo no pé da tela**, como o painel de preço da ficha. No celular,
  ver se ele não cobre o último bloco nem briga com o teclado no campo de desconto.
- **A agenda da tela Hoje** com um pedido para hoje e outro para daqui a três dias: o de hoje
  aparece sozinho, e o título vira "Os próximos dias" quando não há nada hoje.
- **Cancelar e reabrir um pedido.** O documento continua lá, o status muda, e a lista o joga
  para "Já saíram da agenda".
- **Nenhum número de pedido aparece em `/financeiro` até o pedido ser pago.** Criar, confirmar
  e entregar não movem um centavo: quem move é o botão de marcar como pago, da 3B.

Da 3B, o que só o navegador responde — e é aqui que o risco desta sessão de fato se resolve:

- **Marcar o pedido do caso de aceite como pago em 15/09** e conferir, em `/financeiro`: os
  R$ 485,00 de entradas, os R$ 18,87 de maquininha, os R$ 346,13 de sobra, 1 pedido, ticket
  médio de R$ 240,00, R$ 152,20 de "custo do que você vendeu", e o ranking com o cookie
  (R$ 138,00 / sobram R$ 49,80) na frente da caixa (R$ 99,80 / sobram R$ 35,80).
- **"Recalcular o mês" logo em seguida precisa devolver exatamente os mesmos números.** Se
  devolver outros, um delta está errado entre a tela e a escrita — e agora são dois escritores.
- **Desfazer o pagamento** e ver cada número voltar, com o lançamento arquivado e não apagado.
  Depois recalcular de novo: é o que limpa o produto que ficou zerado no documento (`#d37`).
- **Editar um pedido já pago** (24 cookies em vez de 20) e ver o lançamento do caixa mudar
  para R$ 267,60 junto, sem criar um segundo.
- **Pagar em outubro um pedido entregue em setembro.** O dinheiro precisa cair em outubro nos
  dois lados, e o pedido continuar na agenda de setembro.
- **A faixa de "a receber" em `/pedidos`**, com um pedido entregue e não pago: ele não pode
  aparecer no resultado do mês, e precisa aparecer ali.
- **Cancelar um pedido pago.** A tela desfaz o pagamento antes de cancelar; se a ordem
  inverter, a mutação recusa com uma frase.

Da 3C, o que só o navegador responde:

- **Montar a lista com o pedido do caso de aceite confirmado** e conferir a tabela inteira:
  farinha 1 pacote / R$ 12,50 (com estoque de 500 g e 5% de perda), chocolate 1 / R$ 40,00,
  manteiga 1 / R$ 17,50, caixa 1 / R$ 50,00, e o saquinho no bloco "não precisa comprar". O
  rodapé precisa dizer R$ 120,00.
- **Marcar itens com o app offline.** É o cenário que a `#d40` existe para resolver: a linha
  precisa marcar no toque, sem botão preso em "salvando", e o selo de sincronização precisa
  aparecer. Voltar a rede e ver tudo subir.
- **Corrigir o preço da farinha pela lista.** O custo estimado da linha e o rodapé se refazem
  na hora, o insumo muda em `/insumos`, e a ficha do cookie ganha o selo de custo desatualizado.
- **Confirmar um orçamento do período e tocar em Refazer.** O item novo entra e o que já estava
  marcado continua marcado — é o critério de aceite mais fácil de quebrar.
- **Arquivar a ficha do cookie e reabrir `/compras`.** O bloco "Isto ficou fora da conta"
  precisa aparecer com o nome dela, e o resto da lista continuar somando.
- **Trocar o período de 7 para 30 dias** sem refazer: a frase de divergência precisa aparecer
  em vez de as pílulas descreverem uma lista que não é a da tela.
- **Fechar a lista e montar outra.** A nova precisa nascer sem nenhum item marcado.

## O que a verificação visual já corrigiu

A primeira rodada de capturas em navegador (desktop, tema escuro) achou três coisas:

- **Largura de coluna padronizada.** Havia três larguras de conteúdo em uso e nenhuma
  decidida: listas em 1024px centralizadas, editores e `/compras` em 768px encostados à
  esquerda, configuração em 672px. Agora toda tela usa a coluna do shell, e os campos que
  ficariam largos demais foram pareados em grade de duas colunas. `DECISOES.md#d42`.
- **Rodapé de painel sem respiro no pé.** `area-segura-inferior` define `padding-bottom` e é
  emitida depois das utilidades do Tailwind, então apagava o `py-4` do rodapé do `Painel` em
  vez de somar: no desktop o `env()` vale zero e os botões encostavam na borda; no celular o
  inset do aparelho substituía o respiro. Nasceu `rodape-seguro`, que soma os dois, e o
  comentário das duas utilidades agora diz qual serve para quê. Vale para os cinco painéis:
  insumo, transação, meta, cliente e forma de pagamento.
- **Configuração não podia ser salva na primeira vez.** Consertado na 5A: ver a seção dela e
  `DECISOES.md#d43`.

## Dívidas conhecidas

Nenhuma delas bloqueia o próximo passo. Estão aqui para não serem redescobertas.

| Dívida                                                                        | Onde                             | Quando resolver                                                                   |
| ----------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Verificação visual só no desktop e só no tema escuro                          | —                                | **Spec 005, sessão 5B**: falta o tema claro (que é o padrão) e o celular          |
| Regras publicadas, mas nunca exercitadas por um cliente real                  | `firestore.rules`                | **Spec 005, sessão 5B**, passo 1: é lá que a regra é de fato testada              |
| Acesso concedido por script, sem cadastro self-serve                          | `scripts/conceder-acesso.mjs`    | Segundo cliente pagante, junto de D10 (`DECISOES.md#d16`)                         |
| `sair()` não limpa o cache do IndexedDB                                       | `src/providers/AuthProvider.tsx` | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento       |
| Agregados incrementados no cliente                                            | `src/lib/firebase/mutations/`    | Segundo cliente pagante (`DECISOES.md#d10`)                                       |
| Configuração aberta sem rede e sem cache diz "valores sugeridos"              | `TelaConfiguracao.tsx`           | Não tem conserto: cache vazio não distingue "não existe" de "não sei" (`#d43`)    |
| Agregado do mês pode ficar torto se um delta se perder no caminho             | `mutations/agregado.ts`          | Tem escape: "Recalcular o mês" na tela. A troca real é a mesma de D10             |
| Mudar um lançamento de mês não move o espelho da meta do mês destino          | `mutations/transacoes.ts`        | Mesmo escape e mesma troca: `DECISOES.md#d29`                                     |
| Produto revertido sobra zerado no agregado até recalcular                     | `mutations/agregado.ts`          | `produtosOrdenados` o esconde na leitura; recalcular limpa (`#d37`)               |
| `ultimoPedidoEm` do cliente não volta atrás ao desfazer um pagamento          | `mutations/clientes.ts`          | Só com histórico de pagamentos, que não existe (`#d37`)                           |
| Cliente ainda não tem tela: os agregados dele andam e ninguém os lê           | `mutations/clientes.ts`          | Quando "quem mais compra de mim" virar pergunta real (`#d35`)                     |
| Meta não guarda histórico: reescrever o alvo apaga o anterior                 | `mutations/metas.ts`             | Se "que meta eu tinha antes" virar pergunta real (`DECISOES.md#d27`)              |
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue                 | `src/lib/types/fichas.ts`        | Se "produto fora de linha" virar diferente de "arquivado"                         |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g                    | `FormularioFicha.tsx`            | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor             |
| `Bloco` e `BlocoConfiguracao` continuam primos                                | `src/components/`                | Se a configuração precisar do mesmo bloco; hoje ela tem rodapé próprio            |
| `/pedidos` carrega todo pedido não arquivado, sem recorte de data             | `ListaPedidos.tsx`               | Quando o primeiro ano de pedidos pesar: vira range sobre `dataEntregaISO`         |
| Não dá para arquivar uma cliente: só cadastrar e editar, de dentro do pedido  | `mutations/clientes.ts`          | Junto da tela de clientes, quando ela existir (`DECISOES.md#d35`)                 |
| Editar um pedido e sair sem salvar descarta em silêncio                       | `FormularioPedido.tsx`           | Mesma dívida do editor de ficha e da configuração; se acontecer de verdade        |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`              | `src/lib/types/configuracao.ts`  | Quando algum leitor precisar do nome: hoje ninguém lê esse campo                  |
| Sair da configuração com alteração pendente descarta em silêncio              | `TelaConfiguracao.tsx`           | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual            |
| Dois toques no mesmo quadro na lista de compras podem perder uma marca        | `ListaDoMercado.tsx`             | Se acontecer: `comprado` sai do array e vira mapa por `insumoId` (`#d40`)         |
| Estoque continua sendo número digitado: comprar não o movimenta               | `mutations/listasCompra.ts`      | Nunca por baixa automática; se houver caso, nasce com contagem periódica          |
| A rota, a tela da nota e a gravação em lote não têm teste automatizado        | `api/nota/`, `components/notas/` | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador         |
| Cadastrar a nota espera o servidor: sem rede o botão fica preso em carregando | `TelaNota.tsx`                   | Não incomoda hoje — a tela já exigiu rede para ler (`#d50`); se incomodar, `#d40` |
| O cache de CNPJ vive na memória do processo e morre no reinício               | `api/nota/route.ts`              | Só se a cota de 3/min por IP apertar, que é o dia do segundo cliente (`#d52`)     |
| Reler uma nota exige fotografar de novo: a imagem não é guardada              | `api/nota/route.ts`              | Se "ver a nota do mês passado" virar pergunta real, nasce com Storage (`#d49`)    |
| A 6A rodou antes da 5B, contra a dependência declarada na spec 006            | —                                | Some quando a 5B rodar; até lá, defeito em `insumos` tem duas origens possíveis   |
