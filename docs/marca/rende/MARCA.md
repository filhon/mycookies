# Rende · marca

Território **Ponto**. Nome escolhido: **Rende**. Documento de marca do sistema de
precificação e produção vendido como SaaS para confeiteiras e produtoras artesanais de comida.
A MyCookie's é a primeira cliente e o primeiro caso — não é dona da marca.

Escrito para o repositório do produto. Tudo aqui é português do Brasil.

---

## 1 · Estratégia

### 1.1 Posicionamento em uma página

**Para quem.** A confeiteira artesanal que trabalha sozinha: compra, produz, embala, vende,
entrega e fecha o caixa. Não é técnica, não tem equipe. Cookie, bolo, brigadeiro, salgado,
pão — o produto muda, o problema não.

**Contra o quê.** A planilha do curso, o caderno, a calculadora do celular e a intuição. No
extremo oposto, o ERP genérico que ela abre e fecha. Não competimos por preço de software.

**Promessa.** Descubra quanto você realmente ganha em cada doce — antes de dar o preço.

**Prova.** O custo por unidade aberto parcela por parcela: R$ 4,41 = materiais 3,12 ·
embalagem 0,45 · a hora dela 0,56 · gás e energia 0,18 · fixos rateados 0,10. Preço sugerido
com 45% de margem: R$ 8,50. No preço praticado de R$ 8,00 sobram R$ 3,19 por unidade depois da
maquininha. E a MyCookie's, em uso diário, com esses números.

**A frase que o produto existe para dizer.** "Este doce te custa R$ 3,41 e você deveria cobrar
R$ 8,50."

**O que vendemos.** Não um app de R$ 29. O número que mostra os R$ 600 por mês que estavam
indo embora no preço errado.

### 1.2 Personalidade e arquétipo

**Arquétipo:** o Instrumento de precisão em mãos experientes. Não é o Sábio (não ensina de
cima), não é o Mago (não promete transformação), não é o Cuidador (não passa a mão na cabeça).
É a balança da bancada: você confia nela porque ela não tem opinião.

| A marca é                     | A marca não é          |
| ----------------------------- | ---------------------- |
| direta                        | seca                   |
| precisa                       | detalhista             |
| calma                         | lenta                  |
| confiante                     | arrogante              |
| da cozinha                    | caseira                |
| ferramenta de dona de negócio | brinquedo de loja      |
| honesta sobre o que não sabe  | alarmista              |
| professora de uma linha       | curso de contabilidade |

**Regra de ouro:** o sistema faz a conta, ela toma a decisão. A marca nunca decide pela
confeiteira e nunca esconde como chegou no número.

### 1.3 Manifesto (para a página inicial e o Instagram)

> Você sabe fazer doce. Isso nunca foi o problema.
>
> O problema é o saquinho que ninguém soma, o gás que ninguém conta, a sua hora que ninguém
> cobra e a taxa da maquininha que chega depois.
>
> O Rende soma tudo isso antes de você dar o preço. Abre parcela por parcela, mostra quanto
> custa de verdade, sugere quanto cobrar e diz, em reais, quanto sobra pra você.
>
> Sem palavra de contador. Sem planilha. Na bancada, com a mão suja de massa.
>
> Você continua decidindo o preço. Só não decide mais no escuro.

(112 palavras.)

### 1.4 Arquitetura de marca

Uma marca, um produto: **Rende**. Sem sub-marcas, sem nomes de módulo ("Rende Caixa" não
existe — é a aba Caixa do Rende).

A relação com a confeiteira cliente é sempre de ferramenta para negócio:

- **Certo:** "A MyCookie's usa o Rende." / "Feito com Rende."
- **Errado:** "Rende MyCookie's", "MyCookie's by Rende", logo do Rende ao lado do logo da
  cliente com o mesmo peso.

A MyCookie's aparece como **caso**, com o logo dela e as palavras dela, em depoimento e prova.
O Rende não empresta nem toma emprestado cor, tipografia ou símbolo da cliente.

**A marca nunca fica entre a confeiteira e a cliente dela.** O resumo de WhatsApp não leva
marca. O orçamento em A4 é dela; o Rende aparece no rodapé como uma linha discreta e
desligável: "feito com Rende".

---

## 2 · Manual de marca

### 2.1 Logotipo

Arquivos em `logo/`:

