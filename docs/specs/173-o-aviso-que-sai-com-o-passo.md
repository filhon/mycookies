# Spec 173 · O aviso que sai com o passo

**Tipo:** quando a confeiteira muda o pedido para Confirmado ou Pronto no app, aparece, no mesmo
lugar, "Avisar a Juliana": o WhatsApp da cliente com a mensagem do passo pronta e o link do
pedido. Um toque dela, do número dela, na voz dela. Nada é enviado sozinho.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica do link de acompanhamento de 2026-10-15. O link da 117 é bom e ninguém
volta a ele sem motivo: a página espera ser aberta. Os cardápios brasileiros que se pagam por
assinatura (Anota AI, Goomer, Cardápio Web, Saipos) vendem justamente o contrário, o robô de
WhatsApp que manda "seu pedido saiu" a cada passo. A 117 deixou a automação fora (API paga por
conversa, fala em nome dela); esta spec fica com o que custa zero: a mensagem pronta no momento
em que o passo muda.
**Depende de:** 117 (o link e `garantirChavePublica`), 171 (o quando, para o texto).
**Aprovações pedidas:** o texto das mensagens (seção 1).
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **A cliente não sabe que ficou pronto.** A Maynara marca "Pronto" no app, e a cliente só sabe
   se a Maynara lembrar de escrever, ou se ela mesma abrir o link por acaso.
2. **Escrever o aviso é trabalho repetido.** "Oi, Juliana, seu pedido ficou pronto, pode passar
   aqui": a mesma frase, pedido a pedido, digitada com a mão suja de massa. Por isso ela não
   escreve, e a cliente pergunta.
3. **O resumo do WhatsApp (o "Mandar o resumo") é o pedido inteiro.** Serve para fechar o pedido,
   não para dizer "ficou pronto".

---

## 1 · O que esta spec decide

### As mensagens

`mensagemDoPasso(status, pedido, link, retirada?)` em `domain/whatsapp.ts`, pura, com teste. Sem
emoji, sem negrito, a voz de `mensagemDeCobranca`:

- **`CONFIRMADO`:** "Oi, Juliana! Seu pedido está confirmado: retirada sábado, às 15h. Acompanhe
  por aqui: {link}". Com Pix e falta a pagar, antes do link: "O Pix de R$ 120,00 está no link."
- **`PRONTO`, retirada:** "Oi, Juliana! Seu pedido ficou pronto e já pode ser retirado." Com o
  endereço da 172: "…retirado na Rua das Flores, 120." E o link.
- **`PRONTO`, entrega:** "Oi, Juliana! Seu pedido ficou pronto e já vai sair pra entrega." E o
  link.
- **Os outros status:** nenhuma mensagem. "Sendo feito" é barulho; "Entregue" ela já sabe,
  porque recebeu.

O quando usa `quandoDoPedido` (171), com hoje no fuso do aparelho. Sem nome de cliente: "Oi!".

### Onde aparece

Nos três lugares em que o status anda: `FichaDoPedido`, `FormularioPedido` e `EsperandoVoce`
(conferir na sessão; o ponto comum é `mudarStatusPedido`). Depois de mudar para `CONFIRMADO` ou
`PRONTO`, uma **faixa informativa** no lugar da ação que acabou de ser tocada:

- `MessageCircle` + "Avisar a Juliana" (botão secundário, alvo de 52px no celular) e, à direita,
  "Agora não" (terciário), que fecha a faixa.
- O botão: `garantirChavePublica` (já existe, funciona sem rede), monta o link com
  `location.origin` como o "Mandar o resumo", e abre `linkDoWhatsApp(clienteTelefone, mensagem)`.
  Sem telefone, `linkDoWhatsApp` já abre o WhatsApp perguntando para quem.
- A faixa some ao tocar em qualquer dos dois ou ao sair da tela. Não volta: é o momento do passo,
  não um lembrete.
- **Só na conta com o link** (`permite(…, "cardapio")`, como o link no resumo, `#d320`). Sem o
  pacote, a mesma faixa sem a linha do link: o aviso ainda poupa a digitação.

### Sem rede

A faixa aparece igual. A mudança de status já está na fila do aparelho; o WhatsApp abre e guarda
a mensagem até a rede voltar. A cliente que abrir o link antes da subida vê o passo anterior:
aceito, é segundos ou minutos.

---

## 2 · Antes de tocar em código

1. **Pedir a aprovação do texto.**
2. Ler `mudarStatusPedido` e os três chamadores: o retorno diz o status novo, ou a faixa lê do
   estado local.
3. Ler `BlocoWhatsApp`: o link e `garantirChavePublica` saem de lá, e a faixa reusa o mesmo
   caminho, sem cópia.

---

## 3 · Escopo

- `domain/whatsapp.ts`: `mensagemDoPasso`; teste (confirmado com e sem Pix, pronto retirada com e
  sem endereço, pronto entrega, sem nome, os status sem mensagem).
- `components/pedidos/AvisarCliente.tsx` (a faixa) e os três chamadores.
- Linha em `components/comecar/novidades.ts`: "Ao confirmar ou deixar pronto, um toque avisa a
  cliente".

---

## 4 · Roteiro de navegador

1. Pedido de retirada com telefone: "Confirmar" mostra a faixa; "Avisar a Juliana" abre o
   WhatsApp da cliente com a mensagem e o link.
2. "Começar a produzir": nenhuma faixa.
3. "Pronto": a faixa com "já pode ser retirado na …".
4. Pedido sem telefone: o WhatsApp pergunta para quem.
5. Modo avião: "Pronto", "Avisar a Juliana": o WhatsApp abre com a mensagem; a rede volta e o
   status sobe.
6. "Agora não": a faixa some e não volta ao reabrir o pedido.

---

## Critérios de aceite

- [x] Mensagem só para `CONFIRMADO` e `PRONTO`, com o quando, o Pix e o endereço quando há.
- [x] A faixa nos três lugares em que o status anda, uma vez por mudança.
- [x] Funciona sem rede; o link só na conta com o pacote.
- [x] `lint`, `typecheck`, `test` e `build` passam; decisão registrada; `ESTADO.md` e
      `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Oferecer, não mandar.** O WhatsApp automático é o que os concorrentes cobram; aqui ele custaria
  por conversa, falaria por um número que não é o dela, e pediria o WhatsApp Business API. Um
  toque dela é de graça e chega do número que a cliente já tem salvo.
- **Faixa, e não modal.** O modal é para confirmação destrutiva (`CLAUDE.md`). Avisar é opcional.
- **Sem memória de "já avisei".** Gravar exige schema; a conversa no WhatsApp já é o registro.

---

## Fora de escopo

- **WhatsApp automático** (API do WhatsApp Business). Candidato a recurso do Completo se as
  confeiteiras pedirem; custo por conversa e aprovação de modelo de mensagem pela Meta.
- **Push para a cliente** (Web Push no navegador dela). No iPhone só funciona com o site
  instalado; e o servidor não vê a mudança de status, que é escrita no aparelho dela, offline.
- **Avisar na mudança de data ou de total.** O "Mandar o resumo" já cobre: é o pedido inteiro.
