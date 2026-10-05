# Spec 092 · A nota que chega no celular

**Tipo:** o app instalado aparece no "Compartilhar" do Android para PDF e imagem. A nota que o
fornecedor mandou no WhatsApp, ou o PDF do e-mail do mercado, vai direto para a leitura.
**Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Ler uma nota" (2026-10-05).
**Depende de:** a 088 (a espera com miniatura e "Cancelar").
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d294`.

---

## Problema

Metade das notas não nasce em papel. O atacado manda o PDF por e-mail; o fornecedor de
embalagem manda a foto ou o PDF no WhatsApp. Hoje o caminho é: baixar o arquivo, abrir o
Rende, Materiais, "Ler uma nota", "Escolher", achar o arquivo em Downloads. Seis passos para
um arquivo que já estava aberto na tela dela.

Serviço de recibo que cobra assinatura resolve isso com um endereço de e-mail para encaminhar
ou com o "Compartilhar" do sistema. O e-mail pede caixa de entrada e arquivo guardado (fora,
`#d49`); o "Compartilhar" é da plataforma e não guarda nada.

---

## 1 · O que esta spec decide: `#d294`

### O manifesto

- `src/app/manifest.ts` ganha `share_target`: `action: "/insumos/nota/compartilhar"`,
  `method: "POST"`, `enctype: "multipart/form-data"`,
  `params.files: [{ name: "nota", accept: ["application/pdf", "image/*"] }]`.
- O nome que aparece na folha do Android é o do app, "Rende".

### O service worker

- `src/app/sw.ts` intercepta `POST /insumos/nota/compartilhar`: lê o `formData`, guarda o
  primeiro arquivo `nota` no Cache Storage (cache `nota-compartilhada`, uma entrada só, com o
  `content-type` e o nome em cabeçalho) e responde `Response.redirect("/insumos/nota", 303)`.
  Uma nota compartilhada por cima de outra substitui a anterior.
- Nada passa pela rede nesse passo: compartilhar funciona sem sinal.

### A tela

- `TelaNota`, ao montar, procura a entrada do cache. Achou: apaga do cache e, se há rede, chama
  `ler(arquivo)` direto (a espera da 088, com a miniatura e "Cancelar"). Sem rede: a etapa
  "escolher" com o nome do arquivo e "Ler esta nota" (desabilitado com a frase de sempre até a
  rede voltar), e o arquivo segura em memória até lá.
- Ajudante: a rota já é só da dona (`ajudante.ts`); o arquivo fica no cache, sem efeito, e é
  substituído pelo próximo.
- Sem login: o login de sempre; ao voltar para `/insumos/nota`, a tela acha o arquivo.

### Onde não funciona, dito

- iPhone: o Safari não implementa `share_target`. Nada muda lá; a 088 já deixa o caminho do
  arquivo a dois toques. "Como funciona" diz "No Android, compartilhe o PDF da nota com o
  Rende." só no Android (`navigator.userAgent` basta para uma frase).

---

## 2 · Antes de tocar em código

1. Conferir como o Serwist deixa registrar uma rota `POST` antes do `defaultCache` em `sw.ts`.
2. Conferir no Android que o app instalado aparece na folha de compartilhar depois de
   reinstalar (o manifesto só é relido na instalação ou na atualização do WebAPK).

---

## 3 · Escopo

- `src/app/manifest.ts`, `src/app/sw.ts`.
- `TelaNota.tsx`: a busca no cache ao montar.
- A frase em "Como funciona".

---

## 4 · Roteiro de navegador

1. Android, app instalado: no WhatsApp, compartilhar um PDF de nota com o Rende: abre a
   leitura, sem passar por Materiais.
2. Mesmo caminho com uma foto da galeria.
3. Em modo avião: compartilhar abre a tela com o nome do arquivo; a rede volta, "Ler esta
   nota" lê.
4. Logado como ajudante: compartilhar não lê nada e não quebra.
5. iPhone: nada muda, e a frase de "Como funciona" não aparece.

---

## Critérios de aceite

- [ ] O Rende aparece no "Compartilhar" do Android para PDF e imagem.
- [ ] O arquivo compartilhado chega na leitura sem passar pela rede no caminho.
- [ ] Sem rede, a tela segura o arquivo e lê quando a rede volta.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d294` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Encaminhar a nota por e-mail** para um endereço do Rende. Pede caixa de entrada e arquivo
  guardado, contra `#d49`.
- **Vários arquivos compartilhados de uma vez.** O primeiro basta até a 091 estar de pé; aí é
  trocar "o primeiro" por "até quatro".
- **Ler o QR Code da NFC-e.** Continua fora pelo motivo da 006 (27 portais estaduais, e não
  resolve cupom de padaria nem PDF de fornecedor), agora com mais um: ler QR no iPhone pede
  biblioteca, porque o `BarcodeDetector` não existe no Safari. Volta à mesa se o roteiro da
  089 mostrar o modelo errando preço com frequência.
