# Spec 025 · Quem mais compra de mim

**Tipo:** uma tela de leitura mais uma mutação de arquivo — a terceira spec da fase 1 do
`docs/saas/ROADMAP.md`, e a que paga a dívida mais antiga da tabela do `ESTADO.md`: "Cliente
ainda não tem tela: os agregados dele andam e ninguém os lê" (`#d35`). `Cliente.totalPedidos`,
`totalGasto`, `ticketMedio` e `ultimoPedidoEm` são escritos por `aplicarPedidoNoCliente` desde a
3B, a cada pedido pago, e nenhuma tela do sistema os mostra. Um módulo de domínio pequeno
(`domain/clientes.ts`), uma consulta e uma mutação em `mutations/clientes.ts`, a rota
`/clientes`, a linha, o atalho no cabeçalho de `/pedidos` e a quinta entrada de "O que mais tem
aqui". **Nenhum campo, nenhuma regra, nenhum índice (o de `clientes` está publicado desde a
3A), nenhuma dependência.**
**Tamanho:** uma sessão, com folga. O que pesa é a palavra da linha e o cabeçalho de `/pedidos`
a 360px com dois atalhos.
**Origem:** o roadmap (fase 1, 025: "`/clientes` lê `totalPedidos`, `totalGasto`, `ticketMedio`
e `ultimoPedidoEm`, que são escritos e ninguém lê. Arquivar cliente. Fora do menu de baixo,
alcançada pelo cabeçalho de `/pedidos`. Índice já publicado."); o comentário de
`Cliente.totalPedidos` em `types/vendas.ts`, que promete desde o Módulo 0 "a lista de clientes
mostra ticket médio e total gasto sem varrer a coleção de pedidos"; e as duas linhas da tabela
de dívidas que apontam para esta spec.
**Depende de:** nada no código. O roadmap a condiciona ao `#d113` — "se não tirar nada e ninguém
do beta pedir, espera". A seção abaixo diz o que ela tira; se quem conduz o projeto julgar que
não basta, a spec fica escrita e espera o beta.
**Aprovações pedidas:** nenhuma. **Duas decisões a registrar**, `#d137` (a tela de clientes lê e
ordena pelo dinheiro; a cliente continua nascendo do pedido — `#d35` ganha a nota) e `#d138`
(arquivar uma cliente congela os agregados dela e não desfaz vínculo nenhum).

---

## Problema

Uma confeiteira que vende há um ano tem trinta clientes cadastradas e não sabe dizer quais
cinco sustentam o mês. O sistema sabe: a cada pedido pago, `aplicarPedidoNoCliente` soma
`totalGasto`, incrementa `totalPedidos`, refaz `ticketMedio` e grava `ultimoPedidoEm`. O número
está no documento, está certo, e está mudo — a única tela que lê `clientes` é o editor de pedido,
e só para sugerir um nome enquanto ela digita.

Três coisas o repositório mostra:

1. **Tudo o que a tela precisa já está gravado.** Os quatro agregados são campos derivados
   escritos na mutação, como o invariante manda, e a consulta que os traz (`arquivado == false`
   por `nomeBusca`) já existe inline em `EditorPedido.tsx:75`, com o índice publicado na 3A.
   Zero consulta nova, zero campo novo.
2. **Editar uma cliente exige abrir um pedido dela.** `PainelCliente` só é alcançado de dentro
   de `FormularioPedido`, e só com o pedido vinculado. Para corrigir o telefone da Ana ela
   precisa achar uma encomenda da Ana. Arquivar não existe: a cliente que mudou de cidade
   continua nas sugestões para sempre — é a segunda linha da tabela de dívidas.
3. **`#d35` decidiu não haver tela de clientes**, e o motivo continua certo: a venda rápida da
   feira não vira formulário. O que a decisão não previa é que os agregados que ela mesma
   mandou gravar ("isso nasce junto com os agregados de dinheiro, que são da 3B") ficariam sem
   leitor por vinte specs.

**O que esta spec entrega:** `/clientes`, uma lista ordenada por quem mais deixou dinheiro no
caixa, dizendo por cliente quanto gastou, quantos pedidos pagou, a média por pedido e quando foi
o último; a linha abre o cadastro que já existe; o cadastro ganha "Arquivar cliente"; e a tela é
alcançada pelo cabeçalho de `/pedidos` e por `/comecar`.

**O que esta spec não entrega:** cadastrar cliente fora do pedido, os pedidos de uma cliente,
"quem sumiu", WhatsApp na linha, restaurar arquivada.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra uma tela fora do menu, um botão no cabeçalho de `/pedidos` e a quinta linha de "O que
  mais tem aqui".** O botão segue a regra de "Novo pedido" (`ListaPedidos.tsx:160`): **não
  aparece enquanto a tela está no estado vazio.** Na conta nova, o cabeçalho de `/pedidos` fica
  como está até o primeiro pedido gravado — e sem pedido não há cliente que a tela pudesse
  mostrar.
- **Sai um desvio:** para corrigir o telefone ou o endereço de uma cliente ela deixa de precisar
  encontrar um pedido dessa cliente e abri-lo. O painel de cadastro, que já existe, ganha um
  lugar próprio.
- **Sai um cadastro morto das sugestões.** Hoje toda cliente cadastrada é sugerida para sempre no
  editor de pedido; arquivar é o que faz a lista de sugestões voltar a ser só quem compra.
- **Nada sai de tela, campo ou caminho.** A tela não tem botão de criar, não tem pílula, não tem
  passo no começo. Está escrito.

---

## 1 · O que esta spec decide

### A tela lê e ordena pelo dinheiro; a cliente continua nascendo do pedido — `#d137`

`#d35` tem duas metades: "não há tela de clientes" e "a cliente é cadastro opcional, aberto de
dentro do pedido". A primeira cai; a segunda fica inteira. `/clientes` **não cadastra**: não há
"Nova cliente" no cabeçalho, no rodapé nem no estado vazio, porque uma cliente que não tem pedido
é uma linha de CRM, e o produto não é CRM (`ROADMAP.md` §4). O estado vazio diz onde ela nasce.

A ordem é **`totalGasto` decrescente**, em memória, sobre a mesma consulta por `nomeBusca` que o
editor de pedido usa — a coleção é catálogo, e o recorte dela é o arquivo (`#d105`). Empate por
`totalPedidos`, depois por nome; quem nunca pagou um pedido vai para o fim, por nome. Não há
pílula de ordenação: a pergunta da tela é uma só, e a busca por nome cobre a outra ("cadê a
Ana?").

Os números **contam o que entrou no caixa**, e a tela diz isso: `totalPedidos` só anda no
pagamento (`#d36`), então uma cliente com três encomendas confirmadas e nenhuma paga aparece como
"ainda sem pedido pago". É a mesma régua do painel do mês, e uma tela que contasse pedido
combinado como dinheiro mentiria do mesmo jeito que o `#d36` proibiu.

### Arquivar congela os agregados e não desfaz vínculo nenhum — `#d138`

`arquivarCliente` grava `arquivado: true` e decrementa `agregados/global.totalClientes`, o espelho
exato de `criarCliente` e o mesmo par de `arquivarInsumo`. Nada mais muda:

| O que                             | Depois de arquivar                                                           |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Pedidos antigos com o `clienteId` | Ficam como estão: `clienteNome` é snapshot, e a folha e a lista leem ele     |
| Editor de um pedido dela          | Mostra o nome sem "Cadastro de …": a consulta não a traz, o vínculo não acha |
| Pagamento de um pedido dela       | Os agregados **não andam**: `clienteDoPedido` é `null` sem cadastro na lista |
| Sugestões ao digitar o nome       | Some                                                                         |
| Restaurar                         | Não há na tela. O documento continua lá, `arquivado: true`, para o script    |

O `clienteId` **não é apagado** do pedido: mexer em `pedidos` para arquivar uma cliente seria
uma escrita por pedido, e o snapshot já resolve toda leitura. O custo é o da terceira linha —
uma cliente arquivada por engano e restaurada à mão terá `totalGasto` sem os pagamentos do
intervalo. É a mesma troca de `ultimoPedidoEm` no desfazer (`#d37`): sem histórico, o agregado
não se reconstrói; "Recalcular" para clientes é spec própria, se um dia for pedida.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` na linha e no cabeçalho. A linha é três
   andares, como `LinhaInsumo`; o dinheiro à direita é o número da tela.
2. `rg -n "colClientes\(" src/` — os leitores. Esperado: `EditorPedido.tsx` (a consulta inline,
   que sai daqui e vai para `consultaClientes`) e `mutations/clientes.ts`. Se houver um terceiro,
   ele também passa a usar a consulta nomeada.
3. `rg -n "PainelCliente" src/` — quem monta o painel. Esperado: só `FormularioPedido.tsx`. O
   arquivo muda de pasta nesta spec; o import muda com ele.
4. `rg -n "totalClientes" src/` — `criarCliente` incrementa; ninguém decrementa. Depois da spec,
   `arquivarCliente` decrementa.

---

## 3 · Escopo

### 3.1 O domínio — `src/lib/domain/clientes.ts` (novo)

```ts
import type { Cliente, DataISO } from "@/lib/types";
import { rotuloDia } from "./datas";
import { formatarMoeda } from "./money";

/** O que a ordem da tela precisa saber de uma cliente. */
export type ClienteOrdenavel = Pick<
  Cliente,
  "nomeBusca" | "totalPedidos" | "totalGasto"
>;

/**
 * Quem mais deixou dinheiro no caixa primeiro. Empate por pedidos pagos, depois
 * por nome; quem nunca pagou um pedido vai para o fim, por nome (`#d137`).
 */
export function ordenarPorGasto<C extends ClienteOrdenavel>(
  clientes: C[],
): C[] {
  return [...clientes].sort(
    (a, b) =>
      b.totalGasto - a.totalGasto ||
      b.totalPedidos - a.totalPedidos ||
      a.nomeBusca.localeCompare(b.nomeBusca),
  );
}

/**
 * "3 pedidos pagos · R$ 40,00 em média · último em 12 de ago.", ou "ainda sem
 * pedido pago". Conta o que entrou no caixa, como o painel do mês (`#d36`).
 * Com um pedido só, a média é o total e não se repete.
 */
export function resumoDaCliente(
  cliente: Pick<Cliente, "totalPedidos" | "ticketMedio">,
  ultimoPedidoISO: DataISO | null,
): string {
  if (cliente.totalPedidos <= 0) return "ainda sem pedido pago";
  const partes = [
    cliente.totalPedidos === 1
      ? "1 pedido pago"
      : `${cliente.totalPedidos} pedidos pagos`,
  ];
  if (cliente.totalPedidos > 1) {
    partes.push(`${formatarMoeda(cliente.ticketMedio)} em média`);
  }
  if (ultimoPedidoISO) partes.push(`último em ${rotuloDia(ultimoPedidoISO)}`);
  return partes.join(" · ");
}
```

- **Arquivo novo, e não `pedido.ts`**: `Cliente` é entidade própria em `vendas.ts`, e `pedido.ts`
  já tem seiscentas linhas. Puro: `rotuloDia` e `formatarMoeda` já moram no domínio.
- **`ultimoPedidoISO` chega como `DataISO`**, convertido na linha com
  `dataISODe(cliente.ultimoPedidoEm.toDate())`. O domínio não recebe `Timestamp`.

**Testes** (`tests/domain/clientes.test.ts`, novo):

1. **Ordem**: gasto 50000 antes de 12000; empate em gasto, 3 pedidos antes de 2; empate nos
   dois, "ana" antes de "bia"; gasto 0 depois de qualquer gasto, e entre os zeros por nome. A
   entrada não é mutada.
2. **Resumo, zero**: `totalPedidos: 0` → `"ainda sem pedido pago"`, mesmo com `ticketMedio` e
   `ultimoPedidoISO` preenchidos (não deveria acontecer; se acontecer, a palavra ganha).
3. **Resumo, um**: `1 pedido pago · último em 12 de ago.` — sem média.
4. **Resumo, vários**: `totalPedidos: 3, ticketMedio: 4000`, `2026-08-12` →
   `3 pedidos pagos · R$ 40,00 em média · último em 12 de ago.`.
5. **Sem data**: `totalPedidos: 2`, `null` → termina em "em média", sem "último".

### 3.2 A consulta e a mutação — `src/lib/firebase/mutations/clientes.ts`

```ts
/** Toda cliente viva, por nome: o recorte é o arquivo (`#d105`). */
export function consultaClientes(contaId: string) {
  return query(
    colClientes(contaId),
    where("arquivado", "==", false),
    orderBy("nomeBusca"),
  );
}

/**
 * Arquiva em vez de apagar: os pedidos dela apontam para este id, e o que ela
 * gastou fica guardado. O que muda depois está em `DECISOES.md#d138`.
 */
export async function arquivarCliente(
  contaId: string,
  clienteId: string,
): Promise<void> {
  const momento = agora();
  despachar(
    updateDoc(docCliente(contaId, clienteId), {
      v: VERSAO_SCHEMA,
      arquivado: true,
      atualizadoEm: momento,
    }),
  );
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalClientes: increment(-1), atualizadoEm: momento },
      { merge: true },
    ),
  );
}
```

`EditorPedido.tsx` troca a consulta inline por `consultaClientes(contaId)` — mesma forma, mesmo
índice, um lugar só (`#d105`: "quem conhece a forma da consulta conhece o índice"). As duas
escritas despacham (`#d104`).

