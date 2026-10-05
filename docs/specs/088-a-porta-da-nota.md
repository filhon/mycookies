# Spec 088 · A porta da nota

**Tipo:** a etapa "escolher" e a etapa "lendo" de `/insumos/nota` ganham título que se explica,
um caminho por contexto (câmera no celular, arrastar e colar no computador), o motivo de ler a
nota (os preços velhos dela) e uma espera que mostra a foto e deixa cancelar. **Nenhum campo,
nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Ler uma nota" sobre os prints de celular e desktop de 2026-10-05.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d290`.

---

## Problema

O que os prints mostram:

1. **O título aponta para nada.** "A nota já sabe tudo isso": "isso" é o formulário de nove
   campos de Materiais, que ela não está vendo. Quem chega pelo "+" ou pelo ⋯ lê uma frase sem
   sujeito.
2. **Um botão para dois aparelhos.** No celular, "Escolher a nota" abre o seletor do sistema
   (câmera, galeria, arquivos): um toque a mais no caso de quase sempre, que é fotografar o
   cupom. No computador não há arrastar nem colar, e o PDF está no e-mail, na aba ao lado.
3. **O desktop tem duas colunas de leitura e nenhum conteúdo.** O bloco ocupa os 1024px da
   coluna com o texto centrado em ~380px; a frase da foto, embaixo, alinha à esquerda. Dois
   terços do bloco são borda. No celular, mais da metade da tela fica vazia abaixo da frase.
4. **A tela não mostra o que vai acontecer.** Serviço de recibo que cobra assinatura mostra o
   antes e o depois antes de pedir a foto. Aqui ela só descobre o que a leitura faz depois de
   esperar 20 segundos.
5. **A tela não sabe nada dela.** A spec 006 existe porque "o preço envelhece em silêncio", e
   a página que resolve isso não diz quantos materiais estão com preço velho nem quando foi a
   última compra registrada. `Insumo.ultimaCompraEm` já está carregado na tela e não é usado.
6. **A espera é cega.** Símbolo pulsando e "Não feche a tela" durante 10 a 30 segundos, sem a
   foto escolhida (foi a nota certa?) e sem como desistir.

---

## 1 · O que esta spec decide: `#d290`

### Título, linha e exemplo

- Título em display: **"A compra inteira numa foto."**, com o ponto âmbar no lugar do ponto
  final (padrão do estado vazio, `DESIGN.md`).
- Linha: "Cada linha vira material, com o preço e a data da compra. Você confere antes de
  salvar."
- Abaixo, **um exemplo do que acontece**, uma linha só, estática, rotulada "Exemplo" em micro:
  o impresso em micro `--ink-subtle` (`FARINHA TRIGO D.BENTA 1KG   5,49`), a seta, e a mesma
  linha como a conferência a mostra (nome, marca, "R$ 5,49 o kg", selo "Atualiza"). É desenho,
  não dado: nada lê o Firestore. Usa os mesmos `Selo` e classes da linha da conferência, para
  não divergir dela.

### O motivo de ler

- Uma linha acima da ação, só quando há o que dizer, por função pura nova em
  `domain/notaFiscal.ts` com teste: `idadeDosPrecos(insumos, hojeISO)` →
  `{ velhos: number; ultimaCompraISO: string | null }`, onde velho é sem `ultimaCompraEm` ou
  com ela há mais de `PRECO_ENVELHECE_DIAS = 60` dias (insumos não arquivados; a tela já os
  assina).
- Frase: "**14 materiais** estão com o preço de mais de 2 meses. A última compra registrada foi
  em 12 de setembro." Sem velhos: "Os preços estão em dia. A última compra registrada foi em
  12 de setembro." Sem material nenhum: a linha some. Tom neutro, `Clock` em `--ink-subtle`:
  não é atenção, é motivo.

### Um caminho por aparelho

