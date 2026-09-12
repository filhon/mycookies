# Estado do projeto

Atualizado em 2026-09-12 (5B fechada e deploy feito; specs 015 e 016 executadas, roteiros por rodar).
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
sessões — `5A` conserta o que impede o primeiro uso, `5B` faz a verificação em navegador. **As
duas estão entregues.** A 5A fez a configuração poder ser salva na primeira vez, deu ícone de
verdade ao iPhone e tirou a dependência morta do pacote. **A 5B foi dada como fechada em
2026-09-12** por quem conduz o projeto: a passagem em navegador rodou, e com ela caiu a dívida
mais antiga do projeto. Os roteiros de navegador que as specs 3A a 14B foram acumulando eram o
que a 5B carregava; ficam fora deste arquivo a partir daqui — o que sobrar deles reaparece como
relato de uso, e não como pendência de spec.

**O app está publicado.** O deploy no Vercel (`docs/DEPLOY.md`) foi feito, e o build da
hospedagem rodou de verdade; `FIREBASE_SERVICE_ACCOUNT` e a leitura de credencial que a
preparação deixou pronta saíram de hipótese conferida localmente.

A spec `006-nota-fiscal.md` está **entregue nas duas sessões**: a 6A fez a nota fotografada
virar uma lista conferível que cadastra os insumos de uma vez — a primeira vez que o projeto
tem servidor de verdade e fala com serviço externo —, e a **6B ligou a compra ao caixa**, com a
guarda contra lançar a mesma nota duas vezes. A **6C não foi precisa**: nada da 6B sobrou.

A spec `007-estoque.md` está **entregue nas duas sessões**: a 7A deu idade ao número
(`Insumo.estoqueContadoEmISO`), criou `src/lib/domain/estoque.ts` com o prazo da contagem e a
tela `/insumos/contagem`; a **7B fez a lista parar de confiar em número velho** — `montarLista`
recebe `hojeISO` e não desconta contagem vencida, `/compras` diz o que está fazendo, e a compra
**propõe** a contagem com os campos semeados em vez de fingir escrevê-la. A **7C não foi
precisa**: nada da 7B sobrou.

A spec `008-onboarding.md` está **entregue nas duas sessões**: o sistema passou a se apresentar.
A 8A fez a espinha — os cinco passos em `src/lib/domain/onboarding.ts`, o cartão deles abrindo a
tela Hoje enquanto o caminho corre, `/comecar` como o mapa que fica, e terminar virando um ato
dela gravado em `Conta.primeirosPassosEm` —, e de carona a tela de login ganhou recuperação de
senha. A **8B pendurou o guia que fica** em `/comecar`, abaixo dos cinco passos: a cadeia do
dinheiro, as três telas que não cabem no menu de baixo, o que acontece sem internet e o convite
para instalar na tela de início. A **8C fica reservada** para o que a usuária 0 perguntar
operando.

A spec `009-teclado-e-barra.md` está **entregue**, e ela é a primeira coisa que a operação real
devolveu — conserto de cromo, sem módulo de domínio, sem rota e sem campo novo. Com o teclado
aberto no celular, as faixas fixas somem ou encolhem (a variante `apertado`), os seis rodapés
fixos passaram a compartilhar `RodapeFixo`, e a barra do sistema do app instalado ficou vinho
nos dois temas. **Os dois roteiros de aceite dela dependem de aparelho**: o A precisa de um
Android na mão, e o B, agora que o deploy existe, de desinstalar e reinstalar o app.

A spec `010-resumo-no-whatsapp.md` está **entregue**, e é a segunda coisa que a operação real
devolveu: o pedido para de ser digitado duas vezes. Um módulo puro (`domain/whatsapp.ts`), um
bloco no editor de pedido e um link `wa.me` — nenhum campo novo, nenhuma rota, nenhuma escrita,
nenhuma linha em `src/lib/firebase/`. O roteiro de aparelho dela — seis passos que só o celular
e o WhatsApp instalado respondem — fica por conta do uso real.

A spec `011-caixa-que-nao-perde-conta.md` está **entregue**, e é a terceira coisa que a operação
real devolveu — e a primeira que era perda de dado. As mutações do caixa esperavam cada escrita
do Firestore antes da seguinte, e sem rede a execução parava na primeira: o `increment` do
agregado nunca chegava a ser enfileirado, e a parcela do mês morria com a aba. Agora elas
despacham e não esperam (`#d80`), e a `/financeiro` confere o agregado contra a lista de
lançamentos e avisa quando eles discordam (`#d81`). **O estrago já feito não se conserta
sozinho**: cada mês que o aviso acusar precisa de um "Recalcular o mês" com rede, e setembro de
2026 é o mês da captura.

A spec `012-entregas-a-pagar.md` está **entregue**, e é a quarta coisa que a operação real
devolveu — desta vez não é conserto, é dado que nunca foi pedido. A taxa de entrega já entrava
no caixa quando o pedido era pago; o que **saía** para o entregador, uma vez por semana, não
passava por lugar nenhum, e o resultado do mês ficava alto por causa disso. Agora `/pedidos` tem
a faixa "Entregas a pagar", o acerto vira uma saída em `ENTREGA` no caixa, e desfazer devolve
tudo.

A spec `013-a-fornada.md` está **entregue nas quatro sessões**: a **13A** fez a fornada existir
como fato do sistema, descontando a despensa na leitura sem tocar na contagem, e a lista de
compras deixou de comprar o que já foi assado para o pedido; a **13B** respondeu quantas fornadas
dá, em `/fichas` e na linha de cada item do pedido, sobre a despensa de hoje e já descontando o
que os outros pedidos fechados prometeram; a **13C** fez a previsão de compras deixar de depender
de haver pedido (`FichaTecnica.fornadasMinimas`, a reserva na lista e o cartão da tela Hoje); e a
**13D** respondeu "quantas já estão feitas": `FichaTecnica.estoqueProntoAtual` e
`estoqueProntoContadoEmISO` são a contagem do pote, `/fichas/contagem` é a irmã de
`/insumos/contagem`, a fornada **propõe** essa contagem em vez de gravá-la, e `/fichas` e a
linha do pedido dizem a resposta completa, `prontos + despensa − prometido`. **A 13D rodou antes
do prazo que a spec deu** (duas ou três semanas de 13B em uso), por decisão de quem conduz o
projeto, e com o dado do `#d93` na mão; o registro está em `#d97`. Fica a `13E` reservada. Das
quatro aprovações da spec, todas foram usadas: a coleção `fornadas`, o índice (publicado) e a
mudança de comportamento de `montarLista` na 13A; os três campos novos em `FichaTecnica`, um
na 13C e dois na 13D, todos opcionais. Uma rota nasceu, `/fichas/contagem`, que a spec não
tinha previsto porque a 13D estava reservada. Regra de segurança não mudou, e nenhuma
dependência entrou.

A spec `014-combo-a-escolha.md` está **entregue nas duas sessões**: a **14A** fez o combo
existir como produto — o kit ganhou `escolhas[]` por categoria e `custoEscolhas` pela opção
mais cara, a linha do pedido ganhou a escolha inline com `escolhas[]` gravadas e o custo do
combo montado em `custoUnitarioSnapshot`, o WhatsApp e `/pedidos` dizem a escolha entre
parênteses, e `explodirDemanda` explode o que foi escolhido. Três campos aditivos, nenhuma
rota, nenhum índice, nenhuma dependência, regra de segurança intacta; `derivarPedido`,
`deltaDoPedido` e `agregarPedidos` não mudaram uma linha. A **14B fez o combo produzir**:
a linha do combo no pedido diz "dá?" uma vez por receita escolhida, "Registrar fornada"
oferece as receitas escolhidas com `escolha × quantidade`, `reservadoNoPronto` dá dono no
pote da receita escolhida, e `capacidadeDaFicha`, `reservaDeProducao` e `fichasAbaixoDoPiso`
pulam o kit com escolhas — nenhum campo, nenhuma mutação, nenhuma rota.

A spec `015-salvar-no-toque.md` está **entregue**, e fecha a dívida que a 011 deixou com prazo:
a regra do `#d80` passou a valer para `src/lib/firebase/mutations/` inteiro (`#d104`). As cinco
mutações que ainda esperavam a escrita do Firestore — `insumos`, `fichas`, `listasCompra`,
`metas` e `configuracao` — despacham, `estoque` foi de carona, e `criarInsumo`, `criarFicha` e
`criarListaCompras` geram o id no aparelho. As duas exceções, `recalcularMes` e `importarNota`,
estão nomeadas em `despachar.ts` e comentadas no lugar. Nenhuma tela mudou, nenhum campo, nenhuma
rota, nenhum índice, nenhuma regra. **O roteiro de sete passos da spec, com a rede em Offline,
não rodou nesta sessão** — e é o único lugar onde a correção de `atualizarInsumo` (o selo de
custo desatualizado gravado sem sinal) e a de `salvarMeta` (o espelho da meta na tela Hoje) podem
ser vistas.

A spec `016-listas-que-crescem.md` está **entregue**: a varredura de toda consulta do sistema
virou a tabela do `#d105`, e a única que assinava "tudo" — a agenda de `/pedidos` — ganhou o
recorte dela. Três consultas em `mutations/pedidos.ts` (`consultaAgenda`,
`consultaEntreguesEmAberto`, `consultaHistorico`), `STATUS_NA_AGENDA` e `STATUS_CONCLUIDOS` em
`domain/pedido.ts` com o teste da partição, um índice novo em `pedidos` (`arquivado + status +
dataEntregaISO`, **publicado e confirmado**), e a tela: a agenda inteira em cima, o histórico
em páginas de 30 com "Mostrar mais antigos" embaixo, e as duas faixas somando conjuntos
completos. Nenhum campo, nenhuma rota, nenhuma regra, nenhuma dependência. Insumos e fichas não
paginam de propósito: são catálogo, e o recorte deles é o arquivo. **O roteiro de sete passos
não rodou nesta sessão** — e é o único lugar onde uma consulta pode ser vista pedindo índice.

Fora das specs, em 2026-09-11, `/comecar` foi relida contra as specs 009 a 014. Pelo `#d70` o
guia só ensina o que mora em tela que ela ainda não abriu, e o que faltava era uma só:
`/fichas/contagem` entrou em "O que mais tem aqui" como a quarta tela fora do menu ("O que está
pronto", com o momento da semana), e "Quando não tem internet" passou a listar registrar a
fornada. O WhatsApp, o acerto das entregas, o aviso do agregado e o combo moram em telas que ela
já abre, e ficam onde estão; a única cópia tocada fora de `/comecar` foi a explicação do tipo
"Kit" no editor de ficha, que agora diz que o kit também pode ser o combo em que a cliente
escolhe os sabores. Nenhum número de exemplo entrou.

Fora das specs, em 2026-09-11, o resumo do WhatsApp passou a dizer **como pagar**: `FormaPagamento.instrucoes` (texto livre em `/configuracao`, "Dados para pagar") entra na mensagem em parágrafo próprio enquanto o pedido não está pago (`#d98`). Nenhum dado bancário no código: **a conta real precisa preencher o campo na forma "Pix" uma vez.**

Fora das specs, o projeto foi **preparado para publicar no Vercel** em 2026-09-03: a
credencial do Admin SDK deixou de exigir um arquivo em disco, a falta dela parou de ser
confundida com login inválido, e `functions/` saiu do `tsconfig` da raiz — sem isso o build
da hospedagem falharia. O guia é `docs/DEPLOY.md`, e **o deploy está feito**.

As specs 006, 007 e 008 rodaram antes da 5B, contra a dependência que cada uma declarava na
abertura, por decisão de quem conduz o projeto. O risco que isso carregava — um defeito em
`insumos` ou em `fichas` com duas origens possíveis, e um guia mandando a usuária a um passo
nunca visto rodando — **fechou com a 5B**. O que ficou dele é uma linha na tabela de dívidas: a
releitura dos cinco textos de `src/lib/domain/onboarding.ts` contra o que a 5B viu, que a 8B
não pôde fazer na época.

Portão de conclusão passando: lint limpo, typecheck limpo (app e service worker), **491
testes**, e build com 17 rotas estáticas — `/insumos/nota` entrou na lista na 6A,
`/insumos/contagem` na 7A, `/comecar` na 8A e `/fichas/contagem` na 13D — mais `/api/nota`,
`/fichas/[id]` e `/pedidos/[id]` dinâmicas e service worker gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras publicadas,
chave de conta de serviço no disco (fora do git, coberta por `*firebase-adminsdk*.json`).
**Os índices estão todos publicados**: a 4A rodou `firebase deploy --only firestore:indexes`
e levou junto o de `fichas`, pendente desde a 2B; a 3A rodou de novo com os dois novos, a 3B
com o do pedido pago e a 3C com o da lista de compras. Confirmado com
`firebase firestore:indexes`: `insumos`, `fichas`, `transacoes`, `clientes` (`arquivado` +
`nomeBusca`), `listasCompra` (`arquivado` + `criadoEm` desc), `fornadas` (`arquivado` +
`dataISO` desc, publicado na 13A) e `pedidos` em três — `arquivado` + `dataEntregaISO` para a
tela Hoje e o horizonte de compras, `arquivado` + `competenciaPagamento` + `pagoEm` desc para
"Recalcular o mês", e `arquivado` + `status` + `dataEntregaISO` para a agenda e o histórico de
`/pedidos` (publicado na 016).

A conta existe e o acesso foi concedido de ponta a ponta, com o script rodando contra o
projeto de verdade:

```
contas/mycookies  { nome: "MyCookie's", proprietaria: "Maynara", criadaEm, v: 1 }
claim de fcbfilipesantos@gmail.com  { contas: { mycookies: "DONA" } }
```

`proprietaria` é do negócio, não do login: é o nome que a saudação da tela Hoje mostra.
Para trocar, `npm run conceder-acesso -- <email> mycookies "MyCookie's" <NomeNovo>` — o
script atualiza os campos quando a conta já existe.

A verificação visual está feita: a primeira rodada (desktop, tema escuro) corrigiu três coisas
— ver "O que a verificação visual já corrigiu" — e a 5B fechou o resto: tema claro, celular e
os números digitados de ponta a ponta.

## Módulos

| #   | Módulo                                      | Estado                              | Spec                                     |
| --- | ------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                              | —                                        |
| 1   | Insumos e embalagens                        | pronto                              | —                                        |
| —   | Contas e tenancy                            | pronto                              | `specs/000-contas.md`                    |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)                    | `specs/002-precificacao.md`              |
| 3   | Vendas, pedidos e lista de compras          | pronto (3A, 3B e 3C)                | `specs/003-pedidos.md`                   |
| 4   | Caixa, metas e previsão                     | pronto (4A e 4B)                    | `specs/004-caixa.md`                     |
| 5   | Prontidão: conserto e verificação           | pronto (5A e 5B)                    | `specs/005-prontidao.md`                 |
| 6   | Leitura de nota fiscal por IA               | pronto (6A e 6B)                    | `specs/006-nota-fiscal.md`               |
| 7   | Estoque com idade e contagem da despensa    | pronto (7A e 7B)                    | `specs/007-estoque.md`                   |
| 8   | Onboarding: o caminho das primeiras semanas | pronto (8A e 8B)                    | `specs/008-onboarding.md`                |
| —   | O teclado aberto e a barra do sistema       | pronto, sem os roteiros             | `specs/009-teclado-e-barra.md`           |
| —   | O resumo do pedido no WhatsApp              | pronto, sem o roteiro               | `specs/010-resumo-no-whatsapp.md`        |
| —   | O caixa que não perde a conta               | pronto, sem o roteiro               | `specs/011-caixa-que-nao-perde-conta.md` |
| —   | O acerto das entregas                       | pronto, sem o roteiro               | `specs/012-entregas-a-pagar.md`          |
| 13  | A fornada                                   | pronto (13A a 13D), sem os roteiros | `specs/013-a-fornada.md`                 |
| 14  | O combo à escolha                           | pronto (14A e 14B)                  | `specs/014-combo-a-escolha.md`           |
| 15  | Salvar no toque, no sistema inteiro         | pronto, sem o roteiro               | `specs/015-salvar-no-toque.md`           |
| 16  | As listas que crescem                       | pronto, sem o roteiro               | `specs/016-listas-que-crescem.md`        |

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

