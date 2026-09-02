# Estado do projeto

Atualizado em 2026-09-02 (sessão 2B). **Toda sessão atualiza este arquivo antes de
encerrar.**

## Onde estamos

Módulo 1 entregue, o refactor de contas (`specs/000-contas.md`) executado por cima dele, e o
Módulo 2 fechado: a sessão 2A entregou a tela `/configuracao` e a 2B entregou a ficha técnica
com a calculadora de preço. Portão de conclusão passando: lint limpo, typecheck limpo (app e
service worker), 66 testes, build com 11 rotas estáticas mais `/fichas/[id]` dinâmica e
service worker gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras publicadas,
chave de conta de serviço no disco (fora do git, coberta por `*firebase-adminsdk*.json`).
Os índices estão publicados **menos o de `fichas`**, que a sessão 2B acrescentou ao arquivo e
ainda não foi ao Firebase.

A conta existe e o acesso foi concedido de ponta a ponta, com o script rodando contra o
projeto de verdade:

```
contas/mycookies  { nome: "MyCookie's", proprietaria: "Maynara", criadaEm, v: 1 }
claim de fcbfilipesantos@gmail.com  { contas: { mycookies: "DONA" } }
```

`proprietaria` é do negócio, não do login: é o nome que a saudação da tela Hoje mostra.
Para trocar, `npm run conceder-acesso -- <email> mycookies "MyCookie's" <NomeNovo>` — o
script atualiza os campos quando a conta já existe.

Falta a verificação visual em navegador, que nunca foi feita.

## Módulos

| #   | Módulo                                      | Estado                        | Spec                        |
| --- | ------------------------------------------- | ----------------------------- | --------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto                        | —                           |
| 1   | Insumos e embalagens                        | pronto                        | —                           |
| —   | Contas e tenancy                            | pronto                        | `specs/000-contas.md`       |
| 2   | Custos operacionais e precificação          | pronto (2A e 2B)              | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | não especificado              | —                           |
| 4   | Caixa, metas e previsão                     | **especificado, é o próximo** | `specs/004-caixa.md`        |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas já inserido antes do 2 pelo
motivo registrado em `DECISOES.md#d01`. A spec do Módulo 4 está escrita e dividida em duas
sessões: `4A` caixa, `4B` metas e previsão.

Por vir antes do 3, o Módulo 4 alimenta só metade de `ResumoMensal` — a metade da transação.
A metade do pedido (`qtdPedidos`, `ticketMedio`, `produtos`) fica em zero e **não pode
aparecer na interface**, porque zero ali é ausência e não resultado. A spec traz a tabela de
qual campo é de quem.

## O que a sessão 2A deixou pronto

- `src/lib/domain/custosOperacionais.ts`: `custoIndiretoPorHora`, `custoHoraProducao`,
  `custoDeMinutos`, `taxaCobrada`, `liquidoRecebido`. Puro, coberto por teste.
- `src/lib/firebase/mutations/configuracao.ts`: `CONFIGURACAO_SUGERIDA` e
  `salvarConfiguracao`, que calcula `custoIndiretoPorHora` na escrita e grava tudo em uma
  chamada só.
- `src/components/configuracao/`: a tela em cinco blocos, cada um com a frase de
  consequência em reais, mais o painel de forma de pagamento.
- Decisões novas em `DECISOES.md#d17` (sugestão não é dado; uma leitura, uma escrita) e
  `#d18` (forma de pagamento é item de array, desativada e nunca apagada).

Duas coisas fora do escopo literal da spec, feitas porque a tela não ficaria de pé sem elas:

- **Entrada para `/configuracao` no celular.** A configuração só existia na barra lateral,
  que é `lg:` para cima; no celular a tela era inalcançável. Virou um ícone de engrenagem no
  cabeçalho da tela Hoje. Não entrou na navegação inferior porque cinco destinos é o teto
  (`src/components/layout/navegacao.ts`).
- **`parseParaNumero` em `money.ts`.** Era uma função local do formulário de insumo; a tela
  nova precisava da mesma leitura de vírgula decimal. Mesmo corpo, um lugar só.

## O que a sessão 2B deixou pronto

- `src/lib/domain/precificacao.ts`: `calcularPrecoSugerido` (markup e margem, com a guarda de
  margem mais taxas em 100%), `somaTaxas` e `verificarPreco`, que mede o preço praticado e não
  o pretendido.
- `src/lib/domain/custoFicha.ts`: `calcularCustoFicha`, `ehEmbalagem`, `podeSerComponente` e
  `derivarFicha` — a função única que o editor e a mutação usam (`DECISOES.md#d19`).
- `src/lib/firebase/mutations/fichas.ts`: `criarFicha`, `atualizarFicha` e `arquivarFicha`.
  Não existe mutação de "recalcular": salvar já refaz o custo a partir do preço atual dos
  insumos e limpa `custoDesatualizado`.
- `src/components/fichas/`: lista, editor com busca por toque, listas dinâmicas de itens e de
  componentes, e o painel de preço preso ao pé da tela.
- Rotas `/fichas` e `/fichas/[id]`, onde o id `nova` é a ficha que ainda não existe.
- Testes com o caso de aceite da spec, número por número, mais as bordas: rendimento zero,
  custo zero, preço abaixo do custo e kit dentro de kit.
- Decisões novas em `DECISOES.md#d19` a `#d22`.

Fora do escopo literal da spec, e por quê:

- **Bloco "O custo do lote" no editor.** A spec pede as parcelas na fórmula e o painel de
  preço na tela; sem mostrar as parcelas, o custo unitário seria um número sem prestação de
  contas. É o que responde "por que este cookie custa R$ 4,41".
