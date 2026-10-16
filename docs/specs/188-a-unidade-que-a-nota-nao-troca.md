# Spec 188 · A unidade que a nota não troca

**Tipo:** proteção. Nenhuma escrita troca, sem ninguém pedir, a unidade em que um material é contado
(grama, mililitro, unidade). A linha da nota que não diz o tamanho da embalagem herda a da última
compra. O preço que dobrou pede um "é esse mesmo" antes de gravar. E o que já está quebrado na
conta aparece com nome.
**Tamanho:** uma sessão.
**Origem:** o relato de quem conduz o projeto em 2026-10-16: a nota que cadastrou o açúcar "a
R$ 3,59 o grama" e fez o custo dos produtos disparar. Primeira de quatro (188 a 191) sobre a gestão
dos materiais.
**Depende de:** nada novo. Toca 006, 049, 050, 051, 088, 089 e 091.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. Nenhum campo novo, nenhuma regra,
nenhuma dependência.
**Decisões a registrar:** duas, numeradas na sessão: (1) a unidade base de um material só muda pelo
caminho que converte as receitas (191), e (2) o salto de preço passa a pedir confirmação.

---

## Problema

O caminho do açúcar, refeito no código:

1. A linha impressa era algo como `ACUCAR REFINADO UNIAO   1 UN   3,59`, sem `1KG` na descrição.
2. `embalagemDoTexto` não achou tamanho nem `C/n`, a coluna dizia `UN`, e caiu no palpite
   `{ 1, "un" }` (`notaFiscal.ts`, regra 4).
3. `parearComInsumos` achou "Açúcar" pelo nome, e a linha virou "Atualiza".
4. `saltoDePreco` devolve `null` quando a base muda (`g` → `un`), e o "Com esse preço" da nota tira
   da conta a linha de base trocada. **Nenhum aviso apareceu.**
5. `atualizacaoDaLinha` gravou `unidadeCompra: "un"`, e o material passou a custar 359 centavos
   **por unidade**.
6. As receitas guardam "200" com `unidadeBase: "g"` (`ItemFichaTecnica`). `custoDeHoje` multiplica
   200 por 359: a linha do açúcar vira R$ 718,00 e a sobra de todo produto com açúcar despenca.
   Abrir o produto e salvar piora: `FormularioFicha` relê a unidade do material e a linha passa a
   dizer "200 un".
7. A compra fica no histórico para sempre (`arrayUnion`), e corrigir à mão empurra uma segunda
   entrada por cima (189).

O mesmo buraco existe no formulário do material: trocar `kg` por `un` num material usado em receitas
grava sem pergunta (`EfeitoDoPrecoDigitado` só esconde o bloco). E o aviso de salto que existe
(`#d291`) é só texto: o "Cadastrar" passa por cima dele.

---

## 1 · O que esta spec decide

### A regra, no domínio

`baseAceita(novaBase, basesDasReceitas)` em `domain/custoInsumo.ts`, pura, com teste:

- Nenhuma receita usa o material: qualquer base serve.
- Alguma usa: a base nova tem de ser a das receitas. Isso também deixa **voltar** para a base certa
  um material que já está quebrado (o açúcar em `un` com receitas em `g` aceita `kg` de novo).
- `basesDasReceitas(fichas, insumoId): Set<UnidadeBase>` sai de `ficha.itens`, da mesma consulta
  que "Onde entra" já usa.

### A embalagem que a nota não diz

`embalagemDoTexto` passa a dizer de onde tirou a resposta: `origem: "texto" | "coluna" | "palpite"`.
Na tela, a linha pareada cuja embalagem é `"palpite"`, ou cuja base não é a do material, nasce com
a **embalagem da última compra** do material (`quantidadeCompra` e `unidadeCompra` gravados), e com
a frase "Embalagem da última compra: 1 kg. Confira no pacote." No caso do açúcar, sairia R$ 3,59 o
quilo, sem ninguém tocar em nada.

A troca mora numa função do domínio, `embalagemParaOMaterial(linha, material)`, e é aplicada em
`receber()` e de novo quando o pareamento muda (corrigir o nome). Linha nova (sem par) fica como
está.

### A linha da nota que atualiza

- O seletor de unidade de uma linha pareada oferece só as unidades da base do material
  (`unidadesCompativeis`), como o editor de produto já faz.
- Se ainda assim a base não bate (o material não tem receita e a nota disse `un`): linha "para
  conferir", com "Açúcar é contado em gramas, e esta linha veio em unidades." Ela resolve trocando a
  unidade ou tirando o pareamento (191 e 190 cobrem o resto).
- Com receitas usando o material, base que não passa em `baseAceita` **bloqueia** o "Cadastrar",
  como a linha incompleta já bloqueia.

### O salto que pede confirmação

- A linha com salto (`saltoDePreco`, dobro ou metade) ganha, no painel aberto, a caixa "O preço é
  esse mesmo". Enquanto não marcada, conta como "para conferir" **e bloqueia** o "Cadastrar".
  Marcada, a frase de atenção continua, em tom neutro, com "Você confirmou".
- `saltoDePreco` ganha o caso de material **novo** com par na biblioteca (`montarBiblioteca`, pelo
  `nomeBusca`): compara contra o preço médio de lá. Sem par nenhum, nada se compara.
