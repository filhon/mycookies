# Spec 042 · A senha nova, em casa

**Tipo:** uma tela nova de acesso (`/redefinir-senha`) e a configuração do e-mail de senha nova
no console do Firebase. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão de código, mais dez minutos de console de quem conduz o projeto.
**Origem:** crítica do `/impeccable` sobre `/login` (2026-09-25).
**Depende de:** a 041 (usa `CampoSenha`). O domínio próprio **não** é pré-requisito, mas o
remetente com o domínio do Rende (4.3) é, e ele é o que tira o e-mail do spam.
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. A mudança de console é de quem conduz
o projeto e vai para `docs/DEPLOY.md`.
**Duas decisões a registrar:** `#d196` e `#d197`.

---

## Problema

"Esqueci minha senha" funciona desde a 8A, e o caminho inteiro depois do toque é do Firebase,
não do Rende:

1. O e-mail chega de `noreply@{id-do-projeto}.firebaseapp.com`, com o texto padrão do modelo.
   O id do projeto é o nome antigo, de antes da marca (`#d122`).
2. O link abre `{id-do-projeto}.firebaseapp.com/__/auth/action`: página branca, formulário
   genérico, nenhum sinal do Rende. Para uma confeiteira que nunca viu esse endereço, parece
   golpe.
3. Depois de trocar a senha, a página diz que ela pode entrar com a senha nova e para aí: nenhum
   botão de volta, porque o envio não passa `continueUrl`.

Todo serviço que cobra assinatura faz esse caminho na própria casa: o e-mail com o nome do
produto, o link para o próprio domínio, e depois da senha nova ela já está dentro.

---

## 1 · O que esta spec decide

### A senha nova se cria no Rende — `#d196`

O modelo "Redefinição de senha" do Firebase ganha **URL de ação personalizada**
`https://{domínio do app}/redefinir-senha`. O Firebase acrescenta `mode`, `oobCode`, `apiKey` e
`lang`; a página faz o resto com `verifyPasswordResetCode` e `confirmPasswordReset`, que estão no
SDK instalado.

Pesado e recusado: **`continueUrl` no envio**, mantendo a página do Firebase. Resolve o item 3 e
deixa o 1 e o 2, que são o que parece golpe.

A URL personalizada vale para todos os modelos de e-mail do projeto. Hoje só a senha nova é
enviada (`#d142`: sem verificação de e-mail), então a página trata `resetPassword` e, para
qualquer outro `mode`, diz que o link não é de senha nova e leva para `/login`.

### Depois da senha nova, ela já entrou — `#d197`

`confirmPasswordReset` e, em seguida, `signInWithEmailAndPassword` com o e-mail que o
`verifyPasswordResetCode` devolveu e a senha que ela acabou de digitar; depois `router.replace("/")`.
Pedir para ela digitar a senha de novo na tela seguinte é o passo que ninguém quer.

O link do e-mail abre no navegador, não no app instalado. A tela de sucesso não existe (ela cai
em Hoje), então a frase vai **antes**, embaixo do botão: "Se você usa o Rende instalado, abra
por ele depois e entre com a senha nova."

---

## 2 · Antes de tocar em código

1. Ler `PRODUCT.md`, `DESIGN.md`, e usar `/impeccable` (registro **product**).
2. Ler `login/page.tsx` (depois da 041), `MolduraDeEntrada.tsx`, `CampoSenha` e `traduzirErroAuth`.
3. Ler a documentação do Firebase "Criar gerenciadores de ação de e-mail personalizados" e
   conferir os nomes dos parâmetros contra o SDK instalado.

---

## 3 · Escopo

### 3.1 A tela — `src/app/(auth)/redefinir-senha/page.tsx`

Client component dentro da `MolduraDeEntrada` (título "Senha nova"), com `useSearchParams` sob
`Suspense`. Três estados:

1. **Conferindo** (`verifyPasswordResetCode`): o esqueleto do formulário, sem spinner.
2. **Formulário**: descrição "Para {email}."; `CampoSenha` "Senha nova", `new-password`,
   `minLength` 6, dica "Pelo menos 6 caracteres."; primário "Salvar e entrar"; a frase do app
   instalado. Validação no envio, como a 041.
