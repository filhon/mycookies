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

**Status:** vigente enquanto nenhum número do agregado decidir cobrança — era provisória, e o prazo caiu com `#d107`

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

**A primeira ressalva caiu na 030: a regra confere o papel** (`#d153`, `#d154`). As outras
duas continuam: a primeira chave é a conta ativa, sem seletor.

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

**Status:** cumprida na 027 (2026-09-19): o handler existe (`POST /api/conta`, `D141`), e o
script continua para liberar à mão.

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

---

## D23 · O agregado tem duas implementações, e o teste exige que concordem

**Status:** vigente · decidida em 2026-09-02 na spec `004-caixa`, sessão 4A

**Contexto.** `D09` guarda o mês inteiro em um documento e `D10` o mantém por incremento
no cliente. É rápido, funciona offline e é silenciosamente perigoso: um delta perdido não
dá erro, não aparece em log e só é notado quando o lucro do mês parece estranho — e aí não
há como saber quando começou nem quantos meses estão tortos.

**Decisão.** `src/lib/domain/caixa.ts` traz o par `deltaDaTransacao` (o que muda quando um
lançamento entra ou sai) e `agregarTransacoes` (o mês somado do zero). A segunda **não** é
escrita em termos da primeira: são duas implementações da mesma verdade, e
`tests/domain/caixa.test.ts` exige que uma sequência de deltas produza exatamente o mesmo
objeto que a reconstrução — no caso de aceite, ao editar, ao arquivar e ao trocar de mês.

**Consequência.** Se as duas divergirem, o teste diz isso antes da usuária. A mesma
`agregarTransacoes` é o corpo de "Recalcular o mês", que lê as transações da competência e
reescreve o agregado: a rede de segurança e o oráculo do teste são a mesma função, e é por
isso que ela vale o código duplicado.

Duas escolhas de implementação ficam registradas porque surpreendem:

- **`somarParcelas` apaga a chave que chega a zero.** Uma categoria sem gasto nenhum não é
  uma linha de R$ 0,00 no painel, é uma linha que não existe. É também o que torna o
  resultado de uma sequência de deltas comparável, campo a campo, com o de uma reconstrução:
  sem isso a categoria revertida sobraria zerada de um lado e ausente do outro.
- **Recalcular lê o agregado antes de reescrevê-lo.** `mergeFields` substitui `porDia`
  inteiro, e `porDia[].pedidos` é do Módulo 3. Sem trazer a contagem de volta, recalcular o
  caixa apagaria uma metade do documento que este módulo nem alimenta. Custa uma leitura,
  contra a spec, que pedia uma consulta e uma escrita.

---

## D24 · A taxa da maquininha é campo derivado da entrada, e fica congelada nela

**Status:** vigente

**Contexto.** Uma venda no crédito de R$ 120,00 deixa R$ 5,99 na maquininha. Esse valor
precisa aparecer no painel, e há dois jeitos óbvios de fazer isso: criar uma transação de
saída automática, ou recalcular a taxa a partir da forma de pagamento sempre que alguém
precisar dela.

**Decisão.** Nem um nem outro. A venda entra pelo valor bruto com `formaPagamentoId`, a
taxa é calculada na escrita por `taxaDaEntrada` e gravada em `Transacao.custoTaxa`, e o
agregado a soma em `custoTaxasPagamento`, com linha própria no painel.

**Consequência.** O Módulo 2 inteiro existe para tornar essa taxa visível na hora de dar o
preço; dissolvê-la entre aluguel e farinha desfaria o trabalho. E uma transação automática
poluiria a lista com uma linha que a usuária não lançou e não sabe explicar.

O `custoTaxa` gravado é snapshot pelo mesmo motivo de `ItemPedido.custoUnitarioSnapshot`
(`D08`), e é a parte que não se pode cortar: **editar é reverter mais aplicar.** Se a taxa
fosse recalculada a partir da forma de pagamento de hoje, mudar o crédito de 4,99% para
3,00% faria o arquivamento de uma venda antiga reverter um número diferente do que foi
somado meses atrás — e o agregado torceria em silêncio, exatamente o risco que `D23`
existe para fechar. É também o que permite às duas funções do par receberem só a transação,
sem carregar a configuração junto.

A categoria `TAXA_PAGAMENTO` continua existindo para o que é despesa avulsa de verdade —
aluguel da maquininha, mensalidade de gateway. A dica do campo diz isso no lugar onde ela
escolhe, porque sem essa frase a taxa entra duas vezes.

---

## D25 · Gráfico desenhado à mão, sem dependência nova

**Status:** vigente

**Contexto.** O painel do mês precisa de um gráfico de barras por dia.

**Decisão.** São 31 `div` com altura percentual em CSS. Nenhuma biblioteca de gráfico.

**Consequência.** Uma dependência de produção precisaria de aprovação (`CLAUDE.md`) para
desenhar o que uma `div` desenha, e entraria no pacote de um app que precisa abrir offline
na bancada. O preço é que acessibilidade e rótulo são responsabilidade nossa: cada dia é um
item de lista com a leitura em texto para leitor de tela, porque a altura de uma barra não é
informação para quem não a enxerga.

---

## D26 · `date-fns` sai do projeto; datas usam `Date` local e `Intl`

**Status:** vigente · substitui a dívida registrada em `ESTADO.md`

**Contexto.** `date-fns` estava no `package.json` desde o começo e nunca foi importado. A
spec `004-caixa` deu o prazo: ou ele ganha uso real na sessão 4A, que é o primeiro módulo em
que data é dado e não enfeite, ou sai.

**Decisão.** Saiu. `src/lib/domain/datas.ts` faz o que o caixa precisa com a plataforma:
recortar `'YYYY-MM-DD'`, contar os dias de um mês e escrever o nome dele em português.

**Consequência.** O que a biblioteca resolveria aqui é `slice`, o dia zero do mês seguinte
(`new Date(ano, mes, 0).getDate()`) e `Intl.DateTimeFormat('pt-BR')` — que já está no
navegador, conhece o idioma e não pesa no pacote de um app que abre offline. Trazer um
locale inteiro para escrever "setembro de 2026" seria pagar por tradução que o navegador dá.

O que o módulo de fato protege, e é a razão de ele existir separado: **toda data é lida no
fuso do aparelho, nunca em UTC.** `new Date('2026-09-03')` é meia-noite UTC, que no Brasil
cai no dia 2 às 21h — um lançamento do dia 3 apareceria no dia 2, e uma venda do dia 1º
mudaria de competência. `dataDeISO` monta a data pelos componentes locais, e há teste para
isso. Se um dia aparecer aritmética de calendário de verdade (fuso de cliente em outro país,
recorrência real), a conversa recomeça — com um caso de uso na mão.

---

## D27 · A meta tem a competência como id

**Status:** vigente · decidida em 2026-09-02 na spec `004-caixa`, sessão 4B

**Contexto.** `metas` é uma coleção, e o normal seria id gerado com a competência em um
campo. Isso pede uma consulta e um índice para achar a meta do mês, e deixa a porta aberta
para duas metas do mesmo mês existirem ao mesmo tempo.

**Decisão.** A meta mora em `metas/{'YYYY-MM'}`, com a competência como id do documento.
Salvar de novo o mesmo mês corrige a meta que já existe, com `merge` para não apagar o que
esta tela não conhece (`lucroAlvo` hoje, o que vier depois amanhã).

**Consequência.** "Um mês tem uma meta só" passa a ser estrutural em vez de combinado: não
existe estado em que duas metas disputem o mesmo mês, e a tela busca a meta pelo mesmo
endereço em que busca o agregado — uma leitura direta, sem consulta e sem índice novo. O
preço é que meta não é histórico: reescrever o alvo de setembro apaga o alvo anterior de
setembro, e não há registro de que ele existiu. Para uma única usuária ajustando a própria
meta, o histórico seria ruído; se um dia a pergunta "que meta eu tinha antes" aparecer, ela
nasce como coleção de versões, e não como segunda meta ativa.

Por isso também não existe arquivar meta: `ativo` fica `true`, e mudar de ideia é mudar o
número. Um documento a menos para a interface explicar.

---

## D28 · `ticketMedioReferencia` guarda preço de cardápio, e `pedidosNecessarios` fica em zero

**Status:** vigente na primeira metade, resolvida na segunda por D38

**Contexto.** `Meta` foi tipada para um mundo com pedidos: `ticketMedioReferencia` é o valor
médio de um pedido e `pedidosNecessarios` é quantos pedidos fecham a meta. O Módulo 4 veio
antes do 3, e pedido não existe: não há histórico de venda de onde tirar ticket médio.

**Decisão.** `ticketMedioReferencia` guarda o **preço médio de um doce**, sugerido pela média
de `precificacao.precoVenda` das fichas ativas e editável pela usuária. `pedidosNecessarios`
é gravado como zero e **não aparece em tela nenhuma**.

**Consequência.** É o único sentido possível para o campo hoje, e é o sentido que a tela
inteira usa: a meta é dita em doces por semana, que é a unidade em que a Maynara produz.
Preencher `pedidosNecessarios` com o preço unitário faria o campo afirmar "cada pedido tem
um doce", que é falso — e número falso em painel financeiro é o pior defeito deste projeto.
Zero ali é ausência, e ausência não se mostra.

O que muda quando o Módulo 3 chegar: `pedidosNecessarios` ganha alimentação, e
`ticketMedioReferencia` passa a ter duas fontes possíveis. A decisão de qual vale nasce lá,
com o dado na mão.

Ficha sem preço fica fora da média, e não entra como R$ 0,00: preço zero é ficha ainda não
precificada, e contá-la puxaria a média para baixo inflando a quantidade de doces da meta.

---

## D29 · O espelho da meta é escrito pela tela, e nunca lido pela mutação

**Status:** vigente

**Contexto.** `ResumoMensal.meta` espelha o progresso para que o cartão da tela Hoje saia de
uma leitura (`#d09`). O espelho não pode ser mantido por `increment` como o resto do
agregado: `progresso` e `unidadesRestantes` não são lineares no realizado. Alguém precisa
saber o alvo e o total de entradas na hora de gravar um lançamento.

**Decisão.** Quem sabe é a tela, que já assina o agregado e a meta. `criarTransacao`,
`atualizarTransacao` e `arquivarTransacao` recebem um `ContextoMeta`
(`{ competencia, meta, entradas }`) e reescrevem o espelho inteiro dentro da mesma escrita
que aplica os incrementos. `recalcularMes` recebe a meta pelo mesmo motivo.

**Consequência.** Lançar continua funcionando sem rede, que é o requisito que decide: uma
leitura no caminho de gravar tornaria o lançamento dependente de conexão, e a feira é onde
ela lança. Dois limites conhecidos, os dois com a mesma rede de segurança de `#d23`:

- **Editar um lançamento de setembro para outubro move o espelho de setembro, e não o de
  outubro.** A tela conhece o mês que está mostrando, e o agregado de outubro recebe o
  dinheiro mas fica com o espelho de antes até a próxima escrita naquele mês, ou até
  "Recalcular o mês". É o caso mais raro do módulo pagando pelo caso mais comum.
- **`realizado` é gravado por valor, e `entradas` por incremento.** Se a tela gravar duas
  vezes antes de a assinatura devolver o total novo, o espelho fica atrás por um lançamento.
  Recalcular o mês reescreve os dois a partir das transações.

Mês sem meta não ganha espelho pela metade: a chave `meta` simplesmente não entra na
escrita, e `mergeFields` só a lista quando há meta — listar sem ter o campo apagaria o
espelho que a chamada não conhece.

---

## D30 · O que no espelho depende do calendário é refeito na leitura

**Status:** vigente

**Contexto.** Consequência direta de `#d29`. Duas linhas do espelho dependem do dia de hoje
e não do dinheiro: `unidadesPorSemanaRestante` e `noRitmo`. O espelho é reescrito quando o
dinheiro se move, então uma venda no dia 5 congela um esforço calculado com 26 dias pela
frente. Lido no dia 20, esse número diz que falta menos do que falta.

**Decisão.** `ritmoDoEspelho` refaz as duas na leitura, a partir do que o próprio espelho já
traz certo: `unidadesRestantes` e `realizado` vêm do dinheiro, e o resto é calendário. Os
campos continuam gravados, porque `ResumoMensal.meta` os define e o Módulo 3 vai reescrever
o mesmo documento — mas quem desenha a tela usa a versão refeita.

**Consequência.** O número nunca aparece menor do que é, e continua custando uma leitura só:
nenhuma consulta a mais, nenhum documento a mais. Vale a pena porque esforço subestimado em
meta é pior do que meta nenhuma — ela produziria menos acreditando que está no ritmo.

Da mesma família, e no mesmo módulo: `esforcoRestante` troca "por semana" por "até o fim do
mês" quando restam menos de sete dias. Repartir 261 doces por dois sétimos de semana devolve
914 doces por semana, que é uma conta correta e uma informação inútil — no dia 29 o número
honesto é o total que falta.

---

## D31 · O pedido é identificado por código de aparelho, e `numero` fica sem uso

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3A

**Contexto.** `Pedido` foi tipado com dois identificadores: `codigo`, curto e legível, e
`numero`, o sequencial humano que toda nota fiscal tem. `ResumoGlobal` foi tipado com
`ultimoNumeroPedido`, `pedidosAbertos` e `proximaEntrega` para sustentar o segundo e para
poupar consultas.

**Decisão.** `codigo` nasce no aparelho — `P-AAMMDD-XXX`, com três caracteres do `novoId()` —
e é a identidade do pedido. **`numero` não é gravado**, e os três campos de `ResumoGlobal`
ficam em zero. `totalClientes`, esse sim, é incrementado, pelo mesmo caminho de
`totalInsumos` e `totalFichas`.

**Consequência.** Um sequencial exige alguém contando em um lugar só, contar exige
`runTransaction`, e transação exige rede — proibida em caminho crítico (`CLAUDE.md`). O
pedido anotado na feira, sem sinal, não pode esperar um número. O preço é que o código não
ordena: `P-260915-K3F` não diz que veio antes de `P-260915-A2C`. Quem ordena é
`dataEntregaISO`, e é por ela que a agenda anda.

`pedidosAbertos` e `proximaEntrega` ficam de fora por um motivo diferente e mais forte:
**campo mantido por incremento que ninguém lê é campo que torce em silêncio.** A agenda já
responde as duas perguntas com a consulta que a tela Hoje faz de qualquer jeito, e um
contador a mais seria mais uma coisa para "Recalcular" ter que consertar um dia.

---

## D32 · Preço e custo congelam quando o item entra no pedido

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3A

**Contexto.** `D08` decidiu que `ItemPedido` guarda `nomeSnapshot`, `precoUnitario` e
`custoUnitarioSnapshot`. Faltava dizer **quando** o congelamento acontece, e o que fazer
quando a ficha muda de preço depois.

**Decisão.** O item congela preço e custo no instante em que entra no pedido. Mudar a
quantidade multiplica o congelado e nunca busca o preço de hoje. Enquanto o pedido é
`ORCAMENTO`, e só enquanto é, a linha cujo preço divergiu da ficha ganha um selo com o preço
de agora e a ação **"usar o preço de hoje"**, que troca preço e custo juntos.

**Consequência.** É o mesmo vocabulário do `custoDesatualizado` da ficha (`#d05`) e a mesma
regra de `#d21`: o sistema mostra e oferece, nunca reprecifica pelas costas dela. De
`CONFIRMADO` em diante o selo some, porque o preço combinado com a cliente é o preço — um
orçamento aceito não muda de valor porque o chocolate subiu.

Preço e custo andam juntos na troca de propósito: aceitar o preço de hoje e manter o custo de
antes produziria um lucro que nunca existiu. E a ficha arquivada depois do pedido não quebra
a linha: sem ficha para comparar, o selo não aparece e o congelado continua valendo — que é
exatamente o que um pedido antigo deve mostrar.

---

## D33 · A taxa de entrega é receita, e aparece em linha própria

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3A

**Contexto.** `total = subtotal − desconto + entrega.taxa`. Falta decidir de que lado a taxa
de entrega cai no lucro do pedido.

**Decisão.** Ela entra no total e **não** entra no custo. `lucroEstimado` carrega a taxa
dentro, e por isso o rodapé do editor mostra a entrega em linha própria e a frase de sobra
diz quanto dela é entrega.

**Consequência.** Sumir com ela do total seria esconder receita; descontá-la como custo
exigiria um campo de custo de entrega que não existe, o que seria inventar dado. Dizer o
número na tela é o que evita a leitura errada: dos R$ 75,82 que sobram do caso de aceite,
R$ 10,00 são a entrega, e ela precisa ver isso antes de achar que o doce está rendendo mais
do que rende.

A taxa da maquininha incide sobre o total com a entrega dentro, porque é sobre o total que a
maquininha cobra. Quem calcula é `taxaCobrada`, a mesma de `custosOperacionais.ts` — o pedido
e a transação do caixa precisam nascer do mesmo cálculo (`#d24`), e a 3B depende disso.

---

## D34 · O status anda por regra testada, e cancelar não é arquivar

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3A

**Contexto.** Seis estados e uma tela cheia de botões é o desenho em que a regra de transição
acaba espalhada por `disabled` de componente, e cada tela nova a reinventa um pouco diferente.

**Decisão.** `transicoesPermitidas(status)` mora em `pedido.ts`, é testada, e devolve um passo
adiante, um passo atrás e `CANCELADO`. Cancelado só reabre como orçamento. A mutação
`mudarStatusPedido` confere a mesma regra antes de escrever, e a tela desenha os botões a
partir dela.

**Consequência.** Voltar um passo é sempre permitido porque marcar "pronto" sem querer não
pode custar um pedido. A conferência na mutação não é redundância decorativa: a tela pode
estar aberta há meia hora oferecendo uma transição que já não vale.

Duas escolhas de execução ficam registradas:

- **O status é escrito na hora, fora do "Salvar".** É uma ação com verbo próprio ("marcar
  como pronto"), e não um campo de formulário: um botão de estado que só valesse depois de
  salvar seria mentira sobre o que acabou de acontecer. O pedido novo é o único caso em que
  o estado é escolha de formulário — ele nasce como orçamento ou já confirmado, porque a
  encomenda fechada no WhatsApp não deveria custar dois passos.
- **Cancelar é `status`, arquivar é `arquivado`.** Cancelado continua na lista, contável e
  reabrível; arquivado some da lista e é o que se faz com o pedido anotado duas vezes. A tela
  diz essa diferença na confirmação de arquivar, senão os dois viram sinônimos no primeiro
  dia de uso.

---

## D35 · Cliente é cadastro opcional, aberto de dentro do pedido

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3A

**Contexto.** `Cliente` é uma coleção com nome, contato e agregados. O caminho óbvio seria uma
tela `/clientes` com lista, cadastro e edição, e um seletor obrigatório no pedido.

**Decisão.** Não há tela de clientes. `clienteNome` é obrigatório e é snapshot; `clienteId` é
opcional. O editor de pedido sugere cadastros que combinam com o nome digitado, oferece
vincular, e abre o cadastro em painel quando ela quiser guardar telefone, Instagram, endereço
e observações.

**Consequência.** A cliente que compra uma vez na feira não vira ficha de cadastro, e a venda
rápida não vira formulário. O que se perde é a lista de clientes — não há onde ver "todas as
minhas clientes" nem arquivar uma —, e isso nasce junto com os agregados de dinheiro, que são
da 3B. Vincular também traz o endereço para a entrega, porque o sistema não pede o que já sabe.

Duas consequências de código, registradas porque um leitor futuro vai comparar com o editor
de ficha:

- **O editor de pedido usa `useState`, e não `react-hook-form`.** `D22` continua valendo como
  está: aquela biblioteca resolve lista dinâmica de campos registrados, e aqui a linha carrega
  preço e custo congelados, que são estado e não entrada de teclado. Uma chave local por linha
  faz o mesmo que `useFieldArray` fazia lá.
- **`BlocoFicha` e `BuscaItem` viraram `components/ui/Bloco` e `components/ui/BuscaItem`.** Era
  a condição que o próprio `BlocoFicha` registrava — promover no terceiro caso —, e o editor
  de pedido é o terceiro. Nada mudou no comportamento dos dois.

**Nota (025).** A primeira metade — "não há tela de clientes" — caiu na spec `025-quem-mais-
compra-de-mim.md` (`D137`): a tela existe, lê e ordena pelo dinheiro. A segunda metade —
a cliente nasce do pedido, e `/clientes` não cadastra — continua inteira.

---

## D36 · O agregado usa a data do pagamento; a agenda, a da entrega

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3B

**Contexto.** `Pedido.competencia` foi tipada como "chave de agregação do dashboard" e é
derivada de `dataEntrega`. O painel financeiro, porém, é regime de caixa: `entradas` é
dinheiro que entrou, e a spec 004 construiu o mês inteiro em cima disso.

**Decisão.** Um pedido entra no agregado quando é **pago**, e na competência do **pagamento**.
`Pedido.competenciaPagamento` é campo novo, derivado de `pagoEm` na escrita e ausente
enquanto o pedido não foi pago. `Pedido.competencia` continua existindo e continua sendo a
chave da agenda: o mês em que se entrega. O comentário do tipo foi corrigido junto.

**Consequência.** Um pedido entregue em 30/09 e pago em 02/10 conta em outubro nos dois lados
— na transação e na contagem de pedidos —, e um pedido pago adiantado conta no mês em que o
dinheiro entrou. É a única leitura compatível com o resto do painel; a alternativa faria
`qtdPedidos` e `entradas` falarem de meses diferentes dentro do mesmo documento.

O campo é gravado, e não deduzido na leitura, pelo mesmo motivo de `Transacao.competencia`:
sem ele não existe a consulta "os pedidos pagos deste mês", e sem essa consulta "Recalcular o
mês" não conseguiria refazer a metade do pedido — teria que varrer as transações, colher os
`pedidoId` e ler um documento por pedido.

A consequência incômoda precisa aparecer na tela, senão o painel mente por omissão: **o
pedido entregue e não pago não está em lugar nenhum.** Por isso `/pedidos` ganhou a linha de
"a receber", somada em memória sobre os pedidos que a tela já carregou — nenhum agregado
novo, nenhuma consulta nova. O orçamento fica de fora dela: proposta que a cliente ainda não
aceitou é dinheiro a combinar, e não a receber.

Dois campos mudaram de nome ou nasceram junto, e os dois são de nomenclatura honesta:

- **`ResumoMensal.custoInsumos` virou `custoDoVendido`.** O campo nunca tinha sido escrito por
  ninguém, então não houve migração. O nome mentia sobre o conteúdo: o que ele guarda é o
  custo total do que foi vendido, mão de obra e rateio inclusos, e não o que ela gastou
  comprando insumo — que já mora em `porCategoriaSaida.COMPRA_INSUMO`. Manter o nome
  garantiria que alguém, um dia, somasse as duas coisas achando que são a mesma. Na tela ele
  se chama "custo do que você vendeu", nunca "custo de insumos".
- **`ResumoMensal.receitaPedidos` é campo novo.** Sem ele `ticketMedio` não teria como ser
  exato: seria mantido por escrita de valor a partir de um total que a tela precisaria ler, e
  é assim que agregado torce. Ele também não é a mesma coisa que `entradas` — a venda de
  balcão lançada à mão entra em `entradas` e não aqui.

---

## D37 · A metade do pedido tem o mesmo par, e o agregado ganha um dono

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3B

**Contexto.** `#d23` fechou o risco do agregado com um escritor. A 3B traz o segundo, e ele
escreve no mesmo documento: agregado com dois escritores é onde um número torce em silêncio.

**Decisão.** A metade do pedido nasce com o mesmo par: `deltaDoPedido` (o que muda quando um
pedido é pago ou desfeito) e `agregarPedidos` (a metade reconstruída do zero), com
`agregarMes` compondo as duas metades. `tests/domain/caixa.test.ts` exige que os dois
caminhos concordem no caso de aceite, ao editar e ao desfazer — e o bloco da 4A ficou
**intacto**, como prova de que a metade velha não se mexeu.

Junto disso, `src/lib/firebase/mutations/agregado.ts` passou a ser o único lugar que escreve
`agregados/{'YYYY-MM'}`: `incrementosDoAgregado`, `aplicarNoAgregado` e `recalcularMes` saíram
de `transacoes.ts` para lá.

**Consequência.** O segundo escritor não pode reimplementar a escrita um pouco diferente do
primeiro, que é o defeito que este arranjo existe para tornar impossível. Quatro escolhas de
execução ficam registradas porque surpreendem:

- **`deltaDoPedido` não move um centavo de `entradas`, `saidas` nem `lucro`.** Quem move
  dinheiro é a transação que o pagamento cria. As duas metades não se sobrepõem em campo
  nenhum, e é isso que permite somá-las sem conferir nada.
- **Marcar como pago aplica os dois deltas somados, em uma escrita só.** Não é economia de
  escrita: cada chamada a `aplicarNoAgregado` reescreve o espelho da meta **por valor**, e
  aplicar uma de cada vez faria a segunda gravar o espelho de antes da primeira (`#d29`).
- **"Recalcular o mês" não lê mais o agregado antes de reescrevê-lo.** A leitura só existia
  para preservar `porDia[].pedidos`, que este módulo passou a calcular (`#d23`, segunda
  consequência). Uma consulta a mais, uma leitura a menos.
- **Desfazer o pagamento não lê a transação.** Ela nasceu do mesmo número do pedido — valor,
  taxa e dia —, então o pedido sabe exatamente o que reverter. É o que permite desfazer sem
  rede, e é a mesma razão de `#d24` congelar `custoTaxa`.

`ticketMedio` é razão, e razão não se incrementa: segue a regra que `#d30` fixou para o
espelho da meta, gravada no mesmo ponto em que as parcelas mudam e **refeita na leitura** a
partir de `receitaPedidos` e `qtdPedidos`, que são exatos porque são incrementos. O mesmo
vale para `Cliente.ticketMedio`.

Um limite conhecido, e ele é do `increment`: **o produto cuja contribuição foi revertida sobra
zerado no documento**, porque `increment` não apaga chave. Quem o tira do ranking é
`produtosOrdenados`, na leitura; quem o tira do documento é "Recalcular o mês". A alternativa
seria ler o agregado antes de cada pagamento para saber se a chave deve sumir, e leitura no
caminho de gravar é exatamente o que `#d29` recusou.

Outro, no cliente: **`ultimoPedidoEm` não volta atrás no desfazer.** `totalPedidos` e
`totalGasto` são incrementos e revertem exatos; a data não é soma, e não há histórico de onde
restaurar a anterior. Uma data recuada para um valor que ninguém registrou seria pior do que
uma data que ficou parada.

---

## D38 · A meta conta pedidos pelo ticket médio real, e doces pelo preço de cardápio

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3B · resolve `#d28`

**Contexto.** `#d28` deixou `pedidosNecessarios` em zero e emprestou `ticketMedioReferencia`
para guardar o **preço médio de um doce**, porque pedido não existia. A spec 003 previa que o
campo virasse o valor médio de um _pedido_ quando o Módulo 3 chegasse. Só que a 4B inteira
foi construída sobre a outra leitura: `unidadesNecessarias`, `unidadesPorSemana`,
`unidadesRestantes` e o cartão da tela Hoje dizem a meta **em doces**, que é a unidade em que
a Maynara produz, e todos dividem o alvo por `ticketMedioReferencia`.

**Decisão.** O campo não troca de sentido. `ticketMedioReferencia` continua guardando o preço
médio de um doce, sugerido pela média das fichas e editável — e continua sendo o único campo
da meta que a usuária ajusta à mão. `pedidosNecessarios` passa a ser gravado e exibido, e o
divisor dele é `ResumoMensal.ticketMedio`, o valor médio **real** de um pedido pago no mês.

**Consequência.** O caso de aceite fecha igual: com alvo de R$ 3.000,00 e ticket médio de
R$ 240,00, `ceil(300000 ÷ 24000) = 13` pedidos. E as duas contas continuam verdadeiras ao
mesmo tempo — 435 doces por mês e 13 pedidos —, porque cada uma usa o divisor que lhe
corresponde. Usar um campo só para as duas faria a meta afirmar "cada pedido tem um doce",
que é justamente o que `#d28` recusou.

O bloco de meta ganhou uma linha, e não uma tela: "ou 13 pedidos do tamanho dos deste mês".
Ela só aparece quando há pedido pago na competência — sem isso não há ticket médio de
verdade, e zero continua sendo ausência.

**O que isso custa, e por que vale.** A spec pedia que `ticketMedioReferencia` passasse a ser
sugerido pelo ticket médio real; isso não foi feito, e é a única divergência desta sessão em
relação à letra da spec. Fazê-lo exigiria um segundo campo em `Meta` para o preço do doce —
uma quarta mudança de schema, além das três que a spec autorizou — ou quebraria os números da
4B, que é a metade da meta que a usuária de fato lê. A conta que a spec queria está entregue;
o campo que a carrega é outro.

`Meta.pedidosNecessarios` é gravado no salvamento e refeito na leitura, pela mesma regra de
`#d30`: o ticket médio anda a cada pedido pago, e a meta não é reescrita junto.

---

## D39 · A demanda é recalculada; o carrinho é gravado

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3C

**Contexto.** `listasCompra` foi tipada como coleção desde o Módulo 0, e a pergunta óbvia é
por que ela existe: a demanda de insumo é função pura dos pedidos, das fichas e dos insumos,
e a tela já assina os três. Uma consulta responderia "o que comprar" sem documento nenhum.

**Decisão.** A demanda é recalculada em memória a cada render, por `explodirDemanda` e
`montarLista`. O documento guarda **o que ela marcou**: `itens[].comprado`, mais o período e
os `pedidoIds` que o originaram.

**Consequência.** O que justifica a coleção não é a conta, é o carrinho. Recalcular a demanda
é aritmética barata sobre dados que a tela já tem; meia hora de mercado marcada item a item
não se recalcula de lugar nenhum. Disso decorrem três coisas que surpreendem:

- **A tela mostra a lista gravada, e não a recalculada.** As duas divergem assim que um pedido
  é confirmado, e por isso "Refazer" é um botão e não um efeito: regerar sozinha, no meio da
  feira, mudaria o carrinho embaixo da mão dela. Quando o período escolhido difere do período
  gravado, a tela diz isso em uma frase, senão as pílulas descreveriam uma lista que não é a
  que está embaixo delas.
- **As pendências, essas, são as de agora.** Ficha arquivada e insumo sumido saem do cálculo
  ao vivo, e não do que estava valendo quando a lista foi montada: é aviso, e aviso velho não
  serve.
- **Fechar a lista precisou existir.** Sem arquivar, "Refazer" na semana seguinte preservaria
  as marcas da compra passada (`preservarComprados`) e a lista nasceria toda comprada. É a
  única parte desta sessão além da letra da spec, e ela existe para que a regra de preservar
  as marcas continue verdadeira na segunda ida ao mercado.

---

## D40 · No mercado, a escrita não espera o servidor

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3C

**Contexto.** Toda tela deste sistema grava com `await` e um estado de "salvando" — o editor
de ficha, o de pedido, o lançamento do caixa. Só que **a promessa de uma escrita do Firestore
não resolve enquanto não há rede**: ela fica pendente até a reconexão. Nas outras telas isso
passa, porque elas navegam depois de salvar e o caso comum é ter sinal. Em `/compras` não
passa: o contexto 2 do `PRODUCT.md` é o mercado, uma mão no carrinho e sinal ruim, e marcar
item é a interação inteira da tela.

**Decisão.** `/compras` despacha a escrita e não a espera. Marcar, refazer, corrigir preço e
fechar a lista aplicam no cache local — que é o que desenha a tela — e o `catch` continua
recebendo a falha de verdade. Nenhum botão fica preso em "salvando".

**Consequência.** A linha aparece marcada no toque, com ou sem rede, e o selo de sincronização
conta a verdade sobre o que ainda não subiu — que é exatamente o papel dele (`DESIGN.md`,
Selo de sincronização). O preço vale duas coisas:

- **A correção de preço grava os dois documentos em paralelo**, e não um depois do outro. O
  insumo e o custo estimado da linha nascem da mesma ação; encadeados, o segundo só sairia na
  reconexão, e a lista mostraria o custo velho justamente na frente da gôndola.
- **Dois toques dentro do mesmo quadro podem perder um.** O array de itens é reescrito
  inteiro, porque o Firestore não atualiza elemento de array por posição, e o segundo toque
  parte do que a tela tinha. Offline não é o caso perigoso — lá o cache local devolve a marca
  antes do toque seguinte —, e a janela real é de milissegundos. Se um dia virar problema de
  verdade, o conserto é `comprado` sair do array e virar um mapa por `insumoId`, que é
  atualizável por caminho de campo.

---

## D41 · Componente de kit é contado por lote, como no motor de custo

**Status:** vigente · decidida em 2026-09-02 na spec `003-pedidos`, sessão 3C

**Contexto.** A spec descreve a explosão do kit como "cada componente vira
`quantidade × quantidadePedida` unidades daquela ficha" — sem dividir pelo rendimento do kit.
`custoFicha.ts` faz o contrário: soma os componentes em `custoTotalLote` e só então divide
pelo rendimento para chegar ao `custoUnitario`.

**Decisão.** A explosão divide. Um componente é contado **por lote do kit**, como no motor de
custo: `unidades = componente.quantidade × lotes do kit`.

**Consequência.** Com kit de rendimento 1, que é todo kit que existe hoje, as duas leituras
dão o mesmo número e o caso de aceite fecha igual — 32 cookies para 20 soltos e 2 caixas de 6.
A diferença aparece em um kit que renda mais de uma unidade por lote, e aí a versão da spec
faria a lista comprar insumo para um custo que a ficha não cobrou: o pedido guarda o custo
congelado que saiu de `custoFicha.ts`, e demanda e custo do mesmo pedido não podem discordar.

Vale a mesma regra para `itens` do kit, que é a embalagem dele. E a recursão para no primeiro
nível **por construção**, com dois laços em vez de uma chamada recursiva: `#d11` garante que
kit não contém kit, e escrever isso como dois laços é o que dispensa detecção de ciclo em vez
de confiar que ninguém vai gravar um dado torto.

---

## D42 · Uma largura de coluna só, e quem estreita é o campo

**Status:** vigente · decidida em 2026-09-02 na verificação visual

**Contexto.** Cada sessão escolheu a sua largura de conteúdo sem que nenhuma delas fosse
decidida em lugar nenhum: listas em `max-w-5xl` centralizadas pelo shell, editor de ficha,
editor de pedido e lista de compras em `max-w-3xl`, configuração em `max-w-2xl`. As duas
últimas larguras vinham sem `mx-auto`, então a coluna encostava à esquerda enquanto o
cabeçalho — que sangra com `-mx-8` — continuava ocupando os 1024px inteiros. O resultado é
cabeçalho mais largo que o corpo, conteúdo deslocado para a esquerda, e os rodapés fixos de
preço, de pedido e de compras (todos `max-w-5xl` centralizados) mais largos que o formulário
a que pertencem.

**Decisão.** Uma largura só, a do shell: `max-w-5xl` centralizada, em toda tela. Nenhum
componente de tela volta a declarar largura de coluna. O que estreita é o campo dentro do
bloco, em grade de duas colunas, e não a página.

**Consequência.** Cabeçalho, conteúdo e rodapé fixo passam a ter a mesma largura e o mesmo
eixo em todas as telas, que é o que o `DESIGN.md` chama de "conteúdo em coluna com largura
máxima" sem nunca ter dito qual. Campos que ficariam com 900px de largura foram pareados:
hora e horas por mês, despesas fixas, margem e outras taxas e arredondamento na configuração;
nome e categoria na ficha; nome e telefone e a data da entrega no pedido. O recibo do custo do
lote ganhou `max-w-xl` próprio, porque rótulo e valor em pontas opostas de uma tela de 1024px
é exatamente a planilha que o `PRODUCT.md` lista como anti-referência.

Prosa continua limitada por medida em `ch`, como já era.

---

## D43 · Ausência não é igualdade: "nunca salvou" é o terceiro estado da configuração

**Status:** vigente · decidida em 2026-09-02 na spec `005-prontidao`, sessão 5A

**Contexto.** `#d17` decidiu que a configuração é sugerida na tela e só vira documento no
primeiro Salvar. A tela executou isso semeando o formulário com `CONFIGURACAO_SUGERIDA` **e**
semeando a base de comparação com a assinatura desse mesmo formulário. Com isso `alterado`
nascia falso numa conta que nunca salvou: no desktop o botão Salvar nascia `disabled`, e no
celular a barra de salvar — condicionada a `alterado` — nem chegava a existir. A única saída
era alterar um campo e desalterá-lo.

O raio do defeito é o sistema inteiro, porque sem `configuracao/geral` a ficha calcula sem
rateio, o pedido não tem forma de pagamento e o caixa não tem taxa de maquininha — e cada uma
dessas telas avisa apontando para a tela que não salvava.

**Decisão.** A base é `string | null`, e `null` significa "esta conta nunca salvou". Não
existe assinatura que se compare a ausência: `alterado` nasce verdadeiro, e os dois caminhos
de salvar ficam vivos. A frase de status ganha o terceiro caso junto — "Estes são valores
sugeridos. Confira e salve para começar." —, e a barra do celular diz "Valores sugeridos,
ainda não salvos".

**Consequência.** A causa era a base de comparação, e não o botão: habilitar o botão sem
mexer na base faria a tela dizer "Você mudou coisas que ainda não foram salvas" para quem só
a abriu, que é o sistema atribuindo à usuária o que ele mesmo sugeriu. São três estados
porque são três coisas diferentes — "eu sugeri", "você mudou" e "está salvo" —, e é a versão
em tela do que `#d17` decidiu no modelo de dados.

Duas coisas ficam registradas porque um leitor futuro vai perguntar:

- **O nome do negócio é relido no salvamento.** `estadoInicial` lê `conta?.nome`, mas a
  semeadura dispara quando a assinatura da _configuração_ chega, e o documento da conta é
  outra assinatura que pode não ter chegado (`AuthProvider` expõe `conta: null` até a
  primeira leitura). A alternativa era esperar as duas leituras, o que penduraria a tela num
  documento que ela não precisa para funcionar. `nomeNegocio` segue sem leitor e a dívida do
  espelho continua registrada: isto conserta a semeadura, não o espelho.
- **Aberta pela primeira vez neste aparelho e sem rede, a tela diz "valores sugeridos" mesmo
  que a conta já tenha configuração salva.** Do cache vazio não dá para distinguir "não
  existe" de "ainda não sei", e qualquer heurística acerta um caso quebrando o outro. O caso
  raro paga pelo comum, como em `#d29`: a conta nova offline é a que precisa salvar.

---

## D44 · O ícone é rasterizado uma vez, por script fora do `package.json`

**Status:** vigente · decidida em 2026-09-02 na spec `005-prontidao`, sessão 5A

**Contexto.** `public/icons/` tinha um arquivo só, `icone-maskable.svg`, e `layout.tsx`
declarava `appleWebApp.capable: true` sem nenhum `apple-touch-icon`. **O Safari não lê SVG
nesse papel**: instalado na tela de início do iPhone, o app ganhava uma miniatura da página
em vez de ícone — a primeira coisa que ela vê todo dia, antes de abrir.

**Decisão.** `src/app/apple-icon.png` (180×180), `public/icons/icone-192.png` e
`icone-512.png`, gerados por `scripts/gerar-icones.mjs` e versionados. O SVG continua no
manifesto, agora só em `purpose: "maskable"`; os PNGs entram como `any`.

**Consequência.** Rasterizar é trabalho de uma vez, e não do build: nenhuma dependência de
produção entra por causa disso, e o app não ganha peso para desenhar o que já está desenhado.
O script usa o `sharp` que vem no `node_modules` junto do Next e **não** o declara em
`package.json`, porque ferramenta de uma vez não é dependência do app — se um dia sumir de
lá, `npm i -D sharp`, rodar e desinstalar. O script erra alto se o desenho mudar de forma,
porque ninguém confere PNG no diff.

A origem dos três é `src/app/icon.svg`, o desenho do favicon, com um ajuste só: o `rx` do
fundo sai. Os dois sistemas recortam o ícone da tela de início com a máscara deles, e canto
arredondado dentro de canto arredondado aparece como falha de desenho. **O maskable não serve
de origem** justamente pelo que o torna maskable: o conteúdo dele ocupa 42% do quadrado para
sobreviver ao recorte circular do Android, e sem recorte nenhum isso vira um biscoito pequeno
boiando no meio da tela. São dois desenhos porque são dois problemas.

---

## D45 · A chave do Gemini nunca chega ao aparelho

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** `.env.local.example` diz, com razão, que as chaves do Firebase são públicas por
natureza: elas identificam o projeto e não autorizam nada — quem protege os dados é
`firestore.rules`. **A chave do Gemini é o oposto disso.** Ela autoriza gasto, e toda variável
`NEXT_PUBLIC_` está dentro do bundle, que é servido para qualquer navegador.

**Decisão.** `GEMINI_API_KEY` entra em `.env.local` **sem** o prefixo, e o único código que a
lê é `src/app/api/nota/route.ts`. `GEMINI_MODELO` a acompanha, pelo motivo oposto: o id do
modelo não é segredo, e precisa poder mudar sem deploy de código.

**Consequência.** É a primeira variável do projeto cuja regra é a inversa da dos vizinhos, e
por isso o `.env.local.example` explica isso em vez de listar mais uma linha. A conferência
foi feita e não presumida: um `build` com uma sentinela no lugar da chave, e a sentinela não
aparece em lugar nenhum de `.next` — nem no servidor, porque `process.env` só é lido em tempo
de execução. `.next/static` também não contém a string `GEMINI_API_KEY` nem `firebase-admin`.

O que isso custa é o que a `D46` registra: sem servidor não há onde guardar a chave, e é a
existência dela que obriga a rota a existir.

---

## D46 · A leitura mora numa rota do app, e `firebase-admin` vira dependência de produção

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** `D45` exige código de servidor. O caminho óbvio no papel seria uma Cloud
Function, porque o projeto já tem um `functions/` — no estado exato em que o `firebase init`
o deixou, com um `setGlobalOptions` e comentários.

**Decisão.** `src/app/api/nota/route.ts`, um Route Handler. O app já é compilado com servidor
Node (existem rotas dinâmicas desde a 2B), o código fica no mesmo repositório e na mesma
língua, e `npm run dev` basta para exercitar tudo. Publicar a primeira função exigiria plano
Blaze, um segundo artefato de deploy, uma segunda cadeia de build e o emulador dentro do laço
de desenvolvimento.

**Consequência.** A rota precisa saber quem está chamando, e conferir um ID token do Firebase
é trabalho do `firebase-admin` — que era `devDependency` usada só pelo script de acesso e
passou para `dependencies`. **É a aprovação que a spec pediu**, e ela é menor do que parece:
o pacote já estava instalado, nada novo desceu, e nada disso entra no bundle do cliente —
`src/app/api/` não é importado por componente nenhum, e o build confirma.

Verificar à mão a assinatura do JWT, para não mexer no `package.json`, ficou descartado. O
projeto desenha gráfico à mão para não pegar dependência (`#d25`) e tirou o `date-fns` porque
`Intl` bastava (`#d26`); criptografia é outra classe de risco, e um erro ali não aparece como
um pixel torto — aparece como um estranho gastando a cota.

Duas coisas ficam registradas porque um leitor futuro vai perguntar:

- **A chamada ao Gemini é `fetch`, e não um SDK.** O contrato é um POST com JSON, e um pacote
  a mais no `package.json` para montar esse POST seria uma segunda aprovação de dependência
  de produção pelo que a plataforma já faz. O que se perde é o tipo da resposta, e é por isso
  que ela passa por `esquemaNotaLida` antes de virar qualquer coisa.
- **A regra de acesso está escrita duas vezes.** `abreAConta` repete o que `firestore.rules`
  faz: basta a chave estar no mapa da claim `contas`, e o papel não é conferido (`#d14`). Não
  é redundância decorativa — é uma **segunda porta para a mesma conta**, e uma porta sem
  fechadura não vira segura porque a outra tem.

**O que faria a decisão virar:** hospedar o app onde não haja runtime Node, ou o segundo
cliente pagante, quando a cota por conta passar a ser problema de cobrança e não de código.
É o mesmo dia de `#d10` e `#d16`.

---

## D47 · O modelo lê palavras; o domínio faz contas

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** Um modelo que lê uma nota fiscal pode devolver a linha já somada, já convertida
e já em centavos. É tentador, e é a decisão mais cara que esta spec podia tomar errado.

**Decisão.** **Toda palavra da resposta é do modelo. Todo número é do domínio.** O modelo
devolve o que está impresso, em texto, exatamente como está: `"12,50"`, `"1,01KG"`, `"C/25"`.
Quem transforma isso em `1250`, em `{ 1,01, "kg" }` e em `{ 25, "un" }` é
`src/lib/domain/notaFiscal.ts`, puro, sem Firebase e sem React, coberto por teste. O esquema
zod recusa número onde deveria haver texto, e a resposta estruturada do Gemini declara todo
campo como `STRING`.

A tradução, essa, é do modelo, e é para isso que ele serve: `"FARINHA TRIGO DONA BENTA 1KG"`
vira nome `"Farinha de trigo"` e marca `"Dona Benta"`. Isso é linguagem, não aritmética, e ela
corrige na tela em dois toques se sair errado.

**Consequência.** O motivo raso é `#d02`: dinheiro é centavo inteiro porque erro de
arredondamento aqui é o defeito mais caro possível, e não se delega arredondamento a um
sistema probabilístico. O motivo real é maior — **um número que o modelo calculou é um número
que ninguém pode auditar.** Se a farinha entrar a R$ 125,00 por causa de uma vírgula, o custo
de toda ficha que a usa muda, e a única defesa seria alguém reconferindo a conta. Com esta
divisão, a parte perigosa da leitura é justamente a que `npm test` cobre, número por número.

Três escolhas de implementação ficam registradas:

- **`centavosDoTexto` não é `parseParaCentavos`.** Aquele lê um teclado, onde quem digita sabe
  o que quis dizer e onde o valor ausente é legitimamente zero. Este lê um papel, e ali
  **`null` não é zero**: uma linha cujo valor não deu para ler precisa ser distinguível de uma
  linha de graça, senão o rodapé some com dinheiro. E `.` seguido de três casas é separador de
  milhar, porque é assim que a nota brasileira imprime `1.500`.
- **A categoria sai de uma tabela de palavras, e não do modelo.** São cinco categorias e
  algumas dezenas de palavras. Uma tabela é grátis, determinista, testável e corrigível em um
  toque; a mesma resposta vinda do modelo custa token e não pode ser conferida por teste.
  `cx` ficou de fora de propósito: "LEITE CX 1L" e "OVOS CX C/30" são comida.
- **`precoCompra` é o valor _unitário_ da linha, nunca o total.** `Insumo.precoCompra` é o
  preço de uma embalagem inteira, e uma linha de duas manteigas a R$ 17,50 vale R$ 35,00 no
  cupom e R$ 17,50 no cadastro. Os dois números vivem separados desde o domínio, porque quem
  soma R$ 35,00 é o caixa da 6B.

---

## D48 · A rota não escreve no Firestore

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** A rota já tem Admin SDK na mão. Gravar os insumos ali seria uma ida de rede a
menos e nenhuma regra de segurança no caminho.

**Decisão.** A resposta da rota é um rascunho em memória. Quem grava é a tela, do aparelho,
depois de ela confirmar, por `mutations/notas.ts` — com `firestore.rules` valendo.

**Consequência.** `PRODUCT.md` diz que o sistema faz a conta e ela toma a decisão. Uma leitura
que escrevesse direto em `insumos` colocaria um preço alucinado dentro do custo de todas as
fichas — e descobrir isso é exatamente o que o sistema existe para evitar. O Admin SDK
contorna as regras por construção, então uma rota que escrevesse seria o primeiro caminho de
escrita do projeto sem regra nenhuma no meio.

**Uma nota é um lote, e não N salvamentos.** `importarNota` manda todos os documentos em um
`writeBatch`, com o incremento de `totalInsumos` junto, e só depois marca as fichas afetadas
com `array-contains-any` em blocos de dez. Vinte chamadas de `criarInsumo` em sequência seriam
vinte idas ao servidor numa tela que já depende de rede — e deixariam possível o pior estado:
metade cadastrada, e ela sem saber qual metade.

Para o lote não reescrever a forma do documento por conta própria, o corpo saiu de
`mutations/insumos.ts`: as duas montagens que moravam dentro de `criarInsumo` e
`atualizarInsumo` viraram `corpoDeInsumoNovo` e `corpoDeAtualizacao`, exportadas e usadas
pelos dois caminhos. É o padrão de `derivarFicha` (`#d19`): uma função, dois chamadores.
`precoMudou` saiu junto, porque é ele que decide se a escrita empurra uma entrada no
histórico. `entradaHistorico` passou a receber o `Timestamp` em vez de chamar o relógio: numa
nota, as doze linhas são a mesma compra e precisam ter a mesma hora.

---

## D49 · A foto não é guardada

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** O caminho natural de qualquer leitura de documento é guardar o original. Firebase
Storage está a um `firebase init` de distância.

**Decisão.** Nada de Storage. Os bytes sobem, a resposta volta, o arquivo é descartado.

**Consequência.** Storage significaria um bucket novo, um conjunto novo de regras, um custo
novo e um lugar novo onde dado privado mora — tudo isso por uma imagem cujo valor inteiro dura
os trinta segundos em que ela vira lista. O que precisa sobreviver já sobrevive:
`historicoPrecos` guarda preço, quantidade, unidade e fornecedor de cada compra, dentro do
próprio insumo.

Consequência aceita: **reler exige fotografar de novo**, e não existe "ver a nota do mês
passado". Se um dia isso virar pergunta real, aí nasce o Storage, com a spec dele.

Junto disso, e pelo mesmo motivo de não pagar por pixel que ninguém vai olhar: a imagem é
reduzida no aparelho para 1600px no maior lado, JPEG a 80%, antes de subir. Foto de celular
chega com 4000px e alguns megabytes, e o sinal da cozinha dela é o que decide. PDF sobe como
está — ele já é texto, e recomprimir só estragaria. Falhar a redução não trava nada: o
original sobe, e quem recusa é o teto de 8 MB da rota.

---

## D50 · Uma tela do sistema exige rede, e diz isso

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** `PRODUCT.md` põe offline como estado normal e o `CLAUDE.md` o lista como
invariante. A leitura de nota não pode cumprir isso: não há como ler uma nota sem falar com o
modelo.

**Decisão.** A saída não é fingir. É **dizer**, e é escolher o contexto certo. A leitura de
nota mora no contexto 4 do `PRODUCT.md` — noite, sentada, planejando —, e não na bancada nem
no mercado. Sem rede, a entrada aparece desabilitada com a frase, e o cadastro manual continua
onde sempre esteve, a um toque de distância. **Nenhuma outra tela muda de comportamento por
causa desta.**

**Consequência.** É a primeira exceção à invariante, e ela é nomeada em vez de contornada. O
`POST /api/nota` não passa pelo cache do service worker porque `defaultCache` só registra
rotas de GET — não há o que configurar, e há o que conferir uma vez em navegador.

Duas escolhas de execução:

- **O botão e a frase são componentes separados.** No cabeçalho de `/insumos`, em 360px, uma
  frase de trinta caracteres ao lado do título espremeria os dois; a frase vai para a faixa
  que tem a largura da página, e o botão fica onde a ação está. Um `aria-describedby` não
  resolveria: elemento desabilitado não recebe foco, e a descrição nunca seria lida.
- **"Ler uma nota" aparece nos dois tamanhos de tela**, e "Novo insumo" continua só no
  desktop. No celular a ação primária é o botão flutuante que já existe, e não nasce um
  segundo: dois disputariam o mesmo polegar. Sem isso, o celular — que é onde a foto é
  tirada — não teria entrada nenhuma para a tela.

A tela é **página, e não painel**, contra a invariante de painel lateral no desktop e folha
inferior no celular. Aquela regra é sobre formulário de **um** objeto; aqui são seis a vinte
objetos editáveis, e em 360px isso não cabe numa folha. É a mesma razão pela qual
`/fichas/[id]` e `/pedidos/[id]` são páginas.

---

## D51 · Ler a segunda nota é atualizar preço, não cadastrar gêmeo

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** É o item que decide se a funcionalidade ainda serve no segundo mês. Sem ele, a
terceira compra do ano deixa a conta com três farinhas, e a ficha do cookie aponta para a
primeira.

**Decisão.** Toda linha lida é pareada contra os insumos já cadastrados por `nomeBusca`: exato
primeiro, prefixo depois, nada se nenhum. Quando o pareamento acerta, a linha **não** cria um
documento — ela atualiza o que existe, empurra uma entrada em `historicoPrecos` e marca com
`custoDesatualizado` toda ficha que usa aquele insumo.

**Uma nota traz preço. Ela não traz o que você configurou.** Mudam `precoCompra`,
`quantidadeCompra`, `unidadeCompra`, e `marca`/`fornecedor` **se estiverem vazios**. Continuam
como estavam `perdaPercentual`, `estoqueAtual`, `estoqueMinimo`, `categoria` e o nome
cadastrado. Importar uma nota não pode zerar os 5% de perda da farinha que ela ajustou em
março — seria o sistema desfazendo o trabalho dela em nome de conveniência.

**Consequência.** A regra de preservação mora no domínio, em `atualizacaoDaLinha`, e o que ela
protege é o que **não** está no objeto que ela devolve: campo ausente não tem como ser
sobrescrito. O teste interroga isso diretamente, com `not.toHaveProperty`.

Três escolhas ficam registradas:

- **O pareamento sai do nome atual da linha, e é refeito a cada tecla.** Isso torna a correção
  do nome o jeito de desfazer um pareamento errado, sem nenhum controle a mais na tela — e o
  selo "Atualiza · Farinha de trigo · era R$ 11,90" muda à vista enquanto ela digita. Esse
  "era" é a frase mais importante da tela: é o histórico de preço funcionando onde ela olha.
- **Prefixo casa em palavra inteira, com piso de três letras.** Sem o corte em palavra,
  "Farinha" casaria com "Farinheira" e a compra atualizaria o insumo errado. Entre dois
  candidatos, vence o de nome mais próximo em comprimento.
- **`marcarFichasDeVarios` existe ao lado de `marcarFichasDesatualizadas`.** A função antiga
  consulta um insumo por vez, o que numa nota de vinte linhas seriam vinte consultas;
  `array-contains-any` responde por dez de uma vez, e uma ficha que use dois insumos da mesma
  nota é marcada uma vez só. As duas ficam: o formulário de insumo continua tendo um insumo só
  para marcar.

---

## D52 · O CNPJ é o único campo da nota que se autoconfere

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6A

**Contexto.** Toda nota e todo cupom trazem o CNPJ do emitente no cabeçalho, e um CNPJ tem dois
dígitos verificadores. É o único campo do papel que o sistema confere sozinho — sem rede, sem
modelo, sem perguntar nada a ela.

**Decisão.** `cnpjValido` roda no domínio, offline, e o CNPJ só entra no rascunho quando fecha.
Separado disso, e **como enriquecimento e nunca requisito**, a rota pergunta o nome da loja a
`https://publica.cnpj.ws/cnpj/{cnpj}`: 3 segundos de teto, cache por CNPJ, falha silenciosa.
Respondendo, `estabelecimento` vira o nome fantasia — "Atacadão", e não "ATACADAO DIST COM E
IND LTDA" — e a tela mostra cidade e UF ao lado. Não respondendo, o nome lido da nota continua
valendo e nada na tela quebra.

**Consequência.** O verificador vale mais do que o nome bonito da loja, e é ele que a 6B vai
consumir: a guarda de duplicidade compara `cnpj + dataISO + total`, e "ATACADAO DIST COM E IND
LTDA" lido de duas fotos pode sair de dois jeitos — catorze dígitos com verificador, não. O
nome fantasia resolve o outro lado do mesmo problema: `fornecedor` é texto livre, e três
compras no mesmo mercado gravariam três grafias, estragando a única pergunta que o campo
existe para responder um dia ("onde eu compro isto mais barato?").

Três regras, porque a API é pública de verdade e isso tem preço:

- **A chamada é do servidor, e não do navegador.** Uma ida de rede já está acontecendo, e o PWA
  não ganha um terceiro host na superfície dele.
- **Cache por CNPJ, com validade longa.** Dado cadastral da Receita muda uma vez por ano, e ela
  compra no mesmo mercado toda semana: a segunda nota do Atacadão não sai do servidor. Falha
  não se guarda por um mês — dez minutos —, porque um timeout não é um fato cadastral.
- **A rota fica com três campos e joga o resto fora.** A resposta traz endereço completo,
  telefone, e-mail e a **lista de sócios** — nomes de pessoas reais que não têm o que fazer no
  navegador dela.

O limite da API pública é de **3 consultas por minuto por IP**, e ele é o gatilho desta
decisão. Com uma usuária e cache, é folgado. Num SaaS, o IP é o do servidor e a fila vira
compartilhada entre todas as clientes: nesse dia, ou a consulta migra para o navegador — onde
o IP é o dela —, ou entra uma chave paga. O CNPJ lido continua valendo dos dois jeitos, e é
por isso que ele entra agora e a consulta é a metade descartável.

O cache mora na memória do processo, e não em documento: ele sobrevive a uma nota e morre num
reinício, que é exatamente a vida útil que essa informação precisa ter. Com mais de uma
instância do servidor, cada uma tem a sua — e três por minuto por IP continua sendo folga para
uma usuária.

---

## D53 · Um lançamento por nota, e o valor é a soma do que ficou

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6B

**Contexto.** Hoje o dinheiro que sai para comprar insumo só entra em `/financeiro` se ela
digitar o lançamento à mão, numa segunda tela, depois de já ter digitado a compra inteira. Na
prática, não entra: `porCategoriaSaida.COMPRA_INSUMO` fica vazio, o "quanto sobra" do mês fica
otimista, e a meta mede um resultado que ignora a maior saída recorrente do negócio. A nota já
sabe o valor, a data e o estabelecimento.

**Decisão.** A nota vira **um** lançamento, e não um por item: `SAIDA`, categoria
`COMPRA_INSUMO` — ou `EMBALAGEM` quando toda linha mantida for embalagem —, com a data da nota
e a descrição "Compra no Atacadão" ("Compra de insumos" quando o nome não sai do papel). O
valor é a **soma das linhas mantidas**, e nunca o total impresso.

**Consequência.** Nove linhas de chocolate no mesmo dia não são nove decisões financeiras: são
uma compra. O caixa é lido por dia e por categoria, e uma nota explodida em vinte lançamentos
transforma `/financeiro` em extrato bancário — o detalhe por item já está guardado onde ele
serve, que é `historicoPrecos` dentro de cada insumo.

A soma ser a das linhas mantidas é a outra metade, e é a que mexe em dinheiro: o shampoo de
R$ 29,80 não é do negócio, e se o caixa recebesse os R$ 176,20 impressos o sistema estaria
dizendo que a confeitaria gastou em shampoo. O "quanto sobra" do mês sairia R$ 29,80 menor por
uma compra pessoal. Por isso os dois números vivem separados desde a 6A (`#d47`): `precoCompra`
é o preço de uma embalagem, `valorTotal` é o que a linha vale no cupom, e é o segundo que soma
aqui.

Quatro escolhas de execução ficam registradas:

- **A categoria decide por `ehEmbalagem`, a mesma da ficha (`#d20`).** Uma segunda definição de
  "isto é embalagem" seria um segundo lugar para as duas divergirem. Compra mista continua
  sendo compra de insumo, porque ratear uma nota entre duas categorias exigiria dois
  lançamentos — que é justamente o que esta decisão recusa.
- **`ContextoMeta` vai `null`, e isso foi conferido e não presumido.** `espelhoAposDelta` move
  o espelho a partir de `parcelas.entradas`, e `deltaDaTransacao` de uma saída tem `entradas`
  zerado: o espelho não se mexeria de qualquer jeito. Passar `null` diz isso no lugar de
  depender de uma coincidência aritmética.
- **`custoTaxa` vai zero explícito, e a lista de formas de pagamento não é lida.** Saída não
  passa por maquininha, e `dados.custoTaxa ?? taxaDaEntrada(...)` para no zero. É o que
  dispensa esta tela de assinar `configuracao/geral` para gravar um número que seria zero.
- **O lançamento vem depois do lote de insumos, e a ordem é o que decide o estado ruim.**
  Falhando o lote, não há lançamento de uma compra que não foi cadastrada. Falhando o
  lançamento, os insumos ficam e ler a nota de novo conserta — reimportar insumo é atualizar
  preço, que é idempotente por natureza, e a guarda de `#d54` cuida do resto.

---

## D54 · A guarda de duplicidade sai do CNPJ, e do total impresso

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6B

**Contexto.** Ler a mesma nota de novo — porque a primeira leitura saiu torta, ou porque ela
esqueceu — criaria uma segunda saída idêntica, e o mês fecharia com R$ 146,40 a menos sem que
nada na tela explicasse. É o defeito mais caro que esta sessão podia deixar passar, porque ele
não dá erro: dá um número.

**Decisão.** `Transacao.notaChave?: string`, campo opcional novo:
`75315333000109-2026-09-02-17620` — os catorze dígitos do CNPJ, a `dataISO` e **o total
impresso** em centavos. Antes de lançar, uma consulta por igualdade nesse campo. Achando um
lançamento não arquivado, a tela diz "Esta nota já foi lançada no caixa em 02/09, no valor de
R$ 146,40" e o bloco do caixa nasce desligado; os insumos seguem cadastráveis à vontade,
porque reimportar insumo é atualizar preço, que é idempotente por natureza.

**Consequência.** É `#d52` pagando. O nome da loja é o campo mais frágil do cabeçalho —
"ATACADAO DIST COM E IND LTDA" lido de duas fotos pode sair de dois jeitos —, e catorze dígitos
com verificador, não. Uma chave frágil erraria nos dois sentidos: deixaria passar a nota
repetida e barraria a nota nova.

Quatro escolhas ficam registradas, e as três primeiras são o que faz a chave fechar na segunda
foto:

- **O total é o do papel, e não a soma das linhas mantidas.** Na segunda leitura ela pode tirar
  linhas diferentes, e uma chave que se mexesse com isso não reconheceria a mesma nota. O que a
  chave identifica é o documento impresso; o valor lançado, esse, é a soma do que ficou
  (`#d53`). O teste interroga exatamente isso: mesma nota, remoções diferentes, mesma chave e
  valores diferentes.
- **Sem CNPJ legível não há chave, e não há guarda.** A tela não inventa uma a partir do nome,
  e nada trava: a nota lança normalmente e sem chave. Um total ilegível, esse, não impede a
  chave — ele entra como zero, e duas notas da mesma loja no mesmo dia com o total ilegível nas
  duas é o único falso positivo possível. Ele aparece em tela com o valor do lançamento
  anterior à vista, e um toque o desfaz.
- **A consulta filtra `arquivado` na memória, e não na consulta.** Filtrar por dois campos
  pediria um índice composto para responder a mesma pergunta; e lançamento arquivado já foi
  revertido, então a nota dele pode ser lançada de novo. Um campo, o índice automático do
  Firestore, nada para publicar.
- **A chave é escrita por spread condicional em `corpoDaTransacao`.** Chave ausente em
  `updateDoc` deixa o valor que está lá: é o que preserva a guarda quando ela corrige a
  descrição do lançamento em `/financeiro`, por um formulário que não sabe que a nota existiu.
  É o oposto do que `formaPagamentoId` e `pedidoId` fazem com `deleteField()`, e de propósito.

Acrescentar campo opcional é mudança compatível de schema: documento antigo sem o campo
continua válido, e `notaChave` ausente é o estado de toda transação já gravada. **Foi a
aprovação de schema que a spec pediu.**

---

## D55 · O bloco do caixa nasce ligado, e a decisão dela para de se mexer

**Status:** vigente · decidida em 2026-09-02 na spec `006-nota-fiscal`, sessão 6B

**Contexto.** O bloco que manda a compra para o caixa podia nascer desligado, que é o padrão
conservador: o sistema não faz nada que ela não pediu. É a decisão mais discutível da sessão.

**Decisão.** Nasce **ligado**. Uma compra que não chega ao caixa é exatamente o custo invisível
que este sistema existe para tornar visível, e deixar isso desligado por padrão é escolher o
número errado como caminho de menor esforço. Desligar é um toque, para o dia em que a compra já
tiver sido lançada à mão.

**Consequência.** O padrão só é defensável porque a tela diz o que vai acontecer **antes** de
acontecer, com os dois lados da conta: "Vai para o caixa: R$ 146,40 em 02 de set. Os R$ 29,80
que você tirou ficam de fora. Aparece em compra de insumo, como 'Compra no Atacadão'." Sem essa
frase, ligado por padrão seria o sistema gastando o caixa dela em silêncio.

O estado é o par de `#d21`, e não um booleano: `lancamentoManual` nasce `null` e o valor
efetivo é `lancamentoManual ?? duplicado === null`. Enquanto ela não tocar, vale o padrão —
ligado, e desligado quando a guarda achou a nota já lançada. No instante em que ela decide, a
decisão dela para de se mexer sozinha, inclusive se a guarda mudar de ideia depois porque ela
corrigiu a data. Um booleano só teria que escolher entre desobedecer a ela e ignorar a guarda.

A resposta da guarda chega depois do primeiro render, então o bloco pode aparecer ligado e
piscar para desligado quando a consulta responde. É a informação chegando quando chega, e não
um estado errado: fingir "carregando" no lugar esconderia o padrão que a decisão inteira
defende. Pelo mesmo motivo o achado carrega a chave que o pediu — enquanto a resposta da chave
nova não chega, a guarda da anterior não continua valendo.

---

## D56 · Estoque é medição, e não saldo

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** `Insumo.estoqueAtual` era um número solto, com exatamente um leitor em todo o
sistema — `montarLista` — que o subtraía em silêncio, sem saber de quando ele era. Os 500 g de
farinha digitados em março continuavam sendo descontados em setembro, e a lista errava nos dois
sentidos sem avisar.

**Decisão.** Estoque passa a ser uma **medição com data**, e não um saldo. Um saldo é
consequência de movimentos; o sistema não vê os movimentos da despensa — nem a fornada de
quinta à noite, nem o pacote aberto para provar —, então ele não tem como manter um. O que ele
guarda é o que ela viu, e quando viu.

**Consequência.** É a decisão de que a spec inteira depende: se estoque é medição, ele
envelhece, e um sistema que sabe a idade de um número pode parar de confiar nele. É isso que o
número solto não permitia fazer.

Baixa automática na produção continua fora, e agora com um argumento melhor do que "ela produz
fora do sistema": um saldo que só o sistema mexe fica errado na primeira fornada não registrada,
e esta decisão é a resposta ao problema que a baixa automática prometia resolver.

---

## D57 · A data da contagem é um dia, e não um instante

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** A idade da contagem precisava de uma data no documento. O reflexo era `Timestamp`,
que é o que todo o resto de `Insumo` usa para tempo.

**Decisão.** `Insumo.estoqueContadoEmISO?: DataISO`, campo opcional novo. `DataISO`, e não
`Timestamp`.

**Consequência.** Dois motivos, e o segundo é uma invariante. **A precisão honesta é o dia:**
ela conta na manhã de terça e assa na tarde de terça, e "contado há 6 horas" seria uma exatidão
que a despensa não tem — a idade que interessa se conta em dias. E `src/lib/domain/` nunca
importa Firebase: uma data que atravessa a fronteira como `DataISO` mantém `estoque.ts` puro, do
lado certo da linha, e `datas.ts` já sabe trabalhar com essa forma.

`datas.ts` ganhou `diasEntre(deISO, ateISO)`, que era a única peça que faltava lá. Ela arredonda
a divisão em vez de truncar, porque um dia de horário de verão tem 23 ou 25 horas e truncar
contaria um dia a menos na virada.

Acrescentar campo opcional é mudança compatível de schema: documento antigo sem o campo continua
válido, e a ausência tem significado definido — "nunca contado". **Foi uma das aprovações que a
spec pediu.**

---

## D58 · Quem conta escreve a data; quem não contou a carrega adiante

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** A data podia sair de um diff: "o número mudou, então alguém contou". Sairia de
graça, sem campo novo em `DadosInsumo` e sem nenhuma tela precisar saber da regra.

**Decisão.** A data **não** sai de um diff. `estoqueContadoEmISO` entra em `DadosInsumo`, é
escrita por quem contou, e carregada adiante por quem não contou — que é exatamente o serviço que
`dadosDoInsumo` já presta aos outros campos.

**Consequência.** O contra-exemplo prova a regra: contar a despensa e achar os mesmos 50
saquinhos da semana passada **não** atualizaria a data, e a lista continuaria desconfiando de um
número que ela acabou de conferir na prateleira. Encontrar o mesmo número é uma contagem, e é uma
das mais valiosas.

Pelo mesmo motivo o inverso também vale, e são três caminhos a proteger:

- **`corrigirPrecoNaLista`** chama `atualizarInsumo` com `dadosDoInsumo`, que agora carrega a
  data adiante. Ela olhou a etiqueta da gôndola, e não o armário.
- **`atualizacaoDaLinha`**, da nota, continua devolvendo só preço e embalagem: o campo fica de
  fora daquele objeto justamente para não ter como ser sobrescrito.
- **`FormularioInsumo`** monta `DadosInsumo` do zero a partir do formulário, então ele repõe a
  data do insumo em edição explicitamente. Sem isso, editar o preço ali apagaria a idade do
  estoque — `corpoDeAtualizacao` grava `null` para todo campo ausente.

O efeito colateral aceito: apagar o campo "Estoque atual" no formulário deixa uma data sem
número. `contagemDoInsumo` trata isso como `NUNCA` — data sem número não é contagem —, em vez de
inventar um zero que ninguém contou.

---

## D59 · O campo nasce vazio, e zero é uma contagem

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** Semear cada campo da tela de contagem com o número anterior é mais confortável de
digitar: ela corrige o que mudou e passa adiante o resto.

**Decisão.** O campo **nasce vazio**, com o número anterior e a idade dele ao lado, como
referência. Vazio significa "não contei esta"; `0` significa "contei, e não tem". Só a linha
tocada é gravada.

**Consequência.** Um campo semeado com o valor anterior tornaria "não mexi" indistinguível de
"conferi e continua igual", e uma tela que gravasse as trinta e quatro linhas datava trinta e
duas que ela nunca olhou. **É a mentira que a spec existe para remover, cometida pela própria
tela que veio consertá-la.**

É a terceira vez que este projeto encontra o mesmo problema, depois do `#d43` (ausência não é
igualdade, na configuração) e do `#d21`/`#d55` (o par de estados em vez do booleano). A leitura
do que ela digitou mora em `numeroContado`, no domínio, e devolve `number | null`: texto que não
vira número também é ausência, porque gravar zero porque ela digitou uma letra seria inventar uma
contagem.

Contagem é por insumo, e não por despensa: o que ela não contou continua com a data que tinha e
vence no prazo dele.

---

## D60 · A contagem tem prazo, e o prazo é do domínio

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** Uma contagem com data ainda precisa de uma regra que diga quando ela deixa de
valer. Sem prazo, "medição com data" seria a mesma coisa que o número solto, com um campo a mais.

**Decisão.** Quatro estados e dois números, em `domain/estoque.ts`: `FRESCA` até 7 dias,
`ENVELHECENDO` de 8 a 30, `VENCIDA` acima de 30, `NUNCA` sem data. `IDADE_FRESCA_DIAS` e
`IDADE_VENCE_DIAS` são exportados porque a tela também os diz.

**Consequência.** **Sete dias porque é o ciclo dela:** ela compra no mesmo mercado toda semana, e
o horizonte padrão da lista de compras são 7 dias — uma contagem vale uma ida ao mercado sem
precisar de aviso. **Trinta porque é o maior horizonte da própria lista**, e porque depois de um
mês todo número da despensa passou por uma compra e por várias fornadas: não sobrou observação
nenhuma dentro dele.

O estado intermediário existe para não jogar o trabalho dela no lixo: uma contagem de doze dias
ainda é a melhor informação que existe sobre aquele armário, e descartá-la porque passou de uma
semana seria trocar um número razoável por nenhum.

Os dois números saem do ciclo dela e do horizonte da própria lista, e não de uma teoria de
estoque: mudá-los é uma linha, e a tela diz o número que estiver lá. Data no futuro é dedo errado
e vale `FRESCA` — quem digitou 2027 acabou de contar, e desconfiar do número por causa do ano
seria punir a contagem mais recente que existe.

`estoqueParaLista` é a função que traduz isso para a lista de compras, e **na 7A ela ainda não
tem chamador**: quem passa a usá-la é `montarLista`, na 7B. Está aqui porque é a mesma regra, e
separá-la do módulo seria dividir uma decisão em dois lugares.

---

## D61 · `estoqueMinimo` sai, e o selo passa a dizer "Contagem vencida"

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** `Insumo.estoqueMinimo` era tipado, validado por `esquemaInsumo` e gravado pelas
duas montagens de documento — e **nenhuma tela do sistema o escrevia**. Seu único leitor era
`estoqueBaixo`, em `LinhaInsumo`, que por isso nunca pôde disparar: o selo "Estoque baixo" que o
`DESIGN.md` lista como uso do token `--attention` não existia em tela nenhuma.

**Decisão.** O campo sai do tipo, do `esquemaInsumo`, do `DadosInsumo`, das duas montagens de
documento e do selo. Nenhum documento da conta tinha valor real ali, então não houve dado a
migrar. O selo continua existindo, e passa a dizer **"Contagem vencida"**.

**Consequência.** A pergunta que um limiar responderia é "o que está acabando?", e ela passa a
ter duas respostas melhores, as duas de graça: a contagem diz **o que zerou** no momento em que
ela conta, sem limiar nenhum para inventar item por item; e a lista de compras diz o que falta
contra a demanda real dos pedidos fechados, que é a versão útil da mesma pergunta. Um mínimo por
insumo seriam vinte palpites a manter, cada um envelhecendo do mesmo jeito que o estoque
envelhecia.

O selo trocou um estado que nunca acontecia por uma afirmação verificável sobre um número que
existe. Alerta de estoque baixo por limiar fica fora do sistema: é este campo voltando com outro
nome.

**Foi a segunda aprovação que a spec pediu**, e é remoção de campo — portanto da dona do negócio,
e não de quem implementa.

---

## D62 · A contagem não espera o servidor

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7A

**Contexto.** Salvar a contagem podia ser `await` com o botão em "salvando", como fazem o
cadastro de insumo, o editor de ficha e `TelaNota`.

**Decisão.** A tela despacha o `writeBatch` e **não o espera**, do jeito de `/compras` (`#d40`).
O cache local já aplicou, a tela volta para `/compras` no toque, e o `SeloSincronizacao` conta a
verdade sobre o que ainda não subiu.

**Consequência.** **A despensa é o pior sinal da casa.** É o fundo, atrás da cozinha, e é onde a
contagem acontece por definição. A promessa de uma escrita do Firestore não resolve enquanto não
há rede — ela fica pendente até a reconexão —, então um `await` aqui deixaria o botão preso em
"salvando" exatamente no lugar em que esta tela existe para funcionar. É a dívida que `TelaNota`
tem e aceita (`#d50`): lá a tela já exigiu rede para ler; aqui não há nada a ler de fora.

O que se perde: salvar volta para `/compras` no mesmo toque, então uma falha de permissão
apareceria numa tela que ela já deixou. É a mesma troca de `#d40`, e pelo mesmo motivo — a falha
plausível aqui é ausência de rede, e ausência de rede não é falha.

A escrita toca **dois campos**, e não o documento inteiro: `estoqueAtual` e
`estoqueContadoEmISO`, mais `v` e `atualizadoEm`. Não passa por `corpoDeAtualizacao` de
propósito — aquele corpo reescreve o documento a partir de um `DadosInsumo`, e o que ela não
contou não pode ser sobrescrito por um caminho que não estava falando daquilo. E não marca ficha
nenhuma: quem envelhece ficha é preço, embalagem e perda (`precoMudou`), e contar a despensa não
muda o custo de um cookie.

---

## D63 · Contagem vencida vale "não sei", e a lista deixa de descontar

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7B

**Contexto.** `montarLista` descontava `estoqueAtual` em silêncio, sem saber de quando ele era.
Desde a 7A o número tem data (`#d57`) e o prazo existe no domínio (`#d60`), mas
`estoqueParaLista` não tinha chamador: a lista continuava descontando os 500 g de farinha
digitados em março.

**Decisão.** `montarLista(demanda, insumos, hojeISO)` passa a chamar `estoqueParaLista` no
lugar de `Math.max(0, insumo.estoqueAtual ?? 0)`. Contagem `VENCIDA` e contagem inexistente
valem **zero**: a lista compra a quantidade física inteira, e `/compras` diz por quê em três
frases — a do carrinho comprando tudo, com o atalho para contar; a idade na linha; e a da
lista mais velha do que a conta de hoje.

Nada novo é gravado. `LinhaDaLista.estoqueAtual` passa a significar **o que foi descontado**,
e não o que está no insumo — zero quando a contagem venceu. O motivo não entra em
`ItemListaCompras` porque ele está no insumo vivo, que a tela já tem na mão desde a 3C: uma
idade congelada dentro de um documento que ninguém reescreve envelheceria errado.

**Consequência.** A escolha é entre dois erros, e eles não custam o mesmo. Descontar um número
vencido erra para baixo e produz a compra faltando: a fornada de sexta não acontece, e o
pedido é da cliente. Não descontar erra para cima e produz um pacote a mais na prateleira —
dinheiro parado, e ele volta na semana seguinte. `listaCompras.ts` já registrava qual dos dois
é o inaceitável, no comentário de `MotivoPendencia`: "uma lista que some com um item faz a
Maynara chegar em casa sem chocolate".

O preço está medido: no caso de aceite da 3C, a contagem vencida custa **R$ 30,00** — os
saquinhos, a única linha em que a contagem decidia alguma coisa. A farinha custa os mesmos
R$ 12,50 nos três cenários, porque 342,11 g e 842,11 g fecham no mesmo pacote de 1 kg: deixar
de descontar não é multiplicar a compra, é parar de apostar.

**Isto vale para o estoque já gravado**, e é a única parte desta spec com efeito imediato em
dinheiro. Todo insumo cadastrado antes dela tem número e não tem data, e não existe data
honesta a inventar — `atualizadoEm` é do documento, e não da contagem. Então ele entra como
`NUNCA`, e na primeira abertura de `/compras` **o carrinho cresce**. Não há script de
migração e não deve haver: a migração é a frase na tela, e o conserto são dois minutos em
`/insumos/contagem`.

**A frase da lista desatualizada não jura que foi a contagem.** A divergência é medida em
`quantidadePacotes`, que é o que a spec pede, e essa comparação também pega um pedido
confirmado agora e um pacote de tamanho diferente. A frase nomeia a contagem primeiro, porque
é a causa mais provável e a que ela acabou de provocar, mas lista as outras duas em vez de
afirmar uma só — dizer "você contou a despensa" quando ela confirmou um orçamento seria
mentir na tela que esta spec existe para tornar confiável.

**Uma consequência de arquitetura:** `agruparPorCorredor` e a ordem do mercado saíram de
`listaCompras.ts` para `domain/corredores.ts`. `estoque.ts` já importava o agrupamento, e
`listaCompras.ts` passou a importar `estoqueParaLista`: deixar os dois onde estavam fecharia
um ciclo entre os módulos. A ordem do corredor não é propriedade de nenhum dos dois — é de
quem empurra o carrinho, e a despensa se percorre na mesma ordem da gôndola.

---

## D64 · A compra propõe a contagem, e a semente viaja fora da URL

**Status:** vigente · decidida em 2026-09-03 na spec `007-estoque`, sessão 7B

**Contexto.** Depois da `#d63` a lista precisa de contagem para descontar qualquer coisa, e o
risco alto da spec passa a ser ela não contar. O momento em que contar é barato é aquele em
que ela já está de pé na frente da despensa com as sacolas na mão: ao fim da leitura de nota e
ao fechar a lista de compras.

**Decisão.** Nesses dois momentos a contagem é **oferecida com os campos semeados**, e nunca
gravada. A semente é `contagem anterior + o que entrou`, linha por linha, por
`sugestaoDaContagem`, e cada linha diz de onde a sugestão saiu — "620 g contados há 4 dias +
1 kg da nota". Ela confirma, corrige ou ignora. É o `#d17` aplicado ao armário.

Duas regras caem daí, e as duas estão em teste: **sem contagem recente a sugestão é só o que
entrou** ("não sei mais 1 kg" não são 1,5 kg), e **contagem de hoje não recebe soma** — ler a
nota, guardar na despensa e depois fechar a lista da mesma compra encontraria a contagem feita
há minutos e somaria os mesmos pacotes de novo.

**A semente atravessa como estado de navegação**, em `lib/estado/sementeDaContagem.ts`, e não
como parâmetro de URL.

**Consequência.** Somar a entrada e gravar seria inventar a metade que falta: uma compra sabe
**quanto entrou** e não sabe **o que saiu desde então**. É a tentação que o "Fora de escopo" da
006 nomeou — entrada automática sem baixa automática deixa o estoque subindo para sempre —, e
é por isso que a baixa automática pode continuar fora (`#d09`).

Sobre a URL: são de seis a vinte pares `insumoId → quantidade`, e uma querystring com isso
dentro é um lugar novo onde número de negócio pode ser reescrito à mão, num link colado. Custa
um módulo de vinte linhas e fecha essa porta. O módulo guarda estado e não é contexto de React
porque o que ele guarda não pertence a nenhuma árvore: quem escreve são `/insumos/nota` e
`/compras`, quem lê é `/insumos/contagem`, e as três são páginas irmãs. **Morrer no
recarregamento é a intenção** — uma semente que sobrevivesse ao F5 semearia os campos de uma
compra que ela já guardou. A tela sem semente é a mesma tela, com os campos vazios.

O que isto custou fora do previsto: `importarNota` passou a devolver `insumoIds`, o id do
insumo que cada linha tocou, na ordem em que elas chegaram. Sem ele o insumo que **nasce**
naquela nota — o celofane do caso de aceite — não teria endereço para ser semeado. O id de um
documento novo é gerado no cliente antes da escrita, então isto é uma leitura e não uma
segunda ida ao servidor.

E o campo semeado não contradiz o `#d59`. Lá o campo nasce vazio porque o valor anterior é um
número **herdado**, e semeá-lo tornaria "não mexi" indistinguível de "conferi e continua
igual". Aqui o número tem procedência: é uma soma que o sistema sabe defender, e a linha diz as
duas parcelas para ela conferir a soma em vez de acreditar nela. Enquanto o campo continuar
sendo o que a compra propôs, a frase fala da compra; no instante em que ela corrige o número, a
frase passa a falar do número dela.

---

## D65 · O guia é um caminho, e não um tour — e não semeia dado

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8A

**Contexto.** O sistema está completo e nunca se apresenta. São quinze rotas, cinco na
navegação inferior, e uma cadeia de dependência que existe de verdade — configuração →
insumos → fichas → pedidos → caixa — sem que nada em tela alguma diga que ela existe. O
reflexo pronto para isso é um tour: balões numerados perseguindo a tela no primeiro acesso.

**Decisão.** Não há tour. **O guia mostra onde ela está e a leva até lá**: um cartão na tela
Hoje com o passo de agora, e uma página `/comecar` com os cinco. Nenhum passo bloqueia tela
nenhuma, nenhum passo é obrigatório, e o sistema inteiro continua funcionando com o cartão
ignorado. **E o guia não semeia dado**: nenhum insumo de exemplo, nenhuma ficha de
demonstração, nenhum botão de "carregar dados de teste".

**Consequência.** Um tour toma a decisão de quando ela aprende, e a resposta certa é "quando
ela for fazer aquilo". Ele também só pode rodar no momento em que não há nada para fazer, que
é o único momento em que ninguém guarda nada — e `DESIGN.md` reserva modal para confirmação
destrutiva, pelo mesmo motivo. O preço de não ter tour é que o guia precisa ser encontrado; é
por isso que ele mora na tela em que o aplicativo abre, e não atrás de um menu.

Sobre o dado de exemplo: `#d17` já decidiu que sugestão não é dado. Um cookie de mentira
dentro de `/fichas` de uma confeitaria de verdade é pior do que uma lista vazia, e o dia em
que ela apagar o exemplo é o dia em que ela aprende que o sistema inventa coisas.

**Revisto pela spec 017 (2026-09-15).** A biblioteca de partida não é exceção a "não semeia
dado": é um botão que ela aperta, marcado pelo id (`biblioteca-<slug>`) e pelo preço médio até
ela corrigir, e que some da tela no instante em que a conta tem qualquer insumo ou ficha. O
guia continua não semeando nada sozinho; quem semeia é ela, no toque (`#d109`).

---

## D66 · São cinco passos, terminando no caixa, e a meta fica de fora

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8A

**Contexto.** A cadeia tem seis candidatos óbvios a passo, e o sexto seria a meta do mês.

**Decisão.** Cinco: conferir a configuração, cadastrar o que compra, montar a primeira ficha,
registrar uma encomenda e **marcar a encomenda como paga**. A meta não é passo.

**Consequência.** A meta já tem quem a peça, e quem pede é o `CartaoMetaHoje`, que fica logo
abaixo do cartão dos primeiros passos na mesma tela: um caminho que a pedisse duplicaria o
convite e atrasaria o fechamento. E a meta fica melhor **depois** dos cinco, porque o alvo em
doces sai do preço médio das fichas e o alvo em pedidos sai do ticket médio real (`#d38`) —
ela define a meta na segunda semana, com número em vez de palpite.

Pagar é passo, e não nota de rodapé do passo 4: registrar e receber são dois dias diferentes e
duas telas diferentes, e é entre os dois que mora a metade do sistema que ela não descobriria
sozinha — nenhum número de pedido aparece em `/financeiro` até alguém tocar em "marcar como
pago" (`#d36`). Deixar isso implícito é deixar a pergunta "por que o caixa está zerado se eu
vendi?" para o mês seguinte.

Os cinco são a navegação inferior lida em voz alta, com a configuração como o zero que não
coube no teto de cinco destinos de `navegacao.ts`. Quem termina o caminho aprendeu o menu sem
que o menu tenha sido explicado.

**Revisto pelo `#d115`, 2026-09-16.** O último parágrafo deixou de valer: os cinco passos não
são mais a ordem de `navegacao.ts` lida em voz alta, são a ordem em que o sistema dá alguma
coisa em troca. Quem termina o caminho continua conhecendo os cinco destinos — só que na ordem
Fichas, Insumos, Configuração, Pedidos, Caixa, e não na ordem do menu. O resto desta decisão
— os cinco passos, a meta de fora, pagar como passo próprio — continua vigente.

---

## D67 · O estado do começo é perguntado à coleção, e não ao contador

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8A

**Contexto.** `agregados/global` parece o lugar óbvio para saber se a conta tem insumo, ficha
e pedido: `totalInsumos`, `totalFichas`, `totalClientes`, `pedidosAbertos`,
`ultimoNumeroPedido`. **Não é.** Os três primeiros são incrementados no cliente e não têm um
único leitor em todo o sistema; os dois últimos não têm nem escritor — são campos tipados em
`types/financeiro.ts` que nunca receberam valor, a mesma doença que a 7A curou em
`estoqueMinimo` (`#d61`).

**Decisão.** Cada passo pergunta a quem tem a resposta: `useDocumento(docConfiguracao)` para o
passo 1, e `where('arquivado','==',false)` com `limit(1)` em `insumos`, `fichas`, `pedidos` e
`transacoes` para os outros quatro. Cinco assinaturas de no máximo um documento cada, sem
índice composto novo e sem escrita nenhuma.

**Consequência.** Um caminho decidido pelo contador seria o primeiro leitor de um número que
ninguém nunca conferiu, e o erro cairia do lado caro: **um passo marcado como feito some da
lista, e o que some não volta a ser ensinado.** Um passo marcado como pendente sem razão custa
um toque e uma olhada.

O custo é cinco assinaturas nas duas telas do caminho, durante os primeiros dias de uma conta,
e **elas morrem no dia em que ele termina** (`#d68`): com `primeirosPassosEm` gravado, as
cinco consultas viram `null` e `useColecao`/`useDocumento` não abrem nada. As consultas também
só nascem depois que o documento da conta chega — perguntar antes de saber se o caminho acabou
seria abrir as cinco justamente na conta que não as quer.

Os campos mortos de `agregados/global` não são consertados aqui: eles continuam na tabela de
dívidas com o gatilho próprio, e removê-los é uma spec de limpeza que ninguém pediu.

---

## D68 · Terminar é um ato dela, e fica gravado na conta

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8A

**Contexto.** O cartão dos primeiros passos precisa acabar. As três formas de decidir isso são
derivar dos cinco fatos, guardar no aparelho, ou gravar um ato dela.

**Decisão.** `Conta.primeirosPassosEm?: Timestamp`, campo opcional novo, gravado por duas
portas que não pedem confirmação: **"Concluir"**, no fechamento do cartão com os cinco feitos,
e **"Não preciso disto agora"**, disponível desde o primeiro render. A escrita é
`Timestamp.now()`, nunca `serverTimestamp()`, e a tela não espera a promessa.

**Consequência.** Em `Conta` porque o `AuthProvider` já assina esse documento em toda tela do
sistema: o campo chega de graça, sem leitura nova e sem esperar rede — e é literalmente o que
o comentário do tipo diz que aquele documento é para ser.

Não em `localStorage`: não existe uma linha de armazenamento de aparelho no projeto inteiro, e
este seria o pior lugar para estrear. Ela usa o celular na bancada e o computador à noite, e
terminar em dois aparelhos seria terminar duas vezes.

Não puramente derivado: um caminho que se recalcula é um caminho que volta. Arquivar o último
insumo em janeiro faria o cartão reaparecer ensinando o que ela faz há meses. O estado do
começo é monotônico por natureza — ela não desaprende —, e um campo gravado é a forma honesta
disso.

`serverTimestamp()` grava `null` no cache local até a rede confirmar, e um `null` aqui traria
o cartão de volta no instante seguinte ao toque: é a invariante de offline do projeto valendo
no lugar em que ela é mais fácil de esquecer. A mudança de schema é compatível — documento
antigo sem o campo continua válido —, e nenhuma regra de segurança muda: `firestore.rules` já
dá `read, write` no documento da conta a quem tem a claim.

---

## D69 · O cartão acaba; a página fica

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8A

**Contexto.** Encerrado o caminho, o mais simples seria sumir com tudo.

**Decisão.** O que acaba é **o cartão da tela Hoje**. `/comecar` continua existindo, com duas
entradas permanentes: um item **"Como funciona"** no pé da barra lateral, acima de
Configuração, no desktop; e um link no pé de `/configuracao`, que é a entrada do celular —
onde a engrenagem do cabeçalho da tela Hoje já leva.

**Consequência.** A terceira semana precisa ter onde perguntar, e nenhum `EstadoVazio` serve
para isso: ele ensina a tela em que está, e some assim que a tela deixa de estar vazia. É
também onde a 8B pendura o guia que fica — a cadeia do dinheiro, as três funcionalidades fora
da navegação, o offline e a instalação na tela de início.

`/comecar` **não entra na navegação inferior**, pelo mesmo motivo que `/compras` e
`/insumos/nota` não entraram: cinco destinos é o teto. São três toques no celular para uma
coisa que se consulta raramente, e é o preço de não gastar o sexto destino.

Com o caminho encerrado a página vira **referência**: os cinco passos na ordem, sem selo de
estado. As cinco perguntas deixaram de ser feitas (`#d67`), e um selo dizendo "depois" sobre
um passo que ninguém consultou seria uma afirmação inventada.

---

## D70 · O guia não repete o estado vazio

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8B

**Contexto.** `/comecar` continua existindo depois que o cartão da tela Hoje acaba (`#d69`), e
a tentação óbvia de uma página de ajuda é recontar o que cada tela faz. Só que cada tela já
conta: `EstadoVazio` **ensina a tela em que está**, por desenho, com a frase do que aquilo
resolve e a ação para começar.

**Decisão.** A divisão é de responsabilidade, e não de assunto: **o estado vazio ensina a tela
em que ele está; o guia ensina o que existe em telas que ela ainda não abriu, e por que uma
coisa leva à outra.** Onde a tentação de repetir aparecer, o guia manda para a tela e a tela
ensina. Daí as três seções serem exatamente as que nenhuma tela pode ter:

- **A cadeia do dinheiro**, seis elos em fio vertical, cada um nomeando quem o faz — ela ou o
  sistema — e a tela onde ele mora. É a resposta para "por que preciso cadastrar tudo isso",
  que é a pergunta que faz uma pessoa abandonar um sistema na terceira noite.
- **O que mais tem aqui**, com `/compras`, `/insumos/nota` e `/insumos/contagem`, cada uma com
  o **momento da semana** em que serve. O momento é o gatilho, e é justamente o que nenhuma
  tela consegue dizer sobre si mesma: uma tela só fala quando já foi aberta.
- **Quando não tem internet**, o comportamento mais surpreendente do produto e o único sem
  tela própria — o que continua funcionando, o selo "Sem conexão, salvando no aparelho"
  mostrado como é, a leitura de nota que exige rede e diz isso (`#d50`), e a tela nunca aberta
  que cai em `/offline`.

**Consequência.** Duas cópias da mesma frase divergem, e a errada é sempre a que ela leu. A
regra também é o que impede a página de crescer sem fim: o limite não é "ela não pode ficar
com dúvidas", que não tem fundo, e sim "isto cabe em alguma tela?". Se cabe, mora lá.

**Nenhum número de exemplo entra na página.** Número de mentira numa página de ajuda envelhece
e passa a contradizer a tela, e é o mesmo argumento de `#d17` contra dado semeado, aplicado ao
texto.

O conteúdo das quatro seções mora nos componentes de `src/components/comecar/`, e **não** em
`src/lib/domain/`. Os cinco passos foram para o domínio porque duas telas mostram os mesmos
rótulos — o cartão da tela Hoje e `/comecar` —, e duas cópias divergiriam. Aqui há uma tela
só, e cópia sem regra atrás dela não é domínio: `domain/` é a aritmética que os testes cobrem.

---

## D71 · Instalar é bloco condicional, sem estado gravado

**Status:** vigente · decidida em 2026-09-03 na spec `008-onboarding`, sessão 8B

**Contexto.** A 5A rasterizou os ícones exatamente para este momento (`#d44`), e nada no
sistema jamais convidou a instalar. O convite precisa sumir depois de instalado, e o jeito
óbvio de saber isso seria um booleano em `Conta`.

**Decisão.** Nenhum campo, nenhum estado gravado: a seção inteira de `/comecar` some quando o
navegador diz que o app já está rodando instalado. A pergunta é feita por
`matchMedia('(display-mode: standalone)')`, com `navigator.standalone` ao lado para o iPhone
antigo, e o texto da instrução é escolhido por `matchMedia('(pointer: coarse)')` — uma
variante para o celular, uma para o computador.

**Consequência.** Um booleano em `Conta` seria um campo para uma pergunta que o navegador já
responde, e responderia errado: instalar é por aparelho, e ela usa o celular na bancada e o
computador à noite. Marcado como instalado no celular, o convite sumiria do computador, que é
onde ela ainda não instalou — o inverso exato do `#d68`, onde terminar o caminho é monotônico
e vale nos dois aparelhos.

**O texto sai do ponteiro, e nunca do user-agent.** O que decide a instrução é o dedo ou o
mouse na frente dela, e não o nome do navegador em uma string que mente há vinte anos. O
iPhone é o caso que mais precisa da frase, porque o Safari não oferece a instalação sozinho: é
compartilhar e "Adicionar à Tela de Início", e ninguém descobre isso por acaso.

**A seção inteira some, e não só o miolo.** Um título "Instalar na tela de início" sem nada
embaixo seria pior do que o convite repetido, então o próprio componente carrega o cabeçalho e
devolve `null` — é a única das quatro seções que decide se existe.

---

## D72 · A credencial de servidor vira conteúdo, e a falta dela tem nome próprio

**Status:** vigente · decidida em 2026-09-03, na preparação do deploy no Vercel

**Contexto.** `src/lib/server/firebaseAdmin.ts` inicializava o Admin SDK com
`applicationDefault()`, que lê `GOOGLE_APPLICATION_CREDENTIALS` como **caminho de arquivo no
disco**. Isso funciona no computador de quem desenvolve e em `scripts/conceder-acesso.mjs`, e
não funciona em função serverless: lá não há disco onde pôr a chave, e o repositório — de
propósito, e desde sempre — não a versiona (`.gitignore`, linha `*firebase-adminsdk*.json`).

Publicado assim, `/api/nota` responderia **401 a toda chamada**: `conferirToken` embrulha tudo
em `try`, e credencial ausente sai pelo mesmo `catch` de token expirado.

**Decisão.** A hospedagem passa o **conteúdo**, e não o caminho: `FIREBASE_SERVICE_ACCOUNT`
carrega o JSON inteiro da chave — ou o mesmo JSON em base64, que é o que sobrevive a um campo
de painel que come quebra de linha — e vira `cert(...)`. Sem a variável, o caminho é o de
antes, letra por letra.

Junto, `credencialDisponivel()` passou a ser perguntado **antes** do token, e a rota devolve
`sem-configuracao` (500) no lugar de `sem-acesso` (401).

**Consequência.** São dois erros que pareciam um. "Este login não abre esta conta. Saia e
entre de novo" manda a usuária 0 fazer logout e login de novo, repetidamente, por causa de uma
variável que faltou no painel da hospedagem — a tela acusa a pessoa errada, e a pessoa não tem
como consertar o que ela está sendo mandada consertar. `sem-configuracao` já existia desde a
6A, com a frase certa já escrita: "A leitura de nota ainda não está configurada neste
servidor."

**A ordem da 6A foi preservada.** A propriedade exercitada naquela sessão era que a chave do
Gemini só é lida **depois** da porta: quem não entrou não descobre se ela está configurada. A
credencial do Admin SDK não pode obedecer a essa ordem — ela é o que confere o token —, mas a
inversão revela só a existência dela, e nunca a do Gemini, que continua sendo lida no mesmo
ponto de antes.

**Base64 aceito, e não exigido.** O JSON colado inteiro funciona no painel do Vercel. O base64
está aceito porque a mesma variável passa por lugares que reescrevem quebra de linha, e um
`private_key` truncado falha com "invalid PEM formatted message" — um erro que não diz de onde
veio. A troca de `\n` por `\n` depois do parse é a mesma guarda, para o JSON que chega
escapado duas vezes.

**Onde isto muda de novo.** Chave privada em variável de ambiente é o arranjo comum e não é o
melhor: ela fica legível para quem tiver acesso ao painel e não gira sozinha. Quando o projeto
virar SaaS, o lugar dela é um gerenciador de segredos com rotação — a fronteira já está no
lugar certo, porque só este arquivo conhece o formato.

---

## D73 · `functions/` sai do tsconfig e do lint da raiz

**Status:** vigente · decidida em 2026-09-03, na preparação do deploy no Vercel

**Contexto.** `functions/` está no estado em que o `firebase init` o deixou — a 6A registrou
isso ao explicar por que a leitura de nota é Route Handler e não Cloud Function. Ele tem
`package.json`, `tsconfig.json` e `.eslintrc.js` próprios, e dependências próprias que **o
`npm install` da raiz não instala**.

Localmente isso passava despercebido porque `functions/node_modules` existe no disco desde o
dia do `firebase init`. Num build limpo — que é todo build da hospedagem — o `include` da raiz
alcança `functions/src/index.ts`, o `tsc` que o `next build` roda não acha
`firebase-functions`, e o build falha antes de compilar uma linha do app.

**Decisão.** `"functions"` entrou no `exclude` do `tsconfig.json` da raiz e em `ignores` do
`eslint.config.mjs`. A pasta continua versionada e continua com o seu próprio conjunto de
ferramentas.

**Consequência.** `npm run typecheck` e `npm run lint` deixam de cobrir um arquivo de andaime
que ninguém escreveu e que está inteiro comentado. Se um dia existir função de verdade ali,
ela é verificada pela cadeia dela, que é a mesma que a publicaria — e verificar código de
Cloud Function com o `tsconfig` de um app Next sempre foi coincidência, e não cobertura.

**Não bastava o `.vercelignore`.** Ele resolve o deploy por linha de comando, que sobe a
pasta. O deploy por Git sobe o que está commitado, e `functions/` está commitado: a garantia
que vale nos dois caminhos é o `exclude`.

---

## D74 · O sinal de "teclado aberto" é a altura, e é CSS

**Status:** vigente · decidida em 2026-09-07, na spec 009

**Contexto.** No celular, com o teclado aberto em `/fichas/nova`, sobram cerca de 490 px de
viewport, e três faixas fixas tomam quase tudo: o cabeçalho grudento (~96 px), o resumo
flutuante (~210 px) e a navegação inferior (~56 px). Sobrava menos de 15% da tela para o
formulário que ela está preenchendo — no print, a única linha visível era um rótulo, e o campo
que ela acabara de tocar estava fora de vista.

O jeito exato de saber que o teclado subiu é `window.visualViewport`, com listener de `resize`
e estado.

**Decisão.** Não é esse. `layout.tsx` já declara `interactiveWidget: "resizes-content"`, que
faz o Android encolher o viewport de layout quando o teclado sobe — o teclado **já é** altura.
Nasceu a variante `apertado` em `globals.css`:

```css
@custom-variant apertado (@media (max-height: 560px) and (pointer: coarse));
```

Sem JavaScript, sem listener, sem hidratação e sem um estado que possa divergir do que está na
tela. **560 px** mora no vão entre as duas faixas reais: retrato tem 640 px no pior caso e 780
a 900 no comum; com o teclado aberto cai para 350 a 530. **`pointer: coarse`** porque a regra é
do dedo: sem ele, uma janela baixa de navegador no desktop começaria a esconder coisa.

**O que a variante nunca faz:** encolher alvo de toque. Nenhuma regra `apertado:` mexe em `h-`,
em `min-h-` ou na utilidade `toque`. O piso de 44 px vale com o teclado aberto exatamente como
vale fechado; o que some é espaço morto e prosa, nunca área de dedo.

**Quem some.** A navegação inferior (`apertado:hidden` no `<nav>`), os quatro botões flutuantes
de `/insumos`, `/fichas`, `/pedidos` e `/financeiro`, e o link de voltar dos dois editores — o
botão físico do Android existe e fecha o teclado antes de sair da tela. Encolhem: `pb-24` do
`AppShell`, `pb-44` e `pb-48` dos dois editores, e o `py-3` dos dois cabeçalhos. **Não** somem
o `<h1>`, o botão Salvar e a barra de salvar de `/configuracao`, que é a ação primária de uma
tela toda de campos.

**A ponta solta, aceita.** A variante não distingue "teclado aberto" de "aparelho deitado":
são a mesma altura. No app instalado isso não acontece, porque o manifesto declara
`orientation: "portrait"`. No navegador em retrato deitado a navegação inferior some, e ali a
barra de endereço do próprio navegador continua sendo a saída.

**`ponytail:`** o limiar de 560 px é heurística. `visualViewport` mede exato e custa um listener
com estado; troque só se algum aparelho de verdade cair do lado errado — a degradação é feia
(tela sem navegação e sem a frase do resumo), não é quebra.

---

## D75 · Em espaço apertado a frase some; o alerta, não

**Status:** vigente · decidida em 2026-09-07, na spec 009

**Contexto.** Os rodapés fixos têm duas partes, e só uma muda a cada tecla: os números. A frase
embaixo é prosa, ocupa duas linhas e diz em palavras o que os números acima já dizem em número.
Ela é a primeira candidata a sumir quando o teclado abre — mas nem toda frase é a mesma coisa.

**Decisão.** O que sobrevive ao teclado aberto é a **correção**, e nada mais.

"Sobram R$ 1,80 por unidade depois da maquininha" é confirmação: repete o que os três números
acima mostram, e ela pode lê-la quando fechar o teclado. "Neste preço você perde R$ 2,10 por
unidade" é correção, e esconder uma correção enquanto a pessoa digita o número errado é
esconder exatamente na hora em que ela importa.

**A primeira redação desta decisão dizia "a linha com `tom: "atencao"` fica", e o tom é grosso
demais.** A conferência em navegador mostrou por quê: "Diga quantas unidades saem de um lote"
tem `tom: "atencao"` e ficava — mas ela não corrige número nenhum. É **pendência**: pede um
campo que está no formulário logo acima, ou seja, exatamente o que a frase estava cobrindo. Em
`PainelPreco`, `explicar()` passou a devolver `correcao: boolean` ao lado do tom, e é ele que
decide: `false` no rendimento que falta e na boa notícia, `true` no prejuízo, na margem
impossível e no markup zerado. O tom continua sendo só cor e ícone.

É também o que preserva a invariante de que todo estado negativo carrega ícone ou texto: não
adianta o ícone estar num elemento com `display: none`.

**A segunda linha que some é a quebra.** Em `PainelPreco`, num celular estreito, o campo de
preço não cabe ao lado das duas métricas e o `flex-wrap` o joga para uma segunda linha — mais
uns 55 px de altura, num rodapé que já toma 200. Em `apertado` os três voltam para a mesma
linha por três ajustes de largura, e nenhum deles é fonte: o rótulo "Custo da unidade" perde
o " da unidade" (~60 px, e é o que realmente pesa: encolher os 12 px do rótulo para 11
devolveria uns 10), os vãos caem de `gap-5` para `gap-3`, e o campo de `w-36` para `w-32`.

**O `flex-wrap` fica.** Trocá-lo por `flex-nowrap` garantiria a linha única e, num aparelho de
320 px com preço de três dígitos, o `overflow-hidden` do cartão cortaria o número — e um campo
de dinheiro cortado é pior do que uma linha a mais. Mantido, o caso extremo degrada para o
layout de hoje, que é exatamente o que já existia.

**O rótulo do campo de preço também some**, e por `apertado:sr-only` — não removido. Ele é o
único campo do painel, tem "R$" dentro e "Custo" e "Sugerido" ao lado: com o teclado aberto é o
que menos se paga, e valem uns 26 px (o rótulo mais o vão, porque `sr-only` é `absolute` e sai
do fluxo do flex). Continua sendo o nome acessível do campo, ligado pelo `htmlFor`, e volta à
tela quando o teclado fecha. É opt-in por `rotuloSomeApertado` em `CampoMoeda`: a mesma regra
aplicada aos campos de `/configuracao` esconderia rótulo que ninguém adivinha.

**Onde vale.** `PainelPreco` (`correcao`), `PainelPedido` (tom do lucro **ou**
`descontoLimitado`, que conta um dado que ela não pediu — o desconto entrou menor do que ela
digitou), `RodapeNota` (`tudoCerto` some; a conferência que não fecha fica), e `RodapeCompras`
e `RodapeContagem`, cuja prosa é sempre neutra e sempre some.

---

## D76 · A barra do sistema tem uma cor só, e ela é a da marca

**Status:** vigente · decidida em 2026-09-07, na spec 009

**Contexto.** `layout.tsx` declarava o par certo em `<meta name="theme-color">`: creme no claro
e `#231a1a` no escuro. No app instalado no Android ele **não ganha**. Quem manda é
`manifest.ts`, e o manifesto tem um slot de cor só — não existe media query dentro dele. O
Android assa o `theme_color` dentro do WebAPK na instalação, e a partir daí a barra de status é
decoração de janela do sistema operacional, e não do documento. O resultado era uma faixa creme
de 36 px em cima de uma tela quase preta, com os ícones do sistema em preto.

**Decisão.** `theme_color: "#5e1725"` — o vinho que já é o fundo do ladrilho de
`src/app/icon.svg`. Não é cor nova, não entra em `globals.css` e não vira token: é a cor do
ícone, e a barra passa a ser a moldura dele. Como o valor tem que estar certo nos **dois**
temas, escuro nos dois é o que garante ícone do sistema em branco nos dois, sempre com
contraste — e a resposta a "de que app é esta barra?" é a mesma de manhã e à noite.

**O par com media query some junto.** `viewport.themeColor` virou o mesmo `"#5e1725"`. Manter
os dois é manter dois donos para o mesmo pixel, com a barra combinando com a marca no app
instalado e com a superfície na aba do navegador. Uma cor, um lugar, nenhuma divergência para
descobrir daqui a seis meses. O custo assumido: a barra deixa de acompanhar o tema do aparelho.

**`background_color` não muda.** Continua creme: é a tela de abertura, e o ícone precisa dela
para ter contra o que aparecer.

**Para conferir depois do deploy.** O WebAPK assa a cor na instalação: sem **desinstalar e
instalar de novo**, o Android continua mostrando o creme velho por até um dia. Se ainda assim
estiver creme, `chrome://webapks` no aparelho mostra o `theme_color` assado e a data da última
atualização — é ali que se separa cor errada de instalação velha.

---

## D77 · O canal é um link, e não uma integração

**Status:** vigente · decidida em 2026-09-07, na spec 010

**Contexto.** O pedido nasce numa conversa de WhatsApp e a confirmação volta por lá, hoje
digitada de novo item por item, com os números copiados da tela para o teclado. A segunda
digitação é onde o total do app e o total que a cliente leu se separam — e o que vale é o que
a cliente leu.

**Decisão.** `https://wa.me/<telefone>?text=<texto>`, o click-to-chat oficial. No celular abre
o aplicativo na conversa daquela pessoa, com a mensagem escrita e **não enviada**; no desktop
abre o WhatsApp Web. Sem chave, sem cadastro, sem custo por mensagem, sem servidor no meio e
sem template aprovado. A alternativa séria — a Cloud API do WhatsApp Business — envia de
verdade, e em troca pede número comercial verificado, template aprovado, um servidor para
guardar o token e cobrança por conversa. Não é o problema desta spec.

**A ação é um `<a>`, e não um botão.** Sem JavaScript, sem `window.open` para o navegador
bloquear, com toque longo e menu de contexto funcionando como a pessoa espera. `classesBotao`
existe exatamente para isso.

**Também não é `navigator.share`.** A bandeja do sistema faz ela escolher a conversa de novo,
à mão, entre todas — e não existe em navegador de desktop, que é onde ela fecha a semana. O
pedido já sabe o telefone da cliente.

**Consequência.** Duas, de propósito. **A mensagem nunca sai sozinha:** o link escreve, quem
envia é ela, com o polegar, depois de ler — o sistema não ganha a capacidade de falar com
cliente nenhuma sem ela ver. E **sem rede o link não abre**, o que não ganha aviso próprio:
mandar mensagem já dependia de rede, e não existe WhatsApp offline.

`wa.me` é domínio de terceiro: se o formato do link mudar, o botão quebra em silêncio. É link
público e estável há anos, e o conserto é de uma linha.

`ponytail:` a URL carrega o texto inteiro, e URL tem teto prático (~2000 caracteres). Um
pedido de 30 linhas passa longe disso; se um dia encostar, o corte é listar os itens e resumir
o resto, não trocar de canal.

---

## D78 · A mensagem é o que está na tela, e não o que está gravado

**Status:** vigente · decidida em 2026-09-07, na spec 010

**Contexto.** O bloco só aparece em pedido que já existe — pedido novo não tem código, e um
resumo sem código não é um pedido, é uma proposta. Mas o texto podia sair de dois lugares: do
documento gravado ou dos valores atuais do formulário.

**Decisão.** Dos valores do formulário, os mesmos que `derivarPedido` usa para desenhar o
rodapé de totais. `resumoParaCliente` em `FormularioPedido` é montado do estado da tela, e só
o `codigo` e o `pago` vêm do documento salvo — que é de onde eles têm que vir, porque nenhum
dos dois é campo do formulário.

**Consequência.** É a escolha menos óbvia da spec, e o motivo é que o contrário mente mais: se
ela corrige a quantidade e manda o resumo antes de salvar, a versão "do documento" mandaria
para a cliente um número que **ninguém está vendo**, contradizendo o total preso ao pé da tela
naquele instante. O custo aceito é o simétrico — a cliente pode receber um resumo que ainda
não foi salvo. O Salvar está no cabeçalho fixo, a dois centímetros, e pedido não salvo
continua sendo o problema que já era.

`ponytail:` se isso morder, o conserto é salvar antes de abrir o link (o botão vira ação
assíncrona e o link abre depois do `await`). Não está aqui porque transforma um `<a>` de zero
linhas de JavaScript numa ação que pode falhar, e falhar em cima de um popup que o navegador
já pode ter bloqueado.

---

## D79 · A mensagem confirma o combinado, e não abre a contabilidade

**Status:** vigente · decidida em 2026-09-07, na spec 010

**Contexto.** O pedido sabe custo, lucro, taxa da maquininha e custo por unidade. Nada disso é
da cliente.

**Decisão.** `ResumoParaCliente` é uma interface própria, e **não** o tipo `Pedido`: ela lista
quem, o quê, quanto, quando e como paga, e mais nada. `subtotalDoItem` passou a pedir só
`quantidade` e `precoUnitario` (`Pick`, e não `ItemParaPedido` inteiro) porque o resumo não
tem o custo na mão — e não pode ter. `Pagamento:` é o nome da forma, e nunca a taxa dela.

**`Pedido.observacoes` fica de fora**, e é a exclusão que merece explicação. O rótulo do campo
diz "o que você vai querer lembrar na hora de produzir e de embalar", e o placeholder mistura
as duas naturezas ("Sem nozes. Laço vinho. Entregar depois das 18h."): é metade recado da
cliente e metade recado para si mesma, e um campo assim não pode ser reenviado inteiro. O dia
em que fizer falta, o conserto é um segundo campo com dono declarado, e não relaxar este.

**Consequência.** A cliente às vezes quer confirmar o "sem nozes" e não vai encontrá-lo no
resumo. É o contra-argumento real, e ele perde para o risco de mandar recado interno para
fora. Zero é ausência, a mesma regra do painel financeiro: sem desconto a linha some, porque
"Desconto: R$ 0,00" faz a cliente procurar um desconto que não houve.

**Nenhum emoji, e dois negritos só** — o nome do negócio e o total. A voz do sistema é a da
confeitaria, e não a de um chatbot.

---

## D80 · A mutação do caixa despacha e não espera

**Status:** vigente · decidida em 2026-09-07, na spec 011

**Contexto.** Toda mutação do caixa era uma fila de escritas esperadas, uma depois da outra.
`marcarPedidoPago` é a mais longa: grava o lançamento, marca o pedido, aplica no agregado,
aplica na cliente. E a promessa de uma escrita do Firestore **não resolve enquanto não há
rede** — ela fica pendente até a reconexão (`@firebase/firestore` 4.17.1, `index.d.ts:4131`,
"won't resolve while you're offline").

O preço disso no caixa não é um botão preso: é **a parcela do mês perdida em definitivo**. Sem
sinal, a execução para na primeira linha, `aplicarNoAgregado` nunca é chamada, e o `increment`
nunca chega a ser enfileirado — o que a fila offline sabe enfileirar é escrita despachada, não
continuação de `async`. Quando a rede volta, a fila sobe o lançamento e o pedido; a continuação
morreu junto com a aba. O documento aparece na lista, e o gráfico e o ranking, que leem o
agregado, ficam com o que sobrou. Foi assim que "Movimento por dia" desenhou uma barra só num
mês com movimento em vários dias, e "O que mais vendeu" disse 1 unidade de cada num dia de dez
cookies vendidos e pagos.

**Decisão.** A regra que `#d62` deu à contagem passa a valer para as mutações que mantêm o
agregado: **nenhuma escrita do Firestore é esperada dentro da mutação.** Todas são despachadas,
na ordem, e a função retorna. Vale para `transacoes.ts`, `pedidos.ts`, `clientes.ts` e
`aplicarNoAgregado`. O cache local já aplicou as três ou quatro escritas, os `onSnapshot` da
tela já redesenharam com elas, e a fila do IndexedDB sobe tudo quando houver rede — inclusive o
`increment`, que é a razão de ele ter sido escolhido em vez de uma transação (`#d09`, `#d10`).

**`recalcularMes` é a única exceção, e está comentada como tal.** Ela é a rede de segurança,
faz duas consultas antes de escrever, já exige rede para existir e já diz isso na tela quando
falha.

**Um auxiliar só, `mutations/despachar.ts`**, de três linhas: engole a rejeição e a registra,
para que uma escrita recusada não vire `unhandledrejection` numa aba que ninguém está olhando.
Um lugar, e não um `.catch` repetido em quinze chamadas.

**O que isto tornou impossível: uma escrita da fila depender da resposta de outra.** Havia um
lugar assim, e o conserto é de uma linha — `gravarTransacao` usava `addDoc` para saber o id que
`marcarPedidoPago` grava em `transacaoId`. `doc(colTransacoes(contaId))` devolve uma referência
com id gerado **no aparelho, sem ida ao servidor**, e `setDoc` naquela referência faz o resto.
É o mesmo mecanismo que `addDoc` usa por dentro; o risco de colisão é o de sempre. O mesmo
conserto valeu para `criarPedido` e `criarCliente`.

**As assinaturas continuam `async` e continuam devolvendo o que devolviam**, e por isso nenhuma
tela mudou: elas seguem com `await` e seguem fechando o painel quando a promessa resolve, só
que agora ela resolve no toque, e não na reconexão.

**Consequência, e é a aprovação que a spec pediu.** Uma escrita recusada pelas regras de
segurança no caixa não aparece mais como erro no painel: ela falha calada, registrada no
console, e o número na tela fica diferente do banco até a próxima recarga. É a terceira vez que
este projeto faz a troca (`#d40`, `#d62`), e desta vez o que falha calado é dinheiro. Foi
pedida de novo por isso, e aceita pelos mesmos dois motivos: as regras em questão são as mesmas
que acabaram de deixar a tela ler o mês, e a falha plausível aqui é ausência de rede — que não
é falha. A alternativa era manter o `await` e aceitar que o caixa não funcione sem rede, o que
contraria o invariante de `CLAUDE.md` ("Offline é o estado normal"). Se um dia houver papel com
permissão parcial, isto volta à mesa.

A defesa que fica é o `SeloSincronizacao`, que a tela já desenha e que agora conta a verdade:
a escrita do agregado está de fato na fila, e `hasPendingWrites` a vê. A segunda é `#d81`.

**Salvar passa a ser instantâneo em todo o caixa.** É o comportamento que `/compras` e a
contagem já têm, e é o certo — mas é mudança de sensação em telas que ela usa todo dia, e
merece um olhar no roteiro da 5B.

**As outras cinco mutações com o mesmo `await` em fila ficaram de fora**: `insumos.ts`,
`fichas.ts`, `listasCompra.ts`, `metas.ts` e `configuracao.ts`. Nelas o preço de uma promessa
pendente é um botão preso, e não um número perdido: ou escrevem um documento só, ou o que
escrevem depois não é parcela de agregado que alguém lê — `agregados/global` é escrito por três
delas e lido por ninguém (`#d67`). Vira uma spec de varredura própria, depois da 5B.

---

## D81 · O agregado pode ser desmentido pela tela

**Status:** vigente · decidida em 2026-09-07, na spec 011

**Contexto.** Agregado mantido por incremento torce em silêncio — é o que `domain/caixa.ts` diz
no alto do arquivo desde a 4A, e é exatamente o que aconteceu em `#d80`: um delta perdido não
dá erro, não aparece em log, e só é notado quando alguém olha um gráfico e acha estranho.
Consertar a causa não fecha o silêncio; fecha só esta ocorrência dele.

**Decisão.** A `/financeiro` já assina as duas fontes — a coleção de lançamentos do mês e o
documento de agregado do mês. Enquanto forem duas, **elas se conferem.** `conferirAgregado`,
em `domain/caixa.ts`, soma `entradas` e `saidas` da lista e diz se batem com as do agregado.
Quando não batem, a tela diz, com ícone e texto, acima de `ResultadoDoMes`, com os dois números
e o botão "Recalcular o mês" ali dentro — quem precisa dele agora não deveria ter de rolar até
o pé da tela para achá-lo.

A comparação é exata, e não por aproximação: a consulta da lista (`arquivado == false`,
`competencia == mês`) é exatamente o conjunto que alimenta aquelas duas parcelas. Custo de
leitura zero: os dois documentos já estão na tela.

**O bloco fica calado enquanto `pendente` for verdadeiro.** As duas assinaturas não redesenham
no mesmo tique, e o agregado pode chegar um quadro depois do lançamento. Sem essa guarda, a
correção viraria um alarme piscando a cada escrita.

**Consequência.** A comparação cobre metade do agregado. `produtos` e `porDia[].pedidos` ficam
de fora: prová-los exigiria a consulta de pedidos pagos do mês, que a tela não assina — uma
consulta a mais numa tela que já faz três. Meia rede é mais do que nenhuma, e o que a tela pode
provar, ela prova.

**Não recalcula sozinha.** O aviso conta; quem aperta é ela. Recálculo automático numa tela que
abre offline seria uma escrita grande disparada sem pedir, e a falha dela apareceria como mais
um número estranho. E é um mês por vez, pela tela do mês: varredura de meses, se virar
necessidade real, nasce com tela própria.

**O estrago já feito não se conserta sozinho.** O `increment` que nunca foi despachado não vai
aparecer. "Recalcular o mês" é o conserto, e ele reconstrói as duas metades a partir dos
documentos, sem depender de parcela antiga nenhuma. Uma migração com Admin SDK para uma
usuária e três meses de dado seria script demais para um botão que existe.

---

## D82 · A entrega é repasse: o que se paga é o que se cobrou

**Status:** vigente · decidida em 2026-09-10 na spec 012

**Contexto.** `Pedido.entrega` já sabia as duas coisas que importam: se é `RETIRADA` ou
`ENTREGA`, e quanto a taxa custou para a cliente. **O outro lado não estava em lugar nenhum.**
A entrega é orçada nos apps (Uber/99), o valor é acertado com um terceirizado, e o combinado é
pagar a ele uma vez por semana — dinheiro que saía do bolso e que o caixa nunca via.

**Decisão.** `entrega.taxa` **é** o que se deve ao entregador, e não uma referência dele. O
repasse é integral.

**Consequência.** A alternativa era um segundo campo — o custo da entrega, ao lado da taxa
cobrada — que abriria a diferença entre os dois na tela, no formulário e no domínio. Enquanto o
repasse for integral, esse campo teria um único valor possível e seria mais um lugar para
digitar errado. **No dia em que ela cobrar R$ 15,00 e pagar R$ 12,00, este é o `D` que precisa
ser revisto**, e o campo nasce ali — não antes.

O que fica de pé, e é o incômodo aceito: `Pedido.lucroEstimado` continua carregando a taxa
dentro (`#d33`), e continua otimista pedido a pedido. Quem fecha a conta é o caixa, em regime de
caixa, onde a receita da entrega já entrava e a saída passa a entrar. Corrigir `derivarPedido`
mexeria em todo pedido já gravado e na função que o editor e a mutação compartilham (`#d19`),
para resolver no lugar errado um problema que o caixa resolve.

---

## D83 · Só entra na conta a entrega que já foi feita

**Status:** vigente · decidida em 2026-09-10 na spec 012

**Contexto.** Alguém precisa dizer quando uma entrega vira dívida com o entregador. Havia dois
sinais possíveis: a data de entrega ter passado, ou o pedido estar em `ENTREGUE`.

**Decisão.** O status, e só ele. Uma entrega entra na lista de "a pagar" quando o pedido está em
**`ENTREGUE`**. Não basta a data ter passado, e não basta o pedido estar confirmado.

**Consequência.** O status é o único sinal no sistema que **afirma** que a entrega aconteceu; a
data diz o que estava combinado. Pagar por data seria pagar por uma entrega que a cliente
remarcou, e o dinheiro sai antes do serviço.

O preço é conhecido e está na tela: **a entrega que ela esqueceu de marcar não aparece na conta
da semana.** Ela aparece na semana seguinte, quando o pedido for movido, e o painel diz quantos
pedidos de entrega estão parados com a data já vencida — uma frase, sem ação, para que a
ausência seja explicada em vez de silenciosa.

`entregasEsquecidas` deixa **orçamento e cancelado de fora**, e isso é uma escolha e não um
descuido: a spec dizia "parados antes de `ENTREGUE`", que ao pé da letra inclui orçamento. Uma
proposta que a cliente nunca aceitou não é uma entrega esquecida — é o mesmo recorte que
`aReceber` faz pelo mesmo motivo (`#d36`), e contá-la inflaria justamente o número que existe
para explicar uma ausência.

**Marcar como entregue passa a ter consequência em dinheiro.** Até aqui, `ENTREGUE` era só
posição na agenda. A partir desta spec, ele decide o que entra na conta da semana — e vale
dizê-lo, porque muda o peso de um botão que hoje parece inofensivo.

---

## D84 · O repasse mora no pedido, e a lista se monta em memória

**Status:** vigente · decidida em 2026-09-10 na spec 012

**Contexto.** "Quais entregas ainda não foram pagas" é uma pergunta que pede, no desenho óbvio,
uma coleção de repasses e uma consulta com índice.

**Decisão.** São dois campos no próprio pedido — `entrega.repassadoEm` e
`entrega.repasseTransacaoId` —, ausentes como estado normal. Não nasce coleção, não nasce
consulta e não nasce índice.

**Consequência.** `/pedidos` já assina **todos os pedidos não arquivados**, ordenados por data de
entrega — a mesma consulta que alimenta a agenda, o total do dia e a faixa "A receber". A lista
de entregas a pagar é uma soma em memória sobre o que a tela já tem, exatamente como `aReceber`
(`#d36`): zero leitura nova, zero índice novo, e funciona offline porque nada precisa ir ao
servidor para ser somado.

É também o que torna **desfazer** barato: os pedidos de um acerto são os que carregam aquele
`repasseTransacaoId`, e a tela já os tem na mão. `desfazerRepasse` reconstrói o lançamento a
partir do grupo em vez de lê-lo — mesmo arranjo de `contribuicaoDoPedidoPago` (`#d37`), e é o
que permite desfazer sem rede.

Três consequências de execução ficam registradas porque surpreendem:

- **`Timestamp` não atravessa para `domain/`.** `PedidoParaEntrega` fala em `repassadoEmISO`, e
  quem converte é `pedidoParaEntrega`, em `mutations/pedidos.ts`, como `pedidoAgregavel` faz com
  `pagoEm`. A regra é a mesma de `estoque.ts`: a precisão honesta é o dia.
- **O caminho pontilhado é obrigatório em toda escrita do mapa `entrega`.** Gravar o mapa
  inteiro apagaria endereço e taxa — e, do outro lado, apagaria os dois campos novos.
  **`atualizarPedido` foi corrigida por causa disto:** ela gravava `entrega` inteiro, e a partir
  desta spec isso faria uma entrega já acertada voltar para a faixa de "a pagar" ao ela editar o
  pedido. Editar um pedido é o caminho mais comum do sistema; pagar o entregador duas vezes seria
  a consequência.
- **`esquemaPedido` não ganhou os dois campos**, contra a letra da spec. Aquele esquema é a
  forma do **formulário** — `tipoEntrega`, `taxaEntrega`, `endereco` soltos —, e não a do
  documento: nenhum dos dois campos passa por lá, e declará-los seria pedir ao validador que
  confirasse o que ninguém digita.

---

## D85 · O repasse tem categoria própria no caixa

**Status:** vigente · decidida em 2026-09-10 na spec 012

**Contexto.** O acerto da semana precisa virar uma saída. Lançá-la em `OUTRO` custaria zero
código.

**Decisão.** `CategoriaTransacao` ganha `"ENTREGA"`, e a saída do acerto nasce nela.

**Consequência.** "Saídas por categoria" é a tela que responde para onde o dinheiro foi, e
entrega é uma das três maiores saídas de uma confeitaria que entrega: dissolvê-la em `OUTRO`
esconderia a resposta. A mudança é aditiva — `porCategoriaSaida` é `Partial<Record<…>>`, e
documento antigo continua válido sem a chave. Ela aparece como ausência em mês antigo, e não
como zero, que é a regra que o agregado já segue (`#d23`).

A saída nasce **sem `pedidoId`**: um acerto cobre vários pedidos, e o campo é de um só. O vínculo
existe na direção que importa e que é consultável de graça — do pedido para o lançamento.

Três detalhes da escrita, os três conferidos e não deduzidos:

- **`contextoMeta` é `null`**, e isso foi lido em `metas.ts`: `espelhoAposDelta` move o espelho a
  partir de `parcelas.entradas`, e o delta de uma saída tem `entradas` zerado. `null` diz isso em
  vez de depender da coincidência — é o mesmo que a 6B fez.
- **`custoTaxa: 0` explícito e `formas` vazio**, como em `#d53`: saída não passa por maquininha,
  e isso dispensa o painel de assinar `configuracao/geral` para gravar um zero. Por isso
  `pagarEntregas` não recebe as formas de pagamento, contra a letra da spec — o parâmetro só
  existiria para atravessar a função sem ser lido.
- **`arquivarTransacao` passou a pedir `TransacaoReversivel`**, e não `Transacao` inteira: quem
  reverte um acerto não leu o documento, reconstruiu-o. Nenhum chamador mudou, porque `Transacao`
  satisfaz o tipo menor.

`ENTREGA` também passa a ser escolhível no lançamento manual de `/financeiro`, o que é desejado:
a entrega avulsa, paga na hora, tem onde ser lançada. Ela ganhou `DICA_CATEGORIA` pelo mesmo
motivo de `TAXA_PAGAMENTO` (`#d24`) — sem a frase, o acerto da semana seria lançado à mão **e**
pelo painel, e o mês fecharia a menos duas vezes.

---

## D86 · A fornada é a unidade de tudo, e o campo é lotes

**Status:** vigente na primeira metade; a segunda ("o campo é lotes") **substituída por D93** ·
decidida em 2026-09-11 na spec 013, sessão 13A

**Contexto.** O sistema sabia o que entra na despensa e o que foi vendido, e não sabia o que
acontece entre os dois. Quanto saiu da despensa, quantos doces dá para vender, se um pedido
cabe e se precisa comprar eram quatro perguntas separadas, e nenhuma tinha resposta.

**Decisão.** Uma fornada é um lote da ficha, assado num dia — `contas/{contaId}/fornadas`, o
tipo `Fornada` e o módulo `domain/producao.ts`. É a unidade das quatro perguntas, e por isso um
módulo só. O campo que ela digita é **lotes**, e não unidades: o forno assa fornada, e pedir
unidades seria pedir que ela dividisse de cabeça o número que a receita já sabe.

**Consequência.** `Fornada.unidadesProduzidas` é `lotes × rendimento`, congelado, e em `un`
arredondado para baixo: o forno não assa 0,4 cookie, e arredondar para cima prometeria o que não
saiu da grade. A regra do kit de um nível saiu de dentro de `explodirDemanda` para
`insumosPorLote`, exportada, e a lista de compras e a fornada chamam a mesma função — se a regra
ficasse duplicada, a primeira mudança nela sairia errada em um dos dois. `insumosPorLote` devolve
`Map<string, LinhaDeDemanda>`, e não `Map<string, number>` como a spec escreveu: a fornada grava
`nomeSnapshot` por insumo, e um kit consome insumos que só as fichas de dentro conhecem pelo nome.

---

## D87 · A fornada é um fato datado, e não um saldo

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Contexto.** `#d56` decidiu que estoque é medição, porque o sistema não vê os movimentos da
despensa. Registrar a fornada não muda isso: ele continua não vendo o pacote aberto para provar
nem a fornada que ela esqueceu de registrar.

**Decisão.** A fornada **não escreve `Insumo.estoqueAtual`**. É um documento próprio, com data,
e o que a tela mostra é uma projeção: `disponível = medido − fornadas registradas depois daquela
contagem`, por insumo, em `consumoDesdeAContagem` e `disponivelParaProducao`.

**Consequência.** A medição fica intacta — nenhuma tela reescreve o número que ela contou.
Contar conserta tudo sozinho, porque a janela é "depois da contagem" e uma contagem nova exclui
as fornadas velhas sem que nada precise ser zerado: não existe contador para divergir do
registro. E é uma escrita por fornada, e não uma por insumo — dez `increment()` numa fornada de
dez ingredientes é a fila de escrita que o `#d80` ensinou a temer. A projeção é a **leitura**; a
contagem continua sendo a **verdade**. Nas telas ela é referência, e nunca semente (`#d59`).

A consulta traz só as fornadas dos últimos `IDADE_VENCE_DIAS`: contagem mais velha já vale "não
sei", e nenhuma fornada anterior a ela desconta nada. O preço é uma fornada com `pedidoId` mais
velha que trinta dias sair do abate do pedido, o que exigiria encomenda assada com mais de um mês
de antecedência.

**Nota (026, `D139`/`D140`):** a quebra segue a mesma régua. `Fornada.perdidas` também não
escreve estoque — o que quebrou sai da projeção do pote (`projecaoDoPronto`) e devolve promessa à
lista de compras (`produzidoParaPedidos`), nunca insumo à despensa. `consumoDesdeAContagem`
continua intacto: a farinha foi gasta, quebrando ou não.

---

## D88 · O que a fornada consumiu fica congelado dentro dela

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Decisão.** `Fornada.consumo` é `{ insumoId, nomeSnapshot, quantidade }[]`, gravado no ato, em
quantidade **física** — `quantidadeFisica(útil, perda)`, a mesma conta de `montarLista`.

**Consequência.** A ficha muda, e o que saiu da despensa em setembro não muda junto. É o mesmo
argumento de `ItemPedido.custoUnitarioSnapshot` (`#d08`); sem ele a projeção se reescreveria ao
editar uma receita. De carona, somar o consumo das fornadas não lê ficha nenhuma, e a fornada de
uma ficha arquivada continua descontando o que descontou. Física porque o que sai do armário é o
que sai do armário, e a perda faz parte dele — e porque a lista abate do lado físico, e subtrair
físico de útil somaria duas grandezas diferentes.

---

## D89 · O dia da contagem é opaco: `>`, e não `>=`

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Decisão.** Uma fornada do **mesmo dia** da contagem não é descontada. A janela é
`dataISO > estoqueContadoEmISO`, estritamente maior.

**Consequência.** É a regra que o `#d64` já toma do outro lado — "contagem de hoje não recebe
soma" —, agora valendo para os dois sentidos. O contra-exemplo prova por que não pode ser `>=`:
ela assa de manhã, conta à tarde e digita 800 g; com `>=` a tela mostraria 400 g logo depois, o
sistema contradizendo um número que ela acabou de digitar, que é o que o `#d17`, o `#d59` e o
`#d64` existem para impedir. O erro do `>` é oposto e barato: conta de manhã, assa à tarde, e por
um dia a despensa parece mais cheia do que está. Vence na contagem seguinte, e a linha diz quantas
fornadas entraram na conta para ela desconfiar sozinha.

---

## D90 · A fornada não é dinheiro

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Decisão.** Registrar produção não cria transação no caixa nem move a meta.

**Consequência.** O dinheiro saiu quando ela comprou o insumo, e a 6B já leva a nota para o
caixa. Lançar de novo na hora de assar contaria a mesma farinha duas vezes — e o `#d81` acabou de
mostrar o preço de um agregado que não fecha. `mutations/fornadas.ts` escreve um documento e
não importa nada de `agregado.ts`, `transacoes.ts` nem `metas.ts`.

---

## D91 · A fornada abate a demanda do pedido que ela assou, e `STATUS_NA_LISTA` não muda

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Contexto.** A lista comprava insumo para pedido já `PRONTO`. Passava despercebido porque nada
dizia que o insumo tinha saído; no dia em que a fornada é registrada, comprar de novo o que ela
acabou de gastar viraria dinheiro parado toda semana. A tentação era tirar `PRONTO` da lista.

**Decisão.** `Fornada.pedidoId`, opcional. `montarLista` ganha o quarto parâmetro
`ContextoDaProducao = { consumo, produzido }`, com default `SEM_PRODUCAO`, e a conta passa a ser
`física −= produzido[insumo]; disponível = max(0, medido − consumo[insumo]); comprar =
max(0, física − disponível)`. `STATUS_NA_LISTA` fica como está.

**Consequência.** Sem o abate o sistema erraria duas vezes na mesma direção: a fornada tira o
insumo da despensa **e** o pedido continua pedindo o mesmo insumo. Tirar `PRONTO` da lista
deixaria de comprar para quem marcou o status e não registrou nada, e deixar de comprar é o erro
caro (`#d63`); abater por fornada abate o que de fato aconteceu, aceita produção parcial de
graça, e **não muda nada para quem nunca registrar uma fornada** — o parâmetro opcional é a
prova, e os testes da 7B passam sem uma linha alterada. `LinhaDaLista` e `ItemListaCompras`
ganharam `quantidadeJaProduzida` e `consumoDeFornadas`, gravados pela mesma razão de
`estoqueAtual` já ser: a lista precisa saber o que entrou na conta dela. Em `ItemListaCompras`
são opcionais, porque lista gravada antes desta spec não os tem.

A fornada aberta de `/fichas/[id]` nasce **sem pedido**: amarrar exigiria carregar os pedidos
abertos daquela ficha, com índice novo que a spec não pediu. Quem amarra é o atalho de
`/pedidos/[id]`, que já sabe o pedido.

---

## D92 · A fornada não é o status do pedido

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13A

**Decisão.** `EM_PRODUCAO` e `PRONTO` continuam sendo onde o **pedido** está. A fornada é o que
saiu do **forno**, e existe sem pedido nenhum atrás. Registrar não muda status, e mudar status
não registra fornada.

**Consequência.** Ela assa para a feira de sábado e para a vitrine, não só para encomenda. O que
a tela do pedido ganha é um atalho que abre a folha já preenchida — a ficha de cada item, com a
quantidade que o pedido pede (`#d93`) — e um atalho não é um acoplamento.

---

## D93 · Fornada é a massa feita, e o campo é unidades

**Status:** vigente · substitui a segunda metade de D86 · decidida em 2026-09-11 na spec 013,
sessão 13A, por esclarecimento da dona do negócio

**Contexto.** A spec 013 foi escrita imaginando a fornada como o que sai do forno, e por isso
decidiu que o campo é lotes: "o forno não assa 0,6 de fornada". A operação real é outra: ela
mistura os ingredientes, **congela a massa**, e assa sob demanda. O insumo sai da despensa na
tigela, não no forno — e a massa se faz do tamanho que a despensa deixar.

**Decisão.** Fornada é a massa feita, datada no dia da massa. A folha pede **para quantas
unidades** ela fez massa, e a receita converte: `lotes = unidades / rendimento`, fracionário.
`Fornada.lotes` continua gravado, agora derivado; `unidadesProduzidas` é o que ela digitou (em
`un`, arredondado para baixo antes da conta). O atalho do pedido abre com a quantidade pedida
(12 cookies abrem com 12), e o da ficha com o rendimento de um lote. `lotesParaProduzir` saiu.

**Consequência.** A aritmética não muda: o que desconta a despensa continua sendo
`consumoPorLote × lotes`, a janela continua sendo o dia da contagem, e o abate do pedido
continua igual. O que muda é a pergunta que a folha faz — ela pode fazer menos do que a receita
rende porque o chocolate não dá para 25, e é exatamente essa decisão que o campo de unidades
deixa tomar sem dividir de cabeça. A cópia deixou de falar em forno: "Fiz a massa", "já virou
massa para o pedido", "foram para a massa desde a contagem". O nome `Fornada` fica, porque é a
palavra dela para a massa de um lote.

**O que isto muda para a 13D.** A massa congelada é um estoque intermediário de verdade — o
freezer guarda massa para N cookies, e "posso vender" passa a ser `massa congelada + fornadas
possíveis × rendimento − prometido`. A 13D deixa de ser "talvez não seja precisa" e passa a ser
a resposta a uma pergunta que a operação faz; a decisão continua sendo tomada depois da 13B,
como a spec manda, mas com este dado na mão.

---

## D94 · Capacidade sem contagem é "não sei", e o piso é o número dos contados

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13B

**Contexto.** A decisão 7 da spec 013 diz que a capacidade herda o "não sei" do `#d63` e não o
zero, e desenha três leituras: `MEDIDA`, `PISO` ("há insumo sem contagem, mas o gargalo não é um
deles") e `DESCONHECIDA` ("o gargalo é um insumo sem contagem"). Ela não diz como saber se um
insumo sem contagem é o gargalo — e sem número não há como saber. A única informação que sobra
de um insumo sem contagem que valha é o número vencido, que o `#d63` decidiu não usar.

**Decisão.** `capacidadeDaFicha` define o gargalo **entre os insumos contados**. `MEDIDA` é
todo insumo contado; `PISO` é o número que os contados dão, com os outros nomeados; `DESCONHECIDA`
é nenhum contado, e devolve `null` em `fornadas` e `unidades`. O número vencido não entra em
conta nenhuma, nem para classificar. Ficha arquivada, sem rendimento ou sem insumo devolve
`null`: não há pergunta.

**Consequência.** A tela nunca diz zero por falta de informação, que é o erro que a decisão 7
existe para impedir, e nunca diz um número que saiu de contagem velha. O preço é que "pelo menos
3" não é um piso matemático — a farinha sem contagem pode ter acabado — e a frase carrega o
nome do que falta contar exatamente por isso: é o que ela conta que decide, e o que ela nunca
contou é o que nunca faltou. Se a operação mostrar que a leitura `PISO` promete o que não dá,
a troca é uma linha: `PISO` vira `DESCONHECIDA` sempre que houver insumo sem contagem, e o
número dos contados passa a ser dito como teto.

`unidades` sai dos lotes fracionários (`lotes × rendimento`, com `floor` só em `un`), e não de
`fornadas × rendimento` como a spec escreveu: a spec é anterior ao `#d93`, e com a massa feita
do tamanho que quiser 3,33 lotes de uma receita de 20 são 66 cookies vendáveis.

---

## D95 · A capacidade desconta o prometido, e as três telas perguntam pelo mesmo hook

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13B

**Contexto.** Os pedidos abertos do horizonte já consomem fornadas. Uma capacidade que os
ignorasse mandaria ela prometer duas vezes a mesma farinha — em `/fichas` tanto quanto no editor
de pedido, porque as duas telas respondem à mesma cliente.

**Decisão.** `prometidoParaPedidos` traduz os pedidos do horizonte (`STATUS_NA_LISTA`, até
`HORIZONTE_MAXIMO` dias) em insumo físico, abate o que já virou massa para eles e entrega o mapa
que `capacidadeDaFicha` subtrai da projeção. O pedido que está sendo perguntado fica de fora do
prometido, e o que já virou massa **para ele** sai do que a linha pede: um pedido não desconta a
si mesmo. `useDespensaParaProduzir` é o hook que assina insumos, fornadas e pedidos do horizonte,
e `/compras`, `/fichas` e o editor de pedido o usam; `HORIZONTE_MAXIMO` mudou de arquivo por isso.

**Consequência.** `/fichas` passou a assinar pedidos e fornadas, e o editor de pedido passou a
assinar a despensa também em pedido novo — três leituras a mais, todas do cache, e nenhuma trava
a tela: a frase só aparece quando as três chegaram. Pedido atrasado (entrega antes de hoje e
ainda aberto) fica fora do prometido, como fica fora da lista de compras; é o mesmo recorte,
pelo mesmo motivo. O atalho "Contar a despensa" mora no cabeçalho de `/fichas`, e não em cada
linha: a linha inteira é um link para a ficha, e link dentro de link não existe.

---

## D96 · O piso é por ficha, entra na lista como demanda, e o cartão da tela Hoje vira a previsão

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13C

**Contexto.** A lista de compras só existia quando havia pedido confirmado, e o cartão da tela
Hoje só quando havia pedido nos próximos sete dias. A pergunta 4 da spec — "preciso comprar?" —
ficava sem resposta para o cookie que ela quer sempre poder fazer, pedido ou não. O pedido
original falava em "a quantidade mínima", no singular, e um número global seria errado para toda
ficha que não fosse a carro-chefe.

**Decisão.** `FichaTecnica.fornadasMinimas`, inteiro, padrão **0**, editado no bloco de rendimento
da ficha ("Fornadas de reserva"). `reservaDeProducao(fichas)` traduz o piso em demanda por insumo
— `Σ fornadasMinimas × insumosPorLote`, em unidade base e **sem perda** — e `ContextoDaProducao`
ganha o terceiro mapa, `piso`, opcional. `montarLista` soma a reserva à demanda dos pedidos
**antes** da perda, dá linha própria ao insumo que só a reserva pede, e grava a parte que é piso
em `LinhaDaLista.quantidadeDeReserva` (e em `ItemListaCompras`, opcional). O cartão da tela Hoje
passa a existir em qualquer das três: lista aberta com item por comprar, ficha abaixo do próprio
piso, ou pedido no horizonte sem lista montada — e diz "Faltam 4 itens · R$ 62,00" em vez de
"ver o que comprar".

**Consequência.** Piso zero não muda nada, e é por isso que o padrão é zero: piso ligado é a única
coisa nesta spec que faz a lista crescer sem pedido atrás, e crescer sozinha é o que faz parar de
confiar na lista. Quatro escolhas de execução ficam registradas:

- **A reserva entra útil, e não física como `consumoPorLote`.** Ela se soma a `necessária`, que é
  útil, e a perda divide uma vez só, do lado de lá. `quantidadeFisica` é linear, então
  `física(pedidos + piso)` é `física(pedidos) + física(piso)` — e é assim que a conta é feita,
  para que o abate da massa já feita (`#d91`) toque **só a parte dos pedidos**: massa a mais
  feita para um pedido não encolhe a reserva, e a reserva não é abatida por produção nenhuma.
  Ela desce pela projeção, quando a fornada de vitrine desconta a despensa — e é isso que faz o
  item voltar para a lista depois que ela faz a fornada de reserva.
- **O piso é um `Map<string, LinhaDeDemanda>`**, e não `Map<string, number>` como os dois mapas
  irmãos: o insumo que só a reserva pede e que sumiu do cadastro precisa virar pendência com
  nome, e o nome só existe na ficha. `ReservaDoInsumo` estende a linha com as fichas que pedem —
  "1 fornada de Cookie" — para a linha da lista dizer de onde veio; os nomes vêm das fichas
  vivas, pelo mesmo motivo de o tamanho do pacote vir do insumo vivo (3C).
- **"Abaixo do piso" é `fornadas < fornadasMinimas` sobre `capacidadeDaFicha`, e `DESCONHECIDA`
  fica de fora.** Não saber quantas dá não é estar abaixo, e alarmar por falta de informação é o
  erro que a decisão 7 (`#d94`) proíbe. A lista, por outro lado, compra o cheio para o insumo
  sem contagem (`#d63`) — então uma ficha com piso e um insumo nunca contado gera compra sem
  gerar alarme. É o mesmo par de erros de sempre, cada um do lado que custa menos.
- **O cartão calcula a lista que seria montada quando não há lista.** Sem isso "Faltam N itens"
  só existiria depois de ela abrir `/compras` e montar, e a previsão não seria previsão. O
  cartão passou a assinar fichas, insumos, fornadas e a lista aberta, todas do cache; o horizonte
  continua sendo os sete dias da agenda. "Montar a lista" em `/compras` deixou de exigir pedido:
  basta a montagem ter linha.

`/compras` continua fora da navegação inferior. Se a operação disser que o cartão não basta, a
troca é uma linha em `navegacao.ts`, e o que sai é `/insumos`.

**Revisão em 2026-09-16, spec `020-menos-na-frente`.** O piso continua morando no editor da
ficha, mas o campo "Fornadas de reserva" saiu do bloco visível e passou para trás de "Mais
detalhes" (`#d116`): nasce em zero, e a dobra abre sozinha quando o piso está ligado. Nada do
que esta decisão registra muda — o campo é o mesmo, `reservaDeProducao` é o mesmo —, só o
lugar em que ela pede o número.

---

## D97 · O que está pronto é contagem, a fornada propõe, e o pedido tem dono nos prontos

**Status:** vigente · decidida em 2026-09-11 na spec 013, sessão 13D

**Contexto.** A 13B responde quantas fornadas dá; faltava "quantas já estão feitas". A spec
deixou a 13D reservada para depois de duas ou três semanas de 13B em uso, e o `#d93` mudou o
peso da pergunta: a massa congelada é um estoque intermediário de verdade, e "posso vender"
passa por ela. A sessão rodou por decisão de quem conduz o projeto, antes do prazo da spec.

**Decisão.** `FichaTecnica.estoqueProntoAtual` e `estoqueProntoContadoEmISO`, os dois campos
que a spec reservou: uma medição com data, na unidade de rendimento, e não um saldo. É a 007
um nível acima e reusa o que ela tem: `contagemDoPronto` é `contagemDoInsumo` sobre os dois
campos, `projecaoDoPronto` é o `#d87` de cabeça para baixo (`contado + massa feita depois da
contagem`, com a janela `>` do `#d89`), a tela `/fichas/contagem` é a irmã de
`/insumos/contagem` e grava pelo mesmo `writeBatch`, e o rodapé é o mesmo componente. **A
fornada não escreve o pote**: depois de registrar, a folha fica aberta e oferece "Contar o que
está pronto", que abre a irmã com o campo daquela ficha semeado por `sugestaoDaContagem`
(`#d64` de novo, com a massa no lugar da nota). A resposta completa é a da spec —
`prontos + despensa − prometido` — e ela é dita em `/fichas` ("13 unidades prontas · contada
há 2 dias", acima de "dá para 3 fornadas") e na linha do pedido ("Dá: 13 unidades prontas, e a
despensa faz mais 41 hoje").

**Consequência.** Quatro escolhas ficam registradas porque um leitor futuro vai questioná-las:

- **A massa feita para um pedido aberto tem dono nos prontos.** A capacidade da 13B já tira da
  despensa só o que **falta** fazer para cada pedido (`prometidoParaPedidos` abate o produzido).
  Se os prontos entrassem inteiros, a mesma massa seria vendida duas vezes: uma no pote, outra
  na despensa que o pedido deixou de pedir. `reservadoNoPronto` devolve `min(pedido, feito)`
  por ficha, e `prontosLivres` é a projeção menos isso — e com esse abate `livres + capacidade`
  fecha exatamente em `prontos + despensa − prometido`, com ou sem massa feita, e degrada para
  a 13B quando o pote nunca foi contado (o teste "a resposta completa fecha" é a prova). Na
  linha do pedido, o que é **deste** pedido a frase tira sozinha (`min(unidades, jaFeitas)`),
  porque o contexto exclui o pedido perguntado do reservado como já excluía do prometido.
- **A projeção do pronto soma fornadas, e não desconta vendas.** O sistema não vê o cookie sair
  do pote — a entrega não baixa unidade nenhuma —, então o pote projetado erra para cima até a
  contagem seguinte, exatamente como a despensa erra para cima quando ela não registra a
  fornada. A contagem continua sendo a verdade, e a linha diz "contada há N dias" para ela
  desconfiar. Sem contagem que valha, `prontos` é `null` e a frase some: "não sei" não é zero.
- **A fornada semeia, e a projeção não.** A massa registrada é um fato exato que ela acabou de
  digitar ("fiz massa para 25"), como a nota é um pacote na mão; a projeção é número herdado
  com conta em cima (`#d59`). A semente é a fornada recém-registrada, viaja por
  `sementeDoPronto.ts` (estado de módulo, morre no recarregamento) e vale só para aquela
  ficha, com o recorte "Só esta receita" ao lado de "Todas".
- **O reservado é agregado por ficha, como o prometido é por insumo.** Massa de uma ficha de
  dentro feita para um pedido de kit não é reconhecida como do pedido; está marcado com
  `ponytail:` em `reservadoNoPronto`, e o conserto é explodir o kit no abate se a operação
  pedir.

**Kit não tem pote.** `temPronto` deixa o kit fora da contagem, da frase e da irmã: um combo é
o agregado das receitas de dentro, e contar a caixa montada contaria os mesmos cookies duas
vezes. A capacidade da 13B continua respondendo por ele. Isto também é o primeiro sinal de que o
kit, como está — componentes fixos —, não é o combo que a operação vende (a cliente escolhe os
sabores, o preço é fixo); esse é assunto de spec própria, e não desta.

A rota `/fichas/contagem` é a única rota nova da spec 013: a spec dizia "nenhuma rota nasce"
para as quatro sessões planejadas, e a 13D estava reservada. A irmã da contagem é uma tela
inteira (uma linha por ficha) pelo mesmo argumento do `#d50`, e a entrada dela mora em
`/fichas` e na tela da ficha, porque o pronto é atributo do produto como a capacidade. A
reserva de produção (`#d96`) **não** olha o pote: "sempre poder fazer uma fornada" é sobre a
despensa, e cookie pronto não é farinha.

## D98 · Os dados para pagar moram na forma de pagamento, e não no código

**Status:** vigente · decidida em 2026-09-11, fora de spec (pedido direto de quem conduz o projeto)

**Contexto.** O resumo do WhatsApp (`#d77` a `#d79`) diz "Pagamento: Pix" e para aí: a
cliente pergunta a chave na mensagem seguinte, e a Maynara digita o beneficiário, o banco e
o celular de novo, toda vez. O pedido veio com os dados dela para gravar no texto.

**Decisão.** `FormaPagamento.instrucoes?: string`, texto livre digitado em `/configuracao`
("Dados para pagar"), e não uma constante no código nem um bloco `dadosPix` separado. O
resumo o inclui em parágrafo próprio, entre o combinado e a despedida, **só enquanto o pedido
não está pago**. Vazio é ausência: a chave não vai ao documento em branco.

**Consequência.** Não existe `tipo === "PIX"` em lugar nenhum: ela preenche no Pix (e na
transferência, se quiser) e deixa vazio no dinheiro e no cartão, e é isso que faz o bloco
aparecer ou não. Dado bancário pessoal fica fora do repositório, o que importa quando o
projeto virar SaaS (`#d01`). Campo opcional, compatível com documento antigo. A conta real
precisa abrir a forma "Pix" em `/configuracao` e preencher uma vez.

---

## D99 · O combo é o kit com escolhas, e não um tipo novo

**Status:** vigente · decidida em 2026-09-11 na spec 014, sessão 14A

**Contexto.** O "combo dupla" tem preço fixo e a cliente escolhe os dois sabores. O kit
(`#d11`) só sabia conteúdo fixo, e o contorno era lançar os cookies soltos com um desconto
que não era desconto: o combo nunca existia como produto, `Pedido.desconto` carregava dois
significados, e a ficha do combo não tinha como ser precificada.

**Decisão.** `FichaTecnica.escolhas?: EscolhaDoKit[]` — `{ quantidade, categoria }` — ao
lado de `componentes[]`, só em `KIT`. Um kit pode ter as duas coisas. **A escolha é por
categoria**, e não por lista de fichas: `FichaTecnica.categoria` já agrupa a lista e o
relatório, "qualquer cookie" é a frase dela, e um sabor novo entra no combo no dia em que
nasce. `opcoesDaEscolha` é `podeSerComponente` com a categoria por cima: viva, `SIMPLES`,
da categoria, nunca o próprio kit. `temEscolhas(ficha)` é a forma executável.

**Consequência.** Um terceiro `tipo` duplicaria tudo o que o kit já tem para trocar um campo.
O preço é que categoria é texto livre: renomear "Cookie" para "Cookies" numa receita a tira
de todo combo em silêncio — a ficha do combo diz quantas receitas servem e quais, e a linha
do pedido diz "nenhuma receita serve" com ícone e bloqueia. Visível, não silencioso. Se a
operação mostrar que ela renomeia categoria e perde combo, a troca é `fichaIds[]` explícito
por escolha e o seletor. A spec numerou estas decisões `#d98` a `#d102`; o `#d98` já
existia (dados para pagar), então elas são `#d99` a `#d103`.

---

## D100 · O preço do combo é fixo, e o custo é congelado na escolha

**Status:** vigente · decidida em 2026-09-11 na spec 014, sessão 14A

**Decisão.** `ItemPedido.escolhas?: EscolhaFeita[]` — `{ fichaTecnicaId, nomeSnapshot,
quantidade, custoUnitarioSnapshot }`, por unidade do kit. A linha do pedido continua sendo
**uma** linha com o `fichaTecnicaId` e o `precoUnitario` do combo; o que muda é o que
`custoUnitarioSnapshot` significa nela: o **custo do combo montado**, `custoDoComboMontado`
= base do kit (`custoUnitario − custoEscolhas`) mais a soma das escolhas, congelado quando
ela fecha a escolha. `escolhasCompletas` bloqueia o salvamento com escolha incompleta, na
linha. O mesmo kit com escolhas pode entrar em duas linhas (escolhas diferentes); para
toda ficha sem escolha a regra de uma linha por ficha continua.

**Consequência.** É a decisão que mantém a spec pequena: `derivarPedido`, `subtotalDoItem`,
`custoDoItem`, `deltaDoPedido`, `agregarPedidos`, `marcarPedidoPago` e `recalcularMes` não
mudaram uma linha — para eles um combo é um item com preço e custo, como sempre foi. Três
escolhas de execução ficam registradas:

- **A base congela junto.** Ao reabrir um pedido, o par que dá a base é
  `custoUnitarioSnapshot` e a soma das escolhas gravadas, e não a ficha de hoje: trocar um
  sabor num pedido antigo mexe só na parcela trocada. "Usar o preço de hoje" (`#d32`)
  refaz base e escolhas pelo custo de hoje, porque preço e custo andam juntos.
- **`Pedido.fichaIds` espelha também as fichas escolhidas.** O espelho existe para
  `array-contains`, e um pedido de combo com nutella contém nutella.
- **`esquemaPedido` valida só a forma das escolhas.** Se elas fecham o que o kit pede é
  pergunta para a ficha, que o esquema não tem; quem responde é `escolhasCompletas`, no
  salvamento, e a mensagem cai em `errosItens` como qualquer falha de linha.

---

## D101 · O custo de referência do combo é o da opção mais cara

**Status:** vigente · decidida em 2026-09-11 na spec 014, sessão 14A

**Decisão.** `FichaTecnica.custoEscolhas?: Centavos` grava a parcela das escolhas, pela
opção mais cara de cada uma (`custoDasEscolhas().referencia`), e `calcularCustoFicha` a
soma em `custoTotalLote` como soma `custoComponentes`. O bloco "O custo do lote" diz a
faixa — "custa de R$ 4,90 a R$ 6,70 conforme a escolha" — e avisa, com ícone, a categoria
sem receita viva, cuja parcela sai zerada e não `Infinity`.

**Consequência.** O preço é fixo: um preço que fecha a margem na combinação mais cara fecha
em todas, e uma média prometeria uma margem que metade dos combos não entrega. É também
por este campo que o `#d100` sabe a base do kit sem refazer a conta da ficha dentro do
editor de pedido. `custoDoComboMontado` assume kit com rendimento 1, que é o que o tipo
promete; com rendimento maior a base sairia menor do que é, e uma guarda só impede o
negativo — está marcado com `ponytail:`. O kit com escolhas e custo desatualizado continua
sendo a dívida que já existia: nada marca um kit quando o custo de uma receita de dentro
muda, e com escolha por categoria o vínculo nem é por id. Salvar o combo refaz o custo com
o de hoje.

---

## D102 · O combo é o produto vendido; os sabores de dentro não entram no ranking

**Status:** vigente · decidida em 2026-09-11 na spec 014, sessão 14A

**Decisão.** `ResumoMensal.produtos` ganha a linha do combo e **não** ganha os cookies de
dentro; `qtdItensVendidos` conta o combo como um item. Nada mudou em `caixa.ts` para isso
acontecer: é o efeito do `#d100`.

**Consequência.** O ranking é de faturamento, e o sabor dentro de um combo não fatura nada
sozinho — uma linha "Cookie de nutella · 3 un · R$ 0,00" seria a resposta certa para uma
pergunta que ninguém fez. O que se perde é "qual sabor sai mais dentro dos combos", que é
pergunta de produção e nasce com o histórico de produção como relatório, que a 013 deixou
fora de propósito. Pedidos antigos lançados como cookies soltos + desconto **não** são
convertidos: o caixa deles está certo, e reescrever pedido pago é o que `#d24` ensina a
não fazer.

---

## D103 · A demanda e a produção seguem o que foi escolhido

**Status:** vigente nas duas metades · a demanda decidida em 2026-09-11 na spec 014,
sessão 14A; a produção na 14B, no mesmo dia

**Decisão.** `explodirDemanda` explode `escolhas[]` junto dos componentes fixos: cada escolha
entra pelos `itens` da receita escolhida, em `quantidade × pedida ÷ rendimento`, um nível
só — a receita escolhida é `SIMPLES` por construção, então são os itens dela e nada abaixo.
Receita escolhida arquivada ou sem rendimento vira pendência com o `nomeSnapshot` da
escolha, como um componente fixo já vira.

**Consequência.** Sem isto a lista compraria só o saquinho do combo, e deixar de comprar é o
erro caro (`#d63`). É a única mudança de comportamento em dado já gravado, e o efeito é nulo
enquanto nenhum item tiver `escolhas`: os testes da 3C, da 7B e da 013 passaram sem uma
linha alterada. Tudo o que já lê `explodirDemanda` herda de graça — `montarLista`,
`prometidoParaPedidos` e a capacidade da 13B.

**A produção (14B).** O combo não produz por si: `comboAEscolha(ficha)` é a forma
executável, e `capacidadeDaFicha` devolve `null` para ele — "dá para quantos combos" depende
de qual cookie, e um "dá para 200" sobre o saquinho seria mentira com cara de resposta.
`reservaDeProducao` o pula (reservar "1 combo" não diz de que sabor; a reserva é das
receitas, e "Fornadas de reserva" já sumia do formulário na 14A), e `fichasAbaixoDoPiso`
herda o `null`. A resposta mora na linha de cada receita escolhida: no editor de pedido, a
linha do combo faz uma pergunta por receita — `FraseCabeNoPedido` com o nome dela,
`unidades = escolha.quantidade × quantidade da linha`, `jaFeitas` e `prontos` daquela
receita —, "Registrar fornada" oferece as receitas escolhidas com essas unidades, e
`reservadoNoPronto` conta cada escolha como unidades pedidas da receita escolhida, que é o
`ponytail:` da 13D pago para as escolhas. Três escolhas de execução ficam registradas:

- **As opções de fornada somam por ficha.** A mesma receita pode vir solta e dentro de um
  combo, ou em dois combos; `PainelFornada` acha a opção por `ficha.id`, e duas com o mesmo
  id deixariam a segunda inalcançável. Somar é o que a massa é: 3 do combo mais 5 soltos
  são massa para 8.
- **`jaFeitas` e `prontos` continuam por ficha, e cada linha vê o total.** Antes da 14A uma
  ficha aparecia numa linha só; agora "tradicional solto" e "tradicional no combo" no mesmo
  pedido leem a mesma massa feita. Marcado com `ponytail:` em `FormularioPedido`; se
  confundir, o abate passa a ser por linha, na ordem.
- **O componente fixo de um kit continua agregado pela ficha do kit** em `reservadoNoPronto`.
  A 14B pagou as escolhas, que era o que a spec pediu; o `ponytail:` ficou, estreitado, para
  a caixa de conteúdo fixo, e o conserto é o mesmo laço sobre `componentes`.

`/fichas` não precisou de uma linha: `LinhaFicha` já escondia capacidade `null`, e o pronto
do kit já era `null` (`#d97`). O combo aparece lá com custo, rendimento e o selo "Kit", e
nada mais.

---

## D104 · Toda mutação despacha; quem espera está nomeado

**Status:** vigente · decidida em 2026-09-12, na spec 015

**Contexto.** A `#d80` tirou o `await` das mutações do caixa e deixou cinco de fora —
`insumos.ts`, `fichas.ts`, `listasCompra.ts`, `metas.ts` e `configuracao.ts` — com o argumento
de que nelas o preço de uma promessa pendente era um botão preso, e não um número perdido. A
varredura da 015 mostrou que o argumento valia para três e **não valia para duas**:

- **`atualizarInsumo`** esperava o `updateDoc` do preço e só depois chamava
  `marcarFichasDesatualizadas`. Sem rede, a execução parava na primeira linha, e o selo de
  "custo desatualizado" das fichas que usam o insumo **nunca era gravado** — nem quando a rede
  voltava, porque a fila do IndexedDB sobe escrita despachada, e não continuação de `async`.
  É exatamente o que `#d05` existe para impedir, e o caminho é o da gôndola (`#d40`), que é
  onde o preço muda sem sinal.
- **`salvarMeta`** esperava a meta e só depois escrevia o espelho em `agregados/{mês}.meta`,
  que é o que o cartão da tela Hoje lê (`#d09`, `#d29`). Sem rede, a meta ficava gravada e o
  espelho não existia até a próxima venda do mês reescrevê-lo.

**Decisão.** A regra da `#d80` deixa de ser "as mutações que mantêm o agregado" e passa a ser
**`src/lib/firebase/mutations/` inteiro**: nenhuma escrita do Firestore é esperada dentro de
uma mutação. Todas são despachadas por `despachar()`, na ordem, e a função retorna. A promessa
que a tela recebe resolve no toque. As exceções são duas, as duas com o motivo escrito no
lugar, e as duas listadas no comentário de `despachar.ts`, que é o único lugar que precisa
conhecê-las:

- **`recalcularMes`** (`agregado.ts`) — a rede de segurança, que faz duas consultas antes de
  escrever, exige rede e diz isso na tela (`#d80`).
- **`importarNota`** (`notas.ts`) — a tela já exigiu rede para ler a nota (`#d50`), e a etapa
  "pronto" precisa do lote concluído para contar quantos nasceram e quantas fichas envelheceram.

Uma terceira exceção sem comentário dizendo por que espera é regressão.

**O que mudou de forma.** `addDoc` virou `doc(col)` + `setDoc` em `criarInsumo`, `criarFicha` e
`criarListaCompras`, com o id gerado no aparelho — o mesmo conserto da `#d80`, e o mesmo
mecanismo que `addDoc` usa por dentro. O corpo gravado é campo a campo o de antes.
`podarHistorico` e `marcarFichasDesatualizadas` continuam `async` e continuam lendo antes de
escrever (`getDoc`, `getDocs`), só que a escrita delas é despachada, e `atualizarInsumo` as
chama **no mesmo tique** do `updateDoc`, sem `await` entre eles. Sem rede a leitura serve do
cache: acha as fichas que este aparelho já abriu, o que é estritamente melhor do que antes
(nenhuma) e basta para um aparelho que abre `/fichas` toda semana. Se um dia doer, o conserto
é a tela passar os `fichaIds` que já tem na mão, e não uma segunda consulta.

**`estoque.ts` entrou de carona**, sem mudar comportamento: os dois laços de lote esperavam
cada `commit()`, a tela já não esperava a função (`#d62`), e uma despensa não passa de 400
linhas. Trocar por `despachar(lote.commit())` tirou a última exceção não comentada do
diretório — e o critério de aceite da spec é um `grep`.

**O `await` que sobrou em `transacoes.ts` e `pedidos.ts` não é escrita.** São chamadas a
`aplicarNoAgregado`, `gravarTransacao` e primas, que já despacham por dentro e resolvem no
mesmo tique. A regra é sobre escrita esperada, e ali nenhuma é; ficaram como a `#d80` deixou.

**Nenhuma tela mudou.** `FormularioInsumo`, `FormularioFicha`, `FormularioMeta` e
`TelaConfiguracao` seguem com `await` e `setSalvando`: o `catch` ainda cobre a rejeição de
verdade — validação, documento sumido —, e o `setSalvando` ainda cobre o instante entre o toque
e o cache aplicar. Tirá-lo tornaria esta spec uma spec de tela.

**Consequência, a mesma pela quarta vez** (`#d40`, `#d62`, `#d80`). Uma escrita recusada pelas
regras falha calada, no console, numa tela que ela já deixou. As regras são as de sempre —
`contas/{contaId}/{documento=**}` para quem tem a claim — e a 5B as viu funcionar. A defesa
continua sendo o `SeloSincronizacao`. E duas escritas despachadas em sequência não são
atômicas — nunca foram, nem com `await`: `salvarMeta` grava a meta e o espelho como duas
operações, e se a segunda for recusada a primeira fica. É o estado de antes com rede; offline,
antes, a segunda simplesmente não existia.

---

## D105 · Toda consulta tem um recorte; lista que cresce com o tempo tem janela, lista que cresce com o negócio tem arquivo

**Status:** vigente · decidida em 2026-09-12, na spec 016

**Contexto.** Toda lista do sistema é um `onSnapshot` sobre uma consulta, e o cache do
Firestore guarda o resultado inteiro no aparelho — é o que faz o app abrir sem rede, e não
muda. O que precisava de resposta era outra pergunta: **o que limita o tamanho de cada
consulta?** A varredura da 016 respondeu para todas, e só uma assinava "tudo": `/pedidos`
carregava todo pedido não arquivado, e a agenda de 2026 ia carregar o Natal de 2027 junto com o
de 2026. Não quebrava amanhã — mil pedidos são um ou dois megabytes num cache de 40 MB —, mas
era a única consulta cujo tamanho era "tudo o que já aconteceu", baixado inteiro a cada
aparelho novo.

| Quem lê                                                            | Coleção                 | Recorte                        | Cresce com                    |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------ | ----------------------------- |
| `/pedidos` (`ListaPedidos`)                                        | `pedidos`               | **status mais `limit`** (esta) | o tempo, um por venda         |
| Tela Hoje (`AgendaHoje`)                                           | `pedidos`               | `>= hoje`, `limit(12)`         | —                             |
| `useDespensaParaProduzir` (`/compras`, `/fichas`, editor)          | `pedidos`               | `hoje` … `hoje + 30 dias`      | —                             |
| `/financeiro` (`TelaFinanceiro`)                                   | `transacoes`            | `competencia == mês`           | o tempo, mas o mês é a página |
| "Recalcular o mês" (`recalcularMes`)                               | `transacoes`, `pedidos` | do mês, `getDocs`              | —                             |
| `consultaFornadas` (insumos, fichas, contagens, compras)           | `fornadas`              | últimos 30 dias                | —                             |
| `consultaListaAtual` (`/compras`, tela Hoje)                       | `listasCompra`          | `limit(1)`                     | —                             |
| `useComeco` (tela Hoje, `/comecar`)                                | quatro coleções         | `limit(1)` em cada             | —                             |
| `/insumos`, `/insumos/contagem`, `/compras`, editor de ficha, nota | `insumos`               | `arquivado == false`           | **o catálogo**, não o tempo   |
| `/fichas`, `/fichas/contagem`, editor de pedido, meta, compras     | `fichas`                | `arquivado == false`           | o catálogo                    |
| Editor de pedido (`BuscaItem` de cliente)                          | `clientes`              | `arquivado == false`           | o tempo, devagar              |
| Agregados, metas, configuração, conta                              | documentos              | lidos pelo id                  | —                             |

**Decisão.** Nenhuma consulta do sistema assina "tudo". Cada uma se limita por **um** destes,
e o comentário dela diz qual:

- **pelo id** — agregados, metas, configuração, conta;
- **por `limit`** — a tela Hoje, a lista de compras atual, os cinco passos do começo;
- **por janela de tempo** — as fornadas (30 dias), os pedidos do horizonte de compras (30 dias);
- **por competência** — o caixa, um mês por tela;
- **pelo arquivo** — os catálogos, `insumos`, `fichas` e `clientes`, cujo tamanho é o do
  negócio e não o do calendário.

`/pedidos` passa a se limitar por **status mais `limit`**, em três consultas que moram em
`mutations/pedidos.ts` ao lado das mutações, como `consultaFornadas` e
`consultaTransacoesDoMes`: quem conhece a forma da consulta conhece o índice que ela pede.

- **`consultaAgenda`** — `arquivado == false`, `status in STATUS_NA_AGENDA`, por
  `dataEntregaISO`. A agenda inteira, de qualquer data, **sem teto**: ela é finita por
  natureza, porque ela fecha os pedidos. Cem orçamentos abertos que ela nunca cancelou
  continuam carregando, de propósito: um orçamento aberto é uma pergunta em aberto, e a
  resposta do sistema é "Passou da data", não "sumiu".
- **`consultaHistorico`** — `arquivado == false`, `status in status`, por `dataEntregaISO`
  **desc**, `limit(n)`. O que já saiu, dos mais recentes para trás, em páginas de trinta. O
  mecanismo de página é **`limit(n)` com `n` crescendo** — não cursor, não `startAfter`, não
  lista de assinaturas. Uma assinatura só, refeita com um limite maior a cada "Mostrar mais
  antigos"; o cache já tem as primeiras `n` e o servidor manda o resto. É o mecanismo mais
  burro que existe, e é o que cabe numa tela que ela abre para ver o que assa hoje, não para
  auditar 2024. O filtro de status vai para a consulta, e não só para a memória: "Entregues"
  na pílula são páginas de trinta entregues, e não trinta concluídos com os entregues
  pescados de dentro.
- **`consultaEntreguesEmAberto`** — `arquivado == false`, `status == "ENTREGUE"`,
  `pago == false`, **sem `orderBy`**: só igualdades, e o Firestore junta os índices de campo
  único sozinho. É o que faz a faixa "A receber" continuar exata com o histórico em páginas:
  ela soma `agenda ∪ entreguesEmAberto`, dois conjuntos que não se cruzam e são completos.
  Paginar a consulta única como estava faria as duas faixas somarem só a primeira página, e o
  `#d36` existe justamente para o painel não mentir por omissão.

O índice novo é `arquivado + status + dataEntregaISO`, em **duas entradas**, `ASC` para a
agenda e `DESC` para o histórico. A spec apostou numa só, com o Firestore percorrendo o
composto ao contrário para o `desc`; com `in` sobre `status` ele não faz isso, e o histórico
pediu a segunda entrada — vista na tela como "Não deu para carregar seus pedidos" com as duas
faixas preenchidas, e confirmada rodando as três consultas com o Admin SDK. Os dois índices
de `pedidos` que existiam ficam.

**O fim da lista só se sabe com o servidor.** O botão "Mostrar mais antigos" some quando
`dados.length < limite` **e** o snapshot não veio do cache. Do cache, ele fica: sem rede a lista
pode estar mais curta que o servidor, e esconder o botão seria dizer "acabou" sem saber. O
`SeloSincronizacao` já diz que está sem conexão; nenhuma frase nova.

**Insumos e fichas não paginam, e é decisão e não omissão.** São catálogo: o que os limita não
é uma janela, é `arquivado` — a farinha que ela parou de usar sai da lista e fica no histórico
das fichas antigas (`#d05`). Uma confeitaria artesanal vive com dezenas de insumos e dezenas de
fichas; com quinhentos vivos ela seria outro negócio. E toda tela que os lê precisa do
**conjunto inteiro**: a contagem é da despensa toda, `montarLista` explode todo pedido sobre
todo insumo, o editor de ficha busca por toque em memória. Página de insumo é um conceito que
não existe na cozinha. **A paginação deles é o arquivo, e ela já existe.** `clientes` é o caso
do meio — cresce com o tempo, mas cada documento é pequeno e a busca é por trecho do nome em
memória. Quando doer (mil clientes, ou o editor de pedido demorando para abrir num aparelho
novo), o conserto é busca por prefixo em `nomeBusca` com `limit(10)` sobre o índice que já
está publicado — mas isso troca "trecho do nome" por "começo do nome", e é decisão de tela.

**Consequência.** Três assinaturas em `/pedidos` onde havia uma; o Firestore multiplexa tudo
num canal só, e a tela de fichas já assina três. A agenda e os entregues em aberto são pequenos
por natureza; o histórico é o único que pesa, e é o que ganhou o `limit`. Quatro escolhas
ficam registradas porque são fáceis de rejeitar:

- **Uma entrega paga pela cliente, nunca acertada com o entregador, e mais antiga que as
  páginas carregadas some da faixa "Entregas a pagar".** `consultaEntreguesEmAberto` cobre o
  entregue **não pago**, porque `pago` é campo gravado; "acerto ausente" é a ausência de
  `entrega.repasseTransacaoId`, e o Firestore não consulta ausência. Antes esse pedido ficava
  na faixa para sempre; agora fica até cair da última página aberta. O acerto é semanal
  (`#d83`), então a janela para esquecer é de meses. Se for inaceitável, o conserto é um
  booleano derivado, `entrega.repassePendente`, gravado por `mudarStatusPedido`, `pagarEntregas`,
  `desfazerRepasse` e `atualizarPedido`, com backfill — aprovação de schema e uma sessão a
  mais. Está na tabela de dívidas.
- **A faixa "Entregas a pagar" soma os três conjuntos**, `agenda ∪ entreguesEmAberto ∪
historico` por id, e não só os dois últimos que a spec nomeou: `entregasEsquecidas` (`#d83`)
  lê os pedidos abertos com a data vencida, e eles moram na agenda. Sem ela, a frase "entregas
  que você esqueceu de marcar" zeraria em silêncio.
- **`in` sobre `status`, e não um campo `concluido` gravado.** O campo seria o desenho do
  `#d04`, mas custaria escrever em seis mutações e reescrever cada pedido existente. `in` usa
  o mesmo índice que `==`, aceita até trinta valores, e nós usamos quatro e dois. Se um dia
  houver um sétimo status, o teste da partição em `pedido.test.ts` avisa: `STATUS_NA_AGENDA`
  mais `STATUS_CONCLUIDOS` têm que ser exatamente as chaves de `ROTULO_STATUS_PEDIDO`.
- **O histórico ordena por data de entrega, e não por data de conclusão.** Não existe
  `concluidoEm`; `atualizadoEm` muda quando ela corrige uma observação. A data de entrega é a
  que ela lembra ("o Natal", "a festa da Júlia"), e é o índice que já existe.

O que ficou de fora, e por quê: contagem total do histórico (`getCountFromServer` exige rede e
o número não decide nada), rolagem infinita (um botão é acessível e não dispara sem querer),
cursor e várias assinaturas (é o que se faz quando `limit` crescente custa caro, e aqui cada
"mais antigos" relê trinta documentos do cache), arquivar em lote (a paginação é o que tira a
pressão de arquivar) e diminuir o cache (40 MB é o padrão, e este registro é o que impede de
chegar lá).

---

## D106 · O PDF é o navegador imprimindo uma rota, e não uma biblioteca

**Status:** vigente · decidida em 2026-09-15, na spec 017, sessão 17A

**Contexto.** Uma empresa pediu orçamento, e "R$ 10,00 o Tradicional, 50 unidades" no WhatsApp
não passa pelo setor de compras de ninguém: a pessoa do outro lado precisa de um documento com
o nome da empresa, o que está incluído, quanto custa, até quando vale e quem assina. É a
primeira coisa que o projeto produz para alguém ler **sem** a Maynara junto.

**Decisão.** `/pedidos/[id]/orcamento` é uma página com `@page { size: A4; margin: 0 }` e
CSS de impressão, e "Salvar em PDF" é `window.print()`. No desktop, Ctrl+P e "Salvar como
PDF"; no Android, Compartilhar → Imprimir; no iPhone, Compartilhar → Opções → PDF. O PDF é
vetorial, com a Fraunces e a Figtree embutidas, no mesmo motor que desenha o app. A folha é
HTML, e HTML é o que este projeto sabe fazer bonito.

**Consequência.** Nenhuma dependência de produção (`@react-pdf/renderer` e `jspdf` seriam
uma segunda linguagem de layout, sem `oklch`, com a marca reconstruída à mão) e nenhum
servidor (Chromium headless seria a única rota do sistema a exigir rede para o que o aparelho
já sabe fazer). **A folha funciona sem rede**: pedido, fichas e configuração estão no cache, e
salvar o arquivo é ação do aparelho. O custo aceito é que o caminho até o PDF depende do
sistema operacional, e no iPhone ele é longo; o roteiro de aparelho da spec confere os três.
Se doer de verdade, o conserto é uma rota de servidor que devolve o PDF pronto, e a folha
continua sendo a mesma página.

O shell some na impressão com `print:hidden` na barra lateral e na navegação inferior, e o
`main` perde largura máxima e respiro. A classe `.folha` redeclara os tokens claros e fixa
`color-scheme: light`: papel não tem modo noturno, e a prévia precisa ser o que vai sair.
`ponytail:` a folha é a página inteira em modo impressão. Se um dia houver uma segunda coisa
para imprimir (a ficha, o recibo), o que nasce é um layout de impressão, e não uma segunda
solução.

---

## D107 · A folha lê o documento gravado, e não o formulário

**Status:** vigente · decidida em 2026-09-15, na spec 017, sessão 17A

**Contexto.** É o contrário do `#d78`, e por um motivo que o `#d78` já previa. O resumo do
WhatsApp mora dentro do editor e monta o texto do que está na tela, porque a alternativa
mandaria para a cliente um número que ninguém está vendo. A folha é **outra rota**, sem tela
de edição ao lado: o que ela pode ler é o que está no Firestore.

**Decisão.** `montarOrcamento` recebe o `Pedido` gravado, as fichas vivas, a conta e a
configuração, e a folha desenha isso. O bloco do editor diz em uma linha: "A folha mostra o
que está salvo. Salve o pedido antes de abrir." É aviso, e não trava: o formulário não sabe
se está sujo, e ensinar isso a ele é a dívida de "sair sem salvar" que já está na tabela.

**Consequência.** O resumo confirma uma conversa; a folha é o que a empresa assina. Um
documento assinado dizendo um total diferente do que o sistema gravou é o defeito que a 010
consertou, de volta com carimbo. Dois blocos vizinhos com duas regras é o custo, e ele está
dito no comentário de cada um. Se incomodar, o conserto é o do `#d78`: o link salva antes de
abrir.

---

## D108 · A foto e a descrição vêm da ficha viva; o preço, do pedido

**Status:** vigente · decidida em 2026-09-15, na spec 017, sessão 17A (os campos nascem na 17B)

**Contexto.** `ItemPedido` congela `nomeSnapshot`, `precoUnitario` e `custoUnitarioSnapshot`
(`#d08`): o que se congela é dinheiro, porque dinheiro reescrito muda o lucro de pedido
entregue. A folha quer mostrar a foto e duas frases de cada produto, e alguém precisa decidir
de onde elas vêm.

**Decisão.** Da ficha viva, na hora de montar a folha. `LinhaDoOrcamento.descricao` e
`fotoUrl` saem de `FichaTecnica`, achada pelo `fichaTecnicaId` do item; `nome`, `precoUnitario`
e `subtotal` saem do item gravado. Ficha arquivada (fora da lista de fichas vivas) continua no
pedido com o nome congelado, e a linha sai sem foto e sem descrição, com unidade `'un'`.

**Consequência.** Congelar uma foto de 20 KB em cada linha de cada pedido triplicaria a
coleção que mais cresce (`#d105`) para proteger uma coisa que ela **quer** que mude: trocou a
foto do Red Velvet, todo orçamento novo sai com a foto nova. O custo aceito: reimprimir um
orçamento antigo depois de trocar a descrição mostra a descrição nova. O preço, o nome e o
total continuam os de quando foi feito. Se um dia a descrição virar promessa contratual ("sem
glúten"), ela vira snapshot no item, com a mesma justificativa do preço.

A unidade da linha também vem da ficha viva, e é a unidade do rendimento: `'un'`, `'porções'`,
`'g'` ou `'ml'`, o mesmo sufixo do painel de fornada. A spec chegou a escrever `'kg'` para uma
ficha que rende em gramas com quantidade `1,5`, mas o preço do pedido é por unidade de
rendimento (por grama, nesse caso): `1,5 kg` ao lado de um preço por grama mentiria três
ordens de grandeza. A 17A ficou com a unidade do rendimento, e o teste diz `'g'`.

---

## D109 · Imagem mora no documento, como `data:` URL, e não no Storage

**Status:** vigente · decidida em 2026-09-15, na spec 017, sessão 17A (executada na 17B)

**Contexto.** A miniatura do produto e a assinatura são as duas únicas imagens que o sistema
grava, e as duas são pequenas por natureza: uma foto de 320 px de lado em JPEG cabe em 20 KB,
uma assinatura de 720 px em PNG cabe em 60 KB.

**Decisão.** Um `data:` URL dentro do próprio documento. `FichaTecnica.fotoUrl` já é `string`,
e `data:image/jpeg;base64,…` **é** uma URL: nenhum campo muda de tipo. Os tetos são a guarda,
80 KB para a foto e 200 KB para a assinatura, e a redução acontece no aparelho antes de
gravar, com o `canvas` que `src/lib/utils/imagem.ts` já usa para a nota fiscal.

**Consequência.** O Firebase Storage exigiria um segundo serviço ligado, regras de segurança
próprias, URL que só resolve com rede (a folha ficaria sem foto offline) e um segundo lugar
onde `contas/{contaId}/…` precisa ser respeitado. O `data:` URL viaja no mesmo cache, sob a
mesma regra, e aparece na folha sem rede. Quem já viu um documento de 900 KB travar uma
consulta tem razão de desconfiar: a foto de 20 KB em cinquenta fichas é 1 MB de cache, o mesmo
que um mês de pedidos. `ponytail:` a assinatura mora em `configuracao/geral`, que o app
inteiro lê ao subir. Com 60 KB típicos isso não pesa; se um dia pesar, ela vai para um
documento irmão (`configuracao/assinatura`) que só a folha e a tela de configuração leem.

**Ajuste na 17B (2026-09-15): a foto com fundo transparente.** O cardápio da MyCookie's
mostra o cookie solto sobre o creme, e é assim que a folha deveria mostrá-lo. Um arquivo PNG
escolhido para a foto preserva o alpha: sai WebP onde o navegador codifica pelo `canvas`
(Chrome, Firefox) e PNG onde não (Safari devolve PNG em silêncio, e quem lê confere o prefixo
do `data:` URL). PNG de textura de cookie a 320 px não cabe em 80 KB, então o teto desse
caso é o da assinatura, 200 KB (`FOTO_COM_ALPHA_MAX_BYTES`); a foto comum continua JPEG em 80
KB. Na folha e na prévia, imagem com alpha (`temAlpha`) sai em `object-fit: contain` sem o
quadrado `--surface-sunken` por trás; JPEG continua em `cover` dentro dele. Custo aceito: no
iPhone a foto transparente pesa até dez vezes mais que no Android; se doer, o conserto é
codificar no servidor ou aceitar só WebP.

---

## D110 · A validade é campo gravado; a emissão é o dia da impressão

**Status:** vigente · decidida em 2026-09-15, na spec 017, sessão 17A

**Contexto.** Sem prazo, o preço de setembro é cobrado em dezembro com o chocolate mais caro,
ou o gestor aprova em novembro e a Maynara descobre que o custo mudou. A folha precisa de
"válido até" e de "emitido em", e os dois podiam ser gravados, deduzidos ou nenhum.

**Decisão.** `Pedido.validoAteISO` é gravado, porque é combinado, como a data de entrega: o
sistema sugere hoje mais sete dias (`DIAS_DE_VALIDADE`), ela edita, salvar grava. Sugestão não
é dado (`#d17`): a sugestão só nasce no campo de pedido que já existe e ainda é orçamento,
pedido confirmado sem validade fica sem, e pedido feito antes da spec sai sem a linha de
validade em vez de inventar uma. A data de emissão **não** é gravada: é o dia em que a folha
foi impressa.

**Consequência.** `criadoEm` mentiria para um pedido montado na terça e enviado na sexta; um
campo `emitidoEm` escrito pela impressão seria uma escrita disparada por um botão que não é
"salvar", e o Firestore não sabe se ela cancelou o diálogo (`#d77`). Reimprimir uma semana
depois muda a data de emissão e mantém a validade: é o que um orçamento reimpresso deveria
dizer. Quem quiser a data original tem `criadoEm`.

Validade no passado é aviso na tela, e não erro de validação: orçamento vencido é um fato
que ela precisa poder salvar. O aviso aparece no bloco do editor e na barra da prévia, com o
triângulo; a folha não muda, porque o aviso é para ela, e não para a empresa.

O campo é gravado por spread condicional, como `notaChave` (`#d54`): ausente não apaga o que
está lá. A consequência conhecida é que **limpar o campo no editor não apaga uma validade já
gravada**; ela volta ao reabrir. Está na tabela de dívidas, e o conserto é `deleteField()`
quando o campo chega vazio, se um dia "sem prazo" virar escolha de verdade.

---

## D111 · O SaaS nasce como beta fechado sobre o que existe, com a marca MyCookie's e uma lista do que nunca vai fazer

**Status:** vigente, **superada no primeiro item** pela `#d122` (2026-09-18: o produto ganhou
marca própria, Rende) · decidida em 2026-09-15, no `docs/saas/ROADMAP.md`

**Contexto.** Três respostas (`docs/saas/gpt.md`, `claude.md`, `gemini.md`) à pergunta "o que
torna este sistema vendável e escalável" foram lidas contra o repositório. A maior parte do que
elas pedem já existe — custo honesto, simulador de preço, pedido → produção → estoque → caixa,
lista de compras contra a despensa, fechamento do mês, onboarding, nota fiscal, WhatsApp,
multi-tenant, agregado para leitura barata. O que sobra é pouco, e o risco que as três nomeiam
não é técnico: é virar ERP.

**Decisão.** Três coisas, tomadas por quem conduz o projeto:

- **MyCookie's continua sendo a marca do produto.** Não há rebrand. A identidade vinho/creme
  fica; o que muda é só a cópia que presume uma única dona ("Acesso restrito à administradora
  da MyCookie's").
- **Beta fechado antes de cadastro e cobrança.** As primeiras 3 a 5 contas entram por
  `scripts/conceder-acesso.mjs`, que já faz tudo o que um endpoint de cadastro faria (`#d16`).
  Cadastro self-serve e cobrança são a fase 2, e só nascem quando o beta e 5 a 8 entrevistas
  ("me mostra como você calcula o preço hoje") disserem o que generalizar.
- **O produto nunca vai fazer**: emissão fiscal, lotes com rastreabilidade e recall, contas a
  pagar/receber genéricas, CRM, integração com a API do WhatsApp, tabela nutricional, IA
  consultora, free tier, migração para outro banco. A tabela com o motivo de cada um está na
  seção 3 do roadmap. Cada item volta à mesa só com cliente pagante pedindo.

**Consequência.** O roadmap tem quatro fases, numeradas a partir da 018, e **a spec de uma
fase só é escrita quando a fase anterior fechou**: cada uma muda `ESTADO.md` e o que a próxima
precisa saber. A fase 0 não cria infraestrutura nova — uma biblioteca de partida opt-in, que
respeita o `#d65` porque é um botão que ela aperta e não uma semeadura do guia, mais cromo e um
script de métricas. O preço é que o segundo usuário real continua dependendo de alguém rodar
`node` por mais algumas semanas, que é exatamente o que `#d16` previu. **A composição da fase 0
foi revista no mesmo dia pelo `#d113`**: a seção 3 do roadmap virou seção 4, e o beta deixou de
ser o gatilho da fase.

---

## D112 · Preço por plano, nunca por uso medido no aparelho — e `#d10` deixa de ter prazo

**Status:** vigente · decidida em 2026-09-15, no `docs/saas/ROADMAP.md`

**Contexto.** Uma das respostas sugere cobrar por pedidos/mês, "porque acompanha o
crescimento do cliente". O único lugar onde o sistema conta pedidos é o agregado mensal, e ele
é incrementado pelo aparelho (`#d09`, `#d10`). `#d10` tinha prazo de validade — "o segundo
cliente pagante" — porque um cliente malicioso pode escrever o número que quiser no próprio
agregado.

**Decisão.** O preço é por plano, flat, e **um plano só no lançamento** (mensal e anual, no
Stripe). Nenhum número gravado pelo aparelho decide cobrança. O segundo plano nasce na fase 3,
junto da ajudante e do cardápio público, que são os upsells naturais — e é lá, e não antes,
que gating de funcionalidade entra no código.

**Consequência.** O agregado escrito no aparelho deixa de ser problema de confiança: ele mora
em `contas/{contaId}/agregados`, só a própria conta o lê, e um número inventado ali só engana
quem o inventou. `#d10` passa de provisória a **vigente enquanto nenhum número do agregado
decidir cobrança** — se um dia decidir, a troca continua contida em `src/lib/firebase/mutations/`,
que é a única costura. O que a fase 2 ainda precisa de servidor é o que `#d16` já dizia: emitir
claim (cadastro), e agora também o webhook do Stripe reemitindo a claim com `ativas` para as
regras bloquearem escrita de conta vencida sem custar uma leitura (`#d07`). Um plano só
também é zero código de permissão por tela; o preço disso é não ter o que vender a mais até a
fase 3, que é quando haverá o que vender.

**Cumprida na 028.** A claim que a regra lê é `acessoAte`, uma data em milissegundos, e não
`ativas: true | false` — sem cron nenhum (`#d144`).

**Cumprida na 032:** dois pacotes, o portão no servidor, nenhuma regra (`#d167`).

---

## D113 · Nenhuma conta de beta antes de a usuária 0 chegar ao preço sozinha — e toda spec diz o que tira da frente

**Status:** vigente · decidida em 2026-09-15, na revisão do `docs/saas/ROADMAP.md`

**Contexto.** A primeira versão do roadmap dava o onboarding (spec 008) como entregue e abria a
fase 0 com o beta fechado. O único teste de uso que o produto teve reprovou: a Maynara, o
público-alvo em pessoa, não conseguiu operar o sistema sem que alguém explicasse para que cada
tela serve, o que existe e qual o caminho até o preço sugerido. Lido contra o repositório, o
motivo não é falta de explicação, é o que o sistema pede antes de dar algo em troca: o primeiro
passo do caminho é a configuração (cinco blocos, nove campos, vocabulário de contador), o
primeiro preço fica atrás de três formulários (insumo com nove campos, ficha com "fornadas de
reserva" e o tipo kit na frente), a navegação fala "insumo" e "ficha técnica", quatro telas só
se acham pelo guia, e toda spec desde a 009 foi aditiva. A ficha já calcula com
`CONFIGURACAO_SUGERIDA` quando nada foi salvo, então a configuração estar na porta é escolha de
ordem, não necessidade.

**Decisão.** Duas coisas:

- **A fase 0 passa a ser "a usuária 0 sozinha"**, e sai só quando a Maynara, e depois uma
  confeiteira que nunca viu o app, chegam a um preço de venda numa conta nova, sem ajuda, em
  menos de dez minutos, com a tela gravada. A medida é o número de perguntas em voz alta; o
  alvo é zero. Nenhuma conta de beta entra antes disso. As specs da fase são o preço no
  primeiro minuto (biblioteca + ficha-modelo aberta), o caminho reordenado para começar pelo
  preço e terminar na configuração, os dois formulários do primeiro preço com o resto atrás de
  "Mais detalhes", e o vocabulário perguntado a ela. A segunda conta vem depois.
- **Toda spec que adiciona campo, faixa ou tela diz o que tira da frente de quem está
  começando.** "Nada" é resposta válida, mas tem que ser escrita. É a regra contra virar ERP
  por acumulação, que é como se vira ERP.

**Consequência.** O beta atrasa algumas semanas e mede produto em vez de abandono. O `#d65`
continua de pé — não há tour —, e o que muda nele é a ordem do caminho e o que cada passo pede.
Nada sai do schema: "menos na frente" é dobra de formulário, e a configuração continua sendo
o passo que fecha o preço de verdade, só que apresentada pela consequência ("ajuste e veja o
preço mudar") em vez de pela obrigação. A numeração do roadmap mudou: as specs de 018 a 029 da
primeira versão viraram 022 a 032, e a tabela de dívidas do `ESTADO.md` aponta para os números
novos.

---

## D114 · Sem configuração salva, a ficha calcula com a sugerida inteira — e diz isso. Zero também é um número inventado

**Status:** vigente · decidida em 2026-09-15, na spec `018-o-preco-no-primeiro-minuto`

**Contexto.** `#d17` decidiu duas coisas: que sugestão não vira dado (`configuracao/geral` só
nasce no "Salvar") e que, enquanto isso, a ficha "sabe que não há configuração e avisa, em vez
de calcular com número que o sistema inventou" — na prática, `SEM_RATEIO`, hora e gás a zero. A
premissa do `#d113` — "a ficha já calcula com `CONFIGURACAO_SUGERIDA` quando nada foi salvo" —
só valia para a precificação (margem, markup, arredondamento); o rateio caía no zero. Uma
ficha-modelo da biblioteca de partida (spec 018), gravada com a hora sugerida e reaberta num
editor que calcula com R$ 0 a hora, mostraria um preço na lista e outro no rodapé — e a 019
inteira ("sua primeira ficha usou a hora e o gás sugeridos; ajuste e veja o preço mudar")
depende de os dois serem o mesmo número.

**Decisão.** A segunda metade do `#d17` cai: **zero também é um número que o sistema
inventou, e é o pior deles**, porque é exatamente o erro da planilha dela — não se pagar. Um
preço com a hora a R$ 25 e o gás sugerido está mais perto da verdade do que um preço com a
hora a R$ 0. `rateioDaConta(configuracao)` e `precificacaoPadraoDaConta(configuracao)`
(`src/lib/firebase/mutations/configuracao.ts`) moram ao lado de `CONFIGURACAO_SUGERIDA` e são
o único lugar que conhece a regra "salvo, senão sugerido" — rateio, método, margem, markup,
arredondamento e a maior taxa ativa das formas sugeridas. O editor de ficha e a biblioteca de
partida chamam as duas; `SEM_RATEIO` saiu de `custoFicha.ts`, sem chamador restante. A faixa
continua dizendo de onde o número veio e para onde ir para mudá-lo — muda o texto, não o
princípio: `temConfiguracao` continua sendo "o documento existe", e o passo da configuração no
caminho do começo continua pendente até ela salvar.

**Consequência.** Uma ficha nova e a ficha-modelo da biblioteca partem do mesmo número, e uma
conta que salva a configuração com os mesmos valores sugeridos vê o preço da ficha-modelo ficar
exatamente igual antes e depois de salvar — é o que o passo 6 do roteiro da 018 confere. A
faixa "o rateio está zerado" continua existindo, mas só quando `configuracao !== null`: é o
caso em que ela **salvou** zero de propósito, decisão dela, e o texto de hoje continua certo
para isso.

---

## D115 · O caminho começa pelo preço; a dependência não muda, a ordem de apresentação sim

**Status:** vigente · decidida em 2026-09-16, na spec `019-o-caminho-comeca-pelo-preco`

**Contexto.** A ordem dos cinco passos do começo era a da dependência técnica — configuração →
insumos → fichas → pedidos → caixa —, que é a ordem em que o sistema calcula. Não é mais a
ordem em que uma pessoa aprende: o `#d113` já tinha apontado que o primeiro passo era a tela
mais difícil do sistema (cinco blocos, nove campos) e a que menos devolve, e o `#d114` tirou a
premissa técnica que sustentava vir primeiro — a ficha já calcula com `CONFIGURACAO_SUGERIDA`
inteira, rateio incluído, quando nada foi salvo, e diz de onde o número veio.

**Decisão.** A cadeia de dependência não muda — sem insumo não há custo por grama, sem custo
por grama não há custo de ficha, sem ficha não há preço no pedido, sem pedido não há caixa. O
que muda é que essa cadeia deixou de ser a ordem de apresentação. `CATALOGO_DO_COMECO` passa a
`FICHAS, INSUMOS, CONFIGURACAO, PEDIDOS, CAIXA`, com os cinco textos reescritos para falar de
preço em vez de conferir configuração. `FatosDoComeco`, `FATO_DO_PASSO`, `passosDoComeco`,
`proximoPasso` e `progressoDoComeco` não mudam uma linha: a regra "`FEITO` é o fato, em
qualquer posição; o primeiro não feito é o `AGORA`" já funciona em qualquer ordem — é a
reordenação de um array.

O passo 2 continua fechando com um insumo existindo, mesmo com preço médio, e o passo 1
continua fechando com uma ficha qualquer, inclusive a da biblioteca (`#d114`) que ela não
montou: o caminho diz onde ela está, e não se ela fez bem, o mesmo princípio de 2026-09-03. O
`BotaoBiblioteca` aparece agora também no passo 1 do cartão da tela Hoje, numa conta vazia —
`contaVazia` sai de `passos.some(id === "FICHAS" || "INSUMOS", estado === "FEITO")`, que é
exatamente a mesma pergunta que o `BotaoBiblioteca` já faz sozinho para decidir se se desenha,
e é isso que impede o cartão e o botão de discordarem sobre quem é a ação primária.

**Consequência.** O `#d66` ganha uma linha de revisão: "os cinco são a navegação inferior lida
em voz alta" deixa de valer, porque a ordem nova (Fichas, Insumos, Configuração, Pedidos,
Caixa) não é mais a de `navegacao.ts` (Insumos, Fichas, Pedidos, Caixa). Quem termina o caminho
continua conhecendo os cinco destinos, só que tendo visto um preço no primeiro deles. Nenhum
fato novo, nenhuma tela nova, nenhuma rota, nenhuma dependência: o custo desta spec é só cópia.

A dívida "os cinco textos saíram do código, e não do que a 5B viu" não sai da tabela por esta
sessão sozinha — sai quando a gravação do primeiro uso acontecer e os cinco textos forem
conferidos contra ela, palavra por palavra. Continua na tabela, com o prazo apontando para essa
conferência.

---

## D116 · Na frente fica o que o primeiro preço precisa; o resto abre sozinho quando é dela

**Status:** vigente · decidida em 2026-09-16, na spec `020-menos-na-frente`

**Contexto.** O `#d113` mapeou o problema: o primeiro preço, que a 018 e a 019 já tinham
trazido para um toque, continua atrás de dois formulários que não encolheram — `FormularioInsumo`
com seis campos na frente e uma dobra que nunca abre sozinha, `FormularioFicha` com cinco
decisões antes dos itens, a primeira delas "Receita ou Kit" para quem não tem como responder.

**Decisão.** Uma régua só, nos dois formulários: na frente fica o que `calcularCustoInsumo` e
`derivarFicha` não conseguem calcular sem — no insumo, nome, preço pago, quantidade e unidade;
na ficha, nome, rende, unidade, tempo e os itens. O resto (categoria e perda no insumo; tipo,
categoria, reserva, descrição e foto na ficha) vai atrás de um `<details>` nativo rotulado
"Mais detalhes", que **abre sozinho** quando o documento salvo difere do que um cadastro novo
receberia, ou quando um campo de dentro tem erro de validação. A dobra lê o documento salvo, e
não o que está sendo digitado, para não abrir e fechar enquanto ela escreve.

Uma exceção nomeada: a categoria da **ficha** não entra no predicado que abre a dobra, porque
as duas fichas da biblioteca (`#d114`) vêm com categoria "Cookies" e são a primeira tela que
ela vê — com a categoria na regra, a ficha-modelo abriria com a dobra aberta. A categoria do
**insumo** continua na regra: é ela que decide a linha do recibo (`#d20`), e a biblioteca já
traz os seis que não são ingrediente com a categoria certa.

Na ficha, os blocos "O produto" e "Rendimento e tempo" viram um, "A receita" (ou "O kit" com o
tipo em `KIT`), com nome, rende, unidade e tempo. O tipo (receita ou kit) mora dentro da dobra,
e é por isso que ela fica **antes** dos itens: trocar para kit muda os blocos que aparecem
abaixo, e com a dobra depois dos itens esses blocos apareceriam acima do dedo dela.

**Consequência.** O insumo vai de seis campos na frente para quatro; a ficha vai de cinco
decisões antes dos itens para zero. Nada de schema, mutação, rota ou regra muda: é organização
de tela sobre os mesmos campos. Duas escolhas ficam registradas porque um leitor futuro vai
questioná-las:

- **O markup do `<details>` é copiado nos dois formulários, e não extraído em
  `components/ui/`.** São dois usos com o mesmo texto; o terceiro — configuração ou pedido,
  quando pedirem — é o que justifica a extração, pela mesma regra que promoveu `Bloco`.
- **A dobra do insumo tem `key={chaveAtual}` e a da ficha não.** O painel de insumo é uma
  instância que troca de insumo sem desmontar (o truque de `chave`); o editor de ficha é uma
  rota por ficha, e `EditorFicha` já monta o formulário com a ficha na mão — a mesma razão pela
  qual `defaultValues` do `useForm` funciona sem `key`.

O risco registrado na spec: se a dobra aberta nos insumos da biblioteca (farinha com perda,
embalagens com categoria) ler como ruído na gravação do primeiro uso, o predicado do insumo
encolhe para só o que ela digitou — marca, onde compra, estoque —, e categoria/perda passam a
aparecer só na linha da dobra fechada. Decisão adiada até a gravação existir.

---

## D117 · O nome das coisas vem dela, perguntado antes da tela — e fica registrado mesmo quando não muda

**Status:** vigente · decidida em 2026-09-16, na spec `021-as-palavras-dela`

**Contexto.** A navegação e os formulários falavam a língua da planilha de custo ("Insumos",
"Ficha técnica") ou a do curso de confeitaria ("receita"), e ninguém tinha perguntado à Maynara
se eram essas as palavras dela (`#d113`). A mesma coisa também tinha dois nomes dentro do
sistema: o menu dizia "Fichas técnicas", o corpo dizia "receita" — ora no sentido da ficha
inteira, ora no sentido estreito do produto que não é kit.

**Decisão.** Cinco perguntas, sobre a coisa e não sobre a tela, feitas antes de ela abrir o app
no dia da resposta, sem oferecer alternativa. A tabela abaixo é o registro — inclusive as linhas
em que a resposta foi "fica como está", porque essa é a diferença entre "perguntamos e ela disse
que sim" e "não perguntamos".

| #   | A pergunta                                                                                       | Maynara disse                                                                                                                                                                       | Fica                                                                                                                                                                  | Sai                                   |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | "Farinha, chocolate, saquinho, etiqueta — quando você fala disso tudo junto, você chama de quê?" | "Material, ou ingrediente, mas como são ingredientes e itens diversos, acredito que material faça mais sentido."                                                                    | **material** / **materiais**. Menu "Materiais". "Despensa" continua o lugar.                                                                                          | insumo, insumos                       |
| 2   | "A receita com quanto ela custa e por quanto você vende — isso é o quê pra você?"                | "Produto."                                                                                                                                                                          | **produto** / **produtos**. Menu "Produtos". "Receita" fica no sentido estreito (o produto que não é kit): filtro "Receitas · Kits", "A receita" / "O kit" do editor. | ficha, ficha técnica, fichas técnicas |
| 3a  | "Quando você já assou e guardou, ou tem massa no congelador, como você fala disso?" (a ação)     | "Pensando de forma mais geral, para outros públicos e produtos, acredito que ação de assar e guardar é fornada."                                                                    | **fornada**. Nada muda.                                                                                                                                               | —                                     |
| 3b  | (a contagem do pote e a massa crua)                                                              | "O cookie que eu já assei é enviado para entrega, pois asso sob demanda. Já a massa no congelador não tenho um nome muito bom ou definido: poderia ser pronta entrega? Ou estoque?" | **Em aberto.** "O que está pronto" fica até a gravação decidir — "pronta entrega" não descreve massa crua, e "estoque" já é o rótulo de "Estoque atual" no material.  | —                                     |
| 4   | "Quando uma cliente pede cinquenta pra sábado, isso é o quê?"                                    | "Encomenda ou pedido. Acho que pedido fica melhor, não é?"                                                                                                                          | **pedido**. "Encomenda" fica no corpo: é palavra dela também, e sinônimo que ela usa não é segundo nome.                                                              | —                                     |
| 5   | "O dinheiro que entrou e saiu no mês — como você chama isso?"                                    | "Caixa."                                                                                                                                                                            | **caixa**. Nada muda.                                                                                                                                                 | —                                     |

A coluna da segunda confeiteira fica vazia: as cinco perguntas foram feitas só à Maynara em
2026-09-16, por texto. Quando as duas divergirem, vale a da Maynara na fase 0, e a divergência
fica escrita aqui; a segunda confeiteira é o primeiro dado da fase 1, e não segura esta spec.

**Consequência.** "Insumo" → "material" e "ficha" → "produto" em todo texto de tela — JSX,
`titulo`/`descricao`/`aria-label`/`placeholder`, `metadata.title`, o atalho do `manifest.ts`,
`CATALOGO_DO_COMECO`, `OQueMaisTem`, `CadeiaDoDinheiro`, os mapas de rótulo do domínio
(`ROTULO_CATEGORIA_TRANSACAO`, as mensagens de `schemas.ts`, as pendências de `listaCompras.ts`,
`descricaoDaCompra` em `notaFiscal.ts`) — e em nenhum identificador, rota, coleção do Firestore
ou comentário. "Ficha" é feminino e "produto" é masculino: cada frase foi relida, não trocada
por `sed` — artigo, pronome e particípio mudaram junto ("Esta ficha não está aqui" → "Este
produto não está aqui", "suas fichas" → "seus produtos"). Onde "receita" significava a ficha
inteira, virou "produto"; onde significava o produto que não é kit (o filtro, o bloco do editor
de `#d116`), ficou — essa é a régua que fecha o problema 2 da spec.

Uma ponte em dois lugares: o comentário de cabeçalho de `src/lib/types/insumos.ts` e de
`fichas.ts` ganhou a linha "Na tela, chama-se X (spec 021, `#d117`)", para a próxima sessão não
"consertar" a tela de volta para o nome do tipo.

O que não mudou, e por quê: **nenhuma rota, coleção, tipo ou componente foi renomeado** —
`/insumos`, `/fichas`, `Insumo`, `FichaTecnica` continuam com esses nomes, porque o app
instalado não tem barra de endereço e trocar `href` em quarenta arquivos mais o precache do
service worker é o tipo de diff que quebra o que funcionava sem ela ver diferença nenhuma.
**"Encomenda" não saiu do corpo**: a resposta 4 foi "as duas são minhas", e a regra de uma
palavra por coisa vale contra a palavra que ela **não** usa, não contra a que usa de dois
jeitos. **A 3b ficou em aberto**: "pronta entrega" e "estoque" são as duas candidatas dela, e
escolher por ela é exatamente o que esta spec existe para não fazer — "O que está pronto" segue
sem uma letra alterada até a gravação decidir.

A seção 5 da spec conferiu que as quatro telas fora do menu (`/compras`, `/insumos/nota`,
`/insumos/contagem`, `/fichas/contagem`) já tinham porta na tela do menu de que são consequência
desde a 13D — a premissa de "descoberta acidental" do `#d113` e do roadmap do SaaS não era mais
verdade. A porta que faltava, "Fechar e ler a nota" na caixa de confirmação de `/compras`, foi a
única tela nova desta spec.

---

## D118 · Sair apaga o cache local, e recusa em vez de confirmar com pendência

**Status:** vigente · decidida em 2026-09-16, na spec `022-a-segunda-conta`

**Contexto.** `sair()` era só `signOut()`. O cache persistente do Firestore
(`persistentLocalCache`, `client.ts:56`) fica no IndexedDB com todos os documentos da conta, e
sair não tirava nada de lá: no aparelho compartilhado da família ou da ajudante, o próximo login
com outra conta começava com o cache da anterior ainda em disco — a dívida "`sair()` não limpa o
cache" da tabela de `ESTADO.md`.

**Decisão.** `sair()` passa a ser quatro chamadas na ordem — `waitForPendingWrites` →
`signOut` → `terminate` → `clearIndexedDbPersistence` — com um teto de 5 s na primeira e uma
navegação dura (`window.location.replace("/login")`) no fim. **Sem rede e com escrita
pendente, `sair()` devolve `false` e não sai**, em vez de oferecer um modal de confirmação
destrutiva: a fila de escrita mora no mesmo IndexedDB que vai ser apagado, o dado só existe
naquele aparelho, e não existe versão de "sair mesmo assim" que não seja perder o dia de
trabalho. `AVISO_SAIR_PENDENTE` é a mesma constante nos três lugares que chamam `sair()`
(barra lateral, `/configuracao` no celular, a tela "sem conta").

**Consequência.** `signOut` vem antes de `terminate` de propósito: com o usuário nulo o layout
desmonta toda tela autenticada e as assinaturas do Firestore se cancelam sozinhas — cancelar
assinatura numa instância terminada é no-op, abrir uma nova não é. A navegação dura, e não
reiniciar o singleton `dbCache` de `client.ts`, é o preço de menos código: sair é o único
momento do sistema em que recarregar a página é a escolha aceitável. O risco conhecido é outra
aba aberta segurando o mesmo IndexedDB (`persistentMultipleTabManager`): `clearIndexedDbPersistence`
pode recusar com `failed-precondition`, o `finally` navega mesmo assim, e a outra aba recebe
`versionchange` e vai para `/login` pelo próprio Auth.

---

## D119 · O convite é o link de "Esqueci minha senha", e o script cria o login

**Status:** vigente · decidida em 2026-09-16, na spec `022-a-segunda-conta`

**Contexto.** `conceder-acesso.mjs` vinculava um login que já precisava existir. Para a segunda
conta, isso significava: rodar o script, ver falhar, abrir o console do Firebase, criar o
usuário com uma senha inventada, rodar de novo, e mandar a senha por WhatsApp — sem o app ter
tela para ela trocar. O convite passava por uma senha que quem convida conhece.

**Decisão.** `conceder-acesso.mjs` cria o login quando ele não existe, com `auth.createUser({
email })`, **sem senha**. A instrução impressa é "abra a tela de login e toque em 'Esqueci
minha senha' com esse e-mail — o link que chega cria a senha", o padrão de convite do próprio
Firebase Auth. O texto de `AVISO_ENVIO` no login já dizia isso; nada mudou nele.

**Consequência.** O console do Firebase sai do caminho normal de convite — a tela "sem conta"
continua existindo como rede de segurança para login criado por outro meio, mas deixa de ser a
porta usual. Duas coisas ficam de fora de propósito: se o link de reset não criar senha num
login que nunca teve uma, o script troca para `crypto.randomUUID()` sem imprimir — mesmo efeito,
uma linha, e só se o roteiro provar que é preciso. E o preâmbulo repetido entre
`conceder-acesso.mjs` e `metricas.mjs` (credencial, `auth`, `db`) virou `scripts/admin.mjs`:
vinte linhas em um lugar em vez de dois.

## D120 · A marca como tinta tem nome: `wine-ink` e `gold-ink`

**Status:** vigente · decidida em 2026-09-17, na passagem de polimento (`/impeccable polish`).
Com a `#d123` (spec 033-A) os dois viraram `brand-ink` (`--brand-as-ink`) e `accent-ink`
(`--accent-ink`); a regra, tinta inverte e cromo fica, é a mesma.

**Contexto.** O vinho como tinta sobre a superfície (link, ícone de seleção, destino ativo,
barra de progresso, borda da opção escolhida) precisa clarear no tema escuro, e o par
`text-wine-700 dark:text-wine-300` estava escrito em 31 lugares de 23 arquivos. Em cinco deles
a inversão tinha sido esquecida: a borda da opção escolhida (`border-wine-700`, L 0.36) sumia
sobre o `wine-100` escuro (L 0.32) em quatro telas, e só o formulário de lançamento invertia.
Um valor repetido à mão é um valor que uma das cópias erra.

**Decisão.** Dois tokens novos em `globals.css`, com o mesmo arranjo de `--mc-focus` e
`--mc-accent`: `--mc-wine-ink` (`wine-700` no claro, `wine-300` no escuro) e `--mc-gold-ink`
(`gold-600` / `gold-500`), expostos como `wine-ink` e `gold-ink` no Tailwind. A `.folha` do
orçamento fixa os dois no valor claro, porque papel não tem modo noturno (`#d106`). Nenhuma
classe `dark:` sobrou em `src/`, e a regra passa a ser: vinho como **tinta** é `wine-ink`; vinho
como **fundo** (botão primário, barra lateral, pílula ativa) continua `wine-700` e `wine-900`
nos dois temas, porque é o cromo que fica constante e a tinta que inverte.

**Consequência.** `DESIGN.md` documenta os dois na tabela de superfícies. Quem precisar de vinho
com opacidade por tema (a marca d'água do estado vazio) escreve `text-wine-ink/8
dark:text-wine-ink/10`: a única variação legítima de tema que sobrou é a de opacidade, nunca a
de matiz.

## D121 · Seis primitivos que já existiam sem nome

**Status:** vigente · decidida em 2026-09-17, na passagem de polimento (`/impeccable polish`)

**Contexto.** A passagem de polimento contra o `DESIGN.md` encontrou o mesmo trecho de interface
copiado entre telas: as pílulas de filtro em seis (`h-11 rounded-full ...`), o botão flutuante
em quatro, o campo de busca com a lupa em três, o link de voltar do cabeçalho em cinco, o
`<textarea>` em cinco (nenhum com estado de erro ou de desabilitado, um só com `aria-invalid`),
e `Realce` (o `<strong className="num font-semibold text-ink">`) definido duas vezes. Cada cópia
divergia um pouco: as pílulas da contagem tinham `num`, as outras não; a linha de forma de
pagamento não tinha `active:`; o botão flutuante era `<button>` numa tela e `<Link>` nas outras.

**Decisão.** Cada um virou um primitivo em `src/components/ui/`: `Pilulas`, `BotaoFlutuante`,
`CampoBusca`, `LinkVoltar`, `AreaTexto` (dentro de `Campo.tsx`, com o mesmo `BASE_CONTROLE` e o
mesmo envelope de rótulo, dica e erro dos irmãos) e `Realce`. `EnvelopeCampo` deixou de ser
exportado: o único uso era montar o `<textarea>` à mão. Nenhum comportamento mudou de propósito;
o que mudou por tabela foi para o lado da regra do `DESIGN.md` ("todo componente interativo
entrega default, hover, focus-visible, active, disabled, loading, error").

**Consequência.** A próxima tela que precisar de filtro, busca ou campo longo não escreve
classe: chama o primitivo. O cabeçalho das telas fora do menu (as duas contagens, a nota, os
dois editores) continua montado à mão, porque cada um varia no que fica à direita do título e
no que some com o teclado aberto (`apertado:`); só o link de voltar era igual, e é o que saiu.

## D122 · A marca é própria: Rende

**Status:** vigente · decidida em 2026-09-18 por quem conduz o projeto, executada na spec 033

**Contexto.** O sistema herdou por inteiro a identidade da confeitaria para a qual nasceu:
vinho, creme de papel texturizado, filete dourado, serifa quente, o biscoito em marca d'água, e
o nome. O `#d111` decidiu que isso não mudaria e a 022 tirou da frente só a cópia que presumia
uma dona. A segunda confeiteira, que faz bolo, abriria o app sentindo que está na ferramenta
interna de uma concorrente. O brief está em `docs/saas/BRIEF-MARCA.md`; o pacote aprovado
(estratégia, manual, tokens, logotipo, pranchas) em `docs/marca/rende/`.

**Decisão.** O produto chama-se **Rende**, território "Ponto": tinta azul-preta (`brand-700`,
matiz 272) mais um único âmbar (`accent-500`, matiz 78), Archivo e Figtree. A MyCookie's vira a
primeira cliente e o primeiro caso, e não é dona da marca: o Rende não empresta nem toma
emprestado cor, tipografia ou símbolo dela. **Supera o primeiro item do `#d111`**; os outros
dois (beta fechado, a lista do que nunca vai fazer) continuam valendo.

**Consequência.** Três sessões na spec 033: A (a tinta), B (o nome e o símbolo), C (o ponto, a
faixa e as palavras); **A e B saem no mesmo deploy**, porque entre elas o app é nome antigo em
cor nova. `DESIGN.md` e `PRODUCT.md` da raiz foram reescritos antes de qualquer código, porque
são o que o `/impeccable` lê. O que **não** muda: `package.json`, a pasta do repositório, o
projeto Firebase `mycookies-mrc`, o projeto Vercel e a conta `contas/mycookies`, que são
identificadores de infraestrutura e de dado e não aparecem para a usuária. O que fica de fora
do código, e por quê, é a `#d125` (sessão B). A biblioteca de partida continua sendo de cookie:
generalizar é o que as entrevistas da fase 1 vão dizer, não a marca.

---

## D123 · Os tokens entram com o nome do pacote; o Tailwind fica com o nome de papel

**Status:** vigente · decidida em 2026-09-18, na spec 033-A

**Contexto.** `globals.css` tinha um prefixo próprio (`--mc-wine-700`) e o `@theme inline` o
traduzia para `wine-700`. Com um pacote de marca externo (`docs/marca/rende/tokens.css`), um
prefixo próprio obriga a traduzir a cada comparação, e é na tradução que um valor diverge sem
ninguém ver.

**Decisão.** O `:root` e o `@media (prefers-color-scheme: dark)` declaram **exatamente os
nomes de `tokens.css`** (`--brand-700`, `--canvas`, `--accent-ink`, `--positive-bg`…), para que
os dois arquivos se comparem com `diff`. As exceções, todas declaradas: os blocos
`[data-theme]` não entram (o app segue o sistema, sem alternador); os tokens de tipografia,
espaçamento, raio, toque, motion e z-index não entram como custom properties (o Tailwind já
tem `text-*`, `rounded-*`, `duration-*`; duplicar seria dois donos para o mesmo valor); e três
tokens são do código e não do pacote: `--on-accent: oklch(0.20 0.030 75)` (o `#231A08` que o
pacote cita como tinta do botão âmbar e nunca nomeia), `--on-brand-muted: var(--brand-200)`
(texto apagado sobre a barra lateral, ≈ 10:1) e o valor escuro de `--brand-100`
(`oklch(0.30 0.030 272)`, porque o claro do pacote é quase branco e vira um flash como fundo de
hover no tema escuro). O anel de foco é `--accent-500` (o do pacote), a seleção é `brand-700`
sobre `on-brand`, e `accent-color` dos controles nativos é `--brand-as-ink`. As sombras
continuam com os nomes do código, `raised` e `overlay`, na matiz 272; o valor bruto mora em
`--elevation-*` porque `--shadow-*` é namespace do Tailwind e um `--shadow-raised: var(--shadow-raised)`
no `@theme` seria um ciclo.

O `@theme inline` continua sendo a camada de **nome de uso**, e é onde o vinho e o dourado
morreram: `wine-900` → `brand-800`, `wine-800` → `brand-600`, `wine-700` → `brand-700`,
`wine-600` → `brand-600`, `wine-300` e `wine-ink` → `brand-ink` (`--brand-as-ink`), `wine-100`
→ `brand-100`, `gold-*` → `accent-*`, `gold-ink` → `accent-ink`, `on-wine` → `on-brand`,
`on-wine-muted` → `on-brand-muted`; `*-soft` fica como nome do `--*-bg` do pacote. **A escala
de texto e os raios não mudam**: o pacote pede 15/13px e raio 12, o código tem 16/14 e 10/14,
e foi o 16/14 que a usuária 0 usou na bancada; 13px de rótulo a meio metro é regressão. O
`DESIGN.md` da raiz é reescrito com os valores do código e passa a ser a fonte.

**Onde a troca não foi 1:1**, porque o papel mudou e não só a cor: o botão primário e o
flutuante viraram âmbar com `on-accent` (o ponto é a ação primária); o terciário virou
`brand-ink` sobre `brand-100`; a navegação inferior ativa virou `accent-ink` com pílula
`brand-100` (não `accent-500`: como texto sobre `canvas` dá ~2,3:1); a barra lateral virou
`brand-800` com hover `brand-600`, item ativo `brand-700` cheio e **sem filete**; e os dois
marcadores de seleção desenhados à mão (`LinhaCompra`, `PainelEntregas`) viraram `brand-ink`
sobre `text-surface`, porque `brand-700` (L 0,26) sobre a superfície escura (L 0,235) some, e
a tinta inverte sozinha. Pelo mesmo motivo os dois `<input type="checkbox">` perderam o
`accent-wine-700` e herdam o `accent-color` do `body`. Saíram `textura-papel` e `filete-dourado`
(nos três lugares em que o filete marcava estado, o estado já era dito por frase, ícone ou
selo no mesmo cartão). `Fraunces` → `Archivo` 600/700; a tagline do login perdeu o
`font-normal`, porque Archivo 400 não existe na marca e não é carregada.

**Consequência.** `rg "wine|gold|--mc-|textura-papel|filete-dourado" src/` devolve zero. O
`theme_color` e o `background_color` do manifesto viraram `#2A2C3A` e `#F7F4EE` (a `#d124`, da
sessão B, registra a reinstalação que isso exige). A barra de progresso da meta batida ficou
em `bg-accent-500` pela troca literal `gold-500` → `accent-500`; **a C a levou para
`positive`** (barra, texto e ícone), porque a 3.C.2 lista os únicos lugares em que o âmbar
pode ser área e a tabela de semânticos do pacote põe "meta batida" em positivo (`#d126`). O
que na `#d120` se chamava `wine-ink`/`gold-ink` chama-se agora `brand-ink`/`accent-ink`; a
regra, tinta inverte e cromo fica, é a mesma.

**Nota da C (contraste recomputado, 3.C.5).** Os seis pares que a marca criou passam com
folga (7,0 a 11,0; valores no `ESTADO.md`) e nenhum token mudou. Dois pares fora da lista
reprovam e foram tratados no uso, não no token: `--ink-subtle` como **texto** mede 3,45:1
sobre `surface` no claro (o pacote o define para metadado; a navegação inferior inativa e os
rótulos do painel de preço passaram a `ink-muted`, e `ink-subtle` fica para metadado não
crítico e para ícone, onde 3:1 basta); `--border-strong` como contorno mede 1,97:1 nos dois
temas, e **fica**: é o token do pacote, o campo tem rótulo acima e 48px de altura, o botão
secundário tem texto em `ink`, e escurecer o contorno para 3:1 (L ≈ 0,62) pesaria toda a
interface. Se a bancada reclamar do contorno, é uma linha no `:root` e esta nota ganha o
valor. `brand-500` entrou no `@theme inline` como a divisória da barra lateral, no lugar de um
`border-white/10` solto. **Um token mudou**: o anel de foco. `--focus` era `accent-500` nos
dois temas, e sobre o papel cru mede 2,16:1 (`canvas`) e 2,31:1 (`surface`), abaixo dos 3:1
que o `PRODUCT.md` promete para foco; no claro passou a `var(--accent-600)` (3,4:1 e 3,7:1) e
no escuro continua `accent-500` (9,1:1). Sobre o botão primário o anel é um âmbar mais escuro
que o botão, com os 2px de `outline-offset` de superfície entre os dois; a spec previa
`brand-700` só no primário se o âmbar não bastasse, e o `accent-600` resolve nos dois lugares
com uma linha por tema.

---

## D124 · A barra do sistema vira `brand-700`, e o app precisa ser reinstalado

**Status:** vigente · decidida em 2026-09-18, na spec 033 (valores gravados na A, registro na B)

**Contexto.** O `#d76` decidiu que a barra do sistema tem uma cor só, a do ícone, porque o
Android assa `theme_color` e `background_color` dentro do WebAPK na instalação e nem media
query nem `<meta name="theme-color">` alcançam lá dentro. Com a marca nova o ícone deixou de
ser vinho, e a barra vinho sobre um app azul-preto é a única quimera que o deploy conjunto de A
e B não consegue evitar sozinho.

**Decisão.** `theme_color` e `viewport.themeColor` passam de `#5e1725` para `#2A2C3A`, o
`brand-700` que é o fundo do ícone — pelo mesmo raciocínio do `#d76`: a barra é a moldura do
ícone. `background_color` passa de `#f3eee3` para `#F7F4EE`, o `canvas` claro do pacote, e
**não** para o `brand-800` que o `DESIGN.md` do pacote pede para a "abertura": o
`background_color` é a única tela de abertura que um PWA tem, e um ícone `brand-700` sobre
`brand-800` é um quadrado escuro sobre fundo escuro. Os PNGs do ícone são regenerados a partir
do SVG novo, **sem o `rx`**, pelo script do `#d44`: o pacote rasterizou os dele com o canto
arredondado, e canto dentro do canto do sistema aparece como falha.

**Consequência.** Os dois valores são assados no WebAPK: **até desinstalar e reinstalar o
app, o celular da Maynara abre o Rende com a barra vinho.** É o passo 8 do roteiro da spec, e é
o único lugar onde esta decisão é vista. Se no aparelho o creme da abertura parecer um flash
antes do tema escuro, `#1C1E28` é uma linha e uma reinstalação, e esta decisão ganha a nota.
`chrome://webapks` continua sendo onde se separa cor errada de instalação velha.

---

## D125 · O que do pacote da marca não entra no código, e por quê

**Status:** vigente · decidida em 2026-09-18, na spec 033 (aplicada na A, registrada na B)

**Contexto.** O pacote em `docs/marca/rende/` tem três camadas: `MARCA.md`, `DESIGN.md` e
`tokens.css` são o manual; as pranchas `.dc.html` são maquetes geradas para provar os tokens.
Em alguns pontos as pranchas contradizem o próprio manual, e em outros o manual pede o que o
`/impeccable` proíbe ou o que a bancada já reprovou.

**Decisão.** O manual é a fonte; as pranchas são derivação. Sete coisas ficam de fora:

1. **A faixa âmbar de 3px à esquerda do item ativo** da barra lateral (`DESIGN.md` §
   Components). É o _side-stripe_ da lista de proibições do `/impeccable`. Entra o que já
   existia: item ativo com fundo `brand-700` cheio.
2. **"↗ sobram 3,19" em verde em toda linha** de lista (`Telas`, 2 e 4). Seta fora do Lucide
   e cor cheia em estado inativo. A sobra continua tabular, em `ink`; negativa com sinal, cor
   `negative` e `trending-down`.
3. **Estado vazio com o ponto e a faixa, sem dado** (`Telas`, 8). Quebra "uma assinatura por
   peça" e "a faixa nunca é decorativa" (`MARCA.md` § 2.4) de uma vez. O que o estado vazio
   ganha é decisão da sessão C; nesta B a marca d'água do biscoito saiu e nada entrou.
4. **Navegação inferior ativa em `--accent-500`.** `#D89B3C` sobre `#FEFCF8` dá ~2,3:1 e
   reprova AA. Ativa em `accent-ink`, o token que o próprio pacote tem para âmbar como texto.
5. **A escala 15/13px e o raio 12** (`DESIGN.md` § Typography). A escala é estrutura do
   produto, não da marca; 16/14 foi o que a usuária 0 usou na bancada. Registrado na `#d123`.
6. **A tela de abertura em `brand-800`** (`DESIGN.md` § Motion). Ícone escuro sobre fundo
   escuro; o `canvas` claro fica (`#d124`).
7. **Os PNGs do ícone e o logotipo em SVG.** Os PNGs foram rasterizados com o `rx` e são
   regenerados sem ele (`#d44`, `#d124`). O logotipo é HTML em `Marca.tsx`, e não o
   `rende-principal.svg`: o SVG usa `<text>` em Archivo, a fonte precisa estar carregada de
   qualquer jeito, e no HTML ela já está, com `currentColor` dando a negativa de graça. Se um
   dia o "rende" precisar sair do app (e-mail, PDF sem Archivo), é o SVG em curvas que o
   `LEIA-ME.md` já pede.

E dois que o pacote não desenhou e o código precisou: o valor escuro de `--brand-100` (fundo
de hover terciário; o claro do pacote é quase branco e vira um flash no escuro) e `--on-accent`
/ `--on-brand-muted`, os dois na `#d123`.

**Consequência.** `DESIGN.md` da raiz é a autoridade e já diz tudo isto; o do pacote fica como
veio. Quem abrir `Rende — Telas.dc.html` ao lado do app e ver diferença nestes sete pontos
está vendo decisão, e não dívida. O `LEIA-ME.md` do pacote ganhou a seção "Como está no
código" apontando para cá.

---

## D126 · A faixa é dado, nunca enfeite

**Status:** vigente · decidida em 2026-09-18, na spec 033-C

**Contexto.** A marca tem duas assinaturas (`MARCA.md` § 2.4): o ponto âmbar e a faixa de
composição, a barra segmentada na proporção do custo real do lote. A prancha `Telas` do pacote
punha a faixa no estado vazio, sem dado e a 40% de opacidade, e o manual diz o contrário:
"nunca uma faixa decorativa com proporções inventadas" e "uma assinatura por peça".

**Decisão.** A faixa só existe onde existe custo calculado: o bloco "O custo do lote" do editor
de produto. Ela é desenhada a partir de uma função pura, `composicaoDoLote(custo)` em
`domain/custoFicha.ts`, com as mesmas parcelas e na mesma ordem das linhas que o bloco já
mostra, e os rótulos das linhas saem da mesma constante (`ROTULO_PARCELA`): as linhas **são** a
legenda. Parcela zerada não vira segmento; lote zerado não tem faixa (e nenhum espaço vazio no
lugar). O segmento âmbar é "Seu trabalho" (a palavra dela, `#d117`, e não "Sua hora" do
manual), e a linha correspondente é a única colorida do bloco, em `accent-ink`. Os outros
segmentos são `ink` com opacidade (`/90`, `/60`, `/40`, `/25`, recomeçando no kit com
escolhas), e não os `brand-400/500` do pacote: `brand-700` some sobre a superfície escura, e
`ink` inverte sozinho. Sem vão entre segmentos; a luminância separa. `role="img"` com o
`aria-label` dizendo as parcelas com percentual.

**Onde ela não entra**, de propósito: `insumos/ResumoCusto` (é um material, não um lote), a
folha do orçamento (é dela, `#d127`), a lista de produtos, a tela Hoje e qualquer estado vazio.

**Consequência.** Com a faixa, a ordem e os nomes das parcelas têm um dono só, e a barra de
progresso da meta batida deixou de ser âmbar: `bg-accent-500` em `src/` devolve exatamente os
sete lugares que a spec lista (botão primário, flutuante, `Logotipo`, `Simbolo`, `PainelPreco`,
`EstadoVazio`, `FaixaDeComposicao`); qualquer outra linha é uma segunda peça âmbar disputando.
"Meta batida" virou `positive` (barra e texto), que é onde a tabela de semânticos do pacote a
põe.

**Exceção: a página de venda (`#d173`, spec 036).** `site/ContaAberta.tsx` reproduz o bloco "O
custo do lote" do editor com o cookie de `EXEMPLO`: a faixa sai de `composicaoDoLote`, e o ponto
do preço convive com ela como no editor. É o oitavo lugar de `bg-accent-500` em `src/`.

---

## D127 · A folha é dela; "feito com Rende" é uma linha fixa por enquanto

**Status:** vigente · decidida em 2026-09-18, na spec 033 (B e C)

**Contexto.** O orçamento A4 (`FolhaOrcamento`) trazia o logotipo da MyCookie's no cabeçalho,
o total em vinho e o slogan "Feito com amor em cada mordida." como constante de marca. Com a
marca própria, nada disso é nosso: a folha é o documento que a confeiteira entrega à empresa,
e `MARCA.md` § 2.5 é explícito: "cabeçalho e cores são dela; o Rende aparece em uma linha de
rodapé, tinta apagada".

**Decisão.** A folha **não ganha** o logotipo do Rende. O cabeçalho é o nome do negócio em
display; o único bloco cheio (o total) é `ink`, não `brand-700`, porque a tinta é dela e a
marca é nossa (na `.folha` os dois tons são quase iguais; a diferença é semântica, e é este
token que ela troca se um dia tiver cor própria). O Rende aparece como o manual manda: "feito
com Rende", 7,5pt, `ink-subtle`, à direita do rodapé. O slogan dela deixou de ser constante e
virou `ConfiguracaoGeral.frase` (campo opcional, aditivo, a única aprovação da spec 033; até 80
caracteres, "Frase do orçamento" em `/configuracao`, no bloco da folha), lida por
`montarOrcamento` como o telefone e o Instagram, e impressa ao centro do rodapé quando existe.
Sem frase, o contato e o "feito com" fecham a linha sem buraco. **A conta real precisa preencher
o campo uma vez**, senão a frase que as clientes dela leem há meses some da folha.

**O que fica para a 028.** O manual pede a linha "feito com Rende" desligável nas
configurações. Hoje ninguém paga; quando pagar, desligar é o que a assinatura compra. Até lá é
uma linha fixa, e a 028 recebe a nota no `ROADMAP.md`.

**Desligável na 028** (`#d147`): `ConfiguracaoGeral.ocultarFeitoCom`, a caixa em
`/configuracao`, para quem paga ou foi liberada à mão.

**Consequência.** `Orcamento.negocio.frase?`, `esquemaConfiguracao.frase`,
`salvarConfiguracao` gravando com `deleteField()` no vazio (como o contato), e a constante
`FRASE_RODAPE` da B morta. Resumo de WhatsApp, etiqueta e embalagem continuam sem marca Rende.

---

## D128 · O cabeçalho de contexto é a faixa em tinta, e as ações invertem por escopo

**Status:** vigente · decidida em 2026-09-19, na spec 034

**Contexto.** Depois da 033, barra lateral, pílula ativa e item ativo estavam em `brand-700`;
`CabecalhoPagina` e os cinco cabeçalhos próprios (editor de produto, de pedido, as duas
contagens e a nota) continuavam `bg-canvas` com filete. O `DESIGN.md` já chamava o cabeçalho
de cromo em tinta; o código não. E o conteúdo das ações vem de fora (`EntradaContagemPronto`,
`AtalhoParaCompras`, `EntradaLeitura`, a engrenagem da Hoje, o Salvar dos editores,
`LinkVoltar`): restilar cada um para a tinta seria ensinar a oito componentes onde eles estão.

**Decisão.** `CabecalhoPagina` vira duas faixas no mesmo `<header>` grudento: a de contexto em
`bg-brand-700`, sangrando até a borda da área de conteúdo, com `voltar` (novo, opcional),
título em `on-brand`, descrição em `on-brand-muted` (agora `ReactNode`, pelo código do pedido)
e as ações à direita, **sem filete**; e a de ferramentas, `bg-canvas` com filete, só quando há
`children`. A faixa é um **escopo de tokens**, `@utility sobre-marca`, irmão da `folha`: dentro
dele `--ink` vale `--on-brand`, `--ink-muted` vale `--on-brand-muted`, `--border` e
`--border-strong` valem `--brand-500`, `--surface-sunken` e `--brand-100` valem `--brand-600`,
`--brand-as-ink` vale `--on-brand` e `--focus` vale `--accent-500` (o `accent-600` sobre
`brand-700` mede ~2,6:1 e reprova o anel). Botão secundário, terciário, link de voltar e ícone
invertem de graça; o primário âmbar e o selo de sincronização não leem nenhum destes tokens e
não mudam. **Os cinco cabeçalhos próprios passaram a usar `CabecalhoPagina`** com `voltar`, e
as regras `apertado:` do editor (o voltar some, o respiro encolhe) foram junto para o
componente: em tela de lista, com a busca focada, encolher é ganho.

A sangria é `margin-inline: -100vw; padding-inline: 100vw` (`@utility sangria`) com
`overflow-x: clip` no invólucro de `AppShell`. `clip` não cria contêiner de rolagem, e o
`sticky` continua preso ao viewport. Sem pseudo-elemento, sem `z-index` negativo. No desktop a
sangria passa por baixo da barra lateral, que é `fixed` e está acima (`z-40` sobre `z-30`).

**Consequência.** Cinco cópias do mesmo `<header>` morreram, e toda tela ganhou a faixa de
uma vez. Um componente que um dia cair na faixa com `ink-subtle` como texto vai medir ~3:1
sobre a tinta: `ink-subtle` continua sendo ícone e metadado, como o `#d123` já dizia. O escopo
não remapeia `--surface`: nada na faixa tem fundo de superfície, e um dia que tenha, é uma
linha aqui. A escala tipográfica não mudou (`#d123`): `text-title lg:text-display`, e não os
26px/700 da prancha.

---

## D129 · A coluna de leitura é da tela, não do shell

**Status:** vigente; as seis colunas de `/fichas` revistas por D228 · decidida em 2026-09-19, na spec 034

**Contexto.** `AppShell` travava `main` em `max-w-5xl` (`#d42`). Certo para formulário e
prosa, errado para a tabela com o painel ao lado: em 1024px sobrariam 580px para seis colunas.

**Decisão.** `AppShell` deixa de limitar `main`. A largura de leitura vira um grupo de rota,
`src/app/(app)/(coluna)/layout.tsx`, um `<div className="mx-auto w-full max-w-5xl">`, e **toda
página entra nele, menos `fichas/page.tsx`**. Mover arquivo foi a única mudança nas páginas;
nenhum import mudou, e o build sai com as mesmas rotas. `RodapeFixo` já media `max-w-5xl` por
dentro, então os editores continuam alinhados com o rodapé de preço. Quando `/insumos` e
`/pedidos` virarem tabela, saem do grupo.

`/fichas` no desktop é tabela: no `lg:` a linha vira grade de seis colunas na proporção da
prancha (`2.4fr · 1fr · 1.2fr · 1.2fr · 1.2fr · 1.4fr`): Produto · Rende · Custo/un · Sugerido
· Praticado · Sobra. São os seis números gravados na ficha que respondem "qual produto rende
mais?", e que não apareciam lado a lado em lugar nenhum. Cabeçalho de colunas em `micro` 600
caixa alta `ink-muted`, `aria-hidden`; cada célula carrega o rótulo em `sr-only` com as
palavras do celular ("rende", "custa", "sugerido", "praticado", "sobram"; "perde" no
prejuízo, com o sinal visível em `aria-hidden`). Os dois arranjos moram no mesmo `<li>`
(`lg:hidden` e `hidden lg:grid`), e o `display: none` tira o oculto da árvore de
acessibilidade: o leitor de tela ouve um só. Sem seta verde (`#d125`); sem ordenar por coluna
(busca e pílulas já recortam, e dezenas de produtos não pedem ordenação).

**Consequência.** A linha do celular não mudou um pixel. O `(coluna)` tem um `page.tsx` a mais
que o `(app)` e um `fichas/` em cada grupo, o que o Next aceita porque nenhuma URL se repete.
`/insumos` e `/pedidos` continuam sendo a linha do celular esticada: é outra sessão, no mesmo
padrão.

---

## D130 · O painel de produto é coluna acoplada, e não o `Painel`; não leva o ponto

**Status:** vigente · decidida em 2026-09-19, na spec 034

**Contexto.** No desktop há espaço para ver o custo do lote de um produto sem perder os
outros de vista; até aqui era ida e volta pelo editor. O `Painel` que já existe é sobreposição
com fundo escurecido, foco preso e `inert` no resto.

**Decisão.** `PainelProduto` é uma coluna de 26rem acoplada à direita da tabela, **só no
desktop** (`hidden lg:flex`), e **não o `Painel`**: a lista precisa continuar clicável para
trocar de produto sem fechar nada. Sem `position: sticky`: o cabeçalho grudento já ocupa a
altura que ocupa, e a lista tem dezenas de linhas. Só leitura, do que a ficha já tem gravado:
`custoGravado(ficha): CustoFichaCalculado` é o mapeador puro novo em `domain/custoFicha.ts`
(`custoEscolhas ?? 0`, as três parcelas de `invisiveis.*`), com teste, e é o que alimenta
`composicaoDoLote`. A legenda são os segmentos da faixa (`Parcela` saiu de `FormularioFicha`
para `FaixaDeComposicao.tsx`, que é onde a legenda mora, `#d126`), e não a lista fixa de sete
linhas do editor: parcela zerada não aparece, porque o painel mostra o gravado e não pede que
ela preencha nada. Custo/un · Sugerido · Praticado em três `Dinheiro` com rótulo `micro`, como
no `PainelPreco`; a sobra em `display` ("Sobram R$ 3,19", "por unidade, depois da maquininha
(4,99%)"; no prejuízo "Perde R$ 0,38" com `trending-down` e `negative`). `custoDesatualizado`
traz o selo de atenção e "Abra o produto e salve para recalcular com os preços de hoje".
Rodapé "Abrir produto", secundário; o primário da tela continua sendo "Novo produto".

**Sem o ponto âmbar**: ele marca dado num lugar só, o painel de preço do editor, e a faixa já
é a assinatura desta peça (uma por peça, `MARCA.md` § 2.4). Sem a faixa lateral âmbar da
prancha (`#d125`, `/impeccable`).

**Interação.** No `lg:`, o clique simples na linha abre o painel em vez de navegar
(`matchMedia('(min-width: 64rem)')` no `onClick` do `Link`, com `preventDefault`; botão do
meio, Ctrl+clique e menu de contexto continuam abrindo o editor). Clicar outra linha troca. Ao
abrir e ao trocar, o foco vai para o painel (`tabIndex={-1}`, `aria-label` com o nome);
`Escape` e o "×" fecham e devolvem o foco à linha selecionada (`a[aria-current="true"]` dentro
da lista). A seleção é derivada de `dados`: se a ficha for arquivada em outra aba, o painel
fecha sozinho. Sem seleção, o painel não é renderizado e a tabela ocupa a largura toda. No
celular nada disso existe: a linha vai ao editor.

**Consequência.** O que o painel mostra é o que o editor gravou, por construção: nenhum
segundo cálculo, e o selo de custo desatualizado é quem avisa que o gravado envelheceu. O
"Sugerido" é `precificacao.precoSugerido` gravado, antes do arredondamento (o arredondado não
é gravado); se a diferença incomodar, é campo novo, não conta na tela. O painel no celular
(folha inferior) e o editor em duas colunas ficam para outra spec.

## D131 · O `cn` conhece a escala de texto do código

**Status:** vigente · decidida em 2026-09-19, nos ajustes de navegador depois da 034

**Contexto.** O primeiro olhar no navegador depois da 034 mostrou "Ler uma nota", "O que
comprar" e "O que está pronto" com ícone e texto em tinta escura sobre a faixa `brand-700`,
só no tema claro. O `sobre-marca` estava certo (a borda invertia); o que faltava era o
`text-ink` do botão secundário. O `tailwind-merge` só conhece a escala de texto padrão do
Tailwind (`text-sm`, `text-lg`…): `text-body`, `text-label` e irmãos são lidos como **cor**,
`text-ink text-body` vira conflito, e o primeiro cai. `classesBotao` passava a cor antes do
tamanho, então **nenhum botão tinha cor própria**: o secundário herdava a tinta (certa sobre o
papel, errada sobre a faixa), o terciário nunca foi `brand-ink`, o destrutivo nunca foi
`negative`, o primário no escuro era creme sobre âmbar. No sentido inverso, todo `cn()` que
punha o tamanho antes da cor (`text-label text-ink-muted`, `text-micro`) perdia o tamanho:
selo, pílula, `LinkVoltar`, os rótulos da barra lateral, o cabeçalho de colunas da tabela, o
"R$" do `Dinheiro` (perdia o `ink-muted`) e o preço em `display` do `PainelProduto` saíam no
tamanho herdado. Nada disso era visível como erro: cada peça saía um degrau maior ou na cor
do pai, e foi assim que a 033 e a 034 foram julgadas.

**Decisão.** `src/lib/utils/cn.ts` usa `extendTailwindMerge` com a escala de texto do
`@theme inline` (`display`, `title`, `heading`, `subheading`, `body`, `label`, `micro`). É o
único lugar fora do `globals.css` que conhece esses nomes; um tamanho novo entra nos dois. Não
se mexe em nenhum `cn()` de componente: o conserto é no dono do conflito, e o `git diff` dos
componentes continua zero para isso. **Consequência visível:** a interface fica com os
tamanhos e as cores que `DESIGN.md` sempre disse; o que ela mostra a partir daqui é o que os
dois temas passam a exibir de verdade, e o `/impeccable` da 033-C foi medido sobre uma tela
que não era esta. O roteiro em navegador da 034 confere as peças listadas acima.

**O que foi junto, no mesmo passe:** "O que comprar" e "O que está pronto" no cabeçalho
passaram de `sm` para o `md` do primário ao lado (`EntradaContagemPronto` ganhou `tamanho`, e
é `sm` só na ficha, ao lado de "Fiz a massa"); "A receber" e "Entregas a pagar" dividem
`FaixaResumo` (nome e valor numa linha, frase embaixo, ação à direita no desktop), porque o
`w-full` do parágrafo com `max-w` deixava de quebrar linha no desktop e a frase subia para o
lado do valor; em `/comecar`, a nota da meta do mês virou faixa rebaixada com ícone, a mesma
do convite de instalar, e a seção do offline ganhou o recuo das listas emolduradas para os
ícones caírem na mesma coluna; e o ponto do logotipo ganhou o vão de `0.31em` depois do "e",
medido no navegador contra `rende-principal.svg` (o centro em 232 num texto que acaba em ~197),
em vez de encostar na letra.

## D132 · O voltar do navegador entra pela sentinela

**Status:** vigente · decidida em 2026-09-19, na spec `023-sair-sem-salvar.md`

**Contexto.** O App Router não cancela navegação de histórico: `popstate` chega, o Next
despacha o `ACTION_RESTORE` e o segmento desmonta. Não existe `useBlocker` como no React
Router, e a Navigation API (`navigate` com `preventDefault`) resolveria em uma linha, mas não
existe no Safari — sem ela não há como interceptar o gesto de voltar do Android, que é a saída
mais comum no aparelho da Maynara.

**Decisão.** Enquanto a tela está suja, `useGuardaDeSaida` empurra uma entrada a mais no
histórico com a mesma URL (`history.pushState(null, "", location.href)`): o Next copia o
estado interno dele para a entrada nova e trata o `RESTORE` da mesma URL como nada, então o
formulário não desmonta. Quando ela aperta voltar, o navegador consome a sentinela sem mudar
de tela, e o `popstate` é o sinal para abrir o diálogo. "Continuar aqui" rearma a sentinela;
"Sair sem salvar" faz `history.back()` de novo, agora para a página de antes.

O preço é uma entrada a mais no histórico enquanto a tela está suja. Para não deixá-la
sobreviver ao salvar ou arquivar, toda saída voluntária (`navegar(href)`) desarma a sentinela
— `history.back()`, espera o `popstate` correspondente — antes de fazer `router.push`. Sem
isso o editor ficaria duas vezes no histórico e "voltar" da lista exigiria dois toques. Sair
por outra aba com a sentinela armada deixa a entrada duplicada até a próxima sessão: aceito,
sem conserto possível sem navegar durante o desmonte.

## D133 · A modal de confirmação destrutiva é o `<dialog>` nativo

**Status:** vigente · decidida em 2026-09-19, na spec `023-sair-sem-salvar.md`

**Contexto.** O `DESIGN.md` já reservava a modal centralizada para confirmação destrutiva
("título com a consequência, dois botões, sem X"), mas nunca houve uma: as quatro confirmações
de arquivar do sistema são caixas inline. A guarda de saída precisava da primeira.

**Decisão.** `Confirmacao` (`src/components/ui/Confirmacao.tsx`) é um `<dialog>` aberto por
`showModal()`, e não uma extensão do `Painel`. O navegador dá de graça o foco preso, o
`Escape`, o fundo, o `inert` do resto da página e, no Android, o gesto de voltar fechando o
diálogo em vez de sair da tela (um `CloseWatcher`) — as sessenta linhas que o `Painel` teria
que escrever à mão. O `Painel` continua sendo a folha inferior do formulário; uma pergunta de
duas frases dentro dele pareceria um formulário que não é. O foco inicial é "Continuar aqui"
(`autoFocus`), o botão destrutivo é `variante="perigo"`, e `onClose` é o único caminho de
cancelar — `Escape`, o voltar do Android e o clique no `::backdrop` passam todos por ele.

## D134 · Sujo é "salvar gravaria algo diferente do que abriu"

**Status:** vigente · decidida em 2026-09-19, na spec `023-sair-sem-salvar.md`

**Contexto.** As cinco telas que a guarda de saída cobre (produto, pedido, configuração,
contagem da despensa, contagem do pronto) precisavam de uma definição só de "há o que
perder", cada uma com a assinatura possível: `isDirty` do react-hook-form não serve para o
editor de produto, porque `form.setValue` sem `shouldDirty` não marca sujo — e é assim que o
preço manual (`aoMudarPreco`), a troca de tipo e a limpeza de itens escrevem. A confeiteira
digitaria um preço no painel de preço, sairia, e o `isDirty` diria "limpo".

**Decisão.** Sujo é "salvar gravaria algo diferente do que abriu", medido por assinatura JSON
sobre o estado inteiro da tela contra o estado da abertura: `JSON.stringify(valores) !==
JSON.stringify(iniciais)` no produto e no pedido, `assinatura(estado) !== base` na
configuração (já existente, agora ligada à guarda), e "algum número digitado" nas duas
contagens (`Object.values(valores).some((q) => q !== null)`). No pedido, `status` e
`pagoEmISO` ficam fora da assinatura de propósito: mudar o status e marcar como pago gravam
na hora, e não são "o que sair perderia". A contagem semeada pela compra ou pela fornada nasce
suja: a semente é consumida ao semear, sair sem salvar perde a proposta que a nota ou a massa
acabaram de calcular, e voltar não a refaz — é perda de trabalho, mesmo que o trabalho tenha
sido do sistema. O custo é um toque a mais para quem abriu a contagem por engano.

Não é sujo, de propósito: mandar no WhatsApp (abre outra aba, não é sair) e salvar a
configuração (o hook desarma sozinho quando `base` volta a bater com o estado).

## D135 · A sobra de hoje é o gravado mais o que mudou, linha a linha

**Status:** vigente · decidida em 2026-09-19, na spec `024-fichas-no-vermelho.md`

**Contexto.** Quando um material sobe de preço, `marcarFichasDesatualizadas` marca
`custoDesatualizado: true`, mas o sistema nunca diz **o que** mudou — só que o número
envelheceu. O roadmap nomeia `derivarFicha` como a resposta, mas reconstruir a `EntradaFicha` a
partir do documento gravado exigiria a configuração inteira (`rateioDaConta`,
`arredondamento`) em cada leitor, e misturaria duas perguntas diferentes: "o que você compra
ficou mais caro?" (desta spec) e "você mudou o valor da sua hora?" (já é da faixa do editor,
que recalcula tudo ao salvar).

**Decisão.** `custoDeHoje` (fim de `domain/custoFicha.ts`, ao lado de `custoGravado`) parte do
gravado e soma só o delta de cada linha, com as mesmas funções que gravaram —
`custoLinhaItem` e `custoLinhaComponente`. Material arquivado (fora do mapa de materiais vivos)
fica na linha gravada; componente de kit usa o custo unitário de hoje da receita, um nível
(`#d11`); escolha de combo usa `custoDasEscolhas` sobre as fichas com custo de hoje (`#d101`);
invisíveis (hora, energia, fixas) ficam gravados, porque configuração não é material; rendimento
e preço praticado ficam gravados, porque são decisão tomada. Sem mudança nenhuma, o resultado é
o gravado centavo por centavo, **por construção**: cada delta é a mesma função aplicada duas
vezes, subtraída dela mesma. `custosDeHoje` faz a conta pra toda ficha viva de uma vez: as
receitas primeiro, os kits depois, com o custo de hoje das receitas na mão.

**Consequência.** Nenhuma leitura nova de configuração, nenhum campo novo. Se um dia a pergunta
virar "quanto custaria salvar agora, com tudo" (inclusive hora e energia), aí sim é
`derivarFicha` com a configuração — e esta decisão ganha a nota.

## D136 · O cartão conta cruzamento; a lista mostra toda diferença

**Status:** vigente na metade do cartão e do painel; a metade da linha **substituída por D230** · decidida em 2026-09-19, na spec `024-fichas-no-vermelho.md`

**Contexto.** Com `custoDeHoje` em mãos, faltava decidir o que a tela Hoje e a lista de
`/fichas` fazem com o número. Um cartão que mostrasse toda diferença — a farinha sobe dois
centavos, a sobra de todo produto muda um centavo — seria permanente, e cartão permanente é
paisagem. A lista, ao contrário, já é o lugar onde ela confere centavo por centavo.

**Decisão.** `CustoDeHoje.caiu` só fica `true` quando o produto **cruzou uma linha** desde o
último Salvar: passou a perder dinheiro (`sobra < 0` com `lucroUnitario` gravado `≥ 0`), ou
passou a cobrar menos do que a própria conta pede (`precoVenda < precoSugeridoHoje` quando
`precoVenda ≥ precoSugerido` gravado). Quem já cobrava abaixo do sugerido de propósito não vira
notícia por continuar abaixo — só quando o preço praticado cruza para debaixo do sugerido de
hoje **e** não estava debaixo do gravado. A comparação é entre preços, nunca entre percentuais
(`margemReal`/`markupReal` têm duas casas, e um produto de R$ 0,60 cruzaria a margem só por
arredondamento), e usa `arredondamento: "NENHUM"` para calcular o sugerido de hoje — o
arredondamento de vitrine não muda `precoSugerido`, só o preço que vai na etiqueta.
`CartaoNoVermelhoHoje` (tela Hoje) só existe quando alguma ficha viva tem `caiu: true`; some ao
salvar. A linha de `/fichas` e o painel do produto, ao contrário, mostram **toda** diferença
entre a sobra gravada e a de hoje, inclusive o centavo e inclusive para cima: é a verdade de
hoje, e uma lista que esconde um centavo é uma lista em que ela não confia.

**Consequência.** Duas leituras do mesmo `CustoDeHoje`: `sobra` alimenta a seta em toda ficha
(`LinhaFicha`, `PainelProduto`), `caiu` decide se o cartão existe. Se um dia a Maynara quiser
ver toda queda no cartão, é trocar `caiu` por um limiar em centavos — e esta decisão ganha a
nota.

---

## D137 · A tela de clientes lê e ordena pelo dinheiro; a cliente continua nascendo do pedido

**Status:** vigente · decidida em 2026-09-19, na spec `025-quem-mais-compra-de-mim.md`

**Contexto.** `D35` tinha duas metades: "não há tela de clientes" e "a cliente é cadastro
opcional, aberto de dentro do pedido". Os quatro agregados de `Cliente` (`totalPedidos`,
`totalGasto`, `ticketMedio`, `ultimoPedidoEm`) são escritos desde a 3B e nenhuma tela os lia.

**Decisão.** `/clientes` existe, e a primeira metade do `D35` cai: a segunda fica inteira.
A tela **não cadastra** — sem "Nova cliente" em lugar nenhum, porque uma cliente sem pedido é
uma linha de CRM, e o produto não é CRM. A ordem é `totalGasto` decrescente, em memória, sobre
a mesma consulta por `nomeBusca` que o editor de pedido usa (`consultaClientes`, um lugar só
pelo `D105`); empate por `totalPedidos`, depois por nome, e quem nunca pagou vai para o fim.
Sem pílula de ordenação: a pergunta da tela é uma só, e a busca por nome cobre "cadê a Ana?".
Os números contam o que **entrou no caixa** — `totalPedidos` só anda no pagamento (`D36`) —, e
a tela diz isso na descrição do cabeçalho.

**Consequência.** Uma cliente com encomendas confirmadas e nenhuma paga aparece como "ainda
sem pedido pago". Uma venda anotada só com o nome, sem vínculo, não entra na conta de ninguém —
risco nomeado na spec, medido pelo passo 1 do roteiro. Editar o cadastro deixa de exigir achar
um pedido dela: `PainelCliente` mudou de `components/pedidos/` para `components/clientes/`, e
ganhou a prop `podeArquivar` (`D138`) para o painel aberto de dentro do pedido não oferecer a
ação.

---

## D138 · Arquivar uma cliente congela os agregados dela e não desfaz vínculo nenhum

**Status:** vigente · decidida em 2026-09-19, na spec `025-quem-mais-compra-de-mim.md`

**Contexto.** Sem tela de clientes não havia onde arquivar uma: quem mudou de cidade ou parou
de comprar continuava para sempre nas sugestões do editor de pedido. `D137` abriu a tela; faltava
dizer o que "arquivar uma cliente" significa.

**Decisão.** `arquivarCliente` grava `arquivado: true` e decrementa
`agregados/global.totalClientes` — o espelho exato de `criarCliente` e o mesmo par de
`arquivarInsumo`. Nada mais muda: o `clienteId` **não é apagado** dos pedidos antigos, porque
`clienteNome` é snapshot e a leitura deles não depende do cadastro; um pagamento num pedido
dela feito depois de arquivada não move os agregados, porque a consulta que os alimenta não a
encontra mais. Não existe restaurar na tela — o documento fica, `arquivado: true`, para o
script resolver o engano.

**Consequência.** Uma cliente arquivada por engano e restaurada à mão terá `totalGasto` sem os
pagamentos do intervalo: é a mesma troca que `D37` já aceitou para `ultimoPedidoEm` no desfazer
— sem histórico de pagamentos, o agregado não se reconstrói sozinho. "Recalcular" para clientes
fica reservado para quando alguém pedir.

---

## D139 · A quebra é dita depois, e ausência não é zero

**Status:** vigente · decidida em 2026-09-19, na spec `026-a-fornada-que-quebrou.md`

**Contexto.** O roadmap pedia `Fornada.perdidas`, mas a fornada grava o dia da massa (`D93`): ela
mistura, congela e assa sob demanda, e o que não dá para vender só se sabe no forno, na bancada
ou na caixa — dias depois. Um campo "quantas quebraram?" no formulário de registrar a fornada
seria sempre zero, porque nada quebrou ainda.

**Decisão.** `Fornada.perdidas?: number` não entra em `PainelFornada`; entra em
`FornadasRecentes`, o único lugar que lista fornada registrada e já está nas duas telas onde a
quebra se descobre (o produto e o pedido). **Ausente não é zero**: é "ela não disse". A mesma
régua do `D63` (contagem vencida vale "não sei") — quem anota a assadeira que caiu e nunca mais
toca no botão não tem uma taxa diluída por fornadas sobre as quais não falou; tem uma taxa alta
sobre as poucas que anotou, e `quebraDaFicha` diz quantas são. `perdidas: 0` é anotação legítima
— "nesta não quebrou nada" — e entra no denominador. Não existe desanotar: corrigir é reabrir e
digitar outro número.

**Consequência.** Uma fornada anotada só uma vez, com quebra alta, deixa a taxa alta no editor
pelos trinta dias da janela de `consultaFornadas` (`IDADE_VENCE_DIAS`) — é o preço de não
inventar uma medição que ninguém fez, e a frase nomeia quantas massas entraram na conta. Se as
entrevistas disserem que a operação assa e embala no mesmo ato, o campo desce para o formulário
de registrar, opcional, e esta decisão ganha a nota.

## D140 · A quebra tira do pote e devolve a promessa, nunca a farinha; o custo real é leitura

**Status:** vigente · decidida em 2026-09-19, na spec `026-a-fornada-que-quebrou.md`

**Contexto.** Com `perdidas` gravado, era preciso decidir o que cada leitor da fornada faz com
ele. A farinha dos cookies que caíram já saiu da despensa e não volta; o que volta é a obrigação
de fazer os mesmos de novo — e confundir as duas coisas faria a quebra do forno mexer na perda do
material (`perdaPercentual`), que já divide o custo por grama e é conta separada.

**Decisão.** O que quebrou não devolve insumo, devolve trabalho. `vendaveis` (o que a massa
rendeu, menos `perdidas`, nunca negativo) substitui `unidadesProduzidas` em `projecaoDoPronto` (o
pote) e `reservadoNoPronto` (o dono no pote) e na linha do pedido (`jaFeitasPorFicha`).
`aproveitamento` (a fração vendável, 1 sem anotação) encolhe o abate de `produzidoParaPedidos`: o
que quebrou volta a ser promessa, e `prometidoParaPedidos`/`capacidadeDaFicha` voltam a pedir o
material como consequência. `consumoDesdeAContagem` **não muda**: a farinha foi gasta, quebrando
ou não. O custo real por unidade vendável (`custoPorVendavel`, a mesma conta de `quantidadeFisica`
— `custo ÷ (1 − taxa)`, com o teto de `PERDA_MAXIMA` — um nível acima) é **leitura**, como a sobra
de hoje da 024 (`D135`): calculado na tela a partir do gravado e da taxa das fornadas anotadas
(`quebraDaFicha`), nunca escrito em `FichaTecnica`. Gravá-lo faria `precoSugerido` andar sozinho a
cada fornada anotada, sem ela ter mudado nada na ficha.

**Consequência.** A lista de compras passa a pedir de novo o material que uma massa quebrada não
aproveitou — comportamento correto (a encomenda ficou curta), mas visível o bastante para levar
nota no rodapé de `FornadasRecentes`. Se um dia a quebra precisar entrar no preço, a forma é um
campo `quebraEsperada` digitado por ela em `derivarFicha`, como a perda do material — não esta
leitura.

## D141 · A conta nasce no servidor, uma por login, e o handler garante em vez de criar

**Status:** vigente · decidida em 2026-09-19, na spec `027-criar-a-conta-sozinha.md`

**Contexto.** `D16` dizia desde o Módulo 0 que "tela de cadastro" não é uma tela: é código de
servidor que emite a claim, porque custom claim só se escreve com o Admin SDK, e é isso que faz
a regra custar zero leitura (`D07`). O servidor existe desde a 6A; faltava o handler.

**Decisão.** `POST /api/conta` é `conceder-acesso.mjs` na forma de rota, **copiado e não
importado** (o script roda com `node` fora do app e não resolve `@/`; quando o Node do projeto
rodar `.ts` sem loader, as vinte linhas de `garantirConta` podem ser importadas do script).
Para o `uid` do token, a rota **garante** que existe uma conta e uma claim, em três `if`s: que
conta é a dela (a primeira chave de `customClaims.contas` lida no servidor com `auth.getUser`,
e não do token, que pode ter sido cunhado antes da claim; sem chave, `randomUUID()` sem hífens,
que passa na validação do script); o documento existe (se não, `set`); a claim aponta (se não,
`setCustomUserClaims` preservando o que havia). **Documento antes da claim**, na ordem do
script: a claim é o que põe ela dentro do app, e só pode existir quando o documento já existe.
Se o handler cair entre os dois, a próxima chamada gera outro id e o primeiro documento fica
órfão, visível em `metricas.mjs` e inofensivo; a ordem inversa poria ela dentro do app com
`conta` nulo. Entre lixo e conta quebrada, lixo. Duas chamadas produzem uma conta e a mesma
resposta `{ contaId }`. Sem `abreAConta`: é a única rota em que quem chama, por definição, ainda
não abre conta nenhuma; o `uid` verificado é a autorização inteira.

**Os quatro campos são opcionais, e ausência tem significado.** `plano`, `status`, `trialAte` e
`termosAceitosEm` são gravados só pelo cadastro. Conta sem `plano` é conta liberada à mão —
`contas/mycookies`, as do beta, qualquer uma que o script criar — e não tem prazo. O script
não passa a escrever `plano: "CORTESIA"`: seria inventar um valor para o que a ausência já diz,
e a 028 lê `trialAte` ausente como "nunca vence", que é o que essas contas precisam ser.

**Consequência.** Uma conta por login é o que a rota sabe fazer; a pessoa com dois negócios é
a 030, no ponto único que `contaAtivaDaClaim` já nomeia. Se os órfãos incomodarem, o id passa a
ser derivado do `uid`. `D16` deixa de ser provisória.

## D142 · O cadastro pede o mínimo e cai em `/fichas`

**Status:** vigente · decidida em 2026-09-19, na spec `027-criar-a-conta-sozinha.md`

**Contexto.** `/cadastro` é a primeira tela que uma desconhecida vê, e o relógio da fase 0 (dez
minutos até o preço) passa a contar dela. Cada campo a mais é um formulário a mais.

**Decisão.** E-mail, senha, seu nome (obrigatórios) e nome do negócio (opcional, "Se ainda não
tem, deixe em branco": vira o nome dela). Sem confirmar senha (o navegador mostra o que ela
digita, e "Esqueci minha senha" existe), sem telefone, sem documento, sem e-mail de verificação
(o trial é o portão). A caixa dos termos é obrigatória e não "ao criar a conta você aceita":
é o que faz `termosAceitosEm` ser um ato dela, o mínimo que a LGPD pede para consentimento que
se prova. Depois do `POST`, `reconferirAcesso()` e `router.replace("/fichas")`, não `/`: a tela
Hoje de uma conta vazia é um painel em branco apontando para `/fichas`, e `/fichas` vazio é o
botão da biblioteca, que é o passo 1 da 019. Um formulário com dois estados, e não duas telas:
com login e sem conta (o `POST` caiu no meio), o mesmo formulário sem e-mail e senha, com
"Tentar de novo" no lugar de "Criar conta". **Atualização da 041 (`#d193`):** "sem confirmar senha"
continua, mas o motivo passa a ser o botão de mostrar a senha em `/cadastro`, e não o navegador:
só o Edge mostra o que se digita.

**Consequência.** Se a gravação da fase 0 mostrar que ela procura "onde estou" antes de "quanto
custa", o destino volta a `/` e o cartão do caminho faz o resto: é uma string. Se mostrar
hesitação no nome do negócio, o campo sai e `nome` vira o nome dela sempre.

## D143 · O cadastro diz que o e-mail já existe; a recuperação de senha não

**Status:** vigente · decidida em 2026-09-19, na spec `027-criar-a-conta-sozinha.md`

**Contexto.** "Esqueci minha senha" responde a mesma frase existindo ou não o cadastro
(`AVISO_ENVIO`): quem pergunta pelo e-mail de outra pessoa não sai sabendo mais.

**Decisão.** O cadastro não faz o mesmo. `auth/email-already-in-use` é a única resposta útil
para quem já tem conta e esqueceu, e escondê-la a deixaria presa num formulário que nunca
conclui. A frase é "Esse e-mail já tem conta. Entre com ele, ou toque em 'Esqueci minha senha'
na tela de entrar." A assimetria é deliberada: o que a recuperação protege, o cadastro cede,
porque o Firebase Auth já cede (a criação falha de qualquer jeito, e o código é público no SDK).

**Consequência.** A frase mora em `MENSAGENS` do `AuthProvider`, ao lado de
`auth/weak-password`; nenhuma outra tela a usa.

---

## D144 · A regra é o relógio: uma claim com a data, `request.time`, e nenhum cron

**Status:** vigente · decidida em 2026-09-21, na spec `028-o-teste-acaba-e-a-assinatura.md`

**Contexto.** O `#d112` previa `ativas: { [contaId]: true | false }` na claim, reemitida por
um webhook, e um cron diário do Vercel derrubando `ativas` de quem venceu o teste — com
`vercel.json`, um segredo de cron e uma rota que varre todas as contas.

**Decisão.** A claim carrega uma data, não um booleano: `acessoAte: { [contaId]: msDaÉpoca }`.
A regra nega escrita quando `request.time.toMillis() > acessoAte[contaId]`, e não nega nada
quando a chave está ausente — ausência é "sem prazo", o mesmo "ausência tem significado" do
`#d141`. `/api/conta` escreve `acessoAte[contaId] = trialAte` na mesma `setCustomUserClaims`
que escreve `contas`; o webhook do Stripe escreve a data de novo a cada renovação. Nenhum
processo roda à meia-noite, nenhuma lista de contas é varrida, nenhum segredo de cron existe.
**Ler não tem prazo** (`allow read: if temAcesso()` continua como estava): conta vencida lê
tudo, o que a 029 (exportar) e a própria tela de vencida (que abre do cache) precisam.

**Consequência.** `firestore.rules` ganha `podeEscrever()` ao lado de `temAcesso()`, com o
mesmo custo de zero leitura do `#d07`. A publicação é segura **antes** do app: nenhuma claim
tem `acessoAte` ainda, então a regra nova é idêntica à antiga até `/api/conta` e o webhook
começarem a escrevê-la. Se a regra precisar de uma segunda dimensão um dia (bloqueio manual,
por exemplo), o booleano volta **ao lado** da data, não no lugar dela.

**Cumprido na 029.** A leitura sem prazo (`allow read: if temAcesso()`) é o que
`GET /api/conta/exportar` e a própria tela de vencida usam — a 029 é quem tinha ficado com o
prazo em aberto, e ele não existe: ler continua sempre permitido (`#d149`).

**Na 030, a claim da ajudante entra no mesmo mapa**, com o `acessoAte` copiado do documento da
conta no convite e renovado pelo webhook junto com o da dona (`#d155`).

---

## D145 · O estado da cobrança é derivado das datas; o webhook relê o Stripe e escreve a claim antes do documento

**Status:** vigente · decidida em 2026-09-21, na spec `028-o-teste-acaba-e-a-assinatura.md`

**Contexto.** O documento da conta precisa espelhar o que o Stripe diz, para a tela poder
avisar "não conseguimos renovar" antes de a escrita falhar de verdade — a claim não é
observável pelo Firestore, só o documento é. Mas gravar um campo `status: "VENCIDA"` exigiria
alguém para gravá-lo no dia certo, que é exatamente o cron que o `#d144` recusou.

**Decisão.** `status` (`"ATIVA"` hoje, `"ENCERRADA"` na 029) continua sendo do ciclo de vida da
conta, não da cobrança. "Vencida" não é escrito em lugar nenhum: é `agora > trialAte` ou
`agora > assinaturaAte`, calculado na leitura por `situacaoDaConta` (`src/lib/domain/assinatura.ts`),
como `ritmoDoEspelho` (`#d30`) já faz com tudo que depende do dia de hoje. O webhook **não
confia no evento**: os três eventos de assinatura podem chegar fora de ordem, e um `updated`
velho depois de um `deleted` reabriria uma conta cancelada — por isso ele pega só o id do
evento, chama `stripe.subscriptions.retrieve(id)` e decide sobre o estado atual. **A claim é
escrita antes do documento**, o inverso da ordem da 027 (`#d141`) pelo motivo oposto: lá o
documento vem primeiro porque a claim é o que abre o app; aqui o documento é o que a tela
observa (`useAuth().conta`), e se ele mudasse primeiro, `/assinatura/confirmando` forçaria o
token cedo demais e ainda pegaria o prazo velho.

**Consequência.** `Conta.stripeCustomerId`, `stripeSubscriptionId` e `assinaturaAte` (o mesmo
número da claim, em `Timestamp`) só existem depois da primeira assinatura, escritos só pelo
webhook. Uma chamada a mais por evento ao Stripe, contra um campo de "último evento visto" — os
eventos são poucos (uma dúzia por conta por ano), e a chamada é barata.

**Cumprido na 029.** `StatusDaConta` ganha `"ENCERRADA"`, escrita por `/api/conta/encerrar` e
lida pelo `AuthProvider` — continua sendo do ciclo de vida da conta, nunca da cobrança (`#d148`).

---

## D146 · O `stripe` entra pelo mesmo motivo do Admin SDK

**Status:** vigente · decidida em 2026-09-21, na spec `028-o-teste-acaba-e-a-assinatura.md`

**Contexto.** Criar uma Checkout Session e uma sessão do portal é um `POST` que `fetch` faria;
conferir a assinatura do webhook é HMAC-SHA256 com carimbo de tempo, que `node:crypto` faria em
poucas linhas. `firebaseAdmin.ts` já respondeu a essa pergunta para o JWT: criptografia é outra
classe de risco, e um erro ali não aparece como um pixel torto.

**Decisão.** `stripe` é a dependência de produção nova — a única desde o Módulo 0. Aqui o
estranho que um erro deixaria passar não gasta cota: **abre a conta de outra pessoa**, porque é
o webhook quem escreve `acessoAte`. Só `src/lib/server/stripe.ts` e as quatro rotas de
`src/app/api/assinatura/` e `src/app/api/stripe/` a importam; nada dela chega ao navegador —
nem `Stripe.js`, porque o checkout e o portal são uma URL para onde o navegador vai.

**Consequência.** `rg -n "from \"stripe\"" src/` devolve só `src/lib/server/` e
`src/app/api/`. Se o peso do pacote no build do servidor incomodar algum dia, a troca fica
contida nesses arquivos.

---

## D147 · O "feito com Rende" sai por uma caixa, para quem paga ou foi liberada à mão

**Status:** vigente · decidida em 2026-09-21, na spec `028-o-teste-acaba-e-a-assinatura.md`

**Contexto.** O `#d127` deixou o "feito com Rende" como linha fixa da folha, anotando que
desligá-la é o que uma assinatura paga compra — "até lá é uma linha fixa, e a 028 recebe a
nota".

**Decisão.** `ConfiguracaoGeral.ocultarFeitoCom?: true`, gravado só quando marcado e apagado
com `deleteField()` no contrário, como `frase` e o contato (`#d127`). A caixa mora no bloco "Na
folha do orçamento" de `/configuracao` e só aparece para `assinante` e `livre` — no teste, no
lugar dela, a frase "Assinantes podem tirar esta linha da folha." `montarOrcamento` copia o
campo para `Orcamento.negocio.feitoCom: boolean`, e a folha desenha a linha condicionalmente. A
folha **não consulta a situação da conta**: quem decide é a tela de configuração, e uma
assinante que deixou de pagar não abre a folha — está em `/assinatura`.

**Consequência.** A conta liberada à mão (`livre`) também ganha a caixa — foi considerado
limitá-la a `assinante`, mas a conta liberada à mão é cortesia, e cortesia é tudo o que a
assinatura dá. `FolhaOrcamento.tsx` lê `orcamento.negocio.feitoCom` em vez de desenhar a linha
sempre; sem a frase e sem o "feito com", o rodapé fecha sem buraco, como já acontecia sem a
frase (`#d127`).

---

## D148 · Encerrar é `status` mais claim fora, hoje; apagar é script, à mão, dias depois

**Status:** vigente · decidida em 2026-09-21, na spec `029-meus-dados-sao-meus.md`

**Contexto.** A LGPD dá direito à eliminação (art. 18, VI), e uma conta que fecha quer parar de
pagar sem depender de alguém ler uma mensagem. Mas "nunca apagar documento" é regra para dado de
negócio vivo — fichas e pedidos que outra coisa referencia —, e uma conta encerrada não tem
negócio vivo: o que sobra é o dado pessoal de quem pediu para sair.

**Decisão.** `POST /api/conta/encerrar` faz três coisas no servidor, **nesta ordem**: (1) cancela
a assinatura no Stripe, se houver — primeiro porque é o passo que pode falhar por motivo de fora,
e se falhar nada foi encerrado; (2) marca `status: "ENCERRADA"`, `encerradaEm: Timestamp.now()`,
`encerradaPor: uid` no documento; (3) tira a conta da claim (`contas` e `acessoAte` sem a chave).
Idempotente como `#d141`: toda volta bate na mesma rota e faz só o que faltou. **Nenhum documento
é apagado no toque.** A purga é `scripts/encerrar-conta.mjs`, rodado à mão dentro de
`DIAS_ATE_A_PURGA` (30) dias — o prazo que `/privacidade` passa a prometer — e é a única exceção
nomeada ao invariante "nunca apagar documento" do `CLAUDE.md`. O script apaga o login do Firebase
Auth junto com o documento; até lá, o login existe sem conta, e entrar nesse intervalo cai em
"Este login ainda não abre nenhuma conta", com `POST /api/conta` livre para abrir uma conta nova
(teste novo) se ela recadastrar — efeito colateral aceito, não consertado (ver Riscos da spec).

**Consequência.** `StatusDaConta` ganha `"ENCERRADA"` (reservado pelo `#d145`); `Conta` ganha
`encerradaEm?` e `encerradaPor?`. `firestore.rules` não muda: quem já não está no mapa `contas`
já não lê nem escreve, pelo mesmo mecanismo do `#d07`. `encerradaPor` é o único campo do sistema
que guarda um `uid` dentro do dado — existe só para o script achar o login a apagar depois que a
claim já saiu.

**A 030 estendeu o passo 3 a todos os membros**: cada ajudante sem `removidaEm` perde a chave
e ganha `removidaEm` no espelho, antes da dona (`#d155`). E só a dona encerra (`#d153`).

---

## D149 · A exportação sai do servidor por `listCollections()`, porque uma exportação do cache é silenciosamente incompleta

**Status:** vigente · decidida em 2026-09-21, na spec `029-meus-dados-sao-meus.md`

**Contexto.** O cliente já lê tudo — a regra permite, vencida ou não —, e um `getDocs` por
coleção mais `JSON.stringify` seria uma exportação sem rota nenhuma. Dois motivos recusam isso:
offline, o cliente devolve o cache do IndexedDB sem avisar, e um arquivo "meus dados" com metade
dos pedidos é pior que uma falha explícita; e `listCollections()` não existe no cliente — só o
servidor pode listar as subcoleções do documento sem que alguém mantenha uma lista à mão.

**Decisão.** `GET /api/conta/exportar` lê o documento e `listCollections()` no Admin SDK, e
transmite a resposta por `ReadableStream`, um `enqueue` por coleção — não monta em memória, porque
uma conta com fotos de produto gravadas como `data:` URL (`#d109`) passa dos 4,5 MB que a
hospedagem corta em resposta não transmitida. O arquivo é dado, não tela: dinheiro em centavos
inteiros, `Timestamp` vira ISO 8601, `formato: "rende-exportacao/1"` na frente para um futuro
importador.

**Consequência.** Toda spec futura que criar uma coleção sob `contas/{id}` entra na exportação
sem ninguém lembrar de acrescentá-la a uma lista — é o invariante "todo dado mora em
`contas/{contaId}/…`" pagando dividendo. `src/lib/domain/meusDados.ts` fica puro
(`paraExportavel`, `nomeDoArquivoDeExportacao`): a rota só monta o fluxo.

## D150 · A navegação inferior só com ícones

**Status:** vigente · decidida em 2026-09-21, na spec `035-o-celular-por-gesto.md`. Revista pelo
`#d240`: três destinos, o "+" e o ⋯, todos só com ícone.

**Contexto.** Cinco palavras embaixo de cinco ícones gastavam 20px de altura em toda tela do
celular, e depois da primeira semana ninguém as lia: "Hoje", "Materiais", "Produtos",
"Pedidos", "Caixa" são o que os ícones já dizem. Em 360×640 eram 20px de lista a menos.

**Decisão.** `NavegacaoInferior` não renderiza texto visível. Cada `<Link>` leva o rótulo em
`aria-label` e `title`, o ícone vai a 24px, a pílula `brand-100` atrás do ativo cresce para
32×56 e é o que diz "você está aqui". O alvo continua com 56px de altura. `Destino.curto` saiu
de `navegacao.ts`: sem leitor, não fica.

**Consequência.** A regra do `DESIGN.md` de que o rótulo de navegação é texto `ink-muted` deixa
de ter objeto; o contraste que resta conferir é o do ícone. O leitor de tela continua lendo os
cinco nomes.

## D151 · O "+" no cabeçalho e a bandeja, no lugar da pílula flutuante

**Status:** substituída pelo `#d240` e pelo `#d241` em 2026-09-30 · decidida em 2026-09-21, na
spec `035-o-celular-por-gesto.md`. Reverte a linha "nunca círculo com +" do `DESIGN.md`.

**Contexto.** A pílula flutuante cobria a última linha da lista e disputava o polegar com a
navegação. Em `/insumos` ela ainda dividia o cabeçalho com "Ler uma nota", que espremia o
título em 360px; em `/pedidos` o cabeçalho tinha três botões e o título. O que a regra antiga
protegia — "um + sozinho obriga a adivinhar o que nasce dele" — era verdade para um "+" que
age no toque.

**Decisão.** Nasce `src/components/ui/BotaoMais.tsx`, só no celular: o "+" com alvo de 44px, só
o traço em `accent-500` sobre a tinta do cabeçalho — sem círculo, é o único ponto de acento na
faixa —, `aria-label` dado pela tela, `aria-haspopup="dialog"`, em `acao` do
`CabecalhoPagina`. Abre o `Painel` que já existe — no celular a folha inferior, com foco preso,
`Escape` e `inert` — com uma linha por ação: ícone, nome, alvo de 52px, lista com divisórias. A
primeira linha é a de criar. Opção sem rede fica `aria-disabled` com a razão embaixo do nome
(`MENSAGEM_FALHA["sem-rede"]` em "Ler uma nota"). Escolher fecha a bandeja; o `Link` navega, o
`onClick` roda depois de fechar. As três listas (`/insumos`, `/fichas`, `/pedidos`) e `/financeiro` usam o
"+"; com uma opção só (`/financeiro`, "Lançar") não há o que escolher, e o "+" age no toque com
o nome dela em `aria-label`. `BotaoFlutuante` morre, e os atalhos do cabeçalho (`EntradaLeitura`,
`EntradaContagemPronto`, `AtalhoParaCompras`, `AtalhoParaClientes`) ficam `hidden
lg:inline-flex`. O "+" some com o estado vazio, como a pílula sumia: um botão primário por
tela. Nem Popover API nem `<details>`: a invariante é folha inferior no celular, e o `Painel`
já é ela.

**Consequência.** A linha do `DESIGN.md` vira: no celular a ação primária da tela é o "+"
no cabeçalho, com bandeja quando há mais de uma ação e direto quando há uma só; a pílula
flutuante não existe mais (a spec a deixava em `/financeiro`; quem conduz o projeto pediu que
saísse na mesma sessão). No celular, com a lista vazia, `/pedidos` não tem mais o atalho para
`/compras` no cabeçalho (o cartão da tela Hoje continua levando lá).

## D152 · O editor sem navegação inferior: o gesto do sistema é o voltar

**Status:** vigente · decidida em 2026-09-21, na spec `035-o-celular-por-gesto.md`

**Contexto.** `/fichas/[id]` e `/pedidos/[id]` carregavam três faixas fixas no celular —
cabeçalho grudento, resumo de custo preso ao pé e, embaixo dele, a navegação inferior — e só
uma trabalhava. Ninguém troca de módulo no meio de um formulário (o `#d74` já a escondia com o
teclado aberto), e os 72px entre o resumo e o pé eram vão. O aparelho de hoje volta por gesto
de borda, e o cabeçalho já tem o voltar.

**Decisão.** `semNavegacaoInferior(caminho)` em `navegacao.ts` — `/^\/fichas\/(?!contagem$)[^/]+$/`
ou `/^\/pedidos\/[^/]+$/` — e `NavegacaoInferior` devolve `null` nessas rotas. `/fichas/contagem`
e `/pedidos/[id]/orcamento` ficam de fora: a contagem tem a navegação, a folha do orçamento é
impressão. `RodapeFixo` ganha `noPe`: no celular vai a `bottom-0`, ocupa a largura toda, e o
cartão perde o raio e as bordas de fora, com `area-segura-inferior` por dentro — a superfície
continua até embaixo do indicador do iPhone. `PainelPreco` e `PainelPedido` passam `noPe`; o
respiro dos dois formulários encolhe junto (`pb-32` na ficha, `pb-36` no pedido). `AppShell`
não muda: o `pb-24` do `main` continua reservando o rodapé, que agora ocupa a faixa que era da
navegação.

**Consequência.** A saída do editor é o `LinkVoltar` e o gesto do sistema, os dois pela guarda
de "sair sem salvar" (`#d132`; o gesto é `popstate`, que a sentinela já intercepta). Outras
telas de formulário não seguem: `/configuracao` tem barra própria e é destino do menu Hoje.

## D153 · O papel vira vocabulário, e a regra o confere

**Status:** vigente · decidida em 2026-09-23, na spec `030-a-ajudante.md` (sessão A). Supera
a primeira das três ressalvas do `#d14`.

**Contexto.** O `#d14` deixou o papel como string livre e a regra conferindo só a presença da
chave, "até existir o segundo tipo de acesso". A ajudante é esse segundo tipo: sem papel na
regra, o segundo login numa conta é outra dona — abre o caixa, muda a margem, encerra a conta.

**Decisão.** `PapelNaConta = "DONA" | "AJUDANTE"` em `src/lib/types/conta.ts`, e
`ContasDaClaim = Record<string, PapelNaConta>`. Dois valores: o contador de leitura do `#d14`
continua fora, sem caso. **Valor desconhecido é ajudante, nunca dona** — `papelDaClaim`
(`src/lib/domain/ajudante.ts`) no `AuthProvider`, `ehDona` (`=== "DONA"`) no servidor, e na
regra só `== 'DONA'` concede o que é da dona. A spec esboçava a regra com
`ehAjudante() = contas[contaId] == 'AJUDANTE'` e `!ehAjudante()` para conceder; isso deixaria
um valor desconhecido com poder de dona, o contrário do que o próprio parágrafo pedia. A regra
escrita confere `ehDona()` e nega pela ausência dele.

**Consequência.** `ehDona` mora em `firebaseAdmin.ts`, ao lado de `abreAConta`, e passou a ser
a porta de `/api/conta/membros`, **e também** de `/api/conta/encerrar`, `/api/conta/exportar`,
`/api/assinatura/checkout` e `/api/assinatura/portal`. Não estava na lista da spec, e é a
metade servidor da mesma chave: com `abreAConta`, uma ajudante encerraria a conta, exportaria o
caixa que a regra lhe nega, abriria o portal da assinatura da dona ou criaria um checkout com o
próprio `uid` na metadata — tudo por `curl`, sem tela nenhuma. `/api/nota` continua em
`abreAConta`: ler nota é cadastrar material, que é trabalho. `AuthProvider` expõe `papel` e
`usePapel()`; com uma conta só de dona, nada muda na tela.

---

## D154 · A regra fecha por coleção, porque regra se soma por OU

**Status:** vigente · decidida em 2026-09-23, na spec `030-a-ajudante.md` (sessão A)

**Contexto.** A leitura ingênua seria acrescentar `match /configuracao/{doc}` negando a
ajudante ao lado do `match /{documento=**}` que já existia. No Firestore, quando duas regras
casam com o mesmo caminho, o acesso é concedido se **qualquer uma** permitir: a regra
restritiva ao lado da permissiva não nega nada.

**Decisão.** A recursiva vira `match /{colecao}/{documento=**}`, que casa com o mesmo que
antes e sabe o nome da coleção, e a restrição mora dentro dela: a ajudante não lê nem escreve
`transacoes`, `metas` e `agregados` (o dinheiro); lê e não escreve `configuracao` (a ficha
precisa dela para calcular); ninguém escreve `membros` do cliente (`#d155`); o documento da
conta só a dona escreve. Zero leitura, como o `#d07`: o que a regra usa é o token e o caminho.
**Na sessão B**, uma concessão ao lado: `agregados/global` (o contador que ninguém lê) é
escrito por quem pode escrever, ajudante inclusive (`#d157`). Concessão ao lado soma; é
restrição ao lado que não nega.

**Consequência.** Quem "simplificar" a regra para uma lista de `match` por coleção reabre o
caixa para a ajudante — o comentário no arquivo diz isso. `clientes` continua legível para a
ajudante (o editor de pedido escolhe a cliente nela); o que a esconde é a tela, e está escrito
assim na spec. A regra é compatível com o app velho: numa conta só de donas, `ehDona()` é
verdadeiro em todo lugar e nada muda. Publica **antes** do app (`DEPLOY.md`).

---

## D155 · `membros` é espelho escrito só pelo servidor; a claim continua sendo a verdade

**Status:** vigente · decidida em 2026-09-23, na spec `030-a-ajudante.md` (sessão A)

**Contexto.** A claim diz quem abre a conta, mas não é consultável: responder "quem tem acesso
ao meu negócio?" exigiria `listUsers` varrendo todos os logins do projeto. E o webhook do
Stripe renovava `acessoAte` só no `uid` da metadata — a dona —, então a ajudante pararia de
salvar no dia em que o teste original venceria, numa conta paga em dia.

**Decisão.** `contas/{contaId}/membros/{uid}` (`Membro`: `email`, `papel`, `convidadaEm`,
`convidadaPor`, `removidaEm?`, `v`), um por ajudante, escrito só por `/api/conta/membros` com o
Admin SDK. A dona não tem documento: ela é o `uid` da metadata e o `encerradaPor`. Tirar o
acesso grava `removidaEm` e tira a chave da claim; o documento fica — o invariante "nunca
apagar" segue sem exceção nova, e fica o registro de quem teve acesso e até quando. O convite
copia `acessoAte` do documento da conta (`assinaturaAte ?? trialAte`), sem chave quando a conta
não tem prazo. O webhook percorre a dona e cada membro sem `removidaEm`, sequencial;
`/api/conta/encerrar` tira a claim de cada membro ativo **antes** da dona, para que uma volta
que caia no meio ainda encontre a dona com acesso e termine o laço na repetição.
`tirarContaDaClaim` (`firebaseAdmin.ts`) é o único código que tira uma conta de uma claim.

**Consequência.** O espelho não autoriza nada: o dia em que discordar da claim, a claim ganha.
Leitura sem `where` (campo ausente não casa com `== null`) e sem índice — são até
`LIMITE_DE_AJUDANTES` (5) documentos. `scripts/encerrar-conta.mjs` não mudou: a varredura de
`listUsers` já acha a ajudante, e o ramo "sobrou outra conta, só tira a chave" era este caso.

**Na 032, o webhook também tira** (`#d170`): assinatura viva de um pacote sem ajudante faz no
laço o mesmo que o `DELETE` de `/api/conta/membros`.

---

## D156 · A ajudante não paga: conta vencida com login de ajudante é uma tela sem checkout

**Status:** vigente · decidida em 2026-09-23, na spec `030-a-ajudante.md` (sessão B)

**Contexto.** A claim da ajudante vence junto com a da dona — é o mesmo `acessoAte`, copiado no
convite e renovado pelo webhook (`#d155`). O `(app)/layout.tsx` manda toda conta vencida para
`/assinatura`, que oferece dois cartões de preço e o portal: oferecer isso a quem não é dona é
pedir que a ajudante pague a assinatura do negócio de outra pessoa.

**Decisão.** `/assinatura`, com `papel === "AJUDANTE"`, tem um ramo antes dos estados de
`situacaoDaConta`: título "O acesso a este negócio está suspenso", uma linha mandando falar com
a dona, e "Sair". Sem cartão de preço (e sem buscar os preços), sem portal, sem `MeusDados`.
Antes de vencer a tela não existe para ela: qualquer estado que não seja `vencida` volta para
`/`, e a `FaixaDoTeste` não monta na tela Hoje — prazo de cobrança não é assunto de quem ajuda
até virar bloqueio. As rotas de checkout e portal já recusavam a ajudante no servidor (`ehDona`,
`#d153`); a tela só deixa de oferecer o que o servidor negaria.

**Consequência.** A conversa sobre pagar é entre as duas, fora do app. Se a dona demora, a
ajudante fica parada numa tela que diz exatamente isso, e não numa que finge que ela resolve.

---

## D157 · O que a ajudante continua vendo, e por quê: o custo do produto é dela também; o caixa não

**Status:** vigente · decidida em 2026-09-23, na spec `030-a-ajudante.md` (sessão B)

**Contexto.** A regra da sessão A (`#d154`) nega à ajudante `transacoes`, `metas` e `agregados`,
e a escrita em `configuracao`. Escrita recusada pela regra falha calada (`#d80`): toda tela que
oferecer à ajudante algo que escreva ali é um botão que parece funcionar e não grava.

**Decisão.** A régua: **o que ajuda a produzir e entregar é das duas; o que diz quanto o negócio
ganha é da dona.** Some da tela dela, por ausência e nunca por aviso: "Caixa" na navegação (quatro
destinos), `/financeiro`, `/clientes`, `/comecar` e `/insumos/nota` (`ROTAS_SO_DA_DONA`, com o
`(app)/layout.tsx` devolvendo para `/`), os cartões de primeiros passos, meta e teste na tela
Hoje, o atalho de clientes e a faixa "Entregas a pagar" em `/pedidos`, o bloco de receber no
pedido (com as assinaturas de `agregados` e `metas` passando `null`), e `/configuracao` reduzida
ao cabeçalho, uma linha e "Sair". **Continua**: a ficha inteira com custo e preço, o pedido
inteiro com valor e itens, "A receber" em `/pedidos`, materiais, lista de compras, contagem e
fornada. Esconder o custo custaria uma segunda versão do editor de produto para proteger um
número que quem pesa a farinha estima sozinha. `clientes` continua legível na regra (o editor de
pedido escolhe a cliente nela); some só `/clientes`, que é faturamento por pessoa.

**O que a spec não previu, e esta sessão fechou** (decidido com quem conduz o projeto):

- **O contador `agregados/global`.** Criar material, produto ou cliente incrementa
  `totalInsumos`/`totalFichas`/`totalClientes` — lidos por ninguém (`#d67`). Negado à ajudante,
  o material gravava e o contador saía como `permission-denied`; na biblioteca o incremento vai
  no mesmo `writeBatch`, e o lote inteiro falharia. A regra ganhou uma concessão ao lado da
  recursiva, `match /agregados/global { allow write: if podeEscrever(); }`. Ao lado, e não
  dentro, porque é concessão: a soma por OU só abre, e o que o `#d154` proíbe é restrição ao
  lado. A ajudante escreve o contador e continua sem ler nada de `agregados`.
- **A nota fiscal é da dona.** Ler a nota consulta `transacoes` (a guarda de duplicidade) e lança
  a compra no caixa. `/insumos/nota` entrou em `ROTAS_SO_DA_DONA`; `EntradaLeitura`, o aviso
  de sem rede, a opção da bandeja de `/insumos` e "Fechar e ler a nota" em `/compras` somem.
- **O pedido pago abre sem "Salvar" e sem "Cancelar".** Salvar um pedido pago corrige o
  lançamento e o agregado do mês (`atualizarPedido`); cancelar desfaz o pagamento. Os dois
  seriam negados, e o pedido gravaria com o caixa divergindo. Para a ajudante, o pedido pago
  continua andando de estado (pronto, entregue), com WhatsApp e fornada; a guarda de saída não
  monta, porque não há o que salvar. O pedido não pago segue igual para as duas.
- **"Como funciona" some da barra lateral e de `/configuracao`.** A spec deixava "Como
  funciona" na configuração da ajudante, mas ele leva a `/comecar`, que ela mesma põe entre as
  rotas da dona (e que lê `transacoes`). Sobra "Sair".

**Consequência.** A ajudante vê o custo e o preço de cada produto: é dívida anotada, a reabrir se
alguém pedir, e não esquecimento. A régua vale para a próxima tela: o que escreve em dinheiro
nasce com `usePapel()` na condição.

---

## D158 · O cardápio é lido pelo servidor, e a regra continua sem nada público

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão A).
Diverge do roadmap, que previa um espelho `contas/{id}/publico/cardapio` e a primeira
`allow read: if true` do arquivo.

**Contexto.** O cardápio é a primeira tela do Rende que alguém sem login abre. O roadmap
desenhava um espelho das fichas escrito pelo aparelho dela e lido direto do Firestore pelo
navegador da cliente, com uma regra pública só nesse documento.

**Decisão.** `/c/[contaId]` é componente de servidor: `src/lib/server/cardapio.ts` lê a conta, a
configuração e as fichas da lista (`getAll`, até `LIMITE_DO_CARDAPIO`, 40) com o Admin SDK, e
`montarCardapio` (`src/lib/domain/cardapio.ts`, puro) devolve só o que é público: da conta,
`nome` e o primeiro nome de `proprietaria`; da configuração, `frase`, o telefone já como número
de WhatsApp e o Instagram sem `@`; da ficha, `nome`, `descricao`, `categoria`, `precoVenda`, o
rótulo da unidade e a versão da foto. O teste confere as **chaves** do objeto devolvido com uma
ficha que tem custo, margem, itens e modo de preparo. `firestore.rules` não muda uma linha.
Quatro motivos: o espelho envelheceria a cada caminho de escrita esquecido (a ajudante mudando
um preço, a biblioteca em lote); não caberia (foto de até 200 KB por produto, documento de
1 MiB); a regra pública seria a primeira exceção do arquivo; e o pedido (sessão B) já passa pelo
servidor. A página guarda por 60 s (`revalidate`, com `generateStaticParams` vazio: o build a
lista como ● ISR). Os cinco "não está aberto" — sem configuração, `aberto` falso, conta
encerrada, conta vencida, nenhum produto que entre — e a conta que não existe dão a mesma página
de não encontrado. O id da URL passa por `/^[A-Za-z0-9_-]{1,64}$/` antes de virar caminho.

**Consequência.** A página depende do servidor e da credencial (`FIREBASE_SERVICE_ACCOUNT`); sem
ela, não encontrado. O preço novo aparece em até um minuto. O link é o `contaId`: um endereço
bonito exigiria um índice global fora de `contas/`, que a regra de ouro proíbe. Na primeira
renderização a frio, o não encontrado saiu com status 200 (o conteúdo certo, `noindex`); depois
da revalidação o cache serve 404. Não vale conserto: quem abre vê a mesma página.

---

## D159 · O cardápio é escolha dela, e mora na configuração

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão A).
Diverge do roadmap ("espelho das fichas ativas com preço").

**Contexto.** Toda ficha ativa com preço inclui as fichas-modelo da biblioteca, o recheio
cadastrado como produto para calcular e o produto que ela parou de fazer e não arquivou.

**Decisão.** `ConfiguracaoGeral.cardapio?: { aberto, fichaIds }`, ausente = fechado, escrito só
por `salvarCardapio` (`mutations/configuracao.ts`, `setDoc` com `merge`, despachado) a cada toque
do painel "Seu cardápio" em `/configuracao`. Não é um `noCardapio` na ficha: seria mais um campo
no editor de produto, a tela que a 020 esvaziou. Entra (`entraNoCardapio`): não arquivada,
`ativo`, `precoVenda > 0`, unidade `un` ou `porcao`, e não é combo à escolha. Ficha que deixa de
entrar some da página sem sair da lista, e volta sem ela remarcar. É da dona por construção: a
ajudante não escreve `configuracao` (`#d154`) e não vê a prateleira.

**O que a spec não previu, e esta sessão fechou:**

- **Conta que nunca salvou a configuração.** `salvarCardapio` criaria `configuracao/geral` só
  com `cardapio`, e `rateioDaConta` passaria a confiar num documento sem `operacional`. O painel,
  sem documento, pede para salvar a configuração uma vez antes de abrir.
- **WebP na foto.** A rota da foto (`#d162`, a registrar na sessão B) aceita `image/webp` além
  dos dois tipos da spec: é o que o `CampoImagem` grava para foto transparente onde o navegador
  codifica WebP. Sem isso, essas fotos dariam 404 na vitrine. `tipoDaFoto` decide para a página
  e para a rota.
- **A frase do interruptor** diz "quem tem o link vê os produtos e fala com você", e não "vê e
  pede": na sessão A a página ainda não recebe pedido. A B troca a frase.

**Consequência.** A página lê um documento para saber quais fichas buscar, e busca só essas, sem
consulta nem índice. O limite de 40 conta os ids da lista, inclusive os que deixaram de entrar,
porque é sobre a lista que o servidor corta.

---

## D160 · O pedido do cardápio nasce orçamento, com o preço do servidor

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão B).

**Contexto.** A página do cardápio é aberta por quem não tem login, e o pedido que sai dela
precisa cair em `/pedidos` sem que a dona digite tudo de novo. Preço vindo do navegador de um
estranho não se grava.

**Decisão.** `POST /api/cardapio/pedido` recebe **ids e quantidades** (`esquemaPedidoDoCardapio`),
relê a conta, a configuração e as fichas da lista (`lerContaDoCardapio`, a mesma leitura da
página), passa por `montarCardapio` (fechado é `fechado`, sem segunda opinião) e monta o pedido
por `pedidoDoCardapio` (`src/lib/domain/cardapio.ts`, puro): cada item conferido contra a lista e
contra `entraNoCardapio` (senão `mudou`), `precoVenda` e `custoUnitario` **de agora**, a mesma
ficha em duas linhas somada numa, e os totais por `derivarPedido`. O documento é um `Pedido`
comum: `status: "ORCAMENTO"`, `pago: false`, `origem: "CARDAPIO"`, sem `clienteId`,
`entrega.taxa: 0`, `desconto: 0`, `custoTaxaPagamento: 0`. Um `set`, e o objeto inteiro passa por
`satisfies Omit<Pedido, "id">`. A data vai de amanhã a hoje + 90, com "hoje" de Brasília
(`hojeEmBrasilia`) e `dataEntrega` na meia-noite de Brasília (`meiaNoiteEmBrasilia`), porque o
servidor roda em UTC. O código do pedido sai da data de Brasília pelo mesmo motivo.

**O que a spec não previu, e esta sessão fechou:**

- **Ausente, e não `null`.** A spec pedia `endereco: null` na retirada e `formaPagamentoId: null`.
  O tipo `Pedido` não aceita `null` nesses campos, e o `satisfies` recusaria. `corpoDoPedido` grava
  `null` porque o mesmo corpo serve ao `updateDoc`; aqui é só criação, e ausente é o mesmo "não
  tem". `observacoes` vazia também fica ausente.
- **"Meu nome é Ana", e não "Sou a Ana"**, na mensagem de aviso. Quem pede pode ser homem, e o
  texto sai no nome dele, pelo polegar dele. E **"no sábado" / "no domingo"**, e não "na" para
  todo dia: `rotuloDiaPorExtenso` dá o nome, `mensagemDeAviso` põe o artigo. Com entrega, o total
  diz "sem a entrega".
- **Dia que não existe** (`2026-09-31`) é `data`: passa na expressão regular e não no calendário.
- **O selo na lista é `Marcador`, e não `Selo`.** A linha de pedido tem uma pílula só, a do status;
  pago e entrega já são marcadores sem fundo pela largura de 360px. "Pelo cardápio" segue a mesma
  régua na lista, com o ícone `Store`; no editor, onde há espaço, é `Selo` neutro ao lado do status
  no bloco "Em que pé está" (o `CabecalhoPagina` esconde a descrição no celular).

**Consequência.** O pedido não é idempotente: dois toques em "Enviar" são dois orçamentos; o botão
fica desabilitado enquanto envia. Entre a dona mudar um preço e a página renovar (60 s), a cliente
vê o preço de antes e o pedido grava o novo; a tela de enviado mostra o total que o handler
devolveu. `atualizarPedido` não conhece `origem` e não o apaga.

---

## D161 · O freio é um teto de orçamentos em aberto, e não um captcha

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão B).

**Contexto.** Uma rota que escreve sem login vai receber lixo.

**Decisão.** Três defesas, da mais barata para a mais cara. **O esquema** (nome de 2 a 80, telefone
que `telefoneParaWhatsApp` aceita, 1 a 30 linhas, quantidade inteira de 1 a 500 também depois de
somar a mesma ficha, endereço até 200, observação até 500). **O pote de mel**: um campo `site`
fora da tela, `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`; preenchido, a rota responde
200 com `{ codigo: null }` sem ler nem gravar. **O teto**: `count()` de `origem == "CARDAPIO"`,
`status == "ORCAMENTO"`, `arquivado == false`, e a partir de `LIMITE_DE_ORCAMENTOS_EM_ABERTO` (20)
a rota responde `cheio` (429) e a página oferece "Falar no WhatsApp". Só igualdades: rodou contra o
projeto de verdade sem pedir índice composto. Sem captcha (serviço externo, script de terceiro na
página da cliente dela, um passo a mais em todo pedido real) e sem limite por IP (uma escrita por
requisição, inclusive das recusadas). O `ponytail:` no topo do handler diz quando o Turnstile entra.

**Consequência.** No pior caso, vinte orçamentos de lixo para ela cancelar, e a próxima cliente de
verdade vai para o WhatsApp, que é para onde ia de qualquer jeito. Uma cliente com preenchedor
automático que escreve em campo escondido perderia o pedido sem saber; o roteiro não cobre isso.
Se o teto morder cliente de verdade, o número sobe; não vira configuração.

---

## D162 · A foto sai por rota própria, e não dentro da página

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (codificada na
sessão A, registrada na B, como a spec divide).

**Contexto.** A foto é `data:` URL dentro da ficha (`#d109`). Como `src` na página, viajaria duas
vezes (no HTML e no pacote de dados do React) e sem `loading="lazy"`, que não vale para `data:`.

**Decisão.** `GET /c/{contaId}/foto/{fichaId}?v={atualizadoEmMs}` decodifica o `data:` URL e
devolve os bytes com o `Content-Type` do prefixo (`tipoDaFoto`: jpeg, png e webp, `#d159`) e
`Cache-Control: public, max-age=31536000, immutable`. O `?v=` é o `atualizadoEm` da ficha: foto
trocada é URL nova. 404 quando o cardápio está fechado, a ficha não está na lista ou não entra.
A página usa `<img loading="lazy" decoding="async" width height>`, sem `next/image`. Na sessão B
as linhas de produto passaram para o componente de cliente (`PedidoPeloCardapio`), e o
`Cardapio` que ele recebe continua sem foto nenhuma dentro: só `fotoVersao`.

**Consequência.** A rota lê a configuração e a ficha a cada foto não cacheada; com a URL imutável,
é uma vez por versão por borda. Se pesar, é a foto que migra para o Storage, e a URL da página
continua a mesma.

---

## D163 · A economia do combo é contra o preço que a própria página cobra

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão C).

**Contexto.** Kit sem escolhas já entrava no cardápio desde a A, mas como um produto qualquer:
"Caixa com 6 · R$ 60,00", sem dizer que sai mais barato que seis avulsos. O combo à escolha
ficava fora (`#d159`), porque pede a tela de escolha da 014 do lado da cliente.

**Decisão.** Todo número de economia na página é uma conta que a cliente confere rolando a tela.
**Kit fixo:** `avulso` = soma de `quantidade × preço` de cada ficha de dentro, só quando **toda**
ficha de dentro está na página (na lista e `entraNoCardapio`) e `avulso > preco`; a página diz
"Separados sairiam R$ 69,00 · você economiza R$ 9,00", em texto, sem selo. **Combo à escolha:**
`entraNoCardapio` perde a exclusão; as opções de cada escolha são `opcoesDaEscolha` (`#d99`) mais
`ativo`, ordenadas por nome; opção fora da lista entra no combo **sem `preco`** e fica fora da
conta. `economiaMinima` é a combinação mais barata entre as opções com preço, só quando positiva:
"economize pelo menos", e não "até", porque "pelo menos" é verdade para toda combinação.
`economiaDoCombo` dá a conta exata na tela "Monte a sua…" e devolve `null` quando alguma opção
escolhida não tem preço. Combo com uma escolha sem opção viva some da página. O que sai para fora
a mais: o nome das opções. `pedidoDoCardapio` confere as escolhas (combo sem elas ou kit fixo com
elas → `fora-de-forma`; opção que não serve mais → `mudou`; `escolhasCompletas` falso →
`fora-de-forma`), grava `EscolhaFeita` com o custo de agora e `custoDoComboMontado` na linha
(`#d100`), e junta linhas por ficha **e** escolhas. `Pedido.fichaIds` ganha as escolhidas, como
em `corpoDoPedido`.

**Fora da spec, e por quê.**

- **O handler lê as opções como a página**, por categoria, e não um `getAll` só das citadas. É a
  mesma `lerContaDoCardapio`, e por isso a mesma `montarCardapio` decide `fechado` nos dois
  lugares: com só as citadas, um combo cujas opções o pedido não cita sumiria da montagem do
  handler e mudaria a resposta dele. Custa uma consulta por categoria de combo por pedido, que é
  raro.
- **Combo à escolha com parte fixa** (`componentes` e `escolhas` no mesmo kit) não mostra economia:
  as opções saem sem preço. A página não carrega o preço da parte fixa, e mostrar a economia sem
  ela seria número inventado. `ponytail:` em `comboDoCardapio`; um campo com essa soma quando um
  combo assim entrar num cardápio.
- **O "Adicionar" do combo continua "Adicionar"** mesmo com unidades no pedido, com "2 no pedido"
  ao lado: cada unidade pode ter outros sabores, e o passo de quantidade dela mora no carrinho.

**Consequência.** A página lê, além das fichas da lista, uma consulta de igualdade por categoria
de escolha, sem índice, dentro dos 60 s do `revalidate`. Um sabor novo entra no combo no dia em
que nasce, sem ela remarcar; se não estiver na lista, entra sem preço e sem conta.

## D164 · "Restam" é o pote menos o que os pedidos levam, e o servidor trava

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão D).

**Contexto.** A A pôs "esgotado" fora de escopo: o cardápio de encomenda vende o que ainda vai ser
feito. Continua certo para quase tudo, mas há o produto que ela faz uma vez e vende até acabar. O
pote da 013 (`estoqueProntoAtual`) é uma medição com data, e não um saldo (`#d97`): a fornada soma
na projeção, e o que sai do pote o sistema não vê. Lido direto, "Restam 8" nunca desceria.

**Decisão.** Exceção **por produto, escolhida por ela**: `cardapio.limitados`, subconjunto de
`fichaIds`, marcado na seção "Quantidade limitada" do painel. `restamNoPote` =
`projecaoDoPronto(...).prontos` − as unidades da ficha nos pedidos não cancelados e não
arquivados com `dataEntregaISO >` a contagem — a linha, as escolhas × quantidade e os componentes
dos kits da lista (`unidadesPorFicha`). Orçamento desconta: a página nunca vende o que já foi
pedido, e o teto do `#d161` limita o estrago do lixo. Sem contagem que valha (nunca contou, ou
venceu pela régua da 013), o produto não mostra número e não trava; o painel avisa ela com
triângulo e texto. A página diz "Restam N" e, no zero, "Esgotado" no lugar do "Adicionar"; o "+"
da vitrine, do carrinho e da tela de montar para no que resta **menos o que o carrinho já leva**.
O handler relê tudo e recusa `acabou` (409) quando o pedido passa do que resta
(`passaDoQueResta`); a página trata como `mudou`. O que sai para fora a mais: `restam` no produto
e na opção de combo, e só nos limitados.

**Fora da spec, e por quê.**

- **`limitadasComContagem`**, no domínio: a mesma régua (na lista, `entraNoCardapio`, `temPronto`,
  contagem que vale) decide na página se há leitura a mais e no handler se o pedido leva algum
  limitado. Sem nenhum, zero leituras novas.
- **O handler só lê fornada e pedido quando o pedido leva um limitado com contagem**, e a página
  sempre que há um. As duas consultas são de intervalo em campo único (`dataISO >`,
  `dataEntregaISO >`) desde a contagem mais antiga, e o resto filtra em memória: nenhum índice
  composto.
- **Desmarcar um produto do cardápio o tira dos limitados**, para `limitados ⊆ fichaIds` valer
  no documento, e não só na leitura.
- **Kit fixo não ganha `restam`.** A página não sabe o que tem dentro do kit (os componentes não
  saem, `#d158`), então a Caixa com 6 não para no "+" quando o Tradicional acaba; o handler recusa
  com `acabou`, e a página recarrega. Um `restam` derivado no kit quando isso aparecer.
- **"No pote: 30, contado ontem"** mostra a contagem, e não a projeção: o painel não assina as
  fornadas, e "contado" diz de onde o número vem.

**Consequência.** `ponytail:` componente de kit que não está na lista não desconta, e duas
clientes no mesmo segundo podem levar as últimas unidades duas vezes (o número é derivado de
consultas, não um contador; o que escapa é um orçamento que ela recusa). Contador gravado quando
isso acontecer com cliente de verdade.

## D165 · A promoção desconta do preço de sempre, e tem dia para acabar

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão E).

**Contexto.** O pedido de origem era subir o preço mostrado em 20% acima do praticado e anunciar
a promoção contra esse número. **Não foi feito.** Preço "de" que nunca foi cobrado é publicidade
enganosa (CDC, art. 37, §1º), quem responde é a confeiteira, e a cliente que compra toda semana
sabe quanto custa o cookie.

**Decisão.** `cardapio.promocoes?: PromocaoDoCardapio[]` (`fichaId`, `preco` em centavos,
`ateISO`), aditivo e opcional, uma por ficha. O preço riscado é o `precoVenda` da ficha;
`precoVigente` devolve o da promoção só enquanto `0 < preco < precoVenda` e `hoje <= ateISO`
(dia de Brasília), e o de sempre no resto — a promoção acaba sozinha no dia seguinte e deixa de
valer quando ela baixa a ficha até o preço da promoção. A página (`preco`, `precoCheio`,
`promocaoAteISO`), o `avulso` e a opção do combo (`#d163`) e o `precoUnitario` do pedido passam
pela mesma função. O percentual é arredondado para baixo (2/13 = 15,4% → −15%), e o selo diz
"até sexta-feira, 25 de setembro" ou "termina hoje", sem contador. O painel recusa por
`problemaDaPromocao` (sem preço, igual ou acima do de sempre, fora de hoje a hoje + 30), mostra
"Sobra pra você" (preço − `custoUnitario`) e avisa abaixo do custo sem impedir. Nenhum campo
novo em `Pedido`: o lucro estimado já mostra o que a promoção custou.

**Fora da spec, e por quê.**

- **`seloDaPromocao`**, no domínio: o texto do selo com o percentual e o prazo, testado; com
  percentual que arredonda para 0 (um centavo de desconto), diz "Promoção" em vez de "−0%".
- **A limpeza vai além da vencida.** Todo toque no painel regrava só as promoções que valem hoje
  e cujo produto está marcado. Uma promoção escondida (a ficha baixou de preço) voltaria sozinha
  se ela subisse o preço de novo, e isso seria uma promoção que ela não vê no painel.
- **O dia do painel é o do aparelho** (`dataISODe`), como a contagem da D; a página e o handler
  usam o de Brasília. Só diverge fora do fuso, e o pior caso é o `min` do campo um dia fora.
- **O erro mora no campo que o causa** (`aria-invalid` no preço ou na data), e não numa linha
  solta abaixo do formulário.

**Consequência.** `ponytail:` o sistema não confere se o preço de sempre é praticado há tempo —
a ficha não guarda histórico de preço. Subir a ficha na véspera é o mesmo truque, feito à mão; o
painel diz em uma linha que o riscado precisa ser o que ela cobra fora da promoção. Um
`precoVendaDesdeISO` na ficha, se um dia o Rende precisar provar isso.

## D166 · A página é da loja: capa, logo e cor dela, e o Rende numa linha de rodapé

**Status:** vigente · decidida em 2026-09-23, na spec `031-cardapio-publico.md` (sessão F).

**Contexto.** Quem conduz o projeto pediu ao Claude Design a tela do cardápio público
(`docs/marca/rende/Rende - Cardápio.dc.html`) e preferiu o resultado ao que a A e a B tinham
entregue. A premissa de lá: a página é da confeiteira, e não do Rende. Antes de implementar, o
design passou pelo `/impeccable critique`: **24/40**, com o veredito "template de iFood com o
papel do Rende por baixo", e o detector com 9 achados (contraste do rodapé, papel creme,
enchimento apertado). As correções da crítica entraram junto com o design.

**Decisão.**

- **`contas/{id}/configuracao/vitrine`** (`VitrineDoCardapio`): `capa?`, `logo?` (`data:` URL,
  como a foto do produto, `#d109`) e `cor?` (`#rrggbb`). É um documento à parte de `geral`
  porque as imagens pesam (capa até 300 KB, logo até 120 KB), e `geral` sobe com o app inteiro.
  O painel só o assina com "Seu cardápio" aberto. A regra não muda: `configuracao/*` já era da
  dona (`#d154`). A exportação e a purga já cobrem o documento, porque as duas listam as
  coleções.
- **As imagens saem por rota**, `/c/{contaId}/vitrine/{capa|logo}?v=`, pelo mesmo caminho da
  foto (`#d162`): nunca dentro do HTML, cache imutável por versão, e 404 com o cardápio fechado.
  A página só recebe `capaVersao`, `logoVersao` e a cor.
- **A cor é sempre fundo, e nunca texto sobre o papel.** Vale a mesma regra do âmbar do Rende,
  e é ela que deixa qualquer cor passar. `corDaLoja` calcula pela luminância da WCAG qual tinta
  lê melhor sobre a cor: a clara (`--on-brand`) ou a escura (`--brand-800`, que não inverte no
  escuro). A página redeclara `--loja` e `--on-loja`, e o botão ganha a variante `loja`. Sem cor,
  valem os do Rende (`--brand-700`). Como o `Painel` abre num portal fora do `<main>`, a cor é
  redeclarada dentro dele.
- **O que o design inventava ficou de fora**, porque a spec já tinha dito não a cada item:
  - a taxa de entrega fixa: continua "sem a entrega", e a taxa é combinada;
  - "próxima fornada", as vagas por dia e o horário e o endereço de retirada: dias e horários
    estão fora de escopo;
  - o ponto verde de "aceitando encomendas": página aberta já é cardápio aberto;
  - o selo "o mais pedido": o Rende não sabe disso;
  - "volta na próxima": uma promessa sem dado.
- **O que a crítica mudou no desenho:**
  - o "+" deixou de flutuar sobre a foto e virou "Adicionar" na linha do preço, porque sem foto
    ele flutuaria no nada;
  - a web usa a mesma lista com divisórias do celular, e não a grade de cartões com elevação;
  - "sacola" virou "pedido";
  - as pílulas de categoria são âncoras, sem estado "ativa", porque uma pílula ativa que não
    segue a rolagem mente;
  - a data virou botões com os 14 dias seguintes, mais "Outro dia" com o calendário;
  - todo alvo tem 44 px;
  - o rodapé é `--ink-muted`, e não `--ink-subtle`;
  - o fim da jornada diz o toque que falta: "mande a mensagem no WhatsApp, que é por lá que ela
    confirma".
- **No desktop, o pedido fica ao lado da lista**, sem painel, como no design. É o mesmo
  formulário: `useDesktop` decide onde ele monta, e só monta num lugar, porque dois `<form>` com
  o mesmo id mandariam o pedido pelo errado.

**Consequência.** A crítica levantou três coisas que não entraram, e ficam registradas como
pergunta, não como dívida:

- o local e o horário de retirada, como campo de texto;
- os dias de fornada da semana;
- uma fonte de exibição escolhida pela loja.

Hoje o nome da loja sai em Archivo, a fonte do Rende. `ponytail:` o "feito com Rende" da página
e o da folha são o mesmo interruptor (`ocultarFeitoCom`, `#d147`). Dois interruptores, se ela
quiser um e não o outro.

---

## D167 · O portão mora no servidor, onde os dois upsells já passam; a regra não muda

**Status:** vigente · decidida em 2026-09-24, na spec `032-o-segundo-plano.md`. Diverge do
roadmap (seção 4, "Vários planos com gating de funcionalidade"), que previa código de permissão
em cada tela.

**Contexto.** O `#d112` deixou o gating para a fase 3, junto dos dois upsells. Os dois já
atravessam o servidor por decisões tomadas por outros motivos: o cardápio é renderizado com o
Admin SDK e `montarCardapio` decide "não está aberto" (`#d158`); a ajudante só existe porque
`/api/conta/membros` escreve a claim dela e o webhook a renova (`#d155`).

**Decisão.** Uma função pura, `permite(situacao, "cardapio" | "ajudante")` em
`domain/assinatura.ts`, com `RECURSOS_DO_PACOTE` como tabela de duas linhas: `livre` e `teste`
abrem tudo, `vencida` nada, `assinante` o que o pacote tem. Ela é perguntada em três lugares do
servidor: `montarCardapio` (o sexto caso de "não está aberto", no mesmo `if` da vencida; a
página, o `POST /api/cardapio/pedido` e os combos passam por ela), o `POST /api/conta/membros`
(403 `sem-pacote`, depois de ler a conta; o `DELETE` não tem portão, tirar acesso sempre pode)
e o webhook (`#d170`). `firestore.rules` não muda, e o pacote não vai para a claim: a regra não
o lê. A tela diz a verdade sobre o portão (os dois painéis de `/configuracao`); quem fecha é o
servidor, e um `curl` não abre nenhum dos dois.

**Consequência.** Um terceiro recurso que more só no cliente e no Firestore traria a regra com
ele; até lá, zero linha de regra. `paraSituar(conta)` nasceu em `domain/assinatura.ts` para os
lugares novos (o convite, os dois painéis, `/assinatura`, `/configuracao` e o cardápio), lendo
`toMillis()` por tipo estrutural, como `montarCardapio` já fazia: o domínio continua sem
importar `Timestamp`. Os três lugares da 028 que não precisam do pacote (`FaixaDoTeste`,
`confirmando`, `(app)/layout.tsx`) continuam montando o objeto à mão.

---

## D168 · O teste e a conta liberada à mão abrem tudo

**Status:** vigente · decidida em 2026-09-24, na spec `032-o-segundo-plano.md`

**Contexto.** O teste podia ser o essencial, com os painéis mostrando "assine o completo" desde
o dia 1.

**Decisão.** O teste é o completo: um upsell que ela nunca viu não se vende, e o teste é a única
vez em que ela usa o produto sem ter decidido pagar. A conta `livre` (`#d141`) também abre tudo:
cortesia é tudo o que a assinatura dá, o mesmo argumento do `#d147`. Durante o teste, os dois
painéis dizem numa linha "No teste está aberto. Depois, é do plano completo.", e o cartão do
essencial em `/assinatura` diz em texto "Sem cardápio e sem ajudante". **Mudado na 039**: os
cartões dizem o que cada plano dá, e a diferença fica no do completo ("Tudo do Essencial, mais o
cardápio… e até 5 ajudantes"); os dois painéis continuam dizendo a linha do teste.

**Consequência.** Quem abriu o cardápio ou convidou ajudante no teste e assina o essencial perde
os dois no dia em que assina — o app disse isso o teste inteiro. `contas/mycookies` e as contas
do beta são `livre`: nada muda para nenhuma conta que existe, e a 032 publica sem migração.

---

## D169 · O pacote vem do produto no Stripe, e desconhecido é essencial

**Status:** vigente · decidida em 2026-09-24, na spec `032-o-segundo-plano.md`

**Contexto.** O webhook precisa saber de que pacote é a assinatura. O jeito óbvio é comparar o id
do preço com as variáveis de ambiente.

**Decisão.** Dois produtos no Stripe: o que já existe ("Rende", o essencial, sem `metadata`) e
"Rende Completo", com `metadata.pacote = "COMPLETO"`. O webhook relê a assinatura com
`expand: ["items.data.price.product"]` e grava `pacoteDaMetadata(produto.metadata.pacote)` em
`Conta.pacote`. Preço muda criando um `Price` novo no mesmo produto; se o webhook comparasse
ids de preço, a primeira mudança rebaixaria toda assinante antiga do completo, e o `#d170`
tiraria as ajudantes delas. O produto não muda. **Desconhecido é essencial**, pelo princípio
do `#d153` (errar para menos acesso): produto sem a `metadata`, produto apagado
(`DeletedProduct`), `"completo"` minúsculo ou um terceiro produto dão essencial. O checkout não
grava o pacote em `subscription_data.metadata`: duas fontes discordariam no dia em que ela
trocasse pelo portal.

**Consequência.** `Conta.pacote` é espelho escrito só pelo webhook, como `assinaturaAte`
(`#d145`). Ausente em assinante é essencial: é o único pacote que existia antes da 032.
`PRECOS` virou `Record<Pacote, Record<Periodo, string>>` e só serve ao checkout e à tela de
preços; `stripeDisponivel()` exige os quatro, porque meio catálogo venderia um pacote e daria
erro no outro. A `metadata` é escrita à mão uma vez, e o passo 5 do roteiro a confere
(`DEPLOY.md`).

---

## D170 · Descer de pacote tira as ajudantes e tira o cardápio do ar, sem apagar nada

**Status:** vigente · decidida em 2026-09-24, na spec `032-o-segundo-plano.md`

**Contexto.** Uma dona que assina o completo, convida cinco ajudantes e desce para o essencial
não pode ficar com as cinco, ou o portão vira enfeite no primeiro mês. Parar de renovar a claim
seria zero escrita nova, mas a ajudante continuaria com a tela aberta até o prazo velho e depois
salvaria calada contra `permission-denied` (`#d80`).

**Decisão.** Os dois se desfazem de jeitos diferentes. **O cardápio é configuração dela**:
`cardapio` e `configuracao/vitrine` ficam como estão, `montarCardapio` devolve `null`, e subir de
volta traz tudo como estava no próximo `revalidate`. **A ajudante é acesso de outra pessoa**: o
webhook faz no laço o que o `DELETE /api/conta/membros` faz — `tirarContaDaClaim`, depois
`removidaEm` no espelho —, e não escreve `acessoAte` para ela. **Só a assinatura viva tira**
(`active`, `trialing`, `past_due`): cancelada ou sem pagamento continua escrevendo
`acessoAte = agora` para todas, como antes, e a ajudante suspensa volta sozinha se a dona
voltar a pagar; a tirada, não — a dona reconvida, e o `POST` já trata reconvite. `past_due`
conta como viva: o contrário deixaria a brecha de descer de pacote e não pagar.

**Consequência.** É a primeira vez que o webhook escreve algo além de prazo. Continua
idempotente: numa repetição, quem já foi tirada tem `removidaEm` e não entra no laço, e uma volta
que caia no meio termina na repetição do Stripe. O invariante "nunca apagar" segue sem exceção
nova. Com o downgrade configurado no fim do período, o webhook só vê o essencial quando o período
pago do completo acabou. No painel, o essencial vê "Seu cardápio" e "Quem te ajuda" trocados por
uma explicação (cadeado, ou triângulo quando o cardápio saiu do ar) e "Mudar para o completo",
que abre o portal; nenhum controle de edição e nenhuma escrita saem desse estado.

## D171 · Os termos e a privacidade dizem o que o sistema faz, com o responsável como pessoa física

**Status:** vigente · decidida em 2026-09-24, fora de spec, a pedido de quem conduz o projeto ·
**o texto espera a revisão de um advogado antes do deploy**

**Contexto.** O texto de `/termos` e `/privacidade` era o portão do deploy desde a 027. Não há
empresa: quem responde pelo Rende é uma pessoa física. A 027 listou as seções; a 028, a 029 e a
032 disseram o que o texto precisa afirmar.

**Decisão.** O texto foi escrito sob a lei brasileira e descreve o que o código faz, com os
números das constantes de `domain/` (14 dias, 7 de folga de cobrança, 30 até a purga, 5
ajudantes). Três coisas que as specs não pediam e a lei pede entraram: (1) **o direito de
arrependimento** (CDC, art. 49): reembolso integral em até sete dias do primeiro pagamento,
feito à mão no painel da Stripe; a regra da 029, "encerrar não reembolsa o proporcional",
continua valendo fora desses sete dias, **em destaque** (CDC, art. 54, § 4º), e é por isso que
`SecaoDeTexto` aceita `{ destaque }`; (2) **a identificação do fornecedor** (Decreto
7.962/2013, art. 2º): nome, CPF e endereço, em `src/app/(auth)/responsavel.ts`, ainda com
`[texto`; (3) **os papéis da LGPD**: o Rende controla os dados da dona e das ajudantes, e é
operador dos dados das clientes dela (cadastradas ou vindas do cardápio). Seções novas: planos e
pagamento, cardápio, uso permitido, responsabilidade, a quem a política se aplica, base legal,
dados das clientes, segurança. Sem encarregado nomeado: agente de pequeno porte (Resolução
CD/ANPD nº 2/2022, art. 11), com o e-mail como canal. Foro: o domicílio de quem usa.

**Consequência.** Promessas novas que o código não faz sozinho, e que são de quem conduz: avisar
mudança de preço e de termos com 30 dias; reembolsar o arrependimento; reabrir conta encerrada
dentro dos 30 dias; avisar 60 dias antes se o serviço acabar; responder direitos em 15 dias.
Para o advogado conferir: a folha de pedido do cardápio (`/c/{contaId}`) não liga a política;
a conta vencida é guardada sem prazo; o encerramento sem reembolso proporcional no plano anual;
a afirmação de que o Google não treina com a foto da nota vale para a API paga do Gemini; e, com
empresa constituída, o art. 15 do Marco Civil (guardar registros de acesso por seis meses).

---

## D172 · A página de venda mora em `/conheca`; `/` continua sendo o app

**Status:** vigente · decidida em 2026-09-24, na spec 036

**Contexto.** Quem chegava ao endereço sem login caía em `/login`, e não havia lugar que dissesse o
que o Rende faz, quanto custa e para quem é, nem link para a professora, o grupo ou o Instagram.

**Decisão.** Uma rota pública, estática com `revalidate` de uma hora, fora de `(app)` e de
`(auth)`, como `/c/[contaId]`: `src/app/conheca/page.tsx`, a única com `robots` indexável. O
guarda do `(app)/layout.tsx` manda o visitante sem login **no navegador** para `/conheca` e o do
**app instalado** (`display-mode: standalone`) para `/login`, como antes. `sair()` e as guardas de
`/assinatura` continuam indo para `/login`: quem chega nelas já sabe o que é o Rende. Pesados e
recusados: a página em `/` com o app em `/hoje` (mudaria todo `href="/"`, o `start_url`, e o
ícone já instalado passaria a abrir a página de venda) e a decisão no servidor por cookie (o
login é do Firebase no aparelho, `#d14`).

**Consequência.** `/` continua `noindex`, e quem digita o endereço vê o símbolo pulsando por um
instante antes da página. Os links que a gente manda apontam para `/conheca` direto. Quando houver
domínio e o `/` virar a porta, a página em `/` volta à mesa com um motivo.

---

## D173 · Os números da página saem do domínio, e a margem é 40% + maquininha 5%

**Status:** vigente · decidida em 2026-09-24, na spec 036 · **corrige o `MARCA.md` § 1.1**

**Contexto.** O `MARCA.md` diz "preço sugerido com 45% de margem: R$ 8,50" e "no preço praticado
de R$ 8,00 sobram R$ 3,19 depois da maquininha". Pelas funções do app, 45% de margem com a
maquininha de 5% (que é o que dá os R$ 3,19) sugere R$ 9,00, e não R$ 8,50.

**Decisão.** Margem 40% + maquininha 5%: 441 / 0,55 = 802 → `MEIO_REAL` → 850. Os três números
da marca ficam de pé; o errado era o rótulo, e os 45% eram margem mais maquininha. O cookie virou
`EXEMPLO` em `domain/exemplo.ts`; a página mostra o que `composicaoDoLote`,
`calcularPrecoSugerido` e `verificarPreco` devolvem para ele, e `tests/domain/exemplo.test.ts`
prende 441, 850, 319 e as cinco parcelas. O `MARCA.md` fica como veio (`#d125`); esta decisão é a
correção.

**Consequência.** Se a regra de preço mudar, o teste quebra antes de a página mentir. A faixa na
página é exceção nomeada ao `#d126`: é a do editor, com o dado do exemplo.

---

## D174 · O preço da página é o do Stripe, os dois pacotes; sem Stripe, sem número

**Status:** vigente · decidida em 2026-09-24, na spec 036

**Contexto.** A prancha vendia "um preço, tudo dentro". Desde a 032 o app vende dois pacotes, e
`/assinatura` mostra os dois.

**Decisão.** A seção de preço tem um cartão por pacote, na ordem de `RECURSOS_DO_PACOTE` (o
Essencial primeiro), com o mensal em display, o anual e a economia numa linha, e
`O_QUE_O_PACOTE_TEM`. O número vem de `lerPrecos()` em `server/stripe.ts`, a mesma função (e o
mesmo cache por instância) de `/api/assinatura/precos`, que saiu da rota para cá. Sem
`stripeDisponivel()`, ou com o Stripe fora do ar, os cartões ficam com o nome e o que têm, sem
valor. Nunca um número de reserva escrito à mão. Os cartões não são clicáveis; o botão é um só.

**Consequência.** O preço da página e o do checkout podem divergir por até uma hora depois de uma
mudança no painel; o checkout cobra o do Stripe. Se a 032 for revertida, o `map` sobre
`RECURSOS_DO_PACOTE` decide quantos cartões há.

---

## D175 · O depoimento é dela, com autorização escrita, ou a seção não vai ao ar

**Status:** vigente · decidida em 2026-09-24, na spec 036 · **portão do deploy**

**Contexto.** A prancha punha na boca da Maynara "Eu vendia cookie a R$ 6,00. Estava perdendo
R$ 0,41 em cada um", com "Sorocaba". A conta contradiz o cartão ao lado (a R$ 6,00, com custo de
R$ 4,41 e maquininha de 5%, sobram R$ 1,29), nada no repositório confirma a frase nem a cidade, e
nome e rosto de pessoa real numa página de venda pedem consentimento (LGPD, art. 7º, I; Código
Civil, art. 20).

**Decisão.** A frase, a cidade e a foto vêm dela, com os números reais do cookie dela e
autorização por escrito (uma mensagem de WhatsApp guardada basta). Até lá `DEPOIMENTO`, em
`src/app/conheca/page.tsx`, carrega `[texto de quem conduz o projeto…]`, que o
`rg -n "\[texto" src/app` do portão do deploy pega. Sem foto autorizada, a citação ocupa a faixa
sozinha: nunca um retângulo vazio. Se os números dela contradisserem o exemplo, o exemplo não
muda: o cartão diz "Exemplo" no título.

**Preenchido em 2026-09-24**, sem foto e sem cidade, com o texto dela trazido por quem conduz o
projeto; a autorização por escrito continua sendo o portão do deploy.

**Consequência.** Se a autorização não vier, a seção sai (`temDepoimento`), e a página fica com
quatro blocos. Nesse caso a barra fixa do celular volta a começar logo depois da conta; ver a
nota da 036 no `ESTADO.md`.

---

## D176 · A resposta do preço mora numa página própria, com o endereço da pergunta

**Status:** vigente · decidida em 2026-09-24, na spec 037

**Contexto.** Quem tem a dúvida do preço procura a pergunta ("como calcular o preço do meu
cookie"), e não "sistema de precificação". A única página indexável era `/conheca`, que é venda:
o `h1` é a frase da marca e ela mostra o resultado da conta, não a ensina. Busca e chats de IA
citam a página que responde de frente.

**Decisão.** `/como-calcular-o-preco-do-cookie`: estática, indexável, com `canonical`, `title` e
`h1` na forma da pergunta. Responde primeiro e vende depois: o primeiro parágrafo é a resposta
inteira, com a fórmula e o número, e o botão do teste vem depois das perguntas, fora do
`<article>`, sem barra fixa no celular. Toda quantia sai das funções do app sobre `EXEMPLO`
(`#d173`), e o erro "custo + 45%" sobre `ERRO_COMUM` (o markup do app sem arredondar), com
`tests/domain/exemplo.test.ts` prendendo 639 / 166 / 25,98% e 802 / 321 / 40,02%. O "erro" e a
"conta de volta" comparam os dois preços **antes** do arredondamento: arredondado, o certo vira
8,50 e o errado 6,50, e a diferença deixaria de ser só a da conta. Pesados e recusados: a conta
como seção de `/conheca` (uma página não é a melhor venda e o melhor artigo ao mesmo tempo) e
uma página por doce (quatro textos antes de saber se o primeiro funciona). `Topo` e `Rodape`
saíram de `/conheca` para `src/components/site/Moldura.tsx`; o rodapé ganhou "Como calcular o
preço", e "Dúvidas" virou `/conheca#duvidas` para servir às duas. O logotipo do topo passou a
ser link para `/conheca`. `ContaAberta` ganhou `parada`, sem o movimento da abertura.

**Consequência.** Se a regra de preço mudar, o teste quebra antes de a página ensinar errado.
Mudar o endereço depois de indexado pede redirecionamento 301. A próxima página (outro doce, ou a
calculadora pública) espera o Search Console mostrar impressões nesta.

---

## D177 · O mapa: `robots`, `sitemap` e `llms.txt`, nenhum robô de IA barrado

**Status:** vigente · decidida em 2026-09-24, na spec 037

**Decisão.** `src/app/robots.ts`: `allow: "/"` para `*`, `disallow: "/api/"`, e o sitemap.
Nenhuma linha própria para GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot ou Google-Extended:
sem regra eles seguem o `*`, e é o que se quer. As telas do app **não** entram no `disallow`:
elas já dizem `noindex` pelo layout raiz, e o robô barrado não leria esse `noindex`, deixando o
endereço aparecer na busca sem conteúdo. `src/app/sitemap.ts`: só `/conheca` e a página do preço
(`/`, `/termos` e `/privacidade` são `noindex`; os cardápios são da confeiteira). Sem
`lastModified`: a data da página mora nela (`ATUALIZADO_EM`), e o Next não deixa um arquivo de
página exportar constante para fora. `src/app/llms.txt/route.ts`, `force-static`: convenção
proposta (llmstxt.org), que nenhum buscador grande prometeu ler; entra porque custa um arquivo.
Rota, e não arquivo em `public/`, pelo endereço absoluto; nenhum preço, porque o do Stripe muda.

**Consequência.** Nova página pública entra no sitemap e no `llms.txt` à mão, e ganha `robots`
indexável na própria `metadata`.

---

## D178 · O endereço absoluto vem da Vercel, e o domínio próprio é portão do deploy

**Status:** vigente · decidida em 2026-09-24, na spec 037 · **portão do deploy**

**Contexto.** Sitemap, `canonical`, Open Graph e `llms.txt` pedem endereço absoluto, e o projeto
não tinha nenhum (o checkout usa a origem da requisição, que não existe no build).

**Decisão.** `URL_DO_SITE` em `src/app/site.ts`: `https://` + `VERCEL_PROJECT_PRODUCTION_URL`,
variável de sistema da Vercel presente no build e na execução, que vale o domínio de produção (o
próprio quando houver, o `*.vercel.app` enquanto não houver); fora da Vercel,
`http://localhost:3000`. Nenhuma variável nova. O layout raiz ganhou `metadataBase` com ela.
**O domínio próprio vem antes de enviar o sitemap ao Google**: o que o Google aprende fica no
endereço, e trocar depois pede 301 de tudo e meses para recuperar a posição.

**Consequência.** O código pode ir ao ar sem domínio; o Search Console e o Bing só começam com
ele (`DEPLOY.md` § 8). Um `npm run build` local grava `localhost` no sitemap, o que é certo: o
deploy da Vercel refaz o build com a variável.

---

## D179 · Dados estruturados só em `/conheca`, `SoftwareApplication`

**Status:** vigente · decidida em 2026-09-24, na spec 037

**Decisão.** Um `<script type="application/ld+json">` no fim do `<main>` de `/conheca`:
`SoftwareApplication`, `BusinessApplication`, "Web, Android, iOS", `pt-BR`, e uma `Offer` por
pacote com o mensal em reais (`price` decimal, `BRL`) só quando `lerPrecos()` respondeu
(`#d174`). Nenhuma `aggregateRating`: ninguém avaliou. O `<` do JSON é escapado para nenhum
texto fechar a tag. Na página do preço, **nenhum**: o Google só mostra FAQ em destaque para
governo e saúde desde 2023, "HowTo" saiu da busca no mesmo ano, e um JSON repetindo a página é
uma segunda cópia para manter.

**Consequência.** Se o Search Console mostrar que concorrentes com `FAQPage` aparecem melhor, é
um `<script>` na página do preço, e esta decisão volta à mesa.

---

## D180 · A visita contada pela Vercel, sem pacote, só nas páginas públicas e no cadastro

**Status:** vigente · decidida em 2026-09-24, na spec 038

**Contexto.** `scripts/metricas.mjs` conta contas criadas; ninguém contava quem chegou e não
criou. Entre o link aberto e a conta há três portas (a página, o botão, o formulário), e sem
número nenhuma mudança da 039 e da 040 se mede.

**Decisão.** Vercel Web Analytics: sem cookie, agregado, no mesmo lugar do deploy. Recusados:
Google Analytics e Meta Pixel (cookie, banner, dado indo para anunciante, a mesma recusa da 036 e
da 037) e contar no Firestore (escrita anônima exige abrir a regra). **Sem `@vercel/analytics`**:
`src/components/site/Medicao.tsx` renderiza a forma de duas tags da documentação — a fila
`window.va` com `window.va("beforeSend", …)` e `/_vercel/insights/script.js` —, as duas por
`next/script` `afterInteractive`, só com `VERCEL_ENV === "production"`. O `beforeSend` descarta
todo evento cujo `pathname` não esteja em `CAMINHOS_MEDIDOS` (`/conheca`, a página do preço e
`/cadastro`): o script, uma vez carregado, conta também a navegação do cliente, e é o filtro que
deixa o app de fora. Entra no `Topo` (`site/Moldura.tsx`) e em `(auth)/cadastro/layout.tsx`.
`/login` fica fora: quem entra já é da casa.

Conferido na documentação da Vercel de 2026-09-24: a forma com tags aceita `beforeSend` pela
fila; o `<Analytics />` do pacote é um invólucro disso. A documentação agora mostra o script em
`/<unique-path>/script.js` (a "Resilient Intake", que exige o pacote na versão 2), mas diz que
ligar o Web Analytics cria rotas em `/_vercel/insights/*` **e** em `/<unique-path>/*`: o endereço
fixo continua servido. O preço de não usar o pacote é o bloqueador de anúncio que barra
`/_vercel/insights` e a falta de "route support" (agrupar `/c/[contaId]`), que aqui não serve:
os três caminhos são fixos.

**Fora da letra da spec.** A spec punha o `Medicao` "no fim do JSX" de `cadastro/page.tsx`. A
página é client component, e lá `process.env.VERCEL_ENV` não existe (só `NEXT_PUBLIC_*` chega ao
navegador): o componente nunca renderizaria. O `layout.tsx` do cadastro é o pai servidor.

**Consequência.** O plano Hobby dá 50 mil eventos por mês, **janela de um mês** (o painel só
garante o mês corrente: o número se anota no `ESTADO.md` todo mês, ou se perde), sem evento
próprio e sem UTM. Nova página pública entra em `CAMINHOS_MEDIDOS` à mão, como entra no sitemap
(`#d177`). Se a Vercel deixar de servir `/_vercel/insights/script.js`, o código não quebra, só
para de contar; a saída é o pacote, e ele pede aprovação. Se o painel for pouco, Plausible no
mesmo componente.

---

## D181 · Depois do preço: três momentos do mês, com capturas de uma conta de demonstração

**Status:** vigente · decidida em 2026-09-24, na spec 039 · **portão do deploy**

**Contexto.** `/conheca` vendia o preço, e preço parece conta que se faz uma vez. A pergunta que
trava a assinatura ("por que pagar R$ 39 todo mês?") tinha a resposta no app (024, 003, 004) e
cabia numa linha do cartão do plano. E o app nunca aparecia.

**Decisão.** A seção `DepoisDoPreco` (`id="depois"`), entre a conta e o depoimento: o argumento
da mensalidade é que o preço envelhece. Três momentos (a manteiga subiu, chegou uma encomenda,
fechou o mês), um `h3` e duas frases cada, e a captura da tela que resolve o momento; no desktop
texto e tela lado a lado alternando o lado, no celular empilhados; nenhuma grade de cartões,
nenhuma moldura de aparelho. **Capturas, e não os componentes do app com dado falso**: três
árvores de componentes com dezenas de props falsas quebrariam em silêncio a cada mudança do app;
imagem envelhece, e se refaz. **Da conta de demonstração, nunca da MyCookie's**: os números da
Maynara são dela (`#d175`), e cliente real em pedido é dado de terceiro. `TELAS_DO_MES` guarda
título, texto, `src`, `alt`, `largura` e `altura`; com `src` vazio a seção e a âncora "Depois do
preço" somem, e o `alt` por escrever (`[texto de quem conduz o projeto…]`) é pego pelo portão.

**Conferido contra o app, e a frase mudou onde ele faz outra coisa.** O aviso da 024 nomeia o
material que mais subiu (`custoDeHoje(...).culpado`) e diz o doce que ficou no vermelho. O
WhatsApp do pedido manda o **resumo** (spec 010), e não o orçamento, que é a folha A4: a frase
diz "o resumo pronto pro WhatsApp". O pedido não monta a lista sozinho: **confirmado**, ele entra
em `/compras` com o que falta na despensa, e a frase diz isso. A meta diz quantos doces faltam
por semana ou até o fim do mês (`BlocoMeta`). Na dúvida "por que pagar todo mês", **a taxa da
maquininha saiu**: o aviso olha material, e não configuração (`custoDeHoje` usa a taxa gravada
na ficha).

**Consequência.** Toda spec que mudar a tela Hoje, o editor de pedido ou o painel do mês refaz a
captura correspondente (`ESTADO.md`). Se as imagens envelhecerem sempre, volta a reproduzir o
componente, um por vez, começando pelo que mais muda.

---

## D182 · O preço do plano em cookies

**Status:** vigente · decidida em 2026-09-24, na spec 039

**Decisão.** Embaixo do mensal de cada plano: "O mês sai por {n} cookies como o do exemplo". `n`
é `unidadesQuePagam(mensal, precoArredondado do EXEMPLO)` em `domain/assinatura.ts`, para cima
(R$ 39 a R$ 8,50 são 5); preço de unidade zero ou negativo devolve 0 e a linha não aparece. Sem
preço do Stripe, sem a linha (`#d174`). É o princípio "todo número mostra a sua consequência"
aplicado ao nosso preço, com o cookie que a página já ensinou. Nada de "menos que um café": o
café não é da confeitaria.

**Consequência.** Se soar como conta de vendedor, a saída é tirar a linha; a divisão não custa
nada a manter. Se o `EXEMPLO` mudar, a linha muda junto.

---

## D183 · A imagem de prévia: cores escritas no arquivo, fonte no repositório

**Status:** vigente · decidida em 2026-09-24, na spec 039

**Contexto.** O canal do roadmap é gente mandando link, e a 036 e a 037 deixaram o link chegar
ao WhatsApp sem imagem.

**Decisão.** `opengraph-image.tsx` em `/conheca` e na página do preço, com `ImageResponse` de
`next/og` (vem com o Next, nenhuma dependência), gerados no build como rotas estáticas. Os dois
chamam `desenharPrevia({ linhaDeCima, frase })` em `src/app/previa/previa.tsx`: 1200 × 630,
fundo canvas, o logotipo "rende" com o ponto âmbar (a geometria de `Marca.tsx`), a linha de cima
em tinta apagada e a frase grande em tinta, com os números saindo das funções sobre `EXEMPLO`
(`#d173`). Duas exceções à regra de sempre:

- **Cores literais.** `ImageResponse` não lê variável CSS. As quatro vivem em `CORES_DA_PREVIA`,
  com o token ao lado (canvas `#F7F4EE`, tinta `#22242E`, tinta apagada `#6A6C78`, âmbar
  `#D89B3C`, do tema claro do `DESIGN.md`). É a exceção nomeada; os hex que já existiam
  (`globals.css`, o manifesto e o `themeColor`, `icon.svg`, a cor padrão da loja) ficam como
  estavam.
- **Fonte no repositório.** Archivo 700 (`Archivo-Bold.ttf`, estática, do repositório
  Omnibus-Type/Archivo) com o `OFL.txt` ao lado, lida por `readFile` no build. Baixar do Google
  Fonts no build poria rede no build.

**Consequência.** Se a tinta ou o âmbar mudarem em `globals.css`, `CORES_DA_PREVIA` muda à mão.
O WhatsApp guarda a prévia por endereço: um link colado antes do deploy continua sem imagem.

---

## D184 · A origem do Rende dita no bloco do depoimento, sob a mesma autorização

**Status:** vigente · decidida em 2026-09-24, na spec 039 · **portão do deploy**

**Contexto.** O depoimento é de quem está perto do projeto, e a visitante desconfiada descobre
isso sozinha.

**Decisão.** Dizer: embaixo da `figcaption`, "O Rende nasceu na cozinha da MyCookie's. Tudo o
que ele sabe sobre a bancada veio de ver a Maynara trabalhar." A frase fala dela: é
`DEPOIMENTO.origem`, entra na mesma autorização por escrito do `#d175` e sai junto com o bloco
quando `DEPOIMENTO.texto` fica vazio.

**Consequência.** Se a Maynara preferir não aparecer como origem, `origem` sai e o depoimento
fica.

---

## D185 · A calculadora parte das receitas da biblioteca, e só faz cookie

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão A)

**Contexto.** O número de `/conheca` é o do exemplo (`#d173`). A visitante lê, concorda e vai
embora: nada nela é dela.

**Decisão.** Uma calculadora pública sobre as duas receitas de `FICHAS_DA_BIBLIOTECA`, com o que
muda de cozinha para cozinha editável: o rendimento, o tempo, a hora e o preço de cada pacote. As
quantidades não mudam na página. `contaDaPorta` (`src/lib/domain/calculadora.ts`) monta os itens
como `montarBiblioteca` monta, com o preço dela onde houver (`calcularCustoInsumo` sobre o
material com o `precoCompra` dela), e chama `derivarFicha`; a única conta nova é `aMaisNoMes`.
Pesados e recusados: campos soltos ("quanto você gasta de ingrediente no lote" é o número que ela
não sabe, e não vira ficha) e a receita linha a linha (é o editor do app numa página de venda).
Só cookie porque a página do preço é do cookie (`#d176`) e a biblioteca só tem cookie.

**Consequência.** `tests/domain/calculadora.test.ts` prende que, para as duas receitas, a página e
a ficha que a biblioteca instala dão o mesmo custo por unidade e o mesmo preço arredondado. Se a
regra de preço, a biblioteca ou a configuração sugerida mudarem, o teste quebra antes da promessa.
Brigadeiro e bolo entram quando a biblioteca os tiver; a calculadora não ganha campo solto.

---

## D186 · A sugestão da calculadora é a da conta nova, e a configuração sugerida mora no domínio

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão A)

**Contexto.** O exemplo do topo usa 40% de margem + maquininha 5% (`#d173`). A conta nova nasce com
35%, a maior taxa ativa das formas sugeridas (crédito, 4,99%) e `CENTAVO_90`.

**Decisão.** A calculadora usa a configuração da conta nova: é o preço que ela vai ver no app
depois de criar a conta, e dois números para o mesmo cookie fariam ela desconfiar dos dois. O
bloco do resultado diz a margem e a maquininha em uma linha, como a `ContaAberta` diz as dela; o
exemplo do topo fica como está. `CONFIGURACAO_SUGERIDA`, `rateioSugerido()`,
`precificacaoSugerida()` e `parametrosDePreco()` saíram de `firebase/mutations/configuracao.ts`
para `src/lib/domain/configuracaoSugerida.ts`, e o tipo `DadosConfiguracao` para
`src/lib/types/configuracao.ts`: a calculadora é pública e não pode puxar Firebase. O arquivo de
mutações importa de lá e reexporta os dois nomes; `rateioDaConta(null)` e
`precificacaoPadraoDaConta(null)` chamam as funções novas. Mudança de lugar, sem mudança de valor:
os testes da biblioteca, do custo da ficha e do preço passaram sem ninguém tocar neles.

**Consequência.** Mudar a sugestão da conta nova muda a página no mesmo commit, e o teste do
`#d185` confere que continuam iguais.

---

## D187 · Uma seção própria logo depois do topo; o exemplo do topo fica

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão A)

**Decisão.** Em `/conheca`, o `h1` com o exemplo e a `ContaAberta` continuam a primeira coisa: é a
frase da marca e o que a busca lê. A calculadora é a seção seguinte, `id="sua-conta"`, "Agora a
conta do seu cookie", com a âncora "Sua conta" no `Topo`. O botão do topo muda de texto e de
destino, **"Fazer a conta do meu cookie" → `#sua-conta`**, e continua primário: o convite do teste
("Começar o teste de 14 dias") passa para o fim da calculadora, embaixo do resultado, onde ele faz
sentido. No desktop o resultado fica grudado à direita enquanto ela rola os materiais; o convite
vai grudado com ele. Na página do preço, a calculadora entra depois de "Margem e maquininha" e
antes de "O erro mais comum", com "Faça a conta do seu cookie", **fora da coluna de leitura**: a
grade da `ContaAberta` grudada termina antes dela, e o resto do artigo volta à coluna de 68ch.
Duas contas lado a lado (a do exemplo e a dela) seriam dois resultados para ler.

A barra fixa do celular em `/conheca` passou a começar nas dúvidas: começando no preço, ela ficava
na tela junto com o convite da calculadora a 390 × 844 (medido; `ESTADO.md`, seção da 040).

**Consequência.** Sem JavaScript a calculadora é o HTML do padrão (o clássico, sem preço de hoje),
parada, e o texto em volta está inteiro: o robô lê a resposta como antes. O primeiro parágrafo da
página do preço continua sendo a resposta (`#d176`).

---

## D188 · O que ela pode trocar e o que ela vê

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão A)

**Decisão.** Entradas, todas preenchidas: o cookie (pílulas), quantos saem, quanto tempo leva (a
dica diz "da massa ao forno desligado"), a hora (o sugerido, R$ 25), o preço de cada pacote num
`<details>` fechado, o preço de hoje (vazio) e, só com ele, as vendas do mês (100). Trocar de
cookie volta rendimento, tempo e preços ao padrão daquele e mantém a hora, o preço de hoje e as
vendas (`trocarReceita`). Preço de pacote zerado vale o médio, e o campo diz isso; rendimento
vazio troca o resultado por "Diga quantos cookies saem da receita e a conta aparece aqui", com o
triângulo, e nunca R$ 0,00. Saídas a cada tecla, sem botão: as parcelas por cookie e a faixa, o
custo por cookie, o preço sugerido com o ponto âmbar e o quanto sobra nele; com o preço de hoje,
uma de três frases (perde, com `trending-down`, a palavra e a cor negativa; sobra menos que no
sugerido; já cobre a conta, sem alarme) e, abaixo do sugerido, "Vendendo {n} por mês, são R$ {x} a
mais pra você no preço sugerido", em reais redondos. O leitor de tela ouve só o custo e o preço,
700 ms depois da última tecla, e nada ao abrir a página.

**Fora da letra da spec.** "Quanto tempo leva, da massa ao forno desligado" virou rótulo curto
mais dica: com o rótulo inteiro, o campo do tempo ficava uma linha abaixo do do rendimento ao lado.

**Consequência.** A faixa e o ponto convivem no resultado pelo mesmo motivo da `ContaAberta`
(`#d126`): é a reprodução do editor, com dado de verdade.

---

## D189 · Levar a conta: o rascunho no aparelho, instalado pelo botão da biblioteca

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão B)

**Contexto.** Quem calcula na página e cria a conta cai em `/fichas` vazia: tudo o que ela pensou
na página ficou lá.

**Decisão.** A calculadora grava a entrada em `localStorage` (`rende:conta-da-porta`, versão 1)
a cada mudança, depois da primeira interação. Em `/fichas`, com a conta vazia e um rascunho
válido (`lerRascunho`: zod, 30 dias), o `BotaoBiblioteca` diz "Trazer o cookie que você
calculou" e instala a biblioteca com a conta dela por cima: `montarBiblioteca(parametros, conta)`
troca o preço dos materiais, e a ficha da receita dela leva rendimento, tempo e o preço de hoje
como `precoVenda` (perdendo dinheiro, a conta nova abre com o aviso de vermelho da 024). O mesmo
`writeBatch` despachado de sempre (`#d104`), offline. O rascunho é apagado depois do toque.
Pesados e recusados: mandar a conta no cadastro (o servidor montaria insumo e ficha, e a
biblioteca existiria em dois lugares) e instalar sozinho ao abrir `/fichas` (escrever sem ela
pedir). Toda leitura e escrita em `try/catch`; a leitura é um `useSyncExternalStore` com retrato
estável por texto, porque o lint do React recusa `setState` em efeito.

**Consequência.** É conveniência de um aparelho: calculou no celular e criou a conta no
computador, o botão é o de sempre. Rascunho com rendimento zero instala o rendimento da
biblioteca. Se o roteiro mostrar gente tocando no outro botão por engano, a instalação passa a
ser automática.

---

## D190 · O material que ela corrigiu nasce dela, com `porta-`

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão B)

**Contexto.** `temPrecoMedio` marca "Preço médio" no insumo `biblioteca-` com uma compra só.

**Decisão.** O material com preço dela na calculadora nasce `porta-{id}` (`PREFIXO_PORTA`), e toda
ficha que o usa aponta para ele; os outros continuam `biblioteca-`. O selo não aparece nele, e o
caminho dos primeiros passos conta o insumo pelo mesmo `temInsumo`. **Preço igual ao médio não
é troca:** mesmo custo, e o id continua `biblioteca-` (o campo da calculadora grava o valor a cada
tecla, e ela pode ter voltado ao médio); é o mesmo critério do "N com o seu preço" da página.

**Consequência.** `metricas` conta "1º próprio" pelas fichas sem `biblioteca-`; as fichas da
porta continuam `biblioteca-`, então a ficha trazida não conta como própria. Os ids `porta-` não
colidem: o botão some quando a conta tem qualquer insumo ou ficha.

---

## D191 · A hora dela grava a configuração; a origem fica na conta

**Status:** vigente · decidida em 2026-09-25, na spec 040 (sessão B)

**Decisão.** **A hora.** Se a hora do rascunho não é a sugerida, `instalarBiblioteca` grava
`configuracao/geral` no mesmo lote, com `corpoDaConfiguracao` (extraído de `salvarConfiguracao`:
o mesmo corpo, `v`, `Timestamp.now()`, `merge: true`), sobre a configuração que a conta já tiver
ou a sugerida, trocando só a hora; as fichas usam esse `operacional`. Sem isso, o próximo
"Salvar" da ficha relê a configuração e a hora volta a R$ 25. Consequência aceita: o passo 3 dos
primeiros passos aparece feito. **A origem.** `esquemaCadastro` aceita `origem: "calculadora"`;
`/cadastro` manda quando há rascunho válido no aparelho (e a moldura diz "O cookie que você
calculou vai estar lá."); `/api/conta` grava na conta nova com o Admin SDK; `Conta.origem?`,
ausente = veio por outro caminho; `npm run metricas` imprime a coluna. Nenhuma regra muda.

**Consequência.** A origem é gravada só quando a conta nasce: o POST que volta depois de cair no
meio encontra o documento e não o reescreve. Quem cria a conta com rascunho e não toca no botão
fica com `origem` mesmo assim: a origem diz por onde ela chegou, e não se trouxe o cookie.

---

## D192 · O botão de entrar está sempre ativo; a validação é no envio

**Status:** vigente · decidida em 2026-09-25, na spec `041-a-porta-de-volta.md`

**Contexto.** `disabled={!email || !senha}` pintava o primário de âmbar lavado, com cara de app
quebrado, e o preenchimento automático do Chrome não entrega o valor ao JavaScript antes do
primeiro toque na página: com a senha salva, o campo aparecia cheio, o estado continuava vazio e
o primeiro toque em "Entrar" não fazia nada.

**Decisão.** Em `/login`, o primário só fica ocupado durante o envio (`carregando`). `aoEnviar` lê
o formulário por `FormData`, e não o estado do React: o valor do campo existe no DOM mesmo sem
`onChange`. Os dois `useState` de e-mail e senha saíram; "Esqueci minha senha" lê o e-mail pelo
mesmo `FormData`. Campo vazio vira erro no próprio campo ("Escreva o seu e-mail.", "Escreva a
sua senha.") e `focarPrimeiroErro()`, sem chamar o Firebase; o erro some ao digitar no campo.
Sem asterisco: os dois campos passam `aria-required`, e não `required`.

**Consequência.** O cadastro continua com o botão desligado até o formulário estar pronto: a
spec não o tocou, e lá não há senha salva a preencher. Se o roteiro mostrar o mesmo desbotado
estranhando, o padrão vale para ele também.

---

## D193 · Mostrar a senha, no login e no cadastro

**Status:** vigente · decidida em 2026-09-25, na spec `041-a-porta-de-volta.md`

**Decisão.** `CampoSenha`, em `src/components/ui/Campo.tsx`: o envelope de `Campo` e um botão de
44×44 dentro do campo, à direita, com `Eye` / `EyeOff` (1.75), que troca `type` entre `password`
e `text`. Começa escondida. `type="button"`, `onMouseDown` com `preventDefault` (o foco e o
teclado do celular ficam no campo) e `pr-12` no `input`. O `sufixo` de `Campo` não servia: é
`pointer-events-none`. Usado no login (`current-password`) e no cadastro (`new-password`).

**Desvio da spec.** A spec pedia `aria-label` alternando entre "Mostrar senha" e "Esconder
senha" junto com `aria-pressed`. Os dois mudando juntos dão estado duplo ("Esconder senha,
pressionado" é ambíguo), então o rótulo fica "Mostrar senha" e quem diz o estado é o
`aria-pressed`, que é o que o passo 3 do roteiro espera ouvir. O ícone troca para quem vê.

---

## D194 · O painel de marca mostra a conta de exemplo

**Status:** vigente · decidida em 2026-09-25, na spec `041-a-porta-de-volta.md`

**Contexto.** No desktop, 42% da tela de entrar era tinta vazia: o split de login do "dashboard
SaaS escuro genérico" que o `PRODUCT.md` lista como anti-referência.

**Decisão.** `MolduraDeEntrada` ganha `painel?: ReactNode`, entre o logotipo e a frase. O login
e o cadastro passam `<ContaAberta parada className="max-w-md" />`, o bloco de `/conheca` (sem
Firebase, `#d173`); `/assinatura` não passa nada. Abaixo de 720 px de altura de janela o cartão
some e fica a frase (`[@media(max-height:719px)]:hidden`). Pesados e recusados: depoimento
(serve à venda, e quem está aqui já comprou) e novidades do produto (não há notas de versão).

**Consequência.** No tema escuro, o risco de o cartão sumir no `brand-800` não se confirmou no
roteiro a 1280 × 800: a borda `line` e o bloco do preço separam o cartão, e o
`border-line-strong` de reserva não entrou. Se o roteiro com ela mostrar o número de um cookie
que não é o dela como enfeite, o painel do login volta a ser só a frase.

---

## D195 · Ajuda, termos e privacidade no pé das telas de acesso

**Status:** vigente · decidida em 2026-09-25, na spec `041-a-porta-de-volta.md`

**Decisão.** Rodapé da `MolduraDeEntrada`, nas três telas de acesso, no fim do `main`: "Não
consegue entrar? Fale com a gente" · Termos · Privacidade, em `text-label text-ink-muted`, cada
link com o terciário `sm` (44 px). Tudo abre em aba nova, para o cadastro não perder o
formulário. "Fale com a gente" é `https://wa.me/{RESPONSAVEL.whatsapp}?text=…` com "Oi, não estou
conseguindo entrar no Rende."; sem `whatsapp`, é `mailto:` com o e-mail de `RESPONSAVEL` e a
mesma frase no assunto. O texto não leva o e-mail dela. Abaixo de 640 px o rodapé vira dois
grupos, um por linha, com 8 px entre as linhas; a partir de 640 px, uma linha com o ponto entre
eles. Sem a coluna, entre 560 e 639 px os dois grupos cabiam numa linha, a 4 px e sem o ponto.

**Consequência.** `RESPONSAVEL.whatsapp` nasceu vazio: quem conduz o projeto não passou o número
na sessão, e o link é o e-mail até ele entrar em `src/app/(auth)/responsavel.ts` (só dígitos,
com DDI). WhatsApp pessoal serve enquanto são poucas contas; quando a ajuda virar volume,
troca-se o número, não a tela.

---

## D196 · A senha nova se cria no Rende

**Status:** vigente · decidida em 2026-09-25, na spec `042-a-senha-nova-em-casa.md`

**Contexto.** O e-mail de "Esqueci minha senha" chegava de `noreply@{id}.firebaseapp.com` e o
link abria a página branca do Firebase em `{id}.firebaseapp.com/__/auth/action`, com o id de
antes da marca (`#d122`). Para quem nunca viu esse endereço, parecia golpe; e depois da senha
nova a página parava, sem caminho de volta.

**Decisão.** O modelo "Redefinição de senha" ganha URL de ação personalizada
`https://{domínio do app}/redefinir-senha`. A página (`src/app/(auth)/redefinir-senha/`) lê
`mode` e `oobCode`, confere com `verifyPasswordResetCode` e salva com `confirmPasswordReset`.
Três estados: conferindo (o esqueleto do formulário, sem giro), formulário ("Para {email}.") e
link que não serve (`auth/expired-action-code`, `auth/invalid-action-code`, `mode` diferente de
`resetPassword` ou sem `oobCode`), com saída para `/login`. `auth/user-not-found` na conferência
também é link que não serve: é a conta purgada depois do pedido (`#d148`), e a frase traduzida
dele ("E-mail ou senha incorretos.") não faz sentido aqui. Qualquer outra falha na conferência
(sem rede, na prática) mostra a frase traduzida e "Tentar de novo". `noindex` pelo layout da
rota, que é server component: a URL carrega o código de uso único.

Pesado e recusado: `continueUrl` no envio, mantendo a página do Firebase. Resolve o caminho de
volta e deixa o endereço estranho e a página sem marca, que são o que parece golpe.

**Consequência.** A URL personalizada vale para todos os modelos do projeto; hoje só a senha
nova é enviada (`#d142`), e qualquer outro `mode` cai no "link que não serve". A ordem do deploy
importa: a URL trocada no console antes da tela no ar quebra a recuperação de quem pedir no
meio (`DEPLOY.md` §10). A página diz o e-mail da conta a quem tem o link, e o link só chega à
caixa desse e-mail: `#d143` continua de pé.

---

## D197 · Depois da senha nova, ela já entrou

**Status:** vigente · decidida em 2026-09-25, na spec `042-a-senha-nova-em-casa.md`

**Decisão.** "Salvar e entrar": `confirmPasswordReset` e, em seguida, `entrar()` do
`AuthProvider` (o `signInWithEmailAndPassword` de sempre) com o e-mail que a conferência devolveu
e a senha que ela acabou de digitar; depois `router.replace("/")`. Validação no envio, como o
login (`#d192`): vazia é "Escreva a senha nova.", menos de 6 é a frase de `auth/weak-password`.
Como não há tela de sucesso, a frase do app instalado vem antes, embaixo do botão: o link do
e-mail abre no navegador, não no app.

Se a senha salvou e a entrada caiu (a rede no meio dos dois passos), a tela diz que a senha está
salva, e o "Salvar e entrar" seguinte só entra: o código já foi gasto, e mandar de novo daria
"link já usado" para quem acabou de trocar a senha. Um `input` escondido com
`autocomplete="username"` e o e-mail dela diz ao gerenciador de senhas de quem é a senha nova.

**Consequência.** Quem abre o link num navegador em que outra conta está aberta entra na conta
do link, sem passar pelo `sair()` que apaga o cache local (`#d118`). Não foi tratado: hoje as
contas são uma por pessoa e por aparelho; se o caso aparecer, a tela pede para sair antes.

---

## D198 · Google, e só o Google

**Status:** vigente · decidida em 2026-09-25, na spec `043-entrar-com-o-google.md`

**Contexto.** Só havia e-mail e senha. Criar a conta é inventar senha num teclado de celular, e
voltar depois de trocar de aparelho é lembrar uma senha usada uma vez; o Android dela já está
logado no Google.

**Decisão.** Um segundo jeito de entrar e de criar a conta: `BotaoGoogle`
(`src/components/auth/BotaoGoogle.tsx`), secundário, 52 px, largura total, com o "G" nas cores
do Google (a única cor fora dos tokens, porque as regras de marca do Google não deixam
recolorir) e a divisória "ou com e-mail" embaixo, no login e no cadastro. Fechar a janela
(`auth/popup-closed-by-user`, `auth/cancelled-popup-request`) não é erro; `auth/popup-blocked`
diz a saída. Sem rede, o botão não abre a janela: dá a frase de rede de `MENSAGENS` na hora.

No login, depois do Google, `reconferirAcesso()`: com conta, `/`; sem conta, `/cadastro`. O
efeito do login que mandava para `/` quem tinha sessão passou a valer só para quem **chega** com
sessão: disparando a cada troca de `usuario`, ele corria antes da claim e levava para `/` quem
não tinha conta. No cadastro, depois do Google, a tela cai no estado "terminando" da 027 com o
nome do `displayName` (cortado em `TAMANHO_MAXIMO_NOME`, editável) e a caixa dos termos
obrigatória. A frase do estado virou "Confira o seu nome e aceite os termos.", e o botão diz
"Criar conta" até haver erro, e só então "Tentar de novo": depois do Google é a primeira vez.

Pesados e recusados: link mágico por e-mail (abre no navegador, e não no app instalado) e Apple
(conta paga de desenvolvedor; só quando a `metricas` mostrar iPhone sem conta Google).

**Consequência.** `/privacidade` diz o que o Google entrega (nome, e-mail, foto; a foto não é
guardada), texto proposto que espera a revisão de quem conduz o projeto. E-mail e senha
continuam, para quem já tem conta e para quem não quer o Google.

---

## D199 · Popup, com o `authDomain` no domínio do app

**Status:** vigente · decidida em 2026-09-25, na spec `043-entrar-com-o-google.md`

**Contexto.** Com o `authDomain` em `{id}.firebaseapp.com`, a tela do Google diz "para continuar
em {id}.firebaseapp.com", o nome de antes da marca (`#d122`), e Safari e Chrome, bloqueando
armazenamento de terceiros, quebram o fluxo entre os dois domínios.

**Decisão.** `signInWithPopup` com `prompt: "select_account"`, e `/__/auth/*` e `/__/firebase/*`
servidos pelo próprio domínio: `rewrites` em `next.config.ts` para o `firebaseapp.com` do
projeto (lido de `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; sem ele, nenhum). Em produção
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` é o domínio do app; no desenvolvimento local continua o
`firebaseapp.com`. O service worker ganha um ouvinte de `fetch` antes do Serwist que chama
`stopImmediatePropagation()` para `/__/` na mesma origem: o `defaultCache` responderia
`/__/auth/handler` com `NetworkFirst` e o `handler.js` com `StaleWhileRevalidate`, e a página
offline entraria no lugar do documento. Sem resposta do worker, o navegador vai à rede.

**Consequência.** `/__/firebase/init.json` responde 404 pelo proxy e direto, porque o projeto não
usa o Firebase Hosting; o handler não depende dele. Trocar o domínio do app depois é refazer o
console (`DEPLOY.md` § 11). Se o roteiro mostrar o popup se perdendo no celular, troca-se por
`signInWithRedirect`, que o mesmo proxy suporta; se só o app instalado no iPhone falhar, o botão
some em `display-mode: standalone` no iOS, e isso vira decisão nova.

---

## D200 · A conta de senha que entra pelo Google continua sendo a mesma

**Status:** vigente · decidida em 2026-09-25, na spec `043-entrar-com-o-google.md`

**Decisão.** "Uma conta por endereço de e-mail" fica. Entrar com o Google num Gmail que já tem
senha não cria outro login: o Google é provedor confiável para Gmail, e como as contas de senha
do Rende não têm e-mail verificado (`#d142`), o Firebase troca o provedor. O `uid`, a claim e os
dados ficam; a senha deixa de valer, e "Esqueci minha senha" a devolve. Fora do Gmail, onde o
Google não garante o e-mail, o Firebase recusa com `auth/account-exists-with-different-credential`,
e a frase manda entrar com e-mail e senha.

**Consequência.** A Maynara, que entra com senha, se tocar no Google uma vez passa a entrar pelo
Google. O passo 6 do roteiro prova isso numa conta de teste antes do deploy, com `uid` e claim
conferidos no console. Se incomodar, a saída é verificar o e-mail no cadastro, o que reabre o
`#d142`.

---

## D201 · Essencial a R$ 29, completo a R$ 49

**Status:** vigente · decidida em 2026-09-25, por quem conduz o projeto

**Decisão.** Essencial R$ 29,00/mês e R$ 290,00/ano; completo R$ 49,00/mês e R$ 490,00/ano
(antes R$ 39/390 e R$ 69/690). O anual continua valendo dez mensais. No Stripe ao vivo, preço
não muda de valor: foram criados quatro preços novos nos mesmos dois produtos, que viraram o
`default_price`, e os quatro antigos foram arquivados. Não havia assinatura nenhuma, então
ninguém ficou no preço velho.

**Consequência.** O código não muda: `/conheca`, `/assinatura` e a linha "O mês sai por {n}
cookies" leem o Stripe (`lerPrecos`). O que muda são as quatro `STRIPE_PRICE_*`, no `.env.local`
e na Vercel, com redeploy; até lá, a produção aponta para preços arquivados e o checkout falha.
Os números antigos em specs e decisões anteriores ficam como estavam, porque são história;
`MARCA.md` foi atualizada.

---

## D202 · E-mail próprio, pelo Resend, por `fetch`

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`

**Contexto.** Fora do app o Rende não dizia nada: o único e-mail com o nome dele era o modelo de
senha do Firebase. A 028 e a 042 tinham posto e-mail próprio fora de escopo por ser "dependência
e conta nova".

**Decisão.** Conta nova no Resend, sem dependência: `enviarEmail` (`src/lib/server/email.ts`) é
um `POST https://api.resend.com/emails` com `Authorization: Bearer RESEND_API_KEY` e o cabeçalho
`Idempotency-Key`. Devolve `"enviado" | "repetido" | "falhou"` e nunca lança: e-mail é
consequência, nunca o motivo de uma rota falhar. O 409 do Resend (chave já usada, com outro corpo
ou em andamento) é `"repetido"`. Sem a chave, `"falhou"` e um `console.warn`, sem o endereço no
log. Pesados e recusados: o SDK `resend` (embrulha o mesmo `fetch`) e o `react-email` (um
renderizador para cinco peças fixas, já escritas em HTML).

**Consequência.** O plano grátis manda 100 por dia e 3.000 por mês; passando de noventa contas com
caixa, o Pro. A boas-vindas sai de `/api/conta` por `after()`, só no ramo em que o documento da
conta nasce, com a chave `boas-vindas/{contaId}`: a resposta do cadastro não espera o e-mail, e a
volta que repete o POST não manda outro.

---

## D203 · As peças são HTML de e-mail escrito à mão

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`

**Decisão.** Tabelas, estilo inline, 560 px, e o molde aprovado em `docs/specs/044-emails/`.
`src/lib/email/pecas.ts` tem a moldura, os pedaços que se repetem e as cinco funções puras
`(dados) => { assunto, preheader, html, texto }`, com `escapar()` em todo texto que veio dela e
dinheiro e datas pelas funções de `domain/`. A faixa de tinta no topo com o logotipo creme em PNG
**opaco** (`public/email/rende.png`): o Gmail do Android inverte as cores no tema escuro e não
inverte a imagem. `color-scheme: light only` e nenhum tema escuro próprio. Archivo e Figtree pelo
Google Fonts onde o cliente deixa; o nome da marca é imagem. Os tokens de `globals.css` estão
escritos em hex no topo do arquivo, porque e-mail não lê variável de CSS: é a única exceção à
regra de não soltar cor.

As variações que os moldes não mostravam e a sessão A decidiu no caminho: "Batida no dia 30" diz
"Entrou em {mês}" sem "até agora"; meta alcançada exata diz "Bem na meta de…"; no mês fechado, a
meta não batida é "faltaram R$ …" em tinta, sem verde; "Pedidos" some com zero pedido; e os
singulares ("1 dia", "o seu produto").

**Consequência.** Mudança de desenho volta para aprovação de quem conduz o projeto. O
`rende-principal.png` da marca, que tinha perdido o "rende" (o Archivo não estava instalado quando
foi gerado), foi refeito pelo Chrome com o Archivo do Google Fonts e o desenho do `Logotipo`.

---

## D204 · A senha nova sai pelo Resend, e o Firebase fica de reserva

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`

**Decisão.** `POST /api/senha` com `{ email }` (`z.email()`), sem login. Sem conta: `{ ok: true }`
e nada sai (`#d143`). Com conta: `generatePasswordResetLink`, e do link só o `oobCode`; o link do
e-mail é `{URL_DO_SITE}/redefinir-senha?mode=resetPassword&oobCode=…&lang=pt-BR`, a tela da 042,
qualquer que seja a URL de ação do console. `Idempotency-Key: senha/{uid}/{bloco de 10 min}`:
cinco toques seguidos, um e-mail. Qualquer falha do caminho novo (sem credencial, sem chave, cota,
5xx, rede) é `503 { reserva: true }`, e o login chama `sendPasswordResetEmail` como antes. Corpo
fora de forma é 400, e o login também cai na reserva, que dá a frase do Firebase para e-mail
inválido.

**Consequência.** O modelo do Firebase da 042 continua existindo, agora como reserva. Com o Resend
fora do ar, "e-mail com conta" responde `reserva` e "sem conta" responde `ok`: a tela é a mesma,
e só um script que lê a resposta perceberia.

---

## D205 · Um cron por dia, e nenhum marcador gravado: o dia decide

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`; codificada na sessão B

**Decisão.** `vercel.json` com `0 12 * * *` (9h em São Paulo) para `GET /api/emails/diario`,
protegido por `CRON_SECRET`. Teste acabando quando o dia de `trialAte` é daqui a exatamente 3
dias; meta batida quando o dia em que a soma de `porDia[].entradas` alcançou o alvo foi ontem;
mês fechado no dia 2, quando o mês anterior teve entrada ou pedido. Nenhum campo "avisado em":
cada condição é verdadeira em um dia só. A `Idempotency-Key` `{modelo}/{contaId}/{período}` cobre
a mesma rodada chamada duas vezes.

**Consequência.** O dia em que o cron não rodar é o dia cujos avisos não saem; o teste continua
avisado pela linha da tela Hoje. Um lançamento sincronizado depois do dia em que a meta bateu faz
o aviso não sair, e nunca sair em dobro.

---

## D206 · Quem recebe é a dona, no e-mail do login

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`; codificada na sessão B

**Decisão.** O endereço vem do Auth (`listUsers` e a claim `DONA`, o caminho de
`scripts/metricas.mjs`), e não de um campo na conta, que envelheceria quando ela trocasse de
login. A ajudante não recebe nada. A conta liberada à mão recebe meta e mês, nunca "teste
acabando". Conta `ENCERRADA` não recebe nada. A boas-vindas vai para o `email` do login que acabou
de criar a conta.

---

## D207 · Dois avisos se desligam; três não

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`; codificada na sessão B

**Decisão.** Meta batida e mês fechado são notícia: `Conta.avisosPorEmail?: false` (ausente =
recebe) e uma caixa em `/configuracao#avisos`, e o rodapé das duas peças diz onde desligar.
Boas-vindas, senha nova e teste acabando são do funcionamento da conta e não se desligam. Sem
`List-Unsubscribe` de um toque: o Gmail e o Yahoo só o exigem acima de 5.000 por dia, e ele pede
rota com token assinado.

---

## D208 · O remetente

**Status:** vigente · decidida em 2026-09-25, na spec `044-o-rende-escreve.md`

**Decisão.** `Rende <ola@rendeapp.com.br>`, com `reply_to` em `RESPONSAVEL.email`. A boas-vindas,
assinada pelo Filipe, convida a responder, e quem responde fala com uma pessoa; `ola@` não precisa
de caixa. Rastreamento de abertura e de clique **desligados** no domínio do Resend: o de clique
reescreve os links, e o link da senha carrega um código de uso único (`DEPLOY.md` § 12).

---

## D209 · No mês fechado, a maquininha entra no que saiu

**Status:** vigente · decidida em 2026-09-25, na sessão B da spec `044-o-rende-escreve.md`

**Contexto.** A peça do mês fechado calcula o que sobrou como `entrou − saiu`. O `/financeiro`
mostra como resultado o `lucro` do agregado, que é `entradas − saídas − custoTaxasPagamento`. Com
`saidas` puro, o número grande do e-mail (e o assunto) passaria o da tela pelo que a maquininha
comeu, e o roteiro confere um contra o outro.

**Decisão.** O cron passa `saiu = saidas + custoTaxasPagamento`. O que sobrou e o que entrou batem
com o `/financeiro`; a linha "Saiu" do e-mail fica maior que a da tela pelo valor da maquininha, e
a conta do e-mail (entrou menos saiu) continua fechando. A peça não mudou.

**Também na B, sem decisão nova:** o "hoje em São Paulo" que a spec chamou de `hojeEmSaoPaulo` é o
`hojeEmBrasilia` que `domain/datas.ts` já tinha (`#d160`); "fora de produção" é `VERCEL_ENV !==
"production"`, porque a prévia da Vercel roda com `NODE_ENV=production`; a chave de
`/configuracao#avisos` fica fora do formulário e grava no toque, lendo o documento da conta que o
`AuthProvider` já assina, e com o teste vencido a regra recusa a escrita como recusa qualquer outra.

---

## D210 · O mês abre a tela Hoje, com a meta dentro dele

**Status:** vigente · decidida em 2026-09-25, na spec `045-o-mes-na-abertura.md`; codificada em 2026-09-26

**Contexto.** O trabalho do produto é "saber se está ganhando dinheiro", e a tela que ela abre toda
manhã não mostrava um real ganho. O cartão da meta trocava "faltam R$ 114" por "faça 12 doces".

**Decisão.** `CartaoDoMes` substitui `CartaoMetaHoje`, no mesmo lugar e com o mesmo portão (só a
dona, `#d154`). O valor em display é `parcelasDoResumo(resumo).lucro`, o mesmo do `ResultadoDoMes`;
com lucro negativo, `comSinal`, `trending-down` e "faltou no mês". O ponto âmbar (10 px,
`aria-hidden`) vai depois do valor e só no lucro positivo: é a única ocorrência na tela. A meta vira
barra (trilha `sunken`, preenchimento `brand-ink`, batida em `positive`) com a frase em reais antes
dos doces; o dia da meta batida vem de `diaEmQueBateu`, a mesma função do cron. Mês com entradas e
saídas em zero vira uma linha, sem R$ 0,00 em display. O bloco inteiro leva a `/financeiro`.

**Também, sem decisão nova:** a linha "Entrou · Saiu" passa a maquininha no que saiu, como o e-mail
do mês (`#d209`), para que entrou menos saiu feche com o número de cima. Os valores mostram
centavos (`formatarMoeda`): o desenho da spec arredondava, e um formatador sem centavos seria o
segundo da casa por um bloco só.

---

## D211 · A comparação é com o mês passado na mesma altura, por entradas

**Status:** vigente · decidida em 2026-09-25, na spec `045-o-mes-na-abertura.md`; codificada em 2026-09-26

**Decisão.** `entradasAteODia(porDia, dia)` em `domain/caixa.ts`, e a diferença é a do mês atual
menos a do anterior até o dia de hoje. Em entradas e não em sobra, porque `porDia` não guarda a
sobra do dia; o texto diz "Entrou R$ … a mais que agosto até o dia 25", nomeando o que compara.
Dia 31 contra mês de 30 soma o mês inteiro. Sem agregado do mês anterior, a linha não aparece.
Diferença abaixo de R$ 1,00 é "igual". Seta e palavra; cor positiva ou `ink-muted`, **nunca
negativa**: vender menos que o mês passado até aqui não é erro.

**Consequência.** Comparar a sobra pede `porDia[].lucro` gravado, mudança no agregado e nas
mutações do caixa. Volta se ela perguntar.

---

## D212 · Dois arranjos, a partir do desktop largo

**Status:** vigente · decidida em 2026-09-25, na spec `045-o-mes-na-abertura.md`; codificada em 2026-09-26

**Decisão.** A partir de `xl`, a tela Hoje da dona vira duas colunas, `minmax(0,7fr)
minmax(0,5fr)`, `gap-6`: à esquerda o dia (a agenda; a 046 põe "o que espera por você" ali), à
direita o mês, o produto no vermelho e as compras, grudenta abaixo do cabeçalho. Abaixo de `xl`, a
pilha: faixa do teste, primeiros passos, o mês, produto no vermelho, agenda, compras. A ajudante,
sem o mês, fica com a coluna única em qualquer largura.

**Como.** Um DOM só: a seção do mês é `display: contents` na pilha, para que seus cartões entrem
na coluna única, e as compras levam `order-last` para cair depois da agenda. A leitura por leitor
de tela segue o DOM (o mês antes do dia), e as duas seções têm rótulo escondido. O `top-36` da
coluna grudenta é a altura do cabeçalho no desktop mais 24 px, medida à mão (`ponytail:` no
código). A página passou a ser dona do espaço entre os blocos (16 px dentro de um grupo, 24 px
entre grupos): os três cartões que traziam margem de cima própria a perderam.

---

## D213 · "Esperando você": três fontes, uma lista, acima do mês

**Status:** vigente · decidida em 2026-09-25, na spec `046-o-que-espera-por-voce.md`; codificada em 2026-09-26

**Decisão.** `EsperandoVoce` é o primeiro bloco do dia: na pilha, antes do mês; a partir de `xl`,
no topo da coluna da esquerda. Lista com divisórias, linhas de 52 px, e não existe quando está
vazia. Pedido pelo cardápio (`ORCAMENTO` com `origem: "CARDAPIO"`, qualquer data, até 3), pedido
que passou do dia (`passouDoDia`, sem o orçamento, até 3, o mais recente primeiro) e uma linha só
com a soma de `aReceber` dos entregues em aberto, essa só para a dona. "E mais N" leva a
`/pedidos`. A agenda da Hoje continua começando em hoje.

**Diferente da spec, e por quê.** As duas primeiras linhas não abrem consulta nova: saem de
`consultaAgenda` filtrada em memória, a mesma assinatura de `/pedidos` (o que não fechou, de
qualquer data, finita porque ela fecha os pedidos). A spec previa duas consultas; uma já existente
basta, e o cache é o mesmo. Como a agenda vem por data de entrega, o pedido do cardápio para hoje e
amanhã já chega no topo; ele leva "Para hoje", "Para amanhã" ou "Passou do dia" no lugar da data.
A linha diz "Pedido **de** Ana era para ontem", e não "da": o nome da cliente não diz o gênero.
`passouDoDia(pedido, hoje)` foi para `domain/pedido.ts`, com teste, e o "Passou da data" de
`ListaPedidos` passou a usá-la.

---

## D214 · A agenda vazia de quem já opera é uma linha

**Status:** vigente · decidida em 2026-09-25, na spec `046-o-que-espera-por-voce.md`; codificada em 2026-09-26

**Decisão.** Sem `conta.primeirosPassosEm`, o estado vazio grande continua, porque ensina. Com ele,
uma linha de 56 px no contorno da agenda: "Nada marcado até sexta-feira, 2 de outubro." (o
`diaVizinho(hoje, 7)` de `rotuloDiaPorExtenso`, que diz até onde a agenda olha) e "Anotar um
pedido" terciário à direita.

---

## D215 · O link do cardápio vai para perto da agenda

**Status:** vigente · decidida em 2026-09-25, na spec `046-o-que-espera-por-voce.md`; codificada em 2026-09-26

**Decisão.** `LinhaDoCardapioHoje`, montada pela `AgendaHoje` abaixo dela quando a semana tem menos
de 3 pedidos; só a dona, nunca com `usePortao("cardapio") === "fechado"`. Cardápio aberto: "Seu
cardápio está no ar", o número de produtos e "Mandar o link" (a folha do sistema quando há
`navigator.share`, copiar quando não). Cardápio fechado: "Receba pedido por um link" e "Abrir o
cardápio", que leva a `/configuracao?painel=cardapio`; `SeuCardapio` lê o parâmetro uma vez e abre
o painel. O endereço, o `share` e o "Copiado" por 2 s saíram de `SeuCardapio` para
`useLinkDoCardapio()`, usado pelos dois.

**Consequência.** A segunda linha fica só com os produtos: contar os pedidos do mês pelo cardápio
pede consulta nova (os já confirmados saem da agenda), e a spec mandou cortar nesse caso. O número
de produtos é `fichaIds.length`, que conta também um produto marcado e depois arquivado; ler as
fichas na Hoje só para isso não se paga.

---

## D216 · A busca da Hoje responde o preço, com quantidade

**Status:** vigente · decidida em 2026-09-25, na spec `047-quanto-cobrar.md`; codificada em 2026-09-26

**Decisão.** `CampoBusca` "Quanto cobrar? Ex.: 30 brigadeiros" na faixa de ferramentas do
cabeçalho da Hoje. Com texto, `QuantoCobrar` toma o lugar do conteúdo, que fica montado e
escondido (`hidden`): as assinaturas não caem e reabrem a cada letra, e o ponto do mês sai da tela.
Ao começar a busca a página sobe ao topo; ao apagar, volta à rolagem guardada. A quantidade sai do
texto por `lerPedidoDeBusca` (`domain/precificacao.ts`, com teste): número no começo ou no fim,
vírgula decimal, "x", "kg" e "un" colados no número caem, sem número é 1, zero ou mais de 9999 é 1
com o número no termo. Cada linha: nome, `quantidade × preço`, o total em `heading` com o ponto
âmbar só na primeira, e a sobra do total com `custosDeHoje` (a mesma do cartão do vermelho e da
seta de `/fichas`), arredondada em centavos depois de multiplicar. "Depois da maquininha" só quando
`taxaCartaoConsiderada > 0`: a sobra de `verificarPreco` já desconta `somaTaxas`. Sobra negativa:
`TrendingDown`, `text-negative`, "−R$ 4,20: você paga isso para vender". Entram fichas com `ativo`
e preço maior que zero; até 6 linhas, "Ver os N produtos" leva a `/fichas` (que não lê `?busca`).
Sem resultado, a frase e "Montar um produto" terciário para `/fichas/nova`.

**Diferente da spec, e por quê.** O termo perde o "s" final: com `includes` puro, "30 brigadeiros"
não acharia "Brigadeiro tradicional", e o roteiro pede que dê o mesmo que "30 brig". Tirar do fim
só alarga (o que sobra é prefixo do que ela digitou), e a chave continua `chaveDeBusca` contra
`nomeBusca`; `/fichas` fica como está. O "sinal" do negativo vai no valor ("−R$ 4,20"), e a frase
da spec virou "você paga isso para vender" para não ler "você paga menos R$ 4,20".

**Nenhuma consulta nova.** `QuantoCobrar` monta as mesmas duas consultas de
`CartaoNoVermelhoHoje` (fichas e insumos vivos por `nomeBusca`); o Firestore divide o alvo.

---

## D217 · Sem botão primário novo na Hoje

**Status:** vigente · decidida em 2026-09-25, na spec `047-quanto-cobrar.md`; codificada em 2026-09-26

**Decisão.** A busca é campo, não botão: a Hoje continua tela de leitura, sem primário. O
`descricaoSempreVisivel` fica (a data é da Hoje), e o cabeçalho da Hoje passa a ter faixa de
ferramentas, como o de `/fichas`. No celular a faixa gruda com o cabeçalho; com o teclado aberto, o
`apertado:` já encolhe a tinta.

**Consequência.** O cabeçalho cresceu 81 px no desktop (a faixa: 32 de respiro, 48 do campo, 1 de
filete), e a coluna grudenta do mês (`#d212`) passou de `top-36` para `top-56`, medida à mão.

---

## D218 · A faixa do teste conta o que rendeu, com os números da conta

**Status:** vigente · decidida em 2026-09-25, na spec `048-o-teste-que-mostra-o-que-rendeu.md`; codificada em 2026-09-26

**Decisão.** Durante o teste, a `FaixaDoTeste` ganha uma segunda linha em `ink-muted` quando há o
que contar: "{n} produtos com preço" (fichas vivas com `precificacao.precoVenda > 0`) e "R$ … em
vendas em {mês}" (`entradas` do agregado do mês), separados por ponto médio; um dos dois em zero
sai da linha, os dois em zero deixam a faixa em uma linha. "Assinar" deixa de ser texto depois do
ponto médio: fora dos três últimos dias a faixa inteira continua sendo o link para `/assinatura`,
com a seta.

**Diferente da spec, e por quê.** A spec mandava a página passar o resumo e as fichas. A página não
os lê: quem lê é `CartaoDoMes` (o agregado) e `CartaoNoVermelhoHoje` (as fichas), fora do escopo.
Subir as duas leituras para a página mexeria nos dois cartões. A faixa monta as **mesmas** duas
consultas (mesma referência do agregado, mesma consulta de fichas vivas por `nomeBusca`), e o
Firestore divide o alvo, como no `#d216`: nenhuma leitura nova. As duas só montam durante o teste,
num filho que a faixa só cria nessa situação.

---

## D219 · Nos três últimos dias, o preço ao lado do que ela vende, e um botão de verdade

**Status:** vigente · decidida em 2026-09-25, na spec `048-o-teste-que-mostra-o-que-rendeu.md`; codificada em 2026-09-26

**Decisão.** Com `diasRestantes <= DIAS_DE_ATENCAO` a faixa vira bloco no mesmo contorno: o prazo
em `text-attention` com o `TriangleAlert`, a linha do `#d218`, "O completo custa R$ 49,00 por mês:
a sobra de 13 unidades de Cookie Oreo.", "Sem assinar, nada se perde: tudo fica guardado para
ler." (`#d144`) e "Assinar" como botão primário (`classesBotao` primária, 52 px no celular e
largura cheia, 48 px a partir de `lg`). O bloco deixa de ser link: o alvo é o botão.

`sobraQuePagaOPlano(produtos, mensal)` em `domain/assinatura.ts`, com teste: o mais vendido do mês
por `quantidade` (empate: maior `receita`), sobra por unidade `lucro / quantidade` arredondada em
centavos, e `unidadesQuePagam`. Sem produto vendido, sobra zero ou negativa, ou sem preço do Stripe:
`null`, e a linha do preço some sem mexer no resto. É o `#d182` com o produto dela e com sobra em
vez de preço: o plano se paga com o que sobra. Sempre "N unidades de {nome}" ("1 unidade" no
singular): o nome da ficha não tem plural gravado.

O preço é o mensal do **completo** (o teste abre tudo, `#d168`), lido de `/api/assinatura/precos`
uma vez por montagem e só nos três últimos dias. A rota pede token válido, não papel de dona; a
ajudante nunca monta a faixa (`#d156`).

**Consequência.** A Hoje ganha um primário por três dias por conta. Se a 032 passar a permitir
teste do essencial, o preço lido muda para `precos[pacote]`.

---

## D220 · O custo da linha é o do quilo, do litro ou da unidade

**Status:** vigente · decidida em 2026-09-26, na spec `049-o-preco-da-gondola.md`; codificada em 2026-09-26

**Decisão.** A coluna da direita da `LinhaInsumo` mostra o custo no número da etiqueta da
gôndola: `custoDeReferencia(custoUnidadeBaseCorrigido, unidadeBase)` (`domain/unidades.ts`, com
teste) multiplica grama e mililitro por 1000, arredonda em centavos inteiros e diz "o quilo" ou "o
litro"; a unidade fica como está, fracionária, e diz "a unidade". Quilo e litro em
`formatarMoeda`, unidade em `formatarCustoUnitario` (luva a R$ 0,088). O rótulo sai em `micro`
no lugar do "por g"; o custo já é o corrigido pela perda, e a linha do meio continua dizendo a
perda. O leitor de tela lê valor e rótulo na mesma frase: um `sr-only` ", o quilo" junto do
número, e o rótulo visível `aria-hidden`.

**Por quê.** Ninguém compara farinha em reais por grama: o número era o do motor de custo, não o
dela. Com centavos inteiros a coluna também alinha.

**O grama não some.** `ResumoCusto`, `FormularioFicha` e `CartaoLinhaNota` continuam "por g":
ali a conta é "quantos gramas × quanto o grama". A lista é lida no mercado; o formulário, na
bancada. Escolher outra referência (chocolate "por 100 g") ficou fora: seria configuração a manter.

**Junto, na mesma spec.** A idade da contagem sai da linha quando `FRESCA` (até
`IDADE_FRESCA_DIAS`): repetida em quase toda linha, não pedia decisão. E a tela conta
`temPrecoMedio` (o critério do selo, `#d65` e `#d190`) numa faixa informativa com "Mostrar esses", que
leva a um filtro `PRECO_MEDIO` fora das pílulas, saído por "Ver todos" na linha da contagem. A
faixa some em zero e dentro do filtro.

---

## D221 · O custo unitário tem dois dígitos que importam

**Status:** vigente · decidida em 2026-09-26, na spec `049-o-preco-da-gondola.md`; codificada em 2026-09-26

**Decisão.** `formatarCustoUnitario` escolhe as casas pelo tamanho do número: no mínimo dois
dígitos significativos e no mínimo duas casas (`max(2, 1 − ⌊log10 reais⌋)`, teto de 8; zero é
"R$ 0,00"). R$ 0,01495 vira "R$ 0,015", R$ 0,0875 vira "R$ 0,088", R$ 0,60 e R$ 12,50 não mudam.
Erro relativo abaixo de 5%.

**Antes.** Quatro casas abaixo de um centavo e duas acima: entre R$ 0,01 e R$ 0,10, a faixa de
laticínio e chocolate, o erro chegava a 33% (creme de leite a R$ 0,01 o grama, real R$ 0,015).
Não havia teste da função; a tabela da spec está em `tests/domain/money.test.ts`.

---

## D222 · Tocar no material lê; editar é o botão do rodapé

**Status:** vigente · decidida em 2026-09-26, na spec `050-a-ficha-do-material.md`; codificada em 2026-09-26

**Decisão.** Tocar numa linha de `/insumos` abre o `Painel` com `FichaDoMaterial`: o custo (o
quilo com a perda, como na linha), **o preço de cada compra** (`comprasDoInsumo`, sobre o
`historicoPrecos` que o documento já guardava e nenhuma tela lia), **onde entra**
(`usoDoMaterial`: as fichas vivas com o id em `insumoIds`, o custo dele por unidade de rendimento
ao preço de hoje e a parte disso no `custoDeHoje(...).custoUnitario`, maior primeiro, cada uma
indo a `/fichas/{id}`) e a despensa, com a idade sempre. "Editar material" é o primário do
rodapé; "Cancelar" num material existente volta para a ficha e descarta o digitado. "Novo
material" abre direto o formulário. Arquivar continua dentro do formulário.

**O mesmo painel.** `FormularioInsumo` ganhou `leitura`, `aoEditar` e `aoVoltar`: com `leitura`,
ele devolve o `Painel` com a ficha; sem, o de sempre. As duas saídas são o mesmo `Painel` na
mesma posição da árvore, e o React o reaproveita: a troca não fecha, não reabre e não refaz a
transição. O foco vai para o conteúdo do painel na troca, porque o botão que a pediu some junto.

**A entrada da biblioteca não é compra dela.** Num id `biblioteca-`, a entrada que nasceu com o
documento (a mais velha, com `data` igual a `criadoEm`) é o preço médio: rotulada, sem variação,
fora da frase do total e da variação da linha. A comparação com `criadoEm`, e não "a mais velha"
sem mais, porque a poda das doze (`podarHistorico`) acaba levando a da biblioteca embora, e a
mais velha passa a ser compra dela.

**O quilo do histórico é sem perda** (`custoUnidadeBase`): perda mudar não é o preço mudar. O
custo do topo é com perda, porque é o que entra nos produtos, e a frase diz qual.

**A consulta de fichas é a de `ListaFichas`**, idêntica, para cair no mesmo cache: sem rede,
quem já abriu Produtos vê "Onde entra" inteiro. Enquanto ela carrega (ou se a regra negasse),
a seção some, em vez de dizer "nenhum produto" por um instante. A ajudante lê fichas pela regra
atual (`#d157`), e vê tudo.

**Kit que usa o material só pelas receitas de dentro não aparece**: o kit não tem o id em
`insumoIds`. A caixa e a fita do próprio kit aparecem.

---

## D223 · O histórico é uma lista, e a variação vai para a linha

**Status:** vigente · decidida em 2026-09-26, na spec `050-a-ficha-do-material.md`; codificada em 2026-09-26

**Decisão.** Sem gráfico. Doze pontos no máximo, quase sempre dois ou três: uma lista com a
variação escrita ("subiu 9%") diz mais que uma linha subindo, cabe no celular a meio metro e
não pede dependência. Cada compra mostra a variação para a anterior dela a partir de 1%; o
total ("Subiu 19% desde a primeira compra, em …") só com duas compras dela ou mais. Se a conta
passar a ter doze compras em quase todo material, o gráfico volta à mesa.

Na `LinhaInsumo`, ao lado do custo, quando a **última compra dela** mudou o quilo em 5% ou mais
(`variacaoDaUltimaCompra`, `VARIACAO_NA_LINHA`): `trending-up` ou `trending-down` em `ink-muted`,
o número, e em `sr-only` "subiu 9% na última compra". **Sem cor semântica**: preço de material
subir não é erro nem prejuízo, é informação; a consequência mora nos produtos (e na 051). A
atenção já é do custo desatualizado, e usar a mesma cor para "subiu" diluiria o selo.

Os percentuais são inteiros e sem "-0" (`variacaoEntre`); os limiares de 1% e 5% ficam na tela,
e as funções devolvem o número cru.

---

## D224 · O formulário mostra a sobra de antes e a de depois

**Status:** vigente · decidida em 2026-09-26, na spec `051-o-que-o-preco-novo-faz.md`; codificada em 2026-09-26

**Decisão.** Editando um material, o bloco "Com esse preço" (`EfeitoDoPreco`), logo abaixo do
`ResumoCusto`, mostra o quilo (o litro, a unidade) gravado e o digitado com o percentual, e a
sobra por unidade de antes e de depois de cada produto que muda, antes de salvar.
`efeitoDoPrecoNovo` (`domain/custoFicha.ts`, com teste) é `custosDeHoje` com os materiais de hoje
contra `custosDeHoje` com o material trocado pelo custo que `calcularCustoInsumo` dá ao digitado:
o antes é a sobra de hoje, a mesma de `/fichas` (`#d135`), e não a gravada. Só as fichas cuja
sobra mudou, a maior diferença primeiro (com um material só todas mudam no mesmo sentido, então é
a maior queda, ou a maior alta se o preço caiu). Kit entra pelas receitas de dentro, porque
`custosDeHoje` já o recalcula por elas; ao contrário do "Onde entra" da ficha (`#d222`), aqui o
kit que só usa o material pela receita aparece, porque a sobra dele muda.

Três linhas e "e mais N produtos", sem link. Cor semântica só em quem cruza o zero: "fica no
vermelho" em `negative` com `TriangleAlert`, "sai do vermelho" em `positive` com `trending-up`;
as outras dizem a diferença com a seta em `ink-muted`. **Quem cruza sobe para as três linhas**:
a ordem pela diferença poria o produto de R$ 0,12 de sobra atrás de oito cookies, e é ele a
linha que muda a decisão. Na leitura de tela, só a contagem é viva ("Com esse preço, 11 produtos
mudam; 1 fica no vermelho"): a lista a cada tecla seria ruído. A frase genérica da descrição do
painel sai em edição; o bloco é a versão concreta dela.

**Quando aparece.** Em edição, com preço e quantidade para calcular, com as fichas carregadas e
com a lista não vazia. A lista vazia já cobre o `precoMudou` da spec: sem mudança de preço,
embalagem ou perda, o custo por base é o mesmo, e nenhuma sobra muda. **Unidade de outra
grandeza** (g trocado por un) esconde o bloco: as quantidades das fichas estão na base gravada, e
a conta sairia sem sentido.

**Custo.** Dois `custosDeHoje` por tecla, num `useMemo`, com dezenas de fichas: aritmética de
microssegundos. Se a conta crescer a ponto de pesar, `useDeferredValue` no custo digitado, e não
`setTimeout`.

---

## D225 · Materiais no desktop é tabela, com a ficha do material acoplada

**Status:** vigente · decidida em 2026-09-26, na spec `052-a-mesa-dos-materiais.md`; codificada em 2026-09-26

**Decisão.** A partir de `lg`, a `<li>` da `LinhaInsumo` vira grade de seis colunas, no padrão de
`LinhaFicha` (`#d129`): Material (nome, selos, categoria · marca) · Compra (preço · embalagem, a
perda embaixo) · O quilo (`custoDeReferencia`, com "o litro" ou "a unidade" na célula quando não é
quilo) · Última compra (`ultimaCompraDela`: o dia e a variação de `#d223`, a partir dos mesmos 5%) ·
Despensa (o anotado e a idade; com fornada depois da contagem, a projeção no lugar da idade) ·
Entra em (quantos produtos, pelo `usoDoMaterial`; vazia enquanto os produtos carregam). Cabeçalho
`aria-hidden`, rótulo de cada célula em `sr-only`. As colunas são `minmax(0, …)`: a célula quebra em
vez de empurrar a tabela para fora.

O clique na linha, no desktop (`matchMedia`), abre a `FichaDoMaterial` numa coluna de 26rem
acoplada à direita, o arranjo do `PainelProduto` (`#d130`): foco na coluna ao abrir e ao trocar,
`Escape` e "×" devolvem o foco à linha, seleção em `surface-sunken` e derivada de `dados` (material
arquivado fecha a coluna). Abaixo de `lg`, o `Painel` de sempre (`#d222`). "Editar material" no
rodapé da coluna é secundário, porque o primário da tela é "Novo material"; ele abre o `Painel` já
no formulário, e "Cancelar" fecha o painel, porque a ficha já está na tela ao lado.

`/insumos/page.tsx` saiu de `(coluna)`, como `/fichas`; `contagem/` e `nota/` ficaram.

**Com a ficha aberta, a tabela espera o `xl`.** Em 1024px, tirada a barra lateral, a margem e os
26rem da coluna, sobram menos de 300px: seis colunas não cabem nem quebrando. Entre `lg` e `xl`, com
a ficha aberta, as linhas voltam ao arranjo do celular, que foi desenhado para 360px; sem ficha, a
tabela vale desde `lg`. É uma classe condicional na linha e no cabeçalho (`comFicha`), e nenhum
arranjo novo. `/fichas` tem o mesmo aperto em 1024px e não foi mexida.

**Fica em aberto.** A spec condiciona a tabela ao roteiro da 050: se ele mostrar que o painel
lateral basta no desktop, a grade, a coluna acoplada e a mudança de grupo saem, e fica a ordem.

---

## D226 · A lista de materiais tem três ordens, guardadas no aparelho

**Status:** vigente · decidida em 2026-09-26, na spec `052-a-mesa-dos-materiais.md`; codificada em 2026-09-26

**Decisão.** Um `Seletor` "Ordem" na linha da contagem, à esquerda do selo de sincronização, com
**Pelo nome** (padrão), **Preço mudou por último** (a data da última compra dela, a mais nova
primeiro; a entrada da biblioteca não conta, como em `#d222`) e **Pesa mais nos produtos** (a soma,
pelos produtos em que entra, da `parte` do `usoDoMaterial`, a maior primeiro). Sem compra dela ou
sem uso, o material vai para o fim, por nome. `ordenarMateriais(insumos, ordem, peso)` em
`domain/custoInsumo.ts`, com teste; o peso chega pronto num `Map` porque `usoDoMaterial` mora em
`custoFicha.ts`, que importa `custoInsumo.ts`.

**A soma não aparece.** Partes de produtos diferentes somadas não são um número que signifique
algo; servem para ordenar e só.

**No aparelho.** `localStorage` (`rende:ordem-materiais`), lido por `useSyncExternalStore` com o
nome no servidor, todo acesso em `try/catch`; valor desconhecido é "pelo nome". É preferência de
tela, e não dado da conta: não vai para o Firestore. O `select` é o nativo, que no celular o próprio
aparelho abre em folha; a ordem vale com qualquer filtro e busca.

---

## D227 · Kit rende um

**Status:** vigente; o "leva N" da lista saiu com a coluna "Rende" (D228) · decidida em 2026-09-26, na spec `053-o-kit-que-rende-um.md`; codificada em 2026-09-26

**Decisão.** O lote de um kit é uma caixa: `EscolhaDoKit.quantidade` e `ComponenteKit.quantidade`
já dizem o que entra em **um** kit, e o custo do lote é o da caixa inteira. No editor, com o tipo
Kit, os campos "Rende" e "Em" somem, e trocar para Kit põe `rendimento: "1"` e
`unidadeRendimento: "un"` no formulário, sempre (antes só punha o 1 com o campo vazio). A descrição
do bloco "O kit" fala do tempo da montagem, e não de quanto sai de um lote. Na lista (as duas
arrumações) e no cabeçalho do `PainelProduto`, o kit diz **"leva N"**, `levaDoKit`: a soma das
quantidades dos produtos de dentro e das escolhas, derivada e sem campo.

**O kit gravado com outro rendimento não é reescrito.** `kitDividido(ficha)` (`tipo === "KIT" &&
rendimento !== 1`) acende o selo `atencao` "Confira o kit" com `TriangleAlert` na linha, ao lado dos
outros selos, e, no editor, uma faixa no topo do bloco "O kit": "Este kit está dividido por 4. Se
R$ 48,00 é o preço da caixa inteira, ela custa R$ X e perde R$ Y, já com a maquininha", com a ação em
texto "É o preço da caixa inteira", que põe o 1 no formulário. O painel de preço recalcula na hora;
nada grava até ela salvar, e salvo com 1 o selo some.

**Salvar não força o 1.** A spec deixava aberto se o 1 vinha do `onSubmit`. Não vem: o `salvar`
grava o que está no formulário. Forçar no salvar reescreveria o kit antigo na primeira edição de
nome ou foto, sem ela ver a sobra mudar, e apagaria o caso do kit montado de propósito como "lote de
4 caixas". O kit novo nasce com 1 pela troca de tipo, e o campo não aparece para ela mudar; o antigo
muda pela ação.

**A sobra da faixa desconta a maquininha.** O exemplo da spec ("perde R$ 3,52") era preço menos
custo. A faixa usa `verificarPreco` com as taxas da ficha, o mesmo número que o painel de preço e a
lista vão mostrar depois de tocar na ação; dois números para a mesma sobra seriam uma dúvida a mais.
O custo da caixa é `custoTotalLote` do `derivarFicha`, que é o `calcularCustoFicha` com rendimento 1.

**A despensa já estava certa com o 1.** `consumoPorLote` explode os componentes de **um** kit por
lote, e a fornada divide as unidades pelo rendimento: com 4, uma fornada de 4 caixas descontava os
cookies de uma, e a capacidade saía quatro vezes maior. O 1 corrige as duas contas sem tocar em
`producao.ts`. Pedidos pagos ficam com o `custoUnitarioSnapshot` que gravaram.

**A hipótese não foi conferida no dado.** A sessão não teve acesso à conta da Maynara: o Combo
Dupla não foi aberto para ver se os componentes são os de uma caixa. A faixa já pergunta ("Se R$ 48,00
é o preço da caixa inteira…") em vez de afirmar, então vale nos dois casos. Fica para o passo 2 do
roteiro.

**A quantidade concorda com o número.** `rotuloDaQuantidade(n, unidade)`: "1 unidade", "2
unidades", "1 porção", "300 gramas", com até duas casas em pt-BR; singular só quando o número
mostrado é "1". "Pronta/prontas" concorda junto. Trocado onde o número pode ser 1: `FraseDaCapacidade`
(o pronto, as unidades da capacidade, as três frases do pedido), `PainelFornada`,
`TelaContagemPronto`, o "rende" da linha do celular e o "Dividido por" do editor. As opções do
seletor "Em" ficam no plural, porque não levam número. "contadas hoje" na contagem do pronto
continua no plural feminino: não é desta spec.

---

## D228 · A lista de produtos diz o que cada um deixou no mês

**Status:** vigente · decidida em 2026-09-26, na spec `054-o-que-cada-produto-deixou.md`; codificada em 2026-09-28

**Decisão.** As seis colunas do desktop passam a ser Produto · Custo/un · Preço · Sobra/un ·
Vendeu · Deixou. Saem "Rende" (fato da receita, mora no painel e no editor) e "Sugerido" como
coluna: o sugerido só aparece como segunda linha da célula do preço, em `attention` com
`TriangleAlert`, quando o praticado está **abaixo** dele (`precoVenda < precoSugerido` gravado);
acima, silêncio. A sobra por unidade leva a margem embaixo, em `label` `ink-muted`, sem casa
decimal ("52%"). "Vendeu" e "Deixou" são `quantidade` e `lucro` de `ResumoMensal.produtos` do mês
corrente, casados por `fichaId` (o `nome` do resumo não é usado): sem venda, "—" em `ink-subtle`
com "sem venda no mês" para o leitor de tela; "Deixou" negativo com sinal, `negative` e
`trending-down`. "Sem venda" é o critério do ranking do Caixa (`produtosOrdenados`): quantidade ou
receita, em `vendaDoMes`. A contagem nomeia o mês ("12 produtos · vendas de setembro").

`COLUNAS_FICHA` virou `minmax(0, …)` sem o `lg:`, como `COLUNAS_MATERIAL`: o `grid` vem da linha,
`lg:grid` sem painel e `xl:grid` com ele. Com o `PainelProduto` aberto entre `lg` e `xl`, a linha
volta ao arranjo do celular, como Materiais (`#d225`).

**No celular**, a sobra sai do `micro`: "custa R$ 6,20 · **sobram R$ 6,80** (52%)" em `label`, a
sobra em `ink` 600. Embaixo, só com venda, "vendeu 41 · deixou R$ 278,80" ("perdeu" no negativo,
com o ícone). O selo "Kit" sobe para a linha do nome.

**A margem da seta.** Com a seta de `#d230` à vista, a margem mostrada é a de hoje
(`sobra de hoje / preço`), para o percentual não contradizer o número de cima; sem seta, é a
`margemReal` gravada, a mesma que ordena.

**Some o "rende N" e o "leva N" da linha**, nas duas arrumações. A spec tirava o "rende"; o "leva"
do kit (`#d227`) morava na mesma coluna e no mesmo lugar do celular, e sai junto: continua no
cabeçalho do painel e no editor.

**A ajudante não lê o resumo.** `agregados` é do dinheiro (`#d157`), e a regra nega. Para ela a
leitura nem é aberta (referência `null`, como no `FormularioPedido`), a contagem não nomeia o mês e
a ordem "Deixou mais no mês" não é oferecida. As colunas continuam com "—": esconder duas colunas
por papel seria outro arranjo de tabela, e ela já via preço e sobra.

---

## D229 · A lista de produtos tem quatro ordens, guardadas no aparelho

**Status:** vigente · decidida em 2026-09-26, na spec `054-o-que-cada-produto-deixou.md`; codificada em 2026-09-28

**Decisão.** O `Seletor` "Ordem" de `/insumos` (`#d226`) na linha da contagem de `/fichas`, com
**Pelo nome** (padrão), **Deixou mais no mês** (`lucro` do resumo, maior primeiro; sem venda no
fim, por nome; prejuízo antes de sem venda), **Sobra por unidade** e **Margem** (maior primeiro,
empate por nome). `ordenarFichas(fichas, ordem, produtosDoMes)` em `domain/custoFicha.ts`, com
teste; vale depois da busca e do filtro. `localStorage` `rende:ordem-produtos`, lido por
`useSyncExternalStore` com o nome no servidor, tudo em `try/catch`.

**A sobra e a margem que ordenam são as gravadas** (`lucroUnitario`, `margemReal`), e não as de
hoje: a função é pura sobre a ficha, e abaixo do limiar de `#d230` a diferença não troca ninguém de
lugar de um jeito que ela perceba. Se o roteiro mostrar produto fora de ordem com seta à vista, a
função recebe o mapa de `custosDeHoje`.

---

## D230 · A seta da linha só aparece quando a diferença vale uma olhada

**Status:** vigente · decidida em 2026-09-26, na spec `054-o-que-cada-produto-deixou.md`; codificada em 2026-09-28 · substitui a metade da linha de D136

**Contexto.** `#d136` mandava a linha mostrar toda diferença entre a sobra gravada e a de hoje. Nos
três combos, "R$ 35,12 → R$ 35,09": um quarto da tabela dizendo "mudou" sobre 0,1%, e ela aprende
a não olhar a seta, inclusive no dia em que importa.

**Decisão.** `sobraMudouDeVerdade(gravado, hoje, preco)` em `domain/custoFicha.ts`, com teste: a
seta aparece quando o sinal cruza o zero, ou quando `|hoje − gravado| ≥ max(R$ 0,10, 2% do preço
praticado)`. Abaixo disso, a linha mostra a sobra de hoje sem seta, e o selo "Custo desatualizado"
continua dizendo que o gravado envelheceu. O `PainelProduto` e o `CartaoNoVermelhoHoje` não mudam:
o painel é o lugar do centavo, e o cartão já conta cruzamento.

---

## D231 · A falta é uma faixa, e a linha diz uma coisa só

**Status:** vigente · decidida em 2026-09-26, na spec `055-o-que-falta-pra-fazer.md`; codificada em 2026-09-28

**Contexto.** Na conta da Maynara, 6 das 12 linhas de `/fichas` diziam em ocre "não dá nem uma
fornada · falta Biscoito Oreo", explicadas por quatro materiais. O alarme em toda linha deixa de
ser alarme, não levava a lugar nenhum, e a célula do produto no desktop ia de uma a quatro alturas.

**Decisão.** Acima da lista, abaixo da linha da contagem, uma faixa de atenção (a "Faixa de aviso"
do `DESIGN.md`, o mesmo desenho da `Faixa` do editor) só quando há produto visível com
`fornadas === 0` e gargalo: "**6 produtos param por falta de 4 materiais:** Biscoito Oreo, Cream
cheese, Creme de pistache e Amido de milho.", com `listarNomes(…, 4)` e o total no cabeçalho
mesmo com "e mais N". `faltasDaLista(capacidades)` em `domain/producao.ts`, com teste: materiais
por `insumoId`, sem repetir, o que trava mais produtos primeiro, empate na ordem da lista. Conta o
que a busca e o filtro deixam à vista. O aviso de material sem contagem continua separado: um
pede compra, o outro contagem.

**A ação diz "Abrir a lista de compras"**, e não "Ver o que comprar". `/compras` monta a demanda
dos pedidos abertos e da reserva de fornadas (`reservaDeProducao`, só fichas com piso); o produto
sem piso que não dá uma fornada pode não pôr o material lá, e a faixa não promete o que a lista
não garante. Se o roteiro mostrar que ela chega e não acha, é a spec do "pôr na lista com um
toque" (fora de escopo da 055).

**A linha.** `FraseDaCapacidade` e `FraseDoPronto` ganham `curta`, uma linha sem quebra (o texto
trunca): "7 prontas" (a unidade e a porção perdem o nome; grama e mililitro ficam inteiros),
"dá 1 fornada", "dá pelo menos 1 fornada" no `PISO`, "não dá para saber" no `DESCONHECIDA`, e
"falta X" com o triângulo em `attention` e o texto em `ink-muted`. Saem da linha a idade da
contagem, o "além dos pedidos", as unidades, o "acaba primeiro" e os nomes sem contagem.

**O detalhe vai para o painel.** O `PainelProduto` ganha "Pra produzir", entre o cabeçalho (e o
aviso de custo desatualizado) e "O custo do lote", com as duas frases inteiras e os mesmos números
da linha (a capacidade e o reservado vêm de `ListaFichas`).

**O editor não tinha a capacidade.** A spec contava que o `FormularioFicha` já usava
`FraseDaCapacidade`; ele só usa `FraseDoPronto` (com a idade da contagem). No celular, onde a linha
leva ao editor, as unidades e o "acaba primeiro" não aparecem mais em lugar nenhum. Pôr a frase no
editor pede os pedidos abertos no `EditorFicha` (`useDespensaParaProduzir`), para o número não
discordar da lista, e isso sai do escopo da spec: fica para decisão.

---

## D232 · O mês diz do cardápio em até três frases

**Status:** vigente · decidida em 2026-09-26, na spec `056-o-que-o-mes-diz-do-cardapio.md`; codificada em 2026-09-28

**Contexto.** Depois da 054 a lista tem "Vendeu" e "Deixou" ao lado da sobra por unidade, mas
cruzar doze linhas em duas dimensões continuava sendo trabalho dela. A engenharia de cardápio das
ferramentas pagas é um gráfico de quadrantes com rótulo por produto: a anti-referência do
dashboard SaaS e o selo que o `PRODUCT.md` recusa.

**Decisão.** Um bloco em `surface`, "O que {mês} diz", entre a faixa da falta (`#d231`) e a
lista, com até três frases em `body`, cada nome como link (desktop: o `PainelProduto`; celular: o
editor, o mesmo clique da linha, `DESKTOP` exportado de `LinhaFicha`):

1. **Quem sustenta o mês:** o maior `lucro` do resumo, só se positivo.
2. **Vende muito e deixa pouco:** `quantidade ≥ mediana` e `margemReal < mediana`, o de maior
   quantidade, com o "e se" do `#d233`. Com a sobra negativa, "perde".
3. **Deixa muito e vende pouco:** `margemReal ≥ mediana` e `quantidade < mediana`, o de maior
   `lucroUnitario`, sem sugestão.

`leituraDoCardapio(produtosDoMes, fichas)` em `domain/caixa.ts`, pura, com teste, devolve dados e
não texto. As medianas (a do meio, ou a média das duas do meio) são sobre os produtos vendidos no
mês com ficha viva, pela filtragem da linha zerada de `produtosOrdenados`; o nome é o da ficha, não
o do resumo (`#d228`). Mínimo de 4 produtos e 30 unidades, senão nenhum bloco. Um produto numa
frase só, na ordem das frases (as frases 2 e 3 já são disjuntas pela quantidade; a exclusão
importa entre a 1 e as outras). Frase sem candidato some; nenhuma, nenhum bloco. O "deixa R$ X em
cada" é a `lucroUnitario` gravada, a mesma da coluna Sobra/un.

**O mês.** `mesDaLeitura(agora)`: o corrente a partir do dia 10, antes o anterior; o título o
nomeia. **Diferente da spec, e por quê:** a spec dizia "nenhuma consulta além da da 054", mas do
dia 1 ao 9 o mês lido não é o das colunas, e o resumo do mês anterior é outro documento. A lista
abre essa segunda leitura (`docResumoMensal` do mês anterior, a mesma regra) só nesses nove dias e
só para a dona; do dia 10 em diante, reaproveita a leitura da 054. As colunas continuam no mês
corrente.

**No celular**, um `<details>` nativo fechado com o título e a primeira frase no `<summary>`; no
desktop, o mesmo `<details>` aberto na montagem (`matchMedia` do `lg`), e ela pode fechá-lo. Com
uma frase só não há o que abrir, e o bloco é uma `section` sem `<details>`. `<section>` com
`aria-labelledby` no título, sem `aria-live`. A ajudante não lê o resumo (`#d157`) e não vê o
bloco.

---

## D233 · O "e se" assume as mesmas vendas

**Status:** vigente · decidida em 2026-09-26, na spec `056-o-que-o-mes-diz-do-cardapio.md`; codificada em 2026-09-28

**Decisão.** "R$ X a mais, com as mesmas vendas, teriam sido R$ Y no mês." `eSeCobrasseMais` em
`domain/caixa.ts`, com teste, em centavos inteiros: **X** é o maior entre `precoSugerido −
precoVenda` e 10% do `precoVenda` (arredondado ao centavo), arredondado para cima ao múltiplo de
10 centavos; **Y** é `X × quantidade × (1 − somaTaxas/100)`, arredondado ao centavo, porque a
maquininha leva a parte dela do aumento. Produto sem preço (`precoVenda` 0) não é candidato.

O Rende não sabe quanto a cliente aceita: a frase diz "com as mesmas vendas" e nunca "suba o
preço". Reajuste em lote fica para outra spec.

---

## D234 · O selo de sincronização é do cabeçalho

**Status:** vigente · decidida em 2026-09-30, na spec `057-o-aparelho-em-toda-tela.md`; codificada em 2026-09-30

**Contexto.** O `SeloSincronizacao` era chamado em onze telas, em quatro lugares diferentes (nas
ações do cabeçalho, na linha da contagem, numa linha própria de 32px que existia mesmo vazia no
Caixa, dentro do período de `/compras`). A Hoje e o `/comecar` não o tinham. O `pendente` vinha do
`hasPendingWrites` da coleção da tela, então a venda registrada em `/pedidos` sem rede sumia do
selo ao voltar para a Hoje. E a volta da rede, o momento que prova que o "Salvo no aparelho" era
verdade, não aparecia.

**Decisão.** O `CabecalhoPagina` desenha o selo sempre, na linha da descrição, depois dela
(`flex flex-wrap items-center gap-x-2`), e nunca ao lado do "+", que em 360px já disputa espaço
com o título. No celular, onde a descrição some, o selo vazio não ocupa altura (`not-empty:mt-1`).
A tela passa o `pendente` que já calcula pela prop nova `pendente?: boolean`; nenhuma tela desenha
o selo por conta própria. As onze saíram; a linha vazia do Caixa saiu junto, e o corpo dele passou
de `mt-2` para `mt-4`, o respiro das outras telas. As onze estavam todas sob um `CabecalhoPagina`
(incluindo `/configuracao`), então nenhuma ficou de fora.

**A volta.** Quando `useConexao` passa de `false` para `true`, o selo diz "Enviando" e chama
`waitForPendingWrites(db)`, que espera **todas** as escritas do aparelho, e não só as da tela; ao
resolver, "Tudo enviado" (tom `positivo`, ícone `Check`) por 4 segundos, depois some. Se a
promessa falhar, o selo se cala. A transição é detectada durante a renderização (o estado guarda o
`online` anterior), e não num efeito, para nascer no mesmo quadro. `ponytail:` a transição mora no
componente: trocar de tela no meio da espera monta um selo que já nasce online e não diz "Tudo
enviado". Aceito; guardar a volta fora dele só se o roteiro mostrar que isso engana.

**Diferente da spec, e por quê.** A spec pedia `role="status"` na linha. Ele vai num `<span>` em
volta do selo, dentro da linha, sempre montado: a descrição de algumas telas muda com o dado (o
código do pedido, a data da Hoje), e um `status` na linha inteira a faria ser relida. A queda da
rede ("Salvo no aparelho") e a volta ("Tudo enviado") são anunciadas do mesmo jeito.

**Contraste.** O selo não lê nenhum token do escopo `sobre-marca` (`#d128`). No escuro, a pílula
`--attention-bg` (#34280F) quase se funde com a faixa `brand-700` (#2A2C3A), mas o texto
`--attention` (#E3B267) sobre ela passa folgado, e o ícone carrega o sentido junto; o mesmo vale
para o positivo e o informativo.

**A recusa continua muda.** O comentário de `(app)/layout.tsx` dizia que a escrita recusada por
relógio atrasado aparecia como `permission-denied` no selo. O selo nunca leu erro; o comentário
agora diz que ela não aparece em lugar nenhum. Mostrá-la é outra spec: precisa de um lugar que
guarde o erro da mutação.

---

## D235 · "Pedidos" diz quantos esperam

**Status:** vigente · decidida em 2026-09-30, na spec `058-o-pedido-que-chegou.md`; codificada em 2026-09-30

**Contexto.** O pedido que a cliente faz pelo cardápio (031) só aparecia na Hoje ("Esperando
você", `#d213`) e em `/pedidos`. Em qualquer outra tela nada mudava, e a navegação só com ícone
(`#d150`) desenha Pedidos igual com zero ou com cinco esperando.

**Decisão.** Um número em "Pedidos", na navegação inferior e na barra lateral, em toda tela do
shell, para a dona e para a ajudante. Conta `esperaDoCardapio` (`domain/pedido.ts`): `status
ORCAMENTO` e `origem CARDAPIO`, de qualquer data, o mesmo predicado da primeira linha de
"Esperando você", que passou a lê-lo dali. Conta o que espera, e não o que é novo: não há "visto",
nenhum campo, nenhum estado no aparelho. Some quando ela confirma ou cancela.

**A fonte.** `useEsperaDoCardapio()` em `layout/navegacao.ts` assina `consultaAgenda(contaId)`, a
mesma função (mesmos `where` e `orderBy`) de `/pedidos` e da Hoje: o SDK junta ouvintes de consultas
iguais num alvo só, e nenhuma leitura nova sai. As duas navegações ficam montadas juntas (uma some
por CSS), e são dois ouvintes do mesmo alvo. Sem `contaId`, a consulta é `null` e o número é zero.
Sem rede, o número é o do cache.

**A marca.** Celular: `micro` 600 `tabular-nums`, 18px de mínimo, `brand-700` com `on-brand`, raio
cheio, com a borda esquerda em 40px da pílula de 32×56, onde o ícone de 24px termina: não o cobre,
e o "9+" cabe na coluna de 72px de 360px com cinco destinos. Desktop: na ponta do item, `on-brand`
com `brand-800`. Nem âmbar (é assinatura) nem vermelho (não é erro). O `aria-label` e o `title` do
link dizem "Pedidos, 2 pedidos do cardápio esperando" (singular com 1); o número é `aria-hidden`.
Acima de 9, "9+".

**Contraste no escuro.** No celular o `brand-700` fica escuro nos dois temas, e a pílula do número
quase some sobre a superfície escura; o número em `on-brand` continua legível, e é ele que carrega
o sentido. Aceito como a spec desenhou; um anel em volta só se o roteiro mostrar que não se vê.

## D236 · A barra diz de quem é, e o teto de cinco é da navegação inferior

**Status:** vigente · decidida em 2026-09-30, na spec `059-a-barra-diz-de-quem-e.md`; codificada em 2026-09-30

**Contexto.** A barra lateral mostrava o logotipo e, no pé, o e-mail. O nome do negócio não
aparecia no shell. Ela copiava o teto de cinco destinos da navegação inferior, e `/compras` e
`/clientes` só se alcançavam no desktop por atalhos de cabeçalho. O prazo do teste só existia na
Hoje, e o teclado passava por toda a barra antes do conteúdo.

**Decisão.**

- **Topo.** O logotipo continua sozinho na linha dele; embaixo, `conta.nome` (o negócio, e não
  `proprietaria`) em `label` 600 `on-brand`, truncado, com `title`. É onde um seletor de conta
  entraria no dia em que existir (`#d01`).
- **Meio.** Dois grupos na mesma `<nav>`: os cinco `DESTINOS` e, depois de 16px sem título nem
  filete, `DESTINOS_DA_BARRA` (Compras, Clientes), ao lado de `DESTINOS` em `navegacao.ts`. Os dois
  passam por `destinosDo(papel, …)`: a ajudante vê Compras e não Clientes (`ROTAS_SO_DA_DONA`). A
  navegação inferior não muda, o teto dela é físico (56px por alvo). Os atalhos do cabeçalho ficam:
  são contextuais. A `<nav>` rola se a tela for baixa; o pé não.
- **Pé.** Só a dona, só em `teste`: `Hourglass`, `fraseDoTeste(dias)` em `on-brand-muted` e
  "Assinar" em `on-brand` 600 para `/assinatura`, acima de "Como funciona". Sem tom de atenção: a
  urgência dos três últimos dias é da Hoje (`#d219`). Livre, assinante, vencida e ajudante: nada.
- **Pular para o conteúdo.** Primeiro foco do `AppShell`, `sr-only` até o foco, leva a
  `<main id="conteudo" tabIndex={-1}>`. O `main` não desenha anel: ele só recebe o ponto de partida
  do próximo Tab.
- **Limpeza.** `ModuloPendente` sai (ninguém o importava). Os itens saem de `ItemDaBarra`, e o
  botão "Sair" usa as mesmas classes (`classesDoItem`).

**Consequência.** A barra e a navegação inferior deixam de ter a mesma lista: quem mexer em
destino confere as duas. O nome do negócio passa a ser lido no shell inteiro; um nome longo trunca
e mostra o resto no `title`.

## D237 · O cabeçalho dá passagem nas listas do celular

**Status:** vigente · decidida em 2026-09-30, na spec `060-o-cabecalho-da-passagem.md`; codificada em 2026-09-30

**Contexto.** Em 360×640, na lista de materiais, as duas faixas do cabeçalho e a navegação inferior
somavam ~186px fixos, 29% da altura. Descendo pela lista, o título repete a pílula da navegação
inferior; o que ela usa enquanto rola é a busca e as pílulas, na faixa de ferramentas. E voltar ao
topo de uma lista longa era arrastar a tela inteira.

**Decisão.**

- `CabecalhoPagina` ganha `recolhe`, passado só por `/insumos`, `/fichas`, `/pedidos`, `/clientes`,
  `/financeiro` e `/compras`. Editores e contagens não: o voltar e o Salvar moram na faixa.
- Abaixo de `lg`, descendo mais de 8px com a rolagem além da altura da faixa, o `<header>` sobe
  (`translate`, a propriedade que o `translate-y-*` do Tailwind v4 escreve) pela altura da faixa
  menos `env(safe-area-inset-top)`. Subindo mais de 8px, ou com a rolagem dentro da altura da
  faixa, volta. No desktop as classes não valem (`max-lg:`), e nada muda.
- **A tira da área segura.** O que sobra à vista da faixa são os últimos pixels dela, e não o
  respiro de cima; por isso os filhos da faixa vão a `opacity-0` junto, e sob o relógio do iPhone
  fica tinta lisa, nunca título cortado nem lista.
- **A medida** vem de um `ResizeObserver` na faixa, que escreve `--altura-faixa` no `<header>`; o
  ouvinte de rolagem é `passive`, passa por `requestAnimationFrame` e só lê `scrollY`.
- **Não muda:** com o foco num campo de digitar dentro do cabeçalho (a busca aberta) a faixa
  congela, nem sai nem volta, e o teclado que abre não a mexe. Só campo de digitar, e não qualquer
  foco: a pílula de filtro é `<button>`, guarda o foco depois do toque, e congelar por ela deixava
  a faixa recolhida presa até o foco sair, mesmo rolando para cima. Sem rede ela não recolhe, e volta se já estava recolhida: o
  "Salvo no aparelho" precisa estar à vista (o `useConexao`, a mesma fonte do selo). O foco que
  entra na própria faixa (Tab até o "+" escondido) a traz de volta.
- **Movimento reduzido:** sai só o deslize (`motion-safe:` na transição); a faixa some e volta
  igual.
- O "+" sai junto com a faixa: subir um pouco o traz de volta, e levá-lo para a faixa de
  ferramentas quebraria o lugar da ação primária (`#d151`).
- **Tocar na aba ativa**, na `NavegacaoInferior`, com `href` igual ao caminho exato, rola a janela
  ao topo (`smooth`, `auto` com movimento reduzido), por `onClick` com `preventDefault`. Não se
  confiou no `Link` do Next para a mesma URL: o `preventDefault` evita a navegação à toa e deixa o
  gesto igual em qualquer versão. Em `/fichas/contagem`, Produtos continua navegando.

**Conferido antes do código.** A sangria não quebra: o `overflow-x: clip` do invólucro só corta no
eixo x, e o deslize é no y. O `Painel` aberto trava `body` em `overflow: hidden` e rola por dentro
com `overscroll-contain`, então a janela não rola e o recolher não dispara. O `translate` só existe
com a faixa recolhida: sem ele o `<header>` não vira bloco de contenção dos `fixed` de dentro.

**Consequência.** O `CabecalhoPagina` passa a ser `"use client"` (todas as telas que o usam já
eram). O grupo é nomeado (`group/cabecalho`) para que um `group-hover:` de linha na faixa de
ferramentas não case com o `<header>`.

## D238 · A foto da bancada na `/conheca`, fora do precache

**Status:** vigente · decidida e codificada em 2026-09-30, fora de spec, a pedido de quem conduz o projeto

**Contexto.** A página de venda não tinha nenhuma imagem: as telas do mês esperam as capturas
(`#d181`) e a foto do depoimento espera autorização (`#d175`). Veio uma foto gerada por IA da
bancada: o cookie sendo ensacado, o adesivo, o gás aceso e a balança, que é a frase do topo ("o
saquinho que ninguém soma, o gás que ninguém conta") em imagem. A página precisa continuar com 90+
no Lighthouse.

**Decisão.**

- **Faixa larga entre o topo e "Agora a conta do seu cookie"**, sangrando até as bordas, altura
  `min(75vw, 36rem)`, sem raio. No celular o corte fica nas mãos e no cookie (`object-[80%_65%]`);
  no desktop, no centro. A foto é o separador: o filete do topo de `SuaConta` saiu.
- **Não é o fundo do topo.** Viraria o LCP da página (hoje é o `h1`, texto), disputaria com a
  `ContaAberta` e poria texto sobre foto. Abaixo da dobra ela carrega sob demanda e não pesa na nota.
- **Decorativa**: `alt=""`, sem legenda. É imagem gerada; nunca é apresentada como a Maynara nem
  como a cozinha da MyCookie's, e não ocupa o lugar da foto do depoimento (`#d175`).
- **Arquivo**: `src/app/conheca/bancada.jpg`, 2400px, JPEG 80 (183 KB), importado estaticamente:
  largura e altura vêm do import (sem salto de layout) e o `placeholder="blur"` sai de graça. O
  `/_next/image` entrega AVIF ou WebP no tamanho da tela (`images.formats`).
- **Fora do precache.** O Serwist põe no precache todo arquivo de `public/` e todo asset do
  webpack, inclusive as imagens de `_next/static/media`. Uma foto que o app instalado nunca mostra
  desceria em toda instalação. O `exclude` do `withSerwistInit` repete os dois padrões dele e tira
  `/static/media/*.{jpg,png,webp,avif}` (o `next-image-loader` emite o nome com a barra na frente).
  Por isso a foto não mora em `public/`.

**Consequência.** Imagem importada em qualquer tela fica fora do precache: se um dia uma tela do
app precisar de imagem offline, ela entra por `additionalPrecacheEntries` ou pelo cache de tempo de
execução. A foto é de cookie; a página inteira já é (`EXEMPLO`), e o "Nada de biscoito" do
`DESIGN.md` é sobre ícone e símbolo, não sobre fotografia.

## D239 · A passada das diretrizes de interface nas páginas públicas

**Status:** vigente · decidida e codificada em 2026-09-30, fora de spec, a pedido de quem conduz o projeto

**Contexto.** As páginas públicas (`/conheca`, `/como-calcular-o-preco-do-cookie`, `/c/[contaId]`,
`(auth)/*` e `/offline`) passaram pelas Web Interface Guidelines da Vercel. O que valia a pena
corrigir foi corrigido; o que ficou de fora está listado abaixo, com o motivo.

**Decisão.**

- **O "Criar conta" do cadastro fica sempre ativo.** Antes ele ficava apagado até tudo estar
  preenchido, sem dizer o que faltava. Agora ele valida no envio, põe o erro embaixo de cada campo
  (e da caixa dos termos) e leva o foco ao primeiro, como o login já fazia. A caixa dos termos
  virou um `<label>` inteiro: o contorno de 44px é o alvo, sem área morta.
- **O cardápio guarda o que a cliente digitou antes de recarregar.** O `mudou`/`acabou` recarrega a
  página em 3 s; antes, nome, WhatsApp, dia, entrega e recado se perdiam junto com o carrinho.
  Agora vão para o `sessionStorage` (morre com a aba; o `localStorage` voltaria no celular
  emprestado) e voltam preenchidos; o carrinho recomeça, porque é ele que mudou. A chave é lida uma
  vez e apagada.
- **O foco não cai no `body` no cardápio.** "Adicionar" vira `− 1 +` e o `−` no 1 volta a ser
  "Adicionar": o foco vai para o último botão ativo do controle novo. Os rótulos viraram
  "Diminuir/Aumentar {nome}", que não erram o gênero ("Mais um Dupla").
- **O painel de marca da `MolduraDeEntrada` vem depois do `main` no DOM** e fica à esquerda pelo
  `order-first`: o `h2` da `ContaAberta` do painel não passa à frente do `h1` da tela.
- **Os termos e a privacidade leem o número da seção** (o texto remete à "seção 1") e cada seção
  tem `id="secao-N"`. O "Voltar" fixo para `/login` virou "Ir para o início", em `/`, que manda cada
  um ao seu lugar pelo guarda do `(app)`.
- **As barras fixas do cardápio e da `/conheca` põem `scroll-padding` no `html`**, pela variante
  `[html:has(&)]`, só enquanto existem: o foco do teclado para fora delas.

**Ficaram de fora.** O dia "25/9" dos botões do cardápio continua montado à mão: o `Intl` em pt-BR
dá "25/09", e o curto é de propósito. A capa do cardápio não ganha `width`/`height`: a proporção é a
da foto dela, e a altura fixa da classe já guarda o lugar. O `theme-color` continua `brand-700`
(`#d124`).

## D240 · A barra com o "+" no centro e o ⋯

**Status:** vigente · decidida em 2026-09-30, na spec `061-o-mais-na-mao.md`; codificada em 2026-09-30.
Revisa o `#d150` (cinco destinos) e o `#d151` (o "+" no cabeçalho e a bandeja).

**Contexto.** O "+" do `#d151` mora no canto superior direito do cabeçalho, o ponto da tela mais
longe do polegar de quem segura o celular com uma mão (mercado, entrega, feira), e desde o `#d237`
ele ainda sai com a faixa ao descer. E cada tela só criava o que era dela: lançar no caixa estando
em Produtos custava dois toques de navegação antes do "+". Com cinco destinos e o "+", a barra
teria seis espaços e nenhum centro.

**Decisão.** Cinco espaços iguais: **Hoje · Pedidos · + · Produtos · ⋯** (escolha de quem conduz
o projeto entre três arranjos). `DESTINOS_DO_CELULAR` e `DESTINOS_DO_MAIS` em `navegacao.ts`;
`DESTINOS` continua sendo o da barra lateral. O ⋯ (`Ellipsis` de 20px, menor que os 24px dos
destinos: é a saída para o resto, e não um lugar) abre o `Painel` "Mais" com Materiais, Caixa,
Compras e Clientes em linhas de 52px, filtrados por `destinosDo` (a ajudante vê Materiais e
Compras). Leva a pílula de ativo quando ela está numa dessas páginas; a linha da página atual
também. O "+" é um círculo cheio `accent-500` de 48px, dentro da barra e sem sobressair dela:
não é a pílula flutuante que o `#d151` tirou. `BotaoMais` foi apagado; os botões do cabeçalho
continuam, só no desktop.

**Consequência.** O cabeçalho do celular fica só com título, descrição e, nos editores, o voltar.
"O que comprar" e "Clientes", que moravam na bandeja de Pedidos, passam ao ⋯. O "+" é o primário
do celular em toda tela com a barra, inclusive com o estado vazio na tela: é cromo, como a barra,
e o botão do estado vazio continua o primário do conteúdo. O desktop não muda.

## D241 · A grade do "+" e o gesto de apertar, arrastar e soltar

**Status:** vigente · decidida em 2026-09-30, na spec `061-o-mais-na-mao.md`; codificada em 2026-09-30

**Contexto.** Com o "+" na barra, ele deixa de ser da tela e passa a ser do app: tudo o que se
registra cabe atrás dele. E o polegar que já está na barra pode fazer o caminho inteiro sem sair
do vidro.

**Decisão.** `src/components/layout/GradeAdicionar.tsx`:

- **Sete ações em ordem fixa**: Novo pedido (largura inteira), Lançar no caixa, Novo produto,
  Novo material, Ler uma nota, Contar a despensa, Contar o que está pronto. A ajudante não vê
  Caixa nem nota (`#d157`). A ordem não muda por tela: o gesto depende da memória do polegar.
- **Arranjo:** duas colunas, ícone, nome e uma linha do que é, divisórias de 1px (`gap-px` sobre
  `line`) e não um cartão por item; presa acima da barra, que continua à vista, sob o véu do
  `Painel` (`brand-800/35`) que cobre a tela e não a barra. O "+" gira 45° e vira o "×".
- **O gesto:** `pointerdown` abre na hora e captura o ponteiro; com mais de 10px de arraste,
  `elementFromPoint` acha o item sob o dedo (`data-acao`) e o pinta de `brand-100`, com
  `navigator.vibrate?.(8)` quando ele muda. Soltar sobre um item executa; soltar sem arrastar, ou
  no vazio, deixa a grade aberta para tocar. `touch-none` e `-webkit-touch-callout: none` no "+".
- **Teclado e leitor de tela** entram pelo `click`: o `click` que segue um ponteiro tratado há
  menos de 500ms é ignorado, e qualquer outro alterna e leva o foco ao primeiro item. É uma
  revelação (`aria-expanded`, `aria-controls`), e não um diálogo: a barra continua à vista.
  `Escape` fecha e devolve o foco ao "+"; tocar nos outros itens da barra fecha.
- **O véu fecha no `click`, e não no `pointerdown`**: fechado no apertar, ele deixaria de segurar
  o toque e o `click` cairia na linha da lista por baixo.
- **O repasse.** "Novo material" e "Lançar no caixa" abrem painéis dentro da tela. A grade chama
  `pedirAcao` (`src/lib/acaoPedida.ts`) e navega; a tela consome o pedido com `useAcaoPedida` ao
  montar ou, se já está aberta, na hora. Em memória, e não na URL: `useSearchParams` pediria
  `Suspense` nas duas telas, e o repasse funciona sem rede.
- `/pedidos/novo` e `/fichas/nova` escritos à mão: importar `ID_PEDIDO_NOVO` e `ID_FICHA_NOVA`
  traria os dois editores para o pacote de toda tela.

**Consequência.** "Ler uma nota" sem rede fica `aria-disabled`, com `MENSAGEM_FALHA["sem-rede"]`
no lugar da linha, como na bandeja. Nem Popover API nem `Painel`: a camada de cima cobriria a
barra, e o "×" precisa estar onde o dedo está.

## D242 · A ordem em folha no celular

**Status:** vigente · decidida em 2026-09-30, na spec `061-o-mais-na-mao.md`; codificada em 2026-09-30

**Contexto.** A ordem de Materiais (`#d226`) e de Produtos (`#d229`) era um `Seletor` nativo na
linha da contagem: um rótulo "Ordem" e uma caixa que abre a roleta do sistema, sem dizer o que
cada ordem faz. O `DESIGN.md` já prometia que o seletor, no celular, abre a folha inferior.

**Decisão.** `src/components/ui/EscolhaDeOrdem.tsx`. Abaixo de `lg`, um botão terciário de 44px
com `ArrowUpDown` e o nome da ordem atual, que abre o `Painel` "Ordenar materiais" / "Ordenar
produtos": uma linha de 52px por ordem, rádio nativo em `sr-only` dentro do `<label>`, nome e o
que a ordem faz, `Check` na escolhida. Escolher fecha; tocar na já escolhida também. No desktop, o
`Seletor` de sempre. A ordem continua guardada no aparelho.

**Consequência.** Cada ordem ganhou uma `linha` com o que ela faz ("O que mais pesa no custo dos
produtos, antes"). A leitura do `localStorage`, igual nas duas telas, continua duplicada: fica
para quando vier a terceira.

## D243 · O cabeçalho de contexto no papel

**Status:** vigente · decidida em 2026-09-30, a pedido de quem conduz o projeto, na sessão da spec
`061-o-mais-na-mao.md`. Revisa a faixa `brand-700` do `#d128`.

**Contexto.** Quem conduz o projeto pediu para tirar o fundo do cabeçalho, no celular e no
desktop. A faixa de tinta era a maior área cheia de marca dentro do conteúdo, e com o "+" saindo
dela (`#d240`) ficou só com o título.

**Decisão.** A faixa de contexto do `CabecalhoPagina` sai do `brand-700` e do escopo
`sobre-marca`: fundo `bg-canvas` (o `<header>` é grudento e a lista passa por baixo), título
`ink`, descrição `ink-muted`, e as ações com os tokens de sempre. O filete `line` fica embaixo da
última faixa: a de ferramentas quando há `children`, senão a de contexto.

**A barra de status.** No iPhone instalado ela é translúcida e o relógio é branco
(`black-translucent`); sobre o papel ele sumiria. Trocar para `default` pintaria a barra de branco
também no tema escuro. Então o `AppShell` ganha uma tira fixa `brand-700` com a altura de
`env(safe-area-inset-top)`, acima do cabeçalho: no navegador ela mede zero; no app instalado faz
par com o `theme_color` do Android (`#d124`), que continua o mesmo e não pede reinstalação. Com a
faixa recolhida (`#d237`), o que sobra dela fica sob a tira.

**Consequência.** O `sobre-marca` continua existindo para os blocos de tinta das páginas
públicas. A marca no app fica na barra lateral, na pílula ativa e no âmbar.

## D244 · O seletor de tema

**Status:** vigente · decidida em 2026-09-30, a pedido de quem conduz o projeto. Revisa a linha
"Não há alternador de tema" do `DESIGN.md`.

**Contexto.** O tema seguia só o `prefers-color-scheme`. Quem conduz o projeto pediu para escolher
claro ou escuro independente do aparelho: o celular pode estar no escuro por padrão e a cozinha
iluminada, ou o contrário.

**Decisão.**

- **Três escolhas, e não duas:** Do aparelho (o padrão, e o comportamento de antes), Claro e
  Escuro. Sem "Do aparelho" não haveria volta ao que era.
- **O mecanismo é o do pacote da marca** (`tokens.css`): o escuro vale em
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` e em
  `:root[data-theme="dark"]`, com os mesmos valores nos dois blocos; `[data-theme="light"]` só
  fixa `color-scheme: light`, para os controles nativos acompanharem. "Do aparelho" é a ausência
  do atributo, e o sistema volta a mandar sem JavaScript nenhum ouvindo.
- **Mora no aparelho** (`localStorage`, `rende:tema`), como a ordem das listas (`#d226`), e não na
  conta: o celular da bancada e o computador da noite podem querer temas diferentes.
- **Sem piscar:** um script de uma linha no `<head>` do layout raiz (`SCRIPT_TEMA`, em
  `src/lib/tema.ts`) escreve o `data-theme` antes da primeira pintura; o `<html>` leva
  `suppressHydrationWarning`. O `useTema` (em `BlocoTema`, porque o layout raiz é de servidor e
  não pode importar hook) lê o atributo, e não o armazenamento: é o que está na
  tela.
- **Onde:** o bloco "Tema" da Configuração, com as `Pilulas`, fora do formulário: vale no toque,
  sem "Salvar", como os avisos por e-mail. A ajudante também o vê.

**Consequência.** A barra de status do Android continua `brand-700` (`#d124`), escura nos dois
temas. As páginas públicas também seguem a escolha, porque o script está no layout raiz.

---

## D245 · A velocidade medida pela Vercel, sem pacote, no app inteiro

**Status:** vigente · decidida em 2026-09-30, fora de spec

**Contexto.** O Speed Insights foi ligado no painel da Vercel. Sem o script na página, ele não
recebe nada.

**Decisão.** Sem `@vercel/speed-insights`, pelo mesmo motivo da `#d180`: dependência de produção
para o que duas tags fazem. `src/components/site/Desempenho.tsx` renderiza a fila `window.si` e
`/_vercel/speed-insights/script.js` por `next/script` `afterInteractive`, só com
`VERCEL_ENV === "production"`, no layout raiz. Ao contrário da visita, a velocidade vale no app
inteiro: é no celular da confeiteira, na cozinha, que a lentidão pesa. O Speed Insights não
identifica ninguém, só mede.

**Consequência.** Sem o pacote não há "route support": `/c/[contaId]` e as telas com id na URL
aparecem por caminho, um por conta, e não agrupadas. Se isso atrapalhar a leitura, a saída é
`window.si("beforeSend", …)` reescrevendo `url`, ou o pacote, com aprovação.

---

## D246 · Pedidos em quatro vistas, e não em sete status

**Status:** vigente · decidida em 2026-10-01, na spec `062-quem-me-deve.md`; codificada em 2026-10-01

**Contexto.** As sete pílulas de `/pedidos` eram os status do banco. Em "Todos", 4 pedidos na
agenda e 35 que já saíram: no celular a agenda acabava na primeira tela e as nove seguintes eram
histórico. "Em produção" e "Prontos" filtravam uma agenda que o olho lê inteira, e três pílulas
ficavam fora da tela.

**Decisão.**

- **Quatro vistas, nesta ordem:** Agenda (o que não fechou, orçamentos inclusive), Orçamentos (a
  agenda filtrada em memória), Me devem (`consultaEntreguesEmAberto`, a mais antiga primeiro) e
  Saíram (`consultaHistorico(STATUS_CONCLUIDOS)`, em páginas de 30, a mais recente primeiro).
  Nenhuma consulta nova. A agenda termina num botão terciário "Ver o que já saiu".
- **A vista mora na URL**, `?vista=orcamentos|me-devem|ja-sairam`; a agenda é a ausência. Trocar
  de vista é `router.replace`, e não `push`: o voltar do navegador leva para onde ela estava antes
  de `/pedidos` (a Hoje, quando veio do "falta receber"). Valor desconhecido, ou `me-devem` para a
  ajudante, cai na agenda. `useSearchParams` pediu um `<Suspense>` na página; `/pedidos` continua
  estática no build.
- **Me devem só para a dona**, pela regra do `#d213`. A `ListaPedidos` assinava
  `consultaEntreguesEmAberto` também para a ajudante; deixou de assinar.
- **As assinaturas não dependem da vista.** O histórico fica assinado em todas, como ficava com
  "Todos": "Entregas a pagar" soma sobre ele (`#d105`), e assim trocar de vista não reabre nada.
  O limite da página não volta a 30 ao trocar de vista.
- **Contagem no rótulo** ("Orçamentos 2", "Me devem 3"), só acima de zero. `Pilulas` não aceita
  contagem e não ganhou prop para isso. A linha acima da lista segue a vista: "4 na agenda",
  "2 orçamentos", "3 pedidos · R$ 63,00", "os 30 mais recentes".
- **"Já saíram" virou "Saíram" na pílula**, pela regra da própria spec: as quatro não cabem em
  360px. Na conta (rótulo de 14px, 16px de cada lado, 8px entre elas) somam uns 420px para 328
  úteis; mesmo encurtada, a última fica parcialmente fora e a fila rola de lado, como as sete
  rolavam. No resto da tela o nome continua "o que já saiu".
- "Em produção", "Prontos", "Entregues" e "Cancelados" saem das pílulas; o selo continua na linha,
  e o cancelado vive em Saíram.

**Consequência.** O "falta receber" de `EsperandoVoce` leva a `/pedidos?vista=me-devem`.

## D247 · "A receber" em duas quantias: o que já devem e o que vai entrar

**Status:** vigente · decidida em 2026-10-01, na spec `062-quem-me-deve.md`; codificada em 2026-10-01

**Contexto.** "A receber R$ 3.118,00" somava R$ 3.042,00 de um pedido para novembro com R$ 63,00
de três pedidos entregues e não pagos. A parte que pede ação aparecia como "3 deles já foram
entregues", sem valor e sem caminho até eles.

**Decisão.**

- `aReceber` devolve também `totalEntregue`, os centavos dos entregues não pagos. "Vai entrar" é
  `total − totalEntregue`.
- A faixa tem uma linha por quantia, "Me devem R$ 63,00 · 3 entregues sem pagar" e "Vai entrar
  R$ 3.055,00 · 2 combinados", e uma frase só: "Só entra no resultado do mês quando você marca
  como pago." O resto da explicação está no `#d36`. Sem entregue em aberto a primeira linha some;
  sem nenhum dos dois, a faixa some.
- **"Ver quem"** troca para a vista Me devem, e some nela.
- A faixa não usa `FaixaResumo`, que tem um valor só: repete as classes dela (`bg-sunken`, borda,
  a ação à direita no desktop) com duas linhas de valor.
- A faixa é a mesma em todas as vistas: o que devem é fato, não filtro. Para a ajudante a
  primeira linha nunca aparece, porque os entregues em aberto não são assinados (`#d246`).
- "Entregas a pagar" fica com "1 entrega feita, ainda não acertada com o entregador." O "o que
  você cobrou é o que você paga" já estava na descrição do `PainelEntregas`, onde o valor é
  conferido; nada mudou lá.

## D248 · A linha do que saiu mostra a exceção, e o dia diz quanto sobrou

**Status:** vigente · decidida em 2026-10-01, na spec `062-quem-me-deve.md`; codificada em 2026-10-01

**Contexto.** No histórico, 33 linhas repetiam "Entregue · Pago", e as duas que não pagaram se
reconheciam pela falta do "Pago". O cabeçalho do dia dizia "2 pedidos · R$ 73,00" com cada linha
dizendo quanto sobra e o dia não somando. A composição do combo cortava o resto da linha.

**Decisão.**

- `LinhaPedido` ganha `saiu`, verdadeiro em Me devem e Saíram. Ali o selo de status só aparece no
  cancelado, o "Pago" sai, e o entregue não pago leva o marcador **"Falta receber"**, `HandCoins`
  e tinta `--attention`: ícone e palavra, nunca só o ocre. A mão com moedas, e não o triângulo que
  o `DESIGN.md` pede para atenção, porque é dinheiro a cobrar e não algo errado; é o mesmo ícone
  da faixa e do "falta receber" da Hoje. "Pelo cardápio" e "Entrega" continuam. Na agenda nada
  sai.
- `resumoDosItens` ganha `{ soNome }`: usa `nomeSnapshot` e não `nomeComEscolhas`. A
  `LinhaPedido` usa nas duas vistas. A Hoje, a lista de compras e o "Esperando você" continuam com
  a composição: fora do escopo da spec.
- **Cabeçalho do dia:** "2 pedidos · R$ 73,00 · sobram R$ 39,65", ou "perde R$ 6,81" com
  `TriangleAlert` em `--negative`, como na linha. `somaDoDia` soma total e `lucroEstimado` sem o
  cancelado; antes o cancelado entrava no total do dia. A contagem de pedidos segue contando as
  linhas do dia, cancelado incluído: a spec tirou o cancelado das duas somas, não da contagem.

## D249 · Tocar no pedido lê; editar é o botão do rodapé

**Status:** vigente · decidida em 2026-10-01, na spec `063-a-ficha-do-pedido.md`; codificada em 2026-10-01

**Contexto.** Toda ação passava pelo editor inteiro: marcar entregue era abrir o formulário de
1.500 linhas, rolar até "Em que pé está", tocar, voltar. Ler o pedido na bancada era entrar num
formulário com campos vivos, e o telefone e o endereço não levavam a lugar nenhum.

**Decisão.**

- Tocar numa linha de `/pedidos` abre o `Painel` com `FichaDoPedido`, pelo arranjo da 050
  (`#d222`): estado da tela, sem URL; o pedido fica depois de fechar para a folha descer com o
  conteúdo. "Novo pedido" e o "+" continuam indo direto ao editor. A `LinhaPedido` virou
  `<button>` com `aoAbrir`.
- **O pedido é lido pelo id** (`useDocumento(docPedido)`), com o da lista como primeiro quadro.
  A spec pedia a assinatura da lista, e ela não basta: um pedido de "Me devem" pago pela ficha
  sai de `consultaEntreguesEmAberto` e, sendo a dívida mais antiga, quase nunca está entre os
  trinta mais recentes do histórico. A ficha ficaria com o pedido de antes do pagamento e o
  "Desfazer" não teria o que desfazer. É o que o editor já faz, e cai no mesmo cache.
- A ficha: selo, "Pelo cardápio" e o código; os itens com a composição inteira em linha
  própria (`resumoDasEscolhas`), o subtotal gravado de cada um; o total com o desconto escrito e
  a sobra gravada ("sobram R$ 27,58 pra você", ou "perde" com o triângulo); entrega ou
  retirada; telefone; observações; pagamento.
- **Mapa, WhatsApp e ligar são `<a>`** (`#d77`): `google.com/maps/search/?api=1&query=` com o
  endereço codificado, `linkDoWhatsApp` e `tel:+55…`. Sem telefone discável, o número fica como
  texto e os dois botões não existem; sem telefone nenhum, a linha some.
- **A mensagem depende do pé do pedido.** Entregue e não pago: `mensagemDeCobranca`, "Oi, Ana!
  Passando pra lembrar do pedido de 27/9, R$ 13,00. Obrigada!", o dia da entrega em `d/m`. Os
  dados para pagar não entram (não há chave Pix na configuração). Qualquer outro:
  `mensagemDoPedido` sobre o **gravado**, e não sobre a tela como no editor (`#d78`): aqui não
  há tela editável, o gravado é o que ela vê.
- **O primário é o "adiante" da fila** (`FLUXO_PEDIDO`, o mesmo de `transicoesPermitidas`), com
  `ACAO_STATUS_PEDIDO`; entregue e não pago, "Recebi" (só a dona); entregue e pago, ou
  cancelado, nenhum. "Editar pedido" é o secundário ao lado, e na largura toda quando não há
  primário. Mudar o status não fecha a folha.
- **Voltar um passo, cancelar e arquivar ficam no editor.**
- **Ajudante:** o editor deixa ela mover o status e não mostra o bloco de pagamento; a ficha
  oferece o próximo passo e não oferece "Recebi" nem "Desfazer". A linha do pagamento aparece
  como texto, como o "Pago" que ela já vê na lista. A cliente vinculada nem é assinada.

**O que o roteiro pede e o painel não faz.** O roteiro de aparelho (passo 1) diz que arrastar
para baixo e o voltar do aparelho fecham a folha. O `Painel` não faz nenhum dos dois em tela
nenhuma, e a 050, de onde a spec manda copiar, também não. Ficou como lá: o voltar sai de
`/pedidos`, e a folha fecha pelo X, pelo véu e pelo `Escape`. Se o passo 1 incomodar no
aparelho, é uma spec do `Painel`, para as telas todas, e não um remendo na ficha.

## D250 · "Recebi" fora do editor

**Status:** vigente · decidida em 2026-10-01, na spec `063-a-ficha-do-pedido.md`; codificada em 2026-10-01

**Decisão.**

- `useContextoPagamento(contaId, competencia)` saiu de `FormularioPedido` para
  `src/lib/hooks/`, usado pelo editor e pela ficha. Competência nula não assina nada e devolve
  contexto nulo: é o caso da ajudante. No editor isso trocou o contexto da ajudante de um
  objeto vazio por `null`; nenhum caminho dela chega a uma mutação que o leia (pagar não
  aparece, e o pedido pago abre só para leitura). As mutações não mudaram.
- "Recebi" grava com o dia de hoje e a forma do pedido, e fica desativado enquanto o resumo do
  mês carrega, como o "Marcar como pago" do editor. Outro dia de pagamento é coisa do editor.
- **Sem forma no pedido**, a ficha mostra as formas ativas em pílulas, com "Recebi" desativado
  até escolher, e diz quanto a maquininha fica quando a escolhida cobra taxa. `marcarPedidoPago`
  não recalcula a taxa nem a sobra; por isso a forma entra antes pelo mesmo `atualizarPedido`
  do "Salvar" do editor (o corpo refaz `custoTaxaPagamento` e `lucroEstimado` pela
  `derivarPedido`), e o pagamento lança com os derivados novos já no objeto, porque a
  assinatura ainda não os trouxe. Pedido **com** forma não oferece trocar: muda a sobra, e
  isso é do editor. Sem nenhuma forma ativa na conta, "Recebi" grava sem forma, como o editor.
- Depois de pago pela ficha, a linha diz "Pix · pago hoje" com o terciário **"Desfazer"**
  (`desfazerPagamento`, sem a confirmação do editor: o toque errado acabou de acontecer, no
  mesmo lugar). Ele vive enquanto a ficha fica aberta; fechar o esquece.
- A cliente vinculada é lida por `docCliente(pedido.clienteId)`, só para a dona; arquivada
  conta como nenhuma, porque o editor só a acha entre as não arquivadas.

## D251 · A hora da entrega é texto ao lado da data

**Status:** vigente · decidida em 2026-10-01, na spec `064-a-hora-da-entrega.md`; codificada em 2026-10-01

**Contexto.** O dia da agenda tinha a ordem do banco, e a hora combinada morava na conversa do
WhatsApp ou nas observações. "Hoje · 2 pedidos" não dizia o que sai primeiro.

**Decisão.**

- `Pedido.horaEntrega?: string`, `"HH:MM"`, 24 horas, no fuso do aparelho, como
  `dataEntregaISO`. Ausente é "sem hora", o estado de todo pedido de antes. `VERSAO_SCHEMA`
  fica em 1, como ficou para `validoAteISO` e `origem`. Confirmado com o Filipe antes do
  código.
- **Ao lado, e não dentro de `dataEntrega`:** ela é meia-noite, e `competencia` e as consultas
  da agenda estão presas a isso. A hora só ordena o dia; o dia continua sendo o grupo.
- **Gravar:** o corpo do pedido só leva a chave quando há hora, e não `null` como os textos
  (`clienteTelefone`, `endereco`): o pedido sem hora fica igual ao de sempre. `atualizarPedido`
  grava `deleteField()` quando a tela não tem hora, então tirar a hora tira o campo, e salvar um
  pedido antigo sem mexer não grava nada novo.
- **`DadosPedido.horaEntrega` é obrigatório no objeto (`string | undefined`)**, ao contrário de
  `validoAteISO`: como `undefined` apaga, quem montasse os dados sem a hora a tiraria do pedido.
  O "Recebi" da ficha com forma escolhida (`#d250`) passa pelo mesmo `atualizarPedido`, e o
  tipo obriga `dadosComForma` a levar a hora junto.
- **Formulário:** "Hora (opcional)" ao lado da data no desktop e logo abaixo no celular,
  `<input type="time" step="900">` nativo, e "Sem hora" (terciário) só quando há hora. A forma
  é validada por `ehHoraValida` no esquema do pedido. O `step` não bloqueia o salvar: o editor
  não é `<form>`, e uma hora fora do passo de 15 minutos é hora válida.
- **Ordem:** `agruparPorEntrega` ordena cada dia pela hora, os sem hora no fim na ordem de
  chegada (`sort` estável). A comparação é `<` de texto, e não `localeCompare`, que põe símbolo
  antes de dígito. A Hoje usa a mesma função, achatada.
- **Linha:** `MarcadorHora` (relógio e "14:30") abre a linha dos marcadores em `/pedidos`; na
  Hoje vem depois do dia ("Amanhã 14:30") e antes do selo, para dia e hora ficarem juntos. A
  ficha diz "…, às 14:30" na linha do dia.
- **WhatsApp:** `mensagemDoPedido` diz "Entrega em quinta-feira, 1 de outubro, às 14:30". A
  cobrança (`mensagemDeCobranca`) não muda: o doce já foi entregue.
- **O cardápio público não pede hora**, e `/api/cardapio/pedido` continua sem gravar o campo.
  A cliente escolhendo horário seria uma promessa que ela não fez.

## D252 · Achar um pedido: a memória da tela e a cliente cadastrada

**Status:** vigente · decidida em 2026-10-01, na spec `065-achar-um-pedido.md`; codificada em 2026-10-01

**Contexto.** "A Janessa quer repetir o pedido do dia 23" era rolar o histórico de 30 em 30,
procurando um nome com o olho. O Firestore não busca por pedaço de texto, e offline é o estado
normal: um serviço de busca seria dependência nova e dado da cliente fora do Firestore.

**Decisão.**

- **Duas fontes, sem servidor de busca.** A primeira é `filtrarPedidos` (`domain/pedido.ts`)
  sobre tudo o que a tela já tem, a agenda, os entregues em aberto e as páginas do histórico,
  sem repetir id (o mesmo conjunto de "Entregas a pagar"): nome da cliente, nome dos produtos,
  as escolhas do combo inclusive ("pistache" acha o combo com Cookie Pistache), e o código, por
  `chaveDeBusca`, o normalizador do `nomeBusca`, e `includes`, como em `/insumos`.
- **A segunda é a cliente cadastrada.** Com dois caracteres ou mais, `consultaClientes` (a do
  editor de pedido, no mesmo cache) é assinada e até três clientes cujo nome tem uma palavra
  começando pelo texto aparecem no topo, "Todos os pedidos de Janessa Domingos". Começo de
  palavra, e não `includes`: "an" acharia metade das clientes. Abaixo de dois caracteres a
  consulta nem existe, e abrir `/pedidos` sem buscar não lê cliente nenhuma.
- **Tocar assina `consultaPedidosDaCliente`**, `arquivado == false`, `clienteId == id`,
  `orderBy("dataEntregaISO", "desc")`, sem teto: uma cliente é dezenas de pedidos, uma leitura
  cada na primeira vez. Índice composto novo `arquivado + clienteId + dataEntregaISO DESC`
  (`DEPLOY.md` § 13). A linha acima da lista diz "12 pedidos de Janessa Domingos" com "Voltar à
  busca"; mudar o texto também solta a cliente.
- **A sugestão não leva a contagem** que a spec desenhou ("· 12"). O único número sem consulta
  é `Cliente.totalPedidos`, e ele anda com o **pagamento** (`clientes.ts`): a Janessa com um
  pedido na agenda diria 11 e mostraria 12. A contagem exata aparece depois do toque, na linha.
- **A ajudante usa as duas fontes.** A regra deixa (`pedidos` e `clientes` não são
  `doDinheiro`), e o editor já assina as clientes para ela. O nome não é faturamento; o que é
  da dona em Clientes (`#d157`) é o total gasto, e ele não aparece aqui.
- **A cliente avulsa** (sem `clienteId`) só se acha pela primeira fonte. Enquanto o histórico
  não acabou, o resultado termina em "Procurar nos mais antigos", que é o "Mostrar mais
  antigos" (`limite + 30`) com outra frase, e o filtro refaz sozinho. O fim do histórico é o de
  sempre: só com o servidor.
- **O resultado ignora a vista.** Com texto no campo as pílulas ficam todas desmarcadas
  (`Pilulas` aceita `valor: null`), a vista da URL fica parada e limpar o campo volta a ela.
  Tocar numa pílula limpa a busca. O resultado vem do mais recente para trás, como Saíram, e a
  linha mostra a exceção pelo **status** do pedido (`ehConcluido`), e não pela vista: a busca
  mistura agenda e histórico. Nas quatro vistas o efeito é o mesmo de antes, porque cada uma é
  toda de um lado.
- **A faixa "Me devem / Vai entrar" e "Entregas a pagar" continuam**, com os mesmos números.
- **Sem rede**, `useConexao` falso e texto no campo: "Sem internet, a busca olha só o que já foi
  aberto neste aparelho.", em `info` com o ícone, nunca em atenção. A consulta da cliente
  responde do cache sozinha.
- O campo mora na faixa de ferramentas, acima das pílulas, como em `/insumos`: fica quando o
  cabeçalho recolhe, e o foco nele congela a faixa (`#d237`), sem código novo.

---

## D253 · Pedidos no desktop é mesa, com a ficha do pedido acoplada

**Status:** vigente · decidida em 2026-10-01, na spec `066-a-mesa-dos-pedidos.md`; codificada em 2026-10-01

**Contexto.** No desktop a lista ocupava a coluna de 1024px no meio da tela, com o nome numa borda
e o valor na outra, e cada pedido em duas ou três linhas. À noite, sentada, ela compara dias,
quem pagou e quanto sobrou: é o uso de uma tabela, e Materiais e Produtos já eram (`#d225`,
`#d228`).

**Decisão.**

- `/pedidos/page.tsx` saiu de `(coluna)`, como `/insumos` e `/fichas`; `/pedidos/[id]` ficou. A
  URL é a mesma, e o `recolhe` do cabeçalho lê `window.scrollY`, sem depender do grupo.
- **A partir de `lg`**, a `<li>` da `LinhaPedido` ganha o segundo arranjo, no padrão de
  `LinhaInsumo`: Hora · Cliente · Itens · Estado · Pagamento · Total · Sobra. Itens é o resumo
  curto da 062, truncado, com o resumo inteiro no `title`. Estado é o selo, **sempre**; Pagamento
  é "Pago" com `Check`, "Falta receber" com `HandCoins` no entregue não pago, e vazio no resto.
  Na linha do celular o que saiu mostra só a exceção (`#d248`) porque tudo divide uma faixa;
  na mesa cada coisa tem coluna, e a exceção salta da coluna. Sobra com sinal "−", cor e ícone no
  prejuízo. Cabeçalho `aria-hidden`, rótulo em `sr-only` em cada célula.
- **"Pelo cardápio" e "Entrega" não têm coluna.** A spec não os listava, e um oitavo e um nono
  campo devolviam a linha às três alturas que a mesa veio tirar. Ficam na ficha.
- **O dia continua sendo o grupo**: na mesa, uma linha com o dia, o "Passou da data" e a contagem
  nas cinco primeiras colunas, e o total e a sobra do dia (`somaDoDia`, `#d248`) nas colunas de
  Total e Sobra. A mesa é um cartão só, com os dias separados por linha; no celular continuam
  cartões por dia. As classes dos dois arranjos moram em `arranjoDaMesa(comFicha)`, inteiras,
  para o Tailwind achá-las.
- **A ficha acopla à direita**, a `FichaDoPedido` da 063 com `acoplada`: a mesma ficha numa
  `<aside>` de 26rem, e não uma segunda. Foco nela ao abrir e ao trocar de pedido, `Escape` e
  "×" devolvem o foco à linha, a linha marcada em `surface-sunken` com `aria-current`. O pedido
  marcado é **guardado**, e não derivado da lista como em Materiais: pago em "Me devem", ele sai
  daquela consulta, e a ficha precisa continuar nele para o "Desfazer" (`#d250`). Abaixo de `lg`,
  a folha de sempre.
- **Com a ficha aberta, a mesa espera o `2xl`, e não o `xl`** que a spec pedia. Em 1280px, tirados
  a barra lateral (15rem), a margem, os 26rem da ficha e os vãos, sobram uns 440px para sete
  colunas; com o piso que o selo, "Falta receber", o total e a sobra pedem, cliente e itens
  dividiam menos de 40px. Em 1536px sobram uns 200px para os dois, o mesmo que a mesa sem ficha
  tem em 1024px. Entre `lg` e `2xl`, com a ficha, a linha volta à do celular, a mesma regra de
  Produtos com outro limite.
- **Sem escolha de ordem.** A ordem é a data e, no dia, a hora (`#d251`); clique no cabeçalho é o
  que `#d226` recusou.
- A busca, as pílulas, a faixa "Me devem / Vai entrar", "Entregas a pagar" e as clientes
  sugeridas ficam acima, na largura da página; a ficha começa na altura da mesa.

## D254 · Movimento decorativo é permitido, com lugar e ritmo

**Status:** vigente · decidida em 2026-10-01, fora de spec, a pedido de quem conduz o projeto; sem
código ainda

**Contexto.** O `DESIGN.md` e o pacote da marca diziam "movimento comunica estado; nada
decorativo", e a spec 036 deixou na página de venda um único movimento, a conta abrindo. O
resultado foi julgado bonito, mas lavado: quase monocromático, papel cru e nada que se mexa. As
páginas de venda que servem de referência (a do Stripe) têm algo sempre em movimento, e é isso
que dá a elas acabamento e personalidade.

**Decisão.** O § Motion do `DESIGN.md` passa a ter dois tipos de movimento. O de **estado** segue
como era. O de **ambiente**, decorativo, é permitido: livre no site e nas telas de acesso, no
app só em momento de pausa (estado vazio, meta batida, primeira abertura), nunca perto de um
número que ela está lendo. É lento, feito do material da cozinha (luz, fotografia, traço, papel),
não usa o ponto nem a faixa como enfeite (`#d126`), pausa fora da tela e sai inteiro com
movimento reduzido. Onde este `DESIGN.md` e o do pacote divergem, vale este (`#d125`).

**O que não muda.** A frase "o texto do topo não entra em cascata" da 036 continua valendo para o
`h1`: o texto que vende chega pronto, sem esperar animação. A spec que mexer no topo de
`/conheca` decide o resto do que se move ali.

## D255 · A tarde na bancada: a luz da janela e o chute riscado

**Status:** vigente · decidida em 2026-10-01, spec 067

**Contexto.** Com `#d254`, o topo de `/conheca` pode ter movimento de ambiente, e a spec que
mexesse nele decidiria o quê. O `DESIGN.md` parte de uma cena (a bancada às duas da tarde,
cozinha iluminada) que a página nunca mostrou, e o título dizia o preço certo sem mostrar o
que ele corrige.

**Decisão.** Dois movimentos, e só eles, além da conta abrindo:

- **A luz da janela**, atrás e em volta do cartão da conta, nunca atrás do texto: uma mancha de
  sol com a sombra em cruz do caixilho, feita de cor e quatro gradientes de `mask` em
  interseção, sem imagem. Entra em 1,2s e depois desliza 3% e gira menos de 1° em 30s, ida e
  volta, na curva de seno. O laço começa no meio (atraso negativo), que é também o quadro
  parado do movimento reduzido. A cor é `--luz-da-janela`, token do código: `--accent-100` a
  80% sobre o papel no claro, **transparente no escuro**, porque o tema escuro é o da noite.
  `LuzDaJanela` é o único componente cliente do topo, e só pausa o laço fora da tela.
- **O chute riscado** no título: o `precoPraticado` do `EXEMPLO` em `--ink-muted`, riscado por
  um traço de caneta em `--ink` que se desenha uma vez, 400ms depois da carga. O número chega
  pronto com o resto do título (a 036 continua valendo); só o traço anda. O riscado é
  `aria-hidden`, porque o cartão já diz o preço praticado. Some se o praticado for igual ao
  sugerido ou se o sugerido não for `ok`. O traço não é âmbar: o ponto é o único âmbar do topo.

**Consequência.** O `overflow-x: clip` foi para o `<main>` da página, e não para a grade do topo:
cortada na grade, a luz batia numa borda reta dentro da tela no desktop largo. `clip` não cria
contêiner de rolagem, e a barra `sticky` do celular segue presa ao viewport, como no `AppShell`
(`#d128`).

**Fora.** A luz pela hora do visitante, a foto da bancada no topo, movimento de ambiente no app
e na página de `/como-calcular-o-preco-do-cookie` (a `ContaAberta` dela continua `parada`).

## D256 · Três doces agora, cada um com a conta e o erro dele

**Status:** vigente · decidida em 2026-10-01, spec 068 (sessão A codificada)

**Contexto.** A 037 deixou "uma página por doce" fora, com gatilho: voltar quando o Search Console
mostrasse a página do cookie recebendo impressões. O Search Console nem foi ligado, e quem conduz o
projeto decidiu não esperar. O risco é o Google tratar páginas quase iguais como página-porta e
rebaixar o site inteiro.

**Decisão.** Três doces, escolhidos pelo que a conta deles tem de diferente, e não por volume de
busca: o brigadeiro (vende o cento), o bolo (vende o quilo) e o bolo de pote (a embalagem e o
aplicativo). Cada página tem uma seção que só ela tem, e o texto da conta é reescrito para o doce,
nunca colado. Antes de escrever, a sessão lê as cinco primeiras respostas da busca principal.

**Na sessão A**, as cinco primeiras para "quanto cobrar o cento de brigadeiro" contam a mão de
obra, mas nenhuma põe a maquininha na conta, nenhuma mostra o que o esquecimento da hora custa e
nenhuma explica por que o avulso sai mais caro. São as duas seções próprias da página.

**Na sessão B**, as primeiras para "como calcular o preço do bolo por kg" dividem o custo pelo
peso e aplicam a margem, duas delas multiplicando; nenhuma põe a maquininha, e nenhuma separa a
caixa, a base e a decoração (por bolo) do que cresce com o peso, nem diz que o quilo do bolo
pequeno custa mais. É a seção própria da página, com a tabela de 1, 2 e 3 kg.

**Na sessão C**, as primeiras para "como precificar bolo de pote" somam embalagem e mão de obra,
duas multiplicando o custo por um markup; nenhuma põe a maquininha ou a comissão do aplicativo na
divisão, e o blog de parceiros do próprio iFood cita a comissão e manda "comparar com a
concorrência". É a seção própria da página: a comissão no lugar da maquininha, o preço do
aplicativo e o pote do balcão vendido nele.

**Consequência.** O que a 037 queria aprender com uma página passa a ser aprendido com quatro. O
exemplo da spec dizia "o trabalho é a maior parcela" do brigadeiro; com os números dela, os
ingredientes (R$ 42,00, 43%) passam o trabalho (R$ 40,00, 41%). Os números ficaram, e a página diz
"o trabalho pesa quase o mesmo que a receita".

## D257 · As peças do artigo e a lista das páginas do preço

**Status:** vigente · decidida em 2026-10-01, spec 068

**Contexto.** A página do cookie tinha dentro dela tudo o que as outras repetiriam. Copiar a página
três vezes desalinha na primeira mudança de estilo; um componente-página configurável vira um
formulário de opções, porque cada doce tem uma seção que os outros não têm.

**Decisão.** Peças pequenas em `src/components/site/Artigo.tsx` (`Valor`, `TITULO_H2`, `fracao`,
`CabecalhoDoArtigo`, `Passos`, `Formula`, `Perguntas`, `OutrosDoces`, `Convite`), e cada página
monta as dela na ordem dela. A prova da extração foi o HTML do `build`: o da página do cookie saiu
igual, salvo o bloco "Outros doces", e o de `/conheca` saiu idêntico. Para isso as peças guardam os
mesmos nós de texto que a 037 tinha (o React marca com `<!-- -->` a fronteira entre dois textos
vizinhos, e um `{" "}` a mais muda o HTML).

`PAGINAS_DO_PRECO`, em `src/app/site.ts`, é a única lista: o sitemap, o `llms.txt`, o
`CAMINHOS_MEDIDOS` da `Medicao` e "Outros doces" leem dela. Cada linha tem `endereco`, `titulo`
(o texto do link no `llms.txt`), `doce` e `resumo`.

## D258 · O exemplo de cada doce na unidade em que ele se vende

**Status:** vigente · decidida em 2026-10-01, spec 068

**Decisão.** Como no `#d173`, todo número de dinheiro das páginas novas sai de
`calcularPrecoSugerido`, `verificarPreco` e `composicaoDoLote` sobre um objeto em
`src/lib/domain/exemplo.ts`, e `tests/domain/exemplo.test.ts` prende. O lote do exemplo é a
unidade de venda: o cento de brigadeiro tem `rende: 1`, e a `ContaAberta` mostra as parcelas e o
preço do cento sem dividir e remultiplicar por 100. A `ContaAberta` recebe `exemplo` (o cookie é
o padrão) e `unidade` (`{ singular, plural }`), e `ExemploDePagina` é o tipo que os exemplos
satisfazem. O avulso é `calcularPrecoSugerido(Math.round(custo / 100))`.

**Fora.** O app conta bolo em gramas, e `derivarFicha` arredonda o custo por grama ao centavo:
até R$ 5,00 por quilo de diferença entre a página do bolo e o app. Spec própria, de domínio, com
aprovação de schema; até lá a página do bolo não diz "cadastre em gramas".

## D259 · A página de doces como porta das outras

**Status:** vigente · decidida em 2026-10-02, spec 068 (sessão D codificada)

**Contexto.** "Como precificar doces" tem mais gente perguntando que qualquer doce sozinho. Uma
página larga que repetisse os cinco passos com outros números seria a quinta cópia da mesma
conta, que é o que a 068 evita (`#d256`).

**Decisão.** `/como-calcular-o-preco-de-doces` diz a conta em um parágrafo, sem número, cada
parcela em um parágrafo curto, a fórmula sem exemplo, e mostra numa tabela o que muda de doce pra
doce: a unidade de venda, o que pesa, o erro e o que sobra nele, e o preço do exemplo, com o nome
do doce levando à página dele. No celular, a tabela vira uma lista de definições por doce. Sem
`ContaAberta` e sem "Outros doces": a página inteira é a lista deles.

A página é **a última linha** de `PAGINAS_DO_PRECO`, para fechar o "Outros doces" das irmãs como
"A conta pra qualquer doce", e **a primeira** do `llms.txt`, que reordena a lista. As linhas da
tabela são um `Record` pelos endereços da lista, e página nova sem linha não compila.

O "Como calcular o preço" do rodapé aponta para ela, e não mais para a do cookie: uma página larga
ligada às fundas, e elas ligadas de volta.

**Consequência.** A página do cookie perde o link direto do rodapé; continua achável pela de doces,
pelas irmãs e pelo sitemap. A coluna que a spec chamava "a parcela que mais pesa" virou "O que
pesa": pela conta, os ingredientes são a maior parcela dos quatro doces, e a coluna mostra a
parcela que cada página ensina a não esquecer.

---

## D260 · O mês tem duas respostas, e a que decide vem primeiro

**Status:** vigente · decidida em 2026-10-02, spec `069-o-que-o-mes-rendeu.md`

**Contexto.** O topo de `/financeiro` chamava o caixa (entrou menos saiu) de "o que sobrou de
verdade". Com o material comprado em setembro, outubro parecia só lucro e setembro parecia
prejuízo; o que as vendas deixaram acima do custo de fazer não estava escrito em lugar nenhum.

**Decisão.** O display de `ResultadoDoMes` e do `CartaoDoMes` é "o que o mês rendeu"
(`rendimentoDoMes`, `#d261`), com o ponto âmbar só no positivo; negativo é "perdeu", `comSinal`,
`TrendingDown`, sem ponto. O caixa (`lucro` do agregado) desce para a faixa rebaixada como "No
caixa", com uma frase que diz por que os dois diferem. "Saiu" inclui a maquininha nas duas telas
(`#d209`), para que Entrou − Saiu = No caixa sempre. Mês sem pedido pago não tem rendeu: o display
volta a ser o caixa, sem ponto, na mesma roupa da Hoje (tinta, sinal só no negativo), com a frase
que diz por quê. "Ticket médio" sai da interface ("cada pedido sai a"); `VendasPorPedido` foi
absorvido.

**Consequência.** Se as entrevistas mostrarem que "rendeu" é lido como "dinheiro na conta",
troca-se a ordem dos dois, não a conta. O e-mail do mês (`#d209`) continua com o caixa até spec
própria.

---

## D261 · A conta do que rendeu

**Status:** vigente · decidida em 2026-10-02, spec `069-o-que-o-mes-rendeu.md`

**Decisão.** `rendeu = receitaPedidos − custoDoVendido − custoTaxasPagamento − saídas fora da
ficha`, só com pedido pago no mês (`null` sem ele). Fora da ficha são `ENTREGA` (o acerto com o
entregador; a taxa cobrada está no total do pedido), `MARKETING`, `IMPOSTO`, `TAXA_PAGAMENTO`
(avulsa) e `OUTRO`. Não descontam `COMPRA_INSUMO`, `EMBALAGEM` e `DESPESA_FIXA`, que já estão no
custo de fazer pela ficha, `PRO_LABORE` (a hora dela já está no custo) e `EQUIPAMENTO`
(investimento, aparece no caixa). Lê só campos escalares do agregado.

**A maquininha inteira desconta**, a da venda de balcão também, que não está em `receitaPedidos`:
separar pediria a lista de lançamentos, que a Hoje não assina. `OUTRO` desconta pelo mesmo motivo:
o erro é pequeno e para baixo, nunca para cima. O balcão (`entradas − receitaPedidos`, nunca
negativo) fica fora do rendeu, porque não diz o que custou, e a tela diz quanto foi.

**Consequência.** O rendeu é tão bom quanto as fichas: preço de material velho infla o número.
"Custou fazer" leva a "Ver meus produtos".

---

## D262 · Até o fim do mês, em dinheiro e com o caminho

**Status:** vigente · decidida em 2026-10-02, spec `070-o-que-vem-ate-o-fim-do-mes.md`

**Contexto.** `/financeiro` só olhava para trás. A tela Pedidos sabia o que vai entrar e o que
já devem (`#d247`); o Caixa, onde ela pensa em dinheiro, não.

**Decisão.** Bloco "Até o fim de {mês}", só no mês corrente, entre o topo (`#d260`) e a meta:

- **Deve entrar** = `aReceber` sobre `pedidosQueEntramNoMes(agenda + entregues em aberto)`: os
  da agenda com `dataEntregaISO` neste mês e os entregues não pagos de qualquer data. Bate com
  "Vai entrar" + "Me devem" de `/pedidos`, menos os pedidos de outro mês. **O atrasado da agenda
  (marcado para um mês que passou e não entregue) fica fora**: a regra é a data, e ele já está
  em `/pedidos` com "Passou da data". A linha leva a "Me devem" quando há quem deva, senão à
  Agenda.
- **Deve sair** = as contas que repetem pendentes (`#d263`); a linha rola até a lista.
- **Onde fecha** = `lucro` do agregado + deve entrar − deve sair, sem descontar maquininha do que
  deve entrar (a forma ainda não existe). A frase é condicional: "Se tudo isso acontecer, o caixa
  fecha o mês em…". Negativo: `TriangleAlert` em `--attention` e "no negativo", tinta, nunca
  vermelho.
- Linha com zero não aparece; sem nada a prever, o bloco não aparece. As três assinaturas
  (agenda, entregues em aberto, mês anterior) só existem no mês corrente e não seguram a tela:
  enquanto carregam ou se falham, o bloco não aparece, sem esqueleto.
- **Também no mês em branco**, acima da meta: o começo do mês é quando o aluguel ainda não foi
  lançado e a pergunta "o mês vai fechar?" é mais aberta.
- A meta ganha "Com os pedidos marcados, você chega a N% da meta.", `(entradas + deve entrar) ÷
alvo`, só com deve entrar acima de zero e meta não batida. Os doces por semana continuam do que
  já entrou.

## D263 · As contas que repetem viram uma lista com "Lançar"

**Status:** vigente · decidida em 2026-10-02, spec `070-o-que-vem-ate-o-fim-do-mes.md`

**Contexto.** `recorrente` era gravado e nunca lido: "repete todo mês" era uma promessa que o
app não cumpria.

**Decisão.**

- `contasQueRepetemPendentes(anterior, atual)`: as `recorrente: true` do mês anterior sem par
  neste. **Par** é mesmo `tipo`, mesma `categoria` e mesma descrição por `chaveDeBusca` (sem
  acento, minúscula, espaços colapsados), com qualquer valor. A mesma conta duas vezes no
  anterior é uma pendência só. A data é o mesmo dia no mês seguinte, preso ao último dia.
- **"Lançar"** passa por `criarTransacao` com tipo, categoria, descrição, valor, forma e
  `recorrente: true` (sem observações), e o `contextoMeta` da tela: agregado e meta andam como
  num lançamento à mão. A linha fica cinco segundos como "Lançada no dia N" com "Desfazer", que
  chama `arquivarTransacao` com a reversível montada no aparelho (a taxa por `taxaDaEntrada`, a
  mesma conta de `corpoDaTransacao`), sem ler nada: funciona offline.
- **Tocar no nome** abre o `FormularioTransacao` como lançamento novo já preenchido (prop
  `modelo`), com a data calculada. "Parou de repetir" é desmarcar a caixa no lançamento antigo.
- Só um mês para trás, só no mês corrente. Sem `recorrenciaId`: o par por descrição erra de
  forma visível, e o id seria campo novo.

---

## D264 · A comparação mora no topo, igual nas duas telas

**Status:** vigente · decidida em 2026-10-02, spec `071-o-mes-contra-os-outros.md`

**Contexto.** A Hoje comparava o mês com o anterior na mesma altura (`#d211`); o Caixa, a tela do
dinheiro, mostrava o mês sozinho.

**Decisão.** `Comparacao` sai de `CartaoDoMes` para `components/financeiro/Comparacao.tsx`, sem
mudar o texto, e entra na faixa "No caixa" de `ResultadoDoMes`. No mês corrente compara até o dia
de hoje, por `entradasAteODia`; no fechado (e no futuro), o mês inteiro contra o anterior inteiro,
sem "até o dia". Continua sobre **entradas**: o rendeu do mês anterior até o dia N não existe
gravado (`porDia` não tem custo). Seta e palavra, nunca vermelho. Sem agregado do mês anterior, a
linha não aparece. O mês anterior vem da mesma assinatura da faixa (`#d265`), e não de um
`useDocumento` a mais.

---

## D265 · Os doze meses numa faixa de entradas

**Status:** vigente · decidida em 2026-10-02, spec `071-o-mes-contra-os-outros.md`

**Decisão.** `DozeMeses`, depois da meta: uma barra de entradas por mês, os doze terminando no
mês **corrente** (abrir março não encolhe a faixa), o aberto em `--brand-ink` com a etiqueta em
600 e `aria-current`. O rendeu vai no `sr-only` e no `title`, não numa segunda série. Cada coluna
é um `<button>` que abre o mês. Mês sem agregado é barra de altura zero com a etiqueta; com menos
de dois meses com agregado, a seção não existe. A faixa aparece também no mês em branco: tocar
num buraco não pode tirar a faixa da tela.

**O ano** é o civil do mês aberto, até ele (`noAno`): entradas somadas, e o rendeu somado nos
meses com pedido, com "nos meses com pedido" no rótulo quando algum ficou fora. O rótulo diz o
ano e o mês em que para ("Em 2026 até junho"), porque "No ano" leria como o ano inteiro.

**Como.** `consultaAgregadosDoPeriodo` por `documentId()` entre duas competências: sem índice
composto, e o `global` fica fora porque `'g' > '2'`. A tela assina uma faixa só, larga o bastante
para os doze meses, o janeiro do ano aberto e o mês anterior a ele. `mesesDaFaixa` procura por
competência, e por isso ignora qualquer outro id. Mês sem pedido pago tem `rendeu: null`, não
zero, para a barra dizer "sem pedido pago".

**Consequência.** Se o rendeu se mostrar estável nos dados reais, a faixa passa a ser dele. Comparar
com o mesmo mês do ano passado espera existir ano passado.

---

## D266 · A linha diz quem, o dia diz quanto, e a lista se filtra

**Status:** vigente · decidida em 2026-10-02, spec `072-a-lista-do-mes.md`

**Contexto.** No celular, a linha "Pedido P-261001-B14 · Danilo Jo…" cortava o nome da cliente e
mostrava inteiro o código, que ela nunca fala. A lista era uma fila sem dia, e não havia como
achar o gás do mês nem ver quais lançamentos somavam "Despesa fixa".

**Decisão.**

- **O título se lê da descrição gravada**, sem campo novo: `tituloDoLancamento` reconhece
  "Pedido {codigo} · {cliente}" só com `pedidoId`, e devolve a cliente como título e o código
  para o detalhe ("Pedido P-… · Venda · Pix"). Fora do formato (editada à mão, cliente vazia),
  o título é a descrição. O código não tem espaço, então o primeiro " · " depois dele separa, e
  um nome com " · " fica inteiro.
- **`descricaoDaVenda` mudou para `domain/caixa.ts`**, ao lado da leitura, e a mutação a importa,
  como já fazia com `descricaoDoRepasse`. A spec deixava o formato na mutação; os testes do
  domínio não importam Firebase, e só assim o teste prende os dois lados.
- **O dia é o grupo**: `h3` com "Qui, 1 de out." e o saldo do dia (entrou − saiu, pelo bruto,
  `comSinal`); o dia saiu do detalhe da linha. Abaixo de `lg` o `h3` gruda sob o cabeçalho da
  tela. A agenda de `/pedidos` não gruda (a spec supunha que sim); para saber onde o cabeçalho
  termina, `CabecalhoPagina` publica `--fundo-cabecalho` na raiz, com a altura dele, ou, recolhido
  no celular, a área segura mais a faixa de ferramentas. A seção é `overflow-clip`, e não
  `hidden`, para não virar contêiner de rolagem.
- **Achar** é `filtrarLancamentos`, em memória sobre `lancamentos.dados`: Tudo · Entrou · Saiu, e
  o texto por `chaveDeBusca` na descrição, no nome da categoria e no da forma. A contagem das
  pílulas respeita a busca e a categoria, não a pílula, e só aparece acima de zero.
- **A categoria** vem de "Para onde o dinheiro foi", cujas linhas viraram botões, e **só casa com
  saída**: aquele total é de saídas, e "Outro" de entrada o desmentiria. Ela vive em
  `TelaFinanceiro` presa ao mês em que foi tocada; busca e pílula vivem na `ListaDoMes`, que
  remonta a cada mês. Nada vai para a URL ou para o aparelho.
- Com filtro, o título diz "· 3 de 41 · −R$ 950,00", em `aria-live`: o total sai com sinal,
  como as linhas. Sem resultado, uma linha: "Nada com “gás” em outubro." e "Limpar a busca", ou
  "Nenhuma saída em outubro." e "Ver tudo"; os dois limpam tudo, a categoria também.

**Consequência.** Se a descrição de venda mudar de forma, o teste quebra antes da tela. Os
lançamentos antigos com descrição editada continuam lidos como antes.

---

## D267 · Cartão para o mês e a meta; seção no papel para o resto; duas colunas no largo

**Status:** vigente · decidida em 2026-10-02, spec `073-o-caixa-com-peso.md`

**Contexto.** `/financeiro` empilhava sete caixas com a mesma borda, o mesmo raio e o mesmo
respiro, e no desktop largo a coluna única deixava metade da tela vazia. No ranking, o fundo
`sunken` atrás da linha, na largura da receita, lia como linha selecionada.

**Decisão.**

- **Cartão** só em `ResultadoDoMes` e `BlocoMeta`. O resto é **seção no papel**: `h2` em
  `subheading` sobre o `--canvas`, sem caixa, e a lista em `--surface` com divisórias. A lista
  mantém o filete e o raio, como "Esperando você" e a agenda da Hoje (`#d213`): superfície sem
  contorno sobre o papel claro não tem borda que se leia. O que não é linha (os dois gráficos, a
  busca e as pílulas da lista, a nota do ranking) fica direto no papel. 32 px entre grupos, 16 px
  dentro ("Até o fim do mês" e "Contas que repetem").
- **A pilha**, até `xl`: o mês, até o fim do mês, a meta, os lançamentos, o movimento, o ranking
  e as saídas, os doze meses. Os lançamentos sobem para o quarto lugar.
- **A partir de `xl`**, `minmax(0,7fr) minmax(0,5fr)`, `gap-6`: à esquerda "O mês" (o mês, até o
  fim do mês, os lançamentos), à direita "Em perspectiva" (a meta, os doze meses, o movimento, o
  ranking e as saídas), as duas como `<section>` com rótulo escondido, a da direita sem
  `sticky`. Um DOM só, como a Hoje: as seções são `contents` na pilha e cada filho leva `order-N`
  (`xl:order-none`). O teclado e o leitor de tela seguem o DOM, coluna por coluna; na pilha isso
  quer dizer que a meta é lida depois dos lançamentos, embora apareça antes. A tela continua no
  grupo `(coluna)`.
- **O traço**: a medida do ranking e de "Para onde o dinheiro foi" é um traço de 4 px sob o
  nome, trilha `--surface-sunken` e preenchimento `--ink-subtle`, raio cheio, na largura da
  coluna do nome (`Traco`, em `ProdutosDoMes`). A linha fica em `--surface`.
- **O pé** perde o parágrafo que explicava o agregado; fica o botão terciário "Refazer as contas
  do mês" com o aviso `aria-live`. O `AgregadoAtrasado` continua com "Recalcular o mês".

**Diferente da spec.** A nota do ranking ("A sobra de cada produto…") saiu da faixa `sunken` de
dentro da lista para o papel, e termina em "é o que o mês rendeu" no lugar de "a sobra do mês, lá
em cima": no desktop o mês está na outra coluna.

**Consequência.** O mês em branco ganha só o respiro novo; nele continua a pilha.

---

## D268 · O gráfico mede o que já passou e leva ao dia

**Status:** vigente · decidida em 2026-10-02, spec `073-o-caixa-com-peso.md`

**Decisão.**

- **Mês corrente**: o eixo vai do dia 1 a `max(hoje, 7, último dia com movimento)`, preso ao
  fim do mês, com o título "Movimento até hoje". O último dia com movimento é acréscimo à spec:
  um lançamento com data adiante (o aluguel lançado no dia 2 para o dia 10) não pode sumir do
  gráfico. Mês fechado ou futuro: o mês inteiro, "Movimento por dia".
- **Altura**: 96 px com até 7 dias com movimento; 128 px (160 no `lg`) a partir de 8.
- **Com até 10 colunas**, cada uma mostra o próprio número; acima disso, o 1, os múltiplos de 5
  e o dia escolhido.
- **Tocar num dia filtra a lista** por ele: `dia` entra em `FiltroDaLista` e casa com entrada e
  saída; a pílula "1 de out. ×" aparece ao lado da categoria e a tela rola até a lista. O dia e a
  categoria vivem juntos em `TelaFinanceiro`, presos ao mês. Dia sem lançamento também é botão,
  e a lista diz "Nada lançado em 3 de out." com "Ver tudo".
- **O alvo**: cada coluna é um `<button>` com o `sr-only` de antes como rótulo, `title` e
  `aria-pressed`; o dia escolhido ganha fundo `sunken` e o número em 600. As colunas cobrem a
  largura sem fresta, barra e número juntos, e por isso o toque cai sempre no dia mais próximo. A
  sobreposição invisível de 44 px que a spec descrevia dá o mesmo resultado (uma partição pelo
  ponto médio entre colunas), sem camada a mais; a coluna de um mês de 31 dias continua com
  ~11 px de largura no celular, e o roteiro confere se isso basta.

**Consequência.** Se o roteiro mostrar que a coluna estreita erra o dia, o próximo passo é um
alvo maior que a coluna, não um gráfico mais largo.

---

## D269 · O relatório do MEI sai das vendas do mês, e ela só confere

**Status:** vigente · decidida em 2026-10-02, spec `074-o-relatorio-do-mei.md`

**Contexto.** A confeiteira MEI deve preencher o Relatório Mensal das Receitas Brutas até o dia
20 do mês seguinte. O Rende tem cada venda com data e valor bruto, e ela copiava à mão.

**Decisão.**

- **A rota** é `/financeiro/relatorio-mei/[competencia]`, na coluna, com o `SeletorMes` trocando a
  URL por `replace` (o voltar do aparelho vai ao Caixa). Competência fora de `AAAA-MM` dá 404.
  Só a dona: o `ROTAS_SO_DA_DONA` já casa as filhas de `/financeiro`.
- **A receita bruta** é a soma das entradas `VENDA` do mês, pelo valor bruto (antes da
  maquininha), lida da lista do mês (`consultaTransacoesDoMes`), e não do agregado, que não
  separa entrada por categoria. `relatorioMei` em `domain/mei.ts`. Entrada de outra categoria
  fica fora, e a tela diz quanto: "R$ 500,00 de outras entradas ficaram fora: só venda é receita."
- **Tudo na linha IV** por padrão (indústria, sem documento fiscal). "Minha atividade no MEI é"
  Indústria · Comércio move as vendas para I e II; "Emiti nota fiscal em {mês}, no total de" tira
  o valor de IV (ou I) e põe em V (ou II), cortado no total. As duas escolhas moram no aparelho
  (`rende:mei-atividade` e `rende:mei-nota:AAAA-MM`), em `try/catch`; sem elas, o padrão.
  Prestação de serviço (VII a IX) fica zerada.
- **O papel** é a `FolhaMei`, uma `<table>` na classe `.folha` da 017: A4, tinta sobre branco,
  números tabulares à direita, a fonte da UI, nenhum logotipo, uma linha de rodapé apagada
  ("Somado das vendas lançadas no Rende em …"), `#d127`. CNPJ e nome ficam em linha para ela
  escrever. O PDF é o navegador imprimindo, como o orçamento (`#d106`).

**Conferido no dia.** O modelo é o PDF do Portal do Empreendedor (Anexo X da Resolução CGSN
140/2018), e o papel o segue linha por linha. Duas diferenças do esboço da spec: as linhas VII e
VIII aparecem inteiras, e os anexos são os dois itens do portal ("Os documentos fiscais
comprobatórios das entradas…" e "As notas fiscais relativas às operações…"). O título dos anexos
corrige o "ANEXADOS E ESTE RELATÓRIO" do portal para "A ESTE".

**Consequência.** Venda lançada fora de `VENDA` some do relatório; a linha das outras entradas é a
única defesa. Trocar de aparelho perde as duas escolhas; se o relatório for usado, elas vão para a
conta com o CNPJ.

---

## D270 · O limite do ano, com a conta e sem alarme

**Status:** vigente · decidida em 2026-10-02, spec `074-o-relatorio-do-mei.md`

**Decisão.**

- **`LIMITE_MEI_ANUAL`** = R$ 81.000,00, em `domain/mei.ts`, com a data da conferência
  (2026-10-02) e a fonte no comentário; `LIMITE_MEI_POR_MES` = R$ 6.750,00, o proporcional do ano
  de abertura. Conferido no dia: o valor vale para 2026, e o PLP 186/2026 (R$ 110 mil em 2027)
  ainda não foi votado.
- **O ano** é a soma de `entradas` dos agregados de janeiro até o mês aberto (`limiteDoAno`, por
  id, como `noAno`). Conta entrada que não é venda: erra pra cima, o lado seguro de um limite.
  O rótulo sobre o número é "Você faturou" quando o mês aberto só tem entrada `VENDA`, e
  "Entrou" quando não; nesse caso a tela do relatório explica que a conta erra pra cima.
- **O ritmo** é a média dos meses com agregado vezes doze, numa frase; some em dezembro.
- **Estados**, pelos centavos e não pelo percentual: abaixo de 80%, tinta e preenchimento
  `brand-ink`; de 80% a 100%, preenchimento `--attention`, `TriangleAlert` e "Perto do limite do
  MEI. Vale conversar com um contador antes de dezembro."; acima de 100%, o mesmo, com o texto do
  desenquadramento e "Fale com um contador". O texto fica em tinta; o ocre é só ícone e barra.
  Nunca vermelho.
- **Onde**: no topo da tela do relatório, completo (com o ritmo e "Abriu o MEI este ano?"), e no
  pé de `/financeiro`, compacto, acima de "Refazer as contas do mês", com o link "Relatório do MEI
  de {mês}". Do dia 1 ao 20 do mês corrente, o link aponta para o mês anterior (", até o dia
  20"). O pé do MEI aparece também no mês em branco, que é como o mês corrente está no dia 5.

**Consequência.** Se a lei mudar o limite, muda uma constante; o comentário diz onde conferir.

---

## D271 · Um âmbar por vez no editor de pedido, e ele vai para o que falta fazer

**Status:** vigente · decidida em 2026-10-03, spec `075-um-ambar-por-vez.md`

**Contexto.** O pedido confirmado mostrava quatro botões âmbar ao mesmo tempo ("Salvar", "Abrir a
folha do orçamento", "Abrir o WhatsApp com o resumo", "Marcar como pago"), e nenhum dizia qual era
o próximo passo.

**Decisão.**

- **Pedido novo**, ou **gravado com alteração por salvar** (`sujo`): "Salvar" é o primário; tudo o
  mais é secundário. Salvar antes de andar; andar com alteração continua possível, sem bloqueio.
- **Gravado e sem alteração**: o botão do cabeçalho vira "Salvo", secundário, desabilitado, com
  `Check` e a mesma largura mínima (`min-w-24`), para o título não pular. O âmbar vai para o
  próximo passo: `proximoPasso(pedido)` em `domain/pedido.ts`, o passo adiante de `FLUXO_PEDIDO`
  ou, entregue e não pago, `"RECEBER"`, que é o "Marcar como pago" de `BlocoPagamento`. Receber é
  da dona: para a ajudante, no entregue não pago, não há âmbar.
- A ficha do pedido (`#d249`) lê a mesma função: o "Recebi" e o passo adiante dela são os mesmos
  do editor.
- "Abrir o WhatsApp com o resumo" e "Abrir a folha do orçamento" são secundários, sempre.
- A ajudante no pedido pago (só leitura, sem "Salvar") tem o âmbar no passo adiante, mesmo com
  campo mexido: não há o que ela possa salvar.

**Consequência.** O `DESIGN.md` § Padrões diz que o primário mora no canto do cabeçalho; nos
editores ele anda, e a regra "um por tela" fica. Escrito lá.

---

## D272 · O editor de pedido na ordem da encomenda, em seis blocos

**Status:** vigente · decidida em 2026-10-03, spec `075-um-ambar-por-vez.md`

**Contexto.** A tela crescera um bloco por spec: dez cartões com ícone, título e parágrafo, o
pagamento partido em dois com o orçamento e o WhatsApp no meio, as observações no pé, e "Em que pé
está" com o avanço encostado em "Cancelar pedido".

**Decisão.**

- **A ordem**, no pedido gravado: a trilha (sem cartão), Para quem é, O que ela pediu (com
  "Para lembrar na produção", as observações, sob os itens), Quando e como, Pagamento (forma,
  desconto, a maquininha e, depois de um filete, "Ela já pagou?" ou "Já foi pago"), Mandar pra
  cliente (o WhatsApp e, depois de um filete, a folha do orçamento com a validade), e o pé com
  "Cancelar pedido" e "Arquivar pedido". `BlocoPagamento`, `BlocoWhatsApp` e `BlocoOrcamento`
  perderam o `Bloco` de fora; ninguém mais os usava.
- **Descrições** só onde dizem uma consequência que a tela não mostra: sai a de "Para quem é";
  "Quando e como" encurta para "A data manda na agenda e na tela Hoje."; "Mandar pra cliente" diz
  "Você confere e envia: nada sai daqui sozinho." As `dica` de campo ficam todas. "Já foi pago"
  perdeu a descrição: a confirmação do desfazer já diz o que ele faz.
- **A trilha** (`TrilhaDoPedido`): no `lg`, um `<ol>` com os cinco passos, o feito com `Check` em
  `--brand-as-ink`, o atual com o `SeloStatus` e `aria-current="step"`, o de depois em
  `--ink-subtle`. No celular, o selo e "passo 2 de 5" (o leitor de tela ouve "Passo 2 de 5,
  Confirmado") e cinco traços de 4 px, `aria-hidden`. Embaixo, o passo adiante em `lg` e "Voltar
  para …" terciário, com o nome do status de antes em minúscula ("Voltar para em produção").
  "Pelo cardápio" fica à direita da trilha. Cancelado: só o selo e "Reabrir como orçamento",
  secundário. Registrar fornada e as fornadas do pedido continuam ali, depois do filete.
- **Cancelar desce para o pé**, ao lado de "Arquivar pedido", com o ícone `Ban`. Continua sem
  confirmação, como era: cancelar não apaga nada e reabre em um toque. Só o arquivar confirma.
- **O pedido novo** abre com "Orçamento · Já está fechado" em `Pilulas` (44 px, `aria-pressed`),
  sem cartão, e a `explicacao` da escolhida embaixo. O foco inicial continua no nome.
- O ícone de "Pagamento" passou de `Store` para `Wallet`, que era o de `BlocoPagamento`.

**Consequência.** A troca de cartão por seção no papel (`#d267`) fica para os dois editores
juntos, se seis blocos não bastarem.

---

## D273 · O pedido novo, salvo, vira o pedido aberto

**Status:** vigente · decidida em 2026-10-03, spec `076-o-pedido-que-segue.md`

**Contexto.** Salvar o pedido novo levava para `/pedidos`. O próximo passo de quase todo pedido
novo é mandar o resumo para a cliente conferir, e o WhatsApp só existe no pedido gravado: para
chegar nele, achar o pedido na lista, abrir e rolar.

**Decisão.**

- No pedido **novo**, `salvar` navega para `/pedidos/{id}?anotado=1` com `replace`
  (`useGuardaDeSaida.navegar(href, { replace: true })`): o voltar leva à lista, e não ao
  formulário vazio. O id vem de `criarPedido`, gerado no aparelho, então sem rede é igual.
- Fica no **editor**, e não na ficha da 063: a ficha mora na lista e depende do pedido estar na
  página carregada; o editor lê pelo id.
- Com `anotado`, a `FaixaAnotado` no topo, antes da trilha: `Check` e a frase (nunca só a cor), o
  mesmo `<a>` do `BlocoWhatsApp` (`linkDoWhatsApp`, `mensagemDoPedido`) como **o âmbar** da tela,
  "Agora não" terciário e a linha de para quem vai (`ParaQuemVai`, a mesma do bloco). O passo
  adiante da trilha cede o âmbar enquanto a faixa existe (`#d271`).
- A faixa sai no "Agora não", depois do toque em "Mandar" (num `setTimeout`, para o `<a>` não
  sumir no meio do clique) e na primeira alteração do formulário. O parâmetro sai junto, por
  `history.replaceState` nativo, sem histórico novo e sem remontar a tela; recarregar depois disso
  não traz a faixa de volta.
- Orçamento: "Orçamento anotado. Válido até …" quando há validade gravada; sem ela, "{código} é
  para {dia}". A mensagem do WhatsApp não muda.
- **Edição** continua voltando para `/pedidos`: quem edita veio da lista ou da ficha.

**Consequência.** O "+" da barra (061) herda o comportamento, porque abre o mesmo
`/pedidos/novo`.

---

## D274 · O resumo do pedido vira coluna a partir de `2xl`, e salvar ganha `⌘S`

**Status:** vigente · decidida em 2026-10-03, spec `077-a-coluna-do-pedido.md`

**Contexto.** No desktop largo o editor de pedido ocupava a coluna de 1024px com ~300px vazios de
cada lado, e o total e a sobra moravam no rodapé fixo, longe dos itens que os explicam.

**Decisão.**

- `/pedidos/[id]` saiu de `(coluna)` e põe a própria largura: `max-w-5xl` abaixo de `2xl`
  (igual a antes) e `max-w-324` (1296px) a partir dele. A folha do orçamento
  (`/pedidos/[id]/orcamento`) ficou em `(coluna)`, com a impressão de sempre (`#d106`).
- **A partir de `2xl`**, uma grade `minmax(0,59rem) 20rem`: o formulário até 944px (encolhe
  na janela de 1536px, onde o `px-8` do shell tira 64px) e o resumo de 320px, `sticky` em
  `--fundo-cabecalho + 1rem`, com altura máxima da janela e rolagem própria se o pedido for longo.
  O cabeçalho fica fora da grade e o título alinha com o formulário.
- **`PainelPedido` desenha os dois arranjos** da mesma `derivarPedido`: o `RodapeFixo` com
  `2xl:hidden` e a `<aside>` com `hidden 2xl:block`. A frase da sobra, do prejuízo e do desconto
  limitado é um elemento só, usado nos dois. A coluna lista os itens (quantidade, nome, a
  composição do combo em segunda linha, subtotal), depois subtotal, desconto, entrega e o total
  em `xl`; sem itens, a lista some e fica a frase de hoje.
- **Nenhum botão na coluna**: WhatsApp, folha e pagar continuam no formulário (`#d271`).
- **`Ctrl+S` / `⌘S`** no `keydown` da janela, em qualquer largura: com "Salvar" no cabeçalho,
  `preventDefault` e `salvar`; com "Salvo", só o `preventDefault` (não abre o "salvar página" do
  navegador num editor); em `soLeitura`, sem botão, o atalho do navegador fica. O `title` do
  "Salvar" diz o atalho.

**Consequência.** O editor de produto pode ganhar a mesma coluna em spec própria (fora de escopo
da 077).

---

## D275 · Os que estão saindo, em pílula acima da busca

**Status:** vigente · decidida em 2026-10-03, spec `078-o-pedido-de-sempre.md`

**Contexto.** Pôr um produto no pedido era só busca: tocar, digitar "coo", tocar no resultado. Na
feira, em pé e com uma mão, para o produto que é metade das vendas. Reconhecer é mais rápido que
lembrar.

**Decisão.**

- Acima da busca, o grupo "Saindo bastante" (`role="group"` com esse nome) com até **seis
  pílulas** de 44px (`+` e o nome, borda `--border-strong`, o desenho das sugestões de cliente).
  Tocar adiciona com 1, como a busca.
- A fila é `maisPedidos(pedidosAbertos)` em `domain/pedido.ts`: unidades por `fichaTecnicaId`
  nos pedidos do horizonte que `useDespensaParaProduzir` já carregava, sem `CANCELADO`, o combo
  contado como combo. **Nenhuma leitura nova**: funciona sem rede e para a ajudante.
- Só entram as fichas ativas e as que a busca ofereceria agora (`opcoesFicha`): a pílula do
  produto que já está no pedido sai, e a próxima da fila sobe.
- Com **menos de três produtos** contados (ativos), nenhuma pílula: três tiradas de quase nada
  são sorteio.
- Os pedidos abertos são os dos próximos 30 dias, e não o agregado do mês: o agregado é da dona e
  do pagamento; os abertos já estão na tela e mostram o que está saindo agora. A ordem muda entre
  aberturas, e a busca continua.
- `maisPedidos` devolve a fila inteira, sem o `n` da spec: o corte em seis depende do filtro da
  busca, que é da tela.

**Consequência.** O −/+ da quantidade (mesma spec) usa o desenho do `EscolhaDoCombo`, cujas classes
passaram a ser exportadas (`CLASSES_PASSO`). O campo ficou com 64px para caber o par em 360px.

---

## D276 · Repetir o último pedido da cliente, com o preço de hoje

**Status:** vigente · decidida em 2026-10-03, spec `078-o-pedido-de-sempre.md`

**Contexto.** "A Janessa quer repetir o pedido do dia 23" (`#d252`) era achar o pedido na lista e
remontar item por item.

**Decisão.**

- No pedido **novo**, com cliente **vinculada** e **nenhum item**, abaixo do selo do cadastro:
  "Último pedido: {dia} · {itens} · {total}" e "Repetir", secundário. Some quando o pedido ganha
  itens.
- A leitura é `consultaPedidosDaCliente(contaId, clienteId, 3)`, a consulta da 065 com `limit`, no
  mesmo índice; o primeiro não `CANCELADO`. Só assina com vínculo; sem rede, aparece se estiver no
  cache e não aparece se não estiver, sem erro.
- **Copia** os itens (ficha, quantidade, escolhas do combo, nota), a forma de pagamento (se ainda
  existir na configuração) e a entrega (tipo, taxa, endereço). **Não copia** data, hora, desconto,
  status nem observações: são do combinado de hoje.
- **Com o preço e o custo de hoje** (`itensParaRepetir` em `domain/pedido.ts`): o item entra agora,
  e é ao entrar que o preço congela (`#d08`). No combo, a base de hoje mais as receitas escolhidas
  pelo custo de hoje; a receita que sumiu fica com o gravado, e `escolhasCompletas` acusa na
  linha, como sempre.
- O item cuja ficha foi arquivada ou desativada fica fora, e uma linha em ocre com o triângulo diz
  qual: "Brownie não está mais à venda e ficou fora."

**Consequência.** A nota por item, que o schema tinha e nenhuma tela escrevia, nasceu na mesma
spec: "Anotar neste item" sob a linha, gravada em `ItemPedido.observacao`, lida na ficha do pedido
e no WhatsApp (entre parênteses depois do nome). A folha do orçamento e a lista de produção ficam
sem ela (fora de escopo).

---

## D277 · Os dias que ela marca em um toque, e o que já está marcado neles

**Status:** vigente · decidida em 2026-10-03, spec `079-o-dia-que-cabe.md`

**Contexto.** "Data da entrega" era só o seletor do aparelho, uma roda de três colunas no iPhone,
para um dia que quase sempre é hoje, amanhã ou o fim de semana. E ela marcava o dia no escuro: a
tela já tinha os pedidos dos próximos 30 dias (`useDespensaParaProduzir`) e não dizia que o sábado
já tinha quatro pedidos.

**Decisão.**

- Acima do campo, quatro pílulas (`Pilulas`, 44px, a escolhida em `--brand-700`): "Hoje",
  "Amanhã" e os dois seguintes como "Sáb 4" (`rotuloDiaCurto` em `domain/datas.ts`). Os dias
  partem do `hoje` congelado na abertura do editor. O campo continua embaixo, com o rótulo e o
  erro, para qualquer outro dia; dia fora dos quatro deixa as pílulas desmarcadas.
- As pílulas ficam em **quatro colunas iguais** (`grid-cols-4`, até `max-w-sm`), e não na fila
  que rola de lado: em 360px a fila cortava a quarta.
- Abaixo do campo, na `dica` dele (o erro a substitui, e ela volta quando o erro some):
  "Nesse dia você já tem 3 pedidos, 40 unidades." ou "Nenhum pedido nesse dia ainda."
- A conta é `cargaDoDia(pedidos, diaISO, exceto?)` em `domain/pedido.ts`, sobre os
  `pedidosAbertos` que a tela já tem. **Nenhuma consulta nova.** Sai o próprio pedido (a consulta
  do horizonte o inclui, como a 078 conferiu), o `CANCELADO` e o `ENTREGUE`.
- Unidades: o item com escolhas conta as receitas de dentro (`Σ escolha × quantidade`), como a
  produção conta (`#d103`); o resto conta a quantidade da linha. O kit de composição fixa conta
  como o kit: o item gravado não carrega os componentes, e ler a ficha para isso seria mais uma
  dependência da tela por um número que só orienta.
- Dia antes de hoje, depois do horizonte (`HORIZONTE_MAXIMO`, 30 dias) ou com os dados ainda
  chegando: **a linha não aparece**. Zero ali seria mentira com cara de resposta.
- **Tom neutro sempre**: `text-label` em `--ink-muted`, sem ocre e sem ícone, em qualquer
  número. O Rende não sabe quanto ela aguenta num dia e não finge saber.

**Consequência.** A capacidade do dia ("você faz no máximo 80") fica para quando houver o campo e
a pergunta; a agenda de `/pedidos` continua sendo o calendário com a carga de cada dia.

## D278 · O Pix montado no aparelho, com o valor

**Status:** vigente · decidida em 2026-10-03, spec `080-o-pix-com-valor.md`

**Contexto.** O resumo do WhatsApp levava `FormaPagamento.instrucoes`, texto livre ("Pix: 81
99679-6370"). A cliente copiava a chave, abria o banco, digitava o valor e, muitas vezes, pagava
depois ou pagava errado. O equivalente brasileiro do link de pagamento, sem gateway, sem taxa e
sem cadastro, é o Pix copia e cola com valor: um texto montado por regra pública.

**Decisão.**

- `FormaPagamento.pix?: { chave, nome, cidade }`, só em `tipo: "PIX"`, **os três ou nenhum**.
  Três campos, e não a chave lida das `instrucoes`: texto livre não é confiável para dinheiro.
  As `instrucoes` continuam, e continuam indo na folha do orçamento.
- `brCodePix` em `domain/pix.ts` monta o BR Code estático. Conferido no dia no **Manual de
  Padrões para Iniciação do Pix, v2.10.0**: campos, tamanhos e o exemplo (`…63041D3D`), que é
  teste. Nenhuma divergência da spec. O `01` (Point of Initiation Method) fica fora, como no
  exemplo estático do manual: o mesmo código pode ser pago de novo, e é o caso do teste de R$ 1,00.
- O valor vai dos centavos para "68.00" por divisão inteira, sem float. Nome até 25 e cidade até
  15, sem acento e só ASCII: o tamanho de cada campo é contado em caracteres, e acento quebraria a
  contagem e o CRC. O identificador `62-05` é o código do pedido sem o hífen, só `[A-Za-z0-9]`,
  até 25; vazio vira `***`, o "sem identificador" do manual.
- **A chave é arrumada antes de gravar** (`chavePix`), fora do que a spec desenhou: ela escreve o
  telefone como telefone, e o banco só acha `+55…`. Arruma só o que não é ambíguo: e-mail e chave
  aleatória em minúsculas, `+` com dígitos, telefone com parêntese ou espaço e 10 ou 11 dígitos
  ganha `+55`, CPF e CNPJ pontuados viram só os números. Onze dígitos soltos ficam como estão,
  porque podem ser um CPF. A conferência mostra a chave já arrumada.
- Aparece **só enquanto há o que pagar** (não pago e total acima de zero) e a forma do pedido tem
  `pix`: no resumo do WhatsApp, "Pix copia e cola (já com o valor):" e o código na linha de baixo,
  no lugar das instruções; no bloco Pagamento do editor (com o total da tela, como o resumo,
  `#d78`, e só no pedido gravado, que tem código) e na ficha do pedido, "Copiar o Pix de R$ …"
  secundário, com "Copiado" por 2 s em `aria-live` e, sem permissão de área de transferência, o
  código selecionável na tela (`ui/BotaoCopiar`).
- A cobrança curta da ficha (`mensagemDeCobranca`) continua sem o Pix: o botão da ficha o leva.
- O valor é o total do pedido. Com a 081, passa a ser o que falta pagar.

**Consequência.** O QR em imagem fica fora enquanto pedir biblioteca. Chave errada é dinheiro na
conta de outra pessoa: a conferência e o Pix de R$ 1,00 da Configuração existem por isso, e só o
roteiro em banco de verdade prova o código.

## D279 · Um sinal por pedido, como entrada própria, e o pedido conta na quitação

**Status:** vigente · decidida em 2026-10-03, spec `081-o-sinal.md` (sessão A). Schema aprovado
por quem conduz o projeto antes do código.

**Contexto.** O pedido tinha `pago: boolean`. Com o sinal na mão, ela escolhia entre tirar o
pedido de "Me devem" cedo demais ou pôr o sinal de setembro no caixa de outubro, e o relatório
do MEI (`#d269`), que é regime de caixa, saía errado.

**Decisão.**

- `Pedido.sinal?: { valor, pagoEm, competencia, transacaoId, custoTaxa }`. **Um só**: sinal e
  resto. Ausente é "sem sinal", o estado de todo pedido antigo, e nada muda para ele. `pago`
  continua querendo dizer "quitado". `VERSAO_SCHEMA` fica 1: o campo novo é o próprio
  discriminante, e nenhum campo de pedido sem sinal mudou de sentido.
- **Registrar** (`registrarSinal`): pedido não pago, não cancelado e sem sinal; valor acima de
  zero e abaixo do total (`erroDoSinal`: o sinal do valor todo é pagamento). Cria uma
  `ENTRADA`/`VENDA` com `pedidoId`, descrição `Pedido P-… · Nome · sinal`, por `criarTransacao`:
  só a metade da transação do agregado do mês do sinal se move. Nasce com `sinalSugerido(total)`,
  metade arredondada ao real.
- **O pedido no agregado continua na quitação**, com o total: `receitaPedidos`, `custoDoVendido`,
  `produtos` e `qtdPedidos` no mês de `pagoEm`. A quitação (`marcarPedidoPago`) lança
  `quitacao(pedido)`: `total − sinal.valor`, com a taxa do resto. "Recalcular o mês" não mudou: lê
  os lançamentos do mês (o sinal num, a quitação no outro) e os pedidos quitados nele. O roteiro
  de dados (sinal em setembro, quitação em outubro, deltas contra a reconstrução dos dois meses)
  é teste em `tests/domain/sinal.test.ts`.
- **A taxa da maquininha é por pagamento**, com a taxa fixa uma vez em cada. Fora do que a spec
  desenhou: com sinal, `custoTaxaPagamento` do pedido passa a ser **a soma das duas taxas**
  (`taxaDoPedido`: a do sinal, congelada nele, mais a do resto pela forma do pedido), e o
  `lucroEstimado` vai junto. É o que deixa a quitação saber a própria taxa
  (`custoTaxaPagamento − sinal.custoTaxa`) sem ler o lançamento, e desfazer sem rede (`#d80`), e
  é o lucro verdadeiro do pedido. `registrarSinal`, `desfazerSinal` e `atualizarPedido` regravam
  os dois. O sinal usa a forma do pedido; não há forma própria do sinal.
- **"A receber"** é `faltaPagar`: `total − sinal`, e zero quitado. `aReceber` soma isso, e com
  ele "Me devem", "Vai entrar" e a previsão do mês.
- **Desfazer o pagamento** reverte só a quitação; o sinal fica. **`desfazerSinal`**, só sem
  quitação, arquiva o lançamento do sinal (reconstruído do campo, sem ler) e tira o campo.
- **Mudar o total depois do sinal**: o sinal fica; menor que ele, `atualizarPedido` recusa com
  "O sinal (R$ 50,00) é maior que o pedido. Desfaça o sinal ou ajuste os itens."
  (`erroDoTotalComSinal`). Igual ao sinal salva, e a quitação seria de R$ 0,00.
- **Escritas despachadas lado a lado, e não `writeBatch`.** A spec pedia `writeBatch` "como
  `marcarPedidoPago` faz", mas `marcarPedidoPago` despacha cada escrita (`gravarTransacao`,
  `updateDoc`, `aplicarNoAgregado`); o sinal faz igual, para não ter dois arranjos de escrita do
  mesmo dinheiro. Nenhuma `runTransaction`. Se uma escrita se perder, "Recalcular o mês" conserta
  o agregado.

**Consequência.** A tela (081-B) passa o sinal a `derivarPedido` para o rodapé mostrar a taxa
gravada. Mais de um pagamento parcial seria uma lista no lugar de `sinal`, e uma mudança de
`VERSAO_SCHEMA`.

**Achado, sem conserto aqui.** `rendimentoDoMes` tira o "de balcão" de `entradas −
receitaPedidos`. Com o pedido de R$ 100,00 e sinal de R$ 50,00 em meses diferentes, o mês do
sinal mostra R$ 50,00 "de balcão", e o da quitação esconde até R$ 50,00 de balcão de verdade (o
`max(0, …)` engole a diferença). A taxa do sinal também sai do "rendeu" do mês dele. O caixa, o
MEI e "a receber" estão certos; só a decomposição do "rendeu" fica torta no mês do sinal e no
da quitação. Consertar pede um campo no agregado (os sinais do mês), que é schema e fica para
quando incomodar.

**Nas telas (081-B).** O dia do sinal é o mesmo campo "Dia em que o dinheiro entrou" do bloco
Pagamento, e não um segundo campo de data: um dia só por vez, e o contexto do mês que a tela já
assina serve aos dois. Desfazer o sinal assina o mês dele à parte (`pedido.sinal.competencia`),
que pode não ser o do dia escolhido. O formulário do sinal troca de lugar com "Marcar como pago"
enquanto está aberto, para o âmbar continuar um só (`#d271`). Na ficha, "Recebi" vira "Recebi o
resto". O Pix copia e cola e a cobrança do WhatsApp passam a ser do que falta.

## D280 · Cancelar com sinal pergunta o destino dele, e "ficou" é o padrão

**Status:** vigente · decidida em 2026-10-03, spec `081-o-sinal.md` (sessão A).

**Decisão.** `cancelarPedidoComSinal(…, "FICOU" | "DEVOLVI", …)`: o status vai primeiro, porque
`mudarStatusPedido` é que confere se o cancelamento vale (pedido quitado continua exigindo
desfazer o pagamento antes). "Ficou com o sinal" não mexe no caixa: o sinal é receita dela, e o
pedido cancelado continua com o campo. "Devolvi o sinal" é `desfazerSinal`. O padrão da
confirmação (081-B) é "Ficou", o combinado comum na confeitaria.

**Na tela (081-B).** A pergunta mora na `Confirmacao` (modal, porque cancelar é destrutivo), que
ganhou `children` para as duas escolhas entre a descrição e os botões; só o pedido com sinal a
abre, o sem sinal cancela como antes. Pedido pago com sinal desfaz o pagamento do resto primeiro,
como o cancelamento de pedido pago sempre fez.

**Consequência.** Pedido cancelado com sinal fica fora de "a receber" como todo cancelado, e o
sinal continua no caixa e no relatório do MEI do mês dele.

## D281 · Salvar a configuração refaz o que é dela nas fichas

**Status:** vigente · decidida em 2026-10-03, spec `082-o-que-muda-nos-produtos.md` (sessão A).

**Contexto.** A ficha grava `invisiveis`, `custoTotalLote`, `custoUnitario` e a `precificacao`
derivada com a configuração do dia em que foi salva (`#d04`). Mudar a hora de R$ 25 para R$ 30
não mudava produto nenhum e nada avisava: o "sobra R$ 2,10" continuava lá até ela abrir e salvar
cada ficha.

**Decisão.**

- `salvar` da Configuração compara o rateio novo (hora, energia, gás e `custoIndiretoPorHora`,
  que é o que a ficha consome) com o gravado. Se mudou, ou se é a primeira gravação (que troca o
  sugerido do `#d114` pelo dela), chama `refazerFichasPelaConfiguracao` depois de
  `salvarConfiguracao`. Mudar despesas e horas de um jeito que dá a mesma fatia por hora não
  refaz: a ficha não muda. Preço padrão, formas e folha nunca refazem.
- **Receita** (`tipo: "SIMPLES"`): `refazerCustoPelaConfiguracao` em `domain/custoFicha.ts`
  passa por `derivarFicha`, a mesma conta do editor, com as somas de material gravadas
  (`custoInsumos`, `custoEmbalagem`, `custoComponentes`, `custoEscolhas`) e o
  `tempoProducaoMinutos` de sempre. Regrava `invisiveis`, `custoTotalLote`, `custoUnitario` e, na
  `precificacao`, `precoSugerido`, `lucroUnitario`, `margemReal` e `markupReal`. **`precoVenda`
  fica**: o preço é decisão dela. `custoDesatualizado` fica como estava: material velho continua
  dito. O teste salva a R$ 25, refaz a R$ 30 e compara com o editor salvando a R$ 30, nos dois
  métodos.
- **Kit** (`tipo: "KIT"`): só `custoDesatualizado: true`. O custo vem das receitas de dentro, que
  acabaram de mudar; o editor do kit refaz a cascata.
- Um `writeBatch` despachado, `v: VERSAO_SCHEMA`, e `custoCalculadoEm: Timestamp.now()` só na
  receita refeita (o kit não foi calculado). `getDocs` das fichas não arquivadas, que sem rede
  responde do cache, como `marcarFichasDesatualizadas`.

**Fora do que a spec desenhou.**

- O kit é reconhecido pelo **tipo**, e não por `componenteIds` não vazio: o combo só de escolhas
  (`#d99`) tem `componenteIds` vazio e o custo vindo das receitas do mesmo jeito; pela regra da
  spec, ele seria refeito com o `custoEscolhas` velho e sairia sem o selo.
- Os materiais entram como uma linha por soma gravada, e não linha a linha pelos `itens`: o
  `custoUnidadeBaseCorrigido` não está gravado na linha, e `custoLinhaItem` de um inteiro × 1
  devolve o inteiro, então a soma de antes entra exata.

**Consequência.** Mais de 500 fichas estouram o lote (comentário `ponytail:` no código; a saída
são lotes de 500). A taxa da maquininha gravada em cada ficha (`taxaCartaoConsiderada`) não muda
com a Configuração; é outra pergunta.

## D282 · A prévia do que muda nos produtos, e o recibo no lugar dela

**Status:** vigente · decidida em 2026-10-03, spec `082-o-que-muda-nos-produtos.md` (sessão B).

**Contexto.** Com a `#d281`, salvar a Configuração refaz as receitas, mas ela mudava o número no
escuro: a faixa de cada bloco diz o efeito numa fornada de exemplo, nunca nos doces dela.

**Decisão.**

- `OQueMudaNosProdutos` (em `components/configuracao/`), logo abaixo de "Cada hora de produção
  custa". Aparece pela **mesma comparação do salvar**: o rateio da tela (hora, energia, gás e a
  fatia das despesas por hora) contra o gravado, ou a primeira gravação. O rateio e a comparação
  saíram do `salvar` para o corpo da tela, e os dois os leem de lá: a prévia nunca promete o que
  o salvar não faz.
- Cada receita passa por `refazerCustoPelaConfiguracao` **contra o que ela gravou**, e não contra o
  rateio de antes: é exatamente o que o salvar vai gravar, inclusive na ficha salva com uma
  configuração mais antiga. Receita cujo custo por unidade não muda (sem tempo de produção) fica
  fora da frase e da lista.
- A frase conta mais caros e mais baratos em separado (fichas salvas em dias diferentes podem ir
  para lados opostos), com a faixa por unidade, ou o valor só, quando é um.
- A linha usa `fraseSetaSobra` de `LinhaFicha` ("sobram R$ 2,10 → R$ 1,80"; cruzando o zero,
  "sobram R$ 0,07 → perde R$ 0,43"). Sobra nova negativa: `TrendingDown`, `text-negative`, e
  ", passa a dar prejuízo" quando a de antes não era.
- As fichas vêm da consulta de `/fichas` (não arquivadas, por `nomeBusca`), assinada pelo
  componente, que está sempre montado: o cache já a tem, e a prévia aparece na primeira tecla.
- O recibo vem do que `refazerFichasPelaConfiguracao` devolve, em `role="status"`, com "Ver os
  produtos" para `/fichas`. Vive enquanto vive o "Tudo salvo": a primeira alteração o tira.
  Salvar sem rateio mudado não mostra recibo.
- Seção no papel: `h2` em `subheading`, lista com divisórias em `surface`; nenhum cartão novo,
  nenhum âmbar. Sem `aria-live` na prévia, como a faixa dos blocos (muda a cada tecla).

**Consequência.** A conta da prévia roda a cada render da tela, sobre dezenas de fichas; com
centenas, memorizar pelo rateio.

## D283 · A configuração em três partes, na ordem da conta

**Status:** vigente · decidida em 2026-10-03, spec `083-a-configuracao-em-partes.md`.

**Contexto.** A tela era uma pilha de dezesseis caixas iguais, com a cobrança do Rende e a folha do
orçamento no meio da matemática do preço: o preço padrão, continuação direta do custo por hora,
vinha depois da assinatura. No desktop largo, a coluna de 1024px deixava 600px vazios e o número
que fecha a conta rolava para fora.

**Decisão.**

- Três partes, cada uma **seção no papel** (`h2` em `heading`, `font-display`, 48px antes, sem
  caixa): **O seu preço** (trabalho · energia e gás · despesas fixas · cada hora custa · preço
  padrão · formas de pagamento), **A sua marca** (a folha do orçamento · a linha "Seu cardápio",
  que saiu da prateleira: é vitrine, não conta) e **A sua conta** (`#d284`). Os blocos dentro das
  duas primeiras continuam `BlocoConfiguracao`, agora com `h3`.
- **Índice** na faixa de ferramentas do cabeçalho: três âncoras com o desenho da pílula de filtro,
  em três colunas iguais no celular (cabem em 360px) e em fila no desktop. `aria-current` na
  parte em leitura, por um `IntersectionObserver` cuja faixa vai do pé do cabeçalho à metade da
  tela: acende a **última** parte que passa por ela, e não a primeira, porque "A sua conta" é curta
  e no fim da página não chega ao topo. Tocar acende na hora. Local à tela: nenhuma outra tinha
  índice, e `ui/` não ganhou componente.
- Descrição do cabeçalho: "De onde sai o preço de todo produto, e o que é da sua conta."
- **A partir de `2xl`**, a grade do editor de pedido (`#d274`): o formulário até 944px e, à
  direita, a `<aside>` de 320px presa sob o cabeçalho com "Cada hora de produção custa" e a prévia
  da 082 (`#d282`). Os dois são desenhados duas vezes, `2xl:hidden` no fluxo e `hidden 2xl:block`
  na coluna, como o `PainelPedido`; a prévia assina a mesma consulta nos dois, que o Firestore
  serve de um alvo só. Abaixo de `2xl`, nada muda.
- Para isso a rota saiu de `(coluna)`: a tela põe a própria largura, `max-w-5xl` e
  `2xl:max-w-324` só para a dona. A ajudante continua na coluna, com a tela reduzida de antes.
- As âncoras que outras telas usam ficam: `#avisos` (o e-mail) e `#folha-do-orcamento` (o painel
  do cardápio), com a margem de rolagem do cabeçalho (`--fundo-cabecalho`), que agora tem o índice.

**Consequência.** Dividir em uma página por parte foi recusado: com o índice uma página basta, e
rotas quebrariam a barra de salvar única.

## D284 · O que vale no toque fica fora do formulário, e o âmbar é do "Salvar"

**Status:** vigente · decidida em 2026-10-03, spec `083-a-configuracao-em-partes.md`.

**Contexto.** Oito blocos esperavam o "Salvar"; avisos e tema valiam no toque e precisavam da frase
"Vale no toque, sem salvar". E no desktop havia dois primários: "Salvar" e "Gerenciar assinatura".

**Decisão.**

- **A sua conta** é uma lista com divisórias, uma linha por item, nenhum cartão: assinatura (só a
  linha; o detalhe é da 084) · quem te ajuda · avisos por e-mail · tema · como funciona · baixar
  meus dados · encerrar minha conta · sair. Cada linha age na hora, como já agia; a posição diz
  isso, e a frase saiu.
- Avisos: a linha **é** o `<label>`, com o título, o rótulo de sempre embaixo e a caixa à direita.
  Tema: a linha com as três pílulas à direita no desktop e embaixo no celular.
- A barra de salvar, o "Você mudou coisas…" e a guarda de saída já só olhavam o formulário das
  duas primeiras partes; nada mudou neles.
- "Gerenciar assinatura" e também o "Assinar" do teste são **secundários**: o âmbar da tela é o
  "Salvar".
- As linhas de `components/conta/` perderam a caixa e levam o filete de cima; a lista (superfície,
  borda, raio 14px) tira o da primeira. As frases de erro dentro da lista ganharam o recuo da linha.

**Consequência.** Uma linha que entrar na lista leva `border-t border-line` e o recuo de sempre;
sem o filete, ela cola na de cima.

## D285 · A assinatura dita inteira, lida no Stripe e não gravada

**Status:** vigente · decidida em 2026-10-04, spec `084-o-que-voce-assina.md`.

**Contexto.** A linha dizia "Você está no plano Essencial." e mais nada: nem o valor, nem quando
renova, nem o cartão. O Completo era um cadeado longe dali, e pedir ajuda só dava na tela de
entrada.

**Decisão.**

- **`POST /api/assinatura/resumo`**, com o token e o `contaId` do portal e só para a dona, lê a
  `stripeSubscriptionId` da conta e devolve `ResumoAssinatura`: valor em centavos, período, a
  próxima cobrança (ou o fim, com cancelamento), o final do cartão e se cancela. **Nada é
  gravado**: o Stripe é a verdade, e o webhook continua o único que escreve a conta.
- O cartão é o `default_payment_method` da assinatura e, sem ele, o padrão do cliente, que é
  onde o portal grava a troca. Cancelamento é `cancel_at_period_end` **ou** `cancel_at`: o portal
  marca de um dos dois jeitos. A bandeira ficou fora da resposta: a frase é "no cartão final
  4242", e só o final entra nela.
- O valor é o preço da tabela vezes a quantidade, sem cupom (`ponytail` na rota):
  `invoices.createPreview` no dia em que houver desconto.
- **A legenda da linha, fechada, é do aparelho**: "Essencial · renova em 12 nov", por
  `legendaDaAssinatura`. `assinaturaAte` é o fim do período **mais a folga**
  (`FOLGA_RENOVACAO_DIAS`), então `cobrancaPrevistaMs` a tira: sem isso a linha diria a renovação
  três dias depois da cobrança. Na assinatura atrasada (`past_due`) o número é outro e a conta
  erra; nesse caso o painel, com rede, diz o certo.
- O painel lê no toque de abrir, e não ao montar a tela: a Configuração não chama o Stripe a
  cada visita. Lê também `/api/assinatura/precos`, para "No anual você paga R$ … a menos por
  ano" só no mensal. Qualquer falha das duas é silêncio: fica o plano, "Renova em …" pelo
  aparelho e "O valor e o cartão aparecem com internet.", nunca um erro.
- Cancelamento marcado: "Termina em …. Até lá, tudo continua aberto." na caixa de atenção, com o
  triângulo.
- No essencial, "O Completo traz:" com uma linha por recurso que falta (`oQueOCompletoTraz`, de
  `RECURSOS_DO_PACOTE` e `O_QUE_O_RECURSO_FAZ`) e "Passar para o Completo", secundário. "Trocar
  o cartão, ver as cobranças ou cancelar" é terciário. Os dois vão ao portal. Nenhum primário
  no painel: o âmbar da tela continua o "Salvar" (`#d284`).
- O teste continua como era: o prazo e "Assinar" para `/assinatura`. A conta `livre` não tem a
  linha.
- **"Fale com a gente"** antes de "Como funciona": o canal do `#d195` (WhatsApp do
  `RESPONSAVEL`, e-mail sem ele, com a legenda dizendo qual), com o texto "Oi, aqui é da
  {nome do negócio}. Preciso de ajuda com o Rende.", em aba nova.

**Consequência.** "Gerenciar assinatura" saiu da tela: o portal agora se abre do painel, por
um dos dois botões. Hoje `RESPONSAVEL.whatsapp` está vazio, então "Fale com a gente" abre o
e-mail até o número entrar lá.

## D286 · Fazer a conta ao lado do campo, e o preço padrão dito em reais

**Status:** vigente · decidida em 2026-10-05, spec `085-as-contas-que-ela-nao-faz.md`.

**Contexto.** "Energia por hora" pedia que ela somasse a luz e o botijão e dividisse pelas horas de
forno; "Quanto vale a sua hora" pedia a hora, quando ela pensa no mês. O preço padrão fechava numa
faixa que só falava do arredondamento, e Pix e Dinheiro repetiam "R$ 100,00 de cada 100 reais".

**Decisão.**

- **`FazerAConta`** (em `components/configuracao/`), botão terciário sob o campo: abre logo
  abaixo os campos da conta, empilhados, a frase do resultado e "Usar R$ …", secundário (o âmbar é
  do "Salvar", `#d284`), que preenche o campo de sempre e fecha. **Nada do que ela digita ali é
  gravado**: fechar desmonta, e o que foi digitado vai junto. O campo continua dela e editável.
- As três divisões em `domain/custosOperacionais.ts`, centavos inteiros: `horaPelaRetirada`
  (retirada ÷ horas do mês), `gasPorHoraDoBotijao` (botijão ÷ semanas × horas de forno por semana)
  e `energiaPorHoraDaConta` (a parte da confeitaria na luz ÷ horas do mês). Sem divisor, `null`, e
  não zero: **sem "Usar"**. Resultado zero (campo vazio) também não oferece "Usar".
- A hora e a energia dividem pelas "Horas que você produz por mês" do formulário, ao vivo; sem
  elas, a frase diz onde pô-las. O gás divide pelas horas de forno, que é o que o botijão sabe.
- A descrição de "Energia e gás" deixou de mandar dividir: a conta agora está ali.
- **O preço padrão é um exemplo inteiro**: um doce de R$ 4,00 por `calcularPrecoSugerido` e
  `verificarPreco` sobre `parametrosDePreco`, as mesmas do editor. O arredondamento entra só quando
  muda o número ("R$ 6,67 arredondado para R$ 6,90"). A sobra é dita na forma ativa de taxa mais
  alta, nomeada pelo **tipo** ("No crédito", "No débito"), e não pelo nome que ela deu; sem forma
  com taxa, só "Sobram R$ … pra você". Com markup, a frase diz também o que a maquininha (e as
  outras taxas) leva, que é o que o multiplicador não enxerga. Sobra negativa, margem impossível e
  markup zero viram a faixa de atenção, com o ícone.
- **Forma sem taxa** (percentual e fixa zero): só "sem taxa · cai na hora", sem o valor à direita.
  Com taxa, o valor que fica e "de cada R$ 100" embaixo.

**Consequência.** Guardar o que ela digitou na conta seria campo novo, e ficou fora (spec 085,
§ 5). Um quarto "Fazer a conta" é só mais um `FazerAConta` com `campos`, `calcular` e `frase`.

## D287 · As despesas fixas uma a uma, e o total continua derivado e gravado

**Status:** vigente · decidida em 2026-10-05, spec `086-as-despesas-que-ela-esquece.md`.

**Contexto.** "Despesas fixas do mês" era um campo só, e o print mostrava R$ 0,00: somar de cabeça
aluguel, internet, celular, contador, DAS e a assinatura é a conta que ela não faz, e o que ela não
lembra fica fora do preço para sempre (o zero inventado que o `#d114` recusa).

**Decisão.**

- **Schema, compatível:** `operacional.despesasFixasItens?: { nome, valor }[]` (`DespesaFixa`).
  Aprovação pedida pela spec e tomada pelo pedido de quem conduz o projeto ("implemente a spec"),
  como as peças da 044-A. Ausente = conta de antes da lista, e vale o total gravado.
- **O total é a soma, na escrita:** `corpoDaConfiguracao` grava `despesasFixasMensais =
totalDasDespesas(operacional)` e o `custoIndiretoPorHora` sobre ele. Sem a lista, o total que
  veio. Quem lê o total continua lendo o total: a ficha (pelo `custoIndiretoPorHora` gravado), a
  configuração sugerida, a calculadora do site e a biblioteca (que gravam pelo mesmo corpo, sem
  lista, numa conta nova). Nenhum e-mail lê o campo.
- **Conta antiga:** a tela abre o total como a linha "Despesas do mês" (`despesasParaEditar`), que
  ela renomeia ou divide; salvar sem mexer grava a lista de uma linha e o mesmo total. Total zero
  sem lista abre lista vazia.
- **O bloco** (`components/configuracao/DespesasFixas.tsx`): "Costumam ficar de fora" com as
  pílulas das comuns que faltam (`DESPESAS_COMUNS`, pelo nome, sem caixa), que entram com o valor
  vazio e o foco no valor; uma linha por despesa (nome, valor tabular, lixeira de 44px) na mesma
  linha em 360px; "Adicionar despesa" (secundário, foco no nome); "Total do mês" embaixo.
- **"Rende"** entra com `mensalDoPlano` (o anual dividido por 12) lido por
  `/api/assinatura/resumo` no toque, só para a assinante; a linha nasce com zero e o valor entra
  quando chega, se ela não tiver digitado outro. Sem rede, no teste ou na conta livre, fica vazio
  com a dica "O valor do seu plano por mês. No anual, divida por 12."
- "DAS do MEI" vazio diz "O valor está no boleto do mês, no portal do Simples." A descrição do
  bloco diz que conta de ano entra dividida por 12; o campo de periodicidade ficou fora (§ 5).
- `esquemaConfiguracao`: nome de 1 a 40 caracteres, valor inteiro ≥ 0, até 20 linhas
  (`DESPESAS_MAXIMAS`); a tela esconde pílulas e "Adicionar" no limite. O erro vai na linha, por
  `errosDeLinha`.
- Chave da linha é o índice: os campos são controlados e a lista não tem id. Um id por linha só
  existiria para o React, e iria para o documento.

**Fora do que a spec desenhou.** Com horas e total zero, a faixa vira atenção ("R$ 0,00 por hora
produzida: aluguel, internet e o resto não entram em preço nenhum"), pelo mesmo `#d114`; a spec só
pedia que a faixa dissesse.

**Consequência.** A lista e as "Contas que repetem" do Caixa (070) são a mesma coisa vista de dois
lados, e continuam separadas até decidir qual manda (spec 086, § 5).

## D288 · O nome do negócio se muda na Configuração, e mora na conta

**Status:** vigente · decidida em 2026-10-05, spec `087-o-nome-na-folha.md`.

**Contexto.** "MyCookie's" está na barra lateral, na folha e no cardápio, e mora em
`contas/{id}.nome` (espelhado em `configuracao.nomeNegocio`, D14), mas nenhuma tela tinha o campo.
Quem errou no cadastro ou trocou de nome escrevia para o suporte.

**Decisão.**

- **"Nome do negócio"** é o primeiro campo de "A sua marca", no bloco da folha, com a dica de onde
  ele aparece. Grava com o "Salvar" da tela: `renomearNegocio` (`mutations/conta.ts`,
  `v: VERSAO_SCHEMA`, despachada) escreve `contas/{id}.nome` só quando o nome mudou, e o espelho
  vai no `corpoDaConfiguracao` de sempre. A dona já escreve o documento da conta pelas regras de
  hoje; nenhuma regra mudou.
- `esquemaConfiguracao.nomeNegocio`: de 1 a 80 caracteres (`TAMANHO_MAXIMO_NOME`, o teto do
  cadastro), com o erro no campo. Vazio não salva. O nome é gravado sem os espaços das pontas.
- **A conta é a verdade na semeadura**: o campo nasce com `conta.nome` e só cai no espelho se a
  conta ainda não chegou do cache. Antes era o contrário. O conserto do salvar que relia
  `conta.nome` para um nome vazio saiu: agora o vazio é erro dela, visível no campo.
- Conferido no passo 2: não há outro espelho. A barra lateral, o cardápio público
  (`lib/server/cardapio.ts`), o e-mail diário e o "Fale com a gente" leem `contas/{id}.nome` ao
  vivo; a folha lê o espelho e cai na conta.

**Consequência.** Numa conta nova cuja conta ainda não chegou do cache e sem configuração gravada, o
campo nasce vazio e o "Salvar" pede o nome. Esperar a conta para semear foi recusado: uma leitura
que não chega deixaria a tela no esqueleto para sempre.

## D289 · O pé da folha ao vivo, e a assinatura com o dedo

**Status:** vigente · decidida em 2026-10-05, spec `087-o-nome-na-folha.md`.

**Contexto.** Telefone, Instagram, frase, assinatura e "feito com Rende" vão para o rodapé de um
documento que a cliente recebe, e a tela mostrava só campos. A assinatura pedia um PNG, que ela
não tem no celular, na bancada.

**Decisão.**

- **`PeDaFolha`** (em `pedidos/FolhaOrcamento.tsx`): as duas linhas de assinatura e o rodapé,
  saídos da `FolhaOrcamento`, que o usa. A prévia de "A sua marca" ("Assim fica o pé da folha",
  abaixo dos campos) desenha o mesmo componente com o formulário, e não o gravado, numa caixa com
  a classe `folha` (papel claro nos dois temas, como a folha) na largura da coluna, sem o zoom do
  A4: no celular a folha inteira encolhida seria ilegível, e a prévia existe para ser lida.
- `negocioDaFolha` (domínio, `orcamento.ts`) monta o `negocio` da folha a partir da conta e da
  configuração, saída de `montarOrcamento`: a folha e a prévia limpam o `@`, a frase e o nome do
  mesmo jeito.
- As linhas de assinatura ganharam `flex-wrap` e `max-w-full`, que só agem na coluna estreita da
  prévia; no A4 as duas cabem lado a lado e nada mudou na impressão.
- **"Assinar aqui"** (`rotuloDesenhar` do `CampoImagem`, secundário, ao lado de "Escolher imagem")
  abre `ui/AreaDeAssinatura`: um `<canvas>` com eventos de ponteiro, `touch-action: none`, fundo
  transparente e traço `--ink` lido da área, que também é `folha`: no escuro o `--ink` de fora é
  claro e a assinatura sumiria no papel. A linha onde apoiar fica fora do canvas, fora do PNG.
  "Usar esta" (secundário) e "Limpar" (terciário), desabilitados sem traço.
- O PNG é **recortado no traço** antes de sair, para encher a linha da folha (16 mm de altura), e
  entra pelo mesmo `escolher` do arquivo: a mesma redução (`ASSINATURA_LADO_PX`, PNG) e o mesmo teto
  (`ASSINATURA_MAX_BYTES`).
- "Tirar" virou "Tirar a assinatura"; o exemplo do telefone virou `(11) 90000-0000`; a dica da
  assinatura fala do dedo antes da foto.

**Consequência.** Girar o celular com a área aberta estica o traço (o tamanho é medido ao montar);
"Limpar" resolve, e está marcado com `ponytail`.

## D290 · A porta da nota: o que a leitura faz, por que agora, e um caminho por aparelho

**Status:** vigente · decidida em 2026-10-05, spec `088-a-porta-da-nota.md`.

**Contexto.** A etapa "escolher" de `/insumos/nota` dizia "A nota já sabe tudo isso" (o "isso" era
o formulário de Materiais, que ela não estava vendo), tinha um botão só para dois aparelhos, não
mostrava o que a leitura faz nem sabia nada dos preços dela, e a espera era cega e sem saída.

**Decisão.**

- **A etapa deixou o `EstadoVazio`**: ele centra o texto, e a composição pede tudo à esquerda,
  com o exemplo ao lado. O ponto âmbar saiu dele para `TituloAssinado` (mesmo arquivo), que o
  `EstadoVazio` e a porta usam. Título "A compra inteira numa foto.", com o ponto.
- **O exemplo** é uma linha estática (o impresso, a seta, nome, marca, "R$ 5,49 o kg" e o selo
  "Atualiza"), com o `Selo` e as classes do `CartaoLinhaNota`. Nada lê o Firestore.
- **O motivo:** `idadeDosPrecos` (domínio, com teste) conta os materiais sem `ultimaCompraEm` ou
  com ela há mais de `PRECO_ENVELHECE_DIAS = 60` dias, e acha a compra mais recente. O dia da
  compra é o do aparelho (`dataISODe`), como o resto do caixa. Sem material nenhum, a linha some.
  A data sai por `rotuloDiaNoAno` (`datas.ts`): "12 de setembro", com o ano só quando é outro.
- **Celular:** dois `<input type="file">`, "Fotografar a nota" com `capture="environment"` e
  "Escolher foto ou PDF" sem ele. O comentário que recusava `capture` caiu: com dois controles, os
  três caminhos continuam lá. **Computador:** o bloco é a área de soltar (tracejado
  `--border-strong` de 2px; sólido `--brand-as-ink` sobre `--brand-100` com um arquivo por cima), e
  `paste` na janela lê, só enquanto a porta está montada. Colar texto passa reto.
- **Um lugar decide o arquivo** (`receberArquivos`, na tela): o primeiro, se for `image/*` ou PDF
  (o mesmo `accept` do seletor), e senão o `Aviso` com `sem-arquivo`. Mais de um: a espera diz
  "Lemos só o primeiro arquivo."
- **A espera** (`LendoANota`, em `notas/PortaDaNota.tsx`): a miniatura por `URL.createObjectURL`,
  criada ao começar a leitura e revogada no `finally` dela (sem efeito: no `StrictMode` um efeito
  revogaria a URL que o `useMemo` guardou); PDF ou imagem que o navegador não desenha (HEIC no
  Chrome) mostram `FileText` e o nome. "Cancelar" (terciário) aborta o `fetch` por
  `AbortController` e volta sem aviso; cada passo depois de um `await` confere o próprio sinal,
  para uma resposta atrasada não puxar a tela para a conferência. Sair da tela no meio também
  aborta.
- O aviso de falha fica entre a área e a frase da privacidade, que encolheu e ganhou o `Lock`.

**Consequência.** Cancelar não desfaz o gasto: se a resposta já estava a caminho, a leitura foi
cobrada no servidor. Cancelar só poupa a espera dela.

## D291 · O que a compra faz nos produtos, e a linha que pulou

**Status:** vigente · decidida em 2026-10-05, spec `089-o-que-a-compra-faz.md`.

**Contexto.** Trocar o preço de um material à mão mostrava a sobra de cada produto caindo (`#d224`);
ler uma nota que troca vinte preços não mostrava nada, e o "pronto" terminava em "3 produtos
ficaram com o custo desatualizado". E nada comparava o custo por quilo lido com o que o material
tinha: uma vírgula ou um "1 g" no lugar de "1 kg" passavam se ela não reparasse.

**Decisão.**

- **Uma função para um preço e para vinte:** `efeitoDoPrecoNovo` virou `efeitoDosPrecosNovos(fichas,
materiais, novos[])`, que troca todos os `novos` antes do segundo `custosDeHoje`. O formulário
  passa um. Mesmo filtro (só a sobra que mudou) e mesma ordem (a maior diferença primeiro, em
  qualquer sentido): dois preços em sentidos opostos que se anulam numa ficha a tiram da lista.
- **`EfeitoDoPreco` recebe a lista pronta**, com título, `detalhe` (o preço do material, só no
  formulário) e `fecho`; o formulário usa `EfeitoDoPrecoDigitado`, que faz a conta e monta o
  detalhe como antes. Na nota, os `novos` saem das linhas pareadas e completas, pela
  `calcularCustoInsumo` com a perda do material pareado (`#d51`); base trocada (g → un) fica de fora,
  como no formulário. O bloco fica entre as linhas e o caixa; sem preço pareado mudado, não aparece.
- **O "pronto" guarda o efeito calculado antes de gravar** (depois, o "antes" já é o preço novo),
  com "Ele(s) fica(m) marcado(s) para rever o preço em Produtos." e "Ver em Produtos" para
  `/fichas` sem filtro: a lista não tem filtro endereçável por URL. Se as fichas não tinham
  carregado e a lista sai vazia, volta a contagem de `fichasMarcadas`.
- **O salto:** `saltoDePreco` (`domain/notaFiscal.ts`) compara o custo por unidade base, sem perda,
  e é salto o dobro ou mais, ou a metade ou menos (`FATOR_SALTO = 2`); base diferente ou preço
  anterior zero não se compara. A linha troca a frase da conta pelo `TriangleAlert` em ocre e "O
  quilo sai a R$ …; era R$ …. Confira a quantidade e a unidade." **Não bloqueia.** O rodapé conta as
  linhas com salto depois das incompletas e antes da conferência do total, e com salto a frase
  não é "tudo certo" (não some com o teclado aberto).

**Consequência.** A marcação `custoDesatualizado` é a de antes (por `insumoIds`): um kit que só usa o
material pela receita de dentro aparece no bloco e não é marcado, como já acontecia no formulário.
Refazer o custo das fichas ao cadastrar continua fora, decisão de quem conduz o projeto.

## D292 · A conferência em linhas, uma aberta por vez

**Status:** vigente · decidida em 2026-10-05, spec `090-a-conferencia-em-linhas.md`.

**Contexto.** A conferência da nota era um cartão de seis campos por item (~380px no celular):
vinte linhas davam ~7.600px de rolagem e 120 campos abertos para ela confirmar que quinze estavam
certas, e a linha incompleta ou com salto (`#d291`) tinha o mesmo peso das outras. O `DESIGN.md`
já dizia que lista de material é lista com divisórias, e não grade de cartões.

**Decisão.**

- **`CartaoLinhaNota` virou `LinhaNota`**, numa lista com divisórias (`--surface`, raio 14px,
  `--border`) na ordem do papel. **Fechada**, a linha é um botão inteiro de 56px: o impresso em
  micro `--ink-subtle` em cima, o nome em `body` 600 e, embaixo, "Marca · 1 kg · Atualiza" (ou
  "Novo"); à direita o preço pago e o custo de referência ("R$ 5,49 o quilo", o rótulo de
  `custoDeReferencia`, como em Materiais, e não "o kg"). Incompleta ou com salto, o detalhe dá
  lugar à frase de atenção com o ícone, na largura da linha. O "×" fica fora do botão, à direita,
  em 48px de largura.
- **Aberta**, os seis campos de antes, o selo ("Atualiza · … · era …" ou "Novo"), a conta da
  linha e "Pronto" (terciário). A frase de atenção não se repete no painel: ela continua na linha,
  logo acima, e muda enquanto ela corrige. **Uma aberta por vez**, decidida pela tela
  (`aberta: chave | null`). Abrir por toque ou teclado leva o foco ao primeiro campo; `Esc` no
  painel e "Pronto" fecham e devolvem o foco à linha. Abrir uma linha fecha a de cima, e a linha
  tocada ficaria subindo o tamanho daquele painel: o toque faz `flushSync` e `scrollBy` da
  diferença, e ela fica sob o dedo.
- **`aria-expanded` na linha e `aria-controls` só com o painel montado**: o painel fechado não
  existe no DOM (vinte linhas × seis campos escondidos não ajudam ninguém), e um `aria-controls`
  apontando para id ausente é erro de validação. O painel é `role="group"` com "Corrigir …".
- **A chegada:** `receber` pareia as linhas novas e abre a primeira em `linhaParaConferir`
  (incompleta, ou com salto, na mesma régua do rodapé), rolada ao centro por `scrollIntoView` uma
  vez. Sem problema, todas fechadas. Essa abertura não move o foco: no celular, abriria o teclado
  sem ela pedir.
- **A contagem** acima da lista: "18 linhas · 2 para conferir", com "para conferir" (incompletas
  mais saltos, que são disjuntos) só acima de zero.
- **A partir de `xl`**, a mesma `<li>` vira grade, no padrão de Materiais (`#d225`): Impresso ·
  Material · Quantidade · Preço pago · Preço por unidade · O que acontece, com `COLUNAS_NOTA` e
  `minmax(0, …)`. Cabeçalho em micro 600 caixa alta `--ink-muted`, `aria-hidden`, com o vão do "×";
  cada célula leva o rótulo em `sr-only`. A frase de atenção vai numa linha da grade, na largura
  inteira. O painel aberto ocupa a largura toda com os campos em quatro colunas, como antes.

**Consequência.** O exemplo estático da porta (`#d290`) continua com o selo e "o kg": ele mostra a
linha aberta, e a tradução do impresso continua a mesma.

## D293 · A nota comprida: até quatro fotos, uma leitura

**Status:** vigente · decidida em 2026-10-08, spec `091-a-nota-comprida.md`.

**Contexto.** Cupom de atacado não cabe numa foto legível, e a tela mandava fotografar em partes
e ler uma de cada vez: o total impresso só fechava na última parte, o caixa recebia dois
lançamentos que a guarda do `#d54` não reconhecia como a nota inteira, e ela esperava e
conferia o cabeçalho duas vezes.

**Decisão.**

- **Foto não é lida na hora.** Câmera, galeria, soltar e colar põem a foto na faixa
  (`FaixaDeFotos`, em `PortaDaNota`): até `LIMITE_FOTOS = 4`, numeradas, em quatro colunas
  iguais que cabem em 360px, com o "×" de 24px num alvo de 44px no canto. "Ler a nota" é o
  âmbar; "Fotografar a continuação" (celular) e "Juntar a continuação" (computador) são
  secundários e somem com quatro. O toque a mais no caso de uma foto é aceito: é onde ela vê a
  foto tremida antes de esperar. Com a faixa, o exemplo e o motivo de ler saem da porta.
- **A ordem é a de entrada**, e reordenar fica fora: tirar e fotografar de novo resolve. O que
  passa de quatro numa seleção fica de fora, dito embaixo da faixa, em tom neutro.
- **PDF entra sozinho** e é lido na hora, como antes: ele já é a nota inteira. Vindo junto de
  fotos (na seleção ou na faixa), lê só o PDF e a espera diz "Lemos só o PDF.".
- **A faixa sobrevive à falha e ao "Cancelar"**, e some só quando a leitura chega à
  conferência. Os `blob:` são criados e revogados nos eventos (entrar, tirar, ler com sucesso)
  e, ao sair da tela, por um efeito sem dependências que lê a faixa por ref, pelo mesmo motivo
  do `#d290`.
- **A rota** aceita `arquivos` (1 a 4, um inválido recusa o corpo) e continua aceitando
  `arquivo`, porque o app instalado pode estar com o bundle velho. Cada arquivo vira uma
  `inline_data` na ordem, antes do prompt; a frase da emenda ("uma linha que aparece no fim de
  uma e no começo da outra é uma linha só") entra só com mais de uma. O teto de custo
  (`LIMITE_ARQUIVO_BYTES`) vale para a soma. A linha repetida na emenda continua sendo pega
  pelo rodapé (a soma passa do total); nada novo no domínio.
- **O tamanho:** `ladoParaFotos(n)` mantém 1600 px para uma e duas fotos e, daí em diante, a
  área somada de duas fotos cheias (1306 px para três, 1131 para quatro). Cada parte é um pedaço
  do cupom, então a letra ainda tem mais pixels do que a nota inteira numa foto. A tela reduz uma
  foto por vez (quatro de 12 MP decodificadas juntas estouram celular barato) e confere
  `cabeNoCorpo` contra `TETO_CORPO_BASE64 = 4.400.000` antes do `fetch`: passou, o aviso
  `arquivo-grande` sem subir nada. O teste supõe o quadro 4:3 a 0,75 byte por pixel, três vezes
  o peso comum de um cupom em JPEG 80%.
- **`LIMITE_LINHAS` de 60 para 100.** A frase de `linhas-demais` manda cadastrar à mão, e não
  mais ler em partes; a de `arquivo-grande` deixou o "em partes".

**Consequência.** Uma nota de quatro fotos custa perto de quatro de uma na chamada do modelo. O
PDF grande agora é recusado pela tela antes de subir, e não mais pelo 413 do Vercel. A
medição com fotos reais e a conferência do limite de imagens do modelo configurado (passo 2 da
spec) ficaram por fazer.
