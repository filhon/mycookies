# Spec 109 · Quem você chamou voltou

**Tipo:** o "Chamar" da 106 deixa marca, a cliente chamada sai da vista por um tempo, e a tela
diz quantas voltaram e quanto isso trouxe. **Um campo opcional novo em `Cliente`
(`chamadaEm`). Nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/clientes` sobre os prints de celular e desktop de 2026-10-09.
**Depende de:** 106. Fazer só depois de a 106 ter rodado algumas semanas na conta real: se a
Maynara não usa o "Chamar", esta spec não tem o que medir.
**Aprovações pedidas:** o campo `chamadaEm?: Timestamp`. Aditivo e compatível, mas é schema.
**Decisões a registrar:** `#d312`.

---

## Problema

1. **Chamar não deixa rastro.** Depois de chamar a Keila na segunda, na quinta ela está de
   novo no topo de "Uma vez só", e não há como saber se já foi chamada. Chamar duas vezes na
   mesma semana é o que faz a cliente silenciar o número.
2. **Sem retorno medido, a 106 vira palpite.** O que faz uma confeiteira pagar ferramenta de
   fidelidade é a linha "das 8 que você chamou, 3 voltaram e trouxeram R$ 140,00". É o
   princípio 3 do `PRODUCT.md` aplicado à mensagem: todo gesto mostra a consequência.

---

## 1 · O que esta spec decide: `#d312`

- **Tocar "Chamar" (lista ou ficha) grava `chamadaEm: Timestamp.now()`** na cliente, por
  `marcarChamada` em `mutations/clientes.ts`, despachado sem espera, junto da abertura do
  WhatsApp. O app não sabe se ela mandou de fato; abrir conta como chamar, e o `#d312` diz isso.
- **Chamada há menos de 14 dias** (`DIAS_DEPOIS_DE_CHAMAR`) desce para o fim da vista, com
  "chamada há 3 dias" no lugar do "há N dias" e sem o botão; a contagem da pílula não a conta.
- **Voltou** é ter `ultimoPedidoEm` depois de `chamadaEm`, e até 30 dias depois dela. Por
  `voltouDepoisDeChamar(cliente)` em `domain/clientes.ts`, com teste.
- **A frase da 106 ganha uma segunda linha**, só quando há chamada nos últimos 60 dias: "Das
  **8** que você chamou, **3** voltaram." Quanto elas trouxeram fica **fora**: o agregado não
  separa o pedido da volta dos anteriores, e somar `totalGasto` inteiro mentiria. Se a sessão
  achar uma leitura honesta sem consulta nova, entra; senão, a frase fica só com as pessoas.
- **Na ficha**, "Você chamou em 2 de out." abaixo dos botões, e "Voltou em 9 de out." quando
  voltou.

---

## 2 · Antes de tocar em código

1. **Pedir a aprovação do campo.** Conferir a introdução de campo opcional da 104.
2. Conferir com a Maynara se "chamada há 14 dias" é o tempo certo de silêncio. É constante
   nomeada; ajustar é uma linha.

---

## 3 · Escopo

- `types/vendas.ts` (`chamadaEm?`), `domain/clientes.ts` com teste, `mutations/clientes.ts`,
  `ListaClientes.tsx`, `LinhaCliente.tsx`, `FichaDaCliente.tsx`.

---

## 4 · Roteiro de navegador

1. "Chamar" a Keila: o WhatsApp abre; de volta, ela está no fim de "Uma vez só" com
   "chamada hoje" e sem botão; a pílula conta uma a menos.
2. Marcar pago um pedido novo da Keila: ela sai de "Uma vez só" para "Voltam" (dois
   pedidos), e a frase diz "1 voltou".
3. Sem rede: chamar grava no aparelho, e a linha muda na hora.

---

## Critérios de aceite

- [ ] `chamadaEm` gravado no toque, offline.
- [ ] Chamada recente no fim da vista, sem botão e fora da contagem.
- [ ] "Das N que você chamou, M voltaram.", com teste da janela.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d312` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Histórico de chamadas.** Um campo guarda a última; uma lista seria subcoleção nova.
- **Receita atribuída à chamada.** Ver acima.
- **Lembrete automático ("hoje é dia de chamar").** Notificação é outra conversa (os avisos
  do `#d207`), e aqui ela abre a tela quando quer.
