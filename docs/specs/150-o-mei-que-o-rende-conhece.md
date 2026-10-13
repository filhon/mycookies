# Spec 150 · O MEI que o Rende conhece

**Tipo:** o CNPJ, o nome empresarial, a atividade e o mês de abertura do MEI saem do aparelho e
das linhas em branco da folha e passam a morar na conta, num documento só do dinheiro. Digitado o
CNPJ, o resto vem da consulta pública que a leitura de nota já usa. A folha sai preenchida, o
limite do ano passa a ser o proporcional quando ela abriu o MEI no ano, e a tela diz desde quando
o Rende está somando.
**Tamanho:** uma sessão.
**Origem:** crítica da tela do Relatório do MEI sobre os prints de 2026-10-12. Todo serviço pago de
MEI (app de MEI, conta PJ, contabilidade online) começa pelo CNPJ e devolve a folha preenchida; o
Rende devolve duas linhas em branco todo mês e pergunta "Abriu o MEI este ano?" todo mês.
**Depende de:** 074 (`#d269`, `#d270`).
**Aprovações pedidas:** (1) **schema aditivo**: documento novo `contas/{id}/fiscal/mei`; (2)
**regras**: `fiscal` entra em `doDinheiro` (a ajudante não lê nem escreve), é só uma restrição a
mais; (3) **o que sai para fora**: o CNPJ dela vai para `publica.cnpj.ws` pelo servidor, como o da
loja já vai na leitura de nota; (4) o texto.
**Decisões a registrar:** `#d359`.

---

## Problema

1. **A folha sai incompleta todo mês.** "CNPJ: ____" e "Empreendedor individual: ____" esperam a
   caneta. É o que separa um formulário de um documento pronto, e é o primeiro campo que qualquer
   serviço pago de MEI pede.
2. **As escolhas moram no aparelho** (`rende:mei-atividade`, `rende:mei-nota:AAAA-MM`). Imprimir
   no computador o que ela configurou no celular sai com a atividade errada, sem aviso. O `#d269`
   já previa: "se o relatório for usado, elas vão para a conta com o CNPJ".
3. **O limite mente para baixo.** O print mostra "R$ 2.201,50 de R$ 81.000,00 · 3%" e "você fecha
   dezembro perto de R$ 13.209,00". Ela começou a lançar no Rende em agosto; janeiro a julho não
   estão na soma, e a tela não diz. O `#d270` promete "erra pra cima"; aqui erra pra baixo, que é
   o lado perigoso de um limite.
4. **"Abriu o MEI este ano?"** é uma pergunta que a tela faz e não guarda a resposta.

---

## O que esta spec decide: `#d359`

### O documento

```ts
// contas/{contaId}/fiscal/mei   (caminhos.fiscalMei)
interface DadosMei {
  id: "mei";
  v: VersaoSchema;
  cnpj?: string;            // só dígitos, validado por `cnpjValido` (já existe em domain/notaFiscal)
  nomeEmpresarial?: string; // como no CCMEI, até 120
  atividade: AtividadeMei;  // "INDUSTRIA" | "COMERCIO"
  abertura?: CompetenciaMensal; // o mês em que o MEI começou
  notas?: Record<CompetenciaMensal, Centavos>; // "Emiti nota fiscal em {mês}"
}
```

- Em `fiscal`, e não em `configuracao/geral`: a ajudante lê a configuração (preços, formas de
  pagamento) e não lê dinheiro. O valor com nota por mês é dinheiro; o CNPJ vai junto para ser uma
  leitura só.
- Escrita com `Timestamp.now()` e `v`, `setDoc(..., { merge: true })`, offline como o resto.
- **Migração do aparelho:** na primeira abertura com o documento ausente, se houver
  `rende:mei-atividade` ou `rende:mei-nota:*` no aparelho, eles são gravados no documento e as
  chaves apagadas. Sem nada no aparelho, nada se grava até ela tocar em algo.

### O CNPJ preenche o resto

- Na tela do relatório, enquanto não houver CNPJ, o primeiro bloco de "Antes de imprimir" é
  **"O seu CNPJ"**: campo com máscara, teclado numérico, e uma linha: "Fica guardado na sua conta
  para sair na folha todo mês."
