# Spec 023 · Sair sem salvar

**Tipo:** cromo mais um hook — a primeira spec da fase 1 do `docs/saas/ROADMAP.md`, e a que o
roadmap põe na frente das outras "porque perder trabalho em silêncio é o que mais mina a
confiança de quem está operando sozinha". Um hook (`useGuardaDeSaida`), um primitivo novo
(`Confirmacao`, a primeira janela modal do sistema), cinco telas que hoje descartam em silêncio
(produto, pedido, configuração e as duas contagens), um `router.push` que vira `Link`
(`PainelFornada`), e de carona o foco no primeiro campo com erro, que a 033-C deixou aqui.
**Nenhum campo, nenhuma rota, nenhuma regra, nenhum índice, nenhuma dependência, nenhum arquivo
de `src/lib/domain/`.**
**Tamanho:** uma sessão. O que pesa é o voltar do navegador — o App Router do Next não tem como
cancelar uma navegação de histórico, e a saída é uma entrada-sentinela (`#d132`) — e ver as
cinco telas no aparelho, com o gesto de voltar do Android.
**Origem:** o roadmap (fase 1, 023: "um hook, quatro editores"); as três linhas da tabela de
dívidas do `ESTADO.md` (pedido, configuração e contagem, todas "mesma dívida do editor de
produto"); o item 1 de "Depois da 017, por ordem de valor"; e as duas coisas que a 033-C
recusou por serem "da mesma spec da guarda de edição": o Salvar no cabeçalho com guarda, e o
foco no primeiro campo com erro.
**Depende de:** nada. Roda antes ou depois de publicar a 033 e a 034; não toca no que elas
tocaram além de dois `Botao` dentro de um `<dialog>`.
**Aprovações pedidas:** nenhuma. **Três decisões a registrar**, `#d132` (o voltar entra pela
sentinela no histórico), `#d133` (a modal de confirmação destrutiva é o `<dialog>` nativo) e
`#d134` (sujo é "salvar gravaria algo diferente do que abriu", e a contagem semeada conta).

---

## Problema

Cinco telas do sistema recebem digitação e só gravam no Salvar: o editor de produto
(`FormularioFicha`, 1.500 linhas de formulário), o de pedido (`FormularioPedido`), a
configuração (`TelaConfiguracao`), a contagem da despensa (`TelaContagem`) e a do que está
pronto (`TelaContagemPronto`). Nenhuma das cinco sabe quando ela está saindo. Um toque em
"Produtos" no cabeçalho, em "Hoje" no menu de baixo, no gesto de voltar do Android ou no F5 do
notebook joga fora o que estava na tela, sem uma palavra. Com uma usuária que construiu o
sistema ao lado, isso foi "se acontecer de verdade" por dezoito specs. Com a segunda conta
entrando por um script e ninguém do lado, é a primeira coisa que faz o app parecer que não
guarda o que ela faz.

O caso concreto que a fase 1 vai produzir: a confeiteira abre a ficha-modelo da biblioteca,
troca o preço do chocolate, mexe no rendimento, olha o preço mudar no rodapé, e toca "Produtos"
para ver a lista. O preço que ela acabou de descobrir sumiu. Ela não sabe se o app quebrou ou
se ela errou; nas duas leituras, o app não é confiável.

Três coisas o repositório mostra:

1. **Só a configuração tem um sinal**, a faixa "Você mudou coisas que ainda não foram salvas"
   com o botão fixo no celular. O sinal existe; a saída continua livre.
2. **As saídas são de três naturezas.** O link (`LinkVoltar`, `NavegacaoInferior`,
   `BarraLateral`, "Abrir a folha do orçamento", "Contar o pote" no painel de fornada); o
   histórico (voltar do navegador, o gesto do Android — a saída mais comum no aparelho dela); e
   o descarregamento (F5, fechar a aba). Cada uma tem um mecanismo diferente, e o App Router
   não oferece nenhum: `router.events` é do Pages Router, e um `popstate` não pode ser
   cancelado.
3. **`BlocoOrcamento` diz, em comentário, "o formulário não sabe se está sujo"** — e por isso a
   folha do orçamento avisa em texto que "mostra o que está salvo" em vez de perguntar. O
   `#d107` aceitou a divergência entre o gravado e a tela porque não havia como saber. Com esta
   spec há.

**O que esta spec entrega:** um diálogo — "Sair e perder o que você mudou?" — antes de qualquer
saída das cinco telas enquanto houver o que perder, pelas três portas; um voltar do navegador
que não deixa entrada duplicada no histórico; e o foco no primeiro campo com erro quando o
Salvar recusa.

**O que esta spec não entrega:** rascunho persistente, salvar automático, guarda nos painéis
(insumo, transação, meta, cliente, forma de pagamento), Salvar no rodapé do editor.

---

## O que sai da frente de quem está começando (`#d113`)

- **Entra um diálogo**, e ele só aparece quando ela está saindo com trabalho não salvo. A
  ficha-modelo aberta e fechada sem tocar em nada **não pergunta**: é o critério de aceite
  número um, e o roteiro o testa antes de tudo. Na frente de quem está começando, nada.
- **Sai uma caçada**: quando o Salvar recusa, o foco vai ao campo com erro em vez de ela
  procurar o vermelho num formulário de dez blocos. A 033-C já levou o `role="alert"` para
  baixo do cabeçalho; esta leva o dedo ao campo.
- **Sai uma frase que não muda nada**: "A folha mostra o que está salvo. Salve o pedido antes
  de abrir", em `BlocoOrcamento`, deixa de ser a única defesa e passa a ser explicação — fica,
  porque continua verdadeira, mas o link passa a perguntar.

---

## 1 · O que esta spec decide

### O voltar do navegador entra pela sentinela — `#d132`

O App Router não cancela navegação de histórico: `popstate` chega, o Next despacha o
`ACTION_RESTORE` e a tela desmonta. Não há `useBlocker`. A Navigation API (`navigate` com
`preventDefault`) resolveria isso em uma linha, e não existe no Safari.

A saída é a mais antiga do problema: **quando a tela fica suja, o hook empurra uma entrada a
mais no histórico com a mesma URL** (`history.pushState(null, "", location.href)`). O Next
copia o estado interno dele (`__NA` e a árvore) para a entrada nova e trata o `RESTORE` da
mesma URL como nada. Quando ela aperta voltar, o navegador consome a sentinela — a URL não
muda, o formulário não desmonta, e o `popstate` é o sinal do hook para abrir o diálogo.
"Continuar aqui" empurra a sentinela de novo; "Sair sem salvar" aperta `history.back()`, agora
para a página de antes.

O preço é uma entrada a mais no histórico enquanto a tela está suja, e a spec o paga inteiro:
**toda saída voluntária desarma a sentinela antes de navegar** — o `navegar(href)` do hook
chama `history.back()`, espera o `popstate` da própria guarda e só então faz `router.push`.
Sem isso, salvar deixaria o editor duas vezes no histórico, e "voltar" da lista precisaria de
dois toques. O roteiro (passo 4) é o que prova que não precisa.

### A modal de confirmação destrutiva é o `<dialog>` nativo — `#d133`

O `DESIGN.md` reserva a modal centralizada para confirmação destrutiva: "título com a
consequência, dois botões, sem X". Nunca houve uma — as quatro confirmações de arquivar são
caixas inline, e ficam. Esta é a primeira, e nasce como `<dialog>` com `showModal()`: o
navegador dá o foco preso, o `Escape`, o fundo, o `inert` do resto da página e, no Android,
**o gesto de voltar fechando o diálogo em vez de sair** (é um `CloseWatcher`). São as sessenta
linhas que o `Painel` escreve à mão, de graça, e o `Painel` não serve: folha inferior é para
formulário, e aqui a pergunta cabe em duas frases.

### Sujo é "salvar gravaria algo diferente do que abriu" — `#d134`

Uma regra para as cinco telas, cada uma com a sua assinatura:

| Tela                 | Assinatura                                                | Sujo quando                                                    |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `FormularioFicha`    | `JSON.stringify(valores)` do `useWatch` que a tela já tem | difere do `JSON.stringify(valoresIniciais(...))` da abertura   |
| `FormularioPedido`   | `JSON.stringify(valores)`                                 | difere da abertura; `status` e `pagoEmISO` **não** entram      |
| `TelaConfiguracao`   | `assinatura(estado)`, que já existe                       | difere da `base`, que passa a ser sempre uma string            |
| `TelaContagem`       | `valores` (o que `salvar()` gravaria)                     | algum insumo com número, **inclusive os semeados pela compra** |
| `TelaContagemPronto` | idem, por ficha                                           | idem                                                           |

Duas consequências que um leitor questionaria, decididas aqui:

- **O `isDirty` do react-hook-form não serve para o produto.** `form.setValue` sem
  `shouldDirty` não marca sujo, e é assim que o preço manual (`aoMudarPreco`), a troca de tipo
  e a limpeza de itens escrevem. A confeiteira digitaria um preço no painel, sairia, e o hook
  diria "limpo". A assinatura JSON sobre o `useWatch` vê tudo; `valoresIniciais` gera os dois
  lados, então a igualdade na abertura é por construção.
- **A contagem semeada pela compra nasce suja.** A semente é consumida ao semear
  (`limparSemente()`); sair sem salvar perde a proposta que a nota acabou de calcular, e
  voltar de `/compras` não a refaz. É perda de trabalho, mesmo que o trabalho tenha sido do
  sistema. O custo é um toque a mais para quem abriu a contagem por engano.

E o que **não** é sujo, de propósito: mudar o status do pedido e marcar como pago gravam na
hora (`mudarStatusPedido`, `marcarPedidoPago`); mandar no WhatsApp abre outra aba
(`target="_blank"`, não é sair); salvar a configuração devolve `base` ao gravado e o hook
desarma sozinho.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md` e `DESIGN.md`, e usar `/impeccable` no diálogo. É a primeira modal do
   sistema: duas frases e dois botões, e cada palavra a mais é ruído na hora em que ela está
   com o dedo no voltar.
2. `rg -n "router\.(push|replace)" src/components/` — a lista das saídas programáticas.
   Esperado: `salvar`/`arquivar` nas cinco telas, `PainelFornada.tsx:207` (vira `Link`, seção
   3.5), `BotaoBiblioteca`, `TelaNota` e `ListaDoMercado` (não são editores, ficam).
3. No navegador, num editor: `history.state` no console tem `__NA: true` e
   `__PRIVATE_NEXTJS_INTERNALS_TREE`. É o que a sentinela copia; se não tiver, o `#d132` não
   se sustenta e a spec para aqui.
4. `node_modules/next/dist/client/app-dir/link.js`: o `onClick` do `Link` desiste quando
   `e.defaultPrevented` (linha ~336, no 16.3). É o que permite interceptar o clique **sem**
   parar a propagação — o `onClick` do link ainda roda, e é assim que "Contar o pote" guarda a
   semente antes de o diálogo abrir.

---

## 3 · Escopo

### 3.1 O hook — `src/components/ui/useGuardaDeSaida.tsx`

```tsx
"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Confirmacao } from "./Confirmacao";

type Acao = () => void | Promise<void>;

/**
 * A guarda de "sair sem salvar". Enquanto `sujo`, qualquer saída da tela
 * passa por um diálogo: o link (captura do clique), o voltar do navegador
 * (sentinela no histórico, `#d132`) e recarregar ou fechar a aba
 * (`beforeunload`, cujo diálogo é do navegador e não este).
 *
 * `navegar(href)` é a saída de quem já salvou: desarma a sentinela e navega,
 * sem perguntar. `pedir(acao)` é para um botão que não é link (o "Sair" da
 * configuração). `dialogo` é renderizado uma vez pela tela.
 */
export function useGuardaDeSaida(sujo: boolean): {
  navegar: (href: Route) => Promise<void>;
  pedir: (acao: Acao) => void;
  dialogo: ReactNode;
} {
  const router = useRouter();
  const [pendente, setPendente] = useState<Acao | null>(null);
  const sujoRef = useRef(sujo);
  /** A sentinela está no histórico. */
  const armada = useRef(false);
  /** O `popstate` que o próprio hook provocou, à espera de resolver. */
  const desarme = useRef<(() => void) | null>(null);
  /** O diálogo aberto veio do voltar: "Continuar aqui" precisa rearmar. */
  const veioDoVoltar = useRef(false);
  /** A saída foi confirmada: nada mais pergunta até a ação terminar. */
  const liberado = useRef(false);

  useEffect(() => {
    sujoRef.current = sujo;
  }, [sujo]);

  const armar = useCallback(() => {
    if (armada.current) return;
    history.pushState(null, "", location.href);
    armada.current = true;
  }, []);

  /** Tira a sentinela e só resolve quando o navegador confirmou que tirou. */
  const desarmar = useCallback(
    () =>
      new Promise<void>((resolver) => {
        if (!armada.current) return resolver();
        armada.current = false;
        desarme.current = resolver;
        history.back();
      }),
    [],
  );

  // A sentinela entra quando há o que perder e sai quando não há mais
  // (salvou a configuração, desfez a edição à mão).
  useEffect(() => {
    if (sujo) armar();
    else void desarmar();
  }, [sujo, armar, desarmar]);

  const navegar = useCallback(
    async (href: Route) => {
      await desarmar();
      router.push(href);
    },
    [desarmar, router],
  );

  const pedir = useCallback((acao: Acao) => {
    if (!sujoRef.current || liberado.current) {
      void acao();
      return;
    }
    setPendente(() => acao);
  }, []);

  useEffect(() => {
    // Captura, e sem `stopPropagation`: o `onClick` do próprio link roda, e o
    // `Link` do Next desiste sozinho ao ver `defaultPrevented`.
    const aoClicar = (evento: MouseEvent) => {
      if (
        !sujoRef.current ||
        liberado.current ||
        evento.defaultPrevented ||
        evento.button !== 0 ||
        evento.metaKey ||
        evento.ctrlKey ||
        evento.shiftKey ||
        evento.altKey
      )
        return;
      const link = (evento.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (
        link.origin !== location.origin ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const destino = link.pathname + link.search;
      if (destino === location.pathname + location.search) return;
      evento.preventDefault();
      veioDoVoltar.current = false;
      setPendente(() => () => navegar(destino as Route));
    };

    const aoVoltar = () => {
      if (desarme.current) {
        desarme.current();
        desarme.current = null;
        return;
      }
      if (!armada.current || liberado.current) return;
      // O navegador consumiu a sentinela; a URL e o formulário não mudaram.
      armada.current = false;
      veioDoVoltar.current = true;
      setPendente(() => () => history.back());
    };

    const aoDescarregar = (evento: BeforeUnloadEvent) => {
      if (!sujoRef.current || liberado.current) return;
      evento.preventDefault();
    };

    document.addEventListener("click", aoClicar, true);
    window.addEventListener("popstate", aoVoltar);
    window.addEventListener("beforeunload", aoDescarregar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("popstate", aoVoltar);
      window.removeEventListener("beforeunload", aoDescarregar);
    };
  }, [navegar]);

  const continuar = useCallback(() => {
    setPendente(null);
    if (veioDoVoltar.current) {
      veioDoVoltar.current = false;
      if (sujoRef.current) armar();
    }
  }, [armar]);

  const confirmar = useCallback(async () => {
    const acao = pendente;
    setPendente(null);
    veioDoVoltar.current = false;
    if (!acao) return;
    liberado.current = true;
    try {
      await acao();
    } finally {
      // Se a ação não desmontou a tela (o `sair()` recusou por pendência,
      // `#d118`), a guarda volta a valer.
      liberado.current = false;
    }
  }, [pendente]);

  const dialogo = (
    <Confirmacao
      aberto={pendente !== null}
      titulo="Sair e perder o que você mudou?"
      descricao="Nada do que você mudou aqui foi salvo ainda."
      rotuloConfirmar="Sair sem salvar"
      rotuloCancelar="Continuar aqui"
      aoConfirmar={() => void confirmar()}
      aoCancelar={continuar}
    />
  );

  return { navegar, pedir, dialogo };
}
```

- **Mora em `components/ui/`, e não em `lib/hooks/`**, porque devolve JSX e importa um
  componente. `estilosBotao.ts` já é o precedente de arquivo sem componente nessa pasta.
- **O `popstate` fica registrado sempre**, e não só enquanto sujo: o `desarmar()` disparado
  quando a tela fica limpa precisa do ouvinte para resolver.
- **`beforeunload` com `preventDefault()` só**: o texto é do navegador, e `returnValue` é
  legado. No iOS o evento não existe; ver Riscos.
- **Nada de `stopPropagation` no clique.** É o que faz o `onClick` de "Contar o pote" guardar a
  semente antes de o diálogo abrir, e o que mantém o menu de contexto e o botão do meio
  funcionando (ficam de fora pela checagem de `button` e das teclas).
- **Desmontar com a sentinela armada** (sair por outra aba, por exemplo) deixa uma entrada
  duplicada até a próxima sessão. Não tem conserto sem navegar durante o desmonte; aceito.

### 3.2 O primitivo — `src/components/ui/Confirmacao.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Botao } from "./Botao";

/**
 * A modal de confirmação destrutiva do `DESIGN.md`: título com a consequência,
 * dois botões, sem "X". É o `<dialog>` nativo (`#d133`): foco preso, `Escape`,
 * fundo e, no Android, o gesto de voltar fechando o diálogo, tudo do navegador.
 * Só abre por `showModal()`, e fechar por qualquer caminho é cancelar.
 */
export function Confirmacao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    else if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoCancelar}
      aria-labelledby="confirmacao-titulo"
      aria-describedby="confirmacao-descricao"
      className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-surface p-5 text-ink shadow-overlay backdrop:bg-brand-800/35"
    >
      <h2
        id="confirmacao-titulo"
        className="font-display text-title font-semibold"
      >
        {titulo}
      </h2>
      <p id="confirmacao-descricao" className="mt-2 text-body text-ink-muted">
        {descricao}
      </p>
      <div className="mt-5 flex gap-3">
        <Botao autoFocus onClick={aoCancelar} className="flex-1">
          {rotuloCancelar}
        </Botao>
        <Botao variante="perigo" onClick={aoConfirmar} className="flex-1">
          {rotuloConfirmar}
        </Botao>
      </div>
    </dialog>
  );
}
```

- **O foco inicial é "Continuar aqui"** (`autoFocus`; `showModal()` respeita). Enter no
  teclado e o toque no escuro nunca destroem. O destrutivo é `perigo`, como arquivar.
- **`onClose` é o único caminho de cancelar** — `Escape`, o gesto de voltar do Android e o
  botão passam por ele. Depois de confirmar, o `close()` do efeito também dispara `onClose`;
  `continuar()` é inócuo nesse caso porque `veioDoVoltar` já foi zerado.
- **Sem travar a rolagem do fundo.** O `Painel` trava porque é uma folha com formulário;
  aqui o diálogo tem duas frases e o fundo já está `inert`. Se o `/impeccable` reclamar,
  `body:has(dialog[open]) { overflow: hidden }` em `globals.css` é uma linha.
- `DESIGN.md`: a linha "Painel lateral / folha inferior" da tabela de componentes ganha o
  nome do primitivo — "Modal só para confirmação destrutiva: `Confirmacao`, `<dialog>` nativo".

### 3.3 O foco no primeiro erro — `src/components/ui/Campo.tsx`

```ts
/**
 * Depois de o Salvar recusar: leva o foco ao primeiro campo com erro. No quadro
 * seguinte, porque a dobra "Mais detalhes" abre no mesmo render que pinta o
 * erro (020), e `focus()` em elemento oculto falha em silêncio.
 */
