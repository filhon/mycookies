# Spec 149 · O orçamento que a cliente aprova

**Tipo:** o link de acompanhamento (117), quando o pedido é orçamento, vira a versão na tela da
folha: com foto, descrição, validade e condições, e um botão **"Aprovar orçamento"**. A aprovação
chega para ela como pedido esperando resposta e como aviso no celular; ela confirma com um toque. A
folha impressa ganha o QR do link, para quem recebe o papel aprovar pelo celular.
**Um campo opcional novo** (`Pedido.aprovacao`) e **uma rota de escrita pública** nova. Nenhuma
regra de segurança muda (a escrita é do servidor), nenhum índice, nenhuma dependência.
**Tamanho:** duas sessões. **149-A** (o link vira orçamento, sem escrita) e **149-B** (aprovar).
**Origem:** crítica da folha do orçamento de 2026-10-12. É o que separa uma folha de uma
ferramenta de orçamento paga: Square Estimates, Jobber, HoneyBook, Stripe Quotes e Qwilr mandam
**um link** com "Aprovar", e o PDF é o anexo. No Rende o PDF é o caminho, e no celular ele leva
quatro toques e chega como arquivo que a cliente tem que devolver assinado.
**Depende de:** 117 (o link), 119 (o aviso), 046 (`EsperandoVoce`), 147, 148.
**Aprovações pedidas:** (1) **schema aditivo**: `Pedido.aprovacao?: { em: Timestamp; nome: string }`;
(2) **escrita pública**: `POST /api/pedido/aprovar`, autenticada pela `chavePublica`; (3) **o que sai
para fora**: a lista fechada do `#d320` ganha foto, descrição e as condições (148); (4) o texto.
**Decisões a registrar:** `#d357` (149-A), `#d358` (149-B).

---

## Problema

1. **Aprovar custa caro para quem compra.** "Responda pelo WhatsApp ou assine abaixo e devolva
   esta folha": imprimir, assinar, escanear, mandar de volta. Ninguém faz; a empresa responde
   "ok" no WhatsApp, e a Maynara confirma de cabeça.
2. **A Maynara não sabe que foi aprovado.** O "ok" chega no meio de outras conversas. O
   orçamento continua `ORCAMENTO` até ela lembrar.
3. **O link que já circula não parece orçamento.** A página da 117 mostra "A Maynara vai
   confirmar", a lista e o total. Sem foto, sem descrição, sem condições: a folha bonita e o link
   pobre contam duas histórias do mesmo pedido.

---

## 149-A · O link vira orçamento: `#d357`

- **A página do acompanhamento, enquanto `ORCAMENTO`:** topo com o logo (148) e "Orçamento
  P-261009-6F5 · para Juliana Oliveira"; as linhas como na folha (foto, nome, composição, descrição,
  quantidade e valor), no layout de lista do cardápio; o total; "Vale até 19 de outubro"; o
  Combinado e as condições. Celular primeiro: é onde ela abre.
- **`acompanhamentoDoPedido`** ganha, por item, `descricao?` e `fotoUrl?` (da ficha viva, `#d108`) e,
  no negócio, `logo?` e `condicoes?`. O teste das chaves do objeto (`#d158`) é atualizado: é a
  aprovação (3).
- **Orçamento vencido:** a página diz "Este orçamento venceu em 19 de outubro. Fale com a Maynara
  para um preço novo." com o WhatsApp, e nada de botão (149-B).
- **A folha impressa ganha o QR do link** no bloco de aceite do orçamento, 22 mm, com "Para aprovar,
  aponte a câmera". Sem chave pública ainda, `garantirChavePublica` antes de imprimir (já existe).
- **Na tela da folha**, "Mandar pra cliente" (147) passa a ser o primário também no desktop
  enquanto `ORCAMENTO`: o link é o caminho; o PDF, o anexo.

## 149-B · Aprovar: `#d358`

