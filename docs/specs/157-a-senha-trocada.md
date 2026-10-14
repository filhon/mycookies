# Spec 157 · A senha trocada

**Tipo:** `/redefinir-senha` fecha o ciclo. A tela de pronto depois de salvar (no lugar do
`router.replace("/")` direto), o link que não vale mais mandando outro ali mesmo, a sessão aberta
reconhecida, a rede que volta sozinha, o foco no campo e a senha óbvia recusada. **Nenhum campo
gravado, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica do `/impeccable` sobre `/redefinir-senha` com os prints de 2026-10-14.
**Depende de:** nada. A 158 (o aviso por e-mail) vem depois e acrescenta uma linha à tela de
pronto.
**Aprovações pedidas:** a lista de senhas recusadas e a frase da recusa (§ 1, `#d370`); a
revisão do `#d197` (tela de pronto).
**Decisões a registrar:** `#d368`, `#d369`, `#d370`.

---

## Problema

1. **O fim do fluxo não existe.** Ela toca em "Salvar e entrar" e cai em Hoje, sem nenhuma frase
   dizendo que a senha mudou. Google, Apple, Nubank, Stripe: todo serviço que cobra mensalidade
   fecha a troca com "Senha alterada". Pela regra do pico e do fim, o momento que fica é o último,
   e o último aqui é um salto sem explicação. Sem o pronto, a frase do app instalado foi parar
   **antes** do botão (`#d197`): todas leem, no print do celular, duas linhas de letra miúda sobre
   um caso que é de poucas, antes de saber se deu certo.
2. **O link que não vale mais é um beco.** "Este link já foi usado ou venceu. Peça outro na tela
   de entrar." Ela volta ao login, redigita o e-mail e procura "Esqueci minha senha". Slack,
   Notion e Netflix mandam outro link na própria tela. O caso mais comum de "já foi usado" é ela
   tocando de novo no mesmo e-mail depois de trocar a senha: está logada neste navegador, e a tela
   diz que algo deu errado.
3. **Sem rede, a tela espera um toque.** O app trata offline como normal (`PRODUCT.md`
   princípio 4), mas aqui a falha de rede vira texto vermelho e "Tentar de novo". Quando a rede
   volta, nada acontece.
4. **Erro só pela cor.** Os dois `<p role="alert" className="text-negative">` (falha ao conferir
   e falha ao salvar) não têm ícone. `DESIGN.md`: "Erro sem depender de cor: ícone + palavra + a
   saída."
5. **Todos os estados se chamam "Senha nova".** Inclusive o do link vencido, que não deixa criar
   senha nenhuma.
6. **A senha que se troca por esquecimento é a mais fraca.** Quem esqueceu escolhe a que não vai
   esquecer: `123456`, `senha123`, o próprio nome do e-mail. O Rende guarda preço, caixa e
   clientes de um negócio; o mínimo do Firebase (6) aceita qualquer uma delas. Google, GitHub e
   Microsoft recusam a senha comum na hora.
7. **O campo não vem com o foco.** A tela existe para uma coisa só; no desktop ela precisa clicar
   no campo antes de digitar.

**O que já é bom e fica:** "Para {email}." confirma a conta antes de digitar (muito serviço pago
não faz); um campo só, sem "confirmar senha", com o olho (`#d193`); `autocomplete="new-password"`
com o `username` escondido, que deixa o gerenciador sugerir e guardar; "Salvar e entrar"; o
esqueleto no lugar do giro; a senha salva e a entrada caída tratadas (`#d197`); o domínio e a
marca próprios (`#d196`).

---

## 1 · O que esta spec decide

### A tela de pronto: `#d368`

Revisa o `#d197` na parte "não há tela de sucesso". Continua: salvar e entrar no mesmo toque.

Depois de `entrar()`, a tela não navega. Novo `Estado`: `{ tipo: "pronta"; email }`.

- `history.replaceState(null, "", "/redefinir-senha")`: o código gasto sai da barra e do
  histórico. Recarregar cai no estado "já entrou" abaixo.
- Moldura: título **"Senha trocada"**, descrição "Você já entrou como **{email}**."
- Botão primário `lg` largura total, **"Abrir o Rende"**: `Link` com `replace` para `/`.
- Embaixo do botão, no lugar e no estilo da frase de hoje (`text-label text-ink-muted`,
  centrada): "Se o Rende pedir a senha em outro aparelho ou no app instalado, é esta nova."
  A frase é verdadeira nos dois casos: no Android o app instalado divide a sessão com o Chrome e
  já está dentro; no iPhone ele tem a dele e vai pedir. A frase atual sai do formulário.
