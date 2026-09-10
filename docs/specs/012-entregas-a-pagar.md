# Spec 012 · O acerto das entregas

**Tipo:** funcionalidade. Uma conta que hoje não existe em lugar nenhum passa a existir: quanto
ela deve ao entregador. Duas funções puras novas, dois campos aditivos no pedido, uma categoria
nova de saída, uma mutação nova e um painel. Nenhuma rota nova, nenhuma consulta nova, nenhum
índice novo.
**Tamanho:** uma sessão.
**Origem:** relato de uso. A entrega é orçada pelos apps (Uber/99), o valor é acertado com um
terceirizado, e **o combinado é pagar a ele uma vez por semana**. Hoje esse pagamento não passa
pelo sistema: sai do bolso, e o caixa nunca fica sabendo.
**Depende de:** nada. Não encosta na 5B.
**Aprovações pedidas:** duas, ao fim — dois campos aditivos em `Pedido.entrega` e um valor novo
em `CategoriaTransacao`.

---

## Problema

`Pedido.entrega` já sabe as duas coisas que importam: se é `RETIRADA` ou `ENTREGA`, e quanto a
taxa custou para a cliente. O que ela cobra está gravado desde o Módulo 3, entra no total do
pedido e entra no caixa quando o pedido é pago.

**O outro lado da entrega não está em lugar nenhum.** O entregador recebe, uma vez por semana,
a soma das entregas daquela semana — e essa saída não é um lançamento, não é uma categoria, não
aparece no resultado do mês. `derivarPedido` diz isso em voz alta, no comentário que abre a
função:

> "A taxa de entrega entra no total e **não** entra no custo: descontá-la como custo exigiria um
> campo de custo de entrega que não existe, o que seria inventar dado. A consequência é que
> `lucroEstimado` carrega a taxa dentro."

A consequência valia enquanto ninguém pagava a entrega. Agora alguém paga, e o efeito é duplo:

1. **O resultado do mês está alto.** As taxas entraram como receita e nada saiu contra elas. Num
   mês com trinta entregas de R$ 15,00, são R$ 450,00 de lucro que não existem.
2. **A conta da semana é feita na cabeça.** Domingo à noite, para saber quanto pagar, ela abre a
   agenda e soma pedido por pedido. Somar à mão o que o sistema já tem gravado é exatamente o
   trabalho que este projeto existe para tirar dela.

Não é perda de dado como a 011: nada torceu. É **dado que nunca foi pedido** — e a soma de um
campo que já está gravado é a coisa mais barata que este sistema pode oferecer.

---

## O que esta spec decide antes de qualquer código

Quatro decisões. Cada uma vira um `D` em `docs/DECISOES.md`: `#d82` a `#d85`.

### 1. A entrega é repasse: o que se paga é o que se cobrou — `#d82`

O valor combinado com o entregador é o mesmo que a cliente pagou. A taxa é orçada nos apps
(Uber/99) e repassada inteira: `entrega.taxa` **é** o que se deve, e não uma referência dele.

Isso é uma decisão, e não uma observação: a alternativa era um segundo campo — o custo da
entrega, ao lado da taxa cobrada — que abriria a diferença entre os dois na tela, no formulário e
no domínio. Enquanto o repasse for integral, esse campo teria um único valor possível e seria
mais um lugar para digitar errado. **No dia em que ela cobrar R$ 15,00 e pagar R$ 12,00, este é o
`D` que precisa ser revisto**, e o campo nasce ali — não antes.

Consequência que fica de pé: `Pedido.lucroEstimado` continua carregando a taxa dentro, e continua
otimista pedido a pedido. Quem fecha a conta é o caixa, em regime de caixa, onde a receita da
entrega já entrou e a saída passa a entrar. O pedido não é reescrito por causa disto
(`Fora de escopo`).

### 2. Só entra na conta a entrega que já foi feita — `#d83`

