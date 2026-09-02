# Decisões de arquitetura

Registro do que foi decidido, por quê, e o que a decisão custa. Serve para não
relitigar escolha resolvida e para saber o que revisar quando o contexto mudar.

**Um arquivo só, e não um por decisão.** O padrão ADR clássico usa um arquivo por
registro, o que serve a equipes que fazem arqueologia por `git blame`. Aqui o leitor
mais frequente é uma sessão de implementação que precisa carregar tudo de uma vez:
um arquivo custa uma leitura, quinze custam quinze.

Formato: cada decisão tem contexto, decisão, consequência e status.
Status é `vigente`, `provisória` (tem prazo de validade conhecido) ou `substituída`.

---

## D01 · Escopo de dados por conta, não por login

**Status:** substituída por D14 · decidida em 2026-09-01, executada em 2026-09-01

**Contexto.** Hoje existe uma usuária. Todo dado mora em `users/{uid}/...`, o que torna a
regra de segurança trivial: `request.auth.uid == uid`.

**Decisão.** Manter `users/{uid}` até o refactor da spec `000-contas`, e então migrar para
`contas/{contaId}` com o vínculo de associação em custom claim.

**Consequência.** `uid` identifica login, não negócio. No dia em que houver uma ajudante, um
contador com acesso, ou uma pessoa com dois negócios, o caminho está errado. Migrar com zero
dados é renomear oito arquivos; migrar com clientes pagantes é projeto de cutover. Por isso
a decisão tem prazo: **executar antes do Módulo 2**, porque cada módulo novo adiciona
arquivos que carregam `uid`. O prazo foi cumprido: a spec `000-contas` rodou no mesmo dia,
com um documento no banco e zero migração. O arranjo que ficou está em D14.

---

## D02 · Dinheiro em centavos inteiros

**Status:** vigente

**Contexto.** O sistema existe para acertar preço. Erro de arredondamento aqui é o defeito
mais caro possível.

**Decisão.** Todo valor monetário é `number` inteiro em centavos (`Centavos`). Custo unitário,
que é fração de centavo por grama, usa um tipo separado (`CentavosFracionados`) e só é
arredondado ao virar total de linha.

**Consequência.** Formatação e parsing ficam concentrados em `src/lib/domain/money.ts`.
Trocar a representação depois seria migração sobre todo documento de todo cliente.

---

## D03 · Ingredientes e embalagens na mesma coleção

**Status:** vigente

**Contexto.** O Módulo 1 pedia cadastro de ingredientes e, separadamente, de embalagens,
etiquetas e insumos de armazenamento.

**Decisão.** Uma coleção `insumos`, discriminada por `categoria`.

**Consequência.** Um motor de custo, uma tela de cadastro, uma leitura para popular o app.
O preço de embalagem entra na ficha técnica pelo mesmo caminho que o de farinha. Se algum
dia embalagem precisar de campos que ingrediente não tem, o discriminante já está lá.

---

## D04 · Campos derivados gravados, não calculados na leitura

**Status:** vigente

**Contexto.** Firestore cobra por leitura, e a usuária opera offline com frequência.

**Decisão.** `custoUnidadeBase`, `custoUnidadeBaseCorrigido`, `custoTotalLote`,
`custoUnitario` e o progresso da meta são calculados na escrita e gravados.

**Consequência.** Leitura barata e lista que renderiza sem processar. O preço é a
possibilidade de divergência: quando um insumo muda de preço, as fichas que o usam ficam
com valor velho. Resolvido por D05.

---

## D05 · Invalidação explícita de ficha via `insumoIds`

**Status:** vigente

**Contexto.** Consequência direta de D04.

**Decisão.** Cada ficha espelha os ids dos seus insumos em `insumoIds[]`. Ao mudar um preço,
uma consulta `array-contains` acha as fichas afetadas e marca `custoDesatualizado: true`.

**Consequência.** A interface mostra o selo de custo desatualizado antes que um preço velho
vire orçamento. Custa uma leitura das fichas afetadas por mudança de preço, o que acontece
raramente e nunca em caminho crítico.

---

## D06 · `Timestamp.now()` em vez de `serverTimestamp()`

**Status:** vigente

**Contexto.** `serverTimestamp()` grava `null` no cache local até a sincronização acontecer.

**Decisão.** Usar o relógio do aparelho.

