# Brief para o Claude Design — a marca do sistema

Escrito em 2026-09-18 por quem conduz o projeto. É a instrução completa para você, Claude
Design, criar do zero a marca do sistema de precificação e produção que hoje roda sob o nome
MyCookie's. Tudo o que você precisa saber está aqui; não há repositório nem arquivo para ler.

---

## 0 · Como trabalhar neste brief

**Duas fases, com uma parada entre elas.**

- **Fase 1 — estratégia, nome e território.** Entregue: o posicionamento em uma página, de 6 a
  8 opções de nome com justificativa, e 3 territórios visuais distintos em nível de moodboard
  (paleta, tipografia, uma tela-chave em cada). **Pare e espere a escolha.** Não construa
  identidade completa em cima de um nome que eu ainda não escolhi.
- **Fase 2 — o pacote completo** para o nome e o território escolhidos. A lista de entregáveis
  está na seção 8.

Tudo em **português do Brasil**. Quando algo estiver ambíguo, assuma e diga o que assumiu —
não pare para perguntar. Onde este brief diz "fica", é restrição; onde diz "sai", é
restrição; o resto é seu.

---

## 1 · Contexto

Eu sou desenvolvedor. Construí este sistema para a **MyCookie's**, a confeitaria de cookies
artesanais da minha esposa, Maynara. Ele nasceu como ferramenta interna e herdou por inteiro a
identidade da confeitaria: vinho profundo, creme de papel, dourado discreto, serifa quente, o
contorno do biscoito em marca d'água. Está publicado, instalado no celular dela e em uso diário.

Agora são **dois produtos**:

1. **MyCookie's** — o cookie. Marca local consolidada, continua exatamente como está. Não é
   assunto deste brief.
2. **O sistema** — que vai ser vendido como SaaS para outras confeiteiras e produtoras
   artesanais de comida. Não serve só para cookie, e não pode continuar com a cara da
   MyCookie's: quem compra precisa sentir que o produto é dela, não que está usando a
   ferramenta interna de uma concorrente.

A MyCookie's vira o **primeiro caso de uso** e a primeira cliente. Não é dona, não é
sub-marca, não empresta cor nem tipografia. A relação correta é "a MyCookie's usa [nome]".

**Onde estamos:** app publicado, uma usuária real (Maynara), roteiro de SaaS escrito. Os
próximos passos são um beta fechado com 3 a 5 confeiteiras, depois cadastro e cobrança. Um
plano só, R$ 29–49/mês, teste grátis de 14 dias, anual com desconto. Sem plano gratuito.

**O que preciso de você:** a marca inteira — nome, estratégia, identidade visual, manual de
marca, manual de comunicação, design system, aplicações e telas de exemplo — em formato que
eu consiga colocar direto no produto (seção 9).

---

## 2 · O que o sistema é

**Em uma frase, a que o produto existe para dizer:**

> "Este doce te custa R$ 3,41 e você deveria cobrar R$ 8,50."

Tudo o mais é o que sustenta essa frase. O produto não é "gestão": é **precificação honesta**,
mais a rotina semanal que a mantém verdadeira.

**O trabalho a ser feito:** saber se está ganhando dinheiro em cada doce que vende, e não
descobrir isso tarde demais. Confeiteiras artesanais quase sempre precificam por intuição ou
pelo preço da concorrente, esquecem embalagem, gás, o próprio tempo e a taxa da maquininha, e
passam anos vendendo com margem negativa sem perceber.

**O que o sistema faz, na ordem do valor:**

1. **O preço.** Ela monta o produto (a receita, com o que entra e quanto rende). O sistema
   calcula o custo real por unidade somando o que ninguém soma: perda do material, embalagem,
   gás, energia, a hora de trabalho dela, despesas fixas rateadas e a taxa da maquininha. Sugere
   o preço por margem ou por markup e diz, em reais, **quanto sobra pra ela** em cada unidade
   depois da taxa. Cada produto mostra "por que custa R$ 4,41", parcela por parcela.