export function focarPrimeiroErro() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
```

Mora em `Campo.tsx` porque é o `Campo` que emite `aria-invalid`. Chamada nos três lugares em
que a validação de campo recusa: `aplicarErros` em `FormularioFicha`, o `setErros` do
`salvar()` em `FormularioPedido`, e o de `TelaConfiguracao`. Erro de linha de item
(`errosItens`) sem `aria-invalid` não é achado, e nada acontece: o `role="alert"` sob o
cabeçalho continua sendo a leitura, e é melhor do que focar o campo errado.

### 3.4 As cinco telas

Em cada uma, três linhas: a assinatura, o hook e o `{dialogo}`; e `router.push` vira
`navegar`.

**`FormularioFicha.tsx`**

```ts
const [iniciais] = useState(() => valoresIniciais(ficha, configuracao));
const form = useForm<ValoresFicha>({ defaultValues: iniciais });
// ...
const valores = useWatch({ control: form.control }) as ValoresFicha;
const sujo = JSON.stringify(valores) !== JSON.stringify(iniciais);
const guarda = useGuardaDeSaida(sujo);
```

`router.push("/fichas")` em `salvar` e `arquivar` → `void guarda.navegar("/fichas")`. O
`{guarda.dialogo}` entra no fim do fragmento, ao lado do `PainelPreco`. `aplicarErros` termina
com `focarPrimeiroErro()`.

**`FormularioPedido.tsx`**

```ts
const [valores, setValores] = useState<ValoresPedido>(() =>
  valoresIniciais(pedido, configuracao, hoje),
);
const [inicial] = useState(() => JSON.stringify(valores));
const sujo = JSON.stringify(valores) !== inicial;
const guarda = useGuardaDeSaida(sujo);
```

Os dois `router.push("/pedidos")` → `navegar`. O `{guarda.dialogo}` ao lado dos painéis.
Depois do `setErros`/`setErrosItens` que recusa, `focarPrimeiroErro()`. **`BlocoOrcamento`**: o
comentário "o formulário não sabe se está sujo" sai; a frase sob o link fica.

**`TelaConfiguracao.tsx`**

`base` deixa de ser `string | null` e passa a ser a assinatura do semeado ou do gravado;
`nuncaSalvou` vira estado próprio (`!dado` na semeadura, `false` depois do primeiro Salvar):

```ts
const [base, setBase] = useState<string | null>(null); // continua null só até semear
const [nuncaSalvou, setNuncaSalvou] = useState(false);
// na semeadura:
setBase(assinatura(inicial));
setNuncaSalvou(!dado);
// derivados:
const sujo = estado !== null && base !== null && assinatura(estado) !== base;
const alterado = nuncaSalvou || sujo;
const guarda = useGuardaDeSaida(sujo);
```

`salvar()` faz `setNuncaSalvou(false)` junto do `setBase`. A faixa de três estados e o botão
fixo não mudam de comportamento: `alterado` continua sendo o que era. O cartão "Sair" chama
`guarda.pedir(aoSair)` em vez de `aoSair` — sem isso, sair com alteração pendente descarrega a
página com o `beforeunload` armado, e o diálogo nativo apareceria por cima de um Firestore já
terminado (`#d118`). `{guarda.dialogo}` ao lado do painel de forma de pagamento.