**Consequência.** Com uma única escritora o relógio local basta, e a lista não quebra ao
ordenar por data justamente no cenário mais comum: offline. Revisar se algum dia houver
múltiplos escritores na mesma conta, quando a ordem entre eles passar a importar.

---

## D07 · Permissão por custom claim, não por documento

**Status:** vigente

**Contexto.** As regras precisam saber se quem escreve tem acesso.

**Decisão.** Claim `admin` no token, concedida por script. As regras leem
`request.auth.token`.

**Consequência.** Avaliação de regra com zero leitura. Um allowlist em documento
(`get(/admins/$(uid))`) seria cobrado a cada acesso. O preço é que conceder acesso exige
re-emitir o token, ou seja, sair e entrar de novo. A claim virou mapa de contas em D14; o
mecanismo, que é o que esta decisão registra, continua o mesmo.

---

## D08 · Snapshot de custo e nome nos pedidos

**Status:** vigente

**Contexto.** Um pedido entregue é fato histórico; uma ficha técnica é documento vivo.

**Decisão.** `ItemPedido` guarda `nomeSnapshot`, `precoUnitario` e `custoUnitarioSnapshot`
congelados no momento do pedido.

**Consequência.** Reajustar o preço do chocolate não reescreve o lucro de pedidos já
entregues. Duplica dado de propósito, e é o tipo certo de duplicação.

---

## D09 · Agregado mensal como documento único

**Status:** vigente

**Contexto.** O painel financeiro precisa de KPIs, gráfico diário, ranking de produtos e
progresso de meta.

**Decisão.** `agregados/{YYYY-MM}` carrega tudo isso, mantido por `FieldValue.increment`
nas escritas de pedido e transação.

**Consequência.** O painel inteiro sai de uma leitura, e `increment` entra na fila offline.
Ver D10 para o limite dessa escolha.

---

## D10 · Agregados incrementados pelo cliente

**Status:** provisória

**Contexto.** Consequência operacional de D09.

**Decisão.** O cliente incrementa os agregados diretamente, sem Cloud Function.

**Consequência.** Funciona offline e não custa invocação. Em SaaS vira problema de confiança,
porque um cliente malicioso escreve o número que quiser no agregado financeiro, e as regras
não conseguem validar "incrementou exatamente um". **Prazo de validade: o segundo cliente
pagante.** A troca é contida porque `src/lib/firebase/mutations/` é a única costura.

---

## D11 · Kit é ficha com componentes, com um nível de profundidade

**Status:** vigente

**Contexto.** A Maynara vende por unidade e em caixa/kit.

**Decisão.** `FichaTecnica.tipo` distingue `SIMPLES` de `KIT`. Um kit consome outras fichas
via `componentes[]`, mais a própria embalagem. Kit não contém kit.

**Consequência.** Um kit é precificado pelo mesmo motor de uma receita, e o pedido referencia
os dois pelo mesmo campo. O limite de um nível mantém a explosão de demanda da lista de
compras finita e o custo auditável. Se um dia houver kit de kits, será decisão nova, com
detecção de ciclo.

---

## D12 · Build fixado em webpack

**Status:** provisória

**Contexto.** Next 16 usa Turbopack por padrão. `@serwist/next`, que gera o service worker,
ainda depende de webpack e é silenciosamente ignorado sob Turbopack.

**Decisão.** `dev` e `build` passam `--webpack`.

**Consequência.** Build mais lento em troca de PWA que funciona. Como o uso offline é
requisito e não enfeite, a troca vale. **Revisar quando** `@serwist/turbopack` sair do
experimental.

---

## D13 · Tema claro por padrão

**Status:** vigente

**Contexto.** Decisão de design, registrada aqui porque costuma ser questionada.

**Decisão.** Claro por padrão, escuro seguindo `prefers-color-scheme`.

**Consequência.** A cena que decide é a Maynara com o celular na bancada às duas da tarde,
cozinha iluminada. Painel escuro nessa luz é ilegível, e seria também o reflexo previsível
de "ferramenta de gestão que não quer parecer planilha". Detalhes em `DESIGN.md`.

---

## D14 · Conta como dono do dado, claim como mapa de contas

**Status:** vigente · substitui D01

**Contexto.** Execução da spec `000-contas`. `users/{uid}` amarrava o dado ao login.

**Decisão.** Todo dado mora em `contas/{contaId}/…`. O vínculo login → conta é uma custom
claim com a forma `{ contas: { [contaId]: papel } }`, e `papel` é string livre com `'DONA'`
como único valor emitido. O documento `contas/{contaId}` guarda só `nome`, `proprietaria`,
`criadaEm` e `v`.

