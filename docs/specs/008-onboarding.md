# Spec 008 · O caminho das primeiras semanas

**Tipo:** onboarding. Um módulo de domínio novo, uma rota nova, um cartão na tela Hoje.
Nenhum módulo de negócio novo, nenhuma conta nova sendo feita.
**Tamanho:** duas sessões — `8A` a espinha (os cinco passos e o estado deles), `8B` o guia
que fica (as respostas, o celular e a instalação) —, com `8C` reservada para o que a 8B
achar e não couber nela.
**Origem:** não é dívida da tabela de `ESTADO.md`. É o pedido de quem conduz o projeto: a
usuária 0 recebe o sistema sem ficar com dúvida sobre o que ele faz e em que ordem se
opera.
**Depende de:** a **5B**, e desta vez a dependência é diferente das outras duas. A 6A e a 7A
passaram na frente dela abrindo caminho novo sobre caminho velho, e o risco ficou registrado.
Esta spec não abre caminho novo: ela **aponta o dedo** para os caminhos existentes, na ordem,
com autoridade. Um passo que estiver torto no navegador passa a ser torto com o sistema
mandando ela ir lá. A cópia dos cinco passos se escreve melhor depois da 5B do que antes,
porque a 5B é a primeira vez que alguém percorre exatamente esta sequência.
**Aprovações pedidas:** um campo novo em `Conta`, uma mudança na tela de login e um item novo
no cromo. Estão listadas ao fim, antes dos riscos.

## Problema

O sistema está completo e nunca se apresenta. São quinze rotas, cinco na navegação inferior,
e uma cadeia de dependência que existe de verdade — configuração → insumos → fichas → pedidos
→ caixa — sem que nada em tela alguma diga que ela existe.

