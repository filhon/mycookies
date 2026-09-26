# Spec 047 · Quanto cobrar

**Tipo:** a tela Hoje ganha a busca "Quanto cobrar?" na faixa de ferramentas do cabeçalho. Ela
responde, sem sair da tela, o preço e a sobra de um produto, para a quantidade que a cliente
pediu. Uma função pura com teste, um componente. **Nenhum campo, nenhuma rota, nenhuma
consulta nova** (a lista de fichas já é assinada pela tela), **nenhuma regra, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Hoje com `/impeccable` (2026-09-25).
**Depende de:** nada. Encaixa em cima da 045 e da 046, mas não precisa delas.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d216` e `#d217`.

---

## Problema

O `PRODUCT.md` diz como se mede o sucesso do produto: "ela abrir o app antes de dar um preço a
uma cliente no WhatsApp, e nunca mais chutar". O contexto 3 (entrega ou feira, em pé, uma mão,
poucos segundos) é "consulta preço e registra venda".

Hoje, da tela de entrada até o preço de 30 brigadeiros:

1. tocar em Produtos na navegação inferior;
2. tocar na busca, digitar;
3. achar a linha, ler o preço unitário;
4. fazer 30 × o preço de cabeça, ou abrir a calculadora do celular.

Quatro passos e uma conta de cabeça, no momento em que a cliente está esperando a resposta no
WhatsApp. O produto que faz a aritmética por ela para no último passo. Os serviços que viram
hábito colocam a ação mais frequente **na primeira tela**: o Nubank põe o Pix, o Uber põe o
"Para onde?". O "para onde?" do Rende é "quanto cobro por isso?".

---

## 1 · O que esta spec decide

### A busca da Hoje responde o preço, com quantidade: `#d216`

`CampoBusca` na faixa de ferramentas do `CabecalhoPagina` (o lugar que o `#d128` já dá a busca,
no papel, logo abaixo da tinta), com o rótulo e o placeholder **"Quanto cobrar? Ex.: 30
brigadeiros"**.

Enquanto o campo tem texto, o conteúdo da Hoje dá lugar à resposta (a tela não navega, não abre
folha, e apagar o texto devolve a Hoje como estava, na mesma rolagem):

```
Brigadeiro tradicional                          30 ×  R$ 2,50
                                                     R$ 75,00 •
sobram R$ 36,60 pra você, depois da maquininha
───────────────────────────────────────────────────────────────
Brigadeiro de pistache                          30 ×  R$ 3,80
                                                    R$ 114,00
sobram R$ 51,90 pra você
```

- **A quantidade sai do começo do texto**: "30 brig", "30 brigadeiros", "brig 30" e "brig"
  (quantidade 1). Função pura nova, `lerPedidoDeBusca(texto): { quantidade: number; termo:
string }`, em `src/lib/domain/precificacao.ts`, com teste: número no começo ou no fim,
  vírgula decimal para produto por peso ("1,5 kg bolo" é 1,5), nenhum número = 1, número zero
  ou absurdo (> 9999) = 1 e o número vira parte do termo.
- **O termo filtra como `/fichas`**: `chaveDeBusca(termo)` contra `nomeBusca`. Mesma função,
  para as duas buscas nunca discordarem.
- **Cada linha é uma ficha viva com preço**: nome, `quantidade × preço` em `label`, o total em
  `heading` tabular, e **a sobra do total** com o custo de hoje (`custosDeHoje`, a mesma sobra
  de `CartaoNoVermelhoHoje`), para que a resposta nunca seja um preço sozinho (`DESIGN.md`,
  "preço + sobra"). Sobra negativa: sinal, `negative`, `trending-down` e "você paga R$ 4,20
  para vender".
- **O ponto âmbar vai no total da primeira linha**, a que ela vai mandar. Enquanto a busca está
  aberta, o bloco do mês (045) não está na tela, e o ponto continua único.
- **Tocar na linha** leva a `/fichas/{id}`. **Nenhum botão "mandar orçamento" nesta spec**
  (ver fora de escopo).
- Até 6 linhas; "Ver os N produtos" leva a `/fichas?busca={termo}` se `/fichas` já lê o
  parâmetro, senão a `/fichas`.
- **Nenhum resultado:** "Nenhum produto com "{termo}". O preço sai da ficha: [Montar um
  produto]", terciário para `/fichas/nova` (ou o caminho que o editor usa para ficha nova).