### 3.3 O painel — `src/components/clientes/PainelCliente.tsx` (movido de `pedidos/`)

`git mv`; o import em `FormularioPedido.tsx` acompanha. Ganha uma prop opcional:

```ts
/** Só a tela de clientes passa: de dentro do pedido, arquivar não faz sentido. */
podeArquivar?: boolean;
```

Com `podeArquivar` e `cliente`, abaixo do último campo, o mesmo bloco de `FormularioInsumo.tsx:366`:
o botão `perigo` `sm` com `Archive` ("Arquivar cliente") sob um `border-t`, e a confirmação em
dois passos **no lugar**, dentro da folha — não `Confirmacao`, pelo motivo que o comentário de
`FormularioInsumo` já dá: no celular, um diálogo empilhado sobre a folha inferior é pior de ler e
de tocar do que a pergunta feita onde a ação está. O texto:

> Arquivar **Ana Beatriz**? Ela sai da lista e das sugestões do pedido. Os pedidos antigos
> continuam com o nome dela, e o que ela já gastou fica guardado.

Botões "Cancelar" e "Arquivar mesmo assim". Confirmado: `arquivarCliente`, depois `aoFechar()`;
falha vira a mesma frase de `salvar`. `aoSalvar` continua obrigatório — `/clientes` passa um
no-op — para o tipo não ganhar dois caminhos por causa de uma tela.