Uma entrega entra na lista de "a pagar" quando o pedido está em **`ENTREGUE`**. Não basta a data
ter passado, e não basta o pedido estar confirmado.

O status é o único sinal no sistema que afirma que a entrega aconteceu; a data diz o que estava
combinado. Pagar por data seria pagar por uma entrega que a cliente remarcou, e o dinheiro sai
antes do serviço.

O preço desta escolha é conhecido e precisa estar na tela: **a entrega que ela esqueceu de marcar
não aparece na conta da semana**. Ela aparece na semana seguinte, quando o pedido for movido, e o
painel diz quantos pedidos de entrega estão parados antes de `ENTREGUE` com a data já vencida —
uma frase, sem ação, para que a ausência seja explicada em vez de silenciosa.

### 3. O repasse mora no pedido, e a lista se monta em memória — `#d84`

O que separa a entrega paga da entrega a pagar são dois campos no próprio pedido:
`entrega.repassadoEm` e `entrega.repasseTransacaoId`. Ausentes é o estado normal.

Não nasce coleção de repasses, e não nasce consulta. `/pedidos` já assina **todos os pedidos não
arquivados**, ordenados por data de entrega — a mesma consulta que já alimenta a agenda, o total
do dia e a faixa "A receber". A lista de entregas a pagar é uma soma em memória sobre o que a
tela já tem, exatamente como `aReceber` (`#d36`). Zero leitura nova, zero índice novo, e funciona
offline porque nada precisa ir ao servidor para ser somado.

É também o que torna **desfazer** barato: os pedidos de um acerto são os que carregam aquele
`repasseTransacaoId`, e a tela já os tem na mão. Nenhuma consulta para desfazer.

### 4. O repasse tem categoria própria no caixa — `#d85`

`CategoriaTransacao` ganha `"ENTREGA"`, e a saída do acerto nasce nela.

Lançar em `OUTRO` custaria zero código e esconderia a resposta: "Saídas por categoria" é a tela
que responde para onde o dinheiro foi, e entrega é uma das três maiores saídas de uma confeitaria
que entrega. A mudança é aditiva — `porCategoriaSaida` é `Partial<Record<…>>`, e documento antigo
continua válido sem a chave.

A saída nasce **sem `pedidoId`**: um acerto cobre vários pedidos, e o campo é de um só. O vínculo
existe na direção que importa e que é consultável de graça — do pedido para o lançamento.

---

## Escopo

### 1. `src/lib/types/vendas.ts` — os dois campos

```ts
entrega: {
  tipo: "RETIRADA" | "ENTREGA";
  taxa: Centavos;
  endereco?: string;
  /**
   * Quando esta entrega foi acertada com o entregador. Ausente enquanto não
   * foi paga, que é o estado normal (`DECISOES.md#d84`).
   */
  repassadoEm?: Timestamp;
  /** A saída do caixa que pagou esta entrega, junto de outras. */
  repasseTransacaoId?: string;
};
```

`esquemaPedido` em `src/lib/domain/schemas.ts` acompanha, com os dois opcionais.

### 2. `src/lib/types/financeiro.ts` e `src/lib/domain/caixa.ts` — a categoria

`CategoriaTransacao` ganha `"ENTREGA"`. `ROTULO_CATEGORIA_TRANSACAO` ganha `"Entrega"`, e
`CATEGORIAS_SAIDA` ganha a linha — depois de `EMBALAGEM`, antes de `DESPESA_FIXA`, porque é a
ordem do tamanho provável. Nada mais em `caixa.ts` muda: o agregado já trata categoria como
chave, e não como lista fechada.

### 3. `src/lib/domain/pedido.ts` — as funções novas

Ao lado de `aReceber`, que é a irmã desta conta: mesma forma, mesma origem, soma sobre os pedidos
que a tela já carregou.

```ts
export interface EntregaAPagar {
  pedidoId: string;
  codigo: string;
  clienteNome: string;
  dataEntregaISO: DataISO;
  /** `entrega.taxa`: o que ela cobrou é o que ela paga (`#d82`). */
  valor: Centavos;
}

