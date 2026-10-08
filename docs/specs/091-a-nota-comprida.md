# Spec 091 · A nota comprida

**Tipo:** uma nota pode ser lida a partir de até quatro fotos, em ordem, numa leitura só, com
uma conferência, um total e um lançamento no caixa. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.** Muda o corpo de `POST /api/nota` de forma compatível.
**Tamanho:** uma sessão.
**Origem:** crítica de "Ler uma nota" (2026-10-05).
**Depende de:** a 088 (os dois caminhos de escolha e a miniatura da espera).
**Aprovações pedidas:** nenhuma. O custo por leitura sobe com o número de fotos; ver Riscos.
**Decisões a registrar:** `#d293`.

---

## Problema

Cupom de atacado é comprido. Uma compra de mês não cabe numa foto legível, e hoje a resposta da
tela é "Fotografe em partes e leia uma parte de cada vez". Isso quebra três coisas que a 006
construiu:

1. **O total não confere.** O total impresso só está na última parte; a primeira chega sem
   total, ou com o da nota inteira contra a soma de metade das linhas, e o rodapé diz "Faltam
   R$ 88,10 para fechar com a nota" numa leitura que está certa.
2. **O caixa recebe dois lançamentos** de uma compra só, e a guarda de duplicidade (`#d54`,
   CNPJ + data + total impresso) não reconhece nenhum dos dois como a nota inteira.
3. **Ela espera duas vezes** e confere duas vezes o cabeçalho.

Serviço de recibo que cobra assinatura fotografa várias páginas como um documento só, e mostra
cada página antes de enviar.

---

## 1 · O que esta spec decide: `#d293`

### Na tela

- **Celular, câmera:** depois de "Fotografar a nota", a leitura **não** começa sozinha. A tela
  mostra a miniatura da foto (a mesma da 088), "Ler a nota" (primário) e "Fotografar a
  continuação" (secundário). Cada continuação entra à direita, numerada, com "×" para tirar.
  Com quatro, o secundário some. O toque a mais no caso de uma foto é aceito: é também onde ela
  vê que a foto saiu tremida antes de esperar 20 segundos.
- **Celular, galeria, e computador:** o input ganha `multiple`, e soltar vários arquivos lê
  todos (fim da frase "Lemos só o primeiro" da 088). A ordem é a da seleção; as miniaturas
  aparecem antes de ler, na mesma faixa, e dá para tirar uma. Arrastar para reordenar fica fora.
- PDF entra sozinho: PDF de várias páginas já é um arquivo, e não se mistura com foto
  (escolher PDF com fotos lê só o PDF e diz isso).

### Na rota

- Corpo novo: `arquivos: Arquivo[]` (1 a `LIMITE_FOTOS = 4`). `arquivo` (um só) continua
  aceito, porque o app instalado pode estar com o bundle velho em cache.
- Cada arquivo vira uma `inline_data` em `parts`, na ordem, antes do `PROMPT`. O prompt ganha
  uma frase: "As imagens são partes da mesma nota, em ordem; uma linha que aparece no fim de
  uma e no começo da outra é uma linha só." A resposta continua uma nota só, no mesmo esquema.
- **Linha repetida na emenda** é o risco esperado, e a tela já o pega: a soma passa do total e
  o rodapé diz "Confira se alguma linha entrou duas vezes". Nada novo no domínio.
- `LIMITE_LINHAS` sobe de 60 para 100, e a mensagem de `linhas-demais` deixa de mandar ler em
  partes.

### O tamanho

- O teto que vale é o do Vercel, 4,5 MB de corpo (`docs/DEPLOY.md`). Com várias fotos,
  `prepararParaLeitura` reduz cada uma para que **a soma** caiba: o lado máximo cai com o número
  de fotos (função pura `ladoParaFotos(n)` em `domain/notaFiscal.ts`, com teste), e a tela
  confere o total em base64 antes do `fetch`; passou, `arquivo-grande` sem subir nada.

---

## 2 · Antes de tocar em código

1. Medir com três fotos reais de cupom comprido: o tamanho somado depois da redução, e se o
   modelo lê cada linha uma vez.
2. Conferir que `GEMINI_MODELO` aceita várias imagens num `generateContent` (aceita na
   documentação; conferir o limite de imagens do modelo configurado).

---

## 3 · Escopo

- `TelaNota.tsx` (e o que a 088 criou): a faixa de miniaturas.
- `utils/imagem.ts`: a redução por número de fotos.
- `domain/notaFiscal.ts`: `LIMITE_FOTOS`, `ladoParaFotos`, `LIMITE_LINHAS`, a mensagem.
- `api/nota/route.ts`: `arquivos`, o prompt.

---

## 4 · Roteiro de navegador

1. Cupom de atacado em três fotos: uma conferência, o total confere, um lançamento.
2. Duas fotos com a emenda repetindo uma linha: o rodapé acusa a soma a mais; tirar a repetida
   fecha a conta.
3. Uma foto só: "Ler a nota" lê como antes.
4. Quatro fotos grandes da câmera: não passa do teto; se passar, o aviso, sem subir.
5. Galeria com três fotos selecionadas: as três na faixa, na ordem.

---

## Critérios de aceite

- [x] Até quatro fotos, uma leitura, uma conferência, um lançamento.
- [x] Corpo antigo (`arquivo`) continua aceito.
- [x] A soma das fotos cabe no teto do Vercel, por função com teste.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d293` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Reordenar as miniaturas.** Tirar e fotografar de novo resolve.
- **Recorte automático da borda do papel.** Pede biblioteca de visão; o modelo lê a foto torta.

---

## Riscos

Cada foto é uma imagem a mais na chamada do modelo: uma nota de quatro fotos custa perto de
quatro de uma. Hoje é uma conta só e dentro da faixa gratuita; no dia do segundo cliente, é a
mesma linha de custo que a 006 já apontou, um pouco mais grossa.
