# Spec 073 · O caixa com peso

**Tipo:** `/financeiro` deixa de ser sete cartões iguais empilhados. Cartão só onde é unidade
(o mês e a meta); o resto vira seção no papel. No desktop largo, duas colunas como a Hoje. O
gráfico do dia para de desenhar trinta dias vazios no começo do mês e leva à lista. A barra de
medida do ranking deixa de parecer linha selecionada. **Nenhum campo, nenhuma consulta, nenhuma
regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa sobre os prints de 2026-10-02.
**Depende de:** 069, 070, 071 e 072. Arruma o que elas puseram na tela; por isso vem depois.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d267` e `#d268`.

---

## Problema

Lido nos prints:

**Tudo tem o mesmo peso.** Resultado, meta, encomenda, movimento, o que mais vendeu e
lançamentos são sete caixas com a mesma borda, o mesmo raio e o mesmo respiro. O `DESIGN.md` diz
que cartão é para "unidade destacável" (meta, resumo do mês) e que lista é lista com divisórias;
a tela trata ranking, gráfico e lançamentos como cartões. É o mesmo diagnóstico da Hoje na 045.

**O desktop é o celular esticado.** No print de 1864 px a coluna de 830 px empilha tudo, e a
metade direita da tela fica vazia do primeiro ao último pixel. Ela planeja à noite, sentada,
diante do monitor; rola uma página que caberia em uma tela e meia. A Hoje já resolveu isso com
dois arranjos a partir de `xl` (`#d212`).

**O gráfico do dia 2 é 93% de nada.** "Movimento por dia" desenha 30 colunas para dois dias de
dado: uma barra verde fina no canto esquerdo e 28 colunas vazias. Ocupa a mesma altura no dia 2
e no dia 30. E não leva a lugar nenhum: ver uma barra alta não mostra o que entrou naquele dia.

**A barra de medida do ranking parece estado.** Em "O que mais vendeu", o fundo `sunken` atrás
da linha cobre 100% da largura do primeiro produto e 55% do segundo. No celular, "Combo Dupla"
inteiro em cinza lê como linha selecionada ou desabilitada, não como "vendeu mais".

**A rede de segurança fala de software.** "Os números acima são somados a cada lançamento. Se
algum deles parecer estranho, refazer o mês inteiro a partir da lista põe tudo no lugar." É o
mecanismo do agregado explicado a quem não precisa dele. A tela já tem o aviso certo quando o
número está errado de fato (`AgregadoAtrasado`, `#d81`).

---

## 1 · O que esta spec decide

### Cartão para o mês e a meta; seção para o resto; duas colunas no largo: `#d267`

**Celular e desktop até `xl`**, a pilha, nesta ordem e com este peso:

| Ordem | O quê                                       | Forma                                |
| ----- | ------------------------------------------- | ------------------------------------ |
| 1     | O que o mês rendeu (069), comparação (071)  | **cartão**                           |
| 2     | Até o fim do mês e contas que repetem (070) | seção no papel, lista com divisórias |
| 3     | Meta                                        | **cartão**                           |
| 4     | Lançamentos do mês (072)                    | seção no papel, lista em `surface`   |
| 5     | Movimento por dia                           | seção no papel                       |
| 6     | O que mais vendeu · Para onde foi           | seção no papel, lista com divisórias |
| 7     | Os últimos 12 meses (071)                   | seção no papel                       |

Os lançamentos sobem para o quarto lugar: é o que ela mais toca (corrigir, conferir), e no
celular hoje estão depois de três telas de gráfico e ranking.

"Seção no papel" é `h2` em `subheading` sobre o `--canvas`, sem borda nem raio, com a lista em
`--surface` e divisórias quando há linhas. Respiro de 32 px entre grupos, 16 px dentro (`DESIGN.md`,
ritmo).

**A partir de `xl` (1280 px)**, duas colunas, `minmax(0,7fr) minmax(0,5fr)`, `gap-6`, como a
Hoje (`#d212`):

- **Esquerda, o mês em movimento:** 1, 2, 4 (rendeu, até o fim do mês, lançamentos).
- **Direita, o mês em perspectiva:** 3, 7, 5, 6 (meta, doze meses, movimento, ranking e saídas).
  Rola com a página, sem `sticky`: com quatro seções ela é mais alta que a janela, e coluna
  grudenta que corta conteúdo é pior que coluna que rola.

Mesmo conteúdo nos dois arranjos; nada aparece só no desktop. Entre `lg` e `xl` (1024 a 1279) a
pilha, na coluna de leitura.