/** As entregas já feitas que ainda não foram acertadas, da mais antiga para a mais nova. */
export function entregasAPagar(pedidos: PedidoParaEntrega[]): EntregaAPagar[];

/** O total, quantas são e o período que elas cobrem. É o que o rodapé do painel diz. */
export function resumoDoRepasse(entregas: EntregaAPagar[]): {
  total: Centavos;
  quantidade: number;
  de?: DataISO;
  ate?: DataISO;
};

/** "Entregas · 3 pedidos · 31 de ago. a 05 de set." — a linha que aparece no caixa. */
export function descricaoDoRepasse(entregas: EntregaAPagar[]): string;

/** Entregas feitas e ainda não marcadas como entregues, com a data já vencida (`#d83`). */
export function entregasEsquecidas(
  pedidos: PedidoParaEntrega[],
  hojeISO: DataISO,
): number;

/** Os acertos já feitos, agrupados pelo lançamento que os pagou, do mais recente ao mais antigo. */
export function repassesFeitos(pedidos: PedidoParaEntrega[]): {
  transacaoId: string;
  pedidoIds: string[];
  quantidade: number;
  total: Centavos;
  repassadoEmISO: DataISO;
}[];
```

Entra em `entregasAPagar` o pedido que satisfaz os quatro: `entrega.tipo === "ENTREGA"`,
`entrega.taxa > 0`, `status === "ENTREGUE"`, e sem `entrega.repasseTransacaoId`. Taxa zero fica de
fora porque não há o que pagar — foi ela quem levou.

`descricaoDoRepasse` usa `rotuloDia` de `datas.ts`; um acerto de um dia só diz o dia uma vez.

### 4. `src/lib/firebase/mutations/pedidos.ts` — as duas mutações

```ts
export async function pagarEntregas(
  contaId: string,
  entregas: EntregaAPagar[],
  dataISO: DataISO,
  formas: FormaPagamento[],
): Promise<string>;

export async function desfazerRepasse(
  contaId: string,
  pedidoIds: string[],
  transacao: Transacao,
): Promise<void>;
```

`pagarEntregas` reusa `criarTransacao` — que já grava o documento e já aplica o delta no agregado
— e depois marca os pedidos em um `writeBatch`:

- Lançamento: `tipo: "SAIDA"`, `categoria: "ENTREGA"`, `valor` = soma das entregas escolhidas,
  `descricao` = `descricaoDoRepasse`, `dataISO` = o dia escolhido, `custoTaxa: 0`,
  `recorrente: false`, sem `pedidoId` e sem `formaPagamentoId` (`#d85`).
- `contextoMeta` é `null`, e isso foi conferido em `metas.ts` e não deduzido: `espelhoAposDelta`
  move o espelho a partir de `parcelas.entradas`, e o delta de uma saída tem `entradas` zerado.
  `null` diz isso em vez de depender da coincidência — é o mesmo que a 6B fez.
- Os pedidos são marcados por **caminho pontilhado**: `"entrega.repassadoEm"` e
  `"entrega.repasseTransacaoId"`. Gravar o mapa `entrega` inteiro apagaria o endereço e a taxa.

`desfazerRepasse` é o inverso, e reusa `arquivarTransacao` (que arquiva o documento e reverte o
delta) mais um `writeBatch` com `deleteField()` nos dois caminhos pontilhados.

**As duas despacham e não esperam** (`#d80`): acertar a semana precisa funcionar na cozinha, com
o celular sem sinal. `criarTransacao` e `arquivarTransacao` já são assim; o `commit()` do lote
passa por `despachar`.

### 5. `src/components/pedidos/` — a faixa e o painel

