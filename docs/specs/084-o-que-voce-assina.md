# Spec 084 · O que você assina

**Tipo:** a linha da assinatura passa a dizer o plano, o valor, quando renova e com que cartão,
mostra o que o Completo traz para quem está no Essencial, e a conta ganha "Fale com a gente".
**Uma rota de servidor nova, nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** a 083 (a linha mora em "A sua conta").
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d285`.

---

## Problema

1. **"Você está no plano Essencial." é tudo o que ela sabe.** Não diz quanto paga, quando
   renova, nem em que cartão. Todo serviço que vive de assinatura mostra isso na própria tela
   (valor, próxima cobrança, final do cartão, cobranças passadas) e manda ao portal só para
   mudar. Assinatura que esconde o valor é a que a cliente cancela quando vê a fatura.
2. **O Completo é um cadeado mudo.** "Seu cardápio" e "Quem te ajuda" dizem "No plano completo"
   na prateleira, longe do bloco da assinatura, e o bloco não diz o que o Completo traz nem
   oferece passar para ele. É o único lugar do app onde ela está pensando no plano, e a venda não
   está lá.
3. **Não há como pedir ajuda de dentro do app.** "Fale com a gente" (WhatsApp do `RESPONSAVEL`)
   só existe na tela de entrada (`MolduraDeEntrada`). Quem paga e trava no meio do preço não
   tem a quem chamar.

---

## 1 · O que esta spec decide

### A assinatura dita inteira: `#d285`

- **`POST /api/assinatura/resumo`**, com o mesmo token e `contaId` do portal, lê no Stripe pela
  `stripeSubscriptionId` da conta e devolve só: valor em centavos, período (mês ou ano), data da
  próxima cobrança, final e bandeira do cartão, e se vai cancelar no fim do período. Nada é
  gravado: o Stripe é a verdade e o webhook continua o único que escreve a conta.
- **A linha "Assinatura"** em "A sua conta" abre na folha inferior / painel lateral (o
  componente de sempre):
  - "Plano Essencial · R$ 39,90 por mês" · "Renova em 12 de novembro, no cartão final 4242." ·
    com cancelamento marcado: "Termina em 12 de novembro. Até lá, tudo continua aberto." em
    atenção, com o triângulo;
  - **no Essencial**, "O Completo traz:" e uma linha por `Recurso` que falta
    (`RECURSOS_DO_PACOTE`), com o que ele faz em uma frase ("O cardápio com link: a cliente
    escolhe e o pedido chega anotado."), e "Passar para o Completo" (secundário, pelo portal);
  - **no mensal**, "No anual você paga R$ … a menos por ano" por `economiaAnual`, com os preços
    de `/api/assinatura/precos`; sem os preços, a linha não aparece;
  - "Trocar o cartão, ver as cobranças ou cancelar" (terciário, portal).
- **Sem rede ou sem resposta**: o que o aparelho já sabe (`situacaoDaConta`: plano e
  `renovaEmMs`) e a frase "O valor e o cartão aparecem com internet." Nunca um erro.
- **No teste**: a linha diz o prazo (`fraseDoTeste`) e leva para `/assinatura`, como hoje.
- O sub-título da linha, fechada, é o resumo: "Essencial · renova em 12 nov".

### Fale com a gente

- Linha em "A sua conta", antes de "Como funciona": `MessageCircle`, "Fale com a gente",
  "Uma pessoa responde pelo WhatsApp.", abre `wa.me` do `RESPONSAVEL` com o texto já dizendo o
  nome do negócio. Aba nova, como na entrada (`#d195`).

---

## 2 · Antes de tocar em código

1. Ler `/api/assinatura/portal` e `/api/assinatura/precos`: autenticação, papel (só a dona),
   cliente do Stripe já instanciado.
2. Conferir o que a conta "livre" (`#d141`) tem: sem `stripeSubscriptionId`, a linha não aparece,
   como hoje.

---

## 3 · Escopo

- `src/app/api/assinatura/resumo/route.ts`.
- `domain/assinatura.ts`: a frase do resumo e a dos recursos, com teste.
- A linha e o painel em `components/conta/`; a linha "Fale com a gente".

---

## 4 · Roteiro de navegador

1. Assinante Essencial mensal: valor, renovação, cartão, o que o Completo traz, a economia do
   anual.
2. Assinante Completo anual: sem "O Completo traz", sem a linha do anual.
3. Cancelamento marcado no portal: "Termina em …" em atenção.
4. Sem rede: plano e renovação, a frase do valor, nenhum erro.
5. "Fale com a gente" abre o WhatsApp com o nome do negócio no texto.

---

## Critérios de aceite

- [x] Valor, período, próxima cobrança e final do cartão na tela, sem gravar nada.
- [x] O Completo dito para quem está no Essencial, com o caminho para ele.
- [x] Offline sem erro.
- [x] "Fale com a gente" dentro do app.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d285` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Lista de cobranças e notas na tela.** O portal já tem; a linha leva até ele.
- **Trocar de plano sem o portal.** O portal é quem cobra a diferença.
- **Indique e ganhe.** É a alavanca de crescimento que falta, mas pede cupom no Stripe, regra de
  quem ganha e quando: spec própria, com aprovação.
- **Central de ajuda, chat, novidades.** Uma confeiteira por vez, uma pessoa responde.
