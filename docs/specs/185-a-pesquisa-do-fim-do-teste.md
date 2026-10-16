# Spec 185 · A pesquisa do fim do teste

**Tipo:** toda fundadora é convidada, no fim dos 14 dias, a responder uma pesquisa de dois minutos:
o que o Rende mudou, o que faltou, se continuaria, e um depoimento com autorização para publicar.
**Quem responde ganha o preço de fundadora, 30% para sempre** (o desconto é da 187); quem não quer,
pula, e assina pelo preço cheio. A resposta mora na conta dela; a contagem, na plataforma; na
centésima, quem conduz o projeto recebe um e-mail.
**Tamanho:** uma sessão.
**Origem:** o pedido do beta de 2026-10-15, item 7 (feedback para melhorar e depoimento para
validar), e a resposta de quem conduz o projeto no mesmo dia: a pesquisa não é obrigatória, o
desconto é o motivo para responder.
**Depende de:** 181 (`Conta.beta`, `plataforma/beta`). A 187 depende desta.
**Aprovações pedidas:** (1) **schema aditivo**: `contas/{id}/pesquisas/{id}` e
`Conta.pesquisaRespondidaEm?`; (2) **regras**: `pesquisas` em `soDoServidor`; (3) **a peça de
e-mail**: um parágrafo a mais em `testeAcabando` para fundadoras; (4) **as perguntas**, abaixo.
**Decisões a registrar:** três, numeradas na sessão (a pesquisa vai pelo servidor; é oferecida com
o desconto, e não imposta; a autorização do depoimento é uma caixa com versão).

---

## Problema

1. O beta existe para colher feedback e depoimento, e hoje o único retorno estruturado é o motivo
   do cancelamento no Stripe (`#d376`), que só quem paga e cancela dá.
2. Depoimento na `/conheca` exige autorização escrita (`#d175`); pedir por WhatsApp, um a um, não
   escala para cem.
3. No fim do teste a regra recusa escrita (`#d144`): uma pesquisa gravada pelo cliente falharia
   justamente no dia em que mais se precisa dela.

---

## 1 · O que esta spec decide

### As perguntas

Em `domain/pesquisa.ts`, como dado (`PERGUNTAS_DO_FIM_DO_TESTE`), com o esquema zod ao lado.
Obrigatórias marcadas com • (para mandar e ganhar o desconto); o resto pode ficar em branco. A
sessão passa os textos pela `humanizer`.

1. • **"Se o Rende sumisse amanhã, como você se sentiria?"** Muito decepcionada · Um pouco
   decepcionada · Não faria falta. (A pergunta de saída do beta no `ROADMAP.md`; 40% de "muito" é o
   corte usual de produto que encaixou.)
2. • **"De 0 a 10, quanto você indicaria o Rende para uma confeiteira amiga?"** Onze botões.
3. **"O que você mais usou?"** Várias: Preço dos produtos · Pedidos e agenda · Cardápio · Compras ·
   O mês e o caixa · MEI · Receita na bancada.
4. • **"O que o Rende mudou no seu preço ou na sua rotina nestes 14 dias?"** Texto, de 20 a 600
   caracteres. Obrigatória porque é a resposta que o desconto paga: sem ela, a pesquisa vira três
   cliques por 30%.
5. **"O que faltou, atrapalhou ou você não achou?"** Texto, até 600.
6. • **"Vai continuar com o Rende?"** Sim, já assinei ou vou assinar · Ainda não sei · Não. Com
   "Não" ou "Ainda não sei", aparece "O que pesou mais?": O preço · Falta uma coisa que eu preciso ·
   Não tive tempo de usar · Uso outra coisa · Outro (texto curto).
7. **"Em uma ou duas frases, o que você diria a uma confeiteira sobre o Rende?"** Texto, até 280.
   Com texto, aparecem:
   - "Cidade" (texto curto) e "Como quer ser chamada no depoimento" (padrão: `proprietaria`, `nome`
     do negócio).
   - A caixa **"Autorizo o Rende a publicar esta frase com o meu nome, o nome do meu negócio e a
     minha cidade, no site e nas redes do Rende. Posso pedir para tirar quando quiser."** Desmarcada
     por padrão, e **fora do desconto**: autorizar não dá nada a mais, para o depoimento continuar
     sendo dela (`#d175`). A versão do texto (`AUTORIZACAO_DO_DEPOIMENTO`) vai gravada.