2. **Materiais.** O que ela compra: preço pago, quantidade, unidade, perda, histórico de preço.
   Uma biblioteca de partida ("comece com o que toda cozinha tem") para não começar do zero.
   Leitura de nota fiscal por foto, com IA, que cadastra vinte itens de uma vez e lança a compra
   no caixa. Quando um material sobe de preço, os produtos afetados ficam marcados com "custo
   desatualizado".
3. **Pedidos.** A encomenda: cliente, data de entrega, itens com o preço congelado no momento do
   pedido, desconto, taxa de entrega, status (orçamento → confirmado → em produção → entregue →
   pago). Resumo pronto para mandar no WhatsApp. Orçamento em folha A4 para clientes empresa.
   Kits e combos em que a cliente escolhe os sabores.
4. **Fornada e despensa.** O que ela já assou e o que está pronto no pote ou no congelador.
   Contagem da despensa com data. A resposta a "tenho quinze pedidos pra sábado, dá?" com o que
   tem em casa e o que os outros pedidos já prometeram.
5. **Compras.** A lista do mercado, gerada dos pedidos da semana contra a despensa, agrupada
   por corredor, com o preço corrigível na frente da gôndola.
6. **Caixa.** Entradas e saídas, o resultado do mês, o que a maquininha levou, o produto que
   mais deu lucro. Meta mensal traduzida em "quantos doces por semana", com o progresso real.
7. **Hoje.** A tela de abertura: o que precisa ser feito, a agenda de entregas, a meta, o cartão
   de compras, e o caminho dos primeiros passos para quem está começando.

**Navegação principal, cinco destinos:** Hoje · Materiais · Produtos · Pedidos · Caixa. As
palavras foram escolhidas pela própria confeiteira, não pelo software ("material", não
"insumo"; "produto", não "ficha técnica").

**O que afeta a marca no lado técnico:** é um app instalado na tela de início do celular
(PWA), funciona sem internet como estado normal, tema claro por padrão e escuro seguindo o
sistema, celular primeiro e desktop como versão confortável do mesmo desenho.

---

## 3 · Para quem

**A confeiteira artesanal que trabalha sozinha.** Ela mesma compra, produz, embala, vende,
entrega e fecha o caixa. Não é técnica e não tem equipe. Faz cookies, bolos, brigadeiros, doces
de festa, salgados, pães — o produto muda, o problema não. Muitas vezes começou como um bico
que virou negócio, e o negócio pode fechar em meses porque o preço estava errado desde o
início.

**Quatro cenas de uso, todas igualmente importantes:**

1. **Cozinha, durante a produção.** Celular apoiado na bancada, mãos sujas de massa, luz forte,
   tela a meio metro. Consulta a receita e as quantidades. Digitar é quase impossível.
2. **Mercado, comprando.** Lista aberta, uma mão no carrinho, sinal ruim. Marca itens e corrige
   preços no ato.
3. **Entrega ou feira, em pé.** Uma mão, poucos segundos, frequentemente sem internet.
   Consulta preço, registra venda.
4. **Noite, planejando.** Sentada, com calma. Precifica um produto novo, lança o caixa, olha a
   meta.

**O que ela sente:** medo de estar vendendo no prejuízo, cansaço de planilha, orgulho do que
faz. **O que ela não é:** uma criança brincando de loja. A marca nunca a infantiliza — ela é
dona de um negócio.

**Por onde ela chega até nós:** professoras de confeitaria e cursos de "confeitaria lucrativa"
no Instagram (que hoje distribuem planilha de precificação como bônus), grupos de WhatsApp e
Facebook de confeiteiras, conteúdo sobre precificação. Não chega por anúncio.

**Contra o que competimos:** a planilha de Excel dela, a planilha do curso, o caderno, a
calculadora do celular, e — no extremo oposto — ERPs genéricos que ela abre e fecha.

---

## 4 · Posicionamento e personalidade

