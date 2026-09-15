# Spec 017 · O orçamento em papel

**Tipo:** uma folha A4 que sai do pedido, impressa pelo navegador. Um módulo de domínio puro,
uma rota, um bloco no editor de pedido, e quatro campos opcionais para a folha ter o que
mostrar: a validade do orçamento, a foto e a descrição do produto, e o contato e a assinatura
do negócio. Nenhuma dependência de produção, nenhuma regra de segurança, nenhum índice.
**Tamanho:** duas sessões. A **17A** entrega a folha inteira com o que o sistema já sabe
(itens, preços, totais, validade, entrega, pagamento, nome da dona sobre a linha). A **17B**
dá a ela a foto e a descrição de cada produto, o telefone e o Instagram no rodapé e a
assinatura desenhada. Depois da 17A já dá para mandar orçamento; a 17B é o que faz o
gestor olhar duas vezes.
**Origem:** relato de uso. Uma empresa pediu orçamento para um evento, e "R$ 10,00 o
Tradicional, 50 unidades" no WhatsApp não passa pelo setor de compras de ninguém: a pessoa
do outro lado precisa de um documento com o nome da empresa, o que está incluído, quanto
custa, até quando o preço vale e quem está assinando. É a terceira coisa que a operação real
devolveu depois da 010, e a primeira que a cliente da Maynara vai ler **sem** a Maynara junto,
em papel timbrado.
**Depende de:** nada. Encosta em `FormularioPedido` (um campo e um bloco), em
`FormularioFicha` (dois campos, na 17B), em `TelaConfiguracao` (um bloco, na 17B) e no
`AppShell` (uma classe). Não toca em `derivarPedido`, no caixa, na agenda nem na lista de
compras.
**Aprovações pedidas:** cinco campos opcionais de schema, todos compatíveis; imagem gravada
como `data:` URL dentro do documento, com teto de tamanho; e o texto da folha, palavra por
palavra. Estão ao fim.

---

## Problema

O pedido para empresa nasce igual a qualquer outro: `status: "ORCAMENTO"`, itens com preço
congelado, `derivarPedido` fazendo a conta. O que o sistema não tem é **a forma que a empresa
espera receber** essa conta.

Hoje o que sai é o resumo do WhatsApp (spec 010), e ele é para a Ana que encomendou uma caixa
para a festa da filha. Um gestor de compras precisa de outra coisa:

- **Um documento, e não uma mensagem.** Ele vai anexar num e-mail, encaminhar para quem
  aprova, guardar na pasta do evento. Uma mensagem de WhatsApp não vai a lugar nenhum.
- **A empresa nomeada.** "Orçamento para a Tal Ltda." é o que faz o documento ser deles.
- **Até quando vale.** Sem prazo, o preço de setembro é cobrado em dezembro com o chocolate
  mais caro, ou o gestor aprova em novembro e a Maynara descobre que o custo mudou.
- **O que está incluído, com cara de produto.** Uma linha "Cookie Tradicional × 50" é uma
  linha de planilha. A foto e duas frases são o que fazem o gestor entender o que está
  comprando sem nunca ter provado.
- **Quem assina.** Um orçamento sem assinatura é um rascunho; com ela, é uma proposta.

O sistema já tem quase tudo isso gravado: `Pedido.codigo`, `clienteNome`, os itens com
`precoUnitario` e `subtotal`, `desconto`, `entrega.taxa`, `total`, a forma de pagamento com
`instrucoes` (`#d98`), `Conta.proprietaria`. **O que falta é uma data de validade, uma folha,
e o caminho até o PDF.** O que falta para a folha ficar bonita é a foto e a descrição do
produto, que `FichaTecnica.fotoUrl` já prevê e ninguém nunca escreveu.

---

## O que esta spec decide antes de qualquer código

Cinco decisões. Cada uma vira um `D` em `DECISOES.md`: `#d106` a `#d110`.

### 1. O PDF é o navegador imprimindo uma rota, e não uma biblioteca — `#d106`

`window.print()` sobre uma página com `@page { size: A4 }` e CSS de impressão. No desktop,
Ctrl+P e "Salvar como PDF"; no Android, "Compartilhar → Imprimir → Salvar como PDF"; no
iPhone, "Compartilhar → Opções → PDF". O PDF que sai é vetorial, com a Fraunces e a Figtree
embutidas, no mesmo motor que desenha o app.

As alternativas sérias são `@react-pdf/renderer` ou `jspdf` (dependência de produção, uma
segunda linguagem de layout que não é o CSS do app, e a marca reconstruída à mão numa API que
não conhece `oklch`) ou um servidor com Chromium headless (custo, tempo de resposta, e a
única rota do sistema que exige rede para uma coisa que o aparelho já sabe fazer). Nenhuma
das duas resolve um problema que o navegador não resolva sozinho. **A folha é HTML, e HTML é
o que este projeto sabe fazer bonito.**

Duas consequências ficam registradas de propósito:

- **A folha funciona sem rede.** O pedido está no cache, a ficha está no cache, a
  configuração está no cache. Salvar o PDF é ação do aparelho.
- **O caminho até o PDF depende do sistema operacional**, e no iPhone ele é longo. É o custo
  aceito; o roteiro de aparelho confere os três. Se um dia doer de verdade, o conserto é uma
  rota de servidor que devolve o PDF pronto, e a folha continua sendo a mesma página.

`ponytail:` a folha é a página inteira em modo impressão, e o shell some com `print:hidden`.
Se um dia houver uma segunda coisa para imprimir (a ficha, o recibo), o que nasce é um layout
de impressão, não uma segunda solução.

### 2. A folha lê o documento gravado, e não o formulário — `#d107`

É o contrário do `#d78`, e por um motivo que o `#d78` já previa. O resumo do WhatsApp mora
dentro do editor e monta o texto do que está na tela, porque a alternativa mandaria para a
cliente um número que ninguém está vendo. A folha é **outra rota**, e não tem tela de edição
ao lado: o que ela pode ler é o que está no Firestore.

