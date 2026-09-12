# Spec 016 · As listas que crescem

**Tipo:** varredura mais um conserto. Toda consulta do sistema ganha um recorte declarado, e a
única que não tinha — a agenda de `/pedidos` — ganha o dela: a agenda inteira, o histórico em
páginas. Nenhum campo novo, nenhuma rota, nenhuma regra de segurança, nenhuma dependência.
**Tamanho:** uma sessão. O diff é três consultas em `mutations/pedidos.ts`, uma tela, um índice.
**Origem:** pedido de quem conduz o projeto em 2026-09-12: "em todo o sistema, em todas as
listas, não há paginação". A dívida já estava na tabela de `ESTADO.md` ("`/pedidos` carrega
todo pedido não arquivado, sem recorte de data") e a 012 a nomeou de novo ("quando a agenda
crescer a ponto de doer, o que nasce é a paginação da agenda — e ela é spec própria").
**Depende de:** nada.
**Aprovações pedidas:** **um índice composto** em `pedidos` (`arquivado` + `status` +
`dataEntregaISO`). Nada de schema.

---

## Problema

Toda lista do sistema é um `onSnapshot` sobre uma consulta, e o cache do Firestore guarda o
resultado inteiro no aparelho. Isso é o que faz o app abrir sem rede, e não muda. O que
muda é a pergunta que cada consulta precisa responder: **o que limita o tamanho dela?**

A varredura respondeu para todas. A tabela é o resultado da spec tanto quanto o código:

| Quem lê                                                            | Coleção                 | Recorte de hoje                   | Cresce com                    | Veredito                               |
| ------------------------------------------------------------------ | ----------------------- | --------------------------------- | ----------------------------- | -------------------------------------- |
| `/pedidos` (`ListaPedidos`)                                        | `pedidos`               | **nenhum** — `arquivado == false` | o tempo, um por venda         | **pagina — é esta spec**               |
| Tela Hoje (`AgendaHoje`)                                           | `pedidos`               | `>= hoje`, `limit(12)`            | —                             | já limitada                            |
| `useDespensaParaProduzir` (`/compras`, `/fichas`, editor)          | `pedidos`               | `hoje` … `hoje + 30 dias`         | —                             | já limitada                            |
| `/financeiro` (`TelaFinanceiro`)                                   | `transacoes`            | `competencia == mês`              | o tempo, mas o mês é a página | fica                                   |
| "Recalcular o mês" (`recalcularMes`)                               | `transacoes`, `pedidos` | do mês, `getDocs`                 | —                             | fica: já exige rede                    |
| `consultaFornadas` (insumos, fichas, contagens, compras)           | `fornadas`              | últimos 30 dias                   | —                             | já limitada (`IDADE_VENCE_DIAS`)       |
| `consultaListaAtual` (`/compras`, tela Hoje)                       | `listasCompra`          | `limit(1)`                        | —                             | já limitada                            |
| `useComeco` (tela Hoje, `/comecar`)                                | quatro coleções         | `limit(1)` em cada                | —                             | já limitada                            |
| `/insumos`, `/insumos/contagem`, `/compras`, editor de ficha, nota | `insumos`               | `arquivado == false`              | **o catálogo**, não o tempo   | **não pagina** — ver abaixo            |
| `/fichas`, `/fichas/contagem`, editor de pedido, meta, compras     | `fichas`                | `arquivado == false`              | o catálogo                    | não pagina                             |
| Editor de pedido (`BuscaItem` de cliente)                          | `clientes`              | `arquivado == false`              | o tempo, devagar              | fica, com o teto e o conserto nomeados |
| Agregados, metas, configuração, conta                              | documentos              | lidos pelo id                     | —                             | não são listas                         |

Duas conclusões saem da tabela.

### Só `/pedidos` cresce sem freio

Uma confeitaria vende. Um ano de operação são algumas centenas de pedidos; três anos, mais de
mil. Hoje `/pedidos` assina **todos os não arquivados**, e a agenda de 2026 vai carregar o
Natal de 2027 junto com o de 2026. Não quebra amanhã — mil pedidos são um ou dois megabytes
no cache, e o teto padrão do `persistentLocalCache` é 40 MB —, mas é a única consulta do
sistema cujo tamanho é "tudo o que já aconteceu", e cada abertura da tela num aparelho novo
baixa isso inteiro.

