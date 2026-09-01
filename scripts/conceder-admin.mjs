/**
 * Concede a claim `admin` à conta da administradora.
 *
 * As regras do Firestore exigem `request.auth.token.admin == true`. Uma claim
 * custa zero leitura na avaliação da regra, ao contrário de um documento de
 * allowlist, que seria cobrado a cada acesso.
 *
 *   npm run conceder-admin -- maynara@exemplo.com
 *
 * Requer GOOGLE_APPLICATION_CREDENTIALS apontando para a chave de conta de
 * serviço do projeto.
 */
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];

if (!email) {
  console.error("Uso: npm run conceder-admin -- <email>");
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho da chave de conta de serviço.",
  );
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

const auth = getAuth();

try {
  const usuario = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(usuario.uid, { admin: true });

  console.log(`Permissão concedida a ${email}`);
  console.log(`UID: ${usuario.uid}`);
  console.log("Saia e entre novamente no app para o token ser renovado.");
} catch (erro) {
  console.error("Não foi possível conceder a permissão:", erro.message);
  process.exit(1);
}
