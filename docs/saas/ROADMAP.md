# Roadmap do SaaS

Escrito em 2026-09-15. Síntese de `gpt.md`, `claude.md` e `gemini.md` (as três respostas à
mesma pergunta: "o que torna este sistema atrativo, vendável, rentável e escalável?") contra o
que o repositório já entrega. Os três arquivos ficam como matéria-prima; **este é o que vale.**

Três decisões de quem conduz o projeto, tomadas em 2026-09-15, moldam tudo abaixo
(`DECISOES.md#d106`, `#d107`):

- **MyCookie's continua sendo a marca do produto.** Não há spec de rebrand.
- **Beta fechado antes de cadastro e cobrança.** As primeiras contas entram pelo script que
  já existe; cadastro self-serve e cobrança só nascem quando o beta disser o que generalizar.
- **Stripe** é o provedor de cobrança, quando ela chegar.

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
   nunca vai fazer está na seção 3, e vale mais que qualquer feature.

E uma verdade dura que os três dizem de jeitos diferentes: ticket baixo, churn alto, e boa
parte das clientes fecha o negócio em meses porque a confeitaria era um bico. Anual com
desconto e um trial curto são a resposta; free tier, não.

## 2 · O que já existe

A maior parte das sugestões descreve o que o repositório já faz. Antes de qualquer spec:

| Sugestão (fonte)                                                             | Onde mora                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Custo honesto: perda, embalagem, gás, energia, hora dela, maquininha (todas) | `perdaPercentual`, `CustosOperacionais`, `taxaCartaoConsiderada` — specs 002 |
| Simulador de preço, margem × markup (gpt §6)                                 | `calcularPrecoSugerido`, `verificarPreco`, painel de preço da ficha          |
| Pedido → produção → estoque → caixa (gpt §2, §9)                             | specs 003, 004, 013                                                          |
| Lista de compras contra a despensa (todas)                                   | `montarLista`, `/compras`, contagem com prazo (007)                          |
| "Tenho 15 pedidos para amanhã, consigo?" (gpt §11)                           | capacidade por ficha, 13B                                                    |
| Fechamento do mês numa tela (claude §3)                                      | `/financeiro`, agregado mensal (`#d09`)                                      |
| Onboarding em passos, tempo até o primeiro "ahá" (todas)                     | `/comecar`, os cinco passos (008)                                            |
| Nota fiscal virando insumo (claude §2)                                       | foto + Gemini, spec 006 (QR da NFC-e fica como fallback, dívida já anotada)  |
| WhatsApp (gpt §10, gemini §2)                                                | resumo por `wa.me`, spec 010 (`#d77`: link, não integração)                  |
| Multi-tenant desde o dia um (gpt §20, gemini §4)                             | `contas/{contaId}`, claim por conta (`#d14`)                                 |
| Leituras baratas, agregado no documento (gemini §4)                          | `#d09`, `#d10`                                                               |
| Mobile-first, offline, alvo de toque (gemini §1)                             | invariantes do `CLAUDE.md`, `PRODUCT.md`                                     |
| Dashboard que responde perguntas (gpt §12)                                   | tela Hoje ("o que preciso fazer") + `/financeiro` ("como estou")             |
| Auditoria de estoque (gpt §21)                                               | `historicoPrecos`, fornada como fato datado (`#d87`), contagem com data      |

Nenhuma dessas ganha spec. O que ganha é o que está na seção 4.

## 3 · O que fica de fora, e por quê

Escrito para não ser relitigado. Cada item volta à mesa só com cliente pagante pedindo.

| Sugestão                                                      | Por quê não                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Trocar Firebase por Postgres/Supabase (gpt §19)               | Offline-first é invariante e o Firestore é o que o entrega de graça. Trocar banco é reescrever o app.                |
| Preço por pedidos/mês (gpt §13)                               | Exige contar no servidor; o agregado é escrito no aparelho (`#d10`). Preço por plano, `#d107`.                       |
| Lotes, validade, rastreabilidade, recall (gpt §8)             | É ERP. A fornada (013) já é o lote que uma confeitaria artesanal precisa.                                            |
| Contas a pagar/receber, fiscal, CRM, orçamentos (gpt §9, §25) | A armadilha do ERP, nomeada pelo claude.md. Concorrer com Bling e Tiny sendo um dev só é perder.                     |
| Integração com a API do WhatsApp (gpt §10)                    | Custa por conversa, exige empresa verificada, e o link já resolve o caso real (`#d77`).                              |
| IA consultora, benchmarking (gpt §17–18)                      | Sem cinquenta contas não há o que comparar. Quando houver, é uma consulta sobre agregados que já existem.            |
| Etiqueta com tabela nutricional (claude §4)                   | Regulatório (RDC 429/819), outro produto.                                                                            |
| Free tier (gpt §13)                                           | Suporte sem receita num público de ticket baixo. Trial de 14 dias.                                                   |
| Vários planos com gating de funcionalidade (todas)            | Cada plano é código de permissão em cada tela. **Um plano no lançamento**; o segundo nasce com os upsells da fase 3. |
| Checklists e fluxogramas interativos (gemini §1)              | `/comecar` já é isso, sem balão.                                                                                     |
| Semear dado de exemplo automaticamente (gpt §16)              | `#d65`: o guia não semeia. A biblioteca é um botão que **ela** aperta (spec 018).                                    |
| Anúncio pago no Meta (claude §5)                              | Não é código. O canal é professora de confeitaria com comissão recorrente, grupos, conteúdo sobre precificação.      |

