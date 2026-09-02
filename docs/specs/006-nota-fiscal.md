# Spec 006 · A nota fiscal vira insumo

**Tipo:** funcionalidade nova. É o primeiro serviço externo do projeto.
**Tamanho:** duas sessões — `6A` do papel ao insumo, `6B` a compra no caixa —, com `6C`
reservada para o que a 6B achar e não couber nela.
**Depende de:** a 5B ter rodado. Esta spec grava em `insumos` e em `transacoes` por um
caminho novo; abrir um caminho novo sobre um caminho velho que nunca foi visto rodando é
descobrir dois defeitos ao mesmo tempo e não saber de quem é qual.
**Aprovações pedidas:** uma dependência de produção, um campo opcional novo e dois serviços
externos. Estão listadas ao fim, antes dos riscos.

## Problema

Cadastrar insumo é o trabalho mais chato do sistema e o mais desprezado por quem precisa
dele. São nove campos por item, e um item por vez: o painel de `/insumos` abre, ela digita
nome, categoria, preço, quantidade, unidade, perda, marca, onde comprou e estoque, salva, e
o painel abre de novo, vazio, para o próximo. Uma compra de mercado tem entre seis e vinte
linhas. É meia hora sentada digitando o que já está impresso no papel que está na mão dela.

O custo disso não é o tédio. É que **o preço envelhece em silêncio**. Cadastrar dá
trabalho, atualizar dá o mesmo trabalho, e atualizar não parece urgente — então a farinha
continua registrada a R$ 11,90 durante quatro meses, e toda ficha que a usa calcula um
custo que não existe mais. O sistema inteiro existe para que o preço de venda seja
defensável, e ele se apoia num número que se desatualiza justamente porque mantê-lo é
chato. `historicoPrecos` guarda as últimas doze compras de cada insumo e hoje quase nunca
recebe a segunda entrada.

A nota fiscal já tem tudo: nome, quantidade, unidade, preço unitário, preço total, a data e
o estabelecimento. Ela sai da compra impressa, ou em PDF no e-mail. O que falta é o
caminho entre o papel e `contas/{contaId}/insumos`.

**O que esta spec entrega:** ela fotografa a nota no celular, ou escolhe o PDF no
computador, confere numa lista o que foi lido — corrigindo o que estiver errado e tirando
o que não é do negócio —, e cadastra tudo de uma vez. A compra vira uma saída no caixa na
mesma passada.

**O que esta spec não entrega:** confiança automática. Nenhuma linha lida vira documento
sem ela ter visto. O modelo é um datilógrafo rápido, não uma testemunha.

---

## O que esta spec decide antes de qualquer código

São sete decisões, e nenhuma delas é sobre a tela. Cada uma vira um `D` em `DECISOES.md` na
sessão que a executar.

### 1. A chave do Gemini nunca chega ao aparelho

`.env.local.example` diz hoje, com razão, que as chaves do Firebase são públicas por
natureza: elas identificam o projeto e não autorizam nada — quem protege os dados é
`firestore.rules`. **A chave do Gemini é o oposto disso.** Ela autoriza gasto, e uma
variável `NEXT_PUBLIC_` está dentro do bundle, que é servido para qualquer navegador.

`GEMINI_API_KEY` entra em `.env.local` **sem** o prefixo, e o único código que a lê é uma
rota do servidor. O `.env.local.example` ganha as duas linhas com o aviso invertido: esta
não é como as outras.

### 2. Rota do app, e não Cloud Function

O `functions/` do projeto está no estado em que o `firebase init` o deixou: um
`setGlobalOptions` e comentários. Publicar a primeira função exige plano Blaze, um segundo
artefato de deploy, uma segunda cadeia de build e o emulador dentro do laço de
desenvolvimento — infraestrutura que ninguém aqui exercitou ainda.

A leitura acontece em **`src/app/api/nota/route.ts`**, um Route Handler. O app já é
compilado com servidor Node (existem rotas dinâmicas desde a 2B), o código fica no mesmo
repositório e na mesma língua, e `npm run dev` basta para exercitar tudo.

O que isso custa: a rota precisa saber quem está chamando, e conferir um ID token do
Firebase é trabalho do `firebase-admin`, que hoje é `devDependency` usada só pelo script de
acesso. Ele passa para `dependencies`. **É a aprovação que esta spec pede**, e ela é menor
do que parece: o pacote já está instalado, nada novo desce, e nada disso entra no bundle do
cliente — `src/app/api/` não é importado por componente nenhum.

O que faria a decisão virar: hospedar o app onde não haja runtime Node, ou um segundo
cliente pagante, quando a cota por conta passar a ser um problema de cobrança e não de
código.

**Verificar à mão a assinatura do JWT, para não mexer no `package.json`, está descartado.**
O projeto desenha gráfico à mão para não pegar dependência (`#d25`) e tirou o `date-fns`
porque `Intl` bastava (`#d26`); criptografia é outra classe de risco, e um erro ali não
aparece como um pixel torto — aparece como um estranho gastando a cota.

### 3. O modelo lê palavras; o domínio faz contas

**Toda palavra da resposta é do modelo. Todo número é do domínio.**

O modelo devolve o que está impresso, em texto, exatamente como está: `"12,50"`, `"1,01KG"`,
`"C/25"`. Ele não soma, não converte, não arredonda e não devolve centavos. Quem transforma
`"12,50"` em `1250`, `"1,01KG"` em `{ 1,01, "kg" }` e `"C/25"` em `{ 25, "un" }` é
`src/lib/domain/notaFiscal.ts`, puro, sem Firebase e sem React, coberto por teste.

