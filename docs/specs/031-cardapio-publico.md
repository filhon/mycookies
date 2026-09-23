# Spec 031 · Cardápio público com link de pedido

**Tipo:** a segunda spec da fase 3 do `docs/saas/ROADMAP.md`, e o primeiro pedaço do Rende que
alguém de fora do negócio abre. Um link que a confeiteira põe na bio do Instagram e manda no
WhatsApp; quem abre vê os produtos que ela escolheu, com foto e preço, monta o pedido e manda. O
pedido cai em `/pedidos` como orçamento, e a conversa continua onde sempre esteve: no WhatsApp.
**Tamanho:** duas sessões, mais três (C, D, E) acrescentadas depois. A **A** é a vitrine — o tipo, o domínio, o painel "Seu cardápio" em
`/configuracao`, a página `/c/{contaId}` só de leitura e a rota da foto. A **B** é o pedido — o
formulário da página, `POST /api/cardapio/pedido`, o aviso no WhatsApp e o selo "Pelo cardápio"
no app dela. **A pode sair sozinha**: uma vitrine com "Falar no WhatsApp" já é um cardápio; a B
acrescenta o carrinho sem jogar fora nada da A. Depois da B vêm três sessões acrescentadas em
2026-09-23 (seção 4): a **C** põe os combos na página com a economia à vista, a **D** mostra
quantas unidades restam do que ela marcou como limitado, e a **E** abre a promoção com prazo.
Na ordem C, D, E; cada uma sai sozinha depois da anterior.
**Origem:** roadmap, fase 3, 031, e `docs/saas/CLAUDE.md` §4 ("catálogo público com link de
pedido" como upsell natural). O gatilho de lá é **cliente pagante pedindo**, e ele não aconteceu:
esta spec está escrita antes do caso, como a 030 esteve. Quem abrir esta spec para codificar
confere primeiro se "dá para eu mandar um link com meus produtos?" já foi perguntado por alguém
que paga. Se não foi, fecha o arquivo. As sessões C a E vêm de um pedido de quem conduz o
projeto, em 2026-09-23: escassez de verdade, promoção com prazo e combo com a vantagem à vista.
**Depende de:** a 017 (foto e descrição do produto, `ConfiguracaoGeral.contato`), a 010
(`telefoneParaWhatsApp`, `linkDoWhatsApp`), a 028 (`situacaoDaConta`, `ocultarFeitoCom`), a 029
(`status: "ENCERRADA"`) e a 030 (`ehDona` e a configuração só da dona). Tudo codificado.
**Aprovações pedidas:** (1) **schema aditivo** — `ConfiguracaoGeral.cardapio` e
`Pedido.origem`, os dois opcionais; nada muda de forma em documento gravado; (2) **a primeira
rota que escreve sem login** — `POST /api/cardapio/pedido`, com Admin SDK, só em
`contas/{id}/pedidos` (seção 1, `#d160` e `#d161`); (3) **o que sai para fora**, campo por campo
(seção 1, `#d158`); (4) nenhuma regra de segurança muda, nenhuma dependência entra — **e isso é
diferente do que o roadmap previa**, que pedia aprovação para "a primeira regra pública do
sistema" (`#d158`); (5) nas sessões C a E, **mais schema aditivo** — `cardapio.limitados` e
`cardapio.promocoes`, opcionais, e `escolhas` opcional no corpo do pedido público — e **mais o
que sai para fora**: o nome das receitas que servem a um combo, quantas restam de um produto
limitado e a promoção (seção 4).
**Decisões a registrar:** `#d158` (o cardápio é lido pelo servidor, e a regra continua sem nada
público), `#d159` (o cardápio é escolha dela, e mora na configuração), `#d160` (o pedido do
cardápio nasce orçamento, com o preço do servidor), `#d161` (o freio é um teto de orçamentos em
aberto, e não um captcha), `#d162` (a foto sai por rota própria, e não dentro da página). Nas
sessões C a E: `#d163` (a economia do combo é contra o preço que a própria página cobra),
`#d164` ("restam" é o pote menos o que os pedidos levam, e o servidor trava), `#d165` (a
promoção desconta do preço de sempre e tem dia para acabar).

---

## Problema

Hoje a cliente da Maynara pede assim: manda "oi, tem cookie?" no WhatsApp, a Maynara manda a
foto do cardápio impresso (ou uma lista digitada de cabeça, com o preço do mês passado), a
cliente escolhe, pergunta de novo o preço de um, escolhe outra data, e no fim a Maynara abre o
Rende e **digita tudo outra vez** em `/pedidos`. São três cópias do mesmo cardápio — o papel, a
cabeça dela e as fichas — e só uma delas tem o preço certo.

O Rende já sabe tudo o que um cardápio precisa, e sabe melhor que o papel:

1. **O preço de verdade.** `precificacao.precoVenda` é o preço que ela decidiu, gravado, e muda no
   dia em que ela muda.
2. **A cara do produto.** `fotoUrl` e `descricao` existem desde a 017, escritos para a folha do
   orçamento — "como você apresenta o produto para quem compra".
3. **O contato.** `ConfiguracaoGeral.contato` (telefone, Instagram) e `frase`, também da 017 e da 033.
4. **O lugar do pedido.** `status: "ORCAMENTO"` é exatamente "a cliente pediu, eu ainda não
   confirmei". O pedido que chega pelo link é um orçamento como qualquer outro; ela confirma,
   ajusta a entrega e responde pelo `BlocoWhatsApp` que já existe.

O que falta é uma porta para quem não tem login. E essa porta é o risco desta spec: até aqui,
**nada no Rende é lido nem escrito por quem não entrou**. A regra do Firestore diz isso na
primeira linha ("Regra de ouro: NADA fora de contas/{contaId}"), e as rotas de servidor todas
conferem token. Esta spec abre duas coisas, e só duas: ler o cardápio que ela publicou, e criar
um orçamento na conta dela.

**O que esta spec entrega:** a dona escolhe os produtos, abre o cardápio e copia o link; a
cliente abre no celular, vê os produtos por categoria com foto, descrição e preço, escolhe as
quantidades, diz nome, WhatsApp, data e se retira ou recebe, e manda; o pedido aparece em
`/pedidos` com o selo "Pelo cardápio", e a cliente sai com um botão que avisa a dona no WhatsApp.

**O que as sessões C a E acrescentam:** o combo na página, com "separados sairia R$ 69,00" ao
lado do preço dele e a tela de escolha do combo à escolha; "Restam 8" e "Esgotado" nos produtos
que ela marcar como limitados, contados do pote; e o preço de promoção riscando o de sempre, com
o dia em que acaba.

**O que esta spec não entrega:** pagamento pela página, taxa de entrega calculada, dias e
horários de funcionamento, venda por peso na página, endereço bonito (`/c/mycookies` para toda
conta), a cliente acompanhando o pedido depois de mandar, e promoção contra um preço que ela não
pratica. Está tudo em "Fora de escopo", com o porquê.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra**, para a dona, **uma linha** na prateleira do fim de `/configuracao` ("Seu cardápio"),
  ao lado de "Quem te ajuda", com a legenda "Fechado" até ela abrir. Nenhum campo no editor de
  produto, nenhum cartão na tela Hoje, nenhuma faixa: quem está começando não vê o cardápio até
  ir procurá-lo, e a conta nasce com ele fechado.
- **Entra**, em `/pedidos` e no editor de pedido, o selo "Pelo cardápio" — **só** no pedido que
  veio de lá. Quem não abriu o cardápio nunca o vê.
- **Entra**, nas sessões D e E, duas seções **dentro** do painel "Seu cardápio" ("Quantidade
  limitada" e "Promoções"). Nenhum campo novo no editor de produto: quem não abriu o cardápio
  continua sem ver nada disso.
- **Sai**: nada. É uma spec aditiva, e está escrito aqui porque o `#d113` pede.

---

## 1 · O que esta spec decide

### O cardápio é lido pelo servidor, e a regra continua sem nada público — `#d158`

O roadmap previa `contas/{id}/publico/cardapio`, um espelho das fichas escrito pelo aparelho dela,
com uma regra `allow read: if true` só nesse documento, e a página lendo o Firestore direto do
navegador da cliente. **Esta spec não faz isso.** A página `/c/{contaId}` é renderizada no
servidor, que lê a conta, a configuração e as fichas escolhidas com o Admin SDK e devolve só o
que é público. `firestore.rules` não muda uma linha.

Quatro motivos, em ordem de peso:

1. **O espelho envelhece.** Um espelho escrito pelo aparelho precisa ser reescrito em toda escrita
   que mexe em preço, foto, descrição ou nome de ficha — `salvarFicha`, `arquivarFicha`, a
   biblioteca em `writeBatch`, o recálculo do alerta de custo, a ajudante salvando um produto. Cada
   caminho esquecido é uma cliente vendo o preço de antes, e o pedido nascendo com um preço que a
   dona já não pratica. Lendo a ficha, o preço da página é o preço gravado, por construção.
2. **O espelho não cabe.** Foto é `data:` URL de até 80 KB (JPEG) ou 200 KB (PNG com
   transparência, `FOTO_COM_ALPHA_MAX_BYTES`). Um documento do Firestore tem 1 MiB. Doze produtos
   com foto transparente estouram o espelho, e o erro aparece como "salvei o produto e o
   cardápio não mudou".
3. **A regra fica sem exceção.** A primeira `allow read: if true` do arquivo é uma linha da qual a
   segurança da conta inteira passa a depender: um `match` escrito um nível acima do que devia
   abre a conta. Com o servidor lendo, a regra continua dizendo "nada público", e o que sai para
   fora é decidido por uma função pura, testada campo por campo (`montarCardapio`).
4. **O servidor já está no caminho.** O pedido nasce por handler (é o roadmap que diz, e é o
   certo: preço vindo do navegador da cliente não se grava). Se a escrita passa pelo servidor, a
   leitura passar também não abre fronteira nova.

**O custo aceito:** a página depende do servidor e da credencial (`FIREBASE_SERVICE_ACCOUNT`, que
a hospedagem já tem desde a 006), e cada visita custaria leituras. A página guarda o que montou
por 60 segundos (`revalidate = 60`): uma cliente ou mil no mesmo minuto são as mesmas `2 + N`
leituras. O preço novo aparece em até um minuto — e o pedido relê as fichas na hora de gravar,
então o preço gravado nunca é o da página velha.

**O que sai para fora**, e mais nada (aprovação 3):

| De onde                    | O quê                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `Conta`                    | `nome`, `proprietaria` (primeiro nome, na frase de confirmação)                                 |
| `ConfiguracaoGeral`        | `frase`, `contato.telefone` (como link de WhatsApp), `contato.instagram`                        |
| `FichaTecnica` (escolhida) | `nome`, `descricao`, `categoria`, `precoVenda`, `unidadeRendimento`, a foto (por rota, `#d162`) |

Custo, margem, lucro, itens, insumos, configuração de preço, forma de pagamento e `contaId` de
outra conta não saem — o teste de `montarCardapio` confere as chaves do objeto devolvido, e não
só os valores.

**O link é o `contaId`.** `/c/mycookies` para a primeira conta; `/c/3f2a…` (32 caracteres) para
quem se cadastrou pela 027. Um endereço bonito para toda conta exige um índice global de apelidos
**fora** de `contas/`, que é justamente o que a regra de ouro proíbe. Fica fora, com o porquê.

### O cardápio é escolha dela, e mora na configuração — `#d159`

O roadmap dizia "espelho das fichas ativas com preço". Toda ficha ativa com preço inclui as duas
fichas-modelo da biblioteca (018), o recheio que ela cadastrou como produto para calcular, e o
produto que ela parou de fazer e não arquivou. Um cardápio que publica sozinho o que ela salvou
para fazer conta é um cardápio que ela não controla.

```ts
// src/lib/types/configuracao.ts, em ConfiguracaoGeral
/**
 * O cardápio público (spec 031, `DECISOES.md#d159`). Ausente = fechado, que é
 * como toda conta nasce. `fichaIds` na ordem em que ela marcou; a página
 * ordena por categoria e nome.
 */
cardapio?: { aberto: boolean; fichaIds: string[] };
```

**Por que na configuração, e não um `noCardapio` em cada ficha:** um campo na ficha é um campo no
editor de produto, a tela mais cheia do sistema, e a 020 passou uma spec inteira tirando campo
de lá. Uma lista na configuração é uma tela só, que ela abre de propósito; a página lê um
documento para saber quais fichas buscar, e busca só essas (`getAll`), sem consulta e sem índice.
E é da dona por construção: a ajudante não escreve `configuracao` (`#d154`), e o painel mora
numa tela que ela não vê (`#d157`).

**O que pode entrar** (`entraNoCardapio`, puro): ficha não arquivada, `ativo`, `precoVenda > 0`,
`unidadeRendimento` em `un` ou `porcao`, e não é kit com `escolhas`. Combo à escolha exige a
tela de escolha da 014 do lado da cliente; venda por peso exige quantidade fracionária e preço
por quilo. Os dois ficam fora, e o painel diz em uma linha que não aparecem, em vez de listá-los
desabilitados.

Ficha que deixa de entrar (arquivada, preço zerado, virou combo à escolha) **some da página sem
sair da lista**: a lista guarda o id, a página filtra na leitura. Voltar a entrar volta a
aparecer, sem ela remarcar.

### O pedido do cardápio nasce orçamento, com o preço do servidor — `#d160`

`POST /api/cardapio/pedido` recebe **ids e quantidades**, nunca preço. Relê a configuração e as
fichas, confere cada item contra `entraNoCardapio` e contra `cardapio.fichaIds`, e monta o
pedido com o `precoVenda` e o `custoUnitario` **de agora**, pelo mesmo `derivarPedido` que o
editor usa. O documento gravado é um `Pedido` comum:

- `status: "ORCAMENTO"`, `pago: false`, `codigo` de `codigoDoPedido`.
- `clienteNome` e `clienteTelefone` do formulário; **sem `clienteId`**: pedido de cliente avulso
  não precisa de cadastro (é o que o tipo já diz), e criar cliente por link público seria deixar
  qualquer um escrever em `clientes`. A dona liga à cliente quando confirmar, se quiser.
- `entrega.tipo` e `entrega.endereco` do formulário; **`entrega.taxa: 0`**. A taxa é combinada
  depois — a página diz isso antes de a cliente mandar.
- `desconto: 0`, `formaPagamentoId: null`, `custoTaxaPagamento: 0`.
- `origem: "CARDAPIO"` — o campo novo, e o único valor dele. Ausente é "ela anotou", que é todo
  pedido gravado até aqui.
- `observacoes` da cliente, com o teto do esquema.

**Nada mais é escrito.** `criarPedido` também não toca caixa, agregado nem cliente na criação —
só o pagamento toca —, e o handler repete isso: um documento, um `set`.

**A data.** A cliente escolhe o dia; o mínimo é amanhã e o máximo, 90 dias. "Hoje" é o de
Brasília (`hojeEmBrasilia`, com `Intl`), porque o servidor roda em UTC e às 22h de São Paulo já é
amanhã lá. `dataEntrega` (o `Timestamp`) é gravado como meia-noite de Brasília, **e não** com
`dataDeISO`, que usa o fuso da máquina: no servidor, meia-noite UTC é 21h do dia anterior no
aparelho dela.

`ponytail:` fuso fixo em `America/Sao_Paulo`. Manaus e Rio Branco erram por uma ou duas horas na
virada do dia, num campo que ela confirma à mão. `Conta.fuso` quando a primeira conta de fora
de Brasília reclamar.

### O freio é um teto de orçamentos em aberto, e não um captcha — `#d161`

Uma rota que escreve sem login vai receber lixo. As defesas, da mais barata para a mais cara:

1. **O esquema.** Nome de 2 a 80 caracteres, telefone que `telefoneParaWhatsApp` aceita, de 1 a
   30 linhas, quantidade inteira de 1 a 500, endereço até 200, observação até 500, data no
   intervalo. Tudo que um robô genérico manda falha aqui.
2. **O pote de mel.** Um campo `site` escondido de gente (`aria-hidden`, fora da tela, `tabIndex
-1`, `autoComplete="off"`). Preenchido, a rota responde **sucesso sem gravar**: o robô não
   aprende que foi pego.
3. **O teto.** Antes de gravar, conta os orçamentos do cardápio ainda sem resposta —
   `origem == "CARDAPIO"`, `status == "ORCAMENTO"`, `arquivado == false`, com `count()` — e
   recusa a partir de `LIMITE_DE_ORCAMENTOS_EM_ABERTO` (20). Só igualdades: o Firestore junta os
   índices de campo único, e nenhum composto é preciso. É o teto do estrago, e não do robô: no
   pior caso, vinte orçamentos de lixo para ela cancelar, e a página passa a dizer "fale com ela
   pelo WhatsApp" para a próxima cliente de verdade, com o link.

**Sem captcha.** Turnstile ou reCAPTCHA é um serviço externo, uma chave, um script de terceiro na
página da cliente dela e um passo a mais em cada pedido real — para um problema que ainda não
apareceu. Entra no dia em que o teto for atingido por lixo, e o `ponytail:` no handler diz isso.

**Sem limite por IP.** Exige um lugar para contar que não é o Firestore (ou é, e aí é uma escrita
por requisição, inclusive das recusadas). O teto por conta cobre o dano que importa.

### A foto sai por rota própria, e não dentro da página — `#d162`

A foto é `data:` URL dentro da ficha (`#d109`). Posta como `src` na página, ela viaja **duas
vezes** — no HTML e no pacote de dados do React que acompanha o HTML — e sem `loading="lazy"`,
que não vale para `data:`. Vinte produtos com foto são facilmente 1 MB antes do primeiro
pixel, no 4G da cliente.

`GET /c/{contaId}/foto/{fichaId}?v={atualizadoEmMs}` decodifica o `data:` URL e devolve os bytes
com o `Content-Type` do prefixo e `Cache-Control: public, max-age=31536000, immutable`. O `?v=` é
o `atualizadoEm` da ficha: foto trocada é URL nova, e o cache nunca precisa ser invalidado. A
rota confere que a ficha está na lista e entra no cardápio (senão, 404), e que o prefixo é
`data:image/jpeg` ou `data:image/png` (senão, 404). A página usa `<img loading="lazy" width
height>` com o quadrado reservado, e a foto chega quando a cliente rola até ela.

`ponytail:` a rota lê a configuração e a ficha a cada foto não cacheada. Com a URL imutável, cada
foto é lida uma vez por versão por borda da hospedagem; se um dia pesar, é a foto que migra para
o Storage, e a URL da página continua a mesma.

---

## 2 · Antes de tocar em código

1. Ler `src/app/api/conta/membros/route.ts` inteiro: é o molde de rota com Admin SDK (credencial →
   corpo → leitura → escrita, `falha(codigo, status)`), menos o token.
2. Ler `src/lib/firebase/mutations/pedidos.ts:170-284` (`corpoDoPedido`, `criarPedido`): o handler
   grava a mesma forma pelo Admin SDK, e o `satisfies` da seção 3.B.2 é o que impede as duas de
   divergir.
3. Ler `src/lib/domain/pedido.ts` (`derivarPedido`, `codigoDoPedido`), `whatsapp.ts`
   (`telefoneParaWhatsApp`, `linkDoWhatsApp`, `mensagemDoPedido`) e `orcamento.ts` (os tetos de
   foto e o rótulo da unidade): nada disso é reescrito.
4. Ler `src/components/conta/QuemTeAjuda.tsx`: o painel "Seu cardápio" é o irmão dele, na mesma
   prateleira e com o mesmo desenho.
5. Ler `src/app/layout.tsx` e `next.config.ts`: a página pública herda o `AuthProvider` e o
   service worker do layout raiz, como `/termos` já herda. É um risco nomeado (seção Riscos), não
   um conserto desta spec.
6. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` na página pública e no painel. **A página
   é a primeira tela do Rende que não é para a confeiteira**: a voz é a dela falando com a
   cliente, e não a do Rende falando com ela.

---

## 3 · Escopo

### Sessão A · A vitrine

Ao fim da A, a dona abre o cardápio, escolhe os produtos, copia o link, e quem abre vê a vitrine
com "Falar no WhatsApp". Nenhum pedido é gravado por fora.

#### 3.A.1 Os tipos

- `ConfiguracaoGeral.cardapio?: { aberto: boolean; fichaIds: string[] }` (`#d159`).
- `Pedido.origem?: "CARDAPIO"` em `vendas.ts`, com o comentário: "Quem fez o pedido nascer.
  Ausente é ela, no app; `"CARDAPIO"` é a cliente, pelo link (spec 031, `#d160`). Escrito só por
  `/api/cardapio/pedido`." O campo nasce na A porque o tipo do domínio da B o lê; nenhuma escrita
  da A o grava.
- `esquemaConfiguracao` não muda: o painel escreve por mutação própria (3.A.4), e o formulário da
  configuração não conhece o campo — `salvarConfiguracao` grava com `merge`, e chave ausente não
  apaga.

#### 3.A.2 O domínio — `src/lib/domain/cardapio.ts`

Puro, testado, compartilhado pela página, pelo painel, pela rota da foto e (na B) pelo handler.

```ts
/** Freio da leitura da página: o painel não deixa marcar mais. */
export const LIMITE_DO_CARDAPIO = 40;

/** O que a página mostra de um produto. Nada de custo (`#d158`). */
export interface ProdutoDoCardapio {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  preco: Centavos;
  /** "un" ou "porção": o rótulo, pronto para a tela. */
  unidade: string;
  /** `atualizadoEm` em ms, para o `?v=` da foto; ausente = sem foto. */
  fotoVersao?: number;
}

export interface Cardapio {
  negocio: {
    nome: string;
    /** Primeiro nome de `proprietaria`, para "a Maynara confirma pelo WhatsApp". */
    quem: string;
    frase?: string;
    /** Já passado por `telefoneParaWhatsApp`; ausente quando não dá para discar. */
    whatsapp?: string;
    instagram?: string; // sem o @
    feitoComRende: boolean; // !ocultarFeitoCom (`#d147`)
  };
  /** Na ordem de `categoriasProduto`, e categoria desconhecida no fim; nome dentro. */
  secoes: { categoria: string; produtos: ProdutoDoCardapio[] }[];
}

/** Arquivada, inativa, sem preço, por peso ou combo à escolha: fora. */
export function entraNoCardapio(ficha: FichaTecnica): boolean;

/**
 * Tudo o que a página desenha, ou `null` para "este cardápio não está aberto":
 * sem configuração, `aberto` falso, conta encerrada, conta vencida
 * (`situacaoDaConta`), ou nenhum produto que entre. Os cinco casos dão a
 * mesma resposta, de propósito: a página não diz a um estranho se a conta existe.
 */
export function montarCardapio(entrada: {
  conta: Conta;
  configuracao: ConfiguracaoGeral | null;
  /** As fichas de `cardapio.fichaIds` que existem; a função filtra o resto. */
  fichas: FichaTecnica[];
  agoraMs: number;
}): Cardapio | null;

/** O texto do botão "Falar no WhatsApp" da vitrine. */
export function mensagemDeContato(negocio: Cardapio["negocio"]): string;
// "Oi, MyCookie's! Vi o cardápio e queria fazer um pedido."
```

**Conta vencida fecha o cardápio.** Uma conta vencida lê e não escreve (`#d144`): ela não
conseguiria confirmar, mudar a data nem cancelar o orçamento que chegasse. Pedido que a dona não
consegue responder é pior que pedido que não chegou.

Testes em `tests/domain/cardapio.test.ts`:

- `entraNoCardapio`: um caso por motivo de fora (arquivada, `ativo: false`, `precoVenda: 0`,
  `unidadeRendimento: "g"`, kit com `escolhas`) e os dois que entram (simples em `un`, kit sem
  escolhas em `porcao`).
- `montarCardapio`: os cinco `null`; a ordem das seções por `categoriasProduto` com a categoria
  desconhecida no fim; ficha da lista que foi arquivada some sem erro; `fotoVersao` ausente sem
  foto; `whatsapp` ausente com telefone inválido; `instagram` sem `@` quando ela digitou com;
  `feitoComRende` falso com `ocultarFeitoCom`.
- **As chaves.** `Object.keys` de cada produto contido em `["id", "nome", "descricao",
"categoria", "preco", "unidade", "fotoVersao"]`, com uma ficha de teste que tem custo, margem,
  itens e modo de preparo preenchidos. É o teste que diz se o `#d158` vale.
- `mensagemDeContato`, a frase inteira.

#### 3.A.3 A página — `src/app/c/[contaId]/page.tsx`

Fora de `(app)` e de `(auth)`: não tem shell, não tem guarda de login. Componente de servidor:

1. `credencialDisponivel()` falso → `notFound()`.
2. Lê `contas/{contaId}` e `configuracao/geral`; com `cardapio.fichaIds`, `getAll` das fichas
   (até `LIMITE_DO_CARDAPIO`, 40 — é o freio da leitura, e o painel não deixa marcar mais).
3. `montarCardapio`; `null` → `notFound()`.
4. Desenha.

`export const revalidate = 60` (`#d158`). `generateMetadata` dá `title: { absolute: nome }` e
`description: frase ?? "Cardápio e pedidos"`, que é o que o WhatsApp e o Instagram mostram na
prévia do link. `robots` continua `noindex` (herdado): o link é para quem ela manda, e não para
busca.

`src/app/c/[contaId]/not-found.tsx`: "Este cardápio não está aberto agora." e, embaixo, "Se você
recebeu este link de alguém, fale com essa pessoa." Sem logotipo do Rende, sem link para o app.

**O desenho**, para o `/impeccable` refinar, e não para ser seguido pixel por pixel:

- **Topo.** O nome do negócio em `display`, a frase embaixo em `ink-muted`, e dois botões de
  contato lado a lado: "Falar no WhatsApp" (primário, com `mensagemDeContato`) e "Instagram"
  (secundário), cada um só quando existe. Sem nenhum dos dois, o topo é só o nome.
- **Seções.** Uma por categoria, título em `label` caixa alta. Cada produto é uma linha de lista
  com divisória (lista, não grade de cartões — como a folha): foto quadrada de 88 px à esquerda
  (sem foto, o quadrado some e o texto começa na margem, como `temFoto` na folha), nome em
  `body-strong`, descrição em duas linhas no máximo, e o preço à direita com a unidade em
  `ink-muted` ("R$ 8,50 · un", "R$ 12,00 · porção"). Na A, a linha não tem controle nenhum.
- **Pé.** "Feito com Rende" em `micro`, `ink-subtle`, quando `feitoComRende`.
- **Tema.** Os tokens do Rende, claro e escuro pelo sistema da cliente. Nenhum valor de cor solto.
- **360 px** é a largura de projeto: a cliente abre pelo WhatsApp, no celular.

`<img>` com `loading="lazy"`, `decoding="async"`, `width`/`height` fixos e `alt` = nome do
produto. Sem `next/image`: a otimização dele passaria a foto por um segundo serviço para
redimensionar uma imagem que já tem 320 px.

#### 3.A.4 A foto — `src/app/c/[contaId]/foto/[fichaId]/route.ts`

O `GET` do `#d162`. Lê a configuração e a ficha; 404 quando a ficha não está em
`cardapio.fichaIds`, não `entraNoCardapio`, o cardápio está fechado, ou `fotoUrl` não começa com
`data:image/jpeg;base64,` ou `data:image/png;base64,`. Senão, `Buffer.from(base64, "base64")`
com o `Content-Type` do prefixo e o `Cache-Control` imutável. Sem `?v=` ou com `?v=` diferente
do `atualizadoEm` de agora, responde igual — a versão é para o cache, não uma senha.

#### 3.A.5 O painel da dona — `src/components/conta/SeuCardapio.tsx`

Uma linha na prateleira do fim de `/configuracao`, **acima** de "Quem te ajuda", no mesmo desenho
(ícone `Store` à esquerda, título, legenda). A legenda é o estado: **"Fechado"**, ou "Aberto · 8
produtos". Só para a dona, como "Quem te ajuda" (`#d157`).

O toque abre o `Painel` (folha no celular, lateral no desktop), título **"Seu cardápio"**:

- **Aberto ou fechado.** Um interruptor com o texto ao lado ("Aberto: quem tem o link vê e pede" /
  "Fechado: o link mostra que o cardápio não está aberto"). Nunca só a cor da chave.
- **O link**, quando aberto: o endereço inteiro em `text-label` (`location.origin + /c/ + contaId`),
  e dois botões — "Copiar" (`navigator.clipboard`, com "Copiado" por dois segundos) e
  "Compartilhar" (só quando `navigator.share` existe). "Ver como a cliente vê" abre em aba nova.
- **Os produtos.** Um `checkbox` por ficha que `entraNoCardapio`, agrupadas por categoria, com o
  nome e o preço. Alvo de 44 px na linha inteira. Abaixo da lista, uma linha em `ink-muted`:
  "Combos à escolha e produtos vendidos por peso ainda não entram no cardápio." Com
  `LIMITE_DO_CARDAPIO` marcados, os desmarcados ficam desabilitados e a linha diz o limite.
- **Sem produto que entre:** "Para montar o cardápio, dê um preço de venda aos seus produtos." e o
  link para `/fichas`.
- **Sem telefone** em `contato`: uma linha com `TriangleAlert` e texto — "Sem o seu WhatsApp, a
  cliente não tem como falar com você pelo cardápio." — e o link para o bloco "Na folha do
  orçamento", que é onde o telefone mora. Não impede abrir: a B ainda grava o pedido.
- **Sem foto nem descrição** nos marcados: nada. A página degrada sozinha, e a folha da 017 já
  ensina a pôr foto.

Cada toque grava na hora (a 015, "salvar no toque"): `salvarCardapio(contaId, cardapio)` em
`mutations/configuracao.ts`, um `setDoc` com `merge` de `{ cardapio, v, atualizadoEm }`,
despachado (`#d80`). Sem rede, grava na fila como toda escrita; o link copia igual, e a página
só muda quando a escrita subir — o painel não finge o contrário, mas também não avisa: é o
comportamento de todo o app.

A lista de fichas vem do `useColecao` que o app já assina; nenhuma leitura nova.

#### 3.A.6 Documentação da A

`#d158` e `#d159` em `docs/DECISOES.md`. `firebaseAdmin.ts`, no cabeçalho: a lista de quem lê
com o Admin SDK ganha `/c/[contaId]` e a rota da foto — "só a conta, a configuração e as fichas
da lista, e só devolvem o que `montarCardapio` deixa passar".

### Sessão B · O pedido

#### 3.B.1 O domínio do pedido — `src/lib/domain/cardapio.ts` (continua) e `datas.ts`

```ts
export const LIMITE_DE_ORCAMENTOS_EM_ABERTO = 20;
export const DIAS_A_FRENTE = 90;

export const esquemaPedidoDoCardapio = z.object({
  contaId: z.string().trim().min(1),
  nome: z.string().trim().min(2).max(80),
  telefone: z.string().refine((t) => telefoneParaWhatsApp(t) != null),
  itens: z
    .array(
      z.object({
        fichaId: z.string().min(1),
        quantidade: z.number().int().min(1).max(500),
      }),
    )
    .min(1)
    .max(30),
  dataEntregaISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entrega: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("RETIRADA") }),
    z.object({
      tipo: z.literal("ENTREGA"),
      endereco: z.string().trim().min(5).max(200),
    }),
  ]),
  observacoes: z.string().trim().max(500).optional(),
  /** O pote de mel (`#d161`). Qualquer coisa aqui é robô. */
  site: z.string().optional(),
});

