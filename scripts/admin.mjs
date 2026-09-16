/**
 * Preâmbulo comum aos scripts de administração: credencial, `auth` e `db`.
 * Rodam com o Admin SDK, fora do bundle do cliente — `conceder-acesso.mjs` e
 * `metricas.mjs` importam daqui em vez de repetir as mesmas vinte linhas.
 *
 * Credencial: GOOGLE_APPLICATION_CREDENTIALS apontando para a chave de conta de
 * serviço, lida do `.env.local`. Vale também a credencial padrão do ambiente,
 * se você já rodou `gcloud auth application-default login` — nesse caso não há
 * chave privada no disco, que é o arranjo mais seguro dos dois.
 */
import { existsSync } from "node:fs";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// O Next carrega `.env.local` sozinho; `node` não. Sem isto, a variável que o
// arquivo define não existiria aqui.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sem arquivo, resta a credencial padrão do ambiente. A checagem é adiante.
}

const chave = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Erra cedo e com o caminho na mão: sem isto, uma chave ausente vira um ENOENT
// do Admin SDK no meio da execução, que não diz o que fazer.
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

export const auth = getAuth();
export const db = getFirestore();

/** Verdadeiro quando a falha do catch pode ser falta de credencial. */
export const semCredencial = !chave;
