# Spec 064 · A hora da entrega

**Tipo:** o pedido ganha uma hora de entrega opcional; o dia da agenda passa a seguir a hora.
**Um campo opcional novo (`horaEntrega`), compatível.** Nenhuma regra, nenhuma dependência,
nenhuma consulta nova.
**Tamanho:** uma sessão.
**Origem:** crítica da tela Pedidos (2026-10-01).
**Depende de:** nada. Se a 063 rodou antes, a ficha mostra a hora.
**Aprovações pedidas:** nenhuma pela regra do projeto (o campo é opcional e o documento antigo
continua válido), mas é campo novo de schema: confirmar antes de codificar.
**Decisões a registrar:** `#d251`.

---

## Problema

O domingo 20 de setembro teve oito pedidos, quatro com entrega. Nenhum diz a que horas. Dentro do
dia, a ordem é a do banco, e a hora combinada está na conversa do WhatsApp ou em "Observações",
onde nenhuma conta enxerga. Para ela, "Hoje · 2 pedidos" não responde a pergunta da manhã: o que
sai primeiro.

Toda agenda paga tem hora: o iFood ordena por horário de saída, as ferramentas de encomenda de
confeitaria (Bakesy, Craftybase) têm horário de retirada no pedido, a agenda do Google é feita
disso. Aqui é o único dado de agenda que falta.

---

## 1 · O que esta spec decide

### Hora opcional, gravada como texto: `#d251`

- `Pedido.horaEntrega?: string`, no formato `"HH:MM"`, 24 horas, no fuso do aparelho, como
  `dataEntregaISO`. Ausente quer dizer "sem hora", e é o estado de todo pedido de antes.
- **Texto, e não dentro de `dataEntrega`:** `dataEntrega` é meia-noite hoje e tem consultas e
  agregados presos a ela (`competencia`, a agenda). Mudar o que ela significa seria mexer em tudo
  isso; um campo ao lado não mexe em nada. `VERSAO_SCHEMA` fica em 1, como ficou para
  `validoAteISO` e `origem`.
- **Formulário:** logo abaixo da data, "Hora (opcional)", `<input type="time" step="900">`
  nativo, com "Sem hora" (botão terciário que limpa) ao lado. Nada de seletor próprio: o do
  aparelho já é o melhor no celular. Validação em `domain/` (`ehHoraValida`), com teste.
- **Agenda:** dentro do dia, a ordem é a hora; sem hora vai para o fim, na ordem de hoje. Função
  pura em `domain/pedido.ts` (a de agrupar ganha a ordenação), com teste. O dia continua sendo o
  grupo.
- **Linha:** a hora abre a linha dos marcadores, com `Clock`: "14:30 · Entrega". Sem hora, nada.
  Na Hoje (`AgendaHoje`), igual.
- **WhatsApp:** `mensagemDoPedido` diz "para quinta, 1 de outubro, às 14:30" quando houver hora.
  Teste.
- **Cardápio público não pede hora.** A cliente escolhendo horário é uma promessa que ela não fez;
  o `/api/cardapio/pedido` continua sem gravar o campo.

---

## 2 · Antes de tocar em código

- Confirmar com o Filipe a aprovação do campo.
- Conferir em `firestore.rules` que nada valida as chaves de `pedidos` (na crítica, nada valida).
- Conferir que `dadosDoPedido()` e `atualizarPedido` gravam `horaEntrega` ausente como ausente, e
  não como string vazia; e que apagar a hora de um pedido que tinha remove o campo (`deleteField`).
- Conferir o conversor do Firestore: campo opcional novo precisa passar por ele sem `undefined`.

---

## 3 · Escopo

- `src/lib/types/vendas.ts`: o campo, com o comentário do porquê.
- `src/lib/domain/pedido.ts`: validação e ordem no dia; `src/lib/domain/whatsapp.ts`: a frase.
  Testes.
- `src/components/pedidos/FormularioPedido.tsx`: o campo.
- `src/components/pedidos/LinhaPedido.tsx`, `AgendaHoje.tsx`: a hora na linha.
- `src/lib/firebase/mutations/pedidos.ts` e o conversor, se precisarem.

---

## 4 · Roteiro de aparelho

1. Novo pedido para hoje, 14:30: a linha diz "14:30 · Entrega" e fica depois do de 10:00.
2. Pedido antigo sem hora: abre, salva sem mexer, continua sem hora (sem string vazia gravada).
3. Tirar a hora de um pedido que tinha: o campo some do documento.
4. Sem rede: criar com hora, a linha mostra a hora na hora.
5. WhatsApp do pedido com hora: a frase diz "às 14:30".
6. Pedido pelo cardápio: chega sem hora, e ela pode pôr depois.

---

## Critérios de aceite

- [ ] Campo opcional, validado em `domain/`, com teste.
- [ ] Ordem do dia pela hora, sem hora no fim, com teste.
- [ ] Hora na linha da lista, na Hoje e no WhatsApp.
- [ ] Apagar a hora remove o campo.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d251` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Faixa de horário** ("entre 14h e 16h"). Uma hora resolve a ordem, que é o problema. Faixa vira
  pergunta quando ela pedir.
- **Hora no cardápio público.** Ver acima.
- **Aviso de "entrega daqui a uma hora".** Notificação é um assunto inteiro (mesma razão da 012).
- **Rota.** Hora ordena, rota otimiza; com quatro entregas no dia, a ordem é a rota.