export type FalhaPedidoCardapio =
  | "fora-de-forma" // esquema, ou item repetido que soma mais de 500
  | "fechado" // montarCardapio devolveria null
  | "mudou" // item que saiu do cardápio desde que a página abriu
  | "data" // antes de amanhã ou depois de DIAS_A_FRENTE
  | "cheio" // LIMITE_DE_ORCAMENTOS_EM_ABERTO
  | "sem-configuracao"
  | "sem-resposta"
  | "sem-rede";

export const MENSAGEM_FALHA_PEDIDO_CARDAPIO: Record<
  FalhaPedidoCardapio,
  string
>;

/**
 * O pedido que o handler grava, menos os três `Timestamp` (quem os cria é o
 * Admin SDK). Itens com o preço e o custo de AGORA, e a mesma ficha em duas
 * linhas vira uma linha só.
 */
export function pedidoDoCardapio(entrada: {
  pedido: z.infer<typeof esquemaPedidoDoCardapio>;
  fichas: FichaTecnica[];
  fichaIds: string[];
  hojeISO: DataISO;
  agora: Date;
}):
  | { ok: true; corpo: CorpoDoPedidoDoCardapio }
  | { ok: false; falha: FalhaPedidoCardapio };

/** O que a cliente manda para a dona depois de gravar. */
export function mensagemDeAviso(entrada: {
  negocio: string;
  codigo: string;
  nome: string;
  itens: { nome: string; quantidade: number }[];
  total: Centavos;
  dataEntregaISO: DataISO;
  entrega: "RETIRADA" | "ENTREGA";
}): string;
```

`CorpoDoPedidoDoCardapio` é `Omit<Pedido, "id" | "criadoEm" | "atualizadoEm" | "dataEntrega">`
com `origem: "CARDAPIO"` obrigatório.

`datas.ts` ganha `hojeEmBrasilia(agora: Date): DataISO` (`Intl.DateTimeFormat("en-CA",
{ timeZone: "America/Sao_Paulo" })`) e `meiaNoiteEmBrasilia(iso: DataISO): Date`
(`new Date(\`${iso}T00:00:00-03:00\`)`). O Brasil não tem horário de verão desde 2019; o
`ponytail:`do`#d160` cobre o resto.

