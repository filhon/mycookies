# Spec 010 · O resumo do pedido no WhatsApp

**Tipo:** um módulo de domínio pequeno e puro, um bloco de tela, um link. Nenhum campo novo,
nenhuma rota nova, nenhum documento escrito, nenhum centavo movido.
**Tamanho:** uma sessão, e sobra tempo. Se parecer duas, alguma coisa cresceu além do que
está escrito aqui — provavelmente a lista de "e já que estamos aqui" da seção Fora de escopo.
**Origem:** relato de uso. O pedido chega pelo WhatsApp, e a confirmação do que foi pedido e
de quanto é que sai dele volta pelo WhatsApp — hoje digitada à mão, item por item, com os
números copiados da tela para o teclado. É a segunda coisa que a operação real devolveu,
depois da 009.
**Depende de:** nada. Não encosta em mutação nenhuma, não muda nenhuma função que já existe
(exceto uma linha em `rotuloAgenda`, e ela fica idêntica), e por isso roda antes ou depois da
**5B** sem mexer no risco dela.
**Aprovações pedidas:** o texto da mensagem, que é a única coisa desta spec que a cliente da
Maynara vai ler. Estão ao fim.

---

## Problema

O pedido nasce numa conversa. A cliente manda áudio, manda foto do Pinterest, pergunta se dá
para sexta. A Maynara abre o app, monta o pedido, salva — e aí, para fechar, **volta ao
WhatsApp e digita de novo tudo o que acabou de digitar no app**: os itens, as quantidades, o
desconto que combinou, a taxa de entrega, o total.

Três coisas quebram nessa segunda digitação, e todas as três já aconteceram com alguém:

- **O número diverge.** O app diz R$ 240,00 e a mensagem diz R$ 238,00, porque a taxa de
  entrega entrou no app depois que a mensagem já estava escrita. A partir daí existem dois
  totais, e o que vale é o que a cliente leu.
- **A confirmação some.** A conversa desce, e quinze mensagens depois ninguém acha o que foi
  combinado. O app tem o pedido, mas o app não é onde a cliente olha.
- **Ela não manda.** Digitar o resumo inteiro no celular, com a mão suja, custa dois minutos
  que ela não tem no meio da produção — e o pedido segue sem confirmação escrita até virar
  discussão na entrega.

O sistema já tem, gravado e derivado, exatamente o texto que falta: `derivarPedido` devolve
subtotal, desconto, entrega e total; `ItemPedido` carrega o nome e a quantidade congelados;
`Pedido.codigo` é a identidade que ela lê em voz alta. **A informação existe, e o que não
existe é o caminho dela até a conversa.**

---

## O que esta spec decide antes de qualquer código

São três decisões. Cada uma vira um `D` em `DECISOES.md`: `#d77`, `#d78` e `#d79`.

### 1. O canal é um link, e não uma integração

`https://wa.me/<telefone>?text=<texto>` é o click-to-chat oficial do WhatsApp. No celular ele
abre o aplicativo, na conversa daquela pessoa, com a mensagem escrita e **não enviada**; no
desktop ele abre o WhatsApp Web ou o aplicativo instalado. Não tem chave, não tem cadastro,
não tem custo por mensagem, não tem servidor no meio e não tem aprovação de template.

A alternativa séria seria a Cloud API do WhatsApp Business: ela envia de verdade, sem a
pessoa apertar o botão, e em troca pede número comercial verificado, template aprovado, um
servidor para guardar o token e uma conta que se cobra por conversa. **Não é o problema
desta spec.** O problema é uma pessoa que já está na conversa e precisa parar de digitar duas
vezes.

Duas consequências desta escolha ficam registradas de propósito:

- **A mensagem nunca sai sozinha.** O link escreve; quem envia é ela, com o polegar, depois
  de ler. O sistema não ganha a capacidade de falar com cliente nenhuma sem ela ver.
- **Sem rede, o link não abre.** É a única tela do sistema que depende de rede sem ter um
  aviso próprio, e depende porque mandar mensagem já dependia: não existe WhatsApp offline.

