# Spec 000 · Contas e tenancy

**Tipo:** refactor, sem funcionalidade nova.
**Tamanho:** uma sessão.
**Decisão que origina:** `DECISOES.md#d01`.

## Problema

Todo dado mora em `users/{uid}/...`. Isso amarra o dado ao login, e não ao negócio. Basta
uma ajudante, um contador com acesso de leitura, ou uma pessoa com dois negócios, para o
caminho estar errado. Renomear hoje, com um documento no banco, custa horas; renomear com
clientes pagantes custa uma migração com janela de indisponibilidade.

Não é preparação especulativa para SaaS: é corrigir uma modelagem que já está errada por
motivo próprio.

## Objetivo

Separar identidade (quem entrou) de tenancy (de quem é o dado), sem construir nada de
multi-usuário.

## Escopo

### 1. Novo documento raiz

```ts
// contas/{contaId}
interface Conta {
  id: string;
  nome: string; // "MyCookie's"
  proprietaria: string; // "Maynara" — alimenta a saudação da tela Hoje
  criadaEm: Timestamp;
  v: 1;
}
```

Só isso. `plano`, `status` e `trialAte` entram quando existir cobrança; o valor deste
documento agora é ser o gancho onde eles cabem sem tocar em mais nada.

### 2. Caminhos

Todas as subcoleções passam de `users/{uid}/…` para `contas/{contaId}/…`. O mapa `caminhos`
em `src/lib/types/index.ts` é o único lugar que conhece o formato.

### 3. Claim

Substituir `{ admin: true }` por:

```ts
{ contas: { [contaId]: 'DONA' } }
```

Papel é string livre por ora, com `'DONA'` como único valor emitido. O que importa é a forma
do mapa, não o vocabulário de papéis, que não deve ser inventado antes de existir um segundo
tipo de acesso.

`scripts/conceder-admin.mjs` vira `scripts/conceder-acesso.mjs` e passa a receber e-mail mais
id da conta, criando o documento da conta se ele não existir.

### 4. Regras

```
match /contas/{contaId} {
  function temAcesso() {
    return request.auth != null
        && request.auth.token.contas[contaId] != null;
  }
  allow read, write: if temAcesso();
  match /{documento=**} {
    allow read, write: if temAcesso();
  }
}
```

Continua sem leitura na avaliação (`DECISOES.md#d07`). Manter a negação padrão em
`/{document=**}`.

### 5. Camada de aplicação

- `AuthProvider` resolve a conta ativa a partir da claim e expõe `contaId` e `conta`.
  Sem seletor de conta na interface: com uma conta, escolher é ruído.
- `useUid()` vira `useContaId()`. É o único ponto de acesso das telas, então a mudança é
  mecânica.
- `colecoes.ts` e `mutations/insumos.ts` trocam o parâmetro `uid` por `contaId`.
- A tela sem permissão passa a explicar acesso, não a claim de administradora.

### 6. Carona: versão de schema

Adicionar `v: 1` a `DocumentoBase` e gravá-lo em toda mutação. Sem isso, daqui a um ano a
forma de um documento se adivinha pela presença de campos.

### 7. Carona: nome fora do código

A saudação em `src/app/(app)/page.tsx` lê `conta.proprietaria`. Nenhum nome próprio fixo em
código.

## Fora de escopo

Cadastro, convite, seleção de conta, papéis e permissões, tela de membros, cobrança,
limpeza de cache no logout, renomear tokens de cor. Nada disso melhora a validação com uma
usuária, e tudo isso vira código morto se a hipótese não se confirmar.

## Critérios de aceite

- [ ] Nenhuma ocorrência de `users/` fora de `docs/` e do histórico.
- [ ] `firestore.rules` nega qualquer caminho não coberto por `contas/{contaId}`.
- [ ] `npm run conceder-acesso -- <email> <contaId>` cria a conta e emite a claim.
- [ ] Entrar com conta sem claim mostra a tela de acesso negado, não uma lista vazia.
- [ ] A saudação da tela Hoje vem do banco.
- [ ] Todo documento novo grava `v: 1`.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

## Risco

Baixo, porque não há dado em produção. Se já houver dado no Firestore quando esta spec for
executada, apagar e recadastrar é mais barato e mais seguro do que escrever migração.
