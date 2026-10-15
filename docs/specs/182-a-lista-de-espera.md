# Spec 182 · A lista de espera

**Tipo:** quem chega ao Rende sem convite (pelo cardápio de uma cliente, por busca, por link) deixa
nome e e-mail numa lista, recebe a posição na fila e um e-mail de boas-vindas que promete o
primeiro aviso quando abrirem vagas. O formulário é um componente só, usado no cadastro sem convite
nesta spec e nas páginas públicas na 184.
**Tamanho:** uma sessão.
**Origem:** o pedido do beta de 2026-10-15, item 4.
**Depende de:** 181 (`plataforma/beta` e `lerBeta`).
**Aprovações pedidas:** (1) **regras**: `listaDeEspera/{id}` trancado para todo cliente, como
`apelidos`; (2) **terceira exceção ao invariante** "todo dado mora em `contas/…`", no `CLAUDE.md`;
(3) **o texto da privacidade** (seção nova e versão nova em `textoLegal.ts`, `#d380`); (4) **a peça
de e-mail** `listaDeEspera`, pelo molde do `#d203`.
**Decisões a registrar:** duas, numeradas na sessão (a lista na raiz, com o e-mail em hash no id; a
lista é a única coisa que se apaga a pedido, fora a purga de conta).

---

## Problema

1. Com a 181, quem não tem convite bate numa porta fechada, e o Rende perde o contato.
2. Quem vê "feito com Rende" no cardápio de uma confeiteira e se interessa não tem onde deixar o
   nome.
3. A expectativa do lançamento precisa de uma lista para avisar no dia.

---

## 1 · O que esta spec decide

### O registro

`listaDeEspera/{id}`, lido e escrito só pelo Admin SDK:

```ts
interface NaListaDeEspera {
  email: string; // minúsculas, sem espaço
  nome: string; // até 80
  instagram?: string; // até 40, sem @
  origem: OrigemDaEspera; // "conheca" | "artigo" | "cardapio" | "cadastro" | "convite"
  posicao: number; // de `plataforma/beta.espera`, na transação
  criadaEm: Timestamp;
  privacidadeVersao: string;
  avisadaEm?: Timestamp; // do lançamento (186)
  v: number;
}
```

- **O id é o SHA-256 do e-mail normalizado**, em hex, os 32 primeiros caracteres. Um e-mail, uma
  entrada; o e-mail não aparece em id, caminho nem log.
- `normalizarEmail` e `esquemaListaDeEspera` (zod) em `domain/listaDeEspera.ts`, com teste;
  `sugerirEmail` (`#d366`) também vale aqui.

### A rota

`POST /api/lista-de-espera`, sem login:

- Corpo fora de forma: 400. Campo-isca `site` preenchido: `{ ok: true }` e nada gravado.
- Numa transação: se o documento já existe, nada muda; senão, `espera + 1` em `plataforma/beta` e o
  documento com essa `posicao`.
- **Responde sempre `{ ok: true, posicao }`**, com a posição dela, nova ou antiga. Quem digita o
  e-mail de outra pessoa sai sabendo só que ela está na fila, nada além.
- O e-mail sai por `after()`, só quando o documento nasce, com a chave `espera/{id}` (`#d202`).

### O e-mail

`listaDeEspera({ nome, posicao })` em `pecas.ts`, molde do `#d203`. O conteúdo, a ser passado pela
`humanizer` e aprovado:

- Assunto: "Você está na lista do Rende".
- "Oi, {nome}. Você é a {posicao}ª da fila."
- O que é o Rende em duas linhas (o preço que deixa sobra, os pedidos, o mês).
- "O Rende está em beta fechado, com 100 vagas por convite. Quando abrirem mais vagas, você é das
  primeiras a saber, por este e-mail."
- "Conhece alguém que já usa? Um convite dela vale mais que a fila." (sem botão).
- Pé: "Para sair da lista, responda este e-mail." e o link da privacidade.

### O formulário

`ListaDeEspera` em `components/site/`, componente de cliente, com `origem` por prop:

- Nome, e-mail, "Instagram do seu negócio (opcional)". `Campo` e `Botao` de sempre; o botão é o
  primário do bloco, "Entrar na lista".
- Embaixo do botão, em `label`: "Só usamos o seu e-mail para avisar das vagas. [Privacidade]".
- Depois do envio, o formulário dá lugar a "Pronto. Você é a {posicao}ª da fila. O e-mail de
  confirmação já saiu." (`role="status"`), e a escolha fica no aparelho (`rende:espera`, com
  `try`) para o formulário não reaparecer nas outras páginas.
- Sem rede ou 5xx: "Não deu para entrar na lista agora. Tente de novo em instantes."
- `origem` vem da página; `"cardapio"` quando o `rende:origem` da 114 existe.

### `/cadastro` sem convite

Fase `BETA`, sem `?convite=` e sem `rende:convite`: no lugar do formulário de conta,

- Título "O Rende está em beta fechado".
- "São 100 vagas, por convite de quem já usa. Restam {n}." (`fraseDasVagas`, 184; aqui pela
  `GET /api/beta`, abaixo).
