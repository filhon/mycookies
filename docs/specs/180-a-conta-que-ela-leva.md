# Spec 180 · A conta que ela leva

**Tipo:** a `CalculadoraDasParcelas` ganha, embaixo do resultado, "Mandar essa conta pra mim": o
WhatsApp (ou a folha de compartilhar do celular) com as parcelas, o preço e a sobra dela em texto,
e um link que reabre a página **com os números dela já postos**. Os números vão no endereço; nada
é guardado no aparelho nem no servidor.
Nenhum campo gravado, nenhuma regra, nenhuma dependência. Duas funções puras novas, com teste.
**Tamanho:** uma sessão.
**Origem:** a crítica das quatro páginas de doce de 2026-10-15. O que se paga no assunto guarda a
conta: o app freemium (Lucro na Confeitaria guarda até seis receitas de graça), a planilha do
Hotmart (fica no computador dela), as calculadoras de negócio que mandam o resultado por e-mail ou
PDF (CalcStack, Calconic). A calculadora do Rende esquece tudo ao fechar a aba (`#d393`: "nada é
guardado"). Ela fez a conta à noite, com calma, e na hora de responder a cliente no WhatsApp, no
dia seguinte, o número sumiu, e o Rende junto.
**Depende de:** 176. Com a 178, vale também nas três páginas de doce.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Decisões a registrar:** uma, numerada na sessão (a conta no endereço, e não no aparelho).

---

## 1 · O que esta spec decide

### A conta no endereço

- `enderecoDaConta(entrada, unidade): string` e `lerContaDoEndereco(texto): { entrada, unidade } |
null` em `domain/calculadora.ts`. O parâmetro é `?conta=` com os números separados por `-`, na
  ordem: versão (`1`), as cinco parcelas em centavos, margem, taxas, o preço de hoje em centavos
  (`0` quando vazio) e a unidade pelo nome (`UnidadeDeVenda`: "unidade", "cento", "quilo", "pote"). Margem e taxas com ponto decimal
  ("4.5"); nada de vírgula no endereço.
- `lerContaDoEndereco` devolve `null` para qualquer coisa fora disso: versão desconhecida, campo
  faltando, número negativo, parcela acima de R$ 100.000,00, margem ou taxas acima de 100. Nunca
  lança.
- A calculadora lê `window.location.search` uma vez, depois de montar (`useEffect`; nada de
  `useSearchParams`, que tiraria a página do estático). Conta válida: os campos dela; inválida ou
  ausente: o exemplo, como hoje. Com a prop `doce` da 178, a unidade da página vence a do endereço.
- O `canonical` de cada página já existe: o endereço com `?conta` não vira página nova para o robô.

### O texto que vai

`textoDaConta(conta, entrada, unidade): string`, puro, no mesmo arquivo. A forma, com os números
saindo de `contaDasParcelas`:

```
O preço do meu cento, pela conta do Rende:
custa R$ X (ingredientes R$ A, embalagem R$ B, minha hora R$ C, gás R$ D, fixas R$ E).
Cobrar R$ P, com 40% de margem e 5% de taxas: sobram R$ S pra mim.
```

Com o preço de hoje preenchido, mais uma linha: "Hoje cobro R$ H e sobram R$ W." (ou "e perco
R$ W por venda", quando perde). Margem + taxas ≥ 100%: a linha do preço vira "Margem e taxas
passam de 100%: falta ajustar." A sessão passa a redação pela `humanizer`.

### O botão

- Embaixo do resultado, dentro da calculadora: `MandarAPagina` com `rotulo` "Mandar essa conta pra
  mim" (prop nova, com "Mandar pelo WhatsApp" como padrão, para a página de doces sair igual), o
  texto de `textoDaConta` e o `url` absoluto da página **com** `?conta=`. O comentário do `url` em
  `MandarAPagina` passa a dizer "sem `#`".
- Secundário: o primário da tela continua o do convite.
- Uma linha `label` `ink-muted` embaixo: "O link reabre esta conta com os seus números."
- Sem custo nas parcelas (o estado "Ponha o custo de cada parcela"), o botão não aparece.
- Sem JavaScript, o botão leva a conta do exemplo, que é o que a tela mostra.

---

## 2 · Antes de tocar em código

1. Ler `CalculadoraDasParcelas.tsx`, `MandarAPagina.tsx`, `#d393` e `#d395`.
2. `/impeccable` com registro **brand**; `PRODUCT.md` e `DESIGN.md`.
3. Conferir o tamanho: o endereço inteiro abaixo de 200 caracteres com os maiores números válidos.

---

## 3 · Escopo

- `domain/calculadora.ts`: `enderecoDaConta`, `lerContaDoEndereco`, `textoDaConta`.
- `tests/domain/calculadora.test.ts`: ida e volta pelo endereço para os quatro exemplos e para uma
  conta com decimal na margem; dez endereços inválidos dando `null`; o texto do brigadeiro do
  exemplo, inteiro, com e sem o preço de hoje, e com margem + taxas ≥ 100.
- `CalculadoraDasParcelas.tsx`: a leitura do endereço e o botão.
- `MandarAPagina.tsx`: a prop `rotulo`.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px e 1280px.

1. Mudar duas parcelas e a margem, mandar, abrir o link recebido: a calculadora abre com os
   números dela, e o resultado é o mesmo.
2. No celular, a folha do aparelho; no desktop, o WhatsApp Web com o texto e sem número.
3. Um `?conta=` adulterado à mão abre o exemplo, sem erro no console.
4. O texto no WhatsApp: valores com vírgula, `R$`, nenhum `NaN`, nenhum número negativo onde não
   cabe.
5. Um primário na tela: o do convite.
6. Conferir se o Vercel Web Analytics separa a visita com `?conta`; anotar no `ESTADO.md` o que ele
   mostra.

---

## Critérios de aceite

- [x] A conta vai e volta pelo endereço, presa no teste.
- [x] Endereço inválido nunca quebra a página.
- [x] Nada gravado no aparelho nem no Firestore.
- [x] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [x] Decisão registrada; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **No endereço, e não no `localStorage`.** O aparelho guarda só para ela e só naquele navegador; o
  link vive na conversa dela, abre em qualquer aparelho e pode ir para a sócia ou para a irmã. E
  não pede outra forma de rascunho ao lado do `#d189`.
- **WhatsApp, e não e-mail.** Pedir e-mail na página é cadastro antes do teste, e o recado vai para
  onde ela já conversa com as clientes. Mandar para si mesma é uma conversa que o WhatsApp tem.
- **Os números visíveis no link.** Qualquer um que receba vê o custo dela. É ela quem manda, e o
  texto da mensagem já diz os mesmos números.

---

## Fora de escopo

- A conta da `CalculadoraDaPorta` (cookie, por receita): ela já tem o rascunho do `#d189`.
- Levar a conta para o cadastro. O produto do app tem custo só pela ficha; uma conta por parcelas
  pede decisão de schema, e por isso aprovação.
- Imprimir a conta ou baixá-la em planilha (o "Fora de escopo" da 177 continua).
- O botão de mandar a página nas quatro páginas de doce (a 177 espera a medição).