O que segura a tela hoje é o mesmo que a torna difícil de recortar: a consulta única alimenta
quatro coisas de uma vez — a agenda por dia, o histórico ("Já saíram da agenda"), a faixa "A
receber" (`#d36`) e a faixa "Entregas a pagar" (`#d84`). As duas faixas são somas sobre a
lista inteira, e o `#d36` existe justamente para o painel não mentir por omissão. Paginar a
consulta como está faria as duas faixas somarem só a primeira página.

### Insumos e fichas não crescem com o tempo — crescem com o negócio

`insumos` e `fichas` são catálogo. O que os limita não é uma janela, é `arquivado`: a farinha
que ela parou de usar sai da lista e fica no histórico das fichas antigas (`#d05`). Uma
confeitaria artesanal vive com dezenas de insumos e dezenas de fichas; com quinhentos vivos ela
seria outro negócio. E toda tela que os lê precisa do **conjunto inteiro**: a contagem é da
despensa toda, `montarLista` explode todo pedido sobre todo insumo, o editor de ficha busca por
toque em memória. Página de insumo é um conceito que não existe na cozinha. **A paginação
deles é o arquivo, e ela já existe.**

`clientes` é o caso do meio: cresce com o tempo, mas cada documento é pequeno (nome, telefone,
três contadores), a busca do editor é por trecho do nome em memória, e mil clientes são
algumas centenas de KB baixadas uma vez e depois só deltas. Fica, e o "quando" está em
"Fora de escopo".

---

## O que esta spec decide

Uma decisão, que vira `#d105` em `docs/DECISOES.md`.

### Toda consulta tem um recorte; lista que cresce com o tempo tem janela, lista que cresce com o negócio tem arquivo — `#d105`

Nenhuma consulta do sistema assina "tudo". Cada uma se limita por **um** destes, e o comentário
dela diz qual:

- **pelo id** — agregados, metas, configuração, conta;
- **por `limit`** — a tela Hoje, a lista de compras atual, os cinco passos do começo;
- **por janela de tempo** — as fornadas (30 dias), os pedidos do horizonte de compras (30 dias);
- **por competência** — o caixa, um mês por tela;
- **pelo arquivo** — os catálogos, `insumos`, `fichas` e `clientes`, cujo tamanho é o do
  negócio e não o do calendário.

`/pedidos` era a única fora da lista, e passa a se limitar por **status mais `limit`**: a
agenda (o que ainda não saiu do forno) é assinada inteira, porque é finita por natureza — ela
fecha os pedidos —, e o histórico (o que já saiu) é assinado em páginas, das mais recentes
para trás. O que carrega dinheiro em aberto tem consulta própria e **completa**, para as
faixas continuarem exatas.

O mecanismo de página é `limit(n)` com `n` crescendo — não cursor, não `startAfter`, não
lista de assinaturas. Uma assinatura só, refeita com um limite maior a cada "Mostrar mais
antigos"; o cache já tem as primeiras `n` e o servidor manda o resto. É o mecanismo mais
burro que existe, e é o que cabe numa tela que ela abre para ver o que assa hoje, não para
auditar 2024.

---

## Escopo

### 1. `src/lib/domain/pedido.ts` — os dois lados da agenda, nomeados

```ts
/** O que ainda está na agenda: tudo o que `ehConcluido` não é. */
export const STATUS_NA_AGENDA: StatusPedido[] = FLUXO_PEDIDO.filter(
  (s) => !ehConcluido(s),
);
/** O que já saiu dela. */
export const STATUS_CONCLUIDOS: StatusPedido[] = ["ENTREGUE", "CANCELADO"];
```

Um teste em `tests/domain/pedido.test.ts`: as duas listas juntas são exatamente os seis status,
sem repetição. É o que impede um status novo de cair fora das **duas** consultas sem ninguém
ver.

### 2. `src/lib/firebase/mutations/pedidos.ts` — três consultas, um lugar