### 3.4 A linha — `src/components/clientes/LinhaCliente.tsx` (novo)

`<li><button>` como `LinhaInsumo`, três andares:

```
Ana Beatriz                                      R$ 486,00  ›
3 pedidos pagos · R$ 162,00 em média · último em 12 de ago.
(11) 99999-0000 · @anabeatriz
```

- Em cima: nome (`text-body font-medium`, `truncate`) e `formatarMoeda(totalGasto)` (`num
font-semibold`, `shrink-0`), chevron.
- No meio: `resumoDaCliente(cliente, ultimoISO)` em `num text-label text-ink-muted`, `pr-8`.
- Embaixo, só quando há algum: telefone e Instagram em `text-label text-ink-subtle`, separados
  por `·`. Texto, não link (ver fora de escopo).
- "ainda sem pedido pago" vai com `text-ink-subtle`, e sem ícone: não é atenção, é ausência.

Leitor de tela: o botão lê os três andares em ordem; nada escondido, nada `sr-only` a mais.

### 3.5 A tela — `src/components/clientes/ListaClientes.tsx` e a rota

`src/app/(app)/(coluna)/clientes/page.tsx`, `metadata.title: "Clientes"`, o mesmo esqueleto de
`pedidos/page.tsx`. A tela, irmã de `PaginaInsumos`:

