# Deploy no Vercel

O que a hospedagem precisa saber, o que precisa ser feito uma vez no console do Firebase, e o
que o deploy **não** faz.

Escrito em 2026-09-03, na sessão que preparou o projeto para publicar. O que mudou no código
por causa disto está em `DECISOES.md#d72` e `#d73`.

---

## Antes de tudo: o que o Vercel não toca

Regras e índices do Firestore continuam sendo publicados pelo Firebase CLI, da máquina:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

O Vercel publica o app. O banco é o mesmo projeto `mycookies-mrc` de sempre, e ele já está de
pé com tudo publicado — ver `ESTADO.md`. Um deploy do app não move regra nem índice, e um
índice que falte aparece como tela que não carrega, e não como erro de build.

---

## 1 · O projeto no Vercel

Nada a configurar: o Next.js é detectado sozinho e `npm run build` já fixa `--webpack`, que é
o que o `@serwist/next` precisa para emitir o service worker (`next.config.ts`).

| Ajuste          | Valor                             |
| --------------- | --------------------------------- |
| Framework       | Next.js (detectado)               |
| Build Command   | o padrão — cai em `npm run build` |
| Install Command | o padrão                          |
| Node.js Version | 22.x ou 24.x                      |
| Function Region | `gru1` (São Paulo)                |

**Node.** O `engines` do `package.json` diz `>=20`, que é um piso e não um pino: quem escolhe
a versão é o painel. Se o build reclamar da faixa, o conserto é uma linha —
`"node": "24.x"` em `engines`, que é a versão em uso no desenvolvimento.

**Região.** Só `/api/nota` roda no servidor; todo o resto é estático e sai do CDN, perto de
quem abre. Mas essa rota é a que carrega a foto de uma nota fiscal a partir de um celular no
Brasil, e ela é a única do sistema em que a espera é sentida. No plano gratuito dá para
escolher **uma** região: `gru1`.

---

## 2 · Variáveis de ambiente

No painel: **Settings → Environment Variables**. Marque Production e Preview nas seis
primeiras; as duas últimas, Production e Preview também, se você quiser a leitura de nota
funcionando nos previews.

### As seis do Firebase — públicas, e assadas no build

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Os mesmos valores do `.env.local`. Elas identificam o projeto e não autorizam nada — quem
protege os dados são as regras em `firestore.rules`.

