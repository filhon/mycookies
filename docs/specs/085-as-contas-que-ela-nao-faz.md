# Spec 085 · As contas que ela não faz

**Tipo:** os três campos que hoje pedem uma divisão de cabeça ganham "Fazer a conta"; o preço
padrão passa a dizer o que ele faz em reais; as formas de pagamento sem taxa param de repetir
"R$ 100,00 de cada 100 reais". **Nenhum campo, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** a 083.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d286`.

---

## Problema

1. **A tela pede o que o sistema podia calcular.** "Energia por hora" diz "Some a conta de luz e
   o botijão do mês e divida pelas horas que o forno fica ligado". Ela não sabe quantas horas o
   forno fica ligado, e a divisão é dela. Fere o primeiro princípio do `PRODUCT.md`: nunca pedir
   um número que pode ser derivado. O mesmo com "Quanto vale a sua hora": ela pensa em quanto
   quer tirar no mês, e a tela pede a hora.
2. **O preço padrão não diz o que faz.** "Quero que sobre 35%" e "Outras taxas 0%" fecham numa
   faixa que só fala do arredondamento ("R$ 12,37 chega à vitrine como R$ 12,90"). Percentual
   sem reais, contra a regra do `DESIGN.md` ("45% · R$ 8,50").
3. **Ruído nas formas de pagamento.** Pix e Dinheiro dizem "R$ 100,00 de cada 100 reais": uma
   linha que não informa nada repetida duas vezes, ao lado das duas que informam.

---

## 1 · O que esta spec decide

### Fazer a conta, e o campo continua dela: `#d286`

Um botão terciário sob o campo, "Fazer a conta", abre logo abaixo dois ou três campos
efêmeros e a frase do resultado; "Usar R$ 2,40" preenche o campo de sempre e fecha. Nada do que
ela digita ali é gravado: só o resultado, no campo que já existia.

- **Sua hora**: "Quanto você quer tirar por mês" (R$) ÷ as horas do mês do campo ao lado.
  "R$ 4.000,00 em 160 h dá R$ 25,00 por hora."
- **Gás**: "Quanto custa o botijão" (R$), "Ele dura quantas semanas" e "Quantas horas o forno
  fica ligado por semana". "Um botijão de R$ 120,00 em 4 semanas de 10 h dá R$ 3,00 por hora de
  forno."
- **Energia**: "Quanto a confeitaria pesa na conta de luz do mês" (R$) ÷ as horas do mês. A dica
  diz como achar: "Se não sabe, compare a conta de um mês de muita encomenda com a de um mês
  parado."
- As divisões em `domain/custosOperacionais.ts`, centavos inteiros, com teste. Divisor zero não
  oferece "Usar".

### O preço padrão em reais

- A faixa do "Preço padrão" passa a ser um exemplo inteiro: "Um doce que custa R$ 4,00 vai para
  a vitrine por R$ 6,90. No crédito, sobram R$ 2,41 pra você." Pela mesma função de preço do
  editor, com o método, a margem ou o markup, as outras taxas, o arredondamento e a maior taxa
  ativa (`parametrosDePreco`). O arredondamento entra na frase quando muda o número ("R$ 6,87
  arredondado para R$ 6,90").
- Com markup, a frase mostra o que a maquininha leva, que é o que o markup não enxerga.

### Formas de pagamento

- Sem taxa: só "sem taxa · cai na hora", sem o valor à direita.
- Com taxa: à direita, "R$ 95,01" e embaixo "de cada R$ 100". O valor é o que fica, como hoje.

---

## 2 · Antes de tocar em código

1. Achar a função de preço que o editor usa e a que dá a sobra num pagamento.
2. Conferir em `ListaFormasPagamento` como a linha decide o que mostrar à direita.

---

## 3 · Escopo

- `domain/custosOperacionais.ts`: as três divisões, com teste.
- Um componente `FazerAConta` em `components/configuracao/`, usado pelos três campos.
- `TelaConfiguracao.tsx`: a faixa do preço padrão. `ListaFormasPagamento.tsx`: a linha sem taxa.

---

## 4 · Roteiro de navegador

1. "Fazer a conta" na hora: R$ 4.000 em 160 h, "Usar R$ 25,00" preenche o campo, e a barra de
   salvar aparece.
2. Gás com 0 semanas: sem "Usar".
3. Margem 35%, outras taxas 6%: a frase do preço padrão muda os dois números.
4. Pix: só "sem taxa · cai na hora".
5. Celular 360 px: os campos da conta empilham.

---

## Critérios de aceite

- [ ] Três "Fazer a conta", nada gravado além do campo de sempre.
- [ ] Preço padrão dito em reais, com a sobra no crédito.
- [ ] Formas sem taxa sem a linha repetida.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d286` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Potência de cada aparelho** (forno, batedeira em kW × tarifa). Mais exato, mas pede dado que
  ela não tem.
- **Guardar o que ela digitou na conta.** O resultado basta; guardar o meio é campo novo.
- **Despesas fixas item a item.** É a 086.