| Arquivo                                         | Uso                                                 |
| ----------------------------------------------- | --------------------------------------------------- |
| `rende-principal.svg`                           | logotipo em tinta sobre fundo claro                 |
| `rende-principal-negativa.svg`                  | logotipo em creme sobre tinta                       |
| `rende-mono-positiva.svg` / `-negativa.svg`     | uma cor só: fax, gravação, bordado, carimbo         |
| `rende-simbolo.svg`                             | símbolo isolado (régua + ponto)                     |
| `rende-horizontal.svg`                          | símbolo + logotipo lado a lado                      |
| `rende-empilhada.svg`                           | símbolo sobre logotipo, centralizado                |
| `icone-app-512.svg/png`, `-192.png`, `-180.png` | ícone de app                                        |
| `icone-app-maskable-512.svg/png`                | _maskable_ (conteúdo nos 80% centrais, fundo cheio) |

**Construção.** Logotipo: "rende" em Archivo 700, caixa baixa, tracking -0.03em, fechado por
um **ponto âmbar** na altura da linha de base. O ponto é a assinatura; é ele que sobrevive
quando o resto some. Símbolo: uma régua creme fechada pelo mesmo ponto âmbar, sobre tinta.

**Área de proteção.** Igual à altura do "r" em todos os lados. No ícone, nada entra.

**Tamanho mínimo.** Logotipo: 88px de largura em tela, 24mm impresso. Símbolo e ícone: 48px.
Abaixo disso, só o símbolo.

**Fundos permitidos.** `--brand-700` a `--brand-900`, `--canvas`, `--surface`, branco, e
foto com área de contraste controlado. Nunca sobre `--accent-500` (o ponto desaparece), nunca
sobre semântico.

**Sobre foto.** Só a versão negativa, sobre região escura e lisa da imagem; se a foto for
clara ou movimentada, use uma tarja de tinta e o logotipo dentro dela.

**O que não fazer.** Não trocar a cor do ponto. Não usar o ponto sozinho como ícone de
interface. Não inclinar, não deformar, não contornar, não aplicar sombra, gradiente ou
brilho. Não escrever "Rende" em outra fonte que não Archivo. Não usar caixa alta ("RENDE").
Não recriar o símbolo com utensílio de cozinha (colher, batedeira, cupcake) — a marca é de
precificação, não de confeitaria.

### 2.2 Cor

**Proporção de referência:** ~70% neutros (canvas e surface), ~25% tinta de marca (cromo:
barra lateral, cabeçalho de contexto, painel de preço), ~5% âmbar.

**O âmbar nunca preenche área grande.** Ele é o ponto: aparece no logotipo, no botão de ação
primária, no valor que decide e nas marcas de atenção. Duas peças âmbar disputando na mesma
tela é erro.

**Nunca:** neutro puro (todo cinza carrega matiz), âmbar como fundo de página, semântico como
cor de marca, gradiente entre marca e acento.

**Inversão no escuro.** A cor de estrutura vira fundo e a superfície vira tinta: `--canvas`
passa a ser a tinta da marca escurecida, `--ink` passa a ser o creme. O âmbar sobe de
luminosidade (`oklch(0.78 0.13 78)`) para manter 4.5:1 sobre `--surface`. Não é um "modo
escuro" colado: é a mesma marca com os papéis trocados.

**O teste do vizinho de matiz.** A primária está em matiz 272 — a 245° do vermelho de erro.
Prejuízo em vermelho ao lado da cor da marca é inequívoco. Mesmo assim, **cor nunca é o único
portador de significado**: todo estado negativo leva ícone e palavra.

### 2.3 Tipografia

**Archivo** (display) e **Figtree** (interface), ambas gratuitas no Google Fonts. Figtree fica
porque já está no código e tem numerais tabulares.

A display entra em: título de página, valor financeiro em destaque, número de estado vazio,
manchete de peça. **Não** entra em: rótulo, tabela, formulário, navegação, corpo longo,
microcopy.

Todo valor monetário em numerais tabulares, peso 600, com o "R$" menor e apagado e o número em
destaque. Números que se comparam em coluna ficam alinhados à direita.

### 2.4 Assinatura visual

Dois elementos, e só dois:

1. **O ponto âmbar.** Um círculo cheio, sempre único na peça, marcando o número que decide.
   Aparece no logotipo, no ícone, no painel de preço, no estado vazio e nas peças de
   divulgação. Nunca como ícone de interface, nunca em série (três pontos = decoração).