E é o certo para o que ela é. O resumo confirma uma conversa; a folha é o que a empresa
assina. Um documento assinado que diz um total diferente do que o sistema gravou é o defeito
que a 010 consertou, de volta com carimbo. **Salvar antes de imprimir** é a regra, e o bloco
do editor a diz em uma linha.

### 3. A foto e a descrição vêm da ficha viva; o preço, do pedido — `#d108`

`ItemPedido` congela `nomeSnapshot`, `precoUnitario` e `custoUnitarioSnapshot` (`#d08`): o que
se congela é dinheiro, porque dinheiro reescrito muda o lucro de pedido entregue. A foto e a
descrição não são dinheiro. Congelar uma foto de 20 KB em cada linha de cada pedido triplica
o tamanho da coleção que mais cresce (`#d105`) para proteger uma coisa que ela **quer** que
mude: trocou a foto do Red Velvet, todo orçamento novo sai com a foto nova.

O custo aceito: reimprimir um orçamento antigo depois de trocar a descrição da ficha mostra a
descrição nova. O preço, o nome e o total continuam os de quando foi feito. Ficha arquivada
continua no pedido com o nome congelado, e a linha sai sem foto e sem descrição: o nome e o
preço são o que a folha promete, o resto é enfeite que degrada.

### 4. Imagem mora no documento, como `data:` URL, e não no Storage — `#d109`

A miniatura do produto e a assinatura são as duas únicas imagens que o sistema grava, e as
duas são pequenas por natureza: uma foto de 320px de lado em JPEG cabe em 20 KB, uma
assinatura de 720px em PNG cabe em 60 KB. O Firebase Storage exigiria um segundo serviço
ligado, regras de segurança próprias, URL que só resolve com rede (a folha ficaria sem foto
offline), e um segundo lugar onde `contas/{contaId}/…` precisa ser respeitado.

Um `data:` URL dentro do documento viaja no mesmo cache, sob a mesma regra, e aparece na
folha sem rede. `FichaTecnica.fotoUrl` já é `string`, e `data:image/jpeg;base64,…` **é** uma
URL: nenhum campo muda de tipo. Os tetos são a guarda: 80 KB para a foto, 200 KB para a
assinatura, e a redução acontece no aparelho antes de gravar, com o `canvas` que
`src/lib/utils/imagem.ts` já usa para a nota fiscal.

`ponytail:` a assinatura mora em `configuracao/geral`, que o app inteiro lê ao subir. Com 60
KB típicos isso não pesa; se um dia pesar, ela vai para um documento irmão
(`configuracao/assinatura`) que só a folha e a tela de configuração leem.

### 5. A validade é campo gravado; a emissão é o dia da impressão — `#d110`

`Pedido.validoAteISO` é a data até a qual o preço vale, e é ela que o gestor lê. É gravada
porque é um combinado, como a data de entrega: o sistema sugere hoje mais sete dias
(`DIAS_DE_VALIDADE`), ela edita, salvar grava. Sugestão não é dado (`#d17`), e um orçamento
antigo sem o campo sai sem a linha de validade, em vez de inventar uma.

A data de emissão **não** é gravada: é o dia em que a folha foi impressa. `criadoEm` mentiria
para um pedido montado na terça e enviado na sexta; um campo `emitidoEm` escrito pela
impressão seria uma escrita disparada por um botão que não é "salvar", e o Firestore não
sabe se ela cancelou o diálogo de impressão. Reimprimir uma semana depois muda a data de
emissão e mantém a validade: é o que um orçamento reimpresso deveria dizer.

---

## A folha

A referência física é a caixa da MyCookie's e o cardápio: papel creme, tinta vinho, filete
dourado, serifa quente no nome, sans na informação. **Restrained no papel, Committed num
bloco só:** o total, que é o número que decide a aprovação, é o único trecho vinho cheio da
página, do mesmo jeito que o cartão fidelidade é vinho cheio na mão. Nenhum outro fundo
colorido, nenhuma borda lateral, nenhum cartão dentro de cartão.

### O desenho

A4, margens de 16 mm nas laterais e no topo, 18 mm no pé (`@page`). Coluna útil de 178 mm.
Corpo em Figtree 10,5 pt. Tudo o que é número é `tabular-nums` e peso 600, com o `R$` menor e
em `--ink-muted`, como no painel.

```
┌──────────────────────────────────────────────────────────────────────┐
│ (cookie) MyCookie's                                       ORÇAMENTO  │
│          BISCOITOS ARTESANAIS                          P-260915-K3F  │
│                                       Emitido em 15 de setembro de 2026 │
│ ════════════════════ filete dourado, 2 px ═══════════════════════════ │
│                                                                      │
│ PARA                                   VÁLIDO ATÉ                    │
│ Tal Eventos Ltda.                      22 de setembro de 2026        │
│                                        ENTREGA PREVISTA              │
│                                        Quarta-feira, 30 de setembro  │
│                                        Av. Boa Viagem, 1200, Recife  │
│                                                                      │
│ O QUE ESTÁ INCLUÍDO                                                  │
│ PRODUTO                                  QUANTIDADE  UNITÁRIO  TOTAL │
│ ┌────┐ Cookie Tradicional                    50 un   R$ 10,00  R$ 500,00 │
│ │foto│ Massa amanteigada com gotas de                                │
│ └────┘ chocolate, recheada com brigadeiro.                           │
│ ───────────────────────────────────────────────────────────────────  │
│ ┌────┐ Cookie Red Velvet                     30 un   R$ 13,00  R$ 390,00 │
│ │foto│ Massa red velvet com chocolate branco                         │
│ └────┘ e nozes, recheada com cream cheese.                           │
│ ───────────────────────────────────────────────────────────────────  │
│ ┌────┐ Cookie Pistachio                      20 un   R$ 15,00  R$ 300,00 │
│ │foto│ Massa de pistache com chocolate branco,                       │
│ └────┘ recheada com creme de pistache.                               │
│                                                                      │
│                                              Subtotal    R$ 1.190,00 │
│                                              Desconto      −R$ 90,00 │
│                                              Entrega        R$ 40,00 │
│                                     ┌──────────────────────────────┐ │
│                                     │ TOTAL           R$ 1.140,00  │ │  ← vinho cheio
│                                     └──────────────────────────────┘ │
│                                                                      │
│ COMBINADO                                                            │
│ Pagamento por Pix. Chave: 81 98696-6176 (Maynara).                   │
│ Entrega na quarta-feira, 30 de setembro, na Av. Boa Viagem, 1200.    │
│ Este orçamento vale até 22 de setembro de 2026.                      │
│                                                                      │
│ Para aprovar, é só responder pelo WhatsApp ou assinar abaixo e       │
│ devolver esta folha.                                                 │
│                                                                      │
│ [assinatura]                          _____________________________  │
│ ______________________________        Aprovado por                   │
│ Maynara                               Nome, cargo e data             │
│ MyCookie's                                                           │
│                                                                      │
│ MyCookie's · 81 98696-6176 · @MyCookiesArtesanais                    │
│                                    Feito com amor em cada mordida.   │
└──────────────────────────────────────────────────────────────────────┘
```