**Promessa:** descubra quanto você realmente ganha em cada doce — antes de dar o preço.

**O argumento de venda não é "sistema barato".** Uma cliente que descobre R$ 600 por mês de
prejuízo por preço errado não está pagando R$ 49 por um app; está pagando por esse número.

**Personalidade (herdada do produto, e que fica):** direta, precisa, confiante, calma. O
sistema faz a conta; ela toma a decisão. Quando precisa ensinar contabilidade, ensina em uma
frase, no lugar onde o número aparece. É honesto sobre o que ainda não sincronizou sem
transformar isso em alarme.

**O que a marca nova precisa acrescentar:** a sensação de que serve a **qualquer cozinha
artesanal**, não a uma confeitaria de cookies. E a sensação de produto — algo que se assina,
se recomenda para uma amiga, se mostra na tela do celular sem vergonha.

**O que o produto nunca vai fazer** (e a marca não pode prometer): emissão fiscal, lotes com
rastreabilidade, contas a pagar e receber genéricas, CRM, integração com a API do WhatsApp,
tabela nutricional, cardápio de delivery, IA consultora. Não é ERP e não compete com Bling ou
Tiny.

**Anti-referências visuais** (o que a marca não pode parecer):

- **Planilha.** Grade cinza infinita, números sem hierarquia, cara de trabalho contábil.
- **ERP corporativo.** Azul empresarial, menu em árvore, formulário de quarenta campos.
- **Rede social.** Confete, badges, gamificação, notificação disputando atenção.
- **Dashboard SaaS escuro genérico.** A saída fácil para "não parecer planilha" é copiar
  Linear e Vercel. Não é essa marca.
- **Fofura de blog de receita.** Rosa-bebê, cursiva, coraçãozinho. Ela é empresária.
- **E, agora, a própria MyCookie's.** Vinho, creme, dourado, serifa de papelaria fina, biscoito.

---

## 5 · O que fica, o que sai, o que muda

O produto já tem um sistema de design maduro, construído sobre princípios que não dependem da
MyCookie's. A regra é: **o que é do produto fica; o que é da confeitaria sai.**

### Fica (princípios e estrutura — são do produto)

- **Os cinco princípios de design:** (1) o sistema faz a conta, ela decide — nunca pedir um
  número que possa ser derivado de outro; (2) bancada antes de escritório — toda tela pensada
  primeiro para uma mão suja, em pé, a meio metro; (3) todo número mostra a sua consequência —
  preço vem com "sobram R$ 4,20 por unidade depois da maquininha"; (4) offline é o estado
  normal, não o erro; (5) densidade com hierarquia — a resposta à planilha não é mostrar
  menos, é dar peso diferente a cada dado.
- **Tema claro por padrão** (cozinha iluminada), **escuro seguindo o sistema** (planejamento
  noturno). No escuro a marca inverte: a cor de estrutura vira fundo, a cor de superfície vira
  tinta.
- **Estratégia de cor "contida no conteúdo, comprometida no cromo":** a cor da marca aparece
  cheia e sólida na barra lateral do desktop e nos cabeçalhos de contexto; as superfícies onde
  moram os números ficam em neutros quentes para a densidade respirar. Nenhum neutro é puro:
  todos carregam a matiz da marca em croma baixo.
- **Duas famílias tipográficas, no máximo:** uma de display (título de página, valor financeiro
  em destaque, estado vazio) e uma de interface (rótulo, formulário, tabela, navegação, corpo),
  esta obrigatoriamente com **numerais tabulares**. Escala fixa em rem, razão ~1.2, nada de
  tipografia fluida. Todo valor monetário em tabular, peso 600; o "R$" menor e apagado, o
  número em destaque.
- **Ritmo de espaçamento** em base 4px (4 · 8 · 12 · 16 · 24 · 32 · 48). Raio de 10px em botão
  e campo. Sombras baixas ou nenhuma. Superfícies opacas, sem vidro, sem brilho, sem plástico.
