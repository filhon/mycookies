# Spec 181 · A vaga por convite

**Tipo:** o Rende vira beta fechado. A porta de verdade, `POST /api/conta`, passa a exigir um
convite enquanto a fase for `BETA`, e a contar as vagas ocupadas contra um teto (100). Esta spec é
o portão e o registro, sem tela nova: o estado da plataforma num documento, o convite como
documento da conta de quem convida, a troca do convite pela vaga numa transação do servidor, e o
script `npm run beta` para quem conduz o projeto ver e semear.
**Tamanho:** uma sessão.
**Origem:** pedido de quem conduz o projeto em 2026-10-15: antes de cobrar de quem não conhece o
Rende, cem confeiteiras por indicação, feedback e depoimento; a escassez das vagas como expectativa
do lançamento.
**Depende de:** nada. Abre a série 181 a 186 (ver "A série do beta", no fim).
**Aprovações pedidas:** (1) **schema aditivo**: `Conta.beta?`, `Conta.origem` aceita `"convite"`,
coleção `contas/{id}/convites`; (2) **regras de segurança**: `convites` entra em `soDoServidor`, e
`plataforma/{doc}` ganha bloco trancado como `apelidos` (`#d319`); (3) **uma segunda exceção ao
invariante "todo dado mora em `contas/…`"**, `plataforma/beta`, escrita no `CLAUDE.md`; (4) um
`fieldOverride` de grupo de coleção em `firestore.indexes.json`. Nenhuma dependência.
**Decisões a registrar:** três, numeradas na sessão (o convite mora na conta de quem convida; a vaga
se troca numa transação do servidor; a fase e as vagas num documento da plataforma).

---

## Problema

1. **Qualquer pessoa cria conta.** `/cadastro` e o "Entrar com o Google" abrem conta para quem
   chegar. Esconder o botão nas páginas não fecha nada: a porta é `POST /api/conta`.
2. **Não existe teto.** Nada no sistema sabe quantas contas o beta tem, nem para de abrir na
   centésima.
3. **Não existe convite de dona.** O único convite do Rende é o da ajudante (`/api/conta/membros`),
   que dá acesso à conta de quem convida, e não uma conta nova.

---

## 1 · O que esta spec decide

### O estado da plataforma

Um documento, `plataforma/beta`, lido e escrito só pelo Admin SDK:

```ts
interface EstadoDoBeta {
  fase: "BETA" | "PUBLICO";
  vagas: number; // o teto, 100
  ocupadas: number; // contas de fundadora abertas, por convite ou semeadas
  espera: number; // a última posição dada na lista de espera (spec 182)
  pesquisas: number; // pesquisas do fim do teste respondidas (spec 185)
  lancadoEm?: Timestamp;
  v: number;
}
```

- `lerBeta()` em `src/lib/server/beta.ts`. **Documento ausente é `BETA` com 100 vagas e 0
  ocupadas**: errar para a porta fechada. Sem credencial (build local), o mesmo.
- `caminhos.plataformaBeta = "plataforma/beta"`. O mapa continua sendo o único que conhece o
  formato.

### O convite

`contas/{dona}/convites/{codigo}`, escrito só pelo servidor, lido pela dona:

```ts
interface Convite {
  codigo: string; // "K7Q3M9XA", o id do documento repetido no campo
  paraQuem?: string; // o nome que ela escreveu, até 40 caracteres (spec 183)
  status: "ABERTO" | "USADO" | "CANCELADO";
  criadoEm: Timestamp;
  usadoEm?: Timestamp;
  usadoPor?: string; // contaId da convidada
  nomeDaConvidada?: string; // `proprietaria` da conta que nasceu
  v: number;
}
```