- `CabecalhoPagina` — título **Clientes**, descrição "Quem compra de você, quanto já deixou no
  caixa e quando foi a última vez. Pedido combinado e ainda não pago não entra na conta." Dentro,
  `CampoBusca` "Buscar cliente". **Sem `acao`**: não há botão primário nesta tela (`#d137`).
- Abaixo, a linha de contagem (`N clientes`, "Carregando") e `SeloSincronizacao`, como em
  `/insumos`.
- `useColecao<Cliente>(consultaClientes(contaId))`; `visiveis = ordenarPorGasto(dados.filter(por
nomeBusca))` num `useMemo`.
- Estado vazio sem cadastro — título **"Suas clientes nascem dos pedidos."**, descrição "Ao anotar
  uma encomenda, toque em Cadastrar esta cliente para guardar telefone e endereço. Ela aparece
  aqui com o que já comprou." Ação: `Link` para `/pedidos`, "Ver pedidos" (`primaria`, `lg`).
  Leva o ponto da marca como os outros estados vazios (033-C).
- Estado vazio com busca: "Ninguém com esse nome" e "Limpar busca".
- Erro: "Não deu para carregar suas clientes", a mesma frase das outras listas.
- A linha abre `PainelCliente` com `cliente`, `nomeSugerido={cliente.nome}`,
  `podeArquivar`, `aoSalvar={() => {}}` e `chave` que muda a cada abertura (`${id}-${n}`), como
  o editor de pedido faz.
