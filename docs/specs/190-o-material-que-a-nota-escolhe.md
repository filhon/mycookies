# Spec 190 · O material que a nota escolhe

**Tipo:** o pareamento da nota deixa de ser adivinhação invisível. Cada linha diz se o material foi
reconhecido ou é palpite, ela troca o alvo num toque (outro material, material novo), e o app lembra
a descrição impressa para a próxima nota acertar sozinha.
**Tamanho:** uma sessão.
**Origem:** a revisão do fluxo da nota pedida em 2026-10-16. Depois da unidade (188), o pareamento
errado é o outro jeito de uma nota gravar preço no material errado.
**Depende de:** 188 (a embalagem herdada se refaz quando o alvo muda).
**Aprovações pedidas:** nenhuma. `Insumo` ganha um campo **opcional**.
**Decisões a registrar:** uma, numerada na sessão: a descrição impressa vira apelido do material, e
vence o nome no pareamento.

---

## Problema

- **Prefixo casa demais.** Sem "Açúcar de confeiteiro" cadastrado, a linha "Açúcar de confeiteiro"
  casa por prefixo com "Açúcar" (`melhorPrefixo`) e atualiza o açúcar refinado.
- **O selo não distingue.** Exato e palpite saem do mesmo jeito: "Atualiza · Açúcar".
- **Desfazer é editar o nome.** O único jeito de trocar o alvo é mudar o nome da linha até o
  pareamento sair (`#d51`; esta spec revê essa parte dele). Não há "é outro material" nem "é material novo".
- **Toda nota começa do zero.** `ACUCAR REF UNIAO 1KG` é lida, traduzida e pareada de novo a cada
  mês, e o modelo pode traduzir diferente.

---

## 1 · O que esta spec decide

### O apelido

- `Insumo.descricoesDaNota?: string[]`: as descrições impressas que já foram gravadas neste
  material, em `chaveDeBusca`, sem repetir, **até dez** (a mais velha sai).
- `importarNota` acrescenta a descrição da linha ao material que ela atualizou ou criou, no mesmo
  lote.

### O pareamento, em três degraus

`parearComInsumos` passa a devolver `como: "DESCRICAO" | "NOME" | "PALPITE"`:

1. A descrição impressa está em `descricoesDaNota` de um material: **DESCRICAO**.
2. `nomeBusca` exato: **NOME**.
3. Prefixo (`melhorPrefixo`, como hoje): **PALPITE**.

Teste para os três, e para o caso do açúcar de confeiteiro.

### Na linha

- **DESCRICAO** e **NOME**: o selo de hoje, "Atualiza · Açúcar · era R$ 3,59".
- **PALPITE**: selo de atenção com ícone, "Parece ser Açúcar. Confira.", e a linha conta como "para
  conferir" até ela confirmar ou trocar. Não bloqueia: confirmar é um toque.
- No painel aberto, o campo **"Atualiza qual material"**: um seletor com busca (o mesmo
  `SeletorInsumo` do editor de produto, se servir; senão a busca de Materiais), com "Material novo"
  em primeiro. Escolher fixa o alvo: o nome da linha deixa de mudar o pareamento dela.
- Trocar o alvo refaz a embalagem herdada (188), o salto e o "era".

### Duas linhas no mesmo material

Duas linhas pareadas com o mesmo material (dois pacotes de manteiga em linhas separadas, de preços
diferentes) hoje gravam duas atualizações no mesmo lote, e a última vence. Passa a ser "para
conferir" com "Duas linhas atualizam Manteiga. Vale a última." Não bloqueia.

---

## 2 · Antes de tocar em código

1. Ler `parearComInsumos`, `melhorPrefixo`, `TelaNota` (`pares`, `receber`, `cadastrar`),
   `LinhaNota`, `importarNota`, e o seletor de material do editor de produto (`FormularioFicha`,
   perto da linha 660).
2. Ler a parte do pareamento da spec 006 e `#d51`.

---

## 3 · Escopo

- `types/insumos.ts`: o campo.
- `domain/notaFiscal.ts`: os três degraus, `como`, a linha duplicada; teste.
- `mutations/notas.ts`: o apelido no lote.
- `TelaNota`, `LinhaNota`, `RodapeNota`: o selo de palpite, o seletor de alvo, o alvo fixo.

---

## 4 · Roteiro

1. Nota com `ACUCAR CONFEITEIRO`, só "Açúcar" cadastrado: "Parece ser Açúcar. Confira." Trocar para
   "Material novo": a linha vira "Novo".
2. Gravar. Ler a mesma nota de novo: a linha sai **DESCRICAO** no material novo, sem palpite.
3. Linha "Farinha" que o modelo traduziu como "Farinha de trigo especial": escolher "Farinha de
   trigo" no seletor; mudar o nome da linha não troca o alvo.
4. Duas linhas de manteiga: a frase das duas linhas.

---

## Critérios de aceite

- [x] Ela vê quando o material foi adivinhado, e troca o alvo sem editar o nome.
- [x] A segunda nota da mesma loja pareia pela descrição impressa.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisão registrada; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **O apelido no documento do material**, e não numa coleção à parte: a tela da nota já lê todos os
  materiais, e um índice separado seria mais uma leitura e mais uma coisa para manter em dia.
- **Palpite não bloqueia.** Prefixo acerta na maioria das vezes; bloquear faria toda nota de mercado
  terminar em confirmações.
- **Dez apelidos.** Um material raramente vem de mais de três lojas; dez cobre marcas e tamanhos
  sem o documento crescer.

---

## Fora de escopo

- Linha que vai para o caixa sem virar material (gás, produto de limpeza). Hoje é tirar a linha; se
  aparecer no uso, spec própria.
- Juntar dois materiais duplicados num só.
- Pareamento por similaridade (distância de edição).