**O primeiro passo é o único que não está na navegação.** `configuracao/geral` é o documento
do qual todos os outros módulos dependem, e a spec 005 já mediu o estrago de não tê-lo:
rateio zerado na ficha, pedido sem forma de pagamento, caixa sem taxa de maquininha. E
`/configuracao` mora no pé da barra lateral no desktop
([BarraLateral.tsx:66-83](../../src/components/layout/BarraLateral.tsx#L66-L83)) e atrás de
uma engrenagem no cabeçalho da tela Hoje no celular
([page.tsx:40-46](<../../src/app/(app)/page.tsx#L40-L46>)) — pelo motivo certo, que é o teto
de cinco destinos de [navegacao.ts](../../src/components/layout/navegacao.ts), e com a
consequência errada: a primeira coisa a fazer é a mais escondida.

**A tela de entrada, numa conta zerada, tem três estados vazios e nenhum deles é o começo.**
`Hoje` renderiza, nesta ordem, o cartão de meta, a agenda e o cartão de compras. Numa conta
recém-criada isso é: uma meta que pede um alvo que ela não tem como calcular ainda (o preço
médio vem das fichas, que não existem), uma agenda sem pedido e um cartão de compras sem
lista. Três convites para três lugares, e o lugar certo não está entre eles.

**Três funcionalidades inteiras dependem de descoberta acidental.** `/compras`,
`/insumos/nota` e `/insumos/contagem` são alcançadas apenas pelo cabeçalho de outra tela. São
exatamente as três que mais economizam trabalho dela — a lista fecha o ciclo do pedido até o
carrinho, a nota dispensa digitar doze insumos à mão, e a contagem é o que impede `/compras`
de comprar o cheio toda semana (`#d63`). Nenhuma delas se anuncia.

**O que a tela ensina, ela ensina uma vez, e some.** `EstadoVazio` ensina a tela em que está,
por desenho, e as frases de consequência ensinam o número onde ele aparece. Nenhum dos dois
responde "o que este sistema faz por mim" ou "por que isto antes daquilo", e nenhum dos dois
é relegível: depois do primeiro insumo cadastrado, "Comece pela farinha" nunca mais aparece —
e ela ainda não sabe o que é uma ficha técnica.

**O que esta spec entrega:** cinco passos em ordem, mostrados pela tela Hoje enquanto não
terminaram e apagados por um ato dela quando terminam; uma página que continua existindo
depois disso e responde o que sobrou; e o primeiro passo saindo de trás da engrenagem.

**O que esta spec não entrega:** tour com balão sobre a tela, dado de exemplo, vídeo, e
conserto nenhum do que a 5B achar. O sistema não muda de comportamento em lugar nenhum —
esta é a primeira spec do projeto que não move um centavo.

---

## O que esta spec decide antes de qualquer código

São sete decisões. Cada uma vira um `D` em `DECISOES.md` na sessão que a executar: as cinco
primeiras são `#d65` a `#d69`, na 8A; as duas últimas são `#d70` e `#d71`, na 8B.

### 1. O guia é um caminho, e não um tour

Um tour é um modal que persegue. `DESIGN.md` reserva modal para confirmação destrutiva, e a
razão vale inteira aqui: um balão sobre a tela toma a decisão de quando ela aprende, e a
resposta certa é "quando ela for fazer aquilo". Um tour também só pode rodar no momento em
que não há nada para fazer, que é o único momento em que ninguém guarda nada.

O que esta spec faz no lugar: **o guia mostra onde ela está e a leva até lá.** Nenhum passo
bloqueia nenhuma tela, nenhum passo é obrigatório, e o sistema inteiro continua funcionando
com o cartão ignorado. Quem pula o passo 1 e cadastra um insumo primeiro tem o passo 2 marcado
como feito e o passo 1 continuando a ser o de agora.

E **o guia não semeia dado.** Nenhum insumo de exemplo, nenhuma ficha de demonstração,
nenhum botão de "carregar dados de teste". `#d17` decidiu que sugestão não é dado; um cookie
de mentira dentro de `/fichas` de uma confeitaria de verdade é pior do que uma lista vazia, e
o dia em que ela apagar o exemplo é o dia em que ela aprende que o sistema inventa coisas.

### 2. São cinco passos, e eles são a navegação

| #   | Passo                        | O que se perde sem ele                                                       | Feito quando                     |
| --- | ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| 1   | Conferir a configuração      | Ficha sem hora, gás e energia; pedido sem forma de pagamento; caixa sem taxa | `configuracao/geral` existe      |
| 2   | Cadastrar o que você compra  | Não há custo por grama, e portanto não há custo de nada                      | existe 1 insumo não arquivado    |
| 3   | Montar a primeira ficha      | O preço continua saindo da intuição, que é o problema que o projeto ataca    | existe 1 ficha não arquivada     |
| 4   | Registrar uma encomenda      | Sem pedido não há agenda, não há lista de compras e não há previsão          | existe 1 pedido não arquivado    |
| 5   | Marcar a encomenda como paga | O dinheiro não entra no caixa, e o mês fica em branco (`#d36`)               | existe 1 transação não arquivada |

**Por que cinco e não seis.** A meta ficou de fora de propósito: ela é a única que já tem
quem a peça, e quem pede é o `CartaoMetaHoje`, que fica logo abaixo do cartão dos primeiros
passos na mesma tela. Um caminho que pedisse a meta duplicaria o convite e atrasaria o
fechamento — e a meta é justamente a coisa que fica melhor **depois** dos cinco, porque o
alvo em doces sai do preço médio das fichas e o alvo em pedidos sai do ticket médio real
(`#d38`). Ela define a meta na segunda semana, com número em vez de palpite.

**Por que pagar é um passo e não uma nota de rodapé do passo 4.** Registrar e receber são dois
dias diferentes e duas telas diferentes, e é exatamente entre os dois que mora a metade do
sistema que ela não vai descobrir sozinha: nenhum número de pedido aparece em `/financeiro`
até alguém tocar em "marcar como pago". Deixar isso implícito é deixar a pergunta "por que o
caixa está zerado se eu vendi?" para o mês seguinte.

**Os cinco passos são a navegação inferior lida em voz alta.** Configuração, Insumos, Fichas,
Pedidos, Caixa — na ordem em que os destinos já estão em `navegacao.ts`, com a configuração
como o zero que não coube lá. Quem termina o caminho aprendeu o menu sem que o menu tenha
sido explicado.

### 3. O estado do começo é perguntado à coleção, e não ao contador

`agregados/global` parece o lugar óbvio: `totalInsumos`, `totalFichas`, `totalClientes`,
`pedidosAbertos`, `ultimoNumeroPedido`. **Não é**, e o motivo é verificável hoje no
repositório: os três primeiros são incrementados no cliente
([insumos.ts:220](../../src/lib/firebase/mutations/insumos.ts#L220),
[fichas.ts:178](../../src/lib/firebase/mutations/fichas.ts#L178),
[clientes.ts:69](../../src/lib/firebase/mutations/clientes.ts#L69)) e **não têm um único
leitor em todo o sistema**; os dois últimos não têm nem escritor — são campos tipados em
[financeiro.ts:206-208](../../src/lib/types/financeiro.ts#L206-L208) que nunca receberam
valor, a mesma doença que a 7A curou em `estoqueMinimo` (`#d61`).

Um caminho decidido por esses números seria o primeiro leitor de um contador que ninguém
nunca conferiu, e o erro cairia do lado caro: **um passo marcado como feito some da lista, e
o que some não volta a ser ensinado.** Um passo marcado como pendente sem razão custa um
toque e uma olhada.

Cada passo pergunta a quem tem a resposta, e todas as cinco perguntas devolvem no máximo um
documento:

| Passo | Pergunta                                                       | Índice                  |
| ----- | -------------------------------------------------------------- | ----------------------- |
| 1     | `useDocumento(docConfiguracao(contaId))`                       | leitura por id          |
| 2     | `colInsumos` · `where('arquivado','==',false)` · `limit(1)`    | campo único, automático |
| 3     | `colFichas` · `where('arquivado','==',false)` · `limit(1)`     | campo único, automático |
| 4     | `colPedidos` · `where('arquivado','==',false)` · `limit(1)`    | campo único, automático |
| 5     | `colTransacoes` · `where('arquivado','==',false)` · `limit(1)` | campo único, automático |

Nenhum índice composto novo, nenhuma escrita, e todas as cinco morrem no dia em que o caminho
termina — que é a decisão seguinte. O custo é de cinco assinaturas de um documento cada,
durante os primeiros dias de uma conta, nas duas telas que as usam.

**Os campos mortos de `agregados/global` não são consertados aqui.** Eles entram na tabela de
dívidas de `ESTADO.md` com o gatilho próprio, e removê-los é uma spec de limpeza que ninguém
pediu.

### 4. Terminar é um ato dela, e fica gravado na conta

`Conta.primeirosPassosEm?: Timestamp`, campo opcional novo — a aprovação de schema desta spec,
e é compatível: documento antigo sem o campo continua válido.

**Por que em `Conta`.** O `AuthProvider` já assina esse documento em toda tela do sistema
([AuthProvider.tsx:110-114](../../src/providers/AuthProvider.tsx#L110-L114)): o campo chega de
graça, sem leitura nova e sem esperar rede. E é literalmente o que o comentário do tipo diz
que o documento é para ser — "propositalmente magro… o valor dele hoje é ser o gancho onde
esses campos cabem sem tocar em mais nada" ([conta.ts:11-15](../../src/lib/types/conta.ts#L11-L15)).

**Por que não `localStorage`.** Não existe uma linha de armazenamento de aparelho no projeto
inteiro — conferido —, e este seria o pior lugar para estrear: ela usa o celular na bancada e
o computador à noite, e um caminho concluído no celular precisa estar concluído no
computador. Terminar em dois aparelhos é terminar duas vezes.

**Por que não deixar puramente derivado ("os cinco estão feitos").** Um caminho que se
recalcula é um caminho que volta. Arquivar o último insumo em janeiro faria o cartão
reaparecer ensinando o que ela faz há meses. O estado do começo é monotônico por natureza —
ela não desaprende — e um campo gravado é a forma honesta disso.

Duas portas escrevem o campo, e nenhuma das duas apaga a página `/comecar`:

- **"Concluir"**, no estado de fechamento do cartão, quando os cinco estão feitos.
- **"Não preciso disto agora"**, disponível desde o primeiro render, terciário e sem
  confirmação. Ela é dona do negócio; se ela diz que não precisa, é porque não precisa.

### 5. O guia não termina quando o caminho termina

O que acaba é o cartão da tela Hoje. `/comecar` continua existindo, e é onde as respostas
ficam para a pergunta que aparece na terceira semana. As entradas permanentes são duas:

- **Desktop:** um item no pé da barra lateral, acima de Configuração, no mesmo bloco.
- **Celular:** um link no pé de `/configuracao` — que é onde a engrenagem do cabeçalho de Hoje
  já leva. São três toques para uma coisa que ela consulta raramente, e é o preço de não
  gastar o sexto destino de uma navegação que tem cinco (`navegacao.ts`).

`/comecar` **não entra na navegação inferior**, pelo mesmo motivo que `/compras` e
`/insumos/nota` não entraram.

### 6. O guia responde o que a tela não tem onde repetir · 8B

A página não reescreve o que o estado vazio já diz. A divisão é: **o estado vazio ensina a
tela em que ele está; o guia ensina o que existe em telas que ela ainda não abriu e por que
uma coisa leva à outra.** Na prática, três seções que nenhuma tela pode ter:

- **A cadeia do dinheiro**, em uma frase por elo: insumo → custo por grama → ficha → preço →
  pedido → caixa. É a resposta para "por que preciso cadastrar tudo isso".
- **O que mais tem aqui**, com as três funcionalidades fora da navegação — lista de compras,
  foto da nota, contagem da despensa —, cada uma com o que faz, em que momento da semana ela
  aparece, e o link.
- **Quando não tem internet**, porque é o comportamento mais surpreendente do sistema e o
  único que não tem tela própria: o que continua funcionando, o que o selo "salvo no aparelho"
  quer dizer, e a ficha nunca aberta que cai em `/offline` (`#d40`, `#d62`).

### 7. Instalar na tela de início é um passo do celular, e some quando já instalado · 8B

A 5A rasterizou os ícones exatamente para este momento (`#d44`), e nada no sistema jamais
convida a instalar. Um bloco em `/comecar`, visível só quando o app **não** está rodando em
`display-mode: standalone`, com o texto escolhido por `matchMedia('(pointer: coarse)')` e
nunca por user-agent: uma variante para o celular, uma para o computador. Instalado, o bloco
não aparece mais — sem campo, sem estado gravado, porque a própria pergunta se responde
sozinha.

---

# Sessão 8A · A espinha

## Escopo

Um módulo de domínio, um campo, uma mutação, um gancho, um cartão, uma rota e uma carona na
tela de login. Nada muda de comportamento em tela existente alguma.

### Módulo novo de domínio: `src/lib/domain/onboarding.ts`

Puro, sem Firebase e sem React, como todo o resto de `domain/`. Os rótulos moram aqui pelo
mesmo motivo que os rótulos de status do pedido e `ROTULO_CORREDOR` moram: são parte da regra,
não da renderização.

```ts
export type EstadoPasso = "FEITO" | "AGORA" | "DEPOIS";

export type IdPasso =
  "CONFIGURACAO" | "INSUMOS" | "FICHAS" | "PEDIDOS" | "CAIXA";

/** O que o sistema sabe sobre a conta. Cinco perguntas, cinco respostas. */
export interface FatosDoComeco {
  temConfiguracao: boolean;
  temInsumo: boolean;
  temFicha: boolean;
  temPedido: boolean;
  temLancamento: boolean;
}

export interface PassoDoComeco {
  id: IdPasso;
  numero: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  /** Uma frase: o que se perde sem ele. Nunca uma instrução de clique. */
  porque: string;
  /** O que a tela vai pedir dela. Uma linha, não um manual. */
  oQueEsperar: string;
  href: string;
  rotuloAcao: string;
  estado: EstadoPasso;
}

export function passosDoComeco(fatos: FatosDoComeco): PassoDoComeco[];
export function proximoPasso(passos: PassoDoComeco[]): PassoDoComeco | null;
export function progressoDoComeco(passos: PassoDoComeco[]): {
  feitos: number;
  total: number;
  concluido: boolean;
};
```

As regras que o domínio detém, e que por isso têm teste:

- **A ordem é fixa** e não depende dos fatos.
- **`FEITO` é o fato**, em qualquer posição: quem cadastrou insumo antes de salvar a
  configuração tem o passo 2 feito.
- **Existe no máximo um `AGORA`**, e ele é o primeiro passo não feito. Todo passo não feito
  depois dele é `DEPOIS`.
- **`concluido` é os cinco feitos**, e `proximoPasso` devolve `null` nesse caso.

### O que muda no schema

`Conta.primeirosPassosEm?: Timestamp`. É a aprovação pedida, e é compatível — nenhum documento
existente fica inválido, e não há esquema `zod` de `Conta` para acompanhar: o documento é
escrito pelo script `conceder-acesso.mjs` e lido pelo `AuthProvider`, e nunca por formulário.
Nenhum índice novo, nenhuma regra de segurança nova: `firestore.rules` já dá `read, write` no
documento da conta a quem tem a claim
([firestore.rules:28](../../firestore.rules#L28)), o que esta spec **não** amplia.

### A mutação: `src/lib/firebase/mutations/conta.ts`

Arquivo novo, com uma função:

```ts
export function concluirPrimeirosPassos(contaId: string): Promise<void>;
```

`updateDoc` com `{ v: VERSAO_SCHEMA, primeirosPassosEm: Timestamp.now() }`. **Nunca
`serverTimestamp()`** — é a invariante de offline, e um `null` no cache local aqui faria o
cartão voltar. A tela **não espera a promessa**: some no toque, como `#d40` e `#d62`. Falhar
sem rede não é um caso a tratar; a escrita fica na fila do Firestore e sobe depois.

### O gancho: `src/lib/hooks/useComeco.ts`

Cinco assinaturas — uma por documento/consulta da tabela da decisão 3 —, todas memoizadas com
`useMemo` e **todas `null` quando o caminho já terminou**, o que `useColecao(null)` e
`useDocumento(null)` já sabem tratar sem abrir nada
([useColecao.ts:67-69](../../src/lib/hooks/useColecao.ts#L67-L69)).

```ts
export function useComeco(): {
  passos: PassoDoComeco[];
  progresso: { feitos: number; total: number; concluido: boolean };
  proximo: PassoDoComeco | null;
  /** true enquanto qualquer das cinco perguntas não respondeu. */
  carregando: boolean;
  /** `primeirosPassosEm` já gravado: não há caminho a mostrar. */
  encerrado: boolean;
};
```

`encerrado` sai de `conta?.primeirosPassosEm != null`, e é ele que desliga as cinco.

### O cartão: `src/components/comecar/CartaoPrimeirosPassos.tsx`

Renderiza **nada** em três casos: `encerrado`, `carregando` (para não piscar um "0 de 5" que
some no instante seguinte) e sem `contaId`.

Enquanto o caminho corre:

- Cabeçalho: **"Primeiros passos"** e o progresso em texto, `"2 de 5"`. O progresso também
  aparece como cinco segmentos, os feitos preenchidos — **cinco segmentos, e não uma barra de
  porcentagem**: a unidade é o passo, e uma barra em 40% de um caminho de cinco é uma
  precisão que não existe.
- **O próximo passo, sozinho**: título, a frase do `porque`, e a ação primária apontando para
  o `href`. No celular, 52px de altura.
- Uma ação terciária, **"Ver os cinco passos"**, para `/comecar`.
- Uma ação terciária discreta, **"Não preciso disto agora"**.

Fechado o quinto:

- Título de fechamento sem festa e sem número inventado — o sistema não parabeniza uma adulta
  por ter usado o produto dela. Uma frase que diz o que ela tem agora ("o custo dos seus
  doces, a agenda da semana e o caixa do mês estão de pé"), e **"Concluir"** como ação
  primária.

Posição: **acima do `CartaoMetaHoje`**, em `(app)/page.tsx`, enquanto existir. Enquanto o
caminho não terminou, "o que eu faço agora" vem antes de "como estou indo" — e quando ele
termina o cartão some e a tela Hoje volta a ser exatamente o que é hoje, sem uma linha de
diferença.

### A rota `/comecar`

Um arquivo em `src/app/(app)/comecar/page.tsx`, dentro do shell, e os componentes em
`src/components/comecar/`. Estático, como as outras quatorze.

**A mesma estrutura, dois arranjos** (`DESIGN.md`), e é aqui que mora a otimização que esta
spec precisa entregar nos dois tamanhos:

|          | Celular (< 768px)                                                         | Desktop (≥ 1024px)                                                                           |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Entrada  | O cartão na tela Hoje, que é onde o app abre                              | O item no pé da barra lateral, sempre visível                                                |
| Os cinco | Um por bloco: o `AGORA` **aberto**, os outros fechados e abrindo no toque | Os cinco **abertos ao mesmo tempo** — ver o mapa inteiro é o que a tela grande tem de melhor |
| Ação     | Primária de 52px dentro do passo aberto, uma por vez                      | Uma ação por bloco, alcançável por `Tab` com o anel de foco do `DESIGN.md`                   |
| Volta    | Navegação inferior → Hoje → o cartão já mostra o próximo                  | A barra lateral nunca sumiu: ela volta de onde quiser                                        |
| Largura  | Coluna do shell; o `pb-24` do `AppShell` já reserva a navegação           | Coluna do shell, sem largura nova (`#d42`)                                                   |

O ciclo do celular é o que decide o desenho: **fazer o passo tira ela desta tela.** Ela toca
na ação, vai para `/configuracao`, salva, e volta pela navegação inferior para a tela Hoje —
onde o cartão já mostra o passo 2. A página `/comecar` é a visão do mapa; o cartão é o
retorno. No desktop os dois convivem, e por isso o cartão pode ser o mesmo componente sem
mudança nenhuma.

Cada bloco de passo carrega: número, título, estado, o `porque`, o `oQueEsperar` e a ação.
**O estado tem ícone e texto, nunca só cor** — feito, agora, depois —, que é a invariante que
vale duplamente aqui, porque o vinho de "agora" e o verde de "feito" não podem ser a única
diferença.

### Carona: a senha esquecida

`(auth)/login` não tem recuperação de senha — conferido: a tela só tem e-mail, senha e o
botão. Sem isso, a única usuária do sistema, trancada para fora, depende de alguém com acesso
ao console do Firebase. **É a única falha do produto que ela não consegue contornar por
dentro dele**, e é uma spec de onboarding que descobre isso, porque onboarding é a única
sessão que pergunta "o que acontece na segunda-feira em que nada dá certo".

`sendPasswordResetEmail` é do `firebase/auth`, que já está instalado: um link abaixo do botão,
um estado de envio, uma frase de retorno que não revela se o e-mail existe, e os códigos de
erro traduzidos no mesmo mapa `MENSAGENS` que
[AuthProvider.tsx:45-55](../../src/providers/AuthProvider.tsx#L45-L55) já mantém. Nenhuma
dependência nova. É carona do mesmo tipo da terceira da 5A, e é a única mudança em `(auth)`
nesta spec.

## Caso de aceite, estado por estado

Uma conta zerada — `contas/mycookies` existindo, `configuracao/geral` ausente, todas as
coleções vazias. O que o cartão da tela Hoje diz, em cada ponto:

| Depois de                        | Progresso | O passo de agora             | A ação leva para |
| -------------------------------- | --------- | ---------------------------- | ---------------- |
| Entrar pela primeira vez         | 0 de 5    | Conferir a configuração      | `/configuracao`  |
| Salvar a configuração            | 1 de 5    | Cadastrar o que você compra  | `/insumos`       |
| Cadastrar a farinha              | 2 de 5    | Montar a primeira ficha      | `/fichas`        |
| Salvar a ficha do cookie         | 3 de 5    | Registrar uma encomenda      | `/pedidos`       |
| Confirmar o pedido de 20 cookies | 4 de 5    | Marcar a encomenda como paga | `/pedidos`       |
| Marcar como pago                 | 5 de 5    | — (fechamento)               | "Concluir"       |
| Tocar em "Concluir"              | —         | o cartão não existe mais     | —                |

E o caso fora de ordem, que o teste também exige: numa conta zerada, **cadastrar um insumo
antes de salvar a configuração** devolve `[AGORA, FEITO, DEPOIS, DEPOIS, DEPOIS]` — progresso
"1 de 5", passo de agora ainda o 1.

## Critérios de aceite 8A

- [x] Numa conta zerada, a tela Hoje mostra o cartão **acima** do cartão de meta, com "0 de 5"
      e a ação apontando para `/configuracao`.
- [x] Cada uma das cinco escritas do caso de aceite move o cartão para o passo seguinte **sem
      recarregar a página** — são assinaturas, não leituras avulsas.
- [x] Com os cinco feitos, o cartão mostra o fechamento, e "Concluir" grava
      `primeirosPassosEm` com `Timestamp.now()` e `v`.
- [x] Depois de concluído, o cartão não volta — nem ao recarregar, nem em outro aparelho, nem
      ao arquivar o último insumo.
- [x] "Não preciso disto agora" grava o mesmo campo, sem confirmação e sem apagar `/comecar`.
- [x] Com `primeirosPassosEm` gravado, **nenhuma das cinco assinaturas é aberta** — conferido
      na aba de rede do navegador, e não só por leitura do código.
- [x] `/comecar` alcançável pela barra lateral (desktop) e pelo pé de `/configuracao`
      (celular), antes e depois da conclusão.
- [x] Fora de ordem: o insumo antes da configuração marca o passo 2 e mantém o 1 como o de
      agora.
- [x] Em 360px: alvo mínimo de 44×44px, ação primária de 52px, nenhuma rolagem horizontal, e
      a navegação inferior não cobrindo o último bloco de `/comecar`.
- [x] **Tema claro conferido**, que é o padrão (`#d13`), e o escuro depois.
- [x] Estado de cada passo legível sem cor: ícone ou palavra em todos os três.
- [x] Login: "Esqueci minha senha" envia o e-mail, diz a mesma frase existindo ou não o
      cadastro, e nenhum código do Firebase vaza para a tela.
- [x] `tests/domain/onboarding.test.ts` cobrindo os cinco estados da tabela, o caso fora de
      ordem, o único `AGORA` e a conta concluída.
- [x] Portão de conclusão passando: lint, typecheck, test, build.

---

# Sessão 8B · O guia que fica

Nenhum estado novo, nenhuma escrita nova. O que entra é conteúdo durável em `/comecar`,
abaixo dos cinco passos, e a passagem em celular.

## Escopo

### 1. A cadeia do dinheiro

Seis elos, uma frase cada, na linguagem da confeitaria e não na do software. É a seção que
responde "por que preciso cadastrar tudo isso" — a pergunta que faz uma pessoa abandonar um
sistema na terceira noite.

```
O que você compra  →  quanto custa cada grama  →  quanto custa o doce pronto
   →  por quanto vale a pena vender  →  o que foi combinado com a cliente
   →  o que de fato entrou no mês
```

Cada elo nomeia a tela onde ele mora, e o link. Nenhum número de exemplo: números de
mentira numa página de ajuda envelhecem e passam a contradizer a tela.

### 2. O que mais tem aqui

As três funcionalidades que não estão na navegação, cada uma em três linhas — o que faz,
quando na semana ela aparece, e onde mora:

- **Lista de compras** (`/compras`): os pedidos confirmados viram o carrinho do mercado, já em
  pacotes e em reais, com o preço corrigível na frente da gôndola.
- **Foto da nota** (`/insumos/nota`): a nota da compra vira uma lista conferível que cadastra
  ou atualiza os insumos de uma vez, e lança a saída no caixa.
- **Contagem da despensa** (`/insumos/contagem`): o que tem hoje, em uma tela e uma escrita —
  e por que a lista de compras deixa de descontar um número velho (`#d63`), dito na voz dela
  e não na do sistema.

A meta do mês ganha um parágrafo aqui, e não um passo: onde se define, e por que ela fica
melhor depois de algumas fichas e alguns pedidos.

### 3. Quando não tem internet

O comportamento mais surpreendente do produto e o único sem tela própria. O que continua
funcionando (quase tudo), o que exige rede e diz isso (a leitura de nota, `#d50`), o que o
selo "salvo no aparelho" significa, e a ficha nunca aberta que cai em `/offline`.

### 4. Instalar na tela de início

O bloco da decisão 7: só quando não está em `display-mode: standalone`, texto por
`matchMedia('(pointer: coarse)')`, uma variante para o celular (compartilhar → Adicionar à
Tela de Início no iPhone; o próprio navegador oferece no Android) e uma para o computador.
Instalado, não aparece mais.

### 5. As entradas permanentes

- `BarraLateral`: item **"Como funciona"** acima de Configuração, no mesmo bloco do pé, com o
  mesmo tratamento de ativo.
- `TelaConfiguracao`: link no pé, que é a entrada do celular.

## Critérios de aceite 8B

- [ ] `/comecar` responde, sem sair da página, o que cada uma das três funcionalidades fora da
      navegação faz e onde mora — com link que abre a tela certa.
- [ ] A cadeia do dinheiro cabe em uma tela de 360px sem rolagem horizontal e sem número
      inventado.
- [ ] O bloco de instalar aparece no navegador e **some** com o app instalado na tela de
      início, nos dois sistemas.
- [ ] "Como funciona" na barra lateral e no pé da configuração, com o estado ativo correto.
- [ ] A página inteira vista no **tema claro** e em **360px**, com captura arquivada — o
      mesmo protocolo da 5B, aplicado à tela que a 5B não viu porque ela não existia.
- [ ] Leitura por teclado no desktop: `Tab` percorre os cinco passos e as ações na ordem
      visual, com foco visível.
- [ ] Nenhuma seção repete o texto de um `EstadoVazio` existente. Onde a tentação aparecer, o
      guia manda para a tela e a tela ensina.
- [ ] Portão de conclusão passando.

---

# Sessão 8C · reservada

Para o que a 8B achar e não couber nela — em especial, qualquer dúvida que só apareça quando
a usuária 0 estiver de fato operando. Se nada sobrar, a 8C não acontece, como a 6C e a 7C não
aconteceram.

---

## Fora de escopo, nas duas sessões

- **Tour com balão, overlay, spotlight ou modal de boas-vindas.** Decisão 1, e `DESIGN.md`.
- **Dado de exemplo, conta de demonstração, botão de "carregar dados fictícios".** `#d17`.
- **Vídeo, GIF, animação explicativa.** O `prefers-reduced-motion` do projeto e o peso de um
  app que precisa abrir offline na bancada.
- **Gamificação:** selo, sequência de dias, confete, "parabéns". Anti-referência do
  `PRODUCT.md`.
- **Bloquear qualquer tela por passo não feito.** Nenhum passo é obrigatório.
- **Mexer nos cinco destinos da navegação inferior.** O teto continua sendo cinco.
- **A meta virando passo.** Decisão 2, e o `CartaoMetaHoje` já a pede.
- **Consertar os campos mortos de `agregados/global`.** Vira linha na tabela de dívidas.
- **Conserto do que a 5B achar.** Isso é a `5C`, e tem spec própria.
- **Onboarding de uma segunda usuária ou de uma conta com dado herdado.** É o dia do segundo
  cliente, junto de `#d16`.
- **Qualquer dependência nova** — `react-joyride`, `driver.js`, `intro.js` e parentes.

## Decisões que esta spec toma, e que são fáceis de rejeitar

| #   | Decisão                                          | A alternativa, e o que ela custa                                                                 |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| d65 | Caminho, e não tour; e nada de dado de exemplo   | Tour: ensina no momento em que ela não vai usar, e vira modal perseguindo tela                   |
| d66 | Cinco passos, terminando no caixa; meta fora     | Seis passos: duplica o convite do `CartaoMetaHoje` e pede alvo antes de haver preço médio        |
| d67 | O estado é perguntado à coleção, não ao contador | `agregados/global`: um contador sem leitor, com dois campos nunca escritos, decidindo o que some |
| d68 | Terminar é um ato, gravado em `Conta`            | `localStorage`: termina uma vez por aparelho. Derivado puro: o cartão volta em janeiro           |
| d69 | O cartão acaba; a página fica                    | Sumir com tudo: a terceira semana não tem onde perguntar                                         |
| d70 | O guia não repete o estado vazio                 | Repetir: duas cópias da mesma frase divergem, e a errada é sempre a que ela leu                  |
| d71 | Instalar é bloco condicional, sem estado gravado | Campo em `Conta`: um booleano para uma pergunta que o navegador já responde                      |

## Riscos

**O risco real é a 8A ensinar um caminho que ninguém percorreu.** Até a 5B rodar, os cinco
passos são cinco afirmações sobre telas que nunca gravaram um número de verdade. Um guia que
aponta com autoridade para um passo quebrado é pior do que não apontar, porque transfere a
culpa para quem seguiu a instrução. **Mitigação:** a 8A roda depois da 5B, e a cópia do
`porque` e do `oQueEsperar` de cada passo se escreve a partir do que a 5B viu acontecer, e não
do que a spec imagina.

**O risco silencioso é o cartão marcar um passo como feito antes da hora.** O passo 2 fecha com
um insumo cadastrado, o 3 com uma ficha salva — e uma ficha salva sem item nenhum também é uma
ficha. O caminho não confere qualidade, e nem deveria: ele diz onde ela está, não se ela fez
bem. A tela é quem cobra o resto, e continua cobrando.

**O risco de escopo é a frase "não pode ficar com dúvidas".** Ela não tem fundo: sempre cabe
mais uma seção. O limite desta spec é declarado — os cinco passos, as três funcionalidades
escondidas, a cadeia do dinheiro, o offline e a instalação. Dúvida nova que aparecer com a
usuária 0 operando é `8C`, e entra com o texto da pergunta que ela fez.

**O risco barato é o custo de leitura.** Cinco assinaturas de no máximo um documento, só nas
duas telas do caminho, e só até o dia em que ele termina.

## Aprovações pedidas

1. **`Conta.primeirosPassosEm?: Timestamp`** — campo novo, compatível. Documento antigo sem o
   campo continua válido, e nenhuma migração é necessária.
2. **A tela de login ganha recuperação de senha** (carona da 8A). Muda `(auth)`, usa
   `sendPasswordResetEmail` do SDK já instalado, e não traz dependência nova. É a única falha
   do produto que a usuária não consegue contornar por dentro dele.
3. **Uma rota nova fora da navegação inferior (`/comecar`) e um item novo no pé da barra
   lateral.** Não é schema nem regra, e está aqui porque mexe no cromo do aplicativo, que é a
   parte que a marca fala mais alto.

Nenhuma regra de segurança muda — `firestore.rules` já permite escrever no documento da conta
para quem tem a claim, e esta spec não amplia isso. Nenhum índice novo. Nenhuma dependência de
produção entra.