Bloco a bloco:

**Cabeçalho.** À esquerda, o lockup horizontal: o `Cookie` da marca (14 mm), o nome em
Fraunces 600 a 26 pt, o descritor em caixa alta espaçada abaixo do nome. É o `Logotipo` que
existe, com um arranjo `horizontal` novo; o vertical continua sendo o da tela de acesso. À
direita, alinhado à direita: "ORÇAMENTO" em `label` caixa alta com `tracking 0.12em` em
`--ink-muted`, o código em Figtree 600 tabular a 13 pt, e "Emitido em 15 de setembro de 2026"
em `label`. Abaixo de tudo, o filete dourado: 2 px em `--gold-500`, largura inteira. É o
único dourado da folha, e é a faixa da embalagem.

**Para quem, até quando.** Duas colunas, 24 pt abaixo do filete. Esquerda: rótulo "PARA" e
o nome da empresa em Fraunces 600 a 17 pt: é o segundo maior texto da página, porque é o que
faz o documento ser deles. Direita, alinhada à direita: "VÁLIDO ATÉ" e a data por extenso em
Figtree 600; abaixo, "ENTREGA PREVISTA" (ou "RETIRADA PREVISTA") com o dia da semana e a
data, e o endereço em `--ink-muted` quando é entrega e há endereço. Sem `validoAteISO`, o
rótulo "VÁLIDO ATÉ" e a data não aparecem: zero é ausência, aqui também.

**O que está incluído.** Título de seção em `label` caixa alta espaçada em `--ink-muted`, e
uma linha de cabeçalho de colunas no mesmo estilo em `micro`. Depois, uma lista com
divisórias de 1 px em `--border` (lista, não grade de cartões): cada linha tem a miniatura
(22 mm quadrada, `object-fit: cover`, raio 8 px), o nome em Figtree 600 a 11,5 pt com as
escolhas do combo entre parênteses (a mesma função do WhatsApp), a descrição em 9,5 pt
`--ink-muted` até 2 linhas, e as três colunas numéricas alinhadas à direita: quantidade com
unidade (`50 un`; `1,5 kg` quando a ficha rende em peso), unitário e total da linha. Larguras:
22 mm · flexível · 20 mm · 26 mm · 30 mm. Uma linha nunca quebra entre páginas
(`break-inside: avoid`).

Sem foto, o quadrado fica em `--surface-sunken`, sem ícone: o cookie da marca é marca d'água
de estado vazio, e cinco cookies enfileirados numa folha seriam um padrão. Se **nenhuma**
linha tem foto, a coluna some inteira e o texto começa na margem.

**Totais.** Pilha alinhada à direita, 80 mm de largura. `Subtotal`, `Desconto` (com o sinal de
menos, e só se houver) e `Entrega` (só se houver) em `body`, rótulo em `--ink-muted` e valor
em `--ink`. Abaixo, o **bloco do total**: fundo `--wine-700`, raio 10 px, 12 pt de respiro
interno, "TOTAL" em `--on-wine-muted` caixa alta à esquerda e o valor em Fraunces 600 a 22 pt
em `--on-wine` à direita. É o único trecho da folha que precisa de `print-color-adjust:
exact`, e ele o declara. O bloco também não quebra entre páginas.

**Combinado.** Três frases curtas, uma por linha, em `body`, cada uma só se houver o que
dizer: o pagamento (o nome da forma, mais as `instrucoes` quando existem, do mesmo jeito que
o `#d98` as põe no WhatsApp); a entrega ou a retirada, com a data e o endereço; e a validade
por extenso. Abaixo, com um respiro, a frase de aceite: "Para aprovar, é só responder pelo
WhatsApp ou assinar abaixo e devolver esta folha." É o que transforma a folha em ação.

**Assinaturas.** Duas colunas de 70 mm, com 24 pt entre elas, coladas ao fim do conteúdo (e
não ao pé da página: uma folha de três itens não deve ter um vão de 15 cm antes da
assinatura). Esquerda: a imagem da assinatura, quando existe, com no máximo 60 × 20 mm em
`object-fit: contain` apoiada na linha; a linha de 0,5 pt em `--border-strong`; o nome da
dona (`Conta.proprietaria`) em Figtree 600; o nome do negócio em `--ink-muted`. Sem imagem,
a linha e o nome ficam: um nome sobre uma linha ainda é uma assinatura, e a tela de
configuração convida a desenhá-la. Direita: a mesma linha, vazia, com "Aprovado por" em
Figtree 600 e "Nome, cargo e data" em `--ink-subtle`. O bloco inteiro não quebra entre páginas.

**Rodapé.** Uma linha em `micro`, `--ink-muted`, no pé da última página: o nome do negócio,
o telefone e o Instagram separados por `·`, os dois últimos só quando preenchidos; à direita,
"Feito com amor em cada mordida." A frase é da embalagem e mora em `Marca.tsx`, ao lado do
descritor "Biscoitos artesanais": as duas são marca, e o dia em que houver segunda conta
elas saem juntas para a configuração.