O motivo é o `#d02`: dinheiro é centavo inteiro porque erro de arredondamento aqui é o
defeito mais caro possível, e não se delega o arredondamento a um sistema probabilístico.
O motivo prático é maior — **um número que o modelo calculou é um número que ninguém pode
auditar.** Se a farinha entrar a R$ 125,00 por causa de uma vírgula, o custo de toda ficha
que a usa muda, e a única defesa seria alguém reconferindo a conta. Com a divisão acima, a
parte perigosa da leitura é justamente a que `npm test` cobre.

A tradução também é do modelo, e é para isso que ele serve: `"FARINHA TRIGO DONA BENTA 1KG"`
vira nome `"Farinha de trigo"` e marca `"Dona Benta"`. Isso é linguagem, não aritmética, e
ela corrige na tela em dois toques se sair errado.

### 4. A rota não escreve no Firestore

A resposta da rota é um rascunho em memória. Quem grava é a tela, depois de ela confirmar.

`PRODUCT.md` diz que o sistema faz a conta e ela toma a decisão. Uma leitura que escrevesse
direto em `insumos` colocaria um preço alucinado dentro do custo de todas as fichas — e
descobrir isso é exatamente o que o sistema existe para evitar. O caminho de escrita
continua sendo o mesmo de sempre: `mutations/insumos.ts`, do aparelho, com as regras de
segurança valendo.

### 5. A foto não é guardada

Nada de Firebase Storage. Os bytes sobem, a resposta volta, o arquivo é descartado.

Storage significaria um bucket novo, um conjunto novo de regras, um custo novo e um lugar
novo onde dado privado mora — tudo isso por uma imagem cujo valor inteiro dura os trinta
segundos em que ela vira lista. O que precisa sobreviver já sobrevive: `historicoPrecos`
guarda preço, quantidade, unidade e fornecedor de cada compra, dentro do próprio insumo.

Consequência aceita: reler exige fotografar de novo. E não existe "ver a nota do mês
passado" — se um dia isso virar pergunta real, aí sim nasce o Storage, com a spec dele.

### 6. É a única tela do sistema que exige rede

`PRODUCT.md` põe offline como estado normal e o `CLAUDE.md` o lista como invariante. Esta
tela não pode cumprir isso: não há como ler uma nota sem falar com o Gemini.

A saída não é fingir. É **dizer**, e é escolher o contexto certo. A leitura de nota mora no
contexto 4 do `PRODUCT.md` — noite, sentada, planejando —, e não na bancada nem no mercado.
Sem rede, a entrada para a tela aparece desabilitada com a frase, e o cadastro manual
continua onde sempre esteve, a um toque de distância. Nenhuma outra tela muda de
comportamento por causa desta.

O `POST /api/nota` não passa pelo cache do service worker: `defaultCache` não guarda POST.
Não há o que configurar, e há o que conferir uma vez.

### 7. Ler a segunda nota é atualizar preço, não cadastrar gêmeo

Este é o item que decide se a funcionalidade ainda serve no segundo mês.

Toda linha lida é pareada contra os insumos já cadastrados, por `nomeBusca`. Quando o
pareamento acerta, a linha **não** cria um documento: ela chama `atualizarInsumo`, que já
faz a coisa certa desde o Módulo 1 — grava o preço novo, empurra uma entrada em
`historicoPrecos` e marca com `custoDesatualizado` toda ficha que usa aquele insumo.

Sem isso, a terceira compra do ano deixa a conta com três farinhas, e a ficha do cookie
aponta para a primeira.

### 8. O CNPJ é o único campo da nota que se autoconfere

Toda nota fiscal e todo cupom trazem o CNPJ do emitente no cabeçalho, e um CNPJ tem dois
dígitos verificadores. É o único campo do papel que o sistema confere sozinho — sem rede,
sem modelo, sem perguntar nada a ela. Se o dígito não fecha, a leitura do cabeçalho saiu
torta, e isso se sabe antes de gastar qualquer chamada.

Duas coisas saem daí, e as duas valem mais do que o nome bonito da loja:

- **`notaChave` deixa de depender de OCR de nome próprio.** A guarda de duplicidade da 6B
  compara `cnpj + dataISO + total`. "ATACADAO DIST COM E IND LTDA" lido de duas fotos pode
  sair de dois jeitos; catorze dígitos com verificador, não.
- **`fornecedor` deixa de acumular sinônimos.** O campo é texto livre, e três compras no
  mesmo mercado gravam três grafias — o que estraga a única pergunta que ele existe para
  responder um dia: "onde eu compro isto mais barato?".

**A consulta em `https://publica.cnpj.ws/cnpj/{cnpj}` é enriquecimento, e nunca requisito.**
Feita na rota, depois da leitura, com 3 segundos de teto e falha silenciosa: respondendo,
`estabelecimento` vira o nome fantasia — "Atacadão", e não "ATACADAO DIST COM E IND LTDA" —
e a tela mostra cidade e UF ao lado, que é como ela reconhece a loja num relance. Não
respondendo, o nome lido da nota continua valendo e nada na tela quebra.

Três regras, porque a API é pública de verdade e isso tem preço:

- **A chamada é do servidor, e não do navegador.** Uma ida de rede já está acontecendo, e o
  PWA não ganha um terceiro host na superfície dele.
- **Cache por CNPJ, com validade longa.** Dado cadastral da Receita muda uma vez por ano, e
  ela compra no mesmo mercado toda semana: a segunda nota do Atacadão não sai do servidor.
- **A rota fica com três campos e joga o resto fora.** A resposta traz endereço completo,
  telefone, e-mail e a **lista de sócios** — nomes de pessoas reais que não têm o que fazer
  no navegador dela.