**O ranking.** A barra de medida sai de trás da linha e vira um traço de 4 px sob o nome, trilha
`--surface-sunken`, preenchimento `--ink-subtle`, raio cheio, na largura da coluna do nome. A
linha fica com fundo `--surface`, igual às outras. O mesmo em "Para onde o dinheiro foi", pelo
mesmo motivo.

**A rede de segurança.** O parágrafo sai. Fica, no pé, só o botão terciário "Refazer as contas do
mês" com o aviso `aria-live` de hoje. O `AgregadoAtrasado` continua sendo quem fala quando há
divergência.

### O gráfico mede o que já passou e leva ao dia: `#d268`

- **Mês corrente:** o eixo vai do dia 1 a `max(hoje, 7)`. No dia 2, sete colunas largas; no dia
  20, vinte. O título diz "Movimento até hoje". Mês fechado: o mês inteiro, "Movimento por dia".
- **Altura** de 96 px até 7 dias com movimento, 128 px (160 no `lg`) a partir daí: dois dias de
  dado não precisam do gráfico do tamanho de um mês.
- **Tocar num dia filtra a lista** (072) por ele: a faixa de filtros mostra "1 de out. ×" e a tela
  rola até a lista. Cada coluna vira `<button>` com o `sr-only` de hoje como rótulo; no celular a
  coluna de um mês de 31 dias tem 11 px, então o alvo é a coluna mais a vizinha (44 px por
  sobreposição invisível, com o dia mais próximo do toque vencendo), conferido no roteiro.
- O filtro de dia entra em `filtrarLancamentos` como mais um campo; o teste da 072 ganha o caso.

---

## 2 · Antes de tocar em código

1. As quatro specs anteriores codificadas; ler o `ESTADO.md` delas.
2. Ler a 045 (`#d212`) e o `page.tsx` da Hoje: o grid é o mesmo, com os mesmos nomes de classe.
3. `/impeccable` com registro **product**, e o skill `dataviz` para o gráfico.

---

## 3 · Escopo

- `TelaFinanceiro`: a ordem, os dois arranjos e as duas colunas como `<section>` com rótulo
  escondido ("O mês" e "Em perspectiva").
- `MovimentoPorDia`: eixo, altura, título, botões.
- `ProdutosDoMes` e `SaidasPorCategoria`: o traço no lugar do fundo, as seções sem cartão.
- O pé da tela: o parágrafo sai, o botão fica.

---

## 4 · Roteiro de navegador

A 390, 1024, 1280 e 1864 px, nos dois temas.

1. **1864 px:** as duas colunas, sem metade vazia; o mês dos prints cabe sem rolar até o fim da
   coluna da direita.
2. **1024 px:** a pilha na coluna de leitura.
3. **390 px:** os lançamentos aparecem antes do gráfico; nenhuma rolagem lateral.
4. **Dia 2:** o gráfico com sete colunas e 96 px; tocar no dia 1 filtra a lista nos três
   lançamentos do dia 1.
5. **Ranking:** nenhuma linha parece selecionada; o traço compara.
6. **Dois cartões** na tela inteira (o mês e a meta).

---

## Critérios de aceite

- [x] Só o bloco do mês e a meta com borda e raio de cartão.
- [x] Duas colunas a partir de `xl`, mesma ordem de leitura para teclado e leitor de tela.
- [x] Gráfico até `max(hoje, 7)` no mês corrente; colunas são botões com rótulo.
- [x] Nenhum fundo de linha inteira usado como medida.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d267` e `#d268` escritos; o `DESIGN.md` ganha a linha "Seção no papel" na tabela de
      componentes; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Tabela de lançamentos no desktop** (como Pedidos, `#d253`). Com a 072 a lista já se acha; a
  tabela volta se as colunas se mostrarem necessárias.
- **Gráfico de pizza, de linha, de categoria por mês.** Uma faixa e um gráfico de barras bastam.
- **Painel acoplado do lançamento no desktop.** O painel lateral de hoje serve.

---

## Decisões desta spec que são fáceis de rejeitar

- **Lançamentos antes do gráfico.** Quem abre a tela para "ver como foi o mês" quer o gráfico
  antes. Mas o gráfico ficou menor e mais curto (`#d268`), e conferir lançamento é o que ela faz
  toda semana.
- **A meta à direita no desktop**, longe do rendeu. A meta é de faturamento; o rendeu, de sobra.
  Juntos, um parece o progresso do outro.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
