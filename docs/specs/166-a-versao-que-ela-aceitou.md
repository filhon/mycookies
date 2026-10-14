# Spec 166 · A versão que ela aceitou

**Tipo:** os termos e a privacidade passam a ter versão: cada página termina com "O que mudou"
(data e uma linha por mudança), a data do topo sai da última versão, o cadastro grava **qual**
versão ela aceitou, e uma mudança relevante aparece para a dona na Hoje até ela dizer
"Entendi". A frase do cardápio sobre os dados da cliente passa a dizer a verdade inteira.
Um campo novo, opcional, gravado só pelo servidor. Nenhuma regra, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a mesma crítica da 165 (2026-10-14). As duas páginas prometem, na última seção,
avisar antes de uma mudança relevante valer. Desde a 027 a privacidade mudou duas vezes (o
login com o Google, `#d198`, em 2026-09-25; a taxa pelo CEP com ViaCEP e Google Maps, `#d322`,
em 2026-10-10): a segunda é "um novo fornecedor", o exemplo que o próprio texto dá de mudança
relevante. A data do topo continua "24 de setembro", ninguém foi avisada e não há como saber o
que mudou. Os serviços que vivem de assinatura resolvem com três peças pequenas: o histórico
público (GitHub, Stripe), a versão gravada no aceite e o aviso dentro do produto.
**Depende de:** 027, 165 (o pé e as âncoras; dá para fazer antes, mas a ordem é essa).
**Aprovações pedidas:** nenhuma (campo aditivo, escrito pelo Admin SDK; a regra não muda).
Confirmar com quem conduz o projeto a redação das linhas de "O que mudou" e quais são
`relevante`.
**Decisões a registrar:** uma, numerada na sessão.

---

## Problema

1. **A data do topo não diz a verdade.** "Vigente desde 24 de setembro de 2026" sobre um texto
   que mudou em 25/09 e 10/10.
2. **A promessa de aviso não tem mecanismo.** Seção 11 da privacidade e seção 11 dos termos:
   "avisaremos pelo e-mail da conta ou dentro do app". Não existe nem um nem outro.
3. **O aceite não diz o quê.** `termosAceitosEm` é só uma data. Numa disputa, não se prova
   qual texto ela aceitou, e não se sabe quem precisa ver uma mudança.
4. **A cliente do cardápio lê "Seus dados vão só para {negócio}"**, mas o CEP vai à ViaCEP e
   ao Google, e tudo fica guardado no Rende. Não há link para a política que a cobre (seção 7).

---

## 1 · O que esta spec decide

### O dado

`src/lib/domain/textoLegal.ts` (o da 165, ou novo se a 165 não veio antes):

```ts
type Versao = {
  em: string /* "2026-10-10" */;
  mudou: string;
  relevante: boolean;
};
export const VERSOES_TERMOS: readonly Versao[];
export const VERSOES_PRIVACIDADE: readonly Versao[];
export function versaoAtual(v: readonly Versao[]): string; // a última `em`
export function mudancaParaAvisar(
  v: readonly Versao[],
  aceita: string,
): Versao | undefined;
```

`mudancaParaAvisar` devolve a mudança `relevante` mais recente posterior a `aceita`. Teste:
sem mudança, só irrelevante, uma relevante, duas (devolve a última).

Conteúdo inicial (conferir as datas com `git log -p` nos dois `page.tsx` antes de gravar):

- Privacidade
  - 2026-09-24 · Primeira versão. · não relevante
  - 2026-09-25 · Entrar com o Google: o que o Google entrega ao Rende. · não relevante
  - 2026-09-30 · Contagem de visitas nas páginas públicas, sem cookie (se a `#d180` entrou
    nesta data). · não relevante
  - 2026-10-10 · A taxa de entrega pelo CEP: o CEP vai à ViaCEP e ao Google Maps. · **relevante**
- Termos
  - 2026-09-24 · Primeira versão. · não relevante

O "relevante" segue o critério que o texto já dá: novo tipo de dado, novo fornecedor, nova
finalidade, preço, ou o que afete direito.

### O aceite

- `Conta.termosVersao?: string`, gravado pelo `/api/conta` junto com `termosAceitosEm`: a
  `versaoAtual` da privacidade e dos termos, a maior das duas (uma data só cobre o par, porque o
  aceite é de um par).
- Ausente = `"2026-09-24"` (toda conta anterior aceitou a primeira versão). Ausência é
  significado (`#d141`), sem migração.
