# Estado do projeto

Atualizado em 2026-09-19 (spec 023 entregue, primeira da fase 1 do roadmap; a 024 entregue
depois dela, a segunda da fase 1; mais a 034 entregue por cima da 033, o primeiro passe de
navegador sobre as duas, `#d131`; **033 e 034 por publicar juntas**; roteiros das 015, 016, 017,
018, 019, 020, 021, 022, 023, 024, 033 e 034 por rodar).
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

**Em 2026-09-18 o produto ganhou marca própria: Rende.** A decisão de quem conduz o projeto
reverte o primeiro item do `#d111` ("MyCookie's continua sendo a marca do produto"); o brief
está em `docs/saas/BRIEF-MARCA.md`, o pacote aprovado em `docs/marca/rende/` (MARCA.md,
DESIGN.md, tokens.css, logo/, pranchas), e a spec que o leva ao código é
`specs/033-a-marca-rende.md`, em três sessões — **A** (a tinta: tokens, fontes, o que era da
MyCookie's e sai do CSS), **B** (o nome e o símbolo: logotipo, ícones, manifesto, telas de
marca) e **C** (o ponto, a faixa, a cópia e a passagem do `/impeccable`). **A e B saem no mesmo
deploy.** **As três estão entregues** (`#d122` a `#d127`): o repositório está na tinta do
Rende nos dois temas, Archivo no lugar da Fraunces, `DESIGN.md` e `PRODUCT.md` da raiz
reescritos, o app se chama Rende na aba, no manifesto e na barra lateral, o ícone é a régua com
o ponto, nenhum biscoito sobrou fora do texto de produto, e a C pôs as duas assinaturas onde
o manual manda (o ponto no painel de preço e nos estados vazios, a faixa de composição no
editor de produto, com dado de verdade), reescreveu os cinco estados vazios na voz da marca,
levou o slogan da folha para `ConfiguracaoGeral.frase` e passou o `/impeccable` (critique
29/40 antes, 30/40 depois; os relatórios estão na seção da C). **Pode publicar**: as três juntas, e depois o passo 8 do
roteiro (reinstalar o app no aparelho, `#d124`) e a frase em `/configuracao` (`#d127`). O app
publicado hoje ainda é vinho e creme. A 033 está fora da ordem do roadmap de propósito
(023–032 são citados na 022 e nas decisões); a fase 1 volta a ser o próximo passo depois dela.

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

A spec `017-orcamento-em-papel.md` está **entregue nas duas sessões**: o orçamento para empresa
é uma folha A4 que o navegador imprime (`#d106`), lida do documento gravado (`#d107`), com a
validade como campo do pedido e a emissão como o dia da impressão (`#d110`). A **17A** fez o
módulo puro (`domain/orcamento.ts`), a rota (`/pedidos/[id]/orcamento`), o bloco no editor e
`Pedido.validoAteISO`. A **17B** deu à folha a foto e a descrição de cada produto (da ficha
viva, `#d108`), o telefone e o Instagram no rodapé e a assinatura sobre a linha, com as duas
imagens gravadas como `data:` URL dentro do documento e reduzidas no aparelho (`#d109`). Quatro
campos opcionais (`FichaTecnica.descricao`, `ConfiguracaoGeral.contato` e `assinaturaDataUrl`,
mais `fotoUrl` que já existia e passou a ser escrito), um componente (`CampoImagem`), nenhuma
rota, nenhuma regra, nenhum índice, nenhuma dependência. **O roteiro de aparelho de oito passos
não rodou em nenhuma das duas sessões**: o PDF de verdade, nos três sistemas, é o que decide se
o `#d106` estava certo, e o passo 8 é o único lugar onde a foto e a assinatura são vistas no papel.

Fora das specs, em 2026-09-11, `/comecar` foi relida contra as specs 009 a 014. Pelo `#d70` o
guia só ensina o que mora em tela que ela ainda não abriu, e o que faltava era uma só:
`/fichas/contagem` entrou em "O que mais tem aqui" como a quarta tela fora do menu ("O que está
pronto", com o momento da semana), e "Quando não tem internet" passou a listar registrar a
fornada. O WhatsApp, o acerto das entregas, o aviso do agregado e o combo moram em telas que ela
já abre, e ficam onde estão; a única cópia tocada fora de `/comecar` foi a explicação do tipo
"Kit" no editor de ficha, que agora diz que o kit também pode ser o combo em que a cliente
escolhe os sabores. Nenhum número de exemplo entrou.

Fora das specs, em 2026-09-11, o resumo do WhatsApp passou a dizer **como pagar**: `FormaPagamento.instrucoes` (texto livre em `/configuracao`, "Dados para pagar") entra na mensagem em parágrafo próprio enquanto o pedido não está pago (`#d98`). Nenhum dado bancário no código: **a conta real precisa preencher o campo na forma "Pix" uma vez.**

Do mesmo tipo, em 2026-09-18 (spec 033-C, `#d127`): o slogan da folha do orçamento deixou de ser constante e virou `ConfiguracaoGeral.frase` ("Frase do orçamento" em `/configuracao`). **A conta real precisa preencher o campo uma vez** com "Feito com amor em cada mordida.", senão a folha sai sem a frase que as clientes dela leem há meses.

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

Portão de conclusão passando: lint limpo, typecheck limpo (app e service worker), **547
testes** (526 até a 018; 535 com a 033-C; 536 com a 034; 547 com a 024), e build com 17 rotas estáticas — `/insumos/nota` entrou na lista na 6A,
`/insumos/contagem` na 7A, `/comecar` na 8A e `/fichas/contagem` na 13D — mais `/api/nota`,
`/fichas/[id]`, `/pedidos/[id]` e `/pedidos/[id]/orcamento` (17A) dinâmicas e service worker
gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras publicadas,
chave de conta de serviço no disco (fora do git, coberta por `*firebase-adminsdk*.json`).
**Os índices estão todos publicados**: a 4A rodou `firebase deploy --only firestore:indexes`
e levou junto o de `fichas`, pendente desde a 2B; a 3A rodou de novo com os dois novos, a 3B
com o do pedido pago e a 3C com o da lista de compras. Confirmado com
`firebase firestore:indexes`: `insumos`, `fichas`, `transacoes`, `clientes` (`arquivado` +
`nomeBusca`), `listasCompra` (`arquivado` + `criadoEm` desc), `fornadas` (`arquivado` +
`dataISO` desc, publicado na 13A) e `pedidos` em quatro — `arquivado` + `dataEntregaISO` para a
tela Hoje e o horizonte de compras, `arquivado` + `competenciaPagamento` + `pagoEm` desc para
"Recalcular o mês", e `arquivado` + `status` + `dataEntregaISO` em `ASC` (agenda) e `DESC`
(histórico) para `/pedidos` (publicados na 016).

A conta existe e o acesso foi concedido de ponta a ponta, com o script rodando contra o
projeto de verdade:

```
contas/mycookies  { nome: "MyCookie's", proprietaria: "Maynara", criadaEm, v: 1 }
claim de fcbfilipesantos@gmail.com  { contas: { mycookies: "DONA" } }
```

`proprietaria` é do negócio, não do login: é o nome que a saudação da tela Hoje mostra.
Para trocar, `npm run conceder-acesso -- <email> mycookies "MyCookie's" <NomeNovo>` — o
script atualiza os campos quando a conta já existe, e passou a criar o login também (sem
senha) quando o e-mail ainda não tem um (`DECISOES.md#d119`).

A verificação visual está feita: a primeira rodada (desktop, tema escuro) corrigiu três coisas
— ver "O que a verificação visual já corrigiu" — e a 5B fechou o resto: tema claro, celular e
os números digitados de ponta a ponta.

## Módulos

| #   | Módulo                                      | Estado                              | Spec                                       |
| --- | ------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                              | —                                          |
| 1   | Insumos e embalagens                        | pronto                              | —                                          |
| —   | Contas e tenancy                            | pronto                              | `specs/000-contas.md`                      |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)                    | `specs/002-precificacao.md`                |
| 3   | Vendas, pedidos e lista de compras          | pronto (3A, 3B e 3C)                | `specs/003-pedidos.md`                     |
| 4   | Caixa, metas e previsão                     | pronto (4A e 4B)                    | `specs/004-caixa.md`                       |
| 5   | Prontidão: conserto e verificação           | pronto (5A e 5B)                    | `specs/005-prontidao.md`                   |
| 6   | Leitura de nota fiscal por IA               | pronto (6A e 6B)                    | `specs/006-nota-fiscal.md`                 |
| 7   | Estoque com idade e contagem da despensa    | pronto (7A e 7B)                    | `specs/007-estoque.md`                     |
| 8   | Onboarding: o caminho das primeiras semanas | pronto (8A e 8B)                    | `specs/008-onboarding.md`                  |
| —   | O teclado aberto e a barra do sistema       | pronto, sem os roteiros             | `specs/009-teclado-e-barra.md`             |
| —   | O resumo do pedido no WhatsApp              | pronto, sem o roteiro               | `specs/010-resumo-no-whatsapp.md`          |
| —   | O caixa que não perde a conta               | pronto, sem o roteiro               | `specs/011-caixa-que-nao-perde-conta.md`   |
| —   | O acerto das entregas                       | pronto, sem o roteiro               | `specs/012-entregas-a-pagar.md`            |
| 13  | A fornada                                   | pronto (13A a 13D), sem os roteiros | `specs/013-a-fornada.md`                   |
| 14  | O combo à escolha                           | pronto (14A e 14B)                  | `specs/014-combo-a-escolha.md`             |
| 15  | Salvar no toque, no sistema inteiro         | pronto, sem o roteiro               | `specs/015-salvar-no-toque.md`             |
| 16  | As listas que crescem                       | pronto, sem o roteiro               | `specs/016-listas-que-crescem.md`          |
| 17  | O orçamento em papel                        | pronto (17A e 17B), sem o roteiro   | `specs/017-orcamento-em-papel.md`          |
| 18  | O preço no primeiro minuto                  | pronto, sem o roteiro               | `specs/018-o-preco-no-primeiro-minuto.md`  |
| 19  | O caminho começa pelo preço                 | pronto, sem o roteiro               | `specs/019-o-caminho-comeca-pelo-preco.md` |
| 20  | Menos na frente                             | pronto, sem o roteiro               | `specs/020-menos-na-frente.md`             |
| 21  | As palavras dela                            | pronto, sem o roteiro               | `specs/021-as-palavras-dela.md`            |
| 22  | A segunda conta                             | pronto, sem o roteiro               | `specs/022-a-segunda-conta.md`             |
| 23  | Sair sem salvar                             | pronto, sem o roteiro               | `specs/023-sair-sem-salvar.md`             |
| 24  | Fichas no vermelho                          | pronto, sem o roteiro               | `specs/024-fichas-no-vermelho.md`          |
| 33  | A marca Rende                               | pronto (A, B e C), por publicar     | `specs/033-a-marca-rende.md`               |
| 34  | A tela inteira                              | pronto, por publicar com a 033      | `specs/034-a-tela-inteira.md`              |

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
- `firestore.indexes.json`: `pedidos` por `arquivado + status + dataEntregaISO`, em duas
  entradas, `ASC` e `DESC`. A spec apostou numa só; a tela abriu com "Não deu para carregar
  seus pedidos", e as três consultas rodadas com o Admin SDK apontaram o histórico pedindo a
  `DESC`. **Publicadas** e **confirmadas**: depois de o índice terminar de construir, a
  consulta do histórico devolve 30 documentos — a conta real tem mais de 30 concluídos, então
  o botão "Mostrar mais antigos" aparece sem baixar `PAGINA_DO_HISTORICO`.
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

## O que a sessão 17A deixou pronto

A folha inteira, com o que o sistema já sabe. A 17B dá a ela a foto, a descrição, o contato e
a assinatura.

- `src/lib/types/vendas.ts`: `Pedido.validoAteISO?`, o único campo novo, opcional e
  compatível. `esquemaPedido` confere só a forma; `DadosPedido.validoAteISO` é gravado por
  spread condicional em `corpoDoPedido`, que serve a `criarPedido` e `atualizarPedido`.
- `src/lib/domain/datas.ts`: `rotuloDataCompleta` ('15 de setembro de 2026'), com teste.
- `src/lib/domain/orcamento.ts`, **módulo novo e puro**: `DIAS_DE_VALIDADE`, `validadeSugerida`,
  `situacaoDaValidade`, `montarOrcamento` e `frasesDoCombinado`. As entradas são `Pick`s
  (`PedidoParaOrcar`, `FichaParaOrcar`, `ConfiguracaoParaOrcar`), pelo motivo de
  `PedidoParaEntrega`: `Timestamp` não atravessa para o domínio, e o teste monta só o que a
  folha lê. `FichaParaOrcar.descricao`, `ConfiguracaoParaOrcar.contato` e `assinaturaDataUrl`
  já estão tipados aqui para a 17B não reabrir o domínio; ninguém os grava ainda.
- `tests/domain/orcamento.test.ts`: **17 testes** (491 → 509 com o de `datas`), com o pedido
  da Tal Eventos número por número e o "Combinado" comparado inteiro, na ordem. Mais o sábado
  no masculino ("Entrega no sábado"), o ponto que não dobra quando as instruções já terminam
  com um, e os campos da 17B lidos de uma ficha e de uma configuração que já os tenham.
- `src/components/pedidos/BlocoOrcamento.tsx`: "Orçamento para empresa", logo acima do
  WhatsApp, com o campo "Válido até" (`Campo` nativo de data, `min` em hoje), a situação em uma
  linha (com o triângulo em vencido e vence-hoje) e o `Link` para a folha. `FormularioPedido`
  ganhou `valores.validoAteISO`: no pedido que existe e ainda é orçamento, nasce com a
  sugestão; no pedido novo nasce vazio, porque o bloco não aparece lá e sugestão que ela não
  viu não vira dado (`#d17`).
- `src/components/pedidos/FolhaOrcamento.tsx`: a folha da seção "A folha" da spec, só
  apresentação, em pontos e milímetros, sem nenhuma classe `dark:`. `Valor` é o `Dinheiro` em
  `em`, para seguir a escala da folha e não a da tela.
- `src/components/pedidos/TelaOrcamento.tsx` e a rota `/pedidos/[id]/orcamento`: carrega o
  pedido pelo id, as fichas vivas sem `orderBy`, a configuração e a conta, e só então monta.
  Barra com "Voltar ao pedido" e "Salvar em PDF" (`window.print()`), o aviso de vencido, e a
  prévia encolhendo por `zoom` medido com `ResizeObserver` em ref de função.
