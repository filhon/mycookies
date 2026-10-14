# Spec 164 · O recibo na volta

**Tipo:** depois que a 163 confirma a sessão, `/assinatura/confirmando` deixa de pular para a
Hoje e mostra, uma vez, o que ela acabou de fazer: o plano, o que foi cobrado hoje (ou que nada
foi), a próxima cobrança, o cartão, onde chega o recibo e onde se muda tudo isso. Um botão leva
à Hoje. A espera vira frase verdadeira, e a chegada ganha uma entrada curta. **Nenhum campo,
nenhuma regra, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/assinatura/confirmando` com `/impeccable` (2026-10-14). Pagar é o pico
de ansiedade do caminho inteiro, e o fim da experiência é o que fica (pico e fim). Hoje o fim é
um símbolo pulsando e um salto para a Hoje, que não diz nada sobre a assinatura. Os serviços que
faturam bem com assinatura fecham a compra com o mesmo quadro: o que você comprou, quanto saiu,
quando é a próxima, onde muda. É o que faz a cobrança do mês seguinte não parecer surpresa, e
cobrança-surpresa é estorno e cancelamento.
**Depende de:** 163 (a sessão conferida), 084 (o resumo e as frases), 161 (`trial_end`), 162
(o painel onde se muda e se cancela).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **O título mente em dois de três casos.** "Pagamento recebido" para quem assinou no teste
   (nada foi cobrado, 161) e para a cortesia (nada é cobrado, `#d314`).
2. **Ela não vê o que comprou.** Plano, valor, período, dia da próxima cobrança e cartão só
   aparecem se ela for à Configuração e abrir o painel. A primeira cobrança do teste, daqui a
   duas semanas, chega sem ninguém ter mostrado a data na volta.
3. **O fim é um salto.** Confirmado, `router.replace("/")` leva à Hoje, que no teste já abria
   tudo (`#d168`): nada muda na tela e nada diz "deu certo".
4. **A espera é um símbolo pulsando por até 45 segundos**, debaixo de um título que já
   comemora.

---

## 1 · O que esta spec decide

### Esperando

- Antes da confirmação: título **"Confirmando a assinatura"**, descrição "Leva alguns
  segundos." O símbolo pulsando continua (é tela de acesso; o esqueleto do `DESIGN.md` é para
  conteúdo). Com a 163, isso dura o tempo de uma ida ao Stripe.

### Confirmada

- **Não sai sozinha da tela.** Com a situação `assinante`, ela chama `reconferirAcesso()` como
  hoje, lê `/api/assinatura/resumo` e mostra o quadro. Sem resumo (falha, sem rede), o
  comportamento de hoje: vai para a Hoje. O quadro é bônus, nunca porta.
- **`ResumoAssinatura` ganha `emTeste`** (`status === "trialing"`). Uma linha na rota.
- **Título "Assinatura feita"**, anunciado pelo `refTitulo` (`#d368`) quando troca. A
  descrição diz o que aconteceu com o dinheiro, por `fraseDaConfirmacao(resumo)`, com teste:
  - cobrado: "R$ 39,90 cobrados no cartão final 4242."
  - no teste: "Nada foi cobrado hoje. A primeira cobrança é em 28 de outubro, quando o teste
    acaba."
  - cortesia: "É cortesia: nada é cobrado."
  - sem cartão conhecido, a frase sem o "no cartão final".
- **Abaixo, lista com divisórias** em `--surface` (o padrão "Seção no papel"), rótulo à
  esquerda em `label` `--ink-muted`, valor à direita em `--ink`, dinheiro em `tabular-nums`
  600 com o `R$` menor:
  - **Plano**: "Completo · mensal" (cortesia: "Completo · cortesia").
  - **Valor**: "R$ 39,90 por mês"; no anual, "R$ 290,00 por ano" e, embaixo em `label`, "R$
    24,17 por mês" (`mensalDoAnual`). Sai na cortesia.
  - **Próxima cobrança**: o dia (`ateMs`). Sai na cortesia.
  - **Cartão**: "final 4242". Sai sem cartão.
- **Uma linha em `label`** depois da lista, só fora da cortesia: "O recibo de cada cobrança
  chega em ana@exemplo.com." (o e-mail do login). Só se o passo 1 da seção 2 confirmar que o
  Stripe manda; sem isso, a linha não existe.