A **ajudante** também vê: ela responde cliente, e o custo do produto é dela também (`#d157`).
A sobra aparece para ela igual.

### Sem botão primário novo na Hoje: `#d217`

O `DESIGN.md` diz que a Hoje é tela de leitura e que o primário da agenda vazia é secundário.
A busca **não** muda isso: ela é campo, não botão, e não disputa o primário de nenhuma tela. No
celular ela mora na faixa de ferramentas, que rola junto com o cabeçalho grudento; com o
teclado aberto, a variante `apertado:` do cabeçalho já encolhe o respiro.

Consequência que precisa ficar registrada: o `descricaoSempreVisivel` da Hoje continua (a data
é da Hoje), e o cabeçalho da Hoje passa a ter faixa de ferramentas, como o de `/fichas`.

---

## 2 · Antes de tocar em código

- Ler `custosDeHoje` e o `#d135` (a sobra de hoje é o gravado mais o que mudou): a sobra da
  busca tem de ser a mesma do cartão do vermelho e da seta de `/fichas`.
- Conferir se a taxa da maquininha já está dentro de `sobra` (o "depois da maquininha" só pode
  ser escrito se estiver). Se não estiver, a frase fica "sobram R$ 36,60 pra você" e nada mais.
- A lista de fichas já é assinada duas vezes na Hoje (vermelho e compras). A busca usa a
  mesma consulta; o `useColecao` com a mesma query cai no mesmo cache. Se a sessão achar que
  vale, sobe a assinatura para a página e passa por props, mas isso não é escopo obrigatório.

---

## 3 · Escopo

- `src/lib/domain/precificacao.ts`: `lerPedidoDeBusca` e teste.
- `src/components/fichas/QuantoCobrar.tsx`, novo: o campo controlado de fora e as linhas.
- `src/app/(app)/(coluna)/page.tsx`: o estado `busca`, o `CampoBusca` como `children` do
  `CabecalhoPagina`, e a troca do conteúdo quando `busca.trim()` não é vazio.

---

## 4 · Roteiro de aparelho

Celular, tema claro, em pé, uma mão:

1. Da Hoje, digitar "30 brig": o total aparece na primeira linha sem tocar em mais nada.
2. "brig 30" e "30 brigadeiros" dão o mesmo resultado.
3. Apagar: a Hoje volta na mesma posição de rolagem.
4. Produto com a sobra negativa: sinal, ícone e a palavra.
5. Sem rede: a busca responde do cache.
6. Leitor de tela: o total e a sobra são lidos juntos, e a mudança de resultados é anunciada
   uma vez (`aria-live="polite"` na contagem, não na lista).

---

## Critérios de aceite

- [ ] Busca na faixa de ferramentas da Hoje; a Hoje volta intacta ao apagar.
- [ ] `lerPedidoDeBusca` com teste (número no começo, no fim, decimal, ausente, absurdo).
- [ ] Toda linha com total e sobra do total; negativo com sinal, cor, ícone e palavra.
- [ ] Mesma `chaveDeBusca` de `/fichas`; mesma sobra de `custosDeHoje`.
- [ ] Nenhuma consulta nova; nenhum primário novo na Hoje.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d216` e `#d217` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **"Mandar esse preço" / virar orçamento.** É o passo natural seguinte: a linha gera a
  mensagem do WhatsApp (`domain/whatsapp.ts`) ou abre o editor de pedido semeado com o item.
  Pede o editor aceitar semente pela URL. Spec própria, se o roteiro mostrar que ela copia o
  número à mão depois de buscar.
- **Combos e kits na busca.** Se `custosDeHoje` já os cobre, entram de graça; se não, ficam.
- **Busca por voz.** O teclado do celular já tem o microfone.
- **Registrar venda de balcão pela Hoje.** O outro verbo do contexto 3. Hoje mora no caixa;
  se entrar, entra pela mesma faixa, em spec própria.

---

## Decisões desta spec que são fáceis de rejeitar

- **A busca substitui o conteúdo em vez de abrir folha.** Folha seria o padrão do sistema para
  detalhe; aqui não há detalhe, há resposta, e a folha esconderia o campo que ela está
  editando.
- **Ler a quantidade do texto em vez de um segundo campo.** Um campo a mais é um toque a mais
  com uma mão; o texto é como ela já escreve no WhatsApp.