O limite da API pública é de **3 consultas por minuto por IP**, e ele é o gatilho desta
decisão. Com uma usuária e cache, é folgado. Num SaaS, o IP é o do servidor e a fila vira
compartilhada entre todas as clientes: nesse dia, ou a consulta migra para o navegador — onde
o IP é o dela —, ou entra uma chave paga. O CNPJ lido continua valendo dos dois jeitos, e é
por isso que ele entra agora e a consulta é a metade descartável.

---

# Sessão 6A · Do papel ao insumo

## Escopo

O ciclo inteiro do insumo: fotografar, ler, conferir, corrigir, remover e cadastrar. O
caixa é a 6B.

### Módulo novo de domínio: `src/lib/domain/notaFiscal.ts`

Puro, sem Firebase e sem React, como todo o resto de `domain/`. É onde mora o risco desta
spec, e por isso é o que os testes cobrem.

```ts
/** O que o modelo devolve por linha: texto impresso, nunca conta feita. */
export interface LinhaLida {
  descricao: string; // "FARINHA TRIGO DONA BENTA 1KG"
  nome: string; // "Farinha de trigo"
  marca: string; // "Dona Benta" — "" quando não dá para dizer
  quantidade: string; // "1"   — quantas embalagens, como impresso
  unidadeTexto: string; // "UN"  — a coluna de unidade da nota
  valorUnitario: string; // "12,50"
  valorTotal: string; // "12,50"
}

export interface NotaLida {
  estabelecimento: string;
  cnpj: string; // "75.315.333/0001-09" — como impresso, "" se ilegível
  cidade: string; // "" até a consulta responder; só a rota preenche
  dataISO: string; // "" quando ilegível
  total: string; // "176,20"
  linhas: LinhaLida[];
}
```

As funções:

| Função                             | O que faz                                                            |
| ---------------------------------- | -------------------------------------------------------------------- |
| `esquemaNotaLida`                  | zod sobre a resposta do modelo. Fora de forma é falha com frase      |
| `centavosDoTexto(t)`               | `"1.234,56"` e `"1234.56"` → `123456`. `null` quando não é número    |
| `embalagemDoTexto(descricao, un)`  | `"1,01KG"` → `{ 1,01, "kg" }`; `"C/25"` → `{ 25, "un" }`             |
| `categoriaSugerida(descricao)`     | tabela de palavras: saco, caixa, fita, etiqueta, pote → não é comida |
| `normalizarNota(lida)`             | `NotaLida` → `RascunhoNota`, com tudo já em centavos e unidade base  |
| `parearComInsumos(rascunho, [..])` | por `chaveDeBusca`: exato primeiro, prefixo depois, `null` se nenhum |
| `conferirTotal(linhas, total)`     | a soma bate com a nota? Devolve a diferença, em centavos             |
| `cnpjValido(texto)`                | os dois dígitos verificadores, offline. Catorze dígitos iguais é não |

**`embalagemDoTexto` é a função difícil**, e as regras dela são deterministas de propósito:

1. `C/<n>` ou `C/ <n>` vence tudo: é assim que se escreve "vem 25 dentro".
2. `<n><unidade>` com unidade em `kg|g|l|ml` vem depois: `500G`, `1,01KG`, `325ML`.
3. `<n>X<n>` é dimensão de embalagem, e não quantidade: `10X15` não conta.
4. Nada disso: `{ 1, "un" }`, que é o palpite honesto.

**`precoCompra` é o valor _unitário_ da linha, nunca o total.** `Insumo.precoCompra` é o
preço de uma embalagem inteira, e uma linha de duas manteigas a R$ 17,50 vale R$ 35,00 no
cupom e R$ 17,50 no cadastro. Quem soma R$ 35,00 é o caixa da 6B, e é por isso que os dois
números vivem separados desde aqui.

**Perda não sai de nota.** Insumo novo nasce com `perdaPercentual: 0`, e a linha não
pergunta: é o único campo do formulário que a nota não pode responder, e transformá-lo em
pergunta obrigatória faria cada leitura terminar em seis perguntas. Ela ajusta em
`/insumos` quando quiser — e, no caso de atualização, a perda que já estava lá é preservada
(ver adiante).

### O contrato da rota

```
POST /api/nota
Authorization: Bearer <ID token do Firebase>
{ contaId, arquivo: { mimeType: "image/jpeg" | "application/pdf", dados: "<base64>" } }

200 → NotaLida
401 → sem token, token inválido, ou contaId fora da claim `contas`
413 → arquivo acima do teto
422 → o modelo respondeu fora do esquema
502 → o Gemini não respondeu, ou demorou demais
```

A rota faz cinco coisas e nada além: confere o token, confere que `contaId` está na claim
`contas` (**a mesma regra de `firestore.rules`, escrita uma segunda vez porque esta é uma
segunda porta para a mesma conta**), chama o Gemini com `temperature: 0` e resposta em JSON
estruturado, valida a resposta com `esquemaNotaLida`, e — só então, e só se `cnpjValido` der
verdadeiro — pergunta o nome da loja à API pública de CNPJ.

O enriquecimento é o passo que pode não acontecer, e a rota é escrita para isso:
`GET https://publica.cnpj.ws/cnpj/{14 dígitos}`, 3 segundos de teto, resposta cacheada por
CNPJ com validade longa, e três campos aproveitados —
`estabelecimento.nome_fantasia` (com `razao_social` de reserva quando o fantasia vier vazio),
`estabelecimento.cidade.nome` e `estabelecimento.estado.sigla`. Timeout, 429 ou 404 não são
erro: a leitura volta com o nome que o modelo leu, e a tela não menciona o assunto. **Nada
além desses três campos atravessa a rota** — a resposta traz sócios, endereço e telefone, e
nada disso tem por que chegar ao navegador.

