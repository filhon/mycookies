# Spec 114 · O link que circula

**Tipo:** o link do cardápio vira coisa que se espalha: prévia com imagem no WhatsApp e no
Instagram, um botão para a cliente mandar o cardápio à amiga, o rodapé "feito no Rende" como
link medido, e o QR code para a dona imprimir. Em duas partes: **A** sem dependência; **B** (o QR)
só com a dependência aprovada.
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10.
**Depende de:** 031 (sessão F: a capa e o logo existem e saem por rota).
**Aprovações pedidas:** (1) `Conta.origem` aceita `"cardapio"`, aditivo; (2) **na parte B, uma
dependência de produção** para gerar o QR (seção 1). Sem a (2), a B não entra e a A sai sozinha.
**Decisões a registrar:** `#d317`, que **reverte um item do "Fora de escopo" da 031**
("indexação em busca e imagem de prévia": a prévia entra, a indexação continua fora).

---

## Problema

1. **O link chega no WhatsApp sem imagem.** A 031 achou que título e frase bastavam, antes de a
   capa existir. Hoje a página tem a capa e o logo dela e a prévia não usa nenhum dos dois: na
   conversa, o cardápio é uma linha cinza. Todo produto de link na bio vende a prévia com imagem,
   porque é ela que faz tocar.
2. **A cliente que gostou não tem como mandar.** Para indicar a confeiteira à amiga, ela copia a
   barra de endereço, se souber. A indicação é o canal de venda mais barato da confeiteira.
3. **"Cardápio feito no Rende" é texto morto.** É a única linha do Rende numa página que muitas
   pessoas veem, e não leva a lugar nenhum. É o mesmo rodapé que faz produtos de link na bio
   crescerem sem anúncio. Hoje, se uma confeiteira chega por ele, ninguém sabe.
4. **Não há QR para o balcão, a etiqueta ou a embalagem.** A cliente que comeu o cookie e quer
   pedir de novo precisa achar o Instagram. Todo cardápio digital pago entrega o QR.

---

## 1 · O que esta spec decide: `#d317`

### Parte A

- **A prévia.** `generateMetadata` passa a dar `openGraph` (`title`, `description`, `type:
"website"`, `locale: "pt_BR"`, `siteName` = nome da loja) e `images` com a capa
  (`/c/{id}/vitrine/capa?v=`); sem capa, o logo; sem nenhum, sem imagem. `metadataBase` do layout
  raiz já torna a URL absoluta. `twitter.card` = `summary_large_image` com capa, `summary` com
  logo. O `noindex` continua: a prévia é para quem recebe o link, não para a busca. **Sem o nome
  do Rende na prévia** (é a loja dela).
- **"Mandar o cardápio".** Um terceiro botão no topo, ao lado de WhatsApp e Instagram, com o
  ícone `Share2`: `navigator.share({ title: nome, url })` quando existe; senão, copia o link e diz
  "Link copiado" por dois segundos (`role="status"`). Cancelar não diz nada. É um componente de
  cliente pequeno; o topo continua de servidor.
- **O rodapé vira link.** "Cardápio feito no Rende" passa a ser `<a href="/conheca?de=cardapio">`,
  `--ink-muted`, sublinhado no foco e no hover, em aba nova. Continua desligável
  (`ocultarFeitoCom`). Em `/conheca`, `?de=cardapio` grava `rende:origem = "cardapio"` no
  `localStorage` (com `try`), e o cadastro manda `origem: "cardapio"` quando o encontra, como
  já manda `"calculadora"` pelo rascunho. `Conta.origem` e `esquemaCadastro` ganham o valor;
  `npm run metricas` já imprime a origem, e a sessão confere.

### Parte B (só com a dependência aprovada)

- **"Baixar o QR code"** em "Seu cardápio", abaixo de "Copiar" e "Compartilhar": um PNG de
  1024 px com o link, a margem de silêncio do padrão e tinta `--ink` sobre papel claro (nunca a
  cor da loja: QR precisa de contraste, e uma cor clara o mata). O nome do arquivo é
  `cardapio-{contaId}.png`.
- **A dependência.** A sessão propõe a menor biblioteca de QR sem dependências próprias e com
  licença MIT, carregada por `import()` só no painel (o cardápio público não a baixa), e **pede a
  aprovação antes de instalar**. Escrever o codificador de QR à mão (Reed-Solomon, máscaras) não é
  alternativa: são centenas de linhas para errar num caso que ninguém testa.

---

## 2 · Antes de tocar em código

1. Ler `src/app/c/[contaId]/vitrine/[qual]/route.ts`: a imagem da prévia é pedida pelo robô do
   WhatsApp sem cookie, e a rota precisa responder 200 com o cardápio aberto. Conferir o
   `Content-Type` e o tamanho (a capa tem até 300 KB, dentro do que o WhatsApp aceita).
2. Ler `src/app/(auth)/cadastro/page.tsx` e `domain/cadastro.ts`: como `"calculadora"` chega.
3. Ler `SeuCardapio.tsx`, o bloco do link.

---

## 3 · Escopo

- **A:** `src/app/c/[contaId]/page.tsx` (`generateMetadata`, o rodapé, o botão),
  `src/components/cardapio/MandarOCardapio.tsx` (novo, cliente), `src/app/conheca/page.tsx` (ler
  `?de=`), cadastro (`origem`), `types/conta.ts`, `domain/cadastro.ts` com teste do esquema.
- **B:** `SeuCardapio.tsx` e a dependência aprovada.
- Linha em `components/comecar/novidades.ts` na B ("O QR code do seu cardápio, para imprimir").

---

## 4 · Roteiro de navegador

1. Colar o link numa conversa do WhatsApp (celular de verdade): a prévia mostra a capa, o nome e
   a frase. Conta sem capa e com logo: o logo pequeno. Sem nenhum: só o texto.
2. O mesmo no Instagram (direct).
3. 360 px, Android: "Mandar o cardápio" abre a folha de compartilhar. Desktop sem `share`: "Link
   copiado".
4. Tocar no rodapé: `/conheca?de=cardapio` em aba nova; criar uma conta de teste por ali: a conta
   nasce com `origem: "cardapio"`, e `npm run metricas` mostra.
5. **B:** baixar o QR, imprimir, ler com a câmera de dois celulares: abre o cardápio.

---

## Critérios de aceite

- [ ] Prévia com a capa (ou o logo) no WhatsApp; `noindex` mantido.
- [ ] "Mandar o cardápio" com `share` e o recuo de copiar.
- [ ] O rodapé é link, medido até a conta criada (`origem: "cardapio"`), e continua desligável.
- [ ] **B:** QR baixável, lido por câmera comum, dependência aprovada e fora do pacote da página.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d317` escrito; `ESTADO.md` atualizado.

---

## Fora de escopo

- **Imagem de prévia montada** (capa + logo + nome desenhados pelo `next/og`). A capa dela já é a
  imagem; montar exige fonte e layout no servidor.
- **Indexação em busca.** Continua `noindex` (`#d158`): o link é para quem ela manda.
- **Indicação com recompensa** ("indique e ganhe"). Cupom é a fronteira da 031 (sem cupom).
- **QR com logo no meio e cor.** Reduz a leitura; o QR sóbrio é o que funciona impresso em
  etiqueta pequena.
- **Endereço bonito no QR.** É a 116; o QR passa a apontar para o apelido quando ele existir.
