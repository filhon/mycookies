# Spec 151 · O mês que se entrega

**Tipo:** o relatório ganha prazo, um "Guardei" que congela o que foi impresso, o aviso quando
o mês muda depois disso, e a origem do número ("somado de 31 vendas"). O pé do Caixa passa a dizer
se o mês está guardado.
**Tamanho:** uma sessão.
**Origem:** crítica de 2026-10-12. Serviço pago de MEI é, antes de tudo, um **calendário de
obrigações com estado**: "setembro: feito", "outubro: vence dia 20". O Rende monta o papel e
esquece: não sabe se ela imprimiu, e se ela corrigir uma venda de setembro em novembro, o
relatório que ela assinou e o que a tela mostra passam a discordar em silêncio.
**Depende de:** 150 (`fiscal/mei`).
**Aprovações pedidas:** (1) **schema aditivo**: `DadosMei.guardados?: Record<CompetenciaMensal,
{ em: Timestamp; total: Centavos; comNota: Centavos; atividade: AtividadeMei }>`; (2) o texto.
**Decisões a registrar:** `#d360`.

---

## Problema

1. **Sem prazo na tela.** O relatório de setembro vence em 20 de outubro e nada diz isso. No
   lugar, o seletor de mês do Caixa oferece "Voltar para outubro de 2026" (print 1 e 2): o mês cujo
   relatório ainda nem pode ser feito.
2. **Sem fim.** Imprimir não muda nada. Em março ela não sabe quais meses fez.
3. **O papel assinado diverge do sistema.** O relatório é calculado na leitura; arquivar ou
   corrigir uma venda antiga muda o total de um mês já assinado.
4. **R$ 2.201,50 sem origem.** "O sistema nunca esconde como chegou no número" (PRODUCT.md). A
   tela não diz quantas vendas somou nem leva a elas.

---

## O que esta spec decide: `#d360`

### O prazo no lugar do "Voltar para"

- `SeletorMes` ganha `rodape?: ReactNode`, que substitui o "Voltar para {mês}" quando passado. O
  Caixa não muda.
- No relatório, o rodapé é o estado do mês, uma linha `label` centrada sob o mês:
  - mês corrente: "Ainda aberto. Fica pronto em 1º de novembro." (`--ink-muted`, sem ícone)
  - mês anterior, dia 1 a 20, não guardado: "Vence em 20 de outubro · faltam 8 dias". A partir de
    5 dias, `TriangleAlert` em `--attention` antes da frase. Nunca vermelho.
  - passou do dia 20, não guardado: "Era até 20 de outubro. Ainda vale fazer e guardar." Sem
    ícone: atraso no relatório não tem multa, e a marca não é alarmista. **Conferir no portal no
    dia** que segue sem multa; se mudou, a frase muda e vai para o `#d360`.
  - guardado: `CheckCheck` em `--positive` e "Guardado em 14 de outubro".
- `prazoDoRelatorio(competencia, hojeISO, guardado?)` em `domain/mei.ts`, puro, devolve o estado e
  a data; a tela só escolhe a frase.

### "Guardei"

- Depois de imprimir (`afterprint`) e também por toque direto, abaixo do botão primário, um
  secundário **"Já imprimi e guardei"**. O âmbar continua no "Imprimir": um por tela.
- Grava em `fiscal/mei.guardados[competencia]` o que estava no papel: `total` (X), `comNota`,
  `atividade`, `em: Timestamp.now()`. Tocar de novo regrava (ela reimprimiu).
- **Desfazer** na própria linha de estado por 10 segundos ("Guardado · Desfazer"), sem modal.

### Quando o mês muda depois

- Guardado e o total ao vivo diferente: faixa de atenção acima do papel, com o triângulo:
  "Mudou depois que você guardou: era R$ 2.201,50, agora R$ 2.251,50. Imprima de novo e troque a
  folha." O estado volta a "não guardado" até ela guardar de novo; o valor antigo continua no
  documento até lá.
- Comparação em centavos, `total` e `comNota`; atividade diferente também conta.

### De onde veio o número

- Abaixo do resumo (linha de "Antes de imprimir"): "Somado de 31 vendas de 1 a 30 de setembro ·
  Ver no Caixa". O link abre o Caixa no mês (o mês do Caixa é estado da tela hoje; **conferir no
  dia** se aceita `?mes=AAAA-MM`; se não, aceitar é parte desta spec, e o filtro por categoria não).
- `relatorioMei` passa a devolver `vendasContadas: number`.

### O pé do Caixa

- O link terciário de hoje ganha o estado: "Relatório do MEI de setembro · vence dia 20" ou
  "Relatório do MEI de setembro · guardado" com o `CheckCheck`. Mês guardado e depois mudado:
  "· mudou depois de guardado", com o triângulo.

---

## Testes

- `prazoDoRelatorio`: corrente, anterior dia 1, dia 15 (atenção), dia 21, guardado, guardado e
  mudado; dezembro vira janeiro do ano seguinte.
- `relatorioMei` conta as vendas.
- `mudouDepoisDeGuardado(guardado, relatorio, atividade)`.

## Roteiro de navegador

1. Em 12 de outubro, abrir setembro: "Vence em 20 de outubro · faltam 8 dias".
2. Imprimir, cancelar a impressão, tocar "Já imprimi e guardei": "Guardado em 12 de outubro".
3. Desfazer em até 10 segundos.
4. Guardar, arquivar uma venda de setembro no Caixa, voltar: a faixa com os dois valores.
5. Offline: guardar funciona e o selo de sincronização aparece.
6. Pé do Caixa: o estado de setembro.
7. "Ver no Caixa" abre setembro.

## Critérios de aceite

- [x] Prazo no lugar do "Voltar para" só no relatório; o Caixa igual.
- [x] "Guardei" grava o retrato, com desfazer; um âmbar na tela.
- [x] Divergência mostrada com os dois números, ícone e palavra.
- [x] Origem do número com contagem e link.
- [x] Portão; `#d360`; `ESTADO.md`; uma linha em `novidades.ts`.

## Fora de escopo

- **Aviso no celular ou por e-mail no dia 15.** A 119 tem o aviso; ligar o relatório nele é
  spec própria, depois que houver três meses guardados para medir uso (074 já adiava pelo mesmo
  motivo).
- **Guardar o PDF.** O retrato são os números; o papel é dela.
- **DAS pago ou não.** Vem do boleto, não das vendas; o Rende não sabe.
