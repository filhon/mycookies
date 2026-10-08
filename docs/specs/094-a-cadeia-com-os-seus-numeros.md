# Spec 094 · A cadeia com os seus números

**Tipo:** "A cadeia do dinheiro" deixa de ser explicação genérica e passa a seguir **um produto
dela**, do pacote que ela compra até o que entrou no caixa do mês, com os números que o sistema
já gravou. **Nenhum campo, nenhuma regra, nenhum índice composto, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Como funciona" sobre os prints de celular e desktop de 2026-10-08.
**Depende de:** 093 (a cadeia como primeira seção no encerrado). Funciona sem ela.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d296`.

---

## Problema

A cadeia é a melhor ideia da página e a mais fraca na execução. Seis elos dizem "o pacote de
farinha", "o doce pronto", "o que entrou no mês" em abstrato, e nenhum número aparece. É a
página em que o produto explica **por que** ela cadastra tudo, e ela não vê o resultado do que
cadastrou.

Produto pago que vende "você vai saber quanto ganha" mostra o número dela, não o conceito.
O `PRODUCT.md` diz a frase que o Rende existe para dizer ("Este doce te custa R$ 3,41 e você
deveria cobrar R$ 8,50"), e a página que explica o produto nunca a diz.

O `#d70` proíbe **número de exemplo** nesta página porque ele envelhece e passa a contradizer
a tela. Número lido da conta não envelhece: é o mesmo que a tela mostra, no mesmo instante.

---

## 1 · O que esta spec decide: `#d296`

### Qual produto

Por função pura nova, com teste, em `domain/` (arquivo a escolher no passo 2):
`produtoDaCadeia(resumo)` devolve os ids de ficha do `ResumoMensal.produtos`, ordenados por
`quantidade` (desempate por `receita`).

- A tela lê o agregado do mês corrente; se `produtos` estiver vazio, o do mês anterior, por id.
- Lê as fichas candidatas por id, uma de cada vez, até três, e fica com a primeira `SIMPLES`
  não arquivada.
- Sem agregado com produto, ou sem `SIMPLES` entre as três: `fichas` com
  `arquivado == false` e `tipo == "SIMPLES"`, `limit(1)`.
- Da ficha, o item com maior `custoLinha` é **o material da cadeia**; lido por id.

São até seis leituras de documento, só nesta tela, e nenhuma assinatura de coleção.

### Os seis elos, com número

A frase de hoje fica. Embaixo dela, quando o dado existe, **uma linha com o número**, em
`body`, números tabulares 600, `R$` menor em `--ink-muted` (`DESIGN.md`, Números):

| Elo                               | Linha                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O que você compra                 | "Você paga R$ 5,49 no pacote de 1 kg de **Farinha de trigo**."                                                                                            |
| Quanto custa cada grama           | "Sai a R$ 0,55 a cada 100 g, já contando a perda." (unidade da base do material; o mesmo formatador do preço por unidade da conferência da nota, `#d292`) |
| Quanto custa o doce pronto        | "Um **Cookie tradicional** custa R$ 3,41, num lote de 24." Com `custoDesatualizado`, "Custo por refazer" com o triângulo e a palavra, em tom de atenção.  |
| Por quanto vale a pena vender     | "Você vende por R$ 8,50, e sobram **R$ 4,20** pra você." Sobra negativa: sinal, cor negativa, `trending-down` e "falta R$ …".                             |
| O que foi combinado com a cliente | "Em outubro: 12 encomendas pagas, com 38 Cookie tradicional." (`qtdPedidos`, `produtos[id].quantidade`)                                                   |
| O que de fato entrou no mês       | "Entraram R$ 1.230,00 no caixa em outubro." (`entradas`)                                                                                                  |

- O ponto âmbar marca **a sobra do elo 4**, e só ela: é o número que decide (`DESIGN.md`,
  Signature). Nenhum outro âmbar na seção.
- Elo sem dado (sem agregado, sem material, preço zerado) fica só com a frase, como hoje. A
  cadeia nunca mostra "R$ 0,00" inventado nem esconde um elo.
- Título da seção com produto: "A cadeia do dinheiro, no seu Cookie tradicional". Descrição:
  "De um pacote que você compra até o que entrou no caixa, com os números de hoje." Sem
  produto, título e descrição de hoje.
- O link de cada elo continua o da tela; os dois elos do produto apontam para
  `/fichas/{id}`, e os dois do material para a linha dele em Materiais, se a URL deixar (passo
  2), ou para `/insumos`.

### Carregando e sem rede

- Esqueleto só na linha do número, nunca na frase: a frase já chega pronta.
- Sem rede e sem cache, as linhas não aparecem e a cadeia é a de hoje. Nenhum aviso: a cadeia
  continua certa sem número.

---

## 2 · Antes de tocar em código

1. Achar o gancho do agregado do mês por id que o Caixa e a Hoje já usam, e o formatador de
   "R$ … o quilo" da 090.
2. Conferir que `arquivado == false` com `tipo == "SIMPLES"` dispensa índice composto (duas
   igualdades). Se pedir índice, cair para `arquivado == false` e filtrar na tela, com
   `limit(5)`.
3. Conferir se Materiais e Produtos abrem um item pela URL.

---

## 3 · Escopo

- `CadeiaDoDinheiro.tsx` e um gancho novo em `lib/hooks/` para os documentos da cadeia.
- `produtoDaCadeia` em `domain/`, com teste (vazio, empate, ordem).

---

## 4 · Roteiro de navegador

1. Conta real: o produto é o mais vendido do mês; os números batem com o editor do produto, o
   material e o Caixa.
2. Dia 1 do mês: a cadeia usa o mês anterior e diz o nome dele.
3. Conta nova, sem ficha: a cadeia de hoje, sem linha de número.
4. Produto com sobra negativa: ícone, cor e palavra.
5. Modo avião, tela já aberta antes: números do cache; nunca aberta: a cadeia sem número.

---

## Critérios de aceite

- [x] Os seis elos com a linha do número quando o dado existe, e sem ela quando não existe.
- [x] `produtoDaCadeia` com teste.
- [x] Um ponto âmbar, na sobra.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d296` escrito (citando o `#d70`); `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Escolher outro produto para seguir.** Se a pergunta aparecer, é um seletor de produto, e
  não esta sessão.
- **A faixa de composição na cadeia.** Ela mora no editor do produto (`DESIGN.md`).
