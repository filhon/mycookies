# Spec 155 · A porta que mostra o que vem

**Tipo:** três mudanças em `/cadastro` sobre o que ela vê antes de tocar no botão: o cookie
_dela_ no lugar do exemplo quando ela vem da calculadora (painel no desktop, uma frase com os
números no celular), uma linha sob o botão dizendo o que acontece no fim do teste, e o botão
dizendo o que ela ganha em vez do que o sistema faz. **Nenhum campo, nenhuma regra, nenhum
índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica do `/impeccable` sobre `/cadastro` com os prints de 2026-10-14 (celular 383 px
e desktop 1864 px), comparada com as portas de serviços de assinatura (Canva, Notion, Nuvemshop,
Hotmart, Calendly, Shopify).
**Depende de:** nada. Independe da 156; as duas mexem em `cadastro/page.tsx`, então uma vai
depois da outra, não em paralelo.
**Aprovações pedidas:** o texto (as três frases da seção 1).
**Decisões a registrar:** `#d364`, `#d365`.

---

## Problema (o que os prints mostram)

1. **Ela calculou o cookie dela e a porta mostra o cookie de outra pessoa.** O print do desktop
   foi tirado com rascunho no aparelho: a descrição diz "O cookie que você calculou vai estar lá",
   e o painel ao lado mostra "Exemplo · Cookie recheado, rende 24, R$ 4,41", que é o `EXEMPLO`
   fixo da página de venda. Os números dela (rendimento, hora, preços que ela trocou) estão no
   `localStorage` e a porta não usa. Serviços que convertem bem fazem o contrário: o Canva leva
   o design que você começou para a tela de cadastro; a Shopify mostra o nome da loja que você
   digitou. O que ela já investiu é o argumento mais forte para terminar, e é o único que nenhuma
   concorrente tem.
