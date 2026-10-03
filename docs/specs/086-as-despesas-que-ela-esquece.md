# Spec 086 · As despesas que ela esquece

**Tipo:** "Despesas fixas do mês" deixa de ser um número só e vira uma lista curta de despesas
com nome, cuja soma é o total de sempre. **Um campo opcional novo em `operacional`; pede
confirmação do schema.** Nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** a 082 (mudar o total refaz os produtos) e a 083.
**Aprovações pedidas:** o campo `operacional.despesasFixasItens`, compatível (ausente vale o
total de hoje).
**Decisões a registrar:** `#d287`.

---

## Problema

No print, "Despesas fixas do mês: R$ 0,00", e a faixa diz "Suas despesas fixas custam R$ 0,00
por hora produzida". Zero é o número inventado que o `#d114` recusa, e é o que um campo único
convida: somar de cabeça aluguel, internet, celular, contador, DAS do MEI e a própria assinatura
do Rende é a conta que ela não faz, e o que ela não lembra fica fora do preço para sempre. As
planilhas de precificação que confeiteiras compram listam as despesas uma a uma por esse motivo.

---

## 1 · O que esta spec decide

### A lista, e o total continua derivado e gravado: `#d287`

- `operacional.despesasFixasItens?: { nome: string; valor: Centavos }[]`. Com a lista,
  `despesasFixasMensais` é a soma dela, calculada na escrita (`corpoDaConfiguracao`), nunca
  digitada. Sem a lista, o total de hoje vale como sempre: conta antiga não muda.
- **No bloco "Despesas fixas"**: uma linha por despesa (nome, valor tabular, tirar), o total
  embaixo, e "Adicionar despesa". Acima da lista, pílulas das que faltam, uma toca e entra com
  o nome e o valor vazio: Aluguel · Internet · Celular · Contador · DAS do MEI · Rende.
  - "Rende" entra com o valor do plano dela, quando a 084 o conhece. É honesto: a ferramenta
    também é custo fixo.
  - "DAS do MEI" entra sem valor; a dica diz onde achar ("O valor está no boleto do mês, no
    portal do Simples.").
- Conta com total e sem lista: o total aparece como a primeira linha, "Despesas do mês", que ela
  pode renomear ou dividir. Nada some.
- A faixa continua: "Suas despesas fixas custam R$ 3,12 por hora produzida."
- `esquemaConfiguracao` aceita a lista: nome até 40 caracteres, valor ≥ 0, até 20 itens.

---

## 2 · Antes de tocar em código

1. Confirmar a aprovação do campo.
2. Conferir quem mais lê `despesasFixasMensais` (a calculadora do site, a biblioteca, o e-mail)
   e que todos continuam lendo o total.

---

## 3 · Escopo

- `types/configuracao.ts`, `domain/schemas.ts`, `corpoDaConfiguracao`, com teste da soma.
- O bloco "Despesas fixas" em `TelaConfiguracao.tsx` (ou componente próprio, se passar de umas
  oitenta linhas).

---

## 4 · Roteiro de navegador

1. Conta com R$ 0: tocar em "Aluguel" e "Internet", preencher, salvar; a faixa e a prévia da 082
   mudam antes de salvar.
2. Conta antiga com R$ 300 de total: abre com "Despesas do mês R$ 300,00"; salvar sem mexer não
   muda o total.
3. Tirar todas as linhas: total zero, e a faixa diz.
4. Celular 360 px: nome e valor na mesma linha, tirar com 44 px.

---

## Critérios de aceite

- [ ] Lista com soma gravada; conta antiga intacta.
- [ ] Pílulas das despesas comuns, com "Rende" pelo valor do plano quando conhecido.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d287` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Despesa anual dividida por 12** (IPVA, alvará). A dica pode dizer "divida por 12"; o campo
  de periodicidade fica para quando ela pedir.
- **Ligar a lista ao Caixa** ("Contas que repetem" da 070). São a mesma coisa vista de dois
  lados, mas juntar pede decidir qual manda.
