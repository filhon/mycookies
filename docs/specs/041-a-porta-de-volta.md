# Spec 041 · A porta de volta

**Tipo:** cromo da tela de entrar e da moldura das telas de acesso. Um componente de interface
novo (`CampoSenha`), uma prop nova em `MolduraDeEntrada`, uma constante em `responsavel.ts`.
**Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência, nenhuma rota.**
**Tamanho:** uma sessão.
**Origem:** crítica do `/impeccable` sobre `/login` (2026-09-25), 21/40 nas heurísticas de
Nielsen. O detector automático não achou nada; o que falta não é padrão proibido, é o que os
serviços pagos por assinatura põem nessa tela e o Rende não pôs.
**Depende de:** nada. Antes da sessão, **quem conduz o projeto diz o número de WhatsApp de
ajuda** (3.6); sem número, o link é o e-mail de `RESPONSAVEL`.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
**Quatro decisões a registrar:** `#d192` a `#d195`.

---

## Problema

Quem abre `/login` já é cliente. O app instalado sem sessão cai aqui, e o navegador cai em
`/conheca` (`(app)/layout.tsx`, `#d172`). É a tela que a Maynara vê depois de trocar de
celular, depois de sair para liberar espaço, depois de a ajudante usar o aparelho. Não é
vitrine: é a porta de casa. Hoje ela tem cinco defeitos que um serviço que cobra todo mês não
deixa passar:

1. **O botão nasce desbotado.** `disabled={!email || !senha}` pinta o primário de âmbar lavado
   com o texto quase invisível: parece app quebrado. Pior: o preenchimento automático do Chrome
   não entrega o valor ao JavaScript antes do primeiro toque na página, então com a senha salva
   no aparelho o campo aparece cheio, o estado continua vazio e o primeiro toque em "Entrar" não
   faz nada.
2. **Não dá para ver a senha.** Dedo com farinha, teclado de celular, senha que ela digita uma
   vez por mês. O `#d142` diz que "o navegador mostra o que ela digita": só o Edge mostra. Chrome
   e Safari, não.
