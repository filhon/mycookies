# Spec 172 · Onde buscar, e quando lembrar

**Tipo:** a confeiteira escreve uma vez onde e em que horário se retira; o link do pedido de
retirada passa a mostrar o endereço com "Abrir no mapa" e o horário. Todo pedido com data por
vir ganha "Pôr na agenda do celular", um arquivo `.ics` com o dia, a hora, o lugar e o link.
**Um campo opcional novo em `ConfiguracaoGeral` (`retirada`).** Nenhuma regra, nenhum índice,
nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica do link de acompanhamento de 2026-10-15. O pedido de retirada diz
"Retirada" e mais nada: o endereço da Maynara mora na cabeça da cliente ou no recado do cardápio
(texto livre, só no cardápio). iFood e Rappi mostram o endereço da loja com "Como chegar" em todo
pedido para retirar; Calendly, Doctoralia e todo agendamento pago mandam o evento para a agenda.
Na confeitaria, a encomenda é feita dias ou semanas antes (o bolo do aniversário de sábado), e o
esquecimento custa o doce inteiro.
**Depende de:** 117, 171 (a linha do quando e a ordem do topo).
**Aprovações pedidas:** (1) **schema aditivo**: `ConfiguracaoGeral.retirada?: { endereco: string;
horario?: string }`; (2) **o que sai para fora**: a lista fechada do `#d320` ganha o endereço e o
horário da retirada, só no pedido de retirada; (3) **uma rota pública nova de leitura**, com as
guardas da página.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **"Retirada" sem onde.** A cliente nova, que pediu pelo cardápio, pergunta no WhatsApp "qual o
   endereço?". A que já foi uma vez pergunta "até que horas posso passar?".
2. **O dia combinado não vai para a agenda dela.** A data vive no link e na conversa. No sábado
   de manhã, ela lembra da festa e esquece do bolo.

---

## 1 · O que esta spec decide

### O lugar da retirada