**Consequência.** `uid` volta a significar apenas "quem entrou". Uma ajudante, um contador
com acesso de leitura ou um segundo negócio passam a ser mais um par no mapa, sem tocar em
caminho, regra ou consulta. Três escolhas ficam registradas porque um leitor futuro vai
questioná-las:

- **A regra não confere o papel**, só a presença da chave no mapa. Regra escrita para papel
  que não existe é regra que ninguém testou. Quando existir o segundo tipo de acesso, o
  vocabulário nasce junto com o caso de uso — não antes.
- **`AuthProvider` toma a primeira chave da claim como conta ativa**, e não há seletor de
  conta na interface: com uma conta, escolher é ruído. É o único ponto que passa a consultar
  uma preferência no dia em que houver a segunda.
- **O documento da conta é assinatura, não leitura avulsa.** Renomear o negócio aparece sem
  recarregar o app, e o cache do Firestore devolve a versão local antes de haver rede.

O que ficou de fora, e por quê: cadastro, convite, seleção de conta, tela de membros e
cobrança viram código morto se a hipótese do SaaS não se confirmar. O gancho existe; o
resto espera o segundo usuário real.

---

## D15 · Versão de schema gravada em todo documento

**Status:** vigente

**Contexto.** Carona da spec `000-contas`. Sem marca de versão, daqui a um ano a forma de um
documento se adivinha pela presença de campos — e "este insumo tem `perdaPercentual`?" é uma
pergunta que não distingue documento antigo de documento incompleto.

**Decisão.** `DocumentoBase` ganha `v: VersaoSchema`, e toda mutação grava `VERSAO_SCHEMA`.
O campo vale também para os documentos que não herdam de `DocumentoBase` — `ConfiguracaoGeral`,
`ResumoMensal` e `ResumoGlobal` —, porque o motivo é o mesmo e a exceção seria arbitrária.

**Consequência.** `VersaoSchema` é o literal `1`, e não `number`: quando o formato mudar, o
alias vira `1 | 2` e o compilador aponta cada lugar que precisa decidir entre as duas formas.
Uma migração silenciosa deixa de ser possível. O preço é um campo de quatro bytes por
documento e um alias a manter.

---

## D16 · Acesso concedido por script até existir servidor

**Status:** provisória

**Contexto.** Um sistema que pretende ser comercial não pode depender de alguém rodar
`node` para liberar cliente. A pergunta é legítima e reaparece toda vez que alguém abre
`scripts/conceder-acesso.mjs`, então fica registrada com o motivo e com o gatilho.

**Decisão.** Cadastro self-serve fica fora até existir código de servidor confiável. Até lá,
`conceder-acesso.mjs` é a versão manual do endpoint que vai existir.

**Consequência.** O que torna isso uma questão de backend, e não de tela: **custom claim só
se escreve com o Admin SDK, por construção.** É exatamente essa restrição que sustenta D07 —
se o cliente pudesse escrever a própria permissão, a claim não valeria nada e a regra
voltaria a custar leitura. Logo "tela de cadastro" não é uma tela: é uma Cloud Function ou
um route handler, e a tela são os 10% fáceis.

Disso decorre que o script não é trabalho descartável: o corpo dele — `getUserByEmail`,
criar `contas/{contaId}`, `setCustomUserClaims` — é o corpo do futuro endpoint. Muda quem
chama, não o que faz.

**Prazo de validade: o mesmo de D10, o segundo cliente pagante.** Não é coincidência. Os
dois casos esbarram na mesma parede: agregado incrementado pelo cliente e permissão
concedida pelo cliente são inseguros pelo mesmo motivo, e caem juntos quando houver
servidor. Cadastro entra nesse módulo, junto de trial e cobrança — que é onde os campos
`plano`, `status` e `trialAte` de `Conta` estavam esperando. Cadastro solto, sem cobrança,
seria porta sem nada atrás: quem entra ganha uma conta vazia, e o projeto ganha a fatura de
leitura.

---

## D17 · Configuração é sugerida na tela e gravada só ao salvar

**Status:** vigente · decidida em 2026-09-01 na spec `002-precificacao`, sessão 2A

**Contexto.** A tela `/configuracao` precisa começar preenchida (160 horas produtivas, Pix
sem taxa, débito 1,99%, crédito 4,99%): campo vazio e obrigatório trava o cadastro e um
rateio zerado produz preço errado com cara de certo. Mas a conta nova não tem o documento
`configuracao/geral`, e alguém precisa decidir de onde vêm esses números.