Modelo: **`gemini-3.5-flash-lite`**, em `GEMINI_MODELO` para poder trocar sem deploy de
código. É o mais barato da família que aceita imagem e PDF na entrada, tem faixa gratuita, e
extração de dado de documento é exatamente o que a documentação dele descreve. **A sessão
confirma o id e o preço vigentes na página de modelos antes de fixar o padrão** — a família
anda rápido, e um id inventado falha em produção e não em `npm run build`.

O prompt é curto, em português, e proíbe explicitamente o que a decisão 3 proíbe: não
somar, não converter, não arredondar, não completar o que não está impresso, copiar o que
está escrito. Linha que não der para ler vira linha com campo vazio, e não linha inventada.

Tetos, porque cota é dinheiro: 8 MB por arquivo depois da compressão, 60 linhas por nota,
30 segundos de espera. Cada teto estourado tem a sua frase.

### A captura

Um `<input type="file" accept="image/*,application/pdf">`, **sem `capture`**. O atributo
forçaria a câmera e tiraria dela a galeria e o gerenciador de arquivos; sem ele, o iPhone
oferece as três opções, e o desktop abre o seletor de PDF. Um controle, dois contextos.

Foto de celular chega com 4000px e alguns megabytes. Antes de subir, a imagem é reduzida
por `canvas` para 1600px no maior lado, JPEG a 80%. Não é otimização prematura: é sinal
ruim na cozinha e é token pago por pixel que ninguém vai olhar. PDF sobe como está.

### A tela de conferência

Rota nova `/insumos/nota`, **página e não painel**. A invariante do `CLAUDE.md` — painel
lateral no desktop, folha inferior no celular — vale para formulário de um objeto; aqui são
seis a vinte objetos editáveis, e em 360px isso não cabe numa folha. É a mesma razão pela
qual `/fichas/[id]` e `/pedidos/[id]` são páginas.

Entradas para ela: um botão secundário "Ler uma nota" ao lado de "Novo insumo" no cabeçalho
de `/insumos`, e uma segunda ação no estado vazio, que hoje diz "Comece pela farinha". **Não
nasce um segundo botão flutuante no celular**: um já existe, e dois disputam o mesmo polegar.

No topo, uma linha só identifica a compra: **`Atacadão · <cidade>/<UF> · 02/09/2026`**, com o
nome e a data editáveis. Cidade e UF não são campo: são a confirmação de que ela está
conferindo a nota que acha que está conferindo, e somem quando a consulta de CNPJ não
responde.

A lista é de cartões, e não de linhas de tabela — planilha é a primeira anti-referência do
`PRODUCT.md`. Cada cartão tem:

- **Nome, marca, preço pago, quantidade, unidade e categoria**, todos editáveis, semeados
  pela leitura. "Onde comprou" vem do estabelecimento e é igual em todas as linhas — editável
  uma vez, no topo, e não linha a linha.
- **A consequência, embaixo**, curta: `R$ 12,50 ÷ 1 kg = 1,25 centavo por grama`. É o
  `ResumoCusto` do formulário de insumo em uma linha, e é o que denuncia unidade lida
  errada antes de a leitura virar documento — 12,50 dividido por 1 grama salta aos olhos.
- **O selo do que vai acontecer**: `Novo`, ou `Atualiza · Farinha de trigo · era R$ 11,90`.
  Esse "era" é a frase mais importante da tela: é o histórico de preço funcionando à vista.
- **Tirar da lista**, num alvo de 44px. Não é apagar documento — não existe documento
  ainda —, e a invariante de nunca apagar não se aplica. O que se aplica é não perder o que
  foi lido: as linhas removidas caem num bloco no pé, "3 itens fora desta compra", com
  "trazer de volta".

No rodapé fixo, no mesmo padrão dos outros três: `5 insumos · 1 atualização · R$ 146,40`, e
a ação primária "Cadastrar 5 insumos". Junto dele, a conferência do total:

> As linhas somam R$ 146,40. A nota diz R$ 176,20, e os R$ 29,80 que você tirou explicam a
> diferença.

E quando não explicam:

> Faltam R$ 12,00 para fechar com a nota. Pode ter ficado uma linha para trás.

Isso não bloqueia o cadastro. É o princípio 3 do `PRODUCT.md` aplicado à confiança no
próprio leitor: todo número mostra a sua consequência, inclusive o número que o sistema
leu errado.

### O que a gravação faz, e o que ela preserva

`mutations/notas.ts`, com `importarNota(contaId, linhas)`.

**Uma nota é um lote, e não N salvamentos.** Todos os documentos vão em um `writeBatch`, com
o incremento de `totalInsumos` junto, e depois uma única passada marcando as fichas
afetadas com `array-contains-any` sobre os ids atualizados, em blocos de dez. Vinte
chamadas de `criarInsumo` em sequência seriam vinte idas ao servidor numa tela que já
depende de rede duas vezes.

Para o lote não reescrever a forma do documento por conta própria — que é o motivo pelo
qual `dadosDoInsumo` existe —, o corpo sai de `mutations/insumos.ts`: as duas montagens de
documento que hoje moram dentro de `criarInsumo` e `atualizarInsumo` viram
`corpoDeInsumoNovo(dados)` e `corpoDeAtualizacao(anterior, dados)`, exportadas e usadas
pelos dois caminhos. É o padrão de `derivarFicha` (`#d19`): uma função, dois chamadores.

