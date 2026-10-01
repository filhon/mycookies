# Spec 062 · Quem me deve

**Tipo:** a tela Pedidos troca as sete pílulas de status por quatro vistas (Agenda · Orçamentos ·
Me devem · Já saíram); "A receber" se divide no que já devem e no que vai entrar; a linha só
mostra o que destoa; o cabeçalho do dia ganha a sobra. **Nenhum campo, nenhuma consulta nova,
nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Pedidos sobre os prints de 2026-10-01 (celular escuro e desktop).
**Depende de:** nada. Vem antes das outras quatro da crítica.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d246`, `#d247`, `#d248`.

---

## Problema

Lido nos prints, com os dados reais da MyCookie's em 1º de outubro:

**A agenda some debaixo do histórico.** Em "Todos", são 4 pedidos na agenda e 35 que já saíram.
No celular a agenda acaba na primeira tela; as nove telas seguintes são entregues e pagos. O que
ela veio fazer (ver o que tem pra hoje e amanhã) disputa a rolagem com o que já terminou.

**O dinheiro que já devem está escondido dentro de uma frase.** "A receber R$ 3.118,00" soma
R$ 3.042,00 do Hebron, para 23 de novembro, com o que já foi entregue e não entrou. A parte que
pede ação, R$ 63,00 de três pedidos entregues, aparece como "3 deles já foram entregues", sem
valor e sem caminho até eles.

**O pedido que não foi pago é reconhecido pela falta de um selo.** No histórico, 33 linhas
repetem "Entregue · Pago". Ana Karoline e Filipe Honório, de 27 de setembro, não pagaram, e a
única diferença na linha é não ter o "Pago". Ausência não é sinal: o olho não vê o que não está lá.

**O cabeçalho do dia quebra o princípio 3.** "2 pedidos · R$ 73,00": cada linha diz quanto sobra,
e o dia não soma isso em lugar nenhum. É a pergunta "valeu o domingo?" sem resposta.

**As pílulas são o banco de dados, não as perguntas dela.** Sete pílulas, três fora da tela no
celular. "Em produção" e "Prontos" filtram uma agenda de quatro pedidos que o olho lê inteira.
As perguntas que ela faz a esta tela são outras: o que tenho pra entregar, que orçamento está
esperando resposta, quem me deve, o que eu já entreguei.

**Prosa fixa antes do primeiro pedido.** As duas faixas somam sete linhas de explicação, todo
dia, cerca de 210px no celular. A frase do regime de caixa ensina uma vez; depois é ruído.

**O combo corta o que importa.** "1 × Combo 4 Cookies (1 Cookie P…": a composição empurra o resto
para fora da linha. Na lista, o nome do produto basta; a composição é do pedido aberto.

O que os serviços pagos fazem aqui: o Shopify separa o estado do pagamento do estado da entrega e
abre a lista de pedidos em abas salvas com contagem ("Não pagos", "Não enviados"); Asaas e Conta
Azul separam "vencido" de "a vencer". Nenhum deles mostra a sobra por pedido. Essa é a vantagem
desta tela, e o cabeçalho do dia é onde ela ainda não chegou.

---

## 1 · O que esta spec decide

### Vistas no lugar de status: `#d246`

As pílulas passam a ser quatro, nesta ordem:

| Vista          | O que mostra                                | Fonte (já assinada hoje)               | Ordem                             |
| -------------- | ------------------------------------------- | -------------------------------------- | --------------------------------- |
| **Agenda**     | tudo o que não fechou, orçamentos inclusive | `consultaAgenda`                       | entrega, mais próxima             |
| **Orçamentos** | a agenda filtrada em `ORCAMENTO`            | `consultaAgenda`, em memória           | entrega, mais próxima             |
| **Me devem**   | entregue e não pago                         | `consultaEntreguesEmAberto`            | entrega, **mais antiga** primeiro |
| **Já saíram**  | entregues e cancelados, em páginas de 30    | `consultaHistorico(STATUS_CONCLUIDOS)` | entrega, mais recente             |

- **Agenda é a vista de entrada.** O histórico não aparece nela. No fim da agenda, botão
  terciário "Ver o que já saiu", que troca a vista.
- **Contagem nas pílulas** de Orçamentos e Me devem quando passa de zero ("Me devem 3"). Se
  `Pilulas` não aceita contagem, o número vai no rótulo; não criar prop só para isso.
- **Me devem só para a dona**, pela mesma regra de "Esperando você" (`#d213`): é dinheiro. Conferir
  se a ajudante assina `consultaEntreguesEmAberto` em `ListaPedidos` hoje; se assina, deixa de
  assinar, como já é na Hoje.
- **A vista mora na URL**, `?vista=orcamentos|me-devem|ja-sairam` (a agenda é a ausência). É o que
  deixa a faixa e a Hoje apontarem para ela. A linha "falta receber" de `EsperandoVoce` passa a
  levar a `/pedidos?vista=me-devem`.
- **"Em produção", "Prontos", "Entregues" e "Cancelados" saem das pílulas.** O selo de status
  continua na linha. Cancelado vive em "Já saíram", com o selo negativo.
- A contagem acima da lista segue a vista: "4 na agenda", "2 orçamentos", "3 pedidos · R$ 63,00",
  "os 30 mais recentes".
- Vazios, cada vista com a sua frase: Orçamentos "Nenhum orçamento esperando resposta."; Me devem
  "Ninguém te deve nada." sem ação; os outros como hoje.

### "A receber" vira duas quantias: `#d247`

`aReceber` passa a devolver também `totalEntregue` (centavos dos entregues não pagos), com teste.
A faixa de cima fica:

```
[mão com moedas] Me devem   R$ 63,00 · 3 entregues sem pagar               [Ver quem]
                 Vai entrar R$ 3.055,00 · 2 combinados
                 Só entra no resultado do mês quando você marca como pago.
```