**`TelaContagem.tsx` e `TelaContagemPronto.tsx`**

```ts
const sujo = Object.values(valores).some((quantidade) => quantidade !== null);
const guarda = useGuardaDeSaida(sujo);
```

`router.push("/compras")` e `router.push("/fichas")` em `salvar` → `navegar`. `{guarda.dialogo}`
antes do `RodapeContagem`.

### 3.5 `PainelFornada.tsx`: "Contar o pote" vira link

O botão que chama `contarOPronto()` — guarda a semente, fecha o painel, `router.push` — vira
`<Link href="/fichas/contagem" className={classesBotao({ variante: "primaria" })}
onClick={contarOPronto}>` com o `router.push` removido de `contarOPronto`. É a única saída
programática que mora **dentro** de um editor: como `Link`, a captura do clique a vê, e como o
`onClick` roda antes de o Next desistir, a semente já está guardada quando ela confirma. "Um
link continua sendo um link" (`estilosBotao.ts`). `useRouter` sai do arquivo se ninguém mais o
usa.

### 3.6 Documentação

- `#d132`, `#d133` e `#d134` em `docs/DECISOES.md`.
- `docs/ESTADO.md`: a seção da 023; a linha 23 na tabela de módulos; **saem** as três linhas
  da tabela de dívidas (pedido, configuração, contagem); a linha "A folha lê o gravado e o
  WhatsApp lê a tela" passa a dizer que a folha pergunta e o WhatsApp (nova aba) não; o item 1
  de "Depois da 017, por ordem de valor" sai; a próxima ação aponta para as entrevistas e a 024.