**Uma nota traz preço. Ela não traz o que você configurou.** Numa linha que atualiza, mudam
`precoCompra`, `quantidadeCompra`, `unidadeCompra`, e `marca`/`fornecedor` **se estiverem
vazios**. Continuam como estavam: `perdaPercentual`, `estoqueAtual`, `estoqueMinimo`,
`categoria` e o nome cadastrado. Importar uma nota não pode zerar os 5% de perda da farinha
que ela ajustou em março — seria o sistema desfazendo o trabalho dela em nome de
conveniência.

### Caso de aceite, com números

A conta já tem **Farinha de trigo** cadastrada: R$ 11,90 por 1 kg, perda 5%, estoque 500 g,
usada na ficha do cookie. A nota fotografada:

```
ATACADAO DIST COM E IND LTDA
CNPJ 75.315.333/0001-09          02/09/2026
1  FARINHA TRIGO DONA BENTA 1KG        UN   1   12,50    12,50
2  CHOCOLATE NOBRE MEIO AMARGO 1,01KG  UN   1   40,00    40,00
3  MANTEIGA AVIACAO C/SAL 500G         UN   2   17,50    35,00
4  CX PAPEL KRAFT 6 DOCES C/25         PCT  1   50,00    50,00
5  SACO CELOFANE 10X15 C/100           PCT  1    8,90     8,90
6  SHAMPOO SEDA 325ML                  UN   2   14,90    29,80
                                         TOTAL         176,20
```

Ela tira a linha 6. O que precisa aparecer na tela, e depois no banco:

| #   | Insumo                | Preço    | Embalagem | Custo por unidade base | Estado                  |
| --- | --------------------- | -------- | --------- | ---------------------- | ----------------------- |
| 1   | Farinha de trigo      | R$ 12,50 | 1 kg      | 1,25 c/g               | Atualiza · era R$ 11,90 |
| 2   | Chocolate meio amargo | R$ 40,00 | 1,01 kg   | 3,96 c/g               | Novo                    |
| 3   | Manteiga com sal      | R$ 17,50 | 500 g     | 3,50 c/g               | Novo                    |
| 4   | Caixa para 6 doces    | R$ 50,00 | 25 un     | R$ 2,00 por caixa      | Novo · embalagem        |
| 5   | Saquinho de celofane  | R$ 8,90  | 100 un    | 8,9 c/un               | Novo · embalagem        |

Os números que provam cada regra:

- **A linha 1 não cria uma segunda farinha.** Depois de gravar, a perda continua 5%, o
  estoque continua 500 g, `historicoPrecos` tem duas entradas, e a ficha do cookie está
  marcada com `custoDesatualizado`. Com a perda preservada, o custo corrigido é
  1,25 ÷ 0,95 = **1,3158 centavo por grama**, e não 1,25.
- **A linha 2 prova a vírgula decimal.** 4000 ÷ 1010 = 3,9604 centavos por grama. Um leitor
  que tratasse `"1,01KG"` como 1 kg erraria 1% em toda receita com chocolate — e 1% de erro
  invisível em custo é exatamente o defeito que este sistema existe para não ter.
- **A linha 3 prova preço unitário contra preço de linha.** `precoCompra` é 1750, e não 3500. O que vale 3500 é a saída do caixa, na 6B.
- **A linha 4 prova `C/25`.** Quantidade 25, unidade `un`, R$ 2,00 por caixa — o mesmo
  número da lista de compras da 3C, que diz que caixa se compra de 25 em 25.
- **A linha 5 prova que `10X15` não é quantidade.** Se fosse, o saquinho entraria a 10
  unidades e o custo unitário sairia dez vezes maior.
- **A linha 6 prova a remoção.** Fora da lista, fora do banco, e explicando a diferença de
  R$ 29,80 entre as linhas mantidas e o total impresso.
- **O rodapé diz R$ 146,40**, que é 12,50 + 40,00 + 35,00 + 50,00 + 8,90.
- **O cabeçalho prova o verificador.** `75.315.333/0001-09` fecha, e "Onde comprou" chega às
  cinco linhas como **Atacadão**, o nome fantasia, e não como a razão social impressa.
  Trocado o último dígito para `08`, `cnpjValido` recusa, a consulta **não** é feita, e o
  nome lido da nota é o que vale — sem erro em tela, porque a nota continua legível.

## Critérios de aceite 6A

- [ ] `GEMINI_API_KEY` fora do bundle, conferido no build: `grep` na saída de `.next` não
      encontra a chave. `.env.local.example` documenta as duas variáveis com o aviso de que
      esta não é pública como as do Firebase.
- [ ] `POST /api/nota` sem token, com token de outra conta, ou com `contaId` fora da claim
      devolve 401 e não chama o Gemini. É a mesma regra de `firestore.rules`, numa segunda
      porta.
- [ ] `tests/domain/notaFiscal.test.ts` cobre o caso de aceite linha por linha, com os sete
      números em negrito acima, mais as bordas de `embalagemDoTexto`: `C/25`, `1,01KG`,
      `500G`, `325ML`, `10X15`, e a descrição sem tamanho nenhum.
- [ ] `cnpjValido` aceita `75.315.333/0001-09`, recusa o mesmo com `08` no fim, recusa
      `00.000.000/0000-00` e recusa qualquer coisa que não tenha catorze dígitos.
- [ ] Com o CNPJ válido, "Onde comprou" chega às linhas como nome fantasia. Com a API fora do
      ar, com 429, ou com o CNPJ ilegível, a leitura termina igual e a tela não menciona o
      assunto — conferido derrubando a chamada de propósito.
- [ ] Uma foto de nota real vira a lista na tela, em menos de 30 segundos, no celular.
- [ ] Toda linha é editável, e corrigir a unidade refaz o custo por unidade base na hora.
- [ ] Remover uma linha tira-a da soma e do rodapé, e trazê-la de volta a recoloca.
- [ ] Cadastrar grava tudo em um lote só; insumo novo nasce completo, insumo pareado
      **preserva perda, estoque e categoria** e ganha uma entrada em `historicoPrecos`.
