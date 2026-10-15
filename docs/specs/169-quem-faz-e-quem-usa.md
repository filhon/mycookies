# Spec 169 · Quem faz e quem usa

**Tipo:** a prova social da `/conheca` deixa de ser uma frase só, da primeira usuária, e passa a
dizer quem está por trás do Rende, com rosto e um canal de conversa. O depoimento vira lista (até
três), cada um com o que o autorizou a dizer: negócio, cidade, foto, Instagram e o número dele. A
dúvida que ficou sem resposta ganha o WhatsApp.
Nenhuma regra, nenhum schema, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** a crítica da `/conheca` de 2026-10-14 (a mesma da 167). A faixa "Quem já usa" tem uma
citação, sem rosto, sem cidade, sem número, e a linha logo abaixo diz que o Rende nasceu na
cozinha dela: quem lê entende que a única cliente é de casa, e a página não diz isso às claras.
No desktop, metade direita da faixa cobalto fica vazia. As páginas de assinatura para pequeno
negócio no Brasil (Nuvemshop, Kyte, Anota AI, Bling) vendem com gente: depoimento com foto, nome
do negócio, cidade e o @, e um botão de WhatsApp para a dúvida que a página não respondeu. O
Rende já tem o canal pronto (`FaleComAGente`, `linkDaAjuda`, `RESPONSAVEL.whatsapp`), mas o
número nunca foi preenchido e a página não o usa.
**Depende de:** 036 (`#d175`, `#d184`), `#d195`.
**Aprovações pedidas:** nenhuma em código. Fora dele, todas as da seção 3: sem elas a sessão faz
só o que não depende delas.
**Decisões a registrar:** uma, numerada na sessão (amplia a `#d175` e a `#d184`).

---

## Problema

1. **A única prova é da sócia, sem que a página diga.** A transparência é a que vende: "feito
   por um casal, ela confeiteira, ele programador, testado na bancada dela" é mais forte que uma
   citação anônima de "Maynara, MyCookie's".
2. **Ninguém tem rosto.** Nem quem usa, nem quem faz. Para pagar todo mês a um app que ela não
   conhece, a confeiteira quer saber quem responde do outro lado.
3. **Dúvida sem saída.** As dúvidas terminam e a página não oferece conversa. O contato do
   rodapé é um `mailto:` num `@gmail.com`. A confeiteira resolve tudo pelo WhatsApp.
4. **O depoimento não tem número.** "A certeza de que estou cobrando o valor certo" é bom; "subi
   o cookie de R$ 6 para R$ 8,50 e ninguém reclamou" é o que faz a próxima subir o dela.

---

## 1 · O que esta spec decide

### Quem faz o Rende

Um bloco novo, dentro da mesma seção `#quem` e depois dos depoimentos, sobre `--brand-800`:

- `h3` em `heading`: "Quem faz o Rende".
- Texto, até 3 linhas, de quem conduz o projeto (`[texto de quem conduz o projeto…]` até lá,
  pego pelo portão). O sentido: o Rende é feito por Filipe, que programa, e Maynara, que faz os
  doces da MyCookie's; tudo passa pela bancada dela antes de chegar na sua; quem responde a
  mensagem é um dos dois.
- Foto dos dois, se autorizada (`QUEM_FAZ.foto`, em `public/site/`), no lado que hoje está vazio
  no desktop; no celular, acima do texto, 15rem de altura, `object-cover`. Sem foto, o texto
  ocupa a faixa, como a `#d175` já manda.
- A linha `DEPOIMENTO.origem` (`#d184`) sai do depoimento e vira este bloco.
- Abaixo, link em `--on-brand` com `MessageCircle`: **"Falar com a gente no WhatsApp"**, aba nova,
  pelo `linkDaAjuda` de `MolduraDeEntrada` (exportado, sem copiar) com o texto "Oi, vim da página
  do Rende e tenho uma dúvida." Sem `RESPONSAVEL.whatsapp`, o link é o e-mail e diz "Escrever pra
  gente".

### Os depoimentos

- `DEPOIMENTO` vira `DEPOIMENTOS: Depoimento[]`, até três, cada um com `texto`, `nome`,
  `negocio`, e opcionais `cidade`, `foto`, `instagram` (sem `@`, vira link para o perfil, aba
  nova) e `numero` (uma linha curta, "De R$ 6,00 para R$ 8,50 no cookie").
- Um depoimento: como hoje, com a foto à esquerda se houver.
- Dois ou três: o primeiro como hoje; os outros abaixo, lado a lado no desktop e empilhados no
  celular, em `subheading`, separados por filete `--on-brand-muted`/20. Sem cartão, sem aspas
  gigantes, sem estrela.
- O `numero`, quando há, vai acima do texto em Familjen 700, `title`, `num`: é o dado, e a marca
  mostra o número antes do adjetivo. Nunca em rosa: o rosa é a sobra dela no app, não um
  argumento de venda.
- Cada depoimento entra só com autorização por escrita de quem falou, como a `#d175`, e o número
  tem que ser o dela.

### As dúvidas

Depois da lista, uma linha: "Ficou alguma dúvida? {link do WhatsApp}". O mesmo link e texto do
bloco "Quem faz". No rodapé, "Contato" passa a usar o mesmo link.

---

## 2 · Escopo

- `src/app/conheca/page.tsx`: `DEPOIMENTOS`, `QUEM_FAZ`, `QuemJaUsa`, a linha das dúvidas.
- `src/components/auth/MolduraDeEntrada.tsx`: exportar `linkDaAjuda`.
- `src/components/site/Moldura.tsx`: o "Contato" do rodapé.
- `public/site/`: as fotos autorizadas.

## Fora de escopo

- Contador de usuárias ("120 confeiteiras usam o Rende"). Entra quando o número for de dizer, e
  lido do `metricas`, não escrito à mão.
- Carrossel, estrelas, nota média, logos de cliente, vídeo-depoimento (036).
- Chat na página, botão flutuante de WhatsApp: um link no lugar certo basta, e nada compete com
  a barra do celular.
- Dados estruturados de avaliação (`#d179`: ninguém avaliou).

---

## 3 · Fora do código, para quem conduz o projeto

1. **Um número de WhatsApp do Rende** em `RESPONSAVEL.whatsapp`. Vale para a página, as telas de
   acesso e o "Fale com a gente" do app de uma vez. De preferência um número do negócio, e não o
   pessoal: ele vai a público.
2. **Pedir depoimento a quem está no teste ou já assina** (`npm run metricas` diz quem usa). Uma
   mensagem: o que mudou no preço, um número, e se pode aparecer com foto, cidade e o @.
3. **Perguntar à Maynara** se o depoimento dela ganha o número real ("de R$ X para R$ Y") e a
   foto, e se os dois topam aparecer em "Quem faz o Rende". Guardar as autorizações por escrito.
4. **O e-mail no domínio do Rende** (já pedido na 166, item 3).

---

## 4 · Roteiro de navegador

1. Só o depoimento de hoje e nada autorizado: a faixa como antes, e "Quem faz o Rende" com o
   texto, sem foto; o portão pega o `[texto…]` se não houver texto.
2. Com foto dos dois: no desktop o lado direito preenchido; no celular a foto acima.
3. Com três depoimentos: o primeiro grande, os outros dois abaixo; o número em destaque.
4. "Falar com a gente no WhatsApp" abre o `wa.me` com o texto; sem número, abre o e-mail.
5. Leitor de tela: cada depoimento é um `figure` com `figcaption`; o @ é link com nome.
