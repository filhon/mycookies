/**
 * Cria o login quando ele não existe e vincula a uma conta, criando a conta se
 * ela ainda não existir.
 *
 *   npm run conceder-acesso -- maynara@exemplo.com mycookies
 *   npm run conceder-acesso -- maynara@exemplo.com mycookies "MyCookie's" Maynara
 *
 * O login nasce sem senha: o convite é "abra o app, toque em 'Esqueci minha
 * senha'" — o link que chega cria a senha, e ninguém além dela a conhece
 * (`DECISOES.md#d119`).
 *
 * O vínculo mora numa custom claim com a forma `{ contas: { [contaId]: papel } }`.
 * As regras do Firestore leem essa claim direto do token, o que custa ZERO
 * leitura na avaliação — um allowlist em documento seria cobrado a cada acesso.
 *
 * O caminho `contas/{contaId}` está repetido aqui de propósito: este script roda
 * fora do app, com o Admin SDK, e não importa `src/lib/types`. Se o formato
 * mudar lá, muda aqui também.
 */
import { Timestamp } from "firebase-admin/firestore";
import { auth, db, semCredencial } from "./admin.mjs";

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

/** "maynara@exemplo.com" → "Maynara". Só um palpite: os args mandam mais. */
function nomeProvavel(endereco) {
  const local = endereco
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  return local.charAt(0).toUpperCase() + local.slice(1);
}

try {
  // O login nasce aqui, sem senha: ela cria a dela pelo link de "Esqueci minha
  // senha" no app, e ninguém precisa conhecê-la (`DECISOES.md#d119`).
  let usuario;
  try {
    usuario = await auth.getUserByEmail(email);
  } catch (erro) {
    if (erro.code !== "auth/user-not-found") throw erro;
    usuario = await auth.createUser({ email });
    console.log(`Login criado para ${email}, sem senha.`);
    console.log(
      'Mande ela abrir a tela de login e tocar em "Esqueci minha senha" com esse e-mail:\n' +
        "o link que chega cria a senha.",
    );
  }

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

  // Vínculos com outras contas são preservados — conceder um acesso não
  // revoga outro. A 028 escreve `acessoAte` ao lado de `contas`; liberar
  // acesso não pode apagá-lo, por isso as claims que não são `contas`
  // atravessam intactas (`DECISOES.md#d144`). O script não escreve
  // `acessoAte` nunca: quem ele libera não tem prazo.
  const anteriores = usuario.customClaims?.contas ?? {};
  await auth.setCustomUserClaims(usuario.uid, {
    ...usuario.customClaims,
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

  if (semCredencial) {
    console.error(
      "\nNenhuma credencial encontrada. Preencha GOOGLE_APPLICATION_CREDENTIALS\n" +
        "no .env.local, ou rode `gcloud auth application-default login`.",
    );
  }

  process.exit(1);
}
