Você já fez esse caminho com o Igreja.app, então vou pular a parte de multi-tenant/RLS/LGPD e focar no que muda nesse nicho específico.

## 1. O produto não é "gestão", é precificação

Confeiteira pequena não acorda querendo "gerir a produção". Ela acorda com medo de estar vendendo no prejuízo. Esse é o único problema que ela sabe nomear e pelo qual paga.

Tudo o que você já tem (insumos, despensa, caixa, receitas) é infraestrutura para entregar uma frase: _"esse cookie te custa R$ 3,41 e você deveria cobrar R$ 8,50"_. Posicione o produto por essa frase, não pela lista de módulos.

Consequência prática: o cálculo de custo precisa ser mais honesto que o da planilha dela. Isso significa incluir o que quase ninguém inclui — perda/quebra por fornada, embalagem e etiqueta, gás e energia, mão de obra da própria dona (o erro clássico é ela não se pagar), frete de insumo, taxa de maquininha/iFood, e custo de amostra/degustação. Se o seu número for igual ao da planilha, você é um app bonito. Se for diferente e defensável, você é indispensável.

## 2. O gargalo é o cadastro inicial, não a feature

O maior motivo de abandono vai ser: ela se cadastra, vê uma tela vazia pedindo 40 insumos, e fecha. Você precisa reduzir o tempo até o primeiro "ahá" (primeira receita precificada) para uns 10 minutos.

Caminhos que funcionam:

- Biblioteca pré-cadastrada de insumos com preços médios regionais editáveis (farinha, açúcar mascavo, chocolate 53%, manteiga, gotas, embalagem). Ela ajusta, não digita do zero.
- Importação de nota fiscal: leitura do QR code da NFC-e do atacadista já traz itens e preços. Isso é um diferencial gigante e tecnicamente viável.
- Receitas-modelo de cookie prontas para clonar.
- Onboarding em uma pergunta só: "quantos cookies você faz por fornada?" e vai puxando o resto.

## 3. O que transforma em hábito semanal

Precificação é evento raro (ela precifica uma vez e some por dois meses). Churn vem daí. Você precisa de um motivo para ela abrir o app toda semana:

- Lista de compras gerada pelos pedidos da semana, já somando insumo faltante contra a despensa.
- Agenda de produção: quais encomendas, quando assar, quando entregar.
- Fechamento do mês em uma tela: quanto entrou, quanto sobrou, qual sabor deu mais margem.
- Alerta de custo: "o preço do chocolate subiu 12%, 4 das suas receitas ficaram no vermelho". Esse é o tipo de notificação que salva assinatura.

## 4. Onde está o dinheiro que ela não tem

Realidade dura do segmento: ticket baixo e churn alto. Boa parte das clientes vai fechar o negócio em 8 meses, não porque seu app é ruim, mas porque a confeitaria era um bico. Planeje para isso.

- Faixa realista no Brasil: R$ 29–49 no plano de entrada, R$ 79–129 no plano com catálogo/pedidos.
- Anual com 2 meses grátis é a sua melhor arma contra churn. Empurre forte no onboarding.
- Cobre por valor entregue, não por "número de receitas". Limitar receitas pune exatamente o comportamento que gera retenção.
- Free tier: eu evitaria. Prefira trial de 14 dias com cartão opcional. Free tier em público de baixa renda gera suporte sem receita.
- Upsell natural: catálogo público com link de pedido, multiusuário (quando ela contrata ajudante), e emissão de etiqueta com tabela nutricional (isso é obrigatório pela RDC 429/819 e muita gente não sabe resolver).

## 5. Canal de aquisição — aqui você ganha ou perde

Anúncio no Meta para esse público queima caixa. O canal desse nicho é outro:

- Professoras de confeitaria e infoprodutoras. Existe um mercado enorme de cursos de "cookie recheado" e "confeitaria lucrativa" no Instagram. Elas já vendem planilha de precificação como bônus. Ofereça o seu app como bônus do curso delas, com comissão recorrente. Um parceiro desses vale 300 assinaturas.
- Grupos de WhatsApp e Facebook de confeiteiras, que são ativíssimos.
- Conteúdo de autoridade sobre precificação (não sobre o app). "Você está esquecendo 7 custos no seu cookie" performa muito melhor que demo de produto.
- Sua esposa é seu melhor case e seu melhor canal de pesquisa. Use isso.

## 6. A armadilha do "feito sob demanda"

Você construiu para uma usuária. Isso deixa marcas que só aparecem com o cliente 20:

- Regras implícitas do jeito que sua esposa trabalha viram regra de negócio no código.
- Falta de conceitos que outras precisam: bolo com fatias, brigadeiro por cento, produto vendido por peso, kit/cesta, sabor com variação de custo.
- Antes de vender, eu rodaria 5 a 8 entrevistas com confeiteiras que não são sua esposa, com uma pergunta central: "me mostra como você calcula o preço hoje". Grave a tela. As divergências vão apontar o que precisa ser generalizado.

## 7. Métricas para acompanhar desde o cliente 1

Poucas e brutais: taxa de ativação (% que precifica a primeira receita em 7 dias), retenção D30, churn mensal, MRR, e receitas cadastradas por conta (melhor preditor de retenção que qualquer outra coisa, porque é onde mora o lock-in).

---

O risco maior que vejo não é técnico nem de mercado, é de escopo. Esse produto convida a virar ERP (fiscal, estoque avançado, delivery, CRM) e aí você compete com Bling e Tiny sendo um dev solo. Vale definir agora, por escrito, o que o produto nunca vai fazer.

Se quiser, posso ajudar a estruturar a modelagem de custo indireto (rateio de gás, energia, mão de obra e depreciação por fornada), que é a parte que geralmente sai errada e é justamente a que sustenta o seu posicionamento.
