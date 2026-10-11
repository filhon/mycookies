# Spec 127 · A contagem que não se perde

**Tipo:** a contagem em andamento fica guardada no aparelho até ser salva, o campo com foco
nunca fica embaixo do rodapé, e o "próximo" do teclado anda para a linha seguinte. Nenhum schema,
nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica sobre os prints da contagem de 2026-10-11, item 4.
**Depende de:** nada. Se a 125 já entrou, o rascunho guarda também a unidade de cada linha.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d332`.

---

## Problema

Os números digitados moram num `useState`. A guarda de saída (`useGuardaDeSaida`) protege a
navegação dentro do app, mas não protege o que mais acontece na despensa: a tela apagar, o
WhatsApp tocar, o sistema do iPhone matar o PWA em segundo plano. Vinte e cinco linhas contadas
voltam a zero. MarketMan, WISK e Sortly guardam a contagem em andamento; ela continua de onde
parou.

Dois atritos de teclado, nos 35 campos:

- **O campo com foco pode ficar atrás do rodapé.** O rodapé é fixo e, com o teclado aberto,
  desce até ele (`apertado:bottom-0`). O navegador rola o campo para dentro da janela, mas não
  sabe do rodapé: as últimas linhas visíveis ficam cobertas. Não há `scroll-padding` nem
  `scroll-margin` no projeto. **Conferir no aparelho antes de mexer.**
- **`enterKeyHint="next"` não tem quem o atenda.** No Android e no desktop, o Enter não leva à
  linha seguinte; ela fecha o teclado, rola e toca de novo. (No iPhone o teclado decimal não tem
  Enter; as setas da barra do Safari já andam entre campos.)

---

## 1 · O que esta spec decide: `#d332`

### O rascunho no aparelho

- A cada mudança, `TelaContagem` grava em `localStorage`, chave `rende:contagem:{contaId}`:
  `{ v: 1, dia: DataISO, digitados, unidades?, salvoEm }`. Tudo em `try/catch`; sem armazenamento,
  sem rascunho (o padrão de `rascunhoDaPorta.ts`, `#d189`).
- **Na abertura, sem semente da compra**, um rascunho **do mesmo dia** volta aos campos, e a faixa
  de ferramentas diz: "Continuando a contagem das 14h10: 12 linhas já digitadas." com o botão
  terciário **"Começar de novo"**, que limpa campos e rascunho. Sem modal.
- **Rascunho de outro dia é descartado**, em silêncio. A data da contagem é o dia (`#d57`):
  restaurar os números de ontem e salvá-los hoje dataria hoje o que ela viu ontem.
- **Com semente** (vinda da nota ou da lista), o rascunho não é aplicado e não é apagado: a semente
  é outro começo, e ele continua lá se ela sair sem salvar.
- **Salvar apaga o rascunho.** Linha apagada até o vazio sai do rascunho.

### O campo com foco aparece inteiro

- Se o roteiro confirmar o problema: cada `<li>` da contagem ganha `scroll-margin-bottom` da altura
  do rodapé (≈ `scroll-mb-40`; com teclado, `apertado:scroll-mb-24`), e o foco rola com
  `scrollIntoView({ block: "nearest" })` no `onFocus`, que respeita a margem.
- Se não confirmar, esta parte sai da spec e o `ESTADO.md` diz por quê.

### O próximo anda

- `onKeyDown` Enter num campo da contagem: foco no próximo campo da tela (na ordem do DOM, só os
  visíveis), com o texto selecionado. No último, Enter não faz nada: salvar é o botão.

### O rodapé com teclado

- Com `apertado`, o rótulo "A despensa de hoje" também some (a dica já some, `#d75`), e o rodapé
  fica numa linha: "12 de 35" e o botão.

---

## 2 · Antes de tocar em código

1. Ler `rascunhoDaPorta.ts` e `#d189`.
2. Ler `useGuardaDeSaida`: ela continua; o rascunho não muda quando a guarda pergunta.
3. No aparelho, 360 × 640, com o teclado aberto: tocar na penúltima linha visível e ver se ela
   fica atrás do rodapé.

---

## 3 · Escopo

- `lib/utils/rascunhoDaContagem.ts` (ou o de `rascunhoDaPorta` generalizado, se ficar menor), com a
  leitura do rascunho no domínio se tiver regra que mereça teste (o descarte de outro dia).
- `TelaContagem.tsx`: gravar, restaurar, a faixa, apagar ao salvar.
- `LinhaContagem.tsx`: Enter e, se confirmado, a margem de rolagem.
- `RodapeContagem.tsx`: o rótulo em `apertado:hidden`. A irmã `/fichas/contagem` herda o rodapé, e
  está bem assim.
- `DECISOES.md`: `#d332`.
- `novidades.ts`: "A contagem pela metade fica guardada no celular até você salvar".

---

## 4 · Roteiro de navegador

1. Contar cinco linhas, recarregar a página: voltam as cinco, com a faixa e a hora.
2. "Começar de novo": campos vazios; recarregar: continuam vazios.
3. Mudar a data do aparelho para amanhã e abrir: nenhum rascunho, nenhuma faixa.
4. Vir da nota com rascunho guardado: a semente vale; sair sem salvar e abrir pelo `/compras`: o
   rascunho volta.
5. Salvar: abrir de novo, nada restaurado.
6. Android e desktop: Enter anda linha a linha, inclusive trocando de corredor.
7. Celular com teclado: o campo com foco nunca coberto pelo rodapé; o rodapé em uma linha.
8. Janela privada (sem armazenamento): a tela funciona como hoje.

---

## Critérios de aceite

- [x] Rascunho do dia restaurado, com faixa e "Começar de novo"; o de outro dia descartado.
- [x] Semente não é sobrescrita pelo rascunho, nem o apaga.
- [x] Salvar apaga o rascunho.
- [x] Enter anda para o próximo campo visível.
- [x] Campo com foco visível acima do rodapé (ou a parte retirada com o motivo no `ESTADO.md`).
- [x] `lint`, `typecheck`, `test` e `build` passam; `#d332` escrito; `ESTADO.md` e `novidades.ts`
      atualizados.

---

## Decisões fáceis de rejeitar

- **No aparelho, e não no Firestore.** Rascunho no Firestore seria schema novo e escrita a cada
  toque, para um dado que só faz sentido no celular em que ela está contando.
- **Só o mesmo dia.** Ela começa às 23h50 e termina 0h10: perde o rascunho. Restaurar ontem seria
  datar errado, e esse erro é exatamente o que a 007 existe para impedir.

---

## Fora de escopo

- **Contagem a duas mãos** (duas pessoas, dois aparelhos, a mesma contagem): uma usuária hoje
  (`#d01`).
- **Mudar a guarda de saída.**