- **O botão.** Na página, enquanto `ORCAMENTO`, dentro da validade e sem `aprovacao`: campo "Seu
  nome" (preenchido com `clienteNome`, editável: quem aprova na empresa não é a empresa) e
  **"Aprovar orçamento"**. Depois: "Aprovado por Ana Souza em 12 de outubro. A Maynara vai
  confirmar a data." e o botão some.
- **A rota.** `POST /api/pedido/aprovar` com `{ contaId, pedidoId, chave, nome }`. Mesmas guardas da
  página da 117 (chave por `timingSafeEqual`, arquivado, conta encerrada, `permite(…, "cardapio")`)
  e mais: status `ORCAMENTO`, dentro da validade, sem `aprovacao`. Grava **só** `aprovacao: { em:
Timestamp.now(), nome }` e `v`, pelo Admin SDK. Nome com 1 a 80 caracteres. Repetir é idempotente.
- **Por que não muda o status.** O aparelho dela é offline-first: se o servidor gravasse
  `CONFIRMADO` enquanto ela tem uma edição do pedido na fila, a escrita dela, ao subir, podia
  devolver o status para `ORCAMENTO`. Um campo que só o servidor escreve não briga com nada. E
  confirmar é ela que decide (agenda, despensa): a aprovação é da cliente, a confirmação é dela.
- **Onde ela vê.** `EsperandoVoce` ganha o tipo "Aprovou o orçamento" (`CheckCheck`), com
  "Confirmar" na linha, que faz o mesmo que o botão do editor. O aviso da 119 sai com "Juliana
  aprovou o orçamento P-261009-6F5". No editor, acima do status: "Aprovado por Ana Souza pelo
  link, em 12 de outubro".
- **Na folha reimpressa**, o espaço "Aprovado por" vira "Aprovado por Ana Souza pelo link, em 12
  de outubro de 2026", sem linha.

## Testes

- `acompanhamentoDoPedido`: as chaves novas; vencido sem `podeAprovar`; aprovado com `aprovacao`.
- `podeAprovar(pedido, hojeISO)` em `domain/acompanhamento.ts`, puro: os quatro nãos e o sim.
- `esperaDoCardapio` ou irmã: orçamento com `aprovacao` entra na lista.

## Roteiro de navegador

1. Pedido em orçamento com validade, foto e condições: o link no celular mostra tudo.
2. Aprovar com outro nome: a página agradece; no app, "Aprovou o orçamento" em Esperando você e o
   aviso no celular; "Confirmar" leva a `CONFIRMADO`.
3. Aprovar de novo pelo mesmo link: nada muda.
4. Vencido: sem botão, com o WhatsApp.
5. Imprimir o orçamento: o QR abre a mesma página.
6. Offline no aparelho dela: editar o pedido sem rede, a cliente aprova, a rede volta: a aprovação
   continua lá e o status é o que ela deixou.

## Critérios de aceite

- [x] 149-A: o link no orçamento mostra a versão na tela da folha; QR na folha impressa.
- [x] 149-B: aprovar grava `aprovacao`, aparece em Esperando você, no aviso e no editor.
- [x] Portão nas duas sessões; `#d357` e `#d358`; `ESTADO.md` e `novidades.ts`.

## Fora de escopo

- **"Visto pela cliente".** O WhatsApp abre o link para montar a prévia: uma escrita na leitura da
  página marcaria como visto um orçamento que ninguém abriu. Só com um sinal do navegador (um
  `POST` depois de montar), e só se ela pedir.
- **Recusar, pedir mudança, escolher itens.** A conversa continua no WhatsApp.
- **Cobrar o sinal na aprovação.** O Pix continua só depois que ela confirma (`#d320`). Sinal
  pedido na aprovação é campo novo (quanto) e outra spec.
- **Lembrete de orçamento parado** ("mandado há 3 dias, sem resposta"). Candidato natural depois
  desta, em Esperando você, com a mesma lógica da 109.