A mensagem de aviso, palavra por palavra, com o caso de aceite:

> Oi, MyCookie's! Acabei de fazer o pedido P-260923-K3F pelo cardápio: 6 Cookie Tradicional, 4
> Cookie Red Velvet. Total R$ 112,00, para retirar na sexta-feira, 25 de setembro. Sou a Ana.

Testes, somados aos da A:

- `pedidoDoCardapio`: o caso de aceite (abaixo) número por número; item fora da lista → `mudou`;
  ficha arquivada desde a página → `mudou`; dois itens da mesma ficha somados; hoje → `data`;
  amanhã passa; `hoje + 91` → `data`; preço vindo do corpo ignorado (o esquema nem o tem — o teste
  manda um `precoUnitario: 1` a mais e confere que o gravado é o da ficha); `entrega.taxa`,
  `desconto` e `custoTaxaPagamento` zerados; `origem: "CARDAPIO"`; sem `clienteId`.
- `hojeEmBrasilia`: `2026-09-24T01:30:00Z` é `2026-09-23`.
- `mensagemDeAviso`: a frase inteira, retirada e entrega. **Expectativa com `formatarMoeda`**, e
  nunca digitada à mão (o espaço não quebrável da 010).
- `esquemaPedidoDoCardapio`: telefone inválido recusa; `ENTREGA` sem endereço recusa; 31 linhas
  recusa.