- [ ] A ficha do cookie fica com `custoDesatualizado` depois da atualização da farinha.
- [ ] Sem rede, a entrada para a tela aparece desabilitada com a frase, e nenhuma outra
      tela do sistema muda de comportamento.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

---

# Sessão 6B · A compra vira saída no caixa

## Escopo

Hoje o dinheiro que sai para comprar insumo só entra em `/financeiro` se ela digitar o
lançamento à mão, numa segunda tela, depois de já ter digitado a compra inteira. Na
prática, não entra: `porCategoriaSaida.COMPRA_INSUMO` fica vazio, o "quanto sobra" do mês
fica otimista, e a meta mede um resultado que ignora a maior saída recorrente do negócio.

A nota já sabe o valor, a data e o estabelecimento. Falta ligar.

### Um lançamento por nota, e não um por item

Nove linhas de chocolate no mesmo dia não são nove decisões financeiras: são uma compra. O
caixa é lido por dia e por categoria, e uma nota explodida em vinte lançamentos transforma
`/financeiro` em extrato bancário. O detalhe por item já está guardado onde ele serve, que é
`historicoPrecos` dentro de cada insumo.

```
descricao   "Compra no Atacadão"  (ou "Compra de insumos", se o nome não sair da nota)
tipo        SAIDA
categoria   COMPRA_INSUMO, ou EMBALAGEM se toda linha mantida for embalagem
dataISO     a data da nota, editável
valor       a soma dos valores totais das linhas mantidas
```

`criarTransacao(contaId, dados, formas, null)` é o caminho, o mesmo de `/financeiro`. O
`ContextoMeta` vai `null` porque saída não move o espelho da meta — `realizado` espelha
`entradas` (`#d29`) —, e **a sessão confirma isso em `metas.ts` antes de passar `null`**, em
vez de confiar nesta frase.

### O valor é a soma do que ficou, e não o total da nota

O shampoo de R$ 29,80 não é do negócio. Se o caixa recebesse os R$ 176,20 impressos, o
sistema estaria dizendo que a confeitaria gastou em shampoo — e o "quanto sobra" do mês
sairia R$ 29,80 menor por uma compra pessoal.

A tela diz o que vai acontecer, antes de acontecer:

> Vai para o caixa: **R$ 146,40** em 02/09. Os R$ 29,80 que você tirou ficam de fora.

O bloco nasce **ligado**. Uma compra que não chega ao caixa é exatamente o custo invisível
que este sistema existe para tornar visível, e deixar isso desligado por padrão é escolher
o número errado como caminho de menor esforço. Desligar é um toque, para o dia em que a
compra já tiver sido lançada à mão.

### Guarda contra lançar a mesma nota duas vezes

Ler a mesma nota de novo — porque a primeira leitura saiu torta, ou porque ela esqueceu —
criaria uma segunda saída idêntica, e o mês fecharia com R$ 146,40 a menos sem que nada na
tela explicasse.

`Transacao` ganha `notaChave?: string`, campo opcional: **os catorze dígitos do CNPJ**, a
`dataISO` e o total em centavos, nessa ordem — `75315333000109-2026-09-02-17620`. É a decisão
8 pagando: o nome da loja é o campo mais frágil do cabeçalho, e uma chave que dependesse dele
falharia exatamente quando a segunda foto saísse um pouco diferente da primeira. Sem CNPJ
legível, não há chave, e não há guarda — a tela não inventa uma a partir do nome.

Antes de lançar, uma consulta por igualdade nesse campo — índice de campo único, criado
automaticamente pelo Firestore, sem nada para publicar. Achando, a tela diz:

> Esta nota já foi lançada no caixa em 02/09, no valor de R$ 146,40.

E oferece cadastrar os insumos sem lançar de novo. A guarda vale para o caixa; os insumos
podem ser reimportados à vontade, porque reimportar insumo é atualizar preço, que é
idempotente por natureza.

Acrescentar campo opcional é mudança compatível de schema: documento antigo sem o campo
continua válido, e `Transacao.notaChave` ausente é o estado de toda transação já gravada.

### Caso de aceite, com números

Sobre o caso da 6A, na mesma conta:

- Uma saída de **R$ 146,40** em 02/09, categoria `COMPRA_INSUMO`, descrição "Compra no
  Atacadão".
- `/financeiro` em 2026-09 passa a mostrar R$ 146,40 em "compra de insumo" na quebra por
  categoria, e o dia 02 aparece no gráfico de barras.
- **"Recalcular o mês" logo em seguida devolve exatamente os mesmos números.** É o mesmo
  critério de `#d23` e `#d37`, e agora com um terceiro caminho escrevendo no agregado.
- Ler a mesma nota de novo: a tela avisa que já foi lançada, e cadastrar sem lançar **não**
  move um centavo do agregado.
- Arquivar a saída em `/financeiro` reverte tudo, como qualquer outro lançamento — não há
  caminho especial de reversão para lançamento nascido de nota.

## Critérios de aceite 6B

- [ ] O bloco de caixa nasce ligado, com a data da nota, e diz o valor que vai lançar antes
      de lançar.
- [ ] O valor lançado é a soma das linhas mantidas, conferido contra os R$ 146,40.
- [ ] `Transacao.notaChave` gravado com o CNPJ, e a segunda leitura da mesma nota
      reconhecida — inclusive fotografada de outro ângulo, que é o caso que o nome da loja
      não cobriria.