Como `consultaFornadas` e `consultaTransacoesDoMes`: quem conhece a forma da consulta conhece o
índice que ela pede.

```ts
/** A agenda inteira: o que ainda não saiu do forno, de qualquer data. */
consultaAgenda(contaId)
  → arquivado == false, status in STATUS_NA_AGENDA, orderBy dataEntregaISO

/** Entregues que ainda não entraram no caixa: é o que "A receber" soma além da agenda. */
consultaEntreguesEmAberto(contaId)
  → arquivado == false, status == "ENTREGUE", pago == false        (sem orderBy)

/** O histórico, dos mais recentes para trás, em páginas. */
consultaHistorico(contaId, status: StatusPedido[], limite: number)
  → arquivado == false, status in status, orderBy dataEntregaISO desc, limit(limite)
```

`consultaEntreguesEmAberto` não ordena de propósito: só igualdades, e o Firestore junta os
índices de campo único sozinho — nenhum índice composto. A ordem se faz em memória, sobre o
que é sempre pequeno (ela recebe).

### 3. `firestore.indexes.json` — um índice

```json
{
  "collectionGroup": "pedidos",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "arquivado", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "dataEntregaISO", "order": "ASCENDING" }
  ]
}
```

Serve a agenda (`in` sobre `status` usa o índice de igualdade) e o histórico (o Firestore
percorre o índice composto ao contrário para servir o `desc`). Se o console pedir uma segunda
entrada com `DESCENDING`, ele imprime o link e é uma linha a mais — o mesmo protocolo de
sempre. `firebase deploy --only firestore:indexes` faz parte da sessão, e `firebase
firestore:indexes` confirma.

Os dois índices de `pedidos` que existem ficam: a tela Hoje e o horizonte de compras continuam
usando `arquivado + dataEntregaISO`, e "Recalcular o mês" o de `competenciaPagamento`.

### 4. `src/components/pedidos/ListaPedidos.tsx` — a tela

- **Três assinaturas** no lugar de uma: `agenda`, `entreguesEmAberto` e `historico`.
  `carregando`, `erro` e `pendente` são o "ou" das três.
- **`limite`** é estado da tela, começa em `PAGINA_DO_HISTORICO = 30` e volta para 30 quando
  o filtro muda. `consultaHistorico` é memoizada com `[contaId, statusDoHistorico, limite]`.
- **O filtro de status vai para a consulta do histórico**, e não só para a memória: com
  "Entregues" ou "Cancelados" na pílula, `statusDoHistorico` é `[filtro]` e as páginas são
  de trinta entregues, não de trinta concluídos com os entregues pescados de dentro. Com um
  status da agenda na pílula, a consulta do histórico é `null` — `useColecao(null)` já desliga
  a assinatura — e só a agenda aparece, filtrada em memória como hoje.
- **A agenda** continua agrupada por dia, ascendente, com "Passou da data" e o total do dia.
  Nada muda nela além da origem dos dados.
- **"Já saíram da agenda"** continua agrupado por dia, descendente. Abaixo do último grupo, um
  botão secundário de largura cheia, 52px: **"Mostrar mais antigos"**. Tocar soma 30 ao
  `limite`. A lista não pisca: `useColecao` guarda os dados anteriores até o snapshot novo
  chegar, e ele chega do cache no mesmo tique.
- **O fim da lista** é `historico.dados.length < limite` **com o snapshot vindo do servidor**
  (`!doCache`). Aí o botão some. Do cache, ele **fica**: sem rede a lista pode estar mais
  curta que o servidor, e esconder o botão seria dizer "acabou" sem saber. O
  `SeloSincronizacao` já diz que está sem conexão; nenhuma frase nova.
- **A faixa "A receber"** soma `[...agenda, ...entreguesEmAberto]` — os dois conjuntos não se
  cruzam (status diferentes) e os dois são completos. `aReceber` não muda uma linha.
- **A faixa "Entregas a pagar"** soma `entreguesEmAberto ∪ historico`, sem repetir id — um
  `Map` por `id`, três linhas na tela. `entregasAPagar` e `repassesFeitos` não mudam.