**Decisão.** Os padrões moram em `CONFIGURACAO_SUGERIDA`, no código, e a tela os exibe sem
gravar nada. O documento nasce na primeira vez que a Maynara toca em "Salvar", em uma
escrita só, com `setDoc(..., { merge: true })`. Não há semeadura na criação da conta, nem
salvamento automático por campo.

**Consequência.** Sugestão não vira dado por engano: enquanto ela não salvar, uma ficha
técnica sabe que não há configuração e avisa, em vez de calcular com número que o sistema
inventou. O `merge` é o que permite a esta tela não ser dona do documento inteiro:
`categoriasProduto` e o que os módulos seguintes acrescentarem sobrevivem a um salvamento
feito por uma versão da tela que nem conhece esses campos.

O preço é que a tela guarda estado não salvo: as formas de pagamento editadas no painel
mudam a memória e só vão ao banco no salvamento da página. Por isso a barra de alterações
pendentes é fixa e visível no celular, e não um aviso discreto. Autosalvamento por campo
seria uma escrita por tecla digitada, e `custoIndiretoPorHora` é derivado do par
despesas/horas: gravar um dos dois sozinho publica um rateio que a usuária não pediu.

Vale notar o que a tela **não** faz: ela não mostra preço sugerido a partir de custo. A
aritmética de markup e margem é da sessão 2B e mora em `precificacao.ts`, com teste. Um
segundo lugar calculando preço seria um segundo lugar para divergir. O bloco de preço
padrão mostra o efeito do arredondamento, que já é de `money.ts`.

---

## D18 · Forma de pagamento é item do documento de configuração

**Status:** vigente

**Contexto.** As formas de pagamento têm id, são editadas uma a uma e são referenciadas por
venda. Isso normalmente pede uma coleção.

**Decisão.** Elas vivem no array `formasPagamento` dentro de `configuracao/geral`, com id
gerado no aparelho (`novoId()`), e desativadas por `ativo: false` em vez de removidas.

**Consequência.** São meia dúzia de itens que o app precisa ter em memória o tempo todo, em
toda tela de preço e de venda: uma coleção custaria uma consulta a mais para trazer o que já
vem junto com o resto da configuração. O id nasce offline porque não há ida ao servidor para
pedir um, e ele só precisa ser único dentro do próprio documento.

A desativação segue a mesma regra de insumo e ficha, pelo mesmo motivo: pedido antigo aponta
para o id da forma, e o histórico de quanto a maquininha comeu precisa continuar auditável.
O limite conhecido é o teto de 1 MB do documento, que meia dúzia de formas não chega perto
de ameaçar; se um dia houver dezenas, a conversa é outra.

**O que dava para consertar hoje foi consertado.** A pior parte do modelo de claim era a
instrução "saia e entre novamente" — o token em cache vale uma hora e segura a claim recém
concedida do lado de fora. `reconferirAcesso()` força a renovação com
`getIdTokenResult(true)`, e a tela de acesso negado virou um botão. É o mesmo mecanismo que
um cadastro self-serve vai precisar logo depois do `createUserWithEmailAndPassword`.

---

## D19 · Um caminho só calcula os números da ficha

**Status:** vigente · decidida em 2026-09-01 na spec `002-precificacao`, sessão 2B

**Contexto.** O editor precisa mostrar custo, preço sugerido e lucro enquanto ela digita, e a
mutação precisa gravar exatamente esses campos (`DECISOES.md#d04`). São dois consumidores da
mesma aritmética, e o jeito óbvio — a tela calcula para exibir, a mutação recalcula para
gravar — cria dois lugares para o preço divergir.

**Decisão.** `derivarFicha()`, em `src/lib/domain/custoFicha.ts`, devolve de uma vez custo,
taxas, preço sugerido, preço arredondado, preço praticado e a verificação sobre ele. O editor
chama para desenhar o painel; `corpoDaFicha()` chama para montar o documento. Ninguém mais
soma parcela de custo nem divide por margem.

**Consequência.** O número que ela viu antes de tocar em "Salvar" é o número gravado, por
construção e não por disciplina. O preço é uma função a mais na camada pura — `custoFicha.ts`
passa a importar `precificacao.ts`, o que amarra os dois módulos que a spec pediu separados.
A separação continua valendo para quem só quer uma das duas contas.