**Também não é `navigator.share`.** A API de compartilhar abre a bandeja do sistema e faz a
Maynara escolher a conversa de novo, à mão, entre todas — e não existe em navegador de
desktop, que é onde ela fecha a semana. O pedido já sabe o telefone da cliente. Um link que
cai na conversa certa é melhor do que uma bandeja que pergunta.

`ponytail:` a URL carrega o texto inteiro, e URL tem teto prático (~2000 caracteres). Um
pedido de 30 linhas passa longe disso; se um dia encostar, o corte é listar os itens e
resumir o resto, não trocar de canal.

### 2. A mensagem é o que está na tela, e não o que está gravado

O bloco só aparece em pedido que já existe — pedido novo não tem código, e um resumo sem
código não é um pedido, é uma proposta. Mas o texto é montado a partir dos **valores atuais
do formulário**, os mesmos que desenham o rodapé de totais, e não a partir do documento
gravado.

É a escolha menos óbvia desta spec, e o motivo é que o contrário mente mais. Se ela corrige a
quantidade e manda o resumo antes de salvar, a versão "do documento" mandaria para a cliente
um número que **ninguém está vendo**, contradizendo o total que está preso ao pé da tela
naquele instante. A versão "da tela" manda o que ela leu antes de tocar no botão.

O custo aceito é o simétrico: a cliente pode receber um resumo que ainda não foi salvo. O
Salvar está no cabeçalho fixo, a dois centímetros, e o pedido não salvo continua sendo o
problema que ele já era antes desta spec.

`ponytail:` se isso morder de verdade, o conserto é salvar antes de abrir o link (o botão
vira ação assíncrona e o link abre depois do `await`). Não está aqui porque transforma um
`<a>` de zero linhas de JavaScript numa ação que pode falhar, e falhar em cima de um popup
que o navegador já pode ter bloqueado.

### 3. A mensagem confirma o combinado, e não abre a contabilidade

O que vai no texto é o que a cliente precisa conferir: quem, o quê, quanto, quando, como
paga. O que não vai é tudo que é da Maynara — custo, lucro, taxa da maquininha, custo por
unidade.

`Pedido.observacoes` **fica de fora**, e é a exclusão que merece explicação. O campo se chama
"Observações" e o rótulo dele diz "o que você vai querer lembrar na hora de produzir e de
embalar": é um bloco de anotação dela, e o placeholder mistura as duas naturezas ("Sem nozes.
Laço vinho. Entregar depois das 18h."). Um campo cujo conteúdo é metade recado da cliente e
metade recado para si mesma não pode ser reenviado inteiro para a cliente. O dia em que isso
fizer falta, o conserto é um segundo campo com dono declarado, e não relaxar este.

---

## Escopo

### O módulo novo: `src/lib/domain/whatsapp.ts`

Puro, sem Firebase, sem React. É aqui que mora tudo o que pode dar errado, e por isso é aqui
que o teste chega — `npm test` cobre `src/lib/domain/` e mais nada.

```ts
/** Só dígitos, com DDI. '(11) 90000-0000' → '5511900000000'. */
export function telefoneParaWhatsApp(telefone?: string): string | null;

/** wa.me com o texto embutido. Sem telefone, o WhatsApp pergunta para quem. */
export function linkDoWhatsApp(
  telefone: string | undefined,
  texto: string,
): string;

/** O resumo do pedido, pronto para colar na conversa. */
export function mensagemDoPedido(resumo: ResumoParaCliente): string;
```

`telefoneParaWhatsApp` é uma normalização com regras nomeadas, e cada uma é um teste:

| Entrada               | Saída           | Regra                                            |
| --------------------- | --------------- | ------------------------------------------------ |
| `(11) 90000-0000`     | `5511900000000` | 11 dígitos é celular com DDD: prefixa `55`       |
| `11 3000-0000`        | `551130000000`  | 10 dígitos é fixo com DDD: prefixa `55`          |
| `011 90000-0000`      | `5511900000000` | zero de operadora antes do DDD sai               |
| `+55 (11) 90000-0000` | `5511900000000` | já veio com DDI: fica como está                  |
| `90000-0000`          | `null`          | 9 dígitos é telefone sem DDD: não dá para discar |
| `""` / ausente        | `null`          | não há número                                    |

