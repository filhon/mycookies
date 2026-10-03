# Spec 074 · O relatório do MEI

**Tipo:** uma rota nova, `/financeiro/relatorio-mei/[competencia]`, que monta o Relatório Mensal
das Receitas Brutas do MEI a partir das vendas do mês, pronto para imprimir ou salvar em PDF como
o orçamento em papel (017), e diz quanto do limite anual já foi usado. **Nenhum campo, nenhuma
regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela Caixa sobre os prints de 2026-10-02: o que serviços pagos fazem e o
Rende, com os dados na mão, não faz.
**Depende de:** a 071 (`consultaAgregadosDoPeriodo`, para o ano).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d269` e `#d270`.

---

## Problema

A confeiteira que trabalha sozinha e se formalizou quase sempre é MEI. O MEI tem duas obrigações
que dependem exatamente do que o Caixa já sabe:

1. **O Relatório Mensal das Receitas Brutas**, preenchido até o dia 20 do mês seguinte e guardado
   com as notas de compra. Ninguém fiscaliza o preenchimento mês a mês, e por isso quase ninguém
   faz; na hora da declaração anual (DASN-SIMEI) ela soma doze meses de memória.
2. **O limite de faturamento anual.** Passar dele tira do MEI, e passar muito cobra imposto
   retroativo. Ela descobre em dezembro, se descobrir.

Os aplicativos de MEI e as contas PJ dos bancos cobram por isso, ou usam isso para prender a
cliente. O Rende tem cada venda lançada, com data e valor bruto, e a obriga a copiar à mão num
formulário de papel. É o ponto em que "o Rende fecha o mês pra você" deixa de ser frase.

---

## 1 · O que esta spec decide

### O relatório sai das vendas do mês, e ela só confere: `#d269`

**A tela**, em `/financeiro/relatorio-mei/2026-10`, na coluna de leitura, com o cabeçalho "Relatório
do MEI" e o seletor de mês de `/financeiro`. Acima do papel (`print:hidden`): "Imprimir ou salvar
em PDF" (primário, `window.print()`, como a 017) e uma frase: "Confira os números antes de
assinar. O relatório não é enviado a ninguém: você guarda, com as notas de compra do mês."

**O papel** reproduz o modelo do Portal do Empreendedor, na ordem dele:

```
RELATÓRIO MENSAL DAS RECEITAS BRUTAS
CNPJ: ______________________   Empreendedor individual: ______________________
Período de apuração: outubro de 2026

RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)
I   Revenda de mercadorias com dispensa de emissão de documento fiscal      R$ 0,00
II  Revenda de mercadorias com documento fiscal emitido                     R$ 0,00
III Total das receitas com revenda de mercadorias (I + II)                  R$ 0,00

RECEITA BRUTA MENSAL – VENDA DE PRODUTOS INDUSTRIALIZADOS (INDÚSTRIA)
IV  Venda de produtos industrializados com dispensa de documento fiscal     R$ 138,00
V   Venda de produtos industrializados com documento fiscal emitido        R$ 0,00
VI  Total das receitas com venda de produtos industrializados (IV + V)     R$ 138,00

RECEITA BRUTA MENSAL – PRESTAÇÃO DE SERVIÇOS
VII … IX                                                                    R$ 0,00

X   Total geral das receitas brutas no mês (III + VI + IX)                  R$ 138,00

LOCAL E DATA: ____________________     ASSINATURA DO EMPRESÁRIO: ____________________
ENCONTRAM-SE ANEXADOS A ESTE RELATÓRIO: os documentos fiscais de compras de mercadorias e
insumos e as notas fiscais emitidas no período.
```

- **A receita bruta é a soma das entradas de categoria `VENDA` do mês**, pelo valor bruto (antes
  da maquininha, que é o que a lei chama de receita bruta). Lida da lista de lançamentos do mês
  (`consultaTransacoesDoMes`, já existe), não do agregado: o agregado não separa entrada por
  categoria, e um aporte dela mesma lançado como `OUTRO` não é receita.
- **Tudo entra na linha IV** (indústria, sem documento fiscal) por padrão: confeitaria é
  produção própria, e venda a pessoa física dispensa nota. Acima do papel, duas escolhas que mudam
  o papel e ficam **no aparelho** (`localStorage`, com `try/catch`):
  - "Minha atividade no MEI é": Indústria (padrão) · Comércio. Muda a linha das vendas de IV para I.
  - "Emiti nota em R$ ___ deste mês": campo monetário; o valor sai de IV (ou I) e vai para V (ou
    II). Por mês, guardado com a competência na chave.
- **CNPJ e nome** ficam em branco para ela escrever: o Rende não guarda CNPJ, e guardar pede
  campo e consentimento.
- **Impressão:** A4, tinta preta sobre branco, sem o shell (como a 017), números tabulares à
  direita, a fonte da UI. Nenhum logotipo do Rende no papel; uma linha de rodapé em `micro`, como
  o orçamento (`#d127`).

Função pura `relatorioMei(lancamentos, escolhas)` em `src/lib/domain/mei.ts`, com teste: só
`VENDA` e `ENTRADA` somam; arquivado não chega (a consulta já filtra); a nota emitida maior que o
total é cortada no total; comércio move as linhas.

### O limite do ano, com a conta e sem alarme: `#d270`

No topo da tela (fora do papel), e numa linha no pé de `/financeiro` que leva a ela:

```
No ano: R$ 21.480,00 de R$ 81.000,00 (27%)          [barra de meta]
No ritmo deste ano, você fecha dezembro perto de R$ 25.800,00.
```

