# Product

## Register

product

## Users

**A confeiteira artesanal que trabalha sozinha.** Compra, produz, embala, vende, entrega e
fecha o caixa. Não é técnica e não tem equipe. Cookie, bolo, brigadeiro, salgado, pão: o
produto muda, o problema não.

**Maynara** é a persona: a primeira usuária e o primeiro caso. Confeiteira artesanal que
trabalha sozinha; a MyCookie's é a dela. Tudo o que o produto sabe sobre a bancada veio de
observá-la operar.

Usa o sistema em quatro contextos, todos igualmente importantes:

1. **Cozinha, durante a produção**: celular apoiado na bancada, mãos ocupadas ou sujas de
   massa, luz forte, tela a meio metro de distância. Consulta a receita e confere quantidades.
   Digitação é quase impossível.
2. **Mercado, comprando**: lista de compras aberta, uma mão no carrinho. Marca itens e corrige
   preços de material no ato, muitas vezes com sinal ruim.
3. **Entrega ou feira, em pé**: uma mão só, poucos segundos, frequentemente offline. Consulta
   preço e registra venda.
4. **Noite, planejando**: sentada, com calma. Precifica produtos novos, lança o caixa e olha
   metas.

O trabalho a ser feito: **saber se está ganhando dinheiro em cada doce que vende, e não
descobrir isso tarde demais.** Confeiteiras artesanais quase sempre precificam por intuição ou
pelo preço da concorrente, ignoram custo de embalagem, tempo de trabalho, gás e taxa de
maquininha, e passam anos vendendo com margem negativa sem perceber.

## Product Purpose

Transformar o custo real de cada receita em um preço de venda defensável, e o conjunto de
pedidos em uma previsão de caixa que a confeiteira consegue perseguir semana a semana.

O sistema é responsável pela aritmética: conversão de unidades, rateio de custos invisíveis,
margem versus markup, demanda de material por pedido agendado, quantos doces faltam para bater
a meta. Ela é responsável pelas decisões.

A frase que o produto existe para dizer: "Este doce te custa R$ 3,41 e você deveria cobrar
R$ 8,50." Sucesso é ela abrir o app antes de dar um preço a uma cliente no WhatsApp, e nunca
mais chutar.

## Brand Personality

**O instrumento de precisão em mãos experientes.**

Não é o Sábio (não ensina de cima), não é o Mago (não promete transformação), não é o Cuidador
(não passa a mão na cabeça). É a balança da bancada: você confia nela porque ela não tem
opinião.

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

Voz: direta, em português do Brasil, na linguagem da confeitaria, não na do software.
"Rendimento do lote", não "quantidade de output". "Quanto sobra pra você", não "margem líquida
percentual". Quando o sistema precisa ensinar contabilidade, ele ensina em uma frase, no lugar
onde o número aparece. Frases curtas, verbo na segunda pessoa, sem imperativo seco.

Nunca infantiliza a usuária: ela é dona de um negócio, não uma criança brincando de loja.

## Anti-references

- **Planilha de Excel.** Grade cinza infinita, números sem hierarquia, sensação de trabalho
  contábil. É de onde ela está saindo e o que não quer ver de volta.
- **ERP corporativo.** Azul empresarial, menus em árvore, jargão de sistema, formulários de
  cadastro com quarenta campos obrigatórios antes de salvar qualquer coisa.
- **Rede social / feed.** Cards infinitos, gamificação, badges, notificações disputando
  atenção. As metas motivam com números reais, não com confete.
- **Dashboard SaaS escuro genérico.** A saída fácil para "não parecer planilha" é copiar
  Linear e Vercel. A tinta do Rende é azul-preta, e o risco de virar isso é real: o que
  separa é o papel cru como superfície, o claro por padrão e o âmbar que marca um número, não
  um gráfico.
- **Aplicativo fofo de confeitaria.** Cupcake no logotipo, rosa, "vamos adoçar suas contas",
  emoji na interface. A marca é de precificação, não de confeitaria.
- **A própria MyCookie's.** Vinho, creme texturizado, filete dourado, serifa quente, o
  biscoito. É a identidade da primeira cliente, e a segunda confeiteira não pode abrir o app
  sentindo que está na ferramenta interna de uma concorrente. O Rende não empresta nem toma
  emprestado cor, tipografia ou símbolo de cliente nenhuma.

## Design Principles

1. **O sistema faz a conta; ela toma a decisão.** Nunca pedir um número que possa ser derivado
   de outro já cadastrado. Se o campo pode ser calculado, ele vem preenchido e editável, nunca
   vazio e obrigatório.
2. **Bancada antes de escritório.** Toda tela é projetada primeiro para uma mão suja, em pé, a
   meio metro de distância. Alvos de 44px são o mínimo absoluto; ações primárias são maiores. O
   desktop é a versão confortável do mesmo desenho, não um layout diferente.
3. **Todo número mostra a sua consequência.** Um preço sozinho não informa. Preço acompanhado
   de "sobram R$ 4,20 por unidade depois da maquininha" informa. Custo, margem e lucro aparecem
   juntos, sempre.
4. **Offline é o estado normal, não o erro.** Nada trava sem rede. A interface é honesta sobre
   o que ainda não sincronizou, sem transformar isso em alarme.
5. **Densidade com hierarquia.** A resposta à planilha não é mostrar menos dados, é dar peso
   diferente a cada dado. Escala, cor e espaço decidem o que ela lê primeiro.

## Accessibility & Inclusion

- **WCAG 2.2 AA** como piso: contraste mínimo 4.5:1 em texto e 3:1 em elementos de interface e
  estados de foco.
- Alvos de toque de no mínimo 44×44px, com 8px de separação entre alvos adjacentes.
- Foco visível e navegação completa por teclado no desktop.
- `prefers-reduced-motion` respeitado: transições de estado são mantidas, movimento decorativo
  é eliminado.
- Cor nunca é o único portador de significado. Status de pedido, sinal de lucro e alertas de
  despensa sempre combinam cor com ícone, texto ou posição. A restrição vale duplamente aqui
  porque o âmbar da marca e o ocre de atenção dividem matiz: todo estado de atenção leva o
  triângulo e a palavra, e o âmbar nunca é texto.
- Tema claro por padrão (uso predominante em cozinha iluminada), tema escuro seguindo a
  preferência do sistema para o uso noturno.