#### 3.B.2 O handler — `src/app/api/cardapio/pedido/route.ts`

Público, `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Na ordem:

1. `credencialDisponivel()` → senão `sem-configuracao` (500).
2. Corpo pelo esquema → senão `fora-de-forma` (400).
3. `site` preenchido → **200 com `{ codigo: null }`**, sem ler nem gravar nada (`#d161`).
4. Lê a conta e a configuração; `montarCardapio` com as fichas da lista → `null` é `fechado`
   (409). A mesma função da página: o handler não tem uma segunda opinião sobre o que está
   aberto.
5. `count()` dos orçamentos em aberto do cardápio → no teto, `cheio` (429).
6. `pedidoDoCardapio` com `hojeEmBrasilia(new Date())` → falha devolvida com 409 (`mudou`) ou 400
   (`data`).
7. `db.collection(caminhos.pedidos(contaId)).doc()` e `set` com o corpo, mais `criadoEm` e
   `atualizadoEm` em `Timestamp.now()`, `dataEntrega` em
   `Timestamp.fromDate(meiaNoiteEmBrasilia(iso))`, `arquivado: false`, `v: VERSAO_SCHEMA`. O
   objeto inteiro passa por `satisfies Omit<Pedido, "id">`: campo novo em `Pedido` que o handler
   não grava é erro de compilação, e não um pedido do cardápio sem o campo.
8. Responde `{ codigo, total }`.

**Não é idempotente**, e está dito: dois toques em "Enviar" são dois orçamentos. A página
desabilita o botão enquanto envia; o que escapar disso é um orçamento repetido que ela cancela.
Uma chave de idempotência seria uma escrita a mais por pedido para um caso raro e inofensivo.

`// ponytail: sem captcha e sem limite por IP; o teto por conta é o freio (#d161). Turnstile
quando o teto for atingido por lixo.` no topo do arquivo.

`firebaseAdmin.ts`, cabeçalho: a lista de quem **escreve** ganha `/api/cardapio/pedido` — "só
em `pedidos`, e só um documento novo por chamada; nunca atualiza, nunca lê o que a cliente não
mandou".

#### 3.B.3 O formulário da página — `src/components/cardapio/PedidoPeloCardapio.tsx`

A única parte da página que é componente de cliente. Recebe o `Cardapio` (sem foto nenhuma dentro
— `#d162`) e a data de amanhã, calculada no servidor.

- **Em cada linha de produto**, à direita do preço, o passo de quantidade: "Adicionar" (44 px)
  que vira `−  2  +` depois do primeiro toque. Nada é pedido antes de ela querer.
- **Com algo escolhido**, uma barra fixa no pé (o `RodapeFixo` que já existe, se não depender do
  shell; senão, uma `div` fixa com o mesmo desenho): "Ver pedido · 10 itens · R$ 112,00",
  primário, 52 px.
- **O toque abre o `Painel`**, título "Seu pedido":
  - as linhas escolhidas, com o passo de quantidade e o subtotal (`subtotalDoItem`);
  - **"Seu nome"** e **"Seu WhatsApp"** (`type="tel"`, `inputMode="tel"`, `autoComplete="tel"`);
  - **"Para quando?"** (`<input type="date">`, `min` amanhã, `max` amanhã + 89) com a dica "A
    {quem} confirma se dá para esse dia.";
  - **"Como você recebe?"**: duas opções, "Retiro" e "Entrega" (rádio nativo com cara de pílula);
    com "Entrega", o campo "Endereço" aparece, e a dica "A taxa de entrega a {quem} combina com
    você.";
  - **"Quer dizer mais alguma coisa?"** (opcional, `textarea`, 500);
  - o total, em `display`, com "sem a entrega" embaixo quando for entrega;
  - uma linha em `micro`: "Seus dados vão só para {nome}, para combinar este pedido.";
  - **"Enviar pedido"**, primário, 52 px, desabilitado enquanto envia;
  - o campo `site` do pote de mel, fora da tela.
- **Erros** em `role="alert"` abaixo do botão, pelas mensagens do domínio; `mudou` recarrega a
  página depois de dizer "O cardápio mudou enquanto você escolhia. Confira e mande de novo.";
  `cheio` mostra o botão "Falar no WhatsApp". O que ela digitou nunca se perde num erro.
- **Depois de enviar**, o painel troca de conteúdo: "Pedido enviado", o código em
  `tabular-nums`, "A {quem} vai confirmar pelo WhatsApp." e **"Avisar a {quem} no WhatsApp"**
  (primário, `linkDoWhatsApp(whatsapp, mensagemDeAviso(...))`), só quando há `whatsapp`. Fechar o
  painel zera o carrinho.

O carrinho mora em `useState` e mais nada. Recarregar a página perde o carrinho; é uma página de
dez itens no máximo, e `localStorage` aqui seria um carrinho que volta no celular de outra pessoa.

#### 3.B.4 O pedido no app dela

- **`LinhaPedido`** e o cabeçalho do **`EditorPedido`**: com `origem === "CARDAPIO"`, um `Selo`
  neutro com ícone `Store` e o texto "Pelo cardápio". Ícone e texto, nunca só cor.
- **Mais nada muda.** O orçamento do cardápio é um orçamento: ela confirma, põe a taxa de entrega,
  escolhe a forma de pagamento, manda o resumo pelo `BlocoWhatsApp`, liga a uma cliente se quiser.
  `atualizarPedido` não conhece `origem` e não o apaga (o corpo dele não tem a chave, e
  `updateDoc` mantém o que não recebe).
- A ajudante vê o selo igual: pedido é trabalho das duas (`#d157`).

#### 3.B.5 A passagem do `/impeccable`