- [ ] Nota sem CNPJ legível lança normalmente, e sem chave: a guarda não vale, e nada trava.
- [ ] Recalcular o mês devolve os mesmos números.
- [ ] Desligar o bloco cadastra os insumos e não cria lançamento nenhum.
- [ ] `ESTADO.md` e `DECISOES.md` atualizados: as sete decisões da abertura desta spec viram
      `#d45` em diante, com o que cada uma custa.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

## O roteiro em navegador, ao fim da 6B

Curto, porque a 5B já provou o resto do sistema. Cada tela nas duas passagens de sempre:
tema claro e 360px.

1. **Sem rede**, a entrada para a leitura aparece desabilitada com a frase.
2. **Foto de uma nota de verdade, no celular.** É o único jeito de saber quanto tempo a
   leitura leva com o sinal de casa dela, e se a compressão a 1600px deixa a nota legível.
3. **PDF no computador**, o caminho do e-mail do mercado.
4. **Uma nota tirada torta, ou com dobra.** O que interessa não é acertar — é o que a tela
   diz quando o modelo erra metade das linhas. Corrigir seis linhas na mão precisa ser
   menos trabalho do que cadastrar seis insumos do zero; se não for, a funcionalidade não
   se paga.
5. **Uma nota com um item já cadastrado**, para ver o selo "era R$ 11,90" e a ficha ganhar
   o selo de custo desatualizado.
6. **O rodapé fixo com o teclado aberto**, no celular, editando o preço da terceira linha.
   É a mesma pergunta dos outros três rodapés fixos da 5B, numa tela com mais campos.
7. **A mesma nota duas vezes**, fotografada de ângulos diferentes, para a guarda do caixa —
   é a chave por CNPJ que precisa fechar, e não a foto.
8. **Uma nota com o cabeçalho cortado ou ilegível.** Sem CNPJ não há consulta e não há
   guarda, e o que se verifica é que nada disso vira erro em tela: a leitura das linhas
   termina igual.

---

# Sessão 6C · reservada

Para o que a 6B achar e não couber nela. Se a rota, o domínio e os testes da 6A tomarem a
sessão inteira — o que é possível, porque é a primeira vez que este projeto fala com um
serviço externo —, **a 6A para na lista lida em tela**, a conferência e a gravação passam
para a 6B, e o caixa vira 6C. A degradação é planejada de propósito: é melhor do que uma
sessão que entrega três quartos de três coisas.

---

## Fora de escopo, nas três sessões

- **Guardar a imagem da nota.** Decisão 5. Nasce com Storage e com spec própria, se virar
  pergunta.
- **Ler QR Code de NFC-e.** A SEFAZ devolve a nota estruturada e de graça, sem modelo
  nenhum, e é tentador. Mas é um segundo caminho de leitura, com um segundo formato, e
  vinte e sete implementações estaduais diferentes; e não resolve o cupom de padaria nem o
  PDF do fornecedor. Depois de o caminho do modelo estar de pé, essa comparação fica fácil
  de fazer com dado real.
- **Aprender com a correção.** Se ela corrigir "FARINHA TRIGO DONA BENTA" para "Farinha de
  trigo" três vezes, é razoável que o sistema aprenda. Também é um cadastro novo, uma
  coleção nova e uma fonte nova de erro. `parearComInsumos` já resolve 80% disso de graça:
  na segunda nota, o insumo existe e o nome vem do cadastro dela.
- **Estoque.** A dívida de `ESTADO.md` diz que estoque é número digitado e comprar não o
  movimenta. Continua valendo. Uma nota lida é a tentação mais forte que já apareceu para
  quebrar essa regra, e ela segue de pé: entrada automática sem baixa automática deixaria o
  estoque subindo para sempre.
- **Ler nota de venda.** Esta spec lê o que ela compra.
- Tudo que já está registrado como dívida com gatilho próprio em `ESTADO.md`.

## Decisões que esta spec toma, e que são fáceis de rejeitar

- **`gemini-3.5-flash-lite` e não um modelo maior.** Nota fiscal é texto impresso em fonte
  monoespaçada; se o menor modelo da família não der conta disso, o problema é a foto, e um
  modelo maior vai ler a mesma foto ruim por mais dinheiro. Trocar é uma variável de
  ambiente, e é por isso que ela existe.
- **Categoria decidida por tabela de palavras, e não pelo modelo.** São cinco categorias e
  vinte palavras. Uma tabela é grátis, determinista, testável e corrigível em um toque; a
  mesma resposta vinda do modelo custa token e não pode ser conferida por teste.
- **Um lote em vez de N chamadas de `criarInsumo`.** Custa extrair duas funções de
  `mutations/insumos.ts`. A alternativa custa vinte idas ao servidor e uma falha parcial no
  meio da lista, que é o pior estado possível: metade cadastrada, e ela sem saber qual
  metade.
- **A tela é página, e não painel.** Contraria a invariante do `CLAUDE.md`, e o motivo está
  no escopo da 6A: a invariante é sobre formulário de um objeto.
- **O bloco do caixa nasce ligado.** É a decisão mais discutível da 6B, e o argumento está
  lá: o padrão desligado escolhe o número errado como caminho de menor esforço.
- **Um segundo serviço externo entra junto com o primeiro.** A consulta de CNPJ é a parte da
  spec mais fácil de cortar, e cortá-la custa pouco: some o nome fantasia, some a cidade, e
  fica o nome que o modelo leu. O que **não** se corta é o campo `cnpj` e o `cnpjValido` —
  esses são grátis, offline, e é deles que sai a chave da guarda de duplicidade. Se a sessão
  6A apertar, é a consulta que fica para a 6B, e não o contrário.

## Riscos

