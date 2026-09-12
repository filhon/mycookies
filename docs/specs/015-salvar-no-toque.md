# Spec 015 · Salvar no toque, no sistema inteiro

**Tipo:** varredura. Cinco mutações deixam de esperar o servidor, e a regra do `#d80` passa a
valer para `src/lib/firebase/mutations/` inteiro, com duas exceções nomeadas. Nenhum campo
novo, nenhuma rota, nenhum índice, nenhuma regra de segurança tocada, nenhuma tela alterada.
**Tamanho:** uma sessão. O diff é apagar `await` e trocar três `addDoc` por `doc()` + `setDoc`,
como a 011 já fez no caixa.
**Origem:** a própria 011, que deixou estas cinco de fora "para uma spec de varredura própria,
depois da 5B". A 5B rodou.
**Depende de:** nada. `despachar.ts` já existe.
**Aprovações pedidas:** nenhuma nova — é a mesma da 011, estendida a onde ela ainda não valia.

---

## Problema

A 011 apagou o `await` das mutações do caixa e deixou as outras cinco como estavam, com este
argumento (`#d80`):

> "Nelas o preço de uma promessa pendente é um botão preso, e não um número perdido: ou
> escrevem um documento só, ou o que escrevem depois não é parcela de agregado que alguém lê."

A varredura que esta spec faz mostra que o argumento vale para três das cinco e **não vale
para duas**. O mecanismo é o mesmo de sempre: a promessa de uma escrita do Firestore não
resolve enquanto não há rede, a execução para na primeira linha, e o que vem depois nunca é
sequer enfileirado.

### Onde é só botão preso

- **`configuracao.ts`** — `salvarConfiguracao` é um `setDoc` só. Sem rede, a barra fixa de
  "não salvas" fica em "salvando" até o sinal voltar.
- **`fichas.ts`** — `criarFicha` espera o `addDoc` e depois incrementa `totalFichas` em
  `agregados/global`, que ninguém lê (`#d67`). `atualizarFicha` é um `updateDoc` só;
  `arquivarFicha` é o `updateDoc` mais o mesmo incremento que ninguém lê.
- **`listasCompra.ts`** — `criarListaCompras` espera o `addDoc`; o resto é um `updateDoc` por
  função. A tela **já não espera** (`#d40`), então o botão não prende — mas a mutação continua
  escrita como se alguém fosse esperar, e é a exceção sem motivo dentro do próprio arquivo:
  `corrigirPrecoNaLista` já usa `Promise.all` com um comentário explicando por que não encadeia.

### Onde é número perdido

**`insumos.ts`, `atualizarInsumo`.** A ordem é:

```
await updateDoc(docInsumo...)              // o preço novo
if (virouCompra) await Promise.all([
  podarHistorico(...),
  marcarFichasDesatualizadas(...),         // ← O SELO MORA AQUI
])
```

Sem sinal, ela corrige o preço do chocolate — pelo formulário de `/insumos` ou **pela lista de
compras, na frente da gôndola**, que é o contexto 2 do `PRODUCT.md` e chama esta mesma função
por `corrigirPrecoNaLista`. O `updateDoc` entra na fila local e a promessa fica pendente. A
execução para. `marcarFichasDesatualizadas` nunca roda. Quando a rede volta, o preço sobe; o
selo de "custo desatualizado" das fichas que usam o chocolate **não aparece nunca**.

É exatamente o que `#d05` existe para impedir: "a interface mostra o selo de custo
desatualizado antes que um preço velho vire orçamento". Aqui o preço velho vira orçamento sem
aviso, e o pedido congela (`#d32`) um custo que já não é o custo. Não é parcela de agregado —
mas é número que alguém lê, e é o número que decide preço.

**`metas.ts`, `salvarMeta`.** Duas escritas em fila: a meta em `metas/{YYYY-MM}` e o espelho
dela em `agregados/{YYYY-MM}.meta`. O espelho é o que o cartão da tela Hoje lê (`#d09`,
`#d29`). Definir a meta sem sinal grava a meta e **não grava o espelho**: a tela Hoje não vê a
meta até a próxima transação do mês reescrever o espelho por cima, ou até "Recalcular o mês".
O próprio comentário da segunda escrita diz o que se perde: "sem ele, o cartão da tela Hoje
só veria a meta no dia em que a Maynara lançasse a próxima venda".

Os dois casos são os que a 011 disse que não existiam. Ela olhou para agregado e não achou;
o que estava depois do `await` era outra coisa.

---

## O que esta spec decide

Uma decisão, que vira `#d104` em `docs/DECISOES.md`.

### Toda mutação despacha; quem espera está nomeado — `#d104`

A regra do `#d80` deixa de ser "as mutações que mantêm o agregado" e passa a ser
**`src/lib/firebase/mutations/` inteiro**: nenhuma escrita do Firestore é esperada dentro de
uma mutação. Todas são despachadas por `despachar()`, na ordem, e a função retorna. A promessa
que a tela recebe resolve no toque.