### O que não está na folha, de propósito

Custo, lucro, taxa da maquininha, `custoUnitarioSnapshot`, `observacoes` do pedido e
`observacao` de item. Os quatro primeiros são da Maynara. Os dois últimos são o `#d79` de
novo: campo de dono misto não se reenvia para a cliente, e uma empresa muito menos.

### Na tela, antes de imprimir

A rota `/pedidos/[id]/orcamento` mostra a folha como um papel: 210 mm de largura, altura
mínima de 297 mm, centralizada no `--canvas`, com `--shadow-raised`. Acima dela, uma barra
com dois destinos e nada mais: "Voltar ao pedido" (secundário, `ArrowLeft`) e **"Salvar em
PDF"** (primário, 52 px no celular, `Printer`), que chama `window.print()`. A barra explica
o caminho em uma linha em `label`: "Abre a impressão do aparelho. Escolha 'Salvar como PDF'."

A folha **fixa os tokens claros**, no tema escuro também: papel não tem modo noturno, e a
prévia precisa ser o que vai sair. A classe `.folha`, em `globals.css`, redeclara dentro dela
os tokens que a folha usa (`--mc-canvas`, `--mc-surface`, `--mc-surface-sunken`, `--mc-ink`,
`--mc-ink-muted`, `--mc-ink-subtle`, `--mc-border`, `--mc-border-strong`) com o valor claro,
e `color-scheme: light`. Nenhum valor de cor entra em componente.

Em tela estreita, a folha **encolhe para caber**: `zoom` calculado pela largura do contêiner
sobre 794 px, medido uma vez por `ResizeObserver`. Na impressão, `zoom: 1` e A4 de verdade.
Uma prévia com rolagem horizontal seria a alternativa de zero linhas, e ela mente sobre o que
vai sair.

Quando `validoAteISO` já passou, a barra ganha uma frase com `TriangleAlert` em
`--attention`: "Este orçamento venceu em 22 de setembro. Atualize a validade no pedido antes
de mandar." A folha não muda: o aviso é para ela, não para a empresa.

---

## Escopo da 17A · A folha

### 1. `src/lib/types/vendas.ts` — um campo

```ts
/**
 * Até quando o preço deste orçamento vale, no fuso do aparelho. Gravado
 * porque é combinado, como a data de entrega; ausente em pedido feito antes
 * da spec 017 ou que nunca foi orçamento (`DECISOES.md#d110`).
 */
validoAteISO?: DataISO;
```

`DadosPedido.validoAteISO?: DataISO` em `mutations/pedidos.ts`, gravado por **spread
condicional** em `criarPedido` e `atualizarPedido`, como `notaChave` (`#d54`): ausente não
apaga o que está lá. `esquemaPedido` ganha `validoAteISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`.
Só a forma: validade no passado é aviso na tela, não erro de validação, porque orçamento
vencido é um fato que ela precisa poder salvar.

### 2. `src/lib/domain/datas.ts` — uma função

```ts
/** '2026-09-15' → '15 de setembro de 2026'. Documento precisa de ano. */
export function rotuloDataCompleta(iso: DataISO): string;
```

`rotuloDiaPorExtenso` continua sem ano, porque a agenda e o WhatsApp são desta semana.

### 3. `src/lib/domain/orcamento.ts` — o módulo novo

Puro, sem Firebase, sem React. É aqui que mora tudo o que pode dar errado, e por isso é aqui
que o teste chega.

```ts
export const DIAS_DE_VALIDADE = 7;

/** hoje + DIAS_DE_VALIDADE, com `diaVizinho`. */
export function validadeSugerida(hojeISO: DataISO): DataISO;

export type SituacaoDaValidade =
  "sem-prazo" | "valido" | "vence-hoje" | "vencido";
export function situacaoDaValidade(
  validoAteISO: DataISO | undefined,
  hojeISO: DataISO,
): SituacaoDaValidade;

export interface LinhaDoOrcamento {
  /** `nomeSnapshot` com as escolhas do combo entre parênteses. */
  nome: string;
  /** Da ficha viva; ausente em ficha arquivada ou sem descrição (`#d108`). */
  descricao?: string;
  fotoUrl?: string;
  quantidade: number;
  /** 'un', 'porção', 'g', 'ml', da ficha viva; 'un' quando a ficha se foi. */
  unidade: string;
  precoUnitario: Centavos;
  /** `subtotalDoItem`, a mesma função do rodapé e do WhatsApp. */
  subtotal: Centavos;
}

export interface Orcamento {
  negocio: {
    nome: string;
    proprietaria: string;
    telefone?: string;
    instagram?: string;
    assinaturaDataUrl?: string;
  };
  codigo: string;
  emitidoEmISO: DataISO;
  validoAteISO?: DataISO;
  empresa: string;
  linhas: LinhaDoOrcamento[];
  temFoto: boolean;
  subtotal: Centavos;
  desconto: Centavos;
  taxaEntrega: Centavos;
  total: Centavos;
  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    dataISO: DataISO;
    endereco?: string;
  };
  formaNome?: string;
  formaInstrucoes?: string;
}

/** Tudo o que a folha desenha, montado de uma vez. */
export function montarOrcamento(entrada: {
  pedido: Pedido;
  fichas: FichaTecnica[];
  conta: Conta;
  configuracao: ConfiguracaoGeral | null;
  hojeISO: DataISO;
}): Orcamento;

