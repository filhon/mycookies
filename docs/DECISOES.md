# Decisões de arquitetura

Registro do que foi decidido, por quê, e o que a decisão custa. Serve para não
relitigar escolha resolvida e para saber o que revisar quando o contexto mudar.

**Um arquivo só, e não um por decisão.** O padrão ADR clássico usa um arquivo por
registro, o que serve a equipes que fazem arqueologia por `git blame`. Aqui o leitor
mais frequente é uma sessão de implementação que precisa carregar tudo de uma vez:
um arquivo custa uma leitura, quinze custam quinze.

Formato: cada decisão tem contexto, decisão, consequência e status.
Status é `vigente`, `provisória` (tem prazo de validade conhecido) ou `substituída`.

---

## D01 · Escopo de dados por conta, não por login

**Status:** provisória · decidida em 2026-09-01

**Contexto.** Hoje existe uma usuária. Todo dado mora em `users/{uid}/...`, o que torna a
regra de segurança trivial: `request.auth.uid == uid`.

**Decisão.** Manter `users/{uid}` até o refactor da spec `000-contas`, e então migrar para
`contas/{contaId}` com o vínculo de associação em custom claim.

**Consequência.** `uid` identifica login, não negócio. No dia em que houver uma ajudante, um
contador com acesso, ou uma pessoa com dois negócios, o caminho está errado. Migrar com zero
dados é renomear oito arquivos; migrar com clientes pagantes é projeto de cutover. Por isso
a decisão tem prazo: **executar antes do Módulo 2**, porque cada módulo novo adiciona
arquivos que carregam `uid`.

---

## D02 · Dinheiro em centavos inteiros

**Status:** vigente

**Contexto.** O sistema existe para acertar preço. Erro de arredondamento aqui é o defeito
mais caro possível.

**Decisão.** Todo valor monetário é `number` inteiro em centavos (`Centavos`). Custo unitário,
que é fração de centavo por grama, usa um tipo separado (`CentavosFracionados`) e só é
arredondado ao virar total de linha.

**Consequência.** Formatação e parsing ficam concentrados em `src/lib/domain/money.ts`.
Trocar a representação depois seria migração sobre todo documento de todo cliente.

---

## D03 · Ingredientes e embalagens na mesma coleção

**Status:** vigente

**Contexto.** O Módulo 1 pedia cadastro de ingredientes e, separadamente, de embalagens,
etiquetas e insumos de armazenamento.

**Decisão.** Uma coleção `insumos`, discriminada por `categoria`.

**Consequência.** Um motor de custo, uma tela de cadastro, uma leitura para popular o app.
O preço de embalagem entra na ficha técnica pelo mesmo caminho que o de farinha. Se algum
dia embalagem precisar de campos que ingrediente não tem, o discriminante já está lá.

---

## D04 · Campos derivados gravados, não calculados na leitura

**Status:** vigente

**Contexto.** Firestore cobra por leitura, e a usuária opera offline com frequência.

**Decisão.** `custoUnidadeBase`, `custoUnidadeBaseCorrigido`, `custoTotalLote`,
`custoUnitario` e o progresso da meta são calculados na escrita e gravados.

**Consequência.** Leitura barata e lista que renderiza sem processar. O preço é a
possibilidade de divergência: quando um insumo muda de preço, as fichas que o usam ficam
com valor velho. Resolvido por D05.

---

## D05 · Invalidação explícita de ficha via `insumoIds`

**Status:** vigente

**Contexto.** Consequência direta de D04.

**Decisão.** Cada ficha espelha os ids dos seus insumos em `insumoIds[]`. Ao mudar um preço,
uma consulta `array-contains` acha as fichas afetadas e marca `custoDesatualizado: true`.

**Consequência.** A interface mostra o selo de custo desatualizado antes que um preço velho
vire orçamento. Custa uma leitura das fichas afetadas por mudança de preço, o que acontece
raramente e nunca em caminho crítico.

---

## D06 · `Timestamp.now()` em vez de `serverTimestamp()`

**Status:** vigente

**Contexto.** `serverTimestamp()` grava `null` no cache local até a sincronização acontecer.