3. **O erro não diz o que fazer.** "E-mail ou senha incorretos." e acabou. A saída ("Esqueci
   minha senha") está dois blocos abaixo, e o `DESIGN.md` pede "ícone + palavra + a saída".
4. **Sem internet, ela descobre depois de digitar tudo.** O produto é offline por padrão
   (`PRODUCT.md`, princípio 4), mas entrar exige rede, e a tela não avisa antes.
5. **Trancada para fora, não há a quem pedir.** Nenhum contato, nenhum termo, nenhuma
   privacidade. Para uma dona de negócio sem equipe técnica, o link de ajuda é o suporte.

E um de desenho: **no desktop, 42% da tela é tinta vazia.** Logotipo em cima, frase embaixo,
nada no meio. É exatamente o split de login do "dashboard SaaS escuro genérico" que o
`PRODUCT.md` lista como anti-referência. O Rende tem a frase que o produto existe para dizer, com
o número; o painel não a mostra.

---

## 1 · O que esta spec decide

### O botão está sempre ativo; a validação é no envio — `#d192`

O primário nunca fica `disabled` por campo vazio (só `carregando` durante o envio). O envio lê o
formulário por `FormData`, e não o estado do React: é o que resolve o preenchimento automático,
porque o valor do campo existe no DOM mesmo quando o `onChange` não disparou. Campo vazio vira
erro no próprio campo ("Escreva o seu e-mail.", "Escreva a sua senha.") e `focarPrimeiroErro()`,
que já existe em `Campo.tsx`.

Os dois `useState` de e-mail e senha saem. "Esqueci minha senha" lê o e-mail pelo mesmo
formulário (`form.elements`).

Sem asterisco: com dois campos, os dois obrigatórios, o `*` é ruído. O login passa
`aria-required` em vez de `required` ao `Campo` (o asterisco é desenhado por `required`).

### Mostrar a senha, no login e no cadastro — `#d193`

`CampoSenha`, em `src/components/ui/Campo.tsx`, ao lado de `Campo`: o mesmo envelope, e um botão
dentro do campo, à direita, de 44×44, com `Eye` / `EyeOff` (Lucide, 1.75), `aria-pressed` e
`aria-label` "Mostrar senha" / "Esconder senha". Troca `type` entre `password` e `text`. Começa
escondida. O `sufixo` de `Campo` não serve: é `pointer-events-none`.

Usado no login (`current-password`) e no cadastro (`new-password`). O `#d142` ganha uma linha:
"sem confirmar senha" continua, e o motivo passa a ser o botão de mostrar, e não o navegador.

### O erro traz a saída — sem decisão nova

Quando a falha é de credencial (`auth/invalid-credential`, `auth/wrong-password`,
`auth/user-not-found`) ou de excesso de tentativa (`auth/too-many-requests`), embaixo da frase
aparece o terciário **"Mandar link para criar senha nova"**, que chama o `recuperarSenha` que já
existe, com o e-mail que está no campo. Falha de rede não ganha o botão: ganha o aviso de 3.5.

A frase continua em `text-negative`, sem ícone, como todo erro de formulário do app hoje
(`SoNoCompleto`, `TelaConfiguracao`, `MeusDados`). Pôr ícone só aqui seria inconsistência; é
texto, e cor não é o único portador.

### O painel de marca mostra a conta — `#d194`

`MolduraDeEntrada` ganha `painel?: ReactNode`, desenhado no `aside` entre o logotipo e a frase.
O login e o cadastro passam `<ContaAberta parada />`, o mesmo bloco de `/conheca`: custo, faixa
de composição, preço sugerido com o ponto. `/assinatura` não passa nada e fica como está.

Pesados:

1. **Depoimento.** Serve à venda, e quem está aqui já comprou.
2. **Novidades do produto**, como o Linear faz. O Rende não tem notas de versão, e criar um
   canal para preencher um painel é o rabo abanando o cachorro.
3. **A conta de exemplo.** Escolhido. É a frase do produto com o número, sem nenhum dado novo,
   com um componente que já existe e não importa Firebase (040, 3.3). É o que tira o painel do
   genérico.

Abaixo de 720 px de altura de janela o cartão some e fica a frase
(`[@media(max-height:719px)]:hidden`): notebook pequeno não pode empurrar a frase para fora.
No celular o `aside` já não existe: nada muda lá.

### Ajuda, termos e privacidade no pé das telas de acesso — `#d195`

Rodapé da `MolduraDeEntrada`, em `text-label text-ink-muted`, nas três telas:
**"Não consegue entrar? Fale com a gente"** · Termos · Privacidade.

"Fale com a gente" abre `https://wa.me/{RESPONSAVEL.whatsapp}?text=Oi%2C%20n%C3%A3o%20estou%20conseguindo%20entrar%20no%20Rende.`
em aba nova. WhatsApp e não e-mail porque é onde ela já conversa com as clientes, e porque a
confeiteira presa para fora quer resposta hoje. Sem `whatsapp` em `RESPONSAVEL`, o link é
`mailto:` com o e-mail que já está lá.

O texto pronto não leva o e-mail dela: quem abre o link decide o que contar.

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, e usar `/impeccable` (registro **product**).
2. Ler `src/app/(auth)/login/page.tsx`, `cadastro/page.tsx`, `MolduraDeEntrada.tsx`,
   `Campo.tsx`, `ContaAberta.tsx` e `useConexao` em `src/lib/hooks/useDispositivo.ts`.
3. Conferir com `rg "@/lib/firebase" src/components/site/ContaAberta.tsx src/components/fichas/FaixaDeComposicao.tsx`
   que o painel continua sem Firebase.

---

## 3 · Escopo

### 3.1 O envio — `login/page.tsx`

- `<form>` com `name="email"` e `name="senha"` nos campos, lidos por `FormData` em `aoEnviar`.
- Vazio: `erro` no `Campo` correspondente, foco nele, nenhuma chamada ao Firebase.
- `Botao` primário sem `disabled`; `carregando={enviando}` continua.
- `recuperarSenha` lê `form.elements.namedItem("email")`.

### 3.2 `CampoSenha` — `src/components/ui/Campo.tsx`

Como em `#d193`. O botão não envia o formulário (`type="button"`), não rouba o foco do campo ao
tocar (`onMouseDown={e => e.preventDefault()}`) e o campo ganha `pr-12` para o texto não passar
por baixo do ícone.

### 3.3 O erro com a saída

`traduzirErroAuth` continua igual. A página guarda o código da falha junto com a frase e decide
o botão por ele (uma lista de quatro códigos no próprio arquivo).

### 3.4 O painel — `MolduraDeEntrada`

`painel?: ReactNode`. O `aside` passa a `justify-between` com três filhos: logotipo, painel,
frase. O login e o cadastro passam `<ContaAberta parada className="max-w-md" />`.

### 3.5 Sem internet — `login/page.tsx`

Com `useConexao()` falso, uma linha acima do formulário no desenho de `AvisoLeituraSemRede`
(`CloudOff` em `text-attention`, frase em `text-label text-ink-muted`): **"Sem internet agora.
Entrar precisa de rede uma vez; depois o Rende funciona sem ela."** Não há componente de faixa
compartilhado, e esta spec não cria um. O botão continua ativo: `navigator.onLine` mente, e o
erro de rede do Firebase continua traduzido.

### 3.6 O rodapé — `MolduraDeEntrada` e `responsavel.ts`

- `RESPONSAVEL.whatsapp?: string`, só dígitos com DDI, preenchido por quem conduz o projeto.
- O rodapé de `#d195` no fim do `main`, centrado, com 8 px entre os alvos e cada link com 44 px
  de altura mínima.
- O "Ainda não tem conta? Criar minha conta" do login continua acima dele.

### 3.7 O teste

Nenhum teste novo: não há domínio nesta spec. Os existentes passam sem mudança.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, a 390 px e a 1280 × 800, nos dois temas.

1. Chrome com senha salva para o site: abrir `/login`, os campos aparecem cheios, **um** toque em
   "Entrar" entra.
2. Tela limpa: o botão "Entrar" é âmbar cheio. Tocar com tudo vazio: erro no e-mail, foco nele.
3. Senha: tocar no olho mostra; tocar de novo esconde; o foco fica no campo; o leitor de tela lê
   "Mostrar senha, botão de alternância, não pressionado".
4. Senha errada: a frase e, embaixo, "Mandar link para criar senha nova"; tocar manda o link e
   mostra o aviso de sempre.
5. Modo avião: o aviso aparece antes de digitar; tentar entrar dá a frase de rede, sem o botão
   do link.
6. 1280 × 800: o painel mostra logotipo, a conta e a frase, sem rolar. 1280 × 700: sem a conta.
7. "Fale com a gente" abre o WhatsApp (ou o e-mail) com a frase pronta, em aba nova.
8. `/cadastro`: o olho funciona com `new-password`; o painel mostra a conta.
9. `/assinatura`: painel como antes, rodapé novo.

---

## Critérios de aceite

- [ ] Primário nunca `disabled` por campo vazio; envio lê `FormData`; vazio vira erro no campo.
- [ ] Sem asterisco no login.
- [ ] `CampoSenha` no login e no cadastro, 44×44, `aria-pressed`, sem roubar foco.
- [ ] Erro de credencial e de excesso de tentativa com o terciário do link; de rede, sem.
- [ ] Aviso de sem internet com ícone e frase, sem bloquear o botão.
- [ ] Painel com `ContaAberta parada` no login e no cadastro, escondido abaixo de 720 px de altura.
- [ ] Rodapé com ajuda, termos e privacidade nas três telas de acesso.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.rules` intocados.
- [ ] `#d192` a `#d195` escritos; a linha nova no `#d142`; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Entrar com o Google.** É a 043.
- **A página de senha nova com a cara do Rende.** É a 042.
- **Lembrar o último e-mail no aparelho.** O navegador e o gerenciador de senha já fazem. Volta
  se o roteiro mostrar ela digitando o e-mail inteiro toda vez.
- **Aviso de Caps Lock.** Com o botão de mostrar, ela vê.
- **Link do logotipo para `/conheca`.** O app instalado não é vitrine (`#d172`).
- **A conta dela no painel do cadastro** (o rascunho da 040 no lugar do exemplo). É o passo
  seguinte natural; pede a `contaDaPorta` no painel e fica para quando a 038 mostrar gente
  chegando da calculadora ao cadastro no desktop.
- **Ícone nas mensagens de erro de formulário.** Se entrar, entra no app inteiro, numa spec só.

---

## Decisões desta spec que são fáceis de rejeitar

- **O exemplo no painel do login.** Para quem já é cliente, o número de um cookie que não é o
  dela pode ser só enfeite. Se o roteiro mostrar isso, o painel do login volta a ser só a frase e
  o cartão fica no cadastro.
- **WhatsApp pessoal como suporte.** Serve enquanto são poucas contas; quando a ajuda virar
  volume, troca-se o número, não a tela.

---

## Riscos

- **O preenchimento automático variar por navegador.** O passo 1 do roteiro roda no Chrome do
  Android e no Safari do iPhone, com o app instalado e no navegador.
- **O cartão no escuro.** `ContaAberta` é `bg-surface` sobre `brand-800`; no tema escuro as duas
  superfícies ficam próximas. Conferir no passo 6 e, se sumir, `border-line-strong` no cartão
  só dentro do painel.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado, mais os passos 1 a 9 do roteiro.
