# Spec 118 · A taxa de entrega

**Tipo:** a dona diz de onde sai, até onde entrega e quanto cobra por faixa de distância, com
exceções por bairro; a cliente digita o CEP no cardápio e vê a taxa antes de mandar, e o pedido
nasce com ela. **Dois serviços externos, schema aditivo, uma rota pública nova que chama serviço
pago.** Nenhuma regra, nenhum índice, nenhuma dependência de pacote (os dois serviços são `fetch`).
**Tamanho:** duas sessões. A **A** é a configuração: o domínio, a origem medida e o painel com
"Testar um CEP". A **B** é a cliente: o CEP no cardápio, a taxa no total e o handler que a refaz.
A A sai sozinha (a dona configura e testa; a página continua "a combinar").
**Origem:** pedido de quem conduz o projeto (2026-10-10), depois da crítica do cardápio público.
Estava no "Fora de escopo" da 031.
**Depende de:** 031 (B). Combina com a 115 (o recado continua para o que a regra não cobre).
**Aprovações pedidas, antes da A:** (1) **dois serviços externos**: ViaCEP (CEP → endereço, sem
chave) e a Geocoding API do Google Maps Platform (CEP → coordenadas, com chave e faturamento),
seção 1; (2) **o CEP da cliente sai para esses serviços**, e `/privacidade` precisa de um
parágrafo (texto de quem conduz o projeto, como no `#d143`; é portão do deploy da B); (3)
**schema aditivo**: `ConfiguracaoGeral.entrega?` e `cep?` no corpo do pedido público; (4) **uma
rota pública que gasta dinheiro do Rende** a cada CEP novo, com os freios da seção 1; (5) a
reversão de um item do "Fora de escopo" da 031 ("taxa de entrega calculada").
**Decisões a registrar:** `#d321` (a distância é em linha reta, e o bairro corrige) e `#d322`
(os serviços, o cache e o que nunca sai: onde ela mora).

---

## Problema