- **`ConfiguracaoGeral.retirada?: { endereco: string; horario?: string }`.** `endereco` até 160
  caracteres, `horario` até 80, texto livre como ela escreve ("De terça a sábado, das 14h às
  18h"). Ausente é "não disse", como toda conta nasce.
- **Onde ela escreve:** na Configuração, em "A sua marca", junto do telefone e do Instagram
  (`contato`), com rótulo "Onde se retira" e dica: "Aparece só no link de um pedido de retirada.
  O cardápio aberto não mostra." Dois campos, sem botão próprio: entra no "Salvar" de sempre
  (`#d283`).
- **Privacidade:** muita confeiteira retira em casa. Por isso o endereço não vai para o cardápio
  público nem para a prévia do link: só para quem tem a chave de um pedido de retirada.

### Na página do pedido

- **Retirada com `retirada.endereco`:** na lista de baixo, a linha `MapPin` com o endereço e, logo
  depois, o link terciário "Abrir no mapa" (`ExternalLink`), para
  `https://www.google.com/maps/search/?api=1&query={endereço}`. É a URL universal: no Android abre
  o app do Maps, no iPhone abre o Maps do Google ou o site. Com `horario`, a linha seguinte em
  `body` `--ink-muted`, com `Clock`.
- **Sem `retirada`:** como hoje.
- **`acompanhamentoDoPedido`** recebe `negocio.retirada?` e só devolve `retirada` quando
  `entrega.tipo === "RETIRADA"`. O teste das chaves: presente na retirada, ausente na entrega.

### No resumo do WhatsApp

`mensagemDoPedido` ganha o endereço na linha da retirada quando há: "Retirada em sábado, 18 de
outubro, às 15h, na Rua das Flores, 120". O domínio recebe o endereço pronto, como recebe o link.

### Pôr na agenda do celular

- **`eventoDoPedido(…)`** em `domain/agenda.ts`, puro, com teste, devolve o texto de um
  `VCALENDAR` com um `VEVENT`:
  - `SUMMARY`: "Retirar na {loja}" ou "Entrega da {loja}".
  - Com hora: `DTSTART` em UTC (Brasília é UTC−3 fixo desde 2019, o `#d160`), 1 hora de duração.
    Sem hora: dia inteiro (`DTSTART;VALUE=DATE`).
  - `LOCATION`: o endereço da retirada ou o da entrega, quando há.
  - `DESCRIPTION`: "Pedido {código}. Acompanhe: {link}". Nada de itens nem valores: o arquivo vai
    parar em agenda compartilhada.
  - `UID` = `{pedidoId}@rende`, para o mesmo pedido baixado duas vezes não virar dois eventos.
  - Vírgula, ponto e vírgula e quebra de linha escapados; linhas em CRLF.
  - `BEGIN:VALARM` um dia antes, às 9h, com "Amanhã: {SUMMARY}". Sem hora, também um dia antes.
- **A rota:** `GET /c/[contaId]/pedido/[pedidoId]/[chave]/agenda` (handler ao lado da página),
  com as **mesmas guardas** de `lerAcompanhamento` (chave por `timingSafeEqual`, arquivado,
  conta encerrada, pacote). `Content-Type: text/calendar; charset=utf-8` e
  `Content-Disposition: attachment; filename="pedido-{código}.ics"`. Fora das condições abaixo, 404.
- **Quando aparece:** fora do orçamento, não cancelado, não entregue, e a data é hoje ou depois.
  Botão secundário "Pôr na agenda do celular" (`CalendarPlus`), logo abaixo da linha do quando
  (171).

---

## 2 · Antes de tocar em código

1. **Pedir as aprovações.**
2. Ler onde a Configuração grava `contato` e o `satisfies` da escrita: o campo novo entra no
   mesmo `Salvar`, com `v`.
3. Ler `pedidoPelaChave`: a rota da agenda reusa as guardas, e não as copia.
4. Conferir num iPhone e num Android que o `.ics` servido por rota abre o "Adicionar evento" (no
   iOS o Safari pergunta; no Chrome do Android baixa e abre a agenda).

---

## 3 · Escopo

- `types/configuracao.ts` (`retirada?`), a Configuração (os dois campos), a mutação que salva.
- `domain/acompanhamento.ts` (`retirada` só na retirada; teste), `domain/whatsapp.ts`
  (`mensagemDoPedido` com endereço; teste), `domain/agenda.ts` com teste.
- `server/cardapio.ts` (`lerAcompanhamento` passa `retirada`; a leitura do evento), a rota
  `agenda/route.ts`.
- A página: o endereço, "Abrir no mapa", o horário, "Pôr na agenda do celular".
- `firebaseAdmin.ts`, no cabeçalho: a rota nova lê o mesmo que a página.
- Linha em `components/comecar/novidades.ts`: "O link do pedido diz onde retirar e vai para a
  agenda da cliente".

---

## 4 · Roteiro de navegador

1. Na Configuração, escrever o endereço e o horário; salvar sem rede, salvar com rede.
2. Pedido de retirada: o link mostra o endereço, "Abrir no mapa" abre o Maps no lugar certo, e o
   horário.
3. Pedido de entrega: nada do endereço da loja.
4. "Pôr na agenda do celular" num Android e num iPhone: o evento entra com o dia, a hora, o lugar
   e o aviso na véspera. Baixar de novo: não duplica.
5. Pedido entregue, cancelado ou em orçamento: sem botão; a URL da agenda dá 404.
6. Trocar um caractere da chave na URL da agenda: 404.

---

## Critérios de aceite

- [ ] `retirada` gravada com `v`, só no link de pedido de retirada, nunca no cardápio.
- [ ] O `.ics` com UTC certo, dia inteiro sem hora, `UID` estável, escapes, alarme na véspera.
- [ ] A rota da agenda com as guardas da página; 404 fora das condições.
- [ ] `lint`, `typecheck`, `test` e `build` passam; decisão registrada; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Um endereço por conta**, não por pedido. Quem retira em dois lugares escreve os dois no
  `horario` ("Terça no ateliê, sábado na feira"). Um por pedido é campo no editor e outra spec.
- **`.ics` e não o link do Google Agenda.** O Google Agenda só serve a quem usa o Google Agenda; o
  `.ics` abre a agenda do aparelho, seja qual for.
- **Alarme às 9h da véspera, fixo.** A cliente muda no aparelho dela.

---

## Fora de escopo

- **O endereço no cardápio aberto.** Página pública; é decisão de privacidade dela, e o recado
  (115) já serve a quem quer dizer.
- **Mapa desenhado na página.** Biblioteca de mapa é dependência e peso; o link resolve.
- **Lembrete enviado pelo Rende** (e-mail, push para a cliente). O alarme mora na agenda dela.