A guarda de margem impossível mora nessa mesma camada: `calcularPrecoSugerido` devolve
`{ ok: false, motivo }` quando margem mais taxas chegam a 100%, porque nesse ponto o divisor é
zero e daí para cima é negativo. Nenhuma tela precisa lembrar de checar antes de dividir.

---

## D20 · Embalagem é categoria, não campo

**Status:** vigente

**Contexto.** A ficha grava `custoInsumos` e `custoEmbalagem` separados, e alguém precisa
decidir de que lado cai cada linha. O insumo não tem um campo "é embalagem": tem `categoria`,
com cinco valores (`DECISOES.md#d03`).

**Decisão.** `ehEmbalagem(categoria)` é verdadeiro para `EMBALAGEM`, `ETIQUETA` e
`ARMAZENAMENTO`. `INGREDIENTE` e `OUTRO` ficam do lado da receita.

**Consequência.** A divisão existe porque é o custo de embalar que a Maynara esquece de
cobrar, e vê-lo somado à farinha esconde justamente o que ela precisa enxergar. `OUTRO` cai
na receita porque é a categoria do que ela não soube classificar, e chamar isso de embalagem
seria adivinhar em cima de um palpite. Se um dia um insumo precisar do rótulo explícito, o
campo nasce no insumo e esta função vira uma leitura dele — sem tocar em quem soma.

O mesmo módulo carrega `podeSerComponente()`, que é a forma executável de `D11`: kit não
entra em kit, ficha não entra em si mesma, e arquivada não entra em nada. A busca de
componentes filtra por ela, e o teste cobre os três casos — regra de negócio escrita uma vez,
e não repetida em cada tela que oferecer uma lista de fichas.

---

## D21 · Preço sugerido é oferta, não imposição

**Status:** vigente

**Contexto.** O painel de preço mostra o sugerido pela conta e o praticado de fato, e os dois
precisam conviver: ela arredonda para a vitrine, cobre a concorrente, ou simplesmente decide
outro número.

**Decisão.** O formulário guarda `precoManual`. Enquanto for falso, o preço praticado
acompanha o sugerido a cada tecla digitada na receita. No instante em que ela escreve um
preço, vira verdadeiro e o número para de se mexer sozinho; um botão "Usar" volta atrás. Toda
ficha já salva abre com `precoManual` verdadeiro.

**Consequência.** Preço salvo é decisão tomada: encarecer o chocolate muda o custo e o
sugerido na tela, e **não** muda sozinho o que ela cobra da cliente — o painel mostra a
margem encolhendo e oferece o novo preço. O contrário seria o sistema reprecificando o
cardápio pelas costas dela.

O par de estados evita o efeito que sincronizaria um campo com o outro: o preço exibido é
derivado a cada render, e não copiado para o estado. Ficha aberta e não salva não escreve
nada, como em `#d17`.

---

## D22 · `react-hook-form` só no editor de ficha

**Status:** vigente

**Contexto.** As telas do projeto usam `useState` mais `zod.safeParse` no salvamento. O
editor de ficha tem duas listas dinâmicas — itens e componentes — em que remover a terceira
linha não pode embaralhar as outras.

**Decisão.** `useFieldArray` cuida das listas e `register` dos campos; a validação continua
sendo `esquemaFicha.safeParse` sobre os números já convertidos, e as falhas do zod viram
erros de campo por `setError`, com o caminho do problema (`itens.2.quantidade`) virando o
caminho do formulário.

**Consequência.** Uma biblioteca a mais em uma tela só, com o resto do projeto inalterado. A
validação não migrou para `zodResolver` porque os campos guardam texto enquanto ela digita —
"1," é estado legítimo de teclado — e o esquema fala em número: o resolver exigiria um
esquema sobre a forma do formulário, duplicando as regras que já existem sobre a forma dos
dados.

Dois efeitos colaterais registrados porque surpreendem:

- **`Campo` e `Seletor` passaram a aceitar `ref`.** `register` precisa da referência do
  elemento, e no React 19 `ref` é propriedade comum. Uma linha em cada, compatível com todo
  uso existente.
- **`useWatch`, e não `form.watch()`.** O compilador do React não consegue memoizar com
  segurança o que `useForm()` devolve e desiste do componente inteiro, com aviso no lint.
  `useWatch` é hook e não tem esse problema; o tipo vem parcial e é afirmado, porque todo
  campo nasce com valor em `valoresIniciais`.
