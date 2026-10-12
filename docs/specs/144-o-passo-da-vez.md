# Spec 144 · O passo da vez

**Tipo:** o modo de preparo na bancada deixa de ser uma lista para rolar e passa a dizer onde ela
está, com a quantidade de cada ingrediente no próprio passo e um aviso quando o texto traz número
escrito à mão de uma fornada só. Nenhum schema, nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica dos prints da bancada de 2026-10-12, itens 8 e 9.
**Depende de:** 137, 138.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d350`.

---

## Problema

1. **Onde eu parei?** Seis passos, dois riscados. Os riscados ficam no lugar e o próximo tem a
   mesma cara de todos os outros. A meio metro, ela relê do começo.
2. **"Junte a farinha."** Quanto? A quantidade está na outra lista, lá em cima no celular, e ela
   rola, pesa e rola de volta. NYT Cooking, Crouton e Mela mostram a quantidade dentro do passo.
3. **O número que não escala.** Quem cola a receita do caderno escreve "junte 560 g de farinha". Em
   2 fornadas a lista diz 1.120 g e o passo continua dizendo 560 g. É o único lugar da bancada
   que mente com a escala, e ela não tem como saber.

---

## 1 · O que esta spec decide: `#d350`

### 1.1 O passo da vez

- É o primeiro passo não marcado. Fundo `--brand-100` (o realce de "opção escolhida" do
  `DESIGN.md`) e, acima do texto, **"Agora"** em `micro` 600, tinta `--brand-as-ink`. A palavra leva
  o sentido; o fundo ajuda.
- Mesmo tamanho dos outros passos: crescer o da vez faria a lista pular a cada marca.
- Marcar um passo leva o próximo para a área visível: `scrollIntoView({ block: "nearest" })`, suave,
  e instantâneo com `prefers-reduced-motion`. Só quando ele estiver fora da tela.
- Tudo marcado: nenhum "Agora".

### 1.2 A quantidade no passo

- `mencoesNoPasso(passo, ingredientes)` em `src/lib/domain/preparo.ts`, pura, com teste. Devolve o
  passo em pedaços: texto, ou texto com o `rotulo` escalado do ingrediente que ele cita.
- **A regra de casar**, em texto normalizado (minúscula, sem acento, por `chaveDeBusca`, a que
  já gera o `nomeBusca`):
  1. o nome inteiro do ingrediente ("farinha de trigo");
  2. senão, a primeira palavra do nome com 4 letras ou mais, aceitando o plural com "s", **só se
     nenhum outro ingrediente começar pela mesma palavra**. "Farinha", "Manteiga", "Nutella", "ovo"
     casam; "Açúcar" não casa sozinho, porque há o cristal e o mascavo, e só "açúcar mascavo" casa.
- Só a primeira menção de cada ingrediente em cada passo. Na tela, logo depois da palavra, a
  quantidade em 600 tabular: "Junte a farinha **1.120 g** e misture". Sem caixa, sem pílula: é
  texto lido, não botão.
- Na dúvida, não casa. Um passo sem quantidade é o de hoje; um passo com a quantidade errada é
  pior que hoje.

### 1.3 O número escrito à mão

- Com fornadas diferentes de 1, passo cujo texto traz quantidade com unidade (`560 g`, `1 kg`,
  `200 ml`, `2 xícaras`, `1 colher`; expressão no domínio, com teste) ganha embaixo, em `label`:
  `Info` + **"A quantidade escrita aqui é de 1 fornada."** Tom informativo, não atenção: não é erro
  dela.
- A quantidade da 1.2 continua aparecendo, escalada. O texto dela nunca é reescrito: adivinhar
  qual número é ingrediente e qual é temperatura ("180 graus") seria pior (`#d343`, consequência).

---

## 2 · Escopo

- `domain/preparo.ts`: `mencoesNoPasso`, o detector de quantidade escrita, e os testes (os dois
  açúcares, plural de ovo, nome inteiro antes da palavra, "180 graus" que não é quantidade).
- `ReceitaNaBancada.tsx`: 1.1 a 1.3.
- `DECISOES.md`: `#d350` (a regra de casar e o "na dúvida, não casa"; o texto nunca reescrito).
- `novidades.ts`: "Na bancada, cada passo diz quanto pôr e onde você parou".

---

## 3 · Roteiro de navegador

1. Preparo com "Bata a manteiga com os açúcares", "Junte os ovos", "Adicione a farinha de trigo":
   "manteiga **240 g**", "ovos **2**", "farinha de trigo **560 g**"; "açúcares" sem quantidade.
2. 2 fornadas: as quantidades dos passos dobram.
3. Passo "junte 560 g de farinha" com 2 fornadas: o aviso aparece; com 1 fornada, não.
4. Marcar o passo 1: "Agora" desce para o 2; com o 2 fora da tela, ele sobe até aparecer.
5. Movimento reduzido: sem rolagem suave. Dois temas, 360 e 1920 px.

---

## Critérios de aceite

- [ ] Passo da vez com "Agora" e a rolagem.
- [ ] Quantidade escalada no passo pela regra da 1.2, testada.
- [ ] Aviso da quantidade escrita com fornadas ≠ 1, testado.
- [ ] Portão de conclusão passa; `#d350`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Um passo por tela** (modo apresentação, tela inteira). O "Agora" resolve sem esconder o resto;
  se ela pedir, é outra spec.
- **Cronômetro no passo.** É a 145, que reabre uma decisão da 138.
- **Reescrever o número do texto.**
