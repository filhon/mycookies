# Spec 011 · O caixa para de perder a conta

**Tipo:** correção de perda de dado. Quatro mutações deixam de esperar o servidor, uma função
pura nova no domínio, um bloco de aviso em `/financeiro`. Nenhum campo novo, nenhuma rota
nova, nenhuma regra de segurança tocada.
**Tamanho:** uma sessão. O diff é curto de propósito — a correção é apagar `await`, não
escrever caminho novo.
**Origem:** relato de uso, com duas capturas. O gráfico "Movimento por dia" desenha uma barra
só num mês com movimento em vários dias, e "O que mais vendeu" diz 1 unidade de cada num dia
em que dez cookies foram vendidos e pagos.
**Depende de:** nada. Não encosta na 5B, não encosta na 010.
**Aprovações pedidas:** uma, ao fim — o que acontece com a falha de permissão quando a escrita
deixa de ser esperada.

---

## Problema

Os dois cartões errados leem o **mesmo documento**: `contas/{contaId}/agregados/{'YYYY-MM'}`.
A lista "Lançamentos do mês", logo abaixo deles na mesma tela, lê a **coleção**
`transacoes` — e está certa. É esse par que nomeia o defeito:

> **Os documentos chegaram ao banco. As contribuições deles no agregado, não.**

O agregado não é recalculado na leitura, por decisão (`#d10`, `#d23`): ele é mantido por
incremento, uma parcela por vez, no mesmo ato que grava o documento. Quando uma parcela se
perde, nada dá erro. `src/lib/domain/caixa.ts` diz isso em voz alta, no alto do arquivo:

> "Agregado mantido por incremento torce em silêncio — um delta perdido não dá erro, não
> aparece em log e só é notado quando o lucro do mês parece estranho."

Foi notado. E o que está torcendo não é a aritmética.

### A aritmética está certa, e isso é provado

`tests/domain/caixa.test.ts` cobre as duas metades do agregado com 40 asserções, incluindo
exatamente os dois números reclamados: `porDia` junta o movimento do mesmo dia e não inventa
dia sem movimento; `produtos` junta duas vendas da mesma ficha em uma linha do ranking e
soma 20 + 10 = 30 unidades. `agregarMes` e a sequência de deltas concordam campo a campo.

A forma da escrita no Firestore também está certa. `incrementosDoAgregado` monta mapas
aninhados em vez de caminhos com ponto (`agregado.ts:148`), e o SDK, ao encontrar só
transformações dentro de `porDia.<dia>`, mantém aquele caminho **fora** da máscara de merge —
os `increment` acumulam sobre o que já está no documento em vez de o substituírem.
Conferido no parser do SDK, `__PRIVATE_parseObject`.

As regras de segurança liberam `contas/{contaId}/{documento=**}` para quem tem a claim, e é a
mesma claim que deixou a tela ler. O agregado não está sendo recusado.

### O que está errado é a ordem

Toda mutação do caixa é uma **fila de escritas esperadas, uma depois da outra**.
`marcarPedidoPago` é a mais longa:

```
await gravarTransacao(...)      // addDoc: nasce o lançamento
await updateDoc(docPedido...)   // o pedido guarda pago, pagoEm, transacaoId
await aplicarNoAgregado(...)    // ← A PARCELA DO MÊS MORA AQUI
await aplicarPedidoNoCliente(...)
```

E a promessa de uma escrita do Firestore **não resolve enquanto não há rede**. Não é
suposição: está na tipagem do SDK que este projeto usa (`@firebase/firestore` 4.17.1,
`index.d.ts:4131` — "won't resolve while you're offline"), e este projeto **já decidiu isso
duas vezes**, em `#d40` e em `#d62`:

> "A promessa de uma escrita do Firestore não resolve enquanto não há rede — ela fica pendente
> até a reconexão —, então um `await` aqui deixaria o botão preso em 'salvando' exatamente no
> lugar em que esta tela existe para funcionar."

`#d62` aplicou a decisão à contagem de estoque. As mutações do caixa nunca a receberam. E no
caixa o preço é maior que um botão preso, porque **o que vem depois do `await` é a parcela**:

