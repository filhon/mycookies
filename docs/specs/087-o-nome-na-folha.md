# Spec 087 · O nome na folha

**Tipo:** "A sua marca" ganha o nome do negócio (que hoje não se muda em lugar nenhum), mostra o
pé da folha do orçamento enquanto ela edita, e deixa assinar com o dedo. **Nenhum campo, nenhuma
regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica da Configuração sobre os prints de 2026-10-03.
**Depende de:** a 083.
**Aprovações pedidas:** nenhuma.
**Decisões a registrar:** `#d288`, `#d289`.

---

## Problema

1. **O nome do negócio não se muda.** "MyCookie's" está na barra lateral, na folha e no
   cardápio, e mora em `contas/{id}.nome` (espelhado em `configuracao.nomeNegocio`, D14), mas
   nenhuma tela tem o campo. Quem errou no cadastro ou trocou de nome escreve para o suporte.
2. **Ela edita a folha sem ver a folha.** Telefone, Instagram, frase, assinatura e "feito com
   Rende" vão para o rodapé de um documento que a cliente recebe, e a tela mostra só campos.
   Ferramenta de orçamento e nota que cobra assinatura mostra a prévia ao lado.
3. **A assinatura pede um PNG.** "Uma imagem PNG com fundo transparente fica melhor." No celular,
   na bancada, ela não tem PNG; tem o dedo.
4. **Dois detalhes do campo:**
   - o exemplo do telefone é `81 98696-6176`, um número de verdade, que toda conta nova vai ver;
   - "Tirar", ao lado de "Escolher imagem", lê como "tirar foto".

---

## 1 · O que esta spec decide

### O nome do negócio: `#d288`

- Primeiro campo de "A sua marca": "Nome do negócio", como a cliente vê. Grava com o "Salvar" da
  tela: `contas/{id}.nome` (a dona escreve o documento da conta pelas regras de hoje) e o espelho
  `nomeNegocio`, que `paraDados` já leva. Vazio não salva (erro no campo).
- A barra lateral, que lê `conta.nome`, muda sozinha.

### O pé da folha, ao vivo: `#d289`

- Abaixo dos campos, "Assim fica o pé da folha": o mesmo componente do rodapé que a folha do
  orçamento usa, com o estado da tela (não o gravado), sobre `--surface` com borda, na largura
  da coluna. Sem pedido de exemplo, sem rota nova.
- **Assinar com o dedo**: ao lado de "Escolher imagem", "Assinar aqui" abre uma área de desenho
  (`<canvas>` e eventos de ponteiro, fundo transparente, traço `--ink`), com "Limpar" e "Usar
  esta". O PNG passa pela mesma redução e pelo mesmo teto de `CampoImagem`
  (`ASSINATURA_LADO_PX`, `ASSINATURA_MAX_BYTES`).
- "Tirar" vira "Tirar a assinatura".
- O exemplo do telefone vira `(11) 90000-0000`.

---

## 2 · Antes de tocar em código

1. Achar o componente do rodapé da folha e ver se ele aceita os dados por propriedade.
2. Conferir onde o nome é gravado no cadastro (`/api/conta`) e se há outro espelho além de
   `nomeNegocio` (cardápio público, e-mail).

---

## 3 · Escopo

- `TelaConfiguracao.tsx`: o campo do nome e a prévia.
- `mutations/conta.ts`: a escrita do nome, `v: VERSAO_SCHEMA`.
- `CampoImagem.tsx` ou componente irmão em `ui/`: "Assinar aqui".

---

## 4 · Roteiro de navegador

1. Mudar o nome, salvar: a barra lateral e a folha de um pedido mostram o nome novo.
2. Digitar a frase: o pé da folha muda a cada tecla.
3. Celular: assinar com o dedo, "Usar esta", salvar, abrir a folha impressa: a assinatura sobre
   a linha.
4. Conta nova: o exemplo do telefone não é número de ninguém.

---

## Critérios de aceite

- [ ] Nome do negócio editável, gravado na conta e no espelho.
- [ ] O pé da folha ao vivo, pelo mesmo componente da folha.
- [ ] Assinar com o dedo, nos mesmos limites da imagem.
- [ ] Portão: `lint`, `typecheck`, `test`, `build`.
- [ ] `#d288` e `#d289` escritos; `ESTADO.md` atualizado.

---

## 5 · Fora de escopo

- **Logo na folha.** O logo é da vitrine do cardápio (`configuracao/vitrine`); levar para a folha
  é decidir se a folha é dela ou do cardápio.
- **CNPJ, endereço, condições de pagamento na folha.** Campos novos; esperar ela pedir.
- **Cor da marca na folha.** A folha é papel (`#d127`).