- **Sem `BotaoFlutuante`.**

### 3.6 As portas

- **`src/components/clientes/AtalhoParaClientes.tsx`** (novo), gêmeo de `AtalhoParaCompras`:
  `Link` para `/clientes` com `classesBotao`, ícone `Users`, texto "Clientes". No cabeçalho de
  `/pedidos`, dentro do `flex` que já tem `AtalhoParaCompras`, **depois** dele e **só quando
  `!estadoVazioNaTela`** — a regra de "Novo pedido". A 360px os dois atalhos dividem a linha; o
  roteiro (passo 7) decide se o texto de "Clientes" vira `sr-only` no celular com o ícone
  sozinho, ou se os dois cabem. Se não couberem, é o de clientes que encolhe: o que comprar é
  toda semana.
- **`OQueMaisTem.tsx`**: a quinta entrada, depois de "O que está pronto":

  > **Clientes** — Quem compra de você, ordenada por quem mais deixou dinheiro no caixa: quantos
  > pedidos pagou, a média por pedido e quando foi o último. É de lá que se corrige o telefone e
  > se arquiva quem parou de comprar.
  > _Quando for mandar a novidade do mês, ou quiser saber quem sumiu._

  O comentário de `FUNCIONALIDADES` passa a dizer "cinco", e que a quinta tem a porta em
  `/pedidos` (025). `#d70` continua valendo: o guia diz o momento, o estado vazio ensina a tela.

### 3.7 Documentação

- `#d137` e `#d138` em `docs/DECISOES.md`; `#d35` ganha a nota "a primeira metade caiu na 025".
- `docs/ESTADO.md`: a seção da 025; a linha 25 na tabela de módulos; a contagem de testes; as
  duas linhas de dívida de `mutations/clientes.ts` saem (a de `ultimoPedidoEm` fica); a lista de
  rotas estáticas ganha `/clientes`; a próxima ação.
- `docs/saas/ROADMAP.md`: a 025 marcada como entregue, com o que a spec decidiu que o roadmap não
  dizia (sem cadastrar da tela; a ordem pelo gasto; o atalho escondido no estado vazio).

---

## Roteiro de navegador

Conta real, `npm run dev`, desktop a 1280px e celular a 360px, os dois temas.

1. **Os números batem.** `/clientes`: a primeira linha é quem mais gastou. Abrir os pedidos
   pagos dela em `/pedidos` (filtro "Entregues" e a agenda): a soma dos `total` dos pedidos
   pagos **vinculados** a ela é o `totalGasto` da linha, e a média é gasto ÷ pedidos. Se não
   bater, conferir antes se algum pedido dela foi pago sem o vínculo ("Cadastro de …" ausente
   no editor) — é a régua do `#d137`, não um defeito.
2. **Conta vazia.** Numa conta sem pedido: `/pedidos` não mostra "Clientes" no cabeçalho;
   `/clientes` digitada na barra mostra o estado vazio, e "Ver pedidos" leva a `/pedidos`.