1. Ela marca o pedido como pago sem sinal. O `addDoc` entra na fila local do IndexedDB e a
   promessa fica pendente.
2. A execução **para na primeira linha**. `aplicarNoAgregado` nunca é chamada. O `increment`
   nunca é sequer enfileirado — o que a fila offline sabe enfileirar é escrita despachada, e
   esta não foi.
3. Ela fecha o painel, troca de tela, o sistema mata o app na cozinha.
4. Na próxima vez que houver rede, a fila sobe o lançamento e o pedido. **A continuação da
   função morreu junto com a aba, e a parcela do mês foi perdida em definitivo.**

O documento aparece na lista. O gráfico e o ranking, que leem o agregado, ficam com o que
sobrou — só as parcelas dos momentos em que houve rede do começo ao fim da fila. Uma barra no
dia em que a conexão aguentou. Uma unidade de cada sabor do pedido que passou inteiro.

É a mesma perda para `criarTransacao`, `atualizarTransacao`, `arquivarTransacao`,
`atualizarPedido` e `desfazerPagamento`. E `notas.ts` cai nela de carona, porque lança a
compra pela `criarTransacao`.

`aplicarNoAgregado` traz um comentário que descreve a intenção certa e o resultado errado:

> "`increment` entra na fila offline, que é a razão de ele existir aqui em vez de uma
> transação: transação exige rede, e offline é o estado normal desta usuária."

O mecanismo está certo. A fila de `await` na frente dele é que nunca o deixa chegar.

---

## O que esta spec decide antes de qualquer código

São duas decisões. Cada uma vira um `D` em `docs/DECISOES.md`: `#d80` e `#d81`.

### 1. A mutação do caixa despacha e não espera — `#d80`

A regra que `#d62` deu à contagem passa a valer para as mutações que mantêm o agregado:
**nenhuma escrita do Firestore é esperada dentro da mutação.** Todas são despachadas, na
ordem, e a função retorna. O cache local já aplicou as três ou quatro escritas, os
`onSnapshot` da tela já redesenharam com elas, e a fila do IndexedDB sobe tudo quando houver
rede — inclusive o `increment`, que é a razão de ele ter sido escolhido.

O que isso torna impossível: uma escrita da fila depender da resposta de outra. Só há um
lugar assim, e ele tem conserto de uma linha — `gravarTransacao` usa `addDoc` para saber o id
que `marcarPedidoPago` grava em `transacaoId`. `doc(colTransacoes(contaId))` devolve uma
referência com id gerado **no aparelho, sem ida ao servidor**; `setDoc` naquela referência faz
o resto. O id existe antes de qualquer rede, que é o que sempre precisou acontecer.

O que se perde é o mesmo que `#d40` e `#d62` já aceitaram: uma falha de permissão apareceria
numa tela que ela já deixou. A falha plausível aqui é ausência de rede, e ausência de rede não
é falha. A defesa é o `SeloSincronizacao`, que a tela já desenha e que passa a contar a
verdade — porque agora a escrita do agregado está de fato na fila, e `hasPendingWrites` a vê.

### 2. O agregado passa a poder ser desmentido pela tela — `#d81`

A `/financeiro` já assina as duas fontes: a coleção de lançamentos do mês e o agregado do mês.
Enquanto forem duas, **elas se conferem**. `Σ` dos lançamentos de entrada da lista tem de ser
`entradas` do agregado, e o mesmo para as saídas — não por aproximação: a consulta da lista é
exatamente o conjunto que alimenta aquelas parcelas (`arquivado == false`,
`competencia == mês`).

Quando divergem, a tela diz, em texto, com ícone, acima dos cartões, e aponta para
"Recalcular o mês", que já existe e já conserta. Zero custo de leitura: os dois documentos já
estão na tela.

Isto não é enfeite. É o que fecha o silêncio que o próprio módulo denuncia: sem esta
comparação, o próximo delta perdido — por outro motivo, daqui a seis meses — vai ser
descoberto do mesmo jeito que este, por alguém olhando um gráfico e achando estranho.

