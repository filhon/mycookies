# Spec 005 · Prontidão para o primeiro uso

**Tipo:** conserto e verificação. Nenhuma funcionalidade nova.
**Tamanho:** duas sessões — `5A` conserto, `5B` verificação —, com `5C` reservada para o
que a 5B achar e não couber nela.
**Decisões que originam:** `DECISOES.md#d17` e `#d13`, mais a dívida mais antiga de
`ESTADO.md`.

## Problema

Todas as specs escritas estão executadas e o portão de conclusão passa: lint limpo,
typecheck limpo nos dois projetos, 228 testes, build com 13 rotas estáticas mais
`/fichas/[id]` e `/pedidos/[id]`. Mesmo assim o sistema não está pronto para a Maynara
abrir na segunda-feira, por dois motivos de naturezas diferentes.

**O primeiro é um defeito, e ele sozinho impede o primeiro uso.** Uma conta nova não
consegue salvar a configuração. `TelaConfiguracao` semeia o formulário com
`CONFIGURACAO_SUGERIDA` e semeia a base de comparação com a assinatura desse mesmo
formulário ([`TelaConfiguracao.tsx:169-173`](../../src/components/configuracao/TelaConfiguracao.tsx#L169-L173)),
então `alterado` nasce falso. No desktop o botão Salvar nasce `disabled`
([linha 283](../../src/components/configuracao/TelaConfiguracao.tsx#L283)); no celular a
barra de salvar é condicionada a `alterado` e **nem chega a existir**
([linha 579](../../src/components/configuracao/TelaConfiguracao.tsx#L579)). Quem nunca
salvou só consegue aceitar a sugestão alterando um campo e desalterando-o.

O raio disso é o sistema inteiro, porque `configuracao/geral` é o documento do qual todos
os outros módulos dependem — e cada um deles degrada com um aviso que aponta para a tela
que não salva:

| Sem o documento                                                                      | Efeito                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [`FormularioFicha.tsx:306`](../../src/components/fichas/FormularioFicha.tsx#L306)    | Rateio zerado: o custo da ficha ignora hora, energia, gás e despesa fixa |
| [`FormularioPedido.tsx:150`](../../src/components/pedidos/FormularioPedido.tsx#L150) | `formasPagamento` vazio: não há como escolher Pix ou crédito no pedido   |
| [`TelaFinanceiro.tsx:90`](../../src/components/financeiro/TelaFinanceiro.tsx#L90)    | O lançamento do caixa não tem forma de pagamento, e `custoTaxa` é zero   |

Precificar errado, pedido sem forma de pagamento e caixa sem taxa de maquininha são as
três coisas que este projeto existe para acertar. O aviso "cadastrar agora" leva a um beco
sem saída, o que é pior do que não avisar.

**O segundo é ausência de prova, e não um defeito conhecido.** O que foi verificado até
aqui é a aritmética pura, por 228 testes sobre `src/lib/domain/`, mais uma rodada de
capturas de desktop no tema **escuro**. Ficam sem resposta:

- **O tema claro**, que é o padrão do sistema por `DECISOES.md#d13` e a decisão de design
  mais deliberada do projeto — nunca foi fotografado.
- **O celular inteiro.** Os contextos 1 e 2 do `PRODUCT.md` são a bancada e o mercado, os
  dois no telefone. É onde moram a navegação inferior, os três rodapés fixos, o gráfico de
  31 barras em 360px e o teclado cobrindo campo.
- **Nenhum número jamais saiu de um teclado, passou pelo Firestore e voltou.** O vitest
  cobre a conta, não o caminho até o banco. Os deltas de agregado, os índices publicados e
  as regras de segurança nunca foram exercidos por um cliente de verdade.

---

# Sessão 5A · O que impede o primeiro uso

## Escopo

Três itens. Nenhum deles muda schema, regra de segurança ou dependência de produção — o
terceiro **remove** uma.

### 1. A configuração precisa poder ser salva na primeira vez

A causa é a base de comparação, e não o botão. Hoje a ausência do documento é semeada como
se fosse um documento igual à sugestão, e "não alterado" passa a significar duas coisas
diferentes: "salvo e igual" e "nunca salvo". São estados distintos e precisam de
representações distintas.

**Quando não há documento, a base é a ausência.** `base` passa a ser `string | null`, com
`null` significando "esta conta nunca salvou": não existe assinatura que se compare a
ausência, então `alterado` nasce verdadeiro e ambos os caminhos de salvar ficam vivos.

```ts
const [base, setBase] = useState<string | null>(null);

if (estado === null && !carregando && !erro) {
  const inicial = estadoInicial(dado, conta?.nome);
  setEstado(inicial);
  setBase(dado ? assinatura(inicial) : null);
}

const nuncaSalvou = base === null;
const alterado = nuncaSalvou || assinatura(estado) !== base;
```

`salvar()` já faz `setBase(assinatura(estado))` no sucesso, então o estado sai de "nunca
salvou" pelo caminho que já existe. A primeira leitura seguinte não ressemeia nada, porque
a guarda continua sendo `estado === null`.

**A frase de status precisa de um terceiro estado, senão o conserto vira mentira.** Com a
base em ausência, a tela abriria dizendo "Você mudou coisas que ainda não foram salvas"
para quem não mudou nada. São três casos:

| Estado                     | Frase da tela                                                |
| -------------------------- | ------------------------------------------------------------ |
| `nuncaSalvou`              | "Estes são valores sugeridos. Confira e salve para começar." |
| `alterado && !nuncaSalvou` | "Você mudou coisas que ainda não foram salvas."              |
| `salvo`                    | "Tudo salvo."                                                |

A barra fixa do celular acompanha: `"Valores sugeridos, ainda não salvos"` no primeiro
caso, e o texto de hoje nos demais. É a diferença entre o sistema dizer "você fez algo" e
dizer "eu sugeri algo" — e é a versão em tela de `DECISOES.md#d17`, que decidiu que
sugestão não é dado.

**Efeito de segunda ordem, do mesmo bloco de semeadura, a resolver junto.** `estadoInicial`
lê `conta?.nome` para `nomeNegocio`, mas a semeadura dispara quando a assinatura da
_configuração_ chega, e o documento da conta é outra assinatura que pode não ter chegado
(`AuthProvider` expõe `conta: null` até a primeira leitura). Numa conta nova o resultado é
`nomeNegocio: ""`, que `paraDados` então omite da escrita. Não corrompe nada — o campo é
espelho de `contas/{id}.nome` e ninguém o lê, o que já está registrado como dívida —, mas
o conserto é a mesma linha: semear só quando as duas leituras chegaram, ou reler o nome no
salvamento. **Não** transformar isso em tarefa de espelho de nome: o campo continua sem
leitor, e a dívida continua registrada.

### 2. O ícone que o iPhone precisa

`public/icons/` tem um arquivo só, `icone-maskable.svg`, e `manifest.ts` aponta as duas
entradas para ele. `layout.tsx` declara `appleWebApp.capable: true` sem nenhum
`apple-touch-icon`, e **o Safari não lê SVG nesse papel**: instalado na tela de início do
iPhone, o app ganha uma miniatura da página em vez de ícone. É a primeira coisa que ela vê,
todo dia, antes de abrir.

- `src/app/apple-icon.png`, 180×180, que o App Router publica como `apple-touch-icon`.
- `public/icons/icone-192.png` e `icone-512.png`, acrescentados às entradas de
  `manifest.ts`, com o SVG mantido em `purpose: "maskable"`. Android já instala com SVG; o
  PNG é o que garante o resultado igual nos dois sistemas.

Os três saem do SVG existente, rasterizados uma vez e versionados. **Nenhuma dependência de
produção entra por causa disso** — rasterizar é trabalho de uma vez, e não do build.

### 3. Carona: `@hookform/resolvers` sai do `package.json`

Está em `dependencies` e não é importado em lugar nenhum (`react-hook-form` é usado, o
resolver não): a validação é `esquema.safeParse` em toda tela, e `DECISOES.md#d22`
registrou por que continua sendo. É peso morto no pacote de um app que precisa abrir
offline na bancada. Remover dependência não usada não pede aprovação; adicionar pediria.

Sai também a linha correspondente da tabela de dívidas de `ESTADO.md`.

## Critérios de aceite 5A

- [ ] Numa conta sem `configuracao/geral`, a tela abre com o botão Salvar **habilitado** no
      desktop e com a barra de salvar **visível** no celular.
- [ ] O primeiro toque em Salvar grava o documento em uma escrita só, sem que nenhum campo
      precise ser alterado antes — o critério da 2A que a 4ª sessão nunca exerceu.
- [ ] Antes do primeiro salvamento a tela diz que aqueles são valores sugeridos, e não que
      a usuária mudou algo.
- [ ] Depois de salvar, a frase vira "Tudo salvo" e o botão volta a ficar desabilitado até
      haver alteração de verdade.
- [ ] Reabrir a tela mostra o que foi salvo, com o botão desabilitado.
- [ ] `apple-touch-icon` de 180×180 servido em PNG, e o manifesto lista PNG de 192 e 512
      além do SVG maskable.
- [ ] `@hookform/resolvers` fora do `package.json`, com build passando.
- [ ] Portão de conclusão passando: lint, typecheck, test, build.

---

# Sessão 5B · A verificação em navegador

Não há código previsto nesta sessão. Há um roteiro, e o produto dela é a resposta: o que
funciona, o que não funciona, e com que número.

## Como rodar

`npm run dev`. Os índices estão todos publicados e confirmados por
`firebase firestore:indexes`, então não há passo de infraestrutura antes.

**Cada tela é vista duas vezes: no tema claro, que é o padrão, e em 360px de largura.** O
tema escuro já foi conferido no desktop e não precisa de segunda rodada.

## O roteiro, em ordem

A ordem importa: cada passo constrói o estado que o seguinte consome, e os números dos
casos de aceite das specs 002, 003 e 004 se encaixam num único sistema se forem digitados
nesta sequência. Um passo que não bater interrompe o roteiro — não adianta seguir sobre
dado errado.

1. **Conta nova, `/configuracao`.** Aceitar a sugestão e salvar sem alterar nada. É o
   conserto da 5A e, ao mesmo tempo, a primeira escrita que um cliente real faz — é aqui
   que `firestore.rules` deixa de ser regra publicada e nunca exercida.
2. **`/insumos`.** Cadastrar os insumos do caso de aceite da 3C: farinha, chocolate,
   manteiga, a caixa e o saquinho, com preço, tamanho de pacote, perda e estoque. Conferir
   que gravam em `contas/mycookies/insumos`, e a saudação da tela Hoje vindo de
   `conta.proprietaria`.
3. **`/fichas` — o cookie.** O caso de aceite da 2B, digitado como está: custo de
   **R$ 4,41** e preço de **R$ 6,90**. O bloco "O custo do lote" precisa prestar contas das
   parcelas que somam esse custo.
4. **Um kit que consome essa ficha** — a caixa de 6 —, para exercer `#d11` e `#d41`.
5. **Mudar o preço da farinha em `/insumos`.** O selo de custo desatualizado precisa
   aparecer na ficha do cookie (`#d05`), e é a primeira consulta `array-contains` real.
6. **`/pedidos` — o caso de aceite da 3A.** 20 cookies e 2 caixas de 6, R$ 7,80 de
   desconto, R$ 10,00 de entrega, no crédito: total de **R$ 240,00** e sobra de
   **R$ 75,82**, com a frase dizendo que R$ 10,00 dela são a entrega (`#d33`). Subir para
   24 cookies: **R$ 267,60** e **R$ 84,41**.
7. **Mudar o preço da ficha com o orçamento montado.** O selo "hoje esta ficha sai por"
   aparece, "usar o preço de hoje" mexe no total, e ao confirmar o pedido o selo some
   (`#d32`).
8. **`/compras`, com o pedido confirmado.** A tabela inteira do caso de aceite da 3C:
   farinha 1 pacote / R$ 12,50, chocolate 1 / R$ 40,00, manteiga 1 / R$ 17,50, caixa 1 /
   R$ 50,00, o saquinho no bloco "não precisa comprar", rodapé em **R$ 120,00**.
9. **Marcar itens com a rede desligada.** É o cenário que `#d40` existe para resolver:
   marca no toque, nenhum botão preso em "salvando", selo de sincronização contando a
   verdade. Religar e ver subir.
10. **Corrigir o preço da farinha pela lista.** Rodapé e custo da linha se refazem na hora,
    o insumo muda em `/insumos`, e a ficha ganha o selo de custo desatualizado.
11. **Confirmar outro orçamento do período e tocar em Refazer.** O item novo entra e o que
    estava marcado continua marcado. Depois **fechar a lista e montar outra**: a nova nasce
    sem nenhuma marca (`#d39`).
12. **`/financeiro` — as cinco linhas da spec 004 em 2026-09.** Sobra de **R$ 118,11** e
    maquininha de **R$ 6,89**. Editar a venda 1 para R$ 150,00 e arquivar a internet, vendo
    o painel acompanhar.
13. **"Recalcular o mês" logo em seguida precisa devolver exatamente os mesmos números.**
    Se devolver outros, um delta está errado entre a tela e a escrita, e agora são dois
    escritores (`#d23`, `#d37`).
14. **Marcar o pedido como pago em 15/09.** Entradas de **R$ 485,00**, maquininha de
    **R$ 18,87**, sobra de **R$ 346,13**, 1 pedido, ticket médio de **R$ 240,00**, custo do
    que você vendeu **R$ 152,20**, e o ranking com o cookie (R$ 138,00 / sobram R$ 49,80)
    na frente da caixa (R$ 99,80 / sobram R$ 35,80).
15. **Recalcular de novo: os mesmos números.** É o critério que decide se o agregado é
    confiável.
16. **Definir a meta de 2026-09 com alvo de R$ 3.000,00.** 435 doces no mês, 102 por semana
    e 13 pedidos (`#d38`). O cartão da tela Hoje precisa dizer o mesmo número de doces por
    semana que o painel, lendo só o agregado.
17. **Desfazer o pagamento** e ver cada número voltar, com o lançamento arquivado e não
    apagado. Recalcular limpa o produto que sobrou zerado (`#d37`).
18. **Editar um pedido já pago** para 24 cookies: o lançamento do caixa vira R$ 267,60 sem
    que nasça um segundo.
19. **Pagar em outubro um pedido entregue em setembro.** O dinheiro cai em outubro nos dois
    lados e o pedido continua na agenda de setembro (`#d36`).
20. **A faixa de "a receber" em `/pedidos`**, com um pedido entregue e não pago: fora do
    resultado do mês, dentro da faixa.
21. **Cancelar um pedido pago.** A tela desfaz o pagamento antes de cancelar; invertida a
    ordem, a mutação recusa com uma frase (`#d34`).
22. **Editar um lançamento de setembro para outubro.** O espelho da meta de outubro fica
    atrasado até a próxima escrita naquele mês — é o limite conhecido de `#d29`. Ver o
    efeito uma vez e confirmar que "Recalcular o mês" em outubro conserta.
23. **Arquivar a ficha do cookie e reabrir `/compras`.** O bloco "Isto ficou fora da conta"
    aparece com o nome dela, e o resto da lista continua somando.
24. **`/fichas/[id]` sem rede, numa ficha nunca aberta.** É rota dinâmica, e o
    `defaultCache` do Serwist só guarda navegação já visitada: o esperado é cair em
    `/offline`, e o que se verifica é se essa queda é legível.

## O que se confere em toda tela, nas duas passagens

- **Tema claro.** Contraste de texto e de borda, o vinho da marca sobre fundo claro, e o
  vermelho de negativo continuando distinguível dele — que é a invariante de cor nunca ser
  o único portador de significado.
- **360px.** Alvo de toque de 44×44px, ação primária de 52px, nada de rolagem horizontal, e
  a navegação inferior não cobrindo o último bloco.
- **Os três rodapés fixos** — painel de preço da ficha, totais do pedido, total de compras.
  Precisam de captura de viewport com dado dentro, e a pergunta é se o teclado os cobre na
  hora de digitar preço e desconto.
- **O gráfico de 31 barras.** São ~9px por dia em 360px: é onde ele quebra, se quebrar
  (`#d25`).
- **Os cinco painéis** — insumo, transação, meta, cliente e forma de pagamento — como folha
  inferior no celular, com o respiro do `rodape-seguro` valendo sobre o inset do aparelho.

## Critérios de aceite 5B

- [ ] Todo número em negrito no roteiro conferido na tela, e não no teste.
- [ ] "Recalcular o mês" devolvendo os mesmos números nas duas vezes em que é pedido.
- [ ] Toda tela vista no tema claro e em 360px, com captura arquivada de cada uma.
- [ ] Nenhuma escrita negada pelas regras, e nenhuma consulta faltando índice.
- [ ] `ESTADO.md` atualizado com o resultado real, item por item — inclusive o que falhou.
- [ ] Toda divergência achada registrada com o número esperado e o número obtido. Conserto
      de uma ou duas linhas entra na própria 5B; o resto vira `5C`, com a spec escrita
      antes de qualquer código.

---

## Fora de escopo, nas duas sessões

Tudo que já está registrado como dívida com gatilho próprio em `ESTADO.md` e não bloqueia o
primeiro uso: tela de clientes, arquivar cliente, cadastro self-serve (`#d16`), agregados no
servidor (`#d10`), limpeza do IndexedDB no `sair()`, histórico de meta (`#d27`), recorte de
data em `/pedidos`, aviso de saída com alteração pendente nos três editores, `comprado`
virando mapa por `insumoId` (`#d40`) e movimentação automática de estoque.

Nenhuma funcionalidade nova. Nenhuma mudança de schema, de regra ou de índice. Se a 5B
achar algo que exija uma das três, isso é a `5C` e passa por aprovação antes.

## Riscos

**O risco real é a 5B achar mais do que cabe nela.** É a primeira vez que o sistema inteiro
roda contra o Firestore de verdade, e as três coisas que só ali se revelam são as mais
caras de consertar: um delta de agregado que não fecha, uma consulta sem índice, e o
celular com um rodapé fixo cobrindo o campo que ele deveria acompanhar. Por isso a 5C já
está reservada, e por isso o roteiro é ordenado — parar no passo que falhar custa menos do
que descobrir no passo 20 que o passo 3 estava errado.

**O risco baixo é a 5A.** São três mudanças pequenas em arquivos que não são consumidos por
mais ninguém, e a maior delas troca o tipo de um `useState` local.
