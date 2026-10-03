# Spec 082 · O que muda nos produtos

**Tipo:** a Configuração passa a refazer o custo dos produtos quando ela muda a hora, a energia,
o gás, as despesas fixas ou as horas do mês, e mostra antes de salvar o que isso faz com a sobra
de cada produto. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** duas sessões, A (domínio e gravação) e B (a prévia).
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** nada. **Vem antes de 083 a 087.**
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d281` (A), `#d282` (B).

---

## Problema

1. **Mudar a Configuração não muda os produtos, e nada avisa.** A ficha grava `invisiveis`,
   `custoTotalLote`, `custoUnitario` e a `precificacao` derivada com a configuração do dia em que
   foi salva (invariante: derivado é gravado). Trocar material marca a ficha com
   `custoDesatualizado` (`mutations/insumos.ts`, `mutations/notas.ts`); salvar a Configuração não
   marca nada (`salvarConfiguracao` grava só `configuracao/geral`). Ela sobe a hora de R$ 25 para
   R$ 30 e o "sobra R$ 2,10" do cookie continua lá, mentindo, até ela abrir e salvar cada produto.
2. **Ela muda o número no escuro.** A faixa de cada bloco diz o efeito numa fornada de exemplo,
   nunca nos doces dela. Ferramenta de preço que cobra assinatura mostra o efeito no catálogo
   antes de confirmar; é o "todo número mostra a sua consequência" do `PRODUCT.md` na escala da
   conta.

---

## 1 · O que esta spec decide

### A · Salvar refaz o que é da configuração: `#d281`

- Ao salvar, **se `operacional` mudou** em relação ao gravado (ou é a primeira gravação, que
  troca o sugerido do `#d114` pelo dela), `refazerFichasPelaConfiguracao(contaId, operacional)`:
  - lê as fichas não arquivadas (`getDocs`, que no aparelho sem rede responde do cache);
  - **ficha sem componentes**: regrava `invisiveis` (minutos de sempre, valores novos),
    `custoTotalLote`, `custoUnitario`, e na `precificacao` o `precoSugerido`, `lucroUnitario`,
    `margemReal` e `markupReal`. **`precoVenda` não muda**: o preço é decisão dela. Não mexe em
    `custoDesatualizado`: se o material já estava velho, continua dito;
  - **kit** (`componenteIds` não vazio): só `custoDesatualizado: true`. O custo dele vem do
    `custoUnitarioSnapshot` dos componentes, que acabaram de mudar; refazer a cascata é outra
    conta;
  - um `writeBatch`, `v: VERSAO_SCHEMA`, `custoCalculadoEm: Timestamp.now()`.
- A conta mora no domínio: `refazerCustoPelaConfiguracao(ficha, operacional)` em
  `domain/custoFicha.ts`, reaproveitando `calcularCustoFicha` com os custos de material que a
  ficha já gravou, e a mesma função de preço que o editor usa. Com teste: uma ficha salva com a
  hora a R$ 25 e refeita a R$ 30 dá o mesmo que o editor daria salvando-a a R$ 30.
- Mudar só o preço padrão, as formas de pagamento ou a folha **não** refaz nada: o preço padrão
  é de produto novo, e cada ficha guarda os parâmetros de preço dela.

### B · A prévia antes de salvar: `#d282`

- Enquanto o `operacional` da tela difere do gravado, logo abaixo de "Cada hora de produção
  custa", a seção **"O que muda nos seus produtos"**, das fichas que a tela passa a assinar pela
  mesma consulta de `/fichas` (nenhuma consulta nova no servidor):
  - uma frase: "Com estes números, 14 produtos ficam mais caros de fazer: de R$ 0,12 a R$ 0,48
    por unidade." (ou "mais baratos");
  - até cinco linhas, as de maior queda na sobra primeiro: nome, e "sobra R$ 2,10 → R$ 1,80"
    pelo `precoVenda` de hoje. Sobra que fica negativa: `trending-down`, cor negativa e "passa a
    dar prejuízo";
  - "e mais 9" abre o resto na mesma lista; kits entram numa linha só: "3 kits ficam para
    conferir".
- Depois de salvar, a frase vira o recibo, no lugar: "14 produtos refeitos com os números novos.
  3 kits ficaram para conferir." com o link para `/fichas`.
- Lista com divisórias, `label`, números tabulares; nenhum cartão novo, nenhum âmbar.

---

## 2 · Antes de tocar em código

1. Achar a função que o `FormularioFicha` usa para `precoSugerido`, `lucroUnitario`,
   `margemReal` e `markupReal`, e confirmar que ela só precisa do `custoUnitario` e da
   `precificacao` gravada.
2. Confirmar que `custoEscolhas` gravado entra igual na soma (ficha com escolhas não é kit).
3. Ver o hook que `/fichas` usa e se ele já traz as arquivadas filtradas.

---

## 3 · Escopo

- `domain/custoFicha.ts`: `refazerCustoPelaConfiguracao`, com teste (A).
- `mutations/fichas.ts`: `refazerFichasPelaConfiguracao` (A).
- `TelaConfiguracao.tsx`: a chamada no `salvar`, só com `operacional` mudado (A); a seção da
  prévia e o recibo, em componente próprio em `components/configuracao/` (B).

---

## 4 · Roteiro de navegador

1. Hora de R$ 25 para R$ 30: a prévia aparece sob "Cada hora de produção custa", com as sobras
   caindo; volta a R$ 25 e ela some.
2. Salvar: o recibo; abrir um produto simples mostra o custo novo e o mesmo preço de venda; o
   kit mostra "Custo desatualizado".
3. Mudar só o arredondamento e salvar: nenhum produto refeito, nenhuma prévia.
4. Sem rede: salvar refaz pelo cache, o selo diz "Salvo no aparelho", e o produto aberto já
   mostra o custo novo.

---

## Critérios de aceite

- [ ] Salvar com `operacional` mudado refaz as fichas simples e marca os kits; `precoVenda`
      intocado.
- [ ] `refazerCustoPelaConfiguracao` com teste contra o resultado do editor.
- [ ] Prévia só com diferença, com prejuízo dito por ícone, cor e palavra.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d281` e `#d282` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Refazer kits em cascata.** Marcar basta; o editor do kit já refaz.
- **Taxa da maquininha nas fichas.** Mudar a taxa do crédito não muda a `taxaCartaoConsiderada`
  gravada em cada ficha; é outra pergunta (aplicar a todas ou não) e outra spec.
- **Mudar preço de venda em lote** ("subir todos 5%"). Ela decide produto por produto.
- **Mais de 500 fichas.** Um lote só; comentário no código com o teto e a saída (lotes de 500).