A comparação não cobre `produtos` nem o `pedidos` de cada dia: provar aqueles exigiria a
consulta de pedidos pagos do mês, que a tela não assina. O que a tela pode provar, ela prova.

---

## Escopo

### 1. `src/lib/firebase/mutations/transacoes.ts`

- `gravarTransacao` troca `addDoc` por `doc(colTransacoes(contaId))` + `setDoc`, e devolve o
  id sem esperar. O corpo gravado não muda em campo nenhum.
- `criarTransacao`, `atualizarTransacao`, `arquivarTransacao`, `corrigirValorDaTransacao` e
  `arquivarDocumentoDaTransacao` despacham e não esperam.
- Um único auxiliar `despachar(promessa)` — três linhas — engole a rejeição e a registra, para
  que uma escrita recusada não vire `unhandledrejection` numa aba que ninguém está olhando.
  Um lugar só, e não um `.catch` repetido em quinze chamadas.

As assinaturas continuam `async` e continuam devolvendo o que devolviam. **Nenhuma tela muda
por causa disto** — elas seguem com `await` e seguem fechando o painel quando a promessa
resolve, só que agora ela resolve no toque, e não na reconexão.

### 2. `src/lib/firebase/mutations/pedidos.ts`

`marcarPedidoPago`, `desfazerPagamento`, `atualizarPedido`, `criarPedido`, `mudarStatusPedido`
e `arquivarPedido` despacham e não esperam. A ordem das escritas fica idêntica; o que sai é o
`await` entre elas.

A guarda `if (pedido.pago) return` de `marcarPedidoPago` continua onde está: ela lê o
documento que a tela já tem, e não o servidor.

### 3. `src/lib/firebase/mutations/agregado.ts` e `clientes.ts`

`aplicarNoAgregado` e `aplicarPedidoNoCliente` despacham o `setDoc` e retornam. `recalcularMes`
**continua esperando** — ela é a rede de segurança, faz duas consultas antes de escrever, já
exige rede para existir e já diz isso na tela quando falha.

### 4. `src/lib/domain/caixa.ts` — a função nova

```ts
/** O que a lista de lançamentos prova sobre o agregado do mesmo mês. */
export function conferirAgregado(
  lancamentos: { tipo: TipoTransacao; valor: Centavos }[],
  parcelas: Pick<ParcelasDoAgregado, "entradas" | "saidas">,
): { confere: boolean; entradas: Centavos; saidas: Centavos };
```

Pura, sem Firebase, sem React, como todo o resto de `domain/`. Devolve os dois totais somados
da lista e se eles batem com o agregado, para que a tela possa dizer o número certo em vez de
só dizer que há um número errado.

### 5. `src/components/financeiro/TelaFinanceiro.tsx`

Um bloco acima de `ResultadoDoMes`, visível só quando `confere` é falso:

> ⚠ **Estes números estão atrasados.** A lista deste mês soma R$ 1.480,00 que entraram, e o
> resumo acima está contando R$ 280,00. Recalcular o mês põe tudo no lugar.

Com o botão "Recalcular o mês" ali dentro, além do que já existe no pé da tela — quem precisa
dele agora não deveria ter de rolar até o fim para achá-lo.

Ícone e texto carregam o aviso, e não só a cor (invariante de `CLAUDE.md`).

### 6. `tests/domain/caixa.test.ts`

Um `describe` novo para `conferirAgregado`: bate, não bate, mês vazio, e — o caso que dá nome
à spec — a lista com cinco lançamentos contra um agregado que só recebeu um.

---

## Caso de aceite, com números

Os números são os da captura. Cookie pistache a R$ 15,00 com custo de R$ 8,72 (sobra R$ 6,28);
Cookie cacau com Nutella a R$ 13,00 com custo de R$ 3,64 (sobra R$ 9,36).

**Um pedido, 7 de setembro, cinco de cada sabor, pago no PIX (taxa zero).**