- `src/app/globals.css`: `@utility folha` (tokens claros, `color-scheme: light`,
  `print-color-adjust`, A4 com a margem como `padding`, `zoom: var(--folha-zoom, 1)`) e o
  `@media print` (`@page` A4 sem margem, fundo branco, textura desligada, folha sem sombra e
  sem zoom).
- `AppShell`, `BarraLateral` e `NavegacaoInferior`: quatro classes `print:`, nada muda em
  tela. `Marca.tsx`: `DESCRITOR` e `SLOGAN` exportados, `Logotipo` com `orientacao`
  ("horizontal" no cabeçalho da folha, "vertical" como padrão, intacto).
- `EditorPedido.tsx`: o estado vazio de "Este pedido não está aqui" virou `PedidoNaoEncontrado`,
  usado pelo editor e pela folha.
- Decisões novas em `DECISOES.md#d106` a `#d110` — as cinco da abertura da spec, escritas nesta
  sessão; a `#d108` e a `#d109` são executadas na 17B.

Fora da letra da spec, e por quê:

- **A unidade de uma ficha que rende em peso é `'g'`, e não `'kg'`.** A spec pedia `'kg'` para
  quantidade `1,5`; o preço do pedido é por unidade de rendimento (por grama), e "1,5 kg" ao
  lado de um preço por grama mentiria. Registrado em `#d108`. Se a Maynara vender por quilo um
  dia, a conversão nasce junto do campo de unidade da linha, e não como rótulo.
- **O combo sai como "Combo dupla (1 Tradicional + 1 Red Velvet)"**, com o `+` que o WhatsApp
  já usa: a spec escreveu vírgula, mas é a mesma `nomeComEscolhas`, e duas seriam duas ordens.
- **"Venceu em 22 de setembro de 2026"**, com ano, no bloco e na barra: `rotuloDataCompleta` é
  a única função nova de data, e um orçamento vencido do ano passado sem o ano seria ambíguo.
- **O lockup horizontal usa o `lg` que existe** (biscoito de 64 px, nome a 2,5 rem ≈ 30 pt), e
  não os 14 mm / 26 pt da spec: uma segunda tabela de escala só para a folha seria um tamanho
  com nome de uso. Se ficar grande no papel, é o passo 1 do roteiro que diz.
- **`PedidoNaoEncontrado` extraído do editor**, para a folha cair no mesmo estado vazio sem
  duplicar o texto.

**O que a 17A não provou.** O de sempre, e mais um: `npm test` cobre `src/lib/domain/`, então
o bloco, a barra, o `zoom` e o CSS de impressão não têm teste, e **nenhum PDF foi gerado nesta
sessão**. Os passos 1 a 7 do roteiro de aparelho (o `#d106` em Chrome, tema escuro, Android,
iPhone, validade vencida, doze itens e 360 px) são a próxima ação.

## O que a sessão 17B deixou pronto

A foto, a descrição, o contato e a assinatura: o que faz o gestor olhar duas vezes. O domínio
já lia os quatro desde a 17A; esta sessão os fez existir.

- `src/lib/types/fichas.ts`: `FichaTecnica.descricao?`, e o comentário de `fotoUrl` passou a
  dizer o que ele carrega (JPEG de até 320 px e 80 KB como `data:` URL). `esquemaFicha` ganhou
  `descricao` com o teto de 240 caracteres (`DESCRICAO_MAX` em `schemas.ts`).
- `src/lib/types/configuracao.ts`: `ConfiguracaoGeral.contato?` (`telefone`, `instagram`) e
  `assinaturaDataUrl?`. `esquemaConfiguracao` ganhou os dois, opcionais, sem regra além da forma.
- `src/lib/domain/orcamento.ts`: os quatro tetos (`FOTO_LADO_PX`, `FOTO_MAX_BYTES`,
  `ASSINATURA_LADO_PX`, `ASSINATURA_MAX_BYTES`) e `tamanhoDoDataUrl`, que conta os bytes da
  imagem pelo comprimento do base64 sem decodificá-la. `FichaParaOrcar` e
  `ConfiguracaoParaOrcar` viraram `Pick`s puros, porque os campos agora existem nos tipos.
- `src/lib/utils/imagem.ts`: `reduzirImagem(arquivo, { ladoMaximo, formato, qualidade })`
  devolve o `data:` URL, e `prepararParaLeitura` passou a chamá-la com os mesmos 1600 px / JPEG
  0,8 da nota, devolvendo o mesmo par `{ mimeType, dados }` sem prefixo. O fundo branco é
  pintado só em JPEG; PNG preserva a transparência da assinatura.
- `src/lib/firebase/mutations/fichas.ts`: `DadosFicha.descricao?` e `fotoUrl?: string | null`.
  `corpoDaFicha` grava os dois quando há; `atualizarFicha` apaga com `deleteField()` quando a
  foto chega `null` ou a descrição chega vazia, porque chave ausente em `updateDoc` deixaria o
  valor velho no lugar.
- `src/lib/firebase/mutations/configuracao.ts`: `DadosConfiguracao.contato?` e
  `assinaturaDataUrl?`. A escrita usa `deleteField()` para o vazio, pelo mesmo motivo com
  `merge: true`: "Tirar" a assinatura precisa tirá-la do documento.
- `src/components/ui/CampoImagem.tsx`, **componente novo**: o `<input type="file">` escondido
  atrás de um botão secundário, a prévia (quadrada de 96 px para a foto, 200 × 64 em
  `object-fit: contain` para a assinatura) sobre `--surface-sunken`, o terciário "Tirar" quando há
  imagem, e a frase de erro com o triângulo quando a redução passa do teto ou o navegador não
  desenha o formato. Chama `reduzirImagem` antes de o formulário saber da imagem.
- `src/components/ui/Campo.tsx`: `prefixo`, o espelho de `sufixo`, para o `@` fixo do Instagram.
- **Foto com fundo transparente**, pedida na sessão: arquivo PNG preserva o alpha (WebP onde o
  navegador codifica, PNG no Safari), com teto de 200 KB (`FOTO_COM_ALPHA_MAX_BYTES`) no lugar
  dos 80 KB do JPEG; `temAlpha(dataUrl)` decide `contain` sem o quadrado, na folha e na prévia.
  `CampoImagem` ganhou `comAlpha`, e só a ficha o passa. Registrado como ajuste no `#d109`.
- `FormularioFicha.tsx`: "Como você apresenta" (textarea de 2 linhas, contador em `micro`
  quando passa de 200) e "Foto" no bloco "O produto". `/fichas` continua sem miniatura.
- `TelaConfiguracao.tsx`: o sexto bloco, "Na folha do orçamento", entre "Formas de pagamento" e
  "Preço padrão", com Telefone, Instagram e Assinatura. Vai na mesma escrita que o resto (`#d17`);
  a frase de "você mudou" cobre o bloco sem código novo.
- `FolhaOrcamento.tsx`: a coluna da miniatura (22 mm, só quando `temFoto`; sem foto, o quadrado
  vazio em `--surface-sunken`), a descrição em 9,5 pt até duas linhas, a assinatura apoiada na
  linha (até 60 × 20 mm, `object-fit: contain`) e o rodapé com telefone e Instagram.
- `tests/domain/orcamento.test.ts`: **6 testes novos** (509 → 515): ficha arquivada sem foto e
  sem descrição mesmo com a viva tendo as duas, `temFoto` com uma foto só e descrição em branco
  que não entra, Instagram com e sem `@` e contato em branco calado, e `tamanhoDoDataUrl` nos
  três enchimentos e dos dois lados de cada teto.

Fora da letra da spec, e por quê:

- **Vazio apaga, com `deleteField()`, em vez de "spread condicional".** A spec pedia a escrita
  por spread condicional, que é a regra do `#d54`; mas `salvarConfiguracao` grava com
  `merge: true`, e `atualizarFicha` com `updateDoc`: nos dois, chave ausente deixa o valor velho
  no lugar, e "Tirar a foto" não tiraria nada. É a mesma dívida que o `#d110` registrou para
  `validoAteISO`, evitada aqui porque as duas telas sempre sabem o valor inteiro do campo.
- **`CampoImagem` como primitivo em `ui/`**, e não dois pares botão-prévia. A foto da ficha e a
  assinatura são o mesmo gesto com duas medidas; dois seriam duas frases de erro esperando
  para divergir.
- **`reduzirImagem` devolve por `toDataURL`, e não por `toBlob` mais `FileReader`.** O JPEG
  que sai é o mesmo, com uma etapa a menos; a nota fiscal continua recebendo o base64 sem
  prefixo.

**O primeiro PDF de verdade saiu na mesma sessão** (pedido de três linhas com foto, Chrome,
desktop), e ele corrigiu duas coisas antes do roteiro: uma faixa branca no topo, porque o
`pt-4 lg:pt-6` da `TelaOrcamento` sobrevivia à impressão (agora `print:pt-0`, e `print:pl-0`
no recuo da barra lateral por segurança); e o rodapé sozinho numa segunda página, porque três
miniaturas de 22 mm fizeram o conteúdo passar dos 297 mm em uns 20 mm. O ritmo vertical da
folha encolheu para caber com folga: miniatura de 20 mm, linhas com 6 pt de respiro, os
respiros de seção abaixo do filete em 20 pt (e não 24), o vão da assinatura em 16 mm e o
rodapé com 12 pt acima. A ficha, a configuração, o `CampoImagem` e a foto no papel foram
vistos funcionando nesse PDF; **a assinatura, o WebP no Android, o PNG no iPhone e a coluna
sumindo num pedido sem foto** continuam sendo o passo 8 do roteiro.

O PDF também mostrou o que a 17A não tinha como ver: com `@page { margin: 0 }` e a margem
como `padding` da folha, **a segunda página de um pedido longo começa na borda do papel**, sem
os 16 mm de cima, e a primeira vai até a borda de baixo. Está na tabela de dívidas; o passo 6
do roteiro (doze itens) é onde se decide se a margem vai para o `@page`.

## O que a sessão 018 deixou pronto

A primeira spec da fase 0 do roadmap: um botão que instala 25 insumos com preço médio e duas
fichas-modelo já precificadas, e cai direto na ficha-modelo aberta com o preço no rodapé.

- `src/lib/domain/biblioteca.ts`: `PREFIXO_BIBLIOTECA`, `ehDaBiblioteca`, `temPrecoMedio`,
  `insumosComPrecoMedio`, `INSUMOS_DA_BIBLIOTECA` (25), `FICHAS_DA_BIBLIOTECA` (2) e
  `montarBiblioteca`, que resolve cada item da ficha contra o insumo da própria biblioteca com
  `calcularCustoInsumo`. Puro, sem Firebase.
- `tests/domain/biblioteca.test.ts`: forma dos 25 e das 2 (id sem repetição, preço inteiro
  positivo, perda em 0–99, categoria válida), referência de todo item a um id da própria
  biblioteca, prefixo em todo documento que `montarBiblioteca` devolve, e o caso de aceite dos
  dois cookies número por número — R$ 3,30 e R$ 5,90 no clássico, R$ 7,19 e R$ 12,90 no
  recheado, com `CONFIGURACAO_SUGERIDA`.
- `DECISOES.md#d114`: revisa a metade do `#d17` que mandava calcular com rateio zero sem
  configuração salva. Zero também é um número inventado, e é o pior deles. `rateioDaConta` e
  `precificacaoPadraoDaConta` (`mutations/configuracao.ts`) são o único lugar que decide
  "salvo, senão sugerido" — o editor de ficha e a biblioteca chamam as duas.
  `SEM_RATEIO` saiu de `custoFicha.ts`, sem chamador restante.
- `mutations/fichas.ts`: `corpoDaFicha` virou exportada — uma função, dois chamadores
  (`#d19`), como `corpoDeInsumoNovo` já era para a nota.
- `mutations/biblioteca.ts`: `instalarBiblioteca`, um `writeBatch` despachado (28 operações: 25
  insumos, 2 fichas, 1 incremento no agregado global), que reusa `corpoDeInsumoNovo` e
  `corpoDaFicha` — a ficha-modelo não é uma segunda forma de documento.
- `src/components/biblioteca/BotaoBiblioteca.tsx`: sabe sozinho quando existir (duas consultas
  `limit(1)`, como `useComeco`), e o toque grava e navega no mesmo tique, sem `await`.
- `ListaFichas.tsx` e `/insumos`: o botão na frente do estado vazio, com "Criar primeira ficha"
  e "Cadastrar insumo" como ações secundárias. Em `/fichas`, quando já há insumo mas nenhuma
  ficha, o estado vazio continua sendo o de hoje, sem uma letra mudada.
- `FormularioFicha.tsx`: as duas faixas do rateio (sem configuração vs. rateio salvo em zero) e
  a faixa "preços médios" — some insumo por insumo conforme ela corrige. Os valores iniciais de
  uma ficha nova, incluindo `taxaCartaoConsiderada`, saem de `precificacaoPadraoDaConta`.
- `LinhaInsumo.tsx`: selo neutro "Preço médio" ao lado de "Contagem vencida".
- `DECISOES.md#d65` ganhou a linha de revisão: a biblioteca é botão dela, marcada pelo id, e o
  guia continua não semeando nada sozinho.

Nenhum campo novo em `src/lib/types/`, nenhuma rota, nenhum índice, nenhuma regra de segurança,
nenhuma dependência — como a spec pedia. `grep -n "await " mutations/biblioteca.ts` e
`grep -rn "SEM_RATEIO" src/ tests/` não acham nada.

Fora do escopo literal da spec, e por quê:

- **`fraseDosPrecoMedio` em `FormularioFicha.tsx`.** A spec dá um exemplo de frase ("Farinha de
  trigo, manteiga sem sal e mais 8..."); montá-la a partir da lista que
  `insumosComPrecoMedio` devolve é o que faz a faixa dizer nomes de verdade, e não um texto
  fixo que nunca bateria com a ficha aberta.

**O roteiro de sete passos não rodou nesta sessão** — precisa de uma conta vazia de verdade
(`npm run conceder-acesso`) e de alguém no navegador. É o único lugar onde dá para ver o botão
sumir depois do primeiro toque e o preço da ficha-modelo bater igual antes e depois de salvar a
configuração (passo 6). **Também não rodou a gravação da Maynara** que o portão da fase 0 pede
— isso é anterior à próxima spec, não a este código.

**A spec nasceu como `017-o-preco-no-primeiro-minuto.md` e foi renomeada para
`018-o-preco-no-primeiro-minuto.md`** ao trazer a branch de volta para `main`: a spec 017 já
estava tomada por `017-orcamento-em-papel.md`, decidida e executada em paralelo. As decisões
`#d106` a `#d109` desta sessão viraram `#d111` a `#d114` pelo mesmo motivo, e a numeração do
roadmap (`docs/saas/ROADMAP.md`) subiu uma casa inteira: 018 a 032, e não mais 017 a 031.

## O que a sessão 019 deixou pronto

A segunda reordenação da fase 0: os cinco passos do começo passam a ser apresentados na ordem
em que dão alguma coisa em troca, e não na ordem em que o código depende de si mesmo. Um array
reordenado, cinco textos reescritos, um botão pendurado no passo 1.

- `src/lib/domain/onboarding.ts`: `CATALOGO_DO_COMECO` reordenado para
  `FICHAS, INSUMOS, CONFIGURACAO, PEDIDOS, CAIXA`, numerados de 1 a 5 nessa ordem, com os
  textos dos três primeiros reescritos para falar de preço em vez de conferir configuração.
  `FatosDoComeco`, `passosDoComeco`, `proximoPasso` e `progressoDoComeco` sem uma linha
  alterada — a regra "`FEITO` é o fato, em qualquer posição" já funciona em qualquer ordem.
- `src/lib/hooks/useComeco.ts`: **zero linhas mudadas**, que era o critério de aceite.
- `src/components/comecar/CartaoPrimeirosPassos.tsx`: com o passo de agora sendo `FICHAS` numa
  conta sem ficha e sem insumo, a ação primária vira `BotaoBiblioteca` (que já sabia sumir
  sozinho, `#d114`), com "Montar a minha ficha do zero" como link terciário abaixo. A conta
  vazia sai dos mesmos dois fatos que `useComeco` já entrega — nenhuma assinatura nova.
- `src/components/comecar/TelaComecar.tsx`: as duas frases que prometiam "a ordem em que uma
  coisa depende da outra" foram reescritas — a dependência agora é dita como estando na cadeia
  do dinheiro, que continua logo abaixo, intocada.
- `tests/domain/onboarding.test.ts`: reescrito para a ordem nova — a tabela do caso de aceite
  passo a passo, o caminho de quem ignora a biblioteca e cadastra à mão, o fora de ordem
  invertido (salvar a configuração antes de ter ficha), o estado exato de uma conta um segundo
  depois do toque na biblioteca, e a regra de nenhum número no texto. **A combinação das 32
  possibilidades exigiu conserto**: o teste que compara `passo.estado === "FEITO"` contra a
  ordem dos cinco fatos usava a ordem antiga (`temConfiguracao, temInsumo, temFicha, ...`) e
  continuava verde por acidente — é exatamente o risco que a spec nomeou, e apareceu.
- `DECISOES.md#d115` (a decisão desta spec) e uma linha de revisão em `#d66`: "os cinco são a
  navegação inferior lida em voz alta" deixou de valer, porque a ordem nova não é mais a de
  `navegacao.ts`.

Nenhum campo, nenhuma tela, nenhuma rota, nenhum índice, nenhuma regra, nenhuma dependência.
`CadeiaDoDinheiro`, `OQueMaisTem`, `QuandoNaoTemInternet`, `InstalarNaTela`, `navegacao.ts` e os
estados vazios não mudaram uma letra — isso é escopo das specs 020 e 021.

**A gravação da usuária 0 não rodou antes desta sessão** (nada neste arquivo registra que
rodou), e por isso a dívida "os cinco textos saíram do código, e não do que a 5B viu" continua
na tabela: os textos novos são melhores — falam de preço, e não de conferir configuração —, mas
"as palavras que ela usou" é uma afirmação que só a gravação confirma. **O roteiro de sete
passos, numa conta vazia de verdade com DevTools em Offline nos quatro primeiros, não rodou
nesta sessão.**

## O que a sessão 020 deixou pronto

A terceira dobra da fase 0: os dois formulários do primeiro preço — insumo e ficha — passam a
pedir na frente só o que o primeiro preço precisa. Dois arquivos de componente, nenhum de
`src/lib/`; JSX movido, nenhum campo, mutação, rota, índice ou regra tocado.

- `src/components/insumos/FormularioInsumo.tsx`: na frente, Nome, "Como você compra" (Preço
  pago, Quantidade, Unidade) e `ResumoCusto`. Categoria, Perda, Marca, Onde compra e Estoque
  atual foram para trás de "Mais detalhes", que abre sozinha quando o insumo salvo difere do
  que um cadastro novo recebe (`categoria !== "INGREDIENTE"`, perda > 0, marca, fornecedor ou
  estoque preenchidos) ou quando um desses campos tem erro. A dobra ganhou `key={chaveAtual}`,
  pela mesma razão de `chave` na linha 85: o painel não desmonta entre um insumo e outro.
- `src/components/fichas/FormularioFicha.tsx`: os blocos "O produto" e "Rendimento e tempo"
  viraram um, "A receita" (ou "O kit"), com Nome, Rende, Em e Tempo — `Clock` saiu dos imports.
  Tipo (receita ou kit), Categoria, Fornadas de reserva, "Como você apresenta" e Foto foram
  para a mesma dobra "Mais detalhes", **antes** de "O que vai dentro" — o tipo precisa vir
  antes dos itens porque trocar para kit muda os blocos que aparecem logo abaixo. A dobra abre
  sozinha quando `tipo === "KIT"`, há reserva, descrição ou foto, ou erro num desses campos; a
  categoria da ficha fica de fora do predicado de propósito (`DECISOES.md#d116`), porque as
  duas fichas da biblioteca (`#d114`) vêm com "Cookies" e são a primeira tela que ela vê. Sem
  `key`: o editor é uma rota por ficha, e monta com a ficha na mão.
- `DECISOES.md#d116` (a decisão desta spec) e uma linha de revisão em `#d96`: o piso continua
  morando no editor da ficha, agora atrás de "Mais detalhes".

Nada de schema, mutação, rota, índice, regra ou dependência mudou. `PainelPreco.tsx`,
`LinhaItemFicha.tsx` e `EditorFicha.tsx` sem uma linha alterada. Os 530 testes de domínio
continuam os mesmos, porque nada disto mora em `src/lib/`.

**O roteiro de oito passos não rodou nesta sessão** — precisa de duas contas (uma vazia e a
real, com insumos que têm marca, fornecedor e estoque preenchidos) e de alguém no navegador. É
o único lugar onde dá para ver a dobra abrir sozinha na farinha e no saquinho, e fechada na
ficha-modelo e no açúcar.

## O que a sessão 021 deixou pronto

A quarta e última spec da fase 0: o vocabulário, perguntado a ela e não decidido em sessão de
código. `docs/DECISOES.md#d117` tem a tabela das cinco respostas, inclusive a 3b em aberto.

- **"Insumo" → "material", "ficha" → "produto"**, em todo lugar em que a palavra é mostrada — 38
  arquivos em `src/`: `navegacao.ts`, os `titulo`/`descricao` de `CabecalhoPagina`, os
  `metadata.title`, o atalho do `manifest.ts`, os links de voltar, os estados vazios,
  `CATALOGO_DO_COMECO` (a parte que dizia "receita" no sentido largo), `CartaoPrimeirosPassos`,
  `OQueMaisTem`, `CadeiaDoDinheiro`, `QuandoNaoTemInternet` (só a palavra, como a spec pediu),
  os dois formulários e as duas listas, o painel de fornada, a tela de nota e o rodapé dela, a
  configuração, o painel de meta, o painel financeiro e a lista de compras — mais os mapas de
  rótulo do domínio que a tela imprime: `ROTULO_CATEGORIA_TRANSACAO` em `caixa.ts`,
  `descricaoDaCompra` em `notaFiscal.ts`, as mensagens de `schemas.ts` e as pendências de
  `listaCompras.ts`. Cada string foi relida, e não trocada por `sed`: "ficha" é feminino,
  "produto" é masculino, e artigo, pronome e particípio mudaram junto.
- **"Receita" ficou no sentido estreito** (o produto que não é kit) em todo lugar em que a
  spec não a rejeitou — o filtro "Receitas · Kits", o bloco "A receita" / "O kit" do editor, a
  busca e as mensagens da escolha do combo. Onde significava a ficha inteira, virou "produto".
- **"Encomenda" e "pedido" continuam os dois no corpo**: a resposta 4 foi "as duas são minhas".
- **Nada de schema, rota, coleção ou identificador mudou.** `git diff src/lib/types/
src/lib/firebase/ firestore.rules` só tem as duas linhas de ponte nos comentários de cabeçalho
  de `insumos.ts` e `fichas.ts` — a régua do critério de aceite.
- **A porta que faltava**: `ListaDoMercado.tsx` ganhou "Fechar e ler a nota" na caixa de
  confirmação de "Fechar esta lista", irmã de "Fechar e guardar na despensa" — a única primária
  do sistema que depende de `useConexao()`; sem rede ela desabilita e "guardar na despensa"
  volta a ser a primária. As outras três telas fora do menu (`/insumos/nota`,
  `/insumos/contagem`, `/fichas/contagem`) já tinham porta desde a 13D — o comentário de
  `OQueMaisTem.tsx` parou de prometer "descoberta acidental" e passou a dizer isso.
- `tests/domain/onboarding.test.ts` ganhou o teste de `PALAVRAS_REJEITADAS`, que garante que os
  cinco textos de `CATALOGO_DO_COMECO` não voltam a dizer "insumo" nem "ficha" por acidente.
- `docs/saas/ROADMAP.md`: a 021 marcada como entregue, e a seção 2 item 4 ganhou a correção —
  as quatro portas existem desde a 13D, a premissa de "descoberta acidental" não era mais
  verdadeira quando esta spec rodou.

**A contagem do `rg -i "insumo|ficha" src/` do passo 1 da spec** (seção 3): antes da sessão,
1986 ocorrências em 96 arquivos — a maioria identificador de código (`insumoId`, `FichaTecnica`,
rota, coleção, comentário), que a régua da spec mantém intacta. Depois da sessão, **1873
ocorrências em 92 arquivos, todas identificador/rota/coleção/comentário** — conferido em três
passadas: por prop (`rotulo|titulo|descricao|placeholder|aria-label|dica`), por texto JSX solto
entre tags, e por string entre aspas simples/duplas/crase em `src/lib`. A terceira passada achou
dois fallbacks que as duas primeiras não pegavam — `"Insumo removido"` e `"Ficha removida"` em
`FormularioFicha.tsx`, o nome que a linha mostra quando o item ou o componente sumiu do
cadastro — e duas frases de aviso no mesmo arquivo ("Uma receita não leva outras fichas dentro",
"Há um item arquivado nesta ficha"), todas corrigidas. Os 38 arquivos de `src/` no diff desta
sessão são a contagem do lado "tela"; os 92 que sobram no `rg` são o lado "código".

**O roteiro de sete passos não rodou nesta sessão** — precisa do celular dela, app instalado,
360px, e as duas contas (vazia e real) para ver "Materiais" e "Produtos" no menu de baixo sem
cortar, a dobra do offline no passo 4, e a gravação no passo 7.

## O que a sessão 022 deixou pronto

A última spec da fase 0: a que abre a porta para a segunda confeiteira, decidida por quem
conduz o projeto sem esperar a gravação (`docs/specs/022-a-segunda-conta.md`, mesmo arranjo da
019). `docs/DECISOES.md#d118` e `#d119` registram as duas decisões.

- **O login para de presumir dona.** "Acesso restrito à administradora da MyCookie's" saiu; a
  linha nova diz "Só entra quem foi convidada. Na primeira vez, toque em 'Esqueci minha senha'
  para criar a sua." — a ponte para o convite da `#d119`.
- **A tela "sem conta" para de ensinar comando de terminal.** Diz o e-mail em texto, "avise
  quem te convidou e, quando liberarem, confira de novo aqui", e "Ainda não. Assim que
  liberarem, é só conferir de novo." "Já liberaram meu acesso" e "Sair" ficam.
- **`sair()` apaga o cache e espera a fila subir antes** (`src/providers/AuthProvider.tsx`):
  `waitForPendingWrites` (teto de 5 s) → `signOut` → `terminate` → `clearIndexedDbPersistence`,
  e uma navegação dura para `/login`. Sem rede e com escrita pendente, devolve `false` e não
  sai — `AVISO_SAIR_PENDENTE` é a mesma frase nos três lugares que chamam `sair()` (barra
  lateral, `/configuracao` no celular, a tela "sem conta"), todos desabilitando o botão
  enquanto esperam. `ContextoAuth.sair` mudou de `Promise<void>` para `Promise<boolean>`.
- **"Sair" alcançável no celular**, `src/components/configuracao/TelaConfiguracao.tsx`, abaixo
  de "Como funciona": mesmo formato de cartão, ícone `LogOut`, "Você entrou como {e-mail}." É a
  primeira vez que dá para sair do app no celular — antes só existia na barra lateral (`lg:`).
- **`conceder-acesso.mjs` passou a criar o login**, sem senha, quando ele não existe
  (`auth.createUser({ email })`), e imprime a instrução de tocar em "Esqueci minha senha". O
  branch de `auth/user-not-found` no catch de baixo saiu — deixou de ser falha.
- **`scripts/admin.mjs`, arquivo novo**: o preâmbulo que os dois scripts repetiam (credencial,
  `auth`, `db`, a checagem de `GOOGLE_APPLICATION_CREDENTIALS`) virou um módulo só.
- **`scripts/metricas.mjs`, arquivo novo**: uma linha por conta em `console.table` — conta,
  criada, último login (`auth.listUsers()` paginado, o maior `lastSignInTime` da conta),
  materiais, produtos, pedidos dos últimos 30 dias (conta arquivado: foi atividade), 1º
  produto, 1º próprio (o primeiro cujo id não começa com `biblioteca-`), dias até o 1º próprio
  — a métrica da fase 0 em número —, e login 30 dias (retenção D30, "—" para conta com menos de
  30 dias). Nenhuma consulta pede índice composto. `npm run metricas` em `package.json`.
- `rg -n "administradora|conceder-acesso" src/` devolve só o comentário de
  `mutations/conta.ts:8`, como o critério de aceite pede.

**O roteiro de nove passos não rodou nesta sessão** — os passos 1 a 7 e 9 precisam de navegador
e de celular, que esta sessão não tem. **O passo 8 rodou**, `npm run metricas` contra o projeto
de verdade (`mycookies-mrc`), e é a primeira vez que o "tempo até o primeiro preço próprio" da
seção 6 do `ROADMAP.md` vira um número:

```
┌─────────┬──────────────────────────┬──────────────┬──────────────┬───────────┬──────────┬─────────────┬──────────────┬──────────────┬───────────────┬───────────┐
│ (index) │ conta                    │ criada       │ último login │ materiais │ produtos │ pedidos 30d │ 1º produto   │ 1º próprio   │ dias até o 1º │ login 30d │
├─────────┼──────────────────────────┼──────────────┼──────────────┼───────────┼──────────┼─────────────┼──────────────┼──────────────┼───────────────┼───────────┤
│ 0       │ "mycookies · MyCookie's" │ '2026-09-01' │ '2026-09-12' │ 35        │ 12       │ 48          │ '2026-09-04' │ '2026-09-04' │ '3'           │ '—'       │
│ 1       │ 'teste-019 · Teste 019'  │ '2026-09-16' │ '2026-09-16' │ 26        │ 3        │ 0           │ '2026-09-16' │ '2026-09-16' │ '0'           │ '—'       │
└─────────┴──────────────────────────┴──────────────┴──────────────┴───────────┴──────────┴─────────────┴──────────────┴──────────────┴───────────────┴───────────┘
```

A conta real (`mycookies`) é a primeira linha da métrica: **3 dias** até o primeiro produto que
não veio da biblioteca. `teste-019` é uma conta de teste que sobrou de uma sessão anterior (a
018/019), com "0" porque ela mesma é o dia da leitura — confirma a régua do critério de aceite
(passo 8 do roteiro). Nenhuma das duas linhas pediu índice, e `login 30d` sai "—" nas duas
porque nenhuma conta tem mais de 30 dias ainda.

**Com a 022, a fase 0 fecha em código.** O que a fecha de verdade continua sendo a gravação da
Maynara (seção 2 do roadmap): nada nesta sessão mudou o caminho dela até o preço, fora a linha
do login, que só tira uma pergunta. O próximo passo não é mais uma spec da fase 0 — é a fase 1:
as 5 a 8 entrevistas com confeiteiras que não são a Maynara (`docs/saas/ROADMAP.md`, seção
"Fase 1"), e a spec `023-sair-sem-salvar.md` primeiro, porque perder trabalho em silêncio é o
que mais mina a confiança de quem está operando sozinha.

## O que a passagem de polimento deixou pronto

Fora de spec, em 2026-09-17: `/impeccable polish` nas telas do sistema, contra o `DESIGN.md`.
Nenhum campo, nenhuma rota, nenhuma regra, nenhuma dependência, nenhuma mutação. O que mudou é
o que o `DESIGN.md` já pedia e o código tinha deixado de cumprir em cópia. `DECISOES.md#d120` e
`#d121` registram as duas decisões.

- **Dois tokens novos, `wine-ink` e `gold-ink`** (`#d120`): a marca como tinta, que inverte no
  escuro. Substituíram 41 ocorrências de `text-wine-700 dark:text-wine-300` e afins em 25
  arquivos; `rg "dark:" src` só devolve um comentário. **Conserto de tema que veio de carona:**
  a borda da opção escolhida (método de preço em `/configuracao` e no editor de ficha, tipo de
  ficha, lado do caixa) sumia no escuro em quatro dos cinco lugares. A `.folha` fixa os dois no
  claro.
- **Seis primitivos em `src/components/ui/`** (`#d121`): `Pilulas` (seis telas), `BotaoFlutuante`
  (quatro), `CampoBusca` (três, `BuscaItem` inclusa), `LinkVoltar` (cinco), `AreaTexto` em
  `Campo.tsx` (cinco `<textarea>` copiados, agora com erro, desabilitado e `aria-invalid`) e
  `Realce` (estava definido duas vezes). `EnvelopeCampo` deixou de ser exportado.
- **"Mais detalhes" ganhou a seta** nos dois editores (`FormularioInsumo`, `FormularioFicha`):
  `list-none` tinha tirado o marcador do `<details>` e nada dizia que a dobra abria.
- **`/configuracao` não pula mais ao carregar**: o esqueleto usava uma descrição mais curta que a
  tela carregada, e o cabeçalho mudava de altura quando os dados chegavam.
- **`active:` onde faltava**: a linha de forma de pagamento e o cartão da meta na tela Hoje.
- **Do celular, depois de olhar `/pedidos`:** no toque nenhuma rolagem tem barra (`globals.css`,
  base, `@media (pointer: coarse)`, o mesmo sinal de `apertado`; no desktop o mouse continua com
  a dele), e a linha do pedido passou a ter **uma** pílula, a do status. "Pago" e "Entrega" viraram `Marcador`
  (`ui/Selo.tsx`), o selo sem fundo: três pílulas em 360px quebravam em duas linhas de cor. A
  agenda da tela Hoje seguiu a mesma regra (a data e a entrega em marcador).
- **A linha de produto e a de material viraram três andares** (`LinhaFicha`, `LinhaInsumo`):
  nome | preço | seta em cima, custo · rendimento | sobra no meio (a sobra alinhada sob o preço,
  `pr-8`), e o que é produção (pronto, fornadas, despensa, selos) embaixo, **na largura inteira**.
  Antes as frases de produção moravam na coluna esquerda, ao lado do preço, em ~190px, e cada
  uma quebrava em três a cinco linhas no celular. Nenhuma frase mudou de texto.
- **O botão flutuante deixou de ser o círculo com "+"** (`ui/BotaoFlutuante.tsx`, `DESIGN.md`,
  Componentes): pílula de 52px com o nome da ação visível ("Novo pedido", "Lançar"), sombra
  `raised` em vez de `overlay`, centrada acima da navegação. No canto direito ele cobria a coluna
  do dinheiro da última linha da lista.
- **Travessão saiu da prosa de interface** (regra de cópia do polimento): 17 frases em componentes
  e 3 em `domain/` (`onboarding.ts`, `notaFiscal.ts`) viraram dois-pontos, vírgula ou ponto. O
  travessão como **glifo de vazio** (`—` no lugar de um número que não existe) e o separador da
  mensagem de WhatsApp ficaram: um é tipografia, o outro é texto para a cliente.

**Deixado de propósito.** `Bloco` e `BlocoConfiguracao` continuam dois (o motivo está no
comentário de `Bloco.tsx`); o cabeçalho das cinco telas fora do menu continua montado à mão
(`#d121`); o "Sair" duplicado no desktop de `/configuracao` continua (`022`). O cartão de opção
escolhida (`rounded-md border p-3 ... aria-pressed`) aparece em cinco lugares e não virou
primitivo: três variam em anatomia (com e sem explicação, compacto com `toque`), e o token
`wine-ink` já foi o conserto que importava.

Portão de conclusão: lint limpo, typecheck limpo, **531 testes**, build com as mesmas rotas.
**Nada disto foi visto em navegador nesta sessão**: o escuro com a borda da opção escolhida e a
seta de "Mais detalhes" são os dois lugares onde vale olhar primeiro.

## O que a sessão 033-A deixou pronto

A tinta do Rende, sem o nome e sem o símbolo (`specs/033-a-marca-rende.md`, seção 3.A;
`DECISOES.md#d122` e `#d123`). **A e B saem juntas**: este commit não vai para o Vercel
sozinho. Nenhum campo, nenhuma rota, nenhuma regra, nenhum índice, nenhuma dependência;
`git diff src/lib/domain/ src/lib/firebase/ firestore.rules firestore.indexes.json package.json`
vazio.

- **Primeiro ato, antes de qualquer código:** `DESIGN.md` e `PRODUCT.md` da raiz reescritos a
  partir de `docs/marca/rende/`, com as correções da seção 1 da spec (escala e raios do código,
  barra lateral sem faixa, navegação em `accent-ink`, `--on-accent` e `--on-brand-muted` na
  tabela, a seção "Tokens no código"). `load-context.mjs` devolve os dois sem placeholder;
  `/impeccable` foi carregado depois deles, e não antes. `CLAUDE.md` mudou o título, a
  primeira linha e a justificativa da invariante de cor.
- **`globals.css`:** `:root` e `@media dark` são os de `tokens.css` nome a nome (conferido por
  script: só espaço em branco e as exceções declaradas na `#d123`). `--focus` é o âmbar,
  `::selection` é `brand-700`/`on-brand`, `accent-color` é `--brand-as-ink`. `textura-papel` e
  `filete-dourado` saíram, com o `@media print` que citava a textura. A `.folha` redeclara os
  claros do pacote. Sombras na matiz 272, valor bruto em `--elevation-*` (o motivo está na
  `#d123`). Escala e raios do `@theme inline`: byte a byte os de antes.
- **Fontes:** `Archivo` 600/700 no lugar da `Fraunces`, mesma variável `--fonte-display`. A
  tagline do login perdeu o `font-normal`. `rg "font-display" src/ | rg -v "font-semibold|font-bold"`
  só devolve dois lugares onde o peso vem do pai (`Dinheiro` xl e o `Valor` da folha).
- **As classes:** `sed` com a tabela da `#d123` em 34 arquivos, e depois os lugares em que o
  papel mudou: botão primário e flutuante âmbar com `on-accent`; terciário `brand-ink` sobre
  `brand-100`; navegação inferior ativa `accent-ink` com pílula `brand-100`; barra lateral
  `brand-800`, hover `brand-600`, ativo `brand-700` cheio, sem filete; pílulas e selo "entregue"
  em `brand-*`. **Dois lugares além dos quatro da spec:** os marcadores de seleção à mão de
  `LinhaCompra` e `PainelEntregas` (`brand-ink` sobre `text-surface`, porque `brand-700` some
  na superfície escura) e os dois `<input type="checkbox">` que tinham `accent-wine-700` (a
  classe saiu; herdam o `accent-color` do `body`).
- **Os 8 filetes:** todos fora. Nos três que marcavam estado, o estado continua dito: meta
  batida tem "Meta batida" com o `Check` (`BlocoMeta`, `CartaoMetaHoje`); o passo atual tem o
  distintivo em tinta cheia e o `SeloDoPasso` (`BlocoPasso`). Nenhum precisou de
  `border-brand-ink`. O prop `dourado` de `CartaoMetaHoje.Cartao` morreu junto.
- **Os 4 `textura-papel`:** fora, `bg-canvas` fica. `Marca.tsx:33` aponta para `--accent-500`
  (provisório até a B). Dez comentários que justificavam o ícone com "vinho e vermelho são
  vizinhos" foram reescritos: a regra fica, o motivo agora é a invariante em si (ou, no
  `SeloStatus`, o âmbar dividindo matiz com o ocre de "em produção").