As exceções são duas, e as duas já existem com o motivo escrito:

- **`recalcularMes`** (`agregado.ts`) — é a rede de segurança, faz duas consultas antes de
  escrever, exige rede e diz isso na tela (`#d80`).
- **`importarNota`** (`notas.ts`) — a tela já exigiu rede para ler a nota (`#d50`), e o lote
  precisa terminar antes de a etapa "pronto" contar quantos nasceram.

Qualquer terceira exceção precisa de comentário no lugar dizendo por que espera, como as duas
têm hoje. Sem o comentário, é regressão.

O que isto torna impossível — uma escrita depender da resposta de outra — tem o mesmo conserto
da 011: `addDoc` vira `doc(col)` + `setDoc`, com o id gerado no aparelho. São três lugares:
`criarInsumo`, `criarFicha` e `criarListaCompras`.

O que se perde é o que `#d40`, `#d62` e `#d80` já aceitaram três vezes: uma escrita recusada
pelas regras falha calada, no console, numa tela que ela já deixou. As regras em questão são as
mesmas de sempre — `contas/{contaId}/{documento=**}` para quem tem a claim — e a 5B as viu
funcionar. A defesa continua sendo o `SeloSincronizacao`.

---

## Escopo

### 1. `src/lib/firebase/mutations/insumos.ts`

- `criarInsumo`: `doc(colInsumos(contaId))` + `setDoc` despachado, incremento despachado, id
  devolvido sem esperar. Corpo gravado idêntico.
- `atualizarInsumo`: o `updateDoc` é despachado; `podarHistorico` e
  `marcarFichasDesatualizadas` são chamadas **no mesmo tique**, sem `await` entre elas e o
  `updateDoc`. As duas fazem leitura (`getDoc`, `getDocs`) antes de escrever, e a leitura
  offline serve do cache — o que basta para as fichas que este aparelho já abriu.
- `arquivarInsumo` e `restaurarInsumo`: os dois `setDoc`/`updateDoc` despachados.

`marcarFichasDesatualizadas` continua `async` e continua devolvendo a contagem, porque
`importarNota` usa o número na etapa "pronto". Quem a chama de `atualizarInsumo` só a despacha.

### 2. `src/lib/firebase/mutations/fichas.ts`

`criarFicha` (mesmo conserto de id), `atualizarFicha` e `arquivarFicha` despacham.

### 3. `src/lib/firebase/mutations/listasCompra.ts`

`criarListaCompras` (mesmo conserto de id), `regerarListaCompras`, `marcarItemComprado`,
`corrigirPrecoNaLista` e `arquivarListaCompras` despacham. O `Promise.all` de
`corrigirPrecoNaLista` e o comentário dele saem: com nada esperado, não há o que juntar.

### 4. `src/lib/firebase/mutations/metas.ts`

`salvarMeta` despacha as duas escritas, na ordem: meta, depois espelho.

### 5. `src/lib/firebase/mutations/configuracao.ts`

`salvarConfiguracao` despacha o `setDoc`.

### 6. `src/lib/firebase/mutations/estoque.ts` — de carona, sem mudar comportamento

`salvarContagem` e `salvarContagemDoPronto` esperam cada `lote.commit()` dentro do laço de 400. A tela já não espera a função (`#d62`), e uma despensa não passa de 400 linhas, então
hoje isto nunca prende nada. Trocar por `despachar(lote.commit())` custa uma linha em cada e
tira a última exceção não comentada do diretório. Se não for feito, o comentário do laço
precisa dizer por que espera.

### 7. `despachar.ts`

Ganha uma linha no comentário: a regra vale para o diretório inteiro, e as exceções são
`recalcularMes` e `importarNota`. É o único lugar que precisa listar as duas.

### 8. Telas — **nenhuma linha**

`FormularioInsumo`, `FormularioFicha`, `FormularioMeta` e `TelaConfiguracao` seguem com
`await` e `setSalvando`. A promessa passa a resolver no toque, e o painel fecha no toque. O
`catch` de cada uma continua lá para a rejeição de verdade — validação, documento sumido —,
que continua chegando. `ListaDoMercado` e as duas telas de contagem já não esperavam.

### 9. Testes

Nenhum: nada disto mora em `src/lib/domain/`. A prova é o roteiro abaixo.

---

## Roteiro de navegador

Com DevTools, rede em **Offline** do começo ao passo 5. Cada passo diz o que acontece hoje e o
que precisa acontecer depois.

1. **`/insumos`, editar o chocolate e subir o preço.**
   - **Hoje:** o botão prende em "salvando". `/fichas` não ganha selo nenhum, nem depois de
     religar a rede.
   - **Depois:** o painel fecha no toque, o selo de sincronização acusa pendência, e `/fichas`
     mostra "custo desatualizado" nas fichas que usam o chocolate — na hora, do cache.