**`EntregasAPagar.tsx`**, faixa em `/pedidos` logo abaixo de "A receber", com o mesmo peso visual
— rebaixada, porque a agenda continua sendo o que ela veio ver. Ícone `Truck`, o total, quantas
entregas, e o botão que abre o painel. Some quando não há entrega a pagar.

**`PainelEntregas.tsx`**, `Painel` (folha inferior no celular, lateral no desktop, como manda o
invariante):

- Uma linha por entrega — cliente, código, dia e valor —, cada uma com caixa de seleção
  **já marcada**, alvo de toque de 44px na linha inteira, como `LinhaCompra` em `/compras`.
  Desmarcar é o que ela faz com a entrega que ela mesma levou.
- Campo de data do pagamento, nascendo hoje, com a mesma frase de `BlocoPagamento`: é esta data
  que manda no caixa.
- A frase de `#d83` quando `entregasEsquecidas` for maior que zero: "2 entregas com data vencida
  ainda não estão marcadas como entregues, e por isso não entram nesta conta."
- Rodapé do painel: o total do que está marcado e o botão "Pagar R$ 47,00", que diz o número em
  vez de prometer um.
- Abaixo, "Últimos acertos": os três mais recentes de `repassesFeitos`, cada um com "Desfazer" em
  duas etapas, como `BlocoPagamento` faz — a primeira toca, a segunda confirma, e a frase diz
  quanto volta e que o lançamento é arquivado, nunca apagado.

Nenhum destino novo na navegação: cinco é o teto, e este é assunto de `/pedidos`.

### 6. `tests/domain/pedido.test.ts`

Um `describe` novo com o caso de aceite abaixo, número por número, mais as bordas: retirada fora,
taxa zero fora, `PRONTO` fora, já repassada fora, lista vazia, período de um dia só, e
`repassesFeitos` agrupando dois pedidos de um acerto e um de outro.

---

## Caso de aceite, com números

A semana de segunda 31/08 a sábado 05/09/2026, acertada na segunda 07/09.

| Pedido       | Dia   | Tipo     | Taxa | Status   | Entra?                      |
| ------------ | ----- | -------- | ---- | -------- | --------------------------- |
| P-260831-A1B | 31/08 | ENTREGA  | 1200 | ENTREGUE | sim                         |
| P-260901-C7D | 01/09 | ENTREGA  | 1500 | ENTREGUE | sim                         |
| P-260903-E2F | 03/09 | RETIRADA | 0    | ENTREGUE | não, é retirada             |
| P-260904-G9H | 04/09 | ENTREGA  | 1200 | PRONTO   | não, ainda não foi entregue |
| P-260905-J4K | 05/09 | ENTREGA  | 2000 | ENTREGUE | sim                         |
| P-260828-M5N | 28/08 | ENTREGA  | 1500 | ENTREGUE | não, repassada em 31/08     |

- `entregasAPagar` devolve **3** linhas, na ordem 31/08, 01/09, 05/09.
- `resumoDoRepasse` → `{ total: 4700, quantidade: 3, de: '2026-08-31', ate: '2026-09-05' }`.
- `descricaoDoRepasse` → `"Entregas · 3 pedidos · 31 de ago. a 05 de set."`
- `entregasEsquecidas(pedidos, '2026-09-07')` → **1** (o P-260904-G9H).

**O lançamento**, com a data 07/09:

| Campo       | Valor        |
| ----------- | ------------ |
| tipo        | `SAIDA`      |
| categoria   | `ENTREGA`    |
| valor       | `4700`       |
| dataISO     | `2026-09-07` |
| competência | `2026-09`    |
| custoTaxa   | `0`          |

**O agregado `2026-09`**, depois do acerto:

| Campo                                | Delta    |
| ------------------------------------ | -------- |
| `saidas`                             | +4700    |
| `porCategoriaSaida.ENTREGA`          | +4700    |
| `porDia['07'].saidas`                | +4700    |
| `lucro`                              | −4700    |
| `entradas`, `produtos`, `qtdPedidos` | intactos |