- `docs/saas/ROADMAP.md`: a 023 marcada como entregue, com o que a spec acrescentou ao que ele
  previa (cinco telas e não quatro, o foco no erro, "Contar o pote" como link).
- `DESIGN.md`: o nome do primitivo na tabela de componentes (3.2).

---

## Roteiro de navegador

Conta real, `npm run dev`, desktop a 1280px e celular a 360px; **os passos 3, 12 e 15 no
Android de verdade, app instalado**, porque o gesto de voltar não existe no DevTools.

1. **Sem tocar, não pergunta.** Abrir a ficha-modelo da biblioteca (ou qualquer produto), tocar
   "Produtos" no cabeçalho: sai sem diálogo. Abrir de novo, voltar do navegador: sai sem
   diálogo. Repetir com um pedido, com `/configuracao` e com as duas contagens vazias. **É o
   critério do `#d113`**; se qualquer uma perguntar, a assinatura da abertura está errada e o
   resto do roteiro espera.
2. **Produto sujo, pelo link.** Mudar o rendimento, tocar "Produtos": o diálogo, com o foco em
   "Continuar aqui". `Escape`: fecha, o rendimento continua mudado. Tocar "Produtos" de novo,
   "Sair sem salvar": `/fichas`. Reabrir: o rendimento antigo.
