# Spec 096 · O que mudou

**Tipo:** `/comecar` ganha "O que mudou", as novidades dos últimos 90 dias, e "Como funciona"
diz, sem número e sem bolinha, quando há uma que ela não viu. **Nenhum campo, nenhuma regra,
nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de "Como funciona" sobre os prints de celular e desktop de 2026-10-08.
**Depende de:** 093 (índice e ordem). Funciona sem ela.
**Aprovações pedidas:** a linha nova no protocolo de sessão do `CLAUDE.md` (seção 1, "Daqui
para a frente").
**Decisões a registrar:** `#d298`.

---

## Problema

Entre 2026-09-20 e hoje saíram, entre outras, o Pix com o valor, o sinal, o relatório do MEI,
a nota com várias fotos, a nota pelo "Compartilhar" do Android, as despesas fixas item a item e
a assinatura com o dedo. **Nenhuma delas foi dita a ela.** Ela descobre uma coisa nova quando
tropeça nela, ou nunca.

Assinatura se paga mês a mês, e quem paga precisa ver que o produto continua andando. Todo
serviço por assinatura tem "o que há de novo". Aqui cada spec termina com o `ESTADO.md`
atualizado para quem constrói, e nada para quem usa.

---

## 1 · O que esta spec decide: `#d298`

### O conteúdo

- `components/comecar/novidades.ts` (cópia, não domínio, `#d70`): lista de
  `{ dataISO, titulo, frase, href, soAndroid? }`, a mais nova primeiro.
- Título no que ela ganha, não no nome do recurso: "O Pix vai com o valor", e não "BR Code".
  Frase de uma linha, na voz do `PRODUCT.md`, sem número de exemplo.
- Semente: as entregas visíveis a ela desde a 078, com a data do commit de cada uma (passo 2).
  Candidatas: o pedido de sempre (078), o dia que cabe (079), o Pix com o valor (080), o sinal
  (081), o que muda nos produtos (082), as contas que ela não faz (085), as despesas que ela
  esquece (086), o nome e a assinatura na folha (087), a nota em várias fotos (091), a nota
  pelo "Compartilhar" (092, `soAndroid`), o relatório do MEI (074).

### A seção

- "O que mudou", **logo abaixo do cabeçalho no encerrado** (é o que muda entre uma visita e
  outra) e depois dos cinco no aberto. Âncora "Novidades" no índice da 093.
- Só os itens dos últimos 90 dias, no máximo seis. Nenhum: a seção e a âncora somem.
- Lista com divisórias: a data em `micro` `--ink-muted` ("2 out"), o título em `body` 600, a
  frase em `label`, e a linha inteira leva ao `href`. `soAndroid` aparece só no Android, pelo
  mesmo `useAndroid` de `OQueMaisTem`.

### O aviso de novidade

- O aparelho guarda a data da mais nova que ela já viu (`localStorage`, chave
  `rende:novidades-vistas`, leitura e escrita em `try/catch`; falhou, nada aparece).
- Abrir `/comecar` grava a data da mais nova.
- Com uma mais nova que a gravada: a palavra **"Novidade"** em `micro` 600 à direita de "Como
  funciona" na barra lateral (`--on-brand-muted`) e na linha de "Como funciona" da
  Configuração (`--ink-muted`). Sem contagem, sem bolinha, sem cor de atenção: o `PRODUCT.md`
  recusa notificação disputando atenção.
- Aparelho que nunca gravou nada não vê o aviso por itens de mais de 14 dias: a conta nova não
  abre com "Novidade" sobre o que já existia quando ela chegou.

### Daqui para a frente

- O protocolo de sessão do `CLAUDE.md` ganha, no passo 4: "Se a spec muda algo que ela vê,
  acrescente uma linha em `components/comecar/novidades.ts`."

---

## 2 · Antes de tocar em código

1. Tirar do `git log` a data de cada item da semente.
2. Conferir que a linha "Como funciona" da Configuração e o item da barra lateral aceitam um
   rótulo à direita sem quebrar.

---

## 3 · Escopo

- `components/comecar/novidades.ts` e `components/comecar/Novidades.tsx` (novos).
- Um gancho pequeno para "há novidade" em `lib/hooks/`.
- `BarraLateral.tsx`, `TelaConfiguracao.tsx` (a linha), `TelaComecar.tsx`.
- `CLAUDE.md`: a linha do protocolo, aprovada.

---

## 4 · Roteiro de navegador

1. Aparelho limpo, conta antiga: "O que mudou" com os itens dos 90 dias; nenhum "Novidade" na
   barra por item velho.
2. Acrescentar um item de hoje: "Novidade" aparece na barra e na Configuração; abrir
   `/comecar` faz sumir nos dois.
3. Janela anônima com o armazenamento bloqueado: a página abre, sem aviso, sem erro.
4. Android: o item da nota compartilhada aparece; no iPhone, não.

---

## Critérios de aceite

- [x] Seção com até seis itens dos últimos 90 dias, e sem seção quando não há.
- [x] "Novidade" na barra e na Configuração, e só até ela abrir a página.
- [x] A linha no protocolo do `CLAUDE.md`.
- [x] Portão: `lint`, `typecheck`, `test`, `build`.
- [x] `#d298` escrito; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Aviso na tela Hoje, e-mail ou notificação.** A palavra no menu é o teto até alguém medir
  que ela não basta.
- **Guardar "visto" na conta.** Por aparelho é o certo aqui pelo mesmo motivo do `#d71`: ela
  vê no celular e não viu no computador.