**Os três pedidos** ficam com `entrega.repassadoEm` em 07/09 e o mesmo
`entrega.repasseTransacaoId`. A faixa some de `/pedidos`, porque não há mais entrega a pagar.

**Desfazer** arquiva o lançamento, devolve os R$ 47,00 ao resultado de setembro e limpa os dois
campos dos três pedidos — a faixa volta com R$ 47,00 e as mesmas três linhas.

Repare no que **não** acontece: a entrega de 31/08 foi cobrada em agosto, e o repasse dela sai em
setembro. Está certo, e é a mesma regra de todo o resto do painel — regime de caixa, o mês é o do
dinheiro (`#d36`).

### O roteiro em navegador

1. Três pedidos de entrega marcados como `ENTREGUE`, um deles ainda em `PRONTO`. A faixa aparece
   em `/pedidos` com o total dos três.
2. Abrir o painel, desmarcar uma linha: o total do rodapé e o texto do botão mudam juntos.
3. Remarcar, escolher o dia, pagar. O painel fecha no toque, a faixa some, e `/financeiro` mostra
   a saída em "Entrega" no dia escolhido.
4. **Com a rede em Offline**, repetir com outro conjunto: o painel fecha do mesmo jeito, o selo de
   sincronização acusa pendência, e o gráfico do mês já mostra a barra vermelha. Religar a rede e
   recarregar: os mesmos números, agora do servidor.
5. Desfazer o acerto: os pedidos voltam para a faixa e o lançamento aparece arquivado.

---

## Critérios de aceite

- [ ] `entregasAPagar` só devolve entrega feita (`ENTREGUE`), com taxa maior que zero e sem
      repasse, e o teste cobre as quatro exclusões.
- [ ] Um acerto grava **um** lançamento de saída em `ENTREGA` e marca **todos** os pedidos
      escolhidos, por caminho pontilhado — o endereço e a taxa continuam lá depois.
- [ ] Nenhuma escrita é esperada nas duas mutações novas, e o passo 4 do roteiro passa.
- [ ] Desfazer arquiva o lançamento, reverte o agregado e devolve os pedidos à faixa, sem
      nenhuma consulta nova.
- [ ] A frase de `#d83` aparece quando há entrega vencida fora da conta, com número e sem ação.
- [ ] O painel é folha inferior no celular e lateral no desktop, com alvo de toque de 44px por
      linha e o botão primário em 52px.
- [ ] Nenhum índice novo publicado, nenhuma consulta nova assinada, nenhuma dependência nova.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d82` a `#d85` escritos em `docs/DECISOES.md`; `docs/ESTADO.md` atualizado.

---

## Fora de escopo

- **Custo de entrega diferente da taxa cobrada.** É o que `#d82` decide e é o primeiro `D` a cair
  se o acerto deixar de ser integral. Enquanto for, o campo teria um valor só.
- **Corrigir `lucroEstimado` do pedido para descontar a entrega.** Mexeria em todo pedido já
  gravado e em `derivarPedido`, que o editor e a mutação compartilham. O lugar onde a conta fecha
  é o caixa, e é lá que esta spec a fecha.
- **Cadastro do entregador.** Nome, chave PIX, histórico por pessoa. Há um terceirizado, e um
  nome digitado numa descrição resolve o que existe hoje.
- **Tela própria `/entregas`.** Cinco destinos na navegação é o teto, e a conta nasce da agenda:
  é em `/pedidos` que ela mora.
- **Lembrete semanal** ("toda sexta, acertar as entregas"). Notificação é um assunto inteiro —
  permissão, service worker, horário — e o painel não some enquanto houver entrega a pagar.
- **Pagamento parcial ou valor digitado à mão.** O que se paga é a soma do que está marcado. Um
  campo de valor livre abriria a diferença entre o que o sistema calculou e o que ela pagou, e
  essa diferença não teria onde morar.