3. **Produto sujo, pelo voltar.** Mudar o rendimento; voltar do navegador (desktop) e o gesto
   (Android): o diálogo; a URL não mudou e o formulário **não pulou de posição nem perdeu o
   campo**. "Continuar aqui"; voltar de novo: o diálogo de novo (a sentinela rearmou). "Sair
   sem salvar": cai na tela de onde veio **com um voltar só**.
4. **Salvar não duplica o histórico.** De `/fichas`, abrir um produto, mudar, Salvar: `/fichas`.
   Voltar do navegador: o editor, com o valor salvo, **uma vez**. Voltar de novo: `/fichas` (ou
   a Hoje, de onde tiver vindo). Se precisar de dois voltares para sair do editor, o
   `desarmar()` não esperou o `popstate`.
5. **Recarregar e fechar.** Produto sujo, F5: o diálogo nativo do navegador. Cancelar: tudo no
   lugar. Fechar a aba: idem.
6. **O preço manual.** Abrir um produto, digitar um preço no painel de preço e nada mais, tocar
   "Produtos": o diálogo. É o caso que o `isDirty` do react-hook-form deixaria passar.
7. **Pedido: a folha pergunta.** Pedido sujo, "Abrir a folha do orçamento": o diálogo; "Sair sem
   salvar": a folha com o gravado. Marcar um pedido como pago sem tocar em mais nada e tocar
   "Pedidos": sai sem perguntar (o pagamento já foi gravado).