/** As frases do bloco "Combinado", na ordem, só as que têm o que dizer. */
export function frasesDoCombinado(orcamento: Orcamento): string[];
```

`nomeComEscolhas` sai de `whatsapp.ts` e vira exportada: é a mesma frase, e duas seriam duas
ordens esperando para divergir. Nada mais muda lá. Na 17A, `telefone`, `instagram` e
`assinaturaDataUrl` de `negocio` são sempre `undefined`, e `descricao` e `fotoUrl` das
linhas também: os campos nascem na 17B, e a função já os lê para a 17B não precisar
reabrir o domínio.

### 4. `src/components/pedidos/BlocoOrcamento.tsx` — o bloco

Um `Bloco` como os outros, ícone `FileText`, **logo acima do `BlocoWhatsApp`**, dentro do
mesmo `{pedido && …}`: o orçamento vem antes da confirmação na ordem em que a venda acontece.

- **Título:** "Orçamento para empresa".
- **Descrição:** "Uma folha com o logotipo, o que está incluído e a assinatura, pronta para
  virar PDF."
- **Campo "Válido até"**, `<input type="date">` nativo dentro de `EnvelopeCampo`, com
  `min` em hoje. Aparece em qualquer status, porque um orçamento confirmado continua tendo
  a validade que teve. Vazio, o campo nasce com `validadeSugerida(hoje)` **só enquanto o
  status é `ORCAMENTO`**: pedido confirmado sem validade fica sem, e o campo fica vazio.
  Abaixo do campo, a situação em uma linha, com ícone: `vence-hoje` e `vencido` em
  `--attention` com `TriangleAlert` ("Venceu em 22 de setembro. Escolha uma data nova antes de
  mandar."), `valido` em `--ink-muted` sem ícone ("Vale por mais 7 dias.").
- **A ação é um `Link`** para `/pedidos/${pedido.id}/orcamento`, com
  `classesBotao({ variante: "primaria", tamanho: "lg" })` e `FileText`. **Não** abre em
  nova aba: a prévia é uma tela do app, e "Voltar ao pedido" é o caminho de volta.
- **Uma linha embaixo:** "A folha mostra o que está salvo. Salve o pedido antes de abrir."
  É o `#d107` dito em voz alta, e não uma trava: o formulário não sabe se está sujo, e
  ensinar isso a ele é a dívida de "sair sem salvar" que já está na tabela.
- **Sem itens**, o link não aparece e sobra: "Adicione o que a empresa pediu. A folha
  precisa ter o que orçar."

### 5. `src/components/pedidos/FolhaOrcamento.tsx` e a rota

- `src/app/(app)/pedidos/[id]/orcamento/page.tsx`, `metadata.title: "Orçamento"`, entrega o
  `id` para `TelaOrcamento`.
