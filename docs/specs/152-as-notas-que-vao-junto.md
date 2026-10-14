# Spec 152 · As notas que vão junto

**Tipo:** a folha do relatório ganha uma segunda página, "Notas de compra de setembro", com as
compras do mês que o Caixa já tem, e a tela diz quantas têm nota lida e quantas ela precisa achar
na gaveta. **Nenhum campo, nenhuma regra, nenhum índice, nenhuma dependência.**
**Tamanho:** uma sessão.
**Origem:** crítica de 2026-10-12. O próprio papel do portal termina em "ENCONTRAM-SE ANEXADOS A
ESTE RELATÓRIO: os documentos fiscais comprobatórios das entradas de mercadorias…". Serviço pago
guarda os documentos do mês junto do relatório. O Rende **lê as notas de compra** (006, 088 a 092)
e não as liga ao relatório: é o único lugar em que ele sabe mais que um app de MEI e não usa.
**Depende de:** 074; 151 (a página de anexo entra no "Guardei" como contagem, não como campo).
**Aprovações pedidas:** o texto.
**Decisões a registrar:** `#d361`.

---

## Problema

O anexo é a parte do relatório que ela mais deixa de fazer: as notas de compra de um mês inteiro
estão em três sacolas, na carteira e no e-mail. Na hora de uma fiscalização ou de um contador, o
que se pede é a lista e os papéis.

---

## O que esta spec decide: `#d361`

### Quais compras

- Saídas do mês (`consultaTransacoesDoMes`, já lida pela tela) de `COMPRA_INSUMO`, `EMBALAGEM` e
  `EQUIPAMENTO`: as "entradas de mercadorias" do modelo. Despesa fixa, imposto, entrega e
  pró-labore ficam fora.
- `notasDoMes(lancamentos)` em `domain/mei.ts`, pura: por linha, `dataISO`, `descricao`, `valor`,
  `cnpj?` (os 14 primeiros dígitos de `notaChave`, quando houver) e `comNota: boolean`; ordem por
  data; total e as duas contagens.

### Na tela

Abaixo da origem do número (151), uma linha:

```
Notas de compra: 14 compras, 11 com nota lida no Rende.
3 sem nota: Atacadão (2/set), Feira (9/set), Mercado Bom Preço (21/set). Guarde o cupom.
```

- Com todas lidas: `CheckCheck` em `--positive` e "14 compras, todas com nota lida."
- Sem compra no mês: a linha não aparece.
- As sem nota são um aviso, não um erro: `--ink`, sem ocre (compra de feira não tem nota, e está
  certo).

### No papel

- `break-before: page`; a segunda página tem o mesmo cabeçalho reduzido (CNPJ e período, da 150)
  e o título "NOTAS DE COMPRA DE SETEMBRO DE 2026 (ANEXO)".
- Tabela: Data · Onde · CNPJ · Valor, números tabulares à direita, a mesma tipografia da folha.
  Sem CNPJ: "sem nota lida" em itálico no lugar.
- Rodapé: total das compras e "Lista das saídas lançadas no Rende. Os documentos seguem anexos."
- Uma escolha na tela, acima do botão de imprimir, **marcada por padrão**: "Imprimir a lista de
  notas junto". É estado da tela e não persiste: quem desmarca é exceção, e uma opção a menos
  para guardar.
- Na prévia da tela, a segunda página aparece abaixo da primeira, com o mesmo `zoom`.

---

## Testes

- `notasDoMes`: categorias que entram e que não; CNPJ extraído da chave; arquivado não chega; ordem
  por data; contagens.

## Roteiro de navegador

1. Mês com três notas lidas e uma compra digitada à mão: "4 compras, 3 com nota lida" e o nome da
   que falta.
2. Imprimir: duas páginas A4, a segunda com a tabela.
3. Desmarcar "Imprimir a lista de notas junto": uma página.
4. Mês sem compra: nenhuma linha, nenhuma segunda página.

## Critérios de aceite

- [x] Lista derivada das saídas do mês, sem consulta nova.
- [x] Segunda página com quebra correta no Chrome e no Safari do iPhone.
- [x] Portão; `#d361`; `ESTADO.md`; uma linha em `novidades.ts`.

## Fora de escopo

- **Guardar a foto ou o XML da nota.** O Rende lê e descarta a imagem (`#d52`); guardar arquivo é
  Storage, custo e outra conversa.
- **Notas de venda emitidas.** Ela emite no portal; o Rende não as vê (a 150 já deixa a nota por
  pedido como candidata).
- **Baixar as notas pela chave na Sefaz.** Exige certificado.