8. **Pedido: o WhatsApp não é sair.** Pedido sujo, "Mandar no WhatsApp": abre em nova aba, sem
   diálogo, e o pedido continua sujo na aba de trás.
9. **Configuração.** Mudar a hora, tocar "Hoje" no menu de baixo (360px): o diálogo. "Continuar
   aqui"; Salvar; tocar "Hoje": sai sem perguntar. Mudar a hora e voltar o valor à mão: sai sem
   perguntar. Mudar de novo, rolar até "Sair": o diálogo **antes** do sair; "Sair sem salvar":
   `/login`, sem diálogo nativo por cima.
10. **Contagem da despensa.** Digitar um número, tocar "Compras": o diálogo. Vir de `/compras`
    pela compra (semeada), não tocar em nada, tocar "Compras": o diálogo — a proposta é o que se
    perde. Salvar: `/compras`, e um voltar só até onde estava.
11. **O que está pronto.** Idem em `/fichas/contagem`.
12. **"Contar o pote" num produto sujo.** Mudar o rendimento, registrar uma fornada, "Contar o
    pote": o diálogo; "Sair sem salvar": a contagem abre **semeada** com a fornada. Se abrir
    vazia, o `onClick` do link não rodou antes da captura.
13. **"Sair" na barra lateral com produto sujo** (desktop). Esperado: `/login` sem diálogo
    nativo — o `signOut` desmonta o editor antes do `location.replace`. Se o diálogo nativo
    aparecer, é o risco nomeado abaixo, e a spec registra o conserto.
