# Spec 138 · A receita na bancada

**Tipo:** uma tela de leitura do produto para usar durante a produção: letra grande, quantas
fornadas, ingredientes e passos que se marcam com um toque, tela que não apaga, e "Fiz a massa" no
fim já com o número de fornadas. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, item 6.
**Depende de:** 137 (o modo de preparo).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d343`.

---

## Problema

Na bancada, o único caminho para a receita é o editor: campos de 48 px que o polegar sujo de massa
edita sem querer, quinze linhas de ≈ 90 px cada, a tela apagando a cada 30 segundos, e o "Salvar"
âmbar no topo como se ela estivesse ali para mudar alguma coisa. Para fazer fornada dupla ela
multiplica 560 g por 2 de cabeça.

O "modo cozinha" é o recurso que Meez, Paprika e o NYT Cooking cobram: escala, letra de ler a meio
metro, marcar o que já foi, tela acesa. O Rende já tem as peças: `useTelaAcesa` (usado na lista do
mercado), `PainelFornada` aceita `unidades`, e a fornada aceita fração (`lotes`).

---

## 1 · O que esta spec decide: `#d343`

### 1.1 A rota

- `/fichas/[id]/bancada`, fora de `(coluna)`, sem navegação inferior (como os editores, `#d152`):
  cabeçalho com voltar para o produto e o nome. Só `SIMPLES` com itens; kit ou ficha vazia volta
  para o editor.
- Entrada: no editor, a faixa da produção ("Fez a massa?") ganha **"Abrir na bancada"** como botão
  secundário, ao lado do "Fiz a massa". A frase da faixa passa a "Vai fazer a massa? A bancada
  mostra a receita em letra grande e desconta a despensa no fim."
- Só leitura: nenhum campo editável, nenhum "Salvar".

### 1.2 O que a tela tem, de cima para baixo

1. **Quantas fornadas**: pílulas de filtro ½ · 1 · 2 · 3 (44 px, `DESIGN.md` § Pílula), a 1
   escolhida, e embaixo "Rende 16 unidades" mudando com a escolha. A escolha fica em
   `sessionStorage` por ficha, com `try/catch`.
2. **Ingredientes**: lista com divisórias, uma linha por item, alvo inteiro, 56 px de altura
   mínima. Quantidade em `heading` 600 tabular, já multiplicada e na unidade em que foi digitada
   (560 g × 2 = 1.120 g; 1.120 g **não** vira 1,12 kg: ela pesa em gramas). Nome em `body`.
   Tocar marca: `Check` em `--positive` e o texto vai a `--ink-muted` riscado. A embalagem fica fora
   da lista (não vai na massa), num rodapé de uma linha: "Na embalagem: saquinho, papel, adesivo".
3. **Como se faz**: `passosDoPreparo` (137) numerado, `body` com 1.75 de entrelinha; tocar marca o
   passo como os ingredientes. Sem preparo: "Este produto ainda não tem o modo de preparo.
   Escreva no produto e ele aparece aqui." com link.
4. **Fiz a massa**: botão primário de 52 px no pé (o único âmbar da tela). Abre o `PainelFornada`
   com `unidades = rendimento × fornadas`. Depois de registrar, volta para o produto.

### 1.3 O que não persiste

As marcas de feito vivem no estado da tela e em `sessionStorage`, nunca no Firestore: são da
fornada de agora, e uma marca esquecida de ontem seria um ingrediente pulado hoje. Ao registrar a
fornada, as marcas somem.

### 1.4 Tela acesa

`useTelaAcesa(true)` enquanto a rota está aberta. Sem suporte, nada acontece e nada avisa.

### 1.5 Escala

`escalarItens(itens, fator)` em `src/lib/domain/`, pura, com teste: a quantidade em unidade base
vezes o fator, de volta na unidade em que foi digitada, arredondada para o passo da unidade (g e ml
inteiros; `un` com meio: 2 ovos × ½ = 1 ovo; 3 ovos × ½ = "1 ½").

---

## 2 · Escopo

- A rota e um componente `ReceitaNaBancada` em `src/components/fichas/`.
- `escalarItens` e o teste.
- `FormularioFicha.tsx`: o botão e a frase da faixa.
- `DECISOES.md`: `#d343` (rota e não folha: ela fica ali vinte minutos e volta pelo gesto; marcas
  fora do Firestore; gramas não viram quilos).
- `novidades.ts`: "A receita abre em letra grande na bancada".

---

## 3 · Roteiro de navegador

360 px com o celular a meio metro, dois temas, e 1920 px:

1. Cookie Cacau com Nutella → "Abrir na bancada": 1 fornada, 560 g de farinha, 16 unidades.
2. 2 fornadas: 1.120 g de farinha, 4 ovos, "Rende 32 unidades".
3. ½: 1 ovo; 280 g de farinha.
4. Marcar farinha e o passo 1; sair e voltar na mesma aba: marcados. Fechar a aba: limpos.
5. Tela acesa por 2 minutos sem tocar (Android e iOS instalados).
6. "Fiz a massa" com 2 fornadas: o painel abre com 32 unidades; registrar desconta a despensa em
   dobro; as marcas somem.
7. Offline: tudo funciona, a fornada fica "Salvo no aparelho".

---

## Critérios de aceite

- [ ] Rota de leitura, sem campo editável.
- [ ] Escala ½ a 3, testada, nas unidades digitadas.
- [ ] Marcas fora do Firestore.
- [ ] Tela acesa; "Fiz a massa" com as unidades escaladas.
- [ ] Portão de conclusão passa; `#d343`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Escala por unidades desejadas** ("quero 40 cookies"). ½ a 3 cobre a fornada real; o campo livre
  vem se ela pedir.
- **Temporizador.** O do forno e o do celular existem.
- **Bancada a partir da lista de produtos ou de um pedido.** Esperar o uso.
- **Controle por voz.**
