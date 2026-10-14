# Spec 165 · Os termos que se leem

**Tipo:** `/termos` e `/privacidade` deixam de ser 6.300px de texto corrido no celular. Cada
página ganha, no topo, "Em resumo" (as promessas que pesam na decisão de assinar, cada uma com
o endereço da seção que a sustenta), um índice que acompanha a leitura, referências que são
links, e um pé que leva ao outro documento e a quem responde. **O texto jurídico não muda.**
Nenhum campo, nenhuma regra, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica das duas páginas com `/impeccable` e `/frontend-design` (2026-10-14),
comparadas às de serviços que vivem de assinatura (Stripe, Notion, Basecamp, Pinterest, GitHub,
Nubank, Hotmart). O texto do Rende já é melhor que o da maioria: segunda pessoa, números
concretos, honesto sobre o que não faz, a cláusula que limita direito em destaque (CDC, art.
54, § 4º). O que falta é tudo o que faz alguém **achar** o que procura sem ler doze seções: nos
prints, o celular mostra uma coluna única de 6.300px, o desktop uma coluna de 64ch com metade da
tela vazia, e a "seção 1" citada seis vezes não é clicável. As promessas que vendem (teste sem
cartão, cancelar sozinha, sete dias de arrependimento, os dados são seus e saem a qualquer hora)
estão no meio de parágrafos de seis linhas.
**Depende de:** 027 (`PaginaDeTexto`), `IndiceDaPagina` (`#d283`, `#d295`).
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** uma, numerada na sessão (o resumo não é contrato).

---

## Problema

1. **Nada se acha sem ler tudo.** Doze seções no celular, sem índice, sem âncora visível, sem
   voltar ao topo. Quem quer saber "como cancelo" rola até a seção 5, quarto parágrafo.
2. **As referências são texto.** "seção 1" (6×), "seção 5", "seção 7", o e-mail, o
   consumidor.gov.br e o gov.br/anpd. As `id="secao-N"` existem desde a 027 e ninguém aponta
   para elas.
3. **As promessas que convertem estão enterradas.** Os serviços maduros abrem com o resumo em
   linguagem simples (Pinterest e o "Em outras palavras" ao lado de cada cláusula; Basecamp e
   GitHub com o parágrafo curto no topo). Aqui, a única coisa no topo é a data.
4. **A página não tem saída.** O logotipo não é link, o pé é "Ir para o início" em terciário, e
   de `/termos` não se chega a `/privacidade` (e o texto remete a ela quatro vezes).
5. **Desktop desperdiça a tela.** A coluna de 64ch fica centrada com ~600px vazios de cada
   lado, que é exatamente onde o índice mora em todo documento longo que se lê bem.

---

## 1 · O que esta spec decide

### O dado

`SecaoDeTexto` ganha `curto: string`, o rótulo do índice (até ~22 caracteres: "Quem presta",
"Teste grátis", "Planos e pagamento", "Cardápio", "Encerramento"…). `PaginaDeTexto` ganha
`resumo: { texto: string; secao: number }[]`, escrito à mão em cada página.

O resumo é **a mesma promessa com outras palavras**, nunca uma promessa nova. Cada linha cita
a seção onde está escrita por inteiro.

**Termos, "Em resumo"** (seis linhas):

- Catorze dias de teste com tudo liberado, sem cartão. Se não assinar, nada é cobrado. → 4
- Cancela quando quiser, em Configuração, sem falar com ninguém. O que já foi pago vale até o
  fim do período. → 5
- Desistiu em até sete dias do primeiro pagamento? Devolvemos tudo. → 5
- O preço só muda com trinta dias de aviso, e só na renovação seguinte. → 5
- O que você cadastra é seu, e sai num arquivo a qualquer hora, mesmo sem assinatura. → 8
- O Rende faz a conta; o preço que você cobra é decisão sua. → 2

**Privacidade, "Em resumo"** (cinco linhas):

- Nada é vendido, nada vira anúncio, e não há cookie de rastreamento. → 4 e 10
- O cartão fica com a Stripe: o Rende não o vê. → 3
- Baixar tudo e encerrar a conta são botões em Configuração. → 9
- Encerrada a conta, os dados são apagados em até trinta dias. → 6
- Os dados das suas clientes são seus; o Rende só os guarda. → 7

A redação final passa por quem conduz o projeto antes do commit (é texto que vende).

### A página

Mesmo `PaginaDeTexto`, mesmo server component, exceto o índice (que já é client).

