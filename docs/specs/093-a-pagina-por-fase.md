# Spec 093 · A página por fase

**Tipo:** `/comecar` muda de ordem quando o caminho do começo acaba, os cinco passos viram uma
lista com divisórias, a página ganha índice, a cópia errada sai e o convite de instalar vira um
botão onde o navegador deixa. **Nenhum campo, nenhuma regra, nenhum índice do Firestore,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Como funciona" sobre os prints de celular e desktop de 2026-10-08.
**Depende de:** nada. Vem antes das outras quatro, porque decide onde cada seção mora.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d295`.

---

## Problema

O que os prints mostram (conta com o caminho encerrado, que é o estado de quem já usa):

1. **A parte menos útil está em cima.** Os cinco passos ocupam o primeiro terço da página no
   celular e quase metade no desktop, todos abertos, com "O que esperar" escrito para quem nunca
   abriu um produto ("Um produto de cookie abre com o custo e o preço no rodapé"). Para quem já
   fez os cinco, é o texto que ela nunca mais vai ler, antes de tudo o que ela veio buscar.
2. **Dois textos dizem a mesma coisa.** A descrição do cabeçalho ("Os cinco passos do começo…
   Esta página fica aqui") e o parágrafo logo embaixo ("Você já encerrou o caminho… Os cinco
   passos ficam aqui como referência").
3. **Cinco cartões iguais empilhados.** Número, título, dois parágrafos, link, cinco vezes.
   É a grade de cartões que o `DESIGN.md` recusa, numa página em que as outras listas já são
   lista com divisórias.
4. **3.585 px no celular, 4.266 no desktop, cinco seções, nenhum índice.** Quem volta na
   terceira semana com uma pergunta sobre a internet rola a página inteira para chegar lá.
   Central de ajuda de produto pago tem "Nesta página" fixo; esta não tem nada.
5. **A cópia está errada em três lugares.**
   - "Quatro telas que não estão no menu" lista **cinco**, e duas delas (Compras e Clientes)
     **estão** no menu: na barra lateral do desktop e no ⋯ do celular (`#d240`).
   - O selo mostrado como exemplo, "Sem conexão, salvando no aparelho", não existe mais. O de
     verdade diz "Salvo no aparelho" (`SeloSincronizacao`) e mora na linha da descrição de cada
     tela (`#d234`), e não "no alto da tela". A página ensina a reconhecer um selo que ela
     nunca vai ver.
   - Travessão no parágrafo do encerrado.
6. **Instalar é uma caça ao ícone.** No Chrome, no Edge e no Android o navegador entrega o
   evento `beforeinstallprompt`, e a página manda procurar "o ícone de instalar no fim da
   barra de endereço". Aplicativo web pago instala num botão.

---

## 1 · O que esta spec decide: `#d295`

### A ordem por fase

- **Caminho aberto:** como hoje no topo ("Onde você está" e os cinco), depois as seções que
  ficam.
- **Caminho encerrado:**
  - Descrição do cabeçalho, uma só: "O que cada tela faz por você, o que acontece sem
    internet, e onde mora cada coisa." O parágrafo "Você já encerrou o caminho…" sai.
  - Ordem: a cadeia do dinheiro, o que mais tem aqui, quando não tem internet, instalar, e
    **por último** "Os cinco passos do começo".
  - Os cinco, no encerrado, sem `porque` nem `oQueEsperar`: uma linha por passo, o número no
    distintivo de contorno, o título, e o chevron. A linha inteira é o link para `passo.href`.
    Descrição da seção: "A ordem que chega mais rápido a um preço, se você for mostrar o
    sistema para alguém."

### Os cinco numa lista só

- Nos dois estados, os cinco moram numa `<ol>` com divisórias em `--surface`, raio 14px e
  filete `--border`, como a cadeia e o "O que mais tem aqui". Cada `BlocoPasso` deixa de ser
  `<li>` com borda própria e vira linha da lista.
- No caminho aberto o comportamento de abrir e fechar não muda (celular um por vez, desktop os
  cinco abertos, `#d69`). Só a superfície muda.

### O índice

- O índice de âncoras de `TelaConfiguracao` (o da faixa de ferramentas, com `aria-current` na
  parte em leitura, `#d283`) sai para `components/layout/IndiceDaPagina.tsx` e é usado pelas
  duas telas. Mesma API para três ou para sete âncoras.