**O risco alto é a qualidade da leitura, e ele não se resolve escrevendo código.** Nota
fiscal brasileira de mercado é impressa em bobina térmica, com abreviação own-brand
(`CX PAPEL KRAFT 6 DOCES C/25`), sem padrão entre estabelecimentos, e fotografada torta em
cima da bancada. O modelo vai errar linha. **É por isso que a tela de conferência é o
centro desta spec e não um acessório dela**, e é por isso que o passo 4 do roteiro é ler uma
nota ruim de propósito: o critério não é a leitura sair perfeita, é corrigir seis linhas
custar menos que digitar seis insumos.

**O risco médio é a rota.** É a primeira vez que este projeto tem servidor de verdade — até
aqui, `next build` produzia páginas e o Firestore fazia o resto. Uma chave de API, um token
verificado, um serviço externo com cota e um tempo de resposta que ninguém controla: são
quatro coisas novas de uma vez, e todas as quatro falham de maneiras que não aparecem em
`npm test`.

**O risco baixo é o domínio.** `notaFiscal.ts` é a parte que parece assustadora e é a mais
segura: entra texto, sai número, e o teste diz qual. Se algo desta spec estiver certo no fim
da 6A, é ele.

**O risco que não é desta spec, mas nasce nela:** a partir daqui o sistema tem um custo
variável por uso. Hoje são centavos numa conta só, dentro da faixa gratuita. No dia do
SaaS, é uma linha de custo por cliente, e a decisão de quem paga por ela precisa existir
antes do segundo cliente, não depois. A consulta de CNPJ tem a mesma forma de risco sem o
custo: as 3 consultas por minuto são por IP, e o IP passa a ser o do servidor no dia em que
houver mais de uma cliente. As duas coisas vencem no mesmo dia, e a decisão 8 já diz por
onde sair.

## Aprovações pedidas

1. **`firebase-admin` de `devDependencies` para `dependencies`.** Só a rota o importa,
   nada disso entra no bundle do cliente, e o pacote já está instalado.
2. **`Transacao.notaChave?: string`**, campo opcional novo na 6B. Mudança compatível:
   documento antigo sem o campo continua válido.
3. **Um serviço externo pago passa a fazer parte do produto.** É a decisão que a spec
   inteira assume, e ela é da dona do negócio, não da sessão de implementação.
4. **Um segundo serviço externo, este gratuito e sem cadastro:** a API pública de CNPJ. Não
   entra chave, não entra dependência e não entra custo — entra um host a mais de que a rota
   depende, com o limite de 3 consultas por minuto por IP e a degradação já desenhada para
   quando ele não responder.

---

## Depois desta spec: onde mais um agente se paga

Não é escopo, e nenhum item abaixo vira código sem spec própria. Está aqui porque a ordem
importa e porque a arquitetura desta spec — rota única, o modelo lê palavras, o domínio faz
contas, a tela confirma — é reusável nos três primeiros sem mudar nada.

**1. A mensagem do WhatsApp vira pedido.** É o mais valioso, e é o próximo. O editor de
pedido é a tela onde mais se digita no sistema, e o texto já existe pronto, escrito pela
cliente: _"oi May, queria 20 cookies e 2 caixinhas de 6 pra sexta, pode entregar no
trabalho?"_. Ela cola, o sistema devolve os itens pareados contra as fichas, a quantidade, a
data ("sexta" resolvida contra hoje) e o nome da cliente, e ela confirma no editor que já
existe. É a chamada mais barata do sistema — texto, sem imagem —, reusa a rota, o padrão de
conferência e o pareamento por `nomeBusca` que a 6A constrói. E resolve o gargalo real: o
pedido nasce no WhatsApp e é retranscrito à mão.

**2. A receita escrita vira ficha técnica.** É o que decide a adoção quando houver uma
segunda cliente. Cadastrar trinta fichas à mão é onde qualquer usuária nova desiste, e toda
confeiteira tem as receitas escritas em algum lugar — caderno, print, bloco de notas. Colar
ou fotografar, e o sistema devolve os itens pareados contra os insumos, com as medidas
caseiras convertidas: "2 xícaras de farinha" → 240 g. A conversão é tabela, é domínio puro e
é testável, exatamente como `embalagemDoTexto`. O risco é a medida caseira ser ambígua, e a
resposta é a mesma desta spec: ela confere linha por linha.

**3. Qualquer comprovante vira lançamento no caixa.** Conta de luz, boleto do gás, print do
Pix. Depois da 6B, 80% do código já existe: muda o prompt e o destino. Vale pouco sozinho,
custa quase nada em cima do que já estará de pé, e cobre o contexto 4 inteiro.

**4. Ditado na bancada.** O contexto 1 do `PRODUCT.md` diz que digitar é quase impossível
com as mãos na massa, e é o único contexto que nenhuma tela deste sistema resolve de
verdade. Voz é a resposta óbvia e é a mais arriscada: cozinha com batedeira ligada é um
canal ruim, e escrever numa ficha por voz é mexer no número que vira preço. Se acontecer,
começa **só por leitura** — "quanto vai de chocolate no cookie?" — e nunca por escrita.

**Duas coisas que eu recomendo não fazer:**

- **Resumo do mês escrito por IA no painel.** É o pedido que sempre aparece e é o que mais
  custa. O painel já diz o que aconteceu com números exatos e com a linguagem da
  confeitaria; um parágrafo gerado sobre o dinheiro dela, ao lado desses números, ou repete
  o que os números já dizem, ou diz algo que eles não sustentam. Na segunda vez que
  divergirem, ela para de confiar nos dois.
- **Categorizar transação com modelo.** "Conta de luz" → `DESPESA_FIXA` é uma tabela de
  vinte palavras. Chamar um modelo para isso é pagar por não escrever a tabela, e trocar um
  acerto determinista por um acerto provável.