A página pública em 360 px e no desktop, claro e escuro: vitrine com e sem foto, com e sem frase,
com e sem WhatsApp; o painel do pedido vazio, cheio, com erro, enviando e enviado; a página de
não encontrado. O painel "Seu cardápio" fechado, aberto, sem produto que entre e sem telefone.
Alvo de 44 px no passo de quantidade e nos `checkbox`, 52 px em "Ver pedido", "Enviar pedido" e
"Avisar no WhatsApp"; nome de produto longo quebrando sem empurrar o preço (`min-w-0`).

#### 3.B.6 Documentação da B

`#d160`, `#d161` e `#d162` em `docs/DECISOES.md`; `docs/ESTADO.md` com a seção da 031 e a linha
na tabela; `docs/saas/ROADMAP.md` com a 031 marcada e o que mudou do previsto (sem espelho, sem
regra pública, a lista é escolha dela). A tabela de dívidas ganha: o roteiro desta spec; o texto
de `/privacidade` sobre os dados da cliente da cliente (seção Riscos); e o service worker
instalando na página pública.

---

## 4 · Combos, quantidade limitada e promoção (sessões C, D e E)

Acrescentadas em 2026-09-23, depois da A e da B codificadas. As três partem do mesmo lugar: a
página já tem o preço certo e o servidor já decide tudo; o que muda é **o que a cliente vê ao
lado do preço**. E as três obedecem a uma regra só, que é o que as separa de truque de loja
virtual: **todo número na página é um número que o Rende sabe**. Economia contra um preço que a
página cobra, "restam" contado do pote, promoção contra o preço de sempre. Nada de "restam
poucas" sem número, "12 pessoas vendo agora" ou contador que recomeça quando a página recarrega.

### A economia do combo é contra o preço que a própria página cobra — `#d163`

Kit sem escolhas já entra no cardápio desde a A, mas aparece como um produto qualquer: "Caixa
com 6 · R$ 60,00", sem dizer que é mais barato que seis avulsos. A C acrescenta a conta, e
abre o combo à escolha, que a A deixou de fora.

- **Kit fixo.** `avulso` = soma de `componente.quantidade × preço de hoje` de cada ficha de
  dentro (o preço de hoje é o da promoção, se houver — `#d165`). Aparece **só** quando toda
  ficha de dentro está na página (na lista e `entraNoCardapio`) e `avulso > preco`. "Separados
  sairiam R$ 69,00" contra um preço que a cliente não consegue ver nem pedir ali é número
  inventado; contra os produtos da mesma página, é uma conta que ela confere rolando a tela. O
  que sobra dos dados já está carregado: as fichas de dentro são fichas da lista, e a C não lê
  nada a mais para o kit fixo.
- **Combo à escolha.** Entra no cardápio (`entraNoCardapio` perde a exclusão). As opções de
  cada escolha são as da 014 — `opcoesDaEscolha`, pela categoria (`#d99`) —, mais `ativo`: um
  sabor novo entra no combo no dia em que nasce, sem ela remarcar. A economia depende do que a
  cliente escolhe, então a linha do produto diz **"economize pelo menos R$ 1,00"**, pela
  combinação mais barata **entre as opções que estão na página**, e a tela de montar diz a conta
  exata da combinação escolhida. Opção fora da lista entra no combo e fica fora da conta:
  combinação com ela não mostra economia nenhuma. Combo sem opção viva numa das escolhas
  (`custoDasEscolhas().semOpcao`) some da página, como ficha que deixou de entrar.
- **O que sai para fora a mais:** o nome das opções de cada escolha. O preço de uma opção só sai
  quando ela está na lista, e então já saía.

**Por que "pelo menos" e não "até".** "Economize até R$ 7,00" é verdade para uma combinação e
promessa para as outras; "pelo menos" é verdade para todas.

### "Restam" é o pote menos o que os pedidos levam, e o servidor trava — `#d164`

A A pôs "esgotado" fora de escopo porque "o cardápio de encomenda vende o que ainda vai ser
feito". Continua certo para quase tudo; a D abre a exceção **por produto, escolhida por ela**:
`cardapio.limitados`, um subconjunto de `fichaIds`. Produto limitado mostra "Restam 8" e, no
zero, "Esgotado"; o resto continua de encomenda, sem número.

**O número.** O pote da 013 (`estoqueProntoAtual`) é uma medição com data, e não um saldo
(`#d97`): a fornada soma na projeção, mas o que sai do pote o sistema não vê. Um "restam" lido
direto da projeção nunca desceria com os pedidos que chegam, e a página diria "Restam 8" para a
décima cliente. Então:

```
restam = projecaoDoPronto(...).prontos
       − unidades da ficha em pedidos não cancelados, não arquivados,
         com dataEntregaISO > estoqueProntoContadoEmISO
```

"Unidades da ficha" é a linha, mais as escolhas × quantidade (como `reservadoNoPronto`), mais os
componentes dos kits que a página conhece. Pedido entregue depois da contagem saiu do pote depois
dela; pedido em aberto vai sair; os dois descontam. Orçamento também desconta — um orçamento de
lixo prende unidades até ela cancelar, e o teto de vinte do `#d161` é o limite desse estrago.
Pedido entregue antes da contagem já estava fora do pote quando ela contou.

`ponytail:` componente de kit que **não** está na lista não desconta: o kit que ela vende só
pelo app não é lido pela página. Ler as fichas de todo kit citado em pedido é o conserto, quando
uma caixa vendida por fora esvaziar um pote limitado sem a página ver.

**Sem contagem que valha** (nunca contou, ou a contagem venceu pela régua da 013), o produto
limitado não mostra número e não trava: a página não inventa. O painel avisa ela.

**A trava.** O handler relê tudo na hora de gravar e recusa com `acabou` (409) quando o pedido
leva mais do que resta de algum produto limitado — somando as linhas, as escolhas e os
componentes do próprio pedido. A página desabilita o "+" no que resta e troca "Adicionar" por
"Esgotado", mas quem decide é o servidor, como no preço (`#d160`).

**Leituras a mais**, só quando há produto limitado com contagem: `fornadas` com `dataISO >` a
contagem mais antiga, e `pedidos` com `dataEntregaISO >` a mesma data. Duas consultas de
intervalo em campo único, sem índice composto, limitadas pela janela da contagem; a página
continua guardando por 60 s.

`ponytail:` duas clientes no mesmo segundo podem levar as últimas unidades duas vezes. Uma
transação não resolve (o número é derivado de consultas, não um contador), e o que escapa é um
orçamento que ela recusa. Contador gravado quando isso acontecer com cliente de verdade.

### A promoção desconta do preço de sempre, e tem dia para acabar — `#d165`

O pedido de origem era **subir o preço mostrado em 20% acima do praticado e anunciar a
promoção contra esse número**. Esta spec **não faz isso**, e a decisão é para ser lida por quem
propuser de novo:

- Preço "de" que nunca foi cobrado é a "metade do dobro". O Código de Defesa do Consumidor chama
  de publicidade enganosa (art. 37, §1º), o Procon autua exatamente isso toda Black Friday, e
  quem responde é a confeiteira — o nome na página é o dela, não o do Rende.
- A cliente que compra toda semana sabe quanto custa o cookie. O risco de ser pega é maior no
  WhatsApp da vizinha do que no Procon.

**O que entra no lugar.** O preço riscado é o `precoVenda` da ficha, que é o que ela cobra fora
da promoção; o preço da promoção é menor que ele; e a promoção tem data para acabar. Quem quer
receber R$ 10,00 numa promoção de 20% precisa praticar R$ 12,50 de verdade no resto do tempo.

```ts
// src/lib/types/configuracao.ts
export interface PromocaoDoCardapio {
  fichaId: string;
  /** O preço na promoção. Vale só se `0 < preco < precoVenda` na hora de ler. */
  preco: Centavos;
  /** O último dia, inclusive, pelo dia de Brasília. Até 30 dias depois de criada. */
  ateISO: DataISO;
}
// em ConfiguracaoGeral.cardapio:
limitados?: string[]; // sessão D, `#d164`
promocoes?: PromocaoDoCardapio[]; // sessão E, `#d165`; uma por ficha
```

- **Uma por produto**, preço em reais e não percentual: ela pensa em "R$ 11,00", e dinheiro é
  centavo inteiro. A página mostra o percentual **arredondado para baixo** (−15%, e não −16%),
  para nunca anunciar mais desconto do que dá.
- **Tem fim, e não se renova.** Até 30 dias (`DIAS_DE_PROMOCAO`). No dia seguinte ao `ateISO`,
  a página e o handler voltam ao preço de sempre sozinhos; a promoção vencida é limpa da lista no
  próximo `salvarCardapio`. Nada de "termina em 02:14:37" que recomeça: a página diz "até
  sexta-feira, 25 de setembro", ou "termina hoje".
- **Deixa de valer sozinha** quando ela muda o preço da ficha para igual ou abaixo do da
  promoção — "de R$ 11,00 por R$ 11,00" não é promoção.
- **O pedido grava o preço da promoção** em `precoUnitario`, pelo mesmo `precoVigente` que a
  página usa. Nenhum campo novo em `Pedido`: o lucro estimado já mostra a ela o que a promoção
  custou.

`ponytail:` o sistema não confere se o preço de sempre é praticado há tempo — a ficha não guarda
histórico de preço. Subir a ficha na véspera para descontar no dia seguinte é o mesmo truque,
feito à mão; o painel diz em uma linha que o preço riscado precisa ser o que ela cobra fora da
promoção. Um `precoVendaDesdeISO` na ficha, se um dia o Rende precisar provar isso.

### Sessão C · Os combos

#### 4.C.1 O domínio — `src/lib/domain/cardapio.ts`

```ts
export interface OpcaoDoCombo {
  id: string;
  nome: string;
  /** Só quando a opção está na página; sem ele, a combinação não mostra economia. */
  preco?: Centavos;
}

// em ProdutoDoCardapio:
/** Kit fixo: a soma dos de dentro pelo preço de hoje, quando passa do preço do kit. */
avulso?: Centavos;
/** Combo à escolha: o que a cliente monta. */
escolhas?: { categoria: string; quantidade: number; opcoes: OpcaoDoCombo[] }[];
/** Combo à escolha: a economia da combinação mais barata, quando é positiva. */
economiaMinima?: Centavos;

