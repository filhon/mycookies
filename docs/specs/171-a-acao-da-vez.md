# Spec 171 · A ação da vez

**Tipo:** o topo do link de acompanhamento passa a responder "quando" junto com "em que pé", e
cada estado do pedido ganha **uma** ação primária: aprovar no orçamento, pagar quando há Pix, falar
com ela quando não há outra coisa a fazer. O Pagamento sobe para logo abaixo do topo quando há o
que pagar; no computador, o Pix ganha o QR. A página se atualiza quando a cliente volta para a aba.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica do link de acompanhamento de 2026-10-15 (`AUDITORIA-DE-PAGINAS.md`), feita
sobre o código, sem prints. Todo serviço de pedido que se paga por assinatura ou comissão (iFood,
Domino's, Shopify, Anota AI, Goomer) abre a página com o **quando** em letra grande e mostra uma
ação por estado. A página da 117 é o mesmo documento em todos os estados: o título é o nome do
passo ("Confirmado"), o dia mora numa lista abaixo de quatro linhas de trilha, o Pix (o único
bloco que põe dinheiro na conta dela) é o quinto bloco, e o botão grande é sempre "Falar com a
Maynara", que é justamente a pergunta que a página existe para poupar.
**Depende de:** 117, 149. Tudo codificado.
**Aprovações pedidas:** nenhuma. A lista fechada do `#d320` não muda: nada novo sai do pedido.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **"Confirmado" não responde nada.** A cliente abre o link para saber quando busca ou quando
   chega. A resposta está no sexto elemento da página, em `body`, com o dia por extenso ("sábado,
   18 de outubro") quando o pedido é amanhã.
2. **O Pix fica embaixo dos itens.** Com R$ 120 a pagar, a cliente rola a lista de doces que ela
   mesma pediu, o subtotal e o total antes de achar o botão. No computador (WhatsApp Web), o copia e
   cola não serve: ela paga pelo celular, e a página não tem o QR que a folha impressa tem (`#d355`).
3. **O primário é sempre o WhatsApp.** Três primários possíveis disputam (Aprovar, Copiar o Pix,
   Falar), e o mais forte visualmente é o que gera mensagem para a Maynara.
4. **No orçamento, a trilha mostra quatro passos vazios.** "Confirmado, ainda não · Sendo feito,
   ainda não…" antes do que importa (as linhas, o total, a validade, o botão de aprovar).
5. **A página não sabe que envelheceu.** Aberta às 10h e olhada de novo às 16h, mostra "Sendo
   feito" com o pedido já pronto. A 117 decidiu "a cliente recarrega", e ninguém recarrega.

---

## 1 · O que esta spec decide

### O quando, no topo

- `quandoDoPedido(tipo, dataISO, hora, hojeISO)` em `domain/acompanhamento.ts`, puro, com teste,
  devolve a linha do topo, com a palavra da entrega na frente:
  - "Retirada hoje, às 15h" · "Entrega amanhã, às 10h" · "Retirada sábado, às 15h" (na semana,
    só o dia da semana, como `rotuloAte`) · "Entrega em 3 de novembro" (depois da semana,
    `rotuloDiaNoAno`). Hora "15:00" vira "15h", "15:30" fica "15h30".
  - **Dia passado e pedido não entregue:** a data por extenso, sem relativo ("Retirada em terça,
    14 de outubro"). Nada de "atrasado": quem decide se atrasou é ela.
  - `ENTREGUE` e `CANCELADO`: sem linha de quando. O `situacao` já diz tudo.
- Sai no `Acompanhamento` como `quando?: string`, e `dia`/`hora` continuam (a mensagem e a 172
  usam). O teste das chaves ganha `quando`.
- **No topo:** o `h1` continua `situacao`; logo abaixo, `quando` em `heading` `--ink`. Quem lê só
  o topo sabe o pé e o dia. A linha `CalendarDays` e a de `Store`/`Truck` saem da lista de baixo;
  o endereço da entrega fica, com `MapPin`.

### Uma ação por estado

`acaoDaVez(visto)` em `domain/acompanhamento.ts`, pura, com teste: `"aprovar" | "pagar" | "falar"`.

| Estado                                 | Primário             | Onde                                      |
| -------------------------------------- | -------------------- | ----------------------------------------- |
| orçamento que `podeAprovar`            | "Aprovar orçamento"  | depois das condições, como hoje (`#d358`) |
| fora do orçamento, com `pix`           | "Copiar o Pix de …"  | o bloco Pagamento, logo depois do topo    |
| o resto (sem Pix, pago, vencido, etc.) | "Falar com a {quem}" | no pé, como hoje                          |

- **"Falar com a {quem}" vira secundário** (`classesBotao` com a variante de borda) sempre que a
  ação da vez não for `falar`. Continua no pé, com o mesmo texto.
- **O Pagamento sobe** para logo depois do topo (antes da trilha) quando a ação é `pagar`. Nos
  outros estados fica onde está. "Pago", quando pago, continua embaixo: é informação, não ação.
- O `BotaoCopiar` do Pix passa a ser o primário da página nesse estado: conferir na sessão se a
  `variante="loja"` já é o primário; se não for, usar a variante primária.

### O QR do Pix, no computador

- O `Qr` de `FolhaOrcamento.tsx` (SVG desenhado com `uqr`, já instalado) sai para
  `components/ui/Qr.tsx`, sem mudar o desenho. A folha passa a importá-lo.
- Na página, a partir de `lg`, ao lado do botão de copiar: o QR do mesmo `pix`, 160px, em
  `--surface` com borda `--border`, e embaixo, em `label` `--ink-muted`: "Ou aponte a câmera do
  celular no app do banco." No celular o QR não aparece: ninguém escaneia a própria tela.

### "Mandar o comprovante"

Depois do texto do Pix, botão terciário com `MessageCircle`: "Mandar o comprovante pra {quem}",
`linkDoWhatsApp(whatsapp, "Oi! Paguei o Pix de R$ 120,00 do pedido P-261009-6F5. Segue o
comprovante.")`. Só com `whatsapp` e `pix`. É a mensagem que a cliente escreve de qualquer jeito;
pronta, ela chega com o código, e a Maynara acha o pedido.

### A trilha no orçamento

`passos` vazio enquanto `ORCAMENTO` (aprovado ou não): a página do orçamento é a folha na tela
(`#d357`), e o caminho começa na confirmação. O teste do orçamento muda.

### Atualizada ao voltar

- `AtualizaAoVoltar.tsx` (cliente, pequeno, ao lado da página): no `visibilitychange` para
  visível, se passaram 30 segundos desde a última, `router.refresh()`. Nenhuma escuta, nenhum
  intervalo: uma leitura por volta à aba, que é quando a cliente quer saber.
- Embaixo da trilha, em `micro` `--ink-subtle`: "Atualizado às 14:32", a hora do render no fuso de
  Brasília (`#d160`). Diz que o que ela vê é de agora.

---

## 2 · Antes de tocar em código

1. Ler `BotaoCopiar` e `classesBotao`: quais variantes existem e qual é a primária.
2. Ler o teste de `acompanhamentoDoPedido`: o orçamento hoje espera quatro passos.
3. Conferir `rotuloAte` e `rotuloDiaNoAno` para não duplicar a regra de "na semana".

---

## 3 · Escopo

- `domain/acompanhamento.ts`: `quandoDoPedido`, `acaoDaVez`, `quando` no objeto, `passos` vazio no
  orçamento; teste.
- `components/ui/Qr.tsx` (extraído), `FolhaOrcamento.tsx` (import).
- A página: o topo, a ordem do Pagamento, o QR em `lg`, "Mandar o comprovante", o WhatsApp
  secundário, "Atualizado às".
- `AtualizaAoVoltar.tsx`.
- Linha em `components/comecar/novidades.ts`: "O link do pedido diz quando, e o Pix vem primeiro".

---

## 4 · Roteiro de navegador

1. Pedido confirmado para amanhã às 15h, retirada, Pix: o topo diz "Confirmado" e "Retirada
   amanhã, às 15h"; o Pix vem antes da trilha; o WhatsApp no pé tem borda, não fundo.
2. No desktop, o mesmo link: o QR ao lado do botão; escanear com o app do banco traz o valor.
3. "Mandar o comprovante": o WhatsApp abre com o código e o valor.
4. Orçamento: sem trilha; o primário é "Aprovar orçamento".
5. Pedido pago e sem Pix: o primário é o WhatsApp.
6. Abrir o link, mudar o status no app, voltar para a aba depois de 30s: a página mostra o novo
   passo sem recarregar.
7. Pedido de anteontem, ainda "Pronto": "Retirada em …", sem "hoje" nem "atrasado".

---

## Critérios de aceite

- [x] O topo diz o quando em todos os estados com data por vir; nada no entregue e no cancelado.
- [x] Um primário por estado; o WhatsApp secundário quando há outro.
- [x] O QR do Pix só a partir de `lg`; a folha usa o mesmo `Qr`.
- [~] A página se atualiza ao voltar à aba, no máximo uma vez a cada 30s.
- [x] `lint`, `typecheck`, `test` e `build` passam; decisão registrada; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **"Atualizado às", e não "há 5 minutos".** O relativo precisaria de relógio no navegador
  andando; a hora fixa é verdade sem código.
- **O WhatsApp continua na página em todo estado.** Secundário, mas sempre lá: a confeitaria é
  conversa, e a página não quer parecer que esconde a dona.
- **30 segundos de folga no `refresh`.** Trocar de aba para o banco e voltar não deve custar duas
  leituras.

---

## Fora de escopo

- **A hora de cada passo** ("Confirmado em 12/10, às 9h"). Exige gravar quando cada status mudou
  (schema novo, em toda mudança de status do app). Candidata se a cliente perguntar "quando ficou
  pronto?".
- **Atualização ao vivo** (`onSnapshot`): exige regra pública (`#d320`).
- **Previsão em minutos** ("chega em 25 min"). Não há entregador rastreado nem fila: a hora é a
  combinada.
- **Avisar a cliente quando o passo muda.** É a 173.