3. **Link que não serve** (`auth/expired-action-code`, `auth/invalid-action-code`, `mode`
   diferente, `oobCode` ausente): "Este link já foi usado ou venceu. Peça outro na tela de
   entrar." e o primário "Ir para a tela de entrar" → `/login`.

Sem rede em qualquer passo: a frase traduzida de sempre e o botão continua.

### 3.2 As mensagens — `AuthProvider.tsx`

`MENSAGENS` ganha `auth/expired-action-code` e `auth/invalid-action-code` com a frase do estado
3, e `auth/weak-password` continua servindo.

### 3.3 Fora da busca — `src/app/(auth)/redefinir-senha/layout.tsx`

Server component com `metadata.robots = { index: false, follow: false }`: a URL carrega o código
de uso único. Fora do sitemap.

### 3.4 O teste

Nenhum teste novo: não há domínio. Os existentes passam sem mudança.

---

## 4 · Console e deploy (quem conduz o projeto)

Vai para `docs/DEPLOY.md`, seção nova "E-mail de senha nova":

1. Authentication → Modelos → Redefinição de senha → idioma **português (Brasil)**.
2. Nome do remetente **Rende**; assunto **"Sua senha nova do Rende"**; corpo de três linhas:
   "Alguém pediu uma senha nova para a sua conta no Rende. Se foi você, toque no link. Se não
   foi, ignore este e-mail: a senha de hoje continua valendo."
3. URL de ação personalizada: `https://{domínio do app}/redefinir-senha`. **Só depois do deploy
   da tela**: trocar antes quebra a recuperação de quem pedir no meio.
4. Com o domínio próprio no ar: domínio personalizado do remetente (os registros de DNS que o
   console pede). Sem ele o remetente continua `firebaseapp.com` e o spam continua possível.

---

## 5 · Roteiro de navegador

`npm run build && npm start` não serve: o link aponta para o domínio configurado. O roteiro roda
na prévia da Vercel com o console apontando para ela, ou em produção depois do passo 3 de 4.

1. `/login`, "Esqueci minha senha": o e-mail chega de "Rende", em português.
2. O link abre `/redefinir-senha`, com o e-mail dela na descrição.
3. Senha com 5 caracteres: erro no campo. Com 8: cai em Hoje, já dentro.
4. O mesmo link de novo: estado 3.
5. `/redefinir-senha?mode=verifyEmail&oobCode=x`: estado 3.
6. App instalado: entrar com a senha nova funciona.
7. Celular a 390 px, nos dois temas; leitor de tela anuncia o erro do campo.

---

## Critérios de aceite

- [ ] `/redefinir-senha` com os três estados, `noindex`, sem Firebase fora dos três métodos de auth.
- [ ] Senha nova salva e entrada automática; link vencido ou usado com saída para `/login`.
- [ ] `docs/DEPLOY.md` com os quatro passos e a ordem (tela antes da URL).
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.rules` intocados.
- [ ] `#d196` e `#d197` escritos; `ESTADO.md` atualizado, com o passo 3 do console como pendência.

---

## 6 · Fora de escopo

- **Verificação de e-mail.** `#d142` continua: o trial é o portão.
- **Trocar a senha de dentro do app**, em `/configuracao`. Quem está dentro e quer trocar usa o
  mesmo link; vira tela se alguém pedir.
- **Mandar o e-mail por serviço próprio** (Resend, SES). O modelo do Firebase com o remetente
  do domínio resolve o que importa; serviço próprio é dependência e custo.

---

## Riscos

- **A ordem do deploy.** URL trocada antes da tela no ar é recuperação quebrada; o passo 3 de 4
  diz isso em negrito, e o `ESTADO.md` também.
- **Domínio trocado depois.** Se o domínio próprio chegar depois desta spec, a URL de ação muda
  junto. É uma linha no console e está no `DEPLOY.md`.

---

## Portão de conclusão

`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, os quatro, com o resultado
real relatado. O roteiro fica pendente até o passo 3 do console, e o `ESTADO.md` diz isso.
