# Spec 137 · Como se faz

**Tipo:** o produto ganha o modo de preparo, um passo por linha, no editor. O campo
`FichaTecnica.modoPreparo?: string` já existe no tipo e nunca foi escrito nem lido; esta spec o
liga. Nenhuma regra, nenhum índice, nenhuma dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, item 6.
**Depende de:** nada. Entra antes da 138, que lê o que esta grava.
**Aprovações pedidas:** nenhuma. O campo é opcional e já está no tipo: documento antigo sem ele
continua válido, e nada lê `modoPreparo` hoje.
**Decisões a registrar:** `#d342`.

---

## Problema

O `PRODUCT.md` põe a cozinha como o primeiro dos quatro contextos: "consulta a receita e confere
quantidades". O Rende guarda as quantidades e não guarda a receita. A ordem, o forno a 180 °C, os
12 minutos, "recheio congelado em bolinhas de 20 g" moram no caderno ou na cabeça dela.

Todo serviço de receita que se paga por assinatura (Meez, Paprika, Galley, CakeBoss, os
brasileiros de precificação de confeitaria) guarda o modo de preparo junto do custo. É o motivo de
abrir o app na bancada; sem ele, o Rende é o lugar onde ela vai à noite, e não durante a produção.

A 002 deixou fora "modo de preparo com formatação". Esta spec traz o modo de preparo **sem**
formatação: texto, um passo por linha.

---

## 1 · O que esta spec decide: `#d342`

- **Bloco novo** "Como se faz", com `ListOrdered`, logo depois de "O que vai dentro", só em
  receita (`SIMPLES`). Descrição: "Um passo por linha. Na bancada, cada linha vira um passo."
- `AreaTexto` com `rows={6}`, crescendo com o conteúdo; placeholder com três passos reais
  ("Bata a manteiga com os açúcares até clarear." …).
- **Sem editor rico, sem passo como lista de campos.** Uma linha é um passo; linha em branco é
  ignorada. Quem lê é `passosDoPreparo(texto): string[]` em `src/lib/domain/`, com teste.
- Limite de 4.000 caracteres em `esquemaFicha` (`PREPARO_MAX`), com o contador aparecendo depois
  de 3.500, como o da descrição.
- `DadosFicha`, `criarFicha` e `atualizarFicha` gravam `modoPreparo` (string vazia vira ausente,
  para o documento não carregar campo vazio). `v` continua `VERSAO_SCHEMA`.
- **Nunca público.** `montarCardapio` já não devolve o campo (o teste de chaves do `#d158` cobre);
  conferir que a folha do orçamento também não.

---

## 2 · Escopo

- `schemas.ts` (`PREPARO_MAX`), `domain` (`passosDoPreparo` e teste).
- `mutations/fichas.ts`: o campo em `DadosFicha` e nas duas escritas.
- `FormularioFicha.tsx`: o bloco.
- `DECISOES.md`: `#d342` (texto com um passo por linha, e não lista de campos: mais rápido de
  colar do caderno e do WhatsApp, e a bancada só precisa das linhas).
- `novidades.ts`: "O produto guarda o modo de preparo".

---

## 3 · Roteiro de navegador

1. Colar o modo de preparo do Cookie Cacau com Nutella do caderno, salvar, reabrir: igual.
2. Offline: salvar, reabrir sem rede: igual.
3. Cardápio público e folha do orçamento: o preparo não aparece.
4. Kit: o bloco não existe.

---

## Critérios de aceite

- [x] O bloco grava e lê `modoPreparo`; vazio não grava campo.
- [x] `passosDoPreparo` testada.
- [x] Nunca no cardápio nem na folha.
- [x] Portão de conclusão passa; `#d342`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **A leitura na bancada**: 138.
- **Foto por passo, tempo por passo, temporizador.** Esperar a 138 ser usada.
- **Negrito, lista, título.**