- **Toque:** 44×44px mínimo, 8px entre alvos, ação primária no celular com 52px, campo com
  48px. Não é generosidade: é farinha no dedo.
- **Componentes e suas regras:** um botão primário por tela; botão flutuante no celular é uma
  pílula com o nome da ação ("Novo pedido"), nunca um círculo com "+"; rótulo sempre acima do
  campo, nunca placeholder como rótulo; campo monetário com prefixo fixo e teclado numérico;
  listas com divisórias, não grades de cartão (cartão só para unidade destacável e clicável;
  cartão dentro de cartão é erro); painel lateral no desktop e folha inferior no celular como
  o mesmo componente; modal só para confirmação destrutiva; estado vazio que ensina a tela
  ("nunca 'nenhum registro encontrado'"); esqueleto com a forma do conteúdo em vez de spinner;
  selo discreto "salvo no aparelho" quando há escrita pendente, nunca alerta vermelho.
- **Motion:** 150–220ms em transição de estado, 260ms em painel e folha, curva única
  ease-out-quart, sem elástico. Movimento comunica estado; nada decorativo.
- **Iconografia:** Lucide, traço 1.75px, 20px em linha e 24px em navegação. Contorno, nunca
  preenchido misturado.
- **Acessibilidade:** WCAG 2.2 AA como piso (4.5:1 texto, 3:1 interface), foco visível,
  navegação por teclado, `prefers-reduced-motion` respeitado. **Cor nunca é o único portador
  de significado:** todo estado negativo carrega ícone ou texto.
- **Voz:** português do Brasil, língua da confeitaria e não do software. "Rendimento do lote",
  não "output". "Quanto sobra pra você", não "margem líquida". Frases curtas. Ensina em uma
  linha, onde o número aparece.

### Sai (é da MyCookie's)

- O vinho (`oklch(0.36 0.128 18)` e família), o creme de papel texturizado, o dourado como
  filete e acento, a serifa Fraunces escolhida para ecoar o logotipo, o motivo do biscoito em
  marca d'água, a textura de papel de embrulho, o descritor "Biscoitos artesanais", e qualquer
  vestígio de "cookie" no nome, no ícone ou na ilustração.
- **Figtree** (a sans de interface) não é da MyCookie's e pode ficar, mas não é obrigatória.
  Se trocar, a substituta precisa ter numerais tabulares e ser gratuita (Google Fonts).

### Muda, e com uma lição aprendida

- **A cor primária não pode ser vizinha do vermelho de erro.** O vinho da MyCookie's e o
  vermelho de "prejuízo / saída de caixa / erro" eram vizinhos de matiz, e isso obrigou o
  sistema inteiro a compensar com ícone e texto. Na marca nova, escolha a primária longe do
  vermelho (matiz OKLCH fora da faixa ~10–40) para que positivo, atenção e negativo fiquem
  inequívocos ao lado dela. A regra "cor nunca é o único portador" continua valendo mesmo
  assim.
- **Os quatro semânticos** (positivo = lucro e entrada; atenção = estoque baixo, custo
  desatualizado, sincronização pendente; negativo = prejuízo, saída e erro; informativo = dica
  de cálculo) precisam existir nos dois temas e passar AA sobre as superfícies.
- **A assinatura visual** (o que hoje é textura de papel + filete dourado + biscoito em traço)
  precisa ser substituída por dois ou três elementos próprios, discretos, que liguem app,
  ícone e material de comunicação sem virar padrão decorativo. Eles aparecem em estado vazio,
  tela de acesso, ícone e peças de divulgação — nunca como ícone de interface.

---

## 6 · O nome

Não tenho nome. É o primeiro entregável da fase 1.

**Critérios:**

- Português do Brasil, ou palavra que soa natural em português. Fácil de falar em áudio de
  WhatsApp, de escrever sem soletrar, de lembrar depois de ouvir uma vez.