- **O código**: 8 caracteres de `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 símbolos, sem 0/O, 1/I/L),
  de `crypto.getRandomValues`, mostrado como `K7Q3-M9XA`. ~39 bits: com mil convites abertos no
  mundo, um chute acerta uma vez em 850 milhões. `gerarCodigo(aleatorio)`, `formatarCodigo` e
  `lerCodigo(texto)` em `domain/convite.ts`, puros. `lerCodigo` aceita minúsculas, espaço e hífen,
  e devolve `null` para qualquer coisa fora do alfabeto ou do tamanho.
- **O link é o convite; o código é o mesmo convite dito em voz alta.** `{URL_DO_SITE}/convite/K7Q3M9XA`
  (a página é da 183). Quem recebe por print ou ligação digita o código no cadastro.
- **Uso único.** Um convite vira uma conta, e só uma.
- `firestore.indexes.json` ganha o `fieldOverride` de `convites.codigo` com escopo de grupo de
  coleção: a troca acha o convite por `collectionGroup("convites").where("codigo", "==", c)`.

### A conta de fundadora

`Conta.beta?: { fundadora: number; convites: number; convidadaPor?: string }`:

- `fundadora` é o número da vaga (1 a 100), dado na troca. É o que as telas e o e-mail chamam de
  "fundadora nº 37".
- `convites` é a cota: **5**, `CONVITES_POR_FUNDADORA` em `domain/convite.ts`.
- `convidadaPor` é o `contaId` de quem convidou. A árvore inteira sai daí.
- `Conta.origem` aceita `"convite"`; a conta que nasce por convite grava `origem: "convite"`, e o
  rascunho da calculadora continua ganhando quando existe (`#d317`): a biblioteca e a boas-vindas
  dependem dele.

### A troca do convite pela vaga

`esquemaCadastro` ganha `convite?: string`. Em `garantirConta`, **só no ramo em que o documento
ainda não existe** (repetir o POST nunca gasta outro convite, `#d141`):

1. `lerBeta()`. Fase `PUBLICO`: o caminho de hoje, sem olhar o convite.
2. Fase `BETA`, numa `runTransaction` do Admin SDK: ler `plataforma/beta`; achar o convite pelo
   grupo de coleção; conferir `status == "ABERTO"` e que a conta de quem convidou não está
   `ENCERRADA`; conferir `ocupadas < vagas`; criar a conta com `beta: { fundadora: ocupadas + 1,
convites: 5, convidadaPor }`; marcar o convite `USADO` com `usadoEm`, `usadoPor` e
   `nomeDaConvidada`; `ocupadas + 1`.
3. A claim, depois, como hoje.

Falhas novas em `FalhaCadastro`, todas 403 e sem conta criada: `sem-convite`, `convite-invalido`
(não existe, cancelado, ou de conta encerrada: a mesma resposta), `convite-usado`, `sem-vaga`. A
frase de cada uma mora em `MENSAGENS` do `AuthProvider`; a tela que as mostra direito é a 182.
Nesta spec, `/cadastro` só lê `?convite=` (e o guarda em `rende:convite` no `localStorage`, com
`try`, para sobreviver ao popup do Google e à volta pelo login) e o manda no POST.

**Por que transação, se o `CLAUDE.md` proíbe `runTransaction`:** a proibição é do cliente, no
caminho crítico offline. Cadastro já exige rede, e a transação roda no servidor. Sem ela, dois
cadastros simultâneos com o mesmo convite, ou na vaga 100, abririam duas contas.

### Quem não passa pelo portão

- **A ajudante.** Entra por `/api/conta/membros`, não ocupa vaga e não recebe convite.
- **Quem já tem conta.** Login nunca pede convite.
- **O script `conceder-acesso`.** É a mão de quem conduz o projeto; não conta vaga sozinho.

### `npm run beta`

`scripts/beta.mjs`, um arquivo com subcomandos, pelo `admin.mjs` como os outros:

- `npm run beta` (sem argumento): fase, vagas, ocupadas, espera, pesquisas; convites abertos,
  usados e cancelados; e a árvore, uma linha por fundadora: número, negócio, quem convidou,
  convites usados de 5, dias desde o cadastro, situação (teste, assinante, vencida).
- `npm run beta -- semear <contaId> [cota]`: dá `beta.convites = cota` (5 sem argumento) e, se a
  conta ainda não tem `beta.fundadora`, a próxima vaga, na mesma transação. É como a MyCookie's vira
  a fundadora nº 1: `npm run beta -- semear mycookies`.
- `npm run beta -- vagas <n>`: muda o teto. Nunca abaixo de `ocupadas`.

`lancar` é da 186; `pesquisas` e `depoimentos`, da 185; `tirar-da-espera`, da 182.

---

## 2 · Antes de tocar em código

1. Ler `api/conta/route.ts`, `domain/cadastro.ts`, `scripts/conceder-acesso.mjs`,
   `scripts/admin.mjs`, `#d141`, `#d144`, `#d319` e o bloco `apelidos` de `firestore.rules`.
2. Conferir no emulador, ou na sandbox, que `collectionGroup(...).where(...)` dentro de
   `runTransaction` do Admin SDK trava a leitura (ela trava; anotar).