|                     |                                                 |
| ------------------- | ----------------------------------------------- |
| Subtotal            | 5 × 1500 + 5 × 1300 = **14000**                 |
| `produtos.pistache` | `{ quantidade: 5, receita: 7500, lucro: 3140 }` |
| `produtos.nutella`  | `{ quantidade: 5, receita: 6500, lucro: 4680 }` |
| `porDia['07']`      | `{ entradas: 14000, saidas: 0, pedidos: 1 }`    |

**O roteiro que reproduz o defeito e prova a correção.** Em navegador, com DevTools:

1. Rede em **Offline**. Marcar o pedido como pago.
   - **Hoje:** o botão fica preso em "salvando". `agregados/2026-09` não recebe nada.
   - **Depois:** o painel fecha no toque, o selo diz que há coisa a subir, e a tela já mostra
     `porDia['07']` com 14000 e o ranking com 5 unidades de cada — porque o cache local
     aplicou o `increment`.
2. Ainda offline, lançar uma saída de R$ 90,00 no dia 5.
   - **Depois:** o gráfico ganha a barra vermelha do dia 5 na hora.
3. Voltar a rede a **Online**, recarregar.
   - **Depois:** os mesmos números, agora vindos do servidor, e o selo limpo.
4. Fechar a aba **antes** de religar a rede, e reabrir depois.
   - **Depois:** os mesmos números. É este passo que separa esta spec de um conserto de
     fachada — a fila do IndexedDB sobrevive à aba; uma continuação de `async` não.
5. Com o mês já torto de antes, abrir `/financeiro`.
   - **Depois:** o aviso do `#d81` aparece com os dois totais, e "Recalcular o mês" o resolve.

---

## O conserto do estrago já feito

O código corrigido não conserta o mês que já torceu: o `increment` que nunca foi despachado
não vai aparecer sozinho. **"Recalcular o mês" é o conserto**, e ele reconstrói o mês inteiro
a partir dos documentos, as duas metades, sem depender de nenhuma parcela antiga.

Ao fim da sessão, com o código no ar: abrir `/financeiro`, e para **cada mês que o aviso do
`#d81` acusar**, apertar "Recalcular o mês" com rede. Setembro de 2026 é o mês da captura e
certamente está na lista.

O botão já avisa que precisa de internet, e essa exigência fica.

---

## Critérios de aceite

- [ ] Nenhuma escrita do Firestore é esperada dentro de `transacoes.ts`, `pedidos.ts`,
      `clientes.ts` e `aplicarNoAgregado` — `recalcularMes` é a única exceção, e ela está
      comentada como tal.
- [ ] `gravarTransacao` produz o id sem ida ao servidor, e o corpo gravado é campo a campo o
      de hoje.
- [ ] O roteiro de cinco passos acima passa inteiro, incluindo o passo 4.
- [ ] `conferirAgregado` tem teste, e o teste inclui o caso da lista completa contra o
      agregado pela metade.
- [ ] O aviso de divergência aparece com ícone e texto, some quando os números batem, e leva
      ao recálculo sem rolagem.
- [ ] Setembro de 2026 recalculado: o gráfico mostra todos os dias com movimento e o ranking
      mostra a quantidade real de cada sabor.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d80` e `#d81` escritos em `docs/DECISOES.md`; `docs/ESTADO.md` atualizado.

---

## Fora de escopo

- **As outras cinco mutações com o mesmo `await` em fila** — `insumos.ts`, `fichas.ts`,
  `listasCompra.ts`, `metas.ts`, `configuracao.ts`. Nelas o preço de uma promessa pendente é
  um botão preso, e não um número perdido: ou escrevem um documento só, ou o que escrevem
  depois não é parcela de agregado que alguém lê. `agregados/global` é escrito por três delas
  e **lido por ninguém** (`#d67`). Vira uma spec de varredura própria, depois da 5B.
- **`TelaNota` esperar o servidor.** Dívida declarada e aceita em `#d50`: aquela tela já
  exigiu rede para ler a nota. O que ela lança no caixa passa por `criarTransacao` e é
  corrigido de graça aqui.
- **Recalcular sozinho ao detectar divergência.** O aviso conta; quem aperta é ela. Recálculo
  automático numa tela que abre offline seria uma escrita grande disparada sem pedir, e a
  falha dela apareceria como mais um número estranho.