- **O ano** é a soma de `entradas` dos agregados de janeiro até o mês aberto, pela consulta da 071. Inclui entradas que não são venda: **erra pra cima**, que é o lado seguro de um limite. A
  frase diz "entrou", não "faturou", quando houver entrada fora de `VENDA` no mês aberto.
- **O ritmo** é a média dos meses com agregado vezes doze. Uma frase, sem gráfico.
- **Estados:** até 80%, tinta. De 80% a 100%, `TriangleAlert` em `--attention` e "Perto do limite
  do MEI. Vale conversar com um contador antes de dezembro." Acima de 100%, o mesmo ícone e "Você
  passou o limite do MEI neste ano. Até 20% acima, o desenquadramento vale a partir de janeiro;
  acima disso, ele volta ao começo do ano. Fale com um contador." Nunca vermelho: é aviso, não erro
  dela.
- **Ano de abertura:** o limite é proporcional aos meses desde a abertura. Uma linha abaixo da
  barra: "Abriu o MEI este ano? O seu limite é R$ 6.750,00 por mês desde a abertura." O Rende não
  sabe a data e não pergunta nesta spec.
- **O valor do limite** é constante em `mei.ts`, `LIMITE_MEI_ANUAL`, com a data da conferência e o
  endereço da fonte no comentário.

### Onde ela acha

- Pé de `/financeiro`, acima de "Refazer as contas do mês": "Relatório do MEI de outubro" como
  link terciário, e a linha do limite.
- **Do dia 1 ao dia 20**, no mês corrente, o link aponta para o **mês anterior** ("Relatório do
  MEI de setembro, até o dia 20"): é o relatório que ela precisa preencher agora.
- Nada na Hoje, nenhum aviso por e-mail nesta spec.

---

## 2 · Antes de tocar em código

1. **Conferir as regras do MEI no Portal do Empreendedor (gov.br) no dia da sessão:** o limite
   anual (R$ 81.000,00 até a data desta spec; há projeto de lei para mudá-lo), o proporcional por
   mês, as faixas de 20% e o modelo do relatório (as linhas e os textos). Se algo mudou, vale o
   portal, e a diferença vai para o `#d270`.
2. Ler `TelaOrcamento.tsx` e a 017: o mesmo `print:hidden`, o mesmo papel.
3. `/impeccable` com registro **product** para a tela e **brand** para o papel.

---

## 3 · Escopo

- `src/lib/domain/mei.ts`: `relatorioMei`, `limiteDoAno`, `LIMITE_MEI_ANUAL`, com teste.
- `src/app/(app)/(coluna)/financeiro/relatorio-mei/[competencia]/page.tsx` e
  `src/components/financeiro/RelatorioMei.tsx`. Só a dona: a rota mora sob `/financeiro`, que a
  ajudante já não abre; conferir no roteiro.
- O pé de `/financeiro` com o link e a linha do limite.

---

## 4 · Roteiro de navegador

1. Outubro: linha IV R$ 138,00, total X igual.
2. "Emiti nota em R$ 50,00": IV R$ 88,00, V R$ 50,00, VI e X R$ 138,00.
3. Comércio: as vendas passam para I e II.
4. Uma entrada `OUTRO` de R$ 500,00 no mês: o relatório não muda; o limite do ano sobe.
5. Imprimir no Chrome e no Safari do iPhone: uma página A4, sem barra, sem botão, legível em preto.
6. Dia 5: o link do pé aponta para setembro.
7. Ajudante tentando abrir a rota pelo endereço: a mesma recusa de `/financeiro`.

---

## Critérios de aceite

- [x] O papel segue o modelo do portal, linha por linha, conferido no dia.
- [x] Só `VENDA` de `ENTRADA` soma no relatório; o limite soma `entradas` do agregado.
- [x] Escolhas no aparelho, com `try/catch`; a tela funciona sem elas.
- [x] Estados do limite com ícone e palavra, sem vermelho.
- [x] Nenhum campo novo, nenhuma regra, nenhum índice.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d269` e `#d270` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Emitir o DAS, gerar a DASN-SIMEI, emitir nota fiscal.** São serviços do governo com login
  gov.br; o Rende não entra em nome dela.
- **Guardar CNPJ, atividade e data de abertura na conta.** Pede campo e a pergunta de quem é MEI
  no cadastro; volta se o relatório for usado.
- **Aviso por e-mail no dia 15** ("seu relatório de setembro está pronto"). Spec própria, em cima
  da 044-B, quando houver medida de uso desta.
- **Simples Nacional, lucro presumido, qualquer coisa além do MEI.**

---

## Decisões desta spec que são fáceis de rejeitar

- **Indústria como padrão.** Quem é MEI como comércio (revende doce de outra) muda uma vez e o
  aparelho lembra. A maioria das confeiteiras produz.
- **As escolhas no aparelho, não na conta.** Trocar de celular perde a escolha. É o preço de não
  criar campo para uma tela que ainda não provou uso.
- **O limite contar entrada que não é venda.** Superestima, e para limite superestimar é o erro
  que não faz mal.

---

## Riscos

- **Parecer consultoria fiscal.** O Rende soma e mostra; toda frase sobre consequência legal
  termina em "fale com um contador", e o portal é a fonte.
- **O limite mudar por lei.** A constante tem data e fonte; a sessão confere.
- **Venda lançada fora de `VENDA`.** Some do relatório. A tela diz, quando há entrada de outra
  categoria no mês: "R$ 500,00 de outras entradas ficaram fora: só venda é receita."

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