3. Pedir as quatro aprovações. Sem a (2), nada desta spec sai.

---

## 3 · Escopo

- `domain/convite.ts` (`gerarCodigo`, `formatarCodigo`, `lerCodigo`, `CONVITES_POR_FUNDADORA`) e
  `tests/domain/convite.test.ts`: o alfabeto, o tamanho, ida e volta de `formatarCodigo` /
  `lerCodigo`, `lerCodigo` com minúscula, espaço e hífen, e dez entradas inválidas dando `null`.
- `types/`: `EstadoDoBeta`, `Convite`, `Conta.beta`, `Conta.origem` com `"convite"`,
  `caminhos.plataformaBeta` e `caminhos.convites(contaId)`.
- `server/beta.ts`: `lerBeta()`.
- `domain/cadastro.ts`: `convite` no esquema, `origem` com `"convite"`, as quatro falhas.
- `api/conta/route.ts`: a troca.
- `/cadastro`: ler `?convite=`, guardar, mandar.
- `firestore.rules` (com o comentário do porquê), `firestore.indexes.json`, `CLAUDE.md` (a segunda
  exceção do invariante).
- `scripts/beta.mjs` e a linha em `package.json` e no `CLAUDE.md` § Comandos.
- `DEPLOY.md`: publicar regras e índice **antes** do deploy do app, e semear as duas contas que existem (resposta 2).

---

## 4 · Roteiro

Na sandbox, com `npm run build && npm start`:

1. Sem `plataforma/beta`: cadastro sem convite dá `sem-convite`, e nenhuma conta nasce.
2. `semear` uma conta de teste; criar um convite à mão no console; cadastrar com ele: a conta
   nasce com `beta.fundadora: 2`, `origem: "convite"`, o convite `USADO`.
3. O mesmo convite numa segunda conta: `convite-usado`.
4. `vagas 2` e outro convite: `sem-vaga`.
5. Repetir o POST da conta criada no passo 2: mesma resposta, `ocupadas` não muda.
6. "Entrar com o Google" com `?convite=` na volta do popup: o código chega ao POST.
7. `npm run beta` imprime a árvore.

---

## Critérios de aceite

- [x] Fase `BETA` sem convite válido não abre conta, por nenhum caminho.
- [x] Um convite, uma conta; a vaga 101 não abre.
- [x] Repetir o POST nunca gasta convite nem vaga.
- [x] Ajudante e login existente intocados.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` e `CLAUDE.md` atualizados.

---

## Decisões fáceis de rejeitar

- **O convite mora na conta de quem convida, e não numa coleção `convites/` na raiz.** O
  invariante continua quase inteiro, a exportação (`#d149`) leva os convites dela sem ninguém
  lembrar, e a tela da 183 lista os convites pelo ouvinte de sempre, offline. O preço é um
  `fieldOverride`.
- **Link com o código dentro, e não só código, nem só link.** O link é o que se toca no WhatsApp e
  o que tem prévia; o código é o que se dita. Os dois são o mesmo documento.
- **Uso único, e não reservado a um e-mail.** Amarrar ao e-mail obrigaria ela a pedir o e-mail da
  amiga antes de mandar, e o convite pelo WhatsApp perde o sentido. Se o link vazar, vale uma vez, e
  ela cancela o que não foi usado (183).
- **A vaga conta a conta, e não o login.** Quem abre conta pelo convite e nunca volta ocupa a vaga.
  É o que "100 usuários" significa para o Stripe e para o Firestore; se as vagas paradas pesarem,
  `vagas` sobe por comando.

---

## Fora de escopo

- A tela de convites e a página do convite (183). A lista de espera (182). As páginas públicas
  (184). A pesquisa (185). O lançamento (186).
- Convite que expira por data. Uso único e cancelar bastam até alguém mostrar o contrário.
- Recompensa por convite aceito.

---

## A série do beta