- `POST /api/conta/termos`: a dona (claim de dona da conta) grava `termosVersao` com a versão
  atual e `v: VERSAO_SCHEMA`. Admin SDK, como o resto de `conta`; a regra não muda.

### A página

- "Vigente desde {data}" sai de `versaoAtual`, por extenso.
- Depois da última seção, sem número (não é cláusula): `h2` "O que mudou" em `subheading` e uma
  lista com divisórias, a mais recente em cima: a data em `label` `--ink-muted` `tabular-nums`,
  a linha em `body`. Cada linha que fala de uma seção cita "seção N" (vira link pela 165).
- Sem versões anteriores em texto integral. O git guarda; se um dia alguém pedir, a página
  `/termos/2026-09-24` se faz então.

### O aviso

- Na Hoje, só para a dona: se `mudancaParaAvisar(VERSOES_PRIVACIDADE, aceita)` ou a dos termos
  devolver algo, a **faixa de aviso informativa** (ícone `info` + frase + ação em texto) no
  topo: "A política de privacidade mudou em 10 de outubro: a taxa de entrega pelo CEP." Duas
  ações em texto: "Ler o que mudou" (`/privacidade#o-que-mudou`, aba nova) e "Entendi"
  (`POST /api/conta/termos`; some na hora, otimista).
- Sem rede, "Entendi" fica `aria-disabled` com "Precisa de internet" (como as opções sem rede
  da grade, `#d241`). A faixa nunca bloqueia nada: aviso, não portão. Quem não concorda tem o
  cancelamento, como o texto já diz.
- Ajudante não vê: o aceite é da dona.
- Sem e-mail. O texto diz "pelo e-mail da conta **ou** dentro do app"; o app basta. Mudança de
  preço tem o caminho próprio no Stripe quando acontecer.

### O cardápio

`PedidoPeloCardapio.tsx:796`: "Seus dados vão para {negócio}, só para combinar este pedido."
seguido de "Como o Rende os guarda" (link terciário, `/privacidade#secao-7`, aba nova).

### `novidades.ts`

Uma linha: o "O que mudou" no fim dos termos e da privacidade.

---

## 2 · Escopo

- `src/lib/domain/textoLegal.ts` + teste.
- `src/lib/types/conta.ts`: `termosVersao`.
- `src/app/api/conta/route.ts`: grava a versão. `src/app/api/conta/termos/route.ts`: novo.
- `src/components/auth/PaginaDeTexto.tsx`: a data e "O que mudou".
- A Hoje: a faixa.
- `src/components/cardapio/PedidoPeloCardapio.tsx`: a frase.
- `components/comecar/novidades.ts`.

## Fora de escopo

- Reescrever cláusulas (o advogado do `#d171` continua pendente; ver abaixo).
- Aceite das ajudantes.
- Reaceite obrigatório (caixa que bloqueia o app até marcar).
- Versões antigas em texto integral, diff visual entre versões.
- E-mail de aviso.

---

## 3 · Fora do código, para quem conduz o projeto

Não são desta spec, mas pesam mais que qualquer tela na confiança de quem vai pagar:

1. **A revisão do advogado (`#d171`) ainda está pendente**, e o Rende já cobra ao vivo.
2. **CPF e endereço residencial públicos** numa página que qualquer um abre. O Decreto
   7.962/2013 exige a identificação, mas um CNPJ com endereço comercial (ou escritório
   virtual) a cumpre sem expor a casa. Os serviços que faturam bem com assinatura são empresa.
3. **E-mail `@gmail.com` como canal oficial.** Um endereço no domínio do Rende
   (`contato@…`, `privacidade@…`) é o que a cliente espera ver ao lado de uma cobrança. Trocar
   é uma linha em `responsavel.ts`.

---

## 4 · Roteiro de navegador

1. `/privacidade`: "Vigente desde 10 de outubro de 2026"; "O que mudou" no fim, 10/10 em cima.
2. Conta de teste sem `termosVersao`: a faixa aparece na Hoje com a mudança de 10/10.
   "Ler o que mudou" abre a âncora; "Entendi" some a faixa e grava `2026-10-10`.
3. Recarregar: a faixa não volta. Como ajudante: nunca aparece.
4. Offline: "Entendi" desabilitado com a razão; o resto da Hoje funciona.
5. Cadastro novo: a conta nasce com `termosVersao` igual à versão atual e sem faixa.
6. Cardápio público: a frase nova e o link para a seção 7.