1. **O total que a cliente vê não é o que ela paga.** O pedido com entrega nasce com taxa zero e
   "sem a entrega" ao lado do total. A Maynara põe a taxa ao confirmar, e a cliente descobre o
   valor depois de decidir. É a pergunta que mais volta no WhatsApp ("quanto fica a entrega pro
   Espinheiro?") e o motivo mais comum de desistência depois do orçamento.
2. **Pedido de longe chega igual a pedido de perto.** Sem raio, quem mora a 25 km manda o pedido,
   e a recusa vira conversa constrangida.
3. **O preço da entrega dela já é uma regra**, só que na cabeça: "até 3 km, R$ 5; até 6, R$ 8;
   Candeias eu não vou". Todo sistema de pedido que se paga deixa escrever essa regra uma vez.

---

## 1 · O que esta spec decide

### A regra dela: `#d321`

```ts
// src/lib/types/configuracao.ts, em ConfiguracaoGeral
/** A taxa de entrega do cardápio (spec 118, `#d321`). Ausente = "a combinar", como sempre foi. */
entrega?: {
  /** De onde sai. Nunca sai da conta (`#d322`). Medida uma vez, ao salvar o CEP. */
  origem?: { cep: string; lat: number; lng: number };
  /** Além disso, não entrega. Em km, uma casa. */
  raioKm: number;
  /** Ordenadas por `ateKm`; a última vai até o raio. De 1 a 5. */
  faixas: { ateKm: number; taxa: Centavos }[];
  /** Exceções, que valem antes da distância: preço fixo, ou `null` = não entrega. */
  bairros?: { nome: string; taxa: Centavos | null }[];
};
```

`taxaDeEntrega(regra, destino)` em `domain/entrega.ts`, pura e testada, devolve
`{ tipo: "taxa"; taxa } | { tipo: "fora" } | { tipo: "a-combinar" }`, nesta ordem:

1. **O bairro** do CEP casa com uma exceção (por `chaveDeBusca`: sem acento, sem caixa) → o preço
   dela, ou `fora`.
2. **A distância**, com as coordenadas da origem e do destino: haversine, arredondada a 0,1 km.
   Acima do raio → `fora`; senão, a primeira faixa com `km ≤ ateKm`.
3. **Faltou dado** (origem sem medir, CEP sem coordenada, serviço fora do ar) → `a-combinar`,
   que é o comportamento de hoje. **A taxa nunca impede um pedido por falha do Rende**: só o
   `fora` impede, e ele vem da regra dela.

**Linha reta, e o bairro corrige.** A distância de rota exige outra API (Routes), mais cara e por
par de pontos. Em linha reta, o rio, a ponte e o viaduto erram, e é para isso que existe a
exceção por bairro: ela conhece a cidade dela melhor que um mapa. `ponytail:` haversine; a
distância de rota quando as exceções passarem de uma dezena numa conta real.

### Os serviços, o cache e o que nunca sai: `#d322`

- **ViaCEP** (`viacep.com.br/ws/{cep}/json/`): logradouro, bairro, cidade e UF. Grátis, sem chave.
  Preenche o endereço da cliente (menos erro de digitação) e dá o bairro das exceções.
- **Google Geocoding** (`components=postal_code:{cep}|country:BR`): as coordenadas **do CEP**, e
  não do número. No Brasil o CEP urbano é de um trecho de rua: a precisão é de centenas de
  metros, que não mudam uma faixa de quilômetros, e o número da casa da cliente não sai do
  Rende. Chave em `GOOGLE_MAPS_API_KEY`, só no servidor, restrita à Geocoding API.
- **Por que o Google, e não o Nominatim (OpenStreetMap):** a política do servidor público do
  Nominatim proíbe uso de serviço comercial e a cobertura de CEP brasileiro é fraca. **A sessão
  confere o preço do dia** (cota gratuita mensal da SKU de Geocoding e o valor por mil acima
  dela) e anota no `#d322`.
- **O cache.** As duas chamadas por `fetch` com `next: { revalidate: 2592000 }` (30 dias, o que
  os termos do Google permitem guardar de coordenada): o mesmo CEP, de qualquer conta, é uma
  chamada por mês. `lib/server/endereco.ts` com `buscarCep(cep)` e `coordenadasDoCep(cep)`.
- **Os freios da rota pública** (`POST /api/cardapio/entrega`): o esquema (CEP de 8 dígitos);
  só com o cardápio aberto e a regra de entrega configurada (a mesma `montarCardapio`, como o
  handler); e **uma cota diária no console do Google Cloud** (o passo do `DEPLOY.md`), que é o
  teto do estrago se alguém varrer CEPs. Passada a cota, o Google recusa, e a regra cai em
  `a-combinar`, sem quebrar nada.
- **Onde ela mora nunca sai.** A origem fica em `configuracao/geral`, que só a conta lê. A rota
  pública devolve a taxa, o `fora` e o endereço do CEP da própria cliente; **nunca a distância**
  (com três CEPs e as distâncias, dá para achar a casa dela). O teste das chaves da resposta
  confere.

### Sessão A · A configuração

- **Painel "Seu cardápio"**, seção **"Entrega"**, abaixo dos produtos:
  - "De onde sai a entrega": o CEP, com "Não aparece para ninguém. Serve só para medir a
    distância." Salvar chama `POST /api/entrega/origem` (token da dona, molde de
    `api/conta/membros`), que mede pelo Google e grava `origem`. Sem rede, o botão desabilitado e
    "Precisa de internet para medir.". CEP que o Google não acha: "Não achamos esse CEP. Confira
    os números.";
  - "Até onde você entrega" (km);
  - as faixas, uma por linha, "Até [3] km · R$ [5,00]", com "Adicionar faixa" (até 5) e o
    remover; a última faixa acompanha o raio;
  - "Bairros com outro preço": nome e preço, ou "Não entrego";
  - **"Testar um CEP"**: o campo e o resultado ao vivo, com a distância (só para ela) e a regra
    que decidiu ("Espinheiro · 4,2 km · faixa até 6 km · R$ 8,00"). É assim que ela calibra.
- Grava por `salvarCardapio` (a regra mora ao lado do cardápio, mas em `entrega`, no mesmo
  documento), com `esquemaEntrega` recusando faixa fora de ordem, taxa negativa e raio menor que
  a primeira faixa.
- Testes de `domain/entrega.ts`: haversine contra pontos conhecidos (1° de latitude = 111,19
  km), a ordem bairro → distância → a combinar, o raio, a faixa na fronteira (`km == ateKm`
  entra), o bairro com acento diferente, `null` é fora.

### Sessão B · A cliente

