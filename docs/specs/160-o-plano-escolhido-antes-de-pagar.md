# Spec 160 · O plano escolhido antes de pagar

**Tipo:** em `/assinatura` (teste e teste vencido), os dois cartões-botão viram duas opções de
escolher, o anual mostra quanto dá por mês, o que cada plano tem vira lista, e um botão âmbar
só diz o que ela vai pagar, com as garantias logo abaixo. **Nenhum campo, nenhuma rota, nenhuma
regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/assinatura` com `/impeccable` (2026-10-14), comparando com páginas de
plano de serviços que vivem de assinatura.
**Depende de:** 028, 032 e 039 (os textos dos pacotes). Pode ir antes ou depois da 159.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão. Revê o desenho da spec 032, 3.5 (duas
perguntas, cartão que é botão), não o que ela decidiu sobre o Essencial ser o primeiro.

---

## Problema

1. **Escolher e pagar são o mesmo toque.** O cartão inteiro é o botão: tocar no Completo para
   ler melhor já leva ao Stripe. Em toda página de plano que converte, escolher é de graça e
   pagar é um botão só, que repete a escolha ("Assinar o Essencial · R$ … por ano").
2. **O anual aparece como o número maior da tela.** "R$ 290,00 por ano" ao lado de um rádio
   que diz "Por mês" assusta quem pensa no mês. Todo serviço que vende anual mostra o anual por
   mês ("R$ 24,17 por mês, cobrado uma vez por ano") e o total embaixo.
3. **O que cada plano tem é uma frase de 25 palavras.** Não dá para comparar dois parágrafos
   numa tela de 360px. O Completo repete "Tudo do Essencial" e enterra o que ele acrescenta.
4. **Nada perto do botão responde o medo de assinar.** Cancelar quando quiser, o que acontece
   com os dados, com que se paga: as três perguntas que toda página de preço responde em uma
   linha cada, ao lado do botão, e que aqui não aparecem em lugar nenhum.
5. **No desktop os dois cartões dividem 384px.** O conteúdo que a tela existe para mostrar
   ganha 180px por plano, enquanto o painel de marca ocupa 42% da largura.
6. **O "Pagar: Por ano / Por mês" fica acima dos planos e solto**, com dois rádios nativos de
   20px. É a pergunta de menor peso posta primeiro.

---

## 1 · O que esta spec decide

### Duas opções, um botão

- **Os planos viram um `radiogroup` de duas linhas empilhadas**, em qualquer largura (a
  coluna da moldura continua `max-w-sm`; empilhado cabe e compara melhor que lado a lado).
  Cada linha: nome do pacote, o preço do período escolhido em `num` 600, a linha de economia
  quando houver, e a lista do que tem. Escolhida: fundo `--brand-100`, borda `--brand-as-ink`,
  ícone `CircleCheck` (a escolha não depende só da cor). Não escolhida: `--surface`, borda
  `--line-strong`. Nenhuma é âmbar.
- **Começa escolhido o Essencial anual**, como hoje (032, 3.5: o Essencial é o produto que se
  vende; o anual é a arma contra o churn). Os valores em reais desta spec são exemplo; os de
  verdade vêm de `/api/assinatura/precos`.
- **O período vira um seletor de dois segmentos acima da lista** (pílula de filtro do
  `DESIGN.md`, 44px): "Por ano" · "Por mês". No "Por ano", o segmento leva a economia do
  Essencial em texto: "Por ano · R$ 58 a menos".
- **Um botão âmbar, o único da tela**, diz a escolha inteira: "Assinar o Essencial · R$ 290,00
  por ano". No celular ele fica preso ao pé (52px, a folha de pé do `DESIGN.md`), com a lista
  rolando por cima; no desktop, logo abaixo das opções.

### O anual pelo mês

- **`mensalDoAnual(anual)`** em `domain/assinatura.ts`, `Math.round(anual / 12)`, com teste.
  `mensalDoPlano` já faz a mesma conta para um `ResumoAssinatura`: reaproveitar, não duplicar.
- No "Por ano", a linha de cada plano mostra "R$ 24,17 por mês" em `num` 600 e, embaixo, em
  `label` `--ink-muted`, "R$ 290,00 cobrados uma vez por ano · R$ 58,00 a menos que mês a mês".
  O botão continua dizendo o total: quem paga precisa ver o número que vai sair do cartão.

### O que cada plano tem, em lista

- **`O_QUE_O_PACOTE_TEM` vira `string[]`**, uma linha por coisa, na voz de hoje:
  - Essencial: "O preço de cada doce, e o aviso quando um custo sobe" · "Os pedidos, com a
    lista do mercado" · "O caixa do mês e a sua meta".
  - Completo: "Tudo do Essencial" · "O cardápio com link: a cliente escolhe e o pedido chega
    anotado" · "Até N ajudantes, que produzem e entregam sem ver o seu caixa".
- Cada linha com `Check` 16px em `--ink-subtle`. `/conheca` lê a mesma constante: ajustar o
  cartão de lá para a lista (só o `join` muda, se o desenho de lá pedir frase).

### As garantias, embaixo do botão

Três linhas em `label` `--ink-muted`, cada uma com ícone, nesta ordem:

- `CalendarX` "Cancela quando quiser, aqui no app. O que já foi pago vale até o fim."
- `Archive` "Seus preços, pedidos e caixa ficam seus, assinando ou não." (verdade pelo `#d144`)
- `CreditCard` "Pagamento no cartão, pelo Stripe." (o texto muda se a forma de pagamento mudar)