- **A linha de contagem** passa a contar o que é exato: "12 na agenda". Com filtro de status
  concluído, "os 30 entregues mais recentes". O total do histórico não existe sem
  `getCountFromServer`, que exige rede, e não entra.
- **Estado vazio.** "A encomenda sai do WhatsApp e entra na agenda" quando as três estão
  vazias; "Nada com esse filtro" quando só o filtro esvazia. Igual a hoje.

### 5. Mais nada em `src/`

`LinhaPedido`, `EntregasAPagar`, `AReceber`, `AgendaHoje`, `useDespensaParaProduzir` e as
mutações não mudam. Nenhuma outra tela ganha paginação, pelo motivo da tabela.

### 6. Documentação

- `#d105` em `docs/DECISOES.md`, com a tabela de recortes.
- `docs/ESTADO.md`: a linha "`/pedidos` carrega todo pedido não arquivado, sem recorte de
  data" sai da tabela de dívidas; entra a linha da "Decisão fácil de rejeitar" abaixo.
- O comentário de cabeçalho de `ListaPedidos` — que hoje diz "são dezenas de pedidos por mês, e
  um índice por combinação de status seria manutenção sem retorno" — é reescrito: o índice
  nasceu, e o motivo é outro.

---

## Roteiro de navegador

A conta real tem menos de trinta pedidos concluídos: o botão nem aparece. Para ver a página,
**baixe `PAGINA_DO_HISTORICO` para 3 durante o roteiro** e devolva para 30 antes do commit.

1. **`/pedidos`, com rede.** A agenda inteira em cima, os 3 concluídos mais recentes embaixo,
   o botão "Mostrar mais antigos" abaixo deles. O console **não** diz "query requires an index".
2. **Tocar "Mostrar mais antigos".** Seis concluídos, sem a lista piscar, sem esqueleto no meio.
   Repetir até o botão sumir: sumiu porque `dados.length < limite` com o snapshot do servidor.
3. **"A receber" antes e depois do passo 2.** O mesmo número. Se houver um pedido entregue e
   não pago mais antigo que a primeira página, ele já estava na soma antes do toque: é a
   consulta própria funcionando.
4. **Um pedido aberto com data de entrega de dois meses atrás** (criar um, ou voltar um
   entregue para "pronto"). Ele está na agenda com "Passou da data", **sem** tocar em "mais
   antigos". Depois devolver o status.
5. **Pílula "Entregues".** Só o histórico, em páginas de 3 entregues. Pílula "Confirmados": só
   a agenda, nenhum botão.
6. **DevTools em Offline, recarregar.** A agenda e a primeira página vêm do cache. O botão
   **fica** mesmo depois de o toque não trazer nada. Religar: a página cresce sozinha.
7. **`firebase firestore:indexes`** lista o índice novo.

---

## Critérios de aceite

- [x] `consultaAgenda`, `consultaEntreguesEmAberto` e `consultaHistorico` em
      `mutations/pedidos.ts`, cada uma com o comentário dizendo o recorte e o índice.
- [x] `STATUS_NA_AGENDA` e `STATUS_CONCLUIDOS` em `domain/pedido.ts`, com o teste da partição.
- [x] Nenhum `useColecao` em `src/` assina uma coleção sem um dos cinco recortes do `#d105`.
      O critério é um `grep -n "useColecao<" src/` lido consulta por consulta contra a tabela.
