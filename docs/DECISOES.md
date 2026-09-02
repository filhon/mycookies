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
