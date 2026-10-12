# Spec 139 · A variação

**Tipo:** o produto salvo ganha "Fazer uma variação", que abre um produto novo já preenchido com a
receita, a embalagem e o preço deste. Nenhum schema, nenhuma regra, nenhum índice, nenhuma
dependência.
**Tamanho:** uma sessão curta.
**Origem:** a crítica dos prints do editor de produto de 2026-10-12, item 7.
**Depende de:** nada.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d344`.

---

## Problema

Confeitaria vive de sabor: a mesma massa de cookie vira Nutella, Red Velvet, Pistache. No Rende,
um sabor novo é um produto vazio: quinze materiais buscados um a um, as mesmas três embalagens, o
mesmo tempo, os mesmos parâmetros de preço. É meia hora para mudar dois ingredientes, e é por isso
que o cardápio dela tem mais sabores do que produtos cadastrados.

Duplicar é o recurso mais básico de todo editor que se paga (Meez, Notion, Canva, Shopify). A 002 o
deixou fora, como o modo de preparo.

---

## 1 · O que esta spec decide: `#d344`

- No pé do editor de produto salvo, à esquerda do "Arquivar produto": botão secundário
  **"Fazer uma variação"**, com `Copy`. Leva a `/fichas/nova?de={id}`.
- `page.tsx` lê `searchParams.de` e passa a `EditorFicha` como `origemId`. `EditorFicha` acha a
  origem em `fichas.dados` (a consulta já existe) e `valoresIniciais` monta a partir dela:
  - **Copia:** tipo, categoria, rendimento e unidade, tempo, itens, componentes, escolhas, método,
    margem ou multiplicador, taxas, descrição, foto, modo de preparo (137).
  - **Nome:** "{nome} (variação)", selecionado no foco para ela digitar por cima.
  - **Não copia:** `fornadasMinimas` (zero, `#d96`), nada do pote nem da despensa, o preço manual
    (`precoManual: false`: a variação nasce com o sugerido do custo dela, e o preço da origem não
    vale para outra receita).
- Origem não encontrada (arquivada, id errado): abre o produto novo vazio, sem aviso. O endereço é
  dela, não de um link compartilhado.
- O cabeçalho do produto novo diz "Variação de Cookie Cacau com Nutella 120g" na linha da
  descrição, até o primeiro salvamento.
- Nada é gravado até "Salvar": a variação é um formulário preenchido, não um documento.

---

## 2 · Escopo

- `fichas/[id]/page.tsx`: `searchParams`.
- `EditorFicha.tsx` e `FormularioFicha.tsx` (`valoresIniciais` com origem; o botão; a descrição do
  cabeçalho).
- Teste do mapeamento origem → valores em `src/lib/domain/` se ele sair de `FormularioFicha` como
  função pura; se ficar no componente, o roteiro cobre.
- `DECISOES.md`: `#d344` (por que o preço manual não vem; por que a reserva não vem).
- `novidades.ts`: "Um sabor novo começa da receita de outro".

---

## 3 · Roteiro de navegador

1. Cookie Cacau com Nutella → "Fazer uma variação": "Cookie Cacau com Nutella 120g (variação)", 16
   unidades, quinze materiais, 2,5 do método, foto.
2. Trocar Nutella por Pistache, renomear, salvar: dois produtos na lista; o original intacto.
3. Voltar sem salvar: a guarda de saída pergunta; nada gravado.
4. `/fichas/nova?de=xyz`: produto novo vazio.

---

## Critérios de aceite

- [ ] A variação abre preenchida e só grava no "Salvar".
- [ ] Reserva, pote e preço manual não vêm.
- [ ] Portão de conclusão passa; `#d344`, `ESTADO.md`, `novidades.ts`.

---

## Fora de escopo

- **Variação a partir da lista de produtos.** Esperar o uso no editor.
- **Variação ligada à origem** (mudar a massa base muda os sabores). Isso é a 140.