**Decisão.** Usar o relógio do aparelho.

**Consequência.** Com uma única escritora o relógio local basta, e a lista não quebra ao
ordenar por data justamente no cenário mais comum: offline. Revisar se algum dia houver
múltiplos escritores na mesma conta, quando a ordem entre eles passar a importar.

---

## D07 · Permissão por custom claim, não por documento

**Status:** vigente

**Contexto.** As regras precisam saber se quem escreve tem acesso.

**Decisão.** Claim `admin` no token, concedida por script. As regras leem
`request.auth.token`.

**Consequência.** Avaliação de regra com zero leitura. Um allowlist em documento
(`get(/admins/$(uid))`) seria cobrado a cada acesso. O preço é que conceder acesso exige
re-emitir o token, ou seja, sair e entrar de novo. A claim vira mapa de contas em D01.

---

## D08 · Snapshot de custo e nome nos pedidos

**Status:** vigente

**Contexto.** Um pedido entregue é fato histórico; uma ficha técnica é documento vivo.

**Decisão.** `ItemPedido` guarda `nomeSnapshot`, `precoUnitario` e `custoUnitarioSnapshot`
congelados no momento do pedido.

**Consequência.** Reajustar o preço do chocolate não reescreve o lucro de pedidos já
entregues. Duplica dado de propósito, e é o tipo certo de duplicação.

---

## D09 · Agregado mensal como documento único

**Status:** vigente

**Contexto.** O painel financeiro precisa de KPIs, gráfico diário, ranking de produtos e
progresso de meta.

**Decisão.** `agregados/{YYYY-MM}` carrega tudo isso, mantido por `FieldValue.increment`
nas escritas de pedido e transação.

**Consequência.** O painel inteiro sai de uma leitura, e `increment` entra na fila offline.
Ver D10 para o limite dessa escolha.

---

## D10 · Agregados incrementados pelo cliente

**Status:** provisória

**Contexto.** Consequência operacional de D09.

**Decisão.** O cliente incrementa os agregados diretamente, sem Cloud Function.

**Consequência.** Funciona offline e não custa invocação. Em SaaS vira problema de confiança,
porque um cliente malicioso escreve o número que quiser no agregado financeiro, e as regras
não conseguem validar "incrementou exatamente um". **Prazo de validade: o segundo cliente
pagante.** A troca é contida porque `src/lib/firebase/mutations/` é a única costura.

---

## D11 · Kit é ficha com componentes, com um nível de profundidade

**Status:** vigente

**Contexto.** A Maynara vende por unidade e em caixa/kit.

**Decisão.** `FichaTecnica.tipo` distingue `SIMPLES` de `KIT`. Um kit consome outras fichas
via `componentes[]`, mais a própria embalagem. Kit não contém kit.

**Consequência.** Um kit é precificado pelo mesmo motor de uma receita, e o pedido referencia
os dois pelo mesmo campo. O limite de um nível mantém a explosão de demanda da lista de
compras finita e o custo auditável. Se um dia houver kit de kits, será decisão nova, com
detecção de ciclo.

---

## D12 · Build fixado em webpack

**Status:** provisória

**Contexto.** Next 16 usa Turbopack por padrão. `@serwist/next`, que gera o service worker,
ainda depende de webpack e é silenciosamente ignorado sob Turbopack.

**Decisão.** `dev` e `build` passam `--webpack`.

**Consequência.** Build mais lento em troca de PWA que funciona. Como o uso offline é
requisito e não enfeite, a troca vale. **Revisar quando** `@serwist/turbopack` sair do
experimental.

---

## D13 · Tema claro por padrão

**Status:** vigente

**Contexto.** Decisão de design, registrada aqui porque costuma ser questionada.

**Decisão.** Claro por padrão, escuro seguindo `prefers-color-scheme`.

**Consequência.** A cena que decide é a Maynara com o celular na bancada às duas da tarde,
cozinha iluminada. Painel escuro nessa luz é ilegível, e seria também o reflexo previsível
de "ferramenta de gestão que não quer parecer planilha". Detalhes em `DESIGN.md`.