- "Tenho um convite": um campo de código (`lerCodigo`, 181) que, válido na forma, recarrega a tela
  com `?convite=`. O código só é conferido de verdade no POST.
- `ListaDeEspera` com `origem="cadastro"`.
- As falhas `convite-usado`, `convite-invalido` e `sem-vaga` da 181 caem nesta mesma tela, com a
  frase delas no topo.

`GET /api/beta` devolve `{ fase, restam }`, com `Cache-Control: s-maxage=300`. É o que as telas de
cliente (cadastro, login) leem; as de servidor chamam `lerBeta()`.

### Sair da lista

- `npm run beta -- tirar-da-espera <email>` apaga o documento. **É a segunda exceção nomeada ao
  "nunca apagar documento"**: a lista não é dado de negócio, nada a referencia, e a LGPD dá a ela o
  direito de sair. `posicao` dos outros não muda.
- A privacidade ganha uma seção "Lista de espera": o que se guarda (nome, e-mail, Instagram), para
  quê (avisar das vagas e do lançamento), por quanto tempo (até 90 dias depois do lançamento, quando
  a lista é apagada pelo script da 186) e como sair. Versão nova em `textoLegal.ts`; a sessão
  propõe `relevante: false` (não muda nada para quem tem conta) e quem conduz o projeto confirma.

### A cota do Resend

O plano grátis manda 100 por dia, somando boas-vindas, senha, avisos do cron e a lista. A
confirmação sai na hora, e passar da cota faz o `enviarEmail` dar `"falhou"`, que não derruba a
rota: ela entra na lista sem e-mail. `npm run beta` passa a dizer quantas entraram hoje.
**Antes de qualquer divulgação que possa trazer mais de 50 pessoas num dia, o plano Pro.** Fica
escrito no `DEPLOY.md`.

---

## 2 · Antes de tocar em código

1. Ler `api/senha/route.ts` (rota sem login com resposta igual), `server/email.ts`, `pecas.ts`,
   `#d143`, `#d202`, `#d203`, `#d380` e `/privacidade`.
2. `/impeccable` com registro **brand**; `PRODUCT.md` e `DESIGN.md`.
3. Pedir as quatro aprovações; o texto do e-mail e da privacidade vão na mesma mensagem.

---

## 3 · Escopo

- `domain/listaDeEspera.ts` e o teste: normalização, esquema, o id em hash (vetor fixo), isca.
- `types/`: `NaListaDeEspera`, `caminhos.listaDeEspera(id)`.
- `api/lista-de-espera/route.ts`, `api/beta/route.ts`.
- `pecas.ts`: `listaDeEspera`, e a prévia em `/api/email/previa`.
- `components/site/ListaDeEspera.tsx`.
- `/cadastro`: o estado sem convite.
- `firestore.rules`, `CLAUDE.md` (invariantes), `textoLegal.ts`, `/privacidade`.
- `scripts/beta.mjs`: `tirar-da-espera` e a contagem do dia.
- `DEPLOY.md`: a nota da cota.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390px e 1280px, com a chave do Resend da sandbox.

1. `/cadastro` sem convite mostra a tela do beta; entrar na lista mostra a posição; o e-mail chega
   no Gmail claro e escuro.
2. O mesmo e-mail de novo, em outra aba: a mesma posição, nenhum segundo e-mail.
3. Digitar um código bem formado leva ao formulário de conta; um código usado volta à tela do beta
   com a frase.
4. Sem rede: a frase de falha, e o formulário continua preenchido.
5. Leitor de tela anuncia o "Pronto".
6. `tirar-da-espera` apaga, e `npm run beta` mostra uma a menos.

---

## Critérios de aceite

- [ ] Um e-mail, uma entrada, um e-mail de confirmação.
- [ ] A resposta não diz se o e-mail já estava lá antes.
- [ ] Nenhum cliente lê ou escreve `listaDeEspera`.
- [ ] Privacidade com a seção e a versão nova.
- [ ] `lint`, `typecheck`, `test` e `build` passam.
- [ ] Decisões registradas; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **Nome, e-mail e Instagram, e nada mais.** Cidade, o que vende e faturamento ajudariam a escolher
  quem chamar, mas cada campo derruba a taxa de quem termina. O Instagram já diz o que ela vende.
- **A posição na fila é dita.** É a expectativa que o pedido quer, e é um número verdadeiro.
- **Sair da lista por resposta ao e-mail, e não por link.** O link pede token assinado e rota
  (`#d207`); com centenas de pessoas, responder chega a uma pessoa que roda o script.
- **Sem captcha.** Isca e um documento por e-mail, como o freio do `#d161`. Se aparecer lixo, o
  limite por IP vem antes do captcha.

---

## Fora de escopo

- As páginas públicas com o formulário (184).
- Chamar gente da lista para vagas novas, antes do lançamento. Hoje: `semear` a conta de quem
  conduz o projeto e mandar os convites à mão.
- Indicar alguém para a lista.
- Dupla confirmação do e-mail (_double opt-in_).
