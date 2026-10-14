# Spec 153 · O ano do MEI

**Tipo:** uma tela do ano, `/financeiro/relatorio-mei/2026`, com os doze meses e o estado de cada
um, os números que a declaração anual (DASN-SIMEI) pede prontos para copiar, e o campo "o que
entrou antes do Rende" que fecha o buraco do limite.
**Tamanho:** uma sessão.
**Origem:** crítica de 2026-10-12. A declaração anual é o momento em que o MEI paga alguém: o
contador cobra por ela, e os apps de MEI vendem o plano em cima dela. O Rende tem os doze meses
e manda ela somar de memória, que é exatamente o problema que a 074 descreve.
**Depende de:** 150 (`fiscal/mei`), 151 (`guardados`).
**Aprovações pedidas:** (1) **schema aditivo**: `DadosMei.antes?: Record<string /* AAAA */, {
ate: CompetenciaMensal; valor: Centavos }>`; (2) o texto.
**Decisões a registrar:** `#d362`.

---

## Problema

1. **A DASN-SIMEI vence em 31 de maio** e pede a receita bruta do ano, separada entre comércio e
   indústria de um lado e serviços do outro. Ela soma doze relatórios, se os tiver.
2. **O ano que o Rende não viu.** A 150 passa a dizer "Somado desde agosto"; falta deixar ela
   completar, uma vez, com o que entrou antes. Sem isso o limite e a declaração ficam curtos.
3. **Não existe visão do ano.** O relatório anda mês a mês pela seta; para saber quais faltam,
   ela abre doze telas.

---

## O que esta spec decide: `#d362`

### A rota

- O segmento `[competencia]` passa a aceitar também `AAAA`. `AAAA-MM` continua o relatório do mês;
  `AAAA` abre `AnoDoMei`. Fora dos dois, 404.
- Chega-se pelo cabeçalho do relatório do mês ("Ver o ano" terciário, ao lado do seletor) e pelo
  pé do Caixa em janeiro a maio ("Declaração do MEI de 2026, até 31 de maio").

### A tela

```
Ano do MEI · 2026                                 [‹ 2025]   [2027 ›]

Para a declaração (DASN-SIMEI), até 31 de maio de 2027
Receita bruta total                               R$ 26.418,00
  de comércio e indústria                         R$ 26.418,00
  de prestação de serviços                        R$ 0,00
                                                  [Copiar os números]

Os meses
jan a jul   antes do Rende       R$ 9.300,00     Mudar
ago         R$ 1.912,00          ✓ guardado
set         R$ 2.201,50          ✓ guardado
out         R$ 2.410,00          vence 20 de nov
nov         ainda aberto
dez         ainda aberto
```

- **Conferir no portal no dia** os campos e os rótulos da DASN-SIMEI do ano; a tela usa os rótulos
  dela, palavra por palavra, porque é de lá que ela vai copiar.
- **Os números da declaração** somam os meses do Rende (vendas, como o relatório, e não
  `entradas`) com o "antes". Total em display; as duas parcelas em linhas tabulares. "Copiar os
  números" copia as três linhas em texto (Clipboard API, com o retorno "Copiado" por 2 s). Nada é
  enviado.
- **Ano não terminado:** o bloco da declaração vira "Até agora em 2026" e a linha do prazo some.
- **Os meses** são uma lista com divisórias; a linha inteira leva ao relatório do mês. Estado com
  o mesmo vocabulário e ícones da 151. Meses sem venda: "sem venda", `--ink-muted`.
- Lê as transações do ano. **Conferir no dia** o custo: se ler doze meses de transações for pesado
  no aparelho dela, somar `VENDA` no agregado mensal é a alternativa, e é mudança de schema (pare e
  pergunte).

### O que entrou antes do Rende

- Quando o primeiro mês com venda do ano é depois de janeiro (e da abertura), a lista começa com
  uma linha "jan a jul · antes do Rende" e um campo monetário: "Quanto você vendeu de janeiro a
  julho?" com a dica "Some pelos seus relatórios em papel ou pelo extrato. Uma vez só." Grava em
  `antes["2026"] = { ate: "2026-07", valor }`.
- `limiteDoAno` soma o `antes` do ano; a frase "Somado desde agosto…" da 150 vira "Inclui R$
  9.300,00 que você informou de janeiro a julho." O mesmo campo aparece, como link, na frase da 150
  na tela do mês.

### Imprimir

"Imprimir o ano" secundário: uma folha A4 com os doze meses e os números da declaração, mesma
classe `.folha`, para levar ao contador. O primário da tela é "Copiar os números".

---

## Testes

- `anoDoMei(vendasPorMes, antes, guardados, hojeISO)` em `domain/mei.ts`: totais, separação por
  atividade (comércio e indústria somam juntos, serviço zero), ano corrente sem prazo, meses
  antes do Rende.
- `limiteDoAno` com `antes`.

## Roteiro de navegador

1. `/financeiro/relatorio-mei/2026`: doze linhas, setembro guardado.
2. Informar R$ 9.300,00 antes de agosto: o total e o limite do mês sobem juntos.
3. "Copiar os números" e colar no bloco de notas.
4. `/financeiro/relatorio-mei/2025` com o ano sem dado: estado vazio que ensina ("O Rende começou
   a somar em agosto de 2026.").
5. Imprimir o ano: uma página.

## Critérios de aceite

- [x] Ano e mês na mesma rota; 404 fora dos dois formatos.
- [x] Números da declaração derivados, com o "antes" informado uma vez.
- [x] Limite do ano inclui o "antes".
- [x] Portão; `#d362`; `ESTADO.md`; uma linha em `novidades.ts`.

## Fora de escopo

- **Preencher a DASN no portal.** Login gov.br; o Rende entrega os números.
- **"Teve empregado?"** A declaração pergunta; o Rende não sabe e não precisa saber.
- **Anos com atividade mista** (parte comércio, parte indústria no mesmo ano). A atividade é uma
  só (150); se mudou no meio do ano, ela corrige à mão.