3. **O pagamento move a linha.** Com `/clientes` aberta numa aba e um pedido vinculado noutra:
   marcar pago → a linha atualiza sem recarregar (gasto, pedidos, média, "último em"). Desfazer →
   gasto e pedidos voltam; "último em" fica (`#d37`, dívida conhecida).
4. **Editar daqui.** Tocar a linha, trocar o telefone, salvar: a linha mostra o novo; abrir um
   pedido dela em `/pedidos/[id]` → "Cadastro de …" mostra o telefone novo.
5. **Arquivar.** Tocar a linha, "Arquivar cliente", ler a pergunta, "Arquivar mesmo assim": a
   folha fecha, a linha some, a contagem cai. No editor de pedido, digitar o nome dela: **sem
   sugestão**. Abrir um pedido antigo dela: o nome continua, sem "Cadastro de …". No console do
   Firestore, `agregados/global.totalClientes` caiu um.
6. **Sem rede.** DevTools em Offline: editar e arquivar; a lista reflete antes de religar, o selo
   de sincronização mostra pendente; religar, o selo limpa e nada muda.
7. **360px.** Cabeçalho de `/pedidos` com pedido gravado: "O que comprar" e "Clientes" na mesma
   linha sem quebrar feio, com "Novo pedido" só no flutuante. `/clientes`: o dinheiro da linha
   não trunca, o resumo quebra em duas linhas se precisar, o nome trunca.
8. **Leitor de tela.** Na linha: nome, dinheiro, resumo e contato, nessa ordem. No painel, o
   bloco de confirmação lido inteiro; "Cancelar" volta ao botão.
9. **Tema escuro.** A linha, o bloco de confirmação (`bg-negative-soft`) e o estado vazio.
10. **`/comecar`.** "O que mais tem aqui" lista cinco; a quinta leva a `/clientes`.

---

## Critérios de aceite

- [x] Os cinco testes de `clientes.test.ts` passam; `npm test` sobe de 547 para o novo número,
      relatado.
- [x] `/clientes` ordena pelo gasto e os números batem com os pedidos pagos vinculados (passo 1).
- [x] O atalho não aparece na conta sem pedido; o estado vazio aponta para `/pedidos` (passo 2).
- [x] Pagar e desfazer movem a linha ao vivo (passo 3). Editar daqui reflete no pedido (4).
- [x] Arquivar tira da lista e das sugestões, mantém o pedido antigo, decrementa
      `totalClientes` (passo 5). Offline funciona (passo 6).
- [x] `EditorPedido` usa `consultaClientes`; `rg "colClientes\(" src/components/` vazio.
- [x] `PainelCliente` mora em `components/clientes/`; `FormularioPedido` importa de lá.
- [x] `git diff src/lib/types/ firestore.rules firestore.indexes.json package.json` vazio.
- [x] `npx impeccable --json src/` continua `[]`.
- [x] `lint`, `typecheck`, `test` e `build` passam; o build lista `/clientes` entre as estáticas.
- [x] `#d137` e `#d138` escritos, `#d35` anotado; `ESTADO.md` (seção, linha 25, dívidas, rotas,
      próxima ação) e `ROADMAP.md` atualizados.

---

## Fora de escopo

- **Cadastrar cliente de `/clientes`.** `PainelCliente` já sabe criar; o botão seriam três
  linhas. Não entra de propósito: a cliente nasce do pedido (`#d35`, `#d137`), e uma lista de
  nomes sem pedido é CRM. Volta à mesa se alguém do beta pedir para "importar as clientes".
- **Os pedidos de uma cliente** ("o que a Ana já pediu"). Exige consulta por `clienteId` mais
  `dataEntregaISO` — índice novo e uma quarta consulta de `pedidos` (`#d105`). A linha diz
  quantos e quando foi o último; a lista completa nasce quando for pedida, com o índice.
- **"Quem sumiu"** (última compra há mais de N dias, com selo). É uma comparação sobre
  `ultimoPedidoEm` que já está gravado; o que falta é saber o N, e isso as entrevistas dizem.
- **WhatsApp na linha.** `linkDoWhatsApp` existe; um segundo alvo de toque na linha muda o gesto
  da lista inteira (a linha abre o cadastro). O telefone está no cadastro, a um toque.