- Foco no `h1` ao chegar (`tabIndex={-1}`), para o leitor de tela anunciar o pronto. Se a
  `MolduraDeEntrada` não expõe o `h1`, um `ref` opcional nela; nada mais muda na moldura.
- Sem redirecionamento automático. Um toque a mais é o preço da confirmação, e é o mesmo que o
  Google cobra.

### O link que não vale mais: `#d369`

`LinkQueNaoServe` passa a ter três caras, decididas na hora de montar:

| Caso                                                                              | Título                    | Descrição                                                              | Ação                                      |
| --------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Há `usuario` no `useAuth()`                                                       | "Você já entrou"          | "Este link já foi usado. Você está no Rende como **{usuario.email}**." | Primário "Abrir o Rende" (`/`, `replace`) |
| `auth/expired-action-code`                                                        | "Este link venceu"        | "Ele vale por uma hora. Mande outro para o seu e-mail."                | Formulário abaixo                         |
| Os outros (`invalid-action-code`, `user-not-found`, `mode` ou `oobCode` faltando) | "Este link não vale mais" | "Ele funciona uma vez. Mande outro para o seu e-mail."                 | Formulário abaixo                         |

O formulário: `Campo` "E-mail" (`type="email"`, `inputMode="email"`, `autoComplete="username"`,
`autoCapitalize="none"`, `spellCheck={false}`, `aria-required`), primário `lg` "Mandar outro
link", e a região `aria-live="polite"` sempre montada com a resposta. Embaixo, terciário `sm`
"Ir para a tela de entrar". A resposta é `AVISO_ENVIO`, a mesma do login, exista ou não a conta
(`#d143`). Validação no envio, como o login (`#d192`): vazio é "Escreva o seu e-mail.".

Para não haver dois donos da mesma lógica: `senhaPeloRende`, a reserva `sendPasswordResetEmail`
e `AVISO_ENVIO` saem de `login/page.tsx` para `src/components/auth/pedirSenhaNova.ts`, uma
função `pedirSenhaNova(email): Promise<string>` que devolve a frase a mostrar (o aviso, ou a
falha traduzida). O login passa a chamá-la; o comportamento dele não muda.

`Estado.invalido` ganha `motivo: "vencido" | "outro"`, preenchido pelo `codigoDe(falha)`.
`aoVencer` do formulário passa o motivo também.

### A rede que volta

No estado `sem-rede`: o parágrafo vira o do login sem rede (`CloudOff` em `text-attention`,
`text-label text-ink-muted`): "Sem internet agora. Conferir o link precisa de rede; a tela
tenta de novo quando ela voltar." Com `useConexao()` virando `true`, a tela refaz a conferência
sozinha (o mesmo `setTentativa`). "Tentar de novo" continua, porque `navigator.onLine` mente.
Quando a falha **não** é de rede (a frase traduzida de outra coisa), fica o texto de hoje com o
ícone de erro abaixo.

### Erro com ícone

A falha ao salvar (`falha` no `Formulario`) e a do `sem-rede` que não é rede ganham
`CircleAlert` (16 px, traço 1.75, `text-negative`, `aria-hidden`) antes da frase, em
`flex items-start gap-2`, como o erro dos termos da 156. O `erro` do `CampoSenha` fica como está:
mudar o `Envelope` é mexer em todo campo do app, e é outra spec.

### A senha óbvia: `#d370`

`senhaComum(senha: string, email: string): boolean` em `src/lib/domain/senha.ts` (arquivo novo,
puro). Compara em minúsculas, sem espaços nas pontas. Verdadeiro quando:

- está na lista fixa: `123456`, `1234567`, `12345678`, `123456789`, `1234567890`, `654321`,
  `123123`, `112233`, `102030`, `111111`, `000000`, `121212`, `abc123`, `abcdef`, `qwerty`,
  `senha`, `senha1`, `senha12`, `senha123`, `mudar123`, `123mudar`, `brasil`, `rende123`;
- é um caractere só repetido (`aaaaaa`, `999999`);
- é igual à parte local do e-mail (`maynara` para `maynara@gmail.com`), com ou sem `123` no fim.

Na tela, no envio e antes do `confirmPasswordReset`, com a mesma mecânica do "menos de 6"
(`setErroSenha`, `focarPrimeiroErro`): **"Essa senha é das primeiras que alguém tenta. Escolha
outra."** Não há medidor nem lista de regras na tela: a dica continua "Pelo menos 6
caracteres.", e a recusa só aparece para quem caiu nela.