/** A economia de uma combinação montada, ou `null` quando alguma opção não tem preço. */
export function economiaDoCombo(
  produto: ProdutoDoCardapio,
  escolhas: { fichaId: string; quantidade: number }[],
): Centavos | null;
```

`montarCardapio` recebe `opcoes: FichaTecnica[]` (as fichas das categorias dos combos) e passa
a montar `avulso`, `escolhas` e `economiaMinima`. `economiaDoCombo` é da página (a tela de montar)
e do teste; o servidor não a usa, porque a economia não é gravada.

`esquemaPedidoDoCardapio`: cada item ganha `escolhas?: { fichaId, quantidade: int 1..50 }[]`, até
12, por **uma** unidade do combo (como `EscolhaFeita`). `pedidoDoCardapio` recebe as fichas das
opções escolhidas e:

- kit com escolhas **sem** `escolhas`, ou kit sem escolhas **com** elas → `fora-de-forma`;
- opção que não serve (`opcoesDaEscolha` com `ativo`) → `mudou`;
- `escolhasCompletas` falso → `fora-de-forma` (a página não deixa mandar incompleto);
- `EscolhaFeita` com nome e `custoUnitario` da ficha de agora; o `custoUnitarioSnapshot` da
  linha é `custoDoComboMontado(kit, escolhas)` (`#d100`), o mesmo do editor de pedido;
- a junção de linhas repetidas passa a ser por ficha **e** escolhas: duas Duplas com sabores
  diferentes são duas linhas.

`mensagemDeAviso` usa `nomeComEscolhas`: "2 Dupla (1 Cookie Tradicional + 1 Cookie Red Velvet)".

#### 4.C.2 Leitura e handler

A página e o handler leem, além das fichas da lista, as fichas de cada categoria de escolha dos
combos da lista: uma consulta `where("categoria", "==", c)` por categoria distinta, filtrada em
memória. Igualdade em campo único, sem índice. O handler lê só as opções que o pedido cita
(`getAll`), e confere a categoria contra a ficha.

#### 4.C.3 A página

- **Kit fixo com `avulso`**: abaixo da descrição, em `ink-muted`, "Separados sairiam R$ 69,00 ·
  você economiza R$ 9,00". Texto, sem selo colorido.
