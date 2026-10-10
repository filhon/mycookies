# Spec 116 · O endereço da loja

**Tipo:** cada conta escolhe um apelido, e o cardápio passa a abrir em `/c/{apelido}` no lugar de
`/c/{contaId}`. **Quebra um invariante e muda as regras de segurança**: o índice de apelidos mora
fora de `contas/`. Nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica do cardápio público sobre os prints de 2026-10-10; o "endereço bonito" está
no "Fora de escopo" da 031 desde 2026-09-23.
**Depende de:** 031. Se a 114-B já entrou, o QR passa a apontar para o apelido.
**Aprovações pedidas, todas antes de qualquer código:** (1) **dado fora de `contas/{contaId}`**,
contra o invariante do `CLAUDE.md` e a "regra de ouro" de `firestore.rules`; (2) **mudança nas
regras**: uma coleção nova com `allow read, write: if false` explícito; (3) **schema aditivo**:
`Conta.apelido?`; (4) **a purga** (`scripts/encerrar-conta.mjs`) passa a apagar o apelido da
conta encerrada.
**Decisões a registrar:** `#d319`, que **reverte o `#d158` no ponto do link** ("o link é o
`contaId`").

---

## Problema

1. **O link de toda conta depois da primeira é `/c/3f2a9c…`, com 32 caracteres.** A MyCookie's
   escapou porque o `contaId` dela é `mycookies`. Na bio do Instagram, um endereço assim parece
   golpe, e a cliente hesita antes de tocar; ditado em voz alta ou impresso numa etiqueta, não
   funciona. Todo cardápio digital por assinatura entrega `/{nome-da-loja}` no primeiro dia: é
   parte do que se paga.
2. **A 031 deixou fora por um motivo certo.** Achar a conta pelo apelido exige um índice global,
   e índice global é dado fora de `contas/`. Esta spec aceita a exceção, com a coleção trancada
   para o cliente e escrita só pelo servidor, que é o desenho que já protege o resto do cardápio
   (`#d158`).

---

## 1 · O que esta spec decide: `#d319`

- **`apelidos/{apelido}`**, coleção na raiz: `{ contaId, v, criadoEm, arquivado }`. **Nenhum
  cliente lê nem escreve**: a regra é `match /apelidos/{a} { allow read, write: if false; }`,
  escrita de propósito acima da regra de ouro, com o comentário que aponta para o `#d319`. Só o
  Admin SDK toca nela: a página para resolver, a rota para gravar.
- **`Conta.apelido?: string`**, o espelho que o painel mostra. Quem escreve é a rota, e mais
  ninguém.
- **O formato** (`apelidoValido`, puro e testado em `domain/cardapio.ts`): 3 a 30 caracteres,
  `a-z`, `0-9` e hífen, sem hífen nas pontas nem dois seguidos; sugerido do nome da loja sem
  acento (`MyCookie's` → `mycookies`); recusa a lista de reservados (`api`, `c`, `conheca`,
  `login`, `cadastro`, `rende`, `admin`, `ajuda`, `termos`, `privacidade` e as rotas de
  primeiro nível que existirem no `build`).
- **Gravar.** `POST /api/cardapio/apelido`, com o token da dona (`ehDona`), no molde de
  `api/conta/membros`. Numa transação do Admin SDK (é servidor e não caminho offline; o
  invariante do `runTransaction` é do aparelho): o apelido livre ou já desta conta → grava
  `apelidos/{novo}`, marca o anterior `arquivado: true` **sem apagar**, e grava `Conta.apelido`.
  Ocupado por outra conta → `ocupado` (409), "Esse endereço já é de outra loja.".
- **O anterior continua levando à loja.** Apelido arquivado redireciona para o atual: o QR
  impresso e a bio antiga não quebram. Ele fica reservado para a conta; outra conta não o pega.
- **Resolver.** Em `/c/[contaId]`, `lerCardapio` tenta `apelidos/{param}` primeiro; achando,
  usa o `contaId` dele (e, se arquivado, `permanentRedirect` para o apelido atual); não achando,
  trata o parâmetro como `contaId`, como hoje. Acessar pelo `contaId` de uma conta com apelido
  redireciona (308) para o apelido. A rota da foto, a da vitrine e o handler do pedido continuam
  pelo `contaId`, que a página passa a eles: o apelido é só a porta.
- **No painel "Seu cardápio"**, acima do link: "Endereço do seu cardápio", o prefixo fixo
  (o host de `location.origin` mais `/c/`, como o link do painel já monta) e o campo, com a sugestão preenchida na primeira vez, a conferência do formato
  ao digitar e "Salvar endereço". Sem rede, o botão desabilitado e "Precisa de internet para
  conferir se o endereço está livre." (é a única escrita do cardápio que não vai para a fila).
- **A purga** apaga os documentos de `apelidos` com o `contaId` encerrado, inclusive os
  arquivados: o endereço volta a ficar livre.

---

## 2 · Antes de tocar em código

1. **Pedir as quatro aprovações.** Sem elas, a spec não começa.
2. Ler `firestore.rules` inteiro e o `#d158`; ler `scripts/encerrar-conta.mjs` e `#d148`.
3. Ler `src/app/api/conta/membros/route.ts` (o molde).
4. Listar as rotas de primeiro nível do `build` para a lista de reservados.

---

## 3 · Escopo

- `firestore.rules` (o `match` trancado), `types/conta.ts`, `types/` (`ApelidoDoCardapio`),
  `caminhos.apelido`.
- `domain/cardapio.ts`: `apelidoValido`, `sugerirApelido`, `APELIDOS_RESERVADOS`, com teste.
- `src/app/api/cardapio/apelido/route.ts` (novo); `src/lib/server/cardapio.ts` (resolver);
  `src/app/c/[contaId]/page.tsx` (redirecionar).
- `SeuCardapio.tsx`; `scripts/encerrar-conta.mjs`.
- `firebaseAdmin.ts`, no cabeçalho: quem escreve ganha a rota do apelido.
- Linha em `components/comecar/novidades.ts`: "Um endereço com o nome da sua loja".

---

## 4 · Roteiro de navegador

1. Conta de cadastro: o painel sugere o apelido pelo nome. Salvar: o link do painel muda, e
   `/c/{apelido}` abre o cardápio.
2. `/c/{contaId}` da mesma conta: 308 para `/c/{apelido}`.
3. Trocar o apelido: o antigo redireciona para o novo; outra conta tenta o antigo: `ocupado`.
4. Apelido reservado (`login`) e com acento: o painel recusa antes de mandar.
5. No console, sem login, `getDoc` em `apelidos/{apelido}`: `permission-denied`.
6. Pedido feito pela página aberta no apelido: chega em `/pedidos` da conta certa.
7. `encerrar-conta` numa conta de teste com apelido: o apelido fica livre.

---

## Critérios de aceite

- [ ] As quatro aprovações registradas antes do código.
- [ ] `apelidos/` trancada para o cliente; só o Admin SDK escreve, numa transação.
- [ ] `/c/{apelido}` abre; `contaId` e apelido antigo redirecionam ao atual.
- [ ] O antigo nunca é apagado nem reaproveitado por outra conta; a purga o libera.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `#d319` escrito; `CLAUDE.md` (o invariante
      ganha a exceção, como a purga ganhou) e `ESTADO.md` atualizados.

---

## Fora de escopo

- **Endereço na raiz** (`/mycookies`, sem o `/c/`). Disputa com toda rota do app e da página de
  venda, para sempre; `/c/` custa dois caracteres.
- **Domínio próprio** (`pedidos.mycookies.com.br`). DNS e certificado por conta na hospedagem;
  vira spec quando uma assinante pedir e pagar por isso.
- **Apelido para a folha do orçamento.** A folha não tem link público.