- **Uma linha em `label`**: "Para mudar o plano, trocar o cartão ou cancelar: Configuração,
  em Assinatura." "Configuração" é link terciário para o painel da 162. É a frase que separa
  assinatura de armadilha.
- **Botão primário "Ir para a Hoje"**, 52px no celular, largura da coluna. O único âmbar da
  tela.

### A chegada

Tela de acesso: o `DESIGN.md` libera uma entrada orquestrada.

- O símbolo para de pulsar e dá lugar ao `CircleCheck` em `--positive` (o semântico com seu
  ícone, não a marca): opacidade e escala de 0.9 a 1, 220ms, `ease-quart`.
- Título, descrição, as linhas e o botão entram em sequência, opacidade e 8px de subida, 60ms
  entre um e outro, tudo em menos de 1,2s. Nada atrasa o texto: o quadro inteiro já está no DOM.
- `prefers-reduced-motion`: o quadro final, parado.
- Nada de confete, nada de ponto âmbar: o ponto marca o número que decide, e aqui nada está
  sendo decidido.

### Demorou

- A frase e o link da 163 ficam. "Conferir de novo" continua secundário.

---

## 2 · Antes de tocar em código

1. **Recibo do Stripe.** No painel (ao vivo e teste), Configurações › E-mails para clientes:
   conferir se "Pagamentos bem-sucedidos" está ligado. Se não estiver, perguntar a quem conduz o
   projeto se liga (é o recibo que a confeiteira MEI guarda para as despesas). Ligado ou não,
   anotar em `DEPLOY.md`. Desligado, a linha do recibo não entra.
2. Conferir que `/api/assinatura/resumo` responde logo depois do `sincronizarAssinatura` da 163
   (a conta já tem `stripeSubscriptionId`). Se houver corrida, a página espera o documento
   virar `assinante` antes de pedir o resumo, que é o que a seção 1 já diz.

---

## 3 · Escopo

- `src/app/(auth)/assinatura/confirmando/page.tsx`: os dois estados, o quadro, a chegada.
- `src/app/api/assinatura/resumo/route.ts` e `ResumoAssinatura`: `emTeste`.
- `src/lib/domain/assinatura.ts`: `fraseDaConfirmacao`, com teste dos quatro casos.
- `docs/DEPLOY.md`: a linha do recibo.

---

## 4 · Roteiro de navegador

Modo de teste, celular a 360px e desktop, claro e escuro.

1. Conta vencida, Essencial mensal: "Confirmando a assinatura", depois "Assinatura feita" com
   "R$ … cobrados no cartão final 4242", as quatro linhas e o botão. "Ir para a Hoje" leva à
   Hoje.
2. No teste, Completo anual: "Nada foi cobrado hoje…", Valor com o mensal embaixo, Próxima
   cobrança no dia do fim do teste.
3. Código de cortesia: "É cortesia", só a linha do Plano, sem recibo.
4. Movimento reduzido ligado: o quadro aparece parado, inteiro.
5. Leitor de tela: o título novo é anunciado; a lista é lida rótulo e valor.
6. Derrubar `/api/assinatura/resumo` (sem rede depois da volta): vai para a Hoje, como hoje.

---

## Critérios de aceite

- [x] O título nunca afirma um pagamento que não houve.
- [x] Ela vê plano, valor, próxima cobrança e cartão antes de sair da tela.
- [x] A tela diz onde se muda e se cancela.
- [x] A chegada tem entrada curta e respeita o movimento reduzido.
- [x] Sem resumo, nada trava.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] Decisão escrita (não sair sozinha da tela); `ESTADO.md`. Sem linha em `novidades.ts`:
      quem lê já assinou e não volta aqui.

---

## 5 · Fora de escopo

- **"O que o Completo abre agora".** No teste tudo já estava aberto (`#d168`); só a conta
  vencida ganha algo, e a Hoje já mostra.
- **Oferecer o anual a quem acabou de assinar o mensal.** Decisão de preço; volta se o
  `metricas` mostrar mensais cancelando no segundo mês.
- **Pedir indicação de outra confeiteira no fim da compra.** É o melhor momento para pedir, mas
  não existe programa de indicação. Spec própria, com a recompensa decidida antes.
- **E-mail de boas-vindas do Rende.** O recibo do Stripe cobre o dinheiro, e esta tela cobre o resto.
- **O painel de marca do desktop** continua com a frase do login.