- **Combo à escolha**: a mesma linha diz "Você escolhe os sabores" e, com `economiaMinima`,
  "economize pelo menos R$ 1,00". O "Adicionar" abre o `Painel` **"Monte a sua {nome}"**: uma
  seção por escolha ("Escolha 2 · Cookie"), uma linha por opção com o passo de quantidade, o "+"
  travado quando a categoria enche (a regra de `escolhasCompletas`), o que falta em texto ("Falta
  escolher 1"), a economia da combinação quando `economiaDoCombo` não é `null`, e
  "Pôr no pedido" (52 px), desabilitado até completar.
- **No carrinho**, a linha do combo mostra `nomeComEscolhas` e o passo de quantidade do combo
  inteiro. Trocar o sabor é tirar e montar de novo: o carrinho é de dez itens, e um editor de
  escolha dentro do painel do pedido é um painel dentro de outro.
- **Painel da dona:** a linha "Combos à escolha e produtos vendidos por peso ainda não entram no
  cardápio." vira "Produtos vendidos por peso ainda não entram no cardápio."

#### 4.C.4 Caso de aceite da C

Sobre o caso de aceite da B. Acrescenta na lista **"Caixa com 6"** (kit fixo: 3 Tradicional + 3
Red Velvet, `precoVenda` R$ 60,00) e **"Dupla"** (kit, uma escolha: 2 de "Cookie";
`precoVenda` R$ 19,00; embalagem R$ 1,00, então `custoEscolhas` R$ 8,40 e `custoUnitario`
R$ 9,40). Na categoria "Cookie" também existe "Cookie teste", `ativo: false`.

- "Caixa com 6": `avulso` R$ 69,00 (3 × 10 + 3 × 13). Com o Red Velvet fora da lista:
  `avulso` ausente. Com `precoVenda` R$ 70,00: ausente.
- "Dupla": opções Tradicional e Red Velvet, sem "Cookie teste"; `economiaMinima` R$ 1,00
  (2 × 10 − 19). `economiaDoCombo` com 1 + 1: R$ 4,00; com 2 Red Velvet: R$ 7,00.
- Pedido de 2 Duplas (1 Tradicional + 1 Red Velvet): uma linha, `precoUnitario` R$ 19,00,
  subtotal R$ 38,00, `custoUnitarioSnapshot` R$ 8,61 (1,00 + 3,41 + 4,20). Com "Cookie teste"
  numa escolha → `mudou`. Com só 1 sabor → `fora-de-forma`. 1 Dupla de 2 Tradicional e 1 Dupla
  de 1 + 1 → duas linhas.

### Sessão D · Quantidade limitada

#### 4.D.1 O domínio

```ts
/** Unidades de cada receita que as linhas levam: a linha, as escolhas e os componentes dos kits dados. */
export function unidadesPorFicha(
  itens: Pick<ItemPedido, "fichaTecnicaId" | "quantidade" | "escolhas">[],
  kits: Pick<FichaTecnica, "id" | "componentes">[],
): Map<string, number>;

/** Quantas restam de cada ficha limitada (`#d164`); ausente = sem contagem que valha. */
export function restamNoPote(entrada: {
  limitadas: FichaTecnica[];
  kits: FichaTecnica[];
  fornadas: FornadaDaFicha[];
  pedidos: Pick<Pedido, "status" | "arquivado" | "dataEntregaISO" | "itens">[];
  hojeISO: DataISO;
}): Map<string, number>;
```

`restamNoPote` usa `projecaoDoPronto` da 013 e não reescreve a contagem. `ProdutoDoCardapio`
ganha `restam?: number` (0 é esgotado; ausente é "sem número"), e a opção de combo ganha o mesmo
campo. `montarCardapio` recebe o mapa pronto. `FalhaPedidoCardapio` ganha `acabou`: "Um dos
produtos acabou, ou restam menos do que você escolheu. Confira e mande de novo."

#### 4.D.2 Página, handler e painel

- **Página**: "Restam 8" em `label` abaixo do preço; no zero, "Esgotado" no lugar do
  "Adicionar", sem controle. O "+" do carrinho e o da tela de montar param no que resta. Opção de
  combo esgotada aparece desabilitada, com "Esgotado".
- **Handler**: depois de `pedidoDoCardapio`, com produto limitado no pedido, lê fornadas e
  pedidos (seção `#d164`), soma `unidadesPorFicha` do pedido novo e recusa `acabou` (409) acima
  do que resta. A página trata `acabou` como `mudou`: diz a frase e recarrega.
- **Painel "Seu cardápio"**, seção **"Quantidade limitada"**, abaixo dos produtos: "Mostre
  quantas restam e pare de receber pedido quando acabar." Um `checkbox` por produto marcado que
  tem pote (`temPronto`: receita, e não kit), com a contagem ao lado — "No pote: 30, contado
  ontem" — ou, sem contagem que valha, `TriangleAlert` e "Sem contagem: o cardápio não mostra
  quantas restam", com o link para contar. Grava por `salvarCardapio`, como o resto.

#### 4.D.3 Caso de aceite da D

"Cookie Tradicional" limitado, `estoqueProntoAtual` 30 contado em 2026-09-22, uma fornada de 12
vendáveis em 2026-09-23 (projeção: 42). Pedidos com `dataEntregaISO` depois de 22/09: um
confirmado de 29 Tradicional; um orçamento de 2 Duplas com 1 Tradicional cada (2); uma "Caixa
com 6" (3); um **cancelado** de 10 (não conta). Um **entregue em 22/09** de 4 (não conta).

- `restam` = 42 − 34 = **8**. A página diz "Restam 8".
- Pedido de 10 Tradicional → `acabou`. Pedido de 8 → passa; a página, renovada, diz "Esgotado".
- Com `estoqueProntoContadoEmISO` vencido: `restam` ausente, a página sem número, o pedido de
  100 passa.
- Red Velvet, não limitado: sem `restam`, sempre.

### Sessão E · A promoção

#### 4.E.1 O domínio

```ts
export const DIAS_DE_PROMOCAO = 30;

/** O preço de hoje, e o de sempre quando é promoção (`#d165`). */
export function precoVigente(
  ficha: Pick<FichaTecnica, "id" | "precificacao">,
  promocoes: PromocaoDoCardapio[] | undefined,
  hojeISO: DataISO,
): { preco: Centavos; cheio?: Centavos; ateISO?: DataISO };

/** O que o painel recusa antes de gravar. */
export function problemaDaPromocao(
  promocao: PromocaoDoCardapio,
  ficha: FichaTecnica,
  hojeISO: DataISO,
): "maior-que-o-preco" | "sem-preco" | "data" | null;
```

`ProdutoDoCardapio` ganha `precoCheio?` e `promocaoAteISO?`, presentes só em promoção; `preco`
passa a ser o vigente. `montarCardapio` calcula `hojeISO` de `agoraMs` por `hojeEmBrasilia`, e
`avulso`/`economiaMinima` (C) usam o preço vigente dos de dentro. `pedidoDoCardapio` grava
`precoUnitario` pelo `precoVigente`.

#### 4.E.2 Página e painel

- **Página**: o preço cheio riscado em `ink-muted` (`<s>`, com "antes" só para leitor de tela),
  o preço da promoção em `body-strong`, e abaixo um `Selo` com ícone `Tag` e o texto "−15% até
  sexta-feira, 25 de setembro" — ou "termina hoje". Ícone e texto; nunca só a cor.
- **Painel "Seu cardápio"**, seção **"Promoções"**: as promoções que valem, uma por linha
  ("Cookie Red Velvet · R$ 11,00 até sexta, 25/09"), cada uma com "Encerrar". "Nova promoção"
  abre, no próprio painel, três campos — o produto (os marcados), "Preço na promoção" e "Até
  quando" (`min` hoje, `max` hoje + 30) — e, ao vivo, **"Sobra pra você R$ 6,80 por unidade"**
  (preço − `custoUnitario`). Abaixo do custo: `TriangleAlert` e "Nesse preço você paga para
  vender." — avisa e deixa gravar. `problemaDaPromocao` recusa com a frase ("A promoção precisa
  ser menor que o preço de sempre, R$ 13,00."). E a linha fixa, em `ink-muted`: "O preço riscado
  é o da ficha. Ele precisa ser o que você cobra fora da promoção."

#### 4.E.3 Caso de aceite da E

Hoje é 23/09/2026. Promoção do Red Velvet: R$ 11,00 até 2026-09-25.

- A página: R$ 13,00 riscado, R$ 11,00 · un, "−15% até sexta-feira, 25 de setembro"
  (2/13 = 15,4%, para baixo). O painel: "Sobra pra você R$ 6,80 por unidade".
- Pedido de 4 Red Velvet: `precoUnitario` R$ 11,00, subtotal R$ 44,00, custo R$ 16,80, lucro
  R$ 27,20.
- "Caixa com 6", durante a promoção: `avulso` R$ 63,00 (3 × 10 + 3 × 11), economia R$ 3,00.
- Em 2026-09-26: a página diz R$ 13,00, sem selo; o pedido grava R$ 13,00.
- Promoção de R$ 13,00 → `maior-que-o-preco`. Até 2026-10-24 (hoje + 31) → `data`. Com a ficha
  mudada para R$ 11,00 depois de criada: `precoVigente` devolve R$ 11,00 sem `cheio`.

### 4.F Testes, roteiro e documentação das três

- **Testes** em `tests/domain/cardapio.test.ts`: os três casos de aceite número por número, e o
  teste das chaves (`#d158`) com as chaves novas — `avulso`, `escolhas`, `economiaMinima`,
  `restam`, `precoCheio`, `promocaoAteISO` — e só elas.
- **Roteiro de navegador**, passos 14 a 20 (abaixo).
- **Documentação**: `#d163` na C, `#d164` na D, `#d165` na E, em `docs/DECISOES.md`;
  `ESTADO.md` a cada sessão; `firebaseAdmin.ts`, no cabeçalho, a leitura da página ganha "as
  fichas das categorias dos combos" (C) e "fornadas e pedidos desde a contagem, só para contar"
  (D).

---

## Caso de aceite

A conta `mycookies`, cardápio aberto com `fichaIds: ["tradicional", "redvelvet", "recheio"]`.
"Recheio de brigadeiro" é produto com `precoVenda: 0`. Hoje é 23/09/2026, 15h em Brasília.

| Ficha              | `precoVenda` | `custoUnitario` | Entra?      |
| ------------------ | ------------ | --------------- | ----------- |
| Cookie Tradicional | R$ 10,00     | R$ 3,41         | sim         |
| Cookie Red Velvet  | R$ 13,00     | R$ 4,20         | sim         |
| Recheio            | R$ 0,00      | R$ 1,10         | não (preço) |

A cliente manda: Ana, `(81) 98888-7777`, 4 Tradicional, 4 Red Velvet e mais 2 Tradicional numa
segunda linha, retirada em `2026-09-25`.

- `montarCardapio`: uma seção, dois produtos, o recheio fora.
- `pedidoDoCardapio`: duas linhas — Tradicional × 6 (R$ 60,00, custo R$ 20,46) e Red Velvet × 4
  (R$ 52,00, custo R$ 16,80); `subtotal` e `total` R$ 112,00; `custoTotalEstimado` R$ 37,26;
  `lucroEstimado` R$ 74,74; `clienteTelefone` como ela digitou; `status: "ORCAMENTO"`; `origem:
"CARDAPIO"`; `competencia: "2026-09"`; `entrega: { tipo: "RETIRADA", taxa: 0, endereco: null }`.
- `mensagemDeAviso` devolve exatamente a frase da seção 3.B.1.

---

## Roteiro de navegador

Precisa do projeto de verdade, da conta real (ou uma de cadastro), de um celular que não está
logado no Rende e de rede. Aparelho em 360 px nos passos 3, 5 e 7.

1. **Fechado por padrão.** Dona → `/configuracao`: "Seu cardápio · Fechado". Abrir
   `/c/{contaId}` num navegador anônimo: a página de não encontrado. `/c/nao-existe`: a mesma
   página, com o mesmo texto.
2. **Abrir.** Painel → marcar três produtos, um sem foto → abrir. A legenda vira "Aberto · 3
   produtos". Copiar o link.
3. **A vitrine, a 360 px.** No celular deslogado: nome, frase, "Falar no WhatsApp" abre o
   WhatsApp com a mensagem de contato; produtos por categoria; o sem foto começa na margem.
   DevTools → Rede: nenhuma resposta com `data:image` no HTML; as fotos chegam como
   `image/jpeg` da rota, com `Cache-Control` imutável.
4. **O preço anda.** Mudar o preço de um produto no app, salvar, esperar um minuto, recarregar a
   vitrine: o preço novo. Arquivar um produto marcado: some da vitrine, e continua marcado no
   painel se voltar.
5. **O pedido (B), a 360 px.** Escolher, "Ver pedido", preencher, "Entrega" com endereço,
   "Enviar pedido" → "Pedido enviado" com o código. "Avisar a Maynara no WhatsApp": a mensagem
   certa, no número certo. No app dela: o orçamento em `/pedidos` com o selo "Pelo cardápio",
   total sem taxa, data certa **no dia certo** (é o passo que prova a meia-noite de Brasília).
6. **O preço é do servidor.** No console da vitrine, `fetch` para `/api/cardapio/pedido` com um
   `precoUnitario: 1` no item: o orçamento gravado tem o preço da ficha.
7. **Mudou no meio.** Com o painel do pedido aberto na cliente, a dona desmarca um dos produtos
   escolhidos e espera a gravação subir; "Enviar pedido" → a frase de `mudou`, e a página
   recarrega. Nada gravado.
8. **O pote de mel.** `fetch` com `site: "x"`: 200, e nenhum documento novo.
9. **O teto.** Com o emulador ou uma conta de teste, 20 orçamentos do cardápio em aberto → o 21º
   recebe `cheio` e a página mostra "Falar no WhatsApp". Confirmar um deles → o próximo passa.
10. **Fechar.** Dona fecha o cardápio: em até um minuto, a vitrine vira não encontrado, e
    `POST` com a página velha aberta recebe `fechado`.
11. **Vencida.** Vencer a conta de cadastro à força (roteiro da 028): a vitrine fecha sozinha.
12. **A ajudante.** Com o login dela, `/configuracao` não mostra "Seu cardápio"; o orçamento do
    cardápio aparece com o selo em `/pedidos`.
13. **A regra não mudou.** `git diff firestore.rules` vazio. No console da vitrine, sem login,
    `getDoc` em `contas/{contaId}/fichas/{id}`: `permission-denied`.
14. **O combo fixo (C).** Pôr no cardápio uma caixa e os sabores de dentro: a linha diz
    "Separados sairiam…" com a conta certa. Tirar um dos sabores da lista: a linha some.
15. **O combo à escolha (C), a 360 px.** "Adicionar" abre "Monte a sua…"; o "+" trava quando a
    categoria enche; "Pôr no pedido" só com tudo escolhido; a economia muda com o sabor. Mandar:
    no app dela, o pedido tem as escolhas e o custo do combo montado, igual a um feito à mão.
16. **Restam (D).** Contar o pote de um produto e marcá-lo como limitado: a página diz "Restam
    N" com o N da conta de `#d164`. Mandar um pedido que leva tudo: a página, renovada, diz
    "Esgotado". Com a página velha aberta em outro celular, pedir mais uma: `acabou`.
17. **Contagem vencida (D).** Com a contagem fora da validade: sem número, e o painel avisa.
18. **A promoção (E).** Criar uma até amanhã: a página mostra o riscado, o percentual e "até…";
    o pedido grava o preço da promoção. Tentar uma igual ao preço de sempre: o painel recusa.
19. **A promoção acaba (E).** No dia seguinte ao último: o preço de sempre, sem selo, na página e
    no pedido — sem ela tocar em nada.
20. **Nada inventado.** Com promoção, combo e limitado ao mesmo tempo, conferir cada número da
    página contra a ficha, o pote e os pedidos. Nenhum número na página que ela não reconheça.

---

## Critérios de aceite

**A**

- [x] `ConfiguracaoGeral.cardapio` e `Pedido.origem` existem, opcionais; nenhum documento gravado
      muda de forma.
- [x] `domain/cardapio.ts` com `entraNoCardapio`, `montarCardapio` e `mensagemDeContato`, sem
      Firebase e sem React, com o teste das chaves (`#d158`).
- [x] `/c/[contaId]` renderiza no servidor, guarda 60 s, e dá a mesma página de não encontrado
      para os cinco casos de `null`.
- [x] A rota da foto devolve bytes com `Cache-Control` imutável e 404 fora do cardápio; a página
      não tem `data:` URL nenhum.
- [x] "Seu cardápio" em `/configuracao`, só para a dona: interruptor com texto, link com copiar e
      compartilhar, `checkbox` por produto que entra, o limite, a linha sobre combo e peso, o
      aviso sem telefone. Cada toque grava por `salvarCardapio`, despachado.
- [x] `firestore.rules` e `firestore.indexes.json` intocados.

**B**

- [x] `esquemaPedidoDoCardapio`, `pedidoDoCardapio`, `mensagemDeAviso`, `hojeEmBrasilia` e
      `meiaNoiteEmBrasilia` testados, com o caso de aceite número por número.
- [x] `POST /api/cardapio/pedido`: esquema, pote de mel sem gravar, `fechado` pela mesma
      `montarCardapio`, teto por `count()`, preço e custo da ficha, `satisfies Omit<Pedido,
"id">`, um `set` e nada mais.
- [x] O formulário da página com o passo de quantidade, o painel do pedido, os erros em
      `role="alert"` sem perder o que foi digitado, e o aviso no WhatsApp depois de enviar.
- [x] Selo "Pelo cardápio" em `LinhaPedido` e no `EditorPedido`, com ícone e texto.
- [ ] Os passos 1 a 13 do roteiro passam; o 5 prova a data e o 6 prova o preço.

**C**

- [x] Kit fixo com `avulso` só quando todos os de dentro estão na página e custam mais juntos.
- [x] Combo à escolha na página, com a tela de montar, `economiaMinima` e `economiaDoCombo`; o
      handler confere as escolhas e grava o custo por `custoDoComboMontado`.
- [x] Linhas com escolhas diferentes não se juntam; `mensagemDeAviso` com `nomeComEscolhas`.

**D**

- [x] `cardapio.limitados` escolhido no painel, com a contagem ao lado e o aviso sem contagem.
- [x] `restamNoPote` pelo caso de aceite; "Restam N" e "Esgotado" na página; `acabou` no
      handler, contando linhas, escolhas e componentes.

**E**

- [x] `cardapio.promocoes` pelo painel, com "Sobra pra você", o aviso abaixo do custo e as
      recusas de `problemaDaPromocao`.
- [x] `precoVigente` na página, no `avulso` e no pedido; a promoção acaba sozinha no dia seguinte
      ao `ateISO`; o percentual arredondado para baixo.

**Todas**

- [x] Alvo de 44 px, primário de 52 px, nada só por cor.
- [x] `lint`, `typecheck`, `test` e `build` passam; o `build` lista `/c/[contaId]` (ISR), a rota da
      foto e `/api/cardapio/pedido` (dinâmicas).
- [x] `#d158` a `#d162` escritos; `ESTADO.md` e `ROADMAP.md` atualizados.

---

## Fora de escopo

- **Pagamento pela página** (Pix com QR, cartão). É dinheiro entrando sem ela confirmar o pedido,
  e é outro provedor (Stripe Connect, ou um PSP de Pix) com a conta dela, não a do Rende. O
  orçamento é justamente o passo em que ela diz se dá.
- **Taxa de entrega calculada** (por bairro, por distância). Taxa zero e "a {quem} combina com
  você" é o que ela faz hoje no WhatsApp.
- **"Esgotado" e estoque em todo produto.** O cardápio de encomenda vende o que ainda vai ser
  feito. Só o que ela marca como limitado conta o pote (sessão D, `#d164`).
- **Dias e horários de funcionamento, antecedência configurável, pedido mínimo.** Amanhã e 90
  dias são constantes; ela recusa o dia que não dá, na conversa. Viram campo com o primeiro
  pedido real que ela precisar recusar toda semana.
- **Venda por peso na página** (`#d159`). Quantidade fracionária com preço por quilo. O combo à
  escolha, que a A deixava fora com ela, entra na sessão C.
- **Endereço bonito** (`/c/mycookies` para toda conta). Índice global fora de `contas/` (`#d158`).
- **A cliente acompanhando o pedido** (link de status, "sua encomenda está pronta"). Exige
  identificar a cliente sem login, e o WhatsApp já é o canal.
- **Aviso para a dona** por push, e-mail ou notificação. O aviso é a cliente, pelo WhatsApp
  (`#d77`), e o pedido está em `/pedidos` na próxima vez que ela abrir.
- **Cliente cadastrada pelo link.** Escrita pública em `clientes` (`#d160`).
- **Captcha e limite por IP** (`#d161`).
- **Indexação em busca e imagem de prévia** (`og:image`). O link é para quem ela manda; a prévia
  do WhatsApp mostra título e frase, e é o que basta.
- **Preço de cardápio diferente do preço da ficha**, fora da promoção com prazo da sessão E. Um
  preço é um preço.
- **Promoção contra preço inflado** ("de" acima do que ela cobra) (`#d165`). Publicidade
  enganosa, e o nome na página é o dela.
- **Contador regressivo, "restam poucas" sem número, "N pessoas vendo agora".** Todo número na
  página é um número que o Rende sabe (seção 4).
- **Promoção por percentual, por categoria ou para o cardápio inteiro, e cupom.** Uma por
  produto, em reais, resolve o caso; o resto vira campo quando ela pedir.
- **Economia do combo contra produto fora da página.** A conta que a cliente não confere não sai
  (`#d163`).
- **Mais de um cardápio por conta** (atacado e varejo). Uma lista.
- **Gating por plano.** O cardápio é upsell natural (`docs/saas/CLAUDE.md` §4), e gating é a 032.
  Até lá, toda conta tem.
- **Tirar o `AuthProvider` e o service worker da página pública.** Risco nomeado abaixo; o
  conserto mexe no layout raiz de todo o app e não é desta spec.

---

## Decisões desta spec que são fáceis de rejeitar

- **Sem espelho e sem regra pública, contra a letra do roadmap** (`#d158`). O roadmap previa as
  duas e pedia aprovação para a regra. O espelho envelhece e não cabe; a regra seria a primeira
  exceção do arquivo, e o pedido já passa pelo servidor. Quem preferir o desenho do roadmap
  precisa responder quem reescreve o espelho quando a ajudante muda o preço de um produto.
- **A lista na configuração, e não um campo na ficha** (`#d159`). O campo seria mais "natural" no
  editor de produto; é exatamente por isso que não entra lá.
- **Conta vencida fecha o cardápio.** Parece punir a cliente da cliente. É o contrário: um
  orçamento que a dona não consegue responder é uma cliente esperando resposta que não vem.
- **Taxa de entrega zero no pedido.** O total que a cliente vê é menor que o que vai pagar se for
  entrega. A página diz "sem a entrega" ao lado do total, e a dona põe a taxa ao confirmar — é o
  que o status de orçamento significa.
- **Sem idempotência no envio.** Dois toques, dois orçamentos. O botão desabilitado cobre quase
  tudo, e cancelar um orçamento repetido é um toque dela.
- **O pote de mel responde sucesso.** Uma cliente de verdade com um preenchedor automático que
  escreve em campo escondido perderia o pedido sem saber. `autoComplete="off"`, `tabIndex={-1}`
  e um `name` que nenhum preenchedor conhece ("site") são a defesa; o roteiro não cobre isso, e
  é por isso que está aqui.
- **Teto de vinte, por conta.** Uma confeiteira com uma campanha boa pode ter vinte orçamentos sem
  resposta numa tarde. A página então manda para o WhatsApp, que é para onde a cliente ia de
  qualquer jeito. Se acontecer com cliente de verdade, o número sobe; não vira configuração.
- **`contaId` no link.** Um UUID na bio do Instagram é feio. É o preço de não ter nada fora de
  `contas/`.
- **Nada de preço de referência inflado** (`#d165`). Foi o pedido original. Quem quiser a
  promoção de 20% sem perder receita sobe o preço de sempre de verdade, e cobra ele.
- **Orçamento desconta do "restam"** (`#d164`). Um orçamento que ela vai recusar prende unidades
  até ser cancelado. É o lado seguro: a página nunca vende o que já foi pedido.
- **Sem contagem, sem trava** (`#d164`). O produto limitado com contagem vencida aceita
  qualquer quantidade. Travar em zero esconderia o produto por ela ter esquecido de contar; o
  painel avisa, e o pedido é orçamento.

---

## Riscos

- **A primeira rota sem login que escreve.** Tudo o que ela grava passa pelo esquema e por
  `pedidoDoCardapio`, e o `satisfies` amarra a forma. O que ela **não** pode fazer — escrever em
  outro caminho, atualizar um pedido, ler algo que não seja o cardápio — é a lista curta do
  cabeçalho de `firebaseAdmin.ts`, e quem acrescentar um segundo `set` ao handler está mudando
  a fronteira de confiança do sistema.
- **O service worker e o `AuthProvider` na página pública.** O layout raiz registra o service
  worker e inicia o Firebase para toda página, `/termos` inclusive. Na cliente da cliente, isso é
  o app do Rende baixando em segundo plano depois da vitrine abrir, e um cache do Firestore criado
  num celular que nunca vai entrar. Não quebra nada e não atrasa a vitrine (o SW registra depois
  do carregamento); o roteiro do passo 3 mede os bytes. Se pesar, o conserto é o layout raiz sem
  os dois e um layout de `(app)`/`(auth)` com eles — spec própria, porque mexe no que faz o app
  funcionar offline.
- **Dado pessoal da cliente da cliente.** Nome, WhatsApp e endereço de quem nunca aceitou os
  termos do Rende passam a ser gravados na conta de outra pessoa. O Rende é operador desse dado, e
  a confeiteira é quem decide sobre ele. A página diz para quem vão os dados; **`/privacidade`
  precisa de um parágrafo sobre isso**, e o texto é de quem conduz o projeto, como o resto dela
  (`#d143`). É portão do deploy da B, como os termos foram da 027.
- **A foto transparente.** PNG de até 200 KB por produto, servido uma vez por versão. Quarenta
  produtos transparentes são 8 MB se a cliente rolar até o fim — com `loading="lazy"`, ela só
  baixa o que vê.
- **`revalidate` num projeto com `@serwist/next` e `--webpack`.** ISR em rota com parâmetro nunca
  rodou neste projeto. Se o `build` não listar a rota como ISR, ela vira dinâmica (uma leitura por
  visita) e a spec registra; o custo de uma confeiteira com cem visitas por dia é irrelevante, e
  o de uma com dez mil é um problema bom.
- **O preço de um minuto atrás.** Entre ela salvar e a página renovar, a cliente vê o preço antigo
  e o pedido grava o novo. A tela de enviado mostra o total que o handler devolveu, que é o
  gravado. É raro, dura um minuto, e o orçamento passa pela confirmação dela de qualquer jeito.
- **O "restam" depende de ela contar o pote.** Um número que só existe se ela conta é um número
  que para de existir quando ela para de contar, e a página degrada para "sem número" sem
  avisar a cliente. O painel é o único lugar que avisa ela.
- **Mais leituras por visita não cacheada** (C e D): as categorias dos combos, as fornadas e os
  pedidos desde a contagem. Continua dentro dos 60 s do `revalidate`; se a D pesar, é a janela
  da contagem que se encurta, e não o cache que se desliga.
- **Esta spec é da fase 3, e a fase 0 ainda não passou no teste.** Como a 030: nada aqui deve ser
  publicado antes de a usuária 0 chegar ao preço sozinha e de a 027–030 saírem do branch.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no fim de **cada** sessão, com o
resultado real relatado, e o `build` listando as rotas novas. Mais o roteiro: passos 1 a 4 e 13
no fim da A; 5 a 12 no fim da B; 14 e 15 no fim da C; 16 e 17 no fim da D; 18 a 20 no fim da
E. A spec só está pronta quando o passo 5 rodar num celular que
nunca entrou no Rende: uma cliente de verdade, sem ninguém explicar, mandando um pedido que chega
em `/pedidos` no dia certo e com o preço certo.