- No formulário do material, a mesma regra: salto contra o gravado mostra a frase acima do
  "Salvar alterações" e pede a mesma caixa.

### O formulário do material

- Material usado em receita: o seletor de unidade oferece só as da base aceita, com a dica "Para
  contar de outro jeito, use Mudar a unidade de conta." (o link entra com a 191; até lá, a frase
  sem link).
- `atualizarInsumo` e `importarNota` recusam, com erro, um `DadosInsumo` cuja base não passa em
  `baseAceita`. É a guarda de quem chega por um caminho que a tela não previu: as telas nunca devem
  chegar a ela.

### O que já está quebrado

- `basesQueNaoBatem(insumos, fichas): Map<insumoId, UnidadeBase>` no domínio, com teste.
- Em Materiais, a linha do material ganha o selo de atenção "A unidade não bate", com ícone. Na ficha
  do material, a frase: "Os produtos medem Açúcar em gramas, e a última compra está em unidades.
  Corrija a última compra para o custo voltar ao normal." com "Editar material" levando ao campo.
- `custoDeHoje` ignora (fica no gravado) a linha cujo material está em outra base: o número absurdo
  some de `/fichas`, do "Com esse preço" e da nota enquanto ela não corrige. `MaterialDeHoje` ganha
  `unidadeBase`.
- O editor de produto, com uma linha nessa situação: a linha mantém a unidade gravada (e não a do
  material), mostra a mesma frase, e o "Salvar" fica bloqueado até o material ser corrigido.

---

## 2 · Antes de tocar em código

1. Ler `notaFiscal.ts` (`embalagemDoTexto`, `saltoDePreco`, `atualizacaoDaLinha`), `LinhaNota`,
   `TelaNota` (`receber`, `pareadas`, `efeitos`, `cadastrar`), `RodapeNota`, `FormularioInsumo`,
   `EfeitoDoPreco`, `FormularioFicha` (linhas 260 a 280 e 455 a 480), `custoDeHoje`.
2. Ler `#d51`, `#d222`, `#d224`, `#d291`.
3. Conferir na conta da MyCookie's, pela ficha do material, se o açúcar ainda está em `un`. Se
   estiver, é o roteiro 5.

---

## 3 · Escopo

- `domain/custoInsumo.ts`: `baseAceita`, `basesDasReceitas`, `basesQueNaoBatem`, com teste.
- `domain/notaFiscal.ts`: `origem` em `Embalagem`, `embalagemParaOMaterial`, o caso da biblioteca em
  `saltoDePreco`, com teste.
- `domain/custoFicha.ts`: `custoDeHoje` ignora base diferente; teste.
- `LinhaNota`, `TelaNota`, `RodapeNota`: unidades da base, frase da embalagem herdada, caixa do
  salto, bloqueio.
- `FormularioInsumo`: unidades restritas, caixa do salto.
- `mutations/insumos.ts` e `mutations/notas.ts`: a guarda.
- `LinhaInsumo`, `FichaDoMaterial`, `FormularioFicha`: o selo, a frase, o bloqueio.

---

## 4 · Roteiro

1. Nota com `ACUCAR UNIAO 1 UN 3,59`, açúcar cadastrado em 1 kg: a linha nasce com 1 kg, "R$ 3,59 o
   quilo", e a frase da embalagem herdada.
2. Na mesma linha, trocar a unidade: só `g` e `kg` aparecem.
3. Farinha a R$ 49,90 (era R$ 4,99): a linha fica para conferir, "Cadastrar" bloqueado até marcar
   "O preço é esse mesmo".
4. Formulário da manteiga, usada no cookie: o seletor não oferece `un`.
5. Material com base trocada (forçar à mão no emulador, ou o açúcar real): selo em Materiais, frase
   na ficha, produto sem o custo absurdo em `/fichas`, editor do produto bloqueado. Corrigir a última
   compra para `kg` tira o selo.

---

## Critérios de aceite

- [x] Nenhum caminho de tela troca a base de um material usado em receita.
- [x] A linha de nota sem tamanho herda a embalagem da última compra.
- [x] Salto de preço não grava sem confirmação, na nota e no formulário.
- [x] Material com a base trocada aparece com nome, e o custo dos produtos não explode por ele.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Herdar a embalagem em vez de perguntar.** A pergunta "quanto vem no pacote?" em toda linha sem
  tamanho seria a sexta pergunta da 006 (`#d51`). A última compra acerta quase sempre, e a frase
  diz de onde o número veio.
- **Bloquear o salto, e não só avisar.** Preço dobra de verdade, por isso uma caixa e não uma
  proibição. Mas o erro de vírgula custa a sobra de todos os produtos, e o aviso sem bloqueio já
  falhou uma vez.
- **Bloquear o editor de produto.** Salvar com a base trocada grava o erro na receita. Um bloqueio
  raro, com a frase que diz o que fazer, é mais barato que um custo errado gravado.

---

## Fora de escopo

- Corrigir ou descartar uma compra do histórico: é a 189.
- Escolher à mão o material de cada linha da nota: é a 190.
- Converter as receitas para outra unidade de conta: é a 191.
- Teto absoluto de preço por quilo ("açúcar não custa R$ 500 o quilo"): a biblioteca e a última
  compra já são a referência; uma tabela de tetos por material seria vinte palpites a manter.