## O que a sessão 6B deixou pronto

A compra virando saída no caixa, que era a última metade da frase da spec 006.

- `src/lib/domain/notaFiscal.ts` ganhou o bloco do caixa, puro e testado:
  `lancamentoDaNota`, `chaveDaNota`, `descricaoDaCompra` e `categoriaDaCompra`, mais o tipo
  `LancamentoDaNota`. A categoria sai de `ehEmbalagem`, a mesma da ficha (`#d20`), e não de
  uma segunda tabela.
- `tests/domain/notaFiscal.test.ts`: **9 testes novos** (45 → 54, e 273 → 282 no total), com o
  caso de aceite da 6B número por número — os R$ 146,40 lançados contra os R$ 176,20 impressos,
  a chave `75315333000109-2026-09-02-17620`, a mesma nota com remoções diferentes devolvendo a
  **mesma chave e valores diferentes**, `EMBALAGEM` só quando toda linha mantida for embalagem,
  e os três jeitos de não haver chave (sem CNPJ, verificador torto, data fora do formato).
- `Transacao.notaChave?: string`, o campo opcional novo. **É a aprovação de schema que a spec
  pediu**, e ela é compatível: documento antigo sem o campo continua válido.
- `mutations/transacoes.ts`: `DadosTransacao.notaChave`, a chave escrita por **spread
  condicional** em `corpoDaTransacao` — chave ausente em `updateDoc` deixa o valor que está lá,
  e é isso que preserva a guarda quando ela corrige a descrição do lançamento em
  `/financeiro` —, e `buscarLancamentoDaNota`, a consulta por igualdade em um campo só.
- `mutations/notas.ts`: `importarNota` ganhou o terceiro parâmetro, o lançamento, e o faz
  **depois** do lote de insumos. `ResultadoImportacao.lancado` diz quanto foi para o caixa, ou
  `null` quando o bloco estava desligado.
- `src/components/notas/BlocoCaixa.tsx`: o bloco que nasce ligado e diz as duas metades da
  conta antes de lançar, mais a frase da guarda quando a nota já foi lançada.
- `TelaNota.tsx`: o CNPJ passou a viajar no cabeçalho (não é campo: ninguém digita CNPJ), a
  guarda é refeita quando a chave muda, e a etapa "pronto" diz quanto saiu do caixa.
- Decisões novas em `DECISOES.md#d53` a `#d55`.

Nenhum índice novo: a consulta é por um campo só, e o índice de campo único o Firestore cria
sozinho. Nenhuma regra de segurança mudou. Nenhuma dependência entrou.

Fora do escopo literal da spec, e por quê:

- **A chave usa o total impresso, e não a soma das linhas mantidas.** A spec diz "o total em
  centavos" e o exemplo dela (`…-17620`) é o impresso; ficou explícito porque a diferença é o
  que faz a guarda funcionar: na segunda leitura ela pode tirar linhas diferentes, e uma chave
  que se mexesse com isso não reconheceria a mesma nota. O teste interroga isso diretamente.
- **O bloco ligado é um par de estados, e não um booleano.** `lancamentoManual ?? duplicado ===
null`, o mesmo arranjo de `precoManual` (`#d21`). Um booleano teria que escolher entre
  desobedecer a ela e ignorar a guarda quando a data fosse corrigida depois. Motivo em `#d55`.
- **`custoTaxa: 0` explícito, e `formas` vazio.** Saída não passa por maquininha, e isso
  dispensa a tela de assinar `configuracao/geral` para gravar um zero.

**Confirmado em `metas.ts` antes de passar `null`**, como a spec exigia em vez de confiar na
frase dela: `espelhoAposDelta` move o espelho a partir de `parcelas.entradas`, e
`deltaDaTransacao` de uma saída tem `entradas` zerado. O espelho não se moveria de qualquer
jeito; `null` diz isso no lugar de depender da coincidência.

**O que a 6B não provou.** O mesmo de sempre: `npm test` cobre `src/lib/domain/`, então a
guarda, o bloco e a gravação da saída não têm teste automatizado. O roteiro em navegador da
spec continua sendo o que fecha isso, e o passo 7 — a mesma nota fotografada de dois ângulos —
é o único jeito de saber se a chave por CNPJ fecha com uma foto de verdade.

## O que a sessão 7A deixou pronto

O ciclo da contagem: abrir, ver o que tem e desde quando, digitar, salvar em uma escrita.
**A lista de compras não mudou de comportamento** — isso é a 7B.

- `src/lib/domain/estoque.ts`, módulo novo e puro: `frescorDaContagem` (os quatro estados),
  `contagemDoInsumo` (onde `VENCIDA` vira `quantidade: null`), `estoqueParaLista`,
  `rotuloDeIdade`, `sugestaoDaContagem`, `entradasDaNota`, `entradasDaLista`,
  `linhasParaContar`, `numeroContado` e `resumoDaContagem`, mais `IDADE_FRESCA_DIAS` (7) e
  `IDADE_VENCE_DIAS` (30), exportados porque a tela também os diz.
- `datas.ts` ganhou `diasEntre(deISO, ateISO)`, que era a peça que faltava lá. Arredonda em vez
  de truncar por causa do dia de 23 ou 25 horas do horário de verão.
- `tests/domain/estoque.test.ts`: **32 testes** com o caso de aceite da spec linha por linha —
  os cinco insumos da 3C, farinha 620, chocolate 0, manteiga 480, saquinho 50, caixa intocada, e
  o rodapé em "4 de 5 contados · 1 zerado" —, as quatro bordas de idade (7, 8, 30 e 31 dias,
  mais a ausência e a data no futuro) e as quatro regras de `sugestaoDaContagem`, inclusive a de
  hoje, que não soma. Mais `diasEntre` em `datas.test.ts`, com a virada de mês e de ano.
- **Schema:** `Insumo.estoqueContadoEmISO?: DataISO` nasceu e `Insumo.estoqueMinimo` **saiu** —
  do tipo, do `esquemaInsumo`, do `DadosInsumo`, das duas montagens de documento e do selo.
  Nenhum documento tinha valor real ali, então não houve migração.
- `src/lib/firebase/mutations/estoque.ts`, com `salvarContagem`: um `writeBatch` que grava
  `{ v, estoqueAtual, estoqueContadoEmISO, atualizadoEm }` e **nada mais**. Não passa por
  `corpoDeAtualizacao` e não marca ficha nenhuma.
- `src/components/estoque/`: `TelaContagem` (a página), `LinhaContagem` (o campo nascendo vazio,
  com a referência do número velho embaixo do nome), `RodapeContagem` (o quinto rodapé fixo do
  sistema) e `EntradaContagem` (o atalho, que a 7B reusa na nota e no fechamento da lista).
- Rota `/insumos/contagem`, alcançada pelo cabeçalho de `/compras` — **inclusive quando não há
  lista**, porque domingo à noite sem pedido confirmado é exatamente quando ela conta.
- `LinhaInsumo` perdeu `estoqueBaixo` e ganhou o selo **"Contagem vencida"**, que é uma
  afirmação verificável sobre um número que existe.
- Decisões novas em `DECISOES.md#d56` a `#d62` — as sete primeiras da abertura da spec 007.

Duas aprovações da spec foram usadas, e a terceira **não**: o campo novo e a remoção de
`estoqueMinimo` estão feitos; a mudança de comportamento da lista de compras em dado já gravado
é da 7B e não aconteceu nesta sessão. Nenhuma dependência entrou, nenhuma regra de segurança
mudou e nenhum índice novo foi preciso: a tela de contagem usa a mesma consulta de `/insumos`.

Fora do escopo literal da spec, e por quê:

- **`sugestaoDaContagem` não recebe `hojeISO`.** A tabela da spec pede três parâmetros, e o
  terceiro seria uma segunda data para discordar da primeira: `ContagemDoInsumo` já foi lida
  contra hoje e carrega `idadeEmDias`, que é o que a regra de "contagem de hoje não soma"
  consulta.
- **`contagemDoInsumo` trata data sem número como `NUNCA`.** O formulário de insumo pode apagar
  o estoque e carregar a data adiante; sem número não há o que datar. Está em `#d58`.
- **O selo de `/insumos` foi trocado nesta sessão**, e não na 7B. A remoção de `estoqueMinimo` é
  da 7A, e deixar o selo morrer entre uma sessão e outra seria uma regressão de propósito. A
  linha mais rica — contagem, idade e o número — continua sendo da 7B.
- **`FormularioInsumo` repõe `estoqueContadoEmISO` ao salvar.** Não é um campo da tela: é o que
  impede que editar o preço ali apague a idade do estoque, porque `corpoDeAtualizacao` grava
  `null` para todo campo ausente.
- **A dica do campo "Estoque atual"** passou a apontar para a tela de contagem. Ele continua
  existindo, e agora é o caminho secundário.

**O que a 7A não provou.** `npm test` cobre `src/lib/domain/`, então a tela, o lote e o selo não
têm teste automatizado — e desta vez nem a porta de uma rota foi exercitada, porque não há rota
nova de servidor. Tudo o que depende de o número sair do teclado, passar pelo Firestore e voltar
está na lista de navegador, e vale rodar junto do roteiro da 7B.

## O que a sessão 7B deixou pronto

A lista parou de confiar em número velho, e a compra passou a propor a contagem.

- **`montarLista(demanda, insumos, hojeISO)`**, com uma linha trocada dentro:
  `estoqueParaLista(insumo, hojeISO)` no lugar de `Math.max(0, insumo.estoqueAtual ?? 0)`.
  Contagem vencida e contagem inexistente valem zero, e a lista compra a quantidade física
  inteira. Nenhum campo novo em `LinhaDaLista` nem em `ItemListaCompras`: `estoqueAtual` da
  linha passou a significar **o que foi descontado**, e o motivo mora no insumo vivo, que a
  tela tem na mão desde a 3C.
- **`src/lib/domain/corredores.ts`**, arquivo novo: `ORDEM_CATEGORIA_COMPRA`,
  `ROTULO_CORREDOR`, `compararParaOMercado` e `agruparPorCorredor` saíram de `listaCompras.ts`.
  `estoque.ts` já importava o agrupamento e `listaCompras.ts` passou a importar
  `estoqueParaLista`: os dois onde estavam fechariam um ciclo. Quatro imports mudaram de
  caminho, e nenhuma linha de lógica.
- **`estoque.ts` ganhou `procedenciaDaSugestao` e `textoContado`**, mais o tipo
  `OrigemDaEntrada`. A primeira é a frase que diz de onde a sugestão saiu, nos três casos; a
  segunda é o inverso de `numeroContado`, com o arredondamento em três casas que apara a
  sujeira de ponto flutuante de `paraBase`.
- **Três frases em `/compras`**, cada uma com o gatilho próprio: o bloco da contagem vencida ou
  ausente, com quantos insumos são, os nomes deles e o atalho para contar; a idade na linha,
  sem alarme quando está só envelhecendo e com ícone quando o número **não** foi descontado; e
  a frase da lista desatualizada, medida em `quantidadePacotes` e apagando-se sozinha depois de
  "Refazer".
- **`src/lib/estado/sementeDaContagem.ts`**, o estado de navegação que leva a semente de
  `/insumos/nota` e de `/compras` até `/insumos/contagem` sem passar pela URL.
- **A nota oferece a contagem** na etapa "pronto", com "Guardar na despensa" como ação
  primária; **fechar a lista também**, com "Fechar e guardar na despensa" no bloco de
  confirmação, semeada pelo que foi marcado como comprado.
- **`importarNota` devolve `insumoIds`**, o id que cada linha tocou na ordem em que chegaram.
  Sem ele, o insumo que nasce na própria nota não teria endereço para ser semeado.
- **`TelaContagem` consome a semente** uma vez, quando as linhas chegam, e cada linha semeada
  diz a procedência enquanto o campo continuar sendo o que a compra propôs.
- **`LinhaInsumo` mostra a contagem e a idade** acima do selo "Contagem vencida", que continua
  com ícone e texto. **`LinhaJaTem` diz desde quando** ela tem o que tem.
- Testes: **335** (318 → 335). Os três cenários do caso de aceite — R$ 120,00 fresca,
  R$ 120,00 envelhecendo, R$ 150,00 vencida —, mais o cenário sem data nenhuma nos mesmos
  R$ 150,00, a farinha em R$ 12,50 nos quatro, o saquinho saindo do bloco "Não precisa comprar"
  a R$ 30,00, as bordas de 30 e 31 dias vistas de dentro da lista, e os cinco números da tabela
  da nota com a frase de procedência de cada um.
- Decisões novas em `DECISOES.md#d63` e `#d64` — as duas que a spec reservava para esta sessão.

A terceira aprovação da spec foi usada: **a lista de compras muda de comportamento em dado já
gravado**, e o carrinho da primeira lista depois desta sessão cresce. Não há script de migração
e não deve haver — não existe data honesta para o estoque já gravado. Nenhuma dependência
entrou, nenhuma regra de segurança mudou, nenhum índice novo foi preciso e o schema do
Firestore não mudou: `insumoIds` é retorno de função, e não campo de documento.

Fora do escopo literal da spec, e por quê:

- **`domain/corredores.ts`.** A spec não pede o arquivo; ela pede o import que fecharia o ciclo.
  A ordem do corredor não é propriedade da lista nem do estoque — é de quem empurra o carrinho.
  Motivo em `#d63`.