`linkDoWhatsApp` é uma linha e meia: `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`,
e sem telefone `https://wa.me/?text=…`.

`ResumoParaCliente` é uma interface explícita, e **não** o tipo `Pedido`: o que a tela tem na
mão enquanto ela digita não é um documento gravado (decisão 2).

```ts
export interface ResumoParaCliente {
  negocio: string;
  codigo: string;
  clienteNome: string;
  itens: {
    quantidade: number;
    nomeSnapshot: string;
    precoUnitario: Centavos;
  }[];
  subtotal: Centavos;
  desconto: Centavos;
  taxaEntrega: Centavos;
  total: Centavos;
  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    dataISO: DataISO;
    endereco?: string;
  };
  /** O nome da forma escolhida, quando houver. */
  formaNome?: string;
  pago: boolean;
}
```

O subtotal de cada linha **não** é parâmetro: `mensagemDoPedido` chama `subtotalDoItem`, a
mesma função de `pedido.ts` que o rodapé usa. Passar o número pronto seria abrir a porta para
a mensagem discordar da tela em uma linha — que é exatamente o defeito que esta spec conserta.

Duas coisas saem de `pedido.ts` para isso: `quantidadeEmTexto` vira exportada (é a vírgula
decimal de "1,5 × Cookie"), e nada mais muda lá.

### O texto

```
*MyCookie's* · pedido P-260915-K3F

Oi, Ana! Fechamos assim:

• 20 × Cookie tradicional — R$ 138,00
• 2 × Caixa com 6 — R$ 99,80

Subtotal: R$ 237,80
Desconto: −R$ 7,80
Entrega: R$ 10,00
*Total: R$ 240,00*

Entrega em terça-feira, 15 de setembro — Rua das Acácias, 120
Pagamento: Cartão de crédito

Qualquer ajuste é só me chamar.
```

As regras que o texto obedece, e que o teste interroga uma a uma:

- **Zero é ausência**, a mesma regra do painel financeiro: sem desconto, a linha de desconto
  não existe. Sem taxa de entrega, idem. Uma linha "Desconto: R$ 0,00" é ruído que faz a
  cliente procurar um desconto que não houve.
- **`RETIRADA` troca o verbo:** "Retirada em terça-feira, 15 de setembro", sem endereço.
- **O endereço só entra em `ENTREGA`, e só se houver.**
- **`Pagamento:` só aparece com forma escolhida.** É o nome da forma, e nunca a taxa dela.
- **Pago acrescenta uma linha própria** — "Já está pago. Obrigada!" —, e não altera nenhuma
  outra. Duas linhas independentes valem mais que uma linha com dois casos dentro.
- **O cumprimento usa o primeiro nome.** Nome vazio (que o schema já não deixa gravar) cai
  para "Oi! Fechamos assim:".
- **Dois negritos, e só dois:** o nome do negócio e o total. `*asterisco*` é a marcação do
  WhatsApp; onde ela não for interpretada, sobram dois pares de asteriscos e nada quebra.
- **Nenhum emoji.** A voz do sistema é a mesma da confeitaria, e ela não é a de um chatbot.

A data por extenso vem de `datas.ts`, que já tem o formatador (`DIA_POR_EXTENSO`) e não o
expõe: nasce `rotuloDiaPorExtenso(iso)` → `'terça-feira, 15 de setembro'`, e `rotuloAgenda`
passa a ser a capitalização dela. O corpo de `rotuloAgenda` não muda de resultado em nenhum
caso, e o teste que já existe para ela é a prova disso.

### O bloco: `src/components/pedidos/BlocoWhatsApp.tsx`

Um `Bloco` como os outros, com o ícone `MessageCircle` (o lucide não tem marca do WhatsApp, e
uma marca desenhada à mão dentro do nosso ícone seria pior que um balão genérico).

