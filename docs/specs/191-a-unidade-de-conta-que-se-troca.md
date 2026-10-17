# Spec 191 · A unidade de conta que se troca

**Tipo:** um caminho explícito para mudar como um material é contado (ovo de unidade para grama,
essência de grama para mililitro), que converte junto as receitas, a despensa e o que mais guarda
quantidade na base antiga.
**Tamanho:** uma sessão.
**Origem:** a revisão da gestão de materiais de 2026-10-16 ("corrigir a unidade de conta"). A 188
fecha a troca silenciosa; esta abre a troca pedida.
**Depende de:** 188 (`baseAceita`, `basesDasReceitas`) e 189 (base por entrada no histórico).
**Aprovações pedidas:** nenhuma. Nenhum campo novo; as escritas são as que já existem, em lote.
**Decisões a registrar:** uma, numerada na sessão: trocar a unidade de conta exige rede e converte
tudo no mesmo lote, e a despensa conta de novo a partir de hoje.

---

## Problema

Depois da 188, um material usado em receita não muda de base pelo formulário. Mas há trocas
legítimas: cadastrou ovo em unidade e a receita pesa; cadastrou essência em grama e mede em ml; ou a
nota criou o material em `un` e ele é pesado. Hoje a única saída seria arquivar e cadastrar de novo,
refazendo cada receita à mão.

---

## 1 · O que esta spec decide

### Onde mora

No formulário do material, abaixo do seletor de unidade restrito (188): "Mudar a unidade de conta".
Abre, no mesmo painel, um passo próprio.

### O passo

1. **Para qual unidade:** grama, mililitro ou unidade (só as que não são a atual).
2. **Quanto vale uma da atual na nova:** "Um ovo pesa quantos gramas?" (`un` → `g`), "1 ml de
   essência pesa quantos gramas?" (`ml` → `g`). Número positivo, obrigatório. A frase sai de
   `perguntaDaConversao(de, para)`, no domínio.
3. **A nova embalagem:** preço, quantidade e unidade, já preenchidos pela conversão (12 ovos → 600 g),
   editáveis.
4. **O que muda:** a lista das receitas que usam o material, cada uma com "3 un → 150 g", e a
   despensa ("24 un → 1,2 kg"). Embaixo, "Mudar para gramas".

### A conta

`converterUnidadeDeConta(fator, ...)` no domínio, pura, com teste: quantidade de cada item ×
fator, `unidadeBase` nova, `estoqueAtual` × fator. Arredondamento: duas casas em `g` e `ml`, inteiro
para cima em `un` (meia unidade não se compra), e a tela mostra o arredondado antes de gravar.

### A escrita

- **Exige rede**, como a leitura de nota (`#d50`): as receitas são lidas do servidor
  (`getDocsFromServer` com `array-contains`), porque a do cache pode faltar uma, e uma receita não
  convertida é o açúcar da 188 de novo. Sem rede, a frase "Mudar a unidade precisa de internet, para
  achar todas as receitas que usam este material."
- Um `writeBatch` esperado (a segunda exceção ao `despachar`, como `importarNota`): o material
  (embalagem nova, derivados, entrada de histórico `origem: "MANUAL"`), cada receita (itens
  convertidos, `custoDesatualizado: true`) e o estoque.
- A despensa: `estoqueAtual` convertido e `estoqueContadoEmISO` de hoje. A projeção pelas fornadas
  (`projecaoDoInsumo`) soma consumo gravado na base antiga (`#d88`); contar de hoje é o que impede a
  mistura.
- Listas de compras abertas: refeitas na próxima abertura, como já são; conferir na sessão se alguma
  guarda quantidade em base.

---

## 2 · Antes de tocar em código

1. Ler `FormularioInsumo`, `mutations/fichas.ts` (como um item é gravado), `mutations/notas.ts`
   (o lote esperado), `projecaoDoInsumo`, `Fornada.consumo`, `listasCompra` (o que guarda em base).
2. Ler `#d50`, `#d88`, `#d104`.
3. Listar todo documento que guarda quantidade de material em base; o que não for convertido aqui
   vai, com o motivo, para a decisão.

---

## 3 · Escopo

- `domain/unidades.ts`: `perguntaDaConversao`, `converterUnidadeDeConta`; teste.
- `mutations/insumos.ts`: `mudarUnidadeDeConta`.
- `FormularioInsumo`: o passo.

---

## 4 · Roteiro

1. Ovo em `un` (caixa com 12, R$ 18,00), usado em dois cookies com 2 un: mudar para gramas, 50 g
   cada. Receitas passam a 100 g, a caixa a 600 g, a despensa convertida, os dois produtos marcados.
   O custo do lote não muda (a mesma conta, noutra unidade).
2. Sem rede: a frase, nada gravado.
3. Material sem receita: a troca passa sem lista de receitas.
4. O histórico do ovo mostra as compras antigas em unidade e a nova em grama, sem seta entre elas
   (189).

---

## Critérios de aceite

- [x] Um material muda de unidade de conta com todas as receitas convertidas junto.
- [x] O custo do produto não muda pela troca em si.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisão registrada; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Exigir rede.** Converter offline acharia só as receitas do cache. É uma ação rara; errar nela
  custa o mesmo que o açúcar.
- **A despensa recomeça hoje.** Converter também o consumo das fornadas antigas reescreveria
  documentos congelados (`#d88`). O número da despensa continua, convertido; só a idade dele zera.

---

## Fora de escopo

- Densidade automática por material (tabela de g por ml).
- Receita que mede um material em unidade diferente da do material (ovo em un numa receita e em g
  noutra). Uma base por material continua a regra.