- **`TelaOrcamento`** carrega o pedido pelo id (`docPedido`), as fichas vivas (`colFichas`,
  `arquivado == false`, sem `orderBy`: a ordem é a do pedido), a configuração
  (`docConfiguracao`) e a conta (`useAuth().conta`), e só então monta: a mesma separação do
  `EditorPedido`. Pedido que não existe cai no mesmo `EstadoVazio` do editor ("Este pedido
  não está aqui"). `hoje` nasce uma vez, com `useState(() => dataISODe(new Date()))`.
- **`FolhaOrcamento`** recebe um `Orcamento` e desenha a folha da seção acima. Só
  apresentação: nenhum hook, nenhuma conta.
- **A barra** de "Voltar ao pedido" e "Salvar em PDF", e o aviso de validade, ficam em
  `TelaOrcamento`, fora da `.folha`, com `print:hidden`.

### 6. `src/app/globals.css` — a folha e a impressão

- `@utility folha`: os tokens claros redeclarados, `color-scheme: light`, `print-color-adjust:
exact` e `-webkit-print-color-adjust: exact`, `width: 210mm`, `min-height: 297mm`,
  `padding: 16mm 16mm 18mm`.
- `@media print`: `@page { size: A4; margin: 0 }` (a margem é o `padding` da folha, para a
  folha ser a mesma coisa na tela e no papel); `html, body { background: white }`;
  `.textura-papel { background-image: none }`; `.folha { box-shadow: none; zoom: 1 }`.
- `break-inside: avoid` nas linhas de item, no bloco de totais e no bloco de assinaturas
  entra como classe do Tailwind (`break-inside-avoid`), sem CSS novo.

### 7. `src/components/layout/AppShell.tsx` e `Marca.tsx`

- `BarraLateral` e `NavegacaoInferior` ganham `print:hidden`; o `main` ganha
  `print:max-w-none print:p-0`. Quatro classes, nenhum comportamento em tela muda.
- `Logotipo` ganha `orientacao?: "vertical" | "horizontal"`, com `vertical` como padrão e
  o comportamento de hoje intacto. `Marca.tsx` exporta `DESCRITOR` e `SLOGAN` como
  constantes, e `Logotipo` passa a ler `DESCRITOR` em vez do literal.

### 8. Testes: `tests/domain/orcamento.test.ts`

O caso de aceite abaixo, número por número, mais as bordas. Cerca de vinte casos.

---

## Escopo da 17B · A foto, a descrição, o contato e a assinatura

### 1. `src/lib/types/fichas.ts` — um campo, e um que ganha escrita

```ts
/**
 * Como ela apresenta o produto para quem compra: duas frases, no máximo 240
 * caracteres. Vai na folha do orçamento (spec 017). Ausente em ficha que
 * nunca escreveu; `modoPreparo` é para dentro, esta é para fora.
 */
descricao?: string;
```

`fotoUrl` não muda de tipo, e o comentário dele passa a dizer o que ele carrega: um `data:`
URL de JPEG com até 320 px de lado e 80 KB, gravado pelo editor (`#d109`). `DadosFicha`
ganha `descricao?: string` e `fotoUrl?: string | null`, onde `null` é "tirar a foto"
(`deleteField()` na escrita, como todo campo opcional que se apaga). `esquemaFicha` ganha
`descricao: z.string().trim().max(240, "Duas frases bastam: até 240 caracteres.").optional()`.

### 2. `src/lib/types/configuracao.ts` — dois campos

```ts
/** O que a empresa vê no rodapé da folha (spec 017). Nada disso é obrigatório. */
contato?: { telefone?: string; instagram?: string };
/**
 * A assinatura dela, PNG com fundo transparente ou foto da assinatura em papel,
 * até 720 px de lado e 200 KB, como `data:` URL (`DECISOES.md#d109`). Vai
 * sobre a linha da folha; sem ela, o nome sobre a linha é a assinatura.
 */
assinaturaDataUrl?: string;
```

`DadosConfiguracao` e `salvarConfiguracao` acompanham, por spread condicional.
`esquemaConfiguracao` ganha os dois, opcionais; o Instagram guarda o que ela digitar e a
folha tira o `@` na leitura, para não brigar com quem digita com e quem digita sem.

### 3. `src/lib/utils/imagem.ts` — a redução vira reutilizável

```ts
export interface OpcoesDeReducao {
  ladoMaximo: number;
  formato: "image/jpeg" | "image/png";
  /** Só para JPEG. */
  qualidade?: number;
}

/** A imagem reduzida, como `data:` URL. Lança se o navegador não souber desenhá-la. */
export async function reduzirImagem(
  arquivo: File,
  opcoes: OpcoesDeReducao,
): Promise<string>;
```

`prepararParaLeitura` passa a chamá-la com `{ ladoMaximo: LADO_MAXIMO_PX, formato:
"image/jpeg", qualidade: QUALIDADE_JPEG }` e continua devolvendo o mesmo par
`{ mimeType, dados }` sem prefixo: nenhum comportamento da nota muda. O fundo branco é
pintado **só em JPEG**: PNG preserva a transparência, que é o motivo de a assinatura ser
PNG. Os dois tetos e os dois lados moram em `domain/orcamento.ts`
(`FOTO_LADO_PX = 320`, `FOTO_MAX_BYTES = 80_000`, `ASSINATURA_LADO_PX = 720`,
`ASSINATURA_MAX_BYTES = 200_000`), com `tamanhoDoDataUrl(url)` ao lado, puro e testado.

### 4. `FormularioFicha.tsx` — dois campos no bloco "O produto"

- **"Como você apresenta"**: `textarea` de 2 linhas abaixo da categoria, `EnvelopeCampo`
  com a dica "Vai na folha do orçamento. Duas frases: o que é, o que tem dentro." e o
  contador `128/240` em `micro` quando passa de 200.
- **"Foto"**: um `<input type="file" accept="image/*">` escondido atrás de um botão
  secundário "Escolher foto" (sem `capture`: a foto boa está na galeria, feita com luz), a
  prévia de 96 px quadrada com raio 10 px ao lado, e "Tirar a foto" como terciário quando há
  foto. Escolher chama `reduzirImagem` com `FOTO_LADO_PX` e JPEG 0,8, confere o teto, e
  guarda o `data:` URL no estado do formulário; salvar grava. Acima do teto, a frase de
  erro com ícone: "Essa imagem ficou pesada demais. Tente outra, ou recorte só o produto."
  Formato que o navegador não desenha cai na mesma frase.

Nenhuma outra tela lê `fotoUrl` nesta spec: `/fichas` continua lista com divisórias, sem
miniatura, e o motivo está em "Fora de escopo".

### 5. `TelaConfiguracao.tsx` — o bloco "Na folha do orçamento"

Um `BlocoConfiguracao` novo, o sexto, **entre "Formas de pagamento" e "Preço padrão"**,
ícone `FileText`, descrição "O que a empresa vê no rodapé e na assinatura da folha." Três
campos: "Telefone" (`type="tel"`), "Instagram" (com `@` fixo como prefixo, do mesmo jeito que
`R$` no campo monetário), e "Assinatura", com o mesmo par botão-prévia da foto da ficha:
"Escolher imagem", prévia de 200 × 64 px em `object-fit: contain` sobre `--surface-sunken`,
"Tirar". A dica: "Uma imagem PNG com fundo transparente fica melhor. Uma foto da assinatura
em papel branco também serve." `reduzirImagem` com `ASSINATURA_LADO_PX` e PNG, teto de
200 KB, a mesma frase de erro.

A assinatura vai na mesma escrita que o resto da configuração (`#d17`: uma leitura, uma
escrita). A frase de status do rodapé ("Você mudou…") já cobre o bloco novo sem código.

### 6. `FolhaOrcamento.tsx` — a folha aprende a mostrá-los

`montarOrcamento` já lê os campos desde a 17A. O que muda é só apresentação: a miniatura
aparece quando `fotoUrl` existe, a coluna aparece quando `temFoto`, a descrição entra abaixo
do nome, o telefone e o Instagram entram no rodapé, a imagem da assinatura entra sobre a
linha. Zero mudança de rota, de domínio e de bloco.

### 7. Testes

`tests/domain/orcamento.test.ts` ganha: linha com descrição e foto; linha de ficha arquivada
sem os dois; `temFoto` verdadeiro com uma foto só; `tamanhoDoDataUrl` nos dois lados do teto;
Instagram com e sem `@`.

---

## Caso de aceite

**O pedido da Tal Eventos Ltda.**, código `P-260915-K3F`, hoje é 15/09/2026:

| Linha                                       | Quantidade | Unitário | Total           |
| ------------------------------------------- | ---------- | -------- | --------------- |
| Cookie Tradicional                          | 50 un      | R$ 10,00 | R$ 500,00       |
| Cookie Red Velvet                           | 30 un      | R$ 13,00 | R$ 390,00       |
| Cookie Pistachio                            | 20 un      | R$ 15,00 | R$ 300,00       |
| Subtotal                                    |            |          | R$ 1.190,00     |
| Desconto                                    |            |          | −R$ 90,00       |
| Entrega em 30/09/2026, Av. Boa Viagem, 1200 |            |          | R$ 40,00        |
| **Total**                                   |            |          | **R$ 1.140,00** |

Forma "Pix", com `instrucoes` "Chave: 81 98696-6176 (Maynara)". `validoAteISO` `2026-09-22`.

O teste de `montarOrcamento` confere cada número da tabela, o `emitidoEmISO` igual a hoje, o
`codigo`, a `empresa`, e `frasesDoCombinado` devolvendo **exatamente** as três frases da seção
"A folha", na ordem.

Casos que acompanham, cada um mudando uma coisa só:

1. **`validadeSugerida("2026-09-15")`** é `"2026-09-22"`; na virada do mês, `"2026-09-28"` dá
   `"2026-10-05"`.
2. **`situacaoDaValidade`**: `undefined` é `sem-prazo`; amanhã é `valido`; hoje é
   `vence-hoje`; ontem é `vencido`.
3. **Sem desconto e sem entrega:** `desconto` e `taxaEntrega` zerados, e `frasesDoCombinado`
   sem a frase da validade quando `validoAteISO` está ausente.
4. **`RETIRADA`:** a frase vira "Retirada na quarta-feira, 30 de setembro.", sem endereço,
   mesmo com o campo preenchido.
5. **Sem forma de pagamento:** a frase do pagamento some. Com forma e sem `instrucoes`:
   "Pagamento por Pix." e nada mais.
6. **Combo:** `nome` é "Combo dupla (1 Tradicional, 1 Red Velvet)", o mesmo texto do WhatsApp.
7. **Ficha arquivada** (fora da lista de fichas vivas): a linha sai com o `nomeSnapshot`, sem
   `descricao`, sem `fotoUrl` e com unidade `'un'`.
8. **Ficha que rende em peso:** `unidade` é `'kg'` para `unidadeRendimento: "g"` com
   quantidade `1.5`, e a quantidade em texto usa vírgula (`quantidadeEmTexto`).
9. **Configuração ausente** (`null`): `formaNome` e `formaInstrucoes` ausentes, `negocio.nome`
   vem de `conta.nome`, e nada lança.
10. **`rotuloDataCompleta`**: `"2026-09-05"` → `"5 de setembro de 2026"`, sem zero à esquerda.

> **Cuidado que já custou tempo:** `formatarMoeda` devolve o `R$` com espaço fino
> não-quebrável (U+00A0). Expectativa de teste se monta com `formatarMoeda`, e nunca digitada
> à mão (spec 010).

---

## Roteiro de aparelho

O que `npm test` não alcança: o PDF de verdade, nos três sistemas.

1. **Desktop, Chrome, tema claro.** Abrir o pedido da conta real que virou orçamento, escolher
   a validade, salvar, "Orçamento para empresa" → a prévia. Ctrl+P: **uma página**, sem barra
   lateral, sem navegação, sem a barra de botões, com o bloco do total em vinho cheio mesmo
   com "Gráficos de fundo" desmarcado. "Salvar como PDF" e abrir o arquivo: Fraunces no nome e
   no total, Figtree no resto, texto selecionável.
2. **Tema escuro.** A prévia continua creme e a folha é idêntica à do passo 1. O PDF também.
3. **Android, app instalado.** Menu do sistema → Compartilhar → Imprimir → Salvar como PDF. O
   mesmo PDF do passo 1. Se `window.print()` não abrir nada no modo `standalone`, abrir o
   mesmo endereço no Chrome: é o risco nomeado abaixo.
4. **iPhone, Safari.** Compartilhar → Opções → PDF, ou Imprimir e beliscar a prévia. O
   mesmo PDF.
5. **Validade vencida.** Voltar a data para ontem, salvar, abrir a prévia: o aviso com o
   triângulo na barra, e a folha sem aviso nenhum.
6. **Doze itens.** As linhas passam para a segunda página sem uma linha partida ao meio; os
   totais e as assinaturas não se separam; o rodapé está no pé da última.
7. **Celular, 360 px.** A prévia cabe na largura, sem rolagem horizontal, legível.
8. **Só na 17B:** uma ficha com foto e outra sem, no mesmo pedido: as duas linhas têm o
   quadrado, o segundo vazio em `--surface-sunken`. Pedido só de fichas sem foto: a coluna
   some. Assinatura PNG transparente sobre a linha, sem retângulo branco.

---

## Critérios de aceite

**17A**

- [x] `Pedido.validoAteISO` gravado por `criarPedido` e `atualizarPedido`, ausente não apaga.
- [x] `domain/orcamento.ts` com `montarOrcamento`, `frasesDoCombinado`, `validadeSugerida`
      e `situacaoDaValidade`, e o caso de aceite número por número em
      `tests/domain/orcamento.test.ts`.
- [x] `rotuloDataCompleta` em `datas.ts`, com teste.
- [x] `BlocoOrcamento` no editor, com o campo de validade, a situação e o link.
- [x] `/pedidos/[id]/orcamento` desenha a folha da seção "A folha", com a barra, o aviso de
      vencido e a prévia encolhendo em tela estreita.
- [x] `.folha` em `globals.css` fixa os tokens claros; nenhum valor de cor em componente.
- [x] `AppShell` some na impressão; nenhuma tela em modo normal muda um pixel.
- [ ] Os passos 1 a 7 do roteiro passam.
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d106` a `#d110` escritos; `ESTADO.md`
      atualizado, com a rota nova na contagem do build.

**17B**

- [ ] `FichaTecnica.descricao` e `fotoUrl` escritos pelo editor de ficha, com os tetos.
- [ ] `ConfiguracaoGeral.contato` e `assinaturaDataUrl` escritos pela configuração.
- [ ] `reduzirImagem` em `imagem.ts`, com `prepararParaLeitura` devolvendo o mesmo de antes.
- [ ] A folha mostra foto, descrição, contato e assinatura, e degrada sem cada um deles.
- [ ] O passo 8 do roteiro passa.
- [ ] Portão de conclusão, `ESTADO.md`, e nenhuma decisão nova (as cinco são da 17A).

---

## Fora de escopo

- **Biblioteca de PDF e rota de servidor.** Decisão 1. Se o caminho do iPhone doer, é spec
  própria, e a folha continua a mesma.
- **Mandar a folha por WhatsApp ou e-mail de dentro do app.** O PDF é arquivo do aparelho;
  ela anexa onde quiser. `navigator.share` com arquivo é o conserto quando a bandeja nativa
  valer a pena, e não está aqui.