- **A frase da lista desatualizada não jura que foi a contagem.** A spec dá a frase
  "Você contou a despensa depois de montar esta lista"; a comparação que a mesma spec manda
  usar (`quantidadePacotes`) também dispara com pedido confirmado agora e com pacote de tamanho
  diferente. A frase nomeia a contagem primeiro e lista as outras duas, em vez de afirmar uma
  só. Registrado em `#d63` e na tabela de dívidas.
- **"Fechar e guardar na despensa" fecha a lista junto.** A spec diz que o bloco de confirmação
  ganha a ação; guardar sem fechar deixaria a lista aberta com tudo marcado, que é o estado que
  a `#d39` existe para não acontecer. Quando nada foi marcado, o botão não aparece e o bloco é
  o de antes.
- **O bloco da contagem ausente diz os nomes**, e não só quantos são. "3 insumos estão sem
  contagem recente" sem dizer quais é um número que ela não tem como conferir — e são os nomes
  que dizem se vale a pena andar até a despensa agora.
- **`LinhaInsumo` diz "nunca contada"** em insumo que nunca teve estoque. É ruído em conta
  nova, e é o único lugar do sistema que responde "de quantos eu não sei nada".

**O que a 7B não provou.** O mesmo de sempre, e desta vez é mais: `npm test` cobre
`src/lib/domain/`, então as três frases de `/compras`, a semente atravessando a navegação, a
etapa "pronto" da nota e o bloco de fechar a lista não têm teste automatizado. O roteiro em
navegador ao fim da spec 007 é quem fecha isso, e o **passo 1 — abrir `/compras` com o estoque
de antes desta spec e ver o carrinho crescer** — vale rodar antes de a sessão ser considerada
fechada, e não depois: é a decisão `#d63` acontecendo sobre dado real.

## O que a sessão 8A deixou pronto

A espinha do onboarding: os cinco passos, o estado deles, e o fim do caminho como um ato dela.
**Nenhuma tela mudou de comportamento** — esta é a primeira sessão do projeto que não move um
centavo.

- `src/lib/domain/onboarding.ts`, módulo novo e puro: `CATALOGO_DO_COMECO` (os cinco passos com
  título, o `porque`, o `oQueEsperar`, o destino e o rótulo da ação), `passosDoComeco`,
  `proximoPasso` e `progressoDoComeco`, mais os tipos `EstadoPasso`, `IdPasso`, `FatosDoComeco`,
  `PassoDoComeco` e `PassoBase`. Os rótulos moram no domínio pelo mesmo motivo que
  `ROTULO_CORREDOR`: duas telas os mostram, e duas cópias da mesma frase divergem.
- `tests/domain/onboarding.test.ts`: **15 testes** (335 → 350) com o caso de aceite da spec
  estado por estado — 0 de 5 até 5 de 5, com o destino de cada passo de agora —, o caso fora de
  ordem (`[AGORA, FEITO, DEPOIS, DEPOIS, DEPOIS]` com o insumo antes da configuração), a conta
  concluída sem próximo passo, e **as 32 combinações dos cinco fatos** conferindo que nunca há
  dois `AGORA`, que só falta `AGORA` quando os cinco estão feitos, e que `FEITO` cai exatamente
  onde o fato está.
- **Schema:** `Conta.primeirosPassosEm?: Timestamp`, o campo opcional novo. É a aprovação de
  schema que a spec pediu, e é compatível: documento antigo sem o campo continua válido, não há
  esquema `zod` de `Conta` para acompanhar, e nenhuma migração é necessária.
- `src/lib/firebase/mutations/conta.ts`, arquivo novo com uma função — `concluirPrimeirosPassos`,
  um `updateDoc` com `{ v, primeirosPassosEm: Timestamp.now() }`. **É a primeira escrita do
  aplicativo no documento da conta**, que até aqui só nascia pelo script `conceder-acesso.mjs`.
- `src/lib/hooks/useComeco.ts`: as cinco assinaturas da `#d67` — o documento da configuração
  pelo id e quatro consultas de `arquivado == false` com `limit(1)` —, todas memoizadas e
  **todas `null` quando o caminho já terminou**, e também enquanto o documento da conta não
  chegou.
- `src/components/comecar/`: `CartaoPrimeirosPassos` (o cartão da tela Hoje, com um passo por
  vez e o estado de fechamento), `TelaComecar` (o mapa dos cinco), `BlocoPasso` (um por passo,
  sanfona no celular e cinco abertos no desktop) e `Trilha` (os cinco segmentos e o selo de
  estado com ícone e palavra).
- Rota `/comecar`, estática como as outras, **fora da navegação inferior**. As duas entradas
  permanentes: **"Como funciona"** no pé da barra lateral, acima de Configuração, e o link no pé
  de `/configuracao`, que é a entrada do celular.
- O cartão fica **acima do `CartaoMetaHoje`** em `(app)/page.tsx` enquanto existir. Quando o
  caminho termina, ele some e a tela Hoje volta a ser exatamente o que era.
- **Carona: a senha esquecida.** `(auth)/login` ganhou "Esqueci minha senha", com
  `sendPasswordResetEmail` do SDK já instalado, uma frase de retorno que é a mesma existindo ou
  não o cadastro, e os códigos traduzidos no mesmo mapa `MENSAGENS` do `AuthProvider`. Era a
  única falha do produto que a usuária não contornava por dentro dele.
- Decisões novas em `DECISOES.md#d65` a `#d69` — as cinco primeiras da abertura da spec 008.

As três aprovações da spec foram usadas: o campo novo em `Conta`, a recuperação de senha na tela
de login, e a rota nova com o item novo no cromo. Nenhuma dependência entrou, nenhuma regra de
segurança mudou e nenhum índice novo foi preciso: as quatro consultas são de campo único, que o
Firestore indexa sozinho.

Fora do escopo literal da spec, e por quê:

- **`CATALOGO_DO_COMECO` é exportado.** Com o caminho encerrado, as cinco perguntas deixam de
  ser feitas, e `/comecar` precisa dos cinco passos **sem estado** para continuar sendo
  referência. A alternativa era a página ler estados derivados de "não perguntei nada" e fingir
  que são a verdade.