- **Selo "entrega paga" na linha do pedido.** O painel já lista os últimos acertos, e a lista de
  pedidos tem selo demais disputando a mesma linha.
- **Consulta própria dos pedidos com repasse pendente.** A soma é feita sobre a consulta que
  `/pedidos` já assina (`#d84`). Quando a agenda crescer a ponto de doer, o que nasce é a
  paginação da agenda — e ela é spec própria, não um índice pendurado nesta.
- **Recalcular o repasse de meses passados.** O acerto é do que ainda não foi pago; o que já foi,
  já está no caixa.

---

## Decisões desta spec que são fáceis de rejeitar

- **Só `ENTREGUE` entra na conta.** Deixa de fora a entrega que aconteceu e não foi marcada, e o
  preço é ela pagar na semana seguinte. A alternativa — a data vencida — paga por entrega
  remarcada, que é o erro caro. A frase do painel é o que impede a ausência de ser silenciosa.
- **A caixa de seleção nasce marcada.** Um painel que nasce vazio faria ela tocar sete vezes para
  fazer o que faz toda semana. Nasce marcada, e desmarcar é a exceção.
- **Desfazer só pelos últimos três acertos.** Não é histórico, é conserto do que acabou de
  acontecer. Quem quer ver o histórico do repasse abre `/financeiro` e filtra "Entrega".
- **O vínculo é de mão única.** Arquivar o lançamento direto em `/financeiro` deixa os pedidos
  marcados como repassados, e a faixa não volta. Está em `Riscos`, e a saída é desfazer pelo
  painel, que é onde a ação inteira mora.

---

## Riscos

- **Arquivar o lançamento por fora deixa os pedidos marcados.** É o único jeito de as duas
  metades divergirem, e ele passa por uma tela que não sabe que o repasse existe. Aceito por ora:
  a divergência é visível (a faixa não volta) e o conserto é lançar o acerto de novo. Se
  acontecer de verdade, vira guarda em `/financeiro`, como a da nota (`#d52`).
- **`/pedidos` carrega todos os pedidos não arquivados.** Já é assim desde a 3A, e esta spec
  pendura mais um consumidor nessa consulta em vez de criar a sua. A dívida é da agenda e cresce
  com ela; está nomeada em `Fora de escopo`.
- **Caminho pontilhado é obrigatório.** `updateDoc` com o mapa `entrega` inteiro apagaria endereço
  e taxa. É a linha mais fácil de errar desta spec, e o critério de aceite a interroga.
- **Marcar como entregue passa a ter consequência em dinheiro.** Até aqui, `ENTREGUE` era só
  posição na agenda. A partir desta spec, ele decide o que entra na conta da semana — e vale
  dizer isso no `D`, porque muda o peso de um botão que hoje parece inofensivo.
- **A categoria nova aparece em mês antigo como ausência, e não como zero.** É a regra que o
  agregado já segue, e o gráfico de saídas já não desenha linha zerada.

---

## Aprovações pedidas

**Duas, as duas aditivas e compatíveis com o que já está gravado.**

1. **`Pedido.entrega` ganha `repassadoEm?` e `repasseTransacaoId?`.** Documento antigo, sem os
   dois, continua válido e lê como "não repassada", que é o estado correto para todo pedido de
   hoje. Nenhuma migração.
2. **`CategoriaTransacao` ganha `"ENTREGA"`.** `porCategoriaSaida` é `Partial<Record<…>>`, então
   agregado antigo continua válido. O valor novo aparece em `CATEGORIAS_SAIDA` e passa a ser
   escolhível também no lançamento manual de `/financeiro`, o que é desejado: a entrega avulsa,
   paga na hora, tem onde ser lançada.

Nenhuma dependência nova, nenhuma regra de segurança tocada, nenhum índice novo.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado. Mais o roteiro de navegador de cinco passos — `npm test` cobre só `domain/`, e o
lançamento, o lote e o painel não moram lá.
