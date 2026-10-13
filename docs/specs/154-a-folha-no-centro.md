# Spec 154 · A folha no centro

**Tipo:** a tela do relatório reorganizada em torno do que ela veio fazer (conferir um número e
imprimir): no computador largo, a folha à esquerda e uma coluna de 320 px à direita com tudo o
que não é papel; no celular, as linhas que têm valor em tipo legível no lugar da miniatura da
folha. O limite do ano desce de hero para apoio. **Nenhum campo, nenhuma regra, nenhum índice,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica visual dos prints de 2026-10-12 (celular e desktop).
**Depende de:** 150 e 151 (a coluna mostra o resumo das escolhas e o estado do mês). Pode ir antes
delas, com a coluna mostrando as escolhas de hoje.
**Aprovações pedidas:** o texto.
**Decisões a registrar:** `#d363`.

---

## Problema (o que os prints mostram)

1. **A folha, que é o produto, começa abaixo da dobra.** No desktop ela aparece a 780 px do topo;
   antes dela vêm o limite do ano e as escolhas. No celular, depois de uma tela e meia.
2. **No celular a folha é uma miniatura ilegível.** Com `zoom` ~0,45 o corpo vira ~5 pt: 800 px
   de rolagem para ver um desenho de formulário. Os sete zeros têm o mesmo peso dos dois valores
   dela.
3. **Três eixos no desktop.** Título à esquerda, mês centrado com as setas a 1.000 px uma da
   outra, folha centrada numa coluna de 1.024 px. O olho não sabe onde é a página.
4. **O limite em 1.024 px.** "R$ 2.201,50" à esquerda e "3%" isolado na borda direita; a barra
   em 3% é um ponto escuro numa trilha enorme, que lê como "vazio" e não como "longe do limite".
   Sem marca de onde começa o "perto" (80%).
5. **O limite abre a tela.** É informação do ano (e da 153), não do papel do mês: compete com o
   número que ela veio conferir.
6. **Mês sem venda** mostra uma folha toda zerada sem dizer nada.

---

## O que esta spec decide: `#d363`

### Computador, `2xl`

- A rota sai do grupo `(coluna)`, como os editores (`#d274`, `#d339`): a folha a 100% (794 px)
  à esquerda; à direita a coluna de 320 px presa sob o cabeçalho, com, nesta ordem:
  1. o estado do mês (151) e o número do mês em display ("R$ 2.201,50 · linha IV"), com a origem
     ("somado de 31 vendas · Ver no Caixa");
  2. as escolhas (150: resumo com "Mudar"; antes da 150, os controles de hoje);
  3. **"Imprimir ou salvar em PDF"** (âmbar, largura da coluna) e "Já imprimi e guardei" (151);
  4. as notas de compra (152), uma linha;
  5. o limite do ano, compacto (o mesmo do pé do Caixa) e "Ver o ano" (153).
- Abaixo de `2xl`: a mesma ordem empilhada na coluna de leitura, e a folha **depois do botão**,
  nunca depois do limite.
- O seletor de mês fica alinhado ao título, com largura de `max-w-md`, só nesta tela (`SeletorMes`
  ganha `className`; o Caixa não muda).

### Celular (< 768 px)

- No lugar da folha, **as linhas que têm valor**: lista com divisórias, uma por linha não zerada
  mais a X, número romano em `--ink-muted`, rótulo do portal encurtado e o valor tabular à
  direita:
  ```
  IV  Venda sem nota fiscal                  R$ 2.201,50
  VI  Total da indústria                     R$ 2.201,50
  X   Total do mês                           R$ 2.201,50
  As outras sete linhas saem zeradas na folha.
  ```
- "Ver a folha inteira", terciário, abre a prévia de hoje (com `zoom`) na folha inferior; fechar
  volta. A impressão continua imprimindo a folha inteira, sempre.
- O botão primário em largura cheia, 52 px.

### O limite do ano

- Uma linha só: "R$ 2.201,50 de R$ 81.000,00 · 3%", o percentual junto do valor, e a barra com
  largura máxima de `max-w-md` em qualquer tela.
- Um traço de 1 px em `--border-strong` a 80% da trilha, com `aria-hidden`, e o
  `aria-valuetext` passa a dizer "3% do limite do MEI; o aviso começa em 80%".
- Abaixo de 1% a barra mostra o mínimo de 4 px, como hoje; o texto diz o resto.

### Mês sem venda

- O resumo vira "Sem venda em setembro." e a linha "O relatório sai zerado, e ainda vale imprimir
  e guardar." **Conferir no portal no dia** se o relatório zerado é exigido; se não for, a frase
  diz isso e o botão continua lá.

---

## Roteiro de navegador

1. Desktop 1920: folha à esquerda a 100%, coluna à direita, o botão visível sem rolar.
2. Desktop 1280: empilhado, folha logo depois do botão.
3. iPhone: as duas linhas legíveis sem zoom; "Ver a folha inteira" abre e fecha.
4. **Imprimir pelo app instalado no iPhone** (modo standalone) e pelo Safari: se o standalone não
   abrir a impressão, pare e diga; a saída (gerar PDF no aparelho) é dependência e pede aprovação.
5. Mês sem venda: a frase, a folha zerada na impressão.
6. Tema escuro: a folha continua tinta sobre branco; a coluna nos tokens do escuro.
7. Teclado: ordem de foco segue a ordem da coluna, não a da grade.

## Critérios de aceite

- [ ] Folha antes do limite em toda largura; ao lado da coluna em `2xl`.
- [ ] Celular sem miniatura por padrão; impressão inalterada.
- [ ] Limite em uma linha, barra limitada, traço dos 80%.
- [ ] Um âmbar na tela.
- [ ] Portão; `#d363`; `ESTADO.md`; `DESIGN.md` (a tela entra na lista das que saem da coluna);
      uma linha em `novidades.ts`.

## Fora de escopo

- **Marcar na folha a linha que recebeu o dinheiro.** A folha é dela (`#d127`); o celular já
  mostra só as linhas com valor.
- **PDF gerado no aparelho**, compartilhar o arquivo pelo WhatsApp. Dependência de produção; só se
  o roteiro 4 falhar.
- **Mudar o `SeletorMes` do Caixa.**