- **Recalcular vários meses de uma vez.** Um mês por vez, pela tela do mês. Se a varredura de
  meses virar necessidade real, ela nasce com uma tela própria.
- **Mudar `MovimentoPorDia` ou `ProdutosDoMes`.** Foram lidos linha a linha nesta
  investigação e desenham corretamente o que recebem. Os dois cartões estão certos; o
  documento que os alimenta é que estava pela metade. Trocar o gráfico agora seria consertar o
  termômetro.
- **Uma segunda fonte de verdade para o ranking de produtos.** A tentação é fazer
  `ProdutosDoMes` somar os pedidos na leitura, como a lista faz. Isso desfaz `#d10` e troca um
  `read` por dezenas. O agregado continua sendo a fonte; o que muda é ele parar de perder
  parcela.

---

## Decisões desta spec que são fáceis de rejeitar

- **Não esperar a escrita esconde falha de permissão.** Esconde. É a terceira vez que este
  projeto faz a troca (`#d40`, `#d62`), e desta vez as regras em questão são as mesmas que
  acabaram de deixar a tela ler o mês. Se um dia houver papel com permissão parcial, isto
  volta à mesa.
- **A comparação da tela cobre metade do agregado.** Cobre `entradas` e `saidas`, que é o que
  a coleção assinada prova. `produtos` e `pedidos` por dia ficariam de fora até alguém assinar
  a consulta de pedidos pagos na `/financeiro` — uma consulta a mais, numa tela que hoje faz
  três. Meia rede é mais do que nenhuma.
- **O conserto do estrago é manual.** Uma migração que varresse todos os meses de todas as
  contas seria script com Admin SDK para uma usuária e três meses de dado. O botão existe.

---

## Riscos

- **A tela fecha o painel antes do servidor, e isso muda o que ela sente.** Salvar passa a ser
  instantâneo em todo lugar do caixa. É o comportamento que `/compras` e a contagem já têm, e
  é o certo — mas é mudança de sensação em telas que ela usa todo dia, e merece um olhar no
  roteiro da 5B.
- **`doc()` gera id no aparelho.** É o mecanismo padrão do SDK e o mesmo que o `addDoc` usa
  por dentro; o risco de colisão é o mesmo de hoje. Vale dizer em voz alta porque parece
  arriscado e não é.
- **O aviso de divergência pode aparecer por um instante durante uma escrita.** Os dois
  `onSnapshot` não redesenham no mesmo tique, e o agregado pode chegar antes ou depois do
  lançamento. O bloco deve ficar quieto enquanto `pendente` for verdadeiro — a tela já tem
  esse sinal, e é o que evita transformar uma correção em um alarme piscando.
- **Esta investigação não abriu o Firestore da conta.** O diagnóstico sai do código, da
  tipagem do SDK, das capturas e de duas respostas da Maynara — os dez cookies entraram como
  pedidos pagos, e a lista mostra vários dias. É consistente e explica os dois sintomas com
  uma causa só, mas o passo 1 do roteiro é o que o confirma. Se o passo 1 **não** reproduzir o
  defeito offline, pare: a causa é outra, e esta spec está errada.

---

## Aprovações pedidas

**Uma.** Depois desta spec, uma escrita recusada pelas regras de segurança no caixa não vai
mais aparecer como erro no painel — ela vai falhar calada, registrada no console, e o número
na tela vai ficar diferente do banco até a próxima recarga.

É o preço de a mutação não esperar o servidor, e é o mesmo preço que `#d40` e `#d62` já
pagaram. Está sendo pedido de novo porque aqui o que falha calado é dinheiro, e não uma marca
de item comprado.

A alternativa é manter o `await` e aceitar que o caixa não funcione sem rede — o que contraria
o invariante de `CLAUDE.md` ("Offline é o estado normal") e é exatamente o defeito que trouxe
esta spec.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro de navegador de cinco passos, que é o único lugar onde esta
correção pode ser vista — `npm test` cobre só `domain/`, e o defeito não mora lá.
