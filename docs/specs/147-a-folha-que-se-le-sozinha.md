# Spec 147 · A folha que se lê sozinha

**Tipo:** a folha do orçamento corrige o que os prints de 2026-10-12 mostraram: o quadrado vazio do
combo, o Pix emendado numa linha só, a data repetida, o subtotal igual ao total, a hora que não
aparece, e a folha que não sabe em que pé o pedido está. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da página `/pedidos/[id]/orcamento` sobre os prints de 2026-10-12 (celular e
desktop, pedido P-261009-6F5 da Juliana Oliveira).
**Depende de:** 017, 087, 080 (`brCodePix`), 081 (o sinal), 114 (`uqr`, já instalado).
**Aprovações pedidas:** (1) o texto novo da folha, seção 2, palavra por palavra; (2) reverter uma
linha do `#d108`/017: o quadrado vazio em `--surface-sunken` sai.
**Decisões a registrar:** `#d354` (a folha segue o status), `#d355` (o Pix na folha).

---

## Problema

O que os prints mostram, do mais grave para o menos:

1. **O quadrado vazio parece imagem quebrada.** O combo não tem foto e ganha um bloco bege de 20 mm.
   A 017 escolheu isso para não ter "cinco cookies enfileirados", mas no papel o leitor não sabe
   que é de propósito: lê como falha de impressão. É a primeira linha da folha.
2. **O Pix vira uma frase só.** "Pagamento por Pix. Beneficiária: Maynara Rocha de Castro Nu
   Pagamentos Chave Celular: (81) 98696-6176." As `instrucoes` têm quebra de linha, e o `<p>` a
   come. É o trecho que a cliente precisa copiar, e é o mais difícil de ler da folha.
3. **A folha não sabe o status.** Diz "Orçamento" num pedido confirmado, pago ou com sinal. Quem
   pede "me manda o comprovante do pedido" recebe um papel que diz que ainda é proposta, sem o que
   já foi pago e sem o que falta.
4. **A data aparece duas vezes** ("Retirada prevista: Terça-feira, 13 de outubro" no topo e
   "Retirada na terça-feira, 13 de outubro." no Combinado) e a **hora nenhuma**: `horaEntrega` está
   gravada e a folha não lê.
5. **Subtotal R$ 37,00, Total R$ 37,00.** Sem desconto e sem entrega, a linha do subtotal é ruído
   logo acima do número que decide.
6. **O nome do combo é uma frase de duas linhas** ("Combo Dupla (1 Cookie Pistache 120g + 1 Cookie
   Red Velvet 120g)"). O que tem dentro é descrição, e a coluna da descrição está vazia.
7. **No celular, o primário é imprimir.** A folha a 45% é ilegível (o corpo vira ~5 pt), e "Salvar
   em PDF" pede a explicação embaixo para ser usado. No desktop, a barra começa 115 px à esquerda
   da folha: dois eixos na mesma tela.

O que **está bom** e fica: a hierarquia do topo (negócio · código · para quem), o total como o único
bloco cheio, a foto recortada solta no papel, a assinatura sobre a linha, o "feito com Rende" como
uma linha apagada (`#d127`), a folha idêntica no tema escuro.

---

## 1 · O que esta spec decide

### A folha segue o status: `#d354`

O título e o fecho mudam com `pedido.status`; o resto da folha não.

| Status                                | Rótulo do topo                                    | Bloco de aceite                                    |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `ORCAMENTO`                           | ORÇAMENTO                                         | o de hoje: frase de aceite + "Aprovado por"        |
| `CONFIRMADO`, `EM_PRODUCAO`, `PRONTO` | PEDIDO CONFIRMADO                                 | sai a linha "Aprovado por"; fica a assinatura dela |
| `ENTREGUE`                            | PEDIDO ENTREGUE                                   | idem                                               |
| `CANCELADO`                           | a rota mostra o aviso e **não** a folha (seção 3) |                                                    |

Fora do orçamento, abaixo do total entram, só quando houver: "Sinal pago · R$ X" e "Falta pagar ·
R$ Y" (por `faltaPagar`, a mesma do acompanhamento), ou "Pago" com `Check` quando `pago`. Não é
recibo fiscal e não se chama recibo: é o pedido com o que já entrou.

### O Pix na folha: `#d355`

- Quando `pixDoPedido` (de `acompanhamento.ts`, exportada) devolve um código, o Combinado ganha o
  **QR do Pix com o valor que falta**, 28 mm, desenhado por `uqr` em SVG inline (sem PNG, sem
  rede), com "Pix de R$ Y · aponte a câmera do app do banco" ao lado. É a mesma regra do `#d320`:
  só fora do orçamento, só com o que falta, só com chave, nome e cidade.
- No orçamento, nada de QR: o valor ainda não foi confirmado. As `instrucoes` saem como ela as
  escreveu, linha por linha (`whitespace-pre-line`).

---

## 2 · A folha, bloco a bloco