## 4 · Fases e specs

Numeração continua de onde `docs/specs/` parou. Tamanho é sempre uma sessão; o que não couber
em uma está grande demais e se divide na hora de escrever a spec.

### Fase 0 · Beta fechado — o que existe, com mais gente usando

**Gatilho:** agora. **Sai da fase quando:** 3 a 5 contas usaram por 4 semanas e as entrevistas
responderam "me mostra como você calcula o preço hoje".

Fora do código, e antes dele: 5 a 8 entrevistas com confeiteiras que não são a Maynara, tela
gravada, uma pergunta central. É o que diz o que generalizar (bolo por fatia, brigadeiro por
cento, venda por peso — `UnidadeRendimento` já tem `porcao`, `g` e `ml`; o que falta só as
entrevistas dizem). E a pergunta de saída do beta: "se sumisse amanhã, do que você sentiria
falta?"

**017 · A segunda conta.** Conserto de cromo mais um script.

- O login para de dizer "Acesso restrito à administradora da MyCookie's"; a tela "Este login
  ainda não abre nenhuma conta" para de mostrar `npm run conceder-acesso` (instrução de dev)
  e diz "avise quem te convidou", mantendo o botão de reconferir.
- `sair()` limpa o cache local (`terminate` + `clearIndexedDbPersistence`) — a dívida
  "em aparelho compartilhado vira vazamento" cai.
- `scripts/metricas.mjs` (Admin SDK, irmão de `conceder-acesso.mjs`): por conta — criada em,
  último login (`lastSignInTime`), insumos, fichas, pedidos nos últimos 30 dias, primeira ficha
  em. Imprime a tabela; a ativação (ficha em 7 dias) sai dela. Sem dependência, sem tela.
- Aprovações: nenhuma.

**018 · Começar com o que toda cozinha tem.** Onboarding.

- Botão "Começar com os insumos comuns" no estado vazio de `/insumos` e no passo 2 de
  `/comecar`: ~25 insumos (farinha, açúcares, manteiga, ovos, chocolate, gotas, fermento,
  baunilha, leite condensado, cacau, saquinho, caixa, etiqueta…) com preço médio e perda
  sugerida, todos editáveis, mais duas fichas-modelo (cookie clássico, cookie recheado) já
  precificadas com a configuração sugerida.
- `src/lib/domain/biblioteca.ts`: os dados e a função que monta os documentos. Puro, testado
  (nenhum nome repetido, toda ficha referencia insumo da própria biblioteca). A escrita reusa
  `corpoDeInsumoNovo` e `derivarFicha` num `writeBatch`, como `importarNota`.
- Respeita `#d65`: um toque dela, não uma semeadura do guia.
- Aprovações: nenhuma.

### Fase 1 · O hábito semanal — o que faz abrir o app sem ser para precificar

**Gatilho:** a fase 0 rodando; estas specs entram na ordem em que o beta pedir.

**019 · Fichas no vermelho.** O alerta de custo.

- `derivarFicha` já recalcula uma ficha com os insumos de hoje. Um cartão na tela Hoje — "3
  fichas ficaram abaixo da margem depois da última compra" — e a linha em `/fichas` dizendo
  "sobra R$ 1,80 → R$ 0,90". Só leitura: `custoDesatualizado` e `historicoPrecos` já existem.
- Aprovações: nenhuma.

**020 · Quem mais compra de mim.** Tela de clientes (dívida da tabela).

