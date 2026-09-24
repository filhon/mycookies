# Spec 038 · O que a página mede

**Tipo:** um componente de script nas páginas públicas e no cadastro, contando visitas pela
Vercel; um parágrafo em `/privacidade`. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** meia sessão. Publica junto com a 036, para a primeira semana já ter número.
**Origem:** crítica da página de venda (2026-09-24): sem saber onde a visitante desiste, toda
mudança nas specs 039 e 040 é chute. `scripts/metricas.mjs` conta contas criadas; ninguém conta
quem chegou e não criou.
**Depende de:** a 036 e a 037 (as duas páginas públicas e o `Topo`).
**Aprovações pedidas:** nenhuma, **se** o script direto da Vercel servir (`#d180`). Se não
servir, `@vercel/analytics` é dependência de produção e **pede aprovação** antes de entrar.
**Uma decisão a registrar:** `#d180`.

---

## Problema

A página vai ao ar e a pergunta seguinte é "está funcionando?". Hoje só existe a ponta do funil:
a conta criada. Entre "alguém abriu o link" e "alguém criou a conta" há três portas (a página, o
botão, o formulário), e não se sabe em qual delas a visitante fica.

O que se quer saber, uma vez por mês:

1. Quantas pessoas abriram `/conheca` e `/como-calcular-o-preco-do-cookie`, e de onde vieram
   (WhatsApp, Instagram, Google, chat de IA).
2. Quantas chegaram a `/cadastro`.
3. Quantas criaram a conta (`npm run metricas`, já existe).

A divisão 2 ÷ 1 diz se a página convence; 3 ÷ 2 diz se o formulário atrapalha.

---

## 1 · O que esta spec decide

### A visita contada pela Vercel, sem pacote, só nas páginas públicas — `#d180`

Pesados:

1. **Google Analytics / Meta Pixel.** Cookie, banner de consentimento, dado indo para
   anunciante. A 036 e a 037 recusaram pelo mesmo motivo, e a recusa continua.
2. **Contar no Firestore.** Uma escrita por visita anônima exige abrir a regra para escrita sem
   login: mexe nas regras de segurança e convida abuso.
3. **Vercel Web Analytics.** Sem cookie, agregado, no mesmo lugar do deploy. **Escolhido.**

Sem o pacote `@vercel/analytics`: a Vercel serve o próprio script em `/_vercel/insights/script.js`
em todo deploy com o Web Analytics ligado, e a documentação dela dá a forma com duas tags para
site sem o pacote. O pacote é um invólucro disso.

**Só nas páginas públicas e no cadastro.** O script, uma vez carregado, segue a navegação do
lado do cliente: quem cria a conta e cai em `/fichas` continuaria sendo contado dentro do app. O
filtro `beforeSend` da própria Vercel descarta todo evento cujo caminho não seja um destes três:

```ts
const CAMINHOS_MEDIDOS = [
  "/conheca",
  "/como-calcular-o-preco-do-cookie",
  "/cadastro",
];
```

O app não é medido. Uso do app se mede pelo que ela grava, e isso `metricas` já lê.

**O plano da Vercel importa.** No Hobby, o Web Analytics conta páginas e origens; evento próprio
("tocou no botão", "usou a calculadora") é recurso de plano pago. Esta spec só precisa de página
e origem. **A sessão confere o que o plano atual oferece no painel antes de codificar** e anota
no `ESTADO.md`.

---

## 2 · Antes de tocar em código

1. No painel da Vercel, **quem conduz o projeto** liga o Web Analytics do projeto (Project →
   Analytics → Enable). Sem isso o script responde 404 e nada é contado; o código não quebra.
2. Ler a página "Web Analytics › Quickstart", seção para site sem framework, e a referência de
   `beforeSend`, na documentação da Vercel do dia. **Se a forma com tags tiver mudado ou não
   aceitar `beforeSend`, a sessão para e pede aprovação para `@vercel/analytics`** (é o mesmo
   filtro, em `<Analytics beforeSend={…} />`).
3. Ler `src/components/site/Moldura.tsx` e `src/components/auth/MolduraDeEntrada.tsx`.

---

## 3 · Escopo

### 3.1 O componente — `src/components/site/Medicao.tsx`

