# Spec 002 · Custos operacionais e precificação

**Tamanho:** duas sessões. `2A` configuração, `2B` ficha técnica. Não juntar.
**Depende de:** spec 000 executada.

## Problema

A Maynara precifica por intuição ou pelo preço da concorrente. Ela ignora embalagem, tempo
de trabalho, gás e taxa de maquininha, e por isso não sabe se vende com lucro. O Módulo 1 já
dá o custo dos insumos; falta somar o que não aparece na receita e transformar isso em preço.

A configuração vem antes da ficha porque uma ficha calculada com rateio zerado dá um preço
errado com aparência de certo, que é pior do que preço nenhum.

---

# Sessão 2A · Custos operacionais

## Escopo

Tela `/configuracao` gravando o documento único `configuracao/geral`
(`ConfiguracaoGeral`, já tipado em `src/lib/types/configuracao.ts`).

### Blocos da tela

1. **Seu trabalho** — `valorHoraTrabalho`, `horasProdutivasMes`.
2. **Energia e gás** — `custoEnergiaHora`, `custoGasHora`.
3. **Despesas fixas** — `despesasFixasMensais`. Aluguel, internet, contador, assinaturas.
4. **Formas de pagamento** — lista editável de `FormaPagamento`, com nome, tipo, taxa
   percentual, taxa fixa e prazo de recebimento.
5. **Preço padrão** — método padrão, markup ou margem, e regra de arredondamento.

### Derivado

```
custoIndiretoPorHora = round(despesasFixasMensais / horasProdutivasMes)
```

Gravado junto, conforme `DECISOES.md#d04`. Se `horasProdutivasMes` for zero, o resultado é
zero e a interface diz que sem horas produtivas as despesas fixas não entram no preço.

### Como a tela ensina

Cada bloco carrega uma frase de consequência, não de instrução. "Suas despesas fixas
custam R$ 10,00 por hora produzida" vale mais do que "informe suas despesas fixas".

Valores iniciais sugeridos e editáveis, nunca campo vazio e obrigatório: 160 horas
produtivas, PIX com taxa zero, débito 1,99%, crédito 4,99%.

## Critérios de aceite 2A

- [x] A tela carrega e grava em uma leitura e uma escrita.
- [x] `custoIndiretoPorHora` é recalculado e gravado a cada salvamento.
- [x] Formas de pagamento podem ser adicionadas, editadas e desativadas, nunca apagadas.
- [x] Cada bloco mostra o efeito do número em reais por hora.
- [x] Portão de conclusão passando.

---

# Sessão 2B · Ficha técnica e calculadora

## Escopo

Lista `/fichas`, editor `/fichas/[id]`, e o motor em `src/lib/domain/`.

### Módulos novos de domínio

`custoFicha.ts` e `precificacao.ts`. Puros, sem Firebase, cobertos por teste.

### Fórmulas

Tempo em horas: `h = tempoProducaoMinutos / 60`.

```
custoInsumos      = Σ round(custoUnidadeBaseCorrigido × quantidade)   // itens não-embalagem
custoEmbalagem    = Σ round(custoUnidadeBaseCorrigido × quantidade)   // itens de embalagem
custoComponentes  = Σ (custoUnitario do componente × quantidade)      // só em KIT
maoDeObra         = round(h × valorHoraTrabalho)
energiaGas        = round(h × (custoEnergiaHora + custoGasHora))
indireto          = round(h × custoIndiretoPorHora)

custoTotalLote    = custoInsumos + custoEmbalagem + custoComponentes
                  + maoDeObra + energiaGas + indireto
custoUnitario     = round(custoTotalLote / rendimento)
```

Precificação, onde `taxas = taxaCartaoConsiderada + outrasTaxas`:

```
MARKUP:  precoSugerido = round(custoUnitario × markup)
MARGEM:  precoSugerido = round(custoUnitario / (1 − (margemDesejada + taxas) / 100))

precoVenda = arredondarPreco(precoSugerido, regra)   // editável pela usuária
```

Verificação sobre o preço realmente praticado, que é o que a tela mostra:

```
custoTaxas    = round(precoVenda × taxas / 100)
lucroUnitario = precoVenda − custoUnitario − custoTaxas
margemReal    = lucroUnitario / precoVenda × 100
markupReal    = precoVenda / custoUnitario
```

**Guarda obrigatória.** Se `margemDesejada + taxas >= 100`, não existe preço que satisfaça:
a função devolve erro e a interface explica que a margem pedida mais as taxas passam de
100% do preço. Nunca dividir por zero ou por negativo em silêncio.

### Caso de aceite, com números

Lote de 20 cookies. Insumos com custo corrigido de 1,25, 4,00 e 3,50 centavos por grama;
saquinho a 30 centavos a unidade. Configuração: hora a R$ 25,00, energia mais gás R$ 3,00
por hora, despesas fixas de R$ 800,00 em 80 horas produtivas. Tempo de produção 90 minutos.

| Parcela            | Conta                | Centavos |
| ------------------ | -------------------- | -------- |
| Farinha            | 500 g × 1,25         | 625      |
| Chocolate          | 300 g × 4,00         | 1200     |
| Manteiga           | 200 g × 3,50         | 700      |
| Embalagem          | 20 × 30              | 600      |
| Mão de obra        | 1,5 h × 2500         | 3750     |
| Energia e gás      | 1,5 h × 300          | 450      |
| Indireto           | 1,5 h × (80000 ÷ 80) | 1500     |
| **Custo do lote**  |                      | **8825** |
| **Custo unitário** | 8825 ÷ 20            | **441**  |

Margem desejada de 30%, cartão a 4,99%:

| Resultado                                    | Valor |
| -------------------------------------------- | ----- |
| `precoSugerido`                              | 678   |
| `precoVenda` com arredondamento `CENTAVO_90` | 690   |
| `custoTaxas`                                 | 34    |
| `lucroUnitario`                              | 215   |
| `margemReal`                                 | 31,2% |
| `markupReal`                                 | 1,56  |

Esses números vão para `tests/domain/precificacao.test.ts` como estão.

### Editor

- Busca de insumo com adição por toque, quantidade na unidade compatível
  (`unidadesCompativeis`), custo da linha atualizado ao digitar.
- `tipo` alterna entre `SIMPLES` e `KIT`. Em kit, a busca oferece fichas simples em vez de
  insumos, e o bloco de insumos aceita apenas embalagem.
- Painel de preço fixo ao pé da tela, sempre visível: custo unitário, preço sugerido, preço
  praticado editável, e quanto sobra por unidade depois da maquininha.
- Selo de custo desatualizado (`custoDesatualizado`, ver `DECISOES.md#d05`) com ação
  "recalcular", que refaz o custo a partir dos insumos atuais e limpa a marca.
- Ao salvar, gravar `insumoIds` e `componenteIds`, e todos os derivados.

`react-hook-form` entra aqui, pela lista dinâmica de itens.

## Fora de escopo

Foto do produto, modo de preparo com formatação, duplicar ficha, histórico de preço de
venda, comparação com concorrente, sugestão automática de margem, impressão da ficha.

## Critérios de aceite 2B

- [x] Os números do caso de aceite batem exatamente, em teste.
- [x] Margem mais taxas acima de 100% produz erro explicado, não `Infinity`.
- [x] Rendimento zero não quebra a tela.
- [x] Ficha sem configuração operacional avisa que o rateio está zerado e leva à
      `/configuracao`.
- [x] Kit soma o custo dos componentes e não aceita outro kit como componente.
- [x] Recalcular limpa `custoDesatualizado`.
- [x] Portão de conclusão passando.