- **Restaurar arquivada.** Nenhuma tela lista arquivadas; `restaurarInsumo` existe e não tem
  tela também. O documento fica, e o script resolve o engano.
- **`ultimoPedidoEm` voltando atrás no desfazer.** Dívida conhecida (`#d37`); exigiria
  histórico de pagamentos.
- **Recalcular os agregados da cliente** a partir dos pedidos pagos. Sem cliente arquivada por
  engano e restaurada, não há caso; quando houver, é `consultaPedidosPagos` por `clienteId` —
  o mesmo índice do segundo item.
- **Um total no topo** ("R$ 12.400 com clientes cadastradas"). Soma de uma parte das vendas
  (só as vinculadas): número que parece resultado e não é. O resultado mora em `/financeiro`.

---

## Decisões desta spec que são fáceis de rejeitar

- **Ordem pelo gasto, sem pílula.** A alternativa — por nome, com "Ordenar por" — responde
  "cadê a Ana" (que a busca já responde) e esconde "quem sustenta o mês" (que é o título da
  spec). Se a Maynara pedir por nome, é uma pílula de duas opções.
- **Confirmação no lugar, e não `Confirmacao`.** O `DESIGN.md` reserva a modal para confirmação
  destrutiva, e arquivar é. Mas o par desta ação — arquivar material — já decidiu que dentro da
  folha inferior a pergunta feita no lugar é melhor, e dois arquivos irmãos com dois padrões é
  pior do que qualquer um dos dois. Se quem conduz preferir a modal, são dez linhas.
- **`podeArquivar` como prop, e não sempre.** De dentro do pedido, arquivar a cliente que acabou
  de vincular deixaria o pedido apontando para um cadastro que a lista não traz. A prop custa
  uma linha e evita o caso.
- **Mover `PainelCliente` para `clientes/`.** É churn de um `git mv` e um import. A alternativa
  — `/clientes` importando de `pedidos/` — é o tipo de coisa que confunde às três da manhã.
- **O atalho escondido no estado vazio.** Sem isso, o cabeçalho de `/pedidos` de uma conta nova
  ganharia um segundo botão apontando para uma tela vazia. É o que responde ao `#d113`.
- **Texto, não link, no telefone da linha.** Um `<a href="tel:">` dentro de um `<button>` é
  HTML inválido; fora dele, é um segundo alvo por linha. O cadastro está a um toque.
- **"Pedido combinado e ainda não pago não entra na conta" no cabeçalho.** Duas frases na
  descrição, contra uma nas outras telas. É a frase que evita "cadê o pedido da Ana de ontem" —
  a mesma pergunta que `#d36` já respondeu no caixa. Se o `/impeccable` reclamar, vira `dica`
  abaixo da busca.

---

## Riscos

- **Pedidos pagos sem vínculo.** Toda venda anotada só com o nome (o caso da feira, `#d35`)
  não aparece em ninguém, e a "melhor cliente" pode ser a que ela cadastrou, e não a que mais
  compra. O cabeçalho diz o que conta; o roteiro (passo 1) mede. Se doer, o editor de pedido
  passa a sugerir o vínculo com mais insistência — outra spec.
- **Dois atalhos a 360px.** "O que comprar" tem quinze caracteres com ícone; "Clientes", oito.
  Se quebrarem em duas linhas, o de clientes fica só com o ícone e `sr-only` no celular. Está
  no roteiro, passo 7.
- **`totalClientes` negativo.** Uma cliente arquivada duas vezes (dois toques, duas abas) decrementa
  duas vezes; o botão some com a folha, e ninguém lê `totalClientes` (`#d67`). Aceito.
- **Cliente arquivada e restaurada à mão** perde os pagamentos do intervalo nos agregados
  (`#d138`). Aceito, e nomeado no fora de escopo.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o passo 1 antes de qualquer outro: é ele que prova que os
agregados escritos desde a 3B estavam certos o tempo todo. Com esta spec, as duas linhas
de `mutations/clientes.ts` saem da tabela de dívidas, e a fase 1 fica com a 026 esperando as
entrevistas.