- **Manifesto e viewport:** `theme_color` e `themeColor` `#2A2C3A`, `background_color`
  `#F7F4EE`, comentários apontando para `#d124` (registrada na B). **Até reinstalar, o celular
  abre o app novo com a barra vinho.**
- `#d111` anotada como superada no primeiro item; `#d120` anotada com os nomes novos;
  `ROADMAP.md:11` riscada.

**Inventário do passo 3 da spec, antes → depois:** `wine-|gold-|on-wine` 112 ocorrências em 38
arquivos → **0**; `filete-dourado|textura-papel|PadraoCookie|Marca` 8 + 4 + 1 + 7 → 0 + 0 + 1 +
7 (o padrão e os sete importadores são da B); `Cookie` fora de `marca/`: três do Lucide
(`EntradaContagemPronto`, `FraseDaCapacidade`, `OQueMaisTem`, a 3.B.7) mais quatro do
componente de marca (B) e texto de produto; `MyCookie|Biscoitos artesanais|Feito com amor`
em `src/`, `firestore.rules`: 16 linhas, todas da B, mais `CLAUDE.md` já reescrito;
`variante="primaria"` 26 em 22 arquivos (lista da C). `npx impeccable --json src/` (4.1.0)
**antes e depois: `[]`**, zero achados nos dois.

**Deixado para a B e a C, de propósito:** o biscoito, o nome, `PadraoCookie` no login, a
folha do orçamento (`border-accent-500`, total em `brand-700`, tudo provisório), `Marca.tsx`.
Para a C: a barra de progresso da meta batida ficou em `bg-accent-500` pela troca literal
`gold-500` → `accent-500`, e a 3.C.2 não a lista entre os sete lugares do âmbar em área; a C
decide (`positive` é o candidato, pela tabela de semânticos do pacote). "Meta batida" em
`text-accent-ink` está no mesmo caso.

Portão de conclusão rodado de verdade: lint limpo, typecheck limpo (app e service worker),
**531 testes**, build com as 18 rotas de antes e o service worker gerado. **Nada disto foi
visto em navegador nesta sessão.** O roteiro "Depois da A" (spec, passos 1 a 5) é o que confere
o que o `sed` não vê: um botão azul-preto onde deveria ser âmbar, o anel de foco sobre o botão
âmbar, o hover da barra lateral mais claro que o ativo, e a meta batida e o passo atual ditos
sem o filete.

## O que a sessão 033-B deixou pronto

O nome e o símbolo (`specs/033-a-marca-rende.md`, seção 3.B; `DECISOES.md#d124` e `#d125`).
Nenhum campo, nenhuma rota, nenhuma regra (um comentário em `firestore.rules`), nenhum índice,
nenhuma dependência; `git diff src/lib/domain/ src/lib/firebase/ firestore.indexes.json
package.json` vazio.

- **`Marca.tsx` reescrito**: exporta `Simbolo` (o SVG de `rende-simbolo.svg` com as cores nos
  tokens, `size-12` mínimo, `aria-hidden`) e `Logotipo` ("rende" em HTML, Archivo 700, o ponto
  como `<span>` de `0.29em` com a base `0.04em` abaixo da linha; `tom="negativa"` é só
  `text-on-brand`), e nada mais. `Cookie`, `PadraoCookie`, `TRACADO_COOKIE`, `DESCRITOR` e
  `SLOGAN` morreram. **Um desvio da letra da spec:** `md` é `1.75rem` (28px), e não
  `text-title` (24px) — a geometria do pacote dá ~3,2em de largura total, e 24px ficaria em
  ~77px, abaixo dos 88px que o manual exige; 28px dá ~90px.
- **Os sete importadores:** login (painel `brand-800` liso, `Logotipo lg` negativa em cima,
  tagline embaixo; no celular `Logotipo md` em tinta; `<h1>` "Entrar"), barra lateral (só o
  `Logotipo md` negativa, sem símbolo e sem descritor), carregando e "Lendo a nota" (`Simbolo`
  `size-12` com o pulso), sem conta e `/offline` (`Simbolo size-16`; na tela sem conta o
  `ShieldAlert` saiu, porque a frase é instrução e não alerta), `EstadoVazio` (a marca d'água
  saiu, nada entrou — 3.C.2 decide), e a folha do orçamento (`#d127`: nome do negócio em
  display no cabeçalho, borda `line-strong`, total em `bg-ink text-surface`, e `FRASE_RODAPE`
  como constante local com o comentário `ponytail:` até a C gravar `ConfiguracaoGeral.frase`).
  A linha "feito com Rende" do rodapé **não** entrou: é da 3.C.3.
