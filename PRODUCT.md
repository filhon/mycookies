# Product

## Register

product

## Users

**Maynara**, confeiteira artesanal, dona e única operadora da MyCookie's. Não é usuária técnica e não tem equipe: ela mesma compra, produz, embala, vende, entrega e fecha o caixa.

Usa o sistema em quatro contextos, todos igualmente importantes:

1. **Cozinha, durante a produção** — celular apoiado na bancada, mãos ocupadas ou sujas de massa, luz forte, tela a meio metro de distância. Consulta ficha técnica e confere quantidades. Digitação é quase impossível.
2. **Mercado, comprando** — lista de compras aberta, uma mão no carrinho. Marca itens e corrige preços de insumo no ato, muitas vezes com sinal ruim.
3. **Entrega ou feira, em pé** — uma mão só, poucos segundos, frequentemente offline. Consulta preço e registra venda.
4. **Noite, planejando** — sentada, com calma. Precifica produtos novos, lança o caixa e olha metas.

O trabalho a ser feito: **saber se está ganhando dinheiro em cada doce que vende, e não descobrir isso tarde demais.** Confeiteiras artesanais quase sempre precificam por intuição ou pelo preço da concorrente, ignoram custo de embalagem, tempo de trabalho, gás e taxa de maquininha, e passam anos vendendo com margem negativa sem perceber.

## Product Purpose

Transformar o custo real de cada receita em um preço de venda defensável, e o conjunto de pedidos em uma previsão de caixa que a Maynara consegue perseguir semana a semana.

O sistema é responsável pela aritmética: conversão de unidades, rateio de custos invisíveis, margem versus markup, demanda de insumo por pedido agendado, quantos doces faltam para bater a meta. A Maynara é responsável pelas decisões.

Sucesso é ela abrir o app antes de dar um preço a uma cliente no WhatsApp, e nunca mais chutar.

## Brand Personality

**Artesanal, confiante, precisa.**

A identidade visual da MyCookie's já existe e é sofisticada: vinho profundo, creme de papel texturizado, dourado discreto, serifa quente. Papelaria de confeitaria fina, não de padaria de bairro. O sistema é a extensão interna dessa marca, e precisa parecer feito para ela, não um software genérico onde o logo foi colado depois.

Voz: direta, em português do Brasil, na linguagem da confeitaria, não na do software. "Rendimento do lote", não "quantidade de output". "Quanto sobra pra você", não "margem líquida percentual". Quando o sistema precisa ensinar contabilidade, ele ensina em uma frase, no lugar onde o número aparece.

Nunca infantiliza a usuária: ela é dona de um negócio, não uma criança brincando de loja.

## Anti-references

- **Planilha de Excel.** Grade cinza infinita, números sem hierarquia, sensação de trabalho contábil. É de onde a Maynara está saindo e o que ela não quer ver de volta.
- **ERP corporativo.** Azul empresarial, menus em árvore, jargão de sistema, formulários de cadastro com quarenta campos obrigatórios antes de salvar qualquer coisa.
- **Rede social / feed.** Cards infinitos, gamificação, badges, notificações disputando atenção. As metas motivam com números reais, não com confete.
- **Dashboard SaaS escuro genérico.** A saída fácil para "não parecer planilha" é copiar Linear e Vercel. A marca é creme e papel; um painel preto-azulado seria o segundo reflexo, tão preguiçoso quanto o primeiro.

## Design Principles

1. **O sistema faz a conta; ela toma a decisão.** Nunca pedir um número que possa ser derivado de outro já cadastrado. Se o campo pode ser calculado, ele vem preenchido e editável, nunca vazio e obrigatório.
2. **Bancada antes de escritório.** Toda tela é projetada primeiro para uma mão suja, em pé, a meio metro de distância. Alvos de 44px são o mínimo absoluto; ações primárias são maiores. O desktop é a versão confortável do mesmo desenho, não um layout diferente.
3. **Todo número mostra a sua consequência.** Um preço sozinho não informa. Preço acompanhado de "sobram R$ 4,20 por unidade depois da maquininha" informa. Custo, margem e lucro aparecem juntos, sempre.
4. **Offline é o estado normal, não o erro.** Nada trava sem rede. A interface é honesta sobre o que ainda não sincronizou, sem transformar isso em alarme.
5. **Densidade com hierarquia.** A resposta à planilha não é mostrar menos dados, é dar peso diferente a cada dado. Escala, cor e espaço decidem o que ela lê primeiro.

## Accessibility & Inclusion

- **WCAG 2.2 AA** como piso: contraste mínimo 4.5:1 em texto e 3:1 em elementos de interface e estados de foco.
- Alvos de toque de no mínimo 44×44px, com 8px de separação entre alvos adjacentes.
- Foco visível e navegação completa por teclado no desktop.
- `prefers-reduced-motion` respeitado: transições de estado são mantidas, movimento decorativo é eliminado.
- Cor nunca é o único portador de significado. Status de pedido, sinal de lucro e alertas de estoque sempre combinam cor com ícone, texto ou posição — restrição que vale duplamente aqui, porque o vinho da marca e o vermelho de erro são vizinhos de matiz.
- Tema claro por padrão (uso predominante em cozinha iluminada), tema escuro seguindo a preferência do sistema para o uso noturno.
