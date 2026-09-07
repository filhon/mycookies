# Spec 009 · O teclado aberto e a barra do sistema

**Tipo:** conserto de cromo. Nenhum módulo de domínio novo, nenhuma rota nova, nenhum campo
novo, nenhum centavo movido. Um componente de `ui/`, uma variante de CSS e duas cores.
**Tamanho:** uma sessão. Se parecer duas, alguma coisa cresceu além do que está escrito aqui.
**Origem:** relato de uso no celular, com print das duas telas — `/fichas/nova` e
`/pedidos/novo` com o teclado aberto — e da barra de notificação do app instalado no Android.
Não é dívida da tabela de `ESTADO.md`; é a primeira coisa que a operação real devolveu.
**Depende de:** nada. Toca só apresentação, e não encosta em `src/lib/domain/` nem em
mutação nenhuma. Roda antes ou depois da **5B** sem mudar o risco dela — e melhora a 5B, que
é justamente digitar número no celular.
**Aprovações pedidas:** duas cores do manifesto e uma extração de componente compartilhado
que toca cinco telas. Estão listadas ao fim.

---

## Problema

### 1. Com o teclado aberto, a tela some

`layout.tsx:42` declara `interactiveWidget: "resizes-content"`. É a escolha certa — o Android
encolhe o viewport de layout quando o teclado sobe, e por isso todo elemento `fixed` sobe
junto em vez de ficar atrás do teclado. Mas o que sobe junto é **tudo**, e o sistema tem três
faixas presas ao pé e ao topo:

| Faixa              | Onde                                                                                                       | Altura aproximada |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| Cabeçalho grudento | [FormularioFicha.tsx:528](../../src/components/fichas/FormularioFicha.tsx#L528) — voltar + título + Salvar | ~96 px            |
| Resumo flutuante   | [PainelPreco.tsx:156](../../src/components/fichas/PainelPreco.tsx#L156)                                    | ~210 px           |
| Navegação inferior | [NavegacaoInferior.tsx:14](../../src/components/layout/NavegacaoInferior.tsx#L14)                          | ~56 px            |

Medido no print de `/fichas/nova`, com o teclado aberto sobram cerca de 490 px de viewport.
Dos cinco sextos que não são teclado, o cabeçalho toma ~20%, o resumo ~43% e a navegação
~10%. **Para o formulário que ela está preenchendo sobram menos de 15% da tela** — no print,
a única linha de conteúdo visível é o rótulo "O que você está montando", e o campo que ela
acabou de tocar está fora de vista.

Cada uma das três faixas tem uma razão boa, e nenhuma delas vale enquanto o teclado está
aberto:

- **A navegação inferior não serve para nada durante a digitação.** Ninguém troca de módulo
  no meio de um campo, e o teclado já cobre metade dela com sugestões de texto.
- **O resumo é a razão de a tela existir** (`quanto sobra pra mim?`), mas ele tem duas partes
  e só uma delas muda a cada tecla: os números. A frase embaixo — "Sobram R$ 1,80 por unidade
  depois da maquininha" — é prosa, ocupa duas linhas e diz em palavras o que os números acima
  já dizem em número.
- **O cabeçalho tem o Salvar**, que precisa ficar. O link "← Fichas técnicas" acima dele não:
  o botão físico de voltar do Android existe, e ele fecha o teclado antes de sair da tela.

**Não é problema de duas telas.** A conta `4.5rem + safe-area` — a altura da navegação
inferior — está copiada em **nove** lugares: cinco rodapés fixos e quatro botões flutuantes.
Consertar `/fichas/nova` e `/pedidos/novo` deixando os outros sete para trás é garantir que
o rodapé de `/compras`, o de `/insumos/nota`, o de `/insumos/contagem` e a barra de salvar de
`/configuracao` fiquem flutuando sobre um vão de 72 px no dia em que a navegação sumir.

### 2. A barra de notificação sai clara num app escuro

`manifest.ts:14` declara `theme_color: "#f3eee3"`. É o creme do tema claro, e é **uma cor
só**: o manifesto não tem media query, e não existe um `theme_color` para cada tema.

`layout.tsx:43-46` declara o par certo em `<meta name="theme-color">`, creme no claro e
`#231a1a` no escuro. No app instalado no Android, ele não ganha: o print mostra a barra
creme com o aparelho em tema escuro e o app inteiro renderizando escuro. Quem está mandando
é o manifesto — o Android assa o `theme_color` dentro do WebAPK na hora da instalação, e a
partir daí a barra de status é decoração de janela do sistema operacional, não do documento.

O resultado é uma faixa branca de 36 px em cima de uma tela quase preta, com os ícones do
sistema em preto porque o Android escolheu o contraste pela cor assada.

---

## O que esta spec decide antes de qualquer código

São três decisões. Cada uma vira um `D` em `DECISOES.md`: `#d74`, `#d75` e `#d76`.

### 1. O sinal de "teclado aberto" é a altura, e é CSS

O jeito exato de saber que o teclado subiu é `window.visualViewport`, com um listener de
`resize` e um estado. Esta spec **não** faz isso, porque o `resizes-content` que já está
declarado transforma o teclado em altura de viewport: quando ele sobe, `@media (max-height:)`
dispara sozinho, sem JavaScript, sem listener, sem hidratação e sem um estado que possa
divergir do que está na tela.

Nasce uma variante do Tailwind chamada `apertado`:

```css
@custom-variant apertado (@media (max-height: 560px) and (pointer: coarse));
```

**Por que 560 px.** Celular Android em retrato tem 640 px de altura em CSS no pior caso e
780 a 900 no caso comum. Com o teclado aberto, cai para a faixa de 350 a 530. O limiar mora
no vão entre as duas faixas, e não em cima de nenhuma delas.

**Por que `pointer: coarse`.** Sem isso, uma janela de navegador baixa no desktop entraria na
regra e a tela de desktop começaria a esconder coisa sem motivo. A regra é do dedo.

**O que a variante não sabe.** Ela não sabe distinguir "teclado aberto" de "aparelho
deitado", porque as duas coisas são a mesma altura. No app instalado isso não acontece:
`manifest.ts:12` declara `orientation: "portrait"`, e a janela não gira. No navegador em
retrato deitado a navegação inferior some — e ali a barra de endereço do próprio navegador
continua sendo a saída. É a única ponta solta desta decisão, e ela é aceita.

**O que a variante nunca faz:** encolher alvo de toque. Nenhuma regra `apertado:` mexe em
`h-`, em `min-h-` ou na utilidade `toque`. O piso de 44 px vale com o teclado aberto
exatamente como vale fechado; o que some é espaço morto e prosa, nunca área de dedo.

`ponytail:` o limiar de 560 px é heurística. `visualViewport` mede exato e custa um listener
com estado; troque só se algum aparelho de verdade cair do lado errado.

### 2. Em espaço apertado a frase some — o alerta, não

O resumo perde a linha de prosa quando o teclado abre. Mas **só quando a prosa é boa
notícia.**

"Sobram R$ 1,80 por unidade depois da maquininha" é uma confirmação: ela repete em palavras
o que os três números acima já mostram, e a usuária pode lê-la quando fechar o teclado.
"Neste preço você perde R$ 2,10 por unidade" é uma correção, e esconder uma correção enquanto
a pessoa digita o número errado é esconder exatamente na hora em que ela importa.

A regra, então, é do tom e não da tela: **a linha com `tom: "atencao"` fica; as outras
somem.** Isso vale para os quatro rodapés que têm linha de prosa, e é o que preserva a
invariante do projeto de que todo estado negativo carrega ícone ou texto — não adianta o
ícone estar num elemento com `display: none`.

Em `PainelPedido` a regra soma um segundo gatilho: `descontoLimitado` mantém a linha viva
mesmo quando o tom do lucro é positivo, porque ela conta um dado que a usuária não pediu (o
desconto entrou menor do que ela digitou).

### 3. A barra do sistema tem uma cor só, e ela é a da marca

O manifesto tem um slot de cor, o Android assa esse slot no WebAPK, e nenhuma media query
alcança lá dentro. Portanto o valor precisa estar **certo nos dois temas**, e não certo em um
deles.

O valor é `#5e1725` — o vinho que já é o fundo do ladrilho em
[icon.svg:2](../../src/app/icon.svg#L2). Não é cor nova, não entra em `globals.css` e não
vira token: é a cor do ícone, e a barra passa a ser a moldura dele.

Escuro nos dois temas quer dizer ícones do sistema em branco nos dois temas, sempre com
contraste. E quer dizer que a resposta à pergunta "de que app é esta barra?" é a mesma de
manhã e à noite.

**O par de `<meta name="theme-color">` com media query some junto.** Manter os dois é manter
dois donos para o mesmo pixel, com a barra combinando com a marca no app instalado e com a
superfície na aba do navegador. Uma cor, um lugar, nenhuma divergência para descobrir daqui
a seis meses.

---

## Escopo

### A variante: `src/app/globals.css`

Uma linha nova, junto das outras utilidades de marca, com o comentário da decisão 1 acima
dela. Se o `@custom-variant` na forma curta não compilar no Tailwind 4.3, a forma longa com
`@slot` é equivalente:

```css
@custom-variant apertado {
  @media (max-height: 560px) and (pointer: coarse) {
    @slot;
  }
}
```

O `build` do portão de conclusão é o que decide qual das duas fica.

### O componente novo: `src/components/ui/RodapeFixo.tsx`

A string

```
fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 px-4 lg:bottom-0 lg:left-60 lg:px-8
```

está copiada em cinco arquivos, e o cartão de dentro — `mx-auto w-full max-w-5xl
overflow-hidden rounded-lg border border-line bg-surface shadow-overlay lg:mb-4` — em quatro.
`RodapeFixo` passa a ser o dono das duas, mais a regra nova `apertado:bottom-0`, e recebe
`className` para a única variação que existe (a barra de `/configuracao`, que é `lg:hidden`).

Os cinco que passam a usá-lo:

| Arquivo                                                                                 | O que muda além do wrapper                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [PainelPreco.tsx](../../src/components/fichas/PainelPreco.tsx)                          | linha de prosa ganha a regra do tom                           |
| [PainelPedido.tsx](../../src/components/pedidos/PainelPedido.tsx)                       | linha de prosa ganha a regra do tom + `descontoLimitado`      |
| [RodapeCompras.tsx](../../src/components/compras/RodapeCompras.tsx)                     | linha de prosa ganha a regra do tom                           |
| [RodapeContagem.tsx](../../src/components/estoque/RodapeContagem.tsx)                   | linha de prosa some no `apertado` (é sempre neutra)           |
| [RodapeNota.tsx](../../src/components/notas/RodapeNota.tsx)                             | linha de prosa ganha a regra do tom                           |
| [TelaConfiguracao.tsx:646](../../src/components/configuracao/TelaConfiguracao.tsx#L646) | `<RodapeFixo className="lg:hidden">`, perde a moldura própria |

A barra de `/configuracao` **não** ganha `apertado:hidden`: ela é a ação primária da tela, e a
tela é toda de campos.

### A navegação inferior

`apertado:hidden` no `<nav>` de
[NavegacaoInferior.tsx:14](../../src/components/layout/NavegacaoInferior.tsx#L14). É a maior
devolução de espaço da spec por uma classe só.

### Os quatro botões flutuantes

`apertado:hidden` em cada um — `/insumos`, `/fichas`, `/pedidos`, `/financeiro`. Não é só
questão de espaço: os quatro sentam a 4,5 rem de uma navegação que sumiu, e "novo insumo" não
é o que ela quer enquanto digita na busca da lista.

### O espaço reservado no pé

Três reservas somam com o teclado aberto e viram vão morto:

- `AppShell.tsx:12` — `pb-24` vira `apertado:pb-4`.
- `FormularioFicha.tsx:555` — `pb-44` vira `apertado:pb-32`.
- `FormularioPedido.tsx:626` — `pb-48` vira `apertado:pb-32`.

### O cabeçalho dos dois editores

Nos dois `<header>` grudentos ([FormularioFicha.tsx:528](../../src/components/fichas/FormularioFicha.tsx#L528)
e [FormularioPedido.tsx:592](../../src/components/pedidos/FormularioPedido.tsx#L592)):

- O `<Link>` de voltar ganha `apertado:hidden`.
- O `pb-3 pt-3` ganha `apertado:py-2`.
- O `mt-1` da linha do título ganha `apertado:mt-0`.

O `<h1>` e o botão Salvar não mudam de tamanho. O título é o que diz em qual ficha ela está,
e o Salvar é a ação da tela.

### As duas cores

- `manifest.ts:14` — `theme_color: "#5e1725"`, com o comentário dizendo que é a cor do
  ladrilho de `icon.svg` e que o Android a assa no WebAPK.
- `layout.tsx:43-46` — o array com media query vira `themeColor: "#5e1725"`.

`background_color: "#f3eee3"` **não muda**: é a tela de abertura, o ícone precisa dela para
ter contra o que aparecer, e nenhum print reclamou dela.

---

## Caso de aceite

Não há caso de aceite numérico: esta spec não move um centavo, não escreve documento e não
tem função pura nova. `npm test` continua com o mesmo número de testes que tinha antes — se
ele mudar, alguma coisa entrou aqui que não devia.

O que substitui o teste é um roteiro medido, num aparelho Android de verdade.

### Roteiro A · o teclado

1. Abrir `/fichas/nova` no celular e tocar no campo "Nome da ficha".
2. **A navegação inferior sumiu.** O resumo encostou no teclado, sem vão.
3. **O resumo mostra Custo da unidade, Sugerido e o campo de preço.** A frase amarela
   "Diga quantas unidades saem de um lote" **continua lá**, porque é alerta.
4. Preencher rendimento e itens até o preço ficar acima do custo. A frase vira "Sobram R$ …",
   e a partir daí **ela some com o teclado aberto** e reaparece quando ele fecha.
5. Digitar um preço abaixo do custo. A frase "Neste preço você perde R$ …" **aparece mesmo
   com o teclado aberto**, com o triângulo.
6. Contar as linhas de formulário visíveis entre o cabeçalho e o resumo. Antes: uma. A meta
   é **três ou mais**.
7. O botão Salvar continua alcançável e continua com 48 px de altura.
8. Repetir 1 a 7 em `/pedidos/novo`, incluindo um desconto maior que o subtotal: a frase do
   desconto limitado fica visível com o teclado aberto.
9. Abrir `/compras`, `/insumos/nota`, `/insumos/contagem` e `/configuracao` e tocar em
   qualquer campo. **Nenhum dos quatro rodapés flutua sobre um vão.**
10. Em `/insumos`, tocar na busca: o botão flutuante some, e volta ao fechar o teclado.
11. No desktop, com a janela em 1280×800: nada mudou em tela nenhuma.

### Roteiro B · a barra

1. `npm run build` e publicar.
2. **Desinstalar o app da tela de início e instalar de novo.** O WebAPK assa o `theme_color`
   na instalação; sem reinstalar, o Android continua mostrando o creme velho por até um dia,
   e o roteiro mediria a instalação antiga.
3. Abrir o app com o aparelho em tema escuro: a barra de notificação está vinho, com os
   ícones do sistema em branco.
4. Trocar o aparelho para tema claro e abrir de novo: a barra continua vinho.
5. Se a barra ainda estiver creme, `chrome://webapks` no aparelho mostra o `theme_color`
   assado e a data da última atualização — é ali que se confirma se o problema é a cor ou a
   instalação.

---

## Fora de escopo

- **iOS.** `appleWebApp.statusBarStyle: "default"` deixa a barra clara no iPhone instalado. O
  conserto é `black-translucent`, que faz o conteúdo passar por baixo da barra e obriga um
  `padding-top` de área segura em todo cabeçalho grudento do sistema. É outra spec, e o
  relato foi de Android.
- **A tela de abertura.** `background_color` continua creme, pelo motivo já dito.
- **`visualViewport` em JavaScript.** A decisão 1 diz quando trocar.
- **Rolar o campo focado para a vista.** O Android já faz isso; se depois desta spec ele
  ainda não fizer, aí sim vira `scrollIntoView`, e vira outra spec.
- **Encolher o cabeçalho das telas de lista** (`CabecalhoPagina`). Lista não é tela de
  digitação; a busca é um campo só e o resultado dela aparece logo abaixo.
- **Qualquer mudança em `src/lib/domain/`.** Zero. Se um arquivo de domínio aparecer no
  `git diff` desta sessão, ela saiu do escopo.

---

## Decisões desta spec que são fáceis de rejeitar

- **Esconder a navegação inferior.** Quem achar que navegação nunca some tem um argumento
  real. O contra-argumento é que ela já está meio coberta pela barra de sugestões do teclado,
  e que a alternativa — manter 56 px de destino inalcançável — custa mais do que ela vale.
- **Um limiar de altura em vez do `visualViewport`.** Um número mágico num media query é
  exatamente o tipo de coisa que envelhece mal. Está marcado com `ponytail:` e com o gatilho
  de troca escrito.
- **Uma cor de barra em vez de duas.** Perde-se a barra que acompanha a superfície do tema.
  Ganha-se a única configuração que o WebAPK do Android respeita de fato.

---

## Riscos

- **O `@custom-variant` pode não compilar na forma curta.** Risco de sintaxe, não de desenho;
  a forma longa está escrita acima e o `build` decide em trinta segundos.
- **A extração do `RodapeFixo` toca seis arquivos que hoje funcionam.** É a maior superfície
  da sessão e não tem teste automatizado nenhum por trás — `npm test` cobre só o domínio. O
  passo 9 do roteiro A existe por isso, e ele não é opcional.
- **O limiar de 560 px pode pegar um aparelho pequeno em retrato sem teclado.** Um celular de
  640 px em CSS com a fonte do sistema aumentada pode chegar perto. Se acontecer, a tela
  aparece sem navegação inferior e sem a frase do resumo — degradação feia, não quebra. O
  conserto é o `visualViewport` da decisão 1.
- **A barra pode continuar creme depois do deploy.** Quase sempre é WebAPK velho, e o passo 2
  do roteiro B é o que separa isso de um defeito de verdade.

---

## Aprovações pedidas

1. **`theme_color` do manifesto muda de `#f3eee3` para `#5e1725`.** É mudança visível na tela
   de início e na barra do sistema de um app já instalado, e exige reinstalar para valer.
2. **O par de `<meta name="theme-color">` com media query vira um valor único.** A barra
   deixa de acompanhar o tema do aparelho, de propósito.
3. **Cinco telas passam a compartilhar `RodapeFixo`.** Nenhuma muda de comportamento, mas
   cinco arquivos que funcionam hoje são editados de uma vez.

Nada de schema muda, nenhuma regra de segurança muda, nenhum índice novo é preciso e nenhuma
dependência entra.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o número de
testes **inalterado**. Depois: `docs/ESTADO.md` atualizado e `#d74`, `#d75` e `#d76`
registrados em `docs/DECISOES.md`.

O roteiro A é a prova desta spec e depende de aparelho na mão. O roteiro B depende de deploy.
Nenhum dos dois cabe no portão automatizado, e por isso os dois estão escritos passo a passo:
o que não dá para automatizar precisa pelo menos ser impossível de esquecer.
