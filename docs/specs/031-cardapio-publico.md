# Spec 031 · Cardápio público com link de pedido

**Tipo:** a segunda spec da fase 3 do `docs/saas/ROADMAP.md`, e o primeiro pedaço do Rende que
alguém de fora do negócio abre. Um link que a confeiteira põe na bio do Instagram e manda no
WhatsApp; quem abre vê os produtos que ela escolheu, com foto e preço, monta o pedido e manda. O
pedido cai em `/pedidos` como orçamento, e a conversa continua onde sempre esteve: no WhatsApp.
**Tamanho:** duas sessões. A **A** é a vitrine — o tipo, o domínio, o painel "Seu cardápio" em
`/configuracao`, a página `/c/{contaId}` só de leitura e a rota da foto. A **B** é o pedido — o
formulário da página, `POST /api/cardapio/pedido`, o aviso no WhatsApp e o selo "Pelo cardápio"
no app dela. **A pode sair sozinha**: uma vitrine com "Falar no WhatsApp" já é um cardápio; a B
acrescenta o carrinho sem jogar fora nada da A.
**Origem:** roadmap, fase 3, 031, e `docs/saas/CLAUDE.md` §4 ("catálogo público com link de
pedido" como upsell natural). O gatilho de lá é **cliente pagante pedindo**, e ele não aconteceu:
esta spec está escrita antes do caso, como a 030 esteve. Quem abrir esta spec para codificar
confere primeiro se "dá para eu mandar um link com meus produtos?" já foi perguntado por alguém
que paga. Se não foi, fecha o arquivo.
**Depende de:** a 017 (foto e descrição do produto, `ConfiguracaoGeral.contato`), a 010
(`telefoneParaWhatsApp`, `linkDoWhatsApp`), a 028 (`situacaoDaConta`, `ocultarFeitoCom`), a 029
(`status: "ENCERRADA"`) e a 030 (`ehDona` e a configuração só da dona). Tudo codificado.
**Aprovações pedidas:** (1) **schema aditivo** — `ConfiguracaoGeral.cardapio` e
`Pedido.origem`, os dois opcionais; nada muda de forma em documento gravado; (2) **a primeira
rota que escreve sem login** — `POST /api/cardapio/pedido`, com Admin SDK, só em
`contas/{id}/pedidos` (seção 1, `#d160` e `#d161`); (3) **o que sai para fora**, campo por campo
(seção 1, `#d158`); (4) nenhuma regra de segurança muda, nenhuma dependência entra — **e isso é
diferente do que o roadmap previa**, que pedia aprovação para "a primeira regra pública do
sistema" (`#d158`).
**Decisões a registrar:** `#d158` (o cardápio é lido pelo servidor, e a regra continua sem nada
público), `#d159` (o cardápio é escolha dela, e mora na configuração), `#d160` (o pedido do
cardápio nasce orçamento, com o preço do servidor), `#d161` (o freio é um teto de orçamentos em
aberto, e não um captcha), `#d162` (a foto sai por rota própria, e não dentro da página).

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

**O que esta spec não entrega:** pagamento pela página, taxa de entrega calculada, "esgotado",
dias e horários de funcionamento, combo à escolha e venda por peso na página, endereço bonito
(`/c/mycookies` para toda conta), a cliente acompanhando o pedido depois de mandar. Está tudo em
"Fora de escopo", com o porquê.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra**, para a dona, **uma linha** na prateleira do fim de `/configuracao` ("Seu cardápio"),
  ao lado de "Quem te ajuda", com a legenda "Fechado" até ela abrir. Nenhum campo no editor de
  produto, nenhum cartão na tela Hoje, nenhuma faixa: quem está começando não vê o cardápio até
  ir procurá-lo, e a conta nasce com ele fechado.
- **Entra**, em `/pedidos` e no editor de pedido, o selo "Pelo cardápio" — **só** no pedido que
  veio de lá. Quem não abriu o cardápio nunca o vê.
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

---

## Critérios de aceite

**A**

- [ ] `ConfiguracaoGeral.cardapio` e `Pedido.origem` existem, opcionais; nenhum documento gravado
      muda de forma.
- [ ] `domain/cardapio.ts` com `entraNoCardapio`, `montarCardapio` e `mensagemDeContato`, sem
      Firebase e sem React, com o teste das chaves (`#d158`).
- [ ] `/c/[contaId]` renderiza no servidor, guarda 60 s, e dá a mesma página de não encontrado
      para os cinco casos de `null`.
- [ ] A rota da foto devolve bytes com `Cache-Control` imutável e 404 fora do cardápio; a página
      não tem `data:` URL nenhum.
- [ ] "Seu cardápio" em `/configuracao`, só para a dona: interruptor com texto, link com copiar e
      compartilhar, `checkbox` por produto que entra, o limite, a linha sobre combo e peso, o
      aviso sem telefone. Cada toque grava por `salvarCardapio`, despachado.
- [ ] `firestore.rules` e `firestore.indexes.json` intocados.

**B**

- [ ] `esquemaPedidoDoCardapio`, `pedidoDoCardapio`, `mensagemDeAviso`, `hojeEmBrasilia` e
      `meiaNoiteEmBrasilia` testados, com o caso de aceite número por número.
- [ ] `POST /api/cardapio/pedido`: esquema, pote de mel sem gravar, `fechado` pela mesma
      `montarCardapio`, teto por `count()`, preço e custo da ficha, `satisfies Omit<Pedido,
    "id">`, um `set` e nada mais.
- [ ] O formulário da página com o passo de quantidade, o painel do pedido, os erros em
      `role="alert"` sem perder o que foi digitado, e o aviso no WhatsApp depois de enviar.
- [ ] Selo "Pelo cardápio" em `LinhaPedido` e no `EditorPedido`, com ícone e texto.
- [ ] Os passos 1 a 13 do roteiro passam; o 5 prova a data e o 6 prova o preço.

**As duas**

- [ ] Alvo de 44 px, primário de 52 px, nada só por cor.
- [ ] `lint`, `typecheck`, `test` e `build` passam; o `build` lista `/c/[contaId]` (ISR), a rota da
      foto e `/api/cardapio/pedido` (dinâmicas).
- [ ] `#d158` a `#d162` escritos; `ESTADO.md` e `ROADMAP.md` atualizados.

---

## Fora de escopo

- **Pagamento pela página** (Pix com QR, cartão). É dinheiro entrando sem ela confirmar o pedido,
  e é outro provedor (Stripe Connect, ou um PSP de Pix) com a conta dela, não a do Rende. O
  orçamento é justamente o passo em que ela diz se dá.
- **Taxa de entrega calculada** (por bairro, por distância). Taxa zero e "a {quem} combina com
  você" é o que ela faz hoje no WhatsApp.
- **"Esgotado" e estoque na página.** A 013 sabe quanto está pronto, mas o cardápio de encomenda
  vende o que ainda vai ser feito. Ela desmarca o produto no painel quando não der.
- **Dias e horários de funcionamento, antecedência configurável, pedido mínimo.** Amanhã e 90
  dias são constantes; ela recusa o dia que não dá, na conversa. Viram campo com o primeiro
  pedido real que ela precisar recusar toda semana.
- **Combo à escolha e venda por peso na página** (`#d159`). A tela de escolha da 014 do lado da
  cliente, e quantidade fracionária com preço por quilo.
- **Endereço bonito** (`/c/mycookies` para toda conta). Índice global fora de `contas/` (`#d158`).
- **A cliente acompanhando o pedido** (link de status, "sua encomenda está pronta"). Exige
  identificar a cliente sem login, e o WhatsApp já é o canal.
- **Aviso para a dona** por push, e-mail ou notificação. O aviso é a cliente, pelo WhatsApp
  (`#d77`), e o pedido está em `/pedidos` na próxima vez que ela abrir.
- **Cliente cadastrada pelo link.** Escrita pública em `clientes` (`#d160`).
- **Captcha e limite por IP** (`#d161`).
- **Indexação em busca e imagem de prévia** (`og:image`). O link é para quem ela manda; a prévia
  do WhatsApp mostra título e frase, e é o que basta.
- **Preço de cardápio diferente do preço da ficha** (promoção). Um preço é um preço.
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
- **Esta spec é da fase 3, e a fase 0 ainda não passou no teste.** Como a 030: nada aqui deve ser
  publicado antes de a usuária 0 chegar ao preço sozinha e de a 027–030 saírem do branch.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no fim de **cada** sessão, com o
resultado real relatado, e o `build` listando as rotas novas. Mais o roteiro: passos 1 a 4 e 13
no fim da A; 5 a 12 no fim da B. A spec só está pronta quando o passo 5 rodar num celular que
nunca entrou no Rende: uma cliente de verdade, sem ninguém explicar, mandando um pedido que chega
em `/pedidos` no dia certo e com o preço certo.
