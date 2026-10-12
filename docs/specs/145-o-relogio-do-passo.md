# Spec 145 · O relógio do passo (proposta)

**Tipo:** proposta para decisão, **não para implementar como está**. O tempo escrito num passo
("asse por 12 minutos") vira um cronômetro de um toque, que toca na própria bancada. Reabre o
"Fora de escopo" da 138 ("Temporizador. O do forno e o do celular existem.").
**Tamanho:** uma sessão, se aprovada.
**Origem:** a crítica dos prints da bancada de 2026-10-12, item 10.
**Depende de:** 144 (o passo da vez).
**Aprovações pedidas:** **reabrir a decisão da 138**. Nada começa sem ela e sem a resposta da
Maynara abaixo.
**Decisões a registrar:** `#d351`, se aprovada.

---

## Problema

A 138 deixou o temporizador de fora porque o forno e o celular têm. Os dois têm custo na bancada:

- **O do celular** é sair do Rende com a mão suja, abrir o relógio, digitar 12, voltar. A tela
  acesa da bancada (`#d343`) fica para trás, e na volta ela procura o passo.
- **O do forno** mede uma assadeira. Com duas, uma entrando 6 minutos depois da outra, ela conta de
  cabeça.

Paprika, Mela, Crouton e o NYT Cooking transformam o tempo do passo em toque. É o recurso de modo
cozinha mais citado nas avaliações desses apps, e o único da lista deles que o Rende não tem.

---

## 1 · A proposta

- `temposNoPasso(passo)` em `domain/preparo.ts`, pura, com teste: "12 minutos", "12 min", "1 hora",
  "1h30", "30 segundos". **Faixa** ("10 a 12 minutos") vale o **menor**: é a hora de olhar o forno,
  não de tirar.
- No passo, à direita, um botão de 44 px com `Timer` e "12 min". Irmão do botão que marca o passo,
  nunca dentro dele.
- Tocar põe o cronômetro numa faixa acima do "Fiz a massa", no `RodapeFixo`: "Assar · 11:42", com
  "Parar". Mais de um ao mesmo tempo, um por linha, até três. O nome é o começo do passo, cortado.
- No zero: `navigator.vibrate`, um bipe curto feito com `AudioContext` (sem arquivo de som), e a
  linha vira "Pronto: Assar" com `BellRing` e tom de atenção. Toca até ela tocar na linha.
- O fim é guardado como horário (`Date.now() + duração`) nas marcas da aba: sair e voltar mantém o
  relógio certo.

## 2 · O que pede decisão

1. **Reabrir a 138.** O argumento é o da seção Problema; o custo é uma sessão, e nenhuma
   dependência.
2. **O limite honesto.** O navegador não toca com o app fechado ou a tela bloqueada sem
   notificação push, e push pede servidor e permissão. A proposta é a versão sem push: toca com a
   bancada aberta, que é como ela fica (a tela não apaga). A tela diz isso uma vez, embaixo do
   primeiro cronômetro: "Toca com a bancada aberta."
3. **Som.** O bipe precisa do primeiro toque dela para o navegador liberar o áudio; o toque no
   cronômetro serve.

---

## Pergunta para a Maynara antes de tudo

"Quando o cookie está no forno, você marca o tempo onde? Quantas assadeiras entram juntas?"
Se a resposta for "no forno, uma por vez", esta fica arquivada.

---

## Fora de escopo, em qualquer caso

- Notificação push e cronômetro com o app fechado.
- Cronômetro sem passo (o relógio solto do celular existe).
- Controle por voz.