- Com 14 dígitos válidos e rede, `GET /api/mei/cnpj?cnpj=…` (servidor, mesma `perguntarCnpj` da
  rota de nota, extraída para `src/lib/server/cnpj.ts`) devolve **só** `nomeEmpresarial`,
  `abertura` e `atividade` sugerida. O CNAE principal decide a sugestão: seção C (divisões 10 a 33)
  é indústria, divisões 45 a 47 é comércio, o resto não sugere. **Conferir os campos da resposta
  no dia** (`razao_social`, data de início ou de opção pelo MEI, CNAE principal); o que não vier,
  fica para ela.
- A tela mostra o que veio, já gravado e editável: "MARIA SOUZA 12345678900 · Indústria · aberto
  em março de 2021 · Mudar". Sem rede ou sem resposta: os três campos à mão, sem mensagem de erro.
- Autenticada como as outras rotas da dona; nunca chamada pela ajudante (a rota mora sob
  `/financeiro`).

### A folha

- "CNPJ:" e "Empreendedor individual:" saem preenchidos quando há valor; vazios, a linha de
  sempre.
- A atividade e a nota do mês leem do documento. "Minha atividade no MEI é" deixa de ser
  pergunta toda vez: com o documento preenchido, vira a linha de resumo acima com "Mudar". A dica
  passa a apontar para a fonte: "É a que está no seu CCMEI. Doceira e confeiteira costumam ser
  indústria."

### O limite do ano

- `limiteDoAno(agregados, ate, abertura?)`: com `abertura` no mesmo ano, o teto é
  `LIMITE_MEI_POR_MES × meses desde a abertura` (o mês da abertura conta inteiro), e a linha
  "Abriu o MEI este ano?" some. Sem `abertura`, a linha continua.
- **Desde quando:** o primeiro mês do ano com `entradas > 0` nos agregados. Se for depois de
  janeiro (e depois da abertura, quando houver), abaixo do número: "Somado desde agosto, quando
  você começou a lançar no Rende. O que entrou antes não está aqui." Em tinta, sem ícone: é
  honestidade, não alarme. O valor de antes é a 153.
- O ritmo continua a média dos meses com agregado, e só aparece com três meses ou mais: dois
  meses vezes doze é chute, e a marca não chuta.

---

## Testes

- `limiteDoAno` com abertura no ano (teto proporcional, estados por centavos), com abertura em ano
  anterior (teto cheio), sem abertura; `desde` com janeiro vazio; ritmo com menos de três meses é
  `null`.
- `atividadeDoCnae(codigo)` em `domain/mei.ts`: 1091-1/02 indústria, 4721-1/02 comércio, 5620-1/04
  nada.
- A rota devolve só as três chaves (teste das chaves, como o `#d158`).

## Roteiro de navegador

1. Conta sem documento e com `rende:mei-atividade=COMERCIO` no aparelho: abrir a tela grava
   comércio no documento e apaga a chave.
2. Digitar um CNPJ de MEI real: nome, abertura e atividade aparecem; a folha sai com os dois.
3. Offline: digitar o CNPJ grava só o CNPJ; os outros campos à mão.
4. Abrir no computador: mesma atividade e mesma nota que no celular.
5. Abertura em março do ano: o teto é R$ 67.500,00 e a linha da pergunta sumiu.
6. Conta que começou a lançar em agosto: "Somado desde agosto…".
7. Ajudante: a leitura de `fiscal/mei` é recusada pelas regras (emulador).

## Critérios de aceite

- [x] `fiscal/mei` com `v`, em `doDinheiro`, nas exportações de "Meus dados" (029).
- [x] CNPJ validado antes de sair do aparelho; a rota devolve só três campos.
- [x] Folha preenchida; escolhas iguais em qualquer aparelho.
- [x] Limite proporcional, "Somado desde", ritmo só com três meses.
- [x] Portão; `#d359`; `ESTADO.md`; uma linha em `novidades.ts`.

## Fora de escopo

- **Pedir o CNPJ no cadastro ou na Configuração.** Mora onde é usado; se outra tela precisar
  (nota fiscal de serviço, 2027), sobe.
- **Emitir DAS, consultar débito, entrar no gov.br.** Continua fora (074).
- **O faturamento de antes do Rende.** A 153.
- **Nota emitida por pedido**, para o valor "com nota" vir somado em vez de digitado. Pede campo
  no pedido; candidata depois da 153, se ela emitir nota com frequência.

## Riscos

- **A consulta pública muda de forma ou some.** Os campos são sugestão; à mão continua valendo.
- **CNAE secundário.** A sugestão usa só o principal; a dica aponta para o CCMEI.