- **Celular** (abaixo de `lg`): dois `<input type="file">`. "Fotografar a nota" (primário, 52px,
  `Camera`) com `capture="environment"`; "Escolher foto ou PDF" (secundário) sem `capture`. O
  comentário de hoje sobre `capture` muda: com dois controles, os três caminhos continuam lá e
  o comum custa um toque.
- **Computador** (`lg` e acima): o bloco vira **área de soltar**. Borda tracejada
  `--border-strong`, "Solte aqui o PDF ou a foto da nota", "Escolher o arquivo" (primário) e,
  em micro, "ou cole com Ctrl+V". Em `dragover`, borda sólida `--brand-as-ink` e fundo
  `--brand-100`. `paste` na página com imagem ou PDF chama `ler`. Mais de um arquivo solto:
  lê o primeiro e diz "Lemos só o primeiro arquivo." (até a 091).
- Tipo recusado no soltar ou no colar: o `Aviso` de sempre com `sem-arquivo`.

### Composição

- Celular: sem bloco. Título, linha, exemplo e motivo no papel; as duas ações juntas, em
  largura inteira, depois deles.
- Computador: a área de soltar alinhada à esquerda da coluna, com o texto à esquerda também,
  e o exemplo à direita dentro dela a partir de `xl`. Uma coluna de leitura só.
- A frase da privacidade encolhe e ganha ícone (`Lock`, `--ink-subtle`): "A foto não fica
  guardada. Fica o preço de cada material, dentro dele." Logo abaixo das ações.

### A espera

- Mostra o que ela escolheu: miniatura da imagem (`URL.createObjectURL`, revogada ao sair da
  etapa), ou `FileText` e o nome do PDF.
- "Lendo a nota" e "Leva de 10 a 30 segundos." no lugar de "Não feche a tela".
- **"Cancelar"** (terciário): `AbortController` no `fetch` de `ler`; cancelar volta para
  "escolher" sem `Aviso`. Abortado não é falha.

---

## 2 · Antes de tocar em código

1. Conferir no Android e no iPhone o que `capture="environment"` abre (câmera direta) e que o
   input sem `capture` continua oferecendo a galeria.
2. Conferir que `EstadoVazio` aceita o exemplo como filho, ou se a etapa deixa de usá-lo.

---

## 3 · Escopo

- `TelaNota.tsx`: etapa "escolher" e `Lendo`.
- `domain/notaFiscal.ts`: `idadeDosPrecos` e `PRECO_ENVELHECE_DIAS`, com teste.
- Componente novo em `components/notas/` para o exemplo, se o arquivo da tela passar do
  razoável.

---

## 4 · Roteiro de navegador

1. Celular: "Fotografar a nota" abre a câmera direto; "Escolher foto ou PDF" abre o seletor.
2. Computador: soltar um PDF lê; colar uma captura de tela lê; soltar um `.docx` dá o aviso.
3. Conta com materiais sem compra registrada: a frase conta certo.
4. Na espera, a miniatura é a foto escolhida; "Cancelar" volta sem aviso de erro.
5. Sem rede: as ações desabilitadas e a frase de sempre, como hoje.
6. Escuro: a área de soltar e o exemplo legíveis.

---

## Critérios de aceite

- [x] Título, linha e exemplo novos; "A nota já sabe tudo isso" saiu.
- [x] Câmera direta no celular, arrastar e colar no computador.
- [x] A frase dos preços velhos, por função com teste.
- [x] Espera com miniatura e "Cancelar".
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d290` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Várias fotos para uma nota.** 091.
- **Receber a nota pelo "Compartilhar" do celular.** 092.
- **Ler o QR Code da NFC-e.** Continua fora pelo motivo da 006; ver a nota ao fim da 092.
- **Lista das notas lidas.** Sem a foto guardada (`#d49`), uma lista de notas
  seria a lista de lançamentos com `notaChave`, que o Caixa já mostra.