- **Topo:** o `Logotipo` vira link para `/` (alvo de 44px). Título e "Vigente desde" como hoje.
- **"Em resumo"**: `h2` em `subheading`, e a lista no padrão **Seção no papel**: `--surface`,
  divisórias de 1px `--border`, raio 14px. Cada linha é um link inteiro (44px mínimo): o texto
  em `body` `--ink` à esquerda e "seção 5" em `label` `--brand-as-ink` à direita. Embaixo, em
  `label` `--ink-muted`: "O resumo ajuda a achar. O que vale é o texto de cada seção." Sem
  cartão por linha, sem ícone por linha, sem ponto âmbar (nada aqui é número que decide).
- **Índice:** `IndiceDaPagina` com as doze `curto`, `rotulo="Seções"`.
  - Celular e tablet (`< xl`): dentro de um `<header>` grudento no `--canvas`, com o filete
    `--border` embaixo (o cabeçalho de contexto do `DESIGN.md`), a faixa horizontal de pílulas
    que a Configuração já usa. É o que dá orientação em 6.000px. O `<header>` só aparece
    depois do resumo; antes dele o resumo é a orientação.
  - Desktop (`xl+`): grade `[13rem_minmax(0,68ch)]` centrada, o índice em coluna à esquerda,
    `sticky top-6`, pílulas empilhadas (`className="flex-col items-start"`, sem a rolagem
    horizontal). O resumo fica na coluna do texto.
- **Seções:** o número da seção passa de `--ink-subtle` (que reprova como texto, `DESIGN.md`)
  para `--ink-muted`. Sem botão de copiar link no `h2`: o índice já dá o endereço.
- **Referências viram link**, no render, por uma função pura (`domain/textoLegal.ts`,
  testada): "seção N" → `#secao-N`; o `RESPONSAVEL.email` → `mailto:`; `consumidor.gov.br`
  e `gov.br/anpd` → `https://`, aba nova; "política de privacidade" nos termos e "termos de
  uso" na privacidade → a outra página. A função devolve pedaços (`texto` | `link`), e o
  componente os desenha; o texto continua string nas páginas, sem JSX dentro das cláusulas.
- **Destaque (CDC):** continua em negrito, e ganha a caixa que o diferencia de um parágrafo
  pesado: fundo `--surface-sunken`, borda de 1px `--border` inteira, raio 10px, padding 16px.
  **Nunca** filete lateral (proibido no `DESIGN.md` e no `/impeccable`).
- **Pé:** "Voltar ao topo" (âncora `#topo`), o outro documento ("Política de privacidade" /
  "Termos de uso"), e "Falar com o Rende" (`mailto:`), em terciário, numa linha que quebra no
  celular. O "Ir para o início" sai: o logotipo já leva.
- **Impressão:** `print:hidden` no índice, no `<header>` grudento e no pé; o resto imprime
  como está. É o que contadora e advogado fazem com termos.
- **Movimento:** nenhum. Rolagem para âncora é a do navegador (`scroll-mt` já existe; ajustar
  para a altura do `<header>` no celular).

### O que fica igual

O texto das doze e das onze seções, a data, `noindex`, a ordem das seções, os `id`.

---

## 2 · Escopo

- `src/components/auth/PaginaDeTexto.tsx`: resumo, índice, referências, destaque, pé, logo.
- `src/app/(auth)/termos/page.tsx` e `privacidade/page.tsx`: `curto` e `resumo`.
- `src/lib/domain/textoLegal.ts` + teste: o fatiador de referências.
- `src/components/layout/IndiceDaPagina.tsx`: só se o arranjo vertical pedir algo que
  `className` não resolve. Preferir não tocar.

## Fora de escopo

- Mudar uma palavra do texto jurídico (é a 166, e o advogado do `#d171`).
- "O que mudou" e versões anteriores (166).
- Busca na página, botão de copiar link de seção, PDF gerado, página-índice "Legal",
  lista de subprocessadores em página própria: YAGNI enquanto são dois documentos.
- Tradução.

---

## 3 · Roteiro de navegador

Celular a 360px e desktop a 1440px, claro e escuro.

1. `/termos` no celular: o resumo cabe na primeira dobra e meia; tocar "Desistiu em até sete
   dias…" leva à seção 5 com o título visível abaixo do `<header>`.
2. Rolar até a seção 9: a pílula "Responsabilidade" acende e a faixa rola até ela.
3. Na seção 3, tocar "seção 1": vai à seção 1. Tocar o e-mail abre o cliente de e-mail.
4. Desktop: o índice à esquerda fica parado enquanto o texto rola; a pílula acompanha.
5. A caixa do destaque nas seções 9 e 10 dos termos: contraste AA no claro e no escuro.
6. Pé: "Política de privacidade" leva a `/privacidade`; "Voltar ao topo" volta.
7. Ctrl+P no desktop: sai só o texto, sem índice nem pé.
8. Leitor de tela: o `nav` "Seções" é anunciado; o resumo é uma lista de links com o nome da
   promessa.