- `/clientes` lê `totalPedidos`, `totalGasto`, `ticketMedio` e `ultimoPedidoEm`, que são
  escritos e ninguém lê (`#d35`). Arquivar cliente. Fora do menu de baixo (teto de cinco),
  alcançada pelo cabeçalho de `/pedidos`. Índice já publicado.
- Aprovações: nenhuma.

**021 · Sair sem salvar.** Um hook, quatro editores (ficha, pedido, configuração, contagem).
Dívida da tabela; com mais gente usando, deixa de ser "se acontecer".

**022 · A fornada que quebrou.** Só se as entrevistas pedirem.

- `Fornada.perdidas` (unidades descartadas) → custo real por unidade vendável na ficha: "nas
  últimas fornadas, 6% quebrou; o custo real é R$ X". Campo aditivo opcional.
- Aprovações: um campo em `Fornada`.

### Fase 2 · Cadastro e cobrança — a porta com algo atrás

**Gatilho:** a fase 0 fechou com pelo menos três contas ativas e a frase do preço confirmada
como defensável nas entrevistas. É o "segundo cliente pagante" de `#d16`.

**023 · Criar a conta sozinha.**

- `/cadastro`: `createUserWithEmailAndPassword` no aparelho, depois `POST /api/conta` (token,
  nome do negócio, nome dela). O corpo de `conceder-acesso.mjs` vira handler, no padrão de
  `/api/nota` e `firebaseAdmin.ts`: cria `contas/{id}` com `plano: "TRIAL"`, `status: "ATIVA"`,
  `trialAte` em 14 dias, e emite a claim. `reconferirAcesso()` já traz a claim sem sair.
- Aceite de termos: caixa obrigatória ligando `/termos` e `/privacidade` (páginas estáticas;
  o texto é de quem conduz o projeto, a spec entrega o lugar). `Conta.termosAceitosEm`.
- `Conta` ganha `plano`, `status`, `trialAte`, `termosAceitosEm` — os campos que o comentário
  de `conta.ts` reserva desde o Módulo 0. Sem e-mail de verificação: o trial é o portão.
- O script continua valendo para liberar à mão.
- Aprovações: schema aditivo em `Conta`. Regras não mudam.

**024 · O teste acaba, e a assinatura.** Stripe, um plano.

- Um plano, mensal e anual (anual com dois meses grátis). Sem gating: um plano é zero código
  de permissão por tela.
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

**025 · Meus dados são meus.** LGPD, o mínimo que não é jurídico.

- `GET /api/conta/exportar`: JSON com todas as coleções da conta. Botão em `/configuracao`.
- "Encerrar minha conta" em `/configuracao`: `status: "ENCERRADA"`, claim removida, assinatura
  cancelada no Stripe. A purga física é `scripts/encerrar-conta.mjs`, rodado à mão dentro do
  prazo — exceção nomeada ao "nunca apagar documento", que é regra para dado de negócio vivo.
- Aprovações: nenhuma além das rotas.

### Fase 3 · Crescimento — só com cliente pagante pedindo

**026 · A ajudante.** Papel `AJUDANTE` na claim, convite por e-mail via handler, regras
conferindo papel em `configuracao` e `financeiro`, seletor de conta no `AuthProvider` — o
ponto único que `#d14` já nomeou. Vocabulário de papel nasce aqui, com o caso.

**027 · Cardápio público com link de pedido.** `contas/{id}/publico/cardapio` escrito por ela
(espelho das fichas ativas com preço), regra de leitura pública só nesse documento, página
`/c/{contaId}`, pedido nascendo como `ORCAMENTO` por handler. Aprovação: a primeira regra
pública do sistema.

**028 · O segundo plano.** Só quando 026 e 027 existirem: são os upsells naturais. É aqui, e
não antes, que gating de funcionalidade entra no código.

## 5 · Métricas

Poucas, todas saindo de `scripts/metricas.mjs` (017) ou do painel do Stripe (024) — nada a
construir além do script:

- **Ativação:** contas com a primeira ficha em até 7 dias da criação.
- **Retenção D30:** login nos últimos 30 dias, para contas com mais de 30 dias.
- **Fichas por conta:** o melhor preditor de retenção — é onde mora o custo de sair.
- **Churn mensal e MRR:** Stripe.

## 6 · Preço

Faixa realista no Brasil para o plano de entrada: R$ 29–49/mês. Com um plano só, o número
fica no Stripe e a spec 024 não o conhece. O argumento de venda não é "sistema barato": é
"descubra quanto você realmente ganha em cada doce" — uma cliente que descobre R$ 600/mês de
prejuízo por preço errado não está pagando R$ 49 por um app, está pagando por esse número.
