# Rende · marca

Território **Porções** (substituiu o Ponto em out/2026; histórico em `_arquivo-ponto/`). Nome escolhido: **Rende**. Documento de marca do sistema de
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

**O que vendemos.** Não um app de R$ 39. O número que mostra os R$ 600 por mês que estavam
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

Território **Porções**. Arquivos em `logo/` (todos em curvas, sem dependência de fonte):

| Arquivo                                                    | Uso                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `rende-principal.svg`                                      | logotipo cobalto sobre fundo claro                                      |
| `rende-principal-negativa.svg`                             | logotipo papel sobre cobalto                                            |
| `rende-mono-positiva.svg` / `-negativa.svg`                | uma cor só: carimbo, gravação, bordado; mono positiva também sobre rosa |
| `rende-simbolo.svg` / `-negativa.svg` / `-mono-*.svg`      | símbolo isolado: a assadeira em quatro porções                          |
| `rende-horizontal.svg` / `-negativa.svg`                   | símbolo + logotipo lado a lado                                          |
| `rende-empilhada.svg` / `-negativa.svg`                    | símbolo sobre logotipo, centralizado                                    |
| `icone-app-512.svg/png`, `-192.png`, `-180.png`, `-48.png` | ícone de app                                                            |
| `icone-app-maskable-512.svg/png`                           | _maskable_ (conteúdo nos 80% centrais, fundo cheio)                     |
| `_geometria.json`                                          | medidas, ângulo e o contorno do logotipo, para regenerar                |

**Construção.** "rende" em Familjen Grotesk 700, caixa baixa, tracking +1%, convertido em
curvas. A largura é dividida em **cinco porções iguais** por quatro cortes vazados, inclinados
**8° para a direita**, com espessura de 11% da altura do logotipo. Os cortes caem pela medida,
não pelas letras. O tracking foi escolhido para que nenhum corte deixe lasca. **Símbolo:** a
assadeira, um retângulo de 1,18 × a altura do logotipo, cortado em quatro com o mesmo ângulo e
a mesma espessura; a última porção é rosa. É a única peça rosa da marca.

**Área de proteção.** Uma porção do logotipo (1/5 da largura) em todos os lados.

**Tamanho mínimo.** Logotipo: 96px de largura em tela, 26mm impresso. Símbolo: 24px.

**Fundos permitidos.** Papel (`--canvas`, `--surface`), branco, cobalto `--brand-700` a
`--brand-900`, e foto com área lisa e escura (versão negativa). Sobre rosa, só a mono positiva
e só em peça de divulgação. Nunca sobre semântico.

**O que não fazer.** Mudar número, posição, espessura ou inclinação dos cortes. Preencher os
cortes com cor. Pintar o logotipo de rosa ou pôr a porção rosa no logotipo. Caixa alta,
outra fonte, contorno, sombra, gradiente. Transformar a assadeira em utensílio, doce ou
gráfico de barras com cores inventadas.

### 2.2 Cor

**Proporção de referência:** ~70% papel (canvas e surface), ~25% cobalto (cromo: barra
lateral, cabeçalho de contexto, painel de preço, botão primário), ~5% rosa.

**O rosa marca uma coisa só: o que sobra pra ela.** A porção do símbolo, o valor "sobram R$ X
pra você", a última porção da faixa. Não é cor de botão nem de destaque genérico. Uma por
peça.

**Nunca:** neutro puro, rosa como fundo de tela de produto, rosa em texto de prejuízo,
semântico como cor de marca, gradiente.

**Vizinho de matiz.** O rosa (matiz 5) e o vermelho de erro (matiz 32) são vizinhos. Separam-se
por luminosidade (rosa claro, vermelho escuro) e por regra: todo estado negativo leva ícone
`trending-down` e palavra. O informativo é petróleo (matiz 205), longe do cobalto.

**Escuro.** O cobalto escurece e vira noite (`--canvas` #081025), o papel vira tinta, o rosa
sobe para #FA9FB4.

### 2.3 Tipografia

**Familjen Grotesk** (display, a mesma do logotipo) e **Figtree** (interface), ambas no Google
Fonts. A display entra em título de página, valor em destaque, número de estado vazio e
manchete de peça. Não entra em rótulo, tabela, formulário, navegação ou microcopy.

Todo valor monetário em numerais tabulares, peso 600, "R$" menor e apagado.

### 2.4 Assinatura visual

1. **O corte.** A linha vazada de 8°, sempre com a mesma inclinação. Divide o que é dividido:
   a faixa de composição, seções de peça, o lote em unidades. Nunca decorativo em série solta.
2. **A porção rosa.** A parte que fica com a confeiteira. Única na peça.

**A faixa de composição** junta as duas: o preço praticado dividido em porções proporcionais
ao custo real (materiais · embalagem · sua hora · gás e energia · fixos · maquininha · sobra),
separadas pelo corte, com a sobra em rosa. Sempre com dados verdadeiros.

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
| Cobrança e teste      | claro, sem pressão            | "Seu teste acaba em 3 dias. Depois é R$ 39/mês."   |
| Convite ao beta       | pessoal, curto                | "Quero te mostrar antes de abrir pra todo mundo."  |
| Ensinar contabilidade | uma frase, no lugar do número | "Margem é quanto do preço sobra: 45% de R$ 8,50."  |

### 3.3 Glossário adotado

material · despensa · produto · receita · kit / combo · rende / rendimento · perda · fornada ·
o que está pronto · pedido / encomenda · caixa (lançamento) · meta · quanto sobra pra você ·
maquininha · custo desatualizado · salvo no aparelho · a lista / o que comprar.

Extensões da marca: **a porção** (o que sobra pra ela) · **o corte** · **a faixa** (a composição
do preço) · **teste grátis** (nunca "trial") · **assinatura** (nunca "plano pro").

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
uns 3 reais', a gente tem uma conta pra te mostrar." → "rende.com.br · 14 dias grátis"

**E-mail de boas-vindas**
Assunto: "Bem-vinda ao Rende. Comece por um produto só."
Corpo: "Oi, [nome]. Você tem 14 dias. Não precisa cadastrar tudo: escolha o doce que você mais
vende, monte a receita e veja o custo real por unidade. Leva uns dez minutos. Se o preço que
aparecer te surpreender, era exatamente pra isso. — Precisa de ajuda? Responde este e-mail."

**E-mail de teste acabando**
Assunto: "Faltam 3 dias — e o que o Rende já achou"
Corpo: "Oi, [nome]. Seu teste acaba em [data]. Até aqui você precificou [n] produtos, e em
[n] deles o preço estava abaixo do custo + margem. A assinatura é R$ 39/mês, ou R$ 390 no ano.
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