- **Ícones:** `src/app/icon.svg` ← `icone-app-512.svg`; `public/icons/icone-maskable.svg` ←
  o maskable, com o comentário reescrito. `gerar-icones.mjs` com a guarda `rx="112.64"` e o
  `viewBox` 512; rodado:

  ```
  src/app/apple-icon.png · 180×180 · 1501 bytes
  public/icons/icone-192.png · 192×192 · 1593 bytes
  public/icons/icone-512.png · 512×512 · 5062 bytes
  ```

  Os três quadrados, sem `rx`, conferidos abrindo o de 512.

- **Manifesto e metadata:** `name`/`short_name`/`title`/`applicationName`/`appleWebApp.title`
  "Rende", `template: "%s · Rende"`, descrição de loja de `MARCA.md` § 3.5 numa constante
  (`src/app/descricao.ts`) lida pelos dois. O comentário de `robots` diz o motivo novo (área
  logada; a página de venda será outra rota). `theme_color` `#2A2C3A` e `background_color`
  `#F7F4EE` já estavam da A; o comentário do `background_color` agora diz por que não é o
  `brand-800` do pacote.
- **O que ainda dizia MyCookie's:** o comentário de `firestore.rules` e o placeholder do
  Instagram (`"suaconfeitaria"`). Ficam, de propósito: `conceder-acesso.mjs` (id da conta real),
  `types/conta.ts` (exemplo de dado), `tests/domain/*` (fixtures).
- **O biscoito do Lucide:** `PackageOpen` nos três lugares (`EntradaContagemPronto`,
  `FraseDaCapacidade`, `OQueMaisTem`). Se no navegador ler como "encomenda", `Archive`.
- `#d124` e `#d125` em `DECISOES.md`; `LEIA-ME.md` do pacote com "Como está no código".

**Critério de aceite da B, conferido:** `rg -n "MyCookie|Biscoitos artesanais|Cookie\b" src/
--glob '!**/lib/domain/**' --glob '!**/tests/**'` devolve `types/conta.ts` e seis linhas de
texto de produto (placeholders de ficha, comentários de exemplo). `Marca.tsx` exporta `Simbolo`
e `Logotipo` e nada mais.

Portão de conclusão rodado de verdade: lint limpo, typecheck limpo (app e service worker),
**531 testes**, build com as 18 rotas de antes (mais `/icon.svg` e `/apple-icon.png`, que já
eram) e o service worker gerado; `manifest.webmanifest` gerado com `"name":"Rende"`, e o CSS
gerado tem o `vertical-align:-.04em`, o `width:.29em` e o `letter-spacing:-.03em` do logotipo.
**Nada disto foi visto em navegador nesta sessão.** O roteiro "Depois da B" (passos 6 a 10) é
o que confere o que o build não vê: o ponto encostado no "e" e na altura certa nos dois
tamanhos, o painel do login, a folha sem logotipo com o total em tinta, e o pote aberto onde
era o biscoito.

## O que a sessão 033-C deixou pronto

O ponto, a faixa e as palavras (`specs/033-a-marca-rende.md`, seção 3.C; `DECISOES.md#d126` e
`#d127`). A seção de código está mais abaixo; primeiro, como a spec manda, o relatório da
critique **antes de qualquer conserto**.

### Critique antes (3.C.5, passo 1)

Protocolo do `/impeccable critique`: a avaliação A (revisão de design) rodou num sub-agente
isolado, só a partir do código (sem navegador nesta sessão: os dois temas foram deduzidos dos
tokens e os dois tamanhos das classes `lg:`/`apertado:`); a avaliação B é o detector
determinístico, `npx impeccable --json src/` (4.1.0), rodado em separado: **`[]`, zero
achados**, como na A. As cinco telas: `/login`, `/` (Hoje), `/fichas/[id]`, `/pedidos`,
`/financeiro`. Os P1 do relatório foram conferidos no código antes de virarem conserto (ver "O
que a critique mudou", abaixo).

**Veredito de IA:** não lê como interface gerada. A voz é única ("O que a maquininha comeu",
"Ele fica congelado mesmo se o chocolate subir amanhã"), nenhuma proibição absoluta violada
(sem faixa lateral, sem gradiente, sem vidro, sem grade de cartões, sem modal por reflexo, sem
travessão em tela), a faixa é proporção real e só existe no editor. Três tiques apontados:
ícone Lucide na frente de quase todo título de bloco; os rótulos do painel de preço em micro
caixa alta com `tracking-wide` (idioma de KPI de template, sobre os dois números mais
importantes do app); e três blocos de `/financeiro` com a mesma anatomia (número grande,
frase, faixa rebaixada). Um quarto, menor: "A conta que a sua concorrente não fez." é tagline
dentro de um cabeçalho de formulário.

| #   | Heurística             | Nota      | Ponto-chave                                                                                                                                                    |
| --- | ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibilidade do estado | 3         | Esqueletos, `aria-busy`, selo. Salvar a ficha faz `router.push` sem confirmação: o pico termina em silêncio.                                                   |
| 2   | Mundo real             | 3         | A melhor dimensão. Vazam "rateio", "Ticket médio" como rótulo, e "Esqueci minha senha" servindo de "criar minha senha".                                        |
| 3   | Controle e liberdade   | 3         | `Painel` com Esc, scrim, foco devolvido, `inert`. Falta guarda de edição não salva no editor.                                                                  |
| 4   | Consistência           | 3         | Primitivos fortes. Pedido é cartão na Hoje e linha em `/pedidos`; `SeloStatus` diverge da tabela do `DESIGN.md`; prejuízo ocre no editor, vermelho nas listas. |
| 5   | Prevenção de erros     | 3         | Campo monetário só dígitos, unidade única vira rótulo, "Arquivar mesmo assim" atrás de "Deixar como está". Perda de edição sem aviso.                          |
| 6   | Reconhecimento         | 3         | Todo ícone de navegação tem rótulo. `/compras` só é alcançável por cartão condicional e por um botão em `/pedidos`.                                            |
| 7   | Flexibilidade          | 2         | Sem atalho de teclado, sem ação em lote. É o mínimo.                                                                                                           |
| 8   | Estética e minimalismo | 3         | Hierarquia de dinheiro certa. Até três faixas ocre antes do primeiro campo do editor; nove seções em `/financeiro`; ícone em todo título.                      |
| 9   | Recuperar de erros     | 3         | Mensagens nomeiam o problema e a saída. Nenhum erro de campo leva ícone.                                                                                       |
| 10  | Ajuda                  | 3         | Contextual, uma linha, no lugar do número.                                                                                                                     |
|     | **Total**              | **29/40** | **"Good": base sólida, atacar as áreas fracas.**                                                                                                               |

**Carga cognitiva (8 itens):** `/login` 0 falhas; Hoje 1 (2 na conta nova: dois botões âmbar,
sete ações visíveis); `/fichas/[id]` 2 (até três faixas ocre antes de "A receita"; cinco
controles em "Como calcular o preço"); `/pedidos` 2 (sete pílulas de filtro, e a 360px rolam
sem barra); `/financeiro` 2 (nove seções, nada colapsável; "Recalcular o mês" duas vezes).

**Jornada emocional:** o pico é o `PainelPreco` com o ponto e "Sobram R$ X por unidade", no
lugar certo. O fim é plano: salvar troca de tela sem dizer nada. Os vales (arquivar, prejuízo,
a receber, offline, agregado errado) têm ícone, palavra e a saída; o vale escondido é a perda
de edição sem guarda.

**Problemas prioritários:**

- **P1 · "Salvar" da ficha mora no cabeçalho no celular, e não há guarda de edição.** O
  `DESIGN.md` diz que no celular o primário é a pílula flutuante ou o botão do painel de pé;
  a navegação inferior fica viva durante a edição e um toque descarta dez minutos de receita.
- **P1 · Rótulo inativo da navegação inferior reprova AA.** `text-ink-subtle` em 12px mede
  **3,45:1** sobre `surface` no claro (4,23 no escuro). O `DESIGN.md` chamava isso de "só micro
  ✔"; WCAG não tem exceção para 12px. Mesmo par nos rótulos "Custo da unidade" e "Sugerido" do
  painel de preço.
- **P1 · Dois botões âmbar na mesma tela.** `/pedidos` vazio (cabeçalho/flutuante + "Anotar
  primeiro pedido"), `/financeiro` vazio (idem + "Lançar o primeiro"), Hoje com o onboarding
  ativo (o CTA do passo + "Anotar um pedido" da agenda).
- **P2 · Prejuízo tem duas cores conforme a tela.** Ocre com triângulo no editor; vermelho com
  triângulo nas listas. O `DESIGN.md` põe prejuízo em negativo com `trending-down`.
- **P2 · `--border-strong` mede 1,97:1 sobre `surface` nos dois temas.** É o contorno de campo,
  de botão secundário e de pílula inativa; o piso de componente é 3:1.

**Personas:** Casey (uma mão, interrompida): Salvar no alto do editor, pílula flutuante
cobrindo a última linha das listas, `/compras` sem porta fixa, sete pílulas rolando sem barra.
Sam (leitor de tela): navegação a 3,45:1; sinal "−" sem a palavra "saída" na linha de
lançamento; 31 `sr-only` de dias zerados em `MovimentoPorDia`; "Entrar" desabilitado sem dizer
por quê. Jordan (primeira vez): "Esqueci minha senha" para criar senha; "rateio" e "Ticket
médio" sem a frase de uma linha; "Não preciso disto agora" fecha o caminho sem confirmação.
Maynara: os rótulos do painel a 3,45:1 a meio metro; "Fornadas de reserva" dobrada em "Mais
detalhes"; pedido com dois desenhos (cartão na Hoje, linha em `/pedidos`).

**Observações menores:** `SeloStatus` mais certo que o `DESIGN.md` (em produção como atenção
obrigaria o triângulo); `font-display` em `SeletorMes`, "Meta batida" e no cartão dos passos;
`border-white/10` na barra lateral (valor solto); o primário do celular no editor é `md` e o
`DESIGN.md` pede 52px; doze cartões idênticos na agenda da Hoje; o ponto do estado vazio
decidido por convenção de string (fácil esquecer o ponto); `animate-spin` contínuo no selo;
32px de vão reservado para um selo que quase sempre é `null`; anel de foco âmbar sobre
`attention-bg` merece o navegador.

**Perguntas:** de quem é a ação primária quando a tela está vazia? Prejuízo é atenção ou
negativo? O ponto no estado vazio é assinatura ou decoração (no desktop o logotipo da barra
lateral já carrega um ponto em toda tela)?

**Contraste recomputado (3.C.5, passo 2), OKLCH → sRGB → luminância, os seis pares que a marca
criou:** `on-accent` sobre `accent-500` **7,73** (claro) e **8,94** (escuro); `accent-ink`
sobre `canvas` **7,01** / sobre `surface` **7,50** (claro), **10,49** / **9,47** (escuro);
`on-brand-muted` sobre `brand-800` **10,97**; `attention` sobre `attention-bg` **7,78**
(escuro). Todos passam 4,5 com folga; nenhum token da `#d123` muda. Dois pares fora da lista
reprovam: **`ink-subtle` como texto** (3,45 claro / 4,23 escuro sobre `surface`; 3,23 sobre
`canvas`) e **`border-strong` como contorno** (1,97 nos dois temas). `accent-500` como texto
sobre `canvas` mede 2,16 e confirma a regra "âmbar nunca é texto"; nenhum `text-accent-500` no
código.

### O que a critique mudou (3.C.5, passo 2)

- **P1 · dois âmbar na mesma tela: consertado.** Em `/insumos`, `/fichas`, `/pedidos` e
  `/financeiro`, enquanto o estado vazio de conta vazia está na tela (`!carregando && !erro &&
nada gravado`), o botão do cabeçalho e a pílula flutuante saem: a ação é do estado vazio, que
  é quem ensina. Na tela Hoje, "Anotar um pedido" da agenda vazia virou `secundaria` (o
  primário da Hoje é o cartão dos primeiros passos enquanto ele existe; depois a Hoje é tela
  de leitura, e "Novo pedido" mora em `/pedidos`). As 26 ocorrências de `variante="primaria"`
  foram percorridas: as outras são mutuamente exclusivas por breakpoint (`hidden
lg:inline-flex` × flutuante `lg:hidden`), por estado (`ListaDoMercado` alterna
  primaria/secundaria entre os três botões de fechar) ou moram dentro de painel com scrim.
  **Nenhuma outra troca.**
- **P1 · contraste da navegação inferior e dos rótulos do painel: consertado.** Inativo em
  `text-ink-muted` (5,1:1) e não `text-ink-subtle` (3,45:1); rótulos "Custo da unidade" e
  "Sugerido" idem. Token não mudou; `ink-subtle` fica para ícone e metadado. Registrado na
  `#d123` e na tabela de contraste do `DESIGN.md`.
- **P1 · "Salvar" no cabeçalho do editor e guarda de edição: recusado, com motivo.** O
  cabeçalho é `sticky`, então o Salvar está sempre visível; o pé do editor é o painel de
  preço, e a 360px ele já leva três números e o campo; pôr um botão ali é o que a `#d75`
  tirou. A guarda de "sair sem salvar" nos quatro editores é a primeira linha de "Depois da
  017, por ordem de valor" deste arquivo e é spec própria, não conserto de marca.
- **P2 · prejuízo com duas cores: consertado.** `PainelPreco` ganhou o tom `negativo`
  (`bg-negative-soft`, `TrendingDown` em `text-negative`) para "Neste preço você perde": a
  mesma notícia com a mesma cor das listas, e o ocre fica para pendência e para o preço que
  não existe. É também a saída para o risco "âmbar e atenção no mesmo matiz" que a spec
  nomeia: o botão âmbar e a faixa de prejuízo deixaram de dividir matiz.
- **P2 · `border-strong` a 1,97:1: recusado, com motivo** (`#d123`): token do pacote, campo
  com rótulo e 48px, e escurecer o contorno pesaria toda a interface.
- **Menor:** `border-white/10` da barra lateral virou `border-brand-500` (`brand-500` entrou
  no `@theme inline`).
- **Não tocado, de propósito** (é gosto ou é outra spec): ícone na frente de título de bloco,
  os rótulos em micro caixa alta do painel, a anatomia repetida de `/financeiro`, "A conta que
  a sua concorrente não fez.", `SeloStatus` × tabela do `DESIGN.md` (o código está mais
  certo; o documento é dívida da 033-A), `font-display` em `SeletorMes`, os doze cartões da
  agenda, `/compras` sem porta fixa, as sete pílulas de `/pedidos`.

**Anel de foco sobre o botão âmbar e o teste da desassociação no aparelho (3.C.5): não
vistos.** Sem navegador nesta sessão. O `outline-offset: 2px` deixa 2px de superfície entre o
anel e o botão, e a critique acha que basta; o passo 11 do roteiro é quem confirma.

**Audit (3.C.5, passo 3), por máquina e por grep:** `dark:` em `src/` devolve zero fora de
comentário; cor solta zero (o `border-white/10` saiu); nenhum `<button>`/`<Link>` com altura
abaixo de 44px fora da classe `toque`; a faixa tem `role="img"` e `aria-label` com as parcelas
em percentual; o ponto do estado vazio é `aria-hidden` com `<span class="sr-only">.</span>`
ao lado; o ponto do painel é `aria-hidden` e a frase carrega o dado; o campo "Frase do
orçamento" é `Campo` de 48px com `maxLength={80}` e erro do schema.

**Polish (3.C.5, passo 4):** o ponto do painel subiu de `mt-1.5` para `mt-1` (centro na
primeira linha de 19,6px); a frase do rodapé da folha ganhou `max-w-[70mm]` para não espremer
o contato e o "feito com". `npx impeccable --json src/` **antes e depois: `[]`**.

### Critique depois (passo 15 do roteiro)

Segundo sub-agente, isolado, sem ver o primeiro relatório, mesma pauta. **30/40** (antes:
29/40), "Good"; a heurística 2 (mundo real) subiu de 3 para 4, e o veredito de IA continua
"não". O relatório confirma no código o que a C mudou: "um botão primário por tela **de fato se
sustenta** nas cinco telas, incluindo estados vazios"; "nenhum `text-accent-500`; o âmbar
nunca é texto"; "nenhum texto reprova" contraste nos dois temas; "o ponto âmbar aparece uma
vez, no dado que decide". O que ele apontou de novo, e o que foi feito:

- **P1 · anel de foco a 2,16:1 sobre o papel cru no claro: consertado no token.** `--focus`
  é `accent-600` no claro (3,4:1) e `accent-500` no escuro (9,1:1). É o único token que a C
  mudou; registrado na `#d123` e no `DESIGN.md`. Era exatamente a verificação que a 3.C.5
  pedia para o navegador, e a conta a antecipou.
- **P1 · a falha de salvamento da ficha nascia no pé de um formulário de 1.500 linhas com o
  Salvar no cabeçalho: consertado.** O `role="alert"` foi para logo abaixo do cabeçalho. A
  segunda metade (levar o foco ao primeiro campo com erro) **não** entrou: o campo pode estar
  numa dobra fechada, e o `focus()` num elemento oculto falha em silêncio; é da mesma spec da
  guarda de edição.
- **P1 · a 360px `/pedidos` empurra a agenda para baixo da dobra: recusado por ora.** É
  estimativa de altura a partir do código, e o próprio relatório pede para "confirmar no
  navegador"; nenhuma das três mudanças propostas (descrição só no desktop, atalho de compras
  fora do cabeçalho no celular, faixas de uma linha) é de marca. Fica para o roteiro, e se
  confirmar, é spec de layout da `/pedidos`.