- Em `/comecar`, na faixa de ferramentas: "O dinheiro · Outras telas · Sem internet ·
  Instalar · Os cinco". "Instalar" some com o app instalado, junto com a seção. No caminho
  aberto, "Os cinco" vem primeiro.
- No celular a faixa rola na horizontal (`overflow-x-auto`, `scroll-snap`), a âncora ativa
  rolada à vista. Pílulas de 44px, como na Configuração.

### A cópia

- "O que mais tem aqui", descrição: "Cinco telas fora do caminho de todo dia, e que são
  justamente as que mais poupam trabalho seu."
- O selo de exemplo passa a ser **o componente de verdade**: a parte visual do estado "salvo
  no aparelho" de `SeloSincronizacao` é exportada (por exemplo `SeloSalvoNoAparelho`) e
  `QuandoNaoTemInternet` a desenha. Mudou o selo, mudou a ajuda.
- "Quando o sinal cai, este selo aparece no alto da tela" vira "Quando o sinal cai, este selo
  aparece embaixo do título da tela:".
- O travessão sai (o parágrafo some no encerrado, e nenhum texto novo usa travessão).

### Instalar num toque

- Um módulo pequeno, `lib/utils/instalacao.ts`, escuta `beforeinstallprompt` (com
  `preventDefault`, guardando o evento) e `appinstalled` desde o carregamento do app, e expõe o
  estado a `useSyncExternalStore`. O ouvinte precisa estar de pé antes de ela abrir
  `/comecar`, porque o evento dispara uma vez, cedo.
- Com o evento guardado: **"Instalar o Rende"** (secundário, `Download`) chama `prompt()`. As
  instruções de hoje somem. Aceito, a seção some por `appinstalled`.
- Sem o evento (Safari, Firefox, ou o Chrome que já recusou): as instruções de hoje, e no
  iPhone o ícone de compartilhar (`Share`, 16px, `--ink-muted`) dentro da frase, onde está
  escrito "botão de compartilhar". Ninguém acha um botão pelo nome.
- Continua sem estado gravado e sem user-agent (`#d71`).

---

## 2 · Antes de tocar em código

1. Conferir que o índice de `TelaConfiguracao` sai para `layout/` sem mudar o comportamento
   dela (a âncora acende pela metade de cima da tela).
2. Conferir onde o ouvinte de `beforeinstallprompt` entra mais cedo sem virar efeito de tela:
   import no shell autenticado (`(app)/layout`) é o candidato.
3. Conferir se `SeloSincronizacao` separa o visual do estado (ou se a separação é a mudança).

---

## 3 · Escopo

- `TelaComecar.tsx`, `BlocoPasso.tsx`, `QuandoNaoTemInternet.tsx`, `InstalarNaTela.tsx`.
- `layout/IndiceDaPagina.tsx` (novo, extraído) e `TelaConfiguracao.tsx` usando ele.
- `layout/SeloSincronizacao.tsx`: exportar a peça visual.
- `lib/utils/instalacao.ts` (novo).

---

## 4 · Roteiro de navegador

1. Conta encerrada, celular: a cadeia é a primeira seção; os cinco estão no fim, uma linha
   cada, e o toque leva à tela do passo.
2. Conta nova: "Onde você está" e os cinco no topo, numa lista só; o de agora aberto.
3. O índice leva a cada seção e acende a que está em leitura, nos dois tamanhos.
4. Chrome no Android e no desktop, sem instalar: "Instalar o Rende" abre a instalação do
   navegador; depois de aceitar, a seção e a âncora somem.
5. Safari no iPhone: as instruções com o ícone de compartilhar.
6. O selo de exemplo é igual ao que aparece embaixo do título com o modo avião ligado.
7. Escuro: lista, índice e selo legíveis.

---

## Critérios de aceite

- [x] No encerrado, os cinco no fim e compactos; o parágrafo repetido saiu.
- [x] Os cinco numa lista com divisórias nos dois estados.
- [x] Índice compartilhado com a Configuração.
- [x] "Cinco telas", o selo de verdade, "embaixo do título".
- [x] "Instalar o Rende" onde o navegador deixa.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d295` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Números dela na cadeia.** 094.
- **Perguntas, busca e "Fale com a gente".** 095.
- **Novidades.** 096.
- **Marcar o que ela já usa.** 097.
- **"Ver quanto custa um cookie" para quem faz bolo.** O título do passo 1 nasce da biblioteca
  de partida (`#d109`), e trocá-lo é decisão do caminho do começo, não desta página.
