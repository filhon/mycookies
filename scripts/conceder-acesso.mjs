/**
 * Vincula um login a uma conta e cria a conta se ela ainda não existir.
 *
 *   npm run conceder-acesso -- maynara@exemplo.com mycookies
 *   npm run conceder-acesso -- maynara@exemplo.com mycookies "MyCookie's" Maynara
 *
 * O vínculo mora numa custom claim com a forma `{ contas: { [contaId]: papel } }`.
 * As regras do Firestore leem essa claim direto do token, o que custa ZERO
 * leitura na avaliação — um allowlist em documento seria cobrado a cada acesso.
 *
 * O caminho `contas/{contaId}` está repetido aqui de propósito: este script roda
 * fora do app, com o Admin SDK, e não importa `src/lib/types`. Se o formato
 * mudar lá, muda aqui também.
 *
 * Credencial: GOOGLE_APPLICATION_CREDENTIALS apontando para a chave de conta de
 * serviço, lida do `.env.local`. Vale também a credencial padrão do ambiente,
 * se você já rodou `gcloud auth application-default login` — nesse caso não há
 * chave privada no disco, que é o arranjo mais seguro dos dois.
 */
import { existsSync } from "node:fs";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// O Next carrega `.env.local` sozinho; `node` não. Sem isto, a variável que o
// arquivo define não existiria aqui.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sem arquivo, resta a credencial padrão do ambiente. A checagem é adiante.
}

/** Único papel emitido hoje. Ver `ContasDaClaim` em src/lib/types/conta.ts. */
const PAPEL = "DONA";

const USO =
  "Uso: npm run conceder-acesso -- <email> <contaId> [nome] [proprietaria]";

const [email, contaId, nomeArg, proprietariaArg] = process.argv.slice(2);

if (!email || !contaId) {
  console.error(USO);
  process.exit(1);
}

// Id de conta vira segmento de caminho no Firestore e chave dentro da claim.
if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(contaId)) {
  console.error(
    `Id de conta inválido: "${contaId}".\n` +
      "Use minúsculas, números e hífen — ex.: mycookies.",
  );
  process.exit(1);
}

// Erra cedo e com o caminho na mão: sem isto, uma chave ausente vira um ENOENT
// do Admin SDK no meio da execução, que não diz o que fazer.
const chave = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (chave && !existsSync(chave)) {
  console.error(
    `GOOGLE_APPLICATION_CREDENTIALS aponta para "${chave}", que não existe.\n` +
      "Console do Firebase → Configurações do projeto → Contas de serviço →\n" +
      "Gerar nova chave privada, e salve nesse caminho.",
  );
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

/** "maynara@exemplo.com" → "Maynara". Só um palpite: os args mandam mais. */
function nomeProvavel(endereco) {
  const local = endereco
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  return local.charAt(0).toUpperCase() + local.slice(1);
}

try {
  const auth = getAuth();
  const db = getFirestore();

  const usuario = await auth.getUserByEmail(email);
  const referencia = db.doc(`contas/${contaId}`);
  const conta = await referencia.get();

  if (!conta.exists) {
    await referencia.set({
      nome: nomeArg ?? contaId,
      proprietaria:
        proprietariaArg ?? usuario.displayName ?? nomeProvavel(email),
      criadaEm: Timestamp.now(),
      v: 1,
    });
    console.log(`Conta ${contaId} criada.`);
  } else {
    const ajustes = {
      ...(nomeArg ? { nome: nomeArg } : {}),
      ...(proprietariaArg ? { proprietaria: proprietariaArg } : {}),
    };
    if (Object.keys(ajustes).length > 0) {
      await referencia.set(ajustes, { merge: true });
    }
    console.log(`Conta ${contaId} já existia.`);
  }

  // O token passa a carregar só `contas`: a claim `admin` do modelo anterior
  // não significa mais nada e some aqui. Vínculos com outras contas são
  // preservados — conceder um acesso não revoga outro.
  const anteriores = usuario.customClaims?.contas ?? {};
  await auth.setCustomUserClaims(usuario.uid, {
    contas: { ...anteriores, [contaId]: PAPEL },
  });

  const atual = await referencia.get();
  console.log(`Acesso concedido a ${email} como ${PAPEL}.`);
  console.log(`UID: ${usuario.uid}`);
  console.log(
    `Negócio: ${atual.get("nome")} · Proprietária: ${atual.get("proprietaria")}`,
  );
  console.log(
    'No app, o botão "Já liberaram meu acesso" renova o token sem sair e entrar.',
  );
} catch (erro) {
  console.error("Não foi possível conceder o acesso:", erro.message);

  // Os dois tropeços previsíveis, cada um com o passo que resolve.
  if (erro.code === "auth/user-not-found") {
    console.error(
      `\nNão existe login com ${email} neste projeto.\n` +
        "Console do Firebase → Authentication → Users → Adicionar usuário.\n" +
        "O script vincula um login que já existe; ele não cria a pessoa.",
    );
  } else if (!chave) {
    console.error(
      "\nNenhuma credencial encontrada. Preencha GOOGLE_APPLICATION_CREDENTIALS\n" +
        "no .env.local, ou rode `gcloud auth application-default login`.",
    );
  }

  process.exit(1);
}