- **Título:** "Mandar o resumo pra cliente".
- **Descrição:** "Abre o WhatsApp com o pedido escrito. Você confere e envia — nada sai daqui
  sozinho."
- **A ação é um `<a>`**, com `classesBotao({ variante: "primaria", tamanho: "lg" })`,
  `target="_blank"` e `rel="noopener noreferrer"`. Link, e não botão: sem JavaScript, sem
  `window.open` para o navegador bloquear, com toque longo e menu de contexto funcionando
  como a pessoa espera. O `classesBotao` existe exatamente para isso.
- **Uma linha embaixo diz para onde vai:** "Abre a conversa com (11) 90000-0000." Sem
  telefone no pedido: "Este pedido não tem telefone. O WhatsApp vai perguntar para quem
  mandar."
- **Sem itens, o link não aparece** e sobra a frase: "Adicione o que ela pediu — o resumo
  precisa ter o que confirmar."

Vai em [FormularioPedido.tsx](../../src/components/pedidos/FormularioPedido.tsx), dentro do
`{pedido && …}` que hoje abre o `BlocoPagamento`, **logo acima dele**. É a ordem em que as
coisas acontecem: monta, salva, confirma com a cliente, e depois recebe.

---

## Caso de aceite

O mesmo pedido da spec 003, número por número: 20 cookies a R$ 6,90, 2 caixas a R$ 49,90,
R$ 7,80 de desconto, R$ 10,00 de entrega, crédito, entrega em 15/09/2026 na Rua das Acácias, 120. O teste compara a **string inteira**, e ela é a que está escrita na seção "O texto"
acima.

Casos que acompanham, cada um mudando uma coisa só:

1. **Sem desconto e sem entrega:** as duas linhas somem, e Subtotal continua aparecendo.
2. **`RETIRADA`:** "Retirada em terça-feira, 15 de setembro", sem endereço, mesmo que o campo
   de endereço tenha texto.
3. **Sem forma de pagamento:** a linha "Pagamento:" some, e nada mais muda.
4. **Pedido pago:** ganha "Já está pago. Obrigada!" e mantém a linha da forma.
5. **Quantidade fracionada:** `1,5 × Bolo de pote` — vírgula, e não ponto.
6. **Nome composto:** "Ana Beatriz" vira "Oi, Ana!".
7. **Os seis casos de `telefoneParaWhatsApp`** da tabela acima.
8. **`linkDoWhatsApp`** com e sem telefone, e a quebra de linha viajando como `%0A`.

> **Cuidado que já custou tempo em outro projeto:** `formatarMoeda` devolve `R$ 138,00` com
> **espaço fino não-quebrável** (U+00A0) entre o símbolo e o número, porque é o que o `Intl`
> em pt-BR produz. A expectativa do teste precisa ser montada com `formatarMoeda`, e não
> digitada à mão no arquivo de teste — um literal com espaço comum falha e o diff do vitest
> mostra duas strings visualmente idênticas.

**Não há caso de aceite de navegador que valha automatizar**, mas há um roteiro curto que só
o aparelho responde:

1. Abrir um pedido salvo no celular, tocar em "Mandar o resumo pra cliente".
2. **O WhatsApp abre no aplicativo**, na conversa daquela cliente, com o texto escrito e
   nenhuma mensagem enviada.
3. Conferir que os negritos aparecem em negrito e que os acentos não viraram `%C3%A7`.
4. Voltar para o app com o botão físico: o pedido continua onde estava, com o que ela digitou.
5. Repetir num pedido sem telefone: o WhatsApp abre pedindo o destinatário.
6. Repetir no desktop: abre o WhatsApp Web em outra aba, e a aba do app fica de pé.

---

## Fora de escopo

- **API oficial do WhatsApp**, envio automático, template aprovado, número comercial. Decisão
  1 diz o porquê.
- **Mandar por outro canal** — SMS, e-mail, copiar para a área de transferência. Uma pessoa,
  um canal, e o canal já está escolhido pela cliente.
