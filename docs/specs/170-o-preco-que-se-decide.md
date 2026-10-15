# Spec 170 · O preço que se decide

**Tipo:** a seção de preço da `/conheca` passa a ajudar a escolher e a tirar o risco da escolha.
Cada plano diz para quem é; abaixo dos dois, o que os dois têm (o que a página nunca disse); o
anual vira "dois meses de graça"; o direito de arrependimento sai dos termos e vem para perto do
botão; uma dúvida nova responde "e se eu desistir?"; no desktop, a página termina com um convite
e não com a última dúvida.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica da `/conheca` de 2026-10-14 (a mesma da 167). Os dois cartões têm três
linhas cada, genéricas ("O preço de cada doce", "Os pedidos", "O caixa"), e o app tem 166 specs:
offline, a nota do mercado, a bancada, o orçamento com Pix, o MEI, as clientes, a despensa. A
visitante compara R$ 29 com três linhas. As páginas de preço que convertem (Notion, Calendly,
Nuvemshop, Conta Azul) dizem para quem é cada plano, listam o que vem, dizem o desconto do anual
em meses e põem a garantia ao lado do botão. O Rende já dá a garantia (`/termos`, seção 5, o art.
49 do CDC) e não fala dela.
**Depende de:** 039, 160, 165.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **Os planos não dizem para quem são.** A escolha entre Essencial e Completo é "quero cardápio
   e ajudante?", mas a página faz a visitante deduzir isso de duas listas.
2. **O que vem nos dois não aparece.** A linha "O preço de cada doce, e o aviso quando um custo
   sobe" resume vinte telas. A amplitude do app é o argumento contra "minha planilha faz isso".
3. **"R$ 58,00 a menos" é conta que ela precisa fazer.** Dois meses de graça ela entende sem fazer.
4. **O risco não é tirado.** "Sem cartão" está lá; "se assinar e desistir em 7 dias, devolvemos
   tudo" está escondido nos termos. "Cancela quando quiser" só aparece na barra do celular.
5. **A página do desktop acaba nas dúvidas.** Quem leu até o fim não tem botão à vista; o último
   está no preço, uma tela e meia acima.

---

## 1 · O que esta spec decide

### Para quem é

Embaixo do nome de cada plano, em `body` `--ink-muted`, uma linha:

- Essencial: "Pra quem vende na porta, na feira ou por encomenda e quer o preço, os pedidos e o
  caixa no lugar."
- Completo: "Pra quem recebe pedido por mensagem todo dia, ou tem quem ajude na cozinha."

`PRA_QUEM_E` em `domain/assinatura.ts`, ao lado de `O_QUE_O_PACOTE_TEM`, para `/assinatura` poder
usar depois. Nenhum "mais escolhido": não há dado que o sustente.

### Os dois têm

Depois dos cartões e antes do botão, `h3` em `heading` "Os dois têm" e uma lista em duas colunas
no desktop, uma no celular, com `Check` em `--ink-subtle` como os cartões. Sem cartão em volta.

- Funciona sem internet, na bancada e no mercado
- Lê a nota do mercado e atualiza o preço dos materiais
- A receita aberta na bancada, passo a passo
- O orçamento em folha, com Pix, que a cliente aprova pelo link
- A lista do mercado com o que falta na despensa
- Suas clientes, e quem está te devendo
- O relatório do MEI, pronto pra declarar
- Seus dados num arquivo, quando você quiser

Conferir cada linha contra o app na sessão (as specs 088, 141, 147–149, 098, 105, 150, e a
exportação). A que não for verdade sai.

### O anual em meses

- `mesesDeGraca(mensal, anual)` em `domain/assinatura.ts`:
  `Math.floor(economiaAnual(mensal, anual) / mensal)`, zero quando o mensal é zero. Teste: 29/290
  → 2; 49/490 → 2; anual sem economia → 0; mensal zero → 0.
- A linha do cartão: "ou R$ 290,00 no ano: **dois meses de graça**." Por extenso até dez
  ("um mês de graça", "dois meses de graça"). Com zero, a linha volta ao "R$ X a menos" de
  hoje, e com economia zero, some, como já some.

### O risco

O parágrafo abaixo do botão do desktop, hoje "Você só informa pagamento se decidir continuar.",
vira duas linhas em `label` `--ink-muted`:

- "Sem cartão no teste. Depois, cancela quando quiser."
- "Assinou e desistiu em até 7 dias? Devolvemos tudo." com "Devolvemos tudo" ligando a
  `/termos#secao-5` (a âncora da 165).

O texto de abertura da seção ("14 dias grátis, sem cartão…") fica.

### A dúvida nova

Terceira da lista, depois de "Por que pagar todo mês":

- "E se eu desistir?"
- "No teste, é só não assinar: nada é cobrado, e seus dados ficam pra ver. Assinou e desistiu em
  até 7 dias, devolvemos tudo. Depois disso, cancela em dois toques, usa até o fim do mês pago, e
  seus preços, pedidos e caixa ficam guardados pra ler e baixar."

Conferir contra `fraseDoQueFica`, a 162 e os termos na sessão.

### O fim do desktop

Depois das dúvidas, só em `lg` (no celular a barra do pé já é esse convite), sobre o `--canvas`,
sem faixa de cor:

- `h2` no estilo dos outros: "O preço do seu próximo doce, com a conta feita."
- O botão primário "Começar o teste de 14 dias" e as duas linhas do risco.

É o único primário à vista nessa altura: o do preço ficou mais de uma tela acima.

---

## 2 · Escopo

- `src/lib/domain/assinatura.ts`: `PRA_QUEM_E`, `mesesDeGraca` + teste.
- `src/app/conheca/page.tsx`: `Preco`, `DUVIDAS`, o fim do desktop.

## Fora de escopo

- Botão por plano, alternador mensal/anual, preço anual dividido por mês: o teste é o mesmo para
  os dois planos, e a escolha acontece em `/assinatura` (160). Um botão por cartão seria duas
  portas para o mesmo lugar.
- Tabela comparativa completa.
- "Mais escolhido", contagem regressiva, preço riscado de promoção.
- A lista "Os dois têm" em `/assinatura`.

---

## 3 · Roteiro de navegador

1. `/conheca` a 1280: os dois cartões com a linha "Pra quem"; "dois meses de graça" nos dois;
   "Os dois têm" em duas colunas; o botão com as duas linhas; "Devolvemos tudo" abre a seção 5
   dos termos.
2. Rolar até o fim: o convite depois das dúvidas.
3. A 390 × 844: a lista numa coluna; nenhum convite no fim além da barra do pé; nunca dois
   primários na mesma tela.
4. Sem Stripe: os cartões sem preço, a linha "Pra quem" e "Os dois têm" continuam.
5. A dúvida nova é a terceira.