| Spec                             | O que entrega                                                                      | Pede aprovação                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 181 · A vaga por convite         | o portão, as vagas, o convite como dado, `npm run beta`                            | schema, regras, índice, exceção do invariante                       |
| 182 · A lista de espera          | o formulário, a rota, o e-mail, a privacidade                                      | regras, exceção do invariante, texto da privacidade, peça de e-mail |
| 183 · O convite que ela manda    | os cinco convites no app, a página `/convite/…` com prévia                         | nenhuma além das da 181                                             |
| 184 · As páginas do beta         | `/conheca`, as cinco páginas de preço, login, cadastro e `llms.txt` falam de vagas | nenhuma                                                             |
| 185 · A pesquisa do fim do teste | as perguntas, a oferta nos quatro lugares, o alerta da 100ª, a exportação          | schema, regras, peça de e-mail                                      |
| 186 · O lançamento               | `npm run beta -- lancar`, o e-mail para a lista, o que muda em cada tela           | peça de e-mail                                                      |
| 187 · O preço de fundadora       | o cupom `FUNDADORA` de 30% no checkout e na assinatura de quem respondeu           | nenhuma                                                             |

Ordem: 181 → 182 → 183 → 184; a 185 depende só da 181 e pode ir em paralelo, e a 187 vem logo
depois dela; a 186 por último. **A 185 e a 187 vão juntas para produção**: a pesquisa promete o
desconto que a 187 cobra.
**Nada da série vai para produção antes de 181 a 184 estarem prontas juntas**: o portão sem a
lista de espera e sem as páginas novas deixaria quem chega numa porta fechada sem explicação.

### O que o pedido não dizia e a série resolve

1. **A porta é o servidor, não a página.** Tirar o botão de `/conheca` não fecha nada; o "Entrar
   com o Google" cria login e cai em `/cadastro`. O portão mora em `POST /api/conta` (181).
2. **O código precisa sobreviver ao popup do Google e ao login.** `rende:convite` no aparelho (181).
3. **Corrida na vaga 100 e no mesmo convite.** Transação no servidor (181).
4. **As contas que já existem.** Nenhuma conta ocupa vaga sozinha; as duas que existem são
   semeadas à mão (resposta 2).
5. **A ajudante não é fundadora.** Não gasta vaga nem ganha convite (181).
6. **Convite repassado ou vazado.** Uso único e cancelar (181, 183).
7. **As vagas acabam com convites na mão.** O link diz que acabaram e oferece a lista (183).
8. **As páginas são estáticas.** Para a frase das vagas e a troca de fase sem deploy, elas passam a
   revalidar a cada 5 minutos, e as imagens de prévia não falam de beta (184).
9. **LGPD.** A lista de espera guarda dado de quem não é usuária: a privacidade ganha uma seção,
   um jeito de sair e uma versão nova (182). O depoimento precisa de autorização escrita (`#d175`),
   pedida na própria pesquisa (185).
10. **A cota do Resend.** O plano grátis manda 100 e-mails por dia, somando todos os avisos. A
    confirmação da lista sai na hora; o e-mail do lançamento sai em lotes diários pelo cron que já
    existe (186). Uma campanha que encha a lista num dia pede o plano Pro antes (182).
11. **A pesquisa não pode ser gravada pelo cliente.** No fim do teste a regra já recusa escrita
    (`#d144`): a pesquisa vai por rota do servidor (185).
12. **Medir quem convida quem.** `convidadaPor`, `origem: "convite"` e a árvore em `npm run beta`
    (181), e a prova social no fim: NPS, "se sumisse amanhã" e depoimentos autorizados (185).
13. **Robôs.** `/convite/*` não entra no `sitemap` e leva `noindex` (183).

### Respostas de quem conduz o projeto (2026-10-15)

1. **Preço de fundadora: sim.** A Maynara continua com a cortesia de 100% que já tem. As outras
   fundadoras ganham **30% para sempre ao responder a pesquisa** do fim do teste. É a spec 187.
2. **As contas que já existem entram nas 100.** São duas: a da Maynara (a MyCookie's) e a de quem
   conduz o projeto. O `DEPLOY.md` manda semear as duas (`semear mycookies` e `semear <contaId>` da
   outra), cada uma com 5 convites. Se forem dois logins da mesma conta, é uma vaga só: a vaga
   conta a conta, e não o login. Nenhuma das duas tem `trialAte`, então nenhuma vê a pesquisa (185).
3. **A pesquisa não é obrigatória.** Quem responde e manda ganha os 30%; quem não quer, pula e assina
   pelo preço cheio. A 185 oferece, sem travar tela nenhuma.
4. **Encerrar perde a vaga e os convites.** Os convites abertos de uma conta encerrada já não valem
   (a troca recusa com `convite-invalido`), e `ocupadas` não desce: a vaga só volta a existir no
   lançamento, quando o teto deixa de valer. A sessão não escreve código para isso; é o
   comportamento da troca como descrita acima.
