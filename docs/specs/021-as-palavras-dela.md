# Spec 021 · As palavras dela

**Tipo:** vocabulário, a quarta e última spec da fase 0 do `docs/saas/ROADMAP.md`, mais a
auditoria das quatro telas fora do menu. **Nenhum identificador de código, nenhuma rota, nenhum
caminho do Firestore, nenhum campo.** O que muda é o que está escrito na tela — e só onde ela
disser que a palavra é outra.
**Tamanho:** uma sessão. As respostas trocam **duas palavras** (insumo → material, ficha →
produto) e deixam uma em aberto; são ~150 strings relidas, nenhuma linha de lógica. Se a seção
4.1 (as portas) encher a sessão, a 4.2 (o corpo) vira 021B e a sessão diz isso em vez de correr.
**Origem:** `#d113`. "A navegação fala 'insumo' e 'ficha técnica', quatro telas só se acham
pelo guia." A 018 pôs o preço no primeiro minuto, a 019 pôs o caminho na ordem do valor, a 020
tirou dos formulários o que o primeiro preço não precisa. O que sobra na frente dela é o nome
das coisas — e nome de coisa não se decide em sessão de código.
**Depende de:** as cinco respostas da Maynara, **recebidas em 2026-09-16** (seção 1.1, por
texto, não gravadas). As da segunda confeiteira ainda não foram pedidas; entram em `#d117`
quando existirem e não mudam o resultado da fase 0 (seção 2). **Não existe versão desta spec
em que a sessão escolhe a palavra** — a única linha em aberto (o que está pronto) fica como está
até ela decidir.
**Aprovações pedidas:** nenhuma. **Uma decisão a registrar**, `#d117`, que é a tabela da
seção 1.1 — inclusive as linhas em que nada muda.

---

## Problema

O `PRODUCT.md` manda falar a língua da confeitaria, e os textos longos já falam: "quanto sobra
pra você", "rende", "o custo real dela". O que não fala é o **nome das coisas**, que é o que
ela lê primeiro, no menu de baixo, antes de qualquer frase:

1. **"Insumos" e "Fichas técnicas" são as duas primeiras palavras do menu**, e são de
   sistema. "Insumo" é palavra de planilha de custo; "ficha técnica" é de curso de confeitaria
   — pode ser a dela, pode não ser. Ninguém perguntou. As specs 018 a 020 reescreveram frases
   inteiras e deixaram os dois substantivos no lugar de propósito, porque cada uma disse "é a
   021".
2. **A mesma coisa tem dois nomes dentro do sistema.** O menu diz "Fichas técnicas"; o bloco
   da 020, o caminho da 019 e a descrição do cabeçalho dizem "receita" — e o filtro de
   `/fichas` diz "Receitas" querendo dizer só as que não são kit. É uma pergunta em voz alta
   esperando para acontecer: "receita e ficha são a mesma coisa?" (O par "Pedidos" no menu e
   "encomenda" no corpo parecia o mesmo problema e não é: a resposta 4 diz que os dois são
   dela.)
3. **A palavra mora em ~150 lugares** (`rg -i "insumo|ficha" src/` em texto de tela: 42
   arquivos), e não nos quatro que o roadmap nomeia. Trocar só o menu criaria o terceiro nome.
4. **A premissa de que as quatro telas fora do menu "só se acham por acaso ou pelo guia"
   deixou de ser verdade** entre a 8B (quando o comentário de `OQueMaisTem.tsx` foi escrito) e
   a 13D: `/pedidos` tem "O que comprar" no cabeçalho, `/insumos` tem "Ler uma nota", `/fichas`
   tem "O que está pronto" e, numa conta que apertou a biblioteca, a faixa "Contar a despensa".
   O que pode estar errado é a **palavra na porta**, não a falta de porta. Uma porta falta de
   verdade, e é uma só (seção 5).

**O que esta spec entrega:** as cinco respostas gravadas em `#d117`; "insumo" → "material" e
"ficha" → "produto" em todo lugar em que são mostradas, e em nenhum lugar em que são código;
"receita" com um sentido só; a tabela das quatro telas com a porta de cada uma, e a porta que
faltava.

**O que esta spec não entrega:** nenhuma palavra escolhida por nós. "Fornada", "pedido" e
"caixa" ficam porque ela disse que ficam; "O que está pronto" fica porque ela ainda não disse.

---

## O que sai da frente de quem está começando (`#d113`)

- **Um nome que ela não reconhece, em cada tela que ainda não abriu.** É o que a fase 0 mede:
  perguntas em voz alta. "O que é insumo?" é uma pergunta; "Materiais" não é.