14. **O foco no erro.** Produto sem nome, Salvar: o foco vai ao campo Nome. Produto com nome e
    rendimento vazio, com "Mais detalhes" fechada: a dobra abre e o foco vai ao campo. Pedido
    sem cliente: o foco vai ao campo. Configuração com margem em branco: idem.
15. **Teclado e leitor de tela.** O diálogo é anunciado com o título; Tab não sai dele; Enter
    no foco inicial é "Continuar aqui". No Android, com o diálogo aberto, o gesto de voltar
    **fecha o diálogo e não sai da tela**.
16. **Duas abas.** Editor sujo em uma aba; na outra, Sair: a aba do editor vai para `/login`
    (Auth sincroniza). O editor sumiu com a sentinela armada; voltar de `/login` pode pedir um
    toque a mais. É o corner aceito na 3.1, e o passo só confirma que não é pior que isso.

---

## Critérios de aceite

- [x] Nenhuma das cinco telas pergunta ao ser aberta e fechada sem toque (passo 1), inclusive
      a ficha-modelo da biblioteca.
- [x] As três portas perguntam com trabalho não salvo: link, voltar do navegador, recarregar
      (passos 2, 3, 5), no desktop e no Android.
- [x] Salvar, arquivar e "Sair sem salvar" deixam **uma** entrada do editor no histórico
      (passos 3 e 4).
- [x] O preço manual, a contagem semeada e "Contar o pote" com produto sujo perguntam (passos
      6, 10, 12); status, pagamento, WhatsApp e salvar a configuração não (passos 7, 8, 9).
- [x] O `<dialog>`: foco inicial em "Continuar aqui", `Escape` e gesto de voltar cancelam,
      `perigo` no destrutivo, sem "X", contraste dos dois temas (passo 15).
- [x] O Salvar recusado leva o foco ao primeiro campo com erro, inclusive dentro da dobra
      (passo 14).
- [x] `git diff src/lib/domain/ src/lib/types/ src/lib/firebase/ firestore.rules
firestore.indexes.json package.json` vazio. `npm test` com os mesmos 536 testes.
- [x] `npx impeccable --json src/` continua `[]`.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d132`, `#d133` e `#d134` escritos; `ESTADO.md` (três dívidas removidas, linha 23,
      próxima ação), `ROADMAP.md` e `DESIGN.md` atualizados.

---

## Fora de escopo

- **Os painéis** — insumo, transação, meta, cliente, forma de pagamento, fornada. Fechar pelo
  escuro ou pelo "X" com um campo preenchido também descarta. Não estão na tabela de dívidas
  e são formulários curtos; se morder, é o `aoFechar` passando por `pedir()`, com o mesmo
  diálogo. Spec própria, ou uma linha na 8C.
- **Rascunho persistente e salvar automático.** É outra feature — "você tem um rascunho" é
  estado, tela e regra de conflito. O diálogo é o que a dívida pedia.
- **Salvar no rodapé do editor.** A 033-C recusou com motivo (o cabeçalho é `sticky`), e esta
  spec não reabre.
- **Guardar a unidade digitada** ("0,5 kg reabre como 500 g") e as outras dívidas dos editores.
- **`sair()` recusando por edição aberta.** A configuração passa por `pedir()`; a barra lateral
  conta com o desmonte (passo 13). Se o passo 13 reprovar, o conserto está em Riscos e é de
  uma linha, não desta seção.
