# Spec 168 · A página que vai direto

**Tipo:** a `/conheca` para de dizer a mesma conta quatro vezes antes de dizer outra coisa. A
abertura em tela cheia sai (revoga a `#d383`); no celular o cartão do topo sai, e a faixa do custo
faz o papel dele; a calculadora fecha o raciocínio com o preço do plano; a página diz, perto do
topo, que não é só de cookie.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica da `/conheca` de 2026-10-14 (a mesma da 167). Nos prints do celular, entre
o primeiro quadro e a calculadora a visitante vê: a abertura (~7 s, a conta do cookie), o `h1`
(R$ 4,41 e R$ 8,50), o cartão (R$ 4,41 e R$ 8,50, sobram R$ 3,19) e a faixa (R$ 4,41 e R$ 8,50,
sobram R$ 3,66). São duas telas e meia de rolagem para uma ideia. As páginas que vendem bem por
assinatura dizem a promessa uma vez, provam uma vez e passam à próxima objeção.
**Depende de:** 040, `#d382`, `#d383`.
**Aprovações pedidas:** nenhuma. A abertura foi feita hoje, fora de spec; tirar é decisão de quem
conduz o projeto, e esta spec a recomenda pelo motivo abaixo.
**Decisões a registrar:** duas, numeradas na sessão (a que revoga a `#d383`; a do cartão no
celular e da linha do plano na calculadora).

---

## Problema

1. **A abertura bloqueia a primeira leitura de quem mais importa.** Ela aparece na primeira visita
   de cada sessão, que é a visitante fria que veio de um link no Instagram ou no WhatsApp. São
   ~7 s, ou achar o "Pular", para ver uma conta que a tela seguinte repete. A `#d383` diz que ela
   sai "se a conversão cair", mas a página não mede conversão (`#d180` conta visitas, `metricas`
   conta contas): a condição nunca vai disparar. O LCP medido é o texto do topo, mas o que a
   visitante vê é a cortina.
2. **No celular, o cartão do topo e a faixa dizem a mesma coisa em sequência**, com duas sobras
   rosa diferentes (R$ 3,19 no preço praticado, R$ 3,66 no sugerido) a uma rolagem de distância.
   No desktop eles ficam em telas diferentes e o cartão é a coluna direita do topo: lá fica.
3. **A calculadora para um passo antes da venda.** Com o preço de hoje e as vendas do mês, ela
   diz "são R$ 120 a mais pra você no preço sugerido". Não diz o que isso paga. É a conta de
   retorno que toda página de assinatura faz, e aqui ela já está pronta.
4. **A página parece de cookie.** Topo, faixa e calculadora são cookie, e "Serve pra bolo,
   salgado, pão?" é a quinta dúvida, no fim. A confeiteira de bolo de pote sai antes de chegar lá.

---

## 1 · O que esta spec decide

### A abertura sai

- Saem `src/components/site/abertura.ts`, o `<script>` dela em `page.tsx`, o `FaixaDoCusto
abertura` do topo da página, o ramo `abertura` dentro de `FaixaDoCusto.tsx` (o ritmo de 60%, o
  "Pular", o Esc, o `sessionStorage`, o atributo no `<html>`) e o bloco
  `html[data-abertura]` / `.abertura` de `globals.css`.
- Fica a faixa no corpo da página, como a `#d382` a fez.
- A decisão nova revoga a `#d383` e diz: a página não esconde a si mesma no primeiro quadro;
  movimento de ambiente na `/conheca` acontece no corpo, sem tirar a leitura (`DESIGN.md`,
  Ambiente, "o texto do topo chega pronto").
- `DESIGN.md` § Signature, item 3, perde a menção à abertura, se houver; § Ambiente fica.

### O cartão do topo, só no desktop

- `LuzDaJanela` com a `ContaAberta` ganha `hidden lg:block` (ou o equivalente no wrapper). No
  celular, o topo é o `h1`, a linha, o botão e "Leva um minuto, sem cadastro"; a faixa vem logo
  depois e mostra a composição.
- O riscado do `h1` continua dizendo o preço praticado (`#d255`). O "sobram R$ 3,19 no preço de
  R$ 8,00" fica só no desktop: no celular a consequência é a da faixa.
- A âncora "A conta" (`#conta`, na `ContaAberta`) só existe no desktop, como o próprio menu.

### A linha do plano na calculadora

- `CalculadoraDaPorta` ganha `mensalDoPlano?: Centavos`. A `/conheca` passa
  `precos?.ESSENCIAL?.mensal`; a página do preço do cookie não passa nada e nada muda lá.
- Com `aMaisNoMes >= mensalDoPlano`, depois de "são R$ X a mais pra você no preço sugerido",
  uma frase: **"O Essencial custa R$ 29 por mês."** Só o fato, sem "paga-se sozinho": a
  conta ela faz, a decisão é dela (`PRODUCT.md`, regra de ouro).
- Com `aMaisNoMes` menor que o plano, ou sem preço do Stripe (`#d174`), nada.

### Não é só cookie

- Abaixo do subtítulo de "Agora a conta do seu cookie", a frase passa a: "Troque o que for
  diferente na sua cozinha e ponha o preço que você cobra hoje. Aqui a conta é de cookie; no app,
  de bolo, brigadeiro, salgado e o que mais render unidades."
- A dúvida "Serve pra bolo, salgado, pão?" sobe para segunda, logo depois de "Preciso saber de
  contabilidade?".

### O menu do desktop

Os rótulos dizem para onde vão: "O exemplo" (`#conta`), "Calcule o seu" (`#sua-conta`),
"Depois do preço", "Quem usa", "Preço", "Dúvidas".

---

## 2 · Escopo

- `src/app/conheca/page.tsx`, `src/components/site/FaixaDoCusto.tsx`,
  `src/components/site/abertura.ts` (sai), `src/app/globals.css`,
  `src/components/site/CalculadoraDaPorta.tsx`.
- `DESIGN.md`, se citar a abertura; `DECISOES.md`; `AUDITORIA-DE-PAGINAS.md` (a nota que pede
  para olhar a abertura).

## Fora de escopo

- Trocar o cookie do topo por outro doce, ou alternar doces no `h1`: o específico vende mais que
  o genérico, e a frase é a da marca (`#d187`).
- Brigadeiro e bolo na calculadora: dependem da biblioteca ter as receitas (`#d185`). Spec
  própria, se o roteiro mostrar gente de bolo saindo.
- Mudar a margem do exemplo (40% + 5%) para igualar a da calculadora (35% + 4,99%): `#d186`.
- Medir conversão. Se um dia houver, a abertura pode voltar como teste A/B, não como padrão.

---

## 3 · Roteiro de navegador

1. Aba anônima, `/conheca` a 390 × 844: nenhuma cortina; o `h1` no primeiro quadro; rolando, a
   faixa logo depois do botão, sem o cartão.
2. A 1280: o cartão na coluna direita, como antes; o menu com os rótulos novos.
3. Calculadora: preço de hoje R$ 6,00, 100 por mês: a frase do "a mais" e, se passar de R$ 29,
   "O Essencial custa R$ 29 por mês". Com 10 por mês, a frase do plano some.
4. Sem chave do Stripe no ambiente: a calculadora funciona, sem a frase do plano.
5. `/como-calcular-o-preco-do-cookie`: a calculadora igual a antes.
6. Lighthouse mobile, três rodadas antes e depois: CLS ~0, LCP no texto do topo; anotar o TBT.