- **As duas entradas permanentes entraram aqui, e não na 8B.** A spec as lista no escopo da 8B e
  as cobra no critério de aceite da 8A ("`/comecar` alcançável pela barra lateral e pelo pé de
  `/configuracao`"). Uma rota sem entrada nenhuma seria uma página que só existe para quem
  digita a URL.
- **O fechamento diz para onde o guia vai.** "Ao concluir, este cartão sai da tela Hoje. Os
  cinco passos continuam em Como funciona" — sem isso, o cartão sumiria no toque e viraria uma
  pergunta na semana seguinte.

**O que a 8A não provou.** `npm test` cobre `src/lib/domain/`, então o cartão, a página, o
gancho e a escrita em `contas/{contaId}` não têm teste automatizado — e nenhum dos quatro
portões toca o Firestore. O que só o navegador responde está no roteiro abaixo.

## O que a sessão 8B deixou pronto

O guia que fica. **Nenhum estado novo, nenhuma escrita nova, nenhum campo novo** — a 8B é a
segunda sessão seguida que não move um centavo, e a única do projeto inteiro que não toca em
`src/lib/`. O que entrou foi conteúdo durável em `/comecar`, abaixo dos cinco passos, e daqui
para baixo nada depende da conta: as quatro seções renderizam antes de as cinco assinaturas
responderem, e continuam de pé depois de o caminho ser encerrado.

- `src/components/comecar/SecaoGuia.tsx`: o ritmo das quatro seções — título, uma frase de
  contexto e o respiro. **Não dá superfície a elas**: cada uma escolhe o próprio recipiente, ou
  dispensa recipiente nenhum, porque quatro caixas iguais empilhadas seriam a grade de cartões
  que o `DESIGN.md` recusa.
- `CadeiaDoDinheiro.tsx`: os seis elos em fio vertical — o que você compra, quanto custa cada
  grama, quanto custa o doce pronto, por quanto vale a pena vender, o que foi combinado com a
  cliente, o que de fato entrou no mês. Cada elo diz **quem o faz** (você preenche / o sistema
  calcula, com ícone e palavra) e leva para a tela onde ele mora. Nenhum número de exemplo.
- `OQueMaisTem.tsx`: as três de fora da navegação — `/compras`, `/insumos/nota` e
  `/insumos/contagem` —, cada uma com o que faz, **o momento da semana** em que serve e o link.
  O momento é o gatilho, e é o que nenhuma tela pode dizer sobre si mesma. A contagem carrega o
  motivo da `#d63` na voz dela: sem contar, o sistema prefere mandar comprar farinha de novo a
  deixá-la sem farinha no meio da fornada. A meta ganha o parágrafo do fim, e não um passo.
- `QuandoNaoTemInternet.tsx`: os quatro fatos que nenhuma tela tem onde repetir — o que continua
  funcionando, o selo "Sem conexão, salvando no aparelho" **mostrado como ele é** (o `Selo` de
  verdade, em amostra), a leitura de nota que exige rede e diz isso (`#d50`), e a tela nunca
  aberta que cai em `/offline`. Sem superfície: texto corrido com um ícone por parágrafo, para
  quebrar o ritmo das duas listas emolduradas acima.
- `InstalarNaTela.tsx`: o convite da `#d71`, e a **única das quatro seções que decide se
  existe** — ela carrega o próprio cabeçalho e devolve `null` com o app instalado, porque um
  título sem nada embaixo seria pior do que o convite repetido. A pergunta é
  `matchMedia('(display-mode: standalone)')` com `navigator.standalone` ao lado para o iPhone
  antigo; o texto sai de `matchMedia('(pointer: coarse)')`, e **nunca** de user-agent.
- `TelaComecar.tsx`: as quatro seções abaixo dos cinco passos, a descrição do cabeçalho refeita
  (a página deixou de ser só os cinco), e um `<h2>` de leitor de tela para a lista dos passos,
  que passou a ser a primeira de cinco seções em vez da página inteira.
- Decisões novas em `DECISOES.md#d70` e `#d71` — as duas que a spec reservava para esta sessão.

**O item 5 do escopo da 8B já estava feito**: "Como funciona" no pé da barra lateral e o link no
pé de `/configuracao` entraram na 8A, porque eram critério de aceite dela. Nada no cromo mudou
nesta sessão.

Nada de schema, de índice, de regra de segurança ou de dependência mudou, e nenhum teste foi
alterado: os **350 continuam os mesmos**, porque nada disto mora em `src/lib/domain/`.

Fora do escopo literal da spec, e por quê:

- **O conteúdo mora nos componentes, e não em `src/lib/domain/`.** Os cinco passos foram para o
  domínio porque duas telas mostram os mesmos rótulos e duas cópias divergiriam; aqui há uma
  tela só, e cópia sem regra atrás dela não é domínio. O motivo está em `#d70`.
- **Cada elo da cadeia diz quem o faz.** A spec pede "uma frase cada" e o nome da tela. O
  marcador de autor é adição, e ela paga: é o princípio 1 do `PRODUCT.md` dito onde ele importa
  — três elos ela preenche, três o sistema faz, e é isso que responde por que cadastrar o
  pacote de farinha resolve um problema de preço.
- **O selo do offline aparece de verdade, e não descrito.** A frase "o selo diz que está salvo
  no aparelho" obriga a reconhecer depois um objeto que ela nunca viu; a amostra é o próprio
  `Selo` com o texto exato de `SeloSincronizacao`, que é o que ela vai ver quando o sinal cair.
- **A seção de instalar carrega o próprio `SecaoGuia`.** É a assimetria que a condição da
  `#d71` exige, e está comentada no arquivo para que ninguém a "conserte" depois.

**O que a 8B não provou, e desta vez é o item mais importante da sessão.** O critério de aceite
pede a página inteira vista **no tema claro e em 360px, com captura arquivada** — o mesmo
protocolo da 5B, aplicado à tela que a 5B não viu porque ela não existia. **Isso não foi
feito**: `/comecar` é rota autenticada, o projeto não tem navegador dirigível instalado, e não
há diretório de capturas no repositório. O que foi conferido é o que o código responde — nenhuma
largura fixa, nenhum `nowrap`, nenhuma tabela, e as colunas de texto de todas as quatro seções
cabendo em 360px por cálculo, não por observação. Os dois critérios que dependem de olho —
a captura e o bloco de instalar sumindo com o app instalado nos dois sistemas — entram no
roteiro em navegador abaixo, junto do da 8A.

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

## A spec 006, entregue nas duas sessões

`specs/006-nota-fiscal.md` foi escrita em 2026-09-02: fotografar ou anexar a nota fiscal da
compra, conferir numa lista o que foi lido, e cadastrar os insumos de uma vez, com a compra
virando saída no caixa. **A 6A entregou tudo menos a última metade da frase, e a 6B entregou
essa metade.** A 6C, que a spec reservava para o que a 6B achasse e não coubesse nela, **não
foi precisa**.

As três aprovações que a spec pedia foram usadas: `firebase-admin` em `dependencies` e os dois
serviços externos na 6A, e `Transacao.notaChave?: string` na 6B — mudança compatível, documento
antigo sem o campo continua válido.

## A spec 007, entregue nas duas sessões

`specs/007-estoque.md` foi escrita em 2026-09-03 e nasce da dívida `Estoque continua sendo
número digitado`, que a 003 e a 006 já tinham deixado de fora com o mesmo argumento. Duas
sessões: a **7A** deu idade ao número (`Insumo.estoqueContadoEmISO`), criou
`src/lib/domain/estoque.ts` e a tela `/insumos/contagem`, que conta a despensa inteira em uma
escrita; a **7B** fez a lista de compras parar de descontar contagem vencida e fez a compra
**propor** a contagem em vez de escrevê-la. A **7C, reservada para o que a 7B achasse e não
coubesse nela, não foi precisa**. Baixa automática continua fora, e é justamente o que a spec
responde.

As três aprovações da spec foram usadas: o campo novo e a **remoção** de `Insumo.estoqueMinimo`
na 7A, e a mudança de comportamento da lista em dado já gravado na 7B.

**A dívida original saiu da tabela, e a que ficou não é de código.** A lista deixou de mentir,
mas a contagem depende de ela contar: sem contar, `/compras` compra o cheio toda semana. As
três defesas são deliberadas — o erro escolhido é o barato (`#d63`), a contagem é semeada pela
compra (`#d64`), e o momento oferecido é o único em que ela já está de pé na frente da despensa
com as sacolas na mão. É o que o roteiro em navegador da 007 mede, e o passo 3 — voltar a
`/compras` e ver o carrinho encolher — é o único argumento que vai fazê-la contar na semana
seguinte.

## A spec 008, entregue nas duas sessões

`specs/008-onboarding.md` foi escrita em 2026-09-03, e é a primeira que não nasce de dívida da
tabela: nasce do pedido de que a usuária 0 receba o sistema sem dúvida sobre o que ele faz e em
que ordem se opera. Duas sessões — a **8A entregou a espinha** (`domain/onboarding.ts`, o campo
`Conta.primeirosPassosEm`, a rota `/comecar` e o cartão dos cinco passos na tela Hoje), e a **8B
entregou o guia que fica** (a cadeia do dinheiro, as três funcionalidades fora da navegação, o
offline e a instalação na tela de início). A **8C continua reservada**, e desta vez ela tem
motivo para acontecer: as dúvidas que só aparecem com a usuária 0 operando entram lá, com o
texto da pergunta que ela fizer.

As três aprovações da spec foram usadas, todas na 8A: o campo novo em `Conta`, a recuperação de
senha na tela de login, e a rota nova com o item novo no cromo. **A 8B não pediu nenhuma** — ela
não tem schema, índice, regra nem dependência.

**A 8A rodou antes da 5B, contra o que a própria spec pedia**, por decisão de quem conduz o
projeto. O risco está registrado acima e continua de pé: a cópia dos cinco passos foi escrita a
partir do que o código faz, e reler os cinco textos contra o que as telas de fato pedem
**continua a fazer** — a 8B não pôde, porque a releitura precisa da 5B, que não rodou. A dívida
está na tabela com o gatilho na 5B, e não em uma sessão da 008.

**A 8B não fechou o critério da captura.** A página inteira em 360px no tema claro, arquivada,
é o mesmo protocolo da 5B aplicado a uma tela que a 5B não viu — e ele depende de navegador,
de login e de uma conta de verdade. Está no roteiro abaixo.

Duas coisas que a escrita da 008 achou no código, e que não são dela:

- **`agregados/global` é escrito e nunca lido.** `totalInsumos`, `totalFichas` e `totalClientes`
  são incrementados no cliente e não têm um único leitor; `pedidosAbertos`, `proximaEntrega` e
  `ultimoNumeroPedido` são tipados em `types/financeiro.ts` e **nunca receberam valor** — a mesma
  doença que a 7A curou em `estoqueMinimo`. É por isso que a 008 decidiu perguntar às coleções
  (`#d67`) em vez de confiar no contador. **Continua sem conserto**, e continua na tabela.
- **A tela de login não tinha recuperação de senha.** Era a única falha do produto que a usuária
  não conseguia contornar por dentro dele: trancada para fora, ela dependia de alguém com acesso
  ao console do Firebase. **Entrou como carona da 8A**, com `sendPasswordResetEmail` do SDK já
  instalado e sem dependência nova.

## O que a preparação para o deploy deixou pronto

Fora de spec, a pedido de quem conduz o projeto, em 2026-09-03. Nenhuma funcionalidade nova:
são dois consertos que só apareceriam no primeiro build da hospedagem, e a documentação do
resto. O guia inteiro está em **`docs/DEPLOY.md`**.

- **A credencial do Admin SDK deixou de exigir um arquivo.** `applicationDefault()` lê
  `GOOGLE_APPLICATION_CREDENTIALS` como **caminho**, e em função serverless não há disco onde
  pôr a chave — que o repositório, de propósito, não versiona. `firebaseAdmin.ts` passou a
  aceitar `FIREBASE_SERVICE_ACCOUNT` com o **conteúdo** do JSON (ou o mesmo JSON em base64),
  e sem a variável o caminho é o de antes, letra por letra. `DECISOES.md#d72`.
- **A falta de credencial ganhou nome próprio.** `credencialDisponivel()` é perguntado antes
  do token, e `/api/nota` devolve `sem-configuracao` (500) no lugar de `sem-acesso` (401).
  Publicado sem a variável, o sistema dizia que **o login dela** não abria a conta, e mandava
  a usuária sair e entrar de novo por causa de um campo vazio no painel da hospedagem. A
  frase certa já existia desde a 6A. **A ordem da 6A foi preservada**: a chave do Gemini
  continua sendo lida só depois da porta.
- **`functions/` saiu do `tsconfig.json` e do `eslint.config.mjs` da raiz.** É andaime do
  `firebase init`, com ferramentas e dependências próprias que o `npm install` da raiz não
  instala. Localmente passava porque `functions/node_modules` está no disco desde aquele dia;
  num build limpo o `tsc` do `next build` não acharia `firebase-functions` e **o build
  falharia antes de compilar uma linha do app**. `DECISOES.md#d73`.
- **`.vercelignore`, com a chave de conta de serviço nas três primeiras linhas.** O deploy por
  Git sobe o que está commitado e obedece ao `.gitignore`; o deploy por linha de comando sobe
  a **pasta**, e a CLI do Vercel não lê o `.gitignore` — sem este arquivo, a chave que está no
  disco subiria junto.
- **`.env.local.example`** ganhou `FIREBASE_SERVICE_ACCOUNT`, com o mesmo aviso invertido da
  `GEMINI_API_KEY` e o comando que gera o base64.

Nada de schema mudou, nenhuma regra de segurança mudou, nenhum índice novo, nenhuma
dependência nova, e nenhum teste precisou ser alterado: os 350 continuam os mesmos, porque
nada disto mora em `src/lib/domain/`.

**O que a preparação não provou.** Nada rodou no Vercel: o portão de conclusão passa nos
quatro, e nenhum dos quatro publica. O build local confirma o que dá para confirmar daqui —
17 rotas, `public/sw.js` emitido, e `FIREBASE_SERVICE_ACCOUNT`, `firebase-admin` e
`private_key` ausentes de `.next/static`, que é a mesma conferência da 6A refeita depois da
mudança. A lista do que só o primeiro deploy responde está no fim de `docs/DEPLOY.md`.

## O que a spec 009 deixou pronto

Conserto de cromo: nenhum módulo de domínio novo, nenhuma rota, nenhum campo, nenhum centavo
movido. É a primeira coisa que a operação real devolveu, e não estava na tabela de dívidas.

- **A variante `apertado` em `globals.css`:**
  `@custom-variant apertado (@media (max-height: 560px) and (pointer: coarse))`. A forma curta
  compila no Tailwind 4.3 — conferido no CSS do build, com as seis utilidades dentro do bloco.
  `interactiveWidget: "resizes-content"` já transformava o teclado em altura de viewport, então
  não há `visualViewport`, listener nem estado. `DECISOES.md#d74`.
- **`src/components/ui/RodapeFixo.tsx`**, o dono único da conta `4.5rem + safe-area` — a altura
  da navegação inferior, que estava copiada em nove lugares. **Seis telas passaram a usá-lo**:
  `PainelPreco`, `PainelPedido`, `RodapeCompras`, `RodapeContagem`, `RodapeNota` e a barra de
  salvar de `/configuracao` (`className="lg:hidden"`, e perdeu a moldura própria). O
  `apertado:bottom-0` mora nele: sem um dono, cada barra ficaria flutuando sobre um vão de 72 px
  no dia em que a navegação sumisse.
- **Some com o teclado aberto:** a navegação inferior, os quatro botões flutuantes (`/insumos`,
  `/fichas`, `/pedidos`, `/financeiro`) e o link de voltar dos dois editores. **Encolhem:**
  `pb-24` do `AppShell` para `pb-4`, `pb-44` e `pb-48` dos dois editores para `pb-32`, e o
  `py-3` dos dois cabeçalhos para `py-2` (o `pb-3 pt-3` virou `py-3` para que a variante
  substitua a mesma propriedade, e não uma vizinha). **Não muda de tamanho** nem o `<h1>`, nem o
  botão Salvar, nem alvo de toque nenhum.
- **A frase dos rodapés ganhou a regra do tom:** alerta fica, confirmação some. Em
  `PainelPedido`, `descontoLimitado` é o segundo gatilho que mantém a linha viva.
  `DECISOES.md#d75`.
- **Em `PainelPreco`, custo, sugerido e preço voltam para a mesma linha** em espaço apertado:
  o rótulo encurta para "Custo", os vãos fecham e o campo estreita para `w-32`. Vale mais uns
  55 px, e o `flex-wrap` fica de rede para o aparelho estreito com preço grande.
- **A regra da frase deixou de ser o tom e passou a ser `correcao`.** "Diga quantas unidades
  saem de um lote" tinha `tom: "atencao"` e ficava, mas é pendência e não veredito: pede um
  campo que está logo acima, que é o que ela estava cobrindo. Vale mais uns 62 px.
- **O rótulo "Preço de venda" vira `sr-only`** com o teclado aberto — `rotuloSomeApertado` em
  `CampoMoeda`, opt-in. Mais uns 26 px, sem perder o nome acessível do campo.

  Os três vieram da primeira conferência em navegador, depois da spec fechada, e juntos levam o
  painel de ~160 px para ~72 px com o teclado aberto. `DECISOES.md#d75`.

- **`theme_color` do manifesto virou `#5e1725`**, o vinho do ladrilho de `icon.svg`, e o par de
  `<meta name="theme-color">` com media query virou o mesmo valor único. Conferido no build:
  `manifest.webmanifest` sai com a cor nova. `background_color` continua creme.
  `DECISOES.md#d76`.

Nada de schema, de regra de segurança, de índice nem de dependência mudou, e **os 350 testes
continuam os mesmos** — que era o critério da spec: nada disto mora em `src/lib/domain/`.

**O que a 009 não provou, e é quase tudo.** Ela troca classes de CSS e uma cor de manifesto, e
o portão automatizado não vê nem uma nem outra acontecer. Os dois roteiros de aceite estão
escritos passo a passo em `specs/009-teclado-e-barra.md`: o **A** exige um Android na mão, com
o teclado aberto em `/fichas/nova` e em `/pedidos/novo`, o passo 9 nos quatro outros rodapés, e
a conferência no desktop em 1280×800 de que nada mudou; o **B** exige publicar, **desinstalar e
instalar o app de novo** — sem isso o WebAPK continua com o creme assado e o roteiro mediria a
instalação antiga.

## O que a spec 010 deixou pronto

O caminho do pedido até a conversa em que ele nasceu. Nenhum campo novo, nenhuma rota, nenhum
documento escrito, nenhum centavo movido — e **`src/lib/firebase/` não aparece no diff**, que
era o critério da spec.

- **`src/lib/domain/whatsapp.ts`**, módulo novo e puro: `telefoneParaWhatsApp` (a normalização
  com DDI), `linkDoWhatsApp` (o `wa.me` com o texto embutido), `mensagemDoPedido` e o tipo
  `ResumoParaCliente`, que é uma interface própria e **não** o `Pedido` — o que a tela tem na
  mão enquanto ela digita não é um documento gravado.
- **`tests/domain/whatsapp.test.ts`: 22 testes** (350 → 372), com o caso de aceite da spec 003
  comparado como **string inteira**, montada com `formatarMoeda` e nunca digitada à mão (o
  espaço fino não-quebrável do `Intl` faria um literal falhar mostrando duas strings idênticas).
  Mais os seis casos da tabela de telefone, o DDD 55 que não é DDI, a quantidade fracionada com
  vírgula, o nome composto, os dois negritos contados, e as duas formas de `linkDoWhatsApp`.
- **`src/components/pedidos/BlocoWhatsApp.tsx`**: um `Bloco` com `MessageCircle`, e a ação é um
  `<a>` com `classesBotao({ variante: "primaria", tamanho: "lg" })`, `target="_blank"` e
  `rel="noopener noreferrer"`. Sem JavaScript e sem `window.open` para o navegador bloquear.
- **`FormularioPedido`** ganhou `resumoParaCliente(pedido)`, montado dos valores da tela, e o
  bloco entrou dentro do `{pedido && …}` **acima** do `BlocoPagamento`: monta, salva, confirma
  com a cliente, e só então recebe.
- **`datas.ts` ganhou `rotuloDiaPorExtenso`**, e `rotuloAgenda` passou a ser a capitalização
  dela. O resultado é idêntico em todo caso, e o teste que já existia é a prova.
- **`pedido.ts`:** `quantidadeEmTexto` virou exportada, e `subtotalDoItem` passou a pedir
  `Pick<ItemParaPedido, "quantidade" | "precoUnitario">` — o resumo da cliente não tem o custo
  na mão, e não pode ter. Nenhum chamador mudou.
- Decisões novas em `DECISOES.md#d77` a `#d79` — as três da spec.

Nada de schema, de regra de segurança, de índice nem de dependência mudou. As três aprovações
que a spec pedia foram usadas: o texto da mensagem como está escrito nela, `wa.me` como domínio
externo alcançável a partir do app (sem chave, sem dado enviado a servidor nenhum: o texto viaja
na URL, no aparelho dela), e a edição de uma linha em `rotuloAgenda`.

Fora do escopo literal da spec, e por quê:

- **`linkDoWhatsApp` aceita `string | null | undefined`**, e não só `string | undefined`. Quem
  produz o argumento é `telefoneParaWhatsApp`, que devolve `null`: a assinatura da spec obrigaria
  um `?? undefined` em todo chamador, e um esquecido renderizaria `https://wa.me/null`.
- **Uma terceira frase embaixo do botão.** A spec prevê duas — a conversa com o número, e "este
  pedido não tem telefone". Falta o caso que a própria seção de riscos chama de risco número um:
  o campo tem texto e o texto não é discável. Dizer "este pedido não tem telefone" ao lado de um
  telefone visível é uma mentira na tela, então esse caso diz "Não dá para discar (…)" e termina
  com a mesma frase das outras duas.
- **Nome de negócio vazio derruba a primeira linha para "Pedido P-…".** Conta que nunca salvou a
  configuração não tem `nomeNegocio`, e `** · pedido` seria a primeira coisa que uma cliente
  leria deste sistema. Um ternário, com teste.

**O que a 010 não provou.** O texto inteiro está coberto, e o link também — mas nenhum teste vê
o `wa.me` abrir. O roteiro de aparelho da spec é curto de propósito e continua inteiro por
rodar: o WhatsApp abrindo na conversa certa com a mensagem escrita e **não enviada**, os
negritos em negrito, os acentos que não podem virar `%C3%A7`, voltar sem perder o que ela
digitou, o pedido sem telefone, e o desktop abrindo o WhatsApp Web em outra aba.

## O que a spec 011 deixou pronto

O caixa parou de perder parcela do agregado. Nenhum campo novo, nenhuma rota, nenhuma regra de
segurança tocada, nenhuma dependência: o diff é curto de propósito, porque a correção é **apagar
`await`**, e não escrever caminho novo.

- **`src/lib/firebase/mutations/despachar.ts`**, arquivo novo de três linhas: `despachar` engole
  a rejeição e a registra no console, para que uma escrita recusada não vire
  `unhandledrejection` numa aba que ninguém está olhando. Um lugar só, e não um `.catch`
  repetido em quinze chamadas.
- **`transacoes.ts`, `pedidos.ts` e `clientes.ts` não esperam mais nenhuma escrita.**
  `gravarTransacao`, `criarPedido` e `criarCliente` trocaram `addDoc` por `doc()` + `setDoc`: a
  referência nasce com id gerado no aparelho, sem ida ao servidor, e é o que permite
  `marcarPedidoPago` gravar `transacaoId` sem rede. **As assinaturas não mudaram** — continuam
  `async`, continuam devolvendo o que devolviam, e **nenhuma tela foi tocada**.
- **`aplicarNoAgregado` despacha o `setDoc`.** É onde a parcela se perdia: ela era a terceira
  linha de uma fila de `await`, e a execução parava na primeira. `recalcularMes` **continua
  esperando**, e o comentário dela diz por quê — é a rede de segurança, faz duas consultas antes
  de escrever e já exige rede para existir.
- **`src/lib/domain/caixa.ts` ganhou `conferirAgregado`**: soma `entradas` e `saidas` da lista de
  lançamentos e diz se batem com as do agregado. Pura, sem Firebase, como o resto de `domain/`.
- **`TelaFinanceiro` ganhou o bloco `AgregadoAtrasado`**, acima de `ResultadoDoMes`, com ícone,
  os dois números e o botão "Recalcular o mês" ali dentro. Fica calado enquanto `pendente` for
  verdadeiro: as duas assinaturas não redesenham no mesmo tique.
- **`tests/domain/caixa.test.ts`: 5 testes novos** (372 → 377), incluindo o caso que dá nome à
  spec — cinco lançamentos contra um agregado que só recebeu um — e a concordância com
  `agregarTransacoes` sobre os mesmos lançamentos.
- Decisões novas em `DECISOES.md#d80` e `#d81` — as duas da spec.

A aprovação que a spec pedia foi usada, e é a terceira vez que este projeto a pede (`#d40`,
`#d62`): uma escrita recusada pelas regras de segurança no caixa passa a falhar calada,
registrada no console. O que falha calado aqui é dinheiro, e por isso foi pedida de novo. A
alternativa era o caixa não funcionar sem rede, o que contraria o invariante de `CLAUDE.md`.

Fora do escopo literal da spec, e por quê:

- **`criarCliente` e `atualizarCliente` também despacham**, e não só `aplicarPedidoNoCliente`. O
  critério de aceite diz "nenhuma escrita esperada em `clientes.ts`", e são três funções num
  arquivo de cem linhas: deixar duas esperando seria uma exceção sem motivo declarado.
- **`despachar` ficou em arquivo próprio**, e não dentro de `transacoes.ts` como a spec sugere.
  `agregado.ts` precisa dele e `transacoes.ts` importa `agregado.ts`: pôr o auxiliar lá fecharia
  um ciclo de import.

**O que a 011 não provou.** `npm test` cobre `src/lib/domain/`, então `conferirAgregado` tem
teste e mais nada tem. O defeito não mora no domínio — a aritmética já estava certa e provada
desde a 4A —, e o roteiro de cinco passos em navegador da spec é o **único** lugar onde esta
correção pode ser vista. O passo 4 é o que separa o conserto de uma fachada: fechar a aba antes
de religar a rede, e reabrir depois. E o passo 1 é o que confirma o diagnóstico: se marcar um
pedido como pago **offline** não reproduzir o defeito hoje, a causa é outra e a spec está errada.

**O conserto do estrago já feito é manual e não aconteceu nesta sessão.** Está na próxima ação.

## O que a spec 012 deixou pronto

O outro lado da entrega passou a existir. Duas funções puras viraram cinco, dois campos
aditivos no pedido, uma categoria nova no caixa, duas mutações e um painel. **Nenhuma rota nova,
nenhuma consulta nova, nenhum índice novo, nenhuma dependência.**

- `src/lib/domain/pedido.ts` ganhou o bloco do acerto, ao lado de `aReceber`, que é a irmã desta
  conta: `entregasAPagar` (as quatro exclusões), `resumoDoRepasse`, `descricaoDoRepasse`,
  `entregasEsquecidas` e `repassesFeitos`, mais os tipos `PedidoParaEntrega`, `EntregaAPagar`,
  `ResumoDoRepasse` e `RepasseFeito`.
- `tests/domain/pedido.test.ts`: **17 testes novos** (377 → 394), com o caso de aceite da spec
  número por número — as 3 linhas na ordem 31/08, 01/09, 05/09, os R$ 47,00, a descrição
  `"Entregas · 3 pedidos · 31 de ago. a 05 de set."` e o 1 de `entregasEsquecidas` — mais as
  bordas: retirada fora, taxa zero fora, os cinco status que não são `ENTREGUE` fora, já
  repassada fora, lista vazia, período de um dia só, e `repassesFeitos` agrupando dois pedidos
  de um acerto e um de outro.
- **Schema:** `Pedido.entrega` ganhou `repassadoEm?: Timestamp` e `repasseTransacaoId?: string`;
  `CategoriaTransacao` ganhou `"ENTREGA"`. As duas aprovações que a spec pedia, as duas
  aditivas: documento antigo sem os campos lê como "não repassada", que é o estado correto de
  todo pedido de hoje, e agregado antigo sem a chave continua válido. **Nenhuma migração.**
- `src/lib/domain/caixa.ts`: `ROTULO_CATEGORIA_TRANSACAO` ganhou `"Entrega"` e `CATEGORIAS_SAIDA`
  ganhou a linha, depois de `EMBALAGEM`. Mais nada em `caixa.ts` mudou — o agregado já tratava
  categoria como chave, e não como lista fechada.
- `mutations/pedidos.ts`: `pedidoParaEntrega` (a conversão de `Timestamp` para `DataISO`, na
  fronteira), `pagarEntregas` (reusa `criarTransacao` e marca os pedidos num `writeBatch`, por
  caminho pontilhado) e `desfazerRepasse` (reusa `arquivarTransacao` mais um lote com
  `deleteField()`). **As duas despacham e não esperam** (`#d80`).
- `mutations/transacoes.ts`: `arquivarTransacao` passou a pedir `TransacaoReversivel`
  (`Pick<Transacao, 'id' | 'competencia'> & TransacaoAgregavel`) em vez do documento inteiro.
  Nenhum chamador mudou.
- `src/components/pedidos/EntregasAPagar.tsx`, a faixa em `/pedidos` logo abaixo de "A receber",
  com o mesmo peso visual, e `PainelEntregas.tsx`, o painel: uma linha por entrega já marcada com
  alvo de toque de 56px, o campo de data do pagamento nascendo hoje, a frase de `#d83` quando há
  entrega vencida fora da conta, o rodapé com "Pagar R$ 47,00" em 52px, e "Últimos acertos" com
  desfazer em duas etapas.
- Decisões novas em `DECISOES.md#d82` a `#d85` — as quatro da spec.

Fora do escopo literal da spec, e por quê:

- **`atualizarPedido` passou a gravar o mapa `entrega` por caminho pontilhado.** Ela gravava o
  mapa inteiro, e com os dois campos novos isso viraria perda de dinheiro: editar um pedido já
  acertado apagaria o repasse, a entrega voltaria para a faixa, e ela pagaria o entregador duas
  vezes. A spec nomeia o risco do caminho pontilhado só na mutação nova; ele valia também na
  velha. Está em `#d84`.
- **A faixa não some quando não há entrega a pagar, se houver acerto recente.** A spec diz "some
  quando não há entrega a pagar", e o roteiro dela pede desfazer no passo 5 — mas o painel é o
  único caminho até "Desfazer", e ele abre pela faixa. Sem entrega e sem acerto, a faixa some
  como a spec manda; com acerto recente ela fica calada, com o botão "Ver os últimos acertos".
- **`pagarEntregas` não recebe as formas de pagamento**, e `desfazerRepasse` recebe o
  `RepasseFeito` inteiro em vez de `(pedidoIds, transacao)`. Os dois motivos estão em `#d85` e
  `#d84`: o primeiro parâmetro nunca seria lido, e o segundo é o objeto que o domínio já produz.
- **`esquemaPedido` não ganhou os dois campos**, contra a letra da spec. Ele é a forma do
  formulário, e não a do documento (`#d84`).
- **`DICA_CATEGORIA.ENTREGA`.** Sem a frase, o acerto da semana pode ser lançado à mão em
  `/financeiro` **e** pelo painel. É o mesmo erro que a dica de `TAXA_PAGAMENTO` existe para
  evitar.
- **O painel recomeça ao abrir.** Ele fica montado o tempo todo para poder animar, então
  desmarcar uma linha e fechar sem pagar deixaria a linha desmarcada na semana seguinte, e o dia
  do pagamento parado no de então.

**O que a 012 não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então as cinco
funções novas têm teste e o lançamento, o lote e o painel não têm. O roteiro de cinco passos da
spec é o único lugar onde o acerto pode ser visto acontecer — e o passo 4, com a rede em
Offline, é o que separa esta spec de uma que só funciona na bancada com sinal.

## O que a sessão 13A deixou pronto

O ciclo do fato: registrar o que assou, ver a despensa descer por causa disso, e a lista de
compras parar de comprar o que já foi assado. **Nenhuma pergunta nova é respondida** — capacidade
é a 13B. Uma coleção nova, um módulo de domínio novo, um índice publicado, nenhuma rota, nenhuma
dependência, regra de segurança intacta.

- `src/lib/types/producao.ts`: `Fornada` e `ConsumoDaFornada`, com `caminhos.fornadas`,
  `colFornadas` e `docFornada` acompanhando.
- `src/lib/domain/producao.ts`, módulo novo e puro: `consumoPorLote` (a receita passada pela
  perda), `fornadaGravavel` (unidades → lotes fracionários → consumo, com o `floor` em `un`),
  `fornadasDesdeAContagem` e `consumoDesdeAContagem` (a janela `dataISO > contadoEmISO`, por
  insumo), `disponivelParaProducao` (a projeção, nunca negativa), `projecaoDoInsumo` (o que a
  linha da despensa diz) e `produzidoParaPedidos` (o abate).
- `listaCompras.ts`: **`insumosPorLote` extraída de `explodirDemanda`** — a regra do kit de um
  nível mora numa função só, e os 41 testes da 3C/7B passaram sem uma linha alterada, que era o
  critério. `montarLista` ganhou o quarto parâmetro opcional `ContextoDaProducao`, e
  `LinhaDaLista` os campos `consumoDeFornadas` e `quantidadeJaProduzida`; `ItemListaCompras` os
  ganhou opcionais e `itemDaLinha` os grava.
- `tests/domain/producao.test.ts`: **27 testes** (394 → 421) — a fornada no dia da contagem e no
  dia seguinte, o insumo sem data, o kit de um nível conferido contra `explodirDemanda`, a
  produção parcial de um pedido, a fornada de ficha arquivada (a projeção não lê a ficha), a
  fornada sem pedido descendo a despensa **e** a lista continuando a comprar, e a fornada com
  pedido deixando de comprar para ele, com o abate do lado físico.
- `mutations/fornadas.ts`: `consultaFornadas` (vivas, últimos 30 dias, `arquivado` + `dataISO`
  desc), `registrarFornada` (id no aparelho, `setDoc` despachado, não espera o servidor) e
  `arquivarFornada`. **Nenhuma fornada é apagada**, e a mutação não importa caixa nem meta.
- `src/components/producao/PainelFornada.tsx`: a folha — a ficha (fixa, ou `Seletor` quando o
  pedido tem mais de uma), **massa para quantas unidades**, o dia, a frase "a receita rende 25
  unidades por lote · 15 são 0,75 lote", e embaixo **o que sai da despensa, linha por linha,
  antes de salvar**: "você tem 1,2 kg → fica 674 g · contada há 5 dias", "sem contagem
  recente", e o aviso com ícone quando a projeção não dá para a massa.
- Duas entradas: a faixa **"Fiz a massa"** no topo de `/fichas/[id]` (ficha salva, com
  rendimento e itens, abrindo com o rendimento de um lote), e **"Registrar fornada"** no bloco
  de status de `/pedidos/[id]`, com as fichas do pedido, a quantidade pedida e `pedidoId`
  amarrado.
- `src/components/producao/FornadasRecentes.tsx`: as massas registradas desta ficha (ou deste
  pedido), com **"Desfazer"** em dois toques, que chama `arquivarFornada`. É o único caminho
  para o critério "arquivar uma fornada a tira da projeção" existir na tela — sem ele a mutação
  existia e ela não tinha como chegar nela. Não é histórico: são as dos últimos 30 dias.
- `/compras` monta a lista com a massa dentro: `consumoDesdeAContagem` e `produzidoParaPedidos`
  entram no `montarLista`, e `LinhaCompra` e `LinhaJaTem` dizem "X já viraram massa para o
  pedido" e "Y foram para a massa desde a contagem" com ícone. "Você tem" no bloco de já-tem é
  a projeção.
- `/insumos` e `/insumos/contagem` mostram a projeção ao lado da contagem gravada, que **não
  muda**: "1,2 kg na despensa · contada há 5 dias" e, embaixo, "2 fornadas desde então ·
  projetamos 674 g". O campo da contagem continua nascendo vazio (`#d59`).
- **Carona 1:** vinda da nota ou da compra, a contagem abre recortada em "Só o que a nota
  trouxe (5)", com "A despensa inteira (34)" ao lado, em pílulas como as de período em
  `/compras`. O rodapé conta o que está na tela; salvar grava tudo o que foi tocado.
- **Carona 2 já estava feita:** "Guardar na despensa" era a ação primária da etapa "pronto" da
  nota desde a 7B, com "Ler outra nota" secundária. Nada mudou ali.
- Índice `fornadas` publicado com `firebase deploy --only firestore:indexes`.
- Decisões novas em `DECISOES.md#d86` a `#d92` — as sete da abertura da spec que a 13A executa
  (1, 2, 3, 4, 5, 6 e 9); a 7 e a 8 são da 13B e da 13C. E **`#d93`, por esclarecimento da
  dona do negócio no fim da sessão**: fornada é a massa feita e congelada, assada sob demanda;
  o campo virou unidades (lotes derivados, fracionários), a cópia deixou de falar em forno, e
  a 13D ganhou motivo para existir. A spec 013 não foi reescrita — o `#d93` é o registro.

Fora do escopo literal da spec, e por quê:

- **`insumosPorLote` devolve `Map<string, LinhaDeDemanda>`**, e não `Map<string, number>`. A
  fornada grava `nomeSnapshot` por insumo, e num kit o nome só existe nas fichas de dentro.
  `consumoPorLote` devolve `ConsumoDaFornada[]` pelo mesmo motivo. Está em `#d86`.
- **A folha não tem busca solta de ficha nem o campo "para qual pedido".** Não há entrada solta:
  as duas entradas já sabem a ficha, e só a do pedido sabe o pedido. Amarrar de dentro da ficha
  exigiria consultar os pedidos abertos daquela ficha, com índice que a spec não pediu (`#d91`).
- **`consultaFornadas` recorta em 30 dias.** Contagem mais velha já vale "não sei"; o preço
  conhecido está em `#d87` e num comentário `ponytail:` na consulta.
- **O recorte da nota cai para a despensa inteira quando fica vazio.** O insumo que a nota
  acabou de cadastrar pode ainda não ter chegado do cache, e uma tela vazia com "Cadastrar
  insumo" seria mentira.

**O que a 13A não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então a folha, as
duas entradas, a consulta, as frases de `/compras`, `/insumos` e `/insumos/contagem` e o recorte
da nota não têm teste. O que só o navegador responde está na próxima ação.

## O que a sessão 13B deixou pronto

A pergunta 2 do problema da spec: quantas fornadas dá. **Nenhuma escrita nova, nenhuma coleção,
nenhum índice, nenhuma rota** — é leitura sobre o que a 13A gravou, e a resposta é sobre hoje.

- `src/lib/domain/producao.ts` ganhou o bloco da capacidade: `capacidadeDaFicha` (as três
  leituras `MEDIDA` / `PISO` / `DESCONHECIDA`, o gargalo, `fornadas` inteiras e `unidades` pelos
  lotes fracionários do `#d93`), `prometidoParaPedidos` (o que os pedidos abertos ainda vão levar
  da despensa, físico, menos o que já virou massa para eles) e `faltaPara` (o que comprar,
  insumo por insumo, para uma quantidade). `HORIZONTE_MAXIMO` saiu de `ListaDoMercado.tsx` para
  `listaCompras.ts`, porque agora três telas recortam os pedidos pelo mesmo horizonte.
- `tests/domain/producao.test.ts`: **11 testes novos** (421 → 432) — tudo contado com o gargalo
  nomeado, nada contado devolvendo `null` e não zero, contagem vencida valendo sem contagem,
  `PISO` com o número dos contados, a fornada derrubando a capacidade sem contagem nova, o kit
  travando na embalagem própria, o prometido descontando e abatendo o que já virou massa, o que
  falta para 100 cookies, e as três fichas sem pergunta (sem itens, rendimento zero, arquivada).
- `src/lib/hooks/useDespensaParaProduzir.ts`: **um hook para as três telas** que perguntam à
  despensa — insumos vivos, fornadas recentes e pedidos do horizonte — e `contextoDaCapacidade`,
  que monta o `consumo` e o `prometido` deixando de fora o pedido que está sendo perguntado.
  `TelaCompras` passou a usá-lo no lugar das três consultas que tinha; nada mudou em `/compras`.
- `src/components/producao/FraseDaCapacidade.tsx`: `FraseDaCapacidade` (a linha de `/fichas`:
  "dá para 3 fornadas · 66 unidades · Chocolate acaba primeiro", "pelo menos 3 fornadas · Manteiga
  sem contagem", "não dá nem uma fornada · falta Chocolate" com ícone, "não dá para saber quantas
  fornadas · Chocolate, Farinha e mais 2 sem contagem") e `FraseCabeNoPedido` (a linha do pedido:
  "Dá: a despensa tem para 66 unidades hoje, já tirando os outros pedidos", "Falta massa para 34
  unidades. Comprar 500 g de Chocolate e 631,58 g de Farinha resolve.", e "A massa para este item
  já está feita" quando a fornada do pedido já cobre a quantidade).
- `/fichas`: a linha ganhou a frase embaixo de "custa · rende", e o cabeçalho da lista ganhou
  "Contar a despensa" (`EntradaContagem`) quando alguma ficha visível tem insumo sem contagem. A
  frase só aparece depois que a despensa chegou — dizer "não dá para saber" por um instante seria
  mentir por pressa.
- `/pedidos/[id]` e `/pedidos/novo`: `EditorPedido` assina a despensa **sempre**, e não só em
  pedido salvo — o pedido novo é onde a pergunta mais importa. `LinhaItemPedido` ganhou um slot
  `children`, e o formulário refaz a capacidade a cada tecla, tirando do que a linha pede o que
  já virou massa para este pedido e esta ficha.
- Decisões novas em `DECISOES.md#d94` (a decisão 7 da spec, como ficou) e `#d95` (o prometido,
  o hook e onde mora o atalho de contar).

Fora do escopo literal da spec, e por quê:

- **`capacidadeDaFicha` devolve `null`**, e não uma `CapacidadeDaFicha`, para ficha arquivada,
  sem rendimento ou sem insumo. É o "não quebram nem aparecem" do critério de aceite dito no
  tipo: a tela não tem como mostrar o que não existe.
- **`unidades` sai dos lotes fracionários, e não de `fornadas × rendimento`.** A spec foi
  escrita antes do `#d93`; com a massa feita do tamanho que quiser, 3,33 lotes de uma receita de
  20 são 66 cookies vendáveis, e dizer 60 recusaria seis que dão.
- **`PISO` é o número dos insumos contados, dito como "pelo menos".** A spec fala em "o gargalo
  não é um deles" sem dizer como saber; o único jeito honesto sem usar número vencido é definir o
  gargalo entre os contados e nomear o resto. Motivo e limite em `#d94`.
- **O atalho de contar mora no cabeçalho de `/fichas`, e não na linha.** A linha inteira é um
  link para a ficha, e link dentro de link não existe em HTML.

**O que a 13B não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então as duas frases,
o hook, a linha de `/fichas` e a linha do pedido não têm teste. O que só o navegador responde
está na próxima ação.

## O que a sessão 13C deixou pronto

A pergunta 4 da spec e o item 3 do pedido original: a previsão de compras deixa de depender de
haver pedido. **Um campo novo em `FichaTecnica`, nenhuma coleção, nenhum índice, nenhuma rota,
nenhuma dependência**, e a lista de compras muda pela terceira vez depois da 7B e da 13A —
com efeito nulo enquanto nenhuma ficha tiver piso.

- `FichaTecnica.fornadasMinimas?: number`, inteiro, ausente vale zero. Entrou em `esquemaFicha`
  (inteiro, não negativo), em `DadosFicha` e no corpo único de escrita de `mutations/fichas.ts`.
  No formulário mora no bloco "Rendimento e tempo", como "Fornadas de reserva", com a frase
  "Sempre poder fazer esta quantidade. Quando a despensa não der mais isso, o que falta entra na
  lista de compras. Zero desliga." Ficha nova nasce em zero.
- `src/lib/domain/producao.ts` ganhou o bloco do piso: `reservaDeProducao` (o piso como demanda,
  útil, por insumo, com as fichas que pedem — `ReservaDoInsumo`) e `fichasAbaixoDoPiso` (as fichas
  com piso cuja capacidade de hoje ficou abaixo dele, sem contar `DESCONHECIDA`).
  `FichaParaProduzir.fornadasMinimas?` acompanha.
- `listaCompras.ts`: `ContextoDaProducao.piso?: Map<string, LinhaDeDemanda>`, o terceiro mapa,
  opcional. `montarLista` itera a união dos insumos pedidos e dos reservados, soma a reserva à
  demanda antes da perda, abate a massa já feita **só da parte dos pedidos**, e grava
  `LinhaDaLista.quantidadeDeReserva`. `ItemListaCompras.quantidadeDeReserva?` nasceu opcional e
  `itemDaLinha` o grava. Sem piso a conta é idêntica à de antes: os testes da 7B e da 13A
  passaram sem uma linha alterada.
- `tests/domain/producao.test.ts`: **10 testes novos** (432 → 442) — a reserva útil e quem pede,
  o kit com piso explodindo um nível, os quatro jeitos de não pedir nada, piso zero devolvendo a
  lista idêntica, piso 1 sem pedido montando lista com a linha dizendo que é reserva, piso e
  pedido somando, a massa feita para o pedido abatendo o pedido e não a reserva (inclusive massa
  a mais), a fornada de vitrine fazendo o item voltar, o insumo só da reserva que sumiu virando
  pendência com nome, e `fichasAbaixoDoPiso` nos quatro casos (de pé, abaixo, derrubada pela
  fornada, e nunca por não saber).
- `/compras`: a montagem passa `piso: reservaDeProducao(fichas)`; "Montar a lista" deixou de
  exigir pedido e passou a exigir linha; o estado vazio e o cabeçalho falam da reserva;
  `LinhaCompra` e `LinhaJaTem` ganharam a frase "300 g para os pedidos · 500 g para manter 1
  fornada de Cookie de reserva", com ícone, e os nomes vêm das fichas vivas.
- `CartaoComprasHoje` foi reescrito: assina a lista aberta, as fichas e a despensa
  (`useDespensaParaProduzir` + `contextoDaCapacidade`, os mesmos de `/fichas`), existe em
  qualquer das três condições da spec, e diz "Faltam N itens · R$ X" — da lista aberta quando há
  uma, ou da lista que seria montada agora quando não há. A segunda linha nomeia a ficha abaixo
  do piso e o gargalo ("Cookie não dá nem uma fornada — trava em Chocolate"), com ícone; sem
  ficha abaixo, diz quantos pedidos há nos próximos dias.
- Decisão nova em `DECISOES.md#d96`.

Fora do escopo literal da spec, e por quê:

- **A reserva entra útil, e não física.** A spec escreve `Σ (fornadasMinimas × consumoPorLote)`,
  que é físico; somar físico a `necessária`, que é útil, seria o erro que o comentário de
  `montarLista` já previne para o estoque. Útil antes da perda dá o mesmo número e uma perda só.
  Motivo em `#d96`.
- **`piso` é `Map<string, LinhaDeDemanda>`**, e não `Map<string, number>` como os irmãos: o insumo
  que só a reserva pede e que sumiu do cadastro precisa de nome para virar pendência.
- **O campo se chama "Fornadas de reserva"** com a frase da spec na dica, e não a frase como
  rótulo com o número no meio: um sufixo de três palavras não cabe no campo em 360px, e forçar
  caberia à custa de um seletor CSS que ninguém decodifica às três da manhã.
- **O cartão calcula a lista que seria montada.** Sem lista aberta, "Faltam N itens" não existiria
  antes de ela montar — e a previsão não seria previsão.

**O que a 13C não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então o campo do
formulário, a frase da linha, o botão de montar sem pedido e o cartão não têm teste. O que só o
navegador responde está na próxima ação.

## O que a sessão 13D deixou pronto

A pergunta que faltava: quantas já estão feitas. **Dois campos novos em `FichaTecnica`, uma rota
nova, nenhuma coleção, nenhum índice, nenhuma dependência**, e a 007 reusada um nível acima.

- `FichaTecnica.estoqueProntoAtual?: number | null` e `estoqueProntoContadoEmISO?: DataISO |
null`: a contagem do pote, na unidade de rendimento. `corpoDaFicha` não os conhece, então
  salvar a receita não apaga a contagem. Nenhuma ficha existente fica inválida.
- `src/lib/domain/producao.ts` ganhou o bloco do pronto: `contagemDoPronto` (é
  `contagemDoInsumo` sobre os dois campos), `projecaoDoPronto` (contado + massa feita depois da
  contagem, janela `>`), `reservadoNoPronto` (`min(pedido, feito)` por ficha: o que está no pote
  mas tem dono) e `prontosLivres`. `FornadaDaFicha` e `FichaComPronto` são os recortes mínimos.
- `tests/domain/producao.test.ts`: **8 testes novos** (442 → 450) — a massa no dia da contagem e
  no seguinte, outra ficha e massa arquivada, nunca contado e vencida devolvendo `null`, o dono
  até o que o pedido pede, massa sem dono, os livres nunca negativos, e a identidade
  `livres + capacidade = prontos + despensa − prometido` conferida com número, e o kit sem pote.
- `estoque.ts`: `resumoDaContagem` passou a receber as chaves das linhas, e não as linhas, para
  servir às duas contagens. Os dois testes da 7A mudaram só a chamada.
- `mutations/estoque.ts`: `salvarContagemDoPronto`, o mesmo `writeBatch` por lotes de 400.
- `src/lib/estado/sementeDoPronto.ts`: a semente da fornada para a irmã, estado de módulo.
- `src/components/producao/TelaContagemPronto.tsx` e a rota `/fichas/contagem`: uma linha por
  ficha viva, campo vazio (`#d59`), referência "13 unidades · contada há 2 dias · massa para 25
  desde então, projetamos 38", e `RodapeContagem` reusado com `rotulo` e `dica`. Com semente, o
  campo daquela ficha nasce por `sugestaoDaContagem` e diz de onde saiu; o recorte "Só esta
  receita" / "Todas" é o mesmo desenho da nota.
- `PainelFornada`: depois de registrar, a folha fica aberta em "Fornada registrada" e oferece
  "Contar o que está pronto" (primária) ou "Agora não". Contar guarda a semente e vai para a
  irmã. `SUFIXO_UNIDADE_RENDIMENTO` foi para `custoFicha.ts`, que tinha três cópias.
- `FraseDoPronto`: "13 unidades prontas · contada há 2 dias · massa para 25 desde então", em
  `/fichas` acima da capacidade (já sem o que é de pedido aberto) e na tela da ficha, no cartão
  "Fez a massa?", com a entrada `EntradaContagemPronto` ao lado. `FraseCabeNoPedido` ganhou
  `prontos`: "Dá: 13 unidades prontas hoje, sem fazer massa", "Dá: 13 unidades prontas, e a
  despensa faz mais 41 hoje", "Falta massa para 6 unidades (13 unidades prontas)".
- `contextoDaCapacidade` devolve `reservado` junto de `consumo` e `prometido`, e as três telas o
  recebem pelo mesmo hook. `/fichas` ganhou a entrada "O que está pronto" no cabeçalho, no
  mesmo lugar em que `/pedidos` leva a "O que comprar".
- **Kit não tem pote** (`temPronto`): um combo é o agregado das receitas de dentro, e contar a
  caixa montada contaria os mesmos cookies duas vezes. Kit fica fora da irmã, da frase e da
  contagem; a capacidade da 13B continua respondendo por ele.
- Decisão nova em `DECISOES.md#d97`.

Fora do escopo literal da spec, e por quê:

- **`reservadoNoPronto`.** A spec escreve `posso vender = prontos + fornadas possíveis ×
rendimento − prometido` sem dizer que a 13B já abate do prometido o que virou massa para o
  pedido. Somar prontos inteiros venderia a mesma massa duas vezes; o abate `min(pedido, feito)`
  é o que faz a conta fechar na fórmula da spec, e degrada para a 13B quando o pote nunca foi
  contado. Motivo em `#d97`.
- **A rota `/fichas/contagem`.** A spec dizia "nenhuma rota nasce" para as quatro sessões
  planejadas; a 13D estava reservada, e "a tela de contagem ganha uma irmã" é uma tela.
- **A projeção do pronto soma e não desconta.** O sistema não vê a venda sair do pote. É o mesmo
  erro para cima da despensa sem fornada registrada, e a contagem conserta.
- **A reserva (`#d96`) não olha o pote.** "Sempre poder fazer uma fornada" é sobre a despensa.

**O que a 13D não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então a irmã, a
folha em "registrada", a semente, as frases e a entrada em `/fichas` não têm teste. O que só o
navegador responde está na próxima ação.

## O que a sessão 14A deixou pronto

O combo existe como produto e é vendido. **A produção do combo é a 14B, abaixo.**

- `src/lib/types/fichas.ts`: `EscolhaDoKit` e `FichaTecnica.escolhas?` / `custoEscolhas?`.
  `vendas.ts`: `EscolhaFeita` e `ItemPedido.escolhas?`, com o comentário de
  `custoUnitarioSnapshot` dizendo que numa linha de combo ele é o custo montado. Os três
  campos aditivos que a spec pediu, todos opcionais: ficha e pedido gravados antes leem
  como "conteúdo fixo, parcela zero".
- `src/lib/domain/custoFicha.ts`: `temEscolhas`, `FichaParaEscolha`, `opcoesDaEscolha` (é
  `podeSerComponente` com a categoria por cima) e `custoDasEscolhas` (referência pela mais
  cara, faixa, `semOpcao`). `EntradaCustoFicha.custoEscolhas?` entra em `custoTotalLote`
  como `custoComponentes`; `CustoFichaCalculado.custoEscolhas` sai sempre.
- `src/lib/domain/pedido.ts`: `custoDoComboMontado`, `escolhasCompletas`,
  `resumoDasEscolhas` e `nomeComEscolhas`, que `resumoDosItens` e `mensagemDoPedido`
  (WhatsApp) usam: "3 × Combo dupla (1 Cookie tradicional + 1 Cookie de nutella)".
- `src/lib/domain/listaCompras.ts`: `PedidoParaExplodir.itens[].escolhas?` e a explosão da
  escolha em `explodirDemanda`, um nível, pelos itens da receita escolhida. `linhasDosItens`
  nasceu porque era a terceira cópia do mesmo `map`.
- `schemas.ts`: `esquemaFicha.escolhas` (inteiro ≥ 1, categoria não vazia, sem repetição,
  vazio em `SIMPLES`; kit precisa de componente **ou** escolha) e `esquemaPedido.itens[].escolhas`
  (só a forma).
- `mutations/fichas.ts`: `DadosFicha.escolhas` e `custoEscolhas`; `corpoDaFicha` grava os
  dois. `mutations/pedidos.ts`: `ItemDoPedido.escolhas?`, gravado por spread condicional, e
  `fichaIds` espelhando também as fichas escolhidas.
- `src/components/fichas/FormularioFicha.tsx`: o bloco "O que a cliente escolhe", só em kit,
  entre "O que vai no kit" e "Embalagem do kit" — `useFieldArray`, uma linha por escolha
  (`LinhaEscolhaFicha`: quantas, `un de`, categoria, e embaixo "3 receitas servem: … · a mais
  cara custa R$ 3,10" ou o aviso com ícone). "O custo do lote" ganhou a parcela "O que a
  cliente escolhe (pela opção mais cara)", a frase da faixa e o aviso das categorias sem
  receita. "Fornadas de reserva" some em kit com escolhas. `Linha` de `LinhaItemFicha` ganhou
  `nome?` e `detalhe?` para servir à terceira lista.
- `src/components/pedidos/EscolhaDoCombo.tsx`, novo: a escolha inline embaixo da linha do
  combo — por categoria, "Cookie · escolha 2" e "1 de 2" (com ✓ quando fecha), a lista das
  receitas que servem com o preço avulso em `micro` e um par de −/+ de 44px; a escolha que
  deixou de servir aparece com ícone e um botão para sair. `FormularioPedido`: a linha
  guarda `custoDoKit` e `escolhas`, `mudarEscolha` refaz `custoUnitarioSnapshot` por
  `custoDoComboMontado` a cada toque, `opcoesFicha` deixa o kit com escolhas repetir em duas
  linhas, salvar com escolha incompleta cai em `errosItens` ("Faltam 2 de Cookie neste
  combo."), e "usar o preço de hoje" refaz base e escolhas pelo custo de hoje.
  `LinhaItemPedido` ganhou `detalhe` (o resumo das escolhas embaixo do nome).
- Testes: **33 novos** (453 → 486). `caixa.test.ts` (o combo no ranking com os números do
  caso de aceite, e nenhuma linha para os sabores — a linha leva `escolhas` e
  `ItemAgregavel` não conhece o campo, que é a prova de que o agregado não mudou),
  `custoFicha.test.ts` (opções, referência 620 e faixa
  440–620, categoria sem receita, kit sem escolha idêntico ao de hoje, `temEscolhas`),
  `pedido.test.ts` (580 do combo montado, a linha de 3 combos com sobra 1.860 e o contorno
  de hoje fechando no mesmo total, `escolhasCompletas` nos cinco casos, o resumo),
  `listaCompras.test.ts` (135 g de farinha e 3 saquinhos, o mesmo combo em duas linhas,
  pedido sem escolhas igual ao de antes, escolha arquivada e sem rendimento como pendência),
  `whatsapp.test.ts` (a linha entre parênteses) e `schemas.test.ts`, **arquivo novo**, com
  as regras do kit.
- Decisões novas em `DECISOES.md#d99` a `#d103` — as cinco da abertura da spec. **A spec as
  numerou `#d98` a `#d102`, e o `#d98` já existia** (dados para pagar); a numeração aqui é
  a do arquivo.

Fora do escopo literal da spec, e por quê:

- **A linha do combo no editor de pedido não mostra frase de capacidade.** A 14B é que faz
  `capacidadeDaFicha` devolver `null` para kit com escolhas; até lá, a frase que sairia seria
  a do saquinho ("dá para 200"), mentira com cara de resposta. Um `!combo` na tela, e o
  domínio fica intacto para a 14B.
- **`opcoesDaEscolha` é genérica** (`<F extends FichaParaEscolha>`): o bloco de escolha
  precisa do preço avulso da mesma lista, e devolver o tipo de entrada evita um cast.
- **`schemas.test.ts` nasceu.** "Ficha `SIMPLES` recusa `escolhas`" é critério de aceite e
  regra de esquema, e não havia onde testá-la.
- **A escolha que deixou de servir tem botão para sair.** Sem ele, uma receita arquivada
  depois do pedido travaria a linha em "falta 1" sem jeito de consertar.

**O que a 14A não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então o bloco
de escolha na ficha, o bloco inline na linha do pedido, a repetição do combo em duas linhas
e a gravação de `escolhas` e `custoEscolhas` não têm teste. O roteiro de navegador da 14A
(sete passos, ao fim da spec) é o que fecha isso, e está na próxima ação.

## O que a sessão 14B deixou pronto

O combo produz: o que a 013 responde por receita passa a responder também pela escolha.
Nenhum campo, nenhuma mutação, nenhuma rota, nenhum índice — quatro arquivos.

- `src/lib/domain/producao.ts`: `FichaParaProduzir.escolhas?` e `comboAEscolha(ficha)`, a
  forma executável de "kit com escolhas" sem precisar de `tipo`. `capacidadeDaFicha`
  devolve `null` para o combo (não há pergunta: "dá para quantos" depende de qual cookie);
  `reservaDeProducao` o pula; `fichasAbaixoDoPiso` herda o `null` e o pula sem uma linha.
  `reservadoNoPronto` conta cada escolha como `escolha.quantidade × item.quantidade` da
  receita escolhida — o `ponytail:` da 13D, pago para as escolhas; o comentário ficou,
  **estreitado** para o componente fixo de kit, que continua agregado pela ficha do kit.
- `src/components/pedidos/FormularioPedido.tsx`: a linha do combo faz uma pergunta por
  receita escolhida (`FraseCabeNoPedido` com `nome`, `unidades = escolha × linha`, `jaFeitas`
  e `prontos` daquela receita); a linha simples continua fazendo uma. `opcoesDeFornada`
  passou a somar **por ficha**: a linha do combo oferece as receitas escolhidas, e a mesma
  receita solta e dentro de um combo vira uma opção só, com as unidades somadas — a folha
  escolhe por `ficha.id`, e duas opções com o mesmo id colidiriam.
- `src/components/producao/FraseDaCapacidade.tsx`: `Frase` ganhou `rotulo?` (o nome da
  receita antes do separador), e `FraseCabeNoPedido` ganhou `nome?` para passá-lo. Sem isso
  duas frases "Dá: …" embaixo da mesma linha não diriam de qual cookie são.
- `/fichas`, `/compras` e o cartão da tela Hoje **não mudaram**: `LinhaFicha` já escondia
  capacidade `null`, `FraseDoPronto` já sumia com `prontos: null` (kit não tem pote, `#d97`), e
  `reservaDeProducao` é chamada com as fichas inteiras — o domínio pulando basta.
- Testes: **4 novos** (486 → 490) em `producao.test.ts`, com o caso de aceite da 14B: o combo
  sem capacidade (e o kit fixo com), piso e reserva pulando, os 3 do combo com dono no pote
  do tradicional e 7 livres dos 10 contados, e a escolha por unidade do kit (massa para 5 num
  pedido de 3 combos reserva 3).
- `DECISOES.md#d103` passou a vigente nas duas metades, com o que a 14B decidiu de execução.

Fora do escopo literal da spec, e por quê:

- **`opcoesDeFornada` soma por ficha.** A spec diz "as receitas escolhidas, cada uma com
  `escolha.quantidade × quantidade`"; com a mesma receita em duas linhas (solta e no combo,
  ou dois combos), `PainelFornada` acha a opção por `ficha.id` e a segunda seria inalcançável.
  Somar é o que a massa é: 3 do combo mais 5 soltos são massa para 8.
- **`jaFeitas` e `prontos` continuam por ficha, e cada linha vê o total** — marcado com
  `ponytail:` em `FormularioPedido`. Antes da 14A uma ficha aparecia numa linha só e isso não
  existia; agora "tradicional solto" e "tradicional no combo" no mesmo pedido leem a mesma
  massa feita. Se confundir, o abate passa a ser por linha, na ordem.
- **O combo com componente fixo _e_ escolhas não oferece o componente na fornada.** A spec
  diz "as receitas escolhidas", e é o que sai; o brownie fixo de uma "caixa presente" fica
  sem atalho de fornada pelo pedido (a fornada pela ficha continua servindo). Cabe numa linha
  quando aparecer.

**O que a 14B não provou.** O de sempre: `npm test` cobre `src/lib/domain/`, então as duas
frases na linha, o seletor da folha com as receitas somadas e `/fichas` sem número para o
combo não têm teste. O roteiro está na próxima ação.

## O que a sessão 015 deixou pronto

Nenhuma funcionalidade nova: é a varredura que a `#d80` prometeu, e o diff é apagar `await`.

- `mutations/insumos.ts`: `criarInsumo` com `doc()` + `setDoc`; `atualizarInsumo` despacha o
  `updateDoc` e chama `podarHistorico` e `marcarFichasDesatualizadas` **no mesmo tique** — era
  aqui que o selo de custo desatualizado se perdia sem rede; `arquivarInsumo` e
  `restaurarInsumo` despacham. `podarHistorico` e `marcarFichasDesatualizadas` continuam lendo
  antes de escrever, com a escrita despachada.
- `mutations/fichas.ts`: `criarFicha` com o mesmo conserto de id; `atualizarFicha` e
  `arquivarFicha` despacham.
- `mutations/listasCompra.ts`: `criarListaCompras` com o mesmo conserto; as outras quatro
  despacham. O `Promise.all` de `corrigirPrecoNaLista` saiu: com nada esperado, não há o que
  juntar.
- `mutations/metas.ts`: `salvarMeta` despacha a meta e depois o espelho — era aqui que o cartão
  da tela Hoje ficava sem meta quando ela era definida sem sinal.
- `mutations/configuracao.ts`: `salvarConfiguracao` despacha.
- `mutations/estoque.ts`: os dois `lote.commit()` despachados, de carona, sem mudar comportamento.
- `mutations/despachar.ts` diz que a regra vale para o diretório inteiro e nomeia as duas
  exceções; `notas.ts` ganhou o comentário que diz por que `importarNota` espera.
- `DECISOES.md#d104`.

O critério do `grep -n "await "` no diretório: sobram as leituras (`getDoc`, `getDocs`), as
duas exceções, e os `await` de `transacoes.ts` e `pedidos.ts` sobre `aplicarNoAgregado`,
`gravarTransacao` e primas — que **não são escrita**: já despacham por dentro e resolvem no mesmo
tique, como a 011 deixou. Nenhum arquivo em `src/components/` mudou. Os 490 testes são os mesmos,
porque nada disto mora em `domain/`.

## O que a sessão 016 deixou pronto

Uma varredura mais um conserto: toda consulta ganhou um recorte declarado (`#d105`), e a única
sem recorte — a agenda de `/pedidos` — ganhou o dela.

- `domain/pedido.ts`: `STATUS_NA_AGENDA` (o que `ehConcluido` não é) e `STATUS_CONCLUIDOS`.
  `tests/domain/pedido.test.ts` exige que os dois juntos sejam exatamente as chaves de
  `ROTULO_STATUS_PEDIDO`, sem repetição: um sétimo status não cai fora das duas consultas em
  silêncio. 490 → 491 testes.
- `mutations/pedidos.ts`: `consultaAgenda` (status in agenda, por data), `consultaHistorico`
  (status in, por data desc, `limit(n)`) e `consultaEntreguesEmAberto` (só igualdades, sem
  índice composto). Cada uma com o comentário dizendo o recorte e o índice.
- `firestore.indexes.json`: `pedidos` por `arquivado + status + dataEntregaISO`. **Publicado**
  (`firebase deploy --only firestore:indexes`) e **confirmado** (`firebase firestore:indexes`
  lista os três de `pedidos`).
- `ListaPedidos.tsx`: três assinaturas, `limite` como estado (30, voltando a 30 quando o filtro
  muda), o filtro de status concluído indo para a consulta do histórico, "Mostrar mais
  antigos" (secundário, largura cheia, 52px) abaixo do último grupo, o fim da lista só com
  snapshot do servidor, e a linha de contagem dizendo o que é exato ("12 na agenda", "os 30
  entregues mais recentes"). "A receber" soma `agenda ∪ entreguesEmAberto`; "Entregas a pagar"
  soma os três conjuntos por id — a agenda entra porque `entregasEsquecidas` lê dela.
- `DECISOES.md#d105`, com a tabela de recortes.

`LinhaPedido`, `EntregasAPagar`, `AReceber`, `AgendaHoje`, `useDespensaParaProduzir`,
`aReceber`, `entregasAPagar` e `repassesFeitos` não mudaram uma linha. O critério do
`grep -n "useColecao<" src/`, lido consulta por consulta: são 30 assinaturas, e cada uma cai
numa linha da tabela do `#d105` — 7 por `limit`, 7 por janela de tempo, 1 por competência, 13
pelo arquivo (5 de `insumos`, 7 de `fichas`, 1 de `clientes`) e as 3 de `/pedidos` por status
mais `limit`.

## Próxima ação

**Rodar o roteiro de sete passos da spec 015**, com DevTools em Offline do passo 1 ao 5. É o
único lugar onde a correção pode ser vista: `npm test` não toca no Firestore. O passo 1 é o que
decide se a leitura da spec estava certa — se o selo de "custo desatualizado" aparecer em
`/fichas` **antes** de religar a rede, está; e o passo 6 (fechar a aba, reabrir, religar) é o
que separa esta spec de um conserto de sensação.

**Rodar também o roteiro de sete passos da spec 016**, com `PAGINA_DO_HISTORICO` baixado para
3 durante o roteiro e devolvido para 30 antes do commit. O passo 1 é o que confirma que o
índice publicado é o que as duas consultas pedem (o console **não** pode dizer "query requires
an index"; se pedir uma segunda entrada com `DESCENDING`, é uma linha a mais em
`firestore.indexes.json`); o passo 3 — "A receber" com o mesmo número antes e depois de
"Mostrar mais antigos" — é o que prova que a leitura sobre `aReceber` está certa. Se der números
diferentes, pare: a faixa precisa de mais um conjunto além dos dois.

**Depois da 016, por ordem de valor**, e nenhuma delas com spec escrita ainda:

1. **Guarda de "sair sem salvar"** nos quatro editores que descartam em silêncio (ficha, pedido,
   configuração, contagem). Quatro telas, um hook.
2. **Tela de clientes**: `totalPedidos`, `totalGasto` e `ticketMedio` já são escritos e ninguém
   os lê (`#d35`). Traz junto arquivar cliente.
3. **O aviso de divergência cobrindo `produtos` e `porDia[].pedidos`**: exige a `/financeiro`
   assinar os pedidos pagos do mês (`#d81`).
4. **Spec de limpeza**: `pedidosAbertos`, `proximaEntrega`, `ultimoNumeroPedido` e
   `agregados/global` — escritos por três mutações, lidos por ninguém (`#d31`, `#d67`).

**8C e 13E continuam reservadas** para o que a Maynara devolver operando. Com o app publicado,
é de lá que a próxima spec deveria vir, e não da tabela de dívidas.

**Operacional, com rede, ainda sem confirmação neste arquivo**: `GEMINI_API_KEY` preenchida no
servidor (sem ela `POST /api/nota` responde `sem-configuracao`); "Recalcular o mês" em cada mês
que o aviso do `#d81` acusar, setembro de 2026 na frente; o "combo dupla" recriado como kit com a
escolha "2 de Cookie" (`#d102`); e `FormaPagamento.instrucoes` preenchida na forma "Pix"
(`#d98`). Nenhum dos quatro é código: são quatro toques na conta real.

O portão de conclusão foi rodado de verdade em 2026-09-12, no fim da 016, e passa nos quatro:
lint, typecheck, 491 testes e build com 17 rotas estáticas mais as dinâmicas. Portão passando não
é o mesmo que sistema pronto — nenhum dos quatro toca no Firestore nem abre um navegador —, e é
por isso que os roteiros da 015 e da 016 são a próxima ação, e não itens já fechados.

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

| Dívida                                                                                    | Onde                                           | Quando resolver                                                                                |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Acesso concedido por script, sem cadastro self-serve                                      | `scripts/conceder-acesso.mjs`                  | Segundo cliente pagante, junto de D10 (`DECISOES.md#d16`)                                      |
| `sair()` não limpa o cache do IndexedDB                                                   | `src/providers/AuthProvider.tsx`               | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento                    |
| Agregados incrementados no cliente                                                        | `src/lib/firebase/mutations/`                  | Segundo cliente pagante (`DECISOES.md#d10`)                                                    |
| Configuração aberta sem rede e sem cache diz "valores sugeridos"                          | `TelaConfiguracao.tsx`                         | Não tem conserto: cache vazio não distingue "não existe" de "não sei" (`#d43`)                 |
| Agregado do mês pode ficar torto se um delta se perder no caminho                         | `mutations/agregado.ts`                        | Tem escape: "Recalcular o mês" na tela. A troca real é a mesma de D10                          |
| Mudar um lançamento de mês não move o espelho da meta do mês destino                      | `mutations/transacoes.ts`                      | Mesmo escape e mesma troca: `DECISOES.md#d29`                                                  |
| Produto revertido sobra zerado no agregado até recalcular                                 | `mutations/agregado.ts`                        | `produtosOrdenados` o esconde na leitura; recalcular limpa (`#d37`)                            |
| `ultimoPedidoEm` do cliente não volta atrás ao desfazer um pagamento                      | `mutations/clientes.ts`                        | Só com histórico de pagamentos, que não existe (`#d37`)                                        |
| Cliente ainda não tem tela: os agregados dele andam e ninguém os lê                       | `mutations/clientes.ts`                        | Quando "quem mais compra de mim" virar pergunta real (`#d35`)                                  |
| Meta não guarda histórico: reescrever o alvo apaga o anterior                             | `mutations/metas.ts`                           | Se "que meta eu tinha antes" virar pergunta real (`DECISOES.md#d27`)                           |
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue                             | `src/lib/types/fichas.ts`                      | Se "produto fora de linha" virar diferente de "arquivado"                                      |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g                                | `FormularioFicha.tsx`                          | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor                          |
| `Bloco` e `BlocoConfiguracao` continuam primos                                            | `src/components/`                              | Se a configuração precisar do mesmo bloco; hoje ela tem rodapé próprio                         |
| Não dá para arquivar uma cliente: só cadastrar e editar, de dentro do pedido              | `mutations/clientes.ts`                        | Junto da tela de clientes, quando ela existir (`DECISOES.md#d35`)                              |
| Editar um pedido e sair sem salvar descarta em silêncio                                   | `FormularioPedido.tsx`                         | Mesma dívida do editor de ficha e da configuração; se acontecer de verdade                     |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`                          | `src/lib/types/configuracao.ts`                | **Ganhou leitor na 010**: o resumo da cliente. Espelho velho agora sai na mensagem             |
| Sair da configuração com alteração pendente descarta em silêncio                          | `TelaConfiguracao.tsx`                         | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual                         |
| Dois toques no mesmo quadro na lista de compras podem perder uma marca                    | `ListaDoMercado.tsx`                           | Se acontecer: `comprado` sai do array e vira mapa por `insumoId` (`#d40`)                      |
| A contagem existe e depende de ela contar: sem contar, a lista compra o cheio             | `/insumos/contagem`                            | Não tem conserto em código: as defesas são o erro barato e a semeadura pela compra             |
| A tela de contagem, o lote, as frases de `/compras` e a semente sem teste                 | `components/estoque/`, `compras/`              | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                      |
| A frase da lista desatualizada não sabe **o que** mudou, só que mudou                     | `ListaDoMercado.tsx`                           | Exigiria guardar quando a lista foi montada e comparar com cada contagem (`#d63`)              |
| Sair da contagem sem salvar descarta em silêncio                                          | `TelaContagem.tsx`                             | Mesma dívida do editor de ficha, do de pedido e da configuração                                |
| A rota, a tela da nota, a gravação em lote e a guarda do caixa sem teste                  | `api/nota/`, `components/notas/`               | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                      |
| Cadastrar a nota espera o servidor: sem rede o botão fica preso em carregando             | `TelaNota.tsx`                                 | Não incomoda hoje — a tela já exigiu rede para ler (`#d50`); se incomodar, `#d40`              |
| O cache de CNPJ vive na memória do processo e morre no reinício                           | `api/nota/route.ts`                            | Só se a cota de 3/min por IP apertar, que é o dia do segundo cliente (`#d52`)                  |
| Reler uma nota exige fotografar de novo: a imagem não é guardada                          | `api/nota/route.ts`                            | Se "ver a nota do mês passado" virar pergunta real, nasce com Storage (`#d49`)                 |
| A guarda de duplicidade depende de o modelo ler o mesmo CNPJ nas duas fotos               | `domain/notaFiscal.ts`                         | Passo 7 do roteiro da 006 é quem responde; falhando, entra o QR Code da NFC-e                  |
| Nota sem CNPJ legível lança sem guarda: a mesma nota pode entrar duas vezes               | `TelaNota.tsx`                                 | Não tem conserto barato: chave por nome sai diferente de duas fotos (`#d54`)                   |
| Duas notas da mesma loja, no mesmo dia, com o total ilegível nas duas colidem             | `domain/notaFiscal.ts`                         | Falso positivo visível, desfeito em um toque; se acontecer, a chave ganha a hora               |
| `agregados/global` é escrito por três mutações e lido por ninguém                         | `types/financeiro.ts`                          | Se algum leitor aparecer; a 008 decidiu não ser ele (`#d67`)                                   |
| `pedidosAbertos`, `proximaEntrega` e `ultimoNumeroPedido` nunca são escritos              | `types/financeiro.ts`                          | Spec de limpeza, como a remoção de `estoqueMinimo` na 7A. Ninguém os lê hoje                   |
| O cartão, a página, o gancho e a escrita na conta, sem teste                              | `components/comecar/`                          | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                      |
| Os cinco textos do começo saíram do código, e não do que a 5B viu                         | `domain/onboarding.ts`                         | **Vencida**: a 5B rodou. Releitura curta, sem código — cabe de carona em qualquer spec         |
| Um passo fecha com o documento existindo, e não com ele estando bom                       | `domain/onboarding.ts`                         | Não tem conserto: o caminho diz onde ela está, e não se ela fez bem                            |
| `/comecar` nunca foi vista em 360px nem no tema claro, e não há captura                   | `components/comecar/`                          | Critério da 8B em aberto: depende de navegador, de login e de conta de verdade                 |
| O bloco de instalar nunca foi visto sumindo com o app instalado                           | `InstalarNaTela.tsx`                           | Critério da 8B em aberto: exige instalar de fato, no iPhone e no Android                       |
| Não há diretório de capturas no repositório, e o protocolo da 5B pedia um                 | `docs/`                                        | A 5B rodou sem arquivar captura. Fica se um dia houver o que comparar com o de antes           |
| `LIMITE_ARQUIVO_BYTES` é 8 MB e o Vercel corta o corpo em 4,5 MB (~3,3 MB)                | `domain/notaFiscal.ts`                         | Se PDF de nota grande virar rotina: baixar para 3 MB e recusar antes do upload                 |
| A chave de conta de serviço fica legível no painel e não gira sozinha                     | `FIREBASE_SERVICE_ACCOUNT`                     | No dia do SaaS: gerenciador de segredos com rotação (`#d72`)                                   |
| O roteiro A da 009 nunca rodou: nenhuma tela foi vista com o teclado aberto               | `ui/RodapeFixo.tsx`, `globals.css`             | Exige Android na mão. Seis telas que funcionavam foram editadas sem teste por trás             |
| A barra vinho nunca foi vista no aparelho: o WebAPK assa a cor na instalação              | `app/manifest.ts`                              | Roteiro B: o deploy já existe; falta desinstalar e reinstalar o app no Android                 |
| 560px é limiar chutado: aparelho pequeno com fonte aumentada pode entrar nele             | `globals.css`                                  | Degradação feia, não quebra. O conserto é `visualViewport` (`#d74`)                            |
| O `wa.me` nunca foi aberto: ninguém viu a mensagem chegar escrita na conversa             | `pedidos/BlocoWhatsApp.tsx`                    | Roteiro de aparelho da 010: exige celular com WhatsApp instalado, e depois desktop             |
| O resumo pode ser mandado sem o pedido estar salvo                                        | `FormularioPedido.tsx`                         | Aceito em `#d78`; se morder, o botão salva antes de abrir o link                               |
| A mensagem não diz as observações, nem quando são recado da cliente                       | `domain/whatsapp.ts`                           | Só com um segundo campo de dono declarado — não relaxando este (`#d79`)                        |
| Não se sabe se ela apertou enviar: o link não devolve nada                                | `pedidos/BlocoWhatsApp.tsx`                    | Não tem conserto neste canal; gravar "enviado" sem saber seria pior (`#d77`)                   |
| Os meses já tortos continuam tortos até alguém apertar "Recalcular o mês"                 | `agregados/{'YYYY-MM'}`                        | Próxima ação, com rede: um mês por vez, guiada pelo aviso do `#d81`                            |
| Escrita recusada pelas regras falha calada, só no console — agora em `mutations/` inteiro | `mutations/despachar.ts`                       | Volta à mesa se existir papel com permissão parcial (`#d80`, `#d104`)                          |
| Ficha nunca aberta neste aparelho não ganha selo quando o preço muda offline              | `marcarFichasDesatualizadas`                   | Se doer: a tela passa os `fichaIds` que já tem, e não uma segunda consulta (`#d104`)           |
| O roteiro de sete passos da 015 nunca rodou: o selo e o espelho offline sem prova         | `mutations/insumos.ts`, `metas.ts`             | Próxima ação, com DevTools em Offline; `npm test` não toca no Firestore                        |
| O aviso de divergência não cobre `produtos` nem `porDia[].pedidos`                        | `domain/caixa.ts`                              | Exigiria a `/financeiro` assinar a consulta de pedidos pagos do mês (`#d81`)                   |
| Arquivar o acerto direto em `/financeiro` deixa os pedidos marcados                       | `components/financeiro/`                       | Se acontecer de verdade: vira guarda na tela, como a da nota (`#d52`)                          |
| `lucroEstimado` do pedido continua com a taxa de entrega dentro                           | `domain/pedido.ts`                             | Quem fecha a conta é o caixa; corrigir mexeria em todo pedido gravado (`#d82`)                 |
| A entrega que ela esqueceu de marcar só é paga na semana seguinte                         | `domain/pedido.ts`                             | Não tem conserto em código: a frase do painel é a defesa (`#d83`)                              |
| A faixa, o painel, o lote do repasse e a saída em `ENTREGA` sem teste                     | `components/pedidos/`                          | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                      |
| A fornada existe e depende de ela registrar: sem registrar, nada muda                     | `components/producao/`                         | Não tem conserto em código: a spec é aditiva de propósito (`#d91`)                             |
| Fornada com `pedidoId` mais velha que 30 dias sai do abate do pedido                      | `mutations/fornadas.ts`                        | Se houver encomenda assada com mais de um mês: a janela vira a maior data de entrega           |
| A fornada aberta pela ficha nasce sem pedido, mesmo quando era para um                    | `FormularioFicha.tsx`                          | Se ela registrar pela ficha e a lista comprar de novo: índice `fichaIds` + `arquivado`         |
| A folha, as duas entradas, a consulta e as frases do forno sem teste                      | `components/producao/`, `compras/`, `estoque/` | `npm test` cobre só `domain/`; o que fecha isso é o roteiro da 13A em navegador                |
| Entrega paga pela cliente e nunca acertada some de "Entregas a pagar" ao cair da página   | `ListaPedidos.tsx`                             | Se for inaceitável: `entrega.repassePendente` gravado por quatro mutações + backfill (`#d105`) |
| O roteiro de sete passos da 016 nunca rodou: índice e "A receber" por página sem prova    | `ListaPedidos.tsx`, `mutations/pedidos.ts`     | Próxima ação, com `PAGINA_DO_HISTORICO` em 3; `npm test` não toca no Firestore                 |