- Curto: uma ou duas palavras, até três sílabas fortes.
- **Não diz "cookie"** e, de preferência, não trava em um tipo de doce. Pode evocar cozinha,
  preço, conta, medida, fornada, balança, lucro — ou ser invenção.
- Não soa software corporativo ("gestão", "ERP", "sistema", "pro", "hub", sufixo "-ly",
  "-ify") nem infantil (diminutivo fofo, "docinho").
- Cabe em ícone de app com um símbolo ou uma letra, e como `@handle` no Instagram.
- Disponibilidade plausível de `.com.br` e do handle. Você não consegue verificar INPI nem
  registro de domínio — **marque cada opção com "verificar"** e eu faço a busca.
- Combina com uma tagline curta. A que existe hoje na tela de login é "O preço certo de cada
  doce, antes de mandar o orçamento". Pode mantê-la, evoluí-la ou propor outra; o núcleo
  "preço certo antes de dar o preço" é o que importa.

**Entregue de 6 a 8 opções**, cada uma com: a palavra, a pronúncia, de onde vem, o que evoca,
uma tagline, o risco (soa como outra marca? ambíguo? difícil de digitar?) e como fica em ícone
e em handle. Ordene pela sua recomendação e diga por quê.

---

## 7 · Glossário do produto (as palavras que a marca vai usar)

Estas são as palavras que a confeiteira escolheu e que já estão em todas as telas. O manual de
comunicação as adota; não invente sinônimos de software.

| Palavra                     | O que é                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| **material**                | O que ela compra: farinha, chocolate, saquinho, etiqueta, caixa. Não "insumo". |
| **despensa**                | Onde os materiais ficam; a contagem é "contar a despensa".                     |
| **produto**                 | A receita com custo e preço. Não "ficha técnica".                              |
| **receita**                 | Só o produto que não é kit (sentido estreito).                                 |
| **kit / combo**             | Produto montado de outros; combo é o kit em que a cliente escolhe sabores.     |
| **rende / rendimento**      | Quantas unidades saem de uma receita.                                          |
| **perda**                   | O que se perde do material ao usar (casca, sobra, quebra).                     |
| **fornada**                 | O ato de assar e guardar; o fato datado de produção.                           |
| **o que está pronto**       | O que já foi assado ou a massa no congelador (palavra final ainda em aberto).  |
| **pedido / encomenda**      | A venda combinada; as duas palavras são dela e convivem.                       |
| **caixa**                   | O dinheiro que entrou e saiu no mês; cada linha é um "lançamento".             |
| **meta**                    | O objetivo do mês, traduzido em "quantos doces por semana".                    |
| **quanto sobra pra você**   | A sobra em reais por unidade depois de custo e taxa. Não "margem líquida".     |
| **maquininha**              | A taxa de cartão. Não "taxa de adquirência".                                   |
| **custo desatualizado**     | O selo no produto quando um material mudou de preço.                           |
| **salvo no aparelho**       | O selo discreto de escrita pendente sem internet. Não "erro de sincronização". |
| **a lista / o que comprar** | A lista do mercado gerada dos pedidos.                                         |

---

## 8 · Entregáveis da fase 2

### 8.1 Estratégia de marca

- Posicionamento em uma página: para quem, contra o quê, promessa, prova.
- Personalidade e arquétipo, com o que a marca **é** e **não é** em pares.
- Manifesto curto (até 120 palavras), na voz da marca, para a página inicial e o Instagram.
- Arquitetura: como a marca convive com a MyCookie's como cliente e caso (regra de
  co-branding: "a MyCookie's usa [nome]", nunca o contrário).

### 8.2 Identidade visual

- **Logotipo:** versão principal, símbolo isolado, horizontal, empilhada, monocromática
  positiva e negativa. Em SVG.
- **Ícone de app:** 512×512 e 192×192 para Android, 180×180 para iPhone, mais a versão
  _maskable_ (conteúdo dentro dos 80% centrais, fundo cheio). Em SVG e PNG. Precisa ler bem
  a 48px na tela de início ao lado de WhatsApp e Instagram.
