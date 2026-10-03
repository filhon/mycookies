# Spec 079 · O dia que cabe

**Tipo:** escolher o dia da entrega sabendo o que já está marcado nele: atalhos de dia acima do
campo e uma linha com os pedidos e as unidades do dia escolhido. **Nenhum campo, nenhuma regra,
nenhum índice, nenhuma dependência.**
**Tamanho:** meia sessão.
**Origem:** crítica da tela de pedido sobre os prints de 2026-10-02.
**Depende de:** a 075.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d277`.

---

## Problema

"Data da entrega" é o seletor do aparelho, que nasce em hoje. Dois problemas:

1. **Os dias que ela marca são quase sempre hoje, amanhã ou o fim de semana**, e no iPhone o
   seletor é uma roda de três colunas.
2. **Ela marca o dia no escuro.** Nada diz que o sábado já tem quatro pedidos e sessenta cookies.
   O software de confeitaria que cobra assinatura lá fora (CakeBoss, BakeSmart) mostra a carga do
   dia na hora de marcar; o Rende já tem os pedidos dos próximos 30 dias carregados na tela
   (`useDespensaParaProduzir`) e não diz nada.

---

## 1 · O que esta spec decide

### Atalhos e a carga do dia: `#d277`

- **Acima do campo**, quatro pílulas (44px): "Hoje", "Amanhã" e os dois dias seguintes pelo nome
  curto ("Sáb 4", "Dom 5"). A escolhida em `--brand-700`, como a pílula de filtro. O campo de data
  continua embaixo, para qualquer outro dia, e é ele que carrega o rótulo e o erro.
- **Abaixo do campo**, uma linha sobre o dia escolhido, dos `pedidosAbertos` que a tela já tem
  (sem o próprio pedido, sem `CANCELADO` e `ENTREGUE`):
  - "Nesse dia você já tem 3 pedidos, 40 unidades." (unidades pela soma de `quantidade` dos
    itens, o combo contando as receitas de dentro, como a produção conta.)
  - "Nenhum pedido nesse dia ainda."
  - Dia fora dos 30 dias carregados: a linha não aparece. Nenhuma consulta nova.
- **Tom neutro, sempre**, `label` `--ink-muted`. O número é dela para decidir; o Rende não sabe
  quanto ela aguenta num dia e não finge saber.

---

## 2 · Antes de tocar em código

1. Conferir o que `pedidosAbertos` traz (status, horizonte de `HORIZONTE_MAXIMO`) e se exclui o
   pedido em edição.
2. Ver se `domain/producao.ts` já tem a conta de unidades por pedido com combo; usar a mesma.

---

## 3 · Escopo

- `domain/pedido.ts`: `cargaDoDia(pedidos, diaISO, exceto?)`, com teste.
- O bloco "Quando e como" em `FormularioPedido.tsx`.

---

## 4 · Roteiro de navegador

1. Pedido novo: "Hoje" marcado; tocar em "Sáb 4" muda o campo e a linha.
2. Um dia com dois pedidos: "Nesse dia você já tem 2 pedidos, …"; editando um deles, ele não
   conta a si mesmo.
3. Data a 40 dias: sem linha.
4. Celular 360px: as quatro pílulas em uma linha.

---

## Critérios de aceite

- [ ] Quatro atalhos e o campo de sempre; nenhuma consulta nova.
- [ ] `cargaDoDia` com teste, sem contar o próprio pedido.
- [ ] Linha neutra, sem alarme.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d277` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Capacidade do dia** ("você faz no máximo 80 por dia"). Pede campo e a pergunta.
- **Calendário do mês** com a carga de cada dia. A agenda de `/pedidos` já é isso.
- **Bloquear dia.** O sistema faz a conta; ela decide.