- **P2 · dinheiro em `text-micro` ("sobram R$" na linha do pedido) e `formatarMoeda` cru ao lado
  de `<Dinheiro>` no recibo do lote: não tocado.** Pré-existente, três telas, e a `Parcela`
  em `Dinheiro` muda a leitura do bloco inteiro; é polimento de outra sessão.
- **P2 · `border-strong` a 1,97:1: mesma recusa da primeira critique** (`#d123`).
- **P2 · `SeloStatus` × `DESIGN.md`: consertado no documento.** O código estava certo nas duas
  critiques (em produção como atenção obrigaria o triângulo); a linha do `DESIGN.md` agora
  descreve o código, e a de "meta batida" já dizia `positive`.
- **P3 · o degrau mais claro da faixa (`/25`) lia como trilha vazia no claro (1,3:1):
  consertado**, escala `/90 /65 /45 /30`. O swatch de legenda ao lado de cada linha **não**
  entrou: as linhas são a legenda por ordem e o `aria-label` diz as parcelas; um quadradinho
  colorido por linha é cromo que a `#d126` não pediu.
- **O resto** (login com submit desabilitado, erro de campo sem ícone, `Salvar` em 48px no
  celular, confirmação de salvamento, guarda de edição, cartão × linha na Hoje, configuração
  sem porta fora da Hoje, sete pílulas, `SeletorMes` em display) é a mesma lista da primeira
  critique, e continua sendo de outras specs, não de marca.

### O código da C

Nenhuma rota, nenhum índice, nenhuma regra, nenhuma dependência. `git diff src/lib/types/
src/lib/firebase/` mostra **só** `ConfiguracaoGeral.frase` e `salvarConfiguracao` gravando o
campo; `package.json` sem linha nova.

- **A faixa (`#d126`):** `composicaoDoLote(custo): Segmento[]` e `ROTULO_PARCELA` em
  `domain/custoFicha.ts`; `components/fichas/FaixaDeComposicao.tsx` (10px, raio 3, `ink` em
  quatro degraus de opacidade e `accent-500` no destaque, sem vão, `role="img"`); acima das
  linhas de `Parcela` em "O custo do lote", que agora leem os rótulos da mesma constante, e a
  linha "Seu trabalho" em `accent-ink font-semibold`. Testes: o caso de aceite número por
  número (6240 · 900 · 1120 · 360 · 200 sobre 8820, frações 0,7075 · 0,1020 · 0,1270 · 0,0408 ·
  0,0227), custo zero → `[]`, e um kit com componentes e escolhas em sete parcelas. **Nenhum
  teste existente mudou**: 531 → 535.
- **O ponto (3.C.2):** no `PainelPreco` o `CornerDownRight` virou o ponto âmbar
  (`size-2.5`), só no caso positivo; nos de atenção o triângulo fica. Em `EstadoVazio`, título
  que termina em "." troca o ponto final pelo ponto âmbar (`size-2`, `aria-hidden`) mais um
  `sr-only` com o ponto: cobre os cinco estados vazios da marca e, de propósito, nenhum erro
  de carga nem "Nada com esse filtro". A barra e o texto de "Meta batida" foram para
  `positive`. `rg "bg-accent-500" src/` devolve exatamente os sete lugares da spec.
- **A frase dela (`#d127`):** `ConfiguracaoGeral.frase?`, `esquemaConfiguracao.frase`
  (`max(80)`), campo "Frase do orçamento" no bloco "Na folha do orçamento" de `/configuracao`
  (o bloco não tem "Mais detalhes"; a dobra é dos dois formulários da 020, e um campo só atrás
  de uma dobra seria esconder por esconder), `salvarConfiguracao` com `deleteField()` no vazio,
  `Orcamento.negocio.frase?` lida como o telefone, teste com e sem, e o rodapé da folha em três
  partes: contato · a frase dela (quando há) · "feito com Rende" em `ink-subtle`.
  `FRASE_RODAPE` morreu. **A conta real precisa preencher o campo uma vez** ("Feito com amor
  em cada mordida."), ao lado da nota do Pix (`#d98`).
- **As palavras (3.C.4):** as microcopy 1 a 10 e 12 de `MARCA.md` § 3.4 entraram, sem
  travessão (dois-pontos no lugar). Adaptações registradas: "Nada pra comprar **por
  enquanto**" (o período tem pílulas de 7, 15 e 30 dias; "esta semana" mentiria em duas
  delas), e só no estado sem pedido e sem reserva, porque com pedido a frase do botão "Montar
  a lista" é a que ensina; o estado vazio do caixa perdeu o nome do mês no título (o
  `SeletorMes` logo acima já o diz) e ganhou "A encomenda paga entra sozinha." ao fim da
  frase do manual, porque era a informação que a frase antiga carregava; `/offline` diz "Sem
  internet, e tudo bem." e mantém a instrução de voltar a uma tela já aberta (é a única coisa
  que aquela página resolve), sem "sincroniza". O selo virou "Salvo no aparelho" (offline) e
  "Enviando" (fila com sinal): o selo não conta pendências, então o "3 alterações sobem" do
  manual fica de fora. "Custo desatualizado" já era a palavra. A confirmação de arquivar
  pedido trocou o botão "Cancelar" por "Deixar como está": a frase ao lado fala em _cancelar
  o pedido_, e o botão dizia a mesma palavra para o contrário. Itens 16 a 19 comparados e
  mantidos (as palavras dela, `#d117`); o "mínimo pra não perder" do item 19 não entrou porque
  o "Sugerido" ao lado já é a saída. `rg "insumo|ficha técnica|dashboard|onboarding|sincroniza"`
  em texto de tela: zero (só identificadores e rotas).

Portão de conclusão rodado de verdade: lint limpo, typecheck limpo (app e service worker),
**535 testes**, build com as 18 rotas de antes e o service worker gerado. **Nada disto foi visto
em navegador nesta sessão.** O roteiro "Depois da C" (passos 11 a 15) é o que confere o que o
build não vê: a faixa alinhada com a linha "Seu trabalho", o ponto no painel e nos estados
vazios, a frase no rodapé da folha, e o anel de foco sobre o botão âmbar.

## O que a sessão 034 deixou pronto

O desktop passou a ocupar a tela que tem (`specs/034-a-tela-inteira.md`; `DECISOES.md#d128` a
`#d130`). Cromo e arranjo, fora da ordem do roadmap como a 033, e por cima dela: **publica
junto com a 033**. Nenhum campo, nenhuma rota nova, nenhuma consulta, nenhuma regra, nenhum
índice, nenhuma dependência; `git diff src/lib/firebase/ src/lib/types/ firestore.rules
firestore.indexes.json package.json` vazio. Em `src/lib/domain/`, só `custoGravado`.

- **A faixa em tinta em todo cabeçalho (`#d128`).** `CabecalhoPagina` são duas faixas no mesmo
  `<header>` grudento: a de contexto em `brand-700` sangrando até a borda da área de conteúdo
  (`@utility sangria`, `overflow-x-clip` no invólucro de `AppShell`), sem filete, com `voltar`
  novo e `descricao` em `ReactNode`; a de ferramentas no papel, só com `children`. As ações
  invertem por escopo de tokens (`@utility sobre-marca`, irmão da `folha`): nenhum componente
  de ação aprendeu que está sobre a tinta. **Os cinco cabeçalhos próprios morreram**
  (`FormularioFicha`, `FormularioPedido`, `TelaContagem`, `TelaContagemPronto`, `TelaNota`),
  e as regras `apertado:` do editor foram para o componente. `LinkVoltar` só é importado por
  `CabecalhoPagina` agora.
- **A coluna de leitura é da tela (`#d129`).** `AppShell` sem `max-w-5xl`;
  `src/app/(app)/(coluna)/layout.tsx` é a coluna, e **todas as páginas entraram nele, menos
  `fichas/page.tsx`** (`git mv`, nenhum import mudou). O build sai com as mesmas 18 rotas.
- **`/fichas` em tabela no desktop.** `LinhaFicha` tem os dois arranjos no mesmo `<li>`: a
  linha do celular exatamente como estava (`lg:hidden`) e a grade de seis colunas
  (`COLUNAS_FICHA`, exportada para o cabeçalho de colunas em `ListaFichas`). Rótulos em
  `sr-only` por célula; sobra negativa com sinal (`aria-hidden`), `negative` e o triângulo.
  Linha selecionada em `bg-sunken` com `aria-current="true"`.
- **`PainelProduto` (`#d130`),** `hidden lg:flex`, 26rem, coluna acoplada ao lado da tabela e
  não o `Painel`. Lê `custoGravado(ficha)`; a legenda são os segmentos de `composicaoDoLote`
  em `Parcela`, que saiu de `FormularioFicha` para `FaixaDeComposicao.tsx`. Foco no painel ao
  abrir e ao trocar; `Escape` e "×" fecham e devolvem o foco à linha; a seleção é derivada de
  `dados`. Clique simples no `lg:` abre o painel (`matchMedia`, `preventDefault`); botão do
  meio e Ctrl+clique abrem o editor.
- `domain/custoFicha.ts`: `FichaComCusto` e `custoGravado`. Teste: o cookie clássico gravado
  sem `custoEscolhas`, mapeado campo a campo, e a faixa saindo dele com as cinco parcelas do
  caso de aceite. **535 → 536**, nenhum teste existente mudou.
- `DESIGN.md`: "Cabeçalho de contexto" e "Tabela" na tabela de componentes; a coluna por tela
  em "Estrutura responsiva".

**Desvios da letra da spec, registrados:** as parcelas do painel são os segmentos da faixa
(parcela zerada não aparece), e não as sete linhas condicionais do editor (`#d130`); o
"Sugerido" da tabela e do painel é o `precoSugerido` gravado, antes do arredondamento, porque o
arredondado não é gravado (`#d130`).

Portão de conclusão rodado de verdade: lint limpo, typecheck limpo (app e service worker),
**536 testes**, build com as 18 rotas de antes e o service worker gerado; `npx impeccable
--json src/` continua `[]`. Os `.next/types`
gerados por um `next dev` anterior apontavam para os caminhos velhos e derrubaram o primeiro
`typecheck`; apagar `.next/types` e `.next/dev/types` e rodar o build de novo resolveu, e é o
que quem abrir o projeto com um `.next` velho vai precisar fazer uma vez. **Nada disto foi
visto em navegador nesta sessão.** O roteiro de aceite da spec (oito passos) é o que confere o
que o build não vê: a sangria cortada no lugar certo nos dois tamanhos, o `sticky` preso com o
`overflow-x: clip`, o anel de foco âmbar sobre a tinta, o Ctrl+clique abrindo o editor e o
foco voltando à linha depois do `Escape`.

## O primeiro passe de navegador sobre a 033 e a 034 (`#d131`)

Seis prints de quem conduz o projeto, no desktop e no tema claro, e um conserto de raiz:
o `tailwind-merge` lia a escala de texto do código como cor e descartava metade dos pares
`text-<tamanho> text-<cor>` passados por `cn()`. `cn.ts` agora usa `extendTailwindMerge`
com a escala do `@theme inline`; nenhum componente mudou por isso, mas **a tela muda**: os
botões passam a ter cor própria (o secundário inverte sobre a faixa em tinta, o terciário é
`brand-ink`, o destrutivo é `negative`, o primário no escuro é `on-accent`), e selo, pílula,
`LinkVoltar`, rótulos da barra lateral, cabeçalho de colunas, o "R$" do `Dinheiro` e o preço
em `display` do `PainelProduto` saem no tamanho e na cor que `DESIGN.md` diz. Junto:
"O que comprar" e "O que está pronto" na altura do primário; `FaixaResumo` para "A receber"
e "Entregas a pagar"; em `/comecar`, a nota da meta em faixa rebaixada com ícone e o offline
com o recuo das listas; o ponto do logotipo com o vão do SVG do pacote (`0.31em`). Portão
rodado: lint e typecheck limpos, 536 testes, build com as 18 rotas. As peças do parágrafo
acima entram no roteiro da 034, nos dois temas.

