# Spec 156 · O e-mail que chega

**Tipo:** o formulário de `/cadastro` mais leve e mais difícil de errar: a sugestão de e-mail
quando o domínio parece digitado errado ("gmail.con" → "gmail.com"), os asteriscos fora (como no
login, `#d192`) e a caixa dos termos sem a moldura que a faz parecer um quinto campo. **Nenhum
campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica do `/impeccable` sobre `/cadastro` com os prints de 2026-10-14.
**Depende de:** nada. Vai antes ou depois da 155, não junto (mesmo arquivo).
**Aprovações pedidas:** o texto da sugestão.
**Decisões a registrar:** `#d366`, `#d367`.

---

## Problema

1. **Um e-mail errado no cadastro é uma conta perdida, e o Rende não tem como perceber.** Não há
   e-mail de verificação (`#d142`, o teste é o portão). Ela digita `maynara@gmial.com` no teclado
   do celular, a conta abre, ela usa por três dias, troca de aparelho e "Esqueci minha senha"
   manda o link para um endereço que não existe. O e-mail de boas-vindas pelo Resend (`#d202`)
   volta. O suporte (`#d195`) não tem como achar a conta pelo e-mail que ela lembra. Mailchimp,
   Kiwify, Hotmart, Nuvemshop: todo serviço que vive de e-mail sugere a correção do domínio
   antes de aceitar. No público do Rende (teclado de celular, `gmail`, `hotmail`, `outlook`,
   `bol`, `uol`, `yahoo.com.br`), o erro é comum e o custo é a conta inteira.
2. **Asterisco em três de quatro campos.** O print mostra `E-mail *`, `Senha *`, `Seu nome *` e
   `Nome do negócio` sem. O login já tirou o asterisco (`#d192`, `aria-required`); o cadastro
   ficou com ele, e a dica "Se ainda não tem, deixe em branco." já diz qual é o opcional. Marcar
   o obrigatório quando quase tudo é obrigatório é ruído, e a tela de entrar e a de criar falam
   línguas diferentes.
3. **A caixa dos termos tem a moldura de um campo.** Borda `line-strong`, raio, 64 px de altura:
   no celular ela lê como o quinto campo a preencher, e é a última coisa antes do botão. A moldura
   existe para o alvo de toque (a caixa inteira é o `label`); o alvo não precisa da borda.

---

## 1 · O que esta spec decide

### A sugestão de e-mail: `#d366`

**Domínio.** `sugerirEmail(email: string): string | null` em `src/lib/domain/cadastro.ts`. Pura,
sem dependência:

- Lista fixa dos domínios do público: `gmail.com`, `hotmail.com`, `outlook.com`,
  `outlook.com.br`, `live.com`, `yahoo.com`, `yahoo.com.br`, `icloud.com`, `bol.com.br`,
  `uol.com.br`, `terra.com.br`, `globo.com`.
- Separa no último `@`. Domínio exatamente na lista → `null`.
- Distância de edição (Damerau, que conta a troca de duas letras vizinhas como um erro: `gmial`)
  entre o domínio digitado e cada um da lista; o menor, se ≤ 2 e o domínio digitado tem pelo menos
  4 letras, vira a sugestão. Empate: o primeiro da lista (a ordem é a de frequência).
- Sem `@`, parte local vazia ou domínio vazio → `null` (a validação do envio cuida).
- Minúsculas e `trim` antes de comparar; a sugestão devolve a parte local como ela digitou.

**Teste** em `tests/domain/cadastro.test.ts`: `gmial.com`, `gmail.con`, `gmail.co`, `gamil.com`,
`hotmial.com`, `hotmail.com.br` (fora da lista e a 3 de `hotmail.com`: sem sugestão, e o teste
prende isso), `outlok.com`, `yahoo.com.b`, `uol.com`
(distância 3 de `uol.com.br`: sem sugestão), domínio próprio `docesdaana.com.br` (sem sugestão),
`GMAIL.COM` (sem sugestão), `a@b` (sem sugestão).