8. **"Topa uma conversa de 20 minutos por vídeo ou ligação?"** Sim · Não. Com "Sim", WhatsApp.

### Quando ela vê

`situacaoDaPesquisa(conta, agoraMs)` em `domain/pesquisa.ts`, com teste:

- `"fora"`: sem `beta.fundadora`, sem `trialAte` (as contas semeadas da 181, que nunca tiveram
  teste), conta `ENCERRADA`, ou já com `pesquisaRespondidaEm`.
- `"aberta"`: de 3 dias antes de `trialAte` em diante, sem prazo para acabar. Quem assina meses
  depois e responde ainda ganha o desconto.

Onde a oferta aparece, sempre com o mesmo texto curto, "Responda a pesquisa do beta (2 minutos) e
ganhe o preço de fundadora: 30% a menos, para sempre.":

- **A `FaixaDoTeste`**, nos três últimos dias, com "Responder" (secundário).
- **`/assinatura`**, acima dos planos, para fundadora com a pesquisa `"aberta"`: é onde ela cai no
  fim do teste (`#d145`) e onde decide pagar. "Responder e ganhar 30%" (secundário; o âmbar da tela
  continua o de assinar, `#d373`) e, embaixo dos planos, o preço com o desconto riscado ao lado só
  depois de respondida (187).
- **O e-mail de 3 dias antes** (abaixo).
- **A Configuração**, na seção "Seus convites" (183), uma linha enquanto estiver aberta.

Nenhuma tela trava. Pular é não tocar.

### A tela

`/pesquisa`, em `(auth)`, fora do shell, como `/assinatura`:

- Topo: "Como foram os seus 14 dias?" e "Você é a fundadora nº {n}. O que você responder decide o
  que o Rende faz depois. Respondendo, o seu plano sai com 30% a menos, para sempre."
- Uma página só, as perguntas em blocos, "Mandar e ganhar os 30%" no pé (primário, 52px, `sticky`
  no celular) e "Agora não" (terciário) que volta para de onde ela veio.
- Depois de mandar: "Obrigada. O preço de fundadora já está na sua conta." e "Ver os planos" para
  `/assinatura` (ou, já assinante, "Voltar", e a 187 aplica o desconto na assinatura dela).
- Sem rede: "Precisa de internet para mandar. Suas respostas ficam aqui." O rascunho fica no
  aparelho (`rende:pesquisa`, com `try`) até o envio dar certo.

### A rota

`POST /api/pesquisa { contaId, respostas }`: token, `ehDona`, `situacaoDaPesquisa` `"aberta"`,
esquema. Numa transação do Admin SDK: se `contas/{id}/pesquisas/fim-do-teste` já existe, nada
(repetir não conta duas vezes); senão grava a resposta com `respondidaEm`, `diasDeUso` (de
`criadaEm`) e `v`, grava `pesquisaRespondidaEm` na conta e soma 1 em `plataforma/beta.pesquisas`.
Depois da transação, a 187 pendura aqui a aplicação do desconto em quem já assina.

Quando a soma chega a `vagas`, `after()` manda a quem conduz o projeto (`RESPONSAVEL.email`) um
e-mail de texto puro: "{n} pesquisas respondidas. Para abrir o Rende: npm run beta -- lancar
--confirmo", com a chave `beta/pesquisas-completas`. Com a pesquisa opcional, a centésima pode
não chegar: o lançamento continua sendo por comando, a qualquer hora (186).

### O e-mail do teste acabando

`testeAcabando` (3 dias antes, `#d205`) ganha, só para fundadora com a pesquisa aberta, um
parágrafo e um segundo link: "Antes de decidir, responda a pesquisa do beta: são 2 minutos, e o
seu plano sai com 30% a menos, para sempre. [Responder a pesquisa]". O botão principal da peça
continua o de assinar.

### O que sai da pesquisa

- `npm run beta -- pesquisas`: um CSV (uma linha por resposta, os textos inteiros) no diretório
  passado, mais o resumo no terminal: % de "muito decepcionada", NPS (promotoras − detratoras),
  quantas continuam, os motivos, e quem topou conversar. E quantas fundadoras chegaram ao fim do
  teste sem responder: com o desconto como motivo, essa taxa diz se o incentivo bastou.
