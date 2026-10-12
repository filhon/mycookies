# Spec 142 · O que falta antes de começar

**Tipo:** a bancada passa a dizer, antes da primeira colher, se a despensa dá para as fornadas
escolhidas e qual ingrediente não dá. Leitura do que já existe (`capacidadeDaFicha`), nenhum
schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints da bancada de 2026-10-12, item 6.
**Depende de:** 138; combina com 141, mas não depende dela.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d348`.

---

## Problema

Ela escolhe 2 fornadas, separa os secos, bate a manteiga com o açúcar, e descobre na metade que
só tem 400 g de Nutella. Hoje a despensa só aparece **depois**, na folha do "Fiz a massa" ("Sai da
despensa"). O Rende sabe a resposta antes: `capacidadeDaFicha` já diz quantas fornadas dá e qual
material acaba primeiro, e a lista de produtos mostra isso numa linha (`#d94`, `#d231`).

Nenhum app de receita pago faz isso: Paprika e Mela têm despensa como lista solta, sem quantidade
contada. É a vantagem de o Rende ser o sistema da despensa e da receita ao mesmo tempo, e a bancada
é onde ela mais vale.

---

## 1 · O que esta spec decide: `#d348`

### 1.1 A frase das fornadas

Embaixo de "Rende 16 unidades" (e da massa, se a 141 já estiver), a `FraseDaCapacidade` de sempre,
na forma longa: "dá para 3 fornadas · 48 unidades · Manteiga acaba primeiro", "pelo menos 2
fornadas · Nutella sem contagem", "não dá nem uma fornada · falta Manteiga". Nenhuma frase nova.

### 1.2 O aviso na linha

- Ingrediente **contado** cujo disponível é menor que o da fornada escolhida ganha uma segunda linha
  sob o nome: `TriangleAlert` + **"tem 400 g"**, em `label`, tinta `--attention`. O triângulo e a
  palavra levam o aviso; a cor não decide sozinha (`PRODUCT.md`).
- Muda junto com as pílulas: 1 fornada sem aviso, 2 fornadas com aviso na Nutella.
- Ingrediente sem contagem, ou com o que precisa: nada na linha. A frase da 1.1 já nomeia o que não
  tem contagem, e marcar dez linhas com "sem contagem" seria ruído.
- As pílulas não travam: ela pode fazer 3 fornadas com o que tem a mais na geladeira e nunca contou.
  O sistema faz a conta; ela decide.

### 1.3 O que conta como "tem"

- `capacidadeDaFicha(ficha, fichas, insumos, consumoDesdeAContagem(fornadas, insumos), hoje)`, **sem
  `prometido`**. A capacidade da lista de produtos desconta os pedidos abertos porque responde "dá
  para vender mais?"; a bancada responde "dá para fazer agora?", e a massa de agora é quase sempre
  a dos próprios pedidos. Descontar seria contar a mesma farinha duas vezes.
- O aviso da linha compara `tem` com `precisaPorLote × fornadas`, ambos na unidade base. Sem
  consulta nova: insumos e fornadas já estão carregados pela bancada.

### 1.4 O preparo

O aviso só vai nas linhas de material direto. Material que só existe dentro de um preparo não
avisa nesta spec: com o pote contado ele nem sai da despensa (`#d346`), e a capacidade ainda não
sabe disso (o `ponytail` da 140-B). A 143 leva o aviso para dentro do preparo aberto.

---

## 2 · Escopo

- `ReceitaNaBancada.tsx`: a frase e o aviso.
- Se o cálculo do aviso por linha passar de uma comparação, uma função pura em
  `domain/producao.ts` (`faltaNaFornada(capacidade, fornadas)`) com teste.
- `DECISOES.md`: `#d348` (sem `prometido`, e por quê; sem aviso para quem não tem contagem;
  pílulas que não travam).
- `novidades.ts`: "A bancada avisa, antes de começar, o ingrediente que não dá".

---

## 3 · Roteiro de navegador

1. Manteiga contada em 300 g, receita pede 240 g: 1 fornada sem aviso; 2 fornadas, "tem 300 g" na
   Manteiga; a frase diz "dá para 1 fornada · Manteiga acaba primeiro".
2. Nutella nunca contada: nada na linha, "Nutella sem contagem" na frase.
3. Com um pedido aberto de 32 cookies: o aviso e a frase **não** mudam (sem `prometido`).
4. Registrar a fornada: voltar à bancada e a Manteiga mostra o que sobrou.
5. Offline, dois temas, 360 e 1920 px.

---

## Critérios de aceite

- [x] Frase de capacidade na bancada, sem `prometido`.
- [x] Aviso por linha só no contado que não dá, com triângulo e palavra.
- [x] Muda com as pílulas, que nunca travam.
- [x] Portão de conclusão passa; `#d348`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **"Comprar 200 g resolve"** na bancada: ela já está cozinhando; a lista de compras é outra hora.
- **Corrigir a contagem dali.** É a tela da contagem.
- **Sugerir as fornadas pela despensa.** A 146 discute sugerir pelos pedidos.
