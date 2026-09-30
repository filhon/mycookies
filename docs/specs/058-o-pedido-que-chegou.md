# Spec 058 · O pedido que chegou

**Tipo:** o pedido pelo cardápio que espera resposta vira um número em "Pedidos", na navegação
inferior e na barra lateral, em qualquer tela. **Nenhum campo, nenhuma regra, nenhuma
dependência.** Uma assinatura a mais, e é a mesma que `/pedidos` e a Hoje já abrem.
**Tamanho:** uma sessão.
**Origem:** crítica dos componentes de layout (2026-09-30).
**Depende de:** nada. Se a 059 rodar antes, o número entra no item da barra que ela já tocou.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d235`.

---

## Problema

O cardápio público (031) é o recurso que mais faz o plano completo valer: pedido chegando sem
WhatsApp. Hoje ela só sabe que chegou um pedido se abrir a Hoje ("Esperando você", `#d213`) ou a
lista de `/pedidos`. À noite, precificando em `/fichas`, ou no mercado com `/compras` aberta, nada
na tela muda.

Pedido sem resposta é venda perdida para ela, e cardápio que parece não funcionar é assinatura
cancelada para o Rende. Toda ferramenta que recebe coisa de fora (o gestor do iFood, a Shopify, o
WhatsApp Business) marca o destino onde a coisa está.

A navegação é só ícone (`#d150`): o ícone de Pedidos é idêntico com zero ou com cinco pedidos
esperando.

---

## 1 · O que esta spec decide

### "Pedidos" diz quantos esperam: `#d235`

**O que conta.** Pedido com `status === "ORCAMENTO"` e `origem === "CARDAPIO"`, de qualquer data:
o mesmo filtro da primeira linha de `EsperandoVoce`. O predicado sai de `EsperandoVoce.tsx` para
`domain/pedido.ts` como `esperaDoCardapio(pedido)`, e os dois leem dali.

**Conta o que espera, e não o que é novo.** Não existe "visto": nenhum campo novo, nenhum estado
no aparelho. O número some quando ela confirma ou cancela o pedido, que é a resposta. Ele
continua em `/pedidos`: é o estado da agenda, e não uma notificação por ler.

**A fonte.** `consultaAgenda(contaId)` pelo `useColecao`, num hook `useEsperaDoCardapio()` usado
pela navegação inferior e pela barra lateral. O SDK divide o alvo entre ouvintes da mesma consulta:
com `/pedidos` ou a Hoje abertas, não há leitura a mais. Sem conta (`contaId` nulo), zero.

**A marca.**

- **Celular:** número no canto superior direito da pílula do ícone, 18px de altura mínima,
  `micro` 600 `tabular-nums`, fundo `brand-700`, tinta `on-brand`, raio cheio. Acima de 9, "9+".
- **Desktop:** o número na ponta direita do item, mesma tipografia, fundo `on-brand`, tinta
  `brand-800`: legível sobre o item inativo e sobre o ativo.
- **Não é âmbar:** o ponto âmbar é assinatura, único na peça, e nunca ícone de interface
  (`DESIGN.md`, Signature). **Não é vermelho:** pedido chegando não é erro.
- **Não é só cor:** é um número. O `aria-label` do link vira "Pedidos, 2 pedidos do cardápio
  esperando" (singular com 1), e o `title` também.

A ajudante vê o número: pedido é trabalho dela também.

---

## 2 · Antes de tocar em código

- Conferir que `consultaAgenda` é a mesma instância de consulta nos três lugares (mesmo `where`,
  mesmo `orderBy`), senão o SDK abre dois alvos.
- Medir a pílula de 32×56 com o número: ele não pode cobrir o ícone de 24px.

---

## 3 · Escopo

- `src/lib/domain/pedido.ts`: `esperaDoCardapio`.
- `src/components/pedidos/EsperandoVoce.tsx`: passa a usar o predicado.
- `src/components/layout/navegacao.ts`: o hook `useEsperaDoCardapio` (ou arquivo irmão, se o
  `navegacao.ts` precisar continuar sem `"use client"`).
- `src/components/layout/NavegacaoInferior.tsx` e `BarraLateral.tsx`: o número e o rótulo.

---

## 4 · Roteiro de aparelho

1. De outro aparelho, fazer um pedido pelo cardápio da conta de exemplo. No celular, aberto em
   `/fichas`: o "1" aparece em Pedidos sem recarregar.
2. Segundo pedido: "2".
3. Confirmar um dos dois: "1". Cancelar o outro: o número some.
4. Desktop: o número no item "Pedidos" da barra, legível com o item ativo e inativo.
5. TalkBack no ícone: "Pedidos, 1 pedido do cardápio esperando".
6. Sem rede: o número é o do cache, e não some.

---

## Critérios de aceite

- [ ] Número em Pedidos, na navegação inferior e na barra lateral, com "9+" acima de 9.
- [ ] `aria-label` e `title` com a contagem.
- [ ] Predicado único em `domain/pedido.ts`, usado pelos dois.
- [ ] Nenhuma consulta nova ao Firestore.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] `#d235` escrito; `ESTADO.md` e as linhas "Navegação inferior" e "Barra lateral" do
      `DESIGN.md` atualizados.

---

## 5 · Fora de escopo

- **Notificação push.** Avisar com o app fechado exige permissão, service worker de push e um
  servidor que envie. É o que falta de verdade, e é spec própria, depois de ver se o número basta.
- **`navigator.setAppBadge`** no ícone do app instalado. Não funciona no Android, que é o aparelho
  dela; volta junto com o push.
- **Número na aba do navegador** ("(2) Pedidos"). O Next reescreve o `<title>` a cada navegação.
- **Contar pedido que passou do dia.** Esse já está na Hoje, e é atraso dela, não chegada de fora.