- `npm run beta -- depoimentos`: só as frases com a caixa marcada, no formato do bloco de
  depoimento da `/conheca` (`#d175`, `#d386`), com a versão da autorização ao lado. Publicar
  continua sendo decisão de quem conduz o projeto, em outra spec.

---

## 2 · Antes de tocar em código

1. Ler `/assinatura`, `FaixaDoTeste`, `testeAcabando`, `api/emails/diario/route.ts`, `#d144`,
   `#d175`, `#d205`, `#d373`, `#d376`, `#d386`.
2. `/impeccable` com registro **product**; `PRODUCT.md` e `DESIGN.md`. Onze botões de 0 a 10 a
   44px não cabem em 360px numa linha: duas linhas (0 a 5, 6 a 10) no celular.
3. Pedir as quatro aprovações, com as perguntas.

---

## 3 · Escopo

- `domain/pesquisa.ts` (perguntas, esquema, `situacaoDaPesquisa`, `resumoDasPesquisas` para o
  script reusar a regra do NPS) e o teste: os dois estados no limite, o esquema com e sem
  obrigatórias, a pergunta 4 abaixo de 20 caracteres, depoimento sem caixa, o NPS de um conjunto
  fixo.
- `types/`: `RespostaDaPesquisa`, `Conta.pesquisaRespondidaEm`, `caminhos.pesquisa(contaId)`.
- `api/pesquisa/route.ts`.
- `app/(auth)/pesquisa/page.tsx` e `components/pesquisa/`.
- A oferta em `FaixaDoTeste`, `/assinatura` e `SeusConvites`.
- `pecas.ts`: o parágrafo; `api/emails/diario`: passar `pesquisaAberta`.
- `firestore.rules`. `scripts/beta.mjs`: `pesquisas` e `depoimentos`.
- `novidades.ts`.

---

## 4 · Roteiro de navegador

1. Conta fundadora com `trialAte` daqui a 2 dias: a linha na faixa; a pesquisa abre e o app segue
   livre; "Agora não" volta.
2. `trialAte` no passado, sem assinatura: o app cai em `/assinatura` como hoje, com a oferta acima
   dos planos; responder volta a `/assinatura`.
3. Pular e assinar: a assinatura sai pelo preço cheio, e a oferta continua na Configuração.
4. Sem rede no envio: a frase, e as respostas continuam lá ao recarregar.
5. Mandar duas vezes (dois toques, duas abas): uma resposta, `pesquisas` soma 1.
6. `vagas 3` e a terceira resposta: o e-mail chega a quem conduz o projeto.
7. Ajudante nunca vê a oferta nem a pesquisa. A MyCookie's (semeada, sem `trialAte`) também não.
8. Teclado e leitor de tela nos onze botões e nas caixas.

---

## Critérios de aceite

- [x] A pesquisa grava no fim do teste, quando a regra já recusa escrita do cliente.
- [x] Uma resposta por conta; a contagem não dobra.
- [x] Nenhuma tela trava; a oferta aparece nos quatro lugares.
- [x] Depoimento só sai no `depoimentos` com a caixa marcada e a versão.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **Oferecida com desconto, e não obrigatória.** Decidido por quem conduz o projeto em 2026-10-15.
  Travar o app no dia em que ela decide pagar arrisca a assinatura; o desconto dá o motivo sem tirar
  a escolha. O preço: algumas respostas vão ser feitas só pelo desconto. A pergunta 4 obrigatória, com
  mínimo de 20 caracteres, é o freio.
- **A autorização do depoimento não entra no desconto.** Depoimento comprado não vale como prova, e
  a `#d175` pede que seja dela.
- **Sem prazo para responder.** Quem volta depois de um mês e assina ainda é fundadora. Fechar a
  pesquisa num dia seria um relógio a mais para cuidar.
- **Dentro do app, e não Google Forms.** A resposta fica ligada à conta (dias de uso, situação,
  quem convidou), e o desconto sai da própria resposta, sem conferência manual.
- **A centésima avisa, não lança.** O lançamento manda e-mail para a lista inteira; deve ser um ato
  de quem conduz o projeto.

---

## Fora de escopo

- O desconto em si: o cupom, o checkout e a assinatura de quem já assina (187).
- Publicar os depoimentos na `/conheca` (outra spec, com as frases escolhidas).
- Pesquisa no meio do teste, ou para quem não é fundadora.
- Painel das respostas no app.
