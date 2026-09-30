# Spec 057 · O aparelho em toda tela

**Tipo:** o estado da conexão sai das telas e passa a morar num lugar só, o cabeçalho, em toda
tela, com a volta da rede dita em voz alta. **Nenhum campo, nenhuma consulta nova, nenhuma regra,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica dos componentes de layout (2026-09-30).
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d234`.

---

## Problema

"Offline é o estado normal" é o quarto princípio do `PRODUCT.md`, e o shell não sabe dele. Quem
sabe é cada tela, cada uma do seu jeito.

**Onze cópias, quatro lugares.** `SeloSincronizacao` é chamado em onze telas: nas ações do
cabeçalho (os dois editores, as duas contagens), na linha da contagem (`/insumos`, `/fichas`,
`/clientes`), numa linha própria de 32px que existe mesmo vazia (`/financeiro`, `min-h-8`), e em
outros pontos de `/compras`, `/pedidos` e `/configuracao`. Ela precisa aprender onde procurar a
cada tela.

**A tela que ela mais abre não diz nada.** A Hoje e o `/comecar` não têm o selo. Sem rede, na
feira, ela abre o app e não tem como saber se o que vê é de agora.

**O pendente é da coleção, não do aparelho.** `pendente` vem de `hasPendingWrites` do snapshot
daquela tela. Registrar uma venda em `/pedidos` sem rede e ir para a Hoje: nada diz que a venda
ainda não subiu.

**A volta é muda.** O momento em que a rede volta e tudo sobe é o que prova que o "salvo no
aparelho" era verdade, e ele não existe na tela. Figma, Notion e Linear dizem o estado da
sincronização no mesmo ponto do cromo em toda tela, e dizem quando terminou. Aqui a confiança
é o produto: ela precisa acreditar que a venda da feira não se perdeu.

**Um comentário que mente.** `src/app/(app)/layout.tsx:46` diz que a escrita recusada por relógio
atrasado "aparece como `permission-denied` no `SeloSincronizacao`". O selo não lê erro nenhum.

---

## 1 · O que esta spec decide

### O selo é do cabeçalho: `#d234`

- `CabecalhoPagina` desenha o `SeloSincronizacao` sempre, na **linha da descrição**, depois dela
  (`flex flex-wrap items-center gap-x-2`). No celular, onde a descrição some, a linha aparece só
  quando o selo tem o que dizer. Nunca ao lado do "+": em 360px o título já disputa espaço com ele.
- A linha leva `role="status"`: a leitora de tela ouve "Salvo no aparelho" quando a rede cai, o
  que hoje não acontece.
- `CabecalhoPagina` ganha `pendente?: boolean`. A tela passa o `pendente` que já calcula e deixa de
  desenhar o selo. As onze chamadas saem; a linha vazia de `/financeiro` sai junto.
- O selo continua não lendo nenhum token do escopo `sobre-marca` (`#d128`): tem contraste próprio
  sobre a tinta. Conferir o par "atenção sobre `attention-soft`" sobre `brand-700` no escuro.

### A volta da rede tem frase

- Quando `useConexao` passa de `false` para `true`, o selo chama `waitForPendingWrites(db)` e
  mostra **"Tudo enviado"** (tom `positivo`, ícone `Check`) por 4 segundos, depois some.
- Enquanto a promessa não resolve, o selo diz "Enviando", como já diz com `pendente`.
- Isso cobre o buraco do pendente por coleção: `waitForPendingWrites` espera **todas** as escritas
  do aparelho, e não só as da tela aberta.
- `ponytail:` se ela troca de tela no meio da espera, o selo novo nasce já online e não diz "Tudo
  enviado". Aceito: a próxima queda diz de novo. Guardar a transição fora do componente só se o
  roteiro mostrar que isso engana.

---

## 2 · Antes de tocar em código

- Ler as onze chamadas e conferir que todas estão sob um `CabecalhoPagina` (a nota, `/configuracao`
  com barra própria). A que não estiver fica como está e vai para a decisão.
- Consertar o comentário de `(app)/layout.tsx:46`: a recusa não aparece em lugar nenhum hoje.
  Mostrá-la é outra spec.

---

## 3 · Escopo

- `src/components/layout/SeloSincronizacao.tsx`: "Tudo enviado", `waitForPendingWrites`.
- `src/components/layout/CabecalhoPagina.tsx`: a prop `pendente`, a linha com `role="status"`.
- As onze telas que chamam o selo: passam `pendente` ao cabeçalho e param de desenhá-lo.
- `src/app/(app)/layout.tsx`: o comentário.

---

## 4 · Roteiro de aparelho

1. Celular, modo avião, abrir a Hoje: "Salvo no aparelho" sob o título.
2. Ainda sem rede, registrar uma venda em `/pedidos`, voltar à Hoje: o selo continua lá.
3. Tirar o modo avião: "Enviando", depois "Tudo enviado", e em 4 segundos a linha some.
4. Percorrer as cinco abas e `/compras` sem rede: o selo no mesmo lugar em todas.
5. `/financeiro` com rede: nenhuma linha vazia entre o cabeçalho e o conteúdo.
6. TalkBack: a queda da rede é anunciada.
7. Tema escuro: o selo legível sobre a faixa.

---

## Critérios de aceite

- [x] Selo em toda tela com `CabecalhoPagina`, sempre na linha da descrição.
- [x] Nenhuma tela desenha `SeloSincronizacao` por conta própria.
- [x] "Tudo enviado" depois de `waitForPendingWrites`, por 4 segundos.
- [~] `role="status"` na linha do selo.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d234` escrito; `ESTADO.md` atualizado; linha do "Selo de sincronização" do `DESIGN.md`
      atualizada.

---

## 5 · Fora de escopo

- **Mostrar a escrita recusada** (`permission-denied` por relógio atrasado). Precisa de um lugar
  que guarde o erro da mutação, e é outra spec.
- **Contar quantas alterações subiram** ("3 alterações enviadas"). O Firestore não dá o número sem
  contar à mão cada escrita.
- **Desconfiar do `navigator.onLine`** (Wi-Fi sem internet). Hoje ele diz online e a escrita
  espera em silêncio, como já espera.
