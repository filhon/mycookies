# Spec 136 · A margem que parece multiplicador

**Tipo:** o bloco "Como calcular o preço" desconfia de dois números que quase sempre são engano (a
margem de um dígito e a taxa de cartão zerada quando a conta tem maquininha) e oferece a correção
num toque. Aritmética em `src/lib/domain/precificacao.ts`, com teste. Nenhum schema, nenhuma regra,
nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, item 5.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d341`.

---

## Problema

No print, "Decidir quanto sobra" com **2,5%**. O custo é R$ 6,78; 2,5% de margem dá R$ 6,95, e o
sugerido de R$ 7,90 só existe porque o arredondamento puxou para cima. É quase certo que ela quis
**multiplicar por 2,5** (R$ 16,95, sobrando 60%), que é a regra de bolso de toda apostila de
confeitaria. A tela aceitou calada: a frase do rodapé diz "Sobram R$ 1,12", positivo, com o ponto
âmbar. Nada está tecnicamente errado e o produto inteiro está mal precificado.

O mesmo print tem "Taxa de cartão 0%". Se a conta tem crédito a 4,99%, o preço não fecha no
cartão, e a dica do campo ("a maior das suas formas de pagamento") pede um número que o sistema já
sabe. É o princípio 1 do `PRODUCT.md`: nunca pedir um número derivável de outro já cadastrado.

Serviços que se pagam confirmam o número improvável antes de deixá-lo virar decisão (o banco que
pergunta "R$ 10.000, certeza?"). Aqui a confirmação é uma frase com a saída, nunca um modal.

---

## 1 · O que esta spec decide: `#d341`

### 1.1 `conferirPrecificacao`

Função pura em `precificacao.ts`:
`conferirPrecificacao({ metodo, margemDesejada, taxaCartaoConsiderada }, formasPagamento)`
devolve uma lista de avisos, cada um `{ campo, tipo, sugestao }`.

1. **`MARGEM_PARECE_MULTIPLICADOR`**: método `MARGEM` e `1 ≤ margemDesejada ≤ 6`. Sugestão:
   `{ metodo: "MARKUP", markup: margemDesejada }`.
2. **`MARGEM_BAIXA`**: método `MARGEM`, `0 < margemDesejada < 10` e fora do caso 1. Sem sugestão de
   valor; só a consequência em reais.
3. **`TAXA_ZERADA`**: `taxaCartaoConsiderada === 0` e alguma forma de pagamento com
   `taxaPercentual > 0`. Sugestão: a maior `taxaPercentual`, com o nome da forma.

Os limites (6 e 10) moram em constantes nomeadas no topo, com o porquê em comentário.

### 1.2 Onde aparece

Embaixo do campo a que se refere, no bloco "Como calcular o preço", em `label`, com
`TriangleAlert` e tinta `--attention` (atenção, não negativo: pode ser a decisão dela):

1. "Sobrar 2,5% do preço é R$ 0,17 por unidade. Se você quis multiplicar o custo por 2,5, sobram
   R$ 10,17." + botão terciário **"Era multiplicar por 2,5"**, que troca o método e o valor.
2. "Sobrar 8% do preço é R$ 0,59 por unidade." (sem botão.)
3. "Seu Crédito cobra 4,99%. Com zero aqui, o preço não fecha no cartão." + **"Usar 4,99%"**.

Os reais vêm de `derivarFicha` com o parâmetro trocado: é a consequência que o `DESIGN.md` exige
("todo número mostra sua consequência"). O aviso some quando ela muda o número; não há "ignorar"
gravado. O "Salvar" nunca é bloqueado por esses avisos.

### 1.3 Configuração

A mesma conferência roda no bloco de preço padrão da Configuração (`margemPadrao`), com a mesma
frase e o mesmo botão: a ficha nova nasce com o padrão da conta, e o engano começa lá.

---

## 2 · Testes

Os três tipos, as bordas (1, 6, 6,01, 10), conta sem formas de pagamento, forma só com taxa fixa.

---

## 3 · Escopo

- `precificacao.ts` e o teste.
- `FormularioFicha.tsx`: os avisos sob os campos, os dois botões.
- O bloco de preço padrão em `/configuracao`.
- `DECISOES.md`: `#d341` (por que 6 e 10; por que atenção e não negativo; por que não bloqueia).
- `novidades.ts`: "O preço avisa quando a margem parece um multiplicador".

---

## 4 · Roteiro de navegador

1. Cookie Cacau com Nutella: frase 1 sob "Quero que sobre"; tocar "Era multiplicar por 2,5" troca
   para "Multiplicar o custo" com 2,5; sugerido vira R$ 16,90 (ou o arredondamento da conta).
2. Margem 30: nenhum aviso.
3. Taxa 0 com Crédito 4,99% na conta: frase 3; "Usar 4,99%" preenche.
4. Conta sem formas de pagamento: sem frase 3.

**Antes de rodar:** perguntar à Maynara se os 2,5% foram engano. Se não foram, a regra 1 está
errada para ela e o limite cai para a regra 2 só.

---

## Critérios de aceite

- [x] Os três avisos, com a consequência em reais e a saída num toque.
- [x] Nenhum aviso bloqueia o salvamento.
- [x] A Configuração confere o padrão.
- [x] Testes novos passam; portão de conclusão passa; `#d341`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Preço por canal** (balcão, cartão, aplicativo). É a pergunta seguinte; o campo "Outras taxas"
  resolve o caso de um canal só.
- **Margem sugerida por categoria ou pelo mercado.** O sistema faz a conta; ela decide.