- Sem entregue em aberto, a primeira linha some e "Vai entrar" sobe. Sem nenhum dos dois, a faixa
  some, como hoje.
- "Ver quem" troca para a vista Me devem. Na própria vista Me devem, o botão some.
- A frase do regime de caixa encolhe para uma linha. O resto da explicação já está em `#d36`.
- "Entregas a pagar" fica com uma frase: "1 entrega feita, ainda não acertada com o entregador."
  O "O que você cobrou é o que você paga." sai da faixa e fica no `PainelEntregas`, onde o valor é
  conferido.
- A faixa aparece em todas as vistas, com os mesmos números: o que devem é fato, não filtro.

### A linha mostra a exceção: `#d248`

- **Em "Já saíram" e "Me devem"**, a linha perde o selo "Entregue" e o marcador "Pago". O que
  aparece é o que destoa:
  - não pago: marcador **"Falta receber"**, ícone `HandCoins`, tinta `--attention`. Ícone e
    palavra, nunca só a cor (o ocre divide matiz com o âmbar);
  - cancelado: o selo de status de sempre;
  - "Pelo cardápio" e "Entrega" continuam.
- **Na agenda nada sai**: o selo de status é o que ela lê ali, e "Pago" antes da entrega é sinal
  que ela quer ver.
- **Resumo do item sem a composição.** `resumoDosItens` ganha uma opção para usar só o nome
  (`nomeSnapshot`) e não `nomeComEscolhas`; a lista usa essa opção. "1 × Combo 4 Cookies · 1 ×
  Cookie Tradicional 120g". Teste.
- **Cabeçalho do dia com a sobra:** "2 pedidos · R$ 73,00 · sobram R$ 39,65". Soma de
  `lucroEstimado`. Dia no prejuízo: "perde R$ 6,81" com `TriangleAlert` e `--negative`, como na
  linha. Cancelado não entra na soma do dia nem no total (hoje entra no total: corrigir junto).

---

## 2 · Antes de tocar em código

- Conferir se `Pilulas` rola na horizontal com quatro pílulas em 360px. Quatro devem caber; se não
  couberem, "Já saíram" é a que encurta para "Saíram".
- Conferir que trocar de vista não reinicia a assinatura da agenda (ela é a mesma em três vistas).
- Conferir de onde vem o total do dia hoje e se cancelado já é excluído em algum lugar.

---

## 3 · Escopo

- `src/components/pedidos/ListaPedidos.tsx`: vistas, URL, faixa, contagem, cabeçalho do dia.
- `src/components/pedidos/LinhaPedido.tsx`: prop que diz se a linha é da agenda ou do que saiu;
  "Falta receber"; resumo curto.
- `src/components/pedidos/EntregasAPagar.tsx` e `PainelEntregas.tsx`: a frase.
- `src/components/pedidos/EsperandoVoce.tsx`: o link para `?vista=me-devem`.
- `src/lib/domain/pedido.ts`: `totalEntregue` em `aReceber`, opção curta em `resumoDosItens`, soma do
  dia sem cancelado. Testes.

---

## 4 · Roteiro de aparelho

1. 360×640, `/pedidos`: a primeira tela mostra a faixa e o primeiro pedido de hoje sem rolar.
2. A agenda termina em "Ver o que já saiu"; nenhum pedido entregue aparece antes de tocar nele.
3. A faixa diz "Me devem R$ 63,00 · 3 entregues sem pagar". "Ver quem" mostra Ana Karoline e
   Filipe Honório, cada um com "Falta receber", o mais antigo primeiro.
4. Em "Já saíram", nenhuma linha diz "Entregue" nem "Pago"; as que não pagaram dizem "Falta receber".
5. Domingo, 27 de setembro: "6 pedidos · R$ 120,00 · sobram R$ …", a soma das seis sobras.
6. A linha da Janessa diz "1 × Combo 4 Cookies", sem reticências no celular.
7. Na Hoje, "falta receber" abre `/pedidos?vista=me-devem`. Voltar do navegador volta para a Hoje.
8. Entrar como ajudante: não existe a pílula Me devem nem a primeira linha da faixa.
9. Tema claro e escuro: "Falta receber" legível nos dois, com o ícone.

---

## Critérios de aceite

- [x] Quatro vistas, Agenda por padrão, vista na URL.
- [x] Me devem só para a dona, sem assinatura para a ajudante.
- [x] Faixa com "Me devem" e "Vai entrar" separados; `totalEntregue` com teste.
- [x] Linhas do que saiu sem "Entregue" e "Pago"; "Falta receber" com ícone e palavra.
- [x] Resumo curto com teste; cabeçalho do dia com a sobra; cancelado fora da soma.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d246` a `#d248` escritos; `ESTADO.md` atualizado; a linha "Pílula de filtro" do
      `DESIGN.md` ganha a contagem.

---

## 5 · Fora de escopo

- **Marcar como pago ou entregue sem abrir o editor.** É a 063.
- **Cobrar no WhatsApp.** É a 063: a linha é um link inteiro e não pode ter outro alvo dentro.
- **Busca.** É a 065.
- **Vista de calendário.** Com quatro pedidos na agenda, a lista por dia já é o calendário.
  Volta a ser pergunta quando houver uma semana com mais de vinte.
- **Ações em lote** ("marcar o domingo inteiro como entregue"). Medir a 063 primeiro: se a ficha
  resolve em dois toques, o lote não paga o risco de marcar errado vinte de uma vez.
- **Pedido de R$ 0,00 como cortesia.** O "perde R$ 6,81" do Wendel está certo. Dar nome à
  cortesia é outra conversa, e mexe no caixa.