- **Índice composto de `fichas`.** A lista consulta `arquivado == false` ordenado por
  `nomeBusca`, o mesmo par de insumos. Sem o índice a tela não carrega.
  **`firebase deploy --only firestore:indexes` ainda não foi rodado.**
- **`ref` em `Campo` e `Seletor`**, e `taxaCartaoConsiderada` sugerida pela maior taxa ativa.
  Detalhes em `DECISOES.md#d22`.

## O que mudou no refactor de contas

Vale saber antes de escrever qualquer código novo, porque muda a assinatura de tudo que
toca o Firestore. Decisões em `DECISOES.md#d14` e `#d15`.

- Todo caminho é `contas/{contaId}/…`. O mapa `caminhos` em `src/lib/types/index.ts`
  continua sendo o único lugar que conhece o formato.
- `useUid()` virou `useContaId()`. `colecoes.ts` e as mutações recebem `contaId`.
- `AuthProvider` expõe `contaId` (da claim) e `conta` (documento assinado). A saudação da
  tela Hoje sai de `conta.proprietaria`.
- Toda escrita grava `v: VERSAO_SCHEMA`.
- A claim é `{ contas: { [contaId]: 'DONA' } }`; `{ admin: true }` não existe mais.
- `reconferirAcesso()` força a renovação do token: a tela de acesso negado tem botão em vez
  da instrução "saia e entre novamente". Por que o acesso ainda é concedido por script, e
  quando isso muda: `DECISOES.md#d16`.

## Próxima ação

**Publicar o índice novo e ver tudo em navegador.** Nesta ordem, porque a lista de fichas não
carrega sem o índice:

```
firebase deploy --only firestore:indexes
npm run dev
```

A verificação visual continua sendo a dívida mais antiga do projeto, e agora tem mais o que
conferir: saudação vindo do banco, insumo gravando em `contas/mycookies/insumos`,
configuração salvando em `configuracao/geral`, uma ficha do começo ao fim (o caso de aceite
da spec dá para digitar como está e conferir os R$ 4,41 de custo e os R$ 6,90 de preço), um
kit consumindo essa ficha, e o selo de custo desatualizado aparecendo ao mudar o preço de um
insumo já usado.

Dois pontos que só o navegador responde:

- **`/fichas/[id]` é rota dinâmica**, a primeira do projeto. O `defaultCache` do Serwist
  guarda navegação já visitada, mas uma ficha nunca aberta, sem rede, cai em `/offline`.
- **O painel de preço é fixo no pé da tela e tem campo dentro dele.** No celular, é preciso
  ver se o teclado não o cobre na hora de digitar o preço.

Depois disso, a **sessão 4A** de `specs/004-caixa.md`: coleção `transacoes`, o agregado
mensal e a tela `/financeiro`. O índice de `fichas` que ficou pendente entra no mesmo
`firebase deploy` que a 4A vai precisar para o índice de `transacoes`.

O que a spec 004 pede que se leia antes: `DECISOES.md#d09` e `#d10`, porque o risco do módulo
inteiro está lá — agregado mantido por incremento torce em silêncio. A defesa especificada é
um par de funções puras que precisam concordar em teste (`deltaDaTransacao` e
`agregarTransacoes`), mais um botão de recalcular o mês.

## Dívidas conhecidas

Nenhuma delas bloqueia o próximo passo. Estão aqui para não serem redescobertas.

| Dívida                                                                 | Onde                             | Quando resolver                                                                |
| ---------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Ícones só em SVG; falta PNG 180×180 para `apple-touch-icon` do iOS     | `public/icons/`                  | Antes do primeiro uso real no iPhone                                           |
| Nenhuma verificação visual em navegador foi feita                      | —                                | Agora: é a próxima ação                                                        |
| Regras publicadas, mas nunca exercitadas por um cliente real           | `firestore.rules`                | Na verificação em navegador: é lá que a regra é de fato testada                |
| Acesso concedido por script, sem cadastro self-serve                   | `scripts/conceder-acesso.mjs`    | Segundo cliente pagante, junto de D10 (`DECISOES.md#d16`)                      |
| `sair()` não limpa o cache do IndexedDB                                | `src/providers/AuthProvider.tsx` | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento    |
| Agregados incrementados no cliente                                     | `src/lib/firebase/mutations/`    | Segundo cliente pagante (`DECISOES.md#d10`)                                    |
| `@hookform/resolvers` instalado e não usado: a validação é `safeParse` | `package.json`                   | Se um segundo formulário pedir resolver; hoje removê-lo é a opção honesta      |
| `date-fns` instalado e nunca importado em `src/`                       | `package.json`                   | Sessão 4A: ou ganha uso real com datas de caixa, ou sai (`specs/004-caixa.md`) |
| Índice de `fichas` no arquivo, ainda não publicado                     | `firestore.indexes.json`         | Agora: a lista `/fichas` não carrega sem ele                                   |
| `FichaTecnica.ativo` é sempre `true`, sem tela que o desligue          | `src/lib/types/fichas.ts`        | No Módulo 3, se "produto fora de linha" virar diferente de "arquivado"         |
| Quantidade volta em unidade base: 0,5 kg reabre como 500 g             | `FormularioFicha.tsx`            | Se ela reclamar; exigiria gravar a unidade digitada, e não só o valor          |
| `BlocoFicha` e `BlocoConfiguracao` são primos                          | `src/components/`                | No terceiro caso, viram um primitivo em `components/ui`                        |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`       | `src/lib/types/configuracao.ts`  | Quando algum leitor precisar do nome: hoje ninguém lê esse campo               |
| Sair da configuração com alteração pendente descarta em silêncio       | `TelaConfiguracao.tsx`           | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual         |
