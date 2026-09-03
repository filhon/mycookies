import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type Credential,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * O Admin SDK do lado do servidor, e o único lugar que confere um token.
 *
 * Nada aqui entra no pacote do cliente: só `src/app/api/` importa este arquivo,
 * e uma rota não é importada por componente nenhum.
 *
 * Verificar a assinatura do JWT à mão, para não mexer no `package.json`, está
 * descartado. O projeto desenha gráfico à mão para não pegar dependência
 * (`DECISOES.md#d25`) e tirou o `date-fns` porque `Intl` bastava (`#d26`);
 * criptografia é outra classe de risco, e um erro ali não aparece como um pixel
 * torto — aparece como um estranho gastando a cota.
 */

/** O mesmo projeto do cliente: é dele que o token precisa ter vindo. */
const PROJETO = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

interface ContaDeServico {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

/**
 * A credencial do servidor, que na hospedagem não pode ser um arquivo.
 *
 * `applicationDefault()` lê `GOOGLE_APPLICATION_CREDENTIALS` como **caminho**
 * de arquivo no disco. Isso vale no computador de quem desenvolve e no script
 * de conceder acesso, e não vale numa função serverless: lá não existe disco
 * onde pôr a chave, e o repositório — de propósito — não a versiona.
 *
 * Por isso a hospedagem passa o conteúdo, e não o caminho:
 * `FIREBASE_SERVICE_ACCOUNT` carrega o JSON inteiro da chave, ou o mesmo JSON
 * em base64, que é o que sobrevive a um campo de formulário que come quebra de
 * linha. Sem essa variável, o comportamento é exatamente o de antes.
 *
 * Devolve `null` quando **não há credencial configurada**, que é diferente de
 * credencial recusada: sem a distinção, um servidor recém-publicado responde
 * 401 a todo mundo e a tela acusa o login dela (`DECISOES.md#d72`).
 */
function resolverCredencial(): Credential | null {
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (!bruto) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
    // Resta a credencial ambiente do `gcloud auth application-default login`,
    // que existe no computador e nunca na hospedagem. Em produção a ausência
    // das duas variáveis é falta de configuração, e não algo a tentar.
    return process.env.NODE_ENV === "production" ? null : applicationDefault();
  }

  try {
    const conta = JSON.parse(
      bruto.startsWith("{")
        ? bruto
        : Buffer.from(bruto, "base64").toString("utf8"),
    ) as ContaDeServico;

    const { project_id, client_email, private_key } = conta;
    if (!project_id || !client_email || !private_key) return null;

    return cert({
      projectId: project_id,
      clientEmail: client_email,
      // A quebra de linha da chave privada costuma chegar escapada. O
      // `JSON.parse` acima desfaz um nível; este desfaz o nível a mais que
      // aparece quando o JSON é escapado antes de ser colado.
      privateKey: private_key.replace(/\\n/g, "\n"),
    });
  } catch {
    // JSON quebrado no meio da colagem, ou base64 que não decodifica.
    return null;
  }
}

let credencialCache: Credential | null | undefined;

function credencial(): Credential | null {
  if (credencialCache === undefined) credencialCache = resolverCredencial();
  return credencialCache;
}

/**
 * O servidor tem como conferir assinatura?
 *
 * A rota pergunta isto **antes** de conferir o token, porque conferir token é
 * justamente o que precisa da credencial. A chave do Gemini continua sendo
 * lida só depois da porta: quem não entrou não descobre se ela está lá.
 */
export function credencialDisponivel(): boolean {
  return credencial() !== null;
}

function aplicativo(): App {
  const existente = getApps()[0];
  if (existente) return existente;

  const credenciada = credencial();
  if (!credenciada) throw new Error("Servidor sem credencial do Admin SDK.");

  return initializeApp({
    credential: credenciada,
    ...(PROJETO ? { projectId: PROJETO } : {}),
  });
}

export interface Autenticado {
  uid: string;
  /** O mapa `{ contaId: papel }` da claim. Vazio quando o login não abre nada. */
  contas: Record<string, unknown>;
}

/** `Authorization: Bearer <ID token>` → quem é, ou `null`. */
export async function conferirToken(
  cabecalho: string | null,
): Promise<Autenticado | null> {
  const token = cabecalho?.startsWith("Bearer ")
    ? cabecalho.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decodificado = await getAuth(aplicativo()).verifyIdToken(token);
    const contas = decodificado.contas;

    return {
      uid: decodificado.uid,
      contas:
        typeof contas === "object" && contas !== null
          ? (contas as Record<string, unknown>)
          : {},
    };
  } catch {
    // Token expirado, adulterado ou de outro projeto. Todos são o mesmo 401.
    return null;
  }
}

/**
 * A mesma regra de `firestore.rules`, escrita uma segunda vez porque esta é uma
 * segunda porta para a mesma conta: basta a chave estar no mapa, e o papel não
 * é conferido — hoje só existe `'DONA'`, e regra escrita para papel que não
 * existe é regra que ninguém testou (`DECISOES.md#d14`).
 */
export function abreAConta(quem: Autenticado, contaId: string): boolean {
  if (!contaId) return false;
  return quem.contas[contaId] != null;
}
