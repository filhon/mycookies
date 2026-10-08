# Spec 097 · O que você ainda não abriu

**Tipo:** "O que mais tem aqui" passa a saber quais das cinco telas ela já usa, e mostra
primeiro as que ela ainda não abriu. **Nenhum campo, nenhuma regra, nenhuma dependência;
índice do Firestore só se o passo 2 pedir.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Como funciona" sobre os prints de celular e desktop de 2026-10-08.
**Depende de:** 093 (a cópia da seção). Funciona sem ela.
**Aprovações pedidas:** nenhuma, salvo índice novo no passo 2.
**Decisões a registrar:** `#d299`.

---

## Problema

"O que mais tem aqui" é igual para a conta que conta a despensa todo domingo e para a que
nunca abriu a contagem. As cinco linhas têm o mesmo peso, e quem já usa três precisa ler as
três para achar as duas que não conhece.

Serviço pago acompanha o que a cliente ainda não descobriu, porque é ali que ela deixa de
achar que o produto vale o que custa. A frase de cada linha aqui já é boa (é o momento da
semana, `#d70`); falta a página saber a quem está falando.

A nota da meta tem o mesmo problema: diz "Definida na primeira semana, seria um palpite" para
quem já tem meta há três meses.

---

## 1 · O que esta spec decide: `#d299`

### O fato de cada tela

Um fato por tela, perguntado à coleção que tem a resposta, com `limit(1)`, como o `#d67`.
Candidatos (o passo 2 confere campo e índice de cada um):

| Tela                 | Já usa quando                                |
| -------------------- | -------------------------------------------- |
| Foto da nota         | existe lançamento com `notaChave`            |
| Contagem da despensa | existe material com `estoqueContadoEmISO`    |
| O que está pronto    | existe ficha com `estoqueProntoContadoEmISO` |
| Clientes             | existe cliente não arquivada                 |
| Lista de compras     | **sem fato confiável**: fica sem estado      |
| A meta do mês        | existe a meta do mês corrente                |

Tela sem fato **nunca** é dita como "não usada": um selo inventado é pior do que nenhum
(`#d69`). As consultas só existem nesta tela e morrem com ela.

### A seção

- Em cima, **"Que você ainda não abriu"**: as telas com fato negativo e as sem fato, com a
  linha inteira de hoje (ícone, nome, frase, momento).
- Embaixo, **"Já fazem parte da sua semana"**: as de fato positivo, compactas, uma linha cada
  com o ícone, o nome e o chevron, sem frase e sem momento.
- Todas abertas: o grupo de cima some, a descrição vira "As cinco já fazem parte da sua
  semana." e as cinco aparecem compactas.
- Carregando, ou sem rede e sem cache: a lista de hoje, inteira, sem grupo. Nada de esqueleto
  numa lista que já sabe se desenhar.
- Sem contagem, porcentagem ou barra: não é progresso, é o que ela ainda não conhece
  (`PRODUCT.md`, sem gamificação).

### A meta

- Com meta no mês corrente, a nota da meta vira uma linha compacta no grupo de baixo: "A meta
  do mês", chevron, `/financeiro`. Sem meta, a nota de hoje.

---

## 2 · Antes de tocar em código

1. Conferir o nome de cada campo da tabela e se a consulta com `!= null` (ou o equivalente)
   roda sem índice composto. A que pedir índice: preferir um fato mais barato a um índice
   novo; se não houver, pedir aprovação.
2. Conferir como o Caixa lê a meta do mês, para usar a mesma leitura.

---

## 3 · Escopo

- `OQueMaisTem.tsx` e um gancho novo em `lib/hooks/` para os fatos.

---

## 4 · Roteiro de navegador

1. Conta real: as que ela usa embaixo e compactas; as outras em cima, com frase e momento.
2. Contar a despensa pela primeira vez e voltar: a contagem desceu.
3. Conta nova: as cinco em cima, como hoje, e a nota da meta inteira.
4. Modo avião com a tela nunca aberta: a lista de hoje, sem grupo.

---

## Critérios de aceite

- [ ] Dois grupos pelo fato de cada tela; tela sem fato nunca dita como não usada.
- [ ] A nota da meta compacta quando há meta.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d299` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Recursos dentro das telas** (Pix na forma de pagamento, sinal, cardápio, folha). As
  perguntas da 095 e as novidades da 096 cuidam disso.
- **Sugerir na tela Hoje o que ela não usa.** A Hoje é de leitura (`DESIGN.md`).