- **Topo, à direita:** o rótulo da tabela acima. Sem mudança no resto.
- **"Retirada prevista" / "Entrega prevista":** a data e, com `horaEntrega`, " · às 15h" (o mesmo
  formato da agenda).
- **Linha do combo:** o nome é `nomeSnapshot` sozinho; o que tem dentro vai para a linha da
  descrição ("1 Cookie Pistache 120g + 1 Cookie Red Velvet 120g", por `resumoDasEscolhas`), antes da
  descrição da ficha, quando houver.
- **Foto do combo:** sem foto própria, as fotos das escolhas com ficha viva e foto, até duas,
  sobrepostas em 40% (a segunda à direita e atrás). Nenhuma, a célula fica **vazia, sem fundo**. O
  `bg-sunken` sai também da linha comum sem foto.
- **Totais:** "Subtotal" só aparece quando há desconto ou entrega.
- **Combinado:** a frase da retirada sai (o topo já diz). Ficam o pagamento (com as instruções em
  linhas próprias, ou o QR), o endereço quando é entrega, e a validade.
- **Status fora do orçamento:** as linhas de sinal, falta e pago abaixo do bloco do total, em
  `body`; "Pago" com `Check` e a palavra, nunca só cor.

## 3 · A tela em volta

- **A barra alinha com a folha:** mesma largura máxima e mesma margem esquerda que o papel.
- **No celular** (`< 768px`), o primário é **"Mandar pra cliente"** (`MessageCircle`), que abre o
  mesmo resumo do WhatsApp do editor, com o link do acompanhamento (`useLinkDoAcompanhamento`).
  "Salvar em PDF" vira secundário e a frase de explicação sai. No desktop, a ordem fica a de hoje.
- **Cancelado:** a rota mostra "Este pedido foi cancelado. A folha não sai de pedido cancelado."
  com "Voltar ao pedido". Uma folha de pedido cancelado circulando é o defeito.
- **Orçamento sem validade:** a barra ganha, em `--ink-muted` e sem triângulo, "Sem data de
  validade: o preço vale até você mudar." com o link "Pôr uma data" para o pedido.

---

## 4 · Escopo

- `domain/orcamento.ts`: `Orcamento` ganha `status`, `hora?`, `sinal?`, `falta`, `pago`, `pix?` e,
  por linha, `composicao?` e `fotosDasEscolhas: string[]`; `frasesDoCombinado` perde a frase da
  retirada e devolve as instruções como linhas. Testes no caso de aceite da 017, mais os casos da
  seção 5.
- `domain/acompanhamento.ts`: exportar `pixDoPedido`. Nada mais muda lá.
- `FolhaOrcamento.tsx`: o que a seção 2 descreve. Continua sem hook e sem `dark:`.
- `TelaOrcamento.tsx`: a seção 3.
- `components/comecar/novidades.ts`: uma linha.

## 5 · Testes

1. `ORCAMENTO` → rótulo "ORÇAMENTO", sem `pix`, mesmo com a forma Pix completa.
2. `CONFIRMADO` com sinal de R$ 10,00 num total de R$ 37,00 → `falta` 2700 e `pix` com o valor 27,00.
3. `pago` → sem `pix`, `pago: true`.
4. Combo com duas escolhas, uma com foto → `composicao` "1 Cookie Pistache 120g + 1 Cookie Red
   Velvet 120g" e `fotosDasEscolhas` com uma.
5. `frasesDoCombinado` com `instrucoes` de três linhas → três linhas, e nenhuma frase "Retirada na…".
6. Com `horaEntrega: "15:00"` → `hora` presente.

## 6 · Roteiro de navegador

1. O P-261009-6F5 da Juliana: o combo sem quadrado bege, com a composição embaixo; sem subtotal;
   o Pix em linhas; "Terça-feira, 13 de outubro · às 15h" se houver hora.
2. Confirmar o pedido, registrar sinal: "PEDIDO CONFIRMADO", sinal, falta e o QR. Apontar a câmera
   do app do banco para o QR na tela: o valor vem certo.
3. Ctrl+P: uma página, o QR legível no papel.
4. Celular: "Mandar pra cliente" abre o WhatsApp com o resumo e o link.
5. Pedido cancelado: o aviso no lugar da folha.

## Critérios de aceite

- [x] Os sete problemas da lista resolvidos como a seção 2 e a 3 dizem.
- [x] Testes da seção 5 no `orcamento.test.ts`.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d354` e `#d355` escritos; `ESTADO.md` e `novidades.ts` atualizados.

## Fora de escopo

- **Logo e condições de venda na folha.** Spec 148.
- **Aprovação pelo link.** Spec 149.
- **Recibo com valor fiscal, CPF/CNPJ da cliente.** Não é nota; quando um setor de compras pedir o
  CNPJ, nasce `Cliente.documento` (a 017 já previu).
- **Gerar o PDF no aparelho para anexar no WhatsApp** (`navigator.share` com arquivo). Exige
  biblioteca ou servidor (`#d106`); o link da 149 resolve o mesmo problema sem arquivo.
