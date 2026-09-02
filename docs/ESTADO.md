# Estado do projeto

Atualizado em 2026-09-02 (sessão 4B). **Toda sessão atualiza este arquivo antes de
encerrar.**

## Onde estamos

Módulo 1 entregue, o refactor de contas (`specs/000-contas.md`) executado por cima dele, o
Módulo 2 fechado (2A entregou `/configuracao`, 2B entregou a ficha técnica com a calculadora
de preço) e o **Módulo 4 fechado**: a 4A entregou a coleção `transacoes`, o agregado mensal e
a tela `/financeiro`; a 4B entregou a coleção `metas`, o espelho no agregado, o bloco de meta
no painel e o cartão da tela Hoje. Portão de conclusão passando: lint limpo, typecheck limpo
(app e service worker), 137 testes, build com 11 rotas estáticas mais `/fichas/[id]` dinâmica
e service worker gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras publicadas,
chave de conta de serviço no disco (fora do git, coberta por `*firebase-adminsdk*.json`).
**Os índices estão todos publicados**: a sessão 4A rodou
`firebase deploy --only firestore:indexes` e levou junto o de `fichas`, que estava pendente
desde a 2B. Confirmado com `firebase firestore:indexes`: `insumos`, `fichas` e `transacoes`.

A conta existe e o acesso foi concedido de ponta a ponta, com o script rodando contra o
projeto de verdade:

```
contas/mycookies  { nome: "MyCookie's", proprietaria: "Maynara", criadaEm, v: 1 }
claim de fcbfilipesantos@gmail.com  { contas: { mycookies: "DONA" } }
```

`proprietaria` é do negócio, não do login: é o nome que a saudação da tela Hoje mostra.
Para trocar, `npm run conceder-acesso -- <email> mycookies "MyCookie's" <NomeNovo>` — o
script atualiza os campos quando a conta já existe.

Falta a verificação visual em navegador, que nunca foi feita.

## Módulos

| #   | Módulo                                      | Estado                           | Spec                        |
| --- | ------------------------------------------- | -------------------------------- | --------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                           | —                           |
| 1   | Insumos e embalagens                        | pronto                           | —                           |
| —   | Contas e tenancy                            | pronto                           | `specs/000-contas.md`       |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)                 | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | **especificado: 3A é a próxima** | `specs/003-pedidos.md`      |
| 4   | Caixa, metas e previsão                     | pronto (4A e 4B)                 | `specs/004-caixa.md`        |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas já inserido antes do 2 pelo
motivo registrado em `DECISOES.md#d01`. A spec do Módulo 4 estava dividida em duas sessões:
`4A` caixa e `4B` metas e previsão, as duas entregues.

Por vir antes do 3, o Módulo 4 alimenta só metade de `ResumoMensal` — a metade da transação,
mais o espelho da meta. A metade do pedido (`qtdPedidos`, `ticketMedio`, `produtos`,
`porDia[].pedidos`) fica em zero e **não pode aparecer na interface**, porque zero ali é
ausência e não resultado. A spec traz a tabela de qual campo é de quem.

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

## Próxima ação

**Ver tudo em navegador.** Os índices já estão publicados, então `npm run dev` basta.

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

Depois disso, o **Módulo 3**, especificado em `specs/003-pedidos.md` e dividido em três
sessões: `3A` o pedido e a agenda, `3B` do pedido ao caixa, `3C` a lista de compras. A 3A é a
próxima, e não encosta no caixa nem no agregado.

O que o Módulo 3 herda deste, e precisa saber antes de começar:

- **O mesmo documento de agregado é escrito pelos dois módulos.** `porDia[].pedidos`,
  `qtdPedidos`, `qtdItensVendidos`, `ticketMedio` e `produtos` esperam alimentação. O caminho
  já existe e é `aplicarNoAgregado` em `src/lib/firebase/mutations/transacoes.ts`.
- **O pedido pago cria a transação**, e `Pedido.transacaoId` existe para esse vínculo. O
  lançamento manual continua valendo para a venda de balcão que nunca virou pedido.
- **`recalcularMes` preserva `porDia[].pedidos`** lendo o agregado antes de reescrevê-lo
  (`DECISOES.md#d23`), e não encosta em `qtdPedidos`, `produtos` nem `custoInsumos`.
- **`Meta.pedidosNecessarios` e `ResumoMensal.ticketMedio` esperam o Módulo 3**, e hoje são
  zero que não aparece em tela (`DECISOES.md#d28`).

## Dívidas conhecidas

Nenhuma delas bloqueia o próximo passo. Estão aqui para não serem redescobertas.

| Dívida                                                                 | Onde                             | Quando resolver                                                             |
| ---------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Ícones só em SVG; falta PNG 180×180 para `apple-touch-icon` do iOS     | `public/icons/`                  | Antes do primeiro uso real no iPhone                                        |
| Nenhuma verificação visual em navegador foi feita                      | —                                | Agora: é a próxima ação, e a 4A acrescentou o que conferir                  |
| Regras publicadas, mas nunca exercitadas por um cliente real           | `firestore.rules`                | Na verificação em navegador: é lá que a regra é de fato testada             |
| Acesso concedido por script, sem cadastro self-serve                   | `scripts/conceder-acesso.mjs`    | Segundo cliente pagante, junto de D10 (`DECISOES.md#d16`)                   |
| `sair()` não limpa o cache do IndexedDB                                | `src/providers/AuthProvider.tsx` | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento |
| Agregados incrementados no cliente                                     | `src/lib/firebase/mutations/`    | Segundo cliente pagante (`DECISOES.md#d10`)                                 |
| `@hookform/resolvers` instalado e não usado: a validação é `safeParse` | `package.json`                   | Se um segundo formulário pedir resolver; hoje removê-lo é a opção honesta   |
| Agregado do mês pode ficar torto se um delta se perder no caminho      | `mutations/transacoes.ts`        | Tem escape: "Recalcular o mês" na tela. A troca real é a mesma de D10       |
| Mudar um lançamento de mês não move o espelho da meta do mês destino   | `mutations/transacoes.ts`        | Mesmo escape e mesma troca: `DECISOES.md#d29`                               |
| Meta não guarda histórico: reescrever o alvo apaga o anterior          | `mutations/metas.ts`             | Se "que meta eu tinha antes" virar pergunta real (`DECISOES.md#d27`)        |
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue          | `src/lib/types/fichas.ts`        | No Módulo 3, se "produto fora de linha" virar diferente de "arquivado"      |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g             | `FormularioFicha.tsx`            | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor       |
| `BlocoFicha` e `BlocoConfiguracao` são primos                          | `src/components/`                | No terceiro caso, viram um primitivo em `components/ui`                     |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`       | `src/lib/types/configuracao.ts`  | Quando algum leitor precisar do nome: hoje ninguém lê esse campo            |
| Sair da configuração com alteração pendente descarta em silêncio       | `TelaConfiguracao.tsx`           | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual      |
