# Spec 131 · O pote no polegar

**Tipo:** no celular, a linha do pote ganha "−" e "+" ao lado do campo e o nome deixa de ser
cortado; a contagem em andamento fica guardada no aparelho até ser salva; o Enter anda para a
linha seguinte. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica sobre os prints da contagem do pronto de 2026-10-12, itens 3 e 4.
**Depende de:** 130 (o "Igual" é o ponto de partida do "−").
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d336`.

---

## Problema

Contar o pote é contar poucas unidades: 7, 2, 1, 9, 16. Na bandeja, ela conta com o dedo, e o
teclado decimal cobre metade da tela para digitar um algarismo. Sortly, Square e o estoque do
Shopify no celular contam unidade com "−" e "+"; é o controle certo para número pequeno e mão
ocupada.

No print de 360 px, "Cookie Cacau com Nutella 12…" está cortado. Os nomes da MyCookie's só
diferem no fim (o sabor e a gramatura: "Mini Cookie Red Velvet 40g" contra "Cookie Red Velvet
120g"); cortar o fim é cortar o que distingue.

A despensa ganhou rascunho e Enter na 127 (`#d332`); esta tela não. Os números moram num
`useState`: o PWA morto em segundo plano leva a contagem junto. O Enter (`enterKeyHint="next"`)
não tem quem o atenda.

---

## 1 · O que esta spec decide: `#d336`

### "−" e "+" no celular

- Abaixo de `lg`, e só para `un` e `porcao`: botões de 44 × 44 px dos dois lados do campo, ícones
  `Minus` e `Plus` 20 px, borda `--border-strong`, tinta `--ink`. `aria-label`: "Um a menos de
  Cookie Oreo 120g" / "Um a mais de …".
- **"+" no campo vazio escreve 1.** É um ato dela, e o campo continua nascendo vazio (`#d59`).
- **"−" no campo vazio fica desabilitado**; em 0, também. Nunca negativo.
- Número fracionado (0,5 porção) sobe e desce de 1 em 1, sem arredondar.
- O campo continua digitável: 16 ela digita; 7 ela conta no "+", ou toca "Igual" e ajusta no "−".
- O sufixo "un" sai do campo quando os botões aparecem: o "−" e o "+" já dizem que é contagem
  de unidade, e o `aria-label` do campo diz "unidades". "porções" fica.
- No desktop, sem botões: lá o teclado é melhor.

### O nome inteiro

- O nome passa de `truncate` para `line-clamp-2`. A linha cresce no produto de nome longo, e só
  nele.
- Em 360 px, com os botões, a coluna do nome fica com ≈ 120 px. Se dois produtos reais ficarem em
  três linhas, os botões descem para a linha da frase, à direita, só nesses produtos.

### O rascunho no aparelho

- O mesmo `#d332`: `rascunhoDaContagem.ts` ganha a chave como parâmetro (ou um prefixo), e o
  pronto grava em `rende:contagem-pronto:{contaId}`. Mesmo dia, mesma faixa ("Continuando a
  contagem das 14h10: 4 produtos já contados." e "Começar de novo"), mesmo descarte em silêncio do
  rascunho de outro dia.
- Com semente da fornada, o rascunho não é aplicado nem apagado.
- Salvar apaga o rascunho.

### O Enter anda

- O input ganha `data-contagem` e o `onKeyDown` de `LinhaContagem` (`andarParaOProximo`, que passa
  a ser exportada, ou desce para um módulo de `components/estoque/`).
- O rodapé já é o mesmo (`RodapeContagem`), e com ele o `scroll-padding` da 127: nada a fazer.

---

## 2 · Antes de tocar em código

1. Ler `#d332` e `rascunhoDaContagem.ts`: o pronto não tem unidade por linha, então o rascunho
   dele guarda só `digitados`.
2. Ler o `Campo`/`BASE_CONTROLE` para que os botões tenham a altura do campo (48 px).
3. Em 360 px, com os produtos reais: contar quantos nomes vão a três linhas com os botões.

---

## 3 · Escopo

- `TelaContagemPronto.tsx`: os botões, o nome, o rascunho, o Enter.
- `rascunhoDaContagem.ts`: a chave como parâmetro; o teste de `lerRascunhoDaContagem` continua.
- `LinhaContagem.tsx`: só a exportação de `andarParaOProximo`.
- Domínio: `passoDaContagem(texto, sinal)` em `domain/estoque.ts` (vazio + 1 = 1, 0 − 1 = 0,
  0,5 + 1 = 1,5, ilegível não muda), com teste.
- `DECISOES.md`: `#d336`.
- `novidades.ts`: "Conte o que está pronto no − e no +, e a contagem pela metade fica guardada".

---

## 4 · Roteiro de navegador

Em 360 px, nos dois temas, e 1280 px para conferir que nada mudou:

1. "+" três vezes num campo vazio: 3; o rodapé conta 1.
2. "Igual" em 7, "−": 6.
3. "−" desabilitado no vazio e no zero.
4. "Mini Cookie Red Velvet 40g" inteiro em duas linhas.
5. Contar três, recarregar: voltam, com a faixa; "Começar de novo" limpa.
6. Vinda de "Fiz a massa" com rascunho guardado: a semente vale; sair e voltar pelo Produtos: o
   rascunho volta.
7. Android: Enter anda linha a linha.
8. Leitor de tela: "Um a mais de Cookie Oreo 120g", e o campo lido com o número novo.

---

## Critérios de aceite

- [ ] "−" e "+" abaixo de `lg`, em `un` e `porcao`, com as regras do vazio e do zero.
- [ ] Nome em até duas linhas.
- [ ] Rascunho do dia com faixa e "Começar de novo", em chave própria.
- [ ] Enter anda para o próximo campo.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d336` escrito; `ESTADO.md` e `novidades.ts`
      atualizados.

---

## Decisões fáceis de rejeitar

- **"+" no vazio escreve 1, e não o esperado + 1.** O esperado é palpite (130); o "+" que parte
  dele faria a contagem confirmar o palpite sem olhar o pote.
- **Só no celular.** No desktop ela está sentada e digita mais rápido do que clica.
- **Sem vibração no toque.** O iPhone não tem `navigator.vibrate` no PWA, e o Android sozinho
  faria duas experiências.

---

## Fora de escopo

- **"−" e "+" na despensa**: lá se conta em gramas e embalagens (125).
- **Pressionar e segurar para correr o número.** Volta se ela contar mais de 30 de um produto.