- **O segundo nome da mesma coisa.** Onde a tela diz "receita" e o menu diz "ficha", sobra um
  só, "produto" — e "receita" passa a querer dizer uma coisa só.
- **Nada entra.** Nenhuma tela, nenhum campo, nenhuma faixa. A seção 5 acrescenta um botão
  numa caixa de confirmação que só existe com uma lista de compras aberta e depois de um toque
  em "Fechar esta lista" — quem está começando não chega lá.

---

## 1 · As cinco perguntas

Feitas **antes** de a pessoa abrir o app naquele dia, e sem a tela na frente. Uma por vez, na
ordem abaixo, à Maynara e depois à segunda confeiteira, separadamente. **Sem oferecer
alternativa** ("é insumo ou ingrediente?") — a pergunta é sobre a coisa, e a resposta é a
palavra que sair. Anotar ao pé da letra, com o plural que ela usar.

| #   | A pergunta, sobre a coisa e não sobre a tela                                                     | Hoje o sistema diz                                                 |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1   | "Farinha, chocolate, saquinho, etiqueta — quando você fala disso tudo junto, você chama de quê?" | **Insumos** (menu), "insumo" (o item), "despensa" (onde fica)      |
| 2   | "A receita com quanto ela custa e por quanto você vende — isso é o quê pra você?"                | **Fichas técnicas** (menu), "ficha" (o item), "receita" (no corpo) |
| 3   | "O que você já assou e está guardado, ou a massa no congelador — como você fala disso?"          | "fornada" (o fato), **"O que está pronto"** (a contagem), "pote"   |
| 4   | "Quando uma cliente pede cinquenta pra sábado, isso é o quê?"                                    | **Pedidos** (menu), "pedido" (o item), "encomenda" (no corpo)      |
| 5   | "O dinheiro que entrou e saiu no mês — como você chama isso?"                                    | **Caixa** (menu), "lançamento" (o item)                            |

Duas coisas a anotar além da palavra: **o nome do lugar**, quando ela der um ("despensa",
"armário", "freezer", "pote") — o menu nomeia a lista, e a lista pode ter o nome do lugar; e
**o que ela chama de "receita"**, porque o sistema já usa a palavra em dois sentidos (a ficha,
e a ficha que não é kit) e a resposta 2 decide qual dos dois fica.

