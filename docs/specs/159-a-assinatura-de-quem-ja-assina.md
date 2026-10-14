# Spec 159 · A assinatura de quem já assina

**Tipo:** a assinante que abre `/assinatura` cai no painel "Assinatura" da Configuração, já
aberto, e a moldura das telas de acesso para de perguntar "Não consegue entrar?" a quem já
entrou. **Nenhum campo, nenhuma rota, nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão curta.
**Origem:** crítica de `/assinatura` com `/impeccable` sobre os prints de 2026-10-14 (celular e
desktop, conta MyCookie's, Completo com cortesia).
**Depende de:** 084 (o painel da assinatura) e 111 (cortesia).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão (a próxima livre depois de `#d369`).

---

## Problema

1. **A tela da assinante diz menos do que o painel que já existe.** `/assinatura` mostra
   "Você está no plano Completo" e dois botões. O painel da Configuração (`LinhaDaAssinatura`,
   `#d285`) diz o valor, o período, o dia da cobrança, o final do cartão, a cortesia, o
   "Termina em …" do cancelamento marcado, o que o Completo traz e a economia do anual. Duas
   telas para a mesma pergunta, e a pior é a que tem o endereço com o nome dela.
2. **A tela mente para a cortesia.** A MyCookie's é Completo com cupom de 100% e sem cartão
   (`#d314`), e lê "Trocar o cartão, mudar de plano ou cancelar". O painel diz "Plano Completo ·
   cortesia".
3. **"Gerenciar assinatura" é palavra de software** e é o botão âmbar de uma tela onde não há
   nada a decidir: a única ação real é sair do app para o Stripe, sem saber o que tem lá.
4. **A moldura fala com quem está do lado de fora.** O rodapé pergunta "Não consegue entrar?" a
   quem está dentro, e no desktop 42% da tela é a frase de venda do login ("O preço certo de
   cada doce, antes de mandar o orçamento.") para quem já paga. Vale para os quatro estados de
   `/assinatura` e para `/assinatura/confirmando`.

---

## 1 · O que esta spec decide

### Um lugar só para a assinatura de quem assina

- **`/assinatura` com `situacao.tipo === "assinante"` faz `router.replace("/configuracao#assinatura")`**,
  como já faz com `livre` para `/`. O estado "Sua assinatura está ativa" sai da página.
- **`LinhaDaAssinatura` abre sozinha quando o endereço chega com `#assinatura`**, uma vez, na
  montagem (o mesmo `abrir()` do toque, que lê o Stripe). A linha ganha `id="assinatura"` e o
  `scroll-mt` das outras âncoras da Configuração.
- Quem chega a `/assinatura` sendo assinante: o link velho de um e-mail, o `cancel_url` de um
  checkout aberto antes de assinar por outro aparelho, o endereço digitado. Os três passam a ver
  o painel inteiro.

### A moldura sabe quem está lendo

- **`MolduraDeEntrada` ganha `ajuda?: { pergunta: string; texto: string }`.** Ausente, é o de
  hoje ("Não consegue entrar?" e "Oi, não estou conseguindo entrar no Rende."). Em `/assinatura`
  e em `/assinatura/confirmando`: "Dúvida sobre o plano?" e "Oi, tenho uma dúvida sobre a
  assinatura do Rende.". O link continua "Fale com a gente", WhatsApp do `RESPONSAVEL`, aba nova
  (`#d195`).
- O painel de marca do desktop fica como está nesta spec: o que entra nele é da 161.

---

## 2 · Antes de tocar em código

1. Conferir que nenhum outro lugar manda a assinante para `/assinatura` esperando a tela velha
   (`grep "/assinatura"` em `src/` e nos modelos de e-mail de `src/lib/server/`).
2. Conferir que a Configuração já trata `#a-sua-conta` e as outras âncoras com `scroll-mt`, e
   seguir o mesmo padrão.

---

## 3 · Escopo

- `src/app/(auth)/assinatura/page.tsx`: o `replace` da assinante; o ramo `else` e o botão
  "Gerenciar assinatura" saem; `ajuda` na moldura.
- `src/app/(auth)/assinatura/confirmando/page.tsx`: `ajuda` na moldura.
- `src/components/auth/MolduraDeEntrada.tsx`: a prop `ajuda`.
- `src/components/conta/LinhaDaAssinatura.tsx`: o `id` e a abertura pelo `#assinatura`.

---

## 4 · Roteiro de navegador

1. Assinante (a MyCookie's, cortesia) abre `/assinatura`: cai em `/configuracao`, rolada até
   "A sua conta", com o painel aberto dizendo "Plano Completo · cortesia".
2. Assinante Essencial mensal, modo de teste do Stripe: o painel abre com valor, cartão e "O
   Completo traz".
3. Teste e vencida em `/assinatura`: o rodapé diz "Dúvida sobre o plano?" e o WhatsApp abre
   com o texto da assinatura.
4. `/login`: o rodapé continua "Não consegue entrar?".

---

## Critérios de aceite

- [x] Nenhuma assinante vê "Sua assinatura está ativa"; todas veem o painel.
- [x] O rodapé de `/assinatura` não pergunta se ela consegue entrar.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] Decisão escrita; `ESTADO.md` atualizado. Sem linha em `novidades.ts`: a assinante não
      perde nada que usava.

---

## 5 · Fora de escopo

- **Repetir o painel dentro de `/assinatura`.** Seriam dois componentes para manter iguais.
- **O painel de marca do desktop com o que o teste rendeu.** É a 161.
- **Cancelamento com motivo e oferta.** É a 162.