## A spec 023 · Sair sem salvar

**Entregue**, primeira spec da fase 1 do roadmap. Um hook, um primitivo, e cinco telas que
descartavam trabalho em silêncio param de fazer isso:

- `src/components/ui/useGuardaDeSaida.tsx`: enquanto a tela está suja, guarda as três portas
  de saída — o link (captura do clique, sem `stopPropagation`), o voltar do navegador (a
  sentinela no histórico, `#d132`) e recarregar ou fechar a aba (`beforeunload`). `navegar(href)`
  é a saída de quem já salvou; `pedir(acao)` é para um botão que não é link.
- `src/components/ui/Confirmacao.tsx`: a primeira modal do sistema, o `<dialog>` nativo que o
  `DESIGN.md` já reservava para confirmação destrutiva (`#d133`).
- `focarPrimeiroErro` em `src/components/ui/Campo.tsx`: depois de o Salvar recusar, o foco vai
  ao primeiro campo com `aria-invalid`, inclusive dentro da dobra "Mais detalhes" (de carona da
  033-C).
- As cinco telas — `FormularioFicha`, `FormularioPedido`, `TelaConfiguracao`, `TelaContagem`,
  `TelaContagemPronto` — ganharam a assinatura própria de "sujo" (`#d134`) e o hook; os
  `router.push` de salvar/arquivar viraram `guarda.navegar`. `PainelFornada`: "Contar o pote"
  virou `Link` para que a captura do clique o veja (3.5).
- `BlocoOrcamento`: o comentário "o formulário não sabe se está sujo" saiu — o link agora
  pergunta, pela guarda do editor de pedido.

Decisões novas em `DECISOES.md#d132` a `#d134`. Nenhum campo, nenhuma rota, nenhuma regra,
nenhum índice, nenhuma dependência, nenhuma linha em `src/lib/domain/`: `git diff` dessas
pastas mais `firestore.rules`, `firestore.indexes.json` e `package.json` está vazio. Portão
rodado de verdade: lint e typecheck limpos, os mesmos 536 testes, build com as 18 rotas
estáticas de sempre. **O roteiro de dezesseis passos não rodou nesta sessão** — os passos 3,
12 e 15 exigem Android de verdade, porque é o único lugar onde a sentinela, o `<dialog>` e o
gesto de voltar do sistema operacional são vistos juntos.

## A spec 024 · Fichas no vermelho

**Entregue**, a segunda spec da fase 1 do roadmap, e a frase que o `docs/saas/CLAUDE.md` chama
de "a notificação que salva assinatura": "o chocolate subiu, três produtos ficaram no vermelho".
Só leitura — nenhum campo, nenhuma mutação, nenhuma rota, nenhuma regra, nenhum índice, nenhuma
dependência, nenhuma linha em `src/lib/firebase/`:

- `domain/custoFicha.ts`: `custoDeHoje` e `custosDeHoje`, ao lado de `custoGravado`. A sobra de
  hoje é o gravado mais o que mudou, linha a linha, com as mesmas funções que gravaram
  (`custoLinhaItem`, `custoLinhaComponente`, `custoDasEscolhas`); sem mudança, o resultado é o
  gravado centavo por centavo, por construção (`#d135`). `CustoDeHoje.caiu` só fica `true`
  quando o produto cruza uma linha desde o último Salvar — o zero, ou a margem pedida (`#d136`).
- `LinhaFicha.tsx`: a seta "sobram R$ 1,80 → R$ 0,90" na coluna Sobra, em toda diferença
  (inclusive kit, inclusive para cima), só quando `hoje.sobra !== lucroUnitario`; a palavra, a
  cor e o ícone passam a seguir a sobra de hoje. `palavraSobra` e `fraseSetaSobra` nasceram
  aqui e são reusadas pelo cartão da Hoje.
- `PainelProduto.tsx`: com o selo de custo desatualizado ligado e o número mudado, a frase às
  cegas ("Abra o produto e salve para recalcular") vira "Com os materiais de hoje custa R$ 2,93
  e sobram R$ 3,97 por unidade. Chocolate foi o que mais subiu."; com o número igual (a marca
  mudou, o preço não), a frase antiga fica.
- `CartaoNoVermelhoHoje.tsx`, na tela Hoje entre a meta e a agenda: só existe quando alguma
  ficha viva cruzou uma linha; título e ícone seguem se a pior perde ou só fica abaixo da
  margem; "e mais N" no plural, sem `listarNomes` — o nome que importa é o pior, os outros
  estão a um toque.
- `ListaFichas.tsx`: `custosDeHoje(dados, insumos)` num `useMemo`, passado à linha e ao painel
  só quando a despensa chegou — a mesma regra da capacidade.

Decisões novas em `DECISOES.md#d135` e `#d136`. Testes: os nove casos de aceite do domínio, em
`tests/domain/custoFicha.test.ts` — **536 → 547**. Portão rodado de verdade: lint e typecheck
limpos, os 547 testes, build com as mesmas rotas de sempre (nenhuma nova); `npx impeccable
--json src/` continua `[]`; `git diff` de `src/lib/types/`, `src/lib/firebase/`,
`firestore.rules`, `firestore.indexes.json` e `package.json` vazio. **O roteiro de dez passos
não rodou nesta sessão** — o passo 1 (sem mudança, nenhuma seta em lugar nenhum) e o passo 3 (o
número que a lista mostra bate com o que o editor recalcula) são os dois que provam que o
`#d135` está certo, e os dois dependem de conta real com rede.

## Próxima ação

**Publicar a 033 e a 034 juntas** (`docs/DEPLOY.md`). Antes, os roteiros no `npm run dev`, nos
dois temas, a 360px e a 1280px: o da 033, "Depois da A" (passos 1 a 5), "Depois da B" (6, 7, 9
e 10) e "Depois da C" (11, 13, 14 e 15); e o da 034, os oito passos do fim da spec, com o 7
(leitor de tela numa linha da tabela) sendo o que decide se os dois arranjos no mesmo `<li>`
estavam certos. É o único lugar onde uma troca de classe que acertou o nome e
errou o papel aparece, onde a geometria do ponto do logotipo é vista de verdade, onde o
segmento âmbar da faixa se alinha (ou não) com a linha "Seu trabalho", e onde o anel de foco
âmbar sobre o botão âmbar é julgado (3.C.5; se não bastar, `outline-color: var(--brand-700)`
no `:focus-visible` do primário e a nota na `#d123`). Depois do deploy, **o passo 8**:
desinstalar e reinstalar o app no Android e no iPhone, porque `theme_color` e
`background_color` são assados no WebAPK (`#d76`, `#d124`); **o passo 12**, o teste da bancada
a meio metro, e o teste da desassociação: `/fichas/[id]` ao lado da caixa da MyCookie's; e
**a frase**: "Frase do orçamento" em `/configuracao`, uma vez (`#d127`).

**Com a 033 fechada, a 023 e a 024 entregues, o que falta da fase 1 do roadmap são as cinco a
oito entrevistas com confeiteiras que não são a Maynara** (`docs/saas/ROADMAP.md`). A 024 rodou
antes delas, por decisão de quem conduz o projeto: a spec não dependia de código nenhum, e o
roadmap não exigia a ordem. Depois das entrevistas: a 025 se pedirem clientes, a 026 se falarem
da fornada que quebrou.

**Rodar o roteiro de oito passos da spec 020** (duas contas, DevTools em Offline nos passos 1 a
5): confirma que a ficha-modelo abre com "Mais detalhes" fechada, que insumos da conta real com
marca ou fornecedor abrem a dobra sozinhos, e que um erro dentro de uma dobra fechada a força a
abrir. É esse roteiro, e não o portão de conclusão, que diz se a dobra ficou no lugar certo.

**A 021 está entregue** (`specs/021-as-palavras-dela.md`, `DECISOES.md#d117`). As cinco
respostas da Maynara: **insumo → material, ficha → produto**; fornada, pedido e caixa ficam; "o
que está pronto" fica em aberto até a gravação (ela ofereceu "pronta entrega" e "estoque", os
dois com problema que a spec descreve). "Encomenda" no corpo fica: é palavra dela também. A
segunda confeiteira ainda não foi perguntada e não muda o resultado da fase 0. A auditoria das
quatro telas fora do menu confirmou: todas já tinham porta desde a 13D; a que faltava, "Fechar e
ler a nota" em `/compras`, esta sessão deu.

**Com a 021, as quatro specs da fase 0 estão entregues** (018, 019, 020, 021). O que falta não é
código: é **gravar a Maynara abrindo uma conta nova sem ninguém ao lado**, contando as perguntas
em voz alta — é essa contagem, e não o portão de conclusão, que diz se a fase 0 terminou. Quando
a gravação acontecer: conferir os cinco textos de `onboarding.ts` contra as palavras dela um a
um; fechar a 3b ("o que está pronto") com a palavra que ela usar; e registrar em `#d117` cada
palavra que travar. Sem gravação, o próximo código é rodar os seis roteiros de navegador que
esta e as três specs anteriores deixaram por rodar (018, 019, 020, 021) — nenhum deles é
bloqueante, mas nenhum foi visto rodando de verdade.

**Rodar o roteiro de sete passos da spec 019** (conta vazia de verdade, DevTools em Offline nos
passos 1 a 4): confirma que o cartão oferece a biblioteca como ação primária do passo 1 numa
conta vazia e o link numa conta com insumo cadastrado à mão, e que `/comecar` não promete mais
dependência na ordem dos cinco.

**Rodar o roteiro de aparelho da 17A/17B** (oito passos, no fim da spec `017-orcamento-em-papel.md`).
O passo 1 é o que decide se a decisão 1 estava certa: Ctrl+P no Chrome, **uma página**, sem
barra lateral, sem navegação, sem a barra de botões, e o bloco do total em vinho cheio mesmo com
"Gráficos de fundo" desmarcado. O passo 3 (Android, app instalado) é o risco nomeado: se
`window.print()` não abrir nada no modo `standalone`, a barra ganha "Abrir no navegador" e a
spec registra. O passo 7 (360 px) é onde se decide se `zoom` fica ou vira `transform: scale`.
O passo 8 é o da 17B: uma ficha com foto e outra sem no mesmo pedido, a assinatura PNG sobre a
linha, e o pedido só de fichas sem foto com a coluna sumindo. Antes dele, a conta real precisa
de uma foto numa ficha e da assinatura em `/configuracao`: são toques, e não código.

**Rodar também o roteiro de sete passos da spec 018**, com o passo 6 — salvar a configuração
sem mudar nada e ver o preço da ficha-modelo continuar o mesmo — provando que `rateioDaConta`
não tem um segundo lugar decidindo "salvo, senão sugerido".

**A 019 já rodou** (a reordenação acima), sem esperar a gravação — a spec previa isso: os cinco
textos novos já são melhores que os de antes, e a dívida de conferi-los contra a gravação fica
na tabela. O que a gravação ainda decide é se a **020** é a próxima da fase 0 ou se a 019
precisa de uma segunda passada. Na ordem do roadmap revisto pelo `#d113`: 020 os dois
formulários com o resto atrás de "Mais detalhes", 021 o vocabulário perguntado a ela, e só
então 022 a segunda conta.

**Rodar o roteiro de sete passos da spec 015**, com DevTools em Offline do passo 1 ao 5. É o
único lugar onde a correção pode ser vista: `npm test` não toca no Firestore. O passo 1 é o que
decide se a leitura da spec estava certa — se o selo de "custo desatualizado" aparecer em
`/fichas` **antes** de religar a rede, está; e o passo 6 (fechar a aba, reabrir, religar) é o
que separa esta spec de um conserto de sensação.

**Rodar também o roteiro de sete passos da spec 016.** O passo 1 já foi visto pela metade: a
tela abriu pedindo o índice `DESC`, ele foi publicado, e a consulta do histórico responde com o
Admin SDK — falta ver a tela carregar. Como a conta real tem mais de 30 concluídos, o botão
aparece com `PAGINA_DO_HISTORICO` em 30, sem precisar baixar para 3. O passo 3 — "A receber"
com o mesmo número antes e depois de "Mostrar mais antigos" — é o que prova que a leitura sobre
`aReceber` está certa. Se der números diferentes, pare: a faixa precisa de mais um conjunto
além dos dois.

**Depois da 017, por ordem de valor**, e nenhuma delas com spec escrita ainda:

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

O portão de conclusão foi rodado de verdade em 2026-09-15, no fim da 17B e da 018, e passa nos
quatro: lint, typecheck, 526 testes e build com 17 rotas estáticas mais as
dinâmicas, a `/pedidos/[id]/orcamento` entre elas. Portão passando não
é o mesmo que sistema pronto — nenhum dos quatro toca no Firestore nem abre um navegador —, e é
por isso que os roteiros da 015, da 016 e da 017 são a próxima ação, e não itens já fechados.

## O que a verificação visual já corrigiu

A primeira rodada de capturas em navegador (desktop, tema escuro) achou três coisas:

- **Largura de coluna padronizada.** Havia três larguras de conteúdo em uso e nenhuma
  decidida: listas em 1024px centralizadas, editores e `/compras` em 768px encostados à
  esquerda, configuração em 672px. Agora toda tela usa a coluna do shell, e os campos que
  ficariam largos demais foram pareados em grade de duas colunas. `DECISOES.md#d42`. **Desde a
  034 a coluna é do grupo de rota `(coluna)`, e não do shell** (`#d129`): a largura é a mesma,
  e só `/fichas` fica fora dela.
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