**A gravação é a segunda fonte.** Toda palavra que ela ler em voz alta com pergunta ("o que é
rende?", "perda de quê?") entra na tabela de `#d117` como linha própria, com a tela em que
apareceu. "Rende" e "perda" não têm pergunta antes porque são rótulo de campo, não nome de
coisa — se travarem na gravação, travaram, e a tabela registra.

### 1.1 As respostas — a tabela de `#d117`

Maynara, 2026-09-16, por texto. A coluna da segunda confeiteira fica vazia até ser perguntada.

| #   | Maynara disse                                                                                                                                                                       | 2ª  | Fica                                                                                                                                                                                                                                                                                             | Sai                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 1   | "Material, ou ingrediente, mas como são ingredientes e itens diversos, acredito que material faça mais sentido."                                                                    | —   | **material** / **materiais**. Menu "Materiais". "Despensa" continua sendo o lugar.                                                                                                                                                                                                               | insumo, insumos                       |
| 2   | "Produto."                                                                                                                                                                          | —   | **produto** / **produtos**. Menu "Produtos". "Receita" fica no sentido estreito (o produto que não é kit): filtro "Receitas · Kits", bloco "A receita" da 020, "uma receita de cookie" da 019.                                                                                                   | ficha, ficha técnica, fichas técnicas |
| 3a  | "Pensando de forma mais geral, para outros públicos e produtos, acredito que ação de assar e guardar é fornada."                                                                    | —   | **fornada**. Nada muda.                                                                                                                                                                                                                                                                          | —                                     |
| 3b  | "O cookie que eu já assei é enviado para entrega, pois asso sob demanda. Já a massa no congelador não tenho um nome muito bom ou definido: poderia ser pronta entrega? Ou estoque?" | —   | **Em aberto.** "O que está pronto" fica até a gravação. Os dois candidatos dela têm problema que ela precisa ver: "pronta entrega" não descreve massa crua no congelador, que é o que ela tem; "estoque" já é o rótulo de "Estoque atual" no material, e seria a mesma palavra para duas coisas. | —                                     |
| 4   | "Encomenda ou pedido. Acho que pedido fica melhor, não é?"                                                                                                                          | —   | **pedido**. O menu já diz. "Encomenda" no corpo (019, estado vazio de `/pedidos`, guia, WhatsApp) **fica**: é palavra dela também, e sinônimo que ela usa não é segundo nome.                                                                                                                    | —                                     |
| 5   | "Caixa."                                                                                                                                                                            | —   | **caixa**. Nada muda.                                                                                                                                                                                                                                                                            | —                                     |

Duas leituras que a sessão faz, e não ela: em 3b, "ponta entrega" foi lido como "pronta
entrega"; e "Materiais" no menu de baixo tem nove letras, uma a mais que "Insumos" — cabe, mas
o passo 1 do roteiro confere no aparelho.

---

## 2 · O que esta spec decide

### A palavra vem dela, perguntada antes da tela, e a resposta é registrada mesmo quando é a mesma — `#d117`

`#d117` é uma tabela: pergunta, resposta da Maynara, resposta da segunda confeiteira, palavra
que fica, e onde ela mora. **"Nada muda" é uma linha da tabela, não a ausência dela.** É o que
separa "perguntamos e ela disse insumo" de "não perguntamos" — e o roadmap, a fase 1 e as cinco
a oito entrevistas do beta partem dessa tabela, não do menu.

### Duas confeiteiras, uma palavra: a da Maynara, na fase 0

Quando as duas divergirem, fica a da Maynara, e a divergência fica escrita em `#d117`. A fase 0
é medida nela; a segunda confeiteira é o primeiro dado da fase 1, e as entrevistas do beta
reabrem a palavra com cinco a oito vozes em vez de duas. Quando as duas rejeitarem a palavra de
hoje com palavras diferentes, o mesmo: a dela, e o registro.

### Uma palavra muda em todo lugar em que é mostrada, e em nenhum lugar em que é código

A régua é mecânica. **Muda:** texto JSX, `string` em prop (`titulo`, `descricao`,
`aria-label`, `placeholder`, `rotulo`), `metadata.title` das páginas, o atalho do
`manifest.ts`, `CATALOGO_DO_COMECO`, `FUNCIONALIDADES` de `OQueMaisTem`, os elos de
`CadeiaDoDinheiro`, os mapas de rótulo do domínio que a tela imprime (`ROTULO_*`, as
mensagens de `schemas.ts`, `MENSAGEM_FALHA`, as frases de `listaCompras.ts` e `pedido.ts`).
**Não muda:** identificador, nome de arquivo, rota (`/insumos`, `/fichas`), coleção do
Firestore, comentário, teste que não afirme texto de tela. Rota não muda porque o app instalado
não tem barra de endereço, e trocar `href` em quarenta arquivos mais o precache do service
worker é o tipo de diff que quebra o que funcionava para ela não ver a diferença.

**Uma ponte, em um lugar:** o comentário de cabeçalho de `src/lib/types/insumos.ts` e de
`fichas.ts` ganha a linha "Na tela, chama-se X (spec 021, `#d117`)". É o que impede a próxima
sessão de "consertar" a tela de volta para o nome do tipo.

**Não é um `sed`.** Cada string é relida: **"ficha" é feminino e "produto" é masculino**, e o
artigo, o pronome e o particípio mudam em cada frase ("Esta ficha não está aqui" → "Este
produto não está aqui", "suas fichas" → "seus produtos", o filtro "Todas" → "Todos"). Onde
"receita" aparecia querendo dizer a ficha ("É daqui que sai o custo de toda receita", "A
receita, o custo real dela"), vira "produto"; onde queria dizer o produto que não é kit
("Receitas · Kits", "A receita" / "O kit" da 020, "uma receita de cookie" da 019), fica — a
resposta 2 deixou "receita" com um sentido só, o estreito, e isso é ganho. **"Produto" não
colide:** onde já aparecia ("Como você apresenta", a folha do orçamento, `ProdutosDoMes`, "Cada
produto pode fugir daqui depois" na configuração) já queria dizer a ficha.

**Sinônimo que ela usa não é segundo nome.** "Encomenda ou pedido" são as duas dela; o menu
diz "Pedidos" e o corpo diz "encomenda", e nada disso a faz perguntar. A regra de uma palavra
por coisa vale contra a palavra que ela **não** usa, não contra a que usa de dois jeitos.

### As quatro telas já têm porta nas telas do menu; o guia diz o momento, e não é a única

A seção 5 é a tabela. O comentário de `OQueMaisTem.tsx` ("dependem de descoberta acidental")
passa a dizer o que é verdade desde a 13D: cada uma tem a entrada na tela do menu de que é
consequência, e o guia acrescenta o **momento da semana**, que nenhuma tela sabe dizer sobre si
mesma (`#d70`). A porta que falta é uma: a nota, no fechamento da lista de compras.

---

## 3 · Antes de tocar em código

1. `rg -n -i "insumo|ficha" src/` — a lista inteira (~150 linhas em 42 arquivos), lida linha a
   linha e separada em **tela** (muda) e **código** (não muda) antes da primeira edição. A
   contagem dos dois lados entra no `ESTADO.md`.
2. `rg -n -i "material|produto|receita" src/` — a lista do que já existe com a palavra nova,
   para a colisão ser vista antes e não depois. "Receita" é a que pede leitura: cada ocorrência
   é o sentido largo (vira produto) ou o estreito (fica).
3. A gravação, se tiver acontecido: cada palavra perguntada em voz alta vira linha em `#d117`,
   e a 3b pode fechar.

---

## 4 · Escopo — insumo → material, ficha → produto

### 4.1 As portas (a sessão inteira, se for só isto)

Os lugares em que ela lê o nome antes de saber o que é:

- `src/components/layout/navegacao.ts` — `{ rotulo: "Materiais", curto: "Materiais" }` e
  `{ rotulo: "Produtos", curto: "Produtos" }`. Nove e oito letras; o passo 1 do roteiro confere
  em 360px com cinco ícones.
- Os `titulo` de `CabecalhoPagina`: `insumos/page.tsx:94` → "Materiais",
  `ListaFichas.tsx:116` → "Produtos"; a `descricao` dos dois relida ("de todo produto", "O
  produto, o custo real dele"). Os links de voltar `FormularioFicha.tsx:698` e
  `TelaContagemPronto.tsx:158` → "Produtos".
- `metadata.title`: `fichas/page.tsx` → "Produtos", `fichas/[id]/page.tsx` → "Produto", e o
  `shortcuts` de `src/app/manifest.ts` → "Materiais". (`insumos/` não tem `metadata`; se a
  sessão achar que devia ter, é uma linha e entra.)
- Os estados vazios (`EstadoVazio` — `titulo`, `descricao`, rótulo da ação) de `/insumos`
  ("25 materiais com preço médio", "Cadastrar material"), `/fichas` ("Criar primeiro produto",
  "Monte o produto com os materiais que você já cadastrou"), `/pedidos` ("Monte o pedido com os
  produtos que você já precificou"), `/insumos/contagem` ("lista os materiais"),
  `/fichas/contagem` ("Crie o primeiro produto"), e "Esta ficha não está aqui" em
  `EditorFicha.tsx:101` → "Este produto não está aqui … Seus produtos continuam na lista".
- `CATALOGO_DO_COMECO`: os cinco textos hoje não dizem "insumo" nem "ficha" — a 019 já falou
  por fora. Conferir, e só; o teste de cópia (4.3) passa a garantir.
- `CartaoPrimeirosPassos.tsx`: "Montar a minha ficha do zero" → "Montar o meu produto do zero".
- `OQueMaisTem.tsx`: "insumo por insumo" → "material por material", "os insumos entram todos de
  uma vez" → "os materiais", "receita por receita" (sentido largo, no pronto) → "produto por
  produto". Os quatro `nome`s ficam: nenhum diz insumo ou ficha.
- `CadeiaDoDinheiro.tsx`: `tela: "Insumos"` → "Materiais", `tela: "Fichas"` → "Produtos", e as
  frases dos elos relidas.
- Os rótulos das quatro portas ficam como estão — "O que comprar", "Ler uma nota", "Contar a
  despensa", "O que está pronto" —, nenhum diz uma palavra rejeitada, e 3b está em aberto.

### 4.2 O corpo das telas (021B se a 4.1 encher a sessão)

Tudo o mais que o passo 1 classificou como tela. O que se sabe de antemão:

- **Botões e contagens:** "Novo insumo" / "Cadastrar insumo" → "Novo material"; "Nova ficha" /
  "Criar primeira ficha" → "Novo produto" / "Criar primeiro produto"; `aria-label` dos dois
  flutuantes; "12 insumos" → "12 materiais"; "3 fichas" → "3 produtos"; "Buscar insumo" /
  "Buscar ficha" → "Buscar material" / "Buscar produto".
- **Filtros:** em `/fichas`, "Todas" → "Todos"; "Receitas" e "Kits" ficam (sentido estreito).
  Em `/insumos`, as cinco categorias ficam.
- **Frases:** `FraseDaCapacidade` ("qual insumo e quanto comprar", "N fichas abaixo da
  reserva"), `CartaoComprasHoje.fraseDoPiso`, `PainelFornada`, `TelaNota` e `RodapeNota` ("os
  insumos entram"), `FormularioFicha` (27 ocorrências — "Monte a receita com os insumos",
  "insumo arquivado", o kit e as escolhas), `FormularioInsumo`, `FormularioPedido`,
  `FormularioMeta` ("preço médio das suas fichas"), `VendasPorPedido`, `SemContagemRecente`
  ("N insumos estão sem contagem recente"), `LinhaCompra`, `TelaConfiguracao` ("rateio de toda
  ficha técnica", "cada ficha técnica").
- **Strings de domínio que a tela imprime:** `schemas.ts` (mensagens de validação — "Escolha um
  insumo"), `listaCompras.ts` (pendências: "ficha arquivada", "insumo arquivado"), `pedido.ts`,
  `caixa.ts`, `notaFiscal.ts` (`MENSAGEM_FALHA`), `whatsapp.ts` — este último é a mensagem para
  a **cliente**, e só muda se disser "ficha" ou "insumo" para ela, o que não deveria.
- **Não muda:** `Insumo`, `FichaTecnica`, `colInsumos`, `colFichas`, `/insumos`, `/fichas`,
  `insumoIds`, `fichaId`, `contas/{id}/insumos`, todo comentário, todo nome de arquivo.

### 4.3 Testes

- `tests/domain/onboarding.test.ts`: o teste de cópia dos cinco textos ganha a constante
  `PALAVRAS_REJEITADAS = ["insumo", "ficha"]` e a regra de que nenhum dos cinco as contém
  (case-insensitive, como palavra inteira — "ficha" não pode pegar "fichado" por acidente, e
  não há "fichado" para pegar).
- Os testes que afirmam texto de rótulo de domínio (as pendências de `listaCompras.test.ts`,
  as mensagens de `schemas`, se houver) mudam junto com o rótulo. Nenhum teste de aritmética
  muda.

### 4.4 Documentação

- `#d117` em `docs/DECISOES.md`: a tabela.
- `docs/ESTADO.md`: a seção da 021, a linha 21 na tabela, as contagens do passo 3, a próxima
  ação apontando para a gravação (ou para a 022 se ela já tiver passado).
- `docs/saas/ROADMAP.md`: a 021 marcada como entregue; a seção 2, item 4, ganha uma linha
  dizendo que as quatro portas existem desde a 13D e que a 021 conferiu.

---

## 5 · As quatro telas fora do menu

O que a tabela diz, lido do código em 2026-09-16. "Porta" é um toque a partir de uma tela do
menu de baixo; "momento" é o de `OQueMaisTem`.

| Tela                | Momento                                      | Portas que já existem                                                                                                                                                                                                                                                                                                                             | O que falta                                                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/compras`          | No dia de ir ao mercado                      | Tela Hoje, `CartaoComprasHoje` — só quando há item por comprar, ficha abaixo do piso ou pedido confirmado sem lista (`#d96`); cabeçalho de `/pedidos`, `AtalhoParaCompras` "O que comprar", **sempre**                                                                                                                                            | Nada. O cartão some quando não há o que comprar, e é assim mesmo: é cartão, não porta; a porta é a de `/pedidos`.                                                                                                                                                                                                                        |
| `/insumos/nota`     | Na volta do mercado, com o cupom na mão      | Cabeçalho de `/insumos`, `EntradaLeitura` "Ler uma nota", **sempre**, nos dois tamanhos; estado vazio de `/insumos`                                                                                                                                                                                                                               | **A porta no momento.** Na volta do mercado a tela aberta é `/compras`, com a lista toda marcada, e o fechamento dela oferece "Fechar e guardar na despensa" (contagem semeada pela lista) — mas não a nota, que faz três coisas de uma vez: corrige os preços, lança a compra no caixa (6B) e propõe a contagem (7B, `origem: "NOTA"`). |
| `/insumos/contagem` | Domingo à noite, antes de montar a lista     | Cabeçalho de `/compras`, `EntradaContagem`, **sempre, inclusive sem lista**; bloco "sem contagem recente" de `/compras`; "Fechar e guardar na despensa"; faixa de `/fichas` quando há insumo sem contagem (numa conta que apertou a biblioteca, sempre); "Contar a despensa" na linha "Não dá para saber" de `FraseDaCapacidade` (ficha e pedido) | Nada em `/insumos`, **de propósito** (comentário de `EntradaContagem.tsx`), e agora com um motivo a mais: numa conta nova todo insumo é "nunca contada", e uma faixa ali seria "25 sem contagem" no passo 2 do caminho. A linha de cada insumo já diz a idade da contagem.                                                               |
| `/fichas/contagem`  | Fim do dia de fornada, ou antes de dizer sim | Cabeçalho de `/fichas`, `EntradaContagemPronto` "O que está pronto", **sempre**; bloco do pronto no editor da ficha (`FormularioFicha.tsx:841`); "Contar o que está pronto" ao registrar a fornada (`PainelFornada.tsx:231`)                                                                                                                      | No pedido ("antes de dizer sim") a linha não oferece contar o pronto — só a despensa. **Fica.** Um segundo link na linha mais densa do sistema, para um pote que quem está começando não tem. Volta se alguém com freezer cheio disser que o pedido mentiu.                                                                              |

### 5.1 A porta que falta: a nota ao fechar a lista — `ListaDoMercado.tsx`

Na caixa de confirmação de "Fechar esta lista" (linha ~471), um terceiro botão, irmão de
"Fechar e guardar na despensa" e com o mesmo formato:

```tsx
// A nota faz o que "guardar na despensa" faz e mais dois: corrige os preços e
// lança a compra no caixa. Fecha a lista do mesmo jeito, e a contagem que a
// nota propõe volta para `/compras` sem lista — a compra acabou.
const online = useConexao();
const fecharELerANota = () => {
  fechar();
  router.push("/insumos/nota");
};

<Botao tamanho="sm" variante="primaria" disabled={!online} onClick={fecharELerANota}
  iconeInicial={<ScanLine aria-hidden className="size-4" strokeWidth={1.75} />}>
  Fechar e ler a nota
</Botao>
<AvisoLeituraSemRede />
```

- O parágrafo da caixa ganha uma frase: "Com o cupom na mão, ler a nota corrige os preços e
  lança a compra no caixa de uma vez."
- Com dois botões primários na mesma linha (nota e despensa), a nota é a primária e "guardar na
  despensa" cai para `secundaria`: a nota faz tudo o que a despensa faz. Sem rede, a nota fica
  desabilitada com o aviso de `EntradaLeitura` embaixo, e a despensa volta a ser a primária —
  é o único caso em que a variante depende de `online`.
- `#d113`: na frente de quem está começando, nada; tira, nada.

### 5.2 O comentário de `OQueMaisTem.tsx`

"Dependem de descoberta acidental" vira "cada uma tem a porta na tela do menu de que é
consequência (13B, 13D, 3C, 6A); o que só esta página sabe dizer é o momento". Sem mudar o
componente.

---

## Roteiro de navegador

Precisa da **conta real** (tem lista, nota e contagem) e de uma **conta vazia** (é onde o nome
aparece antes da coisa). Aparelho em 360px para o passo 1.

1. **Conta vazia, app instalado, 360px.** O menu de baixo diz Hoje · Materiais · Produtos ·
   Pedidos · Caixa, nenhum cortado, nenhum em duas linhas. Tocar Materiais e Produtos: o título
   do cabeçalho, a busca, a contagem e o estado vazio usam a palavra do menu. "Insumo" e
   "ficha" não aparecem em tela nenhuma — e `rg -i "insumo|ficha" src/` só devolve
   identificador, rota e comentário.
2. **Tocar "Começar com o que toda cozinha tem"** e voltar para Hoje: o cartão dos passos com
   "Montar o meu produto do zero" como terciária; `/comecar` inteiro sem as duas palavras, a
   cadeia do dinheiro com "Materiais" e "Produtos" como tela, e os quatro `nome`s de "O que
   mais tem aqui" iguais aos das quatro portas.
3. **Conta real, `/compras` com lista, tudo marcado.** "Fechar esta lista" → a caixa tem três
   botões: Continuar comprando · Fechar a lista · **Fechar e ler a nota** (primária) · Fechar e
   guardar na despensa (secundária). Em 360px os quatro quebram linha sem cortar texto.
4. **DevTools em Offline, mesma caixa.** "Fechar e ler a nota" desabilitado, a frase de sem
   rede embaixo, e "Fechar e guardar na despensa" de volta a primária.
5. **Online, tocar "Fechar e ler a nota".** Cai em `/insumos/nota`; voltar para `/compras`: a
   lista está fechada (estado vazio "Da encomenda para o carrinho"). Ler uma nota de verdade,
   aceitar a contagem proposta, salvar: cai em `/compras` sem lista.
6. **`/fichas` na conta real.** O filtro diz "Todos · Receitas · Kits"; abrir um produto: o
   link de voltar diz "Produtos", o bloco da 020 diz "A receita" (ou "O kit"), e a aba do
   navegador no desktop diz "Produto". Abrir `/fichas/abc` que não existe: "Este produto não
   está aqui".
7. **A gravação**, se ainda não tiver rodado: conta nova, celular dela, ninguém ao lado. Cada
   pergunta em voz alta que for **sobre uma palavra** entra em `#d117`. É a régua da fase 0, e
   esta é a última spec dela.

---

## Critérios de aceite

- [x] `#d117` escrito com a tabela da seção 1.1 (as seis linhas, a 3b em aberto), mais uma
      linha por palavra perguntada na gravação, quando ela rodar.
- [x] "Insumo" e "ficha" ausentes de texto de tela: `rg -i "insumo|ficha" src/` devolve só
      identificador, rota, coleção e comentário; a contagem "tela / código" do passo 1 da
      seção 3 está no `ESTADO.md`.
- [x] Menu, título de cabeçalho, estado vazio, `metadata.title`, atalho do manifesto, caminho
      do começo, guia e as quatro portas dizem "material" e "produto" para as mesmas coisas.
- [x] "Receita" só no sentido estreito (o produto que não é kit): nenhuma frase a usa querendo
      dizer o produto em geral. "Encomenda" fica onde está.
- [x] `git diff src/lib/types/ src/lib/firebase/ firestore.rules` vazio, exceto o comentário
      de ponte em `types/insumos.ts` e `types/fichas.ts`. Nenhuma rota renomeada.
- [x] A tabela da seção 5 conferida contra o código no dia da sessão; "Fechar e ler a nota" na
      caixa de fechamento de `/compras`, desabilitado sem rede, com a variante trocando.
- [x] O comentário de `OQueMaisTem.tsx` não promete mais "descoberta acidental".
- [x] "O que está pronto" sem uma letra alterada: a 3b está em aberto, e o rótulo espera ela.
- [x] O roteiro passa, com o passo 4 em Offline.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d117` escrito, `ESTADO.md` e a linha da 021 no roadmap atualizados, com a correção da
      seção 2 do roadmap.

---

## Fora de escopo

- **Escolher a palavra da 3b.** "Pronta entrega" e "estoque" são as duas candidatas dela, as
  duas com um problema que ela precisa ver (seção 1.1), e "O que está pronto" fica até ela
  decidir. Escolher por ela é exatamente o que esta spec existe para não fazer.
- **Trocar "encomenda" por "pedido" no corpo.** Ela usa os dois. Vinte strings para tirar uma
  palavra que é dela.
- **Trocar "receita" no sentido estreito.** O filtro "Receitas · Kits" e o bloco "A receita" da
  020 nunca foram perguntados; se travarem na gravação, entram em `#d117`.
- **Renomear rota, coleção, tipo, componente ou arquivo.** `#d117` é a ponte; o código continua
  em português de código — `Insumo` e `FichaTecnica` seguem com esses nomes.
- **Palavra de campo que ela não travou.** "Rende", "perda", "markup", "margem", "competência"
  só entram se aparecerem na gravação como pergunta. Sem gravação, ficam.
- **Um segundo link na linha do pedido** para o pronto (seção 5, quarta linha).
- **A contagem em `/insumos`** (seção 5, terceira linha).
- **Mexer em `CadeiaDoDinheiro`, `QuandoNaoTemInternet` e `InstalarNaTela`** além da palavra.
- **A tela de login e a de "sem conta"** — é a 022.
- **Reescrever as descrições longas** que já falam a língua dela. Só a palavra, onde ela
  aparece; a frase inteira só quando a troca a deixou errada.
- **Qualquer coisa em `src/lib/domain/` que não seja rótulo impresso**, `src/lib/firebase/`,
  regras, índices, dependências.

---

## Decisões desta spec que são fáceis de rejeitar

- **A sessão roda com as respostas da Maynara, sem a segunda confeiteira.** A spec pedia as
  duas; a decisão "a da Maynara vence na fase 0" torna a segunda informativa, e esperar por ela
  seria segurar a última spec da fase 0 por um dado que não muda o resultado dela. A coluna
  fica vazia e visível.
- **"Material", e não "ingrediente".** Ela ofereceu os dois e escolheu, com o motivo
  ("ingredientes e itens diversos"). Não é a nossa palavra preferida, e é por isso que está
  certa.
- **"Encomenda" fica no corpo.** É a decisão mais fácil de contestar pelo problema 2, e a
  resposta é a própria resposta 4: os dois são dela. A regra de uma palavra por coisa é contra
  a palavra que ela não usa.
- **"Receita" fica no sentido estreito sem ter sido perguntada.** A alternativa — perguntar
  agora "e o produto que não é kit, como chama?" — é o questionário de rótulos que a seção 1
  recusou. A gravação responde de graça.
- **Rota não muda.** `/insumos` continua existindo com o menu dizendo "Materiais". No celular
  instalado ninguém vê a barra; no desktop, quem vê é quem já sabe. O custo de trocar é todo
  `href`, o precache, o `manifest`, e o histórico do navegador dela.
- **Todo lugar mostrado, e não só os quatro do roadmap.** É mais diff. O motivo é o problema 2:
  a 021 existe para tirar o segundo nome, e trocar só o menu criaria o terceiro. Por isso a
  divisão 4.1 / 4.2 é por porta e corpo, e não por "faz metade de cada".
- **"Fechar e ler a nota" fecha a lista antes de ir.** Poderia só abrir a nota e deixar a lista
  aberta para fechar depois — mas aí "Fechar e guardar na despensa" e "ler a nota" teriam dois
  comportamentos na mesma caixa, e a nota já propõe a contagem sozinha. O que se perde: se a
  nota falhar, a lista já fechou. Ela fecha guardada como estava, e a nota pode ser lida de
  novo por `/insumos`.
- **Primária que depende de `online`.** É a única do sistema. A alternativa — nota sempre
  primária, desabilitada sem rede — deixa a caixa sem ação primária viva no mercado, que é
  onde não tem sinal.
- **Nenhuma pergunta antes sobre "rende" e "perda".** O roadmap fixou cinco, sobre coisas. Um
  questionário de quinze rótulos é a gente lendo a tela para ela — que é o que a gravação
  existe para não fazer.

---

## Riscos

- **As respostas vieram por texto, e ela já conhece o sistema.** "Produto" pode ser a palavra
  que a folha do orçamento (017) ensinou. Não há como saber, e não invalida: é a palavra que ela
  usa hoje, e a gravação da segunda confeiteira — que nunca viu o app — é o contraste. Se a
  segunda disser "receita" para a coisa toda, `#d117` registra a divergência e a fase 1 decide.
- **"Receita" com dois sentidos por acidente.** É a única palavra que a sessão precisa
  classificar ocorrência por ocorrência (passo 2 da seção 3). O risco é uma frase sobrar
  dizendo "receita" no sentido largo ao lado de "produto" — "Monte o produto com os materiais…
  a receita se refaz". O critério de aceite tem uma linha só para isso.
- **"Materiais" em 360px.** Nove letras sob um ícone, com quatro vizinhos. Deve caber ("Pedidos"
  e "Produtos" têm oito); se cortar, o `curto` vira "Material" (singular, oito letras) e o
  `rotulo` continua "Materiais" — registrado no `ESTADO.md`.
- **Testes verdes sem tocar em nada.** Esperado: nada de aritmética muda. O portão não prova
  esta spec; o `rg` e o roteiro provam.
- **A gravação depois desta spec ensina "material" e "produto".** É o que se quer: a régua da
  fase 0 é a contagem de perguntas com o sistema como ele vai ficar. O que a gravação ainda
  decide sozinha é a 3b.
- **Duas sessões que viram três.** Se a 4.1 sozinha encher a sessão, a 4.2 é 021B, e o sistema
  fica um tempo com o menu dizendo "Produtos" e o botão dizendo "Nova ficha" — que é o problema
  2 de novo, temporariamente. A sessão diz no `ESTADO.md` quais telas ficaram no meio.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. Mais o roteiro, com o passo 4 em Offline, e o `rg` da palavra rejeitada colado
no `ESTADO.md`. E, fora do código, a régua da fase 0 pela última vez: **a Maynara abrindo uma
conta nova sem ninguém ao lado, com a tela gravada, e a contagem de perguntas em voz alta.**
Com a 018, a 019, a 020 e esta, o preço está no primeiro minuto, o caminho começa por ele, os
formulários pedem quatro campos, e o nome das coisas é o dela. Se a contagem ainda não for
zero, o que sobra não é da fase 0 — é o que a 8C e a 13E estão reservadas para receber.
