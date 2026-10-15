# Spec 184 · As páginas do beta

**Tipo:** toda página pública do Rende passa a dizer a mesma coisa: beta fechado, 100 vagas por
convite, quantas restam, e a lista de espera para quem não tem convite. Cada "Começar o teste"
vira um bloco só, `PortaDoBeta`, que na fase `PUBLICO` devolve o botão de hoje. Nada se reescreve
no dia do lançamento.
**Tamanho:** uma sessão.
**Origem:** o pedido do beta de 2026-10-15, item 8.
**Depende de:** 181 (`lerBeta`) e 182 (`ListaDeEspera`, `GET /api/beta`).
**Aprovações pedidas:** nenhuma das quatro do `CLAUDE.md`. O texto das vagas e do selo passa por
quem conduz o projeto junto com a spec.
**Decisões a registrar:** duas, numeradas na sessão (a porta do site é um componente que lê a fase;
as páginas revalidam a cada 5 minutos e as prévias não falam de beta).

---

## Problema

1. Seis páginas, o login e o `llms.txt` convidam a "Começar o teste de 14 dias", que na fase `BETA`
   dá numa porta fechada.
2. Nenhuma diz que há poucas vagas, nem quantas, e é a escassez que faz o convite valer.
3. As páginas são estáticas: um número de vagas escrito no build fica velho no primeiro cadastro.

---

## 1 · O que esta spec decide

### O número

`fraseDasVagas({ vagas, ocupadas })` em `domain/convite.ts`, pura, com teste:

- `restam > 10`: "Restam {restam} das {vagas} vagas."
- `1 ≤ restam ≤ 10`: "Restam só {restam} vagas." (singular: "Resta só 1 vaga.")
- `restam ≤ 0`: "As {vagas} vagas estão ocupadas."
- Sem número (build sem credencial): "São {vagas} vagas, por convite."

Sem contagem regressiva, sem relógio, sem número inventado: é a contagem do `plataforma/beta`.

### `PortaDoBeta`

Componente de servidor em `components/site/`, `({ origem, children })`:

- Fase `PUBLICO`: `children`, o botão de hoje, intocado.
- Fase `BETA`: o selo "Beta fechado · por convite" (`label`, `Lock` ao lado, nunca só cor), a
  `fraseDasVagas`, `ListaDeEspera` com a `origem` e, embaixo, "Tenho um convite" terciário para
  `/cadastro`. Com as vagas esgotadas, o selo vira "Vagas do beta esgotadas" e a lista vem com
  "Você é avisada quando abrirem mais."
- Em lugares onde o formulário não cabe (o topo da `Moldura` e a barra grudenta do celular em
  `/conheca`), `compacta`: o selo e "Entrar na lista" para a âncora `#lista` da própria página.

### Onde ela entra

| Página                                        | Hoje                                    | Na fase `BETA`                                                                                                                                                                                                             |
| --------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/conheca`, topo                              | "Começar o teste de 14 dias"            | `PortaDoBeta` inteira, com `id="lista"`; o título não muda, e uma linha acima dele: "Em beta fechado, para 100 confeiteiras."                                                                                              |
| `/conheca`, preço                             | o botão e "14 dias grátis, sem cartão…" | os planos continuam com o preço do Stripe (`#d174`) sob "Depois do beta"; a frase vira "No beta, quem entra por convite testa 14 dias grátis, sem cartão. Depois, assina se quiser." e o botão vira `PortaDoBeta compacta` |
| `/conheca`, barra do celular                  | "Testar 14 dias grátis"                 | `compacta`                                                                                                                                                                                                                 |
| cinco páginas de preço, `Convite` do `Artigo` | o convite com o doce da página          | `PortaDoBeta` com `origem="artigo"`; a frase do doce fica acima                                                                                                                                                            |
| `Moldura`, topo                               | botão para `/cadastro`                  | `compacta`                                                                                                                                                                                                                 |
| `/login`                                      | "Criar conta"                           | "Tenho um convite" e "Entrar na lista" (para `/cadastro`, que na 182 mostra os dois), por `GET /api/beta`                                                                                                                  |
| `/cadastro`                                   | —                                       | já feito na 182                                                                                                                                                                                                            |
| `llms.txt`                                    | "Teste de 14 dias."                     | "Em beta fechado, por convite, com lista de espera em {URL}/conheca#lista."                                                                                                                                                |

