# Spec 060 · O cabeçalho dá passagem

**Tipo:** no celular, nas listas, a faixa de contexto do cabeçalho sai quando ela desce e volta
quando ela sobe; a faixa de ferramentas fica. Tocar no destino em que já está volta ao topo.
**Nenhum campo, nenhuma consulta, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica dos componentes de layout (2026-09-30).
**Depende de:** 057, se ela rodar antes: a linha do selo passa a fazer parte da faixa que sai, e
precisa continuar visível sem rede (ver 1).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d237`.

---

## Problema

**O cromo come um terço da tela.** Em 360×640, na lista de materiais: faixa de contexto (~57px),
faixa de ferramentas com a busca (~73px) e navegação inferior (56px). São 186px fixos, 29% da
altura, e a lista fica com cerca de sete linhas. No iPhone instalado a faixa ainda soma a área da
barra de status. O `#d74` já provou que cada pixel de cromo com o teclado aberto é lista a menos;
com o teclado fechado a conta é a mesma, só que menor.

Descendo pela lista, o título "Materiais" não informa nada que a pílula da navegação inferior já
não diga. O que ela usa enquanto rola é a busca e as pílulas, que estão na faixa de baixo.

**Voltar ao topo é arrastar.** Em lista longa (60 materiais), voltar à busca é arrastar a tela
inteira. No Android e no iOS, tocar na aba em que já se está rola ao topo: é o gesto que o
polegar dela já conhece de todo aplicativo.

---

## 1 · O que esta spec decide

### A faixa de contexto sai ao descer: `#d237`

- `CabecalhoPagina` ganha `recolhe?: boolean`. Passam `recolhe`: `/insumos`, `/fichas`, `/pedidos`,
  `/clientes`, `/financeiro` e `/compras`. Os editores e as contagens não: têm o voltar e o Salvar
  na faixa, e eles não podem sumir.
- Só abaixo de `lg`. No desktop o cabeçalho fica como está.
- **Descendo** mais de 8px, com a rolagem já além da altura da faixa: o `<header>` inteiro sobe
  por `transform: translateY()` até sobrar só a faixa de ferramentas e, no iPhone, a tira da área
  segura (`env(safe-area-inset-top)`) em tinta, para a barra de status não ficar sobre a lista.
- **Subindo** mais de 8px, ou perto do topo: volta.
- **Nunca recolhe** com o foco dentro do cabeçalho (a busca aberta) nem com o selo em "Salvo no
  aparelho" se a 057 já rodou: sem rede, o estado precisa estar à vista.
- A altura da faixa é medida por `ResizeObserver`, e não lida no evento de rolagem. O ouvinte de
  rolagem é `passive` e passa por `requestAnimationFrame`.
- 220ms, `ease-quart`. Com `prefers-reduced-motion`, sem transição: a faixa some e volta sem
  deslizar. Recolher é estado, e não enfeite; só o deslize sai.
- O "+" sai junto com a faixa. É o preço: subir um pouco o traz de volta, e no topo ele está
  sempre lá. Levar o "+" para a faixa de ferramentas quebraria o lugar da ação primária em todas
  as telas (`#d151`).

### Tocar na aba ativa volta ao topo

Na `NavegacaoInferior`, tocar no destino cujo `href` é exatamente o caminho atual rola a janela ao
topo (`behavior: "smooth"`, `"auto"` com movimento reduzido). Em `/fichas/contagem`, tocar em
Produtos continua navegando para `/fichas`, como hoje.

---

## 2 · Antes de tocar em código

- Conferir se o `Link` do Next para a URL atual já rola ao topo. Se rolar, a segunda parte é só o
  movimento reduzido; se não, é um `onClick` com `preventDefault`.
- Conferir que `transform` num elemento `sticky` não quebra a sangria (`@utility sangria` com
  `overflow-x: clip` no invólucro, `#d128`).
- Conferir que a folha inferior (`Painel`) aberta por cima não dispara o recolher: com `inert` no
  fundo, a rolagem da página não acontece.

---

## 3 · Escopo

- `src/components/layout/CabecalhoPagina.tsx`: `recolhe`, a medida e o ouvinte (o componente
  passa a ser `"use client"`).
- As seis telas de lista: `recolhe`.
- `src/components/layout/NavegacaoInferior.tsx`: o toque na aba ativa.

---

## 4 · Roteiro de aparelho

1. 360×640, `/insumos`: contar as linhas visíveis antes de rolar e depois de descer uma tela.
   Esperado: uma linha a mais, pelo menos.
2. Descer: a faixa sai, a busca fica grudada no topo. Subir um dedo: a faixa volta com o "+".
3. Tocar na busca com a faixa recolhida: nada pula; a faixa não volta nem sai com o teclado.
4. iPhone instalado: descendo, o relógio fica sobre a tira em tinta, nunca sobre a lista.
5. Movimento reduzido ligado: a faixa some e volta sem deslizar.
6. Editor de produto: o cabeçalho não recolhe.
7. No fim da lista de materiais, tocar no ícone de Materiais: a tela volta ao topo.
8. Desktop: nada muda.

---

## Critérios de aceite

- [ ] Faixa de contexto recolhe ao descer e volta ao subir, só no celular, só nas seis listas.
- [ ] Nunca recolhe com foco no cabeçalho.
- [ ] Sem ler layout no evento de rolagem.
- [ ] Movimento reduzido respeitado.
- [ ] Toque na aba ativa volta ao topo.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d237` escrito; `ESTADO.md` e a linha "Cabeçalho de contexto" do `DESIGN.md` atualizados.

---

## 5 · Fora de escopo

- **Título grande que encolhe** (o do iOS). Mais código pelo mesmo ganho, e anima tamanho de texto.
- **Esconder a navegação inferior ao rolar.** Ela é a saída; sumir com as duas faixas deixa a tela
  sem chão.
- **Puxar para atualizar.** O Firestore já entrega o dado ao vivo; não há o que puxar.
