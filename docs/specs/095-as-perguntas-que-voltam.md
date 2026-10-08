# Spec 095 · As perguntas que voltam

**Tipo:** `/comecar` ganha "Perguntas que aparecem depois", com busca, e termina em "Fale com a
gente". **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Como funciona" sobre os prints de celular e desktop de 2026-10-08.
**Depende de:** 093 (índice e ordem). Funciona sem ela.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d297`.

---

## Problema

1. **A página é organizada por tela, e a dúvida chega como pergunta.** Na terceira semana ela
   não pensa "cadeia do dinheiro", pensa "por que o caixa está zerado se eu vendi?". Toda
   central de ajuda de produto pago tem as perguntas escritas como ela as faz, e uma busca.
   Esta página não tem nenhuma das duas.
2. **A ajuda não deixa pedir ajuda.** "Fale com a gente" existe desde a 084, mas só na
   Configuração. A página para onde ela vai quando não entende alguma coisa termina em
   "Instalar na tela de início", sem saída para uma pessoa.
3. **O sistema cresceu e a página não.** Sinal, Pix com o valor, relatório do MEI, refazer o
   custo pela Configuração, a folha do orçamento: nada disso é tela fora do menu (então não
   entra em "O que mais tem aqui") e nada disso cabe num estado vazio. São respostas sem lugar.

---

## 1 · O que esta spec decide: `#d297`

### O critério de uma pergunta

Entra só a pergunta que **atravessa telas** ou que **nenhuma tela responde sozinha**. A que um
estado vazio ou a linha de uma tela já responde, não entra (`#d70`). E **toda resposta é
conferida no código na sessão**: a que não puder ser conferida não entra.

### As perguntas

Em `components/comecar/perguntas.ts` (cópia, não domínio, `#d70`): `{ id, pergunta,
resposta, href, rotuloLink }`. Candidatas, na ordem:

1. "Vendi, e o caixa do mês está zerado. Por quê?" (pago é outro dia que entregue, `#d36`)
2. "A farinha subiu. O preço dos meus doces muda sozinho?" (o que a 089 mostra e o que o
   `custoDesatualizado` faz; conferir `#d05`)
3. "Mudei a minha hora na Configuração. E os produtos?" (082)
4. "A cliente pagou metade antes. Como eu lanço?" (o sinal, 081)
5. "Como mando um Pix que já vai com o valor?" (080)
6. "Como mando o orçamento arrumado para a cliente?" (a folha)
7. "Posso usar no celular e no computador ao mesmo tempo?" (a mesma conta, e a fila sem rede)
8. "Arquivei uma coisa sem querer. Perdi?" (nunca apagar; conferir onde se desarquiva)
9. "Como faço o relatório mensal do MEI?" (074)
10. "Se eu parar de assinar, o que acontece com o que eu cadastrei?" (conferir o fluxo da
    assinatura e o `#d148` antes de escrever uma palavra)

Resposta em até três linhas, na voz do `PRODUCT.md`, sem número de exemplo, terminando no link
para a tela que resolve.

### A seção

- "Perguntas que aparecem depois", entre "Quando não tem internet" e "Instalar" no encerrado;
  depois dos cinco no aberto. Âncora "Perguntas" no índice da 093.
- Cada pergunta é um `<details>` com `<summary>` de 44px mínimo, numa lista com divisórias. A
  resposta abre no lugar, com o link terciário embaixo. Sem animação de altura.
- Acima da lista, um campo de busca (48px, `Search`, "Procurar uma pergunta"), filtrando
  pergunta e resposta por `chaveDeBusca` (`domain/custoInsumo.ts`, a mesma da busca de
  Materiais). Com uma só que sobra, ela vem aberta. Nenhuma: "Nenhuma pergunta com isso." e a
  saída logo abaixo.
- `/comecar#pergunta-{id}` abre aquela pergunta: outras telas podem apontar para a resposta.

### A saída

- Fim da seção, e fim da página no celular: "Não achou o que procurava?" e o `FaleComAGente`
  da 084, o mesmo componente, com o mesmo canal.

---

## 2 · Antes de tocar em código

1. Conferir, uma por uma, as dez respostas no código. A 2, a 8 e a 10 são as que mais podem
   estar diferentes do que esta spec supõe.
2. Conferir que `FaleComAGente` funciona fora da Configuração (props, rota da dona).

---

## 3 · Escopo

- `components/comecar/perguntas.ts` e `components/comecar/Perguntas.tsx` (novos).
- `TelaComecar.tsx`: a seção e a âncora.

---

## 4 · Roteiro de navegador

1. Buscar "pix", "sinal", "zerado", "mei": a pergunta certa aparece, e com uma só ela abre.
2. Buscar sem acento ("relatorio") acha com acento.
3. `/comecar#pergunta-caixa-zerado` abre a pergunta e rola até ela.
4. Teclado: `Tab` passa pelas perguntas, `Enter` abre e fecha.
5. "Fale com a gente" abre o canal da 084.

---

## Critérios de aceite

- [x] Até dez perguntas, cada resposta conferida no código, cada uma com o link da tela.
- [x] Busca sem acento; âncora por pergunta.
- [x] "Fale com a gente" no fim.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d297` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Busca no sistema inteiro** (pedidos, produtos, perguntas juntos). Outra coisa, outra spec.
- **Vídeo ou captura de tela nas respostas.** Captura envelhece a cada spec e tem número de
  mentira (`#d70`); a 094 mostra o sistema com os números dela.
- **Assistente que responde por IA.** Só com o que esta seção não resolver, e medido.