- **CNPJ, razão social, endereço da empresa, "aos cuidados de".** `clienteNome` é a empresa.
  Quando um setor de compras exigir o CNPJ na folha, nasce `Cliente.documento`, e ele vem
  junto da tela de clientes que a tabela de dívidas já pede.
- **Prazo de pagamento** ("30 dias após a entrega") e **parcelas.** A forma de pagamento diz
  como; quando "quando" virar pergunta real, entra como campo do pedido.
- **Miniatura em `/fichas` e no editor de pedido.** A lista é lista com divisórias, e uma
  coluna de fotos a transforma em catálogo. Quando ela pedir para ver a foto ao escolher o
  item, é uma linha em `LinhaItemPedido`.
- **Registrar que o orçamento foi enviado** ou **aprovado pela folha.** Aprovar é mudar o
  status para `CONFIRMADO`, que já existe. Um campo `enviadoEm` escrito por um botão de
  imprimir é o mesmo erro do `#d77`.
- **Observações do pedido e do item na folha.** `#d79`.
- **Numeração sequencial de orçamento** ("Orçamento nº 0042"). `#d31`: é `codigo`.
- **Segunda coisa impressa** (ficha, recibo, lista de compras). O `print:hidden` no shell fica
  pronto para isso, e nenhum segundo uso entra aqui.
- **Firebase Storage.** Decisão 4.
- **Qualquer mudança em `derivarPedido`, no caixa, na agenda, na lista de compras, em regra
  de segurança ou em índice.** Zero.

---

## Decisões desta spec que são fáceis de rejeitar

- **Imagem dentro do documento do Firestore.** Quem já viu um documento de 900 KB travar uma
  consulta tem razão de desconfiar. Os tetos são a resposta, e o `ponytail:` do `#d109` diz
  para onde a assinatura vai se pesar. A foto de 20 KB em cinquenta fichas é 1 MB de cache,
  o mesmo que um mês de pedidos.
- **A folha lê o gravado, e o resumo do WhatsApp lê a tela.** Dois blocos vizinhos com duas
  regras. O `#d107` explica: um é conversa, o outro é documento assinado. Se incomodar, o
  conserto é o do `#d78`: o link salva antes de abrir.
- **Data de emissão é o dia da impressão.** Reimprimir muda a data. É o que um orçamento
  reimpresso deveria fazer, mas quem quiser a data original tem `criadoEm`, e o argumento
  contrário é real.
- **`window.print()` no iPhone.** Quatro toques até o PDF. É o custo da decisão 1, e o passo 4
  do roteiro é onde ele se mede.
- **Foto e descrição vivas, e não congeladas.** `#d108`. Se um dia a descrição virar promessa
  contratual ("sem glúten"), ela vira snapshot no item, com a mesma justificativa do preço.

---

## Riscos

- **`window.print()` no PWA instalado do Android.** O Chrome em modo `standalone` abre o
  diálogo de impressão, mas isso nunca foi visto neste projeto. O passo 3 do roteiro é quem
  responde; falhando, a barra ganha "Abrir no navegador" e a spec registra.
- **Fundos na impressão.** Sem `print-color-adjust: exact`, o bloco do total sai branco com
  texto creme, ilegível. A classe `.folha` o declara, e o passo 1 confere com "Gráficos de
  fundo" desmarcado de propósito.
- **`zoom` em CSS.** É propriedade de todo navegador desde 2024 (Firefox 126), mas a prévia
  encolhida nunca foi vista aqui. Se ficar borrada num aparelho, `transform: scale` com
  `transform-origin: top left` e a altura do contêiner ajustada é o plano B, e o passo 7 é
  onde se decide.
- **Tema escuro vazando para a folha.** Os tokens são redeclarados em `.folha`, mas qualquer
  classe `dark:` dentro dela passaria por cima. A regra: **nenhuma classe `dark:` dentro de
  `FolhaOrcamento`**, e o passo 2 é a prova.
- **A descrição pode ficar longa demais para duas linhas.** O `max(240)` é o teto e o
  `line-clamp-2` é a rede; uma descrição cortada na folha é feia mas não é errada.
- **O texto da folha vai direto para uma empresa** sem passar por ninguém. É por isso que
  `frasesDoCombinado` é comparada inteira no teste, como a mensagem da 010.

---

## Aprovações pedidas

1. **Cinco campos opcionais de schema**, todos compatíveis com documento antigo:
   `Pedido.validoAteISO` (17A); `FichaTecnica.descricao`, `ConfiguracaoGeral.contato` e
   `ConfiguracaoGeral.assinaturaDataUrl` (17B). `FichaTecnica.fotoUrl` já existe e passa a
   ser escrito.
2. **Imagem como `data:` URL no documento**, com tetos de 80 KB (foto) e 200 KB
   (assinatura). Decisão 4.
3. **O texto da folha, palavra por palavra:** os rótulos, as três frases do "Combinado", a
   frase de aceite, "Aprovado por" e "Nome, cargo e data", e o rodapé com o slogan da
   embalagem. É o bloco "A folha" acima. É a primeira coisa que o projeto produz com o nome
   da MyCookie's em cima para uma empresa ler.
4. **Edição em código que funciona:** `Logotipo` ganha orientação horizontal (padrão
   intacto), `AppShell` ganha quatro classes `print:`, `nomeComEscolhas` vira exportada,
   `prepararParaLeitura` passa a chamar `reduzirImagem` (mesmo resultado, coberto pelo
   roteiro da nota).

Nenhuma dependência entra, nenhuma regra de segurança muda, nenhum índice novo é preciso, e
`src/lib/domain/` continua sem Firebase e sem React.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o número de
testes crescendo (cerca de vinte na 17A, cinco na 17B) e **uma rota nova** na lista do build
(`/pedidos/[id]/orcamento`, dinâmica). Depois: `docs/ESTADO.md` atualizado e `#d106` a
`#d110` em `docs/DECISOES.md`.

O roteiro de aparelho fecha o que o teste não alcança: que o PDF sai, nos três sistemas, com
a cara da marca. São oito passos, e os três primeiros são os que decidem se a decisão 1
estava certa.
