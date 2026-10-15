# Spec 183 · O convite que ela manda

**Tipo:** a fundadora vê os cinco convites dela no app, escreve (se quiser) para quem é cada um e
manda pelo WhatsApp. Quem recebe toca num link com prévia própria ("A Maynara guardou uma vaga pra
você"), cai numa página do convite e, dali, no cadastro com o código posto.
**Tamanho:** uma sessão.
**Origem:** o pedido do beta de 2026-10-15, item 3.
**Depende de:** 181 (o convite e a troca) e 182 (`ListaDeEspera` e `GET /api/beta`).
**Aprovações pedidas:** nenhuma além das da 181.
**Decisões a registrar:** duas, numeradas na sessão (o convite nasce quando ela toca, e não
semeado; a prévia diz o nome de quem convida).

---

## Problema

Com a 181 o convite existe como documento, mas só o console o cria e ninguém o vê. Um código solto
no WhatsApp, sem imagem, parece golpe; um convite precisa chegar com o nome de quem manda.

---

## 1 · O que esta spec decide

### No app: "Seus convites"

- **Onde:** uma seção em `/configuracao#convites`, acima de "Quem te ajuda", e uma entrada no ⋯
  ("Convidar", ícone `Gift`). Só para a dona (`ehDona`), só com `conta.beta?.convites` e só na fase
  `BETA` (`GET /api/beta`, com o último valor no aparelho para abrir offline).
- **O topo da seção:** "Você é a fundadora nº {n} do Rende." e "O beta tem 100 vagas, por convite.
  Você tem {livres} de {cota} para mandar." Com as vagas no fim (`restam` ≤ 10): "Restam {restam}
  vagas no beta inteiro: quem chegar depois entra na lista."
- **A lista:** os convites dela pelo ouvinte de `caminhos.convites`, um por linha:
  - `ABERTO`: o nome (ou "Convite sem nome") e o código `K7Q3-M9XA`; "Mandar" (primário da linha
    só no primeiro aberto; os outros secundários) e "Cancelar" terciário.
  - `USADO`: `CircleCheck` e "{nomeDaConvidada} entrou em {dia}". Sem ação.
  - `CANCELADO`: some da lista.
  - As vagas da cota ainda não criadas: uma linha "Convidar alguém" por vaga livre.
- **Convidar alguém** abre a folha (painel no desktop) com "Pra quem é? (opcional)", até 40
  caracteres, e "Criar convite". `POST /api/convites { contaId, paraQuem? }`: confere dona,
  `beta.convites` e que `ABERTO + USADO < cota`; gera o código (tenta outro se colidir); grava. Sem
  rede, o botão diz que precisa de internet, como a nota (`#d290`).
- **Mandar** usa o `MandarAPagina` da 177 com `rotulo` "Mandar pelo WhatsApp", o link e o texto
  `mensagemDoConvite(nomeDela, paraQuem?, link)` em `domain/convite.ts`:

  ```
  Oi, Ana! Tô usando o Rende pra calcular o preço dos meus doces e organizar os pedidos. Ele está em
  beta fechado, só entra quem é convidada, e eu guardei uma das minhas vagas pra você:
  https://…/convite/K7Q3M9XA
  ```

  Sem `paraQuem`, "Oi!". Ao lado, "Copiar link". A sessão passa a redação pela `humanizer`.

- **Cancelar** é `DELETE /api/convites { contaId, codigo }`: só `ABERTO`, vira `CANCELADO`, e a
  vaga da cota volta. Confirmação em modal (é destrutivo para quem já recebeu o link).
- Linha em `novidades.ts`.

### A página do convite

`/convite/[codigo]`, de servidor, `dynamic`, `noindex`, fora do `sitemap`. Lê o convite pelo grupo
de coleção (`lerConvite(codigo)` em `server/beta.ts`) e a conta de quem convida (`proprietaria`, o
primeiro nome, e `nome` do negócio). Moldura do site (`Topo`, `Rodape`).

| Estado                                         | O que a página diz                                                                                                                                                                                                                                                                    | Ação                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| aberto, com vaga                               | "{Ana}, a {Maynara}, da {MyCookie's}, guardou uma vaga do Rende pra você." (sem `paraQuem`, sem o nome na frente). "O Rende está em beta fechado: 100 vagas, por convite. Restam {n}." O que o Rende faz em três linhas, a `FaixaDoCusto` do exemplo, e "14 dias grátis, sem cartão." | "Aceitar o convite" → `/cadastro?convite=…` |
| aberto, sem vaga                               | "As 100 vagas do beta acabaram antes do seu convite chegar."                                                                                                                                                                                                                          | `ListaDeEspera` com `origem="convite"`      |
| usado, cancelado, inexistente, conta encerrada | "Este convite não vale mais. Peça outro a quem te mandou, ou entre na lista." Mesma frase para os quatro.                                                                                                                                                                             | `ListaDeEspera`                             |
| fase `PUBLICO`                                 | redireciona para `/cadastro?convite=…` (a origem continua medida)                                                                                                                                                                                                                     | —                                           |

- "Já tenho conta" (terciário) para `/login` em todos os estados.
- O código entra no `localStorage` (`rende:convite`) já na página, para o caso de ela fechar e voltar
  pelo `/cadastro`.

### A prévia

`/convite/[codigo]/opengraph-image.tsx`, dinâmica, com `desenharPrevia` (`#d183`): linha de cima
"Beta fechado · por convite", frase "{Maynara} guardou uma vaga do Rende pra você". Convite que não
vale: a prévia genérica "O Rende está em beta fechado", sem nome. `title` e `description` da página
dizem o mesmo. O nome que aparece é o primeiro de `proprietaria`, que ela mesma escreveu no cadastro;
o código não aparece na imagem.

### O cadastro com convite

Com `?convite=` ou `rende:convite`, `/cadastro` mostra, acima do formulário de sempre, "Convite da
{Maynara}" (por `GET /api/convite/{codigo}`, que devolve só `{ valido, deQuem? }`), e o título
passa a "Aceitar o convite". A falha do POST volta à tela do beta da 182 com a frase.

---

## 2 · Antes de tocar em código

1. Ler `MandarAPagina.tsx`, `QuemTeAjuda` (a seção irmã), `TelaConfiguracao.tsx`, `previa.tsx`,
   `opengraph-image.tsx` de `/conheca`, `#d183`, `#d317`.
2. `/impeccable` com registro **product** para a seção e **brand** para a página do convite;
   `PRODUCT.md` e `DESIGN.md`. A página do convite é a primeira impressão do Rende para quem chega
   pela amiga: um primário só, e a fundadora nomeada antes do produto.

---

## 3 · Escopo

- `domain/convite.ts`: `mensagemDoConvite`, `estadoDoConvite(convite, conta, beta)` (os cinco
  estados da tabela), com teste.
- `api/convites/route.ts` (`POST`, `DELETE`), `api/convite/[codigo]/route.ts` (`GET`).
- `server/beta.ts`: `lerConvite`.
- `components/configuracao/SeusConvites.tsx` e a entrada no ⋯.
- `app/convite/[codigo]/page.tsx` e `opengraph-image.tsx`; `robots.ts` barra `/convite/`.
- `/cadastro`: o cabeçalho do convite.
- `novidades.ts`.

---

## 4 · Roteiro de navegador

`npm run build && npm start`, 390px e 1280px, dois temas.

1. Criar três convites, um sem nome. Mandar: no celular a folha do aparelho, no desktop o WhatsApp
   Web com o texto.
2. Colar o link numa conversa do WhatsApp (pelo túnel ou pela prévia do Vercel): a imagem com o
   nome; o link de um convite cancelado, a genérica.
3. Abrir o link num aparelho sem login, aceitar, criar a conta pelo Google: a conta nasce
   fundadora, e na tela de quem convidou a linha vira "Ana entrou em…" sem recarregar.
4. Cancelar um convite e abrir o link dele: "Este convite não vale mais".
5. A cota: com 5 entre abertos e usados, nenhuma linha "Convidar alguém".
6. A ajudante não vê a seção nem a entrada do ⋯.

---

## Critérios de aceite

- [x] Cinco convites por fundadora, nunca mais, contando os usados.
- [x] Um link por pessoa, com prévia própria.
- [x] Os quatro estados de convite que não vale dizem a mesma frase.
- [x] `/convite/*` fora do `sitemap` e com `noindex`.
- [x] `lint`, `typecheck`, `test` e `build` passam.
- [x] Decisões registradas; `ESTADO.md` e `novidades.ts` atualizados.

---

## Decisões fáceis de rejeitar

- **O convite nasce quando ela toca, e não cinco códigos prontos no dia do cadastro.** Código
  pronto que ninguém mandou é código no banco à toa, e o nome "pra quem" só existe na hora de
  mandar.
- **"Pra quem" é opcional.** Obrigatório, vira formulário. Opcional, a prévia e a página chamam
  pelo nome quando ela quis.
- **A prévia diz o nome de quem convida.** É o que faz o link não parecer propaganda. O nome é o
  que ela escreveu e o link é ela quem manda.
- **A mesma frase para usado, cancelado e inexistente.** Quem testa códigos não aprende nada, e
  para quem recebeu o link a saída é a mesma.

---

## Fora de escopo

- Avisar quem convidou por e-mail ou notificação quando a convidada entra. A linha da lista se
  atualiza sozinha.
- Convite por e-mail mandado pelo Rende.
- Ranking de quem mais convidou.