O rodapé "feito com Rende" do cardápio continua apontando para `/conheca?de=cardapio`; com a
`origem` da 114 no aparelho, a `ListaDeEspera` grava `"cardapio"`.

### Fase e vagas em páginas estáticas

- `/conheca` já revalida de hora em hora (`#d174`); passa a `revalidate = 300`. As cinco páginas de
  preço e o `llms.txt` ganham `revalidate = 300`. Cada revalidação é uma leitura de
  `plataforma/beta`.
- **As imagens de prévia (`opengraph-image`) e as `description` não mencionam o beta**: são geradas
  no build, e o WhatsApp guarda a prévia por endereço (`#d183`). Dizer "100 vagas" nelas deixaria
  o lançamento com prévias erradas por semanas.
- Os dados estruturados (`#d179`) ficam como estão.

---

## 2 · Antes de tocar em código

1. Ler `conheca/page.tsx`, `Moldura.tsx`, `Artigo.tsx` (`Convite`), `/login`, `llms.txt/route.ts`,
   `#d172`, `#d174`, `#d239`, `#d387`.
2. `/impeccable` com registro **brand**; `PRODUCT.md` e `DESIGN.md`. A escassez se diz uma vez por
   tela e com o número; "exclusivo", "imperdível" e caixa alta ficam de fora. O rosa da marca não
   vai no selo (`CLAUDE.md`: o rosa marca só a sobra).
3. Medir o Lighthouse de `/conheca` e da página do cookie antes, para comparar.

---

## 3 · Escopo

- `domain/convite.ts`: `fraseDasVagas` e o teste dos quatro casos e do singular.
- `components/site/PortaDoBeta.tsx`.
- As páginas da tabela, os `revalidate` e o `llms.txt`.
- `/login`: o link.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, 390px, 1280px e 1864px, dois temas, sem JavaScript.

1. Fase `BETA` com 63 ocupadas: as seis páginas dizem "Restam 37 das 100 vagas" e nenhum
   "Começar o teste".
2. Entrar na lista pela página do brigadeiro: `origem: "artigo"` no documento.
3. `vagas` igual a `ocupadas`: o selo de esgotado em todas, depois de no máximo 5 minutos.
4. `fase PUBLICO` à mão no console: as páginas voltam ao botão de hoje, em até 5 minutos, sem
   deploy.
5. Sem JavaScript, o formulário da lista não manda nada; o "Tenho um convite" funciona.
6. Lighthouse depois, comparado ao de antes; um primário por tela.

---

## Critérios de aceite

- [x] Nenhum caminho público leva a uma porta fechada sem explicação.
- [~] O número das vagas é o do `plataforma/beta`, com no máximo 5 minutos de atraso.
- [x] A fase `PUBLICO` devolve as páginas de hoje sem mudança de código.
- [x] Prévias e `description` iguais às de hoje.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` atualizado. Nenhuma linha em `novidades.ts` (site).

---

## Decisões fáceis de rejeitar

- **Um componente que lê a fase, e não um texto novo em cada página.** No lançamento, nada se
  reescreve, e voltar à fase `BETA` (se precisar) também.
- **Os preços continuam na `/conheca`.** Esconder o preço numa página de beta seria esconder o que
  vem depois do teste, e a 155 já decidiu dizer o fim do teste na porta.
- **O formulário na página, e não um botão que leva a outra tela.** Cada tela a mais perde gente,
  e quem chegou por busca não tem outro motivo para voltar.

---

## Fora de escopo

- Página própria para o lançamento ou para a lista.
- Contador animado, barra de progresso das vagas, depoimentos novos (a 185 os colhe).
- Mudar as imagens de prévia.
