# Spec 045 · O mês na abertura

**Tipo:** a tela Hoje passa a dizer quanto sobrou no mês. Um bloco novo no lugar do cartão da
meta, uma função pura com teste, um segundo arranjo no desktop largo. **Nenhum campo, nenhuma
rota, nenhum índice, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Hoje com `/impeccable` sobre as capturas de web e celular de
2026-09-25, pedida por quem conduz o projeto.
**Depende de:** nada. É a primeira de quatro (045 a 048); as outras três encaixam nos lugares
que esta abre.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d210` a `#d212`.

---

## Problema

O trabalho que o produto existe para fazer é "saber se está ganhando dinheiro" (`PRODUCT.md`).
A tela que ela abre toda manhã não mostra um real que ela ganhou.

Nas capturas de 25 de setembro:

1. **O dinheiro do mês não está lá.** O único valor em reais na tela é o alvo da meta
   (R$ 2.200,00) e o que falta comprar. O que entrou, o que saiu e o que sobrou moram em
   `/financeiro`, a dois toques. Todo serviço de assinatura que retém gente abre no número que
   justifica a mensalidade: o Nubank abre no saldo, o Shopify e a Nuvemshop nas vendas do
   período, o iFood para parceiros no faturamento do dia. O Rende abre numa saudação.
2. **A meta esconde o que ela já fez.** "12 doces até o fim do mês" para R$ 2.200 quer dizer
   que ela está perto, algo como R$ 2.100 já entrou. O cartão não diz isso. O pico emocional
   do mês ("faltam R$ 100") é trocado por uma tarefa ("faça 12"). A barra de progresso de meta
   existe no `DESIGN.md` e não aparece aqui.
3. **Nada tem peso.** Faixa do teste, meta, agenda vazia e compras são cinco caixas com a
   mesma borda, o mesmo raio e o mesmo respiro. O maior texto da tela é "Boa noite, Maynara";
   o segundo é "Nada marcado para os próximos dias". O número que decide não tem o ponto âmbar
   que a marca reserva para ele.
4. **O desktop é o celular esticado.** Na captura de 1864 px a coluna de 1024 px empilha
   cinco faixas; a planejadora da noite, sentada, rola uma tela que cabia inteira.

---

## 1 · O que esta spec decide

### O mês abre a tela, com a meta dentro dele: `#d210`

`CartaoMetaHoje` sai; entra `CartaoDoMes`, no mesmo lugar e com o mesmo portão (só a dona:
`agregados` é negado à ajudante, `#d154`). Uma leitura só, o agregado do mês, como hoje.

Ordem de leitura dentro do bloco, do maior para o menor:

```
Setembro até hoje                                         ›
R$ 612,40 •            ← display, tabular; o ponto âmbar é o da marca
sobrou pra você
Entrou R$ 2.086,00 · Saiu R$ 1.473,60
▲ R$ 318,00 a mais que agosto até o dia 25       ← #d211

[████████████████████░░]  R$ 2.086 de R$ 2.200
Faltam R$ 114, uns 12 doces até o fim do mês.
```

- **O valor é `parcelasDoResumo(resumo).lucro`**, o mesmo número que `ResultadoDoMes` mostra
  como "O que sobrou no mês". Nenhuma segunda conta. Negativo: `comSinal`, cor negativa,
  `trending-down` e o rótulo "faltou no mês", como em `/financeiro`.
- **O ponto âmbar** vai depois do valor, 10 px, `aria-hidden`. É a única ocorrência na tela.
  Com lucro negativo, sem ponto: o
  ponto marca o número que decide, e não enfeita prejuízo.
- **A meta vira barra** (o componente "Barra de progresso de meta" do `DESIGN.md`: trilha
  `sunken`, preenchimento `brand-ink`, batida em `positive`), com o realizado e o alvo ao
  lado, e a frase em reais **antes** dos doces: "Faltam R$ 114, uns 12 doces até o fim do
  mês." A tradução em doces continua (é o que decide o forno), mas deixa de esconder o
  dinheiro. `esforcoRestante` e `ritmoDoEspelho` não mudam.
- **Sem meta:** a barra dá lugar a uma linha terciária "Pôr uma meta para setembro", que leva
  a `/financeiro`. **Meta batida:** barra cheia em positivo, `check` e "Meta batida no dia
  22" quando `porDia` diz o dia; senão "Meta batida".
- **Mês sem nada:** `entradas === 0 && saidas === 0` troca o bloco inteiro por uma linha:
  "Nada entrou em setembro ainda. A encomenda paga entra aqui sozinha." Um R$ 0,00 em display
  é o número mais triste do produto, e ele não precisa de destaque.
- O bloco inteiro continua sendo o alvo de toque para `/financeiro`.

### A comparação é com o mês passado na mesma altura, por entradas: `#d211`

Uma leitura a mais: o agregado da competência anterior. Função pura nova em
`src/lib/domain/caixa.ts`:

```ts
/** O que entrou até o dia `dia` num mês, pela soma de `porDia`. */
export function entradasAteODia(
  porDia: ResumoMensal["porDia"],
  dia: number,
): Centavos;
```

A comparação é `entradasAteODia(atual, hoje) - entradasAteODia(anterior, hoje)`, **em
entradas e não em sobra**, porque `porDia` só guarda entradas e saídas e a sobra do dia não
existe gravada; o rótulo diz "a mais que agosto" sobre o que entrou, sem fingir outra coisa.
Dia 31 contra mês de 30 compara com o mês inteiro. Mês anterior sem agregado: a linha não
aparece. Diferença abaixo de R$ 1,00: "igual a agosto até o dia 25".

