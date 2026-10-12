# Spec 148 · A marca e o combinado de sempre

**Tipo:** a folha ganha o logo dela (o da vitrine do cardápio) e um texto de condições que ela
escreve uma vez em "A sua marca" e sai em toda folha: validade do produto, alergênicos, prazo de
cancelamento. **Um campo opcional novo** (`ConfiguracaoGeral.condicoes`). Nenhuma regra, nenhum
índice, nenhuma dependência.
**Tamanho:** uma sessão.
**Origem:** crítica da folha do orçamento de 2026-10-12, comparando com ferramentas de proposta
pagas (Qwilr, PandaDoc, HoneyBook, Square Estimates, Jobber).
**Depende de:** 147, 087.
**Aprovações pedidas:** (1) **schema aditivo**: `ConfiguracaoGeral.condicoes?: string`, até 600
caracteres; (2) **reverter o "Fora de escopo" da 087** em "Logo na folha"; (3) o texto novo.
**Decisões a registrar:** `#d356`.

---

## Problema

1. **O topo da folha é um nome em negrito.** "MyCookie's" em Archivo, sem mais nada, é o topo de
   um documento de Word. Toda ferramenta de proposta paga abre com o logo de quem vende: é o que faz
   o papel parecer de um negócio, e não de uma pessoa. O logo dela já existe: está na vitrine do
   cardápio (`configuracao/vitrine.logo`), quadrado, `data:` URL, no cache.
2. **O que ela repete toda vez não tem lugar.** "Contém glúten, leite e ovos", "consumir em até
   5 dias", "cancelamento até 48 h antes", "a data só fica garantida com o sinal". Para empresa e
   evento, isso é o que o setor de compras pergunta; hoje vai na mensagem, separado da folha, ou
   não vai. Proposta paga tem "termos" salvos que entram sozinhos.

## 1 · O que esta spec decide: `#d356`

- **O logo da vitrine é o logo da folha.** A 087 deixou fora perguntando "a folha é dela ou do
  cardápio?". As duas são dela (`#d127`); o logo também. Sai no topo à esquerda, 18 mm de altura,
  recortado em círculo como na vitrine, com o nome ao lado. Sem logo, a folha fica como hoje. **Sem
  cor de marca dela na folha**: o papel continua papel (`#d127`, 087), e cor de cliente na folha
  pede um campo de cor que ninguém pediu.
- **`condicoes`** mora em `configuracao/geral` ao lado de `frase`, texto livre de até 600
  caracteres, linhas preservadas. Entra na folha como bloco "Condições", depois do Combinado e antes
  das assinaturas, em 9 pt `--ink-muted`. Vazio, o bloco não existe. **Não entra no
  acompanhamento** nesta spec: a lista fechada do `#d320` só abre na 149.

## 2 · Escopo

- `types/configuracao.ts`, `esquemaConfiguracao`, `salvarConfiguracao`: o campo, por spread
  condicional, `v: VERSAO_SCHEMA`.
- `TelaConfiguracao.tsx`, parte "A sua marca": `textarea` "Condições de sempre", depois da frase,
  com a dica "Sai em toda folha. Alergênicos, validade, cancelamento: o que você repete para toda
  cliente." e o contador acima de 500. A prévia "Assim fica o pé da folha" (087) mostra o bloco.
- `domain/orcamento.ts`: `negocioDaFolha` lê `condicoes` e o logo (a configuração da vitrine entra
  como segundo argumento opcional; a prévia da Configuração já tem os dois).
- `TelaOrcamento.tsx`: lê `configuracao/vitrine` junto (já está no cache de quem tem cardápio).
- `FolhaOrcamento.tsx`: o logo e o bloco.
- Testes: `negocioDaFolha` com e sem logo, com e sem condições, condições com espaços só.

## 3 · Roteiro de navegador

1. Com o logo na vitrine: a folha abre com ele; sem logo, igual a hoje.
2. Escrever três linhas de condições, salvar: a prévia e a folha mostram as três linhas.
3. Ctrl+P: uma página com três itens, logo e condições; o rodapé continua no pé.
4. Tema escuro: o logo sobre o papel claro, sem halo.

## Critérios de aceite

- [ ] Logo da vitrine no topo da folha, degradando sem ele.
- [ ] `condicoes` escrito pela Configuração e lido pela folha e pela prévia.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d356`; `ESTADO.md` e `novidades.ts`.

## Fora de escopo

- **Cor da marca dela na folha.** `#d127`.
- **Condições por pedido.** As observações do pedido continuam fora da folha (`#d79`); condição
  que muda por pedido vai na conversa.
- **Alergênicos por produto, estruturados.** Se o setor de compras pedir por item, vira campo da
  ficha, e é outra spec.
