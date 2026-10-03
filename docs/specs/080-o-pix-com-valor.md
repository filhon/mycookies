# Spec 080 · O Pix com o valor

**Tipo:** o resumo do WhatsApp e a cobrança passam a levar o **Pix copia e cola** com o valor do
pedido (BR Code estático, padrão do Banco Central), montado no aparelho por uma função pura. A
forma de pagamento Pix ganha três dados opcionais na Configuração. **Nenhuma regra, nenhum índice,
nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da tela de pedido sobre os prints de 2026-10-02.
**Depende de:** a 075 (o bloco Pagamento junto).
**Aprovações pedidas:** nenhuma, se a regra de `configuracao` não valida as formas campo a campo
(passo 2.2). Campo **opcional e novo**: o schema continua compatível.
**Decisões a registrar:** `#d278`.

---

## Problema

O pagamento é onde a encomenda vira dinheiro, e é a parte mais fraca da tela. Hoje o resumo do
WhatsApp leva `FormaPagamento.instrucoes`, texto livre ("Pix: 81 99679-6370"). A cliente copia a
chave, abre o banco, digita o valor e, muitas vezes, paga depois ou paga errado.

Bakesy, Square e Stripe mandam um link de pagamento. No Brasil o equivalente sem gateway, sem taxa
e sem cadastro é o **Pix copia e cola com valor**: a cliente cola no banco e a chave, o nome, o
valor e o código do pedido já vêm preenchidos. É um texto montado por regra pública (o Manual do
BR Code do Banco Central), sem servidor e sem internet.

---

## 1 · O que esta spec decide

### O Pix montado no aparelho, com o valor: `#d278`

- **`FormaPagamento.pix?: { chave: string; nome: string; cidade: string }`**, só para
  `tipo: "PIX"`. Opcional: forma sem isso continua como hoje, com as `instrucoes`.
- **Configuração**, na forma Pix: "Chave Pix", "Nome de quem recebe (como aparece no banco)" e
  "Cidade". Abaixo, a conferência: "O Pix vai para **{nome}**, chave **{chave}**." e o terciário
  "Copiar um Pix de R$ 1,00 para testar": ela paga a si mesma uma vez e vê o nome no banco antes
  de mandar para uma cliente.
- **`src/lib/domain/pix.ts`**: `brCodePix({ chave, nome, cidade, valor, identificador })` devolve
  o texto EMV:
  - `00` "01"; `26` com `00` "br.gov.bcb.pix" e `01` a chave; `52` "0000"; `53` "986"; `54` o valor
    com ponto e duas casas, a partir dos centavos (nunca float no meio); `58` "BR"; `59` o nome
    (até 25, sem acento); `60` a cidade (até 15, sem acento); `62` com `05` o identificador
    (o código do pedido sem o hífen, só `[A-Za-z0-9]`, até 25); `63` o CRC16-CCITT (polinômio
    0x1021, início 0xFFFF) em hexadecimal maiúsculo.
  - Teste com o exemplo do manual do Banco Central, conferido no dia, e com acento, nome longo,
    valor de R$ 0,01 e R$ 1.234,56.
- **Onde aparece**, só enquanto há o que pagar e a forma do pedido tem `pix`:
  - **Mensagem do WhatsApp** (`mensagemDoPedido`): no lugar das instruções, "Pix copia e cola (já
    com o valor):" e o código numa linha própria, para o toque longo copiar inteiro.
  - **Bloco Pagamento do editor** e **cobrança da ficha (063)**: secundário "Copiar o Pix de
    R$ 68,00" (`navigator.clipboard.writeText`), com "Copiado" por 2 s em `aria-live`. Sem
    permissão de área de transferência, o código aparece selecionável.
- **O valor** é o total do pedido; com a 081, o que falta pagar.

---

## 2 · Antes de tocar em código

1. **Conferir o Manual do BR Code no site do Banco Central no dia da sessão**: os campos, os
   tamanhos e o CRC. Se algo divergir, vale o manual, e a diferença vai para o `#d278`.
2. Ler `firestore.rules` para `configuracao`: se a regra lista as chaves de `formasPagamento`,
   mudar a regra **pede aprovação** e a sessão para aqui.
3. Ler `whatsapp.ts` (`paraPagar`) e o teste da mensagem.

---

## 3 · Escopo

- `domain/pix.ts` com teste; `types/configuracao.ts` (`pix?`); o formulário da forma em
  `/configuracao`; `whatsapp.ts`; o bloco Pagamento; a cobrança em `FichaDoPedido.tsx`.

---

## 4 · Roteiro de navegador

1. Configurar a forma Pix com chave, nome e cidade; "Copiar um Pix de R$ 1,00" e pagar no banco:
   o nome e o valor certos.
2. Pedido de R$ 68,00 em Pix, WhatsApp: a mensagem leva o copia e cola; colado no banco, R$ 68,00
   e o código do pedido na descrição.
3. Pedido pago: a mensagem não leva Pix.
4. Forma Pix sem os três dados: a mensagem leva as instruções, como hoje.
5. "Copiar o Pix" no editor e na ficha, no celular e no desktop.

---

## Critérios de aceite

- [x] `brCodePix` com teste, incluindo o exemplo do manual e o CRC.
- [x] Valor em centavos até virar texto.
- [x] Pix só enquanto há o que pagar.
- [x] Forma sem `pix` funciona como hoje.
- [x] Nenhuma regra, índice ou dependência.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d278` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **QR Code em imagem.** Gerar QR pede biblioteca (dependência de produção). O copia e cola cobre
  o WhatsApp, que é por onde a encomenda acontece.
- **Pix dinâmico, confirmação automática de pagamento, link de cartão.** Pedem gateway, conta e
  taxa.
- **O Pix na folha do orçamento.** Sem QR, um texto de 150 caracteres no papel não serve.

---

## Decisões desta spec que são fáceis de rejeitar

- **Três campos, e não ler a chave das `instrucoes`.** O texto livre não é confiável o bastante
  para dinheiro.
- **O teste de R$ 1,00.** Chave errada é dinheiro na conta de outra pessoa; a conferência custa um
  real e uma vez.

---

## Riscos

- **Chave digitada errada.** A conferência e o teste existem por isso.
- **Banco que recusa nome ou cidade com caractere especial.** A função tira acento e corta no
  tamanho; o roteiro testa em dois bancos.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com o resultado real; o roteiro
da seção 4.