- **No cardápio**, com "Entrega": o campo **"CEP"** primeiro (`inputMode="numeric"`, 8 dígitos).
  Completo, a página chama a rota pública e:
  - preenche "Endereço" com rua, bairro e cidade, e pede **"Número e complemento"**;
  - mostra **"Entrega: R$ 8,00"** e o total passa a ser **"Total com a entrega"**;
  - `fora`: "A {quem} não entrega nesse endereço. Você pode retirar." com "Mudar para retirar"; o
    "Enviar" fica desligado enquanto for entrega fora da área;
  - `a-combinar` ou CEP que não existe: a frase de hoje ("A taxa de entrega a {quem} combina com
    você.") e o endereço digitado à mão. Nada trava.
  - Sem regra configurada, o formulário é o de hoje, sem o campo de CEP.
- **O handler refaz a taxa** (`#d160`: preço do servidor, nunca do navegador): o corpo de
  `ENTREGA` ganha `cep?`; com regra e CEP, `taxaDeEntrega` de novo (o cache torna a resposta a
  mesma da página); `fora` → falha nova `fora-da-area` (400, "A {quem} não entrega nesse
  endereço. Escolha retirar ou fale pelo WhatsApp."); `taxa` → `entrega.taxa` gravada e somada
  pelo `derivarPedido({ taxaEntrega })`; `a-combinar` → zero, como hoje. O endereço gravado é
  "Rua …, número, complemento · Bairro · CEP …", sem campo novo em `Pedido`.
- **A mensagem de aviso** diz "Total R$ 120,00 com a entrega" quando a taxa veio calculada.
- **A dona continua mandando na taxa:** ela edita ao confirmar, como sempre.

---

## 2 · Antes de tocar em código

1. **Pedir as cinco aprovações.** Sem a (1), a spec não começa.
2. Criar a chave restrita no Google Cloud, pôr a cota diária e anotar os passos no `DEPLOY.md`.
3. Ler `pedidoDoCardapio`, `derivarPedido` (`taxaEntrega`), `mensagemDeAviso` e o bloco "Como você
   recebe?" de `PedidoPeloCardapio`.
4. Medir três CEPs reais de Recife (o da Maynara e dois de clientes) pelas duas APIs e conferir
   o bairro do ViaCEP contra o que ela chama o bairro.

---

## 3 · Escopo

- **A:** `types/configuracao.ts`, `domain/entrega.ts` com teste, `lib/server/endereco.ts`,
  `src/app/api/entrega/origem/route.ts`, `SeuCardapio.tsx`, `mutations/configuracao.ts`,
  `DEPLOY.md`. Linha em `novidades.ts`: "A taxa de entrega pela distância".
- **B:** `src/app/api/cardapio/entrega/route.ts`, `domain/cardapio.ts` (esquema, falha,
  `pedidoDoCardapio`, `mensagemDeAviso`, com testes), o handler, `PedidoPeloCardapio.tsx`.
- `firebaseAdmin.ts`, no cabeçalho: a rota da entrega lê só a configuração.

---

## 4 · Roteiro de navegador

1. **A.** Pôr o CEP dela, raio 8 km, faixas 3/R$ 5 e 6/R$ 8 e 8/R$ 12, e Candeias "Não
   entrego". "Testar um CEP" com três CEPs: as três respostas batem com o que ela cobraria.
2. **B, 360 px.** "Entrega", CEP de um cliente a 4 km: a rua aparece, "Entrega: R$ 8,00", o
   total sobe R$ 8,00. Enviar: no app, o orçamento com taxa R$ 8,00 e o endereço completo.
3. CEP de Candeias: "não entrega nesse endereço", e "Mudar para retirar" funciona.
4. `fetch` com um CEP fora da área e `ENTREGA`: `fora-da-area`. Com uma taxa no corpo: ignorada.
5. Chave do Google errada (só em teste): tudo vira "a combinar", e o pedido passa.
6. Rede: a resposta da rota pública não tem distância nem coordenada.

---

## Critérios de aceite

- [ ] As aprovações registradas antes do código; cota diária configurada.
- [ ] `taxaDeEntrega` pura e testada, com o bairro antes da distância e o "a combinar" quando
      falta dado.
- [ ] A origem nunca sai; a rota pública nunca devolve distância.
- [ ] A cliente vê a taxa e o total com ela antes de mandar; o handler refaz e grava.
- [ ] Falha do serviço nunca impede pedido.
- [ ] `lint`, `typecheck`, `test` e `build` passam em cada sessão; `#d321` e `#d322` escritos;
      `/privacidade` com o parágrafo antes do deploy da B; `ESTADO.md` atualizado.

---

## Fora de escopo

- **Distância de rota** (`#d321`, `ponytail:`).
- **A taxa sugerida no editor de pedido do app**, pelo endereço da cliente cadastrada. É o
  próximo passo natural e usa o mesmo `taxaDeEntrega`; spec própria quando ela pedir.
- **Pedido mínimo para entrega e frete grátis acima de um valor.** Viram campo da regra quando
  ela cobrar assim.
- **Mapa** (desenhar o raio, escolher o ponto). Exige biblioteca de mapa e chave de outra API; o
  "Testar um CEP" responde a mesma pergunta.
- **Repassar a taxa ao entregador** (`#d84`): continua como é.
