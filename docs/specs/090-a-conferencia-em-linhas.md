# Spec 090 · A conferência em linhas

**Tipo:** a etapa "conferindo" deixa de ser um cartão de seis campos por item e vira uma lista
com divisórias: cada item numa linha que se lê de relance, aberta para edição só quando ela
toca. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Ler uma nota" (2026-10-05).
**Depende de:** a 089 (o aviso de salto entra na linha fechada).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d292`.

---

## Problema

O trabalho da conferência é **confirmar**; corrigir é a exceção. A tela é desenhada para a
exceção.

1. **Vinte notas de cartão.** Cada linha lida é um cartão com o impresso, seis campos (nome,
   marca, preço, quantidade, unidade, categoria), o selo e a conta: ~380px no celular. Uma
   compra de vinte linhas são ~7.600px de rolagem e 120 campos abertos, para ela conferir que
   quinze estão certos. `DESIGN.md` diz que lista de material é lista com divisórias e não
   grade de cartões; o comentário de `CartaoLinhaNota` justifica o cartão contra a planilha,
   mas a resposta do sistema à planilha já existe e é outra.
2. **O que está errado não salta.** A linha incompleta e a linha com salto (089) têm a mesma
   altura e o mesmo peso das certas; ela acha o problema rolando.
3. **No computador**, com 1024px, os seis campos de cada cartão se espalham em quatro colunas e
   o número que importa (o preço por quilo) fica no rodapé de cada cartão.

---

## 1 · O que esta spec decide: `#d292`

### A linha fechada

- As linhas viram **uma lista com divisórias** (`--surface`, raio 14px, divisória `--border`),
  na ordem do papel: ela confere com a nota na mão.
- Cada linha fechada, alvo inteiro, 56px mínimo:
  - em cima, o impresso em micro `--ink-subtle` (como hoje);
  - à esquerda, o nome em `body` 600 e, embaixo, em `label` `--ink-muted`:
    "Dona Benta · 1 kg · Atualiza" ou "· Novo";
  - à direita, tabular, o preço pago em `--ink` e, embaixo, "R$ 5,49 o kg";
  - incompleta ou com salto: no lugar do detalhe, a frase de atenção de hoje, com o ícone.
- O "×" de tirar fica na linha fechada (44px), à direita do preço.

### A linha aberta

- Tocar a linha abre ali mesmo os seis campos de hoje, a frase da conta e "Pronto" (terciário)
  para fechar. **Uma aberta por vez**: abrir outra fecha a anterior. O foco vai para o
  primeiro campo; `Esc` fecha e devolve o foco à linha.
- A tela abre com a **primeira linha com problema** (incompleta, ou com salto) já aberta e
  rolada à vista. Sem problema, todas fechadas.
- Acima da lista, uma linha de contagem: "18 linhas · 2 para conferir", com "para conferir"
  só acima de zero.

### No computador

- A partir de `xl`, a linha fechada vira grade de colunas, como a tabela de Materiais
  (`#d225`): Impresso · Material · Quantidade · Preço pago · Preço por unidade · O que acontece.
  Cabeçalho em micro 600 caixa alta `--ink-muted`, `aria-hidden`, rótulo de cada célula em
  `sr-only`. A linha aberta ocupa a largura inteira, com os campos em quatro colunas como hoje.

---

## 2 · Antes de tocar em código

1. Ver como a tabela de Materiais monta a grade da mesma `<li>` (`#d225`) e copiar o padrão,
   não reinventá-lo.
2. Conferir que `aria-expanded` na linha e `aria-controls` no painel bastam no leitor de tela.

---

## 3 · Escopo

- `CartaoLinhaNota.tsx` vira `LinhaNota.tsx` (fechada e aberta), com o comentário do topo
  reescrito.
- `TelaNota.tsx`: a lista, qual está aberta, a contagem.

---

## 4 · Roteiro de navegador

1. Nota de 15 linhas, todas certas: cabe em duas telas de celular; nenhuma aberta.
2. Nota com uma linha sem preço: ela abre sozinha, à vista; preencher e "Pronto" fecha.
3. Tirar uma linha pelo "×" sem abri-la; trazê-la de volta.
4. Teclado no computador: Tab até a linha, Enter abre, Esc fecha.
5. `xl`: as colunas alinham; com a linha aberta, nada pula de lugar acima dela.

---

## Critérios de aceite

- [x] Lista com divisórias na ordem do papel, uma linha aberta por vez.
- [x] A primeira com problema abre sozinha; a contagem diz quantas faltam conferir.
- [x] Grade de colunas a partir de `xl`.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d292` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Trocar o pareamento por escolha** ("não é esta farinha, é aquela"). Hoje corrigir o nome
  desfaz o pareamento; uma escolha explícita é a próxima pergunta, se ela fizer.
- **Aprender com a correção.** Fora desde a 006.