2. **`/compras`, corrigir o preço da farinha pela lista.** Mesma pergunta pelo outro caminho:
   a linha refaz o custo no toque (já fazia) **e** `/fichas` ganha o selo (não ganhava).
3. **`/financeiro`, definir a meta do mês.**
   - **Hoje:** o painel prende. A tela Hoje não mostra a meta.
   - **Depois:** o painel fecha, e o cartão da tela Hoje mostra os doces por semana no mesmo
     instante — o espelho foi aplicado no cache.
4. **`/configuracao`, mudar a taxa do crédito e salvar.** A barra fixa some no toque, e a frase
   de status diz "salvo".
5. **`/fichas/nova`, criar uma ficha; `/insumos`, criar um insumo.** Os dois voltam para a lista
   no toque, e a linha nova já está lá com id.
6. **Fechar a aba antes de religar a rede. Reabrir, religar, recarregar.** Tudo dos passos 1 a
   5 está no servidor, inclusive os selos das fichas e o espelho da meta. É o passo que separa
   esta spec de um conserto de sensação: a fila do IndexedDB sobrevive à aba; a continuação de
   um `async` não.
7. **Com rede, repetir o passo 1.** Nada muda de comportamento em relação a offline — é o que
   "despachar" quer dizer.

---

## Critérios de aceite

- [ ] `grep -n "await " src/lib/firebase/mutations/` só encontra leituras (`getDoc`, `getDocs`)
      e as duas exceções nomeadas, cada uma com comentário dizendo por que espera.
- [ ] `criarInsumo`, `criarFicha` e `criarListaCompras` produzem o id sem ida ao servidor, e o
      corpo gravado é campo a campo o de hoje.
- [ ] O roteiro de sete passos passa inteiro, incluindo o passo 6.
- [ ] Nenhum arquivo em `src/components/` mudou.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d104` escrito em `docs/DECISOES.md`; `docs/ESTADO.md` atualizado, com a linha "Cinco
      mutações ainda esperam escrita em fila fora do caixa" saindo da tabela de dívidas.

---

## Fora de escopo

- **`importarNota` deixar de esperar.** Dívida declarada e aceita em `#d50`; a tela exigiu rede
  para chegar até ali. Continua sendo a exceção, agora com o nome no `despachar.ts`.
- **`ListaDoMercado` ter o próprio `despachar` com mensagem.** É outro auxiliar, da tela, que
  põe frase na tela; o de `mutations/` registra no console. Dois nomes iguais para duas coisas
  diferentes é feio e não é desta spec.
- **Guarda de "sair sem salvar"** nos editores. Dívida própria, com spec própria depois desta.
- **Mostrar "salvo, ainda não subiu" em cada painel.** O `SeloSincronizacao` já diz isso para
  o app inteiro. Um aviso por tela seria o mesmo sinal quatro vezes.
- **`agregados/global` e os contadores que ninguém lê.** Ficam sendo despachados como hoje. A
  spec de limpeza é outra.

---

## Decisões desta spec que são fáceis de rejeitar

- **A leitura de `marcarFichasDesatualizadas` pode não achar tudo offline.** `getDocs` sem rede
  serve do cache, e o cache tem as fichas que este aparelho já carregou. Uma ficha nunca aberta
  neste aparelho não ganha selo até a próxima vez que o preço mudar com rede. Hoje ela não ganha
  selo **nunca** quando o preço muda offline, então é estritamente melhor; e o aparelho da
  Maynara abre `/fichas` toda semana. Se um dia doer, o conserto é a tela passar os `fichaIds`
  que já tem na mão, e não uma segunda consulta.
- **Nenhuma tela muda.** A tentação é tirar o `setSalvando` dos formulários, já que a promessa
  resolve no toque. Fica: ele ainda cobre a rejeição de verdade e o instante entre o toque e o
  cache aplicar, e tirá-lo tornaria esta spec uma spec de tela.
- **`estoque.ts` entra "de carona".** Podia ficar de fora, porque a tela já não espera. Entra
  porque o critério de aceite é um `grep`, e um `await` sem comentário no meio do diretório é o
  que a regra existe para não ter.

---

## Riscos

- **Salvar passa a ser instantâneo em quatro telas que ela usa toda semana.** É a sensação que
  o caixa, `/compras` e a contagem já têm. A 5B viu o caixa assim e não estranhou.
- **Duas escritas despachadas em sequência não são atômicas** — nunca foram, nem com `await`.
  `salvarMeta` grava a meta e o espelho como duas operações; se a segunda for recusada, a
  primeira fica. É o estado de hoje com rede; offline, hoje, a segunda simplesmente não existe.
- **Se o passo 1 do roteiro não reproduzir o defeito** — o selo aparecer offline já hoje —,
  pare: a leitura desta spec sobre `atualizarInsumo` está errada, e ela vira uma spec só de
  sensação, que ainda vale, mas com metade da urgência.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de sete passos, que é o único lugar onde esta correção pode ser
vista — `npm test` cobre só `domain/`, e o defeito não mora lá.