**`NEXT_PUBLIC_` entra no pacote durante o build, e não é lida em tempo de execução.** Trocar
o valor no painel não muda o que já foi publicado: é preciso **redeploy**. Faltando qualquer
uma delas, o app compila e quebra ao abrir, com a frase de `client.ts` ("Configuração do
Firebase incompleta. Faltam: …").

### As duas do servidor — privadas, lidas a cada chamada

```
FIREBASE_SERVICE_ACCOUNT
GEMINI_API_KEY
GEMINI_MODELO          (opcional; vazio usa gemini-3.5-flash-lite)
```

Nenhuma delas leva `NEXT_PUBLIC_`, e é isso que as mantém fora do navegador. Só
`src/lib/server/` e `src/app/api/` as leem, e uma rota não é importada por componente nenhum.

**`GOOGLE_APPLICATION_CREDENTIALS` não vale aqui.** Ela é um **caminho de arquivo**, e no
Vercel não existe disco onde pôr a chave. No lugar dela vai `FIREBASE_SERVICE_ACCOUNT`, com o
**conteúdo** do mesmo JSON. Cole o arquivo inteiro no campo do painel; se a colagem perder as
quebras de linha, mande o mesmo JSON em base64, que a rota aceita os dois:

```bash
node -e "console.log(Buffer.from(require('fs').readFileSync('./chave-servico.json')).toString('base64'))"
```

> Esta chave **ignora as regras do Firestore**: quem a tem, tem o banco inteiro. Ela não é
> versionada (`.gitignore`) e não sobe no deploy (`.vercelignore`). Se vazar, o conserto é
> revogar a chave no console do Google Cloud e emitir outra — trocar a variável não basta.

Sem `FIREBASE_SERVICE_ACCOUNT`, o app inteiro funciona e **só** a leitura de nota não: a tela
diz "A leitura de nota ainda não está configurada neste servidor", que é a frase certa. Foi
para isso que a rota passou a distinguir os dois erros (`DECISOES.md#d72`) — antes ela dizia
que o login dela não abria a conta.

---

## 3 · No console do Firebase, uma vez

**Authentication → Settings → Authorized domains.** Adicione o domínio publicado
(`<projeto>.vercel.app` e o domínio próprio, se houver).

Entrar com e-mail e senha **não** depende disso — funciona de qualquer origem. O que depende é
o link de recuperação de senha quando ele um dia levar uma URL de continuação, e qualquer
login por provedor externo. É um clique agora contra um mistério depois.

---

## 4 · Depois do primeiro deploy

Nesta ordem, porque cada passo só faz sentido se o anterior passou:

1. **Abrir a URL e entrar** com o login da conta `mycookies`. Se a tela Hoje carregar com a
   saudação pelo nome, o Firestore respondeu e a claim `contas` chegou no token.
2. **Instalar na tela de início** pelo celular, e conferir que o ícone é o desenho e não uma
   miniatura da página (é o que a 5A rasterizou).
3. **Desligar a internet e abrir de novo.** Offline é o estado normal deste sistema; se o
   service worker não tiver sido emitido no build, é aqui que aparece.
4. **Ler uma nota de verdade**, que é o único caminho que passa pelo servidor. Falhou com "não
   está configurada neste servidor" → falta `FIREBASE_SERVICE_ACCOUNT` ou `GEMINI_API_KEY`.
5. **Um número digitado indo e voltando** — um lançamento em `/financeiro`, recarregar, ver
   se voltou igual.

O passo 5 é a dívida mais antiga do projeto, e é a spec `005-prontidao.md`, sessão 5B.
Publicar não a paga: nenhum número deste sistema jamais saiu de um teclado, passou pelo
Firestore e voltou, e agora isso vale também para o servidor publicado.

---

## Limites conhecidos

**O arquivo da nota tem dois tetos, e o menor não é o nosso.** `LIMITE_ARQUIVO_BYTES` é 8 MB
em `notaFiscal.ts`, e é um teto de custo. O Vercel corta o corpo da requisição em **4,5 MB**,
e o corpo é JSON com base64 — que carrega 4 bytes a cada 3. Na prática o teto real do arquivo
é ~3,3 MB.

Foto não chega perto disso: `imagem.ts` reduz para 1600 px / JPEG 80% antes de subir, o que
dá algumas centenas de KB. **PDF sobe como está**, e é o caso que pode bater no teto. Quando
bate, o Vercel devolve 413 sem corpo, e a tela já lida com isso — `codigoDaFalha` cai no
status e mostra "Esse arquivo é grande demais, mesmo depois de reduzido. Fotografe a nota mais
de perto, em partes." A frase está certa; o que ela não diz é que o corte veio da hospedagem.

Se um PDF de nota grande passar a ser rotina, o conserto é baixar `LIMITE_ARQUIVO_BYTES` para
3 MB — aí a recusa é nossa, acontece antes do upload inteiro e não gasta o dado dela.

**A leitura tem 60 segundos.** `maxDuration = 60` na rota, que é o teto do plano gratuito. O
tempo limite interno da chamada ao Gemini é de 30 s (`TEMPO_LIMITE_LEITURA_MS`), então a folga
é do dobro.

**O cache de CNPJ é por instância.** `CACHE` em `route.ts` é um `Map` em memória, e cada
instância fria começa vazia. Isso continua valendo — o efeito é uma consulta a mais à API
pública, que já degrada em silêncio quando não responde (`DECISOES.md#d52`).