- **Navigation API.** Sem Safari não há como depender dela; quando houver, o hook perde a
  sentinela e o `#d132` ganha uma nota.

---

## Decisões desta spec que são fáceis de rejeitar

- **A sentinela no histórico.** É o truque mais velho do problema, e é um truque: uma entrada
  a mais enquanto a tela está suja. A alternativa é não guardar o voltar — e no Android o
  voltar é a saída. O `desarmar()` antes de toda saída voluntária é o que impede a entrada
  duplicada de sobreviver; sem ele a spec não seria aceita.
- **Um `<dialog>` em vez de estender o `Painel`.** O `Painel` é a folha inferior; uma pergunta
  de duas frases dentro dela pareceria um formulário. O `DESIGN.md` já pedia a modal para este
  caso, e o elemento nativo dá o comportamento inteiro, com o gesto de voltar do Android
  incluído. Se o `backdrop:` do Tailwind não pegar no tema escuro, é `::backdrop` em
  `globals.css`.
- **JSON no lugar do `isDirty`.** Serializar o formulário do produto a cada render é trabalho
  que o `isDirty` não faz. São poucas dezenas de campos; se um dia pesar, é `useMemo` sobre
  `valores`. O `isDirty` mais `shouldDirty` nos `setValue` seria menos linhas hoje e uma linha a
  esquecer em cada `setValue` futuro.
- **A contagem semeada pergunta.** É um toque a mais para quem abriu por engano. O que se perde
  do outro lado é a proposta da nota, que não se refaz. Se a Maynara reclamar do toque, a
  assinatura passa a ser o `digitados` da semeadura, e o `#d134` ganha a nota.
- **O foco no erro de carona.** Não é "sair sem salvar", e a 033-C o deixou aqui com nome. São
  seis linhas e três chamadas; se parecer mistura, sai para a 8C sem tocar em nada desta spec.
- **"Sair e perder o que você mudou?"** como título. É a consequência no título, como o
  `DESIGN.md` pede; "Sair sem salvar?" seria mais curto e diria menos. Os botões são o que ela
  faz, e não "OK"/"Cancelar".
- **`pedir()` como terceiro membro do hook**, só pelo "Sair" da configuração. A alternativa
  era deixar o `beforeunload` cobrir — e ele cobriria com um diálogo nativo sobre um Firestore
  terminado. Três linhas.

---

## Riscos

- **O `RESTORE` da mesma URL remontar o editor.** A leitura do `app-router.js` (16.3) é que a
  árvore copiada é a mesma e o segmento fica montado; o passo 3 é quem prova. Se o formulário
  perder o campo ao apertar voltar, a sentinela não serve e a spec para no `#d132` com o que
  apareceu.
- **`beforeunload` no iOS.** O Safari não o dispara; `pagehide` não é cancelável. Fechar o app
  instalado no iPhone com edição aberta perde em silêncio, como hoje. O link e o voltar
  continuam guardados lá; o roteiro anota o que o iPhone fez.
- **O `cancel` do `<dialog>` sem ativação do usuário.** O Chrome ignora `preventDefault` no
  `cancel` sem gesto recente; por isso o componente não o usa e deixa o `close` acontecer.
- **"Sair" na barra lateral com edição aberta.** Se o passo 13 mostrar o diálogo nativo: o hook
  passa a registrar o `beforeunload` por `window.onbeforeunload = …` e `sair()` faz
  `window.onbeforeunload = null` antes do `location.replace`. Uma linha em cada lado, e a nota
  no `#d118`.
- **`Route` tipada.** `router.push(destino as Route)` a partir de um `pathname` lido do DOM:
  o `as` é honesto porque o link veio de um `<Link>` tipado. Se o `typedRoutes` recusar, é
  `router.push` com `string` pelo `as unknown`.
- **Assinatura da abertura diferente do `useWatch` no primeiro render.** O react-hook-form
  clona `defaultValues` para `_formValues` e o `useWatch` devolve isso; `undefined` some nos
  dois lados do JSON. Se o passo 1 perguntar num produto sem toque, a diferença está num campo
  que o `register` normaliza (número vs. texto), e a assinatura passa a ser calculada depois do
  primeiro `useWatch`, num `useEffect` que roda uma vez.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com os passos 3, 12 e 15 no Android de verdade — é o único
lugar onde o gesto de voltar, a sentinela e o `CloseWatcher` do `<dialog>` são vistos juntos —
e o passo 1 antes de qualquer outro. Com esta spec, as três dívidas mais antigas dos editores
saem da tabela, e a fase 1 pode começar pelo que ela é de verdade: as cinco a oito entrevistas,
e a 024 depois delas.