2. **A faixa de composição.** A barra horizontal segmentada em proporção ao custo real do
   lote: materiais · embalagem · sua hora · gás e energia · fixos. É gráfico e grafismo ao
   mesmo tempo, sempre com dados verdadeiros — nunca uma faixa "decorativa" com proporções
   inventadas. O segmento "sua hora" é o âmbar.

Uso: uma assinatura por peça. Nunca as duas na mesma composição, exceto no editor de produto,
onde a faixa é dado e o ponto é o painel de preço.

### 2.5 Co-branding e documentos da confeiteira

- **Site, Instagram, e-mail, app:** marca Rende à vontade.
- **Caso de cliente:** logo da cliente em destaque, Rende como legenda ("a MyCookie's usa o
  Rende"), nunca lock-up.
- **Orçamento A4 da confeiteira:** cabeçalho e cores são dela. O Rende aparece em uma linha de
  rodapé de 8pt, tinta apagada: "feito com Rende". Desligável nas configurações.
- **Resumo de WhatsApp, etiqueta, embalagem:** sem marca Rende. A relação dela com a cliente é
  dela.
- **Adesivo "feito com Rende":** opcional, oferecido, nunca obrigatório.

---

## 3 · Manual de comunicação

### 3.1 Voz

Português do Brasil, língua da confeitaria e não do software. Frases curtas. Verbo na segunda
pessoa ("você"), sem imperativo seco. Ensina em uma linha, no lugar onde o número aparece.
Número sempre com sua consequência.

### 3.2 Tom por situação

| Situação              | Tom                           | Exemplo                                            |
| --------------------- | ----------------------------- | -------------------------------------------------- |
| Estado vazio          | convida e ensina a tela       | "Cadastre a farinha e o resto vem fácil."          |
| Erro de validação     | específico, sem culpa         | "O rendimento precisa ser maior que zero."         |
| Sem internet          | normal, não alarme            | "Salvo no aparelho. Sobe quando você tiver sinal." |
| Meta batida           | reconhece e para              | "Meta do mês batida: R$ 4.512,00."                 |
| Prejuízo detectado    | direto, com o caminho         | "Neste preço você perde R$ 0,38 por unidade."      |
| Cobrança e teste      | claro, sem pressão            | "Seu teste acaba em 3 dias. Depois é R$ 29/mês."   |
| Convite ao beta       | pessoal, curto                | "Quero te mostrar antes de abrir pra todo mundo."  |
| Ensinar contabilidade | uma frase, no lugar do número | "Margem é quanto do preço sobra: 45% de R$ 8,50."  |

### 3.3 Glossário adotado

material · despensa · produto · receita · kit / combo · rende / rendimento · perda · fornada ·
o que está pronto · pedido / encomenda · caixa (lançamento) · meta · quanto sobra pra você ·
maquininha · custo desatualizado · salvo no aparelho · a lista / o que comprar.

Extensões da marca: **o ponto** (o número que decide numa tela) · **a faixa** (a composição do
custo) · **teste grátis** (nunca "trial") · **assinatura** (nunca "plano pro").

Proibidos: insumo, ficha técnica, output, margem líquida, taxa de adquirência, SKU, dashboard,
onboarding, engajamento, erro de sincronização.

### 3.4 Vinte microcopy na voz da marca

1. **Materiais, vazio · título:** "Sua despensa começa aqui."
2. **Materiais, vazio · frase:** "Cadastre o que você compra — farinha, saquinho, caixa — e o
   custo de cada doce sai sozinho." · botão "Começar com o que toda cozinha tem"
3. **Produtos, vazio · título:** "Nenhum produto com preço ainda."
4. **Produtos, vazio · frase:** "Monte uma receita, diga quanto ela rende, e o Rende mostra
   quanto custa e quanto cobrar."
5. **Pedidos, vazio · título:** "Nenhuma encomenda combinada."
6. **Pedidos, vazio · frase:** "Anote o pedido com o preço de hoje. Ele fica congelado mesmo
   se o chocolate subir amanhã."
7. **Caixa, vazio · título:** "O mês está em branco."
8. **Caixa, vazio · frase:** "Lance o que entrou e o que saiu. No fim do mês você vê o que
   sobrou de verdade, já sem a maquininha."
9. **Compras, vazio · título:** "Nada pra comprar esta semana."
10. **Compras, vazio · frase:** "Quando você confirmar um pedido, a lista aparece aqui — só o
    que falta na despensa."
11. **Escrita pendente:** "Salvo no aparelho · 3 alterações sobem quando você tiver sinal."
12. **Sem internet, tela cheia:** "Sem internet, e tudo bem. Você pode consultar preço,
    anotar pedido e contar a despensa. Nada se perde."
13. **Teste acabando:** "Seu teste acaba em 3 dias. Nesse tempo o Rende achou R$ 612 de
    prejuízo em 4 produtos seus."
14. **Custo desatualizado (selo):** "custo desatualizado"
15. **Custo desatualizado (faixa):** "O chocolate 53% subiu 8%. Três produtos usam ele —
    recalcular?"
16. **Dá pra fazer? · positivo:** "Dá pra fazer 60 clássicos com o que tem em casa,
    descontando os 20 prometidos pra sábado."
17. **Dá pra fazer? · negativo:** "Faltam 380 g de chocolate 53% pra fechar os 15 pedidos de
    sábado. Já está na lista."
18. **Meta em andamento:** "Faltam R$ 660 pra meta: 83 cookies, 21 por semana."
19. **Prejuízo por unidade:** "No preço praticado você perde R$ 0,38 por unidade. O mínimo pra
    não perder é R$ 4,64."
20. **Confirmação destrutiva:** "Apagar o pedido da Carla? Os R$ 240,00 saem do caixa e da
    agenda de sábado." · botões "Apagar pedido" / "Deixar como está"

### 3.5 Modelos

**Instagram · carrossel educativo (6 telas)**

1. "Seu cookie custa R$ 4,41. Você sabia?"
2. "Materiais: R$ 3,12. É o único número que a maioria soma."
3. "Embalagem: R$ 0,45. O saquinho e a etiqueta são custo."
4. "Sua hora: R$ 0,56. 45 minutos de trabalho por fornada."
5. "Gás, energia e fixos: R$ 0,28. Pequenos, e todo mês."
6. "Com 45% de margem, R$ 8,50. Cobrando R$ 8,00, sobram R$ 3,19 — já sem a maquininha." ·
   "Feito no Rende. Teste 14 dias."

**Stories (3 quadros):** "Quanto sobra pra você neste doce?" → "Se a resposta for 'acho que
uns 3 reais', a gente tem uma conta pra te mostrar." → "rendeapp.com.br · 14 dias grátis"

**E-mail de boas-vindas**
Assunto: "Bem-vinda ao Rende. Comece por um produto só."
Corpo: "Oi, [nome]. Você tem 14 dias. Não precisa cadastrar tudo: escolha o doce que você mais
vende, monte a receita e veja o custo real por unidade. Leva uns dez minutos. Se o preço que
aparecer te surpreender, era exatamente pra isso. — Precisa de ajuda? Responde este e-mail."

**E-mail de teste acabando**
Assunto: "Faltam 3 dias — e o que o Rende já achou"
Corpo: "Oi, [nome]. Seu teste acaba em [data]. Até aqui você precificou [n] produtos, e em
[n] deles o preço estava abaixo do custo + margem. A assinatura é R$ 29/mês, ou R$ 290 no ano.
Seus dados ficam do jeito que estão."

**Convite ao beta (WhatsApp)**
"Oi, [nome]! Sou o [nome], desenvolvi um sistema de precificação junto com a Maynara, da
MyCookie's. Ele calcula o custo real de cada doce — incluindo embalagem, seu tempo e a
maquininha — e diz quanto cobrar. Queria te dar acesso antes de abrir, de graça, pra ouvir o
que falta. Posso te mandar o link?"

**Descrição de loja / PWA (160 caracteres)**
"Calcule o custo real de cada doce — materiais, embalagem, sua hora, maquininha — e veja
quanto cobrar e quanto sobra pra você." (139 caracteres.)

**Lâmina para a professora de confeitaria**
Manchete: "Suas alunas saem do curso com a planilha. Elas podiam sair com a conta certa."
Apoio: a frase do preço, as três telas (produto, pedido, caixa), o caso MyCookie's, e o
convite de indicação.

### 3.6 O que a marca nunca diz

- Jargão contábil sem tradução: "margem de contribuição", "custo indireto rateado", "DRE".
- Tom de coach: "você merece lucrar", "chegou a sua hora", "mindset de empresária".
- Tom de aplicativo fofo: "oi, docinho", "vamos adoçar suas contas", emoji na interface.
- Promessa de ERP: "gestão completa", "tudo em um só lugar", "emita sua nota".
- Alarme por bobagem: "erro de sincronização", "atenção!", vermelho para escrita pendente.
