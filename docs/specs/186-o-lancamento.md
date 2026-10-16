# Spec 186 · O lançamento

**Tipo:** um comando abre o Rende para todas: `npm run beta -- lancar --confirmo`. A fase vira
`PUBLICO`, o cadastro deixa de pedir convite, as páginas voltam ao "Começar o teste" em até 5
minutos, e a lista de espera recebe, em lotes diários pelo cron que já existe, o e-mail "As portas
abriram".
**Tamanho:** uma sessão.
**Origem:** o pedido do beta de 2026-10-15, item 9: pronto para sair por comando na centésima
pesquisa, ou quando quem conduz o projeto quiser.
**Depende de:** 181 a 185 e 187.
**Aprovações pedidas:** a peça de e-mail `lancamento` (molde do `#d203`).
**Decisões a registrar:** duas, numeradas na sessão (o lançamento é um campo, e as telas já o
leem; o e-mail da lista sai pelo cron diário, em lotes).

---

## Problema

Sem esta spec, abrir o Rende seria mexer no console do Firestore e torcer para tudo ler a fase, e
avisar a lista seria mandar centenas de e-mails à mão, contra uma cota de 100 por dia.

---

## 1 · O que esta spec decide

### O comando

`npm run beta -- lancar` mostra o que vai acontecer e para: quantas na lista, quantos dias de lotes,
quantas fundadoras sem pesquisa. Com `--confirmo`, grava `fase: "PUBLICO"` e `lancadoEm` em
`plataforma/beta`. `npm run beta -- fase BETA` desfaz (para um lançamento acidental); o e-mail
já mandado não volta.

### O que muda sozinho, porque já lê a fase

| Lugar                 | Fase `PUBLICO`                                                                        |
| --------------------- | ------------------------------------------------------------------------------------- |
| `POST /api/conta`     | sem convite; quem traz convite ainda grava `origem: "convite"` e `convidadaPor` (181) |
| páginas públicas      | `PortaDoBeta` devolve o botão de hoje (184), em até 5 minutos                         |
| `/cadastro`, `/login` | o formulário de sempre (182, 184)                                                     |
| `/convite/[codigo]`   | redireciona para `/cadastro?convite=` (183)                                           |
| "Seus convites"       | some; na Configuração fica uma linha "Você foi a fundadora nº {n}."                   |
| a pesquisa            | continua aberta para as fundadoras, com o preço de fundadora (185, 187)               |

Esta spec confere cada linha e corrige o que faltou, sem reescrever as anteriores.

### O e-mail para a lista

- `lancamento({ nome })` em `pecas.ts`. Conteúdo, pela `humanizer` e para aprovação:
  - Assunto: "O Rende abriu, e você é das primeiras a saber".
  - "Oi, {nome}. Você entrou na fila do Rende e prometemos avisar primeiro. As portas abriram."
  - Os 14 dias grátis, sem cartão, e o que ela faz no primeiro dia (o preço do produto que mais
    vende).
  - Botão "Começar o teste" para `/cadastro?de=espera`.
  - "Você está recebendo isto porque entrou na lista de espera. Não vai receber outro."
- `origem` aceita `"espera"` (aditivo, junto com o `"convite"` da 181), lida de `?de=espera` como a
  114 lê `?de=cardapio`.

### Os lotes

- No `GET /api/emails/diario` (`#d205`), com a fase `PUBLICO`, depois dos avisos de sempre: as
  entradas de `listaDeEspera` sem `avisadaEm`, por `posicao`, até `LOTE_DO_LANCAMENTO` (60); cada
  envio `"enviado"` ou `"repetido"` grava `avisadaEm`. Chave `lancamento/{id}`.
- Quem da lista já tem login (entrou por convite antes do lançamento) não recebe: `getUserByEmail`
  antes de mandar, e `avisadaEm` gravado do mesmo jeito.
- 60 deixa espaço na cota grátis para os outros avisos do dia. **ponytail:** constante fixa; com o
  Resend Pro, sobe para 1.000 numa linha.
- Quem conduz o projeto quer tudo no mesmo dia: Resend Pro antes de `lancar` e o lote maior. Fica
  no `DEPLOY.md`.
- `npm run beta` mostra quantas da lista foram avisadas e quantas viraram conta (`origem: "espera"`).

### A lista depois

90 dias depois de `lancadoEm`, `npm run beta -- apagar-espera --confirmo` apaga a coleção, como a
privacidade da 182 prometeu. O script recusa antes do prazo.

---

## 2 · Antes de tocar em código

1. Ler `scripts/beta.mjs`, `api/emails/diario/route.ts`, `PortaDoBeta`, `/convite/[codigo]`,
   `SeusConvites`, `#d205`, `#d317`.
2. Pedir a aprovação da peça.

---

## 3 · Escopo

- `scripts/beta.mjs`: `lancar`, `fase`, `apagar-espera`.
- `pecas.ts`: `lancamento` e a prévia.
- `api/emails/diario`: o lote; `LOTE_DO_LANCAMENTO`.
- `domain/cadastro.ts`: `origem` `"espera"`.
- A linha da Configuração.
- O que a conferência da tabela acima achar faltando.
- `DEPLOY.md`: o roteiro do dia do lançamento.

---

## 4 · Roteiro

Na sandbox, com 130 entradas falsas na lista (e-mails `+n` de uma caixa de teste):

1. `lancar` sem `--confirmo` só descreve.
2. `lancar --confirmo`; em até 5 minutos as seis páginas mostram "Começar o teste".
3. Cadastro sem convite abre conta com teste de 14 dias.
4. Um link de convite antigo leva ao cadastro e a conta nasce com `origem: "convite"`.
5. Chamar o cron duas vezes no mesmo dia: 60 e-mails, não 120. No dia seguinte (ou com o relógio
   do cron forçado), os próximos 60; no terceiro, os 10 restantes.
6. `fase BETA`: a porta fecha de novo.
7. `apagar-espera` antes de 90 dias recusa.

---

## Critérios de aceite

- [x] Um comando abre o Rende, sem deploy.
- [x] Ninguém da lista recebe o e-mail duas vezes, e a cota do dia é respeitada.
- [x] As telas da tabela se comportam como a tabela diz.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` e `DEPLOY.md` atualizados.

---

## Decisões fáceis de rejeitar

- **O cron, e não o script, manda os e-mails.** O script roda em Node fora do app e não importa as
  peças em TypeScript (`#d141`); o cron já tem a chave, o `enviarEmail` e o horário certo, e os
  lotes saem sozinhos dia após dia sem alguém lembrar de rodar.
- **A centésima pesquisa não lança sozinha** (185). Um e-mail para centenas de pessoas é um ato.
- **A fundadora não perde nada no lançamento.** O número dela e `convidadaPor` ficam; o que
  ela ganhou (os 30% da 187, se respondeu) continua.

---

## Fora de escopo

- Página de lançamento, contagem regressiva, anúncio pago.
- Uma segunda onda de vagas por convite antes do lançamento (`vagas` sobe por comando, 181).