Server component que renderiza duas `next/script`, `strategy="afterInteractive"`:

1. Uma inline (`id="medicao-fila"`) que cria a fila `window.va` e registra o `beforeSend` com a
   lista `CAMINHOS_MEDIDOS`: evento cujo `new URL(evento.url).pathname` não está na lista volta
   `null`.
2. `src="/_vercel/insights/script.js"`.

Só renderiza quando `process.env.VERCEL_ENV === "production"`: prévias e o `npm start` local não
contam visita.

### 3.2 Onde entra

- `Topo`, em `Moldura.tsx`: cobre `/conheca` e `/como-calcular-o-preco-do-cookie`.
- `src/app/(auth)/cadastro/page.tsx`, no fim do JSX. `/login` fica fora: quem entra já é da casa.

### 3.3 A privacidade — `src/app/(auth)/privacidade/`

Um parágrafo, na seção que lista o que o sistema coleta:

> Nas páginas públicas do Rende e na tela de criar conta, contamos visitas de forma agregada,
> pela Vercel: qual página foi aberta, de que site a pessoa veio, o país e o tipo de aparelho.
> Não usamos cookie para isso, não identificamos quem visitou, e nada disso é contado dentro do
> aplicativo.

**Passa pela revisão de quem conduz o projeto**, como o resto do texto (`#d171`). A data de
atualização da política muda.

### 3.4 Documentação

- `#d180` em `docs/DECISOES.md`.
- `docs/DEPLOY.md`: "ligar o Web Analytics no painel" antes do primeiro deploy da 036.
- `docs/ESTADO.md`: a seção da 038, o que o plano da Vercel oferece, e a próxima ação: uma linha
  por mês com visitas de `/conheca`, da página do preço, de `/cadastro` e as contas de
  `metricas`, e as três origens que mais trouxeram gente.

---

## 4 · Roteiro de navegador

Na prévia da Vercel com `VERCEL_ENV` forçado, ou no primeiro deploy de produção:

1. `/conheca` aberta: na aba Rede, `script.js` carregado e uma chamada de visita.
2. Toque em "Começar o teste": `/cadastro` gera outra chamada (navegação do cliente).
3. Criar uma conta de teste e cair em `/fichas`: **nenhuma** chamada nova.
4. No painel, depois de alguns minutos, as três páginas e nenhuma do app.

---

## Critérios de aceite

- [x] O script só aparece em produção, nas duas páginas públicas e em `/cadastro`.
- [~] Nenhuma visita do app chega ao painel (`beforeSend`).
- [ ] Nenhum cookie novo no navegador (DevTools → Application → Cookies).
- [x] `package.json` intocado, ou a aprovação do pacote registrada.
- [x] Parágrafo novo em `/privacidade`, revisado.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] `#d180`, `ESTADO.md` e `DEPLOY.md` atualizados.

---

## Fora de escopo

- **Evento próprio** (clique no botão, uso da calculadora). Pede plano pago. A 040 mede a
  calculadora pela conta criada (`origem`), que é a pergunta que importa.
- **Medir o app.** Uso se mede pelo que ela grava.
- **Teste A/B.** Com o tráfego de indicação, nenhuma variante chega a número que decida.
- **UTM nos links.** A origem que a Vercel mostra basta enquanto o canal for gente mandando link.

---

## Decisões desta spec que são fáceis de rejeitar

- **Vercel e não um contador próprio.** Se o painel for pouco, a próxima opção é Plausible (pago,
  europeu, sem cookie), no mesmo lugar do componente.
- **`/login` fora.** Quem entra já tem conta; se um dia valer medir retorno, é uma linha na lista.

---

## Riscos

- **O script da Vercel muda de forma.** A sessão confere a documentação do dia (seção 2); se o
  filtro não funcionar, o app seria medido, e isso é o que não pode acontecer: nesse caso o
  componente sai do cadastro e fica só no `Topo`.
- **Número pequeno demais para decidir.** Com dezenas de visitas por mês, a taxa oscila. O
  `ESTADO.md` anota o número bruto, não só a porcentagem.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado real
relatado. O roteiro roda no primeiro deploy de produção; até lá, o passo 3 (nada contado no app)
fica como pendência no `ESTADO.md`.