Seta **e** palavra: `trending-up` + "a mais", `trending-down` + "a menos". Cor positiva ou
neutra (`ink-muted`), **nunca negativa**: vender menos que agosto até o dia 25 não é erro, e
vermelho aqui seria o alarme que a marca não é.

Testes: dia 1, mês curto contra longo, mês anterior ausente, `porDia` com buraco.

### Dois arranjos, a partir do desktop largo: `#d212`

A partir de `xl` (1280 px), a coluna da Hoje vira duas: **à esquerda o dia** (o que espera
por você, da 046, e a agenda), **à direita o mês** (este bloco, compras, produto no
vermelho). Proporção `minmax(0,7fr) minmax(0,5fr)`, `gap-6`, a direita grudenta abaixo do
cabeçalho. Abaixo de `xl`, a pilha de hoje, na ordem:

1. faixa do teste · 2. primeiros passos · 3. o mês · 4. produto no vermelho · 5. agenda ·
2. compras

É o mesmo desenho em dois arranjos, que o `DESIGN.md` permite ("uma estrutura só, dois
arranjos"); nada muda de conteúdo entre eles. A ajudante, sem o mês, fica com a coluna única
em qualquer largura: uma coluna direita com só o cartão de compras seria um buraco.

---

## 2 · Antes de tocar em código

- Ler `ResultadoDoMes.tsx`, `parcelasDoResumo` e o `#d209` (a maquininha no mês fechado): o
  "sobrou" daqui tem de ser o mesmo número de lá, centavo por centavo.
- Conferir que o tema claro é o padrão: as capturas estão no escuro porque o aparelho está no
  escuro. O roteiro roda nos dois.

---

## 3 · Escopo

### 3.1 Domínio: `src/lib/domain/caixa.ts`

`entradasAteODia` e o teste dela. O dia da meta batida **não é função nova**: é
`diaEmQueBateu` de `src/lib/domain/avisos.ts`, a mesma que o cron da 044-B usa. Duas cópias da
mesma soma discordariam um dia.

### 3.2 `src/components/financeiro/CartaoDoMes.tsx`

Novo, substitui `CartaoMetaHoje` (que é apagado; nada mais o importa). Duas leituras:
`docResumoMensal` da competência atual e da anterior. Esqueleto com a forma do bloco
(`h-44`) enquanto a atual carrega; a anterior carregando não segura o bloco, a linha da
comparação só aparece quando chega.

### 3.3 `src/app/(app)/(coluna)/page.tsx`

A grade de `#d212`, com as duas colunas como `<section>` com rótulo (`aria-labelledby`
escondido: "O dia" e "O mês"). `mt-6 space-y-4` vira ritmo variado: 16 px dentro de um grupo,
24 px entre grupos.

---

## 4 · Roteiro de navegador

Nos dois temas, a 390 px, 1024 px e 1440 px:

1. Conta com entradas e meta a meio caminho: o valor em display, o ponto depois dele, a
   barra, a frase em reais antes dos doces.
2. Mudar o relógio do aparelho para dia 1: a comparação diz "igual" ou some.
3. Conta com saída maior que entrada: sinal, cor, `trending-down`, sem ponto.
4. Login de ajudante: nenhum bloco do mês, coluna única a 1440 px.
5. 1440 px: duas colunas, a direita não rola com a esquerda.
6. Leitor de tela: "Setembro até hoje, 612 reais e 40 centavos, sobrou pra você", e o ponto
   não é lido.

---

## Critérios de aceite

- [ ] `CartaoDoMes` no lugar de `CartaoMetaHoje`; o "sobrou" é o de `/financeiro`.
- [ ] Barra de meta com realizado e alvo; frase em reais antes dos doces.
- [ ] Comparação com o mês anterior por `entradasAteODia`, com seta e palavra, nunca vermelha.
- [ ] Mês sem nada vira uma linha, sem R$ 0,00 em display.
- [ ] Um ponto âmbar na tela, e nenhum com lucro negativo.
- [ ] Duas colunas a partir de `xl` para a dona; coluna única para a ajudante.
- [ ] Teste de `entradasAteODia`; o dia da meta batida vem de `diaEmQueBateu`.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `firestore.rules` e `package.json` intocados.
- [ ] `#d210` a `#d212` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Gráfico do mês na Hoje.** `/financeiro` tem o dia a dia; a Hoje tem o número e a direção.
  Um gráfico aqui é o "dashboard SaaS escuro genérico" do `PRODUCT.md`.
- **Comparação da sobra.** Pede `porDia[].lucro` gravado, que é mudança no agregado e nas
  mutações do caixa. Volta se ela perguntar "e o que sobrou, comparado?".
- **O que espera por você e a agenda vazia.** É a 046.
- **Mexer no cabeçalho** (saudação e data). Ele é o cromo de todas as telas; encolher só o
  da Hoje é exceção sem ganho que pague.

---

## Decisões desta spec que são fáceis de rejeitar

- **Dinheiro na tela de entrada da ajudante não, nem em arranjo.** Já está na regra (`#d154`);
  só confirma.
- **Comparar entradas e não sobra.** É o dado que existe. Se o rótulo confundir no roteiro,
  a linha sai antes de a spec mudar o agregado.

## Riscos

- **O número pode estar errado.** O `#d81` já mostrou agregado discordando dos lançamentos.
  Na Hoje o erro fica mais visível. A saída é a mesma de `/financeiro`: o aviso de
  discordância mora lá, e o bloco leva para lá.

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, com o resultado real.