`/cadastro` usa a mesma função, no mesmo ponto da validação de senha: recusar no reset e aceitar
no cadastro seria a regra valendo pela metade. Senhas já gravadas não são tocadas.

**Teste** em `tests/domain/senha.test.ts`: cada item da lista; `AAAAAA` e ` 123456`
(minúsculas e pontas); `maynara` e `maynara123` com `maynara@gmail.com`; `maynara` com
`outra@gmail.com` (falso); `cookie2026` (falso); `Brasil` (verdadeiro).

### O foco

`autoFocus` no `CampoSenha` do formulário. No iPhone o teclado não sobe sem toque; no Android e
no desktop, ela já digita.

---

## 2 · Antes de tocar em código

1. Conferir que `CampoSenha` repassa `autoFocus` pelo `...props` (repassa: vai para o `input`).
2. Conferir se `useAuth()` já expõe `usuario` antes de `carregando` acabar; o estado "já entrou"
   espera `carregando === false` para decidir, senão pisca o formulário de e-mail.
3. Conferir onde o `/cadastro` valida a senha hoje (o ramo do `auth/weak-password` no envio) para
   pôr `senhaComum` ao lado, e não num segundo lugar.

## 3 · Escopo

- `src/lib/domain/senha.ts`: `senhaComum`. Teste.
- `src/components/auth/pedirSenhaNova.ts`: a lógica que sai do login.
- `src/app/(auth)/redefinir-senha/page.tsx`: estados `pronta` e `invalido` com motivo, o
  formulário de outro link, a rede que volta, os ícones, o `autoFocus`, a recusa.
- `src/app/(auth)/login/page.tsx`: passa a usar `pedirSenhaNova`.
- `src/app/(auth)/cadastro/page.tsx`: a recusa.
- `MolduraDeEntrada`: só o `ref` do `h1`, se preciso.

## 4 · Roteiro de navegador

1. Celular, link novo: o campo com foco (Android), "Salvar e entrar", a tela "Senha trocada" com
   o e-mail; a barra sem `oobCode`. "Abrir o Rende" leva a Hoje, e voltar não retorna à tela.
2. Recarregar a tela de pronto: "Você já entrou".
3. Abrir o mesmo link outra vez em aba anônima: "Este link não vale mais", mandar outro com o
   e-mail certo e com um que não tem conta: a mesma frase nos dois; só o primeiro recebe.
4. Link com mais de uma hora: "Este link venceu".
5. DevTools offline ao abrir o link: o `CloudOff` e a frase; voltar a rede: o formulário aparece
   sem toque.
6. `123456`, `maynara123` (com o e-mail dela) e `aaaaaa`: a recusa no campo, foco nele. Uma senha
   boa passa. O mesmo no `/cadastro`.
7. Leitor de tela: o pronto é anunciado pelo título; a resposta do "Mandar outro link" é lida.
8. Login: "Esqueci minha senha" continua mandando e dizendo a mesma frase.
9. iPhone com o Rende instalado: depois do pronto, o app pede a senha e aceita a nova.

## 5 · Critérios de aceite

- [x] `senhaComum` testada nos casos da seção 1.
- [x] Nenhum estado da tela termina sem saída: pronto, vencido, usado, já dentro, sem rede.
- [x] O código gasto não fica na barra depois do pronto.
- [~] Nenhum erro só pela cor nesta tela.
- [x] O login manda o link exatamente como antes, agora por `pedirSenhaNova`.
- [x] Portão; `#d368`, `#d369`, `#d370`; `ESTADO.md`; o `#d197` com a nota de revisão.
      Nenhuma linha em `novidades.ts` (é tela de fora do app).

## 6 · Fora de escopo

- **O e-mail avisando que a senha mudou.** É a 158.
- **Consultar senhas vazadas (Have I Been Pwned).** Rede no envio e um serviço externo; a lista
  cobre o caso de quem escolhe a mais fácil.
- **Subir o mínimo para 8.** Muda a política de senha do projeto no Firebase e o cadastro de quem
  já tem conta; decisão de produto, não de tela.
- **Medidor de força.** O `#d366` já recusou; a recusa pontual faz o trabalho sem ruído.
- **Ícone no erro do `Envelope`.** Vale para todo campo do app; spec própria.
- **O painel de marca no desktop.** A frase de venda do painel aparece também aqui, onde não serve
  a ninguém; mexer nele é mexer nas três telas de acesso.
- **Pedir para sair quando o link é de outra conta** (`#d197`, consequência). Continua sem caso.
