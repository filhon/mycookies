# Roadmap do SaaS

Escrito em 2026-09-15 e **revisto no mesmo dia** contra o único teste de uso que o produto teve.
Síntese de `gpt.md`, `claude.md` e `gemini.md` (as três respostas à mesma pergunta: "o que torna
este sistema atrativo, vendável, rentável e escalável?") contra o que o repositório já entrega.
Os três arquivos ficam como matéria-prima; **este é o que vale.**

Quatro decisões de quem conduz o projeto moldam tudo abaixo (`DECISOES.md#d111`, `#d112`,
`#d113`):

- ~~**MyCookie's continua sendo a marca do produto.** Não há spec de rebrand.~~ Revertido em
  2026-09-18: spec 033, `#d122`. O produto chama-se Rende; a MyCookie's é a primeira conta.
- **Beta fechado antes de cadastro e cobrança.** As primeiras contas entram pelo script que
  já existe; cadastro self-serve e cobrança só nascem quando o beta disser o que generalizar.
- **Stripe** é o provedor de cobrança, quando ela chegar.
- **Nenhuma conta de beta entra antes de a usuária 0 chegar ao preço sozinha.** A Maynara não
  conseguiu operar o sistema sem explicação (seção 2). Um beta sobre isso mede abandono, não
  produto.

O protocolo continua o mesmo: uma feature pensada aqui → uma spec em `docs/specs/` → uma
sessão de implementação. **A spec de uma fase só é escrita quando a fase anterior fechou**,
porque cada uma muda `ESTADO.md` e o que a próxima precisa saber.

---

## 1 · O que as três respostas acertaram

Uma frase, e as três concordam: **o produto não é gestão, é "este doce te custa R$ 3,41 e você
deveria cobrar R$ 8,50".** Tudo o mais — insumos, despensa, pedidos, caixa — é o que sustenta
essa frase. O sistema já entrega a frase; o SaaS vende ela.

O que sobra depois de descontar o que já existe são quatro coisas:

1. **O gargalo é o cadastro inicial.** Tela vazia pedindo quarenta insumos é o primeiro motivo
   de abandono. Biblioteca de partida, opt-in.
2. **Precificar é evento raro; o hábito semanal é o que segura a assinatura.** Lista de compras
   e agenda já existem. O que falta é o alerta: "o chocolate subiu, três fichas ficaram no
   vermelho".
3. **O cálculo precisa ser mais honesto que a planilha dela.** Já é (perda, embalagem, gás,
   energia, a hora dela, maquininha). A quebra da fornada é a única parcela que falta.
4. **O risco é de escopo, não técnico.** O produto convida a virar ERP. A lista do que ele
   nunca vai fazer está na seção 4, e vale mais que qualquer feature.

E uma verdade dura que os três dizem de jeitos diferentes: ticket baixo, churn alto, e boa
parte das clientes fecha o negócio em meses porque a confeitaria era um bico. Anual com
desconto e um trial curto são a resposta; free tier, não.

## 2 · O que a usuária 0 provou

A primeira versão deste roadmap dava o onboarding como entregue (spec 008). O único teste que
ele teve — a Maynara, o público-alvo em pessoa, abrindo o app sem instrução — reprovou: ela
precisou que alguém explicasse para que cada tela serve, o que existe, e qual o caminho até o
preço sugerido. Isso não é falta de feature. É a soma de cinco coisas que o repositório mostra:

1. **O primeiro passo do caminho é a tela mais difícil do sistema.** "Conferir a configuração"
   abre cinco blocos e nove campos — valor da hora, horas por mês, energia por hora, gás por
   hora, despesas fixas, margem, markup, outras taxas, arredondamento — antes de ela ter visto
   um preço. É a linguagem do contador na porta de entrada. E não precisa ser primeiro: a ficha
   já calcula com `CONFIGURACAO_SUGERIDA` quando nada foi salvo
   (`FormularioFicha.tsx:159`). A ordem do caminho é a da dependência técnica, não a do valor.
2. **Três formulários antes do primeiro "ahá".** Insumo: nove campos (nome, categoria, preço,
   quantidade, unidade, perda, marca, onde compra, estoque) — vezes oito insumos para um
   cookie. Ficha: nome, categoria, rende, unidade, tempo, **fornadas de reserva**, tipo, os
   itens, sete parcelas de custo e quatro campos de preço. Tudo opcional que aparece é decisão
   que ela precisa tomar.
3. **O vocabulário é do software.** "Insumo", "ficha técnica", "fornada de reserva", "contagem
   do pote", "competência". O `PRODUCT.md` manda falar a língua da confeitaria; a navegação
   inferior diz "Insumos" e "Fichas".
4. **Quatro telas fora do menu**, e `/comecar` tem uma seção "O que mais tem aqui" cuja
   existência é a confissão: lista de compras, foto da nota, contagem da despensa e o que está
   pronto só se acham por acaso ou pelo guia. **Corrigido pela spec 021**: a premissa deixou de
   ser verdade entre a 8B e a 13D — cada uma das quatro já tem porta na tela do menu de que é
   consequência; o que faltava era uma porta, a nota ao fechar a lista de compras, e a 021 a deu.
5. **Toda spec desde a 009 foi aditiva.** Fornada, duas contagens, reserva, combo à escolha,
   entregas a pagar, recalcular o mês — cada uma respondeu a um pedido real, e cada uma deixou
   um campo, uma faixa ou uma tela na frente de quem está começando. Nenhuma tirou nada. É
   assim que um produto vira ERP sem ninguém decidir.

O `#d65` continua certo: tour não resolve isso. O que resolve é o preço aparecer no primeiro
minuto e os formulários pedirem só o que o primeiro preço precisa.

## 3 · O que já existe

A maior parte das sugestões descreve o que o repositório já faz. Antes de qualquer spec:

| Sugestão (fonte)                                                             | Onde mora                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Custo honesto: perda, embalagem, gás, energia, hora dela, maquininha (todas) | `perdaPercentual`, `CustosOperacionais`, `taxaCartaoConsiderada` — specs 002 |
| Simulador de preço, margem × markup (gpt §6)                                 | `calcularPrecoSugerido`, `verificarPreco`, painel de preço da ficha          |
| Pedido → produção → estoque → caixa (gpt §2, §9)                             | specs 003, 004, 013                                                          |
| Lista de compras contra a despensa (todas)                                   | `montarLista`, `/compras`, contagem com prazo (007)                          |
| "Tenho 15 pedidos para amanhã, consigo?" (gpt §11)                           | capacidade por ficha, 13B                                                    |
| Fechamento do mês numa tela (claude §3)                                      | `/financeiro`, agregado mensal (`#d09`)                                      |
| Onboarding em passos, tempo até o primeiro "ahá" (todas)                     | `/comecar` (008) **existe e reprovou no único teste** — é a fase 0, seção 2  |
| Nota fiscal virando insumo (claude §2)                                       | foto + Gemini, spec 006 (QR da NFC-e fica como fallback, dívida já anotada)  |
| WhatsApp (gpt §10, gemini §2)                                                | resumo por `wa.me`, spec 010 (`#d77`: link, não integração)                  |
| Multi-tenant desde o dia um (gpt §20, gemini §4)                             | `contas/{contaId}`, claim por conta (`#d14`)                                 |
| Leituras baratas, agregado no documento (gemini §4)                          | `#d09`, `#d10`                                                               |
| Mobile-first, offline, alvo de toque (gemini §1)                             | invariantes do `CLAUDE.md`, `PRODUCT.md`                                     |
| Dashboard que responde perguntas (gpt §12)                                   | tela Hoje ("o que preciso fazer") + `/financeiro` ("como estou")             |
| Auditoria de estoque (gpt §21)                                               | `historicoPrecos`, fornada como fato datado (`#d87`), contagem com data      |

## 4 · O que fica de fora, e por quê

Escrito para não ser relitigado. Cada item volta à mesa só com cliente pagante pedindo.

| Sugestão                                                      | Por quê não                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Trocar Firebase por Postgres/Supabase (gpt §19)               | Offline-first é invariante e o Firestore é o que o entrega de graça. Trocar banco é reescrever o app.                |
| Preço por pedidos/mês (gpt §13)                               | Exige contar no servidor; o agregado é escrito no aparelho (`#d10`). Preço por plano, `#d112`.                       |
| Lotes, validade, rastreabilidade, recall (gpt §8)             | É ERP. A fornada (013) já é o lote que uma confeitaria artesanal precisa.                                            |
| Contas a pagar/receber, fiscal, CRM, orçamentos (gpt §9, §25) | A armadilha do ERP, nomeada pelo claude.md. Concorrer com Bling e Tiny sendo um dev só é perder.                     |
| Integração com a API do WhatsApp (gpt §10)                    | Custa por conversa, exige empresa verificada, e o link já resolve o caso real (`#d77`).                              |
| IA consultora, benchmarking (gpt §17–18)                      | Sem cinquenta contas não há o que comparar. Quando houver, é uma consulta sobre agregados que já existem.            |
| Etiqueta com tabela nutricional (claude §4)                   | Regulatório (RDC 429/819), outro produto.                                                                            |
| Free tier (gpt §13)                                           | Suporte sem receita num público de ticket baixo. Trial de 14 dias.                                                   |
| Vários planos com gating de funcionalidade (todas)            | Cada plano é código de permissão em cada tela. **Um plano no lançamento**; o segundo nasce com os upsells da fase 3. |
| Tour, balões, vídeo de boas-vindas (gemini §1)                | `#d65`. O que reprovou não foi a falta de explicação: foi o que a tela pede antes de dar algo em troca.              |
| Semear dado de exemplo automaticamente (gpt §16)              | `#d65`: o guia não semeia. A biblioteca é um botão que **ela** aperta (spec 018).                                    |
| Anúncio pago no Meta (claude §5)                              | Não é código. O canal é professora de confeitaria com comissão recorrente, grupos, conteúdo sobre precificação.      |

E uma regra nova, que vale para toda spec daqui em diante (`#d113`): **spec que adiciona
campo, faixa ou tela diz o que tira da frente de quem está começando.** "Nada" é resposta
válida, mas tem que ser escrita.

## 5 · Fases e specs

Numeração continua de onde `docs/specs/` parou. Tamanho é sempre uma sessão; o que não couber
em uma está grande demais e se divide na hora de escrever a spec.

### Fase 0 · A usuária 0 sozinha — o preço em dez minutos

**Gatilho:** agora. **Sai da fase quando:** a Maynara, e depois uma confeiteira que nunca viu o
app, abrem uma conta nova e chegam a um preço de venda **sem ninguém explicar nada**, em menos
de dez minutos. Tela gravada. A medida é o número de perguntas que ela faz em voz alta; o alvo
é zero. Enquanto isso não acontecer, nenhuma conta de beta entra.

O teste é o mais barato que existe e é o único que importa nesta fase: conta nova, celular
dela, ninguém ao lado. Roda depois de cada spec abaixo, não só no fim.

**018 · O preço no primeiro minuto.** Biblioteca de partida mais o que ela desbloqueia.

- Botão "Começar com o que toda cozinha tem" no estado vazio de `/fichas`, no de `/insumos` e
  no primeiro passo do caminho: ~25 insumos (farinha, açúcares, manteiga, ovos, chocolate,
  gotas, fermento, baunilha, leite condensado, cacau, saquinho, caixa, etiqueta…) com preço
  médio e perda sugerida, todos editáveis, mais duas fichas-modelo (cookie clássico, cookie
  recheado) já precificadas com a configuração sugerida.
- `src/lib/domain/biblioteca.ts`: os dados e a função que monta os documentos. Puro, testado
  (nenhum nome repetido, toda ficha referencia insumo da própria biblioteca). A escrita reusa
  `corpoDeInsumoNovo` e `derivarFicha` num `writeBatch`, como `importarNota`.
- Depois do toque, ela cai na ficha-modelo aberta, com o preço no rodapé e a frase: "calculado
  com preços médios — o seu chocolate custa isso mesmo?". O primeiro "ahá" é aqui, no minuto um.
- Respeita `#d65`: um toque dela, não uma semeadura do guia.
- Aprovações: nenhuma.

**019 · O caminho começa pelo preço. Entregue em 2026-09-16.** Reordenar `domain/onboarding.ts`; sem tela nova.

- Os cinco passos viram: (1) **ver quanto custa um cookie** — abre a ficha-modelo, ou o botão
  da 018 se ela ainda não apertou; (2) **corrigir o preço do que você compra** — `/insumos`
  com a biblioteca já lá, editar e não criar; (3) **ajustar o que é seu** — a configuração,
  apresentada pela consequência: "sua primeira ficha usou R$ 25 a hora e o gás sugerido; ajuste
  e veja o preço mudar"; (4) encomenda; (5) paga. A dependência técnica continua a mesma; só a
  ordem em que ela é apresentada muda, porque a ficha já calcula sem configuração salva.
- Os cinco textos de `CATALOGO_DO_COMECO` reescritos com as palavras que a Maynara usou na
  gravação, e não as do código — a dívida "os textos saíram do código, e não do que a 5B viu"
  fecha aqui.
- Nenhum fato novo em `FatosDoComeco`: `temFicha` já fecha o passo 1.
- Aprovações: nenhuma.

**020 · Menos na frente. Entregue em 2026-09-16.** Os dois formulários do primeiro preço pedem só o que ele precisa.

- Insumo: nome, preço pago, quantidade e unidade na frente. Categoria, perda, marca, onde
  compra e estoque atual atrás de "Mais detalhes" (`<details>` nativo, aberto quando editando
  um insumo que já tem algum deles preenchido).
- Ficha: nome, rende, unidade, tempo e os itens na frente. Categoria, **fornadas de reserva** e
  o tipo kit atrás de "Mais detalhes" — mesma regra de abertura. O painel de preço não muda.
- Nada sai do schema, nada sai da tela: só a ordem e a dobra. Configuração fica como está —
  a 019 já a tirou da porta de entrada.
- Aprovações: nenhuma.

**021 · As palavras dela. Entregue em 2026-09-16.** Vocabulário, com ela e não por ela.

- Antes da spec: cinco perguntas à Maynara e à segunda confeiteira da gravação — como você
  chama o que compra, a receita com custo, o que já assou, a encomenda, o dinheiro do mês. Se
  a resposta for "insumo" e "ficha técnica", nada muda e a spec não existe.
- Se mudar: `navegacao.ts`, os títulos de `CabecalhoPagina`, os estados vazios e
  `CATALOGO_DO_COMECO`. Nenhum identificador de código, nenhum caminho do Firestore.
- As quatro telas fora do menu: a spec diz, para cada uma, **em que tela e em que momento** o
  atalho já aparece (compras: cartão da tela Hoje e cabeçalho de `/pedidos`) e onde falta. "O
  que mais tem aqui" continua em `/comecar`, mas deixa de ser a única porta.
- Aprovações: nenhuma.

**022 · A segunda conta. Entregue em 2026-09-16.** Conserto de cromo mais um script — a que abre
a porta para a segunda confeiteira.

- O login para de dizer "Acesso restrito à administradora da MyCookie's"; a tela "Este login
  ainda não abre nenhuma conta" para de mostrar `npm run conceder-acesso` (instrução de dev)
  e diz "avise quem te convidou", mantendo o botão de reconferir.
- `sair()` limpa o cache local (`terminate` + `clearIndexedDbPersistence`) — a dívida
  "em aparelho compartilhado vira vazamento" cai. Sem rede e com escrita pendente, recusa em
  vez de confirmar (`DECISOES.md#d118`). "Sair" ganhou lugar em `/configuracao`, a primeira vez
  que dá para sair do app no celular.
- `conceder-acesso.mjs` passou a criar o login, sem senha: o convite é "toque em 'Esqueci minha
  senha'" (`DECISOES.md#d119`), e o console do Firebase saiu do caminho normal.
- `scripts/metricas.mjs` (Admin SDK, irmão de `conceder-acesso.mjs`): por conta — criada em,
  último login (`lastSignInTime`), insumos, fichas, pedidos nos últimos 30 dias, primeira ficha
  em, e **primeira ficha que não é da biblioteca em**. Imprime a tabela; o tempo até o primeiro
  preço próprio sai dela. Sem dependência, sem tela.
- Aprovações: nenhuma.

### Fase 1 · Beta fechado e o hábito semanal

**Gatilho:** a fase 0 passou no teste. **Sai da fase quando:** 3 a 5 contas usaram por 4
semanas e as entrevistas responderam "me mostra como você calcula o preço hoje".

Fora do código, e antes dele: 5 a 8 entrevistas com confeiteiras que não são a Maynara, tela
gravada, uma pergunta central. É o que diz o que generalizar (bolo por fatia, brigadeiro por
cento, venda por peso — `UnidadeRendimento` já tem `porcao`, `g` e `ml`; o que falta só as
entrevistas dizem). E a pergunta de saída do beta: "se sumisse amanhã, do que você sentiria
falta?"

As specs entram na ordem em que o beta pedir, com uma exceção: a 023 vem primeiro, porque
perder trabalho em silêncio é o que mais mina a confiança de quem está operando sozinha.

**023 · Sair sem salvar.** Entregue em 2026-09-19 (`specs/023-sair-sem-salvar.md`,
`DECISOES.md#d132` a `#d134`). Um hook (`useGuardaDeSaida`) e um primitivo novo (`Confirmacao`,
a primeira modal do sistema) cobrindo **cinco** telas, e não quatro: a previsão original não
contava a contagem do que está pronto, irmã da contagem da despensa. De carona, "Contar o
pote" em `PainelFornada` virou `Link` (a única saída programática dentro de um editor), e o
foco vai ao primeiro campo com erro quando o Salvar recusa. O roteiro de dezesseis passos, com
Android de verdade, ainda não rodou.

**024 · Fichas no vermelho.** Entregue em 2026-09-19 (`specs/024-fichas-no-vermelho.md`,
`DECISOES.md#d135` e `#d136`), fora da ordem: rodou antes das entrevistas, porque a spec não
dependia de código nenhum e o roadmap não exigia a sequência. O alerta de custo, do jeito que o
roadmap previu e um pouco mais:

- `custoDeHoje`/`custosDeHoje` (`domain/custoFicha.ts`), e não `derivarFicha`: o delta linha a
  linha sobre o gravado, com as mesmas funções que gravaram, é quarenta linhas contra a
  configuração inteira que reconstruir a `EntradaFicha` exigiria (`#d135`).
- A seta "sobram R$ 1,80 → R$ 0,90" entrou na linha de `/fichas`, em toda diferença — não só na
  previsão original. O cartão da tela Hoje entrou como o roadmap descreveu, mas conta
  **cruzamento** (o produto que passou a perder ou a ficar abaixo da margem desde o último
  Salvar), e não a diferença que o exemplo do roadmap sugeria: cartão permanente é paisagem
  (`#d136`). O painel do produto, que o roadmap não citava, ganhou o número no lugar do convite
  às cegas para abrir e salvar.
- Só leitura, como previsto: nenhum campo, nenhuma mutação, nenhuma rota, nenhuma regra, nenhum
  índice, nenhuma dependência.
- **O roteiro de dez passos, com conta real e rede, ainda não rodou.**

**025 · Quem mais compra de mim.** Entregue em 2026-09-19 (`specs/025-quem-mais-compra-de-
mim.md`, `DECISOES.md#d137` e `#d138`), o que o roadmap não dizia:

- `/clientes` lê `totalPedidos`, `totalGasto`, `ticketMedio` e `ultimoPedidoEm` — escritos desde
  a 3B, sem leitor até aqui (`#d35`) — e **não cadastra**: sem "Nova cliente" em lugar nenhum,
  porque uma cliente sem pedido é CRM, e o produto não é (`#d137`). Ordenada por `totalGasto`
  decrescente, sem pílula de ordenação: a busca por nome já cobre "cadê a Ana?".
- Arquivar cliente decrementa `agregados/global.totalClientes` e não desfaz vínculo nenhum: o
  `clienteId` continua nos pedidos antigos, e não há restaurar na tela (`#d138`).
- Fora do menu de baixo (teto de cinco): alcançada pelo cabeçalho de `/pedidos` — o atalho só
  aparece com pedido gravado, pela regra do `#d113` — e por `/comecar`, quinta entrada de "O
  que mais tem aqui".
- Índice já publicado, nenhum novo. Nenhum campo, nenhuma rota além de `/clientes`, nenhuma
  regra, nenhuma dependência.
- **O roteiro de dez passos, com conta real, ainda não rodou.**

**026 · A fornada que quebrou.** Entregue em 2026-09-19 (`specs/026-a-fornada-que-quebrou.md`,
`DECISOES.md#d139` e `#d140`), fora da ordem das entrevistas — como a 024 e a 025, não dependia
delas. A última parcela do custo honesto que o `docs/saas/CLAUDE.md` §1 lista, o que o roadmap
não dizia:

- **O campo não entra no formulário de registrar a fornada.** A fornada grava o dia da massa
  (`#d93`); a quebra é do forno, e só se sabe dias depois. `Fornada.perdidas?: number` entra em
  `FornadasRecentes` — o botão "Quebrou" na linha de "Massas registradas", nas duas telas onde
  a quebra se descobre (o produto e o pedido).
- **Ausência não é zero.** Fornada sem `perdidas` não é fornada sem quebra: é fornada sobre a
  qual ela não disse nada. A taxa (`quebraDaFicha`) sai só das fornadas anotadas, e `0` é
  anotação legítima.
- **A quebra também mexe no pote e na lista de compras.** `vendaveis` substitui
  `unidadesProduzidas` no pote (`projecaoDoPronto`), no dono do pote (`reservadoNoPronto`) e na
  linha do pedido; `aproveitamento` encolhe o abate de `produzidoParaPedidos`, e o que quebrou
  volta a pesar em `prometidoParaPedidos`. A despensa não muda: `consumoDesdeAContagem` continua
  igual, porque a farinha foi gasta, quebrando ou não.
- **O custo real é leitura, e não preço gravado.** `custoPorVendavel` (a mesma conta da perda do
  material, um nível acima) e a frase no editor do produto (`FraseDaQuebra`) calculam na tela;
  `precoSugerido` não anda sozinho a cada fornada anotada.
- Um campo aditivo em `Fornada`, nenhuma rota, nenhum índice, nenhuma regra, nenhuma dependência.
- **O roteiro de dez passos não rodou nesta sessão.**

### Fase 2 · Cadastro e cobrança — a porta com algo atrás

**Gatilho:** a fase 1 fechou com pelo menos três contas ativas e a frase do preço confirmada
como defensável nas entrevistas. É o "segundo cliente pagante" de `#d16`.

**027 · Criar a conta sozinha.**

- `/cadastro`: `createUserWithEmailAndPassword` no aparelho, depois `POST /api/conta` (token,
  nome do negócio, nome dela). O corpo de `conceder-acesso.mjs` vira handler, no padrão de
  `/api/nota` e `firebaseAdmin.ts`: cria `contas/{id}` com `plano: "TRIAL"`, `status: "ATIVA"`,
  `trialAte` em 14 dias, e emite a claim. `reconferirAcesso()` já traz a claim sem sair.
- A conta nova cai direto no passo 1 da 019: ver o preço de um cookie. Cadastro e primeiro
  preço são a mesma sessão de uso.
- Aceite de termos: caixa obrigatória ligando `/termos` e `/privacidade` (páginas estáticas;
  o texto é de quem conduz o projeto, a spec entrega o lugar). `Conta.termosAceitosEm`.
- `Conta` ganha `plano`, `status`, `trialAte`, `termosAceitosEm` — os campos que o comentário
  de `conta.ts` reserva desde o Módulo 0. Sem e-mail de verificação: o trial é o portão.
- O script continua valendo para liberar à mão.
- Aprovações: schema aditivo em `Conta`. Regras não mudam.

**Entregue em 2026-09-19, antes do gatilho** (`docs/specs/027-criar-a-conta-sozinha.md`,
`#d141` a `#d143`), com três diferenças do que está acima:

- O script **não vira** handler: o corpo é copiado para `POST /api/conta`, porque o script roda
  com `node` fora do app e não resolve `@/`. E a rota **garante** em vez de criar: o login nasce
  no aparelho antes do `POST`, o `POST` pode cair, e toda volta bate na mesma rota.
- Os quatro campos de `Conta` são **opcionais**, e ausência é "liberada à mão, sem prazo":
  `contas/mycookies` e as do beta não são migradas, e o script não escreve `plano`.
- A conta nova cai em `/fichas` (o botão da biblioteca), e não na tela Hoje.
- **Não publicada**: `/termos` e `/privacidade` estão com `[texto de quem conduz o projeto]`, e
  esse é o portão do deploy, junto da fase 0.

**028 · O teste acaba, e a assinatura.** Stripe, um plano.

- Um plano, mensal e anual (anual com dois meses grátis). Sem gating: um plano é zero código
  de permissão por tela.
- Desligar o "feito com Rende" na folha do orçamento é da assinatura (`#d127`): hoje é uma
  linha fixa; o toggle em `/configuracao` nasce aqui, e é o que uma assinatura paga compra.
- `POST /api/assinatura/checkout` (Checkout Session com `client_reference_id = contaId`),
  `POST /api/assinatura/portal` (Customer Portal), `POST /api/stripe/webhook` (assinatura
  verificada) gravando `plano`, `status`, `stripeCustomerId`, `stripeSubscriptionId` e
  reemitindo a claim com `ativas: { [contaId]: true | false }`.
- Regras: **escrever** em `contas/{contaId}/**` passa a exigir `token.ativas[contaId] == true`;
  **ler** continua pela presença no mapa `contas`. Conta vencida lê tudo e não escreve nada —
  o dado dela continua dela. Zero leitura na regra, como `#d07`.
- Trial vencido sem assinatura: cron diário do Vercel (`vercel.json`, `CRON_SECRET`) em
  `/api/assinatura/vencidas` derruba `ativas`. Sem dependência.
- Tela: faixa "Seu teste acaba em N dias" na tela Hoje; vencido, uma tela cheia com o botão de
  assinar. Preço mora nos `Price` do Stripe, em variável de ambiente, não no código.
- Aprovações: dependência `stripe` (ou `fetch` cru com HMAC via `crypto` — a spec decide);
  **mudança de regra de segurança**; campos em `Conta`; cron no Vercel.

**029 · Meus dados são meus.** LGPD, o mínimo que não é jurídico.

- `GET /api/conta/exportar`: JSON com todas as coleções da conta. Botão em `/configuracao`.
- "Encerrar minha conta" em `/configuracao`: `status: "ENCERRADA"`, claim removida, assinatura
  cancelada no Stripe. A purga física é `scripts/encerrar-conta.mjs`, rodado à mão dentro do
  prazo — exceção nomeada ao "nunca apagar documento", que é regra para dado de negócio vivo.
- Aprovações: nenhuma além das rotas.

### Fase 3 · Crescimento — só com cliente pagante pedindo

**030 · A ajudante.** Papel `AJUDANTE` na claim, convite por e-mail via handler, regras
conferindo papel em `configuracao` e `financeiro`, seletor de conta no `AuthProvider` — o
ponto único que `#d14` já nomeou. Vocabulário de papel nasce aqui, com o caso.

**031 · Cardápio público com link de pedido.** `contas/{id}/publico/cardapio` escrito por ela
(espelho das fichas ativas com preço), regra de leitura pública só nesse documento, página
`/c/{contaId}`, pedido nascendo como `ORCAMENTO` por handler. Aprovação: a primeira regra
pública do sistema.

**032 · O segundo plano.** Só quando 030 e 031 existirem: são os upsells naturais. É aqui, e
não antes, que gating de funcionalidade entra no código.

## 6 · Métricas

Poucas, todas saindo de `scripts/metricas.mjs` (022), da gravação da fase 0 ou do painel do
Stripe (028) — nada a construir além do script:

- **Perguntas em voz alta** na gravação de primeiro uso, sem ajuda. Alvo: zero. É a única
  métrica da fase 0, e a única que uma pessoa só consegue medir.
- **Tempo até o primeiro preço próprio:** da criação da conta à primeira ficha que não veio da
  biblioteca. Alvo: o mesmo dia — "sete dias" era a régua de quem ainda não tinha visto a
  usuária 0 travar.
- **Retenção D30:** login nos últimos 30 dias, para contas com mais de 30 dias.
- **Fichas por conta:** o melhor preditor de retenção — é onde mora o custo de sair.
- **Churn mensal e MRR:** Stripe.

## 7 · Preço

Faixa realista no Brasil para o plano de entrada: R$ 29–49/mês. Com um plano só, o número
fica no Stripe e a spec 028 não o conhece. O argumento de venda não é "sistema barato": é
"descubra quanto você realmente ganha em cada doce" — uma cliente que descobre R$ 600/mês de
prejuízo por preço errado não está pagando R$ 49 por um app, está pagando por esse número.
