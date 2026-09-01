# Estado do projeto

Atualizado em 2026-09-01. **Toda sessão atualiza este arquivo antes de encerrar.**

## Onde estamos

Módulo 1 entregue e verificado. Portão de conclusão passando: lint limpo, typecheck limpo
(app e service worker), 29 testes, build com 12 rotas estáticas e service worker gerado.

O aplicativo ainda **não roda**: falta criar o projeto no Firebase e preencher `.env.local`
a partir de `.env.local.example`. Depois disso, `npm run conceder-admin -- <email>` libera
o acesso.

## Módulos

| #   | Módulo                                      | Estado           | Spec                        |
| --- | ------------------------------------------- | ---------------- | --------------------------- |
| 0   | Fundação: design system, shell, acesso, PWA | pronto           | —                           |
| 1   | Insumos e embalagens                        | pronto           | —                           |
| —   | Contas e tenancy                            | **próximo**      | `specs/000-contas.md`       |
| 2   | Custos operacionais e precificação          | especificado     | `specs/002-precificacao.md` |
| 3   | Vendas, pedidos e lista de compras          | não especificado | —                           |
| 4   | Caixa, metas e previsão                     | não especificado | —                           |

A ordem acordada é 1 → 2 → 4 → 3, com o refactor de contas inserido antes do 2 pelo motivo
registrado em `DECISOES.md#d01`.

## Próxima ação

Executar `specs/000-contas.md`. É um refactor sem funcionalidade nova, e deve caber em uma
sessão. Depois dele, `specs/002-precificacao.md` se divide em duas sessões: a tela de
configuração primeiro, o editor de ficha depois.

## Dívidas conhecidas

Nenhuma delas bloqueia o próximo passo. Estão aqui para não serem redescobertas.

| Dívida                                                                  | Onde                             | Quando resolver                                                             |
| ----------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Ícones só em SVG; falta PNG 180×180 para `apple-touch-icon` do iOS      | `public/icons/`                  | Antes do primeiro uso real no iPhone                                        |
| Nenhuma verificação visual em navegador foi feita                       | —                                | Assim que o Firebase estiver configurado                                    |
| `sair()` não limpa o cache do IndexedDB                                 | `src/providers/AuthProvider.tsx` | Só ao virar SaaS: hoje é vantagem, em aparelho compartilhado vira vazamento |
| Nome "Maynara" fixo no código                                           | `src/app/(app)/page.tsx`         | Resolvido pela spec 000                                                     |
| Agregados incrementados no cliente                                      | `src/lib/firebase/mutations/`    | Segundo cliente pagante (`DECISOES.md#d10`)                                 |
| `react-hook-form` e `@hookform/resolvers` instalados e ainda não usados | `package.json`                   | Módulo 2, no editor de ficha com lista dinâmica de itens                    |
| Repositório sem controle de versão                                      | raiz                             | Antes da próxima sessão de implementação                                    |

## Sem git

O projeto não é um repositório git. Para um fluxo dirigido por spec isso custa caro: não há
como revisar o diff de uma sessão, reverter uma implementação ruim, nem saber o que mudou
entre duas sessões. `git init` mais um commit por spec resolve, e é o maior ganho de
qualidade disponível por menos esforço.