- [x] "A receber" soma o mesmo valor com o histórico na primeira página e na última.
- [x] O índice publicado e confirmado; `firestore.indexes.json` com a entrada.
- [x] O roteiro de sete passos passa, com `PAGINA_DO_HISTORICO` devolvido para 30.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d105` escrito; `ESTADO.md` atualizado, com a linha da dívida saindo e a nova entrando.

---

## Fora de escopo

- **Paginar `insumos` e `fichas`.** São catálogo, e toda tela precisa do conjunto inteiro. O
  recorte deles é `arquivado`, e já existe.
- **Paginar ou buscar `clientes` no servidor.** Quando doer — mil clientes, ou o editor de
  pedido demorando para abrir num aparelho novo —, o conserto é busca por prefixo em
  `nomeBusca` com `limit(10)` sobre o índice `arquivado + nomeBusca`, que já está publicado.
  Mas isso troca "busca por trecho do nome" por "busca pelo começo do nome", e é decisão de
  tela, não de consulta. Spec própria, quando houver motivo.
- **Recorte em `/financeiro` além do mês.** Um mês de lançamentos é a página natural do caixa;
  um mês com mil lançamentos é outro negócio.
- **Contagem total do histórico** ("de 412 pedidos"). `getCountFromServer` exige rede, e o
  número não decide nada.
- **Rolagem infinita.** Um botão é acessível, não dispara sem querer, e não pede
  `IntersectionObserver`.
- **Cursor (`startAfter`) e várias assinaturas.** É o que se faz quando `limit` crescente
  custa caro. Aqui cada "mais antigos" relê trinta documentos do cache, e o servidor só manda
  os que faltam.
- **Arquivar pedido em lote** ("arquivar tudo de 2025"). Arquivo continua sendo um a um; a
  paginação é o que tira a pressão de arquivar.
- **Diminuir o cache** (`cacheSizeBytes`). 40 MB é o padrão, e o `#d105` é o que impede de
  chegar lá.

---

## Decisões desta spec que são fáceis de rejeitar

- **Uma entrega paga ao entregador nunca e mais antiga que as páginas carregadas some da
  faixa "Entregas a pagar".** O caso é: pedido entregue, **pago pela cliente**, com taxa de
  entrega, que ela nunca acertou com o entregador — e que ficou para trás de trinta, sessenta,
  noventa concluídos mais recentes. `consultaEntreguesEmAberto` cobre o entregue **não pago**,
  porque `pago` é campo gravado; "acerto ausente" não é campo, é a ausência de
  `entrega.repasseTransacaoId`, e o Firestore não consulta ausência. Hoje esse pedido fica na
  faixa para sempre; depois desta spec, fica até cair da última página aberta. O acerto é
  semanal (`#d83`), então a janela para esquecer é de meses. Se isso for inaceitável, o
  conserto é um booleano derivado, `entrega.repassePendente`, gravado por `mudarStatusPedido`,
  `pagarEntregas`, `desfazerRepasse` e `atualizarPedido`, com backfill dos documentos que já
  existem — e isso é aprovação de schema e uma sessão a mais. Vai para a tabela de dívidas
  com este texto.
- **A agenda não tem teto.** Cem orçamentos abertos que ela nunca cancelou continuam
  carregando. É de propósito: um orçamento aberto é uma pergunta em aberto, e a resposta do
  sistema é "Passou da data", não "sumiu". O teto da agenda é ela fechar os pedidos.
- **`in` sobre `status`, e não um campo `concluido` gravado.** O campo seria o desenho do
  `#d04`, mas custaria escrever em seis mutações e reescrever cada pedido existente. `in`
  usa o mesmo índice que `==`, aceita até trinta valores e nós usamos quatro e dois. Se um
  dia houver um sétimo status, o teste da partição avisa.
- **O histórico ordena por data de entrega, e não por data de conclusão.** Não existe
  `concluidoEm`; `atualizadoEm` muda quando ela corrige uma observação. A data de entrega é a
  que ela lembra ("o Natal", "a festa da Júlia"), e é o índice que já existe.

---

## Riscos

- **Três assinaturas onde havia uma.** O Firestore multiplexa tudo num canal só, e a tela de
  fichas já assina três. A agenda e os entregues em aberto são pequenos por natureza; o
  histórico é o único que pesa, e é o que ganhou o `limit`.
- **O índice.** Se `firebase deploy --only firestore:indexes` não for rodado, `/pedidos` não
  carrega — o console diz e dá o link. Não é regressão silenciosa.
- **Se o passo 3 do roteiro der números diferentes**, pare: a leitura desta spec sobre
  `aReceber` está errada, e a faixa precisa de mais um conjunto além dos dois.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de sete passos, que é o único lugar onde uma consulta pode ser
vista pedindo índice — `npm test` cobre só `domain/`, e a partição dos status é o único pedaço
desta spec que mora lá.