| Dívida                                                                                                                                | Onde                                           | Quando resolver                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Acesso concedido por script, sem cadastro self-serve                                                                                  | `scripts/conceder-acesso.mjs`                  | Spec 027, fase 2 do roadmap — depois do beta (`#d16`, `#d111`)                                                   |
| Agregados incrementados no cliente                                                                                                    | `src/lib/firebase/mutations/`                  | Deixou de ter prazo: nenhum número do agregado decide cobrança (`#d112`)                                         |
| Configuração aberta sem rede e sem cache diz "valores sugeridos"                                                                      | `TelaConfiguracao.tsx`                         | Não tem conserto: cache vazio não distingue "não existe" de "não sei" (`#d43`)                                   |
| Agregado do mês pode ficar torto se um delta se perder no caminho                                                                     | `mutations/agregado.ts`                        | Tem escape: "Recalcular o mês" na tela. A troca real é a mesma de D10                                            |
| Mudar um lançamento de mês não move o espelho da meta do mês destino                                                                  | `mutations/transacoes.ts`                      | Mesmo escape e mesma troca: `DECISOES.md#d29`                                                                    |
| Produto revertido sobra zerado no agregado até recalcular                                                                             | `mutations/agregado.ts`                        | `produtosOrdenados` o esconde na leitura; recalcular limpa (`#d37`)                                              |
| `ultimoPedidoEm` do cliente não volta atrás ao desfazer um pagamento                                                                  | `mutations/clientes.ts`                        | Só com histórico de pagamentos, que não existe (`#d37`)                                                          |
| Cliente ainda não tem tela: os agregados dele andam e ninguém os lê                                                                   | `mutations/clientes.ts`                        | Spec 025, fase 1 do roadmap (`#d35`)                                                                             |
| Meta não guarda histórico: reescrever o alvo apaga o anterior                                                                         | `mutations/metas.ts`                           | Se "que meta eu tinha antes" virar pergunta real (`DECISOES.md#d27`)                                             |
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue                                                                         | `src/lib/types/fichas.ts`                      | Se "produto fora de linha" virar diferente de "arquivado"                                                        |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g                                                                            | `FormularioFicha.tsx`                          | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor                                            |
| `Bloco` e `BlocoConfiguracao` continuam primos                                                                                        | `src/components/`                              | Se a configuração precisar do mesmo bloco; hoje ela tem rodapé próprio                                           |
| Não dá para arquivar uma cliente: só cadastrar e editar, de dentro do pedido                                                          | `mutations/clientes.ts`                        | Junto da tela de clientes, quando ela existir (`DECISOES.md#d35`)                                                |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`                                                                      | `src/lib/types/configuracao.ts`                | **Ganhou leitor na 010**: o resumo da cliente. Espelho velho agora sai na mensagem                               |
| Dois toques no mesmo quadro na lista de compras podem perder uma marca                                                                | `ListaDoMercado.tsx`                           | Se acontecer: `comprado` sai do array e vira mapa por `insumoId` (`#d40`)                                        |
| A contagem existe e depende de ela contar: sem contar, a lista compra o cheio                                                         | `/insumos/contagem`                            | Não tem conserto em código: as defesas são o erro barato e a semeadura pela compra                               |
| A tela de contagem, o lote, as frases de `/compras` e a semente sem teste                                                             | `components/estoque/`, `compras/`              | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                                        |
| A frase da lista desatualizada não sabe **o que** mudou, só que mudou                                                                 | `ListaDoMercado.tsx`                           | Exigiria guardar quando a lista foi montada e comparar com cada contagem (`#d63`)                                |
| A rota, a tela da nota, a gravação em lote e a guarda do caixa sem teste                                                              | `api/nota/`, `components/notas/`               | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                                        |
| Cadastrar a nota espera o servidor: sem rede o botão fica preso em carregando                                                         | `TelaNota.tsx`                                 | Não incomoda hoje — a tela já exigiu rede para ler (`#d50`); se incomodar, `#d40`                                |
| O cache de CNPJ vive na memória do processo e morre no reinício                                                                       | `api/nota/route.ts`                            | Só se a cota de 3/min por IP apertar, que é o dia do segundo cliente (`#d52`)                                    |
| Reler uma nota exige fotografar de novo: a imagem não é guardada                                                                      | `api/nota/route.ts`                            | Se "ver a nota do mês passado" virar pergunta real, nasce com Storage (`#d49`)                                   |
| A guarda de duplicidade depende de o modelo ler o mesmo CNPJ nas duas fotos                                                           | `domain/notaFiscal.ts`                         | Passo 7 do roteiro da 006 é quem responde; falhando, entra o QR Code da NFC-e                                    |
| Nota sem CNPJ legível lança sem guarda: a mesma nota pode entrar duas vezes                                                           | `TelaNota.tsx`                                 | Não tem conserto barato: chave por nome sai diferente de duas fotos (`#d54`)                                     |
| Duas notas da mesma loja, no mesmo dia, com o total ilegível nas duas colidem                                                         | `domain/notaFiscal.ts`                         | Falso positivo visível, desfeito em um toque; se acontecer, a chave ganha a hora                                 |
| `agregados/global` é escrito por três mutações e lido por ninguém                                                                     | `types/financeiro.ts`                          | Se algum leitor aparecer; a 008 decidiu não ser ele (`#d67`)                                                     |
| `pedidosAbertos`, `proximaEntrega` e `ultimoNumeroPedido` nunca são escritos                                                          | `types/financeiro.ts`                          | Spec de limpeza, como a remoção de `estoqueMinimo` na 7A. Ninguém os lê hoje                                     |
| O cartão, a página, o gancho e a escrita na conta, sem teste                                                                          | `components/comecar/`                          | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                                        |
| Os cinco textos do começo são melhores que os de antes, mas ainda são nossos, não os dela                                             | `domain/onboarding.ts`                         | Quando a gravação da usuária 0 acontecer: conferir os cinco, um a um, contra as palavras dela (`#d115`)          |
| Um passo fecha com o documento existindo, e não com ele estando bom                                                                   | `domain/onboarding.ts`                         | Não tem conserto: o caminho diz onde ela está, e não se ela fez bem                                              |
| `/comecar` nunca foi vista em 360px nem no tema claro, e não há captura                                                               | `components/comecar/`                          | Critério da 8B em aberto: depende de navegador, de login e de conta de verdade                                   |
| O bloco de instalar nunca foi visto sumindo com o app instalado                                                                       | `InstalarNaTela.tsx`                           | Critério da 8B em aberto: exige instalar de fato, no iPhone e no Android                                         |
| Não há diretório de capturas no repositório, e o protocolo da 5B pedia um                                                             | `docs/`                                        | A 5B rodou sem arquivar captura. Fica se um dia houver o que comparar com o de antes                             |
| `LIMITE_ARQUIVO_BYTES` é 8 MB e o Vercel corta o corpo em 4,5 MB (~3,3 MB)                                                            | `domain/notaFiscal.ts`                         | Se PDF de nota grande virar rotina: baixar para 3 MB e recusar antes do upload                                   |
| A chave de conta de serviço fica legível no painel e não gira sozinha                                                                 | `FIREBASE_SERVICE_ACCOUNT`                     | No dia do SaaS: gerenciador de segredos com rotação (`#d72`)                                                     |
| O roteiro A da 009 nunca rodou: nenhuma tela foi vista com o teclado aberto                                                           | `ui/RodapeFixo.tsx`, `globals.css`             | Exige Android na mão. Seis telas que funcionavam foram editadas sem teste por trás                               |
| A barra `brand-700` e o ícone novo nunca foram vistos no aparelho: o WebAPK assa cor e ícone na instalação                            | `app/manifest.ts`                              | Passo 8 do roteiro da 033, depois do deploy: desinstalar e reinstalar o app no Android e no iPhone (`#d124`)     |
| 560px é limiar chutado: aparelho pequeno com fonte aumentada pode entrar nele                                                         | `globals.css`                                  | Degradação feia, não quebra. O conserto é `visualViewport` (`#d74`)                                              |
| O `wa.me` nunca foi aberto: ninguém viu a mensagem chegar escrita na conversa                                                         | `pedidos/BlocoWhatsApp.tsx`                    | Roteiro de aparelho da 010: exige celular com WhatsApp instalado, e depois desktop                               |
| O resumo pode ser mandado sem o pedido estar salvo                                                                                    | `FormularioPedido.tsx`                         | Aceito em `#d78`; se morder, o botão salva antes de abrir o link                                                 |
| A mensagem não diz as observações, nem quando são recado da cliente                                                                   | `domain/whatsapp.ts`                           | Só com um segundo campo de dono declarado — não relaxando este (`#d79`)                                          |
| Não se sabe se ela apertou enviar: o link não devolve nada                                                                            | `pedidos/BlocoWhatsApp.tsx`                    | Não tem conserto neste canal; gravar "enviado" sem saber seria pior (`#d77`)                                     |
| Os meses já tortos continuam tortos até alguém apertar "Recalcular o mês"                                                             | `agregados/{'YYYY-MM'}`                        | Próxima ação, com rede: um mês por vez, guiada pelo aviso do `#d81`                                              |
| Escrita recusada pelas regras falha calada, só no console — agora em `mutations/` inteiro                                             | `mutations/despachar.ts`                       | Volta à mesa se existir papel com permissão parcial (`#d80`, `#d104`)                                            |
| Ficha nunca aberta neste aparelho não ganha selo quando o preço muda offline                                                          | `marcarFichasDesatualizadas`                   | Se doer: a tela passa os `fichaIds` que já tem, e não uma segunda consulta (`#d104`)                             |
| O roteiro de sete passos da 015 nunca rodou: o selo e o espelho offline sem prova                                                     | `mutations/insumos.ts`, `metas.ts`             | Próxima ação, com DevTools em Offline; `npm test` não toca no Firestore                                          |
| O aviso de divergência não cobre `produtos` nem `porDia[].pedidos`                                                                    | `domain/caixa.ts`                              | Exigiria a `/financeiro` assinar a consulta de pedidos pagos do mês (`#d81`)                                     |
| Arquivar o acerto direto em `/financeiro` deixa os pedidos marcados                                                                   | `components/financeiro/`                       | Se acontecer de verdade: vira guarda na tela, como a da nota (`#d52`)                                            |
| `lucroEstimado` do pedido continua com a taxa de entrega dentro                                                                       | `domain/pedido.ts`                             | Quem fecha a conta é o caixa; corrigir mexeria em todo pedido gravado (`#d82`)                                   |
| A entrega que ela esqueceu de marcar só é paga na semana seguinte                                                                     | `domain/pedido.ts`                             | Não tem conserto em código: a frase do painel é a defesa (`#d83`)                                                |
| A faixa, o painel, o lote do repasse e a saída em `ENTREGA` sem teste                                                                 | `components/pedidos/`                          | `npm test` cobre só `domain/`; o que fecha isso é a passagem em navegador                                        |
| A fornada existe e depende de ela registrar: sem registrar, nada muda                                                                 | `components/producao/`                         | Não tem conserto em código: a spec é aditiva de propósito (`#d91`)                                               |
| Fornada com `pedidoId` mais velha que 30 dias sai do abate do pedido                                                                  | `mutations/fornadas.ts`                        | Se houver encomenda assada com mais de um mês: a janela vira a maior data de entrega                             |
| A fornada aberta pela ficha nasce sem pedido, mesmo quando era para um                                                                | `FormularioFicha.tsx`                          | Se ela registrar pela ficha e a lista comprar de novo: índice `fichaIds` + `arquivado`                           |
| A folha, as duas entradas, a consulta e as frases do forno sem teste                                                                  | `components/producao/`, `compras/`, `estoque/` | `npm test` cobre só `domain/`; o que fecha isso é o roteiro da 13A em navegador                                  |
| Entrega paga pela cliente e nunca acertada some de "Entregas a pagar" ao cair da página                                               | `ListaPedidos.tsx`                             | Se for inaceitável: `entrega.repassePendente` gravado por quatro mutações + backfill (`#d105`)                   |
| O roteiro de sete passos da 016 nunca rodou: "A receber" por página e o botão offline sem prova                                       | `ListaPedidos.tsx`                             | Próxima ação; o índice já respondeu via Admin SDK, e `npm test` não toca no Firestore                            |
| O roteiro de sete passos da 018 nunca rodou: o botão, a ficha-modelo e as duas faixas sem prova                                       | `BotaoBiblioteca.tsx`, `FormularioFicha.tsx`   | Próxima ação, numa conta vazia de verdade; `npm test` não toca no Firestore                                      |
| O roteiro de oito passos da 020 nunca rodou: a dobra abrindo e fechando sozinha sem prova                                             | `FormularioInsumo.tsx`, `FormularioFicha.tsx`  | Próxima ação, com duas contas (uma vazia, a real); `npm test` não toca no Firestore                              |
| Limpar "Válido até" no editor não apaga a validade gravada: ela volta ao reabrir                                                      | `mutations/pedidos.ts`                         | `deleteField()` quando o campo chega vazio, se "sem prazo" virar escolha de verdade (`#d110`)                    |
| Nenhum PDF foi gerado: o `#d106` nos três sistemas, o `zoom` a 360 px e o fundo do total sem prova                                    | `TelaOrcamento.tsx`, `globals.css`             | Roteiro de aparelho da 017, oito passos; `npm test` não abre navegador                                           |
| A folha lê o gravado e o WhatsApp lê a tela: um pedido editado e não salvo diverge entre os dois                                      | `BlocoOrcamento.tsx`                           | Aceito em `#d107`; se morder, o link salva antes de abrir (`#d78`)                                               |
| A redução de imagem, o `CampoImagem` e a folha com foto e assinatura nunca foram vistos rodando                                       | `utils/imagem.ts`, `ui/CampoImagem.tsx`        | Passo 8 do roteiro da 017; `npm test` não tem `canvas`                                                           |
| A assinatura mora em `configuracao/geral`, que o app inteiro lê ao subir                                                              | `types/configuracao.ts`                        | Se pesar: vai para `configuracao/assinatura`, lido só pela folha e pela configuração (`#d109`)                   |
| Pedido de duas páginas: a segunda começa na borda do papel, porque a margem é `padding` da folha                                      | `globals.css`                                  | Passo 6 do roteiro da 017; o conserto é `@page { margin: 16mm 16mm 18mm }` com a folha sem padding na impressão  |
| O roteiro de sete passos da 021 nunca rodou: "Materiais"/"Produtos" em 360px e a caixa de "Fechar e ler a nota" sem prova em aparelho | `navegacao.ts`, `ListaDoMercado.tsx`           | Próxima ação, no celular dela, app instalado; `npm test` não abre navegador                                      |
| "O que está pronto" segue sem nome: 3b não fechou                                                                                     | `docs/DECISOES.md#d117`                        | Fecha só com a gravação; "pronta entrega" e "estoque" são as duas candidatas dela, as duas com problema          |
| O roteiro de nove passos da 022 nunca rodou: sair com pendência offline, o convite de ponta a ponta e `npm run metricas` sem prova    | `AuthProvider.tsx`, `scripts/`                 | Próxima ação, com DevTools em Offline e um e-mail sem login; `npm test` não abre navegador nem chama o Admin SDK |
| O roteiro de dezesseis passos da 023 nunca rodou: a sentinela, o `<dialog>` e o gesto de voltar do Android sem prova                  | `useGuardaDeSaida.tsx`, `Confirmacao.tsx`      | Próxima ação; os passos 3, 12 e 15 exigem Android de verdade, `npm test` não abre navegador                      |
| O roteiro de dez passos da 024 nunca rodou: a seta, o cartão e o painel sem prova em conta real com rede                              | `LinhaFicha.tsx`, `CartaoNoVermelhoHoje.tsx`   | Próxima ação; o passo 1 (sem mudança) e o passo 3 (lista bate com o editor) são os que provam o `#d135`          |
