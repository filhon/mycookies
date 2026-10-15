# Spec 177 · A margem que se confere e a página que se passa adiante

**Tipo:** a seção "Margem e taxas" de `/como-calcular-o-preco-de-doces` ganha uma tabela pequena
que responde "multiplicar por 2 dá quanto de margem?", e a página ganha, antes do convite, um botão
para mandá-la a outra confeiteira pelo WhatsApp.
Nenhum campo, nenhuma regra, nenhuma dependência. Nenhuma aritmética nova.
**Tamanho:** uma sessão curta.
**Origem:** a crítica da página de doces de 2026-10-15.

1. Quem multiplica o custo (o "custo × 2", o "custo × 3") é a maioria, e a página explica a
   diferença entre margem e markup em três frases, sem mostrar o número que ela usa. As páginas que
   aparecem em destaque na busca respondem esse tipo de pergunta em tabela, que o Google e os
   chats citam inteira.
2. A seção 5 da 037 e da 068 diz que o resultado depende de "gente apontando para a página": o
   grupo de confeiteiras, a aula, o vídeo. A página não tem como ser mandada. Produtos que crescem
   por indicação (Calendly, Notion, Canva) põem o compartilhar onde a pessoa acabou de achar algo
   útil.
   **Depende de:** 068. Independe da 175 e da 176.
   **Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`.
   **Decisões a registrar:** uma, numerada na sessão (o botão de mandar só na página de doces).

---

## 1 · O que esta spec decide

### "Multiplicou por quanto, sobrou quanto"

Depois do parágrafo de margem e markup, uma `table` com `caption` "Com 5% de maquininha":

| Você multiplica o custo por | Sobra do preço, depois da maquininha |
| --------------------------- | ------------------------------------ |
| 1,5                         | 28%                                  |
| 2                           | 45%                                  |
| 2,5                         | 55%                                  |
| 3                           | 62%                                  |

E a inversa, numa segunda tabela ao lado no desktop e embaixo no celular:

| Pra sobrar | Divida o custo por | É o mesmo que multiplicar por |
| ---------- | ------------------ | ----------------------------- |
| 30%        | 0,65               | 1,54                          |
| 40%        | 0,55               | 1,82                          |
| 50%        | 0,45               | 2,22                          |

Os números à mão acima são para conferir: **a página calcula tudo** com `verificarPreco` sobre um
custo de R$ 100,00 (a primeira) e com `fracao` e a divisão do `calcularPrecoSugerido` sem
arredondamento (a segunda), e o teste prende. Percentuais sem casa, multiplicador com duas.

Uma frase depois: "Um custo de R$ 100 multiplicado por 2 vira R$ 200: a maquininha leva R$ 10, o
custo leva R$ 100, e sobram R$ 90, 45% do preço, e não os 100% que se somaram em cima." (o par
percentual + reais do `DESIGN.md`).

### "Mandar pra uma confeiteira"

Depois das perguntas e antes do convite, uma linha: "Conhece alguém que chuta o preço?" e um
**botão secundário** "Mandar pelo WhatsApp" com o ícone `Send`. O primário da tela continua sendo
o do convite (um por tela).

- `navigator.share({ title, text, url })` onde houver (o celular, que é onde ela está);
- senão, `linkDoWhatsApp(undefined, texto)` de `domain/whatsapp.ts`, que abre o WhatsApp sem
  número, para ela escolher a conversa.
- O texto: "A conta do preço de doces, com o cookie, o cento de brigadeiro, o bolo por quilo e o
  bolo de pote: {url}". O `url` é o absoluto da página (`URL_DO_SITE`), sem `?` nem `#`.
- O mesmo padrão do `MandarOCardapio` (o `share` primeiro, o `.catch` vazio quando ela desiste).
- Sem JavaScript, o botão é um `<a>` para o `wa.me` com o texto: funciona igual.

---

## 2 · Antes de tocar em código

1. Ler `src/components/cardapio/MandarOCardapio.tsx` e `linkDoWhatsApp`.
2. `/impeccable` com registro **brand**; a frase da linha passa pela `humanizer`.

---

## 3 · Escopo

- `page.tsx` de doces: as duas tabelas na seção "Margem e taxas" e a linha de mandar antes do
  `Convite`.
- `src/components/site/MandarAPagina.tsx`, `"use client"`, pequeno: recebe `titulo`, `texto` e
  `url`.
- `tests/domain/exemplo.test.ts`: as sete linhas das duas tabelas.

---

## 4 · Roteiro de navegador

1. A 390px as duas tabelas cabem sem rolar de lado.
2. No celular, o botão abre a folha de compartilhar do aparelho; no desktop, o WhatsApp Web com o
   texto e sem número.
3. Sem JavaScript, o link do WhatsApp abre com o texto.
4. A prévia do link no WhatsApp é a `opengraph-image` da página (já existe).
5. Um primário na tela: o do convite.

---

## Critérios de aceite

- [ ] As duas tabelas com `caption` e `th scope`, números das funções, presos no teste.
- [ ] O botão manda o endereço absoluto e o texto, com `share` ou com o WhatsApp.
- [ ] `lint`, `typecheck`, `test` e `build` passam; `package.json` e `firestore.*` intocados.
- [ ] Decisão registrada; `ESTADO.md` atualizado.

---

## Decisões fáceis de rejeitar

- **Só na página de doces.** É a que tem os quatro doces; quem recebe escolhe o dela pela tabela.
  As páginas de cada doce podem ganhar o mesmo botão depois, se a medição mostrar visitas vindas
  do WhatsApp.
- **WhatsApp e não "copiar link".** O grupo de confeiteiras é no WhatsApp. O `share` do celular já
  oferece copiar.
- **Margem com 5% de maquininha fixo.** É o número de todos os exemplos. A calculadora da 176 é
  onde ela troca.

---

## Fora de escopo

- Uma planilha para baixar, ou a conta da 176 para imprimir. A busca por "planilha de
  precificação de doces" é grande, e a resposta da página é "não precisa". Se o Search Console
  mostrar a página aparecendo para "planilha" e perdendo o clique, volta como spec própria.
- Autoria na página (quem escreveu, por que confiar): pede a decisão de quem conduz o projeto
  sobre o nome que assina, e a autorização do `#d175` se for o da Maynara.
- A imagem do app no convite: depende das capturas que a `/conheca` ainda espera (`TELAS_DO_MES`
  com `src` vazio).