2. **No celular, a porta não mostra valor nenhum.** O painel é `hidden lg:flex`. Abaixo de
   1024 px ela vê logotipo, título, duas linhas e cinco blocos de formulário. Para a confeiteira
   que chegou pelo link do Instagram no celular (o caso comum, `PRODUCT.md`), a promessa é a
   frase "Primeiro preço em 10 minutos" e nada mais. No celular **não** cabe um cartão a mais
   (o botão já está a ~840 px do topo no print, abaixo da dobra de um iPhone de 6,1"), então a
   resposta é trocar texto, e não somar bloco.
3. **Nada diz o que acontece no dia 15.** "14 dias grátis, sem cartão" está lá; o que vem depois,
   não. É a pergunta que faz a dona de negócio desconfiada fechar a aba ("e depois cobra
   quanto?"). Todo serviço de assinatura que fatura bem responde isso colado no botão. A resposta
   do Rende é melhor que a da maioria, e já está escrita em `/conheca#preco`: sem cartão não há
   cobrança sozinha, e quem não assina continua vendo tudo, só não edita (`#d144`). A porta não
   repete.
4. **O botão diz "Criar conta" sob o título "Criar minha conta".** O botão repete o título e
   descreve o que o sistema faz. O primário de quem converte diz o que a pessoa ganha.

---

## 1 · O que esta spec decide

### O cookie dela na porta: `#d364`

**Domínio.** `exemploDoRascunho(rascunho: RascunhoDaPorta): ExemploDePagina | null` em
`src/lib/domain/calculadora.ts`, ao lado de `contaDaPorta`, e só chamando o que existe:

- `nome`: o rótulo da receita em `RECEITAS_DA_PORTA`.
- `rende`: `rascunho.rendimento`.
- `custo`: `contaDaPorta(rascunho).derivados.custo`.
- `parametros`: `precificacaoSugerida()`, a mesma que `contaDaPorta` usa.
- `precoPraticado`: `rascunho.precoHoje` quando > 0; senão o `precoArredondado` sugerido.
- `null` quando o rendimento é 0 ou o sugerido não existe: a porta volta ao `EXEMPLO`.

**Teste** em `tests/domain/calculadora.test.ts`: para um rascunho com preço trocado, o
`calcularPrecoSugerido` que a `ContaAberta` chama sobre o exemplo devolvido bate com o
`sugerido` de `contaDaPorta`. É o que garante que a porta e a calculadora nunca mostrem dois
preços diferentes para o mesmo cookie. E um caso de rendimento 0 → `null`.

**`ContaAberta`** ganha `dela?: boolean`: o título vira "O seu {nome}" em vez de
"Exemplo · {nome}". Sem preço de hoje no rascunho (`precoPraticado` veio do sugerido), a frase do
pé diz "No preço sugerido sobram R$ X pra você, por unidade, depois da maquininha." em vez de
"No preço praticado de…". Passa a receber a informação por `exemplo` + um `semPrecoDeHoje?:
boolean`, ou o que a sessão achar mais curto; o resto do componente não muda.

**Desktop.** `/cadastro` passa `exemplo={exemploDoRascunho(rascunho) ?? EXEMPLO}` e `dela` ao
painel. `useRascunhoDaPorta` já devolve o objeto; hoje a página só o compara com `null`.

**Celular.** A descrição troca a frase genérica pelos números, em uma linha a mais no máximo:

> 14 dias grátis, sem cartão. O seu cookie recheado custa R$ 4,41 e o sugerido é R$ 8,50: vai
> estar lá quando a conta abrir.

Com `Dinheiro` em linha, ou `formatarMoeda` em `num font-semibold text-ink`, como a
`ContaAberta` já faz no pé. No desktop a descrição fica como está hoje (o painel mostra os
números; repetir seria ruído). Sem rascunho, nada muda no celular nem no desktop.

### O que acontece no fim, dito na porta: `#d365`

**Sob o botão**, `text-label text-ink-muted`, centrado, 12 px abaixo:

> No fim do teste nada é cobrado. Você escolhe se assina; se não assinar, o que fez continua lá.
> [Ver os planos]

"Ver os planos" é terciário `sm`, `/conheca#preco`, aba nova (o mesmo motivo do `#d195`: não
perder o formulário). **Sem o valor em reais**: os preços vêm do Stripe (`#d201`) e a página é
cliente; escrever R$ 29 aqui é criar o segundo dono do número. Quem quer o valor toca no link.

**O botão** passa de "Criar conta" para **"Começar o teste grátis"**. "Tentar de novo" continua
igual no segundo estado com erro. O título "Criar minha conta" fica: é o nome da tela.

---

## 2 · Antes de tocar em código

1. Conferir que `/conheca#preco` rola até a seção (o `id="preco"` existe; ver se o cabeçalho
   fixo não cobre o título; se cobrir, `scroll-mt-*` na seção, que é da `/conheca` e entra aqui
   só por isso).
2. Conferir que a frase do fim do teste é verdade hoje: conta em teste vencida sem assinatura
   lê tudo e não edita (`#d144`, a regra). Se mudou, a frase muda antes de entrar.
3. Ler `ContaAberta` com `parada`: o painel do cadastro já usa a versão sem movimento.

## 3 · Escopo

- `src/lib/domain/calculadora.ts`: `exemploDoRascunho`. Teste.
- `src/components/site/ContaAberta.tsx`: `dela` e a frase sem preço de hoje.
- `src/app/(auth)/cadastro/page.tsx`: o exemplo do painel, a descrição no celular, a linha sob o
  botão, o texto do botão.
- `MolduraDeEntrada` **não** muda: a descrição já é `ReactNode`. Se a frase do celular precisar
  ser diferente da do desktop, a página passa um `ReactNode` com `lg:hidden` / `max-lg:hidden`.

## 4 · Roteiro de navegador

1. Celular 375 px, sem rascunho: descrição de hoje, linha sob o botão em até três linhas, o link
   com 44 px de alvo.
2. Calcular na `/como-calcular-o-preco-do-cookie`, trocar a hora e um preço, tocar no botão que
   leva à porta: no celular, os números da descrição batem com os da calculadora, centavo a
   centavo.
3. O mesmo no desktop 1280 × 800: o painel diz "O seu cookie recheado", rende o que ela digitou,
   e o preço sugerido é o da calculadora.
4. Rascunho sem preço de hoje: o pé do painel fala do sugerido.
5. Desktop com janela de 700 px de altura: o painel some (regra do `#d194`), a frase fica.
6. "Ver os planos" abre `/conheca#preco` em aba nova, com o título visível; o formulário
   preenchido continua na aba de origem.
7. Tema escuro: a linha sob o botão em `--ink-muted` legível sobre o `--canvas` escuro.
8. Leitor de tela: a ordem é título, descrição, Google, campos, botão, a linha do fim do teste.

## 5 · Critérios de aceite

- [x] Com rascunho, os números da porta são os da calculadora (teste de domínio prova).
- [x] Sem rascunho, a porta é a de hoje, exceto o botão e a linha sob ele.
- [x] Nenhum valor de plano escrito no código da porta.
- [x] Um âmbar na tela (o botão; o ponto do painel é a assinatura, `#d126`).
- [x] Portão; `#d364`, `#d365`; `ESTADO.md`. **Nenhuma linha em `novidades.ts`**: quem já tem
      conta não passa pela porta.

## 6 · Como saber se funcionou

A Vercel conta visitas a `/cadastro` (`#d180`) e `npm run metricas` conta contas criadas, com a
coluna `origem`. Anotar no `ESTADO.md` a razão contas/visitas das quatro semanas antes do deploy
e comparar com as quatro depois, separando `origem: calculadora`. Com o volume de hoje o número é
indício, não prova; o roteiro com uma confeiteira de fora vale mais.

## 7 · Fora de escopo

- **Depoimento da Maynara na porta.** Existe (`/conheca#quem`), mas o `#d194` recusou depoimento
  no painel. Se a medição da seção 6 não mexer, é a próxima coisa a pesar, e pede decisão nova.
- **Cartão de exemplo no celular** sem rascunho. Empurra o botão para mais longe; a linha sob o
  botão e a descrição carregam a promessa.
- **Movimento de entrada** da porta (o `DESIGN.md` permite). Não muda conversão; fica para um
  polimento.
- **Mudar o painel do `/login`.** Quem entra já é da casa.