### O estado vencido

O mesmo bloco de escolha; abaixo do pé fixo ficam `MeusDados` e "Sair", como hoje. O título
continua "Seu teste grátis acabou".

---

## 2 · Antes de tocar em código

1. Ler a 032, 3.5: o que se mantém (Essencial primeiro e pré-escolhido,
   anual pré-escolhido) e o que esta spec troca (o cartão-botão).
2. Conferir onde `O_QUE_O_PACOTE_TEM` é lido (`/conheca`) antes de mudar o tipo.
3. Conferir que o texto das garantias é verdade no portal configurado pela 110
   (`subscription_cancel.mode=at_period_end`). Se não for, o texto segue o portal, nunca o
   contrário.

---

## 3 · Escopo

- `src/app/(auth)/assinatura/page.tsx`: o `radiogroup`, o seletor de período, o botão com a
  escolha, as garantias. `CartaoDePreco` sai.
- `src/lib/domain/assinatura.ts`: `O_QUE_O_PACOTE_TEM` em lista, `mensalDoAnual` (ou o
  `mensalDoPlano` generalizado), a frase do botão, com teste.
- `src/app/conheca/page.tsx`: só o necessário para ler a lista.

---

## 4 · Roteiro de navegador

1. Teste, celular 360px: Essencial anual escolhido; o botão diz "Assinar o Essencial · R$ …
   por ano" e fica no pé; tocar no Completo não sai do app, só troca a escolha e o botão.
2. "Por mês": os preços e o botão trocam; a linha da economia some.
3. Desktop: as duas opções empilhadas na coluna, botão logo abaixo, garantias embaixo.
4. Teclado: setas trocam a opção dentro do grupo, `Tab` vai ao botão; leitor de tela anuncia
   "Essencial, escolhido".
5. Sem os preços (rota falhando): as opções aparecem com "—", o botão diz só "Assinar o
   Essencial", a frase "Não deu para carregar os preços agora, mas dá para continuar." fica.
6. Teste vencido: o mesmo, com "Baixar meus dados" e "Sair" depois das garantias.

---

## Critérios de aceite

- [ ] Nenhum toque fora do botão âmbar sai do app.
- [ ] O anual aparece por mês, com o total do ano escrito.
- [ ] O que cada plano tem é lista, igual em `/assinatura` e `/conheca`.
- [ ] As três garantias, verdadeiras, embaixo do botão.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] Decisão escrita; `ESTADO.md`; linha em `novidades.ts` ("A tela de assinar mostra o
      plano por mês e só sai do app no botão").

---

## 5 · Fora de escopo

- **O que o teste rendeu, o plano sugerido pelo uso e a cobrança só no fim do teste.** É a 161.
- **Tabela de comparação com linhas de "não tem".** A 039 decidiu dizer o que o plano dá,
  nunca o que falta.
- **Pix, boleto e parcelamento.** Pedem conferir o que o Stripe faz com assinatura no Brasil;
  spec própria quando houver assinante pedindo.
- **Selo "mais escolhido".** Não é verdade com as contas que existem hoje.
