# Spec 107 · A lista que se compara

**Tipo:** a linha cai de três andares para dois no celular, o contato sai legível na ficha, a
ordem vira escolha, a busca acha pelo telefone, e no desktop a lista vira a tabela das outras
listas que comparam números. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de `/clientes` sobre os prints de celular e desktop de 2026-10-09.
**Depende de:** 105 (o contato passa a morar na ficha). Melhor depois da 106, porque a ordem
"há mais tempo sem pedir" é dela.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d310`.

---

## Problema

1. **O contato é um terço da lista e não se lê.** No celular, cada linha tem o andar
   "81999137502 · @janessadd1" em `--ink-subtle`, que o `DESIGN.md` proíbe como texto
   (3,45:1). E o mesmo telefone aparece de quatro jeitos: "81999137502", "81 98713-8356",
   "+55 81 99373-6569", "819 9242-3262"; o Instagram ora com "@", ora sem
   ("Veronicaapolonia23", "Gatogalharo"). Com 55 clientes, esse andar soma umas três telas de
   rolagem.
2. **Uma ordem só.** "Quem comprou por último", "quem está há mais tempo sem pedir" e "por
   nome" são perguntas de todo dia. Em Produtos e Materiais a `EscolhaDeOrdem` já existe.
3. **A busca só lê o nome.** "Quem é esse 81 98713…" que chamou no WhatsApp não se acha.
4. **No desktop, a lista é uma linha de celular esticada.** No print de 1864px, o nome está
   à esquerda e o valor a ~700px dele, sem nada no meio; pedidos, média e último dia viram
   uma frase cinza que não se compara linha a linha. Produtos (`#d228`), Materiais (`#d225`)
   e Pedidos (`#d253`) já resolveram isso com a tabela do `DESIGN.md`.
5. **O dinheiro da linha não segue o padrão.** `formatarMoeda` puro: o "R$" no mesmo tamanho
   e tinta do valor. O `DESIGN.md` pede o símbolo menor em `--ink-muted`, que `ui/Dinheiro`
   já faz.

---

## 1 · O que esta spec decide: `#d310`

- **A linha do celular tem dois andares**: nome e valor; o resumo embaixo. O contato sai da
  linha e mora na ficha (105), formatado.
- **`telefoneParaLer(telefone)`** em `domain/clientes.ts`, com teste: 10 ou 11 dígitos (com
  ou sem 55, com ou sem zero de operadora, pela mesma limpeza de `telefoneParaWhatsApp`) viram
  "(81) 99913-7502" ou "(81) 3222-1234"; o resto aparece como foi digitado. **Só leitura**:
  nada é reescrito no documento. **`instagramParaLer`** põe o "@" quando falta.
- **O valor da linha passa a `ui/Dinheiro`.**
- **Ordem por `EscolhaDeOrdem`** na linha da contagem, guardada no aparelho como em Produtos:
  Mais gasto (a de hoje, padrão) · Pedido mais recente · Mais tempo sem pedir · Nome. A
  vista da 106 que tem ordem própria a impõe e a escolha some enquanto ela está ativa.
- **A busca casa nome, Instagram e dígitos do telefone**, em memória, por `filtrarClientes`
  em `domain/clientes.ts` com teste: com 4 dígitos ou mais no termo, compara os dígitos do
  termo com os do telefone, por `includes`.
- **Tabela a partir de `xl`**, com a rota fora de `(coluna)` como Produtos (`#d129`):
  Cliente · Pedidos · Média · Último · Total. Números tabulares à direita, cabeçalho em micro
  600 caixa alta `aria-hidden`, rótulo de célula em `sr-only`, a mesma `<li>` da linha do
  celular virando grade (`COLUNAS_CLIENTE`). A ficha (105) acopla à direita com a linha
  selecionada em `--surface-sunken`; com ela aberta, a tabela espera o `2xl`, como Produtos.
- **Traço da parte de cada uma** na coluna Total da tabela: 4px sob o valor, na proporção do
  `totalGasto` dela sobre o da primeira, em `--brand-as-ink`. É a "medida de linha" do
  `DESIGN.md`, e só na tabela.

---

## 2 · Antes de tocar em código

1. Ler `ListaFichas.tsx` e `LinhaFicha.tsx` (o par linha/tabela e a `EscolhaDeOrdem`) e
   copiar o desenho, não reinventar.
2. Conferir no cache real os formatos de telefone que existem, e pôr cada um no teste de
   `telefoneParaLer`.

---

## 3 · Escopo

- `domain/clientes.ts` (`telefoneParaLer`, `instagramParaLer`, `filtrarClientes`, as ordens)
  com teste.
- `LinhaCliente.tsx`, `ListaClientes.tsx`, `FichaDaCliente.tsx` (o contato formatado), e a
  rota saindo de `(coluna)`.

---

## 4 · Roteiro de navegador

1. Celular 360px: a linha tem dois andares, sem contato; 55 clientes cabem em menos rolagem.
2. Ficha da Ketilyn: "(81) 99373-6569", e o WhatsApp disca o mesmo número.
3. Buscar "98713": acha a Lindacy.
4. "Mais tempo sem pedir", recarregar: a ordem continua.
5. Desktop 1440px: a tabela de cinco colunas; tocar abre a ficha à direita e a tabela volta à
   linha do celular até o `2xl`.
6. Teclado: Tab percorre as linhas com foco visível; Enter abre a ficha.

---

## Critérios de aceite

- [x] Linha de dois andares; contato só na ficha, formatado.
- [x] `ui/Dinheiro` na linha e na tabela.
- [x] Quatro ordens, guardadas no aparelho.
- [x] Busca por telefone e Instagram, com teste.
- [x] Tabela em `xl` com a ficha acoplada.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d310` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 5 · Fora de escopo

- **Normalizar o telefone gravado.** Reescrever 55 documentos por formato é migração; a
  leitura formatada resolve o que se vê. O `PainelCliente` pode formatar ao salvar numa spec
  futura, se o formato torto continuar entrando.
- **Exportar a lista (CSV).** Ninguém pediu, e o dado é dela no próprio app.
