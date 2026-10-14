# Spec 158 · O aviso da senha trocada

**Tipo:** um e-mail novo, "A senha do Rende foi trocada", que sai logo depois da troca, com dia,
hora e o que fazer se não foi ela. Uma peça em `pecas.ts`, uma rota autenticada e uma chamada na
tela de pronto da 157. **Nenhum campo gravado, nenhuma regra, nenhum índice, nenhuma
dependência.**
**Tamanho:** uma sessão (curta).
**Origem:** crítica do `/impeccable` sobre `/redefinir-senha` com os prints de 2026-10-14.
**Depende de:** 157 (a tela de pronto, onde a frase do aviso entra).
**Aprovações pedidas:** o texto da peça.
**Decisões a registrar:** `#d371`.

---

## Problema

Hoje a senha muda e ninguém fica sabendo. Se quem trocou não foi ela (alguém com acesso à caixa
de e-mail dela por um momento, um celular emprestado com o Gmail aberto), ela descobre quando o
Rende pedir a senha e a dela não funcionar, dias depois, sem saber o que aconteceu. Google,
Nubank, Netflix, Spotify, Hotmart: todo serviço com assinatura manda "Sua senha foi alterada"
na hora, porque é o único sinal que chega a quem não estava na tela. Para o Rende, que guarda o
preço, o caixa e as clientes do negócio dela, e cobra por isso, é o mínimo que se espera.

A troca derruba os outros aparelhos (o Firebase revoga os tokens de atualização na mudança de
senha); o aviso é também onde isso fica explicado.

---

## 1 · O que esta spec decide: `#d371`

### A peça

`senhaTrocada({ email, quando })` em `src/lib/email/pecas.ts`, com `moldura`, `titulo`, `nota`
e `texto` como a `senhaNova`. `quando` é `Date`; a data sai no fuso de Brasília, como as outras
peças com data.

- **Assunto:** "A senha do Rende foi trocada"
- **Preheader:** "Se foi você, está tudo certo."
- **Título:** "Senha trocada"
- **Corpo:** "A senha da conta **{email}** no Rende foi trocada em {14 de outubro, às 15:32}
  (horário de Brasília). Se foi você, está tudo certo: não precisa fazer nada."
- **Segundo parágrafo:** "Nos outros aparelhos, o Rende vai pedir a senha nova."
- **Nota "Não foi você?":** "Responda este e-mail agora e peça uma senha nova na tela de entrar
  do Rende. A resposta chega a uma pessoa." Responder funciona porque o `reply_to` já é
  `RESPONSAVEL.email` (`#d208`). Sem botão: o único botão de um e-mail de segurança que diz "não
  fui eu" teria de desfazer algo, e não há o que desfazer sem a pessoa.
- **Pé:** "Este e-mail sai sempre que a senha da conta muda."

Não se desliga (`#d207`: é do funcionamento da conta, como a senha nova). A peça entra em
`/api/email/previa` ao lado das outras.

### A rota

`POST /api/senha/trocada`, sem corpo, com `Authorization: Bearer <ID token>`.

1. `conferirToken` → sem login, 401.
2. `adminAuth().getUser(uid)`. Só manda se `tokensValidAfterTime` for de **até 15 minutos
   atrás**: a rota não é um botão de mandar e-mail para quem tem login, é a confirmação de uma
   troca que acabou de acontecer.
3. Para `user.email` (do registro, nunca do corpo), `chave:
senha-trocada/{uid}/{tokensValidAfterTime}`: duas chamadas pela mesma troca, um e-mail.
4. Responde `{ ok: true }` em todos os casos com login, mandando ou não; falha do Resend é
   `console.warn` e o mesmo `ok`. A tela não espera nem mostra nada sobre isso.

Sem credencial do Admin (`credencialDisponivel()` falso): `ok` e nada sai.

### A tela

Na 157, logo depois de `entrar()` dar certo, `fetch("/api/senha/trocada", …)` com o token do
`usuario`, **sem `await` na passagem para o pronto**: o pronto não espera o e-mail. A tela de
pronto ganha, antes da frase dos outros aparelhos: "Mandamos um aviso para **{email}**." Ela
aparece sempre: se o e-mail não sair, a frase é falsa por um e-mail, e a alternativa (esperar a
rota) atrasa o pronto por uma ida ao Resend.

O caminho "senha salva, entrada caída" (`#d197`) não manda: sem token, sem rota. Quando ela
entrar pelo "Salvar e entrar" seguinte, manda, desde que dentro dos 15 minutos.

---

## 2 · Antes de tocar em código

1. **Provar que `tokensValidAfterTime` muda no `confirmPasswordReset`.** Numa conta de teste:
   `getUser(uid).tokensValidAfterTime` antes, trocar a senha pela tela, ler de novo. Se não
   mudar, **parar e perguntar**: sem esse sinal a rota não tem como saber que houve troca, e a
   alternativa (a tela dizer que trocou) abre a rota para quem tem login.
2. Ver como `mesFechado` formata data no fuso de Brasília e usar o mesmo.

## 3 · Escopo

- `src/lib/email/pecas.ts`: `senhaTrocada`.
- `src/app/api/senha/trocada/route.ts`: a rota.
- `src/app/api/email/previa/route.ts`: a peça na prévia.
- `src/app/(auth)/redefinir-senha/page.tsx`: a chamada e a frase.

## 4 · Roteiro

1. `/api/email/previa`: a peça no Gmail do celular e no do desktop, claro e escuro.
2. Trocar a senha pela tela: o aviso chega uma vez, com a hora certa de Brasília.
3. Chamar a rota de novo com o mesmo token, em seguida: nenhum segundo e-mail.
4. Chamar a rota com um token de uma conta que não trocou a senha: `ok` e nada sai.
5. Sem token: 401.
6. Responder o aviso: chega ao `RESPONSAVEL.email`.
7. Num segundo aparelho logado antes da troca: em até uma hora o Rende pede a senha.

## 5 · Critérios de aceite

- [x] O aviso sai só depois de uma troca de verdade, uma vez por troca, para o e-mail do registro.
- [x] O pronto da 157 não espera o e-mail.
- [x] Portão; `#d371`; `ESTADO.md`. Nenhuma linha em `novidades.ts`.

## 6 · Fora de escopo

- **Botão "não fui eu" que bloqueia a conta.** Exige desabilitar o usuário pelo servidor com um
  link assinado, e quem destrava é uma pessoa de qualquer jeito; responder o e-mail chega nela
  hoje.
- **Aparelho, cidade ou navegador no aviso.** Pede o IP ou o `user-agent` na rota e uma frase que
  costuma errar a cidade; o dia e a hora bastam para ela reconhecer.
- **Avisar quando o e-mail da conta mudar.** O Rende não troca e-mail hoje.
- **Aviso de entrada em aparelho novo.** Spec própria, se a `metricas` mostrar conta com mais de
  um login.
