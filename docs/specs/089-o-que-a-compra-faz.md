# Spec 089 · O que a compra faz nos seus produtos

**Tipo:** a conferência da nota mostra, antes de cadastrar, o que os preços novos fazem com a
sobra de cada produto, e desconfia em voz alta da linha cujo preço por quilo pulou demais. O
"pronto" mostra a mesma coisa no lugar de uma contagem. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Ler uma nota" (2026-10-05).
**Depende de:** a 051 (`efeitoDoPrecoNovo`, `EfeitoDoPreco`).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d291`.

---

## Problema

A nota é o momento em que mais preços mudam de uma vez, e é o único lugar do sistema onde
preço muda sem dizer o que faz.

1. **O formulário de um material diz; a nota de vinte não.** Desde a 051, trocar o preço da
   manteiga à mão mostra "Cookie tradicional: sobrava R$ 3,19, passa a R$ 2,87". Ler uma nota
   que troca a manteiga, a farinha e o chocolate mostra "Atualiza · Manteiga · era R$ 11,90"
   em cada linha, e nenhuma consequência. É o princípio 3 do `PRODUCT.md` quebrado justamente
   onde ele pesa mais.
2. **O "pronto" termina numa tarefa.** "3 produtos ficaram com o custo desatualizado. Abra e
   salve para o preço acompanhar." O fim da experiência é uma contagem e um dever de casa, sem
   dizer quais, nem quanto.
3. **Erro de leitura que passa pelo preço.** Uma vírgula lida errado (R$ 125,00 no lugar de
   R$ 12,50) ou "1 g" no lugar de "1 kg" produzem um custo por quilo absurdo. A frase
   "R$ ÷ quantidade = R$ por kg" está lá, mas nada a compara com o preço que o material tinha:
   a defesa depende de ela reparar sozinha, em vinte linhas.

---

## 1 · O que esta spec decide: `#d291`

### O efeito de todos os preços de uma vez

- `efeitoDoPrecoNovo(fichas, materiais, materialNovo)` vira
  `efeitoDosPrecosNovos(fichas, materiais, novos: MaterialDeHoje[])`, com a troca de todos os
  `novos` antes do segundo `custosDeHoje`. O formulário de material passa a chamá-la com um
  elemento. Mesmo filtro (só fichas cuja sobra mudou) e mesma ordem. Teste novo com dois
  materiais mudando a mesma ficha em direções opostas.
- `TelaNota` assina as fichas não arquivadas pela mesma consulta de `/insumos` (a da 050). Os
  `novos` saem das linhas **pareadas e completas**, com `custoUnidadeBaseCorrigido` pela
  `calcularCustoInsumo` que a linha já chama, com a perda do material pareado (a nota não traz
  perda, `#d51`).
- Bloco novo entre as linhas e "Esta compra no caixa": **"O que esta compra muda nos seus
  produtos"**, renderizando `EfeitoDoPreco` (o mesmo componente da 051, com as três linhas,
  "e mais N" e o produto que cruza o zero com sinal, cor, ícone e "fica no vermelho"). Sem
  linha pareada com preço mudado: o bloco não aparece. Linha nova não muda produto nenhum
  (nenhuma ficha a usa ainda).

### A linha que pulou

- Função pura nova em `domain/notaFiscal.ts`, com teste: `saltoDePreco(anterior, novo)` →
  `"subiu" | "caiu" | null`, comparando custo por unidade base; salto é **o dobro ou mais, ou
  a metade ou menos** (`FATOR_SALTO = 2`).
- Na linha pareada com salto, o rodapé da linha troca a frase da conta pela de atenção, com
  `TriangleAlert`: "O quilo sai a R$ 54,90; era R$ 10,98. Confira a quantidade e a unidade."
  **Não bloqueia**: preço dobra de verdade. O rodapé da nota (`RodapeNota`) conta,
  depois das incompletas: "1 linha com o preço muito diferente do anterior."

### O fim

- O "pronto" troca a frase de `fichasMarcadas` pelo mesmo `EfeitoDoPreco`, calculado antes de
  gravar e guardado com o resultado (depois de gravar, "antes" já é o preço novo), e a linha
  "Eles ficam marcados para rever o preço em Produtos." com o link "Ver em Produtos".
- A marcação `custoDesatualizado` continua como é: esta spec mostra, não recalcula.

---

## 2 · Antes de tocar em código

1. Ler `EfeitoDoPreco` e ver se as props aceitam a lista pronta sem o material do formulário.
2. Conferir se `/fichas` tem filtro por "custo desatualizado" endereçável por URL; se não, o
   link vai para `/fichas` sem filtro, e o filtro não entra nesta spec.

---

## 3 · Escopo

- `domain/custoFicha.ts`: `efeitoDosPrecosNovos`, com teste.
- `domain/notaFiscal.ts`: `saltoDePreco` e `FATOR_SALTO`, com teste.
- `TelaNota.tsx`, `CartaoLinhaNota.tsx`, `RodapeNota.tsx`, o formulário de material (a troca
  de chamada).

---

## 4 · Roteiro de navegador

1. Nota com manteiga mais cara: o bloco mostra o cookie com a sobra caindo; tirar a manteiga
   da lista some com a linha do bloco.
2. Corrigir a quantidade de "1 g" para "1 kg": o aviso de salto some.
3. Nota só com materiais novos: o bloco não aparece.
4. Cadastrar: o "pronto" mostra os mesmos produtos, com os mesmos números.

---

## Critérios de aceite

- [x] O efeito de todos os preços pela mesma função do formulário, com teste.
- [x] Aviso de salto por linha, sem bloquear, com teste.
- [x] O "pronto" diz quais produtos e quanto.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d291` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Refazer o custo das fichas ao cadastrar a nota.** A 082-A faz isso pela Configuração. Fazer
  aqui muda o que "custo desatualizado" significa para o formulário de material também; é
  decisão de quem conduz o projeto, não desta sessão.
- **Sugerir o preço de venda novo.** É do editor de produto.