- **Botão na lista de pedidos** e na agenda da tela Hoje. O resumo se manda depois de conferir
  o pedido, e conferir acontece dentro dele.
- **Mandar a lista de compras, a ficha ou o recibo do pagamento** pelo mesmo caminho.
  `linkDoWhatsApp` fica genérico e pronto para isso, mas nenhum segundo uso entra aqui.
- **`Pedido.observacoes` no texto.** Decisão 3.
- **Registrar que a mensagem foi mandada** (`Pedido.resumoEnviadoEm` ou coisa parecida). Seria
  campo novo para gravar uma intenção: o link não devolve se ela apertou enviar, e um campo
  que diz "enviado" quando a pessoa só abriu e desistiu é pior do que campo nenhum.
- **Aviso de "sem rede"** no bloco. Decisão 1.
- **Qualquer mudança em mutação, schema, regra ou índice.** Zero. Se `src/lib/firebase/`
  aparecer no `git diff` desta sessão, ela saiu do escopo.

---

## Decisões desta spec que são fáceis de rejeitar

- **Montar o texto do formulário, e não do documento salvo.** Quem achar que só se manda o
  que está gravado tem um argumento real, e o conserto está escrito na decisão 2.
- **Deixar as observações de fora.** É informação que às vezes a cliente quer confirmar
  ("sem nozes"). O contra-argumento é que o mesmo campo guarda recado interno, e não há como
  separar os dois depois de escritos.
- **`wa.me` em vez de `navigator.share`.** Perde-se a bandeja nativa e o "compartilhar em
  qualquer app". Ganha-se cair na conversa certa, e funcionar no computador.

---

## Riscos

- **O número da cliente pode não estar em formato discável.** É o risco número um desta spec,
  porque `clienteTelefone` é campo livre e ninguém validou nada até hoje. A tabela de
  normalização cobre o que se digita no Brasil; o que ela não cobre cai em `null`, e `null`
  abre o WhatsApp perguntando o destinatário — degradação, e não erro.
- **O texto pode ficar errado em um caso que ninguém testou**, e o erro vai direto para a
  cliente sem passar por ninguém. É por isso que o caso de aceite compara a string inteira, e
  não pedaços dela.
- **`wa.me` é domínio de terceiro.** Se o WhatsApp mudar o formato do link, o botão quebra em
  silêncio. É link público e estável há anos, e o conserto seria de uma linha.
- **Aplicativo instalado abrindo link externo.** Num PWA em modo `standalone`, o
  `target="_blank"` sai para fora do app. É o comportamento desejado — o destino é outro
  aplicativo —, mas vale conferir no roteiro que voltar não recarrega a tela e não perde o
  que ela digitou.

---

## Aprovações pedidas

1. **O texto da mensagem, palavra por palavra.** É a única coisa que este projeto já produziu
   que outra pessoa vai ler sem a Maynara junto. O bloco "O texto" acima é a versão a
   aprovar, e mudá-la depois custa uma linha de código e uma linha de teste.
2. **Um domínio externo passa a ser alcançável a partir do app** (`wa.me`). Sem chave, sem
   dado enviado a servidor nenhum: o texto viaja na URL, no aparelho dela, para o aplicativo
   que ela já usa.
3. **`rotuloAgenda` passa a chamar uma função nova em vez de formatar direto.** Comportamento
   idêntico, coberto pelo teste que já existe — está listado porque é edição em código que
   funciona hoje.

Nada de schema muda, nenhuma regra de segurança muda, nenhum índice novo é preciso e nenhuma
dependência entra.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com **o número
de testes crescendo** (são cerca de doze casos novos, em `tests/domain/whatsapp.test.ts`).
Depois: `docs/ESTADO.md` atualizado e `#d77`, `#d78` e `#d79` registrados em
`docs/DECISOES.md`.

O roteiro de aparelho fecha o que o teste não alcança — que o link de fato abre o aplicativo
certo, na conversa certa. Ele é curto de propósito: seis passos que cabem entre duas fornadas.
