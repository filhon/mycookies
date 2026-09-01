# MyCookie's

Sistema de precificação, produção e fluxo de caixa da confeitaria artesanal MyCookie's.
Next.js 16 (App Router) · TypeScript · Tailwind v4 · Firebase (Auth + Firestore) · PWA offline-first.

Uma única usuária hoje (Maynara). O projeto é preparado para virar SaaS depois, mas nada
de multi-cliente é construído antes da hora. Ver `docs/DECISOES.md#d01`.

## Comandos

```bash
npm run dev          # webpack, não turbopack (ver D12)
npm run lint
npm run typecheck    # app + service worker
npm test             # vitest, só o núcleo de domínio
npm run build
npm run conceder-admin -- <email>   # claim de acesso, exige GOOGLE_APPLICATION_CREDENTIALS
```

**Portão de conclusão:** nenhuma tarefa está pronta antes de `lint`, `typecheck`, `test` e
`build` passarem. Rode os quatro e relate o resultado real.

## Protocolo de sessão

Este projeto é construído por spec, uma spec por sessão, para que nenhuma sessão precise
carregar o repositório inteiro na cabeça.

1. Leia `docs/ESTADO.md` (onde o projeto está) e a spec da vez em `docs/specs/`.
2. Implemente **apenas** o escopo da spec. O que estiver em "Fora de escopo" fica fora,
   mesmo que pareça trivial adicionar.
3. Rode o portão de conclusão.
4. Antes de encerrar: atualize `docs/ESTADO.md` e registre em `docs/DECISOES.md` toda
   decisão nova que um leitor futuro poderia questionar.

Se uma spec parecer grande demais para uma sessão, ela está grande demais. Divida e diga.

## Onde as coisas moram

| Caminho                    | Papel                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| `src/lib/domain/`          | Aritmética pura. Sem Firebase, sem React. É o que os testes cobrem. |
| `src/lib/types/`           | Schema do Firestore em TypeScript, mais o mapa `caminhos`.          |
| `src/lib/firebase/`        | Cliente, conversores, coleções tipadas e mutações.                  |
| `src/components/ui/`       | Primitivos. `src/components/<dominio>/` para o resto.               |
| `src/app/(app)/`           | Telas autenticadas. `(auth)/` fica fora do shell.                   |
| `PRODUCT.md` / `DESIGN.md` | Contexto de design. Leia antes de qualquer UI.                      |
| `docs/`                    | Decisões, estado e specs.                                           |

## Invariantes

Quebrar qualquer um destes é regressão, não escolha de estilo.

- **Dinheiro é `number` inteiro em centavos.** Nunca float, nunca string. Formatação só na
  borda da UI.
- **`src/lib/domain/` nunca importa Firebase nem React.** É o que torna a matemática
  testável e o que permite movê-la para o servidor depois.
- **Campos derivados são gravados, não calculados na leitura.** Custo por grama, custo do
  lote, progresso da meta.
- **Offline é o estado normal.** Nada de `serverTimestamp()` (grava `null` no cache local);
  use `Timestamp.now()`. Nada de `runTransaction()` em caminho crítico: transação exige rede.
- **Nunca apagar documento.** `arquivado: true`, porque fichas e pedidos antigos referenciam
  o id e o histórico de custo precisa continuar auditável.
- **Alvo de toque mínimo de 44×44px**, ação primária no celular com 52px.
- **Cor nunca é o único portador de significado.** O vinho da marca e o vermelho de erro são
  vizinhos de matiz: todo estado negativo carrega ícone ou texto.
- **Painel lateral no desktop, folha inferior no celular.** Modal só para confirmação
  destrutiva.

## UI

Antes de escrever qualquer interface, use a skill `/impeccable` e leia `PRODUCT.md` e
`DESIGN.md`. Os tokens de cor, tipografia e espaçamento vivem em `src/app/globals.css`;
não introduza valor de cor solto em componente.

Texto de interface em português do Brasil, na linguagem da confeitaria e não na do software.
"Rendimento do lote", não "output". "Quanto sobra pra você", não "margem líquida".

## Peça aprovação antes de

- Mudar o schema do Firestore de forma incompatível.
- Adicionar dependência de produção.
- Mudar as regras de segurança.
- Sair do escopo da spec da vez.
