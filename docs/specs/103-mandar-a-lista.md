# Spec 103 · Mandar a lista

**Tipo:** "Mandar a lista" manda o que falta comprar, em texto, pelo compartilhar do aparelho.
**Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** meia sessão.
**Origem:** crítica de `/compras` sobre os prints de 2026-10-08.
**Depende de:** nada. Respeita o `pulado` da 101 se ela já existir.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d306`.

---

## Problema

Quem vai ao mercado nem sempre é ela. Hoje a lista sai do Rende por print de tela, que corta no
meio, ou por digitação no WhatsApp. Compartilhar é o recurso mais básico de todo app de lista
que cobra assinatura (AnyList, Bring!, OurGroceries).

---

## 1 · O que esta spec decide: `#d306`

- Botão secundário **"Mandar a lista"** (`share-2`) no cabeçalho, ao lado de "Contar", só com
  lista aberta e item por comprar.
- Função pura `textoDaLista(itens, insumos, periodoFim)` em `listaCompras.ts`, com teste:

  ```
  Lista de compras até 15 de out.

  Ingredientes
  - Manteiga: 7 pacotes de 200 g (R$ 69,93)
  - Farinha de trigo: 1 pacote de 10 kg (R$ 41,90)

  Embalagens
  - Sacola Kraft: 1 pacote de 100 un (R$ 59,99)

  Total: R$ 171,82
  ```

  Só o que não foi marcado nem pulado, na ordem dos corredores. Sem emoji e sem marca: a lista
  é dela, como a folha do orçamento (`#d127`).

- `navigator.share({ text })` quando existe; senão, `linkDoWhatsApp(null, texto)` numa aba
  nova. Cancelar o compartilhar não diz nada.

---

## 2 · Escopo

- `listaCompras.ts` e teste, `ListaDoMercado.tsx`.

---

## 3 · Roteiro de navegador

1. Android: o compartilhar do sistema abre com o texto; mandar para o WhatsApp.
2. Desktop sem `navigator.share`: abre o WhatsApp Web com o texto.
3. Marcar dois itens e mandar de novo: os dois saíram.

---

## Critérios de aceite

- [x] `textoDaLista` com teste (ordem, plural, total, marcado e pulado fora).
- [x] Compartilhar do sistema, com o WhatsApp como saída.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d306` escrito; `ESTADO.md`; linha em `novidades.ts`.

---

## 4 · Fora de escopo

- **Lista ao vivo entre dois aparelhos.** A ajudante já entra na conta (spec 030) e vê a mesma
  lista; para quem não tem login, texto basta.
- **Agrupar por loja** (`fornecedor`). Ver a pergunta em aberto da crítica.
