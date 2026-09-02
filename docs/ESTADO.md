# Estado do projeto

Atualizado em 2026-09-02 (sessão 4A). **Toda sessão atualiza este arquivo antes de
encerrar.**

## Onde estamos

Módulo 1 entregue, o refactor de contas (`specs/000-contas.md`) executado por cima dele, o
Módulo 2 fechado (2A entregou `/configuracao`, 2B entregou a ficha técnica com a calculadora
de preço) e a **sessão 4A do Módulo 4 entregue**: coleção `transacoes`, agregado mensal e a
tela `/financeiro`. Portão de conclusão passando: lint limpo, typecheck limpo (app e service
worker), 102 testes, build com 11 rotas estáticas mais `/fichas/[id]` dinâmica e service
worker gerado.

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

| #   | Módulo                                      | Estado                        | Spec                        |
| --- | ------------------------------------------- | ----------------------------- | --------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                        | —                           |
| 1   | Insumos e embalagens                        | pronto                        | —                           |
| —   | Contas e tenancy                            | pronto                        | `specs/000-contas.md`       |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)              | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | não especificado              | —                           |
| 4   | Caixa, metas e previsão                     | **4A pronta, 4B é a próxima** | `specs/004-caixa.md`        |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas já inserido antes do 2 pelo
motivo registrado em `DECISOES.md#d01`. A spec do Módulo 4 está dividida em duas sessões:
`4A` caixa (entregue) e `4B` metas e previsão (próxima).

Por vir antes do 3, o Módulo 4 alimenta só metade de `ResumoMensal` — a metade da transação.
A metade do pedido (`qtdPedidos`, `ticketMedio`, `produtos`) fica em zero e **não pode
aparecer na interface**, porque zero ali é ausência e não resultado. A spec traz a tabela de
qual campo é de quem.

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

Da 4A, o que só o navegador responde:

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

Depois disso, a **sessão 4B** de `specs/004-caixa.md`: coleção `metas`, o espelho
`ResumoMensal.meta`, o bloco de meta em `/financeiro`, o cartão na tela Hoje e
`src/lib/domain/metas.ts`.

O que a 4B herda da 4A e precisa saber antes de começar:

- `ResumoMensal.meta.realizado` é a mesma coisa que `entradas`, e é a segunda fonte de
  verdade do módulo. Ela muda nos mesmos quatro pontos em que `entradas` muda — criar,
  editar, arquivar e recalcular —, e todos os quatro já existem em
  `src/lib/firebase/mutations/transacoes.ts`. Um caminho só.
- **`recalcularMes` precisa passar a reescrever o espelho da meta junto**, e hoje ele nem
  lista `meta` em `mergeFields` — de propósito, para não apagar o que a 4B ainda vai criar.
- `diasNoMes` já existe em `src/lib/domain/datas.ts`, com teste, e é o que `semanasNoMes`
  pede.
- `precoMedioUnitario` vem da média de `precificacao.precoVenda` das fichas ativas, que a
  consulta de `/fichas` já traz.

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
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue          | `src/lib/types/fichas.ts`        | No Módulo 3, se "produto fora de linha" virar diferente de "arquivado"      |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g             | `FormularioFicha.tsx`            | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor       |
| `BlocoFicha` e `BlocoConfiguracao` são primos                          | `src/components/`                | No terceiro caso, viram um primitivo em `components/ui`                     |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`       | `src/lib/types/configuracao.ts`  | Quando algum leitor precisar do nome: hoje ninguém lê esse campo            |
| Sair da configuração com alteração pendente descarta em silêncio       | `TelaConfiguracao.tsx`           | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual      |
