import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function garantirConfig() {
  const faltando = Object.entries(config)
    .filter(([, valor]) => !valor)
    .map(([chave]) => chave);

  if (faltando.length > 0) {
    throw new Error(
      `Configuração do Firebase incompleta. Faltam: ${faltando.join(", ")}. ` +
        "Copie .env.local.example para .env.local e preencha com os dados do projeto.",
    );
  }
}

let appCache: FirebaseApp | undefined;
let dbCache: Firestore | undefined;
let authCache: Auth | undefined;

export function obterApp(): FirebaseApp {
  if (appCache) return appCache;
  garantirConfig();
  appCache = getApps().length
    ? getApp()
    : initializeApp(config as Required<typeof config>);
  return appCache;
}

/**
 * Firestore com cache persistente e suporte a múltiplas abas.
 *
 * `enableIndexedDbPersistence()` está descontinuada desde o SDK v10; o
 * equivalente atual é declarar `localCache` na inicialização. O gerenciador de
 * múltiplas abas evita o erro "failed-precondition" quando a Maynara deixa o
 * app aberto no celular e no notebook ao mesmo tempo.
 */
export function obterDb(): Firestore {
  if (dbCache) return dbCache;
  dbCache = initializeFirestore(obterApp(), {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    ignoreUndefinedProperties: true,
  });
  return dbCache;
}

export function obterAuth(): Auth {
  if (authCache) return authCache;
  authCache = getAuth(obterApp());
  return authCache;
}