**Tela.** No `onBlur` do e-mail e no envio, se `sugerirEmail` devolve algo, aparece sob o campo,
no lugar da dica, em `text-label text-ink`:

> Você quis dizer **maynara@gmail.com**? [Corrigir]

"Corrigir" é terciário `sm` (44 px) e troca o valor do campo; a sugestão some ao digitar no campo
ou ao corrigir. **Não bloqueia o envio**: o primeiro toque em "Começar…" com sugestão aberta envia
o e-mail como está. Quem tem domínio parecido de verdade não pode ficar presa. É informativo, não
erro: sem cor de erro, sem `role="alert"`; `aria-live="polite"` no parágrafo, para o leitor de
tela ouvir sem ser interrompido.

**Só o cadastro.** No login o e-mail errado já falha na hora, e ela tenta de novo; o custo do erro é um toque, não a conta.

### Sem asterisco, termos sem moldura: `#d367`

- E-mail, senha e nome passam `aria-required` em vez de `required`, como o login. O formulário já
  é `noValidate`; o `required` só servia para pintar o asterisco. O `required` da caixa dos termos
  vira `aria-required` pelo mesmo motivo.
- A caixa dos termos perde `border` e `rounded-md`; fica o `label` com `min-h-11`, `py-3` e o
  `gap-3`, alvo inteiro. Com erro: a frase de hoje embaixo, **com o ícone `CircleAlert`** (16 px,
  1.75) antes dela, porque a borda vermelha, que era o segundo sinal além do texto, sai.
- Nada muda na ordem nem no número de campos. "Nome do negócio" fica (`#d142` diz quando sai: se o
  roteiro mostrar hesitação nele).

---

## 2 · Antes de tocar em código

1. Ver se `Campo` passa `aria-required` adiante pelo `...props` (passa: é atributo do `input`).
2. Ver se o envelope precisa de lugar para a sugestão: `dica` é `ReactNode`, então a página passa
   a sugestão como `dica` quando existe. Se o `aria-describedby` apontar para a dica, a sugestão
   já fica ligada ao campo, sem mudar `Campo`.

## 3 · Escopo

- `src/lib/domain/cadastro.ts`: `sugerirEmail`. Teste.
- `src/app/(auth)/cadastro/page.tsx`: o `onBlur`, a sugestão, `aria-required`, a caixa sem
  moldura e o ícone no erro.
- `Campo` não muda.

## 4 · Roteiro de navegador

1. Celular: digitar `fulana@gmial.com`, tocar em "Senha": a sugestão aparece; "Corrigir" troca e
   some.
2. Digitar `fulana@docesdaana.com.br`: nada aparece.
3. Com a sugestão aberta, preencher tudo e enviar: a conta abre com o e-mail como ela digitou (em
   ambiente de teste; não criar conta real com domínio errado em produção).
4. Enviar vazio: os erros no campo, a caixa dos termos com o ícone e a frase, foco no primeiro.
5. Leitor de tela (TalkBack ou VoiceOver): o e-mail anuncia "obrigatório"; a sugestão é lida
   depois de sair do campo, sem interromper.
6. Tema escuro: a caixa dos termos sem borda continua visível como linha clicável.

## 5 · Critérios de aceite

- [x] `sugerirEmail` testado nos casos da seção 1.
- [x] Sugestão nunca bloqueia o envio.
- [x] Nenhum asterisco na tela; leitor de tela anuncia os obrigatórios.
- [x] Erro dos termos com ícone e texto.
- [x] Portão; `#d366`, `#d367`; `ESTADO.md`. Nenhuma linha em `novidades.ts`.

## 6 · Fora de escopo

- **Sugestão no login e em "Esqueci minha senha".** Ver acima.
- **Verificar se o domínio recebe e-mail** (consulta MX). Rede no envio e uma rota nova; a lista
  resolve o caso comum.
- **E-mail de confirmação.** O `#d142` recusou; a sugestão é a alternativa sem passo a mais.
- **Tirar a caixa dos termos.** O `#d142` decidiu que o consentimento é um ato dela.
- **Medidor de força de senha.** Seis caracteres é a regra do Firebase; o medidor não muda quem
  cria a conta.