- **Paleta**, em OKLCH e hex: cor de marca em escala (900 a 100), neutros tingidos para tema
  claro e escuro (fundo, superfície, superfície rebaixada, borda, borda forte, tinta, tinta
  apagada, tinta sutil), os quatro semânticos nos dois temas, e a versão "como tinta" da cor de
  marca sobre cada tema. Tabela de contraste AA para cada par usado.
- **Tipografia:** as duas famílias (Google Fonts, gratuitas), com a escala de sete papéis
  (display, title, heading, subheading, body, label, micro) em tamanho, altura de linha e
  peso; a regra dos números.
- **Assinatura visual:** os dois ou três elementos próprios da seção 5, com regra de uso.
- **Ilustração / fotografia:** direção para estado vazio, onboarding e material de divulgação.
  Se propuser ilustração, mostre três exemplos no estilo; se propuser fotografia, o brief de
  foto.
- **Motion:** confirmação da curva e das durações, mais a animação de abertura do app (se
  houver) e do ícone de "salvo".

### 8.3 Manual de marca

- Usos corretos e incorretos do logotipo (área de proteção, tamanho mínimo, fundos permitidos,
  sobre foto, o que não fazer).
- Regras de cor: proporções, o que nunca preenche área grande, como inverter no escuro.
- Regras de tipografia: hierarquia, quando a display entra e quando não.
- Aplicação da assinatura visual.
- Co-branding com clientes (a MyCookie's é o exemplo).
- Rodapé de documento da confeiteira: o orçamento em A4 é dela para a cliente dela. A marca
  aparece só como uma linha discreta "feito com [nome]", opcional. **A marca nunca fica entre
  a confeiteira e a cliente dela** — o resumo de WhatsApp, por exemplo, não leva marca.

### 8.4 Manual de comunicação

- Voz e tom, com a tabela de variação por situação: estado vazio, erro de validação, sem
  internet, meta batida, prejuízo detectado, cobrança e trial, e-mail de convite.
- O glossário da seção 7, adotado e estendido.
- Vinte exemplos de microcopy reescritos na voz da marca: título e frase de estado vazio para
  Materiais, Produtos, Pedidos, Caixa e Compras; a mensagem de escrita pendente; a de trial
  acabando; a de custo desatualizado; a de "dá pra fazer?"; a de meta.
- Modelos: post de Instagram (carrossel educativo sobre precificação), stories, e-mail de
  boas-vindas, e-mail de "seu teste acaba em 3 dias", mensagem de convite ao beta, descrição
  de loja de app / PWA (até 160 caracteres).
- O que a marca nunca diz: jargão contábil sem tradução, tom de coach, tom de aplicativo
  fofo, promessas de ERP.

### 8.5 Design system

Entregue como **tokens em CSS custom properties** (OKLCH, com fallback hex comentado) prontos
para Tailwind v4, mais a documentação em markdown. Estrutura:

- Tokens: cor (marca, superfícies claro/escuro, semânticos, tinta), tipografia (famílias,
  escala), espaçamento (base 4), raio, sombra, motion (durações, curva), z-index.
- Componentes, cada um com todos os estados (`default`, `hover`, `focus-visible`, `active`,
  `disabled`, `loading`, `error`) e nos dois temas: botão (primário, secundário, terciário,
  destrutivo), botão flutuante (pílula), campo de texto, campo monetário, seletor, lista com
  divisórias, linha de lista com alvo inteiro, cartão (só onde cabe), painel lateral / folha
  inferior, modal de confirmação destrutiva, selo de status (os status de pedido), selo de
  sincronização, estado vazio, esqueleto de carregamento, cabeçalho de página, navegação
  inferior (cinco destinos) e barra lateral (240px, na cor da marca), pílulas de filtro, faixa
  de aviso (atenção e informativo), barra de progresso de meta, tabela densa com numerais
  tabulares.
- Padrões: um botão primário por tela; onde vive a ação primária no celular e no desktop; como
  um número mostra sua consequência (o par "preço + sobra"); como um erro aparece sem depender
  de cor; como a tela diz "sem internet".
- Checklist de acessibilidade por componente.

### 8.6 Aplicações

- Ícone na tela de início do celular (Android e iPhone), tela de abertura, tela de login.
- Página inicial de venda (uma dobra): manchete, a frase do preço, prova (o caso MyCookie's),
  preço do plano, botão de teste grátis. Celular e desktop.
- Instagram: avatar, capa de destaque, um post de feed, um carrossel de três telas, um story.
- E-mail transacional (boas-vindas) com cabeçalho e rodapé da marca.
- Cartão de visita ou adesivo de embalagem "feito com [nome]" (o que a confeiteira poderia
  colar na caixa, se quisesse).
- Uma lâmina de apresentação (para a professora de confeitaria que vai indicar o produto).

### 8.7 Telas de exemplo do aplicativo

Celular (360×800) e desktop (1280 de largura, barra lateral de 240px), tema claro e escuro, com
os **dados reais da seção 10** para as maquetes não parecerem lorem ipsum:

1. **Hoje:** saudação, o caminho dos primeiros passos (cinco passos, dois feitos), agenda de
   entregas de hoje e amanhã, cartão da meta, cartão de compras.
2. **Produtos, lista:** filtro Todos · Receitas · Kits, cada linha com nome, custo por unidade,
   preço, sobra, e o selo "custo desatualizado" em uma delas; a resposta "dá pra fazer N".
3. **Produto, editor:** nome, rende, tempo, os materiais da receita, o bloco "O custo do lote"
   parcela por parcela, e o **painel de preço preso ao pé da tela** com custo, preço sugerido
   por margem, preço praticado e "sobram R$ X pra você" — é a tela mais importante do produto.
4. **Pedidos:** agenda agrupada por dia com o total do dia, selos de status, faixa "a receber"
   e "entregas a pagar", filtro por status.
5. **Pedido, editor:** cliente, data, itens com preço congelado, rodapé fixo de totais, bloco
   de pagamento, o botão de mandar o resumo pelo WhatsApp.
6. **Caixa:** resultado do mês com o que a maquininha levou, movimento por dia, saídas por
   categoria, o produto que mais deu lucro, a meta e o botão "Recalcular o mês".
7. **Compras:** a lista do mercado por corredor, linha com alvo inteiro, preço corrigível,
   total restante preso ao pé.
8. **Materiais, estado vazio:** com o botão "Começar com o que toda cozinha tem".
9. **Login** e a tela "sem internet, salvo no aparelho".

Cada tela vem com um parágrafo dizendo o que ela precisa provar (por exemplo: "na 3, o preço
e a sobra são lidos antes de qualquer outra coisa, a meio metro, com o celular na bancada").

---

## 9 · Formato de entrega

Preciso poder colocar isto no repositório do produto sem retrabalho:

- `MARCA.md` — estratégia, manual de marca e manual de comunicação, em markdown.
- `DESIGN.md` — o design system, **nesta estrutura**, que é a do documento atual e a que o
  código já segue: Visual Theme (com Tema e Color Strategy) · Color Palette (Marca, Superfícies,
  Semânticos) · Typography (famílias, Escala, Números) · Layout & Spacing (Estrutura responsiva,
  Toque, Cartões) · Components · Motion · Iconography · Signature.
- `tokens.css` — as custom properties em OKLCH, nos dois temas, com nomes em inglês curto
  (`--brand-700`, `--canvas`, `--surface`, `--ink`, `--positive`…), porque é assim que o código
  as consome.
- `logo/` — os SVGs e PNGs da seção 8.2, com nomes previsíveis.
- Telas e aplicações como imagens (PNG, 2x) e, onde você conseguir, como HTML/CSS estático
  usando os próprios tokens — é a melhor prova de que os tokens funcionam.
- Um `LEIA-ME.md` de uma página dizendo o que é cada arquivo.

---

## 10 · Dados reais para as maquetes

Os valores em negrito saem dos casos de teste do sistema; os demais são plausíveis e estão
na mesma ordem de grandeza. Use-os; não invente valores redondos.

- **Um cookie clássico:** rende 20 unidades por receita, 45 minutos de produção. Custo por
  unidade **R$ 4,41** (materiais R$ 3,12 · embalagem R$ 0,45 · hora dela R$ 0,56 · gás e
  energia R$ 0,18 · fixos R$ 0,10). Preço sugerido com 45% de margem: **R$ 8,50**. Preço
  praticado R$ 8,00. Taxa da maquininha 4,99%. Sobram R$ 3,19 pra você no preço praticado.
- **Materiais de exemplo:** farinha de trigo 1 kg (perda 5%); chocolate 53% **1,01 kg por
  R$ 40,00**; manteiga **R$ 17,50**; gotas de chocolate 1 kg R$ 32,00; saquinho c/ 100
  R$ 12,00; caixa para 6 **c/ 25, R$ 2,00 a caixa**; etiqueta c/ 200 R$ 18,00.
- **Um pedido:** Carla · sábado · 20 cookies clássicos a R$ 8,00 + 2 caixas de 6 a R$ 38,90 ·
  subtotal **R$ 237,80** · desconto R$ 5,00 · entrega R$ 7,20 · total **R$ 240,00** · custo
  R$ 152,20 · maquininha R$ 11,98 · **sobram R$ 75,82**. Status: confirmado.
- **A lista do mercado** para 32 cookies (20 soltos + 2 caixas de 6): farinha 842 g físicos
  (800 g úteis) → 1 pacote de 1 kg; saquinhos não entram (a despensa cobre); caixa leva 25
  porque é assim que se vende caixa. Total da lista **R$ 120,00**.
- **O mês:** entradas R$ 3.840,00 · saídas R$ 1.612,40 · maquininha levou R$ 143,20 ·
  resultado R$ 2.084,40 · 18 pedidos · ticket médio R$ 213,33 · produto que mais sobrou:
  cookie recheado. Meta do mês R$ 4.500,00 → faltam 83 cookies, 21 por semana.
- **Despensa:** 14 materiais contados há 3 dias, 2 sem contagem há mais de 15 dias. Pronto no
  pote: 24 cookies clássicos, 12 recheados. "Dá pra fazer 60 clássicos com o que tem em casa,
  descontando os 20 prometidos pra sábado."

---

## 11 · Como vou avaliar o que você entregar

- **O teste da bancada:** abro a tela do produto no celular, a meio metro, com luz de cozinha.
  Leio o preço e a sobra antes de qualquer outra coisa? Os alvos são tocáveis com o dedo
  enfarinhado?
- **O teste da desassociação:** ponho a tela nova ao lado da caixa da MyCookie's. Ninguém diz
  que é a mesma marca.
- **O teste da confeiteira de bolo:** uma confeiteira que faz bolo de festa, não cookie, se
  reconhece no nome, no ícone e na página inicial?
- **O teste do vizinho de matiz:** um prejuízo em vermelho ao lado da cor da marca é
  inequívoco sem ler o ícone? (E o ícone está lá mesmo assim.)
- **O teste do escuro:** a mesma marca, invertida, à noite. Não é um "modo escuro" colado.
- **O teste do repositório:** os tokens caem no `globals.css` e as telas de exemplo poderiam
  ter sido renderizadas pelo código atual só trocando os valores.
- **O teste da planilha e o teste do Linear:** não parece nenhum dos dois.
- **O teste da voz:** leio a microcopy em voz alta para a Maynara. Ela entende sem perguntar
  o que uma palavra quer dizer.

Se algum destes falhar, prefiro que você diga onde e por quê a fingir que passou.
