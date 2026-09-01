# Estado do projeto

Atualizado em 2026-09-01. **Toda sessão atualiza este arquivo antes de encerrar.**

## Onde estamos

Módulo 1 entregue, o refactor de contas (`specs/000-contas.md`) executado por cima dele, e a
sessão 2A de `specs/002-precificacao.md` fechada: a tela `/configuracao` grava custos
operacionais, formas de pagamento e preço padrão. Portão de conclusão passando: lint limpo,
typecheck limpo (app e service worker), 41 testes, build com 12 rotas estáticas e service
worker gerado.

**O app está de pé.** Projeto `mycookies-mrc`, `.env.local` preenchido, regras e índices
publicados, chave de conta de serviço no disco (fora do git, coberta por
`*firebase-adminsdk*.json`).

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
| 2   | Custos operacionais e precificação          | 2A pronto, **2B é o próximo** | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | não especificado              | —                           |
| 4   | Caixa, metas e previsão                     | não especificado              | —                           |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas já inserido antes do 2 pelo
motivo registrado em `DECISOES.md#d01`.

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

`npm run dev`, entrar com o login liberado e ver as telas pela primeira vez em navegador:
saudação vindo do banco, cadastro de insumo gravando em `contas/mycookies/insumos`, a tela
de configuração salvando em `contas/mycookies/configuracao/geral`, selo de sincronização, e
a tela de acesso negado com o botão de reconferir (dá para provocá-la removendo a claim).

Depois disso, a **sessão 2B** de `specs/002-precificacao.md`: lista `/fichas`, editor
`/fichas/[id]` e os módulos de domínio `custoFicha.ts` e `precificacao.ts`. O que a 2A
deixou explicitamente para lá, para não haver dois lugares calculando preço: toda a
aritmética de markup e margem. A tela de configuração escolhe o método e mostra o efeito do
arredondamento, mas não calcula preço sugerido.

## Dívidas conhecidas

Nenhuma delas bloqueia o próximo passo. Estão aqui para não serem redescobertas.

| Dívida                                                                  | Onde                             | Quando resolver                                                             |
| ----------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Ícones só em SVG; falta PNG 180×180 para `apple-touch-icon` do iOS      | `public/icons/`                  | Antes do primeiro uso real no iPhone                                        |
| Nenhuma verificação visual em navegador foi feita                       | —                                | Agora: é a próxima ação                                                     |
| Regras publicadas, mas nunca exercitadas por um cliente real            | `firestore.rules`                | Na verificação em navegador: é lá que a regra é de fato testada             |
| Acesso concedido por script, sem cadastro self-serve                    | `scripts/conceder-acesso.mjs`    | Segundo cliente pagante, junto de D10 (`DECISOES.md#d16`)                   |
| `sair()` não limpa o cache do IndexedDB                                 | `src/providers/AuthProvider.tsx` | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento |
| Agregados incrementados no cliente                                      | `src/lib/firebase/mutations/`    | Segundo cliente pagante (`DECISOES.md#d10`)                                 |
| `react-hook-form` e `@hookform/resolvers` instalados e ainda não usados | `package.json`                   | Sessão 2B, no editor de ficha com lista dinâmica de itens                   |
| `nomeNegocio` em `configuracao/geral` duplica `contas/{id}.nome`        | `src/lib/types/configuracao.ts`  | Quando algum leitor precisar do nome: hoje ninguém lê esse campo            |
| Sair da configuração com alteração pendente descarta em silêncio        | `TelaConfiguracao.tsx`           | Se acontecer de verdade; a barra fixa de "não salvas" é a defesa atual      |
